import { Children, useEffect, useState, type ReactNode } from "react";
import { Image, Pressable, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { router } from "expo-router";

import { Icon, type IconName } from "@/components/icon";
import { Lader } from "@/components/lader";
import { NutzerBild } from "@/components/profilbild";
import { Abschnitt, B, Balken, Eingabe, Kachel, Knopf, Leer, n, Raster, Reiter, Schalter, Spalte, Symbol, TOENE, UnterKopf, zahlen, type Ton, type Zustand } from "@/components/web/bunt";
import { WebSeite } from "@/components/web/rahmen";
import { clipsVonLaden, dateiUrl, vorZeit, type ClipEintrag, type Ersteller } from "@/lib/clips-server";
import { STATUS_TEXT, type Bewerbung, type BewerbungDaten, type CreatorStatus, type MeineBewerbung } from "@/lib/creator";

// Creator am PC: Bewerbung, Verwaltung der Bewerbungen, eine Bewerbung im
// Detail und die Clip-Ersteller. Ruhig auf weißem Grund, zwei Spalten statt
// Handy-Stapel – links der Inhalt, rechts die Aktionen. Die Logik bleibt in den
// Routen, hier kommen nur Werte und Handler an.

const GRAU: Ton = { farbe: "#8A8F96", kante: "#6E737A", hell: "#F0F1F2" };

const REGELN = [
  "Keine Beleidigungen, keine Werbung, keine Links.",
  "Nur Themen rund um Führerschein und Verkehr.",
  "Keine privaten Daten zeigen.",
  "Lives können jederzeit beendet und Zugänge entzogen werden.",
];

function statusTon(status: CreatorStatus): Ton {
  if (status === "offen") return TOENE.orange;
  if (status === "angenommen") return TOENE.gruen;
  if (status === "zurueckgezogen") return GRAU;
  return TOENE.rot;
}

// ---------------------------------------------------------------------------
// Kleine Bausteine
// ---------------------------------------------------------------------------

/** Zwei Spalten: links breiter (Inhalt), rechts die Aktionen – bricht bei Platzmangel um. */
function ZweiSpalten({ links, rechts }: { links: ReactNode; rechts: ReactNode }) {
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 24, alignItems: "flex-start" }}>
      <View style={{ flex: 3, minWidth: 480, gap: 20 }}>{links}</View>
      <View style={{ flex: 2, minWidth: 320, gap: 20 }}>{rechts}</View>
    </View>
  );
}

/** Kopf einer Karte: kleines Symbol und Titel, rechts optional etwas. */
function KartenKopf({ icon, ton, titel, rechts }: { icon: IconName; ton: Ton; titel: string; rechts?: ReactNode }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
      <Symbol icon={icon} ton={ton} groesse={34} />
      <Text style={{ flex: 1, ...n.schwarz, fontSize: 18, color: B.text }} numberOfLines={1}>
        {titel}
      </Text>
      {rechts}
    </View>
  );
}

/** Kleine Marke mit Punkt: Status einer Bewerbung, „Live“ … */
function Marke({ text, ton, voll }: { text: string; ton: Ton; voll?: boolean }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 6, height: 26, paddingHorizontal: 10, borderRadius: 13, backgroundColor: voll ? ton.farbe : ton.hell, alignSelf: "flex-start" }}>
      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: voll ? "#FFFFFF" : ton.farbe }} />
      <Text style={{ ...n.fett, fontSize: 12.5, color: voll ? "#FFFFFF" : ton.kante }}>{text}</Text>
    </View>
  );
}

const StatusMarke = ({ status }: { status: CreatorStatus }) => <Marke text={STATUS_TEXT[status]} ton={statusTon(status)} />;
const LiveMarke = () => <Marke text="Live" ton={TOENE.rot} voll />;

/** Großer Einstieg als Karte: Symbol, Titel, Unterzeile, Pfeil. */
function Einstieg({ icon, ton, titel, text, onPress }: { icon: IconName; ton: Ton; titel: string; text: string; onPress: () => void }) {
  return (
    <Kachel onPress={onPress} style={{ padding: 18, flexDirection: "row", alignItems: "center", gap: 14 }}>
      <Symbol icon={icon} ton={ton} groesse={44} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={{ ...n.schwarz, fontSize: 16.5, color: B.text }} numberOfLines={1}>
          {titel}
        </Text>
        <Text style={{ ...n.halb, fontSize: 13.5, color: B.text2 }} numberOfLines={2}>
          {text}
        </Text>
      </View>
      <Icon name="chevron-forward" size={18} color={B.text3} />
    </Kachel>
  );
}

/** Ein Punkt mit farbigem Symbol, Titel und kurzem Text. */
function Punkt({ icon, ton, titel, text }: { icon: IconName; ton: Ton; titel: string; text: string }) {
  return (
    <View style={{ flexDirection: "row", gap: 14 }}>
      <View style={{ paddingTop: 1 }}>
        <Icon name={icon} size={22} color={ton.farbe} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ ...n.fett, fontSize: 15.5, color: B.text }}>{titel}</Text>
        <Text style={{ ...n.halb, fontSize: 14, lineHeight: 20, color: B.text2 }}>{text}</Text>
      </View>
    </View>
  );
}

function RegelListe() {
  return (
    <View style={{ gap: 10 }}>
      {REGELN.map((r) => (
        <View key={r} style={{ flexDirection: "row", gap: 10 }}>
          <Icon name="checkmark" size={17} color={B.gruen} style={{ marginTop: 2 }} />
          <Text style={{ flex: 1, ...n.halb, fontSize: 14.5, lineHeight: 20, color: B.text2 }}>{r}</Text>
        </View>
      ))}
    </View>
  );
}

