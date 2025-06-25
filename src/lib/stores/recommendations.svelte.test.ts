import { describe, it, expect, beforeEach, vi } from 'vitest';
import { recommendationsStore } from './recommendations.svelte';
import type {
	SongRecommendation,
	WorshipFlowSuggestion,
	ServiceBalanceAnalysis,
	SeasonalTrend,
	ComparativePeriod
} from '$lib/api/recommendations';
import { mockPb } from '$tests/helpers/pb-mock';

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
			position: 2,
			suggestion: 'Consider a slower transition',
			reason: 'Large tempo change from 140 to 80 BPM',
			recommendedTempo: 'medium',
			recommendedKey: 'G'
		},
		{
			position: 4,
			suggestion: 'Add bridge song',
			reason: 'Key change from G to D might be difficult',
			recommendedTempo: 'slow',
			recommendedKey: 'A'
		}
	];

	const mockServiceBalance: ServiceBalanceAnalysis = {
		currentBalance: {
			fast: 2,
			medium: 3,
			slow: 1
		},
		recommendations: [
			'Consider adding a slower song after the opening',
			'The key changes are well-planned'
		],
		idealBalance: {
			fast: 2,
			medium: 2,
			slow: 2
		}
	};

	const mockSeasonalTrends: SeasonalTrend[] = [
		{
			season: 'Christmas',
			month: 12,
			popularSongs: [
				{
					songId: 'song-2',
					title: 'Silent Night',
					usageCount: 5,
					trend: 'increasing'
				},
				{
					songId: 'song-5',
					title: 'O Holy Night',
					usageCount: 3,
					trend: 'stable'
				}
			],
			suggestedThemes: ['birth', 'peace', 'joy']
		}
	];

	const mockComparativePeriod: ComparativePeriod = {
		current: {
			period: 'Jan 1, 2024 - Jan 31, 2024',
			usageCount: 25,
			uniqueSongs: 20,
			avgServiceLength: 5
		},
		previous: {
			period: 'Dec 1, 2023 - Dec 31, 2023',
			usageCount: 20,
			uniqueSongs: 18,
			avgServiceLength: 4.5
		},
		changes: {
			usageChange: 25,
			diversityChange: 11.1,
			lengthChange: 11.1
		},
		insights: ['More songs used this period', 'Higher song diversity']
	};

	const mockWorshipInsights = {
		rotationHealth: 0.8,
		diversityScore: 0.7,
		seasonalAlignment: 0.9,
		recommendations: ['Introduce more contemporary songs', 'Improve key transitions']
	};

	beforeEach(() => {
		// Reset mockPb
		vi.clearAllMocks();
		mockPb.reset();

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
	});

	describe('loadSongRecommendations', () => {
		it('should load song recommendations successfully', async () => {
			mockPb.collection('songs').getFullList.mockResolvedValue(mockSongRecommendations);

			await recommendationsStore.loadSongRecommendations();

			expect(recommendationsStore.songRecommendations).toEqual(mockSongRecommendations);
			expect(recommendationsStore.loading).toBe(false);
			expect(recommendationsStore.error).toBe(null);
			expect(mockPb.collection('songs').getFullList).toHaveBeenCalledWith(
				recommendationsStore.recommendationFilters
			);
		});

		it('should handle loading state correctly', async () => {
			mockPb.collection('songs').getFullList.mockImplementation(async () => {
				expect(recommendationsStore.loading).toBe(true);
				return mockSongRecommendations;
			});

			await recommendationsStore.loadSongRecommendations();

			expect(recommendationsStore.loading).toBe(false);
		});

		it('should handle errors when loading recommendations', async () => {
			const error = new Error('Network error');
			mockPb.collection('songs').getFullList.mockRejectedValue(error);

			await recommendationsStore.loadSongRecommendations();

			expect(recommendationsStore.songRecommendations).toEqual([]);
			expect(recommendationsStore.loading).toBe(false);
			expect(recommendationsStore.error).toBe('Network error');
		});

		it('should handle non-Error exceptions', async () => {
			mockPb.collection('songs').getFullList.mockRejectedValue('String error');

			await recommendationsStore.loadSongRecommendations();

			expect(recommendationsStore.error).toBe('Failed to load recommendations');
		});
	});

	describe('loadWorshipFlowSuggestions', () => {
		it('should load flow suggestions successfully', async () => {
			mockPb.collection('services').getFullList.mockResolvedValue(mockFlowSuggestions);

			await recommendationsStore.loadWorshipFlowSuggestions('service-1');

			expect(recommendationsStore.worshipFlowSuggestions).toEqual(mockFlowSuggestions);
			expect(recommendationsStore.loading).toBe(false);
			expect(recommendationsStore.error).toBe(null);
			expect(mockPb.collection('services').getFullList).toHaveBeenCalledWith('service-1');
		});

		it('should handle errors when loading flow suggestions', async () => {
			const error = new Error('API error');
			mockPb.collection('services').getFullList.mockRejectedValue(error);

			await recommendationsStore.loadWorshipFlowSuggestions('service-1');

			expect(recommendationsStore.error).toBe('API error');
		});
	});

	describe('analyzeServiceBalance', () => {
		it('should analyze service balance successfully', async () => {
			mockPb.collection('song_usage').getFullList.mockResolvedValue(mockServiceBalance);

			await recommendationsStore.analyzeServiceBalance('service-1');

			expect(recommendationsStore.serviceBalanceAnalysis).toEqual(mockServiceBalance);
			expect(recommendationsStore.loading).toBe(false);
			expect(recommendationsStore.error).toBe(null);
			expect(mockPb.collection('song_usage').getFullList).toHaveBeenCalledWith('service-1');
		});

		it('should handle errors when analyzing service balance', async () => {
			const error = new Error('Analysis failed');
			mockPb.collection('song_usage').getFullList.mockRejectedValue(error);

			await recommendationsStore.analyzeServiceBalance('service-1');

			expect(recommendationsStore.error).toBe('Analysis failed');
		});
	});

	describe('loadSeasonalTrends', () => {
		it('should load seasonal trends successfully', async () => {
			mockPb.collection('song_usage').getFullList.mockResolvedValue(mockSeasonalTrends);

			await recommendationsStore.loadSeasonalTrends(2024);

			expect(recommendationsStore.seasonalTrends).toEqual(mockSeasonalTrends);
			expect(mockPb.collection('song_usage').getFullList).toHaveBeenCalledWith(2024);
		});

		it('should handle errors when loading seasonal trends', async () => {
			const error = new Error('Trends error');
			mockPb.collection('song_usage').getFullList.mockRejectedValue(error);

			await recommendationsStore.loadSeasonalTrends(2024);

			expect(recommendationsStore.error).toBe('Trends error');
		});
	});

	describe('loadComparativePeriodAnalysis', () => {
		it('should load comparative analysis successfully', async () => {
			const startDate = new Date('2024-01-01');
			const endDate = new Date('2024-01-31');
			mockPb.collection('song_usage').getFullList.mockResolvedValue(mockComparativePeriod);

			await recommendationsStore.loadComparativePeriodAnalysis(startDate, endDate);

			expect(recommendationsStore.comparativePeriod).toEqual(mockComparativePeriod);
			expect(mockPb.collection('song_usage').getFullList).toHaveBeenCalledWith(startDate, endDate);
		});

		it('should handle errors when loading comparative analysis', async () => {
			const error = new Error('Comparison failed');
			mockPb.collection('song_usage').getFullList.mockRejectedValue(error);

			await recommendationsStore.loadComparativePeriodAnalysis(
				new Date('2024-01-01'),
				new Date('2024-01-31')
			);

			expect(recommendationsStore.error).toBe('Comparison failed');
		});
	});

	describe('loadWorshipInsights', () => {
		it('should load worship insights successfully', async () => {
			mockPb.collection('song_usage').getFullList.mockResolvedValue(mockWorshipInsights);

			await recommendationsStore.loadWorshipInsights();

			expect(recommendationsStore.worshipInsights).toEqual(mockWorshipInsights);
			expect(mockPb.collection('song_usage').getFullList).toHaveBeenCalled();
		});

		it('should handle errors when loading worship insights', async () => {
			const error = new Error('Insights error');
			mockPb.collection('song_usage').getFullList.mockRejectedValue(error);

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
			mockPb.collection('songs').getFullList.mockResolvedValue(mockSongRecommendations);

			await recommendationsStore.getPersonalizedRecommendations('leader-1');

			expect(recommendationsStore.recommendationFilters.worshipLeaderId).toBe('leader-1');
			expect(mockPb.collection('songs').getFullList).toHaveBeenCalledWith(
				expect.objectContaining({ worshipLeaderId: 'leader-1' })
			);
		});
	});

	// Note: Derived values tests are skipped as $derived() runes don't work in Node.js test environment
	// The filtering logic is tested implicitly through the business logic methods below

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

	// Note: Summary insights tests are skipped as they depend on derived values
	// that don't work in Node.js test environment. The getSummaryInsights() method is tested
	// indirectly through integration tests in the actual application.

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

	describe('edge cases', () => {
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
		});
	});
});
