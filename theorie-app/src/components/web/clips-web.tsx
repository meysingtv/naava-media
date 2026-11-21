import { useEffect, useRef, useState } from "react";
import { Image, Pressable, Text, View } from "react-native";
import { router } from "expo-router";

import { ClipSeite } from "@/components/clip-seite";
import { Icon, type IconName } from "@/components/icon";
import { Lader } from "@/components/lader";
import { NutzerBild } from "@/components/profilbild";
import { B, Kachel, Knopf, Leer, n, Reiter, TOENE, type Zustand } from "@/components/web/bunt";
import { useTasten } from "@/components/web/frage-web";
import { dateiUrl, kurzeZahl, type ClipEintrag } from "@/lib/clips-server";
import type { LiveInfo } from "@/lib/live";

// Clips am PC: oben die Bereiche (Entdecken, Folge ich, Live), in der Mitte
// das Video hochkant, rechts daneben Ersteller, Text, die Aktionen als große
// Knöpfe und die nächsten Clips. Blättern mit ↑/↓, dem Mausrad über dem Video
// oder den Pfeilen; M schaltet den Ton, L gefällt mir, K öffnet Kommentare.

export type Kategorie = "live" | "entdecken" | "folge_ich";

type Aktionen = {
  onLike: (c: ClipEintrag, an: boolean) => void;
  onFolgen: (c: ClipEintrag, an: boolean) => void;
  onTeilen: (c: ClipEintrag) => void;
  onMehr: (c: ClipEintrag) => void;
  onProfil: (c: ClipEintrag) => void;
};

export type ClipsWebProps = {
  kategorie: Kategorie;
  lives: LiveInfo[];
  eintraege: ClipEintrag[];
  laedt: boolean;
  fehler: string | null;
  geladen: boolean;
  verbunden: boolean;
  ich: string | null;
  darfErstellen: boolean;
  darfHochladen: boolean;
  stumm: boolean;
  spielen: boolean;
  aktionen: Aktionen;
  onStumm: () => void;
  onWechsel: (k: Kategorie) => void;
  onMehrLaden: () => void;
  onNeuLaden: () => void;
  onErstellen: () => void;
  onKommentare: (c: ClipEintrag) => void;
};

/** Mausrad über einer Fläche: einmal je Bewegung weiter oder zurück. */
function useRad(onRad: (richtung: 1 | -1) => void) {
  const ref = useRef<View>(null);
  const aufruf = useRef(onRad);
  aufruf.current = onRad;
  useEffect(() => {
    const el = ref.current as unknown as HTMLElement | null;
    if (!el || typeof el.addEventListener !== "function") return;
    let gesperrt = 0;
    const rad = (e: WheelEvent) => {
      e.preventDefault();
      if (Math.abs(e.deltaY) < 12 || Date.now() < gesperrt) return;
      gesperrt = Date.now() + 650;
      aufruf.current(e.deltaY > 0 ? 1 : -1);
    };
    el.addEventListener("wheel", rad, { passive: false });
    return () => el.removeEventListener("wheel", rad);
  }, []);
  return ref;
}

