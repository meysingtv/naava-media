"use client";

import { useRef, useState } from "react";
import { ImagePlus, X } from "lucide-react";

import { Button } from "@/components/ui/button";

/**
 * Logo-Auswahl: liest ein Bild als Data-URL ein und legt es in ein verstecktes
 * Feld (Standardname `logo_url`). So braucht es keinen Storage-Bucket.
 */
export function LogoUpload({
  defaultValue,
  name = "logo_url",
}: {
  defaultValue?: string | null;
  name?: string;
}) {
  const [wert, setWert] = useState(defaultValue ?? "");
  const [fehler, setFehler] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setFehler("Bitte ein Bild auswählen (PNG, JPG, …).");
      return;
    }
    if (file.size > 150 * 1024) {
      setFehler("Bild zu groß (max. 150 KB). Bitte ein kleineres Logo verwenden.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setWert(String(reader.result));
      setFehler(null);
    };
    reader.readAsDataURL(file);
  }

  function entfernen() {
    setWert("");
    setFehler(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className="space-y-2">
      <input type="hidden" name={name} value={wert} />
      <div className="flex items-center gap-3">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-surface">
          {wert ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={wert} alt="Logo" className="h-full w-full object-contain" />
          ) : (
            <ImagePlus className="h-5 w-5 text-muted-foreground" strokeWidth={1.75} />
          )}
        </span>
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()}>
            {wert ? "Logo ändern" : "Logo hochladen"}
          </Button>
          {wert && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={entfernen}
              className="text-muted-foreground hover:text-destructive"
            >
              <X /> Entfernen
            </Button>
          )}
        </div>
        <input ref={inputRef} type="file" accept="image/*" onChange={onFile} className="hidden" />
      </div>
      {fehler && <p className="text-xs text-destructive">{fehler}</p>}
      <p className="text-xs text-muted-foreground">
        PNG/JPG, klein halten (max. 150 KB). Wird oben links angezeigt.
      </p>
    </div>
  );
}
