# PocketBase Schema Setup Guide

This document provides detailed instructions for setting up the PocketBase backend for WorshipWise, including collection schemas, relationships, and security rules.

## Initial PocketBase Setup

### 1. Download and Install PocketBase

```bash
# Download PocketBase for your platform
wget https://github.com/pocketbase/pocketbase/releases/latest/download/pocketbase_linux_amd64.zip
unzip pocketbase_linux_amd64.zip

# Make executable and run
chmod +x pocketbase
./pocketbase serve
```

### 2. Access Admin Interface

1. Open http://localhost:8090/\_/
2. Create admin account on first visit
3. Access Collections tab to begin schema setup

## Collection Schemas

### 1. Users Collection (Auth Collection)

**Collection Name**: `users`  
**Type**: Auth Collection  
**Settings**:

- Allow registration: true
- Email verification: optional
- Password reset: true

#### Fields:

```javascript
{
  // Built-in auth fields (email, password, etc.)

  // Custom fields:
  "name": {
    "type": "text",
    "required": true,
    "max": 100
  },
  "role": {
    "type": "select",
    "required": true,
    "options": ["musician", "leader", "admin"],
    "default": "musician"
  },
  "church_name": {
    "type": "text",
    "required": false,
    "max": 200
  },
  "preferred_keys": {
    "type": "json",
    "required": false
  },
  "notification_preferences": {
    "type": "json",
    "required": false
  },
  "is_active": {
    "type": "bool",
    "required": true,
    "default": true
  }
}
```

#### API Rules:

```javascript
{
  "listRule": "@request.auth.id != '' && (@request.auth.role = 'admin' || @request.auth.id = id)",
  "viewRule": "@request.auth.id != ''",
  "createRule": "", // Allow registration
  "updateRule": "@request.auth.id = id || @request.auth.role = 'admin'",
  "deleteRule": "@request.auth.role = 'admin'"
}
```

### 2. Categories Collection

**Collection Name**: `categories`  
**Type**: Base Collection

#### Fields:

```javascript
{
  "name": {
    "type": "text",
    "required": true,
    "max": 100
  },
  "description": {
    "type": "text",
    "required": false,
    "max": 500
  },
  "color": {
    "type": "text",
    "required": false,
    "max": 7,
    "pattern": "^#[0-9A-Fa-f]{6}$"
  },
  "sort_order": {
    "type": "number",
    "required": true,
    "min": 0
  },
  "is_active": {
    "type": "bool",
    "required": true,
    "default": true
  }
}
```

#### API Rules:

```javascript
{
  "listRule": "@request.auth.id != ''",
  "viewRule": "@request.auth.id != ''",
  "createRule": "@request.auth.role = 'admin'",
  "updateRule": "@request.auth.role = 'admin'",
  "deleteRule": "@request.auth.role = 'admin'"
}
```

#### Initial Categories Data:

```javascript
[
	{
		name: 'Hymns and Te Reo',
		description: 'Traditional hymns and Te Reo Māori songs',
		color: '#8B4513',
		sort_order: 1,
		is_active: true
	},
	{
		name: 'Contemporary',
		description: 'Contemporary worship songs',
		color: '#4169E1',
		sort_order: 2,
		is_active: true
	},
	{
		name: 'Seasonal (youth suggestions)',
		description: 'Seasonal songs, often suggested by youth',
		color: '#32CD32',
		sort_order: 3,
		is_active: true
	},
	{
		name: 'Christmas Songs',
		description: 'Christmas and holiday worship songs',
		color: '#DC143C',
		sort_order: 4,
		is_active: true
	},
	{
		name: 'Possible New Songs',
		description: 'Songs being considered for regular use',
		color: '#FFD700',
		sort_order: 5,
		is_active: true
	},
	{
		name: 'Modern (archive list)',
		description: 'Modern songs from the archive',
		color: '#9932CC',
		sort_order: 6,
		is_active: true
	}
];
```

### 3. Labels Collection

**Collection Name**: `labels`  
**Type**: Base Collection

#### Fields:

