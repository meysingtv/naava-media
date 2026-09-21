import { Fragment } from "react";
import Link from "next/link";
import { Bell, ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { GlobalSearch } from "@/components/shared/global-search";
import { HeaderSentinel } from "@/components/shared/header-sentinel";
import { MobileMenuButton } from "@/components/shared/mobile-menu-button";
import { NeuMenu } from "@/components/shared/neu-menu";
import { cn } from "@/lib/utils";

export interface PageTopbarProps {
  title: string;
  /** Meta neben dem Titel, maximal 40 Zeichen – kein Erklärsatz. */
  description?: string;
  /** Kompatibilität: wird zur ersten Breadcrumb-Stufe, wenn kein `breadcrumb` kommt. */
  eyebrow?: string;
  breadcrumb?: { label: string; href?: string }[];
  /** Zurück-Chevron links (Formular- und Detailseiten). */
  backHref?: string;
  actions?: React.ReactNode;
  notifications?: boolean;
  /** Ohne Wert erscheint kein Punkt an der Glocke. */
  notificationCount?: number;
  children?: React.ReactNode;
  className?: string;
}

/**
 * Seitenkopf: genau 56 px, eine Zeile, klebend. Drei Zonen – links
 * Menü-Button (mobil), Zurück-Chevron, Breadcrumb und Titel; MITTIG die
 * Suche; rechts Seitenaktionen, „Neu" und die Glocke, bündig am rechten
 * Fensterrand.
 *
 * Server-Komponente: Der Breadcrumb wird übergeben, nicht aus dem Pfad
 * geraten – so wandert kein "use client" durch den Baum.
 */
export function PageTopbar({
  title,
  description,
  eyebrow,
  breadcrumb,
  backHref,
  actions,
  notifications = true,
  notificationCount,
  children,
  className,
}: PageTopbarProps) {
  const stufen = breadcrumb ?? (eyebrow ? [{ label: eyebrow }] : []);
  const seitenAktionen = actions ?? children;

  return (
    <>
      <HeaderSentinel />
      <header
        data-page-header
        className={cn(
          "sticky top-0 z-header -mx-4 mb-5 flex h-14 items-center gap-3 border-b border-transparent",
          "bg-background px-4 md:-mx-6 md:px-6 lg:-mx-8 lg:px-8",
          "data-[scrolled=true]:border-border print:static print:border-0",
          className,
        )}
      >
        <MobileMenuButton className="-ml-1.5 shrink-0 lg:hidden" />

        {backHref && (
          <Button asChild variant="ghost" size="icon-sm" className="-ml-1.5 shrink-0">
            <Link href={backHref} aria-label="Zurück">
              <ChevronLeft className="!size-[18px]" strokeWidth={1.75} />
            </Link>
          </Button>
        )}

        <nav aria-label="Brotkrumen" className="flex min-w-0 items-center gap-1.5">
          {stufen.map((s) => (
            <Fragment key={s.label}>
              {s.href ? (
                <Link
                  href={s.href}
                  className="hidden truncate text-13 text-muted-foreground transition-colors hover:text-foreground sm:block"
                >
                  {s.label}
                </Link>
              ) : (
                <span className="hidden truncate text-13 text-muted-foreground sm:block">{s.label}</span>
              )}
              <ChevronRight
                className="hidden h-3.5 w-3.5 shrink-0 text-foreground-tertiary sm:block"
                strokeWidth={1.75}
                aria-hidden="true"
              />
            </Fragment>
          ))}
          <h1 className="truncate text-base font-semibold leading-6 text-foreground">{title}</h1>
          {description && (
            <span className="hidden shrink-0 truncate text-13 text-muted-foreground lg:block">· {description}</span>
          )}
        </nav>

        {/* Suche – mittig im FENSTER. Ab `lg` schiebt der Versatz um die halbe
            Navigationsbreite nach links, damit die Mitte auf dem Bildschirm
            stimmt und nicht nur im Inhaltsbereich. */}
        <div className="pointer-events-none absolute inset-x-0 hidden justify-center md:flex lg:translate-x-[calc(var(--sidebar-w)/-2)] print:hidden">
          <div className="pointer-events-auto w-full max-w-[420px] px-4">
            <GlobalSearch />
          </div>
        </div>

        <div data-actions className="relative ml-auto flex shrink-0 items-center gap-2 print:hidden">
          {seitenAktionen}
          {seitenAktionen ? <span className="mx-0.5 hidden h-5 w-px bg-border sm:block" /> : null}

          <GlobalSearch variant="icon" className="md:hidden" />
          <NeuMenu />

          {notifications && (
            <Button asChild variant="ghost" size="icon-sm" className="relative">
              <Link href="/erinnerungen" aria-label="Erinnerungen">
                <Bell className="!size-[18px]" strokeWidth={1.75} />
                {notificationCount != null && notificationCount > 0 && (
                  <span
                    aria-hidden="true"
                    className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-destructive ring-2 ring-background"
                  />
                )}
              </Link>
            </Button>
          )}
        </div>
      </header>
    </>
  );
}
