import { useState } from "react";
import { Image, Pressable, ScrollView, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";

import { Icon, type IconName } from "@/components/icon";
import { LinienIcon } from "@/components/linien-icon";
import { type Zustand } from "@/components/web/bunt";
import { L, LKarte } from "@/components/web/home-web-lila";
import { istGesehen, stelleVon, useKurse, type Kurs, type KursVideo } from "@/lib/kurse";
import { KATEGORIEN, themaBild } from "@/lib/lernthemen";
import { useStand } from "@/lib/stand";

// Kursseite am PC im lila Design (Vorlage 1:1): Hero mit Kursbild, Reiter
// „Videos“ und „Kursinhalt“, Videolektionen mit Stand, rechts Kurs-Infos,
// Fortschritt, nächster Schritt und weitere Themen. Echte Daten aus lib/kurse.

const s = {
  schwarz: { fontFamily: "Nunito_900Black" },
  fett: { fontFamily: "Nunito_800ExtraBold" },
  halb: { fontFamily: "Nunito_700Bold" },
  text: { fontFamily: "Nunito_600SemiBold" },
} as const;
const minSek = (sek: number) => `${Math.floor(sek / 60)}:${String(Math.round(sek % 60)).padStart(2, "0")}`;
const minuten = (sek: number) => `${Math.max(1, Math.round(sek / 60))} Min.`;

type Lage = { art: "fertig" | "laeuft" | "bereit"; anteil: number };
function lageVon(v: KursVideo): Lage {
  if (istGesehen(v.id)) return { art: "fertig", anteil: 1 };
  const st = stelleVon(v.id);
  if (st > 0 && v.dauer) return { art: "laeuft", anteil: Math.min(0.99, st / v.dauer) };
  return { art: "bereit", anteil: 0 };
}
const abspielen = (v: KursVideo) => router.push({ pathname: "/themavideo", params: { id: v.id } });

function RundKnopf({ icon, onPress, punkt }: { icon: IconName; onPress: () => void; punkt?: boolean }) {
  return (
    <Pressable onPress={onPress} style={(z: Zustand) => ({ width: 46, height: 46, borderRadius: 14, borderWidth: 1.5, borderColor: L.rand, backgroundColor: z.hovered ? L.lilaZart : "#FFFFFF", alignItems: "center", justifyContent: "center", shadowColor: "#5B2BB5", shadowOpacity: 0.08, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } })}>
      <Icon name={icon} size={21} color={L.tinte} />
      {punkt ? <View style={{ position: "absolute", top: 9, right: 11, width: 9, height: 9, borderRadius: 5, backgroundColor: L.lila, borderWidth: 1.5, borderColor: "#FFFFFF" }} /> : null}
    </Pressable>
  );
}

function VideoKarte({ v, untertitel, aktuell, quelle }: { v: KursVideo; untertitel: string; aktuell: boolean; quelle: ReturnType<typeof themaBild> }) {
  const lage = lageVon(v);
  return (
    <Pressable onPress={() => abspielen(v)} style={(z: Zustand) => ({ flex: 1, height: 262, borderRadius: 18, borderWidth: aktuell ? 2 : 1.5, borderColor: aktuell ? "#C9B0F7" : z.hovered ? "#D9CBF5" : L.rand, backgroundColor: "#FFFFFF", overflow: "hidden", shadowColor: "#5B2BB5", shadowOpacity: aktuell ? 0.16 : 0.07, shadowRadius: 16, shadowOffset: { width: 0, height: 6 } })}>
      <VorschauBild v={v} quelle={quelle} />
      <View style={{ paddingHorizontal: 18, paddingTop: 10 }}>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Text style={{ ...s.schwarz, fontSize: 18.5, color: L.tinte, flex: 1 }} numberOfLines={1}>
            {v.titel}
          </Text>
          <Icon name="ellipsis-horizontal" size={20} color={L.tinte} />
        </View>
        <Text style={{ ...s.text, fontSize: 14.5, color: lage.art === "bereit" ? L.tinte2 : L.lilaDunkel, marginTop: 2 }} numberOfLines={1}>
          {untertitel}
        </Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 14, marginTop: 12 }}>
          <View style={{ flex: 1, height: 8, borderRadius: 4, backgroundColor: "#E9E5F1", overflow: "hidden" }}>
            <LinearGradient colors={lage.art === "fertig" ? ["#22C55E", "#16A34A"] : ["#7C3AED", "#9F67FF"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ width: `${Math.round(lage.anteil * 100)}%`, height: "100%", borderRadius: 4 }} />
          </View>
          <Text style={{ ...s.fett, fontSize: 14, color: L.tinte, width: 52, textAlign: "right" }} numberOfLines={1}>{Math.round(lage.anteil * 100)} %</Text>
        </View>
      </View>
    </Pressable>
  );
}

