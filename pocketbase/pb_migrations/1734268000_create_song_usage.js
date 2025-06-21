/// <reference path="../pb_migrations.d.ts" />
migrate(
	(db) => {
		const collection = new Collection({
			id: 'song_usage_collection',
			created: '2023-12-15 12:10:00.000Z',
			updated: '2023-12-15 12:10:00.000Z',
			name: 'song_usage',
			type: 'base',
			system: false,
			schema: [
				{
					system: false,
					id: 'song_id',
					name: 'song_id',
					type: 'relation',
					required: true,
					unique: false,
					options: {
						collectionId: 'songs_collection',
						cascadeDelete: true,
						minSelect: null,
						maxSelect: 1,
						displayFields: ['title']
					}
				},
				{
					system: false,
					id: 'setlist_id',
					name: 'setlist_id',
					type: 'relation',
					required: true,
					unique: false,
					options: {
						collectionId: 'setlists_collection',
						cascadeDelete: true,
						minSelect: null,
						maxSelect: 1,
						displayFields: ['title']
					}
				},
				{
					system: false,
					id: 'used_date',
					name: 'used_date',
					type: 'date',
					required: true,
					unique: false,
					options: {
						min: '',
						max: ''
					}
				},
				{
					system: false,
					id: 'used_key',
					name: 'used_key',
					type: 'select',
					required: false,
					unique: false,
					options: {
						maxSelect: 1,
						values: [
							'C',
							'C#',
							'Db',
							'D',
							'D#',
							'Eb',
							'E',
							'F',
							'F#',
							'Gb',
							'G',
							'G#',
							'Ab',
							'A',
							'A#',
							'Bb',
							'B',
							'Cm',
							'C#m',
							'Dm',
							'D#m',
							'Ebm',
							'Em',
							'Fm',
							'F#m',
							'Gm',
							'G#m',
							'Am',
							'A#m',
							'Bbm',
							'Bm'
						]
					}
				},
				{
					system: false,
					id: 'position_in_setlist',
					name: 'position_in_setlist',
					type: 'number',
					required: false,
					unique: false,
					options: {
						min: 1,
						max: 50
					}
				},
				{
					system: false,
					id: 'worship_leader',
					name: 'worship_leader',
					type: 'relation',
					required: true,
					unique: false,
					options: {
						collectionId: '_pb_users_auth_',
						cascadeDelete: false,
						minSelect: null,
						maxSelect: 1,
						displayFields: ['name', 'email']
					}
				},
				{
					system: false,
					id: 'service_type',
					name: 'service_type',
					type: 'select',
					required: false,
					unique: false,
					options: {
						maxSelect: 1,
						values: [
							'Sunday Morning',
							'Sunday Evening',
							'Wednesday Night',
							'Special Event',
							'Youth Service',
							'Prayer Meeting',
							'Conference',
							'Outreach'
						]
					}
				}
			],
			indexes: [
				'CREATE INDEX `idx_song_usage_song_id` ON `song_usage` (`song_id`)',
				'CREATE INDEX `idx_song_usage_setlist_id` ON `song_usage` (`setlist_id`)',
				'CREATE INDEX `idx_song_usage_used_date` ON `song_usage` (`used_date`)',
				'CREATE INDEX `idx_song_usage_worship_leader` ON `song_usage` (`worship_leader`)',
				'CREATE INDEX `idx_song_usage_composite` ON `song_usage` (`song_id`, `used_date`)'
			],
			listRule: "@request.auth.id != ''",
			viewRule: "@request.auth.id != ''",
			createRule:
				"@request.auth.id != '' && (@request.auth.role = 'leader' || @request.auth.role = 'admin')",
			updateRule: "@request.auth.role = 'admin'",
			deleteRule: "@request.auth.role = 'admin'",
			options: {}
		});

		return Dao(db).saveCollection(collection);
	},
	(db) => {
		const dao = new Dao(db);
		const collection = dao.findCollectionByNameOrId('song_usage');

		return dao.deleteCollection(collection);
	}
);
