import type { Metadata, Viewport } from "next";
import { Libre_Franklin, Newsreader } from "next/font/google";
import { env } from "@/server/env";
import "@/styles/globals.css";

const newsreader = Newsreader({
  subsets: ["latin"],
  axes: ["opsz"],
  style: ["normal", "italic"],
  variable: "--font-newsreader",
  display: "swap",
});

const franklin = Libre_Franklin({
  subsets: ["latin"],
  variable: "--font-franklin",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(env.SITE_URL),
  title: { default: env.SITE_NAME, template: `%s | ${env.SITE_NAME}` },
  description: "Noticias de política, economía, tecnología, mundo, sociedad, deportes y cultura.",
  openGraph: { siteName: env.SITE_NAME, locale: "es_AR", type: "website" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f7f7" },
    { media: "(prefers-color-scheme: dark)", color: "#0e1419" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className={`${newsreader.variable} ${franklin.variable}`}>
      <body className="flex min-h-dvh flex-col">{children}</body>
    </html>
  );
}
