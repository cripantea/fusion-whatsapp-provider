import Link from "next/link";
import { Menu, MessageSquareText } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { LogoutMenuItem } from "@/components/layout/logout-menu-item";
import { WorkspaceSwitcherRow } from "@/components/layout/workspace-switcher-row";
import { ThemeToggle } from "@/components/theme-toggle";
import { auth } from "@/auth";
import { isSuperAdminEmail } from "@/lib/superadmin";

type Tenant = { id: string; name: string };

function getInitials(label: string): string {
  return label.slice(0, 2).toUpperCase();
}

export async function Header({
  tenants,
  activeTenantId,
}: {
  tenants: Tenant[];
  activeTenantId: string;
}) {
  const t = await getTranslations();
  const session = await auth();
  const accountLabel = session?.user?.name ?? session?.user?.email ?? "";
  const isSuperAdmin = isSuperAdminEmail(session?.user?.email);

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <Sheet>
        <SheetTrigger
          render={<Button variant="ghost" size="icon" className="md:hidden" />}
        >
          <Menu className="size-5" />
          <span className="sr-only">{t("header.openMenu")}</span>
        </SheetTrigger>
        <SheetContent side="left" className="w-64 p-0">
          <SheetHeader className="h-16 justify-center border-b px-4">
            <SheetTitle
              render={
                <Link
                  href="/dashboard"
                  className="flex items-center gap-2 font-semibold"
                />
              }
            >
              <MessageSquareText className="size-5 text-primary" />
              <span>{t("app.name")}</span>
            </SheetTitle>
          </SheetHeader>
          <WorkspaceSwitcherRow tenants={tenants} activeTenantId={activeTenantId} />
          <div className="py-4">
            <SidebarNav />
          </div>
        </SheetContent>
      </Sheet>

      <div className="flex-1" />

      <ThemeToggle label={t("header.toggleTheme")} />

      <DropdownMenu>
        <DropdownMenuTrigger render={<Button variant="ghost" className="gap-2 px-2" />}>
          <Avatar className="size-8">
            <AvatarFallback>{getInitials(accountLabel || "FW")}</AvatarFallback>
          </Avatar>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuGroup>
            <DropdownMenuLabel>{accountLabel || t("header.account")}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem render={<Link href="/impostazioni" />}>
              {t("header.settings")}
            </DropdownMenuItem>
            {isSuperAdmin && (
              <DropdownMenuItem render={<Link href="/admin" />}>Admin</DropdownMenuItem>
            )}
            <LogoutMenuItem label={t("header.logout")} />
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
