import "server-only";
import { Document, Page, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer";

import { formatDatum, formatEuro } from "@/lib/utils";
import type { Fahrschule, Fahrschueler, Rechnung, RechnungPosition } from "@/lib/types";

const styles = StyleSheet.create({
  page: { padding: 48, fontSize: 10, color: "#0f172a", fontFamily: "Helvetica" },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  firmenName: { fontSize: 16, fontWeight: "bold" },
  muted: { color: "#64748b" },
  title: { fontSize: 14, fontWeight: "bold" },
  metaRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 32 },
  label: { fontSize: 8, color: "#64748b", textTransform: "uppercase", marginBottom: 3 },
  bold: { fontWeight: "bold" },
  tableHeader: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    paddingBottom: 5,
    marginTop: 28,
    color: "#64748b",
  },
  row: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: "#e2e8f0",
    paddingVertical: 6,
  },
  colDesc: { flex: 4 },
  colNum: { flex: 1.5, textAlign: "right" },
  totals: { marginTop: 16, marginLeft: "auto", width: 220 },
  totalLine: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 2 },
  totalSum: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: "#0f172a",
    marginTop: 4,
    paddingTop: 4,
  },
  footer: { marginTop: 36, borderTopWidth: 0.5, borderTopColor: "#e2e8f0", paddingTop: 8, fontSize: 8, color: "#64748b" },
});

export interface RechnungPdfDaten {
  rechnung: Rechnung;
  positionen: RechnungPosition[];
  schueler: Fahrschueler | null;
  fahrschule: Fahrschule | null;
}

function RechnungDokument({ rechnung, positionen, schueler, fahrschule }: RechnungPdfDaten) {
  const netto = Number(rechnung.betrag_netto);
  const brutto = Number(rechnung.betrag_brutto);
  const steuer = brutto - netto;

  return (
    <Document title={`Rechnung ${rechnung.nummer}`}>
      <Page size="A4" style={styles.page}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.firmenName}>{fahrschule?.name ?? "Fahrschule"}</Text>
            {fahrschule?.strasse ? <Text style={styles.muted}>{fahrschule.strasse}</Text> : null}
            {fahrschule?.plz || fahrschule?.ort ? (
              <Text style={styles.muted}>
                {[fahrschule?.plz, fahrschule?.ort].filter(Boolean).join(" ")}
              </Text>
            ) : null}
          </View>
          <Text style={styles.title}>Rechnung</Text>
        </View>

        <View style={styles.metaRow}>
          <View>
            {schueler ? (
              <>
                <Text style={styles.label}>Rechnung an</Text>
                <Text style={styles.bold}>
                  {schueler.vorname} {schueler.nachname}
                </Text>
                {schueler.strasse ? <Text style={styles.muted}>{schueler.strasse}</Text> : null}
                {schueler.plz || schueler.ort ? (
                  <Text style={styles.muted}>
                    {[schueler.plz, schueler.ort].filter(Boolean).join(" ")}
                  </Text>
                ) : null}
              </>
            ) : null}
          </View>
          <View style={{ textAlign: "right" }}>
            <Text>
              <Text style={styles.muted}>Rechnungsnr.: </Text>
              {rechnung.nummer}
            </Text>
            <Text>
              <Text style={styles.muted}>Datum: </Text>
              {formatDatum(rechnung.rechnungsdatum)}
            </Text>
            {rechnung.faelligkeitsdatum ? (
              <Text>
                <Text style={styles.muted}>Fällig bis: </Text>
                {formatDatum(rechnung.faelligkeitsdatum)}
              </Text>
            ) : null}
          </View>
        </View>

        <View style={styles.tableHeader}>
          <Text style={styles.colDesc}>Beschreibung</Text>
          <Text style={styles.colNum}>Menge</Text>
          <Text style={styles.colNum}>Einzelpreis</Text>
          <Text style={styles.colNum}>Gesamt</Text>
        </View>
        {positionen.map((p) => (
          <View key={p.id} style={styles.row}>
            <Text style={styles.colDesc}>{p.beschreibung}</Text>
            <Text style={styles.colNum}>
              {Number(p.menge)} {p.einheit ?? ""}
            </Text>
            <Text style={styles.colNum}>{formatEuro(Number(p.einzelpreis))}</Text>
            <Text style={styles.colNum}>{formatEuro(Number(p.menge) * Number(p.einzelpreis))}</Text>
          </View>
        ))}

        <View style={styles.totals}>
          <View style={styles.totalLine}>
            <Text style={styles.muted}>Netto</Text>
            <Text>{formatEuro(netto)}</Text>
          </View>
          <View style={styles.totalLine}>
            <Text style={styles.muted}>MwSt. ({rechnung.steuersatz}%)</Text>
            <Text>{formatEuro(steuer)}</Text>
          </View>
          <View style={styles.totalSum}>
            <Text style={styles.bold}>Gesamtbetrag</Text>
            <Text style={styles.bold}>{formatEuro(brutto)}</Text>
          </View>
        </View>

        {rechnung.notiz ? <Text style={{ marginTop: 28 }}>{rechnung.notiz}</Text> : null}

        {fahrschule?.iban || fahrschule?.steuernummer ? (
          <View style={styles.footer}>
            {fahrschule?.iban ? <Text>IBAN: {fahrschule.iban}</Text> : null}
            {fahrschule?.steuernummer ? <Text>Steuernummer: {fahrschule.steuernummer}</Text> : null}
          </View>
        ) : null}
      </Page>
    </Document>
  );
}

export async function rechnungPdfBuffer(daten: RechnungPdfDaten): Promise<Buffer> {
  return renderToBuffer(<RechnungDokument {...daten} />);
}
