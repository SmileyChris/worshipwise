import {
	analyticsApi,
	type AnalyticsOverview,
	type SongUsageStats,
	type ServiceTypeStats,
	type KeyUsageStats,
	type UsageTrend,
	type WorshipLeaderStats
} from '$lib/api/analytics';

class AnalyticsStore {
	// Reactive state using Svelte 5 runes
	loading = $state<boolean>(false);
	error = $state<string | null>(null);

	// Overview data
	overview = $state<AnalyticsOverview | null>(null);

	// Analytics data
	songUsageStats = $state<SongUsageStats[]>([]);
	serviceTypeStats = $state<ServiceTypeStats[]>([]);
	keyUsageStats = $state<KeyUsageStats[]>([]);
	usageTrends = $state<UsageTrend[]>([]);
	worshipLeaderStats = $state<WorshipLeaderStats[]>([]);

	// Filter state
	dateRange = $state<{
		from: string | null;
		to: string | null;
	}>({
		from: null,
		to: null
	});

	// Time interval for trends
	trendInterval = $state<'week' | 'month'>('week');

	// Export loading state
	exportLoading = $state<boolean>(false);

	// Derived computed values
	hasData = $derived.by(() => {
		return (
			this.overview !== null || this.songUsageStats.length > 0 || this.serviceTypeStats.length > 0
		);
	});

	isDateFiltered = $derived.by(() => {
		return this.dateRange.from !== null || this.dateRange.to !== null;
	});

	dateRangeText = $derived.by(() => {
		if (!this.isDateFiltered) return 'All Time';

		const from = this.dateRange.from
			? new Date(this.dateRange.from).toLocaleDateString()
			: 'Beginning';
		const to = this.dateRange.to ? new Date(this.dateRange.to).toLocaleDateString() : 'Today';

		return `${from} - ${to}`;
	});

	// Most popular song
	mostPopularSong = $derived.by(() => {
		return this.songUsageStats.length > 0 ? this.songUsageStats[0] : null;
	});

	// Most used key
	mostUsedKey = $derived.by(() => {
		return this.keyUsageStats.length > 0 ? this.keyUsageStats[0] : null;
	});

	// Most active worship leader
	mostActiveLeader = $derived.by(() => {
		return this.worshipLeaderStats.length > 0 ? this.worshipLeaderStats[0] : null;
	});

	/**
	 * Load all analytics data
	 */
	async loadAnalytics(): Promise<void> {
		this.loading = true;
		this.error = null;

		try {
			await Promise.all([
				this.loadOverview(),
				this.loadSongUsageStats(),
				this.loadServiceTypeStats(),
				this.loadKeyUsageStats(),
				this.loadUsageTrends(),
				this.loadWorshipLeaderStats()
			]);
		} catch (error: unknown) {
			console.error('Failed to load analytics:', error);
			this.error = this.getErrorMessage(error);
		} finally {
			this.loading = false;
		}
	}

	/**
	 * Load overview analytics
	 */
	async loadOverview(): Promise<void> {
		try {
			this.overview = await analyticsApi.getOverview(
				this.dateRange.from || undefined,
				this.dateRange.to || undefined
			);
		} catch (error: unknown) {
			console.error('Failed to load overview:', error);
			throw error;
		}
	}

	/**
	 * Load song usage statistics
	 */
	async loadSongUsageStats(limit = 20): Promise<void> {
		try {
			this.songUsageStats = await analyticsApi.getSongUsageStats(
				limit,
				this.dateRange.from || undefined,
				this.dateRange.to || undefined
			);
		} catch (error: unknown) {
			console.error('Failed to load song usage stats:', error);
			throw error;
		}
	}

	/**
	 * Load service type statistics
	 */
	async loadServiceTypeStats(): Promise<void> {
		try {
			this.serviceTypeStats = await analyticsApi.getServiceTypeStats(
				this.dateRange.from || undefined,
				this.dateRange.to || undefined
			);
		} catch (error: unknown) {
			console.error('Failed to load service type stats:', error);
			throw error;
		}
	}

	/**
	 * Load key usage statistics
	 */
	async loadKeyUsageStats(): Promise<void> {
		try {
			this.keyUsageStats = await analyticsApi.getKeyUsageStats(
				this.dateRange.from || undefined,
				this.dateRange.to || undefined
			);
		} catch (error: unknown) {
			console.error('Failed to load key usage stats:', error);
			throw error;
		}
	}

	/**
	 * Load usage trends
	 */
	async loadUsageTrends(): Promise<void> {
		try {
			this.usageTrends = await analyticsApi.getUsageTrends(
				this.dateRange.from || undefined,
				this.dateRange.to || undefined,
				this.trendInterval
			);
		} catch (error: unknown) {
			console.error('Failed to load usage trends:', error);
			throw error;
		}
	}

	/**
	 * Load worship leader statistics
	 */
	async loadWorshipLeaderStats(limit = 10): Promise<void> {
		try {
			this.worshipLeaderStats = await analyticsApi.getWorshipLeaderStats(
				limit,
				this.dateRange.from || undefined,
				this.dateRange.to || undefined
			);
		} catch (error: unknown) {
			console.error('Failed to load worship leader stats:', error);
			throw error;
		}
	}

