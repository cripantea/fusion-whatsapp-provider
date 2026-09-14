import { StaggerChildren, StaggerItem, FadeUp } from "@/components/landing/motion";

const API_SNIPPET = `curl -X POST https://fusionwa.io/api/v1/messages/send \\
  -H "X-FusionWA-API-Key: fwa_live_..." \\
  -H "Content-Type: application/json" \\
  -d '{
    "to": "+39 02 1234567",
    "templateName": "hello_world",
    "languageCode": "it"
  }'

# → { "messageId": "wamid.abc123..." }`;

const WEBHOOK_SNIPPET = `// Il tuo endpoint riceve ogni evento in tempo reale
app.post("/webhook/whatsapp", (req, res) => {
  const { type, from, text } = req.body;
  // type: "message" | "status" | "template_status"
  console.log(\`Messaggio da \${from}: \${text}\`);
  res.sendStatus(200);
});`;

const FEATURES = [
  {
    label: "01",
    title: "SDK Widget",
    description:
      "Incolla 3 righe nel tuo software. I tuoi clienti si connettono a WhatsApp Business in autonomia, senza che tu debba gestire OAuth o token Meta.",
    code: `FusionWA.init({
  apiKey: "fwa_live_...",
  customerId: user.id,
  containerId: "widget",
});`,
    lang: "js",
  },
  {
    label: "02",
    title: "API REST",
    description:
      "Invia messaggi template, ricevi notifiche, gestisci le connessioni. Un'API JSON pulita, autenticata con API Key.",
    code: API_SNIPPET,
    lang: "bash",
  },
  {
    label: "03",
    title: "Webhook in tempo reale",
    description:
      "Ogni messaggio e cambio di stato arriva al tuo endpoint in pochi millisecondi. Zero polling, zero storage dei messaggi da parte nostra.",
    code: WEBHOOK_SNIPPET,
    lang: "js",
  },
  {
    label: "04",
    title: "Coexistence",
    description:
      "I tuoi clienti mantengono l'app WhatsApp Business sul telefono. Ricezione da mobile, invio da API — in parallelo, senza conflitti.",
    code: `// Nessuna configurazione aggiuntiva.
// FusionWA gestisce automaticamente
// il heartbeat Coexistence con Meta.
//
// Il numero rimane attivo sia sull'app
// mobile che sulla Cloud API.`,
    lang: "js",
  },
] as const;

function CodeBlock({ code, lang }: { code: string; lang: string }) {
  return (
    <div className="overflow-hidden rounded-lg border bg-zinc-950">
      <div className="flex items-center gap-1.5 border-b border-white/10 px-3 py-2">
        <span className="size-2 rounded-full bg-white/10" />
        <span className="size-2 rounded-full bg-white/10" />
        <span className="size-2 rounded-full bg-white/10" />
        <span className="ml-2 text-xs text-zinc-600">{lang}</span>
      </div>
      <pre className="overflow-x-auto p-4 text-xs leading-relaxed text-zinc-300">
        <code>{code}</code>
      </pre>
    </div>
  );
}

export function FeaturesSection() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-32">
      <FadeUp className="mb-20 max-w-xl">
        <p className="mb-4 text-sm font-medium text-muted-foreground">Funzionalità</p>
        <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Tutto quello che serve.
          <br />
          <span className="text-muted-foreground">Niente di più.</span>
        </h2>
      </FadeUp>

      <StaggerChildren className="grid grid-cols-1 gap-12 lg:grid-cols-2">
        {FEATURES.map((feature) => (
          <StaggerItem key={feature.label} className="flex flex-col gap-5">
            <div className="flex items-start gap-4">
              <span className="mt-0.5 font-mono text-xs text-muted-foreground/50">
                {feature.label}
              </span>
              <div>
                <h3 className="mb-1.5 font-semibold tracking-tight">{feature.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {feature.description}
                </p>
              </div>
            </div>
            <CodeBlock code={feature.code} lang={feature.lang} />
          </StaggerItem>
        ))}
      </StaggerChildren>
    </section>
  );
}
