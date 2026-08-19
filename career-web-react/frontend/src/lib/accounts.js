// Libellés lisibles des types de compte (student, recruiter_firm, admin...),
// utilisés dans toute l'app (profil, admin, école...).
export const ACCOUNT_LABELS = {
  fr: {
    student: "Candidat/Étudiant",
    candidate: "Candidat",
    recruiter_firm: "Cabinet de recrutement",
    recruiter_internal: "Recruteur interne",
    company: "Entreprise",
    school: "École / Université",
    coach: "Coach carrière",
    other: "Autre",
    admin: "Administrateur"
  },
  en: {
    student: "Candidate/Student",
    candidate: "Candidate",
    recruiter_firm: "Recruitment agency",
    recruiter_internal: "Internal recruiter",
    company: "Company",
    school: "School / University",
    coach: "Career coach",
    other: "Other",
    admin: "Administrator"
  }
};

export function getAccountLabel(accountType, language = "fr") {
  return ACCOUNT_LABELS[language]?.[accountType] || ACCOUNT_LABELS.fr[accountType] || ACCOUNT_LABELS.fr.other;
}
