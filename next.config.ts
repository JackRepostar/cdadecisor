import type { NextConfig } from "next";

// Se APP_BASE_URL è impostato (es. https://cda.quitebold.com), lo aggiungiamo alle
// origin consentite per i Server Action: protegge dal controllo CSRF integrato di
// Next quando l'app gira dietro un reverse proxy (nginx) che potrebbe alterare
// l'header Host. Va bene lasciare vuoto in sviluppo locale.
const appBaseUrl = process.env.APP_BASE_URL;
const allowedOrigins = appBaseUrl ? [new URL(appBaseUrl).host] : undefined;

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,
  },
  experimental: {
    serverActions: allowedOrigins ? { allowedOrigins } : undefined,
  },
  // Necessario per lo streaming (loading.tsx, Suspense) dietro nginx.
  async headers() {
    return [
      {
        source: "/:path*{/}?",
        headers: [{ key: "X-Accel-Buffering", value: "no" }],
      },
    ];
  },
};

export default nextConfig;
