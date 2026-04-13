import type { Route } from "next";

export interface NavigationItem {
  href: Route;
  desktopLabel: string;
  mobileLabel: string;
  icon: string;
}

export const navigationItems: NavigationItem[] = [
  { href: "/dashboard", desktopLabel: "Panel", mobileLabel: "Dashboard", icon: "OV" },
  { href: "/rides", desktopLabel: "Rodadas", mobileLabel: "Rides", icon: "RD" },
  { href: "/record", desktopLabel: "Grabar", mobileLabel: "Record", icon: "REC" },
  { href: "/segments", desktopLabel: "Segmentos", mobileLabel: "Segments", icon: "SEG" },
  { href: "/leaderboards", desktopLabel: "Clasificacion", mobileLabel: "Leaderboards", icon: "TOP" },
  { href: "/profile", desktopLabel: "Perfil", mobileLabel: "Profile", icon: "ME" },
  { href: "/settings", desktopLabel: "Ajustes", mobileLabel: "Settings", icon: "CFG" }
];
