// Reconstruction de CvDocumentClassic (features/cv/CvPages.jsx) pour
// @react-pdf/renderer — composant isolé, non branché à l'app (pas de
// route, pas de bouton). CvDocumentClassic original reste inchangé et
// continue de servir l'aperçu écran ; celui-ci ne sert qu'à l'export PDF.
// Même structure de sections, mêmes données (cvReview), même hiérarchie
// visuelle que l'original — mais recodé avec les primitives react-pdf
// (View/Text, pas de HTML/CSS), donc pas un simple copier-coller.
//
// Étape 4 — garantie "1 page A4" : le composant accepte fontScale/
// spaceScale (défaut 1 = comportement identique aux étapes précédentes)
// et un onRender optionnel forwardé à <Document>, pour être piloté par
// le moteur de mesure/réduction de pdfAutoFit.js (fitCvDocumentClassicPdfToOnePage,
// exporté plus bas). Rien de tout ça n'est branché à l'app pour l'instant.
//
// Templates paramétrables — le composant accepte maintenant un prop
// `theme` (cvTemplateThemes.js) au lieu de couleurs figées : couleur
// d'accent, police (fixe en v1) et decoration (line/block/bracket)
// viennent de cet objet. Sans prop `theme`, comportement strictement
// identique à avant (DEFAULT_CV_THEME = les valeurs qui étaient en dur).
import React from "react";
import { Document, Page, View, Text, Link, Image, StyleSheet } from "@react-pdf/renderer";
import "./fonts.js";
import { shrinkToOnePage } from "./pdfAutoFit.js";
import { CV_NEUTRAL_COLORS, resolveCvTheme } from "./cvTemplateThemes.js";

