#!/usr/bin/env node

/**
 * Elvanto Recent Services Check
 *
 * Check what data we're actually getting from recent services
 */

const ELVANTO_API_BASE = 'https://api.elvanto.com/v1';

const colors = {
	reset: '\x1b[0m',
	bright: '\x1b[1m',
	green: '\x1b[32m',
	yellow: '\x1b[33m',
	blue: '\x1b[34m',
	cyan: '\x1b[36m',
	red: '\x1b[31m',
	magenta: '\x1b[35m'
};

function log(message, color = 'reset') {
	console.log(`${colors[color]}${message}${colors.reset}`);
}

async function elvantoRequest(endpoint, params = {}, apiKey) {
	const url = `${ELVANTO_API_BASE}/${endpoint}.json`;
	const auth = Buffer.from(`${apiKey}:x`).toString('base64');

	try {
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

		if (!response.ok) {
			throw new Error(`API Error (${response.status}): ${data.error?.message || 'Unknown error'}`);
		}

		if (data.status !== 'ok') {
			throw new Error(`API returned status: ${data.status}`);
		}

		return data;
	} catch (error) {
		if (error.cause?.code === 'ENOTFOUND') {
			throw new Error('Network error: Could not reach Elvanto API. Check your internet connection.');
		}
		throw error;
	}
}