```javascript
{
  "name": {
    "type": "text",
    "required": true,
    "max": 50
  },
  "description": {
    "type": "text",
    "required": false,
    "max": 200
  },
  "color": {
    "type": "text",
    "required": false,
    "max": 7,
    "pattern": "^#[0-9A-Fa-f]{6}$"
  },
  "created_by": {
    "type": "relation",
    "required": true,
    "relatedCollection": "users",
    "cascadeDelete": false
  },
  "is_active": {
    "type": "bool",
    "required": true,
    "default": true
  }
}
```

#### API Rules:

```javascript
{
  "listRule": "@request.auth.id != ''",
  "viewRule": "@request.auth.id != ''",
  "createRule": "@request.auth.id != '' && (@request.auth.role = 'leader' || @request.auth.role = 'admin')",
  "updateRule": "@request.auth.id != '' && (@request.auth.role = 'admin' || created_by = @request.auth.id)",
  "deleteRule": "@request.auth.id != '' && (@request.auth.role = 'admin' || created_by = @request.auth.id)"
}
```

### 4. Songs Collection

**Collection Name**: `songs`  
**Type**: Base Collection

#### Fields:

```javascript
{
  "title": {
    "type": "text",
    "required": true,
    "max": 200
  },
  "artist": {
    "type": "text",
    "required": false,
    "max": 100
  },
  "category": {
    "type": "relation",
    "required": true,
    "relatedCollection": "categories",
    "cascadeDelete": false,
    "maxSelect": 1
  },
  "labels": {
    "type": "relation",
    "required": false,
    "relatedCollection": "labels",
    "cascadeDelete": false,
    "maxSelect": 10
  },
  "key_signature": {
    "type": "select",
    "required": false,
    "options": ["C", "C#", "Db", "D", "D#", "Eb", "E", "F", "F#", "Gb", "G", "G#", "Ab", "A", "A#", "Bb", "B", "Cm", "C#m", "Dm", "D#m", "Ebm", "Em", "Fm", "F#m", "Gm", "G#m", "Am", "A#m", "Bbm", "Bm"]
  },
  "tempo": {
    "type": "number",
    "required": false,
    "min": 60,
    "max": 200
  },
  "duration_seconds": {
    "type": "number",
    "required": false,
    "min": 30,
    "max": 1800
  },
  "tags": {
    "type": "json",
    "required": false
  },
  "lyrics": {
    "type": "editor",
    "required": false
  },
  "chord_chart": {
    "type": "file",
    "required": false,
    "maxSelect": 1,
    "maxSize": 10485760
  },
  "audio_file": {
    "type": "file",
    "required": false,
    "maxSelect": 1,
    "maxSize": 52428800
  },
  "sheet_music": {
    "type": "file",
    "required": false,
    "maxSelect": 3,
    "maxSize": 10485760
  },
  "ccli_number": {
    "type": "text",
    "required": false,
    "max": 20
  },
  "copyright_info": {
    "type": "text",
    "required": false,
    "max": 500
  },
  "notes": {
    "type": "editor",
    "required": false
  },
  "created_by": {
    "type": "relation",
    "required": true,
    "relatedCollection": "users",
    "cascadeDelete": false
  },
  "is_active": {
    "type": "bool",
    "required": true,
    "default": true
  }
}
```

#### API Rules:

```javascript
{
  "listRule": "@request.auth.id != '' && is_active = true",
  "viewRule": "@request.auth.id != '' && is_active = true",
  "createRule": "@request.auth.id != '' && (@request.auth.role = 'leader' || @request.auth.role = 'admin')",
  "updateRule": "@request.auth.id != '' && (@request.auth.role = 'leader' || @request.auth.role = 'admin' || created_by = @request.auth.id)",
  "deleteRule": "@request.auth.role = 'admin'"
}
```

#### Indexes:

- `title` (for search)
- `artist` (for filtering)
- `category` (for category filtering)
- `labels` (for label filtering)
- `created_by` (for user songs)
- `is_active` (for active songs filter)

### 3. Services Collection

**Collection Name**: `setlists` _(legacy database name for compatibility)_  
**Type**: Base Collection  
**Purpose**: Manages worship services and service planning

#### Fields:

