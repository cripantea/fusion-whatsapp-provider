"use client";

import { useTransition } from "react";
import { Check, ChevronsUpDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { switchWorkspaceAction } from "@/actions/workspace";

type Tenant = { id: string; name: string };

export function WorkspaceSwitcher({
  tenants,
  activeTenantId,
  switchLabel,
}: {
  tenants: Tenant[];
  activeTenantId: string;
  switchLabel: string;
}) {
  const [isPending, startTransition] = useTransition();
  const activeTenant = tenants.find((tenant) => tenant.id === activeTenantId);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="outline"
            className="min-w-0 flex-1 justify-between gap-2"
          />
        }
      >
        <span className="truncate">{activeTenant?.name ?? switchLabel}</span>
        <ChevronsUpDown
          className={`size-4 shrink-0 opacity-60 ${isPending ? "animate-pulse" : ""}`}
        />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuGroup>
          <DropdownMenuLabel>{switchLabel}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {tenants.map((tenant) => (
            <DropdownMenuItem
              key={tenant.id}
              onClick={() => startTransition(() => switchWorkspaceAction(tenant.id))}
            >
              <span className="flex-1 truncate">{tenant.name}</span>
              {tenant.id === activeTenantId && <Check className="size-4" />}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
