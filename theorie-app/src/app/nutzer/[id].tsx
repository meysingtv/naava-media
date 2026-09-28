import { useCallback, useState } from "react";
import { FlatList, Image, Pressable, RefreshControl, Text, useWindowDimensions, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Icon } from "@/components/icon";
import { Lader } from "@/components/lader";
import { NutzerBild, ProfilBild } from "@/components/profilbild";
import { Knopf, KopfTaste, kopfOben, zurueck } from "@/components/ui";
import { anmeldenFragen } from "@/lib/clip-aktionen";
import { clipsVonLaden, dateiUrl, erstellerProfilLaden, folgenSetzen, kurzeZahl, type ClipEintrag, type ErstellerProfil } from "@/lib/clips-server";
import { tippen } from "@/lib/haptik";
import { useKonto } from "@/lib/konto";
import { farben, schrift } from "@/lib/theme";

const SPALTEN = 3;
const LUECKE = 2;

function Zahl({ wert, label }: { wert: number; label: string }) {
  return (
    <View style={{ flex: 1, alignItems: "center", gap: 2 }}>
      <Text style={{ ...schrift.titelFett, fontSize: 18, color: "#FFFFFF", fontVariant: ["tabular-nums"] }}>{kurzeZahl(wert)}</Text>
      <Text style={{ ...schrift.text, fontSize: 12.5, color: farben.text3 }}>{label}</Text>
    </View>
  );
}

