import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import "./globals.css";

import { ThemeProvider } from "@/components/theme-provider";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
});

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://fusionwa.com";

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default: "FusionWA — WhatsApp Business API per software house",
    template: "%s | FusionWA",
  },
  description:
    "Integra WhatsApp Business Cloud API nel tuo software in 60 secondi. SDK widget, API REST, webhook in tempo reale. Prima connessione a €0.",
  keywords: [
    "WhatsApp Business API",
    "WhatsApp SDK",
    "Meta Business Cloud API",
    "WhatsApp integration",
    "software house WhatsApp",
  ],
  authors: [{ name: "FusionWA", url: APP_URL }],
  openGraph: {
    type: "website",
    locale: "it_IT",
    alternateLocale: "en_US",
    title: "FusionWA — WhatsApp nel tuo software in 60 secondi",
    description:
      "Integra WhatsApp Business Cloud API con 3 righe di codice. Prima connessione a €0, nessun abbonamento fisso.",
    siteName: "FusionWA",
    url: APP_URL,
  },
  twitter: {
    card: "summary_large_image",
    title: "FusionWA — WhatsApp nel tuo software in 60 secondi",
    description:
      "Integra WhatsApp Business Cloud API con 3 righe di codice. Prima connessione a €0.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html
      lang={locale}
      suppressHydrationWarning
      className={`${inter.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <NextIntlClientProvider locale={locale} messages={messages}>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            {children}
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
