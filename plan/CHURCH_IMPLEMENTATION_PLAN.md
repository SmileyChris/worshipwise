# Church Implementation Plan

This document outlines the comprehensive plan for introducing multi-tenant church support to WorshipWise while maintaining backward compatibility and preserving all existing features.

## Executive Summary

**Goal**: Transform WorshipWise from a single-tenant system to a multi-tenant church-aware platform that maintains complete data isolation between churches while enabling powerful sharing features.

**Approach**: Multi-tenant row-level security using church scoping with backward-compatible migration.

**Timeline**: 3 phases over 4-6 weeks of development

## Phase 1: Foundation (Sprint 6) - Estimated 1-2 weeks

### 1.1 Database Schema Changes

#### New Collections

**Organizations Collection**

```typescript
interface Organization {
	id: string;
	name: string;
	slug: string; // URL-friendly identifier (unique)
	description?: string;
	subscription_type: 'free' | 'basic' | 'premium';
	subscription_status: 'active' | 'trial' | 'suspended' | 'cancelled';
	max_users: number;
	max_songs: number;
	max_storage_mb: number;
	settings: {
		default_service_types: string[];
		time_zone: string;
		week_start: 'sunday' | 'monday';
		repetition_window_days: number;
		allow_member_song_creation: boolean;
		auto_approve_members: boolean;
	};
	owner_user_id: string;
	billing_email?: string;
	is_active: boolean;
	created: string;
	updated: string;
}
```

**Organization Memberships Collection**

```typescript
interface OrganizationMembership {
	id: string;
	organization_id: string;
	user_id: string;
	role: 'member' | 'leader' | 'admin' | 'owner';
	permissions: string[]; // ['songs:create', 'services:manage', 'users:invite']
	status: 'active' | 'pending' | 'suspended';
	preferred_keys?: string[];
	notification_preferences?: {
		email_service_reminders: boolean;
		email_new_songs: boolean;
		email_member_activity: boolean;
	};
	invited_by?: string;
	invited_date?: string;
	joined_date?: string;
	is_active: boolean;
	created: string;
	updated: string;
}
```

**Organization Invitations Collection**

```typescript
interface OrganizationInvitation {
	id: string;
	organization_id: string;
	email: string;
	role: 'member' | 'leader' | 'admin';
	permissions: string[];
	invited_by: string;
	token: string; // UUID for invitation links
	expires_at: string;
	used_at?: string;
	used_by?: string;
	is_active: boolean;
	created: string;
	updated: string;
}
```

#### Modified Existing Collections

**Users Collection Changes**

- Remove role field (moved to organization membership)
- Remove church_name field (moved to organization)
- Add current_organization_id field (for UI context)

**Songs Collection Changes**

```typescript
interface Song {
	// ... existing fields ...
	organization_id: string;
	visibility: 'private' | 'organization' | 'public';
	shared_from_organization_id?: string; // if copied from another org
}
```

**Services Collection Changes**

```typescript
interface Service {
	// ... existing fields ...
	organization_id: string;
}
```

**Categories Collection Changes**

```typescript
interface Category {
	// ... existing fields ...
	organization_id: string | null; // null = global/system categories
	visibility: 'private' | 'organization' | 'public';
}
```

**Labels Collection Changes**

```typescript
interface Label {
	// ... existing fields ...
	organization_id: string;
}
```

### 1.2 PocketBase Security Rules Update

**Organizations Collection Rules**

```javascript
{
  "listRule": "@request.auth.id != '' && @collection.organization_memberships.user_id ?= @request.auth.id && @collection.organization_memberships.organization_id ?= id",
  "viewRule": "@request.auth.id != '' && @collection.organization_memberships.user_id ?= @request.auth.id && @collection.organization_memberships.organization_id ?= id",
  "createRule": "@request.auth.id != ''",
  "updateRule": "@request.auth.id != '' && (@collection.organization_memberships.user_id ?= @request.auth.id && @collection.organization_memberships.role ?~ 'admin|owner' && @collection.organization_memberships.organization_id ?= id)",
  "deleteRule": "@request.auth.id != '' && (@collection.organization_memberships.user_id ?= @request.auth.id && @collection.organization_memberships.role = 'owner' && @collection.organization_memberships.organization_id ?= id)"
}
```

