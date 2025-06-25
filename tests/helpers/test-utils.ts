import { vi } from 'vitest';
import type { MockRecord } from './pb-mock';
import type { Song } from '$lib/types/song';

// Test data generators
export const createMockSong = (overrides: Partial<Song> = {}): Song => ({
	id: 'song_' + Math.random().toString(36).substr(2, 9),
	church_id: 'church_test123',
	title: 'Amazing Grace',
	artist: 'John Newton',
	category: 'hymn',
	labels: [],
	key_signature: 'G',
	tempo: 120,
	duration_seconds: 240,
	tags: ['Grace', 'Salvation'],
	lyrics: 'Amazing grace how sweet the sound...',
	chord_chart: '',
	audio_file: '',
	sheet_music: [],
	ccli_number: '123456',
	copyright_info: 'Public Domain',
	notes: 'Traditional hymn',
	created_by: 'user1',
	is_active: true,
	created: new Date().toISOString(),
	updated: new Date().toISOString(),
	...overrides
});

export const createMockService = (overrides: Partial<MockRecord> = {}): MockRecord => ({
	id: 'service_' + Math.random().toString(36).substr(2, 9),
	church_id: 'church_test123',
	created: new Date().toISOString(),
	updated: new Date().toISOString(),
	title: 'Sunday Morning Service',
	service_date: '2024-01-01',
	service_type: 'Sunday Morning',
	theme: 'New Beginnings',
	notes: 'New Year service',
	status: 'draft',
	worship_leader: 'user_123',
	team_members: [],
	created_by: 'user_123',
	is_template: false,
	estimated_duration: 60,
	...overrides
});

export const createMockServiceSong = (overrides: Partial<MockRecord> = {}): MockRecord => ({
	id: 'service_song_' + Math.random().toString(36).substr(2, 9),
	created: new Date().toISOString(),
	updated: new Date().toISOString(),
	service_id: 'service_123',
	song_id: 'song_123',
	order_position: 1,
	transposed_key: null,
	tempo_override: null,
	transition_notes: '',
	section_type: 'Praise & Worship',
	duration_override: null,
	added_by: 'user_123',
	...overrides
});

export const createMockSongUsage = (overrides: Partial<MockRecord> = {}): MockRecord => ({
	id: 'usage_' + Math.random().toString(36).substr(2, 9),
	church_id: 'church_test123',
	created: new Date().toISOString(),
	updated: new Date().toISOString(),
	song_id: 'song_123',
	service_id: 'service_123',
	used_date: new Date().toISOString().split('T')[0],
	service_type: 'Morning',
	worship_leader: 'user_123',
	...overrides
});

export const createMockUser = (overrides: Partial<MockRecord> = {}): MockRecord => ({
	id: 'user_' + Math.random().toString(36).substr(2, 9),
	created: new Date().toISOString(),
	updated: new Date().toISOString(),
	username: 'testuser',
	email: 'test@example.com',
	name: 'Test User',
	role: 'leader',
	verified: true,
	...overrides
});

// Date utilities for testing
export const daysAgo = (days: number): string => {
	const date = new Date();
	date.setDate(date.getDate() - days);
	return date.toISOString().split('T')[0];
};

export const weeksAgo = (weeks: number): string => {
	const date = new Date();
	date.setDate(date.getDate() - weeks * 7);
	return date.toISOString().split('T')[0];
};

export const monthsAgo = (months: number): string => {
	const date = new Date();
	date.setMonth(date.getMonth() - months);
	return date.toISOString().split('T')[0];
};

// Async utilities
export const flushPromises = () => new Promise((resolve) => setTimeout(resolve, 0));

// Mock DOM APIs
export const mockBlobConstructor = vi.fn(() => ({
	text: vi.fn().mockResolvedValue('mock,csv,data'),
	arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(0))
}));

export const mockURL = {
	createObjectURL: vi.fn(() => 'blob:mock-url'),
	revokeObjectURL: vi.fn()
};

// Setup function for common mocks
export const setupTestEnvironment = () => {
	// Mock Blob constructor
	(globalThis as any).Blob = mockBlobConstructor as any;

	// Mock URL API
	(globalThis as any).URL = mockURL as any;

	// Mock document methods
	const mockElement = {
		click: vi.fn(),
		remove: vi.fn()
	};

	(globalThis as any).document = {
		createElement: vi.fn(() => mockElement),
		body: {
			appendChild: vi.fn(),
			removeChild: vi.fn()
		}
	} as any;
};

// Cleanup function
export const cleanupTestEnvironment = () => {
	vi.clearAllMocks();
};

// Auth context utilities for API unit tests
export const createMockAuthContext = (overrides: {
	user?: Partial<any>;
	church?: Partial<any>;
} = {}) => {
	const mockUser = {
		id: 'user123',
		email: 'test@example.com',
		name: 'Test User',
		created: new Date().toISOString(),
		updated: new Date().toISOString(),
		verified: true,
		avatar: '',
		emailVisibility: true,
		...overrides.user
	};

	const mockChurchData = {
		id: 'church_test123',
		name: 'Test Church',
		...overrides.church
	};

	return {
		user: mockUser,
		currentChurch: mockChurchData,
		currentMembership: null,
		isAuthenticated: true,
		token: 'test-token',
		isValid: true
	};
};
