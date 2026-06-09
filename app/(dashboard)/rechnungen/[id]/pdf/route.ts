import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { getKontext } from "@/lib/supabase/queries";
import { rechnungPdfBuffer } from "../../rechnung-pdf";
import type { Fahrschueler, Rechnung, RechnungPosition } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const kontext = await getKontext();

  const { data: rechnungData } = await supabase
    .from("rechnung")
    .select("*")
    .eq("id", params.id)
    .maybeSingle();

  if (!rechnungData) {
    return new NextResponse("Rechnung nicht gefunden", { status: 404 });
  }
  const rechnung = rechnungData as Rechnung;

  const [positionenRes, schuelerRes] = await Promise.all([
    supabase.from("rechnung_position").select("*").eq("rechnung_id", rechnung.id),
    rechnung.schueler_id
      ? supabase.from("fahrschueler").select("*").eq("id", rechnung.schueler_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const buffer = await rechnungPdfBuffer({
    rechnung,
    positionen: (positionenRes.data ?? []) as RechnungPosition[],
    schueler: (schuelerRes.data as Fahrschueler | null) ?? null,
    fahrschule: kontext?.fahrschule ?? null,
  });

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="Rechnung-${rechnung.nummer}.pdf"`,
    },
  });
}
