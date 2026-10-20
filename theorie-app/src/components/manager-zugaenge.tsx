import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import * as Clipboard from "expo-clipboard";

import { dialog } from "@/components/dialog";
import { Icon } from "@/components/icon";
import {
  Auswahl,
  BLAU,
  datumText,
  Feld,
  Fenster,
  Hinweis,
  MEingabe,
  mFlaeche,
  MKarte,
  MKnopf,
  RolleMarke,
  rotVon,
  SchliessenTaste,
  SeitenBlatt,
  StatusPlakette,
  wannText,
  type Zustand,
} from "@/components/manager-teile";
import { NutzerBild } from "@/components/profilbild";
import { Schalter } from "@/components/schalter";
import { useFarbwelt } from "@/lib/darstellung";
import { HAUPT_KLASSEN } from "@/lib/klassen";
import {
  passwortVorschlag,
  ROLLE_TEXT,
  zugangAendern,
  zugangAnlegen,
  zugangLoeschen,
  zugangStatus,
  type Aenderung,
  type ManagerNutzer,
  type Rolle,
} from "@/lib/manager";
import { mitDeckkraft, schrift } from "@/lib/theme";

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

// ---------------------------------------------------------------------------
// Liste
// ---------------------------------------------------------------------------

/** Spalten der Tabelle: Name und Fahrlehrer teilen sich den Rest, die übrigen sind fest. */
const SPALTEN = { name: 2.6, lehrer: 1.4, rolle: 128, klasse: 58, status: 168, aktiv: 112, stand: 150 } as const;

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
  const f = useFarbwelt();
  const [suche, setSuche] = useState("");
  // Schmale Fenster: Klasse und „Zuletzt aktiv“ ausblenden, damit nichts übereinanderläuft.
  const [breite, setBreite] = useState(1000);
  const breit = breite >= 900;
  const lehrerVon = useMemo(() => new Map(nutzer.filter((n) => n.rolle === "fahrlehrer").map((n) => [n.id, nameVon(n)])), [nutzer]);

  const zahl = (fi: ListenFilter) =>
    fi === "alle" ? nutzer.length : fi === "pausiert" || fi === "gesperrt" ? nutzer.filter((n) => n.status === fi).length : nutzer.filter((n) => n.rolle === fi).length;

  const sichtbar = useMemo(() => {
    const s = suche.trim().toLowerCase();
    return nutzer
      .filter((n) => (filter === "alle" ? true : filter === "pausiert" || filter === "gesperrt" ? n.status === filter : n.rolle === filter))
      .filter((n) => (fahrlehrerFilter ? n.fahrlehrer_id === fahrlehrerFilter : true))
      .filter((n) => !s || n.name.toLowerCase().includes(s) || n.email.toLowerCase().includes(s) || n.benutzername.toLowerCase().includes(s))
      .sort((a, b) => Number(b.inhaber) - Number(a.inhaber) || nameVon(a).localeCompare(nameVon(b), "de"));
  }, [nutzer, filter, fahrlehrerFilter, suche]);

  /** Breite einer Spalte: Zahl unter 10 = Anteil am Rest, sonst feste Breite. */
  const spalte = (w: number) => (w < 10 ? { flex: w, minWidth: 0 } : { width: w });
  const kopf = (titel: string, w: number) => (
    <Text style={{ ...spalte(w), ...schrift.textHalb, fontSize: 12, letterSpacing: 0.6, textTransform: "uppercase", color: f.text3 }} numberOfLines={1}>
      {titel}
    </Text>
  );

  return (
    <View style={{ gap: 16 }}>
      <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 12 }}>
        <View style={{ flexGrow: 1, flexBasis: 280, maxWidth: 420 }}>
          <MEingabe icon="search" placeholder="Name oder E-Mail suchen" value={suche} onChangeText={setSuche} autoCapitalize="none" />
        </View>
        <Auswahl<ListenFilter>
          wert={filter}
          onWechsel={onFilter}
          optionen={[
            { id: "alle", titel: `Alle · ${zahl("alle")}` },
            { id: "schueler", titel: `Fahrschüler · ${zahl("schueler")}` },
            { id: "fahrlehrer", titel: `Fahrlehrer · ${zahl("fahrlehrer")}` },
            { id: "pausiert", titel: `Pausiert · ${zahl("pausiert")}` },
            { id: "gesperrt", titel: `Gesperrt · ${zahl("gesperrt")}` },
          ]}
        />
      </View>

      {fahrlehrerFilter ? (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <Text style={{ ...schrift.textMittel, fontSize: 14, color: f.text2 }}>
            Schüler von <Text style={{ ...schrift.textFett, color: f.text }}>{lehrerVon.get(fahrlehrerFilter) ?? "Fahrlehrer"}</Text>
          </Text>
          <MKnopf titel="Filter aufheben" icon="close" art="leise" onPress={() => onFahrlehrerFilter(null)} />
        </View>
      ) : null}

      <View onLayout={(e) => setBreite(e.nativeEvent.layout.width)} style={[{ borderRadius: 22, overflow: "hidden" }, mFlaeche(f)]}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 20, height: 44, borderBottomWidth: 1, borderBottomColor: f.linie, backgroundColor: f.hell ? "#FBFAF7" : "rgba(255,255,255,0.02)" }}>
          {kopf("Name", SPALTEN.name)}
          {kopf("Rolle", SPALTEN.rolle)}
          {kopf("Fahrlehrer", SPALTEN.lehrer)}
          {breit ? kopf("Klasse", SPALTEN.klasse) : null}
          {kopf("Status", SPALTEN.status)}
          {breit ? kopf("Zuletzt aktiv", SPALTEN.aktiv) : null}
          {kopf("Lernstand", SPALTEN.stand)}
          <View style={{ width: 20 }} />
        </View>

        {sichtbar.length === 0 ? (
          <View style={{ alignItems: "center", paddingVertical: 48, gap: 12 }}>
            <Icon name="people-outline" size={34} color={f.text3} />
            <Text style={{ ...schrift.textHalb, fontSize: 15, color: f.text2 }}>{nutzer.length ? "Keine Treffer" : "Noch keine Zugänge"}</Text>
            {nutzer.length ? null : <MKnopf titel="Ersten Zugang anlegen" icon="person-add" onPress={onNeu} />}
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
                gap: 14,
                paddingHorizontal: 20,
                paddingVertical: 12,
                borderTopWidth: i > 0 ? 1 : 0,
                borderTopColor: f.linie,
                backgroundColor: z.hovered ? (f.hell ? "#FAF7F2" : "rgba(255,255,255,0.035)") : "transparent",
              })}
            >
              <View style={{ ...spalte(SPALTEN.name), flexDirection: "row", alignItems: "center", gap: 12 }}>
                <NutzerBild pfad={n.bild_pfad} name={nameVon(n)} farbe={n.avatar_farbe ?? undefined} groesse={38} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={{ ...schrift.textHalb, fontSize: 14.5, color: f.text }} numberOfLines={1}>
                    {nameVon(n)}
                    {n.ich ? <Text style={{ ...schrift.textMittel, color: f.text3 }}> (du)</Text> : null}
                  </Text>
                  <Text style={{ ...schrift.text, fontSize: 12.5, color: f.text3 }} numberOfLines={1}>
                    {n.email}
                  </Text>
                </View>
              </View>
              <View style={spalte(SPALTEN.rolle)}>
                <RolleMarke rolle={n.rolle} inhaber={n.inhaber} />
              </View>
              <Text style={{ ...spalte(SPALTEN.lehrer), ...schrift.textMittel, fontSize: 13.5, color: n.fahrlehrer_id ? f.text : f.text3 }} numberOfLines={1}>
                {n.fahrlehrer_id ? (lehrerVon.get(n.fahrlehrer_id) ?? "–") : "–"}
              </Text>
              {breit ? <Text style={{ ...spalte(SPALTEN.klasse), ...schrift.textHalb, fontSize: 13.5, color: f.text2 }}>{n.klasse}</Text> : null}
              <View style={spalte(SPALTEN.status)}>
                <StatusPlakette status={n.status} bis={n.pausiert_bis} />
              </View>
              {breit ? (
                <Text style={{ ...spalte(SPALTEN.aktiv), ...schrift.textMittel, fontSize: 13, color: f.text2 }} numberOfLines={1}>
                  {wannText(n.zuletzt_aktiv)}
                </Text>
              ) : null}
              <View style={{ ...spalte(SPALTEN.stand), gap: 5 }}>
                <View style={{ height: 6, borderRadius: 3, backgroundColor: f.hell ? "rgba(20,23,27,0.07)" : "rgba(255,255,255,0.08)", overflow: "hidden" }}>
                  <View style={{ width: `${Math.round(anteil(n) * 100)}%`, height: "100%", borderRadius: 3, backgroundColor: anteil(n) >= 0.75 ? f.gruen : f.orange }} />
                </View>
                <Text style={{ ...schrift.textMittel, fontSize: 11.5, color: f.text3 }} numberOfLines={1}>
                  {n.fragen_gesamt ? `${Math.round(anteil(n) * 100)} % · ${n.fragen_gesamt} Fragen` : "noch nichts gelernt"}
                </Text>
              </View>
              <Icon name="chevron-forward" size={16} color={f.text3} />
            </Pressable>
          ))
        )}
      </View>
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
  const f = useFarbwelt();
  if (!fahrlehrer.length) return <Text style={{ ...schrift.text, fontSize: 13.5, color: f.text3 }}>Noch keine Fahrlehrer angelegt.</Text>;
  return (
    <Auswahl
      wert={wert ?? "keiner"}
      onWechsel={(id) => onWechsel(id === "keiner" ? null : id)}
      optionen={[{ id: "keiner", titel: "Keiner" }, ...fahrlehrer.map((l) => ({ id: l.id, titel: nameVon(l), icon: "school" as const }))]}
    />
  );
}

