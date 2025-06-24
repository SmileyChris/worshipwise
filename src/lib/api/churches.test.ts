import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { InitialChurchSetup } from '$lib/types/church';

// Use vi.hoisted to define mocks before imports
const { mockPb, mockCollection } = vi.hoisted(() => {
	const mockCollection = {
		getFullList: vi.fn(),
		getFirstListItem: vi.fn(),
		getOne: vi.fn(),
		create: vi.fn(),
		update: vi.fn(),
		delete: vi.fn(),
		authWithPassword: vi.fn()
	};

	const mockPb = {
		collection: vi.fn(() => mockCollection),
		authStore: {
			model: { id: 'user1' },
			token: 'test-token',
			isValid: true,
			clear: vi.fn(),
			save: vi.fn(),
			onChange: vi.fn()
		},
		autoCancellation: vi.fn()
	};

	return { mockPb, mockCollection };
});

// Mock the client module 
vi.mock('./client', () => ({
	pb: mockPb
}));

// Import after mocking
import { ChurchesAPI } from './churches';

describe('Churches API - Simple Tests', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockPb.authStore.model = { id: 'user1' };
	});

	describe('hasChurches', () => {
		it('should return true when churches exist', async () => {
			mockCollection.getFirstListItem.mockResolvedValue({ setup_required: false });

			const result = await ChurchesAPI.hasChurches();

			expect(mockPb.collection).toHaveBeenCalledWith('setup_status');
			expect(result).toBe(true);
		});

		it('should return false when no churches exist', async () => {
			const notFoundError = new Error('Not found');
			notFoundError.status = 404;
			mockCollection.getFirstListItem.mockRejectedValue(notFoundError);
			mockCollection.getFullList.mockRejectedValue(notFoundError);

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

			const createdUser = { id: 'user-1', email: 'admin@test.com', name: 'Admin' };
			const createdChurch = { id: 'church-1', name: 'Test Church', timezone: 'America/New_York' };
			const createdMembership = { id: 'membership-1', role: 'admin', user_id: 'user-1', church_id: 'church-1' };

			// Mock responses in sequence
			mockCollection.create
				.mockResolvedValueOnce(createdUser)        // User creation
				.mockResolvedValueOnce(createdChurch)      // Church creation  
				.mockResolvedValueOnce(createdMembership); // Membership creation
			
			mockCollection.authWithPassword.mockResolvedValue({ record: createdUser, token: 'test-token' });
			mockCollection.update.mockResolvedValue(createdUser);
			
			const notFoundError = new Error('Not found');
			notFoundError.status = 404;
			mockCollection.getFirstListItem.mockRejectedValue(notFoundError);

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

			mockCollection.getFullList.mockResolvedValue([membershipWithExpand]);

			const result = await ChurchesAPI.getUserChurches();

			expect(mockPb.collection).toHaveBeenCalledWith('church_memberships');
			expect(result).toEqual([church]);
		});
	});

	describe('updateChurch', () => {
		it('should update church data', async () => {
			const updatedChurch = { id: 'church1', name: 'Updated Church' };

			mockCollection.update.mockResolvedValue(updatedChurch);

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

			mockCollection.getFullList.mockResolvedValue(members);

			const result = await ChurchesAPI.getChurchMembers('church1');

			expect(result).toEqual(members);
			expect(result).toHaveLength(3);
		});
	});
});