/** Feste Spaltenzahl, gleich breite Zellen – Zeile für Zeile. */
function Gitter({ spalten, abstand = 16, zeilenAbstand, children }: { spalten: number; abstand?: number; zeilenAbstand?: number; children: ReactNode }) {
  const kinder = Children.toArray(children);
  const zeilen: ReactNode[][] = [];
  for (let i = 0; i < kinder.length; i += spalten) zeilen.push(kinder.slice(i, i + spalten));
  return (
    <View style={{ gap: zeilenAbstand ?? abstand }}>
      {zeilen.map((zeile, z) => (
        <View key={z} style={{ flexDirection: "row", gap: abstand }}>
          {Array.from({ length: spalten }, (_, i) => (
            <View key={i} style={{ flex: 1, minWidth: 0 }}>
              {zeile[i] ?? null}
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

function Trenner({ style }: { style?: StyleProp<ViewStyle> }) {
  return <View style={[{ height: 1.5, backgroundColor: B.ton }, style]} />;
}

function Laden() {
  return (
    <View style={{ alignItems: "center", paddingVertical: 60 }}>
      <Lader color={B.text3} size="large" />
    </View>
  );
}

/** Fehler beim Laden mit Knopf zum erneuten Versuch. */
function LadeFehler({ text, onNochmal }: { text: string; onNochmal: () => void }) {
  return (
    <Kachel style={{ padding: 20, flexDirection: "row", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
      <Icon name="cloud-offline-outline" size={24} color={B.rot} />
      <Text style={{ flex: 1, minWidth: 220, ...n.halb, fontSize: 15, color: B.text2 }}>{text}</Text>
      <Knopf titel="Nochmal laden" art="rand" ton="blau" groesse="klein" onPress={onNochmal} />
    </Kachel>
  );
}

/** Seite nur für den Inhaber – für alle anderen ein ruhiger Hinweis. */
function NurInhaber({ titel, text }: { titel: string; text: string }) {
  return (
    <WebSeite ohneRechts>
      <Spalte>
        <UnterKopf titel={titel} />
        <Kachel>
          <Leer icon="lock-closed" ton={GRAU} titel="Nur für den Inhaber" text={text} />
        </Kachel>
      </Spalte>
    </WebSeite>
  );
}

// ---------------------------------------------------------------------------
// Creator werden (Bewerbung)
// ---------------------------------------------------------------------------

export type BewerbungArt = "gast" | "inhaber" | "laedt" | "status" | "formular";

type BewerbungProps = {
  art: BewerbungArt;
  bewerbung: MeineBewerbung | null;
  daten: BewerbungDaten;
  setze: (feld: keyof BewerbungDaten) => (wert: string) => void;
  alterText: string;
  onAlter: (text: string) => void;
  regelnOk: boolean;
  onRegeln: (ok: boolean) => void;
  fehlen: number;
  sendet: boolean;
  onAbsenden: () => void;
  onZurueckziehen: () => void;
  onNeu: () => void;
};

const EINLEITUNG: { icon: IconName; ton: Ton; titel: string; text: string }[] = [
  { icon: "radio", ton: TOENE.rot, titel: "Live gehen", text: "Regeln erklären und Prüfungsfragen live mit der Community lösen." },
  { icon: "film", ton: TOENE.pink, titel: "Clips hochladen", text: "Kurze Videos für alle im Clips-Tab." },
  { icon: "hourglass", ton: TOENE.blau, titel: "Schnelle Antwort", text: "Sobald entschieden ist, bekommst du eine Mitteilung." },
];

function Einleitung() {
  return (
    <Kachel style={{ padding: 24, gap: 18 }}>
      <Text style={{ ...n.schwarz, fontSize: 18, color: B.text }}>Als Creator</Text>
      {EINLEITUNG.map((p) => (
        <Punkt key={p.titel} {...p} />
      ))}
    </Kachel>
  );
}

export function CreatorBewerbungWeb(p: BewerbungProps) {
  if (p.art === "gast") {
    return (
      <WebSeite ohneRechts>
        <Spalte>
          <UnterKopf titel="Creator werden" unter="Live gehen und Clips hochladen" />
          <ZweiSpalten
            links={
              <Kachel>
                <Leer icon="videocam" ton={TOENE.orange} titel="Erst anmelden" text="Melde dich an, um dich als Creator zu bewerben.">
                  <Knopf titel="Anmelden" icon="log-in-outline" onPress={() => router.push("/anmelden")} />
                </Leer>
              </Kachel>
            }
            rechts={<Einleitung />}
          />
        </Spalte>
      </WebSeite>
    );
  }

  if (p.art === "inhaber") {
    return (
      <WebSeite ohneRechts>
        <Spalte>
          <UnterKopf titel="Creator" unter="Live gehen, Clips hochladen und Creator verwalten" />
          <Kachel style={{ padding: 24, flexDirection: "row", alignItems: "center", gap: 18 }}>
            <Symbol icon="star" ton={TOENE.gelb} groesse={52} />
            <View style={{ flex: 1 }}>
              <Text style={{ ...n.schwarz, fontSize: 20, color: B.text }}>Du bist der Inhaber</Text>
              <Text style={{ ...n.halb, fontSize: 15, color: B.text2 }}>Du kannst immer live gehen und Clips hochladen.</Text>
            </View>
          </Kachel>
          <Raster min={280} abstand={16}>
            <Einstieg icon="people" ton={TOENE.orange} titel="Bewerbungen ansehen" text="Annehmen, ablehnen, verwalten" onPress={() => router.replace("/creator-verwaltung")} />
            <Einstieg icon="radio" ton={TOENE.rot} titel="Live gehen" text="Direkt aus der App senden" onPress={() => router.push("/live-senden")} />
            <Einstieg icon="film" ton={TOENE.pink} titel="Clip hochladen" text="Kurzes Video für alle im Clips-Tab" onPress={() => router.push("/clip-hochladen")} />
          </Raster>
        </Spalte>
      </WebSeite>
    );
  }

  if (p.art === "laedt") {
    return (
      <WebSeite ohneRechts>
        <Spalte>
          <UnterKopf titel="Creator werden" />
          <Laden />
        </Spalte>
      </WebSeite>
    );
  }

  if (p.art === "status" && p.bewerbung) return <BewerbungStand bewerbung={p.bewerbung} onZurueckziehen={p.onZurueckziehen} onNeu={p.onNeu} />;
  return <BewerbungFormular {...p} />;
}

/** Stand der eigenen Bewerbung: Status, Ablauf, Nachricht – rechts was man tun kann. */
function BewerbungStand({ bewerbung, onZurueckziehen, onNeu }: { bewerbung: MeineBewerbung; onZurueckziehen: () => void; onNeu: () => void }) {
  const status = bewerbung.status;
  const angenommen = status === "angenommen";
  const entschieden = status !== "offen";
  const ton = statusTon(status);
  const bild: { icon: IconName; text: string } =
    status === "angenommen"
      ? { icon: "checkmark-circle", text: "Du kannst live gehen und Clips hochladen. Der Inhaber kann Lives beenden und den Zugang jederzeit entziehen." }
      : status === "abgelehnt"
        ? { icon: "close-circle", text: "Deine Bewerbung wurde diesmal abgelehnt." }
        : status === "entzogen"
          ? { icon: "ban", text: "Dein Creator-Zugang wurde beendet." }
          : status === "zurueckgezogen"
            ? { icon: "close-circle", text: "Du hast die Bewerbung zurückgezogen." }
            : { icon: "hourglass", text: "Wir sehen uns deine Bewerbung an. Sobald entschieden ist, bekommst du eine Mitteilung." };

  const schritte: { titel: string; zeit: string; art: "fertig" | "jetzt" | "offen"; ton: Ton; kreuz?: boolean }[] = [
    { titel: "Bewerbung gesendet", zeit: vorZeit(bewerbung.erstellt_am), art: "fertig", ton: TOENE.orange },
    { titel: "In Prüfung", zeit: entschieden ? "Abgeschlossen" : "Der Inhaber sieht sich deine Angaben an", art: entschieden ? "fertig" : "jetzt", ton: TOENE.orange },
    {
      titel: entschieden ? STATUS_TEXT[status] : "Entscheidung",
      zeit: bewerbung.entschieden_am ? vorZeit(bewerbung.entschieden_am) : "Du bekommst eine Mitteilung",
      art: entschieden ? "fertig" : "offen",
      ton,
      kreuz: status === "abgelehnt" || status === "entzogen",
    },
  ];

  return (
    <WebSeite ohneRechts>
      <Spalte>
        <UnterKopf titel={angenommen ? "Creator" : "Deine Bewerbung"} unter={angenommen ? "Live gehen und Clips hochladen" : `Gesendet ${vorZeit(bewerbung.erstellt_am)}`} />
        <ZweiSpalten
          links={
            <>
              <Kachel style={{ padding: 28, gap: 26 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 18 }}>
                  <Symbol icon={bild.icon} ton={ton} groesse={56} />
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={{ ...n.fett, fontSize: 14, color: ton.kante }}>{angenommen ? "Freigeschaltet" : "Status"}</Text>
                    <Text style={{ ...n.schwarz, fontSize: 26, lineHeight: 32, color: B.text }}>{angenommen ? "Du bist Creator" : STATUS_TEXT[status]}</Text>
                  </View>
                </View>
                <Text style={{ ...n.halb, fontSize: 15.5, lineHeight: 22, color: B.text2 }}>{bild.text}</Text>
                <Trenner />
                <View style={{ flexDirection: "row" }}>
                  {schritte.map((s, i) => (
                    <View key={s.titel} style={{ flex: 1, gap: 12 }}>
                      <View style={{ flexDirection: "row", alignItems: "center" }}>
                        <SchrittKreis art={s.art} ton={s.ton} kreuz={s.kreuz} />
                        {i < schritte.length - 1 ? <View style={{ flex: 1, height: 3, borderRadius: 2, marginHorizontal: 10, backgroundColor: s.art === "fertig" ? s.ton.farbe : B.linie }} /> : null}
                      </View>
                      <View style={{ paddingRight: 16, gap: 2 }}>
                        <Text style={{ ...n.fett, fontSize: 15, color: s.art === "offen" ? B.text3 : B.text }}>{s.titel}</Text>
                        <Text style={{ ...n.halb, fontSize: 13, lineHeight: 18, color: B.text3 }}>{s.zeit}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              </Kachel>

              {bewerbung.notiz ? (
                <Kachel style={{ padding: 24, gap: 14 }}>
                  <KartenKopf icon="chatbubble-ellipses" ton={TOENE.blau} titel="Nachricht vom Inhaber" />
                  <Text selectable style={{ ...n.halb, fontSize: 15.5, lineHeight: 23, color: B.text }}>
                    {bewerbung.notiz}
                  </Text>
                </Kachel>
              ) : null}
            </>
          }
          rechts={
            angenommen ? (
              <>
                <Einstieg icon="radio" ton={TOENE.rot} titel="Live gehen" text="Direkt aus der App senden" onPress={() => router.replace("/live-senden")} />
                <Einstieg icon="film" ton={TOENE.pink} titel="Clip hochladen" text="Kurzes Video für alle im Clips-Tab" onPress={() => router.replace("/clip-hochladen")} />
                <Kachel style={{ padding: 24, gap: 16 }}>
                  <KartenKopf icon="shield-checkmark" ton={TOENE.gruen} titel="Regeln" />
                  <RegelListe />
                </Kachel>
              </>
            ) : status === "offen" ? (
              <Kachel style={{ padding: 24, gap: 14 }}>
                <Text style={{ ...n.schwarz, fontSize: 18, color: B.text }}>Es hat sich etwas geändert?</Text>
                <Text style={{ ...n.halb, fontSize: 14.5, lineHeight: 21, color: B.text2 }}>Du kannst die Bewerbung zurückziehen und dich danach jederzeit neu bewerben.</Text>
                <Knopf titel="Bewerbung zurückziehen" art="rand" ton="rot" onPress={onZurueckziehen} style={{ alignSelf: "flex-start" }} />
              </Kachel>
            ) : (
              <Kachel style={{ padding: 24, gap: 14 }}>
                <Text style={{ ...n.schwarz, fontSize: 18, color: B.text }}>Noch einmal versuchen</Text>
                <Text style={{ ...n.halb, fontSize: 14.5, lineHeight: 21, color: B.text2 }}>Du kannst dich jederzeit neu bewerben – mit neuen Angaben.</Text>
                <Knopf titel="Neu bewerben" icon="create-outline" onPress={onNeu} style={{ alignSelf: "flex-start" }} />
              </Kachel>
            )
          }
        />
      </Spalte>
    </WebSeite>
  );
}

function SchrittKreis({ art, ton, kreuz }: { art: "fertig" | "jetzt" | "offen"; ton: Ton; kreuz?: boolean }) {
  return (
    <View style={{ width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: art === "fertig" ? ton.farbe : B.flaeche, borderWidth: art === "fertig" ? 0 : 2.5, borderColor: art === "jetzt" ? ton.farbe : B.linie }}>
      {art === "fertig" ? <Icon name={kreuz ? "close" : "checkmark"} size={16} color="#FFFFFF" /> : art === "jetzt" ? <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: ton.farbe }} /> : null}
    </View>
  );
}

/** Das Formular: links die Angaben, rechts Einleitung, Regeln und Absenden. */
function BewerbungFormular({ daten, setze, alterText, onAlter, regelnOk, onRegeln, fehlen, sendet, onAbsenden }: BewerbungProps) {
  const vollstaendig = fehlen === 0;
  return (
    <WebSeite ohneRechts>
      <Spalte>
        <UnterKopf titel="Creator werden" unter="Als Creator gehst du in Fahrschul Pro live und lädst Clips hoch. Erzähl uns kurz von dir." />
        <ZweiSpalten
          links={
            <>
              <Kachel style={{ padding: 24, gap: 20 }}>
                <KartenKopf icon="person" ton={TOENE.orange} titel="Über dich" />
                <Gitter spalten={2} abstand={18}>
                    <Eingabe titel="Name" value={daten.name} onChangeText={setze("name")} placeholder="Vor- und Nachname" maxLength={80} autoComplete="name" />
                    <Eingabe titel="Telefon" value={daten.telefon} onChangeText={setze("telefon")} placeholder="0151 2345678" keyboardType="phone-pad" maxLength={30} autoComplete="tel" />
                    <Eingabe titel="Alter" value={alterText} onChangeText={(t) => onAlter(t.replace(/\D/g, "").slice(0, 2))} placeholder="Jahre" keyboardType="number-pad" maxLength={2} />
                    <Eingabe titel="Beruf" value={daten.beruf} onChangeText={setze("beruf")} placeholder="z. B. Fahrlehrer" maxLength={80} />
                    <Eingabe titel="Wohnort · optional" value={daten.ort} onChangeText={setze("ort")} placeholder="z. B. Köln" maxLength={80} />
                    <Eingabe titel="Kanal · optional" value={daten.social} onChangeText={setze("social")} placeholder="Instagram oder TikTok" autoCapitalize="none" autoCorrect={false} maxLength={200} />
                </Gitter>
              </Kachel>

              <Kachel style={{ padding: 24, gap: 20 }}>
                <KartenKopf icon="sparkles" ton={TOENE.lila} titel="Deine Ideen" />
                <Eingabe
                  titel="Was möchtest du machen?"
                  hinweis={`${daten.themen.length}/1000${daten.themen.trim().length < 10 ? " · mindestens 10 Zeichen" : ""}`}
                  mehrzeilig
                  value={daten.themen}
                  onChangeText={setze("themen")}
                  placeholder="z. B. Vorfahrtsregeln erklären, Prüfungsfragen live lösen"
                  maxLength={1000}
                />
                <Eingabe titel="Erfahrung · optional" hinweis={`${daten.erfahrung.length}/1000`} mehrzeilig value={daten.erfahrung} onChangeText={setze("erfahrung")} placeholder="z. B. Fahrlehrer seit 5 Jahren, eigener Kanal" maxLength={1000} />
              </Kachel>
            </>
          }
          rechts={
            <>
              <Einleitung />

              <Kachel style={{ padding: 24, gap: 16 }}>
                <KartenKopf icon="shield-checkmark" ton={TOENE.gruen} titel="Regeln" />
                <RegelListe />
                <Trenner style={{ marginTop: 2 }} />
                <Pressable onPress={() => onRegeln(!regelnOk)} style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
                  <Text style={{ flex: 1, ...n.fett, fontSize: 15, lineHeight: 21, color: B.text }}>Ich bin mindestens 18 und halte mich an die Regeln</Text>
                  <Schalter wert={regelnOk} onWechsel={onRegeln} />
                </Pressable>
              </Kachel>

              <Kachel style={{ padding: 24, gap: 14 }}>
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                  <Text style={{ ...n.fett, fontSize: 14.5, color: vollstaendig ? B.gruenKante : B.text2 }}>{vollstaendig ? "Alles ausgefüllt" : fehlen === 1 ? "Noch 1 Pflichtangabe" : `Noch ${fehlen} Pflichtangaben`}</Text>
                  {vollstaendig ? <Icon name="checkmark-circle" size={20} color={B.gruen} /> : <Text style={{ ...n.fett, fontSize: 13.5, color: B.text3, fontVariant: ["tabular-nums"] }}>{6 - fehlen} / 6</Text>}
                </View>
                <Balken anteil={(6 - fehlen) / 6} ton={vollstaendig ? TOENE.gruen : TOENE.orange} hoehe={8} />
                <Knopf titel={sendet ? "Wird gesendet …" : "Bewerbung senden"} icon="paper-plane" groesse="gross" deaktiviert={!vollstaendig || sendet} onPress={onAbsenden} style={{ marginTop: 6 }} />
                <Text style={{ ...n.halb, fontSize: 13, color: B.text3, textAlign: "center" }}>Deine Angaben sieht nur der Inhaber der App.</Text>
              </Kachel>
            </>
          }
        />
      </Spalte>
    </WebSeite>
  );
}

// ---------------------------------------------------------------------------
// Creator-Verwaltung (Inhaber)
// ---------------------------------------------------------------------------

export type VerwaltungsReiter = "offen" | "creator" | "erledigt";

function oeffnen(b: Bewerbung) {
  router.push({ pathname: "/creator-detail", params: { id: b.id } });
}

/** Zahl oben (Offen, Creator, Erledigt) – klickbar, wählt die Liste darunter. */
function ZahlKachel({ icon, ton, zahl, titel, aktiv, onPress }: { icon: IconName; ton: Ton; zahl: number; titel: string; aktiv: boolean; onPress: () => void }) {
  return (
    <Kachel onPress={onPress} style={[{ flex: 1, minWidth: 220, padding: 20, flexDirection: "row", alignItems: "center", gap: 16 }, aktiv ? { borderColor: ton.farbe, borderBottomColor: ton.kante } : null]}>
      <Symbol icon={icon} ton={ton} groesse={46} />
      <View style={{ flex: 1 }}>
        <Text style={{ ...n.schwarz, fontSize: 28, lineHeight: 32, color: B.text, fontVariant: ["tabular-nums"] }}>{zahlen(zahl)}</Text>
        <Text style={{ ...n.halb, fontSize: 14, color: B.text2 }}>{titel}</Text>
      </View>
    </Kachel>
  );
}

/** Eine Person als Karte: Bild, Name, Angaben, Status. */
function PersonKarte({ b, mitStatus, mitZeit }: { b: Bewerbung; mitStatus: boolean; mitZeit: boolean }) {
  const name = b.name || b.benutzername || "Unbekannt";
  const angaben = [`${b.alter_jahre} Jahre`, b.beruf, b.ort].filter(Boolean).join(" · ");
  return (
    <Kachel onPress={() => oeffnen(b)} style={{ padding: 18, gap: 14 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
        <NutzerBild pfad={b.bild_pfad} name={b.benutzername ?? name} farbe={b.avatar_farbe ?? undefined} groesse={48} rand={0} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={{ ...n.schwarz, fontSize: 16.5, color: B.text }} numberOfLines={1}>
            {name}
          </Text>
          <Text style={{ ...n.halb, fontSize: 13.5, color: B.text2 }} numberOfLines={1}>
            {angaben}
          </Text>
        </View>
        <Icon name="chevron-forward" size={18} color={B.text3} />
      </View>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        {b.live_id ? <LiveMarke /> : null}
        {mitStatus || !b.live_id ? <StatusMarke status={b.status} /> : null}
        <View style={{ flex: 1 }} />
        <Text style={{ ...n.halb, fontSize: 13, color: B.text3 }}>{mitZeit ? vorZeit(b.erstellt_am) : b.benutzername ? `@${b.benutzername}` : ""}</Text>
      </View>
    </Kachel>
  );
}

export function CreatorVerwaltungWeb({
  inhaber,
  liste,
  fehler,
  onNeuLaden,
  reiter,
  onReiter,
}: {
  inhaber: boolean;
  liste: Bewerbung[] | null;
  fehler: string | null;
  onNeuLaden: () => void;
  reiter: VerwaltungsReiter | null;
  onReiter: (r: VerwaltungsReiter) => void;
}) {
  if (!inhaber) return <NurInhaber titel="Creator" text="Nur für den Inhaber der App." />;

  const alle = liste ?? [];
  const offen = alle.filter((b) => b.status === "offen");
  const creator = alle.filter((b) => b.status === "angenommen");
  const archiv = alle.filter((b) => b.status !== "offen" && b.status !== "angenommen");
  const live = alle.filter((b) => b.live_id);
  // Ohne eigene Wahl: offene zuerst, sonst die Creator.
  const aktiv: VerwaltungsReiter = reiter ?? (offen.length || !creator.length ? "offen" : "creator");
  const eintraege = aktiv === "offen" ? offen : aktiv === "creator" ? creator : archiv;

  return (
    <WebSeite ohneRechts>
      <Spalte>
        <UnterKopf titel="Creator" unter="Bewerbungen und Freischaltungen" rechts={<Knopf titel="Clip-Ersteller" icon="film-outline" art="rand" ton="pink" groesse="klein" onPress={() => router.push("/clip-ersteller")} />} />

        {liste == null ? (
          fehler ? (
            <LadeFehler text={fehler} onNochmal={onNeuLaden} />
          ) : (
            <Laden />
          )
        ) : (
          <>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 16 }}>
              <ZahlKachel icon="person-add" ton={TOENE.orange} zahl={offen.length} titel={offen.length === 1 ? "neue Bewerbung" : "neue Bewerbungen"} aktiv={aktiv === "offen"} onPress={() => onReiter("offen")} />
              <ZahlKachel icon="people" ton={TOENE.gruen} zahl={creator.length} titel="Creator freigeschaltet" aktiv={aktiv === "creator"} onPress={() => onReiter("creator")} />
              <ZahlKachel icon="archive" ton={GRAU} zahl={archiv.length} titel="erledigt" aktiv={aktiv === "erledigt"} onPress={() => onReiter("erledigt")} />
            </View>

            {live.length ? (
              <Kachel>
                {live.map((b, i) => (
                  <Pressable
                    key={b.id}
                    onPress={() => oeffnen(b)}
                    accessibilityRole="button"
                    accessibilityLabel={`${b.name || b.benutzername} ist gerade live`}
                    style={(z: Zustand) => ({ flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 14, paddingHorizontal: 20, borderTopWidth: i ? 1.5 : 0, borderTopColor: B.ton, backgroundColor: z.hovered ? B.hover : "transparent" })}
                  >
                    <LiveMarke />
                    <Text style={{ flex: 1, ...n.fett, fontSize: 15.5, color: B.text }} numberOfLines={1}>
                      {b.name || b.benutzername || "Unbekannt"} ist gerade live
                    </Text>
                    <Text style={{ ...n.fett, fontSize: 14, color: B.rotKante }}>Ansehen</Text>
                    <Icon name="chevron-forward" size={16} color={B.rot} />
                  </Pressable>
                ))}
              </Kachel>
            ) : null}

            <View style={{ gap: 18 }}>
              <Reiter<VerwaltungsReiter>
                wert={aktiv}
                onWechsel={onReiter}
                optionen={[
                  { id: "offen", titel: "Offen", zahl: offen.length || undefined },
                  { id: "creator", titel: "Creator", zahl: creator.length || undefined },
                  { id: "erledigt", titel: "Erledigt", zahl: archiv.length || undefined },
                ]}
              />
              {alle.length === 0 ? (
                <Kachel>
                  <Leer icon="file-tray-outline" ton={GRAU} titel="Noch keine Bewerbungen." text="Neue Bewerbungen erscheinen hier sofort." />
                </Kachel>
              ) : eintraege.length === 0 ? (
                <Kachel>
                  <Leer
                    icon={aktiv === "offen" ? "checkmark-done" : aktiv === "creator" ? "people" : "file-tray-outline"}
                    ton={aktiv === "offen" ? TOENE.gruen : GRAU}
                    titel={aktiv === "offen" ? "Keine offenen Bewerbungen" : aktiv === "creator" ? "Noch keine Creator" : "Noch nichts erledigt"}
                    text={aktiv === "offen" ? "Neue Bewerbungen erscheinen hier sofort." : aktiv === "creator" ? "Nimm eine Bewerbung an – dann steht die Person hier." : undefined}
                  />
                </Kachel>
              ) : (
                <Raster min={300} abstand={16}>
                  {eintraege.map((b) => (
                    <PersonKarte key={b.id} b={b} mitStatus={aktiv === "erledigt"} mitZeit={aktiv !== "creator"} />
                  ))}
                </Raster>
              )}
            </View>

            <Text style={{ ...n.halb, fontSize: 13.5, color: B.text3 }}>Angenommene Creator dürfen live gehen und Clips hochladen. Änderungen gelten sofort.</Text>
          </>
        )}
      </Spalte>
    </WebSeite>
  );
}

// ---------------------------------------------------------------------------
// Eine Bewerbung im Detail (Inhaber)
// ---------------------------------------------------------------------------

/** Ohne Rechte, beim Laden oder wenn die Bewerbung weg ist. */
export function CreatorDetailLeerWeb({ art }: { art: "rechte" | "laedt" | "weg" }) {
  if (art === "rechte") return <NurInhaber titel="Bewerbung" text="Nur für den Inhaber der App." />;
  return (
    <WebSeite ohneRechts>
      <Spalte>
        <UnterKopf titel="Bewerbung" />
        {art === "laedt" ? (
          <Laden />
        ) : (
          <Kachel>
            <Leer icon="file-tray-outline" ton={GRAU} titel="Nicht mehr da" text="Diese Bewerbung gibt es nicht mehr." />
          </Kachel>
        )}
      </Spalte>
    </WebSeite>
  );
}

/** Eine Angabe im Raster: Bezeichnung klein, Wert groß – optional klickbar. */
function Angabe({ titel, wert, onPress }: { titel: string; wert: string; onPress?: () => void }) {
  return (
    <Pressable disabled={!onPress} onPress={onPress} style={(z: Zustand) => ({ gap: 3, paddingVertical: 10, paddingHorizontal: 12, marginHorizontal: -12, borderRadius: 12, backgroundColor: z.hovered && onPress ? B.ton : "transparent" })}>
      <Text style={{ ...n.halb, fontSize: 13, color: B.text3 }}>{titel}</Text>
      <Text selectable style={{ ...n.fett, fontSize: 15.5, color: onPress ? B.blauKante : B.text }} numberOfLines={2}>
        {wert}
      </Text>
    </Pressable>
  );
}

function TextKachel({ icon, ton, titel, text }: { icon: IconName; ton: Ton; titel: string; text: string }) {
  return (
    <Kachel style={{ padding: 24, gap: 14 }}>
      <KartenKopf icon={icon} ton={ton} titel={titel} />
      <Text selectable style={{ ...n.halb, fontSize: 15.5, lineHeight: 23, color: B.text }}>
        {text}
      </Text>
    </Kachel>
  );
}

export function CreatorDetailWeb({
  bewerbung: b,
  notiz,
  onNotiz,
  laeuft,
  onAnnehmen,
  onAblehnen,
  onLiveBeenden,
  onEntziehen,
  onOeffnen,
}: {
  bewerbung: Bewerbung;
  notiz: string;
  onNotiz: (t: string) => void;
  laeuft: string | null;
  onAnnehmen: () => void;
  onAblehnen: () => void;
  onLiveBeenden: () => void;
  onEntziehen: () => void;
  onOeffnen: (url: string) => void;
}) {
  const name = b.name || b.benutzername || "Unbekannt";
  const telefon = b.telefon.replace(/[^\d+]/g, "");
  const angaben = [`${b.alter_jahre} Jahre`, b.beruf, b.ort].filter(Boolean).join(" · ");
  const status = b.status;
  const beschaeftigt = laeuft !== null;
  const knopfText = (schritt: string, titel: string) => (laeuft === schritt ? "Einen Moment …" : titel);

  return (
    <WebSeite ohneRechts>
      <Spalte>
        <UnterKopf titel={status === "angenommen" ? "Creator" : "Bewerbung"} unter={`Gesendet ${vorZeit(b.erstellt_am)}`} />
        <ZweiSpalten
          links={
            <>
              {/* Person */}
              <Kachel style={{ padding: 24, gap: 20 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 20 }}>
                  <NutzerBild pfad={b.bild_pfad} name={b.benutzername ?? name} farbe={b.avatar_farbe ?? undefined} groesse={84} rand={0} />
                  <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
                    <Text style={{ ...n.schwarz, fontSize: 26, lineHeight: 32, color: B.text }} numberOfLines={2}>
                      {name}
                    </Text>
                    <Text style={{ ...n.halb, fontSize: 14.5, color: B.text2 }} numberOfLines={2}>
                      {[b.benutzername ? `@${b.benutzername}` : null, angaben].filter(Boolean).join(" · ")}
                    </Text>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 8 }}>
                      {b.live_id ? <LiveMarke /> : null}
                      <StatusMarke status={status} />
                      <Text style={{ ...n.halb, fontSize: 13, color: B.text3 }}>{vorZeit(b.entschieden_am ?? b.erstellt_am)}</Text>
                    </View>
                  </View>
                </View>
                {telefon || b.email ? (
                  <>
                    <Trenner />
                    <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap" }}>
                      {telefon ? <Knopf titel="Anrufen" icon="call" art="rand" ton="gruen" groesse="klein" onPress={() => onOeffnen(`tel:${telefon}`)} /> : null}
                      {b.email ? <Knopf titel="E-Mail schreiben" icon="mail" art="rand" ton="blau" groesse="klein" onPress={() => onOeffnen(`mailto:${b.email}`)} /> : null}
                    </View>
                  </>
                ) : null}
              </Kachel>

              {/* Angaben */}
              <Kachel style={{ padding: 24, gap: 10 }}>
                <KartenKopf icon="id-card" ton={TOENE.blau} titel="Angaben" />
                <Gitter spalten={3} abstand={24} zeilenAbstand={4}>
                  <Angabe titel="Telefon" wert={b.telefon} onPress={telefon ? () => onOeffnen(`tel:${telefon}`) : undefined} />
                  {b.email ? <Angabe titel="E-Mail" wert={b.email} onPress={() => onOeffnen(`mailto:${b.email}`)} /> : null}
                  <Angabe titel="Alter" wert={`${b.alter_jahre} Jahre`} />
                  <Angabe titel="Beruf" wert={b.beruf} />
                  {b.ort ? <Angabe titel="Wohnort" wert={b.ort} /> : null}
                  {b.social ? <Angabe titel="Kanal" wert={b.social} /> : null}
                  <Angabe titel="Gesendet" wert={vorZeit(b.erstellt_am)} />
                </Gitter>
              </Kachel>

              <TextKachel icon="sparkles" ton={TOENE.lila} titel="Was möchte die Person machen?" text={b.themen} />
              {b.erfahrung ? <TextKachel icon="trophy" ton={TOENE.gelb} titel="Erfahrung" text={b.erfahrung} /> : null}
              {b.notiz ? <TextKachel icon="chatbubble-ellipses" ton={TOENE.blau} titel="Deine Nachricht" text={b.notiz} /> : null}
            </>
          }
          rechts={
            <>
              {b.live_id ? (
                <Kachel style={{ padding: 24, gap: 16 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
                    <Symbol icon="radio" ton={TOENE.rot} groesse={44} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ ...n.schwarz, fontSize: 17, color: B.text }}>Gerade live</Text>
                      <Text style={{ ...n.halb, fontSize: 14, color: B.text2 }}>Du kannst das Live sofort für alle beenden.</Text>
                    </View>
                  </View>
                  <Knopf titel={knopfText("beenden", "Live sofort beenden")} icon="stop-circle" ton="rot" deaktiviert={beschaeftigt} onPress={onLiveBeenden} />
                </Kachel>
              ) : null}

              <Kachel style={{ padding: 24, gap: 18 }}>
                <Text style={{ ...n.schwarz, fontSize: 18, color: B.text }}>
                  {status === "offen" ? "Entscheidung" : status === "angenommen" ? "Zugang" : status === "zurueckgezogen" ? "Zurückgezogen" : "Freischalten"}
                </Text>

                {status === "zurueckgezogen" ? (
                  <Text style={{ ...n.halb, fontSize: 14.5, lineHeight: 21, color: B.text2 }}>Die Person hat die Bewerbung zurückgezogen.</Text>
                ) : (
                  <Eingabe
                    titel={status === "angenommen" ? "Nachricht beim Entziehen · optional" : "Nachricht an die Person · optional"}
                    mehrzeilig
                    value={notiz}
                    onChangeText={onNotiz}
                    placeholder="Kurze Nachricht für die Person"
                    maxLength={500}
                  />
                )}

                {status === "offen" ? (
                  <View style={{ gap: 12 }}>
                    <View style={{ flexDirection: "row", gap: 10 }}>
                      <Knopf titel={knopfText("annehmen", "Annehmen")} icon="checkmark" ton="gruen" deaktiviert={beschaeftigt} onPress={onAnnehmen} style={{ flex: 1 }} />
                      <Knopf titel={knopfText("ablehnen", "Ablehnen")} art="rand" ton="rot" deaktiviert={beschaeftigt} onPress={onAblehnen} style={{ flex: 1 }} />
                    </View>
                    <Text style={{ ...n.halb, fontSize: 13, lineHeight: 18, color: B.text3 }}>Angenommen darf die Person sofort live gehen und Clips hochladen.</Text>
                  </View>
                ) : null}

                {status === "angenommen" ? (
                  <View style={{ gap: 14 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: B.gruen }} />
                      <Text style={{ ...n.fett, fontSize: 14, color: B.text2 }}>Darf live gehen und Clips hochladen</Text>
                    </View>
                    <Knopf titel={knopfText("entziehen", "Zugang entziehen")} icon="ban" art="rand" ton="rot" deaktiviert={beschaeftigt} onPress={onEntziehen} />
                  </View>
                ) : null}

                {status === "abgelehnt" || status === "entzogen" ? <Knopf titel={knopfText("annehmen", "Doch freischalten")} icon="checkmark" art="rand" ton="gruen" deaktiviert={beschaeftigt} onPress={onAnnehmen} /> : null}
              </Kachel>
            </>
          }
        />
      </Spalte>
    </WebSeite>
  );
}

// ---------------------------------------------------------------------------
// Clip-Ersteller (Inhaber)
// ---------------------------------------------------------------------------

type ClipsStand = { fuer: string; clips: ClipEintrag[] | null; fehler: string | null };

/** Clips einer Person als Raster mit Vorschaubildern. */
function ClipRaster({ person }: { person: Ersteller }) {
  const [stand, setStand] = useState<ClipsStand>({ fuer: person.id, clips: null, fehler: null });
  const [versuch, setVersuch] = useState(0);

  useEffect(() => {
    let aktiv = true;
    setStand({ fuer: person.id, clips: null, fehler: null });
    clipsVonLaden(person.id, null, 24)
      .then((clips) => aktiv && setStand({ fuer: person.id, clips, fehler: null }))
      .catch((e: Error) => aktiv && setStand({ fuer: person.id, clips: null, fehler: e.message }));
    return () => {
      aktiv = false;
    };
  }, [person.id, versuch]);

  const name = person.name || `@${person.benutzername}`;
  const clips = stand.fuer === person.id ? stand.clips : null;

  return (
    <View>
      <Abschnitt titel={`Clips von ${name}`} link="Profil ansehen" onLink={() => router.push({ pathname: "/nutzer/[id]", params: { id: person.id } })} />
      {stand.fehler ? (
        <LadeFehler text={stand.fehler} onNochmal={() => setVersuch((v) => v + 1)} />
      ) : clips == null ? (
        <Laden />
      ) : clips.length === 0 ? (
        <Kachel>
          <Leer icon="film-outline" ton={TOENE.pink} titel="Noch keine Clips" text={`${name} hat bisher nichts hochgeladen.`} />
        </Kachel>
      ) : (
        <Raster min={150} max={6} abstand={14}>
          {clips.map((c) => (
            <Pressable key={c.id} onPress={() => router.push({ pathname: "/clip-ansicht", params: { nutzer: person.id, start: c.id } })} accessibilityLabel={c.titel || "Clip"} style={(z: Zustand) => ({ gap: 8, opacity: z.hovered ? 0.88 : 1 })}>
              <View style={{ aspectRatio: 9 / 16, borderRadius: 14, overflow: "hidden", backgroundColor: B.ton, alignItems: "center", justifyContent: "center" }}>
                {c.bild_pfad ? <Image source={{ uri: dateiUrl(c.bild_pfad) }} style={{ position: "absolute", width: "100%", height: "100%" }} resizeMode="cover" /> : <Icon name="play" size={28} color={B.text3} />}
              </View>
              <View style={{ gap: 1 }}>
                <Text style={{ ...n.fett, fontSize: 14, color: B.text }} numberOfLines={1}>
                  {c.titel || "Ohne Titel"}
                </Text>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                  <Icon name="heart" size={13} color={B.text3} />
                  <Text style={{ ...n.halb, fontSize: 12.5, color: B.text3, fontVariant: ["tabular-nums"] }}>
                    {zahlen(c.likes)} · {vorZeit(c.erstellt_am)}
                  </Text>
                </View>
              </View>
            </Pressable>
          ))}
        </Raster>
      )}
    </View>
  );
}

export function ClipErstellerWeb({
  inhaber,
  liste,
  fehler,
  onNeuLaden,
  kennung,
  onKennung,
  speichert,
  onHinzufuegen,
  onEntfernen,
}: {
  inhaber: boolean;
  liste: Ersteller[] | null;
  fehler: string | null;
  onNeuLaden: () => void;
  kennung: string;
  onKennung: (t: string) => void;
  speichert: boolean;
  onHinzufuegen: () => void;
  onEntfernen: (p: Ersteller) => void;
}) {
  const [gewaehlt, setGewaehlt] = useState<string | null>(null);
  if (!inhaber) return <NurInhaber titel="Clip-Ersteller" text="Hier legt der Inhaber der App fest, wer Clips hochladen darf." />;

  const person = liste?.find((p) => p.id === gewaehlt) ?? liste?.[0] ?? null;

  return (
    <WebSeite ohneRechts>
      <Spalte>
        <UnterKopf titel="Clip-Ersteller" unter="Wer Clips hochladen darf" />
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 24, alignItems: "flex-start" }}>
          {/* Freischalten */}
          <Kachel style={{ flex: 2, minWidth: 320, padding: 24, gap: 18 }}>
            <KartenKopf icon="person-add" ton={TOENE.orange} titel="Person freischalten" />
            <Text style={{ ...n.halb, fontSize: 14.5, lineHeight: 21, color: B.text2 }}>Wer hier steht, kann in Fahrschul Pro Clips hochladen. Du als Inhaber kannst es immer. Die Person braucht ein Konto – gib ihren Benutzernamen oder ihre E-Mail ein.</Text>
            <Eingabe icon="person-add-outline" value={kennung} onChangeText={onKennung} placeholder="Benutzername oder E-Mail" autoCapitalize="none" autoCorrect={false} keyboardType="email-address" returnKeyType="done" onSubmitEditing={onHinzufuegen} />
            <Knopf titel={speichert ? "Wird freigeschaltet …" : "Freischalten"} icon="checkmark" deaktiviert={!kennung.trim() || speichert} onPress={onHinzufuegen} />
          </Kachel>

          {/* Freigeschaltete Personen */}
          <Kachel style={{ flex: 3, minWidth: 420 }}>
            <View style={{ padding: 24, paddingBottom: 16, gap: 6 }}>
              <KartenKopf icon="people" ton={TOENE.pink} titel="Freigeschaltet" rechts={liste?.length ? <Text style={{ ...n.schwarz, fontSize: 16, color: B.text3, fontVariant: ["tabular-nums"] }}>{liste.length}</Text> : undefined} />
              {liste?.length ? <Text style={{ ...n.halb, fontSize: 14, color: B.text2 }}>Wähle eine Person, um ihre Clips zu sehen.</Text> : null}
            </View>
            {liste == null ? (
              fehler ? (
                <View style={{ padding: 24, paddingTop: 0, gap: 14 }}>
                  <Text style={{ ...n.halb, fontSize: 15, color: B.rotKante }}>{fehler}</Text>
                  <Knopf titel="Nochmal laden" art="rand" ton="blau" groesse="klein" onPress={onNeuLaden} style={{ alignSelf: "flex-start" }} />
                </View>
              ) : (
                <Laden />
              )
            ) : liste.length === 0 ? (
              <Leer icon="film-outline" ton={TOENE.pink} titel="Noch niemand" text="Bisher kannst nur du Clips hochladen." />
            ) : (
              <View style={{ paddingBottom: 8 }}>
                {liste.map((p) => {
                  const an = person?.id === p.id;
                  return (
                    <View key={p.id} style={{ flexDirection: "row", alignItems: "center", borderTopWidth: 1.5, borderTopColor: B.ton, backgroundColor: an ? B.hover : "transparent" }}>
                      <View style={{ position: "absolute", left: 0, top: 10, bottom: 10, width: 3, borderRadius: 2, backgroundColor: an ? B.orange : "transparent" }} />
                      <Pressable
                        onPress={() => setGewaehlt(p.id)}
                        accessibilityRole="button"
                        accessibilityState={{ selected: an }}
                        accessibilityLabel={`Clips von ${p.name || p.benutzername}`}
                        style={(z: Zustand) => ({ flex: 1, minWidth: 0, flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 12, paddingLeft: 24, paddingRight: 8, opacity: z.hovered && !an ? 0.8 : 1 })}
                      >
                        <NutzerBild pfad={p.bild_pfad} name={p.benutzername} farbe={p.avatar_farbe} groesse={44} rand={0} />
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <Text numberOfLines={1} style={{ ...n.fett, fontSize: 15.5, color: B.text }}>
                            {p.name || p.benutzername}
                          </Text>
                          <Text numberOfLines={1} style={{ ...n.halb, fontSize: 13.5, color: B.text3 }}>
                            @{p.benutzername} · {vorZeit(p.hinzugefuegt_am)}
                          </Text>
                        </View>
                      </Pressable>
                      <Pressable
                        onPress={() => onEntfernen(p)}
                        accessibilityRole="button"
                        accessibilityLabel={`${p.benutzername} entfernen`}
                        style={(z: Zustand) => ({ flexDirection: "row", alignItems: "center", gap: 6, height: 34, paddingHorizontal: 12, marginRight: 16, borderRadius: 10, backgroundColor: z.hovered ? B.rotHell : "transparent" })}
                      >
                        <Icon name="trash-outline" size={16} color={B.rotKante} />
                        <Text style={{ ...n.fett, fontSize: 13.5, color: B.rotKante }}>Entfernen</Text>
                      </Pressable>
                    </View>
                  );
                })}
              </View>
            )}
          </Kachel>
        </View>

        {person ? <ClipRaster person={person} /> : null}
      </Spalte>
    </WebSeite>
  );
}
