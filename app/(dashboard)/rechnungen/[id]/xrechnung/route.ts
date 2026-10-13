import { createClient } from "@/lib/supabase/server";
import { getKontext } from "@/lib/supabase/queries";
import type { RechnungPosition } from "@/lib/types";
import { darf } from "@/lib/zugriff";

export const dynamic = "force-dynamic";

function esc(v: string | number | null | undefined): string {
  return String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
function n2(v: number): string {
  return v.toFixed(2);
}

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  if (!(await darf("/rechnungen"))) return new Response("Kein Zugriff", { status: 403 });
  const supabase = createClient();
  const kontext = await getKontext();

  const { data: rechnung } = await supabase
    .from("rechnung")
    .select("*, fahrschueler(vorname, nachname, strasse, plz, ort, email)")
    .eq("id", params.id)
    .maybeSingle();

  if (!rechnung) return new Response("Rechnung nicht gefunden", { status: 404 });

  const { data: posData } = await supabase
    .from("rechnung_position")
    .select("*")
    .eq("rechnung_id", params.id)
    .returns<RechnungPosition[]>();

  const positionen = posData ?? [];
  const r = rechnung as typeof rechnung & {
    fahrschueler: { vorname: string; nachname: string; strasse: string | null; plz: string | null; ort: string | null; email: string | null } | null;
  };
  const fs = kontext?.fahrschule;
  const steuersatz = Number(r.steuersatz ?? 19);
  const netto = Number(r.betrag_netto ?? 0);
  const brutto = Number(r.betrag_brutto ?? 0);
  const steuer = brutto - netto;
  const kunde = r.fahrschueler;

  const zeilen = positionen
    .map((p, i) => {
      const menge = Number(p.menge ?? 0);
      const preis = Number(p.einzelpreis ?? 0);
      const summe = menge * preis;
      return `  <cac:InvoiceLine>
    <cbc:ID>${i + 1}</cbc:ID>
    <cbc:InvoicedQuantity unitCode="C62">${n2(menge)}</cbc:InvoicedQuantity>
    <cbc:LineExtensionAmount currencyID="EUR">${n2(summe)}</cbc:LineExtensionAmount>
    <cac:Item>
      <cbc:Name>${esc(p.beschreibung)}</cbc:Name>
      <cac:ClassifiedTaxCategory>
        <cbc:ID>S</cbc:ID>
        <cbc:Percent>${n2(steuersatz)}</cbc:Percent>
        <cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme>
      </cac:ClassifiedTaxCategory>
    </cac:Item>
    <cac:Price>
      <cbc:PriceAmount currencyID="EUR">${n2(preis)}</cbc:PriceAmount>
    </cac:Price>
  </cac:InvoiceLine>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
         xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
         xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">
  <cbc:CustomizationID>urn:cen.eu:en16931:2017#compliant#urn:xoev-de:kosit:standard:xrechnung_3.0</cbc:CustomizationID>
  <cbc:ID>${esc(r.nummer)}</cbc:ID>
  <cbc:IssueDate>${esc((r.rechnungsdatum ?? "").slice(0, 10))}</cbc:IssueDate>
  ${r.faelligkeitsdatum ? `<cbc:DueDate>${esc(r.faelligkeitsdatum.slice(0, 10))}</cbc:DueDate>` : ""}
  <cbc:InvoiceTypeCode>380</cbc:InvoiceTypeCode>
  <cbc:DocumentCurrencyCode>EUR</cbc:DocumentCurrencyCode>
  <cac:AccountingSupplierParty>
    <cac:Party>
      <cac:PartyName><cbc:Name>${esc(fs?.name)}</cbc:Name></cac:PartyName>
      <cac:PostalAddress>
        <cbc:StreetName>${esc(fs?.strasse)}</cbc:StreetName>
        <cbc:CityName>${esc(fs?.ort)}</cbc:CityName>
        <cbc:PostalZone>${esc(fs?.plz)}</cbc:PostalZone>
        <cac:Country><cbc:IdentificationCode>DE</cbc:IdentificationCode></cac:Country>
      </cac:PostalAddress>
      <cac:PartyTaxScheme>
        <cbc:CompanyID>${esc(fs?.steuernummer)}</cbc:CompanyID>
        <cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme>
      </cac:PartyTaxScheme>
      <cac:Contact><cbc:ElectronicMail>${esc(fs?.email)}</cbc:ElectronicMail></cac:Contact>
    </cac:Party>
  </cac:AccountingSupplierParty>
  <cac:AccountingCustomerParty>
    <cac:Party>
      <cac:PartyName><cbc:Name>${esc(kunde ? `${kunde.vorname} ${kunde.nachname}` : "Kunde")}</cbc:Name></cac:PartyName>
      <cac:PostalAddress>
        <cbc:StreetName>${esc(kunde?.strasse)}</cbc:StreetName>
        <cbc:CityName>${esc(kunde?.ort)}</cbc:CityName>
        <cbc:PostalZone>${esc(kunde?.plz)}</cbc:PostalZone>
        <cac:Country><cbc:IdentificationCode>DE</cbc:IdentificationCode></cac:Country>
      </cac:PostalAddress>
      <cac:Contact><cbc:ElectronicMail>${esc(kunde?.email)}</cbc:ElectronicMail></cac:Contact>
    </cac:Party>
  </cac:AccountingCustomerParty>
  <cac:TaxTotal>
    <cbc:TaxAmount currencyID="EUR">${n2(steuer)}</cbc:TaxAmount>
    <cac:TaxSubtotal>
      <cbc:TaxableAmount currencyID="EUR">${n2(netto)}</cbc:TaxableAmount>
      <cbc:TaxAmount currencyID="EUR">${n2(steuer)}</cbc:TaxAmount>
      <cac:TaxCategory>
        <cbc:ID>S</cbc:ID>
        <cbc:Percent>${n2(steuersatz)}</cbc:Percent>
        <cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme>
      </cac:TaxCategory>
    </cac:TaxSubtotal>
  </cac:TaxTotal>
  <cac:LegalMonetaryTotal>
    <cbc:LineExtensionAmount currencyID="EUR">${n2(netto)}</cbc:LineExtensionAmount>
    <cbc:TaxExclusiveAmount currencyID="EUR">${n2(netto)}</cbc:TaxExclusiveAmount>
    <cbc:TaxInclusiveAmount currencyID="EUR">${n2(brutto)}</cbc:TaxInclusiveAmount>
    <cbc:PayableAmount currencyID="EUR">${n2(brutto)}</cbc:PayableAmount>
  </cac:LegalMonetaryTotal>
${zeilen}
</Invoice>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Content-Disposition": `attachment; filename="XRechnung-${r.nummer}.xml"`,
    },
  });
}
