import { useEffect, useState, type ReactNode } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, type TextInputProps } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BroadcastIcon } from "phosphor-react-native/src/icons/Broadcast";
import { CaretRightIcon } from "phosphor-react-native/src/icons/CaretRight";
import { ChatCircleTextIcon } from "phosphor-react-native/src/icons/ChatCircleText";
import { CheckCircleIcon } from "phosphor-react-native/src/icons/CheckCircle";
import { CheckIcon } from "phosphor-react-native/src/icons/Check";
import { CrownIcon } from "phosphor-react-native/src/icons/Crown";
import { FilmSlateIcon } from "phosphor-react-native/src/icons/FilmSlate";
import { HourglassIcon } from "phosphor-react-native/src/icons/Hourglass";
import { ProhibitIcon } from "phosphor-react-native/src/icons/Prohibit";
import { SealCheckIcon } from "phosphor-react-native/src/icons/SealCheck";
import { ShieldCheckIcon } from "phosphor-react-native/src/icons/ShieldCheck";
import { UsersThreeIcon } from "phosphor-react-native/src/icons/UsersThree";
import { VideoCameraIcon } from "phosphor-react-native/src/icons/VideoCamera";
import { XIcon } from "phosphor-react-native/src/icons/X";
import { XCircleIcon } from "phosphor-react-native/src/icons/XCircle";
import type { Icon as PhosphorIcon } from "phosphor-react-native";

import { dialog } from "@/components/dialog";
import { GlasGrund, GlasGruppe, GlasKarte } from "@/components/glas-flaeche";
import { Lader } from "@/components/lader";
import { Schalter } from "@/components/schalter";
import { GrossKopf, Seite } from "@/components/seite";
import { Abschnitt, Knopf, T, Zeile } from "@/components/ui";
import { useClipRechte, vorZeit } from "@/lib/clips-server";
import { creatorBewerben, creatorZurueckziehen, STATUS_TEXT, useMeineBewerbung, type BewerbungDaten, type CreatorStatus } from "@/lib/creator";
import { useFarbwelt, type Farbwelt } from "@/lib/darstellung";
import { erfolg, tippen } from "@/lib/haptik";
import { useKonto } from "@/lib/konto";
import { farben, mitDeckkraft, RAND, schrift } from "@/lib/theme";

// Creator werden: Formular (Name, Telefon, Alter, Beruf …) und danach der Stand
// der Bewerbung. Angenommene Creator gehen live und laden Clips hoch.

/** Auf dem iPad eine ruhige Spalte statt über die ganze Breite. */
const SPALTE = 640;

const REGELN = [
  "Keine Beleidigungen, keine Werbung, keine Links.",
  "Nur Themen rund um Führerschein und Verkehr.",
  "Keine privaten Daten zeigen.",
  "Lives können jederzeit beendet und Zugänge entzogen werden.",
];

const rot = (f: Farbwelt) => (f.hell ? "#E5392C" : "#FF5A4F");
const gruen = (f: Farbwelt) => (f.hell ? "#23A548" : "#4ED053");

/** Farbe, Symbol und Erklärung je Stand der Bewerbung. */
function statusBild(status: CreatorStatus, f: Farbwelt): { farbe: string; symbol: PhosphorIcon; text: string } {
  if (status === "angenommen") return { farbe: gruen(f), symbol: SealCheckIcon, text: "Du kannst live gehen und Clips hochladen. Der Inhaber kann Lives beenden und den Zugang jederzeit entziehen." };
  if (status === "abgelehnt") return { farbe: rot(f), symbol: XCircleIcon, text: "Deine Bewerbung wurde diesmal abgelehnt." };
  if (status === "entzogen") return { farbe: rot(f), symbol: ProhibitIcon, text: "Dein Creator-Zugang wurde beendet." };
  if (status === "zurueckgezogen") return { farbe: f.text3, symbol: XCircleIcon, text: "Du hast die Bewerbung zurückgezogen." };
  return { farbe: f.orange, symbol: HourglassIcon, text: "Wir sehen uns deine Bewerbung an. Sobald entschieden ist, bekommst du eine Mitteilung." };
}

