import { goto } from '$app/navigation';
import { createSetupStore, type SetupStore } from '$lib/stores/setup.svelte';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi, type MockedFunction } from 'vitest';
import InitialSetup from './InitialSetup.svelte';
import type { ChurchesAPI } from '$lib/api/churches';

// Mock API
const mockChurchesAPI = {
	initialSetup: vi.fn()
};

// Mock dependencies
vi.mock('$app/navigation', () => ({
	goto: vi.fn()
}));

vi.mock('$lib/api/churches', () => {
	return {
		createChurchesAPI: vi.fn(() => mockChurchesAPI)
	};
});

const mockedGoto = goto as MockedFunction<typeof goto>;

describe('InitialSetup', () => {
	const user = userEvent.setup();
	let mockSetupStore: SetupStore;

	beforeEach(() => {
		vi.clearAllMocks();
		// Create a mock setup store for each test
		mockSetupStore = {
			setupRequired: true,
			loading: false,
			error: null,
			checkSetupRequired: vi.fn().mockResolvedValue(true),
			markSetupCompleted: vi.fn(),
			clearError: vi.fn()
		} as SetupStore;
	});

	describe('Step 1 - Church Information', () => {
		it('should render step 1 with required fields only', () => {
			render(InitialSetup, { setupStore: mockSetupStore });

			// Check header with logo
			expect(screen.getByAltText('WorshipWise')).toBeInTheDocument();
			expect(screen.getByText('WorshipWise')).toBeInTheDocument();

			// Check step 1 content
			expect(screen.getByText('Church Information')).toBeInTheDocument();
			expect(screen.getByLabelText(/Church Name/i)).toBeInTheDocument();
			expect(screen.getByLabelText(/Timezone/i)).toBeInTheDocument();

			// Check that optional fields are NOT present
			expect(screen.queryByLabelText(/City/i)).not.toBeInTheDocument();
			expect(screen.queryByLabelText(/State/i)).not.toBeInTheDocument();
			expect(screen.queryByLabelText(/Country/i)).not.toBeInTheDocument();
			expect(screen.queryByLabelText(/Address/i)).not.toBeInTheDocument();
		});

		it('should disable next button when church name is empty', () => {
			render(InitialSetup, { setupStore: mockSetupStore });

			const nextButton = screen.getByRole('button', { name: /next step/i });
			expect(nextButton).toBeDisabled();
		});

		it('should disable next button when timezone is not selected', async () => {
			render(InitialSetup, { setupStore: mockSetupStore });

			const churchNameInput = screen.getByLabelText(/Church Name/i);
			await user.type(churchNameInput, 'Test Church');

			// Reset timezone to empty (overrides auto-detection)
			const timezoneSelect = screen.getByLabelText(/Timezone/i);
			await user.selectOptions(timezoneSelect, '');

			const nextButton = screen.getByRole('button', { name: /next step/i });
			expect(nextButton).toBeDisabled();
		});

		it('should enable next button when both required fields are filled', async () => {
			render(InitialSetup, { setupStore: mockSetupStore });

			const churchNameInput = screen.getByLabelText(/Church Name/i);
			const timezoneSelect = screen.getByLabelText(/Timezone/i);

			await user.type(churchNameInput, 'Test Church');
			await user.selectOptions(timezoneSelect, 'America/New_York');

			const nextButton = screen.getByRole('button', { name: /next step/i });
			expect(nextButton).toBeEnabled();
		});

		it('should show hemisphere indicator when timezone is selected', async () => {
			render(InitialSetup, { setupStore: mockSetupStore });

			const timezoneSelect = screen.getByLabelText(/Timezone/i);
			await user.selectOptions(timezoneSelect, 'America/New_York');

			expect(screen.getByText(/Northern Hemisphere/)).toBeInTheDocument();
		});

		it('should show southern hemisphere for Australia timezone', async () => {
			render(InitialSetup, { setupStore: mockSetupStore });

			const timezoneSelect = screen.getByLabelText(/Timezone/i);
			await user.selectOptions(timezoneSelect, 'Australia/Sydney');

			expect(screen.getByText(/Southern Hemisphere/)).toBeInTheDocument();
		});

		it('should proceed to step 2 when next button is clicked with valid data', async () => {
			render(InitialSetup, { setupStore: mockSetupStore });

			const churchNameInput = screen.getByLabelText(/Church Name/i);
			const timezoneSelect = screen.getByLabelText(/Timezone/i);

			await user.type(churchNameInput, 'Test Church');
			await user.selectOptions(timezoneSelect, 'America/New_York');

			const nextButton = screen.getByRole('button', { name: /next step/i });
			await user.click(nextButton);

			expect(screen.getByText('Admin Account')).toBeInTheDocument();
		});

		it('should proceed to step 2 when Enter is pressed in church name field with valid data', async () => {
			render(InitialSetup, { setupStore: mockSetupStore });

			const churchNameInput = screen.getByLabelText(/Church Name/i);
			const timezoneSelect = screen.getByLabelText(/Timezone/i);

			await user.type(churchNameInput, 'Test Church');
			await user.selectOptions(timezoneSelect, 'America/New_York');

			await user.type(churchNameInput, '{Enter}');

			expect(screen.getByText('Admin Account')).toBeInTheDocument();
		});

		it('should not proceed to step 2 when Enter is pressed with invalid data', async () => {
			render(InitialSetup, { setupStore: mockSetupStore });

			const churchNameInput = screen.getByLabelText(/Church Name/i);
			await user.type(churchNameInput, '{Enter}');

			// Should still be on step 1
			expect(screen.getByText('Church Information')).toBeInTheDocument();
			expect(screen.queryByText('Admin Account')).not.toBeInTheDocument();
		});

		it('should focus admin name field after advancing to step 2', async () => {
			render(InitialSetup, { setupStore: mockSetupStore });

			const churchNameInput = screen.getByLabelText(/Church Name/i);
			const timezoneSelect = screen.getByLabelText(/Timezone/i);

			await user.type(churchNameInput, 'Test Church');
			await user.selectOptions(timezoneSelect, 'America/New_York');

			const nextButton = screen.getByRole('button', { name: /next step/i });
			await user.click(nextButton);

			// Check that admin name field is focused
			const adminNameInput = screen.getByLabelText(/Full Name/i);
			expect(adminNameInput).toHaveFocus();
		});
	});

	describe('Step 2 - Admin Account', () => {
		beforeEach(async () => {
			render(InitialSetup, { setupStore: mockSetupStore });

			// Fill step 1 and proceed
			const churchNameInput = screen.getByLabelText(/Church Name/i);
			const timezoneSelect = screen.getByLabelText(/Timezone/i);

			await user.type(churchNameInput, 'Test Church');
			await user.selectOptions(timezoneSelect, 'America/New_York');

			const nextButton = screen.getByRole('button', { name: /next step/i });
			await user.click(nextButton);
		});

		it('should render step 2 with admin fields', () => {
			expect(screen.getByText('Admin Account')).toBeInTheDocument();
			expect(screen.getByLabelText(/Full Name/i)).toBeInTheDocument();
			expect(screen.getByLabelText(/Email Address/i)).toBeInTheDocument();
			expect(screen.getByLabelText('Password *')).toBeInTheDocument();
			expect(screen.getByLabelText(/Confirm Password/i)).toBeInTheDocument();
		});

		it('should show setup summary with only church name and timezone', () => {
			expect(screen.getByText('Setup Summary')).toBeInTheDocument();
			expect(screen.getByText('Test Church')).toBeInTheDocument();
			expect(screen.getByText('New York, USA (EST)')).toBeInTheDocument();

			// Should NOT show location info
			expect(screen.queryByText(/Location:/)).not.toBeInTheDocument();
		});

		it('should allow going back to step 1', async () => {
			const backButton = screen.getByRole('button', { name: /back/i });
			await user.click(backButton);

			expect(screen.getByText('Church Information')).toBeInTheDocument();
		});

		it('should validate password length', async () => {
			const nameInput = screen.getByLabelText(/Full Name/i);
			const emailInput = screen.getByLabelText(/Email Address/i);
			const passwordInput = screen.getByLabelText('Password *');

			await user.type(nameInput, 'John Doe');
			await user.type(emailInput, 'john@test.com');
			await user.type(passwordInput, '12345'); // Too short

			const completeButton = screen.getByRole('button', { name: /complete setup/i });
			await user.click(completeButton);

			expect(screen.getByText('Password must be at least 6 characters')).toBeInTheDocument();
		});

		it('should validate password confirmation', async () => {
			const nameInput = screen.getByLabelText(/Full Name/i);
			const emailInput = screen.getByLabelText(/Email Address/i);
			const passwordInput = screen.getByLabelText('Password *');
			const confirmInput = screen.getByLabelText(/Confirm Password/i);

			await user.type(nameInput, 'John Doe');
			await user.type(emailInput, 'john@test.com');
			await user.type(passwordInput, 'password123');
			await user.type(confirmInput, 'different');

			const completeButton = screen.getByRole('button', { name: /complete setup/i });
			await user.click(completeButton);

			expect(screen.getByText('Passwords do not match')).toBeInTheDocument();
		});

		it('should complete setup successfully', async () => {
			const mockSetupData = {
				churchName: 'Test Church',
				timezone: 'America/New_York',
				adminName: 'John Doe',
				adminEmail: 'john@test.com',
				password: 'password123',
				confirmPassword: 'password123',
				country: '',
				state: '',
				city: '',
				address: ''
			};

			(mockChurchesAPI.initialSetup as any).mockResolvedValue({ success: true });

			const nameInput = screen.getByLabelText(/Full Name/i);
			const emailInput = screen.getByLabelText(/Email Address/i);
			const passwordInput = screen.getByLabelText('Password *');
			const confirmInput = screen.getByLabelText(/Confirm Password/i);

			await user.type(nameInput, 'John Doe');
			await user.type(emailInput, 'john@test.com');
			await user.type(passwordInput, 'password123');
			await user.type(confirmInput, 'password123');

			const completeButton = screen.getByRole('button', { name: /complete setup/i });
			await user.click(completeButton);

			expect(mockChurchesAPI.initialSetup).toHaveBeenCalledWith(mockSetupData);
			expect(mockSetupStore.markSetupCompleted).toHaveBeenCalled();
			expect(mockedGoto).toHaveBeenCalledWith('/dashboard');
		});

		it('should handle setup errors', async () => {
			(mockChurchesAPI.initialSetup as any).mockRejectedValue(new Error('Setup failed'));

			const nameInput = screen.getByLabelText(/Full Name/i);
			const emailInput = screen.getByLabelText(/Email Address/i);
			const passwordInput = screen.getByLabelText('Password *');
			const confirmInput = screen.getByLabelText(/Confirm Password/i);

			await user.type(nameInput, 'John Doe');
			await user.type(emailInput, 'john@test.com');
			await user.type(passwordInput, 'password123');
			await user.type(confirmInput, 'password123');

			const completeButton = screen.getByRole('button', { name: /complete setup/i });
			await user.click(completeButton);

			expect(screen.getByText('Setup failed')).toBeInTheDocument();
		});

		describe('Validation Behavior', () => {
			it('should show error when clicking button with empty fields', async () => {
				const completeButton = screen.getByRole('button', { name: /complete setup/i });
				await user.click(completeButton);

				expect(screen.getByText('Admin name is required')).toBeInTheDocument();
			});

			it('should show error when admin name is missing', async () => {
				const emailInput = screen.getByLabelText(/Email Address/i);
				const passwordInput = screen.getByLabelText('Password *');
				const confirmInput = screen.getByLabelText(/Confirm Password/i);

				await user.type(emailInput, 'john@test.com');
				await user.type(passwordInput, 'password123');
				await user.type(confirmInput, 'password123');

				const completeButton = screen.getByRole('button', { name: /complete setup/i });
				await user.click(completeButton);

				expect(screen.getByText('Admin name is required')).toBeInTheDocument();
			});

			it('should show error when password is too short', async () => {
				const nameInput = screen.getByLabelText(/Full Name/i);
				const emailInput = screen.getByLabelText(/Email Address/i);
				const passwordInput = screen.getByLabelText('Password *');
				const confirmInput = screen.getByLabelText(/Confirm Password/i);

				await user.type(nameInput, 'John Doe');
				await user.type(emailInput, 'john@test.com');
				await user.type(passwordInput, '12345'); // Too short
				await user.type(confirmInput, '12345');

				const completeButton = screen.getByRole('button', { name: /complete setup/i });
				await user.click(completeButton);

				expect(screen.getByText('Password must be at least 6 characters')).toBeInTheDocument();
			});

			it('should show error when passwords do not match', async () => {
				const nameInput = screen.getByLabelText(/Full Name/i);
				const emailInput = screen.getByLabelText(/Email Address/i);
				const passwordInput = screen.getByLabelText('Password *');
				const confirmInput = screen.getByLabelText(/Confirm Password/i);

				await user.type(nameInput, 'John Doe');
				await user.type(emailInput, 'john@test.com');
				await user.type(passwordInput, 'password123');
				await user.type(confirmInput, 'different');

				const completeButton = screen.getByRole('button', { name: /complete setup/i });
				await user.click(completeButton);

				expect(screen.getByText('Passwords do not match')).toBeInTheDocument();
			});

			it('should proceed when all fields are valid', async () => {
				(mockChurchesAPI.initialSetup as any).mockResolvedValue({ success: true });

				const nameInput = screen.getByLabelText(/Full Name/i);
				const emailInput = screen.getByLabelText(/Email Address/i);
				const passwordInput = screen.getByLabelText('Password *');
				const confirmInput = screen.getByLabelText(/Confirm Password/i);

				await user.type(nameInput, 'John Doe');
				await user.type(emailInput, 'john@test.com');
				await user.type(passwordInput, 'password123');
				await user.type(confirmInput, 'password123');

				const completeButton = screen.getByRole('button', { name: /complete setup/i });
				await user.click(completeButton);

				expect(mockChurchesAPI.initialSetup).toHaveBeenCalled();
			});
		});

		describe('Enter Key Functionality', () => {
			it('should submit form when Enter is pressed in any field with valid data', async () => {
				(mockChurchesAPI.initialSetup as any).mockResolvedValue({ success: true });

				const nameInput = screen.getByLabelText(/Full Name/i);
				const emailInput = screen.getByLabelText(/Email Address/i);
				const passwordInput = screen.getByLabelText('Password *');
				const confirmInput = screen.getByLabelText(/Confirm Password/i);

				await user.type(nameInput, 'John Doe');
				await user.type(emailInput, 'john@test.com');
				await user.type(passwordInput, 'password123');
				await user.type(confirmInput, 'password123');

				// Test Enter in each field
				await user.type(nameInput, '{Enter}');

				expect(mockChurchesAPI.initialSetup).toHaveBeenCalled();
				expect(mockSetupStore.markSetupCompleted).toHaveBeenCalled();
				expect(mockedGoto).toHaveBeenCalledWith('/dashboard');
			});

			it('should show error when Enter is pressed with invalid data', async () => {
				const nameInput = screen.getByLabelText(/Full Name/i);
				const passwordInput = screen.getByLabelText('Password *');

				await user.type(nameInput, 'John Doe');
				await user.type(passwordInput, '123'); // Too short

				await user.type(passwordInput, '{Enter}');

				expect(screen.getByText('Admin email is required')).toBeInTheDocument();
				expect(mockChurchesAPI.initialSetup).not.toHaveBeenCalled();
			});

			it('should submit when Enter is pressed in email field with valid data', async () => {
				(mockChurchesAPI.initialSetup as any).mockResolvedValue({ success: true });

				const nameInput = screen.getByLabelText(/Full Name/i);
				const emailInput = screen.getByLabelText(/Email Address/i);
				const passwordInput = screen.getByLabelText('Password *');
				const confirmInput = screen.getByLabelText(/Confirm Password/i);

				await user.type(nameInput, 'John Doe');
				await user.type(emailInput, 'john@test.com');
				await user.type(passwordInput, 'password123');
				await user.type(confirmInput, 'password123');

				await user.type(emailInput, '{Enter}');

				expect(mockChurchesAPI.initialSetup).toHaveBeenCalled();
			});

			it('should submit when Enter is pressed in password fields with valid data', async () => {
				(mockChurchesAPI.initialSetup as any).mockResolvedValue({ success: true });

				const nameInput = screen.getByLabelText(/Full Name/i);
				const emailInput = screen.getByLabelText(/Email Address/i);
				const passwordInput = screen.getByLabelText('Password *');
				const confirmInput = screen.getByLabelText(/Confirm Password/i);

				await user.type(nameInput, 'John Doe');
				await user.type(emailInput, 'john@test.com');
				await user.type(passwordInput, 'password123');
				await user.type(confirmInput, 'password123');

				// Clear previous calls
				(mockChurchesAPI.initialSetup as any).mockClear();

				await user.type(confirmInput, '{Enter}');

				expect(mockChurchesAPI.initialSetup).toHaveBeenCalled();
			});
		});
	});
});
