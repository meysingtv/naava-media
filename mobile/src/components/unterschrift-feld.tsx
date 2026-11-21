import { useState } from "react";
import { Alert, View } from "react-native";

import { Button, Row, Section } from "@/components/ui";
import { SignaturePad, SignatureView } from "@/components/signature";
import { supabase } from "@/lib/supabase";
import { useTheme } from "@/lib/theme-context";
import { radius, space } from "@/lib/theme";

export function UnterschriftFeld({ fahrstundeId, initial }: { fahrstundeId: string; initial: string | null }) {
  const { colors } = useTheme();
  const [data, setData] = useState<string | null>(initial);
  const [open, setOpen] = useState(false);

  async function speichern(neu: string) {
    setOpen(false);
    const { error } = await supabase.from("fahrstunde").update({ unterschrift: neu }).eq("id", fahrstundeId);
    if (error) {
      Alert.alert("Fehler", error.message);
      return;
    }
    setData(neu);
  }

  return (
    <>
      <Section title="Unterschrift">
        {data ? (
          <View style={{ padding: space(3), gap: space(3) }}>
            <View style={{ backgroundColor: "#FFFFFF", borderRadius: radius.md, overflow: "hidden", paddingVertical: space(2) }}>
              <SignatureView data={data} color="#111111" height={110} />
            </View>
            <Button title="Neu unterschreiben" variant="tinted" onPress={() => setOpen(true)} />
          </View>
        ) : (
          <Row title="Vom Schüler unterschreiben lassen" chevron onPress={() => setOpen(true)} />
        )}
      </Section>
      <SignaturePad visible={open} onClose={() => setOpen(false)} onSave={speichern} />
    </>
  );
}
