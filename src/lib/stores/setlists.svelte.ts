import { setlistsApi } from '$lib/api/setlists';
import type {
	Setlist,
	SetlistSong,
	CreateSetlistData,
	UpdateSetlistData,
	SetlistFilterOptions,
	CreateSetlistSongData,
	UpdateSetlistSongData,
	SetlistBuilderState,
	SongAvailability
} from '$lib/types/setlist';
import type { Song } from '$lib/types/song';

class SetlistsStore {
	// Reactive state using Svelte 5 runes
	setlists = $state<Setlist[]>([]);
	loading = $state<boolean>(false);
	error = $state<string | null>(null);

	// Current setlist being edited
	currentSetlist = $state<Setlist | null>(null);
	currentSetlistSongs = $state<SetlistSong[]>([]);

	// Filter state
	filters = $state<SetlistFilterOptions>({
		search: '',
		status: undefined,
		sort: '-service_date'
	});

	// Templates
	templates = $state<Setlist[]>([]);

	// Upcoming setlists
	upcomingSetlists = $state<Setlist[]>([]);

	// Builder state
	builderState = $state<SetlistBuilderState>({
		setlist: null,
		songs: [],
		isLoading: false,
		isDirty: false,
		error: null,
		draggedSong: null,
		selectedSongs: []
	});

	// Derived computed values
	filteredSetlistsCount = $derived(this.setlists.length);
	currentSetlistDuration = $derived(() => {
		return this.currentSetlistSongs.reduce((total, song) => {
			return total + (song.duration_override || song.expand?.song_id?.duration_seconds || 0);
		}, 0);
	});

	hasUnsavedChanges = $derived(this.builderState.isDirty);

	/**
	 * Load setlists with current filters
	 */
	async loadSetlists(): Promise<void> {
		this.loading = true;
		this.error = null;

		try {
			this.setlists = await setlistsApi.getSetlists(this.filters);
		} catch (error: any) {
			console.error('Failed to load setlists:', error);
			this.error = this.getErrorMessage(error);
		} finally {
			this.loading = false;
		}
	}

	/**
	 * Load upcoming setlists
	 */
	async loadUpcomingSetlists(limit = 10): Promise<void> {
		try {
			this.upcomingSetlists = await setlistsApi.getUpcomingSetlists(limit);
		} catch (error: any) {
			console.error('Failed to load upcoming setlists:', error);
		}
	}

	/**
	 * Load setlist templates
	 */
	async loadTemplates(): Promise<void> {
		try {
			this.templates = await setlistsApi.getTemplates();
		} catch (error: any) {
			console.error('Failed to load templates:', error);
		}
	}

	/**
	 * Load a specific setlist with its songs
	 */
	async loadSetlist(id: string): Promise<void> {
		this.loading = true;
		this.error = null;

		try {
			const [setlist, songs] = await Promise.all([
				setlistsApi.getSetlist(id),
				setlistsApi.getSetlistSongs(id)
			]);

			this.currentSetlist = setlist;
			this.currentSetlistSongs = songs;

			// Update builder state
			this.builderState.setlist = setlist;
			this.builderState.songs = songs;
			this.builderState.isDirty = false;
		} catch (error: any) {
			console.error('Failed to load setlist:', error);
			this.error = this.getErrorMessage(error);
		} finally {
			this.loading = false;
		}
	}

	/**
	 * Create a new setlist
	 */
	async createSetlist(data: CreateSetlistData): Promise<Setlist> {
		this.loading = true;
		this.error = null;

		try {
			const newSetlist = await setlistsApi.createSetlist(data);

			// Add to local array
			this.setlists = [newSetlist, ...this.setlists];

			return newSetlist;
		} catch (error: any) {
			console.error('Failed to create setlist:', error);
			this.error = this.getErrorMessage(error);
			throw error;
		} finally {
			this.loading = false;
		}
	}

