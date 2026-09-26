import { DOMAIN_MAP, EDUCATION_LEVELS, SKILL_KEYWORDS } from "../data/skills.js";

function normalize(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, " ")
    .trim();
}

function unique(list) {
  return [...new Set(list.filter(Boolean))];
}

const SOFT_SKILL_KEYWORDS = [
  "communication",
  "collaboration",
  "curiosite",
  "curiosité",
  "autonomie",
  "rigueur",
  "leadership",
  "presentation",
  "présentation",
  "stakeholder",
  "problem solving",
  "resolution de problemes",
  "résolution de problèmes",
  "pensee strategique",
  "pensée stratégique",
  "analyse",
  "esprit critique",
  "organisation"
];

function intersect(sourceA, sourceB) {
  const a = new Set(sourceA);
  return sourceB.filter((item) => a.has(item));
}

function educationRank(level) {
  const idx = EDUCATION_LEVELS.indexOf(normalize(level));
  return idx === -1 ? 0 : idx;
}

function firstUsefulLine(text) {
  return String(text || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line.length >= 8 && line.length <= 100 && !/@/.test(line)) || "";
}

function inferCompany(text) {
  const lines = String(text || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const companyLine = lines.find((line) => /chez\s+|entreprise\s*:|company\s*:/i.test(line));
  if (companyLine) {
    return companyLine.replace(/.*(?:chez|entreprise\s*:|company\s*:)\s*/i, "").split(/[,.]/)[0].trim() || "Offre importée";
  }
  return lines[1]?.length <= 60 ? lines[1] : "Offre importée";
}

// Même heuristique que extractLocalJobSummary côté backend (index.js) :
// cherche une ligne mentionnant une grande ville, la France, ou le
// télétravail, plutôt que de renvoyer "Non précisé" à chaque fois.
const LOCATION_PATTERN =
  /(paris|lyon|nantes|lille|marseille|toulouse|bordeaux|strasbourg|nice|rennes|montpellier|grenoble|belgique|suisse|luxembourg|canada|france|remote|t[ée]l[ée]travail|hybride)/i;

function inferLocation(text) {
  // Test la ligne brute (pas normalize(), qui remplace les accents par des
  // espaces et casserait "télétravail" en "te le travail" non contigu).
  const lines = String(text || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const match = lines.find((line) => LOCATION_PATTERN.test(line));
  return match ? match.slice(0, 80) : "Non précisé";
}

function inferContract(text) {
  const lines = String(text || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const match = lines.find((line) => /\b(cdi|cdd|stage|alternance|freelance|int[ée]rim)\b/i.test(line));
  return match ? match.slice(0, 60) : "À définir";
}

function inferJobDescription(text) {
  const lines = String(text || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const longLines = lines.filter((line) => line.length > 60);
  return longLines.slice(0, 5).join(" ") || String(text || "").slice(0, 520).trim();
}

export function extractOfferSummary(text) {
  const normalized = normalize(text);
  const skills = SKILL_KEYWORDS.filter((skill) => normalized.includes(skill));
  const softSkills = SOFT_SKILL_KEYWORDS.filter((skill) => normalized.includes(normalize(skill)));
  const yearsMatch = normalized.match(/(\d+)\s*(ans|an|years|year)/);
  const experienceMin = yearsMatch ? Number(yearsMatch[1]) : 1;
  // Pas de niveau par défaut fabriqué (ex: "bac+5") si rien n'est détecté dans
  // le texte collé — une chaîne vide fait passer educationRank() à 0, donc
  // aucune barrière artificielle n'est appliquée au score de matching.
  const education = EDUCATION_LEVELS.find((level) => normalized.includes(level)) || "";
  const title = firstUsefulLine(text) || "Poste personnalisé";
  const company = inferCompany(text);

  return {
    id: "custom-offer",
    company,
    title,
    location: inferLocation(text),
    contract: inferContract(text),
    premium: false,
    sector: "Général",
    experienceMin,
    education,
    skills: unique(skills),
    softSkills: unique(softSkills).slice(0, 8),
    description: inferJobDescription(text),
    missions: []
  };
}

function scoreOffer({ candidate, offer, premiumAccess }) {
  const requiredSkills = unique(offer.skills.map(normalize));
  const candidateSkills = unique(candidate.skills.map(normalize));
  const matchedSkills = intersect(candidateSkills, requiredSkills);
  const missingSkills = requiredSkills.filter((skill) => !matchedSkills.includes(skill));

  const skillRatio = requiredSkills.length ? matchedSkills.length / requiredSkills.length : 0;
  const skillScore = Math.round(skillRatio * 60);

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
    (sectorSignal && normalize(offer.sector).includes(sectorSignal) ? 4 : 0);

  const score = Math.min(100, skillScore + experienceScore + educationScore + bonus);

  const locked = Boolean(offer.premium && !premiumAccess.hasAccess);

  return {
    offer,
    score,
    verdict,
    locked,
    matchedSkills,
    missingSkills,
    skillCoverage: Math.round(skillRatio * 100),
    experienceFit: Math.round(expRatio * 100)
  };
}

function computeDomainScores(candidateSkills, offerSkills) {
  const normalizedCandidateSkills = candidateSkills.map(normalize);
  const normalizedOfferSkills = offerSkills.map(normalize);

  return Object.entries(DOMAIN_MAP).map(([domain, keywords]) => {
    const normalizedKeywords = keywords.map(normalize);
    const domainNeed = intersect(normalizedOfferSkills, normalizedKeywords);
    const reference = domainNeed.length ? domainNeed : normalizedKeywords;
    const coverage = reference.length
      ? intersect(normalizedCandidateSkills, reference).length / reference.length
      : 0;

    return {
      domain,
      value: Math.round(coverage * 100)
    };
  });
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

  if (bestMatch.missingSkills.includes("llm") || bestMatch.missingSkills.includes("rag")) {
    gaps.push("LLM/RAG peu visibles, alors que la demande est marquée sur ces sujets.");
  }

  if (bestMatch.missingSkills.includes("openai api") || bestMatch.missingSkills.includes("vertex ai")) {
    gaps.push("Les outils GenAI enterprise ne ressortent pas clairement dans votre profil.");
  }

  if (!strengths.length) {
    strengths.push("Profil exploitable, mais nécessite un meilleur ciblage par offre.");
  }

  if (!gaps.length) {
    gaps.push("Aucun gap majeur détecté, focus sur la personnalisation du CV par entreprise.");
  }

  return { strengths, gaps };
}

function buildRecommendations(bestMatch, premiumAccess) {
  const recos = [];

  if (bestMatch.missingSkills.includes("llm") || bestMatch.missingSkills.includes("rag")) {
    recos.push({
      level: "critique",
      title: "Rendre visible votre expérience GenAI",
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

  recos.push({
    level: "bonus",
    title: "Quantifier les résultats",
    detail:
      "Ajoute des métriques (délais, précision, économies, adoption) sur chaque expérience clé pour augmenter la crédibilité."
  });

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

export function buildLocalMatchInsights({ candidate, offer }) {
  const premiumAccess = { hasAccess: true };
  const match = scoreOffer({ candidate, offer, premiumAccess });
  const { strengths, gaps } = pickStrengthsAndGaps(match);
  const recommendations = buildRecommendations(match, premiumAccess).map((item) => ({
    level: item.level === "premium" ? "bonus" : item.level,
    title: item.title,
    detail: item.detail
  }));

  return {
    score: match.score,
    verdict: match.verdict,
    strengths,
    missingKeywords: unique(match.missingSkills),
    culturalFit:
      "Analyse locale : alignez votre discours et vos exemples concrets sur les valeurs et le mode de fonctionnement affichés dans l'offre pour renforcer le fit culturel perçu.",
    recommendations
  };
}

// Un seul score affiché partout : celui de l'analyse de compatibilité
// (matchInsights.score, IA). Le calcul local ne sert plus qu'au détail
// (compétences couvertes, domaines) et en repli si l'analyse n'a pas de score.
export function alignMatchScores(run) {
  const score = run?.matchInsights?.score;
  if (!run || typeof score !== "number" || !run.summary) return run;
  const verdict = typeof run.matchInsights.verdict === "string" && run.matchInsights.verdict ? run.matchInsights.verdict : run.summary.verdict;
  const best = run.bestMatch ? { ...run.bestMatch, score, verdict } : run.bestMatch;
  const ranked = Array.isArray(run.rankedOffers) && run.rankedOffers.length
    ? run.rankedOffers.map((item, index) => (index === 0 ? { ...item, score, verdict } : item))
    : run.rankedOffers;
  return { ...run, summary: { ...run.summary, globalScore: score, verdict }, bestMatch: best, rankedOffers: ranked, portfolioScore: score };
}

export function runMatching({ user, cvRecord, offerText, offers, premiumAccess }) {
  const customOffer = extractOfferSummary(offerText);
  const candidateSkills = unique([
    ...(user.profile?.skills || []),
    ...(cvRecord?.parsed?.skills || [])
  ]);

  const candidate = {
    skills: candidateSkills,
    experienceYears: Math.max(user.profile?.experienceYears || 0, cvRecord?.parsed?.experienceYears || 0),
    education: user.profile?.education || cvRecord?.parsed?.education || "",
    targetRole: user.profile?.targetRole || "",
    sector: user.profile?.sector || ""
  };

  // Uniquement l'offre réellement analysée par le candidat (aucune offre d'exemple).
  const allOffers = [customOffer, ...(offers || []).filter((offer) => offer?.id && !String(offer.id).startsWith("off-00"))];
  const scored = allOffers.map((offer) => scoreOffer({ candidate, offer, premiumAccess }));
  scored.sort((a, b) => b.score - a.score);

  const bestMatch = scored[0];
  const domainScores = computeDomainScores(candidate.skills, bestMatch.offer.skills);
  const { strengths, gaps } = pickStrengthsAndGaps(bestMatch);
  const recommendations = buildRecommendations(bestMatch, premiumAccess);

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
      subtitle: `${bestMatch.offer.company} · ${bestMatch.offer.title} · ${bestMatch.offer.contract}`
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
