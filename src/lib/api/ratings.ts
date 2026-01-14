import type PocketBase from 'pocketbase';
import type { AuthContext } from '$lib/types/auth';
import type {
	SongRating,
	CreateSongRatingData,
	UpdateSongRatingData,
	AggregateRatings
} from '$lib/types/song';

// Module-level cache to share ratings across instances and components
export const userRatingCache = new Map<string, Map<string, SongRating | null>>(); // userId -> songId -> rating (or null if fetched and not found)
export const aggregateRatingCache = new Map<string, AggregateRatings>(); // songId -> aggregate

export function resetCaches() {
	userRatingCache.clear();
	aggregateRatingCache.clear();
}

export class RatingsAPI {
	private collection = 'song_ratings';

	constructor(
		private authContext: AuthContext,
		private pb: PocketBase
	) {}

	/**
	 * Get user's rating for a specific song
	 */
	async getUserRating(songId: string): Promise<SongRating | null> {
		try {
			if (!this.authContext.currentChurch?.id || !this.authContext.user?.id) {
				throw new Error('No church or user context');
			}

			const userId = this.authContext.user.id;
			
			// Check cache
			if (!userRatingCache.has(userId)) {
				userRatingCache.set(userId, new Map());
			}
			const userCache = userRatingCache.get(userId)!;
			
			if (userCache.has(songId)) {
				return userCache.get(songId) || null;
			}

			const record = await this.pb
				.collection(this.collection)
				.getFirstListItem(
					`song_id = "${songId}" && user_id = "${userId}" && church_id = "${this.authContext.currentChurch.id}"`
				);

			const rating = record as unknown as SongRating;
			userCache.set(songId, rating);
			return rating;
		} catch (error: any) {
			if (error?.status === 404) {
				// No rating found
				const userId = this.authContext.user?.id;
				if (userId) {
					if (!userRatingCache.has(userId)) {
						userRatingCache.set(userId, new Map());
					}
					userRatingCache.get(userId)!.set(songId, null);
				}
				return null;
			}
			throw error;
		}
	}

	/**
	 * Get user's ratings for multiple songs
	 */
	async getUserRatingsForSongs(songIds: string[]): Promise<Map<string, SongRating>> {
		const ratingsMap = new Map<string, SongRating>();

		if (songIds.length === 0) return ratingsMap;

		try {
			if (!this.authContext.currentChurch?.id || !this.authContext.user?.id) {
				throw new Error('No church or user context');
			}

			const userId = this.authContext.user.id;
			const churchId = this.authContext.currentChurch.id;
			
			if (!userRatingCache.has(userId)) {
				userRatingCache.set(userId, new Map());
			}
			const userCache = userRatingCache.get(userId)!;

			// Process in chunks to avoid max filter length limits
			const BATCH_SIZE = 50;
			const chunks = [];
			for (let i = 0; i < songIds.length; i += BATCH_SIZE) {
				chunks.push(songIds.slice(i, i + BATCH_SIZE));
			}

			await Promise.all(
				chunks.map(async (chunk) => {
					// Build filter for this chunk
					const idFilters = chunk.map((id) => `song_id = "${id}"`).join(' || ');

					const records = await this.pb.collection(this.collection).getFullList({
						filter: `(${idFilters}) && user_id = "${userId}" && church_id = "${churchId}"`
					});

					// Populate map and cache
					records.forEach((record) => {
						const rating = record as unknown as SongRating;
						ratingsMap.set(record.song_id, rating);
						userCache.set(record.song_id, rating);
					});
				})
			);

			// Mark missing songs as null in cache
			songIds.forEach((id) => {
				if (!ratingsMap.has(id)) {
					userCache.set(id, null);
				}
			});

			return ratingsMap;
		} catch (error) {
			console.error('Failed to fetch user ratings for songs:', error);
			return ratingsMap;
		}
	}


	/**
	 * Get all ratings for a song
	 */
	async getSongRatings(songId: string): Promise<SongRating[]> {
		try {
			if (!this.authContext.currentChurch?.id) {
				throw new Error('No church selected');
			}

			const records = await this.pb.collection(this.collection).getFullList({
				filter: `song_id = "${songId}" && church_id = "${this.authContext.currentChurch.id}"`,
				expand: 'user_id'
			});

			return records as unknown as SongRating[];
		} catch (error) {
			console.error('Failed to fetch song ratings:', error);
			throw error;
		}
	}

