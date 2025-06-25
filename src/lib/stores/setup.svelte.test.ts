import { describe, it, expect, beforeEach, vi, type MockedFunction } from 'vitest';
import { createSetupStore, type SetupStore } from './setup.svelte';
import { ChurchesAPI } from '$lib/api/churches';

// Mock the ChurchesAPI
vi.mock('$lib/api/churches', () => ({
	ChurchesAPI: {
		hasChurches: vi.fn()
	}
}));

const mockedChurchesAPI = ChurchesAPI as unknown as {
	hasChurches: MockedFunction<any>;
};

describe('SetupStore', () => {
	let setupStore: SetupStore;

	beforeEach(() => {
		// Create fresh store instance for each test
		setupStore = createSetupStore();

		// Reset all mocks
		vi.clearAllMocks();
	});

	describe('checkSetupRequired', () => {
		it('should return true when no churches exist (setup required)', async () => {
			mockedChurchesAPI.hasChurches.mockResolvedValue(false);

			const result = await setupStore.checkSetupRequired();

			expect(result).toBe(true);
			expect(setupStore.setupRequired).toBe(true);
			expect(setupStore.loading).toBe(false);
			expect(setupStore.error).toBe(null);
			expect(mockedChurchesAPI.hasChurches).toHaveBeenCalled();
		});

		it('should return false when churches exist (setup not required)', async () => {
			mockedChurchesAPI.hasChurches.mockResolvedValue(true);

			const result = await setupStore.checkSetupRequired();

			expect(result).toBe(false);
			expect(setupStore.setupRequired).toBe(false);
			expect(setupStore.loading).toBe(false);
			expect(setupStore.error).toBe(null);
		});

		it('should handle loading state correctly', async () => {
			mockedChurchesAPI.hasChurches.mockImplementation(async () => {
				expect(setupStore.loading).toBe(true);
				return true;
			});

			await setupStore.checkSetupRequired();

			expect(setupStore.loading).toBe(false);
		});

		it('should handle errors with Error objects', async () => {
			const error = new Error('Network connection failed');
			mockedChurchesAPI.hasChurches.mockRejectedValue(error);

			const result = await setupStore.checkSetupRequired();

			expect(result).toBe(false);
			expect(setupStore.setupRequired).toBe(false); // Assumes setup not required on error
			expect(setupStore.loading).toBe(false);
			expect(setupStore.error).toBe('Network connection failed');
		});

		it('should handle errors without message property', async () => {
			const error = { someProperty: 'value' }; // Error without message
			mockedChurchesAPI.hasChurches.mockRejectedValue(error);

			const result = await setupStore.checkSetupRequired();

			expect(result).toBe(false);
			expect(setupStore.setupRequired).toBe(false);
			expect(setupStore.loading).toBe(false);
			expect(setupStore.error).toBe('Failed to check setup status');
		});

		it('should handle string errors', async () => {
			mockedChurchesAPI.hasChurches.mockRejectedValue('String error');

			const result = await setupStore.checkSetupRequired();

			expect(result).toBe(false);
			expect(setupStore.setupRequired).toBe(false);
			expect(setupStore.error).toBe('Failed to check setup status');
		});

		it('should clear previous error state on new check', async () => {
			// Set initial error state
			setupStore.error = 'Previous error';

			mockedChurchesAPI.hasChurches.mockResolvedValue(true);

			await setupStore.checkSetupRequired();

			expect(setupStore.error).toBe(null);
		});
	});

	describe('markSetupCompleted', () => {
		it('should mark setup as completed', () => {
			// Start with setup required
			setupStore.setupRequired = true;

			setupStore.markSetupCompleted();

			expect(setupStore.setupRequired).toBe(false);
		});

		it('should work when setup was already not required', () => {
			setupStore.setupRequired = false;

			setupStore.markSetupCompleted();

			expect(setupStore.setupRequired).toBe(false);
		});

		it('should work when setup state was null', () => {
			setupStore.setupRequired = null;

			setupStore.markSetupCompleted();

			expect(setupStore.setupRequired).toBe(false);
		});
	});

	describe('clearError', () => {
		it('should clear error state', () => {
			setupStore.error = 'Some error message';

			setupStore.clearError();

			expect(setupStore.error).toBe(null);
		});

		it('should work when error is already null', () => {
			setupStore.error = null;

			setupStore.clearError();

			expect(setupStore.error).toBe(null);
		});
	});

	describe('initial state', () => {
		it('should have correct initial state', () => {
			const store = setupStore;

			expect(store.setupRequired).toBe(null);
			expect(store.loading).toBe(false);
			expect(store.error).toBe(null);
		});
	});

	describe('error recovery', () => {
		it('should recover from error state on successful check', async () => {
			// Set error state
			setupStore.error = 'Previous error';
			setupStore.setupRequired = false;

			mockedChurchesAPI.hasChurches.mockResolvedValue(false);

			const result = await setupStore.checkSetupRequired();

			expect(result).toBe(true);
			expect(setupStore.setupRequired).toBe(true);
			expect(setupStore.error).toBe(null);
		});

		it('should maintain error state after failed check', async () => {
			const error = new Error('Persistent error');
			mockedChurchesAPI.hasChurches.mockRejectedValue(error);

			await setupStore.checkSetupRequired();

			expect(setupStore.error).toBe('Persistent error');
			expect(setupStore.setupRequired).toBe(false);
		});
	});

	describe('loading state transitions', () => {
		it('should set loading to false after successful operation', async () => {
			mockedChurchesAPI.hasChurches.mockResolvedValue(true);

			await setupStore.checkSetupRequired();

			expect(setupStore.loading).toBe(false);
		});

		it('should set loading to false after failed operation', async () => {
			const error = new Error('Test error');
			mockedChurchesAPI.hasChurches.mockRejectedValue(error);

			await setupStore.checkSetupRequired();

			expect(setupStore.loading).toBe(false);
		});

		it('should not interfere with other store properties during loading', async () => {
			// Set some initial state
			setupStore.setupRequired = true;
			setupStore.error = 'Old error';

			mockedChurchesAPI.hasChurches.mockImplementation(async () => {
				// During the async operation, loading should be true
				expect(setupStore.loading).toBe(true);
				// Error should be cleared
				expect(setupStore.error).toBe(null);
				return false;
			});

			await setupStore.checkSetupRequired();

			expect(setupStore.loading).toBe(false);
			expect(setupStore.setupRequired).toBe(true);
			expect(setupStore.error).toBe(null);
		});
	});
});
