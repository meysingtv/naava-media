import { useCallback, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Abschnitt, Avatar, Chip, Eingabe, Gruppe, Karte, Knopf, T, Zeile } from "@/components/ui";
import { INHALT_UNTEN } from "@/components/tab-leiste";
import { GEGNER } from "@/lib/duell";
import { tausender } from "@/lib/format";
import { tippen } from "@/lib/haptik";
import { useKonto } from "@/lib/konto";
import { freundDuellBeitreten, freundDuellErstellen, meineDuelle, rangDuellSuchen, sicht, type DuellMitNamen } from "@/lib/online-duell";
import { demoRangliste, ligaVon, ranglisteLaden, type RangEintrag } from "@/lib/rangliste";
import { schutzFrei, serieAktuell, useStand, xpWoche } from "@/lib/stand";
import { serverVerbunden } from "@/lib/supabase";
import { abstand, farben, radius, RAND, schrift } from "@/lib/theme";

type Ansicht = "rangliste" | "duell";

function Umschalter<W extends string>({ wert, optionen, onWechsel }: { wert: W; optionen: { id: W; titel: string }[]; onWechsel: (a: W) => void }) {
  return (
    <View style={{ flexDirection: "row", padding: 4, borderRadius: 14, backgroundColor: farben.flaeche, borderWidth: 1, borderColor: farben.linie }}>
      {optionen.map((o) => {
        const aktiv = o.id === wert;
        return (
          <Pressable
            key={o.id}
            onPress={() => {
              tippen();
              onWechsel(o.id);
            }}
            style={{ flex: 1, height: 38, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: aktiv ? farben.flaeche3 : "transparent" }}
          >
            <T v="textStark" farbe={aktiv ? farben.text : farben.text3} style={{ fontSize: 14 }} numberOfLines={1}>
              {o.titel}
            </T>
          </Pressable>
        );
      })}
    </View>
  );
}

const PODEST = [farben.orange, "#C7CDDA", "#B98A5E"];

function Rangzeile({ e }: { e: RangEintrag }) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: abstand(3),
        paddingVertical: abstand(3),
        paddingHorizontal: abstand(3.5),
        borderRadius: radius.m,
        backgroundColor: e.ich ? farben.flaeche2 : "transparent",
        borderWidth: 1,
        borderColor: e.ich ? farben.orangeLinie : "transparent",
      }}
    >
      <T v="h3" farbe={e.platz <= 3 ? PODEST[e.platz - 1] : farben.text3} style={{ width: 26, fontVariant: ["tabular-nums"] }}>
        {e.platz}
      </T>
      <Avatar name={e.name} groesse={36} farbe={e.platz <= 3 ? PODEST[e.platz - 1] : farben.linieStark} />
      <View style={{ flex: 1 }}>
        <T v="textStark" numberOfLines={1}>
          {e.ich ? `${e.name} (du)` : e.name}
        </T>
        <T v="klein" numberOfLines={1} style={{ fontSize: 12 }}>
          @{e.benutzername}
        </T>
      </View>
      <T v="textStark" farbe={e.ich ? farben.orange : farben.text2} style={{ fontVariant: ["tabular-nums"] }}>
        {tausender(e.xp)} XP
      </T>
    </View>
  );
}

function duellStatus(d: DuellMitNamen, ich: string) {
  const s = sicht(d, ich);
  if (d.status === "fertig") {
    const stand = `${s.meine ?? 0} : ${s.seine ?? 0}`;
    if (s.gewonnen) return { text: `Gewonnen · ${stand}`, farbe: farben.gruen, icon: "trophy" as const };
    if (s.verloren) return { text: `Verloren · ${stand}`, farbe: farben.rot, icon: "flag" as const };
    return { text: `Unentschieden · ${stand}`, farbe: farben.text2, icon: "git-compare" as const };
  }
  if (s.ichDran) return { text: "Du bist dran", farbe: farben.orange, icon: "play-circle" as const };
  return { text: d.art === "freund" && !d.spieler2 ? `Code ${d.code} – wartet auf Freund` : "Wartet auf Gegner", farbe: farben.text3, icon: "hourglass-outline" as const };
}

