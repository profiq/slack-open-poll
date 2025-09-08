import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { ChannelService } from '../services/channelService';
import type { Channel } from '../types/channel';
import type { DocumentReference } from 'firebase/firestore';

describe('ChannelService', () => {
  let service: ChannelService;
  let mockCreateWithId: Mock<(id: string, data: Omit<Channel, 'createdAt'>) => Promise<DocumentReference<Channel>>>;

  const mockChannelRef = {} as DocumentReference<Channel>;

  beforeEach(() => {
    vi.clearAllMocks();

    service = new ChannelService();

    mockCreateWithId = vi.fn() as Mock<
      (id: string, data: Omit<Channel, 'createdAt'>) => Promise<DocumentReference<Channel>>
    >;
    (service as unknown as { createWithId: typeof mockCreateWithId }).createWithId = mockCreateWithId;
  });

  describe('addChannel', () => {
    it('should throw an error if channel id is missing', async () => {
      await expect(service.addChannel({ name: 'No ID' } as Channel)).rejects.toThrow(
        'Channel ID is missing! Cannot save channel.'
      );
    });

    it('should call createWithId with id and channel', async () => {
      const mockDate = '2023-01-01T00:00:00.000Z';
      vi.spyOn(global.Date.prototype, 'toISOString').mockReturnValue(mockDate);

      mockCreateWithId.mockResolvedValue(mockChannelRef);

      const newChannel = { id: 'channel-1', name: 'Test Channel' };
      const result = await service.addChannel(newChannel);

      expect(mockCreateWithId).toHaveBeenCalledWith('channel-1', {
        id: 'channel-1',
        name: 'Test Channel',
      });
      expect(result).toBe(mockChannelRef);

      vi.restoreAllMocks();
    });

    it('should propagate errors from createWithId', async () => {
      mockCreateWithId.mockRejectedValue(new Error('Firestore error'));

      await expect(service.addChannel({ id: 'channel-2', name: 'Broken Channel' })).rejects.toThrow('Firestore error');
    });
  });
});
