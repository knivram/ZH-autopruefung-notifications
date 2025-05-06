// Load environment variables from .env file
export interface Config {
  credentials: {
    holderNumber: string;
    birthdate: string;
  };
  checkIntervalMinutes: number;
  locations: string[];
  url: string;
  telegram: {
    botToken: string;
    chatId: string;
  };
}

// Get environment variables first
const holderNumber = process.env.HOLDER_NUMBER;
const birthdate = process.env.BIRTHDATE;
const checkIntervalMinutesStr = process.env.CHECK_INTERVAL_MINUTES;
const locationsStr = process.env.LOCATIONS;
const telegramBotToken = process.env.TELEGRAM_BOT_TOKEN;
const telegramChatId = process.env.TELEGRAM_CHAT_ID;

// Check required variables
if (!holderNumber) {
    throw new Error('HOLDER_NUMBER is not set in .env file');
}

if (!birthdate) {
    throw new Error('BIRTHDATE is not set in .env file');
}

if (!locationsStr) {
    throw new Error('LOCATIONS is not set in .env file');
}

// Parse and validate
const checkIntervalMinutes = checkIntervalMinutesStr 
    ? parseInt(checkIntervalMinutesStr, 10) 
    : (() => { throw new Error('CHECK_INTERVAL_MINUTES is not set in .env file'); })();

const locations = locationsStr
    .split(',')
    .map(location => location.trim())
    .filter(Boolean);

if (locations.length === 0) {
    throw new Error('LOCATIONS is empty after parsing');
}

    if (!telegramBotToken) {
        throw new Error('TELEGRAM_BOT_TOKEN is not set in .env file but TELEGRAM_ENABLED is true');
    }
    if (!telegramChatId) {
        throw new Error('TELEGRAM_CHAT_ID is not set in .env file but TELEGRAM_ENABLED is true');
    }

// Load configuration from validated environment variables
const config: Config = {
    credentials: {
        holderNumber: holderNumber,
        birthdate: birthdate,
    },
    checkIntervalMinutes: checkIntervalMinutes,
    locations: locations,
    url: 'https://portal.stva.zh.ch/ecari-dispoweb/ui/app/init/#/conduite/prive/rendez-vous',
    telegram: {
        botToken: telegramBotToken,
        chatId: telegramChatId,
    },
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
