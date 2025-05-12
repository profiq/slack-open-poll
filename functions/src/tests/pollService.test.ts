import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { PollService } from '../services/pollService';
import { firestore } from '../firebase';
import { Poll, PollInput, Vote } from '../types/poll';

vi.mock('../firebase', () => ({
  firestore: {
    collection: vi.fn(),
    runTransaction: vi.fn(),
  },
}));

describe('PollService', () => {
  let service: PollService;
  let mockCollection: {
    doc: Mock;
    add: Mock;
    withConverter: Mock;
  };
  let mockDoc: {
    get: Mock;
    update: Mock;
    add: Mock;
  };
  let mockTransaction: {
    get: Mock;
    update: Mock;
  };

  const mockPoll: Poll = {
    question: 'Test poll?',
    options: [
      { id: 'opt-1', label: 'Option 1' },
      { id: 'opt-2', label: 'Option 2' },
    ],
    createdBy: 'user-1',
    channelTimeStamp: '1234567890.000000',
    channelId: 'channel-1',
    votes: [],
    multiple: false,
    createdAt: '2023-01-01T00:00:00.000Z',
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockDoc = {
      get: vi.fn(),
      update: vi.fn(),
      add: vi.fn(),
    };

    mockCollection = {
      doc: vi.fn().mockReturnValue(mockDoc),
      add: vi.fn().mockReturnValue(mockDoc),
      withConverter: vi.fn().mockReturnThis(),
    };

    mockTransaction = {
      get: vi.fn(),
      update: vi.fn(),
    };

    (firestore.collection as Mock).mockReturnValue(mockCollection);
    (firestore.runTransaction as Mock).mockImplementation((callback) => callback(mockTransaction));

    service = new PollService();
  });

  describe('createPoll', () => {
    const newPoll: PollInput = {
      question: 'New poll?',
      options: [
        { id: 'opt-1', label: 'Option 1' },
        { id: 'opt-2', label: 'Option 2' },
      ],
      createdBy: 'user-1',
      channelTimeStamp: '1234567890.000000',
      channelId: 'channel-1',
      votes: [],
      multiple: false,
    };

    it('should create a new poll', async () => {
      const mockDocRef = { id: 'new-poll-1' };
      mockCollection.add.mockReturnValue({ ...mockDoc, ...mockDocRef });

      // Mock the Date.toISOString for consistent testing
      const mockDate = '2023-01-01T00:00:00.000Z';
      vi.spyOn(global.Date.prototype, 'toISOString').mockReturnValue(mockDate);

      const result = await service.create(newPoll);

      expect(result.id).toBe('new-poll-1');
      expect(mockCollection.add).toHaveBeenCalledWith({
        ...newPoll,
        createdAt: mockDate,
        votes: [], // If votes is initialized in the service
      });

      vi.restoreAllMocks();
    });

    it('should throw error if poll creation fails', async () => {
      mockCollection.add.mockRejectedValue(new Error('Database error'));

      await expect(service.create(newPoll)).rejects.toThrow('Database error');
    });
  });

  describe('getbyId', () => {
    it('should retrieve poll by id', async () => {
      mockDoc.get.mockResolvedValue({
        data: () => mockPoll,
        exists: true,
      });

      const result = await service.getById('poll-1');

      expect(result).toEqual(mockPoll);
      expect(mockCollection.doc).toHaveBeenCalledWith('poll-1');
    });

    it('should return null for non-existent poll', async () => {
      mockDoc.get.mockResolvedValue({
        exists: false,
        data: () => null,
      });

      const result = await service.getById('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('vote', () => {
    const mockVote: Vote = {
      userId: 'user-1',
      optionId: 'opt-1',
    };

    it('should add new vote when user has not voted', async () => {
      const pollWithNoVotes = { ...mockPoll };
      mockTransaction.get.mockResolvedValue({
        data: () => pollWithNoVotes,
      });

      await service.vote('poll-1', mockVote);

      expect(mockTransaction.update).toHaveBeenCalledWith(mockDoc, { votes: [mockVote] });
    });

    it('should update vote when user changes option', async () => {
      const existingVote: Vote = { userId: 'user-1', optionId: 'opt-2' };
      const pollWithVote = { ...mockPoll, votes: [existingVote] };
      mockTransaction.get.mockResolvedValue({
        data: () => pollWithVote,
      });

      await service.vote('poll-1', mockVote);

      expect(mockTransaction.update).toHaveBeenCalledWith(mockDoc, { votes: [mockVote] });
    });

    it('should remove vote when user clicks same option', async () => {
      const pollWithVote = { ...mockPoll, votes: [mockVote] };
      mockTransaction.get.mockResolvedValue({
        data: () => pollWithVote,
      });

      await service.vote('poll-1', mockVote);

      expect(mockTransaction.update).toHaveBeenCalledWith(mockDoc, { votes: [] });
    });

    it('should throw error when poll not found', async () => {
      mockTransaction.get.mockResolvedValue({
        data: () => null,
      });

      await expect(service.vote('non-existent', mockVote)).rejects.toThrow('Poll with ID non-existent not found');
    });

    it('should handle empty votes array in poll', async () => {
      const pollWithNullVotes = { ...mockPoll, votes: null };
      mockTransaction.get.mockResolvedValue({
        data: () => pollWithNullVotes,
      });

      await service.vote('poll-1', mockVote);

      expect(mockTransaction.update).toHaveBeenCalledWith(mockDoc, { votes: [mockVote] });
    });

    it('should preserve other users votes when updating', async () => {
      const otherVote: Vote = { userId: 'user-2', optionId: 'opt-2' };
      const pollWithMultipleVotes = { ...mockPoll, votes: [otherVote, mockVote] };
      mockTransaction.get.mockResolvedValue({
        data: () => pollWithMultipleVotes,
      });

      const newVote: Vote = { userId: 'user-1', optionId: 'opt-2' };
      await service.vote('poll-1', newVote);

      expect(mockTransaction.update).toHaveBeenCalledWith(mockDoc, { votes: [otherVote, newVote] });
    });

    it('should handle transaction failures', async () => {
      (firestore.runTransaction as Mock).mockRejectedValue(new Error('Transaction failed'));

      await expect(service.vote('poll-1', { userId: 'user-1', optionId: 'opt-1' })).rejects.toThrow(
        'Transaction failed'
      );
    });

    // multiple choice tests
    it('should handle multiple votes when multiple is true', async () => {
      const pollWithMultipleVotes = { ...mockPoll, multiple: true, votes: [] };
      mockTransaction.get.mockResolvedValue({
        data: () => pollWithMultipleVotes,
      });

      await service.vote('poll-1', mockVote);
      expect(mockTransaction.update).toHaveBeenCalledWith(mockDoc, { votes: [mockVote] });

      await service.vote('poll-1', mockVote);
      expect(mockTransaction.update).toHaveBeenCalledWith(mockDoc, { votes: [] });
    });

    it('should add new vote when multiple is true', async () => {
      const pollWithMultipleVotes = { ...mockPoll, multiple: true, votes: [] };
      mockTransaction.get.mockResolvedValue({
        data: () => pollWithMultipleVotes,
      });

      const newVote: Vote = { userId: 'user-2', optionId: 'opt-2' };
      await service.vote('poll-1', newVote);

      expect(mockTransaction.update).toHaveBeenCalledWith(mockDoc, { votes: [newVote] });
    });

    it('should remove vote when user clicks same option when multiple is true', async () => {
      const pollWithMultipleVotes = { ...mockPoll, multiple: true, votes: [mockVote] };
      mockTransaction.get.mockResolvedValue({
        data: () => pollWithMultipleVotes,
      });

      await service.vote('poll-1', mockVote);
      expect(mockTransaction.update).toHaveBeenCalledWith(mockDoc, { votes: [] });
    });
  });
});
