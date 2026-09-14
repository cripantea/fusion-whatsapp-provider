import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Documentazione · FusionWA",
  description: "Guide di integrazione SDK e API REST per FusionWA.",
};

function CodeBlock({ code, lang = "bash" }: { code: string; lang?: string }) {
  return (
    <div className="my-4 overflow-hidden rounded-lg border bg-zinc-950">
      <div className="flex items-center gap-1.5 border-b border-white/10 px-4 py-2">
        <span className="size-2 rounded-full bg-white/10" />
        <span className="size-2 rounded-full bg-white/10" />
        <span className="size-2 rounded-full bg-white/10" />
        <span className="ml-2 text-xs text-zinc-600">{lang}</span>
      </div>
      <pre className="overflow-x-auto p-4 text-sm leading-relaxed text-zinc-300">
        <code>{code}</code>
      </pre>
    </div>
  );
}

function Section({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <section id={id} className="mb-16 scroll-mt-24">
      {children}
    </section>
  );
}

function H2({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-4 mt-2 text-xl font-semibold tracking-tight">{children}</h2>
  );
}

function H3({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mb-3 mt-6 font-semibold text-base">{children}</h3>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return <p className="mb-3 text-sm leading-relaxed text-muted-foreground">{children}</p>;
}

const NAV = [
  { href: "#overview", label: "Panoramica" },
  { href: "#sdk", label: "SDK Widget" },
  { href: "#rest-api", label: "API REST" },
  { href: "#webhooks", label: "Webhook" },
  { href: "#templates", label: "Template" },
  { href: "#ai-guide", label: "Per Claude / Codex" },
];

export default function DocsPage() {
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-6 px-6">
          <Link href="/" className="text-sm font-semibold tracking-tight">
            FusionWA
          </Link>
          <span className="text-muted-foreground">/</span>
          <span className="text-sm text-muted-foreground">Documentazione</span>
        </div>
      </header>

      <div className="mx-auto flex max-w-6xl gap-12 px-6 py-12">
        {/* Sidebar */}
        <aside className="hidden w-48 shrink-0 lg:block">
          <div className="sticky top-24 flex flex-col gap-1">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                {item.label}
              </Link>
            ))}
            <div className="mt-4 border-t pt-4">
              <Link
                href="/llms.txt"
                className="rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                target="_blank"
              >
                llms.txt ↗
              </Link>
            </div>
          </div>
        </aside>

        {/* Content */}
        <main className="min-w-0 flex-1">
          <Section id="overview">
            <p className="mb-2 text-xs font-medium uppercase tracking-widest text-muted-foreground">
              Documentazione
            </p>
            <h1 className="mb-4 text-3xl font-semibold tracking-tight">
              Inizia con FusionWA
            </h1>
            <P>
              FusionWA fornisce l&apos;infrastruttura WhatsApp Business Cloud API per software house e agenzie.
              Due modalità di integrazione: <strong>SDK Widget</strong> (i clienti finali si connettono in autonomia)
              e <strong>API REST</strong> (invio messaggi e gestione connessioni lato server).
            </P>
            <P>
              Tutto parte da un&apos;<strong>API Key</strong> che ottieni dalla sezione{" "}
              <Link href="/applicazioni" className="underline">Applicazioni</Link> della dashboard.
            </P>

            <div className="my-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {[
                { title: "SDK Widget", desc: "I clienti si connettono da soli. 3 righe di HTML.", href: "#sdk" },
                { title: "API REST", desc: "Invia messaggi e gestisci connessioni dal tuo backend.", href: "#rest-api" },
                { title: "Webhook", desc: "Ricevi messaggi e aggiornamenti di stato in tempo reale.", href: "#webhooks" },
                { title: "Per AI tools", desc: "Copia la guida per Claude, Codex o Cursor.", href: "#ai-guide" },
              ].map((card) => (
                <Link key={card.href} href={card.href} className="group rounded-lg border p-4 transition-colors hover:border-foreground/20 hover:bg-accent/50">
                  <p className="mb-1 text-sm font-medium group-hover:text-foreground">{card.title}</p>
                  <p className="text-xs text-muted-foreground">{card.desc}</p>
                </Link>
              ))}
            </div>
          </Section>

          <Section id="sdk">
            <H2>SDK Widget</H2>
            <P>
              Il modo più veloce per integrare FusionWA. Incolla il codice nel tuo software:
              il widget gestisce autonomamente il flusso OAuth con Meta e la connessione WhatsApp del cliente.
            </P>

            <H3>1. Aggiungi lo script</H3>
            <CodeBlock lang="html" code={`<script src="https://fusionwa.io/sdk/v1.js"></script>`} />

            <H3>2. Inserisci il container</H3>
            <CodeBlock lang="html" code={`<div id="fusionwa-widget"></div>`} />

            <H3>3. Inizializza</H3>
            <CodeBlock lang="javascript" code={`FusionWA.init({
  apiKey: "fwa_live_abc123",     // la tua API Key dalla dashboard
  customerId: currentUser.id,    // ID univoco del tuo cliente (stringa)
  containerId: "fusionwa-widget", // id del div sopra
});`} />

            <H3>Cosa fa il widget</H3>
            <P>
              Il widget mostra un pulsante &quot;Connetti WhatsApp&quot;. Quando il cliente
              lo clicca si apre il flusso Embedded Signup di Meta, che guida il cliente a
              connettere il proprio numero WhatsApp Business. Il token viene salvato in modo sicuro
              su FusionWA. Dopo la connessione, il widget mostra lo stato &quot;WhatsApp Collegato&quot;.
            </P>
            <P>
              <strong>Coexistence inclusa:</strong> i numeri già attivi sull&apos;app WhatsApp Business
              mobile continuano a funzionare normalmente.
            </P>
          </Section>

          <Section id="rest-api">
            <H2>API REST</H2>
            <P>
              Tutte le chiamate richiedono l&apos;header <code className="rounded bg-muted px-1.5 py-0.5 text-xs">X-FusionWA-API-Key: fwa_live_...</code>.
            </P>
            <P>
              Base URL: <code className="rounded bg-muted px-1.5 py-0.5 text-xs">https://fusionwa.io/api/v1</code>
            </P>

            <H3>Invia un messaggio template</H3>
            <CodeBlock lang="bash" code={`POST /api/v1/messages/send

{
  "to": "+39 02 1234567",
  "templateName": "hello_world",
  "languageCode": "it",
  "components": []
}

# Risposta
{ "messageId": "wamid.abc123..." }`} />

            <H3>Stato di una connessione</H3>
            <CodeBlock lang="bash" code={`GET /api/v1/widget/status?customerId=user_123

# Risposta
{
  "status": "CONNECTED",          // INACTIVE | CONNECTED
  "phoneNumber": "+39 02 1234567"
}`} />

            <H3>Attiva connessione (flusso backend)</H3>
            <CodeBlock lang="bash" code={`POST /api/v1/widget/activate

{
  "customerId": "user_123"
}`} />

            <H3>Lista template approvati</H3>
            <CodeBlock lang="bash" code={`GET /api/v1/templates?customerId=user_123

# Risposta
[
  {
    "name": "hello_world",
    "status": "APPROVED",
    "language": "it",
    "category": "UTILITY"
  }
]`} />
          </Section>

          <Section id="webhooks">
            <H2>Webhook</H2>
            <P>
              FusionWA inoltra ogni evento WhatsApp al tuo endpoint in tempo reale.
              Configura l&apos;URL webhook nella sezione Applicazioni della dashboard.
            </P>
            <P>
              <strong>Zero storage:</strong> i payload vengono solo inoltrati, mai salvati.
            </P>

            <H3>Struttura del payload</H3>
            <CodeBlock lang="json" code={`{
  "type": "message",
  "from": "+39 02 1234567",
  "customerId": "user_123",
  "timestamp": "2025-01-15T10:30:00Z",
  "message": {
    "id": "wamid.abc...",
    "type": "text",
    "text": { "body": "Ciao!" }
  }
}`} />

            <H3>Tipi di evento</H3>
            <div className="my-4 overflow-hidden rounded-lg border">
              {[
                { type: "message", desc: "Messaggio ricevuto dal cliente" },
                { type: "status", desc: "Aggiornamento stato messaggio (sent / delivered / read)" },
                { type: "template_status", desc: "Cambio stato di un template Meta" },
              ].map((row) => (
                <div key={row.type} className="flex items-center gap-4 border-b p-3 last:border-0">
                  <code className="w-36 shrink-0 rounded bg-muted px-2 py-0.5 text-xs">{row.type}</code>
                  <span className="text-sm text-muted-foreground">{row.desc}</span>
                </div>
              ))}
            </div>

            <H3>Ricevi gli eventi nel tuo backend</H3>
            <CodeBlock lang="javascript" code={`// Express
app.post("/webhook/whatsapp", express.json(), (req, res) => {
  const { type, from, customerId, message } = req.body;

  if (type === "message" && message?.type === "text") {
    console.log(\`[\${customerId}] \${from}: \${message.text.body}\`);
    // gestisci il messaggio...
  }

  res.sendStatus(200); // risposta 200 entro 10s o il webhook viene ritentato
});`} />
          </Section>

          <Section id="templates">
            <H2>Template WhatsApp</H2>
            <P>
              I template permettono di inviare messaggi proattivi ai clienti (notifiche, reminder, ecc.).
              Devono essere approvati da Meta prima dell&apos;uso.
            </P>

            <H3>Crea e sottometti un template</H3>
            <CodeBlock lang="bash" code={`POST /api/v1/templates

{
  "customerId": "user_123",
  "name": "conferma_ordine",
  "category": "UTILITY",
  "language": "it",
  "components": [
    {
      "type": "BODY",
      "text": "Il tuo ordine {{1}} è stato confermato. Consegna prevista: {{2}}."
    }
  ]
}`} />

            <P>
              Il template viene inviato a Meta per revisione. Lo stato diventa{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">APPROVED</code> in genere entro poche ore.
              Ricevi notifica via webhook quando cambia stato.
            </P>
          </Section>

          <Section id="ai-guide">
            <H2>Per Claude / Codex / Cursor</H2>
            <P>
              Se stai usando un AI coding assistant per integrare FusionWA, aggiungi
              questo blocco come contesto iniziale al tuo prompt:
            </P>

            <CodeBlock lang="markdown" code={`# FusionWA — Guida integrazione

## SDK Widget (metodo consigliato)
1. Script: <script src="https://fusionwa.io/sdk/v1.js"></script>
2. Container: <div id="fusionwa-widget"></div>
3. Init: FusionWA.init({ apiKey, customerId, containerId })

## API REST
Base URL: https://fusionwa.io/api/v1
Auth: header X-FusionWA-API-Key: fwa_live_...

POST /api/v1/messages/send
  body: { to, templateName, languageCode, components[] }
  returns: { messageId }

GET /api/v1/widget/status?customerId=
  returns: { status: "INACTIVE"|"CONNECTED", phoneNumber }

GET /api/v1/templates?customerId=
  returns: [{ name, status, language, category }]

## Webhook
- Configura URL in dashboard → Applicazioni → Webhook
- Payload: { type, from, customerId, timestamp, message }
- Rispondere 200 entro 10s o il webhook viene ritentato
- type: "message" | "status" | "template_status"

## Autenticazione
- API Key: header X-FusionWA-API-Key (server-to-server)
- SDK: apiKey esposta lato client (solo lookup, non autentica chiamate server)
- customerId: ID del cliente nel TUO sistema (stringa arbitraria)

## Note
- Coexistence: il numero rimane attivo anche sull'app WhatsApp Business mobile
- Zero storage: i messaggi non vengono salvati su FusionWA, solo inoltrati
- Il token OAuth Meta è cifrato a riposo
`} />

            <P>
              Puoi anche scaricare la versione leggibile dai modelli:{" "}
              <Link href="/llms.txt" className="underline" target="_blank">
                /llms.txt
              </Link>
            </P>
          </Section>
        </main>
      </div>
    </div>
  );
}
