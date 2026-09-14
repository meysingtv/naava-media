import { Logo } from "@/components/shared/logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background px-4 py-10">
      {/* Sehr dezenter Türkis-Schimmer oben – kein Verlauf über die Fläche */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-[radial-gradient(60%_100%_at_50%_0%,hsl(var(--primary-soft))_0%,transparent_100%)]"
      />
      <div className="relative mb-8">
        <Logo className="text-xl" />
      </div>
      <main className="relative w-full max-w-[400px] animate-slide-up-in">{children}</main>
      <p className="relative mt-8 text-xs text-muted-foreground">
        © {new Date().getFullYear()} FahrschulApp · Verwaltung für Fahrschulen
      </p>
    </div>
  );
}
