import { createNotificationsAPI, type NotificationsAPI } from '$lib/api/notifications';
import type { AuthContext } from '$lib/types/auth';
import type { AuthStore as RuntimeAuthStore } from '$lib/stores/auth.svelte';
import type { Notification, NotificationType } from '$lib/types/notification';

class NotificationsStore {
	// Reactive state
	notifications = $state<Notification[]>([]);
	unreadCount = $state(0);
	loading = $state(false);
	error = $state<string | null>(null);

	private notificationsApi: NotificationsAPI;
	private unsubscribe: (() => void) | null = null;

	// Runes-first: support live auth store or static context
	private auth: RuntimeAuthStore | null = null;
	private staticContext: AuthContext | null = null;

	constructor(authInput: RuntimeAuthStore | AuthContext) {
		if (typeof (authInput as any).getAuthContext === 'function') {
			this.auth = authInput as RuntimeAuthStore;
		} else {
			this.staticContext = authInput as AuthContext;
		}

		this.notificationsApi = $derived.by(() => {
			const ctx = this.getAuthContext();
			return createNotificationsAPI(ctx, ctx.pb);
		});
	}

	private getAuthContext(): AuthContext {
		return this.auth ? this.auth.getAuthContext() : (this.staticContext as AuthContext);
	}

	/**
	 * Initialize store and subscriptions
	 */
	async initialize(): Promise<void> {
		// Load initial notifications
		await this.loadNotifications();

		// Subscribe to real-time updates
		this.unsubscribe = await this.notificationsApi.subscribe((data) => {
			const event = data as { action: string; record: unknown };

			if (event.action === 'create') {
				// Add new notification to the beginning
				this.notifications = [event.record as Notification, ...this.notifications];
				this.unreadCount++;
			} else if (event.action === 'update') {
				// Update existing notification
				const updatedNotification = event.record as Notification;
				const index = this.notifications.findIndex((n) => n.id === updatedNotification.id);
				if (index !== -1) {
					const wasUnread = !this.notifications[index].is_read;
					this.notifications[index] = updatedNotification;

					// Update unread count
					if (wasUnread && updatedNotification.is_read) {
						this.unreadCount = Math.max(0, this.unreadCount - 1);
					}
				}
			} else if (event.action === 'delete') {
				// Remove deleted notification
				const deletedId = (event.record as { id: string }).id;
				const notification = this.notifications.find((n) => n.id === deletedId);
				if (notification && !notification.is_read) {
					this.unreadCount = Math.max(0, this.unreadCount - 1);
				}
				this.notifications = this.notifications.filter((n) => n.id !== deletedId);
			}
		});
	}

	/**
	 * Load notifications
	 */
	async loadNotifications(): Promise<void> {
		this.loading = true;
		this.error = null;

		try {
			const [notifs, count] = await Promise.all([
				this.notificationsApi.getNotifications(),
				this.notificationsApi.getUnreadCount()
			]);

			this.notifications = notifs;
			this.unreadCount = count;
		} catch (error) {
			this.error = error instanceof Error ? error.message : 'Failed to load notifications';
		} finally {
			this.loading = false;
		}
	}

	/**
	 * Mark notification as read
	 */
	async markAsRead(notificationId: string): Promise<void> {
		try {
			await this.notificationsApi.markAsRead(notificationId);

			const notification = this.notifications.find((n) => n.id === notificationId);
			if (notification && !notification.is_read) {
				notification.is_read = true;
				this.unreadCount = Math.max(0, this.unreadCount - 1);
			}
		} catch (error) {
			this.error = error instanceof Error ? error.message : 'Failed to mark as read';
		}
	}

	/**
	 * Mark all as read
	 */
	async markAllAsRead(): Promise<void> {
		try {
			await this.notificationsApi.markAllAsRead();

			this.notifications = this.notifications.map((n) => ({ ...n, is_read: true }));
			this.unreadCount = 0;
		} catch (error) {
			this.error = error instanceof Error ? error.message : 'Failed to mark all as read';
		}
	}

	/**
	 * Delete notification
	 */
	async deleteNotification(notificationId: string): Promise<void> {
		try {
			await this.notificationsApi.deleteNotification(notificationId);

			const notification = this.notifications.find((n) => n.id === notificationId);
			if (notification && !notification.is_read) {
				this.unreadCount = Math.max(0, this.unreadCount - 1);
			}

			this.notifications = this.notifications.filter((n) => n.id !== notificationId);
		} catch (error) {
			this.error = error instanceof Error ? error.message : 'Failed to delete notification';
		}
	}

	/**
	 * Create notification for church members (admin/system use)
	 */
	async createChurchNotification(
		type: NotificationType,
		title: string,
		message: string,
		data?: Record<string, any>
	): Promise<void> {
		const ctx = this.getAuthContext();
		if (!ctx.currentChurch?.id) return;

		try {
			await this.notificationsApi.createNotificationForChurch(ctx.currentChurch.id, {
				type,
				title,
				message,
				data
			});
		} catch (error) {
			console.error('Failed to create church notification:', error);
		}
	}

	/**
	 * Cleanup subscriptions
	 */
	destroy(): void {
		if (this.unsubscribe) {
			this.unsubscribe();
			this.unsubscribe = null;
		}
	}
}

// Export the class type for tests
export type { NotificationsStore };

// Factory function for creating new store instances
export function createNotificationsStore(auth: RuntimeAuthStore | AuthContext): NotificationsStore {
	return new NotificationsStore(auth);
}
