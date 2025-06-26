import type PocketBase from 'pocketbase';
import { env } from '$env/dynamic/public';
import type { Church } from '$lib/types/church';

/**
 * Get the Mistral API key for a specific church
 * Priority order:
 * 1. Church-specific API key (from database)
 * 2. Global environment variable
 *
 * @param pb - PocketBase instance
 * @param churchId - The ID of the church to get the API key for
 * @returns The API key if available, null otherwise
 */
export async function getMistralApiKey(
	pb: PocketBase,
	churchId: string | undefined
): Promise<string | null> {
	// If no church ID provided, use global key only
	if (!churchId) {
		return env.PUBLIC_MISTRAL_API_KEY || null;
	}

	try {
		// Fetch church settings
		const church = await pb
			.collection('churches')
			.getOne<Church & { mistral_api_key?: string }>(churchId);

		// Return church-specific key if available, otherwise global key
		return church.mistral_api_key || env.PUBLIC_MISTRAL_API_KEY || null;
	} catch (error) {
		console.error('Failed to fetch church settings:', error);
		// Fall back to global key if church fetch fails
		return env.PUBLIC_MISTRAL_API_KEY || null;
	}
}

/**
 * Check if AI features are available for a church
 * @param pb - PocketBase instance
 * @param churchId - The ID of the church to check
 * @returns True if AI features can be used
 */
export async function hasAIFeaturesEnabled(
	pb: PocketBase,
	churchId: string | undefined
): Promise<boolean> {
	const apiKey = await getMistralApiKey(pb, churchId);
	return !!apiKey && apiKey.trim().length > 0;
}

/**
 * Create a Mistral client for a specific church
 * @param pb - PocketBase instance
 * @param churchId - The ID of the church
 * @returns MistralClient instance or null if no API key available
 */
export async function createChurchMistralClient(pb: PocketBase, churchId: string | undefined) {
	const apiKey = await getMistralApiKey(pb, churchId);
	if (!apiKey) {
		return null;
	}

	// Import dynamically to avoid circular dependencies
	const { createMistralClient } = await import('./mistral');
	return createMistralClient(apiKey);
}
