import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      tenantId: string;
    } & DefaultSession["user"];
  }

  interface User {
    tenantId: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    tenantId?: string;
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    tenantId?: string;
  }
}
