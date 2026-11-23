import { useCallback, useState } from "react";
import { Image, Pressable, Text, View } from "react-native";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";

import { dialog } from "@/components/dialog";
import { Icon } from "@/components/icon";
import { Lader } from "@/components/lader";
import { NutzerBild, ProfilBild } from "@/components/profilbild";
import { Abschnitt, B, Kachel, Knopf, Leer, n, Raster, Spalte, TOENE, type Zustand } from "@/components/web/bunt";
import { WebSeite } from "@/components/web/rahmen";
import { entblocken, useBlockiert } from "@/lib/blockieren";
import { blockierenFragen } from "@/lib/blockieren-fragen";
import { anmeldenFragen } from "@/lib/clip-aktionen";
import { clipsVonLaden, dateiUrl, erstellerProfilLaden, folgenSetzen, kurzeZahl, type ClipEintrag, type ErstellerProfil } from "@/lib/clips-server";
import { CREW_MAX, useCrew } from "@/lib/crew";
import { FRAGEN_AKTIV } from "@/lib/funktionen";
import { erfolg } from "@/lib/haptik";
import { useKonto } from "@/lib/konto";

// Profil einer Person am PC: oben eine Kachel mit Bild, Name, Zahlen und
// Folgen, darunter alle Clips als Raster im Hochformat mit Titel.

/** Fehlertext, wenn es das Profil nicht gibt (statt eines Ladefehlers). */
const FEHLT = "Dieses Profil gibt es nicht (mehr).";

function Zurueck() {
  return (
    <Pressable
      onPress={() => (router.canGoBack() ? router.back() : router.navigate("/clips"))}
      accessibilityLabel="Zurück"
      style={(z: Zustand) => ({ alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 6, height: 34, paddingHorizontal: 10, marginLeft: -10, marginBottom: -18, borderRadius: 10, backgroundColor: z.hovered ? B.ton : "transparent" })}
    >
      <Icon name="arrow-back" size={18} color={B.text2} />
      <Text style={{ ...n.fett, fontSize: 14.5, color: B.text2 }}>Zurück</Text>
    </Pressable>
  );
}

function Zahl({ wert, titel }: { wert: number; titel: string }) {
  return (
    <View>
      <Text style={{ ...n.schwarz, fontSize: 20, lineHeight: 24, color: B.text, fontVariant: ["tabular-nums"] }}>{kurzeZahl(wert)}</Text>
      <Text style={{ ...n.halb, fontSize: 13, color: B.text2 }}>{titel}</Text>
    </View>
  );
}

function ClipKachel({ clip, onPress }: { clip: ClipEintrag; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityLabel={clip.titel} style={(z: Zustand) => ({ gap: 10, opacity: z.pressed ? 0.85 : 1 })}>
      {(z: Zustand) => (
        <>
          <View style={{ aspectRatio: 9 / 16, borderRadius: 16, overflow: "hidden", backgroundColor: B.ton, borderWidth: 1.5, borderColor: z.hovered ? B.kante : B.linie }}>
            {clip.bild_pfad ? (
              <Image source={{ uri: dateiUrl(clip.bild_pfad) }} style={{ width: "100%", height: "100%", transform: [{ scale: z.hovered ? 1.03 : 1 }] }} resizeMode="cover" />
            ) : (
              <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
                <Icon name="play" size={30} color={B.text3} />
              </View>
            )}
            <View style={{ position: "absolute", left: 10, bottom: 10, flexDirection: "row", alignItems: "center", gap: 5, height: 26, paddingHorizontal: 9, borderRadius: 13, backgroundColor: "rgba(20,22,25,0.62)" }}>
              <Icon name={clip.gemocht ? "heart" : "heart-outline"} size={14} color={clip.gemocht ? "#FF6A8A" : "#FFFFFF"} />
              <Text style={{ ...n.fett, fontSize: 12.5, color: "#FFFFFF" }}>{kurzeZahl(clip.likes)}</Text>
            </View>
          </View>
          {clip.titel ? (
            <Text style={{ ...n.fett, fontSize: 14.5, lineHeight: 20, color: B.text }} numberOfLines={2}>
              {clip.titel}
            </Text>
          ) : null}
        </>
      )}
    </Pressable>
  );
}

