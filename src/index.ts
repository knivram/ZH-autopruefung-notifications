import { DrivingTestScraper } from './scraper';
import { sendNotification } from './notifications';
import config from './config';

async function runCheck() {
  const scraper = new DrivingTestScraper();
  try {
    console.log('Starting appointment check...');
    await scraper.initialize();
    
    const isLoggedIn = await scraper.login();
    if (!isLoggedIn) {
      throw new Error('Failed to login');
    }
    
    const results = await scraper.checkAllLocations();
    console.log('Appointment check completed.');
    console.log('Results:', results);
    
    if (results.length > 0) {
      sendNotification(results);
    } else {
      console.log('No available appointments found');
    }
    
  } catch (error) {
    console.error('Error running check:', error);
  } finally {
    await scraper.close();
  }
}

// Run immediately on startup
runCheck();

// Then run on the specified interval
const intervalMs = config.checkIntervalMinutes * 60 * 1000;
setInterval(runCheck, intervalMs);

console.log(`ZH Autoprüfung Poller started. Checking every ${config.checkIntervalMinutes} minutes.`);

// Handle shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down...');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Shutting down...');
  process.exit(0);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled rejection:', reason);
});
