/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },
  images: {
    // Eigene Fotos einfach unter public/ ablegen (z. B. /images/hero.jpg) und
    // mit next/image nutzen. Für externe Bild-Quellen hier Hosts freigeben:
    remotePatterns: [{ protocol: "https", hostname: "images.unsplash.com" }],
  },
};

export default nextConfig;
