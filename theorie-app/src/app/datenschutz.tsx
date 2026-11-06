import { RechtsSeite } from "@/components/rechts-seite";
import { DATENSCHUTZ } from "@/lib/rechtliches";

export default function DatenschutzSeite() {
  return <RechtsSeite titel="Datenschutz" unter="Wie wir mit deinen Daten umgehen" abschnitte={DATENSCHUTZ} />;
}
