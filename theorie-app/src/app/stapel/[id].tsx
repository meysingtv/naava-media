import { useState } from "react";
import { FlatList, Pressable, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Icon, type IconName } from "@/components/icon";
import { FachPunkte, KartenVorschau } from "@/components/karteikarte";
import { StapelSymbol } from "@/components/karteikarten-karte";
import { StartKnopf } from "@/components/home";
import { Seite } from "@/components/seite";
import { kartenFlaeche, Knopf, Kopf, KopfTaste, T } from "@/components/ui";
import { Verkehrszeichen } from "@/components/zeichen";
import { dialog } from "@/components/dialog";
import { useDarstellung, useFarbwelt } from "@/lib/darstellung";
import { istZeichen, themaVon, type ZeichenKey } from "@/lib/fragen";
import { tippen } from "@/lib/haptik";
import { GRUPPE_TITEL, istEingebaut, karteInhalt, naechsteText, stapelInfo, vorneText, type KartenInhalt, type StapelId } from "@/lib/karteikarten";
import { KARTEN_ABSTAENDE, useStand } from "@/lib/stand";
import { farben, schrift } from "@/lib/theme";

const GUELTIG = /^(eigen|zeichen|t:[a-z]+)$/;

/** Kleines Bild vorn in der Zeile: Zeichen, wenn es eins gibt, sonst ein Symbol. */
function Vorschaubild({ inhalt }: { inhalt: KartenInhalt }) {
  const f = useFarbwelt();
  const flaeche = f.hell ? "#F1EDE6" : farben.iconKreis;
  const zeichen: ZeichenKey | undefined =
    inhalt.art === "zeichen" ? inhalt.info.key : inhalt.art === "eigen" ? inhalt.zeichen : istZeichen(inhalt.frage.bild) ? (inhalt.frage.bild as ZeichenKey) : undefined;
  if (zeichen) {
    return (
      <View style={{ width: 42, height: 42, borderRadius: 13, backgroundColor: flaeche, alignItems: "center", justifyContent: "center" }}>
        <Verkehrszeichen zeichen={zeichen} groesse={30} />
      </View>
    );
  }
  const icon: IconName = inhalt.art === "frage" ? (themaVon(inhalt.frage.thema).icon as IconName) : "create-outline";
  return (
    <View style={{ width: 42, height: 42, borderRadius: 13, backgroundColor: flaeche, alignItems: "center", justifyContent: "center" }}>
      <Icon name={icon} size={19} color={f.text2} />
    </View>
  );
}

/** Verteilung der Karten auf die Lernfächer – von „Neu“ bis „sitzt“. */
function Faecher({ ids, faecher }: { ids: string[]; faecher: Record<string, { fach: number }> }) {
  const f = useFarbwelt();
  const gruen = f.hell ? "#23A548" : "#4ED053";
  const rot = f.hell ? "#E5392C" : "#FF5A4E";
  const zahlen = Array.from({ length: KARTEN_ABSTAENDE.length }, () => 0);
  let neu = 0;
  for (const id of ids) {
    const fach = faecher[id];
    if (!fach) neu++;
    else zahlen[fach.fach]++;
  }
  const spalten = [
    { titel: "Neu", n: neu, farbe: f.hell ? "#B8B2A8" : farben.text3 },
    { titel: "Falsch", n: zahlen[0], farbe: rot },
    ...zahlen.slice(1).map((n, i) => ({ titel: `Fach ${i + 1}`, n, farbe: i + 1 >= 3 ? gruen : f.orange })),
  ];
  const max = Math.max(1, ...spalten.map((s) => s.n));
  return (
    <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 6, height: 92 }}>
      {spalten.map((s) => (
        <View key={s.titel} style={{ flex: 1, alignItems: "center", gap: 4 }}>
          <Text style={{ ...schrift.textHalb, fontSize: 12, color: s.n > 0 ? f.text : f.text3, fontVariant: ["tabular-nums"] }}>{s.n}</Text>
          <View style={{ width: "100%", height: 4 + (s.n / max) * 44, borderRadius: 5, backgroundColor: s.n > 0 ? s.farbe : f.hell ? "rgba(20,23,27,0.07)" : "rgba(255,255,255,0.08)" }} />
          <Text numberOfLines={1} style={{ ...schrift.textMittel, fontSize: 10, color: f.text3 }}>
            {s.titel.replace("Fach ", "")}
          </Text>
        </View>
      ))}
    </View>
  );
}

