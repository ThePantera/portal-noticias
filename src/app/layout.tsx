import type { Metadata, Viewport } from "next";
import { Inter_Tight, Newsreader } from "next/font/google";
import { FEED_ALTERNATE_TYPES } from "@/lib/seo";
import { env } from "@/server/env";
import "@/styles/globals.css";

const newsreader = Newsreader({
  subsets: ["latin"],
  axes: ["opsz"],
  style: ["normal", "italic"],
  variable: "--font-newsreader",
  display: "swap",
});

const interTight = Inter_Tight({
  subsets: ["latin"],
  variable: "--font-inter-tight",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(env.SITE_URL),
  title: { default: env.SITE_NAME, template: `%s | ${env.SITE_NAME}` },
  description: "Noticias de política, economía, tecnología, mundo, sociedad, deportes y cultura.",
  openGraph: { siteName: env.SITE_NAME, locale: "es_AR", type: "website" },
  alternates: { types: FEED_ALTERNATE_TYPES },
  ...(env.GOOGLE_SITE_VERIFICATION ? { verification: { google: env.GOOGLE_SITE_VERIFICATION } } : {}),
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f3f5f9" },
    { media: "(prefers-color-scheme: dark)", color: "#080d17" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className={`${newsreader.variable} ${interTight.variable}`}>
      <body className="flex min-h-dvh flex-col">{children}</body>
    </html>
  );
}
