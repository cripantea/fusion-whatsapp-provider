import type { LucideIcon } from "lucide-react";
import { LayoutDashboard, Plug, Settings } from "lucide-react";

export type NavItem = {
  titleKey: "dashboard" | "connections" | "settings";
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
    titleKey: "settings",
    href: "/impostazioni",
    icon: Settings,
  },
];
