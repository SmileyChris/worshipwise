import '@testing-library/jest-dom/vitest';
import { describe, it, expect } from 'vitest';
import { renderWithContext } from '../../../../tests/helpers/component-test-utils';
import { screen } from '@testing-library/svelte';
import DashboardStandard from './DashboardStandard.svelte';

describe('DashboardStandard', () => {
  it('renders recent songs and quick links', () => {
    renderWithContext(DashboardStandard, {
      storeOverrides: {
        songs: {
          songs: [
            { id: '1', title: 'Amazing Grace', artist: 'John Newton', key_signature: 'G' }
          ]
        }
      }
    });

    expect(screen.getByText('Recent Songs')).toBeInTheDocument();
    expect(screen.getByText('Amazing Grace')).toBeInTheDocument();
    expect(screen.getByText('Add Song')).toBeInTheDocument();
    expect(screen.getByText('Find Songs')).toBeInTheDocument();
    // "Upcoming Services" appears multiple times (header and stat card)
    expect(screen.getAllByText('Upcoming Services').length).toBeGreaterThan(0);
    expect(screen.getByText('Total Songs')).toBeInTheDocument();
  });
});
