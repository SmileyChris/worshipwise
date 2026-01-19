import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createSkillsStore, type SkillsStore } from './skills.svelte';
import type { AuthContext } from '$lib/types/auth';
import type { Skill, UserSkill } from '$lib/types/permissions';
import { mockPb } from '$tests/helpers/pb-mock';
import { mockAuthContext } from '$tests/helpers/mock-builders';

describe('SkillsStore', () => {
	let skillsStore: SkillsStore;
	let authContext: AuthContext;

	// Test data factories
	const mockSkill = (overrides: Partial<Skill> = {}): Skill => ({
		id: 'skill-1',
		church_id: 'church-1',
		name: 'Vocals',
		slug: 'vocals',
		is_builtin: false,
		created: new Date().toISOString(),
		updated: new Date().toISOString(),
		...overrides
	});

	const mockUserSkill = (overrides: Partial<UserSkill> = {}): UserSkill => ({
		id: 'user-skill-1',
		church_id: 'church-1',
		user_id: 'user-1',
		skill_id: 'skill-1',
		created: new Date().toISOString(),
		updated: new Date().toISOString(),
		...overrides
	});

	beforeEach(() => {
		vi.clearAllMocks();
		mockPb.reset();

		authContext = mockAuthContext({
			church: { id: 'church-1', name: 'Test Church' },
			user: { id: 'user-1' },
			membership: { church_id: 'church-1' }
		});

		skillsStore = createSkillsStore(authContext);
	});

	describe('loadSkills', () => {
		it('should load skills successfully', async () => {
			const skills = [mockSkill()];
			mockPb.collection('skills').mockGetFullList(skills);

			await skillsStore.loadSkills();

			expect(skillsStore.skills).toEqual(skills);
			expect(skillsStore.loading).toBe(false);
			expect(skillsStore.error).toBe(null);
			expect(mockPb.collection).toHaveBeenCalledWith('skills');
		});

		it('should handle loading state correctly', async () => {
			mockPb.collection('skills').getFullList.mockImplementation(async () => {
				expect(skillsStore.loading).toBe(true);
				return [mockSkill()];
			});

			await skillsStore.loadSkills();

			expect(skillsStore.loading).toBe(false);
		});

		it('should handle errors when loading skills', async () => {
			const error = new Error('Network error');
			mockPb.collection('skills').getFullList.mockRejectedValue(error);

			await skillsStore.loadSkills();

			expect(skillsStore.skills).toEqual([]);
			expect(skillsStore.loading).toBe(false);
			expect(skillsStore.error).toBe('Network error');
		});
	});

	describe('loadSkillsOnce', () => {
		it('should only load skills once', async () => {
			const skills = [mockSkill()];
			mockPb.collection('skills').mockGetFullList(skills);

			await skillsStore.loadSkillsOnce();
			await skillsStore.loadSkillsOnce();

			expect(mockPb.collection('skills').getFullList).toHaveBeenCalledTimes(1);
		});

		it('should load skills if not initialized', async () => {
			const skills = [mockSkill()];
			mockPb.collection('skills').mockGetFullList(skills);

			await skillsStore.loadSkillsOnce();

			expect(skillsStore.skills).toEqual(skills);
		});
	});

	describe('createSkill', () => {
		it('should create skill successfully', async () => {
			const newSkill = mockSkill({ id: 'skill-new', name: 'Guitar' });
			mockPb.collection('skills').create.mockResolvedValue(newSkill);

			const result = await skillsStore.createSkill({
				name: 'Guitar',
				slug: 'guitar'
			});

			expect(result).toEqual(newSkill);
			expect(skillsStore.skills).toContainEqual(newSkill);
			expect(mockPb.collection('skills').create).toHaveBeenCalledWith(
				expect.objectContaining({
					church_id: 'church-1',
					name: 'Guitar',
					slug: 'guitar'
				})
			);
		});

		it('should handle errors when creating skill', async () => {
			const error = new Error('Validation failed');
			mockPb.collection('skills').create.mockRejectedValue(error);

			await expect(
				skillsStore.createSkill({
					name: 'Guitar',
					slug: 'guitar'
				})
			).rejects.toThrow('Validation failed');

			expect(skillsStore.error).toBe('Validation failed');
		});
	});

	describe('updateSkill', () => {
		beforeEach(() => {
			skillsStore.skills = [mockSkill()];
		});

		it('should update skill successfully', async () => {
			const updatedSkill = mockSkill({ name: 'Updated Vocals' });
			mockPb.collection('skills').update.mockResolvedValue(updatedSkill);

			const result = await skillsStore.updateSkill('skill-1', { name: 'Updated Vocals' });

			expect(result).toEqual(updatedSkill);
			expect(skillsStore.skills[0]).toEqual(updatedSkill);
		});

		it('should handle updating non-existent skill', async () => {
			const updatedSkill = mockSkill({ id: 'different-id', name: 'Updated' });
			mockPb.collection('skills').update.mockResolvedValue(updatedSkill);

			await skillsStore.updateSkill('different-id', { name: 'Updated' });

			// Original skill unchanged
			expect(skillsStore.skills[0].id).toBe('skill-1');
		});

		it('should handle errors when updating skill', async () => {
			const error = new Error('Update failed');
			mockPb.collection('skills').update.mockRejectedValue(error);

			await expect(skillsStore.updateSkill('skill-1', { name: 'Updated' })).rejects.toThrow(
				'Update failed'
			);

			expect(skillsStore.error).toBe('Update failed');
		});
	});

	describe('deleteSkill', () => {
		beforeEach(() => {
			skillsStore.skills = [mockSkill(), mockSkill({ id: 'skill-2', name: 'Drums' })];
		});

		it('should delete skill successfully', async () => {
			mockPb.collection('user_skills').getList.mockResolvedValue({ items: [], totalItems: 0 });
			mockPb.collection('skills').delete.mockResolvedValue(undefined);

			await skillsStore.deleteSkill('skill-1');

			expect(skillsStore.skills).toHaveLength(1);
			expect(skillsStore.skills[0].id).toBe('skill-2');
			expect(mockPb.collection('skills').delete).toHaveBeenCalledWith('skill-1');
		});

		it('should handle errors when deleting skill', async () => {
			const error = new Error('Cannot delete skill with assigned users');
			mockPb.collection('skills').delete.mockRejectedValue(error);

			await expect(skillsStore.deleteSkill('skill-1')).rejects.toThrow(
				'Cannot delete skill with assigned users'
			);

			expect(skillsStore.skills).toHaveLength(2); // Unchanged
			expect(skillsStore.error).toBe('Cannot delete skill with assigned users');
		});
	});

	describe('getUsersBySkill', () => {
		it('should return users for a skill', async () => {
			const userSkills = [mockUserSkill(), mockUserSkill({ id: 'user-skill-2', user_id: 'user-2' })];
			mockPb.collection('user_skills').mockGetFullList(userSkills);

			const result = await skillsStore.getUsersBySkill('skill-1');

			expect(result).toEqual(userSkills);
		});

		it('should return empty array on error', async () => {
			mockPb.collection('user_skills').getFullList.mockRejectedValue(new Error('Failed'));

			const result = await skillsStore.getUsersBySkill('skill-1');

			expect(result).toEqual([]);
		});
	});

	describe('getLeaders', () => {
		it('should return users with leader skill', async () => {
			const leaderSkill = mockSkill({ id: 'leader-skill', slug: 'leader', is_builtin: true });
			const leaderUsers = [mockUserSkill({ skill_id: 'leader-skill' })];

			mockPb.collection('skills').getList.mockResolvedValue({
				items: [leaderSkill],
				totalItems: 1
			});
			mockPb.collection('user_skills').mockGetFullList(leaderUsers);

			const result = await skillsStore.getLeaders();

			expect(result).toEqual(leaderUsers);
		});

		it('should return empty array if no leader skill exists', async () => {
			mockPb.collection('skills').getList.mockResolvedValue({
				items: [],
				totalItems: 0
			});

			const result = await skillsStore.getLeaders();

			expect(result).toEqual([]);
		});

		it('should return empty array on error', async () => {
			mockPb.collection('skills').getList.mockRejectedValue(new Error('Failed'));

			const result = await skillsStore.getLeaders();

			expect(result).toEqual([]);
		});
	});

	describe('assignSkill', () => {
		it('should assign skill to user successfully', async () => {
			const userSkill = mockUserSkill();
			mockPb.collection('user_skills').getList.mockResolvedValue({ items: [], totalItems: 0 });
			mockPb.collection('user_skills').create.mockResolvedValue(userSkill);

			const result = await skillsStore.assignSkill({
				user_id: 'user-1',
				skill_id: 'skill-1'
			});

			expect(result).toEqual(userSkill);
			expect(skillsStore.userSkills).toContainEqual(userSkill);
		});

		it('should handle errors when assigning skill', async () => {
			const error = new Error('User already has this skill');
			mockPb.collection('user_skills').getList.mockResolvedValue({ items: [], totalItems: 0 });
			mockPb.collection('user_skills').create.mockRejectedValue(error);

			await expect(
				skillsStore.assignSkill({
					user_id: 'user-1',
					skill_id: 'skill-1'
				})
			).rejects.toThrow('User already has this skill');

			expect(skillsStore.error).toBe('User already has this skill');
		});
	});

	describe('removeSkill', () => {
		beforeEach(() => {
			skillsStore.userSkills = [mockUserSkill()];
		});

		it('should remove skill from user successfully', async () => {
			mockPb.collection('user_skills').delete.mockResolvedValue(undefined);

			await skillsStore.removeSkill('user-skill-1');

			expect(skillsStore.userSkills).toHaveLength(0);
		});

		it('should handle errors when removing skill', async () => {
			const error = new Error('Remove failed');
			mockPb.collection('user_skills').delete.mockRejectedValue(error);

			await expect(skillsStore.removeSkill('user-skill-1')).rejects.toThrow('Remove failed');

			expect(skillsStore.userSkills).toHaveLength(1); // Unchanged
			expect(skillsStore.error).toBe('Remove failed');
		});
	});

	describe('clearError', () => {
		it('should clear error state', () => {
			skillsStore.error = 'Test error';

			skillsStore.clearError();

			expect(skillsStore.error).toBe(null);
		});
	});

	describe('real-time subscriptions', () => {
		it('should subscribe to skills and handle create events', async () => {
			const unsubscribe = vi.fn();
			let eventHandler: (data: unknown) => void;

			mockPb.collection('skills').subscribe.mockImplementation(
				async (topic: string, handler: (data: unknown) => void) => {
					eventHandler = handler;
					return unsubscribe;
				}
			);

			const result = await skillsStore.subscribeToUpdates();

			expect(mockPb.collection('skills').subscribe).toHaveBeenCalled();

			// Test create event
			const newSkill = mockSkill({ id: 'skill-new' });
			eventHandler!({ action: 'create', record: newSkill });

			expect(skillsStore.skills).toContainEqual(newSkill);
		});

		it('should handle skill update events', async () => {
			skillsStore.skills = [mockSkill()];

			let eventHandler: (data: unknown) => void;
			mockPb.collection('skills').subscribe.mockImplementation(
				async (topic: string, handler: (data: unknown) => void) => {
					eventHandler = handler;
					return vi.fn();
				}
			);

			await skillsStore.subscribeToUpdates();

			const updatedSkill = mockSkill({ name: 'Updated Name' });
			eventHandler!({ action: 'update', record: updatedSkill });

			expect(skillsStore.skills[0].name).toBe('Updated Name');
		});

		it('should handle skill delete events', async () => {
			skillsStore.skills = [mockSkill()];

			let eventHandler: (data: unknown) => void;
			mockPb.collection('skills').subscribe.mockImplementation(
				async (topic: string, handler: (data: unknown) => void) => {
					eventHandler = handler;
					return vi.fn();
				}
			);

			await skillsStore.subscribeToUpdates();

			eventHandler!({ action: 'delete', record: { id: 'skill-1' } });

			expect(skillsStore.skills).toHaveLength(0);
		});
	});

	describe('error message extraction', () => {
		it('should extract message from API error response', async () => {
			const apiError = {
				response: {
					data: {
						message: 'API specific error message'
					}
				}
			};
			mockPb.collection('skills').getFullList.mockRejectedValue(apiError);

			await skillsStore.loadSkills();

			expect(skillsStore.error).toBe('API specific error message');
		});

		it('should handle unknown error types', async () => {
			mockPb.collection('skills').getFullList.mockRejectedValue('String error');

			await skillsStore.loadSkills();

			expect(skillsStore.error).toBe('An unexpected error occurred');
		});
	});
});
