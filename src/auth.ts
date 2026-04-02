import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { ensureIndexes, getCollection } from "@/lib/mongodb";
import type { UserDoc, UserRole } from "@/lib/types";

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = String(credentials?.email ?? "").toLowerCase().trim();
        const password = String(credentials?.password ?? "");

        if (!email || !password) {
          return null;
        }

        await ensureIndexes();
        const users = await getCollection<UserDoc>("users");
        const user = await users.findOne({ email });

        if (!user?.passwordHash) {
          return null;
        }

        const passwordValid = await bcrypt.compare(password, user.passwordHash);

        if (!passwordValid) {
          return null;
        }

        return {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role?: UserRole }).role ?? "unassigned";
      }

      return token;
    },
    async session({ session, token }) {
      const id = typeof token.id === "string" ? token.id : "";
      const role =
        token.role === "admin" || token.role === "student" || token.role === "unassigned"
          ? token.role
          : "unassigned";

      if (session.user) {
        session.user.id = id;
        session.user.role = role;
      }

      return session;
    },
  },
});
