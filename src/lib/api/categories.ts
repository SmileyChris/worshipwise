import { pb } from './client';
import type { Category } from '$lib/types/song';
import type { AuthContext } from '$lib/types/auth';

export class CategoriesAPI {
	private collection = 'categories';

	constructor(private authContext?: AuthContext) {}

	/**
	 * Get all active categories
	 */
	async getCategories(): Promise<Category[]> {
		try {
			// Get current user's church context
			const { getAuthStore } = await import('$lib/context/stores.svelte');
			const auth = getAuthStore();
			const currentChurch = auth.currentChurch;

			if (!currentChurch) {
				throw new Error(
					'No church context available - please ensure you are logged in and have selected a church'
				);
			}

			const records = await pb.collection(this.collection).getFullList({
				filter: `is_active = true && church_id = "${currentChurch.id}"`,
				sort: 'sort_order'
			});

			return records as unknown as Category[];
		} catch (error) {
			console.error('Failed to fetch categories:', error);
			throw error;
		}
	}

	/**
	 * Get a single category by ID
	 */
	async getCategory(id: string): Promise<Category> {
		try {
			const record = await pb.collection(this.collection).getOne(id);
			return record as unknown as Category;
		} catch (error) {
			console.error('Failed to fetch category:', error);
			throw error;
		}
	}

	/**
	 * Create a new category (admin only)
	 */
	async createCategory(data: {
		name: string;
		description?: string;
		color?: string;
		sort_order: number;
	}): Promise<Category> {
		try {
			// Get current user's church context
			const { getAuthStore } = await import('$lib/context/stores.svelte');
			const auth = getAuthStore();
			const currentChurch = auth.currentChurch;

			if (!currentChurch) {
				throw new Error(
					'No church context available - please ensure you are logged in and have selected a church'
				);
			}

			const record = await pb.collection(this.collection).create({
				...data,
				church_id: currentChurch.id,
				is_active: true
			});
			return record as unknown as Category;
		} catch (error) {
			console.error('Failed to create category:', error);
			throw error;
		}
	}

	/**
	 * Update an existing category (admin only)
	 */
	async updateCategory(
		id: string,
		data: {
			name?: string;
			description?: string;
			color?: string;
			sort_order?: number;
		}
	): Promise<Category> {
		try {
			const record = await pb.collection(this.collection).update(id, data);
			return record as unknown as Category;
		} catch (error) {
			console.error('Failed to update category:', error);
			throw error;
		}
	}

	/**
	 * Delete a category (admin only)
	 */
	async deleteCategory(id: string): Promise<void> {
		try {
			await pb.collection(this.collection).delete(id);
		} catch (error) {
			console.error('Failed to delete category:', error);
			throw error;
		}
	}

	/**
	 * Subscribe to real-time updates for categories
	 */
	subscribe(callback: (data: unknown) => void) {
		return pb.collection(this.collection).subscribe('*', callback);
	}
}

// Legacy import removed - using dependency injection

// Factory function for creating API instances
export function createCategoriesAPI(authContext?: AuthContext): CategoriesAPI {
	return new CategoriesAPI(authContext);
}

// Export singleton instance for backward compatibility
export const categoriesApi = new CategoriesAPI();
