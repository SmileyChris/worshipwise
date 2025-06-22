# PocketBase Migration Guide

This document provides comprehensive guidance for writing and managing PocketBase migrations, based on PocketBase v0.23.0+ syntax.

## Overview

PocketBase migrations are JavaScript files that define database schema changes. They use a transactional approach where each migration has an "up" function (apply changes) and a "down" function (rollback changes).

## Migration Syntax (v0.23.0+)

### Basic Structure

```javascript
/// <reference path="../pb_data/types.d.ts" />
migrate(
	(app) => {
		// Up migration - apply changes
		// Create or modify collections here
	},
	(app) => {
		// Down migration - rollback changes
		// Remove or restore collections here
	}
);
```

### Modern Collection Creation (v0.28+)

```javascript
migrate(
	(app) => {
		const collection = new Collection({
			name: 'collection_name',
			type: 'base', // or "auth"
			fields: [
				new TextField({
					name: 'title',
					required: true,
					max: 200
				}),
				new RelationField({
					name: 'user_id',
					required: true,
					options: {
						collectionId: '_pb_users_auth_',
						maxSelect: 1
					}
				})
			]
		});

		return app.save(collection);
	},
	(app) => {
		const collection = app.findCollectionByNameOrId('collection_name');
		return app.delete(collection);
	}
);
```

### Key Changes from Pre-v0.23.0

- **Function Parameter**: Use `(app) =>` instead of `(db) =>`
- **No Dao Class**: The `Dao` abstraction was removed
- **Direct App Methods**: Use `app.save()`, `app.delete()`, `app.findCollectionByNameOrId()` directly

## Collection Operations

### Creating a Collection

```javascript
migrate(
	(app) => {
		const collection = new Collection({
			id: 'unique_collection_id',
			created: '2023-12-15 12:00:00.000Z',
			updated: '2023-12-15 12:00:00.000Z',
			name: 'collection_name',
			type: 'base',
			system: false,
			schema: [
				// Field definitions
			],
			indexes: [
				// Index definitions
			],
			listRule: 'access_rule',
			viewRule: 'access_rule',
			createRule: 'access_rule',
			updateRule: 'access_rule',
			deleteRule: 'access_rule',
			options: {}
		});

		return app.save(collection);
	},
	(app) => {
		const collection = app.findCollectionByNameOrId('collection_name');
		return app.delete(collection);
	}
);
```

### Updating a Collection

```javascript
migrate(
	(app) => {
		const collection = app.findCollectionByNameOrId('existing_collection');

		// Modify collection properties
		collection.schema.push({
			system: false,
			id: 'new_field',
			name: 'new_field',
			type: 'text',
			required: false,
			unique: false,
			options: {
				min: null,
				max: 255,
				pattern: ''
			}
		});

		return app.save(collection);
	},
	(app) => {
		const collection = app.findCollectionByNameOrId('existing_collection');

		// Remove the added field
		collection.schema = collection.schema.filter((field) => field.name !== 'new_field');

		return app.save(collection);
	}
);
```

## Field Types and Options

### Common Field Types

```javascript
// Text field
{
  system: false,
  id: 'field_id',
  name: 'field_name',
  type: 'text',
  required: true,
  unique: false,
  options: {
    min: 1,
    max: 200,
    pattern: ''
  }
}

// Select field
{
  system: false,
  id: 'status',
  name: 'status',
  type: 'select',
  required: false,
  unique: false,
  options: {
    maxSelect: 1,
    values: ['active', 'inactive', 'pending']
  }
}

// Relation field
{
  system: false,
  id: 'user_id',
  name: 'user_id',
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
}

// File field
{
  system: false,
  id: 'attachment',
  name: 'attachment',
  type: 'file',
  required: false,
  unique: false,
  options: {
    maxSelect: 3,
    maxSize: 10485760, // 10MB
    mimeTypes: ['application/pdf', 'image/jpeg', 'image/png'],
    thumbs: null
  }
}

// Number field
{
  system: false,
  id: 'price',
  name: 'price',
  type: 'number',
  required: false,
  unique: false,
  options: {
    min: 0,
    max: 999999
  }
}

// Boolean field
{
  system: false,
  id: 'is_active',
  name: 'is_active',
  type: 'bool',
  required: false,
  unique: false,
  options: {}
}

// JSON field
{
  system: false,
  id: 'metadata',
  name: 'metadata',
  type: 'json',
  required: false,
  unique: false,
  options: {}
}

// Date field
{
  system: false,
  id: 'due_date',
  name: 'due_date',
  type: 'date',
  required: false,
  unique: false,
  options: {
    min: '',
    max: ''
  }
}

// Editor field (rich text)
{
  system: false,
  id: 'content',
  name: 'content',
  type: 'editor',
  required: false,
  unique: false,
  options: {}
}
```

## Indexes

```javascript
indexes: [
	'CREATE INDEX `idx_collection_field` ON `collection_name` (`field_name`)',
	'CREATE INDEX `idx_collection_composite` ON `collection_name` (`field1`, `field2`)',
	'CREATE UNIQUE INDEX `idx_collection_unique` ON `collection_name` (`unique_field`)'
];
```

