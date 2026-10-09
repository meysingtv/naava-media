import { useState } from "react";
import { Modal, Pressable, ScrollView, Text, View, type ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CameraIcon } from "phosphor-react-native/src/icons/Camera";
import { CaretRightIcon } from "phosphor-react-native/src/icons/CaretRight";
import { CheckCircleIcon } from "phosphor-react-native/src/icons/CheckCircle";
import { CrosshairIcon } from "phosphor-react-native/src/icons/Crosshair";
import { LockSimpleIcon } from "phosphor-react-native/src/icons/LockSimple";
import { MapPinIcon } from "phosphor-react-native/src/icons/MapPin";
import { ShieldWarningIcon } from "phosphor-react-native/src/icons/ShieldWarning";
import { TargetIcon } from "phosphor-react-native/src/icons/Target";
import { TrophyIcon } from "phosphor-react-native/src/icons/Trophy";

import { useFenster } from "@/lib/fenster";
import { GlasGrund, GlasKarte } from "@/components/glas-flaeche";
import { GrossKopf, Seite } from "@/components/seite";
import { Knopf, Segment, T } from "@/components/ui";
import { Verkehrszeichen, ZEICHEN_INFO, type ZeichenInfo } from "@/components/zeichen";
import { useDarstellung } from "@/lib/darstellung";
import { datumKurz, datumLang } from "@/lib/format";
import type { ZeichenKey } from "@/lib/fragen";
import { tippen } from "@/lib/haptik";
import { ALBUM, XP_JE_SCHILD, XP_QUIZ } from "@/lib/schilder-jagd";
import { useStand } from "@/lib/stand";
import { leuchten, mitDeckkraft, RAND, schrift, verlauf } from "@/lib/theme";

type Filter = "alle" | "gefunden" | "offen";
const FILTER: { id: Filter; titel: string }[] = [
  { id: "alle", titel: "Alle" },
  { id: "gefunden", titel: "Gefunden" },
  { id: "offen", titel: "Noch offen" },
];

const GRUPPEN: { id: ZeichenInfo["gruppe"]; titel: string; farbe: string }[] = [
  { id: "gefahr", titel: "Gefahrzeichen", farbe: "#FF4A3D" },
  { id: "vorschrift", titel: "Vorschriftzeichen", farbe: "#4DA3FF" },
  { id: "richt", titel: "Richtzeichen", farbe: "#4ED053" },
];

function infoVon(key: ZeichenKey): ZeichenInfo | undefined {
  return ZEICHEN_INFO.find((z) => z.key === key);
}

