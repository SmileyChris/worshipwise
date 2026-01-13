#!/usr/bin/env node

/**
 * Elvanto API Test Script (OAuth 2.0 Version)
 *
 * Authenticates using OAuth 2.0 and fetches sample data from Elvanto.
 *
 * Setup:
 *   1. Register OAuth app: Elvanto → Settings → Integrations → OAuth Applications
 *   2. Set redirect URI to: http://localhost:3456/callback
 *   3. Request scopes: ManageServices, ManageSongs
 *   4. Copy Client ID and Client Secret
 *
 * Usage:
 *   ELVANTO_CLIENT_ID=your_id ELVANTO_CLIENT_SECRET=your_secret node scripts/elvanto-test-oauth.mjs
 */

import http from 'http';
import { URL } from 'url';
import { exec } from 'child_process';

const ELVANTO_AUTH_URL = 'https://api.elvanto.com/oauth';
const ELVANTO_API_BASE = 'https://api.elvanto.com/v1';
const REDIRECT_URI = 'http://localhost:3456/callback';
const PORT = 3456;

// ANSI color codes
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

/**
 * Open URL in default browser
 */
function openBrowser(url) {
	const start =
		process.platform === 'darwin'
			? 'open'
			: process.platform === 'win32'
				? 'start'
				: 'xdg-open';

	exec(`${start} "${url}"`);
}

/**
 * Start local server to handle OAuth callback
 */
function startCallbackServer() {
	return new Promise((resolve, reject) => {
		const server = http.createServer((req, res) => {
			const url = new URL(req.url, `http://localhost:${PORT}`);

			if (url.pathname === '/callback') {
				const code = url.searchParams.get('code');
				const error = url.searchParams.get('error');

				if (error) {
					res.writeHead(200, { 'Content-Type': 'text/html' });
					res.end(`
						<html>
							<body style="font-family: sans-serif; padding: 40px; text-align: center;">
								<h1 style="color: #d32f2f;">❌ Authorization Failed</h1>
								<p>Error: ${error}</p>
								<p>You can close this window.</p>
							</body>
						</html>
					`);
					server.close();
					reject(new Error(`OAuth error: ${error}`));
					return;
				}

				if (code) {
					res.writeHead(200, { 'Content-Type': 'text/html' });
					res.end(`
						<html>
							<body style="font-family: sans-serif; padding: 40px; text-align: center;">
								<h1 style="color: #4caf50;">✅ Authorization Successful!</h1>
								<p>You can close this window and return to the terminal.</p>
							</body>
						</html>
					`);
					server.close();
					resolve(code);
					return;
				}
			}

			res.writeHead(404);
			res.end('Not found');
		});

		server.listen(PORT, () => {
			log(`\n🌐 Callback server listening on port ${PORT}`, 'cyan');
		});

		server.on('error', reject);
	});
}

/**
 * Get authorization code via OAuth flow
 */
async function getAuthorizationCode(clientId) {
	const authUrl = new URL(ELVANTO_AUTH_URL);
	authUrl.searchParams.append('type', 'web_server');
	authUrl.searchParams.append('client_id', clientId);
	authUrl.searchParams.append('redirect_uri', REDIRECT_URI);
	authUrl.searchParams.append('scope', 'ManageServices,ManageSongs');

	log('\n🔐 Starting OAuth Authorization Flow...', 'cyan');
	log(`\n📱 Opening browser for authorization...`, 'yellow');
	log(`   If browser doesn't open, visit:`, 'reset');
	log(`   ${authUrl.toString()}\n`, 'blue');

	openBrowser(authUrl.toString());

	const code = await startCallbackServer();
	return code;
}

/**
 * Exchange authorization code for access token
 */
async function getAccessToken(clientId, clientSecret, code) {
	log('\n🔑 Exchanging authorization code for access token...', 'cyan');

	const tokenUrl = `${ELVANTO_AUTH_URL}/token`;

	const params = new URLSearchParams({
		grant_type: 'authorization_code',
		client_id: clientId,
		client_secret: clientSecret,
		code: code,
		redirect_uri: REDIRECT_URI
	});

	try {
		const response = await fetch(tokenUrl, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded'
			},
			body: params.toString()
		});

		const data = await response.json();

		if (!response.ok || data.error) {
			throw new Error(
				`Token exchange failed: ${data.error_description || data.error || 'Unknown error'}`
			);
		}

		log(`✓ Access token obtained successfully!`, 'green');
		log(`  Token type: ${data.token_type}`, 'bright');
		log(`  Expires in: ${data.expires_in} seconds`, 'bright');

		return data.access_token;
	} catch (error) {
		throw new Error(`Failed to get access token: ${error.message}`);
	}
}

/**
 * Make authenticated API request
 */