```javascript
{
  "title": {
    "type": "text",
    "required": true,
    "max": 200
  },
  "service_date": {
    "type": "date",
    "required": true
  },
  "service_time": {
    "type": "text",
    "required": false,
    "max": 10
  },
  "service_type": {
    "type": "select",
    "required": false,
    "options": ["Sunday Morning", "Sunday Evening", "Wednesday", "Special Event", "Youth", "Kids"]
  },
  "theme": {
    "type": "text",
    "required": false,
    "max": 200
  },
  "notes": {
    "type": "editor",
    "required": false
  },
  "worship_leader": {
    "type": "relation",
    "required": true,
    "relatedCollection": "users",
    "cascadeDelete": false
  },
  "team_members": {
    "type": "relation",
    "required": false,
    "relatedCollection": "users",
    "cascadeDelete": false,
    "maxSelect": 10
  },
  "status": {
    "type": "select",
    "required": true,
    "options": ["draft", "planned", "active", "completed"],
    "default": "draft"
  },
  "total_duration": {
    "type": "number",
    "required": false,
    "min": 0
  },
  "is_template": {
    "type": "bool",
    "required": true,
    "default": false
  }
}
```

#### API Rules:

```javascript
{
  "listRule": "@request.auth.id != '' && (@request.auth.role = 'admin' || worship_leader = @request.auth.id || team_members ?~ @request.auth.id)",
  "viewRule": "@request.auth.id != '' && (@request.auth.role = 'admin' || worship_leader = @request.auth.id || team_members ?~ @request.auth.id)",
  "createRule": "@request.auth.id != '' && (@request.auth.role = 'leader' || @request.auth.role = 'admin')",
  "updateRule": "@request.auth.id != '' && (@request.auth.role = 'admin' || worship_leader = @request.auth.id)",
  "deleteRule": "@request.auth.id != '' && (@request.auth.role = 'admin' || worship_leader = @request.auth.id)"
}
```

#### Indexes:

- `service_date` (for calendar views)
- `worship_leader` (for user services)
- `status` (for filtering)

### 4. Service Songs Collection (Junction Table)

**Collection Name**: `setlist_songs` _(legacy database name for compatibility)_  
**Type**: Base Collection  
**Purpose**: Junction table linking songs to services with ordering and customization

#### Fields:

```javascript
{
  "setlist": {  // Links to service (collection name is legacy)
    "type": "relation",
    "required": true,
    "relatedCollection": "setlists",  // Points to Services collection
    "cascadeDelete": true
  },
  "song": {
    "type": "relation",
    "required": true,
    "relatedCollection": "songs",
    "cascadeDelete": false
  },
  "order": {
    "type": "number",
    "required": true,
    "min": 0
  },
  "key_override": {
    "type": "select",
    "required": false,
    "options": ["C", "C#", "Db", "D", "D#", "Eb", "E", "F", "F#", "Gb", "G", "G#", "Ab", "A", "A#", "Bb", "B", "Cm", "C#m", "Dm", "D#m", "Ebm", "Em", "Fm", "F#m", "Gm", "G#m", "Am", "A#m", "Bbm", "Bm"]
  },
  "notes": {
    "type": "text",
    "required": false,
    "max": 500
  },
  "is_instrumental": {
    "type": "bool",
    "required": true,
    "default": false
  },
  "special_instructions": {
    "type": "text",
    "required": false,
    "max": 200
  }
}
```

#### API Rules:

_Note: `setlist` in rules refers to the service record (database field name)_

```javascript
{
  "listRule": "@request.auth.id != '' && (@request.auth.role = 'admin' || setlist.worship_leader = @request.auth.id || setlist.team_members ?~ @request.auth.id)",
  "viewRule": "@request.auth.id != '' && (@request.auth.role = 'admin' || setlist.worship_leader = @request.auth.id || setlist.team_members ?~ @request.auth.id)",
  "createRule": "@request.auth.id != '' && (@request.auth.role = 'admin' || setlist.worship_leader = @request.auth.id)",
  "updateRule": "@request.auth.id != '' && (@request.auth.role = 'admin' || setlist.worship_leader = @request.auth.id)",
  "deleteRule": "@request.auth.id != '' && (@request.auth.role = 'admin' || setlist.worship_leader = @request.auth.id)"
}
```

#### Indexes:

- `setlist` (for service queries - database field name)
- `order` (for sorting)
- Composite: `(setlist, order)` (for ordered service song queries)

