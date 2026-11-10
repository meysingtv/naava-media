/** @type {import('next').NextConfig} */
const nextConfig = {
  // Ruhigere, schnellere Navigation: React-Strict-Doppelrender im Dev aus.
  reactStrictMode: false,
  experimental: {
    // @react-pdf/renderer ist eine schwere, server-seitige Bibliothek (pdfkit/
    // fontkit, Node-APIs). Sie darf nicht von webpack gebündelt werden, sonst
    // schlägt die Auflösung im Dev-Server fehl ("Module not found").
    serverComponentsExternalPackages: ["@react-pdf/renderer"],
    // Icon-Barrel-Import optimieren: statt hunderter Module aus "lucide-react"
    // werden nur die tatsächlich genutzten Icons geladen. Beschleunigt sowohl
    // die Dev-Kompilierung als auch die First-Load-Chunks je Route deutlich.
    optimizePackageImports: ["lucide-react"],
    // Router-Zwischenspeicher: besuchte Seiten 30 s sofort wieder da, beim
    // Überfahren vorgeladene Seiten höchstens 60 s alt (statt 5 Minuten).
    staleTimes: { dynamic: 30, static: 60 },
  },
  // Kurz-URLs für Anmeldung und Registrierung (Website → App).
  async redirects() {
    return [
      { source: "/login", destination: "/auth/login", permanent: false },
      { source: "/anmelden", destination: "/auth/login", permanent: false },
      { source: "/register", destination: "/auth/registrieren", permanent: false },
      { source: "/registrieren", destination: "/auth/registrieren", permanent: false },
    ];
  },
};

export default nextConfig;
