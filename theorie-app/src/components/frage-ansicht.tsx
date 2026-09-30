import { useCallback, useEffect, useRef } from "react";
import { Animated, Easing, Image, Pressable, Text, TextInput, View, type ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

import { FrageBild } from "@/components/frage-bild";
import { Icon, type IconName } from "@/components/icon";
import { useFarbwelt, type Farbwelt } from "@/lib/darstellung";
import { themaFoto } from "@/lib/fotos";
import { antwortReihenfolge, antwortRichtig, themaVon, zahlLesen, zahlText, type Frage } from "@/lib/fragen";
import { tippen } from "@/lib/haptik";
import { handschrift, leuchten, mitDeckkraft, schrift, verlauf } from "@/lib/theme";

// Eine Frage im Kino-Look: oben die Frage-Karte (Bild oder Themenfoto,
// Kapseln, Text), darunter Antwortkarten mit Buchstaben, die beim Antippen zum
// Haken werden. Nach dem Prüfen ein Ergebnis-Banner und die Erklärung.

type Zustand = "offen" | "gewaehlt" | "richtig" | "verpasst" | "falsch" | "aus";

const FUELLEN = { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 } as const;
const BUCHSTABEN = ["A", "B", "C", "D", "E", "F"];

/**
 * Merkt sich je Frage, in welcher Reihenfolge die Antworten gezeigt werden –
 * solange der Bildschirm offen ist. Beim nächsten Mal wird neu gewürfelt.
 */
export function useAntwortReihenfolge(): (frage: Frage) => number[] {
  const gemerkt = useRef(new Map<string, number[]>());
  return useCallback((frage: Frage) => {
    let r = gemerkt.current.get(frage.id);
    if (!r) {
      r = antwortReihenfolge(frage);
      gemerkt.current.set(frage.id, r);
    }
    return r;
  }, []);
}

/** Antworten enden wie in der Prüfung mit Punkt. */
function mitPunkt(text: string): string {
  return /[.!?…)]$/.test(text.trim()) ? text : `${text}.`;
}

function farbenFuer(f: Farbwelt) {
  return {
    gruen: f.hell ? "#23A548" : "#4ED053",
    rot: f.hell ? "#E5392C" : "#FF5A4E",
    karte: (f.hell ? { backgroundColor: "#FFFFFF", ...leuchten("#3C2C18", 0.07, 12, 4) } : { backgroundColor: f.flaeche, borderWidth: 1, borderColor: f.linie }) as ViewStyle,
  };
}

/** Weiches Einblenden beim Erscheinen (Banner, Erklärung). */
function Einblenden({ children, verzoegerung = 0 }: { children: React.ReactNode; verzoegerung?: number }) {
  const w = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(w, { toValue: 1, duration: 360, delay: verzoegerung, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [w, verzoegerung]);
  return (
    <Animated.View style={{ opacity: w, transform: [{ translateY: w.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }, { scale: w.interpolate({ inputRange: [0, 1], outputRange: [0.98, 1] }) }] }}>
      {children}
    </Animated.View>
  );
}

/** Kleine Kapsel über der Frage („Übung“, „4 Punkte“). */
function Etikett({ text, icon, orange }: { text: string; icon?: IconName; orange?: boolean }) {
  const f = useFarbwelt();
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
        height: 26,
        paddingHorizontal: 10,
        borderRadius: 13,
        backgroundColor: orange ? f.orange : f.hell ? "#F1EDE6" : "rgba(255,255,255,0.07)",
        borderWidth: orange ? 0 : 1,
        borderColor: f.hell ? "rgba(20,23,27,0.06)" : "rgba(255,255,255,0.08)",
      }}
    >
      {icon ? <Icon name={icon} size={12} color={orange ? "#FFFFFF" : f.text2} /> : null}
      <Text style={{ ...schrift.textHalb, fontSize: 12.5, color: orange ? "#FFFFFF" : f.text2 }}>{text}</Text>
    </View>
  );
}

