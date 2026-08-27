import Link from "next/link";
import { MessageSquareText } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { SidebarNav } from "@/components/layout/sidebar-nav";
import { WorkspaceSwitcherRow } from "@/components/layout/workspace-switcher-row";

type Tenant = { id: string; name: string };

export async function Sidebar({
  tenants,
  activeTenantId,
}: {
  tenants: Tenant[];
  activeTenantId: string;
}) {
  const t = await getTranslations("app");

  return (
    <aside className="hidden w-64 shrink-0 border-r bg-background md:flex md:flex-col">
      <div className="flex h-16 items-center gap-2 border-b px-4">
        <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
          <MessageSquareText className="size-5 text-primary" />
          <span>{t("name")}</span>
        </Link>
      </div>
      <WorkspaceSwitcherRow tenants={tenants} activeTenantId={activeTenantId} />
      <div className="flex-1 overflow-y-auto py-4">
        <SidebarNav />
      </div>
    </aside>
  );
}
