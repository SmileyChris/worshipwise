import { pb } from './client.js';
import type { SystemStatus } from '$lib/types/quickstart.js';

export class SystemAPI {
	/**
	 * Check the overall system status for quickstart flow
	 * Simplified: only check if worship users exist (the real indicator)
	 */
	static async getSystemStatus(): Promise<SystemStatus> {
		const status: SystemStatus = {
			pocketbaseRunning: true, // If we got here, PB is running
			adminExists: true, // If app loads, admin was created via `just dev`
			usersExist: false,
			songsExist: false,
			categoriesExist: false,
			collectionsExist: true, // If admin exists, collections exist
			needsSetup: false
		};

		try {
			// The only thing that matters: do any worship users exist?
			status.usersExist = await this.checkWorshipUsersExist();

			// Check optional content for progress display
			if (status.usersExist) {
				try {
					const songs = await pb.collection('songs').getList(1, 1);
					status.songsExist = songs.totalItems > 0;
				} catch {
					status.songsExist = false;
				}

				try {
					const categories = await pb.collection('categories').getList(1, 1);
					status.categoriesExist = categories.totalItems > 0;
				} catch {
					status.categoriesExist = false;
				}
			}
		} catch (error) {
			console.warn('System status check failed:', error);
			// If we can't check users, assume fresh install
			status.usersExist = false;
		}

		// Setup is needed ONLY if no worship users exist
		status.needsSetup = !status.usersExist;

		return status;
	}

	/**
	 * Check if any worship users exist using anonymous access
	 * This is the key indicator of whether this is a fresh install
	 */
	static async checkWorshipUsersExist(): Promise<boolean> {
		try {
			// Try to get a count of users without authentication
			// This should work anonymously if collections are set up properly
			const users = await pb.collection('users').getList(1, 1);
			return users.totalItems > 0;
		} catch (error: any) {
			// If we can't access users anonymously, assume no users exist
			console.warn('Could not check worship users:', error);
			return false;
		}
	}

	/**
	 * Check if PocketBase server is running and accessible
	 */
	static async checkHealth(): Promise<boolean> {
		try {
			await pb.health.check();
			return true;
		} catch (error) {
			console.warn('PocketBase health check failed:', error);
			return false;
		}
	}

	/**
	 * Get PocketBase admin URL for setup
	 */
	static getAdminUrl(): string {
		return `${pb.baseUrl}/_/`;
	}

	/**
	 * Check if admin user exists by trying to access admin endpoints
	 */
	static async checkAdminAccess(): Promise<boolean> {
		try {
			// Try to access an admin-only endpoint that requires authentication
			// This will help us determine if an admin user exists and can authenticate
			const response = await fetch(`${pb.baseUrl}/api/admins`, {
				method: 'GET'
			});

			// If we get 200, admin endpoints are accessible (admin exists)
			// If we get 401/403, admin exists but we're not authenticated (which is expected)
			// If we get 404, admin system might not be set up
			return response.status === 200 || response.status === 401 || response.status === 403;
		} catch (error) {
			console.warn('Admin access check failed:', error);
			return false;
		}
	}
}
