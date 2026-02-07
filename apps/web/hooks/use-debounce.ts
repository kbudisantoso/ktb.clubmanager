import { useState, useEffect } from 'react';

/**
 * Hook that debounces a value.
 * Returns the debounced value after the specified delay.
 *
 * @param value - The value to debounce
 * @param delay - Delay in milliseconds (default: 300ms)
 *
 * @example
 * const [searchTerm, setSearchTerm] = useState("")
 * const debouncedSearch = useDebounce(searchTerm, 300)
 *
 * // Use debouncedSearch for API calls
 * useQuery({
 *   queryKey: ["search", debouncedSearch],
 *   queryFn: () => search(debouncedSearch),
 *   enabled: debouncedSearch.length > 2,
 * })
 */
export function useDebounce<T>(value: T, delay = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}
