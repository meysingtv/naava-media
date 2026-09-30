import { useCallback, useState } from "react";
import { Pressable, RefreshControl, ScrollView, Share, Text, View } from "react-native";
import * as Clipboard from "expo-clipboard";
import { router, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { auswahlBlatt } from "@/components/auswahl-blatt";
import { CrewFlamme, EreignisZeile, QrCode } from "@/components/crew";
import { dialog } from "@/components/dialog";
import { Icon } from "@/components/icon";
import { NutzerBild } from "@/components/profilbild";
import { Kopfzeile } from "@/components/home";
import { FotoKopf, Seite } from "@/components/seite";
import { Balken, Eingabe, Gruppe, kartenFlaeche, Knopf, KopfTaste, Segment, T } from "@/components/ui";
import { CREW_MAX, crewLink, heuteGeschafft, useCrew, type CrewMitglied } from "@/lib/crew";
import { useDarstellung, useFarbwelt } from "@/lib/darstellung";
import { FOTOS } from "@/lib/fotos";
import { erfolg, tippen } from "@/lib/haptik";
import { useKonto } from "@/lib/konto";
import { abstand, RAND, schrift } from "@/lib/theme";

type Teilen = "link" | "qr" | "code";

function einladungsText(crewName: string, code: string) {
  return `Lern mit mir für den Führerschein! Komm in meine Crew „${crewName}“ bei Fahrschul Pro.\n\nCode: ${code}\n${crewLink(code)}`;
}

function MitgliedZeile({ m, onStupsen, gestupst }: { m: CrewMitglied; onStupsen: () => void; gestupst: boolean }) {
  const f = useFarbwelt();
  const gruen = f.hell ? "#23A548" : "#4ED053";
  const fertig = m.heute >= m.ziel;
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12, paddingHorizontal: 14 }}>
      <Pressable onPress={() => router.push({ pathname: "/nutzer/[id]", params: { id: m.id } })}>
        <NutzerBild pfad={m.bild} name={m.name} farbe={m.farbe} groesse={42} />
      </Pressable>
      <View style={{ flex: 1, gap: 6 }}>
        <View style={{ flexDirection: "row", alignItems: "baseline", gap: 6 }}>
          <Text style={{ ...schrift.textHalb, fontSize: 15.5, color: f.text }} numberOfLines={1}>
            {m.ich ? `${m.name} (du)` : m.name}
          </Text>
        </View>
        <Balken wert={Math.min(1, m.heute / Math.max(1, m.ziel))} farbe={fertig ? gruen : f.orange} hoehe={6} />
        <Text style={{ ...schrift.text, fontSize: 12, color: f.text3, fontVariant: ["tabular-nums"] }}>
          {Math.min(m.heute, 999)} / {m.ziel} Fragen heute
        </Text>
      </View>
      {fertig ? (
        <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: f.gruenSoft, alignItems: "center", justifyContent: "center" }}>
          <Icon name="checkmark" size={17} color={gruen} weight="bold" />
        </View>
      ) : m.ich ? null : (
        <Pressable
          onPress={() => {
            tippen();
            onStupsen();
          }}
          disabled={gestupst}
          style={{ flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 12, height: 32, borderRadius: 16, backgroundColor: gestupst ? (f.hell ? "#F1EDE6" : f.flaeche2) : f.orangeSoft }}
        >
          <Icon name="paper-plane" size={13} color={gestupst ? f.text3 : f.orange} />
          <Text style={{ ...schrift.textHalb, fontSize: 13, color: gestupst ? f.text3 : f.orange }}>{gestupst ? "Gestupst" : "Anstupsen"}</Text>
        </Pressable>
      )}
    </View>
  );
}

