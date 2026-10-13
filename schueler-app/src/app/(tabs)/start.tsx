import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import { IconKachel, Ueberschrift } from "@/components/ui";
import { GradientKopf, KopfSeite, SchulMarke } from "@/components/kopf";
import { Ring } from "@/components/ring";
import { TerminKarte } from "@/components/termin-karte";
import { istAnstehend, pflichtFuer } from "@/lib/constants";
import { ladeAnfragen, ladeFahrstunden, ladeLehrer, ladeRechnungen, ladeRegeln, ladeSchueler, ladeSchule } from "@/lib/daten";
import { formatEuro, formatUhrzeit, wannText } from "@/lib/format";
import { useTabZaehlerMelden } from "@/lib/tab-zaehler";
import { useLoader } from "@/lib/use-loader";
import { useRealtime } from "@/lib/use-realtime";
import { useTheme } from "@/lib/theme-context";
import { karte, radius, space } from "@/lib/theme";

/** Große Aktions-Kachel mit farbigem Symbol. */
function Aktion({
  titel,
  sub,
  icon,
  farbe,
  onPress,
  hervorgehoben,
}: {
  titel: string;
  sub: string;
  icon: keyof typeof Ionicons.glyphMap;
  farbe: string;
  onPress: () => void;
  hervorgehoben?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        karte(colors),
        {
          flex: 1,
          padding: space(4),
          gap: space(3),
          backgroundColor: hervorgehoben ? colors.accent : colors.card,
          transform: [{ scale: pressed ? 0.98 : 1 }],
        },
      ]}
    >
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 13,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: hervorgehoben ? "rgba(255,255,255,0.2)" : farbe + "1F",
        }}
      >
        <Ionicons name={icon} size={21} color={hervorgehoben ? "#FFFFFF" : farbe} />
      </View>
      <View style={{ gap: 2 }}>
        <Text style={{ fontSize: 16, fontWeight: "800", color: hervorgehoben ? "#FFFFFF" : colors.text }}>{titel}</Text>
        <Text style={{ fontSize: 13, color: hervorgehoben ? "rgba(255,255,255,0.85)" : colors.textMuted }} numberOfLines={1}>
          {sub}
        </Text>
      </View>
    </Pressable>
  );
}

