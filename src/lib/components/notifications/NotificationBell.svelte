<script lang="ts">
	import { onMount } from 'svelte';
	import { getAuthStore } from '$lib/context/stores.svelte';
	import { createNotificationsAPI } from '$lib/api/notifications';
	import type { Notification } from '$lib/types/notification';
	import Button from '$lib/components/ui/Button.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import Card from '$lib/components/ui/Card.svelte';

	const auth = getAuthStore();
	const authContext = auth.getAuthContext();
	const notificationsAPI = createNotificationsAPI(authContext, authContext.pb);

	// State
	let notifications = $state<Notification[]>([]);
	let unreadCount = $state(0);
	let showDropdown = $state(false);
	let loading = $state(false);

	// Load notifications
	async function loadNotifications() {
		loading = true;
		try {
			const [notifs, count] = await Promise.all([
				notificationsAPI.getNotifications(),
				notificationsAPI.getUnreadCount()
			]);

			notifications = notifs.slice(0, 10); // Show max 10 in dropdown
			unreadCount = count;
		} catch (error) {
			console.error('Failed to load notifications:', error);
		} finally {
			loading = false;
		}
	}

	// Mark notification as read
	async function markAsRead(notification: Notification) {
		if (notification.is_read) return;

		try {
			await notificationsAPI.markAsRead(notification.id);
			notification.is_read = true;
			unreadCount = Math.max(0, unreadCount - 1);
		} catch (error) {
			console.error('Failed to mark as read:', error);
		}
	}

	// Mark all as read
	async function markAllAsRead() {
		try {
			await notificationsAPI.markAllAsRead();
			notifications = notifications.map((n) => ({ ...n, is_read: true }));
			unreadCount = 0;
		} catch (error) {
			console.error('Failed to mark all as read:', error);
		}
	}

	// Toggle dropdown
	function toggleDropdown() {
		showDropdown = !showDropdown;
		if (showDropdown && !loading) {
			loadNotifications();
		}
	}

	// Close dropdown when clicking outside
	function handleClickOutside(event: MouseEvent) {
		const target = event.target as Element;
		const dropdown = document.getElementById('notification-dropdown');
		const button = document.getElementById('notification-button');

		if (showDropdown && !dropdown?.contains(target) && !button?.contains(target)) {
			showDropdown = false;
		}
	}

	// Get notification icon
	function getNotificationIcon(type: string): string {
		switch (type) {
			case 'song_added':
				return '🎵';
			case 'song_retired':
				return '🚫';
			case 'song_suggested':
				return '💡';
			case 'service_reminder':
				return '⏰';
			default:
				return '📢';
		}
	}

	// Setup real-time updates
	onMount(() => {
		loadNotifications();

		// Subscribe to real-time updates
		const unsubscribePromise = notificationsAPI.subscribe(() => {
			loadNotifications();
		});

		// Click outside listener
		document.addEventListener('click', handleClickOutside);

		return () => {
			unsubscribePromise.then((unsubscribe) => {
				if (unsubscribe) unsubscribe();
			});
			document.removeEventListener('click', handleClickOutside);
		};
	});
</script>

<div class="relative">
	<!-- Bell Button -->
	<button
		id="notification-button"
		onclick={toggleDropdown}
		class="relative rounded-lg p-2 text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900"
		aria-label="Notifications"
	>
		<svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
			<path
				stroke-linecap="round"
				stroke-linejoin="round"
				stroke-width="2"
				d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
			/>
		</svg>

		{#if unreadCount > 0}
			<span
				class="absolute top-0 right-0 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white"
			>
				{unreadCount > 99 ? '99+' : unreadCount}
			</span>
		{/if}
	</button>

	<!-- Dropdown -->
	{#if showDropdown}
		<div
			id="notification-dropdown"
			class="ring-opacity-5 absolute right-0 z-50 mt-2 w-80 rounded-lg bg-white shadow-lg ring-1 ring-black"
		>
			<!-- Header -->
			<div class="flex items-center justify-between border-b border-gray-200 px-4 py-3">
				<h3 class="text-sm font-semibold text-gray-900">Notifications</h3>
				{#if unreadCount > 0}
					<Button variant="ghost" size="sm" onclick={markAllAsRead} class="text-xs">
						Mark all read
					</Button>
				{/if}
			</div>

			<!-- Notifications List -->
			<div class="max-h-96 overflow-y-auto">
				{#if loading}
					<div class="px-4 py-8 text-center">
						<div class="border-primary mx-auto h-6 w-6 animate-spin rounded-full border-b-2"></div>
					</div>
				{:else if notifications.length === 0}
					<div class="px-4 py-8 text-center">
						<p class="text-sm text-gray-500">No notifications</p>
					</div>
				{:else}
					<div class="divide-y divide-gray-100">
						{#each notifications as notification (notification.id)}
							<button
								onclick={() => markAsRead(notification)}
								class="w-full px-4 py-3 text-left transition-colors hover:bg-gray-50 {!notification.is_read
									? 'bg-blue-50'
									: ''}"
							>
								<div class="flex items-start gap-3">
									<span class="text-xl">
										{getNotificationIcon(notification.type)}
									</span>
									<div class="min-w-0 flex-1">
										<p class="text-sm font-medium text-gray-900">
											{notification.title}
										</p>
										<p class="mt-1 text-xs text-gray-600">
											{notification.message}
										</p>
										<p class="mt-1 text-xs text-gray-400">
											{(() => {
												const date = new Date(notification.created);
												const now = new Date();
												const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

												if (seconds < 60) return 'just now';
												if (seconds < 3600) return Math.floor(seconds / 60) + ' minutes ago';
												if (seconds < 86400) return Math.floor(seconds / 3600) + ' hours ago';
												if (seconds < 604800) return Math.floor(seconds / 86400) + ' days ago';
												return date.toLocaleDateString();
											})()}
										</p>
									</div>
									{#if !notification.is_read}
										<span class="h-2 w-2 rounded-full bg-blue-500"></span>
									{/if}
								</div>
							</button>
						{/each}
					</div>
				{/if}
			</div>

			<!-- Footer -->
			<div class="border-t border-gray-200 px-4 py-2">
				<Button variant="ghost" size="sm" href="/notifications" class="w-full text-center text-xs">
					View all notifications
				</Button>
			</div>
		</div>
	{/if}
</div>
