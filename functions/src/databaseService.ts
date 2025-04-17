import admin from 'firebase-admin';
import { DocumentData } from 'firebase-admin/firestore';
import config from './utils/config';

class DatabaseService {
  private static instance: DatabaseService;
  private db: admin.firestore.Firestore;
  private connected = false;

  private constructor() {
    if (!admin.apps.length) {
      admin.initializeApp();
    }

    if (config.NODE_ENV === 'development') {
      const host = config.FIRESTORE_EMULATOR_HOST;
      console.log(`Firestore using emulator at ${host}`);
    }

    this.db = admin.firestore();
    this.connected = true;
  }

  public static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  public isConnected(): boolean {
    return this.connected;
  }

  // handy for testing, will be moved in the future
  public async getPollById(id: string): Promise<DocumentData | null> {
    try {
      const doc = await this.db.collection('polls').doc(id).get();
      return doc.exists ? doc.data()! : null;
    } catch (error) {
      console.error('getPollById error: ', error);
      return null;
    }
  }

  // handy for testing, will be moved in the future
  public async createPoll(data: DocumentData): Promise<string> {
    try {
      const ref = await this.db.collection('polls').add(data);
      return ref.id;
    } catch (error) {
      console.error('createPoll error: ', error);
      throw new Error('Failed to create poll');
    }
  }
}

export default DatabaseService;
