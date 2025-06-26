import type PocketBase from 'pocketbase';
import type { Label } from '$lib/types/song';

export interface LabelsAPI {
	getLabels(churchId: string): Promise<Label[]>;
	getUserLabels(userId: string, churchId: string): Promise<Label[]>;
	getLabel(id: string): Promise<Label>;
	createLabel(
		data: { name: string; description?: string; color?: string },
		userId: string,
		churchId: string
	): Promise<Label>;
	updateLabel(
		id: string,
		data: {
			name?: string;
			description?: string;
			color?: string;
		}
	): Promise<Label>;
	deleteLabel(id: string): Promise<void>;
	subscribe(callback: (data: unknown) => void): Promise<() => void>;
}

export function createLabelsAPI(pb: PocketBase): LabelsAPI {
	const collection = 'labels';

	return {
		/**
		 * Get all active labels for a church
		 */
		async getLabels(churchId: string): Promise<Label[]> {
			try {
				const records = await pb.collection(collection).getFullList({
					filter: `is_active = true && church_id = "${churchId}"`,
					sort: 'name',
					expand: 'created_by'
				});

				return records as unknown as Label[];
			} catch (error) {
				console.error('Failed to fetch labels:', error);
				throw error;
			}
		},

		/**
		 * Get labels created by a specific user in a church
		 */
		async getUserLabels(userId: string, churchId: string): Promise<Label[]> {
			try {
				const records = await pb.collection(collection).getFullList({
					filter: `is_active = true && created_by = "${userId}" && church_id = "${churchId}"`,
					sort: 'name',
					expand: 'created_by'
				});

				return records as unknown as Label[];
			} catch (error) {
				console.error('Failed to fetch user labels:', error);
				throw error;
			}
		},

		/**
		 * Get a single label by ID
		 */
		async getLabel(id: string): Promise<Label> {
			try {
				const record = await pb.collection(collection).getOne(id, {
					expand: 'created_by'
				});
				return record as unknown as Label;
			} catch (error) {
				console.error('Failed to fetch label:', error);
				throw error;
			}
		},

		/**
		 * Create a new label
		 */
		async createLabel(
			data: { name: string; description?: string; color?: string },
			userId: string,
			churchId: string
		): Promise<Label> {
			try {
				const record = await pb.collection(collection).create({
					...data,
					created_by: userId,
					church_id: churchId,
					is_active: true
				});
				return record as unknown as Label;
			} catch (error) {
				console.error('Failed to create label:', error);
				throw error;
			}
		},

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
				const record = await pb.collection(collection).update(id, data);
				return record as unknown as Label;
			} catch (error) {
				console.error('Failed to update label:', error);
				throw error;
			}
		},

		/**
		 * Delete a label (only if user is owner or admin)
		 */
		async deleteLabel(id: string): Promise<void> {
			try {
				await pb.collection(collection).update(id, { is_active: false });
			} catch (error) {
				console.error('Failed to delete label:', error);
				throw error;
			}
		},

		/**
		 * Subscribe to real-time updates for labels
		 */
		subscribe(callback: (data: unknown) => void) {
			return pb.collection(collection).subscribe('*', callback);
		}
	};
}
