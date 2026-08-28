import { NextResponse } from "next/server";

import { API_KEY_HEADER, API_SECRET_HEADER } from "@/lib/api-key-auth";

// Gli endpoint /api/v1/widget/* e la variante SDK del callback Facebook sono richiamati
// da fetch() cross-origin, dal sito della software house terza che integra il widget:
// non c'è modo di conoscere in anticipo quel dominio, e l'autenticazione avviene via
// apiKey (mai via cookie di sessione), quindi permettere qualunque origin è sicuro.
export function withCors(response: NextResponse): NextResponse {
  response.headers.set("Access-Control-Allow-Origin", "*");
  response.headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  response.headers.set(
    "Access-Control-Allow-Headers",
    `Content-Type, ${API_KEY_HEADER}, ${API_SECRET_HEADER}`
  );
  return response;
}

export function corsPreflight(): NextResponse {
  return withCors(new NextResponse(null, { status: 204 }));
}
