import { vi, type Mock } from 'vitest';
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
	collection = vi.fn().mockName('pb.collection');
	authStore = {
		model: null as any,
		token: '',
		isValid: false,
		clear: vi.fn().mockName('authStore.clear'),
		save: vi.fn().mockName('authStore.save'),
		onChange: vi.fn().mockName('authStore.onChange')
	};
	autoCancellation = vi.fn().mockName('pb.autoCancellation').mockReturnThis();

	protected services = new Map<string, MockRecordService>();

	constructor() {
		this.collection.mockImplementation((name: string) => {
			if (!this.services.has(name)) {
				this.services.set(name, new MockRecordService(name, this));
			}
			return this.services.get(name);
		});
	}

	// Helper to set auth state
	setAuthState(user: any, token = 'mock-token') {
		this.authStore.model = user;
		this.authStore.token = token;
		this.authStore.isValid = !!user;
		return this;
	}

	// Reset all mocks
	reset() {
		this.services.forEach((service) => {
			service.getFullList.mockClear();
			service.getList.mockClear();
			service.getOne.mockClear();
			service.getFirstListItem.mockClear();
			service.create.mockClear();
			service.update.mockClear();
			service.delete.mockClear();
			service.subscribe.mockClear();
			service.unsubscribe.mockClear();
			service.authWithPassword.mockClear();
			service.authRefresh.mockClear();
			service.requestPasswordReset.mockClear();
			service.confirmPasswordReset.mockClear();
			service.authWithOAuth2.mockClear();
			service.getOneSongs.mockClear();
			service.updateSong.mockClear();
			service.getFullListUsageInfo.mockClear();
			// Reset mock implementations to defaults
			service.getFullList.mockResolvedValue([]);
			service.getList.mockResolvedValue({
				items: [],
				totalItems: 0,
				totalPages: 0,
				page: 1,
				perPage: 30
			});
			service.getOne.mockResolvedValue({});
			service.getFirstListItem.mockResolvedValue({});
			service.getOneSongs.mockResolvedValue([]);
			service.updateSong.mockResolvedValue({});
			service.getFullListUsageInfo.mockResolvedValue([]);
		});
		this.authStore.model = null;
		this.authStore.token = '';
		this.authStore.isValid = false;
		this.authStore.clear.mockClear();
		this.authStore.save.mockClear();
		this.authStore.onChange.mockClear();
		// Clear the services map to ensure fresh mocks
		this.services.clear();
	}
}

// Mock RecordService
export class MockRecordService {
	getFullList: Mock;
	getList: Mock;
	getOne: Mock;
	getFirstListItem: Mock;
	create: Mock;
	update: Mock;
	delete: Mock;
	getFileUrl: Mock;
	subscribe: Mock;
	unsubscribe: Mock;
	authWithPassword: Mock;
	authRefresh: Mock;
	authWithOAuth2: Mock;
	requestPasswordReset: Mock;
	confirmPasswordReset: Mock;
	// Service-specific methods
	getOneSongs: Mock;
	updateSong: Mock;
	// Song-specific methods
	getFullListUsageInfo: Mock;

	constructor(
		private collectionName: string,
		private pb: MockPocketBase
	) {
		// Initialize mocks with names for better debugging
		this.getFullList = vi.fn().mockName(`${collectionName}.getFullList`).mockResolvedValue([]);
		this.getList = vi
			.fn()
			.mockName(`${collectionName}.getList`)
			.mockResolvedValue({ items: [], totalItems: 0, totalPages: 0, page: 1, perPage: 30 });
		this.getOne = vi.fn().mockName(`${collectionName}.getOne`).mockResolvedValue({});
		this.getFirstListItem = vi
			.fn()
			.mockName(`${collectionName}.getFirstListItem`)
			.mockResolvedValue({});
		this.create = vi.fn().mockName(`${collectionName}.create`).mockResolvedValue({});
		this.update = vi.fn().mockName(`${collectionName}.update`).mockResolvedValue({});
		this.delete = vi.fn().mockName(`${collectionName}.delete`).mockResolvedValue(true);
		this.getFileUrl = vi
			.fn((recordId: string, filename: string, options?: any) => {
				const base = 'http://localhost:8090';
				return `${base}/api/files/${this.collectionName}/${recordId}/${filename}`;
			})
			.mockName(`${collectionName}.getFileUrl`);
		this.subscribe = vi
			.fn()
			.mockName(`${collectionName}.subscribe`)
			.mockResolvedValue(() => {});
		this.unsubscribe = vi.fn().mockName(`${collectionName}.unsubscribe`).mockResolvedValue(true);

		// Auth methods
		this.authWithPassword = vi
			.fn()
			.mockName(`${collectionName}.authWithPassword`)
			.mockResolvedValue({ record: {}, token: 'mock-token' });
		this.authRefresh = vi
			.fn()
			.mockName(`${collectionName}.authRefresh`)
			.mockResolvedValue({ record: {}, token: 'mock-token' });
		this.authWithOAuth2 = vi
			.fn()
			.mockName(`${collectionName}.authWithOAuth2`)
			.mockResolvedValue({ record: {}, token: 'mock-token', meta: {} });
		this.requestPasswordReset = vi
			.fn()
			.mockName(`${collectionName}.requestPasswordReset`)
			.mockResolvedValue({});
		this.confirmPasswordReset = vi
			.fn()
			.mockName(`${collectionName}.confirmPasswordReset`)
			.mockResolvedValue({});

		// Service-specific methods
		this.getOneSongs = vi
			.fn()
			.mockName(`${collectionName}.getOneSongs`)
			.mockResolvedValue([]);
		this.updateSong = vi
			.fn()
			.mockName(`${collectionName}.updateSong`)
			.mockResolvedValue({});
		
		// Song-specific methods
		this.getFullListUsageInfo = vi
			.fn()
			.mockName(`${collectionName}.getFullListUsageInfo`)
			.mockResolvedValue([]);
	}

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

