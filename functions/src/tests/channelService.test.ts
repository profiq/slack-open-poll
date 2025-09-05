import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { ChannelService } from '../services/channelService';
import type { Channel } from '../types/channel';
import type { DocumentReference } from 'firebase/firestore';

describe('ChannelService', () => {
  let service: ChannelService;
  let mockCreate: Mock<(data: Omit<Channel, 'createdAt'>) => Promise<DocumentReference<Channel>>>;

  const mockChannelRef = {} as DocumentReference<Channel>;

  beforeEach(() => {
    vi.clearAllMocks();

    service = new ChannelService();

    mockCreate = vi.fn() as Mock<(data: Omit<Channel, 'createdAt'>) => Promise<DocumentReference<Channel>>>;
    (service as unknown as { create: typeof mockCreate }).create = mockCreate;
  });

  describe('addChannel', () => {
    it('should throw an error if channel id is missing', async () => {
      await expect(service.addChannel({ name: 'No ID' } as Channel)).rejects.toThrow(
        'Channel ID is missing! Cannot save channel.'
      );
    });

    it('should call create with channel + createdAt', async () => {
      const mockDate = '2023-01-01T00:00:00.000Z';
      vi.spyOn(global.Date.prototype, 'toISOString').mockReturnValue(mockDate);

      mockCreate.mockResolvedValue(mockChannelRef);

      const newChannel = { id: 'channel-1', name: 'Test Channel' };
      const result = await service.addChannel(newChannel);

      expect(mockCreate).toHaveBeenCalledWith({
        ...newChannel,
        createdAt: mockDate,
      });
      expect(result).toBe(mockChannelRef);

      vi.restoreAllMocks();
    });

    it('should propagate errors from create', async () => {
      mockCreate.mockRejectedValue(new Error('Firestore error'));

      await expect(service.addChannel({ id: 'channel-2', name: 'Broken Channel' })).rejects.toThrow('Firestore error');
    });
  });
});
