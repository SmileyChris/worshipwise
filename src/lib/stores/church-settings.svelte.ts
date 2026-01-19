import {
	createChurchSettingsAPI,
	type ChurchSettingsAPI,
	type ChurchWithSettings,
	type ElvantoImportResult,
	type MistralTestResult
} from '$lib/api/church-settings';
import type { AuthStore as RuntimeAuthStore } from '$lib/stores/auth.svelte';
import type { AuthContext } from '$lib/types/auth';

class ChurchSettingsStore {
	// Reactive state using Svelte 5 runes
	church = $state<ChurchWithSettings | null>(null);
	loading = $state<boolean>(false);
	saving = $state<boolean>(false);
	error = $state<string | null>(null);
	success = $state<string | null>(null);

	// API key state
	hasMistralKey = $state<boolean>(false);
	hasElvantoKey = $state<boolean>(false);
	testingApiKey = $state<boolean>(false);
	apiKeyValid = $state<boolean | null>(null);

	// Import state
	importing = $state<boolean>(false);
	importResult = $state<ElvantoImportResult | null>(null);

	// Track if initial load is complete
	private initialized = $state<boolean>(false);

	private settingsApi: ChurchSettingsAPI;

	// Support live auth store or static context
	private auth: RuntimeAuthStore | null = null;
	private staticContext: AuthContext | null = null;

	constructor(authInput: RuntimeAuthStore | AuthContext) {
		if (typeof (authInput as any).getAuthContext === 'function') {
			this.auth = authInput as RuntimeAuthStore;
		} else {
			this.staticContext = authInput as AuthContext;
		}

		// API reacts to auth changes
		this.settingsApi = $derived.by(() => {
			const ctx = this.getAuthContext();
			return createChurchSettingsAPI(ctx, ctx.pb);
		});
	}

	private getAuthContext(): AuthContext {
		return this.auth ? this.auth.getAuthContext() : (this.staticContext as AuthContext);
	}

	/**
	 * Load church settings
	 */
	async loadSettings(): Promise<void> {
		this.loading = true;
		this.error = null;

		try {
			this.church = await this.settingsApi.getChurchSettings();
			this.hasMistralKey = !!this.church.mistral_api_key;
			this.hasElvantoKey = !!this.church.elvanto_api_key;
			this.initialized = true;
		} catch (error) {
			console.error('Failed to load church settings:', error);
			this.error = this.getErrorMessage(error);
		} finally {
			this.loading = false;
		}
	}

	/**
	 * Load settings only if not already loaded
	 */
	async loadSettingsOnce(): Promise<void> {
		if (this.initialized) return;
		await this.loadSettings();
	}

	/**
	 * Update church settings
	 */
	async updateSettings(data: Partial<ChurchWithSettings>): Promise<void> {
		this.saving = true;
		this.error = null;
		this.success = null;

		try {
			this.church = await this.settingsApi.updateSettings(data);
			this.hasMistralKey = !!this.church.mistral_api_key;
			this.hasElvantoKey = !!this.church.elvanto_api_key;
			this.success = 'Settings saved successfully';
		} catch (error) {
			console.error('Failed to update settings:', error);
			this.error = this.getErrorMessage(error);
			throw error;
		} finally {
			this.saving = false;
		}
	}

	/**
	 * Set Mistral API key
	 */
	async setMistralApiKey(key: string | null): Promise<void> {
		this.saving = true;
		this.error = null;

		try {
			this.church = await this.settingsApi.setMistralApiKey(key);
			this.hasMistralKey = !!this.church.mistral_api_key;
			this.success = key ? 'Mistral API key saved' : 'Mistral API key removed';
		} catch (error) {
			console.error('Failed to set Mistral API key:', error);
			this.error = this.getErrorMessage(error);
			throw error;
		} finally {
			this.saving = false;
		}
	}

	/**
	 * Test Mistral API key
	 */
	async testMistralApiKey(key: string): Promise<MistralTestResult> {
		this.testingApiKey = true;
		this.apiKeyValid = null;
		this.error = null;

		try {
			const result = await this.settingsApi.testMistralApiKey(key);
			this.apiKeyValid = result.success;

			if (!result.success) {
				this.error = result.error || 'API key validation failed';
			}

			return result;
		} catch (error) {
			this.apiKeyValid = false;
			this.error = this.getErrorMessage(error);
			return { success: false, error: this.error };
		} finally {
			this.testingApiKey = false;
		}
	}

	/**
	 * Set Elvanto API key
	 */
	async setElvantoApiKey(key: string): Promise<void> {
		this.saving = true;
		this.error = null;

		try {
			this.church = await this.settingsApi.setElvantoApiKey(key);
			this.hasElvantoKey = true;
			this.success = 'Elvanto API key saved';
		} catch (error) {
			console.error('Failed to set Elvanto API key:', error);
			this.error = this.getErrorMessage(error);
			throw error;
		} finally {
			this.saving = false;
		}
	}

	/**
	 * Import data from Elvanto
	 */
	async importFromElvanto(): Promise<ElvantoImportResult | null> {
		this.importing = true;
		this.error = null;
		this.success = null;
		this.importResult = null;

		try {
			const result = await this.settingsApi.importFromElvanto();
			this.importResult = result;
			this.success = `Successfully imported ${result.importedServices} services, ${result.importedSongs} songs, and ${result.importedLeaders} leaders!`;

			// Reload settings to update last sync time
			await this.loadSettings();

			return result;
		} catch (error) {
			console.error('Failed to import from Elvanto:', error);
			this.error = this.getErrorMessage(error);
			return null;
		} finally {
			this.importing = false;
		}
	}

	/**
	 * Clear error state
	 */
	clearError(): void {
		this.error = null;
	}

	/**
	 * Clear success message
	 */
	clearSuccess(): void {
		this.success = null;
	}

	/**
	 * Clear API key validation state
	 */
	clearApiKeyValidation(): void {
		this.apiKeyValid = null;
	}

	/**
	 * Subscribe to real-time updates
	 */
	async subscribeToUpdates(): Promise<() => void> {
		const unsubChurch = await this.settingsApi.subscribeToChurchUpdates((data: unknown) => {
			const eventData = data as {
				action: string;
				record: ChurchWithSettings;
			};

			if (eventData.action === 'update') {
				this.church = eventData.record;
				this.hasMistralKey = !!this.church.mistral_api_key;
				this.hasElvantoKey = !!this.church.elvanto_api_key;
			}
		});

		return () => {
			if (typeof unsubChurch === 'function') {
				unsubChurch();
			}
		};
	}

	/**
	 * Get error message from API error
	 */
	private getErrorMessage(error: unknown): string {
		// Handle PocketBase ClientResponseError
		if (error && typeof error === 'object') {
			const pbError = error as { data?: { message?: string; error?: string }; message?: string };
			if (pbError.data?.message) {
				return pbError.data.message;
			}
			if (pbError.data?.error) {
				return pbError.data.error;
			}
			if (pbError.message) {
				return pbError.message;
			}
		}

		if (error instanceof Error) {
			return error.message;
		}
		return 'An unexpected error occurred';
	}
}

// Export the class type for tests
export type { ChurchSettingsStore };

// Factory function for creating new store instances
export function createChurchSettingsStore(
	auth: RuntimeAuthStore | AuthContext
): ChurchSettingsStore {
	return new ChurchSettingsStore(auth);
}
