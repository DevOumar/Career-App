// Évaluation heuristique d'une réponse d'entretien (Phase 1, sans appel à un LLM).
// Objectif : remplacer l'affichage systématique d'une "réponse modèle" fixe par un
// retour réellement dépendant de ce que l'utilisateur a écrit, tout en restant
// cohérent avec la logique "MVP local-first" du reste de l'application (aucune
// dépendance API payante).

function normalize(text) {
  return String(text || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

const STAR_MARKERS = {
  situation: ["contexte", "situation", "projet", "chez", "lors", "j'etais", "jetais"],
  action: ["j'ai", "jai", "action", "mis en place", "developpe", "concu", "pilote", "organise"],
  resultat: ["resultat", "impact", "grace a", "au final", "cela a permis", "%", "adoption", "reduit", "augmente"]
};

function detectStarStructure(normalizedAnswer) {
  const hasSituation = STAR_MARKERS.situation.some((m) => normalizedAnswer.includes(m));
  const hasAction = STAR_MARKERS.action.some((m) => normalizedAnswer.includes(m));
  const hasResult = STAR_MARKERS.resultat.some((m) => normalizedAnswer.includes(m));
  const count = [hasSituation, hasAction, hasResult].filter(Boolean).length;
  return { hasSituation, hasAction, hasResult, count };
}

/**
 * Évalue une réponse par rapport à une question du script d'entretien.
 * Retourne un score /100 et une liste de retours actionnables.
 * Composantes : couverture de mots-clés (jusqu'à 50 pts), longueur/développement
 * (jusqu'à 25 pts), structure STAR si attendue (jusqu'à 25 pts, sinon reportés
 * sur la longueur).
 */
export function evaluateAnswer({ answer, step }) {
  const text = String(answer || "").trim();
  const normalized = normalize(text);
  const wordCount = text.split(/\s+/).filter(Boolean).length;
  const keywords = step.keywords || [];
  const feedback = [];

  // 1) Couverture de mots-clés attendus pour cette question
  const matchedKeywords = keywords.filter((kw) => normalized.includes(normalize(kw)));
  const keywordRatio = keywords.length ? matchedKeywords.length / keywords.length : 0.5;
  const keywordScore = Math.round(keywordRatio * 50);

  if (keywords.length) {
    if (keywordRatio >= 0.6) {
      feedback.push("Bonne couverture des points attendus pour cette question.");
    } else {
      const missing = keywords.filter((kw) => !matchedKeywords.includes(kw)).slice(0, 3);
      feedback.push(`Pense à aborder : ${missing.join(", ")}.`);
    }
  }

  // 2) Longueur / niveau de développement
  let lengthScore = 0;
  if (wordCount === 0) {
    feedback.push("Aucune réponse détectée.");
  } else if (wordCount < 15) {
    lengthScore = 5;
    feedback.push("Réponse trop courte : développe avec un exemple concret.");
  } else if (wordCount < 40) {
    lengthScore = 15;
    feedback.push("Réponse correcte mais qui gagnerait à être plus détaillée.");
  } else if (wordCount <= 150) {
    lengthScore = 25;
    feedback.push("Longueur de réponse adaptée à l'exercice.");
  } else {
    lengthScore = 18;
    feedback.push("Réponse un peu longue : vise la concision, surtout à l'oral.");
  }

  // 3) Structure STAR si la question s'y prête
  let starScore = 0;
  if (step.starHint) {
    const star = detectStarStructure(normalized);
    starScore = Math.round((star.count / 3) * 25);
    if (star.count === 3) {
      feedback.push("Structure Situation / Action / Résultat bien présente.");
    } else {
      const missingParts = [];
      if (!star.hasSituation) missingParts.push("le contexte (Situation)");
      if (!star.hasAction) missingParts.push("ce que tu as fait (Action)");
      if (!star.hasResult) missingParts.push("le résultat obtenu (Résultat)");
      feedback.push(`Structure STAR incomplète : précise ${missingParts.join(" et ")}.`);
    }
  } else {
    // Question non-STAR : les points sont reportés sur la longueur/qualité déjà comptée.
    starScore = 0;
  }

  // Score final /100 : mots-clés (50) + longueur (25) + un troisième axe (25) qui est
  // la structure STAR si elle est attendue pour cette question, ou sinon un second
  // regard sur la pertinence (couverture de mots-clés), pour ne pas compter deux fois
  // la longueur de la réponse.
  const relevanceBonus = Math.round(keywordRatio * 25);
  const finalScore = Math.min(100, keywordScore + lengthScore + (step.starHint ? starScore : relevanceBonus));

  return {
    score: finalScore,
    wordCount,
    matchedKeywords,
    feedback
  };
}

/**
 * Agrège les scores d'une session (un persona, plusieurs questions) en une moyenne
 * et un libellé, pour affichage dans l'onglet Entretiens et suivi de progression.
 */
export function summarizeSession(answerEvaluations) {
  if (!answerEvaluations.length) {
    return { averageScore: 0, label: "Aucune réponse" };
  }
  const averageScore = Math.round(
    answerEvaluations.reduce((acc, item) => acc + item.score, 0) / answerEvaluations.length
  );
  const label =
    averageScore >= 75 ? "Excellent" : averageScore >= 55 ? "Bon" : averageScore >= 35 ? "À travailler" : "Insuffisant";
  return { averageScore, label };
}
