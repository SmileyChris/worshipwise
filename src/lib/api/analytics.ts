import { pb } from './client';
import type { Song } from '$lib/types/song';
import type { ServiceSong } from '$lib/types/service';
import type { User } from '$lib/types/auth';

export interface AnalyticsOverview {
	totalSongs: number;
	totalServices: number;
	totalUsages: number;
	avgSongsPerService: number;
	avgServiceDuration: number;
	activeWorshipLeaders: number;
}

export interface SongUsageStats {
	songId: string;
	title: string;
	artist?: string;
	usageCount: number;
	lastUsed: string;
	daysSinceLastUse: number;
	avgPosition: number;
}

export interface ServiceTypeStats {
	serviceType: string;
	count: number;
	avgDuration: number;
	avgSongs: number;
	popularSongs: string[];
}

export interface KeyUsageStats {
	key: string;
	count: number;
	percentage: number;
}

export interface UsageTrend {
	date: string;
	usageCount: number;
	serviceCount: number;
	avgDuration: number;
}

export interface WorshipLeaderStats {
	leaderId: string;
	name: string;
	serviceCount: number;
	avgDuration: number;
	favoriteKeys: string[];
	uniqueSongs: number;
}

export class AnalyticsAPI {
	/**
	 * Get overview analytics for the dashboard
	 */
	async getOverview(dateFrom?: string, dateTo?: string): Promise<AnalyticsOverview> {
		try {
			const dateFilter = this.buildDateFilter(dateFrom, dateTo);

			// Get basic counts
			const [songsResult, servicesResult, usageResult] = await Promise.all([
				pb.collection('songs').getList(1, 1, { filter: 'is_active = true' }),
				pb.collection('services').getList(1, 1, {
					filter: dateFilter ? `status = "completed" && ${dateFilter}` : 'status = "completed"'
				}),
				pb.collection('song_usage').getList(1, 1, {
					filter: dateFilter || undefined
				})
			]);

			// Get services with songs for calculations
			const completedServices = await pb.collection('services').getFullList({
				filter: dateFilter ? `status = "completed" && ${dateFilter}` : 'status = "completed"',
				expand: 'service_songs_via_service_id.song_id'
			});

			// Calculate derived metrics
			const totalServices = servicesResult.totalItems;
			const totalUsages = usageResult.totalItems;
			const totalSongs = songsResult.totalItems;

			let avgSongsPerService = 0;
			let avgServiceDuration = 0;
			const activeLeaders = new Set();

			if (completedServices.length > 0) {
				let totalSongsInServices = 0;
				let totalDuration = 0;
				let servicesWithDuration = 0;

				completedServices.forEach((service) => {
					// Count songs
					const songCount = service.expand?.service_songs_via_service_id?.length || 0;
					totalSongsInServices += songCount;

					// Track duration
					if (service.actual_duration || service.estimated_duration) {
						totalDuration += service.actual_duration || service.estimated_duration;
						servicesWithDuration++;
					}

					// Track worship leaders
					if (service.worship_leader) {
						activeLeaders.add(service.worship_leader);
					}
				});

				avgSongsPerService = totalSongsInServices / completedServices.length;
				avgServiceDuration = servicesWithDuration > 0 ? totalDuration / servicesWithDuration : 0;
			}

			return {
				totalSongs,
				totalServices,
				totalUsages,
				avgSongsPerService: Math.round(avgSongsPerService * 10) / 10,
				avgServiceDuration: Math.round(avgServiceDuration / 60), // Convert to minutes
				activeWorshipLeaders: activeLeaders.size
			};
		} catch (error) {
			console.error('Failed to fetch analytics overview:', error);
			throw error;
		}
	}

