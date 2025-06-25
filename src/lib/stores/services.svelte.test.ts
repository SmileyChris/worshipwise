import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createServicesStore, type ServicesStore } from './services.svelte';
import type { AuthContext } from '$lib/types/auth';
import type {
	Service,
	ServiceSong,
	CreateServiceData,
	UpdateServiceData,
	AddSongToServiceData,
	UpdateServiceSongData,
	SongAvailability
} from '$lib/types/service';
import type { Song } from '$lib/types/song';
import { mockPb } from '$tests/helpers/pb-mock';
import { mockService, mockServiceSong, mockSong, mockAuthContext } from '$tests/helpers/mock-builders';

describe('ServicesStore', () => {
	let servicesStore: ServicesStore;
	let authContext: AuthContext;

	// Use factory functions for test data
	const testService = mockService({
		id: 'service-1',
		title: 'Sunday Morning Service',
		theme: 'Worship',
		service_date: '2024-01-07T10:00:00Z',
		status: 'planned'
	});

	const testSong = mockSong({
		id: 'song-1',
		title: 'Amazing Grace',
		artist: 'Traditional'
	});

	const testServiceSong = mockServiceSong({
		id: 'service-song-1',
		service_id: 'service-1',
		song_id: 'song-1',
		order_position: 1,
		transposed_key: 'C',
		expand: {
			song_id: testSong
		}
	});

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

		// Create fresh store instance with auth context
		servicesStore = createServicesStore(authContext);
	});

	describe('loadServices', () => {
		it('should load services successfully', async () => {
			const services = [testService];
			mockPb.collection('services').mockGetFullList(services);

			await servicesStore.loadServices();

			expect(servicesStore.services).toEqual(services);
			expect(servicesStore.loading).toBe(false);
			expect(servicesStore.error).toBe(null);
			expect(mockPb.collection).toHaveBeenCalledWith('services');
		});

		it('should handle loading state correctly', async () => {
			mockPb.collection('services').getFullList.mockImplementation(async () => {
				expect(servicesStore.loading).toBe(true);
				return [testService];
			});

			await servicesStore.loadServices();

			expect(servicesStore.loading).toBe(false);
		});

		it('should handle errors when loading services', async () => {
			const error = new Error('Network error');
			mockPb.collection('services').getFullList.mockRejectedValue(error);

			await servicesStore.loadServices();

			expect(servicesStore.services).toEqual([]);
			expect(servicesStore.loading).toBe(false);
			expect(servicesStore.error).toBe('Network error');
		});
	});

	describe('loadUpcomingServices', () => {
		it('should load upcoming services with default limit', async () => {
			const services = [testService];
			mockPb.collection('services').getFullList.mockResolvedValue(services);

			await servicesStore.loadUpcomingServices();

			expect(servicesStore.upcomingServices).toEqual(services);
			expect(mockPb.collection('services').getFullList).toHaveBeenCalledWith(
				expect.objectContaining({
					expand: 'worship_leader',
					limit: 10,
					sort: 'service_date'
				})
			);
		});

		it('should handle errors silently when loading upcoming services', async () => {
			const error = new Error('Network error');
			mockPb.collection('services').getFullList.mockRejectedValue(error);

			await servicesStore.loadUpcomingServices();

			expect(servicesStore.upcomingServices).toEqual([]);
		});
	});

	describe('loadTemplates', () => {
		it('should load templates successfully', async () => {
			const templates = [{ ...testService, is_template: true }];
			mockPb.collection('services').getFullList.mockResolvedValue(templates);

			await servicesStore.loadTemplates();

			expect(servicesStore.templates).toEqual(templates);
		});
	});

	describe('loadService', () => {
		it('should load service and songs successfully', async () => {
			const songs = [testServiceSong];
			mockPb.collection('services').getOne.mockResolvedValue(testService);
			mockPb.collection('service_songs').getFullList.mockResolvedValue(songs);

			await servicesStore.loadService('service-1');

			expect(servicesStore.currentService).toEqual(testService);
			expect(servicesStore.currentServiceSongs).toEqual(songs);
			expect(servicesStore.builderState.service).toEqual(testService);
			expect(servicesStore.builderState.songs).toEqual(songs);
			expect(servicesStore.builderState.isDirty).toBe(false);
			expect(servicesStore.loading).toBe(false);
			expect(servicesStore.error).toBe(null);
		});

		it('should handle errors when loading service', async () => {
			const error = new Error('Service not found');
			mockPb.collection('services').getOne.mockRejectedValue(error);

			await servicesStore.loadService('invalid-id');

			expect(servicesStore.currentService).toBe(null);
			expect(servicesStore.currentServiceSongs).toEqual([]);
			expect(servicesStore.loading).toBe(false);
			expect(servicesStore.error).toBe('Service not found');
		});
	});

	describe('createService', () => {
		it('should create service successfully', async () => {
			// Auth context is already set in beforeEach

			const createData: CreateServiceData = {
				title: 'New Service',
				theme: 'Praise',
				service_date: '2024-01-14T10:00:00Z',
				estimated_duration: 3600,
				worship_leader: 'user-1'
			};
			mockPb.collection('services').create.mockResolvedValue(testService);

			const result = await servicesStore.createService(createData);

			expect(result).toEqual(testService);
			expect(servicesStore.services).toEqual([testService]);
			expect(servicesStore.loading).toBe(false);
			expect(servicesStore.error).toBe(null);
			expect(mockPb.collection('services').create).toHaveBeenCalledWith({
				...createData,
				church_id: 'church-1',
				created_by: 'user-1',
				status: 'draft'
			});
		});

		it('should handle errors when creating service', async () => {
			const createData: CreateServiceData = {
				title: 'New Service',
				theme: 'Praise',
				service_date: '2024-01-14T10:00:00Z',
				estimated_duration: 3600,
				worship_leader: 'user-1'
			};
			const error = new Error('Validation failed');
			mockPb.collection('services').create.mockRejectedValue(error);

			await expect(servicesStore.createService(createData)).rejects.toThrow('Validation failed');

			expect(servicesStore.services).toEqual([]);
			expect(servicesStore.loading).toBe(false);
			expect(servicesStore.error).toBe('Validation failed');
		});
	});

	describe('updateService', () => {
		beforeEach(() => {
			servicesStore.services = [testService];
			servicesStore.currentService = testService;
			servicesStore.builderState.service = testService;
		});

		it('should update service successfully', async () => {
			const updateData: UpdateServiceData = { title: 'Updated Service' };
			const updatedService = { ...testService, title: 'Updated Service' };
			mockPb.collection('services').update.mockResolvedValue(updatedService);

			const result = await servicesStore.updateService('service-1', updateData);

			expect(result).toEqual(updatedService);
			expect(servicesStore.services[0]).toEqual(updatedService);
			expect(servicesStore.currentService).toEqual(updatedService);
			expect(servicesStore.builderState.service).toEqual(updatedService);
			expect(mockPb.collection('services').update).toHaveBeenCalledWith('service-1', updateData);
		});

		it('should handle updating non-existent service in local array', async () => {
			const updateData: UpdateServiceData = { title: 'Updated Service' };
			const updatedService = { ...testService, id: 'different-id', title: 'Updated Service' };
			mockPb.collection('services').update.mockResolvedValue(updatedService);

			const result = await servicesStore.updateService('different-id', updateData);

			expect(result).toEqual(updatedService);
			expect(servicesStore.services[0]).toEqual(testService); // Original unchanged
		});

		it('should handle errors when updating service', async () => {
			const updateData: UpdateServiceData = { title: 'Updated Service' };
			const error = new Error('Update failed');
			mockPb.collection('services').update.mockRejectedValue(error);

			await expect(servicesStore.updateService('service-1', updateData)).rejects.toThrow(
				'Update failed'
			);

			expect(servicesStore.services[0]).toEqual(testService); // Unchanged
			expect(servicesStore.error).toBe('Update failed');
		});
	});

	describe('deleteService', () => {
		beforeEach(() => {
			servicesStore.services = [testService];
			servicesStore.currentService = testService;
			servicesStore.currentServiceSongs = [testServiceSong];
		});

		it('should delete service successfully', async () => {
			mockPb.collection('services').delete.mockResolvedValue(undefined);

			await servicesStore.deleteService('service-1');

			expect(servicesStore.services).toEqual([]);
			expect(servicesStore.currentService).toBe(null);
			expect(servicesStore.currentServiceSongs).toEqual([]);
			expect(servicesStore.builderState.service).toBe(null);
			expect(mockPb.collection('services').delete).toHaveBeenCalledWith('service-1');
		});

		it('should handle deleting non-current service', async () => {
			const otherService = { ...testService, id: 'service-2' };
			servicesStore.services = [testService, otherService];
			mockPb.collection('services').delete.mockResolvedValue(undefined);

			await servicesStore.deleteService('service-2');

			expect(servicesStore.services).toEqual([testService]);
			expect(servicesStore.currentService).toEqual(testService); // Unchanged
		});

		it('should handle errors when deleting service', async () => {
			const error = new Error('Delete failed');
			mockPb.collection('services').delete.mockRejectedValue(error);

			await expect(servicesStore.deleteService('service-1')).rejects.toThrow('Delete failed');

			expect(servicesStore.services).toEqual([testService]); // Unchanged
			expect(servicesStore.error).toBe('Delete failed');
		});
	});

	describe('addSongToService', () => {
		beforeEach(() => {
			servicesStore.currentService = testService;
			servicesStore.currentServiceSongs = [];
		});

		it('should add song to service successfully', async () => {
			const songData: AddSongToServiceData = {
				song_id: 'song-1',
				order_position: 1,
				transposed_key: 'C',
				tempo_override: 120
			};
			mockPb.collection('service_songs').create.mockResolvedValue(testServiceSong);

			await servicesStore.addSongToService(songData);

			expect(servicesStore.currentServiceSongs).toEqual([testServiceSong]);
			expect(servicesStore.builderState.songs).toEqual([testServiceSong]);
			expect(servicesStore.builderState.isDirty).toBe(true);
			expect(servicesStore.builderState.isLoading).toBe(false);
			expect(mockPb.collection('service_songs').create).toHaveBeenCalledWith({
				...songData,
				service_id: 'service-1',
				added_by: expect.any(String)
			});
		});

		it('should sort songs by order position', async () => {
			const song1 = { ...testServiceSong, id: 'ss-1', order_position: 2 };
			const song2 = { ...testServiceSong, id: 'ss-2', order_position: 1 };

			servicesStore.currentServiceSongs = [song1];
			mockPb.collection('service_songs').create.mockResolvedValue(song2);

			await servicesStore.addSongToService({
				song_id: 'song-2',
				order_position: 1
			});

			expect(servicesStore.currentServiceSongs).toEqual([song2, song1]);
		});

		it('should throw error when no service selected', async () => {
			servicesStore.currentService = null;

			await expect(
				servicesStore.addSongToService({
					song_id: 'song-1',
					order_position: 1
				})
			).rejects.toThrow('No service selected');
		});

		it('should handle errors when adding song to service', async () => {
			const error = new Error('Add failed');
			mockPb.collection('service_songs').create.mockRejectedValue(error);

			await expect(
				servicesStore.addSongToService({
					song_id: 'song-1',
					order_position: 1
				})
			).rejects.toThrow('Add failed');

			expect(servicesStore.builderState.error).toBe('Add failed');
			expect(servicesStore.builderState.isLoading).toBe(false);
		});
	});

	describe('removeSongFromService', () => {
		beforeEach(() => {
			servicesStore.currentServiceSongs = [testServiceSong];
			servicesStore.builderState.songs = [testServiceSong];
		});

		it('should remove song from service successfully', async () => {
			mockPb.collection('service_songs').delete.mockResolvedValue(undefined);

			await servicesStore.removeSongFromService('service-song-1');

			expect(servicesStore.currentServiceSongs).toEqual([]);
			expect(servicesStore.builderState.songs).toEqual([]);
			expect(servicesStore.builderState.isDirty).toBe(true);
			expect(mockPb.collection('service_songs').delete).toHaveBeenCalledWith('service-song-1');
		});

		it('should handle errors when removing song from service', async () => {
			const error = new Error('Remove failed');
			mockPb.collection('service_songs').delete.mockRejectedValue(error);

			await expect(servicesStore.removeSongFromService('service-song-1')).rejects.toThrow(
				'Remove failed'
			);

			expect(servicesStore.currentServiceSongs).toEqual([testServiceSong]); // Unchanged
			expect(servicesStore.builderState.error).toBe('Remove failed');
		});
	});

	describe('updateServiceSong', () => {
		beforeEach(() => {
			servicesStore.currentServiceSongs = [testServiceSong];
		});

		it('should update service song successfully', async () => {
			const updateData: UpdateServiceSongData = { transposed_key: 'D' };
			const updatedSong = { ...testServiceSong, transposed_key: 'D' };
			mockPb.collection('service_songs').update.mockResolvedValue(updatedSong);

			await servicesStore.updateServiceSong('service-song-1', updateData);

			expect(servicesStore.currentServiceSongs[0]).toEqual(updatedSong);
			expect(servicesStore.builderState.songs[0]).toEqual(updatedSong);
			expect(servicesStore.builderState.isDirty).toBe(true);
			expect(mockPb.collection('service_songs').update).toHaveBeenCalledWith(
				'service-song-1',
				updateData
			);
		});

		it('should handle updating non-existent service song', async () => {
			const updateData: UpdateServiceSongData = { transposed_key: 'D' };
			const updatedSong = { ...testServiceSong, id: 'different-id', transposed_key: 'D' };
			mockPb.collection('service_songs').update.mockResolvedValue(updatedSong);

			await servicesStore.updateServiceSong('different-id', updateData);

			expect(servicesStore.currentServiceSongs[0]).toEqual(testServiceSong); // Unchanged
		});

		it('should handle errors when updating service song', async () => {
			const updateData: UpdateServiceSongData = { transposed_key: 'D' };
			const error = new Error('Update failed');
			mockPb.collection('service_songs').update.mockRejectedValue(error);

			await expect(servicesStore.updateServiceSong('service-song-1', updateData)).rejects.toThrow(
				'Update failed'
			);

			expect(servicesStore.builderState.error).toBe('Update failed');
		});
	});

	describe('reorderServiceSongs', () => {
		beforeEach(() => {
			servicesStore.currentService = testService;
			const song1 = { ...testServiceSong, id: 'ss-1', order_position: 1 };
			const song2 = { ...testServiceSong, id: 'ss-2', order_position: 2 };
			servicesStore.currentServiceSongs = [song1, song2];
		});

		it('should reorder service songs successfully', async () => {
			const songOrder = [
				{ id: 'ss-2', position: 1 },
				{ id: 'ss-1', position: 2 }
			];
			mockPb.collection('service_songs').update.mockResolvedValue(undefined);

			await servicesStore.reorderServiceSongs(songOrder);

			expect(servicesStore.currentServiceSongs[0].order_position).toBe(1);
			expect(servicesStore.currentServiceSongs[0].id).toBe('ss-2');
			expect(servicesStore.currentServiceSongs[1].order_position).toBe(2);
			expect(servicesStore.currentServiceSongs[1].id).toBe('ss-1');
			expect(servicesStore.builderState.isDirty).toBe(true);
			expect(mockPb.collection('service_songs').update).toHaveBeenCalledWith(
				'ss-2',
				{ order_position: 1 }
			);
			expect(mockPb.collection('service_songs').update).toHaveBeenCalledWith(
				'ss-1',
				{ order_position: 2 }
			);
			expect(mockPb.collection('service_songs').update).toHaveBeenCalledTimes(2);
		});

		it('should do nothing when no current service', async () => {
			servicesStore.currentService = null;

			await servicesStore.reorderServiceSongs([]);

			expect(mockPb.collection('service_songs').update).not.toHaveBeenCalled();
		});

		it('should handle errors when reordering songs', async () => {
			const songOrder = [{ id: 'ss-1', position: 1 }];
			const error = new Error('Reorder failed');
			mockPb.collection('service_songs').update.mockRejectedValue(error);

			await expect(servicesStore.reorderServiceSongs(songOrder)).rejects.toThrow('Reorder failed');

			expect(servicesStore.builderState.error).toBe('Reorder failed');
		});
	});

	describe('duplicateService', () => {
		it('should duplicate service successfully', async () => {
			// Auth context is already set in beforeEach

			const newData = { title: 'Duplicated Service', service_date: new Date().toISOString() };
			const duplicatedService = { ...testService, id: 'service-2', name: 'Duplicated Service' };
			mockPb.collection('services').create.mockResolvedValue(duplicatedService);

			const result = await servicesStore.duplicateService('service-1', newData);

			expect(result).toEqual(duplicatedService);
			expect(servicesStore.services).toEqual([duplicatedService]);
			expect(mockPb.collection('services').create).toHaveBeenCalledWith(
			expect.objectContaining({
				title: expect.stringContaining('Duplicated Service'),
				church_id: 'church-1',
				created_by: 'user-1',
				status: 'draft'
			})
		);
		});

		it('should handle errors when duplicating service', async () => {
			const error = new Error('Duplicate failed');
			mockPb.collection('services').create.mockRejectedValue(error);

			await expect(servicesStore.duplicateService('service-1')).rejects.toThrow('Duplicate failed');

			expect(servicesStore.error).toBe('Duplicate failed');
		});
	});

	describe('completeService', () => {
		beforeEach(() => {
			servicesStore.services = [testService];
			servicesStore.currentService = testService;
		});

		it('should complete service successfully', async () => {
			// Auth context is already set in beforeEach

			const completedService = { ...testService, status: 'completed', actual_duration: 3500 };
			mockPb.collection('services').update.mockResolvedValue(completedService);
			mockPb.collection('song_usage').create.mockResolvedValue({});

			await servicesStore.completeService('service-1', 3500);

			expect(servicesStore.services[0]).toEqual(completedService);
			expect(servicesStore.currentService).toEqual(completedService);
			expect(servicesStore.builderState.service).toEqual(completedService);
			expect(mockPb.collection('services').update).toHaveBeenCalledWith('service-1', {
			status: 'completed',
			actual_duration: 3500
		});
		});

		it('should handle errors when completing service', async () => {
			const error = new Error('Complete failed');
			mockPb.collection('services').update.mockRejectedValue(error);

			await expect(servicesStore.completeService('service-1')).rejects.toThrow('Complete failed');

			expect(servicesStore.error).toBe('Complete failed');
		});
	});

	describe('checkSongAvailability', () => {
		it('should return availability map for song IDs', async () => {
			const songIds = ['song-1', 'song-2'];

			const result = await servicesStore.checkSongAvailability(songIds);

			expect(result.size).toBe(2);
			expect(result.get('song-1')).toEqual({
				songId: 'song-1',
				status: 'available',
				message: 'Available for use'
			});
			expect(result.get('song-2')).toEqual({
				songId: 'song-2',
				status: 'available',
				message: 'Available for use'
			});
		});
	});

	describe('filtering and search', () => {
		it('should apply filters and reload services', async () => {
			const newFilters = { search: 'test', status: 'planned' as const };
			mockPb.collection('services').getFullList.mockResolvedValue([testService]);

			await servicesStore.applyFilters(newFilters);

			expect(servicesStore.filters).toEqual({
				search: 'test',
				status: 'planned',
				sort: '-service_date'
			});
			expect(mockPb.collection('services').getFullList).toHaveBeenCalledWith(
				expect.objectContaining({
					expand: expect.any(String),
					filter: expect.stringContaining('test'),
					sort: '-service_date'
				})
			);
		});

		it('should clear filters and reload services', async () => {
			servicesStore.filters = { search: 'test', status: 'planned', sort: 'name' };
			mockPb.collection('services').getFullList.mockResolvedValue([testService]);

			await servicesStore.clearFilters();

			expect(servicesStore.filters).toEqual({
				search: '',
				status: undefined,
				sort: '-service_date'
			});
			expect(mockPb.collection('services').getFullList).toHaveBeenCalledWith(
				expect.objectContaining({
					expand: expect.any(String),
					sort: '-service_date'
				})
			);
		});

		it('should search services', async () => {
			mockPb.collection('services').getFullList.mockResolvedValue([testService]);

			await servicesStore.searchServices('worship');

			expect(servicesStore.filters.search).toBe('worship');
			expect(mockPb.collection('services').getFullList).toHaveBeenCalledWith(
				expect.objectContaining({
					expand: expect.any(String),
					filter: expect.stringContaining('worship'),
					sort: '-service_date'
				})
			);
		});
	});

	describe('builder state management', () => {
		it('should clear builder state', () => {
			servicesStore.builderState.service = testService;
			servicesStore.builderState.songs = [testServiceSong];
			servicesStore.builderState.isDirty = true;
			servicesStore.builderState.draggedSong = testSong;
			servicesStore.builderState.selectedSongs = ['song-1'];

			servicesStore.clearBuilderState();

			expect(servicesStore.builderState).toEqual({
				service: null,
				songs: [],
				isLoading: false,
				isDirty: false,
				error: null,
				draggedSong: null,
				selectedSongs: []
			});
		});

		it('should set and clear dragged song', () => {
			servicesStore.setDraggedSong(testSong);
			expect(servicesStore.builderState.draggedSong).toEqual(testSong);

			servicesStore.clearDraggedSong();
			expect(servicesStore.builderState.draggedSong).toBe(null);
		});

		it('should toggle song selection', () => {
			servicesStore.toggleSongSelection('song-1');
			expect(servicesStore.builderState.selectedSongs).toEqual(['song-1']);

			servicesStore.toggleSongSelection('song-2');
			expect(servicesStore.builderState.selectedSongs).toEqual(['song-1', 'song-2']);

			servicesStore.toggleSongSelection('song-1');
			expect(servicesStore.builderState.selectedSongs).toEqual(['song-2']);
		});

		it('should clear song selections', () => {
			servicesStore.builderState.selectedSongs = ['song-1', 'song-2'];

			servicesStore.clearSongSelections();

			expect(servicesStore.builderState.selectedSongs).toEqual([]);
		});

		it('should mark dirty and clean', () => {
			servicesStore.markDirty();
			expect(servicesStore.builderState.isDirty).toBe(true);

			servicesStore.markClean();
			expect(servicesStore.builderState.isDirty).toBe(false);
		});
	});

	describe('derived values', () => {
		it('should calculate current service duration', () => {
			servicesStore.currentServiceSongs = [
				{ ...testServiceSong, duration_override: 300 },
				{
					...testServiceSong,
					id: 'ss-2',
					duration_override: undefined,
					expand: { song_id: { duration_seconds: 240 } as Song }
				}
			];

			expect(servicesStore.currentServiceDuration).toBe(540);
		});

		// Note: hasUnsavedChanges derived test skipped as $derived() doesn't work in Node.js environment
	});

	describe('error handling', () => {
		it('should clear error state', () => {
			servicesStore.error = 'Test error';
			servicesStore.builderState.error = 'Builder error';

			servicesStore.clearError();

			expect(servicesStore.error).toBe(null);
			expect(servicesStore.builderState.error).toBe(null);
		});

		it('should handle unknown error types', async () => {
			mockPb.collection('services').getFullList.mockRejectedValue('String error');

			await servicesStore.loadServices();

			expect(servicesStore.error).toBe('An unexpected error occurred');
		});
	});

	describe('real-time subscriptions', () => {
		it('should subscribe to services and handle create events', async () => {
			const unsubscribe = vi.fn();
			let eventHandler: (data: unknown) => void;

			mockPb.collection('services').subscribe.mockImplementation(async (topic: string, handler: any) => {
				eventHandler = handler;
				return unsubscribe;
			});

			const result = await servicesStore.subscribeToServices();

			expect(result).toBe(unsubscribe);
			expect(mockPb.collection('services').subscribe).toHaveBeenCalled();

			// Test create event
			const newService = { ...testService, id: 'service-2' };
			eventHandler!({ action: 'create', record: newService });

			expect(servicesStore.services).toEqual([newService]);
		});

		it('should handle service update events', async () => {
			servicesStore.services = [testService];
			servicesStore.currentService = testService;

			let eventHandler: (data: unknown) => void;
			mockPb
				.collection('services')
				.subscribe.mockImplementation(async (topic: string, handler: (data: unknown) => void) => {
					eventHandler = handler;
					return vi.fn();
				});

			await servicesStore.subscribeToServices();

			const updatedService = { ...testService, name: 'Updated' };
			eventHandler!({ action: 'update', record: updatedService });

			expect(servicesStore.services[0]).toEqual(updatedService);
			expect(servicesStore.currentService).toEqual(updatedService);
			expect(servicesStore.builderState.service).toEqual(updatedService);
		});

		it('should handle service delete events', async () => {
			servicesStore.services = [testService];
			servicesStore.currentService = testService;

			let eventHandler: (data: unknown) => void;
			mockPb
				.collection('services')
				.subscribe.mockImplementation(async (topic: string, handler: (data: unknown) => void) => {
					eventHandler = handler;
					return vi.fn();
				});

			await servicesStore.subscribeToServices();

			eventHandler!({ action: 'delete', record: { id: 'service-1' } });

			expect(servicesStore.services).toEqual([]);
			expect(servicesStore.currentService).toBe(null);
			expect(servicesStore.currentServiceSongs).toEqual([]);
		});

		it('should subscribe to service songs and handle events', async () => {
			servicesStore.currentServiceSongs = [];

			let eventHandler!: (data: unknown) => void;
			mockPb
				.collection('service_songs')
				.subscribe.mockImplementation((serviceId: string, handler: (data: unknown) => void) => {
					eventHandler = handler;
					return Promise.resolve(vi.fn());
				});

			await servicesStore.subscribeToServiceSongs('service-1');

			// Test create event
			eventHandler!({ action: 'create', record: testServiceSong });
			expect(servicesStore.currentServiceSongs).toEqual([testServiceSong]);
			expect(servicesStore.builderState.songs).toEqual([testServiceSong]);

			// Test update event
			const updatedSong = { ...testServiceSong, key_signature: 'D' };
			eventHandler!({ action: 'update', record: updatedSong });
			expect(servicesStore.currentServiceSongs[0]).toEqual(updatedSong);

			// Test delete event
			eventHandler!({ action: 'delete', record: { id: 'service-song-1' } });
			expect(servicesStore.currentServiceSongs).toEqual([]);
		});
	});
});
