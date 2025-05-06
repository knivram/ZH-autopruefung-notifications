FROM node:22-alpine AS builder

# Install build dependencies
RUN apk add --no-cache python3 make g++ 

# Set the working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy the rest of the application
COPY . .

# Build the application
RUN npm run build

# Create production image
FROM node:22

# Set the working directory
WORKDIR /app

# Install Playwright dependencies
RUN apt update && apt install -y chromium fonts-freefont-ttf libfreetype6 fontconfig dumb-init

# Set environment variables for Playwright
ENV PLAYWRIGHT_BROWSERS_PATH=/app/browsers
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
ENV CHROMIUM_PATH=/usr/bin/chromium-browser

# Copy built app and required files from builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./

# Install production dependencies only
RUN npm ci --production && \
    # Install only the minimal Playwright requirements for Chromium
    npx playwright install-deps chromium && \
    # Create a non-root user to run the application
    groupadd -r appuser && useradd -r -g appuser appuser && \
    # Set permissions
    chown -R appuser:appuser /app

# Switch to non-root user
USER appuser

# Set entrypoint with dumb-init to handle signals properly
ENTRYPOINT ["/usr/bin/dumb-init", "--"]

# Command to run the application
CMD ["node", "dist/index.js"]
