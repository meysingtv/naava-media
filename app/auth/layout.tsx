import { Logo } from "@/components/shared/logo";

/** Auth-Rahmen v2: ruhige Off-White-Fläche, Marke oben links, Inhalt zentriert. */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      <header className="flex h-12 items-center px-5 lg:px-8">
        <Logo />
      </header>
      <main className="flex flex-1 items-start justify-center px-4 pb-16 pt-8 sm:pt-16">
        <div className="w-full max-w-[400px] animate-page-in">{children}</div>
      </main>
      <footer className="px-5 pb-5 text-xs text-muted-foreground lg:px-8">
        © {new Date().getFullYear()} FahrschulApp · Verwaltung für Fahrschulen
      </footer>
    </div>
  );
}
