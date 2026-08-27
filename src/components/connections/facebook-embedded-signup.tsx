"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Script from "next/script";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";

type SignupStatus = "idle" | "connecting" | "success" | "error" | "cancelled";

type EmbeddedSignupMessage = {
  type?: string;
  event?: string;
  data?: {
    phone_number_id?: string;
    waba_id?: string;
  };
};

const GRAPH_SDK_VERSION = "v21.0";
const FACEBOOK_SCOPE = "whatsapp_business_management,whatsapp_business_messaging";
const FACEBOOK_MESSAGE_ORIGIN = "https://www.facebook.com";

export function FacebookEmbeddedSignup({
  appId,
  configId,
}: {
  appId: string | null;
  configId: string | null;
}) {
  const t = useTranslations("connections.embeddedSignup");

  const [sdkReady, setSdkReady] = useState(false);
  const [sdkFailed, setSdkFailed] = useState(false);
  const [status, setStatus] = useState<SignupStatus>("idle");

  // Meta invia waba_id/phone_number_id via postMessage durante il flusso Embedded Signup,
  // separatamente dal `code` OAuth restituito dal callback di FB.login().
  const signupDataRef = useRef<{ wabaId?: string; phoneNumberId?: string }>({});

  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (event.origin !== FACEBOOK_MESSAGE_ORIGIN) return;

      let payload: EmbeddedSignupMessage;
      try {
        payload = typeof event.data === "string" ? JSON.parse(event.data) : event.data;
      } catch {
        return;
      }

      if (payload?.type === "WA_EMBEDDED_SIGNUP" && payload.event === "FINISH") {
        signupDataRef.current = {
          wabaId: payload.data?.waba_id,
          phoneNumberId: payload.data?.phone_number_id,
        };
      }
    }

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  const handleSdkLoad = useCallback(() => {
    if (!appId) return;

    window.fbAsyncInit = () => {
      window.FB?.init({
        appId,
        autoLogAppEvents: true,
        xfbml: true,
        version: GRAPH_SDK_VERSION,
      });
      setSdkReady(true);
    };
  }, [appId]);

  const handleConnect = useCallback(() => {
    if (!configId || !window.FB) return;

    setStatus("connecting");
    signupDataRef.current = {};

    window.FB.login(
      (response) => {
        const code = response.authResponse?.code;

        if (!code) {
          setStatus("cancelled");
          return;
        }

        const { wabaId, phoneNumberId } = signupDataRef.current;

        fetch("/api/auth/facebook/callback", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code, wabaId, phoneNumberId }),
        })
          .then((res) => {
            if (!res.ok) throw new Error("callback failed");
            return res.json();
          })
          .then(() => setStatus("success"))
          .catch(() => setStatus("error"));
      },
      {
        config_id: configId,
        response_type: "code",
        override_default_response_type: true,
        scope: FACEBOOK_SCOPE,
        extras: { sessionInfoVersion: "3" },
      }
    );
  }, [configId]);

  const configMissing = !appId || !configId;

  return (
    <div className="flex flex-col gap-3">
      <Script
        src="https://connect.facebook.net/en_US/sdk.js"
        strategy="afterInteractive"
        onLoad={handleSdkLoad}
        onError={() => setSdkFailed(true)}
      />

      <Button
        onClick={handleConnect}
        disabled={configMissing || sdkFailed || !sdkReady || status === "connecting"}
        className="w-fit"
      >
        {status === "connecting" ? t("connecting") : t("connectButton")}
      </Button>

      {configMissing && (
        <p className="text-sm text-destructive">{t("configMissing")}</p>
      )}
      {!configMissing && sdkFailed && (
        <p className="text-sm text-destructive">{t("sdkError")}</p>
      )}
      {!configMissing && !sdkFailed && !sdkReady && (
        <p className="text-sm text-muted-foreground">{t("sdkLoading")}</p>
      )}
      {status === "cancelled" && (
        <p className="text-sm text-muted-foreground">{t("cancelled")}</p>
      )}
      {status === "success" && (
        <p className="text-sm text-emerald-600 dark:text-emerald-400">
          {t("success")}
        </p>
      )}
      {status === "error" && (
        <p className="text-sm text-destructive">{t("error")}</p>
      )}
    </div>
  );
}
