import { error } from '@sveltejs/kit';
import { pb } from '$lib/api/client';
import { createAnalyticsAPI, type UsageTrend } from '$lib/api/analytics';
import type { PageLoad } from './$types';

export const ssr = false;

export const load: PageLoad = async ({ params }) => {
	try {
		const song = await pb.collection('songs').getOne(params.id, {
			expand: 'created_by,category,labels'
		});

		if (!song) {
			throw error(404, 'Song not found');
		}

		// Load usage history for this song
		const usageHistory = await pb.collection('song_usage').getFullList({
			filter: `song_id = "${params.id}"`,
			sort: '-used_date',
			expand: 'worship_leader,service_id'
		});

		// Get church ID from song
		const churchId = song.church_id;

		// Calculate date range (last 6 months)
		const sixMonthsAgo = new Date();
		sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
		const dateFrom = sixMonthsAgo.toISOString().split('T')[0];

		// Create minimal auth context for analytics API
		// Note: This is a simplified context for the load function
		const authContext = {
			pb,
			currentChurch: { id: churchId },
			user: pb.authStore.model,
			membership: null
		};

		const analyticsAPI = createAnalyticsAPI(authContext as any, pb);

		// Load usage trends
		let songUsageTrend: UsageTrend[] = [];
		let averageUsageTrend: UsageTrend[] = [];

		try {
			[songUsageTrend, averageUsageTrend] = await Promise.all([
				analyticsAPI.getSongUsageTrend(params.id, dateFrom, undefined, 'month'),
				analyticsAPI.getAverageSongUsageTrend(dateFrom, undefined, 'month')
			]);
		} catch (trendError) {
			console.error('Failed to load usage trends:', trendError);
			// Continue without trends if they fail to load
		}

		return {
			song,
			usageHistory,
			songUsageTrend,
			averageUsageTrend,
			id: params.id
		};
	} catch (err: unknown) {
		if (err && typeof err === 'object' && 'status' in err && err.status === 404) {
			throw error(404, 'Song not found');
		}
		console.error('Error loading song:', err);
		throw error(500, 'Failed to load song details');
	}
};

