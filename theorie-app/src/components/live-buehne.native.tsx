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

import type { LiveBuehneProps } from "@/lib/live";

// Live-Video über LiveKit (iPhone und Android). Der Inhaber sendet Kamera und
// Mikrofon, alle anderen empfangen nur. Herzen gehen als Datennachricht an alle,
// ebenso das Quiz-Signal des Gastgebers („neue Frage, bitte neu laden“).

registerGlobals();

export const liveVideoMoeglich = true;

const GASTGEBER = "gastgeber-";
const HERZ = new Uint8Array([1]);
const QUIZ = new Uint8Array([2]);
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

  // LiveKitRoom verbindet neu, sobald sich Rückruf-Funktionen ändern – daher feste Funktionen.
  const rueck = useRef(props.onVerbindung);
  rueck.current = props.onVerbindung;
  const verbunden = useCallback(() => rueck.current?.("verbunden"), []);
  const getrennt = useCallback(() => rueck.current?.("getrennt"), []);
  const fehler = useCallback((e: Error) => rueck.current?.("fehler", e.message), []);
  const geraetFehlt = useCallback(() => rueck.current?.("fehler", "Kamera oder Mikrofon lassen sich nicht starten. Erlaube den Zugriff in den Einstellungen."), []);
  const video = useMemo(() => (senden ? KAMERA : false), [senden]);

  useEffect(() => {
    AudioSession.startAudioSession();
    return () => {
      AudioSession.stopAudioSession();
    };
  }, []);

  return (
    <View style={[{ backgroundColor: "#000000" }, style]}>
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
        <Innen {...props} />
      </LiveKitRoom>
    </View>
  );
}

function Innen({ senden, stumm, onZuschauer, onHerz, onBildWeg, onQuiz, onSteuerung }: LiveBuehneProps) {
  const raum = useRoomContext();
  const { localParticipant } = useLocalParticipant();
  const teilnehmer = useParticipants();
  const kameras = useTracks([Track.Source.Camera], { onlySubscribed: !senden });
  const vorne = useRef(true);
  const [gespiegelt, setGespiegelt] = useState(true);

  // Rückmeldungen über Refs, damit wechselnde Funktionen nichts neu starten.
  const rueck = useRef({ onZuschauer, onHerz, onBildWeg, onQuiz, onSteuerung });
  rueck.current = { onZuschauer, onHerz, onBildWeg, onQuiz, onSteuerung };

  const bild = kameras.find((k) => (senden ? k.participant.isLocal : k.participant.identity.startsWith(GASTGEBER)));
  const bildDa = Boolean(bild && isTrackReference(bild) && !bild.publication.isMuted);

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
    if (!senden) rueck.current.onBildWeg?.(!bildDa);
  }, [bildDa, senden]);

  // Feste Empfänger – sonst meldet sich der Datenkanal bei jedem Neuzeichnen neu an.
  const herzEmpfangen = useCallback(() => rueck.current.onHerz?.(), []);
  // Das Quiz-Signal zählt nur vom Gastgeber (sonst könnte jeder alle neu laden lassen).
  const quizEmpfangen = useCallback((n: ReceivedDataMessage) => {
    if (n.from?.identity.startsWith(GASTGEBER)) rueck.current.onQuiz?.();
  }, []);
  const { send } = useDataChannel("herz", herzEmpfangen);
  const { send: quizSenden } = useDataChannel("quiz", quizEmpfangen);

  useEffect(() => {
    rueck.current.onSteuerung?.({
      herz: () => {
        send(HERZ, { reliable: false }).catch(() => {});
      },
      quiz: () => {
        quizSenden(QUIZ, { reliable: true }).catch(() => {});
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
  }, [send, quizSenden, raum, localParticipant]);

  if (!bild || !isTrackReference(bild)) return null;
  // Eigenes Bild mit der Frontkamera gespiegelt – wie ein Spiegel.
  return <VideoTrack trackRef={bild} style={VOLL} objectFit="cover" mirror={senden && gespiegelt} />;
}
