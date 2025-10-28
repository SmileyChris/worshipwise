<script lang="ts">
	import { getAuthStore } from '$lib/context/stores.svelte';
	import { page } from '$app/stores';

	import { ChevronDown, Church, Building, Settings, LogOut, Plus, Mail } from 'lucide-svelte';
	import type { Church as ChurchType } from '$lib/types/church';
	import Button from '$lib/components/ui/Button.svelte';

	const auth = getAuthStore();

	// Component state
	let dropdownOpen = $state<boolean>(false);
	let confirmLeave = $state<string | null>(null);

	// Derived state
	let isInAdminContext = $derived($page.url.pathname.startsWith('/admin'));
	let hasSingleChurch = $derived(auth.availableChurches.length === 1);

	function toggleDropdown() {
		dropdownOpen = !dropdownOpen;
	}

	function closeDropdown() {
		dropdownOpen = false;
		confirmLeave = null;
	}

	async function handleChurchSwitch(churchId: string) {
		if (churchId === auth.currentChurch?.id) return;

		try {
			await auth.switchChurch(churchId);
			closeDropdown();
			// Optionally refresh the page to reload church-specific data
			window.location.reload();
		} catch (error) {
			console.error('Failed to switch church:', error);
		}
	}

	async function handleLeaveChurch(churchId: string) {
		if (confirmLeave !== churchId) {
			confirmLeave = churchId;
			return;
		}

		try {
			await auth.leaveChurch(churchId);
			closeDropdown();
			// Refresh page if we left the current church
			if (churchId === auth.currentChurch?.id) {
				window.location.reload();
			}
		} catch (error) {
			console.error('Failed to leave church:', error);
			auth.error = error instanceof Error ? error.message : 'Failed to leave church';
		}
	}

	function handleClickOutside(event: MouseEvent) {
		const target = event.target as Element;
		const dropdown = document.getElementById('church-switcher');

		if (dropdownOpen && dropdown && !dropdown.contains(target)) {
			closeDropdown();
		}
	}

	// Add click outside listener
	$effect(() => {
		if (dropdownOpen) {
			document.addEventListener('click', handleClickOutside);
			return () => {
				document.removeEventListener('click', handleClickOutside);
			};
		}
	});

	function getChurchDisplayName(church: ChurchType): string {
		return church.name || 'Unnamed Church';
	}

	function canLeaveChurch(): boolean {
		// Can't leave if it's the only church
		if (auth.availableChurches.length === 1) return false;

		// TODO: Check if user is the only admin (would need additional API call)
		return true;
	}
</script>

