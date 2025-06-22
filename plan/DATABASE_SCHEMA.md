# WorshipWise Database Schema

This document defines the complete database schema for WorshipWise, a church worship song management system built with PocketBase.

## Overview

The schema follows a church-centric multi-tenant architecture where all data is organized around church organizations. Users belong to churches through memberships with role-based permissions.

## Collections

### 1. Churches

The foundational collection for multi-tenant church organizations.

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| name | text | ✓ | max 200 | Church name |
| slug | text | ✓ | unique, max 100 | URL-friendly identifier |
| description | text | | max 1000 | Church description |
| address | text | | max 500 | Street address |
| city | text | | max 100 | City |
| state | text | | max 100 | State/Province |
| country | text | | max 100 | Country |
| timezone | text | ✓ | max 100 | Church timezone (e.g., "America/New_York") |
| hemisphere | select | ✓ | northern/southern | For seasonal recommendations |
| subscription_type | select | ✓ | free/basic/premium | Subscription tier |
| subscription_status | select | ✓ | active/trial/suspended/cancelled | Account status |
| max_users | number | ✓ | min 1 | User limit based on subscription |
| max_songs | number | ✓ | min 1 | Song library limit |
| max_storage_mb | number | ✓ | min 1 | File storage limit in MB |
| settings | json | ✓ | | Church-specific settings |
| owner_user_id | relation | ✓ | users | Primary church owner |
| billing_email | email | | | Billing contact email |
| is_active | bool | ✓ | default true | Active status |

### 2. Church Memberships

Junction table connecting users to churches with role-based permissions.

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| church_id | relation | ✓ | churches, cascade delete | Church reference |
| user_id | relation | ✓ | users, cascade delete | User reference |
| role | select | ✓ | member/musician/leader/admin/pastor | User's role |
| permissions | json | ✓ | | Role-specific permissions |
| status | select | ✓ | active/pending/suspended | Membership status |
| preferred_keys | json | | | User's preferred musical keys |
| notification_preferences | json | | | Email/push notification settings |
| invited_by | relation | | users | Who invited this user |
| invited_date | date | | | When invitation was sent |
| joined_date | date | | | When user accepted |
| is_active | bool | ✓ | default true | Active status |

**Unique Index**: church_id + user_id (one membership per user per church)

### 3. Church Invitations

Pending invitations to join churches.

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| church_id | relation | ✓ | churches, cascade delete | Church reference |
| email | email | ✓ | | Invitee's email address |
| role | select | ✓ | member/musician/leader/admin/pastor | Invited role |
| permissions | json | ✓ | | Granted permissions |
| invited_by | relation | ✓ | users | Who sent the invitation |
| token | text | ✓ | unique, max 100 | Invitation token |
| expires_at | date | ✓ | | Expiration timestamp |
| used_at | date | | | When invitation was used |
| used_by | relation | | users | Who used the invitation |
| is_active | bool | ✓ | default true | Active status |

### 4. Songs

Central repository for worship songs with comprehensive metadata.

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| title | text | ✓ | max 200 | Song title |
| artist | text | | max 100 | Artist/composer |
| key_signature | select | | C,C#,Db,D,D#,Eb,E,F,F#,Gb,G,G#,Ab,A,A#,Bb,B,Am,A#m,Bbm,Bm,Cm,C#m,Dbm,Dm,D#m,Ebm,Em,Fm,F#m,Gbm,Gm,G#m,Abm | Original key |
| tempo | number | | 60-200 | BPM |
| duration_seconds | number | | 30-1800 | Song length in seconds |
| tags | json | | | Flexible tagging (genre, theme, etc.) |
| lyrics | editor | | | Full lyrics with formatting |
| chord_chart | file | | max 1, 10MB | PDF/image chord chart |
| audio_file | file | | max 1, 50MB | MP3/audio reference |
| sheet_music | file | | max 3, 10MB each | Sheet music PDFs |
| ccli_number | text | | max 20 | CCLI licensing number |
| copyright_info | text | | max 500 | Copyright information |
| notes | editor | | | Additional notes |
| created_by | relation | ✓ | users | User who added the song |
| is_active | bool | | default true | Active/archived status |
| lyrics_analysis | json | | | AI-generated lyrics analysis |