// Équivalent JS du pattern CSS calc(Xrem * var(--cv-font-scale,1)) /
// calc(Xrem * var(--cv-space-scale,1)) du chantier "auto-fit" CSS :
// react-pdf n'a pas de custom properties, donc StyleSheet.create() est
// recalculé à chaque appel avec les deux facteurs. Le padding de la page
// (marge physique A4) et les propriétés purement cosmétiques (largeur de
// bordure, border-radius) restent fixes — seuls le texte (fontScale) et
// les espacements internes (spaceScale) bougent, comme décidé pour le
// chantier CSS (Option B : deux échelles séparées).
function makeStyles(fontScale = 1, spaceScale = 1, theme) {
  const f = (value) => value * fontScale;
  const s = (value) => value * spaceScale;
  const resolved = resolveCvTheme(theme);
  const colors = { ...CV_NEUTRAL_COLORS, ...resolved.colors };
  const fonts = resolved.fonts;
  const decoration = resolved.decoration;

  // Seule l'en-tête varie par décoration pour Classic — le reste du
  // document reste identique quel que soit le choix, pour limiter la
  // surface de risque visuel tant que les 10 templates ne sont pas
  // validés. "line" reproduit exactement le traitement historique.
  const headerDecoration =
    decoration === "block"
      ? {
          backgroundColor: colors.bgAccent,
          borderRadius: 6,
          padding: 12,
          marginBottom: s(14)
        }
      : decoration === "bracket"
        ? {
            borderLeftWidth: 4,
            borderLeftColor: colors.primary,
            borderLeftStyle: "solid",
            paddingLeft: 12,
            paddingBottom: s(8),
            marginBottom: s(14)
          }
        : {
            borderBottomWidth: 2,
            borderBottomColor: colors.text,
            borderBottomStyle: "solid",
            paddingBottom: s(8),
            marginBottom: s(14)
          };

  return StyleSheet.create({
    page: {
      padding: 40,
      fontFamily: fonts.bodyFamily,
      fontSize: f(9.5),
      color: colors.text2
    },
    // headerBanner : bande pleine largeur BORD À BORD — marges négatives
    // égales au padding de page pour "sortir" du cadre de 40pt et couvrir
    // toute la largeur A4, contrairement à decoration="block" qui reste
    // un aplat contenu à l'intérieur du padding. Purement décoratif pour
    // Classic (pas de texte dupliqué avec le bloc `header` juste en
    // dessous, qui garde son propre traitement `decoration`).
    banner: {
      backgroundColor: colors.primary,
      marginTop: -40,
      marginHorizontal: -40,
      marginBottom: s(20),
      height: 16
    },
    // hasPhoto : header passe d'un empilement vertical (nom/accroche/
    // contact) à une ligne [avatar, bloc texte] — headerTextBlock reprend
    // exactement ce qui était directement dans `header` auparavant.
    headerRow: {
      flexDirection: "row",
      alignItems: "center",
      columnGap: s(14)
    },
    headerAvatar: {
      width: 56,
      height: 56,
      borderRadius: 999
    },
    headerTextBlock: {
      flex: 1
    },
    header: headerDecoration,
    name: {
      fontFamily: fonts.accentFamily,
      fontWeight: 700,
      fontSize: f(20),
      color: decoration === "block" ? colors.primaryInk : colors.text,
      letterSpacing: f(0.5)
    },
    headline: {
      fontFamily: fonts.accentFamily,
      fontWeight: 700,
      fontSize: f(9),
      color: colors.primary,
      textTransform: "uppercase",
      marginTop: s(3),
      letterSpacing: f(0.5)
    },
    contactRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      marginTop: s(6),
      fontSize: f(8.5),
      color: colors.text3
    },
    contactItem: {
      marginRight: s(12)
    },
    contactLink: {
      color: colors.primary,
      fontWeight: 700,
      textDecoration: "none",
      fontSize: f(8.5)
    },
    section: {
      marginBottom: s(14)
    },
    sectionTitle: {
      fontFamily: fonts.accentFamily,
      fontWeight: 700,
      fontSize: f(9),
      color: colors.primary,
      textTransform: "uppercase",
      letterSpacing: f(0.8),
      marginBottom: s(6)
    },
    sectionText: {
      fontSize: f(9.5),
      color: colors.text2,
      lineHeight: 1.5
    },
    entry: {
      marginBottom: s(9)
    },
    entryHead: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "baseline"
    },
    entryRole: {
      fontFamily: fonts.accentFamily,
      fontWeight: 700,
      fontSize: f(10),
      color: colors.text
    },
    entryDates: {
      fontSize: f(8.5),
      color: colors.text3
    },
    entryOrg: {
      fontFamily: fonts.accentFamily,
      fontWeight: 700,
      fontSize: f(9),
      color: colors.text2,
      marginTop: s(1)
    },
    entryDesc: {
      fontSize: f(9),
      color: colors.text2,
      lineHeight: 1.45,
      marginTop: s(3)
    },
    entryDescList: {
      marginTop: s(3)
    },
    entryDescListItem: {
      flexDirection: "row",
      marginBottom: s(2)
    },
    entryDescBullet: {
      fontSize: f(9),
      color: colors.primary,
      width: s(10)
    },
    entryDescListText: {
      fontSize: f(9),
      color: colors.text2,
      lineHeight: 1.45,
      flex: 1
    },
    skillsGrid: {
      flexDirection: "column",
      rowGap: s(10)
    },
    chipRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      marginTop: s(2)
    },
    chip: {
      borderWidth: 1,
      borderColor: colors.line,
      borderStyle: "solid",
      borderRadius: 999,
      backgroundColor: colors.surface2,
      color: colors.text2,
      fontSize: f(8.5),
      paddingVertical: s(3),
      paddingHorizontal: s(7),
      marginRight: s(5),
      marginBottom: s(5)
    },
    chipSoft: {
      backgroundColor: colors.bgAccent,
      borderColor: colors.line,
      color: colors.primaryInk
    }
  });
}

