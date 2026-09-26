import { useMemo, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Icon } from "@/components/icon";
import { Eingabe, Knopf, KopfTaste, Segment, T, kopfOben } from "@/components/ui";
import { KategorieZeile } from "@/components/foto";
import { useInhaltUnten } from "@/components/tab-leiste";
import { Verkehrszeichen } from "@/components/zeichen";
import { Kontrollleuchte } from "@/components/leuchten";
import { FOTOS, themaFoto } from "@/lib/fotos";
import { FRAGEN, THEMEN, fragenZuThema, frageVon, istZeichen, themaVon, type Frage, type LeuchteKey, type ZeichenKey } from "@/lib/fragen";
import { tippen } from "@/lib/haptik";
import { fortschritt, gemerktIds, schwierigeIds, useStand } from "@/lib/stand";
import { abstand, farben, RAND } from "@/lib/theme";

type Reiter = "kategorien" | "favoriten" | "schwierige";

function FrageZeile({ frage, rechts }: { frage: Frage; rechts?: React.ReactNode }) {
  return (
    <Pressable
      onPress={() => {
        tippen();
        router.push({ pathname: "/training", params: { modus: "thema", thema: frage.thema, start: frage.id } });
      }}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: abstand(3),
        padding: abstand(3.5),
        borderRadius: 16,
        backgroundColor: pressed ? farben.flaeche2 : farben.flaeche,
        borderWidth: 1,
        borderColor: farben.linie,
      })}
    >
      {frage.bild && istZeichen(frage.bild) ? (
        <Verkehrszeichen zeichen={frage.bild as ZeichenKey} groesse={34} />
      ) : frage.bild?.startsWith("leuchte_") ? (
        <Kontrollleuchte leuchte={frage.bild as LeuchteKey} groesse={34} />
      ) : (
        <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: farben.flaeche2, alignItems: "center", justifyContent: "center" }}>
          <Icon name={frage.bild ? "map-outline" : "help"} size={17} color={farben.text3} />
        </View>
      )}
      <View style={{ flex: 1, gap: 2 }}>
        <T v="textStark" numberOfLines={2} style={{ fontSize: 14.5, lineHeight: 20 }}>
          {frage.text}
        </T>
        <T v="klein" style={{ fontSize: 12 }}>
          {themaVon(frage.thema).titel} · {frage.punkte} Punkte
        </T>
      </View>
      {rechts ?? <Icon name="chevron-forward" size={17} color={farben.text4} />}
    </Pressable>
  );
}

function Leer({ icon, titel, text }: { icon: keyof typeof Ionicons.glyphMap; titel: string; text: string }) {
  return (
    <View style={{ alignItems: "center", gap: abstand(3), paddingVertical: abstand(12), paddingHorizontal: abstand(6) }}>
      <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: farben.orangeSoft, alignItems: "center", justifyContent: "center" }}>
        <Icon name={icon} size={28} color={farben.orange} />
      </View>
      <T v="h3" zentriert>
        {titel}
      </T>
      <T v="text" zentriert>
        {text}
      </T>
    </View>
  );
}