async function elvantoRequest(endpoint, params = {}, accessToken) {
	const url = `${ELVANTO_API_BASE}/${endpoint}.json`;

	try {
		const response = await fetch(url, {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${accessToken}`,
				'Content-Type': 'application/json',
				Accept: 'application/json'
			},
			body: JSON.stringify(params)
		});

		const data = await response.json();

		if (!response.ok) {
			throw new Error(
				`API Error (${response.status}): ${data.error?.message || 'Unknown error'}`
			);
		}

		if (data.status !== 'ok') {
			throw new Error(`API returned status: ${data.status}`);
		}

		return data;
	} catch (error) {
		if (error.cause?.code === 'ENOTFOUND') {
			throw new Error(
				'Network error: Could not reach Elvanto API. Check your internet connection.'
			);
		}
		throw error;
	}
}

/**
 * Test API authentication
 */
async function testAuthentication(accessToken) {
	log('\n🔐 Testing API Access...', 'cyan');

	try {
		const response = await elvantoRequest('people/currentUser', {}, accessToken);

		if (response.person) {
			log(`✓ API access confirmed!`, 'green');
			log(`  Name: ${response.person.firstname} ${response.person.lastname}`, 'bright');
			log(`  Email: ${response.person.email}`, 'bright');
			return true;
		}
	} catch (error) {
		log(`✗ API access failed: ${error.message}`, 'red');
		return false;
	}
}

/**
 * Fetch sample services
 */
async function fetchSampleServices(accessToken) {
	log('\n📅 Fetching Sample Services...', 'cyan');

	try {
		const response = await elvantoRequest(
			'services/getAll',
			{
				page: 1,
				page_size: 5,
				all: 'yes',
				fields: ['songs', 'plans', 'service_times', 'volunteers']
			},
			accessToken
		);

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
async function fetchSampleSongs(accessToken) {
	log('\n🎵 Fetching Sample Songs...', 'cyan');

	try {
		const response = await elvantoRequest(
			'songs/getAll',
			{
				page: 1,
				page_size: 5
			},
			accessToken
		);

		const songs = response.songs?.song || [];

		log(`✓ Found ${response.songs?.total || 0} total songs`, 'green');
		log(`  Showing first ${songs.length}:`, 'bright');

		for (const [index, song] of songs.entries()) {
			log(`\n  ${index + 1}. ${song.title}`, 'yellow');
			log(`     Artist: ${song.artist || 'Unknown'}`, 'reset');
			log(`     ID: ${song.id}`, 'reset');

			if (song.categories && song.categories.length > 0) {
				const categoryNames = song.categories.map((c) => c.name).join(', ');
				log(`     Categories: ${categoryNames}`, 'reset');
			}

			// Fetch arrangement details for first song as example
			if (index === 0) {
				log(`\n     🎼 Fetching arrangement details...`, 'blue');
				try {
					const arrangementResp = await elvantoRequest(
						'songs/getInfo',
						{
							id: song.id
						},
						accessToken
					);

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
							log(
								`       Duration: ${arr.duration_minutes || 0}m ${arr.duration_seconds || 0}s`,
								'reset'
							);
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
	log('    Elvanto API Test (OAuth)', 'bright');
	log('========================================', 'bright');

	// Get credentials from environment
	const clientId = process.env.ELVANTO_CLIENT_ID || process.argv[2];
	const clientSecret = process.env.ELVANTO_CLIENT_SECRET || process.argv[3];

	if (!clientId || !clientSecret) {
		log('\n❌ Error: Missing OAuth credentials', 'red');
		log('\nUsage:', 'yellow');
		log('  ELVANTO_CLIENT_ID=xxx ELVANTO_CLIENT_SECRET=yyy node scripts/elvanto-test-oauth.mjs', 'reset');
		log('  OR', 'reset');
		log('  node scripts/elvanto-test-oauth.mjs client_id client_secret', 'reset');
		log('\nHow to get OAuth credentials:', 'yellow');
		log('  1. Log in to Elvanto', 'reset');
		log('  2. Go to Settings → Integrations → OAuth Applications', 'reset');
		log('  3. Click "Add OAuth Application"', 'reset');
		log('  4. Set Redirect URI: http://localhost:3456/callback', 'reset');
		log('  5. Request Scopes: ManageServices, ManageSongs', 'reset');
		log('  6. Copy Client ID and Client Secret\n', 'reset');
		process.exit(1);
	}

	try {
		// Step 1: Get authorization code
		const authCode = await getAuthorizationCode(clientId);

		// Step 2: Exchange for access token
		const accessToken = await getAccessToken(clientId, clientSecret, authCode);

		// Step 3: Test authentication
		const authenticated = await testAuthentication(accessToken);
		if (!authenticated) {
			log('\n❌ Cannot proceed without valid authentication\n', 'red');
			process.exit(1);
		}

		// Step 4: Fetch sample data
		const services = await fetchSampleServices(accessToken);
		const songs = await fetchSampleSongs(accessToken);

		// Summary
		log('\n========================================', 'bright');
		log('    Summary', 'bright');
		log('========================================', 'bright');
		log(`✓ Services fetched: ${services.length}`, 'green');
		log(`✓ Songs fetched: ${songs.length}`, 'green');
		log('\n✅ OAuth test complete!\n', 'green');
		log('Next steps:', 'yellow');
		log('  • Review the data structure above', 'reset');
		log('  • Adjust field mappings as needed', 'reset');
		log('  • Build full import script with database integration\n', 'reset');
	} catch (error) {
		log(`\n❌ Error: ${error.message}`, 'red');
		process.exit(1);
	}
}

// Run the script
main().catch((error) => {
	log(`\n❌ Unexpected error: ${error.message}`, 'red');
	if (error.stack) {
		log(error.stack, 'red');
	}
	process.exit(1);
});
