/// <reference path="../pocketbase/pb_data/types.d.ts" />

/**
 * Hook to automatically create song_usage records when a service is marked as completed
 */
onRecordAfterUpdateSuccess((e) => {
	const record = e.record;
	const oldStatus = e.record.originalCopy().getString('status');
	const newStatus = record.getString('status');

	// Only proceed if status changed to 'completed'
	if (oldStatus !== 'completed' && newStatus === 'completed') {
		try {
			const serviceId = record.id;
			const churchId = record.getString('church_id');
			const serviceDate = record.getString('service_date');
			const worshipLeader = record.getString('worship_leader');
			const serviceType = record.getString('service_type');

			// Get all songs for this service
			const serviceSongs = $app
				.findRecordsByFilter(
					'service_songs',
					`service_id = {:serviceId}`,
					'-order_position',
					500,
					0,
					{ serviceId: serviceId }
				);

			// Create usage records for each song
			serviceSongs.forEach((serviceSong) => {
				const songId = serviceSong.getString('song_id');
				const transposedKey = serviceSong.getString('transposed_key');
				const orderPosition = serviceSong.getInt('order_position');

				try {
					// Check if usage record already exists to avoid duplicates
					$app.findFirstRecordByFilter(
						'song_usage',
						'service_id = {:serviceId} && song_id = {:songId}',
						{ serviceId: serviceId, songId: songId }
					);
					// If found, skip creating a new one
					console.log(`Usage record already exists for song ${songId} in service ${serviceId}`);
				} catch (e) {
					// Not found, create new usage record
					const collection = $app.findCollectionByNameOrId('song_usage');
					const usageRecord = new Record(collection);

					usageRecord.set('church_id', churchId);
					usageRecord.set('song_id', songId);
					usageRecord.set('service_id', serviceId);
					usageRecord.set('used_date', serviceDate);
					usageRecord.set('used_key', transposedKey);
					usageRecord.set('position_in_service', orderPosition);
					usageRecord.set('worship_leader', worshipLeader);
					usageRecord.set('service_type', serviceType);

					$app.save(usageRecord);
					console.log(`Created usage record for song ${songId} in service ${serviceId}`);
				}
			});

			console.log(`Successfully tracked usage for service ${serviceId} with ${serviceSongs.length} songs`);
		} catch (error) {
			console.error('Failed to track service usage:', error);
			// Don't throw error to avoid blocking the update
		}
	}
}, 'services');
