import { pb } from './client';
import type { Song, CreateSongData, UpdateSongData, SongFilterOptions } from '$lib/types/song';

export class SongsAPI {
	private collection = 'songs';

	/**
	 * Get all active songs with optional filtering
	 */
	async getSongs(options: SongFilterOptions = {}): Promise<Song[]> {
		try {
			let filter = 'is_active = true';
			const filterParts: string[] = [];

			// Add search filter
			if (options.search) {
				filterParts.push(`(title ~ "${options.search}" || artist ~ "${options.search}")`);
			}

			// Add category filter
			if (options.category) {
				filterParts.push(`category = "${options.category}"`);
			}

			// Add labels filter
			if (options.labels && options.labels.length > 0) {
				const labelFilters = options.labels.map((labelId) => `labels ?~ "${labelId}"`);
				filterParts.push(`(${labelFilters.join(' || ')})`);
			}

			// Add key filter
			if (options.key) {
				filterParts.push(`key_signature = "${options.key}"`);
			}

			// Add tags filter
			if (options.tags && options.tags.length > 0) {
				const tagFilters = options.tags.map((tag) => `tags ?~ "${tag}"`);
				filterParts.push(`(${tagFilters.join(' || ')})`);
			}

			// Add tempo filter
			if (options.minTempo) {
				filterParts.push(`tempo >= ${options.minTempo}`);
			}
			if (options.maxTempo) {
				filterParts.push(`tempo <= ${options.maxTempo}`);
			}

			// Add created_by filter
			if (options.createdBy) {
				filterParts.push(`created_by = "${options.createdBy}"`);
			}

			// Combine filters
			if (filterParts.length > 0) {
				filter += ` && (${filterParts.join(' && ')})`;
			}

			const records = await pb.collection(this.collection).getFullList({
				filter,
				sort: options.sort || 'title',
				expand: 'created_by,category,labels'
			});

			return records as unknown as Song[];
		} catch (error) {
			console.error('Failed to fetch songs:', error);
			throw error;
		}
	}

	/**
	 * Get songs that haven't been used recently
	 */
	async getAvailableSongs(weeksToCheck = 4): Promise<Song[]> {
		const cutoffDate = new Date();
		cutoffDate.setDate(cutoffDate.getDate() - weeksToCheck * 7);

		try {
			// First, get recently used song IDs
			const recentUsage = await pb.collection('song_usage').getFullList({
				filter: `used_date >= "${cutoffDate.toISOString()}"`,
				fields: 'song_id'
			});

			const recentSongIds = recentUsage.map((u) => u.song_id);

			// Build filter to exclude recently used songs
			let filterQuery = 'is_active = true';
			if (recentSongIds.length > 0) {
				const excludeFilter = recentSongIds.map((id) => `id != "${id}"`).join(' && ');
				filterQuery += ` && (${excludeFilter})`;
			}

			// Fetch available songs
			const availableSongs = await pb.collection(this.collection).getFullList({
				filter: filterQuery,
				expand: 'created_by,category,labels,song_usage_via_song',
				sort: 'title'
			});

			return availableSongs as unknown as Song[];
		} catch (error) {
			console.error('Failed to fetch available songs:', error);
			throw error;
		}
	}

	/**
	 * Get a single song by ID
	 */
	async getSong(id: string): Promise<Song> {
		try {
			const record = await pb.collection(this.collection).getOne(id, {
				expand: 'created_by,category,labels'
			});
			return record as unknown as Song;
		} catch (error) {
			console.error('Failed to fetch song:', error);
			throw error;
		}
	}

	/**
	 * Get songs with pagination
	 */
	async getSongsPaginated(
		page = 1,
		perPage = 20,
		options: SongFilterOptions = {}
	): Promise<{
		items: Song[];
		totalItems: number;
		totalPages: number;
		page: number;
		perPage: number;
	}> {
		try {
			let filter = 'is_active = true';
			const filterParts: string[] = [];

			// Apply same filtering logic as getSongs
			if (options.search) {
				filterParts.push(`(title ~ "${options.search}" || artist ~ "${options.search}")`);
			}
			if (options.category) {
				filterParts.push(`category = "${options.category}"`);
			}
			if (options.labels && options.labels.length > 0) {
				const labelFilters = options.labels.map((labelId) => `labels ?~ "${labelId}"`);
				filterParts.push(`(${labelFilters.join(' || ')})`);
			}
			if (options.key) {
				filterParts.push(`key_signature = "${options.key}"`);
			}
			if (options.tags && options.tags.length > 0) {
				const tagFilters = options.tags.map((tag) => `tags ?~ "${tag}"`);
				filterParts.push(`(${tagFilters.join(' || ')})`);
			}
			if (options.minTempo) {
				filterParts.push(`tempo >= ${options.minTempo}`);
			}
			if (options.maxTempo) {
				filterParts.push(`tempo <= ${options.maxTempo}`);
			}
			if (options.createdBy) {
				filterParts.push(`created_by = "${options.createdBy}"`);
			}

			if (filterParts.length > 0) {
				filter += ` && (${filterParts.join(' && ')})`;
			}

			const result = await pb.collection(this.collection).getList(page, perPage, {
				filter,
				sort: options.sort || 'title',
				expand: 'created_by,category,labels'
			});

			return {
				items: result.items as unknown as Song[],
				totalItems: result.totalItems,
				totalPages: result.totalPages,
				page: result.page,
				perPage: result.perPage
			};
		} catch (error) {
			console.error('Failed to fetch paginated songs:', error);
			throw error;
		}
	}

