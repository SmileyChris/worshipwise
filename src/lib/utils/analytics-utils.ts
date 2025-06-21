/**
 * Analytics-related utility functions
 */

/**
 * Color palette for charts
 */
export const CHART_COLORS = {
	primary: '#3B82F6',
	secondary: '#EF4444',
	success: '#10B981',
	warning: '#F59E0B',
	info: '#06B6D4',
	purple: '#8B5CF6',
	pink: '#EC4899',
	slate: '#64748B'
} as const;

export const CHART_COLOR_PALETTE = [
	CHART_COLORS.primary,
	CHART_COLORS.success,
	CHART_COLORS.warning,
	CHART_COLORS.purple,
	CHART_COLORS.pink,
	CHART_COLORS.info,
	CHART_COLORS.secondary,
	CHART_COLORS.slate
];

/**
 * Interface for usage data
 */
export interface UsageData {
	song_id: string;
	title: string;
	artist?: string;
	usage_count: number;
	last_used?: string;
	service_type?: string;
	worship_leader?: string;
	used_key?: string;
}

/**
 * Interface for aggregated analytics data
 */
export interface AnalyticsOverview {
	totalSongs: number;
	totalServices: number;
	averageServiceDuration: number;
	mostUsedSong: { title: string; count: number };
	topServiceType: { type: string; count: number };
	activeWorshipLeaders: number;
}

/**
 * Aggregates usage data for overview statistics
 */
export function aggregateUsageData(
	songs: any[],
	setlists: any[],
	usageData: UsageData[]
): AnalyticsOverview {
	// Calculate basic counts
	const totalSongs = songs.length;
	const totalServices = setlists.length;

	// Calculate average setlist duration
	const completedSetlists = setlists.filter((s) => s.status === 'completed');
	const averageServiceDuration =
		completedSetlists.length > 0
			? completedSetlists.reduce(
					(sum, s) => sum + (s.actual_duration || s.estimated_duration || 0),
					0
				) / completedSetlists.length
			: 0;

	// Find most used song
	const songUsageCounts = usageData.reduce(
		(acc, usage) => {
			const key = `${usage.song_id}:${usage.title}`;
			acc[key] = (acc[key] || 0) + 1;
			return acc;
		},
		{} as Record<string, number>
	);

	const mostUsedEntry = Object.entries(songUsageCounts).sort(([, a], [, b]) => b - a)[0];

	const mostUsedSong = mostUsedEntry
		? { title: mostUsedEntry[0].split(':')[1], count: mostUsedEntry[1] }
		: { title: 'No data', count: 0 };

	// Find top service type
	const serviceTypeCounts = setlists.reduce(
		(acc, setlist) => {
			const type = setlist.service_type || 'Unknown';
			acc[type] = (acc[type] || 0) + 1;
			return acc;
		},
		{} as Record<string, number>
	);

	const topServiceEntry = Object.entries(serviceTypeCounts).sort(
		([, a], [, b]) => (b as number) - (a as number)
	)[0];

	const topServiceType = topServiceEntry
		? { type: topServiceEntry[0], count: topServiceEntry[1] as number }
		: { type: 'No data', count: 0 };

	// Count active worship leaders
	const uniqueLeaders = new Set(setlists.map((s) => s.worship_leader).filter(Boolean));
	const activeWorshipLeaders = uniqueLeaders.size;

	return {
		totalSongs,
		totalServices,
		averageServiceDuration,
		mostUsedSong,
		topServiceType,
		activeWorshipLeaders
	};
}

/**
 * Calculates trend data over time
 */
