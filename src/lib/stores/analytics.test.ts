import { describe, it, expect, beforeEach, vi, type MockedFunction } from 'vitest';
import { analyticsStore } from './analytics.svelte';
import {
	analyticsApi,
	type AnalyticsOverview,
	type SongUsageStats,
	type ServiceTypeStats,
	type KeyUsageStats,
	type UsageTrend,
	type WorshipLeaderStats
} from '$lib/api/analytics';

// Mock the analytics API
vi.mock('$lib/api/analytics', () => ({
	analyticsApi: {
		getOverview: vi.fn(),
		getSongUsageStats: vi.fn(),
		getServiceTypeStats: vi.fn(),
		getKeyUsageStats: vi.fn(),
		getUsageTrends: vi.fn(),
		getWorshipLeaderStats: vi.fn(),
		exportToCSV: vi.fn()
	}
}));

const mockedAnalyticsApi = analyticsApi as {
	getOverview: MockedFunction<any>;
	getSongUsageStats: MockedFunction<any>;
	getServiceTypeStats: MockedFunction<any>;
	getKeyUsageStats: MockedFunction<any>;
	getUsageTrends: MockedFunction<any>;
	getWorshipLeaderStats: MockedFunction<any>;
	exportToCSV: MockedFunction<any>;
};

// Mock DOM APIs for export functionality
const mockElement = {
	setAttribute: vi.fn(),
	click: vi.fn(),
	style: {},
	download: true
};

const mockDocument = {
	createElement: vi.fn(() => mockElement),
	body: {
		appendChild: vi.fn(),
		removeChild: vi.fn()
	}
};

const mockURL = {
	createObjectURL: vi.fn(() => 'blob:url'),
	revokeObjectURL: vi.fn()
};

const mockBlob = vi.fn((data: any, options: any) => ({ data, options }));

// Set up global mocks
vi.stubGlobal('document', mockDocument);
vi.stubGlobal('URL', mockURL);
vi.stubGlobal('Blob', mockBlob);

