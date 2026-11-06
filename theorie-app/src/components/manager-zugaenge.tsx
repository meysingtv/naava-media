import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import * as Clipboard from "expo-clipboard";

import { dialog } from "@/components/dialog";
import { Icon } from "@/components/icon";
import {
  Abschnitt,
  etikett,
  KlassenSchild,
  schild,
  Auswahl,
  Balken,
  datumText,
  Feld,
  Fenster,
  Hinweis,
  IconTaste,
  MAvatar,
  MEingabe,
  mFlaeche,
  MKnopf,
  Reiter,
  rolleText,
  SeitenBlatt,
  StatusPlakette,
  statusText,
  M,
  wannText,
  zahl,
  zahlSchrift,
  type Zustand,
} from "@/components/manager-teile";
import { n as nf } from "@/components/web/bunt";
import { Schalter } from "@/components/schalter";
import { HAUPT_KLASSEN } from "@/lib/klassen";
import { passwortVorschlag, zugangAendern, zugangAnlegen, zugangLoeschen, zugangStatus, type Aenderung, type ManagerNutzer, type Rolle } from "@/lib/manager";

// Zugänge im Manager: Liste als Tabelle mit Suche und Filtern, Details zum
// Bearbeiten in einem Blatt von rechts und ein Fenster zum Anlegen.

export type ListenFilter = "alle" | "schueler" | "fahrlehrer" | "pausiert" | "gesperrt";

function anteil(n: ManagerNutzer): number {
  return n.fragen_gesamt > 0 ? n.fragen_richtig / n.fragen_gesamt : 0;
}

/** Anzeigename: Name, sonst Teil der E-Mail. */
export function nameVon(n: ManagerNutzer): string {
  return n.name || n.email.split("@")[0] || "Ohne Namen";
}

const ROLLEN: { id: Rolle; titel: string }[] = [
  { id: "schueler", titel: "Fahrschüler" },
  { id: "fahrlehrer", titel: "Fahrlehrer" },
];

// ---------------------------------------------------------------------------
// Liste
// ---------------------------------------------------------------------------

/** Spalten der Tabelle: Zahl unter 10 = Anteil am Rest, sonst feste Breite. */
const SPALTEN = { name: 2.4, rolle: 110, lehrer: 1.3, klasse: 64, status: 150, aktiv: 116, stand: 160 } as const;

