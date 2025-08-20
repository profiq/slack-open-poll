import { vi } from 'vitest';

// Factory for mocking ../firebase module
export function firebaseMockFactory() {
  return {
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
  };
}

// Factory for mocking ../utils/logger module
export function createLoggerMockFactory(overrides?: {
  error?: ReturnType<typeof vi.fn>;
  warn?: ReturnType<typeof vi.fn>;
}) {
  const error = overrides?.error ?? vi.fn();
  const warn = overrides?.warn ?? vi.fn();
  return {
    Logger: vi.fn(() => ({
      withContext: vi.fn().mockReturnThis(),
      error,
      warn,
      log: vi.fn(),
      info: vi.fn(),
      debug: vi.fn(),
      startTimer: vi.fn().mockReturnValue(Date.now()),
      endTimer: vi.fn(),
    })),
  };
}
