import { pb } from './client';
import type {
	Service,
	CreateServiceData,
	UpdateServiceData,
	ServiceFilterOptions,
	ServiceSong,
	CreateServiceSongData,
	UpdateServiceSongData
} from '$lib/types/service';

export class ServicesAPI {
	private collection = 'setlists';
	private serviceSongsCollection = 'setlist_songs';

	/**
	 * Get all services with optional filtering
	 */
	async getServices(options: ServiceFilterOptions = {}): Promise<Service[]> {
		try {
			let filter = '';
			const filterParts: string[] = [];

			// Add search filter
			if (options.search) {
				filterParts.push(`(title ~ "${options.search}" || theme ~ "${options.search}")`);
			}

			// Add status filter
			if (options.status) {
				filterParts.push(`status = "${options.status}"`);
			}

			// Add service type filter
			if (options.serviceType) {
				filterParts.push(`service_type = "${options.serviceType}"`);
			}

			// Add worship leader filter
			if (options.worshipLeader) {
				filterParts.push(`worship_leader = "${options.worshipLeader}"`);
			}

			// Add date range filters
			if (options.dateFrom) {
				filterParts.push(`service_date >= "${options.dateFrom}"`);
			}
			if (options.dateTo) {
				filterParts.push(`service_date <= "${options.dateTo}"`);
			}

			// Add template filter
			if (options.templatesOnly) {
				filterParts.push('is_template = true');
			} else if (options.excludeTemplates) {
				filterParts.push('is_template = false');
			}

			// Combine filters
			if (filterParts.length > 0) {
				filter = filterParts.join(' && ');
			}

			const records = await pb.collection(this.collection).getFullList({
				filter,
				sort: options.sort || '-service_date',
				expand: 'worship_leader,team_members,created_by'
			});

			return records as unknown as Service[];
		} catch (error) {
			console.error('Failed to fetch services:', error);
			throw error;
		}
	}

	/**
	 * Get a single service by ID with songs
	 */
	async getService(id: string): Promise<Service> {
		try {
			const record = await pb.collection(this.collection).getOne(id, {
				expand: 'worship_leader,team_members,created_by'
			});
			return record as unknown as Service;
		} catch (error) {
			console.error('Failed to fetch service:', error);
			throw error;
		}
	}

	/**
	 * Get service songs for a specific service
	 */
	async getServiceSongs(serviceId: string): Promise<ServiceSong[]> {
		try {
			const records = await pb.collection(this.serviceSongsCollection).getFullList({
				filter: `setlist_id = "${serviceId}"`,
				sort: 'order_position',
				expand: 'song_id,added_by'
			});

			return records as unknown as ServiceSong[];
		} catch (error) {
			console.error('Failed to fetch service songs:', error);
			throw error;
		}
	}

	/**
	 * Create a new service
	 */
	async createService(data: CreateServiceData): Promise<Service> {
		try {
			const serviceData = {
				...data,
				created_by: pb.authStore.model?.id || ''
			};

			// Only add status if not already provided and not a template
			if (!data.is_template && !('status' in data)) {
				serviceData.status = 'draft';
			}

			const record = await pb.collection(this.collection).create(serviceData);
			return record as unknown as Service;
		} catch (error) {
			console.error('Failed to create service:', error);
			throw error;
		}
	}

	/**
	 * Update an existing service
	 */
	async updateService(id: string, data: UpdateServiceData): Promise<Service> {
		try {
			const record = await pb.collection(this.collection).update(id, data);
			return record as unknown as Service;
		} catch (error) {
			console.error('Failed to update service:', error);
			throw error;
		}
	}

	/**
	 * Delete a service
	 */
	async deleteService(id: string): Promise<void> {
		try {
			await pb.collection(this.collection).delete(id);
		} catch (error) {
			console.error('Failed to delete service:', error);
			throw error;
		}
	}

	/**
	 * Add a song to a service
	 */
	async addSongToService(data: CreateServiceSongData): Promise<ServiceSong> {
		try {
			// Get the next position in the service
			const existingSongs = await this.getServiceSongs(data.service_id);
			const nextPosition = existingSongs.length + 1;

			const { service_id, ...songDataWithoutServiceId } = data;
			const serviceSongData = {
				...songDataWithoutServiceId,
				setlist_id: service_id,
				order_position: data.order_position || nextPosition,
				added_by: pb.authStore.model?.id || ''
			};

			const record = await pb.collection(this.serviceSongsCollection).create(serviceSongData);
			return record as unknown as ServiceSong;
		} catch (error) {
			console.error('Failed to add song to service:', error);
			throw error;
		}
	}

	/**
	 * Update a song in a service
	 */
	async updateServiceSong(id: string, data: UpdateServiceSongData): Promise<ServiceSong> {
		try {
			const record = await pb.collection(this.serviceSongsCollection).update(id, data);
			return record as unknown as ServiceSong;
		} catch (error) {
			console.error('Failed to update service song:', error);
			throw error;
		}
	}

