import { describe, it, expect, beforeEach, vi, type MockedFunction } from 'vitest';
import { servicesStore } from './services.svelte';
import { servicesApi } from '$lib/api/services';
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

// Mock the services API
vi.mock('$lib/api/services', () => ({
	servicesApi: {
		getServices: vi.fn(),
		getUpcomingServices: vi.fn(),
		getTemplates: vi.fn(),
		getService: vi.fn(),
		getServiceSongs: vi.fn(),
		createService: vi.fn(),
		updateService: vi.fn(),
		deleteService: vi.fn(),
		addSongToService: vi.fn(),
		removeSongFromService: vi.fn(),
		updateServiceSong: vi.fn(),
		reorderServiceSongs: vi.fn(),
		duplicateService: vi.fn(),
		completeService: vi.fn(),
		subscribeToServices: vi.fn(),
		subscribeToServiceSongs: vi.fn()
	}
}));

const mockedServicesApi = servicesApi as {
	getServices: MockedFunction<any>;
	getUpcomingServices: MockedFunction<any>;
	getTemplates: MockedFunction<any>;
	getService: MockedFunction<any>;
	getServiceSongs: MockedFunction<any>;
	createService: MockedFunction<any>;
	updateService: MockedFunction<any>;
	deleteService: MockedFunction<any>;
	addSongToService: MockedFunction<any>;
	removeSongFromService: MockedFunction<any>;
	updateServiceSong: MockedFunction<any>;
	reorderServiceSongs: MockedFunction<any>;
	duplicateService: MockedFunction<any>;
	completeService: MockedFunction<any>;
	subscribeToServices: MockedFunction<any>;
	subscribeToServiceSongs: MockedFunction<any>;
};