	/**
	 * Set date range filter
	 */
	async setDateRange(from: string | null, to: string | null): Promise<void> {
		this.dateRange.from = from;
		this.dateRange.to = to;
		await this.loadAnalytics();
	}

	/**
	 * Clear date range filter
	 */
	async clearDateRange(): Promise<void> {
		this.dateRange.from = null;
		this.dateRange.to = null;
		await this.loadAnalytics();
	}

	/**
	 * Set trend interval
	 */
	async setTrendInterval(interval: 'week' | 'month'): Promise<void> {
		if (interval !== this.trendInterval) {
			this.trendInterval = interval;
			await this.loadUsageTrends();
		}
	}

	/**
	 * Export analytics data to CSV
	 */
	async exportData(type: 'songs' | 'services' | 'leaders'): Promise<void> {
		this.exportLoading = true;
		this.error = null;

		try {
			const csvData = await analyticsApi.exportToCSV(
				type,
				this.dateRange.from || undefined,
				this.dateRange.to || undefined
			);

			// Create and trigger download
			const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
			const link = document.createElement('a');

			if (link.download !== undefined) {
				const url = URL.createObjectURL(blob);
				link.setAttribute('href', url);
				link.setAttribute(
					'download',
					`worshipwise-${type}-analytics-${new Date().toISOString().split('T')[0]}.csv`
				);
				link.style.visibility = 'hidden';
				document.body.appendChild(link);
				link.click();
				document.body.removeChild(link);
				URL.revokeObjectURL(url);
			}
		} catch (error: unknown) {
			console.error('Failed to export analytics data:', error);
			this.error = this.getErrorMessage(error);
		} finally {
			this.exportLoading = false;
		}
	}

	/**
	 * Refresh specific analytics section
	 */
	async refreshSection(
		section: 'overview' | 'songs' | 'services' | 'keys' | 'trends' | 'leaders'
	): Promise<void> {
		this.error = null;

		try {
			switch (section) {
				case 'overview':
					await this.loadOverview();
					break;
				case 'songs':
					await this.loadSongUsageStats();
					break;
				case 'services':
					await this.loadServiceTypeStats();
					break;
				case 'keys':
					await this.loadKeyUsageStats();
					break;
				case 'trends':
					await this.loadUsageTrends();
					break;
				case 'leaders':
					await this.loadWorshipLeaderStats();
					break;
			}
		} catch (error: unknown) {
			console.error(`Failed to refresh ${section}:`, error);
			this.error = this.getErrorMessage(error);
		}
	}

	/**
	 * Get insights and recommendations
	 */
	getInsights(): string[] {
		const insights: string[] = [];

		if (!this.hasData) return insights;

		// Song usage insights
		if (this.songUsageStats.length > 0) {
			const topSong = this.songUsageStats[0];
			const underusedSongs = this.songUsageStats.filter((song) => song.daysSinceLastUse > 60);

			insights.push(`"${topSong.title}" is your most popular song with ${topSong.usageCount} uses`);

			if (underusedSongs.length > 0) {
				insights.push(`${underusedSongs.length} songs haven't been used in over 2 months`);
			}
		}

		// Service type insights
		if (this.serviceTypeStats.length > 0) {
			const mostCommonService = this.serviceTypeStats[0];
			insights.push(
				`${mostCommonService.serviceType} is your most common service type (${mostCommonService.count} services)`
			);
		}

		// Key usage insights
		if (this.keyUsageStats.length > 0) {
			const topKey = this.keyUsageStats[0];
			const keyVariety = this.keyUsageStats.length;

			insights.push(`${topKey.key} is your most used key (${topKey.percentage}% of songs)`);

			if (keyVariety < 5) {
				insights.push(
					`Consider using more key variety - you're only using ${keyVariety} different keys`
				);
			}
		}

		// Usage trends insights
		if (this.usageTrends.length > 1) {
			const recent = this.usageTrends.slice(-4); // Last 4 periods
			const avgUsage = recent.reduce((sum, trend) => sum + trend.usageCount, 0) / recent.length;
			const currentUsage = recent[recent.length - 1]?.usageCount || 0;

			if (currentUsage > avgUsage * 1.2) {
				insights.push('Song usage is trending upward - your worship ministry is growing!');
			} else if (currentUsage < avgUsage * 0.8) {
				insights.push('Song usage has decreased recently - consider more varied services');
			}
		}

		// Overview insights
		if (this.overview) {
			if (this.overview.avgSongsPerService < 4) {
				insights.push('Your services are quite short - consider adding more songs for variety');
			} else if (this.overview.avgSongsPerService > 8) {
				insights.push('Your services are quite long - ensure you have enough time for all songs');
			}
		}

		return insights.slice(0, 5); // Return top 5 insights
	}

	/**
	 * Get error message from API error
	 */
	private getErrorMessage(error: unknown): string {
		if (error?.response?.data?.message) {
			return error.response.data.message;
		}
		if (error?.message) {
			return error.message;
		}
		return 'An unexpected error occurred while loading analytics';
	}

	/**
	 * Clear error state
	 */
	clearError(): void {
		this.error = null;
	}
}

// Export singleton instance
export const analyticsStore = new AnalyticsStore();
