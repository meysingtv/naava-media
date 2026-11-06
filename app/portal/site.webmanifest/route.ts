export const dynamic = "force-static";

export function GET() {
  const manifest = {
    name: "Mein Fahrschul-Portal",
    short_name: "Fahrschule",
    description: "Termine, Fortschritt & Rechnungen deiner Fahrschule.",
    start_url: "/portal",
    scope: "/portal",
    display: "standalone",
    orientation: "portrait",
    background_color: "#ffffff",
    theme_color: "#ffffff",
    icons: [
      { src: "/portal-icon-192.png", sizes: "192x192", type: "image/png", purpose: "any maskable" },
      { src: "/portal-icon-512.png", sizes: "512x512", type: "image/png", purpose: "any maskable" },
    ],
  };
  return new Response(JSON.stringify(manifest), {
    headers: { "Content-Type": "application/manifest+json; charset=utf-8" },
  });
}
