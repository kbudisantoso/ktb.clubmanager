import NextAuth from "next-auth"
import { authConfig } from "./auth.config"

export const { auth: middleware } = NextAuth(authConfig)

export const config = {
  // Protect all routes except:
  // - /login (login page)
  // - /register (registration)
  // - /forgot-password (password reset)
  // - /api/auth/* (Auth.js routes)
  // - /impressum, /datenschutz (legal pages)
  // - /_next/* (Next.js internals)
  // - /favicon.ico, static assets
  matcher: [
    "/((?!api/auth|_next/static|_next/image|favicon.ico|login|register|forgot-password|impressum|datenschutz).*)",
  ],
}