function PasswortFeld({ wert, onWechsel }: { wert: string; onWechsel: (p: string) => void }) {
  const f = useFarbwelt();
  return (
    <MEingabe
      icon="key-outline"
      value={wert}
      onChangeText={onWechsel}
      autoCapitalize="none"
      autoCorrect={false}
      placeholder="mindestens 8 Zeichen"
      rechts={
        <Pressable onPress={() => onWechsel(passwortVorschlag())} accessibilityRole="button" style={(z: Zustand) => ({ flexDirection: "row", alignItems: "center", gap: 5, height: 30, paddingHorizontal: 10, borderRadius: 15, backgroundColor: z.hovered ? f.orangeSoft : "transparent" })}>
          <Icon name="sparkles" size={14} color={f.orange} />
          <Text style={{ ...schrift.textHalb, fontSize: 13, color: f.orange }}>Erzeugen</Text>
        </Pressable>
      }
    />
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
  const f = useFarbwelt();
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
      <Fenster offen={offen} onSchliessen={onSchliessen} titel="Zugang angelegt" unter={`${fertig.name} kann sich jetzt in der App anmelden.`} breite={500}>
        <View style={{ borderRadius: 18, padding: 18, gap: 12, backgroundColor: f.hell ? "#FFFFFF" : "rgba(255,255,255,0.04)", borderWidth: 1, borderColor: f.linie }}>
          {[
            ["E-Mail", fertig.email],
            ["Passwort", fertig.passwort],
          ].map(([k, w]) => (
            <View key={k} style={{ gap: 3 }}>
              <Text style={{ ...schrift.textHalb, fontSize: 12, letterSpacing: 0.6, textTransform: "uppercase", color: f.text3 }}>{k}</Text>
              <Text selectable style={{ ...schrift.textHalb, fontSize: 17, color: f.text, fontVariant: ["tabular-nums"] }}>
                {w}
              </Text>
            </View>
          ))}
        </View>
        <Hinweis>Gib die Zugangsdaten persönlich weiter. Das Passwort lässt sich später in der App unter Einstellungen ändern.</Hinweis>
        <View style={{ flexDirection: "row", gap: 10 }}>
          <MKnopf titel={kopiert ? "Kopiert" : "Kopieren"} icon={kopiert ? "checkmark" : "copy-outline"} art="sekundaer" onPress={kopieren} style={{ flex: 1 }} />
          <MKnopf
            titel="Noch einen anlegen"
            icon="person-add"
            onPress={() => {
              setZ({ ...LEER(), fahrlehrer_id: z.fahrlehrer_id, rolle: z.rolle, klasse: z.klasse });
              setFertig(null);
              setKopiert(false);
            }}
            style={{ flex: 1 }}
          />
        </View>
      </Fenster>
    );
  }

  return (
    <Fenster offen={offen} onSchliessen={onSchliessen} titel="Zugang anlegen" unter="Mit E-Mail und Passwort – die Adresse gilt sofort als bestätigt.">
      <View style={{ flexDirection: "row", gap: 14 }}>
        <Feld titel="Name" style={{ flex: 1 }}>
          <MEingabe icon="person-outline" placeholder="Vor- und Nachname" value={z.name} onChangeText={(t) => setzen("name", t)} maxLength={40} autoFocus />
        </Feld>
        <Feld titel="E-Mail" style={{ flex: 1.2 }}>
          <MEingabe icon="mail-outline" placeholder="name@beispiel.de" value={z.email} onChangeText={(t) => setzen("email", t)} autoCapitalize="none" keyboardType="email-address" autoCorrect={false} />
        </Feld>
      </View>
      <Feld titel="Passwort" hinweis="Vorgeschlagen ist ein gut lesbares Passwort – du kannst auch ein eigenes eintippen.">
        <PasswortFeld wert={z.passwort} onWechsel={(p) => setzen("passwort", p)} />
      </Feld>
      <Feld titel="Rolle">
        <Auswahl<Rolle>
          wert={z.rolle}
          onWechsel={(r) => setzen("rolle", r)}
          optionen={[
            { id: "schueler", titel: "Fahrschüler", icon: "person" },
            { id: "fahrlehrer", titel: "Fahrlehrer", icon: "school" },
          ]}
        />
      </Feld>
      <Feld titel="Führerscheinklasse">
        <KlassenWahl wert={z.klasse} onWechsel={(k) => setzen("klasse", k)} />
      </Feld>
      {z.rolle === "schueler" ? (
        <Feld titel="Fahrlehrer" hinweis="Zu welchem Fahrlehrer gehört der Fahrschüler?">
          <LehrerWahl wert={z.fahrlehrer_id} onWechsel={(id) => setzen("fahrlehrer_id", id)} fahrlehrer={fahrlehrer} />
        </Feld>
      ) : null}
      <SchalterZeile titel="Darf Clips hochladen" unter={z.rolle === "fahrlehrer" ? "Fahrlehrer dürfen das immer." : "Kurze Videos für alle im Clips-Tab"} wert={z.rolle === "fahrlehrer" || z.darf_clips} aus={z.rolle === "fahrlehrer"} onWechsel={(w) => setzen("darf_clips", w)} />
      <Feld titel="Notiz (nur für dich)">
        <MEingabe mehrzeilig placeholder="z. B. Theoriekurs März, Prüfung geplant im Mai" value={z.notiz} onChangeText={(t) => setzen("notiz", t)} maxLength={500} />
      </Feld>
      {fehler ? <Hinweis art="fehler">{fehler}</Hinweis> : null}
      <View style={{ flexDirection: "row", justifyContent: "flex-end", gap: 10 }}>
        <MKnopf titel="Abbrechen" art="leise" onPress={onSchliessen} />
        <MKnopf titel="Zugang anlegen" icon="person-add" laedt={laeuft} onPress={anlegen} />
      </View>
    </Fenster>
  );
}

