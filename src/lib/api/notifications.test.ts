import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createNotificationsAPI } from './notifications';
import type { AuthContext } from '$lib/types/auth';
import type { Notification } from '$lib/types/notification';

// Mock PocketBase
const mockPb = {
	collection: vi.fn(() => mockPb),
	getFullList: vi.fn(),
	getList: vi.fn(),
	create: vi.fn(),
	update: vi.fn(),
	delete: vi.fn(),
	subscribe: vi.fn()
};

// Mock auth context
const mockAuthContext: AuthContext = {
	pb: mockPb as any,
	isAuthenticated: true,
	user: { id: 'user-1', email: 'test@example.com', name: 'Test User' } as any,
	currentChurch: { id: 'church-1', name: 'Test Church' } as any,
	membership: { church_id: 'church-1', role: 'leader' } as any,
	membershipRole: 'leader',
	permissions: {
		canViewSongs: true,
		canManageSongs: true,
		canViewServices: true,
		canManageServices: true,
		canViewAnalytics: true,
		canManageChurch: false,
		canManageMembers: false
	},
	canViewSongs: true,
	canManageSongs: true,
	canViewServices: true,
	canManageServices: true,
	canViewAnalytics: true,
	canManageChurch: false,
	canManageMembers: false
};

describe('NotificationsAPI', () => {
	let notificationsAPI: ReturnType<typeof createNotificationsAPI>;

	beforeEach(() => {
		vi.clearAllMocks();
		notificationsAPI = createNotificationsAPI(mockAuthContext, mockPb as any);
	});

	describe('getNotifications', () => {
		it('should fetch all notifications for user', async () => {
			const mockNotifications: Notification[] = [
				{
					id: 'notif-1',
					church_id: 'church-1',
					user_id: 'user-1',
					type: 'song_added',
					title: 'New Song Added',
					message: 'Amazing Grace has been added',
					is_read: false,
					created: '2024-01-01',
					updated: '2024-01-01'
				},
				{
					id: 'notif-2',
					church_id: 'church-1',
					user_id: 'user-1',
					type: 'song_retired',
					title: 'Song Retired',
					message: 'Old Song has been retired',
					is_read: true,
					created: '2024-01-02',
					updated: '2024-01-02'
				}
			];

			mockPb.getFullList.mockResolvedValue(mockNotifications);

			const result = await notificationsAPI.getNotifications();

			expect(mockPb.collection).toHaveBeenCalledWith('notifications');
			expect(mockPb.getFullList).toHaveBeenCalledWith({
				filter: 'user_id = "user-1"',
				sort: '-created',
				expand: 'church_id'
			});
			expect(result).toEqual(mockNotifications);
		});

		it('should fetch only unread notifications when specified', async () => {
			const mockUnreadNotifications: Notification[] = [
				{
					id: 'notif-1',
					church_id: 'church-1',
					user_id: 'user-1',
					type: 'song_added',
					title: 'New Song Added',
					message: 'Amazing Grace has been added',
					is_read: false,
					created: '2024-01-01',
					updated: '2024-01-01'
				}
			];

			mockPb.getFullList.mockResolvedValue(mockUnreadNotifications);

			const result = await notificationsAPI.getNotifications(true);

			expect(mockPb.getFullList).toHaveBeenCalledWith({
				filter: 'user_id = "user-1" && (is_read = false || is_read = null)',
				sort: '-created',
				expand: 'church_id'
			});
			expect(result).toEqual(mockUnreadNotifications);
		});
	});

	describe('getUnreadCount', () => {
		it('should return unread notification count', async () => {
			mockPb.getList.mockResolvedValue({
				totalItems: 5,
				items: [],
				page: 1,
				perPage: 1,
				totalPages: 5
			});

			const result = await notificationsAPI.getUnreadCount();

			expect(mockPb.getList).toHaveBeenCalledWith(1, 1, {
				filter: 'user_id = "user-1" && (is_read = false || is_read = null)',
				fields: 'id'
			});
			expect(result).toBe(5);
		});

		it('should return 0 when no user context', async () => {
			const noUserContext = { ...mockAuthContext, user: null };
			const api = createNotificationsAPI(noUserContext, mockPb as any);

			const result = await api.getUnreadCount();

			expect(result).toBe(0);
			expect(mockPb.getList).not.toHaveBeenCalled();
		});
	});

	describe('markAsRead', () => {
		it('should mark notification as read', async () => {
			mockPb.update.mockResolvedValue({ is_read: true });

			await notificationsAPI.markAsRead('notif-1');

			expect(mockPb.update).toHaveBeenCalledWith('notif-1', {
				is_read: true
			});
		});
	});

	describe('markAllAsRead', () => {
		it('should mark all unread notifications as read', async () => {
			const unreadNotifications = [
				{ id: 'notif-1', is_read: false },
				{ id: 'notif-2', is_read: false }
			];

			mockPb.getFullList.mockResolvedValue(unreadNotifications);
			mockPb.update.mockResolvedValue({ is_read: true });

			await notificationsAPI.markAllAsRead();

			expect(mockPb.update).toHaveBeenCalledTimes(2);
			expect(mockPb.update).toHaveBeenCalledWith('notif-1', { is_read: true });
			expect(mockPb.update).toHaveBeenCalledWith('notif-2', { is_read: true });
		});
	});

	describe('deleteNotification', () => {
		it('should delete notification', async () => {
			await notificationsAPI.deleteNotification('notif-1');

			expect(mockPb.delete).toHaveBeenCalledWith('notif-1');
		});
	});

	describe('createNotificationForChurch', () => {
		it('should create notifications for all church members', async () => {
			const mockMemberships = [{ user_id: 'user-1' }, { user_id: 'user-2' }, { user_id: 'user-3' }];

			mockPb.getFullList.mockResolvedValue(mockMemberships);
			mockPb.create.mockResolvedValue({ id: 'new-notif' });

			await notificationsAPI.createNotificationForChurch('church-1', {
				type: 'song_added',
				title: 'New Song',
				message: 'A new song was added',
				data: { songId: 'song-1' }
			});

			expect(mockPb.getFullList).toHaveBeenCalledWith({
				filter: 'church_id = "church-1" && status = "active"',
				fields: 'user_id'
			});

			expect(mockPb.create).toHaveBeenCalledTimes(3);
			expect(mockPb.create).toHaveBeenCalledWith({
				church_id: 'church-1',
				user_id: 'user-1',
				type: 'song_added',
				title: 'New Song',
				message: 'A new song was added',
				data: { songId: 'song-1' },
				is_read: false
			});
		});
	});

	describe('subscribe', () => {
		it('should subscribe to user notifications', async () => {
			const mockUnsubscribe = vi.fn();
			mockPb.subscribe.mockResolvedValue(mockUnsubscribe);

			const callback = vi.fn();
			const unsubscribe = await notificationsAPI.subscribe(callback);

			expect(mockPb.subscribe).toHaveBeenCalledWith('user_id = "user-1"', callback);
			expect(unsubscribe).toBe(mockUnsubscribe);
		});

		it('should return noop function when no user', async () => {
			const noUserContext = { ...mockAuthContext, user: null };
			const api = createNotificationsAPI(noUserContext, mockPb as any);

			const callback = vi.fn();
			const unsubscribe = await api.subscribe(callback);

			expect(mockPb.subscribe).not.toHaveBeenCalled();
			expect(typeof unsubscribe).toBe('function');
		});
	});
});
