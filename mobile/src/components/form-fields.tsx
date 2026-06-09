import { useMemo, useState } from "react";
import { FlatList, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";

import { useTheme } from "@/lib/theme-context";
import { radius, space, type ThemeColors } from "@/lib/theme";
import { formatDatumLang } from "@/lib/format";

export type Option = { id: string; label: string; sub?: string };

// ---- Datums-/Zeit-Helfer (lokal) -----------------------------------
function parseDatum(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y || 2000, (m || 1) - 1, d || 1, 12, 0, 0);
}
function datumString(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
function parseZeit(t: string): Date {
  const [h, m] = t.split(":").map(Number);
  const d = new Date();
  d.setHours(h || 0, m || 0, 0, 0);
  return d;
}
function zeitString(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getHours())}:${p(d.getMinutes())}`;
}

// ---- Tappbare Zeile, die einen Picker öffnet -----------------------
function SelectRow({
  label,
  anzeige,
  placeholder,
  icon,
  onPress,
}: {
  label: string;
  anzeige?: string;
  placeholder: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View style={{ gap: space(1.5) }}>
      <Text style={s.label}>{label}</Text>
      <Pressable style={s.row} onPress={onPress}>
        <Ionicons name={icon} size={18} color={colors.textMuted} />
        <Text style={[s.rowText, !anzeige && { color: colors.textMuted }]} numberOfLines={1}>
          {anzeige || placeholder}
        </Text>
        <Ionicons name="chevron-down" size={18} color={colors.textMuted} />
      </Pressable>
    </View>
  );
}

// ---- Bottom-Sheet -------------------------------------------------
function BottomSheet({
  visible,
  onClose,
  title,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  const { colors } = useTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={s.backdrop} onPress={onClose} />
      <View style={s.sheet}>
        <View style={s.sheetHead}>
          <Text style={s.sheetTitle}>{title}</Text>
          <Pressable onPress={onClose} hitSlop={10}>
            <Text style={s.fertig}>Fertig</Text>
          </Pressable>
        </View>
        {children}
      </View>
    </Modal>
  );
}

export function PickerField({
  label,
  value,
  options,
  onChange,
  placeholder,
  erlaubeLeer,
}: {
  label: string;
  value: string | null;
  options: Option[];
  onChange: (id: string | null) => void;
  placeholder: string;
  erlaubeLeer?: boolean;
}) {
  const { colors } = useTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);
  const [open, setOpen] = useState(false);
  const aktuell = options.find((o) => o.id === value);
  const liste: Option[] = erlaubeLeer ? [{ id: "", label: "— Keine Angabe" }, ...options] : options;

  return (
    <>
      <SelectRow
        label={label}
        anzeige={aktuell?.label}
        placeholder={placeholder}
        icon="chevron-expand-outline"
        onPress={() => setOpen(true)}
      />
      <BottomSheet visible={open} onClose={() => setOpen(false)} title={label}>
        <FlatList
          data={liste}
          keyExtractor={(o) => o.id || "none"}
          style={{ maxHeight: 360 }}
          renderItem={({ item }) => {
            const aktiv = (value ?? "") === item.id;
            return (
              <Pressable
                style={s.option}
                onPress={() => {
                  onChange(item.id === "" ? null : item.id);
                  setOpen(false);
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text style={s.optionText}>{item.label}</Text>
                  {item.sub ? <Text style={s.optionSub}>{item.sub}</Text> : null}
                </View>
                {aktiv ? <Ionicons name="checkmark" size={20} color={colors.brand} /> : null}
              </Pressable>
            );
          }}
        />
      </BottomSheet>
    </>
  );
}

export function DateField({ label, value, onChange }: { label: string; value: string; onChange: (iso: string) => void }) {
  const { schema } = useTheme();
  const [open, setOpen] = useState(false);
  return (
    <>
      <SelectRow label={label} anzeige={formatDatumLang(value)} placeholder="Datum wählen" icon="calendar-outline" onPress={() => setOpen(true)} />
      <BottomSheet visible={open} onClose={() => setOpen(false)} title={label}>
        <View style={{ alignItems: "center" }}>
          <DateTimePicker
            value={parseDatum(value)}
            mode="date"
            display="spinner"
            themeVariant={schema}
            onChange={(_event, d) => {
              if (d) onChange(datumString(d));
            }}
          />
        </View>
      </BottomSheet>
    </>
  );
}

export function TimeField({ label, value, onChange }: { label: string; value: string; onChange: (zeit: string) => void }) {
  const { schema } = useTheme();
  const [open, setOpen] = useState(false);
  return (
    <>
      <SelectRow label={label} anzeige={`${value} Uhr`} placeholder="Uhrzeit wählen" icon="time-outline" onPress={() => setOpen(true)} />
      <BottomSheet visible={open} onClose={() => setOpen(false)} title={label}>
        <View style={{ alignItems: "center" }}>
          <DateTimePicker
            value={parseZeit(value)}
            mode="time"
            display="spinner"
            is24Hour
            themeVariant={schema}
            onChange={(_event, d) => {
              if (d) onChange(zeitString(d));
            }}
          />
        </View>
      </BottomSheet>
    </>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    label: { fontSize: 13, fontWeight: "800", color: c.textMuted, textTransform: "uppercase", letterSpacing: 0.5 },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: space(2.5),
      backgroundColor: c.card,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
      borderRadius: radius.md,
      paddingHorizontal: space(3.5),
      paddingVertical: space(3.5),
    },
    rowText: { flex: 1, fontSize: 16, color: c.text },
    backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)" },
    sheet: {
      backgroundColor: c.card,
      borderTopLeftRadius: radius.xl,
      borderTopRightRadius: radius.xl,
      paddingBottom: space(8),
      paddingTop: space(2),
    },
    sheetHead: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: space(4),
      paddingVertical: space(3),
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border,
    },
    sheetTitle: { fontSize: 16, fontWeight: "800", color: c.text },
    fertig: { fontSize: 16, fontWeight: "700", color: c.brand },
    option: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: space(4),
      paddingVertical: space(3.5),
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border,
    },
    optionText: { fontSize: 16, color: c.text },
    optionSub: { fontSize: 13, color: c.textMuted, marginTop: 2 },
  });
