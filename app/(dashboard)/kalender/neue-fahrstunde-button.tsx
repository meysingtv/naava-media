"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { FahrstundeDialog, type Option } from "./fahrstunde-dialog";

export function NeueFahrstundeButton({
  options,
  defaultDatum,
}: {
  options: { schueler: Option[]; fahrlehrer: Option[]; fahrzeuge: Option[] };
  defaultDatum: string;
}) {
  const [open, setOpen] = useState(false);
  const [key, setKey] = useState(0);

  function oeffnen() {
    setKey((k) => k + 1);
    setOpen(true);
  }

  return (
    <>
      <Button onClick={oeffnen}>
        <Plus /> Neue Fahrstunde
      </Button>
      <FahrstundeDialog
        key={key}
        open={open}
        onOpenChange={setOpen}
        options={options}
        initial={{ datum: defaultDatum }}
      />
    </>
  );
}
