import type PocketBase from 'pocketbase';
import type { AuthContext } from '$lib/types/auth';
import type { Church, ChurchSettings } from '$lib/types/church';

export interface ChurchWithSettings extends Church {
	mistral_api_key?: string;
	elvanto_api_key?: string;
	last_elvanto_sync?: string;
}

export interface ElvantoImportResult {
	importedServices: number;
	importedSongs: number;
	importedLeaders: number;
}

export interface MistralTestResult {
	success: boolean;
	error?: string;
}

export class ChurchSettingsAPI {
	private pb: PocketBase;
	private authContext: AuthContext;

	constructor(authContext: AuthContext, pb: PocketBase) {
		this.authContext = authContext;
		this.pb = pb;
	}

	/**
	 * Get the current church with its settings
	 */
	async getChurchSettings(): Promise<ChurchWithSettings> {
		if (!this.authContext.currentChurch?.id) {
			throw new Error('No church selected');
		}

		return await this.pb
			.collection('churches')
			.getOne<ChurchWithSettings>(this.authContext.currentChurch.id);
	}

	/**
	 * Update church settings
	 */
	async updateSettings(data: Partial<ChurchWithSettings>): Promise<ChurchWithSettings> {
		if (!this.authContext.currentChurch?.id) {
			throw new Error('No church selected');
		}

		return await this.pb
			.collection('churches')
			.update<ChurchWithSettings>(this.authContext.currentChurch.id, data);
	}

	/**
	 * Update Mistral API key
	 */
	async setMistralApiKey(key: string | null): Promise<ChurchWithSettings> {
		return this.updateSettings({ mistral_api_key: key || undefined });
	}

	/**
	 * Update Elvanto API key
	 */
	async setElvantoApiKey(key: string): Promise<ChurchWithSettings> {
		return this.updateSettings({ elvanto_api_key: key });
	}

	/**
	 * Test Mistral API key
	 */
	async testMistralApiKey(key: string): Promise<MistralTestResult> {
		// We need to dynamically import the mistral client
		try {
			const { isValidMistralAPIKey, createMistralClient } = await import('$lib/api/mistral');

			// Basic format validation
			if (!isValidMistralAPIKey(key)) {
				return { success: false, error: 'Invalid API key format' };
			}

			// Test the connection
			const client = createMistralClient(key);
			const result = await client.testConnection();

			return {
				success: result.success,
				error: result.error
			};
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Failed to test API key'
			};
		}
	}

	/**
	 * Import data from Elvanto
	 */
	async importFromElvanto(): Promise<ElvantoImportResult> {
		if (!this.authContext.currentChurch?.id) {
			throw new Error('No church selected');
		}

		const data = await this.pb.send(`/api/elvanto/import/${this.authContext.currentChurch.id}`, {
			method: 'POST'
		});

		return {
			importedServices: data.importedServices,
			importedSongs: data.importedSongs,
			importedLeaders: data.importedLeaders
		};
	}

	/**
	 * Subscribe to church updates
	 */
	subscribeToChurchUpdates(callback: (data: unknown) => void) {
		if (!this.authContext.currentChurch?.id) {
			return () => {}; // Return empty unsubscribe function
		}

		return this.pb
			.collection('churches')
			.subscribe(this.authContext.currentChurch.id, callback);
	}
}

// Factory function for creating ChurchSettingsAPI instances
export function createChurchSettingsAPI(
	authContext: AuthContext,
	pb: PocketBase
): ChurchSettingsAPI {
	return new ChurchSettingsAPI(authContext, pb);
}
