import { useState } from "react";
import { Pressable, Text, View } from "react-native";

import type { Hinweis } from "@/components/hinweis";
import { Icon, type IconName } from "@/components/icon";
import { KartenVorschau } from "@/components/karteikarte";
import { Knopf } from "@/components/ui";
import { erfolg, tippen } from "@/lib/haptik";
import { frageKarteId, useStand } from "@/lib/stand";
import { farben, schrift } from "@/lib/theme";

function AktionsKnopf({ icon, titel, marke, aktiv, onPress, label }: { icon: IconName; titel: string; marke?: string; aktiv?: boolean; onPress: () => void; label: string }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => ({
        flex: 1,
        height: 46,
        borderRadius: 14,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 7,
        paddingHorizontal: 10,
        backgroundColor: aktiv ? farben.orangeSoft : farben.flaeche,
        borderWidth: 1,
        borderColor: aktiv ? farben.orangeLinie : farben.linie,
        opacity: pressed ? 0.82 : 1,
        transform: [{ scale: pressed ? 0.98 : 1 }],
      })}
    >
      <Icon name={icon} size={17} color={farben.orange} weight="semibold" />
      <Text numberOfLines={1} style={{ ...schrift.textHalb, fontSize: 15, color: aktiv ? farben.orangeText : farben.text, flexShrink: 1 }}>
        {titel}
      </Text>
      {marke ? (
        <View style={{ paddingHorizontal: 6, height: 18, borderRadius: 9, backgroundColor: farben.flaeche3, justifyContent: "center" }}>
          <Text style={{ ...schrift.textFett, fontSize: 10, letterSpacing: 0.5, color: farben.text2 }}>{marke}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

/**
 * Unter einer Frage: KI-Hilfe (kommt später) und Karteikarte. Der erste Tipp
 * macht aus der Frage eine Karteikarte – Frage vorn, richtige Antwort und
 * Merksatz hinten. Danach öffnet derselbe Knopf die Karte.
 */
export function FrageAktionen({ frageId, onHinweis }: { frageId: string; onHinweis: (h: Hinweis) => void }) {
  const { stand, frageKarteUmschalten } = useStand();
  const [ansehen, setAnsehen] = useState(false);
  const id = frageKarteId(frageId);
  const gespeichert = stand.karteikarten.karten.some((k) => k.id === id);

  return (
    <View style={{ flexDirection: "row", gap: 10 }}>
      <AktionsKnopf
        icon="sparkles"
        titel="KI-Hilfe"
        marke="BALD"
        label="KI-Hilfe, kommt bald"
        onPress={() => {
          tippen();
          onHinweis({ icon: "sparkles", text: "KI-Hilfe kommt bald" });
        }}
      />
      <AktionsKnopf
        icon={gespeichert ? "albums" : "albums-outline"}
        titel={gespeichert ? "Karte ansehen" : "Karteikarte"}
        aktiv={gespeichert}
        label={gespeichert ? "Karteikarte ansehen" : "Karteikarte aus dieser Frage erstellen"}
        onPress={() => {
          if (gespeichert) {
            tippen();
            setAnsehen(true);
            return;
          }
          frageKarteUmschalten(frageId);
          erfolg();
          onHinweis({ icon: "albums", text: "Karteikarte erstellt" });
        }}
      />
      <KartenVorschau id={ansehen ? id : null} onSchliessen={() => setAnsehen(false)}>
        <Knopf
          titel="Entfernen"
          art="gefahr"
          klein
          style={{ flex: 1 }}
          onPress={() => {
            setAnsehen(false);
            frageKarteUmschalten(frageId);
            onHinweis({ icon: "trash-outline", text: "Karteikarte entfernt" });
          }}
        />
        <Knopf titel="Fertig" klein style={{ flex: 1 }} onPress={() => setAnsehen(false)} />
      </KartenVorschau>
    </View>
  );
}
