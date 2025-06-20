import type { User } from './auth';

export interface Church {
	id: string;
	name: string;
	slug: string;
	description?: string;
	subscription_type: 'free' | 'basic' | 'premium';
	subscription_status: 'active' | 'trial' | 'suspended' | 'cancelled';
	max_users: number;
	max_songs: number;
	max_storage_mb: number;
	settings: ChurchSettings;
	owner_user_id: string;
	billing_email?: string;
	is_active: boolean;
	created: string;
	updated: string;

	// Computed fields
	expand?: {
		owner_user_id?: User;
		church_memberships_via_church_id?: ChurchMembership[];
	};
}

export interface ChurchSettings {
	default_service_types: string[];
	time_zone: string;
	week_start: 'sunday' | 'monday';
	repetition_window_days: number;
	allow_member_song_creation: boolean;
	auto_approve_members: boolean;
}

export interface ChurchMembership {
	id: string;
	church_id: string;
	user_id: string;
	role: ChurchRole;
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
		church_id?: Church;
		user_id?: User;
		invited_by?: User;
	};
}

export type ChurchRole = 'member' | 'leader' | 'admin' | 'owner';

export interface NotificationPreferences {
	email_service_reminders: boolean;
	email_new_songs: boolean;
	email_member_activity: boolean;
}

export interface ChurchInvitation {
	id: string;
	church_id: string;
	email: string;
	role: ChurchRole;
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
		church_id?: Church;
		invited_by?: User;
	};
}

// DTOs
export interface CreateChurchData {
	name: string;
	slug: string;
	description?: string;
	settings?: Partial<ChurchSettings>;
}

export interface UpdateChurchData {
	name?: string;
	slug?: string;
	description?: string;
	settings?: Partial<ChurchSettings>;
	billing_email?: string;
}

export interface InviteUserData {
	email: string;
	role: ChurchRole;
	permissions?: string[];
}

export interface UpdateMembershipData {
	role?: ChurchRole;
	permissions?: string[];
	status?: 'active' | 'suspended';
	preferred_keys?: string[];
	notification_preferences?: NotificationPreferences;
}

// Permission constants
export const PERMISSIONS = {
	SONGS_CREATE: 'songs:create',
	SONGS_EDIT: 'songs:edit',
	SONGS_DELETE: 'songs:delete',
	SONGS_VIEW: 'songs:view',
	
	SERVICES_CREATE: 'services:create',
	SERVICES_EDIT: 'services:edit',
	SERVICES_DELETE: 'services:delete',
	SERVICES_VIEW: 'services:view',
	
	USERS_INVITE: 'users:invite',
	USERS_MANAGE: 'users:manage',
	USERS_REMOVE: 'users:remove',
	
	CHURCH_SETTINGS: 'church:settings',
	CHURCH_BILLING: 'church:billing'
} as const;

// Helper functions
export function getDefaultPermissions(role: ChurchRole): string[] {
	switch (role) {
		case 'owner':
		case 'admin':
			return [
				PERMISSIONS.SONGS_CREATE,
				PERMISSIONS.SONGS_EDIT,
				PERMISSIONS.SONGS_DELETE,
				PERMISSIONS.SONGS_VIEW,
				PERMISSIONS.SERVICES_CREATE,
				PERMISSIONS.SERVICES_EDIT,
				PERMISSIONS.SERVICES_DELETE,
				PERMISSIONS.SERVICES_VIEW,
				PERMISSIONS.USERS_INVITE,
				PERMISSIONS.USERS_MANAGE,
				PERMISSIONS.USERS_REMOVE,
				PERMISSIONS.CHURCH_SETTINGS,
				PERMISSIONS.CHURCH_BILLING
			];
		case 'leader':
			return [
				PERMISSIONS.SONGS_CREATE,
				PERMISSIONS.SONGS_EDIT,
				PERMISSIONS.SONGS_VIEW,
				PERMISSIONS.SERVICES_CREATE,
				PERMISSIONS.SERVICES_EDIT,
				PERMISSIONS.SERVICES_DELETE,
				PERMISSIONS.SERVICES_VIEW
			];
		case 'member':
		default:
			return [PERMISSIONS.SONGS_VIEW, PERMISSIONS.SERVICES_VIEW];
	}
}

export function getRoleDisplayName(role: ChurchRole): string {
	switch (role) {
		case 'owner':
			return 'Church Owner';
		case 'admin':
			return 'Administrator';
		case 'leader':
			return 'Worship Leader';
		case 'member':
			return 'Member';
		default:
			return 'Member';
	}
}

export function getDefaultChurchSettings(): ChurchSettings {
	return {
		default_service_types: ['Sunday Morning', 'Sunday Evening', 'Wednesday'],
		time_zone: 'Pacific/Auckland',
		week_start: 'sunday',
		repetition_window_days: 30,
		allow_member_song_creation: true,
		auto_approve_members: false
	};
}