// Même heuristique que CvEntryDescription (CvPages.jsx) : un texte sans
// saut de ligne mais avec plusieurs phrases devient une liste à puces,
// sinon un paragraphe simple. react-pdf n'a pas de <ul>/<li> : une puce
// "•" + le texte, dans une View par ligne.
function CvEntryDescriptionPdf({ text, styles }) {
  if (!text) return null;
  const rawLines = text.includes("\n") ? text.split("\n") : text.split(/(?<=[.!?])\s+(?=[A-ZÀ-Ý])/);
  const lines = rawLines.map((line) => line.trim()).filter(Boolean);
  if (lines.length <= 1) {
    return <Text style={styles.entryDesc}>{lines[0] || text}</Text>;
  }
  return (
    <View style={styles.entryDescList}>
      {lines.map((line, index) => (
        <View style={styles.entryDescListItem} key={index}>
          <Text style={styles.entryDescBullet}>•</Text>
          <Text style={styles.entryDescListText}>{line}</Text>
        </View>
      ))}
    </View>
  );
}

// Équivalent de .cv-document-skill-chips : soft=true pour la variante
// .soft (fond bg-accent / texte primary-ink), sinon le style neutre.
function ChipRow({ items, soft, styles }) {
  return (
    <View style={styles.chipRow}>
      {items.map((item, index) => (
        <Text key={`${item}-${index}`} style={soft ? [styles.chip, styles.chipSoft] : styles.chip}>
          {item}
        </Text>
      ))}
    </View>
  );
}

