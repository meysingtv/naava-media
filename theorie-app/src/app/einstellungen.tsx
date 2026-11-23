import { useRef, useState } from "react";
import { Image, Linking, Platform, Pressable, ScrollView, Text, TextInput, View, type StyleProp, type ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { GrossKopf, Seite } from "@/components/seite";
import { Abschnitt, Chip, Eingabe, Knopf, Segment, T, Zeile } from "@/components/ui";
import { Logo } from "@/components/grafik";
import { GlasGrund, GlasGruppe, GlasKarte } from "@/components/glas-flaeche";
import { Icon, type IconName } from "@/components/icon";
import { LilaLeisteSeite } from "@/components/lila-leiste";
import { LilaAbschnitt, LilaBlatt, LilaChip, LilaGruppe, LilaKarte, LilaKnopf, LILA_RAND, LilaSchalter, LilaTitel, LilaZeile, LilaZurueck, lilaSchrift, useLila } from "@/components/lila-teile";
import { FIGUR } from "@/components/start-teile";
import { ProfilBild } from "@/components/profilbild";
import { Schalter } from "@/components/schalter";
import { tourStarten } from "@/components/tour";
import { BUNDESLAENDER } from "@/lib/bundeslaender";
import { useFarbwelt } from "@/lib/darstellung";
import { useDesktop, useFenster } from "@/lib/fenster";
import { EinstellungenWeb } from "@/components/web/einstellungen-web";
import { useEinstellungen, ZEITEN, ZIEL_STUFE, ZIELE } from "@/lib/einstellungen-aktionen";
import { KLASSEN } from "@/lib/klassen";
import { kostenSichtbarSetzen, useKosten } from "@/lib/kosten";
import { tippen } from "@/lib/haptik";
import { STATUS_TEXT } from "@/lib/creator";
import { FRAGEN_AKTIV } from "@/lib/funktionen";
import { uhrzeit } from "@/lib/format";
import { abstand, farben, leuchten, RAND, schrift, verlauf } from "@/lib/theme";

const SUPPORT = process.env.EXPO_PUBLIC_SUPPORT_EMAIL;

export default function Einstellungen() {
  // Im Browser am PC eine eigene Fassung (web/einstellungen-web.tsx) – mit denselben Aktionen.
  return useDesktop() ? <EinstellungenWeb /> : <EinstellungenHandy />;
}

type Blatt = "profil" | "klasse" | "land" | "zeit" | null;

/** Eingabefeld im lila Stil. */
function LilaFeld(props: React.ComponentProps<typeof TextInput> & { fehler?: boolean }) {
  const l = useLila();
  const { fehler, style, ...rest } = props;
  return (
    <TextInput
      placeholderTextColor={l.tinte3}
      selectionColor="#8A5FFF"
      {...rest}
      style={[{ height: 54, borderRadius: 16, paddingHorizontal: 16, backgroundColor: l.karte, borderWidth: 1.5, borderBottomWidth: 4, borderColor: fehler ? "#E5484D" : l.linie, borderBottomColor: fehler ? "#E5484D" : l.kante, ...lilaSchrift.textHalb, fontSize: 16, color: l.tinte }, style]}
    />
  );
}

function EinstellungenHandy() {
  const insets = useSafeAreaInsets();
  const l = useLila();
  const e = useEinstellungen();
  const { stand, rechte, offeneBewerbungen, meineBewerbung, iconTitel, name, speichert, nameSpeichern, benutzer, benutzerGueltig, benutzerGeaendert, frei, speichertBenutzer, benutzerSpeichern } = e;
  const { liveAbo, liveAboAendern, erinnerungAendern, klasseAendern, zuruecksetzenFragen } = e;
  const { blockiert, aufnahmeErlaubt, aufnahmeSetzen, loeschtKonto, kontoLoeschenFragen } = e;
  const { session, profil, gast, anzeigeName } = e.konto;
  const { belohnungen, belohnungenSetzen } = e.darstellung;
  const [blatt, setBlatt] = useState<Blatt>(null);
  const kosten = useKosten();
  const klasse = KLASSEN.find((k) => k.id === stand.klasse);
  const zu = () => setBlatt(null);

  return (
    <View style={{ flex: 1, backgroundColor: l.grund }}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: 28, paddingHorizontal: LILA_RAND, width: "100%", maxWidth: 560, alignSelf: "center", gap: 22 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View>
          <LilaZurueck />
          <LilaTitel style={{ marginTop: 14 }}>Einstellungen</LilaTitel>
        </View>

        <View>
          <LilaAbschnitt titel="Profil" />
          <LilaGruppe>
            <LilaZeile icon="person-outline" titel={anzeigeName || "Dein Name"} unter={profil ? `@${profil.benutzername}${profil.rolle === "fahrlehrer" ? " · Fahrlehrer" : ""}` : gast ? "Gastmodus" : undefined} onPress={() => setBlatt("profil")} />
            <LilaZeile icon="id-card-outline" titel="Führerscheinklasse" unter={`Klasse ${stand.klasse}${klasse ? ` · ${klasse.text}` : ""}`} onPress={() => setBlatt("klasse")} />
            {session ? <LilaZeile icon="location-outline" titel="Bundesland" unter={profil?.bundesland ?? "Noch nicht gewählt"} onPress={() => setBlatt("land")} /> : null}
          </LilaGruppe>
        </View>

        <View>
          <LilaAbschnitt titel="Konto" />
          {session ? (
            <LilaGruppe>
              <LilaZeile icon="mail-outline" titel={session.user.email ?? ""} unter="E-Mail · Anmelden mit Code" />
              <LilaZeile icon="ban-outline" titel="Blockierte Personen" unter={blockiert.size ? `${blockiert.size} ${blockiert.size === 1 ? "Person" : "Personen"}` : "Niemand blockiert"} onPress={() => router.push("/blockiert")} />
              <LilaZeile icon="trash-outline" titel={loeschtKonto ? "Konto wird gelöscht …" : "Konto löschen"} unter="Konto und alle Daten endgültig entfernen" gefahr ohnePfeil onPress={loeschtKonto ? undefined : kontoLoeschenFragen} />
            </LilaGruppe>
          ) : (
            <LilaGruppe>
              <LilaZeile icon="person-add-outline" titel="Konto erstellen" unter="Schaltet Likes, Kommentare und dein Profilbild frei" onPress={() => router.push("/start")} />
              <LilaZeile icon="log-in-outline" titel="Ich habe schon ein Konto" onPress={() => router.push({ pathname: "/start", params: { modus: "anmelden" } })} />
            </LilaGruppe>
          )}
        </View>

        <View>
          <LilaAbschnitt titel="App" />
          <LilaGruppe>
            <LilaZeile
              icon="notifications-outline"
              titel="Mitteilungen"
              unter={stand.erinnerung.an ? `Tägliche Erinnerung um ${uhrzeit(stand.erinnerung.stunde, stand.erinnerung.minute)} Uhr` : "Tägliche Erinnerung aus"}
              rechts={<LilaSchalter wert={stand.erinnerung.an} onWechsel={(an) => erinnerungAendern(an)} />}
            />
            {stand.erinnerung.an ? <LilaZeile icon="time-outline" titel="Uhrzeit der Erinnerung" unter={`${uhrzeit(stand.erinnerung.stunde, stand.erinnerung.minute)} Uhr`} onPress={() => setBlatt("zeit")} /> : null}
            {session ? <LilaZeile icon="radio-outline" titel="Live-Streams" unter={liveAbo ? "Mitteilung, sobald ein Live startet" : "Aus"} rechts={<LilaSchalter wert={liveAbo} onWechsel={liveAboAendern} />} /> : null}
            <LilaZeile icon="color-palette-outline" titel="App-Icon" unter={iconTitel} onPress={() => router.push("/app-icon")} />
            <LilaZeile
              icon="wallet-outline"
              titel="Kostenplaner"
              unter={kosten.sichtbar ? "Auf Home und im Profil sichtbar" : "Ausgeblendet – deine Zahlen bleiben gespeichert"}
              rechts={<LilaSchalter wert={kosten.sichtbar} onWechsel={kostenSichtbarSetzen} />}
            />
            {FRAGEN_AKTIV ? <LilaZeile icon="flash-outline" titel="XP, HP & Abzeichen" unter={belohnungen ? "Beim Lernen sichtbar" : "Aus"} rechts={<LilaSchalter wert={belohnungen} onWechsel={belohnungenSetzen} />} /> : null}
            <LilaZeile
              icon="sparkles-outline"
              titel="App-Tour ansehen"
              onPress={() => {
                router.navigate("/heute");
                setTimeout(tourStarten, 450);
              }}
            />
            <LilaZeile icon="options-outline" titel="Einrichtung wiederholen" unter="Klasse, Prüfungstermin, Erinnerung" onPress={() => router.push("/einrichtung")} />
          </LilaGruppe>
        </View>

        {rechte.ersteller || session ? (
          <View>
            <LilaAbschnitt titel="Clips & Creator" />
            <LilaGruppe>
              {rechte.ersteller ? <LilaZeile icon="film-outline" titel="Clip hochladen" unter="Kurzes Video für alle im Clips-Tab" onPress={() => router.push("/clip-hochladen")} /> : null}
              {rechte.inhaber ? <LilaZeile icon="people-outline" titel="Clip-Ersteller verwalten" unter="Wer außer dir Videos hochladen darf" onPress={() => router.push("/clip-ersteller")} /> : null}
              {session && rechte.inhaber ? (
                <LilaZeile icon="radio-outline" titel="Creator-Bewerbungen" unter={offeneBewerbungen ? `${offeneBewerbungen} offen` : "Wer live gehen und Clips hochladen darf"} onPress={() => router.push("/creator-verwaltung")} />
              ) : session ? (
                <LilaZeile
                  icon="radio-outline"
                  titel={meineBewerbung?.status === "angenommen" ? "Creator" : "Creator werden"}
                  unter={meineBewerbung && meineBewerbung.status !== "zurueckgezogen" ? STATUS_TEXT[meineBewerbung.status] : "Live gehen und Clips hochladen"}
                  onPress={() => router.push("/creator-bewerbung")}
                />
              ) : null}
            </LilaGruppe>
          </View>
        ) : null}

        {rechte.inhaber ? (
          <View>
            <LilaAbschnitt titel="Inhaber" />
            <LilaGruppe>
              {FRAGEN_AKTIV ? <LilaZeile icon="play-circle-outline" titel="Erklärvideos" unter="Videos zu einzelnen Fragen" onPress={() => router.push("/erklaervideos")} /> : null}
              {Platform.OS === "web" ? <LilaZeile icon="grid-outline" titel="Manager" unter="Zugänge, Themen und Videos" onPress={() => router.push("/manager")} /> : null}
              {Platform.OS !== "web" ? (
                <LilaZeile icon="videocam-outline" titel="Bildschirmaufnahmen erlauben" unter={aufnahmeErlaubt ? "Nur für dich an" : "Aus – gesperrt wie für alle"} rechts={<LilaSchalter wert={aufnahmeErlaubt} onWechsel={aufnahmeSetzen} />} />
              ) : null}
            </LilaGruppe>
          </View>
        ) : null}

        <View>
          <LilaAbschnitt titel="Hilfe & Rechtliches" />
          <LilaGruppe>
            {SUPPORT ? <LilaZeile icon="help-buoy-outline" titel="Hilfe & Kontakt" onPress={() => Linking.openURL(`mailto:${SUPPORT}`)} /> : null}
            <LilaZeile icon="shield-checkmark-outline" titel="Datenschutz" onPress={() => router.push("/datenschutz")} />
            <LilaZeile icon="document-text-outline" titel="Nutzungsbedingungen" onPress={() => router.push("/nutzungsbedingungen")} />
            <LilaZeile icon="information-circle-outline" titel="Impressum" onPress={() => router.push("/impressum")} />
            <LilaZeile icon="images-outline" titel="Bildnachweise" onPress={() => router.push("/bildnachweise")} />
          </LilaGruppe>
        </View>

        <View>
          <LilaAbschnitt titel="Daten" />
          <LilaGruppe>
            <LilaZeile icon="refresh-outline" titel="Fortschritt zurücksetzen" unter="Gespeicherter Fortschritt auf diesem Gerät" gefahr ohnePfeil onPress={zuruecksetzenFragen} />
          </LilaGruppe>
        </View>

        <View style={{ alignItems: "center", gap: 6, marginTop: 4 }}>
          <Image source={FIGUR.kopf} style={{ width: 54, height: 54 }} resizeMode="contain" />
          <Text style={{ ...lilaSchrift.fett, fontSize: 17, color: l.tinte }}>Fahrschul Pro</Text>
          <Text style={{ ...lilaSchrift.text, fontSize: 13, color: l.tinte3 }}>Version 1.0</Text>
        </View>
      </ScrollView>
      <LilaLeisteSeite aktiv="profil" />

      {/* Profil bearbeiten */}
      <LilaBlatt offen={blatt === "profil"} titel="Profil" onSchliessen={zu}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 10 }}>
          {profil ? (
            <>
              <Text style={{ ...lilaSchrift.textHalb, fontSize: 14, color: l.tinte2 }}>Ich bin</Text>
              <View style={{ flexDirection: "row", gap: 8 }}>
                <LilaChip text="Fahrschüler" aktiv={profil.rolle === "schueler"} onPress={() => e.rolleWaehlen("schueler")} />
                <LilaChip text="Fahrlehrer" aktiv={profil.rolle === "fahrlehrer"} onPress={() => e.rolleWaehlen("fahrlehrer")} />
              </View>
            </>
          ) : null}
          <Text style={{ ...lilaSchrift.textHalb, fontSize: 14, color: l.tinte2, marginTop: 6 }}>Name – so begrüßt dich die App</Text>
          <LilaFeld value={name} onChangeText={e.nameTippen} placeholder="Dein Name" autoCapitalize="words" maxLength={40} />
          {name.trim() && name.trim() !== anzeigeName ? <LilaKnopf titel={speichert ? "Speichert …" : "Namen speichern"} onPress={nameSpeichern} /> : null}
          {profil ? (
            <>
              <Text style={{ ...lilaSchrift.textHalb, fontSize: 14, color: l.tinte2, marginTop: 6 }}>Benutzername – für Clips und Kommentare</Text>
              <LilaFeld value={benutzer} onChangeText={e.benutzerTippen} placeholder="benutzername" autoCapitalize="none" autoCorrect={false} fehler={benutzerGeaendert && (!benutzerGueltig || frei === false)} />
              {benutzerGeaendert ? (
                <Text style={{ ...lilaSchrift.textMittel, fontSize: 13, color: !benutzerGueltig || frei === false ? "#E5484D" : frei ? "#23A548" : l.tinte3 }}>
                  {!benutzerGueltig ? "3–20 Zeichen: Buchstaben, Zahlen, Punkt und Unterstrich." : frei === false ? "Dieser Benutzername ist schon vergeben." : frei ? "Der Benutzername ist frei." : "Prüfe, ob der Name frei ist …"}
                </Text>
              ) : null}
              {benutzerGeaendert && benutzerGueltig && frei === true ? <LilaKnopf titel={speichertBenutzer ? "Speichert …" : "Benutzernamen speichern"} onPress={benutzerSpeichern} /> : null}
            </>
          ) : null}
        </ScrollView>
      </LilaBlatt>

      {/* Klasse */}
      <LilaBlatt offen={blatt === "klasse"} titel="Führerscheinklasse" onSchliessen={zu}>
        <ScrollView contentContainerStyle={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
          {KLASSEN.map((k) => (
            <LilaKarte
              key={k.id}
              aktiv={stand.klasse === k.id}
              onPress={() => {
                klasseAendern(k.id);
                zu();
              }}
              label={`Klasse ${k.id}`}
              style={{ width: "31%", flexGrow: 1 }}
            >
              <View style={{ alignItems: "center", paddingVertical: 12, gap: 2 }}>
                <Text style={{ ...lilaSchrift.titel, fontSize: 26, color: stand.klasse === k.id ? "#8A5FFF" : l.tinte }}>{k.id}</Text>
                <Text style={{ ...lilaSchrift.text, fontSize: 11.5, color: l.tinte2, textAlign: "center" }} numberOfLines={2}>
                  {k.kurz}
                </Text>
              </View>
            </LilaKarte>
          ))}
        </ScrollView>
      </LilaBlatt>

      {/* Bundesland */}
      <LilaBlatt offen={blatt === "land"} titel="Bundesland" onSchliessen={zu}>
        <ScrollView>
          <LilaGruppe>
            {BUNDESLAENDER.map((b) => (
              <LilaZeile
                key={b}
                icon={profil?.bundesland === b ? "checkmark-circle" : "ellipse-outline"}
                titel={b}
                ohnePfeil
                onPress={() => {
                  e.bundeslandWaehlen(b);
                  zu();
                }}
              />
            ))}
          </LilaGruppe>
        </ScrollView>
      </LilaBlatt>

      {/* Uhrzeit der Erinnerung */}
      <LilaBlatt offen={blatt === "zeit"} titel="Uhrzeit" onSchliessen={zu}>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {ZEITEN.map(([h, m]) => (
            <LilaChip
              key={`${h}:${m}`}
              text={uhrzeit(h, m)}
              aktiv={stand.erinnerung.stunde === h && stand.erinnerung.minute === m}
              onPress={() => {
                erinnerungAendern(true, h, m);
                zu();
              }}
            />
          ))}
        </View>
      </LilaBlatt>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Bausteine der Einstellungen
// ---------------------------------------------------------------------------

function Karte({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <GlasKarte style={[{ borderRadius: 22, padding: 16 }, style]}>{children}</GlasKarte>;
}

/** Oben: wer angemeldet ist – groß und mittig, ohne Kasten. */
function KontoKopf({ name, unter, infos }: { name: string; unter: string; infos: string[] }) {
  const f = useFarbwelt();
  return (
    <View style={{ alignItems: "center", paddingTop: abstand(2) }}>
      <View style={[{ borderRadius: 47, padding: 3, backgroundColor: f.hell ? "#FFFFFF" : "rgba(255,255,255,0.16)" }, leuchten(f.hell ? "#3C2C18" : "#000000", f.hell ? 0.12 : 0.45, 16, 5)]}>
        <ProfilBild name={name} groesse={88} rand={0} />
      </View>
      <Text style={{ ...schrift.titel, fontSize: 26, lineHeight: 32, color: f.text, letterSpacing: -0.3, marginTop: 14 }} numberOfLines={1}>
        {name}
      </Text>
      {unter ? (
        <Text style={{ ...schrift.textMittel, fontSize: 14.5, color: f.text2, marginTop: 1 }} numberOfLines={1}>
          {unter}
        </Text>
      ) : null}
      {infos.length ? (
        <Text style={{ ...schrift.textMittel, fontSize: 13, color: f.text3, marginTop: 6 }} numberOfLines={1}>
          {infos.join("  ·  ")}
        </Text>
      ) : null}
    </View>
  );
}

/** Vorschau-Kachel für Nachtfahrt oder Tagfahrt. */
function DarstellungKachel({ art, aktiv, onPress }: { art: "dunkel" | "hell"; aktiv: boolean; onPress: () => void }) {
  const f = useFarbwelt();
  const dunkel = art === "dunkel";
  const icon: IconName = dunkel ? "moon" : "sunny";
  return (
    <Pressable
      onPress={() => {
        if (aktiv) return;
        tippen();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityState={{ selected: aktiv }}
      accessibilityLabel={dunkel ? "Nachtfahrt, dunkel" : "Tagfahrt, hell"}
      style={({ pressed }) => [{ flex: 1, borderRadius: 22, transform: [{ scale: pressed ? 0.97 : 1 }] }, aktiv ? leuchten("#8A5FFF", f.hell ? 0.3 : 0.45, 12, 3) : null]}
    >
      <View style={{ borderRadius: 22, overflow: "hidden", borderWidth: 2, borderColor: aktiv ? "#8A5FFF" : f.hell ? "rgba(20,23,27,0.08)" : "rgba(255,255,255,0.1)" }}>
        {/* Mini-Vorschau der App in dieser Darstellung */}
        <LinearGradient colors={dunkel ? ["#1A2230", "#07090C"] : ["#FFFFFF", "#ECE6DC"]} style={{ height: 96, padding: 12, gap: 6 }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <View style={{ width: 46, height: 7, borderRadius: 4, backgroundColor: dunkel ? "rgba(255,255,255,0.75)" : "rgba(20,23,27,0.7)" }} />
            <Icon name={icon} size={18} color={dunkel ? "#9DB4FF" : "#FFB400"} />
          </View>
          <View style={{ height: 18, borderRadius: 7, backgroundColor: dunkel ? "rgba(255,255,255,0.08)" : "rgba(20,23,27,0.06)" }} />
          <View style={{ flexDirection: "row", gap: 5 }}>
            <LinearGradient colors={verlauf.knopf} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={{ flex: 2, height: 16, borderRadius: 8 }} />
            <View style={{ flex: 1, height: 16, borderRadius: 8, backgroundColor: dunkel ? "rgba(255,255,255,0.08)" : "rgba(20,23,27,0.06)" }} />
          </View>
        </LinearGradient>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 12, paddingVertical: 10, backgroundColor: f.hell ? "rgba(255,255,255,0.85)" : "rgba(22,24,28,0.6)" }}>
          <View>
            <Text style={{ ...schrift.textHalb, fontSize: 14.5, color: f.text }}>{dunkel ? "Nachtfahrt" : "Tagfahrt"}</Text>
            <Text style={{ ...schrift.text, fontSize: 12, color: f.text3 }}>{dunkel ? "Dunkel" : "Hell"}</Text>
          </View>
          <View style={{ width: 22, height: 22, borderRadius: 11, alignItems: "center", justifyContent: "center", backgroundColor: aktiv ? "#8A5FFF" : "transparent", borderWidth: aktiv ? 0 : 2, borderColor: f.hell ? "rgba(20,23,27,0.2)" : "rgba(255,255,255,0.25)" }}>
            {aktiv ? <Icon name="checkmark" size={14} color="#FFFFFF" /> : null}
          </View>
        </View>
      </View>
    </Pressable>
  );
}

/** Auswahl in einer Glaskarte: oben groß, was gewählt ist, darunter die Wahl. */
function WahlKarte({ titel, einheit, unter, children }: { titel: string; einheit?: string; unter: string; children: React.ReactNode }) {
  const f = useFarbwelt();
  return (
    <GlasKarte style={{ borderRadius: 22, padding: 16, gap: 14 }}>
      <View>
        <View style={{ flexDirection: "row", alignItems: "baseline", gap: 7 }}>
          <Text style={{ ...schrift.titel, fontSize: 30, lineHeight: 36, color: f.text, letterSpacing: -0.5, fontVariant: ["tabular-nums"] }}>{titel}</Text>
          {einheit ? <Text style={{ ...schrift.textHalb, fontSize: 15, color: f.text2 }}>{einheit}</Text> : null}
        </View>
        {unter ? <Text style={{ ...schrift.textMittel, fontSize: 13.5, color: f.orange, marginTop: 1 }}>{unter}</Text> : null}
      </View>
      {children}
    </GlasKarte>
  );
}

const KACHEL = 64;
const LUECKE = 8;

/** Alle Klassen als waagrechte Leiste zum Wischen – die gewählte leuchtet orange. */
function KlassenLeiste({ wert, onWahl }: { wert: string; onWahl: (id: string) => void }) {
  const f = useFarbwelt();
  const leiste = useRef<ScrollView>(null);
  const geholt = useRef(false);
  const index = KLASSEN.findIndex((k) => k.id === wert);
  return (
    <ScrollView
      ref={leiste}
      horizontal
      showsHorizontalScrollIndicator={false}
      // Bis an den Kartenrand wischen; oben und unten Platz, damit das Leuchten nicht abgeschnitten wird
      style={{ marginHorizontal: -16, marginVertical: -10 }}
      contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 10, gap: LUECKE }}
      onContentSizeChange={() => {
        // Beim Öffnen die gewählte Klasse ins Bild holen
        if (geholt.current) return;
        geholt.current = true;
        if (index > 3) leiste.current?.scrollTo({ x: (index - 1.5) * (KACHEL + LUECKE), animated: false });
      }}
    >
      {KLASSEN.map((k) => {
        const aktiv = k.id === wert;
        const S = k.symbol;
        const inhalt = (
          <>
            <S size={22} color={aktiv ? "#FFFFFF" : f.text2} weight="fill" />
            <Text style={{ ...schrift.textFett, fontSize: 15, color: aktiv ? "#FFFFFF" : f.text }}>{k.id}</Text>
          </>
        );
        const form = { flex: 1, borderRadius: 18, alignItems: "center", justifyContent: "center", gap: 4 } as const;
        return (
          <Pressable
            key={k.id}
            onPress={() => {
              if (aktiv) return;
              tippen();
              onWahl(k.id);
            }}
            accessibilityRole="button"
            accessibilityState={{ selected: aktiv }}
            accessibilityLabel={`Klasse ${k.id}, ${k.text}`}
            style={({ pressed }) => [{ width: KACHEL, height: 70, borderRadius: 18, transform: [{ scale: pressed ? 0.95 : 1 }] }, aktiv ? leuchten(f.orange, f.hell ? 0.3 : 0.45, 10, 3) : null]}
          >
            {aktiv ? (
              <LinearGradient colors={verlauf.segment} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={form}>
                {inhalt}
              </LinearGradient>
            ) : (
              <View style={[form, { backgroundColor: f.hell ? "rgba(20,23,27,0.05)" : "rgba(255,255,255,0.07)" }]}>{inhalt}</View>
            )}
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
