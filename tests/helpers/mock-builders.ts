import type { User, AuthContext } from '$lib/types/auth';
import type { Church, ChurchMembership } from '$lib/types/church';
import type { Song } from '$lib/types/song';
import type { Service, ServiceSong } from '$lib/types/service';

// Simple factory functions with sensible defaults
let userIdCounter = 0;
let churchIdCounter = 0;
let membershipIdCounter = 0;
let songIdCounter = 0;
let serviceIdCounter = 0;
let serviceSongIdCounter = 0;

// User Mock Factory
export function mockUser(overrides: Partial<User> = {}): User {
	const id = overrides.id || `user-${++userIdCounter}`;
	return {
		id,
		email: overrides.email || `test-${id}@example.com`,
		name: overrides.name || 'Test User',
		created: overrides.created || new Date().toISOString(),
		updated: overrides.updated || new Date().toISOString(),
		verified: overrides.verified ?? true,
		avatar: overrides.avatar || '',
		emailVisibility: overrides.emailVisibility || false,
		...overrides
	};
}

// Church Mock Factory
export function mockChurch(overrides: Partial<Church> = {}): Church {
	const id = overrides.id || `church-${++churchIdCounter}`;
	const name = overrides.name || 'Test Church';
	const timezone = overrides.timezone || 'America/New_York';

	// Auto-detect hemisphere from timezone if not provided
	const hemisphere =
		overrides.hemisphere ||
		(timezone.includes('Australia') || timezone.includes('Pacific/Auckland')
			? 'southern'
			: 'northern');

	return {
		id,
		name,
		slug: overrides.slug || name.toLowerCase().replace(/\s+/g, '-'),
		description: overrides.description || 'A test church for unit tests',
		address: overrides.address || '123 Test St',
		city: overrides.city || 'Test City',
		state: overrides.state || 'TS',
		country: overrides.country || 'Test Country',
		timezone,
		hemisphere,
		subscription_type: overrides.subscription_type || 'free',
		subscription_status: overrides.subscription_status || 'active',
		max_users: overrides.max_users || 25,
		max_songs: overrides.max_songs || 500,
		max_storage_mb: overrides.max_storage_mb || 1024,
		settings: overrides.settings || {
			default_service_types: ['Sunday Morning', 'Sunday Evening'],
			week_start: 'sunday',
			repetition_window_days: 30,
			allow_member_song_creation: true,
			auto_approve_members: false,
			default_key_signatures: ['C', 'G', 'D', 'A', 'E']
		},
		owner_user_id: overrides.owner_user_id || 'user-1',
		billing_email: overrides.billing_email || 'billing@test.com',
		is_active: overrides.is_active ?? true,
		created: overrides.created || new Date().toISOString(),
		updated: overrides.updated || new Date().toISOString(),
		...overrides
	};
}

// Helper to get default permissions by role
function getDefaultPermissions(role: string): string[] {
	switch (role) {
		case 'admin':
		case 'pastor':
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
				'church:settings',
				'church:billing'
			];
		case 'leader':
			return ['songs:create', 'songs:edit', 'services:create', 'services:edit', 'services:delete'];
		case 'musician':
			return ['services:view', 'songs:view'];
		default:
			return ['services:view'];
	}
}

// Church Membership Mock Factory
export function mockMembership(overrides: Partial<ChurchMembership> = {}): ChurchMembership {
	const id = overrides.id || `membership-${++membershipIdCounter}`;
	const role = overrides.role || 'member';

	return {
		id,
		church_id: overrides.church_id || 'church-1',
		user_id: overrides.user_id || 'user-1',
		role,
		permissions: overrides.permissions || getDefaultPermissions(role),
		status: overrides.status || 'active',
		preferred_keys: overrides.preferred_keys || [],
		notification_preferences: overrides.notification_preferences || {
			email_service_reminders: true,
			email_new_songs: true,
			email_member_activity: false,
			email_weekly_digest: true
		},
		joined_date: overrides.joined_date || new Date().toISOString(),
		is_active: overrides.is_active ?? true,
		created: overrides.created || new Date().toISOString(),
		updated: overrides.updated || new Date().toISOString(),
		...overrides
	};
}

