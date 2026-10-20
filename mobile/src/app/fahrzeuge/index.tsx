import { RefreshControl, ScrollView } from "react-native";
import { useRouter } from "expo-router";

import { CenterInfo, Row, Screen, Section } from "@/components/ui";
import { useLoader } from "@/lib/use-loader";
import { supabase } from "@/lib/supabase";
import { useTheme } from "@/lib/theme-context";
import { space } from "@/lib/theme";
import type { Fahrzeug } from "@/lib/types";

export default function FahrzeugeListe() {
  const router = useRouter();
  const { colors } = useTheme();
  const { data, loading, error, refreshing, refresh } = useLoader<Fahrzeug[]>(
    () => supabase.from("fahrzeug").select("*").order("kennzeichen").returns<Fahrzeug[]>(),
    { cacheKey: "fahrzeuge" },
  );
  const liste = data ?? [];

  if (loading) return <CenterInfo loading />;
  if (error) return <CenterInfo text={error} error />;

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={{ padding: space(4) }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.accent} />}
      >
        <Section>
          {liste.length === 0 ? (
            <Row title="Noch keine Fahrzeuge" />
          ) : (
            liste.map((f) => (
              <Row
                key={f.id}
                title={f.kennzeichen}
                subtitle={[f.marke, f.modell].filter(Boolean).join(" ") || undefined}
                value={f.aktiv ? undefined : "Inaktiv"}
                chevron
                onPress={() => router.push(`/fahrzeuge/${f.id}`)}
              />
            ))
          )}
        </Section>
      </ScrollView>
    </Screen>
  );
}
