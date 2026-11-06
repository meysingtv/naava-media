import { useEffect, useMemo, useRef, useState } from "react";
import { Text, View } from "react-native";
import { router } from "expo-router";

import { dialog } from "@/components/dialog";
import { Icon } from "@/components/icon";
import { Lader } from "@/components/lader";
import { B, Balken, Eingabe, Kachel, Knopf, Leer, n, Raster, Reiter, Spalte, TOENE, UnterKopf, type Ton } from "@/components/web/bunt";
import { WebSeite } from "@/components/web/rahmen";
import { FrageBild } from "@/components/web/thema-web";
import { useClipRechte } from "@/lib/clips-server";
import { animationFuer } from "@/lib/erklaer-animationen";
import { erklaervideoHochladenDatei, erklaervideoLoeschen, erklaervideosLaden, useErklaervideos } from "@/lib/erklaervideos";
import { FRAGEN, themaVon, type Frage } from "@/lib/fragen";
import { erfolg } from "@/lib/haptik";
import { videoDauer, videoPruefen } from "@/lib/web-hochladen";

// Erklärvideos am PC (nur für den Inhaber): oben die Zahlen, darunter Suche
// und Filter, dann alle Fragen als Liste – jede mit ihren Knöpfen direkt in
// der Zeile (Ansehen, Hochladen, Löschen). Hochgeladen wird wie im Manager
// über den Datei-Dialog des Browsers, mit Fortschritt in der Zeile.

type Filter = "alle" | "video" | "ohne" | "animation";

type Hochladen = { frageId: string; anteil: number };

function dauerText(sek: number | null): string | null {
  if (!sek) return null;
  const s = Math.round(sek);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/** Datei-Dialog des Browsers öffnen. */
function dateiWaehlen(): Promise<File | null> {
  return new Promise((fertig) => {
    const feld = document.createElement("input");
    feld.type = "file";
    feld.accept = "video/mp4,video/quicktime,.mp4,.mov";
    feld.onchange = () => fertig(feld.files?.[0] ?? null);
    feld.click();
  });
}

function Zahl({ icon, ton, wert, titel }: { icon: "help-circle" | "play-circle" | "film"; ton: Ton; wert: number; titel: string }) {
  return (
    <Kachel style={{ padding: 18, flexDirection: "row", alignItems: "center", gap: 14 }}>
      <Icon name={icon} size={30} color={ton.farbe} />
      <View>
        <Text style={{ ...n.schwarz, fontSize: 22, color: B.text, fontVariant: ["tabular-nums"] }}>{wert}</Text>
        <Text style={{ ...n.halb, fontSize: 13, color: B.text2 }}>{titel}</Text>
      </View>
    </Kachel>
  );
}

/** Kleine Marke: Punkt und Text. */
function Marke({ farbe, text }: { farbe: string; text: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: farbe }} />
      <Text style={{ ...n.fett, fontSize: 13, color: B.text2 }}>{text}</Text>
    </View>
  );
}