**Songs Collection Rules (Updated)**

```javascript
{
  "listRule": "@request.auth.id != '' && (@collection.organization_memberships.user_id ?= @request.auth.id && @collection.organization_memberships.organization_id ?= organization_id && @collection.organization_memberships.is_active = true) || visibility = 'public'",
  "viewRule": "@request.auth.id != '' && ((@collection.organization_memberships.user_id ?= @request.auth.id && @collection.organization_memberships.organization_id ?= organization_id && @collection.organization_memberships.is_active = true) || visibility ?~ 'public|organization')",
  "createRule": "@request.auth.id != '' && @collection.organization_memberships.user_id ?= @request.auth.id && @collection.organization_memberships.organization_id ?= @request.data.organization_id && @collection.organization_memberships.is_active = true && (@collection.organization_memberships.role ?~ 'leader|admin|owner' || @collection.organization_memberships.permissions ?~ 'songs:create')",
  "updateRule": "@request.auth.id != '' && organization_id = @request.data.organization_id && ((@collection.organization_memberships.user_id ?= @request.auth.id && @collection.organization_memberships.organization_id ?= organization_id && @collection.organization_memberships.role ?~ 'leader|admin|owner') || created_by = @request.auth.id)",
  "deleteRule": "@request.auth.id != '' && ((@collection.organization_memberships.user_id ?= @request.auth.id && @collection.organization_memberships.organization_id ?= organization_id && @collection.organization_memberships.role ?~ 'admin|owner') || created_by = @request.auth.id)"
}
```

### 1.3 TypeScript Interface Updates

Create `/src/lib/types/organization.ts`:

```typescript
export interface Organization {
	id: string;
	name: string;
	slug: string;
	description?: string;
	subscription_type: 'free' | 'basic' | 'premium';
	subscription_status: 'active' | 'trial' | 'suspended' | 'cancelled';
	max_users: number;
	max_songs: number;
	max_storage_mb: number;
	settings: OrganizationSettings;
	owner_user_id: string;
	billing_email?: string;
	is_active: boolean;
	created: string;
	updated: string;

	// Computed fields
	expand?: {
		owner_user_id?: User;
		organization_memberships_via_organization_id?: OrganizationMembership[];
	};
}

export interface OrganizationSettings {
	default_service_types: string[];
	time_zone: string;
	week_start: 'sunday' | 'monday';
	repetition_window_days: number;
	allow_member_song_creation: boolean;
	auto_approve_members: boolean;
}

export interface OrganizationMembership {
	id: string;
	organization_id: string;
	user_id: string;
	role: OrganizationRole;
	permissions: string[];
	status: 'active' | 'pending' | 'suspended';
	preferred_keys?: string[];
	notification_preferences?: NotificationPreferences;
	invited_by?: string;
	invited_date?: string;
	joined_date?: string;
	is_active: boolean;
	created: string;
	updated: string;

	expand?: {
		organization_id?: Organization;
		user_id?: User;
		invited_by?: User;
	};
}

export type OrganizationRole = 'member' | 'leader' | 'admin' | 'owner';

export interface NotificationPreferences {
	email_service_reminders: boolean;
	email_new_songs: boolean;
	email_member_activity: boolean;
}

export interface OrganizationInvitation {
	id: string;
	organization_id: string;
	email: string;
	role: OrganizationRole;
	permissions: string[];
	invited_by: string;
	token: string;
	expires_at: string;
	used_at?: string;
	used_by?: string;
	is_active: boolean;
	created: string;
	updated: string;

	expand?: {
		organization_id?: Organization;
		invited_by?: User;
	};
}

// DTOs
export interface CreateOrganizationData {
	name: string;
	slug: string;
	description?: string;
	settings?: Partial<OrganizationSettings>;
}

export interface UpdateOrganizationData {
	name?: string;
	slug?: string;
	description?: string;
	settings?: Partial<OrganizationSettings>;
	billing_email?: string;
}

export interface InviteUserData {
	email: string;
	role: OrganizationRole;
	permissions?: string[];
}

export interface UpdateMembershipData {
	role?: OrganizationRole;
	permissions?: string[];
	status?: 'active' | 'suspended';
	preferred_keys?: string[];
	notification_preferences?: NotificationPreferences;
}
```

