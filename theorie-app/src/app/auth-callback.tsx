import { useEffect, useState } from "react";
import { View } from "react-native";
import { Redirect } from "expo-router";

import { Lader } from "@/components/lader";
import { useKonto } from "@/lib/konto";
import { farben } from "@/lib/theme";

/**
 * Rückkehr aus der Google-Anmeldung (Android öffnet dafür die App mit
 * spur://auth-callback). Die Anmeldung selbst übernimmt lib/konto.tsx –
 * hier geht es nur zurück in die App.
 */
export default function AuthRueckkehr() {
  const { session } = useKonto();
  const [genugGewartet, setGenugGewartet] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setGenugGewartet(true), 4000);
    return () => clearTimeout(t);
  }, []);

  if (session || genugGewartet) return <Redirect href="/" />;
  return (
    <View style={{ flex: 1, backgroundColor: farben.grund, alignItems: "center", justifyContent: "center" }}>
      <Lader color={farben.orange} />
    </View>
  );
}
