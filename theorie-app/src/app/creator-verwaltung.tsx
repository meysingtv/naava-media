import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CheckCircleIcon } from "phosphor-react-native/src/icons/CheckCircle";
import { LockIcon } from "phosphor-react-native/src/icons/Lock";
import { TrayIcon } from "phosphor-react-native/src/icons/Tray";
import { UsersIcon } from "phosphor-react-native/src/icons/Users";
import { UserPlusIcon } from "phosphor-react-native/src/icons/UserPlus";

import { LeerZustand, LiveMarke, Mitte, PersonZeile, signal } from "@/components/creator-teile";
import { GlasGrund, GlasGruppe, GlasKarte } from "@/components/glas-flaeche";
import { Icon } from "@/components/icon";
import { Lader } from "@/components/lader";
import { GrossKopf, Seite } from "@/components/seite";
import { Knopf, Segment, T } from "@/components/ui";
import { useClipRechte, vorZeit } from "@/lib/clips-server";
import { useBewerbungen, type Bewerbung } from "@/lib/creator";
import { useFarbwelt } from "@/lib/darstellung";
import { tippen } from "@/lib/haptik";
import { abstand, mitDeckkraft, RAND, schrift } from "@/lib/theme";

// Nur für den Inhaber: alle Creator-Bewerbungen in Echtzeit. Oben die Lage auf
// einen Blick (neue Bewerbungen, wer gerade live ist), darunter nach Stand
// sortiert. Antippen öffnet die Bewerbung mit allen Angaben und Aktionen.

type Reiter = "offen" | "creator" | "erledigt";

function oeffnen(b: Bewerbung) {
  router.push({ pathname: "/creator-detail", params: { id: b.id } });
}

/** Oben: große Zahl der offenen Bewerbungen bzw. „Alles erledigt“. */
function Lage({ offen, creator, erledigt }: { offen: number; creator: number; erledigt: number }) {
  const f = useFarbwelt();
  const unter = [`${creator} Creator freigeschaltet`, erledigt ? `${erledigt} erledigt` : null].filter(Boolean).join(" · ");
  return (
    <GlasKarte style={{ borderRadius: 26, padding: 20, gap: 4 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
        {offen ? <UserPlusIcon size={17} color={f.orange} weight="fill" /> : <CheckCircleIcon size={17} color={signal(f).gruen} weight="fill" />}
        <Text style={{ ...schrift.textHalb, fontSize: 14.5, color: f.text2 }}>Bewerbungen</Text>
      </View>
      {offen ? (
        <View style={{ flexDirection: "row", alignItems: "baseline", gap: 8 }}>
          <Text style={{ ...schrift.titel, fontSize: 56, lineHeight: 64, letterSpacing: -1.2, color: f.text, fontVariant: ["tabular-nums"] }}>{offen}</Text>
          <Text style={{ ...schrift.textHalb, fontSize: 18, color: f.text2 }}>{offen === 1 ? "neue Bewerbung" : "neue Bewerbungen"}</Text>
        </View>
      ) : (
        <Text style={{ ...schrift.titel, fontSize: 30, lineHeight: 38, letterSpacing: -0.5, color: f.text, marginTop: 4 }}>Alles erledigt</Text>
      )}
      <Text style={{ ...schrift.text, fontSize: 14, color: f.text3 }}>{unter}</Text>
    </GlasKarte>
  );
}

/** Wer gerade live ist – rot getönt, Antippen öffnet die Person (dort: Live beenden). */
function GeradeLive({ personen }: { personen: Bewerbung[] }) {
  const f = useFarbwelt();
  const rot = signal(f).rot;
  return (
    <GlasKarte toenung={mitDeckkraft(rot, f.hell ? 0.12 : 0.2)} style={{ borderRadius: 22 }}>
      {personen.map((b, i) => (
        <Pressable
          key={b.id}
          onPress={() => {
            tippen();
            oeffnen(b);
          }}
          accessibilityRole="button"
          accessibilityLabel={`${b.name || b.benutzername} ist gerade live`}
          style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 14, paddingHorizontal: 16, opacity: pressed ? 0.7 : 1, borderTopWidth: i ? 0.5 : 0, borderTopColor: mitDeckkraft(rot, 0.3) })}
        >
          <LiveMarke />
          <Text style={{ ...schrift.textHalb, fontSize: 15.5, color: f.text, flex: 1 }} numberOfLines={1}>
            {b.name || b.benutzername || "Unbekannt"} ist gerade live
          </Text>
          <Text style={{ ...schrift.textHalb, fontSize: 13.5, color: rot }}>Ansehen</Text>
          <Icon name="chevron-forward" size={15} color={rot} />
        </Pressable>
      ))}
    </GlasKarte>
  );
}

