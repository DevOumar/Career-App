// Utilitaires de téléchargement PDF partagés entre CvPages.jsx (bouton
// "Télécharger PDF" d'Import CV) et la page CV + Lettre — extraits de
// CvPages.jsx pour ne pas dupliquer le mécanisme de chargement paresseux.

// @react-pdf/renderer + les templates PDF (fonts.js, les .ttf, pdfAutoFit.js)
// pèsent plusieurs Mo une fois bundlés — en import() dynamique plutôt qu'en
// import statique pour que ce poids reste dans un chunk séparé, chargé
// seulement au clic sur "Télécharger", jamais dans le chemin critique du
// chargement initial de l'app.
export async function loadPdfFitter(templateName) {
  if (templateName === "sidebar") {
    const mod = await import("../pdf/CvDocumentSidebarPdf.jsx");
    return mod.fitCvDocumentSidebarPdfToOnePage;
  }
  const mod = await import("../pdf/CvDocumentClassicPdf.jsx");
  return mod.fitCvDocumentClassicPdfToOnePage;
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
