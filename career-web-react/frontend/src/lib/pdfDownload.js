// Utilitaires de téléchargement PDF partagés entre CvPages.jsx (bouton
// "Télécharger PDF" d'Import CV) et la page CV + Lettre — extraits de
// CvPages.jsx pour ne pas dupliquer le mécanisme de chargement paresseux.

// @react-pdf/renderer + les templates PDF (fonts.js, les .ttf, pdfAutoFit.js)
// pèsent plusieurs Mo une fois bundlés — en import() dynamique plutôt qu'en
// import statique pour que ce poids reste dans un chunk séparé, chargé
// seulement au clic sur "Télécharger", jamais dans le chemin critique du
// chargement initial de l'app.
//
// 3 templates au total : les 2 historiques (classic/sidebar) + Linear
// (notre propre design, branché sur le mécanisme de thème). Les 3
// prototypes indépendants inspirés de templates MIT/Apache (zichy,
// startbootstrap, mnjul) ont été abandonnés (bug Courier bloquant sur
// Mnjul, colonnes déséquilibrées sur Zichy) et retirés. Toutes les
// fonctions fit* ont la même signature (cvReview, theme, avatarDataUrl,
// options), donc handleDownloadPdf n'a pas besoin de logique spécifique
// par template.
const PDF_FITTERS = {
  sidebar: () => import("../pdf/CvDocumentSidebarPdf.jsx").then((mod) => mod.fitCvDocumentSidebarPdfToOnePage),
  linear: () => import("../pdf/CvDocumentLinearPdf.jsx").then((mod) => mod.fitCvDocumentLinearPdfToOnePage),
  classic: () => import("../pdf/CvDocumentClassicPdf.jsx").then((mod) => mod.fitCvDocumentClassicPdfToOnePage),
  // Lettre de motivation (CoverLetterPage.jsx) — même mécanisme de
  // chargement paresseux, signature différente (fitCoverLetterPdfToOnePage
  // prend {subject, letter, template} plutôt que cvReview/avatarDataUrl).
  letter: () => import("../pdf/CoverLetterPdf.jsx").then((mod) => mod.fitCoverLetterPdfToOnePage)
};

export async function loadPdfFitter(templateName) {
  const load = PDF_FITTERS[templateName] || PDF_FITTERS.classic;
  return load();
}

// Nom de fichier suggéré au téléchargement : CV-{nom}-{date}.pdf, sans
// accents ni caractères spéciaux (compatibilité multi-OS).
export function slugifyForFilename(value) {
  const diacritics = new RegExp("[\\u0300-\\u036f]", "g");
  const slug = String(value || "")
    .normalize("NFD")
    .replace(diacritics, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "cv";
}

// Déclenche un vrai téléchargement de fichier à partir d'un Blob, sans
// fenêtre d'impression : lien <a download> temporaire, jamais ajouté au
// DOM visible ni gardé après coup.
export function downloadBlob(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
