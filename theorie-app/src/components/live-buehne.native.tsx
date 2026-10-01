import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { View, type ViewStyle } from "react-native";
import {
  AudioSession,
  isTrackReference,
  LiveKitRoom,
  registerGlobals,
  useDataChannel,
  useLocalParticipant,
  useParticipants,
  useRoomContext,
  useTracks,
  VideoTrack,
  type ReceivedDataMessage,
} from "@livekit/react-native";
import { mediaDevices } from "@livekit/react-native-webrtc";
import { Track, VideoPresets, type LocalVideoTrack, type RemoteTrackPublication } from "livekit-client";

import { LivePlatzhalter } from "@/components/live-platzhalter";
import type { LiveBuehneProps } from "@/lib/live";
import { bytesZuText, textZuBytes } from "@/lib/live-bild";

// Live-Video über LiveKit (iPhone und Android). Der Inhaber sendet Kamera und
// Mikrofon, alle anderen empfangen nur. Herzen gehen als Datennachricht an alle,
// ebenso die Signale des Gastgebers: Quiz/Prüfung („bitte neu laden“) und die
// Lage seines Bilds aus der Galerie. Im Simulator (nur Entwicklung) gibt es keine
// Kamera: Dann zeigen Gastgeber und Zuschauer ein Platzhalter-Selfie.

registerGlobals();

export const liveVideoMoeglich = true;

const GASTGEBER = "gastgeber-";
const HERZ = new Uint8Array([1]);
const QUIZ = new Uint8Array([2]);
const PLATZHALTER = new Uint8Array([3]);
const GERAETE_FEHLER = new Set(["NotFoundError", "DevicesNotFoundError", "NotAllowedError", "PermissionDeniedError", "NotReadableError", "TrackStartError", "OverconstrainedError"]);
const VOLL: ViewStyle = { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 };
const KAMERA = { facingMode: "user" as const, resolution: VideoPresets.h720.resolution };
const RAUM_OPTIONEN = {
  adaptiveStream: true,
  dynacast: true,
  publishDefaults: { simulcast: true, videoSimulcastLayers: [VideoPresets.h180, VideoPresets.h360] },
};

type Geraet = { kind?: string; deviceId?: string; facing?: string };

export function LiveBuehne(props: LiveBuehneProps) {
  const { url, token, senden, style } = props;

  // Nur in der Entwicklung: Hat das Gerät keine Kamera (Simulator), ohne Video senden.
  const [ohneKamera, setOhneKamera] = useState<boolean | null>(senden && __DEV__ ? null : false);
  useEffect(() => {
    if (!senden || !__DEV__) return;
    let aktiv = true;
    mediaDevices.enumerateDevices().then(
      (liste: unknown) => {
        if (aktiv) setOhneKamera(!((liste ?? []) as Geraet[]).some((g) => g.kind === "videoinput"));
      },
      () => {
        if (aktiv) setOhneKamera(false);
      },
    );
    return () => {
      aktiv = false;
    };
  }, [senden]);

  // LiveKitRoom verbindet neu, sobald sich Rückruf-Funktionen ändern – daher feste Funktionen.
  const rueck = useRef(props.onVerbindung);
  rueck.current = props.onVerbindung;
  // Simulator ohne Kamera: Hat auch das Mikrofon Probleme, trotzdem weiter (stumm statt Fehler).
  const simulatorRef = useRef(false);
  simulatorRef.current = Boolean(__DEV__ && ohneKamera);
  const verbunden = useCallback(() => rueck.current?.("verbunden"), []);
  const getrennt = useCallback(() => rueck.current?.("getrennt"), []);
  const fehler = useCallback((e: Error) => {
    if (simulatorRef.current && GERAETE_FEHLER.has(e?.name)) return;
    rueck.current?.("fehler", e.message);
  }, []);
  const geraetFehlt = useCallback(() => {
    if (simulatorRef.current) return;
    rueck.current?.("fehler", "Kamera oder Mikrofon lassen sich nicht starten. Erlaube den Zugriff in den Einstellungen.");
  }, []);
  const video = useMemo(() => (senden && ohneKamera === false ? KAMERA : false), [senden, ohneKamera]);

  useEffect(() => {
    AudioSession.startAudioSession();
    return () => {
      AudioSession.stopAudioSession();
    };
  }, []);

  return (
    <View style={[{ backgroundColor: "#000000" }, style]}>
      {ohneKamera === null ? null : (
        <LiveKitRoom
          serverUrl={url}
          token={token}
          connect
          audio={senden}
          video={video}
          options={RAUM_OPTIONEN}
          onConnected={verbunden}
          onDisconnected={getrennt}
          onError={fehler}
          onMediaDeviceFailure={geraetFehlt}
        >
          <Innen {...props} ohneKamera={ohneKamera} />
        </LiveKitRoom>
      )}
    </View>
  );
}

