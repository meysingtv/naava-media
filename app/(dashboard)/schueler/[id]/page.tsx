import { SchuelerAkte } from "../schueler-akte";

export const metadata = { title: "Schülerakte · FahrschulApp" };

export default function SchuelerDetailPage({ params }: { params: { id: string } }) {
  return <SchuelerAkte schuelerId={params.id} />;
}
