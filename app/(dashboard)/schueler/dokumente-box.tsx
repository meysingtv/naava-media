"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Download, FileText, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0 p-4 pb-2">
        <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Dokumente
        </CardTitle>
        <FileText className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent className="space-y-3 p-4 pt-0">
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={kategorie}
            onChange={(e) => setKategorie(e.target.value)}
            placeholder="Kategorie (z. B. Sehtest)"
            className="h-9 flex-1 rounded-md border border-border-strong bg-background px-3 text-sm shadow-xs focus-visible:border-primary focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary/20"
          />
          <input ref={inputRef} type="file" onChange={onFile} className="hidden" />
          <Button type="button" size="sm" disabled={pending} onClick={() => inputRef.current?.click()}>
            <Upload /> {pending ? "Lädt …" : "Hochladen"}
          </Button>
        </div>

        {dokumente.length === 0 ? (
          <p className="rounded-md border border-dashed border-border-strong py-6 text-center text-sm text-muted-foreground">
            Noch keine Dokumente. Sehtest, Passbild &amp; Co. hier ablegen.
          </p>
        ) : (
          <div className="divide-y rounded-md border">
            {dokumente.map((d) => (
              <div key={d.id} className="flex items-center gap-2.5 px-3 py-2">
                <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{d.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {d.kategorie ? `${d.kategorie} · ` : ""}
                    {groesseText(d.groesse)}
                  </p>
                </div>
                <a
                  href={d.datei}
                  download={d.name}
                  aria-label="Herunterladen"
                  className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-surface hover:text-foreground"
                >
                  <Download className="h-4 w-4" />
                </a>
                <form action={dokumentLoeschen}>
                  <input type="hidden" name="id" value={d.id} />
                  <button
                    type="submit"
                    aria-label="Löschen"
                    className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive-soft hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </form>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
