"use client"

import { useClubStore, type TierFeatures } from "./club-store"

interface MyPermissionsResponse {
  permissions: string[]
  features: TierFeatures
  roles: string[]
}

/**
 * Fetch permissions for a club and update the Zustand store.
 * Called when navigating to a club context.
 *
 * @param clubSlug - The club slug to fetch permissions for
 * @returns Promise that resolves when permissions are stored
 */
export async function fetchAndStorePermissions(clubSlug: string): Promise<void> {
  try {
    const response = await fetch(`/api/clubs/${clubSlug}/my-permissions`)

    if (!response.ok) {
      console.error("Failed to fetch permissions:", response.status)
      return
    }

    const data: MyPermissionsResponse = await response.json()

    // Update the store with permissions
    const { setClubPermissions } = useClubStore.getState()
    setClubPermissions(clubSlug, data.permissions, data.features)
  } catch (error) {
    console.error("Error fetching permissions:", error)
  }
}

/**
 * Hook-style function for React components that need to trigger permission fetch.
 * Returns a function that can be called to refresh permissions.
 */
export function useRefreshPermissions() {
  return async (clubSlug: string) => {
    await fetchAndStorePermissions(clubSlug)
  }
}
