"use client";

import { signOut } from "next-auth/react";

import { DropdownMenuItem } from "@/components/ui/dropdown-menu";

export function LogoutMenuItem({ label }: { label: string }) {
  return (
    <DropdownMenuItem onClick={() => signOut({ callbackUrl: "/login" })}>
      {label}
    </DropdownMenuItem>
  );
}
