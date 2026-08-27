import { getTranslations } from "next-intl/server";

import { WorkspaceSwitcher } from "@/components/layout/workspace-switcher";
import { CreateWorkspaceButton } from "@/components/layout/create-workspace-button";

type Tenant = { id: string; name: string };

export async function WorkspaceSwitcherRow({
  tenants,
  activeTenantId,
}: {
  tenants: Tenant[];
  activeTenantId: string;
}) {
  const t = await getTranslations("workspace");

  return (
    <div className="flex items-center gap-1 border-b p-2">
      <WorkspaceSwitcher
        tenants={tenants}
        activeTenantId={activeTenantId}
        switchLabel={t("switcherLabel")}
      />
      <CreateWorkspaceButton
        title={t("newWorkspace")}
        description={t("newWorkspaceDescription")}
        nameLabel={t("nameLabel")}
        namePlaceholder={t("namePlaceholder")}
        createLabel={t("create")}
      />
    </div>
  );
}