{#if auth.currentChurch && auth.availableChurches.length > 0}
	<div class="relative" id="church-switcher">
		<button
			onclick={toggleDropdown}
			class="flex h-16 items-center space-x-2 border-b-2 px-1 text-sm font-medium transition-colors focus:outline-none {isInAdminContext
				? 'border-primary text-primary'
				: 'border-transparent text-gray-700 hover:border-gray-300 hover:text-gray-700'}"
			aria-expanded={dropdownOpen}
			aria-haspopup="true"
		>
			<Church class="h-4 w-4 {isInAdminContext ? 'text-primary' : 'text-gray-500'}" />
			<span class="max-w-32 truncate">{getChurchDisplayName(auth.currentChurch)}</span>
			{#if auth.hasPendingInvites}
				<span class="relative flex h-2 w-2">
					<span
						class="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75"
					></span>
					<span class="relative inline-flex h-2 w-2 rounded-full bg-red-500"></span>
				</span>
			{/if}
			<ChevronDown
				class="h-3 w-3 text-gray-400 {dropdownOpen ? 'rotate-180' : ''} transition-transform"
			/>
			{#if auth.churchLoading}
				<div
					class="border-primary h-3 w-3 animate-spin rounded-full border border-t-transparent"
				></div>
			{/if}
		</button>

		{#if dropdownOpen}
			<div
				class="ring-opacity-5 absolute right-0 z-20 mt-2 w-72 origin-top-right rounded-md bg-white py-2 shadow-lg ring-1 ring-black focus:outline-none"
				role="menu"
				aria-orientation="vertical"
			>
				<!-- Header -->
				<div class="border-b border-gray-100 px-4 py-2">
					<p class="text-xs font-medium tracking-wider text-gray-500 uppercase">
						{hasSingleChurch ? 'Your church' : 'Your Churches'}
					</p>
				</div>

				<!-- Church list -->
				<div class="py-1">
					{#each auth.availableChurches as church (church.id)}
						<div class="group relative">
							<!-- Main church button -->
							<Button
								onclick={() => handleChurchSwitch(church.id)}
								variant="ghost"
								size="sm"
								fullWidth
								align="left"
								class="px-4 py-3 h-auto font-normal text-gray-900 hover:bg-primary hover:text-white border-0 rounded-none group/item"
							>
								<div class="min-w-0 flex-1">
									<div class="flex items-center space-x-2">
										<Building
											class="h-4 w-4 flex-shrink-0 text-gray-400 group-hover/item:text-white"
										/>
										<div class="min-w-0 flex-1">
											<p
												class="truncate text-sm font-medium text-gray-900 group-hover/item:text-white"
											>
												{getChurchDisplayName(church)}
											</p>
											{#if church.city}
												<p class="truncate text-xs text-gray-500 group-hover/item:text-white/80">
													{church.city}
												</p>
											{/if}
										</div>
									</div>
								</div>

								{#if church.id === auth.currentChurch?.id}
									<div class="ml-2 flex-shrink-0">
										<div class="bg-primary h-2 w-2 rounded-full"></div>
									</div>
								{/if}
							</Button>

							<!-- Church management buttons -->
							{#if church.id !== auth.currentChurch?.id && canLeaveChurch()}
								<div
									class="absolute top-1/2 right-2 -translate-y-1/2 opacity-0 transition-opacity group-hover:opacity-100"
								>
									<Button
										onclick={(e) => {
											e?.stopPropagation();
											handleLeaveChurch(church.id);
										}}
										variant="ghost"
										size="sm"
										class="p-1 h-auto text-gray-400 hover:bg-red-50 hover:text-red-600 border-0 {confirmLeave === church.id ? 'text-red-600 bg-red-50' : ''}"
										title={confirmLeave === church.id ? 'Click again to confirm' : 'Leave church'}
									>
										<LogOut class="h-3 w-3" />
									</Button>
								</div>
							{/if}
						</div>
					{/each}
				</div>

				<!-- Pending invitations section -->
				{#if auth.hasPendingInvites}
					<div class="border-t border-gray-100 py-1">
						<div class="px-4 py-2">
							<p class="text-xs font-medium tracking-wider text-gray-500 uppercase">
								Invitations ({auth.pendingInvitesCount})
							</p>
						</div>
						{#each auth.pendingInvites.slice(0, 3) as invite (invite.id)}
							<a
								href="/invites/{invite.token}"
								class="flex w-full cursor-pointer items-center px-4 py-2 text-sm transition-colors hover:bg-blue-50"
								onclick={closeDropdown}
								role="menuitem"
							>
								<Mail class="mr-3 h-4 w-4 text-blue-500" />
								<div class="min-w-0 flex-1">
									<p class="truncate font-medium text-gray-900">
										{invite.expand?.church_id?.name || 'Unknown Church'}
									</p>
									<p class="truncate text-xs text-gray-500">
										Invited as {invite.role}
									</p>
								</div>
							</a>
						{/each}
						{#if auth.pendingInvitesCount > 3}
							<a
								href="/invites"
								class="block px-4 py-2 text-center text-xs text-blue-600 hover:text-blue-800"
								onclick={closeDropdown}
							>
								View all invitations
							</a>
						{/if}
					</div>
				{/if}

				<!-- Footer with actions -->
				<div class="border-t border-gray-100 pt-2">
					<a
						href="/churches/add"
						class="flex w-full cursor-pointer items-center px-4 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-50"
						onclick={closeDropdown}
						role="menuitem"
					>
						<Plus class="mr-3 h-4 w-4 text-gray-400" />
						Add Church
					</a>
					{#if auth.isAdmin}
						<a
							href="/admin"
							class="flex w-full items-center px-4 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-50"
							onclick={closeDropdown}
							role="menuitem"
						>
							<Settings class="mr-3 h-4 w-4 text-gray-400" />
							Admin
						</a>
					{/if}
				</div>

				<!-- Confirmation messages -->
				{#if confirmLeave}
					<div class="mt-1 border-t border-gray-100 bg-yellow-50 px-4 py-2">
						<p class="text-xs text-yellow-800">
							Click "Leave" again to confirm leaving this church.
						</p>
					</div>
				{/if}
			</div>
		{/if}
	</div>
{/if}
