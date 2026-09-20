import { cn } from "@/components/ui";

/** Gestrichelte Route mit zwei Haltepunkten – als leise Deko auf Farbflächen. */
export function RouteMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 900 360"
      fill="none"
      preserveAspectRatio="xMidYMid slice"
      className={cn("pointer-events-none absolute inset-0 h-full w-full", className)}
      aria-hidden
    >
      <path
        d="M-40 300 C 140 300, 170 120, 330 120 S 520 260, 660 210 S 840 60, 960 90"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeDasharray="1 10"
        strokeLinecap="round"
      />
      <circle cx="330" cy="120" r="4" fill="currentColor" />
      <circle cx="660" cy="210" r="4" fill="currentColor" />
    </svg>
  );
}

/** Pylone – der Übungsplatz in einem Zeichen. */
export function PylonMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" className={className} aria-hidden>
      <path d="M9 4h6l3 15H6L9 4Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M8 11h8M7 15h10" stroke="currentColor" strokeWidth="1.5" />
      <path d="M4 20h16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

/** Fahrschul-Schild. */
export function LMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" className={className} aria-hidden>
      <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M9 7v10h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
