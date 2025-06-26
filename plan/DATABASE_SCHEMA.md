# WorshipWise Database Schema

This document provides a comprehensive overview of the WorshipWise database schema, including all collections, fields, relationships, and security rules.

**Last Updated**: June 2025  
**PocketBase Version**: 0.23+  
**Migration**: `20250622_initial_worshipwise.js` (consolidated)

## Overview

WorshipWise uses a church-centric multi-tenant architecture where all data is organized around church organizations. Users can belong to multiple churches with different roles and permissions.

## Collections

### 1. Churches

**Purpose**: Core organizational entity for multi-tenant data isolation  
**Type**: Base Collection

#### Fields:

- `id` - Auto-generated unique identifier
- `name` (text, required) - Church name
- `slug` (text, required, unique) - URL-friendly identifier
- `description` (text) - Church description
- `city` (text) - City location
- `state` (text) - State/Province
- `country` (text) - Country
- `timezone` (text, required) - IANA timezone (e.g., "America/New_York")
- `hemisphere` (select) - "northern" or "southern" (auto-detected from timezone)
- `worship_style` (select) - "traditional", "contemporary", "blended"
- `denomination` (text) - Denominational affiliation
- `website` (url) - Church website
- `primary_admin` (relation to users, required) - Primary administrator
- `subscription_type` (select, required) - "free", "basic", "pro", "enterprise"
- `subscription_expires` (date) - Subscription expiration date
- `member_limit` (number) - Maximum members allowed
- `mistral_api_key` (text, max: 200) - Church-specific Mistral API key for AI features
- `created` - Auto-generated timestamp
- `updated` - Auto-generated timestamp

#### Rules:

- List/View: `@request.auth.id != ''`
- Create: `@request.auth.id != ''`
- Update: Member must be admin of the church
- Delete: Member must be admin of the church

### 2. Church Memberships

**Purpose**: Junction table managing user-church relationships with roles  
**Type**: Base Collection

#### Fields:

- `id` - Auto-generated unique identifier
- `church_id` (relation to churches, required) - Church reference
- `user_id` (relation to users, required) - User reference
- `role` (select, required) - "musician", "leader", "admin"
- `permissions` (json, required) - Granular permissions object
- `status` (select, required) - "active", "pending", "suspended"
- `preferred_keys` (json) - Array of preferred musical keys
- `notification_preferences` (json) - Notification settings
- `invited_by` (relation to users) - Who invited this member
- `invited_date` (date) - When invitation was sent
- `joined_date` (date) - When user joined the church
- `is_active` (bool) - Active status flag
- `created` - Auto-generated timestamp
- `updated` - Auto-generated timestamp

#### Indexes:

- Unique composite index on `(church_id, user_id)`

#### Rules:

- List/View: Authenticated users
- Create: Authenticated users
- Update: Church admins or self
- Delete: Church admins

### 3. Church Invitations

**Purpose**: Manage pending invitations to join churches  
**Type**: Base Collection

#### Fields:

- `id` - Auto-generated unique identifier
- `church_id` (relation to churches, required) - Target church
- `email` (email, required) - Invitee email address
- `role` (select, required) - "musician", "leader", "admin"
- `permissions` (json, required) - Proposed permissions
- `invited_by` (relation to users, required) - Inviting user
- `token` (text, required, unique) - Invitation token
- `expires_at` (date, required) - Expiration timestamp
- `used_at` (date) - When invitation was accepted
- `used_by` (relation to users) - User who accepted
- `is_active` (bool) - Active status
- `created` - Auto-generated timestamp
- `updated` - Auto-generated timestamp

#### Indexes:

- Unique index on `token`

#### Rules:

- All operations require authentication

### 4. Songs

**Purpose**: Central song repository with metadata and attachments  
**Type**: Base Collection

#### Fields:

