import '@testing-library/jest-dom/vitest';
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
    expect(screen.getByText('Songs')).toBeInTheDocument();
    expect(screen.getByText('Services')).toBeInTheDocument();
    expect(screen.getByText('Insights')).toBeInTheDocument();
  });
});
