import { useEffect, useRef, useState } from "react";
import { Animated, Easing, Linking, Pressable, Text, View, type LayoutChangeEvent } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { deleteAsync } from "expo-file-system/legacy";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { useIsFocused } from "@react-navigation/native";
import { Gesture, GestureDetector, GestureHandlerRootView } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Glas } from "@/components/glas";
import { Icon, type IconName } from "@/components/icon";
import { Lader } from "@/components/lader";
import { Knopf, T } from "@/components/ui";
import { Verkehrszeichen, ZEICHEN_INFO } from "@/components/zeichen";
import type { ZeichenKey } from "@/lib/fragen";
import { useDarstellung } from "@/lib/darstellung";
import { erfolg, fehler, stoss, tippen } from "@/lib/haptik";
import { ALBUM, mittelQuadrat, rahmenImFoto, schildErkennen, schildInfo, XP_JE_SCHILD, XP_QUIZ, type Erkennung } from "@/lib/schilder-jagd";
import { gemischt, useStand } from "@/lib/stand";
import { farben, leuchten, schrift } from "@/lib/theme";

type Quiz = { optionen: string[]; richtig: number };

type Ergebnis =
  | { art: "schild"; key: ZeichenKey; neu: boolean; xp: number; quiz: Quiz | null }
  | { art: "auswahl"; keys: ZeichenKey[] }
  | { art: "keins" }
  | { art: "fehler"; text: string };

/** Nach einem neuen Fund: Was bedeutet das Schild? Drei Antworten aus derselben Gruppe. */
function quizErstellen(key: ZeichenKey): Quiz | null {
  const info = schildInfo(key);
  if (!info) return null;
  const tempo = (k: string) => /^z274_\d{2,3}$/.test(k);
  const andere = ZEICHEN_INFO.filter((z) => z.key !== key && z.gruppe === info.gruppe && z.bedeutung !== info.bedeutung && !(tempo(key) && tempo(z.key)));
  const optionen = gemischt([info.bedeutung, ...gemischt(andere).slice(0, 2).map((z) => z.bedeutung)]);
  return { optionen, richtig: optionen.indexOf(info.bedeutung) };
}

const MASKE = "rgba(0,0,0,0.46)";
/** Breite des Abdunklungs-Rands – groß genug für jeden Bildschirm. */
const RAND_MASKE = 1400;

function zumAlbum() {
  if (router.canGoBack()) router.back();
  else router.replace("/schilder-jagd");
}

function RundTaste({ icon, label, onPress, gross, aktiv }: { icon: IconName; label: string; onPress: () => void; gross?: boolean; aktiv?: boolean }) {
  const g = gross ? 52 : 44;
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
        <Glas interaktiv toenung={aktiv ? "rgba(252,91,14,0.55)" : undefined} style={{ width: g, height: g, borderRadius: g / 2, alignItems: "center", justifyContent: "center", opacity: pressed ? 0.8 : 1 }}>
          <Icon name={icon} size={gross ? 22 : 19} color="#FFFFFF" weight="semibold" />
        </Glas>
      )}
    </Pressable>
  );
}

function Ecke({ lage, farbe }: { lage: "ol" | "or" | "ul" | "ur"; farbe: string }) {
  const oben = lage[0] === "o";
  const links = lage[1] === "l";
  return (
    <View
      pointerEvents="none"
      style={{
        position: "absolute",
        width: 38,
        height: 38,
        top: oben ? -3 : undefined,
        bottom: oben ? undefined : -3,
        left: links ? -3 : undefined,
        right: links ? undefined : -3,
        borderColor: farbe,
        borderTopWidth: oben ? 4 : 0,
        borderBottomWidth: oben ? 0 : 4,
        borderLeftWidth: links ? 4 : 0,
        borderRightWidth: links ? 0 : 4,
        borderTopLeftRadius: oben && links ? 24 : 0,
        borderTopRightRadius: oben && !links ? 24 : 0,
        borderBottomLeftRadius: !oben && links ? 24 : 0,
        borderBottomRightRadius: !oben && !links ? 24 : 0,
      }}
    />
  );
}

