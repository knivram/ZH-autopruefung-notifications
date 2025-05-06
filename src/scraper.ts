import { chromium, Browser, Page, Locator } from 'playwright';
import { AppointmentResults } from './types';
import config from './config';

export class DrivingTestScraper {
  private browser: Browser | null = null;
  private page: Page | null = null;

  async initialize(headless: boolean = true): Promise<void> {
    console.log('Initializing browser...');
    this.browser = await chromium.launch({
      headless: headless,
      slowMo: headless ? 0 : 100, // Add small delays when in non-headless mode to make it easier to follow
    });
    this.page = await this.browser.newPage();
    console.log('Browser initialized');
  }

  async close(): Promise<void> {
    if (this.page) {
      await this.page.close();
      this.page = null;
    }
    
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
    console.log('Browser closed');
  }

  async login(): Promise<boolean> {
    if (!this.page) throw new Error('Browser not initialized');

    console.log(`Navigating to ${config.url}`);
    await this.page.goto(config.url);
    
    // Wait for the page to stabilize - sometimes it redirects to login
    await this.page.waitForLoadState('networkidle');
    
    // Check if we're already logged in by looking for logout button
    const isAlreadyLoggedIn = await this.page.locator('img[title="Logout"]').isVisible().catch(() => false);
    
    if (isAlreadyLoggedIn) {
      console.log('Already logged in');
      return true;
    }

    console.log('Logging in...');
    
    // Wait for login form and fill it
    try {
      // The login form may have different selectors - try multiple options
      // First wait for heading Login to appear
      await this.page.waitForSelector('h2:has-text("Login")', { timeout: 10000 });
      
      // Now locate input fields
      const holderNumberInput = this.page.locator('input#candidateId');
      const birthdateInput = this.page.locator('input[placeholder="12.09.1985"]');
      
      await holderNumberInput.fill(config.credentials.holderNumber);
      await birthdateInput.fill(config.credentials.birthdate);
      
      // Wait for login button to be enabled
      await this.page.waitForSelector('button:has-text("Login"):not([disabled])');
      
      // Click login button
      await this.page.locator('button:has-text("Login")').click();
      
      // Wait for successful login
      await this.page.waitForSelector('img[title="Logout"]', { timeout: 15000 });
      console.log('Login successful');
      return true;
    } catch (error) {
      console.error('Login failed:', error);
      return false;
    }
  }

  async navigateToAppointmentSelection(): Promise<boolean> {
    if (!this.page) throw new Error('Browser not initialized');
    
    console.log('Navigating to appointment selection...');
    
    try {
      // Wait for the page to load completely
      await this.page.waitForLoadState('networkidle');
      
      // Check if we're already on the appointment selection page
      const isOnSelectionPage = await this.page.locator('h2:has-text("Neuer Termin")').isVisible().catch(() => false);
      
      if (isOnSelectionPage) {
        console.log('Already on appointment selection page');
        return true;
      }

    // Wait for 4 seconds before proceeding
    console.log('Waiting for 4 seconds...');
    await this.page.waitForTimeout(4000);
      
      // Find and click the "Auswählen" button - try multiple approaches
      const auswahlenVisible = await this.page.getByText('Auswählen', { exact: true }).isVisible().catch(() => false);
      
      if (auswahlenVisible) {
        await this.page.getByText('Auswählen', { exact: true }).click();
      } else {
        // Try finding it in a table cell
        const auswahlenCell = await this.page.locator('td:has-text("Auswählen")').first();
        if (await auswahlenCell.isVisible())
          await auswahlenCell.click();
        else
          throw new Error('Could not find Auswählen button');
      }
      
      // Wait for the selection page to load
      await this.page.waitForSelector('h2:has-text("Neuer Termin")', { timeout: 10000 });
      console.log('Navigated to appointment selection page');
      return true;
      
    } catch (error) {
      console.error('Failed to navigate to appointment selection:', error);
      return false;
    }
  }
  