	/**
	 * Get aggregate ratings for a song
	 */
	async getAggregateRatings(songId: string): Promise<AggregateRatings> {
		if (aggregateRatingCache.has(songId)) {
			return aggregateRatingCache.get(songId)!;
		}

		const ratings = await this.getSongRatings(songId);

		const aggregate: AggregateRatings = {
			thumbsUp: 0,
			neutral: 0,
			thumbsDown: 0,
			totalRatings: ratings.length,
			difficultCount: 0
		};

		ratings.forEach((rating) => {
			switch (rating.rating) {
				case 'thumbs_up':
					aggregate.thumbsUp++;
					break;
				case 'neutral':
					aggregate.neutral++;
					break;
				case 'thumbs_down':
					aggregate.thumbsDown++;
					break;
			}

			if (rating.is_difficult) {
				aggregate.difficultCount++;
			}
		});

		aggregateRatingCache.set(songId, aggregate);
		return aggregate;
	}

	/**
	 * Get aggregate ratings for multiple songs
	 */
	async getMultipleSongRatings(songIds: string[]): Promise<Map<string, AggregateRatings>> {
		const ratingsMap = new Map<string, AggregateRatings>();

		if (songIds.length === 0) return ratingsMap;

		// Initialize all songs with empty ratings
		songIds.forEach((songId) => {
			ratingsMap.set(songId, {
				thumbsUp: 0,
				neutral: 0,
				thumbsDown: 0,
				totalRatings: 0,
				difficultCount: 0
			});
		});

		try {
			if (!this.authContext.currentChurch?.id) {
				throw new Error('No church selected');
			}
			const churchId = this.authContext.currentChurch.id;

			// Process in chunks to avoid max filter length limits
			const BATCH_SIZE = 50;
			const chunks = [];
			for (let i = 0; i < songIds.length; i += BATCH_SIZE) {
				chunks.push(songIds.slice(i, i + BATCH_SIZE));
			}

			await Promise.all(
				chunks.map(async (chunk) => {
					try {
						// Build filter for this chunk
						// We use 'id' (the View's primary key) for filtering.
						// We OMIT church_id filter here because the songIds we are querying
						// have already been filtered by church_id in the main songs query.
						// Adding the extra check on the View sometimes causes "Missing collection context" 
						// errors in PocketBase when combined with complex OR filters on Views.
						const idFilters = chunk.map((id) => `id = "${id}"`).join(' || ');

						const records = await this.pb.collection('song_statistics').getFullList({
							filter: `(${idFilters})`
						});

						// Map view results to AggregateRatings
						records.forEach((record: any) => {
							const aggregate: AggregateRatings = {
								thumbsUp: record.thumbs_up || 0,
								neutral: record.neutral || 0,
								thumbsDown: record.thumbs_down || 0,
								totalRatings: record.total_ratings || 0,
								difficultCount: record.difficult_count || 0
							};
							
							ratingsMap.set(record.song_id, aggregate);
							
							// Update cache
							aggregateRatingCache.set(record.song_id, aggregate);
						});
					} catch (chunkError) {
						console.error('Failed to fetch chunk of ratings:', chunkError);
					}
				})
			);

			return ratingsMap;
		} catch (error) {
			console.error('Failed to fetch multiple song ratings:', error);
			// Return empty ratings for all songs on error
			// (Use the already initialized map)
			return ratingsMap;
		}
	}

	/**
	 * Create or update user's rating for a song
	 */
	async setRating(songId: string, data: CreateSongRatingData): Promise<SongRating> {
		try {
			if (!this.authContext.currentChurch?.id || !this.authContext.user?.id) {
				throw new Error('No church or user context');
			}

			// Check if rating already exists
			const existingRating = await this.getUserRating(songId);

			if (existingRating) {
				// Update existing rating
				const updateData: UpdateSongRatingData = {
					rating: data.rating,
					is_difficult: data.is_difficult
				};

				const record = await this.pb
					.collection(this.collection)
					.update(existingRating.id, updateData);

				const rating = record as unknown as SongRating;

				// Update user cache
				const userId = this.authContext.user.id;
				if (!userRatingCache.has(userId)) {
					userRatingCache.set(userId, new Map());
				}
				userRatingCache.get(userId)!.set(songId, rating);

				// Invalidate aggregate cache
				aggregateRatingCache.delete(songId);

				return rating;
			} else {
				// Create new rating
				const createData = {
					song_id: songId,
					user_id: this.authContext.user.id,
					church_id: this.authContext.currentChurch.id,
					rating: data.rating,
					is_difficult: data.is_difficult || false
				};

				const record = await this.pb.collection(this.collection).create(createData);
				const rating = record as unknown as SongRating;
				
				// Update user cache
				const userId = this.authContext.user.id;
				if (!userRatingCache.has(userId)) {
					userRatingCache.set(userId, new Map());
				}
				userRatingCache.get(userId)!.set(songId, rating);

				// Invalidate aggregate cache
				aggregateRatingCache.delete(songId);

				return rating;
			}
		} catch (error) {
			console.error('Failed to set rating:', error);
			throw error;
		}
	}

