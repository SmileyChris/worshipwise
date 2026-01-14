#!/usr/bin/env node
const apiKey = process.argv[2];
const ELVANTO_API_BASE = 'https://api.elvanto.com/v1';

async function elvantoRequest(endpoint, params = {}) {
	const auth = Buffer.from(`${apiKey}:x`).toString('base64');
	const response = await fetch(`${ELVANTO_API_BASE}/${endpoint}.json`, {
		method: 'POST',
		headers: {
			'Authorization': `Basic ${auth}`,
			'Content-Type': 'application/json'
		},
		body: JSON.stringify(params)
	});
	const data = await response.json();
	return data;
}

// Get a song ID from recent services
const d = new Date();
d.setDate(d.getDate() - 21);
const startDate = d.toISOString().split('T')[0];

const servicesResp = await elvantoRequest('services/getAll', {
	start: startDate,
	fields: ['plans']
});

const services = servicesResp.services?.service || [];
let songId = null;

for (const svc of services) {
	if (svc.plans && svc.plans.plan) {
		const plans = Array.isArray(svc.plans.plan) ? svc.plans.plan : [svc.plans.plan];
		for (const plan of plans) {
			if (plan.items && plan.items.item) {
				const items = Array.isArray(plan.items.item) ? plan.items.item : [plan.items.item];
				const songItem = items.find(i => i.song);
				if (songItem) {
					songId = songItem.song.id;
					console.log(`Testing with: ${songItem.song.title}\n`);
					break;
				}
			}
		}
		if (songId) break;
	}
}

if (!songId) {
	console.log('No songs found');
	process.exit(1);
}

// Get full song details (don't specify fields - get everything)
const songResp = await elvantoRequest('songs/getInfo', {
	id: songId
});

console.log('=== FULL SONG DATA ===');
console.log(JSON.stringify(songResp, null, 2));

// Check for available data
const song = songResp.song && songResp.song.length > 0 ? songResp.song[0] : null;
if (!song) {
	console.log('No song data returned');
	process.exit(1);
}

console.log('\n=== AVAILABLE FIELDS ===');
console.log('Notes:', song.notes || '(empty)');
console.log('Album:', song.album || '(empty)');

if (song.arrangements && song.arrangements.length > 0) {
	console.log('\n=== ARRANGEMENT DATA ===');
	const arr = song.arrangements[0];
	console.log('Copyright:', arr.copyright || '(empty)');
	console.log('Lyrics:', arr.lyrics ? `${arr.lyrics.substring(0, 100)}...` : '(empty)');
	console.log('CCLI License:', arr.ccli_license || '(empty)');
}

if (song.files) {
	console.log('\n=== FILE DATA ===');
	console.log(JSON.stringify(song.files, null, 2));
}
