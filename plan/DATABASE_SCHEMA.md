# WorshipWise Database Schema

This document provides a comprehensive overview of the WorshipWise database schema, including all collections, fields, relationships, and security rules.

**Last Updated**: January 2026
**PocketBase Version**: 0.28+
**Migration Count**: 21 migration files

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
- `elvanto_api_key` (text, max: 200) - Elvanto integration API key
- `last_elvanto_sync` (date) - Last Elvanto sync timestamp
- `created` - Auto-generated timestamp
- `updated` - Auto-generated timestamp

#### Rules:

- List/View: `@request.auth.id != ''`
- Create: `@request.auth.id != ''`
- Update: Member must have `manage-church` permission
- Delete: Member must have `manage-church` permission

### 2. Church Memberships

**Purpose**: Junction table managing user-church relationships
**Type**: Base Collection

#### Fields:

- `id` - Auto-generated unique identifier
- `church_id` (relation to churches, required) - Church reference
- `user_id` (relation to users, required) - User reference
- `role` (select, required) - Legacy field: "musician", "leader", "admin"
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
- Update: Users with `manage-members` permission or self
- Delete: Users with `manage-members` permission

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

### 4. Songs

**Purpose**: Central song repository with metadata and attachments
**Type**: Base Collection

#### Fields:

- `id` - Auto-generated unique identifier
- `church_id` (relation to churches, required) - Owning church
- `title` (text, required) - Song title
- `artist` (text) - Artist/composer
- `labels` (relation to labels, multiple) - Associated labels for categorization
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
- `is_active` (bool) - Active status
- `is_retired` (bool) - Whether song is retired from rotation
- `retired_date` (date) - When song was retired
- `retired_reason` (text, max: 100) - Reason for retirement
- `elvanto_id` (text, unique) - Elvanto integration ID
- `created_by` (relation to users, required) - Creator
- `created` - Auto-generated timestamp
- `updated` - Auto-generated timestamp

#### Rules:

- List/View: Authenticated users in the church
- Create: Users with `manage-songs` permission
- Update: Users with `manage-songs` permission or creator
- Delete: Users with `manage-songs` permission

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
- `team_members` (relation to users, multiple, max: 10) - Team members
- `team_skills` (json) - Skill-based assignments: `{ "skill_id": "user_id", ... }`
- `notes` (text) - Service notes
- `status` (select, required) - "draft", "scheduled", "completed", "cancelled"
- `is_template` (bool) - Template flag for reusable services
- `created_by` (relation to users, required) - Creator
- `total_duration` (number) - Calculated duration
- `actual_attendance` (number) - Attendance count
- `completed_at` (date) - Completion timestamp
- `elvanto_id` (text, unique) - Elvanto integration ID
- **Approval Workflow Fields:**
  - `approval_status` (select) - "not_required", "pending_approval", "approved", "rejected", "changes_requested"
  - `approval_requested_at` (date) - When approval was requested
  - `approval_requested_by` (relation to users) - Who requested approval
  - `approved_by` (relation to users) - Who approved
  - `approval_date` (date) - When approved
  - `approval_notes` (text, max: 1000) - Approval/rejection notes
- `created` - Auto-generated timestamp
- `updated` - Auto-generated timestamp

#### Rules:

- List/View: Church members
- Create: Users with `manage-services` permission
- Update: Users with `manage-services` permission or worship leader
- Delete: Users with `manage-services` permission or worship leader

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

### 8. Labels

**Purpose**: Flexible tagging/categorization system for songs
**Type**: Base Collection

#### Fields:

- `id` - Auto-generated unique identifier
- `church_id` (relation to churches, required) - Owning church
- `name` (text, required, max: 50) - Label name
- `description` (text, max: 200) - Label description
- `color` (text, max: 7, pattern: `^#[0-9A-Fa-f]{6}$`) - Hex color code
- `is_active` (bool, required) - Active status
- `created_by` (relation to users, required) - Creator
- `created` - Auto-generated timestamp
- `updated` - Auto-generated timestamp

#### Indexes:

- Unique composite index on `(church_id, name)`

