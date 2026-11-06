import { useState } from "react";
import { Pressable, Share, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";

import { ClipBild } from "@/components/clip-bild";
import { GRUND } from "@/components/lagen";
import { Icon, type IconName } from "@/components/icon";
import { Abschnitt, B, Chip, Kachel, Knopf, Leer, n, Raster, Reiter, Spalte, Symbol, THEMA_TON, TOENE, UnterKopf, type Ton, type Zustand } from "@/components/web/bunt";
import { useTasten } from "@/components/web/frage-web";
import { TastenKappe } from "@/components/web/karteikarten-web";
import { WebSeite } from "@/components/web/rahmen";
import { CLIPS, type Clip } from "@/lib/clips";
import { themaVon } from "@/lib/fragen";
import { useStand } from "@/lib/stand";

// Kurz erklärt am PC: oben der gewählte Clip – links die bewegte Grafik,
// rechts Titel, die drei Sätze und die Aktionen –, darunter alle Clips als
// Raster. Pfeiltasten blättern.

type Ansicht = "alle" | "gemerkt";

/** Runde Aktion mit Rand: Gefällt mir, Merken, Teilen. */
function Aktion({ icon, text, aktiv, ton, onPress, label }: { icon: IconName; text?: string; aktiv?: boolean; ton: Ton; onPress: () => void; label: string }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityLabel={label}
      accessibilityState={{ selected: aktiv }}
      style={(z: Zustand) => ({
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 7,
        minWidth: 44,
        height: 44,
        paddingHorizontal: text ? 14 : 0,
        borderRadius: 14,
        borderWidth: 1.5,
        borderBottomWidth: 3,
        borderColor: aktiv ? ton.farbe : z.hovered ? B.kante : B.linie,
        borderBottomColor: aktiv ? ton.kante : B.kante,
        backgroundColor: aktiv ? ton.hell : B.flaeche,
      })}
    >
      <Icon name={icon} size={20} color={aktiv ? ton.farbe : B.text2} />
      {text ? <Text style={{ ...n.fett, fontSize: 14, color: aktiv ? ton.kante : B.text2, fontVariant: ["tabular-nums"] }}>{text}</Text> : null}
    </Pressable>
  );
}

/** Kleiner runder Pfeil zum Blättern. */
function Blaettern({ icon, label, onPress }: { icon: IconName; label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityLabel={label} style={(z: Zustand) => ({ width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center", backgroundColor: z.hovered ? B.ton : "transparent" })}>
      <Icon name={icon} size={20} color={B.text2} />
    </Pressable>
  );
}

function ClipKachel({ clip, aktiv, gemerkt, onPress }: { clip: Clip; aktiv: boolean; gemerkt: boolean; onPress: () => void }) {
  const thema = themaVon(clip.thema);
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: aktiv }}
      style={(z: Zustand) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: 14,
        height: 84,
        paddingHorizontal: 16,
        borderRadius: 16,
        borderWidth: aktiv ? 2 : 1.5,
        borderColor: aktiv ? B.orange : z.hovered ? B.kante : B.linie,
        borderBottomWidth: aktiv ? 4 : 3,
        borderBottomColor: aktiv ? B.orangeKante : B.kante,
        backgroundColor: z.hovered && !aktiv ? B.hover : B.flaeche,
      })}
    >
      <Symbol icon={thema.icon as IconName} ton={THEMA_TON[clip.thema]} groesse={42} />
      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
        <Text numberOfLines={2} style={{ ...n.fett, fontSize: 14.5, lineHeight: 19, color: B.text }}>
          {clip.titel}
        </Text>
        <Text numberOfLines={1} style={{ ...n.halb, fontSize: 13, color: B.text3 }}>
          {clip.kategorie}
        </Text>
      </View>
      {gemerkt ? <Icon name="bookmark" size={17} color={B.blau} /> : null}
    </Pressable>
  );
}