export function ZugangListe({
  nutzer,
  filter,
  onFilter,
  fahrlehrerFilter,
  onFahrlehrerFilter,
  onWaehlen,
  onNeu,
}: {
  nutzer: ManagerNutzer[];
  filter: ListenFilter;
  onFilter: (f: ListenFilter) => void;
  fahrlehrerFilter: string | null;
  onFahrlehrerFilter: (id: string | null) => void;
  onWaehlen: (n: ManagerNutzer) => void;
  onNeu: () => void;
}) {
    const [suche, setSuche] = useState("");
  // Schmale Fenster: Klasse und „Zuletzt aktiv“ ausblenden, damit nichts übereinanderläuft.
  const [breite, setBreite] = useState(1000);
  const breit = breite >= 900;
  const lehrerVon = useMemo(() => new Map(nutzer.filter((n) => n.rolle === "fahrlehrer").map((n) => [n.id, nameVon(n)])), [nutzer]);

  const anzahl = (fi: ListenFilter) =>
    fi === "alle" ? nutzer.length : fi === "pausiert" || fi === "gesperrt" ? nutzer.filter((n) => n.status === fi).length : nutzer.filter((n) => n.rolle === fi).length;

  const sichtbar = useMemo(() => {
    const s = suche.trim().toLowerCase();
    return nutzer
      .filter((n) => (filter === "alle" ? true : filter === "pausiert" || filter === "gesperrt" ? n.status === filter : n.rolle === filter))
      .filter((n) => (fahrlehrerFilter ? n.fahrlehrer_id === fahrlehrerFilter : true))
      .filter((n) => !s || n.name.toLowerCase().includes(s) || n.email.toLowerCase().includes(s) || n.benutzername.toLowerCase().includes(s))
      .sort((a, b) => Number(b.inhaber) - Number(a.inhaber) || nameVon(a).localeCompare(nameVon(b), "de"));
  }, [nutzer, filter, fahrlehrerFilter, suche]);

  const spalte = (w: number) => (w < 10 ? { flex: w, minWidth: 0 } : { width: w });
  const kopf = (titel: string, w: number) => (
    <Text style={{ ...spalte(w), ...etikett }} numberOfLines={1}>
      {titel}
    </Text>
  );

  return (
    <View onLayout={(e) => setBreite(e.nativeEvent.layout.width)} style={[mFlaeche(), { overflow: "hidden" }]}>
      <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", columnGap: 16, rowGap: 8, paddingHorizontal: 16, paddingTop: 4, borderBottomWidth: 2, borderBottomColor: M.kante }}>
        <Reiter<ListenFilter>
          wert={filter}
          onWechsel={onFilter}
          optionen={[
            { id: "alle", titel: "Alle", zahl: anzahl("alle") },
            { id: "schueler", titel: "Fahrschüler", zahl: anzahl("schueler") },
            { id: "fahrlehrer", titel: "Fahrlehrer", zahl: anzahl("fahrlehrer") },
            { id: "pausiert", titel: "Pausiert", zahl: anzahl("pausiert") },
            { id: "gesperrt", titel: "Gesperrt", zahl: anzahl("gesperrt") },
          ]}
        />
        <View style={{ width: 280, maxWidth: "100%", paddingVertical: 6 }}>
          <MEingabe icon="search" placeholder="Name oder E-Mail" value={suche} onChangeText={setSuche} autoCapitalize="none" />
        </View>
      </View>

      {fahrlehrerFilter ? (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 16, height: 40, borderBottomWidth: 1, borderBottomColor: M.linie, backgroundColor: M.flaeche2 }}>
          <Text style={{ flex: 1, ...nf.text, fontSize: 13.5, color: M.text2 }}>
            Schüler von <Text style={{ ...nf.fett, color: M.text }}>{lehrerVon.get(fahrlehrerFilter) ?? "Fahrlehrer"}</Text>
          </Text>
          <MKnopf titel="Filter aufheben" icon="close" art="leise" onPress={() => onFahrlehrerFilter(null)} />
        </View>
      ) : null}

      <View style={{ flexDirection: "row", alignItems: "center", gap: 16, paddingHorizontal: 16, height: 36, borderBottomWidth: 1, borderBottomColor: M.linie, backgroundColor: M.flaeche2 }}>
        {kopf("Name", SPALTEN.name)}
        {kopf("Rolle", SPALTEN.rolle)}
        {kopf("Fahrlehrer", SPALTEN.lehrer)}
        {breit ? kopf("Klasse", SPALTEN.klasse) : null}
        {kopf("Status", SPALTEN.status)}
        {breit ? kopf("Zuletzt aktiv", SPALTEN.aktiv) : null}
        {kopf("Lernstand", SPALTEN.stand)}
      </View>

      {sichtbar.length === 0 ? (
        <View style={{ alignItems: "flex-start", paddingHorizontal: 16, paddingVertical: 28, gap: 10 }}>
          <Text style={{ ...nf.halb, fontSize: 14.5, color: M.text }}>{nutzer.length ? "Keine Treffer" : "Noch keine Zugänge"}</Text>
          <Text style={{ ...nf.text, fontSize: 14, color: M.text3 }}>{nutzer.length ? "Anderer Filter oder anderer Suchbegriff?" : "Leg den ersten Zugang für einen Fahrschüler oder Fahrlehrer an."}</Text>
          {nutzer.length ? null : <MKnopf titel="Zugang anlegen" icon="add" onPress={onNeu} />}
        </View>
      ) : (
        sichtbar.map((n, i) => (
          <Pressable
            key={n.id}
            onPress={() => onWaehlen(n)}
            accessibilityRole="button"
            accessibilityLabel={`${nameVon(n)} bearbeiten`}
            style={(z: Zustand) => ({
              flexDirection: "row",
              alignItems: "center",
              gap: 16,
              paddingHorizontal: 16,
              height: 56,
              borderTopWidth: i > 0 ? 1 : 0,
              borderTopColor: M.linie,
              backgroundColor: z.hovered ? M.hover : "transparent",
            })}
          >
            <View style={{ ...spalte(SPALTEN.name), flexDirection: "row", alignItems: "center", gap: 11 }}>
              <MAvatar pfad={n.bild_pfad} name={nameVon(n)} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={{ ...nf.halb, fontSize: 14.5, color: M.text }} numberOfLines={1}>
                  {nameVon(n)}
                  {n.ich ? <Text style={{ ...nf.text, color: M.text3 }}> · du</Text> : null}
                </Text>
                <Text style={{ ...nf.text, fontSize: 13, color: M.text3 }} numberOfLines={1}>
                  {n.email}
                </Text>
              </View>
            </View>
            <Text style={{ ...spalte(SPALTEN.rolle), ...nf.text, fontSize: 14, color: n.inhaber ? M.orange : M.text2 }} numberOfLines={1}>
              {rolleText(n.rolle, n.inhaber)}
            </Text>
            <Text style={{ ...spalte(SPALTEN.lehrer), ...nf.text, fontSize: 14, color: n.fahrlehrer_id ? M.text : M.text3 }} numberOfLines={1}>
              {n.fahrlehrer_id ? (lehrerVon.get(n.fahrlehrer_id) ?? "–") : "–"}
            </Text>
            {breit ? (
              <View style={spalte(SPALTEN.klasse)}>
                <KlassenSchild klasse={n.klasse} />
              </View>
            ) : null}
            <View style={spalte(SPALTEN.status)}>
              <StatusPlakette status={n.status} bis={n.pausiert_bis} />
            </View>
            {breit ? (
              <Text style={{ ...spalte(SPALTEN.aktiv), ...nf.text, fontSize: 13.5, color: n.zuletzt_aktiv ? M.text2 : M.text3 }} numberOfLines={1}>
                {wannText(n.zuletzt_aktiv)}
              </Text>
            ) : null}
            <View style={{ ...spalte(SPALTEN.stand), flexDirection: "row", alignItems: "center", gap: 10 }}>
              {n.fragen_gesamt ? (
                <>
                  <Balken anteil={anteil(n)} farbe={anteil(n) >= 0.75 ? M.gruen : M.orange} breite={56} hoehe={5} />
                  <Text style={{ ...zahlSchrift(14), color: M.text, width: 40 }}>{Math.round(anteil(n) * 100)}%</Text>
                  <Text style={{ ...nf.text, fontSize: 12.5, color: M.text3, fontVariant: ["tabular-nums"] }} numberOfLines={1}>
                    {zahl(n.fragen_gesamt)}
                  </Text>
                </>
              ) : (
                <Text style={{ ...nf.text, fontSize: 13.5, color: M.text3 }}>–</Text>
              )}
            </View>
          </Pressable>
        ))
      )}
      {sichtbar.length ? (
        <View style={{ paddingHorizontal: 16, height: 38, justifyContent: "center", borderTopWidth: 1, borderTopColor: M.linie, backgroundColor: M.flaeche2 }}>
          <Text style={{ ...nf.text, fontSize: 13, color: M.text3 }}>
            {sichtbar.length === nutzer.length ? `${sichtbar.length} Zugänge` : `${sichtbar.length} von ${nutzer.length} Zugängen`} · Lernstand = Anteil richtig, dahinter beantwortete Fragen
          </Text>
        </View>
      ) : null}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Gemeinsame Formular-Teile
