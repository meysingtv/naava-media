import { Text, View } from "react-native";
import { router } from "expo-router";

import { Icon, type IconName } from "@/components/icon";
import { Lader } from "@/components/lader";
import { B, Balken, Chip, Eingabe, Kachel, Knopf, ListenZeile, n, Reiter, Spalte, Symbol, TOENE, UnterKopf, zahlen, type Ton } from "@/components/web/bunt";
import { WebSeite } from "@/components/web/rahmen";
import { GEGNER } from "@/lib/duell";
import { useKonto } from "@/lib/konto";
import { useLigaDaten } from "@/lib/liga-daten";
import { sicht, type DuellMitNamen } from "@/lib/online-duell";
import { type RangEintrag } from "@/lib/rangliste";
import { schutzFrei, serieAktuell, useStand } from "@/lib/stand";
import { serverVerbunden } from "@/lib/supabase";

// Liga & Duelle am PC: links die Rangliste der Woche mit der eigenen Liga
// darüber, rechts alles zum Duellieren – online und gegen Übungsgegner.

/** Farben für Platz 1–3. */
export const PODEST = [B.orange, "#8E97A3", "#B07A48"];

const AVATAR_TOENE: Ton[] = [TOENE.blau, TOENE.gruen, TOENE.lila, TOENE.pink, TOENE.tuerkis, TOENE.koralle, TOENE.indigo, TOENE.bernstein];

/** Runder Kreis mit Anfangsbuchstaben – Farbe fest je Name. */
export function Initiale({ name, farbe, groesse = 38 }: { name: string; farbe?: string; groesse?: number }) {
  let h = 0;
  for (const z of name) h = (h * 31 + z.charCodeAt(0)) >>> 0;
  const f = farbe ?? AVATAR_TOENE[h % AVATAR_TOENE.length].farbe;
  return (
    <View style={{ width: groesse, height: groesse, borderRadius: groesse / 2, backgroundColor: f, alignItems: "center", justifyContent: "center" }}>
      <Text style={{ ...n.schwarz, fontSize: groesse * 0.42, color: "#FFFFFF" }}>{(name.trim()[0] ?? "?").toUpperCase()}</Text>
    </View>
  );
}

/** Platz in der Liste – 1 bis 3 als farbige Plakette. */
export function Platz({ platz }: { platz: number }) {
  if (platz <= 3) {
    return (
      <View style={{ width: 30, alignItems: "center" }}>
        <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: PODEST[platz - 1], alignItems: "center", justifyContent: "center" }}>
          <Text style={{ ...n.schwarz, fontSize: 13.5, color: "#FFFFFF" }}>{platz}</Text>
        </View>
      </View>
    );
  }
  return <Text style={{ width: 30, textAlign: "center", ...n.schwarz, fontSize: 15, color: B.text3, fontVariant: ["tabular-nums"] }}>{platz}</Text>;
}

/** Eine Zeile der Rangliste. */
export function RangZeile({ platz, name, benutzername, wert, ich, oben }: { platz: number; name: string; benutzername: string; wert: string; ich?: boolean; oben?: boolean }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 14, minHeight: 62, paddingHorizontal: 18, paddingVertical: 10, borderTopWidth: oben ? 1.5 : 0, borderTopColor: B.ton, backgroundColor: ich ? B.orangeHell : "transparent" }}>
      <Platz platz={platz} />
      <Initiale name={name} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={{ ...n.fett, fontSize: 15.5, color: B.text }} numberOfLines={1}>
          {ich ? `${name} (du)` : name}
        </Text>
        <Text style={{ ...n.halb, fontSize: 13, color: B.text3 }} numberOfLines={1}>
          @{benutzername}
        </Text>
      </View>
      <Text style={{ ...n.schwarz, fontSize: 15.5, color: ich ? B.orangeKante : B.text2, fontVariant: ["tabular-nums"] }}>{wert}</Text>
    </View>
  );
}