function SchalterZeile({ titel, unter, wert, onWechsel, aus }: { titel: string; unter?: string; wert: boolean; onWechsel: (w: boolean) => void; aus?: boolean }) {
  const f = useFarbwelt();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 14, padding: 14, borderRadius: 16, backgroundColor: f.hell ? "#FFFFFF" : "rgba(255,255,255,0.04)", borderWidth: 1, borderColor: f.linie, opacity: aus ? 0.6 : 1 }}>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ ...schrift.textHalb, fontSize: 14.5, color: f.text }}>{titel}</Text>
        {unter ? <Text style={{ ...schrift.text, fontSize: 12.5, color: f.text3 }}>{unter}</Text> : null}
      </View>
      <View pointerEvents={aus ? "none" : "auto"}>
        <Schalter wert={wert} onWechsel={onWechsel} />
      </View>
    </View>
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
  const f = useFarbwelt();
  const rot = rotVon(f);
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

  const abschnitt = (titel: string) => <Text style={{ ...schrift.textHalb, fontSize: 12, letterSpacing: 0.8, textTransform: "uppercase", color: f.text3, marginTop: 6 }}>{titel}</Text>;

  return (
    <SeitenBlatt offen={!!nutzer} onSchliessen={onSchliessen}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 24, paddingTop: 22, paddingBottom: 18, borderBottomWidth: 1, borderBottomColor: f.linie }}>
        <NutzerBild pfad={n.bild_pfad} name={nameVon(n)} farbe={n.avatar_farbe ?? undefined} groesse={52} />
        <View style={{ flex: 1, gap: 6 }}>
          <Text style={{ ...schrift.titel, fontSize: 20, letterSpacing: -0.3, color: f.text }} numberOfLines={1}>
            {nameVon(n)}
          </Text>
          <View style={{ flexDirection: "row", gap: 6, flexWrap: "wrap" }}>
            <RolleMarke rolle={n.rolle} inhaber={n.inhaber} />
            <StatusPlakette status={n.status} bis={n.pausiert_bis} />
          </View>
        </View>
        <SchliessenTaste onPress={onSchliessen} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 24, gap: 16, paddingBottom: 40 }}>
        {meldung ? <Hinweis art={meldung.art}>{meldung.text}</Hinweis> : null}

        <View style={{ flexDirection: "row", gap: 10 }}>
          {[
            { wert: n.fragen_gesamt, titel: "Fragen" },
            { wert: n.fragen_gesamt ? `${Math.round(anteil(n) * 100)} %` : "–", titel: "richtig" },
            { wert: n.xp, titel: "XP" },
            { wert: n.serie, titel: "Tage Serie" },
          ].map((w) => (
            <View key={w.titel} style={{ flex: 1, alignItems: "center", paddingVertical: 12, borderRadius: 14, backgroundColor: f.hell ? "#FFFFFF" : "rgba(255,255,255,0.04)", borderWidth: 1, borderColor: f.linie }}>
              <Text style={{ ...schrift.titel, fontSize: 18, color: f.text, fontVariant: ["tabular-nums"] }}>{w.wert}</Text>
              <Text style={{ ...schrift.textMittel, fontSize: 11.5, color: f.text3 }}>{w.titel}</Text>
            </View>
          ))}
        </View>

        {abschnitt("Konto")}
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
        {n.anbieter !== "email" ? <Text style={{ ...schrift.text, fontSize: 12.5, color: f.text3 }}>Meldet sich mit {n.anbieter === "apple" ? "Apple" : n.anbieter === "google" ? "Google" : n.anbieter} an – die E-Mail kommt von dort.</Text> : null}

        {abschnitt("Zugehörigkeit")}
        <Feld titel="Rolle">
          <Auswahl<Rolle>
            wert={form.rolle}
            onWechsel={(r) => setForm({ ...form, rolle: r })}
            optionen={[
              { id: "schueler", titel: "Fahrschüler", icon: "person" },
              { id: "fahrlehrer", titel: "Fahrlehrer", icon: "school" },
            ]}
          />
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
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                {schueler.map((s) => (
                  <View key={s.id} style={{ height: 30, paddingHorizontal: 11, borderRadius: 15, justifyContent: "center", backgroundColor: mitDeckkraft(BLAU, f.hell ? 0.08 : 0.14) }}>
                    <Text style={{ ...schrift.textHalb, fontSize: 13, color: f.text }}>{nameVon(s)}</Text>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={{ ...schrift.text, fontSize: 13.5, color: f.text3 }}>Noch keine Fahrschüler zugeordnet.</Text>
            )}
          </Feld>
        )}
        <SchalterZeile titel="Darf Clips hochladen" unter={form.rolle === "fahrlehrer" ? "Fahrlehrer dürfen das immer." : "Kurze Videos für alle im Clips-Tab"} wert={form.rolle === "fahrlehrer" || form.darf_clips} aus={form.rolle === "fahrlehrer"} onWechsel={(w) => setForm({ ...form, darf_clips: w })} />
        <Feld titel="Notiz (nur für dich)">
          <MEingabe mehrzeilig value={form.notiz} onChangeText={(t) => setForm({ ...form, notiz: t })} maxLength={500} placeholder="z. B. Theoriekurs März" />
        </Feld>
        <MKnopf titel="Änderungen speichern" icon="checkmark" deaktiviert={!geaendert} laedt={laeuft === "sichern"} onPress={sichern} />

        {abschnitt("Passwort")}
        <PasswortFeld wert={passwort} onWechsel={setPasswort} />
        <MKnopf titel="Neues Passwort setzen" icon="key" art="sekundaer" deaktiviert={!passwort} laedt={laeuft === "passwort"} onPress={passwortSetzen} />

        {abschnitt("Zugang")}
        {geschuetzt ? (
          <Hinweis>{n.ich ? "Das ist dein eigenes Konto – das kannst du hier nicht pausieren, sperren oder löschen." : "Inhaber-Konten lassen sich nicht pausieren, sperren oder löschen."}</Hinweis>
        ) : n.status === "aktiv" ? (
          <View style={{ gap: 12, padding: 16, borderRadius: 18, borderWidth: 1, borderColor: f.linie, backgroundColor: f.hell ? "#FFFFFF" : "rgba(255,255,255,0.03)" }}>
            <Text style={{ ...schrift.textHalb, fontSize: 14.5, color: f.text }}>Pausieren</Text>
            <Text style={{ ...schrift.text, fontSize: 13, lineHeight: 18, color: f.text3 }}>Der Lernstand bleibt, anmelden geht erst nach der Pause wieder – z. B. bei offener Rechnung oder Kurs-Pause.</Text>
            <Auswahl wert={pause} onWechsel={setPause} optionen={PAUSE_TAGE.map((p) => ({ id: p.id, titel: p.titel }))} />
            <View style={{ flexDirection: "row", gap: 10 }}>
              <MKnopf titel="Pausieren" icon="pause" art="sekundaer" laedt={laeuft === "status"} onPress={pausieren} style={{ flex: 1 }} />
              <MKnopf titel="Sperren" icon="ban" art="gefahr" onPress={sperren} style={{ flex: 1 }} />
            </View>
          </View>
        ) : (
          <View style={{ gap: 10 }}>
            <Hinweis art="fehler">
              {n.status === "gesperrt" ? "Dieser Zugang ist gesperrt." : n.pausiert_bis ? `Pausiert bis ${datumText(n.pausiert_bis)}.` : "Pausiert, bis du die Pause aufhebst."}
            </Hinweis>
            <MKnopf titel={n.status === "gesperrt" ? "Zugang wieder freigeben" : "Pause aufheben"} icon="play" laedt={laeuft === "status"} onPress={freigeben} />
            {n.status === "pausiert" ? <MKnopf titel="Stattdessen sperren" icon="ban" art="gefahr" onPress={sperren} /> : null}
          </View>
        )}

        {abschnitt("Info")}
        <View style={{ gap: 8 }}>
          {[
            ["Angelegt", datumText(n.erstellt_am)],
            ["Zuletzt angemeldet", wannText(n.zuletzt_aktiv)],
            ["Anmeldung über", n.anbieter === "email" ? "E-Mail & Passwort" : n.anbieter === "apple" ? "Apple" : n.anbieter === "google" ? "Google" : n.anbieter],
            ["E-Mail bestätigt", n.bestaetigt ? "Ja" : "Nein"],
            ["Rolle", n.inhaber ? "Inhaber" : ROLLE_TEXT[n.rolle]],
          ].map(([k, w]) => (
            <View key={k} style={{ flexDirection: "row", justifyContent: "space-between", gap: 10 }}>
              <Text style={{ ...schrift.text, fontSize: 13.5, color: f.text3 }}>{k}</Text>
              <Text style={{ ...schrift.textHalb, fontSize: 13.5, color: f.text }}>{w}</Text>
            </View>
          ))}
        </View>

        {geschuetzt ? null : (
          <Pressable
            onPress={loeschen}
            disabled={laeuft === "loeschen"}
            style={(z: Zustand) => ({ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, height: 44, marginTop: 10, borderRadius: 22, borderWidth: 1, borderColor: mitDeckkraft(rot, 0.4), backgroundColor: z.hovered ? mitDeckkraft(rot, 0.08) : "transparent" })}
          >
            <Icon name="trash-outline" size={16} color={rot} />
            <Text style={{ ...schrift.textHalb, fontSize: 14.5, color: rot }}>{laeuft === "loeschen" ? "Wird gelöscht …" : "Konto löschen"}</Text>
          </Pressable>
        )}
      </ScrollView>
    </SeitenBlatt>
  );
}

