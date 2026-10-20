import { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";

import { dialog } from "@/components/dialog";
import { Icon } from "@/components/icon";
import { Auswahl, Drehung, Fenster, Hinweis, MEingabe, mFlaeche, MKarte, MKnopf, rotVon, type Zustand } from "@/components/manager-teile";
import { useFarbwelt } from "@/lib/darstellung";
import { erklaervideoHochladenDatei, erklaervideoLoeschen, erklaervideoUrl, useErklaervideos } from "@/lib/erklaervideos";
import { FRAGEN, THEMEN, themaVon, type ThemaId } from "@/lib/fragen";
import { themavideoHochladen, themavideoLoeschen, themavideoUmbenennen, themavideoUrl, themavideoVerschieben, useThemenvideos, type Themavideo } from "@/lib/themenvideos";
import { mitDeckkraft, schrift } from "@/lib/theme";
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
function Vorschau({ url, breite = 168, onPress }: { url: string; breite?: number; onPress?: () => void }) {
  const f = useFarbwelt();
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel="Video ansehen" style={(z: Zustand) => ({ width: breite, height: (breite * 9) / 16, borderRadius: 12, overflow: "hidden", backgroundColor: "#0B0E12", opacity: z.hovered ? 0.88 : 1 })}>
      <video src={`${url}#t=0.4`} preload="metadata" muted playsInline style={{ width: "100%", height: "100%", objectFit: "cover", pointerEvents: "none" }} />
      <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center" }}>
        <View style={{ width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.45)", borderWidth: 1, borderColor: "rgba(255,255,255,0.4)" }}>
          <Icon name="play" size={16} color="#FFFFFF" />
        </View>
      </View>
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 2, backgroundColor: mitDeckkraft(f.orange, 0.8) }} />
    </Pressable>
  );
}

function Abspielen({ url, titel, onSchliessen }: { url: string | null; titel: string; onSchliessen: () => void }) {
  return (
    <Fenster offen={!!url} onSchliessen={onSchliessen} titel={titel} breite={860}>
      {url ? <video src={url} controls autoPlay playsInline style={{ width: "100%", maxHeight: "70vh", borderRadius: 16, background: "#000" }} /> : null}
    </Fenster>
  );
}

/** Fläche zum Ablegen oder Auswählen eines Videos. */
function Ablage({ onDatei, klein }: { onDatei: (d: File) => void; klein?: boolean }) {
  const f = useFarbwelt();
  const { ref, drueber } = useAblage(onDatei);
  return (
    <Pressable
      ref={ref}
      onPress={async () => {
        const d = await dateiWaehlen();
        if (d) onDatei(d);
      }}
      style={(z: Zustand) => ({
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        paddingVertical: klein ? 18 : 30,
        borderRadius: 18,
        borderWidth: 1.5,
        borderStyle: "dashed",
        borderColor: drueber || z.hovered ? f.orange : f.hell ? "rgba(20,23,27,0.18)" : "rgba(255,255,255,0.18)",
        backgroundColor: drueber ? f.orangeSoft : z.hovered ? (f.hell ? "#FFFBF6" : "rgba(252,91,14,0.05)") : f.hell ? "#FBFAF7" : "rgba(255,255,255,0.02)",
      })}
    >
      <View style={{ width: 46, height: 46, borderRadius: 23, alignItems: "center", justifyContent: "center", backgroundColor: f.orangeSoft }}>
        <Icon name="cloud-upload-outline" size={22} color={f.orange} />
      </View>
      <Text style={{ ...schrift.textHalb, fontSize: 14.5, color: f.text }}>{drueber ? "Loslassen zum Hochladen" : "Video hierher ziehen oder klicken"}</Text>
      <Text style={{ ...schrift.text, fontSize: 12.5, color: f.text3 }}>MP4 oder MOV · bis 50 MB · am besten Hochformat oder 16:9</Text>
    </Pressable>
  );
}

