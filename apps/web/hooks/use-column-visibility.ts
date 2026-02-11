'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';

/**
 * Storage format version for migration support.
 * Increment when changing the stored structure to auto-discard
 * incompatible stored preferences.
 */
const STORAGE_VERSION = 1;

/**
 * Default column visibility for the member list table.
 * Notes are hidden by default to reduce visual noise.
 */
export const DEFAULT_COLUMNS = {
  memberNumber: true,
  status: true,
  email: true,
  phone: true,
  household: true,
  membershipType: true,
  joinDate: true,
  notes: false,
} as const satisfies Record<string, boolean>;

export type ColumnKey = keyof typeof DEFAULT_COLUMNS;

interface StoredColumns {
  version: number;
  columns: Record<ColumnKey, boolean>;
}

/**
 * Manages column visibility preferences with localStorage persistence per club.
 *
 * Handles SSR safely: initializes with defaults, hydrates from localStorage
 * in useEffect to avoid hydration mismatches (see RESEARCH.md Pitfall 4).
 *
 * @param clubSlug - Club identifier for per-club preference storage
 *
 * @example
 * const { columns, toggleColumn, resetColumns, isDefault } = useColumnVisibility('my-club');
 *
 * // Check if a column is visible
 * columns.email // true
 *
 * // Toggle a column
 * toggleColumn('email'); // now false
 *
 * // Reset to defaults
 * resetColumns();
 */
export function useColumnVisibility(clubSlug: string) {
  const storageKey = `member-columns:${clubSlug}`;

  const [columns, setColumns] = useState<Record<ColumnKey, boolean>>({
    ...DEFAULT_COLUMNS,
  });

  // Hydrate from localStorage on mount (avoids SSR mismatch)
  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed: StoredColumns = JSON.parse(stored);
        if (parsed.version === STORAGE_VERSION) {
          setColumns(parsed.columns);
        }
        // Version mismatch: discard stored, fall back to defaults
      }
    } catch {
      // Corrupted data: fall back to defaults
    }
  }, [storageKey]);

  const toggleColumn = useCallback(
    (key: ColumnKey) => {
      setColumns((prev) => {
        const next = { ...prev, [key]: !prev[key] };
        localStorage.setItem(
          storageKey,
          JSON.stringify({ version: STORAGE_VERSION, columns: next })
        );
        return next;
      });
    },
    [storageKey]
  );

  const resetColumns = useCallback(() => {
    setColumns({ ...DEFAULT_COLUMNS });
    localStorage.removeItem(storageKey);
  }, [storageKey]);

  const isDefault = useMemo(() => {
    return (Object.keys(DEFAULT_COLUMNS) as ColumnKey[]).every(
      (key) => columns[key] === DEFAULT_COLUMNS[key]
    );
  }, [columns]);

  return { columns, toggleColumn, resetColumns, isDefault };
}
