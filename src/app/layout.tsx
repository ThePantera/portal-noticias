import type { Metadata, Viewport } from "next";
import { Inter_Tight, JetBrains_Mono, Newsreader } from "next/font/google";
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

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

/*
 * El portal es oscuro por defecto. Si el lector eligió el tema claro (ThemeToggle), se aplica
 * antes de pintar para que la página no parpadee.
 */
const THEME_SCRIPT = `try{var t=localStorage.getItem("theme");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}`;

export const metadata: Metadata = {
  metadataBase: new URL(env.SITE_URL),
  title: { default: env.SITE_NAME, template: `%s | ${env.SITE_NAME}` },
  description:
    "Noticias para la comunidad IT: inteligencia artificial, programación, ciberseguridad, hardware, gaming y trabajo en tecnología.",
  openGraph: { siteName: env.SITE_NAME, locale: "es_AR", type: "website" },
  alternates: { types: FEED_ALTERNATE_TYPES },
  ...(env.GOOGLE_SITE_VERIFICATION ? { verification: { google: env.GOOGLE_SITE_VERIFICATION } } : {}),
};

export const viewport: Viewport = {
  themeColor: "#080d17",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // suppressHydrationWarning: el script de tema puede cambiar data-theme antes de hidratar.
    <html
      lang="es"
      data-theme="dark"
      suppressHydrationWarning
      className={`${newsreader.variable} ${interTight.variable} ${jetbrainsMono.variable}`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="flex min-h-dvh flex-col">{children}</body>
    </html>
  );
}