- `id` - Auto-generated unique identifier
- `church_id` (relation to churches, required) - Owning church
- `title` (text, required) - Song title
- `artist` (text) - Artist/composer
- `category` (relation to categories, required) - Song category
- `labels` (relation to labels, multiple) - Associated labels
- `key_signature` (select) - Musical key (C, C#, D, etc.)
- `tempo` (number) - BPM (60-300)
- `time_signature` (text) - Time signature (e.g., "4/4")
- `genre` (text) - Musical genre
- `duration_seconds` (number) - Song duration
- `lyrics` (text) - Song lyrics
- `notes` (text) - Performance notes
- `tags` (json) - Searchable tags array
- `chord_chart` (file) - Chord chart attachment
- `sheet_music` (file, multiple) - Sheet music files
- `audio_file` (file) - Reference audio
- `youtube_link` (url) - YouTube reference
- `ccli_number` (text) - CCLI license number
- `copyright_info` (text) - Copyright information
- `lyrics_analysis` (json) - AI-generated lyrics analysis
- `created_by` (relation to users, required) - Creator
- `created` - Auto-generated timestamp
- `updated` - Auto-generated timestamp

#### Rules:

- List/View: Authenticated users in the church
- Create: Leaders and admins
- Update: Leaders, admins, or creator
- Delete: Admins only

### 5. Services

**Purpose**: Worship service planning and management  
**Type**: Base Collection

#### Fields:

- `id` - Auto-generated unique identifier
- `church_id` (relation to churches, required) - Church reference
- `title` (text, required) - Service title
- `description` (text) - Service description
- `service_date` (date, required) - Service date
- `service_time` (text) - Service time
- `service_type` (select) - Type of service
- `theme` (text) - Service theme
- `scripture_reference` (text) - Biblical references
- `worship_leader` (relation to users, required) - Service leader
- `team_members` (relation to users, multiple) - Team members
- `notes` (text) - Service notes
- `status` (select, required) - "draft", "scheduled", "completed", "cancelled"
- `is_template` (bool) - Template flag
- `created_by` (relation to users, required) - Creator
- `total_duration` (number) - Calculated duration
- `actual_attendance` (number) - Attendance count
- `completed_at` (date) - Completion timestamp
- `created` - Auto-generated timestamp
- `updated` - Auto-generated timestamp

#### Rules:

- List/View: Church members
- Create: Leaders and admins
- Update: Leaders, admins, or worship leader
- Delete: Admins or worship leader

### 6. Service Songs

**Purpose**: Junction table for songs in services with ordering  
**Type**: Base Collection

#### Fields:

- `id` - Auto-generated unique identifier
- `service_id` (relation to services, required) - Parent service
- `song_id` (relation to songs, required) - Song reference
- `position` (number, required) - Order in service (1-50)
- `key_override` (select) - Service-specific key
- `notes` (text) - Performance notes
- `duration_override` (number) - Custom duration
- `added_by` (relation to users, required) - Who added the song
- `created` - Auto-generated timestamp
- `updated` - Auto-generated timestamp

#### Indexes:

- Composite index on `(service_id, position)`

#### Rules:

- List/View: Church members
- Create/Update/Delete: Service worship leader or admins

### 7. Song Usage

**Purpose**: Track historical song usage for analytics  
**Type**: Base Collection

#### Fields:

- `id` - Auto-generated unique identifier
- `song_id` (relation to songs, required) - Song reference
- `service_id` (relation to services, required) - Service reference
- `used_date` (date, required) - Date of usage
- `used_key` (select) - Key used in service
- `position_in_service` (number) - Position (1-50)
- `worship_leader` (relation to users, required) - Service leader
- `service_type` (select) - Type of service
- `created` - Auto-generated timestamp
- `updated` - Auto-generated timestamp

#### Rules:

- List/View: Authenticated users
- Create: Authenticated users (auto-created when service completed)
- Update/Delete: Admins only

### 8. Categories

**Purpose**: Song categorization system  
**Type**: Base Collection

#### Fields:

- `id` - Auto-generated unique identifier
- `name` (text, required) - Category name
- `description` (text) - Category description
- `color` (text) - Hex color code (#RRGGBB)
- `sort_order` (number, required) - Display order
- `is_active` (bool, required) - Active status
- `created` - Auto-generated timestamp
- `updated` - Auto-generated timestamp

#### Default Categories:

1. Hymns and Te Reo
2. Contemporary
3. Seasonal (youth suggestions)
4. Christmas Songs
5. Possible New Songs
6. Modern (archive list)

#### Rules:

- List/View: Authenticated users
- Create/Update/Delete: Admins only

### 9. Labels

**Purpose**: Flexible tagging system for songs  
**Type**: Base Collection

#### Fields:

- `id` - Auto-generated unique identifier
- `name` (text, required) - Label name
- `description` (text) - Label description
- `color` (text) - Hex color code
- `created_by` (relation to users, required) - Creator
- `is_active` (bool, required) - Active status
- `created` - Auto-generated timestamp
- `updated` - Auto-generated timestamp

#### Rules:

- List/View: Authenticated users
- Create: Leaders and admins
- Update/Delete: Admins or creator

### 10. Users (Auth Collection)

**Purpose**: User authentication and basic profile  
**Type**: Auth Collection (built-in PocketBase)

#### Fields:

- `id` - Auto-generated unique identifier
- `email` (email, required, unique) - Login email
- `username` (text, unique) - Username
- `name` (text) - Display name
- `avatar` (file) - Profile picture
- `verified` (bool) - Email verification status
- `emailVisibility` (bool) - Email privacy setting
- `created` - Auto-generated timestamp
- `updated` - Auto-generated timestamp

**Note**: Users do NOT have a `current_church_id` field. The current church context is determined through their active church membership.

## Views

### Setup Status View

**Purpose**: Check if initial church setup is required  
**Query**: Checks if any churches exist in the system

```sql
CREATE VIEW IF NOT EXISTS setup_status AS
SELECT
    CASE
        WHEN COUNT(*) > 0 THEN 1
        ELSE 0
    END as has_churches
FROM churches;
```

## Relationships

```
churches (1) ────┬─── (many) church_memberships
                 ├─── (many) church_invitations
                 ├─── (many) songs
                 ├─── (many) services
                 └─── (1) primary_admin → users

users (1) ───────┬─── (many) church_memberships
                 ├─── (many) songs (created_by)
                 ├─── (many) services (worship_leader)
                 ├─── (many) service_songs (added_by)
                 └─── (many) song_usage (worship_leader)

categories (1) ────── (many) songs

labels (many) ─────── (many) songs

songs (1) ────────┬─── (many) service_songs
                  └─── (many) song_usage

services (1) ─────┬─── (many) service_songs
                  └─── (many) song_usage

church_memberships ├─── (1) church_id → churches
                   └─── (1) user_id → users

service_songs ────┬─── (1) service_id → services
                  └─── (1) song_id → songs

song_usage ───────┬─── (1) song_id → songs
                  ├─── (1) service_id → services
                  └─── (1) worship_leader → users
```

## Security Model

### Role-Based Access Control

1. **Admin**: Full access to church data, user management, settings
2. **Leader**: Create/edit songs and services, view analytics
3. **Musician**: View songs and services, limited editing

### Data Isolation

- All data is scoped to churches through `church_id` fields
- Users can only access data from churches they belong to
- Church membership determines access level

### API Rules

- Authentication required for all operations
- Role-based permissions enforced at collection level
- Church membership validated for data access

## Migration Notes

1. **Single Consolidated Migration**: All collections created in `20250622_initial_worshipwise.js`
2. **Auto-detected Hemisphere**: Calculated from timezone if not specified
3. **Default Permissions**: Set based on role during membership creation
4. **Cascade Deletes**: Properly configured for data integrity

## Performance Considerations

1. **Indexes**: Created on frequently queried fields
2. **Composite Indexes**: For multi-field queries
3. **JSON Fields**: Used for flexible, schema-less data
4. **File Storage**: Handled by PocketBase's built-in file system

## AI Integration

The `mistral_api_key` field in the churches collection enables AI features:

- Lyrics analysis for worship insights
- Automatic label suggestions based on themes
- Seasonal appropriateness recommendations
- Biblical reference extraction

If no church-specific key is set, the system falls back to the global `PUBLIC_MISTRAL_API_KEY` environment variable.