	/**
	 * Remove a song from a service
	 */
	async removeSongFromService(serviceSongId: string): Promise<void> {
		try {
			await pb.collection(this.serviceSongsCollection).delete(serviceSongId);
		} catch (error) {
			console.error('Failed to remove song from service:', error);
			throw error;
		}
	}

	/**
	 * Reorder songs in a service
	 */
	async reorderServiceSongs(
		serviceId: string,
		songOrder: Array<{ id: string; position: number }>
	): Promise<void> {
		try {
			// Update each song's position
			const updates = songOrder.map(({ id, position }) =>
				pb.collection(this.serviceSongsCollection).update(id, { order_position: position })
			);

			await Promise.all(updates);
		} catch (error) {
			console.error('Failed to reorder service songs:', error);
			throw error;
		}
	}

	/**
	 * Duplicate a service
	 */
	async duplicateService(id: string, newData: Partial<CreateServiceData> = {}): Promise<Service> {
		try {
			// Get the original service
			const original = await this.getService(id);
			const originalSongs = await this.getServiceSongs(id);

			// Create new service data
			const duplicateData: CreateServiceData = {
				title: newData.title || `${original.title} (Copy)`,
				service_date: newData.service_date || original.service_date,
				service_type: newData.service_type || original.service_type,
				theme: newData.theme || original.theme,
				notes: newData.notes || original.notes,
				worship_leader: newData.worship_leader || original.worship_leader,
				team_members: newData.team_members || original.team_members,
				estimated_duration: newData.estimated_duration || original.estimated_duration,
				is_template: newData.is_template || false,
				status: newData.status || 'draft'
			};

			// Create the new service
			const newService = await this.createService(duplicateData);

			// Add all songs from the original service
			for (const song of originalSongs) {
				await this.addSongToService({
					service_id: newService.id,
					song_id: song.song_id,
					order_position: song.order_position,
					transposed_key: song.transposed_key,
					tempo_override: song.tempo_override,
					transition_notes: song.transition_notes,
					section_type: song.section_type,
					duration_override: song.duration_override
				});
			}

			return newService;
		} catch (error) {
			console.error('Failed to duplicate service:', error);
			throw error;
		}
	}

	/**
	 * Mark service as completed and trigger usage tracking
	 */
	async completeService(id: string, actualDuration?: number): Promise<Service> {
		try {
			// Update service status
			const updateData: UpdateServiceData = {
				status: 'completed'
			};

			if (actualDuration) {
				updateData.actual_duration = actualDuration;
			}

			const updatedService = await this.updateService(id, updateData);

			// Trigger usage tracking
			await this.trackServiceUsage(id);

			return updatedService;
		} catch (error) {
			console.error('Failed to complete service:', error);
			throw error;
		}
	}

	/**
	 * Track usage for all songs in a completed service
	 */
	private async trackServiceUsage(serviceId: string): Promise<void> {
		try {
			const service = await this.getService(serviceId);
			const songs = await this.getServiceSongs(serviceId);

			// Create usage records for each song
			const usagePromises = songs.map((song) =>
				pb.collection('song_usage').create({
					song_id: song.song_id,
					setlist_id: serviceId,
					used_date: service.service_date,
					used_key: song.transposed_key || '',
					position_in_setlist: song.order_position,
					worship_leader: service.worship_leader,
					service_type: service.service_type || ''
				})
			);

			await Promise.all(usagePromises);
		} catch (error) {
			console.error('Failed to track service usage:', error);
			throw error;
		}
	}

	/**
	 * Get upcoming services
	 */
	async getUpcomingServices(limit = 10): Promise<Service[]> {
		try {
			const today = new Date().toISOString().split('T')[0];

			const records = await pb.collection(this.collection).getFullList({
				filter: `service_date >= "${today}" && is_template = false`,
				sort: 'service_date',
				limit,
				expand: 'worship_leader'
			});

			return records as unknown as Service[];
		} catch (error) {
			console.error('Failed to fetch upcoming services:', error);
			throw error;
		}
	}

	/**
	 * Get service templates
	 */
	async getTemplates(): Promise<Service[]> {
		try {
			const records = await pb.collection(this.collection).getFullList({
				filter: 'is_template = true',
				sort: '-created',
				expand: 'created_by'
			});

			return records as unknown as Service[];
		} catch (error) {
			console.error('Failed to fetch service templates:', error);
			throw error;
		}
	}

	/**
	 * Subscribe to real-time updates for services
	 */
	subscribeToServices(callback: (data: unknown) => void) {
		return pb.collection(this.collection).subscribe('*', callback);
	}

	/**
	 * Subscribe to real-time updates for service songs
	 */
	subscribeToServiceSongs(serviceId: string, callback: (data: unknown) => void) {
		return pb.collection(this.serviceSongsCollection).subscribe('*', callback, {
			filter: `setlist_id = "${serviceId}"`
		});
	}
}

// Export singleton instance
export const servicesApi = new ServicesAPI();
