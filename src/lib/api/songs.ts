import type PocketBase from 'pocketbase';
import type { AuthContext } from '$lib/types/auth';
import type { Song, CreateSongData, UpdateSongData, SongFilterOptions } from '$lib/types/song';
import { pb } from '$lib/api/client';

export class SongsAPI {
	private collection = 'songs';
	private enrichedCollection = 'songs_enriched';

	constructor(
		private authContext: AuthContext,
		private pb: PocketBase
	) {}

	/**
	 * Get all songs from the enriched view with aggregates (ratings, usage, etc.)
	 * This is the preferred method for fetching songs as it includes all data in a single query
	 */
	async getSongsEnriched(options: SongFilterOptions = {}): Promise<Song[]> {
		try {
			// Ensure user has a current church
			if (!this.authContext.currentChurch?.id) {
				throw new Error('No church selected. Please select a church to view songs.');
			}

			let filter = `church_id = "${this.authContext.currentChurch.id}"`;
			const filterParts: string[] = [];

			// Handle retired filter
			if (!options.showRetired) {
				filterParts.push('(is_retired = false || is_retired = null)');
			} else {
				filterParts.push('is_retired = true');
			}

			// Add search filter
			if (options.search) {
				filterParts.push(`(title ~ "${options.search}" || artist ~ "${options.search}")`);
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

			// Add favorites filter
			if (options.showFavorites && this.authContext.user?.id) {
				try {
					const favorites = await this.pb.collection('song_ratings').getFullList({
						filter: `user_id = "${this.authContext.user.id}" && church_id = "${this.authContext.currentChurch.id}" && rating = "thumbs_up"`,
						fields: 'song_id'
					});
					
					const favIds = favorites.map(f => f.song_id);
					if (favIds.length > 0) {
						filterParts.push(`(${favIds.map(id => `id = "${id}"`).join(' || ')})`);
					} else {
						filterParts.push('id = "no_results"');
					}
				} catch (e) {
					console.error('Failed to fetch favorites for filter:', e);
					filterParts.push('id = "error_fetching_favorites"');
				}
			}

			// Christmas filtering: Hide if not specifically requested or if it's not December
			const isDecember = new Date().getMonth() === 11;
			const showChristmas = options.showChristmas ?? isDecember;

			if (!showChristmas) {
				filterParts.push('title !~ "Christmas"');
			}

			// Add status (ready/used) filter
			if (options.status === 'ready') {
				const now = new Date();
				const d14 = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString().replace('T', ' ');
				const d180 = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000).toISOString().replace('T', ' ');
				filterParts.push(`(last_used_date = "" || last_used_date = null || (last_used_date < "${d14}" && last_used_date > "${d180}"))`);
			} else if (options.status === 'used') {
				filterParts.push('(last_used_date != "" && last_used_date != null)');
				
				if (options.usageTimeframe) {
					const now = new Date();
					let days = 180;
					if (options.usageTimeframe === 'recent') days = 30;
					else if (options.usageTimeframe === '3months') days = 90;
					else if (options.usageTimeframe === '6months') days = 180;
					
					const dateLimit = new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString().replace('T', ' ');
					filterParts.push(`last_used_date >= "${dateLimit}"`);
				}
			}

			// Combine filters
			if (filterParts.length > 0) {
				filter += ` && (${filterParts.join(' && ')})`;
			}

			const records = await this.pb.collection(this.enrichedCollection).getFullList({
				filter,
				sort: options.sort || 'title',
				expand: 'created_by,labels'
			});

			return records as unknown as Song[];
		} catch (error) {
			console.error('Failed to fetch enriched songs:', error);
			throw error;
		}
	}