### 5. Song Usage Collection

**Collection Name**: `song_usage`  
**Type**: Base Collection

#### Fields:

```javascript
{
  "song": {
    "type": "relation",
    "required": true,
    "relatedCollection": "songs",
    "cascadeDelete": false
  },
  "setlist": {
    "type": "relation",
    "required": true,
    "relatedCollection": "setlists",
    "cascadeDelete": true
  },
  "usage_date": {
    "type": "date",
    "required": true
  },
  "worship_leader": {
    "type": "relation",
    "required": true,
    "relatedCollection": "users",
    "cascadeDelete": false
  },
  "key_used": {
    "type": "select",
    "required": false,
    "options": ["C", "C#", "Db", "D", "D#", "Eb", "E", "F", "F#", "Gb", "G", "G#", "Ab", "A", "A#", "Bb", "B", "Cm", "C#m", "Dm", "D#m", "Ebm", "Em", "Fm", "F#m", "Gm", "G#m", "Am", "A#m", "Bbm", "Bm"]
  },
  "service_type": {
    "type": "select",
    "required": false,
    "options": ["Sunday Morning", "Sunday Evening", "Wednesday", "Special Event", "Youth", "Kids"]
  }
}
```

#### API Rules:

```javascript
{
  "listRule": "@request.auth.id != ''",
  "viewRule": "@request.auth.id != ''",
  "createRule": "@request.auth.id != '' && (@request.auth.role = 'leader' || @request.auth.role = 'admin')",
  "updateRule": "@request.auth.role = 'admin'",
  "deleteRule": "@request.auth.role = 'admin'"
}
```

#### Indexes:

- `song` (for song usage queries)
- `usage_date` (for date filtering)
- `worship_leader` (for leader analytics)
- Composite: `(song, usage_date)` (for song frequency analysis)

### 6. Song Analytics View (Virtual Collection)

**Collection Name**: `song_analytics_view`  
**Type**: View Collection

This is created as a database view for optimized analytics queries:

```sql
CREATE VIEW song_analytics_view AS
SELECT
  s.id as song_id,
  s.title,
  s.artist,
  COUNT(su.id) as usage_count,
  MAX(su.usage_date) as last_used,
  MIN(su.usage_date) as first_used,
  AVG(CASE WHEN su.usage_date >= date('now', '-30 days') THEN 1 ELSE 0 END) as recent_usage_rate,
  GROUP_CONCAT(DISTINCT su.worship_leader) as used_by_leaders
FROM songs s
LEFT JOIN song_usage su ON s.id = su.song
WHERE s.is_active = true
GROUP BY s.id, s.title, s.artist;
```

## Database Relationships Summary

```
users (1) ─────┬─── (many) setlists
               ├─── (many) songs (created_by)
               ├─── (many) labels (created_by)
               └─── (many) song_usage

categories (1) ─── (many) songs

labels (many) ─── (many) songs

songs (1) ─────┬─── (many) setlist_songs
               ├─── (many) song_usage
               ├─── (1) category
               └─── (many) labels

setlists (1) ──┬─── (many) setlist_songs  # Services → Service Songs
               └─── (many) song_usage   # Services → Usage Records

setlist_songs ─┬─── (1) setlist  # Service Songs → Parent Service
               └─── (1) song     # Service Songs → Song

song_usage ────┬─── (1) song     # Usage → Song
               ├─── (1) setlist  # Usage → Service (database field)
               └─── (1) worship_leader  # Usage → Leader
```

## Initial Data Setup

### 1. Create Sample Users

```javascript
// Admin User
{
  "email": "admin@church.com",
  "password": "admin123",
  "name": "Church Admin",
  "role": "admin",
  "church_name": "Sample Church"
}

// Worship Leader
{
  "email": "leader@church.com",
  "password": "leader123",
  "name": "John Worship",
  "role": "leader",
  "church_name": "Sample Church",
  "preferred_keys": ["G", "C", "D", "A"]
}

// Musician
{
  "email": "musician@church.com",
  "password": "musician123",
  "name": "Jane Musician",
  "role": "musician",
  "church_name": "Sample Church"
}
```

### 2. Create Sample Songs