// ---------------------------------------------------------------------------

function KlassenWahl({ wert, onWechsel }: { wert: string; onWechsel: (k: string) => void }) {
  const liste = HAUPT_KLASSEN.includes(wert) ? HAUPT_KLASSEN : [...HAUPT_KLASSEN, wert];
  return <Auswahl wert={wert} onWechsel={onWechsel} optionen={liste.map((k) => ({ id: k, titel: k }))} />;
}

function LehrerWahl({ wert, onWechsel, fahrlehrer }: { wert: string | null; onWechsel: (id: string | null) => void; fahrlehrer: ManagerNutzer[] }) {
    if (!fahrlehrer.length) return <Text style={{ ...nf.text, fontSize: 14, color: M.text3 }}>Noch keine Fahrlehrer angelegt.</Text>;
  return (
    <Auswahl
      wert={wert ?? "keiner"}
      onWechsel={(id) => onWechsel(id === "keiner" ? null : id)}
      optionen={[{ id: "keiner", titel: "Keiner" }, ...fahrlehrer.map((l) => ({ id: l.id, titel: nameVon(l) }))]}
    />
  );
}

function PasswortFeld({ wert, onWechsel, platzhalter = "mindestens 8 Zeichen" }: { wert: string; onWechsel: (p: string) => void; platzhalter?: string }) {
    return (
    <MEingabe
      value={wert}
      onChangeText={onWechsel}
      autoCapitalize="none"
      autoCorrect={false}
      placeholder={platzhalter}
      style={{ fontVariant: ["tabular-nums"] }}
      rechts={
        <Pressable onPress={() => onWechsel(passwortVorschlag())} accessibilityRole="button" style={(z: Zustand) => ({ height: 26, paddingHorizontal: 8, marginRight: -4, borderRadius: 6, justifyContent: "center", backgroundColor: z.hovered ? M.hover : "transparent" })}>
          <Text style={{ ...nf.halb, fontSize: 13, color: M.text2 }}>Vorschlagen</Text>
        </Pressable>
      }
    />
  );
}

