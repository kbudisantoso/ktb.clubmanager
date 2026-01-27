/**
 * Cross-tab authentication synchronization using BroadcastChannel API.
 *
 * When a user logs out in one tab, all other tabs are notified and
 * redirected to the login page. When a user logs in, other tabs
 * on the login page can navigate to the dashboard.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/API/BroadcastChannel
 */

type AuthEventType = "LOGOUT" | "LOGIN"

interface AuthEvent {
  type: AuthEventType
  timestamp: number
}

type AuthEventHandler = (event: AuthEvent) => void

export class AuthBroadcast {
  private channel: BroadcastChannel | null = null
  private handlers: Map<AuthEventType, AuthEventHandler[]> = new Map()

  constructor() {
    // BroadcastChannel is not available during SSR
    if (typeof window === "undefined" || !("BroadcastChannel" in window)) {
      return
    }

    this.channel = new BroadcastChannel("ktb_auth")

    this.channel.addEventListener(
      "message",
      (event: MessageEvent<AuthEvent>) => {
        const handlers = this.handlers.get(event.data.type) ?? []
        handlers.forEach((handler) => handler(event.data))
      }
    )
  }

  /**
   * Subscribe to authentication events.
   *
   * @example
   * const auth = new AuthBroadcast();
   * auth.on('LOGOUT', () => {
   *   window.location.href = '/login?reason=logout';
   * });
   */
  on(type: AuthEventType, handler: AuthEventHandler): void {
    const handlers = this.handlers.get(type) ?? []
    handlers.push(handler)
    this.handlers.set(type, handlers)
  }

  /**
   * Notify all tabs of a logout event.
   * Call this BEFORE signing out to ensure other tabs receive the message.
   */
  notifyLogout(): void {
    this.channel?.postMessage({
      type: "LOGOUT",
      timestamp: Date.now(),
    } satisfies AuthEvent)
  }

  /**
   * Notify all tabs of a login event.
   * Call this AFTER successful sign-in to update other tabs.
   */
  notifyLogin(): void {
    this.channel?.postMessage({
      type: "LOGIN",
      timestamp: Date.now(),
    } satisfies AuthEvent)
  }

  /**
   * Clear authentication-related localStorage items.
   * Per CONTEXT.md: Clear ktb.auth.*, ktb.user.*, ktb.cache.*
   * Keep ktb.ui.* (theme, sidebar state, preferences)
   */
  clearAuthState(): void {
    if (typeof window === "undefined") return

    const keysToRemove: string[] = []

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (
        key &&
        (key.startsWith("ktb.auth.") ||
          key.startsWith("ktb.user.") ||
          key.startsWith("ktb.cache."))
      ) {
        keysToRemove.push(key)
      }
    }

    keysToRemove.forEach((key) => localStorage.removeItem(key))
  }

  /**
   * Close the broadcast channel.
   * Call this when the component unmounts.
   */
  disconnect(): void {
    this.channel?.close()
    this.channel = null
    this.handlers.clear()
  }
}

/**
 * Singleton instance for app-wide use.
 * Import and use directly in components.
 */
let authBroadcastInstance: AuthBroadcast | null = null

export function getAuthBroadcast(): AuthBroadcast {
  if (!authBroadcastInstance) {
    authBroadcastInstance = new AuthBroadcast()
  }
  return authBroadcastInstance
}
