import { Pressable, Text, View, type PressableStateCallbackType } from "react-native";
import { router, usePathname } from "expo-router";

import { Logo } from "@/components/grafik";
import { Icon, type IconName } from "@/components/icon";
import { ProfilBild } from "@/components/profilbild";
import { useClipRechte } from "@/lib/clips-server";
import { NACHT, TAG, useDarstellung, type Farbwelt } from "@/lib/darstellung";
import { SEITENLEISTE } from "@/lib/fenster";
import { useKonto } from "@/lib/konto";
import { useLive } from "@/lib/live";
import { fortschritt, serieAktuell, useStand } from "@/lib/stand";
import { schrift } from "@/lib/theme";

// Seitenleiste links für den Browser am PC (Web-Panel). Ersetzt dort die
// schwebende Tab-Leiste: die fünf Bereiche, darunter häufige Ziele, unten
// Manager (Inhaber), Einstellungen, Hell/Dunkel und das eigene Profil. Bei
// kleineren Fenstern schmal mit nur Symbolen.

type Ziel = { pfad: string; titel: string; an: IconName; aus: IconName };

const HAUPT: Ziel[] = [
  { pfad: "/heute", titel: "Home", an: "home", aus: "home-outline" },
  { pfad: "/lernen", titel: "Lernen", an: "book", aus: "book-outline" },
  { pfad: "/pruefen", titel: "Prüfung", an: "shield-checkmark", aus: "shield-checkmark-outline" },
  { pfad: "/clips", titel: "Clips", an: "film", aus: "film-outline" },
  { pfad: "/profil", titel: "Profil", an: "person-circle", aus: "person-circle-outline" },
];

const MEHR: Ziel[] = [
  { pfad: "/statistik", titel: "Statistik", an: "stats-chart", aus: "stats-chart-outline" },
  { pfad: "/karteikarten", titel: "Karteikarten", an: "albums", aus: "albums-outline" },
  { pfad: "/favoriten", titel: "Favoriten", an: "heart", aus: "heart-outline" },
  { pfad: "/liga", titel: "Liga", an: "trophy", aus: "trophy-outline" },
];

/** Hover gibt es nur im Browser – React Native kennt den Zustand nicht. */
type Zustand = PressableStateCallbackType & { hovered?: boolean };

function Eintrag({ ziel, aktiv, schmal, f, punkt, akzent }: { ziel: Ziel; aktiv: boolean; schmal: boolean; f: Farbwelt; punkt?: boolean; akzent?: string }) {
  const farbe = aktiv ? f.orange : f.text2;
  return (
    <Pressable
      onPress={() => router.navigate(ziel.pfad as never)}
      accessibilityRole="link"
      accessibilityLabel={ziel.titel}
      accessibilityState={{ selected: aktiv }}
      style={(z: Zustand) => ({
        flexDirection: "row",
        alignItems: "center",
        justifyContent: schmal ? "center" : "flex-start",
        gap: 13,
        height: 46,
        paddingHorizontal: schmal ? 0 : 14,
        borderRadius: 14,
        backgroundColor: aktiv ? f.orangeSoft : z.hovered ? (f.hell ? "rgba(20,23,27,0.045)" : "rgba(255,255,255,0.06)") : "transparent",
        transform: [{ scale: z.pressed ? 0.98 : 1 }],
      })}
    >
      {aktiv && !schmal ? <View style={{ position: "absolute", left: -14, top: 11, bottom: 11, width: 4, borderRadius: 2, backgroundColor: f.orange }} /> : null}
      <View>
        <Icon name={aktiv ? ziel.an : ziel.aus} size={21} color={akzent && !aktiv ? akzent : farbe} />
        {punkt ? <View style={{ position: "absolute", top: -2, right: -4, width: 9, height: 9, borderRadius: 5, backgroundColor: "#FF2D55", borderWidth: 1.5, borderColor: f.hell ? "#FFFFFF" : "#07090C" }} /> : null}
      </View>
      {schmal ? null : (
        <Text style={{ ...(aktiv ? schrift.textFett : schrift.textHalb), fontSize: 15, color: aktiv ? f.text : f.text2 }} numberOfLines={1}>
          {ziel.titel}
        </Text>
      )}
    </Pressable>
  );
}

