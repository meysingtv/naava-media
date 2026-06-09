import Link from "next/link";

import { Logo } from "@/components/shared/logo";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background px-4 text-center">
      <Logo />
      <div>
        <p className="text-6xl font-bold text-primary">404</p>
        <h1 className="mt-2 text-xl font-semibold">Seite nicht gefunden</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Die angeforderte Seite existiert nicht oder wurde verschoben.
        </p>
      </div>
      <Button asChild>
        <Link href="/dashboard">Zurück zum Dashboard</Link>
      </Button>
    </div>
  );
}
