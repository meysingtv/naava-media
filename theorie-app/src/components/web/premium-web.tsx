import { useState } from "react";
import { Pressable, Text, View } from "react-native";

import { dialog } from "@/components/dialog";
import { Icon, type IconName } from "@/components/icon";
import { B, Kachel, Knopf, ListenZeile, n, Spalte, TOENE, UnterKopf, type Ton, type Zustand } from "@/components/web/bunt";
import { WebSeite } from "@/components/web/rahmen";

// Premium am PC: links, was drin ist, rechts die drei Pläne zur Auswahl und
// der Knopf, um beim Start Bescheid zu bekommen.

const VORTEILE: { icon: IconName; ton: Ton; titel: string; unter?: string }[] = [
  { icon: "library", ton: TOENE.blau, titel: "Der komplette amtliche Fragenkatalog" },
  { icon: "videocam", ton: TOENE.pink, titel: "Alle Bild- und Videofragen" },
  { icon: "school", ton: TOENE.gruen, titel: "Prüfungssimulationen ohne Grenzen", unter: "mit Auswertung je Thema" },
  { icon: "stats-chart", ton: TOENE.indigo, titel: "Deine Lernkurve", unter: "und Prognose bis zur Prüfung" },
  { icon: "people", ton: TOENE.koralle, titel: "Duelle gegen Freunde" },
];

const PLAENE = [
  { id: "monat", titel: "1 Monat", preis: "5,99 €", unter: "monatlich kündbar" },
  { id: "drei", titel: "3 Monate", preis: "12,99 €", unter: "4,33 € pro Monat" },
  { id: "sechs", titel: "Bis zur Prüfung · 6 Monate", preis: "19,99 €", unter: "3,33 € pro Monat", beliebt: true },
];

export function PremiumWeb() {
  const [plan, setPlan] = useState("sechs");

  return (
    <WebSeite ohneRechts>
      <Spalte>
        <UnterKopf titel="Mehr Tempo bis zur Prüfung." unter="Alles aus der kostenlosen Version – plus alles, was dich sicher durch die Prüfung bringt." />

        <View style={{ flexDirection: "row", gap: 24, flexWrap: "wrap", alignItems: "flex-start" }}>
          <View style={{ flex: 1, minWidth: 380, gap: 14 }}>
            <Text style={{ ...n.schwarz, fontSize: 20, color: B.text }}>Das ist drin</Text>
            <Kachel>
              {VORTEILE.map((v, i) => (
                <ListenZeile key={v.titel} icon={v.icon} ton={v.ton} titel={v.titel} unter={v.unter} oben={i > 0} />
              ))}
            </Kachel>
          </View>

          <View style={{ flex: 1, minWidth: 380, gap: 14 }}>
            <Text style={{ ...n.schwarz, fontSize: 20, color: B.text }}>Dein Plan</Text>
            <View style={{ gap: 12 }}>
              {PLAENE.map((p) => (
                <PlanKarte key={p.id} titel={p.titel} unter={p.unter} preis={p.preis} beliebt={"beliebt" in p && Boolean(p.beliebt)} aktiv={p.id === plan} onPress={() => setPlan(p.id)} />
              ))}
            </View>
            <Knopf titel="Beim Start Bescheid geben" icon="notifications" groesse="gross" onPress={() => dialog("Vorgemerkt", "Sobald Premium startet, siehst du es hier in der App.")} style={{ marginTop: 6 }} />
            <Text style={{ ...n.halb, fontSize: 13.5, lineHeight: 19, color: B.text3, textAlign: "center" }}>Premium startet bald. Der Kauf läuft dann über deinen App-Store-Account und ist jederzeit kündbar.</Text>
          </View>
        </View>
      </Spalte>
    </WebSeite>
  );
}

/** Ein Plan zum Auswählen: Kreis, Titel, Preis – gewählt mit orangem Rand. */
function PlanKarte({ titel, unter, preis, beliebt, aktiv, onPress }: { titel: string; unter: string; preis: string; beliebt: boolean; aktiv: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ checked: aktiv }}
      accessibilityLabel={`${titel}, ${preis}`}
      style={(z: Zustand) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: 16,
        minHeight: 76,
        paddingHorizontal: 20,
        paddingVertical: 14,
        borderRadius: 18,
        borderWidth: aktiv ? 2 : 1.5,
        borderColor: aktiv ? B.orange : z.hovered ? B.kante : B.linie,
        borderBottomWidth: 3,
        borderBottomColor: aktiv ? B.orangeKante : B.kante,
        backgroundColor: z.hovered && !aktiv ? B.hover : B.flaeche,
      })}
    >
      <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: aktiv ? B.orange : B.text3, alignItems: "center", justifyContent: "center" }}>
        {aktiv ? <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: B.orange }} /> : null}
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={{ ...n.schwarz, fontSize: 16.5, color: B.text }} numberOfLines={1}>
          {titel}
        </Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 1 }}>
          <Text style={{ ...n.halb, fontSize: 13.5, color: B.text2 }}>{unter}</Text>
          {beliebt ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4, height: 22, paddingHorizontal: 8, borderRadius: 11, backgroundColor: B.orangeHell }}>
              <Icon name="star" size={11} color={B.orange} />
              <Text style={{ ...n.fett, fontSize: 12, color: B.orangeKante }}>Beliebt</Text>
            </View>
          ) : null}
        </View>
      </View>
      <Text style={{ ...n.schwarz, fontSize: 18, color: B.text, fontVariant: ["tabular-nums"] }}>{preis}</Text>
    </Pressable>
  );
}
