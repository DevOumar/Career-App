import { DOMAIN_MAP, EDUCATION_LEVELS, SKILL_KEYWORDS, SKILL_SYNONYMS } from "../data/skills";

function normalize(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, " ")
    .trim();
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Voir cvService.js : même correctif anti-faux-positifs (ex. "r" dans "enginee-r",
// "scala" dans "scala-bilité") appliqué ici pour l'extraction depuis une offre collée.
function containsSkillKeyword(normalizedText, keyword) {
  const pattern = new RegExp(`(?<![a-z0-9])${escapeRegex(keyword)}(?![a-z0-9])`, "i");
  return pattern.test(normalizedText);
}

// Un mot-clé canonique compte comme présent si lui-même OU l'un de ses synonymes
// connus (SKILL_SYNONYMS) apparaît dans le texte. Réduit les faux négatifs quand
// l'offre ou le CV utilise une formulation différente ("JS" vs "JavaScript").
function containsSkillOrSynonym(normalizedText, keyword) {
  if (containsSkillKeyword(normalizedText, keyword)) return true;
  return Object.entries(SKILL_SYNONYMS).some(
    ([synonym, canonical]) => canonical === keyword && containsSkillKeyword(normalizedText, synonym)
  );
}

function unique(list) {
  return [...new Set(list.filter(Boolean))];
}

function intersect(sourceA, sourceB) {
  const a = new Set(sourceA);
  return sourceB.filter((item) => a.has(item));
}

function educationRank(level) {
  const idx = EDUCATION_LEVELS.indexOf(normalize(level));
  return idx === -1 ? 0 : idx;
}

// Villes françaises courantes utilisées pour repérer une localisation dans une offre collée.
// Liste volontairement limitée (Phase 1) : une extraction plus robuste (NER) est prévue en V2.
const KNOWN_CITIES = [
  "paris", "lyon", "marseille", "toulouse", "bordeaux", "lille", "nantes",
  "strasbourg", "rennes", "montpellier", "nice", "grenoble", "blagnac",
  "issy-les-moulineaux", "boulogne-billancourt", "levallois-perret",
  "remote", "télétravail", "full remote"
];

function extractLocationFromText(text) {
  const normalized = normalize(text);
  const found = KNOWN_CITIES.find((city) => normalized.includes(normalize(city)));
  return found || "";
}

// Détecte une durée d'expérience, y compris les formulations usuelles
// ("3-5 ans", "minimum 2 ans", "5 ans mini", "3+ ans").
function extractExperienceMinFromText(text) {
  const normalized = normalize(text);
  const rangeMatch = normalized.match(/(\d+)\s*(?:-|a|à)\s*(\d+)\s*(ans|an|years|year)/);
  if (rangeMatch) return Number(rangeMatch[1]);

  const plusMatch = normalized.match(/(\d+)\s*\+\s*(ans|an|years|year)/);
  if (plusMatch) return Number(plusMatch[1]);

  const minMatch = normalized.match(/(?:minimum|mini|au moins)\s*(\d+)\s*(ans|an|years|year)/);
  if (minMatch) return Number(minMatch[1]);

  const simpleMatch = normalized.match(/(\d+)\s*(ans|an|years|year)/);
  return simpleMatch ? Number(simpleMatch[1]) : 1;
}

const TITLE_CUE_PATTERNS = [
  /[Rr]echerch\w*\s+(?:actuellement\s+)?(?:un\.?\(?e?\)?|des?)\s+([A-ZÀ-Ÿ][\w'\-À-ÿ]*(?:\s+[A-ZÀ-Ÿ][\w'\-À-ÿ]*)*)/,
  /[Rr]ecrut\w*\s+(?:un\.?\(?e?\)?|des?)\s+([A-ZÀ-Ÿ][\w'\-À-ÿ]*(?:\s+[A-ZÀ-Ÿ][\w'\-À-ÿ]*)*)/,
  /[Pp]oste\s+d[e']\s+([A-ZÀ-Ÿ][\w'\-À-ÿ]*(?:\s+[A-ZÀ-Ÿ][\w'\-À-ÿ]*)*)/,
  /(?:^|\n)\s*[Oo]ffre\s*:\s*([A-ZÀ-Ÿ][\w'\-À-ÿ]*(?:\s+[A-ZÀ-Ÿ][\w'\-À-ÿ]*)*)/
];

