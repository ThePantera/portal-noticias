type SiteFooterProps = { siteName: string };

export function SiteFooter({ siteName }: SiteFooterProps) {
  return (
    <footer className="mt-auto border-t border-rule">
      <div className="mx-auto max-w-site px-4 py-8 text-sm text-ink-subtle md:px-8">{siteName}</div>
    </footer>
  );
}
