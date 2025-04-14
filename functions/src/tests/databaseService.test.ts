import { describe, it, expect, vi, beforeEach } from 'vitest';
import DatabaseService from '../databaseService';

const mockPollData = {
  exists: true,
  data: () => ({
    question: 'Test poll',
    options: ['Option 1', 'Option 2'],
    createdBy: 'U123456',
  }),
};

const mockFirestore = {
  collection: vi.fn().mockReturnThis(),
  doc: vi.fn().mockReturnThis(),
  get: vi.fn().mockResolvedValue(mockPollData),
  add: vi.fn().mockResolvedValue({ id: 'mockPollId' }),
};

vi.mock('firebase-admin', () => ({
  default: {
    apps: [],
    initializeApp: vi.fn(),
    firestore: () => mockFirestore,
  },
  credential: {
    cert: vi.fn(),
  },
}));

describe('DatabaseService', () => {
  let db: DatabaseService;

  beforeEach(() => {
    db = DatabaseService.getInstance();
    vi.clearAllMocks();
  });

  it('should connect to the database', () => {
    expect(db.isConnected()).toBe(true);
  });

  it('should create a poll', async () => {
    const pollId = await db.createPoll({ question: 'Test poll' });
    expect(pollId).toBe('mockPollId');
  });

  it('should get a poll by id', async () => {
    const poll = await db.getPollById('mockId');
    expect(poll).toEqual({
      question: 'Test poll',
      options: ['Option 1', 'Option 2'],
      createdBy: 'U123456',
    });
  });
});
