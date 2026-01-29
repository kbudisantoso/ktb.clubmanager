"use client"

import Link from "next/link"

interface LegalLinkProps {
  className?: string
}

/**
 * Legal page links that support external URL overrides via env vars.
 * If NEXT_PUBLIC_*_URL is set, links to external site.
 * Otherwise, links to internal routes.
 */

function getLegalUrl(page: "impressum" | "datenschutz" | "nutzungsbedingungen"): string {
  const envMap = {
    impressum: process.env.NEXT_PUBLIC_IMPRESSUM_URL,
    datenschutz: process.env.NEXT_PUBLIC_DATENSCHUTZ_URL,
    nutzungsbedingungen: process.env.NEXT_PUBLIC_NUTZUNGSBEDINGUNGEN_URL,
  }

  return envMap[page] || `/${page}`
}

function isExternalUrl(url: string): boolean {
  return url.startsWith("http://") || url.startsWith("https://")
}

export function ImpressumLink({ className }: LegalLinkProps) {
  const url = getLegalUrl("impressum")
  const isExternal = isExternalUrl(url)

  if (isExternal) {
    return (
      <a href={url} className={className} target="_blank" rel="noopener noreferrer">
        Impressum
      </a>
    )
  }

  return (
    <Link href={url} className={className}>
      Impressum
    </Link>
  )
}

export function DatenschutzLink({ className }: LegalLinkProps) {
  const url = getLegalUrl("datenschutz")
  const isExternal = isExternalUrl(url)

  if (isExternal) {
    return (
      <a href={url} className={className} target="_blank" rel="noopener noreferrer">
        Datenschutz
      </a>
    )
  }

  return (
    <Link href={url} className={className}>
      Datenschutz
    </Link>
  )
}

export function NutzungsbedingungenLink({ className }: LegalLinkProps) {
  const url = getLegalUrl("nutzungsbedingungen")
  const isExternal = isExternalUrl(url)

  if (isExternal) {
    return (
      <a href={url} className={className} target="_blank" rel="noopener noreferrer">
        Nutzungsbedingungen
      </a>
    )
  }

  return (
    <Link href={url} className={className}>
      Nutzungsbedingungen
    </Link>
  )
}

/**
 * Combined footer links component for convenience.
 */
export function LegalFooterLinks({ className = "hover:text-foreground transition-colors" }: LegalLinkProps) {
  return (
    <>
      <ImpressumLink className={className} />
      <DatenschutzLink className={className} />
      <NutzungsbedingungenLink className={className} />
    </>
  )
}
