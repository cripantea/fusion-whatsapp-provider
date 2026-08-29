"use client";

import { signOut } from "next-auth/react";

import { Button } from "@/components/ui/button";

export function AdminLogoutButton() {
  return (
    <Button variant="outline" onClick={() => signOut({ callbackUrl: "/" })}>
      Esci
    </Button>
  );
}
