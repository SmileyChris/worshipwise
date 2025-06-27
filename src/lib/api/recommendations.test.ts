import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createRecommendationsAPI } from './recommendations';
import type PocketBase from 'pocketbase';

describe('RecommendationsAPI - NaN Prevention', () => {
	let pb: PocketBase;
	let api: ReturnType<typeof createRecommendationsAPI>;

	beforeEach(() => {
		// Mock PocketBase instance
		pb = {
			authStore: {
				model: { id: 'user-1' }
			},
			collection: vi.fn()
		} as unknown as PocketBase;

		api = createRecommendationsAPI(pb);
	});

	describe('getWorshipInsights - empty data handling', () => {
		it('should not return NaN values when there are no songs', async () => {
			// Mock empty song and usage data
			const mockCollection = {
				getFullList: vi.fn().mockImplementation((options) => {
					if (options?.filter?.includes('is_active')) {
						return Promise.resolve([]); // No songs
					}
					return Promise.resolve([]); // No usage
				}),
				getFirstListItem: vi.fn().mockRejectedValue(new Error('No membership'))
			};

			pb.collection = vi.fn().mockReturnValue(mockCollection);

			const insights = await api.getWorshipInsights();

			// Check rotation health
			expect(insights.rotationHealth.score).toBe(0);
			expect(insights.rotationHealth.status).toBe('critical');
			expect(insights.rotationHealth.insights).toContain('No songs in library');

			// Check diversity analysis - should not have NaN
			expect(insights.diversityAnalysis.keyDiversity).not.toBeNaN();
			expect(insights.diversityAnalysis.tempoDiversity).not.toBeNaN();
			expect(insights.diversityAnalysis.artistDiversity).not.toBeNaN();
			expect(insights.diversityAnalysis.keyDiversity).toBe(0);

			// Check seasonal readiness - should not have NaN
			expect(insights.seasonalReadiness.currentSeasonAlignment).not.toBeNaN();
			expect(insights.seasonalReadiness.upcomingSeasonPreparation).not.toBeNaN();
			expect(insights.seasonalReadiness.currentSeasonAlignment).toBe(0);
			expect(insights.seasonalReadiness.upcomingSeasonPreparation).toBe(0);

			// Check congregation engagement
			expect(insights.congregationEngagement.familiarSongs).toBe(0);
			expect(insights.congregationEngagement.newSongIntroductionRate).toBe(0);
			expect(insights.congregationEngagement.optimalRotationCandidates).toBe(0);
		});

		it('should handle empty tempo data without NaN', async () => {
			// Mock songs without tempo data
			const mockSongs = [
				{ id: '1', title: 'Song 1', is_active: true },
				{ id: '2', title: 'Song 2', is_active: true }
			];

			const mockCollection = {
				getFullList: vi.fn().mockImplementation((options) => {
					if (options?.filter?.includes('is_active')) {
						return Promise.resolve(mockSongs);
					}
					return Promise.resolve([]); // No usage
				}),
				getFirstListItem: vi.fn().mockRejectedValue(new Error('No membership'))
			};

			pb.collection = vi.fn().mockReturnValue(mockCollection);

			const insights = await api.getWorshipInsights();

			// Tempo diversity should handle missing tempo gracefully
			expect(insights.diversityAnalysis.tempoDiversity).not.toBeNaN();
		});

		it('should handle division by zero in percentage calculations', async () => {
			// Test with single song to ensure percentage calculations work
			const mockSongs = [
				{ 
					id: '1', 
					title: 'Christmas Song', 
					is_active: true,
					key_signature: 'C',
					tempo: 100,
					artist: 'Artist 1'
				}
			];

			const mockUsage = [
				{
					id: 'usage-1',
					song_id: '1',
					used_date: new Date().toISOString()
				}
			];

			const mockCollection = {
				getFullList: vi.fn().mockImplementation((options) => {
					if (options?.filter?.includes('is_active')) {
						return Promise.resolve(mockSongs);
					}
					return Promise.resolve(mockUsage);
				}),
				getFirstListItem: vi.fn().mockRejectedValue(new Error('No membership'))
			};

			pb.collection = vi.fn().mockReturnValue(mockCollection);

			const insights = await api.getWorshipInsights();

			// All percentages should be valid numbers
			expect(insights.seasonalReadiness.currentSeasonAlignment).toBeGreaterThanOrEqual(0);
			expect(insights.seasonalReadiness.currentSeasonAlignment).toBeLessThanOrEqual(100);
			expect(insights.seasonalReadiness.upcomingSeasonPreparation).toBeGreaterThanOrEqual(0);
			expect(insights.seasonalReadiness.upcomingSeasonPreparation).toBeLessThanOrEqual(100);
		});
	});
});