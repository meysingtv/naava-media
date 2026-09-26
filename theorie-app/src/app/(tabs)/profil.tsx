import { Alert, Pressable, ScrollView, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Abschnitt, Avatar, Gruppe, Karte, T, Zeile } from "@/components/ui";
import { INHALT_UNTEN } from "@/components/tab-leiste";
import { ERFOLGE } from "@/lib/erfolge";
import { tausender, uhrzeit } from "@/lib/format";
import { tippen } from "@/lib/haptik";
import { useKonto } from "@/lib/konto";
import { useStand } from "@/lib/stand";
import { abstand, farben, RAND } from "@/lib/theme";

function Wert({ zahl, label }: { zahl: string; label: string }) {
  return (
    <Karte style={{ flex: 1, padding: abstand(4), gap: 2 }}>
      <T v="zahl" style={{ fontSize: 24, lineHeight: 29 }}>
        {zahl}
      </T>
      <T v="klein">{label}</T>
    </Karte>
  );
}

export default function Profil() {
  const insets = useSafeAreaInsets();
  const { stand } = useStand();
  const { profil, gast, anzeigeName, abmelden, session } = useKonto();

  const antworten = Object.values(stand.fragen).reduce((s, f) => s + f.r + f.f, 0);
  const richtig = Object.values(stand.fragen).reduce((s, f) => s + f.r, 0);
  const quote = antworten > 0 ? Math.round((richtig / antworten) * 100) : 0;
  const freigeschaltet = ERFOLGE.filter((e) => stand.erfolge[e.id]).length;

  function abmeldenFragen() {
    Alert.alert(
      gast ? "Gastmodus beenden?" : "Abmelden?",
      gast ? "Dein Fortschritt bleibt auf diesem Gerät gespeichert." : "Dein Fortschritt ist in deinem Konto gesichert.",
      [
        { text: "Abbrechen", style: "cancel" },
        { text: gast ? "Beenden" : "Abmelden", style: "destructive", onPress: () => abmelden() },
      ],
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: farben.grund }}
      contentContainerStyle={{ paddingTop: insets.top + abstand(3), paddingHorizontal: RAND, paddingBottom: INHALT_UNTEN, gap: abstand(7) }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: abstand(4) }}>
        <Avatar name={anzeigeName} groesse={68} />
        <View style={{ flex: 1, gap: 3 }}>
          <T v="titel" numberOfLines={1}>
            {anzeigeName}
          </T>
          <T v="klein" numberOfLines={1}>
            {profil ? `@${profil.benutzername}` : gast ? "Gastmodus" : session?.user.email ?? ""} · Klasse {stand.klasse}
          </T>
        </View>
        <Pressable
          onPress={() => {
            tippen();
            router.push("/einstellungen");
          }}
          hitSlop={8}
          accessibilityLabel="Einstellungen"
          style={{ width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center", backgroundColor: farben.flaeche, borderWidth: 1, borderColor: farben.linie }}
        >
          <Ionicons name="settings-outline" size={20} color={farben.text2} />
        </Pressable>
      </View>

      <View style={{ gap: abstand(3) }}>
        <View style={{ flexDirection: "row", gap: abstand(3) }}>
          <Wert zahl={tausender(antworten)} label="Antworten" />
          <Wert zahl={`${quote} %`} label="Trefferquote" />
        </View>
        <View style={{ flexDirection: "row", gap: abstand(3) }}>
          <Wert zahl={`${stand.besteSerie}`} label={stand.besteSerie === 1 ? "Tag längste Serie" : "Tage längste Serie"} />
          <Wert zahl={tausender(stand.xp)} label="XP gesamt" />
        </View>
      </View>

      <View>
        <Abschnitt titel={`Abzeichen · ${freigeschaltet} von ${ERFOLGE.length}`} />
        <View style={{ flexDirection: "row", flexWrap: "wrap", rowGap: abstand(5) }}>
          {ERFOLGE.map((e) => {
            const hat = Boolean(stand.erfolge[e.id]);
            return (
              <Pressable
                key={e.id}
                onPress={() => {
                  tippen();
                  Alert.alert(e.titel, hat ? `${e.text}\nFreigeschaltet am ${stand.erfolge[e.id].split("-").reverse().join(".")}.` : e.text);
                }}
                style={{ width: "25%", alignItems: "center", gap: abstand(2) }}
              >
                <View
                  style={{
                    width: 58,
                    height: 58,
                    borderRadius: 29,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: hat ? farben.orangeSoft : farben.flaeche,
                    borderWidth: 1.5,
                    borderColor: hat ? farben.orange : farben.linie,
                  }}
                >
                  <Ionicons name={hat ? e.icon : "lock-closed"} size={hat ? 24 : 18} color={hat ? farben.orange : farben.text4} />
                </View>
                <T v="klein" zentriert numberOfLines={2} farbe={hat ? farben.text2 : farben.text4} style={{ fontSize: 11.5, lineHeight: 15, paddingHorizontal: 2 }}>
                  {e.titel}
                </T>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View>
        <Abschnitt titel="Lernen" />
        <Gruppe>
          <Zeile icon="speedometer-outline" titel="Tagesziel" wert={`${stand.tagesziel} Fragen`} onPress={() => router.push("/einstellungen")} />
          <Zeile
            icon="notifications-outline"
            titel="Erinnerung"
            wert={stand.erinnerung.an ? uhrzeit(stand.erinnerung.stunde, stand.erinnerung.minute) : "Aus"}
            onPress={() => router.push("/einstellungen")}
          />
          <Zeile icon="diamond-outline" iconFarbe={farben.orange} titel="Spur Plus" unter="Bald verfügbar" onPress={() => router.push("/premium")} />
        </Gruppe>
      </View>

      <Gruppe>
        <Zeile icon="settings-outline" titel="Einstellungen & Konto" onPress={() => router.push("/einstellungen")} />
        <Zeile icon="log-out-outline" titel={gast ? "Gastmodus beenden" : "Abmelden"} gefahr ohnePfeil onPress={abmeldenFragen} />
      </Gruppe>
    </ScrollView>
  );
}