	/**
	 * Create a new song
	 */
	async createSong(data: CreateSongData): Promise<Song> {
		try {
			// Prepare form data for file uploads
			const formData = new FormData();

			// Add text fields
			formData.append('title', data.title);
			if (data.artist) formData.append('artist', data.artist);
			formData.append('category', data.category);
			if (data.labels && data.labels.length > 0) {
				data.labels.forEach((labelId) => {
					formData.append('labels', labelId);
				});
			}
			if (data.key_signature) formData.append('key_signature', data.key_signature);
			if (data.tempo) formData.append('tempo', data.tempo.toString());
			if (data.duration_seconds)
				formData.append('duration_seconds', data.duration_seconds.toString());
			if (data.lyrics) formData.append('lyrics', data.lyrics);
			if (data.ccli_number) formData.append('ccli_number', data.ccli_number);
			if (data.copyright_info) formData.append('copyright_info', data.copyright_info);
			if (data.notes) formData.append('notes', data.notes);

			// Add tags as JSON
			if (data.tags && data.tags.length > 0) {
				formData.append('tags', JSON.stringify(data.tags));
			}

			// Add files
			if (data.chord_chart) {
				formData.append('chord_chart', data.chord_chart);
			}
			if (data.audio_file) {
				formData.append('audio_file', data.audio_file);
			}
			if (data.sheet_music && data.sheet_music.length > 0) {
				data.sheet_music.forEach((file) => {
					formData.append('sheet_music', file);
				});
			}

			// Add metadata
			formData.append('created_by', pb.authStore.model?.id || '');
			formData.append('is_active', 'true');

			const record = await pb.collection(this.collection).create(formData);
			return record as unknown as Song;
		} catch (error) {
			console.error('Failed to create song:', error);
			throw error;
		}
	}

	/**
	 * Update an existing song
	 */
	async updateSong(id: string, data: UpdateSongData): Promise<Song> {
		try {
			const record = await pb.collection(this.collection).update(id, data);
			return record as unknown as Song;
		} catch (error) {
			console.error('Failed to update song:', error);
			throw error;
		}
	}

	/**
	 * Delete a song (soft delete by setting is_active to false)
	 */
	async deleteSong(id: string): Promise<void> {
		try {
			await pb.collection(this.collection).update(id, { is_active: false });
		} catch (error) {
			console.error('Failed to delete song:', error);
			throw error;
		}
	}

	/**
	 * Search songs by title or artist
	 */
	async searchSongs(query: string): Promise<Song[]> {
		try {
			const filter = `is_active = true && (title ~ "${query}" || artist ~ "${query}")`;
			const records = await pb.collection(this.collection).getFullList({
				filter,
				sort: 'title',
				expand: 'created_by,category,labels'
			});
			return records as unknown as Song[];
		} catch (error) {
			console.error('Failed to search songs:', error);
			throw error;
		}
	}

	/**
	 * Get last usage info for a song
	 */
	async getSongLastUsage(songId: string): Promise<{ lastUsed: Date | null; daysSince: number }> {
		try {
			const usage = await pb.collection('song_usage').getFirstListItem(`song_id = "${songId}"`, {
				sort: '-used_date',
				fields: 'used_date'
			});

			if (usage && usage.used_date) {
				const lastUsed = new Date(usage.used_date);
				const daysSince = Math.floor((Date.now() - lastUsed.getTime()) / (1000 * 60 * 60 * 24));
				return { lastUsed, daysSince };
			}

			return { lastUsed: null, daysSince: Infinity };
		} catch (error) {
			// No usage found
			return { lastUsed: null, daysSince: Infinity };
		}
	}

