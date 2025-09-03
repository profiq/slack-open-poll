import {
  FirestoreDataConverter,
  PartialWithFieldValue,
  QueryDocumentSnapshot,
  Transaction,
} from 'firebase-admin/firestore';
import { firestore } from '../firebase';
import { BaseDocument } from '../types/baseDocument';
import { type Channel, type User } from '../types/poll';

export const converter = <T>(): FirestoreDataConverter<T> => ({
  toFirestore: (data: PartialWithFieldValue<T>) => data ?? {},
  fromFirestore: (snapshot: QueryDocumentSnapshot) => snapshot.data() as T,
});

export class FirestoreService<T extends BaseDocument> {
  private collection: FirebaseFirestore.CollectionReference<T>;

  constructor(collectionName: string) {
    this.collection = firestore.collection(collectionName).withConverter(converter<T>());
  }
  async getById(id: string) {
    const doc = await this.collection.doc(id).get();
    const data = doc.data();

    if (!data) {
      return data;
    }

    if (data.deleted) {
      return null;
    }
    return data;
  }

  async getAll() {
    const snapshot = await this.collection.get();
    return snapshot.docs.map((doc) => doc.data()).filter((data) => !data.deleted);
  }

  async create(data: Omit<T, 'createdAt'>) {
    const timestamp = new Date().toISOString();
    const dataWithTimestamp = { ...data, createdAt: timestamp } as T;
    return await this.collection.add(dataWithTimestamp);
  }

  async update(id: string, data: Partial<Omit<T, 'id'>>) {
    return await this.collection.doc(id).update(data);
  }

  async delete(id: string) {
    await this.collection.doc(id).update({ deleted: true });
    return { id, deleted: true };
  }

  // New transaction methods
  async runTransaction<TResult>(callback: (transaction: Transaction) => Promise<TResult>): Promise<TResult> {
    return await firestore.runTransaction(callback);
  }

  getDocRef(id: string) {
    return this.collection.doc(id);
  }

  async getInTransaction(transaction: Transaction, id: string) {
    const docRef = this.getDocRef(id);
    const doc = await transaction.get(docRef);
    return doc.data();
  }

  updateInTransaction(transaction: Transaction, id: string, data: Partial<Omit<T, 'id'>>) {
    const docRef = this.getDocRef(id);
    transaction.update(docRef, data);
  }

  createInTransaction(transaction: Transaction, id: string, data: Omit<T, 'createdAt'>) {
    const timestamp = new Date().toISOString();
    const dataWithTimestamp = { ...data, createdAt: timestamp } as T;
    const docRef = this.getDocRef(id);
    transaction.set(docRef, dataWithTimestamp);
  }

  deleteInTransaction(transaction: Transaction, id: string) {
    const docRef = this.getDocRef(id);
    transaction.delete(docRef);
  }
}

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
      } catch (e) {
        console.error('Failed to save user:', e);
      }

      return dataWithTimestamp;
    }

    return existing;
  }
}

export class ChannelService extends FirestoreService<Channel> {
  constructor() {
    super('channels_list');
  }

  async addChannel(channel: Omit<Channel, 'createdAt'>) {
    console.log('Adding channel:', channel);

    if (!channel.id) {
      console.error('Channel ID is missing! Cannot save channel.');
      return null;
    }

    const existing = await this.getById(channel.id);
    console.log('Existing channel:', existing);

    if (!existing) {
      const timestamp = new Date().toISOString();
      const dataWithTimestamp = { ...channel, createdAt: timestamp } as Channel;
      const docRef = this.getDocRef(channel.id);

      try {
        await docRef.set(dataWithTimestamp);
        console.log('Channel saved:', dataWithTimestamp);
      } catch (e) {
        console.error('Failed to save channel:', e);
      }

      return dataWithTimestamp;
    }

    return existing;
  }
}