/** Kleine Liste für die Übersicht: Fahrlehrer mit Anzahl ihrer Fahrschüler. */
export function LehrerUebersicht({ nutzer, onWaehlen }: { nutzer: ManagerNutzer[]; onWaehlen: (id: string) => void }) {
  const f = useFarbwelt();
  const lehrer = nutzer.filter((n) => n.rolle === "fahrlehrer");
  return (
    <MKarte titel="Fahrlehrer" style={{ flex: 1, minWidth: 300 }}>
      {lehrer.length === 0 ? (
        <Text style={{ ...schrift.text, fontSize: 13.5, color: f.text3 }}>Noch keine Fahrlehrer. Leg einen Zugang mit der Rolle „Fahrlehrer“ an.</Text>
      ) : (
        <View style={{ gap: 4 }}>
          {lehrer.map((l) => {
            const anzahl = nutzer.filter((s) => s.fahrlehrer_id === l.id).length;
            return (
              <Pressable
                key={l.id}
                onPress={() => onWaehlen(l.id)}
                style={(z: Zustand) => ({ flexDirection: "row", alignItems: "center", gap: 12, padding: 8, borderRadius: 14, backgroundColor: z.hovered ? (f.hell ? "#FAF7F2" : "rgba(255,255,255,0.04)") : "transparent" })}
              >
                <NutzerBild pfad={l.bild_pfad} name={nameVon(l)} farbe={l.avatar_farbe ?? undefined} groesse={34} />
                <Text style={{ flex: 1, ...schrift.textHalb, fontSize: 14, color: f.text }} numberOfLines={1}>
                  {nameVon(l)}
                </Text>
                <Text style={{ ...schrift.textMittel, fontSize: 13, color: f.text3 }}>{anzahl === 1 ? "1 Schüler" : `${anzahl} Schüler`}</Text>
                <Icon name="chevron-forward" size={15} color={f.text3} />
              </Pressable>
            );
          })}
        </View>
      )}
    </MKarte>
  );
}