function RundKnopf({ icon, label, onPress, aus }: { icon: IconName; label: string; onPress: () => void; aus?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={aus}
      accessibilityLabel={label}
      style={(z: Zustand) => ({ width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center", borderWidth: 1.5, borderColor: B.linie, backgroundColor: z.hovered && !aus ? B.ton : B.flaeche, opacity: aus ? 0.35 : 1 })}
    >
      <Icon name={icon} size={22} color={B.text} />
    </Pressable>
  );
}

function Aktion({ icon, text, aktiv, farbe, onPress, label }: { icon: IconName; text: string; aktiv?: boolean; farbe?: string; onPress: () => void; label: string }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityLabel={label}
      style={(z: Zustand) => ({ flex: 1, alignItems: "center", gap: 6, paddingVertical: 12, borderRadius: 14, backgroundColor: z.hovered ? B.ton : "transparent" })}
    >
      <Icon name={icon} size={26} color={aktiv ? (farbe ?? B.orange) : B.text2} />
      <Text style={{ ...n.fett, fontSize: 13.5, color: aktiv ? (farbe ?? B.orange) : B.text2, fontVariant: ["tabular-nums"] }}>{text}</Text>
    </Pressable>
  );
}

export function ClipsWeb(p: ClipsWebProps) {
  const [index, setIndex] = useState(0);
  const [masse, setMasse] = useState<{ breite: number; hoehe: number } | null>(null);
  const { eintraege } = p;
  const clip = eintraege[Math.min(index, eintraege.length - 1)] ?? null;

  // Neuer Bereich → wieder beim ersten Clip anfangen.
  useEffect(() => setIndex(0), [p.kategorie]);
  // Kurz vor dem Ende nachladen.
  useEffect(() => {
    if (eintraege.length && index >= eintraege.length - 3) p.onMehrLaden();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, eintraege.length]);

  const blaettern = (r: 1 | -1) => setIndex((i) => Math.max(0, Math.min(eintraege.length - 1, i + r)));
  const radRef = useRad(blaettern);

  useTasten((e) => {
    if (!clip) return;
    const k = e.key.toLowerCase();
    if (e.key === "ArrowDown" || k === "j") {
      e.preventDefault();
      blaettern(1);
    } else if (e.key === "ArrowUp" || k === "k") {
      e.preventDefault();
      blaettern(-1);
    } else if (k === "m") p.onStumm();
    else if (k === "l") p.aktionen.onLike(clip, !clip.gemocht);
    else if (k === "c") p.onKommentare(clip);
  });

  // Video hochkant (9:16), so hoch wie Platz ist.
  const hoehe = masse ? Math.max(360, masse.hoehe) : 0;
  const breite = Math.round(Math.min(hoehe * (9 / 16), 520));
  const eigen = clip ? clip.autor === p.ich : false;
  const naechste = eintraege.slice(index + 1, index + 5);

  let inhalt: React.ReactNode;
  if (p.kategorie === "live") {
    inhalt = p.lives.length ? (
      <View style={{ flex: 1, gap: 14, maxWidth: 720, alignSelf: "center", width: "100%" }}>
        {p.lives.map((l) => (
          <Kachel key={l.id} onPress={() => router.push({ pathname: "/live", params: { id: l.id } })} style={{ padding: 18, flexDirection: "row", alignItems: "center", gap: 14 }}>
            <NutzerBild pfad={l.gastgeber?.bild_pfad ?? null} name={l.gastgeber?.name ?? "Live"} farbe={l.gastgeber?.avatar_farbe} groesse={48} />
            <View style={{ flex: 1 }}>
              <Text style={{ ...n.schwarz, fontSize: 17, color: B.text }}>{l.titel || "Live"}</Text>
              <Text style={{ ...n.halb, fontSize: 14, color: B.text2 }}>{l.gastgeber?.name ?? "Fahrschul Pro"} · gerade live</Text>
            </View>
            <Knopf titel="Ansehen" icon="play" ton="rot" onPress={() => router.push({ pathname: "/live", params: { id: l.id } })} />
          </Kachel>
        ))}
      </View>
    ) : (
      <Leer icon="radio" ton={TOENE.rot} titel="Gerade ist niemand live" text="Sobald ein Fahrlehrer oder Creator live geht, siehst du es hier – und in der Seitenleiste blinkt ein roter Punkt bei Clips." />
    );
  } else if (!p.verbunden) {
    inhalt = <Leer icon="film" ton={TOENE.pink} titel="Clips kommen bald" text="Sobald die App mit dem Server verbunden ist, findest du hier kurze Videos rund um die Theorie." />;
  } else if (p.kategorie === "folge_ich" && !p.ich) {
    inhalt = (
      <Leer icon="people" ton={TOENE.pink} titel="Folge deinen Lieblings-Erklärern" text="Mit einem kostenlosen Konto kannst du Erstellern folgen, liken und kommentieren.">
        <Knopf titel="Ich habe schon ein Konto" art="rand" ton="blau" onPress={() => router.push("/anmelden")} />
        <Knopf titel="Konto erstellen" ton="gruen" onPress={() => router.push("/registrieren")} />
      </Leer>
    );
  } else if (!eintraege.length && p.fehler) {
    inhalt = (
      <Leer icon="cloud-offline" ton={TOENE.rot} titel="Clips laden gerade nicht" text={p.fehler}>
        <Knopf titel="Nochmal versuchen" onPress={p.onNeuLaden} />
      </Leer>
    );
  } else if (!p.geladen || (p.laedt && !eintraege.length)) {
    inhalt = (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <Lader color={B.text3} />
      </View>
    );
  } else if (!eintraege.length || !clip) {
    inhalt =
      p.kategorie === "folge_ich" ? (
        <Leer icon="people" ton={TOENE.pink} titel="Du folgst noch niemandem" text="Klick bei einem Clip auf „Folgen“ – dann landen neue Videos dieser Person hier.">
          <Knopf titel="Clips entdecken" onPress={() => p.onWechsel("entdecken")} />
        </Leer>
      ) : (
        <Leer icon="film" ton={TOENE.pink} titel="Noch keine Clips" text={p.darfHochladen ? "Lade den ersten Clip hoch – kurze Hochkant-Videos wirken am besten." : "Hier erscheinen bald kurze Videos rund um die Theorie."}>
          {p.darfHochladen ? <Knopf titel="Clip hochladen" icon="add" onPress={() => router.push("/clip-hochladen")} /> : null}
        </Leer>
      );
  } else {
    const name = clip.autor_name || clip.autor_benutzername;
    inhalt = (
      <View style={{ flex: 1, flexDirection: "row", justifyContent: "center", gap: 28 }}>
        {/* Video */}
        <View ref={radRef} onLayout={(e) => setMasse({ breite: e.nativeEvent.layout.width, hoehe: e.nativeEvent.layout.height })} style={{ flexShrink: 0, width: breite || undefined, height: "100%", minWidth: 220 }}>
          {masse ? (
            <View style={{ width: breite, height: hoehe, borderRadius: 22, overflow: "hidden", backgroundColor: "#000000" }}>
              <ClipSeite
                key={clip.id}
                clip={clip}
                hoehe={hoehe}
                breite={breite}
                unten={0}
                aktiv
                spielen={p.spielen}
                stumm={p.stumm}
                eigen={eigen}
                nurVideo
                onLike={p.aktionen.onLike}
                onFolgen={p.aktionen.onFolgen}
                onKommentare={p.onKommentare}
                onTeilen={p.aktionen.onTeilen}
                onMehr={p.aktionen.onMehr}
                onProfil={p.aktionen.onProfil}
              />
            </View>
          ) : null}
        </View>

        {/* Blättern */}
        <View style={{ justifyContent: "center", gap: 12 }}>
          <RundKnopf icon="chevron-up" label="Vorheriger Clip (↑)" aus={index === 0} onPress={() => blaettern(-1)} />
          <RundKnopf icon="chevron-down" label="Nächster Clip (↓)" aus={index >= eintraege.length - 1} onPress={() => blaettern(1)} />
        </View>

        {/* Ersteller, Text, Aktionen */}
        <View style={{ width: 380, gap: 18 }}>
          <Kachel style={{ padding: 20, gap: 14 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <Pressable onPress={() => p.aktionen.onProfil(clip)} style={(z: Zustand) => ({ flex: 1, flexDirection: "row", alignItems: "center", gap: 12, opacity: z.hovered ? 0.8 : 1 })}>
                <NutzerBild pfad={clip.autor_bild} name={name} farbe={clip.autor_farbe} groesse={46} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={{ ...n.schwarz, fontSize: 16.5, color: B.text }} numberOfLines={1}>
                    {name}
                  </Text>
                  <Text style={{ ...n.halb, fontSize: 13.5, color: B.text3 }} numberOfLines={1}>
                    @{clip.autor_benutzername}
                  </Text>
                </View>
              </Pressable>
              {eigen ? null : <Knopf titel={clip.folge_ich ? "Folge ich" : "Folgen"} icon={clip.folge_ich ? "checkmark" : undefined} art={clip.folge_ich ? "rand" : "voll"} groesse="klein" onPress={() => p.aktionen.onFolgen(clip, !clip.folge_ich)} />}
            </View>
            {clip.titel ? <Text style={{ ...n.schwarz, fontSize: 19, lineHeight: 25, color: B.text }}>{clip.titel}</Text> : null}
            {clip.beschreibung ? <Text style={{ ...n.halb, fontSize: 14.5, lineHeight: 21, color: B.text2 }}>{clip.beschreibung}</Text> : null}
            <View style={{ flexDirection: "row", borderTopWidth: 1.5, borderTopColor: B.ton, paddingTop: 6 }}>
              <Aktion icon={clip.gemocht ? "heart" : "heart-outline"} text={kurzeZahl(clip.likes)} aktiv={clip.gemocht} farbe={TOENE.pink.farbe} label="Gefällt mir (L)" onPress={() => p.aktionen.onLike(clip, !clip.gemocht)} />
              <Aktion icon="chatbubble-ellipses-outline" text={kurzeZahl(clip.kommentare)} label="Kommentare (C)" onPress={() => p.onKommentare(clip)} />
              <Aktion icon="share-outline" text={clip.geteilt > 0 ? kurzeZahl(clip.geteilt) : "Teilen"} label="Teilen" onPress={() => p.aktionen.onTeilen(clip)} />
              <Aktion icon="ellipsis-horizontal" text="Mehr" label="Mehr" onPress={() => p.aktionen.onMehr(clip)} />
            </View>
          </Kachel>

          {naechste.length ? (
            <View style={{ gap: 10 }}>
              <Text style={{ ...n.schwarz, fontSize: 16, color: B.text }}>Als Nächstes</Text>
              {naechste.map((c, i) => (
                <Pressable key={c.id} onPress={() => setIndex(index + 1 + i)} style={(z: Zustand) => ({ flexDirection: "row", alignItems: "center", gap: 12, padding: 6, borderRadius: 14, backgroundColor: z.hovered ? B.ton : "transparent" })}>
                  <View style={{ width: 54, height: 80, borderRadius: 10, overflow: "hidden", backgroundColor: "#111418" }}>
                    {c.bild_pfad ? <Image source={{ uri: dateiUrl(c.bild_pfad) }} style={{ width: "100%", height: "100%" }} resizeMode="cover" /> : null}
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={{ ...n.fett, fontSize: 14.5, color: B.text }} numberOfLines={2}>
                      {c.titel || c.beschreibung || "Clip"}
                    </Text>
                    <Text style={{ ...n.halb, fontSize: 13, color: B.text3 }} numberOfLines={1}>
                      {c.autor_name || c.autor_benutzername} · {kurzeZahl(c.likes)} Likes
                    </Text>
                  </View>
                </Pressable>
              ))}
            </View>
          ) : null}

          <Text style={{ ...n.halb, fontSize: 13, lineHeight: 19, color: B.text3 }}>Tasten: ↑ ↓ blättern · M Ton · L gefällt mir · C Kommentare</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: B.grund, paddingHorizontal: 32, paddingTop: 24, paddingBottom: 24, gap: 20 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
        <Text style={{ ...n.schwarz, fontSize: 30, color: B.text }}>Clips</Text>
        <Reiter<Kategorie>
          wert={p.kategorie}
          onWechsel={p.onWechsel}
          optionen={[
            { id: "entdecken", titel: "Entdecken" },
            { id: "folge_ich", titel: "Folge ich" },
            { id: "live", titel: p.lives.length ? "Live ●" : "Live" },
          ]}
        />
        <View style={{ flex: 1 }} />
        <Knopf titel={p.stumm ? "Ton an" : "Ton aus"} icon={p.stumm ? "volume-mute" : "volume-high"} art="rand" ton="blau" groesse="klein" onPress={p.onStumm} />
        {p.darfErstellen ? <Knopf titel="Erstellen" icon="add" groesse="klein" onPress={p.onErstellen} /> : null}
      </View>
      {inhalt}
    </View>
  );
}
