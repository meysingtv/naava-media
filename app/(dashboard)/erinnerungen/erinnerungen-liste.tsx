"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarX, Mail, MessageCircle, Phone } from "lucide-react";

import { StatusDot } from "@/components/ui/badge";
import { Panel } from "@/components/ui/panel";
import { Segmente } from "@/components/shared/filter-bar";
import { FAHRSTUNDE_FARBE, FAHRSTUNDE_TYPEN } from "@/lib/constants";
import { cn, formatDatum, formatUhrzeit } from "@/lib/utils";
import { plusTage, wochentagKurz } from "@/lib/zeit";
import type { FahrstundeTyp } from "@/lib/types";
import { erinnerungGesendet } from "./actions";

export interface ErinnerungItem {
  id: string;
  datum: string;
  uhrzeit: string;
  dauer_minuten: number;
  typ: FahrstundeTyp;
  token: string | null;
  bestaetigt: boolean;
  abgesagt: boolean;
  /** Zeitpunkt der Absage durch den Schüler (Link oder App). */
  abgesagtAm?: string | null;
  erinnerungGesendet: boolean;
  name: string;
  vorname: string | null;
  telefon: string | null;
  email: string | null;
}

type Segment = "offen" | "zugesagt" | "abgesagt" | "alle";

/** „vor 5 Min.", „vor 3 Std.", „gestern" – für den Zeitpunkt einer Absage. */
function seit(iso: string): string {
  const min = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (min < 60) return `vor ${Math.max(1, min)} Min.`;
  const std = Math.round(min / 60);
  if (std < 24) return `vor ${std} Std.`;
  const tage = Math.round(std / 24);
  return tage === 1 ? "gestern" : `vor ${tage} Tagen`;
}

function telInternational(tel: string): string {
  let d = tel.replace(/[^\d+]/g, "");
  if (d.startsWith("+")) d = d.slice(1);
  else if (d.startsWith("00")) d = d.slice(2);
  else if (d.startsWith("0")) d = "49" + d.slice(1);
  return d;
}

function nachricht(item: ErinnerungItem, fahrschule: string, origin: string): string {
  const anrede = item.vorname ? `Hallo ${item.vorname},` : "Hallo,";
  const link = item.token ? `${origin}/t/${item.token}` : "";
  return (
    `${anrede} wir erinnern an deine Fahrstunde am ${formatDatum(item.datum)} um ${formatUhrzeit(item.uhrzeit)} Uhr ` +
    `bei ${fahrschule}.` +
    (link ? ` Bitte kurz zusagen oder absagen: ${link}` : "")
  );
}

function tagLabel(datum: string, heute: string): string {
  if (datum === heute) return "Heute";
  if (datum === plusTage(heute, 1)) return "Morgen";
  return `${wochentagKurz(datum)}, ${formatDatum(datum).slice(0, 6)}`;
}

const kanal =
  "inline-flex h-7 w-7 items-center justify-center rounded-md border border-border-strong bg-card text-foreground-secondary transition-colors hover:border-primary hover:bg-primary-soft hover:text-primary-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/70";

