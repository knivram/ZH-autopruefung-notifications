import { Telegraf } from 'telegraf';
import { AppointmentResults } from './types';
import config from './config';

const bot = new Telegraf(config.telegram.botToken);

export async function sendNotification(results: AppointmentResults[]) {
  if (results.length === 0) {
    return;
  }

  for (const locationResult of results) {
    const title = `*${locationResult.availableSlots.length} Prüfungstermine gefunden!*`;
    const body = formateAvailableSlots(locationResult.availableSlots);

    try {
      await bot.telegram.sendMessage(
        config.telegram.chatId,
        `${title}\n${body}`,
        {
          parse_mode: 'Markdown',
          message_thread_id: locationResult.location.telegram_topic_id,
        },
      );
      console.log('Telegram notification sent successfully');
    } catch (err) {
      console.error('Error sending Telegram notification:', err);
    }

    // Add a delay to avoid hitting Telegram's rate limit
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
}

function formateAvailableSlots(availableSlots: string[]): string {
  return availableSlots.map((slot) => `- ${slot}`).join('\n');
}
