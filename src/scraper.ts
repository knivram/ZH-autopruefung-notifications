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
  
  async checkForAppointments(location: string): Promise<AppointmentResults[]> {
    if (!this.page) throw new Error('Browser not initialized');
    
    console.log(`Checking for appointments at ${location}...`);
    
    try {
      // Select the location from the dropdown
      await this.page.selectOption('select#lieu', { label: location });
      
      // Need to wait for the calendar to update - this may take a moment
      await this.page.waitForTimeout(2000);
      await this.page.waitForLoadState('networkidle');
      
      const results: AppointmentResults[] = [];

      // Check first 6 weeks
      for (let week = 0; week < 6; week++) {
        // For the first iteration, we're already on the first week
        if (week > 0) {
          // Check if the next button is disabled
          const nextButtonDisabled = await this.page.locator('button:has-text(">")').isDisabled();
          if (nextButtonDisabled) {
            console.log('Next button is disabled, no more weeks to check');
            break;
          }
          
          // Click next week button
          await this.page.locator('button:has-text(">")').click();
          await this.page.waitForTimeout(1000);
        }
        
        // Get the date headers for each day (Monday to Friday)
        // First get the day names (Montag, Dienstag, etc.)
        const dayNames = await this.page.locator('h2').allTextContents();
        // Then get the dates 
        const dateHeaders = await this.page.locator('h3').allTextContents();
        
        console.log(`Week ${week+1}: ${dateHeaders.join(', ')}`);
        
        // For each day in the week
        for (let day = 0; day < Math.min(dayNames.length, dateHeaders.length); day++) {
          const dayName = dayNames[day];
          const date = dateHeaders[day];
          
          if (!date) continue; // Skip if no date found
          
          // Look for the "Keine Termine frei" text
          const noAppointmentText = await this.page.locator(`h3:has-text("${date}")`)
            .locator('xpath=./following-sibling::p[contains(text(), "Keine Termine frei")]')
            .isVisible()
            .catch(() => false);
            
          if (!noAppointmentText) {
            // Get all buttons under this date that represent time slots
            const timeSlotsElements = await this.page.locator(`h3:has-text("${date}")`)
              .locator('xpath=./following::button[not(@disabled)]')
              .all();
              
            const timeSlots = await Promise.all(
              timeSlotsElements.map(element => element.textContent())
            );
            
            const validTimeSlots = timeSlots.filter(Boolean) as string[];
            
            if (validTimeSlots.length > 0) {
              console.log(`Found ${validTimeSlots.length} slots for ${dayName} ${date}: ${validTimeSlots.join(', ')}`);
              results.push({
                location,
                date: `${dayName} ${date}`,
                availableSlots: validTimeSlots,
                availableTimesCount: validTimeSlots.length,
              });
            }
          } else {
            console.log(`No appointments available for ${dayName} ${date}`);
          }
        }
      }
      
      return results;
    } catch (error) {
      console.error(`Error checking appointments at ${location}:`, error);
      return [];
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
      const results = await this.checkForAppointments(location);
      allResults.push(...results);
    }
    
    return allResults;
  }
}
