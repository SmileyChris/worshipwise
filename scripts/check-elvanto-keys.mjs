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

// Check from November 1st
const startDate = '2024-11-01';

const servicesResp = await elvantoRequest('services/getAll', {
	start: startDate,
	fields: ['plans']
});

const services = servicesResp.services?.service || [];
let foundAnyKeys = false;
let servicesChecked = 0;
let songsChecked = 0;

console.log(`Checking ${services.length} services from ${startDate}...\n`);

for (const svc of services) {
	servicesChecked++;
	if (svc.plans && svc.plans.plan) {
		const plans = Array.isArray(svc.plans.plan) ? svc.plans.plan : [svc.plans.plan];
		for (const plan of plans) {
			if (plan.items && plan.items.item) {
				const items = Array.isArray(plan.items.item) ? plan.items.item : [plan.items.item];
				for (const item of items) {
					if (item.song && item.song.arrangement) {
						songsChecked++;
						const arr = item.song.arrangement;
						if (arr.key_male || arr.key_female || arr.chord_chart_key) {
							console.log(`Found key data in ${svc.name}:`);
							console.log(`  Song: ${item.song.title}`);
							console.log(`  Key (Male): ${arr.key_male || 'N/A'}`);
							console.log(`  Key (Female): ${arr.key_female || 'N/A'}`);
							console.log(`  Key (Chart): ${arr.chord_chart_key || 'N/A'}`);
							console.log(`  BPM: ${arr.bpm || 'N/A'}`);
							foundAnyKeys = true;
						}
					}
				}
			}
		}
	}
}

console.log('\n=== SUMMARY ===');
console.log(`Services checked: ${servicesChecked}`);
console.log(`Songs checked: ${songsChecked}`);

if (!foundAnyKeys) {
	console.log('\n❌ No key data found in any services');
	console.log('   All arrangement.key_* fields are empty');
	console.log('   Your Elvanto account does not track keys for songs');
} else {
	console.log('\n✅ Key data found!');
}
