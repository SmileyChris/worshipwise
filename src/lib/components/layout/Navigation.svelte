<script lang="ts">
	import { auth } from '$lib/stores/auth.svelte';
	import { page as pageStore } from '$app/stores';
	import Button from '$lib/components/ui/Button.svelte';

	// User menu dropdown state
	let userMenuOpen = $state(false);

	// Navigation items based on user role
	let navigationItems = $derived.by(() => {
		const items = [
			{ name: 'Dashboard', href: '/dashboard', icon: '🏠' },
			{ name: 'Songs', href: '/songs', icon: '🎵' },
			{ name: 'Setlists', href: '/setlists', icon: '📋' }
		];

		// Add analytics for leaders and admins
		if (auth.canManageSetlists) {
			items.push({ name: 'Analytics', href: '/analytics', icon: '📊' });
		}

		// Add admin section for admins only
		if (auth.isAdmin) {
			items.push({ name: 'Admin', href: '/admin', icon: '⚙️' });
		}

		return items;
	});

	// Get current path reactively from page store
	let currentPath = $derived($pageStore.url.pathname);

	function isCurrentPage(href: string): boolean {
		return currentPath === href || currentPath.startsWith(href + '/');
	}

	async function handleLogout() {
		await auth.logout();
	}

	function toggleUserMenu() {
		userMenuOpen = !userMenuOpen;
	}

	function closeUserMenu() {
		userMenuOpen = false;
	}

	function handleClickOutside(event: MouseEvent) {
		const target = event.target as Element;
		const userMenu = document.getElementById('user-menu-button');
		const userMenuDropdown = userMenu?.nextElementSibling;
		
		if (userMenuOpen && !userMenu?.contains(target) && !userMenuDropdown?.contains(target)) {
			closeUserMenu();
		}
	}

	// Add click outside listener
	$effect(() => {
		if (userMenuOpen) {
			document.addEventListener('click', handleClickOutside);
			return () => {
				document.removeEventListener('click', handleClickOutside);
			};
		}
	});
</script>

<nav class="border-b border-gray-200 bg-white shadow-sm">
	<div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
		<div class="flex h-16 justify-between">
			<!-- Logo and primary navigation -->
			<div class="flex">
				<div class="flex flex-shrink-0 items-center">
					<a href="/dashboard" class="text-xl font-bold text-blue-600"> WorshipWise </a>
				</div>

				<!-- Navigation links -->
				<div class="hidden sm:ml-6 sm:flex sm:space-x-8">
					{#each navigationItems as item}
						<a
							href={item.href}
							class="inline-flex items-center px-1 pt-1 text-sm font-medium transition-colors {isCurrentPage(
								item.href
							)
								? 'border-b-2 border-blue-500 text-gray-900'
								: 'text-gray-500 hover:border-gray-300 hover:text-gray-700'}"
						>
							<span class="mr-2">{item.icon}</span>
							{item.name}
						</a>
					{/each}
				</div>
			</div>

			<!-- User menu -->
			<div class="flex items-center space-x-4">
				<!-- User info -->
				<div class="hidden sm:flex sm:items-center sm:space-x-2">
					<div class="text-sm">
						<p class="font-medium text-gray-900">{auth.displayName}</p>
						<p class="text-xs text-gray-500 capitalize">{auth.profile?.role}</p>
					</div>
				</div>

				<!-- User menu dropdown -->
				<div class="relative">
					<button
						onclick={toggleUserMenu}
						class="flex items-center rounded-full bg-white p-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
						id="user-menu-button"
						aria-expanded={userMenuOpen}
						aria-haspopup="true"
					>
						<span class="sr-only">Open user menu</span>
						<div class="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100">
							<span class="text-sm font-medium text-blue-600">
								{auth.displayName.charAt(0).toUpperCase()}
							</span>
						</div>
					</button>

					{#if userMenuOpen}
						<div
							class="absolute right-0 z-10 mt-2 w-48 origin-top-right rounded-md bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none"
							role="menu"
							aria-orientation="vertical"
							aria-labelledby="user-menu-button"
							tabindex="-1"
						>
							<a
								href="/profile"
								class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
								role="menuitem"
								onclick={closeUserMenu}
							>
								Profile Settings
							</a>
							<button
								onclick={handleLogout}
								class="block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
								role="menuitem"
							>
								Sign Out
							</button>
						</div>
					{/if}
				</div>
			</div>
		</div>
	</div>

	<!-- Mobile navigation menu (simplified) -->
	<div class="sm:hidden">
		<div class="space-y-1 pt-2 pb-3">
			{#each navigationItems as item}
				<a
					href={item.href}
					class="block py-2 pr-4 pl-3 text-base font-medium transition-colors {isCurrentPage(
						item.href
					)
						? 'border-r-4 border-blue-500 bg-blue-50 text-blue-700'
						: 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'}"
				>
					<span class="mr-2">{item.icon}</span>
					{item.name}
				</a>
			{/each}
		</div>

		<!-- Mobile user section -->
		<div class="border-t border-gray-200 pt-4 pb-3">
			<div class="flex items-center px-4">
				<div class="flex-shrink-0">
					<div class="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100">
						<span class="text-sm font-medium text-blue-600">
							{auth.displayName.charAt(0).toUpperCase()}
						</span>
					</div>
				</div>
				<div class="ml-3">
					<div class="text-base font-medium text-gray-800">{auth.displayName}</div>
					<div class="text-sm text-gray-500 capitalize">{auth.profile?.role}</div>
				</div>
			</div>
			<div class="mt-3 space-y-1">
				<a
					href="/profile"
					class="block px-4 py-2 text-base font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-800"
				>
					Profile Settings
				</a>
				<button
					onclick={handleLogout}
					class="block w-full px-4 py-2 text-left text-base font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-800"
				>
					Sign Out
				</button>
			</div>
		</div>
	</div>
</nav>