function SchalterZeile({ titel, unter, wert, onWechsel, aus }: { titel: string; unter?: string; wert: boolean; onWechsel: (w: boolean) => void; aus?: boolean }) {
    return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 14, opacity: aus ? 0.55 : 1 }}>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ ...nf.halb, fontSize: 14, color: M.text }}>{titel}</Text>
        {unter ? <Text style={{ ...nf.text, fontSize: 13, color: M.text3 }}>{unter}</Text> : null}
      </View>
      <View pointerEvents={aus ? "none" : "auto"}>
        <Schalter wert={wert} onWechsel={onWechsel} farbe={M.orange} />
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Anlegen
// ---------------------------------------------------------------------------

type Neu = { name: string; email: string; passwort: string; rolle: Rolle; klasse: string; fahrlehrer_id: string | null; notiz: string; darf_clips: boolean };

const LEER: () => Neu = () => ({ name: "", email: "", passwort: passwortVorschlag(), rolle: "schueler", klasse: "B", fahrlehrer_id: null, notiz: "", darf_clips: false });

export function AnlegenFenster({
  offen,
  fahrlehrer,
  vorgabeLehrer,
  onSchliessen,
  onAngelegt,
}: {
  offen: boolean;
  fahrlehrer: ManagerNutzer[];
  vorgabeLehrer?: string | null;
  onSchliessen: () => void;
  onAngelegt: () => void;
}) {
    const [z, setZ] = useState<Neu>(LEER);
  const [laeuft, setLaeuft] = useState(false);
  const [fehler, setFehler] = useState<string | null>(null);
  const [fertig, setFertig] = useState<{ email: string; passwort: string; name: string } | null>(null);
  const [kopiert, setKopiert] = useState(false);

  useEffect(() => {
    if (offen) {
      setZ({ ...LEER(), fahrlehrer_id: vorgabeLehrer ?? null });
      setFehler(null);
      setFertig(null);
      setKopiert(false);
    }
  }, [offen, vorgabeLehrer]);

  const setzen = <K extends keyof Neu>(k: K, w: Neu[K]) => setZ((alt) => ({ ...alt, [k]: w }));

  async function anlegen() {
    setFehler(null);
    if (!z.name.trim()) return setFehler("Bitte gib einen Namen ein.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(z.email.trim())) return setFehler("Bitte gib eine gültige E-Mail-Adresse ein.");
    if (z.passwort.length < 8) return setFehler("Das Passwort braucht mindestens 8 Zeichen.");
    setLaeuft(true);
    try {
      await zugangAnlegen({ ...z, email: z.email.trim(), name: z.name.trim(), fahrlehrer_id: z.rolle === "schueler" ? z.fahrlehrer_id : null });
      setFertig({ email: z.email.trim().toLowerCase(), passwort: z.passwort, name: z.name.trim() });
      onAngelegt();
    } catch (e) {
      setFehler(e instanceof Error ? e.message : String(e));
    } finally {
      setLaeuft(false);
    }
  }

  async function kopieren() {
    if (!fertig) return;
    await Clipboard.setStringAsync(`Fahrschul Pro – dein Zugang\nE-Mail: ${fertig.email}\nPasswort: ${fertig.passwort}`).catch(() => {});
    setKopiert(true);
  }

  if (fertig) {
    return (
      <Fenster
        offen={offen}
        onSchliessen={onSchliessen}
        titel="Zugang angelegt"
        unter={`${fertig.name} kann sich jetzt in der App anmelden.`}
        breite={460}
        fuss={
          <>
            <MKnopf
              titel="Noch einen anlegen"
              art="leise"
              onPress={() => {
                setZ({ ...LEER(), fahrlehrer_id: z.fahrlehrer_id, rolle: z.rolle, klasse: z.klasse });
                setFertig(null);
                setKopiert(false);
              }}
            />
            <MKnopf titel={kopiert ? "Kopiert" : "Zugangsdaten kopieren"} icon={kopiert ? "checkmark" : "copy-outline"} onPress={kopieren} />
          </>
        }
      >
        <View style={[mFlaeche(), { backgroundColor: M.flaeche2 }]}>
          {[
            ["E-Mail", fertig.email],
            ["Passwort", fertig.passwort],
          ].map(([k, w], i) => (
            <View key={k} style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 14, height: 44, borderTopWidth: i ? 1 : 0, borderTopColor: M.linie }}>
              <Text style={{ width: 72, ...nf.text, fontSize: 13.5, color: M.text3 }}>{k}</Text>
              <Text selectable style={{ flex: 1, ...nf.halb, fontSize: 15, color: M.text, fontVariant: ["tabular-nums"] }}>
                {w}
              </Text>
            </View>
          ))}
        </View>
        <Text style={{ ...nf.text, fontSize: 13.5, lineHeight: 18, color: M.text3 }}>Gib die Zugangsdaten persönlich weiter. Das Passwort lässt sich später in der App unter Einstellungen ändern.</Text>
      </Fenster>
    );
  }

  return (
    <Fenster
      offen={offen}
      onSchliessen={onSchliessen}
      titel="Zugang anlegen"
      unter="Mit E-Mail und Passwort – die Adresse gilt sofort als bestätigt."
      fuss={
        <>
          <MKnopf titel="Abbrechen" art="leise" onPress={onSchliessen} />
          <MKnopf titel="Zugang anlegen" laedt={laeuft} onPress={anlegen} />
        </>
      }
    >
      <View style={{ flexDirection: "row", gap: 12 }}>
        <Feld titel="Name" style={{ flex: 1 }}>
          <MEingabe placeholder="Vor- und Nachname" value={z.name} onChangeText={(t) => setzen("name", t)} maxLength={40} autoFocus />
        </Feld>
        <Feld titel="E-Mail" style={{ flex: 1.2 }}>
          <MEingabe placeholder="name@beispiel.de" value={z.email} onChangeText={(t) => setzen("email", t)} autoCapitalize="none" keyboardType="email-address" autoCorrect={false} />
        </Feld>
      </View>
      <Feld titel="Passwort" hinweis="Vorgeschlagen ist ein gut lesbares Passwort – du kannst auch ein eigenes eintippen.">
        <PasswortFeld wert={z.passwort} onWechsel={(p) => setzen("passwort", p)} />
      </Feld>
      <View style={{ flexDirection: "row", gap: 24, flexWrap: "wrap" }}>
        <Feld titel="Rolle">
          <Auswahl<Rolle> wert={z.rolle} onWechsel={(r) => setzen("rolle", r)} optionen={ROLLEN} />
        </Feld>
        <Feld titel="Führerscheinklasse" style={{ flex: 1, minWidth: 220 }}>
          <KlassenWahl wert={z.klasse} onWechsel={(k) => setzen("klasse", k)} />
        </Feld>
      </View>
      {z.rolle === "schueler" ? (
        <Feld titel="Fahrlehrer">
          <LehrerWahl wert={z.fahrlehrer_id} onWechsel={(id) => setzen("fahrlehrer_id", id)} fahrlehrer={fahrlehrer} />
        </Feld>
      ) : null}
      <SchalterZeile titel="Darf Clips hochladen" unter={z.rolle === "fahrlehrer" ? "Fahrlehrer dürfen das immer." : "Kurze Videos für alle im Clips-Tab"} wert={z.rolle === "fahrlehrer" || z.darf_clips} aus={z.rolle === "fahrlehrer"} onWechsel={(w) => setzen("darf_clips", w)} />
      <Feld titel="Notiz (nur für dich)">
        <MEingabe mehrzeilig placeholder="z. B. Theoriekurs März, Prüfung geplant im Mai" value={z.notiz} onChangeText={(t) => setzen("notiz", t)} maxLength={500} />
      </Feld>
      {fehler ? <Hinweis art="fehler">{fehler}</Hinweis> : null}
    </Fenster>
  );
}