/** Noch keine Crew: gründen (oder zum Code wechseln). */
function Gruenden() {
  const f = useFarbwelt();
  const insets = useSafeAreaInsets();
  const { gruenden, moeglich } = useCrew();
  const { profil } = useKonto();
  const [name, setName] = useState(profil?.name ? `Crew von ${profil.name.split(" ")[0]}` : "");
  const [laeuft, setLaeuft] = useState(false);

  async function los() {
    setLaeuft(true);
    const f = await gruenden(name);
    setLaeuft(false);
    if (f) dialog("Crew gründen", f);
    else erfolg();
  }

  return (
    <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + abstand(8) }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
      <FotoKopf bild={FOTOS.tagesziel} hoehe={250} titel="Crew gründen" unter="Lernt zusammen. Besteht zusammen." />
      <View style={{ paddingHorizontal: RAND, marginTop: 8, gap: abstand(5) }}>
        <View style={[{ flexDirection: "row", alignItems: "center", gap: 14, padding: 16, borderRadius: 22 }, kartenFlaeche(f)]}>
          <Text style={{ fontSize: 40 }}>🔥</Text>
          <T v="text" style={{ flex: 1, fontSize: 14.5, lineHeight: 20 }}>
            Bis zu 6 Freunde, eine gemeinsame Flamme und jede Woche ein Boss, den ihr zusammen besiegt.
          </T>
        </View>
        <View style={{ gap: 8 }}>
          <T v="klein">Name der Crew</T>
          <Eingabe value={name} onChangeText={setName} placeholder="z. B. Die Raser" maxLength={30} icon="people" returnKeyType="done" />
        </View>
        <Knopf titel="Crew gründen" icon="arrow-forward" onPress={los} laedt={laeuft} deaktiviert={!moeglich} />
        <Pressable onPress={() => router.replace("/crew-beitreten")} hitSlop={8} style={{ alignSelf: "center" }}>
          <Text style={{ ...schrift.textHalb, fontSize: 15, color: f.orange }}>Ich habe schon einen Code</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

/** Meine Crew: Flamme, Mitglieder, Einladen (Link, QR-Code, Code) und was los war. */
export default function CrewSeite() {
  // Die Seite legt die Farbwelt erst fest – daher hier aus der Darstellung lesen
  const { farbwelt: f } = useDarstellung();
  const insets = useSafeAreaInsets();
  const { daten, laedt, neuLaden, verlassen, stupsen } = useCrew();
  const [teilen, setTeilen] = useState<Teilen>("qr");
  const [gestupst, setGestupst] = useState<Record<string, boolean>>({});

  useFocusEffect(
    useCallback(() => {
      neuLaden();
    }, [neuLaden]),
  );

  if (!daten?.crew || !daten.mitglieder)
    return (
      <Seite>
        <Gruenden />
      </Seite>
    );
  const crew = daten.crew;
  const mitglieder = daten.mitglieder;
  const voll = mitglieder.length >= CREW_MAX;

  async function anstupsen(m: CrewMitglied) {
    const f = await stupsen(m.id);
    if (f) dialog("Anstupsen", f);
    else {
      erfolg();
      setGestupst((g) => ({ ...g, [m.id]: true }));
    }
  }

  async function menue() {
    const wahl = await auswahlBlatt(crew.name, [{ text: "Einladung teilen" }, { text: "Crew verlassen", gefahr: true }]);
    if (wahl === 0) Share.share({ message: einladungsText(crew.name, crew.code) });
    if (wahl === 1) {
      dialog("Crew verlassen?", mitglieder.length > 1 ? "Die Flamme brennt für die anderen weiter. Du kannst später per Code zurückkommen." : "Du bist allein in der Crew – sie wird dann gelöscht.", [
        { text: "Bleiben", style: "cancel" },
        {
          text: "Verlassen",
          style: "destructive",
          onPress: async () => {
            const f = await verlassen();
            if (f) dialog("Crew verlassen", f);
            else router.back();
          },
        },
      ]);
    }
  }

  return (
    <Seite>
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + abstand(10) }}
        refreshControl={<RefreshControl refreshing={laedt} onRefresh={neuLaden} tintColor={f.orange} />}
        showsVerticalScrollIndicator={false}
      >
        <FotoKopf
          bild={FOTOS.tagesziel}
          hoehe={230}
          titel={crew.name}
          unter={`${mitglieder.length} von ${CREW_MAX} · Flamme seit ${crew.flamme} ${crew.flamme === 1 ? "Tag" : "Tagen"}`}
          rechts={<KopfTaste icon="ellipsis-horizontal" label="Mehr" onPress={menue} />}
        />
        <View style={{ paddingHorizontal: RAND, marginTop: 8 }}>
        <View style={[{ borderRadius: 26, paddingTop: 6, paddingBottom: 16 }, kartenFlaeche(f)]}>
          <CrewFlamme mitglieder={mitglieder} flamme={crew.flamme} heuteZaehlt={crew.flamme_heute} hoehe={250} />
          <View style={{ flexDirection: "row", paddingHorizontal: 10 }}>
            {[
              { w: String(crew.flamme), l: "Tage Flamme" },
              { w: String(crew.flamme_beste), l: "Rekord" },
              { w: `${heuteGeschafft(mitglieder)}/${mitglieder.length}`, l: "heute geschafft" },
            ].map((x) => (
              <View key={x.l} style={{ flex: 1, alignItems: "center", gap: 2 }}>
                <Text style={{ ...schrift.titel, fontSize: 21, color: f.text, fontVariant: ["tabular-nums"] }}>{x.w}</Text>
                <Text style={{ ...schrift.text, fontSize: 12.5, color: f.text3 }}>{x.l}</Text>
              </View>
            ))}
          </View>
        </View>
        </View>

        <Kopfzeile titel="Mitglieder" link={`${mitglieder.length}/${CREW_MAX}`} style={{ marginTop: 30 }} />
        <View style={{ paddingHorizontal: RAND }}>
          <Gruppe>
            {mitglieder.map((m) => (
              <MitgliedZeile key={m.id} m={m} gestupst={!!gestupst[m.id]} onStupsen={() => anstupsen(m)} />
            ))}
          </Gruppe>
          <T v="klein" style={{ marginTop: abstand(2) }}>
            Die Flamme wächst jeden Tag, an dem alle ihr Tagesziel schaffen.
          </T>
        </View>

        {!voll ? (
          <>
          <Kopfzeile titel="Freunde einladen" style={{ marginTop: 30 }} />
          <View style={{ paddingHorizontal: RAND, gap: abstand(3) }}>
            <Segment<Teilen>
              optionen={[
                { id: "link", titel: "Link" },
                { id: "qr", titel: "QR-Code" },
                { id: "code", titel: "Code" },
              ]}
              wert={teilen}
              onWechsel={setTeilen}
            />
            <View style={[{ alignItems: "center", gap: 12, padding: abstand(5), borderRadius: 24 }, kartenFlaeche(f)]}>
              {teilen === "qr" ? (
                <>
                  <QrCode wert={crewLink(crew.code)} groesse={184} />
                  <T v="klein" zentriert>
                    Mit der Handykamera scannen – die App öffnet sich direkt beim Beitreten.
                  </T>
                </>
              ) : teilen === "code" ? (
                <>
                  <Text selectable style={{ ...schrift.titel, fontSize: 36, letterSpacing: 3, color: f.text, fontVariant: ["tabular-nums"] }}>
                    {crew.code}
                  </Text>
                  <T v="klein" zentriert>
                    Freunde geben den Code unter Profil → Meine Crew → Code eingeben ein.
                  </T>
                  <Knopf
                    titel="Code kopieren"
                    icon="copy-outline"
                    art="sekundaer"
                    klein
                    onPress={async () => {
                      await Clipboard.setStringAsync(crew.code);
                      erfolg();
                    }}
                    style={{ alignSelf: "stretch" }}
                  />
                </>
              ) : (
                <>
                  <Icon name="link-outline" size={34} color={f.orange} />
                  <T v="klein" zentriert>
                    Schick den Link per WhatsApp, Instagram oder SMS – mit dem Code als Rückfall.
                  </T>
                </>
              )}
              <Knopf titel="Einladung teilen" icon="share-outline" klein onPress={() => Share.share({ message: einladungsText(crew.name, crew.code) })} style={{ alignSelf: "stretch" }} />
            </View>
          </View>
          </>
        ) : null}

        {daten.ereignisse && daten.ereignisse.length > 0 ? (
          <>
          <Kopfzeile titel="Was los war" style={{ marginTop: 30 }} />
          <View style={{ paddingHorizontal: RAND }}>
            <Gruppe>
              {daten.ereignisse.slice(0, 12).map((e) => (
                <EreignisZeile key={e.id} e={e} ich={daten.mitglieder?.find((m) => m.ich)?.id} />
              ))}
            </Gruppe>
          </View>
          </>
        ) : null}
      </ScrollView>
    </Seite>
  );
}