	/**
	 * Delete user's rating for a song
	 */
	async deleteRating(songId: string): Promise<void> {
		try {
			const existingRating = await this.getUserRating(songId);

			if (existingRating) {
				await this.pb.collection(this.collection).delete(existingRating.id);
				
				// Update user cache
				const userId = this.authContext.user?.id;
				if (userId && userRatingCache.has(userId)) {
					userRatingCache.get(userId)!.set(songId, null);
				}

				// Invalidate aggregate cache
				aggregateRatingCache.delete(songId);
			}
		} catch (error) {
			console.error('Failed to delete rating:', error);
			throw error;
		}
	}

	/**
	 * Get user's favorite songs (thumbs up)
	 */
	async getUserFavorites(): Promise<string[]> {
		try {
			if (!this.authContext.currentChurch?.id || !this.authContext.user?.id) {
				throw new Error('No church or user context');
			}

			const records = await this.pb.collection(this.collection).getFullList({
				filter: `user_id = "${this.authContext.user.id}" && church_id = "${this.authContext.currentChurch.id}" && rating = "thumbs_up"`,
				fields: 'song_id'
			});

			return records.map((r) => r.song_id);
		} catch (error) {
			console.error('Failed to fetch user favorites:', error);
			return [];
		}
	}

	/**
	 * Get songs marked as difficult by user
	 */
	async getUserDifficultSongs(): Promise<string[]> {
		try {
			if (!this.authContext.currentChurch?.id || !this.authContext.user?.id) {
				throw new Error('No church or user context');
			}

			const records = await this.pb.collection(this.collection).getFullList({
				filter: `user_id = "${this.authContext.user.id}" && church_id = "${this.authContext.currentChurch.id}" && is_difficult = true`,
				fields: 'song_id'
			});

			return records.map((r) => r.song_id);
		} catch (error) {
			console.error('Failed to fetch user difficult songs:', error);
			return [];
		}
	}

	/**
	 * Check if song should be auto-retired based on leader ratings
	 * Requirements:
	 * - Zero thumbs up ratings from any leader
	 * - At least 75% of ALL leaders in the church have rated thumbs down
	 * Example: If there are 4 leaders, at least 3 must rate thumbs down
	 */
	async shouldAutoRetire(songId: string): Promise<boolean> {
		try {
			if (!this.authContext.currentChurch?.id) {
				throw new Error('No church selected');
			}

			// Get all users with leader skill in the church
			const leaderSkills = await this.pb.collection('user_skills').getFullList({
				filter: `church_id = "${this.authContext.currentChurch.id}" && skill_id.slug = "leader"`,
				fields: 'user_id',
				expand: 'skill_id'
			});

			if (leaderSkills.length === 0) {
				return false; // No leaders to check
			}

			const leaderUserIds = leaderSkills.map((s) => s.user_id);

			// Get all ratings for this song from users with leader skill
			const userIdFilters = leaderUserIds.map((id) => `user_id = "${id}"`).join(' || ');
			const ratings = await this.pb.collection(this.collection).getFullList({
				filter: `song_id = "${songId}" && church_id = "${this.authContext.currentChurch.id}" && (${userIdFilters})`
			});

			// Need at least one leader to have rated
			if (ratings.length === 0) {
				return false;
			}

			// Count rating types
			let thumbsUpCount = 0;
			let thumbsDownCount = 0;
			let neutralCount = 0;

			ratings.forEach((rating: any) => {
				switch (rating.rating) {
					case 'thumbs_up':
						thumbsUpCount++;
						break;
					case 'thumbs_down':
						thumbsDownCount++;
						break;
					case 'neutral':
						neutralCount++;
						break;
				}
			});

			// Requirements:
			// 1. Zero thumbs up
			// 2. At least 75% of ALL leaders have rated thumbs down
			if (thumbsUpCount > 0) {
				return false; // Someone likes it, don't retire
			}

			// Need at least 75% of ALL leaders to have given thumbs down
			const requiredThumbsDown = Math.ceil(leaderSkills.length * 0.75);
			return thumbsDownCount >= requiredThumbsDown;
		} catch (error) {
			console.error('Failed to check auto-retire status:', error);
			return false;
		}
	}

	/**
	 * Subscribe to real-time updates for ratings
	 */
	subscribe(callback: (data: unknown) => void) {
		return this.pb.collection(this.collection).subscribe('*', callback);
	}
}

// Factory function for creating RatingsAPI instances
export function createRatingsAPI(authContext: AuthContext, pb: PocketBase): RatingsAPI {
	return new RatingsAPI(authContext, pb);
}
