// Nouveau template CV react-pdf, dans notre mécanisme existant (theme prop,
// cvTemplateThemes.js, THEME_PRESETS via resolveCvTheme) — pas une variante
// de CvDocumentClassicPdf/SidebarPdf, un composant indépendant comme eux.
//
// Inspiré de traits structurels génériques observés sur un template CV
// LaTeX (en-tête 3 colonnes symétriques avec photo optionnelle, nom en 2
// graisses, ligne de contact séparée par des points médians, titre de
// section teinté dans la couleur d'accent sans bordure ni fond, entrées en
// "tableau" 2 lignes avec l'élément principal + une info alignée à droite
// sur la ligne 1, le sous-titre seul sur la ligne 2) — construit entièrement
// à neuf avec nos propres couleurs/polices/données, aucun fichier consulté
// pendant l'écriture de ce composant.
//
// Adaptation à notre schéma cvReview (pas de champ "lieu" par expérience/
// formation, contrairement à l'inspiration d'origine) : la ligne 1 associe
// le poste/l'établissement (gras) aux dates (à droite) plutôt qu'à un lieu ;
// la ligne 2 ne porte que l'entreprise/le diplôme, rien n'est inventé.
//
// decoration/headerBanner/asidePosition : sans effet ici (mono-colonne,
// pas d'aside, et l'identité visuelle du titre de section — couleur
// d'accent + fin trait neutre en dessous, jamais de fond ni de bordure
// épaisse — est justement le point distinctif de ce template, donc non
// paramétrable par `decoration`), comme asidePosition est déjà sans effet
// sur Classic. hasPhoto est en revanche pleinement supporté, au cœur de la
// mise en page de l'en-tête.
import React from "react";
import { Document, Page, View, Text, Link, Image, StyleSheet } from "@react-pdf/renderer";
import "./fonts.js";
import { shrinkToOnePage } from "./pdfAutoFit.js";
import { CV_NEUTRAL_COLORS, resolveCvTheme } from "./cvTemplateThemes.js";

const HEADER_SIDE_WIDTH = 64;

function makeStyles(fontScale = 1, spaceScale = 1, theme) {
  const f = (value) => value * fontScale;
  const s = (value) => value * spaceScale;
  const resolved = resolveCvTheme(theme);
  const colors = { ...CV_NEUTRAL_COLORS, ...resolved.colors };
  const fonts = resolved.fonts;

  return StyleSheet.create({
    page: {
      padding: 40,
      fontFamily: fonts.bodyFamily,
      fontSize: f(9.5),
      color: colors.text2
    },
    // En-tête 3 colonnes symétriques : la colonne de droite reste vide
    // (même largeur que la photo à gauche) pour que le bloc central reste
    // visuellement centré sur la page, photo présente ou non.
    headerRow: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: s(18)
    },
    headerSide: {
      width: HEADER_SIDE_WIDTH,
      alignItems: "center"
    },
    headerAvatar: {
      width: 56,
      height: 56,
      borderRadius: 999
    },
    headerCenter: {
      flex: 1,
      alignItems: "center"
    },
    nameRow: {
      flexDirection: "row",
      columnGap: s(5)
    },
    nameFirst: {
      fontFamily: fonts.bodyFamily,
      fontWeight: 300,
      fontSize: f(19),
      color: colors.text
    },
    nameLast: {
      fontFamily: fonts.accentFamily,
      fontWeight: 700,
      fontSize: f(19),
      color: colors.primary
    },
    headline: {
      fontFamily: fonts.bodyFamily,
      fontWeight: 700,
      fontSize: f(8.5),
      color: colors.primary,
      textTransform: "uppercase",
      letterSpacing: f(0.8),
      marginTop: s(4)
    },
    contactLine: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "center",
      marginTop: s(6),
      fontSize: f(8),
      color: colors.text3
    },
    contactItem: {
      marginHorizontal: s(4)
    },
    contactLink: {
      color: colors.text3,
      textDecoration: "none",
      fontSize: f(8)
    },
    section: {
      marginBottom: s(13)
    },
    // Titre de section teinté dans la couleur d'accent (jamais de fond,
    // contrairement à Classic/Sidebar qui utilisent un aplat ou une bordure
    // épaisse selon `decoration`), avec un fin trait NEUTRE (colors.line,
    // pas la couleur d'accent) en dessous pour séparer les grandes parties
    // du CV.
    sectionTitle: {
      fontFamily: fonts.accentFamily,
      fontWeight: 700,
      fontSize: f(11),
      color: colors.primary,
      paddingBottom: s(4),
      marginBottom: s(7),
      borderBottomWidth: 1,
      borderBottomColor: colors.line,
      borderBottomStyle: "solid"
    },
    sectionText: {
      fontSize: f(9.5),
      color: colors.text2,
      lineHeight: 1.5,
      textAlign: "justify"
    },
    entry: {
      marginBottom: s(9)
    },
    entryHead: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "baseline"
    },
    entryTitle: {
      fontFamily: fonts.accentFamily,
      fontWeight: 700,
      fontSize: f(10),
      color: colors.text
    },
    entryDates: {
      fontFamily: fonts.bodyFamily,
      fontSize: f(8.5),
      color: colors.text3
    },
    entrySubtitle: {
      fontFamily: fonts.bodyFamily,
      fontSize: f(9),
      color: colors.text3,
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
    skillRow: {
      flexDirection: "row",
      alignItems: "flex-start"
    },
    skillLabel: {
      fontFamily: fonts.accentFamily,
      fontWeight: 700,
      fontSize: f(9),
      color: colors.text,
      width: 110
    },
    skillValue: {
      flex: 1,
      fontSize: f(9),
      color: colors.text2,
      lineHeight: 1.5
    }
  });
}

