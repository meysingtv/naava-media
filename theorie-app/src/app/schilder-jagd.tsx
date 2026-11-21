import { useState } from "react";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CheckCircleIcon } from "phosphor-react-native/src/icons/CheckCircle";
import { CrosshairIcon } from "phosphor-react-native/src/icons/Crosshair";
import { LockSimpleIcon } from "phosphor-react-native/src/icons/LockSimple";
import { MapPinIcon } from "phosphor-react-native/src/icons/MapPin";
import { ShieldWarningIcon } from "phosphor-react-native/src/icons/ShieldWarning";
import { TargetIcon } from "phosphor-react-native/src/icons/Target";
import { TrophyIcon } from "phosphor-react-native/src/icons/Trophy";

import { useDesktop, useFenster } from "@/lib/fenster";
import { SchilderJagdWeb } from "@/components/web/schilder-jagd-web";
import { Icon } from "@/components/icon";
import { LilaLeisteSeite } from "@/components/lila-leiste";
import { LilaKarte, LilaKnopf, LILA_RAND, LilaTitel, LilaZurueck, lilaSchrift, useLila } from "@/components/lila-teile";
import { Verkehrszeichen, ZEICHEN_INFO, type ZeichenInfo } from "@/components/zeichen";
import { useDarstellung } from "@/lib/darstellung";
import { datumKurz, datumLang } from "@/lib/format";
import type { ZeichenKey } from "@/lib/fragen";
import { tippen } from "@/lib/haptik";
import { ALBUM, XP_JE_SCHILD, XP_QUIZ } from "@/lib/schilder-jagd";
import { useStand } from "@/lib/stand";

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
  // Im Browser am PC eine eigene Fassung (web/schilder-jagd-web.tsx).
  return useDesktop() ? <SchilderJagdWeb /> : <SchilderJagdHandy />;
}