export default function StartScreen() {
  const router = useRouter();
  const { colors } = useTheme();

  const schueler = useLoader(ladeSchueler, { cacheKey: "s-schueler" });
  const schule = useLoader(ladeSchule, { cacheKey: "s-schule" });
  const stunden = useLoader(ladeFahrstunden, { cacheKey: "s-stunden" });
  const regeln = useLoader(ladeRegeln, { cacheKey: "s-regeln" });
  const lehrer = useLoader(ladeLehrer, { cacheKey: "s-lehrer" });
  const rechnungen = useLoader(ladeRechnungen, { cacheKey: "s-rechnungen" });
  const anfragen = useLoader(ladeAnfragen, { cacheKey: "s-anfragen" });

  useRealtime("s-start-stunden", "fahrstunde", () => stunden.refresh());
  useRealtime("s-start-anfragen", "fahrstunde_anfrage", () => {
    anfragen.refresh();
    regeln.refresh();
  });

  function allesNeu() {
    return Promise.all([
      schueler.refresh(),
      schule.refresh(),
      stunden.refresh(),
      regeln.refresh(),
      lehrer.refresh(),
      rechnungen.refresh(),
      anfragen.refresh(),
    ]);
  }

  const liste = stunden.data ?? [];
  const naechste = liste.find((s) => istAnstehend(s));
  const gefahren = liste.filter((s) => s.status === "abgeschlossen");
  const klasse = schueler.data?.fuehrerscheinklassen?.[0] ?? "B";
  const pflicht = pflichtFuer(klasse);
  const sollSonder = pflicht.ueberland + pflicht.autobahn + pflicht.nacht;
  const istSonder =
    Math.min(gefahren.filter((s) => s.typ === "ueberland").length, pflicht.ueberland) +
    Math.min(gefahren.filter((s) => s.typ === "autobahn").length, pflicht.autobahn) +
    Math.min(gefahren.filter((s) => s.typ === "nacht").length, pflicht.nacht);
  const theorieOk = Boolean(schueler.data?.theorie_bestanden);
  const lernstand = schueler.data?.lernstatus ?? 0;
  const offeneRechnungen = (rechnungen.data ?? []).filter((r) => r.status !== "bezahlt");
  const offen = offeneRechnungen.reduce((sum, r) => sum + Number(r.betrag_brutto ?? 0), 0);
  const perLastschrift = Boolean(schueler.data?.sepa_mandat_ref);
  useTabZaehlerMelden("rechnungen", rechnungen.data && schueler.data ? (perLastschrift ? 0 : offeneRechnungen.length) : null);
  const offeneAnfragen = (anfragen.data ?? []).filter((a) => a.status === "offen").length;
  const erlaubt = Boolean(regeln.data?.erlaubt);
  const lehrerName = (id: string | null) => (lehrer.data ?? []).find((l) => l.id === id)?.name;
  const vorname = schueler.data?.vorname;

  const unterzeile = naechste
    ? `Nächste Fahrstunde: ${wannText(naechste.datum)}, ${formatUhrzeit(naechste.uhrzeit)} Uhr`
    : "Schön, dass du da bist.";

  return (
    <KopfSeite
      onRefresh={allesNeu}
      kopf={
        <GradientKopf
          oben={<SchulMarke name={schule.data?.name} logoUrl={schule.data?.logo_url} />}
          rechts={
            <Pressable
              onPress={() => router.push("/profil")}
              hitSlop={10}
              accessibilityLabel="Profil"
              style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: "rgba(255,255,255,0.22)", alignItems: "center", justifyContent: "center" }}
            >
              <Ionicons name="person" size={19} color="#FFFFFF" />
            </Pressable>
          }
          titel={`Hallo${vorname ? ` ${vorname}` : ""}!`}
          untertitel={unterzeile}
          unten={space(16)}
        />
      }
    >
      <View style={{ paddingHorizontal: space(4), marginTop: -space(11), gap: space(6) }}>
        {/* Nächste Fahrstunde */}
        {naechste ? (
          <TerminKarte stunde={naechste} lehrer={lehrerName(naechste.fahrlehrer_id)} aktionen beiAenderung={stunden.refresh} />
        ) : (
          <View style={[karte(colors), { padding: space(5), flexDirection: "row", alignItems: "center", gap: space(4) }]}>
            <IconKachel name="calendar-clear-outline" farbe={colors.accent} groesse={46} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 16, fontWeight: "800", color: colors.text }}>
                {stunden.loading ? "Lädt …" : "Noch keine Stunde geplant"}
              </Text>
              <Text style={{ fontSize: 14, color: colors.textMuted, marginTop: 2 }}>
                {erlaubt ? "Frag einfach einen Wunschtermin an." : "Dein Fahrlehrer trägt die nächste Stunde ein."}
              </Text>
            </View>
          </View>
        )}

        {/* Schnellzugriff */}
        <View style={{ flexDirection: "row", gap: space(3) }}>
          {erlaubt ? (
            <Aktion
              titel="Anfragen"
              sub={offeneAnfragen > 0 ? `${offeneAnfragen} wartet auf Antwort` : "Wunschtermin senden"}
              icon="add-circle"
              farbe={colors.accent}
              onPress={() => router.push("/anfrage")}
              hervorgehoben
            />
          ) : null}
          <Aktion
            titel="Termine"
            sub={`${liste.filter((s) => istAnstehend(s)).length} geplant`}
            icon="calendar"
            farbe="#7C3AED"
            onPress={() => router.push("/(tabs)/termine")}
          />
        </View>

        {/* Fortschritt */}
        <View>
          <Ueberschrift
            rechts={
              <Pressable onPress={() => router.push("/(tabs)/fortschritt")} hitSlop={8}>
                <Text style={{ color: colors.accent, fontSize: 14, fontWeight: "700" }}>Details</Text>
              </Pressable>
            }
          >
            Dein Fortschritt
          </Ueberschrift>
          <View style={[karte(colors), { flexDirection: "row", justifyContent: "space-around", paddingVertical: space(5) }]}>
            <View style={{ alignItems: "center", gap: space(2) }}>
              <Ring anteil={theorieOk ? 1 : lernstand / 100} farbe="#0EA5E9" mitte={theorieOk ? "✓" : `${lernstand}%`} />
              <Text style={{ fontSize: 13, fontWeight: "600", color: colors.textMuted }}>Theorie</Text>
            </View>
            <View style={{ alignItems: "center", gap: space(2) }}>
              <Ring anteil={sollSonder > 0 ? istSonder / sollSonder : 1} farbe="#F59E0B" mitte={`${istSonder}/${sollSonder}`} />
              <Text style={{ fontSize: 13, fontWeight: "600", color: colors.textMuted }}>Sonderfahrten</Text>
            </View>
            <View style={{ alignItems: "center", gap: space(2) }}>
              <Ring anteil={gefahren.length > 0 ? 1 : 0} farbe="#8B5CF6" mitte={String(gefahren.length)} />
              <Text style={{ fontSize: 13, fontWeight: "600", color: colors.textMuted }}>Fahrstunden</Text>
            </View>
          </View>
        </View>

        {/* Rechnungen */}
        <Pressable
          onPress={() => router.push("/(tabs)/rechnungen")}
          style={({ pressed }) => [
            karte(colors),
            {
              flexDirection: "row",
              alignItems: "center",
              gap: space(4),
              padding: space(4),
              backgroundColor: offen > 0 ? colors.warning + "18" : colors.success + "14",
              shadowOpacity: 0,
              transform: [{ scale: pressed ? 0.98 : 1 }],
            },
          ]}
        >
          <IconKachel name={offen > 0 ? "wallet" : "checkmark-circle"} farbe={offen > 0 ? colors.warning : colors.success} groesse={44} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 16, fontWeight: "800", color: colors.text }}>
              {offen > 0 ? `${formatEuro(offen)} offen` : "Alles bezahlt"}
            </Text>
            <Text style={{ fontSize: 13, color: colors.textMuted, marginTop: 2 }}>
              {offen > 0
                ? perLastschrift
                  ? "Wird per Lastschrift eingezogen"
                  : "Tippe, um zu bezahlen"
                : "Danke – keine offenen Rechnungen"}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
        </Pressable>

        {schule.data?.name ? (
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: space(1.5), marginTop: -space(1) }}>
            <Ionicons name="shield-checkmark-outline" size={14} color={colors.textMuted} />
            <Text style={{ fontSize: 12, color: colors.textMuted, borderRadius: radius.full }}>
              Verbunden mit {schule.data.name}
            </Text>
          </View>
        ) : null}
      </View>
    </KopfSeite>
  );
}
