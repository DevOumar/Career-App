// Facture Career CV (école, cabinet, candidat) générée en PDF côté navigateur.
// Les données viennent du serveur (numéro unique, montants, vendeur, client).
import React from "react";
import { Document, Page, View, Text, StyleSheet, pdf } from "@react-pdf/renderer";
import "./fonts.js";

const INK = "#171317";
const MUTED = "#7b6d63";
const LINE = "#eadfd3";
const ACCENT = "#b83309";

const styles = StyleSheet.create({
  page: { padding: 42, fontFamily: "Instrument Sans", fontSize: 10, color: INK, lineHeight: 1.45 },
  head: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 26 },
  brand: { fontFamily: "Cabinet Grotesk", fontWeight: 900, fontSize: 22, lineHeight: 1.25, marginBottom: 6, color: ACCENT },
  title: { fontFamily: "Cabinet Grotesk", fontWeight: 900, fontSize: 20, lineHeight: 1.25, marginBottom: 6, textAlign: "right" },
  meta: { textAlign: "right", color: MUTED, marginTop: 4 },
  parties: { flexDirection: "row", gap: 16, marginBottom: 24 },
  party: { flex: 1, padding: 12, borderRadius: 8, backgroundColor: "#fbf8f4", borderWidth: 1, borderColor: LINE },
  partyLabel: { fontSize: 8, fontWeight: 700, color: MUTED, textTransform: "uppercase", letterSpacing: 1, marginBottom: 5 },
  partyName: { fontWeight: 700, fontSize: 11, marginBottom: 2 },
  table: { borderWidth: 1, borderColor: LINE, borderRadius: 8, overflow: "hidden" },
  row: { flexDirection: "row", paddingVertical: 8, paddingHorizontal: 10, borderBottomWidth: 1, borderBottomColor: LINE },
  headRow: { backgroundColor: "#fff4ec" },
  th: { fontSize: 8, fontWeight: 700, color: MUTED, textTransform: "uppercase", letterSpacing: 0.6 },
  cDesc: { flex: 3.2 },
  cQty: { flex: 0.7, textAlign: "right" },
  cUnit: { flex: 1.3, textAlign: "right" },
  cTotal: { flex: 1.3, textAlign: "right" },
  totals: { marginTop: 14, marginLeft: "auto", width: 220 },
  totalRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 4 },
  grand: { borderTopWidth: 1.5, borderTopColor: INK, marginTop: 4, paddingTop: 6 },
  grandText: { fontFamily: "Cabinet Grotesk", fontWeight: 900, fontSize: 14, lineHeight: 1.3 },
  paid: { marginTop: 22, padding: 12, borderRadius: 8, borderLeftWidth: 3 },
  footer: { position: "absolute", left: 42, right: 42, bottom: 28, fontSize: 8, color: MUTED, textAlign: "center", borderTopWidth: 1, borderTopColor: LINE, paddingTop: 8 }
});

const money = (value, currency = "EUR") =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency }).format(Number(value || 0)).replace(/ /g, " ").replace(/ /g, " ");
const day = (value) => (value ? new Date(value).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" }) : "");

export function InvoicePdf({ invoice }) {
  const { seller, buyer, line, payment, currency } = invoice;
  const status =
    payment.status === "refunded"
      ? { text: `Remboursée${payment.refundedAt ? ` le ${day(payment.refundedAt)}` : ""}`, color: "#cf1322", bg: "#fff1f0" }
      : payment.status === "paid"
      ? { text: `Payée le ${day(invoice.issuedAt)} — ${payment.method}`, color: "#237804", bg: "#f0f8ea" }
      : { text: "À régler", color: ACCENT, bg: "#fff4ec" };
  return (
    <Document title={`Facture ${invoice.number}`} author={seller.name}>
      <Page size="A4" style={styles.page}>
        <View style={styles.head}>
          <View>
            <Text style={styles.brand}>{seller.name}</Text>
            {seller.address ? <Text style={{ color: MUTED, marginTop: 4 }}>{seller.address}</Text> : null}
            {seller.siret ? <Text style={{ color: MUTED }}>SIRET : {seller.siret}</Text> : null}
            <Text style={{ color: MUTED }}>{seller.email}</Text>
          </View>
          <View>
            <Text style={styles.title}>FACTURE</Text>
            <Text style={styles.meta}>N° {invoice.number}</Text>
            <Text style={styles.meta}>Date : {day(invoice.issuedAt)}</Text>
          </View>
        </View>

        <View style={styles.parties}>
          <View style={styles.party}>
            <Text style={styles.partyLabel}>Émise par</Text>
            <Text style={styles.partyName}>{seller.name}</Text>
            <Text style={{ color: MUTED }}>{seller.email}</Text>
          </View>
          <View style={styles.party}>
            <Text style={styles.partyLabel}>Facturée à</Text>
            <Text style={styles.partyName}>{buyer.name}</Text>
            {buyer.contact && buyer.contact !== buyer.name ? <Text>{buyer.contact}</Text> : null}
            <Text style={{ color: MUTED }}>{buyer.email}</Text>
          </View>
        </View>

        <View style={styles.table}>
          <View style={[styles.row, styles.headRow]}>
            <Text style={[styles.th, styles.cDesc]}>Désignation</Text>
            <Text style={[styles.th, styles.cQty]}>Qté</Text>
            <Text style={[styles.th, styles.cUnit]}>Prix unitaire</Text>
            <Text style={[styles.th, styles.cTotal]}>Montant</Text>
          </View>
          <View style={[styles.row, { borderBottomWidth: 0 }]}>
            <View style={styles.cDesc}>
              <Text style={{ fontWeight: 700 }}>{line.label}</Text>
              <Text style={{ color: MUTED, fontSize: 9 }}>
                {line.cycle === "one_time"
                  ? "Achat unique"
                  : `${line.cycle === "annual" ? "Abonnement annuel" : "Abonnement mensuel"}${line.period ? ` — du ${day(line.period.from)} au ${day(line.period.to)}` : ""}`}
              </Text>
            </View>
            <Text style={styles.cQty}>{line.quantity}</Text>
            <Text style={styles.cUnit}>{money(line.unitPrice, currency)}</Text>
            <Text style={styles.cTotal}>{money(line.total, currency)}</Text>
          </View>
        </View>

        <View style={styles.totals}>
          <View style={[styles.totalRow, styles.grand]}>
            <Text style={styles.grandText}>Total</Text>
            <Text style={styles.grandText}>{money(line.total, currency)}</Text>
          </View>
          {seller.vatMention ? <Text style={{ color: MUTED, fontSize: 8, marginTop: 4 }}>{seller.vatMention}</Text> : null}
        </View>

        <View style={[styles.paid, { borderLeftColor: status.color, backgroundColor: status.bg }]}>
          <Text style={{ fontWeight: 700, color: status.color }}>{status.text}</Text>
          {payment.status === "paid" ? <Text style={{ color: MUTED, marginTop: 2 }}>Montant réglé : {money(payment.paid, currency)}</Text> : null}
        </View>

        <Text style={styles.footer} fixed>
          {[seller.name, seller.address, seller.siret ? `SIRET ${seller.siret}` : "", seller.email].filter(Boolean).join(" · ")}
        </Text>
      </Page>
    </Document>
  );
}

export async function renderInvoicePdf(invoice) {
  return pdf(<InvoicePdf invoice={invoice} />).toBlob();
}