/** Schmaler Fotostreifen des Themas über Fragen ohne eigenes Bild – läuft weich in die Karte aus. */
function ThemenStreifen({ frage }: { frage: Frage }) {
  const f = useFarbwelt();
  const flaeche = f.hell ? "#FFFFFF" : f.flaeche;
  return (
    <View style={{ height: 96, overflow: "hidden" }}>
      {/* Breite und Höhe ausdrücklich – sonst nimmt das Bild seine Dateigröße an */}
      <Image source={themaFoto(frage.thema)} style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%" }} resizeMode="cover" fadeDuration={0} />
      <LinearGradient
        colors={[mitDeckkraft("#030507", 0.1), mitDeckkraft(flaeche, f.hell ? 0.3 : 0.4), mitDeckkraft(flaeche, 0.88), flaeche]}
        locations={[0, 0.4, 0.82, 1]}
        style={FUELLEN}
      />
    </View>
  );
}

/** Buchstabe links an der Antwort – wird beim Wählen zum Haken, nach dem Prüfen grün oder rot. */
function Marke({ zustand, buchstabe }: { zustand: Zustand; buchstabe: string }) {
  const f = useFarbwelt();
  const { gruen, rot } = farbenFuer(f);
  const groesse = 32;
  const basis = { width: groesse, height: groesse, borderRadius: 11, alignItems: "center", justifyContent: "center", overflow: "hidden" } as const;
  if (zustand === "gewaehlt") {
    return (
      <View style={basis}>
        <LinearGradient colors={verlauf.knopf} style={FUELLEN} />
        <Icon name="checkmark" size={18} color="#FFFFFF" weight="bold" />
      </View>
    );
  }
  if (zustand === "richtig" || zustand === "falsch") {
    return (
      <View style={[basis, { backgroundColor: zustand === "richtig" ? gruen : rot }]}>
        <Icon name={zustand === "richtig" ? "checkmark" : "close"} size={18} color="#FFFFFF" weight="bold" />
      </View>
    );
  }
  if (zustand === "verpasst") {
    return (
      <View style={[basis, { borderWidth: 2, borderColor: gruen }]}>
        <Icon name="checkmark" size={16} color={gruen} weight="bold" />
      </View>
    );
  }
  return (
    <View style={[basis, { backgroundColor: f.hell ? "#F1EDE6" : "rgba(255,255,255,0.07)", borderWidth: 1, borderColor: f.hell ? "rgba(20,23,27,0.05)" : "rgba(255,255,255,0.08)" }]}>
      <Text style={{ ...schrift.textFett, fontSize: 14, color: f.text2 }}>{buchstabe}</Text>
    </View>
  );
}

