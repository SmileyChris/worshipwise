import '@testing-library/jest-dom/vitest';
import { describe, it, expect } from 'vitest';
import { renderWithContext } from '../../../../tests/helpers/component-test-utils';
import { screen } from '@testing-library/svelte';
import DashboardSimple from './DashboardSimple.svelte';

describe('DashboardSimple', () => {
  it('renders hero and primary CTAs', () => {
    renderWithContext(DashboardSimple, {
      storeOverrides: {
        songs: { songs: [] },
        quickstart: { isSetupComplete: false }
      }
    });

    expect(screen.getByText('Welcome to WorshipWise')).toBeInTheDocument();
    expect(screen.getByText('Add Song')).toBeInTheDocument();
    expect(screen.getByText('Plan Service')).toBeInTheDocument();
    expect(screen.getByText('Open Setup Wizard')).toBeInTheDocument();
  });
});