export type NutzerAnsichtProps = {
  id: string;
  profil: ErstellerProfil | null;
  clips: ClipEintrag[] | null;
  fehler: string | null;
  onFolgen: () => void;
  onNeuLaden: () => void;
  /** In die eigene Crew einladen – nur wenn möglich. */
  onEinladen?: () => void;
  eingeladen: boolean;
  /** Blockieren bzw. Blockierung aufheben (nicht beim eigenen Profil). */
  onBlockieren?: () => void;
  gesperrt?: boolean;
};

export function NutzerAnsichtWeb({ id, profil, clips, fehler, onFolgen, onNeuLaden, onEinladen, eingeladen, onBlockieren, gesperrt }: NutzerAnsichtProps) {
  const name = profil ? profil.name || profil.benutzername : "";

  return (
    <WebSeite ohneRechts>
      <Spalte>
        <Zurueck />
        {profil ? (
          <Kachel style={{ padding: 28, flexDirection: "row", alignItems: "center", gap: 26, flexWrap: "wrap" }}>
            <View style={{ padding: 4, borderRadius: 60, borderWidth: 2, borderColor: B.linie }}>
              {profil.ich ? <ProfilBild name={name} groesse={104} rand={0} /> : <NutzerBild pfad={profil.bild_pfad} name={name} farbe={profil.avatar_farbe} groesse={104} rand={0} />}
            </View>
            <View style={{ flex: 1, minWidth: 260, gap: 14 }}>
              <View>
                <Text style={{ ...n.schwarz, fontSize: 30, lineHeight: 36, color: B.text }} numberOfLines={1}>
                  {name}
                </Text>
                <Text style={{ ...n.halb, fontSize: 15.5, color: B.text2 }} numberOfLines={1}>
                  @{profil.benutzername}
                </Text>
              </View>
              <View style={{ flexDirection: "row", gap: 32, flexWrap: "wrap" }}>
                <Zahl wert={profil.clips} titel="Clips" />
                <Zahl wert={profil.follower} titel="Follower" />
                <Zahl wert={profil.folgt} titel="Folgt" />
                <Zahl wert={profil.likes} titel="Likes" />
              </View>
            </View>
            <View style={{ gap: 10, minWidth: 200 }}>
              {profil.ich ? (
                <Knopf titel="Profil bearbeiten" icon="create" art="rand" ton="blau" onPress={() => router.push("/einstellungen")} />
              ) : gesperrt ? null : profil.folge_ich ? (
                <Knopf titel="Folge ich" icon="checkmark" art="rand" ton="blau" onPress={onFolgen} />
              ) : (
                <Knopf titel="Folgen" icon="person-add" ton="blau" onPress={onFolgen} />
              )}
              {onEinladen ? <Knopf titel={eingeladen ? "Eingeladen" : "In Crew einladen"} icon={eingeladen ? "checkmark" : "people"} art="rand" ton="orange" deaktiviert={eingeladen} onPress={onEinladen} /> : null}
              {!profil.ich && onBlockieren ? <Knopf titel={gesperrt ? "Blockierung aufheben" : "Blockieren"} icon="ban" art="rand" ton="rot" groesse="klein" onPress={onBlockieren} /> : null}
            </View>
          </Kachel>
        ) : fehler ? null : (
          <View style={{ alignItems: "center", gap: 14, paddingVertical: 80 }}>
            <Lader color={B.text3} size={28} />
            <Text style={{ ...n.halb, fontSize: 15, color: B.text3 }}>Profil wird geladen …</Text>
          </View>
        )}

        {fehler ? (
          <Kachel>
            {fehler === FEHLT ? (
              <Leer icon="person" ton={TOENE.blau} titel="Profil nicht gefunden" text={fehler} />
            ) : (
              <Leer icon="cloud-offline" ton={TOENE.rot} titel="Profil nicht geladen" text={fehler}>
                <Knopf titel="Nochmal versuchen" icon="refresh" ton="blau" onPress={onNeuLaden} />
              </Leer>
            )}
          </Kachel>
        ) : profil ? (
          <View>
            <Abschnitt titel="Clips" link={clips?.length ? `${clips.length} ${clips.length === 1 ? "Clip" : "Clips"}` : undefined} />
            {clips === null ? (
              <View style={{ alignItems: "center", paddingVertical: 40 }}>
                <Lader color={B.text3} size={24} />
              </View>
            ) : clips.length ? (
              <Raster min={170} abstand={18}>
                {clips.map((c) => (
                  <ClipKachel key={c.id} clip={c} onPress={() => router.push({ pathname: "/clip-ansicht", params: { nutzer: id, start: c.id } })} />
                ))}
              </Raster>
            ) : gesperrt ? (
              <Kachel>
                <Leer icon="ban" ton={TOENE.rot} titel="Du hast diese Person blockiert" text="Ihre Clips, Kommentare und Chat-Nachrichten siehst du nicht mehr." />
              </Kachel>
            ) : (
              <Kachel>
                <Leer icon="film" ton={TOENE.pink} titel="Noch keine Clips" text={profil.ich ? "Deine Clips erscheinen hier, sobald du den ersten hochgeladen hast." : `${name} hat noch keine Clips veröffentlicht.`} />
              </Kachel>
            )}
          </View>
        ) : null}
      </Spalte>
    </WebSeite>
  );
}

