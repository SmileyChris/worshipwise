import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MockPocketBase } from '../../helpers/pb-mock';
import { createMockSong, createMockUser, createMockAuthContext } from '../../helpers/test-utils';
import { SongsAPI } from '$lib/api/songs';

describe('Songs API', () => {
	let songsApi: SongsAPI;
	let mockPb: MockPocketBase;

	beforeEach(() => {
		// Create fresh mock instance for each test
		mockPb = new MockPocketBase();
		
		// Mock the client module to return our fresh instance
		vi.doMock('$lib/api/client', () => ({
			pb: mockPb
		}));
		
		// Create API instance with mock auth context and pb instance
		const authContext = createMockAuthContext();
		songsApi = new SongsAPI(authContext, mockPb);
	});

	describe('getSongs', () => {
		it('should return list of songs', async () => {
			const mockSongs = [
				createMockSong({ id: 'song_1', title: 'Amazing Grace' }),
				createMockSong({ id: 'song_2', title: 'How Great Thou Art' })
			];

			mockPb.collection('songs').mockGetFullList(mockSongs);

			const result = await songsApi.getSongs();

			expect(result).toEqual(mockSongs);
			expect(mockPb.collection('songs').getFullList).toHaveBeenCalled();
		});

		it('should apply search filter when provided', async () => {
			const mockSongs = [createMockSong({ title: 'Amazing Grace' })];
			mockPb.collection('songs').mockGetFullList(mockSongs);

			await songsApi.getSongs({ search: 'Amazing' });

			expect(mockPb.collection('songs').getFullList).toHaveBeenCalled();
		});
	});

	describe('getSong', () => {
		it('should return a specific song', async () => {
			const mockSong = createMockSong({ id: 'song_1', title: 'Amazing Grace' });
			mockPb.collection('songs').mockGetOne(mockSong);

			const result = await songsApi.getSong('song_1');

			expect(result).toEqual(mockSong);
			expect(mockPb.collection('songs').getOne).toHaveBeenCalledWith('song_1', expect.any(Object));
		});

		it('should throw error if song not found', async () => {
			mockPb.collection('songs').getOne.mockRejectedValue(new Error('Not found'));

			await expect(songsApi.getSong('invalid_id')).rejects.toThrow('Not found');
		});
	});

	describe('createSong', () => {
		it('should create a new song', async () => {
			const songData = {
				title: 'New Song',
				artist: 'Test Artist',
				key_signature: 'G',
				tempo: 120,
				genre: 'Contemporary',
				category: 'worship'
			};

			const mockCreatedSong = createMockSong({ ...songData, id: 'song_new' });
			mockPb.collection('songs').mockCreate(mockCreatedSong);

			const result = await songsApi.createSong(songData);

			expect(result).toEqual(mockCreatedSong);
			expect(mockPb.collection('songs').create).toHaveBeenCalled();
		});
	});

	describe('updateSong', () => {
		it('should update an existing song', async () => {
			const updateData = { title: 'Updated Title' };
			const mockUpdatedSong = createMockSong({ ...updateData, id: 'song_1' });

			mockPb.collection('songs').mockUpdate(mockUpdatedSong);

			const result = await songsApi.updateSong('song_1', updateData);

			expect(result).toEqual(mockUpdatedSong);
			expect(mockPb.collection('songs').update).toHaveBeenCalledWith('song_1', updateData);
		});
	});

	describe('deleteSong', () => {
		it('should soft delete a song', async () => {
			mockPb.collection('songs').mockUpdate({});

			await songsApi.deleteSong('song_1');

			expect(mockPb.collection('songs').update).toHaveBeenCalled();
		});
	});

	describe('searchSongs', () => {
		it('should search songs by query', async () => {
			const mockSongs = [createMockSong({ title: 'Amazing Grace' })];
			mockPb.collection('songs').mockGetFullList(mockSongs);

			const result = await songsApi.searchSongs('Amazing');

			expect(result).toEqual(mockSongs);
			expect(mockPb.collection('songs').getFullList).toHaveBeenCalled();
		});
	});
});
