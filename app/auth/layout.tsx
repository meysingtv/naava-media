import { Logo } from "@/components/shared/logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-background via-background to-primary/10 px-4 py-10">
      <div className="mb-6">
        <Logo className="text-2xl" />
      </div>
      <main className="w-full max-w-md">{children}</main>
      <p className="mt-8 text-xs text-muted-foreground">
        © {new Date().getFullYear()} FahrschulApp · Verwaltung für Fahrschulen
      </p>
    </div>
  );
}
