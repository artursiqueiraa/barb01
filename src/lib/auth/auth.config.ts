import type { NextAuthConfig } from "next-auth";

/**
 * Configuração compatível com Edge Runtime (usada pelo middleware).
 * Não pode importar nada que dependa de Node.js nativo (Prisma, argon2 etc.) —
 * ver docs/SECURITY.md. O provider Credentials com acesso ao banco só é
 * adicionado em `config.ts`, que roda em Node.js runtime.
 */
export const authConfig: NextAuthConfig = {
  // Necessário para deploys self-hosted (fora da Vercel), onde o Auth.js não
  // consegue inferir automaticamente que o host é confiável.
  trustHost: true,
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.customerId = user.customerId;
        token.barberId = user.barberId;
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = token.sub as string;
      session.user.role = token.role;
      session.user.customerId = token.customerId;
      session.user.barberId = token.barberId;
      return session;
    },
  },
};
