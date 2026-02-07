'use client';

import { toast as sonnerToast, type ExternalToast } from 'sonner';

interface ToastOptions {
  title?: string;
  description?: string;
  variant?: 'default' | 'destructive';
  action?: {
    label: string;
    onClick: () => void;
  };
}

/**
 * Wrapper hook around sonner's toast function.
 * Provides a consistent API for the application.
 *
 * @example
 * ```tsx
 * const { toast } = useToast()
 * toast({ title: "Success", description: "Operation completed" })
 * toast({ title: "Error", variant: "destructive" })
 * ```
 */
export function useToast() {
  function toast(options: ToastOptions) {
    const sonnerOptions: ExternalToast = {
      description: options.description,
      action: options.action
        ? {
            label: options.action.label,
            onClick: options.action.onClick,
          }
        : undefined,
    };

    if (options.variant === 'destructive') {
      sonnerToast.error(options.title, sonnerOptions);
    } else {
      sonnerToast.success(options.title, sonnerOptions);
    }
  }

  return { toast };
}
