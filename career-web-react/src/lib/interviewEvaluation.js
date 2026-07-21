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

// Voir cvService.js pour le détail : la police standard de jsPDF n'encode
// qu'en WinAnsi (proche Latin-1), donc les flèches/puces/guillemets typographiques
// corrompent le rendu si on ne les remplace pas avant l'envoi à jsPDF.
function sanitizeForPdf(text) {
  return String(text || "")
    .replace(/[\u2192\u21D2\u279C\u27A4]/g, "->")
    .replace(/[\u2190\u21D0]/g, "<-")
    .replace(/[\u2022\u25CF\u25E6\u2023]/g, "-")
    .replace(/[\u2018\u2019\u201A\u2032]/g, "'")
    .replace(/[\u201C\u201D\u201E\u2033]/g, '"')
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/\u2026/g, "...")
    .replace(/[\u2713\u2714]/g, "OK")
    .replace(/[^\u0000-\u00FF]/g, "");
}

/**
 * Génère un rapport PDF détaillé d'une session d'entretien (transcript complet
 * question/réponse/score/feedback), et une synthèse de l'historique des sessions
 * précédentes si fourni. Même approche que l'export CV (jsPDF, 100% local,
 * aucun coût), chargé en dynamic import.
 */
export async function downloadInterviewReportPdf({ personaName, personaSubtitle, transcript = [], history = [] }) {
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
    const lines = doc.splitTextToSize(sanitizeForPdf(text), contentWidth);
    lines.forEach((line) => {
      ensureSpace(gap);
      doc.text(line, margin, y);
      y += gap;
    });
  }

  const summary = summarizeSession(transcript.map((t) => ({ score: t.score })));

  writeParagraph("Rapport de simulation d'entretien", { size: 16, bold: true, gap: 20 });
  writeParagraph(`Généré par Career_App le ${new Date().toLocaleDateString("fr-FR")}`, {
    size: 9,
    color: [110, 110, 110],
    gap: 13
  });
  writeParagraph(`Persona : ${personaName || "—"} — ${personaSubtitle || ""}`, { size: 10, color: [80, 80, 80], gap: 16 });
  writeParagraph(`Score de session : ${summary.averageScore}/100 (${summary.label})`, { size: 12, bold: true, gap: 20 });

  writeParagraph("DÉTAIL DES ÉCHANGES", { size: 11, bold: true, gap: 16 });
  transcript.forEach((entry, idx) => {
    ensureSpace(16);
    writeParagraph(`Question ${idx + 1} : ${entry.question}`, { size: 10, bold: true, gap: 13 });
    writeParagraph(`Réponse : ${entry.answer}`, { size: 9.5, color: [60, 60, 60], gap: 12 });
    writeParagraph(`Score : ${entry.score}/100`, { size: 9.5, color: [79, 70, 229], bold: true, gap: 12 });
    (entry.feedback || []).forEach((point) => {
      writeParagraph(`• ${point}`, { size: 9, color: [100, 100, 100], gap: 11.5 });
    });
    y += 6;
  });

  if (history.length) {
    y += 6;
    ensureSpace(20);
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, y, pageWidth - margin, y);
    y += 18;

    writeParagraph("HISTORIQUE DES SESSIONS PRÉCÉDENTES", { size: 11, bold: true, gap: 16 });
    history.slice(0, 15).forEach((attempt) => {
      const date = new Date(attempt.createdAt).toLocaleDateString("fr-FR");
      writeParagraph(
        `${date} — ${attempt.personaName || attempt.track} — ${attempt.averageScore}/100 (${attempt.label || ""})`,
        { size: 9.5, color: [60, 60, 60], gap: 13 }
      );
    });
  }

  doc.save(`rapport-entretien-${(personaName || "session").toLowerCase().replace(/\s+/g, "-")}.pdf`);
}
