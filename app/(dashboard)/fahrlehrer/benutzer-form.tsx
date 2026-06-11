"use client";

import { useState } from "react";
import { useFormState } from "react-dom";
import {
  ArrowLeft,
  Check,
  Eye,
  EyeOff,
  GraduationCap,
  KeyRound,
  Lock,
  Mail,
  StickyNote,
  User,
  X,
} from "lucide-react";

import { benutzerSpeichern, type BenutzerState } from "./actions";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/shared/submit-button";
import { FormMessage } from "@/components/shared/form-message";
import { FUEHRERSCHEINKLASSEN, ROLLEN, ROLLEN_BESCHREIBUNG } from "@/lib/constants";
import { cn, initialen } from "@/lib/utils";
import type { Fahrlehrer, FahrlehrerRolle } from "@/lib/types";

const initialState: BenutzerState = {};

const feld =
  "h-11 w-full rounded-lg border border-input bg-background px-3.5 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary/50 focus:ring-4 focus:ring-primary/10";

const label = "mb-1.5 block text-sm font-medium text-foreground/80";

/** Eine Sektion im neuen, ruhigeren Karten-Design. */
function Sektion({
  icon: Icon,
  titel,
  beschreibung,
  children,
}: {
  icon: typeof User;
  titel: string;
  beschreibung?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border bg-card shadow-sm">
      <div className="flex items-center gap-3 border-b px-6 py-4">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Icon className="h-[18px] w-[18px]" />
        </span>
        <div>
          <h2 className="text-base font-semibold leading-none tracking-tight">{titel}</h2>
          {beschreibung && <p className="mt-1 text-sm text-muted-foreground">{beschreibung}</p>}
        </div>
      </div>
      <div className="p-6">{children}</div>
    </section>
  );
}

function F({ children, label: text, req }: { children: React.ReactNode; label: string; req?: boolean }) {
  return (
    <div className="min-w-0">
      <label className={label}>
        {text}
        {req && <span className="text-destructive"> *</span>}
      </label>
      {children}
    </div>
  );
}

