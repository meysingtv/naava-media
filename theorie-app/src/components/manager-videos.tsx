import { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";

import { dialog } from "@/components/dialog";
import { Icon } from "@/components/icon";
import { Drehung, Fenster, Hinweis, IconTaste, MEingabe, mFlaeche, MKnopf, Reiter, Tafel, M, type Zustand } from "@/components/manager-teile";
import { n as nf } from "@/components/web/bunt";
import { erklaervideoHochladenDatei, erklaervideoLoeschen, erklaervideoUrl, useErklaervideos } from "@/lib/erklaervideos";
import { FRAGEN, THEMEN, themaVon, type ThemaId } from "@/lib/fragen";
import { themavideoHochladen, themavideoLoeschen, themavideoUmbenennen, themavideoUrl, themavideoVerschieben, useThemenvideos, type Themavideo } from "@/lib/themenvideos";
import { videoDauer, videoPruefen } from "@/lib/web-hochladen";

// Videos im Manager (nur im Browser): Videos zu ganzen Themen – mehrere je
// Thema, sichtbar auf der Themenseite – und Erklärvideos zu einzelnen Fragen,
// die beim Lernen neben der KI-Hilfe erscheinen. Dateien per Klick oder
// Ziehen & Ablegen, mit Fortschritt beim Hochladen.

/** Datei-Dialog des Browsers öffnen. */
function dateiWaehlen(): Promise<File | null> {
  return new Promise((fertig) => {
    const feld = document.createElement("input");
    feld.type = "file";
    feld.accept = "video/mp4,video/quicktime,.mp4,.mov";
    feld.onchange = () => fertig(feld.files?.[0] ?? null);
    feld.click();
  });
}

/** Ziehen & Ablegen auf eine Fläche (React Native Web gibt das DOM-Element als ref). */
function useAblage(onDatei: (d: File) => void) {
  const ref = useRef<View>(null);
  const [drueber, setDrueber] = useState(false);
  const aufruf = useRef(onDatei);
  aufruf.current = onDatei;
  useEffect(() => {
    const el = ref.current as unknown as HTMLElement | null;
    if (!el || typeof el.addEventListener !== "function") return;
    const ueber = (e: DragEvent) => {
      e.preventDefault();
      setDrueber(true);
    };
    const weg = () => setDrueber(false);
    const ab = (e: DragEvent) => {
      e.preventDefault();
      setDrueber(false);
      const d = e.dataTransfer?.files?.[0];
      if (d) aufruf.current(d);
    };
    el.addEventListener("dragover", ueber);
    el.addEventListener("dragleave", weg);
    el.addEventListener("drop", ab);
    return () => {
      el.removeEventListener("dragover", ueber);
      el.removeEventListener("dragleave", weg);
      el.removeEventListener("drop", ab);
    };
  }, []);
  return { ref, drueber };
}

function dauerText(s: number | null): string {
  if (!s) return "";
  const m = Math.floor(s / 60);
  return `${m}:${String(Math.round(s % 60)).padStart(2, "0")}`;
}

/** Vorschaubild: erstes Bild des Videos. */
function Vorschau({ url, breite = 160, onPress }: { url: string; breite?: number; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel="Video ansehen" style={(z: Zustand) => ({ width: breite, height: (breite * 9) / 16, borderRadius: 6, overflow: "hidden", backgroundColor: "#0B0E12", opacity: z.hovered ? 0.85 : 1 })}>
      <video src={`${url}#t=0.4`} preload="metadata" muted playsInline style={{ width: "100%", height: "100%", objectFit: "cover", pointerEvents: "none" }} />
      <View style={{ position: "absolute", left: 6, bottom: 6, width: 22, height: 22, borderRadius: 5, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.55)" }}>
        <Icon name="play" size={11} color="#FFFFFF" />
      </View>
    </Pressable>
  );
}

function Abspielen({ url, titel, onSchliessen }: { url: string | null; titel: string; onSchliessen: () => void }) {
  return (
    <Fenster offen={!!url} onSchliessen={onSchliessen} titel={titel} breite={860}>
      {url ? <video src={url} controls autoPlay playsInline style={{ width: "100%", maxHeight: "70vh", borderRadius: 8, background: "#000" }} /> : null}
    </Fenster>
  );
}

/** Fläche zum Ablegen oder Auswählen eines Videos. */
function Ablage({ onDatei }: { onDatei: (d: File) => void }) {
    const { ref, drueber } = useAblage(onDatei);
  return (
    <Pressable
      ref={ref}
      onPress={async () => {
        const d = await dateiWaehlen();
        if (d) onDatei(d);
      }}
      style={(z: Zustand) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingHorizontal: 16,
        height: 64,
        borderRadius: 8,
        borderWidth: 1,
        borderStyle: "dashed",
        borderColor: drueber ? M.orange : z.hovered ? M.text3 : M.linieStark,
        backgroundColor: drueber ? M.orangeSoft : z.hovered ? M.hover : M.flaeche2,
      })}
    >
      <Icon name="cloud-upload-outline" size={18} color={drueber ? M.orange : M.text2} />
      <View style={{ flex: 1 }}>
        <Text style={{ ...nf.halb, fontSize: 14, color: M.text }}>{drueber ? "Loslassen zum Hochladen" : "Video hierher ziehen oder klicken"}</Text>
        <Text style={{ ...nf.text, fontSize: 13, color: M.text3 }}>MP4 oder MOV · bis 50 MB · Hochformat oder 16:9</Text>
      </View>
    </Pressable>
  );
}

