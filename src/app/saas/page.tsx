import Link from "next/link";
import type { Metadata } from "next";
import { Check, ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { LandingHeader } from "@/components/landing/landing-header";
import { LandingFooter } from "@/components/landing/landing-footer";
import { PUBLIC_SIGNUP_ENABLED } from "@/lib/growth-mode";

export const metadata: Metadata = {
  title: "WhatsApp API for SaaS — FusionWA",
  description:
    "Add WhatsApp Business connectivity to your SaaS. One integration, every customer connects their own WhatsApp Business account through Meta Embedded Signup.",
};

const BENEFITS = [
  {
    title: "One integration",
    description:
      "Integrate FusionWA once. Each of your customers connects their own WhatsApp Business account — you write zero per-customer code.",
  },
  {
    title: "Meta Embedded Signup handled",
    description:
      "The entire OAuth flow with Meta is handled by FusionWA. Your customers authorize their account through Meta's official flow, directly inside your software.",
  },
  {
    title: "Coexistence supported",
    description:
      "Eligible customers connecting an existing WhatsApp Business App number can use Coexistence. They scan a QR when Meta requests it and keep using WhatsApp Business on their phone.",
  },
  {
    title: "API + webhooks",
    description:
      "Send template messages and receive incoming messages via webhook — all authenticated per customer connection, routed to your endpoints.",
  },
  {
    title: "Scales with your SaaS",
    description:
      "First connection is free. Graduated per-connection pricing means your cost grows proportionally with your active customer base.",
  },
  {
    title: "Zero message storage",
    description:
      "FusionWA forwards webhook events in real time. Messages are never stored on FusionWA infrastructure.",
  },
];

const HOW_IT_WORKS = [
  {
    step: "01",
    title: "Create an application",
    description:
      "Register on FusionWA and create an Application in the dashboard. Get your API Key and API Secret.",
  },
  {
    step: "02",
    title: "Embed the connection widget",
    description:
      'Add 3 lines of code to your SaaS. The FusionWA SDK widget appears wherever you place it — showing a "Connect WhatsApp" button to your customer.',
  },
  {
    step: "03",
    title: "Customer connects through Meta",
    description:
      "Your customer clicks the button and completes Meta Embedded Signup. For eligible WhatsApp Business App accounts, Coexistence keeps their number active on both the phone and your API.",
  },
  {
    step: "04",
    title: "Your SaaS gets the API",
    description:
      "Once connected, send template messages via the REST API and receive incoming messages and status updates through your configured webhook endpoint.",
  },
];

export default function SaasPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <LandingHeader />
      <main className="flex-1 pt-14">

        {/* Hero */}
        <section className="mx-auto max-w-4xl px-6 py-24 text-center">
          <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-primary/70">
            For SaaS Companies
          </p>
          <h1 className="mb-6 text-balance text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">
            Let your SaaS customers connect WhatsApp.
          </h1>
          <p className="mx-auto mb-8 max-w-2xl text-balance text-lg text-muted-foreground">
            Integrate FusionWA once. Each customer connects their existing WhatsApp Business account
            through Meta Embedded Signup. Eligible accounts use Coexistence — they keep using
            WhatsApp Business on their phone, your SaaS gets the API and webhooks.
          </p>
          <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button
              size="lg"
              className="px-8 shadow-lg shadow-primary/25"
              nativeButton={false}
              render={<Link href={PUBLIC_SIGNUP_ENABLED ? "/register" : "/login"} />}
            >
              Start with one free connection
              <ArrowRight className="ml-2 size-4" />
            </Button>
            <Button
              size="lg"
              variant="ghost"
              className="text-muted-foreground"
              nativeButton={false}
              render={<Link href="/docs" />}
            >
              Read the docs →
            </Button>
          </div>
          <p className="mt-4 text-xs text-muted-foreground/70">
            First connection free · No subscription · API + webhooks
          </p>
        </section>

        {/* How it works */}
        <section className="border-y bg-muted/20">
          <div className="mx-auto max-w-6xl px-6 py-24">
            <h2 className="mb-12 text-2xl font-semibold tracking-tight">
              How it works
            </h2>
            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
              {HOW_IT_WORKS.map((step) => (
                <div key={step.step} className="flex flex-col gap-3">
                  <div className="flex size-9 items-center justify-center rounded-full border border-primary/30 bg-primary/8 font-mono text-sm font-bold text-primary">
                    {step.step}
                  </div>
                  <h3 className="font-semibold">{step.title}</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">{step.description}</p>
                </div>
              ))}
            </div>

            {/* Coexistence callout */}
            <div className="mt-10 rounded-xl border border-primary/20 bg-primary/5 p-5">
              <p className="text-sm font-medium text-primary">
                Coexistence note
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Coexistence applies to eligible WhatsApp Business App numbers. When Meta
                offers the Coexistence path during Embedded Signup, the customer may be
                asked to scan a QR code. After connecting, they continue using WhatsApp
                Business on their phone as normal. API and webhooks become available to
                your SaaS simultaneously.
              </p>
            </div>
          </div>
        </section>

        {/* Benefits grid */}
        <section className="mx-auto max-w-6xl px-6 py-24">
          <h2 className="mb-12 text-2xl font-semibold tracking-tight">
            What you get
          </h2>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {BENEFITS.map((b) => (
              <div key={b.title} className="flex flex-col gap-3 rounded-xl border bg-card p-6">
                <div className="flex size-6 items-center justify-center rounded-full bg-primary/10">
                  <Check className="size-3.5 text-primary" />
                </div>
                <h3 className="font-semibold">{b.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{b.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Code snippet */}
        <section className="border-y bg-muted/20">
          <div className="mx-auto max-w-3xl px-6 py-24">
            <h2 className="mb-3 text-2xl font-semibold tracking-tight">
              3 lines to add the connection button
            </h2>
            <p className="mb-8 text-sm text-muted-foreground">
              Paste this into your frontend. The widget handles the rest.
            </p>
            <div className="overflow-hidden rounded-xl border bg-zinc-950">
              <div className="flex items-center gap-1.5 border-b border-white/10 bg-zinc-900/60 px-4 py-3">
                <span className="size-2.5 rounded-full bg-red-500/70" />
                <span className="size-2.5 rounded-full bg-yellow-500/70" />
                <span className="size-2.5 rounded-full bg-green-500/70" />
                <span className="ml-3 text-xs text-zinc-500">index.html</span>
              </div>
              <pre className="overflow-x-auto p-5 text-sm leading-relaxed text-zinc-300">
                <code>{`<script src="https://fusionwa.com/sdk/v1.js"></script>
<div id="wa-widget"></div>
<script>
  FusionWA.init({
    apiKey: "fwa_live_...",        // from your FusionWA dashboard
    customerId: currentUser.id,   // your internal customer ID
    containerId: "wa-widget",
  });
</script>`}</code>
              </pre>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              The widget renders a &quot;Connect WhatsApp&quot; button. On click, Meta Embedded Signup
              opens in a popup. Once the customer authorizes, the widget shows &quot;WhatsApp Connected&quot;.
            </p>
          </div>
        </section>

        {/* Pricing teaser */}
        <section className="mx-auto max-w-3xl px-6 py-24 text-center">
          <h2 className="mb-4 text-2xl font-semibold tracking-tight">
            Pricing that scales with you
          </h2>
          <p className="mb-8 text-muted-foreground">
            No subscription. No fixed monthly cost. Pay only for active connections, in graduated brackets.
          </p>
          <div className="mb-8 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            {[
              { range: "1st", price: "Free" },
              { range: "2nd–9th", price: "€5 / conn" },
              { range: "10th–24th", price: "€4 / conn" },
              { range: "25th+", price: "€3 / conn" },
            ].map((tier) => (
              <div key={tier.range} className="rounded-lg border bg-card p-4">
                <p className="text-xs text-muted-foreground">{tier.range}</p>
                <p className="mt-1 font-semibold">{tier.price}</p>
                <p className="text-[10px] text-muted-foreground">per month</p>
              </div>
            ))}
          </div>
          <p className="mb-8 text-xs text-muted-foreground">
            Graduated pricing: each connection is billed at its bracket rate. Adding your 10th
            connection does not retroactively raise the price of the first 9.
          </p>
          <Button
            size="lg"
            className="shadow-lg shadow-primary/25"
            nativeButton={false}
            render={<Link href={PUBLIC_SIGNUP_ENABLED ? "/register" : "/login"} />}
          >
            Start with one free connection
          </Button>
        </section>

      </main>
      <LandingFooter />
    </div>
  );
}
