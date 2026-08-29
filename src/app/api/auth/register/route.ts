import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/auth";
import { isPlanType, PLAN_MAX_CONNECTIONS } from "@/lib/plans";
import { prisma } from "@/lib/prisma";
import { isSuperAdminEmail } from "@/lib/superadmin";

export const runtime = "nodejs";

const PASSWORD_MIN_LENGTH = 8;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_HASH_ROUNDS = 12;
const DEFAULT_TENANT_NAME = "Workspace principale";

type RegisterBody = {
  agencyName?: string;
  email?: string;
  password?: string;
  plan?: string;
};

export async function POST(request: NextRequest) {
  // Modalità Private Engine (B2B): registrazione riservata al superadmin, non
  // pubblica. Riattivare il self-service B2C significa solo rimuovere questo guard.
  const session = await auth();
  if (!session || !isSuperAdminEmail(session.user.email)) {
    return NextResponse.json({ error: "Accesso riservato" }, { status: 403 });
  }

  let body: RegisterBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const agencyName = body.agencyName?.trim();
  const email = body.email?.trim().toLowerCase();
  const password = body.password;
  const requestedPlan = body.plan;

  if (!agencyName) {
    return NextResponse.json({ error: "Nome agenzia obbligatorio" }, { status: 400 });
  }
  if (!email || !EMAIL_PATTERN.test(email)) {
    return NextResponse.json({ error: "Email non valida" }, { status: 400 });
  }
  if (!password || password.length < PASSWORD_MIN_LENGTH) {
    return NextResponse.json(
      { error: `La password deve avere almeno ${PASSWORD_MIN_LENGTH} caratteri` },
      { status: 400 }
    );
  }

  const planType = requestedPlan && isPlanType(requestedPlan) ? requestedPlan : "DEVELOPER";

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    return NextResponse.json({ error: "Email già registrata" }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, PASSWORD_HASH_ROUNDS);

  await prisma.$transaction(async (tx) => {
    const agency = await tx.agency.create({
      data: {
        name: agencyName,
        planType,
        maxConnections: PLAN_MAX_CONNECTIONS[planType],
      },
    });

    await tx.tenant.create({
      data: {
        agencyId: agency.id,
        name: DEFAULT_TENANT_NAME,
      },
    });

    await tx.user.create({
      data: {
        agencyId: agency.id,
        email,
        passwordHash,
        name: agencyName,
      },
    });
  });

  return NextResponse.json({ status: "success" }, { status: 201 });
}