/** Kopf und Inhalt in einer Spalte – auf dem iPad mittig und nicht gestreckt. */
function Spalte({ titel, unter, children, tastatur }: { titel: string; unter?: string; children: ReactNode; tastatur?: boolean }) {
  const insets = useSafeAreaInsets();
  const inhalt = (
    <>
      <View style={{ width: "100%", maxWidth: SPALTE + 2 * RAND, alignSelf: "center" }}>
        <GrossKopf titel={titel} unter={unter} schliessen />
      </View>
      <ScrollView
        contentContainerStyle={{ width: "100%", maxWidth: SPALTE + 2 * RAND, alignSelf: "center", paddingHorizontal: RAND, paddingTop: 14, paddingBottom: insets.bottom + 32, gap: 22 }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
      >
        {children}
      </ScrollView>
    </>
  );
  return (
    <>
      <GlasGrund />
      {tastatur ? (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          {inhalt}
        </KeyboardAvoidingView>
      ) : (
        inhalt
      )}
    </>
  );
}

/** Ruhiger Zustand mittig: Symbol, Titel, Text und ein Knopf. */
function Hinweis({ symbol: S, farbe, titel, text, children }: { symbol: PhosphorIcon; farbe: string; titel: string; text: string; children?: ReactNode }) {
  const f = useFarbwelt();
  return (
    <GlasKarte style={{ borderRadius: 26, paddingHorizontal: 22, paddingTop: 28, paddingBottom: 22, alignItems: "center", gap: 10 }}>
      <S size={44} color={farbe} weight="fill" />
      <Text style={{ ...schrift.titel, fontSize: 22, lineHeight: 28, color: f.text, textAlign: "center", marginTop: 4 }}>{titel}</Text>
      <Text style={{ ...schrift.text, fontSize: 15, lineHeight: 21, color: f.text2, textAlign: "center" }}>{text}</Text>
      {children ? <View style={{ alignSelf: "stretch", marginTop: 10 }}>{children}</View> : null}
    </GlasKarte>
  );
}

/** Ein Punkt der Einleitung: Symbol, Titel und kurzer Text – untereinander. */
function Punkt({ symbol: S, titel, text }: { symbol: PhosphorIcon; titel: string; text: string }) {
  const f = useFarbwelt();
  return (
    <View style={{ flexDirection: "row", gap: 14 }}>
      <View style={{ paddingTop: 1 }}>
        <S size={24} color={f.orange} weight="fill" />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ ...schrift.textHalb, fontSize: 16, color: f.text }}>{titel}</Text>
        <Text style={{ ...schrift.text, fontSize: 14, lineHeight: 19, color: f.text2 }}>{text}</Text>
      </View>
    </View>
  );
}

/** Großer Einstieg (Live gehen, Clip hochladen …): Symbol, Titel, Unterzeile, Pfeil. */
function Einstieg({ symbol: S, farbe, titel, text, onPress }: { symbol: PhosphorIcon; farbe: string; titel: string; text: string; onPress: () => void }) {
  const f = useFarbwelt();
  return (
    <Pressable
      onPress={() => {
        tippen();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={`${titel}, ${text}`}
      style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.98 : 1 }] })}
    >
      <GlasKarte style={{ borderRadius: 24, paddingVertical: 20, paddingHorizontal: 20, flexDirection: "row", alignItems: "center", gap: 16 }}>
        <S size={34} color={farbe} weight="fill" />
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={{ ...schrift.titel, fontSize: 19, lineHeight: 24, color: f.text }}>{titel}</Text>
          <Text style={{ ...schrift.text, fontSize: 14, lineHeight: 19, color: f.text2 }}>{text}</Text>
        </View>
        <CaretRightIcon size={18} color={f.text3} weight="bold" />
      </GlasKarte>
    </Pressable>
  );
}

