import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";

// Edge-safe base config (no adapter — Prisma needs the Node runtime).
// Used directly by middleware, and extended with the adapter in lib/auth.ts.
export const authConfig: NextAuthConfig = {
  providers: [Google],
  // Netlify Functions sit behind a proxy — trust its forwarded host header
  // rather than only whatever NEXTAUTH_URL/AUTH_URL was set to.
  trustHost: true,
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.userId = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.userId) {
        session.user.id = token.userId as string;
      }
      return session;
    },
  },
};
