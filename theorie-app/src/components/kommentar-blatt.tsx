import { useEffect, useMemo, useRef, useState } from "react";
import { FlatList, KeyboardAvoidingView, Modal, Pressable, StyleSheet, Text, TextInput, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Icon } from "@/components/icon";
import { NutzerBild } from "@/components/profilbild";
import { dialog } from "@/components/dialog";
import { Lader } from "@/components/lader";
import {
  kommentareLaden,
  kommentarLiken,
  kommentarLoeschen,
  kommentarReagieren,
  kommentieren,
  kurzeZahl,
  REAKTIONEN,
  vorZeit,
  type ClipEintrag,
  type Kommentar,
} from "@/lib/clips-server";
import { stoss, tippen } from "@/lib/haptik";
import { farben, schrift } from "@/lib/theme";

const BLATT = "#121518";
/** Ab so vielen Antworten erst auf Tippen aufklappen. */
const ANTWORTEN_OFFEN_BIS = 2;

function nameVon(k: Kommentar) {
  return k.autor_name || k.autor_benutzername;
}

/** Eine Kommentarzeile – oben oder eingerückt als Antwort. */
function Zeile({
  k,
  antwort,
  auswahlOffen,
  onAntworten,
  onLike,
  onReaktion,
  onAuswahl,
  onLoeschen,
}: {
  k: Kommentar;
  antwort?: boolean;
  auswahlOffen: boolean;
  onAntworten: (k: Kommentar) => void;
  onLike: (k: Kommentar) => void;
  onReaktion: (k: Kommentar, emoji: string) => void;
  onAuswahl: (k: Kommentar) => void;
  onLoeschen: (k: Kommentar) => void;
}) {
  const reaktionen = Object.entries(k.reaktionen ?? {})
    .filter(([, n]) => n > 0)
    .sort((a, b) => b[1] - a[1]);
  const bild = antwort ? 26 : 34;

  return (
    <View style={{ paddingLeft: antwort ? 16 + 34 + 11 : 16, paddingRight: 12, paddingVertical: antwort ? 6 : 9 }}>
      <Pressable onLongPress={() => onLoeschen(k)} delayLongPress={350} style={{ flexDirection: "row", gap: antwort ? 9 : 11 }}>
        <NutzerBild pfad={k.autor_bild} name={nameVon(k)} farbe={k.autor_farbe} groesse={bild} rand={1} />
        <View style={{ flex: 1, gap: 3 }}>
          <Text style={{ ...schrift.textMittel, fontSize: 13, color: farben.text3 }}>
            {nameVon(k)} · {vorZeit(k.erstellt_am)}
          </Text>
          <Text style={{ ...schrift.text, fontSize: 15, lineHeight: 20, color: "#FFFFFF" }}>{k.inhalt}</Text>

          {/* Reaktionen, Emoji hinzufügen, Antworten */}
          <View style={{ flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 6, marginTop: 4 }}>
            {reaktionen.map(([emoji, n]) => {
              const meins = k.meine_reaktion === emoji;
              return (
                <Pressable
                  key={emoji}
                  onPress={() => onReaktion(k, emoji)}
                  hitSlop={4}
                  accessibilityLabel={`${emoji} ${n}`}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 4,
                    height: 26,
                    paddingHorizontal: 8,
                    borderRadius: 13,
                    backgroundColor: meins ? "rgba(252,91,14,0.2)" : "rgba(255,255,255,0.07)",
                    borderWidth: 1,
                    borderColor: meins ? "rgba(252,91,14,0.6)" : "transparent",
                  }}
                >
                  <Text style={{ fontSize: 13 }}>{emoji}</Text>
                  <Text style={{ ...schrift.textHalb, fontSize: 12.5, color: meins ? farben.orangeHell : "#D3D7DC" }}>{n}</Text>
                </Pressable>
              );
            })}
            <Pressable
              onPress={() => onAuswahl(k)}
              hitSlop={6}
              accessibilityLabel="Mit Emoji reagieren"
              style={{ height: 26, paddingHorizontal: 7, borderRadius: 13, flexDirection: "row", alignItems: "center", gap: 2, backgroundColor: auswahlOffen ? "rgba(255,255,255,0.14)" : "rgba(255,255,255,0.07)" }}
            >
              <Icon name="happy-outline" sf="face.smiling" size={15} color="#D3D7DC" />
              <Icon name="add" sf="plus" size={10} color="#D3D7DC" weight="bold" />
            </Pressable>
            <Pressable onPress={() => onAntworten(k)} hitSlop={8} accessibilityLabel={`${nameVon(k)} antworten`} style={{ paddingHorizontal: 6, height: 26, justifyContent: "center" }}>
              <Text style={{ ...schrift.textHalb, fontSize: 13, color: farben.text3 }}>Antworten</Text>
            </Pressable>
          </View>

          {auswahlOffen ? (
            <View style={{ flexDirection: "row", alignSelf: "flex-start", gap: 2, marginTop: 6, padding: 4, borderRadius: 22, backgroundColor: "#1F2429", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" }}>
              {REAKTIONEN.map((emoji) => (
                <Pressable
                  key={emoji}
                  onPress={() => onReaktion(k, emoji)}
                  accessibilityLabel={emoji}
                  style={({ pressed }) => ({
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: k.meine_reaktion === emoji ? "rgba(252,91,14,0.25)" : pressed ? "rgba(255,255,255,0.1)" : "transparent",
                    transform: [{ scale: pressed ? 1.2 : 1 }],
                  })}
                >
                  <Text style={{ fontSize: 21 }}>{emoji}</Text>
                </Pressable>
              ))}
            </View>
          ) : null}
        </View>

        {/* Herz rechts */}
        <Pressable onPress={() => onLike(k)} hitSlop={8} accessibilityLabel={k.gemocht ? "Gefällt mir nicht mehr" : "Gefällt mir"} style={{ width: 34, alignItems: "center", paddingTop: 16, gap: 2 }}>
          <Icon name={k.gemocht ? "heart" : "heart-outline"} sf={k.gemocht ? "heart.fill" : "heart"} size={17} color={k.gemocht ? farben.orange : farben.text3} />
          {k.likes > 0 ? <Text style={{ ...schrift.textMittel, fontSize: 11.5, color: farben.text3 }}>{kurzeZahl(k.likes)}</Text> : null}
        </Pressable>
      </Pressable>
    </View>
  );
}

