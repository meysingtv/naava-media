import { useState, type ReactNode } from "react";
import { Pressable, ScrollView, Text, useWindowDimensions, View } from "react-native";

import { Logo } from "@/components/grafik";
import { Icon, type IconName } from "@/components/icon";
import { WahlKachel } from "@/components/web/auth-web";
import { B, Chip, Kachel, Knopf, n, Raster, Reiter, Schalter, TOENE, type Zustand, webDunkel } from "@/components/web/bunt";
import { useTasten } from "@/components/web/frage-web";
import type { Darstellung } from "@/lib/darstellung";
import { HAUPT_KLASSEN, KLASSEN } from "@/lib/klassen";

// Einrichtung am PC: oben Logo, Schritt-Anzeige und „Später“, in der Mitte
// eine breite Karte mit dem Schritt (große Auswahl-Kacheln), unten in der
// Karte Zurück und Weiter. Enter geht einen Schritt weiter. Die Logik bleibt
// in der Route (app/einrichtung.tsx).

const NAMEN = ["Klasse", "Prüfung", "Tagesziel", "Darstellung"];
const WOCHENTAGE = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
const MONATE = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];
const TAGE_KURZ = ["So.", "Mo.", "Di.", "Mi.", "Do.", "Fr.", "Sa."];

const zwei = (x: number) => String(x).padStart(2, "0");
function tagesBeginn(d: Date) {
  const k = new Date(d);
  k.setHours(0, 0, 0, 0);
  return k;
}
function tageBis(d: Date) {
  return Math.round((tagesBeginn(d).getTime() - tagesBeginn(new Date()).getTime()) / 86_400_000);
}

export type Erinnerung = { an: boolean; stunde: number; minute: number };

export type EinrichtungWebProps = {
  schritt: number;
  onSchritt: (s: number) => void;
  klasse: string;
  onKlasse: (k: string) => void;
  termin: Date | null;
  keinTermin: boolean;
  stunde: number;
  onTermin: (d: Date) => void;
  onKein: (k: boolean) => void;
  onStunde: (h: number) => void;
  uhrzeiten: number[];
  ziele: { n: number; name: string; min: number }[];
  ziel: number;
  empfohlen: number;
  onZiel: (x: number) => void;
  erinnerung: Erinnerung;
  onErinnerung: (e: Erinnerung) => void;
  darstellung: Darstellung;
  onDarstellung: (d: Darstellung) => void;
  vorname: string;
  terminText: string;
  onFertig: () => void;
  onSpaeter: () => void;
};

// ---------------------------------------------------------------------------
// Kleine Bausteine
// ---------------------------------------------------------------------------

