import { useState } from "react";
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";

import { Row } from "@/components/ui";
import { useTheme } from "@/lib/theme-context";
import { radius, space } from "@/lib/theme";
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

export function FieldRow({ label, ...props }: { label: string } & TextInputProps) {
  const { colors } = useTheme();
  return (
    <Row>
      <Text style={{ width: 104, fontSize: 16, color: colors.text }}>{label}</Text>
      <TextInput
        placeholderTextColor={colors.textMuted}
        {...props}
        style={[{ flex: 1, fontSize: 16, color: colors.text, paddingVertical: 0 }, props.style]}
      />
    </Row>
  );
}

export function SwitchRow({
  label,
  value,
  onValueChange,
}: {
  label: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
}) {
  const { colors } = useTheme();
  return <Row title={label} trailing={<Switch value={value} onValueChange={onValueChange} trackColor={{ true: colors.accent, false: colors.fill }} />} />;
}

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
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)" }} onPress={onClose} />
      <View style={{ backgroundColor: colors.card, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, paddingBottom: space(8) }}>
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            paddingHorizontal: space(4),
            paddingVertical: space(3),
            borderBottomWidth: StyleSheet.hairlineWidth,
            borderBottomColor: colors.separator,
          }}
        >
          <Text style={{ fontSize: 16, fontWeight: "700", color: colors.text }}>{title}</Text>
          <Pressable onPress={onClose} hitSlop={10}>
            <Text style={{ fontSize: 17, fontWeight: "600", color: colors.accent }}>Fertig</Text>
          </Pressable>
        </View>
        {children}
      </View>
    </Modal>
  );
}

export function PickerRow({
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
  const [open, setOpen] = useState(false);
  const aktuell = options.find((o) => o.id === value);
  const liste: Option[] = erlaubeLeer ? [{ id: "", label: "Keine Angabe" }, ...options] : options;

  return (
    <>
      <Row title={label} value={aktuell?.label ?? placeholder} chevron onPress={() => setOpen(true)} />
      <BottomSheet visible={open} onClose={() => setOpen(false)} title={label}>
        <FlatList
          data={liste}
          keyExtractor={(o) => o.id || "none"}
          style={{ maxHeight: 380 }}
          renderItem={({ item }) => {
            const aktiv = (value ?? "") === item.id;
            return (
              <Pressable
                onPress={() => {
                  onChange(item.id === "" ? null : item.id);
                  setOpen(false);
                }}
                style={({ pressed }) => ({
                  flexDirection: "row",
                  alignItems: "center",
                  paddingHorizontal: space(4),
                  paddingVertical: space(3.5),
                  borderBottomWidth: StyleSheet.hairlineWidth,
                  borderBottomColor: colors.separator,
                  backgroundColor: pressed ? colors.cardAlt : "transparent",
                })}
              >
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 16, color: colors.text }}>{item.label}</Text>
                  {item.sub ? <Text style={{ fontSize: 13, color: colors.textMuted, marginTop: 2 }}>{item.sub}</Text> : null}
                </View>
                {aktiv ? <Ionicons name="checkmark" size={20} color={colors.accent} /> : null}
              </Pressable>
            );
          }}
        />
      </BottomSheet>
    </>
  );
}

export function DateRow({ label, value, onChange }: { label: string; value: string; onChange: (iso: string) => void }) {
  const { schema } = useTheme();
  const [open, setOpen] = useState(false);
  return (
    <>
      <Row title={label} value={formatDatumLang(value)} chevron onPress={() => setOpen(true)} />
      <BottomSheet visible={open} onClose={() => setOpen(false)} title={label}>
        <View style={{ alignItems: "center" }}>
          <DateTimePicker
            value={parseDatum(value)}
            mode="date"
            display="spinner"
            themeVariant={schema}
            onChange={(_e, d) => {
              if (d) onChange(datumString(d));
            }}
          />
        </View>
      </BottomSheet>
    </>
  );
}

export function TimeRow({ label, value, onChange }: { label: string; value: string; onChange: (zeit: string) => void }) {
  const { schema } = useTheme();
  const [open, setOpen] = useState(false);
  return (
    <>
      <Row title={label} value={`${value} Uhr`} chevron onPress={() => setOpen(true)} />
      <BottomSheet visible={open} onClose={() => setOpen(false)} title={label}>
        <View style={{ alignItems: "center" }}>
          <DateTimePicker
            value={parseZeit(value)}
            mode="time"
            display="spinner"
            is24Hour
            themeVariant={schema}
            onChange={(_e, d) => {
              if (d) onChange(zeitString(d));
            }}
          />
        </View>
      </BottomSheet>
    </>
  );
}
