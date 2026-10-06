import { SiteFooter } from "@/components/editorial/SiteFooter";
import { SiteHeader } from "@/components/editorial/SiteHeader";
import { env } from "@/server/env";

export default function PublicLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <SiteHeader siteName={env.SITE_NAME} />
      <main id="contenido" className="flex-1">
        {children}
      </main>
      <SiteFooter siteName={env.SITE_NAME} />
    </>
  );
}
