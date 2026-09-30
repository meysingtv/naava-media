import { useCallback, useEffect } from "react";
import { RefreshControl, ScrollView, Text, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BossBild, EreignisZeile, HpBalken } from "@/components/crew";
import { dialog } from "@/components/dialog";
import { Icon } from "@/components/icon";
import { NutzerBild } from "@/components/profilbild";
import { Seite } from "@/components/seite";
import { Abschnitt, Gruppe, kartenFlaeche, Knopf, Kopf, T } from "@/components/ui";
import { bossVon, HEILUNG_FALSCH, SCHADEN_RICHTIG, useCrew, XP_TRUHE } from "@/lib/crew";
import { useDarstellung } from "@/lib/darstellung";
import { themaVon } from "@/lib/fragen";
import { erfolg } from "@/lib/haptik";
import { abstand, farben, mitDeckkraft, RAND, schrift } from "@/lib/theme";

function restZeit(bis: string): string {
  const ende = new Date(`${bis}T00:00:00`);
  const ms = ende.getTime() - Date.now();
  if (ms <= 0) return "endet gleich";
  const tage = Math.floor(ms / 86400000);
  const std = Math.floor((ms % 86400000) / 3600000);
  if (tage >= 1) return `noch ${tage} ${tage === 1 ? "Tag" : "Tage"}`;
  return `noch ${std} Std.`;
}

