import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent } from '@testing-library/svelte';
import '@testing-library/jest-dom/vitest';
import Navigation from './Navigation.svelte';
import { renderWithContext } from '../../../../tests/helpers/component-test-utils';

vi.mock('$app/stores', () => ({
  page: {
    subscribe: vi.fn((fn) => {
      fn({ url: { pathname: '/dashboard' } });
      return vi.fn();
    })
  }
}));

// Stub reload to avoid errors in tests
Object.defineProperty(window, 'location', {
  value: { reload: vi.fn() },
  writable: true
});

describe('Navigation - Church section', () => {
  const churches = [
    { id: 'c1', name: 'Alpha Church' },
    { id: 'c2', name: 'Beta Church' }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows Church section with add button and highlights current church in user menu (desktop)', async () => {
    renderWithContext(Navigation, {
      currentChurch: churches[0],
      churches
    });

    // Open user menu
    const userMenuBtn = screen.getByRole('button', { name: /open user menu/i });
    await fireEvent.click(userMenuBtn);

    // Title (could appear in both menu and mobile blocks)
    expect(screen.getAllByText('Church').length).toBeGreaterThan(0);

    // Add church link
    const addLink = screen.getAllByTitle('Add church')[0];
    expect(addLink).toHaveAttribute('href', '/churches/add');

    // Current church highlighted and checkmarked
    expect(screen.getAllByText('Alpha Church')[0]).toBeInTheDocument();
    expect(screen.getAllByText('✓').length).toBeGreaterThan(0);

    // Other church also listed
    expect(screen.getAllByText('Beta Church').length).toBeGreaterThan(0);
  });

  it('shows Church section with add button and lists churches in mobile section', async () => {
    renderWithContext(Navigation, {
      currentChurch: churches[0],
      churches
    });

    // Mobile Church header and add link
    expect(screen.getAllByText('Church')[0]).toBeInTheDocument();
    const addLinks = screen.getAllByTitle('Add church');
    expect(addLinks.length).toBeGreaterThan(0);
    expect(addLinks[0]).toHaveAttribute('href', '/churches/add');

    // Mobile list should include both churches
    expect(screen.getAllByText('Alpha Church')[0]).toBeInTheDocument();
    expect(screen.getAllByText('Beta Church')[0]).toBeInTheDocument();
  });
});
