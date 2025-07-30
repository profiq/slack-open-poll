/**
 * Test setup file that runs before all tests
 * This ensures environment variables are set before any imports that might use them
 */

// Set environment variables before any imports
process.env.NODE_ENV = 'test';
process.env.SLACK_SIGNING_SECRET = 'test-signing-secret';
process.env.SLACK_BOT_TOKEN = 'xoxb-test-token';
process.env.DEFAULT_FUNCTIONS_LOCATION = 'us-central1';
process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';

// Mock console methods to reduce noise during testing
const originalConsole = { ...console };

beforeEach(() => {
  // Optionally suppress console output during tests
  if (process.env.SUPPRESS_TEST_LOGS === 'true') {
    console.log = vi.fn();
    console.warn = vi.fn();
    console.error = vi.fn();
    console.info = vi.fn();
    console.debug = vi.fn();
  }
});

afterEach(() => {
  // Restore console methods
  if (process.env.SUPPRESS_TEST_LOGS === 'true') {
    Object.assign(console, originalConsole);
  }
});

// Import vitest globals after setting up environment
import { beforeEach, afterEach, vi } from 'vitest';
