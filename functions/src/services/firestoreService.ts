import {
  FirestoreDataConverter,
  PartialWithFieldValue,
  QueryDocumentSnapshot,
  Transaction,
} from 'firebase-admin/firestore';
import { firestore } from '../firebase';
import { BaseDocument } from '../types/baseDocument';

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
