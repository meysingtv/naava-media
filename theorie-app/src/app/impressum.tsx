import { RechtsSeite } from "@/components/rechts-seite";
import { IMPRESSUM } from "@/lib/rechtliches";

export default function ImpressumSeite() {
  return <RechtsSeite titel="Impressum" unter="Angaben zum Anbieter" abschnitte={IMPRESSUM} />;
}
