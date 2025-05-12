import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { FirestoreService } from '../services/firestoreService';
import { firestore } from '../firebase';
import { BaseDocument } from '../types/baseDocument';

// Mock firebase
vi.mock('../firebase', () => ({
  firestore: {
    collection: vi.fn(),
    runTransaction: vi.fn(),
  },
}));

// Test interface
interface TestDoc extends BaseDocument {
  id: string;
  name: string;
  value: number;
}

describe('FirestoreService', () => {
  let service: FirestoreService<TestDoc>;
  let mockCollection: {
    doc: Mock;
    add: Mock;
    get: Mock;
    withConverter: Mock;
  };
  let mockDoc: {
    get: Mock;
    update: Mock;
    delete: Mock;
  };

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Setup mock chain
    mockDoc = {
      get: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    };

    mockCollection = {
      doc: vi.fn().mockReturnValue(mockDoc),
      add: vi.fn(),
      get: vi.fn(),
      withConverter: vi.fn().mockReturnThis(),
    };

    (firestore.collection as Mock).mockReturnValue(mockCollection);

    // Initialize service
    service = new FirestoreService<TestDoc>('test-collection');
  });

  describe('Basic CRUD operations', () => {
    it('should get document by id', async () => {
      const mockData = { id: '1', name: 'test', value: 42 };
      mockDoc.get.mockResolvedValue({ data: () => mockData });

      const result = await service.getById('1');

      expect(mockCollection.doc).toHaveBeenCalledWith('1');
      expect(mockDoc.get).toHaveBeenCalled();
      expect(result).toEqual(mockData);
    });

    it('should get all documents', async () => {
      const mockDocs = [
        { data: () => ({ id: '1', name: 'test1', value: 42 }) },
        { data: () => ({ id: '2', name: 'test2', value: 43 }) },
      ];
      mockCollection.get.mockResolvedValue({ docs: mockDocs });

      const result = await service.getAll();

      expect(mockCollection.get).toHaveBeenCalled();
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ id: '1', name: 'test1', value: 42 });
    });

    it('should create document', async () => {
      const newDoc = { id: '1', name: 'test', value: 42, createdAt: '' };
      const mockDate = '2023-01-01T00:00:00.000Z';
      vi.spyOn(global.Date.prototype, 'toISOString').mockReturnValue(mockDate);

      mockCollection.add.mockResolvedValue({ id: '1' });

      await service.create(newDoc);

      expect(mockCollection.add).toHaveBeenCalledWith({
        ...newDoc,
        createdAt: mockDate,
      });

      vi.restoreAllMocks();
    });

    it('should update document', async () => {
      const updateData = { name: 'updated', value: 43 };

      await service.update('1', updateData);

      expect(mockCollection.doc).toHaveBeenCalledWith('1');
      expect(mockDoc.update).toHaveBeenCalledWith(updateData);
    });

    it('should delete document', async () => {
      await service.delete('1');

      expect(mockCollection.doc).toHaveBeenCalledWith('1');
      expect(mockDoc.delete).toHaveBeenCalled();
    });
  });

  describe('Transaction operations', () => {
    let mockTransaction: {
      create: Mock;
      get: Mock;
      getAll: Mock;
      set: Mock;
      update: Mock;
      delete: Mock;
    };

    beforeEach(() => {
      mockTransaction = {
        create: vi.fn(),
        get: vi.fn(),
        set: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        getAll: vi.fn(),
      };

      (firestore.runTransaction as Mock).mockImplementation(async (callback) => {
        return callback(mockTransaction);
      });
    });

    it('should run transaction', async () => {
      const callback = async () => 'result';

      const result = await service.runTransaction(callback);

      expect(firestore.runTransaction).toHaveBeenCalled();
      expect(result).toBe('result');
    });

    it('should get document in transaction', async () => {
      const mockData = { id: '1', name: 'test', value: 42 };
      mockTransaction.get.mockResolvedValue({ data: () => mockData });

      const result = await service.getInTransaction(mockTransaction, '1');

      expect(mockCollection.doc).toHaveBeenCalledWith('1');
      expect(mockTransaction.get).toHaveBeenCalled();
      expect(result).toEqual(mockData);
    });

    it('should update document in transaction', async () => {
      const updateData = { name: 'updated', value: 43 };

      service.updateInTransaction(mockTransaction, '1', updateData);

      expect(mockCollection.doc).toHaveBeenCalledWith('1');
      expect(mockTransaction.update).toHaveBeenCalledWith(mockDoc, updateData);
    });

    it('should create document in transaction', async () => {
      const newDoc = { id: '1', name: 'test', value: 42, createdAt: '' };
      const mockDate = '2023-01-01T00:00:00.000Z';
      vi.spyOn(global.Date.prototype, 'toISOString').mockReturnValue(mockDate);

      service.createInTransaction(mockTransaction, '1', newDoc);

      expect(mockCollection.doc).toHaveBeenCalledWith('1');
      expect(mockTransaction.set).toHaveBeenCalledWith(mockDoc, { ...newDoc, createdAt: mockDate });
    });

    it('should delete document in transaction', async () => {
      service.deleteInTransaction(mockTransaction, '1');

      expect(mockCollection.doc).toHaveBeenCalledWith('1');
      expect(mockTransaction.delete).toHaveBeenCalledWith(mockDoc);
    });
  });
});
