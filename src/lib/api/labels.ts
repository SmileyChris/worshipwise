import { pb } from './client';
import type { Label } from '$lib/types/song';

export class LabelsAPI {
	private collection = 'labels';

	/**
	 * Get all active labels
	 */
	async getLabels(): Promise<Label[]> {
		try {
			const records = await pb.collection(this.collection).getFullList({
				filter: 'is_active = true',
				sort: 'name',
				expand: 'created_by'
			});

			return records as unknown as Label[];
		} catch (error) {
			console.error('Failed to fetch labels:', error);
			throw error;
		}
	}

	/**
	 * Get labels created by the current user
	 */
	async getUserLabels(): Promise<Label[]> {
		try {
			const userId = pb.authStore.model?.id;
			if (!userId) {
				throw new Error('User not authenticated');
			}

			const records = await pb.collection(this.collection).getFullList({
				filter: `is_active = true && created_by = "${userId}"`,
				sort: 'name',
				expand: 'created_by'
			});

			return records as unknown as Label[];
		} catch (error) {
			console.error('Failed to fetch user labels:', error);
			throw error;
		}
	}

	/**
	 * Get a single label by ID
	 */
	async getLabel(id: string): Promise<Label> {
		try {
			const record = await pb.collection(this.collection).getOne(id, {
				expand: 'created_by'
			});
			return record as unknown as Label;
		} catch (error) {
			console.error('Failed to fetch label:', error);
			throw error;
		}
	}

	/**
	 * Create a new label
	 */
	async createLabel(data: { name: string; description?: string; color?: string }): Promise<Label> {
		try {
			const record = await pb.collection(this.collection).create({
				...data,
				created_by: pb.authStore.model?.id || '',
				is_active: true
			});
			return record as unknown as Label;
		} catch (error) {
			console.error('Failed to create label:', error);
			throw error;
		}
	}

	/**
	 * Update an existing label (only if user is owner or admin)
	 */
	async updateLabel(
		id: string,
		data: {
			name?: string;
			description?: string;
			color?: string;
		}
	): Promise<Label> {
		try {
			const record = await pb.collection(this.collection).update(id, data);
			return record as unknown as Label;
		} catch (error) {
			console.error('Failed to update label:', error);
			throw error;
		}
	}

	/**
	 * Delete a label (only if user is owner or admin)
	 */
	async deleteLabel(id: string): Promise<void> {
		try {
			await pb.collection(this.collection).update(id, { is_active: false });
		} catch (error) {
			console.error('Failed to delete label:', error);
			throw error;
		}
	}

	/**
	 * Subscribe to real-time updates for labels
	 */
	subscribe(callback: (data: any) => void) {
		return pb.collection(this.collection).subscribe('*', callback);
	}
}

// Export singleton instance
export const labelsApi = new LabelsAPI();