function Inhalt() {
  const f = useFarbwelt();
  const insets = useSafeAreaInsets();
  const rechte = useClipRechte();
  const { liste, fehler, neuLaden } = useBewerbungen(rechte.inhaber);
  const [reiter, setReiter] = useState<Reiter | null>(null);
  const inhalt = { paddingHorizontal: RAND, paddingTop: abstand(4), paddingBottom: insets.bottom + abstand(10) };

  if (!rechte.inhaber) {
    return (
      <>
        <GrossKopf titel="Creator" />
        <ScrollView contentContainerStyle={inhalt}>
          <Mitte>
            <LeerZustand symbol={LockIcon} titel="Nur für den Inhaber" text="Nur für den Inhaber der App." />
          </Mitte>
        </ScrollView>
      </>
    );
  }

  const alle = liste ?? [];
  const offen = alle.filter((b) => b.status === "offen");
  const creator = alle.filter((b) => b.status === "angenommen");
  const archiv = alle.filter((b) => b.status !== "offen" && b.status !== "angenommen");
  const live = alle.filter((b) => b.live_id);
  // Ohne eigene Wahl: offene zuerst, sonst die Creator.
  const aktiv: Reiter = reiter ?? (offen.length || !creator.length ? "offen" : "creator");
  const eintraege = aktiv === "offen" ? offen : aktiv === "creator" ? creator : archiv;
  const zahl = (n: number) => (n ? ` ${n}` : "");

  return (
    <>
      <GrossKopf titel="Creator" unter="Bewerbungen und Freischaltungen" />
      <ScrollView contentContainerStyle={inhalt} showsVerticalScrollIndicator={false}>
        <Mitte style={{ gap: abstand(4) }}>
          {liste == null ? (
            fehler ? (
              <GlasKarte style={{ padding: 18, gap: abstand(3) }}>
                <T v="klein" farbe={signal(f).rot}>
                  {fehler}
                </T>
                <Knopf titel="Nochmal laden" klein art="sekundaer" onPress={neuLaden} />
              </GlasKarte>
            ) : (
              <Lader color={f.text3} style={{ alignSelf: "center", marginTop: 30 }} />
            )
          ) : (
            <>
              <Lage offen={offen.length} creator={creator.length} erledigt={archiv.length} />
              {live.length ? <GeradeLive personen={live} /> : null}

              <Segment<Reiter>
                wert={aktiv}
                onWechsel={setReiter}
                optionen={[
                  { id: "offen", titel: `Offen${zahl(offen.length)}` },
                  { id: "creator", titel: `Creator${zahl(creator.length)}` },
                  { id: "erledigt", titel: `Erledigt${zahl(archiv.length)}` },
                ]}
                style={{ marginTop: abstand(2) }}
              />

              {alle.length === 0 ? (
                <LeerZustand symbol={TrayIcon} titel="Noch keine Bewerbungen." text="Neue Bewerbungen erscheinen hier sofort." />
              ) : eintraege.length === 0 ? (
                <LeerZustand
                  symbol={aktiv === "offen" ? CheckCircleIcon : aktiv === "creator" ? UsersIcon : TrayIcon}
                  titel={aktiv === "offen" ? "Keine offenen Bewerbungen" : aktiv === "creator" ? "Noch keine Creator" : "Noch nichts erledigt"}
                  text={aktiv === "offen" ? "Neue Bewerbungen erscheinen hier sofort." : aktiv === "creator" ? "Nimm eine Bewerbung an – dann steht die Person hier." : undefined}
                />
              ) : (
                <GlasGruppe>
                  {eintraege.map((b) => (
                    <PersonZeile
                      key={b.id}
                      name={b.name || b.benutzername || "Unbekannt"}
                      unter={[`${b.alter_jahre} Jahre`, b.beruf, b.ort].filter(Boolean).join(" · ")}
                      rechts={aktiv === "offen" ? vorZeit(b.erstellt_am) : ""}
                      rechtsRot={!!b.live_id}
                      status={aktiv === "erledigt" ? b.status : undefined}
                      bild={b.bild_pfad}
                      benutzername={b.benutzername}
                      farbe={b.avatar_farbe}
                      onPress={() => oeffnen(b)}
                    />
                  ))}
                </GlasGruppe>
              )}

              <T v="klein" style={{ marginTop: abstand(1) }}>
                Angenommene Creator dürfen live gehen und Clips hochladen. Änderungen gelten sofort.
              </T>
            </>
          )}
        </Mitte>
      </ScrollView>
    </>
  );
}

export default function CreatorVerwaltung() {
  return (
    <Seite>
      <GlasGrund />
      <Inhalt />
    </Seite>
  );
}
