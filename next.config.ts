import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  // Modelo de caché con "use cache" + cacheTag/revalidateTag (ADR 0002).
  cacheComponents: true,
  poweredByHeader: false,
  experimental: {
    // Las imágenes llegan al servidor de hasta 4 MB (src/lib/media.ts), más el sobre del formulario.
    serverActions: { bodySizeLimit: "4.2mb" },
  },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      // El panel no se indexa nunca, ni siquiera sus respuestas no-HTML.
      { source: "/admin/:path*", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }] },
      { source: "/admin", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }] },
    ];
  },
};

export default nextConfig;
