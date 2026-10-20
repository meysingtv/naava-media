import { Calendar, CheckCircle2, Clock, XCircle } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { FAHRSTUNDE_TYPEN } from "@/lib/constants";
import { formatDatum, formatUhrzeit } from "@/lib/utils";
import type { FahrstundeStatus, FahrstundeTyp } from "@/lib/types";
import { terminBestaetigen, terminAbsagen } from "./actions";

export const metadata = { title: "Termin bestätigen" };
export const dynamic = "force-dynamic";

type TokenRow = {
  datum: string;
  uhrzeit: string;
  dauer_minuten: number;
  typ: FahrstundeTyp;
  status: FahrstundeStatus;
  bestaetigt: boolean;
  abgesagt: boolean;
  fahrschule_name: string;
  schueler_vorname: string | null;
};

function Rahmen({ children, name }: { children: React.ReactNode; name?: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-4 py-10">
      <div className="w-full max-w-md">
        {name && <p className="mb-3 text-center text-[13px] font-semibold text-foreground">{name}</p>}
        <div className="rounded-2xl border bg-card p-6">{children}</div>
        <p className="mt-4 text-center text-[11px] text-muted-foreground">FahrschulApp · Termin­bestätigung</p>
      </div>
    </div>
  );
}

export default async function TerminSeite({ params }: { params: { token: string } }) {
  const supabase = createClient();
  const { data } = await supabase.rpc("termin_by_token", { p_token: params.token });
  const t = (data as TokenRow[] | null)?.[0] ?? null;

  if (!t) {
    return (
      <Rahmen>
        <div className="text-center">
          <XCircle className="mx-auto mb-3 h-10 w-10 text-muted-foreground" strokeWidth={1.5} />
          <h1 className="text-base font-semibold text-foreground">Termin nicht gefunden</h1>
          <p className="mt-1 text-[13px] text-muted-foreground">Dieser Link ist ungültig oder abgelaufen.</p>
        </div>
      </Rahmen>
    );
  }

  const typLabel = FAHRSTUNDE_TYPEN[t.typ]?.label ?? "Fahrstunde";
  const abgesagt = t.abgesagt || t.status === "ausgefallen";
  const anrede = t.schueler_vorname ? `Hallo ${t.schueler_vorname},` : "Hallo,";

  return (
    <Rahmen name={t.fahrschule_name}>
      <p className="text-[13px] text-foreground-secondary">{anrede}</p>
      <h1 className="mt-0.5 text-base font-semibold text-foreground">
        {abgesagt ? "dein Termin wurde abgesagt." : t.bestaetigt ? "danke – dein Termin ist bestätigt." : "bitte bestätige deinen Termin."}
      </h1>

      {/* Termin-Karte */}
      <div className="mt-4 space-y-2 rounded-xl border bg-surface-muted p-4">
        <div className="flex items-center gap-2 text-[15px] font-semibold text-foreground">
          <Calendar className="h-4 w-4 text-primary" strokeWidth={2} />
          {formatDatum(t.datum)}
        </div>
        <div className="flex items-center gap-2 text-[13px] text-foreground-secondary">
          <Clock className="h-4 w-4 text-muted-foreground" strokeWidth={1.75} />
          {formatUhrzeit(t.uhrzeit)} Uhr · {t.dauer_minuten} Min · {typLabel}
        </div>
      </div>

      {/* Status / Aktionen */}
      {abgesagt ? (
        <div className="mt-4 flex items-center gap-2 rounded-lg bg-destructive-soft px-3 py-2.5 text-[13px] font-medium text-destructive">
          <XCircle className="h-4 w-4" /> Termin abgesagt. Bitte melde dich bei der Fahrschule für einen neuen Termin.
        </div>
      ) : t.bestaetigt ? (
        <div className="mt-4 space-y-3">
          <div className="flex items-center gap-2 rounded-lg bg-success-soft px-3 py-2.5 text-[13px] font-medium text-success">
            <CheckCircle2 className="h-4 w-4" /> Zugesagt – wir sehen uns!
          </div>
          <form action={terminAbsagen}>
            <input type="hidden" name="token" value={params.token} />
            <button type="submit" className="w-full text-center text-xs font-medium text-muted-foreground underline underline-offset-4 hover:text-destructive">
              Doch absagen
            </button>
          </form>
        </div>
      ) : (
        <div className="mt-5 grid grid-cols-1 gap-2.5">
          <form action={terminBestaetigen}>
            <input type="hidden" name="token" value={params.token} />
            <button
              type="submit"
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary text-[15px] font-semibold text-primary-foreground transition-colors hover:bg-primary-hover"
            >
              <CheckCircle2 className="h-5 w-5" /> Termin zusagen
            </button>
          </form>
          <form action={terminAbsagen}>
            <input type="hidden" name="token" value={params.token} />
            <button
              type="submit"
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-border-strong bg-card text-[15px] font-medium text-foreground transition-colors hover:bg-surface-muted hover:text-destructive"
            >
              <XCircle className="h-5 w-5" /> Absagen
            </button>
          </form>
        </div>
      )}
    </Rahmen>
  );
}
