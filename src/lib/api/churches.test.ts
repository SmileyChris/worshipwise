import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { InitialChurchSetup } from '$lib/types/church';
import { mockPb } from '$tests/helpers/pb-mock';
import { ChurchesAPI } from './churches';

describe('Churches API - Simple Tests', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockPb.reset();
		mockPb.authStore.model = { id: 'user1' };
	});

	describe('hasChurches', () => {
		it('should return true when churches exist', async () => {
			mockPb
				.collection('setup_status')
				.getFirstListItem.mockResolvedValue({ setup_required: false });

			const result = await ChurchesAPI.hasChurches();

			expect(mockPb.collection).toHaveBeenCalledWith('setup_status');
			expect(result).toBe(true);
		});

		it('should return false when no churches exist', async () => {
			const notFoundError: any = new Error('Not found');
			notFoundError.status = 404;
			mockPb.collection('setup_status').getFirstListItem.mockRejectedValue(notFoundError);
			mockPb.collection('churches').getFullList.mockRejectedValue(notFoundError);

			const result = await ChurchesAPI.hasChurches();

			expect(result).toBe(false);
		});
	});

	describe('initialSetup', () => {
		it('should create admin user and church', async () => {
			const setupData: InitialChurchSetup = {
				churchName: 'Test Church',
				timezone: 'America/New_York',
				adminName: 'Admin',
				adminEmail: 'admin@test.com',
				password: 'password123',
				confirmPassword: 'password123'
			};

			const createdUser = { id: 'user-1', email: 'admin@test.com', name: 'Admin' };
			const createdChurch = { id: 'church-1', name: 'Test Church', timezone: 'America/New_York' };
			const createdMembership = {
				id: 'membership-1',
				role: 'admin',
				user_id: 'user-1',
				church_id: 'church-1'
			};

			// Mock responses for different collections
			mockPb.collection('users').create.mockResolvedValueOnce(createdUser); // User creation
			mockPb.collection('churches').create.mockResolvedValueOnce(createdChurch); // Church creation
			mockPb.collection('church_memberships').create.mockResolvedValueOnce(createdMembership); // Membership creation

			mockPb
				.collection('users')
				.authWithPassword.mockResolvedValue({ record: createdUser, token: 'test-token' });
			mockPb.collection('setup_status').update.mockResolvedValue(createdUser);

			const notFoundError: any = new Error('Not found');
			notFoundError.status = 404;
			mockPb.collection('setup_status').getFirstListItem.mockRejectedValue(notFoundError);

			const result = await ChurchesAPI.initialSetup(setupData);

			expect(result).toHaveProperty('user');
			expect(result).toHaveProperty('church');
		});
	});

	describe('getUserChurches', () => {
		it('should fetch user churches', async () => {
			const church = { id: 'church-1', name: 'Test Church' };
			const membershipWithExpand = {
				id: 'membership-1',
				church_id: 'church-1',
				user_id: 'user1',
				expand: { church_id: church }
			};

			mockPb.collection('church_memberships').getFullList.mockResolvedValue([membershipWithExpand]);

			const result = await ChurchesAPI.getUserChurches();

			expect(mockPb.collection).toHaveBeenCalledWith('church_memberships');
			expect(result).toEqual([church]);
		});
	});

	describe('updateChurch', () => {
		it('should update church data', async () => {
			const updatedChurch = { id: 'church1', name: 'Updated Church' };

			mockPb.collection('churches').update.mockResolvedValue(updatedChurch);

			const result = await ChurchesAPI.updateChurch('church1', { name: 'Updated Church' });

			expect(mockPb.collection).toHaveBeenCalledWith('churches');
			expect(result).toEqual(updatedChurch);
		});
	});

	describe('getChurchMembers', () => {
		it('should fetch church members', async () => {
			const members = [
				{ id: 'membership-1', church_id: 'church1', role: 'admin' },
				{ id: 'membership-2', church_id: 'church1', role: 'leader' },
				{ id: 'membership-3', church_id: 'church1', role: 'musician' }
			];

			mockPb.collection('church_memberships').getFullList.mockResolvedValue(members);

			const result = await ChurchesAPI.getChurchMembers('church1');

			expect(result).toEqual(members);
			expect(result).toHaveLength(3);
		});
	});
});