/** Eine Antwort als Karte. */
function AntwortKarte({ text, buchstabe, zustand, gewaehlt, gesperrt, onPress }: { text: string; buchstabe: string; zustand: Zustand; gewaehlt: boolean; gesperrt: boolean; onPress: () => void }) {
  const f = useFarbwelt();
  const { gruen, rot } = farbenFuer(f);
  const skala = useRef(new Animated.Value(1)).current;

  // Kurzes Nachfedern beim Wählen
  useEffect(() => {
    if (zustand !== "gewaehlt") return;
    skala.setValue(0.97);
    Animated.spring(skala, { toValue: 1, friction: 5, tension: 220, useNativeDriver: true }).start();
  }, [zustand, skala]);

  const hintergrund =
    zustand === "gewaehlt"
      ? f.hell ? "#FFF3EC" : "#1D140F"
      : zustand === "richtig"
        ? f.hell ? "#ECF8EF" : "#0E1C13"
        : zustand === "falsch"
          ? f.hell ? "#FDEDEB" : "#221211"
          : f.hell ? "#FFFFFF" : f.flaeche;
  const rand =
    zustand === "gewaehlt" ? f.orange : zustand === "richtig" || zustand === "verpasst" ? gruen : zustand === "falsch" ? rot : f.hell ? "rgba(20,23,27,0.06)" : "rgba(255,255,255,0.08)";
  const schein =
    zustand === "gewaehlt" ? leuchten(f.orange, f.hell ? 0.22 : 0.35, 12, 0) : zustand === "richtig" ? leuchten(gruen, f.hell ? 0.2 : 0.3, 12, 0) : f.hell ? leuchten("#3C2C18", 0.05, 8, 2) : null;
  const unter = zustand === "verpasst" ? "Auch richtig – hättest du ankreuzen müssen" : zustand === "falsch" ? "Diese Antwort ist falsch" : null;

  return (
    <Animated.View style={{ transform: [{ scale: skala }] }}>
      <Pressable
        disabled={gesperrt}
        onPress={() => {
          tippen();
          onPress();
        }}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: gewaehlt, disabled: gesperrt }}
        accessibilityLabel={`Antwort ${buchstabe}: ${text}`}
        style={({ pressed }) => [
          {
            flexDirection: "row",
            alignItems: "center",
            gap: 14,
            minHeight: 64,
            paddingVertical: 13,
            paddingHorizontal: 14,
            borderRadius: 20,
            borderWidth: zustand === "offen" || zustand === "aus" ? 1 : 1.5,
            borderStyle: zustand === "verpasst" ? "dashed" : "solid",
            borderColor: rand,
            backgroundColor: hintergrund,
            opacity: zustand === "aus" ? 0.5 : pressed ? 0.88 : 1,
          },
          schein,
        ]}
      >
        <Marke zustand={zustand} buchstabe={buchstabe} />
        <View style={{ flex: 1, gap: 3 }}>
          <Text style={{ ...(zustand === "offen" || zustand === "aus" ? schrift.textMittel : schrift.textHalb), fontSize: 16, lineHeight: 22, color: f.text }}>{mitPunkt(text)}</Text>
          {unter ? <Text style={{ ...schrift.textHalb, fontSize: 12.5, color: zustand === "falsch" ? rot : gruen }}>{unter}</Text> : null}
        </View>
      </Pressable>
    </Animated.View>
  );
}

/** Was nach dem Prüfen im Banner steht. */
function statusText(frage: Frage, auswahl: number[], richtig: boolean): string {
  if (richtig) return frage.art === "zahl" ? "Richtig gerechnet." : "Sauber beantwortet.";
  if (frage.art === "zahl") return `Richtig ist ${zahlText(frage.loesung)} ${frage.einheit}.`;
  if (auswahl.length === 0) return "Keine Antwort ausgewählt.";
  return auswahl.some((i) => !frage.antworten[i]?.richtig) ? "Da war eine falsche Antwort dabei." : "Nicht alle richtigen Antworten ausgewählt.";
}

/** Ergebnis nach dem Prüfen: großes Häkchen oder Kreuz, Satz dazu, XP rechts. */
function ErgebnisBanner({ richtig, text, xp }: { richtig: boolean; text: string; xp?: number }) {
  const f = useFarbwelt();
  const { gruen, rot } = farbenFuer(f);
  const c = richtig ? gruen : rot;
  const puls = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(puls, { toValue: 1, friction: 4, tension: 140, useNativeDriver: true }).start();
  }, [puls]);
  return (
    <View
      style={[
        { flexDirection: "row", alignItems: "center", gap: 13, paddingVertical: 13, paddingHorizontal: 14, borderRadius: 22, backgroundColor: f.hell ? (richtig ? "#EAF7EE" : "#FCECEA") : mitDeckkraft(c, 0.1), borderWidth: 1, borderColor: mitDeckkraft(c, 0.38) },
        leuchten(c, f.hell ? 0.12 : 0.25, 14, 0),
      ]}
    >
      <Animated.View style={[{ width: 40, height: 40, borderRadius: 20, backgroundColor: c, alignItems: "center", justifyContent: "center", transform: [{ scale: puls.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }) }] }, leuchten(c, 0.55, 10, 0)]}>
        <Icon name={richtig ? "checkmark" : "close"} size={22} color="#FFFFFF" weight="bold" />
      </Animated.View>
      <View style={{ flex: 1 }}>
        <Text style={{ ...schrift.titel, fontSize: 18, lineHeight: 22, color: c }}>{richtig ? "Richtig!" : "Leider falsch"}</Text>
        <Text style={{ ...schrift.textMittel, fontSize: 13.5, lineHeight: 18, color: f.text2 }}>{text}</Text>
      </View>
      {xp ? (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4, height: 30, paddingHorizontal: 11, borderRadius: 15, backgroundColor: f.orangeSoft, borderWidth: 1, borderColor: mitDeckkraft(f.orange, 0.35) }}>
          <Icon name="flash" size={13} color={f.orange} />
          <Text style={{ ...schrift.textFett, fontSize: 14, color: f.orange, fontVariant: ["tabular-nums"] }}>+{xp} XP</Text>
        </View>
      ) : null}
    </View>
  );
}