/**
 * Kommentare zu einem Clip – schiebt sich von unten über das Video, das oben
 * weiterläuft. Antworten, Herz und Emoji-Reaktionen; eigene Kommentare (und
 * als Autor/Inhaber alle) lassen sich per langem Druck löschen.
 */
export function KommentarBlatt({
  clip,
  angemeldet,
  onSchliessen,
  onAnzahl,
  onAnmelden,
}: {
  clip: ClipEintrag | null;
  angemeldet: boolean;
  onSchliessen: () => void;
  onAnzahl: (clipId: string, aenderung: number) => void;
  onAnmelden: () => void;
}) {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const [liste, setListe] = useState<Kommentar[] | null>(null);
  const [fehler, setFehler] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [sendet, setSendet] = useState(false);
  const [antwortAn, setAntwortAn] = useState<Kommentar | null>(null);
  const [auswahlFuer, setAuswahlFuer] = useState<string | null>(null);
  const [aufgeklappt, setAufgeklappt] = useState<Set<string>>(new Set());
  const eingabe = useRef<TextInput>(null);
  const clipId = clip?.id ?? null;

  useEffect(() => {
    if (!clipId) return;
    setListe(null);
    setFehler(null);
    setText("");
    setAntwortAn(null);
    setAuswahlFuer(null);
    setAufgeklappt(new Set());
    let aktiv = true;
    kommentareLaden(clipId)
      .then((l) => aktiv && setListe(l))
      .catch((e: Error) => aktiv && setFehler(e.message));
    return () => {
      aktiv = false;
    };
  }, [clipId]);

  // Oben die neuesten Kommentare, darunter die Antworten der Reihe nach.
  const { oben, antworten } = useMemo(() => {
    const alle = liste ?? [];
    const oben = alle.filter((k) => !k.antwort_auf).sort((a, b) => b.erstellt_am.localeCompare(a.erstellt_am));
    const antworten = new Map<string, Kommentar[]>();
    for (const k of alle) {
      if (!k.antwort_auf) continue;
      antworten.set(k.antwort_auf, [...(antworten.get(k.antwort_auf) ?? []), k]);
    }
    for (const l of antworten.values()) l.sort((a, b) => a.erstellt_am.localeCompare(b.erstellt_am));
    return { oben, antworten };
  }, [liste]);

  function aendern(id: string, teil: (k: Kommentar) => Partial<Kommentar>) {
    setListe((l) => (l ? l.map((k) => (k.id === id ? { ...k, ...teil(k) } : k)) : l));
  }

  function kontoNoetig(was: string) {
    dialog("Konto nötig", `${was} geht mit einem kostenlosen Konto.`, [
      { text: "Abbrechen", style: "cancel" },
      { text: "Anmelden", onPress: onAnmelden },
    ]);
  }

  async function senden() {
    const inhalt = text.trim();
    if (!clipId || !inhalt || sendet) return;
    setSendet(true);
    try {
      await kommentieren(clipId, inhalt, antwortAn?.id ?? null);
      stoss();
      const oberster = antwortAn ? (antwortAn.antwort_auf ?? antwortAn.id) : null;
      if (oberster) setAufgeklappt((s) => new Set(s).add(oberster));
      setText("");
      setAntwortAn(null);
      onAnzahl(clipId, 1);
      setListe(await kommentareLaden(clipId));
    } catch (e) {
      dialog("Nicht gesendet", (e as Error).message);
    } finally {
      setSendet(false);
    }
  }

  function antworten_(k: Kommentar) {
    if (!angemeldet) {
      kontoNoetig("Antworten");
      return;
    }
    tippen();
    setAntwortAn(k);
    setAuswahlFuer(null);
    setTimeout(() => eingabe.current?.focus(), 50);
  }

  async function liken(k: Kommentar) {
    if (!angemeldet) {
      kontoNoetig("Liken");
      return;
    }
    tippen();
    const an = !k.gemocht;
    aendern(k.id, (x) => ({ gemocht: an, likes: Math.max(0, x.likes + (an ? 1 : -1)) }));
    try {
      const n = await kommentarLiken(k.id, an);
      aendern(k.id, () => ({ likes: n }));
    } catch {
      aendern(k.id, (x) => ({ gemocht: !an, likes: Math.max(0, x.likes + (an ? -1 : 1)) }));
    }
  }

  async function reagieren(k: Kommentar, emoji: string) {
    if (!angemeldet) {
      kontoNoetig("Reagieren");
      return;
    }
    tippen();
    setAuswahlFuer(null);
    // Gleiche Reaktion nochmal = zurücknehmen, sonst ersetzen.
    const neu = k.meine_reaktion === emoji ? null : emoji;
    const vorher = { reaktionen: k.reaktionen, meine_reaktion: k.meine_reaktion };
    aendern(k.id, (x) => {
      const r = { ...(x.reaktionen ?? {}) };
      if (x.meine_reaktion) r[x.meine_reaktion] = Math.max(0, (r[x.meine_reaktion] ?? 1) - 1);
      if (neu) r[neu] = (r[neu] ?? 0) + 1;
      return { reaktionen: r, meine_reaktion: neu };
    });
    try {
      const r = await kommentarReagieren(k.id, neu);
      aendern(k.id, () => ({ reaktionen: r }));
    } catch {
      aendern(k.id, () => vorher);
    }
  }

  function loeschenFragen(k: Kommentar) {
    if (!k.loeschbar || !clipId) return;
    tippen();
    const zahl = k.antwort_auf ? 0 : (antworten.get(k.id)?.length ?? 0);
    dialog("Kommentar löschen?", zahl > 0 ? `${k.inhalt}\n\nDie ${zahl === 1 ? "Antwort wird" : `${zahl} Antworten werden`} mit gelöscht.` : k.inhalt, [
      { text: "Abbrechen", style: "cancel" },
      {
        text: "Löschen",
        style: "destructive",
        onPress: async () => {
          try {
            const n = await kommentarLoeschen(k.id);
            setListe((l) => (l ? l.filter((x) => x.id !== k.id && x.antwort_auf !== k.id) : l));
            onAnzahl(clipId, -n);
          } catch (e) {
            dialog("Nicht gelöscht", (e as Error).message);
          }
        },
      },
    ]);
  }

  const anzahl = clip?.kommentare ?? 0;
  const zeilenProps = {
    onAntworten: antworten_,
    onLike: liken,
    onReaktion: reagieren,
    onAuswahl: (k: Kommentar) => {
      tippen();
      setAuswahlFuer((id) => (id === k.id ? null : k.id));
    },
    onLoeschen: loeschenFragen,
  };

  return (
    <Modal visible={clip != null} transparent animationType="slide" onRequestClose={onSchliessen} statusBarTranslucent>
      <View style={{ flex: 1, justifyContent: "flex-end" }}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onSchliessen} accessibilityLabel="Kommentare schließen" />
        <KeyboardAvoidingView behavior="padding">
          <View style={{ height: Math.round(height * 0.68), backgroundColor: BLATT, borderTopLeftRadius: 18, borderTopRightRadius: 18, overflow: "hidden" }}>
            {/* Kopf */}
            <View style={{ height: 50, alignItems: "center", justifyContent: "center", borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.06)" }}>
              <View style={{ position: "absolute", top: 6, width: 36, height: 4, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.18)" }} />
              <Text style={{ ...schrift.textHalb, fontSize: 14.5, color: "#FFFFFF" }}>
                {anzahl === 1 ? "1 Kommentar" : `${kurzeZahl(anzahl)} Kommentare`}
              </Text>
              <Pressable onPress={onSchliessen} hitSlop={10} accessibilityLabel="Schließen" style={{ position: "absolute", right: 14, top: 13 }}>
                <Icon name="close" size={22} color="#D3D7DC" />
              </Pressable>
            </View>

            {/* Liste */}
            {liste == null ? (
              <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
                {fehler ? <Text style={{ ...schrift.text, fontSize: 14, color: farben.text3, paddingHorizontal: 24, textAlign: "center" }}>{fehler}</Text> : <Lader color="#FFFFFF" />}
              </View>
            ) : oben.length === 0 ? (
              <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 8, paddingHorizontal: 32 }}>
                <Icon name="chatbubble-ellipses" sf="ellipsis.bubble" size={36} color={farben.text4} />
                <Text style={{ ...schrift.textHalb, fontSize: 16, color: "#FFFFFF" }}>Noch keine Kommentare</Text>
                <Text style={{ ...schrift.text, fontSize: 14, color: farben.text3, textAlign: "center" }}>Schreib den ersten – Fragen zum Clip sind auch willkommen.</Text>
              </View>
            ) : (
              <FlatList
                data={oben}
                keyExtractor={(k) => k.id}
                contentContainerStyle={{ paddingVertical: 8 }}
                keyboardShouldPersistTaps="handled"
                renderItem={({ item: k }) => {
                  const liste_ = antworten.get(k.id) ?? [];
                  const offen = aufgeklappt.has(k.id) || liste_.length <= ANTWORTEN_OFFEN_BIS;
                  return (
                    <View>
                      <Zeile k={k} auswahlOffen={auswahlFuer === k.id} {...zeilenProps} />
                      {offen ? liste_.map((a) => <Zeile key={a.id} k={a} antwort auswahlOffen={auswahlFuer === a.id} {...zeilenProps} />) : null}
                      {liste_.length > ANTWORTEN_OFFEN_BIS ? (
                        <Pressable
                          onPress={() => {
                            tippen();
                            setAufgeklappt((s) => {
                              const neu = new Set(s);
                              if (neu.has(k.id)) neu.delete(k.id);
                              else neu.add(k.id);
                              return neu;
                            });
                          }}
                          hitSlop={6}
                          style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingLeft: 16 + 34 + 11, paddingVertical: 6 }}
                        >
                          <View style={{ width: 22, height: 1, backgroundColor: "rgba(255,255,255,0.2)" }} />
                          <Text style={{ ...schrift.textHalb, fontSize: 13, color: farben.text3 }}>
                            {aufgeklappt.has(k.id) ? "Antworten ausblenden" : `${liste_.length} Antworten ansehen`}
                          </Text>
                          <Icon name={aufgeklappt.has(k.id) ? "chevron-up" : "chevron-down"} sf={aufgeklappt.has(k.id) ? "chevron.up" : "chevron.down"} size={12} color={farben.text3} />
                        </Pressable>
                      ) : null}
                    </View>
                  );
                }}
              />
            )}

            {/* Antwort-Hinweis */}
            {antwortAn ? (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 16, paddingVertical: 8, backgroundColor: "rgba(255,255,255,0.04)", borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.06)" }}>
                <Icon name="arrow-undo" sf="arrowshape.turn.up.left.fill" size={13} color={farben.text3} />
                <Text numberOfLines={1} style={{ ...schrift.textMittel, fontSize: 13, color: farben.text3, flex: 1 }}>
                  Antwort an <Text style={{ color: "#FFFFFF" }}>{nameVon(antwortAn)}</Text>
                </Text>
                <Pressable onPress={() => setAntwortAn(null)} hitSlop={10} accessibilityLabel="Antwort abbrechen">
                  <Icon name="close" size={16} color={farben.text3} />
                </Pressable>
              </View>
            ) : null}

            {/* Eingabe */}
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 12, paddingTop: 8, paddingBottom: Math.max(insets.bottom, 10), borderTopWidth: antwortAn ? 0 : 1, borderTopColor: "rgba(255,255,255,0.06)" }}>
              {angemeldet ? (
                <>
                  <View style={{ flex: 1, minHeight: 42, borderRadius: 21, backgroundColor: "rgba(255,255,255,0.08)", paddingHorizontal: 16, justifyContent: "center" }}>
                    <TextInput
                      ref={eingabe}
                      value={text}
                      onChangeText={setText}
                      placeholder={antwortAn ? `${nameVon(antwortAn)} antworten …` : "Kommentar hinzufügen …"}
                      placeholderTextColor={farben.text4}
                      selectionColor={farben.orange}
                      cursorColor={farben.orange}
                      selectionHandleColor={farben.orange}
                      keyboardAppearance="dark"
                      maxLength={500}
                      multiline
                      style={{ ...schrift.text, fontSize: 15, color: "#FFFFFF", maxHeight: 96, paddingVertical: 10 }}
                    />
                  </View>
                  <Pressable
                    onPress={senden}
                    disabled={!text.trim() || sendet}
                    accessibilityLabel="Senden"
                    style={{ width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", backgroundColor: text.trim() ? farben.orange : "rgba(255,255,255,0.1)" }}
                  >
                    {sendet ? <Lader color="#FFFFFF" size="small" /> : <Icon name="arrow-up" sf="arrow.up" size={20} color="#FFFFFF" weight="bold" />}
                  </Pressable>
                </>
              ) : (
                <Pressable
                  onPress={() => {
                    tippen();
                    onAnmelden();
                  }}
                  style={{ flex: 1, height: 44, borderRadius: 22, backgroundColor: "rgba(255,255,255,0.08)", alignItems: "center", justifyContent: "center" }}
                >
                  <Text style={{ ...schrift.textHalb, fontSize: 15, color: "#FFFFFF" }}>Zum Kommentieren anmelden</Text>
                </Pressable>
              )}
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}
