"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Clock, Mail, MessageCircle, Phone, X } from "lucide-react";

import { FAHRSTUNDE_TYPEN } from "@/lib/constants";
import { cn, formatDatum, formatUhrzeit } from "@/lib/utils";
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
  erinnerungGesendet: boolean;
  name: string;
  vorname: string | null;
  telefon: string | null;
  email: string | null;
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

export function ErinnerungenListe({
  items,
  fahrschule,
  offen,
  origin,
}: {
  items: ErinnerungItem[];
  fahrschule: string;
  offen: number;
  origin: string;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  function markiere(id: string) {
    startTransition(async () => {
      await erinnerungGesendet(id);
      router.refresh();
    });
  }

  if (items.length === 0) {
    return (
      <div className="rounded-xl bg-card shadow-panel px-4 py-10 text-center text-[13px] text-muted-foreground">
        Keine geplanten Termine in den nächsten 3 Tagen.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-[13px] text-foreground-secondary">
        <span className="font-semibold text-foreground">{items.length}</span> Termine ·{" "}
        <span className={cn("font-semibold", offen > 0 ? "text-warning" : "text-success")}>{offen}</span> noch offen
      </p>

      <ul className="divide-y overflow-hidden rounded-xl bg-card shadow-panel">
        {items.map((item) => {
          const typ = FAHRSTUNDE_TYPEN[item.typ];
          const text = nachricht(item, fahrschule, origin);
          const waHref = item.telefon ? `https://wa.me/${telInternational(item.telefon)}?text=${encodeURIComponent(text)}` : null;
          const smsHref = item.telefon ? `sms:${item.telefon.replace(/\s/g, "")}?body=${encodeURIComponent(text)}` : null;
          const mailHref = item.email
            ? `mailto:${item.email}?subject=${encodeURIComponent("Erinnerung: Deine Fahrstunde")}&body=${encodeURIComponent(text)}`
            : null;

          return (
            <li key={item.id} className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-start gap-3">
                <div className="w-16 shrink-0">
                  <p className="text-[13px] font-semibold tabular-nums text-foreground">{formatDatum(item.datum).slice(0, 6)}</p>
                  <p className="text-xs tabular-nums text-muted-foreground">{formatUhrzeit(item.uhrzeit)}</p>
                </div>
                <span className={cn("mt-1 h-2.5 w-2.5 shrink-0 rounded-full", typ.dot)} />
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-medium text-foreground">{item.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {typ.kurz} · {item.dauer_minuten} Min
                    {item.telefon ? ` · ${item.telefon}` : ""}
                  </p>
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-1.5 pl-[76px] sm:pl-0">
                {/* Status */}
                {item.bestaetigt ? (
                  <span className="inline-flex items-center gap-1 rounded-md bg-success-soft px-2 py-1 text-xs font-medium text-success">
                    <Check className="h-3.5 w-3.5" /> Zugesagt
                  </span>
                ) : item.abgesagt ? (
                  <span className="inline-flex items-center gap-1 rounded-md bg-destructive-soft px-2 py-1 text-xs font-medium text-destructive">
                    <X className="h-3.5 w-3.5" /> Abgesagt
                  </span>
                ) : item.erinnerungGesendet ? (
                  <span className="inline-flex items-center gap-1 rounded-md bg-surface-muted px-2 py-1 text-xs font-medium text-muted-foreground">
                    <Clock className="h-3.5 w-3.5" /> Gesendet
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-md bg-warning-soft px-2 py-1 text-xs font-medium text-warning">
                    Offen
                  </span>
                )}

                {/* Kanäle */}
                {!item.bestaetigt && !item.abgesagt && (
                  <div className="flex items-center gap-1">
                    {waHref && (
                      <a
                        href={waHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => markiere(item.id)}
                        title="Per WhatsApp erinnern"
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border-strong bg-card text-foreground-secondary transition-colors hover:border-primary hover:text-primary"
                      >
                        <MessageCircle className="h-4 w-4" />
                      </a>
                    )}
                    {smsHref && (
                      <a
                        href={smsHref}
                        onClick={() => markiere(item.id)}
                        title="Per SMS erinnern"
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border-strong bg-card text-foreground-secondary transition-colors hover:border-primary hover:text-primary"
                      >
                        <Phone className="h-4 w-4" />
                      </a>
                    )}
                    {mailHref && (
                      <a
                        href={mailHref}
                        onClick={() => markiere(item.id)}
                        title="Per E-Mail erinnern"
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border-strong bg-card text-foreground-secondary transition-colors hover:border-primary hover:text-primary"
                      >
                        <Mail className="h-4 w-4" />
                      </a>
                    )}
                    {!item.telefon && !item.email && <span className="text-xs text-muted-foreground">Kein Kontakt</span>}
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
