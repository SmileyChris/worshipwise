import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createLyricsSearchClient, validateLyricsContent } from './lyrics';


describe('Lyrics Search Client', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('validateLyricsContent', () => {
		it('should validate meaningful lyrics', () => {
			const validLyrics = `Amazing grace how sweet the sound
That saved a wretch like me
I once was lost but now am found
Was blind but now I see`;

			expect(validateLyricsContent(validLyrics)).toBe(true);
		});

		it('should reject short content', () => {
			expect(validateLyricsContent('short')).toBe(false);
			expect(validateLyricsContent('')).toBe(false);
		});

		it('should reject content with too few lines', () => {
			const shortContent = 'Line 1\nLine 2\nLine 3';
			expect(validateLyricsContent(shortContent)).toBe(false);
		});
	});

	describe('LyricsSearchClient', () => {
		it('should create search client', () => {
			const client = createLyricsSearchClient();
			expect(client).toBeDefined();
		});

		it('should handle search failures gracefully', async () => {
			// Mock all search engines to fail
			(globalThis.fetch as any).mockRejectedValue(new Error('Network error'));

			const client = createLyricsSearchClient();
			const result = await client.searchLyrics('Test Song', 'Test Artist');

			expect(result).toBeNull();
		});

		it('should return null when no lyrics found', async () => {
			// Mock empty responses
			(globalThis.fetch as any).mockResolvedValue({
				ok: true,
				json: async () => ({})
			});

			const client = createLyricsSearchClient();
			const result = await client.searchLyrics('Nonexistent Song');

			expect(result).toBeNull();
		});

		it('should extract lyrics from DuckDuckGo response', async () => {
			const mockResponse = {
				AbstractText: `Amazing grace how sweet the sound
That saved a wretch like me
I once was lost but now am found
Was blind but now I see
Twas grace that taught my heart to fear
And grace my fears relieved`,
				AbstractURL: 'https://example.com'
			};

			(globalThis.fetch as any).mockResolvedValue({
				ok: true,
				json: async () => mockResponse
			});

			const client = createLyricsSearchClient();
			const result = await client.searchLyrics('Amazing Grace');

			expect(result).not.toBeNull();
			expect(result?.lyrics).toContain('Amazing grace');
			expect(result?.source).toBe('DuckDuckGo');
		});
	});
});
