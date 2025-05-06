import notifier from 'node-notifier';
import { AppointmentResults } from './types';

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

  notifier.notify({
    title: `${totalAvailable} appointment slots found!`,
    message: availableSlots.join('\n'),
    sound: true,
    wait: true,
  });

  console.log('=================================');
  console.log(`${totalAvailable} appointment slots found!`);
  availableSlots.forEach(slot => {
    console.log(slot);
  });
  console.log('=================================');
}
