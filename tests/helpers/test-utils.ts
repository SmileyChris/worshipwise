import { vi } from 'vitest';
import type { MockRecord } from './pb-mock';

// Test data generators
export const createMockSong = (overrides: Partial<MockRecord> = {}): MockRecord => ({
  id: 'song_' + Math.random().toString(36).substr(2, 9),
  created: new Date().toISOString(),
  updated: new Date().toISOString(),
  title: 'Amazing Grace',
  artist: 'John Newton',
  key: 'G',
  tempo: 120,
  genre: 'Hymn',
  themes: ['Grace', 'Salvation'],
  lyrics: 'Amazing grace how sweet the sound...',
  chord_chart: null,
  audio_file: null,
  sheet_music: null,
  notes: 'Traditional hymn',
  ...overrides
});

export const createMockSetlist = (overrides: Partial<MockRecord> = {}): MockRecord => ({
  id: 'setlist_' + Math.random().toString(36).substr(2, 9),
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

export const createMockSetlistSong = (overrides: Partial<MockRecord> = {}): MockRecord => ({
  id: 'setlist_song_' + Math.random().toString(36).substr(2, 9),
  created: new Date().toISOString(),
  updated: new Date().toISOString(),
  setlist_id: 'setlist_123',
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
  created: new Date().toISOString(),
  updated: new Date().toISOString(),
  song_id: 'song_123',
  setlist_id: 'setlist_123',
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
  date.setDate(date.getDate() - (weeks * 7));
  return date.toISOString().split('T')[0];
};

export const monthsAgo = (months: number): string => {
  const date = new Date();
  date.setMonth(date.getMonth() - months);
  return date.toISOString().split('T')[0];
};

// Async utilities
export const flushPromises = () => new Promise(resolve => setTimeout(resolve, 0));

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