export function ErinnerungenListe({
  items,
  fahrschule,
  origin,
  heute,
}: {
  items: ErinnerungItem[];
  fahrschule: string;
  origin: string;
  heute: string;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [segment, setSegment] = useState<Segment>("offen");

  function markiere(id: string) {
    startTransition(async () => {
      await erinnerungGesendet(id);
      router.refresh();
    });
  }

  const passt = (i: ErinnerungItem, s: Segment) =>
    s === "offen" ? !i.bestaetigt && !i.abgesagt : s === "zugesagt" ? i.bestaetigt : s === "abgesagt" ? i.abgesagt : true;

  const tage = useMemo(() => {
    const map = new Map<string, ErinnerungItem[]>();
    for (const i of items) if (passt(i, segment)) map.set(i.datum, [...(map.get(i.datum) ?? []), i]);
    return Array.from(map.entries());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, segment]);

  const abgesagtAnzahl = items.filter((i) => i.abgesagt).length;

  return (
    <div className="space-y-3">
      {abgesagtAnzahl > 0 && segment !== "abgesagt" && (
        <button
          type="button"
          onClick={() => setSegment("abgesagt")}
          className="flex w-full items-center gap-2.5 rounded-xl bg-destructive-soft px-4 py-2.5 text-left text-13 text-destructive-text transition-colors hover:bg-destructive/15"
        >
          <CalendarX className="h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden="true" />
          <span className="flex-1">
            {abgesagtAnzahl === 1 ? "1 Termin wurde vom Schüler abgesagt" : `${abgesagtAnzahl} Termine wurden von Schülern abgesagt`} – der Platz ist frei.
          </span>
          <span className="font-medium">Ansehen</span>
        </button>
      )}
      <Segmente
        optionen={[
          { key: "offen", label: "Offen", anzahl: items.filter((i) => passt(i, "offen")).length },
          { key: "zugesagt", label: "Zugesagt", anzahl: items.filter((i) => passt(i, "zugesagt")).length },
          { key: "abgesagt", label: "Abgesagt", anzahl: items.filter((i) => passt(i, "abgesagt")).length },
          { key: "alle", label: "Alle", anzahl: items.length },
        ]}
        wert={segment}
        onChange={setSegment}
      />

      <Panel padding="none">
        {tage.length === 0 ? (
          <p className="px-4 py-12 text-center text-13 text-foreground-secondary">
            {items.length === 0
              ? "Keine geplanten Termine in den nächsten drei Tagen."
              : segment === "offen"
                ? "Alle Termine sind zu- oder abgesagt."
                : "Keine Termine für diese Auswahl."}
          </p>
        ) : (
          tage.map(([datum, liste]) => (
            <section key={datum} aria-label={tagLabel(datum, heute)}>
              <h3 className="flex items-center gap-2 border-b border-border bg-surface-muted/60 px-4 py-1.5 text-xs font-semibold text-foreground-secondary">
                {tagLabel(datum, heute)}
                <span className="font-medium tabular-nums text-foreground-tertiary">{liste.length}</span>
              </h3>
              <ul className="divide-y divide-border border-b border-border last:border-b-0">
                {liste.map((item) => {
                  const typ = FAHRSTUNDE_TYPEN[item.typ];
                  const text = nachricht(item, fahrschule, origin);
                  const waHref = item.telefon ? `https://wa.me/${telInternational(item.telefon)}?text=${encodeURIComponent(text)}` : null;
                  const smsHref = item.telefon ? `sms:${item.telefon.replace(/\s/g, "")}?body=${encodeURIComponent(text)}` : null;
                  const mailHref = item.email
                    ? `mailto:${item.email}?subject=${encodeURIComponent("Erinnerung: Deine Fahrstunde")}&body=${encodeURIComponent(text)}`
                    : null;
                  const offen = !item.bestaetigt && !item.abgesagt;

                  return (
                    <li key={item.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2.5 sm:flex-nowrap">
                      <span className="w-12 shrink-0 text-13 font-medium tabular-nums text-foreground">{formatUhrzeit(item.uhrzeit)}</span>
                      <span aria-hidden="true" className="h-8 w-[3px] shrink-0 rounded-full" style={{ background: FAHRSTUNDE_FARBE[item.typ] }} />
                      <span className="min-w-0 flex-1">
                        <span className={cn("block truncate text-13 font-medium text-foreground", item.abgesagt && "line-through decoration-foreground-tertiary")}>
                          {item.name}
                        </span>
                        <span className="block truncate text-xs text-foreground-secondary">
                          {item.abgesagt ? (
                            <span className="text-destructive-text">
                              Vom Schüler abgesagt{item.abgesagtAm ? ` ${seit(item.abgesagtAm)}` : ""} – Platz ist frei
                            </span>
                          ) : (
                            <>
                              {typ.kurz} · {item.dauer_minuten} Min.
                              {item.telefon ? ` · ${item.telefon}` : ""}
                            </>
                          )}
                        </span>
                      </span>

                      <span className="w-[112px] shrink-0">
                        {item.bestaetigt ? (
                          <StatusDot ton="success">Zugesagt</StatusDot>
                        ) : item.abgesagt ? (
                          <StatusDot ton="destructive">Abgesagt</StatusDot>
                        ) : item.erinnerungGesendet ? (
                          <StatusDot ton="neutral">Erinnert</StatusDot>
                        ) : (
                          <StatusDot ton="warning">Offen</StatusDot>
                        )}
                      </span>

                      <span className={cn("flex w-[100px] shrink-0 items-center justify-end gap-1", !offen && "invisible")}>
                        {waHref && (
                          <a href={waHref} target="_blank" rel="noopener noreferrer" onClick={() => markiere(item.id)} title="Per WhatsApp erinnern" aria-label={`${item.name} per WhatsApp erinnern`} className={kanal}>
                            <MessageCircle className="h-3.5 w-3.5" strokeWidth={1.75} />
                          </a>
                        )}
                        {smsHref && (
                          <a href={smsHref} onClick={() => markiere(item.id)} title="Per SMS erinnern" aria-label={`${item.name} per SMS erinnern`} className={kanal}>
                            <Phone className="h-3.5 w-3.5" strokeWidth={1.75} />
                          </a>
                        )}
                        {mailHref && (
                          <a href={mailHref} onClick={() => markiere(item.id)} title="Per E-Mail erinnern" aria-label={`${item.name} per E-Mail erinnern`} className={kanal}>
                            <Mail className="h-3.5 w-3.5" strokeWidth={1.75} />
                          </a>
                        )}
                        {!item.telefon && !item.email && <span className="text-xs text-foreground-tertiary">Kein Kontakt</span>}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))
        )}
      </Panel>
    </div>
  );
}