## Access Rules

### Rule Examples

```javascript
// Public read, authenticated write
listRule: "",
viewRule: "",
createRule: "@request.auth.id != ''",
updateRule: "@request.auth.id != ''",
deleteRule: "@request.auth.id != ''",

// Owner-only access
listRule: "@request.auth.id != '' && created_by = @request.auth.id",
viewRule: "@request.auth.id != '' && created_by = @request.auth.id",
createRule: "@request.auth.id != ''",
updateRule: "@request.auth.id != '' && created_by = @request.auth.id",
deleteRule: "@request.auth.id != '' && created_by = @request.auth.id",

// Role-based access
createRule: "@request.auth.id != '' && (@request.auth.role = 'admin' || @request.auth.role = 'editor')",
updateRule: "@request.auth.id != '' && (@request.auth.role = 'admin' || created_by = @request.auth.id)",
deleteRule: "@request.auth.role = 'admin'",

// Church-specific multi-tenancy
listRule: "@request.auth.id != '' && church = @request.auth.church",
viewRule: "@request.auth.id != '' && church = @request.auth.church",
```

## Migration Management

### Creating Migrations

```bash
# Create a new blank migration
./pocketbase migrate create migration_name

# Create migration with collections snapshot
./pocketbase migrate collections
```

### Running Migrations

```bash
# Apply all pending migrations
./pocketbase migrate up

# Rollback last N migrations
./pocketbase migrate down 2

# Check migration history
./pocketbase migrate history-sync
```

### Migration Directory

- **Location**: `pocketbase/pb_migrations/`
- **Naming**: `{timestamp}_{description}.js`
- **Execution**: Must be run from `pocketbase/` directory
- **Order**: Applied in chronological order based on timestamp

## Best Practices

### 1. Collection IDs

- Use descriptive, unique IDs for collections
- Consider using `{name}_collection` format for clarity
- IDs cannot be changed after creation

### 2. Field Design

- Use appropriate field types for data validation
- Set reasonable min/max constraints
- Consider indexing frequently queried fields
- Use relations for referential integrity

### 3. Access Rules

- Start with restrictive rules and open up as needed
- Test rules thoroughly in development
- Consider multi-tenancy requirements early
- Use clear, readable rule expressions

### 4. Migration Safety

- Always provide a proper rollback (down) function
- Test migrations on development data first
- Keep migrations focused on single concerns
- Document complex field relationships

### 5. File Fields

- Set appropriate file size limits
- Restrict MIME types for security
- Consider storage implications for large files
- Use thumbnails for image fields when needed

## Common Pitfalls

### 1. Wrong Syntax Version

❌ **Incorrect (pre-v0.23.0):**

```javascript
migrate((db) => {
	const dao = new Dao(db);
	return dao.saveCollection(collection);
});
```

✅ **Correct (v0.23.0+):**

```javascript
migrate((app) => {
	return app.save(collection);
});
```

### 2. Missing Down Migration

❌ **Incorrect:**

```javascript
migrate((app) => {
	// Only up function
});
```

✅ **Correct:**

```javascript
migrate(
	(app) => {
		// Up function
	},
	(app) => {
		// Down function
	}
);
```

### 3. Incorrect Collection References

❌ **Incorrect:**

```javascript
collectionId: 'users'; // Wrong - should use actual collection ID
```

✅ **Correct:**

```javascript
collectionId: '_pb_users_auth_'; // System users collection
// or
collectionId: 'custom_collection_id'; // Custom collection ID
```

## Working with This Project

### Church-Centric Design

This project uses a church-centric multi-tenancy model:

- All collections should consider church affiliation
- Access rules should filter by church membership
- Relations should respect church boundaries

### Existing Collections

Current schema includes:

- `users` (extended with church relations)
- `churches` (foundational organization unit)
- `profiles` (user metadata with church context)
- `songs` (church-specific song library)
- `services` (worship service planning)
- `service_songs` (junction table for service/song relations)
- `song_usage` (analytics tracking)

### Migration Execution

Always run migrations from the correct directory:

```bash
cd pocketbase
./pocketbase migrate up
```

## Troubleshooting

### Common Errors

1. **"Dao is not defined"** - Using old syntax, update to v0.23.0+ format
2. **"Collection not found"** - Check collection ID/name spelling
3. **"Migration failed"** - Review field types and constraints
4. **"Access denied"** - Verify access rules allow the operation

### Debugging Tips

- Use `--dev` flag for detailed logging: `./pocketbase serve --dev`
- Check migration history: `./pocketbase migrate history-sync`
- Validate JSON syntax in migration files
- Test access rules in PocketBase admin UI

## Reference

- [PocketBase JavaScript Migrations Documentation](https://pocketbase.io/docs/js-migrations/)
- [PocketBase Collection Operations](https://pocketbase.io/docs/js-collections/)
- [PocketBase Access Rules](https://pocketbase.io/docs/api-rules-and-filters/)