function Fortschritt({ anteil, text, onAbbrechen }: { anteil: number; text: string; onAbbrechen?: () => void }) {
    return (
    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <Drehung farbe={M.text2} groesse={14} />
        <Text style={{ flex: 1, ...nf.text, fontSize: 14, color: M.text }} numberOfLines={1}>
          {text}
        </Text>
        <Text style={{ ...nf.halb, fontSize: 14, color: M.text2, fontVariant: ["tabular-nums"] }}>{Math.round(anteil * 100)} %</Text>
        {onAbbrechen ? <MKnopf titel="Abbrechen" art="leise" onPress={onAbbrechen} /> : null}
      </View>
      <View style={{ height: 4, borderRadius: 2, backgroundColor: M.flaeche2, overflow: "hidden" }}>
        <View style={{ width: `${Math.round(anteil * 100)}%`, height: "100%", backgroundColor: M.orange }} />
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Themenvideos
// ---------------------------------------------------------------------------

type Upload = { datei: File; titel: string; dauer: number | null; anteil: number; laeuft: boolean };

function ThemenVideos() {
    const { videos } = useThemenvideos();
  const [thema, setThema] = useState<ThemaId>(THEMEN[0].id);
  const [upload, setUpload] = useState<Upload | null>(null);
  const [fehler, setFehler] = useState<string | null>(null);
  const [ansehen, setAnsehen] = useState<Themavideo | null>(null);
  const [umbenennen, setUmbenennen] = useState<{ id: string; titel: string } | null>(null);
  const abbruch = useRef<{ aktuell: (() => void) | null }>({ aktuell: null });

  const anzahl = (id: string) => videos.filter((v) => v.thema_id === id).length;
  const liste = videos.filter((v) => v.thema_id === thema);
  const t = themaVon(thema);

  async function datei(d: File) {
    setFehler(null);
    const problem = videoPruefen(d);
    if (problem) return setFehler(problem);
    const titel = d.name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim().slice(0, 80);
    setUpload({ datei: d, titel, dauer: await videoDauer(d), anteil: 0, laeuft: false });
  }

  async function hochladen() {
    if (!upload) return;
    if (!upload.titel.trim()) return setFehler("Bitte gib dem Video einen Titel.");
    setFehler(null);
    setUpload({ ...upload, laeuft: true, anteil: 0 });
    try {
      await themavideoHochladen({
        themaId: thema,
        titel: upload.titel.trim(),
        datei: upload.datei,
        dauer: upload.dauer,
        onFortschritt: (a) => setUpload((u) => (u ? { ...u, anteil: a } : u)),
        abbruch: abbruch.current,
      });
      setUpload(null);
    } catch (e) {
      setFehler(e instanceof Error ? e.message : String(e));
      setUpload((u) => (u ? { ...u, laeuft: false } : u));
    }
  }

  const loeschen = (v: Themavideo) =>
    dialog("Video löschen?", `„${v.titel}“ verschwindet aus dem Thema ${t.titel}.`, [
      { text: "Abbrechen", style: "cancel" },
      { text: "Löschen", style: "destructive", onPress: () => themavideoLoeschen(v.id).catch((e) => setFehler(e instanceof Error ? e.message : String(e))) },
    ]);

  async function umbenennenSichern() {
    if (!umbenennen) return;
    try {
      await themavideoUmbenennen(umbenennen.id, umbenennen.titel);
      setUmbenennen(null);
    } catch (e) {
      setFehler(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <View style={{ flexDirection: "row", gap: 20, alignItems: "flex-start" }}>
      <View style={[mFlaeche(), { width: 250, paddingVertical: 6, overflow: "hidden" }]}>
        {THEMEN.map((th) => {
          const aktiv = th.id === thema;
          const n = anzahl(th.id);
          return (
            <Pressable
              key={th.id}
              onPress={() => {
                setThema(th.id);
                setUpload(null);
                setFehler(null);
              }}
              style={(z: Zustand) => ({ flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14, height: 36, backgroundColor: aktiv ? M.orangeSoft : z.hovered ? M.hover : "transparent" })}
            >
              <Icon name={th.icon} size={15} color={aktiv ? M.orange : M.text3} />
              <Text style={{ flex: 1, ...(aktiv ? nf.fett : nf.text), fontSize: 14, color: aktiv ? M.text : M.text2 }} numberOfLines={1}>
                {th.titel}
              </Text>
              <Text style={{ ...nf.halb, fontSize: 12.5, color: n ? M.text2 : M.text3, fontVariant: ["tabular-nums"] }}>{n || "–"}</Text>
            </Pressable>
          );
        })}
      </View>

      <Tafel titel={t.titel} rechts={<Text style={{ ...nf.text, fontSize: 13, color: M.text3 }}>erscheint auf der Themenseite</Text>} style={{ flex: 1, minWidth: 0 }} innen={false}>
        <View style={{ padding: 16, gap: 12, borderBottomWidth: liste.length ? 1 : 0, borderBottomColor: M.linie }}>
          {upload ? (
            <View style={{ gap: 12 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <Icon name="film-outline" size={16} color={M.text2} />
                <Text style={{ flex: 1, ...nf.halb, fontSize: 14, color: M.text }} numberOfLines={1}>
                  {upload.datei.name}
                </Text>
                <Text style={{ ...nf.text, fontSize: 13, color: M.text3 }}>
                  {Math.round(upload.datei.size / 1024 / 1024)} MB{upload.dauer ? ` · ${dauerText(upload.dauer)}` : ""}
                </Text>
              </View>
              {upload.laeuft ? (
                <Fortschritt anteil={upload.anteil} text="Wird hochgeladen …" onAbbrechen={() => abbruch.current.aktuell?.()} />
              ) : (
                <View style={{ flexDirection: "row", gap: 8 }}>
                  <View style={{ flex: 1 }}>
                    <MEingabe placeholder="Titel, z. B. „Rechts vor links in 2 Minuten“" value={upload.titel} onChangeText={(titel) => setUpload({ ...upload, titel })} maxLength={80} />
                  </View>
                  <MKnopf titel="Verwerfen" art="leise" onPress={() => setUpload(null)} />
                  <MKnopf titel="Hochladen" onPress={hochladen} />
                </View>
              )}
            </View>
          ) : (
            <Ablage onDatei={datei} />
          )}
          {fehler ? <Hinweis art="fehler">{fehler}</Hinweis> : null}
          {liste.length === 0 && !upload ? <Text style={{ ...nf.text, fontSize: 14, color: M.text3 }}>Noch keine Videos zu diesem Thema.</Text> : null}
        </View>

        {liste.map((v, i) => (
          <View key={v.id} style={{ flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 16, paddingVertical: 10, borderTopWidth: i > 0 ? 1 : 0, borderTopColor: M.linie }}>
            <Text style={{ width: 16, ...nf.halb, fontSize: 13, color: M.text3, fontVariant: ["tabular-nums"] }}>{i + 1}</Text>
            <Vorschau url={themavideoUrl(v.pfad)} breite={128} onPress={() => setAnsehen(v)} />
            <View style={{ flex: 1, gap: 3 }}>
              {umbenennen?.id === v.id ? (
                <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
                  <View style={{ flex: 1 }}>
                    <MEingabe value={umbenennen.titel} onChangeText={(titel) => setUmbenennen({ id: v.id, titel })} maxLength={80} autoFocus onSubmitEditing={umbenennenSichern} />
                  </View>
                  <MKnopf titel="Abbrechen" art="leise" onPress={() => setUmbenennen(null)} />
                  <MKnopf titel="Sichern" onPress={umbenennenSichern} />
                </View>
              ) : (
                <Text style={{ ...nf.halb, fontSize: 14.5, color: M.text }} numberOfLines={2}>
                  {v.titel}
                </Text>
              )}
              <Text style={{ ...nf.text, fontSize: 13, color: M.text3 }}>{[dauerText(v.dauer), new Date(v.erstellt_am).toLocaleDateString("de-DE")].filter(Boolean).join(" · ")}</Text>
            </View>
            <View style={{ flexDirection: "row", gap: 2 }}>
              <IconTaste icon="chevron-up" label="Nach oben" aus={i === 0} onPress={() => themavideoVerschieben(v.id, -1).catch((e) => setFehler(String(e?.message ?? e)))} />
              <IconTaste icon="chevron-down" label="Nach unten" aus={i === liste.length - 1} onPress={() => themavideoVerschieben(v.id, 1).catch((e) => setFehler(String(e?.message ?? e)))} />
              <IconTaste icon="create-outline" label="Umbenennen" onPress={() => setUmbenennen({ id: v.id, titel: v.titel })} />
              <IconTaste icon="trash-outline" label="Löschen" gefahr onPress={() => loeschen(v)} />
            </View>
          </View>
        ))}
      </Tafel>
      <Abspielen url={ansehen ? themavideoUrl(ansehen.pfad) : null} titel={ansehen?.titel ?? ""} onSchliessen={() => setAnsehen(null)} />
    </View>
  );
}

// ---------------------------------------------------------------------------
// Erklärvideos zu Fragen
// ---------------------------------------------------------------------------

function FragenVideos() {
    const { videos } = useErklaervideos();
  const [suche, setSuche] = useState("");
  const [nur, setNur] = useState<"alle" | "mit" | "ohne">("alle");
  const [laeuft, setLaeuft] = useState<{ frage: string; anteil: number } | null>(null);
  const [fehler, setFehler] = useState<string | null>(null);
  const [ansehen, setAnsehen] = useState<string | null>(null);
  const abbruch = useRef<{ aktuell: (() => void) | null }>({ aktuell: null });

  const treffer = useMemo(() => {
    const s = suche.trim().toLowerCase();
    return FRAGEN.filter((q) => (nur === "mit" ? !!videos[q.id] : nur === "ohne" ? !videos[q.id] : true)).filter((q) => !s || q.id.toLowerCase() === s || q.text.toLowerCase().includes(s) || themaVon(q.thema).titel.toLowerCase().includes(s));
  }, [suche, nur, videos]);
  const mitVideo = Object.keys(videos).length;

  async function hochladen(frageId: string) {
    const d = await dateiWaehlen();
    if (!d) return;
    const problem = videoPruefen(d);
    if (problem) return setFehler(problem);
    setFehler(null);
    setLaeuft({ frage: frageId, anteil: 0 });
    try {
      await erklaervideoHochladenDatei({ frageId, datei: d, dauer: await videoDauer(d), onFortschritt: (a) => setLaeuft({ frage: frageId, anteil: a }), abbruch: abbruch.current });
    } catch (e) {
      setFehler(e instanceof Error ? e.message : String(e));
    } finally {
      setLaeuft(null);
    }
  }

  const loeschen = (frageId: string) =>
    dialog("Erklärvideo löschen?", "Beim Lernen erscheint zu dieser Frage dann wieder nur die KI-Hilfe.", [
      { text: "Abbrechen", style: "cancel" },
      { text: "Löschen", style: "destructive", onPress: () => erklaervideoLoeschen(frageId).catch((e) => setFehler(e instanceof Error ? e.message : String(e))) },
    ]);

  return (
    <View style={[mFlaeche(), { overflow: "hidden" }]}>
      <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", columnGap: 16, rowGap: 8, paddingHorizontal: 16, paddingTop: 4, borderBottomWidth: 1, borderBottomColor: M.linie }}>
        <Reiter
          wert={nur}
          onWechsel={setNur}
          optionen={[
            { id: "alle", titel: "Alle Fragen", zahl: FRAGEN.length },
            { id: "mit", titel: "Mit Video", zahl: mitVideo },
            { id: "ohne", titel: "Ohne Video", zahl: FRAGEN.length - mitVideo },
          ]}
        />
        <View style={{ width: 320, maxWidth: "100%", paddingVertical: 6 }}>
          <MEingabe icon="search" placeholder="Frage, Thema oder Nummer (z. B. v12)" value={suche} onChangeText={setSuche} autoCapitalize="none" />
        </View>
      </View>
      {fehler || laeuft ? (
        <View style={{ padding: 16, gap: 12, borderBottomWidth: 1, borderBottomColor: M.linie }}>
          {fehler ? <Hinweis art="fehler">{fehler}</Hinweis> : null}
          {laeuft ? <Fortschritt anteil={laeuft.anteil} text={`Video zu ${laeuft.frage} wird hochgeladen …`} onAbbrechen={() => abbruch.current.aktuell?.()} /> : null}
        </View>
      ) : null}

      {treffer.slice(0, 80).map((q, i) => {
        const v = videos[q.id];
        return (
          <View key={q.id} style={{ flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 16, paddingVertical: 10, borderTopWidth: i > 0 ? 1 : 0, borderTopColor: M.linie }}>
            <Text style={{ width: 44, ...nf.halb, fontSize: 13, color: M.text2, fontVariant: ["tabular-nums"] }}>{q.id}</Text>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={{ ...nf.text, fontSize: 14, lineHeight: 19, color: M.text }} numberOfLines={2}>
                {q.text}
              </Text>
              <Text style={{ ...nf.text, fontSize: 13, color: M.text3 }}>{themaVon(q.thema).titel}</Text>
            </View>
            {v ? <Vorschau url={erklaervideoUrl(v.pfad)} breite={96} onPress={() => setAnsehen(q.id)} /> : <Text style={{ width: 96, textAlign: "center", ...nf.text, fontSize: 13, color: M.text3 }}>kein Video</Text>}
            <View style={{ width: 132, flexDirection: "row", justifyContent: "flex-end", alignItems: "center", gap: 2 }}>
              {laeuft?.frage === q.id ? (
                <Drehung farbe={M.text2} groesse={14} />
              ) : (
                <>
                  <MKnopf titel={v ? "Ersetzen" : "Hochladen"} art={v ? "leise" : "sekundaer"} deaktiviert={!!laeuft} onPress={() => hochladen(q.id)} />
                  {v ? <IconTaste icon="trash-outline" label="Löschen" gefahr onPress={() => loeschen(q.id)} /> : null}
                </>
              )}
            </View>
          </View>
        );
      })}
      <View style={{ paddingHorizontal: 16, minHeight: 38, paddingVertical: 10, justifyContent: "center", borderTopWidth: 1, borderTopColor: M.linie, backgroundColor: M.flaeche2 }}>
        <Text style={{ ...nf.text, fontSize: 13, color: M.text3 }}>
          {treffer.length === 0 ? "Keine Fragen gefunden." : treffer.length > 80 ? `80 von ${treffer.length} – such genauer, um die übrigen zu sehen.` : `${treffer.length} Fragen`} · Ein Video je Frage, es erscheint beim Lernen neben der KI-Hilfe. Ein neues ersetzt das alte.
        </Text>
      </View>
      <Abspielen url={ansehen && videos[ansehen] ? erklaervideoUrl(videos[ansehen].pfad) : null} titel={ansehen ? `Erklärvideo zu ${ansehen}` : ""} onSchliessen={() => setAnsehen(null)} />
    </View>
  );
}

export function VideoVerwaltung() {
    const [art, setArt] = useState<"themen" | "fragen">("themen");
  const zahlen = useVideoZahlen();
  return (
    <View style={{ gap: 16 }}>
      <View style={{ borderBottomWidth: 1, borderBottomColor: M.linie }}>
        <Reiter
          wert={art}
          onWechsel={setArt}
          optionen={[
            { id: "themen", titel: "Videos zu Themen", zahl: zahlen.themen },
            { id: "fragen", titel: "Erklärvideos zu Fragen", zahl: zahlen.fragen },
          ]}
        />
      </View>
      {art === "themen" ? <ThemenVideos /> : <FragenVideos />}
    </View>
  );
}

/** Für die Übersicht: wie viele Videos es gibt. */
export function useVideoZahlen(): { themen: number; fragen: number } {
  const { videos: themen } = useThemenvideos();
  const { videos: fragen } = useErklaervideos();
  return { themen: themen.length, fragen: Object.keys(fragen).length };
}