/** Eingabezeile in einer Gruppe: Bezeichnung links, Feld rechts. */
function FeldZeile({ label, ...props }: TextInputProps & { label: string }) {
  const f = useFarbwelt();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", minHeight: 52, paddingHorizontal: 16 }}>
      <Text style={{ ...schrift.textMittel, fontSize: 15.5, color: f.text, width: 104 }}>{label}</Text>
      <TextInput
        placeholderTextColor={f.hell ? "#A3A8AF" : farben.text4}
        selectionColor={f.orange}
        cursorColor={f.orange}
        keyboardAppearance={f.hell ? "light" : "dark"}
        {...props}
        style={{ flex: 1, minWidth: 0, ...schrift.text, fontSize: 15.5, color: f.text, paddingVertical: 15 }}
      />
    </View>
  );
}

/** Mehrzeiliges Feld als Glaskarte: Titel und Zeichenzähler oben, darunter der Text. */
function TextKarte({ titel, optional, value, ...props }: TextInputProps & { titel: string; optional?: boolean; value: string }) {
  const f = useFarbwelt();
  const max = props.maxLength ?? 1000;
  return (
    <GlasKarte style={{ borderRadius: 22, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 6 }}>
      <View style={{ flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", gap: 10 }}>
        <Text style={{ ...schrift.textHalb, fontSize: 15.5, color: f.text, flexShrink: 1 }}>
          {titel}
          {optional ? <Text style={{ ...schrift.text, color: f.text3 }}> · optional</Text> : null}
        </Text>
        <Text style={{ ...schrift.text, fontSize: 12.5, color: f.text3, fontVariant: ["tabular-nums"] }}>
          {value.length}/{max}
        </Text>
      </View>
      <TextInput
        placeholderTextColor={f.hell ? "#A3A8AF" : farben.text4}
        selectionColor={f.orange}
        cursorColor={f.orange}
        keyboardAppearance={f.hell ? "light" : "dark"}
        multiline
        value={value}
        {...props}
        style={{ ...schrift.text, fontSize: 15.5, lineHeight: 21, color: f.text, minHeight: 92, paddingTop: 8, paddingBottom: 8, textAlignVertical: "top" }}
      />
    </GlasKarte>
  );
}

/** Ein Schritt im senkrechten Ablauf: Punkt links, Linie zum nächsten Schritt. */
function Schritt({ titel, zeit, art, farbe, letzter, kreuz }: { titel: string; zeit: string; art: "fertig" | "jetzt" | "offen"; farbe: string; letzter?: boolean; kreuz?: boolean }) {
  const f = useFarbwelt();
  const leer = f.hell ? "rgba(20,23,27,0.14)" : "rgba(255,255,255,0.16)";
  return (
    <View style={{ flexDirection: "row", gap: 14 }}>
      <View style={{ alignItems: "center", width: 24 }}>
        <View
          style={{
            width: 24,
            height: 24,
            borderRadius: 12,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: art === "fertig" ? farbe : art === "jetzt" ? mitDeckkraft(farbe.startsWith("#") ? farbe : "#FC5B0E", 0.16) : "transparent",
            borderWidth: art === "fertig" ? 0 : 2,
            borderColor: art === "jetzt" ? farbe : leer,
          }}
        >
          {art === "fertig" ? kreuz ? <XIcon size={12} color="#FFFFFF" weight="bold" /> : <CheckIcon size={13} color="#FFFFFF" weight="bold" /> : art === "jetzt" ? <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: farbe }} /> : null}
        </View>
        {letzter ? null : <View style={{ flex: 1, width: 2, minHeight: 22, marginVertical: 4, borderRadius: 1, backgroundColor: art === "fertig" ? mitDeckkraft(farbe.startsWith("#") ? farbe : "#FC5B0E", 0.45) : leer }} />}
      </View>
      <View style={{ flex: 1, paddingBottom: letzter ? 0 : 18, gap: 1 }}>
        <Text style={{ ...schrift.textHalb, fontSize: 15.5, lineHeight: 22, color: art === "offen" ? f.text3 : f.text }}>{titel}</Text>
        <Text style={{ ...schrift.text, fontSize: 13, lineHeight: 18, color: f.text3 }}>{zeit}</Text>
      </View>
    </View>
  );
}

