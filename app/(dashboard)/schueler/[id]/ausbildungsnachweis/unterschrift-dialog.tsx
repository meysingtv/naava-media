"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, PenLine } from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SignaturePad } from "@/components/shared/signature-pad";
import { unterschriftSpeichern } from "./actions";

export function UnterschriftDialog({
  fahrstundeId,
  schuelerId,
  vorhanden,
  label,
}: {
  fahrstundeId: string;
  schuelerId: string;
  vorhanden: boolean;
  label: string;
}) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const router = useRouter();

  function speichern(dataUrl: string) {
    start(async () => {
      const res = await unterschriftSpeichern({ fahrstundeId, schuelerId, unterschrift: dataUrl });
      if (res.error) {
        toast.error(res.error);
        return;
      }
      toast.success("Unterschrift gespeichert");
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={
          vorhanden
            ? "inline-flex items-center gap-1 text-xs font-medium text-success"
            : "inline-flex items-center gap-1 rounded-md border border-border-strong px-2 py-1 text-xs font-medium text-foreground-secondary transition-colors hover:bg-surface"
        }
      >
        {vorhanden ? (
          <>
            <Check className="h-3.5 w-3.5" /> unterschrieben
          </>
        ) : (
          <>
            <PenLine className="h-3.5 w-3.5" /> unterschreiben
          </>
        )}
      </button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Unterschrift Fahrschüler</DialogTitle>
          <DialogDescription>{label}</DialogDescription>
        </DialogHeader>
        <SignaturePad onSave={speichern} onCancel={() => setOpen(false)} busy={pending} />
      </DialogContent>
    </Dialog>
  );
}