// Song Mock Factory
export function mockSong(overrides: Partial<Song> = {}): Song {
	const id = overrides.id || `song-${++songIdCounter}`;

	return {
		id,
		church_id: overrides.church_id || 'church-1',
		title: overrides.title || 'Amazing Grace',
		artist: overrides.artist || 'Traditional',
		key_signature: overrides.key_signature || 'C',
		tempo: overrides.tempo || 120,
		duration_seconds: overrides.duration_seconds || 240,
		tags: overrides.tags || ['hymn', 'traditional'],
		ccli_number: overrides.ccli_number || '12345',
		copyright_info: overrides.copyright_info || 'Public Domain',
		notes: overrides.notes || 'Classic hymn',
		category: overrides.category || 'hymns',
		created_by: overrides.created_by || 'user-1',
		is_active: overrides.is_active ?? true,
		created: overrides.created || new Date().toISOString(),
		updated: overrides.updated || new Date().toISOString(),
		...overrides
	};
}

// Service Mock Factory
export function mockService(overrides: Partial<Service> = {}): Service {
	const id = overrides.id || `service-${++serviceIdCounter}`;

	return {
		id,
		church_id: overrides.church_id || 'church-1',
		title: overrides.title || 'Sunday Morning Service',
		service_date: overrides.service_date || new Date().toISOString(),
		service_type: overrides.service_type || 'Sunday Morning',
		theme: overrides.theme || 'Grace and Redemption',
		notes: overrides.notes || 'Regular Sunday service',
		worship_leader: overrides.worship_leader || 'user-1',
		team_members: overrides.team_members || [],
		status: overrides.status || 'planned',
		estimated_duration: overrides.estimated_duration || 3600,
		is_template: overrides.is_template || false,
		created: overrides.created || new Date().toISOString(),
		updated: overrides.updated || new Date().toISOString(),
		...overrides
	};
}

// Service Song Mock Factory
export function mockServiceSong(overrides: Partial<ServiceSong> = {}): ServiceSong {
	const id = overrides.id || `servicesong-${++serviceSongIdCounter}`;

	return {
		id,
		service_id: overrides.service_id || 'service-1',
		song_id: overrides.song_id || 'song-1',
		order_position: overrides.order_position || 1,
		transposed_key: overrides.transposed_key || 'C',
		tempo_override: overrides.tempo_override,
		transition_notes: overrides.transition_notes || '',
		section_type: overrides.section_type || 'Worship',
		duration_override: overrides.duration_override,
		created: overrides.created || new Date().toISOString(),
		updated: overrides.updated || new Date().toISOString(),
		...overrides
	};
}

// Helper function to create multiple items
export function createMany<T>(
	factory: (overrides?: Partial<T>) => T,
	count: number,
	customizer?: (index: number) => Partial<T>
): T[] {
	return Array.from({ length: count }, (_, i) => {
		const overrides = customizer ? customizer(i) : {};
		return factory(overrides);
	});
}

// Convenience functions for common patterns
export const mockAdmin = (overrides: Partial<ChurchMembership> = {}) =>
	mockMembership({ ...overrides, role: 'admin' });

export const mockLeader = (overrides: Partial<ChurchMembership> = {}) =>
	mockMembership({ ...overrides, role: 'leader' });

export const mockMusician = (overrides: Partial<ChurchMembership> = {}) =>
	mockMembership({ ...overrides, role: 'musician' });

// Auth Context Helper
export function mockAuthContext(overrides: {
	user?: Partial<User>;
	church?: Partial<Church>;
	membership?: Partial<ChurchMembership>;
} = {}): AuthContext {
	const church = mockChurch(overrides.church);
	const user = mockUser({ 
		current_church_id: church.id,
		...overrides.user 
	});
	const membership = mockMembership({ 
		user_id: user.id,
		church_id: church.id,
		...overrides.membership 
	});

	// Return proper AuthContext format
	return {
		user,
		currentMembership: membership,
		currentChurch: church,
		isAuthenticated: true,
		token: 'test-token',
		isValid: true
	};
}

// Reset counters for test isolation
export function resetMockCounters() {
	userIdCounter = 0;
	churchIdCounter = 0;
	membershipIdCounter = 0;
	songIdCounter = 0;
	serviceIdCounter = 0;
	serviceSongIdCounter = 0;
}
