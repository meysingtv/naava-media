import { useCallback, useState } from "react";
import { router, useFocusEffect } from "expo-router";

import { dialog } from "@/components/dialog";
import { useKonto } from "@/lib/konto";
import { freundDuellBeitreten, freundDuellErstellen, meineDuelle, rangDuellSuchen, type DuellMitNamen } from "@/lib/online-duell";
import { demoRangliste, ligaVon, ranglisteLaden, type RangEintrag } from "@/lib/rangliste";
import { useStand, xpWoche } from "@/lib/stand";
import { serverVerbunden } from "@/lib/supabase";

// Daten und Aktionen der Liga-Seite (Handy und PC): Rangliste der Woche,
// eigene Online-Duelle und das Starten neuer Duelle.

export function useLigaDaten() {
  const { stand } = useStand();
  const { session, profil, anzeigeName, abmelden, profilNeuLaden } = useKonto();
  const ich = session?.user.id ?? "";
  const [regional, setRegional] = useState(false);
  const [liste, setListe] = useState<RangEintrag[] | null>(null);
  const [laedt, setLaedt] = useState(false);
  const [duelle, setDuelle] = useState<DuellMitNamen[]>([]);
  const [code, setCode] = useState("");
  const [arbeitet, setArbeitet] = useState<"suche" | "code" | "beitritt" | null>(null);
  const meineXp = xpWoche(stand);
  const liga = ligaVon(stand.xp);
  const bundesland = profil?.bundesland ?? null;

  const laden = useCallback(() => {
    let aktiv = true;
    if (session) {
      setLaedt(true);
      ranglisteLaden(session.user.id, regional ? bundesland : null).then((l) => {
        if (!aktiv) return;
        setListe(l ?? demoRangliste({ name: anzeigeName, xp: meineXp }, regional));
        setLaedt(false);
      });
      meineDuelle().then((r) => aktiv && setDuelle(r.daten ?? []));
      profilNeuLaden();
    } else {
      setListe(demoRangliste({ name: anzeigeName, xp: meineXp }, regional));
    }
    return () => {
      aktiv = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, anzeigeName, meineXp, regional, bundesland]);

  useFocusEffect(laden);

  const ichEintrag = liste?.find((e) => e.ich);
  const tageRest = 7 - ((new Date().getDay() + 6) % 7);
  const online = Boolean(session) && serverVerbunden;

  function regionalWaehlen(an: boolean) {
    if (an && session && !bundesland) {
      dialog("Bundesland fehlt", "Wähle dein Bundesland in den Einstellungen, dann siehst du die regionale Rangliste.", [
        { text: "Später", style: "cancel" },
        { text: "Einstellungen", onPress: () => router.push("/einstellungen") },
      ]);
      return;
    }
    setRegional(an);
  }

  async function starte(art: "suche" | "code" | "beitritt") {
    setArbeitet(art);
    const r = art === "suche" ? await rangDuellSuchen() : art === "code" ? await freundDuellErstellen() : await freundDuellBeitreten(code);
    setArbeitet(null);
    if (r.fehler || !r.daten) {
      dialog("Das hat nicht geklappt", r.fehler ?? "Bitte versuch es noch einmal.");
      return;
    }
    setCode("");
    router.push({ pathname: "/online-duell", params: { id: r.daten.id } });
  }

  async function kontoErstellen() {
    await abmelden();
    router.replace("/registrieren");
  }

  return { ich, regional, regionalWaehlen, liste, laedt, duelle, code, setCode, arbeitet, starte, kontoErstellen, meineXp, liga, bundesland, ichEintrag, tageRest, online };
}
