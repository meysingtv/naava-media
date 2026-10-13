import { useMemo, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Icon } from "@/components/icon";
import { FrageZeile, LeerHinweis } from "@/components/frage-liste";
import { StartKnopf } from "@/components/home";
import { GrossKopf, Seite } from "@/components/seite";
import { Segment } from "@/components/ui";
import { useDarstellung } from "@/lib/darstellung";
import { frageVon, type Frage } from "@/lib/fragen";
import { gemerktIds, schwierigeIds, useStand } from "@/lib/stand";
import { RAND, schrift } from "@/lib/theme";

type Ansicht = "favoriten" | "fehler";

/** Gemerkte Fragen und Fragen, die noch nicht sitzen. */
export default function Favoriten() {
  const insets = useSafeAreaInsets();
  const { farbwelt: f } = useDarstellung();
  const { stand } = useStand();
  const [ansicht, setAnsicht] = useState<Ansicht>("favoriten");

  const gemerkt = useMemo(() => gemerktIds(stand).map(frageVon).filter((q): q is Frage => Boolean(q)), [stand]);
  const schwierig = useMemo(() => schwierigeIds(stand).map(frageVon).filter((q): q is Frage => Boolean(q)), [stand]);
  const liste = ansicht === "favoriten" ? gemerkt : schwierig;
  const rot = f.hell ? "#E5392C" : "#FF5A4E";

  return (
    <Seite>
      <GrossKopf titel="Favoriten" unter="Gemerkte Fragen und alles, was noch hakt" />
      <ScrollView contentContainerStyle={{ paddingHorizontal: RAND, paddingTop: 14, paddingBottom: insets.bottom + 28, gap: 10 }} showsVerticalScrollIndicator={false}>
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
            <StartKnopf
              titel={ansicht === "favoriten" ? "Favoriten üben" : "Schwierige üben"}
              unter={`${liste.length} ${liste.length === 1 ? "Frage" : "Fragen"}`}
              onPress={() => router.push({ pathname: "/training", params: { modus: ansicht === "favoriten" ? "gemerkt" : "schwierig" } })}
              style={{ marginTop: 6, marginBottom: 8 }}
            />
            {liste.map((q) => {
              const fs = stand.fragen[q.id];
              return (
                <FrageZeile
                  key={q.id}
                  frage={q}
                  rechts={
                    ansicht === "favoriten" ? (
                      <Icon name="heart" size={18} color={f.orange} />
                    ) : (
                      <View style={{ height: 24, paddingHorizontal: 9, borderRadius: 12, justifyContent: "center", backgroundColor: f.hell ? "rgba(229,57,44,0.1)" : "rgba(255,90,78,0.14)" }}>
                        <Text style={{ ...schrift.textHalb, fontSize: 12, color: rot, fontVariant: ["tabular-nums"] }}>{fs?.f ?? 0}× falsch</Text>
                      </View>
                    )
                  }
                />
              );
            })}
          </>
        )}
      </ScrollView>
    </Seite>
  );
}
