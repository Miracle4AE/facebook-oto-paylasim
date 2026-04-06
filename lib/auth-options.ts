import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { authenticateUser } from "@/services/auth/credentials-auth.service";

type AuthorizeUser = {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  role: string;
  mustChangePassword: boolean;
};

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  pages: { signIn: "/login" },
  providers: [
    CredentialsProvider({
      name: "E-posta",
      credentials: {
        email: { label: "E-posta", type: "email" },
        password: { label: "Şifre", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials.password) return null;
        const result = await authenticateUser(credentials.email, credentials.password);
        if (!result.ok) return null;
        const u: AuthorizeUser = {
          id: result.user.id,
          email: result.user.email,
          name: result.user.name,
          image: result.user.image,
          role: result.user.role,
          mustChangePassword: result.user.mustChangePassword,
        };
        return u;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        const u = user as AuthorizeUser;
        token.id = u.id;
        token.email = u.email;
        token.name = u.name;
        token.picture = u.image;
        token.role = u.role;
        token.mustChangePassword = u.mustChangePassword;
      }
      if (trigger === "update" && session) {
        const s = session as { mustChangePassword?: boolean };
        if (typeof s.mustChangePassword === "boolean") {
          token.mustChangePassword = s.mustChangePassword;
        }
      }
      if (!token.role) token.role = "USER";
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.email = token.email as string;
        session.user.name = token.name as string | null;
        session.user.image = (token.picture as string | null) ?? null;
        session.user.role = (token.role as string) ?? "USER";
        session.user.mustChangePassword = Boolean(token.mustChangePassword);
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};
