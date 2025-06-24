<script lang="ts">
	import { onMount } from 'svelte';
	import {
		getUsers,
		searchUsers,
		getUsersByRole,
		deactivateUser,
		reactivateUser,
		deleteUser,
		changeUserRole,
		type UserWithMembership,
		type UserListResponse
	} from '$lib/api/admin';
	import Button from '$lib/components/ui/Button.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import Select from '$lib/components/ui/Select.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import UserEditModal from '$lib/components/admin/UserEditModal.svelte';
	import ConfirmDialog from '$lib/components/admin/ConfirmDialog.svelte';
	import { auth } from '$lib/stores/auth.svelte';
	import { Trash2 } from 'lucide-svelte';

	// State
	let users = $state<UserListResponse | null>(null);
	let loading = $state(true);
	let error = $state<string | null>(null);

	// Search and filters
	let searchQuery = $state('');
	let roleFilter = $state('');
	let currentPage = $state(1);
	let perPage = $state(20);

	// Modals and actions
	let editingUser = $state<UserWithMembership | null>(null);
	let deletingUser = $state<UserWithMembership | null>(null);
	let deletingChurch = $state(false);
	let actionLoading = $state(false);

	// Search debounce
	let searchTimeout: ReturnType<typeof setTimeout> | null = null;

	// Derived state
	let isOnlyMember = $derived(users?.totalItems === 1);

	async function handleDeleteChurch() {
		if (!auth.currentChurch) return;

		try {
			actionLoading = true;
			await auth.deleteChurch(auth.currentChurch.id);
			deletingChurch = false;
			// Redirect to setup since church is deleted
			window.location.href = '/setup';
		} catch (error) {
			console.error('Failed to delete church:', error);
			// Handle error appropriately
		} finally {
			actionLoading = false;
		}
	}

	async function loadUsers() {
		try {
			loading = true;
			error = null;

			let result: UserListResponse;

			if (searchQuery.trim()) {
				result = await searchUsers(searchQuery, currentPage, perPage);
			} else if (roleFilter) {
				result = await getUsersByRole(roleFilter, currentPage, perPage);
			} else {
				result = await getUsers(currentPage, perPage);
			}

			users = result;
		} catch (err: unknown) {
			console.error('Failed to load users:', err);
			error = err instanceof Error ? err.message : 'Failed to load users';
		} finally {
			loading = false;
		}
	}

	function handleSearch() {
		if (searchTimeout) {
			clearTimeout(searchTimeout);
		}

		searchTimeout = setTimeout(() => {
			currentPage = 1;
			loadUsers();
		}, 300);
	}

	function handleRoleFilter() {
		currentPage = 1;
		loadUsers();
	}

	function clearFilters() {
		searchQuery = '';
		roleFilter = '';
		currentPage = 1;
		loadUsers();
	}

	async function handleToggleActive(user: UserWithMembership) {
		try {
			actionLoading = true;
			const isActive = user.membership?.is_active !== false;

			if (isActive) {
				await deactivateUser(user.id);
			} else {
				await reactivateUser(user.id);
			}

			// Reload users to get updated data
			await loadUsers();
		} catch (err: unknown) {
			console.error('Failed to toggle user status:', err);
			error = err instanceof Error ? err.message : 'Failed to update user status';
		} finally {
			actionLoading = false;
		}
	}

	async function handleRoleChange(
		user: UserWithMembership,
		newRole: 'musician' | 'leader' | 'admin'
	) {
		try {
			actionLoading = true;
			await changeUserRole(user.id, newRole);
			await loadUsers();
		} catch (err: unknown) {
			console.error('Failed to change user role:', err);
			error = err instanceof Error ? err.message : 'Failed to change user role';
		} finally {
			actionLoading = false;
		}
	}

	async function handleDeleteUser() {
		if (!deletingUser) return;

		try {
			actionLoading = true;
			await deleteUser(deletingUser.id);
			deletingUser = null;
			await loadUsers();
		} catch (err: unknown) {
			console.error('Failed to delete user:', err);
			error = err instanceof Error ? err.message : 'Failed to delete user';
		} finally {
			actionLoading = false;
		}
	}

	function formatDate(dateString: string): string {
		return new Date(dateString).toLocaleDateString();
	}

	function getRoleBadgeColor(role: string): 'red' | 'yellow' | 'blue' | 'gray' {
		switch (role) {
			case 'admin':
				return 'red';
			case 'leader':
				return 'yellow';
			case 'musician':
				return 'blue';
			default:
				return 'gray';
		}
	}

	onMount(() => {
		loadUsers();
	});

	// Watch for search changes
	$effect(() => {
		if (searchQuery !== undefined) {
			handleSearch();
		}
	});
</script>

