import { createRatingsAPI, type RatingsAPI } from '$lib/api/ratings';
import { createSongsAPI, type SongsAPI } from '$lib/api/songs';
import type { AuthStore as RuntimeAuthStore } from '$lib/stores/auth.svelte';
import type { AuthContext } from '$lib/types/auth';
import type {
	AggregateRatings,
	CreateSongData,
	Song,
	SongFilterOptions,
	SongRatingValue,
	SongStats,
	UpdateSongData
} from '$lib/types/song';

class SongsStore {
	// Reactive state using Svelte 5 runes
	songs = $state<Song[]>([]); // Currently displayed songs (paginated/filtered)
	allSongs = $state<Song[]>([]); // Cache of all enriched songs
	loading = $state<boolean>(false);
	error = $state<string | null>(null);

	// Pagination state
	currentPage = $state<number>(1);
	totalPages = $state<number>(1);
	totalItems = $state<number>(0);
	perPage = $state<number>(100);

	// Filter state
	filters = $state<SongFilterOptions>({
		search: '',
		key: '',
		tags: [],
		sort: 'title'
	});

	// Stats
	stats = $state<SongStats>({
		totalSongs: 0,
		availableSongs: 0,
		recentlyUsed: 0
	});

	// Ratings state
	songRatings = $state<Map<string, AggregateRatings>>(new Map());
	userRatings = $state<Map<string, { rating: SongRatingValue; is_difficult: boolean }>>(new Map()); // User's individual ratings
	userFavorites = $state<Set<string>>(new Set());
	userDifficultSongs = $state<Set<string>>(new Set());

	// Selected song for editing
	selectedSong = $state<Song | null>(null);

	// Derived computed values
	filteredSongsCount = $derived(this.songs.length);
	hasNextPage = $derived(this.currentPage < this.totalPages);
	hasPrevPage = $derived(this.currentPage > 1);

	// Available keys for filtering (derived from songs)
	availableKeys = $derived.by(() => {
		const keys = new Set<string>();
		this.songs.forEach((song) => {
			if (song.key_signature) {
				keys.add(song.key_signature);
			}
		});
		return Array.from(keys).sort();
	});

	// Available tags for filtering (derived from songs)
	availableTags = $derived.by(() => {
		const tags = new Set<string>();
		this.songs.forEach((song) => {
			if (song.tags) {
				song.tags.forEach((tag) => tags.add(tag));
			}
		});
		return Array.from(tags).sort();
	});

	private songsApi: SongsAPI;
	private ratingsApi: RatingsAPI;

	// Runes-first: support live auth store or static context
	private auth: RuntimeAuthStore | null = null;
	private staticContext: AuthContext | null = null;

	constructor(authInput: RuntimeAuthStore | AuthContext) {
		if (typeof (authInput as any).getAuthContext === 'function') {
			this.auth = authInput as RuntimeAuthStore;
		} else {
			this.staticContext = authInput as AuthContext;
		}

		// APIs react to auth changes
		this.songsApi = $derived.by(() => {
			const ctx = this.getAuthContext();
			return createSongsAPI(ctx, ctx.pb);
		});
		this.ratingsApi = $derived.by(() => {
			const ctx = this.getAuthContext();
			return createRatingsAPI(ctx, ctx.pb);
		});
	}

	private getAuthContext(): AuthContext {
		return this.auth ? this.auth.getAuthContext() : (this.staticContext as AuthContext);
	}

