import { useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { KategorieZeile } from "@/components/foto";
import { FrageZeile, LeerHinweis } from "@/components/frage-liste";
import { useInhaltUnten } from "@/components/tab-leiste";
import { Eingabe, KopfTaste, kopfOben } from "@/components/ui";
import { FOTOS, themaFoto } from "@/lib/fotos";
import { FRAGEN, THEMEN, fragenZuThema, themaVon, type ThemaId } from "@/lib/fragen";
import { tippen } from "@/lib/haptik";
import { fortschritt, useStand } from "@/lib/stand";
import { farben, orangeVerlauf, schrift } from "@/lib/theme";

type Stufe = "alle" | "leicht" | "mittel" | "schwer";

const STUFEN: { id: Stufe; titel: string }[] = [
  { id: "alle", titel: "Alle" },
  { id: "leicht", titel: "Leicht" },
  { id: "mittel", titel: "Mittel" },
  { id: "schwer", titel: "Schwer" },
];

/** Schwierigkeit eines Themas nach den Fehlerpunkten seiner Fragen (2–5). */
function stufeVon(thema: ThemaId): Exclude<Stufe, "alle"> {
  const liste = fragenZuThema(thema);
  const schnitt = liste.reduce((s, f) => s + f.punkte, 0) / Math.max(1, liste.length);
  if (schnitt < 3.5) return "leicht";
  if (schnitt < 4.1) return "mittel";
  return "schwer";
}

function Filter({ wert, onWechsel }: { wert: Stufe; onWechsel: (s: Stufe) => void }) {
  return (
    <View style={{ flexDirection: "row", gap: 8 }}>
      {STUFEN.map((s) => {
        const aktiv = s.id === wert;
        return (
          <Pressable
            key={s.id}
            onPress={() => {
              if (aktiv) return;
              tippen();
              onWechsel(s.id);
            }}
            style={{
              flex: 1,
              height: 38,
              borderRadius: 19,
              overflow: "hidden",
              borderWidth: aktiv ? 0 : 1,
              borderColor: "rgba(255,255,255,0.1)",
              backgroundColor: aktiv ? undefined : farben.flaeche2,
              ...(aktiv ? { shadowColor: farben.orange, shadowOpacity: 0.45, shadowRadius: 10, shadowOffset: { width: 0, height: 3 } } : null),
            }}
          >
            {aktiv ? (
              <LinearGradient colors={orangeVerlauf} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
                <Text style={{ ...schrift.textHalb, fontSize: 15, color: "#FFFFFF" }}>{s.titel}</Text>
              </LinearGradient>
            ) : (
              <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
                <Text style={{ ...schrift.textMittel, fontSize: 15, color: "#E4E7EA" }}>{s.titel}</Text>
              </View>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

export default function Kategorien() {
  const insets = useSafeAreaInsets();
  const inhaltUnten = useInhaltUnten();
  const { stand } = useStand();
  const [stufe, setStufe] = useState<Stufe>("alle");
  const [suche, setSuche] = useState<string | null>(null);

  const treffer = useMemo(() => {
    const q = (suche ?? "").trim().toLowerCase();
    if (q.length < 2) return [];
    return FRAGEN.filter((f) => f.text.toLowerCase().includes(q) || themaVon(f.thema).titel.toLowerCase().includes(q)).slice(0, 40);
  }, [suche]);

  const themen = THEMEN.filter((t) => stufe === "alle" || stufeVon(t.id) === stufe);
  const gesamt = fortschritt(stand);

  return (
    <View style={{ flex: 1, backgroundColor: farben.grund }}>
      <View style={{ paddingTop: kopfOben(insets.top), paddingHorizontal: 8, paddingBottom: 4 }}>
        <View style={{ minHeight: 44, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <View pointerEvents="none" style={{ position: "absolute", left: 56, right: 56, top: 0, bottom: 0, alignItems: "center", justifyContent: "center" }}>
            <Text style={{ ...schrift.titelFett, fontSize: 20, color: "#FFFFFF" }}>{suche == null ? "Kategorien" : "Suche"}</Text>
          </View>
          <KopfTaste icon="arrow-back" label="Zur Startseite" onPress={() => (suche == null ? router.navigate("/heute") : setSuche(null))} />
          <KopfTaste icon={suche == null ? "search" : "close"} label={suche == null ? "Suchen" : "Suche schließen"} onPress={() => setSuche(suche == null ? "" : null)} />
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 4, paddingBottom: inhaltUnten, gap: 8 }}
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
                <LeerHinweis icon="search" titel="Nichts gefunden" text="Versuch es mit einem anderen Begriff, zum Beispiel „Kreisverkehr“ oder „Promille“." />
              )
            ) : (
              <Text style={{ ...schrift.textMittel, fontSize: 13, color: farben.text3, paddingHorizontal: 4 }}>Mindestens zwei Buchstaben eingeben.</Text>
            )}
          </>
        ) : (
          <>
            <Filter wert={stufe} onWechsel={setStufe} />
            {stufe === "alle" ? (
              <KategorieZeile
                id="grundstoff"
                titel="Grundstoff"
                anzahl={FRAGEN.length}
                anteil={gesamt.anteil}
                quelle={FOTOS.grundstoff}
                onPress={() => router.push({ pathname: "/training", params: { modus: "alle" } })}
              />
            ) : null}
            {themen.map((t) => {
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
            {themen.length === 0 ? <LeerHinweis icon="layers-outline" titel="Keine Themen" text="In dieser Stufe gibt es gerade keine Themen." /> : null}
          </>
        )}
      </ScrollView>
    </View>
  );
}