/** Wochen-Boss der Crew: Lebensbalken, Angreifen, Live-Liste der Treffer, Belohnung. */
export default function CrewBoss() {
  const insets = useSafeAreaInsets();
  const { farbwelt: f, belohnungen } = useDarstellung();
  const gruen = f.hell ? "#23A548" : "#4ED053";
  const { daten, laedt, neuLaden, belohnungenAbholen } = useCrew();

  useFocusEffect(
    useCallback(() => {
      neuLaden();
      // Solange die Seite offen ist, regelmäßig auffrischen – so sieht man die Treffer der anderen.
      const t = setInterval(neuLaden, 10000);
      return () => clearInterval(t);
    }, [neuLaden]),
  );

  const boss = daten?.boss;
  useEffect(() => {
    if (daten && !daten.crew) router.replace("/crew");
  }, [daten]);
  if (!boss || !daten?.crew)
    return (
      <Seite>
        <Kopf titel="Wochen-Boss" />
      </Seite>
    );

  const b = bossVon(boss.thema);
  const thema = themaVon(boss.thema);
  const treffer = (daten.ereignisse ?? []).filter((e) => e.art === "treffer" || e.art === "sieg");

  async function abholen() {
    const xp = await belohnungenAbholen();
    if (xp > 0) {
      erfolg();
      dialog("XP-Truhe geöffnet!", belohnungen ? `+${xp} XP und das Abzeichen „Bossbezwinger“ gehören dir.` : "Das Abzeichen „Bossbezwinger“ gehört dir.");
    }
  }

  return (
    <Seite>
      <Kopf titel="Wochen-Boss" />
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: RAND, paddingBottom: insets.bottom + abstand(10), gap: abstand(6) }}
        refreshControl={<RefreshControl refreshing={laedt} onRefresh={neuLaden} tintColor={f.orange} />}
        showsVerticalScrollIndicator={false}
      >
        <BossBild thema={boss.thema} hoehe={330} emojiGroesse={96} radius={28} besiegt={boss.besiegt}>
          <View style={{ position: "absolute", top: 14, left: 14, paddingHorizontal: 10, height: 26, borderRadius: 13, backgroundColor: boss.besiegt ? farben.gruen : farben.orange, justifyContent: "center" }}>
            <Text style={{ ...schrift.textFett, fontSize: 12.5, color: "#FFFFFF" }}>{boss.besiegt ? "Besiegt!" : `Diese Woche · ${restZeit(boss.bis)}`}</Text>
          </View>
          <View style={{ flex: 1, justifyContent: "flex-end", padding: 18, gap: 8 }}>
            <View style={{ alignItems: "center" }}>
              <Text style={{ ...schrift.titel, fontSize: 28, color: "#FFFFFF", textShadowColor: "rgba(0,0,0,0.6)", textShadowRadius: 8 }}>{b.name}</Text>
              <Text style={{ ...schrift.textMittel, fontSize: 14.5, color: "#E4E6EA" }}>Thema: {thema.titel}</Text>
            </View>
            <HpBalken hp={boss.hp} max={boss.hp_max} hoehe={14} />
            <Text style={{ ...schrift.titelFett, fontSize: 16, color: "#FFFFFF", textAlign: "center", fontVariant: ["tabular-nums"] }}>
              {boss.hp} / {boss.hp_max} HP
            </Text>
          </View>
        </BossBild>

        <View style={{ flexDirection: "row", justifyContent: "center", gap: 10, marginTop: -abstand(2) }}>
          {(daten.mitglieder ?? []).map((m) => (
            <View key={m.id} style={{ alignItems: "center", gap: 3 }}>
              <NutzerBild pfad={m.bild} name={m.name} farbe={m.farbe} groesse={40} rand={2} />
              <Text style={{ ...schrift.textMittel, fontSize: 11.5, color: f.text3 }}>{m.ich ? "Du" : m.name.split(" ")[0]}</Text>
            </View>
          ))}
        </View>

        {daten.belohnungen ? (
          <Knopf titel={belohnungen ? `XP-Truhe öffnen (+${XP_TRUHE * daten.belohnungen} XP)` : "Truhe öffnen"} icon="gift" onPress={abholen} />
        ) : boss.besiegt ? (
          <View style={{ alignItems: "center", gap: 4, padding: abstand(4), borderRadius: 22, backgroundColor: f.hell ? mitDeckkraft(gruen, 0.1) : farben.gruenDunkel, borderWidth: 1, borderColor: gruen }}>
            <Text style={{ ...schrift.titelFett, fontSize: 17, color: gruen }}>Stark gemacht, Crew!</Text>
            <T v="klein" zentriert>
              Am Montag wartet der nächste Boss – aus eurem dann schwächsten Thema.
            </T>
          </View>
        ) : (
          <View style={{ gap: abstand(2) }}>
            <Knopf
              titel="Jetzt angreifen"
              icon="flash"
              onPress={() => router.push({ pathname: "/training", params: { modus: "thema", thema: boss.thema } })}
            />
            <T v="klein" zentriert>
              Jede richtige Antwort aus „{thema.titel}“ macht {SCHADEN_RICHTIG} Schaden, jede falsche heilt ihn um {HEILUNG_FALSCH}.
            </T>
          </View>
        )}

        <View>
          <Abschnitt titel="Crew-Aktivität (live)" />
          {treffer.length ? (
            <Gruppe>
              {treffer.slice(0, 15).map((e) => (
                <EreignisZeile key={e.id} e={e} />
              ))}
            </Gruppe>
          ) : (
            <View style={[{ flexDirection: "row", alignItems: "center", gap: 12, padding: abstand(4), borderRadius: 22 }, kartenFlaeche(f)]}>
              <Icon name="flash" size={20} color={f.text3} />
              <T v="klein" style={{ flex: 1 }}>
                Noch keine Treffer diese Woche – mach den ersten!
              </T>
            </View>
          )}
        </View>

        <View>
          <Abschnitt titel="Belohnung bei Sieg" />
          <View style={{ flexDirection: "row", gap: abstand(3) }}>
            {[
              { emoji: "🛡️", titel: "Crew-Abzeichen", unter: "„Bossbezwinger“ für alle" },
              { emoji: "🎁", titel: belohnungen ? "XP-Truhe" : "Truhe", unter: belohnungen ? `+${XP_TRUHE} XP für alle` : "Für alle in der Crew" },
            ].map((x) => (
              <View key={x.titel} style={[{ flex: 1, alignItems: "center", gap: 6, paddingVertical: abstand(4), paddingHorizontal: abstand(2), borderRadius: 22 }, kartenFlaeche(f)]}>
                <Text style={{ fontSize: 34 }}>{x.emoji}</Text>
                <Text style={{ ...schrift.textFett, fontSize: 14.5, color: f.text }}>{x.titel}</Text>
                <Text style={{ ...schrift.text, fontSize: 12, color: f.text3, textAlign: "center" }}>{x.unter}</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </Seite>
  );
}