	/**
	 * Get song usage statistics
	 */
	async getSongUsageStats(
		limit = 20,
		dateFrom?: string,
		dateTo?: string
	): Promise<SongUsageStats[]> {
		try {
			const dateFilter = this.buildDateFilter(dateFrom, dateTo);

			// Get all usage records with song details
			const usageRecords = await pb.collection('song_usage').getFullList({
				filter: dateFilter || undefined,
				expand: 'song_id',
				sort: '-used_date'
			});

			// Group by song and calculate stats
			const songStats = new Map<
				string,
				{
					song: Song;
					usageCount: number;
					lastUsed: string;
					positions: number[];
				}
			>();

			usageRecords.forEach((usage) => {
				const songId = usage.song_id;
				const song = usage.expand?.song_id;

				if (!song) return;

				if (!songStats.has(songId)) {
					songStats.set(songId, {
						song,
						usageCount: 0,
						lastUsed: usage.used_date,
						positions: []
					});
				}

				const stats = songStats.get(songId)!;
				stats.usageCount++;

				// Track position if available
				if (usage.position_in_service) {
					stats.positions.push(usage.position_in_service);
				}

				// Update last used date (records are sorted by date desc)
				if (usage.used_date > stats.lastUsed) {
					stats.lastUsed = usage.used_date;
				}
			});

			// Convert to result format and sort by usage count
			const results: SongUsageStats[] = Array.from(songStats.entries())
				.map(([songId, stats]) => {
					const daysSinceLastUse = Math.floor(
						(Date.now() - new Date(stats.lastUsed).getTime()) / (1000 * 60 * 60 * 24)
					);

					const avgPosition =
						stats.positions.length > 0
							? stats.positions.reduce((sum, pos) => sum + pos, 0) / stats.positions.length
							: 0;

					return {
						songId,
						title: stats.song.title,
						artist: stats.song.artist,
						usageCount: stats.usageCount,
						lastUsed: stats.lastUsed,
						daysSinceLastUse,
						avgPosition: Math.round(avgPosition * 10) / 10
					};
				})
				.sort((a, b) => b.usageCount - a.usageCount)
				.slice(0, limit);

			return results;
		} catch (error) {
			console.error('Failed to fetch song usage stats:', error);
			throw error;
		}
	}

	/**
	 * Get service type analytics
	 */
	async getServiceTypeStats(dateFrom?: string, dateTo?: string): Promise<ServiceTypeStats[]> {
		try {
			const dateFilter = this.buildDateFilter(dateFrom, dateTo);

			const services = await pb.collection('services').getFullList({
				filter: dateFilter ? `status = "completed" && ${dateFilter}` : 'status = "completed"',
				expand: 'service_songs_via_service_id.song_id'
			});

			// Group by service type
			const serviceTypeMap = new Map<
				string,
				{
					count: number;
					totalDuration: number;
					durationsCount: number;
					totalSongs: number;
					songCounts: Map<string, number>;
				}
			>();

			services.forEach((service) => {
				const serviceType = service.service_type || 'Unknown';

				if (!serviceTypeMap.has(serviceType)) {
					serviceTypeMap.set(serviceType, {
						count: 0,
						totalDuration: 0,
						durationsCount: 0,
						totalSongs: 0,
						songCounts: new Map()
					});
				}

				const stats = serviceTypeMap.get(serviceType)!;
				stats.count++;

				// Track duration
				const duration = service.actual_duration || service.estimated_duration;
				if (duration) {
					stats.totalDuration += duration;
					stats.durationsCount++;
				}

				// Track songs
				const songs = service.expand?.service_songs_via_service_id || [];
				stats.totalSongs += songs.length;

				// Track popular songs for this service type
				songs.forEach((serviceSong: ServiceSong) => {
					const song = serviceSong.expand?.song_id;
					if (song) {
						const songId = song.id;
						stats.songCounts.set(songId, (stats.songCounts.get(songId) || 0) + 1);
					}
				});
			});

			// Convert to result format
			const results: ServiceTypeStats[] = Array.from(serviceTypeMap.entries())
				.map(([serviceType, stats]) => {
					// Get top 3 songs for this service type
					const popularSongs = Array.from(stats.songCounts.entries())
						.sort((a, b) => b[1] - a[1])
						.slice(0, 3)
						.map(([songId]) => songId);

					return {
						serviceType,
						count: stats.count,
						avgDuration:
							stats.durationsCount > 0
								? Math.round(stats.totalDuration / stats.durationsCount / 60) // Convert to minutes
								: 0,
						avgSongs: stats.count > 0 ? Math.round((stats.totalSongs / stats.count) * 10) / 10 : 0,
						popularSongs
					};
				})
				.sort((a, b) => b.count - a.count);

			return results;
		} catch (error) {
			console.error('Failed to fetch service type stats:', error);
			throw error;
		}
	}

	/**
	 * Get key usage statistics
	 */
	async getKeyUsageStats(dateFrom?: string, dateTo?: string): Promise<KeyUsageStats[]> {
		try {
			const dateFilter = this.buildDateFilter(dateFrom, dateTo);

			// Get service songs with key information
			const serviceSongs = await pb.collection('service_songs').getFullList({
				expand: 'song_id,service_id',
				filter: dateFilter
					? `service_id.status = "completed" && service_id.${dateFilter}`
					: 'service_id.status = "completed"'
			});

			// Count key usage
			const keyCounts = new Map<string, number>();
			let totalCount = 0;

			serviceSongs.forEach((serviceSong) => {
				// Use transposed key if available, otherwise original song key
				const key = serviceSong.transposed_key || serviceSong.expand?.song_id?.key_signature;

				if (key) {
					keyCounts.set(key, (keyCounts.get(key) || 0) + 1);
					totalCount++;
				}
			});

			// Convert to result format with percentages
			const results: KeyUsageStats[] = Array.from(keyCounts.entries())
				.map(([key, count]) => ({
					key,
					count,
					percentage: Math.round((count / totalCount) * 100 * 10) / 10
				}))
				.sort((a, b) => b.count - a.count);

			return results;
		} catch (error) {
			console.error('Failed to fetch key usage stats:', error);
			throw error;
		}
	}

