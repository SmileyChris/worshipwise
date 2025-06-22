import { describe, it, expect, beforeEach, vi, type MockedFunction } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { goto } from '$app/navigation';
import InitialSetup from './InitialSetup.svelte';
import { ChurchesAPI } from '$lib/api/churches';
import { setupStore } from '$lib/stores/setup.svelte';

// Mock dependencies
vi.mock('$app/navigation', () => ({
	goto: vi.fn()
}));

vi.mock('$lib/api/churches', () => ({
	ChurchesAPI: {
		initialSetup: vi.fn()
	}
}));

vi.mock('$lib/stores/setup.svelte', () => ({
	setupStore: {
		markSetupCompleted: vi.fn()
	}
}));

const mockedGoto = goto as MockedFunction<typeof goto>;
const mockedChurchesAPI = ChurchesAPI as {
	initialSetup: MockedFunction<any>;
};
const mockedSetupStore = setupStore as {
	markSetupCompleted: MockedFunction<any>;
};

describe('InitialSetup', () => {
	const user = userEvent.setup();

	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('Step 1 - Church Information', () => {
		it('should render step 1 with required fields only', () => {
			render(InitialSetup);

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
			render(InitialSetup);

			const nextButton = screen.getByRole('button', { name: /next step/i });
			expect(nextButton).toBeDisabled();
		});

		it('should disable next button when timezone is not selected', async () => {
			render(InitialSetup);

			const churchNameInput = screen.getByLabelText(/Church Name/i);
			await user.type(churchNameInput, 'Test Church');

			// Reset timezone to empty (it auto-detects by default)
			const timezoneSelect = screen.getByLabelText(/Timezone/i);
			await user.selectOptions(timezoneSelect, '');

			const nextButton = screen.getByRole('button', { name: /next step/i });
			expect(nextButton).toBeDisabled();
		});

		it('should enable next button when both required fields are filled', async () => {
			render(InitialSetup);

			const churchNameInput = screen.getByLabelText(/Church Name/i);
			const timezoneSelect = screen.getByLabelText(/Timezone/i);

			await user.type(churchNameInput, 'Test Church');
			await user.selectOptions(timezoneSelect, 'America/New_York');

			const nextButton = screen.getByRole('button', { name: /next step/i });
			expect(nextButton).toBeEnabled();
		});

		it('should show hemisphere indicator when timezone is selected', async () => {
			render(InitialSetup);

			const timezoneSelect = screen.getByLabelText(/Timezone/i);
			await user.selectOptions(timezoneSelect, 'America/New_York');

			expect(screen.getByText(/Northern Hemisphere/)).toBeInTheDocument();
		});

		it('should show southern hemisphere for Australia timezone', async () => {
			render(InitialSetup);

			const timezoneSelect = screen.getByLabelText(/Timezone/i);
			await user.selectOptions(timezoneSelect, 'Australia/Sydney');

			expect(screen.getByText(/Southern Hemisphere/)).toBeInTheDocument();
		});

		it('should proceed to step 2 when next button is clicked with valid data', async () => {
			render(InitialSetup);

			const churchNameInput = screen.getByLabelText(/Church Name/i);
			const timezoneSelect = screen.getByLabelText(/Timezone/i);

			await user.type(churchNameInput, 'Test Church');
			await user.selectOptions(timezoneSelect, 'America/New_York');

			const nextButton = screen.getByRole('button', { name: /next step/i });
			await user.click(nextButton);

			expect(screen.getByText('Admin Account')).toBeInTheDocument();
		});
	});

	describe('Step 2 - Admin Account', () => {
		beforeEach(async () => {
			render(InitialSetup);

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
			expect(screen.getByLabelText(/^Password$/i)).toBeInTheDocument();
			expect(screen.getByLabelText(/Confirm Password/i)).toBeInTheDocument();
		});

		it('should show setup summary with only church name and timezone', () => {
			expect(screen.getByText('Setup Summary')).toBeInTheDocument();
			expect(screen.getByText('Church: Test Church')).toBeInTheDocument();
			expect(screen.getByText(/Timezone:.*New York/)).toBeInTheDocument();
			
			// Should NOT show location info
			expect(screen.queryByText(/Location:/)).not.toBeInTheDocument();
		});

		it('should allow going back to step 1', async () => {
			const backButton = screen.getByRole('button', { name: /back/i });
			await user.click(backButton);

			expect(screen.getByText('Church Information')).toBeInTheDocument();
		});

		it('should validate password length', async () => {
			const passwordInput = screen.getByLabelText(/^Password$/i);
			await user.type(passwordInput, '12345'); // Too short

			const completeButton = screen.getByRole('button', { name: /complete setup/i });
			await user.click(completeButton);

			expect(screen.getByText('Password must be at least 6 characters')).toBeInTheDocument();
		});

		it('should validate password confirmation', async () => {
			const nameInput = screen.getByLabelText(/Full Name/i);
			const emailInput = screen.getByLabelText(/Email Address/i);
			const passwordInput = screen.getByLabelText(/^Password$/i);
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

			mockedChurchesAPI.initialSetup.mockResolvedValue({ success: true });

			const nameInput = screen.getByLabelText(/Full Name/i);
			const emailInput = screen.getByLabelText(/Email Address/i);
			const passwordInput = screen.getByLabelText(/^Password$/i);
			const confirmInput = screen.getByLabelText(/Confirm Password/i);

			await user.type(nameInput, 'John Doe');
			await user.type(emailInput, 'john@test.com');
			await user.type(passwordInput, 'password123');
			await user.type(confirmInput, 'password123');

			const completeButton = screen.getByRole('button', { name: /complete setup/i });
			await user.click(completeButton);

			expect(mockedChurchesAPI.initialSetup).toHaveBeenCalledWith(mockSetupData);
			expect(mockedSetupStore.markSetupCompleted).toHaveBeenCalled();
			expect(mockedGoto).toHaveBeenCalledWith('/dashboard');
		});

		it('should handle setup errors', async () => {
			mockedChurchesAPI.initialSetup.mockRejectedValue(new Error('Setup failed'));

			const nameInput = screen.getByLabelText(/Full Name/i);
			const emailInput = screen.getByLabelText(/Email Address/i);
			const passwordInput = screen.getByLabelText(/^Password$/i);
			const confirmInput = screen.getByLabelText(/Confirm Password/i);

			await user.type(nameInput, 'John Doe');
			await user.type(emailInput, 'john@test.com');
			await user.type(passwordInput, 'password123');
			await user.type(confirmInput, 'password123');

			const completeButton = screen.getByRole('button', { name: /complete setup/i });
			await user.click(completeButton);

			expect(screen.getByText('Setup failed')).toBeInTheDocument();
		});
	});
});