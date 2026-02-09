'use client';

import { Turnstile, type TurnstileInstance } from '@marsidev/react-turnstile';
import { useRef } from 'react';

const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

interface TurnstileWidgetProps {
  /** Called with the captcha token when the challenge is solved */
  onToken: (token: string) => void;
  /** Called when the token expires (widget auto-resets) */
  onExpire?: () => void;
  /** Called on widget error */
  onError?: () => void;
}

/**
 * Cloudflare Turnstile CAPTCHA widget.
 * Conditionally rendered — returns null when NEXT_PUBLIC_TURNSTILE_SITE_KEY is not set.
 * The server-side captcha plugin reads the token from the `x-captcha-response` header.
 */
export function TurnstileWidget({ onToken, onExpire, onError }: TurnstileWidgetProps) {
  const ref = useRef<TurnstileInstance>(null);

  if (!siteKey) return null;

  return (
    <div className="flex justify-center my-4" aria-label="CAPTCHA-Verifizierung">
      <Turnstile
        ref={ref}
        siteKey={siteKey}
        onSuccess={onToken}
        onExpire={() => {
          onExpire?.();
          ref.current?.reset();
        }}
        onError={() => onError?.()}
        options={{ theme: 'auto', size: 'flexible' }}
      />
    </div>
  );
}

/** Check if Turnstile is configured (site key env var set) */
export function isTurnstileEnabled(): boolean {
  return !!siteKey;
}
