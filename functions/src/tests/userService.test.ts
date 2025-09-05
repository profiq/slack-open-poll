import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { UserService } from '../services/userService';
import { firestore } from '../firebase';
import type { User } from '../types/user';

vi.mock('../firebase', () => ({
  firestore: {
    collection: vi.fn(),
  },
}));

describe('UserService', () => {
  let service: UserService;
  let mockCollection: { doc: Mock; withConverter: Mock };
  let mockDoc: { set: Mock; get: Mock };

  const mockUser: User = {
    id: 'user-1',
    name: 'Test User',
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

    service = new UserService();
  });

  describe('addUser', () => {
    it('should return null if user id is missing', async () => {
      const result = await service.addUser({ name: 'No ID' } as User);
      expect(result).toBeNull();
    });

    it('should return existing user if already exists', async () => {
      vi.spyOn(service, 'getById').mockResolvedValue(mockUser);

      const result = await service.addUser({ id: 'user-1', name: 'Test User' });

      expect(result).toEqual(mockUser);
      expect(service.getById).toHaveBeenCalledWith('user-1');
      expect(mockDoc.set).not.toHaveBeenCalled();
    });

    it('should save new user if not exists', async () => {
      vi.spyOn(service, 'getById').mockResolvedValue(null);

      const mockDate = '2023-01-01T00:00:00.000Z';
      vi.spyOn(global.Date.prototype, 'toISOString').mockReturnValue(mockDate);

      mockDoc.set.mockResolvedValue(undefined);

      const newUser = { id: 'user-2', name: 'New User' };
      const result = await service.addUser(newUser);

      expect(mockCollection.doc).toHaveBeenCalledWith('user-2');
      expect(mockDoc.set).toHaveBeenCalledWith({
        ...newUser,
        createdAt: mockDate,
      });
      expect(result).toEqual({
        ...newUser,
        createdAt: mockDate,
      });

      vi.restoreAllMocks();
    });

    it('should return null if saving fails', async () => {
      vi.spyOn(service, 'getById').mockResolvedValue(null);

      mockDoc.set.mockRejectedValue(new Error('Firestore error'));

      const result = await service.addUser({ id: 'user-3', name: 'Broken User' });

      expect(result).toBeNull();
    });
  });
});