	/**
	 * Load and cache all songs with usage information (called once per session)
	 * Uses the enriched view which includes aggregates in a single query
	 */
	async loadAllSongsOnce(): Promise<void> {
		// Skip if already loaded
		if (this.allSongs.length > 0) return;

		this.loading = true;
		this.error = null;

		try {
			// Fetch all enriched songs (includes usage and rating aggregates)
			const enrichedSongs = await this.songsApi.getSongsEnriched({ showRetired: false });

			// Process enriched songs - they already have last_used_date from the view
			this.allSongs = enrichedSongs.map((song: any) => {
				// Calculate usage status from last_used_date if available
				let daysSince = Infinity;
				if (song.last_used_date) {
					const lastUsed = new Date(song.last_used_date);
					daysSince = Math.floor((Date.now() - lastUsed.getTime()) / (1000 * 60 * 60 * 24));
				}

				return {
					...song,
					lastUsedDate: song.last_used_date ? new Date(song.last_used_date) : null,
					daysSinceLastUsed: daysSince,
					usageStatus: this.calculateUsageStatus(daysSince)
				};
			});

			// Update stats - total from loaded songs, available from lightweight count
			this.stats.totalSongs = this.allSongs.length;
			this.stats.availableSongs = await this.songsApi.getAvailableSongsCount();
		} catch (error: unknown) {
			console.error('Failed to load all songs:', error);
			this.error = this.getErrorMessage(error);
		} finally {
			this.loading = false;
		}
	}

	/**
	 * Load songs with current filters and pagination
	 * Uses the enriched view which includes usage and rating aggregates
	 */
	async loadSongs(resetPage = false): Promise<void> {
		if (resetPage) {
			this.currentPage = 1;
		}

		this.loading = true;
		this.error = null;

		try {
			// Fetch enriched songs - includes songs + usage + aggregate ratings from all users
			const result = await this.songsApi.getSongsEnrichedPaginated(
				this.currentPage,
				this.perPage,
				this.filters
			);

			// Fetch current user's individual ratings in parallel
			const songIds = result.items.map((song) => song.id);
			const ratingsMap = await this.ratingsApi.getUserRatingsForSongs(songIds);

			// Transform to match our type (ensure is_difficult is always a boolean)
			this.userRatings = new Map();
			ratingsMap.forEach((rating, songId) => {
				this.userRatings.set(songId, {
					rating: rating.rating,
					is_difficult: rating.is_difficult || false
				});
			});

			// Process songs - they already have last_used_date and aggregates
			this.songs = result.items.map((song: any) => {
				// Calculate usage status from last_used_date if available
				let daysSince = Infinity;
				if (song.last_used_date) {
					const lastUsed = new Date(song.last_used_date);
					daysSince = Math.floor((Date.now() - lastUsed.getTime()) / (1000 * 60 * 60 * 24));
				}

				return {
					...song,
					lastUsedDate: song.last_used_date ? new Date(song.last_used_date) : null,
					daysSinceLastUsed: daysSince,
					usageStatus: this.calculateUsageStatus(daysSince)
				};
			});

			this.totalPages = result.totalPages;
			this.totalItems = result.totalItems;
			this.currentPage = result.page;
			this.perPage = result.perPage;

			// Update stats using data we already have + lightweight available count
			this.stats.totalSongs = result.totalItems; // Already have this from pagination!
			await this.updateAvailableSongsCount();
		} catch (error: unknown) {
			console.error('Failed to load songs:', error);
			this.error = this.getErrorMessage(error);
		} finally {
			this.loading = false;
		}
	}

	/**
	 * Load all songs without pagination (for stats and dropdowns)
	 */
	async loadAllSongs(): Promise<Song[]> {
		try {
			return await this.songsApi.getSongs();
		} catch (error: unknown) {
			console.error('Failed to load all songs:', error);
			return [];
		}
	}

	/**
	 * Create a new song
	 */
	async createSong(data: CreateSongData): Promise<Song> {
		this.loading = true;
		this.error = null;

		try {
			const newSong = await this.songsApi.createSong(data);

			// Refresh the list to include the new song
			await this.loadSongs();

			return newSong;
		} catch (error: unknown) {
			console.error('Failed to create song:', error);
			this.error = this.getErrorMessage(error);
			throw error;
		} finally {
			this.loading = false;
		}
	}