	/**
	 * Update an existing setlist
	 */
	async updateSetlist(id: string, data: UpdateSetlistData): Promise<Setlist> {
		this.loading = true;
		this.error = null;

		try {
			const updatedSetlist = await setlistsApi.updateSetlist(id, data);

			// Update in local array
			const index = this.setlists.findIndex((setlist) => setlist.id === id);
			if (index !== -1) {
				this.setlists[index] = updatedSetlist;
			}

			// Update current setlist if it's the one being edited
			if (this.currentSetlist?.id === id) {
				this.currentSetlist = updatedSetlist;
				this.builderState.setlist = updatedSetlist;
			}

			return updatedSetlist;
		} catch (error: any) {
			console.error('Failed to update setlist:', error);
			this.error = this.getErrorMessage(error);
			throw error;
		} finally {
			this.loading = false;
		}
	}

	/**
	 * Delete a setlist
	 */
	async deleteSetlist(id: string): Promise<void> {
		this.loading = true;
		this.error = null;

		try {
			await setlistsApi.deleteSetlist(id);

			// Remove from local array
			this.setlists = this.setlists.filter((setlist) => setlist.id !== id);

			// Clear current setlist if it was deleted
			if (this.currentSetlist?.id === id) {
				this.currentSetlist = null;
				this.currentSetlistSongs = [];
				this.clearBuilderState();
			}
		} catch (error: any) {
			console.error('Failed to delete setlist:', error);
			this.error = this.getErrorMessage(error);
			throw error;
		} finally {
			this.loading = false;
		}
	}

	/**
	 * Add a song to the current setlist
	 */
	async addSongToSetlist(songData: CreateSetlistSongData): Promise<void> {
		if (!this.currentSetlist) {
			throw new Error('No setlist selected');
		}

		this.builderState.isLoading = true;
		this.builderState.error = null;

		try {
			const setlistSong = await setlistsApi.addSongToSetlist({
				...songData,
				setlist_id: this.currentSetlist.id
			});

			// Add to local array
			this.currentSetlistSongs = [...this.currentSetlistSongs, setlistSong].sort(
				(a, b) => a.order_position - b.order_position
			);

			// Update builder state
			this.builderState.songs = this.currentSetlistSongs;
			this.builderState.isDirty = true;
		} catch (error: any) {
			console.error('Failed to add song to setlist:', error);
			this.builderState.error = this.getErrorMessage(error);
			throw error;
		} finally {
			this.builderState.isLoading = false;
		}
	}

	/**
	 * Remove a song from the current setlist
	 */
	async removeSongFromSetlist(setlistSongId: string): Promise<void> {
		this.builderState.isLoading = true;
		this.builderState.error = null;

		try {
			await setlistsApi.removeSongFromSetlist(setlistSongId);

			// Remove from local array
			this.currentSetlistSongs = this.currentSetlistSongs.filter(
				(song) => song.id !== setlistSongId
			);

			// Update builder state
			this.builderState.songs = this.currentSetlistSongs;
			this.builderState.isDirty = true;
		} catch (error: any) {
			console.error('Failed to remove song from setlist:', error);
			this.builderState.error = this.getErrorMessage(error);
			throw error;
		} finally {
			this.builderState.isLoading = false;
		}
	}

	/**
	 * Update a song in the setlist
	 */
	async updateSetlistSong(id: string, data: UpdateSetlistSongData): Promise<void> {
		this.builderState.isLoading = true;
		this.builderState.error = null;

		try {
			const updatedSong = await setlistsApi.updateSetlistSong(id, data);

			// Update in local array
			const index = this.currentSetlistSongs.findIndex((song) => song.id === id);
			if (index !== -1) {
				this.currentSetlistSongs[index] = updatedSong;
			}

			// Update builder state
			this.builderState.songs = this.currentSetlistSongs;
			this.builderState.isDirty = true;
		} catch (error: any) {
			console.error('Failed to update setlist song:', error);
			this.builderState.error = this.getErrorMessage(error);
			throw error;
		} finally {
			this.builderState.isLoading = false;
		}
	}