/** Erklärung nach dem Prüfen: was richtig ist und was man sich merken sollte. */
function Erklaerung({ frage, richtig }: { frage: Frage; richtig: boolean }) {
  const f = useFarbwelt();
  const { gruen, rot, karte } = farbenFuer(f);
  const richtige = frage.art === "auswahl" ? frage.antworten.filter((a) => a.richtig) : [];
  return (
    <View style={[{ borderRadius: 24, overflow: "hidden" }, karte]}>
      <LinearGradient colors={[mitDeckkraft(f.orange, f.hell ? 0.08 : 0.12), mitDeckkraft(f.orange, 0)]} locations={[0, 0.55]} start={{ x: 0, y: 0 }} end={{ x: 0.9, y: 0.9 }} style={FUELLEN} />
      <View style={{ padding: 18, gap: 16 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 11 }}>
          <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: f.orangeSoft, alignItems: "center", justifyContent: "center" }}>
            <Icon name="bulb" size={18} color={f.orange} />
          </View>
          <Text style={{ ...schrift.titelFett, fontSize: 18, color: f.text, flex: 1 }}>Erklärung</Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4, height: 26, paddingHorizontal: 10, borderRadius: 13, backgroundColor: mitDeckkraft(richtig ? gruen : rot, 0.13) }}>
            <Icon name={richtig ? "checkmark" : "close"} size={13} color={richtig ? gruen : rot} />
            <Text style={{ ...schrift.textHalb, fontSize: 12.5, color: richtig ? gruen : rot }}>{richtig ? "Richtig" : "Falsch"}</Text>
          </View>
        </View>

        <View style={{ flexDirection: "row", gap: 12 }}>
          <View style={{ width: 3, borderRadius: 2, backgroundColor: gruen }} />
          <View style={{ flex: 1, gap: 6 }}>
            <Text style={{ ...schrift.textFett, fontSize: 11.5, letterSpacing: 1, color: gruen }}>RICHTIG IST</Text>
            {frage.art === "zahl" ? (
              <Text style={{ ...schrift.titel, fontSize: 20, color: f.text }}>
                {zahlText(frage.loesung)} {frage.einheit}
              </Text>
            ) : (
              richtige.map((a, i) => (
                <Text key={i} style={{ ...schrift.textHalb, fontSize: 16, lineHeight: 22, color: f.text }}>
                  {richtige.length > 1 ? "• " : ""}
                  {mitPunkt(a.text)}
                </Text>
              ))
            )}
          </View>
        </View>

        <View style={{ padding: 14, borderRadius: 18, backgroundColor: f.hell ? "#FBF6EF" : "rgba(255,255,255,0.04)", borderWidth: 1, borderColor: f.hell ? "rgba(242,84,10,0.14)" : "rgba(255,255,255,0.07)", gap: 4 }}>
          <Text style={{ fontFamily: handschrift, fontSize: 25, lineHeight: 30, color: f.orange }}>Merke dir</Text>
          <Text style={{ ...schrift.text, fontSize: 15.5, lineHeight: 23, color: f.hell ? "#2A2F36" : "#E6E8EB" }}>{frage.erklaerung}</Text>
        </View>
      </View>
    </View>
  );
}

