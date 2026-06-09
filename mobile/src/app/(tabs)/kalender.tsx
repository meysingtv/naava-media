import { useMemo, useState } from "react";
import { useWindowDimensions, View } from "react-native";
import { useRouter } from "expo-router";
import { Calendar, type ICalendarEventBase } from "react-native-big-calendar";
import dayjs from "dayjs";
import "dayjs/locale/de";

import { CenterInfo, Screen, ScreenHeader, Segmented } from "@/components/ui";
import { HeaderPlus } from "@/components/header-plus";
import { useLoader } from "@/lib/use-loader";
import { supabase } from "@/lib/supabase";
import { heuteISO, plusTageISO } from "@/lib/format";
import { TYP_LABEL } from "@/lib/constants";
import { useTheme } from "@/lib/theme-context";
import { space } from "@/lib/theme";
import {
  FAHRSTUNDE_SELECT,
  type FahrstundeMitRelationen,
  type FahrstundeStatus,
  type FahrstundeTyp,
} from "@/lib/types";

dayjs.locale("de");

type Modus = "day" | "3days" | "week";

interface Termin extends ICalendarEventBase {
  id: string;
  typ: FahrstundeTyp;
  status: FahrstundeStatus;
}

const TERMIN_FARBE: Record<FahrstundeTyp, string> = {
  normal: "#2563EB",
  ueberland: "#16A34A",
  autobahn: "#EA580C",
  nacht: "#4F46E5",
  pruefung: "#DC2626",
};

function isoDatum(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function TerminplanerScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const [modus, setModus] = useState<Modus>("3days");
  const [hoehe, setHoehe] = useState(0);
  const { height: fensterHoehe } = useWindowDimensions();

  const von = useMemo(() => plusTageISO(heuteISO(), -14), []);
  const bis = useMemo(() => plusTageISO(heuteISO(), 45), []);

  const { data, loading, error } = useLoader<FahrstundeMitRelationen[]>(
    () =>
      supabase
        .from("fahrstunde")
        .select(FAHRSTUNDE_SELECT)
        .gte("datum", von)
        .lte("datum", bis)
        .order("datum", { ascending: true })
        .returns<FahrstundeMitRelationen[]>(),
    { cacheKey: "terminplaner" },
  );

  const events = useMemo<Termin[]>(() => {
    return (data ?? []).map((s) => {
      const start = new Date(`${s.datum}T${s.uhrzeit}`);
      const end = new Date(start.getTime() + (s.dauer_minuten ?? 45) * 60000);
      const name = s.fahrschueler ? `${s.fahrschueler.vorname} ${s.fahrschueler.nachname}` : TYP_LABEL[s.typ];
      return { id: s.id, title: name, start, end, typ: s.typ, status: s.status };
    });
  }, [data]);

  const calTheme = useMemo(
    () => ({
      palette: {
        primary: { main: colors.accent, contrastText: colors.onAccent },
        nowIndicator: colors.danger,
        gray: {
          "100": colors.separator,
          "200": colors.separator,
          "300": colors.separator,
          "500": colors.text,
          "800": colors.text,
        },
      },
      typography: {
        xs: { fontSize: 12 },
        sm: { fontSize: 13 },
        xl: { fontSize: 16 },
      },
    }),
    [colors],
  );

  return (
    <Screen>
      <ScreenHeader title="Terminplaner" right={<HeaderPlus href="/fahrstunde/neu" />} />
      <View style={{ paddingHorizontal: space(4), paddingBottom: space(3) }}>
        <Segmented<Modus>
          options={[
            { value: "day", label: "Tag" },
            { value: "3days", label: "3 Tage" },
            { value: "week", label: "Woche" },
          ]}
          value={modus}
          onChange={setModus}
        />
      </View>

      <View style={{ flex: 1 }} onLayout={(e) => setHoehe(e.nativeEvent.layout.height)}>
        {loading ? (
          <CenterInfo loading />
        ) : error ? (
          <CenterInfo text={error} error />
        ) : (
          <Calendar<Termin>
            events={events}
            height={hoehe > 0 ? hoehe : fensterHoehe - 220}
            mode={modus}
            ampm={false}
            weekStartsOn={1}
            locale="de"
            scrollOffsetMinutes={7 * 60}
            hourRowHeight={56}
            hourStyle={{ color: colors.text, fontWeight: "700", fontSize: 12 }}
            theme={calTheme}
            eventCellStyle={(ev) => ({
              backgroundColor: ev.status === "ausgefallen" ? colors.textMuted : TERMIN_FARBE[ev.typ],
              borderRadius: 6,
            })}
            onPressEvent={(ev) => router.push(`/fahrstunde/${ev.id}`)}
            onPressCell={(d) => router.push(`/fahrstunde/neu?datum=${isoDatum(d)}`)}
          />
        )}
      </View>
    </Screen>
  );
}
