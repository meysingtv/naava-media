import { headers } from "next/headers";

import { createClient } from "@/lib/supabase/server";
import { getKontext } from "@/lib/supabase/queries";
import { PageHeader } from "@/components/shared/page-header";
import type { Fahrschueler, Fahrstunde } from "@/lib/types";
import { ErinnerungenListe, type ErinnerungItem } from "./erinnerungen-liste";

export const metadata = { title: "Erinnerungen · FahrschulApp" };

function iso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

type Row = Pick<
  Fahrstunde,
  "id" | "datum" | "uhrzeit" | "dauer_minuten" | "typ" | "bestaetigung_token" | "bestaetigt_am" | "abgesagt_am" | "erinnerung_gesendet_am"
> & {
  fahrschueler: Pick<Fahrschueler, "vorname" | "nachname" | "telefon" | "email"> | null;
};

export default async function ErinnerungenPage() {
  const supabase = createClient();
  const kontext = await getKontext();
  const heute = new Date();
  const bis = new Date();
  bis.setDate(bis.getDate() + 3);

  const { data } = await supabase
    .from("fahrstunde")
    .select(
      "id, datum, uhrzeit, dauer_minuten, typ, bestaetigung_token, bestaetigt_am, abgesagt_am, erinnerung_gesendet_am, fahrschueler(vorname, nachname, telefon, email)",
    )
    .eq("status", "geplant")
    .gte("datum", iso(heute))
    .lte("datum", iso(bis))
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
    erinnerungGesendet: r.erinnerung_gesendet_am != null,
    name: r.fahrschueler ? `${r.fahrschueler.vorname} ${r.fahrschueler.nachname}` : "—",
    vorname: r.fahrschueler?.vorname ?? null,
    telefon: r.fahrschueler?.telefon ?? null,
    email: r.fahrschueler?.email ?? null,
  }));

  const offen = items.filter((i) => !i.bestaetigt && !i.abgesagt).length;

  const h = headers();
  const host = h.get("host") ?? "";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const origin = host ? `${proto}://${host}` : "";

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="Termine"
        title="Erinnerungen"
        description="Ausfälle vermeiden: Termine der nächsten 3 Tage – ein Klick sendet die Erinnerung mit Zusage-/Absage-Link."
      />
      <ErinnerungenListe
        items={items}
        fahrschule={kontext?.fahrschule?.name ?? "deiner Fahrschule"}
        offen={offen}
        origin={origin}
      />
    </div>
  );
}
