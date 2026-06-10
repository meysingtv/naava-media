/** @type {import('next').NextConfig} */
const nextConfig = {
  // @react-pdf/renderer ist eine schwere, server-seitige Bibliothek (pdfkit/
  // fontkit, Node-APIs). Sie darf nicht von webpack gebündelt werden, sonst
  // schlägt die Auflösung im Dev-Server fehl ("Module not found").
  experimental: {
    serverComponentsExternalPackages: ["@react-pdf/renderer"],
  },
};

export default nextConfig;
