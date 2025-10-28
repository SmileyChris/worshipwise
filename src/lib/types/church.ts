import type { User } from './auth';
import type {
	SubscriptionType,
	SubscriptionStatus,
	MembershipStatus,
	Hemisphere,
	WeekStart,
	BuiltInRole
} from './common';

export interface Church {
	id: string;
	name: string;
	slug: string;
	description?: string;
	address?: string;
	city?: string;
	state?: string;
	country?: string;
	timezone: string;
	hemisphere: Hemisphere;
	subscription_type: SubscriptionType;
	subscription_status: SubscriptionStatus;
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
	week_start: WeekStart;
	repetition_window_days: number;
	allow_member_song_creation: boolean;
	auto_approve_members: boolean;
	default_key_signatures: string[];
	preferred_ccli_license?: string;
	mistral_api_key?: string;
}

export interface ChurchMembership {
	id: string;
	church_id: string;
	user_id: string;
	status: MembershipStatus;
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

export interface NotificationPreferences {
	email_service_reminders: boolean;
	email_new_songs: boolean;
	email_member_activity: boolean;
	email_weekly_digest: boolean;
}

export interface ChurchInvitation {
	id: string;
	church_id: string;
	email: string;
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
	address?: string;
	city?: string;
	state?: string;
	country?: string;
	timezone?: string;
	settings?: Partial<ChurchSettings>;
}

export interface UpdateChurchData {
	name?: string;
	slug?: string;
	description?: string;
	address?: string;
	city?: string;
	state?: string;
	country?: string;
	timezone?: string;
	settings?: Partial<ChurchSettings>;
	billing_email?: string;
}

export interface InitialChurchSetup {
	churchName: string;
	adminName: string;
	adminEmail: string;
	password: string;
	confirmPassword: string;
	timezone: string;
	country?: string;
	address?: string;
	city?: string;
	state?: string;
}

export interface InviteUserData {
	email: string;
	role: BuiltInRole;
	permissions?: string[];
}

export interface UpdateMembershipData {
	status?: MembershipStatus;
	preferred_keys?: string[];
	notification_preferences?: NotificationPreferences;
}

// Note: Permission system has been moved to the new flexible role-based system
// See src/lib/types/permissions.ts for the new permission definitions

export function getDefaultChurchSettings(): ChurchSettings {
	return {
		default_service_types: ['Sunday Morning', 'Sunday Evening', 'Wednesday'],
		week_start: 'sunday',
		repetition_window_days: 30,
		allow_member_song_creation: true,
		auto_approve_members: false,
		default_key_signatures: ['C', 'D', 'E', 'F', 'G', 'A', 'B'],
		preferred_ccli_license: undefined
	};
}

/**
 * Detect hemisphere from timezone string
 */
export function detectHemisphereFromTimezone(timezone: string): Hemisphere {
	const southernTimezones = [
		// Australia & Oceania
		'Australia/',
		'Pacific/Auckland',
		'Pacific/Wellington',
		'Pacific/Fiji',
		'Pacific/Tahiti',
		'Pacific/Samoa',
		'Pacific/Tonga',
		'Pacific/Vanuatu',
		'Pacific/New_Caledonia',

		// Africa (Southern)
		'Africa/Johannesburg',
		'Africa/Cape_Town',
		'Africa/Windhoek',
		'Africa/Maputo',
		'Africa/Gaborone',
		'Africa/Maseru',
		'Africa/Mbabane',

		// South America
		'America/Sao_Paulo',
		'America/Argentina/',
		'America/Santiago',
		'America/Montevideo',
		'America/Asuncion',
		'America/La_Paz',
		'America/Lima',
		'America/Bogota', // Northern SA but often considered southern hemisphere for seasons

		// Islands
		'Indian/Mauritius',
		'Indian/Reunion',
		'Indian/Madagascar',
		'Atlantic/South_Georgia',

		// Antarctica
		'Antarctica/'
	];

	return southernTimezones.some((tz) => timezone.startsWith(tz)) ? 'southern' : 'northern';
}

/**
 * Get timezone-appropriate default settings
 */
export function getTimezoneAwareDefaults(timezone: string): Partial<ChurchSettings> {
	// Note: hemisphere detection for future seasonal recommendations
	// const hemisphere = detectHemisphereFromTimezone(timezone);

	// Adjust default service types based on location
	const default_service_types = ['Sunday Morning', 'Sunday Evening'];

	// Add region-specific defaults
	if (timezone.startsWith('America/')) {
		default_service_types.push('Wednesday Night');
	} else if (timezone.startsWith('Australia/') || timezone.startsWith('Pacific/')) {
		default_service_types.push('Wednesday');
	} else if (timezone.startsWith('Europe/')) {
		default_service_types.push('Sunday Evening', 'Midweek');
	}

	return {
		default_service_types
	};
}

/**
 * Get default permissions for a role
 */
export function getDefaultPermissions(role: BuiltInRole): string[] {
	switch (role) {
		case 'admin':
			return ['manage-songs', 'manage-services', 'manage-members', 'manage-church'];
		case 'leader':
			return ['manage-songs', 'manage-services'];
		case 'musician':
			return ['view-songs', 'view-services'];
		default:
			return [];
	}
}