```javascript
[
	{
		title: 'Amazing Grace',
		artist: 'Traditional',
		key_signature: 'G',
		tempo: 80,
		duration_seconds: 240,
		tags: ['traditional', 'hymn', 'grace'],
		ccli_number: '22025',
		is_active: true
	},
	{
		title: 'How Great Thou Art',
		artist: 'Traditional',
		key_signature: 'C',
		tempo: 72,
		duration_seconds: 280,
		tags: ['traditional', 'hymn', 'worship'],
		ccli_number: '14181',
		is_active: true
	},
	{
		title: '10,000 Reasons',
		artist: 'Matt Redman',
		key_signature: 'A',
		tempo: 125,
		duration_seconds: 230,
		tags: ['contemporary', 'worship', 'praise'],
		ccli_number: '6016351',
		is_active: true
	}
];
```

## Security Configuration

### 1. General Settings

In PocketBase Admin → Settings:

- **App URL**: Set to your domain (e.g., https://worshipwise.church.com)
- **File Upload**: Max file size 50MB, allowed extensions: pdf,jpg,png,mp3,wav,m4a
- **Email Templates**: Customize verification and password reset emails
- **Rate Limiting**: Enable with reasonable limits (e.g., 100 requests/minute)

### 2. API Security Rules Best Practices

#### Rule Components:

- `@request.auth.id`: Current authenticated user ID
- `@request.auth.role`: Current user's role
- `@request.data`: Data being submitted
- `@collection`: Reference to other collections

#### Common Patterns:

```javascript
// Only authenticated users
"@request.auth.id != ''";

// Only admins or record owner
"@request.auth.role = 'admin' || created_by = @request.auth.id";

// Role-based access
"@request.auth.role ?~ 'leader|admin'";

// Relation-based access
'setlist.worship_leader = @request.auth.id';

// Multiple conditions
"@request.auth.id != '' && (is_active = true || created_by = @request.auth.id)";
```

### 3. File Upload Security

Configure file upload rules for each collection:

- **Allowed extensions**: pdf, jpg, jpeg, png, mp3, wav, m4a
- **Max file size**: 50MB for audio, 10MB for documents/images
- **Virus scanning**: Enable if available
- **CDN integration**: Configure for better performance

## Backup and Maintenance

### 1. Automated Backups

```bash
#!/bin/bash
# pb_backup.sh
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups/pocketbase"

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup entire pb_data directory
tar -czf $BACKUP_DIR/pb_data_$DATE.tar.gz pb_data/

# Keep only last 30 days
find $BACKUP_DIR -name "*.tar.gz" -mtime +30 -delete

echo "PocketBase backup completed: pb_data_$DATE.tar.gz"
```

### 2. Database Maintenance

Regular maintenance tasks:

- **Vacuum database**: Monthly vacuum for SQLite optimization
- **File cleanup**: Remove orphaned files from failed uploads
- **Log rotation**: Manage PocketBase logs to prevent disk space issues
- **Index optimization**: Monitor query performance and add indexes as needed

### 3. Migration Scripts

For schema changes, create migration scripts:

```javascript
// migration_001_add_song_duration.js
migrate((db) => {
	const dao = new Dao(db);
	const collection = dao.findCollectionByNameOrId('songs');

	// Add new field
	const field = new SchemaField({
		system: false,
		id: 'duration',
		name: 'duration_seconds',
		type: 'number',
		required: false,
		min: 30,
		max: 1800
	});

	collection.schema.addField(field);

	return dao.saveCollection(collection);
});
```

## Troubleshooting

### Common Issues

1. **CORS Errors**: Ensure app URL is set correctly in settings
2. **File Upload Failures**: Check file size limits and permissions
3. **Auth Token Expiry**: Implement proper token refresh logic
4. **Real-time Connection Issues**: Monitor WebSocket connections
5. **Performance Issues**: Add database indexes for slow queries

### Debug Mode

Enable debug mode for development:

```bash
./pocketbase serve --debug
```

This provides detailed logging for troubleshooting API issues and performance problems.

### Health Checks

Implement health check endpoints:

- Database connectivity
- File system access
- Memory usage
- Active connections

This setup provides a solid foundation for the WorshipWise backend with proper security, performance, and maintainability considerations.
