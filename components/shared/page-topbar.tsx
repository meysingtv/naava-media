import { Fragment } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
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
  children?: React.ReactNode;
  className?: string;
}

/**
 * Seitenkopf: Brotkrumen, Titel und die Aktionen DIESER Seite – zwei Zeilen,
 * mit Abstand unter der App-Leiste, scrollt mit dem Inhalt mit.
 *
 * Suche, „Neu" und Glocke gehören nicht hierher, sondern in die App-Leiste
 * (`app-bar.tsx`), die oben stehen bleibt.
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
  children,
  className,
}: PageTopbarProps) {
  const stufen = breadcrumb ?? (eyebrow ? [{ label: eyebrow }] : []);
  const seitenAktionen = actions ?? children;

  return (
    <div
      data-page-header
      className={cn("mb-6 flex flex-wrap items-end justify-between gap-x-4 gap-y-3", className)}
    >
      <div className="flex min-w-0 items-start gap-2">
        {backHref && (
          <Button asChild variant="ghost" size="icon-sm" className="-ml-1.5 mt-1 shrink-0">
            <Link href={backHref} aria-label="Zurück">
              <ChevronLeft className="!size-[18px]" strokeWidth={1.75} />
            </Link>
          </Button>
        )}

        <div className="min-w-0">
          {stufen.length > 0 && (
            <nav aria-label="Brotkrumen" className="mb-1 flex min-w-0 items-center gap-1.5">
              {stufen.map((s, i) => (
                <Fragment key={s.label}>
                  {i > 0 && (
                    <ChevronRight
                      className="h-3.5 w-3.5 shrink-0 text-foreground-tertiary"
                      strokeWidth={1.75}
                      aria-hidden="true"
                    />
                  )}
                  {s.href ? (
                    <Link
                      href={s.href}
                      className="truncate text-13 text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {s.label}
                    </Link>
                  ) : (
                    <span className="truncate text-13 text-muted-foreground">{s.label}</span>
                  )}
                </Fragment>
              ))}
            </nav>
          )}

          <div className="flex min-w-0 flex-wrap items-baseline gap-x-2">
            <h1 className="truncate text-[22px] font-semibold leading-7 tracking-[-0.012em] text-foreground">
              {title}
            </h1>
            {description && <span className="truncate text-13 text-muted-foreground">· {description}</span>}
          </div>
        </div>
      </div>

      {seitenAktionen && (
        <div data-actions className="flex shrink-0 items-center gap-2 print:hidden">
          {seitenAktionen}
        </div>
      )}
    </div>
  );
}
