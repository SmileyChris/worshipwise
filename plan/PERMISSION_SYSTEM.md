# Permission System Documentation

## Overview

WorshipWise uses a flexible permission-based access control system that replaces the previous rigid role-based system. This allows churches to customize roles and permissions according to their specific needs.

## Core Concepts

### Permissions

The system includes four core permissions:

- **manage-songs**: Create, edit, delete songs and manage song metadata
- **manage-services**: Create, edit, delete services and manage service content
- **manage-members**: Invite members, manage roles and skills assignments
- **manage-church**: Manage church settings, subscription, and other administrators

Note: There are no "view" permissions - all authenticated members can view songs and services.

### Roles

- Churches can create custom roles with any combination of permissions
- Each permission must be assigned to at least one role (validated by the system)
- Roles have a name and slug for identification
- The initial setup creates an "Administrator" role with all permissions

### Skills

Skills represent positions or abilities in worship services, separate from administrative permissions:

- **leader**: Built-in skill that cannot be deleted (but can be renamed)
- Custom skills like: guitarist, bassist, drummer, vocalist, sound tech, etc.
- Skills are used for team assignments in services
- The worship leader is automatically assigned the leader skill

## Implementation Details

### Database Schema

```sql
-- Roles collection
roles {
  id: string
  church_id: string
  name: string
  slug: string
  permissions: string[] // Array of permission strings
  is_builtin: boolean
  created: datetime
  updated: datetime
}

-- User roles assignment (many-to-many)
user_roles {
  id: string
  user_id: string
  role_id: string
  church_id: string
  created: datetime
  updated: datetime
}

-- Skills collection
skills {
  id: string
  church_id: string
  name: string
  slug: string
  icon: string?
  is_builtin: boolean
  created: datetime
  updated: datetime
}

-- User skills assignment (many-to-many)
user_skills {
  id: string
  user_id: string
  skill_id: string
  church_id: string
  created: datetime
  updated: datetime
}
```

### Permission Checking

```typescript
// Check single permission
if (auth.hasPermission('manage-songs')) {
	// User can manage songs
}

// Check multiple permissions
if (auth.hasAnyPermission(['manage-songs', 'manage-services'])) {
	// User can manage songs OR services
}

// Check leader skill
if (auth.hasLeaderSkill()) {
	// User is a worship leader
}
```

### Service Team Assignments

Services now use skill-based team assignments:

```typescript
interface ServiceTeamSkills {
  [skillId: string]: string; // skillId -> userId mapping
}

// Example:
{
  "skill-1": "user-123", // Leader skill -> John
  "skill-2": "user-456", // Guitarist skill -> Mary
  "skill-3": "user-789"  // Drummer skill -> Bob
}
```

## Migration from Role-Based System

The migration automatically converts the old role-based system:

1. Creates roles for each church based on previous fixed roles
2. Assigns appropriate permissions to each role
3. Creates user_roles entries based on previous role field
4. Creates leader skill and assigns to users with leader/admin roles
5. Removes the role field from church_memberships

## Special Rules

### Leader Skill

- Every church has a built-in "leader" skill
- Can be renamed but not deleted
- Auto-retirement of songs requires 75% of users with leader skill to rate thumbs down

### Permission Coverage

- The system validates that every permission is assigned to at least one role
- UI warns administrators if any permission is unassigned
- Cannot delete a role if it would leave a permission unassigned

### Manage-Church Permission

- Only users with manage-church permission can:
  - Edit other users who have manage-church permission
  - Delete the church
  - Manage subscription and billing
- Cannot leave a church if you're the only one with manage-church permission

## UI Components

### Role Management (/admin/roles)

- Create custom roles with any combination of permissions
- Edit existing roles (except slug which is immutable)
- Delete roles (with validation)
- Visual warnings for missing permission coverage

### Skill Management (/admin/skills)

- Create custom skills for worship positions
- Quick-add common skills with suggested icons
- Edit skill names and icons
- Delete skills (except built-in leader skill)

### Member Management (/admin/members)

- Assign multiple roles to each member
- Assign multiple skills to each member
- Visual indicators for permissions and skills
- Bulk operations for role/skill assignments

### Service Builder

- Team selector component uses skills instead of roles
- Worship leader automatically assigned leader skill
- Prevents double-assignment of team members
- Shows available members with each skill

## Best Practices

1. **Start Simple**: Begin with basic roles (Administrator, Leader, Member) and add more as needed
2. **Use Descriptive Names**: Role and skill names should clearly indicate their purpose
3. **Regular Audits**: Periodically review role assignments and permissions
4. **Document Custom Roles**: Keep notes on why custom roles were created
5. **Skill Icons**: Use appropriate icons to make skills easily identifiable

## API Usage

```typescript
// Create roles API instance
const rolesAPI = createRolesAPI(authContext, pb);

// Get all roles for church
const roles = await rolesAPI.getRoles();

// Create new role
const newRole = await rolesAPI.createRole({
	name: 'Song Leader',
	permissions: ['manage-songs', 'manage-services']
});

// Assign role to user
await rolesAPI.assignRole(userId, roleId);

// Check permission coverage
const { valid, missingPermissions } = await rolesAPI.validatePermissionCoverage();
```

## Future Enhancements

- Permission inheritance/hierarchies
- Time-based permissions
- Service-specific permissions
- Approval workflows for sensitive actions
- Audit logging for permission changes
