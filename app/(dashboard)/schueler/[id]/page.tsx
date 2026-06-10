import { redirect } from "next/navigation";

// Die Einzelseite ist in die geteilte Übersicht (Liste + Akte) umgezogen.
export default function SchuelerDetailRedirect({ params }: { params: { id: string } }) {
  redirect(`/schueler?id=${params.id}`);
}
