import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../src/generated/prisma/client";

const DEMO_TENANT_ID = "00000000-0000-0000-0000-000000000001";

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }

  const adapter = new PrismaPg({ connectionString });
  const prisma = new PrismaClient({ adapter });

  const email = process.env.SEED_USER_EMAIL ?? "admin@fusion.local";
  const password = process.env.SEED_USER_PASSWORD ?? "ChangeMe123!";
  const passwordHash = await bcrypt.hash(password, 12);

  const tenant = await prisma.tenant.upsert({
    where: { id: DEMO_TENANT_ID },
    update: {},
    create: {
      id: DEMO_TENANT_ID,
      name: "Demo Workspace",
    },
  });

  const user = await prisma.user.upsert({
    where: { email },
    update: { passwordHash, tenantId: tenant.id },
    create: {
      email,
      passwordHash,
      name: "Demo Admin",
      tenantId: tenant.id,
    },
  });

  console.log(`Seed completato: tenant "${tenant.name}" (${tenant.id}), utente ${user.email}`);

  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