// Une "vraie" ligne de titre est courte, ne se termine pas par un point (donc
// n'est probablement pas une phrase d'accroche), et contient plusieurs mots.
function looksLikeTitleLine(line) {
  const trimmed = line.trim();
  if (trimmed.length < 4 || trimmed.length > 70) return false;
  if (/[.!?]$/.test(trimmed)) return false;
  const wordCount = trimmed.split(/\s+/).length;
  return wordCount >= 1 && wordCount <= 8;
}

function extractTitleFromText(text) {
  const raw = String(text || "");

  // 1) Cherche un motif explicite ("recherchons un(e) Data Engineer", "poste de ...")
  for (const pattern of TITLE_CUE_PATTERNS) {
    const match = raw.match(pattern);
    if (match?.[1]) {
      return match[1].trim().slice(0, 70);
    }
  }

  // 2) Sinon, cherche parmi les premières lignes celle qui ressemble le plus
  // à un titre de poste plutôt qu'à une phrase d'accroche d'entreprise.
  const lines = raw.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const candidate = lines.slice(0, 6).find(looksLikeTitleLine);
  if (candidate) return candidate.slice(0, 70);

  // 3) Filet de sécurité : pas de titre identifiable, on l'assume plutôt que
  // d'afficher une phrase entière comme "titre de poste" dans toute l'app.
  return "Poste (offre importée)";
}

const MUST_HAVE_CUES = [
  "indispensable", "imperatif", "requis", "obligatoire", "exige", "exigee",
  "maitrise de", "excellente maitrise", "solide experience", "expert en"
];
const NICE_TO_HAVE_CUES = [
  "un plus", "serait un atout", "apprecie", "idealement", "bonus",
  "serait apprecie", "de preference", "atout"
];

// Cherche, dans une fenêtre de texte autour de chaque occurrence d'un mot-clé,
// la présence d'un indice "obligatoire" ou "atout" pour pondérer son importance
// dans le score. Reste heuristique : approxime une lecture humaine de l'offre
// sans NLP avancé (cf. limite assumée, Chapitre 2 du mémoire).
function computeSkillWeights(normalizedText, skills) {
  const weights = {};
  skills.forEach((skill) => {
    const pattern = new RegExp(`(?<![a-z0-9])${escapeRegex(skill)}(?![a-z0-9])`, "i");
    const match = pattern.exec(normalizedText);
    if (!match) {
      weights[skill] = 1;
      return;
    }
    const windowStart = Math.max(0, match.index - 60);
    const windowEnd = Math.min(normalizedText.length, match.index + skill.length + 60);
    const window = normalizedText.slice(windowStart, windowEnd);

    if (MUST_HAVE_CUES.some((cue) => window.includes(cue))) {
      weights[skill] = 1.5;
    } else if (NICE_TO_HAVE_CUES.some((cue) => window.includes(cue))) {
      weights[skill] = 0.6;
    } else {
      weights[skill] = 1;
    }
  });
  return weights;
}

function extractOfferFromText(text) {
  const normalized = normalize(text).replace(/bac\s*\+\s*(\d)/g, "bac+$1");
  const skills = SKILL_KEYWORDS.filter((skill) => containsSkillOrSynonym(normalized, skill));
  const experienceMin = extractExperienceMinFromText(text);
  const sortedEducationLevels = [...EDUCATION_LEVELS].sort((a, b) => b.length - a.length);
  const education = sortedEducationLevels.find((level) => normalized.includes(level)) || "bac+5";
  const location = extractLocationFromText(text);
  const resolvedSkills = skills.length ? unique(skills) : ["python", "ml", "communication"];
  const skillWeights = computeSkillWeights(normalized, resolvedSkills);

  return {
    id: "custom-offer",
    company: "Offre importée",
    title: extractTitleFromText(text),
    location: location || "Non précisé",
    contract: "À définir",
    premium: false,
    sector: "Général",
    experienceMin,
    education,
    skills: resolvedSkills,
    skillWeights,
    missions: []
  };
}

