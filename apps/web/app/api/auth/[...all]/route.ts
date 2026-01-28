import { auth } from "@/lib/auth"
import { toNextJsHandler } from "better-auth/next-js"

/**
 * Better Auth API route handler.
 *
 * Handles all auth endpoints:
 * - POST /api/auth/sign-up/email - Register with email/password
 * - POST /api/auth/sign-in/email - Login with email/password
 * - POST /api/auth/sign-in/social - OAuth login
 * - POST /api/auth/sign-out - Logout
 * - GET /api/auth/session - Get current session
 * - And more...
 *
 * @see https://www.better-auth.com/docs/api-reference
 */
export const { GET, POST } = toNextJsHandler(auth)
