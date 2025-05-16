import dotenv from 'dotenv';
import { cleanEnv, str } from 'envalid';

// Load .env file
dotenv.config();

// Validate and type environment variables
export const config = cleanEnv(process.env, {
  SLACK_SIGNING_SECRET: str(),
  SLACK_BOT_TOKEN: str(),
  NODE_ENV: str({ choices: ['development', 'test', 'production'] }),
  FIRESTORE_EMULATOR_HOST: str({ default: undefined }),
  DEFAULT_FUNCTIONS_LOCATION: str(),
});

// Export typed configuration object
export default config;
