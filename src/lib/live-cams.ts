/** Cámaras en vivo: utilidades puras para los enlaces de YouTube. */

export type LiveCam = { id: string; title: string; place: string; youtubeId: string };

const ID = /^[A-Za-z0-9_-]{11}$/;

/**
 * Saca el identificador de video de lo que se pegue en el panel: un enlace de YouTube
 * (watch?v=, youtu.be/, /live/, /embed/, /shorts/) o el identificador solo. null si no es válido.
 */
export function parseYouTubeId(input: string): string | null {
  const value = input.trim();
  if (ID.test(value)) return value;
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  const host = url.hostname.replace(/^(www|m)\./, "");
  let candidate: string | null = null;
  if (host === "youtu.be") candidate = url.pathname.slice(1);
  else if (host === "youtube.com" || host === "youtube-nocookie.com") {
    candidate =
      url.searchParams.get("v") ?? url.pathname.match(/^\/(?:live|embed|shorts)\/([^/]+)/)?.[1] ?? null;
  }
  return candidate && ID.test(candidate) ? candidate : null;
}

/** Reproductor sin cookies de seguimiento hasta que el lector le da play. */
export function embedUrl(youtubeId: string): string {
  return `https://www.youtube-nocookie.com/embed/${youtubeId}?mute=1&rel=0&modestbranding=1`;
}

export function watchUrl(youtubeId: string): string {
  return `https://www.youtube.com/watch?v=${youtubeId}`;
}

export type StreamStatus = "live" | "down" | "unknown";

/**
 * Estado de una transmisión según la página del video en YouTube: en vivo ahora, caída
 * (terminó, es privada o no se puede reproducir) o desconocido si la página cambió de forma.
 */
export function streamStatusFromWatchPage(html: string): StreamStatus {
  if (html.includes('"isLiveNow":true')) return "live";
  const playability = html.match(/"playabilityStatus":\{"status":"([A-Z_]+)"/)?.[1];
  if (playability && playability !== "OK") return "down";
  if (html.includes('"isLiveNow":false')) return "down";
  return "unknown";
}
