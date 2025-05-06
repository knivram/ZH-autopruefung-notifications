import { Telegraf } from 'telegraf';
import { AppointmentResults } from './types';
import config from './config';

// Initialize Telegram bot (only if enabled)
let bot = new Telegraf(config.telegram.botToken);

export function sendNotification(results: AppointmentResults[]): void {
  if (!results.length) return;

  // Format all available slots for all locations
  const availableSlots = results
    .filter(result => result.availableSlots.length > 0)
    .map(result => {
      return `${result.location}: ${result.availableSlots.join(', ')}`;
    });

  if (!availableSlots.length) return;

  const totalAvailable = results.reduce(
    (sum, result) => sum + result.availableSlots.length,
    0
  );

  // Send Telegram notification if enabled
  const message = `*${totalAvailable} Prüfungstermine gefunden!*\n\n${formateAvailableSlots(results)}`;

  bot.telegram.sendMessage(config.telegram.chatId, message, { parse_mode: 'Markdown' })
    .then(() => console.log('Telegram notification sent successfully'))
    .catch(err => console.error('Error sending Telegram notification:', err));

  console.log('=================================');
  console.log(`${totalAvailable} appointment slots found!`);
  availableSlots.forEach(slot => {
    console.log(slot);
  });
  console.log('=================================');
}

function formateAvailableSlots(results: AppointmentResults[]): string {
  return results
    .map(result => {
      const slots = result.availableSlots.map(slot => `- ${slot}`).join('\n');
      return `*${result.location}*:\n${slots}`;
    })
    .join('\n\n');
}
