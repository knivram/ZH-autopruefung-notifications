# ZH Autoprüfung Poller

This application monitors the Zurich driving test portal for available appointment slots and sends notifications via Telegram when slots become available.

## Features

- Automatically polls the Zurich driving test appointment portal
- Checks multiple testing locations
- Sends notifications via Telegram when slots become available
- Can run in headless or visible mode for debugging
- Available as a Docker container

## Configuration

Create a `.env` file with the following variables:

```env
# ZH Autoprüfung Credentials
HOLDER_NUMBER=your_holder_number
BIRTHDATE=DD.MM.YYYY

# Configuration
CHECK_INTERVAL_MINUTES=30
# Available locations: Albisgütli,Hinwil,Regensdorf,Bassersdorf,Winterthur,Bülach
LOCATIONS=Albisgütli:topic_id,Hinwil:topic_id,Regensdorf:topic_id,Bassersdorf:topic_id,Winterthur:topic_id,Bülach:topic_id

# Telegram Configuration
TELEGRAM_BOT_TOKEN=your_bot_token_here
TELEGRAM_CHAT_ID=your_chat_id_here
```

### Setting up Telegram notifications

1. **Create a Telegram Bot**:
   - Open Telegram and search for "BotFather"
   - Start a chat with BotFather
   - Send the command `/newbot`
   - Follow the instructions to create your bot
   - You'll receive a token - copy it to `TELEGRAM_BOT_TOKEN` in your `.env` file

2. **Get your Chat ID**:
   - Start a chat with your new bot
   - Send any message to the bot
   - Visit `https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates`
   - Find the "id" field in the "chat" object in the JSON response
   - Copy this ID to `TELEGRAM_CHAT_ID` in your `.env` file

## Running locally

### Prerequisites

- Node.js v18+
- npm

### Installation

```bash
# Install dependencies
npm install

# Build the TypeScript code
npm run build

# Run the application
npm start

# Run with visible browser (for debugging)
npm run start:visible
```

## Docker

### Using pre-built image from GitHub Container Registry

```bash
# Pull the image
docker pull ghcr.io/knivram/ZH-autopruefung-notifications:latest

# Run with your local .env file
docker run -d --env-file .env ghcr.io/yourusername/zh-autopruefung-poller:latest
```

### Building locally

```bash
# Build the Docker image
docker build -t your_image_tag .

# Run the container
docker run -d --env-file .env your_image_tag
```
