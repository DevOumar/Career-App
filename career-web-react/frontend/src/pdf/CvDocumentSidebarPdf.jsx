// Reconstruction de CvDocumentSidebar (features/cv/CvPages.jsx) pour
// @react-pdf/renderer — composant isolé, non branché à l'app (pas de
// route, pas de bouton). CvDocumentSidebar original reste inchangé et
// continue de servir l'aperçu écran ; celui-ci ne sert qu'à l'export PDF.
// Même principe que CvDocumentClassicPdf (voir ce fichier) : mêmes
// couleurs figées (preset "orange", thème par défaut de THEME_PRESETS),
// polices déjà enregistrées via fonts.js.
//
// Layout à 2 colonnes : react-pdf n'a pas CSS Grid (grid-template-columns
// dans .cv-document-sidebar), seulement Flexbox (Yoga). Équivalent :
// <View style={{ flexDirection: "row" }}> avec une colonne de largeur fixe
// (aside, ~220px/860px de l'original ≈ 165pt sur une page A4 de 595pt) et
// une colonne flex:1 (main).
//
// Étape 4 — garantie "1 page A4" : trois mécanismes, dans cet ordre
// (décidé avec l'utilisateur) :
//   A. réduction espace puis police (fontScale/spaceScale, comme
//      Classic, mêmes planchers 70%/90%) — mécanisme principal ;
//   C. si le plancher est atteint et que ça déborde encore : troncature
//      progressive des entrées les plus anciennes (expérience puis
//      formation), avec un repère "+ N autres" ;
//   fixed — en tout dernier filet de sécurité : si même la troncature
//      minimale ne suffit pas, la colonne aside est marquée `fixed`
//      (primitive react-pdf native, cf. @react-pdf/layout — un nœud
//      `fixed` est reproduit tel quel sur chaque page générée) pour que
//      la 2e page affiche l'aside correctement plutôt que le rectangle
//      vide observé sans protection. On accepte alors un dépassement à
//      2 pages (overflow: true) plutôt que de couper indéfiniment.
// Jamais de repli silencieux vers CvDocumentClassicPdf (écarté).
import React from "react";
import { Document, Page, View, Text, Link, Svg, Path, StyleSheet } from "@react-pdf/renderer";
import "./fonts.js";
import { shrinkToOnePage } from "./pdfAutoFit.js";

const COLORS = {
  primary: "#ea580c",
  primaryInk: "#431407",
  text: "#0c0c10",
  text2: "#48464d",
  text3: "#6f6c74",
  line: "#e8e5dd",
  surface: "#ffffff",
  surface2: "#faf8f3",
  surface3: "#f2efe8",
  bgAccent: "#fff7ed"
};

// Tracés SVG repris tels quels de components/UiIcon.jsx (viewBox 0 0 20 20)
// pour garder les mêmes icônes mail/téléphone/lieu que l'aperçu écran.
const ICON_PATHS = {
  mail: "M4.25 5A1.75 1.75 0 002.5 6.75v6.5c0 .966.784 1.75 1.75 1.75h11.5A1.75 1.75 0 0017.5 13.25v-6.5A1.75 1.75 0 0015.75 5H4.25zm.29 1.5h10.92L10 10.94 4.54 6.5zM4 8.1l5.53 4.47a.75.75 0 00.94 0L16 8.1v5.15a.25.25 0 01-.25.25H4.25a.25.25 0 01-.25-.25V8.1z",
  phone:
    "M5.1 2.6c.5-.13 1.03.1 1.27.58l1.1 2.2c.22.44.13.97-.22 1.32L6 8a8.6 8.6 0 004 4l1.3-1.25a1.1 1.1 0 011.32-.22l2.2 1.1c.48.24.71.77.58 1.27l-.42 1.65a1.6 1.6 0 01-1.75 1.2A12.8 12.8 0 013 4.77a1.6 1.6 0 011.2-1.75l1.65-.42z",
  pin: "M10 2.5c-3.04 0-5.5 2.4-5.5 5.42 0 3.9 4.55 8.8 5.03 9.3a.65.65 0 00.94 0c.48-.5 5.03-5.4 5.03-9.3 0-3.02-2.46-5.42-5.5-5.42zm0 7.5a2 2 0 110-4 2 2 0 010 4z"
};

