"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Download, FileText, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";

import { Abschnitt, AbschnittLeer } from "@/components/ui/abschnitt";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { dokumentHochladen, dokumentLoeschen } from "./akte-actions";

interface Dok {
  id: string;
  name: string;
  kategorie: string | null;
  mime: string | null;
  groesse: number | null;
  datei: string;
}

function groesseText(n: number | null): string {
  if (!n) return "";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

export function DokumenteBox({ schuelerId, dokumente }: { schuelerId: string; dokumente: Dok[] }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, start] = useTransition();
  const [kategorie, setKategorie] = useState("");
  const router = useRouter();

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 1.5 * 1024 * 1024) {
      toast.error("Datei zu groß (max. 1,5 MB).");
      if (inputRef.current) inputRef.current.value = "";
      return;
    }
    const reader = new FileReader();
    reader.onload = () =>
      start(async () => {
        const res = await dokumentHochladen({
          schuelerId,
          name: file.name,
          kategorie: kategorie || undefined,
          mime: file.type,
          groesse: file.size,
          datei: String(reader.result),
        });
        if (res.error) toast.error(res.error);
        else {
          toast.success("Dokument hochgeladen");
          router.refresh();
        }
        if (inputRef.current) inputRef.current.value = "";
      });
    reader.readAsDataURL(file);
  }

  return (
    <Abschnitt
      titel="Dateien"
      meta={dokumente.length ? `${dokumente.length}` : undefined}
      aktion={
        <div className="flex items-center gap-2">
          <Input
            inputSize="sm"
            value={kategorie}
            onChange={(e) => setKategorie(e.target.value)}
            placeholder="Kategorie, z. B. Sehtest"
            aria-label="Kategorie"
            className="w-48"
          />
          <input ref={inputRef} type="file" onChange={onFile} className="hidden" />
          <Button type="button" variant="outline" size="sm" disabled={pending} onClick={() => inputRef.current?.click()}>
            <Upload /> {pending ? "Lädt …" : "Hochladen"}
          </Button>
        </div>
      }
      rahmen
    >
      {dokumente.length === 0 ? (
        <AbschnittLeer>Noch keine Dateien. Sehtest, Passbild und andere Nachweise hier ablegen.</AbschnittLeer>
      ) : (
        <ul className="divide-y divide-border">
          {dokumente.map((d) => (
            <li key={d.id} className="flex items-center gap-3 px-4 py-2.5">
              <FileText className="h-4 w-4 shrink-0 text-foreground-tertiary" strokeWidth={1.75} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-13 font-medium text-foreground">{d.name}</p>
                <p className="truncate text-xs text-foreground-secondary">
                  {d.kategorie ? `${d.kategorie} · ` : ""}
                  {groesseText(d.groesse)}
                </p>
              </div>
              <a
                href={d.datei}
                download={d.name}
                aria-label="Herunterladen"
                className="flex h-7 w-7 items-center justify-center rounded-md text-foreground-tertiary transition-colors hover:bg-muted hover:text-foreground"
              >
                <Download className="h-4 w-4" strokeWidth={1.75} />
              </a>
              <form action={dokumentLoeschen}>
                <input type="hidden" name="id" value={d.id} />
                <button
                  type="submit"
                  aria-label="Löschen"
                  className="flex h-7 w-7 items-center justify-center rounded-md text-foreground-tertiary transition-colors hover:bg-destructive-soft hover:text-destructive-text"
                >
                  <Trash2 className="h-4 w-4" strokeWidth={1.75} />
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </Abschnitt>
  );
}
