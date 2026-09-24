// Objet de config "theme" pour les templates CV PDF (CvDocumentClassicPdf,
// CvDocumentSidebarPdf) — un seul objet appliqué au rendu plutôt que des
// fichiers dupliqués par template. Conçu pour rester générique : `colors`/
// `fonts`/`decoration` ne sont pas spécifiques au CV et pourront être
// réutilisés tels quels par la lettre react-pdf (chantier séparé, cf.
// décision de conception) ; seul `layout` est CV-only (sélectionne quel
// composant structurel instancier — la lettre n'a pas cette dichotomie).
//
// colors limité à 3 champs (primary/primaryInk/bgAccent), exactement le
// même triplet que THEME_PRESETS (App.jsx) — le thème couleur déjà utilisé
// partout ailleurs dans l'app. Ça permet de réutiliser directement les 6
// presets existants comme base de templates, sans inventer de nouvelles
// palettes. Le reste des couleurs (texte, lignes, surfaces neutres) est
// volontairement PARTAGÉ par tous les templates, jamais paramétrable —
// comme THEME_PRESETS, qui ne touche jamais le texte/les surfaces non plus.
// Ça limite le risque de combinaisons illisibles (contraste cassé).
export const CV_NEUTRAL_COLORS = {
  text: "#0c0c10",
  text2: "#48464d",
  text3: "#6f6c74",
  line: "#e8e5dd",
  surface: "#ffffff",
  surface2: "#faf8f3",
  surface3: "#f2efe8"
};

// fonts fixe en v1 (cf. décision) : changer de police par template
// demanderait un fichier .ttf + un Font.register + un @font-face CSS par
// police en plus — pas gratuit comme une couleur. Le champ existe pour ne
// pas avoir à changer la forme de l'objet plus tard si on l'active un jour.
export const CV_DEFAULT_FONTS = {
  accentFamily: "Cabinet Grotesk",
  bodyFamily: "Instrument Sans"
};

// decoration : enum fermé et curaté (pas un sac de styles libres) — 3
// traitements décoratifs, chacun implémenté indépendamment dans
// CvDocumentClassicPdf/SidebarPdf (mêmes 3 noms, effet différent selon la
// structure du template puisque leurs éléments décoratifs ne sont pas les
// mêmes) :
//   "line"    — traitement actuel (trait fin neutre) : c'est le
//               comportement par défaut historique, inchangé.
//   "block"   — aplat de couleur (bg-accent) derrière l'en-tête/aside.
//   "bracket" — bordure épaisse colorée façon onglet/séparateur fort.
export const CV_DECORATIONS = ["line", "block", "bracket"];

// 3 réglages supplémentaires, au même niveau que layout/colors/decoration
// (booléens/enum scalaires, donc pas de fusion imbriquée nécessaire dans
// resolveCvTheme — le spread {...DEFAULT_CV_THEME, ...theme} suffit) :
//   hasPhoto      — insère avatarDataUrl (déjà transmis en prop depuis le
//                   profil) dans l'en-tête via <Image>. Sidebar avait déjà
//                   l'emplacement (avatarWrap) mais n'affichait jamais que
//                   les initiales ; Classic n'avait aucun emplacement photo
//                   avant ce chantier.
//   headerBanner  — bandeau plein largeur (bord à bord, hors du padding de
//                   page) au-dessus du contenu. Pensé surtout pour
//                   layout=sidebar (aside/main démarrent aujourd'hui
//                   chacun en haut de page, sans en-tête commun) ; sur
//                   Classic, traitement décoratif plus simple (bande de
//                   couleur, pas de contenu dupliqué avec l'en-tête déjà
//                   présent juste en dessous).
//   asidePosition — "left" (défaut, comportement actuel) | "right", pour
//                   layout=sidebar uniquement ; ignoré par Classic.
export const DEFAULT_CV_THEME = {
  id: "corail",
  layout: "classic",
  colors: {
    primary: "#ea580c",
    primaryInk: "#431407",
    bgAccent: "#fff7ed"
  },
  fonts: CV_DEFAULT_FONTS,
  decoration: "line",
  hasPhoto: false,
  headerBanner: false,
  asidePosition: "left"
};