describe('AnalyticsStore', () => {
	const mockOverview: AnalyticsOverview = {
		totalServices: 52,
		totalSongs: 120,
		uniqueSongsUsed: 80,
		avgSongsPerService: 6.2,
		totalServiceTime: 156000,
		avgServiceTime: 3000,
		dateRange: {
			from: '2024-01-01',
			to: '2024-12-31'
		}
	};

	const mockSongUsageStats: SongUsageStats[] = [
		{
			songId: 'song-1',
			title: 'Amazing Grace',
			artist: 'Traditional',
			usageCount: 15,
			lastUsed: '2024-01-15T10:00:00Z',
			daysSinceLastUse: 7,
			avgRating: 4.8
		},
		{
			songId: 'song-2',
			title: 'How Great Thou Art',
			artist: 'Stuart Hine',
			usageCount: 10,
			lastUsed: '2024-01-01T10:00:00Z',
			daysSinceLastUse: 65,
			avgRating: 4.6
		}
	];

	const mockServiceTypeStats: ServiceTypeStats[] = [
		{
			serviceType: 'Sunday Morning',
			count: 30,
			percentage: 60,
			avgDuration: 3600
		},
		{
			serviceType: 'Evening Service',
			count: 20,
			percentage: 40,
			avgDuration: 2700
		}
	];

	const mockKeyUsageStats: KeyUsageStats[] = [
		{
			key: 'C',
			count: 40,
			percentage: 35,
			avgTempo: 120
		},
		{
			key: 'G',
			count: 30,
			percentage: 26,
			avgTempo: 115
		}
	];

	const mockUsageTrends: UsageTrend[] = [
		{
			period: '2024-W01',
			usageCount: 25,
			uniqueSongs: 15,
			avgServiceLength: 3200
		},
		{
			period: '2024-W02',
			usageCount: 30,
			uniqueSongs: 18,
			avgServiceLength: 3400
		}
	];

	const mockWorshipLeaderStats: WorshipLeaderStats[] = [
		{
			leaderId: 'leader-1',
			name: 'John Smith',
			servicesLed: 20,
			uniqueSongsUsed: 45,
			avgServiceRating: 4.7
		}
	];

	beforeEach(() => {
		// Reset the store state
		analyticsStore.loading = false;
		analyticsStore.error = null;
		analyticsStore.overview = null;
		analyticsStore.songUsageStats = [];
		analyticsStore.serviceTypeStats = [];
		analyticsStore.keyUsageStats = [];
		analyticsStore.usageTrends = [];
		analyticsStore.worshipLeaderStats = [];
		analyticsStore.dateRange = { from: null, to: null };
		analyticsStore.trendInterval = 'week';
		analyticsStore.exportLoading = false;

		// Reset all mocks
		vi.clearAllMocks();
	});

	describe('loadAnalytics', () => {
		it('should load all analytics data successfully', async () => {
			mockedAnalyticsApi.getOverview.mockResolvedValue(mockOverview);
			mockedAnalyticsApi.getSongUsageStats.mockResolvedValue(mockSongUsageStats);
			mockedAnalyticsApi.getServiceTypeStats.mockResolvedValue(mockServiceTypeStats);
			mockedAnalyticsApi.getKeyUsageStats.mockResolvedValue(mockKeyUsageStats);
			mockedAnalyticsApi.getUsageTrends.mockResolvedValue(mockUsageTrends);
			mockedAnalyticsApi.getWorshipLeaderStats.mockResolvedValue(mockWorshipLeaderStats);

			await analyticsStore.loadAnalytics();

			expect(analyticsStore.overview).toEqual(mockOverview);
			expect(analyticsStore.songUsageStats).toEqual(mockSongUsageStats);
			expect(analyticsStore.serviceTypeStats).toEqual(mockServiceTypeStats);
			expect(analyticsStore.keyUsageStats).toEqual(mockKeyUsageStats);
			expect(analyticsStore.usageTrends).toEqual(mockUsageTrends);
			expect(analyticsStore.worshipLeaderStats).toEqual(mockWorshipLeaderStats);
			expect(analyticsStore.loading).toBe(false);
			expect(analyticsStore.error).toBe(null);
		});

		it('should handle loading state correctly', async () => {
			mockedAnalyticsApi.getOverview.mockImplementation(async () => {
				expect(analyticsStore.loading).toBe(true);
				return mockOverview;
			});
			mockedAnalyticsApi.getSongUsageStats.mockResolvedValue([]);
			mockedAnalyticsApi.getServiceTypeStats.mockResolvedValue([]);
			mockedAnalyticsApi.getKeyUsageStats.mockResolvedValue([]);
			mockedAnalyticsApi.getUsageTrends.mockResolvedValue([]);
			mockedAnalyticsApi.getWorshipLeaderStats.mockResolvedValue([]);

			await analyticsStore.loadAnalytics();

			expect(analyticsStore.loading).toBe(false);
		});

		it('should handle errors when loading analytics', async () => {
			const error = new Error('Network error');
			mockedAnalyticsApi.getOverview.mockRejectedValue(error);

			await analyticsStore.loadAnalytics();

			expect(analyticsStore.loading).toBe(false);
			expect(analyticsStore.error).toBe('Network error');
		});

		it('should pass date range to API calls', async () => {
			analyticsStore.dateRange = { from: '2024-01-01', to: '2024-12-31' };
			
			mockedAnalyticsApi.getOverview.mockResolvedValue(mockOverview);
			mockedAnalyticsApi.getSongUsageStats.mockResolvedValue([]);
			mockedAnalyticsApi.getServiceTypeStats.mockResolvedValue([]);
			mockedAnalyticsApi.getKeyUsageStats.mockResolvedValue([]);
			mockedAnalyticsApi.getUsageTrends.mockResolvedValue([]);
			mockedAnalyticsApi.getWorshipLeaderStats.mockResolvedValue([]);

			await analyticsStore.loadAnalytics();

			expect(mockedAnalyticsApi.getOverview).toHaveBeenCalledWith('2024-01-01', '2024-12-31');
			expect(mockedAnalyticsApi.getSongUsageStats).toHaveBeenCalledWith(20, '2024-01-01', '2024-12-31');
			expect(mockedAnalyticsApi.getServiceTypeStats).toHaveBeenCalledWith('2024-01-01', '2024-12-31');
		});
	});

	describe('individual load methods', () => {
		it('should load overview data', async () => {
			mockedAnalyticsApi.getOverview.mockResolvedValue(mockOverview);

			await analyticsStore.loadOverview();

			expect(analyticsStore.overview).toEqual(mockOverview);
			expect(mockedAnalyticsApi.getOverview).toHaveBeenCalledWith(undefined, undefined);
		});

		it('should load song usage stats with custom limit', async () => {
			mockedAnalyticsApi.getSongUsageStats.mockResolvedValue(mockSongUsageStats);

			await analyticsStore.loadSongUsageStats(50);

			expect(analyticsStore.songUsageStats).toEqual(mockSongUsageStats);
			expect(mockedAnalyticsApi.getSongUsageStats).toHaveBeenCalledWith(50, undefined, undefined);
		});

		it('should load service type stats', async () => {
			mockedAnalyticsApi.getServiceTypeStats.mockResolvedValue(mockServiceTypeStats);

			await analyticsStore.loadServiceTypeStats();

			expect(analyticsStore.serviceTypeStats).toEqual(mockServiceTypeStats);
		});

		it('should load key usage stats', async () => {
			mockedAnalyticsApi.getKeyUsageStats.mockResolvedValue(mockKeyUsageStats);

			await analyticsStore.loadKeyUsageStats();

			expect(analyticsStore.keyUsageStats).toEqual(mockKeyUsageStats);
		});

		it('should load usage trends with trend interval', async () => {
			analyticsStore.trendInterval = 'month';
			mockedAnalyticsApi.getUsageTrends.mockResolvedValue(mockUsageTrends);

			await analyticsStore.loadUsageTrends();

			expect(analyticsStore.usageTrends).toEqual(mockUsageTrends);
			expect(mockedAnalyticsApi.getUsageTrends).toHaveBeenCalledWith(undefined, undefined, 'month');
		});

		it('should load worship leader stats with custom limit', async () => {
			mockedAnalyticsApi.getWorshipLeaderStats.mockResolvedValue(mockWorshipLeaderStats);

			await analyticsStore.loadWorshipLeaderStats(5);

			expect(analyticsStore.worshipLeaderStats).toEqual(mockWorshipLeaderStats);
			expect(mockedAnalyticsApi.getWorshipLeaderStats).toHaveBeenCalledWith(5, undefined, undefined);
		});

		it('should handle errors in individual load methods', async () => {
			const error = new Error('API error');
			mockedAnalyticsApi.getOverview.mockRejectedValue(error);

			await expect(analyticsStore.loadOverview()).rejects.toThrow('API error');
		});
	});

	describe('date range filtering', () => {
		it('should set date range and reload analytics', async () => {
			mockedAnalyticsApi.getOverview.mockResolvedValue(mockOverview);
			mockedAnalyticsApi.getSongUsageStats.mockResolvedValue([]);
			mockedAnalyticsApi.getServiceTypeStats.mockResolvedValue([]);
			mockedAnalyticsApi.getKeyUsageStats.mockResolvedValue([]);
			mockedAnalyticsApi.getUsageTrends.mockResolvedValue([]);
			mockedAnalyticsApi.getWorshipLeaderStats.mockResolvedValue([]);

			await analyticsStore.setDateRange('2024-01-01', '2024-12-31');

			expect(analyticsStore.dateRange.from).toBe('2024-01-01');
			expect(analyticsStore.dateRange.to).toBe('2024-12-31');
			expect(mockedAnalyticsApi.getOverview).toHaveBeenCalledWith('2024-01-01', '2024-12-31');
		});

		it('should clear date range and reload analytics', async () => {
			analyticsStore.dateRange = { from: '2024-01-01', to: '2024-12-31' };
			
			mockedAnalyticsApi.getOverview.mockResolvedValue(mockOverview);
			mockedAnalyticsApi.getSongUsageStats.mockResolvedValue([]);
			mockedAnalyticsApi.getServiceTypeStats.mockResolvedValue([]);
			mockedAnalyticsApi.getKeyUsageStats.mockResolvedValue([]);
			mockedAnalyticsApi.getUsageTrends.mockResolvedValue([]);
			mockedAnalyticsApi.getWorshipLeaderStats.mockResolvedValue([]);

			await analyticsStore.clearDateRange();

			expect(analyticsStore.dateRange.from).toBe(null);
			expect(analyticsStore.dateRange.to).toBe(null);
			expect(mockedAnalyticsApi.getOverview).toHaveBeenCalledWith(undefined, undefined);
		});
	});

	describe('trend interval', () => {
		it('should set trend interval and reload trends', async () => {
			mockedAnalyticsApi.getUsageTrends.mockResolvedValue(mockUsageTrends);

			await analyticsStore.setTrendInterval('month');

			expect(analyticsStore.trendInterval).toBe('month');
			expect(mockedAnalyticsApi.getUsageTrends).toHaveBeenCalledWith(undefined, undefined, 'month');
		});

		it('should not reload trends if interval is the same', async () => {
			analyticsStore.trendInterval = 'week';

			await analyticsStore.setTrendInterval('week');

			expect(mockedAnalyticsApi.getUsageTrends).not.toHaveBeenCalled();
		});
	});

	describe('data export', () => {
		it('should export data as CSV and trigger download', async () => {
			const csvData = 'song,count\nAmazing Grace,15\n';
			mockedAnalyticsApi.exportToCSV.mockResolvedValue(csvData);

			await analyticsStore.exportData('songs');

			expect(analyticsStore.exportLoading).toBe(false);
			expect(mockedAnalyticsApi.exportToCSV).toHaveBeenCalledWith('songs', undefined, undefined);
			expect(mockDocument.createElement).toHaveBeenCalledWith('a');
			expect(mockElement.click).toHaveBeenCalled();
		});

		it('should handle export errors', async () => {
			const error = new Error('Export failed');
			mockedAnalyticsApi.exportToCSV.mockRejectedValue(error);

			await analyticsStore.exportData('songs');

			expect(analyticsStore.exportLoading).toBe(false);
			expect(analyticsStore.error).toBe('Export failed');
		});

		it('should include date range in export filename', async () => {
			analyticsStore.dateRange = { from: '2024-01-01', to: '2024-12-31' };
			const csvData = 'data';
			mockedAnalyticsApi.exportToCSV.mockResolvedValue(csvData);

			await analyticsStore.exportData('leaders');

			expect(mockedAnalyticsApi.exportToCSV).toHaveBeenCalledWith('leaders', '2024-01-01', '2024-12-31');
			expect(mockElement.setAttribute).toHaveBeenCalledWith(
				'download',
				expect.stringContaining('worshipwise-leaders-analytics-')
			);
		});
	});

	describe('refresh sections', () => {
		it('should refresh overview section', async () => {
			mockedAnalyticsApi.getOverview.mockResolvedValue(mockOverview);

			await analyticsStore.refreshSection('overview');

			expect(mockedAnalyticsApi.getOverview).toHaveBeenCalled();
			expect(analyticsStore.error).toBe(null);
		});

		it('should refresh songs section', async () => {
			mockedAnalyticsApi.getSongUsageStats.mockResolvedValue(mockSongUsageStats);

			await analyticsStore.refreshSection('songs');

			expect(mockedAnalyticsApi.getSongUsageStats).toHaveBeenCalled();
		});

		it('should refresh all sections', async () => {
			const sections = ['overview', 'songs', 'services', 'keys', 'trends', 'leaders'] as const;
			mockedAnalyticsApi.getOverview.mockResolvedValue(mockOverview);
			mockedAnalyticsApi.getSongUsageStats.mockResolvedValue([]);
			mockedAnalyticsApi.getServiceTypeStats.mockResolvedValue([]);
			mockedAnalyticsApi.getKeyUsageStats.mockResolvedValue([]);
			mockedAnalyticsApi.getUsageTrends.mockResolvedValue([]);
			mockedAnalyticsApi.getWorshipLeaderStats.mockResolvedValue([]);

			for (const section of sections) {
				await analyticsStore.refreshSection(section);
			}

			expect(mockedAnalyticsApi.getOverview).toHaveBeenCalled();
			expect(mockedAnalyticsApi.getSongUsageStats).toHaveBeenCalled();
			expect(mockedAnalyticsApi.getServiceTypeStats).toHaveBeenCalled();
			expect(mockedAnalyticsApi.getKeyUsageStats).toHaveBeenCalled();
			expect(mockedAnalyticsApi.getUsageTrends).toHaveBeenCalled();
			expect(mockedAnalyticsApi.getWorshipLeaderStats).toHaveBeenCalled();
		});

		it('should handle errors when refreshing sections', async () => {
			const error = new Error('Refresh failed');
			mockedAnalyticsApi.getOverview.mockRejectedValue(error);

			await analyticsStore.refreshSection('overview');

			expect(analyticsStore.error).toBe('Refresh failed');
		});
	});

	describe('derived values', () => {
		it('should calculate hasData correctly', () => {
			expect(analyticsStore.hasData).toBe(false);

			analyticsStore.overview = mockOverview;
			expect(analyticsStore.hasData).toBe(true);

			analyticsStore.overview = null;
			analyticsStore.songUsageStats = mockSongUsageStats;
			expect(analyticsStore.hasData).toBe(true);
		});

		it('should calculate isDateFiltered correctly', () => {
			expect(analyticsStore.isDateFiltered).toBe(false);

			analyticsStore.dateRange.from = '2024-01-01';
			expect(analyticsStore.isDateFiltered).toBe(true);

			analyticsStore.dateRange.from = null;
			analyticsStore.dateRange.to = '2024-12-31';
			expect(analyticsStore.isDateFiltered).toBe(true);
		});

		it('should generate dateRangeText correctly', () => {
			expect(analyticsStore.dateRangeText).toBe('All Time');

			analyticsStore.dateRange = { from: '2024-01-01', to: '2024-12-31' };
			expect(analyticsStore.dateRangeText).toContain('1/1/2024 - 12/31/2024');

			analyticsStore.dateRange = { from: '2024-01-01', to: null };
			expect(analyticsStore.dateRangeText).toContain('1/1/2024 - Today');

			analyticsStore.dateRange = { from: null, to: '2024-12-31' };
			expect(analyticsStore.dateRangeText).toContain('Beginning - 12/31/2024');
		});

		it('should get most popular song', () => {
			expect(analyticsStore.mostPopularSong).toBe(null);

			analyticsStore.songUsageStats = mockSongUsageStats;
			expect(analyticsStore.mostPopularSong).toEqual(mockSongUsageStats[0]);
		});

		it('should get most used key', () => {
			expect(analyticsStore.mostUsedKey).toBe(null);

			analyticsStore.keyUsageStats = mockKeyUsageStats;
			expect(analyticsStore.mostUsedKey).toEqual(mockKeyUsageStats[0]);
		});

		it('should get most active leader', () => {
			expect(analyticsStore.mostActiveLeader).toBe(null);

			analyticsStore.worshipLeaderStats = mockWorshipLeaderStats;
			expect(analyticsStore.mostActiveLeader).toEqual(mockWorshipLeaderStats[0]);
		});
	});

	describe('insights generation', () => {
		it('should return empty insights when no data', () => {
			const insights = analyticsStore.getInsights();
			expect(insights).toEqual([]);
		});

		it('should generate song usage insights', () => {
			analyticsStore.songUsageStats = mockSongUsageStats;

			const insights = analyticsStore.getInsights();

			expect(insights).toContain('"Amazing Grace" is your most popular song with 15 uses');
			expect(insights).toContain('1 songs haven\'t been used in over 2 months');
		});

		it('should generate service type insights', () => {
			analyticsStore.serviceTypeStats = mockServiceTypeStats;

			const insights = analyticsStore.getInsights();

			expect(insights).toContain('Sunday Morning is your most common service type (30 services)');
		});

		it('should generate key usage insights', () => {
			analyticsStore.keyUsageStats = mockKeyUsageStats;

			const insights = analyticsStore.getInsights();

			expect(insights).toContain('C is your most used key (35% of songs)');
		});

		it('should generate key variety insights', () => {
			analyticsStore.keyUsageStats = [mockKeyUsageStats[0]]; // Only one key

			const insights = analyticsStore.getInsights();

			expect(insights).toContain('Consider using more key variety - you\'re only using 1 different keys');
		});

		it('should generate usage trend insights', () => {
			const trendData = [
				{ period: '2024-W01', usageCount: 10, uniqueSongs: 8, avgServiceLength: 3000 },
				{ period: '2024-W02', usageCount: 12, uniqueSongs: 9, avgServiceLength: 3100 },
				{ period: '2024-W03', usageCount: 14, uniqueSongs: 10, avgServiceLength: 3200 },
				{ period: '2024-W04', usageCount: 20, uniqueSongs: 12, avgServiceLength: 3300 } // High usage
			];
			analyticsStore.usageTrends = trendData;

			const insights = analyticsStore.getInsights();

			expect(insights).toContain('Song usage is trending upward - your worship ministry is growing!');
		});

		it('should generate downward trend insights', () => {
			const trendData = [
				{ period: '2024-W01', usageCount: 20, uniqueSongs: 12, avgServiceLength: 3300 },
				{ period: '2024-W02', usageCount: 18, uniqueSongs: 11, avgServiceLength: 3200 },
				{ period: '2024-W03', usageCount: 16, uniqueSongs: 10, avgServiceLength: 3100 },
				{ period: '2024-W04', usageCount: 8, uniqueSongs: 6, avgServiceLength: 3000 } // Low usage
			];
			analyticsStore.usageTrends = trendData;

			const insights = analyticsStore.getInsights();

			expect(insights).toContain('Song usage has decreased recently - consider more varied services');
		});

		it('should generate overview insights', () => {
			analyticsStore.overview = { ...mockOverview, avgSongsPerService: 3 };

			const insights = analyticsStore.getInsights();

			expect(insights).toContain('Your services are quite short - consider adding more songs for variety');

			analyticsStore.overview = { ...mockOverview, avgSongsPerService: 10 };

			const newInsights = analyticsStore.getInsights();

			expect(newInsights).toContain('Your services are quite long - ensure you have enough time for all songs');
		});

		it('should limit insights to top 5', () => {
			// Set up data to generate many insights
			analyticsStore.overview = mockOverview;
			analyticsStore.songUsageStats = mockSongUsageStats;
			analyticsStore.serviceTypeStats = mockServiceTypeStats;
			analyticsStore.keyUsageStats = [mockKeyUsageStats[0]]; // Limited keys
			analyticsStore.usageTrends = [
				{ period: '2024-W01', usageCount: 10, uniqueSongs: 8, avgServiceLength: 3000 },
				{ period: '2024-W02', usageCount: 12, uniqueSongs: 9, avgServiceLength: 3100 },
				{ period: '2024-W03', usageCount: 14, uniqueSongs: 10, avgServiceLength: 3200 },
				{ period: '2024-W04', usageCount: 20, uniqueSongs: 12, avgServiceLength: 3300 }
			];

			const insights = analyticsStore.getInsights();

			expect(insights.length).toBeLessThanOrEqual(5);
		});
	});

	describe('error handling', () => {
		it('should clear error state', () => {
			analyticsStore.error = 'Test error';
			analyticsStore.clearError();
			expect(analyticsStore.error).toBe(null);
		});

		it('should handle different error types', () => {
			const store = analyticsStore as any;

			// API error with response
			const apiError = {
				response: { data: { message: 'API error' } }
			};
			expect(store.getErrorMessage(apiError)).toBe('API error');

			// Error with message
			const simpleError = { message: 'Simple error' };
			expect(store.getErrorMessage(simpleError)).toBe('Simple error');

			// Unknown error
			expect(store.getErrorMessage('string error')).toBe('An unexpected error occurred while loading analytics');
		});
	});
});