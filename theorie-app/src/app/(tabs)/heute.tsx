import { Pressable, ScrollView, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Abschnitt, Avatar, Karte, Knopf, Plakette, T, type IconName } from "@/components/ui";
import { Ring, Segmente, Tacho } from "@/components/grafik";
import { INHALT_UNTEN } from "@/components/tab-leiste";
import { THEMEN } from "@/lib/fragen";
import { datumLang, datumKurz } from "@/lib/format";
import { useKonto } from "@/lib/konto";
import {
  fehlerIds,
  gemerktIds,
  heuteBeantwortet,
  schutzFrei,
  serieAktuell,
  serieGeschuetzt,
  statistik,
  themaStatistik,
  useStand,
  wocheTage,
  xpHeute,
} from "@/lib/stand";
import { tippen } from "@/lib/haptik";
import { abstand, farben, radius, RAND } from "@/lib/theme";

function Kennzahl({ wert, label, farbe }: { wert: string; label: string; farbe?: string }) {
  return (
    <View style={{ flex: 1, alignItems: "center", gap: 2 }}>
      <T v="h2" farbe={farbe} style={{ fontVariant: ["tabular-nums"] }}>
        {wert}
      </T>
      <T v="klein" style={{ fontSize: 12 }}>
        {label}
      </T>
    </View>
  );
}

function Kachel({ icon, farbe, titel, unter, onPress, aus }: { icon: IconName; farbe: string; titel: string; unter: string; onPress: () => void; aus?: boolean }) {
  return (
    <Karte onPress={aus ? undefined : onPress} style={{ flex: 1, padding: abstand(4), gap: abstand(3), opacity: aus ? 0.5 : 1 }}>
      <Plakette icon={icon} farbe={farbe} groesse={38} />
      <View style={{ gap: 2 }}>
        <T v="h3">{titel}</T>
        <T v="klein" numberOfLines={1}>
          {unter}
        </T>
      </View>
    </Karte>
  );
}

