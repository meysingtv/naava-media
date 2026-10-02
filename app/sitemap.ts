import type { MetadataRoute } from "next";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://www.fahrschulapp.de";

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = ["", "/funktionen", "/ueber-uns", "/demo", "/kontakt", "/impressum", "/datenschutz", "/agb"];
  return routes.map((r) => ({
    url: `${SITE}${r}`,
    lastModified: new Date(),
    changeFrequency: r === "" ? "weekly" : "monthly",
    priority: r === "" ? 1 : r === "/demo" ? 0.9 : 0.7,
  }));
}