export default function SchilderJagd() {
  const insets = useSafeAreaInsets();
  const { width } = useFenster();
  const { stand } = useStand();
  const { belohnungen, farbwelt: f } = useDarstellung();
  const [offen, setOffen] = useState<ZeichenInfo | null>(null);
  const [filter, setFilter] = useState<Filter>("alle");
  // Auf dem iPad mehr Spalten statt größerer Kacheln
  const spalten = width >= 1000 ? 6 : width >= 700 ? 5 : 3;
  const luecke = 10;
  const kachel = Math.floor((width - RAND * 2 - luecke * (spalten - 1)) / spalten);
  const gruen = f.hell ? "#23A548" : "#4ED053";

  const gefunden = ALBUM.filter((k) => stand.schilder[k]);
  const anteil = gefunden.length / ALBUM.length;
  const komplett = gefunden.length === ALBUM.length;
  const zuletzt = [...gefunden].sort((a, b) => (stand.schilder[b] ?? "").localeCompare(stand.schilder[a] ?? ""))[0];
  // Heutiges Ziel: jeden Tag ein anderes Schild, das noch fehlt
  const offene = ALBUM.map(infoVon).filter((z): z is ZeichenInfo => Boolean(z) && !stand.schilder[z!.key]);
  const tag = Math.floor((Date.now() - new Date().getTimezoneOffset() * 60000) / 86400000);
  const ziel = offene.length > 0 ? offene[(tag * 7) % offene.length] : null;

  function scannen() {
    tippen();
    router.push("/schild-scanner");
  }

  return (
    <Seite>
      <GlasGrund />
      <GrossKopf titel="Schilder-Jagd" unter="Echte Schilder finden und sammeln" />
      <ScrollView contentContainerStyle={{ paddingHorizontal: RAND, paddingTop: 8, paddingBottom: insets.bottom + 28, gap: 14 }} showsVerticalScrollIndicator={false}>
        {/* Fortschritt mit Scannen-Knopf */}
        <GlasKarte style={{ borderRadius: 26 }}>
          <View style={{ padding: 18, gap: 16 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
              <View style={{ width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center", backgroundColor: mitDeckkraft(komplett ? "#4ED053" : "#FC5B0E", f.hell ? 0.1 : 0.15) }}>
                {komplett ? <TrophyIcon size={24} color={gruen} weight="fill" /> : <CrosshairIcon size={24} color={f.orange} weight="fill" />}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ ...schrift.titel, fontSize: 21, lineHeight: 26, color: f.text }} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
                  {komplett ? "Album komplett!" : gefunden.length === 0 ? "Dein Album ist noch leer" : `${gefunden.length} von ${ALBUM.length} gefunden`}
                </Text>
                <Text style={{ ...schrift.textMittel, fontSize: 13.5, color: f.text2 }} numberOfLines={1}>
                  {zuletzt ? `Zuletzt: ${infoVon(zuletzt)?.kurz ?? infoVon(zuletzt)?.name ?? ""}` : `${ALBUM.length} Schilder warten auf dich`}
                </Text>
              </View>
              <Text style={{ ...schrift.titel, fontSize: 30, color: komplett ? gruen : f.text, fontVariant: ["tabular-nums"] }}>
                {Math.round(anteil * 100)}
                <Text style={{ fontSize: 16, color: f.text2 }}>%</Text>
              </Text>
            </View>

            <View style={{ height: 10, borderRadius: 5, backgroundColor: f.hell ? "rgba(20,23,27,0.07)" : "rgba(255,255,255,0.08)", overflow: "hidden" }}>
              <LinearGradient
                colors={komplett ? ["#7BE07F", "#3FBF4A"] : verlauf.balken}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={{ width: `${Math.max(anteil > 0 ? 2 : 0, anteil * 100)}%`, height: "100%", borderRadius: 5 }}
              />
            </View>

            {/* Stand je Gruppe */}
            <View style={{ flexDirection: "row", gap: 8 }}>
              {GRUPPEN.map((g) => {
                const alle = ALBUM.map(infoVon).filter((z) => z?.gruppe === g.id);
                const hier = alle.filter((z) => z && stand.schilder[z.key]).length;
                return (
                  <View key={g.id} style={{ flex: 1, paddingVertical: 9, paddingHorizontal: 10, borderRadius: 14, backgroundColor: f.hell ? "rgba(20,23,27,0.04)" : "rgba(255,255,255,0.05)", gap: 2 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                      <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: g.farbe }} />
                      <Text style={{ ...schrift.titelFett, fontSize: 15, color: f.text, fontVariant: ["tabular-nums"] }}>
                        {hier}/{alle.length}
                      </Text>
                    </View>
                    <Text style={{ ...schrift.textMittel, fontSize: 11.5, color: f.text3 }} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
                      {g.titel.replace("zeichen", "")}
                    </Text>
                  </View>
                );
              })}
            </View>

            <Pressable onPress={scannen} accessibilityRole="button" accessibilityLabel="Schild scannen" style={({ pressed }) => [{ height: 54, borderRadius: 27, transform: [{ scale: pressed ? 0.98 : 1 }] }, leuchten("#FC5B0E", f.hell ? 0.3 : 0.45, 14, 4)]}>
              <LinearGradient colors={verlauf.knopf} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={{ flex: 1, borderRadius: 27, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10 }}>
                <CameraIcon size={22} color="#FFFFFF" weight="fill" />
                <Text style={{ ...schrift.textFett, fontSize: 16.5, color: "#FFFFFF" }}>Schild scannen</Text>
              </LinearGradient>
            </Pressable>
            {gefunden.length === 0 ? (
              <Text style={{ ...schrift.text, fontSize: 13, lineHeight: 18, color: f.text3, textAlign: "center", marginTop: -6 }}>
                {belohnungen ? `Jedes neue Schild bringt ${XP_JE_SCHILD} XP, das Quiz danach ${XP_QUIZ} mehr.` : "Jedes neue Schild kommt in dein Album."}
              </Text>
            ) : null}
          </View>
        </GlasKarte>

        {/* Heutiges Ziel */}
        {ziel ? (
          <Pressable
            onPress={() => {
              tippen();
              setOffen(ziel);
            }}
            accessibilityRole="button"
            accessibilityLabel={`Heutiges Ziel: ${ziel.name}`}
            style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.985 : 1 }] })}
          >
            <GlasKarte style={{ flexDirection: "row", alignItems: "center", gap: 14, padding: 14, paddingRight: 16, borderRadius: 22 }}>
            <View style={{ width: 64, height: 64, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: f.hell ? "rgba(20,23,27,0.04)" : "rgba(255,255,255,0.05)" }}>
              <Verkehrszeichen zeichen={ziel.key} groesse={46} />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <TargetIcon size={14} color={f.orange} weight="fill" />
                <Text style={{ ...schrift.textHalb, fontSize: 12, letterSpacing: 0.4, color: f.orange }}>HEUTIGES ZIEL</Text>
              </View>
              <Text style={{ ...schrift.titelFett, fontSize: 16.5, color: f.text }} numberOfLines={1}>
                {ziel.kurz ?? ziel.name}
              </Text>
              <Text style={{ ...schrift.text, fontSize: 13, lineHeight: 17, color: f.text3 }} numberOfLines={2}>
                {ziel.fundort}
              </Text>
            </View>
            <CaretRightIcon size={16} color={f.text3} weight="bold" />
            </GlasKarte>
          </Pressable>
        ) : null}

        <View style={{ marginTop: 8 }}>
          <Segment<Filter> wert={filter} onWechsel={setFilter} optionen={FILTER} />
        </View>

        {/* Sammelalbum nach Gruppen */}
        {GRUPPEN.map((g) => {
          const gruppe = ALBUM.map(infoVon).filter((z): z is ZeichenInfo => z?.gruppe === g.id);
          const hier = gruppe.filter((z) => stand.schilder[z.key]).length;
          const liste = gruppe.filter((z) => filter === "alle" || (filter === "gefunden") === Boolean(stand.schilder[z.key]));
          if (liste.length === 0) return null;
          const voll = hier === gruppe.length;
          return (
            <View key={g.id} style={{ gap: 12, marginTop: 10 }}>
              <View style={{ gap: 8 }}>
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: g.farbe }} />
                    <Text style={{ ...schrift.titel, fontSize: 19, color: f.text }}>{g.titel}</Text>
                  </View>
                  <Text style={{ ...schrift.textHalb, fontSize: 14, color: voll ? gruen : f.text3, fontVariant: ["tabular-nums"] }}>
                    {hier} / {gruppe.length}
                  </Text>
                </View>
                <View style={{ height: 4, borderRadius: 2, backgroundColor: f.hell ? "rgba(20,23,27,0.06)" : "rgba(255,255,255,0.07)", overflow: "hidden" }}>
                  <View style={{ width: `${(hier / Math.max(1, gruppe.length)) * 100}%`, height: "100%", borderRadius: 2, backgroundColor: g.farbe }} />
                </View>
              </View>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: luecke }}>
                {liste.map((z) => {
                  const fund = stand.schilder[z.key];
                  return (
                    <Pressable
                      key={z.key}
                      accessibilityRole="button"
                      accessibilityLabel={`${z.name}${fund ? ", gefunden" : ", noch nicht gefunden"}`}
                      onPress={() => {
                        tippen();
                        setOffen(z);
                      }}
                      style={({ pressed }) => ({ width: kachel, opacity: fund ? 1 : 0.7, transform: [{ scale: pressed ? 0.97 : 1 }] })}
                    >
                      <GlasKarte style={{ alignItems: "center", gap: 8, paddingTop: 16, paddingBottom: 12, paddingHorizontal: 6, borderRadius: 20 }}>
                      <View style={{ height: 60, alignItems: "center", justifyContent: "center" }}>
                        <View style={{ opacity: fund ? 1 : 0.12 }}>
                          <Verkehrszeichen zeichen={z.key} groesse={58} />
                        </View>
                        {!fund ? (
                          <View style={[{ position: "absolute", width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center" }, f.hell ? { backgroundColor: "#FFFFFF", ...leuchten("#3C2C18", 0.08, 6, 2) } : { backgroundColor: "#1A2027" }]}>
                            <LockSimpleIcon size={15} color={f.text3} weight="fill" />
                          </View>
                        ) : null}
                      </View>
                      <Text numberOfLines={2} style={{ ...schrift.textMittel, fontSize: 12, lineHeight: 15, color: fund ? f.text : f.text3, textAlign: "center", minHeight: 30 }}>
                        {z.kurz ?? z.name}
                      </Text>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 4, height: 14 }}>
                        {fund ? (
                          <>
                            <CheckCircleIcon size={12} color={f.orange} weight="fill" />
                            <Text style={{ ...schrift.textHalb, fontSize: 11, color: f.orange }}>{datumKurz(fund)}</Text>
                          </>
                        ) : null}
                      </View>
                      </GlasKarte>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          );
        })}

        {/* Sicherheits-Hinweis */}
        <GlasKarte style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 20, marginTop: 10 }}>
          <View style={{ width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center", backgroundColor: mitDeckkraft("#F2A100", f.hell ? 0.12 : 0.16) }}>
            <ShieldWarningIcon size={20} color="#F2A100" weight="fill" />
          </View>
          <Text style={{ ...schrift.text, flex: 1, fontSize: 13, lineHeight: 18, color: f.text2 }}>
            Scanne nur zu Fuß oder als Beifahrer – nie selbst am Steuer. Die Fotos werden nur auf deinem Handy ausgewertet und nicht gespeichert.
          </Text>
        </GlasKarte>
      </ScrollView>

      <Modal supportedOrientations={["portrait", "landscape"]} visible={offen != null} transparent animationType="fade" onRequestClose={() => setOffen(null)}>
        <Pressable onPress={() => setOffen(null)} style={{ flex: 1, backgroundColor: f.hell ? "rgba(20,16,10,0.35)" : "rgba(3,5,7,0.74)", justifyContent: "flex-end" }}>
          {offen ? (
            <Pressable
              onPress={() => {}}
              style={[
                { width: "100%", maxWidth: 560, alignSelf: "center", padding: 22, paddingBottom: insets.bottom + 18, borderTopLeftRadius: 30, borderTopRightRadius: 30, alignItems: "center", gap: 16 },
                { backgroundColor: f.hell ? "#FFFFFF" : "#12171D" },
              ]}
            >
              <View style={{ width: 40, height: 5, borderRadius: 3, backgroundColor: f.hell ? "rgba(20,23,27,0.14)" : "rgba(255,255,255,0.16)", marginTop: -8 }} />
              <View style={{ width: 176, height: 176, borderRadius: 88, alignItems: "center", justifyContent: "center", backgroundColor: f.hell ? "rgba(20,23,27,0.04)" : "rgba(255,255,255,0.04)" }}>
                <View style={{ opacity: stand.schilder[offen.key] ? 1 : 0.3 }}>
                  <Verkehrszeichen zeichen={offen.key} groesse={130} />
                </View>
              </View>
              {stand.schilder[offen.key] ? (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6, height: 28, paddingHorizontal: 12, borderRadius: 14, backgroundColor: mitDeckkraft("#FC5B0E", f.hell ? 0.1 : 0.16) }}>
                  <CheckCircleIcon size={15} color={f.orange} weight="fill" />
                  <Text style={{ ...schrift.textHalb, fontSize: 13, color: f.orange }}>Gefunden am {datumLang(new Date(stand.schilder[offen.key]))}</Text>
                </View>
              ) : (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6, height: 28, paddingHorizontal: 12, borderRadius: 14, backgroundColor: f.hell ? "rgba(20,23,27,0.06)" : "rgba(255,255,255,0.08)" }}>
                  <LockSimpleIcon size={14} color={f.text3} weight="fill" />
                  <Text style={{ ...schrift.textHalb, fontSize: 13, color: f.text3 }}>Noch nicht gefunden</Text>
                </View>
              )}
              <View style={{ gap: 6, alignSelf: "stretch" }}>
                <T v="titel" zentriert>
                  {offen.name}
                </T>
                <T v="text" zentriert>
                  {offen.bedeutung}
                </T>
              </View>
              <View style={{ alignSelf: "stretch", flexDirection: "row", alignItems: "flex-start", gap: 12, padding: 14, borderRadius: 18, backgroundColor: f.hell ? "#F6F2EC" : "rgba(255,255,255,0.05)" }}>
                <View style={{ width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center", backgroundColor: mitDeckkraft("#FC5B0E", f.hell ? 0.1 : 0.15) }}>
                  <MapPinIcon size={18} color={f.orange} weight="fill" />
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={{ ...schrift.textHalb, fontSize: 13, color: f.orange }}>Wo findest du es?</Text>
                  <Text style={{ ...schrift.text, fontSize: 13.5, lineHeight: 18, color: f.text2 }}>{offen.fundort}</Text>
                </View>
              </View>
              {stand.schilder[offen.key] ? (
                <Knopf titel="Schließen" art="sekundaer" onPress={() => setOffen(null)} style={{ alignSelf: "stretch" }} />
              ) : (
                <View style={{ alignSelf: "stretch", gap: 8 }}>
                  <Knopf
                    titel="Jetzt suchen"
                    icon="camera"
                    onPress={() => {
                      setOffen(null);
                      router.push("/schild-scanner");
                    }}
                  />
                  <Knopf titel="Schließen" art="geist" onPress={() => setOffen(null)} />
                </View>
              )}
            </Pressable>
          ) : null}
        </Pressable>
      </Modal>
    </Seite>
  );
}