	/**
	 * Get usage trends over time
	 */
	async getUsageTrends(
		dateFrom?: string,
		dateTo?: string,
		interval: 'week' | 'month' = 'week'
	): Promise<UsageTrend[]> {
		try {
			const dateFilter = this.buildDateFilter(dateFrom, dateTo);

			// Get usage data
			const [usageRecords, services] = await Promise.all([
				pb.collection('song_usage').getFullList({
					filter: dateFilter || undefined,
					sort: 'used_date'
				}),
				pb.collection('services').getFullList({
					filter: dateFilter ? `status = "completed" && ${dateFilter}` : 'status = "completed"',
					sort: 'service_date'
				})
			]);

			// Group by time interval
			const trendsMap = new Map<
				string,
				{
					usageCount: number;
					serviceCount: number;
					totalDuration: number;
					durationsCount: number;
				}
			>();

			// Process usage records
			usageRecords.forEach((usage) => {
				const date = new Date(usage.used_date);
				const key = this.formatDateForInterval(date, interval);

				if (!trendsMap.has(key)) {
					trendsMap.set(key, {
						usageCount: 0,
						serviceCount: 0,
						totalDuration: 0,
						durationsCount: 0
					});
				}

				trendsMap.get(key)!.usageCount++;
			});

			// Process services
			services.forEach((service) => {
				const date = new Date(service.service_date);
				const key = this.formatDateForInterval(date, interval);

				if (!trendsMap.has(key)) {
					trendsMap.set(key, {
						usageCount: 0,
						serviceCount: 0,
						totalDuration: 0,
						durationsCount: 0
					});
				}

				const stats = trendsMap.get(key)!;
				stats.serviceCount++;

				const duration = service.actual_duration || service.estimated_duration;
				if (duration) {
					stats.totalDuration += duration;
					stats.durationsCount++;
				}
			});

			// Convert to result format and sort by date
			const results: UsageTrend[] = Array.from(trendsMap.entries())
				.map(([date, stats]) => ({
					date,
					usageCount: stats.usageCount,
					serviceCount: stats.serviceCount,
					avgDuration:
						stats.durationsCount > 0
							? Math.round(stats.totalDuration / stats.durationsCount / 60) // Convert to minutes
							: 0
				}))
				.sort((a, b) => a.date.localeCompare(b.date));

			return results;
		} catch (error) {
			console.error('Failed to fetch usage trends:', error);
			throw error;
		}
	}

	/**
	 * Get worship leader statistics
	 */
	async getWorshipLeaderStats(
		limit = 10,
		dateFrom?: string,
		dateTo?: string
	): Promise<WorshipLeaderStats[]> {
		try {
			const dateFilter = this.buildDateFilter(dateFrom, dateTo);

			const services = await pb.collection('services').getFullList({
				filter: dateFilter ? `status = "completed" && ${dateFilter}` : 'status = "completed"',
				expand: 'worship_leader,service_songs_via_service_id.song_id'
			});

			// Group by worship leader
			const leaderMap = new Map<
				string,
				{
					leader: User;
					serviceCount: number;
					totalDuration: number;
					durationsCount: number;
					keys: Map<string, number>;
					songs: Set<string>;
				}
			>();

			services.forEach((service) => {
				const leaderId = service.worship_leader;
				const leader = service.expand?.worship_leader;

				if (!leader) return;

				if (!leaderMap.has(leaderId)) {
					leaderMap.set(leaderId, {
						leader,
						serviceCount: 0,
						totalDuration: 0,
						durationsCount: 0,
						keys: new Map(),
						songs: new Set()
					});
				}

				const stats = leaderMap.get(leaderId)!;
				stats.serviceCount++;

				// Track duration
				const duration = service.actual_duration || service.estimated_duration;
				if (duration) {
					stats.totalDuration += duration;
					stats.durationsCount++;
				}

				// Track keys and songs
				const serviceSongs = service.expand?.service_songs_via_service_id || [];
				serviceSongs.forEach((serviceSong: ServiceSong) => {
					const song = serviceSong.expand?.song_id;
					if (song) {
						// Track unique songs
						stats.songs.add(song.id);

						// Track keys used
						const key = serviceSong.transposed_key || song.key_signature;
						if (key) {
							stats.keys.set(key, (stats.keys.get(key) || 0) + 1);
						}
					}
				});
			});

			// Convert to result format
			const results: WorshipLeaderStats[] = Array.from(leaderMap.entries())
				.map(([leaderId, stats]) => {
					// Get top 3 favorite keys
					const favoriteKeys = Array.from(stats.keys.entries())
						.sort((a, b) => b[1] - a[1])
						.slice(0, 3)
						.map(([key]) => key);

					return {
						leaderId,
						name: stats.leader.name || stats.leader.email,
						serviceCount: stats.serviceCount,
						avgDuration:
							stats.durationsCount > 0
								? Math.round(stats.totalDuration / stats.durationsCount / 60) // Convert to minutes
								: 0,
						favoriteKeys,
						uniqueSongs: stats.songs.size
					};
				})
				.sort((a, b) => b.serviceCount - a.serviceCount)
				.slice(0, limit);

			return results;
		} catch (error) {
			console.error('Failed to fetch worship leader stats:', error);
			throw error;
		}
	}

