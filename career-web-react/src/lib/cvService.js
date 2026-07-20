import { EDUCATION_LEVELS, SECTION_HEADERS, SKILL_KEYWORDS, SKILL_SYNONYMS } from "../data/skills";

function cleanTextPayload(value) {
  return String(value || "")
    .replace(/\u0000/g, "")
    .replace(/\r\n/g, "\n")
    .replace(/[\u0001-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, " ")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function normalize(text) {
  return String(text || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Détection par "quasi-limite de mot" : un caractère alphanumérique avant/après le mot-clé
// invalide le match. Corrige les faux positifs comme "r" détecté dans "enginee-r" ou
// "scala" détecté dans "scala-bilité" (substring naïf de l'ancienne implémentation).
function containsSkillKeyword(normalizedText, keyword) {
  const pattern = new RegExp(`(?<![a-z0-9])${escapeRegex(keyword)}(?![a-z0-9])`, "i");
  return pattern.test(normalizedText);
}

function unique(list) {
  return [...new Set(list.filter(Boolean))];
}

// Repère un mot-clé canonique OU l'un de ses synonymes connus (ex. "js" -> "javascript").
// Réduit les faux négatifs quand le CV utilise une formulation différente de celle
// du dictionnaire SKILL_KEYWORDS.
function containsSkillOrSynonym(normalizedText, keyword) {
  if (containsSkillKeyword(normalizedText, keyword)) return true;
  const synonymHit = Object.entries(SKILL_SYNONYMS).some(
    ([synonym, canonical]) => canonical === keyword && containsSkillKeyword(normalizedText, synonym)
  );
  return synonymHit;
}

function extractSkills(text) {
  const normalized = normalize(text);
  return SKILL_KEYWORDS.filter((skill) => containsSkillOrSynonym(normalized, skill));
}

// Découpe grossièrement le CV en sections à partir des en-têtes usuels
// (SECTION_HEADERS), pour pouvoir pondérer l'extraction plutôt que de tout
// traiter comme un bloc de texte plat. Reste heuristique (pas de NER, cf.
// limite assumée au Chapitre 2 du mémoire) mais améliore la précision sur des
// CV à mise en page variée.
function splitIntoSections(text) {
  const lines = String(text || "").split(/\r?\n/);
  const sections = { _preamble: [] };
  let current = "_preamble";

  const headerLookup = [];
  Object.entries(SECTION_HEADERS).forEach(([key, labels]) => {
    labels.forEach((label) => headerLookup.push({ key, label: normalize(label) }));
  });

  lines.forEach((line) => {
    const normalizedLine = normalize(line).trim();
    const isShortLine = normalizedLine.length > 0 && normalizedLine.length <= 40;
    const matchedHeader = isShortLine
      ? headerLookup.find(({ label }) => normalizedLine === label || normalizedLine.startsWith(label))
      : null;

    if (matchedHeader) {
      current = matchedHeader.key;
      if (!sections[current]) sections[current] = [];
      return;
    }
    if (!sections[current]) sections[current] = [];
    sections[current].push(line);
  });

  return Object.fromEntries(Object.entries(sections).map(([key, arr]) => [key, arr.join("\n")]));
}

const FRENCH_MONTHS = {
  "janvier": 1, "jan": 1, "fevrier": 2, "fev": 2, "mars": 3, "avril": 4, "avr": 4,
  "mai": 5, "juin": 6, "juillet": 7, "juil": 7, "aout": 8, "septembre": 9, "sept": 9,
  "octobre": 10, "oct": 10, "novembre": 11, "nov": 11, "decembre": 12, "dec": 12
};

// Additionne les durées de périodes du type "avril 2023 à octobre 2023" ou
// "déc. 2020 - mars 2021" pour approximer une expérience totale en années,
// utile quand le CV ne mentionne jamais explicitement "X ans d'expérience".
// Gère aussi les postes en cours ("... à aujourd'hui / présent / actuel").
function extractExperienceFromDateRanges(text) {
  const normalized = normalize(text);
  const monthNames = Object.keys(FRENCH_MONTHS).join("|");
  const now = new Date();

  let totalMonths = 0;

  const closedPattern = new RegExp(
    `(${monthNames})\\.?\\s+(\\d{4})\\s*(?:a|-|\u2013|jusqu.?a)\\s*(${monthNames})\\.?\\s+(\\d{4})`,
    "g"
  );
  let match = closedPattern.exec(normalized);
  while (match) {
    const [, m1, y1, m2, y2] = match;
    const start = Number(y1) * 12 + FRENCH_MONTHS[m1];
    const end = Number(y2) * 12 + FRENCH_MONTHS[m2];
    if (end > start) totalMonths += end - start;
    match = closedPattern.exec(normalized);
  }

  const openPattern = new RegExp(
    `(${monthNames})\\.?\\s+(\\d{4})\\s*(?:a|-|\u2013|jusqu.?a)\\s*(present|actuel|aujourd.?hui|maintenant|en cours)`,
    "g"
  );
  match = openPattern.exec(normalized);
  while (match) {
    const [, m1, y1] = match;
    const start = Number(y1) * 12 + FRENCH_MONTHS[m1];
    const end = now.getFullYear() * 12 + (now.getMonth() + 1);
    if (end > start) totalMonths += end - start;
    match = openPattern.exec(normalized);
  }

  return totalMonths > 0 ? Math.round((totalMonths / 12) * 10) / 10 : 0;
}

function extractExperienceYears(text) {
  const normalized = normalize(text);
  const regex = /(\d+)\s*(ans|an|years|year)/g;
  let max = 0;
  let match = regex.exec(normalized);

  while (match) {
    const value = Number(match[1]);
    if (value > max) max = value;
    match = regex.exec(normalized);
  }

  const fromDateRanges = extractExperienceFromDateRanges(text);
  if (fromDateRanges > max) max = fromDateRanges;

  if (!max) {
    if (normalized.includes("alternance")) return 1;
    if (normalized.includes("stage")) return 1;
  }

  return max;
}

function extractEducation(text) {
  const normalized = normalize(text).replace(/bac\s*\+\s*(\d)/g, "bac+$1");
  // On trie du plus spécifique au moins spécifique ("bac+5" avant "bac") pour éviter
  // qu'un "bac" générique masque un niveau plus précis présent dans le texte.
  const sorted = [...EDUCATION_LEVELS].sort((a, b) => b.length - a.length);
  const found = sorted.find((level) => normalized.includes(level));
  return found || "";
}

function extractLanguages(text) {
  const normalized = normalize(text);
  const map = [
    { key: "francais", label: "français" },
    { key: "anglais", label: "anglais" },
    { key: "espagnol", label: "espagnol" },
    { key: "allemand", label: "allemand" },
    { key: "italien", label: "italien" }
  ];
  return map.filter((lang) => normalized.includes(lang.key)).map((lang) => lang.label);
}

function inferHeadline(text) {
  const lines = String(text || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  return lines[0] || "";
}

// --- Signaux qualité CV, utilisés par le moteur de recommandations (CV+) ---

const ACTION_VERBS = [
  "conçu", "concu", "développé", "developpe", "piloté", "pilote", "automatisé", "automatise",
  "dirigé", "dirige", "optimisé", "optimise", "livré", "livre", "coordonné", "coordonne",
  "implémenté", "implemente", "analysé", "analyse", "amélioré", "ameliore", "créé", "cree"
];

function detectQuantifiedResults(text) {
  // Cherche des indices chiffrés typiques d'un résultat quantifié : %, k€/M€, ratios, durées.
  return /\d+\s?(%|k€|m€|€|x\b|fois)|(-|\+)\s?\d+\s?%/i.test(text);
}

function detectActionVerbs(text) {
  const normalized = normalize(text);
  return ACTION_VERBS.some((verb) => normalized.includes(normalize(verb)));
}

function detectContactInfo(text) {
  const hasEmail = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i.test(text);
  const hasPhone = /(?:\+33|0)\s?[1-9](?:[\s.-]?\d{2}){4}/.test(text);
  const hasLinkedin = /linkedin\.com\/in\/|linkedin/i.test(text);
  return hasEmail || hasPhone || hasLinkedin;
}

// Indice de confiance de l'extraction (basse/moyenne/haute) : sert à afficher un
// avertissement côté UI plutôt qu'un score de matching silencieusement peu fiable
// quand le CV est très court ou qu'aucune compétence n'a pu être détectée.
function computeExtractionConfidence({ wordCount, skillCount, hasEducation, hasExperience }) {
  let points = 0;
  if (wordCount >= 150) points += 1;
  if (wordCount >= 300) points += 1;
  if (skillCount >= 3) points += 1;
  if (skillCount >= 8) points += 1;
  if (hasEducation) points += 1;
  if (hasExperience) points += 1;

  if (points >= 5) return "haute";
  if (points >= 3) return "moyenne";
  return "basse";
}

function computeCvSignals(text, { skillCount, hasEducation, hasExperience } = {}) {
  const wordCount = String(text || "").trim().split(/\s+/).filter(Boolean).length;
  return {
    wordCount,
    hasQuantifiedResults: detectQuantifiedResults(text),
    hasActionVerbs: detectActionVerbs(text),
    hasContactInfo: detectContactInfo(text),
    extractionConfidence: computeExtractionConfidence({
      wordCount,
      skillCount: skillCount || 0,
      hasEducation,
      hasExperience
    })
  };
}

export function parseCvText(text) {
  const sections = splitIntoSections(text);
  // Priorité à la section "Compétences" si détectée (signal plus fiable),
  // complétée par une recherche sur l'ensemble du document pour ne pas manquer
  // des compétences mentionnées dans les descriptions d'expérience.
  const skillsFromSection = sections.skills ? extractSkills(sections.skills) : [];
  const skillsFromWholeDoc = extractSkills(text);
  const skills = unique([...skillsFromSection, ...skillsFromWholeDoc]);

  const experienceYears = extractExperienceYears(text);
  const education = extractEducation(text);
  const languages = unique(extractLanguages(text));
  const signals = computeCvSignals(text, {
    skillCount: skills.length,
    hasEducation: Boolean(education),
    hasExperience: experienceYears > 0 || Boolean(sections.experience)
  });

  return {
    headline: inferHeadline(text),
    skills,
    experienceYears,
    education,
    languages,
    signals
  };
}

// --- Extraction de fichier ---
// Phase 1 (avant cette révision) : décodage brut UTF-8 du binaire, non fiable pour PDF/DOC/DOCX.
// Cette version ajoute une vraie extraction PDF (pdfjs-dist) et DOCX (mammoth), chargées à la
// demande (dynamic import) pour ne pas alourdir le bundle initial. Le format .doc (binaire OLE,
// pré-2007) reste non pris en charge : message d'erreur explicite plutôt qu'un texte illisible.

function decodeArrayBufferAsText(buffer) {
  const decoder = new TextDecoder("utf-8", { fatal: false });
  return decoder.decode(buffer);
}

async function extractTextFromPdf(arrayBuffer) {
  const pdfjsLib = await import("pdfjs-dist/build/pdf.mjs");
  // Le worker doit être servi statiquement ; voir vite.config / public/pdf.worker.min.mjs
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url
  ).toString();

  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;

  let fullText = "";
  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum += 1) {
    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();
    const pageText = content.items.map((item) => item.str).join(" ");
    fullText += `${pageText}\n`;
  }
  return fullText;
}

async function extractTextFromDocx(arrayBuffer) {
  const mammoth = await import("mammoth/mammoth.browser");
  const result = await mammoth.extractRawText({ arrayBuffer });
  return result.value || "";
}

export function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const name = String(file?.name || "");
    const type = String(file?.type || "");
    const isPdf = /\.pdf$/i.test(name) || /pdf/i.test(type);
    const isDocx = /\.docx$/i.test(name) || /officedocument\.wordprocessingml/i.test(type);
    const isLegacyDoc = /\.doc$/i.test(name) && !isDocx;

    if (isLegacyDoc) {
      reject(new Error(
        "Le format .doc (Word 97-2003) n'est pas pris en charge. Enregistre le fichier en .docx ou colle le texte du CV dans la zone de saisie."
      ));
      return;
    }

    const reader = new FileReader();

    reader.onload = async () => {
      try {
        if (isPdf || isDocx) {
          const buffer = reader.result instanceof ArrayBuffer ? reader.result : null;
          if (!buffer) {
            reject(new Error("Lecture binaire impossible pour ce fichier."));
            return;
          }
          const raw = isPdf ? await extractTextFromPdf(buffer) : await extractTextFromDocx(buffer);
          const cleaned = cleanTextPayload(raw);
          if (!cleaned || cleaned.length < 20) {
            reject(new Error(
              "Le texte extrait de ce fichier est trop court ou vide (PDF scanné en image ?). Utilise la zone de texte en complément."
            ));
            return;
          }
          resolve(cleaned);
          return;
        }

        // .txt / .md / autres formats texte
        const raw =
          typeof reader.result === "string"
            ? reader.result
            : reader.result instanceof ArrayBuffer
              ? decodeArrayBufferAsText(reader.result)
              : "";
        const cleaned = cleanTextPayload(raw);
        if (!cleaned) {
          reject(new Error("Impossible d'extraire du texte lisible depuis ce fichier."));
          return;
        }
        resolve(cleaned);
      } catch (error) {
        reject(new Error(`Échec de l'extraction du fichier : ${error.message || error}`));
      }
    };

    reader.onerror = () => reject(new Error("Impossible de lire ce fichier."));

    if (isPdf || isDocx) {
      reader.readAsArrayBuffer(file);
    } else {
      reader.readAsText(file);
    }
  });
}

