// Composant de test minimal — valide uniquement que @react-pdf/renderer et
// l'enregistrement des polices (./fonts.js) fonctionnent, avant de
// reconstruire CvDocumentClassic/Sidebar dans cette API. Pas branché sur
// l'app (aucune route, aucun bouton) : rendu et vérifié via un script Node
// autonome le temps de cette validation.
import React from "react";
import { Document, Page, Text, StyleSheet } from "@react-pdf/renderer";
import "./fonts.js";

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: "Instrument Sans",
    fontWeight: 400
  },
  heading700: {
    fontFamily: "Cabinet Grotesk",
    fontWeight: 700,
    fontSize: 28,
    marginBottom: 12
  },
  heading900: {
    fontFamily: "Cabinet Grotesk",
    fontWeight: 900,
    fontSize: 28,
    marginBottom: 12
  },
  body400: {
    fontFamily: "Instrument Sans",
    fontWeight: 400,
    fontSize: 12,
    marginBottom: 6
  },
  body500: {
    fontFamily: "Instrument Sans",
    fontWeight: 500,
    fontSize: 12
  }
});

export function TestPdfDocument() {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.heading700}>Bonjour (Cabinet Grotesk 700)</Text>
        <Text style={styles.heading900}>Bonjour (Cabinet Grotesk 900)</Text>
        <Text style={styles.body400}>Bonjour (Instrument Sans 400)</Text>
        <Text style={styles.body500}>Bonjour (Instrument Sans 500)</Text>
      </Page>
    </Document>
  );
}
