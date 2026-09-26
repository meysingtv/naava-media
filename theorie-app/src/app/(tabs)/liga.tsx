import { useCallback, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Avatar, Karte, Knopf, T } from "@/components/ui";
import { INHALT_UNTEN } from "@/components/tab-leiste";
import { GEGNER } from "@/lib/duell";
import { tausender } from "@/lib/format";
import { tippen } from "@/lib/haptik";
import { useKonto } from "@/lib/konto";
import { demoRangliste, ligaVon, ranglisteLaden, type RangEintrag } from "@/lib/rangliste";
import { useStand, xpWoche } from "@/lib/stand";
import { abstand, farben, radius, RAND, schrift } from "@/lib/theme";

type Ansicht = "rangliste" | "duell";

function Umschalter({ wert, onWechsel }: { wert: Ansicht; onWechsel: (a: Ansicht) => void }) {
  const optionen: { id: Ansicht; titel: string }[] = [
    { id: "rangliste", titel: "Rangliste" },
    { id: "duell", titel: "Duell" },
  ];
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
            <T v="textStark" farbe={aktiv ? farben.text : farben.text3} style={{ fontSize: 14 }}>
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

export default function Liga() {
  const insets = useSafeAreaInsets();
  const { stand } = useStand();
  const { session, gast, anzeigeName, abmelden } = useKonto();
  const [ansicht, setAnsicht] = useState<Ansicht>("rangliste");
  const [liste, setListe] = useState<RangEintrag[] | null>(null);
  const [laedt, setLaedt] = useState(false);
  const meineXp = xpWoche(stand);
  const liga = ligaVon(stand.xp);

  useFocusEffect(
    useCallback(() => {
      let aktiv = true;
      if (session) {
        setLaedt(true);
        ranglisteLaden(session.user.id).then((l) => {
          if (!aktiv) return;
          setListe(l ?? demoRangliste({ name: anzeigeName, xp: meineXp }));
          setLaedt(false);
        });
      } else {
        setListe(demoRangliste({ name: anzeigeName, xp: meineXp }));
      }
      return () => {
        aktiv = false;
      };
    }, [session, anzeigeName, meineXp]),
  );

  const ich = liste?.find((e) => e.ich);
  const tageRest = 7 - ((new Date().getDay() + 6) % 7);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: farben.grund }}
      contentContainerStyle={{ paddingTop: insets.top + abstand(3), paddingHorizontal: RAND, paddingBottom: INHALT_UNTEN, gap: abstand(5) }}
    >
      <T v="titel">Liga</T>
      <Umschalter wert={ansicht} onWechsel={setAnsicht} />

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
                  {ich ? `#${ich.platz}` : "–"}
                </T>
                <T v="klein" style={{ fontSize: 12 }}>
                  {tausender(meineXp)} XP
                </T>
              </View>
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

          {!session ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: abstand(3), padding: abstand(4), borderRadius: radius.l, backgroundColor: farben.flaeche, borderWidth: 1, borderColor: farben.linie }}>
              <Ionicons name="people-outline" size={22} color={farben.text2} />
              <T v="klein" style={{ flex: 1 }}>
                Übungsrangliste. Mit Konto trittst du gegen echte Lernende an.
              </T>
              {gast ? (
                <Pressable
                  onPress={async () => {
                    await abmelden();
                    router.replace("/registrieren");
                  }}
                  hitSlop={8}
                >
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
                  Diese Woche hat noch niemand gelernt – fang du an.
                </T>
              ) : null}
            </View>
          )}
        </>
      ) : (
        <>
          <Karte style={{ flexDirection: "row", alignItems: "center", gap: abstand(4) }}>
            <View style={{ flex: 1, gap: 2 }}>
              <T v="mini">Dein Duell-Rating</T>
              <T v="zahl" style={{ fontSize: 34, lineHeight: 38 }}>
                {stand.duell.rating}
              </T>
            </View>
            <View style={{ flexDirection: "row", gap: abstand(4) }}>
              {[
                { w: stand.duell.siege, l: "Siege", f: farben.gruen },
                { w: stand.duell.remis, l: "Remis", f: farben.text2 },
                { w: stand.duell.niederlagen, l: "Niederl.", f: farben.rot },
              ].map((x) => (
                <View key={x.l} style={{ alignItems: "center" }}>
                  <T v="h2" farbe={x.f}>
                    {x.w}
                  </T>
                  <T v="klein" style={{ fontSize: 11 }}>
                    {x.l}
                  </T>
                </View>
              ))}
            </View>
          </Karte>

          <T v="text">Fünf Fragen, je 20 Sekunden. Wer mehr richtig hat, gewinnt – und bekommt die meisten XP.</T>

          {GEGNER.map((g) => (
            <Karte key={g.id} style={{ flexDirection: "row", alignItems: "center", gap: abstand(3.5), padding: abstand(4) }}>
              <Avatar name={g.name} groesse={48} farbe={g.farbe} />
              <View style={{ flex: 1, gap: 2 }}>
                <T v="h3">{g.name}</T>
                <T v="klein" numberOfLines={1}>
                  {g.titel}
                </T>
                <T v="klein" farbe={farben.text4} style={{ fontSize: 12 }}>
                  Rating {g.rating}
                </T>
              </View>
              <Knopf titel="Duell" klein onPress={() => router.push({ pathname: "/duell", params: { gegner: g.id } })} style={{ paddingHorizontal: abstand(4) }} />
            </Karte>
          ))}
          <T v="klein" zentriert>
            Duelle gegen Freunde kommen mit dem nächsten Update.
          </T>
        </>
      )}
    </ScrollView>
  );
}
