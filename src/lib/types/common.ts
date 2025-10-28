/**
 * Common type definitions for WorshipWise
 *
 * This file contains type definitions for commonly used literal types
 * throughout the application. Using named types instead of inline literals
 * provides better type safety, IDE autocomplete, and maintainability.
 */

// ============================================================================
// Role System Types
// ============================================================================

/**
 * Built-in role types for church members
 * These are the standard roles used during invitation and setup
 */
export type BuiltInRole = 'admin' | 'leader' | 'musician' | 'member';

/**
 * Registration role types (limited subset for initial signup)
 */
export type RegisterRole = 'musician' | 'leader';

// ============================================================================
// Subscription & Church Types
// ============================================================================

/**
 * Church subscription tier levels
 */
export type SubscriptionType = 'free' | 'basic' | 'premium';

/**
 * Church subscription status
 */
export type SubscriptionStatus = 'active' | 'trial' | 'suspended' | 'cancelled';

/**
 * Church membership status
 */
export type MembershipStatus = 'active' | 'pending' | 'suspended';

/**
 * Geographic hemisphere (for seasonal features)
 */
export type Hemisphere = 'northern' | 'southern';

/**
 * Week start preference
 */
export type WeekStart = 'sunday' | 'monday';

// ============================================================================
// Song Types
// ============================================================================

/**
 * Song usage status based on last used date
 * - available: Not used recently (green)
 * - caution: Used somewhat recently (yellow)
 * - recent: Used very recently (red)
 */
export type SongUsageStatus = 'available' | 'caution' | 'recent';

/**
 * Song complexity level (from lyrics analysis)
 */
export type SongComplexity = 'Simple' | 'Moderate' | 'Complex';

/**
 * Song suggestion/approval status
 */
export type SuggestionStatus = 'pending' | 'approved' | 'rejected';

// ============================================================================
// Service Types
// ============================================================================

/**
 * Service status
 */
export type ServiceStatus = 'draft' | 'planned' | 'in_progress' | 'completed' | 'archived';

/**
 * Service approval workflow status
 */
export type ServiceApprovalStatus =
	| 'not_required'
	| 'pending_approval'
	| 'approved'
	| 'rejected'
	| 'changes_requested';

// ============================================================================
// Type Guards
// ============================================================================

export function isBuiltInRole(value: string): value is BuiltInRole {
	return ['admin', 'leader', 'musician', 'member'].includes(value);
}

export function isRegisterRole(value: string): value is RegisterRole {
	return ['musician', 'leader'].includes(value);
}

export function isSubscriptionType(value: string): value is SubscriptionType {
	return ['free', 'basic', 'premium'].includes(value);
}

export function isSubscriptionStatus(value: string): value is SubscriptionStatus {
	return ['active', 'trial', 'suspended', 'cancelled'].includes(value);
}

export function isMembershipStatus(value: string): value is MembershipStatus {
	return ['active', 'pending', 'suspended'].includes(value);
}

export function isHemisphere(value: string): value is Hemisphere {
	return ['northern', 'southern'].includes(value);
}

export function isWeekStart(value: string): value is WeekStart {
	return ['sunday', 'monday'].includes(value);
}

export function isSongUsageStatus(value: string): value is SongUsageStatus {
	return ['available', 'caution', 'recent'].includes(value);
}

export function isSongComplexity(value: string): value is SongComplexity {
	return ['Simple', 'Moderate', 'Complex'].includes(value);
}

export function isSuggestionStatus(value: string): value is SuggestionStatus {
	return ['pending', 'approved', 'rejected'].includes(value);
}

export function isServiceStatus(value: string): value is ServiceStatus {
	return ['draft', 'planned', 'in_progress', 'completed', 'archived'].includes(value);
}

export function isServiceApprovalStatus(value: string): value is ServiceApprovalStatus {
	return ['not_required', 'pending_approval', 'approved', 'rejected', 'changes_requested'].includes(
		value
	);
}

// ============================================================================
// Constants
// ============================================================================

export const BUILT_IN_ROLES: Record<string, BuiltInRole> = {
	ADMIN: 'admin',
	LEADER: 'leader',
	MUSICIAN: 'musician',
	MEMBER: 'member'
} as const;

export const SUBSCRIPTION_TYPES: Record<string, SubscriptionType> = {
	FREE: 'free',
	BASIC: 'basic',
	PREMIUM: 'premium'
} as const;

export const SUBSCRIPTION_STATUSES: Record<string, SubscriptionStatus> = {
	ACTIVE: 'active',
	TRIAL: 'trial',
	SUSPENDED: 'suspended',
	CANCELLED: 'cancelled'
} as const;

export const MEMBERSHIP_STATUSES: Record<string, MembershipStatus> = {
	ACTIVE: 'active',
	PENDING: 'pending',
	SUSPENDED: 'suspended'
} as const;

export const SONG_USAGE_STATUSES: Record<string, SongUsageStatus> = {
	AVAILABLE: 'available',
	CAUTION: 'caution',
	RECENT: 'recent'
} as const;

export const SONG_COMPLEXITIES: Record<string, SongComplexity> = {
	SIMPLE: 'Simple',
	MODERATE: 'Moderate',
	COMPLEX: 'Complex'
} as const;

export const SUGGESTION_STATUSES: Record<string, SuggestionStatus> = {
	PENDING: 'pending',
	APPROVED: 'approved',
	REJECTED: 'rejected'
} as const;

export const SERVICE_STATUSES: Record<string, ServiceStatus> = {
	DRAFT: 'draft',
	PLANNED: 'planned',
	IN_PROGRESS: 'in_progress',
	COMPLETED: 'completed',
	ARCHIVED: 'archived'
} as const;

export const SERVICE_APPROVAL_STATUSES: Record<string, ServiceApprovalStatus> = {
	NOT_REQUIRED: 'not_required',
	PENDING_APPROVAL: 'pending_approval',
	APPROVED: 'approved',
	REJECTED: 'rejected',
	CHANGES_REQUESTED: 'changes_requested'
} as const;
