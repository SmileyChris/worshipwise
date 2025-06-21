import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockPb } from '../../helpers/pb-mock';
import { createMockService, createMockServiceSong, createMockUser } from '../../helpers/test-utils';
import { servicesApi } from '$lib/api/services';

// Mock the client module
vi.mock('$lib/api/client', () => ({
	pb: mockPb
}));

describe('Services API', () => {
	beforeEach(() => {
		mockPb.reset();
		mockPb.authStore.model = createMockUser({ id: 'user_1', name: 'Test User' }) as any;
	});

	describe('getServices', () => {
		it('should return list of services with default sort', async () => {
			const mockServices = [
				createMockService({ id: 'service_1', title: 'Sunday Service' }),
				createMockService({ id: 'service_2', title: 'Evening Worship' })
			];

			mockPb.collection('setlists').mockGetFullList(mockServices);

			const result = await servicesApi.getServices();

			expect(result).toEqual(mockServices);
			expect(mockPb.collection('setlists').getFullList).toHaveBeenCalledWith({
				filter: '',
				sort: '-service_date',
				expand: 'worship_leader,team_members,created_by'
			});
		});

		it('should apply search filter', async () => {
			const mockServices = [createMockService({ id: 'service_1', title: 'Christmas Service' })];

			mockPb.collection('setlists').mockGetFullList(mockServices);

			await servicesApi.getServices({ search: 'Christmas' });

			expect(mockPb.collection('setlists').getFullList).toHaveBeenCalledWith({
				filter: '(title ~ "Christmas" || theme ~ "Christmas")',
				sort: '-service_date',
				expand: 'worship_leader,team_members,created_by'
			});
		});

		it('should apply multiple filters', async () => {
			const mockServices = [createMockService({ id: 'service_1', status: 'completed' })];

			mockPb.collection('setlists').mockGetFullList(mockServices);

			await servicesApi.getServices({
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
			const mockServices: any[] = [];
			mockPb.collection('setlists').mockGetFullList(mockServices);

			await servicesApi.getServices({
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
			const mockServices: any[] = [];
			mockPb.collection('setlists').mockGetFullList(mockServices);

			await servicesApi.getServices({ excludeTemplates: true });

			expect(mockPb.collection('setlists').getFullList).toHaveBeenCalledWith({
				filter: 'is_template = false',
				sort: '-service_date',
				expand: 'worship_leader,team_members,created_by'
			});
		});

		it('should handle errors and rethrow them', async () => {
			const error = new Error('Network error');
			mockPb.collection('setlists').mockError(error);

			await expect(servicesApi.getServices()).rejects.toThrow('Network error');
		});
	});

	describe('getService', () => {
		it('should return single service with expansion', async () => {
			const mockService = createMockService({ id: 'service_1', title: 'Sunday Service' });
			mockPb.collection('setlists').mockGetOne(mockService);

			const result = await servicesApi.getService('service_1');

			expect(result).toEqual(mockService);
			expect(mockPb.collection('setlists').getOne).toHaveBeenCalledWith('service_1', {
				expand: 'worship_leader,team_members,created_by'
			});
		});

		it('should handle errors when fetching single service', async () => {
			const error = new Error('Not found');
			mockPb.collection('setlists').mockError(error);

			await expect(servicesApi.getService('invalid_id')).rejects.toThrow('Not found');
		});
	});

	describe('getServiceSongs', () => {
		it('should return ordered service songs with expansion', async () => {
			const mockSongs = [
				createMockServiceSong({ id: 'song_1', order_position: 1 }),
				createMockServiceSong({ id: 'song_2', order_position: 2 })
			];

			mockPb.collection('setlist_songs').mockGetFullList(mockSongs);

			const result = await servicesApi.getServiceSongs('service_1');

			expect(result).toEqual(mockSongs);
			expect(mockPb.collection('setlist_songs').getFullList).toHaveBeenCalledWith({
				filter: 'setlist_id = "service_1"',
				sort: 'order_position',
				expand: 'song_id,added_by'
			});
		});

		it('should handle errors when fetching service songs', async () => {
			const error = new Error('Database error');
			mockPb.collection('setlist_songs').mockError(error);

			await expect(servicesApi.getServiceSongs('service_1')).rejects.toThrow('Database error');
		});
	});

	describe('createService', () => {
		it('should create service with user and default status', async () => {
			const createData = {
				title: 'New Service',
				service_date: '2024-06-15',
				service_type: 'Sunday Morning',
				worship_leader: 'user_1'
			};

			const expectedData = {
				...createData,
				created_by: 'user_1',
				status: 'draft'
			};

			const mockService = createMockService(expectedData);
			mockPb.collection('setlists').mockCreate(mockService);

			const result = await servicesApi.createService(createData);

			expect(result).toEqual(mockService);
			expect(mockPb.collection('setlists').create).toHaveBeenCalledWith(expectedData);
		});

		it('should create service with provided status', async () => {
			const createData = {
				title: 'Template Service',
				service_date: '2024-06-15',
				service_type: 'Sunday Morning',
				is_template: true,
				worship_leader: 'user_1'
			};

			const expectedData = {
				...createData,
				created_by: 'user_1'
			};

			const mockService = createMockService(expectedData);
			mockPb.collection('setlists').mockCreate(mockService);

			await servicesApi.createService(createData);

			expect(mockPb.collection('setlists').create).toHaveBeenCalledWith(expectedData);
		});

		it('should handle creation errors', async () => {
			const error = new Error('Validation error');
			mockPb.collection('setlists').mockError(error);

			const createData = {
				title: 'New Service',
				service_date: '2024-06-15',
				service_type: 'Sunday Morning',
				worship_leader: 'user_1'
			};

			await expect(servicesApi.createService(createData)).rejects.toThrow('Validation error');
		});
	});

	describe('updateService', () => {
		it('should update service with provided data', async () => {
			const updateData = { title: 'Updated Service' };
			const mockService = createMockService({ id: 'service_1', ...updateData });
			mockPb.collection('setlists').mockUpdate(mockService);

			const result = await servicesApi.updateService('service_1', updateData);

			expect(result).toEqual(mockService);
			expect(mockPb.collection('setlists').update).toHaveBeenCalledWith('service_1', updateData);
		});

		it('should handle update errors', async () => {
			const error = new Error('Update failed');
			mockPb.collection('setlists').mockError(error);

			await expect(servicesApi.updateService('service_1', { title: 'New Title' })).rejects.toThrow(
				'Update failed'
			);
		});
	});

	describe('deleteService', () => {
		it('should delete service', async () => {
			mockPb.collection('setlists').delete.mockResolvedValue(true);

			await servicesApi.deleteService('service_1');

			expect(mockPb.collection('setlists').delete).toHaveBeenCalledWith('service_1');
		});

		it('should handle delete errors', async () => {
			const error = new Error('Delete failed');
			mockPb.collection('setlists').mockError(error);

			await expect(servicesApi.deleteService('service_1')).rejects.toThrow('Delete failed');
		});
	});

	describe('addSongToService', () => {
		it('should add song with calculated position', async () => {
			const existingSongs = [
				createMockServiceSong({ order_position: 1 }),
				createMockServiceSong({ order_position: 2 })
			];

			mockPb.collection('setlist_songs').mockGetFullList(existingSongs);

			const createData = {
				service_id: 'service_1',
				song_id: 'song_1'
			};

			const expectedData = {
				setlist_id: createData.service_id,
				song_id: createData.song_id,
				order_position: 3,
				added_by: 'user_1'
			};

			const mockServiceSong = createMockServiceSong(expectedData);
			mockPb.collection('setlist_songs').mockCreate(mockServiceSong);

			const result = await servicesApi.addSongToService(createData);

			expect(result).toEqual(mockServiceSong);
			expect(mockPb.collection('setlist_songs').create).toHaveBeenCalledWith(expectedData);
		});

		it('should respect provided position', async () => {
			mockPb.collection('setlist_songs').mockGetFullList([]);

			const createData = {
				service_id: 'service_1',
				song_id: 'song_1',
				order_position: 5
			};

			const expectedData = {
				setlist_id: createData.service_id,
				song_id: createData.song_id,
				order_position: createData.order_position,
				added_by: 'user_1'
			};

			const mockServiceSong = createMockServiceSong(expectedData);
			mockPb.collection('setlist_songs').mockCreate(mockServiceSong);

			await servicesApi.addSongToService(createData);

			expect(mockPb.collection('setlist_songs').create).toHaveBeenCalledWith(expectedData);
		});

		it('should handle errors when adding song', async () => {
			mockPb.collection('setlist_songs').mockGetFullList([]);
			const error = new Error('Add failed');
			mockPb.collection('setlist_songs').mockError(error);

			const createData = {
				service_id: 'service_1',
				song_id: 'song_1'
			};

			await expect(servicesApi.addSongToService(createData)).rejects.toThrow('Add failed');
		});
	});

	describe('updateServiceSong', () => {
		it('should update service song', async () => {
			const updateData = { transposed_key: 'G' };
			const mockServiceSong = createMockServiceSong({ id: 'song_1', ...updateData });
			mockPb.collection('setlist_songs').mockUpdate(mockServiceSong);

			const result = await servicesApi.updateServiceSong('song_1', updateData);

			expect(result).toEqual(mockServiceSong);
			expect(mockPb.collection('setlist_songs').update).toHaveBeenCalledWith('song_1', updateData);
		});

		it('should handle update errors', async () => {
			const error = new Error('Update failed');
			mockPb.collection('setlist_songs').mockError(error);

			await expect(
				servicesApi.updateServiceSong('song_1', { transposed_key: 'G' })
			).rejects.toThrow('Update failed');
		});
	});

	describe('removeSongFromService', () => {
		it('should remove song from service', async () => {
			mockPb.collection('setlist_songs').delete.mockResolvedValue(true);

			await servicesApi.removeSongFromService('song_1');

			expect(mockPb.collection('setlist_songs').delete).toHaveBeenCalledWith('song_1');
		});

		it('should handle removal errors', async () => {
			const error = new Error('Remove failed');
			mockPb.collection('setlist_songs').mockError(error);

			await expect(servicesApi.removeSongFromService('song_1')).rejects.toThrow('Remove failed');
		});
	});

	describe('reorderServiceSongs', () => {
		it('should update positions for multiple songs', async () => {
			const songOrder = [
				{ id: 'song_1', position: 2 },
				{ id: 'song_2', position: 1 }
			];

			mockPb.collection('setlist_songs').mockUpdate(createMockServiceSong());

			await servicesApi.reorderServiceSongs('service_1', songOrder);

			expect(mockPb.collection('setlist_songs').update).toHaveBeenCalledTimes(2);
			expect(mockPb.collection('setlist_songs').update).toHaveBeenCalledWith('song_1', {
				order_position: 2
			});
			expect(mockPb.collection('setlist_songs').update).toHaveBeenCalledWith('song_2', {
				order_position: 1
			});
		});

		it('should handle reorder errors', async () => {
			const error = new Error('Reorder failed');
			mockPb.collection('setlist_songs').mockError(error);

			const songOrder = [{ id: 'song_1', position: 1 }];

			await expect(servicesApi.reorderServiceSongs('service_1', songOrder)).rejects.toThrow(
				'Reorder failed'
			);
		});
	});

	describe('duplicateService', () => {
		it('should duplicate service with default title and copy songs', async () => {
			const originalService = createMockService({
				id: 'original_1',
				title: 'Original Service',
				service_date: '2024-06-15'
			});

			const originalSongs = [
				createMockServiceSong({ id: 'song_1', order_position: 1, song_id: 'song_a' }),
				createMockServiceSong({ id: 'song_2', order_position: 2, song_id: 'song_b' })
			];

			const newService = createMockService({
				id: 'new_1',
				title: 'Original Service (Copy)'
			});

			// Mock the sequence of calls
			mockPb.collection('setlists').mockGetOne(originalService);
			mockPb.collection('setlist_songs').mockGetFullList(originalSongs);
			mockPb.collection('setlists').mockCreate(newService);
			mockPb.collection('setlist_songs').mockCreate(createMockServiceSong());

			const result = await servicesApi.duplicateService('original_1');

			expect(result).toEqual(newService);
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
			const originalService = createMockService({ id: 'original_1' });
			const newService = createMockService({ id: 'new_1' });

			mockPb.collection('setlists').mockGetOne(originalService);
			mockPb.collection('setlist_songs').mockGetFullList([]);
			mockPb.collection('setlists').mockCreate(newService);

			const newData = {
				title: 'Custom Title',
				service_date: '2024-07-01'
			};

			await servicesApi.duplicateService('original_1', newData);

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

			await expect(servicesApi.duplicateService('original_1')).rejects.toThrow('Duplicate failed');
		});
	});

	describe('completeService', () => {
		it('should mark service as completed and track usage', async () => {
			const completedService = createMockService({
				id: 'service_1',
				status: 'completed'
			});

			const serviceSongs = [createMockServiceSong({ song_id: 'song_a', order_position: 1 })];

			// Mock the sequence of calls
			mockPb.collection('setlists').mockUpdate(completedService);
			mockPb.collection('setlists').mockGetOne(completedService);
			mockPb.collection('setlist_songs').mockGetFullList(serviceSongs);
			mockPb.collection('song_usage').mockCreate({});

			const result = await servicesApi.completeService('service_1');

			expect(result).toEqual(completedService);
			expect(mockPb.collection('setlists').update).toHaveBeenCalledWith('service_1', {
				status: 'completed'
			});
			expect(mockPb.collection('song_usage').create).toHaveBeenCalled();
		});

		it('should include actual duration when provided', async () => {
			const completedService = createMockService({ status: 'completed' });

			mockPb.collection('setlists').mockUpdate(completedService);
			mockPb.collection('setlists').mockGetOne(completedService);
			mockPb.collection('setlist_songs').mockGetFullList([]);

			await servicesApi.completeService('service_1', 75);

			expect(mockPb.collection('setlists').update).toHaveBeenCalledWith('service_1', {
				status: 'completed',
				actual_duration: 75
			});
		});

		it('should handle completion errors', async () => {
			const error = new Error('Complete failed');
			mockPb.collection('setlists').mockError(error);

			await expect(servicesApi.completeService('service_1')).rejects.toThrow('Complete failed');
		});
	});

	describe('getUpcomingServices', () => {
		it('should return upcoming services from today forward', async () => {
			const today = new Date().toISOString().split('T')[0];
			const mockServices = [createMockService({ service_date: today })];

			mockPb.collection('setlists').mockGetFullList(mockServices);

			const result = await servicesApi.getUpcomingServices();

			expect(result).toEqual(mockServices);
			expect(mockPb.collection('setlists').getFullList).toHaveBeenCalledWith({
				filter: `service_date >= "${today}" && is_template = false`,
				sort: 'service_date',
				limit: 10,
				expand: 'worship_leader'
			});
		});

		it('should respect custom limit', async () => {
			mockPb.collection('setlists').mockGetFullList([]);

			await servicesApi.getUpcomingServices(5);

			expect(mockPb.collection('setlists').getFullList).toHaveBeenCalledWith(
				expect.objectContaining({ limit: 5 })
			);
		});

		it('should handle errors when fetching upcoming services', async () => {
			const error = new Error('Fetch failed');
			mockPb.collection('setlists').mockError(error);

			await expect(servicesApi.getUpcomingServices()).rejects.toThrow('Fetch failed');
		});
	});

	describe('getTemplates', () => {
		it('should return template services', async () => {
			const mockTemplates = [createMockService({ is_template: true, title: 'Sunday Template' })];

			mockPb.collection('setlists').mockGetFullList(mockTemplates);

			const result = await servicesApi.getTemplates();

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

			await expect(servicesApi.getTemplates()).rejects.toThrow('Templates fetch failed');
		});
	});

	describe('subscribeToServices', () => {
		it('should subscribe to all service changes', () => {
			const callback = vi.fn();
			const mockUnsubscribe = vi.fn();
			mockPb.collection('setlists').subscribe = vi.fn().mockReturnValue(mockUnsubscribe);

			const unsubscribe = servicesApi.subscribeToServices(callback);

			expect(mockPb.collection('setlists').subscribe).toHaveBeenCalledWith('*', callback);
			expect(unsubscribe).toBe(mockUnsubscribe);
		});
	});

	describe('subscribeToServiceSongs', () => {
		it('should subscribe to service songs with filter', () => {
			const callback = vi.fn();
			const mockUnsubscribe = vi.fn();
			mockPb.collection('setlist_songs').subscribe = vi.fn().mockReturnValue(mockUnsubscribe);

			const unsubscribe = servicesApi.subscribeToServiceSongs('service_1', callback);

			expect(mockPb.collection('setlist_songs').subscribe).toHaveBeenCalledWith('*', callback, {
				filter: 'setlist_id = "service_1"'
			});
			expect(unsubscribe).toBe(mockUnsubscribe);
		});
	});
});
