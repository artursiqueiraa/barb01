import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

import { prisma } from "@/lib/db/prisma";
import { logger } from "@/lib/logger";
import { loginSchema } from "@/schemas/auth";

import { authConfig } from "./auth.config";
import { verifyPassword } from "./password";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: { label: "E-mail", type: "email" },
        password: { label: "Senha", type: "password" },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;
        const user = await prisma.user.findUnique({ where: { email } });

        if (!user || !user.active) {
          logger.warn("login.failed", { email, reason: "user_not_found_or_inactive" });
          return null;
        }

        const valid = await verifyPassword(user.passwordHash, password);
        if (!valid) {
          logger.warn("login.failed", { email, reason: "invalid_password" });
          return null;
        }

        logger.info("login.success", { userId: user.id, role: user.role });

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          customerId: user.customerId,
          barberId: user.barberId,
        };
      },
    }),
  ],
});