<div class="space-y-6">
	<!-- Header and controls -->
	<div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
		<div>
			<h2 class="font-title text-xl font-semibold text-gray-900">User Management</h2>
			<p class="text-sm text-gray-500">
				{users ? `${users.totalItems} total users` : 'Loading users...'}
			</p>
		</div>
	</div>

	<!-- Search and filters -->
	<Card>
		<div class="p-4">
			<div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
				<div>
					<Input
						name="search"
						bind:value={searchQuery}
						placeholder="Search by email or name..."
						class="w-full"
					/>
				</div>

				<div>
					<Select
						name="roleFilter"
						bind:value={roleFilter}
						onchange={handleRoleFilter}
						class="w-full"
					>
						<option value="">All Roles</option>
						<option value="admin">Administrators</option>
						<option value="leader">Leaders</option>
						<option value="musician">Musicians</option>
					</Select>
				</div>

				<div class="flex gap-2">
					<Button onclick={clearFilters} variant="outline" size="sm">Clear Filters</Button>
					<Button onclick={loadUsers} variant="outline" size="sm" disabled={loading}>
						{loading ? 'Loading...' : 'Refresh'}
					</Button>
				</div>
			</div>
		</div>
	</Card>

	<!-- Error message -->
	{#if error}
		<Card>
			<div class="p-4">
				<div class="flex items-center text-red-600">
					<span class="mr-2">⚠️</span>
					<span>{error}</span>
					<Button onclick={() => (error = null)} variant="outline" size="sm" class="ml-auto">
						Dismiss
					</Button>
				</div>
			</div>
		</Card>
	{/if}

	<!-- Users table -->
	<Card>
		{#if loading}
			<div class="p-8 text-center">
				<div class="border-primary mx-auto h-8 w-8 animate-spin rounded-full border-b-2"></div>
				<p class="mt-2 text-sm text-gray-500">Loading users...</p>
			</div>
		{:else if users && users.items.length > 0}
			<div class="overflow-x-auto">
				<table class="min-w-full divide-y divide-gray-200">
					<thead class="bg-gray-50">
						<tr>
							<th
								class="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
							>
								User
							</th>
							<th
								class="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
							>
								Role
							</th>
							<th
								class="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
							>
								Status
							</th>
							<th
								class="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
							>
								Created
							</th>
							<th
								class="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
							>
								Actions
							</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-gray-200 bg-white">
						{#each users.items as user (user.id)}
							<tr class="hover:bg-gray-50">
								<td class="px-6 py-4 whitespace-nowrap">
									<div class="flex items-center">
										<div class="h-10 w-10 flex-shrink-0">
											<div
												class="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100"
											>
												<span class="text-sm font-medium text-blue-600">
													{(user.name || user.email).charAt(0).toUpperCase()}
												</span>
											</div>
										</div>
										<div class="ml-4">
											<div class="text-sm font-medium text-gray-900">
												{user.name || 'No name'}
											</div>
											<div class="text-sm text-gray-500">{user.email}</div>
											{#if user.membership?.expand?.church_id}
												<div class="text-xs text-gray-400">
													{user.membership.expand.church_id.name}
												</div>
											{/if}
										</div>
									</div>
								</td>
								<td class="px-6 py-4 whitespace-nowrap">
									{#if user.membership?.role}
										<Badge color={getRoleBadgeColor(user.membership.role)}>
											{user.membership.role}
										</Badge>
									{:else}
										<Badge color="gray">No membership</Badge>
									{/if}
								</td>
								<td class="px-6 py-4 whitespace-nowrap">
									<div class="flex items-center">
										{#if user.membership?.is_active !== false}
											<Badge color="green">Active</Badge>
										{:else}
											<Badge color="red">Inactive</Badge>
										{/if}
										{#if user.verified}
											<span class="ml-2 text-green-500" title="Email verified">✓</span>
										{:else}
											<span class="ml-2 text-yellow-500" title="Email not verified">⚠️</span>
										{/if}
									</div>
								</td>
								<td class="px-6 py-4 text-sm whitespace-nowrap text-gray-500">
									{formatDate(user.created)}
								</td>
								<td class="px-6 py-4 text-sm font-medium whitespace-nowrap">
									<div class="flex items-center space-x-2">
										<Button
											onclick={() => (editingUser = user)}
											variant="outline"
											size="sm"
											disabled={actionLoading}
										>
											Edit
										</Button>

										<!-- Role change dropdown -->
										{#if user.membership}
											<Select
												name="userRole"
												value={user.membership.role}
												onchange={(value) =>
													handleRoleChange(user, value as 'musician' | 'leader' | 'admin')}
												class="text-sm"
												disabled={actionLoading}
											>
												<option value="musician">Musician</option>
												<option value="leader">Leader</option>
												<option value="admin">Admin</option>
											</Select>
										{/if}

										<Button
											onclick={() => handleToggleActive(user)}
											variant="outline"
											size="sm"
											disabled={actionLoading}
										>
											{user.membership?.is_active !== false ? 'Deactivate' : 'Activate'}
										</Button>

										<Button
											onclick={() => (deletingUser = user)}
											variant="danger"
											size="sm"
											disabled={actionLoading}
										>
											Delete
										</Button>
									</div>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>

			<!-- Pagination -->
			{#if users.totalPages > 1}
				<div
					class="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6"
				>
					<div class="flex flex-1 justify-between sm:hidden">
						<Button
							onclick={() => {
								currentPage = Math.max(1, currentPage - 1);
								loadUsers();
							}}
							disabled={currentPage <= 1 || loading}
							variant="outline"
							size="sm"
						>
							Previous
						</Button>
						<Button
							onclick={() => {
								currentPage = Math.min(users?.totalPages || 1, currentPage + 1);
								loadUsers();
							}}
							disabled={currentPage >= (users?.totalPages || 1) || loading}
							variant="outline"
							size="sm"
						>
							Next
						</Button>
					</div>
					<div class="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
						<div>
							<p class="text-sm text-gray-700">
								Showing page <span class="font-medium">{currentPage}</span> of
								<span class="font-medium">{users.totalPages}</span>
								({users.totalItems} total users)
							</p>
						</div>
						<div>
							<nav
								class="relative z-0 inline-flex -space-x-px rounded-md shadow-sm"
								aria-label="Pagination"
							>
								<Button
									onclick={() => {
										currentPage = Math.max(1, currentPage - 1);
										loadUsers();
									}}
									disabled={currentPage <= 1 || loading}
									variant="outline"
									size="sm"
								>
									Previous
								</Button>
								<Button
									onclick={() => {
										currentPage = Math.min(users?.totalPages || 1, currentPage + 1);
										loadUsers();
									}}
									disabled={currentPage >= (users?.totalPages || 1) || loading}
									variant="outline"
									size="sm"
								>
									Next
								</Button>
							</nav>
						</div>
					</div>
				</div>
			{/if}
		{:else}
			<div class="p-8 text-center">
				<div class="mb-4 text-4xl text-gray-400">👥</div>
				<h3 class="mb-2 text-lg font-medium text-gray-900">No users found</h3>
				<p class="text-sm text-gray-500">
					{searchQuery || roleFilter
						? 'Try adjusting your search or filters.'
						: 'No users have been created yet.'}
				</p>
			</div>
		{/if}
	</Card>

	<!-- Delete Church Section - Only show if user is the only member -->
	{#if isOnlyMember && auth.isAdmin}
		<Card class="mt-6 border-red-200 bg-red-50">
			<div class="p-6">
				<div class="flex items-start space-x-3">
					<Trash2 class="h-6 w-6 text-red-600 mt-0.5" />
					<div class="flex-1">
						<h3 class="text-lg font-medium text-red-900">Delete Church</h3>
						<p class="mt-1 text-sm text-red-700">
							You are the only member of this church. If you no longer need this church, you can permanently delete it and all its data.
						</p>
						<p class="mt-2 text-sm text-red-600 font-medium">
							Warning: This action cannot be undone. All songs, services, and church data will be permanently deleted.
						</p>
						<div class="mt-4">
							<Button
								onclick={() => (deletingChurch = true)}
								variant="danger"
								size="sm"
							>
								<Trash2 class="mr-2 h-4 w-4" />
								Delete Church
							</Button>
						</div>
					</div>
				</div>
			</div>
		</Card>
	{/if}
</div>

<!-- Edit User Modal -->
{#if editingUser}
	<UserEditModal
		user={editingUser}
		open={!!editingUser}
		onclose={() => (editingUser = null)}
		onsave={() => {
			editingUser = null;
			loadUsers();
		}}
	/>
{/if}

<!-- Delete Confirmation -->
{#if deletingUser}
	<ConfirmDialog
		open={!!deletingUser}
		title="Delete User"
		message="Are you sure you want to delete {deletingUser.name ||
			deletingUser.email}? This action cannot be undone and will permanently remove all user data."
		confirmLabel="Delete User"
		onconfirm={handleDeleteUser}
		oncancel={() => (deletingUser = null)}
		loading={actionLoading}
		danger={true}
	/>
{/if}

<!-- Delete Church Confirmation -->
{#if deletingChurch}
	<ConfirmDialog
		open={deletingChurch}
		title="Delete Church"
		message="Are you sure you want to permanently delete '{auth.currentChurch?.name}' and all its data? This includes all songs, services, analytics, and member information. This action cannot be undone."
		confirmLabel="Delete Church"
		onconfirm={handleDeleteChurch}
		oncancel={() => (deletingChurch = false)}
		loading={actionLoading}
		danger={true}
	/>
{/if}
