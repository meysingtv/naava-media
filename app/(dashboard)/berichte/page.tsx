import { Car, ClipboardCheck, Clock3, TrendingUp, UserPlus } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { Karte, KarteLeer } from "@/components/ui/karte";
import { Kennzahl, KennzahlReihe } from "@/components/ui/kennzahl";
import { Balken, Ring } from "@/components/ui/fortschritt";
import { LinkSegmente } from "@/components/shared/link-segmente";
import { PageHeader } from "@/components/shared/page-header";
import { Saeulen } from "@/components/shared/saeulen";
import { AKZENT } from "@/lib/farben";
import { formatEuro } from "@/lib/utils";
import { heuteBerlin } from "@/lib/zeit";
import { siehtUmsatz } from "@/lib/zugriff";
import type { Fahrlehrer, Fahrstunde, Pruefung, Rechnung } from "@/lib/types";

export const metadata = { title: "Berichte · FahrschulApp" };

type Zeitraum = "monat" | "quartal" | "jahr";

const iso = (j: number, m: number, t: number) => new Date(Date.UTC(j, m, t)).toISOString().slice(0, 10);
const monatKurz = (j: number, m: number) =>
  new Date(Date.UTC(j, m, 1)).toLocaleDateString("de-DE", { month: "short", timeZone: "UTC" }).replace(".", "");

/** Aktueller und vorheriger Zeitraum (jeweils Beginn und Ende). */
function zeitraeume(z: Zeitraum, heute: string) {
  const [y, mo] = heute.split("-").map(Number);
  const m = mo - 1;
  if (z === "jahr") {
    return { akt: [`${y}-01-01`, `${y}-12-31`], vor: [`${y - 1}-01-01`, `${y - 1}-12-31`], label: String(y), vorLabel: String(y - 1) };
  }
  if (z === "quartal") {
    const q = Math.floor(m / 3);
    return {
      akt: [iso(y, q * 3, 1), iso(y, q * 3 + 3, 0)],
      vor: [iso(y, q * 3 - 3, 1), iso(y, q * 3, 0)],
      label: `Q${q + 1} ${y}`,
      vorLabel: `Q${((q + 3) % 4) + 1} ${q === 0 ? y - 1 : y}`,
    };
  }
  const vorJahr = m === 0 ? y - 1 : y;
  const vorMonat = (m + 11) % 12;
  return {
    akt: [iso(y, m, 1), iso(y, m + 1, 0)],
    vor: [iso(y, m - 1, 1), iso(y, m, 0)],
    label: new Date(Date.UTC(y, m, 1)).toLocaleDateString("de-DE", { month: "long", year: "numeric", timeZone: "UTC" }),
    vorLabel: `${monatKurz(vorJahr, vorMonat)} ${vorJahr}`,
  };
}

function veraenderung(akt: number, vor: number, label: string) {
  if (vor === 0) return undefined;
  return { wert: ((akt - vor) / vor) * 100, label };
}

