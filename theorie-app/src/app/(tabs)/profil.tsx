import { Pressable, ScrollView, Text, View } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Icon, type IconName } from "@/components/icon";
import { ProfilBild } from "@/components/profilbild";
import { useInhaltUnten } from "@/components/tab-leiste";
import { Knopf, kopfOben } from "@/components/ui";
import { dialog } from "@/components/dialog";
import { CLIPS } from "@/lib/clips";
import { ERFOLGE } from "@/lib/erfolge";
import { tausender } from "@/lib/format";
import { tippen } from "@/lib/haptik";
import { useKonto } from "@/lib/konto";
import { heuteDran, kartenZahlen } from "@/lib/karteikarten";
import { ALBUM } from "@/lib/schilder-jagd";
import { profilbildEntfernen, profilbildHochladen, profilbildServerEntfernen, profilbildWaehlen, useProfilbild } from "@/lib/profilbild";
import { serieAktuell, useStand } from "@/lib/stand";
import { farben, schrift } from "@/lib/theme";
import { useLeistenScroll } from "@/lib/leisten-scroll";

function Wert({ wert, label }: { wert: string; label: string }) {
  return (
    <View style={{ flex: 1, alignItems: "center", paddingVertical: 12 }}>
      <Text style={{ ...schrift.titelFett, fontSize: 20, color: "#FFFFFF", fontVariant: ["tabular-nums"] }}>{wert}</Text>
      <Text style={{ ...schrift.text, fontSize: 13, color: "#AEB3BA", marginTop: 2 }}>{label}</Text>
    </View>
  );
}

function Eintrag({ icon, farbe, titel, unter, onPress, gefahr }: { icon: IconName; farbe: string; titel: string; unter?: string; onPress: () => void; gefahr?: boolean }) {
  return (
    <Pressable
      onPress={() => {
        tippen();
        onPress();
      }}
      style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 13, paddingHorizontal: 14, backgroundColor: pressed ? farben.flaeche2 : "transparent" })}
    >
      <View style={{ width: 36, height: 36, borderRadius: 11, backgroundColor: farbe + "26", alignItems: "center", justifyContent: "center" }}>
        <Icon name={icon} size={19} color={farbe} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ ...schrift.textHalb, fontSize: 16, color: gefahr ? farben.rot : "#FFFFFF" }}>{titel}</Text>
        {unter ? <Text style={{ ...schrift.text, fontSize: 13, color: "#8F959D", marginTop: 1 }}>{unter}</Text> : null}
      </View>
      {gefahr ? null : <Icon name="chevron-forward" size={16} color="#5C626A" />}
    </Pressable>
  );
}