	/**
	 * Export analytics data as CSV
	 */
	async exportToCSV(
		type: 'songs' | 'services' | 'leaders',
		dateFrom?: string,
		dateTo?: string
	): Promise<string> {
		try {
			let headers: string[] = [];
			let csvRows: string[] = [];

			switch (type) {
				case 'songs': {
					const data = await this.getSongUsageStats(100, dateFrom, dateTo);
					headers = [
						'Title',
						'Artist',
						'Usage Count',
						'Last Used',
						'Days Since Last Use',
						'Avg Position'
					];
					csvRows = [headers.join(',')];
					data.forEach((item) => {
						const row = [
							`"${item.title}"`,
							`"${item.artist || ''}"`,
							item.usageCount.toString(),
							item.lastUsed,
							item.daysSinceLastUse.toString(),
							item.avgPosition.toString()
						];
						csvRows.push(row.join(','));
					});
					break;
				}
				case 'services': {
					const data = await this.getServiceTypeStats(dateFrom, dateTo);
					headers = ['Service Type', 'Count', 'Avg Duration (min)', 'Avg Songs'];
					csvRows = [headers.join(',')];
					data.forEach((item) => {
						const row = [
							`"${item.serviceType}"`,
							item.count.toString(),
							item.avgDuration.toString(),
							item.avgSongs.toString()
						];
						csvRows.push(row.join(','));
					});
					break;
				}
				case 'leaders': {
					const data = await this.getWorshipLeaderStats(50, dateFrom, dateTo);
					headers = [
						'Name',
						'Service Count',
						'Avg Duration (min)',
						'Unique Songs',
						'Favorite Keys'
					];
					csvRows = [headers.join(',')];
					data.forEach((item) => {
						const row = [
							`"${item.name}"`,
							item.serviceCount.toString(),
							item.avgDuration.toString(),
							item.uniqueSongs.toString(),
							`"${item.favoriteKeys.join(', ')}"`
						];
						csvRows.push(row.join(','));
					});
					break;
				}
			}

			return csvRows.join('\n');
		} catch (error) {
			console.error('Failed to export analytics data:', error);
			throw error;
		}
	}

	/**
	 * Build date filter for queries
	 */
	private buildDateFilter(dateFrom?: string, dateTo?: string): string | null {
		if (!dateFrom && !dateTo) return null;

		const filters: string[] = [];

		if (dateFrom) {
			filters.push(`created >= "${dateFrom}"`);
		}

		if (dateTo) {
			// Add one day to include the end date
			const endDate = new Date(dateTo);
			endDate.setDate(endDate.getDate() + 1);
			filters.push(`created < "${endDate.toISOString().split('T')[0]}"`);
		}

		return filters.join(' && ');
	}

	/**
	 * Format date for time interval grouping
	 */
	private formatDateForInterval(date: Date, interval: 'week' | 'month'): string {
		if (interval === 'month') {
			return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
		} else {
			// Week - get Monday of the week
			const monday = new Date(date);
			const day = monday.getDay();
			const diff = monday.getDate() - day + (day === 0 ? -6 : 1);
			monday.setDate(diff);
			return monday.toISOString().split('T')[0];
		}
	}
}

// Export singleton instance
export const analyticsApi = new AnalyticsAPI();
