import { cn } from "@/lib/utils";

/**
 * Seitenkopf v2: kompakter Titel (20 px) mit optionaler Bereichs-Kennung
 * darüber; Aktionen rechts. Keine Hero-Überschriften.
 */
export function PageHeader({
  title,
  description,
  eyebrow,
  children,
  className,
}: {
  title: string;
  description?: string;
  eyebrow?: string;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between", className)}>
      <div className="min-w-0">
        {eyebrow && <p className="label-caps mb-1">{eyebrow}</p>}
        <h1 className="text-xl font-semibold leading-7 tracking-[-0.01em] text-foreground">{title}</h1>
        {description && <p className="mt-0.5 text-[13px] text-muted-foreground">{description}</p>}
      </div>
      {children && <div className="flex shrink-0 flex-wrap items-center gap-2">{children}</div>}
    </div>
  );
}
