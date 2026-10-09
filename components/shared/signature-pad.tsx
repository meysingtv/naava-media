"use client";

import { useEffect, useRef, useState } from "react";
import { Eraser } from "lucide-react";

import { Button } from "@/components/ui/button";

/**
 * Einfaches Unterschriften-Feld auf Canvas-Basis. Liefert beim Übernehmen
 * eine PNG-Data-URL. Funktioniert mit Maus, Finger und Stift (Pointer Events).
 */
export function SignaturePad({
  onSave,
  onCancel,
  busy,
}: {
  onSave: (dataUrl: string) => void;
  onCancel?: () => void;
  busy?: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const zeichnet = useRef(false);
  const letzter = useRef<{ x: number; y: number } | null>(null);
  const [leer, setLeer] = useState(true);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    ctx.lineWidth = 2.2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#0B1220";
  }, []);

  function pos(e: React.PointerEvent<HTMLCanvasElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function start(e: React.PointerEvent<HTMLCanvasElement>) {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    zeichnet.current = true;
    letzter.current = pos(e);
  }
  function move(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!zeichnet.current) return;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx || !letzter.current) return;
    const p = pos(e);
    ctx.beginPath();
    ctx.moveTo(letzter.current.x, letzter.current.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    letzter.current = p;
    if (leer) setLeer(false);
  }
  function ende() {
    zeichnet.current = false;
    letzter.current = null;
  }

  function loeschen() {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setLeer(true);
  }

  function uebernehmen() {
    const canvas = canvasRef.current;
    if (!canvas || leer) return;
    onSave(canvas.toDataURL("image/png"));
  }

  return (
    <div className="space-y-3">
      <div className="relative rounded-lg border border-border-strong bg-surface">
        <canvas
          ref={canvasRef}
          onPointerDown={start}
          onPointerMove={move}
          onPointerUp={ende}
          onPointerLeave={ende}
          className="h-44 w-full touch-none rounded-lg"
        />
        {leer && (
          <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
            Hier unterschreiben
          </span>
        )}
        <span className="pointer-events-none absolute inset-x-6 bottom-8 border-b border-dashed border-border-strong" />
      </div>
      <div className="flex items-center justify-between gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={loeschen} disabled={busy}>
          <Eraser /> Löschen
        </Button>
        <div className="flex gap-2">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel} disabled={busy}>
              Abbrechen
            </Button>
          )}
          <Button type="button" onClick={uebernehmen} disabled={leer || busy}>
            Übernehmen
          </Button>
        </div>
      </div>
    </div>
  );
}
