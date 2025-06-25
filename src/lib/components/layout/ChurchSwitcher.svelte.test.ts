import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen, fireEvent } from '@testing-library/svelte';
import '@testing-library/jest-dom/vitest';
import ChurchSwitcher from './ChurchSwitcher.svelte';
import { renderWithContext } from '../../../../tests/helpers/component-test-utils';
import { mockUser, mockChurch, mockMembership } from '../../../../tests/helpers/mock-builders';

vi.mock('$app/stores', () => ({
	page: {
		subscribe: vi.fn((fn) => {
			fn({ url: { pathname: '/dashboard' } });
			return vi.fn();
		})
	}
}));

vi.mock('$app/navigation', () => ({
	goto: vi.fn()
}));

describe('ChurchSwitcher - Basic Tests', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should render when user has a church', () => {
		const testChurch = mockChurch({ id: 'church1', name: 'Test Church' });
		renderWithContext(ChurchSwitcher, {
			currentChurch: testChurch
		});

		expect(screen.getByRole('button')).toBeInTheDocument();
		expect(screen.getByText('Test Church')).toBeInTheDocument();
	});

	it('should have proper aria attributes', () => {
		const testChurch = mockChurch({ id: 'church1', name: 'Test Church' });
		renderWithContext(ChurchSwitcher, {
			currentChurch: testChurch
		});

		const button = screen.getByRole('button');
		expect(button).toHaveAttribute('aria-expanded', 'false');
		expect(button).toHaveAttribute('aria-haspopup', 'true');
	});

	it('should show church icon', () => {
		const testChurch = mockChurch({ id: 'church1', name: 'Test Church' });
		renderWithContext(ChurchSwitcher, {
			currentChurch: testChurch
		});

		// Check for the Church icon SVG
		const svg = screen.getByRole('button').querySelector('svg');
		expect(svg).toBeInTheDocument();
	});
});

