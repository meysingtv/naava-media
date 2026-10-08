import { ScrollView, View } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { PersonZeile } from "@/components/creator-teile";
import { Lader } from "@/components/lader";
import { GrossKopf, Seite } from "@/components/seite";
import { Abschnitt, Gruppe, Knopf, T } from "@/components/ui";
import { useClipRechte, vorZeit } from "@/lib/clips-server";
import { STATUS_TEXT, useBewerbungen, type Bewerbung } from "@/lib/creator";
import { useFarbwelt } from "@/lib/darstellung";
import { abstand, farben, RAND } from "@/lib/theme";

// Nur für den Inhaber: alle Creator-Bewerbungen in Echtzeit, nach Stand
// gruppiert. Antippen öffnet die Bewerbung mit allen Angaben und Aktionen.

function Liste({ titel, eintraege, rechts }: { titel: string; eintraege: Bewerbung[]; rechts: (b: Bewerbung) => string }) {
  if (!eintraege.length) return null;
  return (
    <View>
      <Abschnitt titel={`${titel} · ${eintraege.length}`} klein />
      <Gruppe>
        {eintraege.map((b) => (
          <PersonZeile
            key={b.id}
            name={b.name || b.benutzername || "Unbekannt"}
            unter={[`${b.alter_jahre} Jahre`, b.beruf, b.ort].filter(Boolean).join(" · ")}
            rechts={b.live_id ? "LIVE" : rechts(b)}
            rechtsRot={!!b.live_id}
            bild={b.bild_pfad}
            benutzername={b.benutzername}
            farbe={b.avatar_farbe}
            onPress={() => router.push({ pathname: "/creator-detail", params: { id: b.id } })}
          />
        ))}
      </Gruppe>
    </View>
  );
}

function Inhalt() {
  const f = useFarbwelt();
  const insets = useSafeAreaInsets();
  const rechte = useClipRechte();
  const { liste, fehler, neuLaden } = useBewerbungen(rechte.inhaber);
  const inhalt = { paddingHorizontal: RAND, paddingTop: abstand(4), paddingBottom: insets.bottom + abstand(10), gap: abstand(7) };

  if (!rechte.inhaber) {
    return (
      <>
        <GrossKopf titel="Creator" />
        <ScrollView contentContainerStyle={inhalt}>
          <T v="text">Nur für den Inhaber der App.</T>
        </ScrollView>
      </>
    );
  }

  const alle = liste ?? [];
  const offen = alle.filter((b) => b.status === "offen");
  const creator = alle.filter((b) => b.status === "angenommen");
  const archiv = alle.filter((b) => b.status !== "offen" && b.status !== "angenommen");

  return (
    <>
      <GrossKopf titel="Creator" />
      <ScrollView contentContainerStyle={inhalt}>
        {liste == null ? (
          fehler ? (
            <View style={{ gap: abstand(3) }}>
              <T v="klein" farbe={farben.rot}>
                {fehler}
              </T>
              <Knopf titel="Nochmal laden" klein art="sekundaer" onPress={neuLaden} />
            </View>
          ) : (
            <Lader color={f.text3} style={{ alignSelf: "center", marginTop: 30 }} />
          )
        ) : (
          <>
            <T v="klein">Angenommene Creator dürfen live gehen und Clips hochladen. Änderungen gelten sofort.</T>
            {alle.length === 0 ? <T v="text">Noch keine Bewerbungen.</T> : null}
            <Liste titel="Offen" eintraege={offen} rechts={(b) => vorZeit(b.erstellt_am)} />
            <Liste titel="Creator" eintraege={creator} rechts={() => ""} />
            <Liste titel="Erledigt" eintraege={archiv} rechts={(b) => STATUS_TEXT[b.status]} />
          </>
        )}
      </ScrollView>
    </>
  );
}

export default function CreatorVerwaltung() {
  return (
    <Seite>
      <Inhalt />
    </Seite>
  );
}
