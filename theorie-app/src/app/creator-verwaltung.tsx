import { useState } from "react";
import { KeyboardAvoidingView, Linking, Platform, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { dialog } from "@/components/dialog";
import { Icon, type IconName } from "@/components/icon";
import { Lader } from "@/components/lader";
import { NutzerBild } from "@/components/profilbild";
import { GrossKopf, Seite } from "@/components/seite";
import { Chip, Eingabe, kartenFlaeche, Knopf, T } from "@/components/ui";
import { useClipRechte, vorZeit } from "@/lib/clips-server";
import { creatorEntscheiden, creatorEntziehen, STATUS_TEXT, useBewerbungen, type Bewerbung, type CreatorStatus } from "@/lib/creator";
import { useFarbwelt } from "@/lib/darstellung";
import { erfolg, tippen } from "@/lib/haptik";
import { liveSofortBeenden } from "@/lib/live";
import { abstand, farben, mitDeckkraft, RAND, schrift } from "@/lib/theme";

// Nur für den Inhaber: alle Creator-Bewerbungen in Echtzeit. Annehmen, ablehnen,
// laufende Lives sofort beenden und Zugänge jederzeit entziehen.

type Filter = "offen" | "creator" | "archiv";

function gehoertZu(b: Bewerbung, filter: Filter): boolean {
  if (filter === "offen") return b.status === "offen";
  if (filter === "creator") return b.status === "angenommen";
  return b.status !== "offen" && b.status !== "angenommen";
}

function oeffnen(url: string) {
  Linking.openURL(url).catch(() => dialog("Geht hier nicht", "Auf diesem Gerät lässt sich das nicht öffnen."));
}

function useStatusFarbe(): (s: CreatorStatus) => string {
  const f = useFarbwelt();
  const gruen = f.hell ? "#23A548" : "#4ED053";
  const rot = f.hell ? "#E5392C" : farben.rot;
  return (s) => ({ offen: f.orange, angenommen: gruen, abgelehnt: rot, entzogen: rot, zurueckgezogen: f.text3 })[s];
}

function Pille({ text, farbe, voll }: { text: string; farbe: string; voll?: boolean }) {
  return (
    <View style={{ paddingHorizontal: 9, height: 22, borderRadius: 11, justifyContent: "center", backgroundColor: voll ? farbe : mitDeckkraft(farbe, 0.14) }}>
      <Text style={{ ...schrift.textFett, fontSize: 11, letterSpacing: 0.3, color: voll ? "#FFFFFF" : farbe }}>{text}</Text>
    </View>
  );
}

/** Eine Angabe mit Symbol; antippbar für Telefon und E-Mail. */
function Angabe({ icon, text, onPress }: { icon: IconName; text: string; onPress?: () => void }) {
  const f = useFarbwelt();
  const inhalt = (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 9, minHeight: 26 }}>
      <Icon name={icon} size={16} color={onPress ? f.orange : f.text3} />
      <Text selectable style={{ ...schrift.textMittel, fontSize: 15, color: onPress ? f.orange : f.text, flex: 1 }}>
        {text}
      </Text>
    </View>
  );
  return onPress ? (
    <Pressable onPress={onPress} hitSlop={6}>
      {inhalt}
    </Pressable>
  ) : (
    inhalt
  );
}

function Absatz({ titel, text }: { titel: string; text: string }) {
  const f = useFarbwelt();
  if (!text.trim()) return null;
  return (
    <View style={{ gap: 3 }}>
      <Text style={{ ...schrift.textHalb, fontSize: 12, letterSpacing: 0.4, color: f.text3, textTransform: "uppercase" }}>{titel}</Text>
      <Text selectable style={{ ...schrift.text, fontSize: 15, lineHeight: 21, color: f.text }}>
        {text}
      </Text>
    </View>
  );
}