// Bonus de localisation : match direct, "remote" côté candidat ou côté offre,
// ou absence de préférence de localisation (candidat ouvert à tout).
function locationBonus(candidateLocation, offerLocation) {
  const c = normalize(candidateLocation);
  const o = normalize(offerLocation);
  if (!c) return 0;
  if (!o || o === "non precise") return 2;
  if (c.includes("remote") || o.includes("remote") || o.includes("teletravail")) return 4;
  if (o.includes(c) || c.includes(o)) return 4;
  return 0;
}

function scoreOffer({ candidate, offer, premiumAccess }) {
  const requiredSkills = unique(offer.skills.map(normalize));
  const candidateSkills = unique(candidate.skills.map(normalize));
  const matchedSkills = intersect(candidateSkills, requiredSkills);
  const missingSkills = requiredSkills.filter((skill) => !matchedSkills.includes(skill));

  // Score de compétences pondéré : une compétence marquée "indispensable" dans
  // l'offre (skillWeights) pèse plus qu'une compétence "un plus". Les offres du
  // portefeuille de démonstration n'ayant pas de skillWeights, chaque compétence
  // y vaut 1 par défaut (comportement identique à avant pour ces offres-là).
  const weightOf = (skill) => (offer.skillWeights && offer.skillWeights[skill]) || 1;
  const totalWeight = requiredSkills.reduce((acc, skill) => acc + weightOf(skill), 0);
  const matchedWeight = matchedSkills.reduce((acc, skill) => acc + weightOf(skill), 0);
  const skillRatio = totalWeight ? matchedWeight / totalWeight : 0;
  const skillScore = Math.round(skillRatio * 55);

  const expRatio = offer.experienceMin
    ? Math.min(1, (candidate.experienceYears || 0) / offer.experienceMin)
    : 1;
  const experienceScore = Math.round(expRatio * 20);

  const educationScore =
    educationRank(candidate.education) >= educationRank(offer.education) ? 10 : 4;

  const roleSignal = normalize(candidate.targetRole);
  const sectorSignal = normalize(candidate.sector);
  const bonus =
    (roleSignal && normalize(offer.title).includes(roleSignal) ? 6 : 0) +
    (sectorSignal && normalize(offer.sector).includes(sectorSignal) ? 4 : 0) +
    locationBonus(candidate.location, offer.location);

  const score = Math.min(100, skillScore + experienceScore + educationScore + bonus);

  const locked = Boolean(offer.premium && !premiumAccess.hasAccess);
  const verdict = score >= 75 ? "excellent" : score >= 60 ? "bon" : score >= 45 ? "moyen" : "à renforcer";

  return {
    offer,
    score,
    verdict,
    locked,
    matchedSkills,
    missingSkills,
    skillCoverage: Math.round(skillRatio * 100),
    experienceFit: Math.round(expRatio * 100),
    locationMatch: locationBonus(candidate.location, offer.location) > 0
  };
}

// Avec un vocabulaire multi-secteurs (12 domaines), afficher systématiquement
// les 12 barres serait illisible et hors-sujet pour la plupart des offres
// (ex. "Design & UX" pour un poste de contrôleur de gestion). On ne garde que
// les domaines réellement présents dans l'offre analysée, triés par pertinence,
// plafonnés à 6 pour rester lisible dans l'UI (Image Analyse du mémoire).
function computeDomainScores(candidateSkills, offerSkills) {
  const normalizedCandidateSkills = candidateSkills.map(normalize);
  const normalizedOfferSkills = offerSkills.map(normalize);

  const scored = Object.entries(DOMAIN_MAP)
    .map(([domain, keywords]) => {
      const normalizedKeywords = keywords.map(normalize);
      const domainNeed = intersect(normalizedOfferSkills, normalizedKeywords);
      if (!domainNeed.length) return null; // domaine non pertinent pour cette offre
      const coverage = intersect(normalizedCandidateSkills, domainNeed).length / domainNeed.length;
      return { domain, value: Math.round(coverage * 100), relevance: domainNeed.length };
    })
    .filter(Boolean)
    .sort((a, b) => b.relevance - a.relevance)
    .slice(0, 6)
    .map(({ domain, value }) => ({ domain, value }));

  // Filet de sécurité : si l'offre ne matche aucun domaine connu (vocabulaire
  // encore incomplet pour ce secteur), retomber sur les domaines génériques
  // plutôt que d'afficher un bloc vide.
  if (scored.length) return scored;
  return ["Communication client", "RH & Management", "Vente & Business"].map((domain) => ({
    domain,
    value: 0
  }));
}

