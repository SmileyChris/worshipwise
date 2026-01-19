import { createSkillsAPI, type SkillsAPI } from '$lib/api/skills';
import type { AuthStore as RuntimeAuthStore } from '$lib/stores/auth.svelte';
import type { AuthContext } from '$lib/types/auth';
import type {
	Skill,
	UserSkill,
	CreateSkillData,
	UpdateSkillData,
	AssignSkillData
} from '$lib/types/permissions';

class SkillsStore {
	// Reactive state using Svelte 5 runes
	skills = $state<Skill[]>([]);
	userSkills = $state<UserSkill[]>([]);
	loading = $state<boolean>(false);
	error = $state<string | null>(null);

	// Track if initial load is complete
	private initialized = $state<boolean>(false);

	private skillsApi: SkillsAPI;

	// Support live auth store or static context
	private auth: RuntimeAuthStore | null = null;
	private staticContext: AuthContext | null = null;

	constructor(authInput: RuntimeAuthStore | AuthContext) {
		if (typeof (authInput as any).getAuthContext === 'function') {
			this.auth = authInput as RuntimeAuthStore;
		} else {
			this.staticContext = authInput as AuthContext;
		}

		// API reacts to auth changes
		this.skillsApi = $derived.by(() => {
			const ctx = this.getAuthContext();
			return createSkillsAPI(ctx, ctx.pb);
		});
	}

	private getAuthContext(): AuthContext {
		return this.auth ? this.auth.getAuthContext() : (this.staticContext as AuthContext);
	}

	/**
	 * Load all skills for the current church
	 */
	async loadSkills(): Promise<void> {
		this.loading = true;
		this.error = null;

		try {
			this.skills = await this.skillsApi.getSkills();
			this.initialized = true;
		} catch (error) {
			console.error('Failed to load skills:', error);
			this.error = this.getErrorMessage(error);
		} finally {
			this.loading = false;
		}
	}

	/**
	 * Load skills only if not already loaded
	 */
	async loadSkillsOnce(): Promise<void> {
		if (this.initialized) return;
		await this.loadSkills();
	}

	/**
	 * Create a new skill
	 */
	async createSkill(data: CreateSkillData): Promise<Skill> {
		this.loading = true;
		this.error = null;

		try {
			const newSkill = await this.skillsApi.createSkill(data);
			this.skills = [...this.skills, newSkill];
			return newSkill;
		} catch (error) {
			console.error('Failed to create skill:', error);
			this.error = this.getErrorMessage(error);
			throw error;
		} finally {
			this.loading = false;
		}
	}

	/**
	 * Update an existing skill
	 */
	async updateSkill(skillId: string, data: UpdateSkillData): Promise<Skill> {
		this.loading = true;
		this.error = null;

		try {
			const updatedSkill = await this.skillsApi.updateSkill(skillId, data);

			// Update in local array
			const index = this.skills.findIndex((s) => s.id === skillId);
			if (index !== -1) {
				this.skills[index] = updatedSkill;
				this.skills = [...this.skills]; // Trigger reactivity
			}

			return updatedSkill;
		} catch (error) {
			console.error('Failed to update skill:', error);
			this.error = this.getErrorMessage(error);
			throw error;
		} finally {
			this.loading = false;
		}
	}

	/**
	 * Delete a skill
	 */
	async deleteSkill(skillId: string): Promise<void> {
		this.loading = true;
		this.error = null;

		try {
			await this.skillsApi.deleteSkill(skillId);
			this.skills = this.skills.filter((s) => s.id !== skillId);
		} catch (error) {
			console.error('Failed to delete skill:', error);
			this.error = this.getErrorMessage(error);
			throw error;
		} finally {
			this.loading = false;
		}
	}

	/**
	 * Get users assigned to a specific skill
	 */
	async getUsersBySkill(skillId: string): Promise<UserSkill[]> {
		try {
			return await this.skillsApi.getUsersBySkill(skillId);
		} catch (error) {
			console.error('Failed to get users by skill:', error);
			return [];
		}
	}

	/**
	 * Get users with leader skill
	 */
	async getLeaders(): Promise<UserSkill[]> {
		try {
			return await this.skillsApi.getLeaders();
		} catch (error) {
			console.error('Failed to get leaders:', error);
			return [];
		}
	}

	/**
	 * Assign a skill to a user
	 */
	async assignSkill(data: AssignSkillData): Promise<UserSkill> {
		this.loading = true;
		this.error = null;

		try {
			const userSkill = await this.skillsApi.assignSkill(data);
			this.userSkills = [...this.userSkills, userSkill];
			return userSkill;
		} catch (error) {
			console.error('Failed to assign skill:', error);
			this.error = this.getErrorMessage(error);
			throw error;
		} finally {
			this.loading = false;
		}
	}

	/**
	 * Remove a skill from a user
	 */
	async removeSkill(userSkillId: string): Promise<void> {
		this.loading = true;
		this.error = null;

		try {
			await this.skillsApi.removeSkill(userSkillId);
			this.userSkills = this.userSkills.filter((us) => us.id !== userSkillId);
		} catch (error) {
			console.error('Failed to remove skill:', error);
			this.error = this.getErrorMessage(error);
			throw error;
		} finally {
			this.loading = false;
		}
	}

	/**
	 * Clear error state
	 */
	clearError(): void {
		this.error = null;
	}

	/**
	 * Subscribe to real-time updates
	 */
	async subscribeToUpdates(): Promise<() => void> {
		const unsubSkills = await this.skillsApi.subscribeToSkills((data: unknown) => {
			const eventData = data as {
				action: string;
				record: Skill;
			};

			if (eventData.action === 'create') {
				this.skills = [...this.skills, eventData.record];
			} else if (eventData.action === 'update') {
				const index = this.skills.findIndex((s) => s.id === eventData.record.id);
				if (index !== -1) {
					this.skills[index] = eventData.record;
					this.skills = [...this.skills];
				}
			} else if (eventData.action === 'delete') {
				this.skills = this.skills.filter((s) => s.id !== eventData.record.id);
			}
		});

		return () => {
			if (typeof unsubSkills === 'function') {
				unsubSkills();
			}
		};
	}

	/**
	 * Get error message from API error
	 */
	private getErrorMessage(error: unknown): string {
		if (error && typeof error === 'object' && 'response' in error) {
			const apiError = error as { response?: { data?: { message?: string } } };
			if (apiError.response?.data?.message) {
				return apiError.response.data.message;
			}
		}
		if (error instanceof Error) {
			return error.message;
		}
		return 'An unexpected error occurred';
	}
}

// Export the class type for tests
export type { SkillsStore };

// Factory function for creating new store instances
export function createSkillsStore(auth: RuntimeAuthStore | AuthContext): SkillsStore {
	return new SkillsStore(auth);
}
