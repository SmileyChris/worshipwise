routerAdd('GET', '/api/elvanto/services', (e) => {
	const { elvantoFetch } = require(`${__hooks}/elvanto_utils.js`);
	const user = e.auth;
	if (!user) return e.json(401, { error: 'Unauthorized' });

	try {
		const church = $app.findFirstRecordByFilter('churches', 'owner_user_id = {:userId}', {
			userId: user.id
		});
		const apiKey = church.get('elvanto_api_key');
		if (!apiKey) return e.json(400, { error: 'Elvanto API Key not configured.' });

		// Fetch services (last 1 year)
		const d = new Date();
		d.setFullYear(d.getFullYear() - 1);
		const startDate = d.toISOString().split('T')[0];

		const data = elvantoFetch('services/getAll', apiKey, { start: startDate });
		return e.json(200, data);
	} catch (err) {
		return e.json(500, { error: err.message });
	}
});

routerAdd('POST', '/api/elvanto/import/{churchId}', (e) => {
	const { elvantoFetch, upsertRecord } = require(`${__hooks}/elvanto_utils.js`);
	const churchId = e.request.pathValue('churchId');

	try {
		// Safe header check
		// Note: e.request.header is a Go Header map. try .get()
		const authHeader = e.request.header.get('Authorization');
	} catch (hErr) {
		// Ignore header errors
	}

	const user = e.auth;

	if (!user) {
		return e.json(401, { error: 'Unauthorized - No User context found.' });
	}

	try {
		const church = $app.findFirstRecordByFilter(
			'churches',
			'id = {:id} && owner_user_id = {:userId}',
			{
				id: churchId,
				userId: user.id
			}
		);
		const apiKey = church.get('elvanto_api_key');
		if (!apiKey) return e.json(400, { error: 'Elvanto API Key not configured.' });

		// 1. Fetch Services with Plans
		// We limit to last 2 years for initial import.
		const d = new Date();
		d.setFullYear(d.getFullYear() - 2);
		const startDate = d.toISOString().split('T')[0];

		const data = elvantoFetch('services/getAll', apiKey, {
			start: startDate,
			fields: ['plans']
		});

		const services = data.services && data.services.service ? data.services.service : [];
		let importedServices = 0;
		let importedSongs = 0;

		// 2. Process Services
		for (const svc of services) {
			// Check if service has any songs
			let hasSongs = false;
			if (svc.plans && svc.plans.plan) {
				const plans = Array.isArray(svc.plans.plan) ? svc.plans.plan : [svc.plans.plan];
				for (const plan of plans) {
					if (plan.items && plan.items.item) {
						const items = Array.isArray(plan.items.item) ? plan.items.item : [plan.items.item];
						if (items.some((i) => i.song)) {
							hasSongs = true;
							break;
						}
					}
				}
			}
			if (!hasSongs) continue;

			// Upsert Service
			// Map fields
			const svcData = {
				church_id: church.id,
				title: svc.name || 'Untitled Service',
				service_date: svc.date.replace(' ', 'T') + 'Z', // Ensure ISO format from 'YYYY-MM-DD HH:MM:SS'
				status: 'completed',
				created_by: user.id,
				worship_leader: user.id,
				elvanto_id: svc.id
			};

			// Try to map service type
			if (svc.service_type) {
				const typeName = svc.service_type.name;
				if (
					[
						'Sunday Morning',
						'Sunday Evening',
						'Wednesday Night',
						'Special Event',
						'Rehearsal'
					].includes(typeName)
				) {
					svcData.service_type = typeName;
				} else {
					svcData.service_type = 'Other';
				}
			}

			const serviceRecord = upsertRecord(
				'services',
				'elvanto_id = {:eid}',
				{ eid: svc.id },
				svcData,
				$app
			);
			importedServices++;

			// 3. Process Songs in Plan
			if (svc.plans && svc.plans.plan) {
				const plans = Array.isArray(svc.plans.plan) ? svc.plans.plan : [svc.plans.plan];

				for (const plan of plans) {
					if (!plan.items || !plan.items.item) continue;

					const items = Array.isArray(plan.items.item) ? plan.items.item : [plan.items.item];
					let order = 1;

					for (const item of items) {
						// We only care about songs
						if (item.song) {
							// Upsert Song
							const s = item.song;
							const songData = {
								church_id: church.id,
								title: s.title,
								artist: (s.artist || '').substring(0, 100),
								ccli_number: s.ccli_number || '',
								created_by: user.id,
								elvanto_id: s.id,
								is_active: true
							};

							// Upsert logic for song: try to match by elvanto_id first
							const songRecord = upsertRecord(
								'songs',
								'elvanto_id = {:eid}',
								{ eid: s.id },
								songData,
								$app
							);

							// Note: If we wanted to avoid dupes purely by CCLI/Title we'd need more logic,
							// but sticking to elvanto_id is safest for now.

							// Link ServiceSong
							const serviceSongData = {
								service_id: serviceRecord.id,
								song_id: songRecord.id,
								order_position: order++,
								added_by: user.id
							};

							// Using a heuristic unique constraint: service_id + order_position
							// But PB schema has unique index on (service_id, order_position).
							// So we upsert on that.
							upsertRecord(
								'service_songs',
								'service_id = {:sid} && order_position = {:pos}',
								{ sid: serviceRecord.id, pos: serviceSongData.order_position },
								serviceSongData,
								$app
							);

							// Create SongUsage (Log)
							// This is append-only usually, but let's check duplicates
							// Schema: (song_id, service_id) doesn't explicitly force unique in PB schema shown (index?)
							// usage has NO unique index on song/service/date in Step 28.
							// But we should probably avoid adding if it exists for this service/song combination?
							// Actually usage is historical. One song could be used twice?
							// Let's just check if a usage record exists for this service and song.
							try {
								$app.findFirstRecordByFilter(
									'song_usage',
									'service_id = {:sid} && song_id = {:sjid}',
									{
										sid: serviceRecord.id,
										sjid: songRecord.id
									}
								);
							} catch (e) {
								// Not found, create
								const usage = new Record($app.findCollectionByNameOrId('song_usage'));
								usage.set('church_id', church.id);
								usage.set('song_id', songRecord.id);
								usage.set('service_id', serviceRecord.id);
								usage.set('used_date', svcData.service_date);
								usage.set('worship_leader', user.id);
								$app.save(usage);
							}

							importedSongs++;
						}
					}
				}
			}
		}

		// Update Church Sync Time
		church.set('last_elvanto_sync', new Date().toISOString());
		$app.save(church);

		return e.json(200, {
			success: true,
			importedServices,
			importedSongs
		});
	} catch (err) {
		$app.logger().error('Elvanto Import Error', err);
		return e.json(500, { error: err.message, stack: err.stack });
	}
});
