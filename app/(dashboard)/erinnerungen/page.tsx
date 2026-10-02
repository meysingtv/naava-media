import { headers } from "next/headers";

import { createClient } from "@/lib/supabase/server";
import { getKontext } from "@/lib/supabase/queries";
import { KpiCard, KpiRow } from "@/components/ui/kpi-card";
import { PageHeader } from "@/components/shared/page-header";
import { heuteBerlin, plusTage } from "@/lib/zeit";
import type { Fahrschueler, Fahrstunde } from "@/lib/types";
import { ErinnerungenListe, type ErinnerungItem } from "./erinnerungen-liste";

export const metadata = { title: "Erinnerungen · FahrschulApp" };

type Row = Pick<
  Fahrstunde,
  "id" | "datum" | "uhrzeit" | "dauer_minuten" | "typ" | "bestaetigung_token" | "bestaetigt_am" | "abgesagt_am" | "erinnerung_gesendet_am"
> & {
  fahrschueler: Pick<Fahrschueler, "vorname" | "nachname" | "telefon" | "email"> | null;
};

export default async function ErinnerungenPage() {
  const supabase = createClient();
  const kontext = await getKontext();
  const heute = heuteBerlin();

  const { data } = await supabase
    .from("fahrstunde")
    .select(
      "id, datum, uhrzeit, dauer_minuten, typ, bestaetigung_token, bestaetigt_am, abgesagt_am, erinnerung_gesendet_am, fahrschueler(vorname, nachname, telefon, email)",
    )
    // Geplante Termine plus die, die ein Schüler per Link oder App abgesagt hat.
    .or("status.eq.geplant,abgesagt_am.not.is.null")
    .gte("datum", heute)
    .lte("datum", plusTage(heute, 3))
    .order("datum", { ascending: true })
    .order("uhrzeit", { ascending: true })
    .returns<Row[]>();

  const items: ErinnerungItem[] = (data ?? []).map((r) => ({
    id: r.id,
    datum: r.datum,
    uhrzeit: r.uhrzeit,
    dauer_minuten: r.dauer_minuten,
    typ: r.typ,
    token: r.bestaetigung_token,
    bestaetigt: r.bestaetigt_am != null,
    abgesagt: r.abgesagt_am != null,
    abgesagtAm: r.abgesagt_am,
    erinnerungGesendet: r.erinnerung_gesendet_am != null,
    name: r.fahrschueler ? `${r.fahrschueler.vorname} ${r.fahrschueler.nachname}` : "—",
    vorname: r.fahrschueler?.vorname ?? null,
    telefon: r.fahrschueler?.telefon ?? null,
    email: r.fahrschueler?.email ?? null,
  }));

  const geplant = items.filter((i) => !i.abgesagt);
  const zugesagt = geplant.filter((i) => i.bestaetigt).length;
  const abgesagt = items.filter((i) => i.abgesagt).length;
  const offen = geplant.filter((i) => !i.bestaetigt);
  const erinnert = offen.filter((i) => i.erinnerungGesendet).length;

  const h = headers();
  const host = h.get("host") ?? "";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const origin = host ? `${proto}://${host}` : "";

  return (
    <div>
      <PageHeader title="Terminerinnerungen" />

      <div className="space-y-6">
        <KpiRow>
          <KpiCard label="Termine in 3 Tagen" value={geplant.length} sub="geplante Fahrstunden ab heute" />
          <KpiCard
            label="Zugesagt"
            value={zugesagt}
            sub={geplant.length ? `${Math.round((zugesagt / geplant.length) * 100)} % der Termine` : "Noch keine Termine"}
          />
          <KpiCard
            label="Noch offen"
            value={offen.length}
            sub={offen.length ? `${erinnert} davon schon erinnert` : "Alles bestätigt"}
            tone={offen.length - erinnert > 0 ? "warning" : "neutral"}
          />
          <KpiCard label="Abgesagt" value={abgesagt} sub={abgesagt ? "Termine neu vergeben" : "Keine Absagen"} tone={abgesagt ? "destructive" : "neutral"} />
        </KpiRow>

        <ErinnerungenListe items={items} fahrschule={kontext?.fahrschule?.name ?? "deiner Fahrschule"} origin={origin} heute={heute} />
      </div>
    </div>
  );
}