### 1.4 Migration Strategy

Create `/src/lib/data/organization-migration.ts`:

```typescript
import { pb } from '$lib/api/client';
import type { Organization, OrganizationMembership } from '$lib/types/organization';

export async function migrateToOrganizations(): Promise<void> {
	try {
		console.log('Starting organization migration...');

		// 1. Check if migration already completed
		const existingOrgs = await pb.collection('organizations').getList(1, 1);
		if (existingOrgs.totalItems > 0) {
			console.log('Organizations already exist, skipping migration');
			return;
		}

		// 2. Get all existing users
		const users = await pb.collection('users').getFullList();
		if (users.length === 0) {
			console.log('No users found, skipping migration');
			return;
		}

		// 3. Create default organization from first admin user or first user
		const adminUser = users.find((u) => u.role === 'admin') || users[0];
		const defaultOrgName = adminUser.church_name || `${adminUser.name}'s Church` || 'My Church';

		const defaultOrg: Organization = await pb.collection('organizations').create({
			name: defaultOrgName,
			slug: 'default-church',
			subscription_type: 'free',
			subscription_status: 'active',
			max_users: 50,
			max_songs: 1000,
			max_storage_mb: 1024,
			settings: {
				default_service_types: ['Sunday Morning', 'Sunday Evening', 'Wednesday'],
				time_zone: 'Pacific/Auckland', // Default for NZ
				week_start: 'sunday',
				repetition_window_days: 30,
				allow_member_song_creation: true,
				auto_approve_members: true
			},
			owner_user_id: adminUser.id,
			billing_email: adminUser.email,
			is_active: true
		});

		console.log(`Created default organization: ${defaultOrg.name}`);

		// 4. Create memberships for all users
		const membershipPromises = users.map((user) => {
			const role = user.role === 'admin' ? 'owner' : user.role === 'leader' ? 'leader' : 'member';

			return pb.collection('organization_memberships').create({
				organization_id: defaultOrg.id,
				user_id: user.id,
				role: role,
				permissions: getDefaultPermissions(role),
				status: 'active',
				preferred_keys: user.preferred_keys,
				notification_preferences: user.notification_preferences || {
					email_service_reminders: true,
					email_new_songs: false,
					email_member_activity: false
				},
				joined_date: user.created,
				is_active: true
			});
		});

		await Promise.all(membershipPromises);
		console.log(`Created ${users.length} organization memberships`);

		// 5. Update all existing collections with organization_id
		await updateCollectionWithOrganizationId('songs', defaultOrg.id);
		await updateCollectionWithOrganizationId('setlists', defaultOrg.id); // services
		await updateCollectionWithOrganizationId('categories', defaultOrg.id);
		await updateCollectionWithOrganizationId('labels', defaultOrg.id);

		// 6. Update users with current_organization_id
		const userUpdatePromises = users.map((user) =>
			pb.collection('users').update(user.id, {
				current_organization_id: defaultOrg.id
			})
		);
		await Promise.all(userUpdatePromises);

		console.log('Organization migration completed successfully!');
	} catch (error) {
		console.error('Migration failed:', error);
		throw error;
	}
}

async function updateCollectionWithOrganizationId(collectionName: string, orgId: string) {
	try {
		const records = await pb.collection(collectionName).getFullList();
		const updatePromises = records.map((record) =>
			pb.collection(collectionName).update(record.id, {
				organization_id: orgId,
				visibility: 'organization' // Default visibility
			})
		);
		await Promise.all(updatePromises);
		console.log(`Updated ${records.length} records in ${collectionName} collection`);
	} catch (error) {
		console.warn(`Failed to update ${collectionName}:`, error);
	}
}

