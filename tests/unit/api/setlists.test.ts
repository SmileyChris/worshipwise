import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockPb } from '../../helpers/pb-mock';
import { createMockSetlist, createMockSetlistSong, createMockUser } from '../../helpers/test-utils';
import { setlistsApi } from '$lib/api/setlists';

// Mock the client module
vi.mock('$lib/api/client', () => ({
  pb: mockPb
}));

describe('Setlists API', () => {
  beforeEach(() => {
    mockPb.reset();
    mockPb.authStore.model = createMockUser({ id: 'user_1', name: 'Test User' });
  });

  describe('getSetlists', () => {
    it('should return list of setlists with default sort', async () => {
      const mockSetlists = [
        createMockSetlist({ id: 'setlist_1', title: 'Sunday Service' }),
        createMockSetlist({ id: 'setlist_2', title: 'Evening Worship' })
      ];

      mockPb.collection('setlists').mockGetFullList(mockSetlists);

      const result = await setlistsApi.getSetlists();

      expect(result).toEqual(mockSetlists);
      expect(mockPb.collection('setlists').getFullList).toHaveBeenCalledWith({
        filter: '',
        sort: '-service_date',
        expand: 'worship_leader,team_members,created_by'
      });
    });

    it('should apply search filter', async () => {
      const mockSetlists = [
        createMockSetlist({ id: 'setlist_1', title: 'Christmas Service' })
      ];

      mockPb.collection('setlists').mockGetFullList(mockSetlists);

      await setlistsApi.getSetlists({ search: 'Christmas' });

      expect(mockPb.collection('setlists').getFullList).toHaveBeenCalledWith({
        filter: '(title ~ "Christmas" || theme ~ "Christmas")',
        sort: '-service_date',
        expand: 'worship_leader,team_members,created_by'
      });
    });

    it('should apply multiple filters', async () => {
      const mockSetlists = [
        createMockSetlist({ id: 'setlist_1', status: 'completed' })
      ];

      mockPb.collection('setlists').mockGetFullList(mockSetlists);

      await setlistsApi.getSetlists({
        status: 'completed',
        serviceType: 'Sunday Morning',
        templatesOnly: true
      });

      expect(mockPb.collection('setlists').getFullList).toHaveBeenCalledWith({
        filter: 'status = "completed" && service_type = "Sunday Morning" && is_template = true',
        sort: '-service_date',
        expand: 'worship_leader,team_members,created_by'
      });
    });

    it('should apply date range filters', async () => {
      const mockSetlists = [];
      mockPb.collection('setlists').mockGetFullList(mockSetlists);

      await setlistsApi.getSetlists({
        dateFrom: '2024-01-01',
        dateTo: '2024-12-31'
      });

      expect(mockPb.collection('setlists').getFullList).toHaveBeenCalledWith({
        filter: 'service_date >= "2024-01-01" && service_date <= "2024-12-31"',
        sort: '-service_date',
        expand: 'worship_leader,team_members,created_by'
      });
    });

    it('should exclude templates when specified', async () => {
      const mockSetlists = [];
      mockPb.collection('setlists').mockGetFullList(mockSetlists);

      await setlistsApi.getSetlists({ excludeTemplates: true });

      expect(mockPb.collection('setlists').getFullList).toHaveBeenCalledWith({
        filter: 'is_template = false',
        sort: '-service_date',
        expand: 'worship_leader,team_members,created_by'
      });
    });

    it('should handle errors and rethrow them', async () => {
      const error = new Error('Network error');
      mockPb.collection('setlists').mockError(error);

      await expect(setlistsApi.getSetlists()).rejects.toThrow('Network error');
    });
  });

  describe('getSetlist', () => {
    it('should return single setlist with expansion', async () => {
      const mockSetlist = createMockSetlist({ id: 'setlist_1', title: 'Sunday Service' });
      mockPb.collection('setlists').mockGetOne(mockSetlist);

      const result = await setlistsApi.getSetlist('setlist_1');

      expect(result).toEqual(mockSetlist);
      expect(mockPb.collection('setlists').getOne).toHaveBeenCalledWith('setlist_1', {
        expand: 'worship_leader,team_members,created_by'
      });
    });

    it('should handle errors when fetching single setlist', async () => {
      const error = new Error('Not found');
      mockPb.collection('setlists').mockError(error);

      await expect(setlistsApi.getSetlist('invalid_id')).rejects.toThrow('Not found');
    });
  });

  describe('getSetlistSongs', () => {
    it('should return ordered setlist songs with expansion', async () => {
      const mockSongs = [
        createMockSetlistSong({ id: 'song_1', order_position: 1 }),
        createMockSetlistSong({ id: 'song_2', order_position: 2 })
      ];

      mockPb.collection('setlist_songs').mockGetFullList(mockSongs);

      const result = await setlistsApi.getSetlistSongs('setlist_1');

      expect(result).toEqual(mockSongs);
      expect(mockPb.collection('setlist_songs').getFullList).toHaveBeenCalledWith({
        filter: 'setlist_id = "setlist_1"',
        sort: 'order_position',
        expand: 'song_id,added_by'
      });
    });

    it('should handle errors when fetching setlist songs', async () => {
      const error = new Error('Database error');
      mockPb.collection('setlist_songs').mockError(error);

      await expect(setlistsApi.getSetlistSongs('setlist_1')).rejects.toThrow('Database error');
    });
  });

  describe('createSetlist', () => {
    it('should create setlist with user and default status', async () => {
      const createData = {
        title: 'New Service',
        service_date: '2024-06-15',
        service_type: 'Sunday Morning'
      };

      const expectedData = {
        ...createData,
        created_by: 'user_1',
        status: 'draft'
      };

      const mockSetlist = createMockSetlist(expectedData);
      mockPb.collection('setlists').mockCreate(mockSetlist);

      const result = await setlistsApi.createSetlist(createData);

      expect(result).toEqual(mockSetlist);
      expect(mockPb.collection('setlists').create).toHaveBeenCalledWith(expectedData);
    });

    it('should create setlist with provided status', async () => {
      const createData = {
        title: 'Template Service',
        service_date: '2024-06-15',
        service_type: 'Sunday Morning',
        status: 'template' as const
      };

      const expectedData = {
        ...createData,
        created_by: 'user_1'
      };

      const mockSetlist = createMockSetlist(expectedData);
      mockPb.collection('setlists').mockCreate(mockSetlist);

      await setlistsApi.createSetlist(createData);

      expect(mockPb.collection('setlists').create).toHaveBeenCalledWith(expectedData);
    });

    it('should handle creation errors', async () => {
      const error = new Error('Validation error');
      mockPb.collection('setlists').mockError(error);

      const createData = {
        title: 'New Service',
        service_date: '2024-06-15',
        service_type: 'Sunday Morning'
      };

      await expect(setlistsApi.createSetlist(createData)).rejects.toThrow('Validation error');
    });
  });

  describe('updateSetlist', () => {
    it('should update setlist with provided data', async () => {
      const updateData = { title: 'Updated Service' };
      const mockSetlist = createMockSetlist({ id: 'setlist_1', ...updateData });
      mockPb.collection('setlists').mockUpdate(mockSetlist);

      const result = await setlistsApi.updateSetlist('setlist_1', updateData);

      expect(result).toEqual(mockSetlist);
      expect(mockPb.collection('setlists').update).toHaveBeenCalledWith('setlist_1', updateData);
    });

    it('should handle update errors', async () => {
      const error = new Error('Update failed');
      mockPb.collection('setlists').mockError(error);

      await expect(setlistsApi.updateSetlist('setlist_1', { title: 'New Title' })).rejects.toThrow('Update failed');
    });
  });

  describe('deleteSetlist', () => {
    it('should delete setlist', async () => {
      mockPb.collection('setlists').delete.mockResolvedValue(true);

      await setlistsApi.deleteSetlist('setlist_1');

      expect(mockPb.collection('setlists').delete).toHaveBeenCalledWith('setlist_1');
    });

    it('should handle delete errors', async () => {
      const error = new Error('Delete failed');
      mockPb.collection('setlists').mockError(error);

      await expect(setlistsApi.deleteSetlist('setlist_1')).rejects.toThrow('Delete failed');
    });
  });

  describe('addSongToSetlist', () => {
    it('should add song with calculated position', async () => {
      const existingSongs = [
        createMockSetlistSong({ order_position: 1 }),
        createMockSetlistSong({ order_position: 2 })
      ];

      mockPb.collection('setlist_songs').mockGetFullList(existingSongs);

      const createData = {
        setlist_id: 'setlist_1',
        song_id: 'song_1'
      };

      const expectedData = {
        ...createData,
        order_position: 3,
        added_by: 'user_1'
      };

      const mockSetlistSong = createMockSetlistSong(expectedData);
      mockPb.collection('setlist_songs').mockCreate(mockSetlistSong);

      const result = await setlistsApi.addSongToSetlist(createData);

      expect(result).toEqual(mockSetlistSong);
      expect(mockPb.collection('setlist_songs').create).toHaveBeenCalledWith(expectedData);
    });

    it('should respect provided position', async () => {
      mockPb.collection('setlist_songs').mockGetFullList([]);

      const createData = {
        setlist_id: 'setlist_1',
        song_id: 'song_1',
        order_position: 5
      };

      const expectedData = {
        ...createData,
        added_by: 'user_1'
      };

      const mockSetlistSong = createMockSetlistSong(expectedData);
      mockPb.collection('setlist_songs').mockCreate(mockSetlistSong);

      await setlistsApi.addSongToSetlist(createData);

      expect(mockPb.collection('setlist_songs').create).toHaveBeenCalledWith(expectedData);
    });

    it('should handle errors when adding song', async () => {
      mockPb.collection('setlist_songs').mockGetFullList([]);
      const error = new Error('Add failed');
      mockPb.collection('setlist_songs').mockError(error);

      const createData = {
        setlist_id: 'setlist_1',
        song_id: 'song_1'
      };

      await expect(setlistsApi.addSongToSetlist(createData)).rejects.toThrow('Add failed');
    });
  });

  describe('updateSetlistSong', () => {
    it('should update setlist song', async () => {
      const updateData = { transposed_key: 'G' };
      const mockSetlistSong = createMockSetlistSong({ id: 'song_1', ...updateData });
      mockPb.collection('setlist_songs').mockUpdate(mockSetlistSong);

      const result = await setlistsApi.updateSetlistSong('song_1', updateData);

      expect(result).toEqual(mockSetlistSong);
      expect(mockPb.collection('setlist_songs').update).toHaveBeenCalledWith('song_1', updateData);
    });

    it('should handle update errors', async () => {
      const error = new Error('Update failed');
      mockPb.collection('setlist_songs').mockError(error);

      await expect(setlistsApi.updateSetlistSong('song_1', { transposed_key: 'G' })).rejects.toThrow('Update failed');
    });
  });

  describe('removeSongFromSetlist', () => {
    it('should remove song from setlist', async () => {
      mockPb.collection('setlist_songs').delete.mockResolvedValue(true);

      await setlistsApi.removeSongFromSetlist('song_1');

      expect(mockPb.collection('setlist_songs').delete).toHaveBeenCalledWith('song_1');
    });

    it('should handle removal errors', async () => {
      const error = new Error('Remove failed');
      mockPb.collection('setlist_songs').mockError(error);

      await expect(setlistsApi.removeSongFromSetlist('song_1')).rejects.toThrow('Remove failed');
    });
  });

  describe('reorderSetlistSongs', () => {
    it('should update positions for multiple songs', async () => {
      const songOrder = [
        { id: 'song_1', position: 2 },
        { id: 'song_2', position: 1 }
      ];

      mockPb.collection('setlist_songs').mockUpdate(createMockSetlistSong());

      await setlistsApi.reorderSetlistSongs('setlist_1', songOrder);

      expect(mockPb.collection('setlist_songs').update).toHaveBeenCalledTimes(2);
      expect(mockPb.collection('setlist_songs').update).toHaveBeenCalledWith('song_1', { order_position: 2 });
      expect(mockPb.collection('setlist_songs').update).toHaveBeenCalledWith('song_2', { order_position: 1 });
    });

    it('should handle reorder errors', async () => {
      const error = new Error('Reorder failed');
      mockPb.collection('setlist_songs').mockError(error);

      const songOrder = [{ id: 'song_1', position: 1 }];

      await expect(setlistsApi.reorderSetlistSongs('setlist_1', songOrder)).rejects.toThrow('Reorder failed');
    });
  });

  describe('duplicateSetlist', () => {
    it('should duplicate setlist with default title and copy songs', async () => {
      const originalSetlist = createMockSetlist({
        id: 'original_1',
        title: 'Original Service',
        service_date: '2024-06-15'
      });

      const originalSongs = [
        createMockSetlistSong({ id: 'song_1', order_position: 1, song_id: 'song_a' }),
        createMockSetlistSong({ id: 'song_2', order_position: 2, song_id: 'song_b' })
      ];

      const newSetlist = createMockSetlist({
        id: 'new_1',
        title: 'Original Service (Copy)'
      });

      // Mock the sequence of calls
      mockPb.collection('setlists').mockGetOne(originalSetlist);
      mockPb.collection('setlist_songs').mockGetFullList(originalSongs);
      mockPb.collection('setlists').mockCreate(newSetlist);
      mockPb.collection('setlist_songs').mockCreate(createMockSetlistSong());

      const result = await setlistsApi.duplicateSetlist('original_1');

      expect(result).toEqual(newSetlist);
      expect(mockPb.collection('setlists').create).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Original Service (Copy)',
          service_date: '2024-06-15',
          status: 'draft'
        })
      );
      expect(mockPb.collection('setlist_songs').create).toHaveBeenCalledTimes(2);
    });

    it('should use provided new data when duplicating', async () => {
      const originalSetlist = createMockSetlist({ id: 'original_1' });
      const newSetlist = createMockSetlist({ id: 'new_1' });

      mockPb.collection('setlists').mockGetOne(originalSetlist);
      mockPb.collection('setlist_songs').mockGetFullList([]);
      mockPb.collection('setlists').mockCreate(newSetlist);

      const newData = {
        title: 'Custom Title',
        service_date: '2024-07-01'
      };

      await setlistsApi.duplicateSetlist('original_1', newData);

      expect(mockPb.collection('setlists').create).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Custom Title',
          service_date: '2024-07-01'
        })
      );
    });

    it('should handle duplicate errors', async () => {
      const error = new Error('Duplicate failed');
      mockPb.collection('setlists').mockError(error);

      await expect(setlistsApi.duplicateSetlist('original_1')).rejects.toThrow('Duplicate failed');
    });
  });

  describe('completeSetlist', () => {
    it('should mark setlist as completed and track usage', async () => {
      const completedSetlist = createMockSetlist({
        id: 'setlist_1',
        status: 'completed'
      });

      const setlistSongs = [
        createMockSetlistSong({ song_id: 'song_a', order_position: 1 })
      ];

      // Mock the sequence of calls
      mockPb.collection('setlists').mockUpdate(completedSetlist);
      mockPb.collection('setlists').mockGetOne(completedSetlist);
      mockPb.collection('setlist_songs').mockGetFullList(setlistSongs);
      mockPb.collection('song_usage').mockCreate({});

      const result = await setlistsApi.completeSetlist('setlist_1');

      expect(result).toEqual(completedSetlist);
      expect(mockPb.collection('setlists').update).toHaveBeenCalledWith('setlist_1', {
        status: 'completed'
      });
      expect(mockPb.collection('song_usage').create).toHaveBeenCalled();
    });

    it('should include actual duration when provided', async () => {
      const completedSetlist = createMockSetlist({ status: 'completed' });

      mockPb.collection('setlists').mockUpdate(completedSetlist);
      mockPb.collection('setlists').mockGetOne(completedSetlist);
      mockPb.collection('setlist_songs').mockGetFullList([]);

      await setlistsApi.completeSetlist('setlist_1', 75);

      expect(mockPb.collection('setlists').update).toHaveBeenCalledWith('setlist_1', {
        status: 'completed',
        actual_duration: 75
      });
    });

    it('should handle completion errors', async () => {
      const error = new Error('Complete failed');
      mockPb.collection('setlists').mockError(error);

      await expect(setlistsApi.completeSetlist('setlist_1')).rejects.toThrow('Complete failed');
    });
  });

  describe('getUpcomingSetlists', () => {
    it('should return upcoming setlists from today forward', async () => {
      const today = new Date().toISOString().split('T')[0];
      const mockSetlists = [
        createMockSetlist({ service_date: today })
      ];

      mockPb.collection('setlists').mockGetFullList(mockSetlists);

      const result = await setlistsApi.getUpcomingSetlists();

      expect(result).toEqual(mockSetlists);
      expect(mockPb.collection('setlists').getFullList).toHaveBeenCalledWith({
        filter: `service_date >= "${today}" && is_template = false`,
        sort: 'service_date',
        limit: 10,
        expand: 'worship_leader'
      });
    });

    it('should respect custom limit', async () => {
      mockPb.collection('setlists').mockGetFullList([]);

      await setlistsApi.getUpcomingSetlists(5);

      expect(mockPb.collection('setlists').getFullList).toHaveBeenCalledWith(
        expect.objectContaining({ limit: 5 })
      );
    });

    it('should handle errors when fetching upcoming setlists', async () => {
      const error = new Error('Fetch failed');
      mockPb.collection('setlists').mockError(error);

      await expect(setlistsApi.getUpcomingSetlists()).rejects.toThrow('Fetch failed');
    });
  });

  describe('getTemplates', () => {
    it('should return template setlists', async () => {
      const mockTemplates = [
        createMockSetlist({ is_template: true, title: 'Sunday Template' })
      ];

      mockPb.collection('setlists').mockGetFullList(mockTemplates);

      const result = await setlistsApi.getTemplates();

      expect(result).toEqual(mockTemplates);
      expect(mockPb.collection('setlists').getFullList).toHaveBeenCalledWith({
        filter: 'is_template = true',
        sort: '-created',
        expand: 'created_by'
      });
    });

    it('should handle errors when fetching templates', async () => {
      const error = new Error('Templates fetch failed');
      mockPb.collection('setlists').mockError(error);

      await expect(setlistsApi.getTemplates()).rejects.toThrow('Templates fetch failed');
    });
  });

  describe('subscribeToSetlists', () => {
    it('should subscribe to all setlist changes', () => {
      const callback = vi.fn();
      const mockUnsubscribe = vi.fn();
      mockPb.collection('setlists').subscribe = vi.fn().mockReturnValue(mockUnsubscribe);

      const unsubscribe = setlistsApi.subscribeToSetlists(callback);

      expect(mockPb.collection('setlists').subscribe).toHaveBeenCalledWith('*', callback);
      expect(unsubscribe).toBe(mockUnsubscribe);
    });
  });

  describe('subscribeToSetlistSongs', () => {
    it('should subscribe to setlist songs with filter', () => {
      const callback = vi.fn();
      const mockUnsubscribe = vi.fn();
      mockPb.collection('setlist_songs').subscribe = vi.fn().mockReturnValue(mockUnsubscribe);

      const unsubscribe = setlistsApi.subscribeToSetlistSongs('setlist_1', callback);

      expect(mockPb.collection('setlist_songs').subscribe).toHaveBeenCalledWith('*', callback, {
        filter: 'setlist_id = "setlist_1"'
      });
      expect(unsubscribe).toBe(mockUnsubscribe);
    });
  });
});