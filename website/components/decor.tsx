import { cn } from "@/components/ui";

/** Dezentes Routen/Karten-Motiv als Hintergrund (Fahrplan/Bewegung). */
export function RouteMotif({ className, stroke = "currentColor" }: { className?: string; stroke?: string }) {
  return (
    <svg viewBox="0 0 800 400" fill="none" className={cn("pointer-events-none absolute inset-0 h-full w-full", className)} aria-hidden preserveAspectRatio="xMidYMid slice">
      <path
        d="M-20 320 C 120 320, 140 180, 260 180 S 420 300, 540 250 S 720 120, 840 160"
        stroke={stroke}
        strokeWidth="2.5"
        strokeDasharray="2 12"
        strokeLinecap="round"
      />
      <path
        d="M-20 90 C 140 90, 200 220, 340 220 S 520 110, 660 150 S 780 300, 860 300"
        stroke={stroke}
        strokeWidth="2"
        strokeDasharray="2 14"
        strokeLinecap="round"
        opacity="0.5"
      />
      {[
        [260, 180],
        [540, 250],
        [340, 220],
      ].map(([x, y], i) => (
        <g key={i}>
          <circle cx={x} cy={y} r="7" fill={stroke} opacity="0.9" />
          <circle cx={x} cy={y} r="14" stroke={stroke} strokeWidth="1.5" opacity="0.3" />
        </g>
      ))}
    </svg>
  );
}

/** Kachel-Grid als feine Deko (wie auf technischen Landingpages). */
export function GridMotif({ className, color = "rgba(26,127,78,.10)" }: { className?: string; color?: string }) {
  return (
    <div
      className={cn("pointer-events-none absolute inset-0", className)}
      style={{
        backgroundImage: `linear-gradient(${color} 1px, transparent 1px), linear-gradient(90deg, ${color} 1px, transparent 1px)`,
        backgroundSize: "44px 44px",
        maskImage: "radial-gradient(70% 60% at 50% 40%, black, transparent 80%)",
        WebkitMaskImage: "radial-gradient(70% 60% at 50% 40%, black, transparent 80%)",
      }}
      aria-hidden
    />
  );
}
