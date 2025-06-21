<script lang="ts">
	import { auth } from '$lib/stores/auth.svelte';
	import { ChevronDown, Church, Building, Settings, LogOut, Trash2 } from 'lucide-svelte';
	import type { Church as ChurchType } from '$lib/types/church';

	// Component state
	let dropdownOpen = $state<boolean>(false);
	let confirmLeave = $state<string | null>(null);
	let confirmDelete = $state<string | null>(null);

	function toggleDropdown() {
		dropdownOpen = !dropdownOpen;
	}

	function closeDropdown() {
		dropdownOpen = false;
		confirmLeave = null;
		confirmDelete = null;
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

	async function handleDeleteChurch(churchId: string) {
		if (confirmDelete !== churchId) {
			confirmDelete = churchId;
			return;
		}

		try {
			await auth.deleteChurch(churchId);
			closeDropdown();
			// Refresh page after deleting
			window.location.reload();
		} catch (error) {
			console.error('Failed to delete church:', error);
			auth.error = error instanceof Error ? error.message : 'Failed to delete church';
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

	function canLeaveChurch(church: ChurchType): boolean {
		// Can't leave if it's the only church
		if (auth.availableChurches.length === 1) return false;
		
		// TODO: Check if user is the only admin (would need additional API call)
		return true;
	}

	function canDeleteChurch(church: ChurchType): boolean {
		// Only current church admin can delete
		return auth.currentChurch?.id === church.id && auth.canManageChurch;
	}
</script>

{#if auth.currentChurch && auth.availableChurches.length > 0}
	<div class="relative" id="church-switcher">
		<button
			onclick={toggleDropdown}
			class="flex items-center space-x-2 rounded-md bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-colors"
			aria-expanded={dropdownOpen}
			aria-haspopup="true"
		>
			<Church class="h-4 w-4 text-primary" />
			<span class="max-w-32 truncate">{getChurchDisplayName(auth.currentChurch)}</span>
			{#if auth.hasMultipleChurches}
				<ChevronDown class="h-3 w-3 text-gray-400 {dropdownOpen ? 'rotate-180' : ''} transition-transform" />
			{/if}
			{#if auth.churchLoading}
				<div class="h-3 w-3 animate-spin rounded-full border border-primary border-t-transparent"></div>
			{/if}
		</button>

		{#if dropdownOpen && auth.hasMultipleChurches}
			<div
				class="absolute right-0 z-20 mt-2 w-72 origin-top-right rounded-md bg-white py-2 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none"
				role="menu"
				aria-orientation="vertical"
			>
				<!-- Header -->
				<div class="px-4 py-2 border-b border-gray-100">
					<p class="text-xs font-medium text-gray-500 uppercase tracking-wider">Your Churches</p>
				</div>

				<!-- Church list -->
				<div class="py-1">
					{#each auth.availableChurches as church}
						<div class="group relative">
							<!-- Main church button -->
							<button
								onclick={() => handleChurchSwitch(church.id)}
								class="flex w-full items-center px-4 py-3 text-left hover:bg-gray-50 transition-colors"
								class:bg-primary={church.id === auth.currentChurch?.id}
								role="menuitem"
							>
								<div class="flex-1 min-w-0">
									<div class="flex items-center space-x-2">
										<Building class="h-4 w-4 text-gray-400 flex-shrink-0" />
										<div class="min-w-0 flex-1">
											<p class="text-sm font-medium text-gray-900 truncate">
												{getChurchDisplayName(church)}
											</p>
											{#if church.city || church.timezone}
												<p class="text-xs text-gray-500 truncate">
													{church.city || ''}{church.city && church.timezone ? ' • ' : ''}{church.timezone || ''}
												</p>
											{/if}
										</div>
									</div>
								</div>

								{#if church.id === auth.currentChurch?.id}
									<div class="ml-2 flex-shrink-0">
										<div class="h-2 w-2 rounded-full bg-primary"></div>
									</div>
								{/if}
							</button>

							<!-- Church management buttons -->
							{#if church.id !== auth.currentChurch?.id && canLeaveChurch(church)}
								<div class="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
									<button
										onclick={(e) => { e.stopPropagation(); handleLeaveChurch(church.id); }}
										class="p-1 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
										title={confirmLeave === church.id ? 'Click again to confirm' : 'Leave church'}
										class:text-red-600={confirmLeave === church.id}
										class:bg-red-50={confirmLeave === church.id}
									>
										<LogOut class="h-3 w-3" />
									</button>
								</div>
							{/if}

							{#if canDeleteChurch(church)}
								<div class="absolute right-8 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
									<button
										onclick={(e) => { e.stopPropagation(); handleDeleteChurch(church.id); }}
										class="p-1 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
										title={confirmDelete === church.id ? 'Click again to confirm' : 'Delete church'}
										class:text-red-600={confirmDelete === church.id}
										class:bg-red-50={confirmDelete === church.id}
									>
										<Trash2 class="h-3 w-3" />
									</button>
								</div>
							{/if}
						</div>
					{/each}
				</div>

				<!-- Footer with actions -->
				<div class="border-t border-gray-100 pt-2">
					<a
						href="/admin/churches"
						class="flex w-full items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
						onclick={closeDropdown}
						role="menuitem"
					>
						<Settings class="h-4 w-4 mr-3 text-gray-400" />
						Manage Churches
					</a>
				</div>

				<!-- Confirmation messages -->
				{#if confirmLeave}
					<div class="border-t border-gray-100 mt-1 px-4 py-2 bg-yellow-50">
						<p class="text-xs text-yellow-800">
							Click "Leave" again to confirm leaving this church.
						</p>
					</div>
				{/if}

				{#if confirmDelete}
					<div class="border-t border-gray-100 mt-1 px-4 py-2 bg-red-50">
						<p class="text-xs text-red-800">
							Click "Delete" again to permanently delete this church and all its data.
						</p>
					</div>
				{/if}
			</div>
		{/if}
	</div>
{/if}