export function BenutzerForm({
  benutzer,
  istSelbst = false,
}: {
  benutzer?: Fahrlehrer;
  istSelbst?: boolean;
}) {
  const [state, action] = useFormState(benutzerSpeichern, initialState);
  const [vorname, setVorname] = useState(benutzer?.vorname ?? "");
  const [nachname, setNachname] = useState(benutzer?.nachname ?? "");
  const [kuerzel, setKuerzel] = useState(benutzer?.kuerzel ?? "");
  const [rolle, setRolle] = useState<FahrlehrerRolle>(benutzer?.rolle ?? "fahrlehrer");
  const [klassen, setKlassen] = useState<string[]>(benutzer?.fuehrerscheinklassen ?? []);
  const [pwSichtbar, setPwSichtbar] = useState(false);
  const [einladen, setEinladen] = useState(false);

  const istBearbeiten = Boolean(benutzer);
  const hatLogin = Boolean(benutzer?.user_id);
  const abbrechenHref = benutzer ? `/fahrlehrer?id=${benutzer.id}` : "/fahrlehrer";
  const titel = istBearbeiten ? "Benutzer bearbeiten" : "Neuer Benutzer";
  const avatar = kuerzel.trim() || initialen(vorname, nachname);

  function toggleKlasse(k: string) {
    setKlassen((p) => (p.includes(k) ? p.filter((x) => x !== k) : [...p, k]));
  }

  return (
    <form action={action} className="pb-16">
      {benutzer && <input type="hidden" name="id" value={benutzer.id} />}
      {klassen.map((k) => (
        <input key={k} type="hidden" name="klassen" value={k} />
      ))}

      {/* Kopfleiste – Buttons oben rechts in der Ecke */}
      <div className="sticky top-0 z-20 -mx-4 mb-6 border-b bg-background/80 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <a
              href={abbrechenHref}
              aria-label="Zurück"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border bg-card text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
            </a>
            <h1 className="truncate text-lg font-bold tracking-tight">{titel}</h1>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Button asChild variant="outline" size="sm" type="button">
              <a href={abbrechenHref}>
                <X className="h-4 w-4" /> Abbrechen
              </a>
            </Button>
            <SubmitButton size="sm">
              <Check className="h-4 w-4" /> Speichern
            </SubmitButton>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-4xl space-y-6">
        {state.error && <FormMessage error={state.error} />}

        {/* Identität */}
        <Sektion icon={User} titel="Persönliche Daten" beschreibung="Name, Kürzel und Rolle des Benutzers.">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
            <div className="flex flex-col items-center gap-2">
              <span className="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10 text-2xl font-bold text-primary">
                {avatar}
              </span>
              <span className="text-xs text-muted-foreground">Vorschau</span>
            </div>
            <div className="grid flex-1 grid-cols-1 gap-4 sm:grid-cols-2">
              <F label="Vorname" req>
                <input
                  name="vorname"
                  required
                  value={vorname}
                  onChange={(e) => setVorname(e.target.value)}
                  className={feld}
                />
              </F>
              <F label="Nachname" req>
                <input
                  name="nachname"
                  required
                  value={nachname}
                  onChange={(e) => setNachname(e.target.value)}
                  className={feld}
                />
              </F>
              <F label="Kürzel">
                <input
                  name="kuerzel"
                  value={kuerzel}
                  onChange={(e) => setKuerzel(e.target.value)}
                  placeholder="z. B. NW"
                  className={feld}
                />
              </F>
              <div>
                <label className={label}>
                  Rolle <span className="text-destructive">*</span>
                </label>
                {istSelbst ? (
                  <>
                    {/* Eigene Rolle ist gesperrt – Wert wird serverseitig beibehalten. */}
                    <div className="flex h-11 items-center gap-2 rounded-lg border border-dashed bg-muted/40 px-3.5 text-sm text-muted-foreground">
                      <Lock className="h-4 w-4" />
                      {ROLLEN[rolle]}
                    </div>
                    <p className="mt-1.5 text-xs text-muted-foreground">
                      Deine eigene Rolle kannst du nicht ändern.
                    </p>
                  </>
                ) : (
                  <>
                    <select
                      name="rolle"
                      value={rolle}
                      onChange={(e) => setRolle(e.target.value as FahrlehrerRolle)}
                      className={feld}
                    >
                      {(Object.keys(ROLLEN) as FahrlehrerRolle[]).map((r) => (
                        <option key={r} value={r}>
                          {ROLLEN[r]}
                        </option>
                      ))}
                    </select>
                    <p className="mt-1.5 text-xs text-muted-foreground">{ROLLEN_BESCHREIBUNG[rolle]}</p>
                  </>
                )}
              </div>
            </div>
          </div>
        </Sektion>

        {/* Kontakt & Adresse */}
        <Sektion icon={Mail} titel="Kontakt & Adresse" beschreibung="Erreichbarkeit und Anschrift.">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <F label="E-Mail">
                <input name="email" type="email" defaultValue={benutzer?.email ?? undefined} className={feld} />
              </F>
            </div>
            <F label="Telefon mobil">
              <input name="telefon" type="tel" defaultValue={benutzer?.telefon ?? undefined} className={feld} />
            </F>
            <F label="Telefon privat">
              <input
                name="telefon_privat"
                type="tel"
                defaultValue={benutzer?.telefon_privat ?? undefined}
                className={feld}
              />
            </F>
            <div className="sm:col-span-2">
              <F label="Straße & Nr.">
                <input name="strasse" defaultValue={benutzer?.strasse ?? undefined} className={feld} />
              </F>
            </div>
            <F label="PLZ">
              <input name="plz" inputMode="numeric" defaultValue={benutzer?.plz ?? undefined} className={feld} />
            </F>
            <F label="Ort">
              <input name="ort" defaultValue={benutzer?.ort ?? undefined} className={feld} />
            </F>
            <F label="Geburtsdatum">
              <input
                name="geburtsdatum"
                type="date"
                defaultValue={benutzer?.geburtsdatum ?? undefined}
                className={feld}
              />
            </F>
            <F label="Geburtsort">
              <input name="geburtsort" defaultValue={benutzer?.geburtsort ?? undefined} className={feld} />
            </F>
          </div>
        </Sektion>

        {/* Login & Passwort */}
        <Sektion
          icon={KeyRound}
          titel="Login & Passwort"
          beschreibung={
            istBearbeiten
              ? "Vergib ein neues Passwort. Leer lassen, um das bestehende zu behalten."
              : "Lege optional direkt ein Passwort fest, damit sich der Benutzer anmelden kann."
          }
        >
          <div className="space-y-4">
            <div className="max-w-md">
              <F label={istBearbeiten ? "Neues Passwort" : "Passwort"}>
                <div className="relative">
                  <input
                    name="passwort"
                    type={pwSichtbar ? "text" : "password"}
                    autoComplete="new-password"
                    minLength={6}
                    placeholder="Mind. 6 Zeichen"
                    className={cn(feld, "pr-11")}
                  />
                  <button
                    type="button"
                    onClick={() => setPwSichtbar((v) => !v)}
                    aria-label={pwSichtbar ? "Passwort verbergen" : "Passwort anzeigen"}
                    className="absolute right-1 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {pwSichtbar ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </F>
            </div>

            {istBearbeiten && !hatLogin && (
              <p className="text-xs text-muted-foreground">
                Dieser Benutzer hat noch keinen Login-Zugang. Vergib eine E-Mail und ein Passwort, um ihn zu
                aktivieren.
              </p>
            )}

            {!istBearbeiten && (
              <label className="flex items-start gap-2.5 rounded-lg border bg-muted/30 p-3 text-sm">
                <input
                  type="checkbox"
                  name="einladen"
                  checked={einladen}
                  onChange={(e) => setEinladen(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-input text-primary focus:ring-ring"
                />
                <span>
                  <span className="font-medium">Stattdessen per E-Mail einladen</span>
                  <span className="block text-xs text-muted-foreground">
                    Der Benutzer legt sein Passwort selbst fest (E-Mail erforderlich).
                  </span>
                </span>
              </label>
            )}
          </div>
        </Sektion>

        {/* Ausbildungsklassen */}
        <Sektion
          icon={GraduationCap}
          titel="Ausbildungsklassen"
          beschreibung="Klassen, die dieser Benutzer als Fahrlehrer ausbildet."
        >
          <div className="flex flex-wrap gap-2">
            {FUEHRERSCHEINKLASSEN.map((k) => {
              const aktiv = klassen.includes(k);
              return (
                <button
                  key={k}
                  type="button"
                  onClick={() => toggleKlasse(k)}
                  className={cn(
                    "rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors",
                    aktiv
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-input bg-background hover:bg-accent",
                  )}
                >
                  {k}
                </button>
              );
            })}
          </div>
        </Sektion>

        {/* Notiz */}
        <Sektion icon={StickyNote} titel="Notiz" beschreibung="Interne Anmerkungen zu diesem Benutzer.">
          <textarea
            name="notiz"
            rows={4}
            defaultValue={benutzer?.notiz ?? undefined}
            placeholder="Notiz …"
            className={cn(feld, "h-auto py-2.5")}
          />
        </Sektion>
      </div>
    </form>
  );
}
