import type { ReactNode } from "react";
import { Linking, Pressable, Text, View } from "react-native";
import { router } from "expo-router";

import { Logo } from "@/components/grafik";
import { Icon } from "@/components/icon";
import { ProfilBild } from "@/components/profilbild";
import { tourStarten } from "@/components/tour";
import { B, Chip, Eingabe, Kachel, Knopf, ListenZeile, n, Raster, Reiter, Schalter, Spalte, TOENE, UnterKopf, type Ton, type Zustand, webDunkel } from "@/components/web/bunt";
import { WebSeite } from "@/components/web/rahmen";
import { BUNDESLAENDER } from "@/lib/bundeslaender";
import { STATUS_TEXT } from "@/lib/creator";
import { FRAGEN_AKTIV } from "@/lib/funktionen";
import { useEinstellungen, ZEITEN, ZIEL_STUFE, ZIELE } from "@/lib/einstellungen-aktionen";
import { uhrzeit } from "@/lib/format";
import { KLASSEN } from "@/lib/klassen";

// Einstellungen am PC: oben das Konto, darunter Tagesziel und Klasse
// nebeneinander, dann zwei Spalten mit ruhigen Gruppen (Zeilen mit Schaltern).
// Zustand und Aktionen kommen aus useEinstellungen – dieselben wie am Handy.

const SUPPORT = process.env.EXPO_PUBLIC_SUPPORT_EMAIL;

const GRAU: Ton = { farbe: "#8A8F96", kante: "#6E737A", hell: "#F0F1F2" };

/** Überschrift einer Gruppe mit optionalem Hinweis darunter. */
function Gruppe({ titel, hinweis, children, fuellen }: { titel: string; hinweis?: string; children: ReactNode; fuellen?: boolean }) {
  return (
    <View style={{ gap: 10, flex: fuellen ? 1 : undefined }}>
      <Text style={{ ...n.schwarz, fontSize: 17, color: B.text }}>{titel}</Text>
      {children}
      {hinweis ? <Text style={{ ...n.halb, fontSize: 13, lineHeight: 18, color: B.text3 }}>{hinweis}</Text> : null}
    </View>
  );
}

/** Wählbare Kapsel (Bundesland, Uhrzeit, Rolle). */
function Wahl({ text, aktiv, onPress }: { text: string; aktiv: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: aktiv }}
      style={(z: Zustand) => ({
        height: 36,
        paddingHorizontal: 14,
        borderRadius: 10,
        justifyContent: "center",
        borderWidth: 1.5,
        borderColor: aktiv ? B.orange : z.hovered ? B.kante : B.linie,
        backgroundColor: aktiv ? B.orangeHell : B.flaeche,
      })}
    >
      <Text style={{ ...n.fett, fontSize: 14, color: aktiv ? B.orangeKante : B.text }}>{text}</Text>
    </Pressable>
  );
}

/** Kleine Beschriftung über einem Feld. */
function Feldname({ children }: { children: string }) {
  return <Text style={{ ...n.fett, fontSize: 14, color: B.text2 }}>{children}</Text>;
}

