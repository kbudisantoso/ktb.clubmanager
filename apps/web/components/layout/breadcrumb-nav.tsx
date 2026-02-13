'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { getBreadcrumbLabel } from '@/lib/breadcrumb-config';
import { useActiveClub } from '@/lib/club-store';
import React from 'react';

interface BreadcrumbNavItem {
  label: string;
  href?: string;
}

interface BreadcrumbNavProps {
  items?: BreadcrumbNavItem[];
}

/**
 * Regex matching UUID-like path segments (e.g. member IDs).
 * These are skipped during auto-generation.
 */
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Regex matching route group segments (parenthesized, e.g. "(main)").
 * These are skipped during auto-generation.
 */
const ROUTE_GROUP_REGEX = /^\(.*\)$/;

/**
 * Auto-generates breadcrumb items from the current pathname.
 *
 * Logic:
 * - Splits the path by "/" and filters empties
 * - Skips route groups (parenthesized segments)
 * - For club paths: replaces "clubs/{slug}" with the club name, linking to the club dashboard
 * - Maps remaining segments to German labels via getBreadcrumbLabel()
 * - Skips UUID-like segments (detail page IDs)
 * - Last item is the current page (no link)
 */
function useAutoItems(): BreadcrumbNavItem[] {
  const pathname = usePathname();
  const club = useActiveClub();

  const segments = pathname
    .split('/')
    .filter((s) => s.length > 0)
    .filter((s) => !ROUTE_GROUP_REGEX.test(s));

  const items: BreadcrumbNavItem[] = [];
  let i = 0;

  // Handle club path prefix: /clubs/{slug}/...
  if (segments[0] === 'clubs' && segments.length >= 2) {
    const slug = segments[1];
    items.push({
      label: club?.name ?? slug,
      href: `/clubs/${slug}/dashboard`,
    });
    i = 2; // skip "clubs" and slug
  }

  // Handle admin path prefix: /admin/...
  if (segments[0] === 'admin') {
    items.push({
      label: getBreadcrumbLabel('admin'),
      href: '/admin',
    });
    i = 1; // skip "admin"
  }

  // Process remaining segments
  for (; i < segments.length; i++) {
    const segment = segments[i];

    // Skip UUIDs (detail page IDs)
    if (UUID_REGEX.test(segment)) continue;

    const isLast = i === segments.length - 1;
    const href = isLast ? undefined : '/' + segments.slice(0, i + 1).join('/');

    items.push({
      label: getBreadcrumbLabel(segment),
      href,
    });
  }

  return items;
}

/**
 * Breadcrumb navigation component.
 *
 * Two modes:
 * 1. Manual: Renders the provided `items` prop directly
 * 2. Auto: Auto-generates breadcrumbs from the current pathname with German labels
 */
export function BreadcrumbNav({ items }: BreadcrumbNavProps) {
  const autoItems = useAutoItems();
  const breadcrumbs = items ?? autoItems;

  if (breadcrumbs.length === 0) return null;

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {breadcrumbs.map((item, index) => {
          const isLast = index === breadcrumbs.length - 1;

          return (
            <React.Fragment key={item.label + (item.href ?? '')}>
              <BreadcrumbItem>
                {isLast || !item.href ? (
                  <BreadcrumbPage>{item.label}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild>
                    <Link href={item.href}>{item.label}</Link>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
              {!isLast && <BreadcrumbSeparator />}
            </React.Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