export function createCvRecord({ fileName, sourceText }) {
  const parsed = parseCvText(sourceText);
  return {
    fileName,
    sourceText,
    parsed
  };
}

/**
 * Génère une version texte "optimisée" du CV, exploitable telle quelle (export .txt)
 * ou comme base de retravail. Reste volontairement simple (Phase 1, pas de génération LLM) :
 * réorganisation + rappels ciblés à partir des recommandations calculées par le matching.
 */
export function buildOptimizedCvText({ cvRecord, recommendations = [], bestMatch }) {
  const lines = [];
  lines.push(`CV optimisé — ${cvRecord?.parsed?.headline || "Profil"}`);
  lines.push(`Généré par Career_App le ${new Date().toLocaleDateString("fr-FR")}`);
  if (bestMatch) {
    lines.push(`Ciblé pour : ${bestMatch.offer.title} — ${bestMatch.offer.company}`);
  }
  lines.push("");
  lines.push("--- Recommandations à appliquer avant envoi ---");
  recommendations.forEach((reco, idx) => {
    lines.push(`${idx + 1}. [${reco.level}] ${reco.title} — ${reco.detail}`);
  });
  lines.push("");
  lines.push("--- Contenu original du CV (à retravailler selon les points ci-dessus) ---");
  lines.push(cvRecord?.sourceText || "");
  return lines.join("\n");
}