function Karte({ b }: { b: Bewerbung }) {
  const f = useFarbwelt();
  const statusFarbe = useStatusFarbe();
  const rot = f.hell ? "#E5392C" : farben.rot;
  const [auf, setAuf] = useState(b.status === "offen");
  const [notiz, setNotiz] = useState("");
  const [laeuft, setLaeuft] = useState<string | null>(null);
  const name = b.name || b.benutzername || "Unbekannt";

  async function ausfuehren(schritt: string, tun: () => Promise<void>, fertig?: string) {
    if (laeuft) return;
    setLaeuft(schritt);
    try {
      await tun();
      erfolg();
      setNotiz("");
      if (fertig) dialog(fertig);
    } catch (e) {
      dialog("Hat nicht geklappt", (e as Error).message);
    } finally {
      setLaeuft(null);
    }
  }

  const annehmen = () => ausfuehren("annehmen", () => creatorEntscheiden(b.id, true, notiz), `${name} kann jetzt live gehen.`);

  function ablehnen() {
    dialog(`Bewerbung von ${name} ablehnen?`, notiz.trim() ? `Deine Nachricht: „${notiz.trim()}“` : "Die Person bekommt eine Mitteilung.", [
      { text: "Abbrechen", style: "cancel" },
      { text: "Ablehnen", style: "destructive", onPress: () => ausfuehren("ablehnen", () => creatorEntscheiden(b.id, false, notiz)) },
    ]);
  }

  function liveBeenden() {
    if (!b.live_id) return;
    const live = b.live_id;
    dialog(`Live von ${name} beenden?`, "Das Live endet sofort – für alle Zuschauer und für den Creator.", [
      { text: "Abbrechen", style: "cancel" },
      {
        text: "Live beenden",
        style: "destructive",
        onPress: () =>
          ausfuehren(
            "beenden",
            async () => {
              const problem = await liveSofortBeenden({ live });
              if (problem) throw new Error(problem);
            },
            "Live beendet.",
          ),
      },
    ]);
  }

  function entziehen() {
    dialog(
      `Zugang von ${name} entziehen?`,
      `${b.live_id ? "Das laufende Live endet sofort. " : ""}Die Person kann danach nicht mehr live gehen, bis du sie wieder freischaltest.`,
      [
        { text: "Abbrechen", style: "cancel" },
        { text: "Entziehen", style: "destructive", onPress: () => ausfuehren("entziehen", () => creatorEntziehen(b.user_id, notiz), "Zugang entzogen.") },
      ],
    );
  }

  return (
    <View style={[{ borderRadius: 22, overflow: "hidden" }, kartenFlaeche(f)]}>
      <Pressable
        onPress={() => {
          tippen();
          setAuf((a) => !a);
        }}
        accessibilityRole="button"
        accessibilityState={{ expanded: auf }}
        style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 14 }}
      >
        <NutzerBild pfad={b.bild_pfad} name={b.benutzername ?? name} farbe={b.avatar_farbe ?? undefined} groesse={44} rand={1} />
        <View style={{ flex: 1, gap: 2 }}>
          <Text numberOfLines={1} style={{ ...schrift.textFett, fontSize: 16, color: f.text }}>
            {name}
          </Text>
          <Text numberOfLines={1} style={{ ...schrift.text, fontSize: 13, color: f.text2 }}>
            {[b.benutzername ? `@${b.benutzername}` : null, `${b.alter_jahre} J.`, b.beruf].filter(Boolean).join(" · ")}
          </Text>
        </View>
        <View style={{ alignItems: "flex-end", gap: 5 }}>
          {b.live_id ? <Pille text="● LIVE" farbe={rot} voll /> : <Pille text={STATUS_TEXT[b.status]} farbe={statusFarbe(b.status)} />}
          <Text style={{ ...schrift.text, fontSize: 11, color: f.text3 }}>{vorZeit(b.erstellt_am)}</Text>
        </View>
      </Pressable>

      {auf ? (
        <View style={{ paddingHorizontal: 14, paddingBottom: 14, gap: 12 }}>
          <View style={{ height: 1, backgroundColor: f.hell ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.08)" }} />
          <View style={{ gap: 4 }}>
            <Angabe icon="call-outline" text={b.telefon} onPress={() => oeffnen(`tel:${b.telefon.replace(/[^\d+]/g, "")}`)} />
            {b.email ? <Angabe icon="mail-outline" text={b.email} onPress={() => oeffnen(`mailto:${b.email}`)} /> : null}
            <Angabe icon="person-outline" text={`${b.alter_jahre} Jahre · ${b.beruf}`} />
            {b.ort ? <Angabe icon="location-outline" text={b.ort} /> : null}
            {b.social ? <Angabe icon="at" text={b.social} /> : null}
          </View>
          <Absatz titel="Worüber live" text={b.themen} />
          <Absatz titel="Erfahrung" text={b.erfahrung} />
          {b.notiz ? <Absatz titel="Deine Nachricht" text={b.notiz} /> : null}
          {b.entschieden_am ? (
            <Text style={{ ...schrift.text, fontSize: 12, color: f.text3 }}>
              {STATUS_TEXT[b.status]} {vorZeit(b.entschieden_am)}
            </Text>
          ) : null}

          {b.status !== "zurueckgezogen" ? (
            <Eingabe icon="chatbubble-outline" value={notiz} onChangeText={setNotiz} placeholder="Nachricht an die Person (optional)" maxLength={500} />
          ) : null}

          {b.status === "offen" ? (
            <View style={{ flexDirection: "row", gap: 10 }}>
              <Knopf titel="Ablehnen" art="gefahr" klein laedt={laeuft === "ablehnen"} onPress={ablehnen} style={{ flex: 1 }} />
              <Knopf titel="Annehmen" icon="checkmark" klein laedt={laeuft === "annehmen"} onPress={annehmen} style={{ flex: 1 }} />
            </View>
          ) : null}
          {b.status === "angenommen" ? (
            <View style={{ gap: 10 }}>
              {b.live_id ? <Knopf titel="Live sofort beenden" icon="stop-circle" art="gefahr" klein laedt={laeuft === "beenden"} onPress={liveBeenden} /> : null}
              <Knopf titel="Zugang entziehen" icon="lock-closed" art="gefahr" klein laedt={laeuft === "entziehen"} onPress={entziehen} />
            </View>
          ) : null}
          {b.status === "abgelehnt" || b.status === "entzogen" ? (
            <Knopf titel="Doch freischalten" icon="checkmark" art="sekundaer" klein laedt={laeuft === "annehmen"} onPress={annehmen} />
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

function Inhalt() {
  const f = useFarbwelt();
  const insets = useSafeAreaInsets();
  const rechte = useClipRechte();
  const { liste, fehler, neuLaden } = useBewerbungen(rechte.inhaber);
  const [filter, setFilter] = useState<Filter>("offen");

  if (!rechte.inhaber) {
    return (
      <View style={{ flex: 1 }}>
        <GrossKopf titel="Live-Creator" />
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: RAND * 2, gap: abstand(3) }}>
          <Icon name="lock-closed" size={34} color={f.text3} />
          <T v="h2" zentriert>
            Nur für den Inhaber
          </T>
        </View>
      </View>
    );
  }

  const anzahl = (x: Filter) => (liste ?? []).filter((b) => gehoertZu(b, x)).length;
  const sichtbar = (liste ?? []).filter((b) => gehoertZu(b, filter));
  const live = (liste ?? []).filter((b) => b.live_id && b.status === "angenommen");
  const leer = { offen: "Keine offenen Bewerbungen.", creator: "Noch niemand freigeschaltet.", archiv: "Noch nichts im Archiv." }[filter];

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: RAND, paddingBottom: insets.bottom + abstand(10), gap: abstand(4) }} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
        <GrossKopf titel="Live-Creator" unter="Wer angenommen ist, darf live gehen. Änderungen wirken sofort." />

        {live.length ? (
          <View style={{ borderRadius: 18, padding: 14, gap: 4, backgroundColor: mitDeckkraft(farben.rot, f.hell ? 0.1 : 0.16) }}>
            <Text style={{ ...schrift.textFett, fontSize: 15, color: f.hell ? "#C42B20" : "#FF8A80" }}>
              ● {live.map((b) => b.name || b.benutzername).join(", ")} {live.length === 1 ? "ist" : "sind"} gerade live
            </Text>
            <Text style={{ ...schrift.text, fontSize: 13, color: f.text2 }}>Unter „Creator“ kannst du das Live sofort beenden.</Text>
          </View>
        ) : null}

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          <Chip text={`Offen ${anzahl("offen")}`} aktiv={filter === "offen"} onPress={() => setFilter("offen")} />
          <Chip text={`Creator ${anzahl("creator")}`} aktiv={filter === "creator"} onPress={() => setFilter("creator")} />
          <Chip text={`Archiv ${anzahl("archiv")}`} aktiv={filter === "archiv"} onPress={() => setFilter("archiv")} />
        </ScrollView>

        {liste == null ? (
          fehler ? (
            <View style={{ gap: abstand(3) }}>
              <T v="klein" farbe={farben.rot}>
                {fehler}
              </T>
              <Knopf titel="Nochmal laden" klein art="sekundaer" onPress={neuLaden} />
            </View>
          ) : (
            <Lader color={f.text3} style={{ alignSelf: "center", marginTop: 30 }} />
          )
        ) : sichtbar.length === 0 ? (
          <T v="klein" zentriert style={{ marginTop: 20 }}>
            {leer}
          </T>
        ) : (
          sichtbar.map((b) => <Karte key={`${b.id}-${b.status}`} b={b} />)
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

export default function CreatorVerwaltung() {
  return (
    <Seite>
      <Inhalt />
    </Seite>
  );
}
