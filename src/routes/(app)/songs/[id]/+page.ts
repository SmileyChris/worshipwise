import { error } from '@sveltejs/kit';
import { pb } from '$lib/api/client';
import type { PageLoad } from './$types';

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
			sort: '-used_date'
		});

		return {
			song,
			usageHistory
		};
	} catch (err: unknown) {
		if (err && typeof err === 'object' && 'status' in err && err.status === 404) {
			throw error(404, 'Song not found');
		}
		throw error(500, 'Failed to load song details');
	}
};