function SchilderJagdHandy() {
  const insets = useSafeAreaInsets();
  const { width } = useFenster();
  const l = useLila();
  const { stand } = useStand();
  const { belohnungen } = useDarstellung();
  const [offen, setOffen] = useState<ZeichenInfo | null>(null);
  const [filter, setFilter] = useState<Filter>("alle");
  const innen = Math.min(width, 560) - 2 * LILA_RAND;
  const spalten = innen >= 640 ? 5 : 3;
  const luecke = 10;
  const kachel = Math.floor((innen - luecke * (spalten - 1)) / spalten);

  const gefunden = ALBUM.filter((k) => stand.schilder[k]);
  const anteil = gefunden.length / ALBUM.length;
  const komplett = gefunden.length === ALBUM.length;
  const zuletzt = [...gefunden].sort((a, b) => (stand.schilder[b] ?? "").localeCompare(stand.schilder[a] ?? ""))[0];
  // Heutiges Ziel: jeden Tag ein anderes Schild, das noch fehlt
  const offene = ALBUM.map(infoVon).filter((z): z is ZeichenInfo => Boolean(z) && !stand.schilder[z!.key]);
  const tag = Math.floor((Date.now() - new Date().getTimezoneOffset() * 60000) / 86400000);
  const ziel = offene.length > 0 ? offene[(tag * 7) % offene.length] : null;
  const scannen = () => router.push("/schild-scanner");

  return (
    <View style={{ flex: 1, backgroundColor: l.grund }}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: 24, paddingHorizontal: LILA_RAND, width: "100%", maxWidth: 560, alignSelf: "center", gap: 14 }} showsVerticalScrollIndicator={false}>
        <View>
          <LilaZurueck />
          <LilaTitel style={{ marginTop: 14 }}>Schilder-Jagd</LilaTitel>
          <Text style={{ ...lilaSchrift.text, fontSize: 15.5, color: l.tinte2 }}>Echte Schilder finden und sammeln</Text>
        </View>

        {/* Fortschritt mit Scannen-Knopf */}
        <LilaKarte>
          <View style={{ padding: 16, gap: 14 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <View style={{ width: 46, height: 46, borderRadius: 23, alignItems: "center", justifyContent: "center", backgroundColor: l.lilaZart }}>
                {komplett ? <TrophyIcon size={23} color="#7C4DFF" weight="fill" /> : <CrosshairIcon size={23} color="#7C4DFF" weight="bold" />}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ ...lilaSchrift.titel, fontSize: 22, lineHeight: 25, color: l.tinte }} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
                  {komplett ? "Album komplett!" : gefunden.length === 0 ? "Dein Album ist noch leer" : `${gefunden.length} von ${ALBUM.length} gefunden`}
                </Text>
                <Text style={{ ...lilaSchrift.textMittel, fontSize: 13, color: l.tinte2 }} numberOfLines={1}>
                  {zuletzt ? `Zuletzt: ${infoVon(zuletzt)?.kurz ?? infoVon(zuletzt)?.name ?? ""}` : `${ALBUM.length} Schilder warten auf dich`}
                </Text>
              </View>
              <Text style={{ ...lilaSchrift.titel, fontSize: 32, color: l.tinte, fontVariant: ["tabular-nums"] }}>
                {Math.round(anteil * 100)}
                <Text style={{ fontSize: 17, color: l.tinte2 }}>%</Text>
              </Text>
            </View>
            <View style={{ height: 10, borderRadius: 5, backgroundColor: l.spur, overflow: "hidden" }}>
              <View style={{ width: `${Math.max(anteil > 0 ? 2 : 0, anteil * 100)}%`, height: "100%", borderRadius: 5, backgroundColor: "#7C4DFF" }} />
            </View>
            <View style={{ flexDirection: "row", gap: 8 }}>
              {GRUPPEN.map((g) => {
                const alle = ALBUM.map(infoVon).filter((z) => z?.gruppe === g.id);
                const hier = alle.filter((z) => z && stand.schilder[z.key]).length;
                return (
                  <View key={g.id} style={{ flex: 1, paddingVertical: 8, paddingHorizontal: 10, borderRadius: 12, backgroundColor: l.lilaFlaeche, borderWidth: 1, borderColor: l.linie }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                      <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: g.farbe }} />
                      <Text style={{ ...lilaSchrift.fett, fontSize: 17, color: l.tinte, fontVariant: ["tabular-nums"] }}>
                        {hier}/{alle.length}
                      </Text>
                    </View>
                    <Text style={{ ...lilaSchrift.textMittel, fontSize: 11.5, color: l.tinte2 }} numberOfLines={1}>
                      {g.titel.replace("zeichen", "")}
                    </Text>
                  </View>
                );
              })}
            </View>
            <LilaKnopf titel="Schild scannen" icon="camera" onPress={scannen} />
            {gefunden.length === 0 ? (
              <Text style={{ ...lilaSchrift.text, fontSize: 13, lineHeight: 18, color: l.tinte3, textAlign: "center", marginTop: -4 }}>
                {belohnungen ? `Jedes neue Schild bringt ${XP_JE_SCHILD} XP, das Quiz danach ${XP_QUIZ} mehr.` : "Jedes neue Schild kommt in dein Album."}
              </Text>
            ) : null}
          </View>
        </LilaKarte>

        {/* Heutiges Ziel */}
        {ziel ? (
          <LilaKarte onPress={() => setOffen(ziel)} label={`Heutiges Ziel: ${ziel.name}`}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 12, paddingRight: 14 }}>
              <View style={{ width: 60, height: 60, borderRadius: 16, alignItems: "center", justifyContent: "center", backgroundColor: l.lilaFlaeche }}>
                <Verkehrszeichen zeichen={ziel.key} groesse={42} />
              </View>
              <View style={{ flex: 1, gap: 1 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                  <TargetIcon size={14} color="#7C4DFF" weight="bold" />
                  <Text style={{ ...lilaSchrift.textHalb, fontSize: 12.5, color: "#7C4DFF" }}>Heutiges Ziel</Text>
                </View>
                <Text style={{ ...lilaSchrift.fett, fontSize: 19, color: l.tinte }} numberOfLines={1}>
                  {ziel.kurz ?? ziel.name}
                </Text>
                <Text style={{ ...lilaSchrift.text, fontSize: 13, lineHeight: 17, color: l.tinte2 }} numberOfLines={2}>
                  {ziel.fundort}
                </Text>
              </View>
              <Icon name="chevron-forward" size={19} color={l.tinte3} />
            </View>
          </LilaKarte>
        ) : null}

        {/* Filter */}
        <View style={{ flexDirection: "row", padding: 4, borderRadius: 16, backgroundColor: l.karte, borderWidth: 1.5, borderColor: l.linie, marginTop: 6 }}>
          {FILTER.map((o) => {
            const an = o.id === filter;
            return (
              <Pressable
                key={o.id}
                onPress={() => {
                  tippen();
                  setFilter(o.id);
                }}
                accessibilityRole="button"
                accessibilityState={{ selected: an }}
                style={{ flex: 1, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: an ? "#7C4DFF" : "transparent" }}
              >
                <Text style={{ ...lilaSchrift.textHalb, fontSize: 14, color: an ? "#FFFFFF" : l.tinte }}>{o.titel}</Text>
              </Pressable>
            );
          })}
        </View>

        {/* Album nach Gruppen */}
        {GRUPPEN.map((g) => {
          const gruppe = ALBUM.map(infoVon).filter((z): z is ZeichenInfo => z?.gruppe === g.id);
          const hier = gruppe.filter((z) => stand.schilder[z.key]).length;
          const liste = gruppe.filter((z) => filter === "alle" || (filter === "gefunden") === Boolean(stand.schilder[z.key]));
          if (liste.length === 0) return null;
          return (
            <View key={g.id} style={{ gap: 10, marginTop: 6 }}>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: g.farbe }} />
                  <Text style={{ ...lilaSchrift.titel, fontSize: 22, color: l.tinte }}>{g.titel}</Text>
                </View>
                <Text style={{ ...lilaSchrift.textHalb, fontSize: 14, color: l.tinte2, fontVariant: ["tabular-nums"] }}>
                  {hier} / {gruppe.length}
                </Text>
              </View>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: luecke }}>
                {liste.map((z) => {
                  const fund = stand.schilder[z.key];
                  return (
                    <LilaKarte key={z.key} onPress={() => setOffen(z)} label={`${z.name}${fund ? ", gefunden" : ", noch nicht gefunden"}`} style={{ width: kachel }}>
                      <View style={{ alignItems: "center", gap: 6, paddingTop: 14, paddingBottom: 10, paddingHorizontal: 6 }}>
                        <View style={{ height: 56, alignItems: "center", justifyContent: "center" }}>
                          <View style={{ opacity: fund ? 1 : 0.13 }}>
                            <Verkehrszeichen zeichen={z.key} groesse={54} />
                          </View>
                          {!fund ? (
                            <View style={{ position: "absolute", width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: l.lilaZart }}>
                              <LockSimpleIcon size={14} color="#7C4DFF" weight="fill" />
                            </View>
                          ) : null}
                        </View>
                        <Text numberOfLines={2} style={{ ...lilaSchrift.textMittel, fontSize: 12, lineHeight: 15, color: fund ? l.tinte : l.tinte2, textAlign: "center", minHeight: 30 }}>
                          {z.kurz ?? z.name}
                        </Text>
                        {fund ? (
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                            <CheckCircleIcon size={12} color="#7C4DFF" weight="fill" />
                            <Text style={{ ...lilaSchrift.textHalb, fontSize: 11, color: "#7C4DFF" }}>{datumKurz(fund)}</Text>
                          </View>
                        ) : null}
                      </View>
                    </LilaKarte>
                  );
                })}
              </View>
            </View>
          );
        })}

        {/* Sicherheits-Hinweis */}
        <LilaKarte style={{ marginTop: 6 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 14 }}>
            <View style={{ width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center", backgroundColor: l.lilaZart }}>
              <ShieldWarningIcon size={20} color="#7C4DFF" weight="fill" />
            </View>
            <Text style={{ ...lilaSchrift.text, flex: 1, fontSize: 13, lineHeight: 18, color: l.tinte2 }}>
              Scanne nur zu Fuß oder als Beifahrer – nie selbst am Steuer. Die Fotos werden nur auf deinem Handy ausgewertet und nicht gespeichert.
            </Text>
          </View>
        </LilaKarte>
      </ScrollView>
      <LilaLeisteSeite aktiv="lernen" />

      <Modal supportedOrientations={["portrait", "landscape"]} visible={offen != null} transparent animationType="fade" onRequestClose={() => setOffen(null)}>
        <Pressable onPress={() => setOffen(null)} style={{ flex: 1, backgroundColor: "rgba(20,16,40,0.45)", justifyContent: "flex-end" }}>
          {offen ? (
            <Pressable onPress={() => {}} style={{ width: "100%", maxWidth: 560, alignSelf: "center", padding: 22, paddingBottom: insets.bottom + 18, borderTopLeftRadius: 30, borderTopRightRadius: 30, alignItems: "center", gap: 14, backgroundColor: l.grund }}>
              <View style={{ width: 40, height: 5, borderRadius: 3, backgroundColor: l.spur, marginTop: -8 }} />
              <View style={{ width: 170, height: 170, borderRadius: 85, alignItems: "center", justifyContent: "center", backgroundColor: l.karte, borderWidth: 1.5, borderColor: l.linie }}>
                <View style={{ opacity: stand.schilder[offen.key] ? 1 : 0.3 }}>
                  <Verkehrszeichen zeichen={offen.key} groesse={124} />
                </View>
              </View>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6, height: 28, paddingHorizontal: 12, borderRadius: 14, backgroundColor: l.lilaZart }}>
                {stand.schilder[offen.key] ? <CheckCircleIcon size={15} color="#7C4DFF" weight="fill" /> : <LockSimpleIcon size={14} color="#7C4DFF" weight="fill" />}
                <Text style={{ ...lilaSchrift.textHalb, fontSize: 13, color: "#5B2ED6" }}>{stand.schilder[offen.key] ? `Gefunden am ${datumLang(new Date(stand.schilder[offen.key]))}` : "Noch nicht gefunden"}</Text>
              </View>
              <View style={{ gap: 6, alignSelf: "stretch" }}>
                <Text style={{ ...lilaSchrift.titel, fontSize: 28, lineHeight: 31, color: l.tinte, textAlign: "center" }}>{offen.name}</Text>
                <Text style={{ ...lilaSchrift.text, fontSize: 15, lineHeight: 21, color: l.tinte2, textAlign: "center" }}>{offen.bedeutung}</Text>
              </View>
              <LilaKarte style={{ alignSelf: "stretch" }}>
                <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 12, padding: 14 }}>
                  <MapPinIcon size={20} color="#7C4DFF" weight="fill" />
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={{ ...lilaSchrift.textHalb, fontSize: 13, color: "#7C4DFF" }}>Wo findest du es?</Text>
                    <Text style={{ ...lilaSchrift.text, fontSize: 13.5, lineHeight: 18, color: l.tinte2 }}>{offen.fundort}</Text>
                  </View>
                </View>
              </LilaKarte>
              {stand.schilder[offen.key] ? (
                <LilaKnopf titel="Schließen" onPress={() => setOffen(null)} style={{ alignSelf: "stretch" }} />
              ) : (
                <LilaKnopf
                  titel="Jetzt suchen"
                  icon="camera"
                  onPress={() => {
                    setOffen(null);
                    scannen();
                  }}
                  style={{ alignSelf: "stretch" }}
                />
              )}
            </Pressable>
          ) : null}
        </Pressable>
      </Modal>
    </View>
  );
}