export default function StapelAnsicht() {
  const { id: roh } = useLocalSearchParams<{ id: string }>();
  const id = (roh && GUELTIG.test(roh) ? roh : "eigen") as StapelId;
  const insets = useSafeAreaInsets();
  const { farbwelt: f } = useDarstellung();
  const { stand, karteLoeschen, frageKarteUmschalten } = useStand();
  const [offen, setOffen] = useState<string | null>(null);

  const info = stapelInfo(stand, id);
  const zeilen = info.ids.map((k) => karteInhalt(stand, k)).filter((x): x is KartenInhalt => Boolean(x));
  const dran = info.faellig + (id === "zeichen" ? Math.min(10, info.neu) : info.neu);
  const offenInhalt = offen ? karteInhalt(stand, offen) : null;

  /** Neue Karten: woher sie kommen; gelernte: wann sie wieder dran sind. */
  function unterzeile(k: KartenInhalt): string {
    if (stand.karteikarten.faecher[k.id]) return naechsteText(stand, k.id);
    if (k.art === "zeichen") return GRUPPE_TITEL[k.info.gruppe];
    if (k.art === "frage") return `Frage · ${k.frage.punkte} Punkte`;
    return "Eigene Karte";
  }

  function loeschen(k: KartenInhalt) {
    const frage = k.art === "frage";
    dialog(frage ? "Karte entfernen?" : "Karte löschen?", frage ? "Die Frage bleibt natürlich in der App – nur die Karteikarte verschwindet." : "Die Karte ist danach weg.", [
      { text: "Abbrechen", style: "cancel" },
      {
        text: frage ? "Entfernen" : "Löschen",
        style: "destructive",
        onPress: () => {
          setOffen(null);
          if (k.art === "frage") frageKarteUmschalten(k.frage.id);
          else karteLoeschen(k.id);
        },
      },
    ]);
  }

  const kopfbereich = (
    <View style={{ gap: 16, paddingBottom: 16 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
        <StapelSymbol id={id} groesse={58} />
        <View style={{ flex: 1 }}>
          <T v="titel" style={{ fontSize: 28, lineHeight: 33, letterSpacing: -0.4 }}>
            {info.titel}
          </T>
          <T v="klein" style={{ fontSize: 14 }}>{info.unter}</T>
        </View>
      </View>

      {zeilen.length > 0 ? (
        <>
          <View style={[{ padding: 16, borderRadius: 22, gap: 12 }, kartenFlaeche(f)]}>
            <T v="mini">Lernfächer</T>
            <Faecher ids={info.ids} faecher={stand.karteikarten.faecher} />
          </View>
          <View style={{ gap: 10 }}>
            {dran > 0 ? (
              <StartKnopf titel="Lernen" unter={`${dran} ${dran === 1 ? "Karte" : "Karten"} dran`} onPress={() => router.push({ pathname: "/karten-lernen", params: { stapel: id } })} />
            ) : (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 4 }}>
                <Icon name="checkmark-circle" size={18} color={f.hell ? "#23A548" : "#4ED053"} />
                <T v="textStark" farbe={f.hell ? "#23A548" : "#4ED053"}>
                  Alles wiederholt – die nächsten Karten kommen bald.
                </T>
              </View>
            )}
            <Knopf titel="Alle durchgehen" icon="refresh" art="sekundaer" onPress={() => router.push({ pathname: "/karten-lernen", params: { stapel: id, alle: "1" } })} />
          </View>
        </>
      ) : null}

      <Text style={{ ...schrift.titel, fontSize: 21, lineHeight: 26, color: f.text, marginTop: 10 }}>Karten</Text>
    </View>
  );

  return (
    <Seite>
      <Kopf
        rechts={id === "eigen" ? <KopfTaste icon="add" label="Neue Karte schreiben" onPress={() => router.push("/karte-bearbeiten")} /> : undefined}
      />
      <FlatList
        data={zeilen}
        keyExtractor={(k) => k.id}
        ListHeaderComponent={kopfbereich}
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 6, paddingBottom: insets.bottom + 28 }}
        showsVerticalScrollIndicator={false}
        initialNumToRender={14}
        ListEmptyComponent={
          <View style={{ alignItems: "center", gap: 12, paddingVertical: 36, paddingHorizontal: 20 }}>
            <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: f.orangeSoft, alignItems: "center", justifyContent: "center" }}>
              <Icon name={id === "eigen" ? "create-outline" : "albums-outline"} size={28} color={f.orange} />
            </View>
            <T v="h3" zentriert>
              {id === "eigen" ? "Noch keine eigenen Karten" : "Keine Karten"}
            </T>
            <T v="text" zentriert>
              {id === "eigen" ? "Schreib dir Karten zu allem, was du dir merken willst – vorn die Frage, hinten die Antwort." : "Hier liegen gerade keine Karten."}
            </T>
            {id === "eigen" ? <Knopf titel="Karte schreiben" icon="add" onPress={() => router.push("/karte-bearbeiten")} style={{ alignSelf: "stretch", marginTop: 6 }} /> : null}
          </View>
        }
        renderItem={({ item, index }) => {
          const erste = index === 0;
          const letzte = index === zeilen.length - 1;
          return (
            <Pressable
              onPress={() => {
                tippen();
                setOffen(item.id);
              }}
              style={({ pressed }) => ({
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
                paddingVertical: 12,
                paddingHorizontal: 14,
                backgroundColor: pressed ? (f.hell ? "#F7F4EF" : farben.flaeche2) : f.hell ? "#FFFFFF" : f.flaeche,
                borderColor: f.hell ? "transparent" : f.linie,
                borderLeftWidth: f.hell ? 0 : 1,
                borderRightWidth: f.hell ? 0 : 1,
                borderTopWidth: erste && !f.hell ? 1 : 0,
                borderBottomWidth: letzte && !f.hell ? 1 : 0,
                borderTopLeftRadius: erste ? 22 : 0,
                borderTopRightRadius: erste ? 22 : 0,
                borderBottomLeftRadius: letzte ? 22 : 0,
                borderBottomRightRadius: letzte ? 22 : 0,
              })}
            >
              {!erste ? <View style={{ position: "absolute", top: 0, left: 68, right: 0, height: 1, backgroundColor: f.linie }} /> : null}
              <Vorschaubild inhalt={item} />
              <View style={{ flex: 1, gap: 2 }}>
                <Text numberOfLines={2} style={{ ...schrift.textHalb, fontSize: 15, lineHeight: 20, color: f.text }}>
                  {vorneText(item)}
                </Text>
                <Text style={{ ...schrift.text, fontSize: 12.5, color: f.text3 }}>{unterzeile(item)}</Text>
              </View>
              <FachPunkte fach={stand.karteikarten.faecher[item.id]?.fach ?? null} klein />
            </Pressable>
          );
        }}
      />

      <KartenVorschau id={offen} onSchliessen={() => setOffen(null)}>
        {offenInhalt && !istEingebaut(offenInhalt.id) ? (
          <Knopf titel={offenInhalt.art === "frage" ? "Entfernen" : "Löschen"} art="gefahr" klein style={{ flex: 1 }} onPress={() => loeschen(offenInhalt)} />
        ) : null}
        {offenInhalt?.art === "eigen" ? (
          <Knopf
            titel="Bearbeiten"
            art="sekundaer"
            klein
            style={{ flex: 1 }}
            onPress={() => {
              setOffen(null);
              router.push({ pathname: "/karte-bearbeiten", params: { id: offenInhalt.id } });
            }}
          />
        ) : null}
        {offenInhalt?.art === "frage" ? (
          <Knopf
            titel="Frage üben"
            art="sekundaer"
            klein
            style={{ flex: 1 }}
            onPress={() => {
              setOffen(null);
              router.push({ pathname: "/training", params: { modus: "thema", thema: offenInhalt.frage.thema, start: offenInhalt.frage.id } });
            }}
          />
        ) : null}
        {offenInhalt && istEingebaut(offenInhalt.id) ? <Knopf titel="Fertig" klein style={{ flex: 1 }} onPress={() => setOffen(null)} /> : null}
      </KartenVorschau>
    </Seite>
  );
}