/** Profil einer Person am PC – lädt Profil und Clips, Folgen und Crew-Einladung. */
export function NutzerWeb() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useKonto();
  const crew = useCrew();
  const [profil, setProfil] = useState<ErstellerProfil | null>(null);
  const [clips, setClips] = useState<ClipEintrag[] | null>(null);
  const [fehler, setFehler] = useState<string | null>(null);
  const [eingeladen, setEingeladen] = useState(false);
  const blockiert = useBlockiert();
  const gesperrt = Boolean(profil && blockiert.has(profil.id));

  const laden = useCallback(async () => {
    if (!id) return;
    try {
      const [p, c] = await Promise.all([erstellerProfilLaden(id), clipsVonLaden(id)]);
      setProfil(p);
      setClips(c);
      setFehler(p ? null : FEHLT);
    } catch (e) {
      setFehler((e as Error).message);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      laden();
    }, [laden]),
  );

  async function folgen() {
    if (!profil) return;
    if (!session) {
      anmeldenFragen("Folgen");
      return;
    }
    const an = !profil.folge_ich;
    setProfil({ ...profil, folge_ich: an, follower: Math.max(0, profil.follower + (an ? 1 : -1)) });
    try {
      await folgenSetzen(profil.id, an);
    } catch {
      setProfil((p) => (p ? { ...p, folge_ich: !an, follower: Math.max(0, p.follower + (an ? -1 : 1)) } : p));
    }
  }

  async function blockierenUmschalten() {
    if (!profil) return;
    if (!session) {
      anmeldenFragen("Blockieren");
      return;
    }
    if (gesperrt) {
      const problem = await entblocken(profil.id);
      if (problem) dialog("Nicht aufgehoben", problem);
      else laden();
    } else {
      blockierenFragen(profil.id, profil.name || profil.benutzername, () => setProfil((p) => (p ? { ...p, folge_ich: false } : p)));
    }
  }

  const kannEinladen = FRAGEN_AKTIV && !gesperrt && !!profil && !profil.ich && !!crew.daten?.crew && !crew.daten.mitglieder?.some((m) => m.id === profil.id) && (crew.daten.mitglieder?.length ?? 0) < CREW_MAX;

  async function einladen() {
    if (!profil) return;
    const f = await crew.einladen(profil.id);
    if (f) dialog("In Crew einladen", f);
    else {
      erfolg();
      setEingeladen(true);
    }
  }

  return (
    <NutzerAnsichtWeb
      id={id ?? ""}
      profil={profil}
      clips={gesperrt ? [] : clips}
      fehler={fehler}
      onFolgen={folgen}
      onNeuLaden={laden}
      onEinladen={kannEinladen ? einladen : undefined}
      eingeladen={eingeladen}
      onBlockieren={blockierenUmschalten}
      gesperrt={gesperrt}
    />
  );
}