#### Rules:

- List/View: Church members
- Create: Church members
- Update/Delete: Creator or users with admin permissions

### 9. Roles

**Purpose**: Permission-based role definitions for churches
**Type**: Base Collection

#### Fields:

- `id` - Auto-generated unique identifier
- `church_id` (relation to churches, required) - Owning church
- `name` (text, required, max: 100) - Role display name
- `slug` (text, required, max: 50, pattern: `^[a-z0-9-]+$`) - URL-friendly identifier
- `permissions` (json, required) - Array of permission strings
- `is_builtin` (bool) - Whether role is system-created (cannot be deleted)

#### Available Permissions:

- `manage-songs` - Create, edit, delete songs
- `manage-services` - Create, edit, delete services
- `manage-members` - Invite, edit, remove members; manage roles/skills
- `manage-church` - Edit church settings, manage API keys

#### Indexes:

- Unique composite index on `(church_id, slug)`

### 10. User Roles

**Purpose**: Junction table assigning roles to users within churches
**Type**: Base Collection

#### Fields:

- `id` - Auto-generated unique identifier
- `church_id` (relation to churches, required) - Church context
- `user_id` (relation to users, required) - User reference
- `role_id` (relation to roles, required) - Role reference

#### Indexes:

- Unique composite index on `(church_id, user_id, role_id)`

### 11. Skills

**Purpose**: Worship team position/skill definitions
**Type**: Base Collection

#### Fields:

- `id` - Auto-generated unique identifier
- `church_id` (relation to churches, required) - Owning church
- `name` (text, required, max: 100) - Skill display name (e.g., "Worship Leader", "Guitarist")
- `slug` (text, required, max: 50, pattern: `^[a-z0-9-]+$`) - URL-friendly identifier
- `is_builtin` (bool) - Whether skill is system-created (leader skill cannot be deleted)

#### Default Skills (created for new churches):

- Worship Leader (builtin)
- Guitarist
- Vocalist
- Drummer
- Pianist/Keys
- Bass

#### Indexes:

- Unique composite index on `(church_id, slug)`

### 12. User Skills

**Purpose**: Junction table assigning skills to users within churches
**Type**: Base Collection

#### Fields:

- `id` - Auto-generated unique identifier
- `church_id` (relation to churches, required) - Church context
- `user_id` (relation to users, required) - User reference
- `skill_id` (relation to skills, required) - Skill reference

#### Indexes:

- Unique composite index on `(church_id, user_id, skill_id)`

### 13. Song Ratings

**Purpose**: User feedback on songs (thumbs up/down, difficulty)
**Type**: Base Collection

#### Fields:

- `id` - Auto-generated unique identifier
- `song_id` (relation to songs, required) - Song reference
- `user_id` (relation to users, required) - Rating user
- `church_id` (relation to churches, required) - Church context
- `rating` (select, required) - "thumbs_up", "neutral", "thumbs_down"
- `is_difficult` (bool) - Whether user finds song difficult

### 14. Song Suggestions

**Purpose**: Team members can suggest songs for consideration
**Type**: Base Collection

#### Fields:

- `id` - Auto-generated unique identifier
- `song_id` (relation to songs, required) - Suggested song
- `church_id` (relation to churches, required) - Church context
- `suggested_by` (relation to users, required) - Who suggested
- `notes` (text, max: 1000) - Suggestion notes
- `status` (select, required) - "pending", "approved", "rejected"

### 15. Notifications

**Purpose**: In-app notification system
**Type**: Base Collection

#### Fields:

- `id` - Auto-generated unique identifier
- `church_id` (relation to churches, required) - Church context
- `user_id` (relation to users, required) - Recipient
- `type` (select, required) - "song_added", "song_retired", "song_suggested", "service_reminder"
- `title` (text, required, max: 200) - Notification title
- `message` (text, required, max: 500) - Notification body
- `data` (json) - Additional data payload
- `is_read` (bool) - Read status

#### Rules:

- Create: System only (null rule)
- Update/Delete: Authenticated users (mark as read)

