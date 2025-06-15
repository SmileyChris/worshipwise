export interface User {
	id: string;
	email: string;
	name: string;
	role: 'musician' | 'leader' | 'admin';
	church_name?: string;
	preferred_keys?: string[];
	notification_preferences?: Record<string, any>;
	is_active: boolean;
	created: string;
	updated: string;
	verified: boolean;
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
	church_name?: string;
}

export interface AuthStore {
	user: User | null;
	token: string;
	isValid: boolean;
}
