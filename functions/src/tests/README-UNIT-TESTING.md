# Unit Testing Guide - Preventing GoogleAuth.findAndCacheProjectId Errors

This guide explains how to properly set up unit tests to prevent Firebase/Google Cloud authentication errors during testing.

## The Problem

When running unit tests that import modules using Firebase Admin SDK, you may encounter this error:

```
Error: Unable to detect a Project Id in the current environment. 
To learn more about authentication and Google APIs, visit: 
https://cloud.google.com/docs/authentication/getting-started
    at GoogleAuth.findAndCacheProjectId
```

This happens because:
1. Firebase Admin SDK tries to authenticate with Google Cloud services during module initialization
2. The `firebase.ts` file executes `admin.initializeApp()` and `firestore.listCollections()` at import time
3. Unit tests should not make real network calls or require cloud authentication

## The Solution

### 1. Mock Firebase Admin SDK Before Any Imports

Always mock Firebase Admin SDK **before** importing any modules that use it:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Firebase Admin SDK FIRST - before any other imports
vi.mock('firebase-admin', () => ({
  default: {
    initializeApp: vi.fn(),
    firestore: vi.fn(() => ({
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
    })),
  },
}));

// Mock Firebase Functions Logger
vi.mock('firebase-functions/logger', () => ({
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
}));

// Mock the firebase.ts file to prevent initialization
vi.mock('../firebase', () => ({
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

// NOW you can import your modules
import { handleOpenButton } from '../handlers/openButtonHandler';
```

### 2. Mock Service Classes

Mock service classes that extend FirestoreService:

```typescript
// Mock PollService
const mockGetById = vi.fn();
vi.mock('../services/pollService', () => ({
  PollService: vi.fn().mockImplementation(() => ({
    getById: mockGetById,
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    vote: vi.fn(),
  })),
}));
```

### 3. Mock Logger

Mock the Logger class to prevent Firebase Functions logger calls:

```typescript
vi.mock('../utils/logger', () => ({
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
```

### 4. Use the Unit Test Setup Utility

For convenience, you can use the `unitTestSetup.ts` utility:

```typescript
import { setupUnitTestMocks, createMockPoll } from './utils/unitTestSetup';

// This handles all the basic Firebase mocking
const { pollService } = setupUnitTestMocks();
```

## Complete Example

Here's a complete example of a properly set up unit test:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Firebase Admin SDK before any imports
vi.mock('firebase-admin', () => ({
  default: {
    initializeApp: vi.fn(),
    firestore: vi.fn(() => ({
      collection: vi.fn(() => ({
        withConverter: vi.fn(() => ({
          doc: vi.fn(() => ({ get: vi.fn(), update: vi.fn() })),
          add: vi.fn(),
        })),
      })),
      runTransaction: vi.fn(),
      listCollections: vi.fn().mockResolvedValue([]),
    })),
  },
}));

vi.mock('firebase-functions/logger', () => ({
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
}));

vi.mock('../firebase', () => ({
  firestore: {
    collection: vi.fn(() => ({
      withConverter: vi.fn(() => ({
        doc: vi.fn(() => ({ get: vi.fn(), update: vi.fn() })),
        add: vi.fn(),
      })),
    })),
    runTransaction: vi.fn(),
  },
}));

const mockGetById = vi.fn();
vi.mock('../services/pollService', () => ({
  PollService: vi.fn().mockImplementation(() => ({
    getById: mockGetById,
  })),
}));

vi.mock('../utils/logger', () => ({
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

// Now import your modules
import { handleOpenButton } from '../handlers/openButtonHandler';

describe('handleOpenButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetById.mockResolvedValue({ id: 'test', createdBy: 'user123' });
  });

  it('should work without GoogleAuth errors', async () => {
    // Your test code here
  });
});
```

## Key Points

1. **Order matters**: Mock Firebase modules **before** importing any code that uses them
2. **Mock at module level**: Use `vi.mock()` at the top level, not inside test functions
3. **Mock comprehensively**: Mock Firebase Admin SDK, Firebase Functions Logger, and your firebase.ts file
4. **Mock services**: Mock any service classes that use Firestore
5. **Use utilities**: Consider using the `unitTestSetup.ts` utility for common mocking patterns

## Integration vs Unit Tests

- **Unit tests**: Should mock all external dependencies (Firebase, network calls, etc.)
- **Integration tests**: Can use Firebase emulators and make real calls to test services

For integration tests, use the existing `TestEnvironment` class and Firebase emulators.
