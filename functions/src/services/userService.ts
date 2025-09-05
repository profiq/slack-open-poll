import type { User } from '../types/user';
import { FirestoreService } from './firestoreService';

export class UserService extends FirestoreService<User> {
  constructor() {
    super('users_list');
  }

  async addUser(user: Omit<User, 'createdAt'>) {
    console.log('Adding user:', user);

    if (!user.id) {
      console.error('User ID is missing! Cannot save user.');
      return null;
    }

    const existing = await this.getById(user.id);
    console.log('Existing user:', existing);

    if (!existing) {
      const timestamp = new Date().toISOString();
      const dataWithTimestamp = { ...user, createdAt: timestamp } as User;
      const docRef = this.getDocRef(user.id);

      try {
        await docRef.set(dataWithTimestamp);
        console.log('User saved:', dataWithTimestamp);
        return dataWithTimestamp;
      } catch (e) {
        console.error('Failed to save user:', e);
        return null;
      }
    }

    return existing;
  }
}
