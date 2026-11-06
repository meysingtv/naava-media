import { useState } from "react";
import { Modal, Pressable, Text, View } from "react-native";
import { router } from "expo-router";

import { Icon } from "@/components/icon";
import { Verkehrszeichen, ZEICHEN_INFO, type ZeichenInfo } from "@/components/zeichen";
import { Abschnitt, B, Balken, Chip, DickRing, Kachel, Knopf, n, Raster, Reiter, Spalte, TOENE, UnterKopf, type Ton, type Zustand } from "@/components/web/bunt";
import { WebSeite } from "@/components/web/rahmen";
import { useDarstellung } from "@/lib/darstellung";
import { datumKurz, datumLang } from "@/lib/format";
import type { ZeichenKey } from "@/lib/fragen";
import { ALBUM, XP_JE_SCHILD, XP_QUIZ } from "@/lib/schilder-jagd";
import { useStand } from "@/lib/stand";

// Schilder-Jagd am PC: oben der Stand des Albums neben dem heutigen Ziel,
// darunter das Album als Raster je Gruppe. Ein Klick auf ein Schild öffnet ein
// ruhiges Fenster mit Bedeutung und Fundort.

type Filter = "alle" | "gefunden" | "offen";

const GRUPPEN: { id: ZeichenInfo["gruppe"]; titel: string; ton: Ton }[] = [
  { id: "gefahr", titel: "Gefahrzeichen", ton: TOENE.rot },
  { id: "vorschrift", titel: "Vorschriftzeichen", ton: TOENE.blau },
  { id: "richt", titel: "Richtzeichen", ton: TOENE.gruen },
];

function infoVon(key: ZeichenKey): ZeichenInfo | undefined {
  return ZEICHEN_INFO.find((z) => z.key === key);
}

function scannen() {
  router.push("/schild-scanner");
}

