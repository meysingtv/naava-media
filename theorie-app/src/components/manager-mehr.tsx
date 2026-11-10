import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { Image, Linking, Platform, Pressable, Text, useWindowDimensions, View } from "react-native";
import { router } from "expo-router";

import { QrCode } from "@/components/crew";
import { dialog } from "@/components/dialog";
import { Icon, type IconName } from "@/components/icon";
import { Auswahl, Balken, Drehung, Feld, Fenster, Hinweis, IconTaste, Kennzahlen, MAvatar, MEingabe, MKnopf, Reiter, Tafel, wannText, Zeile, type Zustand } from "@/components/manager-teile";
import { B, n, Symbol, THEMA_TON, TOENE, type Ton } from "@/components/web/bunt";
import { creatorEntscheiden, useBewerbungen } from "@/lib/creator";
import { FRAGEN, THEMEN, type ThemaId } from "@/lib/fragen";
import type { ManagerNutzer } from "@/lib/manager";
import {
  clipDateiUrl,
  einladungBeenden,
  einladungenLaden,
  einladungErstellen,
  einladungLink,
  fahrlehrerEntscheiden,
  fahrlehrerFreigaben,
  lernstandLaden,
  meldungEntscheiden,
  meldungenLaden,
  mitteilungenLaden,
  mitteilungSenden,
  pruefungstermineLaden,
  type ChatMeldung,
  type ClipMeldung,
  type Einladung,
  type Lernstand,
  type Meldungen,
  type MitteilungZiel,
} from "@/lib/verwaltung";

// Weitere Bereiche der Verwaltung (Web-Panel /manager): Meldungen, Freigaben,
// Einladungen, Prüfungstermine, Mitteilungen und der Lernstand im Zugang.

// ---------------------------------------------------------------------------
// Hilfen
// ---------------------------------------------------------------------------

/** Lädt Daten, merkt Fehler und bietet Neuladen. */
function useDaten<T>(laden: () => Promise<T>, tick = 0): { daten: T | null; fehler: string | null; laedt: boolean; neu: () => Promise<void> } {
  const [daten, setDaten] = useState<T | null>(null);
  const [fehler, setFehler] = useState<string | null>(null);
  const [laedt, setLaedt] = useState(false);
  const neu = useCallback(async () => {
    setLaedt(true);
    try {
      setDaten(await laden());
      setFehler(null);
    } catch (e) {
      setFehler(e instanceof Error ? e.message : String(e));
    } finally {
      setLaedt(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    neu();
  }, [neu, tick]);
  return { daten, fehler, laedt, neu };
}

function Laden() {
  return (
    <View style={{ alignItems: "center", paddingVertical: 48, gap: 12 }}>
      <Drehung farbe={B.orange} groesse={24} />
      <Text style={{ ...n.fett, fontSize: 14.5, color: B.text3 }}>Wird geladen …</Text>
    </View>
  );
}

/** Leerer Zustand in einer Tafel: großes farbiges Symbol, Titel, Text. */
function LeerTafel({ icon, ton, titel, text }: { icon: IconName; ton: Ton; titel: string; text?: string }) {
  return (
    <View style={{ alignItems: "center", paddingVertical: 36, paddingHorizontal: 24, gap: 10 }}>
      <Symbol icon={icon} ton={ton} groesse={56} />
      <Text style={{ ...n.schwarz, fontSize: 18, color: B.text, textAlign: "center" }}>{titel}</Text>
      {text ? <Text style={{ ...n.halb, fontSize: 14.5, lineHeight: 20, color: B.text2, textAlign: "center", maxWidth: 420 }}>{text}</Text> : null}
    </View>
  );
}

/** Kleine farbige Kapsel mit Text. */
function Marke({ text, ton, icon }: { text: string; ton: Ton; icon?: IconName }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 5, height: 26, paddingHorizontal: 10, borderRadius: 13, backgroundColor: ton.hell }}>
      {icon ? <Icon name={icon} size={13} color={ton.kante} /> : null}
      <Text style={{ ...n.fett, fontSize: 12.5, color: ton.kante }} numberOfLines={1}>
        {text}
      </Text>
    </View>
  );
}

