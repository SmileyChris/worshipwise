import { servicesApi } from '$lib/api/services';
import type {
	Service,
	ServiceSong,
	CreateServiceData,
	UpdateServiceData,
	ServiceFilterOptions,
	CreateServiceSongData,
	AddSongToServiceData,
	UpdateServiceSongData,
	ServiceBuilderState,
	SongAvailability
} from '$lib/types/service';
import type { Song } from '$lib/types/song';

class ServicesStore {
	// Reactive state using Svelte 5 runes
	services = $state<Service[]>([]);
	loading = $state<boolean>(false);
	error = $state<string | null>(null);

	// Current service being edited
	currentService = $state<Service | null>(null);
	currentServiceSongs = $state<ServiceSong[]>([]);

	// Filter state
	filters = $state<ServiceFilterOptions>({
		search: '',
		status: undefined,
		sort: '-service_date'
	});

	// Templates
	templates = $state<Service[]>([]);

	// Upcoming services
	upcomingServices = $state<Service[]>([]);

	// Builder state
	builderState = $state<ServiceBuilderState>({
		service: null,
		songs: [],
		isLoading: false,
		isDirty: false,
		error: null,
		draggedSong: null,
		selectedSongs: []
	});

	// Derived computed values
	filteredServicesCount = $derived(this.services.length);
	currentServiceDuration = $derived.by(() => {
		return this.currentServiceSongs.reduce((total, song) => {
			return total + (song.duration_override || song.expand?.song_id?.duration_seconds || 0);
		}, 0);
	});

	hasUnsavedChanges = $derived(this.builderState.isDirty);

	/**
	 * Load services with current filters
	 */
	async loadServices(): Promise<void> {
		this.loading = true;
		this.error = null;

		try {
			this.services = await servicesApi.getServices(this.filters);
		} catch (error: any) {
			console.error('Failed to load services:', error);
			this.error = this.getErrorMessage(error);
		} finally {
			this.loading = false;
		}
	}

	/**
	 * Load upcoming services
	 */
	async loadUpcomingServices(limit = 10): Promise<void> {
		try {
			this.upcomingServices = await servicesApi.getUpcomingServices(limit);
		} catch (error: any) {
			console.error('Failed to load upcoming services:', error);
		}
	}

	/**
	 * Load service templates
	 */
	async loadTemplates(): Promise<void> {
		try {
			this.templates = await servicesApi.getTemplates();
		} catch (error: any) {
			console.error('Failed to load templates:', error);
		}
	}

	/**
	 * Load a specific service with its songs
	 */
	async loadService(id: string): Promise<void> {
		this.loading = true;
		this.error = null;

		try {
			const [service, songs] = await Promise.all([
				servicesApi.getService(id),
				servicesApi.getServiceSongs(id)
			]);

			this.currentService = service;
			this.currentServiceSongs = songs;

			// Update builder state
			this.builderState.service = service;
			this.builderState.songs = songs;
			this.builderState.isDirty = false;
		} catch (error: any) {
			console.error('Failed to load service:', error);
			this.error = this.getErrorMessage(error);
		} finally {
			this.loading = false;
		}
	}

	/**
	 * Create a new service
	 */
	async createService(data: CreateServiceData): Promise<Service> {
		this.loading = true;
		this.error = null;

		try {
			const newService = await servicesApi.createService(data);

			// Add to local array
			this.services = [newService, ...this.services];

			return newService;
		} catch (error: any) {
			console.error('Failed to create service:', error);
			this.error = this.getErrorMessage(error);
			throw error;
		} finally {
			this.loading = false;
		}
	}

	/**
	 * Update an existing service
	 */
	async updateService(id: string, data: UpdateServiceData): Promise<Service> {
		this.loading = true;
		this.error = null;

		try {
			const updatedService = await servicesApi.updateService(id, data);

			// Update in local array
			const index = this.services.findIndex((service) => service.id === id);
			if (index !== -1) {
				this.services[index] = updatedService;
			}

			// Update current service if it's the one being edited
			if (this.currentService?.id === id) {
				this.currentService = updatedService;
				this.builderState.service = updatedService;
			}

			return updatedService;
		} catch (error: any) {
			console.error('Failed to update service:', error);
			this.error = this.getErrorMessage(error);
			throw error;
		} finally {
			this.loading = false;
		}
	}

	/**
	 * Delete a service
	 */
	async deleteService(id: string): Promise<void> {
		this.loading = true;
		this.error = null;

		try {
			await servicesApi.deleteService(id);

			// Remove from local array
			this.services = this.services.filter((service) => service.id !== id);

			// Clear current service if it was deleted
			if (this.currentService?.id === id) {
				this.currentService = null;
				this.currentServiceSongs = [];
				this.clearBuilderState();
			}
		} catch (error: any) {
			console.error('Failed to delete service:', error);
			this.error = this.getErrorMessage(error);
			throw error;
		} finally {
			this.loading = false;
		}
	}

