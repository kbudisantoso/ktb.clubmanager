import NextAuth from "next-auth"
import type { Adapter, AdapterAccount } from "next-auth/adapters"
import { prisma } from "@/lib/prisma"
import { authConfig } from "./auth.config"

/**
 * Custom Prisma adapter that maps OAuthAccount model to Auth.js Account interface.
 * Required because our schema uses "OAuthAccount" to avoid conflict with
 * Chart of Accounts domain model.
 */
function CustomPrismaAdapter(): Adapter {
  return {
    createUser: async (data) => {
      const { id, ...rest } = data as { id?: string } & typeof data
      return prisma.user.create({
        data: rest,
      })
    },

    getUser: (id) => prisma.user.findUnique({ where: { id } }),

    getUserByEmail: (email) => prisma.user.findUnique({ where: { email } }),

    async getUserByAccount({ providerAccountId, provider }) {
      const account = await prisma.oAuthAccount.findUnique({
        where: {
          provider_providerAccountId: { provider, providerAccountId },
        },
        include: { user: true },
      })
      return account?.user ?? null
    },

    updateUser: ({ id, ...data }) =>
      prisma.user.update({ where: { id }, data }),

    deleteUser: (id) => prisma.user.delete({ where: { id } }),

    linkAccount: async (data) => {
      await prisma.oAuthAccount.create({ data })
    },

    unlinkAccount: async ({ providerAccountId, provider }) => {
      await prisma.oAuthAccount.delete({
        where: {
          provider_providerAccountId: { provider, providerAccountId },
        },
      })
    },

    async getSessionAndUser(sessionToken) {
      const result = await prisma.session.findUnique({
        where: { sessionToken },
        include: { user: true },
      })
      if (!result) return null
      const { user, ...session } = result
      return { user, session }
    },

    createSession: (data) => prisma.session.create({ data }),

    updateSession: ({ sessionToken, ...data }) =>
      prisma.session.update({ where: { sessionToken }, data }),

    deleteSession: (sessionToken) =>
      prisma.session.delete({ where: { sessionToken } }),

    async createVerificationToken(data) {
      const token = await prisma.verificationToken.create({ data })
      return token
    },

    async useVerificationToken({ identifier, token }) {
      try {
        return await prisma.verificationToken.delete({
          where: { identifier_token: { identifier, token } },
        })
      } catch {
        // Token already used/deleted
        return null
      }
    },

    async getAccount(providerAccountId, provider) {
      const account = await prisma.oAuthAccount.findFirst({
        where: { providerAccountId, provider },
      })
      if (!account) return null
      return account as AdapterAccount
    },
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,

  adapter: CustomPrismaAdapter(),

  providers: [
    // GoTrue as single OIDC provider
    // Handles all auth: email/password, magic link, Google OAuth
    {
      id: "gotrue",
      name: "Login",
      type: "oidc",
      issuer: process.env.GOTRUE_URL,
      clientId: process.env.GOTRUE_CLIENT_ID || "gotrue",
      clientSecret: process.env.GOTRUE_JWT_SECRET,
      authorization: {
        params: {
          scope: "openid profile email",
        },
      },
      profile(profile) {
        return {
          id: profile.sub,
          email: profile.email,
          name: profile.name || profile.user_metadata?.name,
          image: profile.picture || profile.user_metadata?.avatar_url,
          emailVerified: profile.email_verified ? new Date() : null,
        }
      },
    },
  ],

  session: {
    strategy: "database",
    maxAge: 30 * 24 * 60 * 60, // 30 days absolute maximum
    updateAge: 14 * 24 * 60 * 60, // 14 days sliding idle timeout
  },

  callbacks: {
    ...authConfig.callbacks,

    async redirect({ url, baseUrl }) {
      // Preserve return URL through OAuth flow
      if (url.startsWith("/")) return `${baseUrl}${url}`
      if (new URL(url).origin === baseUrl) return url
      return baseUrl
    },

    async signIn({ user, account, profile }) {
      // Link or create user in app database with externalId
      if (account && profile) {
        const externalId = profile.sub as string

        // Check if user exists by externalId
        let appUser = await prisma.user.findUnique({
          where: { externalId },
        })

        if (!appUser) {
          // First sign-in - create app user with GoTrue link
          // emailVerified comes from the profile returned by the OIDC provider
          const emailVerified =
            "emailVerified" in user ? (user.emailVerified as Date | null) : null
          appUser = await prisma.user.create({
            data: {
              externalId,
              email: user.email!,
              name: user.name,
              image: user.image,
              emailVerified,
            },
          })
        } else {
          // Update profile data from provider
          await prisma.user.update({
            where: { externalId },
            data: {
              name: user.name ?? appUser.name,
              image: user.image ?? appUser.image,
            },
          })
        }

        // Use app user ID for session
        user.id = appUser.id
      }
      return true
    },

    async session({ session, user }) {
      // Add user ID to session for client access
      if (session.user) {
        session.user.id = user.id
      }
      return session
    },
  },
})
