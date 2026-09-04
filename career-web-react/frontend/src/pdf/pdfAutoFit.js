// Moteur générique de "garantie 1 page A4" pour les templates PDF
// (CvDocumentClassicPdf, CvDocumentSidebarPdf) — Étape 4. Isolé, pas
// branché à l'app pour l'instant.
//
// Principe de mesure : react-pdf calcule une passe de layout Yoga
// complète (avec les vraies métriques de la police embarquée, via
// fontkit) AVANT d'écrire le PDF final — contrairement à
// window.print()/scrollHeight, où le DOM mesuré à l'écran pouvait
// diverger de ce que le moteur d'impression produisait réellement (la
// source du bug de pagination du chantier CSS). Ici il n'y a qu'un seul
// moteur, donc pas de désynchronisation possible entre "ce qu'on mesure"
// et "ce qui sort".
//
// Cette mesure est exposée via la prop `onRender` de <Document> : son
// paramètre `_INTERNAL__LAYOUT__DATA_` est le document déjà mis en page,
// et `.children` la liste des pages réellement calculées — vérifié
// empiriquement (sonde jetable, hors repo) : `.children.length` est le
// nombre exact de pages produites. Le préfixe `_INTERNAL__` indique que
// ce nom de champ n'est pas un contrat d'API stable ; si une mise à jour
// de @react-pdf/renderer le casse, il faudra soit épingler la version,
// soit basculer sur une mesure "boîte noire" (compter les pages du PDF
// généré via pdfjs-dist, plus lent mais indépendant de cette structure
// interne).
import { pdf } from "@react-pdf/renderer";

const SPACE_FLOOR = 0.7;
const FONT_FLOOR = 0.9;
export const AUTO_FIT_FLOORS = { spaceFloor: SPACE_FLOOR, fontFloor: FONT_FLOOR };

// Rend un élément une fois (en mémoire, aucune écriture disque) et
// retourne son nombre de pages + le Blob PDF correspondant.
// `makeElement(onRender)` doit construire l'élément <Document onRender=.../>
// à mesurer.
//
// .toBlob() plutôt que .toBuffer() : .toBuffer() renvoie en réalité un
// stream Node (cf. le TODO du package "rename this method to toStream in
// next major release"), utilisable seulement côté Node. .toBlob() est
// disponible aussi bien dans le build Node que dans le build navigateur
// de @react-pdf/renderer (code identique aux deux endroits, vérifié) et
// produit directement un Blob standard — exploitable tel quel pour un
// vrai téléchargement navigateur (URL.createObjectURL), et tout aussi
// utilisable en Node pour les scripts de test (Blob est global depuis
// Node 18).
async function renderAndMeasure(makeElement) {
  let layoutData = null;
  const element = makeElement((info) => {
    layoutData = info._INTERNAL__LAYOUT__DATA_;
  });
  const blob = await pdf(element).toBlob();
  const pageCount = layoutData?.children?.length ?? null;
  return { pageCount, blob };
}

// Recherche dichotomique du plus grand facteur d'échelle dans
// [floor, 1] pour lequel measure(scale) tient sur 1 page. Suppose la
// monotonie (réduire une taille ne peut qu'égaler ou réduire la hauteur
// du contenu, jamais l'augmenter) — vraie ici par construction.
async function bisectScale({ floor, measure, maxIterations }) {
  const atFloor = await measure(floor);
  if (atFloor.pageCount !== 1) {
    // Même le plancher ne suffit pas : on remonte l'échec avec le
    // rendu le plus compact qu'on ait (celui du plancher).
    return { scale: floor, fits: false, result: atFloor };
  }

  let lo = floor;
  let hi = 1;
  let best = { scale: floor, result: atFloor };

  for (let i = 0; i < maxIterations; i += 1) {
    const mid = (lo + hi) / 2;
    // eslint-disable-next-line no-await-in-loop
    const attempt = await measure(mid);
    if (attempt.pageCount === 1) {
      best = { scale: mid, result: attempt };
      lo = mid;
    } else {
      hi = mid;
    }
  }

  return { scale: best.scale, fits: true, result: best.result };
}

// Trouve (fontScale, spaceScale) faisant tenir un contenu FIXE sur 1
// page. `renderAt(fontScale, spaceScale, onRender)` doit retourner
// l'élément React à mesurer pour cette combinaison. Ne tronque rien :
// la troncature (mécanisme C, spécifique à Sidebar) est de la
// responsabilité de l'appelant, cf. fitCvDocumentSidebarPdfToOnePage
// dans CvDocumentSidebarPdf.jsx.
//
// Ordre : espacement seul d'abord (police à 100%), puis, seulement si
// le plancher d'espacement ne suffit toujours pas, police en plus
// (espacement resté à son plancher) — décision validée avec
// l'espacement à 70% minimum et la police à 90% minimum, mêmes seuils
// que le chantier CSS.
export async function shrinkToOnePage(renderAt, { spaceFloor = SPACE_FLOOR, fontFloor = FONT_FLOOR, maxIterations = 6 } = {}) {
  const measureAt = (fontScale, spaceScale) => renderAndMeasure((onRender) => renderAt(fontScale, spaceScale, onRender));

  // Cas courant : le contenu tient déjà sans rien réduire — un seul rendu.
  const full = await measureAt(1, 1);
  if (full.pageCount === 1) {
    return { fontScale: 1, spaceScale: 1, fits: true, pageCount: 1, blob: full.blob };
  }

  // Phase 1 — réduction de l'espacement seul.
  const spacePhase = await bisectScale({
    floor: spaceFloor,
    maxIterations,
    measure: (spaceScale) => measureAt(1, spaceScale)
  });
  if (spacePhase.fits) {
    return {
      fontScale: 1,
      spaceScale: spacePhase.scale,
      fits: true,
      pageCount: spacePhase.result.pageCount,
      blob: spacePhase.result.blob
    };
  }

  // Phase 2 — l'espacement seul ne suffit pas même à son plancher :
  // on ajoute la réduction de police, espacement resté au plancher.
  const fontPhase = await bisectScale({
    floor: fontFloor,
    maxIterations,
    measure: (fontScale) => measureAt(fontScale, spaceFloor)
  });

  return {
    fontScale: fontPhase.scale,
    spaceScale: spaceFloor,
    fits: fontPhase.fits,
    pageCount: fontPhase.result.pageCount,
    blob: fontPhase.result.blob
  };
}
