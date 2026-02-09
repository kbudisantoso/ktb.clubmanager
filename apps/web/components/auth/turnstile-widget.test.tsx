import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

// Track the original env value so we can manipulate it per-test
const ORIGINAL_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

// Mock @marsidev/react-turnstile
let capturedProps: Record<string, unknown> = {};
vi.mock('@marsidev/react-turnstile', () => ({
  Turnstile: vi.fn((props: Record<string, unknown>) => {
    capturedProps = props;
    return (
      <div data-testid="turnstile-widget">
        <button
          data-testid="turnstile-solve"
          onClick={() => (props.onSuccess as (token: string) => void)?.('test-token-abc')}
        >
          Solve
        </button>
        <button data-testid="turnstile-expire" onClick={() => (props.onExpire as () => void)?.()}>
          Expire
        </button>
        <button data-testid="turnstile-error" onClick={() => (props.onError as () => void)?.()}>
          Error
        </button>
      </div>
    );
  }),
}));

describe('TurnstileWidget', () => {
  beforeEach(() => {
    vi.resetModules();
    capturedProps = {};
  });

  afterEach(() => {
    // Restore original env
    if (ORIGINAL_SITE_KEY) {
      process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY = ORIGINAL_SITE_KEY;
    } else {
      delete process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
    }
  });

  describe('when NEXT_PUBLIC_TURNSTILE_SITE_KEY is not set', () => {
    it('renders nothing', async () => {
      delete process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
      const mod = await import('./turnstile-widget');
      const { container } = render(<mod.TurnstileWidget onToken={vi.fn()} />);
      expect(container.innerHTML).toBe('');
    });

    it('isTurnstileEnabled returns false', async () => {
      delete process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
      const mod = await import('./turnstile-widget');
      expect(mod.isTurnstileEnabled()).toBe(false);
    });
  });

  describe('when NEXT_PUBLIC_TURNSTILE_SITE_KEY is set', () => {
    it('renders the Turnstile widget', async () => {
      process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY = 'test-site-key';
      const mod = await import('./turnstile-widget');
      render(<mod.TurnstileWidget onToken={vi.fn()} />);
      expect(screen.getByTestId('turnstile-widget')).toBeInTheDocument();
    });

    it('isTurnstileEnabled returns true', async () => {
      process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY = 'test-site-key';
      const mod = await import('./turnstile-widget');
      expect(mod.isTurnstileEnabled()).toBe(true);
    });

    it('calls onToken when challenge is solved', async () => {
      process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY = 'test-site-key';
      const onToken = vi.fn();
      const mod = await import('./turnstile-widget');
      render(<mod.TurnstileWidget onToken={onToken} />);

      fireEvent.click(screen.getByTestId('turnstile-solve'));
      expect(onToken).toHaveBeenCalledWith('test-token-abc');
    });

    it('calls onExpire when token expires', async () => {
      process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY = 'test-site-key';
      const onExpire = vi.fn();
      const mod = await import('./turnstile-widget');
      render(<mod.TurnstileWidget onToken={vi.fn()} onExpire={onExpire} />);

      fireEvent.click(screen.getByTestId('turnstile-expire'));
      expect(onExpire).toHaveBeenCalled();
    });

    it('calls onError on widget error', async () => {
      process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY = 'test-site-key';
      const onError = vi.fn();
      const mod = await import('./turnstile-widget');
      render(<mod.TurnstileWidget onToken={vi.fn()} onError={onError} />);

      fireEvent.click(screen.getByTestId('turnstile-error'));
      expect(onError).toHaveBeenCalled();
    });

    it('passes auto theme and flexible size', async () => {
      process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY = 'test-site-key';
      const mod = await import('./turnstile-widget');
      render(<mod.TurnstileWidget onToken={vi.fn()} />);

      expect(capturedProps.options).toEqual({ theme: 'auto', size: 'flexible' });
    });
  });
});