	/**
	 * Add a song to the current service
	 */
	async addSongToService(songData: AddSongToServiceData): Promise<void> {
		if (!this.currentService) {
			throw new Error('No service selected');
		}

		this.builderState.isLoading = true;
		this.builderState.error = null;

		try {
			const serviceSong = await servicesApi.addSongToService({
				...songData,
				service_id: this.currentService.id
			});

			// Add to local array
			this.currentServiceSongs = [...this.currentServiceSongs, serviceSong].sort(
				(a, b) => a.order_position - b.order_position
			);

			// Update builder state
			this.builderState.songs = this.currentServiceSongs;
			this.builderState.isDirty = true;
		} catch (error: any) {
			console.error('Failed to add song to service:', error);
			this.builderState.error = this.getErrorMessage(error);
			throw error;
		} finally {
			this.builderState.isLoading = false;
		}
	}

	/**
	 * Remove a song from the current service
	 */
	async removeSongFromService(serviceSongId: string): Promise<void> {
		this.builderState.isLoading = true;
		this.builderState.error = null;

		try {
			await servicesApi.removeSongFromService(serviceSongId);

			// Remove from local array
			this.currentServiceSongs = this.currentServiceSongs.filter(
				(song) => song.id !== serviceSongId
			);

			// Update builder state
			this.builderState.songs = this.currentServiceSongs;
			this.builderState.isDirty = true;
		} catch (error: any) {
			console.error('Failed to remove song from service:', error);
			this.builderState.error = this.getErrorMessage(error);
			throw error;
		} finally {
			this.builderState.isLoading = false;
		}
	}

	/**
	 * Update a song in the service
	 */
	async updateServiceSong(id: string, data: UpdateServiceSongData): Promise<void> {
		this.builderState.isLoading = true;
		this.builderState.error = null;

		try {
			const updatedSong = await servicesApi.updateServiceSong(id, data);

			// Update in local array
			const index = this.currentServiceSongs.findIndex((song) => song.id === id);
			if (index !== -1) {
				this.currentServiceSongs[index] = updatedSong;
			}

			// Update builder state
			this.builderState.songs = this.currentServiceSongs;
			this.builderState.isDirty = true;
		} catch (error: any) {
			console.error('Failed to update service song:', error);
			this.builderState.error = this.getErrorMessage(error);
			throw error;
		} finally {
			this.builderState.isLoading = false;
		}
	}

	/**
	 * Reorder songs in the service
	 */
	async reorderServiceSongs(songOrder: Array<{ id: string; position: number }>): Promise<void> {
		if (!this.currentService) return;

		this.builderState.isLoading = true;
		this.builderState.error = null;

		try {
			await servicesApi.reorderServiceSongs(this.currentService.id, songOrder);

			// Update local positions
			songOrder.forEach(({ id, position }) => {
				const song = this.currentServiceSongs.find((s) => s.id === id);
				if (song) {
					song.order_position = position;
				}
			});

			// Re-sort the array
			this.currentServiceSongs.sort((a, b) => a.order_position - b.order_position);

			// Update builder state
			this.builderState.songs = this.currentServiceSongs;
			this.builderState.isDirty = true;
		} catch (error: any) {
			console.error('Failed to reorder service songs:', error);
			this.builderState.error = this.getErrorMessage(error);
			throw error;
		} finally {
			this.builderState.isLoading = false;
		}
	}

	/**
	 * Duplicate a service
	 */
	async duplicateService(id: string, newData: Partial<CreateServiceData> = {}): Promise<Service> {
		this.loading = true;
		this.error = null;

		try {
			const duplicatedService = await servicesApi.duplicateService(id, newData);

			// Add to local array
			this.services = [duplicatedService, ...this.services];

			return duplicatedService;
		} catch (error: any) {
			console.error('Failed to duplicate service:', error);
			this.error = this.getErrorMessage(error);
			throw error;
		} finally {
			this.loading = false;
		}
	}

	/**
	 * Complete a service and trigger usage tracking
	 */
	async completeService(id: string, actualDuration?: number): Promise<void> {
		this.loading = true;
		this.error = null;

		try {
			const completedService = await servicesApi.completeService(id, actualDuration);

			// Update in local array
			const index = this.services.findIndex((service) => service.id === id);
			if (index !== -1) {
				this.services[index] = completedService;
			}

			// Update current service if it's the one being completed
			if (this.currentService?.id === id) {
				this.currentService = completedService;
				this.builderState.service = completedService;
			}
		} catch (error: any) {
			console.error('Failed to complete service:', error);
			this.error = this.getErrorMessage(error);
			throw error;
		} finally {
			this.loading = false;
		}
	}

