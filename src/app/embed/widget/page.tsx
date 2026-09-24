import type { Metadata } from "next";
import { EmbeddedWidget } from "@/components/embed/embedded-widget";

export const metadata: Metadata = {
  title: "Collega WhatsApp",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default function EmbeddedWidgetPage() {
  return <EmbeddedWidget />;
}
