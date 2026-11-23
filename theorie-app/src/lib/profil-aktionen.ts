import { dialog } from "@/components/dialog";
import { ERFOLGE } from "@/lib/erfolge";
import { useKonto } from "@/lib/konto";
import { profilbildEntfernen, profilbildHochladen, profilbildServerEntfernen, profilbildWaehlen, useProfilbild } from "@/lib/profilbild";
import { useStand } from "@/lib/stand";

// Aktionen der Profilseite (Handy und PC): Profilbild ändern, abmelden und ein
// Abzeichen erklären.

export function useProfilAktionen() {
  const { stand } = useStand();
  const { profil, gast, abmelden, session, profilNeuLaden } = useKonto();
  const bild = useProfilbild();
  const hatBild = Boolean(bild || profil?.bild_pfad);

  async function fotoWaehlen() {
    const ok = await profilbildWaehlen();
    if (!ok || !session) return;
    try {
      // Auch auf den Server, damit andere es bei Clips und Kommentaren sehen.
      await profilbildHochladen(profil?.bild_pfad ?? null);
      await profilNeuLaden();
    } catch {
      dialog("Profilbild", "Das Bild ist auf deinem Handy gespeichert, konnte aber gerade nicht hochgeladen werden. Versuch es gleich noch einmal.");
    }
  }

  async function fotoEntfernen() {
    await profilbildEntfernen();
    if (!session) return;
    await profilbildServerEntfernen(profil?.bild_pfad ?? null);
    await profilNeuLaden();
  }

  function bildAendern() {
    const optionen: { text: string; onPress?: () => void; style?: "cancel" | "destructive" }[] = [{ text: "Foto auswählen", onPress: () => fotoWaehlen() }];
    if (hatBild) optionen.push({ text: "Foto entfernen", style: "destructive", onPress: () => fotoEntfernen() });
    optionen.push({ text: "Abbrechen", style: "cancel" });
    dialog("Profilbild", undefined, optionen);
  }

  function abmeldenFragen() {
    dialog(
      gast ? "Gastmodus beenden?" : "Abmelden?",
      gast ? "Dein Fortschritt bleibt auf diesem Gerät gespeichert." : "Dein Fortschritt ist in deinem Konto gesichert.",
      [
        { text: "Abbrechen", style: "cancel" },
        { text: gast ? "Beenden" : "Abmelden", style: "destructive", onPress: () => abmelden() },
      ],
    );
  }

  function abzeichenZeigen(id: string) {
    const e = ERFOLGE.find((x) => x.id === id);
    if (!e) return;
    const wann = stand.erfolge[e.id];
    dialog(e.titel, wann ? `${e.text}\nFreigeschaltet am ${wann.split("-").reverse().join(".")}.` : e.text);
  }

  return { bildAendern, abmeldenFragen, abzeichenZeigen };
}
