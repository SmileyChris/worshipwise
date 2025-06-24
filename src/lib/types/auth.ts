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

export interface AuthStore {
	user: User | null;
	token: string;
	isValid: boolean;
}