// Même principe que CvDocumentClassicPdf/makeStyles : les tailles de
// texte suivent fontScale, les espacements internes suivent spaceScale.
// Les paddings extérieurs des 2 colonnes (aside/main) restent fixes,
// comme le padding de Page côté Classic — ce sont des marges de mise en
// page, pas du contenu à densifier. La largeur de l'aside et la taille
// de l'avatar restent fixes aussi (dimensions structurelles).
function makeStyles(fontScale = 1, spaceScale = 1) {
  const f = (value) => value * fontScale;
  const s = (value) => value * spaceScale;

  return StyleSheet.create({
    page: {
      flexDirection: "row",
      fontFamily: "Instrument Sans",
      fontSize: f(9.5),
      color: COLORS.text2
    },

    // --- Colonne latérale (aside) ---
    aside: {
      width: 165,
      backgroundColor: COLORS.surface2,
      borderRightWidth: 1,
      borderRightColor: COLORS.line,
      borderRightStyle: "solid",
      paddingVertical: 26,
      paddingHorizontal: 18,
      flexDirection: "column",
      rowGap: s(16)
    },
    avatarWrap: {
      width: 70,
      height: 70,
      borderRadius: 999,
      backgroundColor: COLORS.surface3,
      borderWidth: 3,
      borderColor: COLORS.surface,
      borderStyle: "solid",
      alignSelf: "center",
      alignItems: "center",
      justifyContent: "center"
    },
    avatarInitials: {
      fontFamily: "Cabinet Grotesk",
      fontWeight: 700,
      fontSize: f(16),
      color: COLORS.primary
    },
    asideBlock: {
      flexDirection: "column",
      rowGap: s(6)
    },
    asideBlockTitle: {
      fontFamily: "Cabinet Grotesk",
      fontWeight: 700,
      fontSize: f(8),
      color: COLORS.primary,
      textTransform: "uppercase",
      letterSpacing: f(0.6)
    },
    contactRow: {
      flexDirection: "row",
      alignItems: "center",
      columnGap: s(6)
    },
    contactRowText: {
      fontSize: f(8),
      color: COLORS.text2,
      flex: 1
    },
    asideList: {
      flexDirection: "column",
      rowGap: s(4)
    },
    asideListItem: {
      flexDirection: "row",
      columnGap: s(4)
    },
    asideListBullet: {
      fontSize: f(8),
      color: COLORS.primary,
      width: s(7)
    },
    asideListText: {
      fontSize: f(8),
      color: COLORS.text2,
      lineHeight: 1.4,
      flex: 1
    },
    asideLink: {
      fontSize: f(7.5),
      color: COLORS.primary,
      textDecoration: "none"
    },
    chipRow: {
      flexDirection: "row",
      flexWrap: "wrap"
    },
    chip: {
      borderWidth: 1,
      borderColor: COLORS.line,
      borderStyle: "solid",
      borderRadius: 999,
      backgroundColor: COLORS.surface,
      color: COLORS.text2,
      fontSize: f(7.5),
      paddingVertical: s(2.5),
      paddingHorizontal: s(6),
      marginRight: s(4),
      marginBottom: s(4)
    },
    chipSoft: {
      backgroundColor: COLORS.bgAccent,
      borderColor: COLORS.line,
      color: COLORS.primaryInk
    },

    // --- Colonne principale (main) ---
    main: {
      flex: 1,
      paddingVertical: 28,
      paddingHorizontal: 26
    },
    headerName: {
      fontFamily: "Cabinet Grotesk",
      fontWeight: 700,
      fontSize: f(17),
      color: COLORS.text
    },
    headerHeadline: {
      fontFamily: "Cabinet Grotesk",
      fontWeight: 700,
      fontSize: f(9),
      color: COLORS.primary,
      textTransform: "uppercase",
      marginTop: s(4),
      letterSpacing: f(0.5)
    },
    summaryBox: {
      marginTop: s(14),
      marginBottom: s(16),
      padding: s(10),
      backgroundColor: COLORS.surface2,
      borderWidth: 1,
      borderColor: COLORS.line,
      borderStyle: "solid",
      borderRadius: 6
    },
    summaryTitle: {
      fontFamily: "Cabinet Grotesk",
      fontWeight: 700,
      fontSize: f(8),
      color: COLORS.primary,
      textTransform: "uppercase",
      letterSpacing: f(0.6),
      marginBottom: s(4)
    },
    summaryText: {
      fontSize: f(9),
      color: COLORS.text2,
      lineHeight: 1.5
    },
    section: {
      marginBottom: s(14)
    },
    sectionTitle: {
      fontFamily: "Cabinet Grotesk",
      fontWeight: 700,
      fontSize: f(9),
      color: COLORS.primary,
      textTransform: "uppercase",
      letterSpacing: f(0.6),
      marginBottom: s(6)
    },
    skillsGrid: {
      flexDirection: "column",
      rowGap: s(10)
    },

    // Timeline (expérience/formation) : trait vertical + puce, équivalent de
    // .cv-sidebar-timeline / ::before en CSS.
    timeline: {
      borderLeftWidth: 2,
      borderLeftColor: COLORS.line,
      borderLeftStyle: "solid",
      paddingLeft: s(12)
    },
    timelineEntry: {
      marginBottom: s(10),
      position: "relative"
    },
    timelineDot: {
      position: "absolute",
      left: -s(17),
      top: s(3),
      width: 6,
      height: 6,
      borderRadius: 999,
      backgroundColor: COLORS.primary
    },
    entryHead: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "baseline"
    },
    entryTitle: {
      fontFamily: "Cabinet Grotesk",
      fontWeight: 700,
      fontSize: f(9.5),
      color: COLORS.text
    },
    entryDates: {
      fontSize: f(8),
      color: COLORS.text3
    },
    entryOrg: {
      fontSize: f(8.5),
      fontWeight: 700,
      color: COLORS.text2,
      marginTop: s(1)
    },
    entryDesc: {
      fontSize: f(8.5),
      color: COLORS.text2,
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
      fontSize: f(8.5),
      color: COLORS.primary,
      width: s(10)
    },
    entryDescListText: {
      fontSize: f(8.5),
      color: COLORS.text2,
      lineHeight: 1.45,
      flex: 1
    },
    truncatedNote: {
      // Pas de fontStyle:"italic" : aucune face italique n'est enregistrée
      // pour Instrument Sans (fonts.js) et react-pdf ne synthétise pas
      // l'italique comme un navigateur — même contrainte que le gras
      // rencontrée à l'Étape 2. Le ton atténué (text3) + la taille réduite
      // suffisent à signaler "secondaire".
      fontSize: f(7.5),
      color: COLORS.text3,
      marginTop: s(2)
    }
  });
}