	/**
	 * Update an existing song
	 */
	async updateSong(id: string, data: UpdateSongData): Promise<Song> {
		this.loading = true;
		this.error = null;

		try {
			const updatedSong = await this.songsApi.updateSong(id, data);

			// Update the song in the local array
			const index = this.songs.findIndex((song) => song.id === id);
			if (index !== -1) {
				this.songs[index] = updatedSong;
			}

			return updatedSong;
		} catch (error: unknown) {
			console.error('Failed to update song:', error);
			this.error = this.getErrorMessage(error);
			throw error;
		} finally {
			this.loading = false;
		}
	}

	/**
	 * Delete a song (soft delete)
	 */
	async deleteSong(id: string): Promise<void> {
		this.loading = true;
		this.error = null;

		try {
			await this.songsApi.deleteSong(id);

			// Remove from local array
			this.songs = this.songs.filter((song) => song.id !== id);
			this.totalItems = Math.max(0, this.totalItems - 1);
			this.stats.totalSongs = this.totalItems;

			// Update available songs count
			await this.updateAvailableSongsCount();
		} catch (error: unknown) {
			console.error('Failed to delete song:', error);
			this.error = this.getErrorMessage(error);
			throw error;
		} finally {
			this.loading = false;
		}
	}

	/**
	 * Search songs
	 */
	async searchSongs(query: string): Promise<void> {
		this.filters.search = query;
		await this.loadSongs(true);
	}

	/**
	 * Apply filters
	 */
	async applyFilters(newFilters: Partial<SongFilterOptions>): Promise<void> {
		this.filters = { ...this.filters, ...newFilters };
		await this.loadSongs(true);
	}

	/**
	 * Clear all filters
	 */
	async clearFilters(): Promise<void> {
		this.filters = {
			search: '',
			key: '',
			tags: [],
			sort: 'title'
		};
		await this.loadSongs(true);
	}

	/**
	 * Navigate to next page
	 */
	async nextPage(): Promise<void> {
		if (this.hasNextPage) {
			this.currentPage += 1;
			await this.loadSongs();
		}
	}

	/**
	 * Navigate to previous page
	 */
	async prevPage(): Promise<void> {
		if (this.hasPrevPage) {
			this.currentPage -= 1;
			await this.loadSongs();
		}
	}

	/**
	 * Go to specific page
	 */
	async goToPage(page: number): Promise<void> {
		if (page >= 1 && page <= this.totalPages && page !== this.currentPage) {
			this.currentPage = page;
			await this.loadSongs();
		}
	}

	/**
	 * Update only the available songs count (we already have total from pagination)
	 */
	private async updateAvailableSongsCount(): Promise<void> {
		try {
			this.stats.availableSongs = await this.songsApi.getAvailableSongsCount();
		} catch (error) {
			console.error('Failed to update available songs count:', error);
		}
	}

	/**
	 * Check if song was recently used (within last 2 weeks)
	 */
	private isRecentlyUsed(song: Song): boolean {
		return song.usageStatus === 'recent';
	}

	/**
	 * Calculate usage status based on days since last use
	 * - recent (red): Used in last 14 days (last 2 weeks)
	 * - available (green): 14-179 days (available for rotation)
	 * - stale (gray): 180+ days (6+ months, consider refreshing)
	 */
	private calculateUsageStatus(daysSince: number): 'available' | 'caution' | 'recent' | 'stale' {
		if (daysSince < 14) {
			return 'recent'; // Used last 2 weeks
		} else if (daysSince < 180) {
			return 'available'; // Good to use
		} else {
			return 'stale'; // Unused for 6+ months
		}
	}

	/**
	 * Get most frequently used key
	 */
	private getMostUsedKey(songs: Song[]): string | undefined {
		const keyCounts = new Map<string, number>();

		songs.forEach((song) => {
			if (song.key_signature) {
				keyCounts.set(song.key_signature, (keyCounts.get(song.key_signature) || 0) + 1);
			}
		});

		let mostUsedKey = '';
		let maxCount = 0;

		keyCounts.forEach((count, key) => {
			if (count > maxCount) {
				maxCount = count;
				mostUsedKey = key;
			}
		});

		return mostUsedKey || undefined;
	}