export default async function BerichtePage({ searchParams }: { searchParams: { zeitraum?: string } }) {
  const zeitraum: Zeitraum = searchParams.zeitraum === "jahr" ? "jahr" : searchParams.zeitraum === "quartal" ? "quartal" : "monat";
  const heute = heuteBerlin();
  const chef = await siehtUmsatz();
  const { akt, vor, label, vorLabel } = zeitraeume(zeitraum, heute);
  const [y, mo] = heute.split("-").map(Number);
  const zwoelfMonate = iso(y, mo - 12, 1);
  const supabase = createClient();

  const [rechnungRes, schuelerRes, fahrstundeRes, lehrerRes, pruefungRes] = await Promise.all([
    supabase.from("rechnung").select("rechnungsdatum, betrag_brutto, status").returns<Pick<Rechnung, "rechnungsdatum" | "betrag_brutto" | "status">[]>(),
    supabase.from("fahrschueler").select("anmeldedatum").returns<{ anmeldedatum: string | null }[]>(),
    supabase
      .from("fahrstunde")
      .select("datum, fahrlehrer_id, status, dauer_minuten")
      .gte("datum", vor[0] < zwoelfMonate ? vor[0] : zwoelfMonate)
      .returns<Pick<Fahrstunde, "datum" | "fahrlehrer_id" | "status" | "dauer_minuten">[]>(),
    supabase.from("fahrlehrer").select("id, vorname, nachname").returns<Pick<Fahrlehrer, "id" | "vorname" | "nachname">[]>(),
    supabase.from("pruefung").select("art, ergebnis, datum").returns<Pick<Pruefung, "art" | "ergebnis" | "datum">[]>(),
  ]);

  const rechnungen = rechnungRes.data ?? [];
  const schueler = schuelerRes.data ?? [];
  const fahrstunden = (fahrstundeRes.data ?? []).filter((f) => f.status !== "ausgefallen");
  const lehrer = lehrerRes.data ?? [];
  const pruefungen = pruefungRes.data ?? [];

  const im = (d: string | null | undefined, r: string[]) => !!d && d >= r[0] && d <= r[1];
  const summe = (liste: { betrag_brutto: number | null }[]) => liste.reduce((s, r) => s + Number(r.betrag_brutto ?? 0), 0);

  const umsatzAkt = summe(rechnungen.filter((r) => im(r.rechnungsdatum, akt)));
  const umsatzVor = summe(rechnungen.filter((r) => im(r.rechnungsdatum, vor)));
  const neuAkt = schueler.filter((s) => im(s.anmeldedatum, akt)).length;
  const neuVor = schueler.filter((s) => im(s.anmeldedatum, vor)).length;
  const fsAkt = fahrstunden.filter((f) => im(f.datum, akt));
  const fsVor = fahrstunden.filter((f) => im(f.datum, vor));
  const minuten = (liste: typeof fahrstunden) => liste.reduce((s, f) => s + (f.dauer_minuten ?? 45), 0);
  const quote = (liste: typeof pruefungen) => {
    const fertig = liste.filter((p) => p.ergebnis !== "offen");
    const bestanden = fertig.filter((p) => p.ergebnis === "bestanden").length;
    return { fertig: fertig.length, bestanden, prozent: fertig.length ? Math.round((bestanden / fertig.length) * 100) : null };
  };
  const prAkt = pruefungen.filter((p) => im(p.datum, akt));
  const qAkt = quote(prAkt);
  const qVor = quote(pruefungen.filter((p) => im(p.datum, vor)));

  // Verläufe über zwölf Monate
  const monate = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(Date.UTC(y, mo - 12 + i, 1));
    return { schluessel: d.toISOString().slice(0, 7), label: monatKurz(d.getUTCFullYear(), d.getUTCMonth()) };
  });
  const umsatzVerlauf = monate.map((m) => ({ ...m, wert: summe(rechnungen.filter((r) => (r.rechnungsdatum ?? "").startsWith(m.schluessel))) }));
  const anmeldVerlauf = monate.map((m) => ({ ...m, wert: schueler.filter((s) => (s.anmeldedatum ?? "").startsWith(m.schluessel)).length }));
  const stundenVerlauf = monate.map((m) => ({ ...m, wert: Math.round(minuten(fahrstunden.filter((f) => f.datum.startsWith(m.schluessel))) / 60) }));

  // Stunden je Fahrlehrer im Zeitraum
  const lehrerName: Record<string, string> = {};
  for (const l of lehrer) lehrerName[l.id] = `${l.vorname} ${l.nachname}`;
  const lehrerMin: Record<string, number> = {};
  for (const f of fsAkt) if (f.fahrlehrer_id) lehrerMin[f.fahrlehrer_id] = (lehrerMin[f.fahrlehrer_id] ?? 0) + (f.dauer_minuten ?? 45);
  const topLehrer = Object.entries(lehrerMin)
    .map(([id, min]) => ({ id, name: lehrerName[id] ?? "Unbekannt", std: min / 60 }))
    .sort((a, b) => b.std - a.std)
    .slice(0, 6);
  const maxStd = Math.max(1, ...topLehrer.map((l) => l.std));

  const theorie = quote(prAkt.filter((p) => p.art === "theorie"));
  const praxis = quote(prAkt.filter((p) => p.art === "praxis"));
  const vergleich = `ggü. ${vorLabel}`;

  const stundenKarte = (
    <Karte titel="Gefahrene Stunden" meta="letzte 12 Monate" inhaltClassName="px-5 pb-5">
      <Saeulen werte={stundenVerlauf} farbe={AKZENT.orange} label="Gefahrene Stunden der letzten zwölf Monate" />
    </Karte>
  );

  const lehrerKarte = (
    <Karte titel="Stunden je Fahrlehrer" meta={label} inhaltClassName="px-5 pb-5">
      {topLehrer.length === 0 ? (
        <KarteLeer>Keine Fahrstunden im Zeitraum.</KarteLeer>
      ) : (
        <ul className="grid gap-x-10 gap-y-4 md:grid-cols-2">
          {topLehrer.map((l) => (
            <li key={l.id}>
              <div className="mb-1.5 flex items-center justify-between text-13">
                <span className="truncate font-medium text-foreground">{l.name}</span>
                <span className="tabular-nums text-foreground-secondary">
                  {l.std.toLocaleString("de-DE", { maximumFractionDigits: 1 })} Std.
                </span>
              </div>
              <Balken anteil={l.std / maxStd} farbe={AKZENT.blau} />
            </li>
          ))}
        </ul>
      )}
    </Karte>
  );

  return (
    <div>
      <PageHeader title="Berichte">
        <LinkSegmente
          label="Zeitraum"
          aktiv={zeitraum}
          optionen={[
            { key: "monat", label: "Monat", href: "/berichte" },
            { key: "quartal", label: "Quartal", href: "/berichte?zeitraum=quartal" },
            { key: "jahr", label: "Jahr", href: "/berichte?zeitraum=jahr" },
          ]}
        />
      </PageHeader>

      <div className="space-y-6">
        <p className="-mt-2 text-13 text-foreground-secondary">
          Zeitraum: <span className="font-medium text-foreground">{label}</span> · Vergleich mit {vorLabel}
        </p>

        <KennzahlReihe>
          {chef ? (
            <Kennzahl
              label="Umsatz"
              wert={formatEuro(umsatzAkt)}
              veraenderung={veraenderung(umsatzAkt, umsatzVor, vergleich)}
              sub={umsatzVor === 0 ? "gestellte Rechnungen" : undefined}
              icon={TrendingUp}
              akzent={AKZENT.blau}
            />
          ) : (
            <Kennzahl
              label="Gefahrene Stunden"
              wert={`${Math.round(minuten(fsAkt) / 60)} Std.`}
              veraenderung={veraenderung(minuten(fsAkt), minuten(fsVor), vergleich)}
              sub={minuten(fsVor) === 0 ? "ohne ausgefallene Termine" : undefined}
              icon={Clock3}
              akzent={AKZENT.blau}
            />
          )}
          <Kennzahl
            label="Neuanmeldungen"
            wert={neuAkt}
            veraenderung={veraenderung(neuAkt, neuVor, vergleich)}
            sub={neuVor === 0 ? `${vorLabel}: keine` : undefined}
            icon={UserPlus}
            akzent={AKZENT.violett}
          />
          <Kennzahl
            label="Fahrstunden"
            wert={fsAkt.length}
            veraenderung={veraenderung(fsAkt.length, fsVor.length, vergleich)}
            sub={fsVor.length === 0 ? `${Math.round(minuten(fsAkt) / 60)} Std. gefahren` : undefined}
            icon={Car}
            akzent={AKZENT.smaragd}
          />
          <Kennzahl
            label="Bestehensquote"
            wert={qAkt.prozent != null ? `${qAkt.prozent} %` : "—"}
            sub={
              qAkt.fertig
                ? `${qAkt.bestanden} von ${qAkt.fertig} bestanden${qVor.prozent != null ? ` · zuvor ${qVor.prozent} %` : ""}`
                : "Keine Prüfung im Zeitraum"
            }
            icon={ClipboardCheck}
            akzent={AKZENT.orange}
          />
        </KennzahlReihe>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          {chef ? (
            <Karte titel="Umsatz" meta="letzte 12 Monate" inhaltClassName="px-5 pb-5">
              <Saeulen werte={umsatzVerlauf} einheit="euro" label="Umsatz der letzten zwölf Monate" />
            </Karte>
          ) : (
            stundenKarte
          )}
          <Karte titel="Neuanmeldungen" meta="letzte 12 Monate" inhaltClassName="px-5 pb-5">
            <Saeulen werte={anmeldVerlauf} farbe={AKZENT.violett} label="Neuanmeldungen der letzten zwölf Monate" />
          </Karte>
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          {chef ? <div className="xl:col-span-2">{stundenKarte}</div> : <div className="xl:col-span-2">{lehrerKarte}</div>}
          <Karte titel="Prüfungserfolg" meta={label} inhaltClassName="px-5 pb-5">
            {theorie.fertig + praxis.fertig === 0 ? (
              <KarteLeer>Im Zeitraum wurde keine Prüfung abgeschlossen.</KarteLeer>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                {[
                  { titel: "Theorie", q: theorie, farbe: AKZENT.blau },
                  { titel: "Praxis", q: praxis, farbe: AKZENT.violett },
                ].map((x) => (
                  <div key={x.titel} className="flex flex-col items-center text-center">
                    <Ring
                      wert={x.q.bestanden}
                      max={Math.max(1, x.q.fertig)}
                      farbe={x.farbe}
                      groesse={104}
                      label={`${x.titel}: ${x.q.bestanden} von ${x.q.fertig} bestanden`}
                    >
                      <span className="text-lg font-semibold tabular-nums text-foreground">{x.q.prozent != null ? `${x.q.prozent} %` : "—"}</span>
                    </Ring>
                    <p className="mt-3 text-13 font-medium text-foreground">{x.titel}</p>
                    <p className="text-xs text-foreground-secondary">
                      {x.q.fertig ? `${x.q.bestanden} von ${x.q.fertig} bestanden` : "Keine Prüfung"}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </Karte>
        </div>

        {chef && lehrerKarte}
      </div>
    </div>
  );
}
