import type PocketBase from 'pocketbase';
import type { Category } from '$lib/types/song';
import type { AuthContext } from '$lib/types/auth';
import { pb } from '$lib/api/client';

export interface CategoriesAPI {
	getCategories(churchId: string): Promise<Category[]>;
	getCategory(id: string): Promise<Category>;
	createCategory(
		data: {
			name: string;
			description?: string;
			color?: string;
			sort_order: number;
		},
		churchId: string
	): Promise<Category>;
	updateCategory(
		id: string,
		data: {
			name?: string;
			description?: string;
			color?: string;
			sort_order?: number;
		}
	): Promise<Category>;
	deleteCategory(id: string): Promise<void>;
	subscribe(callback: (data: unknown) => void): Promise<() => void>;
}

export function createCategoriesAPI(pb: PocketBase): CategoriesAPI {
	const collection = 'categories';

	return {
		/**
		 * Get all active categories for a church
		 */
		async getCategories(churchId: string): Promise<Category[]> {
			try {
				const records = await pb.collection(collection).getFullList({
					filter: `is_active = true && church_id = "${churchId}"`,
					sort: 'sort_order'
				});

				return records as unknown as Category[];
			} catch (error) {
				console.error('Failed to fetch categories:', error);
				throw error;
			}
		},

		/**
		 * Get a single category by ID
		 */
		async getCategory(id: string): Promise<Category> {
			try {
				const record = await pb.collection(collection).getOne(id);
				return record as unknown as Category;
			} catch (error) {
				console.error('Failed to fetch category:', error);
				throw error;
			}
		},

		/**
		 * Create a new category (admin only)
		 */
		async createCategory(
			data: {
				name: string;
				description?: string;
				color?: string;
				sort_order: number;
			},
			churchId: string
		): Promise<Category> {
			try {
				const record = await pb.collection(collection).create({
					...data,
					church_id: churchId,
					is_active: true
				});
				return record as unknown as Category;
			} catch (error) {
				console.error('Failed to create category:', error);
				throw error;
			}
		},

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
				const record = await pb.collection(collection).update(id, data);
				return record as unknown as Category;
			} catch (error) {
				console.error('Failed to update category:', error);
				throw error;
			}
		},

		/**
		 * Delete a category (admin only)
		 */
		async deleteCategory(id: string): Promise<void> {
			try {
				await pb.collection(collection).delete(id);
			} catch (error) {
				console.error('Failed to delete category:', error);
				throw error;
			}
		},

		/**
		 * Subscribe to real-time updates for categories
		 */
		subscribe(callback: (data: unknown) => void) {
			return pb.collection(collection).subscribe('*', callback);
		}
	};
}

// Import for dynamic auth context
import { getAuthStore } from '$lib/context/stores.svelte';

// Dynamic proxy that always uses current auth state
class CategoriesAPIProxy {
	private get api() {
		return createCategoriesAPI(pb);
	}

	private get churchId(): string {
		const auth = getAuthStore();
		const authContext = auth.getAuthContext();
		if (!authContext.currentChurch?.id) {
			throw new Error('No church selected. Please select a church to manage categories.');
		}
		return authContext.currentChurch.id;
	}

	getCategories = () => this.api.getCategories(this.churchId);
	getCategory = (id: string) => this.api.getCategory(id);
	createCategory = (data: Parameters<CategoriesAPI['createCategory']>[0]) =>
		this.api.createCategory(data, this.churchId);
	updateCategory = (id: string, data: Parameters<CategoriesAPI['updateCategory']>[1]) =>
		this.api.updateCategory(id, data);
	deleteCategory = (id: string) => this.api.deleteCategory(id);
	subscribe = (callback: (data: unknown) => void) => this.api.subscribe(callback);
}

export const categoriesApi = new CategoriesAPIProxy();
