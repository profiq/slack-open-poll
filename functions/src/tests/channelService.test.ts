import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { ChannelService } from '../services/channelService';
import { firestore } from '../firebase';
import type { Channel } from '../types/channel';

vi.mock('../firebase', () => ({
  firestore: {
    collection: vi.fn(),
  },
}));

describe('ChannelService', () => {
  let service: ChannelService;
  let mockCollection: { doc: Mock; withConverter: Mock };
  let mockDoc: { set: Mock; get: Mock };

  const mockChannel: Channel = {
    id: 'channel-1',
    name: 'General',
    createdAt: '2023-01-01T00:00:00.000Z',
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockDoc = {
      set: vi.fn(),
      get: vi.fn(),
    };

    mockCollection = {
      doc: vi.fn().mockReturnValue(mockDoc),
      withConverter: vi.fn().mockReturnThis(),
    };

    (firestore.collection as Mock).mockReturnValue(mockCollection);

    service = new ChannelService();
  });

  describe('addChannel', () => {
    it('should return null if channel id is missing', async () => {
      const result = await service.addChannel({ name: 'No ID' } as Channel);
      expect(result).toBeNull();
    });

    it('should return existing channel if already exists', async () => {
      vi.spyOn(service, 'getById').mockResolvedValue(mockChannel);

      const result = await service.addChannel({ id: 'channel-1', name: 'General' });

      expect(result).toEqual(mockChannel);
      expect(service.getById).toHaveBeenCalledWith('channel-1');
      expect(mockDoc.set).not.toHaveBeenCalled();
    });

    it('should save new channel if not exists', async () => {
      vi.spyOn(service, 'getById').mockResolvedValue(null);

      const mockDate = '2023-01-01T00:00:00.000Z';
      vi.spyOn(global.Date.prototype, 'toISOString').mockReturnValue(mockDate);

      mockDoc.set.mockResolvedValue(undefined);

      const newChannel = { id: 'channel-2', name: 'Random' };
      const result = await service.addChannel(newChannel);

      expect(mockCollection.doc).toHaveBeenCalledWith('channel-2');
      expect(mockDoc.set).toHaveBeenCalledWith({
        ...newChannel,
        createdAt: mockDate,
      });
      expect(result).toEqual({
        ...newChannel,
        createdAt: mockDate,
      });

      vi.restoreAllMocks();
    });

    it('should return null if saving fails', async () => {
      vi.spyOn(service, 'getById').mockResolvedValue(null);

      mockDoc.set.mockRejectedValue(new Error('Firestore error'));

      const result = await service.addChannel({ id: 'channel-3', name: 'Broken Channel' });

      expect(result).toBeNull();
    });
  });
});
