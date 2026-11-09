import { youtubeId } from "@/lib/video";

type Props = { url: string | null; title: string; className?: string };

/** Nombre corto del sitio de un link ("www.infobae.com" → "infobae.com"). */
function siteOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "la nota original";
  }
}

/**
 * Video de la nota. Si es de YouTube se ve acá mismo (sin cookies hasta que se reproduce);
 * si es del reproductor de otro medio, un botón lleva a la nota original.
 */
export function ArticleVideo({ url, title, className = "" }: Props) {
  if (!url) return null;
  const id = youtubeId(url);
  if (id) {
    return (
      <div className={`aspect-video w-full overflow-hidden rounded-sm bg-ink ${className}`}>
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${id}`}
          title={`Video: ${title}`}
          loading="lazy"
          allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen"
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullScreen
          className="size-full border-0"
        />
      </div>
    );
  }
  return (
    <p className={className}>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer nofollow"
        className="inline-flex min-h-11 items-center gap-2 rounded-sm bg-ink px-4 py-2.5 font-ui text-sm font-semibold text-paper no-underline"
      >
        <span aria-hidden>▶</span> Ver el video en {siteOf(url)}
      </a>
    </p>
  );
}
