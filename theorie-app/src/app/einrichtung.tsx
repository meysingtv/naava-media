import { useEffect, useRef, useState, type ReactNode } from "react";
import { Animated, BackHandler, Easing, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BellRingingIcon } from "phosphor-react-native/src/icons/BellRinging";
import { CalendarCheckIcon } from "phosphor-react-native/src/icons/CalendarCheck";
import { CalendarDotsIcon } from "phosphor-react-native/src/icons/CalendarDots";
import { CaretDownIcon } from "phosphor-react-native/src/icons/CaretDown";
import { CaretLeftIcon } from "phosphor-react-native/src/icons/CaretLeft";
import { CaretRightIcon } from "phosphor-react-native/src/icons/CaretRight";
import { CheckIcon } from "phosphor-react-native/src/icons/Check";
import { ClockIcon } from "phosphor-react-native/src/icons/Clock";
import { FlagCheckeredIcon } from "phosphor-react-native/src/icons/FlagCheckered";
import { MinusIcon } from "phosphor-react-native/src/icons/Minus";
import { MoonIcon } from "phosphor-react-native/src/icons/Moon";
import { PlusIcon } from "phosphor-react-native/src/icons/Plus";
import { SunIcon } from "phosphor-react-native/src/icons/Sun";
import { TargetIcon } from "phosphor-react-native/src/icons/Target";
import type { Icon as PhosphorIcon } from "phosphor-react-native";

import { Glas } from "@/components/glas";
import { GlasGrund, GlasKarte } from "@/components/glas-flaeche";
import { Schalter } from "@/components/schalter";
import { Seite } from "@/components/seite";
import { tourStarten } from "@/components/tour";
import { useDarstellung, useFarbwelt, type Darstellung, type Farbwelt } from "@/lib/darstellung";
import { einrichtungErledigt } from "@/lib/einrichtung";
import { erinnerungPlanen } from "@/lib/erinnerung";
import { erfolg, tippen } from "@/lib/haptik";
import { HAUPT_KLASSEN, KLASSEN } from "@/lib/klassen";
import { useKonto } from "@/lib/konto";
import { pruefungstagErinnerungPlanen } from "@/lib/pruefungstag";
import { useStand } from "@/lib/stand";
import { leuchten, mitDeckkraft, RAND, schrift, verlauf } from "@/lib/theme";

// Einrichtung direkt nach der Registrierung, bevor es zur Startseite geht:
// Führerscheinklasse, Prüfungstermin, Tagesziel mit Erinnerung und hell oder
// dunkel. Am Ende eine Zusammenfassung und danach die App-Tour. Alles lässt
// sich später in den Einstellungen ändern.

const SCHRITTE = 4;
const ZIELE = [
  { n: 15, name: "Entspannt", min: 8 },
  { n: 30, name: "Normal", min: 15 },
  { n: 50, name: "Ehrgeizig", min: 25 },
  { n: 80, name: "Turbo", min: 40 },
];
const UHRZEITEN = [8, 9, 10, 11, 12, 13, 14, 15];
const WOCHENTAGE = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
const MONATE = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];
const TAGE_KURZ = ["So.", "Mo.", "Di.", "Mi.", "Do.", "Fr.", "Sa."];

const zwei = (n: number) => String(n).padStart(2, "0");
function tagesBeginn(d: Date) {
  const k = new Date(d);
  k.setHours(0, 0, 0, 0);
  return k;
}
function tageBis(d: Date) {
  return Math.round((tagesBeginn(d).getTime() - tagesBeginn(new Date()).getTime()) / 86_400_000);
}

// ---------------------------------------------------------------------------
// Bausteine
// ---------------------------------------------------------------------------

/** Kleine Marke über dem Titel: „Schritt 2 von 4“ mit Symbol. */
function Kopf({ nr, symbol: S, titel, unter }: { nr: number; symbol: PhosphorIcon; titel: string; unter: string }) {
  const f = useFarbwelt();
  return (
    <View style={{ gap: 10, marginBottom: 22 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 7 }}>
        <S size={16} color={f.orange} weight="fill" />
        <Text style={{ ...schrift.textFett, fontSize: 12.5, letterSpacing: 1.1, color: f.orange }}>SCHRITT {nr} VON {SCHRITTE}</Text>
      </View>
      <Text style={{ ...schrift.titel, fontSize: 31, lineHeight: 36, letterSpacing: -0.6, color: f.text }}>{titel}</Text>
      <Text style={{ ...schrift.textMittel, fontSize: 16, lineHeight: 22, color: f.text2 }}>{unter}</Text>
    </View>
  );
}