export function calculateTrends(
	usageData: UsageData[],
	dateRange: { start: string; end: string }
): Array<{ date: string; count: number }> {
	// Filter data by date range
	const filteredData = usageData.filter((usage) => {
		if (!usage.last_used) return false;
		const usageDate = usage.last_used.split('T')[0]; // Get just the date part
		const startDate = dateRange.start;
		const endDate = dateRange.end;
		return usageDate >= startDate && usageDate <= endDate;
	});

	// Group by date
	const dailyCounts = filteredData.reduce(
		(acc, usage) => {
			const date = usage.last_used!.split('T')[0]; // Get just the date part
			acc[date] = (acc[date] || 0) + 1;
			return acc;
		},
		{} as Record<string, number>
	);

	// Convert to array and sort
	return Object.entries(dailyCounts)
		.map(([date, count]) => ({ date, count }))
		.sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Formats chart data for Chart.js bar charts
 */
export function formatBarChartData(
	data: Array<{ label: string; value: number }>,
	options: {
		backgroundColor?: string;
		borderColor?: string;
		title?: string;
	} = {}
) {
	return {
		labels: data.map((item) => item.label),
		datasets: [
			{
				label: options.title || 'Data',
				data: data.map((item) => item.value),
				backgroundColor: options.backgroundColor || CHART_COLORS.primary,
				borderColor: options.borderColor || CHART_COLORS.primary,
				borderWidth: 1
			}
		]
	};
}

/**
 * Formats chart data for Chart.js line charts
 */
export function formatLineChartData(
	data: Array<{ date: string; count: number }>,
	options: {
		backgroundColor?: string;
		borderColor?: string;
		title?: string;
	} = {}
) {
	return {
		labels: data.map((item) => formatDateLabel(item.date)),
		datasets: [
			{
				label: options.title || 'Usage Over Time',
				data: data.map((item) => item.count),
				backgroundColor: options.backgroundColor || CHART_COLORS.primary + '20',
				borderColor: options.borderColor || CHART_COLORS.primary,
				borderWidth: 2,
				fill: true
			}
		]
	};
}

/**
 * Formats chart data for Chart.js pie charts
 */
export function formatPieChartData(
	data: Array<{ label: string; value: number }>,
	options: {
		title?: string;
	} = {}
) {
	return {
		labels: data.map((item) => item.label),
		datasets: [
			{
				label: options.title || 'Distribution',
				data: data.map((item) => item.value),
				backgroundColor: CHART_COLOR_PALETTE.slice(0, data.length),
				borderWidth: 2
			}
		]
	};
}

/**
 * Formats date for chart labels
 */
export function formatDateLabel(dateString: string): string {
	const date = new Date(dateString);
	return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/**
 * Generates insights from analytics data
 */
export function generateInsights(
	overview: AnalyticsOverview,
	usageData: UsageData[],
	dateRange: { start: string; end: string }
): string[] {
	const insights: string[] = [];

	// Song usage insights
	if (overview.mostUsedSong.count > 5) {
		insights.push(
			`"${overview.mostUsedSong.title}" is your most popular song with ${overview.mostUsedSong.count} uses`
		);
	}

	// Service type insights
	if (overview.topServiceType.count > overview.totalServices * 0.5) {
		insights.push(`${overview.topServiceType.type} services make up the majority of your setlists`);
	}

	// Duration insights
	if (overview.averageServiceDuration > 90) {
		insights.push('Your services tend to run longer than average (90+ minutes)');
	} else if (overview.averageServiceDuration < 45) {
		insights.push('Your services are typically shorter than average (under 45 minutes)');
	}

	// Leadership insights
	if (overview.activeWorshipLeaders === 1) {
		insights.push('Consider developing additional worship leaders for variety');
	} else if (overview.activeWorshipLeaders > 5) {
		insights.push('Great diversity in worship leadership!');
	}

	// Recent usage patterns
	const recentUsage = usageData.filter((usage) => {
		if (!usage.last_used) return false;
		const thirtyDaysAgo = new Date();
		thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
		return new Date(usage.last_used) >= thirtyDaysAgo;
	});

	if (recentUsage.length < overview.totalSongs * 0.2) {
		insights.push('You might want to introduce more variety in your song selection');
	}

	return insights;
}

/**
 * Calculates song usage frequency categories
 */
export function categorizeUsageFrequency(usageData: UsageData[]): {
	frequent: UsageData[];
	moderate: UsageData[];
	rare: UsageData[];
	unused: UsageData[];
} {
	const songUsageCounts = usageData.reduce(
		(acc, usage) => {
			acc[usage.song_id] = (acc[usage.song_id] || 0) + 1;
			return acc;
		},
		{} as Record<string, number>
	);

	const frequent: UsageData[] = [];
	const moderate: UsageData[] = [];
	const rare: UsageData[] = [];
	const unused: UsageData[] = [];

	usageData.forEach((usage) => {
		const count = songUsageCounts[usage.song_id] || 0;

		if (count === 0) {
			unused.push(usage);
		} else if (count >= 10) {
			frequent.push(usage);
		} else if (count >= 3) {
			moderate.push(usage);
		} else {
			rare.push(usage);
		}
	});

	return { frequent, moderate, rare, unused };
}

/**
 * Calculates key usage statistics
 */
export function calculateKeyUsageStats(
	usageData: UsageData[]
): Array<{ key: string; count: number; percentage: number }> {
	const keyCounts = usageData.reduce(
		(acc, usage) => {
			const key = usage.used_key || 'Unknown';
			acc[key] = (acc[key] || 0) + 1;
			return acc;
		},
		{} as Record<string, number>
	);

	const total = usageData.length;

	return Object.entries(keyCounts)
		.map(([key, count]) => ({
			key,
			count,
			percentage: total > 0 ? Math.round((count / total) * 100) : 0
		}))
		.sort((a, b) => b.count - a.count);
}

/**
 * Default Chart.js configuration options
 */
export function getDefaultChartOptions(type: 'bar' | 'line' | 'pie' = 'bar') {
	const baseOptions = {
		responsive: true,
		maintainAspectRatio: false,
		plugins: {
			legend: {
				position: 'top' as const
			}
		}
	};

	if (type === 'pie') {
		return baseOptions;
	}

	return {
		...baseOptions,
		scales: {
			y: {
				beginAtZero: true,
				grid: {
					color: '#E5E7EB'
				}
			},
			x: {
				grid: {
					color: '#E5E7EB'
				}
			}
		}
	};
}

/**
 * Exports analytics data to CSV format
 */
export function exportToCSV(
	data: Array<Record<string, any>>,
	filename: string = 'analytics-export.csv'
): void {
	if (data.length === 0) return;

	// Get headers from first object
	const headers = Object.keys(data[0]);

	// Create CSV content
	const csvContent = [
		headers.join(','),
		...data.map((row) =>
			headers
				.map((header) => {
					const value = row[header];
					// Escape commas and quotes in values
					if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
						return `"${value.replace(/"/g, '""')}"`;
					}
					return value;
				})
				.join(',')
		)
	].join('\n');

	// Create and download file
	const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
	const link = document.createElement('a');

	if (link.download !== undefined) {
		const url = URL.createObjectURL(blob);
		link.setAttribute('href', url);
		link.setAttribute('download', filename);
		link.style.visibility = 'hidden';
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
	}
}
