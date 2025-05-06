export interface AppointmentSlot {
  time: string;
  date: string;
  locationName: string;
}

export interface AppointmentResults {
  location: string;
  date: string;
  availableSlots: string[];
  availableTimesCount: number;
}
