import { type ReactNode } from "react";
import { Text, View } from "react-native";
import { router } from "expo-router";

import { Icon, type IconName } from "@/components/icon";
import { Lader } from "@/components/lader";
import { NutzerBild } from "@/components/profilbild";
import { Abschnitt, B, Balken, Chip, DickRing, Kachel, Knopf, n, Spalte, Symbol, THEMA_TON, TOENE, UnterKopf, type Ton } from "@/components/web/bunt";
import { EreignisZeileWeb, KontoNoetig, ListenKachel, ZweiSpalten } from "@/components/web/crew-web";
import { WebSeite } from "@/components/web/rahmen";
import { bossVon, HEILUNG_FALSCH, SCHADEN_RICHTIG, XP_TRUHE, type CrewDaten, type CrewMitglied } from "@/lib/crew";
import { themaVon } from "@/lib/fragen";

// Wochen-Boss am PC: oben der Boss im Lebensring, daneben was bis zum Sieg
// fehlt und der Knopf zum Angreifen. Darunter links der Schaden je Mitglied,
// rechts der Kampfverlauf und die Belohnung.

type Kaempfer = { m: CrewMitglied; schaden: number };

export type CrewBossWebProps = {
  daten: CrewDaten | null;
  /** Kann man überhaupt eine Crew haben (Konto)? */
  moeglich: boolean;
  kampf: { liste: Kaempfer[]; genau: boolean } | null;
  kalenderwoche: number;
  rest: string;
  belohnungen: boolean;
  onAbholen: () => void;
};

const RANG_TON: Record<number, Ton> = { 1: TOENE.gelb, 2: { farbe: "#A9B1BA", kante: "#8B939C", hell: "#F0F2F4" }, 3: TOENE.bernstein };

function Rang({ rang }: { rang: number }) {
  const ton = RANG_TON[rang];
  return (
    <View style={{ width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: ton ? ton.farbe : "transparent" }}>
      <Text style={{ ...n.schwarz, fontSize: 13.5, color: ton ? "#FFFFFF" : B.text3 }}>{rang > 0 ? rang : "–"}</Text>
    </View>
  );
}

function KaempferZeile({ k, rang, max }: { k: Kaempfer; rang: number; max: number }) {
  const aktiv = k.schaden > 0;
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 14, minHeight: 68, paddingHorizontal: 18, paddingVertical: 10 }}>
      <Rang rang={aktiv ? rang : 0} />
      <View style={{ opacity: aktiv ? 1 : 0.5 }}>
        <NutzerBild pfad={k.m.bild} name={k.m.name} farbe={k.m.farbe} groesse={40} rand={0} />
      </View>
      <View style={{ flex: 1, minWidth: 0, gap: 7 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Text style={{ flexShrink: 1, ...n.fett, fontSize: 15.5, color: B.text }} numberOfLines={1}>
            {k.m.ich ? "Du" : k.m.name}
          </Text>
          {rang === 1 && aktiv ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4, height: 22, paddingHorizontal: 8, borderRadius: 11, backgroundColor: B.orangeHell }}>
              <Icon name="flame" size={12} color={B.orange} />
              <Text style={{ ...n.fett, fontSize: 12, color: B.orangeKante }}>Bester Kämpfer</Text>
            </View>
          ) : null}
        </View>
        {aktiv ? (
          <Balken anteil={max > 0 ? k.schaden / max : 0} ton={TOENE.orange} hoehe={8} />
        ) : (
          <Text style={{ ...n.halb, fontSize: 13, color: k.schaden < 0 ? B.rotKante : B.text3 }}>{k.schaden < 0 ? "Hat den Boss geheilt" : "Noch kein Treffer"}</Text>
        )}
      </View>
      <Text style={{ minWidth: 70, textAlign: "right", ...n.schwarz, fontSize: 15, color: aktiv ? B.text : k.schaden < 0 ? B.rotKante : B.text3, fontVariant: ["tabular-nums"] }}>
        {k.schaden > 0 ? `−${k.schaden}` : k.schaden < 0 ? `+${-k.schaden}` : "0"} HP
      </Text>
    </View>
  );
}

function Regel({ icon, ton, text }: { icon: IconName; ton: Ton; text: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
      <Icon name={icon} size={20} color={ton.farbe} />
      <Text style={{ ...n.fett, fontSize: 14.5, color: B.text2, fontVariant: ["tabular-nums"] }}>{text}</Text>
    </View>
  );
}

