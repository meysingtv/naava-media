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
  },
};

export default nextConfig;