### 16. Team Share Links

**Purpose**: Public links for team feedback without authentication
**Type**: Base Collection

#### Fields:

- `id` - Auto-generated unique identifier
- `church_id` (relation to churches, required) - Church context
- `token` (text, required, unique, min: 32, max: 64) - Share token
- `expires_at` (date, required) - Expiration timestamp
- `created_by` (relation to users, required) - Creator
- `access_type` (select, required) - "ratings", "suggestions", "both"

### 17. Service Comments

**Purpose**: Real-time team collaboration on services
**Type**: Base Collection

#### Fields:

- `id` - Auto-generated unique identifier
- `service_id` (relation to services, required) - Parent service
- `user_id` (relation to users, required) - Comment author
- `comment` (text, required, min: 1, max: 2000) - Comment text
- `parent_id` (relation to service_comments) - Parent comment for threading
- `mentions` (relation to users, multiple, max: 10) - Mentioned users
- `edited` (bool) - Whether comment was edited
- `edited_at` (date) - Edit timestamp

#### Indexes:

- Index on `service_id`
- Index on `user_id`
- Index on `parent_id`

### 18. Users (Auth Collection)

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

### 1. Setup Status View

**Purpose**: Check if initial church setup is required

```sql
SELECT
    CASE WHEN COUNT(*) > 0 THEN 1 ELSE 0 END as has_churches
FROM churches;
```

### 2. Song Statistics View

**Purpose**: Aggregated rating statistics per song

```sql
SELECT
    s.id as id,
    s.id as song_id,
    s.church_id as church_id,
    COUNT(CASE WHEN r.rating = 'thumbs_up' THEN 1 END) as thumbs_up,
    COUNT(CASE WHEN r.rating = 'neutral' THEN 1 END) as neutral,
    COUNT(CASE WHEN r.rating = 'thumbs_down' THEN 1 END) as thumbs_down,
    COUNT(r.id) as total_ratings,
    COUNT(CASE WHEN r.is_difficult = 1 THEN 1 END) as difficult_count
FROM songs s
LEFT JOIN song_ratings r ON s.id = r.song_id
GROUP BY s.id
```

### 3. Songs Enriched View

**Purpose**: Songs with usage history and rating aggregations

```sql
SELECT
    s.id, s.church_id, s.title, s.artist, s.key_signature, s.tempo,
    s.duration_seconds, s.tags, s.labels, s.is_active, s.is_retired, s.created_by,
    (SELECT MAX(used_date) FROM song_usage WHERE song_id = s.id) as last_used_date,
    (SELECT MAX(used_date) FROM song_usage WHERE song_id = s.id AND used_date <= datetime('now')) as last_sung_date,
    COALESCE((SELECT thumbs_up FROM song_statistics WHERE song_id = s.id), 0) as thumbs_up,
    COALESCE((SELECT thumbs_down FROM song_statistics WHERE song_id = s.id), 0) as thumbs_down,
    COALESCE((SELECT neutral FROM song_statistics WHERE song_id = s.id), 0) as neutral,
    COALESCE((SELECT total_ratings FROM song_statistics WHERE song_id = s.id), 0) as total_ratings,
    COALESCE((SELECT difficult_count FROM song_statistics WHERE song_id = s.id), 0) as difficult_count
FROM songs s
```

## Relationships

```
churches (1) ────┬─── (many) church_memberships
                 ├─── (many) church_invitations
                 ├─── (many) songs
                 ├─── (many) services
                 ├─── (many) labels
                 ├─── (many) roles
                 ├─── (many) skills
                 ├─── (many) notifications
                 └─── (1) primary_admin → users

users (1) ───────┬─── (many) church_memberships
                 ├─── (many) user_roles
                 ├─── (many) user_skills
                 ├─── (many) songs (created_by)
                 ├─── (many) services (worship_leader)
                 ├─── (many) service_songs (added_by)
                 ├─── (many) service_comments
                 ├─── (many) song_ratings
                 ├─── (many) song_suggestions
                 └─── (many) notifications

labels (many) ─────── (many) songs

roles (1) ─────────── (many) user_roles
skills (1) ────────── (many) user_skills

songs (1) ────────┬─── (many) service_songs
                  ├─── (many) song_usage
                  ├─── (many) song_ratings
                  └─── (many) song_suggestions

services (1) ─────┬─── (many) service_songs
                  ├─── (many) song_usage
                  └─── (many) service_comments

service_comments ─┬─── (1) service_id → services
                  ├─── (1) user_id → users
                  └─── (1) parent_id → service_comments (self-reference)
```

