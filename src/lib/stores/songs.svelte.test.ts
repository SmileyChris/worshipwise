import type { AuthContext } from '$lib/types/auth';
import type { CreateSongData, SongFilterOptions, SongUsage, UpdateSongData } from '$lib/types/song';
import { mockAuthContext, mockSong } from '$tests/helpers/mock-builders';
import { mockPb } from '$tests/helpers/pb-mock';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createSongsStore, type SongsStore } from './songs.svelte';
import { createSongsAPI } from '$lib/api/songs';

// Mock the songs API module
vi.mock('$lib/api/songs', () => ({
	createSongsAPI: vi.fn()
}));

describe('SongsStore', () => {
	let songsStore: SongsStore;
	let authContext: AuthContext;

	// Use factory functions for test data
	const testSong = mockSong({
		id: 'song-1',
		title: 'Amazing Grace',
		artist: 'Traditional',
		tags: ['classic', 'hymn']
	});

	const testSongUsage: SongUsage = {
		id: 'usage-1',
		church_id: 'church-1',
		song_id: 'song-1',
		service_id: 'service-1',
		used_date: '2024-01-01T00:00:00Z',
		worship_leader: 'user-1',
		created: '2024-01-01T00:00:00Z',
		updated: '2024-01-01T00:00:00Z'
	};

	const mockPaginatedResult = {
		items: [testSong],
		totalItems: 1,
		totalPages: 1,
		page: 1,
		perPage: 20
	};

	// Mock API methods
	const mockSongsAPI = {
		getSongsPaginated: vi.fn(),
		getSongsUsageInfo: vi.fn(),
		getSongs: vi.fn(),
		createSong: vi.fn(),
		updateSong: vi.fn(),
		deleteSong: vi.fn(),
		subscribe: vi.fn()
	};

	beforeEach(() => {
		// Reset mockPb
		vi.clearAllMocks();
		mockPb.reset();

		// Create auth context for dependency injection
		authContext = mockAuthContext({
			church: { id: 'church-1', name: 'Test Church' },
			user: { id: 'user-1' },
			membership: {
				church_id: 'church-1'
			}
		});

		// Mock createSongsAPI to return our mock API
		(createSongsAPI as any).mockReturnValue(mockSongsAPI);

		// Create fresh store instance with test auth context
		songsStore = createSongsStore(authContext);

		// Set up PocketBase mock state
		mockPb.setAuthState(authContext.user);
	});

	describe('loadSongs', () => {
		it('should load songs with usage information successfully', async () => {
			// Mock the songs paginated result
			mockSongsAPI.getSongsPaginated.mockResolvedValue(mockPaginatedResult);

			// Mock the usage info
			const usageMap = new Map([
				['song-1', { lastUsed: new Date('2024-01-01T00:00:00Z'), daysSince: 30 }]
			]);
			mockSongsAPI.getSongsUsageInfo.mockResolvedValue(usageMap);

			await songsStore.loadSongs();

			expect(songsStore.songs).toHaveLength(1);
			expect(songsStore.songs[0]).toEqual({
				...testSong,
				lastUsedDate: new Date('2024-01-01T00:00:00Z'),
				daysSinceLastUsed: expect.any(Number),
				usageStatus: expect.any(String)
			});
			expect(songsStore.totalPages).toBe(1);
			expect(songsStore.totalItems).toBe(1);
			expect(songsStore.currentPage).toBe(1);
			expect(songsStore.loading).toBe(false);
			expect(songsStore.error).toBe(null);
		});

		it('should handle songs without usage information', async () => {
			mockSongsAPI.getSongsPaginated.mockResolvedValue(mockPaginatedResult);
			// Mock empty usage data
			const emptyUsageMap = new Map([['song-1', { lastUsed: null, daysSince: Infinity }]]);
			mockSongsAPI.getSongsUsageInfo.mockResolvedValue(emptyUsageMap);

			await songsStore.loadSongs();

			expect(songsStore.songs[0]).toEqual({
				...testSong,
				lastUsedDate: null,
				daysSinceLastUsed: Infinity,
				usageStatus: 'available'
			});
		});

		it('should reset page when resetPage is true', async () => {
			songsStore.currentPage = 3;
			mockSongsAPI.getSongsPaginated.mockResolvedValue(mockPaginatedResult);
			mockSongsAPI.getSongsUsageInfo.mockResolvedValue(new Map());

			await songsStore.loadSongs(true);

			expect(songsStore.currentPage).toBe(1);
		});

		it('should handle loading state correctly', async () => {
			mockSongsAPI.getSongsPaginated.mockImplementation(async () => {
				expect(songsStore.loading).toBe(true);
				return mockPaginatedResult;
			});
			mockSongsAPI.getSongsUsageInfo.mockResolvedValue(new Map());

			await songsStore.loadSongs();

			expect(songsStore.loading).toBe(false);
		});

		it('should handle errors when loading songs', async () => {
			const error = new Error('Network error');
			mockSongsAPI.getSongsPaginated.mockRejectedValue(error);

			await songsStore.loadSongs();

			expect(songsStore.songs).toEqual([]);
			expect(songsStore.loading).toBe(false);
			expect(songsStore.error).toBe('Network error');
		});

		it('should pass correct parameters to API', async () => {
			songsStore.currentPage = 2;
			songsStore.perPage = 10;
			songsStore.filters = { search: 'test', key: 'C', tags: ['hymn'], sort: 'title' };

			mockSongsAPI.getSongsPaginated.mockResolvedValue(mockPaginatedResult);
			mockSongsAPI.getSongsUsageInfo.mockResolvedValue(new Map());

			await songsStore.loadSongs();

			expect(mockSongsAPI.getSongsPaginated).toHaveBeenCalledWith(2, 10, {
				search: 'test',
				key: 'C',
				tags: ['hymn'],
				sort: 'title'
			});
		});
	});

	describe('loadAllSongs', () => {
		it('should load all songs successfully', async () => {
			const songs = [testSong];
			mockSongsAPI.getSongs.mockResolvedValue(songs);

			const result = await songsStore.loadAllSongs();

			expect(result).toEqual(songs);
			expect(mockSongsAPI.getSongs).toHaveBeenCalled();
		});

		it('should handle errors when loading all songs', async () => {
			const error = new Error('Network error');
			mockSongsAPI.getSongs.mockRejectedValue(error);

			const result = await songsStore.loadAllSongs();

			expect(result).toEqual([]);
		});
	});

	describe('createSong', () => {
		it('should create song successfully', async () => {
			const createData: CreateSongData = {
				title: 'New Song',
				artist: 'Artist',
				category: 'category-1',
				key_signature: 'D',
				tempo: 130
			};
			mockSongsAPI.createSong.mockResolvedValue(testSong);
			mockSongsAPI.getSongsPaginated.mockResolvedValue(mockPaginatedResult);
			mockSongsAPI.getSongsUsageInfo.mockResolvedValue(new Map());

			const result = await songsStore.createSong(createData);

			expect(result).toEqual(testSong);
			expect(songsStore.loading).toBe(false);
			expect(songsStore.error).toBe(null);
			expect(mockSongsAPI.createSong).toHaveBeenCalledWith(createData);
			expect(mockSongsAPI.getSongsPaginated).toHaveBeenCalled(); // loadSongs called
		});

		it('should handle errors when creating song', async () => {
			const createData: CreateSongData = {
				title: 'New Song',
				artist: 'Artist',
				category: 'category-1'
			};
			const error = new Error('Validation failed');
			mockSongsAPI.createSong.mockRejectedValue(error);

			await expect(songsStore.createSong(createData)).rejects.toThrow('Validation failed');

			expect(songsStore.loading).toBe(false);
			expect(songsStore.error).toBe('Validation failed');
		});
	});

	describe('updateSong', () => {
		beforeEach(() => {
			songsStore.songs = [testSong];
		});

		it('should update song successfully', async () => {
			const updateData: UpdateSongData = { title: 'Updated Song' };
			const updatedSong = { ...testSong, title: 'Updated Song' };
			mockSongsAPI.updateSong.mockResolvedValue(updatedSong);

			const result = await songsStore.updateSong('song-1', updateData);

			expect(result).toEqual(updatedSong);
			expect(songsStore.songs[0]).toEqual(updatedSong);
			expect(songsStore.loading).toBe(false);
			expect(songsStore.error).toBe(null);
			expect(mockSongsAPI.updateSong).toHaveBeenCalledWith('song-1', updateData);
		});

		it('should handle updating non-existent song in local array', async () => {
			const updateData: UpdateSongData = { title: 'Updated Song' };
			const updatedSong = { ...testSong, id: 'different-id', title: 'Updated Song' };
			mockSongsAPI.updateSong.mockResolvedValue(updatedSong);

			const result = await songsStore.updateSong('different-id', updateData);

			expect(result).toEqual(updatedSong);
			expect(songsStore.songs[0]).toEqual(testSong); // Original unchanged
		});

		it('should handle errors when updating song', async () => {
			const updateData: UpdateSongData = { title: 'Updated Song' };
			const error = new Error('Update failed');
			mockSongsAPI.updateSong.mockRejectedValue(error);

			await expect(songsStore.updateSong('song-1', updateData)).rejects.toThrow('Update failed');

			expect(songsStore.songs[0]).toEqual(testSong); // Unchanged
			expect(songsStore.error).toBe('Update failed');
		});
	});

	describe('deleteSong', () => {
		beforeEach(() => {
			songsStore.songs = [testSong];
			songsStore.totalItems = 1;
		});

		it('should delete song successfully', async () => {
			mockSongsAPI.deleteSong.mockResolvedValue(undefined);
			mockSongsAPI.getSongs.mockResolvedValue([]);

			await songsStore.deleteSong('song-1');

			expect(songsStore.songs).toEqual([]);
			expect(songsStore.totalItems).toBe(0);
			expect(songsStore.loading).toBe(false);
			expect(songsStore.error).toBe(null);
			expect(mockSongsAPI.deleteSong).toHaveBeenCalledWith('song-1');
		});

		it('should handle errors when deleting song', async () => {
			const error = new Error('Delete failed');
			mockSongsAPI.deleteSong.mockRejectedValue(error);

			await expect(songsStore.deleteSong('song-1')).rejects.toThrow('Delete failed');

			expect(songsStore.songs).toEqual([testSong]); // Unchanged
			expect(songsStore.totalItems).toBe(1);
			expect(songsStore.error).toBe('Delete failed');
		});
	});

	describe('search and filtering', () => {
		it('should search songs', async () => {
			mockSongsAPI.getSongsPaginated.mockResolvedValue(mockPaginatedResult);
			mockSongsAPI.getSongsUsageInfo.mockResolvedValue(new Map());
			mockSongsAPI.getSongs.mockResolvedValue([]);

			await songsStore.searchSongs('Amazing');

			expect(songsStore.filters.search).toBe('Amazing');
			expect(songsStore.currentPage).toBe(1); // Reset to page 1
			expect(mockSongsAPI.getSongsPaginated).toHaveBeenCalledWith(
				1,
				20,
				expect.objectContaining({
					search: 'Amazing'
				})
			);
		});

		it('should apply filters', async () => {
			const newFilters: Partial<SongFilterOptions> = { key: 'C', tags: ['hymn'] };
			mockSongsAPI.getSongsPaginated.mockResolvedValue(mockPaginatedResult);
			mockSongsAPI.getSongsUsageInfo.mockResolvedValue(new Map());
			mockSongsAPI.getSongs.mockResolvedValue([]);

			await songsStore.applyFilters(newFilters);

			expect(songsStore.filters).toEqual({
				search: '',
				key: 'C',
				tags: ['hymn'],
				sort: 'title'
			});
			expect(songsStore.currentPage).toBe(1);
		});

		it('should clear filters', async () => {
			songsStore.filters = { search: 'test', key: 'C', tags: ['hymn'], sort: 'artist' };
			mockSongsAPI.getSongsPaginated.mockResolvedValue(mockPaginatedResult);
			mockSongsAPI.getSongsUsageInfo.mockResolvedValue(new Map());
			mockSongsAPI.getSongs.mockResolvedValue([]);

			await songsStore.clearFilters();

			expect(songsStore.filters).toEqual({
				search: '',
				key: '',
				tags: [],
				sort: 'title'
			});
			expect(songsStore.currentPage).toBe(1);
		});
	});

	describe('pagination', () => {
		beforeEach(() => {
			songsStore.currentPage = 2;
			songsStore.totalPages = 5;
			// Mock API response that updates current page
			const mockResult = { ...mockPaginatedResult, page: 2, totalPages: 5 };
			mockSongsAPI.getSongsPaginated.mockResolvedValue(mockResult);
			mockSongsAPI.getSongsUsageInfo.mockResolvedValue(new Map());
			mockSongsAPI.getSongs.mockResolvedValue([]);
		});

		it('should navigate to next page', async () => {
			const nextPageResult = { ...mockPaginatedResult, page: 3, totalPages: 5 };
			mockSongsAPI.getSongsPaginated.mockResolvedValue(nextPageResult);

			await songsStore.nextPage();

			expect(songsStore.currentPage).toBe(3);
			expect(mockSongsAPI.getSongsPaginated).toHaveBeenCalledWith(
				3,
				20,
				expect.objectContaining({})
			);
		});

		it('should navigate to previous page', async () => {
			const prevPageResult = { ...mockPaginatedResult, page: 1, totalPages: 5 };
			mockSongsAPI.getSongsPaginated.mockResolvedValue(prevPageResult);

			await songsStore.prevPage();

			expect(songsStore.currentPage).toBe(1);
			expect(mockSongsAPI.getSongsPaginated).toHaveBeenCalledWith(
				1,
				20,
				expect.objectContaining({})
			);
		});

		it('should go to specific page', async () => {
			const targetPageResult = { ...mockPaginatedResult, page: 4, totalPages: 5 };
			mockSongsAPI.getSongsPaginated.mockResolvedValue(targetPageResult);

			await songsStore.goToPage(4);

			expect(songsStore.currentPage).toBe(4);
			expect(mockSongsAPI.getSongsPaginated).toHaveBeenCalledWith(
				4,
				20,
				expect.objectContaining({})
			);
		});

		it('should not go to invalid page numbers', async () => {
			const initialPage = songsStore.currentPage;
			vi.clearAllMocks();

			await songsStore.goToPage(0);
			expect(songsStore.currentPage).toBe(initialPage);

			await songsStore.goToPage(10);
			expect(songsStore.currentPage).toBe(initialPage);

			// Should not call API for same page
			expect(mockSongsAPI.getSongsPaginated).not.toHaveBeenCalled();
		});
	});

	// Note: Derived values tests are skipped as $derived() runes don't work in Node.js test environment
	// The logic is tested implicitly through other operations that depend on these values

	describe('statistics and helper methods', () => {
		it('should calculate usage status correctly', () => {
			// Access private method through store instance
			const store = songsStore as any;

			expect(store.calculateUsageStatus(7)).toBe('recent');
			expect(store.calculateUsageStatus(20)).toBe('caution');
			expect(store.calculateUsageStatus(35)).toBe('available');
		});

		it('should find most used key', () => {
			const songs = [
				{ ...testSong, key_signature: 'C' },
				{ ...testSong, id: 'song-2', key_signature: 'D' },
				{ ...testSong, id: 'song-3', key_signature: 'C' },
				{ ...testSong, id: 'song-4', key_signature: null }
			];

			const store = songsStore as any;
			const mostUsedKey = store.getMostUsedKey(songs);
			expect(mostUsedKey).toBe('C');
		});

		it('should return undefined when no keys present', () => {
			const songs = [
				{ ...testSong, key_signature: null },
				{ ...testSong, id: 'song-2', key_signature: undefined }
			];

			const store = songsStore as any;
			const mostUsedKey = store.getMostUsedKey(songs);
			expect(mostUsedKey).toBeUndefined();
		});

		it('should calculate average tempo', () => {
			const songs = [
				{ ...testSong, tempo: 120 },
				{ ...testSong, id: 'song-2', tempo: 140 },
				{ ...testSong, id: 'song-3', tempo: null },
				{ ...testSong, id: 'song-4', tempo: 100 }
			];

			const store = songsStore as any;
			const avgTempo = store.getAverageTempo(songs);
			expect(avgTempo).toBe(120); // (120 + 140 + 100) / 3 = 120
		});

		it('should return undefined when no tempos present', () => {
			const songs = [
				{ ...testSong, tempo: null },
				{ ...testSong, id: 'song-2', tempo: 0 }
			];

			const store = songsStore as any;
			const avgTempo = store.getAverageTempo(songs);
			expect(avgTempo).toBeUndefined();
		});

		it('should check if song is recently used', () => {
			const store = songsStore as any;
			const recentSong = { ...testSong, usageStatus: 'recent' };
			const oldSong = { ...testSong, usageStatus: 'available' };

			expect(store.isRecentlyUsed(recentSong)).toBe(true);
			expect(store.isRecentlyUsed(oldSong)).toBe(false);
		});
	});

	describe('song selection', () => {
		it('should select song', () => {
			songsStore.selectSong(testSong);
			expect(songsStore.selectedSong).toEqual(testSong);
		});

		it('should clear selected song', () => {
			songsStore.selectedSong = testSong;
			songsStore.selectSong(null);
			expect(songsStore.selectedSong).toBe(null);
		});
	});

	describe('error handling', () => {
		it('should clear error state', () => {
			songsStore.error = 'Test error';
			songsStore.clearError();
			expect(songsStore.error).toBe(null);
		});

		it('should handle different error types', () => {
			const store = songsStore as any;

			// API error with response
			const apiError = {
				response: { data: { message: 'API error' } }
			};
			expect(store.getErrorMessage(apiError)).toBe('API error');

			// Error instance
			const errorInstance = new Error('Error instance message');
			expect(store.getErrorMessage(errorInstance)).toBe('Error instance message');

			// Unknown error
			expect(store.getErrorMessage('string error')).toBe('An unexpected error occurred');
		});
	});

	describe('getSongsByCategory', () => {
		it('should group songs by category', async () => {
			const songs = [
				{
					...testSong,
					category: 'category-1',
					expand: { category: { id: 'category-1', name: 'Hymns' } }
				},
				{
					...testSong,
					id: 'song-2',
					title: 'Another Song',
					category: 'category-1',
					expand: { category: { id: 'category-1', name: 'Hymns' } }
				},
				{
					...testSong,
					id: 'song-3',
					title: 'Modern Song',
					category: 'category-2',
					expand: { category: { id: 'category-2', name: 'Contemporary' } }
				}
			];
			mockSongsAPI.getSongs.mockResolvedValue(songs);

			const result = await songsStore.getSongsByCategory();

			expect(result.size).toBe(2);
			expect(result.get('category-1')?.songs).toHaveLength(2);
			expect(result.get('category-2')?.songs).toHaveLength(1);
			expect(result.get('category-1')?.category.name).toBe('Hymns');
		});

		it('should handle songs without category information', async () => {
			const songs = [
				{
					...testSong,
					category: 'unknown-category',
					expand: undefined
				}
			];
			mockSongsAPI.getSongs.mockResolvedValue(songs);

			const result = await songsStore.getSongsByCategory();

			expect(result.size).toBe(1);
			expect(result.get('unknown-category')?.category).toEqual({
				id: 'unknown-category',
				name: 'Unknown Category'
			});
		});

		it('should sort songs within categories by title', async () => {
			const songs = [
				{
					...testSong,
					title: 'Zebra Song',
					category: 'category-1',
					expand: { category: { id: 'category-1', name: 'Test' } }
				},
				{
					...testSong,
					id: 'song-2',
					title: 'Alpha Song',
					category: 'category-1',
					expand: { category: { id: 'category-1', name: 'Test' } }
				}
			];
			mockSongsAPI.getSongs.mockResolvedValue(songs);

			const result = await songsStore.getSongsByCategory();

			const categorySongs = result.get('category-1')?.songs;
			expect(categorySongs?.[0].title).toBe('Alpha Song');
			expect(categorySongs?.[1].title).toBe('Zebra Song');
		});

		it('should handle errors when getting songs by category', async () => {
			const error = new Error('Network error');
			mockSongsAPI.getSongs.mockRejectedValue(error);

			await expect(songsStore.getSongsByCategory()).rejects.toThrow('Network error');
		});
	});

	describe('real-time subscriptions', () => {
		it('should subscribe to updates and handle create events', async () => {
			const unsubscribe = vi.fn();
			let eventHandler: ((data: unknown) => void) | undefined;

			mockSongsAPI.subscribe.mockImplementation((handler: (data: unknown) => void) => {
				eventHandler = handler;
				return Promise.resolve(unsubscribe);
			});

			const result = await songsStore.subscribeToUpdates();

			expect(result).toBe(unsubscribe);
			expect(mockSongsAPI.subscribe).toHaveBeenCalledWith(expect.any(Function));

			// Ensure eventHandler was captured
			expect(eventHandler).toBeDefined();

			// Test create event
			songsStore.totalItems = 5;
			const newSong = { ...testSong, id: 'song-2' };
			eventHandler!({ action: 'create', record: newSong });

			expect(songsStore.songs).toEqual([newSong]);
			expect(songsStore.totalItems).toBe(6);
		});

		it('should handle update events', async () => {
			songsStore.songs = [testSong];

			let eventHandler: ((data: unknown) => void) | undefined;
			mockSongsAPI.subscribe.mockImplementation((handler: (data: unknown) => void) => {
				eventHandler = handler;
				return Promise.resolve(vi.fn());
			});

			await songsStore.subscribeToUpdates();

			// Ensure eventHandler was captured
			expect(eventHandler).toBeDefined();

			const updatedSong = { ...testSong, title: 'Updated Title' };
			eventHandler!({ action: 'update', record: updatedSong });

			expect(songsStore.songs[0]).toEqual(updatedSong);
		});

		it('should handle delete events', async () => {
			songsStore.songs = [testSong];
			songsStore.totalItems = 1;

			let eventHandler: ((data: unknown) => void) | undefined;
			mockSongsAPI.subscribe.mockImplementation((handler: (data: unknown) => void) => {
				eventHandler = handler;
				return Promise.resolve(vi.fn());
			});

			await songsStore.subscribeToUpdates();

			// Ensure eventHandler was captured
			expect(eventHandler).toBeDefined();

			eventHandler!({ action: 'delete', record: { id: 'song-1' } });

			expect(songsStore.songs).toEqual([]);
			expect(songsStore.totalItems).toBe(0);
		});
	});
});