function Gruppe({ children }: { children: React.ReactNode }) {
  const kinder = (Array.isArray(children) ? children : [children]).flat().filter(Boolean);
  return (
    <View style={{ borderRadius: 16, overflow: "hidden", backgroundColor: farben.flaeche, borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" }}>
      {kinder.map((k, i) => (
        <View key={i}>
          {i > 0 ? <View style={{ height: 1, backgroundColor: "rgba(255,255,255,0.06)", marginLeft: 64 }} /> : null}
          {k}
        </View>
      ))}
    </View>
  );
}

export default function Profil() {
  const insets = useSafeAreaInsets();
  const inhaltUnten = useInhaltUnten();
  const leistenScroll = useLeistenScroll();
  const { stand } = useStand();
  const { profil, gast, anzeigeName, abmelden, session, profilNeuLaden } = useKonto();
  const bild = useProfilbild();
  const hatBild = Boolean(bild || profil?.bild_pfad);
  const freigeschaltet = ERFOLGE.filter((e) => stand.erfolge[e.id]).length;
  const gemerkteClips = CLIPS.filter((c) => stand.clips.gemerkt.includes(c.id)).length;
  const schilderGefunden = ALBUM.filter((k) => stand.schilder[k]).length;
  const kartenDran = heuteDran(stand).gesamt;
  const eigeneKarten = kartenZahlen(stand).eigene;

  async function fotoWaehlen() {
    const ok = await profilbildWaehlen();
    if (!ok || !session) return;
    try {
      // Auch auf den Server, damit andere es bei Clips und Kommentaren sehen.
      await profilbildHochladen(profil?.bild_pfad ?? null);
      await profilNeuLaden();
    } catch {
      dialog("Profilbild", "Das Bild ist auf deinem Handy gespeichert, konnte aber gerade nicht hochgeladen werden. Versuch es gleich noch einmal.");
    }
  }

  async function fotoEntfernen() {
    await profilbildEntfernen();
    if (!session) return;
    await profilbildServerEntfernen(profil?.bild_pfad ?? null);
    await profilNeuLaden();
  }

  function bildAendern() {
    const optionen: { text: string; onPress?: () => void; style?: "cancel" | "destructive" }[] = [{ text: "Foto auswählen", onPress: () => fotoWaehlen() }];
    if (hatBild) optionen.push({ text: "Foto entfernen", style: "destructive", onPress: () => fotoEntfernen() });
    optionen.push({ text: "Abbrechen", style: "cancel" });
    dialog("Profilbild", undefined, optionen);
  }

  function abmeldenFragen() {
    dialog(
      gast ? "Gastmodus beenden?" : "Abmelden?",
      gast ? "Dein Fortschritt bleibt auf diesem Gerät gespeichert." : "Dein Fortschritt ist in deinem Konto gesichert.",
      [
        { text: "Abbrechen", style: "cancel" },
        { text: gast ? "Beenden" : "Abmelden", style: "destructive", onPress: () => abmelden() },
      ],
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: farben.grund }}>
      <ScrollView {...leistenScroll} contentContainerStyle={{ paddingTop: kopfOben(insets.top) + 8, paddingHorizontal: 16, paddingBottom: inhaltUnten, gap: 16 }} showsVerticalScrollIndicator={false}>
        <Text style={{ ...schrift.titel, fontSize: 30, color: "#FFFFFF", letterSpacing: -0.4 }}>Profil</Text>

        {/* Kopf mit Profilbild */}
        <View style={{ alignItems: "center", gap: 10, paddingVertical: 8 }}>
          <Pressable
            onPress={() => {
              tippen();
              bildAendern();
            }}
            accessibilityLabel="Profilbild ändern"
          >
            <ProfilBild name={anzeigeName} groesse={96} rand={3} />
            <View style={{ position: "absolute", right: 0, bottom: 2, width: 30, height: 30, borderRadius: 15, backgroundColor: farben.orange, borderWidth: 3, borderColor: farben.grund, alignItems: "center", justifyContent: "center" }}>
              <Icon name="camera" sf="camera.fill" size={14} color="#FFFFFF" />
            </View>
          </Pressable>
          <View style={{ alignItems: "center" }}>
            <Text style={{ ...schrift.titelFett, fontSize: 24, color: "#FFFFFF" }} numberOfLines={1}>
              {anzeigeName}
            </Text>
            <Text style={{ ...schrift.text, fontSize: 14, color: "#AEB3BA", marginTop: 2 }} numberOfLines={1}>
              {profil ? `@${profil.benutzername}` : gast ? "Gastmodus" : session?.user.email ?? ""} · {profil?.rolle === "fahrlehrer" ? "Fahrlehrer" : `Klasse ${stand.klasse}`}
            </Text>
          </View>
        </View>

        {!session ? (
          <View style={{ padding: 16, gap: 14, borderRadius: 18, backgroundColor: farben.flaeche, borderWidth: 1, borderColor: "rgba(252,91,14,0.35)" }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: farben.orangeSoft, alignItems: "center", justifyContent: "center" }}>
                <Icon name="person-add-outline" size={20} color={farben.orange} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ ...schrift.textHalb, fontSize: 16, color: "#FFFFFF" }}>Kostenloses Konto erstellen</Text>
                <Text style={{ ...schrift.text, fontSize: 13.5, lineHeight: 18, color: "#AEB3BA", marginTop: 2 }}>
                  Fortschritt sichern, in der Liga mitspielen, Clips liken und kommentieren.
                </Text>
              </View>
            </View>
            <View style={{ flexDirection: "row", gap: 10 }}>
              <Knopf titel="Konto erstellen" klein onPress={() => router.push("/registrieren")} style={{ flex: 1 }} />
              <Knopf titel="Anmelden" klein art="sekundaer" onPress={() => router.push("/anmelden")} style={{ flex: 1 }} />
            </View>
          </View>
        ) : null}

        <View style={{ flexDirection: "row", borderRadius: 16, backgroundColor: farben.flaeche, borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" }}>
          <Wert wert={tausender(stand.xp)} label="Punkte" />
          <View style={{ width: 1, marginVertical: 12, backgroundColor: "rgba(255,255,255,0.08)" }} />
          <Wert wert={String(serieAktuell(stand))} label="Tage in Folge" />
          <View style={{ width: 1, marginVertical: 12, backgroundColor: "rgba(255,255,255,0.08)" }} />
          <Wert wert={`${freigeschaltet}/${ERFOLGE.length}`} label="Abzeichen" />
        </View>

        <Gruppe>
          <Eintrag icon="stats-chart" farbe={farben.orange} titel="Mein Fortschritt" unter="Statistiken, Stärken & Schwächen" onPress={() => router.push("/statistik")} />
          <Eintrag
            icon="camera"
            farbe={farben.blau}
            titel="Schilder-Jagd"
            unter={schilderGefunden > 0 ? `${schilderGefunden} von ${ALBUM.length} Schildern gefunden` : "Echte Schilder mit der Kamera sammeln"}
            onPress={() => router.push("/schilder-jagd")}
          />
          <Eintrag
            icon="albums"
            farbe={farben.gruen}
            titel="Karteikarten"
            unter={kartenDran > 0 ? `${kartenDran} ${kartenDran === 1 ? "Karte" : "Karten"} heute dran` : eigeneKarten > 0 ? `${eigeneKarten} eigene ${eigeneKarten === 1 ? "Karte" : "Karten"}` : "Fragen als Karten lernen"}
            onPress={() => router.push("/karteikarten")}
          />
          <Eintrag icon="trophy" farbe={farben.gelb} titel="Rangliste & Duelle" unter="Wochen-Liga, Elo und Freundes-Duelle" onPress={() => router.push("/liga")} />
          <Eintrag icon="bulb" farbe={farben.pink} titel="Kurz erklärt" unter={gemerkteClips > 0 ? `${gemerkteClips} gemerkt` : "Regeln in 30 Sekunden"} onPress={() => router.push("/kurz-erklaert")} />
          <Eintrag icon="heart" farbe="#FF8A1E" titel="Favoriten" unter="Gemerkte und schwierige Fragen" onPress={() => router.push("/favoriten")} />
          <Eintrag icon="calculator" farbe={farben.gelb} titel="Formeln" unter="Anhalteweg & Co." onPress={() => router.push("/formeln")} />
        </Gruppe>

        <View>
          <Text style={{ ...schrift.titelFett, fontSize: 18, color: "#FFFFFF", marginBottom: 10 }}>Abzeichen</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", rowGap: 16, paddingVertical: 14, borderRadius: 16, backgroundColor: farben.flaeche, borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" }}>
            {ERFOLGE.map((e) => {
              const hat = Boolean(stand.erfolge[e.id]);
              return (
                <Pressable
                  key={e.id}
                  onPress={() => {
                    tippen();
                    dialog(e.titel, hat ? `${e.text}\nFreigeschaltet am ${stand.erfolge[e.id].split("-").reverse().join(".")}.` : e.text);
                  }}
                  style={{ width: "25%", alignItems: "center", gap: 7 }}
                >
                  <View
                    style={{
                      width: 52,
                      height: 52,
                      borderRadius: 26,
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: hat ? farben.orangeSoft : farben.flaeche2,
                      borderWidth: 1.5,
                      borderColor: hat ? farben.orange : "rgba(255,255,255,0.08)",
                    }}
                  >
                    <Icon name={hat ? e.icon : "lock-closed"} size={hat ? 22 : 16} color={hat ? farben.orange : farben.text4} />
                  </View>
                  <Text style={{ ...schrift.textMittel, fontSize: 11.5, lineHeight: 15, color: hat ? "#D3D7DC" : farben.text4, textAlign: "center", paddingHorizontal: 2 }} numberOfLines={2}>
                    {e.titel}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <Gruppe>
          <Eintrag icon="settings-outline" farbe="#C4C8CE" titel="Einstellungen & Konto" onPress={() => router.push("/einstellungen")} />
          <Eintrag icon="diamond-outline" farbe={farben.orange} titel="Premium" unter="Bald verfügbar" onPress={() => router.push("/premium")} />
          <Eintrag icon="images-outline" farbe="#C4C8CE" titel="Bildnachweise" onPress={() => router.push("/bildnachweise")} />
          <Eintrag icon="log-out-outline" farbe={farben.rot} titel={gast ? "Gastmodus beenden" : "Abmelden"} gefahr onPress={abmeldenFragen} />
        </Gruppe>
      </ScrollView>
    </View>
  );
}