/** Vorschau eines Videos: Kursbild mit Stand-Plakette, Play-Knopf und Länge. */
function VorschauBild({ v, quelle }: { v: KursVideo; quelle: ReturnType<typeof themaBild> }) {
  const lage = lageVon(v);
  return (
    <View style={{ height: 166, backgroundColor: "#1B1426" }}>
      <Image source={quelle} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
      <View style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0, alignItems: "center", justifyContent: "center" }}>
        <View style={{ width: 54, height: 54, borderRadius: 27, backgroundColor: "rgba(40,32,52,0.55)", borderWidth: 2, borderColor: "rgba(255,255,255,0.9)", alignItems: "center", justifyContent: "center" }}>
          <Icon name="play" size={26} color="#FFFFFF" style={{ marginLeft: 3 }} />
        </View>
      </View>
      <View style={{ position: "absolute", left: 16, top: 14, flexDirection: "row", alignItems: "center", gap: 7, paddingHorizontal: 12, height: 30, borderRadius: 15, backgroundColor: lage.art === "fertig" ? "#E3F6E8" : "#FFFFFF" }}>
        {lage.art === "fertig" ? <Icon name="checkmark-circle" size={18} color="#22A447" /> : lage.art === "laeuft" ? <Icon name="play-circle-outline" size={18} color={L.lila} /> : <Icon name="time-outline" size={17} color={L.tinte} />}
        <Text style={{ ...s.halb, fontSize: 13.5, color: lage.art === "fertig" ? "#15803D" : lage.art === "laeuft" ? L.lilaDunkel : L.tinte }}>{lage.art === "fertig" ? "Abgeschlossen" : lage.art === "laeuft" ? "In Bearbeitung" : "Bereit"}</Text>
      </View>
      {v.dauer ? (
        <View style={{ position: "absolute", right: 12, bottom: 12, paddingHorizontal: 8, height: 26, borderRadius: 8, justifyContent: "center", backgroundColor: "rgba(10,8,16,0.75)" }}>
          <Text style={{ ...s.fett, fontSize: 13.5, color: "#FFFFFF" }}>{minSek(v.dauer)}</Text>
        </View>
      ) : null}
    </View>
  );
}

