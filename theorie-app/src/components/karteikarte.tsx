import { useEffect, useRef, useState, type ReactNode } from "react";
import { Animated, Easing, Modal, Pressable, ScrollView, View, useWindowDimensions, type StyleProp, type ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { FrageBild } from "@/components/frage-bild";
import { Icon, type IconName } from "@/components/icon";
import { getoent, T } from "@/components/ui";
import { Verkehrszeichen } from "@/components/zeichen";
import { istZeichen, themaVon, zahlText, type ZeichenKey } from "@/lib/fragen";
import { tippen } from "@/lib/haptik";
import { GRUPPE_TITEL, karteInhalt, type KartenInhalt } from "@/lib/karteikarten";
import { KARTEN_ABSTAENDE, useStand } from "@/lib/stand";
import { farben, schrift } from "@/lib/theme";

type Seite = "vorne" | "hinten";

/** Oben links auf der Karte: woher sie kommt. */
function herkunft(inhalt: KartenInhalt): { icon: IconName; text: string } {
  if (inhalt.art === "frage") return { icon: themaVon(inhalt.frage.thema).icon as IconName, text: themaVon(inhalt.frage.thema).titel };
  if (inhalt.art === "zeichen") return { icon: "warning-outline", text: GRUPPE_TITEL[inhalt.info.gruppe] };
  return { icon: "create-outline", text: "Eigene Karte" };
}

/** Lernfach als Punkte (1–5) – oder „Neu“. */
export function FachPunkte({ fach, klein }: { fach: number | null; klein?: boolean }) {
  if (fach == null) {
    return (
      <View style={{ paddingHorizontal: 8, height: 20, borderRadius: 10, backgroundColor: farben.orangeSoft, justifyContent: "center" }}>
        <T v="mini" farbe={farben.orange} style={{ fontSize: 10, letterSpacing: 0.6 }}>
          Neu
        </T>
      </View>
    );
  }
  const d = klein ? 6 : 7;
  return (
    <View style={{ flexDirection: "row", gap: klein ? 3 : 4 }} accessibilityLabel={`Fach ${fach} von ${KARTEN_ABSTAENDE.length - 1}`}>
      {Array.from({ length: KARTEN_ABSTAENDE.length - 1 }, (_, i) => (
        <View key={i} style={{ width: d, height: d, borderRadius: d / 2, backgroundColor: i < fach ? farben.orange : farben.flaeche3 }} />
      ))}
    </View>
  );
}

/** `eng`: wenig Platz (kleines Handy) – Bild und Schrift etwas kleiner, damit alles auf die Karte passt. */
function Vorderseite({ inhalt, eng }: { inhalt: KartenInhalt; eng: boolean }) {
  if (inhalt.art === "zeichen") {
    return (
      <View style={{ alignItems: "center", gap: 18 }}>
        <Verkehrszeichen zeichen={inhalt.info.key} groesse={eng ? 124 : 148} />
        <T v="text" farbe={farben.text3} zentriert>
          Was bedeutet dieses Zeichen?
        </T>
      </View>
    );
  }
  if (inhalt.art === "eigen") {
    const lang = inhalt.vorne.length > 110;
    return (
      <View style={{ alignItems: "center", gap: 18 }}>
        {inhalt.zeichen ? <Verkehrszeichen zeichen={inhalt.zeichen} groesse={eng ? 96 : 120} /> : null}
        <T v="h2" zentriert style={{ fontSize: lang ? 18 : 22, lineHeight: lang ? 25 : 29 }}>
          {inhalt.vorne}
        </T>
      </View>
    );
  }
  const { frage } = inhalt;
  const thema = themaVon(frage.thema);
  const lang = frage.text.length > 80;
  return (
    <View style={{ gap: eng ? 14 : 18 }}>
      {istZeichen(frage.bild) ? (
        <View style={{ alignItems: "center" }}>
          <Verkehrszeichen zeichen={frage.bild as ZeichenKey} groesse={eng ? 100 : 124} />
        </View>
      ) : frage.bild ? (
        <View style={{ alignSelf: "center", width: eng ? "72%" : "100%" }}>
          <FrageBild bild={frage.bild} thema={frage.thema} kompakt />
        </View>
      ) : (
        <View style={{ alignItems: "center" }}>
          <View style={{ width: 58, height: 58, borderRadius: 29, backgroundColor: farben.orangeSoft, alignItems: "center", justifyContent: "center" }}>
            <Icon name={thema.icon as IconName} size={28} color={farben.orange} />
          </View>
        </View>
      )}
      <T v="h2" zentriert style={{ fontSize: lang ? (eng ? 17 : 19) : 21, lineHeight: lang ? (eng ? 23 : 25) : 28 }}>
        {frage.text}
      </T>
    </View>
  );
}

function Merke({ text }: { text: string }) {
  return (
    <View style={{ flexDirection: "row", gap: 10, padding: 13, borderRadius: 14, backgroundColor: farben.flaeche2 }}>
      <Icon name="bulb" size={18} color={farben.gelb} style={{ marginTop: 1 }} />
      <View style={{ flex: 1, gap: 2 }}>
        <T v="mini" farbe={farben.gelb} style={{ fontSize: 10.5 }}>
          Merke
        </T>
        <T v="text" farbe={farben.text2} style={{ fontSize: 15, lineHeight: 21 }}>
          {text}
        </T>
      </View>
    </View>
  );
}

function Rueckseite({ inhalt }: { inhalt: KartenInhalt }) {
  if (inhalt.art === "zeichen") {
    const { info } = inhalt;
    return (
      <View style={{ gap: 16 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
          <Verkehrszeichen zeichen={info.key} groesse={62} />
          <View style={{ flex: 1, gap: 2 }}>
            <T v="h2" style={{ fontSize: 21, lineHeight: 26 }}>
              {info.name}
            </T>
            <T v="klein">{GRUPPE_TITEL[info.gruppe]}</T>
          </View>
        </View>
        <T v="text" farbe={farben.text} style={{ fontSize: 17, lineHeight: 24 }}>
          {info.bedeutung}
        </T>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <Icon name="location-outline" size={16} color={farben.text3} style={{ marginTop: 2 }} />
          <T v="klein" style={{ flex: 1, fontSize: 13.5, lineHeight: 19 }}>
            {info.fundort}
          </T>
        </View>
      </View>
    );
  }
  if (inhalt.art === "eigen") {
    const lang = inhalt.hinten.length > 140;
    return (
      <T v="h2" zentriert style={{ ...schrift.titelHalb, fontSize: lang ? 17 : 20, lineHeight: lang ? 24 : 28 }}>
        {inhalt.hinten}
      </T>
    );
  }
  const { frage } = inhalt;
  const richtige = frage.art === "auswahl" ? frage.antworten.filter((a) => a.richtig) : [];
  return (
    <View style={{ gap: 18 }}>
      <View style={{ gap: 10 }}>
        <T v="mini" farbe={farben.gruen}>
          {frage.art === "zahl" ? "Lösung" : richtige.length > 1 ? "Richtige Antworten" : "Richtige Antwort"}
        </T>
        {frage.art === "zahl" ? (
          <T v="display" farbe={farben.gruen} style={{ fontSize: 40, lineHeight: 46 }}>
            {zahlText(frage.loesung)} {frage.einheit}
          </T>
        ) : (
          richtige.map((a, i) => (
            <View key={i} style={{ flexDirection: "row", gap: 11 }}>
              <View style={{ width: 22, height: 22, borderRadius: 11, marginTop: 1, backgroundColor: farben.gruen, alignItems: "center", justifyContent: "center" }}>
                <Icon name="checkmark" size={14} color={farben.aufOrange} />
              </View>
              <T v="textStark" style={{ flex: 1, fontSize: 17, lineHeight: 23 }}>
                {a.text}
              </T>
            </View>
          ))
        )}
      </View>
      <Merke text={frage.erklaerung} />
    </View>
  );
}

/**
 * Karteikarte mit echtem Umdrehen: erst zur Kante drehen, Seite tauschen,
 * von der anderen Kante zurück. Klappt ohne backfaceVisibility – also auch
 * auf Android und im Web.
 */
export function FlipKarte({
  inhalt,
  umgedreht,
  onDruck,
  fach,
  style,
}: {
  inhalt: KartenInhalt;
  umgedreht: boolean;
  onDruck?: () => void;
  /** Lernfach für die Punkte oben rechts; null = neu, undefined = ausblenden. */
  fach?: number | null;
  style?: StyleProp<ViewStyle>;
}) {
  const [seite, setSeite] = useState<Seite>(umgedreht ? "hinten" : "vorne");
  const dreh = useRef(new Animated.Value(0)).current;
  const ziel = useRef(umgedreht);
  const erst = useRef(true);

  useEffect(() => {
    ziel.current = umgedreht;
    if (erst.current) {
      erst.current = false;
      return;
    }
    dreh.stopAnimation();
    Animated.timing(dreh, { toValue: 1, duration: 130, easing: Easing.in(Easing.quad), useNativeDriver: true }).start(({ finished }) => {
      if (!finished) return;
      setSeite(ziel.current ? "hinten" : "vorne");
      dreh.setValue(-1);
      Animated.timing(dreh, { toValue: 0, duration: 190, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
    });
  }, [umgedreht, dreh]);

  const [hoehe, setHoehe] = useState(0);
  const h = herkunft(inhalt);
  const hinten = seite === "hinten";

  return (
    <Pressable
      onPress={
        onDruck
          ? () => {
              tippen();
              onDruck();
            }
          : undefined
      }
      disabled={!onDruck}
      accessibilityRole="button"
      accessibilityLabel={hinten ? "Karte umdrehen, Vorderseite zeigen" : "Karte umdrehen, Antwort zeigen"}
      style={style}
    >
      <Animated.View
        onLayout={(e) => setHoehe(Math.round(e.nativeEvent.layout.height))}
        style={{
          flex: 1,
          borderRadius: 24,
          overflow: "hidden",
          backgroundColor: farben.flaeche,
          borderWidth: 1,
          borderColor: hinten ? getoent(farben.gruen, 0.35) : farben.linieStark,
          transform: [
            { perspective: 1100 },
            { rotateY: dreh.interpolate({ inputRange: [-1, 0, 1], outputRange: ["-90deg", "0deg", "90deg"] }) },
            { scale: dreh.interpolate({ inputRange: [-1, 0, 1], outputRange: [0.94, 1, 0.94] }) },
          ],
        }}
      >
        <LinearGradient
          colors={hinten ? [getoent(farben.gruen, 0.08), getoent(farben.gruen, 0)] : ["transparent", "transparent"]}
          locations={[0, 0.55]}
          style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
          pointerEvents="none"
        />
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10, paddingHorizontal: 18, paddingTop: 16 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flexShrink: 1 }}>
            <Icon name={hinten ? "checkmark-circle" : h.icon} size={15} color={hinten ? farben.gruen : farben.text3} />
            <T v="klein" farbe={hinten ? farben.gruen : farben.text3} numberOfLines={1} style={{ ...schrift.textHalb, flexShrink: 1 }}>
              {hinten ? "Antwort" : h.text}
            </T>
          </View>
          {fach !== undefined ? <FachPunkte fach={fach} /> : null}
        </View>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ flexGrow: 1, justifyContent: "center", paddingHorizontal: 20, paddingVertical: 18 }}
          showsVerticalScrollIndicator={false}
        >
          {hinten ? <Rueckseite inhalt={inhalt} /> : <Vorderseite inhalt={inhalt} eng={hoehe > 0 && hoehe < 480} />}
        </ScrollView>
        {onDruck ? (
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingBottom: 14 }}>
            <Icon name="sync-outline" sf="arrow.triangle.2.circlepath" size={13} color={farben.text4} />
            <T v="klein" farbe={farben.text4} style={{ fontSize: 12.5 }}>
              Tippen zum Umdrehen
            </T>
          </View>
        ) : null}
      </Animated.View>
    </Pressable>
  );
}