describe('ServicesStore', () => {
	const mockService: Service = {
		id: 'service-1',
		church_id: 'church-1',
		name: 'Sunday Morning Service',
		theme: 'Worship',
		service_date: '2024-01-07T10:00:00Z',
		status: 'planned',
		estimated_duration: 3600,
		actual_duration: null,
		notes: 'Test service',
		is_template: false,
		created: '2024-01-01T00:00:00Z',
		updated: '2024-01-01T00:00:00Z'
	};

	const mockServiceSong: ServiceSong = {
		id: 'service-song-1',
		service_id: 'service-1',
		song_id: 'song-1',
		order_position: 1,
		key_signature: 'C',
		tempo_bpm: 120,
		duration_override: 240,
		notes: 'Intro song',
		created: '2024-01-01T00:00:00Z',
		updated: '2024-01-01T00:00:00Z',
		expand: {
			song_id: {
				id: 'song-1',
				title: 'Amazing Grace',
				artist: 'Traditional',
				duration_seconds: 240
			} as Song
		}
	};

	const mockSong: Song = {
		id: 'song-1',
		church_id: 'church-1',
		title: 'Amazing Grace',
		artist: 'Traditional',
		key_signature: 'C',
		tempo_bpm: 120,
		duration_seconds: 240,
		ccli_number: '12345',
		copyright_year: 1779,
		themes: ['worship', 'grace'],
		labels: ['classic'],
		notes: 'Traditional hymn',
		files: [],
		created: '2024-01-01T00:00:00Z',
		updated: '2024-01-01T00:00:00Z'
	};

	beforeEach(() => {
		// Reset the store state
		servicesStore.services = [];
		servicesStore.loading = false;
		servicesStore.error = null;
		servicesStore.currentService = null;
		servicesStore.currentServiceSongs = [];
		servicesStore.templates = [];
		servicesStore.upcomingServices = [];
		servicesStore.filters = {
			search: '',
			status: undefined,
			sort: '-service_date'
		};
		servicesStore.clearBuilderState();

		// Reset all mocks
		vi.clearAllMocks();
	});

	describe('loadServices', () => {
		it('should load services successfully', async () => {
			const services = [mockService];
			mockedServicesApi.getServices.mockResolvedValue(services);

			await servicesStore.loadServices();

			expect(servicesStore.services).toEqual(services);
			expect(servicesStore.loading).toBe(false);
			expect(servicesStore.error).toBe(null);
			expect(mockedServicesApi.getServices).toHaveBeenCalledWith(servicesStore.filters);
		});

		it('should handle loading state correctly', async () => {
			mockedServicesApi.getServices.mockImplementation(async () => {
				expect(servicesStore.loading).toBe(true);
				return [mockService];
			});

			await servicesStore.loadServices();

			expect(servicesStore.loading).toBe(false);
		});

		it('should handle errors when loading services', async () => {
			const error = new Error('Network error');
			mockedServicesApi.getServices.mockRejectedValue(error);

			await servicesStore.loadServices();

			expect(servicesStore.services).toEqual([]);
			expect(servicesStore.loading).toBe(false);
			expect(servicesStore.error).toBe('Network error');
		});
	});

	describe('loadUpcomingServices', () => {
		it('should load upcoming services with default limit', async () => {
			const services = [mockService];
			mockedServicesApi.getUpcomingServices.mockResolvedValue(services);

			await servicesStore.loadUpcomingServices();

			expect(servicesStore.upcomingServices).toEqual(services);
			expect(mockedServicesApi.getUpcomingServices).toHaveBeenCalledWith(10);
		});

		it('should handle errors silently when loading upcoming services', async () => {
			const error = new Error('Network error');
			mockedServicesApi.getUpcomingServices.mockRejectedValue(error);

			await servicesStore.loadUpcomingServices();

			expect(servicesStore.upcomingServices).toEqual([]);
		});
	});

	describe('loadTemplates', () => {
		it('should load templates successfully', async () => {
			const templates = [{ ...mockService, is_template: true }];
			mockedServicesApi.getTemplates.mockResolvedValue(templates);

			await servicesStore.loadTemplates();

			expect(servicesStore.templates).toEqual(templates);
		});
	});

	describe('loadService', () => {
		it('should load service and songs successfully', async () => {
			const songs = [mockServiceSong];
			mockedServicesApi.getService.mockResolvedValue(mockService);
			mockedServicesApi.getServiceSongs.mockResolvedValue(songs);

			await servicesStore.loadService('service-1');

			expect(servicesStore.currentService).toEqual(mockService);
			expect(servicesStore.currentServiceSongs).toEqual(songs);
			expect(servicesStore.builderState.service).toEqual(mockService);
			expect(servicesStore.builderState.songs).toEqual(songs);
			expect(servicesStore.builderState.isDirty).toBe(false);
			expect(servicesStore.loading).toBe(false);
			expect(servicesStore.error).toBe(null);
		});

		it('should handle errors when loading service', async () => {
			const error = new Error('Service not found');
			mockedServicesApi.getService.mockRejectedValue(error);

			await servicesStore.loadService('invalid-id');

			expect(servicesStore.currentService).toBe(null);
			expect(servicesStore.currentServiceSongs).toEqual([]);
			expect(servicesStore.loading).toBe(false);
			expect(servicesStore.error).toBe('Service not found');
		});
	});

	describe('createService', () => {
		it('should create service successfully', async () => {
			const createData: CreateServiceData = {
				church_id: 'church-1',
				name: 'New Service',
				theme: 'Praise',
				service_date: '2024-01-14T10:00:00Z',
				estimated_duration: 3600
			};
			mockedServicesApi.createService.mockResolvedValue(mockService);

			const result = await servicesStore.createService(createData);

			expect(result).toEqual(mockService);
			expect(servicesStore.services).toEqual([mockService]);
			expect(servicesStore.loading).toBe(false);
			expect(servicesStore.error).toBe(null);
			expect(mockedServicesApi.createService).toHaveBeenCalledWith(createData);
		});

		it('should handle errors when creating service', async () => {
			const createData: CreateServiceData = {
				church_id: 'church-1',
				name: 'New Service',
				theme: 'Praise',
				service_date: '2024-01-14T10:00:00Z',
				estimated_duration: 3600
			};
			const error = new Error('Validation failed');
			mockedServicesApi.createService.mockRejectedValue(error);

			await expect(servicesStore.createService(createData)).rejects.toThrow('Validation failed');

			expect(servicesStore.services).toEqual([]);
			expect(servicesStore.loading).toBe(false);
			expect(servicesStore.error).toBe('Validation failed');
		});
	});

	describe('updateService', () => {
		beforeEach(() => {
			servicesStore.services = [mockService];
			servicesStore.currentService = mockService;
			servicesStore.builderState.service = mockService;
		});

		it('should update service successfully', async () => {
			const updateData: UpdateServiceData = { name: 'Updated Service' };
			const updatedService = { ...mockService, name: 'Updated Service' };
			mockedServicesApi.updateService.mockResolvedValue(updatedService);

			const result = await servicesStore.updateService('service-1', updateData);

			expect(result).toEqual(updatedService);
			expect(servicesStore.services[0]).toEqual(updatedService);
			expect(servicesStore.currentService).toEqual(updatedService);
			expect(servicesStore.builderState.service).toEqual(updatedService);
			expect(mockedServicesApi.updateService).toHaveBeenCalledWith('service-1', updateData);
		});

		it('should handle updating non-existent service in local array', async () => {
			const updateData: UpdateServiceData = { name: 'Updated Service' };
			const updatedService = { ...mockService, id: 'different-id', name: 'Updated Service' };
			mockedServicesApi.updateService.mockResolvedValue(updatedService);

			const result = await servicesStore.updateService('different-id', updateData);

			expect(result).toEqual(updatedService);
			expect(servicesStore.services[0]).toEqual(mockService); // Original unchanged
		});

		it('should handle errors when updating service', async () => {
			const updateData: UpdateServiceData = { name: 'Updated Service' };
			const error = new Error('Update failed');
			mockedServicesApi.updateService.mockRejectedValue(error);

			await expect(servicesStore.updateService('service-1', updateData)).rejects.toThrow(
				'Update failed'
			);

			expect(servicesStore.services[0]).toEqual(mockService); // Unchanged
			expect(servicesStore.error).toBe('Update failed');
		});
	});

	describe('deleteService', () => {
		beforeEach(() => {
			servicesStore.services = [mockService];
			servicesStore.currentService = mockService;
			servicesStore.currentServiceSongs = [mockServiceSong];
		});

		it('should delete service successfully', async () => {
			mockedServicesApi.deleteService.mockResolvedValue(undefined);

			await servicesStore.deleteService('service-1');

			expect(servicesStore.services).toEqual([]);
			expect(servicesStore.currentService).toBe(null);
			expect(servicesStore.currentServiceSongs).toEqual([]);
			expect(servicesStore.builderState.service).toBe(null);
			expect(mockedServicesApi.deleteService).toHaveBeenCalledWith('service-1');
		});

		it('should handle deleting non-current service', async () => {
			const otherService = { ...mockService, id: 'service-2' };
			servicesStore.services = [mockService, otherService];
			mockedServicesApi.deleteService.mockResolvedValue(undefined);

			await servicesStore.deleteService('service-2');

			expect(servicesStore.services).toEqual([mockService]);
			expect(servicesStore.currentService).toEqual(mockService); // Unchanged
		});

		it('should handle errors when deleting service', async () => {
			const error = new Error('Delete failed');
			mockedServicesApi.deleteService.mockRejectedValue(error);

			await expect(servicesStore.deleteService('service-1')).rejects.toThrow('Delete failed');

			expect(servicesStore.services).toEqual([mockService]); // Unchanged
			expect(servicesStore.error).toBe('Delete failed');
		});
	});

	describe('addSongToService', () => {
		beforeEach(() => {
			servicesStore.currentService = mockService;
			servicesStore.currentServiceSongs = [];
		});

		it('should add song to service successfully', async () => {
			const songData: AddSongToServiceData = {
				song_id: 'song-1',
				order_position: 1,
				key_signature: 'C',
				tempo_bpm: 120
			};
			mockedServicesApi.addSongToService.mockResolvedValue(mockServiceSong);

			await servicesStore.addSongToService(songData);

			expect(servicesStore.currentServiceSongs).toEqual([mockServiceSong]);
			expect(servicesStore.builderState.songs).toEqual([mockServiceSong]);
			expect(servicesStore.builderState.isDirty).toBe(true);
			expect(servicesStore.builderState.isLoading).toBe(false);
			expect(mockedServicesApi.addSongToService).toHaveBeenCalledWith({
				...songData,
				service_id: 'service-1'
			});
		});

		it('should sort songs by order position', async () => {
			const song1 = { ...mockServiceSong, id: 'ss-1', order_position: 2 };
			const song2 = { ...mockServiceSong, id: 'ss-2', order_position: 1 };

			servicesStore.currentServiceSongs = [song1];
			mockedServicesApi.addSongToService.mockResolvedValue(song2);

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
			mockedServicesApi.addSongToService.mockRejectedValue(error);

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
			servicesStore.currentServiceSongs = [mockServiceSong];
			servicesStore.builderState.songs = [mockServiceSong];
		});

		it('should remove song from service successfully', async () => {
			mockedServicesApi.removeSongFromService.mockResolvedValue(undefined);

			await servicesStore.removeSongFromService('service-song-1');

			expect(servicesStore.currentServiceSongs).toEqual([]);
			expect(servicesStore.builderState.songs).toEqual([]);
			expect(servicesStore.builderState.isDirty).toBe(true);
			expect(mockedServicesApi.removeSongFromService).toHaveBeenCalledWith('service-song-1');
		});

		it('should handle errors when removing song from service', async () => {
			const error = new Error('Remove failed');
			mockedServicesApi.removeSongFromService.mockRejectedValue(error);

			await expect(servicesStore.removeSongFromService('service-song-1')).rejects.toThrow(
				'Remove failed'
			);

			expect(servicesStore.currentServiceSongs).toEqual([mockServiceSong]); // Unchanged
			expect(servicesStore.builderState.error).toBe('Remove failed');
		});
	});

	describe('updateServiceSong', () => {
		beforeEach(() => {
			servicesStore.currentServiceSongs = [mockServiceSong];
		});

		it('should update service song successfully', async () => {
			const updateData: UpdateServiceSongData = { key_signature: 'D' };
			const updatedSong = { ...mockServiceSong, key_signature: 'D' };
			mockedServicesApi.updateServiceSong.mockResolvedValue(updatedSong);

			await servicesStore.updateServiceSong('service-song-1', updateData);

			expect(servicesStore.currentServiceSongs[0]).toEqual(updatedSong);
			expect(servicesStore.builderState.songs[0]).toEqual(updatedSong);
			expect(servicesStore.builderState.isDirty).toBe(true);
			expect(mockedServicesApi.updateServiceSong).toHaveBeenCalledWith(
				'service-song-1',
				updateData
			);
		});

		it('should handle updating non-existent service song', async () => {
			const updateData: UpdateServiceSongData = { key_signature: 'D' };
			const updatedSong = { ...mockServiceSong, id: 'different-id', key_signature: 'D' };
			mockedServicesApi.updateServiceSong.mockResolvedValue(updatedSong);

			await servicesStore.updateServiceSong('different-id', updateData);

			expect(servicesStore.currentServiceSongs[0]).toEqual(mockServiceSong); // Unchanged
		});

		it('should handle errors when updating service song', async () => {
			const updateData: UpdateServiceSongData = { key_signature: 'D' };
			const error = new Error('Update failed');
			mockedServicesApi.updateServiceSong.mockRejectedValue(error);

			await expect(servicesStore.updateServiceSong('service-song-1', updateData)).rejects.toThrow(
				'Update failed'
			);

			expect(servicesStore.builderState.error).toBe('Update failed');
		});
	});

	describe('reorderServiceSongs', () => {
		beforeEach(() => {
			servicesStore.currentService = mockService;
			const song1 = { ...mockServiceSong, id: 'ss-1', order_position: 1 };
			const song2 = { ...mockServiceSong, id: 'ss-2', order_position: 2 };
			servicesStore.currentServiceSongs = [song1, song2];
		});

		it('should reorder service songs successfully', async () => {
			const songOrder = [
				{ id: 'ss-2', position: 1 },
				{ id: 'ss-1', position: 2 }
			];
			mockedServicesApi.reorderServiceSongs.mockResolvedValue(undefined);

			await servicesStore.reorderServiceSongs(songOrder);

			expect(servicesStore.currentServiceSongs[0].order_position).toBe(1);
			expect(servicesStore.currentServiceSongs[0].id).toBe('ss-2');
			expect(servicesStore.currentServiceSongs[1].order_position).toBe(2);
			expect(servicesStore.currentServiceSongs[1].id).toBe('ss-1');
			expect(servicesStore.builderState.isDirty).toBe(true);
			expect(mockedServicesApi.reorderServiceSongs).toHaveBeenCalledWith('service-1', songOrder);
		});

		it('should do nothing when no current service', async () => {
			servicesStore.currentService = null;

			await servicesStore.reorderServiceSongs([]);

			expect(mockedServicesApi.reorderServiceSongs).not.toHaveBeenCalled();
		});

		it('should handle errors when reordering songs', async () => {
			const songOrder = [{ id: 'ss-1', position: 1 }];
			const error = new Error('Reorder failed');
			mockedServicesApi.reorderServiceSongs.mockRejectedValue(error);

			await expect(servicesStore.reorderServiceSongs(songOrder)).rejects.toThrow('Reorder failed');

			expect(servicesStore.builderState.error).toBe('Reorder failed');
		});
	});

	describe('duplicateService', () => {
		it('should duplicate service successfully', async () => {
			const newData = { name: 'Duplicated Service' };
			const duplicatedService = { ...mockService, id: 'service-2', name: 'Duplicated Service' };
			mockedServicesApi.duplicateService.mockResolvedValue(duplicatedService);

			const result = await servicesStore.duplicateService('service-1', newData);

			expect(result).toEqual(duplicatedService);
			expect(servicesStore.services).toEqual([duplicatedService]);
			expect(mockedServicesApi.duplicateService).toHaveBeenCalledWith('service-1', newData);
		});

		it('should handle errors when duplicating service', async () => {
			const error = new Error('Duplicate failed');
			mockedServicesApi.duplicateService.mockRejectedValue(error);

			await expect(servicesStore.duplicateService('service-1')).rejects.toThrow('Duplicate failed');

			expect(servicesStore.error).toBe('Duplicate failed');
		});
	});

	describe('completeService', () => {
		beforeEach(() => {
			servicesStore.services = [mockService];
			servicesStore.currentService = mockService;
		});

		it('should complete service successfully', async () => {
			const completedService = { ...mockService, status: 'completed', actual_duration: 3500 };
			mockedServicesApi.completeService.mockResolvedValue(completedService);

			await servicesStore.completeService('service-1', 3500);

			expect(servicesStore.services[0]).toEqual(completedService);
			expect(servicesStore.currentService).toEqual(completedService);
			expect(servicesStore.builderState.service).toEqual(completedService);
			expect(mockedServicesApi.completeService).toHaveBeenCalledWith('service-1', 3500);
		});

		it('should handle errors when completing service', async () => {
			const error = new Error('Complete failed');
			mockedServicesApi.completeService.mockRejectedValue(error);

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
			mockedServicesApi.getServices.mockResolvedValue([mockService]);

			await servicesStore.applyFilters(newFilters);

			expect(servicesStore.filters).toEqual({
				search: 'test',
				status: 'planned',
				sort: '-service_date'
			});
			expect(mockedServicesApi.getServices).toHaveBeenCalledWith(servicesStore.filters);
		});

		it('should clear filters and reload services', async () => {
			servicesStore.filters = { search: 'test', status: 'planned', sort: 'name' };
			mockedServicesApi.getServices.mockResolvedValue([mockService]);

			await servicesStore.clearFilters();

			expect(servicesStore.filters).toEqual({
				search: '',
				status: undefined,
				sort: '-service_date'
			});
			expect(mockedServicesApi.getServices).toHaveBeenCalledWith(servicesStore.filters);
		});

		it('should search services', async () => {
			mockedServicesApi.getServices.mockResolvedValue([mockService]);

			await servicesStore.searchServices('worship');

			expect(servicesStore.filters.search).toBe('worship');
			expect(mockedServicesApi.getServices).toHaveBeenCalledWith(servicesStore.filters);
		});
	});

	describe('builder state management', () => {
		it('should clear builder state', () => {
			servicesStore.builderState.service = mockService;
			servicesStore.builderState.songs = [mockServiceSong];
			servicesStore.builderState.isDirty = true;
			servicesStore.builderState.draggedSong = mockSong;
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
			servicesStore.setDraggedSong(mockSong);
			expect(servicesStore.builderState.draggedSong).toEqual(mockSong);

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
				{ ...mockServiceSong, duration_override: 300 },
				{
					...mockServiceSong,
					id: 'ss-2',
					duration_override: null,
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
			mockedServicesApi.getServices.mockRejectedValue('String error');

			await servicesStore.loadServices();

			expect(servicesStore.error).toBe('An unexpected error occurred');
		});
	});

	describe('real-time subscriptions', () => {
		it('should subscribe to services and handle create events', async () => {
			const unsubscribe = vi.fn();
			let eventHandler: (data: unknown) => void;

			mockedServicesApi.subscribeToServices.mockImplementation((handler) => {
				eventHandler = handler;
				return Promise.resolve(unsubscribe);
			});

			const result = await servicesStore.subscribeToServices();

			expect(result).toBe(unsubscribe);
			expect(mockedServicesApi.subscribeToServices).toHaveBeenCalled();

			// Test create event
			const newService = { ...mockService, id: 'service-2' };
			eventHandler!({ action: 'create', record: newService });

			expect(servicesStore.services).toEqual([newService]);
		});

		it('should handle service update events', async () => {
			servicesStore.services = [mockService];
			servicesStore.currentService = mockService;

			let eventHandler: (data: unknown) => void;
			mockedServicesApi.subscribeToServices.mockImplementation((handler) => {
				eventHandler = handler;
				return Promise.resolve(vi.fn());
			});

			await servicesStore.subscribeToServices();

			const updatedService = { ...mockService, name: 'Updated' };
			eventHandler!({ action: 'update', record: updatedService });

			expect(servicesStore.services[0]).toEqual(updatedService);
			expect(servicesStore.currentService).toEqual(updatedService);
			expect(servicesStore.builderState.service).toEqual(updatedService);
		});

		it('should handle service delete events', async () => {
			servicesStore.services = [mockService];
			servicesStore.currentService = mockService;

			let eventHandler: (data: unknown) => void;
			mockedServicesApi.subscribeToServices.mockImplementation((handler) => {
				eventHandler = handler;
				return Promise.resolve(vi.fn());
			});

			await servicesStore.subscribeToServices();

			eventHandler!({ action: 'delete', record: { id: 'service-1' } });

			expect(servicesStore.services).toEqual([]);
			expect(servicesStore.currentService).toBe(null);
			expect(servicesStore.currentServiceSongs).toEqual([]);
		});

		it('should subscribe to service songs and handle events', async () => {
			servicesStore.currentServiceSongs = [];

			let eventHandler: (data: unknown) => void;
			mockedServicesApi.subscribeToServiceSongs.mockImplementation((serviceId, handler) => {
				eventHandler = handler;
				return Promise.resolve(vi.fn());
			});

			await servicesStore.subscribeToServiceSongs('service-1');

			// Test create event
			eventHandler!({ action: 'create', record: mockServiceSong });
			expect(servicesStore.currentServiceSongs).toEqual([mockServiceSong]);
			expect(servicesStore.builderState.songs).toEqual([mockServiceSong]);

			// Test update event
			const updatedSong = { ...mockServiceSong, key_signature: 'D' };
			eventHandler!({ action: 'update', record: updatedSong });
			expect(servicesStore.currentServiceSongs[0]).toEqual(updatedSong);

			// Test delete event
			eventHandler!({ action: 'delete', record: { id: 'service-song-1' } });
			expect(servicesStore.currentServiceSongs).toEqual([]);
		});
	});
});
