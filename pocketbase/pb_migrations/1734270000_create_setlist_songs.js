/// <reference path="../pb_migrations.d.ts" />
migrate(
	(app) => {
		const collection = new Collection({
			id: 'setlist_songs_collection',
			created: '2023-12-15 12:16:00.000Z',
			updated: '2023-12-15 12:16:00.000Z',
			name: 'setlist_songs',
			type: 'base',
			system: false,
			schema: [
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
					id: 'order_position',
					name: 'order_position',
					type: 'number',
					required: true,
					unique: false,
					options: {
						min: 1,
						max: 50
					}
				},
				{
					system: false,
					id: 'transposed_key',
					name: 'transposed_key',
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
					id: 'tempo_override',
					name: 'tempo_override',
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
					id: 'transition_notes',
					name: 'transition_notes',
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
					id: 'section_type',
					name: 'section_type',
					type: 'select',
					required: false,
					unique: false,
					options: {
						maxSelect: 1,
						values: [
							'Opening',
							'Call to Worship',
							'Praise & Worship',
							'Intercession',
							'Offering',
							'Communion',
							'Response',
							'Closing',
							'Special Music'
						]
					}
				},
				{
					system: false,
					id: 'duration_override',
					name: 'duration_override',
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
					id: 'added_by',
					name: 'added_by',
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
				}
			],
			indexes: [],
			listRule: "@request.auth.id != ''",
			viewRule: "@request.auth.id != ''",
			createRule: "@request.auth.id != ''",
			updateRule: "@request.auth.id != ''",
			deleteRule: "@request.auth.id != ''",
			options: {}
		});

		return app.save(collection);
	},
	(app) => {
		const collection = app.findCollectionByNameOrId('setlist_songs');

		return app.delete(collection);
	}
);
