import type { ReactNode } from "react";
import { Image, Pressable, Text, View } from "react-native";
import { router } from "expo-router";

import { Icon, type IconName } from "@/components/icon";
import { Kontrollleuchte } from "@/components/leuchten";
import { kartenFlaeche } from "@/components/ui";
import { Verkehrszeichen } from "@/components/zeichen";
import { useFarbwelt } from "@/lib/darstellung";
import { themaFoto } from "@/lib/fotos";
import { istZeichen, themaVon, type Frage, type LeuchteKey, type ZeichenKey } from "@/lib/fragen";
import { tippen } from "@/lib/haptik";
import { leuchten, mitDeckkraft, schrift } from "@/lib/theme";

export type FrageStatus = "neu" | "falsch" | "geuebt" | "sicher";

const STATUS_TEXT: Record<FrageStatus, string> = { neu: "neu", falsch: "falsch", geuebt: "geübt", sicher: "sicher" };

/** Kleines Bild zur Frage: Zeichen, Kontrollleuchte, Lageplan-Symbol oder Themenfoto. */
function Vorschau({ frage }: { frage: Frage }) {
  const f = useFarbwelt();
  const flaeche = { width: 46, height: 46, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: f.hell ? "#F1EDE6" : "rgba(255,255,255,0.06)" } as const;
  if (frage.bild && istZeichen(frage.bild)) {
    return (
      <View style={flaeche}>
        <Verkehrszeichen zeichen={frage.bild as ZeichenKey} groesse={34} />
      </View>
    );
  }
  if (frage.bild?.startsWith("leuchte_")) {
    return (
      <View style={[flaeche, { backgroundColor: "#0B0D10" }]}>
        <Kontrollleuchte leuchte={frage.bild as LeuchteKey} groesse={30} />
      </View>
    );
  }
  if (frage.bild) {
    return (
      <View style={flaeche}>
        <Icon name="map-outline" size={20} color={f.text2} />
      </View>
    );
  }
  return <Image source={themaFoto(frage.thema)} style={{ width: 46, height: 46, borderRadius: 14 }} resizeMode="cover" fadeDuration={0} />;
}

/**
 * Eine Frage als Karte: kleines Bild, Text, Stand und Punkte – öffnet das
 * Training im Thema, beginnend mit dieser Frage.
 */
export function FrageZeile({ frage, status, mitThema = true, rechts }: { frage: Frage; status?: FrageStatus; mitThema?: boolean; rechts?: ReactNode }) {
  const f = useFarbwelt();
  const farbe = status
    ? { neu: f.hell ? "#A3A9B1" : "rgba(255,255,255,0.45)", falsch: f.hell ? "#E5392C" : "#FF5A4E", geuebt: f.orange, sicher: f.hell ? "#23A548" : "#4ED053" }[status]
    : null;
  const unter = [mitThema ? themaVon(frage.thema).titel : null, `${frage.punkte} Punkte`].filter(Boolean).join(" · ");
  return (
    <Pressable
      onPress={() => {
        tippen();
        router.push({ pathname: "/training", params: { modus: "thema", thema: frage.thema, start: frage.id } });
      }}
      accessibilityRole="button"
      accessibilityLabel={frage.text}
      style={({ pressed }) => [
        { flexDirection: "row", alignItems: "center", gap: 13, padding: 12, paddingRight: 14, borderRadius: 20, transform: [{ scale: pressed ? 0.985 : 1 }] },
        kartenFlaeche(f),
      ]}
    >
      <Vorschau frage={frage} />
      <View style={{ flex: 1, gap: 4 }}>
        <Text numberOfLines={2} style={{ ...schrift.textHalb, fontSize: 15, lineHeight: 20, color: f.text }}>
          {frage.text}
        </Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          {status && farbe ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 5, height: 20, paddingHorizontal: 8, borderRadius: 10, backgroundColor: status === "neu" ? (f.hell ? "#F1EDE6" : "rgba(255,255,255,0.07)") : mitDeckkraft(farbe.startsWith("#") ? farbe : "#FFFFFF", 0.13) }}>
              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: farbe }} />
              <Text style={{ ...schrift.textHalb, fontSize: 11.5, color: status === "neu" ? f.text3 : farbe }}>{STATUS_TEXT[status]}</Text>
            </View>
          ) : null}
          <Text style={{ ...schrift.text, fontSize: 12.5, color: f.text3 }} numberOfLines={1}>
            {unter}
          </Text>
        </View>
      </View>
      {rechts ?? <Icon name="chevron-forward" size={16} color={f.text3} />}
    </Pressable>
  );
}

/** Leerer Zustand mit leuchtendem Symbol, Titel und Text. */
export function LeerHinweis({ icon, titel, text }: { icon: IconName; titel: string; text: string }) {
  const f = useFarbwelt();
  return (
    <View style={{ alignItems: "center", gap: 12, paddingVertical: 44, paddingHorizontal: 24 }}>
      <View style={[{ width: 72, height: 72, borderRadius: 36, backgroundColor: f.orangeSoft, borderWidth: 1, borderColor: mitDeckkraft(f.orange, 0.3), alignItems: "center", justifyContent: "center" }, leuchten(f.orange, 0.22, 16, 0)]}>
        <Icon name={icon} size={30} color={f.orange} />
      </View>
      <Text style={{ ...schrift.titelFett, fontSize: 19, color: f.text, textAlign: "center", marginTop: 4 }}>{titel}</Text>
      <Text style={{ ...schrift.text, fontSize: 15, lineHeight: 21, color: f.text2, textAlign: "center" }}>{text}</Text>
    </View>
  );
}