## Security Model

### Permission-Based Access Control

Access is controlled through the `roles` and `user_roles` collections with 4 core permissions:

1. **manage-songs**: Create, edit, delete songs in the church library
2. **manage-services**: Create, edit, delete services and assign team members
3. **manage-members**: Invite members, assign roles/skills, manage team
4. **manage-church**: Edit church settings, manage API keys, full admin access

### Skills vs Roles

- **Roles** define what a user can DO (permissions for app features)
- **Skills** define what a user CAN PLAY/PERFORM (worship team positions)

Example: A user might have the "Guitarist" skill but no special permissions, while another user might have "manage-services" permission without any musical skills.

### Data Isolation

- All data is scoped to churches through `church_id` fields
- Users can only access data from churches they belong to
- Church membership determines access level
- Permission checks use the `user_roles` junction to verify capabilities

### API Rules Pattern

Most collections use this pattern for permission checks:
```
@request.auth.church_memberships_via_user_id.church_id ?= church_id &&
@request.auth.church_memberships_via_user_id.user_roles_via_user_id.role_id.permissions ?~ 'permission-name'
```

## Migration History

| Migration | Description |
|-----------|-------------|
| `20250622_initial_worshipwise.js` | Core collections (churches, memberships, songs, services, etc.) |
| `20250623_add_church_relations.js` | Church relationship fields |
| `20250623_add_setup_status_view.js` | Setup status view |
| `20250625_add_mistral_api_key.js` | Mistral API key for AI features |
| `20250627_add_labels.js` | Labels collection for song categorization |
| `20250628_song_ratings_archive.js` | Song ratings, suggestions, notifications, share links |
| `20250629_flexible_permissions.js` | Roles, user_roles, skills, user_skills |
| `20250629_remove_role_field.js` | Legacy role field cleanup |
| `20250629_service_team_skills.js` | Team skills JSON field on services |
| `20250629_service_approval_workflow.js` | Approval workflow fields on services |
| `20250629_service_comments.js` | Service comments collection |
| `1736766955_add_elvanto_api_key.js` | Elvanto API key on churches |
| `1736829000_add_labels_to_songs.js` | Labels relation on songs |
| `1736930000_add_song_statistics_view.js` | Song statistics aggregation view |
| `1768272409_add_elvanto_ids.js` | Elvanto IDs on songs/services |
| `1736950000_create_songs_enriched_view.js` | Songs enriched view |

## Deprecated/Unused

The following migration exists but creates an unused collection:
- `20250624_add_categories.js` - Creates a `categories` collection that is not used; labels provide the same functionality

## Performance Considerations

1. **Indexes**: Created on frequently queried fields and foreign keys
2. **Composite Indexes**: For multi-field uniqueness and queries
3. **JSON Fields**: Used for flexible data (permissions, tags, team_skills)
4. **Views**: Pre-computed aggregations for ratings and usage stats
5. **Cascade Deletes**: Properly configured for data integrity

## AI Integration

Churches can configure AI features via:

- `mistral_api_key` on churches collection - Church-specific Mistral API key
- Falls back to `PUBLIC_MISTRAL_API_KEY` environment variable if not set

AI features include:
- Lyrics analysis for worship insights
- Automatic label suggestions based on themes
- Seasonal appropriateness recommendations
- Biblical reference extraction

## External Integrations

### Elvanto

Churches can sync data from Elvanto church management software:
- `elvanto_api_key` on churches - API key for Elvanto
- `elvanto_id` on songs/services - Links records to Elvanto
- `last_elvanto_sync` on churches - Tracks sync history
