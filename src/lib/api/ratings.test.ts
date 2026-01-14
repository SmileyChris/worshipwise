import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createRatingsAPI, resetCaches } from './ratings';
import type { AuthContext } from '$lib/types/auth';
import type { SongRating, AggregateRatings } from '$lib/types/song';

// Mock PocketBase
const mockPb = {
	collection: vi.fn(() => mockPb),
	getFullList: vi.fn(),
	getFirstListItem: vi.fn(),
	getList: vi.fn(),
	create: vi.fn(),
	update: vi.fn(),
	delete: vi.fn(),
	subscribe: vi.fn()
};

// Mock auth context
const mockAuthContext: AuthContext = {
	pb: mockPb as any,
	isAuthenticated: true,
	user: { id: 'user-1', email: 'test@example.com', name: 'Test User' } as any,
	currentChurch: { id: 'church-1', name: 'Test Church' } as any,
	currentMembership: { id: 'membership-1', church_id: 'church-1', user_id: 'user-1', status: 'active' } as any,
	token: 'test-token',
	isValid: true,
	permissions: new Set(['manage-songs', 'manage-services'])
};

describe('RatingsAPI', () => {
	let ratingsAPI: ReturnType<typeof createRatingsAPI>;

	beforeEach(() => {
		vi.clearAllMocks();
		resetCaches();
		ratingsAPI = createRatingsAPI(mockAuthContext, mockPb as any);
	});

	describe('getUserRating', () => {
		it('should return user rating for a song', async () => {
			const mockRating: SongRating = {
				id: 'rating-1',
				song_id: 'song-1',
				user_id: 'user-1',
				church_id: 'church-1',
				rating: 'thumbs_up',
				is_difficult: false,
				created: '2024-01-01',
				updated: '2024-01-01'
			};

			mockPb.getFirstListItem.mockResolvedValue(mockRating);

			const result = await ratingsAPI.getUserRating('song-1');

			expect(mockPb.collection).toHaveBeenCalledWith('song_ratings');
			expect(mockPb.getFirstListItem).toHaveBeenCalledWith(
				'song_id = "song-1" && user_id = "user-1" && church_id = "church-1"'
			);
			expect(result).toEqual(mockRating);
		});

		it('should return null when no rating exists', async () => {
			mockPb.getFirstListItem.mockRejectedValue({ status: 404 });

			const result = await ratingsAPI.getUserRating('song-1');

			expect(result).toBeNull();
		});
	});

	describe('getAggregateRatings', () => {
		it('should calculate aggregate ratings correctly', async () => {
			const mockRatings = [
				{ rating: 'thumbs_up', is_difficult: false },
				{ rating: 'thumbs_up', is_difficult: true },
				{ rating: 'thumbs_down', is_difficult: false },
				{ rating: 'neutral', is_difficult: false }
			];

			mockPb.getFullList.mockResolvedValue(mockRatings);

			const result = await ratingsAPI.getAggregateRatings('song-1');

			expect(result).toEqual({
				thumbsUp: 2,
				neutral: 1,
				thumbsDown: 1,
				totalRatings: 4,
				difficultCount: 1
			});
		});
	});

	describe('setRating', () => {
		it('should create new rating when none exists', async () => {
			mockPb.getFirstListItem.mockRejectedValue({ status: 404 });
			mockPb.create.mockResolvedValue({ id: 'new-rating' });

			await ratingsAPI.setRating('song-1', {
				song_id: 'song-1',
				rating: 'thumbs_up',
				is_difficult: false
			});

			expect(mockPb.create).toHaveBeenCalledWith({
				song_id: 'song-1',
				user_id: 'user-1',
				church_id: 'church-1',
				rating: 'thumbs_up',
				is_difficult: false
			});
		});

		it('should update existing rating', async () => {
			const existingRating = { id: 'rating-1' };
			mockPb.getFirstListItem.mockResolvedValue(existingRating);
			mockPb.update.mockResolvedValue({ id: 'rating-1' });

			await ratingsAPI.setRating('song-1', {
				song_id: 'song-1',
				rating: 'thumbs_down',
				is_difficult: true
			});

			expect(mockPb.update).toHaveBeenCalledWith('rating-1', {
				rating: 'thumbs_down',
				is_difficult: true
			});
		});
	});

	describe('shouldAutoRetire', () => {
		it('should return false when no leaders have rated', async () => {
			// Mock leader memberships
			mockPb.getFullList
				.mockResolvedValueOnce([
					{ user_id: 'leader-1' },
					{ user_id: 'leader-2' },
					{ user_id: 'leader-3' }
				])
				.mockResolvedValueOnce([]); // No ratings

			const result = await ratingsAPI.shouldAutoRetire('song-1');

			expect(result).toBe(false);
		});

		it('should return false when any leader gives thumbs up', async () => {
			// Mock leader memberships
			mockPb.getFullList
				.mockResolvedValueOnce([
					{ user_id: 'leader-1' },
					{ user_id: 'leader-2' },
					{ user_id: 'leader-3' }
				])
				.mockResolvedValueOnce([
					{ rating: 'thumbs_down' },
					{ rating: 'thumbs_down' },
					{ rating: 'thumbs_up' }
				]);

			const result = await ratingsAPI.shouldAutoRetire('song-1');

			expect(result).toBe(false);
		});

		it('should return true when 75%+ of ALL leaders rate thumbs down with no thumbs up', async () => {
			// Mock 4 leader memberships
			mockPb.getFullList
				.mockResolvedValueOnce([
					{ user_id: 'leader-1' },
					{ user_id: 'leader-2' },
					{ user_id: 'leader-3' },
					{ user_id: 'leader-4' }
				])
				.mockResolvedValueOnce([
					{ rating: 'thumbs_down' },
					{ rating: 'thumbs_down' },
					{ rating: 'thumbs_down' }
					// Note: leader-4 hasn't rated
				]);

			const result = await ratingsAPI.shouldAutoRetire('song-1');

			expect(result).toBe(true); // 3 out of 4 leaders (75%) rated thumbs down
		});

		it('should return false when less than 75% of ALL leaders rate thumbs down', async () => {
			// Mock 4 leader memberships
			mockPb.getFullList
				.mockResolvedValueOnce([
					{ user_id: 'leader-1' },
					{ user_id: 'leader-2' },
					{ user_id: 'leader-3' },
					{ user_id: 'leader-4' }
				])
				.mockResolvedValueOnce([
					{ rating: 'thumbs_down' },
					{ rating: 'thumbs_down' }
					// Only 2 out of 4 leaders rated thumbs down
				]);

			const result = await ratingsAPI.shouldAutoRetire('song-1');

			expect(result).toBe(false); // Only 2 out of 4 leaders (50%) rated thumbs down
		});

		it('should handle edge case where exactly 75% threshold is met', async () => {
			// Mock 4 leader memberships (3 is exactly 75%)
			mockPb.getFullList
				.mockResolvedValueOnce([
					{ user_id: 'leader-1' },
					{ user_id: 'leader-2' },
					{ user_id: 'leader-3' },
					{ user_id: 'leader-4' }
				])
				.mockResolvedValueOnce([
					{ rating: 'thumbs_down' },
					{ rating: 'thumbs_down' },
					{ rating: 'thumbs_down' }
				]);

			const result = await ratingsAPI.shouldAutoRetire('song-1');

			expect(result).toBe(true); // Exactly 3 out of 4 (75%) meets threshold
		});

		it('should handle case with 5 leaders needing 4 thumbs down', async () => {
			// Mock 5 leader memberships (75% = 3.75, rounded up to 4)
			mockPb.getFullList
				.mockResolvedValueOnce([
					{ user_id: 'leader-1' },
					{ user_id: 'leader-2' },
					{ user_id: 'leader-3' },
					{ user_id: 'leader-4' },
					{ user_id: 'leader-5' }
				])
				.mockResolvedValueOnce([
					{ rating: 'thumbs_down' },
					{ rating: 'thumbs_down' },
					{ rating: 'thumbs_down' }
				]);

			const result = await ratingsAPI.shouldAutoRetire('song-1');

			expect(result).toBe(false); // Only 3 out of 5, need 4 (75% rounded up)
		});
	});

	describe('getUserFavorites', () => {
		it('should return array of favorite song IDs', async () => {
			mockPb.getFullList.mockResolvedValue([
				{ song_id: 'song-1' },
				{ song_id: 'song-2' },
				{ song_id: 'song-3' }
			]);

			const result = await ratingsAPI.getUserFavorites();

			expect(mockPb.getFullList).toHaveBeenCalledWith({
				filter: 'user_id = "user-1" && church_id = "church-1" && rating = "thumbs_up"',
				fields: 'song_id'
			});
			expect(result).toEqual(['song-1', 'song-2', 'song-3']);
		});
	});

	describe('getUserDifficultSongs', () => {
		it('should return array of difficult song IDs', async () => {
			mockPb.getFullList.mockResolvedValue([{ song_id: 'song-4' }, { song_id: 'song-5' }]);

			const result = await ratingsAPI.getUserDifficultSongs();

			expect(mockPb.getFullList).toHaveBeenCalledWith({
				filter: 'user_id = "user-1" && church_id = "church-1" && is_difficult = true',
				fields: 'song_id'
			});
			expect(result).toEqual(['song-4', 'song-5']);
		});
	});
	describe('getUserRatingsForSongs', () => {
		it('should fetch rating for multiple songs in chunks', async () => {
			const songIds = Array.from({ length: 70 }, (_, i) => `song-${i}`);
			
			// Mock response for first chunk (50)
			mockPb.getFullList.mockResolvedValueOnce(
				songIds.slice(0, 50).map(id => ({
					song_id: id,
					rating: 'thumbs_up',
					is_difficult: false
				}))
			);
			
			// Mock response for second chunk (20)
			mockPb.getFullList.mockResolvedValueOnce(
				songIds.slice(50).map(id => ({
					song_id: id,
					rating: 'neutral',
					is_difficult: true
				}))
			);

			const result = await ratingsAPI.getUserRatingsForSongs(songIds);

			expect(mockPb.collection).toHaveBeenCalledWith('song_ratings');
			expect(mockPb.getFullList).toHaveBeenCalledTimes(2);
			
			// Verify map content
			expect(result.size).toBe(70);
			expect(result.get('song-0')?.rating).toBe('thumbs_up');
			expect(result.get('song-60')?.rating).toBe('neutral');
		});
	});

	describe('getMultipleSongRatings', () => {
		it('should fetch aggregate ratings from view in chunks', async () => {
			const songIds = Array.from({ length: 60 }, (_, i) => `song-${i}`);
			
			// Mock response
			mockPb.getFullList
				.mockResolvedValueOnce(
					songIds.slice(0, 50).map(id => ({
						song_id: id,
						thumbs_up: 10,
						neutral: 5,
						thumbs_down: 2,
						total_ratings: 17,
						difficult_count: 3
					}))
				)
				.mockResolvedValueOnce(
					songIds.slice(50).map(id => ({
						song_id: id,
						thumbs_up: 1,
						neutral: 0,
						thumbs_down: 0,
						total_ratings: 1,
						difficult_count: 0
					}))
				);

			const result = await ratingsAPI.getMultipleSongRatings(songIds);

			expect(mockPb.collection).toHaveBeenCalledWith('song_statistics');
			expect(mockPb.getFullList).toHaveBeenCalledTimes(2);
			
			expect(result.size).toBe(60);
			expect(result.get('song-0')).toEqual({
				thumbsUp: 10,
				neutral: 5,
				thumbsDown: 2,
				totalRatings: 17,
				difficultCount: 3
			});
		});
	});
});