function Fortschritt({ anteil, text, onAbbrechen }: { anteil: number; text: string; onAbbrechen?: () => void }) {
  const f = useFarbwelt();
  return (
    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <Drehung farbe={f.orange} />
        <Text style={{ flex: 1, ...schrift.textHalb, fontSize: 13.5, color: f.text }} numberOfLines={1}>
          {text}
        </Text>
        <Text style={{ ...schrift.textHalb, fontSize: 13.5, color: f.text2, fontVariant: ["tabular-nums"] }}>{Math.round(anteil * 100)} %</Text>
        {onAbbrechen ? <MKnopf titel="Abbrechen" art="leise" onPress={onAbbrechen} /> : null}
      </View>
      <View style={{ height: 6, borderRadius: 3, backgroundColor: f.hell ? "rgba(20,23,27,0.07)" : "rgba(255,255,255,0.08)", overflow: "hidden" }}>
        <View style={{ width: `${Math.round(anteil * 100)}%`, height: "100%", backgroundColor: f.orange, borderRadius: 3 }} />
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Themenvideos
// ---------------------------------------------------------------------------

type Upload = { datei: File; titel: string; dauer: number | null; anteil: number; laeuft: boolean };

function ThemenVideos() {
  const f = useFarbwelt();
  const { videos } = useThemenvideos();
  const [thema, setThema] = useState<ThemaId>(THEMEN[0].id);
  const [upload, setUpload] = useState<Upload | null>(null);
  const [fehler, setFehler] = useState<string | null>(null);
  const [ansehen, setAnsehen] = useState<Themavideo | null>(null);
  const [umbenennen, setUmbenennen] = useState<{ id: string; titel: string } | null>(null);
  const abbruch = useRef<{ aktuell: (() => void) | null }>({ aktuell: null });

  const zahl = (id: string) => videos.filter((v) => v.thema_id === id).length;
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
      <View style={[{ width: 260, borderRadius: 22, padding: 8 }, mFlaeche(f)]}>
        {THEMEN.map((th) => {
          const aktiv = th.id === thema;
          const n = zahl(th.id);
          return (
            <Pressable
              key={th.id}
              onPress={() => {
                setThema(th.id);
                setUpload(null);
                setFehler(null);
              }}
              style={(z: Zustand) => ({ flexDirection: "row", alignItems: "center", gap: 11, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 14, backgroundColor: aktiv ? f.orangeSoft : z.hovered ? (f.hell ? "#FAF7F2" : "rgba(255,255,255,0.04)") : "transparent" })}
            >
              <Icon name={th.icon} size={18} color={aktiv ? f.orange : f.text2} />
              <Text style={{ flex: 1, ...schrift.textHalb, fontSize: 14, color: aktiv ? f.orange : f.text }} numberOfLines={1}>
                {th.titel}
              </Text>
              {n ? (
                <View style={{ minWidth: 22, height: 22, paddingHorizontal: 6, borderRadius: 11, alignItems: "center", justifyContent: "center", backgroundColor: aktiv ? f.orange : f.hell ? "rgba(20,23,27,0.07)" : "rgba(255,255,255,0.1)" }}>
                  <Text style={{ ...schrift.textFett, fontSize: 11.5, color: aktiv ? "#FFFFFF" : f.text2 }}>{n}</Text>
                </View>
              ) : null}
            </Pressable>
          );
        })}
      </View>

      <MKarte style={{ flex: 1, gap: 18 }}>
        <View style={{ gap: 4 }}>
          <Text style={{ ...schrift.titel, fontSize: 22, letterSpacing: -0.4, color: f.text }}>{t.titel}</Text>
          <Text style={{ ...schrift.text, fontSize: 14, color: f.text3 }}>{t.kurz} · erscheint auf der Themenseite in der App</Text>
        </View>

        {upload ? (
          <View style={{ gap: 14, padding: 16, borderRadius: 18, borderWidth: 1, borderColor: f.linie, backgroundColor: f.hell ? "#FBFAF7" : "rgba(255,255,255,0.03)" }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <Icon name="film-outline" size={18} color={f.orange} />
              <Text style={{ flex: 1, ...schrift.textHalb, fontSize: 14, color: f.text }} numberOfLines={1}>
                {upload.datei.name}
              </Text>
              <Text style={{ ...schrift.textMittel, fontSize: 13, color: f.text3 }}>
                {Math.round(upload.datei.size / 1024 / 1024)} MB{upload.dauer ? ` · ${dauerText(upload.dauer)}` : ""}
              </Text>
            </View>
            {upload.laeuft ? (
              <Fortschritt anteil={upload.anteil} text="Wird hochgeladen …" onAbbrechen={() => abbruch.current.aktuell?.()} />
            ) : (
              <>
                <MEingabe placeholder="Titel, z. B. „Rechts vor links in 2 Minuten“" value={upload.titel} onChangeText={(titel) => setUpload({ ...upload, titel })} maxLength={80} />
                <View style={{ flexDirection: "row", justifyContent: "flex-end", gap: 10 }}>
                  <MKnopf titel="Verwerfen" art="leise" onPress={() => setUpload(null)} />
                  <MKnopf titel="Hochladen" icon="cloud-upload" onPress={hochladen} />
                </View>
              </>
            )}
          </View>
        ) : (
          <Ablage onDatei={datei} />
        )}
        {fehler ? <Hinweis art="fehler">{fehler}</Hinweis> : null}

        {liste.length === 0 ? (
          <Text style={{ ...schrift.text, fontSize: 14, color: f.text3, textAlign: "center", paddingVertical: 8 }}>Noch keine Videos zu diesem Thema.</Text>
        ) : (
          <View style={{ gap: 4 }}>
            {liste.map((v, i) => (
              <View key={v.id} style={{ flexDirection: "row", alignItems: "center", gap: 16, paddingVertical: 10, borderTopWidth: i > 0 ? 1 : 0, borderTopColor: f.linie }}>
                <Vorschau url={themavideoUrl(v.pfad)} onPress={() => setAnsehen(v)} />
                <View style={{ flex: 1, gap: 4 }}>
                  {umbenennen?.id === v.id ? (
                    <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
                      <View style={{ flex: 1 }}>
                        <MEingabe value={umbenennen.titel} onChangeText={(titel) => setUmbenennen({ id: v.id, titel })} maxLength={80} autoFocus onSubmitEditing={umbenennenSichern} />
                      </View>
                      <MKnopf titel="Sichern" onPress={umbenennenSichern} />
                    </View>
                  ) : (
                    <Text style={{ ...schrift.textHalb, fontSize: 15.5, color: f.text }} numberOfLines={2}>
                      {v.titel}
                    </Text>
                  )}
                  <Text style={{ ...schrift.text, fontSize: 12.5, color: f.text3 }}>
                    {[dauerText(v.dauer), new Date(v.erstellt_am).toLocaleDateString("de-DE")].filter(Boolean).join(" · ")}
                  </Text>
                </View>
                <View style={{ flexDirection: "row", gap: 2 }}>
                  <IconTaste icon="chevron-up" label="Nach oben" aus={i === 0} onPress={() => themavideoVerschieben(v.id, -1).catch((e) => setFehler(String(e?.message ?? e)))} />
                  <IconTaste icon="chevron-down" label="Nach unten" aus={i === liste.length - 1} onPress={() => themavideoVerschieben(v.id, 1).catch((e) => setFehler(String(e?.message ?? e)))} />
                  <IconTaste icon="create-outline" label="Umbenennen" onPress={() => setUmbenennen({ id: v.id, titel: v.titel })} />
                  <IconTaste icon="trash-outline" label="Löschen" gefahr onPress={() => loeschen(v)} />
                </View>
              </View>
            ))}
          </View>
        )}
      </MKarte>
      <Abspielen url={ansehen ? themavideoUrl(ansehen.pfad) : null} titel={ansehen?.titel ?? ""} onSchliessen={() => setAnsehen(null)} />
    </View>
  );
}

function IconTaste({ icon, label, onPress, gefahr, aus }: { icon: "chevron-up" | "chevron-down" | "create-outline" | "trash-outline" | "play" | "swap-horizontal"; label: string; onPress: () => void; gefahr?: boolean; aus?: boolean }) {
  const f = useFarbwelt();
  const c = gefahr ? rotVon(f) : f.text2;
  return (
    <Pressable
      onPress={onPress}
      disabled={aus}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={(z: Zustand) => ({ width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", opacity: aus ? 0.3 : 1, backgroundColor: z.hovered && !aus ? (gefahr ? mitDeckkraft(c, 0.1) : f.hell ? "rgba(20,23,27,0.06)" : "rgba(255,255,255,0.08)") : "transparent" })}
    >
      <Icon name={icon} size={17} color={c} />
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// Erklärvideos zu Fragen
// ---------------------------------------------------------------------------

function FragenVideos() {
  const f = useFarbwelt();
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
    <MKarte style={{ gap: 16 }}>
      <View style={{ flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <View style={{ flexGrow: 1, flexBasis: 280, maxWidth: 440 }}>
          <MEingabe icon="search" placeholder="Frage, Thema oder Nummer (z. B. v12) suchen" value={suche} onChangeText={setSuche} autoCapitalize="none" />
        </View>
        <Auswahl
          wert={nur}
          onWechsel={setNur}
          optionen={[
            { id: "alle", titel: `Alle · ${FRAGEN.length}` },
            { id: "mit", titel: `Mit Video · ${mitVideo}` },
            { id: "ohne", titel: `Ohne Video · ${FRAGEN.length - mitVideo}` },
          ]}
        />
      </View>
      <Text style={{ ...schrift.text, fontSize: 13.5, color: f.text3 }}>Ein Video je Frage – beim Lernen erscheint es neben der KI-Hilfe. Ein neues Video ersetzt das alte.</Text>
      {fehler ? <Hinweis art="fehler">{fehler}</Hinweis> : null}
      {laeuft ? <Fortschritt anteil={laeuft.anteil} text={`Video zu ${laeuft.frage} wird hochgeladen …`} onAbbrechen={() => abbruch.current.aktuell?.()} /> : null}

      <View>
        {treffer.slice(0, 80).map((q, i) => {
          const v = videos[q.id];
          return (
            <View key={q.id} style={{ flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 12, borderTopWidth: i > 0 ? 1 : 0, borderTopColor: f.linie }}>
              {v ? (
                <Vorschau url={erklaervideoUrl(v.pfad)} breite={112} onPress={() => setAnsehen(q.id)} />
              ) : (
                <View style={{ width: 112, height: 63, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: f.hell ? "#F3EFE8" : "rgba(255,255,255,0.04)" }}>
                  <Icon name="videocam-off-outline" size={18} color={f.text3} />
                </View>
              )}
              <View style={{ flex: 1, gap: 4 }}>
                <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
                  <View style={{ height: 22, paddingHorizontal: 8, borderRadius: 6, justifyContent: "center", backgroundColor: f.hell ? "rgba(20,23,27,0.06)" : "rgba(255,255,255,0.08)" }}>
                    <Text style={{ ...schrift.textFett, fontSize: 11.5, color: f.text2 }}>{q.id}</Text>
                  </View>
                  <Text style={{ ...schrift.textMittel, fontSize: 12.5, color: f.text3 }}>{themaVon(q.thema).titel}</Text>
                </View>
                <Text style={{ ...schrift.textHalb, fontSize: 14, lineHeight: 19, color: f.text }} numberOfLines={2}>
                  {q.text}
                </Text>
              </View>
              {laeuft?.frage === q.id ? (
                <Drehung farbe={f.orange} />
              ) : (
                <View style={{ flexDirection: "row", gap: 6, alignItems: "center" }}>
                  <MKnopf titel={v ? "Ersetzen" : "Hochladen"} icon={v ? "swap-horizontal" : "cloud-upload-outline"} art="sekundaer" deaktiviert={!!laeuft} onPress={() => hochladen(q.id)} />
                  {v ? <IconTaste icon="trash-outline" label="Löschen" gefahr onPress={() => loeschen(q.id)} /> : null}
                </View>
              )}
            </View>
          );
        })}
        {treffer.length > 80 ? <Text style={{ ...schrift.text, fontSize: 13, color: f.text3, textAlign: "center", paddingTop: 12 }}>{treffer.length - 80} weitere – such genauer, um sie zu sehen.</Text> : null}
        {treffer.length === 0 ? <Text style={{ ...schrift.text, fontSize: 14, color: f.text3, textAlign: "center", paddingVertical: 20 }}>Keine Fragen gefunden.</Text> : null}
      </View>
      <Abspielen url={ansehen && videos[ansehen] ? erklaervideoUrl(videos[ansehen].pfad) : null} titel={ansehen ? `Erklärvideo zu ${ansehen}` : ""} onSchliessen={() => setAnsehen(null)} />
    </MKarte>
  );
}

export function VideoVerwaltung() {
  const [art, setArt] = useState<"themen" | "fragen">("themen");
  return (
    <View style={{ gap: 18 }}>
      <Auswahl
        wert={art}
        onWechsel={setArt}
        optionen={[
          { id: "themen", titel: "Videos zu Themen", icon: "albums-outline" },
          { id: "fragen", titel: "Erklärvideos zu Fragen", icon: "help-circle-outline" },
        ]}
      />
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