/** Auswählbare Glaskarte: gewählt mit orangem Rand, Leuchten und Haken. */
function WahlKarte({ aktiv, onPress, children, style, label }: { aktiv: boolean; onPress: () => void; children: ReactNode; style?: object; label: string }) {
  const f = useFarbwelt();
  return (
    <Pressable
      onPress={() => {
        tippen();
        onPress();
      }}
      accessibilityRole="radio"
      accessibilityState={{ checked: aktiv }}
      accessibilityLabel={label}
      style={({ pressed }) => [{ borderRadius: 22, transform: [{ scale: pressed ? 0.97 : 1 }] }, aktiv ? leuchten(f.orange, f.hell ? 0.22 : 0.35, 16, 4) : null, style]}
    >
      <GlasKarte toenung={aktiv ? mitDeckkraft(f.orange, f.hell ? 0.08 : 0.14) : undefined} style={{ borderRadius: 22, borderWidth: aktiv ? 2 : 0, borderColor: f.orange }}>
        {children}
      </GlasKarte>
    </Pressable>
  );
}

/** Runder Haken oben rechts in einer Wahlkarte. */
function Haken({ aktiv }: { aktiv: boolean }) {
  const f = useFarbwelt();
  return aktiv ? (
    <LinearGradient colors={verlauf.segment as unknown as [string, string]} style={{ width: 24, height: 24, borderRadius: 12, alignItems: "center", justifyContent: "center" }}>
      <CheckIcon size={14} color="#FFFFFF" weight="bold" />
    </LinearGradient>
  ) : (
    <View style={{ width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: f.hell ? "rgba(20,23,27,0.18)" : "rgba(255,255,255,0.22)" }} />
  );
}

/** Großer Knopf unten im App-Orange. */
function HauptKnopf({ titel, onPress, deaktiviert }: { titel: string; onPress: () => void; deaktiviert?: boolean }) {
  const f = useFarbwelt();
  return (
    <Pressable
      onPress={() => {
        if (deaktiviert) return;
        tippen();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!deaktiviert }}
      style={({ pressed }) => [{ borderRadius: 29, transform: [{ scale: pressed ? 0.98 : 1 }], opacity: deaktiviert ? 0.45 : 1 }, deaktiviert ? null : leuchten(f.orange, f.hell ? 0.32 : 0.5, 18, 6)]}
    >
      <LinearGradient colors={verlauf.knopf as unknown as [string, string, string]} style={{ height: 58, borderRadius: 29, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8 }}>
        <Text style={{ ...schrift.textFett, fontSize: 17, color: "#FFFFFF" }}>{titel}</Text>
        <CaretRightIcon size={18} color="#FFFFFF" weight="bold" />
      </LinearGradient>
    </Pressable>
  );
}

