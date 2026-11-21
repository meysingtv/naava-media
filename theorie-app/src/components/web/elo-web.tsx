import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { router } from "expo-router";

import { Lader } from "@/components/lader";
import { B, Kachel, Knopf, Leer, ListenZeile, n, Spalte, TOENE, UnterKopf } from "@/components/web/bunt";
import { RangZeile } from "@/components/web/liga-web";
import { WebSeite } from "@/components/web/rahmen";
import { useKonto } from "@/lib/konto";
import { eloRanglisteLaden, type EloEintrag } from "@/lib/online-duell";

// Top 100 nach Elo am PC: links das eigene Elo und der Platz, rechts die
// Bestenliste als ruhige Liste.

export function EloWeb() {
  const { session, profil } = useKonto();
  const [liste, setListe] = useState<EloEintrag[] | null | undefined>(undefined);

  useEffect(() => {
    if (!session) {
      setListe(null);
      return;
    }
    eloRanglisteLaden().then(setListe);
  }, [session]);

  const ich = session?.user.id;
  const meinPlatz = liste?.find((e) => e.id === ich)?.platz;

  return (
    <WebSeite ohneRechts>
      <Spalte>
        <UnterKopf titel="Top 100 nach Elo" unter="Die besten Duellantinnen und Duellanten" />

        <View style={{ flexDirection: "row", gap: 24, flexWrap: "wrap", alignItems: "flex-start" }}>
          <View style={{ width: 340, gap: 20 }}>
            <Kachel style={{ padding: 24, gap: 18 }}>
              <View style={{ flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between" }}>
                <View>
                  <Text style={{ ...n.fett, fontSize: 14, color: B.text3 }}>Dein Elo</Text>
                  <Text style={{ ...n.schwarz, fontSize: 40, lineHeight: 46, color: B.text, fontVariant: ["tabular-nums"] }}>{profil?.elo ?? 1000}</Text>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={{ ...n.fett, fontSize: 14, color: B.text3 }}>Platz</Text>
                  <Text style={{ ...n.schwarz, fontSize: 26, lineHeight: 34, color: meinPlatz ? B.orange : B.text3, fontVariant: ["tabular-nums"] }}>{meinPlatz ? `#${meinPlatz}` : "–"}</Text>
                </View>
              </View>
              <Text style={{ ...n.halb, fontSize: 14, lineHeight: 20, color: B.text2 }}>Gewertet werden nur Rangliste-Duelle gegen zufällige Gegner. Freundes- und Übungsduelle zählen nicht.</Text>
            </Kachel>
            <Kachel>
              <ListenZeile icon="trophy" ton={TOENE.orange} titel="Rangliste-Duell" unter="Zufälliger Gegner · 10 Fragen" onPress={() => router.push("/liga")} />
            </Kachel>
          </View>

          <View style={{ flex: 1, minWidth: 420 }}>
            {liste === undefined ? (
              <Lader color={B.orange} style={{ marginTop: 40 }} />
            ) : !liste || liste.length === 0 ? (
              <Kachel>
                <Leer
                  icon="podium"
                  ton={TOENE.gelb}
                  titel={session ? "Noch keine gewerteten Duelle" : "Nur mit Konto"}
                  text={session ? "Spiel ein Rangliste-Duell und eröffne die Liste." : "Die Elo-Bestenliste siehst du mit Konto."}
                >
                  {session ? (
                    <Knopf titel="Zum Duell" icon="flash" onPress={() => router.push("/liga")} />
                  ) : (
                    <>
                      <Knopf titel="Anmelden" art="rand" ton="blau" onPress={() => router.push("/anmelden")} />
                      <Knopf titel="Konto erstellen" ton="gruen" onPress={() => router.push("/registrieren")} />
                    </>
                  )}
                </Leer>
              </Kachel>
            ) : (
              <Kachel>
                {liste.map((e, i) => (
                  <RangZeile key={e.id} platz={e.platz} name={e.name} benutzername={e.benutzername} wert={String(e.elo)} ich={e.id === ich} oben={i > 0} />
                ))}
              </Kachel>
            )}
          </View>
        </View>
      </Spalte>
    </WebSeite>
  );
}
