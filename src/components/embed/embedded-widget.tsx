"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Script from "next/script";
import { Button } from "@/components/ui/button";

const API_KEY_HEADER = "X-FusionWA-API-Key";
const GRAPH_SDK_VERSION = "v26.0";
const FACEBOOK_SCOPE = "business_management,whatsapp_business_management,whatsapp_business_messaging";
const FACEBOOK_MESSAGE_ORIGIN = "https://www.facebook.com";

type Credentials = { apiKey: string; customerId: string };
type WidgetStatus = {
  status: "NOT_SUBSCRIBED" | "SUBSCRIBED_UNCONNECTED" | "CONNECTED";
  phoneNumber?: string;
  facebookAppId?: string | null;
  facebookConfigId?: string | null;
};
type SignupMessage = { type?: string; event?: string; data?: { phone_number_id?: string; waba_id?: string } };

function readCredentials(): Credentials | null {
  const params = new URLSearchParams(window.location.hash.slice(1));
  const apiKey = params.get("apiKey");
  const customerId = params.get("customerId");
  return apiKey && customerId ? { apiKey, customerId } : null;
}

export function EmbeddedWidget() {
  const [credentials, setCredentials] = useState<Credentials | null>(null);
  const [data, setData] = useState<WidgetStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sdkReady, setSdkReady] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const signupDataRef = useRef<{ wabaId?: string; phoneNumberId?: string }>({});
  const facebookAppId = data?.facebookAppId;

  const loadStatus = useCallback(async (current: Credentials) => {
    setError(null);
    const response = await fetch(`/api/v1/widget/status?customerId=${encodeURIComponent(current.customerId)}`, {
      headers: { [API_KEY_HEADER]: current.apiKey },
    });
    const result = await response.json().catch(() => null);
    if (!response.ok || !result) throw new Error("Impossibile leggere lo stato della connessione");
    setData(result);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const current = readCredentials();
      setCredentials(current);
      if (!current) return setError("Configurazione widget non valida");
      loadStatus(current).catch((reason) => setError(reason instanceof Error ? reason.message : "Errore"));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadStatus]);

  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (event.source === window.parent && event.data?.type === "FUSIONWA_WIDGET" && event.data.event === "REFRESH") {
        if (credentials) loadStatus(credentials).catch(() => setError("Impossibile aggiornare lo stato"));
        return;
      }
      if (event.origin !== FACEBOOK_MESSAGE_ORIGIN) return;
      let payload: SignupMessage;
      try { payload = typeof event.data === "string" ? JSON.parse(event.data) : event.data; } catch { return; }
      const finished = payload?.type === "WA_EMBEDDED_SIGNUP" &&
        (payload.event === "FINISH" || payload.event === "FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING");
      if (finished) signupDataRef.current = { wabaId: payload.data?.waba_id, phoneNumberId: payload.data?.phone_number_id };
    }
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [credentials, loadStatus]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    let parentOrigin = "*";
    try { if (document.referrer) parentOrigin = new URL(document.referrer).origin; } catch { /* fallback */ }
    const reportHeight = () => window.parent.postMessage(
      { type: "FUSIONWA_WIDGET", event: "RESIZE", height: Math.ceil(root.getBoundingClientRect().height) + 4 },
      parentOrigin
    );
    const observer = new ResizeObserver(reportHeight);
    observer.observe(root);
    reportHeight();
    return () => observer.disconnect();
  }, []);

  const initializeFacebook = useCallback(() => {
    if (!facebookAppId || !window.FB) return;
    window.FB.init({ appId: facebookAppId, autoLogAppEvents: true, xfbml: true, version: GRAPH_SDK_VERSION });
    setSdkReady(true);
  }, [facebookAppId]);

  async function activate() {
    if (!credentials) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/v1/widget/activate", {
        method: "POST",
        headers: { [API_KEY_HEADER]: credentials.apiKey, "Content-Type": "application/json" },
        body: JSON.stringify({ customerId: credentials.customerId }),
      });
      if (!response.ok) throw new Error("Attivazione non riuscita");
      await loadStatus(credentials);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Errore");
    } finally { setBusy(false); }
  }

  function connect() {
    if (!credentials || !data?.facebookConfigId || !window.FB) return;
    setBusy(true);
    setError(null);
    signupDataRef.current = {};
    window.FB.login(async (response) => {
      const code = response.authResponse?.code;
      if (!code) return setBusy(false);
      try {
        const callbackResponse = await fetch("/api/auth/facebook/callback", {
          method: "POST",
          headers: { [API_KEY_HEADER]: credentials.apiKey, "Content-Type": "application/json" },
          body: JSON.stringify({
            code,
            wabaId: signupDataRef.current.wabaId,
            phoneNumberId: signupDataRef.current.phoneNumberId,
            externalCustomerId: credentials.customerId,
          }),
        });
        if (!callbackResponse.ok) throw new Error("Collegamento non riuscito");
        await loadStatus(credentials);
      } catch (reason) {
        setError(reason instanceof Error ? reason.message : "Errore");
      } finally { setBusy(false); }
    }, {
      config_id: data.facebookConfigId,
      response_type: "code",
      override_default_response_type: true,
      scope: FACEBOOK_SCOPE,
      extras: { setup: {}, featureType: "whatsapp_business_app_onboarding", sessionInfoVersion: "3" },
    });
  }

  return (
    <div ref={rootRef} className="min-h-10 bg-transparent p-1 font-sans">
      {data?.facebookAppId && <Script src="https://connect.facebook.net/en_US/sdk.js" strategy="afterInteractive" onReady={initializeFacebook} onError={() => setError("Facebook SDK non disponibile")} />}
      {!data && !error && <span className="text-sm text-muted-foreground">Caricamento…</span>}
      {data?.status === "NOT_SUBSCRIBED" && <Button onClick={activate} disabled={busy}>{busy ? "Attivazione…" : "Attiva WhatsApp"}</Button>}
      {data?.status === "SUBSCRIBED_UNCONNECTED" && <Button onClick={connect} disabled={busy || !sdkReady || !data.facebookConfigId}>{busy ? "Connessione…" : sdkReady ? "Connetti WhatsApp" : "Caricamento Facebook…"}</Button>}
      {data?.status === "CONNECTED" && <div className="flex h-8 items-center text-sm font-semibold text-emerald-600">✓ WhatsApp collegato{data.phoneNumber ? ` (${data.phoneNumber})` : ""}</div>}
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
  );
}
