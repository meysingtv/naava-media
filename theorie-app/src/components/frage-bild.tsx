import { useState } from "react";
import { Image, Modal, Pressable, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Circle, Path } from "react-native-svg";

import type { BildKey, LageKey, LeuchteKey, ThemaId, ZeichenKey } from "@/lib/fragen";
import { themaVon } from "@/lib/fragen";
import { useFarbwelt } from "@/lib/darstellung";
import { FOTOS, strassenFoto, themaFoto } from "@/lib/fotos";
import { tippen } from "@/lib/haptik";
import { farben, schrift } from "@/lib/theme";
import { Glas } from "./glas";
import { DekoSvg } from "./grafik";
import { Icon } from "./icon";
import { T } from "./ui";
import { Lageplan } from "./lagen";
import { Kontrollleuchte } from "./leuchten";
import { Verkehrszeichen } from "./zeichen";

const RUND = 14;

/** Armaturenbrett und Lenkrad als dunkle Silhouette am unteren Bildrand. */
function Cockpit({ breite, hoehe }: { breite: number; hoehe: number }) {
  return (
    <DekoSvg width={breite} height={hoehe} viewBox="0 0 400 250" preserveAspectRatio="none" style={{ position: "absolute", left: 0, top: 0 }}>
      {/* Armaturenbrett */}
      <Path d="M0,200 C80,184 320,184 400,200 L400,250 L0,250 Z" fill="#0A0B0D" />
      <Path d="M0,200 C80,184 320,184 400,200" stroke="rgba(255,255,255,0.10)" strokeWidth={1.4} fill="none" />
      {/* Instrumente */}
      <Circle cx={112} cy={228} r={15} fill="#121418" stroke="rgba(255,255,255,0.16)" strokeWidth={1.2} />
      <Circle cx={160} cy={228} r={15} fill="#121418" stroke="rgba(255,255,255,0.16)" strokeWidth={1.2} />
      <Path d="M104,232 L114,222" stroke={farben.orange} strokeWidth={1.6} strokeLinecap="round" />
      <Path d="M153,233 L163,224" stroke={farben.orange} strokeWidth={1.6} strokeLinecap="round" />
      {/* Lenkrad */}
      <Circle cx={136} cy={300} r={104} stroke="#1A1C20" strokeWidth={17} fill="none" />
      <Circle cx={136} cy={300} r={112.5} stroke="rgba(255,255,255,0.14)" strokeWidth={1.2} fill="none" />
      <Circle cx={136} cy={300} r={95.5} stroke="rgba(0,0,0,0.5)" strokeWidth={1.2} fill="none" />
    </DekoSvg>
  );
}

/** Blick durch die Windschutzscheibe: echtes Straßenfoto, das Zeichen steht rechts am Pfosten. */
function Fahrersicht({ zeichen, breite }: { zeichen: ZeichenKey; breite: number }) {
  const hoehe = Math.round(breite * 0.64);
  const schild = Math.round(breite * 0.25);
  return (
    <View style={{ width: breite, height: hoehe }}>
      <Image source={strassenFoto(zeichen)} style={{ position: "absolute", width: breite, height: hoehe }} resizeMode="cover" />
      <LinearGradient colors={["rgba(0,0,0,0.05)", "rgba(0,0,0,0)", "rgba(0,0,0,0.25)"]} locations={[0, 0.5, 1]} style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }} />
      <View style={{ position: "absolute", right: breite * 0.07, top: hoehe * 0.05, alignItems: "center" }}>
        <Verkehrszeichen zeichen={zeichen} groesse={schild} />
        <View style={{ width: Math.max(4, schild * 0.07), height: hoehe * 0.62, marginTop: -schild * 0.06, borderRadius: 2, backgroundColor: "#B7BBC2" }} />
      </View>
      <Cockpit breite={breite} hoehe={hoehe} />
    </View>
  );
}

/** Kontrollleuchte im dunklen Kombiinstrument. */
function Instrument({ leuchte, breite }: { leuchte: LeuchteKey; breite: number }) {
  const hoehe = Math.round(breite * 0.5);
  return (
    <View style={{ width: breite, height: hoehe, alignItems: "center", justifyContent: "center" }}>
      <Image source={FOTOS.zahlen} style={{ position: "absolute", width: breite, height: hoehe, opacity: 0.35 }} resizeMode="cover" blurRadius={6} />
      <View style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0, backgroundColor: "rgba(5,6,8,0.55)" }} />
      <View style={{ padding: 16, borderRadius: 22, backgroundColor: "rgba(8,9,11,0.85)", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)" }}>
        <Kontrollleuchte leuchte={leuchte} groesse={Math.min(118, hoehe * 0.6)} />
      </View>
    </View>
  );
}

