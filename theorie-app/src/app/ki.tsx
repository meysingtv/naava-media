import { useEffect, useRef, useState, type ReactNode } from "react";
import { KeyboardAvoidingView, Linking, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { useAnimatedStyle, useFrameCallback, useSharedValue, type SharedValue } from "react-native-reanimated";
import { ArrowUpIcon } from "phosphor-react-native/src/icons/ArrowUp";
import { KeyboardIcon } from "phosphor-react-native/src/icons/Keyboard";
import { MicrophoneIcon } from "phosphor-react-native/src/icons/Microphone";
import { XIcon } from "phosphor-react-native/src/icons/X";

import { dialog } from "@/components/dialog";
import { Glas } from "@/components/glas";
import { KiKugel } from "@/components/ki-kugel";
import { Seite } from "@/components/seite";
import { KopfTaste, kopfOben } from "@/components/ui";
import { aktionTitel, kiChatAntwort, VORSCHLAEGE, type ChatNachricht, type KiAktion } from "@/lib/ki-chat";
import { KI_AKZENT, KUGEL_BLAU, KUGEL_TUERKIS } from "@/lib/ki-kugel";
import { vorlesen, vorlesenMoeglich, vorlesenStoppen, zuhoerenStarten, type Zuhoeren } from "@/lib/ki-sprache";
import { useFarbwelt } from "@/lib/darstellung";
import { useFenster } from "@/lib/fenster";
import { erfolg, tippen } from "@/lib/haptik";
import { useKonto } from "@/lib/konto";
import { useStand } from "@/lib/stand";
import { leuchten, mitDeckkraft, RAND, schrift } from "@/lib/theme";

// KI-Seite: in der Mitte die KI-Kugel, darunter Vorschläge. Man tippt oder
// spricht; die Antwort erscheint im Chat und wird (wenn gewünscht) vorgelesen.
// Hell: Kugel und Akzente in Logo-Blau, dunkel: Türkis.

type Phase = "start" | "zuhoeren" | "chat";
type Status = "bereit" | "zuhoeren" | "denkt" | "spricht";

/** Unterhaltung bleibt erhalten, wenn man kurz zu einer Übung springt. */
let gemerkt: ChatNachricht[] = [];

const STATUS_TEXT: Record<Status, string> = { bereit: "bereit", zuhoeren: "hört zu", denkt: "denkt nach …", spricht: "spricht …" };

function aktionAusfuehren(a: KiAktion) {
  tippen();
  switch (a.art) {
    case "smart":
    case "fehler":
      return router.push({ pathname: "/training", params: { modus: a.art } });
    case "thema":
      return router.push({ pathname: "/training", params: { modus: "thema", thema: a.thema } });
    case "pruefung":
      return router.push({ pathname: "/pruefung", params: { direkt: "1" } });
    case "karteikarten":
      return router.push("/karteikarten");
    case "schilder":
      return router.push("/schilder-jagd");
    case "formeln":
      return router.push("/formeln");
    case "statistik":
      return router.push("/statistik");
    case "termin":
      return router.push("/pruefungstermin");
  }
}

/** **fett** innerhalb einer Zeile. */
function mitFett(s: string): ReactNode[] {
  return s.split("**").map((t, i) =>
    i % 2 === 1 ? (
      <Text key={i} style={schrift.textFett}>
        {t}
      </Text>
    ) : (
      t
    ),
  );
}

/** Antworttext: Absätze, Listen mit „•“ und **fett**. */
function Formatiert({ text, akzent }: { text: string; akzent: string }) {
  const f = useFarbwelt();
  const stil = { ...schrift.text, fontSize: 16, lineHeight: 24, color: f.hell ? "#1D2126" : "#EEF0F2" };
  return (
    <View style={{ gap: 2 }}>
      {text.split("\n").map((zeile, i) => {
        if (!zeile.trim()) return <View key={i} style={{ height: 8 }} />;
        const liste = /^\s*(•|-|\*)\s+/.test(zeile);
        const inhalt = liste ? zeile.replace(/^\s*(•|-|\*)\s+/, "") : zeile.replace(/^#+\s*/, "");
        return (
          <View key={i} style={{ flexDirection: "row", gap: 8 }}>
            {liste ? <Text style={{ ...stil, color: akzent }}>•</Text> : null}
            <Text selectable style={[stil, { flex: 1 }]}>
              {mitFett(inhalt)}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

/** Sprachwelle unter der Kugel: Balken folgen der Lautstärke. */
function Welle({ pegel, farben }: { pegel: SharedValue<number>; farben: readonly [string, string] }) {
  const zeit = useSharedValue(0);
  useFrameCallback((fr) => {
    zeit.value += (fr.timeSincePreviousFrame ?? 16) / 1000;
  });
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 5, height: 50 }}>
      {Array.from({ length: 13 }, (_, i) => (
        <WellenBalken key={i} i={i} pegel={pegel} zeit={zeit} farben={farben} />
      ))}
    </View>
  );
}

function WellenBalken({ i, pegel, zeit, farben }: { i: number; pegel: SharedValue<number>; zeit: SharedValue<number>; farben: readonly [string, string] }) {
  const mitte = 1 - Math.abs(i - 6) / 7;
  const stil = useAnimatedStyle(() => {
    const welle = 0.55 + 0.45 * Math.sin(zeit.value * 9 + i * 1.3);
    return { height: 6 + 44 * Math.min(1, pegel.value * 1.3) * mitte * welle };
  });
  return (
    <Animated.View style={[{ width: 5, borderRadius: 3, overflow: "hidden" }, stil]}>
      <LinearGradient colors={farben} style={{ flex: 1 }} />
    </Animated.View>
  );
}

function Inhalt() {
  const f = useFarbwelt();
  const insets = useSafeAreaInsets();
  const { width, height } = useFenster();
  const { anzeigeName } = useKonto();
  const { stand } = useStand();
  const vorname = (anzeigeName ?? "").trim().split(/\s+/)[0] ?? "";
  const akzent = f.hell ? KI_AKZENT.hell : KI_AKZENT.dunkel;
  const palette = f.hell ? KUGEL_BLAU : KUGEL_TUERKIS;

  const [nachrichten, setNachrichten] = useState<ChatNachricht[]>(gemerkt);
  const [phase, setPhase] = useState<Phase>(gemerkt.length ? "chat" : "start");
  const [status, setStatus] = useState<Status>("bereit");
  const [entwurf, setEntwurf] = useState("");
  const [mitschrift, setMitschrift] = useState("");
  const [stumm, setStumm] = useState(!vorlesenMoeglich);
  const pegel = useSharedValue(0.12);
  const zuhoeren = useRef<Zuhoeren | null>(null);
  const endText = useRef("");
  const takt = useRef<ReturnType<typeof setInterval> | null>(null);
  const liste = useRef<ScrollView>(null);

  useEffect(() => {
    gemerkt = nachrichten;
  }, [nachrichten]);

  // Beim Verlassen: nicht weiter zuhören oder vorlesen
  useEffect(
    () => () => {
      zuhoeren.current?.abbrechen();
      vorlesenStoppen();
      if (takt.current) clearInterval(takt.current);
    },
    [],
  );

  /** Kugel bewegt sich beim Nachdenken und Sprechen von selbst. */
  function pegelTakt(art: "denkt" | "spricht" | "aus") {
    if (takt.current) clearInterval(takt.current);
    takt.current = null;
    if (art === "aus") {
      pegel.value = 0.12;
      return;
    }
    let n = 0;
    takt.current = setInterval(() => {
      n += 1;
      pegel.value = art === "denkt" ? 0.32 + 0.1 * Math.sin(n / 3) : 0.35 + 0.55 * Math.random() * (0.6 + 0.4 * Math.sin(n / 2));
    }, 90);
  }

  async function senden(text: string) {
    const t = text.trim();
    if (!t || status === "denkt") return;
    tippen();
    vorlesenStoppen();
    const ich: ChatNachricht = { id: `ich-${Date.now()}`, rolle: "ich", text: t };
    const verlauf = [...nachrichten, ich];
    setNachrichten(verlauf);
    setEntwurf("");
    setPhase("chat");
    setStatus("denkt");
    pegelTakt("denkt");
    const antwort = await kiChatAntwort(verlauf, stand, vorname);
    setNachrichten((alt) => [...alt, antwort]);
    if (stumm || !vorlesenMoeglich) {
      setStatus("bereit");
      pegelTakt("aus");
      return;
    }
    setStatus("spricht");
    pegelTakt("spricht");
    vorlesen(antwort.text, {
      onEnde: () => {
        setStatus((s) => (s === "spricht" ? "bereit" : s));
        pegelTakt("aus");
      },
    });
  }

  async function zuhoerenBeginnen() {
    tippen();
    vorlesenStoppen();
    pegelTakt("aus");
    endText.current = "";
    setMitschrift("");
    const vorher: Phase = nachrichten.length ? "chat" : "start";
    setPhase("zuhoeren");
    setStatus("zuhoeren");
    zuhoeren.current = await zuhoerenStarten({
      onText: (text, fertig) => {
        setMitschrift(text);
        if (fertig) endText.current = text;
      },
      onPegel: (p) => {
        pegel.value = p;
      },
      onEnde: () => {
        zuhoeren.current = null;
        pegel.value = 0.12;
        const text = endText.current.trim();
        setStatus("bereit");
        if (text) {
          erfolg();
          senden(text);
        } else setPhase(vorher);
      },
      onFehler: (fehler) => {
        zuhoeren.current = null;
        pegel.value = 0.12;
        setStatus("bereit");
        setPhase(vorher);
        if (fehler === "nicht_verfuegbar") dialog("Sprechen kommt mit dem Update", "In dieser App-Version kannst du der KI erst schreiben. Sprechen geht ab dem nächsten Update.");
        else if (fehler === "erlaubnis")
          dialog("Mikrofon erlauben", "Damit die KI dich hören kann, braucht Fahrschul Pro Zugriff auf Mikrofon und Spracherkennung.", [
            { text: "Abbrechen", style: "cancel" },
            { text: "Einstellungen", onPress: () => Linking.openSettings() },
          ]);
        else if (fehler === "netz") dialog("Keine Verbindung", "Für die Spracherkennung braucht dein Handy gerade Internet.");
      },
    });
  }

  function neu() {
    tippen();
    vorlesenStoppen();
    pegelTakt("aus");
    setNachrichten([]);
    setPhase("start");
    setStatus("bereit");
  }

  function stummUmschalten() {
    tippen();
    if (!vorlesenMoeglich) {
      dialog("Vorlesen kommt mit dem Update", "In dieser App-Version kann die KI noch nicht vorlesen.");
      return;
    }
    if (!stumm) {
      vorlesenStoppen();
      pegelTakt("aus");
      if (status === "spricht") setStatus("bereit");
    }
    setStumm(!stumm);
  }

  const kugelGross = Math.min(width * 0.98, height * 0.46, 430);
  const knopfVerlauf = akzent.knopf as unknown as [string, string, string];
  const hintergrund = f.hell ? [mitDeckkraft(akzent.grund, 0.9), mitDeckkraft(f.grund, 0)] : [mitDeckkraft(akzent.grund, 1), mitDeckkraft(f.grund, 0)];

  return (
    <View style={{ flex: 1 }}>
      <LinearGradient pointerEvents="none" colors={hintergrund as [string, string]} style={{ position: "absolute", left: 0, right: 0, top: 0, height: height * 0.7 }} />

      {/* Kopf: zurück, Titel mit Status, rechts Vorlesen und neuer Chat */}
      <View style={{ paddingTop: kopfOben(insets.top), paddingHorizontal: RAND, flexDirection: "row", alignItems: "center", minHeight: 52 + kopfOben(insets.top) }}>
        <KopfTaste icon="chevron-back" label="Zurück" onPress={() => router.back()} />
        <View style={{ flex: 1, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 6 }}>
          {phase === "chat" ? <KiKugel groesse={46} pegel={pegel} palette={palette} style={{ marginVertical: -6, marginLeft: -12 }} /> : null}
          <View style={{ alignItems: phase === "chat" ? "flex-start" : "center" }}>
            <Text style={{ ...schrift.textFett, fontSize: 16.5, color: f.text }}>Fahrschul KI</Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
              <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: status === "zuhoeren" ? "#FF5A4F" : status === "bereit" ? "#4ED053" : akzent.symbol }} />
              <Text style={{ ...schrift.textMittel, fontSize: 12.5, color: f.text3 }}>{STATUS_TEXT[status]}</Text>
            </View>
          </View>
        </View>
        <View style={{ flexDirection: "row", gap: 8 }}>
          {phase === "chat" ? <KopfTaste icon={stumm ? "volume-mute" : "volume-high"} label={stumm ? "Vorlesen an" : "Vorlesen aus"} onPress={stummUmschalten} /> : null}
          {nachrichten.length ? <KopfTaste icon="create-outline" label="Neuer Chat" onPress={neu} /> : phase === "start" ? <View style={{ width: 42 }} /> : null}
        </View>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        {phase === "start" ? (
          <ScrollView contentContainerStyle={{ flexGrow: 1, alignItems: "center", justifyContent: "center", paddingBottom: 20 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <KiKugel groesse={kugelGross} pegel={pegel} palette={palette} style={{ marginTop: -kugelGross * 0.12, marginBottom: -kugelGross * 0.12 }} />
            <Text style={{ ...schrift.titel, fontSize: 29, lineHeight: 35, letterSpacing: -0.6, color: f.text, textAlign: "center", marginTop: 6, paddingHorizontal: RAND }}>
              {vorname ? `Hey ${vorname},` : "Hey,"}
              {"\n"}was willst du wissen?
            </Text>
            <Text style={{ ...schrift.textMittel, fontSize: 15.5, lineHeight: 21, color: f.text2, textAlign: "center", marginTop: 8, paddingHorizontal: 40 }}>
              Frag mich alles zur Theorie – per Stimme oder einfach tippen.
            </Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, paddingHorizontal: RAND, marginTop: 22, width: "100%", maxWidth: 560 }}>
              {VORSCHLAEGE.map((v) => (
                <Pressable
                  key={v.text}
                  onPress={() => senden(v.frage)}
                  accessibilityRole="button"
                  style={({ pressed }) => ({ width: "48.6%", transform: [{ scale: pressed ? 0.96 : 1 }] })}
                >
                  <Glas hell={f.hell} style={[{ height: 44, borderRadius: 22, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 }, f.hell ? leuchten("#3C2C18", 0.06, 8, 2) : null]}>
                    <Text style={{ ...schrift.textFett, fontSize: 15, color: akzent.symbol }}>{v.symbol}</Text>
                    <Text style={{ ...schrift.textHalb, fontSize: 14.5, color: f.text }}>{v.text}</Text>
                  </Glas>
                </Pressable>
              ))}
            </View>
          </ScrollView>
        ) : null}

        {phase === "zuhoeren" ? (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingBottom: 120 }}>
            <KiKugel groesse={Math.min(width * 1.05, height * 0.5, 470)} pegel={pegel} palette={palette} style={{ marginBottom: -30 }} />
            <Welle pegel={pegel} farben={[akzent.knopf[0], akzent.knopf[1]]} />
            <Text style={{ ...schrift.textFett, fontSize: 23, lineHeight: 31, color: mitschrift ? f.text : f.text3, textAlign: "center", paddingHorizontal: 30, marginTop: 22 }} numberOfLines={4}>
              {mitschrift || "Ich höre zu …"}
            </Text>
          </View>
        ) : null}

        {phase === "chat" ? (
          <ScrollView
            ref={liste}
            onContentSizeChange={() => liste.current?.scrollToEnd({ animated: true })}
            contentContainerStyle={{ paddingHorizontal: RAND, paddingTop: 10, paddingBottom: 24, gap: 16, width: "100%", maxWidth: 680, alignSelf: "center" }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {nachrichten.map((m) =>
              m.rolle === "ich" ? (
                <LinearGradient key={m.id} colors={[akzent.knopf[1], akzent.knopf[2]]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ alignSelf: "flex-end", maxWidth: "82%", paddingHorizontal: 15, paddingVertical: 11, borderRadius: 20, borderBottomRightRadius: 6 }}>
                  <Text selectable style={{ ...schrift.textMittel, fontSize: 15.5, lineHeight: 21, color: "#FFFFFF" }}>
                    {m.text}
                  </Text>
                </LinearGradient>
              ) : (
                <View key={m.id} style={{ gap: 10 }}>
                  <Formatiert text={m.text} akzent={akzent.symbol} />
                  {m.aktionen?.map((a) => (
                    <Pressable key={JSON.stringify(a)} onPress={() => aktionAusfuehren(a)} accessibilityRole="button" style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.97 : 1 }] })}>
                      <View
                        style={{
                          height: 46,
                          borderRadius: 23,
                          flexDirection: "row",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 8,
                          backgroundColor: mitDeckkraft(akzent.schatten, f.hell ? 0.1 : 0.16),
                          borderWidth: 1,
                          borderColor: mitDeckkraft(akzent.schatten, f.hell ? 0.3 : 0.4),
                        }}
                      >
                        <Text style={{ ...schrift.textFett, fontSize: 15, color: akzent.text }}>{aktionTitel(a)}</Text>
                        <Text style={{ ...schrift.textFett, fontSize: 15, color: akzent.text }}>→</Text>
                      </View>
                    </Pressable>
                  ))}
                  {m.quelle === "lernstoff" ? <Text style={{ ...schrift.text, fontSize: 12, color: f.text3 }}>Aus dem Lernstoff der App</Text> : null}
                </View>
              ),
            )}
            {status === "denkt" ? (
              <View style={{ flexDirection: "row", gap: 6, paddingVertical: 6 }}>
                {[0, 1, 2].map((i) => (
                  <View key={i} style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: mitDeckkraft(akzent.symbol, 0.4 + i * 0.25) }} />
                ))}
              </View>
            ) : null}
          </ScrollView>
        ) : null}

        {/* Unten: Eingabe + Mikrofon – beim Zuhören Stopp und Abbrechen */}
        {phase === "zuhoeren" ? (
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 34, paddingBottom: insets.bottom + 26 }}>
            <Pressable
              onPress={() => {
                zuhoeren.current?.abbrechen();
                setPhase(nachrichten.length ? "chat" : "start");
                setStatus("bereit");
                pegel.value = 0.12;
              }}
              accessibilityLabel="Lieber tippen"
            >
              <Glas hell={f.hell} style={{ width: 60, height: 60, borderRadius: 30, alignItems: "center", justifyContent: "center" }}>
                <KeyboardIcon size={24} color={f.text} />
              </Glas>
            </Pressable>
            <Pressable onPress={() => zuhoeren.current?.stoppen()} accessibilityLabel="Fertig gesprochen" style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.94 : 1 }] })}>
              <View style={[{ width: 78, height: 78, borderRadius: 39, backgroundColor: f.hell ? "#14171B" : "#FFFFFF", alignItems: "center", justifyContent: "center" }, leuchten(akzent.schatten, 0.45, 18, 4)]}>
                <View style={{ width: 24, height: 24, borderRadius: 6, backgroundColor: akzent.knopf[1] }} />
              </View>
            </Pressable>
            <Pressable
              onPress={() => {
                zuhoeren.current?.abbrechen();
                setPhase(nachrichten.length ? "chat" : "start");
                setStatus("bereit");
                pegel.value = 0.12;
              }}
              accessibilityLabel="Abbrechen"
            >
              <Glas hell={f.hell} style={{ width: 60, height: 60, borderRadius: 30, alignItems: "center", justifyContent: "center" }}>
                <XIcon size={24} color={f.text} weight="bold" />
              </Glas>
            </Pressable>
          </View>
        ) : (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14, paddingTop: 8, paddingBottom: insets.bottom + 10, width: "100%", maxWidth: 680, alignSelf: "center" }}>
            <Glas hell={f.hell} style={[{ flex: 1, minHeight: 54, borderRadius: 27, paddingHorizontal: 18, justifyContent: "center" }, f.hell ? leuchten("#3C2C18", 0.08, 14, 4) : null]}>
              <TextInput
                value={entwurf}
                onChangeText={setEntwurf}
                placeholder={phase === "chat" ? "Frag weiter …" : "Frag die KI …"}
                placeholderTextColor={f.text3}
                onSubmitEditing={() => senden(entwurf)}
                returnKeyType="send"
                multiline
                maxLength={800}
                style={{ ...schrift.text, fontSize: 16, color: f.text, paddingVertical: 14, maxHeight: 120 }}
              />
            </Glas>
            <Pressable
              onPress={() => (entwurf.trim() ? senden(entwurf) : zuhoerenBeginnen())}
              disabled={status === "denkt"}
              accessibilityLabel={entwurf.trim() ? "Senden" : "Sprechen"}
              style={({ pressed }) => [{ borderRadius: 27, transform: [{ scale: pressed ? 0.93 : 1 }], opacity: status === "denkt" ? 0.5 : 1 }, leuchten(akzent.schatten, 0.5, 16, 5)]}
            >
              <LinearGradient colors={knopfVerlauf} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ width: 54, height: 54, borderRadius: 27, alignItems: "center", justifyContent: "center" }}>
                {entwurf.trim() ? <ArrowUpIcon size={24} color="#FFFFFF" weight="bold" /> : <MicrophoneIcon size={25} color="#FFFFFF" weight="fill" />}
              </LinearGradient>
            </Pressable>
          </View>
        )}
      </KeyboardAvoidingView>
    </View>
  );
}

export default function KiSeite() {
  return (
    <Seite>
      <Inhalt />
    </Seite>
  );
}
