import { useEffect, useMemo, useRef, useState } from "react";
import { Image, Pressable, Text, View } from "react-native";

import { dialog } from "@/components/dialog";
import { Icon } from "@/components/icon";
import { Auswahl, Drehung, Feld, Fenster, Hinweis, IconTaste, MEingabe, mFlaeche, MKnopf, Reiter, Tafel, M, type Zustand } from "@/components/manager-teile";
import { n as nf, Symbol, TOENE } from "@/components/web/bunt";
import { erklaervideoHochladenDatei, erklaervideoLoeschen, erklaervideoUrl, useErklaervideos } from "@/lib/erklaervideos";
import { FRAGEN, themaVon } from "@/lib/fragen";
import { FRAGEN_AKTIV } from "@/lib/funktionen";
import { KATEGORIEN, lernthemaAendern, lernthemaAnlegen, lernthemaKategorie, lernthemaBildEntfernen, lernthemaBildHochladen, lernthemaLoeschen, lernthemaVerschieben, themaBild, themenbildPruefen, useLernthemen } from "@/lib/lernthemen";
import { themavideoHochladen, themavideoKapitel, themavideoLoeschen, themavideoUmbenennen, themavideoUrl, themavideoVerschieben, useThemenvideos, type Themavideo } from "@/lib/themenvideos";
import { videoDauer, videoPruefen } from "@/lib/web-hochladen";

// Themen und Videos im Manager (nur im Browser): eigene Themen mit Bild,
// Titel und Beschreibung, dazu ihre Videos – mehrere je Thema, sichtbar auf
// der Themenseite – und Erklärvideos zu einzelnen Fragen,
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
// Themen und ihre Videos
// ---------------------------------------------------------------------------

/** Bild-Dialog des Browsers öffnen. */
function bildWaehlen(): Promise<File | null> {
  return new Promise((fertig) => {
    const feld = document.createElement("input");
    feld.type = "file";
    feld.accept = "image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp";
    feld.onchange = () => fertig(feld.files?.[0] ?? null);
    feld.click();
  });
}

type Upload = { datei: File; titel: string; kapitel: string; dauer: number | null; anteil: number; laeuft: boolean };

/**
 * Themen verwalten (erscheinen in App und Website unter Lernen und auf dem
 * Home): links die Liste in ihrer Reihenfolge, rechts das gewählte Thema mit
 * Bild, Titel, Beschreibung und seinen Videos.
 */
