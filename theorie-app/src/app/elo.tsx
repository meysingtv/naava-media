import { useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Avatar, Karte, Kopf, T } from "@/components/ui";
import { useKonto } from "@/lib/konto";
import { eloRanglisteLaden, type EloEintrag } from "@/lib/online-duell";
import { abstand, farben, radius, RAND } from "@/lib/theme";

const PODEST = [farben.orange, "#C7CDDA", "#B98A5E"];

/** Top 100 der Rangliste-Duelle nach Elo. */
export default function EloRangliste() {
  const insets = useSafeAreaInsets();
  const { session, profil } = useKonto();
  const [liste, setListe] = useState<EloEintrag[] | null | undefined>(undefined);

  useEffect(() => {
    if (!session) {
      setListe(null);
      return;
    }
    eloRanglisteLaden().then(setListe);
  }, [session]);

  const ich = session?.user.id;
  const meinPlatz = liste?.find((e) => e.id === ich)?.platz;

  return (
    <View style={{ flex: 1, backgroundColor: farben.grund }}>
      <Kopf titel="Top 100 nach Elo" />
      <ScrollView contentContainerStyle={{ paddingHorizontal: RAND, paddingBottom: insets.bottom + abstand(8), gap: abstand(5) }}>
        <Karte style={{ flexDirection: "row", alignItems: "center", gap: abstand(4) }}>
          <View style={{ flex: 1, gap: 2 }}>
            <T v="mini">Dein Elo</T>
            <T v="zahl" style={{ fontSize: 34, lineHeight: 38 }}>
              {profil?.elo ?? 1000}
            </T>
          </View>
          <View style={{ alignItems: "flex-end", gap: 2 }}>
            <T v="mini">Platz</T>
            <T v="h2">{meinPlatz ? `#${meinPlatz}` : "–"}</T>
          </View>
        </Karte>

        {liste === undefined ? (
          <ActivityIndicator color={farben.orange} style={{ marginTop: abstand(6) }} />
        ) : !liste || liste.length === 0 ? (
          <T v="text" zentriert style={{ marginTop: abstand(4) }}>
            {session ? "Noch keine gewerteten Duelle – spiel ein Rangliste-Duell und eröffne die Liste." : "Die Elo-Bestenliste siehst du mit Konto."}
          </T>
        ) : (
          <View>
            {liste.map((e) => {
              const ichSelbst = e.id === ich;
              return (
                <View
                  key={e.id}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: abstand(3),
                    paddingVertical: abstand(3),
                    paddingHorizontal: abstand(3.5),
                    borderRadius: radius.m,
                    backgroundColor: ichSelbst ? farben.flaeche2 : "transparent",
                    borderWidth: 1,
                    borderColor: ichSelbst ? farben.orangeLinie : "transparent",
                  }}
                >
                  <T v="h3" farbe={e.platz <= 3 ? PODEST[e.platz - 1] : farben.text3} style={{ width: 34, fontVariant: ["tabular-nums"] }}>
                    {e.platz}
                  </T>
                  <Avatar name={e.name} groesse={36} farbe={e.platz <= 3 ? PODEST[e.platz - 1] : farben.linieStark} />
                  <View style={{ flex: 1 }}>
                    <T v="textStark" numberOfLines={1}>
                      {ichSelbst ? `${e.name} (du)` : e.name}
                    </T>
                    <T v="klein" numberOfLines={1} style={{ fontSize: 12 }}>
                      @{e.benutzername}
                    </T>
                  </View>
                  <T v="textStark" farbe={ichSelbst ? farben.orange : farben.text2} style={{ fontVariant: ["tabular-nums"] }}>
                    {e.elo}
                  </T>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
