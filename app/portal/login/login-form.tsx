"use client";

import { useState } from "react";
import { useFormState } from "react-dom";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/shared/submit-button";
import { FormMessage } from "@/components/shared/form-message";
import { cn } from "@/lib/utils";
import { portalAnmelden, portalRegistrieren, type PortalAuthState } from "../actions";

const initial: PortalAuthState = {};

export function PortalLoginForm() {
  const [tab, setTab] = useState<"anmelden" | "aktivieren">("anmelden");
  const [anmeldenState, anmeldenAction] = useFormState(portalAnmelden, initial);
  const [regState, regAction] = useFormState(portalRegistrieren, initial);

  const tabCls = (aktiv: boolean) =>
    cn(
      "flex-1 rounded-md py-2 text-sm font-medium transition-colors",
      aktiv ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground",
    );

  return (
    <div className="space-y-4">
      <div className="flex gap-1 rounded-lg bg-surface-muted p-1">
        <button type="button" className={tabCls(tab === "anmelden")} onClick={() => setTab("anmelden")}>
          Anmelden
        </button>
        <button type="button" className={tabCls(tab === "aktivieren")} onClick={() => setTab("aktivieren")}>
          Zugang aktivieren
        </button>
      </div>

      {tab === "anmelden" ? (
        <form action={anmeldenAction} className="space-y-4">
          <FormMessage error={anmeldenState.error} />
          <div className="space-y-2">
            <Label htmlFor="a-email">E-Mail</Label>
            <Input id="a-email" name="email" type="email" autoComplete="email" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="a-pw">Passwort</Label>
            <Input id="a-pw" name="passwort" type="password" autoComplete="current-password" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="a-code">Zugangscode (nur beim ersten Mal)</Label>
            <Input id="a-code" name="code" placeholder="z. B. 7KQ2AB" className="uppercase" />
          </div>
          <SubmitButton className="w-full">Anmelden</SubmitButton>
        </form>
      ) : (
        <form action={regAction} className="space-y-4">
          <FormMessage error={regState.error} message={regState.message} />
          {!regState.message && (
            <>
              <div className="space-y-2">
                <Label htmlFor="r-email">E-Mail</Label>
                <Input id="r-email" name="email" type="email" autoComplete="email" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="r-pw">Passwort</Label>
                <Input
                  id="r-pw"
                  name="passwort"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  placeholder="Mindestens 8 Zeichen"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="r-code">Zugangscode deiner Fahrschule</Label>
                <Input id="r-code" name="code" required placeholder="z. B. 7KQ2AB" className="uppercase" />
              </div>
              <SubmitButton className="w-full">Zugang aktivieren</SubmitButton>
            </>
          )}
        </form>
      )}
    </div>
  );
}
