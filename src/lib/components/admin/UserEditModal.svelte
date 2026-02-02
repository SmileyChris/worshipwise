<script lang="ts">
	import {
		updateUser,
		updateUserMembership,
		getUserActivity,
		type UserWithMembership
	} from '$lib/api/admin';
	import type { User } from '$lib/types/auth';
	import type { ChurchMembership } from '$lib/types/church';
	import type { Role } from '$lib/types/permissions';
	import Modal from '$lib/components/ui/Modal.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import { getAuthStore } from '$lib/context/stores.svelte';

	interface Props {
		user: UserWithMembership;
		open: boolean;
		onclose: () => void;
		onsave: () => void;
	}

	let { user, open, onclose, onsave }: Props = $props();

	const auth = getAuthStore();

	// Form state
	let formData = $state({
		// User fields
		email: '',
		name: '',
		// Profile fields
		profileName: '',
		churchName: '',
		isActive: true
	});

	// Role management state
	let availableRoles = $state<Role[]>([]);
	let assignedRoleIds = $state<Set<string>>(new Set());
	let userRoleRecords = $state<Map<string, string>>(new Map()); // role_id -> user_role record id

	let loading = $state(false);
	let error = $state<string | null>(null);
	let userActivity = $state<{
		lastLogin?: string;
		servicesCreated: number;
		songsAdded: number;
	} | null>(null);

	// Initialize form data when user changes
	$effect(() => {
		if (user) {
			formData.email = user.email || '';
			formData.name = user.name || '';
			formData.profileName = user.name || '';
			formData.churchName = user.membership?.expand?.church_id?.name || '';
			formData.isActive = user.membership?.is_active !== false;
		}
	});

	async function loadUserActivity() {
		if (!user) return;

		try {
			const pb = auth.getAuthContext().pb;
			userActivity = await getUserActivity(pb, user.id);
		} catch (err) {
			console.error('Failed to load user activity:', err);
		}
	}

	async function loadRoles() {
		if (!user || !auth.currentChurch) return;

		try {
			const pb = auth.getAuthContext().pb;
			const churchId = auth.currentChurch.id;

			// Load available roles for this church
			const roles = await pb.collection('roles').getFullList({
				filter: `church_id = "${churchId}"`,
				sort: 'name'
			});
			availableRoles = roles as unknown as Role[];

			// Load user's current role assignments
			const userRoles = await pb.collection('user_roles').getFullList({
				filter: `church_id = "${churchId}" && user_id = "${user.id}"`
			});

			assignedRoleIds = new Set(userRoles.map((ur: { role_id: string }) => ur.role_id));
			userRoleRecords = new Map(userRoles.map((ur: { role_id: string; id: string }) => [ur.role_id, ur.id]));
		} catch (err) {
			console.error('Failed to load roles:', err);
		}
	}

	async function toggleRole(roleId: string) {
		if (!user || !auth.currentChurch) return;

		try {
			loading = true;
			const pb = auth.getAuthContext().pb;
			const churchId = auth.currentChurch.id;

			if (assignedRoleIds.has(roleId)) {
				// Remove role
				const userRoleId = userRoleRecords.get(roleId);
				if (userRoleId) {
					await pb.collection('user_roles').delete(userRoleId);
					assignedRoleIds.delete(roleId);
					userRoleRecords.delete(roleId);
					assignedRoleIds = new Set(assignedRoleIds);
				}
			} else {
				// Add role
				const newUserRole = await pb.collection('user_roles').create({
					church_id: churchId,
					user_id: user.id,
					role_id: roleId
				});
				assignedRoleIds.add(roleId);
				userRoleRecords.set(roleId, newUserRole.id);
				assignedRoleIds = new Set(assignedRoleIds);
			}
		} catch (err) {
			console.error('Failed to toggle role:', err);
			error = 'Failed to update role assignment';
		} finally {
			loading = false;
		}
	}

	async function handleSave(event: Event) {
		event.preventDefault();
		if (!user) return;

		try {
			loading = true;
			error = null;

			const pb = auth.getAuthContext().pb;

			// Update user record if email or name changed
			const userUpdates: Partial<User> = {};
			if (formData.email !== user.email) userUpdates.email = formData.email;
			if (formData.name !== user.name) userUpdates.name = formData.name;

			if (Object.keys(userUpdates).length > 0) {
				await updateUser(pb, user.id, userUpdates);
			}

			// Update membership if it exists and has changes
			if (user.membership) {
				const membershipUpdates: Partial<ChurchMembership> = {};
				if (formData.isActive !== (user.membership.is_active !== false))
					membershipUpdates.is_active = formData.isActive;

				if (Object.keys(membershipUpdates).length > 0) {
					await updateUserMembership(pb, user.membership.id, membershipUpdates);
				}
			}

			onsave();
		} catch (err: unknown) {
			console.error('Failed to update user:', err);
			error = (
				err && typeof err === 'object' && 'message' in err ? err.message : 'Failed to update user'
			) as string;
		} finally {
			loading = false;
		}
	}

	function handleCancel() {
		error = null;
		onclose();
	}

	// Load activity and roles when modal opens
	$effect(() => {
		if (open) {
			loadUserActivity();
			loadRoles();
		}
	});
