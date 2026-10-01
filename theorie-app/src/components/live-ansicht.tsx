import { useEffect, useRef, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { activateKeepAwakeAsync, deactivateKeepAwake } from "expo-keep-awake";

import { auswahlBlatt } from "@/components/auswahl-blatt";
import { dialog } from "@/components/dialog";
import { Glas } from "@/components/glas";
import { HinweisAnzeige, useHinweis } from "@/components/hinweis";
import { Icon } from "@/components/icon";
import { Lader } from "@/components/lader";
import { LiveBuehne } from "@/components/live-buehne";
import { LiveChat, LiveEingabe, LiveRing, LiveSchild, LIVE_ROT, useHerzen, ZuschauerZahl } from "@/components/live";
import { Knopf } from "@/components/ui";
import { useClipRechte } from "@/lib/clips-server";
import { erfolg, tippen } from "@/lib/haptik";
import { useKonto } from "@/lib/konto";
import {
  liveAboSetzen,
  liveAboStatus,
  liveMelden,
  liveNachrichtLoeschen,
  liveSchreiben,
  liveZugang,
  useLive,
  useLiveChat,
  type ChatNachricht,
  type LiveSteuerung,
  type LiveZugang,
  type ZugangFehler,
} from "@/lib/live";
import { leuchten, schrift } from "@/lib/theme";

// Das Live zum Zuschauen – als eigene Seite (Mitteilung „… ist jetzt live“)
// und eingebettet in Clips (Kategorie „Live“). Ohne laufendes Live: Hinweis,
// Mitteilung an/aus und für den Inhaber „Live gehen“.

const LIVE_VERLAUF = ["#FF5A5F", "#FF2D55", "#E0124A"] as const;

function RundTaste({ icon, sf, label, onPress, aktiv }: { icon: "close" | "notifications" | "notifications-outline"; sf: "xmark" | "bell.fill" | "bell"; label: string; onPress: () => void; aktiv?: boolean }) {
  return (
    <Pressable
      onPress={() => {
        tippen();
        onPress();
      }}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      {({ pressed }) => (
        <Glas interaktiv style={{ width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", opacity: pressed ? 0.8 : 1 }}>
          <Icon name={icon} sf={sf} size={18} color={aktiv ? "#FFB27A" : "#FFFFFF"} weight="semibold" />
        </Glas>
      )}
    </Pressable>
  );
}

export function LiveAnsicht({
  oben,
  unten,
  aktiv,
  stumm,
  onSchliessen,
}: {
  /** Abstand oben für die Kopfzeile (Gastgeber, LIVE, Zuschauer). */
  oben: number;
  /** Abstand unten für Chat und Eingabe, z. B. über der Tab-Leiste. */
  unten: number;
  /** Verbunden nur, solange die Ansicht wirklich zu sehen ist. */
  aktiv: boolean;
  stumm?: boolean;
  /** Als eigene Seite: Schließen-Knopf oben rechts. */
  onSchliessen?: () => void;
}) {
  const { live, geladen } = useLive();
  const { session } = useKonto();
  const rechte = useClipRechte();
  const ich = session?.user.id ?? null;
  const hinweis = useHinweis();
  const { ausloesen, herzen } = useHerzen();

  const [zugang, setZugang] = useState<LiveZugang | null>(null);
  const [fehler, setFehler] = useState<ZugangFehler | null>(null);
  const [versuch, setVersuch] = useState(0);
  const [warDabei, setWarDabei] = useState(false);
  const [zuschauer, setZuschauer] = useState(0);
  const [bildWeg, setBildWeg] = useState(true);
  const [langeWeg, setLangeWeg] = useState(false);
  const [abo, setAbo] = useState<boolean | null>(null);
  const steuerung = useRef<LiveSteuerung | null>(null);
  const nachrichten = useLiveChat(live?.id ?? null);
  const verbunden = Boolean(live && aktiv && zugang);

  // Zugang zu LiveKit holen, sobald ein Live läuft und die Ansicht zu sehen ist.
  useEffect(() => {
    if (!live?.id || !aktiv) {
      setZugang(null);
      return;
    }
    let laeuft = true;
    setFehler(null);
    liveZugang("zuschauen").then((z) => {
      if (!laeuft) return;
      if ("fehler" in z) setFehler(z.fehler);
      else {
        setZugang(z);
        setWarDabei(true);
      }
    });
    return () => {
      laeuft = false;
    };
  }, [live?.id, aktiv, versuch]);

  useEffect(() => {
    if (ich) liveAboStatus().then(setAbo);
    else setAbo(null);
  }, [ich]);

  // Bildschirm bleibt an, solange man zuschaut.
  useEffect(() => {
    if (!verbunden) return;
    activateKeepAwakeAsync("live").catch(() => {});
    return () => {
      deactivateKeepAwake("live").catch(() => {});
    };
  }, [verbunden]);

  // „Gleich zurück“ erst nach kurzer Pause zeigen – nicht bei jedem Ruckler.
  useEffect(() => {
    if (!bildWeg) {
      setLangeWeg(false);
      return;
    }
    const t = setTimeout(() => setLangeWeg(true), 2500);
    return () => clearTimeout(t);
  }, [bildWeg]);

  const name = live?.gastgeber?.name ?? "Fahrschul Pro";

  async function aboUmschalten() {
    if (!ich) {
      router.push("/anmelden");
      return;
    }
    const neu = !abo;
    try {
      const ergebnis = await liveAboSetzen(neu);
      if (ergebnis === "keine_erlaubnis") {
        dialog("Mitteilungen sind aus", "Erlaube Mitteilungen für Fahrschul Pro in den iPhone-Einstellungen, dann sagen wir dir Bescheid, wenn ein Live startet.");
        return;
      }
      setAbo(ergebnis);
      erfolg();
      hinweis.zeigen(ergebnis ? { icon: "notifications", text: "Wir sagen dir Bescheid, wenn ein Live startet" } : { icon: "notifications-off", text: "Keine Live-Mitteilungen mehr" });
    } catch (e) {
      hinweis.zeigen({ icon: "alert-circle", text: (e as Error).message, farbe: LIVE_ROT });
    }
  }

  async function schreiben(text: string): Promise<boolean> {
    if (!live) return false;
    const problem = await liveSchreiben(live.id, text);
    if (problem) {
      hinweis.zeigen({ icon: "alert-circle", text: problem, farbe: LIVE_ROT });
      return false;
    }
    return true;
  }

  async function langDruck(n: ChatNachricht) {
    if (!ich) return;
    if (n.user_id === ich) {
      const wahl = await auswahlBlatt("Deine Nachricht", [{ text: "Löschen", gefahr: true }]);
      if (wahl === 0) {
        const problem = await liveNachrichtLoeschen(n.id);
        if (problem) hinweis.zeigen({ icon: "alert-circle", text: problem, farbe: LIVE_ROT });
      }
      return;
    }
    const wahl = await auswahlBlatt(`Nachricht von ${n.name}`, [{ text: "Melden", gefahr: true }]);
    if (wahl === 0) {
      const problem = await liveMelden(n.id, "Live-Chat");
      hinweis.zeigen(problem ? { icon: "alert-circle", text: problem, farbe: LIVE_ROT } : { icon: "flag", text: "Danke, wir schauen uns das an" });
    }
  }

  const schliessen = onSchliessen ? (
    <View style={{ position: "absolute", top: oben, right: 14, zIndex: 2 }}>
      <RundTaste icon="close" sf="xmark" label="Schließen" onPress={onSchliessen} />
    </View>
  ) : null;

  // ------------------------------------------------------------- lädt
  if (!geladen || (live && aktiv && !zugang && !fehler)) {
    return (
      <View style={{ flex: 1, backgroundColor: "#000000", alignItems: "center", justifyContent: "center" }}>
        <Lader color="#FFFFFF" />
        {schliessen}
      </View>
    );
  }

  // --------------------------------------------------------- ohne Live
  if (!live || fehler) {
    let titel = warDabei ? "Das Live ist vorbei" : "Gerade ist niemand live";
    let text = warDabei
      ? `Danke fürs Zuschauen! ${name} ist bald wieder da.`
      : rechte.inhaber
        ? "Starte ein Live – alle mit eingeschalteter Mitteilung bekommen Bescheid."
        : "Schalte die Mitteilung ein – dann bekommst du Bescheid, sobald es losgeht.";
    if (fehler === "nicht_eingerichtet") {
      titel = "Live ist noch nicht eingerichtet";
      text = "Sobald der Live-Stream auf dem Server eingerichtet ist, kannst du hier zuschauen.";
    } else if (fehler === "verbindung") {
      titel = "Das Live lädt gerade nicht";
      text = "Prüfe deine Internetverbindung und versuche es nochmal.";
    }
    return (
      <View style={{ flex: 1, backgroundColor: "#000000" }}>
        <LinearGradient colors={["#2A0A12", "#000000"]} locations={[0, 0.7]} style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }} />
        {schliessen}
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 34, paddingTop: oben, paddingBottom: unten, gap: 10 }}>
          <View style={{ width: 84, height: 84, borderRadius: 42, backgroundColor: "rgba(255,45,85,0.12)", alignItems: "center", justifyContent: "center", marginBottom: 8 }}>
            <Icon name="radio-outline" sf="dot.radiowaves.left.and.right" size={36} color={LIVE_ROT} />
          </View>
          <Text style={{ ...schrift.titelFett, fontSize: 22, color: "#FFFFFF", textAlign: "center" }}>{titel}</Text>
          <Text style={{ ...schrift.text, fontSize: 15, lineHeight: 21, color: "#AEB3BA", textAlign: "center" }}>{text}</Text>
          <View style={{ alignSelf: "stretch", gap: 10, marginTop: 18 }}>
            {fehler === "verbindung" ? <Knopf titel="Nochmal versuchen" onPress={() => setVersuch((v) => v + 1)} /> : null}
            {rechte.inhaber && fehler !== "nicht_eingerichtet" ? (
              <Pressable
                onPress={() => {
                  tippen();
                  router.push("/live-senden");
                }}
                accessibilityRole="button"
                accessibilityLabel="Live gehen"
                style={({ pressed }) => [{ transform: [{ scale: pressed ? 0.98 : 1 }] }, leuchten(LIVE_ROT, 0.5, 18, 4)]}
              >
                <LinearGradient colors={LIVE_VERLAUF} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ height: 56, borderRadius: 28, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10 }}>
                  <Icon name="radio" sf="dot.radiowaves.left.and.right" size={21} color="#FFFFFF" />
                  <Text style={{ ...schrift.textFett, fontSize: 17, color: "#FFFFFF" }}>Live gehen</Text>
                </LinearGradient>
              </Pressable>
            ) : null}
            {!rechte.inhaber && fehler !== "nicht_eingerichtet" ? (
              ich ? (
                <Knopf
                  titel={abo ? "Live-Mitteilung ist an" : "Bei Lives Bescheid geben"}
                  icon={abo ? "notifications" : "notifications-outline"}
                  art={abo ? "sekundaer" : undefined}
                  onPress={aboUmschalten}
                />
              ) : (
                <Knopf titel="Anmelden für Live-Mitteilungen" art="sekundaer" onPress={() => router.push("/anmelden")} />
              )
            ) : null}
          </View>
        </View>
        <HinweisAnzeige wert={hinweis.wert} inhalt={hinweis.inhalt} oben={oben + 52} />
      </View>
    );
  }

  // --------------------------------------------------------------- im Live
  return (
    <View style={{ flex: 1, backgroundColor: "#000000" }}>
      {verbunden && zugang ? (
        <LiveBuehne
          url={zugang.url}
          token={zugang.token}
          senden={false}
          stumm={stumm}
          style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
          onZuschauer={setZuschauer}
          onHerz={ausloesen}
          onBildWeg={setBildWeg}
          onSteuerung={(s) => (steuerung.current = s)}
          onVerbindung={(s) => {
            if (s === "fehler") setFehler("verbindung");
          }}
        />
      ) : null}

      {/* Pause des Gastgebers */}
      {langeWeg ? (
        <View pointerEvents="none" style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center", gap: 14, backgroundColor: "rgba(0,0,0,0.55)" }}>
          <LiveRing gastgeber={live.gastgeber} groesse={78} />
          <Text style={{ ...schrift.titelFett, fontSize: 18, color: "#FFFFFF" }}>{name} ist gleich zurück</Text>
        </View>
      ) : null}

      <LinearGradient pointerEvents="none" colors={["rgba(0,0,0,0.55)", "rgba(0,0,0,0)"]} style={{ position: "absolute", top: 0, left: 0, right: 0, height: oben + 100 }} />
      <LinearGradient pointerEvents="none" colors={["rgba(0,0,0,0)", "rgba(0,0,0,0.6)"]} style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: unten + 340 }} />

      {/* Kopf: Gastgeber, LIVE, Zuschauer, Mitteilung, Schließen */}
      <View style={{ position: "absolute", top: oben, left: 12, right: 12, flexDirection: "row", alignItems: "center", gap: 10 }}>
        <Glas style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingLeft: 3, paddingRight: 12, height: 44, borderRadius: 22, flexShrink: 1 }}>
          <LiveRing gastgeber={live.gastgeber} groesse={30} />
          <View style={{ flexShrink: 1 }}>
            <Text style={{ ...schrift.textFett, fontSize: 14, color: "#FFFFFF" }} numberOfLines={1}>
              {name}
            </Text>
            {live.titel ? (
              <Text style={{ ...schrift.textMittel, fontSize: 11.5, color: "rgba(255,255,255,0.75)" }} numberOfLines={1}>
                {live.titel}
              </Text>
            ) : null}
          </View>
        </Glas>
        <LiveSchild />
        <ZuschauerZahl anzahl={zuschauer} />
        <View style={{ flex: 1 }} />
        {ich ? <RundTaste icon={abo ? "notifications" : "notifications-outline"} sf={abo ? "bell.fill" : "bell"} label={abo ? "Live-Mitteilungen aus" : "Bei Lives Bescheid geben"} aktiv={Boolean(abo)} onPress={aboUmschalten} /> : null}
        {onSchliessen ? <RundTaste icon="close" sf="xmark" label="Schließen" onPress={onSchliessen} /> : null}
      </View>

      {/* Chat und Eingabe */}
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ position: "absolute", left: 0, right: 0, bottom: 0 }}>
        <View style={{ paddingHorizontal: 12, paddingBottom: unten, gap: 10 }}>
          <LiveChat nachrichten={nachrichten} gastgeberId={live.gastgeber?.id} onLangDruck={ich ? langDruck : undefined} style={{ maxHeight: 260, marginRight: 64 }} />
          <LiveEingabe
            angemeldet={Boolean(ich)}
            onSenden={schreiben}
            onHerz={() => {
              ausloesen();
              steuerung.current?.herz();
            }}
            onAnmelden={() => router.push("/anmelden")}
            herzen={herzen}
          />
        </View>
      </KeyboardAvoidingView>

      <HinweisAnzeige wert={hinweis.wert} inhalt={hinweis.inhalt} oben={oben + 52} />
    </View>
  );
}