function Rahmen({ children, unter }: { children: ReactNode; unter?: string }) {
  return (
    <WebSeite ohneRechts>
      <Spalte>
        <UnterKopf titel="Wochen-Boss" unter={unter ?? "Besiegt ihn zusammen – mit jeder richtigen Antwort."} onZurueck={() => (router.canGoBack() ? router.back() : router.navigate("/crew"))} />
        {children}
      </Spalte>
    </WebSeite>
  );
}

export function CrewBossWeb({ daten, moeglich, kampf, kalenderwoche, rest, belohnungen, onAbholen }: CrewBossWebProps) {
  const boss = daten?.boss;

  if (!moeglich)
    return (
      <Rahmen>
        <KontoNoetig titel="Der Wochen-Boss braucht eine Crew" text="Mit einem kostenlosen Konto gründest du eine Crew oder trittst einer bei – dann kämpft ihr jede Woche gemeinsam." />
      </Rahmen>
    );

  if (!boss || !daten?.crew)
    return (
      <Rahmen>
        <View style={{ alignItems: "center", gap: 14, paddingVertical: 80 }}>
          <Lader color={B.text3} size={28} />
          <Text style={{ ...n.halb, fontSize: 15, color: B.text3 }}>Boss wird geladen …</Text>
        </View>
      </Rahmen>
    );

  const b = bossVon(boss.thema);
  const thema = themaVon(boss.thema);
  const ton = THEMA_TON[boss.thema];
  const ereignisse = daten.ereignisse ?? [];
  const treffer = ereignisse.filter((e) => e.art === "treffer" || e.art === "sieg");
  const liste = kampf?.liste ?? [];
  const bester = Math.max(0, ...liste.map((k) => k.schaden));
  const geschafft = boss.hp_max > 0 ? Math.round(((boss.hp_max - boss.hp) / boss.hp_max) * 100) : 0;
  const truhen = daten.belohnungen ?? 0;
  const ichId = daten.mitglieder?.find((m) => m.ich)?.id;
  const fehlen = Math.ceil(boss.hp / SCHADEN_RICHTIG);

  return (
    <Rahmen unter={`${daten.crew.name} · KW ${kalenderwoche} · ${boss.besiegt ? "neuer Boss am Montag" : rest}`}>
      {/* Arena */}
      <Kachel style={{ padding: 28, flexDirection: "row", alignItems: "center", gap: 36, flexWrap: "wrap" }}>
        <DickRing anteil={boss.besiegt ? 1 : boss.hp_max ? boss.hp / boss.hp_max : 0} groesse={184} dicke={14} ton={boss.besiegt ? TOENE.gruen : TOENE.rot}>
          <View style={{ width: 132, height: 132, borderRadius: 66, backgroundColor: B.ton, alignItems: "center", justifyContent: "center" }}>
            <Text style={{ fontSize: 66, lineHeight: 82, opacity: boss.besiegt ? 0.45 : 1, transform: [{ rotate: boss.besiegt ? "-12deg" : "0deg" }] }}>{b.emoji}</Text>
          </View>
        </DickRing>

        <View style={{ flex: 1, minWidth: 320, gap: 18 }}>
          <View style={{ gap: 8 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <Symbol icon={thema.icon as IconName} ton={ton} groesse={30} />
              <Text style={{ ...n.fett, fontSize: 14.5, color: ton.kante }}>{thema.titel}</Text>
              <Chip icon={boss.besiegt ? "checkmark" : "heart"} text={boss.besiegt ? "Besiegt" : `${boss.hp} / ${boss.hp_max} HP`} ton={boss.besiegt ? TOENE.gruen : TOENE.rot} />
            </View>
            <Text style={{ ...n.schwarz, fontSize: 34, lineHeight: 40, color: B.text }} numberOfLines={1}>
              {b.name}
            </Text>
          </View>

          {truhen ? (
            <>
              <Text style={{ ...n.halb, fontSize: 16, lineHeight: 23, color: B.text2 }}>Boss besiegt! Eure Belohnung wartet – hol sie dir ab.</Text>
              <Knopf titel="Belohnung abholen" icon="gift" ton="gruen" groesse="gross" onPress={onAbholen} style={{ alignSelf: "flex-start", minWidth: 240 }} />
              <Text style={{ ...n.halb, fontSize: 13.5, color: B.text3 }}>{belohnungen ? `+${XP_TRUHE * truhen} XP und das Abzeichen „Bossbezwinger“` : "Abzeichen „Bossbezwinger“"}</Text>
            </>
          ) : boss.besiegt ? (
            <Text style={{ ...n.halb, fontSize: 16, lineHeight: 23, color: B.text2 }}>Stark gemacht, Crew! Am Montag wartet der nächste Boss – aus eurem dann schwächsten Thema.</Text>
          ) : (
            <>
              <Text style={{ ...n.schwarz, fontSize: 22, color: B.text, fontVariant: ["tabular-nums"] }}>
                {fehlen} {fehlen === 1 ? "richtige Antwort" : "richtige Antworten"}
                <Text style={{ ...n.halb, fontSize: 16, color: B.text2 }}> fehlen euch noch bis zum Sieg</Text>
              </Text>
              <View style={{ flexDirection: "row", gap: 24, flexWrap: "wrap" }}>
                <Regel icon="checkmark-circle" ton={TOENE.gruen} text={`Richtig: −${SCHADEN_RICHTIG} HP`} />
                <Regel icon="close-circle" ton={TOENE.rot} text={`Falsch: +${HEILUNG_FALSCH} HP`} />
              </View>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
                <Knopf titel="Angreifen" icon="flash" groesse="gross" onPress={() => router.push({ pathname: "/training", params: { modus: "thema", thema: boss.thema } })} style={{ minWidth: 220 }} />
                <Text style={{ ...n.halb, fontSize: 14, color: B.text3 }}>Fragen aus „{thema.titel}“</Text>
              </View>
            </>
          )}
        </View>

        <View style={{ width: 200, gap: 18, paddingLeft: 28, borderLeftWidth: 1.5, borderLeftColor: B.ton }}>
          {[
            { icon: "pie-chart" as IconName, ton: TOENE.orange, wert: `${geschafft} %`, titel: "geschafft" },
            { icon: "flash" as IconName, ton: TOENE.rot, wert: String(Math.max(0, boss.hp_max - boss.hp)), titel: "Schaden gemacht" },
            { icon: "people" as IconName, ton: TOENE.koralle, wert: `${liste.filter((k) => k.schaden > 0).length} / ${liste.length}`, titel: "haben getroffen" },
          ].map((w) => (
            <View key={w.titel} style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <Icon name={w.icon} size={24} color={w.ton.farbe} />
              <View>
                <Text style={{ ...n.schwarz, fontSize: 20, lineHeight: 24, color: B.text, fontVariant: ["tabular-nums"] }}>{w.wert}</Text>
                <Text style={{ ...n.halb, fontSize: 13, color: B.text2 }}>{w.titel}</Text>
              </View>
            </View>
          ))}
        </View>
      </Kachel>

      <ZweiSpalten
        links={
          liste.length ? (
            <View>
              <Abschnitt titel={kampf?.genau === false ? "Letzte Treffer" : "Schaden diese Woche"} link={`${liste.length} in der Crew`} />
              <ListenKachel>
                {liste.map((k, i) => (
                  <KaempferZeile key={k.m.id} k={k} rang={i + 1} max={bester} />
                ))}
              </ListenKachel>
            </View>
          ) : null
        }
        rechts={
          <>
            <View>
              <Abschnitt titel="Kampfverlauf" link={boss.besiegt ? undefined : "aktualisiert sich laufend"} />
              {treffer.length ? (
                <ListenKachel>
                  {treffer.slice(0, 10).map((e) => (
                    <EreignisZeileWeb key={e.id} e={e} ich={ichId} />
                  ))}
                </ListenKachel>
              ) : (
                <Kachel style={{ padding: 20, flexDirection: "row", alignItems: "center", gap: 14 }}>
                  <Symbol icon="flash" ton={TOENE.orange} groesse={40} />
                  <Text style={{ flex: 1, ...n.halb, fontSize: 14.5, lineHeight: 20, color: B.text2 }}>Noch keine Treffer diese Woche – mach den ersten!</Text>
                </Kachel>
              )}
            </View>
            {boss.besiegt ? null : (
              <Kachel style={{ padding: 20, flexDirection: "row", alignItems: "center", gap: 14 }}>
                <Symbol icon="trophy" ton={TOENE.gelb} groesse={48} />
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={{ ...n.halb, fontSize: 13, color: B.text3 }}>Belohnung bei Sieg</Text>
                  <Text style={{ ...n.schwarz, fontSize: 16, color: B.text }}>Abzeichen „Bossbezwinger“</Text>
                  <Text style={{ ...n.fett, fontSize: 13.5, color: belohnungen ? B.orangeKante : B.text2 }}>{belohnungen ? `+${XP_TRUHE} XP-Truhe für alle` : "Für alle in der Crew"}</Text>
                </View>
              </Kachel>
            )}
          </>
        }
      />
    </Rahmen>
  );
}
