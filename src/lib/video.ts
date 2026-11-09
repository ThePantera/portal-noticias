/**
 * Video de una nota: un link de YouTube (se ve dentro de la nota) o el link de la nota
 * original cuando el video es del reproductor propio de otro medio (se muestra un botón).
 */

const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;

/** Identificador de YouTube de un link (watch, youtu.be, embed, shorts, live) o null. */
export function youtubeId(value: string): string | null {
  let url: URL;
  try {
    url = new URL(value.trim());
  } catch {
    return null;
  }
  const host = url.hostname.replace(/^(www\.|m\.)/, "");
  let id: string | null = null;
  if (host === "youtu.be") id = url.pathname.slice(1).split("/")[0];
  else if (host === "youtube.com" || host === "youtube-nocookie.com" || host === "music.youtube.com") {
    id =
      url.searchParams.get("v") ?? url.pathname.match(/^\/(?:embed|shorts|live|v)\/([^/?#]+)/)?.[1] ?? null;
  }
  return id && YOUTUBE_ID.test(id) ? id : null;
}

/** Primer video de YouTube que aparece en el HTML de una página (iframe o link). */
export function findYoutubeInHtml(html: string): string | null {
  const pattern =
    /(?:youtube(?:-nocookie)?\.com\/(?:embed\/|watch\?(?:[^"'\s<>]*&(?:amp;)?)?v=|shorts\/|live\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/g;
  for (const match of html.matchAll(pattern)) {
    if (YOUTUBE_ID.test(match[1])) return match[1];
  }
  return null;
}

/** ¿La página trae un video propio (no de YouTube)? Open Graph, <video> o datos estructurados. */
export function hasOwnVideo(html: string): boolean {
  return (
    /<meta[^>]+(?:property|name)=["']og:video(?::url|:secure_url)?["']/i.test(html) ||
    /<video\b/i.test(html) ||
    /"@type"\s*:\s*"VideoObject"/.test(html)
  );
}
