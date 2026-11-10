import { RechtsSeite } from "@/components/rechts-seite";
import { NUTZUNGSBEDINGUNGEN } from "@/lib/rechtliches";

export default function NutzungsbedingungenSeite() {
  return <RechtsSeite titel="Nutzungsbedingungen" unter="Regeln für die Nutzung" abschnitte={NUTZUNGSBEDINGUNGEN} />;
}