function pickStrengthsAndGaps(bestMatch) {
  const strengths = [];
  const gaps = [];

  if (bestMatch.skillCoverage >= 80) {
    strengths.push("Couverture de compétences très solide sur les prérequis de l'offre.");
  } else if (bestMatch.skillCoverage >= 60) {
    strengths.push("Base technique alignée avec les attentes principales du poste.");
  }

  if (bestMatch.experienceFit >= 100) {
    strengths.push("Niveau d'expérience conforme ou supérieur au minimum attendu.");
  } else {
    gaps.push("Niveau d'expérience perçu inférieur au seuil de l'offre.");
  }

  if (bestMatch.locationMatch) {
    strengths.push("Localisation compatible avec le poste visé.");
  }

  if (bestMatch.missingSkills.includes("llm") || bestMatch.missingSkills.includes("rag")) {
    gaps.push("LLM/RAG peu visibles, alors que la demande est marquée sur ces sujets.");
  }

  if (bestMatch.missingSkills.includes("openai api") || bestMatch.missingSkills.includes("vertex ai")) {
    gaps.push("Les outils GenAI enterprise ne ressortent pas clairement dans ton profil.");
  }

  if (!strengths.length) {
    strengths.push("Profil exploitable, mais nécessite un meilleur ciblage par offre.");
  }

  if (!gaps.length) {
    gaps.push("Aucun gap majeur détecté, focus sur la personnalisation du CV par entreprise.");
  }

  return { strengths, gaps };
}

function buildRecommendations(bestMatch, premiumAccess, cvSignals = {}) {
  const recos = [];

  if (cvSignals.extractionConfidence === "basse") {
    recos.push({
      level: "critique",
      title: "Analyse peu fiable sur ce CV",
      detail:
        "Peu d'informations exploitables ont été détectées (CV très court, ou compétences non reconnues). Complète ton profil manuellement ou vérifie que le fichier importé contient bien du texte lisible."
    });
  }

  if (bestMatch.missingSkills.includes("llm") || bestMatch.missingSkills.includes("rag")) {
    recos.push({
      level: "critique",
      title: "Rendre visible ton expérience GenAI",
      detail:
        "Ajoute au moins un projet concret LLM/RAG avec stack, volume de données et impact mesurable."
    });
  }

  if (bestMatch.missingSkills.length >= 3) {
    recos.push({
      level: "important",
      title: "Restructurer la section compétences",
      detail:
        `Mets en avant ces compétences demandées : ${bestMatch.missingSkills.slice(0, 5).join(", ")}.`
    });
  }

  recos.push({
    level: "important",
    title: "Personnaliser l'accroche du CV",
    detail:
      `Titre conseillé : "${bestMatch.offer.title} orienté impact métier" pour coller à l'offre ${bestMatch.offer.company}.`
  });

  if (!cvSignals.hasQuantifiedResults) {
    recos.push({
      level: "bonus",
      title: "Quantifier les résultats",
      detail:
        "Ajoute des métriques (délais, précision, économies, adoption) sur chaque expérience clé pour augmenter la crédibilité."
    });
  }

  if (!cvSignals.hasActionVerbs) {
    recos.push({
      level: "bonus",
      title: "Utiliser des verbes d'action",
      detail:
        "Démarre chaque ligne d'expérience par un verbe d'action (conçu, développé, piloté, automatisé) plutôt qu'une description passive."
    });
  }

  if (!cvSignals.hasContactInfo) {
    recos.push({
      level: "important",
      title: "Compléter les coordonnées",
      detail:
        "Aucun email ou téléphone détecté dans le CV : vérifie que tes coordonnées sont bien lisibles en haut du document."
    });
  }

  if (cvSignals.wordCount && cvSignals.wordCount < 150) {
    recos.push({
      level: "important",
      title: "Étoffer le contenu du CV",
      detail:
        "Le CV importé semble très court (moins de 150 mots) : détaille tes expériences et projets pour donner plus de matière au matching."
    });
  }

  if (!bestMatch.locationMatch && bestMatch.offer.location !== "Non précisé") {
    recos.push({
      level: "bonus",
      title: "Préciser ta mobilité",
      detail:
        `L'offre est basée à ${bestMatch.offer.location} : indique dans ton profil si tu es mobile ou ouvert au télétravail.`
    });
  }

  if (!premiumAccess.hasAccess) {
    recos.push({
      level: "premium",
      title: "Débloquer les offres premium",
      detail:
        "Complète le profil (rôle cible, compétences, expérience) pour débloquer les offres premium automatiquement."
    });
  }

  return recos;
}