// Même heuristique que CvEntryDescription (CvPages.jsx) / CvEntryDescriptionPdf
// (CvDocumentClassicPdf.jsx) : texte sans saut de ligne mais multi-phrases
// devient une liste à puces.
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

function ContactIcon({ name }) {
  return (
    <Svg width={9} height={9} viewBox="0 0 20 20">
      <Path d={ICON_PATHS[name]} fill={COLORS.primary} />
    </Svg>
  );
}

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

function AsideList({ items, styles }) {
  return (
    <View style={styles.asideList}>
      {items.map((item, index) => (
        <View style={styles.asideListItem} key={index}>
          <Text style={styles.asideListBullet}>•</Text>
          <Text style={styles.asideListText}>{item}</Text>
        </View>
      ))}
    </View>
  );
}

// Équivalent de CvSidebarInitials (CvPages.jsx) : pas de photo dans les
// données de test -> initiales.
function initialsOf(firstName, lastName) {
  const initials = [firstName, lastName]
    .map((part) => (part || "").trim().charAt(0))
    .filter(Boolean)
    .join("")
    .toUpperCase();
  return initials || "?";
}

export function CvDocumentSidebarPdf({
  cvReview,
  fontScale = 1,
  spaceScale = 1,
  maxExperiences = null,
  maxEducation = null,
  asideFixed = false,
  onRender
}) {
  const styles = makeStyles(fontScale, spaceScale);
  const fullName = [cvReview.firstName, cvReview.lastName].filter(Boolean).join(" ");
  const socialLinks = [cvReview.linkedinUrl ? { label: "LinkedIn", url: cvReview.linkedinUrl } : null].filter(Boolean);
  const certifications = (cvReview.certifications || []).filter((item) => item?.name || item?.issuer);

  // Plafond d'affichage déjà existant (slice(0,6)/slice(0,4), repris de
  // l'original), puis troncature Étape 4 (mécanisme C) au-dessus de ce
  // plafond via maxExperiences/maxEducation — "+ N autres" indique ce qui
  // a été masqué. Les plus anciennes sont en fin de liste (ordre
  // antéchronologique du CV), donc slice(0, n) tronque bien les plus
  // anciennes en premier à mesure que n diminue.
  const cappedExperiences = (cvReview.experiences || []).slice(0, 6);
  const shownExperiences =
    typeof maxExperiences === "number" ? cappedExperiences.slice(0, maxExperiences) : cappedExperiences;
  const hiddenExperiences = cappedExperiences.length - shownExperiences.length;

  const cappedEducation = (cvReview.educationItems || []).slice(0, 4);
  const shownEducation = typeof maxEducation === "number" ? cappedEducation.slice(0, maxEducation) : cappedEducation;
  const hiddenEducation = cappedEducation.length - shownEducation.length;

  return (
    <Document onRender={onRender}>
      <Page size="A4" style={styles.page}>
        {/* --- Colonne latérale --- */}
        {/* fixed (filet de sécurité Étape 4) : si le contenu principal
            déborde encore malgré la réduction et la troncature, cette
            colonne est reproduite telle quelle sur chaque page générée
            (primitive react-pdf native) au lieu du rectangle vide
            observé sans protection. */}
        <View style={styles.aside} fixed={asideFixed}>
          <View style={styles.avatarWrap}>
            <Text style={styles.avatarInitials}>{initialsOf(cvReview.firstName, cvReview.lastName)}</Text>
          </View>

          {cvReview.email || cvReview.phone || cvReview.location ? (
            <View style={styles.asideBlock}>
              {cvReview.email ? (
                <View style={styles.contactRow}>
                  <ContactIcon name="mail" />
                  <Text style={styles.contactRowText}>{cvReview.email}</Text>
                </View>
              ) : null}
              {cvReview.phone ? (
                <View style={styles.contactRow}>
                  <ContactIcon name="phone" />
                  <Text style={styles.contactRowText}>{cvReview.phone}</Text>
                </View>
              ) : null}
              {cvReview.location ? (
                <View style={styles.contactRow}>
                  <ContactIcon name="pin" />
                  <Text style={styles.contactRowText}>{cvReview.location}</Text>
                </View>
              ) : null}
            </View>
          ) : null}

          {certifications.length ? (
            <View style={styles.asideBlock}>
              <Text style={styles.asideBlockTitle}>Certifications</Text>
              <AsideList
                items={certifications.map((item) => [item.name, item.issuer].filter(Boolean).join(" · "))}
                styles={styles}
              />
            </View>
          ) : null}

          {(cvReview.languages || []).length ? (
            <View style={styles.asideBlock}>
              <Text style={styles.asideBlockTitle}>Langues</Text>
              <ChipRow items={cvReview.languages.filter(Boolean)} styles={styles} />
            </View>
          ) : null}

          {socialLinks.length ? (
            <View style={styles.asideBlock}>
              <Text style={styles.asideBlockTitle}>Réseaux</Text>
              <View style={styles.asideList}>
                {socialLinks.map((item) => (
                  <Link key={item.label} src={item.url} style={styles.asideLink}>
                    {item.url}
                  </Link>
                ))}
              </View>
            </View>
          ) : null}

          {(cvReview.interests || []).length ? (
            <View style={styles.asideBlock}>
              <Text style={styles.asideBlockTitle}>Centres d'intérêt</Text>
              <AsideList items={cvReview.interests.filter(Boolean)} styles={styles} />
            </View>
          ) : null}
        </View>

        {/* --- Colonne principale --- */}
        <View style={styles.main}>
          {fullName ? <Text style={styles.headerName}>{fullName}</Text> : null}
          {cvReview.headline ? <Text style={styles.headerHeadline}>{cvReview.headline}</Text> : null}

          {cvReview.summary ? (
            <View style={styles.summaryBox}>
              <Text style={styles.summaryTitle}>Résumé professionnel</Text>
              <Text style={styles.summaryText}>{cvReview.summary}</Text>
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

          {shownExperiences.length ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Expérience</Text>
              <View style={styles.timeline}>
                {shownExperiences.map((experience, index) => (
                  <View style={styles.timelineEntry} key={`${experience.company}-${index}`} wrap={false}>
                    <View style={styles.timelineDot} />
                    <View style={styles.entryHead}>
                      <Text style={styles.entryTitle}>{[experience.role, experience.company].filter(Boolean).join(" | ")}</Text>
                      {experience.dates ? <Text style={styles.entryDates}>{experience.dates}</Text> : null}
                    </View>
                    {experience.location ? <Text style={styles.entryOrg}>{experience.location}</Text> : null}
                    <CvEntryDescriptionPdf text={experience.description} styles={styles} />
                  </View>
                ))}
                {hiddenExperiences > 0 ? (
                  <Text style={styles.truncatedNote}>
                    + {hiddenExperiences} expérience{hiddenExperiences > 1 ? "s" : ""} antérieure
                    {hiddenExperiences > 1 ? "s" : ""}
                  </Text>
                ) : null}
              </View>
            </View>
          ) : null}

          {shownEducation.length ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Formation</Text>
              <View style={styles.timeline}>
                {shownEducation.map((item, index) => (
                  <View style={styles.timelineEntry} key={`${item.school}-${index}`} wrap={false}>
                    <View style={styles.timelineDot} />
                    <View style={styles.entryHead}>
                      <Text style={styles.entryTitle}>{item.school}</Text>
                      {item.dates ? <Text style={styles.entryDates}>{item.dates}</Text> : null}
                    </View>
                    {item.degree ? <Text style={styles.entryOrg}>{item.degree}</Text> : null}
                    <CvEntryDescriptionPdf text={item.description} styles={styles} />
                  </View>
                ))}
                {hiddenEducation > 0 ? (
                  <Text style={styles.truncatedNote}>
                    + {hiddenEducation} formation{hiddenEducation > 1 ? "s" : ""} antérieure
                    {hiddenEducation > 1 ? "s" : ""}
                  </Text>
                ) : null}
              </View>
            </View>
          ) : null}
        </View>
      </Page>
    </Document>
  );
}

