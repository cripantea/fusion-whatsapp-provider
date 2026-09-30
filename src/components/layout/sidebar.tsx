import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { SidebarNav } from "@/components/layout/sidebar-nav";
import { FusionWALogo } from "@/components/fusionwa-logo";

export async function Sidebar() {
  const t = await getTranslations("app");

  return (
    <aside className="hidden w-64 shrink-0 border-r bg-background md:flex md:flex-col">
      <div className="flex h-16 items-center border-b px-4">
        <Link href="/dashboard" className="flex items-center">
          <FusionWALogo />
        </Link>
      </div>
      <div className="flex-1 overflow-y-auto py-4">
        <SidebarNav />
      </div>
    </aside>
  );
}