async function checkRecentServices(apiKey) {
	log('\n📅 Fetching Recent Services (Last 3 Weeks)...', 'cyan');

	// Get date from 3 weeks ago
	const d = new Date();
	d.setDate(d.getDate() - 21);
	const startDate = d.toISOString().split('T')[0];

	log(`   Start date: ${startDate}`, 'bright');

	try {
		const response = await elvantoRequest('services/getAll', {
			start: startDate,
			fields: ['plans', 'volunteers', 'songs', 'service_times']
		}, apiKey);

		const services = response.services?.service || [];

		log(`✓ Found ${services.length} service(s)`, 'green');

		if (services.length === 0) {
			log('   No services found in this period', 'yellow');
			return;
		}

		// Process each service
		for (let i = 0; i < Math.min(services.length, 3); i++) {
			const svc = services[i];
			log(`\n${'='.repeat(70)}`, 'bright');
			log(`SERVICE ${i + 1}: ${svc.name}`, 'yellow');
			log(`${'='.repeat(70)}`, 'bright');

			// Basic Info
			log(`\n📋 Basic Info:`, 'cyan');
			log(`   ID: ${svc.id}`, 'reset');
			log(`   Date: ${svc.date}`, 'reset');
			log(`   Type: ${svc.service_type?.name || 'N/A'}`, 'reset');
			log(`   Status: ${svc.status || 'N/A'}`, 'reset');
			log(`   Series: ${svc.series_name || 'N/A'}`, 'reset');

			// Volunteers (Worship Leaders!)
			log(`\n👥 Volunteers:`, 'cyan');
			if (svc.volunteers && svc.volunteers.volunteer) {
				const volunteers = Array.isArray(svc.volunteers.volunteer)
					? svc.volunteers.volunteer
					: [svc.volunteers.volunteer];

				log(`   Found ${volunteers.length} volunteer(s):`, 'bright');
				volunteers.forEach(v => {
					log(`   • ${v.name || 'Unknown'} - ${v.position || 'No position'}`, 'reset');
					log(`     Person ID: ${v.person_id || 'N/A'}`, 'reset');
					log(`     Email: ${v.email || 'N/A'}`, 'reset');
					log(`     Status: ${v.status || 'N/A'}`, 'reset');
				});
			} else {
				log(`   ⚠️  No volunteers data available`, 'yellow');
			}

			// Plans
			log(`\n🎼 Service Plan:`, 'cyan');
			if (svc.plans && svc.plans.plan) {
				const plans = Array.isArray(svc.plans.plan) ? svc.plans.plan : [svc.plans.plan];

				for (const plan of plans) {
					log(`   Plan: ${plan.name || 'Untitled'}`, 'bright');

					if (plan.total_length) {
						log(`   Total Length: ${JSON.stringify(plan.total_length)}`, 'reset');
					}

					if (plan.items && plan.items.item) {
						const items = Array.isArray(plan.items.item) ? plan.items.item : [plan.items.item];
						log(`   Items: ${items.length}`, 'reset');

						const songs = items.filter(i => i.song);
						log(`   Songs: ${songs.length}`, 'green');

						log(`\n   📝 Plan Items with Songs:`, 'magenta');
						songs.forEach((item, idx) => {
							log(`\n   ${idx + 1}. ${item.title}`, 'yellow');

							if (item.song) {
								const s = item.song;
								log(`      Song ID: ${s.id}`, 'reset');
								log(`      Title: ${s.title}`, 'reset');
								log(`      Artist: ${s.artist || 'N/A'}`, 'reset');
								log(`      CCLI: ${s.ccli_number || 'N/A'}`, 'reset');

								// Check for arrangement data in the plan item
								if (s.arrangement) {
									log(`      🎵 ARRANGEMENT DATA FOUND:`, 'green');
									log(`         Key (Male): ${s.arrangement.key_male || 'N/A'}`, 'green');
									log(`         Key (Female): ${s.arrangement.key_female || 'N/A'}`, 'green');
									log(`         Key (Chart): ${s.arrangement.chord_chart_key || 'N/A'}`, 'green');
									log(`         BPM: ${s.arrangement.bpm || 'N/A'}`, 'green');
									log(`         Duration: ${s.arrangement.duration_minutes || 0}m ${s.arrangement.duration_seconds || 0}s`, 'green');
									log(`         Arrangement ID: ${s.arrangement.id || 'N/A'}`, 'reset');
								} else {
									log(`      ⚠️  No arrangement data in plan item`, 'yellow');
								}
							}

							if (item.duration) {
								log(`      Duration: ${JSON.stringify(item.duration)}`, 'reset');
							}
						});
					}
				}
			} else {
				log(`   ⚠️  No plans data available`, 'yellow');
			}
		}

		// Now test fetching song details for one song
		if (services.length > 0 && services[0].plans) {
			const plans = Array.isArray(services[0].plans.plan)
				? services[0].plans.plan
				: [services[0].plans.plan];

			for (const plan of plans) {
				if (plan.items && plan.items.item) {
					const items = Array.isArray(plan.items.item)
						? plan.items.item
						: [plan.items.item];

					const firstSong = items.find(i => i.song);
					if (firstSong && firstSong.song) {
						log(`\n${'='.repeat(70)}`, 'bright');
						log(`TESTING songs/getInfo FOR: ${firstSong.song.title}`, 'yellow');
						log(`${'='.repeat(70)}`, 'bright');

						try {
							const songDetails = await elvantoRequest('songs/getInfo', {
								id: firstSong.song.id
							}, apiKey);

							if (songDetails.song) {
								const song = songDetails.song;
								log(`\n✓ Song Details Retrieved:`, 'green');
								log(`   Title: ${song.title}`, 'reset');
								log(`   Artist: ${song.artist || 'N/A'}`, 'reset');
								log(`   CCLI: ${song.ccli_number || 'N/A'}`, 'reset');

								if (song.categories && song.categories.length > 0) {
									log(`   Categories: ${song.categories.map(c => c.name).join(', ')}`, 'reset');
								}

								if (song.arrangements && song.arrangements.length > 0) {
									log(`\n   🎵 Arrangements (${song.arrangements.length}):`, 'cyan');
									song.arrangements.forEach((arr, idx) => {
										log(`\n   Arrangement ${idx + 1}: ${arr.name || 'Untitled'}`, 'bright');
										log(`      ID: ${arr.id}`, 'reset');
										log(`      Key (Male): ${arr.key_male || 'N/A'}`, 'green');
										log(`      Key (Female): ${arr.key_female || 'N/A'}`, 'green');
										log(`      Key (Chart): ${arr.chord_chart_key || 'N/A'}`, 'green');
										log(`      BPM: ${arr.bpm || 'N/A'}`, 'green');
										log(`      Duration: ${arr.duration_minutes || 0}m ${arr.duration_seconds || 0}s`, 'green');
										log(`      Default: ${arr.default ? 'Yes' : 'No'}`, 'reset');
										if (arr.copyright) {
											log(`      Copyright: ${arr.copyright.substring(0, 60)}...`, 'reset');
										}
									});
								} else {
									log(`   ⚠️  No arrangements found`, 'yellow');
								}
							}
						} catch (err) {
							log(`   ✗ Failed to fetch song details: ${err.message}`, 'red');
						}

						break; // Only test one song
					}
				}
			}
		}

		log(`\n${'='.repeat(70)}`, 'bright');
		log(`SUMMARY`, 'bright');
		log(`${'='.repeat(70)}`, 'bright');
		log(`Total services analyzed: ${Math.min(services.length, 3)}`, 'green');

	} catch (error) {
		log(`✗ Failed to fetch services: ${error.message}`, 'red');
		if (error.stack) {
			log(error.stack, 'red');
		}
	}
}

async function main() {
	log('\n========================================', 'bright');
	log('    Elvanto Recent Services Check', 'bright');
	log('========================================', 'bright');

	const apiKey = process.env.ELVANTO_API_KEY || process.argv[2];

	if (!apiKey) {
		log('\n❌ Error: No API key provided', 'red');
		log('\nUsage:', 'yellow');
		log('  ELVANTO_API_KEY=your_key node scripts/elvanto-check-recent.mjs', 'reset');
		log('  OR', 'reset');
		log('  node scripts/elvanto-check-recent.mjs your_key', 'reset');
		process.exit(1);
	}

	await checkRecentServices(apiKey);

	log('\n✅ Check complete!\n', 'green');
}

main().catch(error => {
	log(`\n❌ Unexpected error: ${error.message}`, 'red');
	if (error.stack) {
		log(error.stack, 'red');
	}
	process.exit(1);
});