function getDefaultPermissions(role: string): string[] {
	switch (role) {
		case 'owner':
		case 'admin':
			return [
				'songs:create',
				'songs:edit',
				'songs:delete',
				'services:create',
				'services:edit',
				'services:delete',
				'users:invite',
				'users:manage',
				'users:remove',
				'organization:settings',
				'organization:billing'
			];
		case 'leader':
			return ['songs:create', 'songs:edit', 'services:create', 'services:edit', 'services:delete'];
		case 'member':
		default:
			return ['songs:view', 'services:view'];
	}
}
```

## Phase 2: Core API Updates (Sprint 6 continued) - Estimated 1 week

### 2.1 Enhanced Authentication Store

Update `/src/lib/stores/auth.svelte.ts`:

```typescript
import type { Organization, OrganizationMembership } from '$lib/types/organization';

class AuthStore {
	// ... existing fields ...
	currentOrganization = $state<Organization | null>(null);
	availableOrganizations = $state<Organization[]>([]);
	membership = $state<OrganizationMembership | null>(null);
	permissions = $derived(this.membership?.permissions || []);

	async login(credentials: LoginCredentials): Promise<void> {
		// ... existing login logic ...

		// After successful login, load organization context
		await this.loadOrganizationContext();
	}

	async loadOrganizationContext(): Promise<void> {
		if (!this.user) return;

		try {
			// Get user's organization memberships
			const memberships = await pb.collection('organization_memberships').getFullList({
				filter: `user_id = "${this.user.id}" && is_active = true`,
				expand: 'organization_id'
			});

			this.availableOrganizations = memberships
				.map((m) => m.expand?.organization_id)
				.filter(Boolean) as Organization[];

			// Set current organization (from user preference or first available)
			const currentOrgId = this.user.current_organization_id;
			const currentMembership =
				memberships.find((m) => m.organization_id === currentOrgId) || memberships[0];

			if (currentMembership?.expand?.organization_id) {
				this.currentOrganization = currentMembership.expand.organization_id;
				this.membership = currentMembership;
			}
		} catch (error) {
			console.error('Failed to load organization context:', error);
		}
	}

	async switchOrganization(organizationId: string): Promise<void> {
		try {
			// Find membership for this organization
			const membership = await pb
				.collection('organization_memberships')
				.getFirstListItem(
					`user_id = "${this.user?.id}" && organization_id = "${organizationId}" && is_active = true`,
					{ expand: 'organization_id' }
				);

			this.currentOrganization = membership.expand?.organization_id || null;
			this.membership = membership;

			// Update user's current organization preference
			if (this.user) {
				await pb.collection('users').update(this.user.id, {
					current_organization_id: organizationId
				});
			}

			// Navigate to refresh organization context
			await goto('/dashboard');
		} catch (error) {
			console.error('Failed to switch organization:', error);
			throw error;
		}
	}

	hasPermission(permission: string): boolean {
		return this.permissions.includes(permission);
	}

	canManageUsers(): boolean {
		return (
			this.hasPermission('users:manage') ||
			this.membership?.role === 'admin' ||
			this.membership?.role === 'owner'
		);
	}

	canCreateSongs(): boolean {
		return this.hasPermission('songs:create') || this.membership?.role === 'leader';
	}

	// ... other permission helpers
}
```

### 2.2 Organization API Layer

Create `/src/lib/api/organizations.ts`:

```typescript
import { pb } from './client';
import type {
	Organization,
	OrganizationMembership,
	CreateOrganizationData,
	UpdateOrganizationData,
	InviteUserData
} from '$lib/types/organization';

export class OrganizationsAPI {
	/**
	 * Get current user's organizations
	 */
	static async getUserOrganizations(): Promise<Organization[]> {
		const memberships = await pb.collection('organization_memberships').getFullList({
			filter: `user_id = "${pb.authStore.model?.id}" && is_active = true`,
			expand: 'organization_id'
		});

		return memberships.map((m) => m.expand?.organization_id).filter(Boolean) as Organization[];
	}