function Inhalt() {
  const f = useFarbwelt();
  const { session, anzeigeName } = useKonto();
  const rechte = useClipRechte();
  const { bewerbung, geladen, neuLaden } = useMeineBewerbung();
  const [formular, setFormular] = useState(false);
  const [daten, setDaten] = useState<BewerbungDaten>({ name: anzeigeName ?? "", telefon: "", alter: 0, beruf: "", ort: "", themen: "", erfahrung: "", social: "" });
  const [alterText, setAlterText] = useState("");
  const [regelnOk, setRegelnOk] = useState(false);
  const [sendet, setSendet] = useState(false);

  useEffect(() => {
    if (!daten.name && anzeigeName) setDaten((d) => ({ ...d, name: anzeigeName }));
  }, [anzeigeName]); // eslint-disable-line react-hooks/exhaustive-deps

  const setze = (feld: keyof BewerbungDaten) => (wert: string) => setDaten((d) => ({ ...d, [feld]: wert }));
  const alter = Number.parseInt(alterText, 10);
  // Pflichtangaben einzeln, damit wir zeigen können, wie viele noch fehlen.
  const pflicht = [
    daten.name.trim().length >= 2,
    daten.telefon.replace(/\D/g, "").length >= 6,
    Number.isFinite(alter) && alter > 0,
    daten.beruf.trim().length >= 2,
    daten.themen.trim().length >= 10,
    regelnOk,
  ];
  const fehlen = pflicht.filter((ok) => !ok).length;
  const vollstaendig = fehlen === 0;

  async function absenden() {
    if (!vollstaendig || sendet) return;
    if (alter < 18) {
      dialog("Erst ab 18", "Creator kannst du ab 18 Jahren werden.");
      return;
    }
    setSendet(true);
    try {
      await creatorBewerben({ ...daten, alter });
      erfolg();
      await neuLaden();
      setFormular(false);
    } catch (e) {
      dialog("Nicht gesendet", (e as Error).message);
    } finally {
      setSendet(false);
    }
  }

  function zurueckziehen() {
    dialog("Bewerbung zurückziehen?", "Du kannst dich danach jederzeit neu bewerben.", [
      { text: "Abbrechen", style: "cancel" },
      {
        text: "Zurückziehen",
        style: "destructive",
        onPress: async () => {
          try {
            await creatorZurueckziehen();
            await neuLaden();
          } catch (e) {
            dialog("Nicht zurückgezogen", (e as Error).message);
          }
        },
      },
    ]);
  }

  if (!session) {
    return (
      <Spalte titel="Creator werden">
        <Hinweis symbol={VideoCameraIcon} farbe={f.orange} titel="Erst anmelden" text="Melde dich an, um dich als Creator zu bewerben.">
          <Knopf titel="Anmelden" onPress={() => router.push("/anmelden")} />
        </Hinweis>
      </Spalte>
    );
  }

  if (rechte.inhaber) {
    return (
      <Spalte titel="Creator">
        <Hinweis symbol={CrownIcon} farbe="#FFB400" titel="Du bist der Inhaber" text="Du kannst immer live gehen und Clips hochladen." />
        <Einstieg symbol={UsersThreeIcon} farbe={f.orange} titel="Bewerbungen ansehen" text="Creator annehmen, ablehnen und verwalten" onPress={() => router.replace("/creator-verwaltung")} />
      </Spalte>
    );
  }

  if (!geladen) {
    return (
      <Spalte titel="Creator werden">
        <Lader color={f.text3} style={{ alignSelf: "center", marginTop: 40 }} />
      </Spalte>
    );
  }

  const status = bewerbung?.status;
  if (!formular && bewerbung && status && status !== "zurueckgezogen") {
    const angenommen = status === "angenommen";
    const bild = statusBild(status, f);
    const S = bild.symbol;
    const entschieden = status !== "offen";
    return (
      <Spalte titel={angenommen ? "Creator" : "Deine Bewerbung"}>
        {/* Status groß oben */}
        <GlasKarte style={{ borderRadius: 26, padding: 22, gap: 12 }}>
          <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
            <View style={{ flex: 1, gap: 4 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 7 }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: bild.farbe }} />
                <Text style={{ ...schrift.textHalb, fontSize: 13.5, color: bild.farbe }}>{angenommen ? "Freigeschaltet" : "Status"}</Text>
              </View>
              <Text style={{ ...schrift.titel, fontSize: 30, lineHeight: 36, letterSpacing: -0.4, color: f.text }}>{angenommen ? "Du bist Creator" : STATUS_TEXT[status]}</Text>
            </View>
            <S size={40} color={bild.farbe} weight="fill" />
          </View>
          <Text style={{ ...schrift.text, fontSize: 15, lineHeight: 21, color: f.text2 }}>{bild.text}</Text>
        </GlasKarte>

        {angenommen ? (
          <View style={{ gap: 12 }}>
            <Einstieg symbol={BroadcastIcon} farbe={rot(f)} titel="Live gehen" text="Direkt aus der App senden" onPress={() => router.replace("/live-senden")} />
            <Einstieg symbol={FilmSlateIcon} farbe={f.orange} titel="Clip hochladen" text="Kurzes Video für alle im Clips-Tab" onPress={() => router.replace("/clip-hochladen")} />
          </View>
        ) : null}

        {/* Ablauf: gesendet → in Prüfung → entschieden */}
        <View>
          <Abschnitt titel="Ablauf" klein />
          <GlasKarte style={{ borderRadius: 22, paddingHorizontal: 18, paddingVertical: 18 }}>
            <Schritt titel="Bewerbung gesendet" zeit={vorZeit(bewerbung.erstellt_am)} art="fertig" farbe={f.orange} />
            <Schritt titel="In Prüfung" zeit={entschieden ? "Abgeschlossen" : "Der Inhaber sieht sich deine Angaben an"} art={entschieden ? "fertig" : "jetzt"} farbe={f.orange} />
            <Schritt
              titel={entschieden ? STATUS_TEXT[status] : "Entscheidung"}
              zeit={bewerbung.entschieden_am ? vorZeit(bewerbung.entschieden_am) : "Du bekommst eine Mitteilung"}
              art={entschieden ? "fertig" : "offen"}
              farbe={bild.farbe}
              kreuz={status === "abgelehnt" || status === "entzogen"}
              letzter
            />
          </GlasKarte>
        </View>

        {bewerbung.notiz ? (
          <GlasKarte style={{ borderRadius: 22, padding: 18, gap: 10 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <ChatCircleTextIcon size={20} color={f.orange} weight="fill" />
              <Text style={{ ...schrift.textHalb, fontSize: 15, color: f.text }}>Nachricht vom Inhaber</Text>
            </View>
            <Text selectable style={{ ...schrift.text, fontSize: 15.5, lineHeight: 22, color: f.text }}>
              {bewerbung.notiz}
            </Text>
          </GlasKarte>
        ) : null}

        {angenommen ? null : status === "offen" ? (
          <GlasGruppe>
            <Zeile titel="Bewerbung zurückziehen" gefahr ohnePfeil onPress={zurueckziehen} />
          </GlasGruppe>
        ) : (
          <Knopf titel="Neu bewerben" onPress={() => setFormular(true)} />
        )}
      </Spalte>
    );
  }

  // ------------------------------------------------------------------ Formular
  return (
    <Spalte titel="Creator werden" tastatur>
      {/* Einleitung: was Creator dürfen – untereinander, ohne Kacheln */}
      <GlasKarte style={{ borderRadius: 26, padding: 20, gap: 18 }}>
        <Text style={{ ...schrift.text, fontSize: 15.5, lineHeight: 22, color: f.text2 }}>Als Creator gehst du in Fahrschul Pro live und lädst Clips hoch. Erzähl uns kurz von dir.</Text>
        <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: f.hell ? "rgba(20,23,27,0.1)" : "rgba(255,255,255,0.12)" }} />
        <Punkt symbol={BroadcastIcon} titel="Live gehen" text="Regeln erklären und Prüfungsfragen live mit der Community lösen." />
        <Punkt symbol={FilmSlateIcon} titel="Clips hochladen" text="Kurze Videos für alle im Clips-Tab." />
        <Punkt symbol={HourglassIcon} titel="Schnelle Antwort" text="Sobald entschieden ist, bekommst du eine Mitteilung." />
      </GlasKarte>

      <View>
        <Abschnitt titel="Über dich" klein />
        <GlasGruppe>
          <FeldZeile label="Name" value={daten.name} onChangeText={setze("name")} placeholder="Vor- und Nachname" maxLength={80} autoComplete="name" textContentType="name" />
          <FeldZeile label="Telefon" value={daten.telefon} onChangeText={setze("telefon")} placeholder="0151 2345678" keyboardType="phone-pad" maxLength={30} autoComplete="tel" textContentType="telephoneNumber" />
          <FeldZeile label="Alter" value={alterText} onChangeText={(t) => setAlterText(t.replace(/\D/g, "").slice(0, 2))} placeholder="Jahre" keyboardType="number-pad" maxLength={2} />
          <FeldZeile label="Beruf" value={daten.beruf} onChangeText={setze("beruf")} placeholder="z. B. Fahrlehrer" maxLength={80} />
          <FeldZeile label="Wohnort" value={daten.ort} onChangeText={setze("ort")} placeholder="optional" maxLength={80} />
          <FeldZeile label="Kanal" value={daten.social} onChangeText={setze("social")} placeholder="Instagram/TikTok (optional)" autoCapitalize="none" autoCorrect={false} maxLength={200} />
        </GlasGruppe>
      </View>

      <TextKarte titel="Was möchtest du machen?" value={daten.themen} onChangeText={setze("themen")} placeholder="z. B. Vorfahrtsregeln erklären, Prüfungsfragen live lösen" maxLength={1000} />
      <TextKarte titel="Erfahrung" optional value={daten.erfahrung} onChangeText={setze("erfahrung")} placeholder="z. B. Fahrlehrer seit 5 Jahren, eigener Kanal" maxLength={1000} />

      {/* Regeln mit Zustimmung */}
      <GlasKarte style={{ borderRadius: 22 }}>
        <View style={{ padding: 18, gap: 12 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <ShieldCheckIcon size={20} color={f.orange} weight="fill" />
            <Text style={{ ...schrift.textHalb, fontSize: 15.5, color: f.text }}>Regeln</Text>
          </View>
          {REGELN.map((r) => (
            <View key={r} style={{ flexDirection: "row", gap: 10 }}>
              <View style={{ width: 5, height: 5, borderRadius: 2.5, marginTop: 8, backgroundColor: f.text3 }} />
              <Text style={{ ...schrift.text, fontSize: 14.5, lineHeight: 20, color: f.text2, flex: 1 }}>{r}</Text>
            </View>
          ))}
        </View>
        <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: f.hell ? "rgba(20,23,27,0.1)" : "rgba(255,255,255,0.12)", marginLeft: 18 }} />
        <Zeile titel="Ich bin mindestens 18 und halte mich an die Regeln" titelZeilen={2} rechts={<Schalter wert={regelnOk} onWechsel={setRegelnOk} />} />
      </GlasKarte>

      <View style={{ gap: 12 }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 }}>
          {vollstaendig ? <CheckCircleIcon size={16} color={gruen(f)} weight="fill" /> : null}
          <Text style={{ ...schrift.textMittel, fontSize: 13.5, color: vollstaendig ? gruen(f) : f.text3 }}>
            {vollstaendig ? "Alles ausgefüllt" : fehlen === 1 ? "Noch 1 Pflichtangabe" : `Noch ${fehlen} Pflichtangaben`}
          </Text>
        </View>
        <Knopf titel="Bewerbung senden" laedt={sendet} deaktiviert={!vollstaendig} onPress={absenden} />
        <T v="klein" zentriert>
          Deine Angaben sieht nur der Inhaber der App.
        </T>
      </View>
    </Spalte>
  );
}

export default function CreatorBewerbung() {
  return (
    <Seite>
      <Inhalt />
    </Seite>
  );
}
