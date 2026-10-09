"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const HINWEIS = "Das lässt sich nicht rückgängig machen.";

/**
 * Löschen mit Rückfrage v4: Auslöser als neutraler Rahmen-Knopf, der erst
 * beim Überfahren rot wird; Dialog in `size="sm"`. Fehlt der Hinweis
 * „nicht rückgängig", wird er angehängt.
 */
export function LoeschenDialog({
  action,
  id,
  titel,
  beschreibung,
  buttonLabel = "Löschen",
}: {
  action: (formData: FormData) => void | Promise<void>;
  id: string;
  titel: string;
  beschreibung: string;
  buttonLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const nurIcon = buttonLabel.trim() === "";
  const text = beschreibung.toLowerCase().includes("rückgängig")
    ? beschreibung
    : `${beschreibung} ${HINWEIS}`;

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size={nurIcon ? "icon-sm" : "sm"}
        className="text-foreground-secondary hover:bg-destructive-soft hover:text-destructive-text"
        aria-label={nurIcon ? "Löschen" : undefined}
        onClick={() => setOpen(true)}
      >
        <Trash2 strokeWidth={1.75} />
        {!nurIcon && buttonLabel}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>{titel}</DialogTitle>
            <DialogDescription>{text}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Abbrechen</Button>
            </DialogClose>
            <form action={action}>
              <input type="hidden" name="id" value={id} />
              <Button type="submit" variant="destructive" data-primary>
                Endgültig löschen
              </Button>
            </form>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
