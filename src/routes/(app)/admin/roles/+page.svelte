<script lang="ts">
	import { onMount } from 'svelte';
	import { getAuthStore } from '$lib/context/stores.svelte';
	import { createRolesAPI, type RolesAPI } from '$lib/api/roles';
	import { pb } from '$lib/api/client';
	import type { Role, Permission } from '$lib/types/permissions';
	import { PERMISSIONS, PERMISSION_DESCRIPTIONS } from '$lib/types/permissions';
	import Button from '$lib/components/ui/Button.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import Modal from '$lib/components/ui/Modal.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import FormField from '$lib/components/ui/FormField.svelte';
	import { Plus, Edit2, Trash2, Shield } from 'lucide-svelte';

	const auth = getAuthStore();
	let rolesAPI: RolesAPI;

	// State
	let roles = $state<Role[]>([]);
	let loading = $state(true);
	let error = $state<string | null>(null);
	let showCreateModal = $state(false);
	let editingRole = $state<Role | null>(null);
	let deletingRole = $state<Role | null>(null);

	// Form state
	let formData = $state({
		name: '',
		slug: '',
		permissions: [] as Permission[]
	});

	// Permission validation
	let missingPermissions = $state<Permission[]>([]);

	// Initialize API reactively with runes
	$effect(() => {
		const ctx = auth.getAuthContext();
		if (ctx?.currentChurch) {
			rolesAPI = createRolesAPI(ctx, pb);
		}
	});

	async function loadRoles() {
		if (!rolesAPI) return;

		try {
			loading = true;
			error = null;
			roles = await rolesAPI.getRoles();

			// Check permission coverage
			const coverage = await rolesAPI.validatePermissionCoverage();
			missingPermissions = coverage.missingPermissions;
		} catch (err) {
			console.error('Failed to load roles:', err);
			error = err instanceof Error ? err.message : 'Failed to load roles';
		} finally {
			loading = false;
		}
	}

	function startCreateRole() {
		formData = {
			name: '',
			slug: '',
			permissions: []
		};
		showCreateModal = true;
	}

	function startEditRole(role: Role) {
		formData = {
			name: role.name,
			slug: role.slug,
			permissions: [...role.permissions]
		};
		editingRole = role;
	}

	function togglePermission(permission: Permission) {
		const index = formData.permissions.indexOf(permission);
		if (index === -1) {
			formData.permissions = [...formData.permissions, permission];
		} else {
			formData.permissions = formData.permissions.filter((p) => p !== permission);
		}
	}

	async function handleCreateRole() {
		if (!rolesAPI || !formData.name || !formData.slug) return;

		try {
			loading = true;
			await rolesAPI.createRole({
				name: formData.name,
				slug: formData.slug,
				permissions: formData.permissions
			});
			showCreateModal = false;
			await loadRoles();
		} catch (err) {
			console.error('Failed to create role:', err);
			error = err instanceof Error ? err.message : 'Failed to create role';
		} finally {
			loading = false;
		}
	}

	async function handleUpdateRole() {
		if (!rolesAPI || !editingRole) return;

		try {
			loading = true;
			await rolesAPI.updateRole(editingRole.id, {
				name: formData.name,
				permissions: formData.permissions
			});
			editingRole = null;
			await loadRoles();
		} catch (err) {
			console.error('Failed to update role:', err);
			error = err instanceof Error ? err.message : 'Failed to update role';
		} finally {
			loading = false;
		}
	}

	async function handleDeleteRole() {
		if (!rolesAPI || !deletingRole) return;

		try {
			loading = true;
			await rolesAPI.deleteRole(deletingRole.id);
			deletingRole = null;
			await loadRoles();
		} catch (err) {
			console.error('Failed to delete role:', err);
			error = err instanceof Error ? err.message : 'Failed to delete role';
		} finally {
			loading = false;
		}
	}

	// Generate slug from name
	function generateSlug(name: string): string {
		return name
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, '-')
			.replace(/^-|-$/g, '');
	}

	// Update slug when name changes (only for new roles)
	$effect(() => {
		if (showCreateModal && formData.name && !editingRole) {
			formData.slug = generateSlug(formData.name);
		}
	});

	// Count users with role
	async function getUserCount(roleId: string): Promise<number> {
		if (!rolesAPI) return 0;
		try {
			const users = await rolesAPI.getUsersByRole(roleId);
			return users.length;
		} catch {
			return 0;
		}
	}

	onMount(() => {
		if (auth.currentChurch) {
			loadRoles();
		}
	});
