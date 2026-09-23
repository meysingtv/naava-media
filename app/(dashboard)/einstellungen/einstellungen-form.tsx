"use client";

import { useEffect } from "react";
import { useFormState } from "react-dom";
import { toast } from "sonner";

import { fahrschuleAktualisieren, type EinstellungenState } from "./actions";
import { Field } from "@/components/ui/field";
import { FeldGitter } from "@/components/ui/formular";
import { Input } from "@/components/ui/input";
import { FormMessage } from "@/components/shared/form-message";
import { LogoUpload } from "@/components/shared/logo-upload";
import { SubmitButton } from "@/components/shared/submit-button";
import type { Fahrschule } from "@/lib/types";

const initial: EinstellungenState = {};

/** Weiße Karte mit Titel und einem Satz Erklärung – ein Abschnitt der Einstellungen. */
export function EinstellungsKarte({
  titel,
  beschreibung,
  children,
}: {
  titel: string;
  beschreibung?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl bg-card shadow-panel">
      <header className="border-b border-border px-5 py-4 sm:px-6">
        <h2 className="text-[15px] font-semibold text-foreground">{titel}</h2>
        {beschreibung && <p className="mt-0.5 text-13 text-foreground-secondary">{beschreibung}</p>}
      </header>
      <div className="px-5 py-5 sm:px-6">{children}</div>
    </section>
  );
}

function Formular({ children }: { children: React.ReactNode }) {
  const [state, action] = useFormState(fahrschuleAktualisieren, initial);

  useEffect(() => {
    if (state.message) toast.success(state.message);
  }, [state]);

  return (
    <form action={action}>
      {/* Eigener Abstands-Container: React legt für Server-Aktionen versteckte Felder in das Formular. */}
      <div className="space-y-6">
        <FormMessage error={state.error} />
        {children}
        <div className="flex justify-end">
          <SubmitButton size="sm">Änderungen speichern</SubmitButton>
        </div>
      </div>
    </form>
  );
}

/** Name, Anschrift, Logo und Kontakt der Fahrschule. */
export function FahrschuleForm({ fahrschule }: { fahrschule: Fahrschule }) {
  return (
    <Formular>
      <EinstellungsKarte titel="Fahrschule" beschreibung="Erscheint auf Rechnungen, Verträgen und im Schülerportal.">
        <FeldGitter>
          <Field label="Name der Fahrschule" required className="sm:col-span-2">
            <Input name="name" required defaultValue={fahrschule.name} />
          </Field>
          <Field label="Straße und Hausnummer" className="sm:col-span-2">
            <Input name="strasse" defaultValue={fahrschule.strasse ?? undefined} />
          </Field>
          <Field label="PLZ">
            <Input name="plz" inputMode="numeric" defaultValue={fahrschule.plz ?? undefined} />
          </Field>
          <Field label="Ort">
            <Input name="ort" defaultValue={fahrschule.ort ?? undefined} />
          </Field>
        </FeldGitter>
        <div className="mt-5 border-t border-border pt-5">
          <p className="mb-1.5 text-13 font-medium text-foreground">Logo</p>
          <LogoUpload defaultValue={fahrschule.logo_url} />
        </div>
      </EinstellungsKarte>

      <EinstellungsKarte titel="Kontakt" beschreibung="So erreichen dich Schüler und Kostenträger.">
        <FeldGitter>
          <Field label="Telefon">
            <Input name="telefon" type="tel" defaultValue={fahrschule.telefon ?? undefined} />
          </Field>
          <Field label="E-Mail">
            <Input name="email" type="email" defaultValue={fahrschule.email ?? undefined} />
          </Field>
          <Field label="Website" className="sm:col-span-2">
            <Input name="website" placeholder="https://" defaultValue={fahrschule.website ?? undefined} />
          </Field>
        </FeldGitter>
      </EinstellungsKarte>
    </Formular>
  );
}

/** Bankverbindung, Steuernummer, SEPA-Gläubigerdaten und Zahlungslink. */
export function ZahlungForm({ fahrschule }: { fahrschule: Fahrschule }) {
  return (
    <Formular>
      <EinstellungsKarte titel="Bankverbindung und Steuer" beschreibung="Steht im Fuß jeder Rechnung.">
        <FeldGitter>
          <Field label="IBAN" className="sm:col-span-2">
            <Input name="iban" defaultValue={fahrschule.iban ?? undefined} placeholder="DE00 0000 0000 0000 0000 00" />
          </Field>
          <Field label="Kontoinhaber">
            <Input name="kontoinhaber" placeholder="z. B. Fahrschule Müller GmbH" defaultValue={fahrschule.kontoinhaber ?? undefined} />
          </Field>
          <Field label="BIC" hint="Optional">
            <Input name="bic" defaultValue={fahrschule.bic ?? undefined} />
          </Field>
          <Field label="Steuernummer" className="sm:col-span-2">
            <Input name="steuernummer" defaultValue={fahrschule.steuernummer ?? undefined} />
          </Field>
        </FeldGitter>
      </EinstellungsKarte>

      <EinstellungsKarte titel="SEPA-Lastschrift" beschreibung="Nötig, um Rechnungen im Rechnungslauf per Lastschrift einzuziehen.">
        <Field label="Gläubiger-Identifikationsnummer" hint="Bei der Bundesbank kostenlos beantragbar, z. B. DE98ZZZ09999999999">
          <Input name="glaeubiger_id" defaultValue={fahrschule.glaeubiger_id ?? undefined} />
        </Field>
      </EinstellungsKarte>

      <EinstellungsKarte titel="Online bezahlen" beschreibung="Im Schülerportal erscheint dann ein Knopf „Online bezahlen“. Ohne Link zeigt das Portal die Überweisungsdaten.">
        <Field label="Zahlungslink" hint="z. B. ein Stripe-Zahlungslink oder paypal.me/deinefahrschule">
          <Input name="zahlungslink" placeholder="https://" defaultValue={fahrschule.zahlungslink ?? undefined} />
        </Field>
      </EinstellungsKarte>
    </Formular>
  );
}
