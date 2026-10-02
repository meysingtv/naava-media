import { ScrollView, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { KopfPille } from "@/components/frage-rahmen";
import { FrageZeile, type FrageStatus } from "@/components/frage-liste";
import { Kopfzeile, StartKnopf } from "@/components/home";
import { FotoKopf, Seite, StandKarte } from "@/components/seite";
import { Knopf } from "@/components/ui";
import { useDarstellung } from "@/lib/darstellung";
import { fragenZuThema, themaVon, type ThemaId } from "@/lib/fragen";
import { themaFoto } from "@/lib/fotos";
import { fortschritt, themaStatistik, useStand } from "@/lib/stand";
import { RAND } from "@/lib/theme";

// Ein Thema im Kino-Look: Titelfoto, Stand als Ring mit Werten, Startknopf und
// alle Fragen als Karten mit ihrem Stand.

export default function ThemaSeite() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { farbwelt: f } = useDarstellung();
  const { stand } = useStand();
  const thema = themaVon(id as ThemaId);
  const fragen = fragenZuThema(thema.id);
  const stat = themaStatistik(stand, thema.id);
  const fort = fortschritt(stand, fragen);

  const status = (frageId: string): FrageStatus => {
    const fs = stand.fragen[frageId];
    if (!fs || fs.r + fs.f === 0) return "neu";
    if (fs.l === 0) return "falsch";
    if (fs.box >= 3) return "sicher";
    return "geuebt";
  };

  return (
    <Seite>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 32 }} showsVerticalScrollIndicator={false}>
        <FotoKopf bild={themaFoto(thema.id)} hoehe={280} titel={thema.titel} unter={thema.kurz} ueber={<View style={{ flexDirection: "row" }}><KopfPille icon="book-outline" text={`${stat.gesamt} Fragen`} /></View>} />

        <View style={{ paddingHorizontal: RAND, marginTop: 10, gap: 14 }}>
          <StandKarte
            anteil={fort.anteil}
            werte={[
              { wert: stat.gesehen, label: "gesehen" },
              { wert: stat.sicher, label: "sicher", farbe: f.hell ? "#23A548" : "#4ED053" },
              { wert: stat.fehler, label: "Fehler offen", farbe: stat.fehler > 0 ? (f.hell ? "#E5392C" : "#FF5A4E") : undefined },
            ]}
          />
          <StartKnopf titel="Thema lernen" unter={`${stat.gesamt} Fragen · offene zuerst`} onPress={() => router.push({ pathname: "/training", params: { modus: "thema", thema: thema.id } })} />
          {stat.fehler > 0 ? (
            <Knopf titel={`Nur Fehler üben (${stat.fehler})`} icon="refresh" art="sekundaer" onPress={() => router.push({ pathname: "/training", params: { modus: "fehler", thema: thema.id } })} />
          ) : null}
        </View>

        <Kopfzeile titel="Alle Fragen" link={`${stat.sicher} von ${stat.gesamt} sicher`} style={{ marginTop: 30 }} />
        <View style={{ paddingHorizontal: RAND, gap: 10 }}>
          {fragen.map((q) => (
            <FrageZeile key={q.id} frage={q} status={status(q.id)} mitThema={false} />
          ))}
        </View>
      </ScrollView>
    </Seite>
  );
}
