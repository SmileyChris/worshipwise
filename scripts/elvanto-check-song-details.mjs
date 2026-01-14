#!/usr/bin/env node

/**
 * Deep dive into song details from Elvanto API
 */

const ELVANTO_API_BASE = 'https://api.elvanto.com/v1';

async function elvantoRequest(endpoint, params = {}, apiKey) {
	const url = `${ELVANTO_API_BASE}/${endpoint}.json`;
	const auth = Buffer.from(`${apiKey}:x`).toString('base64');

	const response = await fetch(url, {
		method: 'POST',
		headers: {
			'Authorization': `Basic ${auth}`,
			'Content-Type': 'application/json',
			'Accept': 'application/json'
		},
		body: JSON.stringify(params)
	});

	const data = await response.json();

	if (!response.ok || data.status !== 'ok') {
		throw new Error(`API Error: ${data.error?.message || 'Unknown'}`);
	}

	return data;
}

async function main() {
	const apiKey = process.argv[2];
	if (!apiKey) {
		console.log('Usage: node elvanto-check-song-details.mjs <api_key>');
		process.exit(1);
	}

	// Get a song ID from recent services
	const d = new Date();
	d.setDate(d.getDate() - 21);
	const startDate = d.toISOString().split('T')[0];

	const servicesResp = await elvantoRequest('services/getAll', {
		start: startDate,
		fields: ['plans']
	}, apiKey);

	const services = servicesResp.services?.service || [];
	let songId = null;

	// Find first song
	for (const svc of services) {
		if (svc.plans && svc.plans.plan) {
			const plans = Array.isArray(svc.plans.plan) ? svc.plans.plan : [svc.plans.plan];
			for (const plan of plans) {
				if (plan.items && plan.items.item) {
					const items = Array.isArray(plan.items.item) ? plan.items.item : [plan.items.item];
					const songItem = items.find(i => i.song);
					if (songItem) {
						songId = songItem.song.id;
						console.log('Found song:', songItem.song.title, '(ID:', songId, ')');
						break;
					}
				}
			}
			if (songId) break;
		}
	}

	if (!songId) {
		console.log('No songs found in recent services');
		return;
	}

	// Test 1: Get song info
	console.log('\n=== Test 1: songs/getInfo ===');
	try {
		const songResp = await elvantoRequest('songs/getInfo', { id: songId }, apiKey);
		console.log('Full response:', JSON.stringify(songResp, null, 2));
	} catch (err) {
		console.error('Error:', err.message);
	}

	// Test 2: Get all songs (first page)
	console.log('\n=== Test 2: songs/getAll (first page) ===');
	try {
		const songsResp = await elvantoRequest('songs/getAll', {
			page: 1
		}, apiKey);
		console.log('Full response (first 3 songs):', JSON.stringify({
			...songsResp,
			songs: {
				...songsResp.songs,
				song: songsResp.songs?.song?.slice(0, 3)
			}
		}, null, 2));
	} catch (err) {
		console.error('Error:', err.message);
	}

	// Test 3: Get services without specifying fields
	console.log('\n=== Test 3: services/getAll with NO fields ===');
	try {
		const svcResp = await elvantoRequest('services/getAll', {
			start: startDate
		}, apiKey);

		// Show just first service
		const services = svcResp.services?.service || [];
		console.log('Full response (first service):', JSON.stringify({
			...svcResp,
			services: {
				...svcResp.services,
				service: services.slice(0, 1)
			}
		}, null, 2));
	} catch (err) {
		console.error('Error:', err.message);
	}

	// Test 4: Get services WITH volunteers field
	console.log('\n=== Test 4: services/getAll with volunteers field ===');
	try {
		const svcResp = await elvantoRequest('services/getAll', {
			start: startDate,
			fields: ['volunteers']
		}, apiKey);

		const services = svcResp.services?.service || [];
		console.log('Response (first service):', JSON.stringify({
			...svcResp,
			services: {
				...svcResp.services,
				service: services.slice(0, 1)
			}
		}, null, 2));
	} catch (err) {
		console.error('Error:', err.message);
	}
}

main().catch(console.error);
