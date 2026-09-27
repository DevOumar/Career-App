// Reconstruction de la lettre de motivation (features/coverLetter/CoverLetterPage.jsx,
// bloc .letter-document) pour @react-pdf/renderer — remplace window.print(),
// sur le même principe que la migration CV (CvDocumentClassicPdf.jsx et
// consorts) : composant isolé, recodé avec les primitives react-pdf
// (Document/Page/View/Text), pas un copier-coller de HTML/CSS.
//
// 3 variantes visuelles, miroir exact des 3 classes CSS actuelles
// (.letter-document.template-classic/modern/minimal, styles.css:9582-9601) :
//   classic — aucun traitement particulier (style de base)
//   modern  — bordure gauche colorée + sujet en couleur primary
//   minimal — marges réduites + sujet en corps de texte, séparé par un filet
//
// theme-ready dès le départ (pas de couleurs en dur à retrofitter plus
// tard, cf. leçon tirée du chantier Sidebar hasPhoto/avatarDataUrl) :
// réutilise tel quel le schéma de cvTemplateThemes.js (colors
// primary/primaryInk/bgAccent, resolveCvTheme) — ce fichier anticipait déjà
// explicitement cette réutilisation (cf. son en-tête). Aucun sélecteur ne
// l'exploite encore ; sans prop `theme`, le comportement retombe sur
// DEFAULT_CV_THEME (orange corail), identique à avant.
import React from "react";
import { Document, Page, Text, StyleSheet } from "@react-pdf/renderer";
import "./fonts.js";
import { shrinkToOnePage } from "./pdfAutoFit.js";
import { CV_NEUTRAL_COLORS, resolveCvTheme } from "./cvTemplateThemes.js";

// Équivalent JS du pattern CSS calc(Xrem * var(--cv-font-scale,1)) déjà
// utilisé par les 3 templates CV (cf. CvDocumentClassicPdf.jsx) — même
// moteur de réduction (pdfAutoFit.shrinkToOnePage), donc même mécanique de
// mise à l'échelle ici.
function makeStyles(fontScale = 1, spaceScale = 1, theme, template) {
  const f = (value) => value * fontScale;
  const s = (value) => value * spaceScale;
  const resolved = resolveCvTheme(theme);
  const colors = { ...CV_NEUTRAL_COLORS, ...resolved.colors };
  const fonts = resolved.fonts;

  const page = {
    paddingVertical: s(64),
    paddingHorizontal: s(template === "minimal" ? 52 : 68),
    fontFamily: fonts.bodyFamily,
    fontSize: f(11),
    lineHeight: 1.6,
    color: colors.text2
  };
  if (template === "modern") {
    // Miroir de .letter-document.template-modern { border-left: 4px solid
    // var(--primary) } (styles.css:9582-9586) — appliquée directement sur
    // <Page>, qui EST le conteneur équivalent au .letter-document CSS
    // (padding compris), pas une sous-section comme pour les decorations
    // CV (bracket sur `header` seulement, pas sur toute la page).
    page.borderLeftWidth = 5;
    page.borderLeftColor = colors.primary;
    page.borderLeftStyle = "solid";
  }

  const subject = {
    fontFamily: fonts.accentFamily,
    fontWeight: 700,
    fontSize: f(13),
    marginBottom: s(22),
    color: colors.text
  };
  if (template === "modern") {
    subject.color = colors.primary;
  } else if (template === "minimal") {
    subject.fontWeight = 500;
    subject.fontSize = f(11.5);
    subject.color = colors.text3;
    subject.paddingBottom = s(10);
    subject.borderBottomWidth = 1;
    subject.borderBottomColor = colors.line;
    subject.borderBottomStyle = "solid";
  }

  return StyleSheet.create({
    page,
    subject,
    paragraph: {
      marginBottom: s(13)
    }
  });
}

export function CoverLetterPdf({ subject, letter, template = "classic", theme, fontScale = 1, spaceScale = 1, onRender }) {
  const styles = makeStyles(fontScale, spaceScale, theme, template);
  // Même découpage que l'aperçu écran (CoverLetterPage.jsx :
  // letter.split("\n\n").map(...)) — un paragraphe par double saut de ligne.
  const paragraphs = (letter || "")
    .split("\n\n")
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  return (
    <Document onRender={onRender}>
      <Page size="A4" style={styles.page}>
        {subject ? <Text style={styles.subject}>{subject}</Text> : null}
        {paragraphs.map((paragraph, index) => (
          <Text key={`para-${index}`} style={styles.paragraph}>
            {paragraph}
          </Text>
        ))}
      </Page>
    </Document>
  );
}

// Orchestration Étape 4 (garantie 1 page), même patron que
// fitCvDocumentClassicPdfToOnePage/fitCvDocumentLinearPdfToOnePage : mono-
// colonne, donc mécanisme A uniquement (réduction espace puis police) — pas
// de troncature. `letterData` regroupe {subject, letter, template} plutôt
// que des paramètres positionnels séparés : pas d'équivalent avatarDataUrl
// ici (la lettre n'a pas de photo), inutile de garder un 4e paramètre vide.
export async function fitCoverLetterPdfToOnePage(letterData, theme, options) {
  const { subject, letter, template } = letterData || {};
  const result = await shrinkToOnePage(
    (fontScale, spaceScale, onRender) => (
      <CoverLetterPdf
        subject={subject}
        letter={letter}
        template={template}
        theme={theme}
        fontScale={fontScale}
        spaceScale={spaceScale}
        onRender={onRender}
      />
    ),
    options
  );
  return { ...result, overflow: !result.fits };
}
