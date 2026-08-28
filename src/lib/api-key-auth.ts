import { randomBytes } from "node:crypto";

import bcrypt from "bcryptjs";
import { NextRequest } from "next/server";

import { prisma } from "@/lib/prisma";

export const API_KEY_HEADER = "x-fusionwa-api-key";
export const API_SECRET_HEADER = "x-fusionwa-api-secret";

const API_KEY_PREFIX = "fwa_live_";
const BCRYPT_SALT_ROUNDS = 12;

function randomToken(bytes: number): string {
  return randomBytes(bytes).toString("base64url");
}

// apiKey è pensata per essere esposta lato client (SDK widget nel sito della software house):
// identifica pubblicamente l'App ma da sola non basta ad autenticare le chiamate server-to-server.
// rawApiSecret va invece mostrato una sola volta, al momento della generazione: solo il suo hash
// bcrypt viene persistito, esattamente come una password.
export function generateApiCredentials(): { apiKey: string; rawApiSecret: string } {
  return {
    apiKey: `${API_KEY_PREFIX}${randomToken(18)}`,
    rawApiSecret: randomToken(32),
  };
}

export function hashApiSecret(rawApiSecret: string): Promise<string> {
  return bcrypt.hash(rawApiSecret, BCRYPT_SALT_ROUNDS);
}

// Autenticazione "pubblica": valida solo l'apiKey. Adatta agli endpoint richiamati
// direttamente dal widget SDK nel browser del cliente finale (mai operazioni sensibili).
export async function authenticateApp(request: NextRequest) {
  const apiKey = request.headers.get(API_KEY_HEADER);
  if (!apiKey) {
    return null;
  }

  const app = await prisma.app.findUnique({ where: { apiKey } });
  if (!app || app.revokedAt) {
    return null;
  }

  return app;
}

// Autenticazione "server-to-server": richiede anche l'apiSecret in chiaro, mai esposta
// lato client. Obbligatoria per endpoint che inviano messaggi o leggono dati sensibili.
export async function authenticateAppWithSecret(request: NextRequest) {
  const app = await authenticateApp(request);
  if (!app) {
    return null;
  }

  const rawApiSecret = request.headers.get(API_SECRET_HEADER);
  if (!rawApiSecret) {
    return null;
  }

  const isValid = await bcrypt.compare(rawApiSecret, app.apiSecret);
  return isValid ? app : null;
}