	/**
	 * Calculate average tempo
	 */
	private getAverageTempo(songs: Song[]): number | undefined {
		const songsWithTempo = songs.filter((song) => song.tempo && song.tempo > 0);

		if (songsWithTempo.length === 0) return undefined;

		const totalTempo = songsWithTempo.reduce((sum, song) => sum + (song.tempo || 0), 0);
		return Math.round(totalTempo / songsWithTempo.length);
	}

	/**
	 * Select a song for editing
	 */
	selectSong(song: Song | null): void {
		this.selectedSong = song;
	}

	/**
	 * Get error message from API error
	 */
	private getErrorMessage(error: unknown): string {
		if (error && typeof error === 'object' && 'response' in error) {
			const apiError = error as { response?: { data?: { message?: string } } };
			if (apiError.response?.data?.message) {
				return apiError.response.data.message;
			}
		}
		if (error instanceof Error) {
			return error.message;
		}
		return 'An unexpected error occurred';
	}

	/**
	 * Clear error state
	 */
	clearError(): void {
		this.error = null;
	}

	/**
	 * Get songs grouped by category with category information
	 */
	async getSongsByCategory(): Promise<
		Map<string, { category: Record<string, unknown>; songs: Song[] }>
	> {
		try {
			// Load all songs with expanded category information
			const allSongs = await this.songsApi.getSongs({});

			// Group songs by category
			const categoryMap = new Map<string, { category: Record<string, unknown>; songs: Song[] }>();

			allSongs.forEach((song) => {
				const categoryId = song.category;
				const categoryInfo = song.expand?.category;

				if (!categoryMap.has(categoryId)) {
					const category = categoryInfo || {
						id: categoryId || 'unknown-category',
						name: 'Unknown Category'
					};
					categoryMap.set(categoryId, {
						category: category as Record<string, unknown>,
						songs: []
					});
				}

				categoryMap.get(categoryId)!.songs.push(song);
			});

			// Sort songs within each category by title
			categoryMap.forEach(({ songs }) => {
				songs.sort((a, b) => a.title.localeCompare(b.title));
			});

			return categoryMap;
		} catch (error) {
			console.error('Failed to get songs by category:', error);
			throw error;
		}
	}

	/**
	 * Get songs grouped by label (theme) - uses cached allSongs
	 */
	async getSongsByLabel(): Promise<
		Map<string, { label: { id: string; name: string; color?: string }; songs: Song[] }>
	> {
		try {
			// Ensure all songs are loaded first
			await this.loadAllSongsOnce();

			// Use the cached enriched songs
			const enrichedSongs = this.allSongs;

			// Group songs by label
			const labelMap = new Map<
				string,
				{ label: { id: string; name: string; color?: string }; songs: Song[] }
			>();

			enrichedSongs.forEach((song) => {
				const hasLabels = song.labels && song.labels.length > 0;
				const expandedLabels = song.expand?.labels || [];

				if (!hasLabels) {
					// Handle uncategorized
					const noLabelId = 'uncategorized';
					if (!labelMap.has(noLabelId)) {
						labelMap.set(noLabelId, {
							label: {
								id: noLabelId,
								name: 'Uncategorized',
								color: 'gray'
							},
							songs: []
						});
					}
					labelMap.get(noLabelId)!.songs.push(song);
				} else {
					// Add song to each of its label groups
					song.labels!.forEach((labelId) => {
						const labelInfo = expandedLabels.find((l) => l.id === labelId);

						if (!labelMap.has(labelId)) {
							const label = labelInfo || {
								id: labelId,
								name: 'Unknown Label',
								color: undefined
							};
							labelMap.set(labelId, {
								label: {
									id: label.id,
									name: label.name,
									color: label.color
								},
								songs: []
							});
						}
						labelMap.get(labelId)!.songs.push(song);
					});
				}
			});

			// Sort songs within each label by title
			labelMap.forEach(({ songs }) => {
				songs.sort((a, b) => a.title.localeCompare(b.title));
			});
			
			// Sort the map itself by label name (needs conversion to array and back usually, but Map preserves insertion order)
			// We will sort keys and rebuild map
			const sortedMap = new Map(
				[...labelMap.entries()].sort((a, b) => {
					// Put Uncategorized at the end
					if (a[0] === 'uncategorized') return 1;
					if (b[0] === 'uncategorized') return -1;
					return a[1].label.name.localeCompare(b[1].label.name);
				})
			);

			return sortedMap;
		} catch (error) {
			console.error('Failed to get songs by label:', error);
			throw error;
		}
	}

