/// <reference path="../pb_migrations.d.ts" />
migrate(
	(app) => {
		const collection = new Collection({
			id: 'setlists_collection',
			created: '2023-12-15 12:15:00.000Z',
			updated: '2023-12-15 12:15:00.000Z',
			name: 'setlists',
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
					id: 'service_date',
					name: 'service_date',
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
				},
				{
					system: false,
					id: 'theme',
					name: 'theme',
					type: 'text',
					required: false,
					unique: false,
					options: {
						min: null,
						max: 300,
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
					id: 'team_members',
					name: 'team_members',
					type: 'relation',
					required: false,
					unique: false,
					options: {
						collectionId: '_pb_users_auth_',
						cascadeDelete: false,
						minSelect: null,
						maxSelect: 10,
						displayFields: ['name', 'email']
					}
				},
				{
					system: false,
					id: 'status',
					name: 'status',
					type: 'select',
					required: true,
					unique: false,
					options: {
						maxSelect: 1,
						values: ['draft', 'planned', 'in_progress', 'completed', 'archived']
					}
				},
				{
					system: false,
					id: 'estimated_duration',
					name: 'estimated_duration',
					type: 'number',
					required: false,
					unique: false,
					options: {
						min: 300,
						max: 7200
					}
				},
				{
					system: false,
					id: 'actual_duration',
					name: 'actual_duration',
					type: 'number',
					required: false,
					unique: false,
					options: {
						min: 300,
						max: 7200
					}
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
					id: 'is_template',
					name: 'is_template',
					type: 'bool',
					required: false,
					unique: false,
					options: {}
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
		const collection = app.findCollectionByNameOrId('setlists');

		return app.delete(collection);
	}
);
