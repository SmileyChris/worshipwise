import { describe, it, expect, beforeEach, vi, type MockedFunction } from 'vitest';
import { songsStore } from './songs.svelte';
import { songsApi } from '$lib/api/songs';
import type {
	Song,
	CreateSongData,
	UpdateSongData,
	SongFilterOptions,
	SongStats,
	SongUsageInfo
} from '$lib/types/song';

// Mock the songs API
vi.mock('$lib/api/songs', () => ({
	songsApi: {
		getSongsPaginated: vi.fn(),
		getSongs: vi.fn(),
		getSongsUsageInfo: vi.fn(),
		createSong: vi.fn(),
		updateSong: vi.fn(),
		deleteSong: vi.fn(),
		subscribe: vi.fn()
	}
}));

const mockedSongsApi = songsApi as {
	getSongsPaginated: MockedFunction<any>;
	getSongs: MockedFunction<any>;
	getSongsUsageInfo: MockedFunction<any>;
	createSong: MockedFunction<any>;
	updateSong: MockedFunction<any>;
	deleteSong: MockedFunction<any>;
	subscribe: MockedFunction<any>;
};

describe('SongsStore', () => {
	const mockSong: Song = {
		id: 'song-1',
		church_id: 'church-1',
		title: 'Amazing Grace',
		artist: 'Traditional',
		key_signature: 'C',
		tempo: 120,
		duration_seconds: 240,
		ccli_number: '12345',
		copyright_year: 1779,
		themes: ['worship', 'grace'],
		tags: ['classic', 'hymn'],
		category: 'category-1',
		labels: ['traditional'],
		notes: 'Traditional hymn',
		files: [],
		created: '2024-01-01T00:00:00Z',
		updated: '2024-01-01T00:00:00Z',
		expand: {
			category: {
				id: 'category-1',
				name: 'Hymns',
				description: 'Traditional hymns'
			}
		}
	};

	const mockSongUsage: SongUsageInfo = {
		songId: 'song-1',
		lastUsed: '2024-01-01T00:00:00Z',
		daysSince: 7,
		usageCount: 5
	};

	const mockPaginatedResult = {
		items: [mockSong],
		totalItems: 1,
		totalPages: 1,
		page: 1,
		perPage: 20
	};

	beforeEach(() => {
		// Reset the store state
		songsStore.songs = [];
		songsStore.loading = false;
		songsStore.error = null;
		songsStore.currentPage = 1;
		songsStore.totalPages = 1;
		songsStore.totalItems = 0;
		songsStore.perPage = 20;
		songsStore.filters = {
			search: '',
			key: '',
			tags: [],
			sort: 'title'
		};
		songsStore.stats = {
			totalSongs: 0,
			availableSongs: 0,
			recentlyUsed: 0
		};
		songsStore.selectedSong = null;

		// Reset all mocks
		vi.clearAllMocks();
	});

	describe('loadSongs', () => {
		it('should load songs with usage information successfully', async () => {
			const usageMap = new Map([['song-1', mockSongUsage]]);
			mockedSongsApi.getSongsPaginated.mockResolvedValue(mockPaginatedResult);
			mockedSongsApi.getSongsUsageInfo.mockResolvedValue(usageMap);
			mockedSongsApi.getSongs.mockResolvedValue([mockSong]);

			await songsStore.loadSongs();

			expect(songsStore.songs).toHaveLength(1);
			expect(songsStore.songs[0]).toEqual({
				...mockSong,
				lastUsedDate: '2024-01-01T00:00:00Z',
				daysSinceLastUsed: 7,
				usageStatus: 'recent'
			});
			expect(songsStore.totalPages).toBe(1);
			expect(songsStore.totalItems).toBe(1);
			expect(songsStore.currentPage).toBe(1);
			expect(songsStore.loading).toBe(false);
			expect(songsStore.error).toBe(null);
		});

		it('should handle songs without usage information', async () => {
			const usageMap = new Map();
			mockedSongsApi.getSongsPaginated.mockResolvedValue(mockPaginatedResult);
			mockedSongsApi.getSongsUsageInfo.mockResolvedValue(usageMap);
			mockedSongsApi.getSongs.mockResolvedValue([mockSong]);

			await songsStore.loadSongs();

			expect(songsStore.songs[0]).toEqual({
				...mockSong,
				lastUsedDate: null,
				daysSinceLastUsed: Infinity,
				usageStatus: 'available'
			});
		});

		it('should reset page when resetPage is true', async () => {
			songsStore.currentPage = 3;
			mockedSongsApi.getSongsPaginated.mockResolvedValue(mockPaginatedResult);
			mockedSongsApi.getSongsUsageInfo.mockResolvedValue(new Map());
			mockedSongsApi.getSongs.mockResolvedValue([]);

			await songsStore.loadSongs(true);

			expect(songsStore.currentPage).toBe(1);
		});

		it('should handle loading state correctly', async () => {
			mockedSongsApi.getSongsPaginated.mockImplementation(async () => {
				expect(songsStore.loading).toBe(true);
				return mockPaginatedResult;
			});
			mockedSongsApi.getSongsUsageInfo.mockResolvedValue(new Map());
			mockedSongsApi.getSongs.mockResolvedValue([]);

			await songsStore.loadSongs();

			expect(songsStore.loading).toBe(false);
		});

		it('should handle errors when loading songs', async () => {
			const error = new Error('Network error');
			mockedSongsApi.getSongsPaginated.mockRejectedValue(error);

			await songsStore.loadSongs();

			expect(songsStore.songs).toEqual([]);
			expect(songsStore.loading).toBe(false);
			expect(songsStore.error).toBe('Network error');
		});

		it('should pass correct parameters to API', async () => {
			songsStore.currentPage = 2;
			songsStore.perPage = 10;
			songsStore.filters = { search: 'test', key: 'C', tags: ['hymn'], sort: 'title' };
			
			mockedSongsApi.getSongsPaginated.mockResolvedValue(mockPaginatedResult);
			mockedSongsApi.getSongsUsageInfo.mockResolvedValue(new Map());
			mockedSongsApi.getSongs.mockResolvedValue([]);

			await songsStore.loadSongs();

			expect(mockedSongsApi.getSongsPaginated).toHaveBeenCalledWith(
				2,
				10,
				{ search: 'test', key: 'C', tags: ['hymn'], sort: 'title' }
			);
		});
	});

	describe('loadAllSongs', () => {
		it('should load all songs successfully', async () => {
			const songs = [mockSong];
			mockedSongsApi.getSongs.mockResolvedValue(songs);

			const result = await songsStore.loadAllSongs();

			expect(result).toEqual(songs);
			expect(mockedSongsApi.getSongs).toHaveBeenCalled();
		});

		it('should handle errors when loading all songs', async () => {
			const error = new Error('Network error');
			mockedSongsApi.getSongs.mockRejectedValue(error);

			const result = await songsStore.loadAllSongs();

			expect(result).toEqual([]);
		});
	});

	describe('createSong', () => {
		it('should create song successfully', async () => {
			const createData: CreateSongData = {
				church_id: 'church-1',
				title: 'New Song',
				artist: 'Artist',
				key_signature: 'D',
				tempo: 130
			};
			mockedSongsApi.createSong.mockResolvedValue(mockSong);
			mockedSongsApi.getSongsPaginated.mockResolvedValue(mockPaginatedResult);
			mockedSongsApi.getSongsUsageInfo.mockResolvedValue(new Map());
			mockedSongsApi.getSongs.mockResolvedValue([mockSong]);

			const result = await songsStore.createSong(createData);

			expect(result).toEqual(mockSong);
			expect(songsStore.loading).toBe(false);
			expect(songsStore.error).toBe(null);
			expect(mockedSongsApi.createSong).toHaveBeenCalledWith(createData);
			expect(mockedSongsApi.getSongsPaginated).toHaveBeenCalled(); // loadSongs called
		});

		it('should handle errors when creating song', async () => {
			const createData: CreateSongData = {
				church_id: 'church-1',
				title: 'New Song',
				artist: 'Artist'
			};
			const error = new Error('Validation failed');
			mockedSongsApi.createSong.mockRejectedValue(error);

			await expect(songsStore.createSong(createData)).rejects.toThrow('Validation failed');

			expect(songsStore.loading).toBe(false);
			expect(songsStore.error).toBe('Validation failed');
		});
	});

	describe('updateSong', () => {
		beforeEach(() => {
			songsStore.songs = [mockSong];
		});

		it('should update song successfully', async () => {
			const updateData: UpdateSongData = { title: 'Updated Song' };
			const updatedSong = { ...mockSong, title: 'Updated Song' };
			mockedSongsApi.updateSong.mockResolvedValue(updatedSong);

			const result = await songsStore.updateSong('song-1', updateData);

			expect(result).toEqual(updatedSong);
			expect(songsStore.songs[0]).toEqual(updatedSong);
			expect(songsStore.loading).toBe(false);
			expect(songsStore.error).toBe(null);
			expect(mockedSongsApi.updateSong).toHaveBeenCalledWith('song-1', updateData);
		});

		it('should handle updating non-existent song in local array', async () => {
			const updateData: UpdateSongData = { title: 'Updated Song' };
			const updatedSong = { ...mockSong, id: 'different-id', title: 'Updated Song' };
			mockedSongsApi.updateSong.mockResolvedValue(updatedSong);

			const result = await songsStore.updateSong('different-id', updateData);

			expect(result).toEqual(updatedSong);
			expect(songsStore.songs[0]).toEqual(mockSong); // Original unchanged
		});

		it('should handle errors when updating song', async () => {
			const updateData: UpdateSongData = { title: 'Updated Song' };
			const error = new Error('Update failed');
			mockedSongsApi.updateSong.mockRejectedValue(error);

			await expect(songsStore.updateSong('song-1', updateData)).rejects.toThrow('Update failed');

			expect(songsStore.songs[0]).toEqual(mockSong); // Unchanged
			expect(songsStore.error).toBe('Update failed');
		});
	});

	describe('deleteSong', () => {
		beforeEach(() => {
			songsStore.songs = [mockSong];
			songsStore.totalItems = 1;
		});

		it('should delete song successfully', async () => {
			mockedSongsApi.deleteSong.mockResolvedValue(undefined);
			mockedSongsApi.getSongs.mockResolvedValue([]);

			await songsStore.deleteSong('song-1');

			expect(songsStore.songs).toEqual([]);
			expect(songsStore.totalItems).toBe(0);
			expect(songsStore.loading).toBe(false);
			expect(songsStore.error).toBe(null);
			expect(mockedSongsApi.deleteSong).toHaveBeenCalledWith('song-1');
		});

		it('should handle errors when deleting song', async () => {
			const error = new Error('Delete failed');
			mockedSongsApi.deleteSong.mockRejectedValue(error);

			await expect(songsStore.deleteSong('song-1')).rejects.toThrow('Delete failed');

			expect(songsStore.songs).toEqual([mockSong]); // Unchanged
			expect(songsStore.totalItems).toBe(1);
			expect(songsStore.error).toBe('Delete failed');
		});
	});

	describe('search and filtering', () => {
		it('should search songs', async () => {
			mockedSongsApi.getSongsPaginated.mockResolvedValue(mockPaginatedResult);
			mockedSongsApi.getSongsUsageInfo.mockResolvedValue(new Map());
			mockedSongsApi.getSongs.mockResolvedValue([]);

			await songsStore.searchSongs('Amazing');

			expect(songsStore.filters.search).toBe('Amazing');
			expect(songsStore.currentPage).toBe(1); // Reset to page 1
			expect(mockedSongsApi.getSongsPaginated).toHaveBeenCalledWith(
				1,
				20,
				expect.objectContaining({ search: 'Amazing' })
			);
		});

		it('should apply filters', async () => {
			const newFilters: Partial<SongFilterOptions> = { key: 'C', tags: ['hymn'] };
			mockedSongsApi.getSongsPaginated.mockResolvedValue(mockPaginatedResult);
			mockedSongsApi.getSongsUsageInfo.mockResolvedValue(new Map());
			mockedSongsApi.getSongs.mockResolvedValue([]);

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
			mockedSongsApi.getSongsPaginated.mockResolvedValue(mockPaginatedResult);
			mockedSongsApi.getSongsUsageInfo.mockResolvedValue(new Map());
			mockedSongsApi.getSongs.mockResolvedValue([]);

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
			mockedSongsApi.getSongsPaginated.mockResolvedValue(mockResult);
			mockedSongsApi.getSongsUsageInfo.mockResolvedValue(new Map());
			mockedSongsApi.getSongs.mockResolvedValue([]);
		});

		it('should navigate to next page', async () => {
			const nextPageResult = { ...mockPaginatedResult, page: 3, totalPages: 5 };
			mockedSongsApi.getSongsPaginated.mockResolvedValue(nextPageResult);

			await songsStore.nextPage();

			expect(songsStore.currentPage).toBe(3);
			expect(mockedSongsApi.getSongsPaginated).toHaveBeenCalledWith(3, 20, songsStore.filters);
		});

		it('should navigate to previous page', async () => {
			const prevPageResult = { ...mockPaginatedResult, page: 1, totalPages: 5 };
			mockedSongsApi.getSongsPaginated.mockResolvedValue(prevPageResult);

			await songsStore.prevPage();

			expect(songsStore.currentPage).toBe(1);
			expect(mockedSongsApi.getSongsPaginated).toHaveBeenCalledWith(1, 20, songsStore.filters);
		});

		it('should go to specific page', async () => {
			const targetPageResult = { ...mockPaginatedResult, page: 4, totalPages: 5 };
			mockedSongsApi.getSongsPaginated.mockResolvedValue(targetPageResult);

			await songsStore.goToPage(4);

			expect(songsStore.currentPage).toBe(4);
			expect(mockedSongsApi.getSongsPaginated).toHaveBeenCalledWith(4, 20, songsStore.filters);
		});

		it('should not go to invalid page numbers', async () => {
			const initialPage = songsStore.currentPage;
			vi.clearAllMocks();

			await songsStore.goToPage(0);
			expect(songsStore.currentPage).toBe(initialPage);

			await songsStore.goToPage(10);
			expect(songsStore.currentPage).toBe(initialPage);

			// Should not call API for same page
			expect(mockedSongsApi.getSongsPaginated).not.toHaveBeenCalled();
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
				{ ...mockSong, key_signature: 'C' },
				{ ...mockSong, id: 'song-2', key_signature: 'D' },
				{ ...mockSong, id: 'song-3', key_signature: 'C' },
				{ ...mockSong, id: 'song-4', key_signature: null }
			];
			
			const store = songsStore as any;
			const mostUsedKey = store.getMostUsedKey(songs);
			expect(mostUsedKey).toBe('C');
		});

		it('should return undefined when no keys present', () => {
			const songs = [
				{ ...mockSong, key_signature: null },
				{ ...mockSong, id: 'song-2', key_signature: undefined }
			];
			
			const store = songsStore as any;
			const mostUsedKey = store.getMostUsedKey(songs);
			expect(mostUsedKey).toBeUndefined();
		});

		it('should calculate average tempo', () => {
			const songs = [
				{ ...mockSong, tempo: 120 },
				{ ...mockSong, id: 'song-2', tempo: 140 },
				{ ...mockSong, id: 'song-3', tempo: null },
				{ ...mockSong, id: 'song-4', tempo: 100 }
			];
			
			const store = songsStore as any;
			const avgTempo = store.getAverageTempo(songs);
			expect(avgTempo).toBe(120); // (120 + 140 + 100) / 3 = 120
		});

		it('should return undefined when no tempos present', () => {
			const songs = [
				{ ...mockSong, tempo: null },
				{ ...mockSong, id: 'song-2', tempo: 0 }
			];
			
			const store = songsStore as any;
			const avgTempo = store.getAverageTempo(songs);
			expect(avgTempo).toBeUndefined();
		});

		it('should check if song is recently used', () => {
			const store = songsStore as any;
			const recentSong = { ...mockSong, usageStatus: 'recent' };
			const oldSong = { ...mockSong, usageStatus: 'available' };

			expect(store.isRecentlyUsed(recentSong)).toBe(true);
			expect(store.isRecentlyUsed(oldSong)).toBe(false);
		});
	});

	describe('song selection', () => {
		it('should select song', () => {
			songsStore.selectSong(mockSong);
			expect(songsStore.selectedSong).toEqual(mockSong);
		});

		it('should clear selected song', () => {
			songsStore.selectedSong = mockSong;
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
					...mockSong,
					category: 'category-1',
					expand: { category: { id: 'category-1', name: 'Hymns' } }
				},
				{
					...mockSong,
					id: 'song-2',
					title: 'Another Song',
					category: 'category-1',
					expand: { category: { id: 'category-1', name: 'Hymns' } }
				},
				{
					...mockSong,
					id: 'song-3',
					title: 'Modern Song',
					category: 'category-2',
					expand: { category: { id: 'category-2', name: 'Contemporary' } }
				}
			];
			mockedSongsApi.getSongs.mockResolvedValue(songs);

			const result = await songsStore.getSongsByCategory();

			expect(result.size).toBe(2);
			expect(result.get('category-1')?.songs).toHaveLength(2);
			expect(result.get('category-2')?.songs).toHaveLength(1);
			expect(result.get('category-1')?.category.name).toBe('Hymns');
		});

		it('should handle songs without category information', async () => {
			const songs = [
				{
					...mockSong,
					category: 'unknown-category',
					expand: undefined
				}
			];
			mockedSongsApi.getSongs.mockResolvedValue(songs);

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
					...mockSong,
					title: 'Zebra Song',
					category: 'category-1',
					expand: { category: { id: 'category-1', name: 'Test' } }
				},
				{
					...mockSong,
					id: 'song-2',
					title: 'Alpha Song',
					category: 'category-1',
					expand: { category: { id: 'category-1', name: 'Test' } }
				}
			];
			mockedSongsApi.getSongs.mockResolvedValue(songs);

			const result = await songsStore.getSongsByCategory();

			const categorySongs = result.get('category-1')?.songs;
			expect(categorySongs?.[0].title).toBe('Alpha Song');
			expect(categorySongs?.[1].title).toBe('Zebra Song');
		});

		it('should handle errors when getting songs by category', async () => {
			const error = new Error('Network error');
			mockedSongsApi.getSongs.mockRejectedValue(error);

			await expect(songsStore.getSongsByCategory()).rejects.toThrow('Network error');
		});
	});

	describe('real-time subscriptions', () => {
		it('should subscribe to updates and handle create events', async () => {
			const unsubscribe = vi.fn();
			let eventHandler: (data: unknown) => void;

			mockedSongsApi.subscribe.mockImplementation((handler) => {
				eventHandler = handler;
				return Promise.resolve(unsubscribe);
			});

			const result = await songsStore.subscribeToUpdates();

			expect(result).toBe(unsubscribe);
			expect(mockedSongsApi.subscribe).toHaveBeenCalled();

			// Test create event
			songsStore.totalItems = 5;
			const newSong = { ...mockSong, id: 'song-2' };
			eventHandler!({ action: 'create', record: newSong });

			expect(songsStore.songs).toEqual([newSong]);
			expect(songsStore.totalItems).toBe(6);
		});

		it('should handle update events', async () => {
			songsStore.songs = [mockSong];

			let eventHandler: (data: unknown) => void;
			mockedSongsApi.subscribe.mockImplementation((handler) => {
				eventHandler = handler;
				return Promise.resolve(vi.fn());
			});

			await songsStore.subscribeToUpdates();

			const updatedSong = { ...mockSong, title: 'Updated Title' };
			eventHandler!({ action: 'update', record: updatedSong });

			expect(songsStore.songs[0]).toEqual(updatedSong);
		});

		it('should handle delete events', async () => {
			songsStore.songs = [mockSong];
			songsStore.totalItems = 1;

			let eventHandler: (data: unknown) => void;
			mockedSongsApi.subscribe.mockImplementation((handler) => {
				eventHandler = handler;
				return Promise.resolve(vi.fn());
			});

			await songsStore.subscribeToUpdates();

			eventHandler!({ action: 'delete', record: { id: 'song-1' } });

			expect(songsStore.songs).toEqual([]);
			expect(songsStore.totalItems).toBe(0);
		});
	});
});