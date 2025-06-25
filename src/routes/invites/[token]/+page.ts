import type { PageLoad } from './$types';
import { ChurchesAPI } from '$lib/api/churches';
import { error } from '@sveltejs/kit';

export const ssr = false;

export const load: PageLoad = async ({ params, url }) => {
	const { token } = params;
	const action = url.searchParams.get('action');
	
	try {
		const invitation = await ChurchesAPI.getInvitationByToken(token);
		
		return {
			invitation,
			token,
			action: action as 'decline' | null
		};
	} catch (err) {
		console.error('Failed to load invitation:', err);
		throw error(404, 'Invitation not found or has expired');
	}
};