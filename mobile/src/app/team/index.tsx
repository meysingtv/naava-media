import { RefreshControl, ScrollView } from "react-native";
import { useRouter } from "expo-router";

import { CenterInfo, Row, Screen, Section } from "@/components/ui";
import { useLoader } from "@/lib/use-loader";
import { supabase } from "@/lib/supabase";
import { ROLLEN } from "@/lib/constants";
import { useTheme } from "@/lib/theme-context";
import { space } from "@/lib/theme";
import type { Fahrlehrer } from "@/lib/types";

export default function TeamListe() {
  const router = useRouter();
  const { colors } = useTheme();
  const { data, loading, error, refreshing, refresh } = useLoader<Fahrlehrer[]>(
    () => supabase.from("fahrlehrer").select("*").order("nachname").returns<Fahrlehrer[]>(),
    { cacheKey: "team" },
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
            <Row title="Noch keine Mitarbeiter" />
          ) : (
            liste.map((f) => (
              <Row
                key={f.id}
                title={`${f.vorname} ${f.nachname}`}
                subtitle={ROLLEN[f.rolle]}
                value={f.aktiv ? undefined : "Inaktiv"}
                chevron
                onPress={() => router.push(`/team/${f.id}`)}
              />
            ))
          )}
        </Section>
      </ScrollView>
    </Screen>
  );
}
