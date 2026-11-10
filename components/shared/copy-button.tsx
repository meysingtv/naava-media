"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

import { Button } from "@/components/ui/button";

/** Kopieren-Button v3: Ghost in Buttongröße `xs`, Bestätigung für 1,5 s. */
export function CopyButton({
  text,
  label,
  className,
}: {
  text: string;
  label?: string;
  className?: string;
}) {
  const [kopiert, setKopiert] = useState(false);

  async function kopieren() {
    try {
      await navigator.clipboard.writeText(text);
      setKopiert(true);
      setTimeout(() => setKopiert(false), 1500);
    } catch {
      /* Zwischenablage nicht verfügbar */
    }
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="xs"
      onClick={kopieren}
      className={className}
      aria-label={`${label ?? "Wert"} kopieren`}
    >
      {kopiert ? <Check className="text-success" strokeWidth={2} /> : <Copy strokeWidth={1.75} />}
      {kopiert ? "Kopiert" : "Kopieren"}
    </Button>
  );
}
