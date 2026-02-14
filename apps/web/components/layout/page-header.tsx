'use client';

import { SidebarTrigger } from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import { BreadcrumbNav } from './breadcrumb-nav';

interface PageHeaderProps {
  title: string;
  description?: string;
  breadcrumbs?: { label: string; href?: string }[];
  actions?: React.ReactNode;
}

/**
 * Standardized page header with sidebar toggle, breadcrumbs, title,
 * optional description, and an actions slot.
 *
 * Every page within the AppShell should use this component to ensure
 * consistent chrome. The breadcrumbs can be provided manually or
 * auto-generated from the current pathname (see BreadcrumbNav).
 */
export function PageHeader({ title, description, breadcrumbs, actions }: PageHeaderProps) {
  return (
    <header>
      {/* Top bar: sidebar trigger + breadcrumbs */}
      <div className="flex h-12 items-center gap-2 border-b bg-background px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="h-4" />
        <BreadcrumbNav items={breadcrumbs} />
      </div>

      {/* Title section */}
      <div className="flex items-start justify-between px-4 pb-4 pt-2 sm:px-6">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">{title}</h1>
          {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
    </header>
  );
}