### 5. Setlists (Services)

Service planning and setlist management.

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| title | text | ✓ | max 200 | Service/setlist title |
| service_date | date | ✓ | | Service date |
| service_type | select | | Sunday Morning/Sunday Evening/Wednesday Night/Special Event/Rehearsal/Other | Type of service |
| theme | text | | max 300 | Service theme/topic |
| notes | editor | | | Service planning notes |
| worship_leader | relation | ✓ | users | Primary worship leader |
| team_members | relation | | users, max 10 | Team members |
| status | select | ✓ | draft/planned/in_progress/completed/archived | Setlist status |
| estimated_duration | number | | 300-7200 | Planned duration (seconds) |
| actual_duration | number | | 300-7200 | Actual duration (seconds) |
| created_by | relation | ✓ | users | Who created the setlist |
| is_template | bool | | default false | Template for reuse |

### 6. Setlist Songs

Junction table for songs in setlists with performance-specific details.

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| setlist_id | relation | ✓ | setlists, cascade delete | Setlist reference |
| song_id | relation | ✓ | songs, cascade delete | Song reference |
| order_position | number | ✓ | 1-50 | Song order in setlist |
| transposed_key | select | | same as key_signature | Performance key |
| tempo_override | number | | 60-200 | Performance tempo |
| transition_notes | text | | max 500 | Transition instructions |
| section_type | select | | Opening/Worship/Offering/Communion/Response/Closing | Service section |
| duration_override | number | | 30-1800 | Performance duration |
| added_by | relation | ✓ | users | Who added to setlist |

**Unique Index**: setlist_id + order_position (one song per position)

### 7. Song Usage

Historical tracking of song usage for analytics.

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| song_id | relation | ✓ | songs, cascade delete | Song reference |
| setlist_id | relation | ✓ | setlists, cascade delete | Setlist reference |
| used_date | date | ✓ | | Date of usage |
| used_key | select | | same as key_signature | Key used |
| position_in_setlist | number | | 1-50 | Position in service |
| worship_leader | relation | ✓ | users | Who led worship |
| service_type | select | | same as setlist service_type | Type of service |

## Access Rules

All collections require authentication. Specific rules:

- **Churches**: Users can only access churches they belong to
- **Songs/Setlists**: Scoped to user's church through memberships
- **Memberships**: Users can view their own, admins can manage all
- **Invitations**: Only church admins/pastors can create

## Indexes

1. **church_memberships**: Unique index on (church_id, user_id)
2. **setlist_songs**: Unique index on (setlist_id, order_position)
3. **churches**: Unique index on slug
4. **church_invitations**: Unique index on token

## Relationships

```
Churches ──┬──< Church Memberships >──── Users
           │
           ├──< Church Invitations
           │
           └──< Songs ──< Setlist Songs >──── Setlists
                  │                              │
                  └──────< Song Usage >──────────┘
```

## Migration Strategy

To reset and recreate the database:

1. Stop PocketBase
2. Delete `pocketbase/pb_data/data.db`
3. Delete all files in `pocketbase/pb_migrations/`
4. Create a single new migration with the complete schema
5. Start PocketBase and run migrations

## Default Values

- All boolean fields default to `true` for `is_active` fields
- JSON fields default to `{}` or `[]` as appropriate
- Status fields default to initial states (e.g., "draft" for setlists)
- Numeric limits default to subscription-appropriate values

## Security Considerations

1. All collections require authentication
2. Data is scoped to churches through membership checks
3. Role-based permissions control access levels
4. Cascade deletes maintain referential integrity
5. File uploads have size limits to prevent abuse