export function CvDocumentClassicPdf({ cvReview, theme, avatarDataUrl, fontScale = 1, spaceScale = 1, onRender }) {
  const styles = makeStyles(fontScale, spaceScale, theme);
  const resolvedTheme = resolveCvTheme(theme);
  const fullName = [cvReview.firstName, cvReview.lastName].filter(Boolean).join(" ");
  const contactItems = [cvReview.email, cvReview.phone, cvReview.location].filter(Boolean);
  const showPhoto = resolvedTheme.hasPhoto && Boolean(avatarDataUrl);

  const headerText = (
    <>
      {fullName ? <Text style={styles.name}>{fullName.toUpperCase()}</Text> : null}
      {cvReview.headline ? <Text style={styles.headline}>{cvReview.headline}</Text> : null}
      {contactItems.length || cvReview.linkedinUrl ? (
        <View style={styles.contactRow}>
          {contactItems.map((item) => (
            <Text key={item} style={styles.contactItem}>
              {item}
            </Text>
          ))}
          {cvReview.linkedinUrl ? (
            <Link src={cvReview.linkedinUrl} style={styles.contactLink}>
              LinkedIn
            </Link>
          ) : null}
        </View>
      ) : null}
    </>
  );

  return (
    <Document onRender={onRender}>
      <Page size="A4" style={styles.page}>
        {/* headerBanner : bande décorative bord à bord, cf. commentaire sur
            le style `banner` — purement visuelle, aucun texte dupliqué
            avec l'en-tête juste en dessous. */}
        {resolvedTheme.headerBanner ? <View style={styles.banner} /> : null}

        <View style={styles.header}>
          {showPhoto ? (
            <View style={styles.headerRow}>
              <Image src={avatarDataUrl} style={styles.headerAvatar} />
              <View style={styles.headerTextBlock}>{headerText}</View>
            </View>
          ) : (
            headerText
          )}
        </View>

        {cvReview.summary ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Résumé professionnel</Text>
            <Text style={styles.sectionText}>{cvReview.summary}</Text>
          </View>
        ) : null}

        {(cvReview.experiences || []).length ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Expérience</Text>
            {cvReview.experiences.slice(0, 6).map((experience, index) => (
              // wrap={false} = équivalent de break-inside: avoid côté
              // impression navigateur : react-pdf ne coupe pas cette
              // entrée entre deux pages.
              <View style={styles.entry} key={`${experience.company}-${index}`} wrap={false}>
                <View style={styles.entryHead}>
                  <Text style={styles.entryRole}>{experience.role}</Text>
                  {experience.dates ? <Text style={styles.entryDates}>{experience.dates}</Text> : null}
                </View>
                {experience.company ? <Text style={styles.entryOrg}>{experience.company}</Text> : null}
                <CvEntryDescriptionPdf text={experience.description} styles={styles} />
              </View>
            ))}
          </View>
        ) : null}

        {(cvReview.educationItems || []).length ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Formation</Text>
            {cvReview.educationItems.slice(0, 4).map((item, index) => (
              <View style={styles.entry} key={`${item.school}-${index}`} wrap={false}>
                <View style={styles.entryHead}>
                  <Text style={styles.entryRole}>{item.school}</Text>
                  {item.dates ? <Text style={styles.entryDates}>{item.dates}</Text> : null}
                </View>
                {item.degree ? <Text style={styles.entryOrg}>{item.degree}</Text> : null}
                <CvEntryDescriptionPdf text={item.description} styles={styles} />
              </View>
            ))}
          </View>
        ) : null}

        {(cvReview.skills || []).length || (cvReview.softSkills || []).length ? (
          <View style={[styles.section, styles.skillsGrid]}>
            {(cvReview.skills || []).length ? (
              <View>
                <Text style={styles.sectionTitle}>Compétences techniques</Text>
                <ChipRow items={cvReview.skills.filter(Boolean)} styles={styles} />
              </View>
            ) : null}
            {(cvReview.softSkills || []).length ? (
              <View>
                <Text style={styles.sectionTitle}>Compétences comportementales</Text>
                <ChipRow items={cvReview.softSkills.filter(Boolean)} soft styles={styles} />
              </View>
            ) : null}
          </View>
        ) : null}

        {(cvReview.languages || []).length || (cvReview.certifications || []).length || (cvReview.interests || []).length ? (
          <View style={[styles.section, styles.skillsGrid]}>
            {(cvReview.languages || []).length ? (
              <View>
                <Text style={styles.sectionTitle}>Langues</Text>
                <ChipRow items={cvReview.languages.filter(Boolean)} styles={styles} />
              </View>
            ) : null}
            {(cvReview.certifications || []).length ? (
              <View>
                <Text style={styles.sectionTitle}>Certifications</Text>
                <ChipRow
                  items={cvReview.certifications
                    .filter((item) => item?.name || item?.issuer)
                    .map((item) => [item.name, item.issuer].filter(Boolean).join(" · "))}
                  styles={styles}
                />
              </View>
            ) : null}
            {(cvReview.interests || []).length ? (
              <View>
                <Text style={styles.sectionTitle}>Centres d'intérêt</Text>
                <ChipRow items={cvReview.interests.filter(Boolean)} soft styles={styles} />
              </View>
            ) : null}
          </View>
        ) : null}
      </Page>
    </Document>
  );
}

// Orchestration Étape 4 pour Classic : mécanisme A uniquement (réduction
// espace puis police, cf. pdfAutoFit.shrinkToOnePage). Pas de troncature
// ni de `fixed` ici — Classic est mono-colonne, donc pas de rectangle vide
// à éviter ; si le contenu déborde encore au plancher, on l'assume
// (overflow: true) plutôt que de couper du contenu silencieusement.
// `theme` optionnel (défaut DEFAULT_CV_THEME) — rétrocompatible avec les
// appels existants qui ne le passent pas.
export async function fitCvDocumentClassicPdfToOnePage(cvReview, theme, avatarDataUrl, options) {
  const result = await shrinkToOnePage(
    (fontScale, spaceScale, onRender) => (
      <CvDocumentClassicPdf
        cvReview={cvReview}
        theme={theme}
        avatarDataUrl={avatarDataUrl}
        fontScale={fontScale}
        spaceScale={spaceScale}
        onRender={onRender}
      />
    ),
    options
  );
  return { ...result, overflow: !result.fits };
}
