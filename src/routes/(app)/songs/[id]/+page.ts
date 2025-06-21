import { error } from '@sveltejs/kit';
import { songsApi } from '$lib/api/songs';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ params }) => {
	try {
		const song = await songsApi.getSong(params.id);

		if (!song) {
			throw error(404, 'Song not found');
		}

		// Load usage history for this song
		const usageHistory = await songsApi.getSongUsageHistory(params.id);

		return {
			song,
			usageHistory
		};
	} catch (err: any) {
		if (err.status === 404) {
			throw error(404, 'Song not found');
		}
		throw error(500, 'Failed to load song details');
	}
};
