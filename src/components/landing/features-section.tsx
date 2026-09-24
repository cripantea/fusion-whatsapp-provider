import { getTranslations } from "next-intl/server";

import { StaggerChildren, StaggerItem, FadeUp } from "@/components/landing/motion";

const API_SNIPPET = `curl -X POST https://fusionwa.com/api/v1/messages/send \\
  -H "X-FusionWA-API-Key: fwa_live_..." \\
  -H "Content-Type: application/json" \\
  -d '{
    "to": "+39 02 1234567",
    "templateName": "hello_world",
    "languageCode": "it"
  }'

# → { "messageId": "wamid.abc123..." }`;

const WEBHOOK_SNIPPET = `app.post("/webhook/whatsapp", (req, res) => {
  const { type, from, text } = req.body;
  // type: "message" | "status" | "template_status"
  console.log(\`Message from \${from}: \${text}\`);
  res.sendStatus(200);
});`;

const COEXISTENCE_SNIPPET = `// No extra configuration needed.
// FusionWA automatically manages
// the Coexistence heartbeat with Meta.
//
// The number stays active on both
// the mobile app and the Cloud API.`;

const SDK_SNIPPET = `FusionWA.init({
  apiKey: "fwa_live_...",
  customerId: user.id,
  containerId: "widget",
});`;

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

export async function FeaturesSection() {
  const t = await getTranslations("landing.features");

  const FEATURES = [
    { label: "01", titleKey: "sdk", code: SDK_SNIPPET, lang: "js" },
    { label: "02", titleKey: "api", code: API_SNIPPET, lang: "bash" },
    { label: "03", titleKey: "webhook", code: WEBHOOK_SNIPPET, lang: "js" },
    { label: "04", titleKey: "coexistence", code: COEXISTENCE_SNIPPET, lang: "js" },
  ] as const;

  return (
    <section className="mx-auto max-w-6xl px-6 py-32">
      <FadeUp className="mb-20 max-w-xl">
        <p className="mb-4 text-sm font-medium text-muted-foreground">{t("sectionLabel")}</p>
        <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          {t("titleMain")}
          <br />
          <span className="text-muted-foreground">{t("titleMuted")}</span>
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
                <h3 className="mb-1.5 font-semibold tracking-tight">
                  {t(`${feature.titleKey}.title`)}
                </h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {t(`${feature.titleKey}.description`)}
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
