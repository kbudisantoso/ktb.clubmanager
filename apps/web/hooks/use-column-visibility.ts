'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';

// ============================================================================
// Generic column visibility configuration
// ============================================================================

/**
 * Configuration for the useColumnVisibility hook.
 * Each domain (members, users, etc.) provides its own config.
 */
export interface ColumnVisibilityConfig<K extends string> {
  /** Prefix for localStorage key (e.g., 'member-columns') */
  storagePrefix: string;
  /** Default visibility state for each column */
  defaultColumns: Record<K, boolean>;
  /** Default display order */
  defaultOrder: K[];
  /** Storage version for migration support */
  storageVersion: number;
}

// ============================================================================
// Member-specific constants (backward compatibility)
// ============================================================================

/**
 * Storage format version for migration support.
 * Increment when changing the stored structure to auto-discard
 * incompatible stored preferences.
 *
 * v1: { columns }
 * v2: { columns, order } (8 toggleable columns)
 * v3: { columns, order } (added 'name' as locked column)
 */
export const MEMBER_STORAGE_VERSION = 3;

/**
 * Default column visibility for the member list table.
 * Notes are hidden by default to reduce visual noise.
 * Name is always visible (locked).
 */
export const DEFAULT_COLUMNS = {
  name: true,
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

/** Default column display order */
export const DEFAULT_COLUMN_ORDER: ColumnKey[] = [
  'name',
  'memberNumber',
  'status',
  'email',
  'phone',
  'household',
  'membershipType',
  'joinDate',
  'notes',
];

/** Pre-built config for member table column visibility */
export const MEMBER_COLUMN_CONFIG: ColumnVisibilityConfig<ColumnKey> = {
  storagePrefix: 'member-columns',
  defaultColumns: DEFAULT_COLUMNS,
  defaultOrder: DEFAULT_COLUMN_ORDER,
  storageVersion: MEMBER_STORAGE_VERSION,
};

// ============================================================================
// Generic hook
// ============================================================================

interface StoredColumns<K extends string> {
  version: number;
  columns: Record<K, boolean>;
  order: K[];
}

interface ColumnVisibilityReturn<K extends string> {
  columns: Record<K, boolean>;
  order: K[];
  toggleColumn: (key: K) => void;
  reorderColumns: (newOrder: K[]) => void;
  resetColumns: () => void;
  isDefault: boolean;
}

/**
 * Manages column visibility and order preferences with localStorage persistence per club.
 *
 * Handles SSR safely: initializes with defaults, hydrates from localStorage
 * in useEffect to avoid hydration mismatches.
 *
 * @param clubSlug - Club identifier for per-club preference storage
 * @param config - Column visibility configuration (defaults to MEMBER_COLUMN_CONFIG)
 */
export function useColumnVisibility(clubSlug: string): ColumnVisibilityReturn<ColumnKey>;
export function useColumnVisibility<K extends string>(
  clubSlug: string,
  config: ColumnVisibilityConfig<K>
): ColumnVisibilityReturn<K>;
export function useColumnVisibility<K extends string>(
  clubSlug: string,
  config?: ColumnVisibilityConfig<K>
) {
  const resolvedConfig = (config ?? MEMBER_COLUMN_CONFIG) as ColumnVisibilityConfig<K>;
  const { storagePrefix, defaultColumns, defaultOrder, storageVersion } = resolvedConfig;
  const storageKey = `${storagePrefix}:${clubSlug}`;

  const [columns, setColumns] = useState<Record<K, boolean>>({
    ...defaultColumns,
  });
  const [order, setOrder] = useState<K[]>([...defaultOrder]);

  // Keep a ref to order so toggleColumn can read the latest value without re-creating
  const orderRef = useRef(order);
  orderRef.current = order;

  // Hydrate from localStorage on mount (avoids SSR mismatch)
  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed: StoredColumns<K> = JSON.parse(stored);
        if (parsed.version === storageVersion) {
          setColumns(parsed.columns);
          if (Array.isArray(parsed.order) && parsed.order.length === defaultOrder.length) {
            setOrder(parsed.order);
          }
        }
        // Version mismatch: discard stored, fall back to defaults
      }
    } catch {
      // Corrupted data: fall back to defaults
    }
  }, [storageKey, storageVersion, defaultOrder.length]);

  const persist = useCallback(
    (cols: Record<K, boolean>, ord: K[]) => {
      localStorage.setItem(
        storageKey,
        JSON.stringify({ version: storageVersion, columns: cols, order: ord })
      );
    },
    [storageKey, storageVersion]
  );

  const toggleColumn = useCallback(
    (key: K) => {
      setColumns((prev) => {
        const next = { ...prev, [key]: !prev[key] };
        persist(next, orderRef.current);
        return next;
      });
    },
    [persist]
  );

  const reorderColumns = useCallback(
    (newOrder: K[]) => {
      setOrder(newOrder);
      persist(columns, newOrder);
    },
    [columns, persist]
  );

  const resetColumns = useCallback(() => {
    setColumns({ ...defaultColumns });
    setOrder([...defaultOrder]);
    localStorage.removeItem(storageKey);
  }, [storageKey, defaultColumns, defaultOrder]);

  const isDefault = useMemo(() => {
    const visibilityMatch = (Object.keys(defaultColumns) as K[]).every(
      (key) => columns[key] === defaultColumns[key]
    );
    const orderMatch = order.every((key, idx) => key === defaultOrder[idx]);
    return visibilityMatch && orderMatch;
  }, [columns, order, defaultColumns, defaultOrder]);

  return { columns, order, toggleColumn, reorderColumns, resetColumns, isDefault };
}
