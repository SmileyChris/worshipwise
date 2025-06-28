// Permission system types

export type Permission = 
  | 'manage-songs'
  | 'manage-services'
  | 'manage-members'
  | 'manage-church';

export const PERMISSIONS: Record<string, Permission> = {
  MANAGE_SONGS: 'manage-songs',
  MANAGE_SERVICES: 'manage-services',
  MANAGE_MEMBERS: 'manage-members',
  MANAGE_CHURCH: 'manage-church'
} as const;

export const PERMISSION_DESCRIPTIONS: Record<Permission, string> = {
  'manage-songs': 'Create, edit, and delete songs',
  'manage-services': 'Create, edit, and delete services',
  'manage-members': 'Invite, edit, and remove members',
  'manage-church': 'Edit church settings, billing, and roles'
};

// Role types
export interface Role {
  id: string;
  church_id: string;
  name: string;
  slug: string;
  permissions: Permission[];
  is_builtin: boolean;
  created: string;
  updated: string;
  
  // Expanded fields
  expand?: {
    church_id?: any;
  };
}

export interface UserRole {
  id: string;
  church_id: string;
  user_id: string;
  role_id: string;
  created: string;
  updated: string;
  
  // Expanded fields
  expand?: {
    role_id?: Role;
    user_id?: any;
    church_id?: any;
  };
}

// Skill types
export interface Skill {
  id: string;
  church_id: string;
  name: string;
  slug: string;
  is_builtin: boolean;
  created: string;
  updated: string;
  
  // Expanded fields
  expand?: {
    church_id?: any;
  };
}

export interface UserSkill {
  id: string;
  church_id: string;
  user_id: string;
  skill_id: string;
  created: string;
  updated: string;
  
  // Expanded fields
  expand?: {
    skill_id?: Skill;
    user_id?: any;
    church_id?: any;
  };
}

// DTOs
export interface CreateRoleData {
  name: string;
  slug: string;
  permissions: Permission[];
}

export interface UpdateRoleData {
  name?: string;
  permissions?: Permission[];
}

export interface CreateSkillData {
  name: string;
  slug: string;
}

export interface UpdateSkillData {
  name?: string;
}

export interface AssignRoleData {
  user_id: string;
  role_id: string;
}

export interface AssignSkillData {
  user_id: string;
  skill_id: string;
}

// Helper functions
export function hasPermission(userRoles: UserRole[], permission: Permission): boolean {
  return userRoles.some(userRole => 
    userRole.expand?.role_id?.permissions?.includes(permission)
  );
}

export function hasAnyPermission(userRoles: UserRole[], permissions: Permission[]): boolean {
  return permissions.some(permission => hasPermission(userRoles, permission));
}

export function getAllPermissions(userRoles: UserRole[]): Set<Permission> {
  const permissions = new Set<Permission>();
  
  userRoles.forEach(userRole => {
    userRole.expand?.role_id?.permissions?.forEach(permission => {
      permissions.add(permission);
    });
  });
  
  return permissions;
}

export function hasSkill(userSkills: UserSkill[], skillSlug: string): boolean {
  return userSkills.some(userSkill => 
    userSkill.expand?.skill_id?.slug === skillSlug
  );
}

export function hasLeaderSkill(userSkills: UserSkill[]): boolean {
  return hasSkill(userSkills, 'leader');
}

// Validation
export function isValidPermission(permission: string): permission is Permission {
  return Object.values(PERMISSIONS).includes(permission as Permission);
}

export function validatePermissions(permissions: string[]): Permission[] {
  return permissions.filter(isValidPermission);
}

export function isValidSlug(slug: string): boolean {
  return /^[a-z0-9-]+$/.test(slug);
}