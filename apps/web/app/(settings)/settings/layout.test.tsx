import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock PageHeader (uses SidebarProvider context)
vi.mock('@/components/layout/page-header', () => ({
  PageHeader: ({ title }: { title: string }) => (
    <div data-testid="page-header">
      <h1>{title}</h1>
    </div>
  ),
}));

// Import after mocks
import SettingsLayout from './layout';

describe('SettingsLayout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the settings page header', () => {
    render(
      <SettingsLayout>
        <div>Test Content</div>
      </SettingsLayout>
    );

    expect(screen.getByText('Einstellungen')).toBeInTheDocument();
  });

  it('renders children content', () => {
    render(
      <SettingsLayout>
        <div data-testid="child-content">Test Child Content</div>
      </SettingsLayout>
    );

    expect(screen.getByTestId('child-content')).toBeInTheDocument();
    expect(screen.getByText('Test Child Content')).toBeInTheDocument();
  });
});
