"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PenLine } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SignaturePad } from "@/components/shared/signature-pad";
import { vertragUnterschreiben } from "./actions";

export function VertragSignatur({ schuelerId }: { schuelerId: string }) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const router = useRouter();

  function speichern(dataUrl: string) {
    start(async () => {
      const res = await vertragUnterschreiben({ schuelerId, unterschrift: dataUrl });
      if (res.error) {
        toast.error(res.error);
        return;
      }
      toast.success("Vertrag unterschrieben");
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button onClick={() => setOpen(true)}>
        <PenLine /> Jetzt unterschreiben
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ausbildungsvertrag unterschreiben</DialogTitle>
          <DialogDescription>
            Mit der Unterschrift bestätigt der/die Fahrschüler/in den Ausbildungsvertrag.
          </DialogDescription>
        </DialogHeader>
        <SignaturePad onSave={speichern} onCancel={() => setOpen(false)} busy={pending} />
      </DialogContent>
    </Dialog>
  );
}
