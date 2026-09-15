import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Documentation — FusionWA",
  description:
    "FusionWA integration guide. SDK widget, REST API, webhooks, Coexistence, and template management.",
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
  return <h2 className="mb-4 mt-2 text-xl font-semibold tracking-tight">{children}</h2>;
}

function H3({ children }: { children: React.ReactNode }) {
  return <h3 className="mb-3 mt-6 font-semibold text-base">{children}</h3>;
}

function P({ children }: { children: React.ReactNode }) {
  return <p className="mb-3 text-sm leading-relaxed text-muted-foreground">{children}</p>;
}

function Callout({ children, type = "info" }: { children: React.ReactNode; type?: "info" | "warning" }) {
  return (
    <div className={`my-4 rounded-lg border p-4 text-sm ${type === "warning" ? "border-yellow-500/30 bg-yellow-500/5" : "border-primary/20 bg-primary/5"}`}>
      {children}
    </div>
  );
}

const NAV = [
  { href: "#quickstart", label: "Quickstart" },
  { href: "#sdk", label: "SDK Widget" },
  { href: "#coexistence", label: "Coexistence" },
  { href: "#rest-api", label: "REST API" },
  { href: "#webhooks", label: "Webhooks" },
  { href: "#templates", label: "Templates" },
  { href: "#errors", label: "Errors" },
  { href: "#ai-guide", label: "AI assistants" },
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
          <span className="text-sm text-muted-foreground">Documentation</span>
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

          {/* Quickstart */}
          <Section id="quickstart">
            <p className="mb-2 text-xs font-medium uppercase tracking-widest text-muted-foreground">
              Documentation
            </p>
            <h1 className="mb-4 text-3xl font-semibold tracking-tight">
              Quickstart
            </h1>
            <P>
              FusionWA provides WhatsApp Business Cloud API infrastructure for SaaS companies
              and software houses. Your customers connect their own WhatsApp Business accounts
              through Meta Embedded Signup — you get the API and webhooks.
            </P>

            <div className="my-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {[
                { title: "SDK Widget", desc: "Customers connect on their own. 3 lines of HTML.", href: "#sdk" },
                { title: "REST API", desc: "Send messages and manage connections from your backend.", href: "#rest-api" },
                { title: "Webhooks", desc: "Receive messages and status updates in real time.", href: "#webhooks" },
                { title: "Coexistence", desc: "Eligible customers keep WhatsApp Business on their phone.", href: "#coexistence" },
              ].map((card) => (
                <Link
                  key={card.href}
                  href={card.href}
                  className="group rounded-lg border p-4 transition-colors hover:border-foreground/20 hover:bg-accent/50"
                >
                  <p className="mb-1 text-sm font-medium group-hover:text-foreground">{card.title}</p>
                  <p className="text-xs text-muted-foreground">{card.desc}</p>
                </Link>
              ))}
            </div>

            <H3>Step 1 — Create an account and application</H3>
            <P>
              Register at{" "}
              <Link href="/register" className="underline">
                fusionwa.io/register
              </Link>
              . Then go to{" "}
              <Link href="/applicazioni" className="underline">
                Applications
              </Link>{" "}
              and create your first App. Copy the <strong>API Key</strong> and <strong>API Secret</strong>.
            </P>

            <H3>Step 2 — Embed the connection widget</H3>
            <P>
              Add the SDK to your frontend. The widget renders a &quot;Connect WhatsApp&quot; button for
              each of your customers.
            </P>
            <CodeBlock
              lang="html"
              code={`<script src="https://fusionwa.io/sdk/v1.js"></script>
<div id="fusionwa-widget"></div>
<script>
  FusionWA.init({
    apiKey: "fwa_live_...",      // from your FusionWA dashboard (safe to expose client-side)
    customerId: currentUser.id, // your internal customer ID
    containerId: "fusionwa-widget",
  });
</script>`}
            />

            <H3>Step 3 — Customer connects through Meta Embedded Signup</H3>
            <P>
              Your customer clicks &quot;Connect WhatsApp&quot;. Meta Embedded Signup opens in a popup.
              They authorize their WhatsApp Business account. FusionWA receives and stores the
              connection securely.
            </P>
            <P>
              For eligible WhatsApp Business App numbers, Meta may offer the <strong>Coexistence</strong> flow
              — see the <Link href="#coexistence" className="underline">Coexistence section</Link> for details.
            </P>

            <H3>Step 4 — Configure your webhook</H3>
            <P>
              In the dashboard under Applications, set a webhook URL. FusionWA will forward every
              incoming message and status update to your endpoint in real time.
            </P>

            <H3>Step 5 — Send your first message</H3>
            <CodeBlock
              lang="bash"
              code={`curl -X POST https://fusionwa.io/api/v1/messages/send \\
  -H "X-FusionWA-API-Key: fwa_live_..." \\
  -H "Content-Type: application/json" \\
  -d '{
    "to": "+39 02 1234567",
    "templateName": "hello_world",
    "languageCode": "it"
  }'

# Response: { "messageId": "wamid.abc123..." }`}
            />
          </Section>

          {/* SDK */}
          <Section id="sdk">
            <H2>SDK Widget</H2>
            <P>
              The fastest way to integrate FusionWA. Paste the snippet into your software:
              the widget manages the full Meta Embedded Signup flow and WhatsApp Business
              connection on behalf of your customer.
            </P>

            <H3>Initialization</H3>
            <CodeBlock
              lang="javascript"
              code={`FusionWA.init({
  apiKey: "fwa_live_abc123",     // public — from your FusionWA dashboard
  customerId: currentUser.id,   // unique string per customer in YOUR system
  containerId: "fusionwa-widget", // id of the div to render into
});`}
            />

            <H3>Widget states</H3>
            <div className="my-4 overflow-hidden rounded-lg border">
              {[
                { state: "NOT_SUBSCRIBED", desc: 'Customer not yet activated. Shows "Activate" button.' },
                { state: "SUBSCRIBED_UNCONNECTED", desc: 'Activated but not yet connected. Shows "Connect WhatsApp" button.' },
                { state: "CONNECTED", desc: "WhatsApp Business connected. Shows number and status." },
              ].map((row) => (
                <div key={row.state} className="flex flex-col gap-1 border-b p-3 last:border-0 sm:flex-row sm:items-center sm:gap-4">
                  <code className="w-52 shrink-0 rounded bg-muted px-2 py-0.5 text-xs">{row.state}</code>
                  <span className="text-sm text-muted-foreground">{row.desc}</span>
                </div>
              ))}
            </div>

            <H3>customerId</H3>
            <P>
              Use your internal customer identifier — any unique string per App. AppUsers are
              created automatically on first SDK init. The same customerId is used in API calls
              to reference that customer&apos;s connection.
            </P>

            <Callout>
              The SDK <code className="text-xs">apiKey</code> is intentionally public — it only
              looks up connection status. Keep the <strong>API Secret</strong> server-side.
            </Callout>
          </Section>

          {/* Coexistence */}
          <Section id="coexistence">
            <H2>WhatsApp Business App Coexistence</H2>
            <P>
              Coexistence is a Meta feature that allows a WhatsApp Business App number to be
              connected to the WhatsApp Business Cloud API simultaneously. When active, the
              customer continues receiving messages on their phone while the Cloud API
              (FusionWA) can also send and receive on the same number.
            </P>

            <H3>Who it applies to</H3>
            <P>
              Coexistence applies to eligible customers who already have an active{" "}
              <strong>WhatsApp Business App</strong> installation on a mobile device.
              Not every account is eligible — Meta determines eligibility during the Embedded
              Signup flow.
            </P>

            <H3>The Coexistence flow</H3>
            <P>When a customer connects via FusionWA and Meta offers Coexistence:</P>
            <ol className="mb-4 ml-4 flex list-decimal flex-col gap-2 text-sm text-muted-foreground">
              <li>Customer clicks &quot;Connect WhatsApp&quot; in your software.</li>
              <li>Meta Embedded Signup popup opens.</li>
              <li>Customer selects their existing WhatsApp Business account.</li>
              <li>Meta may prompt the customer to scan a QR code on their phone (this is Meta&apos;s process, not FusionWA&apos;s).</li>
              <li>Customer scans the QR in their WhatsApp Business App when requested.</li>
              <li>Connection completes — the number is now live on both the phone app and the Cloud API.</li>
            </ol>

            <Callout type="warning">
              <strong>The QR code appears only during Meta&apos;s Coexistence onboarding</strong>, when
              Meta requests it. It is part of Meta Embedded Signup — FusionWA does not generate
              QR codes independently. Not all connections use Coexistence; some accounts connect
              via the standard Cloud API path without a QR scan.
            </Callout>

            <H3>After connecting with Coexistence</H3>
            <P>
              The customer continues using WhatsApp Business on their phone normally —
              sending and receiving from the app as before. The Cloud API
              (your software via FusionWA) can also send messages and receives all
              incoming messages via webhook simultaneously.
            </P>

            <H3>Coexistence heartbeat</H3>
            <P>
              FusionWA automatically manages the Coexistence heartbeat with Meta. No additional
              configuration is required on your end.
            </P>
            <CodeBlock
              lang="javascript"
              code={`// No extra configuration needed.
// FusionWA automatically manages the Coexistence
// heartbeat with Meta.
//
// The number stays active on both the mobile app
// and the Cloud API simultaneously.`}
            />
          </Section>

          {/* REST API */}
          <Section id="rest-api">
            <H2>REST API</H2>
            <P>
              All calls require the header{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                X-FusionWA-API-Key: fwa_live_...
              </code>
              .
            </P>
            <P>
              Base URL:{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                https://fusionwa.io/api/v1
              </code>
            </P>

            <H3>Send a template message</H3>
            <CodeBlock
              lang="bash"
              code={`POST /api/v1/messages/send

{
  "to": "+39 02 1234567",
  "templateName": "hello_world",
  "languageCode": "it",
  "components": []
}

# Response
{ "messageId": "wamid.abc123..." }`}
            />

            <H3>Check connection status</H3>
            <CodeBlock
              lang="bash"
              code={`GET /api/v1/widget/status?customerId=user_123

# Response
{
  "status": "CONNECTED",          // INACTIVE | CONNECTED
  "phoneNumber": "+39 02 1234567"
}`}
            />

            <H3>Activate AppUser (backend flow)</H3>
            <CodeBlock
              lang="bash"
              code={`POST /api/v1/widget/activate

{ "customerId": "user_123" }`}
            />

            <H3>List approved templates</H3>
            <CodeBlock
              lang="bash"
              code={`GET /api/v1/templates?customerId=user_123

# Response
[
  {
    "name": "hello_world",
    "status": "APPROVED",
    "language": "it",
    "category": "UTILITY"
  }
]`}
            />
          </Section>

          {/* Webhooks */}
          <Section id="webhooks">
            <H2>Webhooks</H2>
            <P>
              FusionWA forwards every WhatsApp event to your endpoint in real time.
              Configure the URL in Applications → Webhook in the dashboard.
            </P>
            <P>
              <strong>Zero storage:</strong> payloads are forwarded only, never stored.
            </P>

            <H3>Payload structure</H3>
            <CodeBlock
              lang="json"
              code={`{
  "type": "message",
  "from": "+39 02 1234567",
  "customerId": "user_123",
  "timestamp": "2025-01-15T10:30:00Z",
  "message": {
    "id": "wamid.abc...",
    "type": "text",
    "text": { "body": "Hello" }
  }
}`}
            />

            <H3>Event types</H3>
            <div className="my-4 overflow-hidden rounded-lg border">
              {[
                { type: "message", desc: "Incoming message from a customer" },
                { type: "status", desc: "Message delivery status update (sent / delivered / read)" },
                { type: "template_status", desc: "Meta template approval status change" },
              ].map((row) => (
                <div key={row.type} className="flex items-center gap-4 border-b p-3 last:border-0">
                  <code className="w-36 shrink-0 rounded bg-muted px-2 py-0.5 text-xs">
                    {row.type}
                  </code>
                  <span className="text-sm text-muted-foreground">{row.desc}</span>
                </div>
              ))}
            </div>

            <H3>Receive events in your backend</H3>
            <CodeBlock
              lang="javascript"
              code={`// Express
app.post("/webhook/whatsapp", express.json(), (req, res) => {
  const { type, from, customerId, message } = req.body;

  if (type === "message" && message?.type === "text") {
    console.log(\`[\${customerId}] \${from}: \${message.text.body}\`);
    // store, process, reply...
  }

  res.sendStatus(200); // respond 200 within 10s or the webhook is retried
});`}
            />
            <Callout>
              Failed deliveries are retried with exponential backoff. Permanently failed events
              are moved to a dead-letter queue.
            </Callout>
          </Section>

          {/* Templates */}
          <Section id="templates">
            <H2>WhatsApp Templates</H2>
            <P>
              Templates enable proactive outbound messages (notifications, reminders, confirmations).
              They must be approved by Meta before use.
            </P>

            <H3>Create and submit a template</H3>
            <CodeBlock
              lang="bash"
              code={`POST /api/v1/templates

{
  "customerId": "user_123",
  "name": "order_confirmed",
  "category": "UTILITY",
  "language": "it",
  "components": [
    {
      "type": "BODY",
      "text": "Your order {{1}} is confirmed. Delivery: {{2}}."
    }
  ]
}`}
            />
            <P>
              The template is submitted to Meta for review. Status becomes{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">APPROVED</code> typically
              within a few hours. You receive a <code className="rounded bg-muted px-1.5 py-0.5 text-xs">template_status</code> webhook
              event when the status changes.
            </P>
          </Section>

          {/* Errors */}
          <Section id="errors">
            <H2>Error Reference</H2>
            <div className="overflow-hidden rounded-lg border">
              {[
                { code: "200", meaning: "Success" },
                { code: "400", meaning: "Invalid request body" },
                { code: "401", meaning: "Missing or invalid API Key" },
                { code: "403", meaning: "App revoked or customerId not authorized" },
                { code: "404", meaning: "Customer not found or not connected" },
                { code: "422", meaning: "Validation error (see response body)" },
                { code: "429", meaning: "Rate limit exceeded" },
                { code: "500", meaning: "Internal error — retry with backoff" },
              ].map((row) => (
                <div key={row.code} className="flex items-center gap-4 border-b p-3 last:border-0">
                  <code className="w-12 shrink-0 text-sm font-semibold">{row.code}</code>
                  <span className="text-sm text-muted-foreground">{row.meaning}</span>
                </div>
              ))}
            </div>
          </Section>

          {/* AI guide */}
          <Section id="ai-guide">
            <H2>For AI Coding Assistants</H2>
            <P>
              Use this block as initial context in your prompt when integrating FusionWA with
              Claude Code, Codex, Cursor, or GitHub Copilot:
            </P>

            <CodeBlock
              lang="markdown"
              code={`# FusionWA Integration Context

Read https://fusionwa.io/llms.txt for the full machine-readable specification.

## SDK Widget
<script src="https://fusionwa.io/sdk/v1.js"></script>
<div id="fusionwa-widget"></div>
<script>
  FusionWA.init({ apiKey, customerId, containerId })
</script>

## REST API
Base URL: https://fusionwa.io/api/v1
Auth: X-FusionWA-API-Key: fwa_live_...

POST /api/v1/messages/send
  body: { to, templateName, languageCode, components[] }
  returns: { messageId }

GET /api/v1/widget/status?customerId=
  returns: { status: "INACTIVE"|"CONNECTED", phoneNumber }

GET /api/v1/templates?customerId=
  returns: [{ name, status, language, category }]

## Webhooks
Configure URL in dashboard. Payload: { type, from, customerId, timestamp, message }
Respond 200 within 10s. type: "message" | "status" | "template_status"

## Security rules
- apiKey: client-safe (SDK only)
- API Secret: server-only (never expose)
- customerId: your internal ID, any unique string
- Do NOT store messages — forward to your own DB if needed
- Do NOT invent endpoints — use only the documented ones above`}
            />

            <P>
              Download the machine-readable version:{" "}
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
