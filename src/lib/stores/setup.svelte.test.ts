import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createSetupStore, type SetupStore } from './setup.svelte';
import { MockPocketBase } from '$tests/helpers/pb-mock';

// Mock pb from client
vi.mock('$lib/api/client', async () => {
	// Use dynamic import instead of require for vitest compatibility
	const { MockPocketBase } = await import('$tests/helpers/pb-mock');
	return {
		pb: new MockPocketBase()
	};
});

// Mock churches API
vi.mock('$lib/api/churches', () => {
	const mockAPI = {
		hasChurches: vi.fn().mockResolvedValue(false),
		initialSetup: vi.fn().mockResolvedValue({})
	};
	return {
		createChurchesAPI: vi.fn(() => mockAPI)
	};
});

describe('SetupStore', () => {
	let setupStore: SetupStore;
	let mockPb: MockPocketBase;
	let mockChurchesAPI: any;

	beforeEach(async () => {
		// Create fresh mock instance
		mockPb = new MockPocketBase();
		
		// Mock the pb import to return our fresh instance
		vi.doMock('$lib/api/client', () => ({
			pb: mockPb
		}));
		
		// Create fresh store instance for each test
		setupStore = createSetupStore();

		// Get access to the mocked API
		const { createChurchesAPI } = await import('$lib/api/churches');
		mockChurchesAPI = createChurchesAPI(mockPb);

		// Reset all mocks
		vi.clearAllMocks();
	});

	describe('checkSetupRequired', () => {
		it('should return true when no churches exist (setup required)', async () => {
			// Mock setup_status collection to not find any churches
			const notFoundError: any = new Error('Not found');
			notFoundError.status = 404;
			mockPb.collection('setup_status').getFirstListItem.mockRejectedValue(notFoundError);
			mockPb.collection('churches').getList.mockRejectedValue(notFoundError);

			const result = await setupStore.checkSetupRequired();

			expect(result).toBe(true);
			expect(setupStore.setupRequired).toBe(true);
			expect(setupStore.loading).toBe(false);
			expect(setupStore.error).toBe(null);
			expect(mockPb.collection).toHaveBeenCalledWith('setup_status');
		});

		it('should return false when churches exist (setup not required)', async () => {
			// Mock the churches API to return true (churches exist)
			mockChurchesAPI.hasChurches.mockResolvedValue(true);

			const result = await setupStore.checkSetupRequired();

			expect(result).toBe(false);
			expect(setupStore.setupRequired).toBe(false);
			expect(setupStore.loading).toBe(false);
			expect(setupStore.error).toBe(null);
		});

		it('should handle loading state correctly', async () => {
			mockPb.collection('setup_status').getFirstListItem.mockImplementation(async () => {
				expect(setupStore.loading).toBe(true);
				return { setup_required: false };
			});

			await setupStore.checkSetupRequired();

			expect(setupStore.loading).toBe(false);
		});

		it('should handle errors with Error objects', async () => {
			const error = new Error('Network connection failed');
			mockChurchesAPI.hasChurches.mockRejectedValue(error);

			const result = await setupStore.checkSetupRequired();

			expect(result).toBe(false);
			expect(setupStore.setupRequired).toBe(false); // Assumes setup not required on error
			expect(setupStore.loading).toBe(false);
			expect(setupStore.error).toBe('Network connection failed');
		});

		it('should handle errors without message property', async () => {
			const error = { someProperty: 'value' }; // Error without message
			mockChurchesAPI.hasChurches.mockRejectedValue(error);

			const result = await setupStore.checkSetupRequired();

			expect(result).toBe(false);
			expect(setupStore.error).toBe('Failed to check setup status');
		});

		it('should handle string errors', async () => {
			mockChurchesAPI.hasChurches.mockRejectedValue('Network error');

			const result = await setupStore.checkSetupRequired();

			expect(result).toBe(false);
			expect(setupStore.error).toBe('Failed to check setup status');
		});

		it('should maintain setupRequired state if already set to true', async () => {
			// First call sets it to true (no churches exist)
			mockChurchesAPI.hasChurches.mockResolvedValue(false);
			await setupStore.checkSetupRequired();
			expect(setupStore.setupRequired).toBe(true);

			// Second call finds churches exist (setup not required)
			mockChurchesAPI.hasChurches.mockResolvedValue(true);
			await setupStore.checkSetupRequired();
			expect(setupStore.setupRequired).toBe(false);
		});
	});

	describe('markSetupCompleted', () => {
		it('should set setupRequired to false', () => {
			// Set initial state
			setupStore.setupRequired = true;

			// Mark completed
			setupStore.markSetupCompleted();

			expect(setupStore.setupRequired).toBe(false);
		});

		it('should remain false if already false', () => {
			// Set initial state
			setupStore.setupRequired = false;

			// Mark completed
			setupStore.markSetupCompleted();

			expect(setupStore.setupRequired).toBe(false);
		});
	});

	describe('clearError', () => {
		it('should clear error state', () => {
			// Set initial error
			setupStore.error = 'Test error message';

			// Clear error
			setupStore.clearError();

			expect(setupStore.error).toBe(null);
		});

		it('should work when error is already null', () => {
			// Initial state
			setupStore.error = null;

			// Clear error
			setupStore.clearError();

			expect(setupStore.error).toBe(null);
		});
	});
});