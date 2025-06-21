import { pb } from './client';
import type { Category } from '$lib/types/song';

export class CategoriesAPI {
	private collection = 'categories';

	/**
	 * Get all active categories
	 */
	async getCategories(): Promise<Category[]> {
		try {
			const records = await pb.collection(this.collection).getFullList({
				filter: 'is_active = true',
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
			const record = await pb.collection(this.collection).create({
				...data,
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
	subscribe(callback: (data: any) => void) {
		return pb.collection(this.collection).subscribe('*', callback);
	}
}

// Export singleton instance
export const categoriesApi = new CategoriesAPI();
