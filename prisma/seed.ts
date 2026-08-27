import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../src/generated/prisma/client";

const DEMO_AGENCY_ID = "00000000-0000-0000-0000-000000000000";
const DEMO_TENANT_ID = "00000000-0000-0000-0000-000000000001";
const DEMO_TENANT_2_ID = "00000000-0000-0000-0000-000000000002";

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

  const agency = await prisma.agency.upsert({
    where: { id: DEMO_AGENCY_ID },
    update: {},
    create: {
      id: DEMO_AGENCY_ID,
      name: "Demo Agency",
    },
  });

  const tenant = await prisma.tenant.upsert({
    where: { id: DEMO_TENANT_ID },
    update: {},
    create: {
      id: DEMO_TENANT_ID,
      agencyId: agency.id,
      name: "Cliente Demo Uno",
    },
  });

  await prisma.tenant.upsert({
    where: { id: DEMO_TENANT_2_ID },
    update: {},
    create: {
      id: DEMO_TENANT_2_ID,
      agencyId: agency.id,
      name: "Cliente Demo Due",
    },
  });

  const user = await prisma.user.upsert({
    where: { email },
    update: { passwordHash, agencyId: agency.id },
    create: {
      email,
      passwordHash,
      name: "Demo Admin",
      agencyId: agency.id,
    },
  });

  console.log(
    `Seed completato: agency "${agency.name}" (${agency.id}), tenant "${tenant.name}" (${tenant.id}) + 1 workspace aggiuntivo, utente ${user.email}`
  );

  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