// Même heuristique que CvEntryDescriptionPdf (CvDocumentClassicPdf) : un
// texte à phrases multiples devient une liste à puces, sinon un
// paragraphe simple. Nos données stockent la description en un seul
// champ texte, jamais une liste structurée.
function EntryDescription({ text, styles }) {
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

// Une ligne "libellé : valeur" par catégorie — pas de puces/chips ici,
// volontairement plus sobre que Classic/Sidebar.
function SkillRow({ label, value, styles }) {
  if (!value) return null;
  return (
    <View style={styles.skillRow}>
      <Text style={styles.skillLabel}>{label}</Text>
      <Text style={styles.skillValue}>{value}</Text>
    </View>
  );
}

export function CvDocumentLinearPdf({ cvReview, theme, avatarDataUrl, fontScale = 1, spaceScale = 1, onRender }) {
  const styles = makeStyles(fontScale, spaceScale, theme);
  const resolvedTheme = resolveCvTheme(theme);
  const showPhoto = resolvedTheme.hasPhoto && Boolean(avatarDataUrl);
  const contactItems = [cvReview.email, cvReview.phone, cvReview.location].filter(Boolean);

  return (
    <Document onRender={onRender}>
      <Page size="A4" style={styles.page}>
        <View style={styles.headerRow}>
          <View style={styles.headerSide}>
            {showPhoto ? <Image src={avatarDataUrl} style={styles.headerAvatar} /> : null}
          </View>
          <View style={styles.headerCenter}>
            <View style={styles.nameRow}>
              {cvReview.firstName ? <Text style={styles.nameFirst}>{cvReview.firstName}</Text> : null}
              {cvReview.lastName ? <Text style={styles.nameLast}>{cvReview.lastName}</Text> : null}
            </View>
            {cvReview.headline ? <Text style={styles.headline}>{cvReview.headline}</Text> : null}
            {contactItems.length || cvReview.linkedinUrl ? (
              <View style={styles.contactLine}>
                {contactItems.map((item, index) => (
                  <Text key={item} style={styles.contactItem}>
                    {index > 0 ? "· " : ""}
                    {item}
                  </Text>
                ))}
                {cvReview.linkedinUrl ? (
                  <Link src={cvReview.linkedinUrl} style={[styles.contactItem, styles.contactLink]}>
                    {contactItems.length ? "· LinkedIn" : "LinkedIn"}
                  </Link>
                ) : null}
              </View>
            ) : null}
          </View>
          <View style={styles.headerSide} />
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
              <View style={styles.entry} key={`${experience.company}-${index}`} wrap={false}>
                <View style={styles.entryHead}>
                  <Text style={styles.entryTitle}>{experience.role}</Text>
                  {experience.dates ? <Text style={styles.entryDates}>{experience.dates}</Text> : null}
                </View>
                {experience.company ? <Text style={styles.entrySubtitle}>{experience.company}</Text> : null}
                <EntryDescription text={experience.description} styles={styles} />
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
                  <Text style={styles.entryTitle}>{item.school}</Text>
                  {item.dates ? <Text style={styles.entryDates}>{item.dates}</Text> : null}
                </View>
                {item.degree ? <Text style={styles.entrySubtitle}>{item.degree}</Text> : null}
                <EntryDescription text={item.description} styles={styles} />
              </View>
            ))}
          </View>
        ) : null}

        {(cvReview.skills || []).length ||
        (cvReview.softSkills || []).length ||
        (cvReview.languages || []).length ? (
          <View style={[styles.section, styles.skillsGrid]}>
            <Text style={styles.sectionTitle}>Compétences</Text>
            <SkillRow label="Technique" value={(cvReview.skills || []).join(", ")} styles={styles} />
            <SkillRow label="Savoir-être" value={(cvReview.softSkills || []).join(", ")} styles={styles} />
            <SkillRow label="Langues" value={(cvReview.languages || []).join(", ")} styles={styles} />
          </View>
        ) : null}

        {(cvReview.certifications || []).length ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Certifications</Text>
            {cvReview.certifications
              .filter((item) => item?.name || item?.issuer)
              .map((item, index) => (
                <View style={styles.entry} key={`${item.name}-${index}`} wrap={false}>
                  <Text style={styles.entryTitle}>{item.name}</Text>
                  {item.issuer ? <Text style={styles.entrySubtitle}>{item.issuer}</Text> : null}
                </View>
              ))}
          </View>
        ) : null}

        {(cvReview.interests || []).length ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Centres d'intérêt</Text>
            <Text style={styles.sectionText}>{cvReview.interests.join(", ")}</Text>
          </View>
        ) : null}
      </Page>
    </Document>
  );
}

// Même orchestration que Classic (Étape 4) : réduction police/espacement
// via shrinkToOnePage, pas de troncature ni de filet `fixed` (mono-colonne,
// rien à dupliquer). `theme`/`avatarDataUrl` optionnels.
export async function fitCvDocumentLinearPdfToOnePage(cvReview, theme, avatarDataUrl, options) {
  const result = await shrinkToOnePage(
    (fontScale, spaceScale, onRender) => (
      <CvDocumentLinearPdf
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
