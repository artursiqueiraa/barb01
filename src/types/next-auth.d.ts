import type { Role } from "@/lib/permissions/matrix";
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface User {
    role: Role;
    customerId?: string | null;
    barberId?: string | null;
  }

  interface Session {
    user: {
      id: string;
      role: Role;
      customerId?: string | null;
      barberId?: string | null;
    } & DefaultSession["user"];
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    role: Role;
    customerId?: string | null;
    barberId?: string | null;
  }
}
