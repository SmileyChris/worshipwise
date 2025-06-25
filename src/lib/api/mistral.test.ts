import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createMistralClient, isValidMistralAPIKey } from './mistral';

describe('Mistral API Client', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		// Mock global fetch
		vi.stubGlobal('fetch', vi.fn());
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	describe('isValidMistralAPIKey', () => {
		it('should validate API key format', () => {
			expect(isValidMistralAPIKey('sk-123456789012345678901234567890')).toBe(true);
			expect(isValidMistralAPIKey('short')).toBe(false);
			expect(isValidMistralAPIKey('')).toBe(false);
			expect(isValidMistralAPIKey('   ')).toBe(false);
		});
	});

	describe('MistralClient', () => {
		it('should create client with API key', () => {
			const client = createMistralClient('test-api-key');
			expect(client).toBeDefined();
		});

		it('should throw error when no API key provided', async () => {
			const client = createMistralClient('');

			await expect(
				client.analyzeLyrics('Test Song', 'Test Artist', 'Amazing grace how sweet the sound')
			).rejects.toThrow('Mistral API key is required');
		});

		it('should throw error when no lyrics provided', async () => {
			const client = createMistralClient('test-api-key');

			await expect(client.analyzeLyrics('Test Song', 'Test Artist', '')).rejects.toThrow(
				'Lyrics content is required for analysis'
			);
		});

		it('should successfully analyze lyrics with valid response', async () => {
			const mockResponse = {
				choices: [
					{
						message: {
							content: JSON.stringify({
								title: 'Amazing Grace',
								artist: 'John Newton',
								themes: ['grace', 'redemption'],
								biblical_references: ['Ephesians 2:8'],
								worship_elements: ['testimony'],
								emotional_tone: 'Reverent',
								service_placement: 'Communion',
								seasonal_appropriateness: ['General'],
								complexity_level: 'Simple',
								summary: 'Classic hymn about grace',
								analyzed_at: '2024-01-01T00:00:00.000Z',
								confidence_score: 0.9
							})
						}
					}
				]
			};

			(globalThis.fetch as any).mockResolvedValueOnce({
				ok: true,
				json: async () => mockResponse
			});

			const client = createMistralClient('test-api-key');
			const result = await client.analyzeLyrics(
				'Amazing Grace',
				'John Newton',
				'Amazing grace how sweet the sound'
			);

			expect(result.title).toBe('Amazing Grace');
			expect(result.themes).toContain('grace');
			expect(result.complexity_level).toBe('Simple');
		});

		it('should handle API errors gracefully', async () => {
			(globalThis.fetch as any).mockResolvedValueOnce({
				ok: false,
				status: 401,
				json: async () => ({
					error: {
						message: 'Invalid API key',
						type: 'authentication_error'
					}
				})
			});

			const client = createMistralClient('invalid-key');

			await expect(client.analyzeLyrics('Test Song', undefined, 'test lyrics')).rejects.toThrow(
				'Mistral API error (401): Invalid API key'
			);
		});

		it('should handle network errors', async () => {
			(globalThis.fetch as any).mockRejectedValueOnce(new Error('Network error'));

			const client = createMistralClient('test-api-key');

			await expect(client.analyzeLyrics('Test Song', undefined, 'test lyrics')).rejects.toThrow(
				'Network error'
			);
		});
	});
});