	mockGetFirstListItem(record: MockRecord) {
		this.getFirstListItem.mockResolvedValue(record);
		return this;
	}

	mockSubscribe(callback?: (data: any) => void) {
		const unsubscribe = vi.fn();
		this.subscribe.mockImplementation((topic: string, handler: (data: any) => void) => {
			if (callback) {
				// Allow tests to trigger subscription events
				(this.subscribe as any).trigger = (data: any) => handler(data);
			}
			return Promise.resolve(unsubscribe);
		});
		return this;
	}

	mockError(error: any) {
		this.getFullList.mockRejectedValue(error);
		this.getList.mockRejectedValue(error);
		this.getOne.mockRejectedValue(error);
		this.getFirstListItem.mockRejectedValue(error);
		this.create.mockRejectedValue(error);
		this.update.mockRejectedValue(error);
		this.delete.mockRejectedValue(error);
		this.authWithPassword.mockRejectedValue(error);
		this.authRefresh.mockRejectedValue(error);
		this.authWithOAuth2.mockRejectedValue(error);
		this.requestPasswordReset.mockRejectedValue(error);
		this.confirmPasswordReset.mockRejectedValue(error);
		return this;
	}
}

// Mock the PocketBase module
vi.mock('pocketbase', () => ({
	default: vi.fn((url?: string) => {
		// Return a new instance each time PocketBase is instantiated
		return new MockPocketBase();
	})
}));

// Create a temporary global instance for tests that haven't been migrated yet
// This will be removed once all files are updated
export const mockPb = new MockPocketBase();

// Mock the client module - temporary for migration
vi.mock('$lib/api/client', () => ({
	pb: mockPb
}));

// PocketBase error structure
export interface PocketBaseError {
	url: string;
	status: number;
	response: {
		code: number;
		message: string;
		data?: Record<string, any>;
	};
	isAbort: boolean;
	originalError: any;
}

// Helper to create PocketBase-like errors
export function createPbError(
	status: number,
	message: string,
	data?: Record<string, any>
): PocketBaseError {
	return {
		url: 'http://localhost:8090/api/collections/test',
		status,
		response: {
			code: status,
			message,
			data: data || {}
		},
		isAbort: false,
		originalError: new Error(message)
	};
}

// Common error scenarios
export const pbErrors = {
	notFound: () => createPbError(404, "The requested resource wasn't found."),
	unauthorized: () => createPbError(401, 'The request requires valid authentication.'),
	forbidden: () => createPbError(403, 'You are not allowed to perform this request.'),
	badRequest: (message = 'Invalid request data.') => createPbError(400, message),
	validation: (fieldErrors: Record<string, { code: string; message: string }>) =>
		createPbError(400, 'Failed to validate the submitted data.', fieldErrors),
	serverError: () => createPbError(500, 'Something went wrong while processing your request.')
};

// Helper class for fluent mock setup
export class MockSetup {
	constructor(private pb: MockPocketBase) {}

	collection(name: string): MockCollectionSetup {
		const service = this.pb.collection(name);
		return new MockCollectionSetup(service);
	}

	withAuth(user: any, token = 'mock-token'): this {
		this.pb.setAuthState(user, token);
		return this;
	}
}

// Helper for collection-specific setup
export class MockCollectionSetup {
	constructor(private service: MockRecordService) {}

	returnsMany(records: MockRecord[]): this {
		this.service.mockGetFullList(records);
		this.service.mockGetList(records);
		return this;
	}

	returnsOne(record: MockRecord): this {
		this.service.mockGetOne(record);
		this.service.mockGetFirstListItem(record);
		return this;
	}

	fails(error: any = pbErrors.serverError()): this {
		this.service.mockError(error);
		return this;
	}

	onCreate(record: MockRecord): this {
		this.service.mockCreate(record);
		return this;
	}

	onUpdate(record: MockRecord): this {
		this.service.mockUpdate(record);
		return this;
	}
}

// Export setup helper
export function setupMockPb(): MockSetup {
	return new MockSetup(mockPb);
}
