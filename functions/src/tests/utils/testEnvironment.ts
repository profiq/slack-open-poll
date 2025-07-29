import { vi, beforeEach, afterEach, expect } from 'vitest';
import { createMockSlackWebClient, setupDefaultSlackResponses, resetSlackMocks } from '../mocks/slackWebClient';


/**
 * Test environment setup for Slack webhook integration tests
 */
export class TestEnvironment {
  public slackClient: ReturnType<typeof createMockSlackWebClient>['mockClient'];
  public slackMocks: ReturnType<typeof createMockSlackWebClient>['mocks'];
  public mockAck: ReturnType<typeof vi.fn>;
  public mockRespond: ReturnType<typeof vi.fn>;

  constructor() {
    const { mockClient, mocks } = createMockSlackWebClient();
    this.slackClient = mockClient;
    this.slackMocks = mocks;
    this.mockAck = vi.fn();
    this.mockRespond = vi.fn();
  }

  /**
   * Sets up the test environment with default mocks
   */
  setup() {
    // Setup default successful responses
    setupDefaultSlackResponses(this.slackMocks);

    // Setup default ack and respond functions
    this.mockAck.mockResolvedValue(undefined);
    this.mockRespond.mockResolvedValue(undefined);

    // Mock environment variables if needed
    this.setupEnvironmentVariables();
  }

  /**
   * Resets all mocks between tests
   */
  reset() {
    resetSlackMocks(this.slackMocks);
    this.mockAck.mockReset();
    this.mockRespond.mockReset();
  }

  /**
   * Sets up environment variables for testing
   */
  private setupEnvironmentVariables() {
    // Set environment variables before any imports that might use them
    if (!process.env.NODE_ENV) process.env.NODE_ENV = 'test';
    if (!process.env.SLACK_SIGNING_SECRET) process.env.SLACK_SIGNING_SECRET = 'test-signing-secret';
    if (!process.env.SLACK_BOT_TOKEN) process.env.SLACK_BOT_TOKEN = 'xoxb-test-token';
    if (!process.env.DEFAULT_FUNCTIONS_LOCATION) process.env.DEFAULT_FUNCTIONS_LOCATION = 'us-central1';
    if (!process.env.FIRESTORE_EMULATOR_HOST) process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';
  }

  /**
   * Creates a mock logger that doesn't output during tests
   */
  createMockLogger() {
    return {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      fatal: vi.fn(),
      trace: vi.fn(),
      log: vi.fn(),
      setLevel: vi.fn(),
      getLevel: vi.fn().mockReturnValue('info'),
      setName: vi.fn(),
      withContext: vi.fn().mockReturnThis(),
      startTimer: vi.fn().mockReturnValue('timer-id'),
      endTimer: vi.fn(),
    };
  }

  /**
   * Simulates Slack API errors for testing error handling
   */
  simulateSlackApiError(method: keyof typeof this.slackMocks, error: string, code?: string) {
    this.slackMocks[method].mockRejectedValue(new Error(`${error}${code ? ` (${code})` : ''}`));
  }

  /**
   * Simulates network timeouts for testing resilience
   */
  simulateTimeout(method: keyof typeof this.slackMocks, timeoutMs = 5000) {
    this.slackMocks[method].mockImplementation(
      () => new Promise((_, reject) => setTimeout(() => reject(new Error('Request timeout')), timeoutMs))
    );
  }

  /**
   * Simulates rate limiting from Slack API
   */
  simulateRateLimit(method: keyof typeof this.slackMocks) {
    this.simulateSlackApiError(method, 'rate_limited', 'slack_webapi_rate_limited');
  }

  /**
   * Verifies that all expected Slack API calls were made
   */
  verifyAllCallsMade(expectedCalls: (keyof typeof this.slackMocks)[]) {
    expectedCalls.forEach((method) => {
      expect(this.slackMocks[method]).toHaveBeenCalled();
    });
  }

  /**
   * Verifies that no unexpected Slack API calls were made
   */
  verifyNoUnexpectedCalls(allowedCalls: (keyof typeof this.slackMocks)[]) {
    Object.entries(this.slackMocks).forEach(([method, mock]) => {
      if (!allowedCalls.includes(method as keyof typeof this.slackMocks)) {
        expect(mock).not.toHaveBeenCalled();
      }
    });
  }
}

/**
 * Global test environment instance
 */
let globalTestEnv: TestEnvironment;

/**
 * Sets up a global test environment for integration tests
 */
export function setupIntegrationTestEnvironment() {
  beforeEach(() => {
    globalTestEnv = new TestEnvironment();
    globalTestEnv.setup();
  });

  afterEach(() => {
    if (globalTestEnv) {
      globalTestEnv.reset();
    }
  });

  return () => globalTestEnv;
}

/**
 * Mock implementations for common services
 */
export class ServiceMocks {
  /**
   * Creates a mock PollService
   */
  static createMockPollService() {
    return {
      // FirestoreService methods
      create: vi.fn(),
      getById: vi.fn(),
      getAll: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      runTransaction: vi.fn(),
      getDocRef: vi.fn(),
      getInTransaction: vi.fn(),
      updateInTransaction: vi.fn(),
      createInTransaction: vi.fn(),
      deleteInTransaction: vi.fn(),
      // PollService specific methods
      vote: vi.fn(),
      close: vi.fn(),
    };
  }

  /**
   * Creates a mock Firestore document reference
   */
  static createMockDocumentRef() {
    return {
      id: 'mock-doc-id',
      get: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      set: vi.fn(),
    };
  }

  /**
   * Creates a mock Firestore document snapshot
   */
  static createMockDocumentSnapshot(data: unknown) {
    return {
      id: 'mock-doc-id',
      exists: true,
      data: vi.fn().mockReturnValue(data),
      ref: this.createMockDocumentRef(),
    };
  }
}

/**
 * Utility for testing async operations
 */
export class AsyncTestUtils {
  /**
   * Waits for all pending promises to resolve
   */
  static async flushPromises() {
    return new Promise((resolve) => setImmediate(resolve));
  }

  /**
   * Waits for a specific condition to be true
   */
  static async waitFor(condition: () => boolean, timeout = 1000) {
    const start = Date.now();
    while (!condition() && Date.now() - start < timeout) {
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
    if (!condition()) {
      throw new Error('Condition not met within timeout');
    }
  }

  /**
   * Creates a promise that resolves after a delay
   */
  static delay(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
