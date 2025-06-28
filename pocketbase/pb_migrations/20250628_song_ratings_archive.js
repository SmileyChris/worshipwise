/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
	const dao = new Dao(db);

	// Create song_ratings collection
	const songRatings = new Collection({
		id: 'songratings001',
		name: 'song_ratings',
		type: 'base',
		system: false,
		schema: [
			{
				name: 'song_id',
				type: 'relation',
				required: true,
				presentable: false,
				unique: false,
				options: {
					collectionId: 'songs',
					cascadeDelete: true,
					minSelect: null,
					maxSelect: 1,
					displayFields: null
				}
			},
			{
				name: 'user_id',
				type: 'relation',
				required: true,
				presentable: false,
				unique: false,
				options: {
					collectionId: '_pb_users_auth_',
					cascadeDelete: true,
					minSelect: null,
					maxSelect: 1,
					displayFields: null
				}
			},
			{
				name: 'church_id',
				type: 'relation',
				required: true,
				presentable: false,
				unique: false,
				options: {
					collectionId: 'churches',
					cascadeDelete: true,
					minSelect: null,
					maxSelect: 1,
					displayFields: null
				}
			},
			{
				name: 'rating',
				type: 'select',
				required: true,
				presentable: false,
				unique: false,
				options: {
					maxSelect: 1,
					values: ['thumbs_up', 'neutral', 'thumbs_down']
				}
			},
			{
				name: 'is_difficult',
				type: 'bool',
				required: false,
				presentable: false,
				unique: false,
				options: {}
			}
		],
		indexes: ['CREATE UNIQUE INDEX idx_unique_song_rating ON song_ratings (song_id, user_id, church_id)'],
		listRule: '@request.auth.id != "" && church_id.church_memberships_via_church_id.user_id ?= @request.auth.id',
		viewRule: '@request.auth.id != "" && church_id.church_memberships_via_church_id.user_id ?= @request.auth.id',
		createRule: '@request.auth.id != "" && church_id.church_memberships_via_church_id.user_id ?= @request.auth.id && user_id = @request.auth.id',
		updateRule: '@request.auth.id != "" && user_id = @request.auth.id',
		deleteRule: '@request.auth.id != "" && user_id = @request.auth.id',
		options: {}
	});

	// Create song_suggestions collection
	const songSuggestions = new Collection({
		id: 'songsuggests01',
		name: 'song_suggestions',
		type: 'base',
		system: false,
		schema: [
			{
				name: 'song_id',
				type: 'relation',
				required: true,
				presentable: false,
				unique: false,
				options: {
					collectionId: 'songs',
					cascadeDelete: true,
					minSelect: null,
					maxSelect: 1,
					displayFields: null
				}
			},
			{
				name: 'church_id',
				type: 'relation',
				required: true,
				presentable: false,
				unique: false,
				options: {
					collectionId: 'churches',
					cascadeDelete: true,
					minSelect: null,
					maxSelect: 1,
					displayFields: null
				}
			},
			{
				name: 'suggested_by',
				type: 'relation',
				required: true,
				presentable: false,
				unique: false,
				options: {
					collectionId: '_pb_users_auth_',
					cascadeDelete: false,
					minSelect: null,
					maxSelect: 1,
					displayFields: null
				}
			},
			{
				name: 'notes',
				type: 'text',
				required: false,
				presentable: false,
				unique: false,
				options: {
					min: null,
					max: 1000
				}
			},
			{
				name: 'status',
				type: 'select',
				required: true,
				presentable: false,
				unique: false,
				options: {
					maxSelect: 1,
					values: ['pending', 'approved', 'rejected']
				}
			}
		],
		indexes: [],
		listRule: '@request.auth.id != "" && church_id.church_memberships_via_church_id.user_id ?= @request.auth.id',
		viewRule: '@request.auth.id != "" && church_id.church_memberships_via_church_id.user_id ?= @request.auth.id',
		createRule: '@request.auth.id != "" && church_id.church_memberships_via_church_id.user_id ?= @request.auth.id && suggested_by = @request.auth.id',
		updateRule: '@request.auth.id != "" && (church_id.church_memberships_via_church_id.user_id ?= @request.auth.id && church_id.church_memberships_via_church_id.role ?= "admin" || church_id.church_memberships_via_church_id.role ?= "leader")',
		deleteRule: '@request.auth.id != "" && (suggested_by = @request.auth.id || (church_id.church_memberships_via_church_id.user_id ?= @request.auth.id && church_id.church_memberships_via_church_id.role ?= "admin"))',
		options: {}
	});

	// Create notifications collection
	const notifications = new Collection({
		id: 'notifications01',
		name: 'notifications',
		type: 'base',
		system: false,
		schema: [
			{
				name: 'church_id',
				type: 'relation',
				required: true,
				presentable: false,
				unique: false,
				options: {
					collectionId: 'churches',
					cascadeDelete: true,
					minSelect: null,
					maxSelect: 1,
					displayFields: null
				}
			},
			{
				name: 'user_id',
				type: 'relation',
				required: true,
				presentable: false,
				unique: false,
				options: {
					collectionId: '_pb_users_auth_',
					cascadeDelete: true,
					minSelect: null,
					maxSelect: 1,
					displayFields: null
				}
			},
			{
				name: 'type',
				type: 'select',
				required: true,
				presentable: false,
				unique: false,
				options: {
					maxSelect: 1,
					values: ['song_added', 'song_retired', 'song_suggested', 'service_reminder']
				}
			},
			{
				name: 'title',
				type: 'text',
				required: true,
				presentable: true,
				unique: false,
				options: {
					min: null,
					max: 200
				}
			},
			{
				name: 'message',
				type: 'text',
				required: true,
				presentable: false,
				unique: false,
				options: {
					min: null,
					max: 500
				}
			},
			{
				name: 'data',
				type: 'json',
				required: false,
				presentable: false,
				unique: false,
				options: {}
			},
			{
				name: 'is_read',
				type: 'bool',
				required: false,
				presentable: false,
				unique: false,
				options: {}
			}
		],
		indexes: ['CREATE INDEX idx_notifications_user ON notifications (user_id, is_read)'],
		listRule: '@request.auth.id != "" && user_id = @request.auth.id',
		viewRule: '@request.auth.id != "" && user_id = @request.auth.id',
		createRule: null, // Only system can create notifications
		updateRule: '@request.auth.id != "" && user_id = @request.auth.id', // Users can mark as read
		deleteRule: '@request.auth.id != "" && user_id = @request.auth.id',
		options: {}
	});

	// Create team_share_links collection
	const teamShareLinks = new Collection({
		id: 'teamsharelinks1',
		name: 'team_share_links',
		type: 'base',
		system: false,
		schema: [
			{
				name: 'church_id',
				type: 'relation',
				required: true,
				presentable: false,
				unique: false,
				options: {
					collectionId: 'churches',
					cascadeDelete: true,
					minSelect: null,
					maxSelect: 1,
					displayFields: null
				}
			},
			{
				name: 'token',
				type: 'text',
				required: true,
				presentable: false,
				unique: true,
				options: {
					min: 32,
					max: 64
				}
			},
			{
				name: 'expires_at',
				type: 'date',
				required: true,
				presentable: false,
				unique: false,
				options: {
					min: '',
					max: ''
				}
			},
			{
				name: 'created_by',
				type: 'relation',
				required: true,
				presentable: false,
				unique: false,
				options: {
					collectionId: '_pb_users_auth_',
					cascadeDelete: false,
					minSelect: null,
					maxSelect: 1,
					displayFields: null
				}
			},
			{
				name: 'access_type',
				type: 'select',
				required: true,
				presentable: false,
				unique: false,
				options: {
					maxSelect: 1,
					values: ['ratings', 'suggestions', 'both']
				}
			}
		],
		indexes: ['CREATE UNIQUE INDEX idx_share_token ON team_share_links (token)'],
		listRule: '@request.auth.id != "" && (church_id.church_memberships_via_church_id.user_id ?= @request.auth.id && (church_id.church_memberships_via_church_id.role ?= "admin" || church_id.church_memberships_via_church_id.role ?= "leader"))',
		viewRule: null, // Public access via token
		createRule: '@request.auth.id != "" && (church_id.church_memberships_via_church_id.user_id ?= @request.auth.id && (church_id.church_memberships_via_church_id.role ?= "admin" || church_id.church_memberships_via_church_id.role ?= "leader")) && created_by = @request.auth.id',
		updateRule: null,
		deleteRule: '@request.auth.id != "" && (created_by = @request.auth.id || (church_id.church_memberships_via_church_id.user_id ?= @request.auth.id && church_id.church_memberships_via_church_id.role ?= "admin"))',
		options: {}
	});

	// Add new fields to songs collection
	const songsCollection = dao.findCollectionByNameOrId('songs');
	
	// Add is_retired field
	songsCollection.schema.addField(new SchemaField({
		name: 'is_retired',
		type: 'bool',
		required: false,
		presentable: false,
		unique: false,
		options: {}
	}));

	// Add retired_date field
	songsCollection.schema.addField(new SchemaField({
		name: 'retired_date',
		type: 'date',
		required: false,
		presentable: false,
		unique: false,
		options: {
			min: '',
			max: ''
		}
	}));

	// Add retired_reason field
	songsCollection.schema.addField(new SchemaField({
		name: 'retired_reason',
		type: 'text',
		required: false,
		presentable: false,
		unique: false,
		options: {
			min: null,
			max: 100
		}
	}));

	// Save all collections
	dao.saveCollection(songRatings);
	dao.saveCollection(songSuggestions);
	dao.saveCollection(notifications);
	dao.saveCollection(teamShareLinks);
	dao.saveCollection(songsCollection);

	return dao.runInTransaction((txDao) => {
		// Set default values for existing songs
		txDao.db().newQuery('UPDATE songs SET is_retired = FALSE WHERE is_retired IS NULL').execute();
	});
}, (db) => {
	const dao = new Dao(db);

	// Remove collections
	dao.deleteCollection(dao.findCollectionByNameOrId('song_ratings'));
	dao.deleteCollection(dao.findCollectionByNameOrId('song_suggestions'));
	dao.deleteCollection(dao.findCollectionByNameOrId('notifications'));
	dao.deleteCollection(dao.findCollectionByNameOrId('team_share_links'));

	// Remove fields from songs
	const songsCollection = dao.findCollectionByNameOrId('songs');
	songsCollection.schema.removeField('is_retired');
	songsCollection.schema.removeField('retired_date');
	songsCollection.schema.removeField('retired_reason');
	dao.saveCollection(songsCollection);
});