/**
 * Filtre une liste d'offres déjà scorées (rankedOffers) selon une recherche libre,
 * une compétence, un secteur et/ou une localisation. Toujours appliqué côté client :
 * aucun appel réseau supplémentaire.
 */
export function filterScoredOffers(scoredOffers, { query = "", skill = "", sector = "", location = "" } = {}) {
  const q = normalize(query);
  const skillN = normalize(skill);
  const sectorN = normalize(sector);
  const locationN = normalize(location);

  return scoredOffers.filter(({ offer }) => {
    const haystack = normalize(`${offer.title} ${offer.company} ${offer.skills.join(" ")}`);
    if (q && !haystack.includes(q)) return false;
    if (skillN && !offer.skills.some((s) => normalize(s).includes(skillN))) return false;
    if (sectorN && !normalize(offer.sector).includes(sectorN)) return false;
    if (locationN && !normalize(offer.location).includes(locationN)) return false;
    return true;
  });
}

export function runMatching({ user, cvRecord, offerText, offers, premiumAccess, cvSignals }) {
  const customOffer = extractOfferFromText(offerText);
  const candidateSkills = unique([
    ...(user.profile?.skills || []),
    ...(cvRecord?.parsed?.skills || [])
  ]);

  const candidate = {
    skills: candidateSkills,
    experienceYears: Math.max(user.profile?.experienceYears || 0, cvRecord?.parsed?.experienceYears || 0),
    education: user.profile?.education || cvRecord?.parsed?.education || "",
    targetRole: user.profile?.targetRole || "",
    sector: user.profile?.sector || "",
    location: user.profile?.location || ""
  };

  const allOffers = [customOffer, ...offers];
  const scored = allOffers.map((offer) => scoreOffer({ candidate, offer, premiumAccess }));
  scored.sort((a, b) => b.score - a.score);

  // Si l'utilisateur a collé une offre précise (cas normal du parcours Importer),
  // c'est CETTE offre qui doit rester la cible de l'analyse et du CV+ exporté —
  // même si une offre du portefeuille de démonstration obtient un meilleur score.
  // Sans ce garde-fou, le CV optimisé pourrait se personnaliser pour un poste
  // auquel le candidat n'a jamais postulé, simplement parce qu'il matche mieux.
  const hasExplicitOfferText = String(offerText || "").trim().length >= 50;
  const bestMatch = hasExplicitOfferText
    ? scored.find((item) => item.offer.id === "custom-offer")
    : scored[0];
  const domainScores = computeDomainScores(candidate.skills, bestMatch.offer.skills);
  const { strengths, gaps } = pickStrengthsAndGaps(bestMatch);
  const recommendations = buildRecommendations(bestMatch, premiumAccess, cvSignals);

  const accessibleScores = scored.filter((item) => !item.locked);
  const averageScore = accessibleScores.length
    ? Math.round(accessibleScores.reduce((acc, item) => acc + item.score, 0) / accessibleScores.length)
    : 0;

  return {
    summary: {
      globalScore: bestMatch.score,
      verdict: bestMatch.verdict,
      company: bestMatch.offer.company,
      title: bestMatch.offer.title,
      subtitle: `${bestMatch.offer.company} · ${bestMatch.offer.title} · ${bestMatch.offer.contract}`,
      extractionConfidence: cvSignals?.extractionConfidence || "moyenne"
    },
    bestMatch,
    rankedOffers: scored,
    strengths,
    gaps,
    recommendations,
    domainScores,
    portfolioScore: averageScore
  };
}