	/**
	 * Check song availability based on recent usage
	 */
	async checkSongAvailability(songIds: string[]): Promise<Map<string, SongAvailability>> {
		const availabilityMap = new Map<string, SongAvailability>();

		try {
			// This would need to query the song_usage collection
			// For now, return placeholder data
			songIds.forEach((songId) => {
				availabilityMap.set(songId, {
					songId,
					status: 'available',
					message: 'Available for use'
				});
			});
		} catch (error) {
			console.error('Failed to check song availability:', error);
		}

		return availabilityMap;
	}

	/**
	 * Apply filters to services
	 */
	async applyFilters(newFilters: Partial<ServiceFilterOptions>): Promise<void> {
		this.filters = { ...this.filters, ...newFilters };
		await this.loadServices();
	}

	/**
	 * Clear all filters
	 */
	async clearFilters(): Promise<void> {
		this.filters = {
			search: '',
			status: undefined,
			sort: '-service_date'
		};
		await this.loadServices();
	}

	/**
	 * Search services
	 */
	async searchServices(query: string): Promise<void> {
		this.filters.search = query;
		await this.loadServices();
	}

	/**
	 * Clear builder state
	 */
	clearBuilderState(): void {
		this.builderState = {
			service: null,
			songs: [],
			isLoading: false,
			isDirty: false,
			error: null,
			draggedSong: null,
			selectedSongs: []
		};
	}

	/**
	 * Set drag state
	 */
	setDraggedSong(song: any): void {
		this.builderState.draggedSong = song;
	}

	/**
	 * Clear drag state
	 */
	clearDraggedSong(): void {
		this.builderState.draggedSong = null;
	}

	/**
	 * Toggle song selection
	 */
	toggleSongSelection(songId: string): void {
		const index = this.builderState.selectedSongs.indexOf(songId);
		if (index > -1) {
			this.builderState.selectedSongs.splice(index, 1);
		} else {
			this.builderState.selectedSongs.push(songId);
		}
	}

	/**
	 * Clear song selections
	 */
	clearSongSelections(): void {
		this.builderState.selectedSongs = [];
	}

	/**
	 * Mark builder as dirty
	 */
	markDirty(): void {
		this.builderState.isDirty = true;
	}

	/**
	 * Mark builder as clean
	 */
	markClean(): void {
		this.builderState.isDirty = false;
	}

	/**
	 * Get error message from API error
	 */
	private getErrorMessage(error: any): string {
		if (error?.response?.data?.message) {
			return error.response.data.message;
		}
		if (error?.message) {
			return error.message;
		}
		return 'An unexpected error occurred';
	}

	/**
	 * Clear error state
	 */
	clearError(): void {
		this.error = null;
		this.builderState.error = null;
	}

	/**
	 * Subscribe to real-time updates for services
	 */
	async subscribeToServices(): Promise<() => void> {
		return await servicesApi.subscribeToServices((data: unknown) => {
			console.log('Real-time service update:', data);

			// Type-safe access to event data
			const eventData = data as { action: string; record: { id: string } & Record<string, any> };

			if (eventData.action === 'create') {
				this.services = [eventData.record as unknown as Service, ...this.services];
			} else if (eventData.action === 'update') {
				const index = this.services.findIndex((s) => s.id === eventData.record.id);
				if (index !== -1) {
					this.services[index] = eventData.record as unknown as Service;
				}

				// Update current service if it's the one being updated
				if (this.currentService?.id === eventData.record.id) {
					this.currentService = eventData.record as unknown as Service;
					this.builderState.service = this.currentService;
				}
			} else if (eventData.action === 'delete') {
				this.services = this.services.filter((s) => s.id !== eventData.record.id);

				// Clear current service if it was deleted
				if (this.currentService?.id === eventData.record.id) {
					this.currentService = null;
					this.currentServiceSongs = [];
					this.clearBuilderState();
				}
			}
		});
	}

	/**
	 * Subscribe to real-time updates for service songs
	 */
	async subscribeToServiceSongs(serviceId: string): Promise<() => void> {
		return await servicesApi.subscribeToServiceSongs(serviceId, (data: unknown) => {
			console.log('Real-time service song update:', data);

			// Type-safe access to event data
			const eventData = data as { action: string; record: { id: string } & Record<string, any> };

			if (eventData.action === 'create') {
				const newSong = eventData.record as unknown as ServiceSong;
				this.currentServiceSongs = [...this.currentServiceSongs, newSong].sort(
					(a, b) => a.order_position - b.order_position
				);
				this.builderState.songs = this.currentServiceSongs;
			} else if (eventData.action === 'update') {
				const index = this.currentServiceSongs.findIndex((s) => s.id === eventData.record.id);
				if (index !== -1) {
					this.currentServiceSongs[index] = eventData.record as unknown as ServiceSong;
					this.builderState.songs = this.currentServiceSongs;
				}
			} else if (eventData.action === 'delete') {
				this.currentServiceSongs = this.currentServiceSongs.filter(
					(s) => s.id !== eventData.record.id
				);
				this.builderState.songs = this.currentServiceSongs;
			}
		});
	}
}

// Export singleton instance
export const servicesStore = new ServicesStore();
