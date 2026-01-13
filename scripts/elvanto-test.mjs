#!/usr/bin/env node

/**
 * Elvanto API Test Script
 *
 * Simple proof-of-concept script to test Elvanto API connectivity
 * and fetch sample data (services and songs) without database import.
 *
 * Usage:
 *   ELVANTO_API_KEY=your_key_here node scripts/elvanto-test.mjs
 *   OR
 *   node scripts/elvanto-test.mjs your_key_here
 */

const ELVANTO_API_BASE = 'https://api.elvanto.com/v1';

// ANSI color codes for pretty output
const colors = {
	reset: '\x1b[0m',
	bright: '\x1b[1m',
	green: '\x1b[32m',
	yellow: '\x1b[33m',
	blue: '\x1b[34m',
	cyan: '\x1b[36m',
	red: '\x1b[31m'
};

function log(message, color = 'reset') {
	console.log(`${colors[color]}${message}${colors.reset}`);
}

function formatJSON(obj) {
	return JSON.stringify(obj, null, 2);
}

/**
 * Make authenticated request to Elvanto API
 */
async function elvantoRequest(endpoint, params = {}, apiKey) {
	const url = `${ELVANTO_API_BASE}/${endpoint}.json`;

	// Elvanto uses HTTP Basic Auth with API key as username
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

/**
 * Test API authentication
 */
async function testAuthentication(apiKey) {
	log('\n🔐 Testing API Authentication...', 'cyan');

	try {
		// Simple call to verify auth - fetch current user info
		const response = await elvantoRequest('people/currentUser', {}, apiKey);

		if (response.person) {
			log(`✓ Authentication successful!`, 'green');
			log(`  Authenticated as: ${response.person.firstname} ${response.person.lastname}`, 'bright');
			log(`  Email: ${response.person.email}`, 'bright');
			return true;
		}
	} catch (error) {
		log(`✗ Authentication failed: ${error.message}`, 'red');
		return false;
	}
}

/**
 * Fetch sample services
 */
async function fetchSampleServices(apiKey) {
	log('\n📅 Fetching Sample Services...', 'cyan');

	try {
		const response = await elvantoRequest('services/getAll', {
			page: 1,
			page_size: 5,
			all: 'yes', // Include past services
			fields: ['songs', 'plans', 'service_times', 'volunteers']
		}, apiKey);

		const services = response.services?.service || [];

		log(`✓ Found ${response.services?.total || 0} total services`, 'green');
		log(`  Showing first ${services.length}:`, 'bright');

		services.forEach((service, index) => {
			log(`\n  ${index + 1}. ${service.name}`, 'yellow');
			log(`     Date: ${service.date}`, 'reset');
			log(`     Type: ${service.service_type?.name || 'N/A'}`, 'reset');
			log(`     Status: ${service.status}`, 'reset');
			if (service.series_name) {
				log(`     Series: ${service.series_name}`, 'reset');
			}
		});

		// Show detailed example of first service with plans
		if (services.length > 0 && services[0].plans) {
			log('\n  📋 First Service Plan Details:', 'blue');
			const plans = services[0].plans;
			if (plans.items && plans.items.length > 0) {
				log(`     Total plan items: ${plans.items.length}`, 'bright');
				log(`     Service length: ${plans.total_length?.formatted || 'N/A'}`, 'bright');

				log('\n     Plan items:', 'bright');
				plans.items.slice(0, 3).forEach((item, idx) => {
					log(`       ${idx + 1}. ${item.title}`, 'reset');
					if (item.song) {
						log(`          Type: Song (ID: ${item.song.id})`, 'reset');
						log(`          CCLI: ${item.song.ccli_number || 'N/A'}`, 'reset');
						if (item.song.arrangement) {
							log(`          Key: ${item.song.arrangement.key_male || 'N/A'}`, 'reset');
							log(`          BPM: ${item.song.arrangement.bpm || 'N/A'}`, 'reset');
						}
					}
					if (item.duration) {
						log(`          Duration: ${item.duration.formatted || item.duration}`, 'reset');
					}
				});
				if (plans.items.length > 3) {
					log(`       ... and ${plans.items.length - 3} more items`, 'reset');
				}
			}
		}

		return services;
	} catch (error) {
		log(`✗ Failed to fetch services: ${error.message}`, 'red');
		return [];
	}
}

/**
 * Fetch sample songs
 */
async function fetchSampleSongs(apiKey) {
	log('\n🎵 Fetching Sample Songs...', 'cyan');

	try {
		const response = await elvantoRequest('songs/getAll', {
			page: 1,
			page_size: 5
		}, apiKey);

		const songs = response.songs?.song || [];

		log(`✓ Found ${response.songs?.total || 0} total songs`, 'green');
		log(`  Showing first ${songs.length}:`, 'bright');

		for (const [index, song] of songs.entries()) {
			log(`\n  ${index + 1}. ${song.title}`, 'yellow');
			log(`     Artist: ${song.artist || 'Unknown'}`, 'reset');
			log(`     ID: ${song.id}`, 'reset');

			if (song.categories && song.categories.length > 0) {
				const categoryNames = song.categories.map(c => c.name).join(', ');
				log(`     Categories: ${categoryNames}`, 'reset');
			}

			// Fetch arrangement details for first song as example
			if (index === 0) {
				log(`\n     🎼 Fetching arrangement details...`, 'blue');
				try {
					const arrangementResp = await elvantoRequest('songs/getInfo', {
						id: song.id
					}, apiKey);

					if (arrangementResp.song && arrangementResp.song.arrangements) {
						const arrangements = arrangementResp.song.arrangements;
						log(`     Found ${arrangements.length} arrangement(s)`, 'bright');

						if (arrangements.length > 0) {
							const arr = arrangements[0];
							log(`\n     Default Arrangement:`, 'bright');
							log(`       Name: ${arr.name || 'Untitled'}`, 'reset');
							log(`       Key (Male): ${arr.key_male || 'N/A'}`, 'reset');
							log(`       Key (Female): ${arr.key_female || 'N/A'}`, 'reset');
							log(`       Key (Chart): ${arr.chord_chart_key || 'N/A'}`, 'reset');
							log(`       BPM: ${arr.bpm || 'N/A'}`, 'reset');
							log(`       Duration: ${arr.duration_minutes || 0}m ${arr.duration_seconds || 0}s`, 'reset');
							if (arr.copyright) {
								log(`       Copyright: ${arr.copyright.substring(0, 50)}...`, 'reset');
							}
						}
					}
				} catch (err) {
					log(`     Could not fetch arrangement: ${err.message}`, 'red');
				}
			}
		}

		return songs;
	} catch (error) {
		log(`✗ Failed to fetch songs: ${error.message}`, 'red');
		return [];
	}
}

/**
 * Main execution
 */
async function main() {
	log('\n========================================', 'bright');
	log('    Elvanto API Test Script', 'bright');
	log('========================================', 'bright');

	// Get API key from environment or command line
	const apiKey = process.env.ELVANTO_API_KEY || process.argv[2];

	if (!apiKey) {
		log('\n❌ Error: No API key provided', 'red');
		log('\nUsage:', 'yellow');
		log('  ELVANTO_API_KEY=your_key node scripts/elvanto-test.mjs', 'reset');
		log('  OR', 'reset');
		log('  node scripts/elvanto-test.mjs your_key', 'reset');
		log('\nHow to get an API key:', 'yellow');
		log('  1. Log in to your Elvanto account', 'reset');
		log('  2. Go to Settings → Account Settings', 'reset');
		log('  3. Find your API key in the API Access section', 'reset');
		log('  4. Copy the key and use it with this script\n', 'reset');
		process.exit(1);
	}

	// Test authentication
	const authenticated = await testAuthentication(apiKey);
	if (!authenticated) {
		log('\n❌ Cannot proceed without valid authentication\n', 'red');
		process.exit(1);
	}

	// Fetch sample data
	const services = await fetchSampleServices(apiKey);
	const songs = await fetchSampleSongs(apiKey);

	// Summary
	log('\n========================================', 'bright');
	log('    Summary', 'bright');
	log('========================================', 'bright');
	log(`✓ Services fetched: ${services.length}`, 'green');
	log(`✓ Songs fetched: ${songs.length}`, 'green');
	log('\n✅ API test complete!\n', 'green');
	log('Next steps:', 'yellow');
	log('  • Review the data structure above', 'reset');
	log('  • Adjust field mappings as needed', 'reset');
	log('  • Build full import script with database integration\n', 'reset');
}

// Run the script
main().catch(error => {
	log(`\n❌ Unexpected error: ${error.message}`, 'red');
	if (error.stack) {
		log(error.stack, 'red');
	}
	process.exit(1);
});
