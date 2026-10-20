"use client";

import * as React from "react";
import { createPortal } from "react-dom";

import { cn } from "@/lib/utils";

/**
 * Tooltip v3 – schlanke Eigenbau-Variante mit Radix-kompatibler API
 * (`TooltipProvider` / `Tooltip` / `TooltipTrigger` / `TooltipContent`).
 *
 * Hinweis: Der Guide sieht `@radix-ui/react-tooltip` vor; das Paket ist in
 * dieser Etappe nicht installiert (kein `npm install` erlaubt). Die API ist
 * deshalb bewusst deckungsgleich – ein späterer Tausch ist ein Import-Wechsel.
 *
 * Verhalten: öffnet bei Hover (nach `delayDuration`) und bei `focus-visible`,
 * schließt bei Verlassen, Blur, `Esc` und Klick. Reine Beschriftung, deshalb
 * `role="tooltip"` und `aria-hidden` am Inhalt – das Label sitzt zusätzlich
 * als `aria-label` am Auslöser.
 */

interface TooltipKontext {
  offen: boolean;
  oeffnen: () => void;
  schliessen: () => void;
  ankerRef: React.MutableRefObject<HTMLElement | null>;
  side: "right" | "top" | "bottom" | "left";
  sideOffset: number;
}

const Kontext = React.createContext<TooltipKontext | null>(null);

export function TooltipProvider({
  children,
}: {
  children: React.ReactNode;
  delayDuration?: number;
  skipDelayDuration?: number;
}) {
  return <>{children}</>;
}

export function Tooltip({
  children,
  delayDuration = 150,
  side = "right",
  sideOffset = 10,
}: {
  children: React.ReactNode;
  delayDuration?: number;
  side?: "right" | "top" | "bottom" | "left";
  sideOffset?: number;
}) {
  const [offen, setOffen] = React.useState(false);
  const ankerRef = React.useRef<HTMLElement | null>(null);
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const oeffnen = React.useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setOffen(true), delayDuration);
  }, [delayDuration]);

  const schliessen = React.useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setOffen(false);
  }, []);

  React.useEffect(() => () => void (timerRef.current && clearTimeout(timerRef.current)), []);

  React.useEffect(() => {
    if (!offen) return;
    function beiTaste(e: KeyboardEvent) {
      if (e.key === "Escape") schliessen();
    }
    document.addEventListener("keydown", beiTaste);
    return () => document.removeEventListener("keydown", beiTaste);
  }, [offen, schliessen]);

  return (
    <Kontext.Provider value={{ offen, oeffnen, schliessen, ankerRef, side, sideOffset }}>
      {children}
    </Kontext.Provider>
  );
}

export const TooltipTrigger = React.forwardRef<
  HTMLElement,
  { children: React.ReactElement; asChild?: boolean }
>(({ children }, ref) => {
  const ctx = React.useContext(Kontext);
  if (!ctx) return children;

  return React.cloneElement(children, {
    ref: (node: HTMLElement | null) => {
      ctx.ankerRef.current = node;
      if (typeof ref === "function") ref(node as HTMLElement);
      else if (ref) (ref as React.MutableRefObject<HTMLElement | null>).current = node;
      const kindRef = (children as unknown as { ref?: React.Ref<HTMLElement> }).ref;
      if (typeof kindRef === "function") kindRef(node as HTMLElement);
      else if (kindRef) (kindRef as React.MutableRefObject<HTMLElement | null>).current = node;
    },
    onMouseEnter: (e: React.MouseEvent) => {
      ctx.oeffnen();
      children.props.onMouseEnter?.(e);
    },
    onMouseLeave: (e: React.MouseEvent) => {
      ctx.schliessen();
      children.props.onMouseLeave?.(e);
    },
    onFocus: (e: React.FocusEvent) => {
      // Nur bei Tastaturfokus zeigen – Mausklicks öffnen nichts.
      if ((e.target as HTMLElement).matches?.(":focus-visible")) ctx.oeffnen();
      children.props.onFocus?.(e);
    },
    onBlur: (e: React.FocusEvent) => {
      ctx.schliessen();
      children.props.onBlur?.(e);
    },
    onClick: (e: React.MouseEvent) => {
      ctx.schliessen();
      children.props.onClick?.(e);
    },
  } as Record<string, unknown>);
});
TooltipTrigger.displayName = "TooltipTrigger";

export function TooltipContent({
  children,
  className,
  side,
  sideOffset,
}: {
  children: React.ReactNode;
  className?: string;
  side?: "right" | "top" | "bottom" | "left";
  sideOffset?: number;
}) {
  const ctx = React.useContext(Kontext);
  const [pos, setPos] = React.useState<{ top: number; left: number } | null>(null);
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => setMounted(true), []);

  const seite = side ?? ctx?.side ?? "right";
  const versatz = sideOffset ?? ctx?.sideOffset ?? 10;

  React.useLayoutEffect(() => {
    if (!ctx?.offen || !ctx.ankerRef.current) return;
    const r = ctx.ankerRef.current.getBoundingClientRect();
    if (seite === "right") setPos({ top: r.top + r.height / 2, left: r.right + versatz });
    else if (seite === "left") setPos({ top: r.top + r.height / 2, left: r.left - versatz });
    else if (seite === "top") setPos({ top: r.top - versatz, left: r.left + r.width / 2 });
    else setPos({ top: r.bottom + versatz, left: r.left + r.width / 2 });
  }, [ctx?.offen, ctx?.ankerRef, seite, versatz]);

  if (!ctx?.offen || !mounted || !pos) return null;

  const verschiebung =
    seite === "right"
      ? "translate(0, -50%)"
      : seite === "left"
        ? "translate(-100%, -50%)"
        : seite === "top"
          ? "translate(-50%, -100%)"
          : "translate(-50%, 0)";

  return createPortal(
    <div
      role="tooltip"
      aria-hidden="true"
      style={{ top: pos.top, left: pos.left, transform: verschiebung }}
      className={cn(
        "pointer-events-none fixed z-popover flex items-center gap-1.5 rounded-md bg-foreground px-2.5 py-1.5 text-xs font-medium text-background shadow-md",
        "animate-fade-in",
        className,
      )}
    >
      {children}
    </div>,
    document.body,
  );
}
