import { DOMAIN_MAP, EDUCATION_LEVELS, SKILL_KEYWORDS } from "../data/skills";

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

function intersect(sourceA, sourceB) {
  const a = new Set(sourceA);
  return sourceB.filter((item) => a.has(item));
}

function educationRank(level) {
  const idx = EDUCATION_LEVELS.indexOf(normalize(level));
  return idx === -1 ? 0 : idx;
}

function extractOfferFromText(text) {
  const normalized = normalize(text);
  const skills = SKILL_KEYWORDS.filter((skill) => normalized.includes(skill));
  const yearsMatch = normalized.match(/(\d+)\s*(ans|an|years|year)/);
  const experienceMin = yearsMatch ? Number(yearsMatch[1]) : 1;
  const education = EDUCATION_LEVELS.find((level) => normalized.includes(level)) || "bac+5";

  return {
    id: "custom-offer",
    company: "Offre importée",
    title: "Poste personnalisé",
    location: "Non précisé",
    contract: "À définir",
    premium: false,
    sector: "Général",
    experienceMin,
    education,
    skills: skills.length ? unique(skills) : ["python", "ml", "communication"],
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
  const verdict = score >= 75 ? "excellent" : score >= 60 ? "bon" : score >= 45 ? "moyen" : "à renforcer";

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

function buildRecommendations(bestMatch, premiumAccess) {
  const recos = [];

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

export function runMatching({ user, cvRecord, offerText, offers, premiumAccess }) {
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
    sector: user.profile?.sector || ""
  };

  const allOffers = [customOffer, ...offers];
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