export function KursWebLila({ id }: { id: string }) {
  const { stand } = useStand();
  const { geladen, kurse } = useKurse();
  const [reiter, setReiter] = useState<"videos" | "inhalt">("videos");
  const [liste, setListe] = useState(false);
  const kurs = kurse.find((k) => k.thema.id === id) ?? null;

  if (!kurs) {
    return (
      <View style={{ flex: 1, backgroundColor: "#FBF9FF", padding: 40 }}>
        <Text style={{ ...s.schwarz, fontSize: 28, color: L.tinte }}>{geladen ? "Kurs nicht gefunden" : "Kurs wird geladen …"}</Text>
      </View>
    );
  }
  const bild = themaBild(kurs.thema);
  const anteil = kurs.videos.length ? kurs.gesehen / kurs.videos.length : 0;
  const naechstes = kurs.videos.find((v) => !istGesehen(v.id)) ?? null;
  const aktuell = kurs.videos.find((v) => !istGesehen(v.id) && stelleVon(v.id) > 0) ?? naechstes;
  const kat = KATEGORIEN.find((x) => x.id === kurs.thema.kategorie)?.titel ?? "Theorie";
  const platz = kurse.findIndex((k) => k.thema.id === id);
  const weitere: Kurs[] = kurse.length > 1 ? [1, 2, 3].map((d) => kurse[(platz + d) % kurse.length]).filter((k, i, a) => k.thema.id !== id && a.findIndex((x) => x.thema.id === k.thema.id) === i) : [];
  const untertitel = (v: KursVideo, i: number) => (v.kapitel.trim() ? v.kapitel.trim() : `Lektion ${i + 1} von ${kurs.videos.length}`);
  const paare: KursVideo[][] = [];
  for (let i = 0; i < kurs.videos.length; i += 2) paare.push(kurs.videos.slice(i, i + 2));
  const klasse = stand.klasse || "B";

  return (
    <ScrollView style={{ flex: 1, backgroundColor: "#FBF9FF" }} contentContainerStyle={{ paddingLeft: 26, paddingRight: 20, paddingBottom: 48 }}>
      <View style={{ width: "100%", maxWidth: 1160 }}>
        {/* Kopfzeile */}
        <View style={{ flexDirection: "row", alignItems: "center", marginTop: 18 }}>
          <Pressable onPress={() => (router.canGoBack() ? router.back() : router.navigate("/lernen"))} style={{ flexDirection: "row", alignItems: "center", gap: 10, marginLeft: 16 }}>
            <Icon name="arrow-back" size={19} color={L.tinte} />
            <Text style={{ ...s.halb, fontSize: 16, color: L.tinte }}>Zurück zu Kursen</Text>
          </Pressable>
          <View style={{ flex: 1 }} />
          <View style={{ flexDirection: "row", gap: 18 }}>
            <RundKnopf icon="search-outline" onPress={() => router.navigate("/lernen")} />
            <RundKnopf icon="notifications-outline" punkt onPress={() => router.push("/einstellungen")} />
          </View>
        </View>

        {/* Hero */}
        <View style={{ height: 266, borderRadius: 26, overflow: "hidden", marginTop: 8, borderWidth: 1.5, borderColor: "#EDE5FB" }}>
          <LinearGradient colors={["#F6F0FF", "#EFE6FF"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }} />
          <Image source={bild} style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: "56%" }} resizeMode="cover" />
          <LinearGradient colors={["#F3ECFF", "rgba(243,236,255,0.85)", "rgba(243,236,255,0)"]} locations={[0, 0.35, 1]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ position: "absolute", left: "43.5%", top: 0, bottom: 0, width: "30%" }} />
          <View style={{ position: "absolute", right: "-6%", top: -80, width: "40%", height: 460, borderRadius: 300, backgroundColor: "rgba(150,90,255,0.18)", transform: [{ rotate: "18deg" }] }} />
          <View style={{ padding: 34, paddingTop: 26 }}>
            <View style={{ flexDirection: "row", gap: 12 }}>
              {[{ icon: "car-outline" as IconName, text: `Klasse ${klasse}` }, { icon: "play-circle-outline" as IconName, text: kurs.videos.length === 1 ? "1 Video" : `${kurs.videos.length} Videos` }].map((c) => (
                <View key={c.text} style={{ flexDirection: "row", alignItems: "center", gap: 9, height: 36, paddingHorizontal: 14, borderRadius: 18, backgroundColor: "#FFFFFF", borderWidth: 1.5, borderColor: "#ECE4FA" }}>
                  <Icon name={c.icon} size={20} color={L.lila} />
                  <Text style={{ ...s.fett, fontSize: 14.5, color: L.tinte }}>{c.text}</Text>
                </View>
              ))}
            </View>
            <Text style={{ ...s.schwarz, fontSize: 46, lineHeight: 52, color: L.tinte, marginTop: 14, letterSpacing: -1, maxWidth: 560 }} numberOfLines={1}>
              {kurs.thema.titel}
            </Text>
            <Text style={{ ...s.text, fontSize: 20, color: "#3D3350", maxWidth: 520 }} numberOfLines={1}>
              {kurs.thema.kurz}
            </Text>
            <View style={{ flexDirection: "row", gap: 14, marginTop: 22 }}>
              <Pressable onPress={() => (aktuell ? abspielen(aktuell) : kurs.videos[0] ? abspielen(kurs.videos[0]) : null)} style={(z: Zustand) => ({ borderRadius: 14, opacity: z.pressed ? 0.85 : 1, shadowColor: "#7C3AED", shadowOpacity: 0.35, shadowRadius: 12, shadowOffset: { width: 0, height: 5 } })}>
                <LinearGradient colors={["#8B5CF6", "#6D28D9"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ height: 48, paddingHorizontal: 34, borderRadius: 14, flexDirection: "row", alignItems: "center", gap: 12 }}>
                  <Icon name="play" size={19} color="#FFFFFF" />
                  <Text style={{ ...s.fett, fontSize: 17.5, color: "#FFFFFF" }}>{kurs.gesehen === 0 ? "Starten" : naechstes ? "Fortsetzen" : "Wiederholen"}</Text>
                </LinearGradient>
              </Pressable>
              <Pressable onPress={() => setReiter("inhalt")} style={(z: Zustand) => ({ height: 48, paddingHorizontal: 20, borderRadius: 14, backgroundColor: z.hovered ? "#FAF7FF" : "#FFFFFF", borderWidth: 1.5, borderColor: "#ECE4FA", flexDirection: "row", alignItems: "center", gap: 10 })}>
                <Icon name="list" size={20} color={L.lila} />
                <Text style={{ ...s.fett, fontSize: 15.5, color: L.tinte }}>Kursinhalt</Text>
              </Pressable>
            </View>
          </View>
        </View>

        <View style={{ flexDirection: "row", gap: 30, marginTop: 24 }}>
          {/* Links: Reiter + Lektionen */}
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: "row", gap: 6, borderBottomWidth: 1.5, borderBottomColor: "#ECE7F4" }}>
              {[
                { id: "videos" as const, titel: `Videos (${kurs.videos.length})`, icon: <LinienIcon name="video" size={22} color={reiter === "videos" ? L.lila : L.tinte2} /> },
                { id: "inhalt" as const, titel: "Kursinhalt", icon: <Icon name="list" size={22} color={reiter === "inhalt" ? L.lila : L.tinte2} /> },
              ].map((r) => (
                <Pressable key={r.id} onPress={() => setReiter(r.id)} style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 20, height: 46, borderBottomWidth: 3, borderBottomColor: reiter === r.id ? L.lila : "transparent", marginBottom: -1.5 }}>
                  {r.icon}
                  <Text style={{ ...s.halb, fontSize: 16, color: reiter === r.id ? L.lila : L.tinte2 }}>{r.titel}</Text>
                </Pressable>
              ))}
            </View>

            <View style={{ flexDirection: "row", alignItems: "center", marginTop: 26, marginBottom: 18 }}>
              <Text style={{ ...s.schwarz, fontSize: 26, color: L.tinte, flex: 1 }}>{reiter === "videos" ? "Videolektionen" : "Kursinhalt"}</Text>
              <View style={{ width: 200, marginRight: 22 }}>
                <Text style={{ ...s.halb, fontSize: 14.5, color: L.tinte }}>
                  <Text style={{ ...s.fett }}>{Math.round(anteil * 100)} %</Text> abgeschlossen
                </Text>
                <View style={{ height: 10, borderRadius: 5, backgroundColor: "#ECE7F5", marginTop: 6, overflow: "hidden" }}>
                  <LinearGradient colors={["#7C3AED", "#9F67FF"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ width: `${Math.round(anteil * 100)}%`, height: "100%", borderRadius: 5 }} />
                </View>
              </View>
              {reiter === "videos" ? (
                <View style={{ flexDirection: "row", borderRadius: 12, borderWidth: 1.5, borderColor: "#ECE6F6", overflow: "hidden", backgroundColor: "#FFFFFF" }}>
                  {[false, true].map((l) => (
                    <Pressable key={String(l)} onPress={() => setListe(l)} style={{ width: 44, height: 40, alignItems: "center", justifyContent: "center", backgroundColor: liste === l ? L.lilaZart : "#FFFFFF" }}>
                      <LinienIcon name={l ? "liste" : "raster"} size={20} color={liste === l ? L.lila : L.tinte2} />
                    </Pressable>
                  ))}
                </View>
              ) : null}
            </View>

            {!kurs.videos.length ? (
              <LKarte style={{ padding: 26 }}>
                <Text style={{ ...s.fett, fontSize: 17, color: L.tinte }}>Videos folgen bald</Text>
                <Text style={{ ...s.text, fontSize: 14.5, color: L.tinte2, marginTop: 4 }}>Zu diesem Kurs gibt es noch keine Videos.</Text>
              </LKarte>
            ) : reiter === "inhalt" || liste ? (
              <LKarte style={{ paddingVertical: 6 }}>
                {kurs.videos.map((v, i) => {
                  const lage = lageVon(v);
                  const neuesKapitel = reiter === "inhalt" && v.kapitel.trim() && (i === 0 || kurs.videos[i - 1].kapitel.trim() !== v.kapitel.trim());
                  return (
                    <View key={v.id}>
                      {neuesKapitel ? <Text style={{ ...s.fett, fontSize: 13, letterSpacing: 0.6, color: L.lila, paddingHorizontal: 20, paddingTop: 14, paddingBottom: 4 }}>{v.kapitel.trim().toUpperCase()}</Text> : null}
                      <Pressable onPress={() => abspielen(v)} style={(z: Zustand) => ({ flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 20, height: 62, borderTopWidth: i && !neuesKapitel ? 1 : 0, borderTopColor: "#F0ECF6", backgroundColor: z.hovered ? "#FBF9FF" : "transparent" })}>
                        <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: lage.art === "fertig" ? "#E3F6E8" : L.lilaZart, alignItems: "center", justifyContent: "center" }}>
                          {lage.art === "fertig" ? <Icon name="checkmark" size={19} color="#16A34A" /> : <Icon name="play" size={16} color={L.lila} style={{ marginLeft: 2 }} />}
                        </View>
                        <Text style={{ ...s.fett, fontSize: 15.5, color: L.tinte, flex: 1 }} numberOfLines={1}>
                          {v.titel}
                        </Text>
                        <Text style={{ ...s.halb, fontSize: 14, color: L.tinte2 }}>{v.dauer ? minSek(v.dauer) : ""}</Text>
                        <Text style={{ ...s.fett, fontSize: 14, color: lage.art === "fertig" ? "#15803D" : L.tinte2, width: 44, textAlign: "right" }}>{Math.round(lage.anteil * 100)} %</Text>
                      </Pressable>
                    </View>
                  );
                })}
              </LKarte>
            ) : (
              <View style={{ gap: 18 }}>
                {paare.map((p, i) => (
                  <View key={i} style={{ flexDirection: "row", gap: 18 }}>
                    {p.map((v) => (
                      <VideoKarte key={v.id} v={v} untertitel={untertitel(v, kurs.videos.indexOf(v))} aktuell={aktuell?.id === v.id} quelle={bild} />
                    ))}
                    {p.length === 1 ? <View style={{ flex: 1 }} /> : null}
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* Rechts */}
          <View style={{ width: 378 }}>
            <LKarte style={{ padding: 22 }}>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Text style={{ ...s.schwarz, fontSize: 21, color: L.tinte, flex: 1 }}>Kurs-Infos</Text>
                <Icon name="information-circle-outline" size={22} color={L.tinte2} />
              </View>
              {[
                { icon: <LinienIcon name="video" size={22} color={L.tinte2} />, text: `${kurs.videos.length === 1 ? "1 Video" : `${kurs.videos.length} Videos`}${kurs.dauer ? `  •  ${minuten(kurs.dauer)}` : ""}` },
                { icon: <LinienIcon name="graduation-cap" size={22} color={L.tinte2} />, text: `Klasse ${klasse}` },
                { icon: <Icon name="pricetag-outline" size={20} color={L.tinte2} />, text: `Kategorie: ${kat}` },
              ].map((z) => (
                <View key={z.text} style={{ flexDirection: "row", alignItems: "center", gap: 18, marginTop: 14 }}>
                  {z.icon}
                  <Text style={{ ...s.text, fontSize: 16, color: L.tinte }}>{z.text}</Text>
                </View>
              ))}
              <View style={{ height: 1.5, backgroundColor: "#EEE9F6", marginVertical: 18 }} />
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Text style={{ ...s.fett, fontSize: 17, color: L.tinte, flex: 1 }}>Dein Fortschritt</Text>
                <Text style={{ ...s.schwarz, fontSize: 17, color: L.tinte }}>{Math.round(anteil * 100)} %</Text>
              </View>
              <View style={{ height: 12, borderRadius: 6, backgroundColor: "#ECE7F5", marginTop: 10, overflow: "hidden" }}>
                <LinearGradient colors={["#7C3AED", "#9F67FF"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ width: `${Math.round(anteil * 100)}%`, height: "100%", borderRadius: 6 }} />
              </View>
              <Pressable onPress={() => (naechstes ? abspielen(naechstes) : kurs.videos[0] ? abspielen(kurs.videos[0]) : null)} style={(z: Zustand) => ({ marginTop: 18, flexDirection: "row", alignItems: "center", gap: 14, padding: 14, borderRadius: 14, backgroundColor: z.hovered ? "#EDE4FD" : "#F3EDFE" })}>
                <LinienIcon name="crosshair" size={30} color={L.lila} />
                <View style={{ flex: 1 }}>
                  <Text style={{ ...s.fett, fontSize: 15.5, color: L.lilaDunkel }}>{naechstes ? "Nächster Schritt" : "Kurs abgeschlossen"}</Text>
                  <Text style={{ ...s.text, fontSize: 13.5, lineHeight: 18, color: L.tinte }}>{naechstes ? `Schließe „${naechstes.titel}“ ab und festige dein Wissen.` : "Stark! Wiederhol ein Video oder starte den nächsten Kurs."}</Text>
                </View>
                <Icon name="chevron-forward" size={20} color={L.tinte} />
              </Pressable>
            </LKarte>

            {weitere.length ? (
              <View style={{ marginTop: 28 }}>
                <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 14 }}>
                  <Text style={{ ...s.schwarz, fontSize: 23, color: L.tinte, flex: 1 }}>Weitere Themen</Text>
                  <Pressable onPress={() => router.navigate("/lernen")}>
                    <Text style={{ ...s.fett, fontSize: 15, color: L.lila }}>Alle anzeigen</Text>
                  </Pressable>
                </View>
                <View style={{ gap: 12 }}>
                  {weitere.map((k) => {
                    const hatVideos = k.videos.length > 0;
                    return (
                      <LKarte key={k.thema.id} onPress={() => router.replace({ pathname: "/thema/[id]", params: { id: k.thema.id } })} style={{ height: 82, flexDirection: "row", alignItems: "center", paddingHorizontal: 10, gap: 14 }}>
                        <Image source={themaBild(k.thema)} style={{ width: 98, height: 62, borderRadius: 10 }} resizeMode="cover" />
                        <View style={{ flex: 1 }}>
                          <Text style={{ ...s.fett, fontSize: 15.5, lineHeight: 19, color: L.tinte }} numberOfLines={2}>
                            {k.thema.titel}
                          </Text>
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 3 }}>
                            {hatVideos ? null : <Icon name="time-outline" size={15} color={L.tinte2} />}
                            <Text style={{ ...s.text, fontSize: 13.5, color: L.tinte2 }}>{hatVideos ? `${k.videos.length === 1 ? "1 Video" : `${k.videos.length} Videos`}  •  ${minuten(k.dauer)}` : "bald verfügbar"}</Text>
                          </View>
                        </View>
                        <View style={{ width: 38, height: 38, borderRadius: 12, borderWidth: 1.5, borderColor: "#ECE6F6", backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center" }}>
                          {hatVideos ? <Icon name="play" size={18} color={L.lila} style={{ marginLeft: 2 }} /> : <Icon name="lock-closed-outline" size={18} color={L.tinte} />}
                        </View>
                      </LKarte>
                    );
                  })}
                </View>
              </View>
            ) : null}
          </View>
        </View>
      </View>
    </ScrollView>
  );
}
