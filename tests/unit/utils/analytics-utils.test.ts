import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
	CHART_COLORS,
	CHART_COLOR_PALETTE,
	aggregateUsageData,
	calculateTrends,
	formatBarChartData,
	formatLineChartData,
	formatPieChartData,
	formatDateLabel,
	generateInsights,
	categorizeUsageFrequency,
	calculateKeyUsageStats,
	getDefaultChartOptions,
	exportToCSV
} from '$lib/utils/analytics-utils';

describe('Analytics Utils', () => {
	describe('Constants', () => {
		it('should have chart colors defined', () => {
			expect(CHART_COLORS.primary).toBeDefined();
			expect(CHART_COLORS.secondary).toBeDefined();
			expect(CHART_COLOR_PALETTE).toHaveLength(8);
		});
	});

	describe('aggregateUsageData', () => {
		const mockSongs = [
			{ 
				id: '1', 
				title: 'Song 1',
				created_by: 'user1',
				is_active: true,
				created: '2023-01-01T00:00:00Z',
				updated: '2023-01-01T00:00:00Z'
			},
			{ 
				id: '2', 
				title: 'Song 2',
				created_by: 'user1', 
				is_active: true,
				created: '2023-01-01T00:00:00Z',
				updated: '2023-01-01T00:00:00Z'
			}
		];

		const mockServices = [
			{
				id: '1',
				status: 'completed',
				actual_duration: 60,
				service_type: 'Sunday Morning',
				worship_leader: 'leader1'
			},
			{
				id: '2',
				status: 'completed',
				estimated_duration: 45,
				service_type: 'Sunday Morning',
				worship_leader: 'leader2'
			},
			{ id: '3', status: 'draft', service_type: 'Wednesday Night', worship_leader: 'leader1' }
		];

		const mockUsageData = [
			{ song_id: '1', title: 'Song 1', usage_count: 1 },
			{ song_id: '1', title: 'Song 1', usage_count: 1 },
			{ song_id: '2', title: 'Song 2', usage_count: 1 }
		];

		it('should aggregate data correctly', () => {
			const overview = aggregateUsageData(mockSongs, mockServices, mockUsageData);

			expect(overview.totalSongs).toBe(2);
			expect(overview.totalServices).toBe(3);
			expect(overview.averageServiceDuration).toBe(52.5); // (60 + 45) / 2
			expect(overview.mostUsedSong.title).toBe('Song 1');
			expect(overview.mostUsedSong.count).toBe(2);
			expect(overview.topServiceType.type).toBe('Sunday Morning');
			expect(overview.topServiceType.count).toBe(2);
			expect(overview.activeWorshipLeaders).toBe(2);
		});

		it('should handle empty data', () => {
			const overview = aggregateUsageData([], [], []);

			expect(overview.totalSongs).toBe(0);
			expect(overview.totalServices).toBe(0);
			expect(overview.averageServiceDuration).toBe(0);
			expect(overview.mostUsedSong.title).toBe('No data');
			expect(overview.activeWorshipLeaders).toBe(0);
		});
	});

	describe('calculateTrends', () => {
		const mockUsageData = [
			{ song_id: '1', title: 'Song 1', usage_count: 1, last_used: '2024-01-01T10:00:00Z' },
			{ song_id: '2', title: 'Song 2', usage_count: 1, last_used: '2024-01-01T11:00:00Z' },
			{ song_id: '3', title: 'Song 3', usage_count: 1, last_used: '2024-01-02T10:00:00Z' },
			{ song_id: '4', title: 'Song 4', usage_count: 1, last_used: '2024-01-05T10:00:00Z' }
		];

		it('should calculate trends within date range', () => {
			const trends = calculateTrends(mockUsageData, {
				start: '2024-01-01',
				end: '2024-01-02'
			});

			expect(trends).toHaveLength(2);
			expect(trends[0]).toEqual({ date: '2024-01-01', count: 2 });
			expect(trends[1]).toEqual({ date: '2024-01-02', count: 1 });
		});

		it('should filter out data outside range', () => {
			const trends = calculateTrends(mockUsageData, {
				start: '2024-01-01',
				end: '2024-01-01'
			});

			expect(trends).toHaveLength(1);
			expect(trends[0]).toEqual({ date: '2024-01-01', count: 2 });
		});

		it('should handle empty data', () => {
			const trends = calculateTrends([], {
				start: '2024-01-01',
				end: '2024-01-02'
			});

			expect(trends).toHaveLength(0);
		});
	});

	describe('formatBarChartData', () => {
		it('should format data for bar chart', () => {
			const data = [
				{ label: 'A', value: 10 },
				{ label: 'B', value: 20 }
			];

			const chartData = formatBarChartData(data, { title: 'Test Chart' });

			expect(chartData.labels).toEqual(['A', 'B']);
			expect(chartData.datasets[0].data).toEqual([10, 20]);
			expect(chartData.datasets[0].label).toBe('Test Chart');
		});

		it('should use default options', () => {
			const data = [{ label: 'A', value: 10 }];
			const chartData = formatBarChartData(data);

			expect(chartData.datasets[0].label).toBe('Data');
			expect(chartData.datasets[0].backgroundColor).toBe(CHART_COLORS.primary);
		});
	});

	describe('formatLineChartData', () => {
		it('should format data for line chart', () => {
			const data = [
				{ date: '2024-01-01', count: 5 },
				{ date: '2024-01-02', count: 8 }
			];

			const chartData = formatLineChartData(data, { title: 'Trend Chart' });

			expect(chartData.labels).toHaveLength(2);
			expect(chartData.datasets[0].data).toEqual([5, 8]);
			expect(chartData.datasets[0].label).toBe('Trend Chart');
			expect(chartData.datasets[0].fill).toBe(true);
		});
	});

	describe('formatPieChartData', () => {
		it('should format data for pie chart', () => {
			const data = [
				{ label: 'A', value: 30 },
				{ label: 'B', value: 70 }
			];

			const chartData = formatPieChartData(data, { title: 'Distribution' });

			expect(chartData.labels).toEqual(['A', 'B']);
			expect(chartData.datasets[0].data).toEqual([30, 70]);
			expect(chartData.datasets[0].backgroundColor).toHaveLength(2);
		});
	});

	describe('formatDateLabel', () => {
		it('should format date labels correctly', () => {
			expect(formatDateLabel('2024-01-01')).toBe('Jan 1');
			expect(formatDateLabel('2024-12-25')).toBe('Dec 25');
		});
	});

	describe('generateInsights', () => {
		it('should generate insights for popular song', () => {
			const overview = {
				totalSongs: 10,
				totalServices: 5,
				averageServiceDuration: 60,
				mostUsedSong: { title: 'Amazing Grace', count: 8 },
				topServiceType: { type: 'Sunday Morning', count: 3 },
				activeWorshipLeaders: 2
			};

			const insights = generateInsights(overview, [], { start: '2024-01-01', end: '2024-01-31' });

			expect(insights).toContain('"Amazing Grace" is your most popular song with 8 uses');
		});

		it('should generate insights for service duration', () => {
			const overview = {
				totalSongs: 10,
				totalServices: 5,
				averageSetlistDuration: 100,
				averageServiceDuration: 95,
				mostUsedSong: { title: 'Song', count: 1 },
				topServiceType: { type: 'Sunday Morning', count: 1 },
				activeWorshipLeaders: 2
			};

			const insights = generateInsights(overview, [], { start: '2024-01-01', end: '2024-01-31' });

			expect(insights).toContain('Your services tend to run longer than average (90+ minutes)');
		});

		it('should generate insights for leadership', () => {
			const overview = {
				totalSongs: 10,
				totalServices: 5,
				averageServiceDuration: 60,
				mostUsedSong: { title: 'Song', count: 1 },
				topServiceType: { type: 'Sunday Morning', count: 1 },
				activeWorshipLeaders: 1
			};

			const insights = generateInsights(overview, [], { start: '2024-01-01', end: '2024-01-31' });

			expect(insights).toContain('Consider developing additional worship leaders for variety');
		});
	});

	describe('categorizeUsageFrequency', () => {
		it('should categorize usage frequency', () => {
			// Create multiple entries for each song to simulate actual usage
			const expandedUsageData = [
				...Array(12).fill({ song_id: '1', title: 'Frequent Song', usage_count: 1 }),
				...Array(5).fill({ song_id: '2', title: 'Moderate Song', usage_count: 1 }),
				...Array(2).fill({ song_id: '3', title: 'Rare Song', usage_count: 1 })
			];

			const categories = categorizeUsageFrequency(expandedUsageData);

			expect(categories.frequent.length).toBeGreaterThan(0);
			expect(categories.moderate.length).toBeGreaterThan(0);
			expect(categories.rare.length).toBeGreaterThan(0);
			// Note: unused will be 0 since we don't have any songs with 0 usage count
			expect(categories.unused.length).toBe(0);
		});
	});

	describe('calculateKeyUsageStats', () => {
		const mockUsageData = [
			{ song_id: '1', title: 'Song 1', usage_count: 1, used_key: 'G' },
			{ song_id: '2', title: 'Song 2', usage_count: 1, used_key: 'G' },
			{ song_id: '3', title: 'Song 3', usage_count: 1, used_key: 'C' },
			{ song_id: '4', title: 'Song 4', usage_count: 1, used_key: undefined }
		];

		it('should calculate key usage statistics', () => {
			const stats = calculateKeyUsageStats(mockUsageData);

			expect(stats).toHaveLength(3);
			expect(stats[0]).toEqual({ key: 'G', count: 2, percentage: 50 });
			expect(stats[1]).toEqual({ key: 'C', count: 1, percentage: 25 });
			expect(stats[2]).toEqual({ key: 'Unknown', count: 1, percentage: 25 });
		});

		it('should handle empty data', () => {
			const stats = calculateKeyUsageStats([]);
			expect(stats).toHaveLength(0);
		});
	});

	describe('getDefaultChartOptions', () => {
		it('should return bar chart options by default', () => {
			const options = getDefaultChartOptions();
			expect((options as any).scales).toBeDefined();
			expect(options.responsive).toBe(true);
		});

		it('should return pie chart options', () => {
			const options = getDefaultChartOptions('pie');
			expect((options as any).scales).toBeUndefined();
			expect(options.responsive).toBe(true);
		});

		it('should return line chart options', () => {
			const options = getDefaultChartOptions('line');
			expect((options as any).scales).toBeDefined();
		});
	});

	describe('exportToCSV', () => {
		let mockBlob: any;
		let mockURL: any;
		let mockLink: any;

		beforeEach(() => {
			// Mock Blob constructor
			mockBlob = vi.fn().mockImplementation(() => ({}));
			globalThis.Blob = mockBlob as any;

			// Mock URL.createObjectURL
			mockURL = {
				createObjectURL: vi.fn().mockReturnValue('blob:mock-url')
			};
			globalThis.URL = mockURL as any;

			// Mock document.createElement
			mockLink = {
				click: vi.fn(),
				setAttribute: vi.fn(),
				style: {}
			};

			globalThis.document = {
				createElement: vi.fn().mockReturnValue(mockLink),
				body: {
					appendChild: vi.fn(),
					removeChild: vi.fn()
				}
			} as any;
		});

		it('should export data to CSV', () => {
			const data = [
				{ name: 'John', age: 30, city: 'New York' },
				{ name: 'Jane', age: 25, city: 'Boston' }
			];

			// Just test that the function runs without throwing
			expect(() => exportToCSV(data, 'test.csv')).not.toThrow();

			// Test that blob was created with correct data
			expect(mockBlob).toHaveBeenCalledWith(['name,age,city\nJohn,30,New York\nJane,25,Boston'], {
				type: 'text/csv;charset=utf-8;'
			});
		});

		it('should handle data with commas and quotes', () => {
			const data = [{ name: 'John, Jr.', description: 'A "great" person' }];

			exportToCSV(data);

			expect(mockBlob).toHaveBeenCalledWith(
				['name,description\n"John, Jr.","A ""great"" person"'],
				{ type: 'text/csv;charset=utf-8;' }
			);
		});

		it('should handle empty data', () => {
			exportToCSV([]);
			expect(mockBlob).not.toHaveBeenCalled();
		});
	});
});
