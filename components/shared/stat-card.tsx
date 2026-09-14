import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  icon: Icon,
  iconClassName,
  hint,
}: {
  label: string;
  value: React.ReactNode;
  icon: LucideIcon;
  iconClassName?: string;
  hint?: React.ReactNode;
}) {
  return (
    <Card className="flex items-start justify-between gap-4 p-5">
      <div className="min-w-0">
        <p className="text-[13px] font-medium text-muted-foreground">{label}</p>
        <p className="mt-2 text-[28px] font-semibold leading-none tracking-[-0.02em] text-foreground tabular-nums">
          {value}
        </p>
        {hint && <p className="mt-2 text-xs text-muted-foreground">{hint}</p>}
      </div>
      <div
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary-soft text-primary",
          iconClassName,
        )}
      >
        <Icon className="h-[18px] w-[18px]" strokeWidth={1.75} />
      </div>
    </Card>
  );
}
