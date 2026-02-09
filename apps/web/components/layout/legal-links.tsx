'use client';

import Link from 'next/link';

interface LegalLinkProps {
  className?: string;
}

/**
 * Legal page links that support external URL overrides via env vars.
 * If NEXT_PUBLIC_*_URL is set, links to external site.
 * Otherwise, links to internal routes.
 *
 * Runtime URL validation enforces HTTPS in production (SEC-032).
 * This prevents compromised environment variables from redirecting users to attacker sites.
 */

/**
 * Validate that a legal URL is safe to render.
 * In production, only HTTPS URLs are allowed.
 * In development, both HTTP and HTTPS are allowed.
 */
function isValidLegalUrl(url: string | undefined): boolean {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    // In production, enforce HTTPS
    if (process.env.NODE_ENV === 'production') {
      return parsed.protocol === 'https:';
    }
    // In development, allow http and https
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

function getLegalUrl(page: 'impressum' | 'datenschutz' | 'nutzungsbedingungen'): string {
  const envMap = {
    impressum: process.env.NEXT_PUBLIC_IMPRESSUM_URL,
    datenschutz: process.env.NEXT_PUBLIC_DATENSCHUTZ_URL,
    nutzungsbedingungen: process.env.NEXT_PUBLIC_NUTZUNGSBEDINGUNGEN_URL,
  };

  const envUrl = envMap[page];

  // Validate external URLs - fall back to internal route if invalid (SEC-032)
  if (envUrl && !isValidLegalUrl(envUrl)) {
    return `/${page}`;
  }

  return envUrl || `/${page}`;
}

function isExternalUrl(url: string): boolean {
  return url.startsWith('http://') || url.startsWith('https://');
}

export function ImpressumLink({ className }: LegalLinkProps) {
  const url = getLegalUrl('impressum');
  const isExternal = isExternalUrl(url);

  if (isExternal) {
    return (
      <a href={url} className={className} target="_blank" rel="noopener noreferrer">
        Impressum
      </a>
    );
  }

  return (
    <Link href={url} className={className}>
      Impressum
    </Link>
  );
}

export function DatenschutzLink({ className }: LegalLinkProps) {
  const url = getLegalUrl('datenschutz');
  const isExternal = isExternalUrl(url);

  if (isExternal) {
    return (
      <a href={url} className={className} target="_blank" rel="noopener noreferrer">
        Datenschutz
      </a>
    );
  }

  return (
    <Link href={url} className={className}>
      Datenschutz
    </Link>
  );
}

export function NutzungsbedingungenLink({ className }: LegalLinkProps) {
  const url = getLegalUrl('nutzungsbedingungen');
  const isExternal = isExternalUrl(url);

  if (isExternal) {
    return (
      <a href={url} className={className} target="_blank" rel="noopener noreferrer">
        Nutzungsbedingungen
      </a>
    );
  }

  return (
    <Link href={url} className={className}>
      Nutzungsbedingungen
    </Link>
  );
}

/**
 * Combined footer links component for convenience.
 */
export function LegalFooterLinks({
  className = 'hover:text-foreground transition-colors',
}: LegalLinkProps) {
  return (
    <>
      <ImpressumLink className={className} />
      <DatenschutzLink className={className} />
      <NutzungsbedingungenLink className={className} />
    </>
  );
}
