"use client";

import * as React from "react";
import { useFormState } from "react-dom";
import { Plus } from "lucide-react";
import { toast } from "sonner";

import { Button, type ButtonProps } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FormMessage } from "@/components/shared/form-message";
import { SubmitButton } from "@/components/shared/submit-button";

interface Zustand {
  ok?: boolean;
  error?: string;
}

type Aktion = (state: Zustand, formData: FormData) => Promise<Zustand>;

interface FormularDialogProps {
  /** Server-Aktion im `useFormState`-Format. */
  action: Aktion;
  /** Beschriftung des Auslösers (mit Plus davor). */
  ausloeser: string;
  ausloeserVariante?: ButtonProps["variant"];
  titel: string;
  beschreibung: string;
  speichernLabel?: string;
  /** Meldung nach erfolgreichem Speichern. */
  erfolg: string;
  size?: "sm" | "md" | "lg" | "xl";
  children: React.ReactNode;
}

/**
 * „Neu"-Dialog v4: kleiner Auslöser mit Plus, Kopf mit Titel und einem Satz,
 * Felder im scrollbaren Inhalt, unten Abbrechen und Speichern (⌘Enter).
 * Das Formular wird bei jedem Öffnen frisch aufgebaut – keine Reste vom
 * letzten Mal, weder Eingaben noch Fehlermeldungen.
 */
export function FormularDialog({
  action,
  ausloeser,
  ausloeserVariante = "default",
  titel,
  beschreibung,
  speichernLabel = "Anlegen",
  erfolg,
  size = "md",
  children,
}: FormularDialogProps) {
  const [offen, setOffen] = React.useState(false);

  return (
    <Dialog open={offen} onOpenChange={setOffen}>
      <Button size="sm" variant={ausloeserVariante} onClick={() => setOffen(true)}>
        <Plus /> {ausloeser}
      </Button>
      <DialogContent size={size}>
        <DialogHeader>
          <DialogTitle>{titel}</DialogTitle>
          <DialogDescription>{beschreibung}</DialogDescription>
        </DialogHeader>
        <Formular action={action} erfolg={erfolg} speichernLabel={speichernLabel} schliessen={() => setOffen(false)}>
          {children}
        </Formular>
      </DialogContent>
    </Dialog>
  );
}

function Formular({
  action,
  erfolg,
  speichernLabel,
  schliessen,
  children,
}: {
  action: Aktion;
  erfolg: string;
  speichernLabel: string;
  schliessen: () => void;
  children: React.ReactNode;
}) {
  const [state, formAction] = useFormState(action, {});

  React.useEffect(() => {
    if (state.ok) {
      toast.success(erfolg);
      schliessen();
    }
    // Nur auf ein neues Ergebnis der Aktion reagieren.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <form action={formAction} data-slot="form">
      <DialogBody>
        <FormMessage error={state.error} />
        {children}
      </DialogBody>
      <DialogFooter>
        <Button type="button" variant="outline" size="sm" onClick={schliessen}>
          Abbrechen
        </Button>
        <SubmitButton size="sm" data-primary>
          {speichernLabel}
        </SubmitButton>
      </DialogFooter>
    </form>
  );
}