function ThemenVideos() {
  const { geladen, themen } = useLernthemen();
  const { videos } = useThemenvideos();
  const [gewaehlt, setGewaehlt] = useState<string | null>(null);
  const [neu, setNeu] = useState<{ titel: string; kurz: string } | null>(null);
  const [form, setForm] = useState<{ titel: string; kurz: string }>({ titel: "", kurz: "" });
  const [laeuft, setLaeuft] = useState<string | null>(null);
  const [upload, setUpload] = useState<Upload | null>(null);
  const [fehler, setFehler] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [ansehen, setAnsehen] = useState<Themavideo | null>(null);
  const [umbenennen, setUmbenennen] = useState<{ id: string; titel: string } | null>(null);
  const [kapitelEdit, setKapitelEdit] = useState<{ id: string; kapitel: string } | null>(null);
  const abbruch = useRef<{ aktuell: (() => void) | null }>({ aktuell: null });

  const thema = themen.find((t) => t.id === gewaehlt) ?? themen[0] ?? null;
  const anzahl = (id: string) => videos.filter((v) => v.thema_id === id).length;
  const liste = thema ? videos.filter((v) => v.thema_id === thema.id) : [];
  const kapitelListe = [...new Set(liste.map((v) => v.kapitel.trim()).filter(Boolean))];

  async function kapitelSichern() {
    if (!kapitelEdit) return;
    try {
      await themavideoKapitel(kapitelEdit.id, kapitelEdit.kapitel);
      setKapitelEdit(null);
    } catch (e) {
      setFehler(e instanceof Error ? e.message : String(e));
    }
  }

  // Formular mit dem gewählten Thema füllen
  useEffect(() => {
    setForm({ titel: thema?.titel ?? "", kurz: thema?.kurz ?? "" });
    setUpload(null);
    setFehler(null);
    setOk(null);
  }, [thema?.id, thema?.titel, thema?.kurz]);

  async function machen(schritt: string, arbeit: () => Promise<void>, meldung?: string) {
    setLaeuft(schritt);
    setFehler(null);
    setOk(null);
    try {
      await arbeit();
      if (meldung) setOk(meldung);
    } catch (e) {
      setFehler(e instanceof Error ? e.message : String(e));
    } finally {
      setLaeuft(null);
    }
  }

  async function anlegen() {
    if (!neu) return;
    if (!neu.titel.trim()) return setFehler("Bitte gib dem Kurs einen Titel.");
    await machen("anlegen", async () => {
      const id = await lernthemaAnlegen(neu.titel.trim(), neu.kurz.trim());
      setGewaehlt(id);
      setNeu(null);
    });
  }

  async function bildAendern() {
    if (!thema) return;
    const d = await bildWaehlen();
    if (!d) return;
    const problem = themenbildPruefen(d);
    if (problem) return setFehler(problem);
    await machen("bild", () => lernthemaBildHochladen(thema.id, d), "Bild gespeichert.");
  }

  const themaLoeschen = () => {
    if (!thema) return;
    const n = anzahl(thema.id);
    dialog("Kurs löschen?", `„${thema.titel}“ verschwindet aus App und Website${n ? ` – mit ${n === 1 ? "seinem Video" : `allen ${n} Videos`}` : ""}. Das lässt sich nicht rückgängig machen.`, [
      { text: "Abbrechen", style: "cancel" },
      {
        text: "Löschen",
        style: "destructive",
        onPress: () =>
          machen("loeschen", async () => {
            await lernthemaLoeschen(thema.id);
            setGewaehlt(null);
          }),
      },
    ]);
  };

  async function datei(d: File) {
    setFehler(null);
    const problem = videoPruefen(d);
    if (problem) return setFehler(problem);
    const titel = d.name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim().slice(0, 80);
    setUpload({ datei: d, titel, kapitel: liste[liste.length - 1]?.kapitel ?? "", dauer: await videoDauer(d), anteil: 0, laeuft: false });
  }

  async function hochladen() {
    if (!upload || !thema) return;
    if (!upload.titel.trim()) return setFehler("Bitte gib dem Video einen Titel.");
    setFehler(null);
    setUpload({ ...upload, laeuft: true, anteil: 0 });
    try {
      await themavideoHochladen({
        themaId: thema.id,
        titel: upload.titel.trim(),
        kapitel: upload.kapitel,
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

  const videoLoeschen = (v: Themavideo) =>
    dialog("Video löschen?", `„${v.titel}“ verschwindet aus dem Kurs ${thema?.titel ?? ""}.`, [
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

  const neuFenster = (
    <Fenster
      offen={!!neu}
      onSchliessen={() => setNeu(null)}
      titel="Neuer Kurs"
      unter="Erscheint in App und Website unter Lernen und auf dem Home. Ein Bild kannst du danach hochladen."
      fuss={
        <>
          <MKnopf titel="Abbrechen" art="leise" onPress={() => setNeu(null)} />
          <MKnopf titel="Kurs anlegen" icon="add" onPress={anlegen} laedt={laeuft === "anlegen"} deaktiviert={!neu?.titel.trim()} />
        </>
      }
    >
      {neu ? (
        <>
          <Feld titel="Titel">
            <MEingabe value={neu.titel} onChangeText={(titel) => setNeu({ ...neu, titel })} placeholder="z. B. Kreisverkehr" maxLength={60} autoFocus />
          </Feld>
          <Feld titel="Kurze Beschreibung" hinweis="Steht unter dem Titel auf der Themenseite.">
            <MEingabe value={neu.kurz} onChangeText={(kurz) => setNeu({ ...neu, kurz })} placeholder="z. B. Einfahren, Blinken, Ausfahren" maxLength={160} />
          </Feld>
          {fehler ? <Hinweis art="fehler">{fehler}</Hinweis> : null}
        </>
      ) : null}
    </Fenster>
  );

  if (!geladen) {
    return (
      <View style={{ alignItems: "center", paddingVertical: 48 }}>
        <Drehung farbe={M.orange} groesse={24} />
      </View>
    );
  }

  if (!thema) {
    return (
      <View style={[mFlaeche(), { alignItems: "center", paddingVertical: 48, paddingHorizontal: 24, gap: 12 }]}>
        <Symbol icon="albums" ton={TOENE.pink} groesse={60} />
        <Text style={{ ...nf.schwarz, fontSize: 20, color: M.text, textAlign: "center" }}>Noch keine Kurse</Text>
        <Text style={{ ...nf.halb, fontSize: 14.5, lineHeight: 20, color: M.text2, textAlign: "center", maxWidth: 440 }}>
          Leg deinen ersten Videokurs an, z. B. „Technikfragen Klasse B“. Danach wählst du Kategorie und Bild und lädst die Videos in Kapiteln hoch – alles erscheint sofort im Coach, in App und Website.
        </Text>
        <MKnopf titel="Ersten Kurs anlegen" icon="add" onPress={() => setNeu({ titel: "", kurz: "" })} style={{ marginTop: 8 }} />
        {fehler ? <Hinweis art="fehler">{fehler}</Hinweis> : null}
        {neuFenster}
      </View>
    );
  }

  const geaendert = form.titel.trim() !== thema.titel || form.kurz.trim() !== thema.kurz;
  const platz = themen.findIndex((t) => t.id === thema.id);

  return (
    <View style={{ flexDirection: "row", gap: 20, alignItems: "flex-start" }}>
      {/* Liste der Themen */}
      <View style={[mFlaeche(), { width: 290, overflow: "hidden" }]}>
        <View style={{ padding: 10, borderBottomWidth: 1.5, borderBottomColor: M.linie }}>
          <MKnopf titel="Neuer Kurs" icon="add" onPress={() => setNeu({ titel: "", kurz: "" })} />
        </View>
        {themen.map((th, i) => {
          const aktiv = th.id === thema.id;
          const n = anzahl(th.id);
          return (
            <Pressable
              key={th.id}
              onPress={() => setGewaehlt(th.id)}
              style={(z: Zustand) => ({ flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 10, paddingVertical: 8, borderTopWidth: i ? 1 : 0, borderTopColor: M.linie, backgroundColor: aktiv ? M.orangeSoft : z.hovered ? M.hover : "transparent" })}
            >
              <Image source={themaBild(th)} style={{ width: 52, height: 38, borderRadius: 8 }} resizeMode="cover" />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={{ ...(aktiv ? nf.fett : nf.halb), fontSize: 14, color: M.text }} numberOfLines={1}>
                  {th.titel}
                </Text>
                <Text style={{ ...nf.text, fontSize: 12.5, color: M.text3 }}>{n === 1 ? "1 Video" : n ? `${n} Videos` : "noch keine Videos"}</Text>
              </View>
            </Pressable>
          );
        })}
      </View>

      {/* Gewähltes Thema */}
      <View style={{ flex: 1, minWidth: 0, gap: 20 }}>
        <Tafel
          titel="Kurs"
          icon="albums"
          ton={TOENE.pink}
          rechts={
            <View style={{ flexDirection: "row", gap: 2 }}>
              <IconTaste icon="chevron-up" label="Weiter nach oben" aus={platz === 0} onPress={() => machen("ordnen", () => lernthemaVerschieben(thema.id, -1))} />
              <IconTaste icon="chevron-down" label="Weiter nach unten" aus={platz === themen.length - 1} onPress={() => machen("ordnen", () => lernthemaVerschieben(thema.id, 1))} />
              <IconTaste icon="trash-outline" label="Kurs löschen" gefahr onPress={themaLoeschen} />
            </View>
          }
        >
          <View style={{ flexDirection: "row", gap: 20, flexWrap: "wrap" }}>
            <View style={{ gap: 10 }}>
              <Pressable onPress={bildAendern} accessibilityLabel="Bild ändern" style={(z: Zustand) => ({ width: 240, height: 160, borderRadius: 16, overflow: "hidden", backgroundColor: M.flaeche2, opacity: z.hovered ? 0.88 : 1 })}>
                <Image source={themaBild(thema)} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
                <View style={{ position: "absolute", left: 10, bottom: 10, flexDirection: "row", alignItems: "center", gap: 6, height: 30, paddingHorizontal: 12, borderRadius: 15, backgroundColor: "rgba(0,0,0,0.6)" }}>
                  {laeuft === "bild" ? <Drehung farbe="#FFFFFF" groesse={13} /> : <Icon name="image" size={14} color="#FFFFFF" />}
                  <Text style={{ ...nf.fett, fontSize: 13, color: "#FFFFFF" }}>{thema.bild_pfad ? "Bild ändern" : "Bild hochladen"}</Text>
                </View>
              </Pressable>
              {thema.bild_pfad ? (
                <MKnopf titel="Bild entfernen" art="leise" onPress={() => machen("bild", () => lernthemaBildEntfernen(thema.id), "Bild entfernt.")} />
              ) : (
                <Text style={{ width: 240, ...nf.text, fontSize: 12.5, lineHeight: 17, color: M.text3 }}>Ohne eigenes Bild zeigt die App ein Straßenfoto. JPG, PNG oder WebP bis 5 MB, am besten im Querformat.</Text>
              )}
            </View>
            <View style={{ flex: 1, minWidth: 260, gap: 14 }}>
              <Feld titel="Titel">
                <MEingabe value={form.titel} onChangeText={(titel) => setForm({ ...form, titel })} maxLength={60} />
              </Feld>
              <Feld titel="Kategorie" hinweis="Unter „Für deine Prüfung“ im Coach.">
                <Auswahl optionen={KATEGORIEN} wert={thema.kategorie} onWechsel={(k) => machen("kategorie", () => lernthemaKategorie(thema.id, k), "Kategorie gespeichert.")} />
              </Feld>
              <Feld titel="Kurze Beschreibung" hinweis={`${form.kurz.length} / 160 Zeichen`}>
                <MEingabe value={form.kurz} onChangeText={(kurz) => setForm({ ...form, kurz })} maxLength={160} placeholder="Steht unter dem Titel auf der Themenseite" />
              </Feld>
              <View style={{ flexDirection: "row", gap: 8 }}>
                <MKnopf titel="Speichern" icon="checkmark" onPress={() => machen("sichern", () => lernthemaAendern(thema.id, form.titel.trim(), form.kurz.trim()), "Gespeichert.")} laedt={laeuft === "sichern"} deaktiviert={!geaendert || !form.titel.trim()} />
                {geaendert ? <MKnopf titel="Verwerfen" art="leise" onPress={() => setForm({ titel: thema.titel, kurz: thema.kurz })} /> : null}
              </View>
            </View>
          </View>
          {ok ? <View style={{ marginTop: 14 }}><Hinweis art="ok">{ok}</Hinweis></View> : null}
          {fehler && !neu ? <View style={{ marginTop: 14 }}><Hinweis art="fehler">{fehler}</Hinweis></View> : null}
        </Tafel>

        <Tafel titel="Videos" icon="film" ton={TOENE.lila} zusatz={liste.length ? String(liste.length) : undefined} rechts={<Text style={{ ...nf.text, fontSize: 13, color: M.text3 }}>nach Kapiteln im Kurs</Text>} innen={false}>
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
                  <View style={{ gap: 10 }}>
                    <Feld titel="Titel des Videos">
                      <MEingabe placeholder="z. B. „Motor – Flüssigkeiten prüfen“" value={upload.titel} onChangeText={(titel) => setUpload({ ...upload, titel })} maxLength={80} />
                    </Feld>
                    <Feld titel="Kapitel" hinweis="Videos mit gleichem Kapitel stehen in der App zusammen. Leer = ohne Kapitel.">
                      <MEingabe placeholder="z. B. „Kapitel 1 – Technikfragen“" value={upload.kapitel} onChangeText={(kapitel) => setUpload({ ...upload, kapitel })} maxLength={60} />
                      {kapitelListe.length ? (
                        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                          {kapitelListe.map((k) => (
                            <MKnopf key={k} titel={k} art={upload.kapitel === k ? undefined : "leise"} onPress={() => setUpload({ ...upload, kapitel: k })} />
                          ))}
                        </View>
                      ) : null}
                    </Feld>
                    <View style={{ flexDirection: "row", gap: 8, justifyContent: "flex-end" }}>
                      <MKnopf titel="Verwerfen" art="leise" onPress={() => setUpload(null)} />
                      <MKnopf titel="Hochladen" icon="cloud-upload-outline" onPress={hochladen} />
                    </View>
                  </View>
                )}
              </View>
            ) : (
              <Ablage onDatei={datei} />
            )}
            {liste.length === 0 && !upload ? <Text style={{ ...nf.text, fontSize: 14, color: M.text3 }}>Noch keine Videos in diesem Kurs.</Text> : null}
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
                {kapitelEdit?.id === v.id ? (
                  <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
                    <View style={{ flex: 1 }}>
                      <MEingabe value={kapitelEdit.kapitel} onChangeText={(kapitel) => setKapitelEdit({ id: v.id, kapitel })} placeholder="Kapitel (leer = ohne)" maxLength={60} autoFocus onSubmitEditing={kapitelSichern} />
                    </View>
                    <MKnopf titel="Abbrechen" art="leise" onPress={() => setKapitelEdit(null)} />
                    <MKnopf titel="Sichern" onPress={kapitelSichern} />
                  </View>
                ) : (
                  <Pressable onPress={() => setKapitelEdit({ id: v.id, kapitel: v.kapitel })} accessibilityRole="button" accessibilityLabel="Kapitel ändern" style={(z: Zustand) => ({ alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 5, height: 24, paddingHorizontal: 9, borderRadius: 12, backgroundColor: z.hovered ? M.hover : M.orangeSoft })}>
                    <Icon name="albums-outline" size={12} color={M.orange} />
                    <Text style={{ ...nf.halb, fontSize: 12.5, color: M.orange }}>{v.kapitel ? v.kapitel : "Kapitel festlegen"}</Text>
                  </Pressable>
                )}
                <Text style={{ ...nf.text, fontSize: 13, color: M.text3 }}>{[dauerText(v.dauer), new Date(v.erstellt_am).toLocaleDateString("de-DE")].filter(Boolean).join(" · ")}</Text>
              </View>
              <View style={{ flexDirection: "row", gap: 2 }}>
                <IconTaste icon="chevron-up" label="Nach oben" aus={i === 0} onPress={() => themavideoVerschieben(v.id, -1).catch((e) => setFehler(String(e?.message ?? e)))} />
                <IconTaste icon="chevron-down" label="Nach unten" aus={i === liste.length - 1} onPress={() => themavideoVerschieben(v.id, 1).catch((e) => setFehler(String(e?.message ?? e)))} />
                <IconTaste icon="create-outline" label="Umbenennen" onPress={() => setUmbenennen({ id: v.id, titel: v.titel })} />
                <IconTaste icon="trash-outline" label="Löschen" gefahr onPress={() => videoLoeschen(v)} />
              </View>
            </View>
          ))}
        </Tafel>
      </View>
      <Abspielen url={ansehen ? themavideoUrl(ansehen.pfad) : null} titel={ansehen?.titel ?? ""} onSchliessen={() => setAnsehen(null)} />
      {neuFenster}
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
  // Ohne Fragen in der App gibt es nur Themen und ihre Videos.
  if (!FRAGEN_AKTIV) return <ThemenVideos />;
  return (
    <View style={{ gap: 16 }}>
      <View style={{ borderBottomWidth: 1, borderBottomColor: M.linie }}>
        <Reiter
          wert={art}
          onWechsel={setArt}
          optionen={[
            { id: "themen", titel: "Kurse & Videos", zahl: zahlen.themen },
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