	/**
	 * Get enriched songs with pagination
	 * Includes all aggregate data (ratings, usage) in a single query
	 */
	async getSongsEnrichedPaginated(
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
			// Ensure user has a current church
			if (!this.authContext.currentChurch?.id) {
				throw new Error('No church selected. Please select a church to view songs.');
			}

			let filter = `church_id = "${this.authContext.currentChurch.id}"`;
			const filterParts: string[] = [];

			// Handle retired filter
			if (!options.showRetired) {
				filterParts.push('(is_retired = false || is_retired = null)');
			} else {
				filterParts.push('is_retired = true');
			}

			// Apply same filtering logic as getSongsEnriched
			if (options.search) {
				filterParts.push(`(title ~ "${options.search}" || artist ~ "${options.search}")`);
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

			// Add favorites filter
			if (options.showFavorites && this.authContext.user?.id) {
				// We need to fetch the favorite song IDs first
				try {
					const favorites = await this.pb.collection('song_ratings').getFullList({
						filter: `user_id = "${this.authContext.user.id}" && church_id = "${this.authContext.currentChurch.id}" && rating = "thumbs_up"`,
						fields: 'song_id'
					});
					
					const favIds = favorites.map(f => f.song_id);
					if (favIds.length > 0) {
						filterParts.push(`(${favIds.map(id => `id = "${id}"`).join(' || ')})`);
					} else {
						// No favorites found, return no results
						filterParts.push('id = "no_results"');
					}
				} catch (e) {
					console.error('Failed to fetch favorites for filter:', e);
					// If fail, don't filter? Or return nothing? Safest to return nothing or log error.
					filterParts.push('id = "error_fetching_favorites"');
				}
			}

			// Christmas filtering: Hide if not specifically requested or if it's not December
			const isDecember = new Date().getMonth() === 11;
			const showChristmas = options.showChristmas ?? isDecember;

			if (!showChristmas) {
				filterParts.push('title !~ "Christmas"');
			}

			// Add status (ready/used) filter
			if (options.status === 'ready') {
				const now = new Date();
				const d14 = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString().replace('T', ' ');
				const d180 = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000).toISOString().replace('T', ' ');
				filterParts.push(`(last_used_date = "" || last_used_date = null || (last_used_date < "${d14}" && last_used_date > "${d180}"))`);
			} else if (options.status === 'used') {
				filterParts.push('(last_used_date != "" && last_used_date != null)');
				
				if (options.usageTimeframe) {
					const now = new Date();
					let days = 180;
					if (options.usageTimeframe === 'recent') days = 30;
					else if (options.usageTimeframe === '3months') days = 90;
					else if (options.usageTimeframe === '6months') days = 180;
					
					const dateLimit = new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString().replace('T', ' ');
					filterParts.push(`last_used_date >= "${dateLimit}"`);
				}
			}

			if (filterParts.length > 0) {
				filter += ` && (${filterParts.join(' && ')})`;
			}

			const result = await this.pb.collection(this.enrichedCollection).getList(page, perPage, {
				filter,
				sort: options.sort || 'title',
				expand: 'created_by,labels'
			});

			return {
				items: result.items as unknown as Song[],
				totalItems: result.totalItems,
				totalPages: result.totalPages,
				page: result.page,
				perPage: result.perPage
			};
		} catch (error) {
			console.error('Failed to fetch paginated enriched songs:', error);
			throw error;
		}
	}

	/**
	 * Get complete song data in a SINGLE SQL query via custom endpoint
	 * Includes: songs + usage + aggregate ratings + user's individual rating
	 * This is the most efficient way to fetch all song data
	 */
	async getSongsComplete(
		page = 1,
		perPage = 100,
		options: SongFilterOptions = {}
	): Promise<{
		songs: Song[];
		userRatings: Map<string, { rating: string; is_difficult: boolean }>;
		totalItems: number;
		totalPages: number;
		page: number;
		perPage: number;
	}> {
		try {
			if (!this.authContext.currentChurch?.id) {
				throw new Error('No church selected');
			}

			// Build query params
			const params = new URLSearchParams({
				church_id: this.authContext.currentChurch.id,
				page: page.toString(),
				perPage: perPage.toString()
			});

			if (options.search) params.set('search', options.search);
			if (options.labels && options.labels.length > 0) {
				params.set('labels', options.labels.join(','));
			}
			if (options.showRetired) params.set('showRetired', 'true');
			if (options.sort) params.set('sort', options.sort);

			// Call custom endpoint
			const response = await this.pb.send(`/api/songs-complete?${params.toString()}`, {
				method: 'GET'
			});

			const items: any[] = response.items || [];
			const userRatings = new Map<string, { rating: string; is_difficult: boolean }>();

			// Process items: extract user rating and clean up song objects
			const songs = items.map((item) => {
				// Extract user rating if exists
				if (item.user_rating) {
					userRatings.set(item.id, {
						rating: item.user_rating,
						is_difficult: item.user_is_difficult || false
					});
				}

				// Remove user-specific fields from song object
				const { user_rating, user_is_difficult, ...song } = item;
				return song as Song;
			});

			return {
				songs,
				userRatings,
				totalItems: response.totalItems || 0,
				totalPages: response.totalPages || 0,
				page: response.page || 1,
				perPage: response.perPage || perPage
			};
		} catch (error) {
			console.error('Failed to fetch complete songs:', error);
			throw error;
		}
	}

	/**
	 * Get enriched songs with user ratings in a single optimized call
	 * Fetches songs+aggregates and user ratings in parallel, then merges them
	 * @deprecated Use getSongsComplete() instead for better performance
	 */
	async getSongsEnrichedWithUserRatings(
		options: SongFilterOptions = {}
	): Promise<{ songs: Song[]; userRatings: Map<string, any> }> {
		try {
			// Fetch enriched songs first
			const songs = await this.getSongsEnriched(options);

			if (songs.length === 0) {
				return { songs: [], userRatings: new Map() };
			}

			// Fetch user ratings for all songs in parallel
			const songIds = songs.map(s => s.id);
			const userId = this.authContext.user?.id;
			const churchId = this.authContext.currentChurch?.id;

			if (!userId || !churchId) {
				return { songs, userRatings: new Map() };
			}

			// Build filter for song ratings - get user's ratings for these songs
			const BATCH_SIZE = 50;
			const chunks = [];
			for (let i = 0; i < songIds.length; i += BATCH_SIZE) {
				chunks.push(songIds.slice(i, i + BATCH_SIZE));
			}

			const allRatings = await Promise.all(
				chunks.map(async (chunk) => {
					const idFilters = chunk.map((id) => `song_id = "${id}"`).join(' || ');
					const records = await this.pb.collection('song_ratings').getFullList({
						filter: `(${idFilters}) && user_id = "${userId}" && church_id = "${churchId}"`
					});
					return records;
				})
			);

			// Flatten and create map
			const userRatings = new Map();
			allRatings.flat().forEach((rating: any) => {
				userRatings.set(rating.song_id, {
					rating: rating.rating,
					is_difficult: rating.is_difficult || false
				});
			});

			return { songs, userRatings };
		} catch (error) {
			console.error('Failed to fetch enriched songs with user ratings:', error);
			throw error;
		}
	}

	/**
	 * Paginated version of getSongsEnrichedWithUserRatings
	 */
	async getSongsEnrichedWithUserRatingsPaginated(
		page = 1,
		perPage = 20,
		options: SongFilterOptions = {}
	): Promise<{
		songs: Song[];
		userRatings: Map<string, any>;
		totalItems: number;
		totalPages: number;
		page: number;
		perPage: number;
	}> {
		try {
			// Fetch paginated enriched songs
			const result = await this.getSongsEnrichedPaginated(page, perPage, options);

			if (result.items.length === 0) {
				return {
					songs: [],
					userRatings: new Map(),
					totalItems: result.totalItems,
					totalPages: result.totalPages,
					page: result.page,
					perPage: result.perPage
				};
			}

			// Fetch user ratings for visible songs
			const songIds = result.items.map(s => s.id);
			const userId = this.authContext.user?.id;
			const churchId = this.authContext.currentChurch?.id;

			if (!userId || !churchId) {
				return {
					songs: result.items,
					userRatings: new Map(),
					totalItems: result.totalItems,
					totalPages: result.totalPages,
					page: result.page,
					perPage: result.perPage
				};
			}

			// Batch fetch user ratings
			const idFilters = songIds.map((id) => `song_id = "${id}"`).join(' || ');
			const ratings = await this.pb.collection('song_ratings').getFullList({
				filter: `(${idFilters}) && user_id = "${userId}" && church_id = "${churchId}"`
			});

			// Create map
			const userRatings = new Map();
			ratings.forEach((rating: any) => {
				userRatings.set(rating.song_id, {
					rating: rating.rating,
					is_difficult: rating.is_difficult || false
				});
			});

			return {
				songs: result.items,
				userRatings,
				totalItems: result.totalItems,
				totalPages: result.totalPages,
				page: result.page,
				perPage: result.perPage
			};
		} catch (error) {
			console.error('Failed to fetch paginated enriched songs with user ratings:', error);
			throw error;
		}
	}

	/**
	 * Get all active songs with optional filtering
	 */
	async getSongs(options: SongFilterOptions = {}): Promise<Song[]> {
		try {
			// Ensure user has a current church
			if (!this.authContext.currentChurch?.id) {
				throw new Error('No church selected. Please select a church to view songs.');
			}

			let filter = `church_id = "${this.authContext.currentChurch.id}"`;
			const filterParts: string[] = [];

			// Handle retired filter
			if (!options.showRetired) {
				filterParts.push('(is_retired = false || is_retired = null)');
			} else {
				filterParts.push('is_retired = true');
			}

			// Add search filter
			if (options.search) {
				filterParts.push(`(title ~ "${options.search}" || artist ~ "${options.search}")`);
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

			// Add favorites filter
			if (options.showFavorites && this.authContext.user?.id) {
				try {
					const favorites = await this.pb.collection('song_ratings').getFullList({
						filter: `user_id = "${this.authContext.user.id}" && church_id = "${this.authContext.currentChurch.id}" && rating = "thumbs_up"`,
						fields: 'song_id'
					});
					
					const favIds = favorites.map(f => f.song_id);
					if (favIds.length > 0) {
						filterParts.push(`(${favIds.map(id => `id = "${id}"`).join(' || ')})`);
					} else {
						filterParts.push('id = "no_results"');
					}
				} catch (e) {
					console.error('Failed to fetch favorites for filter:', e);
					filterParts.push('id = "error_fetching_favorites"');
				}
			}

			// Christmas filtering: Hide if not specifically requested or if it's not December
			const isDecember = new Date().getMonth() === 11;
			const showChristmas = options.showChristmas ?? isDecember;

			if (!showChristmas) {
				filterParts.push('title !~ "Christmas"');
			}

			// Combine filters
			if (filterParts.length > 0) {
				filter += ` && (${filterParts.join(' && ')})`;
			}

			const records = await this.pb.collection(this.collection).getFullList({
				filter,
				sort: options.sort || 'title',
				expand: 'created_by,labels'
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
			// Ensure user has a current church
			if (!this.authContext.currentChurch?.id) {
				throw new Error('No church selected. Please select a church to view songs.');
			}

			// First, get recently used song IDs
			const recentUsage = await this.pb.collection('song_usage').getFullList({
				filter: `used_date >= "${cutoffDate.toISOString()}"`,
				fields: 'song_id'
			});

			const recentSongIds = recentUsage.map((u) => u.song_id);

			// Build filter to exclude recently used songs
			let filterQuery = `is_active = true && church_id = "${this.authContext.currentChurch.id}"`;
			if (recentSongIds.length > 0) {
				const excludeFilter = recentSongIds.map((id) => `id != "${id}"`).join(' && ');
				filterQuery += ` && (${excludeFilter})`;
			}

			// Fetch available songs
			const availableSongs = await this.pb.collection(this.collection).getFullList({
				filter: filterQuery,
				expand: 'created_by,labels,song_usage_via_song',
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
			const record = await this.pb.collection(this.collection).getOne(id, {
				expand: 'created_by,labels'
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
			// Ensure user has a current church
			if (!this.authContext.currentChurch?.id) {
				throw new Error('No church selected. Please select a church to view songs.');
			}

			let filter = `church_id = "${this.authContext.currentChurch.id}"`;
			const filterParts: string[] = [];

			// Handle retired filter
			if (!options.showRetired) {
				filterParts.push('(is_retired = false || is_retired = null)');
			} else {
				filterParts.push('is_retired = true');
			}

			// Apply same filtering logic as getSongs
			if (options.search) {
				filterParts.push(`(title ~ "${options.search}" || artist ~ "${options.search}")`);
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

			const result = await this.pb.collection(this.collection).getList(page, perPage, {
				filter,
				sort: options.sort || 'title',
				expand: 'created_by,labels'
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
			// Ensure user has a current church
			if (!this.authContext.currentChurch?.id) {
				throw new Error('No church selected. Please select a church to add songs.');
			}

			// Prepare form data for file uploads
			const formData = new FormData();

			// Add church context - REQUIRED for church-scoped data
			formData.append('church_id', this.authContext.currentChurch.id);

			// Add text fields
			formData.append('title', data.title);
			if (data.artist) formData.append('artist', data.artist);

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
			formData.append('created_by', this.authContext.user?.id || '');
			formData.append('is_active', 'true');

			const record = await this.pb.collection(this.collection).create(formData);
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
			const record = await this.pb.collection(this.collection).update(id, data);
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
			await this.pb.collection(this.collection).update(id, { is_active: false });
		} catch (error) {
			console.error('Failed to delete song:', error);
			throw error;
		}
	}

	/**
	 * Retire a song
	 */
	async retireSong(id: string, reason?: string): Promise<Song> {
		try {
			const data = {
				is_retired: true,
				retired_date: new Date().toISOString(),
				retired_reason: reason || 'manual'
			};
			const record = await this.pb.collection(this.collection).update(id, data);
			return record as unknown as Song;
		} catch (error) {
			console.error('Failed to retire song:', error);
			throw error;
		}
	}

	/**
	 * Unretire a song
	 */
	async unretireSong(id: string): Promise<Song> {
		try {
			const data = {
				is_retired: false,
				retired_date: null,
				retired_reason: null
			};
			const record = await this.pb.collection(this.collection).update(id, data);
			return record as unknown as Song;
		} catch (error) {
			console.error('Failed to unretire song:', error);
			throw error;
		}
	}

	/**
	 * Search songs by title or artist
	 */
	async searchSongs(query: string): Promise<Song[]> {
		try {
			const filter = `is_active = true && (title ~ "${query}" || artist ~ "${query}")`;
			const records = await this.pb.collection(this.collection).getFullList({
				filter,
				sort: 'title',
				expand: 'created_by,labels'
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
			const usage = await this.pb
				.collection('song_usage')
				.getFirstListItem(`song_id = "${songId}"`, {
					sort: '-used_date',
					fields: 'used_date'
				});

			if (usage && usage.used_date) {
				const lastUsed = new Date(usage.used_date);
				const daysSince = Math.floor((Date.now() - lastUsed.getTime()) / (1000 * 60 * 60 * 24));
				return { lastUsed, daysSince };
			}

			return { lastUsed: null, daysSince: Infinity };
		} catch {
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
			const usageRecords = await this.pb.collection('song_usage').getFullList({
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
	async getSongUsageHistory(songId: string): Promise<Record<string, unknown>[]> {
		try {
			const usageRecords = await this.pb.collection('song_usage').getFullList({
				filter: `song_id = "${songId}"`,
				sort: '-used_date',
				expand: 'service_id,worship_leader'
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
			const usageStats = await this.pb.collection('song_usage').getFullList({
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
			const songs = await this.pb.collection(this.collection).getFullList({
				filter: `is_active = true && (${songIdsFilter})`,
				expand: 'created_by,labels'
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
	 * Get top songs based on a 6-month period (current or previous)
	 * Current: Last 6 months vs previous 6 months
	 * Previous: 6-12 months ago vs 12-18 months ago
	 */
	async getTopSongs(limit = 10, period: 'current' | 'previous' = 'current'): Promise<{ topSongs: { song: Song; rank: number; comparisonRank: number | null; usageCount: number }[], previousPeriodTotalSongs: number }> {
		try {
			// Calculate dates
			const now = new Date();
			const sixMonthsAgo = new Date();
			sixMonthsAgo.setMonth(now.getMonth() - 6);
			const twelveMonthsAgo = new Date();
			twelveMonthsAgo.setMonth(now.getMonth() - 12);
			const eighteenMonthsAgo = new Date();
			eighteenMonthsAgo.setMonth(now.getMonth() - 18);

			// Fetch usage for the last 18 months
			const usageStats = await this.pb.collection('song_usage').getFullList({
				filter: `used_date >= "${eighteenMonthsAgo.toISOString()}"`,
				fields: 'song_id,used_date',
				sort: 'used_date'
			});

			// Aggregate counts for periods
			const p1Counts = new Map<string, number>(); // 0-6m
			const p2Counts = new Map<string, number>(); // 6-12m
			const p3Counts = new Map<string, number>(); // 12-18m

			usageStats.forEach((usage) => {
				const usageDate = new Date(usage.used_date);
				if (usageDate >= sixMonthsAgo) {
					p1Counts.set(usage.song_id, (p1Counts.get(usage.song_id) || 0) + 1);
				} else if (usageDate >= twelveMonthsAgo) {
					p2Counts.set(usage.song_id, (p2Counts.get(usage.song_id) || 0) + 1);
				} else {
					p3Counts.set(usage.song_id, (p3Counts.get(usage.song_id) || 0) + 1);
				}
			});

			// Helper function to calculate ranks with ties (1, 2, 2, 4)
			const calculateRanks = (counts: Map<string, number>) => {
				const sorted = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
				const rankings = new Map<string, number>();
				
				let currentRank = 1;
				for (let i = 0; i < sorted.length; i++) {
					if (i > 0 && sorted[i][1] === sorted[i - 1][1]) {
						rankings.set(sorted[i][0], rankings.get(sorted[i - 1][0])!);
					} else {
						rankings.set(sorted[i][0], i + 1);
					}
				}
				return rankings;
			};

			const p1Ranks = calculateRanks(p1Counts);
			const p2Ranks = calculateRanks(p2Counts);
			const p3Ranks = calculateRanks(p3Counts);

			// Determine which period is primary and secondary
			const primaryCounts = period === 'current' ? p1Counts : p2Counts;
			const primaryRanks = period === 'current' ? p1Ranks : p2Ranks;
			const secondaryRanks = period === 'current' ? p2Ranks : p3Ranks;

			// Get top N from primary period
			const topSongIds = Array.from(primaryCounts.entries())
				.sort((a, b) => b[1] - a[1])
				.slice(0, limit)
				.map(([songId]) => songId);

			if (topSongIds.length === 0) {
				return { topSongs: [], previousPeriodTotalSongs: p2Counts.size };
			}

			// Fetch song details
			const songIdsFilter = topSongIds.map((id) => `id = "${id}"`).join(' || ');
			const songs = await this.pb.collection(this.collection).getFullList({
				filter: `is_active = true && (${songIdsFilter})`,
				expand: 'created_by,labels'
			});

			// Combine data
			const topSongs = topSongIds.map((songId) => {
				const song = songs.find((s) => s.id === songId);
				if (!song) return null;

				return {
					song: song as unknown as Song,
					rank: primaryRanks.get(songId)!,
					comparisonRank: secondaryRanks.get(songId) || null,
					usageCount: primaryCounts.get(songId)!
				};
			}).filter(item => item !== null) as { song: Song; rank: number; comparisonRank: number | null; usageCount: number }[];

			// Apply secondary sort for ties
			topSongs.sort((a, b) => {
				// Primary: Usage Count (Descending)
				if (b.usageCount !== a.usageCount) {
					return b.usageCount - a.usageCount;
				}

				// Helper to get delta and category
				const getStats = (item: typeof a) => {
					if (item.comparisonRank === null) return { cat: 2, delta: 0 }; // New
					const delta = item.comparisonRank - item.rank;
					if (delta < 0) return { cat: 1, delta }; // Drop
					return { cat: 3, delta }; // Gain (or Same)
				};

				const statsA = getStats(a);
				const statsB = getStats(b);

				// Secondary: Category (Drop -> New -> Gain)
				if (statsA.cat !== statsB.cat) {
					return statsA.cat - statsB.cat;
				}

				// Tertiary: Magnitude
				if (statsA.cat === 1) { // Drop: Greatest drop first (-10 before -2) -> Ascending
					return statsA.delta - statsB.delta;
				}
				if (statsA.cat === 3) { // Gain: Greatest gain first (10 before 2) -> Descending
					return statsB.delta - statsA.delta;
				}
				
				return 0;
			});

			return {
				topSongs,
				previousPeriodTotalSongs: p2Counts.size
			};

		} catch (error) {
			console.error('Failed to fetch top songs:', error);
			return { topSongs: [], previousPeriodTotalSongs: 0 };
		}
	}

	/**
	 * Get count of available songs (used 14-180 days ago)
	 * Total songs count comes from pagination, so we only need this one
	 */
	async getAvailableSongsCount(): Promise<number> {
		try {
			if (!this.authContext.currentChurch?.id) {
				return 0;
			}

			// Calculate date thresholds
			const now = Date.now();
			const fourteenDaysAgo = new Date(now - 14 * 24 * 60 * 60 * 1000).toISOString().replace('T', ' ');
			const oneEightyDaysAgo = new Date(now - 180 * 24 * 60 * 60 * 1000).toISOString().replace('T', ' ');

			let filter = `church_id = "${this.authContext.currentChurch.id}" && (is_retired = false || is_retired = null)`;
			filter += ` && last_used_date >= "${oneEightyDaysAgo}" && last_used_date < "${fourteenDaysAgo}"`;

			// Automate Christmas filtering: Hide unless it's December
			const isDecember = new Date().getMonth() === 11;
			if (!isDecember) {
				filter += ' && title !~ "Christmas"';
			}

			// Available songs (used 14-180 days ago)
			const result = await this.pb.collection(this.enrichedCollection).getList(1, 1, {
				filter,
				fields: 'id'
			});

			return result.totalItems;
		} catch (error) {
			console.error('Failed to fetch available songs count:', error);
			return 0;
		}
	}

	/**
	 * Get personal popular songs for a specific user
	 */
	async getPersonalPopularSongs(userId: string, limit = 10): Promise<Song[]> {
		try {
			// Get usage records for services where this user was the worship leader
			const personalUsage = await this.pb.collection('song_usage').getFullList({
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
			const songs = await this.pb.collection(this.collection).getFullList({
				filter: `is_active = true && (${songIdsFilter})`,
				expand: 'created_by,labels'
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
	subscribe(callback: (data: unknown) => void) {
		return this.pb.collection(this.collection).subscribe('*', callback);
	}
}

// Legacy import removed - using dependency injection

// Factory function for creating SongsAPI instances
export function createSongsAPI(authContext: AuthContext, pb: PocketBase): SongsAPI {
	return new SongsAPI(authContext, pb);
}
