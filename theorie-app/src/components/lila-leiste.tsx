import { useSyncExternalStore } from "react";
import { Pressable, Text, View } from "react-native";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Icon, type IconName } from "@/components/icon";
import { lilaSchrift, useLila } from "@/components/lila-teile";
import { FRAGEN_AKTIV } from "@/lib/funktionen";
import { tippen } from "@/lib/haptik";
import { useLive } from "@/lib/live";

// Untere Leiste im lila Design: weiß mit feiner Linie oben, der aktive Reiter
// sitzt in einer zartlila Kapsel. Gleich auf iPhone, Android und im Browser
// (am PC navigiert die Seitenleiste links).

export const LEISTE_HOEHE = 64;

// Clips meldet, ob gerade ein Video im Vollbild läuft – nur dann ist die Leiste dunkel.
let clipsVideo = false;
const clipsHoerer = new Set<() => void>();
export function clipsVideoSetzen(an: boolean) {
  if (an === clipsVideo) return;
  clipsVideo = an;
  clipsHoerer.forEach((h) => h());
}
function useClipsVideo(): boolean {
  return useSyncExternalStore(
    (h) => {
      clipsHoerer.add(h);
      return () => clipsHoerer.delete(h);
    },
    () => clipsVideo,
  );
}

type Reiter = { name: string; titel: string; an: IconName; aus: IconName };

const REITER: Reiter[] = [
  { name: "heute", titel: "Home", an: "home", aus: "home-outline" },
  { name: "coach", titel: "Coach", an: "school", aus: "school-outline" },
  { name: "lernen", titel: "Lernen", an: "book", aus: "book-outline" },
  { name: "clips", titel: "Clips", an: "tv", aus: "tv-outline" },
  ...(FRAGEN_AKTIV ? [{ name: "pruefen", titel: "Prüfung", an: "shield-checkmark", aus: "shield-checkmark-outline" } as Reiter] : []),
  { name: "profil", titel: "Profil", an: "person-circle", aus: "person-circle-outline" },
];

/** Die Leiste selbst. `dunkel` erzwingt die dunkle Fassung (z. B. über den Clips). */
export function LilaLeiste({ aktiv, onWahl, dunkel }: { aktiv: string; onWahl: (name: string) => void; dunkel?: boolean }) {
  const insets = useSafeAreaInsets();
  const l0 = useLila();
  const l = dunkel ? { ...l0, karte: "#0F1018", linie: "#22232F", tinte: "#FFFFFF", tinte2: "#B9B6CA", lilaZart: "#2A2550" } : l0;
  const { live } = useLive();
  return (
    <View style={{ backgroundColor: l.karte, borderTopWidth: 1, borderTopColor: l.linie, paddingBottom: insets.bottom, paddingTop: 7, paddingHorizontal: 10, flexDirection: "row" }}>
      {REITER.map((r) => {
        const an = r.name === aktiv;
        return (
          <Pressable
            key={r.name}
            onPress={() => {
              tippen();
              onWahl(r.name);
            }}
            accessibilityRole="tab"
            accessibilityState={{ selected: an }}
            accessibilityLabel={r.titel}
            style={{ flex: 1, alignItems: "center" }}
          >
            <View style={{ width: "92%", maxWidth: 74, height: LEISTE_HOEHE - 14, borderRadius: 16, alignItems: "center", justifyContent: "center", gap: 2, backgroundColor: an ? l.lilaZart : "transparent" }}>
              <View>
                <Icon name={an ? r.an : r.aus} size={24} color={an ? l.lila : l.tinte2} />
                {r.name === "clips" && live ? <View style={{ position: "absolute", top: -1, right: -3, width: 9, height: 9, borderRadius: 5, backgroundColor: "#FF3B30", borderWidth: 1.5, borderColor: l.karte }} /> : null}
              </View>
              <Text style={{ ...(an ? lilaSchrift.textHalb : lilaSchrift.textMittel), fontSize: 11.5, color: an ? l.lila : l.tinte2 }}>{r.titel}</Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Für den Tab-Navigator. */
export function LilaTabLeiste({ state, navigation }: BottomTabBarProps) {
  const aktiv = state.routes[state.index]?.name ?? "heute";
  const video = useClipsVideo();
  return (
    <LilaLeiste
      aktiv={aktiv}
      dunkel={false && video}
      onWahl={(name) => {
        const route = state.routes.find((r) => r.name === name);
        if (!route) return;
        const ereignis = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
        if (route.key !== state.routes[state.index]?.key && !ereignis.defaultPrevented) navigation.navigate(route.name, route.params);
      }}
    />
  );
}

/** Auf Unterseiten (z. B. Thema, Verkehrszeichen): dieselbe Leiste, sie führt zurück zu den Reitern. */
export function LilaLeisteSeite({ aktiv }: { aktiv: string }) {
  return <LilaLeiste aktiv={aktiv} onWahl={(name) => router.navigate(`/${name}` as never)} />;
}
