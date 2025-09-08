import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { UserService } from '../services/userService';
import type { User } from '../types/user';
import type { DocumentReference } from 'firebase/firestore';

describe('UserService', () => {
  let service: UserService;
  let mockCreateWithId: Mock<(id: string, data: Omit<User, 'createdAt'>) => Promise<DocumentReference<User>>>;

  const mockUserRef = {} as DocumentReference<User>;

  beforeEach(() => {
    vi.clearAllMocks();

    service = new UserService();

    mockCreateWithId = vi.fn() as Mock<(id: string, data: Omit<User, 'createdAt'>) => Promise<DocumentReference<User>>>;
    (service as unknown as { createWithId: typeof mockCreateWithId }).createWithId = mockCreateWithId;
  });

  describe('addUser', () => {
    it('should throw an error if user id is missing', async () => {
      await expect(service.addUser({ name: 'No ID' } as User)).rejects.toThrow('User ID is missing! Cannot save user.');
    });

    it('should call createWithId with id and user', async () => {
      mockCreateWithId.mockResolvedValue(mockUserRef);

      const newUser = { id: 'user-2', name: 'New User' };
      const result = await service.addUser(newUser);

      expect(mockCreateWithId).toHaveBeenCalledWith('user-2', {
        id: 'user-2',
        name: 'New User',
      });
      expect(result).toBe(mockUserRef);
    });

    it('should propagate errors from createWithId', async () => {
      mockCreateWithId.mockRejectedValue(new Error('Firestore error'));

      await expect(service.addUser({ id: 'user-3', name: 'Broken User' })).rejects.toThrow('Firestore error');
    });
  });
});
