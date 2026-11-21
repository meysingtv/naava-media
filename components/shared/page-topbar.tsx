import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { BereichReiterLeiste, SeitenTitel } from "@/components/shared/bereich-reiter";
import { cn } from "@/lib/utils";

export interface PageTopbarProps {
  title: string;
  /** Kurze Meta-Angabe unter dem Titel („8 in Ausbildung") – kein Erklärsatz. */
  description?: string;
  /** Kompatibilität: wird zur ersten Brotkrumen-Stufe, wenn kein `breadcrumb` kommt. */
  eyebrow?: string;
  breadcrumb?: { label: string; href?: string }[];
  /** Zurück-Pfeil links (Formular- und Detailseiten). */
  backHref?: string;
  actions?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}

/**
 * Seitenkopf v4: links Titel (20 px) mit Brotkrumen darüber, rechts die
 * Aktionen DIESER Seite. Auf Bereichs-Startseiten mit mehreren Seiten steht
 * darunter die Reiterleiste. Scrollt mit dem Inhalt; Suche, „Neu" und
 * Glocke gehören in die App-Leiste (`app-bar.tsx`).
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
    <div data-page-header className={cn("mb-6", className)}>
      <div className="flex min-h-9 flex-wrap items-end justify-between gap-x-4 gap-y-3">
        <div className="flex min-w-0 items-start gap-2">
          {backHref && (
            <Button asChild variant="ghost" size="icon-sm" className="-ml-2 mt-px shrink-0">
              <Link href={backHref} aria-label="Zurück">
                <ArrowLeft className="!size-4" strokeWidth={1.75} />
              </Link>
            </Button>
          )}
          <SeitenTitel title={title} description={description} stufen={stufen} />
        </div>

        {seitenAktionen && (
          <div data-actions className="flex shrink-0 flex-wrap items-center gap-2 print:hidden">
            {seitenAktionen}
          </div>
        )}
      </div>
      <BereichReiterLeiste />
    </div>
  );
}