// ---------------------------------------------------------------------------
// Details & Bearbeiten
// ---------------------------------------------------------------------------

const PAUSE_TAGE = [
  { id: "7", titel: "1 Woche" },
  { id: "14", titel: "2 Wochen" },
  { id: "30", titel: "1 Monat" },
  { id: "0", titel: "Bis ich sie aufhebe" },
] as const;

export function ZugangBlatt({ nutzer, alle, onSchliessen, onGeaendert }: { nutzer: ManagerNutzer | null; alle: ManagerNutzer[]; onSchliessen: () => void; onGeaendert: () => Promise<void> }) {
    const n = nutzer;
  const [form, setForm] = useState({ name: "", benutzername: "", email: "", rolle: "schueler" as Rolle, klasse: "B", fahrlehrer_id: null as string | null, notiz: "", darf_clips: false });
  const [passwort, setPasswort] = useState("");
  const [pause, setPause] = useState<string>("7");
  const [laeuft, setLaeuft] = useState<string | null>(null);
  const [meldung, setMeldung] = useState<{ art: "ok" | "fehler"; text: string } | null>(null);

  useEffect(() => {
    if (!n) return;
    setForm({ name: n.name, benutzername: n.benutzername, email: n.email, rolle: n.rolle, klasse: n.klasse, fahrlehrer_id: n.fahrlehrer_id, notiz: n.notiz, darf_clips: n.darf_clips });
    setPasswort("");
    setMeldung(null);
    // Nur beim Wechsel des Kontos neu befüllen – nicht nach jedem Neuladen der Liste.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [n?.id]);

  const fahrlehrer = useMemo(() => alle.filter((l) => l.rolle === "fahrlehrer" && l.id !== n?.id), [alle, n?.id]);
  const schueler = useMemo(() => (n ? alle.filter((s) => s.fahrlehrer_id === n.id) : []), [alle, n]);

  if (!n) return <SeitenBlatt offen={false} onSchliessen={onSchliessen}>{null}</SeitenBlatt>;

  const aenderung: Aenderung = {};
  if (form.name.trim() !== n.name) aenderung.name = form.name.trim();
  if (form.benutzername.trim().toLowerCase() !== n.benutzername) aenderung.benutzername = form.benutzername.trim().toLowerCase();
  if (form.email.trim().toLowerCase() !== n.email.toLowerCase()) aenderung.email = form.email.trim();
  if (form.rolle !== n.rolle) aenderung.rolle = form.rolle;
  if (form.klasse !== n.klasse) aenderung.klasse = form.klasse;
  if (form.rolle === "schueler" && form.fahrlehrer_id !== n.fahrlehrer_id) aenderung.fahrlehrer_id = form.fahrlehrer_id;
  if (form.notiz !== n.notiz) aenderung.notiz = form.notiz;
  if (form.darf_clips !== n.darf_clips) aenderung.darf_clips = form.darf_clips;
  const geaendert = Object.keys(aenderung).length > 0;
  const geschuetzt = n.inhaber || n.ich;

  async function ausfuehren(schritt: string, arbeit: () => Promise<void>, ok: string) {
    setLaeuft(schritt);
    setMeldung(null);
    try {
      await arbeit();
      await onGeaendert();
      setMeldung({ art: "ok", text: ok });
    } catch (e) {
      setMeldung({ art: "fehler", text: e instanceof Error ? e.message : String(e) });
    } finally {
      setLaeuft(null);
    }
  }

  const sichern = () => ausfuehren("sichern", () => zugangAendern(n.id, aenderung), "Gespeichert.");

  const verwerfen = () => {
    setForm({ name: n.name, benutzername: n.benutzername, email: n.email, rolle: n.rolle, klasse: n.klasse, fahrlehrer_id: n.fahrlehrer_id, notiz: n.notiz, darf_clips: n.darf_clips });
  };

  const pausieren = () => {
    const tage = Number(pause);
    ausfuehren("status", () => zugangStatus(n.id, "pausiert", tage || undefined), tage ? `Pausiert für ${PAUSE_TAGE.find((p) => p.id === pause)?.titel}.` : "Pausiert, bis du die Pause aufhebst.");
  };

  const sperren = () =>
    dialog("Zugang sperren?", `${nameVon(n)} wird abgemeldet und kann sich nicht mehr anmelden, bis du den Zugang wieder freigibst.`, [
      { text: "Abbrechen", style: "cancel" },
      { text: "Sperren", style: "destructive", onPress: () => ausfuehren("status", () => zugangStatus(n.id, "gesperrt"), "Gesperrt.") },
    ]);

  const freigeben = () => ausfuehren("status", () => zugangStatus(n.id, "aktiv"), "Zugang ist wieder aktiv.");

  const loeschen = () =>
    dialog("Konto endgültig löschen?", `${nameVon(n)} (${n.email}) und der ganze Lernstand werden gelöscht. Das lässt sich nicht rückgängig machen.`, [
      { text: "Abbrechen", style: "cancel" },
      {
        text: "Löschen",
        style: "destructive",
        onPress: async () => {
          setLaeuft("loeschen");
          try {
            await zugangLoeschen(n.id);
            onSchliessen();
            await onGeaendert();
          } catch (e) {
            setMeldung({ art: "fehler", text: e instanceof Error ? e.message : String(e) });
          } finally {
            setLaeuft(null);
          }
        },
      },
    ]);

  const passwortSetzen = () => {
    if (passwort.length < 8) return setMeldung({ art: "fehler", text: "Das Passwort braucht mindestens 8 Zeichen." });
    ausfuehren("passwort", () => zugangAendern(n.id, { passwort }), `Neues Passwort gesetzt: ${passwort}`);
  };

  const anbieter = n.anbieter === "email" ? "E-Mail" : n.anbieter === "apple" ? "Apple" : n.anbieter === "google" ? "Google" : n.anbieter;

  return (
    <SeitenBlatt offen={!!nutzer} onSchliessen={onSchliessen}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingLeft: 20, paddingRight: 12, height: 64, borderBottomWidth: 1, borderBottomColor: M.linie }}>
        <MAvatar pfad={n.bild_pfad} name={nameVon(n)} groesse={36} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={{ ...schild(17), color: M.text }} numberOfLines={1}>
            {nameVon(n)}
          </Text>
          <Text style={{ ...nf.text, fontSize: 13, color: M.text3 }} numberOfLines={1}>
            {rolleText(n.rolle, n.inhaber)} · {statusText(n.status, n.pausiert_bis)}
          </Text>
        </View>
        <IconTaste icon="close" label="Schließen" onPress={onSchliessen} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, gap: 14, paddingBottom: 32 }}>
        {meldung ? <Hinweis art={meldung.art}>{meldung.text}</Hinweis> : null}

        <View style={[mFlaeche(), { flexDirection: "row" }]}>
          {[
            { wert: zahl(n.fragen_gesamt), titel: "Fragen" },
            { wert: n.fragen_gesamt ? `${Math.round(anteil(n) * 100)} %` : "–", titel: "richtig" },
            { wert: zahl(n.xp), titel: "XP" },
            { wert: zahl(n.serie), titel: "Tage Serie" },
          ].map((w, i) => (
            <View key={w.titel} style={{ flex: 1, paddingHorizontal: 12, paddingVertical: 10, gap: 2, borderLeftWidth: i ? 1 : 0, borderLeftColor: M.linie }}>
              <Text style={{ ...zahlSchrift(22), color: M.text }}>{w.wert}</Text>
              <Text style={etikett}>{w.titel}</Text>
            </View>
          ))}
        </View>

        <Abschnitt titel="Konto" />
        <Feld titel="Name">
          <MEingabe value={form.name} onChangeText={(t) => setForm({ ...form, name: t })} maxLength={40} />
        </Feld>
        <View style={{ flexDirection: "row", gap: 12 }}>
          <Feld titel="Benutzername" style={{ flex: 1 }}>
            <MEingabe icon="at" value={form.benutzername} onChangeText={(t) => setForm({ ...form, benutzername: t })} autoCapitalize="none" maxLength={20} />
          </Feld>
          <Feld titel="E-Mail" style={{ flex: 1.3 }}>
            <MEingabe value={form.email} onChangeText={(t) => setForm({ ...form, email: t })} autoCapitalize="none" keyboardType="email-address" editable={n.anbieter === "email"} />
          </Feld>
        </View>
        {n.anbieter !== "email" ? <Text style={{ ...nf.text, fontSize: 13, color: M.text3 }}>Meldet sich mit {anbieter} an – die E-Mail kommt von dort.</Text> : null}

        <Abschnitt titel="Zugehörigkeit" />
        <Feld titel="Rolle">
          <Auswahl<Rolle> wert={form.rolle} onWechsel={(r) => setForm({ ...form, rolle: r })} optionen={ROLLEN} />
        </Feld>
        <Feld titel="Führerscheinklasse">
          <KlassenWahl wert={form.klasse} onWechsel={(k) => setForm({ ...form, klasse: k })} />
        </Feld>
        {form.rolle === "schueler" ? (
          <Feld titel="Fahrlehrer">
            <LehrerWahl wert={form.fahrlehrer_id} onWechsel={(id) => setForm({ ...form, fahrlehrer_id: id })} fahrlehrer={fahrlehrer} />
          </Feld>
        ) : (
          <Feld titel={`Fahrschüler (${schueler.length})`}>
            {schueler.length ? (
              <Text style={{ ...nf.text, fontSize: 14, lineHeight: 20, color: M.text }}>{schueler.map(nameVon).join(", ")}</Text>
            ) : (
              <Text style={{ ...nf.text, fontSize: 14, color: M.text3 }}>Noch keine Fahrschüler zugeordnet.</Text>
            )}
          </Feld>
        )}
        <SchalterZeile titel="Darf Clips hochladen" unter={form.rolle === "fahrlehrer" ? "Fahrlehrer dürfen das immer." : "Kurze Videos für alle im Clips-Tab"} wert={form.rolle === "fahrlehrer" || form.darf_clips} aus={form.rolle === "fahrlehrer"} onWechsel={(w) => setForm({ ...form, darf_clips: w })} />
        <Feld titel="Notiz (nur für dich)">
          <MEingabe mehrzeilig value={form.notiz} onChangeText={(t) => setForm({ ...form, notiz: t })} maxLength={500} placeholder="z. B. Theoriekurs März" />
        </Feld>

        <Abschnitt titel="Passwort" />
        <View style={{ flexDirection: "row", gap: 8 }}>
          <View style={{ flex: 1 }}>
            <PasswortFeld wert={passwort} onWechsel={setPasswort} platzhalter="Neues Passwort" />
          </View>
          <MKnopf titel="Setzen" art="sekundaer" deaktiviert={!passwort} laedt={laeuft === "passwort"} onPress={passwortSetzen} />
        </View>

        <Abschnitt titel="Zugang" />
        {geschuetzt ? (
          <Text style={{ ...nf.text, fontSize: 14, lineHeight: 19, color: M.text3 }}>{n.ich ? "Das ist dein eigenes Konto – das kannst du hier nicht pausieren, sperren oder löschen." : "Inhaber-Konten lassen sich nicht pausieren, sperren oder löschen."}</Text>
        ) : n.status === "aktiv" ? (
          <View style={{ gap: 10 }}>
            <Text style={{ ...nf.text, fontSize: 13.5, lineHeight: 18, color: M.text3 }}>Beim Pausieren bleibt der Lernstand, anmelden geht erst danach wieder – z. B. bei offener Rechnung oder Kurs-Pause.</Text>
            <Auswahl wert={pause} onWechsel={setPause} optionen={PAUSE_TAGE.map((p) => ({ id: p.id, titel: p.titel }))} />
            <View style={{ flexDirection: "row", gap: 8 }}>
              <MKnopf titel="Pausieren" icon="pause" art="sekundaer" laedt={laeuft === "status"} onPress={pausieren} />
              <MKnopf titel="Sperren" icon="ban" art="gefahr" onPress={sperren} />
            </View>
          </View>
        ) : (
          <View style={{ gap: 10 }}>
            <Text style={{ ...nf.text, fontSize: 14, color: M.text }}>{n.status === "gesperrt" ? "Dieser Zugang ist gesperrt." : n.pausiert_bis ? `Pausiert bis ${datumText(n.pausiert_bis)}.` : "Pausiert, bis du die Pause aufhebst."}</Text>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <MKnopf titel={n.status === "gesperrt" ? "Wieder freigeben" : "Pause aufheben"} icon="play" art="sekundaer" laedt={laeuft === "status"} onPress={freigeben} />
              {n.status === "pausiert" ? <MKnopf titel="Stattdessen sperren" icon="ban" art="gefahr" onPress={sperren} /> : null}
            </View>
          </View>
        )}

        <Abschnitt titel="Info" />
        <View>
          {[
            ["Angelegt", datumText(n.erstellt_am)],
            ["Zuletzt angemeldet", wannText(n.zuletzt_aktiv)],
            ["Anmeldung über", anbieter],
            ["E-Mail bestätigt", n.bestaetigt ? "Ja" : "Nein"],
          ].map(([k, w]) => (
            <View key={k} style={{ flexDirection: "row", justifyContent: "space-between", gap: 10, height: 30, alignItems: "center" }}>
              <Text style={{ ...nf.text, fontSize: 13.5, color: M.text3 }}>{k}</Text>
              <Text style={{ ...nf.text, fontSize: 13.5, color: M.text }}>{w}</Text>
            </View>
          ))}
        </View>

        {geschuetzt ? null : (
          <Pressable onPress={loeschen} disabled={laeuft === "loeschen"} style={(z: Zustand) => ({ flexDirection: "row", alignItems: "center", gap: 8, alignSelf: "flex-start", height: 32, paddingHorizontal: 8, marginLeft: -8, marginTop: 4, borderRadius: 7, backgroundColor: z.hovered ? M.hover : "transparent" })}>
            <Icon name="trash-outline" size={15} color={M.rot} />
            <Text style={{ ...nf.halb, fontSize: 14, color: M.rot }}>{laeuft === "loeschen" ? "Wird gelöscht …" : "Konto löschen"}</Text>
          </Pressable>
        )}
      </ScrollView>

      {geaendert ? (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 20, height: 56, borderTopWidth: 1, borderTopColor: M.linie, backgroundColor: M.flaeche2 }}>
          <Text style={{ flex: 1, ...nf.text, fontSize: 13.5, color: M.text2 }}>Ungespeicherte Änderungen</Text>
          <MKnopf titel="Verwerfen" art="leise" onPress={verwerfen} />
          <MKnopf titel="Speichern" laedt={laeuft === "sichern"} onPress={sichern} />
        </View>
      ) : null}
    </SeitenBlatt>
  );
}
