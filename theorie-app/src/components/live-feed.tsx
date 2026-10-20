import { useEffect, useRef, useState } from "react";
import { FlatList, Pressable, Text, View, type ViewToken } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

import { Glas } from "@/components/glas";
import { LiveSchild, LiveRing, ZuschauerZahl } from "@/components/live";
import { LiveBuehne } from "@/components/live-buehne";
import { NutzerBild } from "@/components/profilbild";
import { tippen } from "@/lib/haptik";
import { liveZugang, type LiveInfo, type LiveZugang } from "@/lib/live";
import { schrift } from "@/lib/theme";

// Laufen zwei Lives (der Inhaber und ein Creator), scrollt man unter „Live“ wie
// durch Clips: Jede Seite zeigt ein Live stumm als Vorschau, Antippen öffnet es
// im Vollbild. Verbunden ist nur die Seite, die gerade zu sehen ist.

const SICHTBAR = { itemVisiblePercentThreshold: 70 };

function LiveVorschau({ live, hoehe, breite, unten, aktiv, onOeffnen }: { live: LiveInfo; hoehe: number; breite: number; unten: number; aktiv: boolean; onOeffnen: () => void }) {
  const [zugang, setZugang] = useState<LiveZugang | null>(null);
  const [bildWeg, setBildWeg] = useState(true);
  const [zuschauer, setZuschauer] = useState<number | null>(null);
  const name = live.gastgeber?.name ?? "Fahrschul Pro";

  useEffect(() => {
    if (!aktiv) {
      setZugang(null);
      setBildWeg(true);
      return;
    }
    let laeuft = true;
    liveZugang("zuschauen", live.id).then((z) => {
      if (laeuft && !("fehler" in z)) setZugang(z);
    });
    return () => {
      laeuft = false;
    };
  }, [aktiv, live.id]);

  return (
    <Pressable
      onPress={() => {
        tippen();
        onOeffnen();
      }}
      accessibilityRole="button"
      accessibilityLabel={`Live von ${name} ansehen`}
      style={{ width: breite, height: hoehe, backgroundColor: "#000000" }}
    >
      {/* Bis das Bild da ist: Profilbild des Gastgebers */}
      <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center" }}>
        <LinearGradient colors={["#2A0A12", "#000000"]} locations={[0, 0.75]} style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }} />
        <NutzerBild pfad={live.gastgeber?.bild_pfad} name={name} farbe={live.gastgeber?.avatar_farbe} groesse={104} rand={0} />
      </View>
      {zugang ? (
        <View pointerEvents="none" style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, opacity: bildWeg ? 0 : 1 }}>
          <LiveBuehne url={zugang.url} token={zugang.token} senden={false} stumm style={{ flex: 1 }} onBildWeg={setBildWeg} onZuschauer={setZuschauer} />
        </View>
      ) : null}

      <LinearGradient pointerEvents="none" colors={["rgba(0,0,0,0)", "rgba(0,0,0,0.65)"]} style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: unten + 260 }} />

      <View pointerEvents="none" style={{ position: "absolute", left: 14, right: 14, bottom: unten + 18, gap: 14 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <LiveRing gastgeber={live.gastgeber} groesse={40} />
          <View style={{ flex: 1, gap: 4 }}>
            <Text numberOfLines={1} style={{ ...schrift.textFett, fontSize: 16, color: "#FFFFFF" }}>
              {name}
            </Text>
            <View style={{ flexDirection: "row", gap: 6 }}>
              <LiveSchild klein />
              {zuschauer != null ? <ZuschauerZahl anzahl={zuschauer} /> : null}
            </View>
          </View>
        </View>
        {live.titel ? (
          <Text numberOfLines={2} style={{ ...schrift.textHalb, fontSize: 15, lineHeight: 20, color: "#FFFFFF" }}>
            {live.titel}
          </Text>
        ) : null}
        <Glas style={{ alignSelf: "center", height: 40, paddingHorizontal: 18, borderRadius: 20, justifyContent: "center" }}>
          <Text style={{ ...schrift.textFett, fontSize: 14, color: "#FFFFFF" }}>Tippen zum Zuschauen</Text>
        </Glas>
      </View>
    </Pressable>
  );
}

export function LiveFeed({
  lives,
  hoehe,
  breite,
  unten,
  aktiv,
  onOeffnen,
}: {
  lives: LiveInfo[];
  hoehe: number;
  breite: number;
  /** Abstand unten, z. B. über der Tab-Leiste. */
  unten: number;
  /** Nur verbinden, solange der Feed zu sehen ist. */
  aktiv: boolean;
  onOeffnen: (id: string) => void;
}) {
  const [aktivId, setAktivId] = useState<string | null>(lives[0]?.id ?? null);
  const sichtbar = lives.some((l) => l.id === aktivId) ? aktivId : (lives[0]?.id ?? null);
  const geaendert = useRef(({ viewableItems }: { viewableItems: ViewToken<LiveInfo>[] }) => {
    const erstes = viewableItems.find((v) => v.isViewable);
    if (erstes?.item) setAktivId(erstes.item.id);
  }).current;

  return (
    <FlatList
      data={lives}
      keyExtractor={(l) => l.id}
      renderItem={({ item }) => <LiveVorschau live={item} hoehe={hoehe} breite={breite} unten={unten} aktiv={aktiv && item.id === sichtbar} onOeffnen={() => onOeffnen(item.id)} />}
      pagingEnabled
      decelerationRate="fast"
      disableIntervalMomentum
      showsVerticalScrollIndicator={false}
      getItemLayout={(_, i) => ({ length: hoehe, offset: hoehe * i, index: i })}
      onViewableItemsChanged={geaendert}
      viewabilityConfig={SICHTBAR}
    />
  );
}
