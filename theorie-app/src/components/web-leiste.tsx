import { Pressable, Text, View, type PressableStateCallbackType } from "react-native";
import { router, usePathname } from "expo-router";

import { Logo } from "@/components/grafik";
import { Icon, type IconName } from "@/components/icon";
import { ProfilBild } from "@/components/profilbild";
import { useClipRechte } from "@/lib/clips-server";
import { istHelleSeite, NACHT, TAG, useDarstellung } from "@/lib/darstellung";
import { breiteSpalte, WEB_LEISTE } from "@/lib/fenster";
import { useKonto } from "@/lib/konto";
import { useLive } from "@/lib/live";
import { mitDeckkraft, schrift } from "@/lib/theme";

// Navigationsleiste oben für den Browser am PC (Web-Panel). Ersetzt dort die
// schwebende Tab-Leiste: dieselben fünf Bereiche, rechts Einstellungen, für den
// Inhaber der Manager und das Profilbild. Glas wie in der App, hell oder dunkel
// passend zur offenen Seite.

type Reiter = { pfad: string; titel: string; an: IconName; aus: IconName };

const REITER: Reiter[] = [
  { pfad: "/heute", titel: "Home", an: "home", aus: "home-outline" },
  { pfad: "/lernen", titel: "Lernen", an: "book", aus: "book-outline" },
  { pfad: "/clips", titel: "Clips", an: "film", aus: "film-outline" },
  { pfad: "/pruefen", titel: "Prüfung", an: "shield-checkmark", aus: "shield-checkmark-outline" },
  { pfad: "/profil", titel: "Profil", an: "person-circle", aus: "person-circle-outline" },
];

/** Seiten, die den ganzen Bildschirm brauchen (Prüfung, Training, Live …): dort keine Leiste. */
const OHNE_LEISTE = new Set([
  "",
  "willkommen",
  "anmelden",
  "registrieren",
  "auth-callback",
  "passwort-neu",
  "einrichtung",
  "training",
  "pruefung",
  "duell",
  "online-duell",
  "live",
  "live-senden",
  "karten-lernen",
  "schild-scanner",
  "clip-ansicht",
]);

export function zeigtWebLeiste(pfad: string): boolean {
  return !OHNE_LEISTE.has(pfad.replace(/^\//, "").split("/")[0]);
}

/** Hover gibt es nur im Browser – React Native kennt den Zustand nicht. */
type Zustand = PressableStateCallbackType & { hovered?: boolean };

export function WebLeiste() {
  const pfad = usePathname();
  const { darstellung } = useDarstellung();
  const { anzeigeName, session } = useKonto();
  const rechte = useClipRechte();
  const { live } = useLive();
  const hell = istHelleSeite(darstellung, pfad);
  const f = hell ? TAG : NACHT;
  const bereich = "/" + pfad.replace(/^\//, "").split("/")[0];

  return (
    <View
      style={{
        height: WEB_LEISTE,
        zIndex: 20,
        backgroundColor: hell ? "rgba(244,241,236,0.82)" : "rgba(5,7,10,0.82)",
        borderBottomWidth: 1,
        borderBottomColor: hell ? "rgba(28,22,14,0.08)" : "rgba(255,255,255,0.07)",
        // Glas: Unschärfe hinter der Leiste (nur im Browser)
        ...({ backdropFilter: "saturate(180%) blur(22px)", WebkitBackdropFilter: "saturate(180%) blur(22px)" } as object),
      }}
    >
      <View style={{ flex: 1, width: "100%", maxWidth: breiteSpalte(pfad), alignSelf: "center", paddingHorizontal: 28, flexDirection: "row", alignItems: "center" }}>
        <Pressable onPress={() => router.navigate("/heute")} accessibilityRole="link" accessibilityLabel="Fahrschul Pro – Home" style={{ flex: 1 }}>
          <Logo groesse={30} hell={hell} />
        </Pressable>

        <View accessibilityRole="tablist" style={{ flexDirection: "row", gap: 4, padding: 4, borderRadius: 999, backgroundColor: hell ? "rgba(255,255,255,0.75)" : "rgba(255,255,255,0.05)", borderWidth: 1, borderColor: f.linie }}>
          {REITER.map((r) => {
            const aktiv = bereich === r.pfad;
            return (
              <Pressable
                key={r.pfad}
                onPress={() => router.navigate(r.pfad as never)}
                accessibilityRole="tab"
                accessibilityState={{ selected: aktiv }}
                style={(z: Zustand) => ({
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 7,
                  height: 40,
                  paddingHorizontal: 16,
                  borderRadius: 999,
                  backgroundColor: aktiv ? f.orange : z.hovered ? (hell ? "rgba(20,23,27,0.05)" : "rgba(255,255,255,0.07)") : "transparent",
                  ...(aktiv ? { boxShadow: `0px 6px 18px ${mitDeckkraft(f.orange, hell ? 0.3 : 0.4)}` } : null),
                  transform: [{ scale: z.pressed ? 0.97 : 1 }],
                })}
              >
                <View>
                  <Icon name={aktiv ? r.an : r.aus} size={18} color={aktiv ? "#FFFFFF" : f.text2} />
                  {r.pfad === "/clips" && live ? (
                    <View style={{ position: "absolute", top: -2, right: -4, width: 8, height: 8, borderRadius: 4, backgroundColor: "#FF2D55", borderWidth: 1.5, borderColor: hell ? "#FFFFFF" : "#0E1014" }} />
                  ) : null}
                </View>
                <Text style={{ ...schrift.textHalb, fontSize: 14.5, color: aktiv ? "#FFFFFF" : f.text2 }}>{r.titel}</Text>
              </Pressable>
            );
          })}
        </View>

        <View style={{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "flex-end", gap: 10 }}>
          {rechte.inhaber ? (
            <Pressable
              onPress={() => router.navigate("/manager")}
              accessibilityRole="link"
              style={(z: Zustand) => ({
                flexDirection: "row",
                alignItems: "center",
                gap: 7,
                height: 40,
                paddingHorizontal: 15,
                borderRadius: 999,
                borderWidth: 1,
                borderColor: bereich === "/manager" ? f.orange : f.linieStark,
                backgroundColor: bereich === "/manager" ? f.orangeSoft : z.hovered ? (hell ? "#FFFFFF" : "rgba(255,255,255,0.08)") : "transparent",
              })}
            >
              <Icon name="grid" size={16} color={f.orange} />
              <Text style={{ ...schrift.textHalb, fontSize: 14, color: f.text }}>Manager</Text>
            </Pressable>
          ) : null}
          <Pressable
            onPress={() => router.navigate("/einstellungen")}
            accessibilityRole="link"
            accessibilityLabel="Einstellungen"
            style={(z: Zustand) => ({
              width: 40,
              height: 40,
              borderRadius: 20,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: bereich === "/einstellungen" ? f.orangeSoft : z.hovered ? (hell ? "#FFFFFF" : "rgba(255,255,255,0.08)") : "transparent",
            })}
          >
            <Icon name={bereich === "/einstellungen" ? "settings" : "settings-outline"} size={20} color={bereich === "/einstellungen" ? f.orange : f.text2} />
          </Pressable>
          <Pressable onPress={() => router.navigate(session ? "/profil" : "/einstellungen")} accessibilityRole="link" accessibilityLabel="Mein Profil">
            <ProfilBild name={anzeigeName} groesse={38} rand={2} />
          </Pressable>
        </View>
      </View>
    </View>
  );
}
