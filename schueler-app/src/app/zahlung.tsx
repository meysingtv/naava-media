import { Redirect } from "expo-router";

/** Rücksprung aus dem Stripe-Bezahlfenster (fahrbar-schueler://zahlung) – weiter zu „Bezahlen“. */
export default function ZahlungZurueck() {
  return <Redirect href="/(tabs)/rechnungen" />;
}