/** Themenfoto als Kopfbild für Fragen ohne eigenes Bild. */
export function ThemaBanner({ thema, breite, punkte }: { thema: ThemaId; breite: number; punkte?: number }) {
  const hoehe = Math.round(breite * 0.42);
  return (
    <View style={{ width: breite, height: hoehe }}>
      <Image source={themaFoto(thema)} style={{ position: "absolute", width: breite, height: hoehe }} resizeMode="cover" />
      <LinearGradient colors={["rgba(11,12,15,0)", "rgba(11,12,15,0.25)", "rgba(11,12,15,0.85)"]} locations={[0, 0.45, 1]} style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }} />
      <View style={{ position: "absolute", left: 14, bottom: 12, right: 14, flexDirection: "row", alignItems: "center", gap: 8 }}>
        <View style={{ paddingHorizontal: 10, height: 26, borderRadius: 13, backgroundColor: "rgba(11,12,15,0.7)", justifyContent: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.14)" }}>
          <T v="klein" farbe={farben.text} style={{ fontSize: 12.5, ...schrift.textHalb }}>
            {themaVon(thema).titel}
          </T>
        </View>
        {punkte ? (
          <View style={{ paddingHorizontal: 10, height: 26, borderRadius: 13, backgroundColor: punkte >= 5 ? farben.orange : "rgba(11,12,15,0.7)", justifyContent: "center" }}>
            <T v="klein" farbe="#FFFFFF" style={{ fontSize: 12.5, ...schrift.textHalb }}>
              {punkte} Punkte
            </T>
          </View>
        ) : null}
      </View>
    </View>
  );
}

/**
 * Bild zu einer Frage – immer im gleichen abgerundeten Rahmen:
 * Zeichen in der Fahrersicht, Lagepläne von oben, Kontrollleuchten im
 * Instrument, sonst das Foto des Themas. `randlos`: ohne eigenen Rahmen, weil
 * das Bild oben in einer Karte sitzt.
 */
export function FrageBild({ bild, thema, punkte, kompakt, randlos }: { bild?: BildKey; thema: ThemaId; punkte?: number; kompakt?: boolean; randlos?: boolean }) {
  const f = useFarbwelt();
  const [breite, setBreite] = useState(0);
  const [gross, setGross] = useState(false);
  const fenster = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const istLage = bild?.startsWith("lage_");
  const istLeuchte = bild?.startsWith("leuchte_");

  const inhaltFuer = (b: number): React.ReactNode => {
    if (b <= 0) return null;
    if (!bild) return <ThemaBanner thema={thema} breite={b} punkte={punkte} />;
    if (istLage) return <Lageplan lage={bild as LageKey} breite={b} />;
    if (istLeuchte) return <Instrument leuchte={bild as LeuchteKey} breite={b} />;
    if (kompakt)
      return (
        <View style={{ width: b, paddingVertical: 14, alignItems: "center" }}>
          <Verkehrszeichen zeichen={bild as ZeichenKey} groesse={96} />
        </View>
      );
    return <Fahrersicht zeichen={bild as ZeichenKey} breite={b} />;
  };

  return (
    <View
      onLayout={(e) => setBreite(Math.round(e.nativeEvent.layout.width))}
      style={{
        borderRadius: randlos ? 0 : RUND,
        overflow: "hidden",
        backgroundColor: istLage ? farben.gelaende : randlos ? "transparent" : f.hell ? f.flaeche2 : farben.flaeche,
        borderWidth: randlos ? 0 : 1,
        borderColor: f.linie,
        minHeight: breite > 0 ? undefined : 180,
      }}
    >
      {inhaltFuer(breite)}
      {bild && !kompakt && breite > 0 ? (
        <Pressable
          onPress={() => {
            tippen();
            setGross(true);
          }}
          accessibilityLabel="Bild vergrößern"
          hitSlop={8}
          style={({ pressed }) => ({ position: "absolute", right: 12, bottom: 12, transform: [{ scale: pressed ? 0.92 : 1 }] })}
        >
          <Glas klar style={{ width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center" }}>
            <Icon name="expand-outline" sf="arrow.up.left.and.arrow.down.right" size={16} color="#FFFFFF" weight="semibold" />
          </Glas>
        </Pressable>
      ) : null}

      <Modal visible={gross} animationType="fade" transparent onRequestClose={() => setGross(false)} supportedOrientations={["portrait", "landscape"]}>
        <Pressable onPress={() => setGross(false)} style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.96)", justifyContent: "center" }}>
          <View style={{ borderRadius: 10, overflow: "hidden", marginHorizontal: 0 }}>{inhaltFuer(fenster.width)}</View>
          <Pressable
            onPress={() => setGross(false)}
            accessibilityLabel="Schließen"
            style={{ position: "absolute", top: insets.top + 8, right: 14, width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.14)", alignItems: "center", justifyContent: "center" }}
          >
            <Icon name="close" size={22} color="#FFFFFF" />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
