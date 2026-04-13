import type { Metadata } from "next";
import { Public_Sans, Space_Grotesk } from "next/font/google";
import type { ReactNode } from "react";

import "./globals.css";

const headingFont = Space_Grotesk({ subsets: ["latin"], variable: "--font-heading" });
const bodyFont = Public_Sans({ subsets: ["latin"], variable: "--font-body" });

export const metadata: Metadata = {
  title: "Apex Ride",
  description: "Base productiva para plataforma de ciclismo comunitario con segmentos y leaderboards.",
  icons: {
    icon: [
      { url: "/16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/64x64.png", sizes: "64x64", type: "image/png" },
      { url: "/192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/logo.png", sizes: "512x512", type: "image/png" }
    ],
    shortcut: "/32x32.png",
    apple: [{ url: "/192x192.png", sizes: "192x192", type: "image/png" }]
  },
  manifest: "/site.webmanifest"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es" className={`${headingFont.variable} ${bodyFont.variable}`}>
      <body className="font-[var(--font-body)] text-slate-900 antialiased">{children}</body>
    </html>
  );
}
