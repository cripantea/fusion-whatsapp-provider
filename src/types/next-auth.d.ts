import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      agencyId: string;
    } & DefaultSession["user"];
  }

  interface User {
    agencyId: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    agencyId?: string;
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    agencyId?: string;
  }
}