</script>

<svelte:head>
	<title>Role Management - WorshipWise</title>
</svelte:head>

<div class="space-y-6">
	<!-- Header -->
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-2xl font-semibold text-gray-900">Role Management</h1>
			<p class="mt-1 text-sm text-gray-500">
				Define custom roles and permissions for your church members
			</p>
		</div>
		<Button onclick={startCreateRole} disabled={loading}>
			<Plus class="mr-2 h-4 w-4" />
			Create Role
		</Button>
	</div>

	<!-- Permission Coverage Warning -->
	{#if missingPermissions.length > 0}
		<Card>
			<div class="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
				<div class="flex items-start">
					<Shield class="mt-0.5 mr-3 h-5 w-5 text-yellow-600" />
					<div>
						<h3 class="text-sm font-medium text-yellow-800">Missing Permission Coverage</h3>
						<p class="mt-1 text-sm text-yellow-700">
							The following permissions are not assigned to any role:
						</p>
						<ul class="mt-2 list-inside list-disc text-sm text-yellow-700">
							{#each missingPermissions as permission}
								<li>{PERMISSION_DESCRIPTIONS[permission]}</li>
							{/each}
						</ul>
					</div>
				</div>
			</div>
		</Card>
	{/if}

	<!-- Error Message -->
	{#if error}
		<Card>
			<div class="rounded-lg border border-red-200 bg-red-50 p-4">
				<p class="text-sm text-red-800">{error}</p>
			</div>
		</Card>
	{/if}

	<!-- Roles List -->
	{#if loading && roles.length === 0}
		<Card>
			<div class="p-8 text-center">
				<div class="border-primary mx-auto h-8 w-8 animate-spin rounded-full border-b-2"></div>
				<p class="mt-2 text-sm text-gray-500">Loading roles...</p>
			</div>
		</Card>
	{:else if roles.length === 0}
		<Card>
			<div class="p-8 text-center">
				<Shield class="mx-auto h-12 w-12 text-gray-400" />
				<h3 class="mt-2 text-sm font-medium text-gray-900">No roles yet</h3>
				<p class="mt-1 text-sm text-gray-500">Get started by creating your first role.</p>
				<div class="mt-6">
					<Button onclick={startCreateRole}>
						<Plus class="mr-2 h-4 w-4" />
						Create Role
					</Button>
				</div>
			</div>
		</Card>
	{:else}
		<div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
			{#each roles as role (role.id)}
				{@const userCount = getUserCount(role.id)}
				<Card>
					<div class="p-6">
						<div class="flex items-start justify-between">
							<div>
								<h3 class="text-lg font-medium text-gray-900">{role.name}</h3>
								<p class="text-sm text-gray-500">Slug: {role.slug}</p>
							</div>
							{#if role.is_builtin}
								<Badge variant="secondary" size="sm">Built-in</Badge>
							{/if}
						</div>

						<div class="mt-4 space-y-2">
							<p class="text-sm font-medium text-gray-700">Permissions:</p>
							<div class="flex flex-wrap gap-2">
								{#each role.permissions as permission}
									<Badge variant="primary" size="sm">
										{permission}
									</Badge>
								{/each}
								{#if role.permissions.length === 0}
									<span class="text-sm text-gray-500">No permissions assigned</span>
								{/if}
							</div>
						</div>

						<div class="mt-4 flex items-center justify-between">
							<p class="text-sm text-gray-500">
								{#await userCount}
									<span class="inline-block h-4 w-16 animate-pulse rounded bg-gray-200"></span>
								{:then count}
									{count} {count === 1 ? 'user' : 'users'}
								{/await}
							</p>
							<div class="flex items-center gap-2">
								<Button
									variant="ghost"
									size="sm"
									onclick={() => startEditRole(role)}
									disabled={loading}
								>
									<Edit2 class="h-4 w-4" />
								</Button>
								{#if !role.is_builtin}
									<Button
										variant="ghost"
										size="sm"
										onclick={() => (deletingRole = role)}
										disabled={loading}
									>
										<Trash2 class="h-4 w-4" />
									</Button>
								{/if}
							</div>
						</div>
					</div>
				</Card>
			{/each}
		</div>
	{/if}
</div>

<!-- Create Role Modal -->
<Modal open={showCreateModal} title="Create Role" onclose={() => (showCreateModal = false)}>
	<form
		onsubmit={(e) => {
			e.preventDefault();
			handleCreateRole();
		}}
	>
		<div class="space-y-4">
			<FormField label="Name" for="name" required>
				<Input
					id="name"
					name="name"
					bind:value={formData.name}
					placeholder="e.g., Worship Coordinator"
					required
				/>
			</FormField>

			<FormField 
				label="Slug" 
				for="slug" 
				required
				helpText="Lowercase letters, numbers, and hyphens only"
			>
				<Input
					id="slug"
					name="slug"
					bind:value={formData.slug}
					placeholder="e.g., worship-coordinator"
					required
				/>
			</FormField>

			<div>
				<label class="mb-2 block text-sm font-medium text-gray-700">Permissions</label>
				<div class="space-y-2">
					{#each Object.entries(PERMISSION_DESCRIPTIONS) as [permission, description]}
						<label class="flex items-start">
							<input
								type="checkbox"
								checked={formData.permissions.includes(permission as Permission)}
								onchange={() => togglePermission(permission as Permission)}
								class="text-primary focus:ring-primary mt-0.5 h-4 w-4 rounded border-gray-300"
							/>
							<span class="ml-2">
								<span class="text-sm font-medium text-gray-700">{permission}</span>
								<span class="block text-xs text-gray-500">{description}</span>
							</span>
						</label>
					{/each}
				</div>
			</div>
		</div>

		<div class="mt-6 flex justify-end gap-3">
			<Button type="button" variant="outline" onclick={() => (showCreateModal = false)}>
				Cancel
			</Button>
			<Button type="submit" disabled={loading || !formData.name || !formData.slug}>
				Create Role
			</Button>
		</div>
	</form>
</Modal>

<!-- Edit Role Modal -->
{#if editingRole}
	<Modal open={!!editingRole} title="Edit Role" onclose={() => (editingRole = null)}>
		<form
			onsubmit={(e) => {
				e.preventDefault();
				handleUpdateRole();
			}}
		>
			<div class="space-y-4">
				<FormField label="Name" for="edit-name" required>
					<Input id="edit-name" name="edit-name" bind:value={formData.name} required />
				</FormField>

				<FormField label="Slug">
					<p class="text-sm text-gray-500">{editingRole.slug} (cannot be changed)</p>
				</FormField>

				<div>
					<label class="mb-2 block text-sm font-medium text-gray-700">Permissions</label>
					<div class="space-y-2">
						{#each Object.entries(PERMISSION_DESCRIPTIONS) as [permission, description]}
							<label class="flex items-start">
								<input
									type="checkbox"
									checked={formData.permissions.includes(permission as Permission)}
									onchange={() => togglePermission(permission as Permission)}
									class="text-primary focus:ring-primary mt-0.5 h-4 w-4 rounded border-gray-300"
								/>
								<span class="ml-2">
									<span class="text-sm font-medium text-gray-700">{permission}</span>
									<span class="block text-xs text-gray-500">{description}</span>
								</span>
							</label>
						{/each}
					</div>
				</div>
			</div>

			<div class="mt-6 flex justify-end gap-3">
				<Button type="button" variant="outline" onclick={() => (editingRole = null)}>Cancel</Button>
				<Button type="submit" disabled={loading || !formData.name}>Update Role</Button>
			</div>
		</form>
	</Modal>
{/if}

<!-- Delete Confirmation Modal -->
{#if deletingRole}
	<Modal open={!!deletingRole} title="Delete Role" onclose={() => (deletingRole = null)}>
		<p class="text-sm text-gray-600">
			Are you sure you want to delete the role "{deletingRole.name}"? This action cannot be undone.
		</p>
		{#await getUserCount(deletingRole.id) then count}
			{#if count > 0}
				<p class="mt-2 text-sm text-red-600">
					Warning: This role is currently assigned to {count}
					{count === 1 ? 'user' : 'users'}. You must reassign these users before deleting the role.
				</p>
			{/if}
		{/await}

		<div class="mt-6 flex justify-end gap-3">
			<Button variant="outline" onclick={() => (deletingRole = null)}>Cancel</Button>
			<Button variant="danger" onclick={handleDeleteRole} disabled={loading}>Delete Role</Button>
		</div>
	</Modal>
{/if}
