import { darf } from "@/lib/zugriff";
import { SchuelerForm } from "../schueler-form";

export const metadata = { title: "Neuer Schüler · FahrschulApp" };

export default async function NeuerSchuelerPage() {
  return <SchuelerForm zeigeFinanzen={await darf("/rechnungen")} />;
}
