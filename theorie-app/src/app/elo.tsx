import { useEffect, useState } from "react";
import { ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Lader } from "@/components/lader";
import { FotoKopf, Seite } from "@/components/seite";
import { Avatar, Karte, kartenFlaeche, T } from "@/components/ui";
import { useDarstellung } from "@/lib/darstellung";
import { FOTOS } from "@/lib/fotos";
import { useKonto } from "@/lib/konto";
import { eloRanglisteLaden, type EloEintrag } from "@/lib/online-duell";
import { abstand, farben, mitDeckkraft, RAND } from "@/lib/theme";

/** Farben für Platz 1–3 – Silber im hellen Modus etwas dunkler, damit es auf Weiß trägt. */
const PODEST = [farben.orange, "#C7CDDA", "#B98A5E"];
const PODEST_HELL = [farben.orange, "#8E97A3", "#B07A48"];

/** Top 100 der Rangliste-Duelle nach Elo. */
export default function EloRangliste() {
  const insets = useSafeAreaInsets();
  const { farbwelt: f } = useDarstellung();
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
    <Seite>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + abstand(8) }} showsVerticalScrollIndicator={false}>
        <FotoKopf bild={FOTOS.autobahn} hoehe={210} titel="Top 100 nach Elo" unter="Die besten Duellantinnen und Duellanten" />
        <View style={{ paddingHorizontal: RAND, marginTop: 8, gap: abstand(5) }}>
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
          <Lader color={f.orange} style={{ marginTop: abstand(6) }} />
        ) : !liste || liste.length === 0 ? (
          <T v="text" zentriert style={{ marginTop: abstand(4) }}>
            {session ? "Noch keine gewerteten Duelle – spiel ein Rangliste-Duell und eröffne die Liste." : "Die Elo-Bestenliste siehst du mit Konto."}
          </T>
        ) : (
          <View style={[{ borderRadius: 24, padding: 6 }, kartenFlaeche(f)]}>
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
                    borderRadius: 18,
                    backgroundColor: ichSelbst ? (f.hell ? "#FFF1E8" : farben.flaeche2) : "transparent",
                    borderWidth: 1,
                    borderColor: ichSelbst ? mitDeckkraft(f.orange, 0.5) : "transparent",
                  }}
                >
                  <T v="h3" farbe={e.platz <= 3 ? (f.hell ? PODEST_HELL : PODEST)[e.platz - 1] : f.text3} style={{ width: 34, fontVariant: ["tabular-nums"] }}>
                    {e.platz}
                  </T>
                  <Avatar name={e.name} groesse={36} farbe={e.platz <= 3 ? (f.hell ? PODEST_HELL : PODEST)[e.platz - 1] : f.linieStark} />
                  <View style={{ flex: 1 }}>
                    <T v="textStark" numberOfLines={1}>
                      {ichSelbst ? `${e.name} (du)` : e.name}
                    </T>
                    <T v="klein" numberOfLines={1} style={{ fontSize: 12 }}>
                      @{e.benutzername}
                    </T>
                  </View>
                  <T v="textStark" farbe={ichSelbst ? f.orange : f.text2} style={{ fontVariant: ["tabular-nums"] }}>
                    {e.elo}
                  </T>
                </View>
              );
            })}
          </View>
        )}
        </View>
      </ScrollView>
    </Seite>
  );
}