export function ErklaervideosWeb() {
  const rechte = useClipRechte();
  const { geladen, videos } = useErklaervideos();
  const [suche, setSuche] = useState("");
  const [filter, setFilter] = useState<Filter>("alle");
  const [laeuft, setLaeuft] = useState<Hochladen | null>(null);
  const abbruch = useRef<{ aktuell: (() => void) | null }>({ aktuell: null });

  // Liste frisch holen; beim Verlassen ein laufendes Hochladen abbrechen.
  useEffect(() => {
    erklaervideosLaden();
    const a = abbruch.current;
    return () => a.aktuell?.();
  }, []);

  const zahlen = useMemo(
    () => ({
      video: FRAGEN.filter((fr) => videos[fr.id]).length,
      animation: FRAGEN.filter((fr) => animationFuer(fr)).length,
    }),
    [videos],
  );

  const liste = useMemo(() => {
    const q = suche.trim().toLowerCase();
    return FRAGEN.filter((fr) => {
      const v = Boolean(videos[fr.id]);
      if (filter === "video" && !v) return false;
      if (filter === "ohne" && v) return false;
      if (filter === "animation" && !animationFuer(fr)) return false;
      if (!q) return true;
      return fr.id.toLowerCase() === q || fr.text.toLowerCase().includes(q) || themaVon(fr.thema).titel.toLowerCase().includes(q);
    });
  }, [suche, filter, videos]);

  async function hochladen(fr: Frage) {
    if (laeuft) {
      dialog("Einen Moment", "Es wird gerade schon ein Video hochgeladen.");
      return;
    }
    const d = await dateiWaehlen();
    if (!d) return;
    const problem = videoPruefen(d);
    if (problem) {
      dialog("Video passt nicht", problem);
      return;
    }
    const dauer = await videoDauer(d);
    if (dauer && dauer > 5 * 60) {
      dialog("Video zu lang", "Höchstens 5 Minuten. Kürze das Video und wähle es dann erneut.");
      return;
    }
    setLaeuft({ frageId: fr.id, anteil: 0 });
    try {
      await erklaervideoHochladenDatei({ frageId: fr.id, datei: d, dauer, onFortschritt: (a) => setLaeuft({ frageId: fr.id, anteil: a }), abbruch: abbruch.current });
      setLaeuft(null);
      erfolg();
      dialog("Video ist online", `Beim Lernen zeigt Frage ${fr.id.toUpperCase()} jetzt neben der KI-Hilfe den Play-Knopf.`);
    } catch (e) {
      setLaeuft(null);
      const text = (e as Error).message;
      if (/abgebrochen|cancel|abort/i.test(text)) return;
      dialog("Hochladen hat nicht geklappt", text);
    }
  }

  function loeschen(fr: Frage) {
    dialog(`Video zu ${fr.id.toUpperCase()} löschen?`, animationFuer(fr) ? "Beim Lernen bleibt dann nur die eingebaute Animation." : "Beim Lernen verschwindet dann der Play-Knopf bei dieser Frage.", [
      { text: "Abbrechen", style: "cancel" },
      {
        text: "Löschen",
        style: "destructive",
        onPress: async () => {
          try {
            await erklaervideoLoeschen(fr.id);
          } catch (e) {
            dialog("Nicht gelöscht", (e as Error).message);
          }
        },
      },
    ]);
  }

  const ansehen = (fr: Frage, art: "video" | "animation") => router.push({ pathname: "/erklaerung", params: { frage: fr.id, art } });

  if (!rechte.inhaber) {
    return (
      <WebSeite ohneRechts>
        <Spalte>
          <UnterKopf titel="Erklärvideos" />
          <Kachel>
            <Leer icon="lock-closed" ton={TOENE.orange} titel="Nur für den Inhaber" text="Hier lädt der Inhaber der App Erklärvideos zu einzelnen Fragen hoch." />
          </Kachel>
        </Spalte>
      </WebSeite>
    );
  }

  return (
    <WebSeite ohneRechts>
      <Spalte breite={1180}>
        <UnterKopf titel="Erklärvideos" unter="Video zu einer Frage hochladen – beim Lernen erscheint dann neben der KI-Hilfe ein Play-Knopf." />

        <Raster min={220} max={3} abstand={16}>
          <Zahl icon="help-circle" ton={TOENE.blau} wert={FRAGEN.length} titel="Fragen" />
          <Zahl icon="play-circle" ton={TOENE.gruen} wert={zahlen.video} titel="mit Video" />
          <Zahl icon="film" ton={TOENE.lila} wert={zahlen.animation} titel="mit eingebauter Animation" />
        </Raster>

        <View style={{ gap: 14 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
            <View style={{ flex: 1, minWidth: 280 }}>
              <Eingabe icon="search" value={suche} onChangeText={setSuche} placeholder="Frage suchen, z. B. v1" autoCapitalize="none" autoCorrect={false} />
            </View>
            <Reiter<Filter>
              optionen={[
                { id: "alle", titel: "Alle", zahl: FRAGEN.length },
                { id: "video", titel: "Mit Video", zahl: zahlen.video },
                { id: "ohne", titel: "Ohne Video", zahl: FRAGEN.length - zahlen.video },
                { id: "animation", titel: "Mit Animation", zahl: zahlen.animation },
              ]}
              wert={filter}
              onWechsel={setFilter}
            />
          </View>
          <Text style={{ ...n.halb, fontSize: 13.5, lineHeight: 19, color: B.text3 }}>Fragen mit Lageplan haben schon eine eingebaute Animation. Lädst du dort ein Video hoch, gibt es beim Lernen beides. Videos als MP4 oder MOV, bis 5 Minuten und 50 MB.</Text>

          <Kachel>
            {!geladen ? (
              <View style={{ paddingVertical: 48, alignItems: "center" }}>
                <Lader color={B.text3} />
              </View>
            ) : liste.length === 0 ? (
              <Leer icon="search" ton={TOENE.blau} titel="Keine passende Frage" text="Probier einen anderen Suchbegriff oder Filter." />
            ) : (
              liste.map((fr, i) => {
                const v = videos[fr.id];
                const anim = Boolean(animationFuer(fr));
                const hier = laeuft?.frageId === fr.id;
                return (
                  <View key={fr.id} style={{ flexDirection: "row", alignItems: "center", gap: 16, paddingHorizontal: 18, paddingVertical: 14, borderTopWidth: i ? 1.5 : 0, borderTopColor: B.ton }}>
                    <FrageBild frage={fr} />
                    <View style={{ flex: 1, minWidth: 0, gap: 5 }}>
                      <Text style={{ ...n.fett, fontSize: 15, lineHeight: 21, color: B.text }} numberOfLines={2}>
                        {fr.text}
                      </Text>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                        <Text style={{ ...n.halb, fontSize: 13, color: B.text3 }}>
                          {fr.id.toUpperCase()} · {themaVon(fr.thema).titel}
                        </Text>
                        {v ? <Marke farbe={B.gruen} text={`Video${dauerText(v.dauer) ? ` ${dauerText(v.dauer)}` : ""}`} /> : null}
                        {anim ? <Marke farbe={B.lila} text="Animation" /> : null}
                      </View>
                      {hier ? (
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginTop: 4 }}>
                          <Balken anteil={laeuft.anteil} ton={TOENE.orange} hoehe={8} style={{ flex: 1 }} />
                          <Text style={{ ...n.fett, fontSize: 13, color: B.text2, fontVariant: ["tabular-nums"] }}>{laeuft.anteil >= 0.999 ? "wird gespeichert …" : `${Math.round(laeuft.anteil * 100)} %`}</Text>
                        </View>
                      ) : null}
                    </View>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                      {hier ? (
                        <Knopf
                          titel="Abbrechen"
                          art="rand"
                          ton="rot"
                          groesse="klein"
                          onPress={() => {
                            abbruch.current.aktuell?.();
                            setLaeuft(null);
                          }}
                        />
                      ) : (
                        <>
                          {anim ? <Knopf titel="Animation" icon="film-outline" art="rand" ton="lila" groesse="klein" onPress={() => ansehen(fr, "animation")} /> : null}
                          {v ? <Knopf titel="Ansehen" icon="play" art="rand" ton="gruen" groesse="klein" onPress={() => ansehen(fr, "video")} /> : null}
                          <Knopf titel={v ? "Ersetzen" : "Hochladen"} icon="cloud-upload-outline" art="rand" ton="orange" groesse="klein" deaktiviert={Boolean(laeuft)} onPress={() => hochladen(fr)} />
                          {v ? <Knopf titel="Löschen" icon="trash-outline" art="rand" ton="rot" groesse="klein" onPress={() => loeschen(fr)} /> : null}
                        </>
                      )}
                    </View>
                  </View>
                );
              })
            )}
          </Kachel>
        </View>
      </Spalte>
    </WebSeite>
  );
}