	/**
	 * Reorder songs in the setlist
	 */
	async reorderSetlistSongs(songOrder: Array<{ id: string; position: number }>): Promise<void> {
		if (!this.currentSetlist) return;

		this.builderState.isLoading = true;
		this.builderState.error = null;

		try {
			await setlistsApi.reorderSetlistSongs(this.currentSetlist.id, songOrder);

			// Update local positions
			songOrder.forEach(({ id, position }) => {
				const song = this.currentSetlistSongs.find((s) => s.id === id);
				if (song) {
					song.order_position = position;
				}
			});

			// Re-sort the array
			this.currentSetlistSongs.sort((a, b) => a.order_position - b.order_position);

			// Update builder state
			this.builderState.songs = this.currentSetlistSongs;
			this.builderState.isDirty = true;
		} catch (error: any) {
			console.error('Failed to reorder setlist songs:', error);
			this.builderState.error = this.getErrorMessage(error);
			throw error;
		} finally {
			this.builderState.isLoading = false;
		}
	}

	/**
	 * Duplicate a setlist
	 */
	async duplicateSetlist(id: string, newData: Partial<CreateSetlistData> = {}): Promise<Setlist> {
		this.loading = true;
		this.error = null;

		try {
			const duplicatedSetlist = await setlistsApi.duplicateSetlist(id, newData);

			// Add to local array
			this.setlists = [duplicatedSetlist, ...this.setlists];

			return duplicatedSetlist;
		} catch (error: any) {
			console.error('Failed to duplicate setlist:', error);
			this.error = this.getErrorMessage(error);
			throw error;
		} finally {
			this.loading = false;
		}
	}

	/**
	 * Complete a setlist and trigger usage tracking
	 */
	async completeSetlist(id: string, actualDuration?: number): Promise<void> {
		this.loading = true;
		this.error = null;

		try {
			const completedSetlist = await setlistsApi.completeSetlist(id, actualDuration);

			// Update in local array
			const index = this.setlists.findIndex((setlist) => setlist.id === id);
			if (index !== -1) {
				this.setlists[index] = completedSetlist;
			}

			// Update current setlist if it's the one being completed
			if (this.currentSetlist?.id === id) {
				this.currentSetlist = completedSetlist;
				this.builderState.setlist = completedSetlist;
			}
		} catch (error: any) {
			console.error('Failed to complete setlist:', error);
			this.error = this.getErrorMessage(error);
			throw error;
		} finally {
			this.loading = false;
		}
	}

	/**
	 * Check song availability based on recent usage
	 */
	async checkSongAvailability(songIds: string[]): Promise<Map<string, SongAvailability>> {
		const availabilityMap = new Map<string, SongAvailability>();

		try {
			// This would need to query the song_usage collection
			// For now, return placeholder data
			songIds.forEach((songId) => {
				availabilityMap.set(songId, {
					songId,
					status: 'available',
					message: 'Available for use'
				});
			});
		} catch (error) {
			console.error('Failed to check song availability:', error);
		}

		return availabilityMap;
	}

	/**
	 * Apply filters to setlists
	 */
	async applyFilters(newFilters: Partial<SetlistFilterOptions>): Promise<void> {
		this.filters = { ...this.filters, ...newFilters };
		await this.loadSetlists();
	}

	/**
	 * Clear all filters
	 */
	async clearFilters(): Promise<void> {
		this.filters = {
			search: '',
			status: undefined,
			sort: '-service_date'
		};
		await this.loadSetlists();
	}

	/**
	 * Search setlists
	 */
	async searchSetlists(query: string): Promise<void> {
		this.filters.search = query;
		await this.loadSetlists();
	}