export function KurzErklaertWeb() {
  const { stand, clipUmschalten } = useStand();
  const { start } = useLocalSearchParams<{ start?: string }>();
  const [ansicht, setAnsicht] = useState<Ansicht>("alle");
  const [gewaehlt, setGewaehlt] = useState<string>(() => (start && CLIPS.some((c) => c.id === start) ? start : CLIPS[0].id));
  const [breite, setBreite] = useState(0);
  const [kopiert, setKopiert] = useState(false);

  const liste = ansicht === "alle" ? CLIPS : CLIPS.filter((c) => stand.clips.gemerkt.includes(c.id));
  const clip = liste.find((c) => c.id === gewaehlt) ?? liste[0] ?? null;
  const index = clip ? liste.indexOf(clip) : -1;

  function waehlen(id: string) {
    setGewaehlt(id);
    setKopiert(false);
  }

  function blaettern(schritt: number) {
    if (!liste.length) return;
    waehlen(liste[(index + schritt + liste.length) % liste.length].id);
  }

  useTasten((e) => {
    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      e.preventDefault();
      blaettern(1);
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      e.preventDefault();
      blaettern(-1);
    }
  });

  function teilen(c: Clip) {
    const text = `${c.titel}\n\n• ${c.punkte.join("\n• ")}\n\nAus der App Fahrschul Pro`;
    Share.share({ message: text }).catch(() => {
      // Ohne Teilen-Menü im Browser: in die Zwischenablage.
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        navigator.clipboard.writeText(text).then(
          () => setKopiert(true),
          () => {},
        );
      }
    });
  }

  // Bild links, Text rechts – das Bild bekommt gut die Hälfte der Breite.
  const bildBreite = breite ? Math.round(Math.min(560, breite * 0.52)) : 0;
  const gemocht = clip ? stand.clips.gemocht.includes(clip.id) : false;
  const gemerkt = clip ? stand.clips.gemerkt.includes(clip.id) : false;

  return (
    <WebSeite ohneRechts>
      <Spalte>
        <UnterKopf
          titel="Kurz erklärt"
          unter="Die wichtigsten Regeln in drei Sätzen – mit bewegter Grafik"
          rechts={
            <Reiter
              optionen={[
                { id: "alle" as Ansicht, titel: "Für dich", zahl: CLIPS.length },
                { id: "gemerkt" as Ansicht, titel: "Gemerkt", zahl: stand.clips.gemerkt.length },
              ]}
              wert={ansicht}
              onWechsel={setAnsicht}
            />
          }
        />

        {!clip ? (
          <Kachel>
            <Leer icon="bookmark" ton={TOENE.blau} titel="Noch nichts gemerkt" text="Klick bei einem Clip auf das Lesezeichen – dann findest du ihn hier wieder.">
              <Knopf titel="Alle Clips ansehen" art="rand" ton="blau" onPress={() => setAnsicht("alle")} />
            </Leer>
          </Kachel>
        ) : (
          <>
            <View onLayout={(e) => setBreite(e.nativeEvent.layout.width)}>
              <Kachel style={{ flexDirection: "row" }}>
                {bildBreite ? (
                  <View style={{ width: bildBreite, justifyContent: "center", backgroundColor: GRUND }}>
                    <ClipBild key={clip.id} bild={clip.bild} breite={bildBreite} aktiv />
                  </View>
                ) : null}
                <View style={{ flex: 1, minWidth: 0, padding: 28, gap: 18 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                    <Chip icon={themaVon(clip.thema).icon as IconName} text={clip.kategorie} ton={THEMA_TON[clip.thema]} />
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                      <Blaettern icon="chevron-back" label="Vorheriger Clip" onPress={() => blaettern(-1)} />
                      <Text style={{ ...n.fett, fontSize: 14, color: B.text3, fontVariant: ["tabular-nums"], minWidth: 40, textAlign: "center" }}>
                        {index + 1} / {liste.length}
                      </Text>
                      <Blaettern icon="chevron-forward" label="Nächster Clip" onPress={() => blaettern(1)} />
                    </View>
                  </View>
                  <Text style={{ ...n.schwarz, fontSize: 26, lineHeight: 32, color: B.text }}>{clip.titel}</Text>
                  <View style={{ gap: 14 }}>
                    {clip.punkte.map((p, i) => (
                      <View key={i} style={{ flexDirection: "row", gap: 12, alignItems: "flex-start" }}>
                        <View style={{ width: 26, height: 26, borderRadius: 13, marginTop: 1, backgroundColor: B.orangeHell, alignItems: "center", justifyContent: "center" }}>
                          <Text style={{ ...n.schwarz, fontSize: 13, color: B.orangeKante }}>{i + 1}</Text>
                        </View>
                        <Text style={{ flex: 1, ...n.halb, fontSize: 16, lineHeight: 24, color: B.text }}>{p}</Text>
                      </View>
                    ))}
                  </View>
                  <View style={{ flex: 1 }} />
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                    <Knopf titel="Thema üben" icon="play" onPress={() => router.push({ pathname: "/training", params: { modus: "thema", thema: clip.thema } })} />
                    <Aktion icon={gemocht ? "heart" : "heart-outline"} aktiv={gemocht} ton={TOENE.pink} text={String(clip.basis + (gemocht ? 1 : 0))} label="Gefällt mir" onPress={() => clipUmschalten(clip.id, "gemocht")} />
                    <Aktion icon={gemerkt ? "bookmark" : "bookmark-outline"} aktiv={gemerkt} ton={TOENE.blau} label="Merken" onPress={() => clipUmschalten(clip.id, "gemerkt")} />
                    <Aktion icon={kopiert ? "checkmark" : "share-outline"} aktiv={kopiert} ton={TOENE.gruen} text={kopiert ? "Kopiert" : undefined} label="Teilen" onPress={() => teilen(clip)} />
                  </View>
                </View>
              </Kachel>
            </View>

            <View>
              <Abschnitt titel={ansicht === "alle" ? "Alle Clips" : "Gemerkte Clips"} link={`${liste.length} ${liste.length === 1 ? "Clip" : "Clips"}`} />
              <Raster min={300} abstand={12}>
                {liste.map((c) => (
                  <ClipKachel key={c.id} clip={c} aktiv={c.id === clip.id} gemerkt={stand.clips.gemerkt.includes(c.id)} onPress={() => waehlen(c.id)} />
                ))}
              </Raster>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, marginTop: 18 }}>
                <TastenKappe text="←" />
                <TastenKappe text="→" />
                <Text style={{ ...n.halb, fontSize: 13, color: B.text3 }}>zum vorherigen oder nächsten Clip</Text>
              </View>
            </View>
          </>
        )}
      </Spalte>
    </WebSeite>
  );
}
