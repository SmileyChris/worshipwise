import type PocketBase from 'pocketbase';
import type { AuthContext } from '$lib/types/auth';
import type { SongSuggestion, CreateSongSuggestionData } from '$lib/types/song';

export class SuggestionsAPI {
	private collection = 'song_suggestions';

	constructor(
		private authContext: AuthContext,
		private pb: PocketBase
	) {}

	/**
	 * Get all suggestions for the current church
	 */
	async getSuggestions(status?: 'pending' | 'approved' | 'rejected'): Promise<SongSuggestion[]> {
		try {
			if (!this.authContext.currentChurch?.id) {
				throw new Error('No church selected');
			}

			let filter = `church_id = "${this.authContext.currentChurch.id}"`;
			if (status) {
				filter += ` && status = "${status}"`;
			}

			const records = await this.pb.collection(this.collection).getFullList({
				filter,
				sort: '-created',
				expand: 'song_id,suggested_by'
			});

			return records as unknown as SongSuggestion[];
		} catch (error) {
			console.error('Failed to fetch suggestions:', error);
			throw error;
		}
	}

	/**
	 * Get suggestions for a specific song
	 */
	async getSongSuggestions(songId: string): Promise<SongSuggestion[]> {
		try {
			if (!this.authContext.currentChurch?.id) {
				throw new Error('No church selected');
			}

			const records = await this.pb.collection(this.collection).getFullList({
				filter: `song_id = "${songId}" && church_id = "${this.authContext.currentChurch.id}"`,
				sort: '-created',
				expand: 'suggested_by'
			});

			return records as unknown as SongSuggestion[];
		} catch (error) {
			console.error('Failed to fetch song suggestions:', error);
			throw error;
		}
	}

	/**
	 * Create a new suggestion
	 */
	async createSuggestion(data: CreateSongSuggestionData): Promise<SongSuggestion> {
		try {
			if (!this.authContext.currentChurch?.id || !this.authContext.user?.id) {
				throw new Error('No church or user context');
			}

			const createData = {
				song_id: data.song_id,
				church_id: this.authContext.currentChurch.id,
				suggested_by: this.authContext.user.id,
				notes: data.notes || '',
				status: 'pending'
			};

			const record = await this.pb.collection(this.collection).create(createData);
			return record as unknown as SongSuggestion;
		} catch (error) {
			console.error('Failed to create suggestion:', error);
			throw error;
		}
	}

	/**
	 * Update suggestion status (for leaders/admins)
	 */
	async updateSuggestionStatus(
		suggestionId: string,
		status: 'approved' | 'rejected'
	): Promise<SongSuggestion> {
		try {
			const record = await this.pb.collection(this.collection).update(suggestionId, { status });
			return record as unknown as SongSuggestion;
		} catch (error) {
			console.error('Failed to update suggestion status:', error);
			throw error;
		}
	}

	/**
	 * Delete a suggestion
	 */
	async deleteSuggestion(suggestionId: string): Promise<void> {
		try {
			await this.pb.collection(this.collection).delete(suggestionId);
		} catch (error) {
			console.error('Failed to delete suggestion:', error);
			throw error;
		}
	}

	/**
	 * Get pending suggestions count
	 */
	async getPendingSuggestionsCount(): Promise<number> {
		try {
			if (!this.authContext.currentChurch?.id) {
				throw new Error('No church selected');
			}

			const result = await this.pb.collection(this.collection).getList(1, 1, {
				filter: `church_id = "${this.authContext.currentChurch.id}" && status = "pending"`,
				fields: 'id'
			});

			return result.totalItems;
		} catch (error) {
			console.error('Failed to get pending suggestions count:', error);
			return 0;
		}
	}

	/**
	 * Subscribe to real-time updates for suggestions
	 */
	subscribe(callback: (data: unknown) => void) {
		return this.pb.collection(this.collection).subscribe('*', callback);
	}
}

// Factory function for creating SuggestionsAPI instances
export function createSuggestionsAPI(authContext: AuthContext, pb: PocketBase): SuggestionsAPI {
	return new SuggestionsAPI(authContext, pb);
}