  async checkForAppointments(location: string): Promise<AppointmentResults> {
    if (!this.page) throw new Error('Browser not initialized');
    
    console.log(`Checking for appointments at ${location}...`);
    
    // Initialize the result with the current location
    const result: AppointmentResults = {
      location,
      availableSlots: []
    };
    
    try {
      // Select the location from the dropdown
      await this.page.selectOption('select#lieu', { label: location });
      
      // Need to wait for the calendar to update
      await this.page.waitForTimeout(2000);
      await this.page.waitForLoadState('networkidle');

      // Check first 6 weeks
      for (let week = 0; week < 6; week++) {
        // For the first iteration, we're already on the first week
        if (week > 0) {
          // Check if the next button is disabled
          const nextButton = this.page.locator('button:has-text(">")');
          const nextButtonDisabled = await nextButton.isDisabled().catch(() => true);
          if (nextButtonDisabled) {
            console.log('Next button is disabled, no more weeks to check');
            break;
          }
          
          // Click next week button
          await nextButton.click();
          await this.page.waitForTimeout(2000);
          await this.page.waitForLoadState('networkidle');
        }
        
        // First take a screenshot to debug
        // if (week === 0) {
        //   console.log('Taking a screenshot of the calendar view for debugging');
        //   await this.page.screenshot({ path: `calendar-${location.replace(/\s/g, '-')}.png` });
        // }
        
        // Gather all date information
        console.log('Getting day names...');
        const dayNames = await this.page.locator('#jour h2').allTextContents();
        console.log('Getting date headers...');
        const dateHeaders = await this.page.locator('#jour h3').allTextContents();
        
        console.log(`Week ${week+1}: Found ${dayNames.length} day names and ${dateHeaders.length} dates`);
        console.log(`Days: ${dayNames.join(', ')}`);
        console.log(`Dates: ${dateHeaders.join(', ')}`);
        
        // For each day in the week
        for (let day = 0; day < Math.min(dayNames.length, dateHeaders.length); day++) {
          const dayName = dayNames[day]?.trim();
          const date = dateHeaders[day]?.trim();
          
          if (!date || !dayName) {
            console.log(`Skipping day ${day} due to missing name or date`);
            continue;
          }
          
          console.log(`Checking ${dayName} ${date}...`);
          
          // Look for appointment slots (buttons) for this date
          // Check if there are any "Keine Termine frei" (No appointments available) text
          let noAppointmentText = false;
          const dayNumber = day + 1; // 1-based index for CSS selector
          try {
            // Alternative: check by day number (which should be unique in the week)
            noAppointmentText = await this.page.locator(`#jour:nth-child(${dayNumber}) p:has-text("Keine Termine frei")`).isVisible().catch(() => false);
          } catch (e) {
            console.log(`Could not determine if appointments are available for ${dayName} ${date}`);
          }
          
          // If no "Keine Termine frei" text is found, check for available time slots
          if (!noAppointmentText) {
            // Get all available time slots directly without worrying about duplicates
            const timeSlots = await this.page
              .locator(`#jour:nth-child(${dayNumber}) .hour button:not([disabled])`)
              .evaluateAll(buttons => 
                // Using evaluate to get text directly from DOM in a single operation
                // This also handles deduplication on the browser side
                [...new Set(buttons.map(btn => btn.textContent?.trim()).filter(Boolean))]
              );
            
            console.log(`Found ${timeSlots.length} unique time slots`);
            
            // All slots are already unique and filtered
            const validTimeSlots = timeSlots as string[];
            
            if (validTimeSlots.length > 0) {
              console.log(`Found ${validTimeSlots.length} slots for ${dayName} ${date}: ${validTimeSlots.join(', ')}`);
              
              // Add each time slot with its date
              validTimeSlots.forEach(time => {
                result.availableSlots.push(`${dayName} ${date} ${time}`);
              });
            }
          }
        }
      }
      
      return result;
    } catch (error) {
      console.error(`Error checking appointments at ${location}:`, error);
      return { location, availableSlots: [] };
    }
  }
  
  async checkAllLocations(): Promise<AppointmentResults[]> {
    if (!this.page) throw new Error('Browser not initialized');
    
    const allResults: AppointmentResults[] = [];
    
    // First navigate to the appointment selection page (if not already there)
    const onAppointmentPage = await this.page.getByText('Neuer Termin').isVisible().catch(() => false);
    
    if (!onAppointmentPage) {
        console.log('Not on appointment selection page, navigating...');
      const success = await this.navigateToAppointmentSelection();
      if (!success) {
        console.error('Could not navigate to appointment selection');
        return [];
      }
    }
    
    // Check each location
    for (const location of config.locations) {
      const result = await this.checkForAppointments(location);
      if (result.availableSlots.length > 0) {
        allResults.push(result);
      }
    }
    
    return allResults;
  }
}