/**
 * Eine Frage im Karten-Stil: oben die Frage-Karte (Bild oder Themenfoto, Kapseln,
 * Text), darunter die Antworten als Karten. Nach dem Prüfen zeigt ein Banner,
 * ob es gepasst hat, und eine Karte erklärt die Lösung.
 */
export function FrageAnsicht({
  frage,
  auswahl,
  onAuswahl,
  eingabe,
  onEingabe,
  aufgedeckt,
  ohneErklaerung,
  ohneMeta,
  kompakt,
  etikett,
  reihenfolge,
  xp,
  onErgebnisY,
}: {
  frage: Frage;
  auswahl: number[];
  onAuswahl: (neu: number[]) => void;
  eingabe: string;
  onEingabe: (text: string) => void;
  aufgedeckt: boolean;
  ohneErklaerung?: boolean;
  ohneMeta?: boolean;
  /** Für Duelle: Zeichen ohne Fahrersicht, kein Themenfoto. */
  kompakt?: boolean;
  /** Erste Kapsel über der Frage, z. B. „Übung“ oder „Prüfung“. */
  etikett?: string;
  /** Anzeige-Reihenfolge der Antworten (ursprüngliche Positionen); sonst wie im Katalog. */
  reihenfolge?: number[];
  /** Erhaltene XP – erscheinen nach dem Prüfen im Banner. */
  xp?: number;
  /** Lage des Ergebnis-Banners (von oben), sobald es erscheint – zum Hinrollen. */
  onErgebnisY?: (y: number) => void;
}) {
  const f = useFarbwelt();
  const { karte } = farbenFuer(f);
  const richtig = antwortRichtig(frage, auswahl, eingabe);
  const mitAufloesung = aufgedeckt && !ohneErklaerung;
  const ordnung =
    frage.art === "auswahl"
      ? reihenfolge && reihenfolge.length === frage.antworten.length
        ? reihenfolge
        : frage.antworten.map((_, i) => i)
      : [];

  return (
    <View style={{ gap: 14 }}>
      <View style={[{ borderRadius: 26, overflow: "hidden" }, karte]}>
        {frage.bild ? <FrageBild bild={frage.bild} thema={frage.thema} punkte={frage.punkte} kompakt={kompakt} randlos /> : !kompakt ? <ThemenStreifen frage={frage} /> : null}
        <View style={{ paddingHorizontal: 18, paddingTop: frage.bild || kompakt ? 16 : 4, paddingBottom: 18, gap: 12 }}>
          {!ohneMeta ? (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
              <Etikett text={etikett ?? (kompakt ? themaVon(frage.thema).titel : "Übung")} />
              <Etikett text={`${frage.punkte} Punkte`} icon={frage.punkte >= 5 ? "flame" : undefined} orange={frage.punkte >= 5} />
            </View>
          ) : null}
          <Text style={{ ...schrift.titel, fontSize: 21, lineHeight: 28, color: f.text, letterSpacing: -0.2 }}>{frage.text}</Text>
          {frage.art === "auswahl" && !aufgedeckt ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Icon name="checkmark-done" size={14} color={f.text3} />
              <Text style={{ ...schrift.textMittel, fontSize: 12.5, color: f.text3 }}>Eine oder mehrere Antworten sind richtig</Text>
            </View>
          ) : null}
        </View>
      </View>

      {mitAufloesung ? (
        <View onLayout={onErgebnisY ? (e) => onErgebnisY(e.nativeEvent.layout.y) : undefined}>
          <Einblenden>
            <ErgebnisBanner richtig={richtig} text={statusText(frage, auswahl, richtig)} xp={xp} />
          </Einblenden>
        </View>
      ) : null}

      {frage.art === "auswahl" ? (
        <View style={{ gap: 10 }}>
          {ordnung.map((i, pos) => {
            const antwort = frage.antworten[i];
            const gewaehlt = auswahl.includes(i);
            let zustand: Zustand = gewaehlt ? "gewaehlt" : "offen";
            if (aufgedeckt) {
              if (antwort.richtig && gewaehlt) zustand = "richtig";
              else if (antwort.richtig) zustand = "verpasst";
              else if (gewaehlt) zustand = "falsch";
              else zustand = "aus";
            }
            return (
              <AntwortKarte
                key={i}
                text={antwort.text}
                buchstabe={BUCHSTABEN[pos] ?? String(pos + 1)}
                zustand={zustand}
                gewaehlt={gewaehlt}
                gesperrt={aufgedeckt}
                onPress={() => onAuswahl(gewaehlt ? auswahl.filter((x) => x !== i) : [...auswahl, i])}
              />
            );
          })}
        </View>
      ) : (
        <ZahlEingabe frage={frage} eingabe={eingabe} onEingabe={onEingabe} aufgedeckt={aufgedeckt} loesungZeigen={aufgedeckt && Boolean(ohneErklaerung)} />
      )}

      {mitAufloesung ? (
        <Einblenden verzoegerung={120}>
          <Erklaerung frage={frage} richtig={richtig} />
        </Einblenden>
      ) : null}
    </View>
  );
}

