import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { UserService } from '../services/userService';
import type { User } from '../types/user';
import type { DocumentReference } from 'firebase/firestore';

describe('UserService', () => {
  let service: UserService;
  let mockCreate: Mock<(data: Omit<User, 'createdAt'>) => Promise<DocumentReference<User>>>;

  const mockUserRef = {} as DocumentReference<User>;

  beforeEach(() => {
    vi.clearAllMocks();

    service = new UserService();

    mockCreate = vi.fn() as Mock<(data: Omit<User, 'createdAt'>) => Promise<DocumentReference<User>>>;
    (service as unknown as { create: typeof mockCreate }).create = mockCreate;
  });

  describe('addUser', () => {
    it('should throw an error if user id is missing', async () => {
      await expect(service.addUser({ name: 'No ID' } as User)).rejects.toThrow('User ID is missing! Cannot save user.');
    });

    it('should call create with user + createdAt', async () => {
      const mockDate = '2023-01-01T00:00:00.000Z';
      vi.spyOn(global.Date.prototype, 'toISOString').mockReturnValue(mockDate);

      mockCreate.mockResolvedValue(mockUserRef);

      const newUser = { id: 'user-2', name: 'New User' };
      const result = await service.addUser(newUser);

      expect(mockCreate).toHaveBeenCalledWith({
        ...newUser,
        createdAt: mockDate,
      });
      expect(result).toBe(mockUserRef);

      vi.restoreAllMocks();
    });

    it('should propagate errors from create', async () => {
      mockCreate.mockRejectedValue(new Error('Firestore error'));

      await expect(service.addUser({ id: 'user-3', name: 'Broken User' })).rejects.toThrow('Firestore error');
    });
  });
});
