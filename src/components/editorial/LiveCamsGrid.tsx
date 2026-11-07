"use client";

import { useEffect, useState } from "react";
import { embedUrl, watchUrl, type LiveCam } from "@/lib/live-cams";

type YouTubePlayerOptions = { events: { onError: () => void } };
type YouTubeApi = { Player: new (element: HTMLIFrameElement, options: YouTubePlayerOptions) => unknown };
type YouTubeWindow = Window & { YT?: YouTubeApi; onYouTubeIframeAPIReady?: () => void };

const API_SRC = "https://www.youtube.com/iframe_api";

/** Carga una sola vez la API de reproductores de YouTube y avisa cuando está lista. */
function whenYouTubeReady(callback: (api: YouTubeApi) => void) {
  const w = window as YouTubeWindow;
  if (w.YT?.Player) {
    callback(w.YT);
    return;
  }
  const previous = w.onYouTubeIframeAPIReady;
  w.onYouTubeIframeAPIReady = () => {
    previous?.();
    if (w.YT) callback(w.YT);
  };
  if (!document.querySelector(`script[src="${API_SRC}"]`)) {
    const script = document.createElement("script");
    script.src = API_SRC;
    script.async = true;
    document.head.append(script);
  }
}

/**
 * Grilla de cámaras. Si YouTube dice que un video no se puede ver (se cortó la transmisión,
 * se borró o no deja insertarse), esa cámara desaparece de la página.
 */
export function LiveCamsGrid({ cams }: { cams: LiveCam[] }) {
  const [broken, setBroken] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    whenYouTubeReady((api) => {
      for (const cam of cams) {
        const iframe = document.getElementById(`camara-${cam.id}`);
        if (!(iframe instanceof HTMLIFrameElement)) continue;
        new api.Player(iframe, {
          events: { onError: () => setBroken((prev) => new Set(prev).add(cam.id)) },
        });
      }
    });
  }, [cams]);

  const visible = cams.filter((cam) => !broken.has(cam.id));
  if (visible.length === 0) {
    return (
      <p role="status" className="rounded-md border border-rule bg-surface px-4 py-3 text-ink-muted">
        No hay cámaras disponibles en este momento.
      </p>
    );
  }

  return (
    <ul className="grid grid-cols-1 gap-6 md:grid-cols-2">
      {visible.map((cam) => (
        <li key={cam.id} className="grid gap-3">
          <div className="aspect-video overflow-hidden rounded-card border border-rule bg-night">
            <iframe
              id={`camara-${cam.id}`}
              src={embedUrl(cam.youtubeId)}
              title={`${cam.title}, ${cam.place}`}
              loading="lazy"
              allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
              referrerPolicy="strict-origin-when-cross-origin"
              className="size-full"
            />
          </div>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="font-display text-xl font-bold">{cam.title}</h2>
            <a
              href={watchUrl(cam.youtubeId)}
              target="_blank"
              rel="noreferrer"
              className="text-sm text-ink-muted underline"
            >
              Ver en YouTube
            </a>
          </div>
          <p className="-mt-2 text-sm text-ink-muted">{cam.place}</p>
        </li>
      ))}
    </ul>
  );
}
