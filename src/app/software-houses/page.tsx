import Link from "next/link";
import type { Metadata } from "next";
import { Check, ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { LandingHeader } from "@/components/landing/landing-header";
import { LandingFooter } from "@/components/landing/landing-footer";
import { PUBLIC_SIGNUP_ENABLED } from "@/lib/growth-mode";

export const metadata: Metadata = {
  title: "WhatsApp API for Software Houses — FusionWA",
  description:
    "Stop rebuilding WhatsApp integrations for every client. Software houses integrate FusionWA once and deploy WhatsApp Business connectivity across every project.",
};

const BENEFITS = [
  {
    title: "Integrate once, deploy everywhere",
    description:
      "One FusionWA integration. Reuse it across every client project — each client connects their own WhatsApp Business account independently.",
  },
  {
    title: "No per-client Meta setup",
    description:
      "You don't need to configure a new WABA for each client. Meta Embedded Signup runs in the browser on first use, guided by FusionWA.",
  },
  {
    title: "Coexistence for existing users",
    description:
      "Clients already using WhatsApp Business on their phone can connect via Coexistence. They scan a QR when Meta requests it and keep their existing number and app.",
  },
  {
    title: "Per-client API and webhooks",
    description:
      "Each client connection has isolated API access and a dedicated webhook endpoint. No cross-client data leakage.",
  },
  {
    title: "Per-connection pricing",
    description:
      "You pay only for active connections. No fixed monthly platform fee. Bill clients at your own rate and keep the margin.",
  },
  {
    title: "Connection management UI",
    description:
      "Dashboard to monitor all client connections, their status, and their associated applications — across all your projects.",
  },
];

const CLIENTS = [
  "Beauty salon management software",
  "Automotive workshop software",
  "Real estate CRM",
  "Hotel management systems",
  "Healthcare / clinic software",
  "Gym and fitness platforms",
  "Restaurant and hospitality tools",
  "Custom ERP and vertical SaaS",
];

export default function SoftwareHousesPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <LandingHeader />
      <main className="flex-1 pt-14">

        {/* Hero */}
        <section className="mx-auto max-w-4xl px-6 py-24 text-center">
          <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-primary/70">
            For Software Houses
          </p>
          <h1 className="mb-6 text-balance text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">
            Stop rebuilding WhatsApp for every client.
          </h1>
          <p className="mx-auto mb-8 max-w-2xl text-balance text-lg text-muted-foreground">
            Software houses integrate FusionWA once. Then reuse the same WhatsApp Business
            infrastructure across every client project — without touching Meta setup for each one.
          </p>
          <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button
              size="lg"
              className="px-8 shadow-lg shadow-primary/25"
              nativeButton={false}
              render={<Link href={PUBLIC_SIGNUP_ENABLED ? "/register" : "/login"} />}
            >
              Try the first connection free
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
            First connection free · Per-connection pricing · No platform subscription
          </p>
        </section>

        {/* Architecture visual */}
        <section className="border-y bg-muted/20">
          <div className="mx-auto max-w-4xl px-6 py-24">
            <h2 className="mb-12 text-center text-2xl font-semibold tracking-tight">
              One integration. Every client.
            </h2>
            <div className="mx-auto max-w-lg">
              <div className="rounded-2xl border bg-background p-8">
                <div className="mb-6 rounded-lg border bg-card p-4 text-center">
                  <p className="text-sm font-semibold">Your software</p>
                  <p className="text-xs text-muted-foreground">FusionWA SDK + API — integrated once</p>
                </div>
                <div className="mb-4 flex items-center justify-center">
                  <div className="h-6 w-px bg-border" />
                </div>
                <div className="mb-4 grid grid-cols-3 gap-2">
                  {["Client A", "Client B", "Client C"].map((c) => (
                    <div key={c} className="rounded-lg border bg-primary/5 p-3 text-center">
                      <p className="text-xs font-medium">{c}</p>
                      <p className="mt-0.5 text-[10px] text-muted-foreground">WhatsApp Business</p>
                    </div>
                  ))}
                </div>
                <div className="mb-4 flex items-center justify-center">
                  <div className="h-6 w-px bg-border" />
                </div>
                <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 text-center">
                  <p className="text-sm font-semibold text-primary">FusionWA</p>
                  <p className="text-xs text-muted-foreground">Connection management · API · Webhooks</p>
                </div>
              </div>
            </div>
            <p className="mt-6 text-center text-sm text-muted-foreground">
              Each client connects their own WhatsApp Business account independently.
              <br />
              Your software receives per-client API access and webhook events.
            </p>
          </div>
        </section>

        {/* Client types */}
        <section className="mx-auto max-w-6xl px-6 py-24">
          <h2 className="mb-4 text-2xl font-semibold tracking-tight">
            The software you already build
          </h2>
          <p className="mb-10 text-sm text-muted-foreground">
            FusionWA works inside the vertical software your clients run their businesses on.
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {CLIENTS.map((client) => (
              <div
                key={client}
                className="rounded-xl border bg-card p-4 text-sm font-medium"
              >
                {client}
              </div>
            ))}
          </div>
        </section>

        {/* Benefits grid */}
        <section className="border-t bg-muted/20">
          <div className="mx-auto max-w-6xl px-6 py-24">
            <h2 className="mb-12 text-2xl font-semibold tracking-tight">
              Built for your workflow
            </h2>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {BENEFITS.map((b) => (
                <div key={b.title} className="flex flex-col gap-3 rounded-xl border bg-background p-6">
                  <div className="flex size-6 items-center justify-center rounded-full bg-primary/10">
                    <Check className="size-3.5 text-primary" />
                  </div>
                  <h3 className="font-semibold">{b.title}</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">{b.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="mx-auto max-w-3xl px-6 py-24 text-center">
          <h2 className="mb-4 text-2xl font-semibold tracking-tight">
            First connection free. No subscription.
          </h2>
          <p className="mb-8 text-muted-foreground">
            Try the full integration with your first client at zero cost.
            Graduated pricing from the second connection onward.
          </p>
          <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button
              size="lg"
              className="shadow-lg shadow-primary/25"
              nativeButton={false}
              render={<Link href={PUBLIC_SIGNUP_ENABLED ? "/register" : "/login"} />}
            >
              Get started
            </Button>
            <Button
              size="lg"
              variant="outline"
              nativeButton={false}
              render={<Link href="/docs" />}
            >
              Read the docs
            </Button>
          </div>
        </section>

      </main>
      <LandingFooter />
    </div>
  );
}
