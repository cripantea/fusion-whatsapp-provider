import type { LucideIcon } from "lucide-react";
import { LayoutDashboard, Plug, AppWindow, Settings } from "lucide-react";

export type NavItem = {
  titleKey: "dashboard" | "connections" | "applications" | "settings";
  href: string;
  icon: LucideIcon;
};

export const navItems: NavItem[] = [
  {
    titleKey: "dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    titleKey: "connections",
    href: "/connessioni",
    icon: Plug,
  },
  {
    titleKey: "applications",
    href: "/applicazioni",
    icon: AppWindow,
  },
  {
    titleKey: "settings",
    href: "/impostazioni",
    icon: Settings,
  },
];
