/**
 * API client for making requests to the backend.
 *
 * By default, uses relative URLs which are proxied by Next.js rewrites.
 * Set NEXT_PUBLIC_API_URL only if you need direct API access (rare).
 */

export const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

/**
 * Fetch wrapper that prepends the API base URL and includes credentials.
 * With proxy (default): path="/api/foo" -> fetches "/api/foo" (same origin)
 * With direct: path="/api/foo" -> fetches "http://api.example.com/api/foo"
 */
export async function apiFetch(
  path: string,
  init?: RequestInit
): Promise<Response> {
  const url = `${API_URL}${path}`;
  return fetch(url, {
    ...init,
    credentials: "include",
  });
}