export function downloadTextFile(filename, content) {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

const LEVEL_COLORS = {
  critique: [220, 38, 38],
  important: [217, 119, 6],
  bonus: [14, 159, 110],
  premium: [47, 91, 255]
};

/**
 * Génère un vrai PDF téléchargeable (jsPDF, 100% côté navigateur — aucun coût
 * d'API, cohérent avec la logique MVP local-first du reste du prototype).
 * Structure : en-tête + offre ciblée, recommandations mises en forme, puis le
 * contenu du CV original reflowé sur autant de pages que nécessaire.
 */
export async function downloadOptimizedCvPdf({ cvRecord, recommendations = [], bestMatch, fileName }) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "a4" });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 48;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  function ensureSpace(lineHeight) {
    if (y + lineHeight > pageHeight - margin) {
      doc.addPage();
      y = margin;
    }
  }

  function writeParagraph(text, { size = 10, color = [30, 30, 30], bold = false, gap = 14 } = {}) {
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(size);
    doc.setTextColor(...color);
    const lines = doc.splitTextToSize(text, contentWidth);
    lines.forEach((line) => {
      ensureSpace(gap);
      doc.text(line, margin, y);
      y += gap;
    });
  }

  // En-tête
  writeParagraph(cvRecord?.parsed?.headline || "CV optimisé", { size: 16, bold: true, gap: 20 });
  writeParagraph(`Généré par Career_App le ${new Date().toLocaleDateString("fr-FR")}`, {
    size: 9,
    color: [110, 110, 110],
    gap: 13
  });
  if (bestMatch) {
    writeParagraph(`Ciblé pour : ${bestMatch.offer.title} — ${bestMatch.offer.company}`, {
      size: 10,
      color: [80, 80, 80],
      gap: 16
    });
  }
  y += 6;

  // Recommandations
  writeParagraph("RECOMMANDATIONS À APPLIQUER AVANT ENVOI", { size: 11, bold: true, gap: 16 });
  recommendations.forEach((reco, idx) => {
    const color = LEVEL_COLORS[reco.level] || [60, 60, 60];
    ensureSpace(14);
    doc.setFillColor(...color);
    doc.rect(margin, y - 8, 4, 10, "F");
    writeParagraph(`${idx + 1}. [${reco.level}] ${reco.title}`, { size: 10, bold: true, gap: 13 });
    writeParagraph(reco.detail, { size: 9.5, color: [90, 90, 90], gap: 12 });
    y += 4;
  });

  y += 6;
  ensureSpace(20);
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, y, pageWidth - margin, y);
  y += 18;

  // Contenu original du CV
  writeParagraph("CONTENU DU CV (à retravailler selon les points ci-dessus)", { size: 11, bold: true, gap: 16 });
  writeParagraph(cvRecord?.sourceText || "", { size: 9.5, color: [40, 40, 40], gap: 12.5 });

  const safeName = (fileName || cvRecord?.fileName || "cv").replace(/\.[^.]+$/, "");
  doc.save(`${safeName}-optimise.pdf`);
}
