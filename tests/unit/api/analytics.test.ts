import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockPb } from '../../helpers/pb-mock';
import { analyticsApi } from '$lib/api/analytics';

// Mock the client module
vi.mock('$lib/api/client', () => ({
	pb: mockPb
}));

describe('Analytics API - Basic Tests', () => {
	beforeEach(() => {
		mockPb.reset();
	});

	describe('getOverview', () => {
		it('should handle empty data gracefully', async () => {
			mockPb.collection('songs').mockGetList([], 0);
			mockPb.collection('setlists').mockGetList([], 0);
			mockPb.collection('song_usage').mockGetList([], 0);

			const result = await analyticsApi.getOverview();

			expect(result).toEqual({
				totalSongs: 0,
				totalServices: 0,
				totalUsages: 0,
				avgSongsPerService: 0,
				avgServiceDuration: 0,
				activeWorshipLeaders: 0
			});
		});

		it('should return correct counts for overview', async () => {
			mockPb.collection('songs').mockGetList([], 5);
			mockPb.collection('setlists').mockGetList([], 3);
			mockPb.collection('song_usage').mockGetList([], 10);

			const result = await analyticsApi.getOverview();

			expect(result.totalSongs).toBe(5);
			expect(result.totalServices).toBe(3);
			expect(result.totalUsages).toBe(10);
		});
	});

	describe('getSongUsageStats', () => {
		it('should return empty array when no usage data', async () => {
			mockPb.collection('song_usage').mockGetFullList([]);

			const result = await analyticsApi.getSongUsageStats();

			expect(result).toEqual([]);
		});
	});

	describe('getServiceTypeStats', () => {
		it('should return empty array when no services', async () => {
			mockPb.collection('setlists').mockGetFullList([]);

			const result = await analyticsApi.getServiceTypeStats();

			expect(result).toEqual([]);
		});
	});

	describe('getKeyUsageStats', () => {
		it('should return empty array when no data', async () => {
			mockPb.collection('setlist_songs').mockGetFullList([]);

			const result = await analyticsApi.getKeyUsageStats();

			expect(result).toEqual([]);
		});
	});

	describe('getUsageTrends', () => {
		it('should return empty array when no data', async () => {
			mockPb.collection('song_usage').mockGetFullList([]);
			mockPb.collection('setlists').mockGetFullList([]);

			const result = await analyticsApi.getUsageTrends();

			expect(result).toEqual([]);
		});
	});

	describe('getWorshipLeaderStats', () => {
		it('should return empty array when no services', async () => {
			mockPb.collection('setlists').mockGetFullList([]);

			const result = await analyticsApi.getWorshipLeaderStats();

			expect(result).toEqual([]);
		});
	});

	describe('exportToCSV', () => {
		it('should export empty songs CSV', async () => {
			mockPb.collection('song_usage').mockGetFullList([]);

			const result = await analyticsApi.exportToCSV('songs');

			expect(result).toContain('Title,Artist,Usage Count');
		});

		it('should export empty services CSV', async () => {
			mockPb.collection('setlists').mockGetFullList([]);

			const result = await analyticsApi.exportToCSV('services');

			expect(result).toContain('Service Type,Count');
		});

		it('should export empty leaders CSV', async () => {
			mockPb.collection('setlists').mockGetFullList([]);

			const result = await analyticsApi.exportToCSV('leaders');

			expect(result).toContain('Name,Setlist Count');
		});
	});
});
