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

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size={nurIcon ? "icon-sm" : "sm"}
        aria-label={nurIcon ? "Löschen" : undefined}
        onClick={() => setOpen(true)}
        className="text-destructive hover:border-destructive/30 hover:bg-destructive-soft hover:text-destructive"
      >
        <Trash2 />
        {!nurIcon && buttonLabel}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{titel}</DialogTitle>
            <DialogDescription>{beschreibung}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Abbrechen</Button>
            </DialogClose>
            <form action={action}>
              <input type="hidden" name="id" value={id} />
              <Button type="submit" variant="destructive">
                Endgültig löschen
              </Button>
            </form>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
