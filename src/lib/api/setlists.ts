import { pb } from './client';
import type {
	Setlist,
	CreateSetlistData,
	UpdateSetlistData,
	SetlistFilterOptions,
	SetlistSong,
	CreateSetlistSongData,
	UpdateSetlistSongData
} from '$lib/types/setlist';

export class SetlistsAPI {
	private collection = 'setlists';
	private setlistSongsCollection = 'setlist_songs';

	/**
	 * Get all setlists with optional filtering
	 */
	async getSetlists(options: SetlistFilterOptions = {}): Promise<Setlist[]> {
		try {
			let filter = '';
			const filterParts: string[] = [];

			// Add search filter
			if (options.search) {
				filterParts.push(`(title ~ "${options.search}" || theme ~ "${options.search}")`);
			}

			// Add status filter
			if (options.status) {
				filterParts.push(`status = "${options.status}"`);
			}

			// Add service type filter
			if (options.serviceType) {
				filterParts.push(`service_type = "${options.serviceType}"`);
			}

			// Add worship leader filter
			if (options.worshipLeader) {
				filterParts.push(`worship_leader = "${options.worshipLeader}"`);
			}

			// Add date range filters
			if (options.dateFrom) {
				filterParts.push(`service_date >= "${options.dateFrom}"`);
			}
			if (options.dateTo) {
				filterParts.push(`service_date <= "${options.dateTo}"`);
			}

			// Add template filter
			if (options.templatesOnly) {
				filterParts.push('is_template = true');
			} else if (options.excludeTemplates) {
				filterParts.push('is_template = false');
			}

			// Combine filters
			if (filterParts.length > 0) {
				filter = filterParts.join(' && ');
			}

			const records = await pb.collection(this.collection).getFullList({
				filter,
				sort: options.sort || '-service_date',
				expand: 'worship_leader,team_members,created_by'
			});

			return records as unknown as Setlist[];
		} catch (error) {
			console.error('Failed to fetch setlists:', error);
			throw error;
		}
	}

	/**
	 * Get a single setlist by ID with songs
	 */
	async getSetlist(id: string): Promise<Setlist> {
		try {
			const record = await pb.collection(this.collection).getOne(id, {
				expand: 'worship_leader,team_members,created_by'
			});
			return record as unknown as Setlist;
		} catch (error) {
			console.error('Failed to fetch setlist:', error);
			throw error;
		}
	}

	/**
	 * Get setlist songs for a specific setlist
	 */
	async getSetlistSongs(setlistId: string): Promise<SetlistSong[]> {
		try {
			const records = await pb.collection(this.setlistSongsCollection).getFullList({
				filter: `setlist_id = "${setlistId}"`,
				sort: 'order_position',
				expand: 'song_id,added_by'
			});

			return records as unknown as SetlistSong[];
		} catch (error) {
			console.error('Failed to fetch setlist songs:', error);
			throw error;
		}
	}

	/**
	 * Create a new setlist
	 */
	async createSetlist(data: CreateSetlistData): Promise<Setlist> {
		try {
			const setlistData = {
				...data,
				created_by: pb.authStore.model?.id || '',
				status: data.status || 'draft'
			};

			const record = await pb.collection(this.collection).create(setlistData);
			return record as unknown as Setlist;
		} catch (error) {
			console.error('Failed to create setlist:', error);
			throw error;
		}
	}

	/**
	 * Update an existing setlist
	 */
	async updateSetlist(id: string, data: UpdateSetlistData): Promise<Setlist> {
		try {
			const record = await pb.collection(this.collection).update(id, data);
			return record as unknown as Setlist;
		} catch (error) {
			console.error('Failed to update setlist:', error);
			throw error;
		}
	}

	/**
	 * Delete a setlist
	 */
	async deleteSetlist(id: string): Promise<void> {
		try {
			await pb.collection(this.collection).delete(id);
		} catch (error) {
			console.error('Failed to delete setlist:', error);
			throw error;
		}
	}

	/**
	 * Add a song to a setlist
	 */
	async addSongToSetlist(data: CreateSetlistSongData): Promise<SetlistSong> {
		try {
			// Get the next position in the setlist
			const existingSongs = await this.getSetlistSongs(data.setlist_id);
			const nextPosition = existingSongs.length + 1;

			const setlistSongData = {
				...data,
				order_position: data.order_position || nextPosition,
				added_by: pb.authStore.model?.id || ''
			};

			const record = await pb.collection(this.setlistSongsCollection).create(setlistSongData);
			return record as unknown as SetlistSong;
		} catch (error) {
			console.error('Failed to add song to setlist:', error);
			throw error;
		}
	}

	/**
	 * Update a song in a setlist
	 */
	async updateSetlistSong(id: string, data: UpdateSetlistSongData): Promise<SetlistSong> {
		try {
			const record = await pb.collection(this.setlistSongsCollection).update(id, data);
			return record as unknown as SetlistSong;
		} catch (error) {
			console.error('Failed to update setlist song:', error);
			throw error;
		}
	}