function datumKurz(iso: string): string {
  return new Date(iso).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function useBreit(ab = 1180): boolean {
  return useWindowDimensions().width >= ab;
}

// ---------------------------------------------------------------------------
// Meldungen
// ---------------------------------------------------------------------------

const GRUENDE = ["Beleidigung oder Hass", "Gefährliches Verhalten im Verkehr", "Falsche Verkehrsregeln", "Werbung oder Spam", "Fremde Inhalte (Urheberrecht)", "Persönliche Daten anderer"];

type Offen = { art: "clip"; m: ClipMeldung } | { art: "chat"; m: ChatMeldung };

export function MeldungenBereich({ onGeaendert, tick }: { onGeaendert?: () => void; tick?: number }) {
  const { daten, fehler, neu } = useDaten<Meldungen>(meldungenLaden, tick);
  const [reiter, setReiter] = useState<"offen" | "erledigt">("offen");
  const [entfernen, setEntfernen] = useState<Offen | null>(null);
  const [begruendung, setBegruendung] = useState("");
  const [laeuft, setLaeuft] = useState<string | null>(null);
  const [meldung, setMeldung] = useState<{ art: "ok" | "fehler"; text: string } | null>(null);

  if (fehler && !daten) return <Hinweis art="fehler">{fehler}</Hinweis>;
  if (!daten) return <Laden />;

  const offen: Offen[] = [...daten.clips.map((m) => ({ art: "clip" as const, m })), ...daten.chat.map((m) => ({ art: "chat" as const, m }))].sort((a, b) => Date.parse(b.m.letzte) - Date.parse(a.m.letzte));

  async function entscheiden(o: Offen, loeschen: boolean, text: string) {
    const schluessel = `${o.art}-${o.m.id}`;
    setLaeuft(schluessel);
    setMeldung(null);
    try {
      await meldungEntscheiden(o.art, o.m.id, loeschen, text);
      setMeldung({ art: "ok", text: loeschen ? "Entfernt. Der Verfasser hat deine Begründung bekommen." : "Behalten. Wer gemeldet hat, bekommt eine kurze Rückmeldung." });
      setEntfernen(null);
      setBegruendung("");
      await neu();
      onGeaendert?.();
    } catch (e) {
      setMeldung({ art: "fehler", text: e instanceof Error ? e.message : String(e) });
    } finally {
      setLaeuft(null);
    }
  }

  return (
    <View style={{ gap: 20 }}>
      <View style={{ flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <Reiter
          optionen={[
            { id: "offen", titel: "Offen", zahl: offen.length },
            { id: "erledigt", titel: "Erledigt", zahl: daten.erledigt.length },
          ]}
          wert={reiter}
          onWechsel={setReiter}
        />
      </View>
      <Hinweis>Entfernst du etwas, bekommt der Verfasser deine Begründung in der App. Wer gemeldet hat, erfährt in beiden Fällen, dass geprüft wurde. So verlangt es der Digital Services Act.</Hinweis>
      {meldung ? <Hinweis art={meldung.art}>{meldung.text}</Hinweis> : null}

      {reiter === "offen" ? (
        offen.length === 0 ? (
          <Tafel innen={false}>
            <LeerTafel icon="shield-checkmark" ton={TOENE.gruen} titel="Keine offenen Meldungen" text="Sobald jemand einen Clip oder eine Chat-Nachricht meldet, siehst du es hier." />
          </Tafel>
        ) : (
          offen.map((o) => <MeldungKarte key={`${o.art}-${o.m.id}`} o={o} laeuft={laeuft === `${o.art}-${o.m.id}`} onBehalten={() => entscheiden(o, false, "")} onEntfernen={() => setEntfernen(o)} />)
        )
      ) : daten.erledigt.length === 0 ? (
        <Tafel innen={false}>
          <LeerTafel icon="archive" ton={TOENE.blau} titel="Noch nichts entschieden" />
        </Tafel>
      ) : (
        <Tafel titel="Zuletzt entschieden" icon="archive" ton={TOENE.blau} innen={false}>
          {daten.erledigt.map((d, i) => (
            <Zeile key={d.id} oben={i > 0} style={{ minHeight: 64, paddingVertical: 10 }}>
              <Symbol icon={d.art === "clip" ? "film" : "chatbubble"} ton={d.entscheidung === "entfernt" ? TOENE.rot : TOENE.gruen} groesse={36} />
              <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                <Text style={{ ...n.fett, fontSize: 14.5, color: B.text }} numberOfLines={1}>
                  {d.inhalt || (d.art === "clip" ? "Clip" : "Chat-Nachricht")}
                </Text>
                <Text style={{ ...n.halb, fontSize: 13, color: B.text3 }} numberOfLines={1}>
                  {d.autor_name ? `von ${d.autor_name}, ` : ""}
                  {d.meldungen === 1 ? "1 Meldung" : `${d.meldungen} Meldungen`}
                  {d.begruendung ? `, Grund: ${d.begruendung}` : ""}
                </Text>
              </View>
              <Marke text={d.entscheidung === "entfernt" ? "Entfernt" : "Behalten"} ton={d.entscheidung === "entfernt" ? TOENE.rot : TOENE.gruen} />
              <Text style={{ width: 92, textAlign: "right", ...n.halb, fontSize: 13, color: B.text3 }}>{wannText(d.am)}</Text>
            </Zeile>
          ))}
        </Tafel>
      )}

      {entfernen ? (
        <FensterEntfernen
          o={entfernen}
          begruendung={begruendung}
          onBegruendung={setBegruendung}
          laeuft={laeuft === `${entfernen.art}-${entfernen.m.id}`}
          onAbbrechen={() => {
            setEntfernen(null);
            setBegruendung("");
          }}
          onBestaetigen={() => entscheiden(entfernen, true, begruendung)}
        />
      ) : null}
    </View>
  );
}

function MeldungKarte({ o, laeuft, onBehalten, onEntfernen }: { o: Offen; laeuft: boolean; onBehalten: () => void; onEntfernen: () => void }) {
  const clip = o.art === "clip" ? o.m : null;
  const chat = o.art === "chat" ? o.m : null;
  const m = o.m;
  return (
    <Tafel innen={false}>
      <View style={{ flexDirection: "row", gap: 18, padding: 20, flexWrap: "wrap" }}>
        {clip ? (
          <Pressable onPress={() => Linking.openURL(clipDateiUrl(clip.video_pfad))} accessibilityLabel="Video ansehen" style={{ width: 108, height: 150, borderRadius: 14, overflow: "hidden", backgroundColor: B.ton, alignItems: "center", justifyContent: "center" }}>
            {clip.bild_pfad ? <Image source={{ uri: clipDateiUrl(clip.bild_pfad) }} style={{ position: "absolute", width: "100%", height: "100%" }} resizeMode="cover" /> : null}
            <View style={{ width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.45)" }}>
              <Icon name="play" size={18} color="#FFFFFF" />
            </View>
          </Pressable>
        ) : (
          <Symbol icon="chatbubble-ellipses" ton={TOENE.indigo} groesse={52} />
        )}
        <View style={{ flex: 1, minWidth: 260, gap: 10 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <Marke text={clip ? "Clip" : `Live-Chat: ${chat?.live}`} ton={clip ? TOENE.pink : TOENE.indigo} icon={clip ? "film" : "radio"} />
            <Marke text={m.anzahl === 1 ? "1× gemeldet" : `${m.anzahl}× gemeldet`} ton={m.anzahl >= 3 ? TOENE.rot : TOENE.bernstein} icon="flag" />
            <Text style={{ ...n.halb, fontSize: 13, color: B.text3 }}>zuletzt {wannText(m.letzte)}</Text>
          </View>
          {clip ? (
            <Text style={{ ...n.schwarz, fontSize: 18, color: B.text }} numberOfLines={2}>
              {clip.titel}
            </Text>
          ) : (
            <View style={{ alignSelf: "flex-start", maxWidth: "100%", paddingHorizontal: 14, paddingVertical: 10, borderRadius: 14, borderTopLeftRadius: 4, backgroundColor: B.ton }}>
              <Text style={{ ...n.fett, fontSize: 15.5, lineHeight: 21, color: B.text }}>{chat?.text}</Text>
            </View>
          )}
          <Text style={{ ...n.halb, fontSize: 13.5, color: B.text2 }}>
            von <Text style={{ ...n.fett, color: B.text }}>{m.autor_name || "unbekannt"}</Text>
            {clip?.autor_benutzer ? ` (@${clip.autor_benutzer})` : ""}, {wannText(m.erstellt_am)}
          </Text>
          <View style={{ gap: 6 }}>
            {m.gruende.slice(0, 4).map((g, i) => (
              <View key={i} style={{ flexDirection: "row", gap: 8, alignItems: "flex-start" }}>
                <Icon name="flag" size={14} color={B.rot} style={{ marginTop: 2 }} />
                <Text style={{ flex: 1, ...n.halb, fontSize: 13.5, lineHeight: 19, color: B.text2 }}>
                  {g.grund ? `„${g.grund}“` : "ohne Grund"}
                  <Text style={{ color: B.text3 }}>{g.von ? ` – ${g.von}` : ""}</Text>
                </Text>
              </View>
            ))}
            {m.gruende.length > 4 ? <Text style={{ ...n.halb, fontSize: 13, color: B.text3 }}>und {m.gruende.length - 4} weitere</Text> : null}
          </View>
        </View>
        <View style={{ gap: 10, justifyContent: "center", minWidth: 150 }}>
          {clip ? <MKnopf titel="Video ansehen" icon="play-circle" art="sekundaer" onPress={() => Linking.openURL(clipDateiUrl(clip.video_pfad))} /> : null}
          <MKnopf titel="Behalten" icon="checkmark" art="sekundaer" onPress={onBehalten} laedt={laeuft} />
          <MKnopf titel="Entfernen" icon="trash" art="gefahr" onPress={onEntfernen} deaktiviert={laeuft} />
        </View>
      </View>
    </Tafel>
  );
}

function FensterEntfernen({ o, begruendung, onBegruendung, laeuft, onAbbrechen, onBestaetigen }: { o: Offen; begruendung: string; onBegruendung: (t: string) => void; laeuft: boolean; onAbbrechen: () => void; onBestaetigen: () => void }) {
  return (
    <Fenster
      offen
      onSchliessen={onAbbrechen}
      titel={o.art === "clip" ? "Clip entfernen" : "Nachricht entfernen"}
      unter={`Die Begründung bekommt ${o.m.autor_name || "der Verfasser"} in der App.`}
      fuss={
        <>
          <MKnopf titel="Abbrechen" art="leise" onPress={onAbbrechen} />
          <MKnopf titel="Entfernen" icon="trash" art="gefahr" onPress={onBestaetigen} laedt={laeuft} deaktiviert={begruendung.trim().length < 5} />
        </>
      }
    >
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {GRUENDE.map((g) => (
          <Pressable key={g} onPress={() => onBegruendung(g + ".")} style={(z: Zustand) => ({ height: 32, paddingHorizontal: 12, borderRadius: 16, justifyContent: "center", backgroundColor: z.hovered ? TOENE.rot.hell : B.ton })}>
            <Text style={{ ...n.fett, fontSize: 13, color: B.text2 }}>{g}</Text>
          </Pressable>
        ))}
      </View>
      <Feld titel="Begründung" hinweis="Kurz und sachlich: welcher Regel der Inhalt widerspricht.">
        <MEingabe mehrzeilig value={begruendung} onChangeText={onBegruendung} placeholder="z. B. Beleidigende Sprache verstößt gegen die Nutzungsbedingungen." maxLength={1000} />
      </Feld>
    </Fenster>
  );
}

// ---------------------------------------------------------------------------
// Freigaben: Fahrlehrer bestätigen, Creator-Bewerbungen
// ---------------------------------------------------------------------------

export function FreigabenBereich({ onGeaendert, tick }: { onGeaendert?: () => void; tick?: number }) {
  const freigaben = useDaten(fahrlehrerFreigaben, tick);
  const bewerbungen = useBewerbungen(true);
  const [laeuft, setLaeuft] = useState<string | null>(null);
  const [meldung, setMeldung] = useState<{ art: "ok" | "fehler"; text: string } | null>(null);
  const breit = useBreit();

  async function machen(schluessel: string, arbeit: () => Promise<void>, ok: string) {
    setLaeuft(schluessel);
    setMeldung(null);
    try {
      await arbeit();
      setMeldung({ art: "ok", text: ok });
      await Promise.all([freigaben.neu(), bewerbungen.neuLaden()]);
      onGeaendert?.();
    } catch (e) {
      setMeldung({ art: "fehler", text: e instanceof Error ? e.message : String(e) });
    } finally {
      setLaeuft(null);
    }
  }

  const offeneLehrer = (freigaben.daten ?? []).filter((f) => f.status === "offen");
  const abgelehnt = (freigaben.daten ?? []).filter((f) => f.status === "abgelehnt");
  const offeneBewerbungen = (bewerbungen.liste ?? []).filter((b) => b.status === "offen");

  const lehrerTafel = (
    <Tafel titel="Neue Fahrlehrer" icon="id-card" ton={TOENE.lila} zusatz={offeneLehrer.length ? String(offeneLehrer.length) : undefined} innen={false} style={{ flex: breit ? 1 : undefined }}>
      {freigaben.fehler ? (
        <View style={{ padding: 20 }}>
          <Hinweis art="fehler">{freigaben.fehler}</Hinweis>
        </View>
      ) : !freigaben.daten ? (
        <Laden />
      ) : offeneLehrer.length === 0 ? (
        <LeerTafel icon="id-card" ton={TOENE.lila} titel="Niemand wartet" text="Wer sich in der App als Fahrlehrer registriert, erscheint hier. Erst nach deiner Bestätigung darf die Person Clips hochladen." />
      ) : (
        offeneLehrer.map((f, i) => (
          <Zeile key={f.user_id} oben={i > 0} style={{ minHeight: 76, paddingVertical: 12 }}>
            <MAvatar pfad={null} name={f.name || f.benutzername} groesse={42} />
            <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
              <Text style={{ ...n.fett, fontSize: 15.5, color: B.text }} numberOfLines={1}>
                {f.name || f.benutzername}
              </Text>
              <Text style={{ ...n.halb, fontSize: 13, color: B.text3 }} numberOfLines={1}>
                {f.email} · {wannText(f.erstellt_am)}
              </Text>
            </View>
            <MKnopf titel="Ablehnen" art="gefahr" onPress={() => machen(`l-${f.user_id}`, () => fahrlehrerEntscheiden(f.user_id, false), `${f.name || f.benutzername} nutzt die App jetzt als Fahrschüler.`)} deaktiviert={laeuft != null} />
            <MKnopf titel="Bestätigen" icon="checkmark" onPress={() => machen(`b-${f.user_id}`, () => fahrlehrerEntscheiden(f.user_id, true), `${f.name || f.benutzername} ist jetzt als Fahrlehrer bestätigt.`)} laedt={laeuft === `b-${f.user_id}`} />
          </Zeile>
        ))
      )}
      {abgelehnt.length ? (
        <View style={{ paddingHorizontal: 20, paddingVertical: 12, borderTopWidth: 1.5, borderTopColor: B.ton }}>
          <Text style={{ ...n.halb, fontSize: 13, color: B.text3 }}>Zuletzt abgelehnt: {abgelehnt.map((a) => a.name || a.benutzername).join(", ")}</Text>
        </View>
      ) : null}
    </Tafel>
  );

  const creatorTafel = (
    <Tafel titel="Creator-Bewerbungen" icon="videocam" ton={TOENE.pink} zusatz={offeneBewerbungen.length ? String(offeneBewerbungen.length) : undefined} rechts={<MKnopf titel="Alle" art="leise" onPress={() => router.push("/creator-verwaltung")} />} innen={false} style={{ flex: breit ? 1 : undefined }}>
      {bewerbungen.fehler ? (
        <View style={{ padding: 20 }}>
          <Hinweis art="fehler">{bewerbungen.fehler}</Hinweis>
        </View>
      ) : !bewerbungen.liste ? (
        <Laden />
      ) : offeneBewerbungen.length === 0 ? (
        <LeerTafel icon="videocam" ton={TOENE.pink} titel="Keine offenen Bewerbungen" text="Wer live gehen und Clips machen möchte, bewirbt sich in der App. Hier nimmst du an oder lehnst ab." />
      ) : (
        offeneBewerbungen.map((b, i) => (
          <View key={b.id} style={{ padding: 20, gap: 10, borderTopWidth: i > 0 ? 1.5 : 0, borderTopColor: B.ton }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <MAvatar pfad={b.bild_pfad} name={b.name} groesse={42} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={{ ...n.fett, fontSize: 15.5, color: B.text }} numberOfLines={1}>
                  {b.name}
                </Text>
                <Text style={{ ...n.halb, fontSize: 13, color: B.text3 }} numberOfLines={1}>
                  {[b.beruf, b.ort, `${b.alter_jahre} Jahre`].filter(Boolean).join(" · ")}
                </Text>
              </View>
              <Text style={{ ...n.halb, fontSize: 13, color: B.text3 }}>{wannText(b.erstellt_am)}</Text>
            </View>
            <Text style={{ ...n.halb, fontSize: 14, lineHeight: 20, color: B.text2 }} numberOfLines={3}>
              {b.themen}
            </Text>
            <View style={{ flexDirection: "row", gap: 10, justifyContent: "flex-end" }}>
              <MKnopf titel="Ablehnen" art="gefahr" onPress={() => machen(`c-${b.id}`, () => creatorEntscheiden(b.id, false, ""), `Bewerbung von ${b.name} abgelehnt.`)} deaktiviert={laeuft != null} />
              <MKnopf titel="Annehmen" icon="checkmark" onPress={() => machen(`a-${b.id}`, () => creatorEntscheiden(b.id, true, ""), `${b.name} ist jetzt Creator.`)} laedt={laeuft === `a-${b.id}`} />
            </View>
          </View>
        ))
      )}
    </Tafel>
  );

  return (
    <View style={{ gap: 20 }}>
      {meldung ? <Hinweis art={meldung.art}>{meldung.text}</Hinweis> : null}
      <View style={breit ? { flexDirection: "row", gap: 24, alignItems: "flex-start" } : { gap: 24 }}>
        {lehrerTafel}
        {creatorTafel}
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Einladungen
// ---------------------------------------------------------------------------

const GUELTIG = [
  { id: "7", titel: "7 Tage" },
  { id: "30", titel: "30 Tage" },
  { id: "90", titel: "90 Tage" },
  { id: "0", titel: "Unbegrenzt" },
];
const NUTZUNGEN = [
  { id: "1", titel: "1 Person" },
  { id: "20", titel: "20 Personen" },
  { id: "100", titel: "100 Personen" },
  { id: "0", titel: "Unbegrenzt" },
];

export function EinladungenBereich({ fahrlehrer, tick }: { fahrlehrer: ManagerNutzer[]; tick?: number }) {
  const { daten, fehler, neu } = useDaten<Einladung[]>(einladungenLaden, tick);
  const [lehrer, setLehrer] = useState<string>(fahrlehrer[0]?.id ?? "keiner");
  const [tage, setTage] = useState("30");
  const [max, setMax] = useState("0");
  const [notiz, setNotiz] = useState("");
  const [laeuft, setLaeuft] = useState(false);
  const [gezeigt, setGezeigt] = useState<string | null>(null);
  const [meldung, setMeldung] = useState<{ art: "ok" | "fehler"; text: string } | null>(null);
  const breit = useBreit();

  const aktuell = (daten ?? []).find((e) => e.code === gezeigt) ?? null;

  async function erstellen() {
    setLaeuft(true);
    setMeldung(null);
    try {
      const code = await einladungErstellen(lehrer === "keiner" ? null : lehrer, Number(tage) || null, Number(max) || null, notiz);
      setNotiz("");
      await neu();
      setGezeigt(code);
    } catch (e) {
      setMeldung({ art: "fehler", text: e instanceof Error ? e.message : String(e) });
    } finally {
      setLaeuft(false);
    }
  }

  async function kopieren(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setMeldung({ art: "ok", text: "Kopiert." });
    } catch {
      setMeldung({ art: "fehler", text: "Kopieren hat nicht geklappt – markiere den Text und kopiere ihn selbst." });
    }
  }

  const formular = (
    <Tafel titel="Neue Einladung" icon="add-circle" ton={TOENE.tuerkis} style={{ flex: breit ? 1 : undefined }}>
      <View style={{ gap: 18 }}>
        <Feld titel="Fahrlehrer" hinweis="Wer den Code einlöst, ist direkt diesem Fahrlehrer zugeordnet.">
          <Auswahl optionen={[...fahrlehrer.map((l) => ({ id: l.id, titel: l.name || l.benutzername })), { id: "keiner", titel: "Ohne Fahrlehrer" }]} wert={lehrer} onWechsel={setLehrer} />
        </Feld>
        <Feld titel="Gültig">
          <Auswahl optionen={GUELTIG} wert={tage} onWechsel={setTage} />
        </Feld>
        <Feld titel="Wie oft einlösbar">
          <Auswahl optionen={NUTZUNGEN} wert={max} onWechsel={setMax} />
        </Feld>
        <Feld titel="Notiz (nur für dich)">
          <MEingabe value={notiz} onChangeText={setNotiz} placeholder="z. B. Theoriekurs März" maxLength={80} />
        </Feld>
        <MKnopf titel="Einladung erstellen" icon="qr-code" onPress={erstellen} laedt={laeuft} style={{ alignSelf: "flex-start" }} />
      </View>
    </Tafel>
  );

  const qr = aktuell ? (
    <Tafel titel="QR-Code zum Scannen" icon="qr-code" ton={TOENE.tuerkis} rechts={<IconTaste icon="close" label="Schließen" onPress={() => setGezeigt(null)} />} style={{ flex: breit ? 1 : undefined }}>
      <View style={{ alignItems: "center", gap: 16 }}>
        <View style={{ padding: 14, borderRadius: 22, backgroundColor: "#FFFFFF", borderWidth: 1.5, borderColor: B.linie }}>
          <QrCode wert={einladungLink(aktuell.code)} groesse={220} />
        </View>
        <View style={{ flexDirection: "row", gap: 6 }}>
          {aktuell.code.split("").map((z, i) => (
            <View key={i} style={{ width: 34, height: 44, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: TOENE.tuerkis.hell, borderBottomWidth: 3, borderBottomColor: TOENE.tuerkis.farbe }}>
              <Text style={{ ...n.schwarz, fontSize: 20, color: TOENE.tuerkis.kante }}>{z}</Text>
            </View>
          ))}
        </View>
        <Text style={{ ...n.halb, fontSize: 14, lineHeight: 20, color: B.text2, textAlign: "center", maxWidth: 380 }}>
          {aktuell.fahrlehrer ? `Ordnet neue Fahrschüler ${aktuell.fahrlehrer} zu. ` : ""}Mit der Handy-Kamera scannen – oder in der App beim Registrieren den Code eintippen.
        </Text>
        <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
          <MKnopf titel="Code kopieren" icon="copy" art="sekundaer" onPress={() => kopieren(aktuell.code)} />
          <MKnopf titel="Link kopieren" icon="link" art="sekundaer" onPress={() => kopieren(einladungLink(aktuell.code))} />
          {Platform.OS === "web" ? <MKnopf titel="Drucken" icon="print" art="sekundaer" onPress={() => window.print()} /> : null}
        </View>
      </View>
    </Tafel>
  ) : null;

  return (
    <View style={{ gap: 20 }}>
      {meldung ? <Hinweis art={meldung.art}>{meldung.text}</Hinweis> : null}
      {fehler ? <Hinweis art="fehler">{fehler}</Hinweis> : null}
      <View style={breit ? { flexDirection: "row", gap: 24, alignItems: "flex-start" } : { gap: 24 }}>
        {formular}
        {qr}
      </View>
      <Tafel titel="Alle Einladungen" icon="list" ton={TOENE.blau} zusatz={daten?.length ? String(daten.length) : undefined} innen={false}>
        {!daten ? (
          <Laden />
        ) : daten.length === 0 ? (
          <LeerTafel icon="qr-code" ton={TOENE.tuerkis} titel="Noch keine Einladung" text="Erstell oben eine Einladung. Fahrschüler scannen den QR-Code und sind sofort richtig zugeordnet." />
        ) : (
          daten.map((e, i) => (
            <Zeile key={e.code} oben={i > 0} onPress={() => setGezeigt(e.code)} style={{ minHeight: 64 }}>
              <Symbol icon="qr-code" ton={e.aktiv ? TOENE.tuerkis : { farbe: B.text3, kante: B.text3, hell: B.ton }} groesse={38} />
              <Text style={{ width: 110, ...n.schwarz, fontSize: 15.5, color: e.aktiv ? B.text : B.text3, letterSpacing: 1 }}>{e.code}</Text>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={{ ...n.fett, fontSize: 14.5, color: B.text }} numberOfLines={1}>
                  {e.fahrlehrer || "Ohne Fahrlehrer"}
                </Text>
                <Text style={{ ...n.halb, fontSize: 13, color: B.text3 }} numberOfLines={1}>
                  {[e.notiz, e.gueltig_bis ? `bis ${datumKurz(e.gueltig_bis)}` : "unbegrenzt gültig"].filter(Boolean).join(" · ")}
                </Text>
              </View>
              <Text style={{ width: 120, textAlign: "right", ...n.fett, fontSize: 14, color: B.text2, fontVariant: ["tabular-nums"] }} numberOfLines={1}>
                {e.nutzungen}
                {e.max_nutzungen ? ` / ${e.max_nutzungen}` : ""} genutzt
              </Text>
              <View style={{ width: 96, alignItems: "flex-end" }}>
                <Marke text={e.aktiv ? "Aktiv" : "Beendet"} ton={e.aktiv ? TOENE.gruen : TOENE.rot} />
              </View>
              <IconTaste icon="close-circle" label="Einladung beenden" gefahr aus={!e.aktiv} onPress={() => dialog("Einladung beenden?", `Der Code ${e.code} lässt sich danach nicht mehr einlösen. Bereits zugeordnete Schüler bleiben zugeordnet.`, [{ text: "Abbrechen", style: "cancel" }, { text: "Beenden", style: "destructive", onPress: () => einladungBeenden(e.code).then(neu) }])} />
            </Zeile>
          ))
        )}
      </Tafel>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Prüfungstermine
// ---------------------------------------------------------------------------

export function TermineBereich({ onWaehlen, tick }: { onWaehlen: (id: string) => void; tick?: number }) {
  const { daten, fehler } = useDaten(pruefungstermineLaden, tick);
  if (fehler && !daten) return <Hinweis art="fehler">{fehler}</Hinweis>;
  if (!daten) return <Laden />;

  const jetzt = Date.now();
  const tagMs = 86_400_000;
  const kommend = daten.filter((t) => Date.parse(t.termin) >= jetzt - tagMs / 2);
  const woche = kommend.filter((t) => Date.parse(t.termin) <= jetzt + 7 * tagMs).length;
  const monat = kommend.filter((t) => Date.parse(t.termin) <= jetzt + 30 * tagMs).length;

  // Nach Monaten gruppieren
  const gruppen = new Map<string, typeof daten>();
  for (const t of daten) {
    const k = new Date(t.termin).toLocaleDateString("de-DE", { month: "long", year: "numeric" });
    gruppen.set(k, [...(gruppen.get(k) ?? []), t]);
  }

  return (
    <View style={{ gap: 24 }}>
      <Kennzahlen
        werte={[
          { titel: "In den nächsten 7 Tagen", wert: String(woche), unter: "Prüfungen diese Woche", icon: "alarm", ton: TOENE.orange },
          { titel: "In den nächsten 30 Tagen", wert: String(monat), unter: "Prüfungen in einem Monat", icon: "calendar", ton: TOENE.bernstein },
          { titel: "Termine eingetragen", wert: String(kommend.length), unter: "von Fahrschülern in der App", icon: "people", ton: TOENE.blau },
        ]}
      />
      {daten.length === 0 ? (
        <Tafel innen={false}>
          <LeerTafel icon="calendar" ton={TOENE.bernstein} titel="Noch keine Prüfungstermine" text="Fahrschüler tragen ihren Termin in der App ein (Home → Prüfungstermin). Dann erscheint er hier." />
        </Tafel>
      ) : (
        [...gruppen.entries()].map(([monatName, liste]) => (
          <Tafel key={monatName} titel={monatName} icon="calendar" ton={TOENE.bernstein} zusatz={String(liste.length)} innen={false}>
            {liste.map((t, i) => {
              const d = new Date(t.termin);
              const tageBis = Math.round((new Date(d.toDateString()).getTime() - new Date(new Date().toDateString()).getTime()) / tagMs);
              const vorbei = tageBis < 0;
              const ton = vorbei ? { farbe: B.text3, kante: B.text3, hell: B.ton } : tageBis <= 7 ? TOENE.orange : tageBis <= 30 ? TOENE.bernstein : TOENE.blau;
              return (
                <Zeile key={t.user_id} oben={i > 0} onPress={() => onWaehlen(t.user_id)} style={{ minHeight: 70 }}>
                  <View style={{ width: 54, height: 54, borderRadius: 14, overflow: "hidden", backgroundColor: ton.hell, alignItems: "center" }}>
                    <View style={{ alignSelf: "stretch", height: 16, alignItems: "center", justifyContent: "center", backgroundColor: ton.farbe }}>
                      <Text style={{ ...n.schwarz, fontSize: 10, color: "#FFFFFF" }}>{d.toLocaleDateString("de-DE", { weekday: "short" }).replace(".", "").toUpperCase()}</Text>
                    </View>
                    <Text style={{ ...n.schwarz, fontSize: 21, lineHeight: 36, color: ton.kante }}>{d.getDate()}</Text>
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={{ ...n.fett, fontSize: 15.5, color: vorbei ? B.text3 : B.text }} numberOfLines={1}>
                      {t.name || t.benutzername}
                    </Text>
                    <Text style={{ ...n.halb, fontSize: 13, color: B.text3 }} numberOfLines={1}>
                      {[t.fahrlehrer ? `Fahrlehrer: ${t.fahrlehrer}` : "ohne Fahrlehrer", `Klasse ${t.klasse}`, d.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" }) + " Uhr"].join(" · ")}
                    </Text>
                  </View>
                  <Marke text={vorbei ? "vorbei" : tageBis === 0 ? "heute" : tageBis === 1 ? "morgen" : `in ${tageBis} Tagen`} ton={ton} icon={vorbei ? "checkmark" : "time"} />
                  <Icon name="chevron-forward" size={16} color={B.text3} />
                </Zeile>
              );
            })}
          </Tafel>
        ))
      )}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Mitteilungen
// ---------------------------------------------------------------------------

export function MitteilungenBereich({ fahrlehrer, nutzer, tick }: { fahrlehrer: ManagerNutzer[]; nutzer: ManagerNutzer[]; tick?: number }) {
  const verlauf = useDaten(mitteilungenLaden, tick);
  const [ziel, setZiel] = useState<MitteilungZiel>("alle");
  const [lehrer, setLehrer] = useState<string | null>(fahrlehrer[0]?.id ?? null);
  const [titel, setTitel] = useState("");
  const [text, setText] = useState("");
  const [laeuft, setLaeuft] = useState(false);
  const [meldung, setMeldung] = useState<{ art: "ok" | "fehler"; text: string } | null>(null);
  const breit = useBreit();

  const empfaenger = useMemo(() => {
    const aktiv = nutzer.filter((x) => x.status !== "gesperrt" && !x.ich);
    if (ziel === "schueler") return aktiv.filter((x) => x.rolle === "schueler").length;
    if (ziel === "fahrlehrer") return aktiv.filter((x) => x.rolle === "fahrlehrer").length;
    if (ziel === "gruppe") return aktiv.filter((x) => x.fahrlehrer_id === lehrer).length;
    return aktiv.length;
  }, [nutzer, ziel, lehrer]);

  const ok = titel.trim().length >= 2 && text.trim().length >= 2 && (ziel !== "gruppe" || !!lehrer);

  function senden() {
    dialog("Mitteilung senden?", `An ${empfaenger === 1 ? "1 Person" : `${empfaenger} Personen`}. Sie erscheint in der App und als Push-Mitteilung.`, [
      { text: "Abbrechen", style: "cancel" },
      {
        text: "Senden",
        onPress: async () => {
          setLaeuft(true);
          setMeldung(null);
          try {
            const anzahl = await mitteilungSenden(titel.trim(), text.trim(), ziel, ziel === "gruppe" ? lehrer : null);
            setMeldung({ art: "ok", text: `Gesendet an ${anzahl === 1 ? "1 Person" : `${anzahl} Personen`}.` });
            setTitel("");
            setText("");
            await verlauf.neu();
          } catch (e) {
            setMeldung({ art: "fehler", text: e instanceof Error ? e.message : String(e) });
          } finally {
            setLaeuft(false);
          }
        },
      },
    ]);
  }

  const ZIELE: { id: MitteilungZiel; titel: string }[] = [
    { id: "alle", titel: "Alle" },
    { id: "schueler", titel: "Alle Fahrschüler" },
    { id: "fahrlehrer", titel: "Alle Fahrlehrer" },
    { id: "gruppe", titel: "Schüler eines Fahrlehrers" },
  ];

  const formular = (
    <Tafel titel="Neue Mitteilung" icon="create" ton={TOENE.indigo} style={{ flex: breit ? 1.2 : undefined }}>
      <View style={{ gap: 18 }}>
        <Feld titel="An wen?">
          <Auswahl optionen={fahrlehrer.length ? ZIELE : ZIELE.filter((z) => z.id !== "gruppe")} wert={ziel} onWechsel={setZiel} />
        </Feld>
        {ziel === "gruppe" ? (
          <Feld titel="Fahrlehrer">
            <Auswahl optionen={fahrlehrer.map((l) => ({ id: l.id, titel: l.name || l.benutzername }))} wert={lehrer ?? ""} onWechsel={setLehrer} />
          </Feld>
        ) : null}
        <Feld titel="Titel">
          <MEingabe value={titel} onChangeText={setTitel} placeholder="z. B. Theorieunterricht fällt aus" maxLength={80} />
        </Feld>
        <Feld titel="Text" hinweis={`${text.length} / 500 Zeichen`}>
          <MEingabe mehrzeilig value={text} onChangeText={setText} placeholder="z. B. Am Donnerstag findet kein Theorieunterricht statt. Nächster Termin: Montag, 18 Uhr." maxLength={500} />
        </Feld>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <MKnopf titel="Senden" icon="send" onPress={senden} laedt={laeuft} deaktiviert={!ok || empfaenger === 0} />
          <Text style={{ ...n.halb, fontSize: 14, color: B.text3 }}>{empfaenger === 1 ? "1 Empfänger" : `${empfaenger} Empfänger`}</Text>
        </View>
      </View>
    </Tafel>
  );

  // Vorschau: so sieht die Push-Mitteilung auf dem Handy aus.
  const vorschau = (
    <Tafel titel="Vorschau" icon="phone-portrait" ton={TOENE.lila} style={{ flex: breit ? 1 : undefined }}>
      <View style={{ borderRadius: 26, padding: 18, gap: 12, backgroundColor: TOENE.indigo.hell }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderRadius: 18, backgroundColor: B.flaeche, borderWidth: 1, borderColor: B.linie }}>
          <View style={{ width: 38, height: 38, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: B.orange }}>
            <Icon name="car-sport" size={20} color="#FFFFFF" />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Text style={{ ...n.fett, fontSize: 13, color: B.text3 }}>FAHRSCHUL PRO</Text>
              <Text style={{ ...n.halb, fontSize: 12, color: B.text3 }}>jetzt</Text>
            </View>
            <Text style={{ ...n.fett, fontSize: 14.5, color: B.text }} numberOfLines={1}>
              {titel.trim() || "Titel der Mitteilung"}
            </Text>
            <Text style={{ ...n.halb, fontSize: 13.5, color: B.text2 }} numberOfLines={2}>
              {text.trim() || "Hier steht dein Text."}
            </Text>
          </View>
        </View>
        <Text style={{ ...n.halb, fontSize: 13, lineHeight: 18, color: TOENE.indigo.kante, textAlign: "center" }}>Ohne Push-Erlaubnis erscheint die Mitteilung beim nächsten Öffnen der App.</Text>
      </View>
    </Tafel>
  );

  return (
    <View style={{ gap: 20 }}>
      {meldung ? <Hinweis art={meldung.art}>{meldung.text}</Hinweis> : null}
      <View style={breit ? { flexDirection: "row", gap: 24, alignItems: "flex-start" } : { gap: 24 }}>
        {formular}
        {vorschau}
      </View>
      <Tafel titel="Gesendet" icon="send" ton={TOENE.gruen} innen={false}>
        {verlauf.fehler ? (
          <View style={{ padding: 20 }}>
            <Hinweis art="fehler">{verlauf.fehler}</Hinweis>
          </View>
        ) : !verlauf.daten ? (
          <Laden />
        ) : verlauf.daten.length === 0 ? (
          <LeerTafel icon="megaphone" ton={TOENE.indigo} titel="Noch nichts gesendet" />
        ) : (
          verlauf.daten.map((m, i) => (
            <Zeile key={m.id} oben={i > 0} style={{ minHeight: 64, paddingVertical: 10 }}>
              <Symbol icon="megaphone" ton={TOENE.indigo} groesse={36} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={{ ...n.fett, fontSize: 14.5, color: B.text }} numberOfLines={1}>
                  {m.titel}
                </Text>
                <Text style={{ ...n.halb, fontSize: 13, color: B.text3 }} numberOfLines={1}>
                  {m.text}
                </Text>
              </View>
              <Marke text={m.ziel === "alle" ? "Alle" : m.ziel === "schueler" ? "Fahrschüler" : m.ziel === "fahrlehrer" ? "Fahrlehrer" : `Gruppe ${m.fahrlehrer}`} ton={TOENE.indigo} />
              <Text style={{ width: 92, textAlign: "right", ...n.fett, fontSize: 13.5, color: B.text2 }}>{m.anzahl} Empf.</Text>
              <Text style={{ width: 92, textAlign: "right", ...n.halb, fontSize: 13, color: B.text3 }}>{wannText(m.erstellt_am)}</Text>
            </Zeile>
          ))
        )}
      </Tafel>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Lernstand eines Fahrschülers (im Blatt eines Zugangs)
// ---------------------------------------------------------------------------

function richtigeJeThema(fragen: NonNullable<Lernstand["fragen"]>): { id: ThemaId; titel: string; richtig: number; gesamt: number; begonnen: boolean }[] {
  return THEMEN.map((t) => {
    const liste = FRAGEN.filter((f) => f.thema === t.id);
    let richtig = 0;
    let begonnen = false;
    for (const f of liste) {
      const fs = fragen[f.id];
      if (fs) begonnen = true;
      if (fs && fs.l === 1 && (fs.r ?? 0) > 0) richtig++;
    }
    return { id: t.id as ThemaId, titel: t.titel, richtig, gesamt: liste.length, begonnen };
  });
}

export function LernstandTafel({ nutzerId }: { nutzerId: string }) {
  const [daten, setDaten] = useState<Lernstand | null>(null);
  const [fehler, setFehler] = useState<string | null>(null);

  useEffect(() => {
    let aus = false;
    setDaten(null);
    setFehler(null);
    lernstandLaden(nutzerId)
      .then((d) => !aus && setDaten(d))
      .catch((e) => !aus && setFehler(e instanceof Error ? e.message : String(e)));
    return () => {
      aus = true;
    };
  }, [nutzerId]);

  if (fehler) return <Hinweis art="fehler">{fehler}</Hinweis>;
  if (!daten) return <Laden />;
  if (!daten.aktualisiert_am) return <Hinweis>Noch kein Lernstand gespeichert – die Person hat die App noch nicht angemeldet benutzt.</Hinweis>;

  const termin = daten.pruefungstermin ? new Date(daten.pruefungstermin) : null;
  const tageBis = termin ? Math.round((new Date(termin.toDateString()).getTime() - new Date(new Date().toDateString()).getTime()) / 86_400_000) : null;
  const heute = new Date();
  let minuten7 = 0;
  for (let i = 0; i < 7; i++) {
    const d = new Date(heute.getTime() - i * 86_400_000);
    const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    minuten7 += (daten.zeitTage?.[k] ?? 0) / 60;
  }
  const themen = richtigeJeThema(daten.fragen ?? {});
  const begonnen = themen.filter((t) => t.begonnen);
  const pruefungen = (daten.pruefungen ?? []).slice(0, 5);
  const schilder = Object.keys(daten.schilder ?? {}).length;

  const kachel = (icon: IconName, ton: Ton, wert: string, titel: string): ReactNode => (
    <View key={titel} style={{ flex: 1, minWidth: 110, padding: 12, gap: 8, borderRadius: 16, backgroundColor: ton.hell }}>
      <Icon name={icon} size={18} color={ton.farbe} />
      <View>
        <Text style={{ ...n.schwarz, fontSize: 19, color: B.text }} numberOfLines={1}>
          {wert}
        </Text>
        <Text style={{ ...n.fett, fontSize: 12.5, color: ton.kante }} numberOfLines={1}>
          {titel}
        </Text>
      </View>
    </View>
  );

  return (
    <View style={{ gap: 14 }}>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
        {kachel("calendar", TOENE.orange, termin ? (tageBis! < 0 ? "vorbei" : tageBis === 0 ? "heute" : `${tageBis} Tage`) : "–", termin ? `Prüfung ${termin.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" })}` : "kein Termin")}
        {kachel("flame", TOENE.koralle, String(daten.serie ?? 0), "Tage Serie")}
        {kachel("time", TOENE.blau, `${Math.round(minuten7)} Min.`, "letzte 7 Tage")}
        {kachel("camera", TOENE.gruen, String(schilder), "Schilder")}
      </View>
      <Text style={{ ...n.halb, fontSize: 13, color: B.text3 }}>
        Zuletzt gelernt: {daten.letzterTag ? new Date(daten.letzterTag).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" }) : "noch nie"} · gesichert {wannText(daten.aktualisiert_am)}
      </Text>

      {begonnen.length ? (
        <View style={{ gap: 8 }}>
          <Text style={{ ...n.schwarz, fontSize: 15, color: B.text }}>Themen</Text>
          {themen.map((t) => (
            <View key={t.id} style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: THEMA_TON[t.id].farbe }} />
              <Text style={{ width: 170, ...n.fett, fontSize: 13.5, color: t.begonnen ? B.text : B.text3 }} numberOfLines={1}>
                {t.titel}
              </Text>
              <Balken anteil={t.gesamt ? t.richtig / t.gesamt : 0} farbe={THEMA_TON[t.id].farbe} />
              <Text style={{ width: 44, textAlign: "right", ...n.fett, fontSize: 13, color: B.text2, fontVariant: ["tabular-nums"] }}>{t.gesamt ? `${Math.round((t.richtig / t.gesamt) * 100)} %` : "–"}</Text>
            </View>
          ))}
        </View>
      ) : null}

      {pruefungen.length ? (
        <View style={{ gap: 8 }}>
          <Text style={{ ...n.schwarz, fontSize: 15, color: B.text }}>Prüfungssimulationen</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {pruefungen.map((p, i) => (
              <Marke key={i} text={`${p.datum ? new Date(p.datum).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" }) : ""} ${p.bestanden ? "bestanden" : "nicht bestanden"} (${p.fehlerpunkte ?? 0} FP)`} ton={p.bestanden ? TOENE.gruen : TOENE.rot} icon={p.bestanden ? "checkmark" : "close"} />
            ))}
          </View>
        </View>
      ) : null}
    </View>
  );
}
