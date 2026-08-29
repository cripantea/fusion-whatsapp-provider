import { prisma } from "@/lib/prisma";
import { AdminDashboard } from "@/components/admin/admin-dashboard";

export default async function AdminPage() {
  const agencies = await prisma.agency.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      tenants: { include: { whatsappConnections: true } },
      apps: { include: { appUsers: { include: { whatsappConnection: true } } } },
    },
  });

  const rows = agencies.map((agency) => {
    const fromTenants = agency.tenants.flatMap((tenant) =>
      tenant.whatsappConnections.map((connection) => ({
        id: connection.id,
        source: `Workspace: ${tenant.name}`,
        wabaId: connection.wabaId,
        displayPhoneNumber: connection.displayPhoneNumber,
        status: connection.status,
        createdAt: connection.createdAt.toISOString(),
        lastHeartbeatAt: connection.lastHeartbeatAt?.toISOString() ?? null,
      }))
    );

    const fromApps = agency.apps.flatMap((app) =>
      app.appUsers
        .filter((appUser) => appUser.whatsappConnection)
        .map((appUser) => {
          const connection = appUser.whatsappConnection!;
          return {
            id: connection.id,
            source: `${app.name} / cliente "${appUser.externalCustomerId}"`,
            wabaId: connection.wabaId,
            displayPhoneNumber: connection.displayPhoneNumber,
            status: connection.status,
            createdAt: connection.createdAt.toISOString(),
            lastHeartbeatAt: connection.lastHeartbeatAt?.toISOString() ?? null,
          };
        })
    );

    return {
      id: agency.id,
      name: agency.name,
      planType: agency.planType,
      subscriptionStatus: agency.subscriptionStatus,
      maxConnections: agency.maxConnections,
      connections: [...fromTenants, ...fromApps],
    };
  });

  return <AdminDashboard agencies={rows} />;
}
