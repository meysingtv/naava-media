import { useMemo, useState } from "react";
import { Alert, Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import { Badge, Button, IconKachel, Screen, Segmented } from "@/components/ui";
import { GradientKopf } from "@/components/kopf";
import { DatumBlock, TerminKarte } from "@/components/termin-karte";
import { istAnstehend } from "@/lib/constants";
import { anfrageZurueckziehen, ladeAnfragen, ladeFahrstunden, ladeLehrer, ladeRegeln } from "@/lib/daten";
import { endUhrzeit, formatDatumLang, formatUhrzeit } from "@/lib/format";
import { useLoader } from "@/lib/use-loader";
import { useRealtime } from "@/lib/use-realtime";
import { useTheme } from "@/lib/theme-context";
import { karte, space } from "@/lib/theme";
import type { Anfrage } from "@/lib/types";

type Ansicht = "anstehend" | "anfragen" | "verlauf";

const STATUS: Record<Anfrage["status"], { label: string; tone: "warning" | "success" | "danger" | "neutral" }> = {
  offen: { label: "Angefragt", tone: "warning" },
  angenommen: { label: "Angenommen", tone: "success" },
  abgelehnt: { label: "Abgelehnt", tone: "danger" },
  zurueckgezogen: { label: "Zurückgezogen", tone: "neutral" },
};

function AnfrageKarte({ a, lehrer, beiAenderung }: { a: Anfrage; lehrer?: string; beiAenderung: () => void }) {
  const { colors } = useTheme();
  const [arbeitet, setArbeitet] = useState(false);
  const st = STATUS[a.status];

  function zurueckziehen() {
    Alert.alert("Anfrage zurückziehen?", `${formatDatumLang(a.datum)}, ${formatUhrzeit(a.uhrzeit)} Uhr`, [
      { text: "Behalten", style: "cancel" },
      {
        text: "Zurückziehen",
        style: "destructive",
        onPress: async () => {
          setArbeitet(true);
          const fehler = await anfrageZurueckziehen(a.id);
          setArbeitet(false);
          if (fehler) Alert.alert("Nicht möglich", fehler);
          else beiAenderung();
        },
      },
    ]);
  }

  return (
    <View style={[karte(colors), { padding: space(3.5), gap: space(2.5) }]}>
      <View style={{ flexDirection: "row", gap: space(3.5), alignItems: "center" }}>
        <DatumBlock iso={a.datum} farbe={colors.accent} blass={a.status === "abgelehnt"} />
        <View style={{ flex: 1, gap: 3 }}>
          <View style={{ flexDirection: "row" }}>
            <Badge label={st.label} tone={st.tone} />
          </View>
          <Text style={{ fontSize: 18, fontWeight: "700", color: colors.text }}>
            {formatUhrzeit(a.uhrzeit)} – {endUhrzeit(a.uhrzeit, a.dauer_minuten)} Uhr
          </Text>
          <Text style={{ fontSize: 14, color: colors.textMuted }} numberOfLines={1}>
            {a.dauer_minuten} Min.{lehrer ? ` · Wunsch: ${lehrer}` : ""}
          </Text>
        </View>
      </View>
      {a.notiz ? <Text style={{ fontSize: 14, color: colors.text }}>„{a.notiz}“</Text> : null}
      {a.antwort ? (
        <Text style={{ fontSize: 14, color: a.status === "abgelehnt" ? colors.danger : colors.textMuted }}>
          {a.status === "abgelehnt" ? `Grund: ${a.antwort}` : a.antwort}
        </Text>
      ) : null}
      {a.status === "offen" ? (
        <Pressable onPress={zurueckziehen} disabled={arbeitet} hitSlop={6} style={{ alignSelf: "flex-start" }}>
          <Text style={{ color: colors.danger, fontSize: 15, fontWeight: "700", opacity: arbeitet ? 0.5 : 1 }}>Zurückziehen</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function Leer({ text, children }: { text: string; children?: React.ReactNode }) {
  const { colors } = useTheme();
  return (
    <View style={[karte(colors), { padding: space(6), alignItems: "center", gap: space(3.5) }]}>
      <IconKachel name="calendar-clear-outline" farbe={colors.accent} groesse={52} />
      <Text style={{ color: colors.textMuted, fontSize: 15, textAlign: "center", lineHeight: 21 }}>{text}</Text>
      {children ? <View style={{ alignSelf: "stretch" }}>{children}</View> : null}
    </View>
  );
}

export default function TermineScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const [ansicht, setAnsicht] = useState<Ansicht>("anstehend");

  const stunden = useLoader(ladeFahrstunden, { cacheKey: "s-stunden" });
  const anfragen = useLoader(ladeAnfragen, { cacheKey: "s-anfragen" });
  const regeln = useLoader(ladeRegeln, { cacheKey: "s-regeln" });
  const lehrer = useLoader(ladeLehrer, { cacheKey: "s-lehrer" });

  useRealtime("s-termine-stunden", "fahrstunde", () => stunden.refresh());
  useRealtime("s-termine-anfragen", "fahrstunde_anfrage", () => {
    anfragen.refresh();
    regeln.refresh();
  });

  const erlaubt = Boolean(regeln.data?.erlaubt);
  const lehrerName = (id: string | null) => (lehrer.data ?? []).find((l) => l.id === id)?.name;

  const { anstehend, verlauf } = useMemo(() => {
    const alle = stunden.data ?? [];
    const jetzt = Date.now();
    return {
      anstehend: alle.filter((s) => istAnstehend(s, jetzt)),
      verlauf: alle.filter((s) => !istAnstehend(s, jetzt)).reverse(),
    };
  }, [stunden.data]);

  // Offene immer; beantwortete 14 Tage lang; zurückgezogene nicht.
  const anfragenListe = useMemo(() => {
    const grenze = Date.now() - 14 * 86_400_000;
    return (anfragen.data ?? []).filter(
      (a) => a.status === "offen" || (a.status !== "zurueckgezogen" && a.bearbeitet_am != null && new Date(a.bearbeitet_am).getTime() >= grenze),
    );
  }, [anfragen.data]);

  function neu() {
    stunden.refresh();
    anfragen.refresh();
    regeln.refresh();
  }

  return (
    <Screen>
      <GradientKopf
        titel="Termine"
        untertitel={anstehend.length === 1 ? "1 Fahrstunde geplant" : `${anstehend.length} Fahrstunden geplant`}
        rechts={
          erlaubt ? (
            <Pressable
              onPress={() => router.push("/anfrage")}
              hitSlop={10}
              accessibilityLabel="Fahrstunde anfragen"
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 4,
                backgroundColor: "rgba(255,255,255,0.22)",
                paddingHorizontal: space(3),
                paddingVertical: space(2),
                borderRadius: 999,
              }}
            >
              <Ionicons name="add" size={18} color="#FFFFFF" />
              <Text style={{ color: "#FFFFFF", fontWeight: "700", fontSize: 14 }}>Anfragen</Text>
            </Pressable>
          ) : undefined
        }
      />
      <View style={{ paddingHorizontal: space(4), paddingTop: space(4), paddingBottom: space(3) }}>
        <Segmented<Ansicht>
          options={[
            { value: "anstehend", label: `Anstehend (${anstehend.length})` },
            { value: "anfragen", label: `Anfragen (${anfragenListe.filter((a) => a.status === "offen").length})` },
            { value: "verlauf", label: "Verlauf" },
          ]}
          value={ansicht}
          onChange={setAnsicht}
        />
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: space(4), paddingBottom: space(10), gap: space(3) }}
        refreshControl={<RefreshControl refreshing={stunden.refreshing} onRefresh={neu} tintColor={colors.accent} />}
      >
        {ansicht === "anstehend" ? (
          anstehend.length === 0 ? (
            <Leer text={stunden.loading ? "Lädt …" : "Keine Fahrstunde geplant."}>
              {erlaubt ? <Button title="Fahrstunde anfragen" onPress={() => router.push("/anfrage")} /> : null}
            </Leer>
          ) : (
            anstehend.map((s) => (
              <TerminKarte key={s.id} stunde={s} lehrer={lehrerName(s.fahrlehrer_id)} aktionen beiAenderung={stunden.refresh} />
            ))
          )
        ) : ansicht === "anfragen" ? (
          anfragenListe.length === 0 ? (
            <Leer
              text={
                erlaubt
                  ? "Noch keine Anfragen. Frag einfach einen Wunschtermin an – dein Fahrlehrer bestätigt ihn."
                  : "Online-Anfragen sind bei deiner Fahrschule gerade nicht freigeschaltet."
              }
            >
              {erlaubt ? <Button title="Fahrstunde anfragen" onPress={() => router.push("/anfrage")} /> : null}
            </Leer>
          ) : (
            anfragenListe.map((a) => (
              <AnfrageKarte key={a.id} a={a} lehrer={lehrerName(a.wunsch_fahrlehrer_id)} beiAenderung={neu} />
            ))
          )
        ) : verlauf.length === 0 ? (
          <Leer text="Noch keine vergangenen Termine." />
        ) : (
          verlauf.slice(0, 100).map((s) => <TerminKarte key={s.id} stunde={s} lehrer={lehrerName(s.fahrlehrer_id)} />)
        )}
      </ScrollView>
    </Screen>
  );
}