	/**
	 * Get usage info for multiple songs
	 */
	async getSongsUsageInfo(
		songIds: string[]
	): Promise<Map<string, { lastUsed: Date | null; daysSince: number }>> {
		const usageMap = new Map();

		if (songIds.length === 0) return usageMap;

		try {
			// Build filter for all song IDs
			const idFilters = songIds.map((id) => `song_id = "${id}"`).join(' || ');

			// Get all usage records for these songs
			const usageRecords = await pb.collection('song_usage').getFullList({
				filter: idFilters,
				sort: '-used_date'
			});

			// Group by song_id and get the most recent usage
			const latestUsageMap = new Map();
			for (const record of usageRecords) {
				if (
					!latestUsageMap.has(record.song_id) ||
					new Date(record.used_date) > new Date(latestUsageMap.get(record.song_id).used_date)
				) {
					latestUsageMap.set(record.song_id, record);
				}
			}

			// Calculate days since last use for each song
			for (const songId of songIds) {
				const usage = latestUsageMap.get(songId);
				if (usage && usage.used_date) {
					const lastUsed = new Date(usage.used_date);
					const daysSince = Math.floor((Date.now() - lastUsed.getTime()) / (1000 * 60 * 60 * 24));
					usageMap.set(songId, { lastUsed, daysSince });
				} else {
					usageMap.set(songId, { lastUsed: null, daysSince: Infinity });
				}
			}

			return usageMap;
		} catch (error) {
			console.error('Failed to fetch songs usage info:', error);
			// Return empty map for all songs on error
			for (const songId of songIds) {
				usageMap.set(songId, { lastUsed: null, daysSince: Infinity });
			}
			return usageMap;
		}
	}

	/**
	 * Get usage history for a specific song
	 */
	async getSongUsageHistory(songId: string): Promise<any[]> {
		try {
			const usageRecords = await pb.collection('song_usage').getFullList({
				filter: `song_id = "${songId}"`,
				sort: '-used_date',
				expand: 'setlist_id,worship_leader'
			});

			return usageRecords;
		} catch (error) {
			console.error('Failed to fetch song usage history:', error);
			return [];
		}
	}

	/**
	 * Get most popular songs overall
	 */
	async getPopularSongs(limit = 10): Promise<Song[]> {
		try {
			// Get song usage counts
			const usageStats = await pb.collection('song_usage').getFullList({
				fields: 'song_id',
				sort: 'song_id'
			});

			// Count uses per song
			const usageCounts = new Map<string, number>();
			usageStats.forEach((usage) => {
				const count = usageCounts.get(usage.song_id) || 0;
				usageCounts.set(usage.song_id, count + 1);
			});

			// Get songs with highest usage counts
			const popularSongIds = Array.from(usageCounts.entries())
				.sort((a, b) => b[1] - a[1]) // Sort by usage count descending
				.slice(0, limit)
				.map(([songId, count]) => ({ songId, count }));

			if (popularSongIds.length === 0) {
				return [];
			}

			// Fetch the actual song records
			const songIdsFilter = popularSongIds.map(({ songId }) => `id = "${songId}"`).join(' || ');
			const songs = await pb.collection(this.collection).getFullList({
				filter: `is_active = true && (${songIdsFilter})`,
				expand: 'created_by,category,labels'
			});

			// Attach usage counts and sort by popularity
			const songsWithCounts = songs.map((song) => ({
				...song,
				expand: {
					...song.expand,
					usage_count: popularSongIds.find((p) => p.songId === song.id)?.count || 0
				}
			}));

			songsWithCounts.sort((a, b) => b.expand.usage_count - a.expand.usage_count);

			return songsWithCounts as unknown as Song[];
		} catch (error) {
			console.error('Failed to fetch popular songs:', error);
			return [];
		}
	}

	/**
	 * Get personal popular songs for a specific user
	 */
	async getPersonalPopularSongs(userId: string, limit = 10): Promise<Song[]> {
		try {
			// Get usage records for services where this user was the worship leader
			const personalUsage = await pb.collection('song_usage').getFullList({
				filter: `worship_leader = "${userId}"`,
				fields: 'song_id'
			});

			if (personalUsage.length === 0) {
				return [];
			}

			// Count uses per song for this user
			const usageCounts = new Map<string, number>();
			personalUsage.forEach((usage) => {
				const count = usageCounts.get(usage.song_id) || 0;
				usageCounts.set(usage.song_id, count + 1);
			});

			// Get songs with highest personal usage counts
			const popularSongIds = Array.from(usageCounts.entries())
				.sort((a, b) => b[1] - a[1])
				.slice(0, limit)
				.map(([songId, count]) => ({ songId, count }));

			// Fetch the actual song records
			const songIdsFilter = popularSongIds.map(({ songId }) => `id = "${songId}"`).join(' || ');
			const songs = await pb.collection(this.collection).getFullList({
				filter: `is_active = true && (${songIdsFilter})`,
				expand: 'created_by,category,labels'
			});

			// Attach personal usage counts and sort by personal popularity
			const songsWithCounts = songs.map((song) => ({
				...song,
				expand: {
					...song.expand,
					personal_usage_count: popularSongIds.find((p) => p.songId === song.id)?.count || 0
				}
			}));

			songsWithCounts.sort((a, b) => b.expand.personal_usage_count - a.expand.personal_usage_count);

			return songsWithCounts as unknown as Song[];
		} catch (error) {
			console.error('Failed to fetch personal popular songs:', error);
			return [];
		}
	}

	/**
	 * Subscribe to real-time updates for songs
	 */
	subscribe(callback: (data: any) => void) {
		return pb.collection(this.collection).subscribe('*', callback);
	}
}

// Export singleton instance
export const songsApi = new SongsAPI();