	/**
	 * Create new organization
	 */
	static async createOrganization(data: CreateOrganizationData): Promise<Organization> {
		const organization = await pb.collection('organizations').create({
			...data,
			subscription_type: 'free',
			subscription_status: 'active',
			max_users: 10,
			max_songs: 100,
			max_storage_mb: 500,
			owner_user_id: pb.authStore.model?.id,
			settings: {
				default_service_types: ['Sunday Morning', 'Sunday Evening'],
				time_zone: 'Pacific/Auckland',
				week_start: 'sunday',
				repetition_window_days: 30,
				allow_member_song_creation: true,
				auto_approve_members: false,
				...data.settings
			},
			is_active: true
		});

		// Create owner membership
		await pb.collection('organization_memberships').create({
			organization_id: organization.id,
			user_id: pb.authStore.model?.id,
			role: 'owner',
			permissions: [
				'songs:create',
				'songs:edit',
				'songs:delete',
				'services:create',
				'services:edit',
				'services:delete',
				'users:invite',
				'users:manage',
				'users:remove',
				'organization:settings',
				'organization:billing'
			],
			status: 'active',
			joined_date: new Date().toISOString(),
			is_active: true
		});

		return organization;
	}

	/**
	 * Update organization
	 */
	static async updateOrganization(id: string, data: UpdateOrganizationData): Promise<Organization> {
		return await pb.collection('organizations').update(id, data);
	}

	/**
	 * Get organization members
	 */
	static async getOrganizationMembers(organizationId: string): Promise<OrganizationMembership[]> {
		return await pb.collection('organization_memberships').getFullList({
			filter: `organization_id = "${organizationId}" && is_active = true`,
			expand: 'user_id',
			sort: 'role,created'
		});
	}

	/**
	 * Invite user to organization
	 */
	static async inviteUser(organizationId: string, data: InviteUserData): Promise<void> {
		// Create invitation record
		const token = crypto.randomUUID();
		const expiresAt = new Date();
		expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

		await pb.collection('organization_invitations').create({
			organization_id: organizationId,
			email: data.email,
			role: data.role,
			permissions: data.permissions || [],
			invited_by: pb.authStore.model?.id,
			token: token,
			expires_at: expiresAt.toISOString(),
			is_active: true
		});

		// TODO: Send invitation email
		console.log(`Invitation created for ${data.email} with token: ${token}`);
	}

	/**
	 * Accept organization invitation
	 */
	static async acceptInvitation(token: string): Promise<Organization> {
		const invitation = await pb
			.collection('organization_invitations')
			.getFirstListItem(`token = "${token}" && is_active = true && expires_at > @now`, {
				expand: 'organization_id'
			});

		// Create membership
		await pb.collection('organization_memberships').create({
			organization_id: invitation.organization_id,
			user_id: pb.authStore.model?.id,
			role: invitation.role,
			permissions: invitation.permissions,
			status: 'active',
			invited_by: invitation.invited_by,
			invited_date: invitation.created,
			joined_date: new Date().toISOString(),
			is_active: true
		});

		// Mark invitation as used
		await pb.collection('organization_invitations').update(invitation.id, {
			used_at: new Date().toISOString(),
			used_by: pb.authStore.model?.id,
			is_active: false
		});

		return invitation.expand?.organization_id as Organization;
	}

	/**
	 * Remove user from organization
	 */
	static async removeMember(membershipId: string): Promise<void> {
		await pb.collection('organization_memberships').update(membershipId, {
			is_active: false,
			status: 'suspended'
		});
	}

