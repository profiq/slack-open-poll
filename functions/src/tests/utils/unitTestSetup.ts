import { vi } from 'vitest';

/**
 * Unit test setup utilities to prevent Firebase/Google Cloud authentication
 * during unit tests. This prevents GoogleAuth.findAndCacheProjectId errors.
 */

/**
 * Mock Firebase Admin SDK and related services
 * Call this before importing any modules that use Firebase
 */
export function mockFirebaseServices() {
  // Mock Firebase Admin SDK
  vi.mock('../../firebase', () => ({
    firestore: {
      collection: vi.fn(() => ({
        withConverter: vi.fn(() => ({
          doc: vi.fn(() => ({
            get: vi.fn(),
            update: vi.fn(),
            delete: vi.fn(),
            set: vi.fn(),
          })),
          add: vi.fn(),
          get: vi.fn(),
        })),
      })),
      runTransaction: vi.fn(),
      listCollections: vi.fn().mockResolvedValue([]),
    },
  }));

  // Mock Firebase Functions Logger
  vi.mock('firebase-functions/logger', () => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }));

  // Mock Firebase Admin initialization
  vi.mock('firebase-admin', () => ({
    default: {
      initializeApp: vi.fn(),
      firestore: vi.fn(() => ({
        collection: vi.fn(),
        runTransaction: vi.fn(),
        listCollections: vi.fn().mockResolvedValue([]),
      })),
    },
  }));
}

/**
 * Mock Logger to prevent Firebase Functions logger calls
 */
export function mockLogger() {
  return vi.mock('../../utils/logger', () => ({
    Logger: vi.fn().mockImplementation(() => ({
      withContext: vi.fn().mockReturnThis(),
      startTimer: vi.fn().mockReturnValue(Date.now()),
      endTimer: vi.fn(),
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    })),
  }));
}

/**
 * Mock PollService with customizable behavior
 */
export function mockPollService() {
  const mockGetById = vi.fn();
  const mockCreate = vi.fn();
  const mockUpdate = vi.fn();
  const mockDelete = vi.fn();
  const mockVote = vi.fn();

  vi.mock('../../services/pollService', () => ({
    PollService: vi.fn().mockImplementation(() => ({
      getById: mockGetById,
      create: mockCreate,
      update: mockUpdate,
      delete: mockDelete,
      vote: mockVote,
    })),
  }));

  return {
    mockGetById,
    mockCreate,
    mockUpdate,
    mockDelete,
    mockVote,
  };
}

/**
 * Mock FirestoreService for unit tests
 */
export function mockFirestoreService() {
  const mockGetById = vi.fn();
  const mockCreate = vi.fn();
  const mockUpdate = vi.fn();
  const mockDelete = vi.fn();
  const mockGetAll = vi.fn();
  const mockRunTransaction = vi.fn();

  vi.mock('../../services/firestoreService', () => ({
    FirestoreService: vi.fn().mockImplementation(() => ({
      getById: mockGetById,
      create: mockCreate,
      update: mockUpdate,
      delete: mockDelete,
      getAll: mockGetAll,
      runTransaction: mockRunTransaction,
      getDocRef: vi.fn(),
      getInTransaction: vi.fn(),
      updateInTransaction: vi.fn(),
      createInTransaction: vi.fn(),
      deleteInTransaction: vi.fn(),
    })),
    converter: vi.fn(),
  }));

  return {
    mockGetById,
    mockCreate,
    mockUpdate,
    mockDelete,
    mockGetAll,
    mockRunTransaction,
  };
}

/**
 * Complete unit test setup that mocks all Firebase-related services
 * Use this at the top of unit test files to prevent Google Cloud authentication
 */
export function setupUnitTestMocks() {
  mockFirebaseServices();
  mockLogger();
  
  return {
    pollService: mockPollService(),
    firestoreService: mockFirestoreService(),
  };
}

/**
 * Create a mock poll object for testing
 */
export function createMockPoll(overrides: Partial<any> = {}) {
  return {
    id: 'test-poll-id',
    question: 'Test poll question?',
    options: [
      { id: 'opt1', label: 'Option 1' },
      { id: 'opt2', label: 'Option 2' },
    ],
    createdBy: 'U123456',
    channelId: 'C123456',
    channelTimeStamp: '1234567890.123456',
    votes: [],
    multiple: false,
    maxVotes: 1,
    createdAt: '2023-01-01T00:00:00.000Z',
    ...overrides,
  };
}

/**
 * Create mock Slack user for testing
 */
export function createMockSlackUser(overrides: Partial<any> = {}) {
  return {
    id: 'U123456',
    name: 'testuser',
    real_name: 'Test User',
    ...overrides,
  };
}

/**
 * Create mock Slack body for testing
 */
export function createMockSlackBody(overrides: Partial<any> = {}) {
  return {
    trigger_id: 'trigger_123',
    user: createMockSlackUser(),
    team: { id: 'T123456' },
    ...overrides,
  };
}
