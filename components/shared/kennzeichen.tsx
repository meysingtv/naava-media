import { cn } from "@/lib/utils";

/**
 * Kfz-Kennzeichen im Stil des deutschen Schilds: schwarze Schrift auf Weiß,
 * dünner Rahmen, blauer EU-Streifen links.
 */
export function Kennzeichen({ children, className }: { children: string; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-5 shrink-0 items-stretch overflow-hidden rounded-[3px] bg-white text-[11px] font-semibold uppercase leading-none tracking-wide text-[#111827] shadow-[inset_0_0_0_1px_rgba(17,24,39,0.55)]",
        className,
      )}
    >
      <span aria-hidden="true" className="w-[5px] shrink-0 bg-[#1f4fb8]" />
      <span className="flex items-center whitespace-nowrap px-1.5 tabular-nums">{children}</span>
    </span>
  );
}