function Innen({ senden, stumm, ohneKamera, onZuschauer, onHerz, onBildWeg, onQuiz, onBild, onTafel, onSteuerung }: LiveBuehneProps & { ohneKamera: boolean }) {
  const raum = useRoomContext();
  const { localParticipant } = useLocalParticipant();
  const teilnehmer = useParticipants();
  const kameras = useTracks([Track.Source.Camera], { onlySubscribed: !senden });
  const vorne = useRef(true);
  const [gespiegelt, setGespiegelt] = useState(true);

  // Rückmeldungen über Refs, damit wechselnde Funktionen nichts neu starten.
  const rueck = useRef({ onZuschauer, onHerz, onBildWeg, onQuiz, onBild, onTafel, onSteuerung });
  rueck.current = { onZuschauer, onHerz, onBildWeg, onQuiz, onBild, onTafel, onSteuerung };

  const bild = kameras.find((k) => (senden ? k.participant.isLocal : k.participant.identity.startsWith(GASTGEBER)));
  const bildDa = Boolean(bild && isTrackReference(bild) && !bild.publication.isMuted);
  // Zuschauer (nur Entwicklung): Der Gastgeber sendet aus dem Simulator ohne Kamera –
  // erkannt am Signal oder daran, dass er da ist, aber gar keine Kamera veröffentlicht.
  const [platzhalterSignal, setPlatzhalter] = useState(false);
  const platzhalterZeit = useRef(0);
  const veroeffentlicht = useTracks([Track.Source.Camera], { onlySubscribed: false });
  const gastgeberDa = teilnehmer.some((t) => t.identity.startsWith(GASTGEBER));
  const gastgeberOhneKamera = __DEV__ && !senden && gastgeberDa && !veroeffentlicht.some((k) => k.participant.identity.startsWith(GASTGEBER));
  const platzhalter = platzhalterSignal || gastgeberOhneKamera;

  const zuschauer = teilnehmer.filter((t) => !t.identity.startsWith(GASTGEBER)).length;

  // Ton aus: den Ton des Gastgebers gar nicht erst empfangen.
  useEffect(() => {
    if (senden) return;
    for (const t of teilnehmer) {
      if (t.isLocal) continue;
      for (const pub of t.audioTrackPublications.values()) (pub as RemoteTrackPublication).setEnabled(!stumm);
    }
  }, [stumm, senden, teilnehmer]);
  useEffect(() => {
    rueck.current.onZuschauer?.(zuschauer);
  }, [zuschauer]);

  useEffect(() => {
    if (!senden) rueck.current.onBildWeg?.(!bildDa && !platzhalter);
  }, [bildDa, senden, platzhalter]);

  // Feste Empfänger – sonst meldet sich der Datenkanal bei jedem Neuzeichnen neu an.
  const herzEmpfangen = useCallback(() => rueck.current.onHerz?.(), []);
  // Das Quiz-Signal zählt nur vom Gastgeber (sonst könnte jeder alle neu laden lassen).
  const quizEmpfangen = useCallback((n: ReceivedDataMessage) => {
    if (n.from?.identity.startsWith(GASTGEBER)) rueck.current.onQuiz?.();
  }, []);
  const bildEmpfangen = useCallback((n: ReceivedDataMessage) => {
    if (n.from?.identity.startsWith(GASTGEBER)) rueck.current.onBild?.(bytesZuText(n.payload));
  }, []);
  const tafelEmpfangen = useCallback((n: ReceivedDataMessage) => {
    if (n.from?.identity.startsWith(GASTGEBER)) rueck.current.onTafel?.(bytesZuText(n.payload));
  }, []);
  const platzhalterEmpfangen = useCallback((n: ReceivedDataMessage) => {
    if (!__DEV__ || !n.from?.identity.startsWith(GASTGEBER)) return;
    platzhalterZeit.current = Date.now();
    setPlatzhalter(true);
  }, []);
  const { send } = useDataChannel("herz", herzEmpfangen);
  const { send: quizSenden } = useDataChannel("quiz", quizEmpfangen);
  const { send: bildSenden } = useDataChannel("bild", bildEmpfangen);
  const { send: tafelSenden } = useDataChannel("tafel", tafelEmpfangen);
  const { send: platzhalterSenden } = useDataChannel("platzhalter", platzhalterEmpfangen);

  // Gastgeber ohne Kamera: alle paar Sekunden Bescheid geben (auch für alle, die später kommen).
  useEffect(() => {
    if (!senden || !ohneKamera) return;
    const melden = () => {
      platzhalterSenden(PLATZHALTER, { reliable: true }).catch(() => {});
    };
    melden();
    const t = setInterval(melden, 3000);
    return () => clearInterval(t);
  }, [senden, ohneKamera, platzhalterSenden]);
  // Zuschauer: Bleibt die Meldung aus, wieder normal (schwarz bzw. „gleich zurück“).
  useEffect(() => {
    if (senden || !platzhalterSignal) return;
    const t = setInterval(() => {
      if (Date.now() - platzhalterZeit.current > 8000) setPlatzhalter(false);
    }, 2000);
    return () => clearInterval(t);
  }, [senden, platzhalterSignal]);

  useEffect(() => {
    rueck.current.onSteuerung?.({
      herz: () => {
        send(HERZ, { reliable: false }).catch(() => {});
      },
      quiz: () => {
        quizSenden(QUIZ, { reliable: true }).catch(() => {});
      },
      bild: (nachricht, zuverlaessig) => {
        bildSenden(textZuBytes(nachricht), { reliable: zuverlaessig }).catch(() => {});
      },
      tafel: (nachricht) => {
        tafelSenden(textZuBytes(nachricht), { reliable: true }).catch(() => {});
      },
      kameraWechseln: async () => {
        const ziel = vorne.current ? "environment" : "front";
        const geraete = ((await mediaDevices.enumerateDevices()) ?? []) as Geraet[];
        const kamera = geraete.find((g) => g.kind === "videoinput" && g.facing === ziel);
        if (kamera?.deviceId) {
          await raum.switchActiveDevice("videoinput", kamera.deviceId);
        } else {
          const spur = localParticipant.getTrackPublication(Track.Source.Camera)?.track as LocalVideoTrack | undefined;
          await spur?.restartTrack({ facingMode: ziel === "front" ? "user" : "environment" });
        }
        vorne.current = !vorne.current;
        setGespiegelt(vorne.current);
      },
      mikrofon: async (an) => {
        await localParticipant.setMicrophoneEnabled(an);
      },
    });
    return () => rueck.current.onSteuerung?.(null);
  }, [send, quizSenden, bildSenden, tafelSenden, raum, localParticipant]);

  if (!bild || !isTrackReference(bild)) return (senden ? ohneKamera : platzhalter) ? <LivePlatzhalter /> : null;
  // Eigenes Bild mit der Frontkamera gespiegelt – wie ein Spiegel.
  return <VideoTrack trackRef={bild} style={VOLL} objectFit="cover" mirror={senden && gespiegelt} />;
}
