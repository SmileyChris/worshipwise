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

			// Check if required collections exist
			try {
				const collections = await pb.collections.getFullList();
				const requiredCollections = ['users', 'songs'];
				status.collectionsExist = requiredCollections.every((name) =>
					collections.some((col) => col.name === name)
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

			// Check if admin exists (this is approximate - we can't directly check admin users)
			// We'll assume if there are users and collections exist, admin was set up
			status.adminExists = status.collectionsExist && status.usersExist;
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
			// Try to fetch admin stats (this will fail if admin isn't set up)
			const response = await fetch(`${pb.baseUrl}/api/admins`, {
				method: 'GET',
				headers: {
					'Content-Type': 'application/json'
				}
			});

			// If we get any response (even 401), admin interface is working
			return response.status !== 500;
		} catch (error) {
			console.warn('Admin access check failed:', error);
			return false;
		}
	}
}
