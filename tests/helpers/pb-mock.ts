import { vi } from 'vitest';
import type { RecordService } from 'pocketbase';

// Mock data types
export interface MockRecord {
  id: string;
  created: string;
  updated: string;
  [key: string]: any;
}

export interface MockCollection {
  records: MockRecord[];
  schema: any[];
}

// Mock PocketBase instance
export class MockPocketBase {
  collection = vi.fn();
  authStore = {
    model: null,
    token: '',
    isValid: false,
    clear: vi.fn(),
    save: vi.fn(),
    onChange: vi.fn()
  };
  
  private services = new Map<string, MockRecordService>();

  constructor() {
    this.collection.mockImplementation((name: string) => {
      if (!this.services.has(name)) {
        this.services.set(name, new MockRecordService(name, this));
      }
      return this.services.get(name);
    });
  }

  // Reset all mocks
  reset() {
    this.services.forEach(service => {
      service.getFullList.mockClear();
      service.getList.mockClear();
      service.getOne.mockClear();
      service.create.mockClear();
      service.update.mockClear();
      service.delete.mockClear();
      service.subscribe.mockClear();
      service.unsubscribe.mockClear();
      service.authWithPassword.mockClear();
      service.authRefresh.mockClear();
      service.requestPasswordReset.mockClear();
      service.confirmPasswordReset.mockClear();
    });
    this.authStore.model = null;
    this.authStore.token = '';
    this.authStore.isValid = false;
  }
}

// Mock RecordService
export class MockRecordService {
  constructor(private collectionName: string, private pb: MockPocketBase) {}

  getFullList = vi.fn().mockResolvedValue([]);
  getList = vi.fn().mockResolvedValue({ items: [], totalItems: 0, totalPages: 0, page: 1, perPage: 30 });
  getOne = vi.fn().mockResolvedValue({});
  create = vi.fn().mockResolvedValue({});
  update = vi.fn().mockResolvedValue({});
  delete = vi.fn().mockResolvedValue(true);
  getFileUrl = vi.fn().mockReturnValue('http://localhost:8090/file.jpg');
  subscribe = vi.fn().mockResolvedValue(() => {});
  unsubscribe = vi.fn().mockResolvedValue(true);
  
  // Auth methods
  authWithPassword = vi.fn().mockResolvedValue({ record: {}, token: 'mock-token' });
  authRefresh = vi.fn().mockResolvedValue({ record: {}, token: 'mock-token' });
  requestPasswordReset = vi.fn().mockResolvedValue({});
  confirmPasswordReset = vi.fn().mockResolvedValue({});

  // Helper methods for setting up mock responses
  mockGetFullList(records: MockRecord[]) {
    this.getFullList.mockResolvedValue(records);
    return this;
  }

  mockGetList(records: MockRecord[], totalCount?: number) {
    const totalItems = totalCount ?? records.length;
    this.getList.mockResolvedValue({
      items: records,
      totalItems,
      totalPages: Math.ceil(totalItems / 30),
      page: 1,
      perPage: 30
    });
    return this;
  }

  mockGetOne(record: MockRecord) {
    this.getOne.mockResolvedValue(record);
    return this;
  }

  mockCreate(record: MockRecord) {
    this.create.mockResolvedValue(record);
    return this;
  }

  mockUpdate(record: MockRecord) {
    this.update.mockResolvedValue(record);
    return this;
  }

  mockError(error: any) {
    this.getFullList.mockRejectedValue(error);
    this.getList.mockRejectedValue(error);
    this.getOne.mockRejectedValue(error);
    this.create.mockRejectedValue(error);
    this.update.mockRejectedValue(error);
    this.delete.mockRejectedValue(error);
    this.authWithPassword.mockRejectedValue(error);
    this.authRefresh.mockRejectedValue(error);
    this.requestPasswordReset.mockRejectedValue(error);
    this.confirmPasswordReset.mockRejectedValue(error);
    return this;
  }
}

// Create mock instance
export const mockPb = new MockPocketBase();

// Mock the PocketBase module
vi.mock('pocketbase', () => ({
  default: vi.fn(() => mockPb)
}));

// Mock the client module
vi.mock('$lib/api/client', () => ({
  pb: mockPb
}));