/** Schritt-Anzeige oben: Nummer im Kreis, Name, Verbindungslinie. */
function Schritte({ schritt }: { schritt: number }) {
  const { width } = useWindowDimensions();
  const mitNamen = width >= 1100;
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
      {NAMEN.map((name, i) => {
        const fertig = i < schritt;
        const jetzt = i === schritt;
        return (
          <View key={name} style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            {i > 0 ? <View style={{ width: mitNamen ? 28 : 18, height: 2, borderRadius: 1, backgroundColor: fertig || jetzt ? B.orange : B.linie }} /> : null}
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <View
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: 13,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: fertig ? B.orange : B.flaeche,
                  borderWidth: fertig ? 0 : 1.5,
                  borderColor: jetzt ? B.orange : B.linie,
                }}
              >
                {fertig ? <Icon name="checkmark" size={15} color="#FFFFFF" /> : <Text style={{ ...n.schwarz, fontSize: 12.5, color: jetzt ? B.orange : B.text3 }}>{i + 1}</Text>}
              </View>
              {mitNamen ? <Text style={{ ...n.fett, fontSize: 14, color: jetzt ? B.text : fertig ? B.text2 : B.text3 }}>{name}</Text> : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}

/** Titel des Schritts. */
function Kopf({ nr, titel, unter }: { nr?: number; titel: string; unter: string }) {
  return (
    <View style={{ gap: 6 }}>
      {nr ? <Text style={{ ...n.fett, fontSize: 14, color: B.text3 }}>Schritt {nr} von 4</Text> : null}
      <Text style={{ ...n.schwarz, fontSize: 32, lineHeight: 38, color: B.text }}>{titel}</Text>
      <Text style={{ ...n.halb, fontSize: 16, lineHeight: 23, color: B.text2 }}>{unter}</Text>
    </View>
  );
}

/** Runder, ruhiger Knopf (Monat vor/zurück, Uhrzeit ±). */
function RundKnopf({ icon, onPress, label, aus }: { icon: IconName; onPress: () => void; label: string; aus?: boolean }) {
  return (
    <Pressable
      disabled={aus}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={(z: Zustand) => ({ width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center", borderWidth: 1.5, borderColor: z.hovered && !aus ? B.kante : B.linie, backgroundColor: z.hovered && !aus ? B.hover : B.flaeche, opacity: aus ? 0.35 : 1 })}
    >
      <Icon name={icon} size={17} color={B.text} />
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// Schritt 1: Klasse
// ---------------------------------------------------------------------------

function SchrittKlasse({ wert, onWahl }: { wert: string; onWahl: (k: string) => void }) {
  const [mehr, setMehr] = useState(!HAUPT_KLASSEN.includes(wert));
  const haupt = KLASSEN.filter((k) => HAUPT_KLASSEN.includes(k.id)).sort((a, b) => HAUPT_KLASSEN.indexOf(a.id) - HAUPT_KLASSEN.indexOf(b.id));
  const weitere = KLASSEN.filter((k) => !HAUPT_KLASSEN.includes(k.id));
  return (
    <View style={{ gap: 18 }}>
      <Raster min={220} max={3} abstand={14}>
        {haupt.map((k) => {
          const aktiv = k.id === wert;
          const S = k.symbol;
          return (
            <WahlKachel key={k.id} aktiv={aktiv} onPress={() => onWahl(k.id)} label={`Klasse ${k.id}, ${k.kurz}`}>
              <View style={{ padding: 18, gap: 14 }}>
                <S size={34} color={aktiv ? B.orange : B.text2} weight="duotone" />
                <View>
                  <Text style={{ ...n.schwarz, fontSize: 24, color: B.text }}>Klasse {k.id}</Text>
                  <Text style={{ ...n.halb, fontSize: 14, color: B.text2 }} numberOfLines={1}>
                    {k.text}
                  </Text>
                </View>
              </View>
            </WahlKachel>
          );
        })}
      </Raster>
      <Pressable onPress={() => setMehr((m) => !m)} accessibilityRole="button" style={(z: Zustand) => ({ alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 6, height: 34, paddingHorizontal: 10, marginLeft: -10, borderRadius: 10, backgroundColor: z.hovered ? B.ton : "transparent" })}>
        <Text style={{ ...n.fett, fontSize: 14.5, color: B.text2 }}>{mehr ? "Weniger Klassen" : "Lkw, Bus, Traktor …"}</Text>
        <Icon name={mehr ? "chevron-up" : "chevron-down"} size={15} color={B.text2} />
      </Pressable>
      {mehr ? (
        <Raster min={170} max={4} abstand={10}>
          {weitere.map((k) => {
            const aktiv = k.id === wert;
            return (
              <WahlKachel key={k.id} aktiv={aktiv} onPress={() => onWahl(k.id)} label={`Klasse ${k.id}, ${k.kurz}`}>
                <View style={{ paddingVertical: 12, paddingHorizontal: 14 }}>
                  <Text style={{ ...n.schwarz, fontSize: 18, color: B.text }}>{k.id}</Text>
                  <Text style={{ ...n.halb, fontSize: 13, color: B.text2 }} numberOfLines={1}>
                    {k.kurz}
                  </Text>
                </View>
              </WahlKachel>
            );
          })}
        </Raster>
      ) : null}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Schritt 2: Prüfungstermin
// ---------------------------------------------------------------------------

function Kalender({ wert, onWahl }: { wert: Date | null; onWahl: (d: Date) => void }) {
  const heute = tagesBeginn(new Date());
  const [monat, setMonat] = useState(() => {
    const m = new Date(wert ?? heute);
    m.setDate(1);
    return m;
  });
  const grenze = new Date(heute);
  grenze.setFullYear(heute.getFullYear() + 1);
  const zelle = `${100 / 7}%` as const;
  const versatz = (monat.getDay() + 6) % 7;
  const tage = new Date(monat.getFullYear(), monat.getMonth() + 1, 0).getDate();
  const felder: (Date | null)[] = [...Array.from({ length: versatz }, () => null), ...Array.from({ length: tage }, (_, i) => new Date(monat.getFullYear(), monat.getMonth(), i + 1))];
  const zurueckGeht = monat > new Date(heute.getFullYear(), heute.getMonth(), 1);
  const vorGeht = new Date(monat.getFullYear(), monat.getMonth() + 1, 1) <= grenze;
  const blaettern = (x: number) => setMonat((m) => new Date(m.getFullYear(), m.getMonth() + x, 1));
  return (
    <View style={{ borderRadius: 16, borderWidth: 1.5, borderColor: B.linie, padding: 16 }}>
      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
        <Text style={{ ...n.schwarz, fontSize: 18, color: B.text, flex: 1, paddingLeft: 4 }}>
          {MONATE[monat.getMonth()]} {monat.getFullYear()}
        </Text>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <RundKnopf icon="chevron-back" label="Voriger Monat" onPress={() => blaettern(-1)} aus={!zurueckGeht} />
          <RundKnopf icon="chevron-forward" label="Nächster Monat" onPress={() => blaettern(1)} aus={!vorGeht} />
        </View>
      </View>
      <View style={{ flexDirection: "row", marginBottom: 2 }}>
        {WOCHENTAGE.map((t) => (
          <Text key={t} style={{ width: zelle, textAlign: "center", ...n.fett, fontSize: 12.5, color: B.text3 }}>
            {t}
          </Text>
        ))}
      </View>
      <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
        {felder.map((d, i) => {
          if (!d) return <View key={`l${i}`} style={{ width: zelle, height: 44 }} />;
          const vorbei = d < heute || d > grenze;
          const gewaehlt = !!wert && tagesBeginn(wert).getTime() === d.getTime();
          const istHeute = d.getTime() === heute.getTime();
          return (
            <Pressable
              key={d.toISOString()}
              disabled={vorbei}
              onPress={() => onWahl(d)}
              accessibilityRole="button"
              accessibilityLabel={`${d.getDate()}. ${MONATE[d.getMonth()]}`}
              accessibilityState={{ selected: gewaehlt, disabled: vorbei }}
              style={{ width: zelle, height: 44, alignItems: "center", justifyContent: "center" }}
            >
              {(z: Zustand) => (
                <View
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 19,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: gewaehlt ? B.orange : z.hovered && !vorbei ? B.ton : "transparent",
                    borderWidth: istHeute && !gewaehlt ? 1.5 : 0,
                    borderColor: B.orange,
                  }}
                >
                  <Text style={{ ...(gewaehlt || istHeute ? n.schwarz : n.halb), fontSize: 15, color: gewaehlt ? "#FFFFFF" : vorbei ? "#D3D4D6" : istHeute ? B.orangeKante : B.text }}>{d.getDate()}</Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function SchrittTermin(p: EinrichtungWebProps) {
  const tage = p.termin ? tageBis(p.termin) : null;
  return (
    <View style={{ gap: 20 }}>
      <Reiter
        optionen={[
          { id: "steht", titel: "Termin steht" },
          { id: "kein", titel: "Noch kein Termin" },
        ]}
        wert={p.keinTermin ? "kein" : "steht"}
        onWechsel={(w) => p.onKein(w === "kein")}
      />
      {p.keinTermin ? (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 16, padding: 20, borderRadius: 16, backgroundColor: B.ton }}>
          <Icon name="calendar-outline" size={26} color={B.text2} />
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={{ ...n.fett, fontSize: 16, color: B.text }}>Kein Problem</Text>
            <Text style={{ ...n.halb, fontSize: 14.5, lineHeight: 21, color: B.text2 }}>Sobald du deinen Termin hast, trägst du ihn unter „Prüfung“ ein. Bis dahin lernst du in deinem Tempo.</Text>
          </View>
        </View>
      ) : (
        <View style={{ flexDirection: "row", gap: 24, flexWrap: "wrap", alignItems: "flex-start" }}>
          <View style={{ flex: 1.3, minWidth: 340 }}>
            <Kalender wert={p.termin} onWahl={p.onTermin} />
          </View>
          <View style={{ flex: 1, minWidth: 240, gap: 18 }}>
            <View style={{ gap: 10 }}>
              <Text style={{ ...n.fett, fontSize: 14, color: B.text2 }}>Uhrzeit</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {p.uhrzeiten.map((h) => {
                  const aktiv = h === p.stunde;
                  return (
                    <Pressable
                      key={h}
                      onPress={() => p.onStunde(h)}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: aktiv }}
                      style={(z: Zustand) => ({
                        width: "23%",
                        flexGrow: 1,
                        height: 40,
                        borderRadius: 11,
                        alignItems: "center",
                        justifyContent: "center",
                        borderWidth: 1.5,
                        borderColor: aktiv ? B.orange : z.hovered ? B.kante : B.linie,
                        backgroundColor: aktiv ? B.orangeHell : B.flaeche,
                      })}
                    >
                      <Text style={{ ...n.fett, fontSize: 14.5, color: aktiv ? B.orangeKante : B.text, fontVariant: ["tabular-nums"] }}>{zwei(h)}:00</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
            {p.termin && tage != null ? (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 16, borderRadius: 14, backgroundColor: B.ton }}>
                <Icon name="calendar" size={22} color={B.orange} />
                <View style={{ flex: 1 }}>
                  <Text style={{ ...n.fett, fontSize: 15, color: B.text }}>
                    {TAGE_KURZ[p.termin.getDay()]} {p.termin.getDate()}. {MONATE[p.termin.getMonth()]}, {zwei(p.stunde)}:00 Uhr
                  </Text>
                  <Text style={{ ...n.halb, fontSize: 13.5, color: B.text2 }}>{tage === 0 ? "Heute ist Prüfungstag!" : tage === 1 ? "Schon morgen – du schaffst das." : `Noch ${tage} Tage – genug Zeit zum Lernen.`}</Text>
                </View>
              </View>
            ) : (
              <Text style={{ ...n.halb, fontSize: 14, lineHeight: 20, color: B.text3 }}>Wähl links den Tag deiner Prüfung.</Text>
            )}
          </View>
        </View>
      )}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Schritt 3: Tagesziel + Erinnerung
// ---------------------------------------------------------------------------

function SchrittZiel(p: EinrichtungWebProps) {
  const e = p.erinnerung;
  const schieben = (min: number) => {
    const gesamt = (((e.stunde * 60 + e.minute + min) % 1440) + 1440) % 1440;
    p.onErinnerung({ ...e, stunde: Math.floor(gesamt / 60), minute: gesamt % 60 });
  };
  return (
    <View style={{ gap: 20 }}>
      <Raster min={160} max={4} abstand={14}>
        {p.ziele.map((z) => {
          const aktiv = z.n === p.ziel;
          return (
            <WahlKachel key={z.n} aktiv={aktiv} onPress={() => p.onZiel(z.n)} label={`${z.n} Fragen am Tag, ${z.name}`}>
              <View style={{ padding: 18, gap: 12 }}>
                <View>
                  <Text style={{ ...n.schwarz, fontSize: 34, lineHeight: 40, color: aktiv ? B.orange : B.text, fontVariant: ["tabular-nums"] }}>{z.n}</Text>
                  <Text style={{ ...n.halb, fontSize: 13, color: B.text3 }}>Fragen am Tag</Text>
                </View>
                <View>
                  <Text style={{ ...n.fett, fontSize: 16, color: B.text }}>{z.name}</Text>
                  <Text style={{ ...n.halb, fontSize: 13.5, color: B.text2 }}>ca. {z.min} Minuten</Text>
                </View>
                <View style={{ height: 32, alignItems: "flex-start" }}>{z.n === p.empfohlen ? <Chip text="Empfohlen" ton={TOENE.gruen} /> : null}</View>
              </View>
            </WahlKachel>
          );
        })}
      </Raster>

      <View style={{ flexDirection: "row", alignItems: "center", gap: 16, paddingVertical: 14, paddingHorizontal: 18, borderRadius: 16, borderWidth: 1.5, borderColor: B.linie, flexWrap: "wrap" }}>
        <Icon name="notifications-outline" size={24} color={B.orange} />
        <View style={{ flex: 1, minWidth: 200 }}>
          <Text style={{ ...n.fett, fontSize: 16, color: B.text }}>Tägliche Erinnerung</Text>
          <Text style={{ ...n.halb, fontSize: 13.5, color: B.text2 }}>Ein kurzer Stups, damit deine Serie hält</Text>
        </View>
        {e.an ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <RundKnopf icon="remove" label="15 Minuten früher" onPress={() => schieben(-15)} />
            <Text style={{ ...n.schwarz, fontSize: 22, color: B.text, fontVariant: ["tabular-nums"], minWidth: 64, textAlign: "center" }}>
              {zwei(e.stunde)}:{zwei(e.minute)}
            </Text>
            <RundKnopf icon="add" label="15 Minuten später" onPress={() => schieben(15)} />
          </View>
        ) : null}
        <Schalter wert={e.an} onWechsel={(an) => p.onErinnerung({ ...e, an })} ton={TOENE.orange} />
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Schritt 4: Darstellung
// ---------------------------------------------------------------------------

/** Mini-Bildschirm als Vorschau von hell oder dunkel – schlicht, ohne Verlauf. */
function MiniApp({ hell }: { hell: boolean }) {
  const grund = hell ? "#F4F1EC" : "#07090C";
  const karte = hell ? "#FFFFFF" : "#16191E";
  const linie = hell ? "#E5E0D8" : "#262A31";
  const text = hell ? "#14171B" : "#FFFFFF";
  return (
    <View style={{ height: 170, borderRadius: 12, backgroundColor: grund, padding: 14, gap: 9, overflow: "hidden" }}>
      <View style={{ width: "50%", height: 9, borderRadius: 5, backgroundColor: text, opacity: 0.85 }} />
      <View style={{ width: "32%", height: 6, borderRadius: 3, backgroundColor: text, opacity: 0.35 }} />
      <View style={{ flexDirection: "row", gap: 7, marginTop: 4 }}>
        {[0, 1, 2].map((i) => (
          <View key={i} style={{ flex: 1, height: 36, borderRadius: 8, backgroundColor: karte, borderWidth: 1, borderColor: linie }} />
        ))}
      </View>
      <View style={{ height: 24, borderRadius: 8, backgroundColor: B.orange }} />
      <View style={{ height: 40, borderRadius: 9, backgroundColor: karte, borderWidth: 1, borderColor: linie }} />
    </View>
  );
}

function SchrittDarstellung({ wert, onWahl }: { wert: Darstellung; onWahl: (d: Darstellung) => void }) {
  const optionen: { id: Darstellung; titel: string; unter: string; icon: IconName }[] = [
    { id: "hell", titel: "Tagfahrt", unter: "Hell", icon: "sunny-outline" },
    { id: "dunkel", titel: "Nachtfahrt", unter: "Dunkel", icon: "moon-outline" },
  ];
  return (
    <View style={{ gap: 16 }}>
      <View style={{ flexDirection: "row", gap: 16 }}>
        {optionen.map((o) => {
          const aktiv = o.id === wert;
          return (
            <WahlKachel key={o.id} aktiv={aktiv} onPress={() => onWahl(o.id)} label={`${o.titel}, ${o.unter}`} style={{ flex: 1 }}>
              <View style={{ padding: 12, gap: 14 }}>
                <MiniApp hell={o.id === "hell"} />
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 6, paddingBottom: 4 }}>
                  <Icon name={o.icon} size={21} color={aktiv ? B.orange : B.text2} />
                  <View>
                    <Text style={{ ...n.fett, fontSize: 15.5, color: B.text }}>{o.titel}</Text>
                    <Text style={{ ...n.halb, fontSize: 13, color: B.text3 }}>{o.unter}</Text>
                  </View>
                </View>
              </View>
            </WahlKachel>
          );
        })}
      </View>
      <Text style={{ ...n.halb, fontSize: 14, color: B.text3 }}>Clips, Kamera und Lives bleiben immer dunkel.</Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Fertig
// ---------------------------------------------------------------------------

function Fertig({ name, zeilen }: { name: string; zeilen: { icon: IconName; titel: string; wert: string }[] }) {
  return (
    <View style={{ alignItems: "center", gap: 24 }}>
      <View style={{ width: 76, height: 76, borderRadius: 38, backgroundColor: B.gruen, alignItems: "center", justifyContent: "center", borderBottomWidth: 4, borderBottomColor: B.gruenKante }}>
        <Icon name="checkmark" size={40} color="#FFFFFF" />
      </View>
      <View style={{ alignItems: "center", gap: 6 }}>
        <Text style={{ ...n.schwarz, fontSize: 32, lineHeight: 38, color: B.text, textAlign: "center" }}>{name ? `Alles bereit, ${name}!` : "Alles bereit!"}</Text>
        <Text style={{ ...n.halb, fontSize: 16, color: B.text2, textAlign: "center" }}>Dein Lernplan steht. Alles lässt sich später in den Einstellungen ändern.</Text>
      </View>
      <View style={{ alignSelf: "stretch", maxWidth: 520, width: "100%", marginHorizontal: "auto", borderRadius: 16, borderWidth: 1.5, borderColor: B.linie }}>
        {zeilen.map((z, i) => (
          <View key={z.titel} style={{ flexDirection: "row", alignItems: "center", gap: 14, height: 56, paddingHorizontal: 18, borderTopWidth: i ? 1.5 : 0, borderTopColor: B.ton }}>
            <Icon name={z.icon} size={20} color={B.orange} />
            <Text style={{ flex: 1, ...n.halb, fontSize: 15, color: B.text2 }}>{z.titel}</Text>
            <Text style={{ ...n.fett, fontSize: 15, color: B.text }}>{z.wert}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Seite
// ---------------------------------------------------------------------------

const KOEPFE: { titel: string; unter: string }[] = [
  { titel: "Welchen Führerschein machst du?", unter: "Wir zeigen dir genau die Fragen, die in deiner Prüfung drankommen." },
  { titel: "Wann ist deine Theorieprüfung?", unter: "Dann planen wir dein Tagesziel passend und zählen mit dir runter." },
  { titel: "Wie viel pro Tag?", unter: "Kleine, tägliche Schritte bringen am meisten. Du kannst es jederzeit ändern." },
  { titel: "Hell oder dunkel?", unter: "Wähl, wie die App aussehen soll." },
];

function Taste({ children }: { children: ReactNode }) {
  return (
    <View style={{ height: 24, minWidth: 24, paddingHorizontal: 7, borderRadius: 6, borderWidth: 1.5, borderColor: B.linie, borderBottomWidth: 2.5, alignItems: "center", justifyContent: "center" }}>
      <Text style={{ ...n.fett, fontSize: 12, color: B.text2 }}>{children}</Text>
    </View>
  );
}

export function EinrichtungWeb(p: EinrichtungWebProps) {
  const { schritt } = p;
  const fertig = schritt >= 4;
  const weiterAus = schritt === 1 && !p.termin && !p.keinTermin;
  const weiterTitel = fertig ? "Los geht's" : schritt === 3 ? "Fertig" : weiterAus ? "Datum wählen" : "Weiter";
  const weiter = () => {
    if (weiterAus) return;
    if (fertig) p.onFertig();
    else p.onSchritt(schritt + 1);
  };

  useTasten((e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      weiter();
    } else if (e.key === "Escape" && schritt > 0 && !fertig) {
      p.onSchritt(schritt - 1);
    }
  });

  const k = KLASSEN.find((x) => x.id === p.klasse);
  const e = p.erinnerung;

  return (
    <View style={{ flex: 1, backgroundColor: B.grund }}>
      {/* Kopf */}
      <View style={{ height: 80, paddingHorizontal: 32, flexDirection: "row", alignItems: "center", width: "100%", maxWidth: 1240, alignSelf: "center" }}>
        <View style={{ flex: 1 }}>
          <Logo groesse={26} hell={!webDunkel()} />
        </View>
        {fertig ? null : <Schritte schritt={schritt} />}
        <View style={{ flex: 1, alignItems: "flex-end" }}>
          {fertig ? null : (
            <Pressable onPress={p.onSpaeter} accessibilityRole="button" style={(z: Zustand) => ({ height: 36, paddingHorizontal: 12, borderRadius: 10, justifyContent: "center", backgroundColor: z.hovered ? B.ton : "transparent" })}>
              <Text style={{ ...n.fett, fontSize: 14.5, color: B.text2 }}>Später einrichten</Text>
            </Pressable>
          )}
        </View>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 32, paddingTop: 12, paddingBottom: 48, justifyContent: "center" }}>
        <Kachel style={{ width: "100%", maxWidth: 900, alignSelf: "center" }}>
          <View style={{ paddingHorizontal: 44, paddingTop: 40, paddingBottom: 32, gap: 28 }}>
            {fertig ? null : <Kopf nr={schritt + 1} titel={KOEPFE[schritt].titel} unter={KOEPFE[schritt].unter} />}
            {schritt === 0 ? <SchrittKlasse wert={p.klasse} onWahl={p.onKlasse} /> : null}
            {schritt === 1 ? <SchrittTermin {...p} /> : null}
            {schritt === 2 ? <SchrittZiel {...p} /> : null}
            {schritt === 3 ? <SchrittDarstellung wert={p.darstellung} onWahl={p.onDarstellung} /> : null}
            {fertig ? (
              <Fertig
                name={p.vorname}
                zeilen={[
                  { icon: "car-outline", titel: "Führerschein", wert: `Klasse ${p.klasse}${k ? ` · ${k.kurz}` : ""}` },
                  { icon: "calendar-outline", titel: "Prüfung", wert: p.terminText },
                  { icon: "flag-outline", titel: "Tagesziel", wert: `${p.ziel} Fragen` },
                  { icon: "notifications-outline", titel: "Erinnerung", wert: e.an ? `täglich ${zwei(e.stunde)}:${zwei(e.minute)}` : "aus" },
                ]}
              />
            ) : null}
          </View>

          {/* Fuß: Zurück, Enter-Hinweis, Weiter */}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 16, paddingHorizontal: 44, paddingVertical: 20, borderTopWidth: 1.5, borderTopColor: B.ton, justifyContent: fertig ? "center" : "flex-start" }}>
            {fertig ? null : (
              <View style={{ flex: 1, flexDirection: "row" }}>
                {schritt > 0 ? (
                  <Pressable
                    onPress={() => p.onSchritt(schritt - 1)}
                    accessibilityLabel="Zurück (Esc)"
                    style={(z: Zustand) => ({ flexDirection: "row", alignItems: "center", gap: 7, height: 44, paddingHorizontal: 14, marginLeft: -14, borderRadius: 12, backgroundColor: z.hovered ? B.ton : "transparent" })}
                  >
                    <Icon name="arrow-back" size={18} color={B.text2} />
                    <Text style={{ ...n.fett, fontSize: 15, color: B.text2 }}>Zurück</Text>
                  </Pressable>
                ) : null}
              </View>
            )}
            {weiterAus ? null : (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Taste>Enter</Taste>
                <Text style={{ ...n.halb, fontSize: 13.5, color: B.text3 }}>{fertig ? "zum Start" : "weiter"}</Text>
              </View>
            )}
            <Knopf titel={weiterTitel} groesse="gross" deaktiviert={weiterAus} onPress={weiter} style={{ minWidth: 200 }} />
          </View>
        </Kachel>
      </ScrollView>
    </View>
  );
}
