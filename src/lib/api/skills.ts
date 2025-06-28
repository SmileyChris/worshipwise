import type { PocketBase } from 'pocketbase';
import type { AuthContext } from '$lib/types/auth';
import type { 
	Skill, 
	UserSkill, 
	CreateSkillData, 
	UpdateSkillData, 
	AssignSkillData 
} from '$lib/types/permissions';

export class SkillsAPI {
	private pb: PocketBase;
	private authContext: AuthContext;

	constructor(authContext: AuthContext, pb: PocketBase) {
		this.authContext = authContext;
		this.pb = pb;
	}

	/**
	 * Get all skills for the current church
	 */
	async getSkills(): Promise<Skill[]> {
		try {
			if (!this.authContext.currentChurch?.id) {
				throw new Error('No church selected');
			}

			return await this.pb.collection('skills').getFullList({
				filter: `church_id = "${this.authContext.currentChurch.id}"`,
				sort: 'name'
			});
		} catch (error) {
			console.error('Failed to fetch skills:', error);
			throw error;
		}
	}

	/**
	 * Get a single skill by ID
	 */
	async getSkill(skillId: string): Promise<Skill> {
		try {
			return await this.pb.collection('skills').getOne(skillId);
		} catch (error) {
			console.error('Failed to fetch skill:', error);
			throw error;
		}
	}

	/**
	 * Get the built-in leader skill for the current church
	 */
	async getLeaderSkill(): Promise<Skill | null> {
		try {
			if (!this.authContext.currentChurch?.id) {
				throw new Error('No church selected');
			}

			const skills = await this.pb.collection('skills').getList(1, 1, {
				filter: `church_id = "${this.authContext.currentChurch.id}" && slug = "leader" && is_builtin = true`
			});

			return skills.items[0] || null;
		} catch (error) {
			console.error('Failed to fetch leader skill:', error);
			return null;
		}
	}

	/**
	 * Create a new skill
	 */
	async createSkill(data: CreateSkillData): Promise<Skill> {
		try {
			if (!this.authContext.currentChurch?.id) {
				throw new Error('No church selected');
			}

			return await this.pb.collection('skills').create({
				church_id: this.authContext.currentChurch.id,
				name: data.name,
				slug: data.slug,
				is_builtin: false
			});
		} catch (error) {
			console.error('Failed to create skill:', error);
			throw error;
		}
	}

	/**
	 * Update an existing skill (name only, slug is immutable)
	 */
	async updateSkill(skillId: string, data: UpdateSkillData): Promise<Skill> {
		try {
			return await this.pb.collection('skills').update(skillId, {
				name: data.name
			});
		} catch (error) {
			console.error('Failed to update skill:', error);
			throw error;
		}
	}

	/**
	 * Delete a skill (only if not built-in and no users assigned)
	 */
	async deleteSkill(skillId: string): Promise<void> {
		try {
			// Check if any users have this skill
			const userSkills = await this.pb.collection('user_skills').getList(1, 1, {
				filter: `skill_id = "${skillId}"`
			});

			if (userSkills.totalItems > 0) {
				throw new Error('Cannot delete skill with assigned users');
			}

			await this.pb.collection('skills').delete(skillId);
		} catch (error) {
			console.error('Failed to delete skill:', error);
			throw error;
		}
	}

	/**
	 * Get all user-skill assignments for the current church
	 */
	async getUserSkills(userId?: string): Promise<UserSkill[]> {
		try {
			if (!this.authContext.currentChurch?.id) {
				throw new Error('No church selected');
			}

			let filter = `church_id = "${this.authContext.currentChurch.id}"`;
			if (userId) {
				filter += ` && user_id = "${userId}"`;
			}

			return await this.pb.collection('user_skills').getFullList({
				filter,
				expand: 'skill_id,user_id'
			});
		} catch (error) {
			console.error('Failed to fetch user skills:', error);
			throw error;
		}
	}

	/**
	 * Assign a skill to a user
	 */
	async assignSkill(data: AssignSkillData): Promise<UserSkill> {
		try {
			if (!this.authContext.currentChurch?.id) {
				throw new Error('No church selected');
			}

			// Check if assignment already exists
			const existing = await this.pb.collection('user_skills').getList(1, 1, {
				filter: `church_id = "${this.authContext.currentChurch.id}" && user_id = "${data.user_id}" && skill_id = "${data.skill_id}"`
			});

			if (existing.totalItems > 0) {
				throw new Error('User already has this skill');
			}

			return await this.pb.collection('user_skills').create({
				church_id: this.authContext.currentChurch.id,
				user_id: data.user_id,
				skill_id: data.skill_id
			});
		} catch (error) {
			console.error('Failed to assign skill:', error);
			throw error;
		}
	}

	/**
	 * Remove a skill from a user
	 */
	async removeSkill(userSkillId: string): Promise<void> {
		try {
			await this.pb.collection('user_skills').delete(userSkillId);
		} catch (error) {
			console.error('Failed to remove skill:', error);
			throw error;
		}
	}

	/**
	 * Get users by skill
	 */
	async getUsersBySkill(skillId: string): Promise<UserSkill[]> {
		try {
			if (!this.authContext.currentChurch?.id) {
				throw new Error('No church selected');
			}

			return await this.pb.collection('user_skills').getFullList({
				filter: `church_id = "${this.authContext.currentChurch.id}" && skill_id = "${skillId}"`,
				expand: 'user_id'
			});
		} catch (error) {
			console.error('Failed to fetch users by skill:', error);
			throw error;
		}
	}

	/**
	 * Get users with leader skill
	 */
	async getLeaders(): Promise<UserSkill[]> {
		try {
			if (!this.authContext.currentChurch?.id) {
				throw new Error('No church selected');
			}

			// First get the leader skill
			const leaderSkill = await this.getLeaderSkill();
			if (!leaderSkill) {
				return [];
			}

			return await this.getUsersBySkill(leaderSkill.id);
		} catch (error) {
			console.error('Failed to fetch leaders:', error);
			return [];
		}
	}

	/**
	 * Check if a user has the leader skill
	 */
	async isLeader(userId: string): Promise<boolean> {
		try {
			if (!this.authContext.currentChurch?.id) {
				throw new Error('No church selected');
			}

			const userSkills = await this.pb.collection('user_skills').getList(1, 1, {
				filter: `church_id = "${this.authContext.currentChurch.id}" && user_id = "${userId}" && skill_id.slug = "leader"`,
				expand: 'skill_id'
			});

			return userSkills.totalItems > 0;
		} catch (error) {
			console.error('Failed to check leader status:', error);
			return false;
		}
	}

	/**
	 * Subscribe to real-time updates for skills
	 */
	subscribeToSkills(callback: (data: unknown) => void) {
		if (!this.authContext.currentChurch?.id) {
			return () => {}; // Return empty unsubscribe function
		}

		return this.pb.collection('skills').subscribe('*', callback, {
			filter: `church_id = "${this.authContext.currentChurch.id}"`
		});
	}

	/**
	 * Subscribe to real-time updates for user skills
	 */
	subscribeToUserSkills(callback: (data: unknown) => void) {
		if (!this.authContext.currentChurch?.id) {
			return () => {}; // Return empty unsubscribe function
		}

		return this.pb.collection('user_skills').subscribe('*', callback, {
			filter: `church_id = "${this.authContext.currentChurch.id}"`
		});
	}
}

// Factory function for creating SkillsAPI instances
export function createSkillsAPI(authContext: AuthContext, pb: PocketBase): SkillsAPI {
	return new SkillsAPI(authContext, pb);
}