	/**
	 * Remove a song from a setlist
	 */
	async removeSongFromSetlist(setlistSongId: string): Promise<void> {
		try {
			await pb.collection(this.setlistSongsCollection).delete(setlistSongId);
		} catch (error) {
			console.error('Failed to remove song from setlist:', error);
			throw error;
		}
	}

	/**
	 * Reorder songs in a setlist
	 */
	async reorderSetlistSongs(
		setlistId: string,
		songOrder: Array<{ id: string; position: number }>
	): Promise<void> {
		try {
			// Update each song's position
			const updates = songOrder.map(({ id, position }) =>
				pb.collection(this.setlistSongsCollection).update(id, { order_position: position })
			);

			await Promise.all(updates);
		} catch (error) {
			console.error('Failed to reorder setlist songs:', error);
			throw error;
		}
	}

	/**
	 * Duplicate a setlist
	 */
	async duplicateSetlist(id: string, newData: Partial<CreateSetlistData> = {}): Promise<Setlist> {
		try {
			// Get the original setlist
			const original = await this.getSetlist(id);
			const originalSongs = await this.getSetlistSongs(id);

			// Create new setlist data
			const duplicateData: CreateSetlistData = {
				title: newData.title || `${original.title} (Copy)`,
				service_date: newData.service_date || original.service_date,
				service_type: newData.service_type || original.service_type,
				theme: newData.theme || original.theme,
				notes: newData.notes || original.notes,
				worship_leader: newData.worship_leader || original.worship_leader,
				team_members: newData.team_members || original.team_members,
				estimated_duration: newData.estimated_duration || original.estimated_duration,
				is_template: newData.is_template || false,
				status: newData.status || 'draft'
			};

			// Create the new setlist
			const newSetlist = await this.createSetlist(duplicateData);

			// Add all songs from the original setlist
			for (const song of originalSongs) {
				await this.addSongToSetlist({
					setlist_id: newSetlist.id,
					song_id: song.song_id,
					order_position: song.order_position,
					transposed_key: song.transposed_key,
					tempo_override: song.tempo_override,
					transition_notes: song.transition_notes,
					section_type: song.section_type,
					duration_override: song.duration_override
				});
			}

			return newSetlist;
		} catch (error) {
			console.error('Failed to duplicate setlist:', error);
			throw error;
		}
	}

	/**
	 * Mark setlist as completed and trigger usage tracking
	 */
	async completeSetlist(id: string, actualDuration?: number): Promise<Setlist> {
		try {
			// Update setlist status
			const updateData: UpdateSetlistData = {
				status: 'completed'
			};

			if (actualDuration) {
				updateData.actual_duration = actualDuration;
			}

			const updatedSetlist = await this.updateSetlist(id, updateData);

			// Trigger usage tracking
			await this.trackSetlistUsage(id);

			return updatedSetlist;
		} catch (error) {
			console.error('Failed to complete setlist:', error);
			throw error;
		}
	}

	/**
	 * Track usage for all songs in a completed setlist
	 */
	private async trackSetlistUsage(setlistId: string): Promise<void> {
		try {
			const setlist = await this.getSetlist(setlistId);
			const songs = await this.getSetlistSongs(setlistId);

			// Create usage records for each song
			const usagePromises = songs.map((song) =>
				pb.collection('song_usage').create({
					song_id: song.song_id,
					setlist_id: setlistId,
					used_date: setlist.service_date,
					used_key: song.transposed_key || '',
					position_in_setlist: song.order_position,
					worship_leader: setlist.worship_leader,
					service_type: setlist.service_type || ''
				})
			);

			await Promise.all(usagePromises);
		} catch (error) {
			console.error('Failed to track setlist usage:', error);
			throw error;
		}
	}

	/**
	 * Get upcoming setlists
	 */
	async getUpcomingSetlists(limit = 10): Promise<Setlist[]> {
		try {
			const today = new Date().toISOString().split('T')[0];

			const records = await pb.collection(this.collection).getFullList({
				filter: `service_date >= "${today}" && is_template = false`,
				sort: 'service_date',
				limit,
				expand: 'worship_leader'
			});

			return records as unknown as Setlist[];
		} catch (error) {
			console.error('Failed to fetch upcoming setlists:', error);
			throw error;
		}
	}

	/**
	 * Get setlist templates
	 */
	async getTemplates(): Promise<Setlist[]> {
		try {
			const records = await pb.collection(this.collection).getFullList({
				filter: 'is_template = true',
				sort: '-created',
				expand: 'created_by'
			});

			return records as unknown as Setlist[];
		} catch (error) {
			console.error('Failed to fetch setlist templates:', error);
			throw error;
		}
	}

	/**
	 * Subscribe to real-time updates for setlists
	 */
	subscribeToSetlists(callback: (data: any) => void) {
		return pb.collection(this.collection).subscribe('*', callback);
	}

	/**
	 * Subscribe to real-time updates for setlist songs
	 */
	subscribeToSetlistSongs(setlistId: string, callback: (data: any) => void) {
		return pb.collection(this.setlistSongsCollection).subscribe('*', callback, {
			filter: `setlist_id = "${setlistId}"`
		});
	}
}

// Export singleton instance
export const setlistsApi = new SetlistsAPI();