function duellStatus(d: DuellMitNamen, ich: string): { text: string; ton: Ton; icon: IconName } {
  const s = sicht(d, ich);
  const grau = { farbe: "#8A8F96", kante: "#6E737A", hell: "#F0F1F2" };
  if (d.status === "fertig") {
    const stand = `${s.meine ?? 0} : ${s.seine ?? 0}`;
    if (s.gewonnen) return { text: `Gewonnen · ${stand}`, ton: TOENE.gruen, icon: "trophy" };
    if (s.verloren) return { text: `Verloren · ${stand}`, ton: TOENE.rot, icon: "flag" };
    return { text: `Unentschieden · ${stand}`, ton: grau, icon: "git-compare" };
  }
  if (s.ichDran) return { text: "Du bist dran", ton: TOENE.orange, icon: "play" };
  return { text: d.art === "freund" && !d.spieler2 ? `Code ${d.code} – wartet auf Freund` : "Wartet auf Gegner", ton: grau, icon: "hourglass" };
}

export function LigaWeb() {
  const { stand } = useStand();
  const { session, profil, gast } = useKonto();
  const { ich, regional, regionalWaehlen, liste, laedt, duelle, code, setCode, arbeitet, starte, kontoErstellen, meineXp, liga, bundesland, ichEintrag, tageRest, online } = useLigaDaten();
  const serie = serieAktuell(stand);
  const schutz = schutzFrei(stand);
  const restText = `noch ${tageRest} ${tageRest === 1 ? "Tag" : "Tage"}`;

  return (
    <WebSeite ohneRechts>
      <Spalte>
        <UnterKopf titel="Liga & Duelle" unter={`${liga.name} · Wertung dieser Woche · ${restText}`} />

        <View style={{ flexDirection: "row", gap: 24, flexWrap: "wrap", alignItems: "flex-start" }}>
          {/* Rangliste */}
          <View style={{ flex: 3, minWidth: 480, gap: 20 }}>
            <Kachel style={{ padding: 24, gap: 18 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
                <View style={{ width: 52, height: 52, borderRadius: 15, backgroundColor: liga.farbe, alignItems: "center", justifyContent: "center" }}>
                  <Icon name="trophy" size={26} color="#FFFFFF" />
                </View>
                <View style={{ flex: 1, gap: 1 }}>
                  <Text style={{ ...n.schwarz, fontSize: 20, color: B.text }}>{liga.name}</Text>
                  <Text style={{ ...n.halb, fontSize: 14, color: B.text2 }}>Wertung dieser Woche · {restText}</Text>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={{ ...n.schwarz, fontSize: 28, lineHeight: 32, color: B.text, fontVariant: ["tabular-nums"] }}>{ichEintrag ? `#${ichEintrag.platz}` : "–"}</Text>
                  <Text style={{ ...n.halb, fontSize: 13, color: B.text3 }}>{zahlen(meineXp)} XP diese Woche</Text>
                </View>
              </View>
              {liga.bis ? (
                <View style={{ gap: 7 }}>
                  <Balken anteil={stand.xp / liga.bis} ton={{ farbe: liga.farbe, kante: liga.farbe, hell: B.ton }} hoehe={10} />
                  <Text style={{ ...n.halb, fontSize: 13.5, color: B.text2 }}>
                    Noch {zahlen(Math.max(0, liga.bis - stand.xp))} XP bis zur {liga.naechste}
                  </Text>
                </View>
              ) : null}
              <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
                <Chip icon="flame" text={`${serie} ${serie === 1 ? "Tag" : "Tage"} Serie`} ton={TOENE.orange} />
                <Chip icon="shield-checkmark" text={schutz ? "Serien-Schutz bereit" : "Schutz verbraucht"} ton={schutz ? TOENE.blau : { farbe: B.text3, kante: B.text2, hell: B.ton }} />
              </View>
            </Kachel>

            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <Text style={{ ...n.schwarz, fontSize: 20, color: B.text }}>Rangliste</Text>
              <Reiter<"de" | "land">
                wert={regional ? "land" : "de"}
                onWechsel={(w) => regionalWaehlen(w === "land")}
                optionen={[
                  { id: "de", titel: "Deutschland" },
                  { id: "land", titel: bundesland ?? "Mein Bundesland" },
                ]}
              />
            </View>

            {!session ? (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 14, paddingLeft: 18, borderRadius: 16, backgroundColor: B.ton, flexWrap: "wrap" }}>
                <Icon name="people-outline" size={21} color={B.text2} />
                <Text style={{ flex: 1, minWidth: 220, ...n.halb, fontSize: 14.5, color: B.text2 }}>Übungsrangliste. Mit Konto trittst du gegen echte Lernende an.</Text>
                {gast ? <Knopf titel="Konto erstellen" ton="gruen" groesse="klein" onPress={kontoErstellen} /> : null}
              </View>
            ) : null}

            {laedt || !liste ? (
              <Lader color={B.orange} style={{ marginTop: 24 }} />
            ) : liste.length === 0 ? (
              <Kachel>
                <View style={{ padding: 28, alignItems: "center" }}>
                  <Text style={{ ...n.halb, fontSize: 15, color: B.text2, textAlign: "center" }}>Diese Woche hat hier noch niemand gelernt – fang du an.</Text>
                </View>
              </Kachel>
            ) : (
              <Kachel>
                {liste.slice(0, 30).map((e: RangEintrag, i) => (
                  <View key={e.id}>
                    {i === 3 ? <Aufstiegszone /> : null}
                    <RangZeile platz={e.platz} name={e.name} benutzername={e.benutzername} wert={`${zahlen(e.xp)} XP`} ich={e.ich} oben={i > 0 && i !== 3} />
                  </View>
                ))}
              </Kachel>
            )}
          </View>

          {/* Duelle */}
          <View style={{ flex: 2, minWidth: 340, gap: 20 }}>
            <Kachel style={{ padding: 22, gap: 18 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
                <Symbol icon="trophy" ton={TOENE.orange} groesse={46} />
                <View style={{ flex: 1 }}>
                  <Text style={{ ...n.schwarz, fontSize: 17, color: B.text }}>Rangliste-Duell</Text>
                  <Text style={{ ...n.halb, fontSize: 13.5, color: B.text2 }}>Zufälliger Gegner · 10 Fragen · Elo-Wertung</Text>
                </View>
              </View>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 12, paddingHorizontal: 16, borderRadius: 14, backgroundColor: B.ton }}>
                <Text style={{ ...n.fett, fontSize: 14.5, color: B.text2 }}>Dein Elo</Text>
                <Text style={{ ...n.schwarz, fontSize: 20, color: B.text, fontVariant: ["tabular-nums"] }}>{profil?.elo ?? 1000}</Text>
              </View>
              {online ? (
                <Knopf titel={arbeitet === "suche" ? "Suche Gegner …" : "Gegner suchen"} icon="search" deaktiviert={arbeitet !== null} onPress={() => starte("suche")} />
              ) : (
                <Knopf titel="Mit Konto spielen" art="rand" ton="orange" onPress={gast ? kontoErstellen : () => router.push("/einstellungen")} deaktiviert={!serverVerbunden} />
              )}
            </Kachel>

            <Kachel>
              <ListenZeile icon="podium" ton={TOENE.gelb} titel="Top 100 nach Elo" unter="Die besten Duellantinnen und Duellanten" onPress={() => router.push("/elo")} />
            </Kachel>

            <Kachel style={{ padding: 22, gap: 16 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
                <Symbol icon="people" ton={TOENE.blau} groesse={46} />
                <View style={{ flex: 1 }}>
                  <Text style={{ ...n.schwarz, fontSize: 17, color: B.text }}>Freundes-Duell</Text>
                  <Text style={{ ...n.halb, fontSize: 13.5, color: B.text2 }}>Code erstellen und teilen – ohne Elo, nur zum Spaß</Text>
                </View>
              </View>
              {online ? (
                <>
                  <Knopf titel={arbeitet === "code" ? "Erstelle Code …" : "Code erstellen"} icon="add" art="rand" ton="blau" deaktiviert={arbeitet !== null} onPress={() => starte("code")} />
                  <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 10 }}>
                    <View style={{ flex: 1 }}>
                      <Eingabe
                        icon="key-outline"
                        value={code}
                        onChangeText={(t) => setCode(t.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 5))}
                        placeholder="Code eingeben"
                        autoCapitalize="characters"
                        autoCorrect={false}
                        onSubmitEditing={() => code.length >= 5 && arbeitet === null && starte("beitritt")}
                      />
                    </View>
                    <Knopf titel={arbeitet === "beitritt" ? "…" : "Los"} ton="blau" deaktiviert={code.length < 5 || arbeitet !== null} onPress={() => starte("beitritt")} style={{ height: 48 }} />
                  </View>
                </>
              ) : (
                <Text style={{ ...n.halb, fontSize: 14, color: B.text3 }}>Freundes-Duelle brauchen ein Konto.</Text>
              )}
            </Kachel>

            {online && duelle.length > 0 ? (
              <View style={{ gap: 12 }}>
                <Text style={{ ...n.schwarz, fontSize: 18, color: B.text }}>Deine Duelle</Text>
                <Kachel>
                  {duelle.map((d, i) => {
                    const s = sicht(d, ich);
                    const st = duellStatus(d, ich);
                    const aufrufbar = s.ichDran || d.status === "fertig";
                    return (
                      <ListenZeile
                        key={d.id}
                        icon={st.icon}
                        ton={st.ton}
                        titel={s.gegnerName ?? (d.art === "freund" ? "Freundes-Duell" : "Rangliste-Duell")}
                        unter={st.text}
                        oben={i > 0}
                        rechts={s.elo != null ? <Text style={{ ...n.schwarz, fontSize: 14.5, color: s.elo >= 0 ? B.gruenKante : B.rotKante }}>{`${s.elo >= 0 ? "+" : ""}${s.elo} Elo`}</Text> : undefined}
                        onPress={aufrufbar ? () => router.push({ pathname: "/online-duell", params: { id: d.id } }) : undefined}
                      />
                    );
                  })}
                </Kachel>
              </View>
            ) : null}

            <View style={{ gap: 12 }}>
              <View style={{ gap: 2 }}>
                <Text style={{ ...n.schwarz, fontSize: 18, color: B.text }}>Übungsduelle</Text>
                <Text style={{ ...n.halb, fontSize: 14, color: B.text2 }}>Gegen drei Übungsgegner – klappt auch ohne Internet. Fünf Fragen, je 20 Sekunden.</Text>
              </View>
              <Kachel>
                {GEGNER.map((g, i) => (
                  <View key={g.id} style={{ flexDirection: "row", alignItems: "center", gap: 14, minHeight: 68, paddingHorizontal: 18, paddingVertical: 10, borderTopWidth: i > 0 ? 1.5 : 0, borderTopColor: B.ton }}>
                    <Initiale name={g.name} farbe={g.farbe} groesse={42} />
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={{ ...n.fett, fontSize: 15.5, color: B.text }}>{g.name}</Text>
                      <Text style={{ ...n.halb, fontSize: 13.5, color: B.text2 }} numberOfLines={1}>
                        {g.titel}
                      </Text>
                      <Text style={{ ...n.halb, fontSize: 12.5, color: B.text3 }}>Rating {g.rating}</Text>
                    </View>
                    <Knopf titel="Duell" icon="flash" art="rand" ton="orange" groesse="klein" onPress={() => router.push({ pathname: "/duell", params: { gegner: g.id } })} />
                  </View>
                ))}
              </Kachel>
            </View>
          </View>
        </View>
      </Spalte>
    </WebSeite>
  );
}

/** Trennlinie unter den ersten drei Plätzen. */
function Aufstiegszone() {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 18, paddingVertical: 8, borderTopWidth: 1.5, borderTopColor: B.ton, borderBottomWidth: 1.5, borderBottomColor: B.ton }}>
      <Icon name="arrow-up" size={14} color={B.gruenKante} />
      <Text style={{ ...n.fett, fontSize: 12.5, color: B.gruenKante }}>Aufstiegszone</Text>
      <View style={{ flex: 1, height: 1.5, backgroundColor: B.gruenHell }} />
    </View>
  );
}
