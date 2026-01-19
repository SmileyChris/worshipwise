import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createChurchSettingsStore, type ChurchSettingsStore } from './church-settings.svelte';
import type { AuthContext } from '$lib/types/auth';
import type { ChurchWithSettings } from '$lib/api/church-settings';
import { mockPb } from '$tests/helpers/pb-mock';
import { mockAuthContext, mockChurch } from '$tests/helpers/mock-builders';

// Mock the mistral API module
vi.mock('$lib/api/mistral', () => ({
	isValidMistralAPIKey: vi.fn((key: string) => key.startsWith('sk-')),
	createMistralClient: vi.fn(() => ({
		testConnection: vi.fn().mockResolvedValue({ success: true })
	}))
}));

describe('ChurchSettingsStore', () => {
	let settingsStore: ChurchSettingsStore;
	let authContext: AuthContext;

	const mockChurchWithSettings = (overrides: Partial<ChurchWithSettings> = {}): ChurchWithSettings => {
		const church = mockChurch(overrides);
		return {
			...church,
			mistral_api_key: overrides.mistral_api_key,
			elvanto_api_key: overrides.elvanto_api_key,
			last_elvanto_sync: overrides.last_elvanto_sync
		};
	};

	beforeEach(() => {
		vi.clearAllMocks();
		mockPb.reset();

		authContext = mockAuthContext({
			church: { id: 'church-1', name: 'Test Church' },
			user: { id: 'user-1' },
			membership: { church_id: 'church-1' }
		});

		settingsStore = createChurchSettingsStore(authContext);
	});

	describe('loadSettings', () => {
		it('should load church settings successfully', async () => {
			const church = mockChurchWithSettings({ mistral_api_key: 'sk-test' });
			mockPb.collection('churches').getOne.mockResolvedValue(church);

			await settingsStore.loadSettings();

			expect(settingsStore.church).toEqual(church);
			expect(settingsStore.hasMistralKey).toBe(true);
			expect(settingsStore.loading).toBe(false);
			expect(settingsStore.error).toBe(null);
		});

		it('should handle loading state correctly', async () => {
			mockPb.collection('churches').getOne.mockImplementation(async () => {
				expect(settingsStore.loading).toBe(true);
				return mockChurchWithSettings();
			});

			await settingsStore.loadSettings();

			expect(settingsStore.loading).toBe(false);
		});

		it('should handle errors when loading settings', async () => {
			const error = new Error('Network error');
			mockPb.collection('churches').getOne.mockRejectedValue(error);

			await settingsStore.loadSettings();

			expect(settingsStore.church).toBe(null);
			expect(settingsStore.loading).toBe(false);
			expect(settingsStore.error).toBe('Network error');
		});

		it('should detect Elvanto key presence', async () => {
			const church = mockChurchWithSettings({ elvanto_api_key: 'elvanto-key' });
			mockPb.collection('churches').getOne.mockResolvedValue(church);

			await settingsStore.loadSettings();

			expect(settingsStore.hasElvantoKey).toBe(true);
		});
	});

	describe('loadSettingsOnce', () => {
		it('should only load settings once', async () => {
			const church = mockChurchWithSettings();
			mockPb.collection('churches').getOne.mockResolvedValue(church);

			await settingsStore.loadSettingsOnce();
			const callCountAfterFirst = mockPb.collection('churches').getOne.mock.calls.length;

			await settingsStore.loadSettingsOnce();
			const callCountAfterSecond = mockPb.collection('churches').getOne.mock.calls.length;

			expect(callCountAfterSecond).toBe(callCountAfterFirst);
		});
	});

	describe('updateSettings', () => {
		it('should update settings successfully', async () => {
			const updatedChurch = mockChurchWithSettings({ name: 'Updated Church' });
			mockPb.collection('churches').update.mockResolvedValue(updatedChurch);

			await settingsStore.updateSettings({ name: 'Updated Church' });

			expect(settingsStore.church).toEqual(updatedChurch);
			expect(settingsStore.success).toBe('Settings saved successfully');
			expect(settingsStore.saving).toBe(false);
		});

		it('should handle errors when updating settings', async () => {
			const error = new Error('Update failed');
			mockPb.collection('churches').update.mockRejectedValue(error);

			await expect(settingsStore.updateSettings({ name: 'Test' })).rejects.toThrow('Update failed');
			expect(settingsStore.error).toBe('Update failed');
		});
	});

	describe('setMistralApiKey', () => {
		it('should set Mistral API key successfully', async () => {
			const updatedChurch = mockChurchWithSettings({ mistral_api_key: 'sk-new-key' });
			mockPb.collection('churches').update.mockResolvedValue(updatedChurch);

			await settingsStore.setMistralApiKey('sk-new-key');

			expect(settingsStore.hasMistralKey).toBe(true);
			expect(settingsStore.success).toBe('Mistral API key saved');
		});

		it('should remove Mistral API key when null is passed', async () => {
			const updatedChurch = mockChurchWithSettings({ mistral_api_key: undefined });
			mockPb.collection('churches').update.mockResolvedValue(updatedChurch);

			await settingsStore.setMistralApiKey(null);

			expect(settingsStore.hasMistralKey).toBe(false);
			expect(settingsStore.success).toBe('Mistral API key removed');
		});
	});

	describe('testMistralApiKey', () => {
		it('should test valid API key successfully', async () => {
			const result = await settingsStore.testMistralApiKey('sk-valid-key');

			expect(result.success).toBe(true);
			expect(settingsStore.apiKeyValid).toBe(true);
			expect(settingsStore.testingApiKey).toBe(false);
		});

		it('should handle invalid API key format', async () => {
			const { isValidMistralAPIKey } = await import('$lib/api/mistral');
			(isValidMistralAPIKey as any).mockReturnValue(false);

			const result = await settingsStore.testMistralApiKey('invalid-key');

			expect(result.success).toBe(false);
			expect(settingsStore.apiKeyValid).toBe(false);
			expect(settingsStore.error).toBe('Invalid API key format');
		});

		it('should handle loading state during test', async () => {
			const { createMistralClient } = await import('$lib/api/mistral');
			(createMistralClient as any).mockReturnValue({
				testConnection: vi.fn().mockImplementation(async () => {
					expect(settingsStore.testingApiKey).toBe(true);
					return { success: true };
				})
			});

			await settingsStore.testMistralApiKey('sk-test');

			expect(settingsStore.testingApiKey).toBe(false);
		});
	});

	describe('setElvantoApiKey', () => {
		it('should set Elvanto API key successfully', async () => {
			const updatedChurch = mockChurchWithSettings({ elvanto_api_key: 'elvanto-key' });
			mockPb.collection('churches').update.mockResolvedValue(updatedChurch);

			await settingsStore.setElvantoApiKey('elvanto-key');

			expect(settingsStore.hasElvantoKey).toBe(true);
			expect(settingsStore.success).toBe('Elvanto API key saved');
		});
	});

	describe('importFromElvanto', () => {
		it('should import from Elvanto successfully', async () => {
			const church = mockChurchWithSettings();
			mockPb.collection('churches').getOne.mockResolvedValue(church);

			// Create a mock pb with send method
			const mockPbWithSend = {
				...mockPb,
				send: vi.fn().mockResolvedValue({
					importedServices: 10,
					importedSongs: 50,
					importedLeaders: 5
				}),
				collection: mockPb.collection
			};

			authContext = {
				...authContext,
				pb: mockPbWithSend
			};
			settingsStore = createChurchSettingsStore(authContext);

			const result = await settingsStore.importFromElvanto();

			expect(result).toEqual({
				importedServices: 10,
				importedSongs: 50,
				importedLeaders: 5
			});
			expect(settingsStore.importResult).toEqual(result);
			expect(settingsStore.success).toContain('Successfully imported');
			expect(settingsStore.importing).toBe(false);
		});

		it('should handle import errors', async () => {
			// Create a mock pb with send method that rejects
			const mockPbWithSend = {
				...mockPb,
				send: vi.fn().mockRejectedValue(new Error('Import failed')),
				collection: mockPb.collection
			};

			authContext = {
				...authContext,
				pb: mockPbWithSend
			};
			settingsStore = createChurchSettingsStore(authContext);

			const result = await settingsStore.importFromElvanto();

			expect(result).toBe(null);
			expect(settingsStore.error).toBe('Import failed');
		});
	});

	describe('clearError', () => {
		it('should clear error state', () => {
			settingsStore.error = 'Test error';

			settingsStore.clearError();

			expect(settingsStore.error).toBe(null);
		});
	});

	describe('clearSuccess', () => {
		it('should clear success message', () => {
			settingsStore.success = 'Test success';

			settingsStore.clearSuccess();

			expect(settingsStore.success).toBe(null);
		});
	});

	describe('clearApiKeyValidation', () => {
		it('should clear API key validation state', () => {
			settingsStore.apiKeyValid = true;

			settingsStore.clearApiKeyValidation();

			expect(settingsStore.apiKeyValid).toBe(null);
		});
	});

	describe('real-time subscriptions', () => {
		it('should subscribe to church updates and handle update events', async () => {
			const updatedChurch = mockChurchWithSettings({
				name: 'Updated Church',
				mistral_api_key: 'sk-new'
			});

			let eventHandler: (data: unknown) => void;
			mockPb.collection('churches').subscribe.mockImplementation(
				async (id: string, handler: (data: unknown) => void) => {
					eventHandler = handler;
					return vi.fn();
				}
			);

			await settingsStore.subscribeToUpdates();

			// Trigger update event
			eventHandler!({ action: 'update', record: updatedChurch });

			expect(settingsStore.church).toEqual(updatedChurch);
			expect(settingsStore.hasMistralKey).toBe(true);
		});
	});

	describe('error message extraction', () => {
		it('should extract message from PocketBase error data.message', async () => {
			const pbError = {
				data: { message: 'PocketBase data message' }
			};
			mockPb.collection('churches').getOne.mockRejectedValue(pbError);

			await settingsStore.loadSettings();

			expect(settingsStore.error).toBe('PocketBase data message');
		});

		it('should extract error from PocketBase error data.error', async () => {
			const pbError = {
				data: { error: 'PocketBase data error' }
			};
			mockPb.collection('churches').getOne.mockRejectedValue(pbError);

			await settingsStore.loadSettings();

			expect(settingsStore.error).toBe('PocketBase data error');
		});

		it('should fall back to error.message property', async () => {
			const pbError = {
				message: 'Top-level error message'
			};
			mockPb.collection('churches').getOne.mockRejectedValue(pbError);

			await settingsStore.loadSettings();

			expect(settingsStore.error).toBe('Top-level error message');
		});

		it('should handle unknown error types', async () => {
			mockPb.collection('churches').getOne.mockRejectedValue('String error');

			await settingsStore.loadSettings();

			expect(settingsStore.error).toBe('An unexpected error occurred');
		});
	});
});
