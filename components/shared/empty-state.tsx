import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function EmptyState({
  icon: Icon,
  title,
  description,
  children,
  className,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-lg border border-dashed border-border-strong bg-background px-6 py-16 text-center",
        className,
      )}
    >
      <div className="mb-4 flex h-[72px] w-[72px] items-center justify-center rounded-full bg-primary-soft text-primary">
        <Icon className="h-8 w-8" strokeWidth={1.5} />
      </div>
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
      {description && (
        <p className="mt-1 max-w-[360px] text-sm text-muted-foreground">{description}</p>
      )}
      {children && <div className="mt-5 flex flex-wrap justify-center gap-2">{children}</div>}
    </div>
  );
}
