import { describe, it, expect, beforeEach, vi, type MockedFunction } from 'vitest';
import { recommendationsStore } from './recommendations.svelte';
import {
	recommendationsApi,
	type SongRecommendation,
	type WorshipFlowSuggestion,
	type ServiceBalanceAnalysis,
	type SeasonalTrend,
	type ComparativePeriod
} from '$lib/api/recommendations';

// Mock the recommendations API
vi.mock('$lib/api/recommendations', () => ({
	recommendationsApi: {
		getSongRecommendations: vi.fn(),
		getWorshipFlowSuggestions: vi.fn(),
		analyzeServiceBalance: vi.fn(),
		getSeasonalTrends: vi.fn(),
		getComparativePeriodAnalysis: vi.fn(),
		getWorshipInsights: vi.fn()
	}
}));

const mockedRecommendationsApi = recommendationsApi as {
	getSongRecommendations: MockedFunction<any>;
	getWorshipFlowSuggestions: MockedFunction<any>;
	analyzeServiceBalance: MockedFunction<any>;
	getSeasonalTrends: MockedFunction<any>;
	getComparativePeriodAnalysis: MockedFunction<any>;
	getWorshipInsights: MockedFunction<any>;
};

describe('RecommendationsStore', () => {
	const mockSongRecommendations: SongRecommendation[] = [
		{
			songId: 'song-1',
			title: 'Amazing Grace',
			artist: 'Traditional',
			type: 'rotation',
			score: 0.9,
			reason: 'Not used in 45 days',
			metadata: {
				daysSinceLastUse: 45,
				isNew: false,
				keySignature: 'C',
				tempo: 120
			}
		},
		{
			songId: 'song-2',
			title: 'Silent Night',
			artist: 'Franz Gruber',
			type: 'seasonal',
			score: 0.8,
			reason: 'Perfect for Christmas season',
			metadata: {
				daysSinceLastUse: 365,
				isNew: false,
				keySignature: 'G',
				tempo: 100
			}
		},
		{
			songId: 'song-3',
			title: 'New Song',
			artist: 'Modern Artist',
			type: 'rotation',
			score: 0.7,
			reason: 'Recently added, ready to introduce',
			metadata: {
				daysSinceLastUse: null,
				isNew: true,
				keySignature: 'D',
				tempo: 140
			}
		},
		{
			songId: 'song-4',
			title: 'Flow Song',
			artist: 'Artist',
			type: 'flow',
			score: 0.6,
			reason: 'Good transition song',
			metadata: {
				daysSinceLastUse: 20,
				isNew: false,
				keySignature: 'C',
				tempo: 120
			}
		}
	];

	const mockFlowSuggestions: WorshipFlowSuggestion[] = [
		{
			position: 'after_song_2',
			suggestion: 'Consider a slower transition',
			reason: 'Large tempo change from 140 to 80 BPM',
			priority: 'high',
			songSuggestions: ['song-bridge-1']
		},
		{
			position: 'before_song_4',
			suggestion: 'Add bridge song',
			reason: 'Key change from G to D might be difficult',
			priority: 'medium',
			songSuggestions: ['song-bridge-2']
		}
	];

	const mockServiceBalance: ServiceBalanceAnalysis = {
		serviceId: 'service-1',
		balanceScore: 0.7,
		analysis: {
			tempoVariation: 'moderate',
			keyProgression: 'good',
			energyFlow: 'needs_improvement'
		},
		recommendations: [
			'Consider adding a slower song after the opening',
			'The key changes are well-planned'
		],
		metadata: {
			avgTempo: 125,
			tempoRange: { min: 80, max: 160 },
			keyDistribution: { C: 2, G: 1, D: 1 }
		}
	};

	const mockSeasonalTrends: SeasonalTrend[] = [
		{
			season: 'Christmas',
			period: { start: '2024-12-01', end: '2024-12-31' },
			trendingSongs: ['Silent Night', 'O Holy Night'],
			popularThemes: ['birth', 'peace', 'joy'],
			recommendedKeys: ['G', 'C', 'F'],
			avgTempo: 100
		}
	];

	const mockComparativePeriod: ComparativePeriod = {
		currentPeriod: {
			start: '2024-01-01',
			end: '2024-01-31',
			songCount: 25,
			uniqueSongs: 20,
			avgRating: 4.5
		},
		previousPeriod: {
			start: '2023-12-01',
			end: '2023-12-31',
			songCount: 20,
			uniqueSongs: 18,
			avgRating: 4.3
		},
		comparison: {
			songCountChange: 5,
			uniqueSongsChange: 2,
			ratingChange: 0.2,
			insights: ['More songs used this period', 'Higher ratings overall']
		}
	};

	const mockWorshipInsights = {
		rotationHealth: 0.8,
		diversityScore: 0.7,
		seasonalAlignment: 0.9,
		recommendations: ['Introduce more contemporary songs', 'Improve key transitions']
	};

	beforeEach(() => {
		// Reset the store state
		recommendationsStore.loading = false;
		recommendationsStore.error = null;
		recommendationsStore.songRecommendations = [];
		recommendationsStore.worshipFlowSuggestions = [];
		recommendationsStore.serviceBalanceAnalysis = null;
		recommendationsStore.seasonalTrends = [];
		recommendationsStore.comparativePeriod = null;
		recommendationsStore.worshipInsights = null;
		recommendationsStore.recommendationFilters = {
			excludeRecentDays: 28,
			limit: 10
		};

		// Reset all mocks
		vi.clearAllMocks();
	});

	describe('loadSongRecommendations', () => {
		it('should load song recommendations successfully', async () => {
			mockedRecommendationsApi.getSongRecommendations.mockResolvedValue(mockSongRecommendations);

			await recommendationsStore.loadSongRecommendations();

			expect(recommendationsStore.songRecommendations).toEqual(mockSongRecommendations);
			expect(recommendationsStore.loading).toBe(false);
			expect(recommendationsStore.error).toBe(null);
			expect(mockedRecommendationsApi.getSongRecommendations).toHaveBeenCalledWith(
				recommendationsStore.recommendationFilters
			);
		});

		it('should handle loading state correctly', async () => {
			mockedRecommendationsApi.getSongRecommendations.mockImplementation(async () => {
				expect(recommendationsStore.loading).toBe(true);
				return mockSongRecommendations;
			});

			await recommendationsStore.loadSongRecommendations();

			expect(recommendationsStore.loading).toBe(false);
		});

		it('should handle errors when loading recommendations', async () => {
			const error = new Error('Network error');
			mockedRecommendationsApi.getSongRecommendations.mockRejectedValue(error);

			await recommendationsStore.loadSongRecommendations();

			expect(recommendationsStore.songRecommendations).toEqual([]);
			expect(recommendationsStore.loading).toBe(false);
			expect(recommendationsStore.error).toBe('Network error');
		});

		it('should handle non-Error exceptions', async () => {
			mockedRecommendationsApi.getSongRecommendations.mockRejectedValue('String error');

			await recommendationsStore.loadSongRecommendations();

			expect(recommendationsStore.error).toBe('Failed to load recommendations');
		});
	});

	describe('loadWorshipFlowSuggestions', () => {
		it('should load flow suggestions successfully', async () => {
			mockedRecommendationsApi.getWorshipFlowSuggestions.mockResolvedValue(mockFlowSuggestions);

			await recommendationsStore.loadWorshipFlowSuggestions('service-1');

			expect(recommendationsStore.worshipFlowSuggestions).toEqual(mockFlowSuggestions);
			expect(recommendationsStore.loading).toBe(false);
			expect(recommendationsStore.error).toBe(null);
			expect(mockedRecommendationsApi.getWorshipFlowSuggestions).toHaveBeenCalledWith('service-1');
		});

		it('should handle loading without service ID', async () => {
			mockedRecommendationsApi.getWorshipFlowSuggestions.mockResolvedValue(mockFlowSuggestions);

			await recommendationsStore.loadWorshipFlowSuggestions();

			expect(mockedRecommendationsApi.getWorshipFlowSuggestions).toHaveBeenCalledWith(undefined);
		});

		it('should handle errors when loading flow suggestions', async () => {
			const error = new Error('API error');
			mockedRecommendationsApi.getWorshipFlowSuggestions.mockRejectedValue(error);

			await recommendationsStore.loadWorshipFlowSuggestions('service-1');

			expect(recommendationsStore.error).toBe('API error');
		});
	});

	describe('analyzeServiceBalance', () => {
		it('should analyze service balance successfully', async () => {
			mockedRecommendationsApi.analyzeServiceBalance.mockResolvedValue(mockServiceBalance);

			await recommendationsStore.analyzeServiceBalance('service-1');

			expect(recommendationsStore.serviceBalanceAnalysis).toEqual(mockServiceBalance);
			expect(recommendationsStore.loading).toBe(false);
			expect(recommendationsStore.error).toBe(null);
			expect(mockedRecommendationsApi.analyzeServiceBalance).toHaveBeenCalledWith('service-1');
		});

		it('should handle errors when analyzing service balance', async () => {
			const error = new Error('Analysis failed');
			mockedRecommendationsApi.analyzeServiceBalance.mockRejectedValue(error);

			await recommendationsStore.analyzeServiceBalance('service-1');

			expect(recommendationsStore.error).toBe('Analysis failed');
		});
	});

	describe('loadSeasonalTrends', () => {
		it('should load seasonal trends successfully', async () => {
			mockedRecommendationsApi.getSeasonalTrends.mockResolvedValue(mockSeasonalTrends);

			await recommendationsStore.loadSeasonalTrends(2024);

			expect(recommendationsStore.seasonalTrends).toEqual(mockSeasonalTrends);
			expect(mockedRecommendationsApi.getSeasonalTrends).toHaveBeenCalledWith(2024);
		});

		it('should handle loading without year parameter', async () => {
			mockedRecommendationsApi.getSeasonalTrends.mockResolvedValue(mockSeasonalTrends);

			await recommendationsStore.loadSeasonalTrends();

			expect(mockedRecommendationsApi.getSeasonalTrends).toHaveBeenCalledWith(undefined);
		});

		it('should handle errors when loading seasonal trends', async () => {
			const error = new Error('Trends error');
			mockedRecommendationsApi.getSeasonalTrends.mockRejectedValue(error);

			await recommendationsStore.loadSeasonalTrends(2024);

			expect(recommendationsStore.error).toBe('Trends error');
		});
	});

	describe('loadComparativePeriodAnalysis', () => {
		it('should load comparative analysis successfully', async () => {
			const startDate = new Date('2024-01-01');
			const endDate = new Date('2024-01-31');
			mockedRecommendationsApi.getComparativePeriodAnalysis.mockResolvedValue(mockComparativePeriod);

			await recommendationsStore.loadComparativePeriodAnalysis(startDate, endDate);

			expect(recommendationsStore.comparativePeriod).toEqual(mockComparativePeriod);
			expect(mockedRecommendationsApi.getComparativePeriodAnalysis).toHaveBeenCalledWith(
				startDate,
				endDate
			);
		});

		it('should handle errors when loading comparative analysis', async () => {
			const error = new Error('Comparison failed');
			mockedRecommendationsApi.getComparativePeriodAnalysis.mockRejectedValue(error);

			await recommendationsStore.loadComparativePeriodAnalysis(
				new Date('2024-01-01'),
				new Date('2024-01-31')
			);

			expect(recommendationsStore.error).toBe('Comparison failed');
		});
	});

	describe('loadWorshipInsights', () => {
		it('should load worship insights successfully', async () => {
			mockedRecommendationsApi.getWorshipInsights.mockResolvedValue(mockWorshipInsights);

			await recommendationsStore.loadWorshipInsights();

			expect(recommendationsStore.worshipInsights).toEqual(mockWorshipInsights);
			expect(mockedRecommendationsApi.getWorshipInsights).toHaveBeenCalled();
		});

		it('should handle errors when loading worship insights', async () => {
			const error = new Error('Insights error');
			mockedRecommendationsApi.getWorshipInsights.mockRejectedValue(error);

			await recommendationsStore.loadWorshipInsights();

			expect(recommendationsStore.error).toBe('Insights error');
		});
	});

	describe('filter management', () => {
		it('should update filters', () => {
			const newFilters = { excludeRecentDays: 14, serviceType: 'Sunday Morning' };

			recommendationsStore.updateFilters(newFilters);

			expect(recommendationsStore.recommendationFilters).toEqual({
				excludeRecentDays: 14,
				serviceType: 'Sunday Morning',
				limit: 10
			});
		});

		it('should get personalized recommendations', async () => {
			mockedRecommendationsApi.getSongRecommendations.mockResolvedValue(mockSongRecommendations);

			await recommendationsStore.getPersonalizedRecommendations('leader-1');

			expect(recommendationsStore.recommendationFilters.worshipLeaderId).toBe('leader-1');
			expect(mockedRecommendationsApi.getSongRecommendations).toHaveBeenCalledWith(
				expect.objectContaining({ worshipLeaderId: 'leader-1' })
			);
		});
	});

	describe('derived values', () => {
		beforeEach(() => {
			recommendationsStore.songRecommendations = mockSongRecommendations;
			recommendationsStore.worshipFlowSuggestions = mockFlowSuggestions;
		});

		it('should filter rotation recommendations', () => {
			const rotationRecs = recommendationsStore.rotationRecommendations;
			expect(rotationRecs).toHaveLength(2);
			expect(rotationRecs.every(r => r.type === 'rotation')).toBe(true);
		});

		it('should filter seasonal recommendations', () => {
			const seasonalRecs = recommendationsStore.seasonalRecommendations;
			expect(seasonalRecs).toHaveLength(1);
			expect(seasonalRecs[0].type).toBe('seasonal');
		});

		it('should filter flow recommendations', () => {
			const flowRecs = recommendationsStore.flowRecommendations;
			expect(flowRecs).toHaveLength(1);
			expect(flowRecs[0].type).toBe('flow');
		});

		it('should filter key compatibility recommendations', () => {
			const keyRecs = recommendationsStore.keyCompatibilityRecommendations;
			expect(keyRecs).toHaveLength(0); // No key_compatibility type in mock data
		});

		it('should identify high priority flow suggestions', () => {
			const highPriorityFlows = recommendationsStore.highPriorityFlowSuggestions;
			expect(highPriorityFlows).toHaveLength(2); // Both contain 'Large tempo change' or 'difficult'
		});
	});

	describe('recommendation analysis methods', () => {
		beforeEach(() => {
			recommendationsStore.songRecommendations = mockSongRecommendations;
			recommendationsStore.serviceBalanceAnalysis = mockServiceBalance;
		});

		it('should get quick rotation suggestions sorted by days since last use', () => {
			const quickSuggestions = recommendationsStore.getQuickRotationSuggestions(3);

			expect(quickSuggestions).toHaveLength(2); // Only rotation type songs
			expect(quickSuggestions[0].metadata?.daysSinceLastUse).toBe(45); // Sorted by days desc
		});

		it('should get current season recommendations with high scores', () => {
			const seasonalRecs = recommendationsStore.getCurrentSeasonRecommendations();
			expect(seasonalRecs).toHaveLength(1);
			expect(seasonalRecs[0].score).toBeGreaterThan(0.7);
		});

		it('should check if service balance needs attention', () => {
			expect(recommendationsStore.needsBalanceAttention()).toBe(true);

			recommendationsStore.serviceBalanceAnalysis = null;
			expect(recommendationsStore.needsBalanceAttention()).toBe(false);

			recommendationsStore.serviceBalanceAnalysis = {
				...mockServiceBalance,
				recommendations: []
			};
			expect(recommendationsStore.needsBalanceAttention()).toBe(false);
		});
	});

	describe('summary insights', () => {
		beforeEach(() => {
			recommendationsStore.songRecommendations = [
				...mockSongRecommendations,
				{
					songId: 'song-overdue',
					title: 'Overdue Song',
					artist: 'Artist',
					type: 'rotation',
					score: 0.9,
					reason: 'Long overdue',
					metadata: {
						daysSinceLastUse: 75, // Over 60 days
						isNew: false
					}
				}
			];
			recommendationsStore.worshipFlowSuggestions = mockFlowSuggestions;
			recommendationsStore.serviceBalanceAnalysis = mockServiceBalance;
		});

		it('should generate comprehensive summary insights', () => {
			const insights = recommendationsStore.getSummaryInsights();

			expect(insights).toContain('1 songs haven\'t been used in over 2 months');
			expect(insights).toContain('1 new songs ready to be introduced');
			expect(insights).toContain('2 worship flow issues detected');
			expect(insights).toContain('Service tempo balance could be improved');
			expect(insights).toContain('1 songs perfect for current season');
		});

		it('should handle empty data gracefully', () => {
			recommendationsStore.songRecommendations = [];
			recommendationsStore.worshipFlowSuggestions = [];
			recommendationsStore.serviceBalanceAnalysis = null;

			const insights = recommendationsStore.getSummaryInsights();

			expect(insights).toEqual([]);
		});

		it('should only include seasonal insights for high-scoring songs', () => {
			// Mock seasonal recommendation with low score
			recommendationsStore.songRecommendations = [
				{
					songId: 'low-score-seasonal',
					title: 'Low Score Seasonal',
					artist: 'Artist',
					type: 'seasonal',
					score: 0.5, // Below 0.7 threshold
					reason: 'Seasonal but low score',
					metadata: {}
				}
			];

			const insights = recommendationsStore.getSummaryInsights();

			expect(insights).not.toContain('1 songs perfect for current season');
		});
	});

	describe('data management', () => {
		it('should clear all data', () => {
			// Set some data
			recommendationsStore.songRecommendations = mockSongRecommendations;
			recommendationsStore.worshipFlowSuggestions = mockFlowSuggestions;
			recommendationsStore.serviceBalanceAnalysis = mockServiceBalance;
			recommendationsStore.seasonalTrends = mockSeasonalTrends;
			recommendationsStore.comparativePeriod = mockComparativePeriod;
			recommendationsStore.error = 'Some error';

			recommendationsStore.clear();

			expect(recommendationsStore.songRecommendations).toEqual([]);
			expect(recommendationsStore.worshipFlowSuggestions).toEqual([]);
			expect(recommendationsStore.serviceBalanceAnalysis).toBe(null);
			expect(recommendationsStore.seasonalTrends).toEqual([]);
			expect(recommendationsStore.comparativePeriod).toBe(null);
			expect(recommendationsStore.error).toBe(null);
		});
	});

	describe('edge cases and error handling', () => {
		it('should handle recommendations with missing metadata', () => {
			const recommendationsWithMissingData = [
				{
					songId: 'incomplete-song',
					title: 'Incomplete Song',
					artist: 'Artist',
					type: 'rotation' as const,
					score: 0.8,
					reason: 'Test',
					metadata: {} // Empty metadata
				}
			];

			recommendationsStore.songRecommendations = recommendationsWithMissingData;

			const quickSuggestions = recommendationsStore.getQuickRotationSuggestions();
			expect(quickSuggestions).toHaveLength(1);

			const insights = recommendationsStore.getSummaryInsights();
			expect(insights).not.toContain('songs haven\'t been used in over 2 months');
		});

		it('should handle null/undefined values in metadata gracefully', () => {
			const recommendationsWithNullData = [
				{
					songId: 'null-data-song',
					title: 'Null Data Song',
					artist: 'Artist',
					type: 'rotation' as const,
					score: 0.8,
					reason: 'Test',
					metadata: {
						daysSinceLastUse: null,
						isNew: null
					}
				}
			];

			recommendationsStore.songRecommendations = recommendationsWithNullData;

			const quickSuggestions = recommendationsStore.getQuickRotationSuggestions();
			expect(quickSuggestions).toHaveLength(1);

			const insights = recommendationsStore.getSummaryInsights();
			expect(insights).not.toContain('new songs ready to be introduced');
		});
	});
});