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

export function accountToForm(user) {
  const account = user?.account || {};
  const details = account.details || {};
  return {
    accountType: account.accountType || user?.roleType || "candidate",
    phone: account.phone || "",
    city: account.city || "",
    country: account.country || "",
    currentTitle: details.currentTitle || "",
    targetRole: details.targetRole || "",
    experienceYears: details.experienceYears || 0,
    schoolName: details.schoolName || "",
    studyLevel: details.studyLevel || "",
    graduationYear: details.graduationYear || "",
    contractPreference: details.contractPreference || "",
    availability: details.availability || "",
    portfolioUrl: details.portfolioUrl || "",
    linkedinUrl: details.linkedinUrl || "",
    organizationName: details.organizationName || "",
    recruiterRole: details.recruiterRole || "",
    hiringVolume: details.hiringVolume || "",
    industry: details.industry || "",
    website: details.website || "",
    organizationType: details.organizationType || "",
    department: details.department || "",
    sizeRange: details.sizeRange || "",
    contactRole: details.contactRole || "",
    notes: details.notes || ""
  };
}

export function buildAccountPatch(form) {
  const accountType = form.accountType || "candidate";
  const patch = {
    accountType,
    phone: form.phone,
    city: form.city,
    country: form.country,
    onboardingCompleted: true
  };

  if (accountType === "candidate" || accountType === "student") {
    patch.details = {
      currentTitle: form.currentTitle,
      targetRole: form.targetRole,
      experienceYears: Number(form.experienceYears || 0),
      schoolName: form.schoolName,
      studyLevel: form.studyLevel,
      graduationYear: form.graduationYear ? Number(form.graduationYear) : null,
      contractPreference: form.contractPreference,
      availability: form.availability,
      portfolioUrl: form.portfolioUrl,
      linkedinUrl: form.linkedinUrl
    };
    return patch;
  }

  if (accountType === "recruiter_firm" || accountType === "recruiter_internal") {
    patch.details = {
      organizationName: form.organizationName,
      recruiterRole: form.recruiterRole,
      hiringVolume: form.hiringVolume,
      industry: form.industry,
      website: form.website
    };
    return patch;
  }

  patch.details = {
    organizationName: form.organizationName,
    organizationType: form.organizationType || accountType,
    department: form.department,
    website: form.website,
    sizeRange: form.sizeRange,
    industry: form.industry,
    contactRole: form.contactRole,
    notes: form.notes
  };
  return patch;
}

export function getUsernameValidation(username, language = "fr") {
  const value = String(username || "").trim();
  if (!value) {
    return language === "en" ? "Username is required." : "Le nom d'utilisateur est obligatoire.";
  }
  if (!/^[a-z0-9_-]{3,30}$/i.test(value)) {
    return language === "en"
      ? "Use 3 to 30 characters: letters, numbers, - or _."
      : "Utilise 3 à 30 caractères : lettres, chiffres, - ou _.";
  }
  return "";
}