export function EinstellungenWeb() {
  const e = useEinstellungen();
  const { stand, setzen, rechte, konto } = e;
  const { session, profil, gast, anzeigeName } = konto;
  const { darstellung, setzen: darstellungSetzen, belohnungen, belohnungenSetzen } = e.darstellung;
  const klasse = KLASSEN.find((k) => k.id === stand.klasse);

  const unterzeile = profil ? `@${profil.benutzername}` : gast ? "Gastmodus" : (session?.user.email ?? "");
  const benutzerFehler = e.benutzerGeaendert && (!e.benutzerGueltig || e.frei === false);

  return (
    <WebSeite ohneRechts>
      <Spalte>
        <UnterKopf titel="Einstellungen" unter={FRAGEN_AKTIV ? "Konto, Lernziel und Mitteilungen" : "Konto, Mitteilungen und Darstellung"} />

        {/* Konto */}
        <Kachel style={{ padding: 22, flexDirection: "row", alignItems: "center", gap: 18, flexWrap: "wrap" }}>
          <ProfilBild name={anzeigeName} groesse={64} rand={0} />
          <View style={{ flex: 1, minWidth: 220, gap: 6 }}>
            <View>
              <Text style={{ ...n.schwarz, fontSize: 22, color: B.text }} numberOfLines={1}>
                {anzeigeName}
              </Text>
              {unterzeile ? (
                <Text style={{ ...n.halb, fontSize: 14.5, color: B.text2 }} numberOfLines={1}>
                  {unterzeile}
                </Text>
              ) : null}
            </View>
            <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
              <Chip icon="car-sport" text={`Klasse ${stand.klasse}`} ton={TOENE.orange} />
              {profil?.rolle === "fahrlehrer" ? <Chip icon="school" text="Fahrlehrer" ton={TOENE.blau} /> : null}
              {profil?.bundesland ? <Chip icon="location" text={profil.bundesland} ton={TOENE.gruen} /> : null}
            </View>
          </View>
          {session ? null : (
            <View style={{ flexDirection: "row", gap: 10 }}>
              <Knopf titel="Anmelden" art="rand" ton="blau" onPress={() => router.push("/anmelden")} />
              <Knopf titel="Konto erstellen" ton="gruen" onPress={() => router.push("/registrieren")} />
            </View>
          )}
        </Kachel>

        {/* Tagesziel und Klasse */}
        <View style={{ flexDirection: "row", gap: 20, flexWrap: "wrap", alignItems: "stretch" }}>
          {FRAGEN_AKTIV ? (
          <View style={{ flex: 1, minWidth: 380, flexDirection: "row" }}>
            <Gruppe titel="Tagesziel" fuellen>
              <Kachel style={{ padding: 22, gap: 18, flex: 1 }}>
                <View>
                  <View style={{ flexDirection: "row", alignItems: "baseline", gap: 8 }}>
                    <Text style={{ ...n.schwarz, fontSize: 32, lineHeight: 38, color: B.text, fontVariant: ["tabular-nums"] }}>{stand.tagesziel}</Text>
                    <Text style={{ ...n.fett, fontSize: 15, color: B.text2 }}>Fragen am Tag</Text>
                  </View>
                  <Text style={{ ...n.halb, fontSize: 14, color: B.text3 }}>
                    {ZIEL_STUFE[stand.tagesziel] ?? "Eigenes Ziel"} · etwa {Math.round(stand.tagesziel / 2)} Minuten
                  </Text>
                </View>
                <View style={{ flexDirection: "row", gap: 10 }}>
                  {ZIELE.map((z) => {
                    const aktiv = stand.tagesziel === z;
                    return (
                      <Pressable
                        key={z}
                        onPress={() => setzen({ tagesziel: z })}
                        accessibilityRole="button"
                        accessibilityState={{ selected: aktiv }}
                        accessibilityLabel={`${z} Fragen am Tag`}
                        style={(s: Zustand) => ({
                          flex: 1,
                          paddingVertical: 10,
                          borderRadius: 14,
                          alignItems: "center",
                          borderWidth: 1.5,
                          borderColor: aktiv ? B.orange : s.hovered ? B.kante : B.linie,
                          borderBottomWidth: 3,
                          borderBottomColor: aktiv ? B.orangeKante : B.kante,
                          backgroundColor: aktiv ? B.orangeHell : B.flaeche,
                        })}
                      >
                        <Text style={{ ...n.schwarz, fontSize: 18, color: aktiv ? B.orangeKante : B.text, fontVariant: ["tabular-nums"] }}>{z}</Text>
                        <Text style={{ ...n.halb, fontSize: 12.5, color: aktiv ? B.orangeKante : B.text3 }}>{ZIEL_STUFE[z]}</Text>
                      </Pressable>
                    );
                  })}
                </View>
                <Text style={{ ...n.halb, fontSize: 13, color: B.text3 }}>Mit 30 Fragen am Tag bist du in wenigen Wochen prüfungsreif.</Text>
              </Kachel>
            </Gruppe>
          </View>
          ) : null}

          <View style={{ flex: 1, minWidth: 380, flexDirection: "row" }}>
            <Gruppe titel="Führerscheinklasse" fuellen>
              <Kachel style={{ padding: 22, gap: 16, flex: 1 }}>
                <View>
                  <Text style={{ ...n.schwarz, fontSize: 22, color: B.text }}>Klasse {stand.klasse}</Text>
                  <Text style={{ ...n.halb, fontSize: 14, color: B.text3 }}>{klasse?.text ?? ""}</Text>
                </View>
                <Raster min={40} max={8} abstand={8}>
                  {KLASSEN.map((k) => {
                    const aktiv = k.id === stand.klasse;
                    const S = k.symbol;
                    return (
                      <Pressable
                        key={k.id}
                        onPress={() => {
                          if (!aktiv) e.klasseAendern(k.id);
                        }}
                        accessibilityRole="button"
                        accessibilityState={{ selected: aktiv }}
                        accessibilityLabel={`Klasse ${k.id}, ${k.text}`}
                        style={(s: Zustand) => ({
                          height: 58,
                          borderRadius: 14,
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 2,
                          borderWidth: 1.5,
                          borderColor: aktiv ? B.orange : s.hovered ? B.kante : B.linie,
                          backgroundColor: aktiv ? B.orangeHell : B.flaeche,
                        })}
                      >
                        <S size={20} color={aktiv ? B.orange : B.text2} weight="fill" />
                        <Text style={{ ...n.fett, fontSize: 12.5, color: aktiv ? B.orangeKante : B.text }}>{k.id}</Text>
                      </Pressable>
                    );
                  })}
                </Raster>
              </Kachel>
            </Gruppe>
          </View>
        </View>

        {/* Zwei Spalten mit Gruppen */}
        <View style={{ flexDirection: "row", gap: 20, flexWrap: "wrap", alignItems: "flex-start" }}>
          <View style={{ flex: 1, minWidth: 380, gap: 28 }}>
            <Gruppe titel="Profil">
              <Kachel style={{ padding: 22, gap: 18 }}>
                {profil ? (
                  <View style={{ gap: 8 }}>
                    <Feldname>Ich bin</Feldname>
                    <View style={{ flexDirection: "row", gap: 8 }}>
                      {(
                        [
                          ["schueler", "Fahrschüler"],
                          ["fahrlehrer", "Fahrlehrer"],
                        ] as const
                      ).map(([id, titel]) => (
                        <Wahl key={id} text={titel} aktiv={profil.rolle === id} onPress={() => e.rolleWaehlen(id)} />
                      ))}
                    </View>
                  </View>
                ) : null}

                <View style={{ gap: 10 }}>
                  <Eingabe titel="Name – so begrüßt dich die App" icon="person-outline" value={e.name} onChangeText={e.nameTippen} placeholder="Dein Name" autoCapitalize="words" maxLength={40} />
                  {e.name.trim() && e.name.trim() !== anzeigeName ? <Knopf titel={e.speichert ? "Speichert …" : "Namen speichern"} groesse="klein" deaktiviert={e.speichert} onPress={e.nameSpeichern} style={{ alignSelf: "flex-start" }} /> : null}
                </View>

                {profil ? (
                  <View style={{ gap: 8 }}>
                    <Eingabe titel="Benutzername – für Rangliste, Clips und Kommentare" icon="at" value={e.benutzer} onChangeText={e.benutzerTippen} placeholder="benutzername" autoCapitalize="none" autoCorrect={false} />
                    {e.benutzerGeaendert ? <Text style={{ ...n.halb, fontSize: 13, color: benutzerFehler ? B.rotKante : e.frei ? B.gruenKante : B.text3 }}>{!e.benutzerGueltig ? "3–20 Zeichen: Buchstaben, Zahlen, Punkt und Unterstrich." : e.frei === false ? "Dieser Benutzername ist schon vergeben." : e.frei ? "Der Benutzername ist frei." : "Prüfe, ob der Name frei ist …"}</Text> : null}
                    {e.benutzerGeaendert ? <Knopf titel={e.speichertBenutzer ? "Speichert …" : "Benutzernamen speichern"} groesse="klein" deaktiviert={e.speichertBenutzer || !e.benutzerGueltig || e.frei !== true} onPress={e.benutzerSpeichern} style={{ alignSelf: "flex-start" }} /> : null}
                  </View>
                ) : null}
              </Kachel>
            </Gruppe>

            <Gruppe titel="Konto">
              {session ? (
                <Kachel>
                  <ListenZeile icon="mail" ton={TOENE.blau} titel={session.user.email ?? ""} unter="E-Mail · Anmelden mit Code" />
                  <ListenZeile
                    icon="ban"
                    ton={GRAU}
                    titel="Blockierte Personen"
                    unter={e.blockiert.size ? `${e.blockiert.size} ${e.blockiert.size === 1 ? "Person" : "Personen"}` : "Niemand blockiert"}
                    onPress={() => router.push("/blockiert")}
                    oben
                  />
                </Kachel>
              ) : (
                <Kachel>
                  <ListenZeile icon="person-add" ton={TOENE.orange} titel="Konto erstellen" unter={gast ? (FRAGEN_AKTIV ? "Sichert deinen Fortschritt, schaltet Liga, Likes und Kommentare frei" : "Schaltet Likes, Kommentare und dein Profilbild frei") : undefined} onPress={() => router.push("/registrieren")} />
                  <ListenZeile icon="log-in" ton={TOENE.blau} titel="Ich habe schon ein Konto" onPress={() => router.push("/anmelden")} oben />
                </Kachel>
              )}
            </Gruppe>

            {session ? (
              <Gruppe titel="Bundesland" hinweis={FRAGEN_AKTIV ? "Für die regionale Rangliste in der Liga." : "Freiwillig – erscheint in deinem Profil."}>
                <Kachel style={{ padding: 18, flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                  {BUNDESLAENDER.map((b) => (
                    <Wahl key={b} text={b} aktiv={profil?.bundesland === b} onPress={() => e.bundeslandWaehlen(b)} />
                  ))}
                </Kachel>
              </Gruppe>
            ) : null}

            <Gruppe titel="Mitteilungen">
              <Kachel>
                <ListenZeile icon="notifications" ton={TOENE.rot} titel="Tägliche Erinnerung" unter={stand.erinnerung.an ? `Jeden Tag um ${uhrzeit(stand.erinnerung.stunde, stand.erinnerung.minute)} Uhr` : "Aus"} rechts={<Schalter wert={stand.erinnerung.an} onWechsel={(an) => e.erinnerungAendern(an)} />} />
                {stand.erinnerung.an ? (
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, paddingHorizontal: 18, paddingBottom: 16, paddingLeft: 70 }}>
                    {ZEITEN.map(([h, m]) => (
                      <Wahl key={`${h}:${m}`} text={uhrzeit(h, m)} aktiv={stand.erinnerung.stunde === h && stand.erinnerung.minute === m} onPress={() => e.erinnerungAendern(true, h, m)} />
                    ))}
                  </View>
                ) : null}
                {session ? <ListenZeile icon="radio" ton={TOENE.lila} titel="Live-Streams" unter={e.liveAbo ? "Mitteilung, sobald ein Live startet" : "Aus"} rechts={<Schalter wert={e.liveAbo} onWechsel={e.liveAboAendern} />} oben /> : null}
              </Kachel>
            </Gruppe>
          </View>

          <View style={{ flex: 1, minWidth: 380, gap: 28 }}>
            <Gruppe titel="Darstellung">
              <Kachel>
                <ListenZeile
                  icon={darstellung === "hell" ? "sunny" : "moon"}
                  ton={darstellung === "hell" ? TOENE.gelb : TOENE.indigo}
                  titel={darstellung === "hell" ? "Tagfahrt" : "Nachtfahrt"}
                  unter="Gilt für dieses Gerät"
                  rechts={
                    <Reiter
                      optionen={[
                        { id: "hell", titel: "Hell" },
                        { id: "dunkel", titel: "Dunkel" },
                      ]}
                      wert={darstellung}
                      onWechsel={(d) => {
                        if (d !== darstellung) darstellungSetzen(d);
                      }}
                    />
                  }
                />
                <ListenZeile icon="color-palette" ton={TOENE.lila} titel="App-Icon" unter="Dein Lenkrad für den Homescreen" rechts={<Wert text={e.iconTitel} />} onPress={() => router.push("/app-icon")} oben />
                {FRAGEN_AKTIV ? (
                  <ListenZeile icon="flash" ton={TOENE.orange} titel="XP, HP & Abzeichen einblenden" unter={belohnungen ? "Beim Lernen und in den Ergebnissen sichtbar" : "Aus – keine Einblendungen beim Lernen"} rechts={<Schalter wert={belohnungen} onWechsel={belohnungenSetzen} />} oben />
                ) : null}
              </Kachel>
            </Gruppe>

            {rechte.ersteller || session ? (
              <Gruppe titel="Creator">
                <Kachel>
                  {rechte.ersteller ? <ListenZeile icon="film" ton={TOENE.pink} titel="Clip hochladen" unter="Kurzes Video für alle im Clips-Tab" onPress={() => router.push("/clip-hochladen")} /> : null}
                  {rechte.inhaber ? <ListenZeile icon="people" ton={TOENE.blau} titel="Clip-Ersteller verwalten" unter="Wer außer dir Videos hochladen darf" onPress={() => router.push("/clip-ersteller")} oben /> : null}
                  {session ? (
                    rechte.inhaber ? (
                      <ListenZeile icon="radio" ton={TOENE.rot} titel="Creator-Bewerbungen" unter={e.offeneBewerbungen ? `${e.offeneBewerbungen} offen` : "Wer live gehen und Clips hochladen darf"} onPress={() => router.push("/creator-verwaltung")} oben={rechte.ersteller} />
                    ) : (
                      <ListenZeile icon="radio" ton={TOENE.rot} titel={e.meineBewerbung?.status === "angenommen" ? "Creator" : "Creator werden"} unter={e.meineBewerbung && e.meineBewerbung.status !== "zurueckgezogen" ? STATUS_TEXT[e.meineBewerbung.status] : "Live gehen und Clips hochladen"} onPress={() => router.push("/creator-bewerbung")} oben={rechte.ersteller} />
                    )
                  ) : null}
                </Kachel>
              </Gruppe>
            ) : null}

            {rechte.inhaber ? (
              <Gruppe titel="Lernen">
                <Kachel>
                  <ListenZeile icon="play-circle" ton={TOENE.orange} titel="Erklärvideos" unter="Videos zu einzelnen Fragen – erscheinen beim Lernen" onPress={() => router.push("/erklaervideos")} />
                  <ListenZeile icon="grid" ton={TOENE.lila} titel="Manager" unter="Zugänge anlegen und sperren, Videos zu Themen hochladen" onPress={() => router.push("/manager")} oben />
                </Kachel>
              </Gruppe>
            ) : null}

            <Gruppe titel="Hilfe & Rechtliches">
              <Kachel>
                {[
                  SUPPORT ? <ListenZeile key="hilfe" icon="help-buoy" ton={TOENE.gruen} titel="Hilfe & Kontakt" onPress={() => Linking.openURL(`mailto:${SUPPORT}`)} /> : null,
                  <ListenZeile key="ds" icon="shield-checkmark" ton={TOENE.blau} titel="Datenschutz" onPress={() => router.push("/datenschutz")} />,
                  <ListenZeile key="imp" icon="document-text" ton={GRAU} titel="Impressum" onPress={() => router.push("/impressum")} />,
                  <ListenZeile key="nb" icon="reader" ton={GRAU} titel="Nutzungsbedingungen" onPress={() => router.push("/nutzungsbedingungen")} />,
                  <ListenZeile
                    key="tour"
                    icon="sparkles"
                    ton={TOENE.orange}
                    titel="App-Tour ansehen"
                    unter="Die wichtigsten Stellen kurz erklärt"
                    onPress={() => {
                      router.navigate("/heute");
                      setTimeout(tourStarten, 450);
                    }}
                  />,
                  <ListenZeile key="einr" icon="options" ton={TOENE.blau} titel="Einrichtung wiederholen" unter={FRAGEN_AKTIV ? "Klasse, Prüfungstermin, Tagesziel, Darstellung" : "Klasse, Prüfungstermin, Erinnerung, Darstellung"} onPress={() => router.push("/einrichtung")} />,
                  <ListenZeile key="bild" icon="images" ton={TOENE.gelb} titel="Bildnachweise" onPress={() => router.push("/bildnachweise")} />,
                ]
                  .filter(Boolean)
                  .map((z, i) => (
                    <View key={i} style={i ? { borderTopWidth: 1.5, borderTopColor: B.ton } : null}>
                      {z}
                    </View>
                  ))}
              </Kachel>
            </Gruppe>

            <Gruppe titel="Daten">
              <Kachel>
                <ListenZeile icon="refresh-circle" titel="Fortschritt zurücksetzen" unter={FRAGEN_AKTIV ? "Antworten, Serien, Abzeichen" : "Gespeicherter Fortschritt auf diesem Gerät"} gefahr rechts={<View />} onPress={e.zuruecksetzenFragen} />
                {session ? (
                  <ListenZeile
                    icon="trash"
                    titel={e.loeschtKonto ? "Konto wird gelöscht …" : "Konto löschen"}
                    unter="Konto und alle Daten endgültig entfernen"
                    gefahr
                    rechts={<View />}
                    onPress={e.loeschtKonto ? () => {} : e.kontoLoeschenFragen}
                    oben
                  />
                ) : null}
              </Kachel>
            </Gruppe>
          </View>
        </View>

        <View style={{ alignItems: "center", gap: 8, marginTop: 8 }}>
          <Logo groesse={24} hell={!webDunkel()} />
          <Text style={{ ...n.halb, fontSize: 13, color: B.text3 }}>{FRAGEN_AKTIV ? "Version 1.0 · Beispielfragen, nicht der amtliche Katalog" : "Version 1.0"}</Text>
        </View>
      </Spalte>
    </WebSeite>
  );
}

/** Wert rechts in einer Zeile, mit Pfeil. */
function Wert({ text }: { text: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
      <Text style={{ ...n.halb, fontSize: 14.5, color: B.text2 }}>{text}</Text>
      <Icon name="chevron-forward" size={18} color={B.text3} />
    </View>
  );
}