function Hinweis({ icon, titel, text, children }: { icon: IconName; titel: string; text: string; children?: React.ReactNode }) {
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 34, gap: 10 }}>
      <View style={{ width: 76, height: 76, borderRadius: 38, backgroundColor: "rgba(255,255,255,0.06)", alignItems: "center", justifyContent: "center", marginBottom: 6 }}>
        <Icon name={icon} size={32} color={farben.orange} />
      </View>
      <Text style={{ ...schrift.titelFett, fontSize: 21, color: "#FFFFFF", textAlign: "center" }}>{titel}</Text>
      <Text style={{ ...schrift.text, fontSize: 15, lineHeight: 21, color: "#AEB3BA", textAlign: "center" }}>{text}</Text>
      {children ? <View style={{ alignSelf: "stretch", gap: 10, marginTop: 14 }}>{children}</View> : null}
    </View>
  );
}

export default function SchildScanner() {
  const insets = useSafeAreaInsets();
  const fokus = useIsFocused();
  const { stand, schildGefunden, bonus } = useStand();
  const [erlaubnis, erlaubnisAnfragen] = useCameraPermissions();
  const kamera = useRef<CameraView>(null);
  const [flaeche, setFlaeche] = useState({ breite: 0, hoehe: 0 });
  const [bereit, setBereit] = useState(false);
  const [kameraFehler, setKameraFehler] = useState<string | null>(null);
  const [laeuft, setLaeuft] = useState(false);
  const [ergebnis, setErgebnis] = useState<Ergebnis | null>(null);
  const [licht, setLicht] = useState(false);
  const [quizWahl, setQuizWahl] = useState<number | null>(null);
  const [zoom, setZoom] = useState(0);
  const zoomStart = useRef(0);
  const linie = useRef(new Animated.Value(0)).current;
  const karte = useRef(new Animated.Value(0)).current;

  const gefunden = ALBUM.filter((k) => stand.schilder[k]).length;

  // Sucherrahmen: mittig, etwas über der Bildschirmmitte.
  const groesse = Math.round(Math.min(flaeche.breite * 0.74, flaeche.hoehe * 0.42));
  const rahmen = { x: Math.round((flaeche.breite - groesse) / 2), y: Math.round(flaeche.hoehe * 0.44 - groesse / 2), groesse };

  // Scan-Linie, solange ausgewertet wird.
  useEffect(() => {
    if (!laeuft) {
      linie.stopAnimation();
      linie.setValue(0);
      return;
    }
    const schleife = Animated.loop(
      Animated.sequence([
        Animated.timing(linie, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(linie, { toValue: 0, duration: 900, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]),
    );
    schleife.start();
    return () => schleife.stop();
  }, [laeuft, linie]);

  // Ergebnis-Karte einblenden.
  useEffect(() => {
    setQuizWahl(null);
    karte.setValue(0);
    if (ergebnis) Animated.spring(karte, { toValue: 1, useNativeDriver: true, damping: 18, stiffness: 190 }).start();
  }, [ergebnis, karte]);

  function verbuchen(key: ZeichenKey) {
    const { neu, xp } = schildGefunden(key, XP_JE_SCHILD);
    erfolg();
    setErgebnis({ art: "schild", key, neu, xp, quiz: neu ? quizErstellen(key) : null });
  }

  function auswerten(e: Erkennung) {
    if (e.key) {
      verbuchen(e.key);
    } else if (e.vorschlaege.length > 0) {
      tippen();
      setErgebnis({ art: "auswahl", keys: e.vorschlaege });
    } else {
      fehler();
      setErgebnis({ art: "keins" });
    }
  }

  function quizAntwort(i: number) {
    if (quizWahl != null || ergebnis?.art !== "schild" || !ergebnis.quiz) return;
    setQuizWahl(i);
    if (i === ergebnis.quiz.richtig) {
      erfolg();
      bonus(XP_QUIZ);
    } else {
      fehler();
    }
  }

  async function scannen() {
    if (laeuft || !kamera.current || !bereit) return;
    stoss();
    setErgebnis(null);
    setLaeuft(true);
    let uri: string | null = null;
    try {
      const foto = await kamera.current.takePictureAsync({ quality: 0.85, shutterSound: false, exif: false });
      if (!foto) throw new Error("Kein Foto erhalten.");
      uri = foto.uri;
      auswerten(await schildErkennen(foto.uri, rahmenImFoto({ breite: foto.width, hoehe: foto.height }, flaeche, rahmen)));
    } catch (e) {
      setErgebnis({ art: "fehler", text: (e as Error).message });
    } finally {
      setLaeuft(false);
      // Fotos werden nicht aufbewahrt.
      if (uri && uri.startsWith("file:")) deleteAsync(uri, { idempotent: true }).catch(() => {});
    }
  }

  async function ausMediathek() {
    if (laeuft) return;
    try {
      const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsEditing: true, aspect: [1, 1], quality: 1 });
      if (r.canceled || !r.assets?.[0]) return;
      const a = r.assets[0];
      setErgebnis(null);
      setLaeuft(true);
      auswerten(await schildErkennen(a.uri, mittelQuadrat(a.width, a.height)));
    } catch (e) {
      setErgebnis({ art: "fehler", text: (e as Error).message });
    } finally {
      setLaeuft(false);
    }
  }

  const zwicken = Gesture.Pinch()
    .runOnJS(true)
    .onStart(() => {
      zoomStart.current = zoom;
    })
    .onUpdate((e) => {
      setZoom(Math.max(0, Math.min(0.75, zoomStart.current + Math.log2(Math.max(0.01, e.scale)) / 4)));
    });

  const oben = (
    <View style={{ position: "absolute", top: insets.top + 6, left: 16, right: 16, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
      <RundTaste icon="close" label="Schließen" onPress={zumAlbum} />
      <Glas style={{ height: 36, borderRadius: 18, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", gap: 7 }}>
        <Icon name="scan" size={15} color={farben.orange} weight="semibold" />
        <Text style={{ ...schrift.textHalb, fontSize: 14, color: "#FFFFFF", fontVariant: ["tabular-nums"] }}>
          {gefunden} / {ALBUM.length} gefunden
        </Text>
      </Glas>
      {erlaubnis?.granted && !kameraFehler ? <RundTaste icon={licht ? "flashlight" : "flashlight-outline"} label={licht ? "Licht aus" : "Licht an"} aktiv={licht} onPress={() => setLicht(!licht)} /> : <View style={{ width: 44 }} />}
    </View>
  );

  if (!erlaubnis) {
    return (
      <View style={{ flex: 1, backgroundColor: "#000000", alignItems: "center", justifyContent: "center" }}>
        <Lader color="#FFFFFF" />
      </View>
    );
  }

  if (!erlaubnis.granted) {
    return (
      <View style={{ flex: 1, backgroundColor: farben.grund }}>
        <Hinweis
          icon="camera-outline"
          titel="Kamera für die Schilder-Jagd"
          text="Damit du echte Verkehrsschilder scannen kannst, braucht Fahrschul Pro die Kamera. Die Fotos werden nur auf deinem Handy ausgewertet und nicht gespeichert."
        >
          {erlaubnis.canAskAgain ? (
            <Knopf titel="Kamera erlauben" icon="camera" onPress={() => erlaubnisAnfragen()} />
          ) : (
            <Knopf titel="Einstellungen öffnen" icon="settings-outline" onPress={() => Linking.openSettings()} />
          )}
          <Knopf titel="Foto aus der Mediathek" art="sekundaer" icon="image-outline" onPress={ausMediathek} />
        </Hinweis>
        {oben}
        {laeuft || ergebnis ? (
          <ErgebnisKarte ergebnis={ergebnis} laeuft={laeuft} karte={karte} unten={insets.bottom} onWeiter={() => setErgebnis(null)} onBestaetigen={verbuchen} quizWahl={quizWahl} onQuiz={quizAntwort} />
        ) : null}
      </View>
    );
  }

  const eckFarbe = ergebnis?.art === "schild" ? farben.gruen : farben.orange;

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: "#000000" }}>
      <GestureDetector gesture={zwicken}>
        <View style={{ flex: 1 }} onLayout={(e: LayoutChangeEvent) => setFlaeche({ breite: e.nativeEvent.layout.width, hoehe: e.nativeEvent.layout.height })}>
          <CameraView
            ref={kamera}
            style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
            facing="back"
            active={fokus}
            zoom={zoom}
            enableTorch={licht}
            animateShutter={false}
            onCameraReady={() => setBereit(true)}
            onMountError={(e) => setKameraFehler(e.message)}
          />

          {flaeche.breite > 0 ? (
            <>
              {/* Abdunklung um den Rahmen – mit runden Ecken ausgespart */}
              <View
                pointerEvents="none"
                style={{
                  position: "absolute",
                  top: rahmen.y - RAND_MASKE,
                  left: rahmen.x - RAND_MASKE,
                  width: groesse + RAND_MASKE * 2,
                  height: groesse + RAND_MASKE * 2,
                  borderWidth: RAND_MASKE,
                  borderRadius: RAND_MASKE + 22,
                  borderColor: MASKE,
                }}
              />

              <View pointerEvents="none" style={{ position: "absolute", top: rahmen.y, left: rahmen.x, width: groesse, height: groesse }}>
                <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, borderRadius: 22, overflow: "hidden" }}>
                  {laeuft ? (
                    <Animated.View
                      style={{
                        position: "absolute",
                        left: 10,
                        right: 10,
                        height: 3,
                        borderRadius: 2,
                        backgroundColor: farben.orange,
                        ...leuchten(farben.orange, 0.9, 10, 0),
                        transform: [{ translateY: linie.interpolate({ inputRange: [0, 1], outputRange: [10, groesse - 12] }) }],
                      }}
                    />
                  ) : null}
                  {kameraFehler ? (
                    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 22, gap: 8 }}>
                      <Icon name="camera-outline" size={28} color="#FFFFFF" />
                      <Text style={{ ...schrift.textHalb, fontSize: 15, color: "#FFFFFF", textAlign: "center" }}>Kamera nicht verfügbar</Text>
                      <Text style={{ ...schrift.text, fontSize: 13, lineHeight: 18, color: "#C9CDD2", textAlign: "center" }}>Im Simulator gibt es keine Kamera – wähle unten ein Foto aus der Mediathek.</Text>
                    </View>
                  ) : null}
                </View>
                <Ecke lage="ol" farbe={eckFarbe} />
                <Ecke lage="or" farbe={eckFarbe} />
                <Ecke lage="ul" farbe={eckFarbe} />
                <Ecke lage="ur" farbe={eckFarbe} />
              </View>

              {!ergebnis ? (
                <View pointerEvents="none" style={{ position: "absolute", top: rahmen.y + groesse + 18, left: 24, right: 24, alignItems: "center", gap: 4 }}>
                  <Text style={{ ...schrift.textHalb, fontSize: 16, color: "#FFFFFF", textAlign: "center", textShadowColor: "rgba(0,0,0,0.6)", textShadowRadius: 6 }}>
                    {laeuft ? "Schild wird erkannt …" : "Halte ein Verkehrsschild in den Rahmen"}
                  </Text>
                  {!laeuft ? (
                    <Text style={{ ...schrift.text, fontSize: 13, color: "#D3D7DC", textAlign: "center", textShadowColor: "rgba(0,0,0,0.6)", textShadowRadius: 6 }}>
                      Näher ran oder mit zwei Fingern zoomen
                    </Text>
                  ) : null}
                </View>
              ) : null}
            </>
          ) : null}

          {oben}

          {/* Bedienung unten */}
          {!ergebnis ? (
            <View style={{ position: "absolute", left: 0, right: 0, bottom: insets.bottom + 22, flexDirection: "row", alignItems: "center", justifyContent: "space-evenly" }}>
              <View style={{ alignItems: "center", gap: 6, width: 70 }}>
                <RundTaste icon="image-outline" label="Foto aus der Mediathek" gross onPress={ausMediathek} />
                <Text style={{ ...schrift.textMittel, fontSize: 12, color: "#E4E7EA" }}>Foto</Text>
              </View>
              <Pressable
                onPress={scannen}
                disabled={laeuft || !bereit || !!kameraFehler}
                accessibilityRole="button"
                accessibilityLabel="Schild scannen"
                style={({ pressed }) => ({
                  width: 80,
                  height: 80,
                  borderRadius: 40,
                  borderWidth: 4,
                  borderColor: "#FFFFFF",
                  alignItems: "center",
                  justifyContent: "center",
                  opacity: !bereit || kameraFehler ? 0.45 : 1,
                  transform: [{ scale: pressed ? 0.93 : 1 }],
                })}
              >
                <View style={{ width: 62, height: 62, borderRadius: 31, backgroundColor: farben.orange, alignItems: "center", justifyContent: "center" }}>
                  {laeuft ? <Lader color="#FFFFFF" /> : <Icon name="scan" size={26} color="#FFFFFF" weight="semibold" />}
                </View>
              </Pressable>
              <View style={{ alignItems: "center", gap: 6, width: 70 }}>
                <RundTaste icon="grid-outline" label="Zum Album" gross onPress={zumAlbum} />
                <Text style={{ ...schrift.textMittel, fontSize: 12, color: "#E4E7EA" }}>Album</Text>
              </View>
            </View>
          ) : (
            <ErgebnisKarte ergebnis={ergebnis} laeuft={false} karte={karte} unten={insets.bottom} onWeiter={() => setErgebnis(null)} onBestaetigen={verbuchen} quizWahl={quizWahl} onQuiz={quizAntwort} />
          )}
        </View>
      </GestureDetector>
    </GestureHandlerRootView>
  );
}

