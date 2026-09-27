// Utilitaires de téléchargement PDF (lettre de motivation).
//
// @react-pdf/renderer, les polices et le moteur d'auto-fit pèsent plusieurs
// Mo une fois bundlés : import() dynamique pour que ce poids reste dans un
// chunk séparé, chargé seulement au clic sur « Télécharger », jamais au
// chargement initial de l'app.
const PDF_FITTERS = {
  letter: () => import("../pdf/CoverLetterPdf.jsx").then((mod) => mod.fitCoverLetterPdfToOnePage)
};

export async function loadPdfFitter(templateName) {
  const load = PDF_FITTERS[templateName] || PDF_FITTERS.letter;
  return load();
}

// Nom de fichier sans accents ni caractères spéciaux (compatibilité multi-OS).
export function slugifyForFilename(value) {
  const diacritics = new RegExp("[\\u0300-\\u036f]", "g");
  const slug = String(value || "")
    .normalize("NFD")
    .replace(diacritics, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "document";
}

// Vrai téléchargement de fichier à partir d'un Blob, sans fenêtre
// d'impression : lien <a download> temporaire retiré aussitôt.
export function downloadBlob(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
