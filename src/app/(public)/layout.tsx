import { SiteFooter } from "@/components/editorial/SiteFooter";
import { SiteHeader } from "@/components/editorial/SiteHeader";
import { env } from "@/server/env";
import { getDollarRates } from "@/server/services/exchange-rates";
import { getNavCategories } from "@/server/services/public-content";

export default async function PublicLayout({ children }: LayoutProps<"/">) {
  const [categories, rates] = await Promise.all([getNavCategories(), getDollarRates()]);
  return (
    <>
      <a
        href="#contenido"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-40 focus:bg-surface focus:px-3 focus:py-2"
      >
        Saltar al contenido
      </a>
      <SiteHeader siteName={env.SITE_NAME} categories={categories} rates={rates} />
      <main id="contenido" className="flex-1 pb-12">
        {children}
      </main>
      <SiteFooter siteName={env.SITE_NAME} categories={categories} />
    </>
  );
}
