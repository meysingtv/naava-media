import { useEffect, useRef, useState, type ReactNode } from "react";
import { Animated, Easing, Modal, Pressable, ScrollView, Text, TextInput, View } from "react-native";

import { Icon } from "@/components/icon";
import { B, Knopf, n, Symbol, TOENE, type Zustand } from "@/components/web/bunt";
import { useTasten } from "@/components/web/frage-web";
import { NACHFRAGEN, NICHT_VERSTANDEN, type KiNachricht } from "@/lib/ki-hilfe";
import type { Frage } from "@/lib/fragen";

// KI-Hilfe am PC: ein Chat, der von rechts hereinfährt – oben die Frage, um
// die es geht, darunter der ganze Verlauf (eigene Fragen rechts, Antworten
// links), Vorschläge zum Nachfragen und unten das Eingabefeld. Enter sendet,
// Esc schließt. Die Logik (Senden, Bewerten) kommt aus KiBlase.

/** **fett** innerhalb einer Zeile. */
function mitFett(s: string): ReactNode[] {
  return s.split("**").map((t, i) =>
    i % 2 === 1 ? (
      <Text key={i} style={n.schwarz}>
        {t}
      </Text>
    ) : (
      t
    ),
  );
}

/** Antworttext mit Absätzen, Listen und **fett**. */
function Formatiert({ text }: { text: string }) {
  const stil = { ...n.halb, fontSize: 15.5, lineHeight: 23, color: B.text };
  return (
    <View style={{ gap: 2 }}>
      {text.split("\n").map((zeile, i) => {
        if (!zeile.trim()) return <View key={i} style={{ height: 8 }} />;
        const liste = /^\s*(•|-|\*)\s+/.test(zeile);
        const inhalt = liste ? zeile.replace(/^\s*(•|-|\*)\s+/, "") : zeile.replace(/^#+\s*/, "");
        return (
          <View key={i} style={{ flexDirection: "row", gap: 8 }}>
            {liste ? <Text style={{ ...stil, color: B.lila }}>•</Text> : null}
            <Text style={[stil, { flex: 1 }]}>{mitFett(inhalt)}</Text>
          </View>
        );
      })}
    </View>
  );
}

/** Antwort erscheint Stück für Stück. */
function TippText({ text, aktiv, onFertig }: { text: string; aktiv: boolean; onFertig: () => void }) {
  const [anzahl, setAnzahl] = useState(aktiv ? 0 : text.length);
  const fertig = useRef(onFertig);
  fertig.current = onFertig;
  useEffect(() => {
    if (!aktiv) {
      setAnzahl(text.length);
      return;
    }
    let i = 0;
    const schritt = Math.max(2, Math.round(text.length / 90));
    const t = setInterval(() => {
      i = Math.min(text.length, i + schritt);
      setAnzahl(i);
      if (i >= text.length) {
        clearInterval(t);
        fertig.current();
      }
    }, 16);
    return () => clearInterval(t);
  }, [text, aktiv]);
  return <Formatiert text={text.slice(0, anzahl)} />;
}

/** Drei hüpfende Punkte, solange die KI nachdenkt. */
function Denkt() {
  const werte = useRef([0, 1, 2].map(() => new Animated.Value(0))).current;
  useEffect(() => {
    const a = Animated.loop(
      Animated.stagger(
        160,
        werte.map((w) => Animated.sequence([Animated.timing(w, { toValue: 1, duration: 300, useNativeDriver: true }), Animated.timing(w, { toValue: 0, duration: 300, useNativeDriver: true }), Animated.delay(200)])),
      ),
    );
    a.start();
    return () => a.stop();
  }, [werte]);
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
      <View style={{ flexDirection: "row", gap: 5 }}>
        {werte.map((w, i) => (
          <Animated.View key={i} style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: B.lila, opacity: w.interpolate({ inputRange: [0, 1], outputRange: [0.35, 1] }), transform: [{ translateY: w.interpolate({ inputRange: [0, 1], outputRange: [0, -4] }) }] }} />
        ))}
      </View>
      <Text style={{ ...n.halb, fontSize: 14, color: B.text3 }}>Denkt nach …</Text>
    </View>
  );
}

function Daumen({ runter, aktiv, onPress }: { runter?: boolean; aktiv: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityLabel={runter ? "Hilft nicht" : "Hilft mir"} style={(z: Zustand) => ({ width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: aktiv ? (runter ? B.rotHell : B.gruenHell) : z.hovered ? B.ton : "transparent" })}>
      <Icon name={runter ? (aktiv ? "thumbs-down" : "thumbs-down-outline") : aktiv ? "thumbs-up" : "thumbs-up-outline"} size={17} color={aktiv ? (runter ? B.rot : B.gruen) : B.text3} />
    </Pressable>
  );
}

