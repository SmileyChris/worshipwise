import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createSongsStore, type SongsStore } from './songs.svelte';
import type { AuthContext } from '$lib/types/auth';
import type {
	Song,
	CreateSongData,
	UpdateSongData,
	SongFilterOptions,
	SongStats,
	SongUsage
} from '$lib/types/song';
import { mockPb } from '$tests/helpers/pb-mock';
import { mockSong, mockAuthContext } from '$tests/helpers/mock-builders';

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

		// Create fresh store instance with test auth context
		songsStore = createSongsStore(authContext);
		
		// Set up PocketBase mock state
		mockPb.setAuthState(authContext.user);
	});

	describe('loadSongs', () => {
		it('should load songs with usage information successfully', async () => {
			// Mock the songs paginated result
			mockPb.collection('songs').getList.mockResolvedValue(mockPaginatedResult);
			
			// Mock the song_usage collection to return usage data
			const mockUsageRecord = {
				song_id: 'song-1',
				used_date: '2024-01-01T00:00:00Z'
			};
			mockPb.collection('song_usage').getFullList.mockResolvedValue([mockUsageRecord]);

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
			mockPb.collection('songs').getList.mockResolvedValue(mockPaginatedResult);
			// Mock empty usage data
			mockPb.collection('song_usage').getFullList.mockResolvedValue([]);

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
			mockPb.collection('songs').getList.mockResolvedValue(mockPaginatedResult);
			mockPb.collection('song_usage').getFullList.mockResolvedValue([]);

			await songsStore.loadSongs(true);

			expect(songsStore.currentPage).toBe(1);
		});

		it('should handle loading state correctly', async () => {
			mockPb.collection('songs').getList.mockImplementation(async () => {
				expect(songsStore.loading).toBe(true);
				return mockPaginatedResult;
			});
			mockPb.collection('song_usage').getFullList.mockResolvedValue([]);

			await songsStore.loadSongs();

			expect(songsStore.loading).toBe(false);
		});

		it('should handle errors when loading songs', async () => {
			const error = new Error('Network error');
			mockPb.collection('songs').getList.mockRejectedValue(error);

			await songsStore.loadSongs();

			expect(songsStore.songs).toEqual([]);
			expect(songsStore.loading).toBe(false);
			expect(songsStore.error).toBe('Network error');
		});

		it('should pass correct parameters to API', async () => {
			songsStore.currentPage = 2;
			songsStore.perPage = 10;
			songsStore.filters = { search: 'test', key: 'C', tags: ['hymn'], sort: 'title' };

			mockPb.collection('songs').getList.mockResolvedValue(mockPaginatedResult);
			mockPb.collection('song_usage').getFullList.mockResolvedValue([]);

			await songsStore.loadSongs();

			expect(mockPb.collection('songs').getList).toHaveBeenCalledWith(2, 10, {
				filter: expect.stringContaining('church_id = "church-1"'),
				sort: 'title',
				expand: 'created_by,category,labels'
			});
		});
	});

	describe('loadAllSongs', () => {
		it('should load all songs successfully', async () => {
			const songs = [testSong];
			mockPb.collection('songs').getFullList.mockResolvedValue(songs);

			const result = await songsStore.loadAllSongs();

			expect(result).toEqual(songs);
			expect(mockPb.collection('songs').getFullList).toHaveBeenCalled();
		});

		it('should handle errors when loading all songs', async () => {
			const error = new Error('Network error');
			mockPb.collection('songs').getFullList.mockRejectedValue(error);

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
			mockPb.collection('songs').create.mockResolvedValue(testSong);
			mockPb.collection('songs').getList.mockResolvedValue(mockPaginatedResult);
			mockPb.collection('song_usage').getFullList.mockResolvedValue([]);

			const result = await songsStore.createSong(createData);

			expect(result).toEqual(testSong);
			expect(songsStore.loading).toBe(false);
			expect(songsStore.error).toBe(null);
			expect(mockPb.collection('songs').create).toHaveBeenCalledWith(expect.any(FormData));
			expect(mockPb.collection('songs').getList).toHaveBeenCalled(); // loadSongs called
		});

		it('should handle errors when creating song', async () => {
			const createData: CreateSongData = {
				title: 'New Song',
				artist: 'Artist',
				category: 'category-1'
			};
			const error = new Error('Validation failed');
			mockPb.collection('songs').create.mockRejectedValue(error);

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
			mockPb.collection('songs').update.mockResolvedValue(updatedSong);

			const result = await songsStore.updateSong('song-1', updateData);

			expect(result).toEqual(updatedSong);
			expect(songsStore.songs[0]).toEqual(updatedSong);
			expect(songsStore.loading).toBe(false);
			expect(songsStore.error).toBe(null);
			expect(mockPb.collection('songs').update).toHaveBeenCalledWith('song-1', updateData);
		});

		it('should handle updating non-existent song in local array', async () => {
			const updateData: UpdateSongData = { title: 'Updated Song' };
			const updatedSong = { ...testSong, id: 'different-id', title: 'Updated Song' };
			mockPb.collection('songs').update.mockResolvedValue(updatedSong);

			const result = await songsStore.updateSong('different-id', updateData);

			expect(result).toEqual(updatedSong);
			expect(songsStore.songs[0]).toEqual(testSong); // Original unchanged
		});

		it('should handle errors when updating song', async () => {
			const updateData: UpdateSongData = { title: 'Updated Song' };
			const error = new Error('Update failed');
			mockPb.collection('songs').update.mockRejectedValue(error);

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
			mockPb.collection('songs').delete.mockResolvedValue(undefined);
			mockPb.collection('songs').getFullList.mockResolvedValue([]);

			await songsStore.deleteSong('song-1');

			expect(songsStore.songs).toEqual([]);
			expect(songsStore.totalItems).toBe(0);
			expect(songsStore.loading).toBe(false);
			expect(songsStore.error).toBe(null);
			expect(mockPb.collection('songs').update).toHaveBeenCalledWith('song-1', { is_active: false });
		});

		it('should handle errors when deleting song', async () => {
			const error = new Error('Delete failed');
			mockPb.collection('songs').update.mockRejectedValue(error);

			await expect(songsStore.deleteSong('song-1')).rejects.toThrow('Delete failed');

			expect(songsStore.songs).toEqual([testSong]); // Unchanged
			expect(songsStore.totalItems).toBe(1);
			expect(songsStore.error).toBe('Delete failed');
		});
	});

	describe('search and filtering', () => {
		it('should search songs', async () => {
			mockPb.collection('songs').getList.mockResolvedValue(mockPaginatedResult);
			mockPb.collection('song_usage').getFullList.mockResolvedValue([]);
			mockPb.collection('songs').getFullList.mockResolvedValue([]);

			await songsStore.searchSongs('Amazing');

			expect(songsStore.filters.search).toBe('Amazing');
			expect(songsStore.currentPage).toBe(1); // Reset to page 1
			expect(mockPb.collection('songs').getList).toHaveBeenCalledWith(
				1,
				20,
				expect.objectContaining({
					filter: expect.stringContaining('Amazing'),
					expand: 'created_by,category,labels'
				})
			);
		});

		it('should apply filters', async () => {
			const newFilters: Partial<SongFilterOptions> = { key: 'C', tags: ['hymn'] };
			mockPb.collection('songs').getList.mockResolvedValue(mockPaginatedResult);
			mockPb.collection('song_usage').getFullList.mockResolvedValue([]);
			mockPb.collection('songs').getFullList.mockResolvedValue([]);

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
			mockPb.collection('songs').getList.mockResolvedValue(mockPaginatedResult);
			mockPb.collection('song_usage').getFullList.mockResolvedValue([]);
			mockPb.collection('songs').getFullList.mockResolvedValue([]);

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
			mockPb.collection('songs').getList.mockResolvedValue(mockResult);
			mockPb.collection('song_usage').getFullList.mockResolvedValue([]);
			mockPb.collection('songs').getFullList.mockResolvedValue([]);
		});

		it('should navigate to next page', async () => {
			const nextPageResult = { ...mockPaginatedResult, page: 3, totalPages: 5 };
			mockPb.collection('songs').getList.mockResolvedValue(nextPageResult);

			await songsStore.nextPage();

			expect(songsStore.currentPage).toBe(3);
			expect(mockPb.collection('songs').getList).toHaveBeenCalledWith(3, 20, expect.objectContaining({
				filter: expect.stringContaining('church_id'),
				expand: 'created_by,category,labels'
			}));
		});

		it('should navigate to previous page', async () => {
			const prevPageResult = { ...mockPaginatedResult, page: 1, totalPages: 5 };
			mockPb.collection('songs').getList.mockResolvedValue(prevPageResult);

			await songsStore.prevPage();

			expect(songsStore.currentPage).toBe(1);
			expect(mockPb.collection('songs').getList).toHaveBeenCalledWith(1, 20, expect.objectContaining({
				filter: expect.stringContaining('church_id'),
				expand: 'created_by,category,labels'
			}));
		});

		it('should go to specific page', async () => {
			const targetPageResult = { ...mockPaginatedResult, page: 4, totalPages: 5 };
			mockPb.collection('songs').getList.mockResolvedValue(targetPageResult);

			await songsStore.goToPage(4);

			expect(songsStore.currentPage).toBe(4);
			expect(mockPb.collection('songs').getList).toHaveBeenCalledWith(4, 20, expect.objectContaining({
				filter: expect.stringContaining('church_id'),
				expand: 'created_by,category,labels'
			}));
		});

		it('should not go to invalid page numbers', async () => {
			const initialPage = songsStore.currentPage;
			vi.clearAllMocks();

			await songsStore.goToPage(0);
			expect(songsStore.currentPage).toBe(initialPage);

			await songsStore.goToPage(10);
			expect(songsStore.currentPage).toBe(initialPage);

			// Should not call API for same page
			expect(mockPb.collection('songs').getList).not.toHaveBeenCalled();
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
			mockPb.collection('songs').getFullList.mockResolvedValue(songs);

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
			mockPb.collection('songs').getFullList.mockResolvedValue(songs);

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
			mockPb.collection('songs').getFullList.mockResolvedValue(songs);

			const result = await songsStore.getSongsByCategory();

			const categorySongs = result.get('category-1')?.songs;
			expect(categorySongs?.[0].title).toBe('Alpha Song');
			expect(categorySongs?.[1].title).toBe('Zebra Song');
		});

		it('should handle errors when getting songs by category', async () => {
			const error = new Error('Network error');
			mockPb.collection('songs').getFullList.mockRejectedValue(error);

			await expect(songsStore.getSongsByCategory()).rejects.toThrow('Network error');
		});
	});

	describe('real-time subscriptions', () => {
		it('should subscribe to updates and handle create events', async () => {
			const unsubscribe = vi.fn();
			let eventHandler: ((data: unknown) => void) | undefined;

			mockPb
				.collection('songs')
				.subscribe.mockImplementation((topic: string, handler: (data: unknown) => void) => {
					eventHandler = handler;
					return Promise.resolve(unsubscribe);
				});

			const result = await songsStore.subscribeToUpdates();

			expect(result).toBe(unsubscribe);
			expect(mockPb.collection('songs').subscribe).toHaveBeenCalledWith('*', expect.any(Function));

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
			mockPb
				.collection('songs')
				.subscribe.mockImplementation((topic: string, handler: (data: unknown) => void) => {
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
			mockPb
				.collection('songs')
				.subscribe.mockImplementation((topic: string, handler: (data: unknown) => void) => {
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