/** Kleiner runder Glas-Knopf (− / +, Monat vor/zurück). */
function RundKnopf({ symbol: S, onPress, label, aus }: { symbol: PhosphorIcon; onPress: () => void; label: string; aus?: boolean }) {
  const f = useFarbwelt();
  return (
    <Pressable
      onPress={() => {
        if (aus) return;
        tippen();
        onPress();
      }}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => ({ opacity: aus ? 0.3 : pressed ? 0.7 : 1 })}
    >
      <Glas hell={f.hell} style={{ width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" }}>
        <S size={18} color={f.text} weight="bold" />
      </Glas>
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// Schritt 1: Klasse
// ---------------------------------------------------------------------------

function SchrittKlasse({ wert, onWahl }: { wert: string; onWahl: (k: string) => void }) {
  const f = useFarbwelt();
  const [mehr, setMehr] = useState(!HAUPT_KLASSEN.includes(wert));
  const haupt = KLASSEN.filter((k) => HAUPT_KLASSEN.includes(k.id)).sort((a, b) => HAUPT_KLASSEN.indexOf(a.id) - HAUPT_KLASSEN.indexOf(b.id));
  const weitere = KLASSEN.filter((k) => !HAUPT_KLASSEN.includes(k.id));
  const kachel = (k: (typeof KLASSEN)[number], gross: boolean) => {
    const aktiv = k.id === wert;
    const S = k.symbol;
    return (
      <WahlKarte key={k.id} aktiv={aktiv} onPress={() => onWahl(k.id)} label={`Klasse ${k.id}, ${k.kurz}`} style={{ width: "48.3%" }}>
        <View style={{ padding: 14, height: gross ? 150 : 104, justifyContent: "space-between" }}>
          <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" }}>
            <Text style={{ ...schrift.titel, fontSize: gross ? 28 : 22, letterSpacing: -0.4, color: f.text }}>{k.id}</Text>
            <Haken aktiv={aktiv} />
          </View>
          {gross ? (
            <View style={{ alignItems: "center", marginTop: -4 }}>
              <S size={48} color={aktiv ? f.orange : f.hell ? "#5B6169" : "rgba(255,255,255,0.78)"} weight="duotone" />
            </View>
          ) : null}
          <Text numberOfLines={1} style={{ ...schrift.textHalb, fontSize: 13.5, color: aktiv ? f.text : f.text2 }}>
            {k.kurz}
          </Text>
        </View>
      </WahlKarte>
    );
  };
  return (
    <View>
      <Kopf nr={1} symbol={FlagCheckeredIcon} titel="Welchen Führerschein machst du?" unter="Wir zeigen dir genau die Fragen, die in deiner Prüfung drankommen." />
      <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", rowGap: 12 }}>{haupt.map((k) => kachel(k, true))}</View>
      <Pressable
        onPress={() => {
          tippen();
          setMehr((m) => !m);
        }}
        accessibilityRole="button"
        style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 16 }}
      >
        <Text style={{ ...schrift.textHalb, fontSize: 15, color: f.text2 }}>{mehr ? "Weniger Klassen" : "Lkw, Bus, Traktor …"}</Text>
        <View style={{ transform: [{ rotate: mehr ? "180deg" : "0deg" }] }}>
          <CaretDownIcon size={15} color={f.text2} weight="bold" />
        </View>
      </Pressable>
      {mehr ? <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", rowGap: 12 }}>{weitere.map((k) => kachel(k, false))}</View> : null}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Schritt 2: Prüfungstermin
// ---------------------------------------------------------------------------

function Kalender({ wert, onWahl }: { wert: Date | null; onWahl: (d: Date) => void }) {
  const f = useFarbwelt();
  const heute = tagesBeginn(new Date());
  const [monat, setMonat] = useState(() => {
    const m = new Date(wert ?? heute);
    m.setDate(1);
    return m;
  });
  const grenze = new Date(heute);
  grenze.setFullYear(heute.getFullYear() + 1);
  const zelle = 100 / 7;
  // Montag zuerst
  const versatz = (monat.getDay() + 6) % 7;
  const tage = new Date(monat.getFullYear(), monat.getMonth() + 1, 0).getDate();
  const felder: (Date | null)[] = [...Array.from({ length: versatz }, () => null), ...Array.from({ length: tage }, (_, i) => new Date(monat.getFullYear(), monat.getMonth(), i + 1))];
  const zurueckGeht = monat > new Date(heute.getFullYear(), heute.getMonth(), 1);
  const vorGeht = new Date(monat.getFullYear(), monat.getMonth() + 1, 1) <= grenze;
  const blaettern = (n: number) => setMonat((m) => new Date(m.getFullYear(), m.getMonth() + n, 1));
  return (
    <GlasKarte style={{ borderRadius: 26, padding: 16 }}>
      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
        <Text style={{ ...schrift.titelFett, fontSize: 19, color: f.text, flex: 1, paddingLeft: 4 }}>
          {MONATE[monat.getMonth()]} {monat.getFullYear()}
        </Text>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <RundKnopf symbol={CaretLeftIcon} label="Voriger Monat" onPress={() => blaettern(-1)} aus={!zurueckGeht} />
          <RundKnopf symbol={CaretRightIcon} label="Nächster Monat" onPress={() => blaettern(1)} aus={!vorGeht} />
        </View>
      </View>
      <View style={{ flexDirection: "row", marginBottom: 4 }}>
        {WOCHENTAGE.map((t) => (
          <Text key={t} style={{ width: `${zelle}%`, textAlign: "center", ...schrift.textHalb, fontSize: 12.5, color: f.text3 }}>
            {t}
          </Text>
        ))}
      </View>
      <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
        {felder.map((d, i) => {
          if (!d) return <View key={`l${i}`} style={{ width: `${zelle}%`, height: 46 }} />;
          const vorbei = d < heute || d > grenze;
          const gewaehlt = !!wert && tagesBeginn(wert).getTime() === d.getTime();
          const istHeute = d.getTime() === heute.getTime();
          return (
            <Pressable
              key={d.toISOString()}
              disabled={vorbei}
              onPress={() => {
                tippen();
                onWahl(d);
              }}
              accessibilityRole="button"
              accessibilityLabel={`${d.getDate()}. ${MONATE[d.getMonth()]}`}
              accessibilityState={{ selected: gewaehlt, disabled: vorbei }}
              style={{ width: `${zelle}%`, height: 46, alignItems: "center", justifyContent: "center" }}
            >
              {gewaehlt ? (
                <LinearGradient colors={verlauf.segment as unknown as [string, string]} style={[{ width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" }, leuchten(f.orange, 0.5, 10, 2)]}>
                  <Text style={{ ...schrift.textFett, fontSize: 16, color: "#FFFFFF" }}>{d.getDate()}</Text>
                </LinearGradient>
              ) : (
                <View style={{ width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", borderWidth: istHeute ? 1.5 : 0, borderColor: f.orangeLinie }}>
                  <Text style={{ ...(istHeute ? schrift.textFett : schrift.textMittel), fontSize: 16, color: vorbei ? mitDeckkraft(f.text3, 0.45) : istHeute ? f.orange : f.text }}>{d.getDate()}</Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </View>
    </GlasKarte>
  );
}

function SchrittTermin({ termin, keinTermin, stunde, onTermin, onKein, onStunde }: { termin: Date | null; keinTermin: boolean; stunde: number; onTermin: (d: Date) => void; onKein: (k: boolean) => void; onStunde: (h: number) => void }) {
  const f = useFarbwelt();
  const tage = termin ? tageBis(termin) : null;
  return (
    <View>
      <Kopf nr={2} symbol={CalendarDotsIcon} titel="Wann ist deine Theorieprüfung?" unter="Dann planen wir dein Tagesziel passend und zählen mit dir runter." />
      <View style={{ flexDirection: "row", gap: 10, marginBottom: 14 }}>
        {[
          { kein: false, titel: "Termin steht" },
          { kein: true, titel: "Noch kein Termin" },
        ].map((o) => {
          const aktiv = keinTermin === o.kein;
          return (
            <WahlKarte key={o.titel} aktiv={aktiv} onPress={() => onKein(o.kein)} label={o.titel} style={{ flex: 1 }}>
              <View style={{ height: 50, alignItems: "center", justifyContent: "center" }}>
                <Text style={{ ...schrift.textFett, fontSize: 15, color: aktiv ? f.orange : f.text2 }}>{o.titel}</Text>
              </View>
            </WahlKarte>
          );
        })}
      </View>
      {keinTermin ? (
        <GlasKarte style={{ borderRadius: 26, padding: 22, alignItems: "center", gap: 10 }}>
          <View style={{ width: 64, height: 64, borderRadius: 32, alignItems: "center", justifyContent: "center", backgroundColor: f.orangeSoft }}>
            <CalendarDotsIcon size={30} color={f.orange} weight="duotone" />
          </View>
          <Text style={{ ...schrift.titelFett, fontSize: 18, color: f.text, textAlign: "center" }}>Kein Problem</Text>
          <Text style={{ ...schrift.text, fontSize: 15, lineHeight: 21, color: f.text2, textAlign: "center" }}>Sobald du deinen Termin hast, trägst du ihn im Tab „Prüfung“ ein. Bis dahin lernst du in deinem Tempo.</Text>
        </GlasKarte>
      ) : (
        <View style={{ gap: 14 }}>
          <Kalender wert={termin} onWahl={onTermin} />
          <View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 7, marginBottom: 10, paddingLeft: 4 }}>
              <ClockIcon size={16} color={f.text2} weight="bold" />
              <Text style={{ ...schrift.textHalb, fontSize: 14.5, color: f.text2 }}>Uhrzeit</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -RAND }} contentContainerStyle={{ paddingHorizontal: RAND, gap: 8 }}>
              {UHRZEITEN.map((h) => {
                const aktiv = h === stunde;
                return (
                  <Pressable
                    key={h}
                    onPress={() => {
                      tippen();
                      onStunde(h);
                    }}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: aktiv }}
                    style={[{ borderRadius: 20 }, aktiv ? leuchten(f.orange, 0.4, 8, 2) : null]}
                  >
                    {aktiv ? (
                      <LinearGradient colors={verlauf.chip as unknown as [string, string, string]} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={{ height: 40, borderRadius: 20, paddingHorizontal: 16, justifyContent: "center" }}>
                        <Text style={{ ...schrift.textFett, fontSize: 15, color: "#FFFFFF" }}>{zwei(h)}:00</Text>
                      </LinearGradient>
                    ) : (
                      <Glas hell={f.hell} style={{ height: 40, borderRadius: 20, paddingHorizontal: 16, justifyContent: "center" }}>
                        <Text style={{ ...schrift.textHalb, fontSize: 15, color: f.text }}>{zwei(h)}:00</Text>
                      </Glas>
                    )}
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
          {termin && tage != null ? (
            <GlasKarte style={{ borderRadius: 20, padding: 14, flexDirection: "row", alignItems: "center", gap: 12 }}>
              <CalendarCheckIcon size={26} color={f.orange} weight="duotone" />
              <View style={{ flex: 1 }}>
                <Text style={{ ...schrift.textFett, fontSize: 15.5, color: f.text }}>
                  {TAGE_KURZ[termin.getDay()]} {termin.getDate()}. {MONATE[termin.getMonth()]}, {zwei(stunde)}:00 Uhr
                </Text>
                <Text style={{ ...schrift.text, fontSize: 13.5, color: f.text2 }}>{tage === 0 ? "Heute ist Prüfungstag!" : tage === 1 ? "Schon morgen – du schaffst das." : `Noch ${tage} Tage – perfekt zum Lernen.`}</Text>
              </View>
            </GlasKarte>
          ) : null}
        </View>
      )}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Schritt 3: Tagesziel + Erinnerung
// ---------------------------------------------------------------------------

function SchrittZiel({
  ziel,
  empfohlen,
  onZiel,
  erinnerung,
  onErinnerung,
}: {
  ziel: number;
  empfohlen: number;
  onZiel: (n: number) => void;
  erinnerung: { an: boolean; stunde: number; minute: number };
  onErinnerung: (e: { an: boolean; stunde: number; minute: number }) => void;
}) {
  const f = useFarbwelt();
  const schieben = (min: number) => {
    const gesamt = (((erinnerung.stunde * 60 + erinnerung.minute + min) % 1440) + 1440) % 1440;
    onErinnerung({ ...erinnerung, stunde: Math.floor(gesamt / 60), minute: gesamt % 60 });
  };
  return (
    <View>
      <Kopf nr={3} symbol={TargetIcon} titel="Wie viel pro Tag?" unter="Kleine, tägliche Schritte bringen am meisten. Du kannst es jederzeit ändern." />
      <View style={{ gap: 10 }}>
        {ZIELE.map((z) => {
          const aktiv = z.n === ziel;
          return (
            <WahlKarte key={z.n} aktiv={aktiv} onPress={() => onZiel(z.n)} label={`${z.n} Fragen am Tag, ${z.name}`}>
              <View style={{ flexDirection: "row", alignItems: "center", paddingVertical: 14, paddingHorizontal: 16, gap: 14 }}>
                <View style={{ width: 54, alignItems: "center" }}>
                  <Text style={{ ...schrift.titel, fontSize: 26, letterSpacing: -0.5, color: aktiv ? f.orange : f.text }}>{z.n}</Text>
                  <Text style={{ ...schrift.textHalb, fontSize: 11.5, color: f.text3, marginTop: -2 }}>Fragen</Text>
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <Text style={{ ...schrift.textFett, fontSize: 16.5, color: f.text }}>{z.name}</Text>
                    {z.n === empfohlen ? (
                      <View style={{ paddingHorizontal: 8, height: 20, borderRadius: 10, justifyContent: "center", backgroundColor: f.gruenSoft }}>
                        <Text style={{ ...schrift.textFett, fontSize: 10.5, letterSpacing: 0.4, color: f.gruen }}>EMPFOHLEN</Text>
                      </View>
                    ) : null}
                  </View>
                  <Text style={{ ...schrift.text, fontSize: 13.5, color: f.text2 }}>ca. {z.min} Minuten am Tag</Text>
                </View>
                <Haken aktiv={aktiv} />
              </View>
            </WahlKarte>
          );
        })}
      </View>

      <GlasKarte style={{ borderRadius: 24, marginTop: 18 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 16 }}>
          <View style={{ width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: f.orangeSoft }}>
            <BellRingingIcon size={21} color={f.orange} weight="fill" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ ...schrift.textFett, fontSize: 16, color: f.text }}>Tägliche Erinnerung</Text>
            <Text style={{ ...schrift.text, fontSize: 13.5, color: f.text2 }}>Ein kurzer Stups, damit deine Serie hält</Text>
          </View>
          <Schalter wert={erinnerung.an} onWechsel={(an) => onErinnerung({ ...erinnerung, an })} />
        </View>
        {erinnerung.an ? (
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 18, paddingBottom: 18 }}>
            <RundKnopf symbol={MinusIcon} label="15 Minuten früher" onPress={() => schieben(-15)} />
            <Text style={{ ...schrift.titel, fontSize: 40, letterSpacing: -1, color: f.text, fontVariant: ["tabular-nums"], minWidth: 120, textAlign: "center" }}>
              {zwei(erinnerung.stunde)}:{zwei(erinnerung.minute)}
            </Text>
            <RundKnopf symbol={PlusIcon} label="15 Minuten später" onPress={() => schieben(15)} />
          </View>
        ) : null}
      </GlasKarte>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Schritt 4: Darstellung
// ---------------------------------------------------------------------------

/** Mini-Bildschirm als Vorschau von Tag- oder Nachtfahrt. */
function MiniApp({ hell }: { hell: boolean }) {
  const grund = hell ? "#F4F1EC" : "#07090C";
  const karte = hell ? "#FFFFFF" : "#16191E";
  const linie = hell ? "#E5E0D8" : "#262A31";
  const text = hell ? "#14171B" : "#FFFFFF";
  return (
    <View style={{ height: 176, borderRadius: 18, backgroundColor: grund, padding: 12, gap: 8, overflow: "hidden" }}>
      <View style={{ width: "55%", height: 9, borderRadius: 5, backgroundColor: text, opacity: 0.85 }} />
      <View style={{ width: "35%", height: 6, borderRadius: 3, backgroundColor: text, opacity: 0.35 }} />
      <View style={{ flexDirection: "row", gap: 6, marginTop: 4 }}>
        {[0, 1, 2].map((i) => (
          <View key={i} style={{ flex: 1, height: 34, borderRadius: 9, backgroundColor: karte, borderWidth: 1, borderColor: linie }} />
        ))}
      </View>
      <LinearGradient colors={verlauf.knopf as unknown as [string, string, string]} style={{ height: 26, borderRadius: 13 }} />
      <View style={{ height: 44, borderRadius: 11, backgroundColor: karte, borderWidth: 1, borderColor: linie }} />
    </View>
  );
}

function SchrittDarstellung({ wert, onWahl }: { wert: Darstellung; onWahl: (d: Darstellung) => void }) {
  const f = useFarbwelt();
  const optionen: { id: Darstellung; titel: string; unter: string; symbol: PhosphorIcon }[] = [
    { id: "hell", titel: "Tagfahrt", unter: "Hell", symbol: SunIcon },
    { id: "dunkel", titel: "Nachtfahrt", unter: "Dunkel", symbol: MoonIcon },
  ];
  return (
    <View>
      <Kopf nr={4} symbol={SunIcon} titel="Hell oder dunkel?" unter="Wähl, wie die App aussehen soll – du siehst es sofort." />
      <View style={{ flexDirection: "row", gap: 12 }}>
        {optionen.map((o) => {
          const aktiv = o.id === wert;
          const S = o.symbol;
          return (
            <WahlKarte key={o.id} aktiv={aktiv} onPress={() => onWahl(o.id)} label={`${o.titel}, ${o.unter}`} style={{ flex: 1 }}>
              <View style={{ padding: 10, gap: 12 }}>
                <MiniApp hell={o.id === "hell"} />
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 4, paddingBottom: 4 }}>
                  <S size={20} color={aktiv ? f.orange : f.text2} weight="fill" />
                  <View style={{ flex: 1 }}>
                    <Text style={{ ...schrift.textFett, fontSize: 15, color: f.text }}>{o.titel}</Text>
                    <Text style={{ ...schrift.text, fontSize: 12.5, color: f.text3 }}>{o.unter}</Text>
                  </View>
                  <Haken aktiv={aktiv} />
                </View>
              </View>
            </WahlKarte>
          );
        })}
      </View>
      <Text style={{ ...schrift.text, fontSize: 13.5, lineHeight: 19, color: f.text3, textAlign: "center", marginTop: 16 }}>Clips, Kamera und Lives bleiben immer dunkel.</Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Fertig
// ---------------------------------------------------------------------------

function Zeile({ symbol: S, titel, wert, f }: { symbol: PhosphorIcon; titel: string; wert: string; f: Farbwelt }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 13, paddingHorizontal: 16 }}>
      <S size={20} color={f.orange} weight="duotone" />
      <Text style={{ ...schrift.textMittel, fontSize: 15, color: f.text2, flex: 1 }}>{titel}</Text>
      <Text style={{ ...schrift.textFett, fontSize: 15, color: f.text }}>{wert}</Text>
    </View>
  );
}

function Fertig({ name, zeilen, mitTour }: { name: string; zeilen: { symbol: PhosphorIcon; titel: string; wert: string }[]; mitTour: boolean }) {
  const f = useFarbwelt();
  const auf = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(auf, { toValue: 1, useNativeDriver: true, speed: 9, bounciness: 10 }).start();
  }, [auf]);
  return (
    <View style={{ alignItems: "center", paddingTop: 20 }}>
      <Animated.View style={[{ borderRadius: 56, transform: [{ scale: auf.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }) }], opacity: auf }, leuchten(f.orange, 0.6, 40, 8)]}>
        <LinearGradient colors={verlauf.knopf as unknown as [string, string, string]} style={{ width: 112, height: 112, borderRadius: 56, alignItems: "center", justifyContent: "center" }}>
          <CheckIcon size={56} color="#FFFFFF" weight="bold" />
        </LinearGradient>
      </Animated.View>
      <Text style={{ ...schrift.titel, fontSize: 31, lineHeight: 37, letterSpacing: -0.6, color: f.text, textAlign: "center", marginTop: 28 }}>{name ? `Alles bereit, ${name}!` : "Alles bereit!"}</Text>
      <Text style={{ ...schrift.textMittel, fontSize: 16, lineHeight: 22, color: f.text2, textAlign: "center", marginTop: 8, marginBottom: 24 }}>{mitTour ? "Dein Lernplan steht. Wir zeigen dir noch kurz die wichtigsten Stellen." : "Dein Lernplan steht. Alles lässt sich später in den Einstellungen ändern."}</Text>
      <GlasKarte style={{ borderRadius: 24, alignSelf: "stretch" }}>
        {zeilen.map((z, i) => (
          <View key={z.titel}>
            {i > 0 ? <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: f.hell ? "rgba(20,23,27,0.1)" : "rgba(255,255,255,0.12)", marginLeft: 48 }} /> : null}
            <Zeile {...z} f={f} />
          </View>
        ))}
      </GlasKarte>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Seite
// ---------------------------------------------------------------------------

function Inhalt() {
  const f = useFarbwelt();
  const insets = useSafeAreaInsets();
  const { anzeigeName } = useKonto();
  const { stand, setzen } = useStand();
  const { darstellung, setzen: darstellungSetzen } = useDarstellung();
  // Aus dem Gastmodus registriert: danach zurück dorthin, ohne Tour.
  const zurueck = useLocalSearchParams<{ zurueck?: string }>().zurueck === "1";
  const [schritt, setSchritt] = useState(0);
  const [klasse, setKlasse] = useState(stand.klasse || "B");
  const [termin, setTermin] = useState<Date | null>(null);
  const [keinTermin, setKeinTermin] = useState(false);
  const [stunde, setStunde] = useState(10);
  const [ziel, setZiel] = useState<number | null>(null);
  const [erinnerung, setErinnerung] = useState({ an: true, stunde: 18, minute: 0 });
  const blende = useRef(new Animated.Value(1)).current;
  const liste = useRef<ScrollView>(null);
  const vorname = (anzeigeName ?? "").trim().split(/\s+/)[0] ?? "";

  // Empfohlen ist immer „Normal“.
  const empfohlen = 30;
  const tagesziel = ziel ?? empfohlen;

  // Android-Zurück: einen Schritt zurück statt die App zu verlassen.
  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (schritt > 0 && schritt < SCHRITTE) wechseln(schritt - 1);
      return true;
    });
    return () => sub.remove();
  });

  function verlassen() {
    if (zurueck && router.canGoBack()) router.back();
    else router.replace("/heute");
  }

  function wechseln(neu: number) {
    Animated.timing(blende, { toValue: 0, duration: 120, easing: Easing.in(Easing.quad), useNativeDriver: true }).start(() => {
      setSchritt(neu);
      liste.current?.scrollTo({ y: 0, animated: false });
      Animated.timing(blende, { toValue: 1, duration: 260, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    });
  }

  function terminIso(): string | null {
    if (keinTermin || !termin) return null;
    const d = new Date(termin);
    d.setHours(stunde, 0, 0, 0);
    return d.toISOString();
  }

  async function abschliessen(mitTour: boolean) {
    const iso = terminIso();
    let e = erinnerung;
    if (e.an) {
      const ok = await erinnerungPlanen(true, e.stunde, e.minute).catch(() => false);
      if (!ok) e = { ...e, an: false };
    }
    setzen({ klasse, tagesziel, erinnerung: e, pruefungstermin: iso });
    if (iso) pruefungstagErinnerungPlanen(iso, true);
    einrichtungErledigt();
    erfolg();
    verlassen();
    if (mitTour && !zurueck) setTimeout(tourStarten, 700);
  }

  function ueberspringen() {
    einrichtungErledigt();
    verlassen();
  }

  const k = KLASSEN.find((x) => x.id === klasse);
  const terminText = (() => {
    const iso = terminIso();
    if (!iso) return "Noch offen";
    const d = new Date(iso);
    return `${TAGE_KURZ[d.getDay()]} ${d.getDate()}.${d.getMonth() + 1}., ${zwei(stunde)}:00`;
  })();

  const weiterTitel = ["Weiter", termin || keinTermin ? "Weiter" : "Datum wählen", "Weiter", "Fertig", zurueck ? "Weiter" : "Tour starten"][schritt];
  const weiterAus = schritt === 1 && !termin && !keinTermin;

  return (
    <View style={{ flex: 1 }}>
      <GlasGrund />
      {/* Kopf: zurück, Fortschritt, überspringen */}
      <View style={{ paddingTop: insets.top + 8, paddingHorizontal: RAND, flexDirection: "row", alignItems: "center", gap: 14, height: insets.top + 56 }}>
        <View style={{ width: 40 }}>{schritt > 0 && schritt < SCHRITTE ? <RundKnopf symbol={CaretLeftIcon} label="Zurück" onPress={() => wechseln(schritt - 1)} /> : null}</View>
        <View style={{ flex: 1, flexDirection: "row", gap: 6 }}>
          {schritt < SCHRITTE
            ? Array.from({ length: SCHRITTE }, (_, i) =>
                i <= schritt ? (
                  <LinearGradient key={i} colors={verlauf.balken as unknown as [string, string]} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={[{ flex: 1, height: 5, borderRadius: 3 }, i === schritt ? leuchten(f.orange, 0.5, 6, 0) : null]} />
                ) : (
                  <View key={i} style={{ flex: 1, height: 5, borderRadius: 3, backgroundColor: f.hell ? "rgba(20,23,27,0.1)" : "rgba(255,255,255,0.12)" }} />
                ),
              )
            : null}
        </View>
        <Pressable onPress={ueberspringen} hitSlop={10} accessibilityRole="button" style={{ minWidth: 40, alignItems: "flex-end" }}>
          {schritt < SCHRITTE ? <Text style={{ ...schrift.textHalb, fontSize: 15, color: f.text2 }}>Später</Text> : null}
        </Pressable>
      </View>

      <Animated.View style={{ flex: 1, opacity: blende, transform: [{ translateY: blende.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }] }}>
        <ScrollView ref={liste} contentContainerStyle={{ paddingHorizontal: RAND, paddingTop: 18, paddingBottom: 140, width: "100%", maxWidth: 560, alignSelf: "center" }} showsVerticalScrollIndicator={false}>
          {schritt === 0 ? <SchrittKlasse wert={klasse} onWahl={setKlasse} /> : null}
          {schritt === 1 ? (
            <SchrittTermin
              termin={termin}
              keinTermin={keinTermin}
              stunde={stunde}
              onTermin={(d) => {
                setTermin(d);
                setKeinTermin(false);
              }}
              onKein={setKeinTermin}
              onStunde={setStunde}
            />
          ) : null}
          {schritt === 2 ? <SchrittZiel ziel={tagesziel} empfohlen={empfohlen} onZiel={setZiel} erinnerung={erinnerung} onErinnerung={setErinnerung} /> : null}
          {schritt === 3 ? <SchrittDarstellung wert={darstellung} onWahl={darstellungSetzen} /> : null}
          {schritt === 4 ? (
            <Fertig
              name={vorname}
              mitTour={!zurueck}
              zeilen={[
                { symbol: k?.symbol ?? FlagCheckeredIcon, titel: "Führerschein", wert: `Klasse ${klasse}` },
                { symbol: CalendarCheckIcon, titel: "Prüfung", wert: terminText },
                { symbol: TargetIcon, titel: "Tagesziel", wert: `${tagesziel} Fragen` },
                { symbol: BellRingingIcon, titel: "Erinnerung", wert: erinnerung.an ? `täglich ${zwei(erinnerung.stunde)}:${zwei(erinnerung.minute)}` : "aus" },
              ]}
            />
          ) : null}
        </ScrollView>
      </Animated.View>

      {/* Unten: Hauptknopf auf weichem Verlauf */}
      <View pointerEvents="box-none" style={{ position: "absolute", left: 0, right: 0, bottom: 0 }}>
        {/* Weicher Übergang, leicht durchscheinend – das Leuchten im Hintergrund bleibt sichtbar */}
        <LinearGradient pointerEvents="none" colors={[mitDeckkraft(f.grund, 0), mitDeckkraft(f.grund, 0.92), mitDeckkraft(f.grund, 0.97)]} locations={[0, 0.35, 1]} style={StyleSheet.absoluteFill} />
        <View style={{ paddingTop: 40, paddingHorizontal: RAND, paddingBottom: insets.bottom + 14, gap: 10, width: "100%", maxWidth: 560, alignSelf: "center" }}>
          <HauptKnopf
            titel={weiterTitel}
            deaktiviert={weiterAus}
            onPress={() => {
              if (schritt < SCHRITTE) wechseln(schritt + 1);
              else abschliessen(true);
            }}
          />
          {schritt === SCHRITTE && !zurueck ? (
            <Pressable onPress={() => abschliessen(false)} hitSlop={8} style={{ alignSelf: "center", paddingVertical: 4 }}>
              <Text style={{ ...schrift.textHalb, fontSize: 14.5, color: f.text3 }}>Ohne Tour starten</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </View>
  );
}

export default function Einrichtung() {
  return (
    <Seite>
      <Inhalt />
    </Seite>
  );
}
