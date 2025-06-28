import type PocketBase from 'pocketbase';
import type { AuthContext } from '$lib/types/auth';
import type { Notification, CreateNotificationData } from '$lib/types/notification';

export class NotificationsAPI {
	private collection = 'notifications';

	constructor(
		private authContext: AuthContext,
		private pb: PocketBase
	) {}

	/**
	 * Get user's notifications
	 */
	async getNotifications(unreadOnly = false): Promise<Notification[]> {
		try {
			if (!this.authContext.user?.id) {
				throw new Error('No user context');
			}

			let filter = `user_id = "${this.authContext.user.id}"`;
			if (unreadOnly) {
				filter += ' && (is_read = false || is_read = null)';
			}

			const records = await this.pb.collection(this.collection).getFullList({
				filter,
				sort: '-created',
				expand: 'church_id'
			});

			return records as unknown as Notification[];
		} catch (error) {
			console.error('Failed to fetch notifications:', error);
			throw error;
		}
	}

	/**
	 * Get unread notification count
	 */
	async getUnreadCount(): Promise<number> {
		try {
			if (!this.authContext.user?.id) {
				return 0;
			}

			const result = await this.pb.collection(this.collection).getList(1, 1, {
				filter: `user_id = "${this.authContext.user.id}" && (is_read = false || is_read = null)`,
				fields: 'id'
			});

			return result.totalItems;
		} catch (error) {
			console.error('Failed to fetch unread count:', error);
			return 0;
		}
	}

	/**
	 * Mark notification as read
	 */
	async markAsRead(notificationId: string): Promise<void> {
		try {
			await this.pb.collection(this.collection).update(notificationId, {
				is_read: true
			});
		} catch (error) {
			console.error('Failed to mark notification as read:', error);
			throw error;
		}
	}

	/**
	 * Mark all notifications as read
	 */
	async markAllAsRead(): Promise<void> {
		try {
			if (!this.authContext.user?.id) {
				throw new Error('No user context');
			}

			const unreadNotifications = await this.getNotifications(true);
			
			// Update each notification
			await Promise.all(
				unreadNotifications.map(n => this.markAsRead(n.id))
			);
		} catch (error) {
			console.error('Failed to mark all as read:', error);
			throw error;
		}
	}

	/**
	 * Delete a notification
	 */
	async deleteNotification(notificationId: string): Promise<void> {
		try {
			await this.pb.collection(this.collection).delete(notificationId);
		} catch (error) {
			console.error('Failed to delete notification:', error);
			throw error;
		}
	}

	/**
	 * Create notifications for all church members (admin use)
	 */
	async createNotificationForChurch(
		churchId: string,
		data: CreateNotificationData
	): Promise<void> {
		try {
			// This would typically be done server-side
			// Get all active church members
			const memberships = await this.pb.collection('church_memberships').getFullList({
				filter: `church_id = "${churchId}" && status = "active"`,
				fields: 'user_id'
			});

			// Create notification for each member
			const notifications = memberships.map(m => ({
				church_id: churchId,
				user_id: m.user_id,
				type: data.type,
				title: data.title,
				message: data.message,
				data: data.data || {},
				is_read: false
			}));

			// Batch create notifications
			await Promise.all(
				notifications.map(n => this.pb.collection(this.collection).create(n))
			);
		} catch (error) {
			console.error('Failed to create church notifications:', error);
			throw error;
		}
	}

	/**
	 * Subscribe to real-time updates
	 */
	subscribe(callback: (data: unknown) => void) {
		if (!this.authContext.user?.id) {
			return Promise.resolve(() => {});
		}

		// Subscribe to notifications for current user
		return this.pb.collection(this.collection).subscribe(
			`user_id = "${this.authContext.user.id}"`,
			callback
		);
	}
}

// Factory function for creating NotificationsAPI instances
export function createNotificationsAPI(authContext: AuthContext, pb: PocketBase): NotificationsAPI {
	return new NotificationsAPI(authContext, pb);
}