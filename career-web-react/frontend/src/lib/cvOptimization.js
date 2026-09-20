// Fusionne le résultat d'optimizeCvForAts (optimizedHeadline/Summary,
// experiences[] réécrites, prioritizedSkills) dans un cvReview complet.
// Extrait de CvPages.jsx (handleAtsApply) pour être réutilisé tel quel
// par la page CV + Lettre, qui a besoin de la même transformation pour
// dériver son aperçu — sans dupliquer la logique de correspondance par
// nom d'entreprise (experiences[].company).
export function mergeCvAtsOptimization(cvReview, atsOptimization) {
  if (!cvReview) return cvReview;
  if (!atsOptimization) return cvReview;

  const compact = (value) => String(value || "").toLowerCase().trim();
  const nextExperiences = (cvReview.experiences || []).map((exp) => {
    const match = (atsOptimization.experiences || []).find((item) => compact(item.company) === compact(exp.company));
    return match ? { ...exp, description: match.optimizedDescription } : exp;
  });

  return {
    ...cvReview,
    headline: atsOptimization.optimizedHeadline || cvReview.headline,
    summary: atsOptimization.optimizedSummary || cvReview.summary,
    skills: atsOptimization.prioritizedSkills?.length ? atsOptimization.prioritizedSkills : cvReview.skills,
    experiences: nextExperiences
  };
}