</script>

<Modal {open} onclose={handleCancel} size="lg">
	<div class="space-y-6">
		<!-- Header -->
		<div>
			<h3 class="font-title text-lg font-semibold text-gray-900">Edit User</h3>
			<p class="text-sm text-gray-500">Update user information and profile details</p>
		</div>

		<!-- User activity stats -->
		{#if userActivity}
			<Card>
				<div class="p-4">
					<h4 class="mb-3 text-sm font-medium text-gray-900">User Activity</h4>
					<div class="grid grid-cols-2 gap-4 text-sm">
						<div>
							<span class="text-gray-500">Services Created:</span>
							<span class="ml-2 font-medium">{userActivity.servicesCreated}</span>
						</div>
						<div>
							<span class="text-gray-500">Songs Added:</span>
							<span class="ml-2 font-medium">{userActivity.songsAdded}</span>
						</div>
					</div>
				</div>
			</Card>
		{/if}

		<!-- Error message -->
		{#if error}
			<div class="rounded-md border border-red-200 bg-red-50 p-3">
				<div class="flex">
					<span class="mr-2 text-red-400">⚠️</span>
					<span class="text-sm text-red-700">{error}</span>
				</div>
			</div>
		{/if}

		<!-- Form -->
		<form onsubmit={handleSave} class="space-y-4">
			<!-- User Account Info -->
			<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
				<div>
					<label for="email" class="mb-1 block text-sm font-medium text-gray-700">
						Email Address
					</label>
					<Input
						id="email"
						name="email"
						type="email"
						bind:value={formData.email}
						placeholder="user@example.com"
						required
						disabled={loading}
					/>
				</div>

				<div>
					<label for="name" class="mb-1 block text-sm font-medium text-gray-700">
						Account Name
					</label>
					<Input
						id="name"
						name="name"
						bind:value={formData.name}
						placeholder="User's display name"
						disabled={loading}
					/>
				</div>
			</div>

			<!-- Profile Info -->
			<div class="border-t pt-4">
				<h4 class="mb-3 text-sm font-medium text-gray-900">Profile Information</h4>

				<div>
					<label for="profileName" class="mb-1 block text-sm font-medium text-gray-700">
						Display Name
					</label>
					<Input
						id="profileName"
						name="profileName"
						bind:value={formData.profileName}
						placeholder="Full name for display"
						disabled={loading}
					/>
				</div>

				<!-- Roles Section -->
				<div class="mt-4">
					<label class="mb-2 block text-sm font-medium text-gray-700">Roles</label>
					{#if availableRoles.length > 0}
						<div class="space-y-2">
							{#each availableRoles as role (role.id)}
								<label class="flex items-center">
									<input
										type="checkbox"
										checked={assignedRoleIds.has(role.id)}
										onchange={() => toggleRole(role.id)}
										disabled={loading}
										class="text-primary focus:ring-primary h-4 w-4 rounded border-gray-300"
									/>
									<span class="ml-2 flex items-center gap-2">
										<span class="text-sm text-gray-700">{role.name}</span>
										{#if role.is_builtin}
											<Badge variant="secondary" size="sm">Built-in</Badge>
										{/if}
									</span>
								</label>
							{/each}
						</div>
					{:else}
						<p class="text-sm text-gray-500">
							No roles defined. <a href="/admin/roles" class="text-primary hover:underline">Create roles</a> first.
						</p>
					{/if}
				</div>

				<div class="mt-4">
					<label class="flex items-center">
						<input
							type="checkbox"
							bind:checked={formData.isActive}
							disabled={loading}
							class="text-primary focus:ring-primary h-4 w-4 rounded border-gray-300"
						/>
						<span class="ml-2 text-sm text-gray-700">Active account</span>
					</label>
					<p class="mt-1 text-xs text-gray-500">
						Inactive accounts cannot log in or access the system
					</p>
				</div>
			</div>

			<!-- Actions -->
			<div class="flex justify-end space-x-3 border-t pt-4">
				<Button type="button" onclick={handleCancel} variant="outline" disabled={loading}>
					Cancel
				</Button>
				<Button type="submit" disabled={loading}>
					{loading ? 'Saving...' : 'Save Changes'}
				</Button>
			</div>
		</form>
	</div>
</Modal>
