"use client";

import { useRef, useState } from "react";
import { ImagePlus, X } from "lucide-react";

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
        <span className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-muted">
          {wert ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={wert} alt="Logo" className="h-full w-full object-contain" />
          ) : (
            <ImagePlus className="h-5 w-5 text-muted-foreground" />
          )}
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="rounded-md border bg-background px-3 py-1.5 text-sm font-medium transition-colors hover:bg-accent"
          >
            {wert ? "Logo ändern" : "Logo hochladen"}
          </button>
          {wert && (
            <button
              type="button"
              onClick={entfernen}
              className="flex items-center gap-1 rounded-md px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:text-destructive"
            >
              <X className="h-4 w-4" /> Entfernen
            </button>
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
