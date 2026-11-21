import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: { default: "Mein Fahrschul-Portal", template: "%s · Portal" },
  manifest: "/portal/site.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Fahrschule" },
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-surface">{children}</div>;
}
