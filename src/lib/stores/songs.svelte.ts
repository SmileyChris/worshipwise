import { createSongsAPI } from '$lib/api/songs';
import type { SongsAPI } from '$lib/api/songs';
import type { AuthContext } from '$lib/types/auth';
import { pb } from '$lib/api/client';
import type {
	Song,
	CreateSongData,
	UpdateSongData,
	SongFilterOptions,
	SongStats
} from '$lib/types/song';

class SongsStore {
	private songsApi: SongsAPI;

	// Reactive state using Svelte 5 runes
	songs = $state<Song[]>([]);
	loading = $state<boolean>(false);
	error = $state<string | null>(null);

	// Pagination state
	currentPage = $state<number>(1);
	totalPages = $state<number>(1);
	totalItems = $state<number>(0);
	perPage = $state<number>(20);

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

	constructor(authContext: AuthContext) {
		this.songsApi = createSongsAPI(authContext, pb);
	}

	/**
	 * Load songs with current filters and pagination
	 */
	async loadSongs(resetPage = false): Promise<void> {
		if (resetPage) {
			this.currentPage = 1;
		}

		this.loading = true;
		this.error = null;

		try {
			const result = await this.songsApi.getSongsPaginated(
				this.currentPage,
				this.perPage,
				this.filters
			);

			// Load usage information for all songs
			const songIds = result.items.map((song) => song.id);
			const usageMap = await this.songsApi.getSongsUsageInfo(songIds);

			// Enhance songs with usage information
			this.songs = result.items.map((song) => {
				const usage = usageMap.get(song.id);
				if (usage) {
					return {
						...song,
						lastUsedDate: usage.lastUsed,
						daysSinceLastUsed: usage.daysSince,
						usageStatus: this.calculateUsageStatus(usage.daysSince)
					};
				}
				return {
					...song,
					lastUsedDate: null,
					daysSinceLastUsed: Infinity,
					usageStatus: 'available' as const
				};
			});

			this.totalPages = result.totalPages;
			this.totalItems = result.totalItems;
			this.currentPage = result.page;
			this.perPage = result.perPage;

			// Update stats
			await this.updateStats();
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

			// Update stats
			await this.updateStats();
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
	 * Update statistics
	 */
	private async updateStats(): Promise<void> {
		try {
			const allSongs = await this.loadAllSongs();

			this.stats = {
				totalSongs: allSongs.length,
				availableSongs: allSongs.filter((song) => !this.isRecentlyUsed(song)).length,
				recentlyUsed: allSongs.filter((song) => this.isRecentlyUsed(song)).length,
				mostUsedKey: this.getMostUsedKey(allSongs),
				averageTempo: this.getAverageTempo(allSongs)
			};
		} catch (error) {
			console.error('Failed to update stats:', error);
		}
	}

	/**
	 * Check if song was recently used
	 */
	private isRecentlyUsed(song: Song): boolean {
		return song.usageStatus === 'recent';
	}

	/**
	 * Calculate usage status based on days since last use
	 */
	private calculateUsageStatus(daysSince: number): 'available' | 'caution' | 'recent' {
		if (daysSince < 14) {
			return 'recent';
		} else if (daysSince < 28) {
			return 'caution';
		} else {
			return 'available';
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
export function createSongsStore(authContext: AuthContext): SongsStore {
	return new SongsStore(authContext);
}
