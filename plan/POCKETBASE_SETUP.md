# PocketBase Setup Guide

**Migration Update**: WorshipWise uses a consolidated migration (`20250622_initial_worshipwise.js`). See [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md) for complete schema.

## Setup

```bash
# Download and install PocketBase
wget https://github.com/pocketbase/pocketbase/releases/latest/download/pocketbase_linux_amd64.zip
unzip pocketbase_linux_amd64.zip
chmod +x pocketbase

# Run migrations
cd pocketbase/
./pocketbase migrate
./pocketbase serve --dev
```

## Access

- Admin Interface: http://localhost:8090/\_/
- Create admin account on first visit

## Architecture

**Single Migration**: All collections created in one migration for consistency  
**Church-Centric**: Multi-tenant system organized around church organizations  
**Modern PocketBase**: Updated for v0.23+ with improved field definitions

## Core Collections

1. **Users** - Authentication with basic user data
2. **Churches** - Church organizations with timezone, location
3. **Church Memberships** - User-to-church relationships with roles
4. **Songs** - Central repository with metadata, file attachments
5. **Services** - Service planning with dates and themes
6. **Service Songs** - Junction table for drag-and-drop ordering
7. **Song Usage** - Analytics tracking

## Security Configuration

### General Settings

- **App URL**: Set to your domain
- **File Upload**: Max 50MB, extensions: pdf,jpg,png,mp3,wav,m4a
- **Rate Limiting**: Enable with reasonable limits

### API Security Rules

```javascript
// Common patterns
"@request.auth.id != ''"; // Only authenticated users
"@request.auth.role = 'admin'"; // Admin only
"@request.auth.role ?~ 'leader|admin'"; // Role-based access
'created_by = @request.auth.id'; // Record owner
```

## Backup & Maintenance

```bash
#!/bin/bash
# Automated backup script
DATE=$(date +%Y%m%d_%H%M%S)
tar -czf /backups/pb_data_$DATE.tar.gz pb_data/
find /backups -name "*.tar.gz" -mtime +30 -delete
```

## Troubleshooting

**Common Issues:**

- CORS Errors: Check app URL in settings
- File Upload: Verify size limits and permissions
- Performance: Add database indexes for slow queries
- Debug: Use `./pocketbase serve --debug` for detailed logging

**Health Checks:**

- Database connectivity
- File system access
- Memory usage
- Active connections
