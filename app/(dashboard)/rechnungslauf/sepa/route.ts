import { createClient } from "@/lib/supabase/server";
import { getKontext } from "@/lib/supabase/queries";
import type { Rechnung } from "@/lib/types";
import { darf } from "@/lib/zugriff";

export const dynamic = "force-dynamic";

function esc(v: string | null | undefined): string {
  return String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
function n2(v: number): string {
  return v.toFixed(2);
}
function plusTage(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}
function ibanClean(s: string | null): string {
  return (s ?? "").replace(/\s+/g, "").toUpperCase();
}

export async function GET() {
  if (!(await darf("/rechnungslauf"))) return new Response("Kein Zugriff", { status: 403 });
  const supabase = createClient();
  const kontext = await getKontext();
  const fs = kontext?.fahrschule;

  if (!fs?.iban || !fs?.glaeubiger_id) {
    return new Response(
      "SEPA-Einzug nicht möglich: Bitte zuerst in den Einstellungen IBAN und Gläubiger-ID der Fahrschule hinterlegen.",
      { status: 400 },
    );
  }

  const { data } = await supabase
    .from("rechnung")
    .select("*, fahrschueler(vorname, nachname, iban, sepa_mandat_ref, sepa_mandat_am)")
    .neq("status", "bezahlt")
    .returns<
      (Rechnung & {
        fahrschueler: {
          vorname: string;
          nachname: string;
          iban: string | null;
          sepa_mandat_ref: string | null;
          sepa_mandat_am: string | null;
        } | null;
      })[]
    >();

  const posten = (data ?? []).filter(
    (r) => r.fahrschueler?.iban && r.fahrschueler?.sepa_mandat_ref && r.fahrschueler?.sepa_mandat_am,
  );

  if (posten.length === 0) {
    return new Response(
      "Keine einzugsfähigen Rechnungen: Es gibt keine offenen Rechnungen von Schülern mit IBAN und SEPA-Mandat.",
      { status: 400 },
    );
  }

  const summe = posten.reduce((s, r) => s + Number(r.betrag_brutto ?? 0), 0);
  const msgId = `MSG-${Date.now()}`;
  const nowIso = new Date().toISOString().replace(/\.\d+Z$/, "Z");
  const colDate = plusTage(5);

  const tx = posten
    .map((r) => {
      const k = r.fahrschueler!;
      return `      <DrctDbtTxInf>
        <PmtId><EndToEndId>${esc(r.nummer)}</EndToEndId></PmtId>
        <InstdAmt Ccy="EUR">${n2(Number(r.betrag_brutto ?? 0))}</InstdAmt>
        <DrctDbtTx>
          <MndtRltdInf>
            <MndtId>${esc(k.sepa_mandat_ref)}</MndtId>
            <DtOfSgntr>${esc((k.sepa_mandat_am ?? "").slice(0, 10))}</DtOfSgntr>
          </MndtRltdInf>
        </DrctDbtTx>
        <DbtrAgt><FinInstnId><Othr><Id>NOTPROVIDED</Id></Othr></FinInstnId></DbtrAgt>
        <Dbtr><Nm>${esc(`${k.vorname} ${k.nachname}`)}</Nm></Dbtr>
        <DbtrAcct><Id><IBAN>${esc(ibanClean(k.iban))}</IBAN></Id></DbtrAcct>
        <RmtInf><Ustrd>Rechnung ${esc(r.nummer)}</Ustrd></RmtInf>
      </DrctDbtTxInf>`;
    })
    .join("\n");

  const cdtrAgt = fs.bic
    ? `<CdtrAgt><FinInstnId><BIC>${esc(fs.bic)}</BIC></FinInstnId></CdtrAgt>`
    : `<CdtrAgt><FinInstnId><Othr><Id>NOTPROVIDED</Id></Othr></FinInstnId></CdtrAgt>`;

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:pain.008.001.02">
  <CstmrDrctDbtInitn>
    <GrpHdr>
      <MsgId>${msgId}</MsgId>
      <CreDtTm>${nowIso}</CreDtTm>
      <NbOfTxs>${posten.length}</NbOfTxs>
      <CtrlSum>${n2(summe)}</CtrlSum>
      <InitgPty><Nm>${esc(fs.kontoinhaber ?? fs.name)}</Nm></InitgPty>
    </GrpHdr>
    <PmtInf>
      <PmtInfId>${msgId}-1</PmtInfId>
      <PmtMtd>DD</PmtMtd>
      <NbOfTxs>${posten.length}</NbOfTxs>
      <CtrlSum>${n2(summe)}</CtrlSum>
      <PmtTpInf>
        <SvcLvl><Cd>SEPA</Cd></SvcLvl>
        <LclInstrm><Cd>CORE</Cd></LclInstrm>
        <SeqTp>RCUR</SeqTp>
      </PmtTpInf>
      <ReqdColltnDt>${colDate}</ReqdColltnDt>
      <Cdtr><Nm>${esc(fs.kontoinhaber ?? fs.name)}</Nm></Cdtr>
      <CdtrAcct><Id><IBAN>${esc(ibanClean(fs.iban))}</IBAN></Id></CdtrAcct>
      ${cdtrAgt}
      <ChrgBr>SLEV</ChrgBr>
      <CdtrSchmeId>
        <Id><PrvtId><Othr><Id>${esc(fs.glaeubiger_id)}</Id><SchmeNm><Prtry>SEPA</Prtry></SchmeNm></Othr></PrvtId></Id>
      </CdtrSchmeId>
${tx}
    </PmtInf>
  </CstmrDrctDbtInitn>
</Document>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Content-Disposition": `attachment; filename="SEPA-Lastschrift-${plusTage(0)}.xml"`,
    },
  });
}
