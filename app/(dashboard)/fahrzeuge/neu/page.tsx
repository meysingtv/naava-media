import { fahrlehrerOptionen } from "../daten";
import { FahrzeugForm } from "../fahrzeug-form";

export const metadata = { title: "Neues Fahrzeug · FahrschulApp" };

export default async function NeuesFahrzeugPage() {
  return <FahrzeugForm options={await fahrlehrerOptionen()} />;
}