/** Karte groß ansehen und umdrehen – mit eigenen Aktionen darunter. */
export function KartenVorschau({ id, onSchliessen, children }: { id: string | null; onSchliessen: () => void; children?: ReactNode }) {
  const { stand } = useStand();
  const insets = useSafeAreaInsets();
  const fenster = useWindowDimensions();
  const [umgedreht, setUmgedreht] = useState(false);
  const inhalt = id ? karteInhalt(stand, id) : null;
  const fach = id ? stand.karteikarten.faecher[id]?.fach ?? null : null;

  useEffect(() => {
    if (id) setUmgedreht(false);
  }, [id]);

  return (
    <Modal visible={Boolean(id && inhalt)} animationType="fade" transparent onRequestClose={onSchliessen}>
      <View style={{ flex: 1, backgroundColor: farben.grund, paddingTop: insets.top + 8, paddingBottom: insets.bottom + 16, paddingHorizontal: 16 }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", minHeight: 44 }}>
          <T v="h3">Karteikarte</T>
          <Pressable
            onPress={onSchliessen}
            accessibilityLabel="Schließen"
            hitSlop={8}
            style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: farben.flaeche2, alignItems: "center", justifyContent: "center" }}
          >
            <Icon name="close" size={20} color={farben.text} />
          </Pressable>
        </View>
        <View style={{ flex: 1, justifyContent: "center", paddingVertical: 12 }}>
          {inhalt ? (
            <FlipKarte
              key={inhalt.id}
              inhalt={inhalt}
              umgedreht={umgedreht}
              onDruck={() => setUmgedreht((u) => !u)}
              fach={fach}
              style={{ height: Math.min(560, fenster.height * 0.64) }}
            />
          ) : null}
        </View>
        {children ? <View style={{ flexDirection: "row", gap: 10 }}>{children}</View> : null}
      </View>
    </Modal>
  );
}
