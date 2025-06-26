import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen } from '@testing-library/svelte';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AuthForm from './AuthForm.svelte';

describe('AuthForm', () => {
	const mockOnSubmit = vi.fn();

	beforeEach(() => {
		mockOnSubmit.mockClear();
	});

	describe('Login Mode', () => {
		it('should render login form correctly', () => {
			render(AuthForm, {
				props: {
					mode: 'login',
					onSubmit: mockOnSubmit
				}
			});

			expect(screen.getByRole('heading', { name: 'Sign In' })).toBeInTheDocument();
			expect(screen.getByText('Welcome back to WorshipWise')).toBeInTheDocument();
			expect(screen.getByTestId('email-input')).toBeInTheDocument();
			expect(screen.getByTestId('password-input')).toBeInTheDocument();
			expect(screen.getByRole('button', { name: 'Sign In' })).toBeInTheDocument();

			// Should not show register fields
			expect(screen.queryByTestId('name-input')).not.toBeInTheDocument();
			expect(screen.queryByTestId('password-confirm-input')).not.toBeInTheDocument();
		});

		it('should show forgot password link in login mode', () => {
			render(AuthForm, {
				props: {
					mode: 'login',
					onSubmit: mockOnSubmit
				}
			});

			expect(screen.getByRole('link', { name: 'Forgot your password?' })).toBeInTheDocument();
			expect(screen.getByRole('link', { name: 'Sign up' })).toBeInTheDocument();
		});

		it('should validate email field in login mode', async () => {
			render(AuthForm, {
				props: {
					mode: 'login',
					onSubmit: mockOnSubmit
				}
			});

			const emailInput = screen.getByTestId('email-input');
			const submitButton = screen.getByRole('button', { name: 'Sign In' });

			// Test invalid email
			await fireEvent.input(emailInput, { target: { value: 'invalid-email' } });
			expect(screen.getByText('Please enter a valid email address')).toBeInTheDocument();

			// Submit button should be disabled
			expect(submitButton).toBeDisabled();

			// Test valid email
			await fireEvent.input(emailInput, { target: { value: 'test@example.com' } });
			expect(screen.queryByText('Please enter a valid email address')).not.toBeInTheDocument();
		});

		it('should validate password field in login mode', async () => {
			render(AuthForm, {
				props: {
					mode: 'login',
					onSubmit: mockOnSubmit
				}
			});

			const passwordInput = screen.getByTestId('password-input');
			const submitButton = screen.getByRole('button', { name: 'Sign In' });

			// Test short password
			await fireEvent.input(passwordInput, { target: { value: '123' } });
			expect(screen.getByText('Password must be at least 8 characters')).toBeInTheDocument();

			// Submit button should be disabled
			expect(submitButton).toBeDisabled();

			// Test valid password
			await fireEvent.input(passwordInput, { target: { value: 'password123' } });
			expect(screen.queryByText('Password must be at least 8 characters')).not.toBeInTheDocument();
		});

		it('should submit login form with valid data', async () => {
			render(AuthForm, {
				props: {
					mode: 'login',
					onSubmit: mockOnSubmit
				}
			});

			const emailInput = screen.getByTestId('email-input');
			const passwordInput = screen.getByTestId('password-input');
			const submitButton = screen.getByRole('button', { name: 'Sign In' });

			await fireEvent.input(emailInput, { target: { value: 'test@example.com' } });
			await fireEvent.input(passwordInput, { target: { value: 'password123' } });

			expect(submitButton).not.toBeDisabled();

			await fireEvent.click(submitButton);

			expect(mockOnSubmit).toHaveBeenCalledWith({
				email: 'test@example.com',
				password: 'password123'
			});
		});

		it('should not submit login form with invalid data', async () => {
			render(AuthForm, {
				props: {
					mode: 'login',
					onSubmit: mockOnSubmit
				}
			});

			const emailInput = screen.getByTestId('email-input');
			const passwordInput = screen.getByTestId('password-input');
			const submitButton = screen.getByRole('button', { name: 'Sign In' });

			await fireEvent.input(emailInput, { target: { value: 'invalid-email' } });
			await fireEvent.input(passwordInput, { target: { value: '123' } });

			await fireEvent.click(submitButton);

			expect(mockOnSubmit).not.toHaveBeenCalled();
			expect(screen.getByText('Please enter a valid email address')).toBeInTheDocument();
			expect(screen.getByText('Password must be at least 8 characters')).toBeInTheDocument();
		});
	});

	describe('Register Mode', () => {
		it('should render register form correctly', () => {
			render(AuthForm, {
				props: {
					mode: 'register',
					onSubmit: mockOnSubmit
				}
			});

			expect(screen.getByRole('heading', { name: 'Create Account' })).toBeInTheDocument();
			expect(screen.getByText('Join WorshipWise to get started')).toBeInTheDocument();
			expect(screen.getByTestId('name-input')).toBeInTheDocument();
			expect(screen.getByTestId('email-input')).toBeInTheDocument();
			expect(screen.getByTestId('password-input')).toBeInTheDocument();
			expect(screen.getByTestId('password-confirm-input')).toBeInTheDocument();
			expect(screen.getByRole('button', { name: 'Create Account' })).toBeInTheDocument();
		});

		it('should show sign in link in register mode', () => {
			render(AuthForm, {
				props: {
					mode: 'register',
					onSubmit: mockOnSubmit
				}
			});

			expect(screen.getByRole('link', { name: 'Sign in' })).toBeInTheDocument();
			expect(screen.queryByText('Forgot your password?')).not.toBeInTheDocument();
		});

		it('should validate name field in register mode', async () => {
			render(AuthForm, {
				props: {
					mode: 'register',
					onSubmit: mockOnSubmit
				}
			});

			const nameInput = screen.getByTestId('name-input');
			const submitButton = screen.getByRole('button', { name: 'Create Account' });

			// Test empty name
			await fireEvent.input(nameInput, { target: { value: '' } });
			await fireEvent.blur(nameInput);

			// Should be disabled without name
			expect(submitButton).toBeDisabled();

			// Test valid name
			await fireEvent.input(nameInput, { target: { value: 'John Doe' } });
			expect(screen.queryByText('Name is required')).not.toBeInTheDocument();
		});

		it('should validate password confirmation in register mode', async () => {
			render(AuthForm, {
				props: {
					mode: 'register',
					onSubmit: mockOnSubmit
				}
			});

			const passwordInput = screen.getByTestId('password-input');
			const passwordConfirmInput = screen.getByTestId('password-confirm-input');

			await fireEvent.input(passwordInput, { target: { value: 'password123' } });
			await fireEvent.input(passwordConfirmInput, { target: { value: 'different123' } });

			expect(screen.getByText('Passwords do not match')).toBeInTheDocument();

			// Test matching passwords
			await fireEvent.input(passwordConfirmInput, { target: { value: 'password123' } });
			expect(screen.queryByText('Passwords do not match')).not.toBeInTheDocument();
		});

		it('should submit register form with valid data', async () => {
			render(AuthForm, {
				props: {
					mode: 'register',
					onSubmit: mockOnSubmit
				}
			});

			const nameInput = screen.getByTestId('name-input');
			const emailInput = screen.getByTestId('email-input');
			const passwordInput = screen.getByTestId('password-input');
			const passwordConfirmInput = screen.getByTestId('password-confirm-input');
			const submitButton = screen.getByRole('button', { name: 'Create Account' });

			await fireEvent.input(nameInput, { target: { value: 'John Doe' } });
			await fireEvent.input(emailInput, { target: { value: 'john@example.com' } });
			await fireEvent.input(passwordInput, { target: { value: 'password123' } });
			await fireEvent.input(passwordConfirmInput, { target: { value: 'password123' } });

			expect(submitButton).not.toBeDisabled();

			await fireEvent.click(submitButton);

			expect(mockOnSubmit).toHaveBeenCalledWith({
				email: 'john@example.com',
				password: 'password123',
				passwordConfirm: 'password123',
				name: 'John Doe',
				role: 'musician'
			});
		});

		it('should submit register form with default role', async () => {
			render(AuthForm, {
				props: {
					mode: 'register',
					onSubmit: mockOnSubmit
				}
			});

			const nameInput = screen.getByTestId('name-input');
			const emailInput = screen.getByTestId('email-input');
			const passwordInput = screen.getByTestId('password-input');
			const passwordConfirmInput = screen.getByTestId('password-confirm-input');
			const submitButton = screen.getByRole('button', { name: 'Create Account' });

			await fireEvent.input(nameInput, { target: { value: 'John Doe' } });
			await fireEvent.input(emailInput, { target: { value: 'john@example.com' } });
			await fireEvent.input(passwordInput, { target: { value: 'password123' } });
			await fireEvent.input(passwordConfirmInput, { target: { value: 'password123' } });

			expect(submitButton).not.toBeDisabled();

			await fireEvent.click(submitButton);

			expect(mockOnSubmit).toHaveBeenCalledWith({
				email: 'john@example.com',
				password: 'password123',
				passwordConfirm: 'password123',
				name: 'John Doe',
				role: 'musician'
			});
		});

		it('should not submit register form with invalid data', async () => {
			render(AuthForm, {
				props: {
					mode: 'register',
					onSubmit: mockOnSubmit
				}
			});

			const nameInput = screen.getByTestId('name-input');
			const emailInput = screen.getByTestId('email-input');
			const passwordInput = screen.getByTestId('password-input');
			const passwordConfirmInput = screen.getByTestId('password-confirm-input');
			const submitButton = screen.getByRole('button', { name: 'Create Account' });

			// Fill fields with invalid data to trigger validation
			await fireEvent.input(emailInput, { target: { value: 'invalid-email' } });
			await fireEvent.input(passwordInput, { target: { value: '123' } });
			await fireEvent.input(passwordConfirmInput, { target: { value: 'different' } });
			// Leave name empty

			// Submit button should be disabled due to validation
			expect(submitButton).toBeDisabled();

			// Try to submit anyway
			await fireEvent.click(submitButton);

			expect(mockOnSubmit).not.toHaveBeenCalled();
			expect(screen.getByText('Please enter a valid email address')).toBeInTheDocument();
			expect(screen.getByText('Password must be at least 8 characters')).toBeInTheDocument();
			expect(screen.getByText('Passwords do not match')).toBeInTheDocument();
		});
	});

	describe('Error Display', () => {
		it('should display error message when provided', () => {
			render(AuthForm, {
				props: {
					mode: 'login',
					error: 'Invalid credentials',
					onSubmit: mockOnSubmit
				}
			});

			expect(screen.getByText('Invalid credentials')).toBeInTheDocument();
			expect(screen.getByRole('alert')).toBeInTheDocument();
		});

		it('should not display error message when null', () => {
			render(AuthForm, {
				props: {
					mode: 'login',
					error: null,
					onSubmit: mockOnSubmit
				}
			});

			expect(screen.queryByRole('alert')).not.toBeInTheDocument();
		});
	});

	describe('Loading State', () => {
		it('should show loading state when loading is true', () => {
			render(AuthForm, {
				props: {
					mode: 'login',
					loading: true,
					onSubmit: mockOnSubmit
				}
			});

			const submitButton = screen.getByRole('button');
			expect(submitButton).toHaveTextContent('Please wait...');
			expect(submitButton).toBeDisabled();
		});

		it('should show normal state when loading is false', () => {
			render(AuthForm, {
				props: {
					mode: 'login',
					loading: false,
					onSubmit: mockOnSubmit
				}
			});

			const submitButton = screen.getByRole('button');
			expect(submitButton).toHaveTextContent('Sign In');
			expect(submitButton).toBeDisabled(); // Still disabled due to empty form
		});
	});

	describe('Mode Switching', () => {
		it('should display correct fields for login mode', () => {
			render(AuthForm, {
				props: {
					mode: 'login',
					onSubmit: mockOnSubmit
				}
			});

			expect(screen.getByTestId('email-input')).toBeInTheDocument();
			expect(screen.getByTestId('password-input')).toBeInTheDocument();
			expect(screen.queryByTestId('name-input')).not.toBeInTheDocument();
			expect(screen.queryByTestId('password-confirm-input')).not.toBeInTheDocument();
		});

		it('should display correct fields for register mode', () => {
			render(AuthForm, {
				props: {
					mode: 'register',
					onSubmit: mockOnSubmit
				}
			});

			expect(screen.getByTestId('email-input')).toBeInTheDocument();
			expect(screen.getByTestId('password-input')).toBeInTheDocument();
			expect(screen.getByTestId('name-input')).toBeInTheDocument();
			expect(screen.getByTestId('password-confirm-input')).toBeInTheDocument();
		});
	});

	describe('Accessibility', () => {
		it('should have proper form labels and structure', () => {
			render(AuthForm, {
				props: {
					mode: 'register',
					onSubmit: mockOnSubmit
				}
			});

			// Form element exists and has proper labels
			expect(document.querySelector('form')).toBeInTheDocument();
			expect(screen.getByLabelText(/Full Name/)).toBeInTheDocument();
			expect(screen.getByLabelText(/^Email/)).toBeInTheDocument();
			expect(screen.getByLabelText(/^Password \*/)).toBeInTheDocument();
			expect(screen.getByLabelText(/Confirm Password/)).toBeInTheDocument();
		});

		it('should have proper autocomplete attributes', () => {
			render(AuthForm, {
				props: {
					mode: 'register',
					onSubmit: mockOnSubmit
				}
			});

			expect(screen.getByTestId('name-input')).toHaveAttribute('autocomplete', 'name');
			expect(screen.getByTestId('email-input')).toHaveAttribute('autocomplete', 'email');
			expect(screen.getByTestId('password-input')).toHaveAttribute('autocomplete', 'new-password');
			expect(screen.getByTestId('password-confirm-input')).toHaveAttribute(
				'autocomplete',
				'new-password'
			);
		});

		it('should have proper autocomplete for login mode', () => {
			render(AuthForm, {
				props: {
					mode: 'login',
					onSubmit: mockOnSubmit
				}
			});

			expect(screen.getByTestId('password-input')).toHaveAttribute(
				'autocomplete',
				'current-password'
			);
		});
	});
});
