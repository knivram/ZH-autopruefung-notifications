import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env file
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

export interface Config {
  credentials: {
    holderNumber: string;
    birthdate: string;
  };
  checkIntervalMinutes: number;
  locations: string[];
  url: string;
}

const config: Config = {
  credentials: {
    holderNumber: process.env.HOLDER_NUMBER || '',
    birthdate: process.env.BIRTHDATE || '',
  },
  checkIntervalMinutes: parseInt(process.env.CHECK_INTERVAL_MINUTES || '30', 10),
  locations: (process.env.LOCATIONS || '')
    .split(',')
    .map(location => location.trim())
    .filter(Boolean),
  url: 'https://portal.stva.zh.ch/ecari-dispoweb/ui/app/init/#/conduite/prive/rendez-vous',
};

// Validate config
if (!config.credentials.holderNumber) {
  throw new Error('HOLDER_NUMBER is not set in .env file');
}

if (!config.credentials.birthdate) {
  throw new Error('BIRTHDATE is not set in .env file');
}

if (!config.locations.length) {
  throw new Error('LOCATIONS is not set properly in .env file');
}

export default config;
