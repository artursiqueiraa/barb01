import NextAuth from "next-auth";
import { NextResponse } from "next/server";

import { authConfig } from "@/lib/auth/auth.config";

// Instância leve, compatível com Edge Runtime — não importa Prisma nem argon2
// (que dependem de Node.js nativo). Ver src/lib/auth/auth.config.ts.
const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const session = req.auth;

  const isAdminArea = pathname.startsWith("/admin");
  const isProfileArea = pathname.startsWith("/perfil");

  if (!session?.user && (isAdminArea || isProfileArea)) {
    const loginUrl = new URL("/login", req.nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Checagem grosseira apenas: CLIENTE não entra na área administrativa.
  // Permissão fina por recurso é sempre validada no servidor (lib/permissions).
  if (isAdminArea && session?.user?.role === "CLIENTE") {
    return NextResponse.redirect(new URL("/perfil", req.nextUrl.origin));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/admin/:path*", "/perfil/:path*"],
};