describe('ChurchSwitcher - Invitation Features', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should show notification badge when user has pending invites', async () => {
		const testChurch = mockChurch({ id: 'church1', name: 'Test Church' });
		const pendingInvites = [
			{
				id: 'invite1',
				token: 'token1',
				role: 'musician',
				expand: {
					church_id: { id: 'church2', name: 'New Church' },
					invited_by: { id: 'admin1', name: 'Admin User' }
				}
			},
			{
				id: 'invite2',
				token: 'token2',
				role: 'leader',
				expand: {
					church_id: { id: 'church3', name: 'Another Church' },
					invited_by: { id: 'admin2', name: 'Another Admin' }
				}
			}
		];

		renderWithContext(ChurchSwitcher, {
			currentChurch: testChurch,
			pendingInvites
		});

		// Should show pulsing notification badge
		const pulsingBadge = screen.getByRole('button').querySelector('.animate-ping');
		expect(pulsingBadge).toBeInTheDocument();
	});

	it('should not show notification badge when no pending invites', async () => {
		const testChurch = mockChurch({ id: 'church1', name: 'Test Church' });

		renderWithContext(ChurchSwitcher, {
			currentChurch: testChurch,
			pendingInvites: []
		});

		// Should not show pulsing notification badge
		const pulsingBadge = screen.getByRole('button').querySelector('.animate-ping');
		expect(pulsingBadge).not.toBeInTheDocument();
	});

	it('should show invitations section in dropdown when there are pending invites', async () => {
		const testChurch = mockChurch({ id: 'church1', name: 'Test Church' });
		const pendingInvites = [
			{
				id: 'invite1',
				token: 'token1',
				role: 'musician',
				expand: {
					church_id: { id: 'church2', name: 'New Church' },
					invited_by: { id: 'admin1', name: 'Admin User' }
				}
			},
			{
				id: 'invite2',
				token: 'token2',
				role: 'leader',
				expand: {
					church_id: { id: 'church3', name: 'Another Church' },
					invited_by: { id: 'admin2', name: 'Another Admin' }
				}
			}
		];

		renderWithContext(ChurchSwitcher, {
			currentChurch: testChurch,
			pendingInvites
		});

		// Open dropdown
		const button = screen.getByRole('button');
		await fireEvent.click(button);

		// Should show invitations section
		expect(screen.getByText('Invitations (2)')).toBeInTheDocument();
		expect(screen.getByText('New Church')).toBeInTheDocument();
		expect(screen.getByText('Invited as musician')).toBeInTheDocument();
		expect(screen.getByText('Another Church')).toBeInTheDocument();
		expect(screen.getByText('Invited as leader')).toBeInTheDocument();
	});

	it('should limit displayed invitations to 3 and show "View all" link', async () => {
		const testChurch = mockChurch({ id: 'church1', name: 'Test Church' });
		const pendingInvites = [
			{
				id: 'invite1',
				token: 'token1',
				role: 'musician',
				expand: { church_id: { id: 'church2', name: 'Church 1' } }
			},
			{
				id: 'invite2',
				token: 'token2',
				role: 'leader',
				expand: { church_id: { id: 'church3', name: 'Church 2' } }
			},
			{
				id: 'invite3',
				token: 'token3',
				role: 'admin',
				expand: { church_id: { id: 'church4', name: 'Church 3' } }
			},
			{
				id: 'invite4',
				token: 'token4',
				role: 'musician',
				expand: { church_id: { id: 'church5', name: 'Church 4' } }
			},
			{
				id: 'invite5',
				token: 'token5',
				role: 'leader',
				expand: { church_id: { id: 'church6', name: 'Church 5' } }
			}
		];

		renderWithContext(ChurchSwitcher, {
			currentChurch: testChurch,
			pendingInvites
		});

		// Open dropdown
		const button = screen.getByRole('button');
		await fireEvent.click(button);

		// Should show only first 3 invitations
		expect(screen.getByText('Church 1')).toBeInTheDocument();
		expect(screen.getByText('Church 2')).toBeInTheDocument();
		expect(screen.getByText('Church 3')).toBeInTheDocument();
		expect(screen.queryByText('Church 4')).not.toBeInTheDocument();
		expect(screen.queryByText('Church 5')).not.toBeInTheDocument();

		// Should show "View all invitations" link
		expect(screen.getByText('View all invitations')).toBeInTheDocument();
	});

	it('should not show invitations section when no pending invites', async () => {
		const testChurch = mockChurch({ id: 'church1', name: 'Test Church' });

		renderWithContext(ChurchSwitcher, {
			currentChurch: testChurch,
			pendingInvites: []
		});

		// Open dropdown
		const button = screen.getByRole('button');
		await fireEvent.click(button);

		// Should not show invitations section
		expect(screen.queryByText(/Invitations/)).not.toBeInTheDocument();
	});

	it('should have correct links for invitations', async () => {
		const testChurch = mockChurch({ id: 'church1', name: 'Test Church' });
		const pendingInvites = [
			{
				id: 'invite1',
				token: 'test-token-123',
				role: 'musician',
				expand: {
					church_id: { id: 'church2', name: 'New Church Invitation' }
				}
			}
		];

		renderWithContext(ChurchSwitcher, {
			currentChurch: testChurch,
			pendingInvites
		});

		// Open dropdown
		const button = screen.getByRole('button');
		await fireEvent.click(button);

		// Check the invitation link
		const inviteLink = screen.getByRole('menuitem', { name: /New Church Invitation/ });
		expect(inviteLink).toHaveAttribute('href', '/invites/test-token-123');
	});

	it('should handle missing church name in invitation', async () => {
		const testChurch = mockChurch({ id: 'church1', name: 'Test Church' });
		const pendingInvites = [
			{
				id: 'invite1',
				token: 'token1',
				role: 'musician',
				expand: {} // Missing church_id expansion
			}
		];

		renderWithContext(ChurchSwitcher, {
			currentChurch: testChurch,
			pendingInvites
		});

		// Open dropdown
		const button = screen.getByRole('button');
		await fireEvent.click(button);

		// Should show "Unknown Church" when church name is missing
		expect(screen.getByText('Unknown Church')).toBeInTheDocument();
	});
});