	/**
	 * Clear builder state
	 */
	clearBuilderState(): void {
		this.builderState = {
			setlist: null,
			songs: [],
			isLoading: false,
			isDirty: false,
			error: null,
			draggedSong: null,
			selectedSongs: []
		};
	}

	/**
	 * Set drag state
	 */
	setDraggedSong(song: any): void {
		this.builderState.draggedSong = song;
	}

	/**
	 * Clear drag state
	 */
	clearDraggedSong(): void {
		this.builderState.draggedSong = null;
	}

	/**
	 * Toggle song selection
	 */
	toggleSongSelection(songId: string): void {
		const index = this.builderState.selectedSongs.indexOf(songId);
		if (index > -1) {
			this.builderState.selectedSongs.splice(index, 1);
		} else {
			this.builderState.selectedSongs.push(songId);
		}
	}

	/**
	 * Clear song selections
	 */
	clearSongSelections(): void {
		this.builderState.selectedSongs = [];
	}

	/**
	 * Mark builder as dirty
	 */
	markDirty(): void {
		this.builderState.isDirty = true;
	}

	/**
	 * Mark builder as clean
	 */
	markClean(): void {
		this.builderState.isDirty = false;
	}

	/**
	 * Get error message from API error
	 */
	private getErrorMessage(error: any): string {
		if (error?.response?.data?.message) {
			return error.response.data.message;
		}
		if (error?.message) {
			return error.message;
		}
		return 'An unexpected error occurred';
	}

	/**
	 * Clear error state
	 */
	clearError(): void {
		this.error = null;
		this.builderState.error = null;
	}

	/**
	 * Subscribe to real-time updates for setlists
	 */
	async subscribeToSetlists(): Promise<() => void> {
		return await setlistsApi.subscribeToSetlists((data) => {
			console.log('Real-time setlist update:', data);

			if (data.action === 'create') {
				this.setlists = [data.record as unknown as Setlist, ...this.setlists];
			} else if (data.action === 'update') {
				const index = this.setlists.findIndex((s) => s.id === data.record.id);
				if (index !== -1) {
					this.setlists[index] = data.record as unknown as Setlist;
				}

				// Update current setlist if it's the one being updated
				if (this.currentSetlist?.id === data.record.id) {
					this.currentSetlist = data.record as unknown as Setlist;
					this.builderState.setlist = this.currentSetlist;
				}
			} else if (data.action === 'delete') {
				this.setlists = this.setlists.filter((s) => s.id !== data.record.id);

				// Clear current setlist if it was deleted
				if (this.currentSetlist?.id === data.record.id) {
					this.currentSetlist = null;
					this.currentSetlistSongs = [];
					this.clearBuilderState();
				}
			}
		});
	}

	/**
	 * Subscribe to real-time updates for setlist songs
	 */
	async subscribeToSetlistSongs(setlistId: string): Promise<() => void> {
		return await setlistsApi.subscribeToSetlistSongs(setlistId, (data) => {
			console.log('Real-time setlist song update:', data);

			if (data.action === 'create') {
				const newSong = data.record as unknown as SetlistSong;
				this.currentSetlistSongs = [...this.currentSetlistSongs, newSong].sort(
					(a, b) => a.order_position - b.order_position
				);
				this.builderState.songs = this.currentSetlistSongs;
			} else if (data.action === 'update') {
				const index = this.currentSetlistSongs.findIndex((s) => s.id === data.record.id);
				if (index !== -1) {
					this.currentSetlistSongs[index] = data.record as unknown as SetlistSong;
					this.builderState.songs = this.currentSetlistSongs;
				}
			} else if (data.action === 'delete') {
				this.currentSetlistSongs = this.currentSetlistSongs.filter((s) => s.id !== data.record.id);
				this.builderState.songs = this.currentSetlistSongs;
			}
		});
	}
}

// Export singleton instance
export const setlistsStore = new SetlistsStore();
