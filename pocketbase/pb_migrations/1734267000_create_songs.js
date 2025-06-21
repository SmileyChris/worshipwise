/// <reference path="../pb_migrations.d.ts" />
migrate(
	(db) => {
		const collection = new Collection({
			id: 'songs_collection',
			created: '2023-12-15 12:00:00.000Z',
			updated: '2023-12-15 12:00:00.000Z',
			name: 'songs',
			type: 'base',
			system: false,
			schema: [
				{
					system: false,
					id: 'title',
					name: 'title',
					type: 'text',
					required: true,
					unique: false,
					options: {
						min: 1,
						max: 200,
						pattern: ''
					}
				},
				{
					system: false,
					id: 'artist',
					name: 'artist',
					type: 'text',
					required: false,
					unique: false,
					options: {
						min: null,
						max: 100,
						pattern: ''
					}
				},
				{
					system: false,
					id: 'key_signature',
					name: 'key_signature',
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
					id: 'tempo',
					name: 'tempo',
					type: 'number',
					required: false,
					unique: false,
					options: {
						min: 60,
						max: 200
					}
				},
				{
					system: false,
					id: 'duration_seconds',
					name: 'duration_seconds',
					type: 'number',
					required: false,
					unique: false,
					options: {
						min: 30,
						max: 1800
					}
				},
				{
					system: false,
					id: 'tags',
					name: 'tags',
					type: 'json',
					required: false,
					unique: false,
					options: {}
				},
				{
					system: false,
					id: 'lyrics',
					name: 'lyrics',
					type: 'editor',
					required: false,
					unique: false,
					options: {}
				},
				{
					system: false,
					id: 'chord_chart',
					name: 'chord_chart',
					type: 'file',
					required: false,
					unique: false,
					options: {
						maxSelect: 1,
						maxSize: 10485760,
						mimeTypes: ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'],
						thumbs: null
					}
				},
				{
					system: false,
					id: 'audio_file',
					name: 'audio_file',
					type: 'file',
					required: false,
					unique: false,
					options: {
						maxSelect: 1,
						maxSize: 52428800,
						mimeTypes: ['audio/mpeg', 'audio/wav', 'audio/mp3', 'audio/m4a'],
						thumbs: null
					}
				},
				{
					system: false,
					id: 'sheet_music',
					name: 'sheet_music',
					type: 'file',
					required: false,
					unique: false,
					options: {
						maxSelect: 3,
						maxSize: 10485760,
						mimeTypes: ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'],
						thumbs: null
					}
				},
				{
					system: false,
					id: 'ccli_number',
					name: 'ccli_number',
					type: 'text',
					required: false,
					unique: false,
					options: {
						min: null,
						max: 20,
						pattern: ''
					}
				},
				{
					system: false,
					id: 'copyright_info',
					name: 'copyright_info',
					type: 'text',
					required: false,
					unique: false,
					options: {
						min: null,
						max: 500,
						pattern: ''
					}
				},
				{
					system: false,
					id: 'notes',
					name: 'notes',
					type: 'editor',
					required: false,
					unique: false,
					options: {}
				},
				{
					system: false,
					id: 'created_by',
					name: 'created_by',
					type: 'relation',
					required: true,
					unique: false,
					options: {
						collectionId: '_pb_users_auth_',
						cascadeDelete: false,
						minSelect: null,
						maxSelect: 1,
						displayFields: []
					}
				},
				{
					system: false,
					id: 'is_active',
					name: 'is_active',
					type: 'bool',
					required: false,
					unique: false,
					options: {}
				}
			],
			indexes: [
				'CREATE INDEX `idx_songs_title` ON `songs` (`title`)',
				'CREATE INDEX `idx_songs_artist` ON `songs` (`artist`)',
				'CREATE INDEX `idx_songs_created_by` ON `songs` (`created_by`)',
				'CREATE INDEX `idx_songs_is_active` ON `songs` (`is_active`)'
			],
			listRule: "@request.auth.id != '' && is_active = true",
			viewRule: "@request.auth.id != '' && is_active = true",
			createRule:
				"@request.auth.id != '' && (@request.auth.role = 'leader' || @request.auth.role = 'admin')",
			updateRule:
				"@request.auth.id != '' && (@request.auth.role = 'leader' || @request.auth.role = 'admin' || created_by = @request.auth.id)",
			deleteRule: "@request.auth.role = 'admin'",
			options: {}
		});

		return Dao(db).saveCollection(collection);
	},
	(db) => {
		const dao = new Dao(db);
		const collection = dao.findCollectionByNameOrId('songs');

		return dao.deleteCollection(collection);
	}
);
