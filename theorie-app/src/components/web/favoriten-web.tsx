import { useMemo, useState, type ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import { router } from "expo-router";

import { Icon, type IconName } from "@/components/icon";
import { Kontrollleuchte } from "@/components/leuchten";
import { B, Kachel, Knopf, Leer, n, Raster, Reiter, Spalte, Symbol, THEMA_TON, TOENE, UnterKopf, type Zustand } from "@/components/web/bunt";
import { WebSeite } from "@/components/web/rahmen";
import { Verkehrszeichen } from "@/components/zeichen";
import { frageVon, istZeichen, themaVon, type Frage, type LeuchteKey, type ZeichenKey } from "@/lib/fragen";
import { gemerktIds, schwierigeIds, useStand } from "@/lib/stand";

// Favoriten am PC: Umschalter zwischen gemerkten und schwierigen Fragen,
// darüber eine Zeile zum Üben, darunter die Fragen in zwei Spalten.

type Ansicht = "favoriten" | "fehler";

export function FavoritenWeb() {
  const { stand } = useStand();
  const [ansicht, setAnsicht] = useState<Ansicht>("favoriten");

  const gemerkt = useMemo(() => gemerktIds(stand).map(frageVon).filter((q): q is Frage => Boolean(q)), [stand]);
  const schwierig = useMemo(() => schwierigeIds(stand).map(frageVon).filter((q): q is Frage => Boolean(q)), [stand]);
  const liste = ansicht === "favoriten" ? gemerkt : schwierig;
  const ueben = () => router.push({ pathname: "/training", params: { modus: ansicht === "favoriten" ? "gemerkt" : "schwierig" } });

  return (
    <WebSeite ohneRechts>
      <Spalte>
        <UnterKopf titel="Favoriten" unter="Gemerkte Fragen und alles, was noch hakt" />

        <View style={{ gap: 18 }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
            <Reiter<Ansicht>
              wert={ansicht}
              onWechsel={setAnsicht}
              optionen={[
                { id: "favoriten", titel: "Gemerkt", zahl: gemerkt.length },
                { id: "fehler", titel: "Schwierig", zahl: schwierig.length },
              ]}
            />
            {liste.length > 0 ? (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
                <Text style={{ ...n.halb, fontSize: 14.5, color: B.text2 }}>
                  {liste.length} {liste.length === 1 ? "Frage" : "Fragen"}
                </Text>
                <Knopf titel={ansicht === "favoriten" ? "Favoriten üben" : "Schwierige üben"} icon="play" ton={ansicht === "favoriten" ? "orange" : "rot"} onPress={ueben} />
              </View>
            ) : null}
          </View>

          {liste.length === 0 ? (
            <Kachel>
              {ansicht === "favoriten" ? (
                <Leer icon="heart" ton={TOENE.pink} titel="Noch keine Favoriten" text="Tippe beim Lernen oben rechts auf das Herz – dann landet die Frage hier." />
              ) : (
                <Leer icon="checkmark-done" ton={TOENE.gruen} titel="Nichts Schwieriges offen" text="Fragen, die du falsch beantwortest, sammeln sich hier – bis sie sitzen." />
              )}
            </Kachel>
          ) : (
            <Raster min={420} max={2} abstand={12}>
              {liste.map((q) => {
                const falsch = stand.fragen[q.id]?.f ?? 0;
                return (
                  <FrageKarte
                    key={q.id}
                    frage={q}
                    rechts={
                      ansicht === "favoriten" ? (
                        <Icon name="heart" size={19} color={TOENE.pink.farbe} />
                      ) : (
                        <View style={{ height: 26, paddingHorizontal: 10, borderRadius: 13, justifyContent: "center", backgroundColor: B.rotHell }}>
                          <Text style={{ ...n.fett, fontSize: 12.5, color: B.rotKante, fontVariant: ["tabular-nums"] }}>{falsch}× falsch</Text>
                        </View>
                      )
                    }
                  />
                );
              })}
            </Raster>
          )}
        </View>
      </Spalte>
    </WebSeite>
  );
}

/** Kleines Bild zur Frage: Zeichen, Kontrollleuchte, Lageplan oder das Themen-Symbol. */
function Vorschau({ frage }: { frage: Frage }) {
  const flaeche = { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: B.ton } as const;
  if (frage.bild && istZeichen(frage.bild)) {
    return (
      <View style={flaeche}>
        <Verkehrszeichen zeichen={frage.bild as ZeichenKey} groesse={32} />
      </View>
    );
  }
  if (frage.bild?.startsWith("leuchte_")) {
    return (
      <View style={[flaeche, { backgroundColor: "#0B0D10" }]}>
        <Kontrollleuchte leuchte={frage.bild as LeuchteKey} groesse={28} />
      </View>
    );
  }
  if (frage.bild) {
    return (
      <View style={flaeche}>
        <Icon name="map-outline" size={20} color={B.text2} />
      </View>
    );
  }
  return <Symbol icon={themaVon(frage.thema).icon as IconName} ton={THEMA_TON[frage.thema]} groesse={44} />;
}

/** Eine Frage als Kachel – öffnet das Training im Thema, beginnend mit dieser Frage. */
function FrageKarte({ frage, rechts }: { frage: Frage; rechts?: ReactNode }) {
  return (
    <Pressable
      onPress={() => router.push({ pathname: "/training", params: { modus: "thema", thema: frage.thema, start: frage.id } })}
      accessibilityRole="button"
      accessibilityLabel={frage.text}
      style={(z: Zustand) => ({ flexDirection: "row", alignItems: "center", gap: 14, minHeight: 88, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 16, borderWidth: 1.5, borderColor: z.hovered ? B.kante : B.linie, backgroundColor: z.hovered ? B.hover : B.flaeche })}
    >
      <Vorschau frage={frage} />
      <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
        <Text numberOfLines={2} style={{ ...n.fett, fontSize: 15, lineHeight: 20, color: B.text }}>
          {frage.text}
        </Text>
        <Text numberOfLines={1} style={{ ...n.halb, fontSize: 13, color: B.text3 }}>
          {themaVon(frage.thema).titel} · {frage.punkte} Punkte
        </Text>
      </View>
      {rechts}
    </Pressable>
  );
}