function ErgebnisKarte({
  ergebnis,
  laeuft,
  karte,
  unten,
  onWeiter,
  onBestaetigen,
  quizWahl,
  onQuiz,
}: {
  ergebnis: Ergebnis | null;
  laeuft: boolean;
  karte: Animated.Value;
  unten: number;
  onWeiter: () => void;
  onBestaetigen: (key: ZeichenKey) => void;
  quizWahl: number | null;
  onQuiz: (i: number) => void;
}) {
  const info = ergebnis?.art === "schild" ? schildInfo(ergebnis.key) : undefined;
  const { belohnungen } = useDarstellung();
  return (
    <Animated.View
      style={{
        position: "absolute",
        left: 12,
        right: 12,
        bottom: unten + 12,
        padding: 20,
        gap: 14,
        borderRadius: 28,
        backgroundColor: "rgba(13,19,23,0.97)",
        borderWidth: 1,
        borderColor: ergebnis?.art === "schild" && ergebnis.neu ? farben.orangeLinie : farben.linieStark,
        opacity: laeuft ? 1 : karte,
        transform: [{ translateY: laeuft ? 0 : karte.interpolate({ inputRange: [0, 1], outputRange: [60, 0] }) }],
      }}
    >
      {laeuft ? (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 6 }}>
          <Lader color={farben.orange} />
          <T v="textStark">Schild wird erkannt …</T>
        </View>
      ) : ergebnis?.art === "schild" && info ? (
        <>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
            <Verkehrszeichen zeichen={ergebnis.key} groesse={74} />
            <View style={{ flex: 1, gap: 5 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Icon name={ergebnis.neu ? "sparkles" : "checkmark-circle"} size={14} color={ergebnis.neu ? farben.orange : farben.gruen} weight="semibold" />
                <T v="mini" farbe={ergebnis.neu ? farben.orange : farben.gruen}>
                  {ergebnis.neu ? (belohnungen ? `Neu im Album · +${ergebnis.xp} XP` : "Neu im Album") : "Schon in deinem Album"}
                </T>
              </View>
              <T v="h2">{info.name}</T>
            </View>
          </View>
          {ergebnis.quiz ? (
            <View style={{ gap: 8 }}>
              <T v="textStark">
                {quizWahl == null
                  ? belohnungen
                    ? `Weißt du, was es bedeutet? (+${XP_QUIZ} XP)`
                    : "Weißt du, was es bedeutet?"
                  : quizWahl === ergebnis.quiz.richtig
                    ? belohnungen
                      ? `Richtig! +${XP_QUIZ} XP`
                      : "Richtig!"
                    : "Nicht ganz – richtig ist die grüne Antwort."}
              </T>
              {ergebnis.quiz.optionen.map((text, i) => {
                const aufgedeckt = quizWahl != null;
                const richtig = i === ergebnis.quiz!.richtig;
                const gewaehlt = i === quizWahl;
                const farbe = aufgedeckt && richtig ? farben.gruen : aufgedeckt && gewaehlt ? farben.rot : null;
                return (
                  <Pressable
                    key={i}
                    disabled={aufgedeckt}
                    onPress={() => onQuiz(i)}
                    style={({ pressed }) => ({
                      paddingHorizontal: 14,
                      paddingVertical: 10,
                      borderRadius: 14,
                      borderWidth: 1.5,
                      borderColor: farbe ?? farben.linieStark,
                      backgroundColor: farbe === farben.gruen ? farben.gruenSoft : farbe === farben.rot ? farben.rotSoft : pressed ? farben.flaeche2 : "transparent",
                      opacity: aufgedeckt && !richtig && !gewaehlt ? 0.5 : 1,
                    })}
                  >
                    <Text style={{ ...schrift.textMittel, fontSize: 14, lineHeight: 19, color: "#FFFFFF" }}>{text}</Text>
                  </Pressable>
                );
              })}
            </View>
          ) : (
            <T v="text">{info.bedeutung}</T>
          )}
          <View style={{ flexDirection: "row", gap: 10 }}>
            <Knopf titel="Album" art="sekundaer" onPress={zumAlbum} style={{ flex: 1 }} />
            <Knopf titel="Weiter scannen" onPress={onWeiter} style={{ flex: 1.5 }} />
          </View>
        </>
      ) : ergebnis?.art === "auswahl" ? (
        <>
          <View style={{ gap: 4 }}>
            <T v="mini" farbe={farben.gelb}>
              Nicht ganz sicher
            </T>
            <T v="h2">{ergebnis.keys.length > 1 ? "Welches Schild ist es?" : "Ist es dieses Schild?"}</T>
          </View>
          <View style={{ flexDirection: "row", gap: 10 }}>
            {ergebnis.keys.map((key) => {
              const z = schildInfo(key);
              return (
                <Pressable
                  key={key}
                  onPress={() => onBestaetigen(key)}
                  accessibilityLabel={`${z?.name ?? key} auswählen`}
                  style={({ pressed }) => ({
                    flex: 1,
                    alignItems: "center",
                    gap: 8,
                    paddingVertical: 12,
                    paddingHorizontal: 8,
                    borderRadius: 18,
                    borderWidth: 1.5,
                    borderColor: farben.orangeLinie,
                    backgroundColor: pressed ? farben.orangeSoft : farben.flaeche2,
                  })}
                >
                  <Verkehrszeichen zeichen={key} groesse={66} />
                  <Text numberOfLines={2} style={{ ...schrift.textHalb, fontSize: 13, lineHeight: 17, color: "#FFFFFF", textAlign: "center" }}>
                    {z?.kurz ?? z?.name}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <T v="klein" style={{ fontSize: 13, lineHeight: 18 }}>
            Tippe auf das passende Schild. Keins davon? Geh etwas näher ran und scanne nochmal.
          </T>
          <Knopf titel="Keins davon" art="sekundaer" onPress={onWeiter} />
        </>
      ) : (
        <>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
            <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: "rgba(255,255,255,0.07)", alignItems: "center", justifyContent: "center" }}>
              <Icon name="help-circle-outline" size={26} color="#FFFFFF" />
            </View>
            <View style={{ flex: 1, gap: 3 }}>
              <T v="h2">{ergebnis?.art === "fehler" ? "Das hat nicht geklappt" : "Kein Schild erkannt"}</T>
              <T v="klein" style={{ fontSize: 13.5, lineHeight: 18 }}>
                {ergebnis?.art === "fehler"
                  ? ergebnis.text
                  : "Halte das Schild mittig in den Rahmen, so dass es ihn gut ausfüllt – näher rangehen oder mit zwei Fingern zoomen."}
              </T>
            </View>
          </View>
          <Knopf titel="Nochmal" icon="refresh" onPress={onWeiter} />
        </>
      )}
    </Animated.View>
  );
}
