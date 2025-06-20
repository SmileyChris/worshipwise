import { pb } from './client';

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
			const [songsResult, setlistsResult, usageResult] = await Promise.all([
				pb.collection('songs').getList(1, 1, { filter: 'is_active = true' }),
				pb.collection('setlists').getList(1, 1, {
					filter: dateFilter ? `status = "completed" && ${dateFilter}` : 'status = "completed"'
				}),
				pb.collection('song_usage').getList(1, 1, {
					filter: dateFilter || undefined
				})
			]);

			// Get setlists with songs for calculations
			const completedSetlists = await pb.collection('setlists').getFullList({
				filter: dateFilter ? `status = "completed" && ${dateFilter}` : 'status = "completed"',
				expand: 'setlist_songs_via_setlist_id.song_id'
			});

			// Calculate derived metrics
			const totalServices = setlistsResult.totalItems;
			const totalUsages = usageResult.totalItems;
			const totalSongs = songsResult.totalItems;

			let avgSongsPerService = 0;
			let avgServiceDuration = 0;
			const activeLeaders = new Set();

			if (completedSetlists.length > 0) {
				let totalSongsInSetlists = 0;
				let totalDuration = 0;
				let setlistsWithDuration = 0;

				completedSetlists.forEach((setlist) => {
					// Count songs
					const songCount = setlist.expand?.setlist_songs_via_setlist_id?.length || 0;
					totalSongsInSetlists += songCount;

					// Track duration
					if (setlist.actual_duration || setlist.estimated_duration) {
						totalDuration += setlist.actual_duration || setlist.estimated_duration;
						setlistsWithDuration++;
					}

					// Track worship leaders
					if (setlist.worship_leader) {
						activeLeaders.add(setlist.worship_leader);
					}
				});

				avgSongsPerService = totalSongsInSetlists / completedSetlists.length;
				avgServiceDuration = setlistsWithDuration > 0 ? totalDuration / setlistsWithDuration : 0;
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
					song: any;
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
				if (usage.position_in_setlist) {
					stats.positions.push(usage.position_in_setlist);
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

			const services = await pb.collection('setlists').getFullList({
				filter: dateFilter ? `status = "completed" && ${dateFilter}` : 'status = "completed"',
				expand: 'setlist_songs_via_setlist_id.song_id'
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
				songs.forEach((setlistSong: any) => {
					const song = setlistSong.expand?.song_id;
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

			// Get setlist songs with key information
			const setlistSongs = await pb.collection('setlist_songs').getFullList({
				expand: 'song_id,setlist_id',
				filter: dateFilter
					? `setlist_id.status = "completed" && setlist_id.${dateFilter}`
					: 'setlist_id.status = "completed"'
			});

			// Count key usage
			const keyCounts = new Map<string, number>();
			let totalCount = 0;

			setlistSongs.forEach((setlistSong) => {
				// Use transposed key if available, otherwise original song key
				const key = setlistSong.transposed_key || setlistSong.expand?.song_id?.key_signature;

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
			const [usageRecords, setlists] = await Promise.all([
				pb.collection('song_usage').getFullList({
					filter: dateFilter || undefined,
					sort: 'used_date'
				}),
				pb.collection('setlists').getFullList({
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

			// Process setlists
			setlists.forEach((setlist) => {
				const date = new Date(setlist.service_date);
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

				const duration = setlist.actual_duration || setlist.estimated_duration;
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

			const setlists = await pb.collection('setlists').getFullList({
				filter: dateFilter ? `status = "completed" && ${dateFilter}` : 'status = "completed"',
				expand: 'worship_leader,setlist_songs_via_setlist_id.song_id'
			});

			// Group by worship leader
			const leaderMap = new Map<
				string,
				{
					leader: any;
					serviceCount: number;
					totalDuration: number;
					durationsCount: number;
					keys: Map<string, number>;
					songs: Set<string>;
				}
			>();

			setlists.forEach((setlist) => {
				const leaderId = setlist.worship_leader;
				const leader = setlist.expand?.worship_leader;

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
				const duration = setlist.actual_duration || setlist.estimated_duration;
				if (duration) {
					stats.totalDuration += duration;
					stats.durationsCount++;
				}

				// Track keys and songs
				const setlistSongs = setlist.expand?.setlist_songs_via_setlist_id || [];
				setlistSongs.forEach((setlistSong: any) => {
					const song = setlistSong.expand?.song_id;
					if (song) {
						// Track unique songs
						stats.songs.add(song.id);

						// Track keys used
						const key = setlistSong.transposed_key || song.key_signature;
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
			let data: any[] = [];
			let headers: string[] = [];

			switch (type) {
				case 'songs':
					data = await this.getSongUsageStats(100, dateFrom, dateTo);
					headers = [
						'Title',
						'Artist',
						'Usage Count',
						'Last Used',
						'Days Since Last Use',
						'Avg Position'
					];
					break;
				case 'services':
					data = await this.getServiceTypeStats(dateFrom, dateTo);
					headers = ['Service Type', 'Count', 'Avg Duration (min)', 'Avg Songs'];
					break;
				case 'leaders':
					data = await this.getWorshipLeaderStats(50, dateFrom, dateTo);
					headers = [
						'Name',
						'Setlist Count',
						'Avg Duration (min)',
						'Unique Songs',
						'Favorite Keys'
					];
					break;
			}

			// Convert to CSV format
			const csvRows = [headers.join(',')];

			data.forEach((item) => {
				let row: string[] = [];
				switch (type) {
					case 'songs':
						row = [
							`"${item.title}"`,
							`"${item.artist || ''}"`,
							item.usageCount.toString(),
							item.lastUsed,
							item.daysSinceLastUse.toString(),
							item.avgPosition.toString()
						];
						break;
					case 'services':
						row = [
							`"${item.serviceType}"`,
							item.count.toString(),
							item.avgDuration.toString(),
							item.avgSongs.toString()
						];
						break;
					case 'leaders':
						row = [
							`"${item.name}"`,
							item.serviceCount.toString(),
							item.avgDuration.toString(),
							item.uniqueSongs.toString(),
							`"${item.favoriteKeys.join(', ')}"`
						];
						break;
				}
				csvRows.push(row.join(','));
			});

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
