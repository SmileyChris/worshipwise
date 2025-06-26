import type { Church, ChurchMembership } from './church';

export interface User {
	id: string;
	email: string;
	name: string;
	created: string;
	updated: string;
	verified: boolean;
	avatar: string;
	emailVisibility: boolean;
}

export interface LoginCredentials {
	email: string;
	password: string;
}

export interface RegisterData {
	email: string;
	password: string;
	passwordConfirm: string;
	name: string;
	role?: 'musician' | 'leader';
}

export interface PasswordResetRequest {
	email: string;
}

export interface PasswordResetConfirm {
	token: string;
	password: string;
	passwordConfirm: string;
}

// Combined user with membership for admin functions
export interface UserWithMembership {
	id: string;
	email: string;
	name: string;
	verified: boolean;
	created: string;
	updated: string;
	membership?: ChurchMembership;
}

export interface AuthStore {
	user: User | null;
	token: string;
	isValid: boolean;
}

/**
 * Dependency injection interface for auth context
 * Used to break circular dependencies between stores and APIs
 */
export interface AuthContext {
	/** Current authenticated user */
	readonly user: User | null;

	/** Current church membership information */
	readonly currentMembership: ChurchMembership | null;

	/** Current church (derived from membership) */
	readonly currentChurch: Church | null;

	/** Whether user is authenticated */
	readonly isAuthenticated: boolean;

	/** Current auth token */
	readonly token: string;

	/** Whether auth state is valid */
	readonly isValid: boolean;
}