export type KiPanelWebProps = {
  offen: boolean;
  frage: Frage;
  nachrichten: KiNachricht[];
  laedt: boolean;
  tippt: string | null;
  onTippFertig: () => void;
  text: string;
  onText: (t: string) => void;
  onSenden: (text: string, art: "erklaeren" | "frage") => void;
  bewertet: Record<string, boolean>;
  onBewerten: (gut: boolean) => void;
  onNeu: () => void;
  onSchliessen: () => void;
};

export function KiPanelWeb(p: KiPanelWebProps) {
  const x = useRef(new Animated.Value(1)).current;
  const scroll = useRef<ScrollView>(null);
  const letzteKi = [...p.nachrichten].reverse().find((m) => m.rolle === "ki");
  const gefragt = new Set(p.nachrichten.filter((m) => m.rolle === "ich").map((m) => m.text));
  const vorschlaege = NACHFRAGEN.filter((q) => !gefragt.has(q));

  useEffect(() => {
    Animated.timing(x, { toValue: p.offen ? 0 : 1, duration: 240, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [p.offen, x]);

  useTasten((e) => {
    if (p.offen && e.key === "Escape") p.onSchliessen();
  });

  const senden = (t: string, art: "erklaeren" | "frage" = "frage") => {
    if (!t.trim() || p.laedt) return;
    p.onSenden(t, art);
  };

  return (
    <Modal visible={p.offen} transparent animationType="fade" onRequestClose={p.onSchliessen}>
      <View style={{ flex: 1, flexDirection: "row" }}>
        <Pressable onPress={p.onSchliessen} accessibilityLabel="KI-Hilfe schließen" style={{ flex: 1, backgroundColor: "rgba(10,12,15,0.32)" }} />
        <Animated.View style={{ width: 460, maxWidth: "100%", height: "100%", backgroundColor: B.flaeche, borderLeftWidth: 1.5, borderLeftColor: B.linie, transform: [{ translateX: x.interpolate({ inputRange: [0, 1], outputRange: [0, 480] }) }] }}>
          {/* Kopf */}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 22, height: 72, borderBottomWidth: 1.5, borderBottomColor: B.linie }}>
            <Symbol icon="sparkles" ton={TOENE.lila} groesse={38} />
            <View style={{ flex: 1 }}>
              <Text style={{ ...n.schwarz, fontSize: 18, color: B.text }}>KI-Hilfe</Text>
              <Text style={{ ...n.halb, fontSize: 13, color: B.text3 }}>Fragen zu dieser Aufgabe</Text>
            </View>
            {p.nachrichten.length ? (
              <Pressable onPress={p.onNeu} accessibilityLabel="Neu anfangen" style={(z: Zustand) => ({ height: 34, paddingHorizontal: 10, borderRadius: 10, flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: z.hovered ? B.ton : "transparent" })}>
                <Icon name="refresh" size={16} color={B.text2} />
                <Text style={{ ...n.fett, fontSize: 13.5, color: B.text2 }}>Neu</Text>
              </Pressable>
            ) : null}
            <Pressable onPress={p.onSchliessen} accessibilityLabel="Schließen (Esc)" style={(z: Zustand) => ({ width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: z.hovered ? B.ton : "transparent" })}>
              <Icon name="close" size={22} color={B.text3} />
            </Pressable>
          </View>

          {/* Worum es geht */}
          <View style={{ marginHorizontal: 22, marginTop: 16, padding: 14, borderRadius: 14, backgroundColor: B.ton }}>
            <Text style={{ ...n.fett, fontSize: 12.5, color: B.text3, marginBottom: 3 }}>Zur Frage</Text>
            <Text style={{ ...n.halb, fontSize: 14, lineHeight: 20, color: B.text }} numberOfLines={3}>
              {p.frage.text}
            </Text>
          </View>

          {/* Verlauf */}
          <ScrollView ref={scroll} style={{ flex: 1 }} contentContainerStyle={{ padding: 22, gap: 14 }} onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: true })}>
            {!p.nachrichten.length ? (
              <View style={{ gap: 14, paddingTop: 8 }}>
                <Text style={{ ...n.schwarz, fontSize: 22, lineHeight: 28, color: B.text }}>Wobei kann ich helfen?</Text>
                <Text style={{ ...n.halb, fontSize: 15, lineHeight: 22, color: B.text2 }}>Ich erkläre dir die Frage in Ruhe, gebe Beispiele oder einen Merksatz. Frag einfach.</Text>
                <Knopf titel={NICHT_VERSTANDEN} icon="help-circle" ton="lila" onPress={() => senden(NICHT_VERSTANDEN, "erklaeren")} />
                <View style={{ gap: 8 }}>
                  {NACHFRAGEN.map((q) => (
                    <Pressable key={q} onPress={() => senden(q)} style={(z: Zustand) => ({ flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14, height: 46, borderRadius: 12, borderWidth: 1.5, borderColor: z.hovered ? B.kante : B.linie, backgroundColor: z.hovered ? B.hover : B.flaeche })}>
                      <Icon name="chatbubble-ellipses-outline" size={17} color={B.lila} />
                      <Text style={{ flex: 1, ...n.fett, fontSize: 14.5, color: B.text }}>{q}</Text>
                      <Icon name="arrow-forward" size={16} color={B.text3} />
                    </Pressable>
                  ))}
                </View>
              </View>
            ) : (
              p.nachrichten.map((m) =>
                m.rolle === "ich" ? (
                  <View key={m.id} style={{ alignSelf: "flex-end", maxWidth: "85%", paddingHorizontal: 16, paddingVertical: 11, borderRadius: 18, borderBottomRightRadius: 6, backgroundColor: B.lila }}>
                    <Text style={{ ...n.fett, fontSize: 15, lineHeight: 21, color: "#FFFFFF" }}>{m.text}</Text>
                  </View>
                ) : (
                  <View key={m.id} style={{ alignSelf: "flex-start", maxWidth: "94%", gap: 8 }}>
                    <View style={{ paddingHorizontal: 16, paddingVertical: 13, borderRadius: 18, borderBottomLeftRadius: 6, backgroundColor: B.ton }}>
                      <TippText text={m.text} aktiv={p.tippt === m.id} onFertig={p.onTippFertig} />
                    </View>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 4, paddingLeft: 4 }}>
                      {m.quelle === "lernstoff" ? (
                        <>
                          <Icon name="book-outline" size={13} color={B.text3} />
                          <Text style={{ ...n.halb, fontSize: 12.5, color: B.text3, marginRight: 8 }}>Aus dem Lernstoff</Text>
                        </>
                      ) : null}
                      {m.id === letzteKi?.id && !p.tippt ? (
                        <>
                          <Daumen aktiv={p.bewertet[m.id] === true} onPress={() => p.onBewerten(true)} />
                          <Daumen runter aktiv={p.bewertet[m.id] === false} onPress={() => p.onBewerten(false)} />
                        </>
                      ) : null}
                    </View>
                  </View>
                ),
              )
            )}
            {p.laedt ? (
              <View style={{ alignSelf: "flex-start", paddingHorizontal: 16, paddingVertical: 13, borderRadius: 18, borderBottomLeftRadius: 6, backgroundColor: B.ton }}>
                <Denkt />
              </View>
            ) : null}
            {p.nachrichten.length && !p.laedt && !p.tippt && vorschlaege.length ? (
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {vorschlaege.map((q) => (
                  <Pressable key={q} onPress={() => senden(q)} style={(z: Zustand) => ({ height: 34, paddingHorizontal: 13, borderRadius: 17, justifyContent: "center", borderWidth: 1.5, borderColor: z.hovered ? B.lila : B.linie, backgroundColor: B.flaeche })}>
                    <Text style={{ ...n.fett, fontSize: 13.5, color: B.lilaKante }}>{q}</Text>
                  </Pressable>
                ))}
              </View>
            ) : null}
          </ScrollView>

          {/* Eingabe */}
          <View style={{ paddingHorizontal: 22, paddingTop: 12, paddingBottom: 18, gap: 8, borderTopWidth: 1.5, borderTopColor: B.linie }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10, minHeight: 52, paddingLeft: 16, paddingRight: 6, borderRadius: 16, borderWidth: 1.5, borderColor: p.text ? B.lila : B.linie, backgroundColor: B.ton }}>
              <TextInput
                value={p.text}
                onChangeText={p.onText}
                placeholder={p.nachrichten.length ? "Frag weiter …" : "Eigene Frage stellen …"}
                placeholderTextColor={B.text3}
                maxLength={300}
                autoFocus
                onSubmitEditing={() => senden(p.text)}
                style={{ flex: 1, ...n.halb, fontSize: 15.5, color: B.text, outlineWidth: 0, minHeight: 48 }}
              />
              <Pressable
                onPress={() => senden(p.text)}
                disabled={!p.text.trim() || p.laedt}
                accessibilityLabel="Senden (Enter)"
                style={{ width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: p.text.trim() && !p.laedt ? B.lila : B.linie }}
              >
                <Icon name="arrow-up" size={20} color="#FFFFFF" />
              </Pressable>
            </View>
            <Text style={{ ...n.halb, fontSize: 12, color: B.text3 }}>Enter sendet · Esc schließt · KI-Antworten können fehlerhaft sein</Text>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}
