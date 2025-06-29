/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
	// Get collection IDs
	const songsCollection = app.findCollectionByNameOrId('songs');
	const churchesCollection = app.findCollectionByNameOrId('churches');
	
	if (!songsCollection || !churchesCollection) {
		console.error("Required collections not found");
		throw new Error("songs or churches collection not found");
	}
	
	const songsId = songsCollection.id;
	const churchesId = churchesCollection.id;

	// Create song_ratings collection
	const songRatings = new Collection({
		name: 'song_ratings',
		type: 'base',
		listRule: '@request.auth.id != ""',
		viewRule: '@request.auth.id != ""',
		createRule: '@request.auth.id != ""',
		updateRule: '@request.auth.id != ""',
		deleteRule: '@request.auth.id != ""',
		fields: [
			{
				type: 'relation',
				name: 'song_id',
				required: true,
				collectionId: songsId,
				cascadeDelete: true,
				maxSelect: 1
			},
			{
				type: 'relation',
				name: 'user_id',
				required: true,
				collectionId: '_pb_users_auth_',
				cascadeDelete: true,
				maxSelect: 1
			},
			{
				type: 'relation',
				name: 'church_id',
				required: true,
				collectionId: churchesId,
				cascadeDelete: true,
				maxSelect: 1
			},
			{
				type: 'select',
				name: 'rating',
				required: true,
				maxSelect: 1,
				values: ['thumbs_up', 'neutral', 'thumbs_down']
			},
			{
				type: 'bool',
				name: 'is_difficult'
			}
		]
	});

	// Create song_suggestions collection
	const songSuggestions = new Collection({
		name: 'song_suggestions',
		type: 'base',
		listRule: '@request.auth.id != ""',
		viewRule: '@request.auth.id != ""',
		createRule: '@request.auth.id != ""',
		updateRule: '@request.auth.id != ""',
		deleteRule: '@request.auth.id != ""',
		fields: [
			{
				type: 'relation',
				name: 'song_id',
				required: true,
				collectionId: songsId,
				cascadeDelete: true,
				maxSelect: 1
			},
			{
				type: 'relation',
				name: 'church_id',
				required: true,
				collectionId: churchesId,
				cascadeDelete: true,
				maxSelect: 1
			},
			{
				type: 'relation',
				name: 'suggested_by',
				required: true,
				collectionId: '_pb_users_auth_',
				cascadeDelete: false,
				maxSelect: 1
			},
			{
				type: 'text',
				name: 'notes',
				max: 1000
			},
			{
				type: 'select',
				name: 'status',
				required: true,
				maxSelect: 1,
				values: ['pending', 'approved', 'rejected']
			}
		]
	});

	// Create notifications collection
	const notifications = new Collection({
		name: 'notifications',
		type: 'base',
		listRule: '@request.auth.id != ""',
		viewRule: '@request.auth.id != ""',
		createRule: null, // Only system can create notifications
		updateRule: '@request.auth.id != ""', // Users can mark as read
		deleteRule: '@request.auth.id != ""',
		fields: [
			{
				type: 'relation',
				name: 'church_id',
				required: true,
				collectionId: churchesId,
				cascadeDelete: true,
				maxSelect: 1
			},
			{
				type: 'relation',
				name: 'user_id',
				required: true,
				collectionId: '_pb_users_auth_',
				cascadeDelete: true,
				maxSelect: 1
			},
			{
				type: 'select',
				name: 'type',
				required: true,
				maxSelect: 1,
				values: ['song_added', 'song_retired', 'song_suggested', 'service_reminder']
			},
			{
				type: 'text',
				name: 'title',
				required: true,
				presentable: true,
				max: 200
			},
			{
				type: 'text',
				name: 'message',
				required: true,
				max: 500
			},
			{
				type: 'json',
				name: 'data',
				maxSize: 5000
			},
			{
				type: 'bool',
				name: 'is_read'
			}
		]
	});

	// Create team_share_links collection
	const teamShareLinks = new Collection({
		name: 'team_share_links',
		type: 'base',
		listRule: '@request.auth.id != ""',
		viewRule: null, // Public access via token
		createRule: '@request.auth.id != ""',
		updateRule: null,
		deleteRule: '@request.auth.id != ""',
		fields: [
			{
				type: 'relation',
				name: 'church_id',
				required: true,
				collectionId: churchesId,
				cascadeDelete: true,
				maxSelect: 1
			},
			{
				type: 'text',
				name: 'token',
				required: true,
				unique: true,
				min: 32,
				max: 64
			},
			{
				type: 'date',
				name: 'expires_at',
				required: true
			},
			{
				type: 'relation',
				name: 'created_by',
				required: true,
				collectionId: '_pb_users_auth_',
				cascadeDelete: false,
				maxSelect: 1
			},
			{
				type: 'select',
				name: 'access_type',
				required: true,
				maxSelect: 1,
				values: ['ratings', 'suggestions', 'both']
			}
		]
	});

	// Save new collections
	app.save(songRatings);
	app.save(songSuggestions);
	app.save(notifications);
	app.save(teamShareLinks);

	// Add new fields to songs collection (reuse the one we already fetched)
	// Add is_retired field
	const isRetiredField = new Field({
		id: 'is_retired',
		name: 'is_retired',
		type: 'bool',
		required: false,
		presentable: false,
		unique: false,
		options: {}
	});
	songsCollection.fields.add(isRetiredField);

	// Add retired_date field
	const retiredDateField = new Field({
		id: 'retired_date',
		name: 'retired_date',
		type: 'date',
		required: false,
		presentable: false,
		unique: false,
		options: {
			min: '',
			max: ''
		}
	});
	songsCollection.fields.add(retiredDateField);

	// Add retired_reason field
	const retiredReasonField = new Field({
		id: 'retired_reason',
		name: 'retired_reason',
		type: 'text',
		required: false,
		presentable: false,
		unique: false,
		options: {
			min: null,
			max: 100,
			pattern: ''
		}
	});
	songsCollection.fields.add(retiredReasonField);

	// Save updated songs collection
	app.save(songsCollection);

	// Set default values for existing songs using raw SQL
	app.db().newQuery('UPDATE songs SET is_retired = FALSE WHERE is_retired IS NULL').execute();
}, (app) => {
	// Remove collections
	const songRatingsCollection = app.findCollectionByNameOrId('song_ratings');
	if (songRatingsCollection) {
		app.delete(songRatingsCollection);
	}

	const songSuggestionsCollection = app.findCollectionByNameOrId('song_suggestions');
	if (songSuggestionsCollection) {
		app.delete(songSuggestionsCollection);
	}

	const notificationsCollection = app.findCollectionByNameOrId('notifications');
	if (notificationsCollection) {
		app.delete(notificationsCollection);
	}

	const teamShareLinksCollection = app.findCollectionByNameOrId('team_share_links');
	if (teamShareLinksCollection) {
		app.delete(teamShareLinksCollection);
	}

	// Remove fields from songs
	const songsCollection = app.findCollectionByNameOrId('songs');
	if (songsCollection) {
		// Remove the added fields
		songsCollection.fields.removeById('is_retired');
		songsCollection.fields.removeById('retired_date');
		songsCollection.fields.removeById('retired_reason');
		app.save(songsCollection);
	}
});