// Fusionne un theme (partiel ou complet) avec les valeurs par défaut —
// utilisé par les 2 templates pour ne jamais avoir à gérer un theme
// undefined ou incomplet.
export function resolveCvTheme(theme) {
  return {
    ...DEFAULT_CV_THEME,
    ...theme,
    colors: { ...DEFAULT_CV_THEME.colors, ...theme?.colors },
    fonts: { ...DEFAULT_CV_THEME.fonts, ...theme?.fonts }
  };
}

// 10 presets nommés pour la future galerie de choix de template (pas encore
// câblée à l'app — cf. décision : juste les configs + PDF de test pour
// l'instant). `id` est un slug de template (convention courante dans les
// outils de CV : nommer chaque template par un nom de personne plutôt qu'un
// numéro) — à ne pas confondre avec `theme.id`, qui reste l'id de la
// couleur (aligné sur THEME_PRESETS d'App.jsx). Couleurs reprises telles
// quelles de THEME_PRESETS, aucune palette inventée. Chaque entrée ne code
// que ce qui diffère du défaut ; resolveCvTheme complète le reste
// (fonts, hasPhoto/headerBanner/asidePosition non mentionnés → false/false/left).
export const CV_TEMPLATE_PRESETS = [
  {
    id: "jane-doe",
    label: { fr: "Jane Doe", en: "Jane Doe" },
    theme: {
      id: "corail",
      layout: "classic",
      colors: { primary: "#ea580c", primaryInk: "#431407", bgAccent: "#fff7ed" },
      decoration: "line"
    }
  },
  {
    id: "apurv-mishra",
    label: { fr: "Apurv Mishra", en: "Apurv Mishra" },
    theme: {
      id: "slate",
      layout: "classic",
      colors: { primary: "#334155", primaryInk: "#0f172a", bgAccent: "#f1f5f9" },
      decoration: "line"
    }
  },
  {
    id: "sacha-dubois",
    label: { fr: "Sacha Dubois", en: "Sacha Dubois" },
    theme: {
      id: "blue",
      layout: "sidebar",
      colors: { primary: "#1a0dab", primaryInk: "#120879", bgAccent: "#f0edf8" },
      decoration: "block",
      hasPhoto: true,
      headerBanner: true
    }
  },
  {
    id: "henriette-michel",
    label: { fr: "Henriette Michel", en: "Henriette Michel" },
    theme: {
      id: "rose",
      layout: "sidebar",
      colors: { primary: "#db2777", primaryInk: "#500724", bgAccent: "#fdf2f8" },
      decoration: "block",
      hasPhoto: true
    }
  },
  {
    id: "firstname-lastname",
    label: { fr: "Firstname Lastname", en: "Firstname Lastname" },
    theme: {
      id: "blue",
      layout: "classic",
      colors: { primary: "#1a0dab", primaryInk: "#120879", bgAccent: "#f0edf8" },
      decoration: "line"
    }
  },
  {
    id: "john-doe-data",
    label: { fr: "John Doe Data", en: "John Doe Data" },
    theme: {
      id: "green",
      layout: "sidebar",
      colors: { primary: "#0e9f6e", primaryInk: "#052e2b", bgAccent: "#ecfdf5" },
      decoration: "line"
    }
  },
  {
    id: "nico-krieger",
    label: { fr: "Nico Krieger", en: "Nico Krieger" },
    theme: {
      id: "slate",
      layout: "sidebar",
      colors: { primary: "#334155", primaryInk: "#0f172a", bgAccent: "#f1f5f9" },
      decoration: "block",
      headerBanner: true
    }
  },
  {
    id: "marissa-mayer",
    label: { fr: "Marissa Mayer", en: "Marissa Mayer" },
    theme: {
      id: "violet",
      layout: "sidebar",
      colors: { primary: "#7c3aed", primaryInk: "#2e1065", bgAccent: "#f3e8ff" },
      decoration: "block",
      asidePosition: "right"
    }
  },
  {
    id: "editorial-sobre",
    label: { fr: "Éditorial sobre", en: "Sober editorial" },
    theme: {
      id: "violet",
      layout: "classic",
      colors: { primary: "#7c3aed", primaryInk: "#2e1065", bgAccent: "#f3e8ff" },
      decoration: "line"
    }
  },
  {
    id: "bordure-gauche",
    label: { fr: "Bordure gauche", en: "Left border" },
    theme: {
      id: "corail",
      layout: "classic",
      colors: { primary: "#ea580c", primaryInk: "#431407", bgAccent: "#fff7ed" },
      decoration: "bracket"
    }
  }
];