export default function Liga() {
  const insets = useSafeAreaInsets();
  const { stand } = useStand();
  const { session, profil, gast, anzeigeName, abmelden, profilNeuLaden } = useKonto();
  const ich = session?.user.id ?? "";
  const [ansicht, setAnsicht] = useState<Ansicht>("rangliste");
  const [regional, setRegional] = useState(false);
  const [liste, setListe] = useState<RangEintrag[] | null>(null);
  const [laedt, setLaedt] = useState(false);
  const [duelle, setDuelle] = useState<DuellMitNamen[]>([]);
  const [code, setCode] = useState("");
  const [arbeitet, setArbeitet] = useState<"suche" | "code" | "beitritt" | null>(null);
  const meineXp = xpWoche(stand);
  const liga = ligaVon(stand.xp);
  const bundesland = profil?.bundesland ?? null;

  const laden = useCallback(() => {
    let aktiv = true;
    if (session) {
      setLaedt(true);
      ranglisteLaden(session.user.id, regional ? bundesland : null).then((l) => {
        if (!aktiv) return;
        setListe(l ?? demoRangliste({ name: anzeigeName, xp: meineXp }, regional));
        setLaedt(false);
      });
      meineDuelle().then((r) => aktiv && setDuelle(r.daten ?? []));
      profilNeuLaden();
    } else {
      setListe(demoRangliste({ name: anzeigeName, xp: meineXp }, regional));
    }
    return () => {
      aktiv = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, anzeigeName, meineXp, regional, bundesland]);

  useFocusEffect(laden);

  const ichEintrag = liste?.find((e) => e.ich);
  const tageRest = 7 - ((new Date().getDay() + 6) % 7);
  const online = Boolean(session) && serverVerbunden;

  function regionalWaehlen(an: boolean) {
    if (an && session && !bundesland) {
      Alert.alert("Bundesland fehlt", "Wähle dein Bundesland in den Einstellungen, dann siehst du die regionale Rangliste.", [
        { text: "Später", style: "cancel" },
        { text: "Einstellungen", onPress: () => router.push("/einstellungen") },
      ]);
      return;
    }
    setRegional(an);
  }

  async function starte(art: "suche" | "code" | "beitritt") {
    setArbeitet(art);
    const r = art === "suche" ? await rangDuellSuchen() : art === "code" ? await freundDuellErstellen() : await freundDuellBeitreten(code);
    setArbeitet(null);
    if (r.fehler || !r.daten) {
      Alert.alert("Das hat nicht geklappt", r.fehler ?? "Bitte versuch es noch einmal.");
      return;
    }
    setCode("");
    router.push({ pathname: "/online-duell", params: { id: r.daten.id } });
  }

  async function kontoErstellen() {
    await abmelden();
    router.replace("/registrieren");
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: farben.grund }}
      contentContainerStyle={{ paddingTop: insets.top + abstand(3), paddingHorizontal: RAND, paddingBottom: INHALT_UNTEN, gap: abstand(5) }}
      keyboardShouldPersistTaps="handled"
    >
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <T v="titel">Liga</T>
        <Pressable
          onPress={() => {
            tippen();
            router.push("/profil");
          }}
          hitSlop={6}
          accessibilityLabel="Profil"
        >
          <Avatar name={anzeigeName} groesse={40} />
        </Pressable>
      </View>

      <Umschalter<Ansicht>
        wert={ansicht}
        onWechsel={setAnsicht}
        optionen={[
          { id: "rangliste", titel: "Rangliste" },
          { id: "duell", titel: "Duell" },
        ]}
      />

      {ansicht === "rangliste" ? (
        <>
          <Karte style={{ gap: abstand(4) }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: abstand(3.5) }}>
              <View style={{ width: 46, height: 46, borderRadius: 14, backgroundColor: liga.farbe + "22", alignItems: "center", justifyContent: "center" }}>
                <Ionicons name="trail-sign" size={22} color={liga.farbe} />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <T v="h3">{liga.name}</T>
                <T v="klein">
                  Wertung dieser Woche · noch {tageRest} {tageRest === 1 ? "Tag" : "Tage"}
                </T>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <T v="zahl" style={{ fontSize: 26 }}>
                  {ichEintrag ? `#${ichEintrag.platz}` : "–"}
                </T>
                <T v="klein" style={{ fontSize: 12 }}>
                  {tausender(meineXp)} XP
                </T>
              </View>
            </View>
            <View style={{ flexDirection: "row", gap: abstand(2) }}>
              <Chip text={`${serieAktuell(stand)} Tage Serie`} icon="flame" farbe={farben.orange} />
              <Chip text={schutzFrei(stand) ? "Serien-Schutz bereit" : "Schutz verbraucht"} icon="shield-checkmark" farbe={schutzFrei(stand) ? farben.blau : farben.text4} />
            </View>
            {liga.bis ? (
              <View style={{ gap: abstand(1.5) }}>
                <View style={{ height: 6, borderRadius: 3, backgroundColor: farben.flaeche3, overflow: "hidden" }}>
                  <View style={{ width: `${Math.min(100, (stand.xp / liga.bis) * 100)}%`, height: "100%", backgroundColor: liga.farbe }} />
                </View>
                <T v="klein" style={{ fontSize: 12 }}>
                  Noch {tausender(Math.max(0, liga.bis - stand.xp))} XP bis zur {liga.naechste}
                </T>
              </View>
            ) : null}
          </Karte>

          <Umschalter<"de" | "land">
            wert={regional ? "land" : "de"}
            onWechsel={(w) => regionalWaehlen(w === "land")}
            optionen={[
              { id: "de", titel: "Deutschland" },
              { id: "land", titel: bundesland ?? "Mein Bundesland" },
            ]}
          />

          {!session ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: abstand(3), padding: abstand(4), borderRadius: radius.l, backgroundColor: farben.flaeche, borderWidth: 1, borderColor: farben.linie }}>
              <Ionicons name="people-outline" size={22} color={farben.text2} />
              <T v="klein" style={{ flex: 1 }}>
                Übungsrangliste. Mit Konto trittst du gegen echte Lernende an.
              </T>
              {gast ? (
                <Pressable onPress={kontoErstellen} hitSlop={8}>
                  <T v="klein" farbe={farben.orange} style={{ fontFamily: schrift.textHalb }}>
                    Konto erstellen
                  </T>
                </Pressable>
              ) : null}
            </View>
          ) : null}

          {laedt || !liste ? (
            <ActivityIndicator color={farben.orange} style={{ marginTop: abstand(6) }} />
          ) : (
            <View>
              {liste.slice(0, 30).map((e, i) => (
                <View key={e.id}>
                  {i === 3 ? (
                    <View style={{ flexDirection: "row", alignItems: "center", gap: abstand(2), marginVertical: abstand(2) }}>
                      <View style={{ flex: 1, height: 1, borderTopWidth: 1, borderStyle: "dashed", borderColor: farben.orangeLinie }} />
                      <T v="mini" farbe={farben.orange}>
                        Aufstiegszone
                      </T>
                      <View style={{ flex: 1, height: 1, borderTopWidth: 1, borderStyle: "dashed", borderColor: farben.orangeLinie }} />
                    </View>
                  ) : null}
                  <Rangzeile e={e} />
                </View>
              ))}
              {liste.length === 0 ? (
                <T v="klein" zentriert style={{ marginTop: abstand(4) }}>
                  Diese Woche hat hier noch niemand gelernt – fang du an.
                </T>
              ) : null}
            </View>
          )}
        </>
      ) : (
        <>
          {/* Online: Rangliste-Duell */}
          <Karte hervorgehoben={online} style={{ gap: abstand(4) }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: abstand(3.5) }}>
              <View style={{ width: 46, height: 46, borderRadius: 14, backgroundColor: farben.orangeSoft, alignItems: "center", justifyContent: "center" }}>
                <Ionicons name="trophy" size={22} color={farben.orange} />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <T v="h3">Rangliste-Duell</T>
                <T v="klein">Zufälliger Gegner · 10 Fragen · Elo-Wertung</T>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <T v="mini">Elo</T>
                <T v="zahl" style={{ fontSize: 22, lineHeight: 26 }}>
                  {profil?.elo ?? 1000}
                </T>
              </View>
            </View>
            {online ? (
              <Knopf titel="Gegner suchen" icon="search" laedt={arbeitet === "suche"} deaktiviert={arbeitet !== null} onPress={() => starte("suche")} />
            ) : (
              <Knopf titel="Mit Konto spielen" art="sekundaer" onPress={gast ? kontoErstellen : () => router.push("/einstellungen")} deaktiviert={!serverVerbunden} />
            )}
          </Karte>

          <Karte onPress={() => router.push("/elo")} style={{ flexDirection: "row", alignItems: "center", gap: abstand(3.5), padding: abstand(4) }}>
            <Ionicons name="podium-outline" size={22} color={farben.gelb} />
            <View style={{ flex: 1 }}>
              <T v="textStark">Top 100 nach Elo</T>
              <T v="klein">Die besten Duellantinnen und Duellanten</T>
            </View>
            <Ionicons name="chevron-forward" size={18} color={farben.text4} />
          </Karte>

          {/* Online: Freundes-Duell */}
          <Karte style={{ gap: abstand(4) }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: abstand(3.5) }}>
              <View style={{ width: 46, height: 46, borderRadius: 14, backgroundColor: farben.blauSoft, alignItems: "center", justifyContent: "center" }}>
                <Ionicons name="people" size={22} color={farben.blau} />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <T v="h3">Freundes-Duell</T>
                <T v="klein">Code erstellen und teilen – ohne Elo, nur zum Spaß</T>
              </View>
            </View>
            {online ? (
              <>
                <Knopf titel="Code erstellen" art="sekundaer" icon="add" laedt={arbeitet === "code"} deaktiviert={arbeitet !== null} onPress={() => starte("code")} />
                <View style={{ flexDirection: "row", gap: abstand(2) }}>
                  <View style={{ flex: 1 }}>
                    <Eingabe
                      icon="key-outline"
                      value={code}
                      onChangeText={(t) => setCode(t.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 5))}
                      placeholder="Code eingeben"
                      autoCapitalize="characters"
                      autoCorrect={false}
                    />
                  </View>
                  <Knopf titel="Los" deaktiviert={code.length < 5 || arbeitet !== null} laedt={arbeitet === "beitritt"} onPress={() => starte("beitritt")} style={{ paddingHorizontal: abstand(5) }} />
                </View>
              </>
            ) : (
              <T v="klein">Freundes-Duelle brauchen ein Konto.</T>
            )}
          </Karte>

          {online && duelle.length > 0 ? (
            <View>
              <Abschnitt titel="Deine Duelle" />
              <Gruppe>
                {duelle.map((d) => {
                  const s = sicht(d, ich);
                  const st = duellStatus(d, ich);
                  const aufrufbar = s.ichDran || d.status === "fertig";
                  return (
                    <Zeile
                      key={d.id}
                      icon={st.icon}
                      iconFarbe={st.farbe}
                      titel={s.gegnerName ?? (d.art === "freund" ? "Freundes-Duell" : "Rangliste-Duell")}
                      unter={st.text}
                      wert={s.elo != null ? `${s.elo >= 0 ? "+" : ""}${s.elo} Elo` : undefined}
                      onPress={aufrufbar ? () => router.push({ pathname: "/online-duell", params: { id: d.id } }) : undefined}
                    />
                  );
                })}
              </Gruppe>
            </View>
          ) : null}

          {/* Offline: Übungsduelle */}
          <View>
            <Abschnitt titel="Übungsduelle" />
            <T v="klein" style={{ marginTop: -abstand(1), marginBottom: abstand(3) }}>
              Gegen drei Übungsgegner – klappt auch ohne Internet. Fünf Fragen, je 20 Sekunden.
            </T>
            <View style={{ gap: abstand(3) }}>
              {GEGNER.map((g) => (
                <Karte key={g.id} style={{ flexDirection: "row", alignItems: "center", gap: abstand(3.5), padding: abstand(4) }}>
                  <Avatar name={g.name} groesse={46} farbe={g.farbe} />
                  <View style={{ flex: 1, gap: 2 }}>
                    <T v="h3">{g.name}</T>
                    <T v="klein" numberOfLines={1}>
                      {g.titel}
                    </T>
                    <T v="klein" farbe={farben.text4} style={{ fontSize: 12 }}>
                      Rating {g.rating}
                    </T>
                  </View>
                  <Knopf titel="Duell" klein art="sekundaer" onPress={() => router.push({ pathname: "/duell", params: { gegner: g.id } })} style={{ paddingHorizontal: abstand(4) }} />
                </Karte>
              ))}
            </View>
          </View>
        </>
      )}
    </ScrollView>
  );
}