export function WebLeiste({ breite }: { breite: number }) {
  const pfad = usePathname();
  const { darstellung, setzen } = useDarstellung();
  const { anzeigeName, session, profil } = useKonto();
  const { stand } = useStand();
  const rechte = useClipRechte();
  const { live } = useLive();
  // Die Leiste folgt der gewählten Darstellung – auch neben Seiten, die immer dunkel sind (Clips).
  const f = darstellung === "hell" ? TAG : NACHT;
  const schmal = breite < SEITENLEISTE;
  const bereich = "/" + pfad.replace(/^\//, "").split("/")[0];
  const reife = Math.round(fortschritt(stand).anteil * 100);
  const serie = serieAktuell(stand);

  const ueberschrift = (t: string) =>
    schmal ? <View style={{ height: 1, backgroundColor: f.linie, marginVertical: 12, marginHorizontal: 14 }} /> : <Text style={{ ...schrift.textHalb, fontSize: 11.5, letterSpacing: 1, textTransform: "uppercase", color: f.text3, marginTop: 22, marginBottom: 6, marginLeft: 14 }}>{t}</Text>;

  return (
    <View
      style={{
        width: breite,
        height: "100%",
        paddingHorizontal: schmal ? 12 : 16,
        paddingTop: 22,
        paddingBottom: 16,
        backgroundColor: f.hell ? "#FFFFFF" : "#07090C",
        borderRightWidth: 1,
        borderRightColor: f.hell ? "rgba(28,22,14,0.07)" : "rgba(255,255,255,0.06)",
        zIndex: 20,
      }}
    >
      <Pressable onPress={() => router.navigate("/heute")} accessibilityRole="link" accessibilityLabel="Fahrschul Pro – Home" style={{ paddingHorizontal: schmal ? 0 : 8, alignItems: schmal ? "center" : "flex-start", marginBottom: 22 }}>
        <Logo groesse={schmal ? 34 : 30} mitText={!schmal} hell={f.hell} />
      </Pressable>

      <View style={{ gap: 3 }}>
        {HAUPT.map((z) => (
          <Eintrag key={z.pfad} ziel={z} aktiv={bereich === z.pfad} schmal={schmal} f={f} punkt={z.pfad === "/clips" && Boolean(live)} />
        ))}
      </View>

      {ueberschrift("Mehr")}
      <View style={{ gap: 3 }}>
        {MEHR.map((z) => (
          <Eintrag key={z.pfad} ziel={z} aktiv={bereich === z.pfad} schmal={schmal} f={f} />
        ))}
      </View>

      <View style={{ flex: 1 }} />

      <View style={{ gap: 3 }}>
        {rechte.inhaber ? <Eintrag ziel={{ pfad: "/manager", titel: "Manager", an: "grid", aus: "grid-outline" }} aktiv={bereich === "/manager"} schmal={schmal} f={f} akzent={f.orange} /> : null}
        <Eintrag ziel={{ pfad: "/einstellungen", titel: "Einstellungen", an: "settings", aus: "settings-outline" }} aktiv={bereich === "/einstellungen"} schmal={schmal} f={f} />
      </View>

      {/* Hell / Dunkel */}
      <View style={{ flexDirection: schmal ? "column" : "row", gap: 4, padding: 4, marginTop: 12, borderRadius: 14, backgroundColor: f.hell ? "#F4F1EC" : "rgba(255,255,255,0.05)" }}>
        {(
          [
            ["hell", "sunny", "Tag"],
            ["dunkel", "moon", "Nacht"],
          ] as const
        ).map(([d, icon, titel]) => {
          const an = darstellung === d;
          return (
            <Pressable
              key={d}
              onPress={() => setzen(d)}
              accessibilityRole="radio"
              accessibilityState={{ checked: an }}
              accessibilityLabel={`Darstellung ${titel}`}
              style={{ flex: schmal ? undefined : 1, height: 34, borderRadius: 10, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: an ? (f.hell ? "#FFFFFF" : "rgba(255,255,255,0.12)") : "transparent", ...(an && f.hell ? { boxShadow: "0px 2px 8px rgba(60,44,24,0.12)" } : null) }}
            >
              <Icon name={icon} size={15} color={an ? (d === "hell" ? "#F5A300" : "#8EA2FF") : f.text3} />
              {schmal ? null : <Text style={{ ...schrift.textHalb, fontSize: 13, color: an ? f.text : f.text3 }}>{titel}</Text>}
            </Pressable>
          );
        })}
      </View>

      {/* Eigenes Profil */}
      <Pressable
        onPress={() => router.navigate(session ? "/profil" : "/einstellungen")}
        accessibilityRole="link"
        accessibilityLabel="Mein Profil"
        style={(z: Zustand) => ({
          flexDirection: "row",
          alignItems: "center",
          justifyContent: schmal ? "center" : "flex-start",
          gap: 11,
          marginTop: 12,
          padding: schmal ? 6 : 10,
          borderRadius: 16,
          borderWidth: 1,
          borderColor: f.linie,
          backgroundColor: z.hovered ? (f.hell ? "#FAF7F2" : "rgba(255,255,255,0.05)") : "transparent",
        })}
      >
        <ProfilBild name={anzeigeName} groesse={38} rand={2} />
        {schmal ? null : (
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={{ ...schrift.textFett, fontSize: 14, color: f.text }} numberOfLines={1}>
              {anzeigeName}
            </Text>
            <Text style={{ ...schrift.textMittel, fontSize: 12, color: f.text3 }} numberOfLines={1}>
              {`Klasse ${profil?.klasse ?? "B"} · ${reife} % reif`}
              {serie ? ` · 🔥 ${serie}` : ""}
            </Text>
          </View>
        )}
      </Pressable>
    </View>
  );
}

