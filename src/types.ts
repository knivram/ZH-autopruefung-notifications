export interface AppointmentResults {
  location: Location;
  availableSlots: string[];
}

export interface Location {
  name: string;
  telegram_topic_id: number;
}

export interface Config {
  credentials: {
    holderNumber: string;
    birthdate: string;
  };
  checkIntervalMinutes: number;
  locations: Location[];
  url: string;
  telegram: {
    botToken: string;
    chatId: string;
  };
}
