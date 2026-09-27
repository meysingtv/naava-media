import { useMemo, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Icon } from "@/components/icon";
import { FrageZeile, LeerHinweis } from "@/components/frage-liste";
import { Knopf, Kopf, Segment } from "@/components/ui";
import { frageVon, type Frage } from "@/lib/fragen";
import { gemerktIds, schwierigeIds, useStand } from "@/lib/stand";
import { farben, schrift } from "@/lib/theme";

type Ansicht = "favoriten" | "fehler";

/** Gemerkte Fragen und Fragen, die noch nicht sitzen. */
export default function Favoriten() {
  const insets = useSafeAreaInsets();
  const { stand } = useStand();
  const [ansicht, setAnsicht] = useState<Ansicht>("favoriten");

  const gemerkt = useMemo(() => gemerktIds(stand).map(frageVon).filter((f): f is Frage => Boolean(f)), [stand]);
  const schwierig = useMemo(() => schwierigeIds(stand).map(frageVon).filter((f): f is Frage => Boolean(f)), [stand]);
  const liste = ansicht === "favoriten" ? gemerkt : schwierig;

  return (
    <View style={{ flex: 1, backgroundColor: farben.grund }}>
      <Kopf titel="Favoriten" />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 6, paddingBottom: insets.bottom + 24, gap: 10 }} showsVerticalScrollIndicator={false}>
        <Segment<Ansicht>
          wert={ansicht}
          onWechsel={setAnsicht}
          optionen={[
            { id: "favoriten", titel: `Gemerkt (${gemerkt.length})` },
            { id: "fehler", titel: `Schwierig (${schwierig.length})` },
          ]}
        />
        {liste.length === 0 ? (
          ansicht === "favoriten" ? (
            <LeerHinweis icon="heart-outline" titel="Noch keine Favoriten" text="Tippe beim Lernen oben rechts auf das Herz – dann landet die Frage hier." />
          ) : (
            <LeerHinweis icon="checkmark-done" titel="Nichts Schwieriges offen" text="Fragen, die du falsch beantwortest, sammeln sich hier – bis sie sitzen." />
          )
        ) : (
          <>
            <Knopf
              titel={ansicht === "favoriten" ? "Favoriten üben" : "Schwierige üben"}
              icon="arrow-forward"
              onPress={() => router.push({ pathname: "/training", params: { modus: ansicht === "favoriten" ? "gemerkt" : "schwierig" } })}
            />
            {liste.map((f) => {
              const fs = stand.fragen[f.id];
              return (
                <FrageZeile
                  key={f.id}
                  frage={f}
                  rechts={
                    ansicht === "favoriten" ? (
                      <Icon name="heart" size={18} color={farben.orange} />
                    ) : (
                      <Text style={{ ...schrift.textHalb, fontSize: 13, color: farben.rot }}>{fs?.f ?? 0}× falsch</Text>
                    )
                  }
                />
              );
            })}
          </>
        )}
      </ScrollView>
    </View>
  );
}
