'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';

/**
 * Storage format version for migration support.
 * Increment when changing the stored structure to auto-discard
 * incompatible stored preferences.
 *
 * v1: { columns }
 * v2: { columns, order } (8 toggleable columns)
 * v3: { columns, order } (added 'name' as locked column)
 */
const STORAGE_VERSION = 3;

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

interface StoredColumns {
  version: number;
  columns: Record<ColumnKey, boolean>;
  order: ColumnKey[];
}

/**
 * Manages column visibility and order preferences with localStorage persistence per club.
 *
 * Handles SSR safely: initializes with defaults, hydrates from localStorage
 * in useEffect to avoid hydration mismatches.
 *
 * @param clubSlug - Club identifier for per-club preference storage
 */
export function useColumnVisibility(clubSlug: string) {
  const storageKey = `member-columns:${clubSlug}`;

  const [columns, setColumns] = useState<Record<ColumnKey, boolean>>({
    ...DEFAULT_COLUMNS,
  });
  const [order, setOrder] = useState<ColumnKey[]>([...DEFAULT_COLUMN_ORDER]);

  // Keep a ref to order so toggleColumn can read the latest value without re-creating
  const orderRef = useRef(order);
  orderRef.current = order;

  // Hydrate from localStorage on mount (avoids SSR mismatch)
  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed: StoredColumns = JSON.parse(stored);
        if (parsed.version === STORAGE_VERSION) {
          setColumns(parsed.columns);
          if (Array.isArray(parsed.order) && parsed.order.length === DEFAULT_COLUMN_ORDER.length) {
            setOrder(parsed.order);
          }
        }
        // Version mismatch: discard stored, fall back to defaults
      }
    } catch {
      // Corrupted data: fall back to defaults
    }
  }, [storageKey]);

  const persist = useCallback(
    (cols: Record<ColumnKey, boolean>, ord: ColumnKey[]) => {
      localStorage.setItem(
        storageKey,
        JSON.stringify({ version: STORAGE_VERSION, columns: cols, order: ord })
      );
    },
    [storageKey]
  );

  const toggleColumn = useCallback(
    (key: ColumnKey) => {
      setColumns((prev) => {
        const next = { ...prev, [key]: !prev[key] };
        persist(next, orderRef.current);
        return next;
      });
    },
    [persist]
  );

  const reorderColumns = useCallback(
    (newOrder: ColumnKey[]) => {
      setOrder(newOrder);
      persist(columns, newOrder);
    },
    [columns, persist]
  );

  const resetColumns = useCallback(() => {
    setColumns({ ...DEFAULT_COLUMNS });
    setOrder([...DEFAULT_COLUMN_ORDER]);
    localStorage.removeItem(storageKey);
  }, [storageKey]);

  const isDefault = useMemo(() => {
    const visibilityMatch = (Object.keys(DEFAULT_COLUMNS) as ColumnKey[]).every(
      (key) => columns[key] === DEFAULT_COLUMNS[key]
    );
    const orderMatch = order.every((key, idx) => key === DEFAULT_COLUMN_ORDER[idx]);
    return visibilityMatch && orderMatch;
  }, [columns, order]);

  return { columns, order, toggleColumn, reorderColumns, resetColumns, isDefault };
}