export default function Heute() {
  const insets = useSafeAreaInsets();
  const { stand } = useStand();
  const { anzeigeName } = useKonto();

  const beantwortet = heuteBeantwortet(stand);
  const serie = serieAktuell(stand);
  const reife = statistik(stand).anteil;
  const woche = wocheTage(stand);
  const fehler = fehlerIds(stand).length;
  const gemerkt = gemerktIds(stand).length;
  const rest = Math.max(0, stand.tagesziel - beantwortet);
  const naechstes = THEMEN.find((t) => themaStatistik(stand, t.id).anteil < 0.8) ?? THEMEN[THEMEN.length - 1];
  const naechstesStat = themaStatistik(stand, naechstes.id);
  const letzte = stand.pruefungen[0];
  const vorname = anzeigeName.split(" ")[0];

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: farben.grund }}
      contentContainerStyle={{ paddingTop: insets.top + abstand(3), paddingHorizontal: RAND, paddingBottom: INHALT_UNTEN, gap: abstand(7) }}
    >
      {/* Begrüßung */}
      <View style={{ flexDirection: "row", alignItems: "center", gap: abstand(3) }}>
        <View style={{ flex: 1, gap: 4 }}>
          <T v="mini">{datumLang()}</T>
          <T v="titel" numberOfLines={1}>
            Hallo, {vorname}.
          </T>
        </View>
        <Pressable
          onPress={() => {
            tippen();
            router.push("/profil");
          }}
          hitSlop={6}
        >
          <Avatar name={anzeigeName} groesse={44} />
        </Pressable>
      </View>

      {/* Tagesziel */}
      <Karte style={{ paddingTop: abstand(4), paddingBottom: abstand(5), gap: abstand(4) }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <T v="mini">Tagesziel</T>
          <View style={{ flexDirection: "row", alignItems: "center", gap: abstand(3) }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
              <Ionicons name="shield-checkmark" size={14} color={schutzFrei(stand) ? farben.blau : farben.text4} />
              <T v="klein" farbe={schutzFrei(stand) ? farben.text2 : farben.text4} style={{ fontSize: 12 }}>
                {schutzFrei(stand) ? "1 Schutz" : "0 Schutz"}
              </T>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
              <Ionicons name="flame" size={15} color={serie > 0 ? farben.orange : farben.text4} />
              <T v="klein" farbe={serie > 0 ? farben.text : farben.text3}>
                {serie === 1 ? "1 Tag" : `${serie} Tage`}
              </T>
            </View>
          </View>
        </View>
        {serieGeschuetzt(stand) ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: abstand(2), padding: abstand(3), borderRadius: 12, backgroundColor: farben.blauSoft }}>
            <Ionicons name="shield-checkmark" size={16} color={farben.blau} />
            <T v="klein" farbe={farben.text} style={{ flex: 1 }}>
              Gestern Pause – dein Serien-Schutz hält die Serie. Lern heute, sonst ist sie weg.
            </T>
          </View>
        ) : null}
        <View style={{ alignItems: "center", marginTop: -abstand(1) }}>
          <Tacho wert={beantwortet} ziel={stand.tagesziel} />
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", paddingVertical: abstand(3), borderTopWidth: 1, borderBottomWidth: 1, borderColor: farben.linie }}>
          <Kennzahl wert={String(xpHeute(stand))} label="XP heute" />
          <View style={{ width: 1, height: 28, backgroundColor: farben.linie }} />
          <Kennzahl wert={String(serie)} label={serie === 1 ? "Tag Serie" : "Tage Serie"} farbe={serie > 0 ? farben.orange : undefined} />
          <View style={{ width: 1, height: 28, backgroundColor: farben.linie }} />
          <Kennzahl wert={`${Math.round(reife * 100)} %`} label="Prüfungsreife" />
        </View>
        <View style={{ gap: abstand(3) }}>
          <T v="klein" zentriert farbe={rest === 0 ? farben.gruen : farben.text3}>
            {rest === 0 ? "Tagesziel geschafft – jede weitere Frage zählt für die Liga." : `Noch ${rest} Fragen bis zum Tagesziel · etwa ${Math.max(1, Math.round(rest * 0.4))} Min.`}
          </T>
          <Knopf titel={beantwortet === 0 ? "Training starten" : "Weiter trainieren"} icon="arrow-forward" onPress={() => router.push({ pathname: "/training", params: { modus: "smart" } })} />
        </View>
      </Karte>

      {/* Prüfungsreife */}
      <View>
        <Abschnitt titel="Prüfungsreife" aktion="Simulation" onAktion={() => router.push("/pruefung")} />
        <Karte style={{ gap: abstand(4) }}>
          <View style={{ flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between" }}>
            <View>
              <T v="zahl" style={{ fontSize: 34, lineHeight: 38 }}>
                {Math.round(reife * 100)} %
              </T>
              <T v="klein">aller Fragen sicher beherrscht</T>
            </View>
            {letzte ? (
              <View style={{ alignItems: "flex-end", gap: 2 }}>
                <T v="klein" farbe={letzte.bestanden ? farben.gruen : farben.rot} style={{ fontFamily: "Inter_600SemiBold" }}>
                  {letzte.bestanden ? "Bestanden" : "Nicht bestanden"}
                </T>
                <T v="klein" style={{ fontSize: 12 }}>
                  Simulation vom {datumKurz(letzte.datum)} · {letzte.fehlerpunkte} FP
                </T>
              </View>
            ) : null}
          </View>
          <Segmente anteil={reife} />
          <T v="klein">{reife >= 0.9 ? "Du bist bereit. Mach zur Sicherheit noch eine Simulation." : "Ab 90 % bist du gut für die Prüfung aufgestellt."}</T>
        </Karte>
      </View>

      {/* Woche */}
      <View>
        <Abschnitt titel="Diese Woche" />
        <Karte style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: abstand(4) }}>
          {woche.map((tag) => (
            <View key={tag.kurz} style={{ alignItems: "center", gap: abstand(2) }}>
              <T v="klein" farbe={tag.heute ? farben.text : farben.text3} style={{ fontSize: 12 }}>
                {tag.kurz}
              </T>
              <View
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: tag.gelernt ? farben.orange : "transparent",
                  borderWidth: tag.gelernt ? 0 : 1.5,
                  borderColor: tag.heute ? farben.orange : farben.linieStark,
                  borderStyle: tag.zukunft ? "dashed" : "solid",
                }}
              >
                {tag.gelernt ? <Ionicons name="checkmark" size={16} color={farben.aufOrange} /> : null}
              </View>
            </View>
          ))}
        </Karte>
      </View>

      {/* Nächster Halt */}
      <View>
        <Abschnitt titel="Deine Strecke" aktion="Alle Themen" onAktion={() => router.navigate("/lernen")} />
        <Karte onPress={() => router.push({ pathname: "/thema/[id]", params: { id: naechstes.id } })} style={{ flexDirection: "row", alignItems: "center", gap: abstand(4) }}>
          <Ring anteil={naechstesStat.anteil} groesse={56} dicke={5}>
            <Ionicons name={naechstes.icon} size={20} color={farben.orange} />
          </Ring>
          <View style={{ flex: 1, gap: 3 }}>
            <T v="mini" farbe={farben.orange}>
              Nächster Halt
            </T>
            <T v="h3">{naechstes.titel}</T>
            <T v="klein">
              {naechstesStat.sicher} von {naechstesStat.gesamt} Fragen sicher
            </T>
          </View>
          <Ionicons name="chevron-forward" size={18} color={farben.text4} />
        </Karte>
      </View>

      {/* Schnellzugriff */}
      <View style={{ gap: abstand(3) }}>
        <Abschnitt titel="Schnellzugriff" style={{ marginBottom: 0 }} />
        <View style={{ flexDirection: "row", gap: abstand(3) }}>
          <Kachel
            icon="refresh"
            farbe={farben.rot}
            titel="Fehler üben"
            unter={fehler === 0 ? "Keine offenen Fehler" : fehler === 1 ? "1 Frage offen" : `${fehler} Fragen offen`}
            aus={fehler === 0}
            onPress={() => router.push({ pathname: "/training", params: { modus: "fehler" } })}
          />
          <Kachel
            icon="bookmark"
            farbe={farben.blau}
            titel="Gemerkt"
            unter={gemerkt === 0 ? "Noch nichts gemerkt" : gemerkt === 1 ? "1 Frage" : `${gemerkt} Fragen`}
            aus={gemerkt === 0}
            onPress={() => router.push({ pathname: "/training", params: { modus: "gemerkt" } })}
          />
        </View>
        <View style={{ flexDirection: "row", gap: abstand(3) }}>
          <Kachel icon="calculator" farbe={farben.gelb} titel="Formeln" unter="Anhalteweg & Co." onPress={() => router.push("/formeln")} />
          <Kachel icon="triangle" farbe={farben.orange} titel="Zeichen" unter="Alle Schilder im Blick" onPress={() => router.push("/zeichen")} />
        </View>
      </View>

      {/* Spur Plus */}
      <Pressable
        onPress={() => {
          tippen();
          router.push("/premium");
        }}
        style={({ pressed }) => ({
          flexDirection: "row",
          alignItems: "center",
          gap: abstand(3.5),
          padding: abstand(4),
          borderRadius: radius.l,
          borderWidth: 1,
          borderColor: farben.orangeLinie,
          backgroundColor: farben.orangeSoft,
          opacity: pressed ? 0.85 : 1,
        })}
      >
        <Ionicons name="diamond-outline" size={22} color={farben.orange} />
        <View style={{ flex: 1 }}>
          <T v="textStark">Spur Plus</T>
          <T v="klein">Kompletter Fragenkatalog, Videos, Statistiken – bald.</T>
        </View>
        <Ionicons name="chevron-forward" size={18} color={farben.orange} />
      </Pressable>
    </ScrollView>
  );
}