function ZahlEingabe({
  frage,
  eingabe,
  onEingabe,
  aufgedeckt,
  loesungZeigen,
}: {
  frage: Extract<Frage, { art: "zahl" }>;
  eingabe: string;
  onEingabe: (t: string) => void;
  aufgedeckt: boolean;
  loesungZeigen: boolean;
}) {
  const f = useFarbwelt();
  const { gruen, rot } = farbenFuer(f);
  const wert = zahlLesen(eingabe);
  const richtig = wert != null && Math.abs(wert - frage.loesung) < 0.001;
  const rand = !aufgedeckt ? (eingabe ? f.orange : f.hell ? "rgba(20,23,27,0.1)" : "rgba(255,255,255,0.12)") : richtig ? gruen : rot;
  const hintergrund = aufgedeckt ? (richtig ? (f.hell ? "#ECF8EF" : "#0E1C13") : f.hell ? "#FDEDEB" : "#221211") : f.hell ? "#FFFFFF" : f.flaeche;

  return (
    <View style={{ gap: 8 }}>
      <View
        style={[
          { flexDirection: "row", alignItems: "center", height: 84, paddingHorizontal: 20, borderRadius: 22, borderWidth: 1.5, borderColor: rand, backgroundColor: hintergrund },
          !aufgedeckt && eingabe ? leuchten(f.orange, f.hell ? 0.2 : 0.3, 12, 0) : f.hell ? leuchten("#3C2C18", 0.06, 10, 3) : null,
        ]}
      >
        <Icon name="calculator-outline" size={22} color={f.text3} style={{ marginRight: 12 }} />
        <TextInput
          value={eingabe}
          onChangeText={(t) => onEingabe(t.replace(/[^0-9.,]/g, "").slice(0, 7))}
          editable={!aufgedeckt}
          keyboardType="decimal-pad"
          keyboardAppearance={f.hell ? "light" : "dark"}
          placeholder="0"
          placeholderTextColor={f.text3}
          selectionColor={f.orange}
          cursorColor={f.orange}
          selectionHandleColor={f.orange}
          accessibilityLabel="Deine Antwort"
          style={{ flex: 1, minWidth: 0, ...schrift.titel, fontSize: 38, color: f.text, fontVariant: ["tabular-nums"] }}
        />
        <Text style={{ ...schrift.titelFett, fontSize: 18, color: f.text3 }}>{frage.einheit}</Text>
      </View>
      {loesungZeigen && !richtig ? (
        <Text style={{ ...schrift.textHalb, fontSize: 15, color: gruen }}>
          Richtig: {zahlText(frage.loesung)} {frage.einheit}
        </Text>
      ) : null}
    </View>
  );
}