export default function Lernen() {
  const insets = useSafeAreaInsets();
  const inhaltUnten = useInhaltUnten();
  const { stand } = useStand();
  const [reiter, setReiter] = useState<Reiter>("kategorien");
  const [suche, setSuche] = useState<string | null>(null);

  const gemerkt = gemerktIds(stand)
    .map(frageVon)
    .filter((f): f is Frage => Boolean(f));
  const schwierig = useMemo(
    () =>
      schwierigeIds(stand)
        .map(frageVon)
        .filter((f): f is Frage => Boolean(f)),
    [stand],
  );

  const treffer = useMemo(() => {
    const q = (suche ?? "").trim().toLowerCase();
    if (q.length < 2) return [];
    return FRAGEN.filter((f) => f.text.toLowerCase().includes(q) || themaVon(f.thema).titel.toLowerCase().includes(q)).slice(0, 40);
  }, [suche]);

  const gesamt = fortschritt(stand);

  return (
    <View style={{ flex: 1, backgroundColor: farben.grund }}>
      <View style={{ paddingTop: kopfOben(insets.top), paddingHorizontal: RAND - 8, paddingBottom: abstand(1) }}>
        <View style={{ minHeight: 44, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <View pointerEvents="none" style={{ position: "absolute", left: 56, right: 56, top: 0, bottom: 0, alignItems: "center", justifyContent: "center" }}>
            <T v="h3" style={{ fontSize: 19 }}>
              Lernen
            </T>
          </View>
          <KopfTaste icon="arrow-back" label="Zur Startseite" onPress={() => router.navigate("/heute")} />
          <KopfTaste icon={suche == null ? "search" : "close"} label={suche == null ? "Suchen" : "Suche schließen"} onPress={() => setSuche(suche == null ? "" : null)} />
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: RAND, paddingTop: abstand(1), paddingBottom: inhaltUnten, gap: 9 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {suche != null ? (
          <>
            <Eingabe icon="search" value={suche} onChangeText={setSuche} placeholder="Frage oder Thema suchen" autoFocus returnKeyType="search" />
            {suche.trim().length >= 2 ? (
              treffer.length > 0 ? (
                treffer.map((f) => <FrageZeile key={f.id} frage={f} />)
              ) : (
                <Leer icon="search" titel="Nichts gefunden" text="Versuch es mit einem anderen Begriff, zum Beispiel „Kreisverkehr“ oder „Promille“." />
              )
            ) : (
              <T v="klein" style={{ paddingHorizontal: abstand(1) }}>
                Mindestens zwei Buchstaben eingeben.
              </T>
            )}
          </>
        ) : (
          <>
            <Segment<Reiter>
              wert={reiter}
              onWechsel={setReiter}
              optionen={[
                { id: "kategorien", titel: "Kategorien" },
                { id: "favoriten", titel: "Favoriten" },
                { id: "schwierige", titel: "Schwierige" },
              ]}
              style={{ marginBottom: 0 }}
            />

            {reiter === "kategorien" ? (
              <>
                <KategorieZeile
                  id="grundstoff"
                  titel="Grundstoff"
                  anzahl={FRAGEN.length}
                  anteil={gesamt.anteil}
                  quelle={FOTOS.grundstoff}
                  onPress={() => router.push({ pathname: "/training", params: { modus: "alle" } })}
                />
                {THEMEN.map((t) => {
                  const liste = fragenZuThema(t.id);
                  return (
                    <KategorieZeile
                      key={t.id}
                      id={t.id}
                      titel={t.titel}
                      anzahl={liste.length}
                      anteil={fortschritt(stand, liste).anteil}
                      quelle={themaFoto(t.id)}
                      onPress={() => router.push({ pathname: "/thema/[id]", params: { id: t.id } })}
                    />
                  );
                })}
              </>
            ) : reiter === "favoriten" ? (
              gemerkt.length === 0 ? (
                <Leer icon="heart-outline" titel="Noch keine Favoriten" text="Tippe beim Lernen oben rechts auf das Herz – dann landet die Frage hier." />
              ) : (
                <>
                  <Knopf titel={`Favoriten üben (${gemerkt.length})`} icon="arrow-forward" onPress={() => router.push({ pathname: "/training", params: { modus: "gemerkt" } })} />
                  {gemerkt.map((f) => (
                    <FrageZeile key={f.id} frage={f} rechts={<Icon name="heart" size={18} color={farben.orange} />} />
                  ))}
                </>
              )
            ) : schwierig.length === 0 ? (
              <Leer icon="checkmark-done" titel="Nichts Schwieriges offen" text="Fragen, die du falsch beantwortest, sammeln sich hier – bis sie sitzen." />
            ) : (
              <>
                <Knopf
                  titel={`Schwierige üben (${schwierig.length})`}
                  icon="arrow-forward"
                  onPress={() => router.push({ pathname: "/training", params: { modus: "schwierig" } })}
                />
                {schwierig.map((f) => {
                  const fs = stand.fragen[f.id];
                  return (
                    <FrageZeile
                      key={f.id}
                      frage={f}
                      rechts={
                        <View style={{ alignItems: "flex-end" }}>
                          <T v="textStark" farbe={farben.rot} style={{ fontSize: 13 }}>
                            {fs?.f ?? 0}× falsch
                          </T>
                        </View>
                      }
                    />
                  );
                })}
              </>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}
