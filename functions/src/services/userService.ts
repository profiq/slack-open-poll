import type { User } from '../types/user';
import { FirestoreService } from './firestoreService';

export class UserService extends FirestoreService<User> {
  constructor() {
    super('users_list');
  }

  async addUser(user: Omit<User, 'createdAt'>) {
    if (!user.id) {
      throw new Error('User ID is missing! Cannot save user.');
    }

    const timestamp = new Date().toISOString();
    const dataWithTimestamp = { ...user, createdAt: timestamp } as User;

    return this.create(dataWithTimestamp);
  }
}
