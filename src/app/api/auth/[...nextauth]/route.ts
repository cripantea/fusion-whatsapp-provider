import { handlers } from "@/auth";

// Evita che Next.js ottimizzi/cachi le pagine HTML di Auth.js (es. sign-out),
// che devono sempre riflettere lo stato della richiesta corrente.
export const dynamic = "force-dynamic";

export const { GET, POST } = handlers;