// Nombre minimum d'entrées qu'on garde toujours affichées avant
// d'abandonner la troncature et de passer au filet `fixed` — en dessous,
// tronquer davantage n'aurait plus de sens (on afficherait un CV vide).
const MIN_KEPT_ENTRIES = 1;

// Orchestration Étape 4 pour Sidebar : mécanisme A (réduction), puis si
// le plancher ne suffit pas, mécanisme C (troncature progressive,
// expérience d'abord puis formation, les plus anciennes en premier),
// puis en tout dernier recours `fixed` sur l'aside. Après chaque
// troncature, on retente la réduction en repartant de 100% : moins de
// contenu peut parfois tenir sans rien réduire.
export async function fitCvDocumentSidebarPdfToOnePage(cvReview, options) {
  const totalExperiences = (cvReview.experiences || []).slice(0, 6).length;
  const totalEducation = (cvReview.educationItems || []).slice(0, 4).length;

  let maxExperiences = totalExperiences;
  let maxEducation = totalEducation;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    // eslint-disable-next-line no-await-in-loop
    const attempt = await shrinkToOnePage(
      (fontScale, spaceScale, onRender) => (
        <CvDocumentSidebarPdf
          cvReview={cvReview}
          fontScale={fontScale}
          spaceScale={spaceScale}
          maxExperiences={maxExperiences}
          maxEducation={maxEducation}
          onRender={onRender}
        />
      ),
      options
    );

    if (attempt.fits) {
      return {
        ...attempt,
        maxExperiences,
        maxEducation,
        truncated: maxExperiences < totalExperiences || maxEducation < totalEducation,
        asideFixed: false,
        overflow: false
      };
    }

    if (maxExperiences > MIN_KEPT_ENTRIES) {
      maxExperiences -= 1;
      // eslint-disable-next-line no-continue
      continue;
    }
    if (maxEducation > MIN_KEPT_ENTRIES) {
      maxEducation -= 1;
      // eslint-disable-next-line no-continue
      continue;
    }

    // Plancher de réduction ET de troncature atteints, toujours >1 page :
    // dernier filet — aside fixed pour qu'elle se reproduise correctement
    // sur la page suivante, overflow assumé plutôt que masqué.
    // eslint-disable-next-line no-await-in-loop
    const finalAttempt = await shrinkToOnePage(
      (fontScale, spaceScale, onRender) => (
        <CvDocumentSidebarPdf
          cvReview={cvReview}
          fontScale={fontScale}
          spaceScale={spaceScale}
          maxExperiences={maxExperiences}
          maxEducation={maxEducation}
          asideFixed
          onRender={onRender}
        />
      ),
      options
    );

    return {
      ...finalAttempt,
      maxExperiences,
      maxEducation,
      truncated: true,
      asideFixed: true,
      overflow: true
    };
  }
}