	/**
	 * Update member role/permissions
	 */
	static async updateMember(
		membershipId: string,
		data: Partial<OrganizationMembership>
	): Promise<OrganizationMembership> {
		return await pb.collection('organization_memberships').update(membershipId, data);
	}
}
```

## Phase 3: User Interface Updates (Sprint 7) - Estimated 1-2 weeks

### 3.1 Organization Switcher Component

Create `/src/lib/components/organization/OrganizationSwitcher.svelte`:

```svelte
<script lang="ts">
	import { auth } from '$lib/stores/auth.svelte';
	import { ChevronDown, Building2, Plus } from 'lucide-svelte';
	import Button from '$lib/components/ui/Button.svelte';

	let showDropdown = $state(false);

	function handleSwitchOrganization(orgId: string) {
		auth.switchOrganization(orgId);
		showDropdown = false;
	}
</script>

<div class="relative">
	<button
		onclick={() => (showDropdown = !showDropdown)}
		class="flex items-center space-x-2 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:outline-none"
	>
		<Building2 class="h-4 w-4" />
		<span class="max-w-32 truncate">{auth.currentOrganization?.name || 'Select Organization'}</span>
		<ChevronDown class="h-4 w-4" />
	</button>

	{#if showDropdown}
		<div
			class="absolute top-full left-0 z-50 mt-1 w-64 rounded-md border border-gray-300 bg-white shadow-lg"
		>
			<div class="py-1">
				{#each auth.availableOrganizations as org}
					<button
						onclick={() => handleSwitchOrganization(org.id)}
						class="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 {auth.currentOrganization
							?.id === org.id
							? 'bg-blue-50 text-blue-700'
							: 'text-gray-700'}"
					>
						<div class="flex items-center space-x-2">
							<Building2 class="h-4 w-4" />
							<div>
								<div class="font-medium">{org.name}</div>
								<div class="text-xs text-gray-500">{org.subscription_type}</div>
							</div>
						</div>
					</button>
				{/each}

				<hr class="my-1" />

				<a
					href="/organizations/create"
					class="flex w-full items-center space-x-2 px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
				>
					<Plus class="h-4 w-4" />
					<span>Create Organization</span>
				</a>
			</div>
		</div>
	{/if}
</div>
```

### 3.2 Organization Settings Page

Create `/src/routes/(app)/organization/settings/+page.svelte`:

```svelte
<script lang="ts">
	import { auth } from '$lib/stores/auth.svelte';
	import { OrganizationsAPI } from '$lib/api/organizations';
	import Button from '$lib/components/ui/Button.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import { Building2, Users, Settings } from 'lucide-svelte';

	let loading = $state(false);
	let error = $state<string | null>(null);
	let success = $state<string | null>(null);

	// Form state
	let name = $state(auth.currentOrganization?.name || '');
	let description = $state(auth.currentOrganization?.description || '');
	let billingEmail = $state(auth.currentOrganization?.billing_email || '');

	async function handleSaveSettings() {
		if (!auth.currentOrganization) return;

		loading = true;
		error = null;

		try {
			await OrganizationsAPI.updateOrganization(auth.currentOrganization.id, {
				name,
				description,
				billing_email: billingEmail
			});

			success = 'Organization settings saved successfully';
			// Reload organization context
			await auth.loadOrganizationContext();
		} catch (err: any) {
			error = err.message || 'Failed to save settings';
		} finally {
			loading = false;
		}
	}
</script>

<svelte:head>
	<title>Organization Settings - WorshipWise</title>
</svelte:head>

<div class="space-y-6">
	<div class="flex items-center space-x-2">
		<Building2 class="h-6 w-6 text-blue-600" />
		<h1 class="text-2xl font-bold">Organization Settings</h1>
	</div>

	{#if error}
		<div class="rounded-md border border-red-200 bg-red-50 p-4 text-red-700">
			{error}
		</div>
	{/if}

	{#if success}
		<div class="rounded-md border border-green-200 bg-green-50 p-4 text-green-700">
			{success}
		</div>
	{/if}

	<div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
		<!-- Settings Form -->
		<div class="lg:col-span-2">
			<Card>
				<div class="space-y-6">
					<div class="flex items-center space-x-2 border-b pb-4">
						<Settings class="h-5 w-5" />
						<h2 class="text-lg font-semibold">General Settings</h2>
					</div>

					<form
						onsubmit={(e) => {
							e.preventDefault();
							handleSaveSettings();
						}}
						class="space-y-4"
					>
						<Input
							label="Organization Name"
							bind:value={name}
							placeholder="Enter organization name"
							required
						/>

						<div>
							<label class="mb-1 block text-sm font-medium text-gray-700"> Description </label>
							<textarea
								bind:value={description}
								placeholder="Brief description of your organization"
								rows="3"
								class="w-full rounded-md border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
							></textarea>
						</div>

						<Input
							label="Billing Email"
							type="email"
							bind:value={billingEmail}
							placeholder="billing@yourchurch.com"
						/>

						<div class="pt-4">
							<Button type="submit" {loading} disabled={loading}>
								{loading ? 'Saving...' : 'Save Settings'}
							</Button>
						</div>
					</form>
				</div>
			</Card>
		</div>

		<!-- Sidebar Info -->
		<div class="space-y-6">
			<Card>
				<div class="space-y-4">
					<div class="flex items-center space-x-2">
						<Users class="h-5 w-5" />
						<h3 class="font-semibold">Organization Info</h3>
					</div>

					<div class="space-y-2 text-sm">
						<div class="flex justify-between">
							<span class="text-gray-600">Plan:</span>
							<span class="font-medium capitalize"
								>{auth.currentOrganization?.subscription_type}</span
							>
						</div>
						<div class="flex justify-between">
							<span class="text-gray-600">Members:</span>
							<span class="font-medium">5 / {auth.currentOrganization?.max_users}</span>
						</div>
						<div class="flex justify-between">
							<span class="text-gray-600">Songs:</span>
							<span class="font-medium">42 / {auth.currentOrganization?.max_songs}</span>
						</div>
					</div>

					<div class="border-t pt-4">
						<a href="/organization/members" class="text-sm text-blue-600 hover:text-blue-800">
							Manage Members →
						</a>
					</div>
				</div>
			</Card>
		</div>
	</div>
</div>
```

## Implementation Timeline

### Week 1-2: Phase 1 Foundation

- [ ] Create new PocketBase collections (organizations, memberships, invitations)
- [ ] Update existing collection schemas with organization_id fields
- [ ] Implement new TypeScript interfaces
- [ ] Update PocketBase security rules
- [ ] Create and test migration script
- [ ] Update API client with organization context

### Week 3: Phase 2 Core Updates

- [ ] Enhanced authentication store with organization context
- [ ] Organization API layer implementation
- [ ] Update existing API calls to include organization scoping
- [ ] Testing organization switching and permissions

### Week 4: Phase 3 User Interface

- [ ] Organization switcher component
- [ ] Organization settings page
- [ ] Member management interface
- [ ] Invitation system UI
- [ ] Update navigation and layout

### Week 5-6: Testing & Polish

- [ ] Comprehensive testing of organization features
- [ ] Migration testing with sample data
- [ ] Performance optimization
- [ ] Documentation updates
- [ ] Security audit

## Success Criteria

✅ **Complete Data Isolation**: Churches cannot access each other's private data  
✅ **Seamless Migration**: Existing users upgrade without losing data or functionality  
✅ **Preserved Features**: All existing features (real-time collaboration, analytics, etc.) work within organization context  
✅ **Scalable Architecture**: System supports growth from single churches to multi-site organizations  
✅ **User-Friendly**: Organization management is intuitive and doesn't complicate simple use cases

## Risk Mitigation

**Data Loss Prevention**:

- Comprehensive migration testing in development
- Database backups before production migration
- Rollback procedures documented

**Performance Impact**:

- Proper indexing on organization_id fields
- Query optimization for organization-scoped data
- Load testing with multiple organizations

**User Experience**:

- Single organization users see minimal UI changes
- Clear organization context indicators
- Graceful handling of permission changes

This plan provides a comprehensive roadmap for introducing organizations while maintaining the sophisticated features that make WorshipWise powerful for worship planning and song management.
