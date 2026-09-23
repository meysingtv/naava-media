import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";

import { supabase } from "./supabase";

/**
 * Online-Zahlung über Stripe. Die Web-App (EXPO_PUBLIC_API_URL) legt die
 * Bezahlseite auf dem Stripe-Konto der Fahrschule an; die App öffnet sie im
 * sicheren In-App-Browser. Bestätigt wird über den Stripe-Webhook – die App
 * wartet danach kurz auf den neuen Status.
 */

export type ZahlungStatus = "offen" | "in_pruefung" | "bezahlt" | "fehlgeschlagen" | "abgebrochen";

export type Zahlungsvorgang = {
  id: string;
  rechnung_ids: string[];
  betrag: number;
  status: ZahlungStatus;
  zahlart: string | null;
  created_at: string;
  bezahlt_am: string | null;
};

export type BezahlErgebnis = {
  art: "bezahlt" | "in_pruefung" | "wartet" | "abgebrochen" | "fehler";
  meldung?: string;
};

const API = process.env.EXPO_PUBLIC_API_URL?.replace(/\/+$/, "");

const ZAHLART_TEXT: Record<string, string> = {
  apple_pay: "Apple Pay",
  google_pay: "Google Pay",
  card: "Karte",
  link: "Link",
  sepa_debit: "Lastschrift",
  klarna: "Klarna",
  paypal: "PayPal",
  revolut_pay: "Revolut Pay",
  amazon_pay: "Amazon Pay",
};

export function zahlartText(zahlart: string | null | undefined): string {
  if (!zahlart) return "Online";
  return ZAHLART_TEXT[zahlart] ?? zahlart;
}

/** Bietet die Fahrschule Online-Zahlung an? Ohne API-Adresse oder Update 0021: nein. */
export async function ladeOnlineZahlung(): Promise<{ data: boolean; error: null }> {
  if (!API) return { data: false, error: null };
  const { data, error } = await supabase.rpc("portal_online_zahlung");
  return { data: !error && data === true, error: null };
}

/** Eigene Online-Zahlungen (bezahlt, in Prüfung, fehlgeschlagen) – neueste zuerst. */
export async function ladeZahlungen(): Promise<{ data: Zahlungsvorgang[]; error: null }> {
  const { data, error } = await supabase
    .from("zahlungsvorgang")
    .select("id, rechnung_ids, betrag, status, zahlart, created_at, bezahlt_am")
    .in("status", ["in_pruefung", "bezahlt", "fehlgeschlagen"])
    .order("created_at", { ascending: false })
    .limit(30)
    .returns<Zahlungsvorgang[]>();
  return { data: error ? [] : (data ?? []), error: null };
}

async function aufBestaetigungWarten(vorgangId: string, versuche: number): Promise<ZahlungStatus | null> {
  for (let i = 0; i < versuche; i++) {
    const { data } = await supabase.from("zahlungsvorgang").select("status").eq("id", vorgangId).maybeSingle<{ status: ZahlungStatus }>();
    if (data?.status === "bezahlt" || data?.status === "in_pruefung") return data.status;
    if (i < versuche - 1) await new Promise((fertig) => setTimeout(fertig, 1000));
  }
  return null;
}

/** Bezahlt eine oder mehrere offene Rechnungen über Stripe. */
export async function bezahlen(rechnungIds: string[]): Promise<BezahlErgebnis> {
  if (!API) return { art: "fehler", meldung: "Online-Zahlung ist in dieser App noch nicht eingerichtet." };
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return { art: "fehler", meldung: "Bitte melde dich erneut an." };

  const rueckkehr = Linking.createURL("zahlung");
  let start: { url?: string; vorgang_id?: string; fehler?: string } | null = null;
  try {
    const antwort = await fetch(`${API}/api/zahlung/checkout`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ rechnung_ids: rechnungIds, rueckkehr }),
    });
    start = await antwort.json().catch(() => null);
    if (!antwort.ok || !start?.url || !start.vorgang_id) {
      return { art: "fehler", meldung: start?.fehler ?? "Die Zahlung konnte nicht gestartet werden." };
    }
  } catch {
    return { art: "fehler", meldung: "Keine Verbindung. Bitte prüfe dein Internet." };
  }

  // Ohne geteilte Safari-Cookies – so fragt iOS nicht „… möchte sich anmelden“.
  const fenster = await WebBrowser.openAuthSessionAsync(start.url, rueckkehr, { preferEphemeralSession: true });
  const abgeschlossen = fenster.type === "success" && /ergebnis=erfolg/.test(fenster.url);

  const status = await aufBestaetigungWarten(start.vorgang_id, abgeschlossen ? 10 : 1);
  if (status === "bezahlt") return { art: "bezahlt" };
  if (status === "in_pruefung") return { art: "in_pruefung" };
  return { art: abgeschlossen ? "wartet" : "abgebrochen" };
}
