import { AdminUsers } from "@/components/admin/admin-users";
import { prisma } from "@/lib/prisma";

export default async function AdminUsersPage() {
  const agencies = await prisma.agency.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      users: { orderBy: { createdAt: "asc" }, select: { id: true, email: true, name: true, createdAt: true } },
      tenants: { select: { whatsappConnections: { select: { id: true, status: true, billingStatus: true } } } },
      apps: { select: { appUsers: { select: { whatsappConnection: { select: { id: true, status: true, billingStatus: true } } } } } },
      connectionBillings: { orderBy: { createdAt: "desc" }, take: 1, select: { status: true, amount: true, currency: true, createdAt: true } },
    },
  });

  const rows = agencies.map((agency) => {
    const tenantConnections = agency.tenants.flatMap((tenant) => tenant.whatsappConnections);
    const appConnections = agency.apps.flatMap((app) =>
      app.appUsers.flatMap((appUser) => appUser.whatsappConnection ? [appUser.whatsappConnection] : [])
    );
    const connections = [...tenantConnections, ...appConnections];
    const latestPayment = agency.connectionBillings[0];

    return {
      id: agency.id,
      name: agency.name,
      createdAt: agency.createdAt.toISOString(),
      billingStatus: agency.billingStatus,
      billingExempt: agency.billingExempt,
      autoBillingEnabled: agency.autoBillingEnabled,
      hasStripeCustomer: Boolean(agency.stripeCustomerId),
      hasPaymentMethod: Boolean(agency.defaultPaymentMethodId),
      billingSetupCompletedAt: agency.billingSetupCompletedAt?.toISOString() ?? null,
      users: agency.users.map((user) => ({ ...user, createdAt: user.createdAt.toISOString() })),
      connectionCount: connections.length,
      connectedCount: connections.filter((connection) => connection.status === "CONNECTED").length,
      failedPaymentCount: connections.filter((connection) => connection.billingStatus === "PAYMENT_FAILED").length,
      latestPayment: latestPayment ? { ...latestPayment, createdAt: latestPayment.createdAt.toISOString() } : null,
    };
  });

  return <AdminUsers agencies={rows} />;
}