/** Ein Schild im Album. */
function SchildKachel({ z, fund, onPress }: { z: ZeichenInfo; fund?: string; onPress: () => void }) {
  return (
    <Kachel onPress={onPress} style={{ alignItems: "center", gap: 10, paddingTop: 20, paddingBottom: 14, paddingHorizontal: 10 }}>
      <View style={{ height: 68, alignItems: "center", justifyContent: "center" }}>
        <View style={{ opacity: fund ? 1 : 0.14 }}>
          <Verkehrszeichen zeichen={z.key} groesse={64} />
        </View>
        {!fund ? (
          <View style={{ position: "absolute", width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center", backgroundColor: B.flaeche, borderWidth: 1.5, borderColor: B.linie }}>
            <Icon name="lock-closed" size={15} color={B.text3} />
          </View>
        ) : null}
      </View>
      <Text numberOfLines={2} style={{ ...n.fett, fontSize: 13.5, lineHeight: 18, minHeight: 36, color: fund ? B.text : B.text3, textAlign: "center" }}>
        {z.kurz ?? z.name}
      </Text>
      <View style={{ height: 16, flexDirection: "row", alignItems: "center", gap: 5 }}>
        {fund ? (
          <>
            <Icon name="checkmark-circle" size={14} color={B.gruen} />
            <Text style={{ ...n.halb, fontSize: 12.5, color: B.text2 }}>{datumKurz(fund)}</Text>
          </>
        ) : (
          <Text style={{ ...n.halb, fontSize: 12.5, color: B.text3 }}>noch offen</Text>
        )}
      </View>
    </Kachel>
  );
}

export function SchilderJagdWeb() {
  const { stand } = useStand();
  const { belohnungen } = useDarstellung();
  const [offen, setOffen] = useState<ZeichenInfo | null>(null);
  const [filter, setFilter] = useState<Filter>("alle");

  const gefunden = ALBUM.filter((k) => stand.schilder[k]);
  const anteil = gefunden.length / ALBUM.length;
  const komplett = gefunden.length === ALBUM.length;
  const zuletzt = [...gefunden].sort((a, b) => (stand.schilder[b] ?? "").localeCompare(stand.schilder[a] ?? ""))[0];
  // Heutiges Ziel: jeden Tag ein anderes Schild, das noch fehlt (wie am Handy)
  const offene = ALBUM.map(infoVon).filter((z): z is ZeichenInfo => Boolean(z) && !stand.schilder[z!.key]);
  const tag = Math.floor((Date.now() - new Date().getTimezoneOffset() * 60000) / 86400000);
  const ziel = offene.length > 0 ? offene[(tag * 7) % offene.length] : null;
  const offenFund = offen ? stand.schilder[offen.key] : undefined;

  return (
    <WebSeite ohneRechts>
      <Spalte breite={1180}>
        <UnterKopf titel="Schilder-Jagd" unter="Echte Schilder finden und sammeln" rechts={<Knopf titel="Schild scannen" icon="camera" onPress={scannen} />} />

        <View style={{ flexDirection: "row", gap: 20, flexWrap: "wrap" }}>
          {/* Stand des Albums */}
          <Kachel style={{ flex: 2, minWidth: 420, padding: 24, flexDirection: "row", alignItems: "center", gap: 26 }}>
            <DickRing anteil={anteil} groesse={124} dicke={12} ton={komplett ? TOENE.gruen : TOENE.orange}>
              <Text style={{ ...n.schwarz, fontSize: 26, color: B.text, fontVariant: ["tabular-nums"] }}>{Math.round(anteil * 100)}%</Text>
            </DickRing>
            <View style={{ flex: 1, gap: 14 }}>
              <View>
                <Text style={{ ...n.schwarz, fontSize: 21, color: B.text }}>{komplett ? "Album komplett!" : gefunden.length === 0 ? "Dein Album ist noch leer" : `${gefunden.length} von ${ALBUM.length} gefunden`}</Text>
                <Text style={{ ...n.halb, fontSize: 14, color: B.text2 }} numberOfLines={1}>
                  {zuletzt ? `Zuletzt: ${infoVon(zuletzt)?.kurz ?? infoVon(zuletzt)?.name ?? ""}` : belohnungen ? `Jedes neue Schild bringt ${XP_JE_SCHILD} XP, das Quiz danach ${XP_QUIZ} mehr.` : `${ALBUM.length} Schilder warten auf dich`}
                </Text>
              </View>
              <View style={{ gap: 9 }}>
                {GRUPPEN.map((g) => {
                  const alle = ALBUM.map(infoVon).filter((z) => z?.gruppe === g.id);
                  const hier = alle.filter((z) => z && stand.schilder[z.key]).length;
                  return (
                    <View key={g.id} style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                      <Text style={{ width: 132, ...n.fett, fontSize: 13.5, color: B.text2 }}>{g.titel}</Text>
                      <Balken anteil={alle.length ? hier / alle.length : 0} ton={g.ton} hoehe={8} style={{ flex: 1 }} />
                      <Text style={{ width: 42, textAlign: "right", ...n.schwarz, fontSize: 13.5, color: B.text, fontVariant: ["tabular-nums"] }}>
                        {hier}/{alle.length}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>
          </Kachel>

          {/* Heutiges Ziel */}
          {ziel ? (
            <Kachel onPress={() => setOffen(ziel)} style={{ flex: 1, minWidth: 280, padding: 22, gap: 14 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Icon name="locate" size={18} color={B.orange} />
                <Text style={{ flex: 1, ...n.schwarz, fontSize: 16, color: B.text }}>Heutiges Ziel</Text>
                <Icon name="chevron-forward" size={18} color={B.text3} />
              </View>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
                <View style={{ width: 72, height: 72, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: B.ton }}>
                  <Verkehrszeichen zeichen={ziel.key} groesse={52} />
                </View>
                <View style={{ flex: 1, gap: 3 }}>
                  <Text style={{ ...n.schwarz, fontSize: 16, color: B.text }} numberOfLines={2}>
                    {ziel.kurz ?? ziel.name}
                  </Text>
                  <Text style={{ ...n.halb, fontSize: 13, lineHeight: 18, color: B.text2 }} numberOfLines={3}>
                    {ziel.fundort}
                  </Text>
                </View>
              </View>
            </Kachel>
          ) : null}
        </View>

        <Reiter<Filter>
          optionen={[
            { id: "alle", titel: "Alle", zahl: ALBUM.length },
            { id: "gefunden", titel: "Gefunden", zahl: gefunden.length },
            { id: "offen", titel: "Noch offen", zahl: ALBUM.length - gefunden.length },
          ]}
          wert={filter}
          onWechsel={setFilter}
        />

        {GRUPPEN.map((g) => {
          const gruppe = ALBUM.map(infoVon).filter((z): z is ZeichenInfo => z?.gruppe === g.id);
          const hier = gruppe.filter((z) => stand.schilder[z.key]).length;
          const liste = gruppe.filter((z) => filter === "alle" || (filter === "gefunden") === Boolean(stand.schilder[z.key]));
          if (liste.length === 0) return null;
          return (
            <View key={g.id}>
              <Abschnitt titel={g.titel} link={`${hier} von ${gruppe.length} gefunden`} />
              <Raster min={150} abstand={14}>
                {liste.map((z) => (
                  <SchildKachel key={z.key} z={z} fund={stand.schilder[z.key]} onPress={() => setOffen(z)} />
                ))}
              </Raster>
            </View>
          );
        })}

        <View style={{ flexDirection: "row", alignItems: "center", gap: 14, padding: 16, paddingLeft: 20, borderRadius: 16, backgroundColor: B.ton }}>
          <Icon name="shield-checkmark-outline" size={22} color={B.text2} />
          <Text style={{ flex: 1, ...n.halb, fontSize: 14.5, lineHeight: 20, color: B.text2 }}>Scanne nur zu Fuß oder als Beifahrer – nie selbst am Steuer. Die Fotos werden nur auf deinem Gerät ausgewertet und nicht gespeichert.</Text>
        </View>
      </Spalte>

      {/* Ein Schild im Detail */}
      <Modal visible={offen != null} transparent animationType="fade" onRequestClose={() => setOffen(null)}>
        <Pressable onPress={() => setOffen(null)} style={{ flex: 1, backgroundColor: "rgba(20,16,10,0.35)", alignItems: "center", justifyContent: "center", padding: 24 }}>
          {offen ? (
            <Pressable onPress={() => {}} style={{ width: "100%", maxWidth: 480, borderRadius: 22, backgroundColor: B.flaeche, padding: 28, gap: 18, alignItems: "center" }}>
              <Pressable onPress={() => setOffen(null)} accessibilityLabel="Schließen" style={(z: Zustand) => ({ position: "absolute", top: 14, right: 14, width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: z.hovered ? B.ton : "transparent" })}>
                <Icon name="close" size={20} color={B.text2} />
              </Pressable>
              <View style={{ width: 168, height: 168, borderRadius: 84, alignItems: "center", justifyContent: "center", backgroundColor: B.ton }}>
                <View style={{ opacity: offenFund ? 1 : 0.3 }}>
                  <Verkehrszeichen zeichen={offen.key} groesse={124} />
                </View>
              </View>
              {offenFund ? <Chip icon="checkmark-circle" text={`Gefunden am ${datumLang(new Date(offenFund))}`} ton={TOENE.gruen} /> : <Chip icon="lock-closed" text="Noch nicht gefunden" ton={{ farbe: B.text3, kante: B.text2, hell: B.ton }} />}
              <View style={{ gap: 6, alignSelf: "stretch" }}>
                <Text style={{ ...n.schwarz, fontSize: 22, color: B.text, textAlign: "center" }}>{offen.name}</Text>
                <Text style={{ ...n.halb, fontSize: 15, lineHeight: 22, color: B.text2, textAlign: "center" }}>{offen.bedeutung}</Text>
              </View>
              <View style={{ alignSelf: "stretch", flexDirection: "row", alignItems: "flex-start", gap: 12, paddingTop: 16, borderTopWidth: 1.5, borderTopColor: B.ton }}>
                <Icon name="location" size={20} color={B.orange} />
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={{ ...n.fett, fontSize: 13.5, color: B.text }}>Wo findest du es?</Text>
                  <Text style={{ ...n.halb, fontSize: 14, lineHeight: 20, color: B.text2 }}>{offen.fundort}</Text>
                </View>
              </View>
              <View style={{ alignSelf: "stretch", flexDirection: "row", gap: 10 }}>
                <Knopf titel="Schließen" art="rand" ton="blau" onPress={() => setOffen(null)} style={{ flex: 1 }} />
                {offenFund ? null : (
                  <Knopf
                    titel="Jetzt suchen"
                    icon="camera"
                    onPress={() => {
                      setOffen(null);
                      scannen();
                    }}
                    style={{ flex: 1 }}
                  />
                )}
              </View>
            </Pressable>
          ) : null}
        </Pressable>
      </Modal>
    </WebSeite>
  );
}