/** Profil eines Erstellers: Kopf mit Zahlen, Folgen-Knopf und alle Clips als Raster. */
export default function NutzerProfil() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { session } = useKonto();
  const [profil, setProfil] = useState<ErstellerProfil | null>(null);
  const [clips, setClips] = useState<ClipEintrag[] | null>(null);
  const [fehler, setFehler] = useState<string | null>(null);
  const [aktualisiert, setAktualisiert] = useState(false);

  const laden = useCallback(async () => {
    if (!id) return;
    try {
      const [p, c] = await Promise.all([erstellerProfilLaden(id), clipsVonLaden(id)]);
      setProfil(p);
      setClips(c);
      setFehler(null);
    } catch (e) {
      setFehler((e as Error).message);
    }
  }, [id]);

  // Beim Öffnen und beim Zurückkommen aus dem Video frisch laden (Likes, Folgen).
  useFocusEffect(
    useCallback(() => {
      laden();
    }, [laden]),
  );

  async function neuLaden() {
    setAktualisiert(true);
    await laden();
    setAktualisiert(false);
  }

  async function folgen() {
    if (!profil) return;
    if (!session) {
      anmeldenFragen("Folgen");
      return;
    }
    tippen();
    const an = !profil.folge_ich;
    setProfil({ ...profil, folge_ich: an, follower: Math.max(0, profil.follower + (an ? 1 : -1)) });
    try {
      await folgenSetzen(profil.id, an);
    } catch {
      setProfil((p) => (p ? { ...p, folge_ich: !an, follower: Math.max(0, p.follower + (an ? -1 : 1)) } : p));
    }
  }

  const kachelBreite = (width - LUECKE * (SPALTEN - 1)) / SPALTEN;
  const kachelHoehe = (kachelBreite * 16) / 9;
  const name = profil ? profil.name || profil.benutzername : "";

  const kopf = (
    <View style={{ paddingTop: kopfOben(insets.top), paddingBottom: 14 }}>
      <View style={{ minHeight: 44, flexDirection: "row", alignItems: "center", paddingHorizontal: 8 }}>
        <KopfTaste icon="arrow-back" label="Zurück" onPress={zurueck} />
        <View pointerEvents="none" style={{ position: "absolute", left: 56, right: 56, top: 0, bottom: 0, alignItems: "center", justifyContent: "center" }}>
          <Text numberOfLines={1} style={{ ...schrift.titelFett, fontSize: 18, color: "#FFFFFF" }}>
            {name}
          </Text>
        </View>
      </View>

      {profil ? (
        <View style={{ alignItems: "center", paddingHorizontal: 16, marginTop: 10, gap: 14 }}>
          {profil.ich ? (
            <ProfilBild name={name} groesse={96} rand={2.5} />
          ) : (
            <NutzerBild pfad={profil.bild_pfad} name={name} farbe={profil.avatar_farbe} groesse={96} rand={2.5} />
          )}
          <View style={{ alignItems: "center", gap: 2 }}>
            <Text numberOfLines={1} style={{ ...schrift.titel, fontSize: 22, color: "#FFFFFF" }}>
              {name}
            </Text>
            <Text numberOfLines={1} style={{ ...schrift.textMittel, fontSize: 14, color: farben.text3 }}>
              @{profil.benutzername}
            </Text>
          </View>

          <View style={{ flexDirection: "row", alignSelf: "stretch", paddingVertical: 4 }}>
            <Zahl wert={profil.clips} label="Clips" />
            <Zahl wert={profil.follower} label="Follower" />
            <Zahl wert={profil.folgt} label="Folgt" />
            <Zahl wert={profil.likes} label="Likes" />
          </View>

          <View style={{ width: "62%" }}>
            {profil.ich ? (
              <Knopf titel="Profil bearbeiten" klein art="sekundaer" onPress={() => router.push("/einstellungen")} />
            ) : profil.folge_ich ? (
              <Knopf titel="Folge ich" icon="checkmark" klein art="sekundaer" onPress={folgen} />
            ) : (
              <Knopf titel="Folgen" klein onPress={folgen} />
            )}
          </View>
        </View>
      ) : fehler ? null : (
        <Lader color="#FFFFFF" style={{ marginTop: 40 }} />
      )}

      {profil ? (
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 22, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: farben.linie }}>
          <Icon name="grid" sf="square.grid.3x3.fill" size={16} color="#FFFFFF" />
          <Text style={{ ...schrift.textHalb, fontSize: 14, color: "#FFFFFF" }}>Clips</Text>
        </View>
      ) : null}
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: farben.grund }}>
      <FlatList
        data={clips ?? []}
        numColumns={SPALTEN}
        keyExtractor={(c) => c.id}
        columnWrapperStyle={{ gap: LUECKE }}
        contentContainerStyle={{ gap: LUECKE, paddingBottom: insets.bottom + 24 }}
        ListHeaderComponent={kopf}
        refreshControl={<RefreshControl refreshing={aktualisiert} onRefresh={neuLaden} tintColor="#FFFFFF" colors={[farben.orange]} progressBackgroundColor={farben.flaeche2} />}
        ListEmptyComponent={
          fehler ? (
            <View style={{ alignItems: "center", gap: 12, paddingTop: 30, paddingHorizontal: 32 }}>
              <Text style={{ ...schrift.text, fontSize: 15, color: farben.text3, textAlign: "center" }}>{fehler}</Text>
              <Knopf titel="Nochmal versuchen" klein onPress={laden} />
            </View>
          ) : clips && profil ? (
            <View style={{ alignItems: "center", gap: 8, paddingTop: 36, paddingHorizontal: 32 }}>
              <Icon name="film-outline" sf="play.rectangle.on.rectangle" size={34} color={farben.text4} />
              <Text style={{ ...schrift.textHalb, fontSize: 16, color: "#FFFFFF" }}>Noch keine Clips</Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => {
              tippen();
              router.push({ pathname: "/clip-ansicht", params: { nutzer: id, start: item.id } });
            }}
            accessibilityLabel={item.titel}
            style={({ pressed }) => ({ width: kachelBreite, height: kachelHoehe, backgroundColor: farben.flaeche2, opacity: pressed ? 0.8 : 1 })}
          >
            {item.bild_pfad ? (
              <Image source={{ uri: dateiUrl(item.bild_pfad) }} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
            ) : (
              <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
                <Icon name="play" sf="play.fill" size={26} color={farben.text4} />
              </View>
            )}
            <LinearGradient colors={["rgba(0,0,0,0)", "rgba(0,0,0,0.6)"]} style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 56 }} />
            <View style={{ position: "absolute", left: 7, bottom: 6, right: 7, flexDirection: "row", alignItems: "center", gap: 4 }}>
              <Icon name={item.gemocht ? "heart" : "heart-outline"} sf={item.gemocht ? "heart.fill" : "heart"} size={13} color={item.gemocht ? farben.orange : "#FFFFFF"} />
              <Text style={{ ...schrift.textHalb, fontSize: 12.5, color: "#FFFFFF" }}>{kurzeZahl(item.likes)}</Text>
            </View>
          </Pressable>
        )}
      />
    </View>
  );
}
