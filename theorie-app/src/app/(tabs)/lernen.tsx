import { useMemo, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { KategorieZeile } from "@/components/foto";
import { FrageZeile, LeerHinweis } from "@/components/frage-liste";
import { KarteikartenKarte } from "@/components/karteikarten-karte";
import { SchilderJagdKarte } from "@/components/schilder-jagd-karte";
import { useInhaltUnten } from "@/components/tab-leiste";
import { Eingabe, KopfKnopf, kopfOben, Segment } from "@/components/ui";
import { FRAGEN, THEMEN, fragenZuThema, themaVon, type ThemaId } from "@/lib/fragen";
import { fortschritt, useStand } from "@/lib/stand";
import { farben, schrift } from "@/lib/theme";

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
      <View style={{ paddingTop: kopfOben(insets.top) + 6, paddingHorizontal: 16, paddingBottom: 10, flexDirection: "row", alignItems: "center", gap: 12 }}>
        <Text style={{ ...schrift.titel, fontSize: 32, lineHeight: 38, letterSpacing: -0.5, color: farben.text, flex: 1 }}>{suche == null ? "Lernen" : "Suche"}</Text>
        <KopfKnopf icon={suche == null ? "search" : "close"} label={suche == null ? "Suchen" : "Suche schließen"} onPress={() => setSuche(suche == null ? "" : null)} />
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
            <Segment<Stufe> optionen={STUFEN} wert={stufe} onWechsel={setStufe} style={{ marginBottom: 4 }} />
            {stufe === "alle" ? <SchilderJagdKarte /> : null}
            {stufe === "alle" ? <KarteikartenKarte /> : null}
            {stufe === "alle" ? (
              <KategorieZeile
                id="grundstoff"
                titel="Grundstoff"
                anzahl={FRAGEN.length}
                anteil={gesamt.anteil}
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
