import { describe, it, expect, beforeEach, vi } from 'vitest';
import { pb } from './client';
import { ChurchesAPI } from './churches';
import type { InitialChurchSetup } from '$lib/types/church';

// Mock the PocketBase client
vi.mock('./client', () => ({
	pb: {
		collection: vi.fn(),
		authStore: {
			model: { id: 'user1' }
		}
	}
}));

describe('Churches API - Simple Tests', () => {
	let mockCollection: any;

	beforeEach(() => {
		vi.clearAllMocks();
		mockCollection = {
			create: vi.fn(),
			getList: vi.fn(),
			getFullList: vi.fn(),
			update: vi.fn(),
			delete: vi.fn(),
			getOne: vi.fn(),
			getFirstListItem: vi.fn(),
			authWithPassword: vi.fn()
		};
		(pb.collection as any).mockReturnValue(mockCollection);
	});

	describe('hasChurches', () => {
		it('should return true when churches exist', async () => {
			mockCollection.getFirstListItem.mockResolvedValue({ setup_required: false });

			const result = await ChurchesAPI.hasChurches();

			expect(pb.collection).toHaveBeenCalledWith('setup_status');
			expect(result).toBe(true);
		});

		it('should return false when no churches exist', async () => {
			mockCollection.getFirstListItem.mockRejectedValue(new Error('Not found'));
			mockCollection.getList.mockRejectedValue(new Error('Not found'));

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
				adminPassword: 'password123'
			};

			const mockUser = { id: 'user1', email: setupData.adminEmail };
			const mockChurch = { id: 'church1', name: setupData.churchName };

			mockCollection.create
				.mockResolvedValueOnce(mockUser)
				.mockResolvedValueOnce(mockChurch)
				.mockResolvedValueOnce({}); // membership

			mockCollection.authWithPassword.mockResolvedValue({ record: mockUser });

			const result = await ChurchesAPI.initialSetup(setupData);

			expect(result).toHaveProperty('user');
			expect(result).toHaveProperty('church');
		});
	});

	describe('getUserChurches', () => {
		it('should fetch user churches', async () => {
			const mockChurch = { id: 'church1', name: 'Test Church' };
			const mockMemberships = [
				{ 
					id: 'membership1', 
					church_id: 'church1', 
					user_id: 'user1',
					expand: { church_id: mockChurch }
				}
			];

			mockCollection.getFullList.mockResolvedValue(mockMemberships);

			const result = await ChurchesAPI.getUserChurches();

			expect(pb.collection).toHaveBeenCalledWith('church_memberships');
			expect(result).toEqual([mockChurch]);
		});
	});

	describe('updateChurch', () => {
		it('should update church data', async () => {
			const updatedChurch = { id: 'church1', name: 'Updated Church' };
			mockCollection.update.mockResolvedValue(updatedChurch);

			const result = await ChurchesAPI.updateChurch('church1', { name: 'Updated Church' });

			expect(pb.collection).toHaveBeenCalledWith('churches');
			expect(result).toEqual(updatedChurch);
		});
	});

	describe('getChurchMembers', () => {
		it('should fetch church members', async () => {
			const mockMembers = {
				items: [{ id: 'member1', church_id: 'church1' }],
				totalItems: 1
			};

			mockCollection.getFullList.mockResolvedValue(mockMembers.items);

			const result = await ChurchesAPI.getChurchMembers('church1');

			expect(result).toEqual(mockMembers.items);
		});
	});
});