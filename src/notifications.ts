import { Telegraf } from 'telegraf';
import { AppointmentResults } from './types';
import config from './config';

// Initialize Telegram bot (only if enabled)
let bot = new Telegraf(config.telegram.botToken);

export function sendNotification(results: AppointmentResults[]): void {
  const totalAvailable = results.reduce(
    (sum, result) => sum + result.availableSlots.length,
    0
  );

  if (totalAvailable === 0) {
    bot.telegram.sendMessage(
      config.telegram.chatId, 
      'No available appointments found.', 
      { disable_notification: true }
    ).then(() => console.log('Telegram notification sent successfully'));
    return;
  }

  // Send Telegram notification if enabled
  const message = `*${totalAvailable} Prüfungstermine gefunden!*\n\n${formateAvailableSlots(results)}`;

  bot.telegram.sendMessage(config.telegram.chatId, message, { parse_mode: 'Markdown' })
    .then(() => console.log('Telegram notification sent successfully'))
    .catch(err => console.error('Error sending Telegram notification:', err));
}

function formateAvailableSlots(results: AppointmentResults[]): string {
  return results
    .map(result => {
      const slots = result.availableSlots.map(slot => `- ${slot}`).join('\n');
      return `*${result.location}*:\n${slots}`;
    })
    .join('\n\n');
}