	/**
	 * Load user's favorite and difficult songs
	 */
	async loadUserPreferences(): Promise<void> {
		try {
			const [favorites, difficultSongs] = await Promise.all([
				this.ratingsApi.getUserFavorites(),
				this.ratingsApi.getUserDifficultSongs()
			]);

			this.userFavorites = new Set(favorites);
			this.userDifficultSongs = new Set(difficultSongs);
		} catch (error) {
			console.error('Failed to load user preferences:', error);
		}
	}

	/**
	 * Retire a song
	 */
	async retireSong(songId: string, reason?: string): Promise<void> {
		try {
			await this.songsApi.retireSong(songId, reason);

			// Update local state
			const index = this.songs.findIndex((s) => s.id === songId);
			if (index !== -1) {
				this.songs[index] = {
					...this.songs[index],
					is_retired: true,
					retired_date: new Date().toISOString(),
					retired_reason: reason || 'manual'
				};
			}

			// Reload if showing retired filter
			if (this.filters.showRetired) {
				await this.loadSongs();
			}
		} catch (error) {
			this.error = this.getErrorMessage(error);
			throw error;
		}
	}

	/**
	 * Unretire a song
	 */
	async unretireSong(songId: string): Promise<void> {
		try {
			await this.songsApi.unretireSong(songId);

			// Update local state
			const index = this.songs.findIndex((s) => s.id === songId);
			if (index !== -1) {
				this.songs[index] = {
					...this.songs[index],
					is_retired: false,
					retired_date: undefined,
					retired_reason: undefined
				};
			}

			// Reload if not showing retired filter
			if (!this.filters.showRetired) {
				await this.loadSongs();
			}
		} catch (error) {
			this.error = this.getErrorMessage(error);
			throw error;
		}
	}

	/**
	 * Handle auto-retire event
	 */
	async handleAutoRetire(songId: string): Promise<void> {
		const song = this.songs.find((s) => s.id === songId);
		if (song) {
			await this.retireSong(songId, 'all_thumbs_down');

			// Trigger notification event for other components to handle
			window.dispatchEvent(
				new CustomEvent('song-retired', {
					detail: {
						songId,
						songTitle: song.title,
						reason: 'all_thumbs_down'
					}
				})
			);
		}
	}

	/**
	 * Subscribe to real-time updates
	 */
	async subscribeToUpdates(): Promise<() => void> {
		return await this.songsApi.subscribe((data: unknown) => {
			console.log('Real-time song update:', data);

			// Type-safe access to event data
			const eventData = data as {
				action: string;
				record: { id: string } & Record<string, unknown>;
			};

			if (eventData.action === 'create') {
				// Add new song to the beginning of the list if it matches current filters
				this.songs = [eventData.record as unknown as Song, ...this.songs];
				this.totalItems += 1;
			} else if (eventData.action === 'update') {
				// Update existing song
				const index = this.songs.findIndex((s) => s.id === eventData.record.id);
				if (index !== -1) {
					this.songs[index] = eventData.record as unknown as Song;
				}
			} else if (eventData.action === 'delete') {
				// Remove deleted song
				this.songs = this.songs.filter((s) => s.id !== eventData.record.id);
				this.totalItems = Math.max(0, this.totalItems - 1);
			}
		});
	}
}

// Export the class type for tests
export type { SongsStore };

// Factory function for creating new store instances
export function createSongsStore(auth: RuntimeAuthStore | AuthContext): SongsStore {
	return new SongsStore(auth);
}
