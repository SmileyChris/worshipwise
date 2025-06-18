import { pb } from './client.js';
import type { SystemStatus } from '$lib/types/quickstart.js';

export class SystemAPI {
	/**
	 * Check the overall system status for quickstart flow
	 */
	static async getSystemStatus(): Promise<SystemStatus> {
		const status: SystemStatus = {
			pocketbaseRunning: false,
			adminExists: false,
			usersExist: false,
			songsExist: false,
			collectionsExist: false,
			needsSetup: false
		};

		try {
			// Check if PocketBase is running
			await pb.health.check();
			status.pocketbaseRunning = true;

			// Check if required collections exist by trying to access them
			try {
				// Instead of listing collections (which requires admin), try to access the collections directly
				const requiredCollections = ['users', 'songs'];
				const collectionChecks = await Promise.allSettled(
					requiredCollections.map(async (collectionName) => {
						try {
							// Try to get a minimal response from each collection
							await pb.collection(collectionName).getList(1, 1);
							return true;
						} catch (error: any) {
							// Collection exists if we get any response other than 404
							return error?.status !== 404;
						}
					})
				);
				
				status.collectionsExist = collectionChecks.every(
					(result) => result.status === 'fulfilled' && result.value === true
				);
			} catch (error) {
				console.warn('Could not check collections:', error);
				status.collectionsExist = false;
			}

			// Check if any users exist
			if (status.collectionsExist) {
				try {
					const users = await pb.collection('users').getList(1, 1);
					status.usersExist = users.totalItems > 0;
				} catch (error) {
					console.warn('Could not check users:', error);
					status.usersExist = false;
				}

				// Check if any songs exist
				try {
					const songs = await pb.collection('songs').getList(1, 1);
					status.songsExist = songs.totalItems > 0;
				} catch (error) {
					console.warn('Could not check songs:', error);
					status.songsExist = false;
				}
			}

			// Check if admin exists by trying to access admin endpoints
			try {
				const adminAccess = await SystemAPI.checkAdminAccess();
				status.adminExists = adminAccess && status.collectionsExist;
			} catch (error) {
				console.warn('Could not check admin access:', error);
				// Fallback to previous logic
				status.adminExists = status.collectionsExist && status.usersExist;
			}
		} catch (error) {
			console.warn('PocketBase health check failed:', error);
			status.pocketbaseRunning = false;
		}

		// Determine if setup is needed
		status.needsSetup = !status.pocketbaseRunning || !status.collectionsExist || !status.usersExist;

		return status;
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
	 * Check if we can connect to PocketBase admin
	 */
	static async checkAdminAccess(): Promise<boolean> {
		try {
			// Try to access the admin interface
			const response = await fetch(`${pb.baseUrl}/_/`, {
				method: 'GET'
			});

			// If we get 200, admin interface is accessible
			// If we get 404, admin is not set up yet
			return response.status === 200;
		} catch (error) {
			console.warn('Admin access check failed:', error);
			return false;
		}
	}
}
