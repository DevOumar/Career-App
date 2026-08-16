import React, { useEffect, useMemo, useRef, useState } from "react";
import Swal from "sweetalert2";
import "sweetalert2/dist/sweetalert2.min.css";
import {
  activatePlan,
  activatePremiumSubscription,
  addCvRecord,
  analyzeMatch,
  changeUserPassword,
  consumeTokens,
  createStripeCheckoutSession,
  deleteUserAccount,
  extractCvFile,
  findEmail,
  extractJobOffer,
  generateCoverLetter,
  optimizeCvForAts,
  listJobApplications,
  createJobApplication,
  updateJobApplication,
  deleteJobApplication,
  getSatisfactionStatus,
  dismissSatisfactionSurvey,
  submitSatisfactionSurvey,
  getAdminSatisfaction,
  listCoverLetters,
  saveCoverLetter,
  updateCoverLetter,
  deleteCoverLetter,
  getLatestMatchRun,
  getHealth,
  getMatchFeedback,
  getPremiumSnapshot,
  getUserFromSession,
  createAdminUser,
  deleteAdminUser,
  getAdminActivityLog,
  getAdminAiMonitoring,
  getAdminAiSamples,
  getAdminCvs,
  getAdminFinance,
  getAdminLicenseCodes,
  getAdminMatches,
  getAdminOrgAccounts,
  getAdminOverview,
  getAdminNotifications,
  getAdminQuality,
  getApiBase,
  getPlanOverrides,
  getAdminPlans,
  updateAdminPlan,
  resetAdminPlan,
  refundAdminTransaction,
  getAdminSettings,
  revokeAdminLicenseCode,
  restoreAdminLicenseCode,
  getAdminAnnouncementAudienceCount,
  getAdminAnnouncements,
  sendAdminAnnouncement,
  deleteAdminCv,
  reanalyzeAdminCv,
  updateAdminSetting,
  updateAdminUser,
  updateAdminUserStatus,
  linkGoogleAccount,
  listAdminUsers,
  getSchoolOverview,
  getSchoolStudents,
  removeSchoolStudent,
  getSchoolLicense,
  getSchoolInsights,
  getSchoolInvitations,
  getSchoolNotifications,
  markSchoolNotificationsRead,
  getSchoolProfile,
  updateSchoolProfile,
  getSchoolPromotions,
  createSchoolPromotion,
  deleteSchoolPromotion,
  updateSchoolPromotionStudent,
  getSchoolReports,
  generateSchoolReport,
  sendSchoolInvitation,
  listOffers,
  listUserCvs,
  loginUser,
  loginWithGoogle,
  logoutUser,
  negotiationReply,
  listNegotiationConversations,
  saveNegotiationConversation,
  updateNegotiationConversation,
  deleteNegotiationConversation,
  redeemLicenseCode,
  registerUser,
  removeConnectedAccount,
  removeSecondaryEmail,
  requestLoginCode,
  requestSecondaryEmailCode,
  saveMatchRun,
  setPrimaryEmail,
  submitMatchFeedback,
  updateUserAccount,
  updateUserAvatar,
  updateUserProfile,
  verifyLoginCode,
  verifySecondaryEmail
} from "./lib/inMemoryDb";
import { createCvRecord, fileToBase64, parseCvText, readFileAsText } from "./lib/cvService";
import { extractOfferSummary, runMatching } from "./lib/matchingService";
import { INTERVIEW_SCRIPTS } from "./lib/interviewScripts";
import { PLANS, PLAN_SEGMENTS, getPlanById } from "./data/plans";

const NAV_ITEMS = [
  { id: "home", label: { fr: "Accueil", en: "Home" }, always: true, icon: "home" },
  { id: "import", label: { fr: "Importer CV", en: "Import CV" }, always: true, icon: "upload" },
  { id: "candidatures", label: { fr: "Candidatures", en: "Applications" }, always: true, icon: "briefcase" },
  { id: "entretiens", label: { fr: "Entretiens", en: "Interviews" }, icon: "chat" },
  { id: "lettre", label: { fr: "Lettre IA", en: "AI Letter" }, icon: "mail" },
  { id: "negociation", label: { fr: "Négociation", en: "Negotiation" }, icon: "scale" },
  { id: "email-finder", label: { fr: "Email Scout", en: "Email Scout" }, icon: "network" },
  { id: "historique", label: { fr: "Historique CV", en: "CV history" }, always: true, icon: "history" },
  { id: "tarifs", label: { fr: "Tarifs", en: "Pricing" }, always: true, icon: "pricetag" }
];

const VALID_APP_PAGE_IDS = new Set([
  "home",
  "import",
  "profil",
  "analyse",
  "offres",
  "candidatures",
  "entretiens",
  "lettre",
  "negociation",
  "email-finder",
  "historique",
  "tarifs"
]);

// Lit la page courante depuis le hash de l'URL (#/app/<clé>/<page>) au tout
// premier rendu. Sans ça, un rechargement de page (F5) réinitialise
// toujours activePage à "home" par défaut, et l'effet qui synchronise le
// hash avec activePage écrase alors l'URL réelle avec "home" avant même que
// l'utilisateur ait pu s'en apercevoir — il se retrouve éjecté du module où
// il était.
function readInitialActivePage() {
  if (typeof window === "undefined") return "home";
  const match = window.location.hash.match(/^#\/app\/[^/]+\/([a-z-]+)/i);
  const pageId = match?.[1];
  return pageId && VALID_APP_PAGE_IDS.has(pageId) ? pageId : "home";
}

function createOpaqueRouteKey(length = 48) {
  const alphabet = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join("");
}

function rememberLastAuthMethod(method) {
  try {
    localStorage.setItem("career_app_last_auth_method", method);
  } catch (_error) {
    // localStorage unavailable, ignore
  }
}

function getLastAuthMethod() {
  try {
    return localStorage.getItem("career_app_last_auth_method") || "";
  } catch (_error) {
    return "";
  }
}

function getOpaqueRouteKey() {
  const storageKey = "career_app_route_key";
  const existing = localStorage.getItem(storageKey);
  if (/^[a-zA-Z0-9]{40,80}$/.test(existing || "")) return existing;
  const next = createOpaqueRouteKey();
  localStorage.setItem(storageKey, next);
  return next;
}

const GOOGLE_CLIENT_ID = String(import.meta.env?.VITE_GOOGLE_CLIENT_ID || "").trim();

const CURRENCY_OPTIONS = [
  { id: "EUR", label: "EUR (€)", symbol: "€", rate: 1, position: "after" },
  { id: "USD", label: "USD ($)", symbol: "$", rate: 1.08, position: "before" },
  { id: "GBP", label: "GBP (£)", symbol: "£", rate: 0.85, position: "before" }
];

function getCurrencyOption(currency) {
  return CURRENCY_OPTIONS.find((item) => item.id === currency) || CURRENCY_OPTIONS[0];
}

function formatAmountInCurrency(amountEur, currency, { decimals } = {}) {
  const option = getCurrencyOption(currency);
  const converted = Number(amountEur) * option.rate;
  const hasDecimals = decimals ?? !Number.isInteger(converted);
  const formatted = converted.toLocaleString("fr-FR", {
    minimumFractionDigits: hasDecimals ? 2 : 0,
    maximumFractionDigits: hasDecimals ? 2 : 0
  });
  return option.position === "before" ? `${option.symbol}${formatted}` : `${formatted} ${option.symbol}`;
}

function getCurrency() {
  try {
    return localStorage.getItem("career_app_currency") || "EUR";
  } catch (_error) {
    return "EUR";
  }
}

const THEME_PRESETS = [
  {
    id: "blue",
    label: { fr: "Bleu (défaut)", en: "Blue (default)" },
    swatch: "#2f5bff",
    vars: { "--primary": "#2f5bff", "--primary-2": "#6d7cff", "--primary-ink": "#101a4f", "--bg-accent": "#edf1ff" }
  },
  {
    id: "violet",
    label: { fr: "Violet", en: "Violet" },
    swatch: "#7c3aed",
    vars: { "--primary": "#7c3aed", "--primary-2": "#a78bfa", "--primary-ink": "#2e1065", "--bg-accent": "#f3e8ff" }
  },
  {
    id: "green",
    label: { fr: "Émeraude", en: "Emerald" },
    swatch: "#0e9f6e",
    vars: { "--primary": "#0e9f6e", "--primary-2": "#34d399", "--primary-ink": "#052e2b", "--bg-accent": "#ecfdf5" }
  },
  {
    id: "orange",
    label: { fr: "Corail", en: "Coral" },
    swatch: "#ea580c",
    vars: { "--primary": "#ea580c", "--primary-2": "#fb923c", "--primary-ink": "#431407", "--bg-accent": "#fff7ed" }
  },
  {
    id: "rose",
    label: { fr: "Framboise", en: "Raspberry" },
    swatch: "#db2777",
    vars: { "--primary": "#db2777", "--primary-2": "#f472b6", "--primary-ink": "#500724", "--bg-accent": "#fdf2f8" }
  },
  {
    id: "slate",
    label: { fr: "Ardoise", en: "Slate" },
    swatch: "#334155",
    vars: { "--primary": "#334155", "--primary-2": "#64748b", "--primary-ink": "#0f172a", "--bg-accent": "#f1f5f9" }
  }
];

function getTheme() {
  try {
    const stored = localStorage.getItem("career_app_theme");
    return THEME_PRESETS.some((item) => item.id === stored) ? stored : "blue";
  } catch (_error) {
    return "blue";
  }
}

function applyThemeVars(themeId) {
  const preset = THEME_PRESETS.find((item) => item.id === themeId) || THEME_PRESETS[0];
  const root = document.documentElement;
  Object.entries(preset.vars).forEach(([key, value]) => {
    root.style.setProperty(key, value);
  });
}

function getMode() {
  try {
    const stored = localStorage.getItem("career_app_mode");
    return stored === "dark" ? "dark" : "light";
  } catch (_error) {
    return "light";
  }
}

function getDensity() {
  try {
    const stored = localStorage.getItem("career_app_density");
    return stored === "compact" ? "compact" : "comfortable";
  } catch (_error) {
    return "comfortable";
  }
}

const LANGUAGE_OPTIONS = [
  { id: "fr", label: "FR", flagClass: "france" },
  { id: "en", label: "EN", flagClass: "uk" }
];

const LANDING_COPY = {
  fr: {
    login: "Se connecter",
    signup: "S'inscrire",
    heroTitleTop: "Construisez votre avenir",
    heroTitleAccent: "avec un CV mieux ciblé",
    heroText:
      "Importez votre CV, comparez-le à une offre, obtenez un score clair et préparez vos entretiens avec un parcours guidé.",
    cta: "Analyser mon CV gratuitement",
    freeCredits: "3 analyses offertes à l'inscription",
    trust: ["Confidentialité garantie", "Matching intelligent", "Fait pour les candidats"],
    profile: "Votre Profil",
    freePlan: "Plan gratuit",
    role: "Data Analyst Junior",
    company: "Paris · Alternance / CDI",
    match: "Excellent match",
    matchText: "Votre profil correspond aux attentes.",
    score: "Score CV",
    scoreValue: "Excellent",
    recruiter: "Recruteur cible",
    opportunities: "+15 offres",
    atsEyebrow: "Diagnostic CV intelligent",
    atsTitleA: "Comprenez votre CV",
    atsTitleB: "avant d'envoyer la candidature",
    atsText:
      "Career App transforme le CV et l'offre en lecture simple : score, mots-clés manquants, forces détectées et priorités d'amélioration.",
    atsPanelTitle: "Aperçu d'analyse",
    atsPanelHint: "Le module compare votre CV avec l'offre ciblée et prépare les prochaines actions.",
    featuresTitle: "Tout ce qu'il vous faut.",
    featuresText: "Une suite d'outils pour transformer un CV en candidatures mieux ciblées.",
    featureCards: [
      {
        title: "CV Optimizer",
        text: "Analyse CV/offre, score de compatibilité et recommandations concrètes.",
        tags: ["Analyse ATS", "Mots-clés", "Réécriture"]
      },
      {
        title: "Interview Coach",
        text: "Questions adaptées au poste, réponses modèles et feedback structuré.",
        tags: ["RH", "Technique", "Soft skills"]
      },
      {
        title: "Job Matching",
        text: "Classement des offres selon vos compétences, votre expérience et vos objectifs.",
        tags: ["Score", "Gaps", "Priorités"]
      }
    ],
    stepsTitle: "Comment ça marche ?",
    stepsText: "3 étapes simples vers votre prochain entretien",
    steps: [
      { title: "Analysez", text: "Importez votre CV et une offre d'emploi." },
      { title: "Optimisez", text: "Obtenez un score de match et des recommandations." },
      { title: "Préparez", text: "Entraînez-vous avec des questions ciblées." }
    ],
    careersTitle: "Explorer les carrières populaires",
    careerSubtitle: "Guide complet & analyse",
    faqEyebrow: "Questions fréquentes",
    faqTitle: "Des questions ?",
    faqText: "Réponses courtes et claires sur ce que Career App fait réellement.",
    faq: [
      {
        q: "Mon CV sera-t-il compatible ATS ?",
        a: "Le modèle Classique utilise une seule colonne et des titres standards, pensés pour être bien lus par la plupart des ATS. Le modèle Sidebar (photo, mise en page en colonnes) est plus visuel mais certains ATS stricts le lisent moins bien : on vous conseille le modèle Classique si vous postulez via un ATS. Le module d'optimisation IA repère aussi les mots-clés de l'offre encore absents de votre CV."
      },
      {
        q: "Puis-je importer un CV existant ?",
        a: "Oui. Importez votre CV (PDF, DOCX ou texte) : l'IA en extrait automatiquement votre profil (identité, expériences, formations, compétences) pour le pré-remplir. Vous gardez la main pour tout corriger avant d'enregistrer."
      },
      {
        q: "Générez-vous des lettres de motivation personnalisées ?",
        a: "Oui, depuis l'onglet Lettre IA : collez l'offre visée, l'IA rédige une lettre basée sur votre profil réel, que vous pouvez modifier avant de l'exporter."
      },
      {
        q: "Comment fonctionne le score de compatibilité avec une offre ?",
        a: "On compare vos compétences, votre expérience et votre formation avec les exigences réelles extraites de l'offre que vous collez, puis on calcule un score et la liste des compétences manquantes — jamais un chiffre générique."
      },
      {
        q: "Dans quels formats puis-je exporter mon CV ?",
        a: "Le PDF est le format proposé actuellement, depuis l'aperçu CV (modèle Classique ou Sidebar)."
      },
      {
        q: "Comment modifier ou résilier mon abonnement ?",
        a: "Contactez notre support depuis la page Contact : chaque demande liée à un abonnement est traitée manuellement pour l'instant."
      }
    ],
    footerText: "Career App aide les candidats à optimiser leur CV, cibler les bonnes offres et préparer leurs entretiens.",
    footerProduct: "Produit",
    footerCompany: "Entreprise",
    footerLegal: "Légal",
    linksProduct: ["Fonctionnalités", "Matching CV", "Entretiens", "Offres", "Tarifs", "FAQ"],
    linksCompany: ["À propos", "Contact", "Partenariats"],
    linksLegal: ["Confidentialité", "CGU", "Cookies", "Sécurité"]
  },
  en: {
    login: "Log in",
    signup: "Sign up",
    heroTitleTop: "Build your next step",
    heroTitleAccent: "with a sharper CV",
    heroText:
      "Upload your CV, compare it with a job post, get a clear score, and prepare interviews with a guided workflow.",
    cta: "Analyze my CV for free",
    freeCredits: "3 free analyses when you sign up",
    trust: ["Privacy first", "Smart matching", "Built for candidates"],
    profile: "Your Profile",
    freePlan: "Free plan",
    role: "Junior Data Analyst",
    company: "Paris · Internship / Full-time",
    match: "Excellent match",
    matchText: "Your profile matches the role expectations.",
    score: "CV score",
    scoreValue: "Excellent",
    recruiter: "Target recruiter",
    opportunities: "+15 jobs",
    atsEyebrow: "Smart CV diagnosis",
    atsTitleA: "Understand your CV",
    atsTitleB: "before sending the application",
    atsText:
      "Career App turns a CV and job post into a clear reading: score, missing keywords, detected strengths, and improvement priorities.",
    atsPanelTitle: "Analysis preview",
    atsPanelHint: "The module compares your CV with the target role and prepares the next actions.",
    featuresTitle: "Everything you need.",
    featuresText: "A focused toolkit to turn one CV into better targeted applications.",
    featureCards: [
      {
        title: "CV Optimizer",
        text: "CV/job analysis, compatibility score, and concrete recommendations.",
        tags: ["ATS analysis", "Keywords", "Rewrite"]
      },
      {
        title: "Interview Coach",
        text: "Role-based questions, model answers, and structured feedback.",
        tags: ["HR", "Technical", "Soft skills"]
      },
      {
        title: "Job Matching",
        text: "Rank jobs based on your skills, experience, and goals.",
        tags: ["Score", "Gaps", "Priorities"]
      }
    ],
    stepsTitle: "How it works",
    stepsText: "3 simple steps to your next interview",
    steps: [
      { title: "Analyze", text: "Import your CV and a job description." },
      { title: "Optimize", text: "Get a match score and recommendations." },
      { title: "Prepare", text: "Practice with targeted interview questions." }
    ],
    careersTitle: "Explore popular careers",
    careerSubtitle: "Complete guide & analysis",
    faqEyebrow: "Frequently asked questions",
    faqTitle: "Questions?",
    faqText: "Short, honest answers about what Career App actually does.",
    faq: [
      {
        q: "Will my CV be ATS-compatible?",
        a: "The Classic template uses a single column and standard section headers, designed to be read well by most ATS. The Sidebar template (photo, column layout) is more visual but some strict ATS parse it less reliably — we recommend the Classic template if you're applying through an ATS. The AI optimization module also flags job keywords still missing from your CV."
      },
      {
        q: "Can I import an existing CV?",
        a: "Yes. Upload your CV (PDF, DOCX, or text): the AI automatically extracts your profile (identity, experiences, education, skills) to pre-fill it. You stay in control to correct anything before saving."
      },
      {
        q: "Do you generate personalized cover letters?",
        a: "Yes, from the AI Letter tab: paste the target job posting and the AI drafts a letter based on your real profile, which you can edit before exporting."
      },
      {
        q: "How does the job match score work?",
        a: "We compare your skills, experience, and education against the actual requirements extracted from the job posting you paste, then compute a score and the list of missing skills — never a generic number."
      },
      {
        q: "What formats can I export my CV in?",
        a: "PDF is the format currently available, from the CV preview (Classic or Sidebar template)."
      },
      {
        q: "How do I change or cancel my subscription?",
        a: "Contact our support from the Contact page: subscription requests are currently handled manually."
      }
    ],
    footerText: "Career App helps candidates optimize CVs, target the right jobs, and prepare interviews.",
    footerProduct: "Product",
    footerCompany: "Company",
    footerLegal: "Legal",
    linksProduct: ["Features", "CV matching", "Interviews", "Jobs", "Pricing", "FAQ"],
    linksCompany: ["About", "Contact", "Partnerships"],
    linksLegal: ["Privacy", "Terms", "Cookies", "Security"]
  }
};

const AUTH_COPY = {
  fr: {
    helper: "Base PostgreSQL embarquée : comptes et onboarding sont stockés localement dans le dossier du projet.",
    login: "Se connecter",
    signup: "S'inscrire",
    platform: "Career Intelligence Platform",
    titleA: "Construis un profil",
    titleB: "qui débloque les",
    titleAccent: "meilleures offres",
    intro: "Onboarding intelligent, matching CV, recommandations et coaching entretien dans une vraie expérience SaaS.",
    create: "Créer le compte",
    role: "Choisir votre rôle",
    activate: "Activer votre parcours",
    email: "Email",
    password: "Mot de passe",
    firstName: "Prénom",
    lastName: "Nom",
    confirm: "Confirmation",
    accountType: "Type de compte",
    phone: "Téléphone",
    city: "Ville",
    country: "Pays",
    back: "Retour",
    continue: "Continuer",
    createAccount: "Créer mon compte",
    connect: "Connexion",
    identity: "Identité",
    account: "Type de compte",
    jobDetails: "Détails métier"
  },
  en: {
    helper: "Embedded PostgreSQL: accounts and onboarding are stored locally in the project folder.",
    login: "Log in",
    signup: "Sign up",
    platform: "Career Intelligence Platform",
    titleA: "Build a profile",
    titleB: "that unlocks",
    titleAccent: "better opportunities",
    intro: "Smart onboarding, CV matching, recommendations, and interview coaching in a real SaaS experience.",
    create: "Create account",
    role: "Choose your role",
    activate: "Start your journey",
    email: "Email",
    password: "Password",
    firstName: "First name",
    lastName: "Last name",
    confirm: "Confirmation",
    accountType: "Account type",
    phone: "Phone",
    city: "City",
    country: "Country",
    back: "Back",
    continue: "Continue",
    createAccount: "Create my account",
    connect: "Log in",
    identity: "Identity",
    account: "Account type",
    jobDetails: "Role details"
  }
};

const CAREER_CARDS = [
  { title: "Data Analyst", score: 91, skills: "Python · SQL · Power BI", tone: "green" },
  { title: "Software Engineer", score: 87, skills: "React · Node · API", tone: "blue" },
  { title: "Product Manager", score: 78, skills: "Roadmap · Discovery · KPI", tone: "violet" },
  { title: "Marketing Manager", score: 74, skills: "SEO · CRM · Analytics", tone: "amber" },
  { title: "UX/UI Designer", score: 82, skills: "Figma · Research · Prototype", tone: "violet" },
  { title: "Project Manager", score: 80, skills: "Agile · Planning · Risques", tone: "blue" },
  { title: "HR Manager", score: 76, skills: "Sourcing · Paie · Relations", tone: "green" },
  { title: "Business Analyst", score: 84, skills: "Process · Data · Reporting", tone: "amber" }
];

const ACCOUNT_TYPE_OPTIONS = [
  { value: "student", label: "Étudiant", description: "Recherche de stage, alternance ou premier emploi." },
  { value: "candidate", label: "Candidat", description: "Recherche active d'opportunités professionnelles." },
  { value: "recruiter_firm", label: "Cabinet de recrutement", description: "Sourcing et placement pour des clients." },
  { value: "recruiter_internal", label: "Recruteur interne", description: "Talent acquisition au sein d'une entreprise." },
  { value: "company", label: "Entreprise", description: "Équipe RH ou manager qui publie des offres." },
  { value: "school", label: "École / Université", description: "Placement étudiants et partenariat entreprises." },
  { value: "coach", label: "Coach carrière", description: "Accompagnement CV, préparation entretien, mentoring." },
  { value: "other", label: "Autre", description: "Autre profil professionnel lié à l'emploi." }
];

const ACCOUNT_LABELS = {
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

const APP_COPY = {
  fr: {
    menu: {
      profile: "Mon profil",
      security: "Sécurité / Mot de passe",
      logout: "Déconnexion"
    },
    security: {
      title: "Sécurité du compte",
      text: "Changez votre mot de passe de connexion.",
      current: "Mot de passe actuel",
      next: "Nouveau mot de passe",
      confirm: "Confirmation",
      submit: "Mettre à jour"
    },
    home: {
      userFallback: "Utilisateur",
      eyebrow: "Assistant carrière nouvelle génération",
      titleA: "Décrochez le poste qui vous correspond,",
      titleB: "avec un parcours",
      titleAccent: "guidé par la data",
      intro: "Importez votre CV, collez une offre, et laissez l'IA calculer votre score de match, vos mots-clés manquants et votre fit culturel avant de vous entraîner à l'entretien.",
      start: "Commencer",
      tickerLabel: "Informations personnalisées",
      welcome: "Bienvenue",
      accountType: "Type de compte",
      profileDone: "Profil complété",
      profilePct: "Profil complété à",
      noMatch: "Aucun matching lancé pour le moment",
      latestMatch: "Dernier matching",
      objective: "Objectif",
      addTarget: "Ajoutez votre rôle cible dans Profil",
      planLabel: "Plan",
      tokens: "jetons",
      unlimitedTokens: "illimité",
      schoolMember: "🎓 Compte activé via",
      seeTarifs: "Voir les tarifs",
      importedCv: "CV importé(s)",
      noCv: "Aucun CV importé",
      workflow: [
        { number: "01", title: "Importer", text: "Votre CV et l'offre visée" },
        { number: "02", title: "Analyser", text: "Score IA, mots-clés manquants, fit culturel" },
        { number: "03", title: "Passer à l'action", text: "Recommandations, réseautage, CV optimisé en PDF" },
        { number: "04", title: "S'entraîner", text: "Simulateur d'entretiens avec feedback" }
      ]
    },
    import: {
      title: "Importer votre CV",
      text: "Téléchargez votre CV, vérifiez les informations extraites, puis collez l'offre cible pour lancer le matching.",
      steps: [
        { title: "Télécharger CV", text: "Extraction automatique" },
        { title: "Réviser le profil", text: "Infos modifiables" },
        { title: "Poste visé", text: "Description de l'offre" },
        { title: "Analyse", text: "Match & Optimisation" }
      ],
      uploadTitle: "Téléchargez votre CV",
      uploadText: "Nous extrayons les informations pour préparer votre profil candidat.",
      analysingTitle: "Analyse de votre CV...",
      analysingText: "Cela prend généralement 10-20 secondes.",
      reviewTitle: "Révision de l'extraction",
      reviewText: "Vérifiez et corrigez les informations avant de les enregistrer.",
      reimport: "Réimporter le CV",
      saveContinue: "Enregistrer & continuer",
      personalInfo: "Informations personnelles",
      summary: "Résumé professionnel",
      skillsLanguages: "Compétences & langues",
      experiences: "Expériences",
      educationBlock: "Formation",
      certifications: "Certifications",
      interests: "Centres d'intérêt",
      addSkill: "Ajouter compétence",
      addLanguage: "Ajouter langue",
      addExperience: "Ajouter expérience",
      addEducation: "Ajouter formation",
      addCertification: "Ajouter certification",
      addInterest: "Ajouter intérêt",
      jobTitle: "Poste visé",
      jobText: "Collez la description complète du poste ci-dessous.",
      jobDescription: "Description du poste",
      jobSummaryTitle: "Résumé du poste",
      jobSummaryText: "Vérifiez les détails extraits avant de lancer l'analyse.",
      technicalSkills: "Compétences techniques",
      softSkills: "Soft skills",
      noSkillsDetected: "Aucune détectée dans le texte collé",
      backToEdit: "Retour à l'édition",
      reviewJob: "Vérifier le poste",
      analyseJob: "Analyser le job",
      reviewingJob: "Analyse de l'offre...",
      extractionReady: "Extraction prête à réviser.",
      chooseFile: "Choisir un fichier CV",
      fileDone: "CV détecté et analysé",
      formats: "Formats acceptés: txt, pdf, doc, docx",
      history: "Historique CV",
      emptyHistory: "Aucun CV enregistré.",
      offerTitle: "Coller l'offre cible",
      offerText: "Le matching se base sur cette offre et compare aussi des offres marketplace.",
      offerPlaceholder: "Collez l'offre d'emploi complète ici...",
      chars: "caractères",
      ready: "Prêt",
      minimum: "Minimum 50 caractères",
      analysing: "Analyse en cours...",
      analyse: "Analyser mon profil",
      matchingTitle: "Analyse du matching en cours...",
      matchingText: "L'IA compare votre profil à l'offre. Cela prend généralement 10-20 secondes.",
      matchScoreLabel: "Score de compatibilité",
      matchStrengths: "Points forts",
      matchMissingKeywords: "Mots-clés manquants",
      matchCulturalFit: "Fit culturel",
      matchRecommendations: "Recommandations stratégiques",
      matchNoMissingKeywords: "Aucun mot-clé majeur ne manque, bravo.",
      matchResultsTitle: "Résultats d'Analyse",
      matchResultsSubtitle: "Détail de votre score de match.",
      matchFeedbackQuestion: "Cette analyse vous a-t-elle été utile ?",
      matchFeedbackYes: "Oui",
      matchFeedbackNo: "Non",
      matchFeedbackThanks: "Merci pour votre retour !",
      matchNetworkingTitle: "Opportunités Réseautage",
      matchNetworkingText: "Connectez-vous avec des employés chez {company} pour augmenter vos chances.",
      matchNetworkingButton: "Trouver des contacts dans l'entreprise",
      matchNetworkingSearching: "Préparation des recherches...",
      matchNetworkingEmpty: "Career App n'a pas accès à un annuaire LinkedIn : voici des recherches ciblées à lancer vous-même en un clic.",
      matchNetworkingOpenLinkedin: "Chercher sur LinkedIn",
      matchNetworkingRoleLabel: "Personnes au poste visé",
      matchNetworkingRecruiterLabel: "Recruteurs",
      matchNetworkingHrLabel: "Équipe RH",
      matchCvLanguageLabel: "Langue du CV",
      matchPreviewCv: "Prévisualiser CV",
      matchHidePreview: "Masquer l'aperçu",
      matchShare: "Partager",
      matchShareCopied: "Résumé copié dans le presse-papiers.",
      matchDownloadPdf: "Télécharger PDF",
      matchCvPreviewTitle: "Aperçu CV Optimisé",
      matchCvPreviewEmpty: "Importez et révisez votre CV pour voir un aperçu ici.",
      cvPreviewSummary: "Résumé professionnel",
      cvPreviewExperience: "Expérience",
      cvPreviewEducation: "Formation",
      cvPreviewTechnicalSkills: "Compétences techniques",
      cvPreviewSoftSkills: "Compétences comportementales",
      cvPreviewLanguages: "Langues",
      cvPreviewCertifications: "Certifications",
      cvPreviewInterests: "Centres d'intérêt",
      cvPreviewProjects: "Projets",
      cvPreviewSocial: "Réseaux sociaux",
      cvPreviewPortfolio: "Portfolio",
      cvTemplateClassic: "Classique",
      cvTemplateSidebar: "Colonne latérale"
    },
    profile: {
      addHeadline: "Ajoute un titre professionnel cible.",
      completeness: "Complétude du profil",
      plan: "Plan",
      professional: "Profil professionnel",
      headline: "Titre / headline",
      targetRole: "Rôle cible",
      sector: "Secteur visé",
      location: "Localisation",
      experience: "Expérience (ans)",
      education: "Niveau d'études",
      skills: "Compétences (séparées par des virgules)",
      languages: "Langues (séparées par des virgules)",
      saveProfile: "Sauvegarder le profil",
      accountSettings: "Paramètres compte (SaaS)",
      accountType: "Type de compte",
      phone: "Téléphone",
      city: "Ville",
      country: "Pays",
      saveAccount: "Sauvegarder le compte",
      premiumTitle: "Offre premium dynamique",
      premiumText: "L'activation premium se base sur le score de profil, l'historique de matching et la complétude d'onboarding.",
      level: "Niveau",
      accessOpen: "Accès ouvert",
      accessRestricted: "Accès restreint",
      accessSource: "Source d'accès",
      renewal: "Renouvellement",
      activatePremium: "Activer l'offre premium",
      upload: "Changer photo",
      uploading: "Upload..."
    },
    analysis: {
      unavailableTitle: "Analyse indisponible",
      unavailableText: "Importe un CV et lance le matching depuis l'onglet Importer.",
      skillCoverage: "Couverture compétences",
      experienceFit: "Adéquation expérience",
      verdict: "Verdict",
      domain: "Compatibilité par domaine",
      quickRead: "Lecture rapide",
      strengths: "Points forts",
      gaps: "Points à combler"
    },
    offers: {
      unavailableTitle: "Offres indisponibles",
      unavailableText: "Lance une analyse pour débloquer la comparaison des offres.",
      title: "Matching CV × Offres",
      average: "Score moyen du portefeuille",
      premiumAccess: "Accès premium",
      open: "ouvert",
      closed: "fermé",
      skills: "compétences",
      locked: "Verrouillé",
      detected: "Compétences détectées",
      noDetection: "Aucune détection.",
      mainGaps: "Gaps principaux",
      noGap: "Aucun écart majeur"
    },
    cv: {
      unavailableTitle: "Recommandations indisponibles",
      unavailableText: "Lance une analyse pour générer les recommandations CV.",
      title: "Plan d'amélioration du CV",
      text: "Recommandations automatiques basées sur les écarts détectés pendant le matching.",
      atsScoreTitle: "Score ATS pour cette offre",
      atsMatched: "mots-clés du poste retrouvés dans votre CV",
      atsOptimizeTitle: "Optimiser mon CV pour cette offre",
      atsOptimizeText: "L'IA reformule votre accroche, votre résumé et vos expériences pour mieux matcher les mots-clés de l'offre — sans jamais inventer une compétence ou une expérience que vous n'avez pas.",
      atsOptimizeBtn: "Optimiser mon CV (1 jeton)",
      atsOptimizing: "Optimisation en cours…",
      atsResultTitle: "Résultat de l'optimisation",
      atsHeadline: "Accroche optimisée",
      atsSummary: "Résumé optimisé",
      atsExperiences: "Expériences reformulées",
      atsSkillsOrder: "Compétences réordonnées (mêmes compétences, priorité à celles de l'offre)",
      atsMissingKeywords: "Mots-clés demandés par l'offre mais absents de votre CV",
      atsMissingKeywordsHint: "Ajoutez-les vous-même uniquement si vous maîtrisez réellement ces compétences — elles ne sont jamais ajoutées automatiquement à votre CV.",
      atsNotesTitle: "Note de l'IA",
      atsApply: "Appliquer au CV",
      atsApplying: "Enregistrement…",
      atsApplied: "Optimisation appliquée et enregistrée sur votre CV. Vous pouvez le télécharger en PDF ci-dessous.",
      atsNoOffer: "Analysez d'abord une offre depuis Importer CV pour optimiser votre CV en fonction d'un poste précis."
    },
    applications: {
      title: "Suivi de candidatures",
      text: "Gardez une vue d'ensemble sur vos candidatures, de la découverte de l'offre à la réponse finale.",
      addButton: "Ajouter une candidature",
      empty: "Aucune candidature ici.",
      loading: "Chargement…",
      columnToApply: "À postuler",
      columnApplied: "Postulé",
      columnInterview: "Entretien",
      columnOffer: "Offre",
      columnRejected: "Refusé",
      formTitlePlaceholder: "Intitulé du poste",
      formCompanyPlaceholder: "Entreprise",
      formLocationPlaceholder: "Lieu (optionnel)",
      formUrlPlaceholder: "Lien de l'offre (optionnel)",
      formCvLabel: "CV utilisé (optionnel)",
      formCvNone: "Aucun CV lié",
      formCancel: "Annuler",
      formSave: "Enregistrer",
      formSaving: "Enregistrement…",
      formError: "Indique au moins un poste ou une entreprise.",
      deleteConfirmTitle: "Supprimer cette candidature ?",
      delete: "Supprimer",
      edit: "Modifier",
      matchScoreLabel: "Score",
      appliedAtLabel: "Postulé le",
      addedOnLabel: "Ajouté le",
      nextActionLabel: "Prochaine relance",
      notesPlaceholder: "Notes (optionnel)",
      addToTrackerBtn: "Ajouter au suivi de candidatures",
      removeFromTrackerBtn: "Retirer du suivi",
      addedToTracker: "Ajouté au suivi de candidatures.",
      removedFromTracker: "Retiré du suivi de candidatures.",
      cardOpenOffer: "Voir l'offre",
      statusMessageToApply: "{title} chez {company} déplacée vers À postuler.",
      statusMessageApplied: "Bravo, vous avez postulé pour {title} chez {company} ! Encore un pas de plus 💪",
      statusMessageInterview: "Un entretien pour {title} chez {company} ? Félicitations, préparez-vous bien 🎯",
      statusMessageOffer: "Une offre pour {title} chez {company} ! Bravo, quelle belle nouvelle 🎉",
      statusMessageRejected: "{title} chez {company} n'a pas abouti cette fois. Ce n'est qu'une étape — la bonne offre arrive."
    },
    satisfaction: {
      eyebrow: "30 secondes chrono",
      title: "Votre avis compte",
      text: "Aidez-nous à améliorer Career App.",
      question: "Sur 10, à quel point recommanderiez-vous Career App à un proche ?",
      tierLabels: ["Très déçu", "Déçu", "Neutre", "Satisfait", "Conquis"],
      commentLabel: "Qu'est-ce qui explique cette note ? (optionnel)",
      commentPlaceholder: "Votre retour nous aide à prioriser...",
      submit: "Envoyer",
      submitting: "Envoi…",
      later: "Plus tard",
      thanksTitle: "Merci !",
      thanksText: "Votre retour a bien été pris en compte.",
      error: "Impossible d'envoyer votre réponse pour le moment."
    },
    pricing: {
      title: "Investissez dans votre Avenir",
      text: "Des offres flexibles pour candidats, cabinets de recrutement et écoles. Payez uniquement ce que vous utilisez.",
      currentBalance: "Votre solde actuel",
      credits: "jetons",
      segmentCandidate: "Candidat / Étudiant",
      segmentAgency: "Cabinet de recrutement / Conseil",
      segmentSchool: "École / Établissement",
      billingMonthly: "Mensuel",
      billingAnnual: "Annuel",
      billingSave: "jusqu'à 2 mois offerts",
      free: "Gratuit",
      perMonth: "/ mois",
      perYear: "/ an",
      creditsIncluded: "jetons inclus",
      seatsIncluded: "sièges inclus",
      studentSeatsLabel: "Nombre d'étudiants",
      studentSeatsTotal: "Total à payer :",
      activate: "Activer",
      currentPlan: "Plan actuel",
      licenseCodeTitle: "Vous avez reçu un code de licence ?",
      licenseCodePlaceholder: "Ex : LIC-XXXX-XXXX",
      licenseCodeSubmit: "Activer",
      licenseCodeHint: "Votre établissement ou votre cabinet vous a transmis un code ? Activez-le ici pour débloquer votre offre."
    },
    roleQuiz: {
      step1Title: "Quel poste visez-vous ?",
      step1Text: "Étape 1/2 - Pour personnaliser vos analyses",
      step2Title: "Dans quel secteur ?",
      step2Text: "Étape 2/2 - Pour personnaliser vos analyses",
      continue: "Continuer",
      start: "Commencer mon analyse",
      skip: "Passer cette étape",
      roles: [
        "Développeur / Ingénieur",
        "Product Manager",
        "Data Analyst / Data Scientist",
        "Marketing / Communication",
        "Commercial / Business Dev",
        "Designer UX/UI",
        "Finance / Comptabilité",
        "RH / Recrutement",
        "Chef de Projet",
        "Consultant",
        "Autre"
      ],
      sectors: [
        "Tech / Startups",
        "Finance / Banque",
        "Santé / Pharma",
        "Conseil",
        "E-commerce / Retail",
        "Industrie / Manufacturing",
        "Média / Créatif",
        "Public / Associatif",
        "Autre"
      ]
    },
    interview: {
      modelAnswer: "Réponse modèle",
      hint: "Astuce d'entretien",
      placeholder: "Votre réponse...",
      send: "Envoyer",
      report: "Bilan coaching",
      good: "Ce qui est bien",
      improve: "À améliorer",
      keyAdvice: "Conseil clé",
      lockedTitle: "Préparez vos entretiens comme un pro",
      lockedText:
        "Le simulateur d'entretiens IA (feedback en direct, questions RH/technique/comportementale, conseils personnalisés) fait partie de l'offre Trajectoire Pro. Passez au plan adapté pour vous entraîner sans limite avant le grand jour.",
      lockedFeatures: [
        "Simulateur d'entretiens illimité",
        "Feedback immédiat sur chaque réponse",
        "Suggestions de réseautage avancées"
      ],
      lockedCta: "Voir les offres Trajectoire Pro"
    },
    coverLetter: {
      title: "Lettre de motivation IA",
      subtitle: "Une lettre unique, écrite à partir de votre vrai profil et de l'offre visée.",
      toneLabel: "Choisissez un ton",
      toneFormal: "Formel",
      toneEnthusiastic: "Enthousiaste",
      toneDirect: "Direct",
      templateLabel: "Choisis un modèle",
      generate: "Générer (1 jeton)",
      regenerate: "Régénérer (1 jeton)",
      edit: "Modifier",
      cancelEdit: "Annuler",
      saveEdit: "Enregistrer",
      copy: "Copier",
      copied: "Copié !",
      download: "Télécharger en PDF",
      empty: "Importe un CV et analyse une offre pour débloquer ce module.",
      noTokens: "Vous n'avez plus de jetons. Passez à un plan supérieur pour générer votre lettre.",
      generating: "Rédaction en cours...",
      history: "Lettres",
      newConversation: "Nouvelle lettre",
      resumeHint: "Reprends une lettre déjà générée.",
      noHistory: "Aucune lettre pour l'instant.",
      deleteConversation: "Supprimer",
      deleteConfirm: "Supprimer cette lettre ?",
      untitled: "Lettre sans titre"
    },
    negotiation: {
      title: "Simulateur de négociation salariale",
      subtitle: "Entraînez-vous face à un recruteur IA réaliste avant l'entretien décisif.",
      targetLabel: "Prétention salariale visée (optionnel)",
      targetPlaceholder: "Ex : 42 000",
      start: "Démarrer la négociation (1 jeton)",
      starting: "Connexion au recruteur...",
      placeholder: "Votre réponse au recruteur...",
      send: "Envoyer",
      tip: "Conseil coaching",
      finish: "Terminer & voir mon bilan",
      finishing: "Analyse de la négociation...",
      summary: "Bilan de négociation",
      strengths: "Points forts",
      improvements: "Axes d'amélioration",
      empty: "Importe un CV et analyse une offre pour débloquer ce module.",
      noTokens: "Vous n'avez plus de jetons. Passez à un plan supérieur pour démarrer une négociation.",
      history: "Conversations",
      newConversation: "Nouvelle négociation",
      resumeHint: "Reprends une négociation déjà commencée.",
      noHistory: "Aucune conversation pour l'instant.",
      deleteConversation: "Supprimer",
      deleteConfirm: "Supprimer cette conversation ?",
      untitled: "Négociation sans titre"
    }
  },
  en: {
    menu: {
      profile: "My profile",
      security: "Security / Password",
      logout: "Log out"
    },
    security: {
      title: "Account security",
      text: "Change your login password.",
      current: "Current password",
      next: "New password",
      confirm: "Confirmation",
      submit: "Update"
    },
    home: {
      userFallback: "User",
      eyebrow: "Next-generation career assistant",
      titleA: "Land the role that fits you,",
      titleB: "with a path",
      titleAccent: "guided by data",
      intro: "Import your CV, paste a job post, and let the AI score your match, surface missing keywords and cultural fit — then train for the interview.",
      start: "Get started",
      tickerLabel: "Personalized information",
      welcome: "Welcome",
      accountType: "Account type",
      profileDone: "Profile completed",
      profilePct: "Profile completed at",
      noMatch: "No match analysis started yet",
      latestMatch: "Latest match",
      objective: "Goal",
      addTarget: "Add your target role in Profile",
      planLabel: "Plan",
      tokens: "tokens",
      unlimitedTokens: "unlimited",
      schoolMember: "🎓 Account activated via",
      seeTarifs: "See pricing",
      importedCv: "CV(s) imported",
      noCv: "No CV imported",
      workflow: [
        { number: "01", title: "Import", text: "Your CV and the target job" },
        { number: "02", title: "Analyze", text: "AI score, missing keywords, cultural fit" },
        { number: "03", title: "Take action", text: "Recommendations, networking, optimized CV PDF" },
        { number: "04", title: "Practice", text: "Interview simulator with feedback" }
      ]
    },
    import: {
      title: "Import your CV",
      text: "Upload your CV, review the extracted profile, then paste the target job to launch matching.",
      steps: [
        { title: "Upload CV", text: "Automatic extraction" },
        { title: "Review profile", text: "Editable data" },
        { title: "Target role", text: "Job description" },
        { title: "Analysis", text: "Match & Optimization" }
      ],
      uploadTitle: "Upload your CV",
      uploadText: "We extract the information needed to prepare your candidate profile.",
      analysingTitle: "Analyzing your CV...",
      analysingText: "This usually takes 10-20 seconds.",
      reviewTitle: "Extraction review",
      reviewText: "Check and correct the information before saving it.",
      reimport: "Reimport CV",
      saveContinue: "Save & continue",
      personalInfo: "Personal information",
      summary: "Professional summary",
      skillsLanguages: "Skills & languages",
      experiences: "Experience",
      educationBlock: "Education",
      certifications: "Certifications",
      interests: "Interests",
      addSkill: "Add skill",
      addLanguage: "Add language",
      addExperience: "Add experience",
      addEducation: "Add education",
      addCertification: "Add certification",
      addInterest: "Add interest",
      jobTitle: "Target role",
      jobText: "Paste the full job description below.",
      jobDescription: "Job description",
      jobSummaryTitle: "Job summary",
      jobSummaryText: "Review the extracted details before launching the analysis.",
      technicalSkills: "Technical skills",
      softSkills: "Soft skills",
      noSkillsDetected: "None detected in the pasted text",
      backToEdit: "Back to editing",
      reviewJob: "Review job",
      analyseJob: "Analyze job",
      reviewingJob: "Analyzing job...",
      extractionReady: "Extraction ready to review.",
      chooseFile: "Choose a CV file",
      fileDone: "CV detected and analyzed",
      formats: "Accepted formats: txt, pdf, doc, docx",
      history: "CV history",
      emptyHistory: "No CV saved.",
      offerTitle: "Paste the target job",
      offerText: "Matching uses this job post and also compares marketplace jobs.",
      offerPlaceholder: "Paste the full job description here...",
      chars: "characters",
      ready: "Ready",
      minimum: "Minimum 50 characters",
      analysing: "Analysis running...",
      analyse: "Analyze my profile",
      matchingTitle: "Running match analysis...",
      matchingText: "The AI compares your profile to the job. This usually takes 10-20 seconds.",
      matchScoreLabel: "Compatibility score",
      matchStrengths: "Strengths",
      matchMissingKeywords: "Missing keywords",
      matchCulturalFit: "Cultural fit",
      matchRecommendations: "Strategic recommendations",
      matchNoMissingKeywords: "No major keyword is missing, nice work.",
      matchResultsTitle: "Analysis Results",
      matchResultsSubtitle: "Detail of your match score.",
      matchFeedbackQuestion: "Was this analysis useful?",
      matchFeedbackYes: "Yes",
      matchFeedbackNo: "No",
      matchFeedbackThanks: "Thanks for your feedback!",
      matchNetworkingTitle: "Networking opportunities",
      matchNetworkingText: "Connect with people working at {company} to boost your chances.",
      matchNetworkingButton: "Find contacts at this company",
      matchNetworkingSearching: "Preparing searches...",
      matchNetworkingEmpty: "Career App has no LinkedIn directory access: here are targeted searches you can run yourself in one click.",
      matchNetworkingOpenLinkedin: "Search on LinkedIn",
      matchNetworkingRoleLabel: "People in the target role",
      matchNetworkingRecruiterLabel: "Recruiters",
      matchNetworkingHrLabel: "HR team",
      matchCvLanguageLabel: "CV language",
      matchPreviewCv: "Preview CV",
      matchHidePreview: "Hide preview",
      matchShare: "Share",
      matchShareCopied: "Summary copied to clipboard.",
      matchDownloadPdf: "Download PDF",
      matchCvPreviewTitle: "Optimized CV Preview",
      matchCvPreviewEmpty: "Import and review your CV to see a preview here.",
      cvPreviewSummary: "Professional summary",
      cvPreviewExperience: "Experience",
      cvPreviewEducation: "Education",
      cvPreviewTechnicalSkills: "Technical skills",
      cvPreviewSoftSkills: "Soft skills",
      cvPreviewLanguages: "Languages",
      cvPreviewCertifications: "Certifications",
      cvPreviewInterests: "Interests",
      cvPreviewProjects: "Projects",
      cvPreviewSocial: "Social links",
      cvPreviewPortfolio: "Portfolio",
      cvTemplateClassic: "Classic",
      cvTemplateSidebar: "Sidebar"
    },
    profile: {
      addHeadline: "Add a target professional headline.",
      completeness: "Profile completeness",
      plan: "Plan",
      professional: "Professional profile",
      headline: "Title / headline",
      targetRole: "Target role",
      sector: "Target sector",
      location: "Location",
      experience: "Experience (years)",
      education: "Education level",
      skills: "Skills (comma separated)",
      languages: "Languages (comma separated)",
      saveProfile: "Save profile",
      accountSettings: "Account settings (SaaS)",
      accountType: "Account type",
      phone: "Phone",
      city: "City",
      country: "Country",
      saveAccount: "Save account",
      premiumTitle: "Dynamic premium offer",
      premiumText: "Premium activation is based on your profile score, match history, and onboarding completeness.",
      level: "Level",
      accessOpen: "Access open",
      accessRestricted: "Access restricted",
      accessSource: "Access source",
      renewal: "Renewal",
      activatePremium: "Activate premium offer",
      upload: "Change photo",
      uploading: "Uploading..."
    },
    analysis: {
      unavailableTitle: "Analysis unavailable",
      unavailableText: "Import a CV and run matching from the Import tab.",
      skillCoverage: "Skill coverage",
      experienceFit: "Experience fit",
      verdict: "Verdict",
      domain: "Compatibility by domain",
      quickRead: "Quick read",
      strengths: "Strengths",
      gaps: "Gaps to close"
    },
    offers: {
      unavailableTitle: "Jobs unavailable",
      unavailableText: "Run an analysis to unlock job comparison.",
      title: "CV × Jobs matching",
      average: "Average portfolio score",
      premiumAccess: "Premium access",
      open: "open",
      closed: "closed",
      skills: "skills",
      locked: "Locked",
      detected: "Detected skills",
      noDetection: "No detection.",
      mainGaps: "Main gaps",
      noGap: "No major gap"
    },
    cv: {
      unavailableTitle: "Recommendations unavailable",
      unavailableText: "Run an analysis to generate CV recommendations.",
      title: "CV improvement plan",
      text: "Automatic recommendations based on gaps detected during matching.",
      atsScoreTitle: "ATS score for this job",
      atsMatched: "job keywords found in your CV",
      atsOptimizeTitle: "Optimize my CV for this job",
      atsOptimizeText: "The AI rewrites your headline, summary and experiences to better match the job's keywords — never inventing a skill or experience you don't have.",
      atsOptimizeBtn: "Optimize my CV (1 token)",
      atsOptimizing: "Optimizing…",
      atsResultTitle: "Optimization result",
      atsHeadline: "Optimized headline",
      atsSummary: "Optimized summary",
      atsExperiences: "Rewritten experiences",
      atsSkillsOrder: "Reordered skills (same skills, job-relevant ones first)",
      atsMissingKeywords: "Keywords the job asks for but that are missing from your CV",
      atsMissingKeywordsHint: "Only add these yourself if you genuinely have these skills — they're never added to your CV automatically.",
      atsNotesTitle: "AI note",
      atsApply: "Apply to my CV",
      atsApplying: "Saving…",
      atsApplied: "Optimization applied and saved to your CV. You can download it as a PDF below.",
      atsNoOffer: "First analyze a job offer from Import CV to optimize your CV for a specific role."
    },
    applications: {
      title: "Application tracker",
      text: "Keep track of your applications, from finding the job to the final answer.",
      addButton: "Add an application",
      empty: "No applications here.",
      loading: "Loading…",
      columnToApply: "To apply",
      columnApplied: "Applied",
      columnInterview: "Interview",
      columnOffer: "Offer",
      columnRejected: "Rejected",
      formTitlePlaceholder: "Job title",
      formCompanyPlaceholder: "Company",
      formLocationPlaceholder: "Location (optional)",
      formUrlPlaceholder: "Job posting link (optional)",
      formCvLabel: "CV used (optional)",
      formCvNone: "No linked CV",
      formCancel: "Cancel",
      formSave: "Save",
      formSaving: "Saving…",
      formError: "Enter at least a job title or a company.",
      deleteConfirmTitle: "Delete this application?",
      delete: "Delete",
      edit: "Edit",
      matchScoreLabel: "Score",
      appliedAtLabel: "Applied on",
      addedOnLabel: "Added on",
      nextActionLabel: "Next follow-up",
      notesPlaceholder: "Notes (optional)",
      addToTrackerBtn: "Add to application tracker",
      removeFromTrackerBtn: "Remove from tracker",
      addedToTracker: "Added to your application tracker.",
      removedFromTracker: "Removed from your application tracker.",
      cardOpenOffer: "View the job posting",
      statusMessageToApply: "{title} at {company} moved back to To apply.",
      statusMessageApplied: "Nice, you applied to {title} at {company}! One step closer 💪",
      statusMessageInterview: "An interview for {title} at {company}? Congrats, go prepare well 🎯",
      statusMessageOffer: "An offer for {title} at {company}! Congratulations, what great news 🎉",
      statusMessageRejected: "{title} at {company} didn't work out this time. It's just one step — the right offer is coming."
    },
    satisfaction: {
      eyebrow: "30 seconds",
      title: "We'd love your feedback",
      text: "Help us make Career App better.",
      question: "On a scale of 10, how likely are you to recommend Career App to a friend?",
      tierLabels: ["Very disappointed", "Disappointed", "Neutral", "Satisfied", "Delighted"],
      commentLabel: "What's behind this score? (optional)",
      commentPlaceholder: "Your feedback helps us prioritize...",
      submit: "Send",
      submitting: "Sending…",
      later: "Later",
      thanksTitle: "Thank you!",
      thanksText: "Your feedback has been recorded.",
      error: "Couldn't send your response right now."
    },
    pricing: {
      title: "Invest in your Future",
      text: "Flexible offers for candidates, recruitment firms and schools. Pay only for what you use.",
      currentBalance: "Your current balance",
      credits: "tokens",
      segmentCandidate: "Candidate / Student",
      segmentAgency: "Recruitment firm / Consulting",
      segmentSchool: "School / Institution",
      billingMonthly: "Monthly",
      billingAnnual: "Annual",
      billingSave: "up to 2 months free",
      free: "Free",
      perMonth: "/ month",
      perYear: "/ year",
      creditsIncluded: "tokens included",
      seatsIncluded: "seats included",
      studentSeatsLabel: "Number of students",
      studentSeatsTotal: "Total to pay:",
      activate: "Activate",
      currentPlan: "Current plan",
      licenseCodeTitle: "Received a license code?",
      licenseCodePlaceholder: "E.g. LIC-XXXX-XXXX",
      licenseCodeSubmit: "Activate",
      licenseCodeHint: "Your school or firm gave you a code? Activate it here to unlock your offer."
    },
    roleQuiz: {
      step1Title: "What role are you targeting?",
      step1Text: "Step 1/2 - To personalize your analyses",
      step2Title: "In which industry?",
      step2Text: "Step 2/2 - To personalize your analyses",
      continue: "Continue",
      start: "Start my analysis",
      skip: "Skip this step",
      roles: [
        "Developer / Engineer",
        "Product Manager",
        "Data Analyst / Data Scientist",
        "Marketing / Communication",
        "Sales / Business Dev",
        "UX/UI Designer",
        "Finance / Accounting",
        "HR / Recruiting",
        "Project Manager",
        "Consultant",
        "Other"
      ],
      sectors: [
        "Tech / Startups",
        "Finance / Banking",
        "Health / Pharma",
        "Consulting",
        "E-commerce / Retail",
        "Industry / Manufacturing",
        "Media / Creative",
        "Public / Non-profit",
        "Other"
      ]
    },
    interview: {
      modelAnswer: "Model answer",
      hint: "Interview tip",
      placeholder: "Your answer...",
      send: "Send",
      report: "Coaching report",
      good: "What is good",
      improve: "To improve",
      keyAdvice: "Key advice",
      lockedTitle: "Prepare for interviews like a pro",
      lockedText:
        "The AI interview simulator (live feedback, HR/technical/behavioral questions, personalized tips) is part of the Pro Track plan. Upgrade to the right plan to train without limits before the big day.",
      lockedFeatures: [
        "Unlimited interview simulator",
        "Instant feedback on every answer",
        "Advanced networking suggestions"
      ],
      lockedCta: "See Pro Track plans"
    },
    coverLetter: {
      title: "AI Cover Letter",
      subtitle: "A unique letter written from your real profile and the targeted job.",
      toneLabel: "Choose a tone",
      toneFormal: "Formal",
      toneEnthusiastic: "Enthusiastic",
      toneDirect: "Direct",
      templateLabel: "Choose a template",
      generate: "Generate (1 token)",
      regenerate: "Regenerate (1 token)",
      edit: "Edit",
      cancelEdit: "Cancel",
      saveEdit: "Save",
      copy: "Copy",
      copied: "Copied!",
      download: "Download as PDF",
      empty: "Import a CV and analyze a job offer to unlock this module.",
      noTokens: "You're out of tokens. Upgrade your plan to generate your letter.",
      generating: "Writing in progress...",
      history: "Letters",
      newConversation: "New letter",
      resumeHint: "Resume a letter you already generated.",
      noHistory: "No letter yet.",
      deleteConversation: "Delete",
      deleteConfirm: "Delete this letter?",
      untitled: "Untitled letter"
    },
    negotiation: {
      title: "Salary Negotiation Simulator",
      subtitle: "Train against a realistic AI recruiter before the real conversation.",
      targetLabel: "Target salary (optional)",
      targetPlaceholder: "E.g. 55,000",
      start: "Start negotiation (1 token)",
      starting: "Connecting to recruiter...",
      placeholder: "Your reply to the recruiter...",
      send: "Send",
      tip: "Coaching tip",
      finish: "Finish & see my report",
      finishing: "Analyzing the negotiation...",
      summary: "Negotiation report",
      strengths: "Strengths",
      improvements: "Areas to improve",
      empty: "Import a CV and analyze a job offer to unlock this module.",
      noTokens: "You're out of tokens. Upgrade your plan to start a negotiation.",
      history: "Conversations",
      newConversation: "New negotiation",
      resumeHint: "Resume a negotiation you already started.",
      noHistory: "No conversation yet.",
      deleteConversation: "Delete",
      deleteConfirm: "Delete this conversation?",
      untitled: "Untitled negotiation"
    }
  }
};

function unique(list) {
  return [...new Set(list.filter(Boolean))];
}

function levelTag(level) {
  if (level === "critique") return "crit";
  if (level === "important") return "warn";
  if (level === "premium") return "premium";
  return "good";
}

function recommendationLevelLabel(level, language = "fr") {
  const labels = {
    fr: { critique: "Critique", important: "Important", bonus: "Bonus", premium: "Premium" },
    en: { critique: "Critical", important: "Important", bonus: "Bonus", premium: "Premium" }
  };
  return labels[language]?.[level] || labels.fr[level] || level;
}

function ratingLabel(score, language = "fr") {
  if (language === "en") {
    if (score >= 80) return "Excellent fit";
    if (score >= 65) return "Good fit";
    if (score >= 50) return "Average match";
    return "Needs work";
  }
  if (score >= 80) return "Excellent fit";
  if (score >= 65) return "Bon fit";
  if (score >= 50) return "Match moyen";
  return "À renforcer";
}

function formatDate(value) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("fr-FR");
}

function formatShortDate(value, language) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString(language === "en" ? "en-GB" : "fr-FR", { day: "2-digit", month: "short" });
}

function withInitials(user) {
  const first = user?.firstName?.[0] || "U";
  const last = user?.lastName?.[0] || "X";
  return `${first}${last}`.toUpperCase();
}

function getAvatarSource(user) {
  return user?.avatarDataUrl || user?.account?.avatarDataUrl || user?.account?.details?.avatarDataUrl || user?.profile?.avatarDataUrl || "";
}

function mergeProfileFromCv(currentProfile, parsedCv) {
  return {
    ...currentProfile,
    headline: currentProfile.headline || parsedCv.headline || "",
    experienceYears: Math.max(Number(currentProfile.experienceYears || 0), Number(parsedCv.experienceYears || 0)),
    education: currentProfile.education || parsedCv.education || "",
    skills: unique([...(currentProfile.skills || []), ...(parsedCv.skills || [])]),
    languages: unique([...(currentProfile.languages || []), ...(parsedCv.languages || [])])
  };
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Impossible de lire cette image."));
    reader.readAsDataURL(file);
  });
}

async function resizeImageFileToDataUrl(file, maxSize = 512, quality = 0.86) {
  const source = await readFileAsDataUrl(file);
  if (typeof Image === "undefined" || typeof document === "undefined") {
    return source;
  }

  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => {
      const width = image.naturalWidth || image.width;
      const height = image.naturalHeight || image.height;
      if (!width || !height) {
        resolve(source);
        return;
      }

      const scale = Math.min(1, maxSize / Math.max(width, height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(width * scale));
      canvas.height = Math.max(1, Math.round(height * scale));
      const context = canvas.getContext("2d");
      if (!context) {
        resolve(source);
        return;
      }

      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    image.onerror = () => resolve(source);
    image.src = source;
  });
}

function getUsernameValidation(username, language = "fr") {
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

function getFriendlyErrorMessage(error, language = "fr") {
  const raw = typeof error === "string" ? error : error?.message || "";
  const message = String(raw || "").trim();
  const fallback =
    language === "en"
      ? "Something went wrong. Please try again."
      : "Une erreur est survenue. Réessaie dans quelques instants.";
  const networkFallback =
    language === "en"
      ? "Can't reach the server. Check your internet connection and try again in a moment."
      : "Impossible de contacter le serveur. Vérifiez votre connexion internet et réessayez dans quelques instants.";

  if (!message) return fallback;

  const networkPatterns = [/failed to fetch/i, /networkerror/i, /load failed/i, /network request failed/i];
  if (networkPatterns.some((pattern) => pattern.test(message))) {
    return networkFallback;
  }

  const technicalPatterns = [
    /is not defined/i,
    /cannot read properties/i,
    /undefined/i,
    /null/i,
    /stack/i,
    /syntaxerror/i,
    /referenceerror/i,
    /typeerror/i,
    /json/i
  ];

  if (technicalPatterns.some((pattern) => pattern.test(message))) {
    return fallback;
  }

  return message.length > 180 ? `${message.slice(0, 177)}...` : message;
}

function getCvImportErrorMessage(error, language = "fr") {
  const friendly = getFriendlyErrorMessage(error, language);
  const generic =
    language === "en"
      ? "CV extraction failed. Upload a readable PDF or DOCX."
      : "L'extraction du CV a échoué. Importe un PDF texte ou un DOCX lisible.";
  return friendly.includes("Une erreur est survenue") || friendly.includes("Something went wrong") ? generic : friendly;
}

function getAccountLabel(accountType, language = "fr") {
  return ACCOUNT_LABELS[language]?.[accountType] || ACCOUNT_LABELS.fr[accountType] || ACCOUNT_LABELS.fr.other;
}

function accountToForm(user) {
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

function buildAccountPatch(form) {
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

function UiIcon({ name, className = "" }) {
  const map = {
    home: (
      <path
        d="M3.75 8.25L10 3l6.25 5.25v7a.75.75 0 01-.75.75H11.5v-4.25h-3V16H4.5a.75.75 0 01-.75-.75v-7z"
        fill="currentColor"
      />
    ),
    upload: (
      <path
        d="M10 2.75a.75.75 0 01.75.75v6.19l1.72-1.72a.75.75 0 111.06 1.06l-3 3a.75.75 0 01-1.06 0l-3-3a.75.75 0 011.06-1.06l1.72 1.72V3.5A.75.75 0 0110 2.75zm-6 10.5A.75.75 0 014.75 12.5h10.5a.75.75 0 010 1.5H4.75a.75.75 0 01-.75-.75z"
        fill="currentColor"
      />
    ),
    profile: (
      <path
        d="M10 3.25a3.25 3.25 0 110 6.5 3.25 3.25 0 010-6.5zM4.25 15a4.75 4.75 0 019.5 0v1h-9.5v-1z"
        fill="currentColor"
      />
    ),
    chart: (
      <path
        d="M4.5 15.5a.75.75 0 01-.75-.75v-1.5a.75.75 0 011.5 0v.75h10v-.75a.75.75 0 011.5 0v1.5a.75.75 0 01-.75.75h-11.5zm1-3.75a.75.75 0 01-.75-.75V6.5a.75.75 0 011.5 0V11a.75.75 0 01-.75.75zm4.5 0a.75.75 0 01-.75-.75V4.75a.75.75 0 011.5 0V11a.75.75 0 01-.75.75zm4.5 0a.75.75 0 01-.75-.75V8.75a.75.75 0 011.5 0V11a.75.75 0 01-.75.75z"
        fill="currentColor"
      />
    ),
    briefcase: (
      <path
        d="M7 4a2 2 0 00-2 2v1H4a1.5 1.5 0 00-1.5 1.5V14A2 2 0 004.5 16h11a2 2 0 002-2v-5.5A1.5 1.5 0 0016 7h-1V6a2 2 0 00-2-2H7zm1.5 3V6a.5.5 0 01.5-.5h2a.5.5 0 01.5.5v1h-3z"
        fill="currentColor"
      />
    ),
    plus: (
      <path
        d="M10 3.75a.75.75 0 01.75.75v4.75h4.75a.75.75 0 010 1.5h-4.75v4.75a.75.75 0 01-1.5 0v-4.75H4.5a.75.75 0 010-1.5h4.75V4.5A.75.75 0 0110 3.75z"
        fill="currentColor"
      />
    ),
    check: (
      <path
        d="M16.7 5.3a1 1 0 010 1.4l-7.5 7.5a1 1 0 01-1.4 0l-3.5-3.5a1 1 0 111.4-1.4l2.8 2.8 6.8-6.8a1 1 0 011.4 0z"
        fill="currentColor"
      />
    ),
    thumbUp: (
      <path
        d="M7 9v8H4.5A1.5 1.5 0 013 15.5V10.5A1.5 1.5 0 014.5 9H7zm1.4-.3L11.6 3a1.5 1.5 0 012.6.9v3.6h2.1a2 2 0 011.94 2.48l-1.3 5.5A2 2 0 0115 17H9.4a1.4 1.4 0 01-1.4-1.4V9.1c0-.15.03-.28.08-.4z"
        fill="currentColor"
      />
    ),
    thumbDown: (
      <path
        d="M13 11V3h2.5A1.5 1.5 0 0117 4.5v5A1.5 1.5 0 0115.5 11H13zm-1.4.3L8.4 17a1.5 1.5 0 01-2.6-.9v-3.6H3.7a2 2 0 01-1.94-2.48l1.3-5.5A2 2 0 015 3h5.6A1.4 1.4 0 0112 4.4v6.5c0 .15-.03.28-.08.4z"
        fill="currentColor"
      />
    ),
    trash: (
      <path
        d="M8.25 3.5a.75.75 0 00-.75.75V5H4.75a.75.75 0 000 1.5h.5l.62 8.06A2 2 0 007.85 16.4h4.3a2 2 0 001.98-1.84l.62-8.06h.5a.75.75 0 000-1.5H12.5v-.75a.75.75 0 00-.75-.75h-3.5zm.25 4a.75.75 0 011.5 0v6a.75.75 0 01-1.5 0v-6zm3.5 0a.75.75 0 011.5 0v6a.75.75 0 01-1.5 0v-6z"
        fill="currentColor"
      />
    ),
    bell: (
      <path
        d="M10 2.5a1 1 0 011 1v.6c2.3.45 4 2.47 4 4.9v3.1l1.28 1.92a.75.75 0 01-.62 1.17H4.34a.75.75 0 01-.62-1.17L5 12.1V9c0-2.43 1.7-4.45 4-4.9v-.6a1 1 0 011-1zM8.1 16.25a1.9 1.9 0 003.8 0h-3.8z"
        fill="currentColor"
      />
    ),
    matchmark: (
      <>
        <path
          d="M7.2 12.8a3.2 3.2 0 010-5.6l1.4-.8a1 1 0 111 1.73l-1.4.8a1.2 1.2 0 000 2.1l1.4.8a1 1 0 11-1 1.74l-1.4-.8a3.2 3.2 0 01-.4-.19z"
          fill="currentColor"
        />
        <path
          d="M12.8 7.2a3.2 3.2 0 010 5.6l-1.4.8a1 1 0 11-1-1.74l1.4-.8a1.2 1.2 0 000-2.1l-1.4-.8a1 1 0 111-1.73l1.4.8a3.2 3.2 0 01.4.19z"
          fill="currentColor"
        />
      </>
    ),
    chat: (
      <path
        d="M4.5 4h11A1.5 1.5 0 0117 5.5v7a1.5 1.5 0 01-1.5 1.5H9l-3.2 2.2a.5.5 0 01-.78-.41V14H4.5A1.5 1.5 0 013 12.5v-7A1.5 1.5 0 014.5 4z"
        fill="currentColor"
      />
    ),
    history: (
      <path
        d="M10 3.25a6.75 6.75 0 106.25 9.3.75.75 0 00-1.38-.58A5.25 5.25 0 1110 4.75c1.42 0 2.7.56 3.64 1.47H12.5a.75.75 0 000 1.5h2.75A.75.75 0 0016 6.97V4.25a.75.75 0 00-1.5 0v.88A6.72 6.72 0 0010 3.25zm.75 3.5a.75.75 0 00-1.5 0v3.45c0 .25.12.49.32.63l2.45 1.8a.75.75 0 10.89-1.21l-2.16-1.59V6.75z"
        fill="currentColor"
      />
    ),
    shield: (
      <path
        d="M10 2.75l6 2.1v4.4c0 3.76-2.21 6.98-6 8-3.79-1.02-6-4.24-6-8v-4.4l6-2.1zm-1.1 8.26l-1.4-1.4a.75.75 0 10-1.06 1.06l1.93 1.93a.75.75 0 001.06 0l4.18-4.18a.75.75 0 10-1.06-1.06l-3.65 3.65z"
        fill="currentColor"
      />
    ),
    save: (
      <path
        d="M4.5 3.25h8.1c.4 0 .78.16 1.06.44l2.65 2.65c.28.28.44.66.44 1.06v8.1a1.25 1.25 0 01-1.25 1.25h-11A1.25 1.25 0 013.25 15.5v-11A1.25 1.25 0 014.5 3.25zM6 4.75v4h7.25V6.9l-2.15-2.15H6zm1 7.25a1 1 0 00-1 1v2.25h8V13a1 1 0 00-1-1H7z"
        fill="currentColor"
      />
    ),
    logout: (
      <path
        d="M8 3.5a.75.75 0 000 1.5h4.25v10H8a.75.75 0 000 1.5h5A.75.75 0 0013.75 16V4A.75.75 0 0013 3.25H8zm-1.28 3.22a.75.75 0 010 1.06L5.56 9h6.69a.75.75 0 010 1.5H5.56l1.16 1.22a.75.75 0 11-1.08 1.04L3.2 10.22a1.75 1.75 0 010-2.44l2.44-2.44a.75.75 0 011.08 0z"
        fill="currentColor"
      />
    ),
    alert: (
      <path
        d="M10 2.5a7.5 7.5 0 100 15 7.5 7.5 0 000-15zm-1.94 4.56a.75.75 0 011.06 0L10 7.94l.88-.88a.75.75 0 111.06 1.06L11.06 9l.88.88a.75.75 0 11-1.06 1.06L10 10.06l-.88.88a.75.75 0 11-1.06-1.06L8.94 9l-.88-.88a.75.75 0 010-1.06z"
        fill="currentColor"
      />
    ),
    globe: (
      <path
        d="M10 2.5a7.5 7.5 0 100 15 7.5 7.5 0 000-15zm5.94 6.75h-2.57a12.6 12.6 0 00-.9-4.24 6.02 6.02 0 013.47 4.24zm-5.94-5.19c.72.9 1.62 2.65 1.77 5.19H8.23c.15-2.54 1.05-4.29 1.77-5.19zM8.23 10.75h3.54c-.15 2.54-1.05 4.29-1.77 5.19-.72-.9-1.62-2.65-1.77-5.19zM7.53 5.01a12.6 12.6 0 00-.9 4.24H4.06a6.02 6.02 0 013.47-4.24zM4.06 10.75h2.57c.1 1.55.42 2.99.9 4.24a6.02 6.02 0 01-3.47-4.24zm8.41 4.24c.48-1.25.8-2.69.9-4.24h2.57a6.02 6.02 0 01-3.47 4.24z"
        fill="currentColor"
      />
    ),
    eye: (
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M.664 10.59a1.651 1.651 0 010-1.186A10.004 10.004 0 0110 3c4.257 0 7.893 2.66 9.336 6.41.147.381.146.804 0 1.186A10.004 10.004 0 0110 17c-4.257 0-7.893-2.66-9.336-6.41zM14 10a4 4 0 11-8 0 4 4 0 018 0z"
        fill="currentColor"
      />
    ),
    share: (
      <path
        d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z"
        fill="currentColor"
      />
    ),
    download: (
      <path
        d="M10.75 2.75a.75.75 0 00-1.5 0v8.614L6.295 8.235a.75.75 0 10-1.09 1.03l4.25 4.5a.75.75 0 001.09 0l4.25-4.5a.75.75 0 00-1.09-1.03l-2.955 3.129V2.75z M3.5 12.75a.75.75 0 00-1.5 0v2.5A2.75 2.75 0 004.75 18h10.5A2.75 2.75 0 0018 15.25v-2.5a.75.75 0 00-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5z"
        fill="currentColor"
      />
    ),
    chevron: (
      <path
        d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z"
        fill="currentColor"
      />
    ),
    pricetag: (
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M2 5.5A2.5 2.5 0 014.5 3h4.086a2.5 2.5 0 011.768.732l7 7a2.5 2.5 0 010 3.536l-4.585 4.585a2.5 2.5 0 01-3.536 0l-7-7A2.5 2.5 0 012 9.586V5.5zM7 8a1 1 0 100-2 1 1 0 000 2z"
        fill="currentColor"
      />
    ),
    network: (
      <>
        <circle cx="5" cy="5.5" r="2.4" fill="currentColor" />
        <circle cx="15" cy="5.5" r="2.4" fill="currentColor" />
        <circle cx="10" cy="15" r="2.4" fill="currentColor" />
        <path
          d="M6.6 7.2L9 12.8M13.4 7.2L11 12.8M7.4 5.5h5.2"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
          fill="none"
        />
      </>
    ),
    mail: (
      <path
        d="M4.25 5A1.75 1.75 0 002.5 6.75v6.5c0 .966.784 1.75 1.75 1.75h11.5A1.75 1.75 0 0017.5 13.25v-6.5A1.75 1.75 0 0015.75 5H4.25zm.29 1.5h10.92L10 10.94 4.54 6.5zM4 8.1l5.53 4.47a.75.75 0 00.94 0L16 8.1v5.15a.25.25 0 01-.25.25H4.25a.25.25 0 01-.25-.25V8.1z"
        fill="currentColor"
      />
    ),
    phone: (
      <path
        d="M5.1 2.6c.5-.13 1.03.1 1.27.58l1.1 2.2c.22.44.13.97-.22 1.32L6 8a8.6 8.6 0 004 4l1.3-1.25a1.1 1.1 0 011.32-.22l2.2 1.1c.48.24.71.77.58 1.27l-.42 1.65a1.6 1.6 0 01-1.75 1.2A12.8 12.8 0 013 4.77a1.6 1.6 0 011.2-1.75l1.65-.42z"
        fill="currentColor"
      />
    ),
    pin: (
      <path
        d="M10 2.5c-3.04 0-5.5 2.4-5.5 5.42 0 3.9 4.55 8.8 5.03 9.3a.65.65 0 00.94 0c.48-.5 5.03-5.4 5.03-9.3 0-3.02-2.46-5.42-5.5-5.42zm0 7.5a2 2 0 110-4 2 2 0 010 4z"
        fill="currentColor"
      />
    ),
    scale: (
      <path
        d="M10 2.25a.75.75 0 01.75.75v.55c.94.08 1.83.3 2.62.63a.75.75 0 11-.58 1.38 6.6 6.6 0 00-2.04-.51v8.44c1.36.1 2.6.53 3.55 1.18a.75.75 0 01-.85 1.24c-.77-.53-1.85-.9-3.1-1V16.5h2a.75.75 0 010 1.5H7.65a.75.75 0 010-1.5h2v-1.1c-1.25.1-2.33.47-3.1 1a.75.75 0 01-.85-1.24c.95-.65 2.19-1.08 3.55-1.18V4.55a6.6 6.6 0 00-2.04.5.75.75 0 11-.58-1.37c.79-.33 1.68-.55 2.62-.63v-.55A.75.75 0 0110 2.25zM4.9 6.1a.75.75 0 01.68.44l1.9 4.2c.09.2.1.43.02.64-.32.86-1.32 1.62-2.6 1.62s-2.28-.76-2.6-1.62a.75.75 0 01.02-.64l1.9-4.2a.75.75 0 01.68-.44zm0 2.3l-1.05 2.33c.2.24.57.43 1.05.43s.85-.19 1.05-.43L4.9 8.4zm10.2-2.3a.75.75 0 01.68.44l1.9 4.2c.09.2.1.43.02.64-.32.86-1.32 1.62-2.6 1.62s-2.28-.76-2.6-1.62a.75.75 0 01.02-.64l1.9-4.2a.75.75 0 01.68-.44zm0 2.3l-1.05 2.33c.2.24.57.43 1.05.43s.85-.19 1.05-.43l-1.05-2.33z"
        fill="currentColor"
      />
    ),
    edit: (
      <path
        d="M14.69 2.87a1.5 1.5 0 012.12 0l.32.32a1.5 1.5 0 010 2.12L7.6 14.84l-3.1.63a.75.75 0 01-.89-.89l.63-3.1L14.69 2.87zm-1.06 2.12L4.9 13.72l-.3 1.5 1.5-.3 8.73-8.73-1.2-1.2z"
        fill="currentColor"
      />
    ),
    docClassic: (
      <>
        <rect x="4" y="2.5" width="12" height="15" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.3" />
        <path d="M6.5 6.5h7M6.5 9.5h7M6.5 12.5h4.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      </>
    ),
    docModern: (
      <>
        <rect x="4" y="2.5" width="12" height="15" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.3" />
        <rect x="4" y="2.5" width="3" height="15" rx="1.5" fill="currentColor" opacity="0.85" />
        <path d="M9.5 7h4.5M9.5 10h4.5M9.5 13h3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      </>
    ),
    docMinimal: (
      <>
        <rect x="4" y="2.5" width="12" height="15" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.3" />
        <path d="M7.5 9h5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      </>
    ),
    file: (
      <>
        <path d="M5 3.25h6.4L15 6.85v9.4A1.75 1.75 0 0113.25 18h-6.5A1.75 1.75 0 015 16.25v-13z" fill="none" stroke="currentColor" strokeWidth="1.35" />
        <path d="M11.25 3.6v3.15h3.15M7.5 10.25h5M7.5 13h5M7.5 15.75h3" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round" />
      </>
    ),
    settings: (
      <path
        d="M10 2.75a.75.75 0 01.72.54l.3 1.03c.38.12.74.27 1.08.45l.95-.52a.75.75 0 01.9.13l1.67 1.67a.75.75 0 01.13.9l-.52.95c.18.34.33.7.45 1.08l1.03.3a.75.75 0 01.54.72v2.36a.75.75 0 01-.54.72l-1.03.3c-.12.38-.27.74-.45 1.08l.52.95a.75.75 0 01-.13.9l-1.67 1.67a.75.75 0 01-.9.13l-.95-.52c-.34.18-.7.33-1.08.45l-.3 1.03a.75.75 0 01-.72.54H7.64a.75.75 0 01-.72-.54l-.3-1.03a6.3 6.3 0 01-1.08-.45l-.95.52a.75.75 0 01-.9-.13L2.02 16.3a.75.75 0 01-.13-.9l.52-.95a6.3 6.3 0 01-.45-1.08l-1.03-.3a.75.75 0 01-.54-.72V10a.75.75 0 01.54-.72l1.03-.3c.12-.38.27-.74.45-1.08l-.52-.95a.75.75 0 01.13-.9l1.67-1.67a.75.75 0 01.9-.13l.95.52c.34-.18.7-.33 1.08-.45l.3-1.03a.75.75 0 01.72-.54H10zm-1.18 6.07a2.5 2.5 0 103.54 3.54 2.5 2.5 0 00-3.54-3.54z"
        fill="currentColor"
      />
    )
  };

  return (
    <svg className={`ui-icon ${className}`.trim()} viewBox="0 0 20 20" aria-hidden="true" focusable="false">
      {map[name] || map.chart}
    </svg>
  );
}

export default function App() {
  const [token, setToken] = useState(() => localStorage.getItem("career_app_token") || "");
  const [sessionLoading, setSessionLoading] = useState(() => Boolean(localStorage.getItem("career_app_token")));
  const [language, setLanguage] = useState(() => localStorage.getItem("career_app_language") || "fr");
  const [currency, setCurrency] = useState(getCurrency);
  const [theme, setTheme] = useState(getTheme);
  const [mode, setMode] = useState(getMode);
  const [density, setDensity] = useState(getDensity);

  useEffect(() => {
    applyThemeVars(theme);
    try {
      localStorage.setItem("career_app_theme", theme);
    } catch (_error) {
      // ignore storage errors (private mode, quota, etc.)
    }
  }, [theme]);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", mode);
    try {
      localStorage.setItem("career_app_mode", mode);
    } catch (_error) {
      // ignore storage errors (private mode, quota, etc.)
    }
  }, [mode]);

  useEffect(() => {
    document.documentElement.setAttribute("data-density", density);
    try {
      localStorage.setItem("career_app_density", density);
    } catch (_error) {
      // ignore storage errors (private mode, quota, etc.)
    }
  }, [density]);
  const [stripeEnabled, setStripeEnabled] = useState(false);
  const [planOverrides, setPlanOverrides] = useState({});
  const [session, setSession] = useState(null);
  const [premium, setPremium] = useState(null);
  const [activePage, setActivePage] = useState(readInitialActivePage);

  const [authError, setAuthError] = useState("");
  const [pageMessage, setPageMessage] = useState("");
  const [processingError, setProcessingError] = useState("");

  const [offerText, setOfferText] = useState("");
  const [latestCv, setLatestCv] = useState(null);
  const [cvHistory, setCvHistory] = useState([]);
  const [latestMatch, setLatestMatch] = useState(null);
  const [matchInsights, setMatchInsights] = useState(null);
  const [matchRunId, setMatchRunId] = useState(null);
  const [importStep, setImportStep] = useState("upload");
  const [isExtractingCv, setIsExtractingCv] = useState(false);
  const [cvSourceText, setCvSourceText] = useState("");
  const [cvFileName, setCvFileName] = useState("");
  const [cvReview, setCvReview] = useState(null);
  const [jobReview, setJobReview] = useState(null);
  const [isReviewingJob, setIsReviewingJob] = useState(false);

  const [isAnalysing, setIsAnalysing] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [pendingPlanAction, setPendingPlanAction] = useState(null);

  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [accountDrawerOpen, setAccountDrawerOpen] = useState(false);
  const [accountPanel, setAccountPanel] = useState("account");
  const [securitySaving, setSecuritySaving] = useState(false);
  const [securityForm, setSecurityForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
    logoutOtherSessions: true
  });

  const userMenuRef = useRef(null);

  const analysisUnlocked = Boolean(latestMatch);
  const user = session?.user;
  const [satisfactionEligible, setSatisfactionEligible] = useState(false);

  useEffect(() => {
    if (!user?.id) return undefined;
    let cancelled = false;
    // Petit délai pour ne pas afficher le sondage pile au chargement de la
    // page, laisser l'utilisateur atterrir avant de lui demander un avis.
    const timer = setTimeout(() => {
      getSatisfactionStatus(user.id)
        .then((eligible) => {
          if (!cancelled && eligible) setSatisfactionEligible(true);
        })
        .catch(() => {});
    }, 2000);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [user?.id]);

  const showRoleQuizModal =
    Boolean(user) &&
    !user?.profile?.onboardingQuizSeen &&
    !user?.profile?.targetRole &&
    (user?.roleType === "candidate" || user?.roleType === "student");
  const landingCopy = LANDING_COPY[language] || LANDING_COPY.fr;
  const authCopy = AUTH_COPY[language] || AUTH_COPY.fr;
  const appCopy = APP_COPY[language] || APP_COPY.fr;
  const canAnalyse = Boolean(latestCv && offerText.trim().length > 50 && !isAnalysing);
  const tokensBalance =
    user?.subscription?.credits ?? getPlanById("candidate_discovery")?.credits ?? 0;
  const tokensDisplay = tokensBalance >= 999 ? "∞" : tokensBalance;

  const profileCompleteness = useMemo(() => {
    if (!user) return 0;
    const profile = user.profile || {};
    let score = 0;
    if (profile.targetRole) score += 20;
    if (profile.location) score += 20;
    if (profile.sector) score += 20;
    if ((profile.skills || []).length >= 5) score += 20;
    if ((profile.experienceYears || 0) >= 1) score += 20;
    return score;
  }, [user]);

  useEffect(() => {
    if (!token) {
      localStorage.removeItem("career_app_token");
      return;
    }
    localStorage.setItem("career_app_token", token);
    syncSession(token);
  }, [token]);

  // Retour depuis Stripe Checkout (success_url/cancel_url pointent vers
  // #/app/tarifs?stripe=...) : le hash étant rechargé en dur par le
  // navigateur, activePage repart sinon toujours sur "home" par défaut.
  // On force la page Tarifs une fois au montage, l'effet de synchro du hash
  // plus bas se chargera de réécrire l'URL proprement ensuite.
  useEffect(() => {
    const hash = window.location.hash || "";
    const queryIndex = hash.indexOf("?");
    if (queryIndex === -1) return;
    const params = new URLSearchParams(hash.slice(queryIndex + 1));
    const stripeStatus = params.get("stripe");
    if (stripeStatus !== "success" && stripeStatus !== "cancel") return;
    setActivePage("tarifs");
    if (stripeStatus === "success") {
      setPageMessage(language === "en" ? "Payment confirmed, plan activated." : "Paiement confirmé, plan activé.");
      // Le webhook Stripe qui active réellement le plan est asynchrone : on
      // relit la session un peu après le retour pour refléter le nouveau
      // plan dès qu'il est possible, sans bloquer l'affichage immédiat.
      const currentToken = localStorage.getItem("career_app_token") || "";
      if (currentToken) {
        setTimeout(() => syncSession(currentToken), 1500);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("career_app_language", language);
  }, [language]);

  useEffect(() => {
    localStorage.setItem("career_app_currency", currency);
  }, [currency]);

  useEffect(() => {
    getHealth()
      .then((health) => setStripeEnabled(Boolean(health.stripeEnabled)))
      .catch(() => setStripeEnabled(false));
  }, []);

  useEffect(() => {
    getPlanOverrides().then(setPlanOverrides);
  }, []);

  useEffect(() => {
    if (!pageMessage) return;
    Swal.fire({
      toast: true,
      position: "top-end",
      icon: "success",
      title: pageMessage,
      showConfirmButton: false,
      timer: 3200,
      timerProgressBar: true,
      customClass: {
        popup: "career-toast",
        title: "career-toast-title"
      }
    });
  }, [pageMessage]);

  useEffect(() => {
    if (!processingError) return;
    Swal.fire({
      toast: true,
      position: "top-end",
      icon: "error",
      title: getFriendlyErrorMessage(processingError, language),
      showConfirmButton: false,
      timer: 4200,
      timerProgressBar: true,
      customClass: {
        popup: "career-toast",
        title: "career-toast-title"
      }
    });
  }, [processingError, language]);

  useEffect(() => {
    function handleWindowError(event) {
      event.preventDefault();
      setProcessingError(getFriendlyErrorMessage(event.error || event.message, language));
    }

    function handleUnhandledRejection(event) {
      event.preventDefault();
      setProcessingError(getFriendlyErrorMessage(event.reason, language));
    }

    window.addEventListener("error", handleWindowError);
    window.addEventListener("unhandledrejection", handleUnhandledRejection);
    return () => {
      window.removeEventListener("error", handleWindowError);
      window.removeEventListener("unhandledrejection", handleUnhandledRejection);
    };
  }, [language]);

  useEffect(() => {
    if (!user) {
      if (window.location.hash) {
        window.history.replaceState(null, "", window.location.pathname + window.location.search);
      }
      return;
    }
    const routeKey = getOpaqueRouteKey();
    const nextHash = `#/app/${routeKey}/${activePage}`;
    if (window.location.hash !== nextHash) {
      window.history.replaceState(null, "", nextHash);
    }
  }, [user, activePage]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function syncSession(nextToken) {
    try {
      const snapshot = await getUserFromSession(nextToken);
      if (!snapshot) {
        setToken("");
        setSession(null);
        setPremium(null);
        setLatestMatch(null);
        return;
      }
      setSession(snapshot);
      setPremium(snapshot.premium);

      const cvItems = await listUserCvs(snapshot.user.id);
      setCvHistory(cvItems);
      const matchRun = await getLatestMatchRun(snapshot.user.id);
      setLatestMatch(matchRun);
      setMatchRunId(matchRun?.id || null);

      const activeCv = cvItems[0] || null;
      setLatestCv(activeCv);
      if (activeCv) {
        setCvSourceText(activeCv.sourceText || "");
        setCvFileName(activeCv.fileName || "");
        setCvReview(activeCv.parsed || null);
      }

      if (matchRun?.matchInsights) {
        setMatchInsights(matchRun.matchInsights);
        setOfferText(matchRun.offerText || "");
        setJobReview(matchRun.jobReview || null);
        setImportStep("results");
      } else if (activeCv) {
        setImportStep("job");
      }
    } finally {
      setSessionLoading(false);
    }
  }

  function clearMessages() {
    setAuthError("");
    setPageMessage("");
    setProcessingError("");
  }

  async function handleLogin(credentials) {
    try {
      clearMessages();
      const result = credentials.code ? await verifyLoginCode(credentials) : await loginUser(credentials);
      setToken(result.token);
      setSessionLoading(true);
      await syncSession(result.token);
      setActivePage("home");
      rememberLastAuthMethod("password");
    } catch (error) {
      setAuthError(getFriendlyErrorMessage(error, language));
    }
  }

  async function handleGoogleLogin(credential) {
    try {
      clearMessages();
      const result = await loginWithGoogle(credential);
      setToken(result.token);
      setSessionLoading(true);
      await syncSession(result.token);
      setActivePage("home");
      rememberLastAuthMethod("google");
    } catch (error) {
      setAuthError(getFriendlyErrorMessage(error, language));
      throw error;
    }
  }

  async function handleRequestLoginCode(payload) {
    try {
      clearMessages();
      return await requestLoginCode(payload);
    } catch (error) {
      setAuthError(getFriendlyErrorMessage(error, language));
      throw error;
    }
  }

  async function handleSignup(payload) {
    try {
      clearMessages();
      return await registerUser(payload);
    } catch (error) {
      setAuthError(getFriendlyErrorMessage(error, language));
      throw error;
    }
  }

  async function handleVerifySignupCode({ identifier, code }) {
    try {
      clearMessages();
      const result = await verifyLoginCode({ identifier, code, purpose: "signup" });
      setToken(result.token);
      setSessionLoading(true);
      await syncSession(result.token);
      setActivePage("home");
      setPageMessage(
        language === "en"
          ? "Account verified. Welcome to Career App."
          : "Compte vérifié. Bienvenue sur Career App."
      );
    } catch (error) {
      setAuthError(getFriendlyErrorMessage(error, language));
      throw error;
    }
  }

  async function handleResendSignupCode(identifier) {
    try {
      clearMessages();
      return await requestLoginCode({ identifier, purpose: "signup" });
    } catch (error) {
      setAuthError(getFriendlyErrorMessage(error, language));
      throw error;
    }
  }

  async function handleCompleteRoleQuiz(targetRole, sector) {
    if (!user) return;
    try {
      const patch = { onboardingQuizSeen: true };
      if (targetRole) patch.targetRole = targetRole;
      if (sector) patch.sector = sector;
      const updated = await updateUserProfile(user.id, patch);
      setSession({ user: updated.user, premium: updated.premium });
      setPremium(updated.premium);
    } catch (error) {
      setProcessingError(getFriendlyErrorMessage(error, language));
    }
  }

  async function handleLogout() {
    if (token) {
      try {
        await logoutUser(token);
      } catch (_error) {
        // Ignore transport errors and clear local session anyway.
      }
    }
    setToken("");
    setSession(null);
    setPremium(null);
    setLatestCv(null);
    setLatestMatch(null);
    setOfferText("");
    setCvHistory([]);
    setImportStep("upload");
    setCvSourceText("");
    setCvFileName("");
    setCvReview(null);
    setJobReview(null);
    setActivePage("home");
    setAccountDrawerOpen(false);
    setUserMenuOpen(false);
    clearMessages();
  }

  function buildProfileFromReview(review) {
    return {
      headline: review?.headline || review?.summary || "",
      location: review?.location || "",
      targetRole: user?.profile?.targetRole || "",
      sector: user?.profile?.sector || "",
      experienceYears: Number(review?.experienceYears || 0),
      education: review?.education || review?.educationItems?.[0]?.degree || "",
      skills: review?.skills || [],
      languages: review?.languages || []
    };
  }

  function buildAccountPatchFromReview(review) {
    return {
      accountType: user?.roleType || "candidate",
      phone: review?.phone || user?.account?.phone || "",
      city: review?.location || user?.account?.city || "",
      country: user?.account?.country || "France",
      details: {
        ...(user?.account?.details || {}),
        currentTitle: review?.headline || user?.account?.details?.currentTitle || "",
        experienceYears: Number(review?.experienceYears || user?.account?.details?.experienceYears || 0),
        linkedinUrl: review?.linkedinUrl || user?.account?.details?.linkedinUrl || "",
        schoolName: review?.educationItems?.[0]?.school || user?.account?.details?.schoolName || "",
        studyLevel: review?.education || review?.educationItems?.[0]?.degree || user?.account?.details?.studyLevel || ""
      }
    };
  }

  // Le bouton "+ Ajouter" du réviseur de CV insère volontairement une entrée
  // vide (à remplir par l'utilisateur) dans les listes compétences/langues/
  // centres d'intérêt. Si elle n'est jamais remplie, on ne veut pas
  // l'enregistrer telle quelle : elle réapparaîtrait comme un badge vide
  // partout où le CV est ensuite affiché en lecture seule (aperçu, export,
  // optimisation ATS...).
  function sanitizeCvReviewArrays(parsed) {
    if (!parsed) return parsed;
    const trimList = (list) => (Array.isArray(list) ? list.map((item) => String(item || "").trim()).filter(Boolean) : list);
    return {
      ...parsed,
      skills: trimList(parsed.skills),
      softSkills: trimList(parsed.softSkills),
      languages: trimList(parsed.languages),
      interests: trimList(parsed.interests)
    };
  }

  async function saveCvToDb({ fileName, text, parsed: rawParsed }) {
    if (!user) return;

    const parsed = sanitizeCvReviewArrays(rawParsed);
    const cvRecord = createCvRecord({ fileName, sourceText: text, parsed });
    const saved = await addCvRecord(user.id, cvRecord);
    setLatestCv(saved);
    setCvHistory(await listUserCvs(user.id));

    const parsedProfile = parsed ? buildProfileFromReview(parsed) : saved.parsed || {};
    const mergedProfile = mergeProfileFromCv(user.profile || {}, parsedProfile);
    const updated = await updateUserProfile(user.id, mergedProfile);
    const accountUpdated = parsed ? await updateUserAccount(user.id, buildAccountPatchFromReview(parsed)) : updated;
    setSession({ user: accountUpdated.user, premium: accountUpdated.premium });
    setPremium(accountUpdated.premium);
    return saved;
  }

  async function handleCvFileUpload(file) {
    if (!file) return;
    try {
      clearMessages();
      setIsExtractingCv(true);
      setCvFileName(file.name);
      setImportStep("upload");
      let text = "";
      let extracted = null;
      try {
        const base64 = await fileToBase64(file);
        extracted = await extractCvFile({ fileName: file.name, mimeType: file.type, base64 });
        text = extracted.sourceText;
      } catch (serverError) {
        const binaryFormat =
          /\.(pdf|doc|docx)$/i.test(String(file.name || "")) ||
          /(pdf|msword|officedocument)/i.test(String(file.type || ""));
        if (binaryFormat) {
          throw serverError;
        }
        text = await readFileAsText(file);
      }
      if (text.trim().length < 20) {
        throw new Error(
          language === "en"
            ? "The file seems empty or unreadable. Upload a text-based PDF or DOCX."
            : "Le fichier semble vide ou non lisible. Importe un PDF texte ou un DOCX lisible."
        );
      }
      setCvSourceText(text);
      setCvReview(extracted?.parsed || parseCvText(text));
      setImportStep("review");
      setPageMessage(language === "en" ? "Extraction ready to review." : "Extraction prête à réviser.");
    } catch (error) {
      setProcessingError(getCvImportErrorMessage(error, language));
    } finally {
      setIsExtractingCv(false);
    }
  }

  // Enregistre le CV directement en base sans changer d'étape du wizard —
  // utilisé après une optimisation ATS, où renvoyer l'utilisateur vers
  // l'étape "Réviser le profil" ferait perdre sa progression (l'étape
  // "review" fait automatiquement avancer vers "job" une fois enregistrée).
  async function persistCvReview(nextReview) {
    await saveCvToDb({
      fileName: cvFileName || `cv-${new Date().toISOString().slice(0, 10)}.txt`,
      text: cvSourceText,
      parsed: nextReview
    });
  }

  async function handleCvReviewSave(nextReview) {
    try {
      clearMessages();
      setCvReview(nextReview);
      await saveCvToDb({
        fileName: cvFileName || `cv-${new Date().toISOString().slice(0, 10)}.txt`,
        text: cvSourceText,
        parsed: nextReview
      });
      setImportStep("job");
      setPageMessage(language === "en" ? "CV saved. Add the target job." : "CV enregistré. Ajoute maintenant le poste visé.");
    } catch (error) {
      setProcessingError(getFriendlyErrorMessage(error, language));
    }
  }

  function resetCvImport() {
    setImportStep("upload");
    setCvSourceText("");
    setCvFileName("");
    setCvReview(null);
    setJobReview(null);
    setMatchInsights(null);
    clearMessages();
  }

  async function handleJobReview() {
    try {
      clearMessages();
      if (offerText.trim().length < 50) {
        throw new Error(language === "en" ? "Paste at least 50 characters for the job description." : "Colle au moins 50 caractères pour la description du poste.");
      }
      setIsReviewingJob(true);
      const result = await extractJobOffer({ text: offerText });
      setJobReview(result?.parsed || extractOfferSummary(offerText));
    } catch (error) {
      setProcessingError(getFriendlyErrorMessage(error, language));
      setJobReview(extractOfferSummary(offerText));
    } finally {
      setIsReviewingJob(false);
    }
  }

  function handleImportStepClick(step) {
    clearMessages();
    if (step === "upload") {
      setImportStep("upload");
      return;
    }
    if (step === "review" && cvReview) {
      setImportStep("review");
      return;
    }
    if (step === "job" && latestCv) {
      setImportStep("job");
    }
  }

  async function handleProfileSave(profilePayload) {
    if (!user) return;
    try {
      clearMessages();
      const updated = await updateUserProfile(user.id, profilePayload);
      setSession({ user: updated.user, premium: updated.premium });
      setPremium(updated.premium);
      setPageMessage(language === "en" ? "Profile updated." : "Profil mis à jour.");
    } catch (error) {
      setProcessingError(getFriendlyErrorMessage(error, language));
    }
  }

  async function handleAccountSave(accountPayload) {
    if (!user) return;
    try {
      clearMessages();
      const updated = await updateUserAccount(user.id, accountPayload);
      setSession({ user: updated.user, premium: updated.premium });
      setPremium(updated.premium);
      setPageMessage(language === "en" ? "Account information updated." : "Informations compte mises à jour.");
    } catch (error) {
      setProcessingError(getFriendlyErrorMessage(error, language));
    }
  }

  async function handleAvatarUpload(file) {
    if (!user) return;
    try {
      clearMessages();
      if (!file) {
        setAvatarUploading(true);
        const updated = await updateUserAvatar(user.id, "");
        setSession({ user: updated.user, premium: updated.premium });
        setPremium(updated.premium);
        setPageMessage(language === "en" ? "Profile photo removed." : "Photo de profil supprimée.");
        return;
      }
      if (!file.type.startsWith("image/")) {
        throw new Error(language === "en" ? "Select a valid image." : "Sélectionne une image valide.");
      }
      if (file.size > 10 * 1024 * 1024) {
        throw new Error(language === "en" ? "Image too large. Maximum 10 MB." : "Image trop lourde. Maximum 10 Mo.");
      }

      setAvatarUploading(true);
      const avatarDataUrl = await resizeImageFileToDataUrl(file);
      const updated = await updateUserAvatar(user.id, avatarDataUrl);
      setSession({ user: updated.user, premium: updated.premium });
      setPremium(updated.premium);
      setPageMessage(language === "en" ? "Profile photo updated." : "Photo de profil mise à jour.");
    } catch (error) {
      setProcessingError(getFriendlyErrorMessage(error, language));
    } finally {
      setAvatarUploading(false);
    }
  }

  async function handleSecondaryEmailRequest(email) {
    if (!user) return null;
    clearMessages();
    return requestSecondaryEmailCode(user.id, email);
  }

  async function handleSecondaryEmailVerify(email, code) {
    if (!user) return;
    try {
      clearMessages();
      const updated = await verifySecondaryEmail(user.id, email, code);
      setSession({ user: updated.user, premium: updated.premium });
      setPremium(updated.premium);
      setPageMessage(language === "en" ? "Email address added." : "Adresse e-mail ajoutée.");
    } catch (error) {
      setProcessingError(getFriendlyErrorMessage(error, language));
      throw error;
    }
  }

  async function handlePrimaryEmail(emailId) {
    if (!user) return;
    try {
      clearMessages();
      const updated = await setPrimaryEmail(user.id, emailId);
      setSession({ user: updated.user, premium: updated.premium });
      setPremium(updated.premium);
      setPageMessage(language === "en" ? "Primary email updated." : "Adresse principale mise à jour.");
    } catch (error) {
      setProcessingError(getFriendlyErrorMessage(error, language));
    }
  }

  async function handleRemoveEmail(emailId) {
    if (!user) return;
    try {
      clearMessages();
      const updated = await removeSecondaryEmail(user.id, emailId);
      setSession({ user: updated.user, premium: updated.premium });
      setPremium(updated.premium);
      setPageMessage(language === "en" ? "Email address removed." : "Adresse e-mail supprimée.");
    } catch (error) {
      setProcessingError(getFriendlyErrorMessage(error, language));
    }
  }

  async function handleRemoveConnectedAccount(provider = "google") {
    if (!user) return;
    try {
      clearMessages();
      const updated = await removeConnectedAccount(user.id, provider);
      setSession({ user: updated.user, premium: updated.premium });
      setPremium(updated.premium);
      setPageMessage(language === "en" ? "Connected account removed." : "Compte connecté retiré.");
    } catch (error) {
      setProcessingError(getFriendlyErrorMessage(error, language));
    }
  }

  async function handleLinkGoogleAccount(credential) {
    if (!user) return;
    try {
      clearMessages();
      const updated = await linkGoogleAccount(user.id, credential);
      setSession({ user: updated.user, premium: updated.premium });
      setPremium(updated.premium);
      setPageMessage(language === "en" ? "Google account linked." : "Compte Google lié.");
    } catch (error) {
      setProcessingError(getFriendlyErrorMessage(error, language));
    }
  }

  async function handleDeleteAccount(confirmation) {
    if (!user) return;
    try {
      clearMessages();
      await deleteUserAccount(user.id, confirmation);
      localStorage.removeItem("career_app_token");
      setToken("");
      setSession(null);
      setPremium(null);
      setLatestCv(null);
      setLatestMatch(null);
      setOfferText("");
      setCvHistory([]);
      setImportStep("upload");
      setCvSourceText("");
      setCvFileName("");
      setCvReview(null);
      setJobReview(null);
      setActivePage("home");
      setAccountDrawerOpen(false);
      setUserMenuOpen(false);
    } catch (error) {
      setProcessingError(getFriendlyErrorMessage(error, language));
      throw error;
    }
  }

  async function handlePremiumActivation() {
    if (!user) return;
    try {
      clearMessages();
      const updated = await activatePremiumSubscription(user.id);
      setSession({ user: updated.user, premium: updated.premium });
      setPremium(updated.premium);
      setPageMessage(language === "en" ? "Premium offer activated for 30 days." : "Offre premium activée pour 30 jours.");
    } catch (error) {
      setProcessingError(getFriendlyErrorMessage(error, language));
    }
  }

  async function handleActivatePlan(planId, billingCycle) {
    if (!user) return;
    setPendingPlanAction(planId);
    try {
      clearMessages();
      const updated = await activatePlan({ userId: user.id, planId, billingCycle });
      setSession({ user: updated.user, premium: updated.premium });
      setPremium(updated.premium);
      if (updated.licenseCode) {
        setPageMessage(
          language === "en"
            ? `Plan activated. Your license code to share: ${updated.licenseCode}`
            : `Plan activé. Votre code de licence à partager : ${updated.licenseCode}`
        );
      } else {
        setPageMessage(language === "en" ? "Plan activated." : "Plan activé.");
      }
    } catch (error) {
      setProcessingError(getFriendlyErrorMessage(error, language));
    } finally {
      setPendingPlanAction(null);
    }
  }

  async function handleStripeCheckout(planId, billingCycle, quantity = 1) {
    if (!user) return;
    setPendingPlanAction(planId);
    try {
      clearMessages();
      const { url } = await createStripeCheckoutSession({ userId: user.id, planId, billingCycle, quantity });
      window.location.href = url;
    } catch (error) {
      setProcessingError(getFriendlyErrorMessage(error, language));
      setPendingPlanAction(null);
    }
  }

  async function handleRedeemLicenseCode(code) {
    if (!user || !code.trim()) return;
    setPendingPlanAction("license");
    try {
      clearMessages();
      const updated = await redeemLicenseCode({ userId: user.id, code: code.trim() });
      setSession({ user: updated.user, premium: updated.premium });
      setPremium(updated.premium);
      setPageMessage(language === "en" ? "License code activated." : "Code de licence activé.");
    } catch (error) {
      setProcessingError(getFriendlyErrorMessage(error, language));
    } finally {
      setPendingPlanAction(null);
    }
  }

  function buildCandidatePayload() {
    return {
      firstName: user.firstName || latestCv?.parsed?.firstName || cvReview?.firstName || "",
      lastName: user.lastName || latestCv?.parsed?.lastName || cvReview?.lastName || "",
      skills: unique([...(user.profile?.skills || []), ...(latestCv?.parsed?.skills || [])]),
      experienceYears: Math.max(user.profile?.experienceYears || 0, latestCv?.parsed?.experienceYears || 0),
      education: user.profile?.education || latestCv?.parsed?.education || "",
      targetRole: user.profile?.targetRole || "",
      sector: user.profile?.sector || "",
      headline: user.profile?.headline || latestCv?.parsed?.headline || "",
      summary: latestCv?.parsed?.summary || ""
    };
  }

  async function handleAnalyse() {
    if (!user || !latestCv || !canAnalyse) return;

    if (tokensBalance < 999 && tokensBalance <= 0) {
      goTo("tarifs");
      setPageMessage(
        language === "en"
          ? "You're out of tokens. Choose a plan to keep analyzing job offers."
          : "Vous n'avez plus de jetons. Choisissez un plan pour continuer à analyser des offres."
      );
      return;
    }

    clearMessages();
    setMatchInsights(null);
    setImportStep("results");
    setIsAnalysing(true);

    try {
      const candidate = buildCandidatePayload();
      const offerForAi = jobReview || extractOfferSummary(offerText);

      const [offers, premiumSnapshot] = await Promise.all([listOffers(), getPremiumSnapshot(user.id)]);
      const result = runMatching({
        user,
        cvRecord: latestCv,
        offerText,
        offers,
        premiumAccess: premiumSnapshot
      });

      const matchResponse = await analyzeMatch({ candidate, offer: offerForAi });

      await saveMatchRun(user.id, { ...result, matchInsights: matchResponse.analysis, jobReview: offerForAi, offerText });
      setLatestMatch(result);
      setMatchInsights(matchResponse.analysis);

      try {
        const tokenUpdate = await consumeTokens({ userId: user.id, amount: 1 });
        setSession({ user: tokenUpdate.user, premium: tokenUpdate.premium });
        setPremium(tokenUpdate.premium);
      } catch (_tokenError) {
        // Analysis already succeeded; a token-accounting hiccup shouldn't block the result.
      }

      await syncSession(token);
      setPageMessage(
        language === "en"
          ? "Analysis completed. You can open Analysis, Jobs, CV+, and Interviews."
          : "Analyse terminée. Vous pouvez ouvrir Analyse, Offres, CV+ et Entretiens."
      );
    } catch (error) {
      setProcessingError(getFriendlyErrorMessage(error, language));
      setImportStep("job");
    } finally {
      setIsAnalysing(false);
    }
  }

  async function submitPasswordChange(event) {
    event.preventDefault();
    if (!user) return;
    try {
      clearMessages();
      if (securityForm.newPassword.length < 8) {
        throw new Error(
          language === "en"
            ? "The new password must contain at least 8 characters."
            : "Le nouveau mot de passe doit contenir au moins 8 caractères."
        );
      }
      if (securityForm.newPassword !== securityForm.confirmPassword) {
        throw new Error(
          language === "en"
            ? "Password confirmation does not match."
            : "La confirmation du mot de passe ne correspond pas."
        );
      }

      setSecuritySaving(true);
      const updated = await changeUserPassword(user.id, securityForm.currentPassword, securityForm.newPassword, {
        token,
        logoutOtherSessions: securityForm.logoutOtherSessions
      });
      setSecurityForm({ currentPassword: "", newPassword: "", confirmPassword: "", logoutOtherSessions: true });
      setSession({ user: updated.user, premium: updated.premium });
      setPremium(updated.premium);
      setPageMessage(language === "en" ? "Password updated." : "Mot de passe mis à jour.");
    } catch (error) {
      setProcessingError(getFriendlyErrorMessage(error, language));
    } finally {
      setSecuritySaving(false);
    }
  }

  function goTo(pageId) {
    const navItem = NAV_ITEMS.find((item) => item.id === pageId);
    if (!analysisUnlocked && navItem && !navItem.always) {
      return;
    }
    setActivePage(pageId);
    setPageMessage("");
    setProcessingError("");
    setUserMenuOpen(false);
  }

  if (sessionLoading) {
    return (
      <div className="app-boot-splash">
        <div className="app-boot-loader" aria-hidden="true">
          <span className="brand-mark" aria-hidden="true">
            <UiIcon name="matchmark" />
          </span>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <AuthScreen
        onLogin={handleLogin}
        onRequestLoginCode={handleRequestLoginCode}
        onSignup={handleSignup}
        onVerifySignupCode={handleVerifySignupCode}
        onResendSignupCode={handleResendSignupCode}
        onGoogleLogin={handleGoogleLogin}
        onClearError={() => setAuthError("")}
        error={authError}
        helper={authCopy.helper}
        language={language}
        setLanguage={setLanguage}
        copy={authCopy}
        landingCopy={landingCopy}
      />
    );
  }

  if (user.roleType === "admin") {
    return (
      <AdminApp
        user={user}
        language={language}
        setLanguage={setLanguage}
        currency={currency}
        setCurrency={setCurrency}
        theme={theme}
        setTheme={setTheme}
        mode={mode}
        setMode={setMode}
        density={density}
        setDensity={setDensity}
        onLogout={handleLogout}
        landingCopy={landingCopy}
        onSaveAccount={handleAccountSave}
        onAvatarUpload={handleAvatarUpload}
        avatarUploading={avatarUploading}
        onRequestSecondaryEmail={handleSecondaryEmailRequest}
        onVerifySecondaryEmail={handleSecondaryEmailVerify}
        onSetPrimaryEmail={handlePrimaryEmail}
        onRemoveEmail={handleRemoveEmail}
        onRemoveConnectedAccount={handleRemoveConnectedAccount}
        onLinkGoogleAccount={handleLinkGoogleAccount}
        securityForm={securityForm}
        setSecurityForm={setSecurityForm}
        securitySaving={securitySaving}
        onSubmitPassword={submitPasswordChange}
        onDeleteAccount={handleDeleteAccount}
      />
    );
  }

  if (user.roleType === "school") {
    return (
      <SchoolApp
        user={user}
        language={language}
        setLanguage={setLanguage}
        currency={currency}
        setCurrency={setCurrency}
        theme={theme}
        setTheme={setTheme}
        mode={mode}
        setMode={setMode}
        density={density}
        setDensity={setDensity}
        onLogout={handleLogout}
        landingCopy={landingCopy}
        onSaveAccount={handleAccountSave}
        onAvatarUpload={handleAvatarUpload}
        avatarUploading={avatarUploading}
        onRequestSecondaryEmail={handleSecondaryEmailRequest}
        onVerifySecondaryEmail={handleSecondaryEmailVerify}
        onSetPrimaryEmail={handlePrimaryEmail}
        onRemoveEmail={handleRemoveEmail}
        onRemoveConnectedAccount={handleRemoveConnectedAccount}
        onLinkGoogleAccount={handleLinkGoogleAccount}
        securityForm={securityForm}
        setSecurityForm={setSecurityForm}
        securitySaving={securitySaving}
        onSubmitPassword={submitPasswordChange}
        onDeleteAccount={handleDeleteAccount}
      />
    );
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          Career App
        </div>

        <nav className="topnav">
          {NAV_ITEMS.map((item) => {
            const isLocked = !item.always && !analysisUnlocked;
            const isActive = activePage === item.id;
            return (
              <button
                key={item.id}
                className={`nav-btn ${isActive ? "active" : ""}`}
                onClick={() => goTo(item.id)}
                disabled={isLocked}
              >
                <span className="nav-btn-icon">
                  <UiIcon name={item.icon} />
                </span>
                <span className="nav-btn-label">{item.label[language] || item.label.fr}</span>
              </button>
            );
          })}
        </nav>

        <div className="topbar-user" ref={userMenuRef}>
          <LanguageSwitch language={language} setLanguage={setLanguage} compact />
          <button type="button" className="topbar-tokens" onClick={() => goTo("tarifs")} title={language === "en" ? "Tokens balance" : "Solde de jetons"}>
            <UiIcon name="pricetag" />
            <span>{tokensDisplay}</span>
          </button>
          <button className="user-menu-trigger" onClick={() => setUserMenuOpen((prev) => !prev)}>
            <AvatarCircle user={user} />
            <div className="topbar-user-meta">
              <strong>
                {user.firstName} {user.lastName}
              </strong>
              <span>
                {getAccountLabel(user.roleType, language)} · {user.subscription?.plan === "premium" ? "Premium" : "Free"}
              </span>
            </div>
          </button>

          {userMenuOpen ? (
            <div className="user-dropdown">
              <div className="user-dropdown-head">
                <AvatarCircle user={user} />
                <div>
                  <strong>{user.firstName} {user.lastName}</strong>
                  <span>{user.username || user.email.split("@")[0]}</span>
                  {user.schoolLicense && !user.schoolLicense.revoked && (user.schoolLicense.acronym || user.schoolLicense.organizationName) ? (
                    <span className="user-dropdown-school">
                      {language === "en" ? "Account linked to " : "Compte associé à "}
                      {user.schoolLicense.acronym && user.schoolLicense.organizationName
                        ? `${user.schoolLicense.organizationName} - ${user.schoolLicense.acronym}`
                        : user.schoolLicense.acronym || user.schoolLicense.organizationName}
                    </span>
                  ) : null}
                </div>
              </div>
              <button
                onClick={() => {
                  setAccountPanel("account");
                  setAccountDrawerOpen(true);
                  setUserMenuOpen(false);
                }}
              >
                <span className="dropdown-icon">
                  <UiIcon name="profile" />
                </span>
                {language === "en" ? "Manage account" : "Gérer son compte"}
              </button>
              <button onClick={handleLogout}>
                <span className="dropdown-icon danger">
                  <UiIcon name="logout" />
                </span>
                {appCopy.menu.logout}
              </button>
              <div className="user-dropdown-secured">Secured by <strong>Career App</strong></div>
            </div>
          ) : null}
        </div>
      </header>

      <main className={`main-wrap ${activePage === "import" ? "main-wrap-wide" : ""}`}>
        {activePage === "home" ? (
          <HomePage
            onStart={() => goTo("import")}
            onSeeTarifs={() => goTo("tarifs")}
            user={user}
            premium={premium}
            profileCompleteness={profileCompleteness}
            latestMatch={latestMatch}
            cvCount={cvHistory.length}
            language={language}
          />
        ) : null}
        {activePage === "import" ? (
          <ImportPage
            latestCv={latestCv}
            offerText={offerText}
            setOfferText={(value) => {
              setOfferText(value);
              setJobReview(null);
            }}
            onFileUpload={handleCvFileUpload}
            onReviewSave={handleCvReviewSave}
            onReimport={resetCvImport}
            onAnalyse={handleAnalyse}
            onJobReview={handleJobReview}
            jobReview={jobReview}
            onEditJob={() => setJobReview(null)}
            onStepClick={handleImportStepClick}
            canAnalyse={canAnalyse}
            isReviewingJob={isReviewingJob}
            isAnalysing={isAnalysing}
            matchInsights={matchInsights}
            matchRunId={matchRunId}
            userId={user?.id}
            subscription={user?.subscription}
            onGoToTarifs={() => goTo("tarifs")}
            language={language}
            importStep={importStep}
            isExtractingCv={isExtractingCv}
            cvReview={cvReview}
            setCvReview={setCvReview}
            cvFileName={cvFileName}
            cvSourceText={cvSourceText}
            avatarDataUrl={user?.avatarDataUrl}
            tokensBalance={tokensBalance}
            onApplyOptimization={(next) => setCvReview((prev) => ({ ...(prev || {}), ...next }))}
            onSaveCvReview={persistCvReview}
            onConsumeToken={async () => {
              const tokenUpdate = await consumeTokens({ userId: user.id, amount: 1 });
              setSession({ user: tokenUpdate.user, premium: tokenUpdate.premium });
              setPremium(tokenUpdate.premium);
            }}
          />
        ) : null}

        {activePage === "profil" ? (
          <ProfilePage
            user={user}
            premium={premium}
            profileCompleteness={profileCompleteness}
            onSaveProfile={handleProfileSave}
            onSaveAccount={handleAccountSave}
            onAvatarUpload={handleAvatarUpload}
            avatarUploading={avatarUploading}
            onActivatePremium={handlePremiumActivation}
            language={language}
          />
        ) : null}

        {activePage === "analyse" ? <AnalysisPage matchData={latestMatch} language={language} /> : null}
        {activePage === "offres" ? <OffersPage matchData={latestMatch} premium={premium} language={language} /> : null}
        {activePage === "candidatures" ? <ApplicationsPage language={language} userId={user?.id} cvHistory={cvHistory} /> : null}
        {activePage === "entretiens" ? (
          <InterviewPage language={language} subscription={user?.subscription} onGoToTarifs={() => goTo("tarifs")} />
        ) : null}
        {activePage === "lettre" ? (
          <CoverLetterPage
            language={language}
            userId={user?.id}
            candidate={user ? buildCandidatePayload() : null}
            offer={jobReview || extractOfferSummary(offerText)}
            tokensBalance={tokensBalance}
            onGoToTarifs={() => goTo("tarifs")}
            onConsumeToken={async () => {
              const tokenUpdate = await consumeTokens({ userId: user.id, amount: 1 });
              setSession({ user: tokenUpdate.user, premium: tokenUpdate.premium });
              setPremium(tokenUpdate.premium);
            }}
          />
        ) : null}
        {activePage === "negociation" ? (
          <SalaryNegotiationPage
            language={language}
            currency={currency}
            userId={user?.id}
            candidate={user ? buildCandidatePayload() : null}
            offer={jobReview || extractOfferSummary(offerText)}
            tokensBalance={tokensBalance}
            onGoToTarifs={() => goTo("tarifs")}
            onConsumeToken={async () => {
              const tokenUpdate = await consumeTokens({ userId: user.id, amount: 1 });
              setSession({ user: tokenUpdate.user, premium: tokenUpdate.premium });
              setPremium(tokenUpdate.premium);
            }}
          />
        ) : null}
        {activePage === "email-finder" ? (
          <EmailFinderPage
            language={language}
            userId={user.id}
            tokensBalance={tokensBalance}
            onGoToTarifs={() => goTo("tarifs")}
            onConsumeToken={async () => {
              const tokenUpdate = await consumeTokens({ userId: user.id, amount: 1 });
              setSession({ user: tokenUpdate.user, premium: tokenUpdate.premium });
              setPremium(tokenUpdate.premium);
            }}
          />
        ) : null}
        {activePage === "historique" ? <CvHistoryPage cvHistory={cvHistory} latestMatch={latestMatch} language={language} /> : null}
        {activePage === "tarifs" ? (
          <PricingPage
            user={user}
            premium={premium}
            language={language}
            currency={currency}
            stripeEnabled={stripeEnabled}
            planOverrides={planOverrides}
            onActivatePlan={handleActivatePlan}
            onStripeCheckout={handleStripeCheckout}
            onRedeemCode={handleRedeemLicenseCode}
            pendingPlanAction={pendingPlanAction}
          />
        ) : null}
      </main>

      <ConnectedFooter copy={landingCopy} />

      {showRoleQuizModal ? <RoleQuizModal language={language} onComplete={handleCompleteRoleQuiz} /> : null}

      {!showRoleQuizModal && satisfactionEligible && user ? (
        <SatisfactionSurveyModal userId={user.id} language={language} onClose={() => setSatisfactionEligible(false)} />
      ) : null}

      {accountDrawerOpen ? (
        <AccountDrawer
          user={user}
          language={language}
          setLanguage={setLanguage}
          currency={currency}
          setCurrency={setCurrency}
          theme={theme}
          setTheme={setTheme}
          mode={mode}
          setMode={setMode}
          density={density}
          setDensity={setDensity}
          activePanel={accountPanel}
          setActivePanel={setAccountPanel}
          onClose={() => setAccountDrawerOpen(false)}
          onSaveAccount={handleAccountSave}
          onAvatarUpload={handleAvatarUpload}
          avatarUploading={avatarUploading}
          onRequestSecondaryEmail={handleSecondaryEmailRequest}
          onVerifySecondaryEmail={handleSecondaryEmailVerify}
          onSetPrimaryEmail={handlePrimaryEmail}
          onRemoveEmail={handleRemoveEmail}
          onRemoveConnectedAccount={handleRemoveConnectedAccount}
          onLinkGoogleAccount={handleLinkGoogleAccount}
          securityForm={securityForm}
          setSecurityForm={setSecurityForm}
          securitySaving={securitySaving}
          onSubmitPassword={submitPasswordChange}
          onDeleteAccount={handleDeleteAccount}
        />
      ) : null}
    </div>
  );
}

const ADMIN_ACCOUNT_TYPES = [
  { id: "student", segment: "candidate", label: { fr: "Étudiant / Candidat", en: "Student / Candidate" } },
  { id: "school", segment: "school", label: { fr: "École", en: "School" } },
  { id: "recruiter_firm", segment: "agency", label: { fr: "Cabinet de recrutement", en: "Recruitment agency" } },
  { id: "admin", segment: null, label: { fr: "Administrateur", en: "Administrator" } }
];

const ADMIN_MODULE_DEFS = [
  { id: "dashboard", icon: "chart" },
  { id: "accounts", icon: "profile" },
  { id: "adminCvs", icon: "save" },
  { id: "adminMatches", icon: "matchmark" },
  { id: "quality", icon: "shield" },
  { id: "aiMonitoring", icon: "chart" },
  { id: "finance", icon: "scale" },
  { id: "licenses", icon: "save" },
  { id: "aiSamples", icon: "shield" },
  { id: "settings", icon: "globe" },
  { id: "announcements", icon: "mail" },
  { id: "activity", icon: "history" },
  { id: "pricing", icon: "pricetag" },
  { id: "satisfaction", icon: "chat" }
];

function getAllowedAdminModules(user) {
  const modules = Array.isArray(user?.adminModules) ? user.adminModules : [];
  if (!modules.length) return ADMIN_MODULE_DEFS.map((item) => item.id);
  return ADMIN_MODULE_DEFS.map((item) => item.id).filter((id) => modules.includes(id));
}

const ADMIN_MODULE_LABELS = {
  dashboard: { fr: "Dashboard", en: "Dashboard" },
  accounts: { fr: "Gestion de compte", en: "Account management" },
  adminCvs: { fr: "CV importés", en: "Uploaded CVs" },
  adminMatches: { fr: "Offres analysées", en: "Analyzed jobs" },
  quality: { fr: "Qualité extraction", en: "Extraction quality" },
  aiMonitoring: { fr: "Monitoring IA", en: "AI monitoring" },
  finance: { fr: "Gestion de finance", en: "Finance management" },
  activity: { fr: "Journal d'activité", en: "Activity log" },
  licenses: { fr: "Codes de licence", en: "License codes" },
  aiSamples: { fr: "Modération IA", en: "AI moderation" },
  settings: { fr: "Paramètres plateforme", en: "Platform settings" },
  announcements: { fr: "Emails d'annonce", en: "Announcement emails" },
  pricing: { fr: "Tarifs", en: "Pricing" },
  satisfaction: { fr: "Satisfaction", en: "Satisfaction" }
};

function AdminApp({
  user,
  language,
  setLanguage,
  currency,
  setCurrency,
  theme,
  setTheme,
  mode,
  setMode,
  density,
  setDensity,
  onLogout,
  landingCopy,
  onSaveAccount,
  onAvatarUpload,
  avatarUploading,
  onRequestSecondaryEmail,
  onVerifySecondaryEmail,
  onSetPrimaryEmail,
  onRemoveEmail,
  onRemoveConnectedAccount,
  onLinkGoogleAccount,
  securityForm,
  setSecurityForm,
  securitySaving,
  onSubmitPassword,
  onDeleteAccount
}) {
  const allowedModules = getAllowedAdminModules(user);
  const [tab, setTab] = useState(() => {
    try {
      return localStorage.getItem("career_app_admin_tab") || allowedModules[0] || "dashboard";
    } catch (_error) {
      return allowedModules[0] || "dashboard";
    }
  });
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [accountDrawerOpen, setAccountDrawerOpen] = useState(false);
  const [accountPanel, setAccountPanel] = useState("account");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [searchInput, setSearchInput] = useState("");
  const [accountsSearch, setAccountsSearch] = useState("");
  const [licenseSearch, setLicenseSearch] = useState("");
  const [financeSearch, setFinanceSearch] = useState("");
  const [searchSuggestions, setSearchSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [notifOpen, setNotifOpen] = useState(false);
  const [routeLoading, setRouteLoading] = useState(false);
  const notifRef = useRef(null);
  const userMenuRef = useRef(null);
  const searchBoxRef = useRef(null);
  const searchCopy =
    language === "en" ? { placeholder: "Search accounts…" } : { placeholder: "Rechercher des comptes…" };

  useEffect(() => {
    function handleClickOutside(event) {
      if (searchBoxRef.current && !searchBoxRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const term = searchInput.trim();
    if (!term) {
      setSearchSuggestions([]);
      return undefined;
    }
    const timer = setTimeout(() => {
      const lookups = [];
      if (allowedModules.includes("accounts")) {
        lookups.push(
          listAdminUsers(user.id, { search: term })
            .then((items) => items.slice(0, 4).map((item) => ({ kind: "account", ...item })))
            .catch(() => [])
        );
      }
      if (allowedModules.includes("licenses")) {
        lookups.push(
          getAdminLicenseCodes(user.id, { search: term })
            .then((items) => items.slice(0, 3).map((item) => ({ kind: "license", ...item })))
            .catch(() => [])
        );
      }
      if (allowedModules.includes("finance")) {
        lookups.push(
          getAdminFinance(user.id, { search: term })
            .then((data) => (data.items || []).slice(0, 3).map((item) => ({ kind: "transaction", ...item })))
            .catch(() => [])
        );
      }
      Promise.all(lookups).then((groups) => setSearchSuggestions(groups.flat()));
    }, 250);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  useEffect(() => {
    function handleClickOutsideNotif(event) {
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setNotifOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutsideNotif);
    return () => document.removeEventListener("mousedown", handleClickOutsideNotif);
  }, []);

  useEffect(() => {
    let cancelled = false;
    function load() {
      getAdminNotifications(user.id)
        .then((items) => {
          if (!cancelled) setNotifications(items || []);
        })
        .catch(() => {});
    }
    load();
    const interval = setInterval(load, 60000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [user.id]);

  function goToResult(item) {
    setShowSuggestions(false);
    if (item.kind === "license") {
      setLicenseSearch(item.code);
      setSearchInput(item.code);
      setTab("licenses");
    } else if (item.kind === "transaction") {
      setFinanceSearch(item.userEmail || item.id);
      setSearchInput(item.userEmail || item.id);
      setTab("finance");
    } else {
      setAccountsSearch(item.email);
      setSearchInput(item.email);
      setTab("accounts");
    }
  }

  function submitSearch(event) {
    event.preventDefault();
    if (!searchInput.trim() || !allowedModules.includes("accounts")) return;
    setAccountsSearch(searchInput.trim());
    setShowSuggestions(false);
    setTab("accounts");
  }
  const copy =
    language === "en"
      ? {
          dashboard: "Dashboard",
          pricing: "Pricing",
          accounts: "Account management",
          adminCvs: "Uploaded CVs",
          adminMatches: "Analyzed jobs",
          quality: "Extraction quality",
          aiMonitoring: "AI monitoring",
          finance: "Finance management",
          activity: "Activity log",
          licenses: "License codes",
          aiSamples: "AI moderation",
          settings: "Platform settings",
          announcements: "Announcement emails",
          accountSettings: "My profile",
          logout: "Log out",
          role: "Administrator",
          secured: "Secured by"
        }
      : {
          dashboard: "Dashboard",
          pricing: "Tarifs",
          accounts: "Gestion de compte",
          adminCvs: "CV importés",
          adminMatches: "Offres analysées",
          quality: "Qualité extraction",
          aiMonitoring: "Monitoring IA",
          finance: "Gestion de finance",
          activity: "Journal d'activité",
          licenses: "Codes de licence",
          aiSamples: "Modération IA",
          settings: "Paramètres plateforme",
          announcements: "Emails d'annonce",
          accountSettings: "Mon profil",
          logout: "Déconnexion",
          role: "Administrateur",
          secured: "Sécurisé par"
        };
  const getAdminModuleLabel = (id) => copy[id] || ADMIN_MODULE_LABELS[id]?.[language] || ADMIN_MODULE_LABELS[id]?.fr || id;

  useEffect(() => {
    function handleClickOutside(event) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!allowedModules.includes(tab)) {
      setTab(allowedModules[0] || "dashboard");
    }
  }, [tab, allowedModules]);

  useEffect(() => {
    try {
      localStorage.setItem("career_app_admin_tab", tab);
    } catch (_error) {
      // ignore storage errors (private mode, quota, etc.)
    }
  }, [tab]);

  useEffect(() => {
    setRouteLoading(true);
    const timer = window.setTimeout(() => setRouteLoading(false), 360);
    return () => window.clearTimeout(timer);
  }, [tab]);

  function openAccountSettings() {
    setAccountPanel("account");
    setAccountDrawerOpen(true);
    setUserMenuOpen(false);
  }

  function renderAdminPage() {
    if (tab === "dashboard" && allowedModules.includes("dashboard")) return <AdminDashboardPage user={user} language={language} />;
    if (tab === "accounts" && allowedModules.includes("accounts")) {
      return <AdminAccountsPage user={user} language={language} currency={currency} initialSearch={accountsSearch} />;
    }
    if (tab === "adminCvs" && allowedModules.includes("adminCvs")) return <AdminCvsPage user={user} language={language} />;
    if (tab === "adminMatches" && allowedModules.includes("adminMatches")) return <AdminMatchesPage user={user} language={language} />;
    if (tab === "quality" && allowedModules.includes("quality")) return <AdminQualityPage user={user} language={language} />;
    if (tab === "aiMonitoring" && allowedModules.includes("aiMonitoring")) return <AdminAiMonitoringPage user={user} language={language} />;
    if (tab === "finance" && allowedModules.includes("finance")) {
      return <AdminFinancePage user={user} language={language} currency={currency} initialSearch={financeSearch} />;
    }
    if (tab === "activity" && allowedModules.includes("activity")) return <AdminActivityLogPage user={user} language={language} />;
    if (tab === "licenses" && allowedModules.includes("licenses")) {
      return <AdminLicenseCodesPage user={user} language={language} initialSearch={licenseSearch} />;
    }
    if (tab === "aiSamples" && allowedModules.includes("aiSamples")) return <AdminAiSamplesPage user={user} language={language} />;
    if (tab === "settings" && allowedModules.includes("settings")) return <AdminSettingsPage user={user} language={language} />;
    if (tab === "announcements" && allowedModules.includes("announcements")) return <AdminAnnouncementsPage user={user} language={language} />;
    if (tab === "pricing" && allowedModules.includes("pricing")) return <AdminPricingPage user={user} language={language} currency={currency} />;
    if (tab === "satisfaction" && allowedModules.includes("satisfaction")) return <AdminSatisfactionPage user={user} language={language} />;
    return <AdminPageLoader language={language} />;
  }

  return (
    <div className="app-shell admin-shell-root">
      <header className="topbar">
        <div className="brand">
          <button
            type="button"
            className="topbar-menu-toggle"
            aria-label={language === "en" ? "Toggle sidebar" : "Afficher/masquer le menu"}
            onClick={() => setSidebarOpen((prev) => !prev)}
          >
            <span />
            <span />
            <span />
          </button>
          Career App <span className="admin-badge">Admin</span>
        </div>

        <div className="topbar-search-box" ref={searchBoxRef}>
          <form className="topbar-search" onSubmit={submitSearch}>
            <span className="topbar-search-icon" aria-hidden="true" />
            <input
              value={searchInput}
              onChange={(event) => {
                setSearchInput(event.target.value);
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
              placeholder={searchCopy.placeholder}
            />
          </form>
          {showSuggestions && searchSuggestions.length ? (
            <div className="topbar-suggestions">
              {searchSuggestions.map((item) => {
                const key = `${item.kind}-${item.id || item.code}`;
                if (item.kind === "license") {
                  return (
                    <button type="button" key={key} className="topbar-suggestion-row" onClick={() => goToResult(item)}>
                      <span className="topbar-suggestion-icon">
                        <UiIcon name="shield" />
                      </span>
                      <div>
                        <strong>{item.code}</strong>
                        <span className="muted">
                          {item.ownerFirstName} {item.ownerLastName} · {item.seatsUsed}/{item.seatsTotal}
                        </span>
                      </div>
                    </button>
                  );
                }
                if (item.kind === "transaction") {
                  return (
                    <button type="button" key={key} className="topbar-suggestion-row" onClick={() => goToResult(item)}>
                      <span className="topbar-suggestion-icon">
                        <UiIcon name="scale" />
                      </span>
                      <div>
                        <strong>
                          {item.userFirstName} {item.userLastName}
                        </strong>
                        <span className="muted">
                          {formatEur(item.amountCollected, item.currency)} · {item.planId}
                        </span>
                      </div>
                    </button>
                  );
                }
                return (
                  <button type="button" key={key} className="topbar-suggestion-row" onClick={() => goToResult(item)}>
                    <AvatarCircle user={item} />
                    <div>
                      <strong>
                        {item.firstName} {item.lastName}
                      </strong>
                      <span className="muted">{item.email}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : null}
        </div>

        <div className="topbar-user" ref={userMenuRef}>
          <div className="topbar-notif" ref={notifRef}>
            <button
              type="button"
              className="topbar-icon-btn"
              title={language === "en" ? "Notifications" : "Notifications"}
              onClick={() => setNotifOpen((prev) => !prev)}
            >
              <UiIcon name="bell" />
              {notifications.length ? (
                <span className="topbar-notif-badge">{notifications.length > 9 ? "9+" : notifications.length}</span>
              ) : null}
            </button>
            {notifOpen ? (
              <div className="topbar-notif-panel">
                <div className="topbar-notif-panel-head">
                  <strong>{language === "en" ? "Notifications" : "Notifications"}</strong>
                  <span className="muted">
                    {notifications.length
                      ? `${notifications.length} ${language === "en" ? "item(s)" : "élément(s)"}`
                      : language === "en"
                      ? "Nothing to report"
                      : "Rien à signaler"}
                  </span>
                </div>
                {notifications.length ? (
                  <div className="topbar-notif-list">
                    {notifications.map((item) => {
                      const text = adminNotificationText(item, language);
                      return (
                        <div key={item.id} className="topbar-notif-row">
                          <span className="topbar-notif-icon">
                            <UiIcon name={text.icon} />
                          </span>
                          <div>
                            <strong>{text.title}</strong>
                            <span className="muted">{text.detail}</span>
                            {item.createdAt ? <span className="topbar-notif-time">{formatDate(item.createdAt)}</span> : null}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="muted topbar-notif-empty">
                    {language === "en"
                      ? "New signups, payments, full licenses and announcement failures will show up here."
                      : "Les nouvelles inscriptions, paiements, licences épuisées et échecs d'annonce apparaîtront ici."}
                  </p>
                )}
              </div>
            ) : null}
          </div>
          <button
            type="button"
            className="topbar-icon-btn"
            title={copy.activity}
            onClick={() => allowedModules.includes("activity") && setTab("activity")}
          >
            <UiIcon name="history" />
          </button>
          <button
            type="button"
            className="topbar-icon-btn"
            title={copy.announcements}
            onClick={() => allowedModules.includes("announcements") && setTab("announcements")}
          >
            <UiIcon name="mail" />
          </button>
          <LanguageSwitch language={language} setLanguage={setLanguage} compact />
          <button className="user-menu-trigger" onClick={() => setUserMenuOpen((prev) => !prev)}>
            <AvatarCircle user={user} />
            <div className="topbar-user-meta">
              <strong>
                {user.firstName} {user.lastName}
              </strong>
              <span>{copy.role}</span>
            </div>
          </button>

          {userMenuOpen ? (
            <div className="user-dropdown">
              <div className="user-dropdown-head">
                <AvatarCircle user={user} />
                <div>
                  <strong>
                    {user.firstName} {user.lastName}
                  </strong>
                  <span>{user.username || user.email.split("@")[0]}</span>
                </div>
              </div>
              <button onClick={openAccountSettings}>
                <span className="dropdown-icon">
                  <UiIcon name="profile" />
                </span>
                {copy.accountSettings}
              </button>
              <button onClick={onLogout}>
                <span className="dropdown-icon danger">
                  <UiIcon name="logout" />
                </span>
                {copy.logout}
              </button>
              <div className="user-dropdown-secured">
                {copy.secured} <strong>Career App</strong>
              </div>
            </div>
          ) : null}
        </div>
      </header>

      <div className="admin-body">
        <aside className={`admin-sidebar-vertical ${sidebarOpen ? "" : "collapsed"}`}>
          <div className="admin-sidebar-user">
            <AvatarCircle user={user} />
            <strong>
              {user.firstName} {user.lastName}
            </strong>
            <span>{copy.role}</span>
            <div className="admin-sidebar-user-actions">
              <button type="button" title={copy.accountSettings} onClick={openAccountSettings}>
                <UiIcon name="profile" />
              </button>
              <button type="button" title={copy.announcements} onClick={() => setTab("announcements")}>
                <UiIcon name="mail" />
              </button>
              <button type="button" title={copy.logout} onClick={onLogout}>
                <UiIcon name="logout" />
              </button>
            </div>
          </div>
          <nav className="admin-sidebar-nav">
            <span className="admin-sidebar-section-label">MENU</span>
            {ADMIN_MODULE_DEFS.filter((item) => allowedModules.includes(item.id)).map((item) => (
              <button
                key={item.id}
                type="button"
                className={tab === item.id ? "active" : ""}
                onClick={() => setTab(item.id)}
              >
                <UiIcon name={item.icon} /> <span>{getAdminModuleLabel(item.id)}</span>
              </button>
            ))}
          </nav>
        </aside>

        <main className="main-wrap admin-main">
          <nav className="admin-breadcrumb" aria-label="Breadcrumb">
            <span>{language === "en" ? "Home" : "Accueil"}</span>
            <UiIcon name="chevron" className="admin-breadcrumb-sep" />
            <span className="active">{getAdminModuleLabel(tab)}</span>
          </nav>

          {routeLoading ? <AdminPageLoader language={language} /> : renderAdminPage()}
        </main>
      </div>

      <ConnectedFooter copy={landingCopy} />

      {accountDrawerOpen ? (
        <AccountDrawer
          user={user}
          language={language}
          setLanguage={setLanguage}
          currency={currency}
          setCurrency={setCurrency}
          theme={theme}
          setTheme={setTheme}
          mode={mode}
          setMode={setMode}
          density={density}
          setDensity={setDensity}
          activePanel={accountPanel}
          setActivePanel={setAccountPanel}
          onClose={() => setAccountDrawerOpen(false)}
          onSaveAccount={onSaveAccount}
          onAvatarUpload={onAvatarUpload}
          avatarUploading={avatarUploading}
          onRequestSecondaryEmail={onRequestSecondaryEmail}
          onVerifySecondaryEmail={onVerifySecondaryEmail}
          onSetPrimaryEmail={onSetPrimaryEmail}
          onRemoveEmail={onRemoveEmail}
          onRemoveConnectedAccount={onRemoveConnectedAccount}
          onLinkGoogleAccount={onLinkGoogleAccount}
          securityForm={securityForm}
          setSecurityForm={setSecurityForm}
          securitySaving={securitySaving}
          onSubmitPassword={onSubmitPassword}
          onDeleteAccount={onDeleteAccount}
        />
      ) : null}
    </div>
  );
}

const SCHOOL_MODULE_DEFS = [
  { id: "dashboard", icon: "chart" },
  { id: "students", icon: "profile" },
  { id: "promotions", icon: "network" },
  { id: "invitations", icon: "mail" },
  { id: "license", icon: "save" },
  { id: "insights", icon: "chart" },
  { id: "reports", icon: "file" },
  { id: "settings", icon: "settings" }
];

function SchoolApp({
  user,
  language,
  setLanguage,
  currency,
  setCurrency,
  theme,
  setTheme,
  mode,
  setMode,
  density,
  setDensity,
  onLogout,
  landingCopy,
  onSaveAccount,
  onAvatarUpload,
  avatarUploading,
  onRequestSecondaryEmail,
  onVerifySecondaryEmail,
  onSetPrimaryEmail,
  onRemoveEmail,
  onRemoveConnectedAccount,
  onLinkGoogleAccount,
  securityForm,
  setSecurityForm,
  securitySaving,
  onSubmitPassword,
  onDeleteAccount
}) {
  const [tab, setTab] = useState(() => {
    try {
      return localStorage.getItem("career_app_school_tab") || "dashboard";
    } catch (_error) {
      return "dashboard";
    }
  });
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [accountDrawerOpen, setAccountDrawerOpen] = useState(false);
  const [accountPanel, setAccountPanel] = useState("account");
  const [searchInput, setSearchInput] = useState("");
  const [studentsSearch, setStudentsSearch] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [searchSuggestions, setSearchSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [notifOpen, setNotifOpen] = useState(false);
  const userMenuRef = useRef(null);
  const notifRef = useRef(null);
  const searchBoxRef = useRef(null);
  const searchCopy =
    language === "en" ? { placeholder: "Search students…" } : { placeholder: "Rechercher des étudiants…" };

  useEffect(() => {
    function handleClickOutside(event) {
      if (searchBoxRef.current && !searchBoxRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!searchInput.trim()) {
      setSearchSuggestions([]);
      return undefined;
    }
    const timer = setTimeout(() => {
      getSchoolStudents(user.id, { search: searchInput.trim() })
        .then((items) => setSearchSuggestions(items.slice(0, 5)))
        .catch(() => setSearchSuggestions([]));
    }, 250);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  useEffect(() => {
    if (!SCHOOL_MODULE_DEFS.some((item) => item.id === tab)) {
      setTab("dashboard");
      return;
    }
    try {
      localStorage.setItem("career_app_school_tab", tab);
    } catch (_error) {
      // ignore storage errors (private mode, quota, etc.)
    }
  }, [tab]);

  function goToStudent(item) {
    setStudentsSearch(item.email);
    setSearchInput(item.email);
    setShowSuggestions(false);
    setTab("students");
  }

  function submitSearch(event) {
    event.preventDefault();
    if (!searchInput.trim()) return;
    setStudentsSearch(searchInput.trim());
    setShowSuggestions(false);
    setTab("students");
  }
  const copy =
    language === "en"
      ? {
          dashboard: "Dashboard",
          students: "Students",
          promotions: "Promotions",
          invitations: "Invitations",
          license: "My license",
          insights: "Tracking & employability",
          reports: "Reports",
          settings: "Institution settings",
          accountSettings: "My profile",
          logout: "Log out",
          role: "School administrator",
          secured: "Secured by"
        }
      : {
          dashboard: "Dashboard",
          students: "Étudiants",
          promotions: "Promotions",
          invitations: "Invitations",
          license: "Ma licence",
          insights: "Suivi & employabilité",
          reports: "Rapports",
          settings: "Paramètres de l'établissement",
          accountSettings: "Mon profil",
          logout: "Déconnexion",
          role: "Administrateur école",
          secured: "Sécurisé par"
        };

  useEffect(() => {
    function handleClickOutside(event) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setUserMenuOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setNotifOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    getSchoolNotifications(user.id, language).then((data) => setNotifications(data.items || [])).catch(() => setNotifications([]));
  }, [user.id, language, tab]);

  function openAccountSettings() {
    setAccountPanel("account");
    setAccountDrawerOpen(true);
    setUserMenuOpen(false);
  }

  return (
    <div className="app-shell school-shell-root">
      <header className="topbar">
        <div className="brand">
          <button
            type="button"
            className="topbar-menu-toggle"
            aria-label={language === "en" ? "Toggle sidebar" : "Afficher/masquer le menu"}
            onClick={() => setSidebarOpen((prev) => !prev)}
          >
            <span />
            <span />
            <span />
          </button>
          Career App <span className="admin-badge school-badge">École</span>
        </div>

        <div className="topbar-search-box" ref={searchBoxRef}>
          <form className="topbar-search" onSubmit={submitSearch}>
            <span className="topbar-search-icon" aria-hidden="true" />
            <input
              value={searchInput}
              onChange={(event) => {
                setSearchInput(event.target.value);
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
              placeholder={searchCopy.placeholder}
            />
          </form>
          {showSuggestions && searchSuggestions.length ? (
            <div className="topbar-suggestions">
              {searchSuggestions.map((item) => (
                <button type="button" key={item.id} className="topbar-suggestion-row" onClick={() => goToStudent(item)}>
                  <AvatarCircle user={item} />
                  <div>
                    <strong>
                      {item.firstName} {item.lastName}
                    </strong>
                    <span className="muted">{item.email}</span>
                  </div>
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <div className="topbar-user" ref={userMenuRef}>
          <div className="topbar-notif" ref={notifRef}>
            <button
              type="button"
              className="topbar-icon-btn"
              title={language === "en" ? "Notifications" : "Notifications"}
              onClick={() => setNotifOpen((prev) => !prev)}
            >
              <UiIcon name="bell" />
              {notifications.filter((item) => !item.readAt).length ? (
                <span className="topbar-notif-badge">
                  {notifications.filter((item) => !item.readAt).length > 9 ? "9+" : notifications.filter((item) => !item.readAt).length}
                </span>
              ) : null}
            </button>
            {notifOpen ? (
              <div className="topbar-notif-panel">
                <div className="topbar-notif-panel-head">
                  <strong>{language === "en" ? "Notifications" : "Notifications"}</strong>
                  <button
                    type="button"
                    className="admin-row-action"
                    onClick={() => {
                      markSchoolNotificationsRead(user.id).finally(() =>
                        setNotifications((items) => items.map((item) => ({ ...item, readAt: item.readAt || new Date().toISOString() })))
                      );
                    }}
                  >
                    {language === "en" ? "Mark as read" : "Tout marquer lu"}
                  </button>
                </div>
                {notifications.length ? (
                  <div className="topbar-notif-list">
                    {notifications.slice(0, 8).map((item) => (
                      <div key={item.id} className="topbar-notif-row">
                        <span className="topbar-notif-icon">
                          <UiIcon name={item.type === "license_capacity" ? "save" : item.type === "low_match_score" ? "alert" : "profile"} />
                        </span>
                        <div>
                          <strong>{item.title}</strong>
                          <span className="muted">{item.body}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="muted topbar-notif-empty">
                    {language === "en" ? "No notification yet." : "Aucune notification pour le moment."}
                  </p>
                )}
              </div>
            ) : null}
          </div>
          <button type="button" className="topbar-icon-btn" title={copy.insights} onClick={() => setTab("insights")}>
            <UiIcon name="history" />
          </button>
          <button
            type="button"
            className="topbar-icon-btn"
            title={copy.invitations}
            onClick={() => setTab("invitations")}
          >
            <UiIcon name="mail" />
          </button>
          <LanguageSwitch language={language} setLanguage={setLanguage} compact />
          <button className="user-menu-trigger" onClick={() => setUserMenuOpen((prev) => !prev)}>
            <AvatarCircle user={user} />
            <div className="topbar-user-meta">
              <strong>
                {user.firstName} {user.lastName}
              </strong>
              <span>{copy.role}</span>
            </div>
          </button>

          {userMenuOpen ? (
            <div className="user-dropdown">
              <div className="user-dropdown-head">
                <AvatarCircle user={user} />
                <div>
                  <strong>
                    {user.firstName} {user.lastName}
                  </strong>
                  <span>{user.username || user.email.split("@")[0]}</span>
                </div>
              </div>
              <button onClick={openAccountSettings}>
                <span className="dropdown-icon">
                  <UiIcon name="profile" />
                </span>
                {copy.accountSettings}
              </button>
              <button onClick={onLogout}>
                <span className="dropdown-icon danger">
                  <UiIcon name="logout" />
                </span>
                {copy.logout}
              </button>
              <div className="user-dropdown-secured">
                {copy.secured} <strong>Career App</strong>
              </div>
            </div>
          ) : null}
        </div>
      </header>

      <div className="admin-body">
        <aside className={`admin-sidebar-vertical ${sidebarOpen ? "" : "collapsed"}`}>
          <div className="admin-sidebar-user">
            <AvatarCircle user={user} />
            <strong>
              {user.firstName} {user.lastName}
            </strong>
            <span>{copy.role}</span>
            <div className="admin-sidebar-user-actions">
              <button type="button" title={copy.accountSettings} onClick={openAccountSettings}>
                <UiIcon name="profile" />
              </button>
              <button type="button" title={copy.invitations} onClick={() => setTab("invitations")}>
                <UiIcon name="mail" />
              </button>
              <button type="button" title={copy.logout} onClick={onLogout}>
                <UiIcon name="logout" />
              </button>
            </div>
          </div>
          <nav className="admin-sidebar-nav">
            <span className="admin-sidebar-section-label">MENU</span>
            {SCHOOL_MODULE_DEFS.map((item) => (
              <button key={item.id} type="button" className={tab === item.id ? "active" : ""} onClick={() => setTab(item.id)}>
                <UiIcon name={item.icon} /> <span>{copy[item.id]}</span>
              </button>
            ))}
          </nav>
        </aside>

        <main className="main-wrap admin-main">
          <nav className="admin-breadcrumb" aria-label="Breadcrumb">
            <span>{language === "en" ? "Home" : "Accueil"}</span>
            <UiIcon name="chevron" className="admin-breadcrumb-sep" />
            <span className="active">{copy[tab]}</span>
          </nav>

          {tab === "dashboard" ? <SchoolDashboardPage user={user} language={language} /> : null}
          {tab === "students" ? (
            <SchoolStudentsPage user={user} language={language} initialSearch={studentsSearch} />
          ) : null}
          {tab === "promotions" ? <SchoolPromotionsPage user={user} language={language} /> : null}
          {tab === "invitations" ? <SchoolInvitationsPage user={user} language={language} /> : null}
          {tab === "license" ? <SchoolLicensePage user={user} language={language} currency={currency} /> : null}
          {tab === "insights" ? <SchoolInsightsPage user={user} language={language} /> : null}
          {tab === "reports" ? <SchoolReportsPage user={user} language={language} /> : null}
          {tab === "settings" ? <SchoolSettingsPage user={user} language={language} /> : null}
        </main>
      </div>

      <ConnectedFooter copy={landingCopy} />

      {accountDrawerOpen ? (
        <AccountDrawer
          user={user}
          language={language}
          setLanguage={setLanguage}
          currency={currency}
          setCurrency={setCurrency}
          theme={theme}
          setTheme={setTheme}
          mode={mode}
          setMode={setMode}
          density={density}
          setDensity={setDensity}
          activePanel={accountPanel}
          setActivePanel={setAccountPanel}
          onClose={() => setAccountDrawerOpen(false)}
          onSaveAccount={onSaveAccount}
          onAvatarUpload={onAvatarUpload}
          avatarUploading={avatarUploading}
          onRequestSecondaryEmail={onRequestSecondaryEmail}
          onVerifySecondaryEmail={onVerifySecondaryEmail}
          onSetPrimaryEmail={onSetPrimaryEmail}
          onRemoveEmail={onRemoveEmail}
          onRemoveConnectedAccount={onRemoveConnectedAccount}
          onLinkGoogleAccount={onLinkGoogleAccount}
          securityForm={securityForm}
          setSecurityForm={setSecurityForm}
          securitySaving={securitySaving}
          onSubmitPassword={onSubmitPassword}
          onDeleteAccount={onDeleteAccount}
        />
      ) : null}
    </div>
  );
}

function AdminExportCsvButton({ adminUserId, path, language }) {
  const [loading, setLoading] = useState(false);
  async function handleClick() {
    setLoading(true);
    try {
      const base = await getApiBase();
      window.open(`${base}${path}?adminUserId=${encodeURIComponent(adminUserId)}`, "_blank");
    } finally {
      setLoading(false);
    }
  }
  return (
    <button type="button" className="btn-ghost admin-export-btn" onClick={handleClick} disabled={loading}>
      {loading ? <span className="btn-spinner" /> : <UiIcon name="download" />}
      {language === "en" ? "Export CSV" : "Exporter en CSV"}
    </button>
  );
}

function SchoolExportCsvButton({ userId, language }) {
  const [loading, setLoading] = useState(false);
  async function handleClick() {
    setLoading(true);
    try {
      const base = await getApiBase();
      window.open(`${base}/school/students/export?userId=${encodeURIComponent(userId)}`, "_blank");
    } finally {
      setLoading(false);
    }
  }
  return (
    <button type="button" className="btn-ghost admin-export-btn" onClick={handleClick} disabled={loading}>
      {loading ? <span className="btn-spinner" /> : <UiIcon name="download" />}
      {language === "en" ? "Export CSV" : "Exporter en CSV"}
    </button>
  );
}

function AdminKpiCard({ tone, icon, value, label }) {
  return (
    <div className={`admin-kpi-card tone-${tone}`}>
      <span className="admin-kpi-icon">
        <UiIcon name={icon} />
      </span>
      <span className="admin-kpi-value">{value}</span>
      <span className="admin-kpi-label">{label}</span>
    </div>
  );
}

function AdminPageLoader({ language, label }) {
  return (
    <div
      className="admin-page-loader"
      aria-label={label || (language === "en" ? "Loading data" : "Chargement des donnees")}
    >
      <div className="app-boot-loader" aria-hidden="true">
        <span className="brand-mark" aria-hidden="true">
          <UiIcon name="matchmark" />
        </span>
      </div>
    </div>
  );
}

function SchoolDashboardPage({ user, language }) {
  const [overview, setOverview] = useState(null);
  const [recentStudents, setRecentStudents] = useState(null);
  const [error, setError] = useState("");
  const copy =
    language === "en"
      ? {
          title: "Dashboard",
          subtitle: "Real-time indicators for your students on Career App.",
          students: "Associated students",
          seats: "Seats used",
          activation: "Activation rate",
          cvs: "CVs imported",
          matches: "Matches run",
          avgScore: "Average match score",
          inactive: "Inactive 30+ days",
          trend: "New students — last 8 weeks",
          noTrendTitle: "No recent signup",
          noTrendHint: "New students linked to your license will appear here week by week.",
          noScore: "No data yet",
          recentStudents: "Recently joined",
          noStudents: "No student linked to your license yet.",
          joinedOn: "Joined",
          activityBreakdown: "Activity breakdown",
          activeLabel: "Active (30d)",
          inactiveLabel: "Inactive",
          noActivityTitle: "No activity yet",
          noActivityHint: "Activity starts when students import a CV or launch a match analysis."
        }
      : {
          title: "Dashboard",
          subtitle: "Indicateurs en temps réel de vos étudiants sur Career App.",
          students: "Étudiants associés",
          seats: "Sièges utilisés",
          activation: "Taux d'activation",
          cvs: "CV importés",
          matches: "Analyses réalisées",
          avgScore: "Score de matching moyen",
          inactive: "Inactifs depuis 30j+",
          trend: "Nouveaux étudiants — 8 dernières semaines",
          noTrendTitle: "Aucune inscription récente",
          noTrendHint: "Les nouveaux étudiants rattachés à votre licence apparaîtront ici semaine par semaine.",
          noScore: "Pas encore de données",
          recentStudents: "Derniers inscrits",
          noStudents: "Aucun étudiant rattaché à votre licence pour l'instant.",
          joinedOn: "Inscrit le",
          activityBreakdown: "Répartition de l'activité",
          activeLabel: "Actifs (30j)",
          inactiveLabel: "Inactifs",
          noActivityTitle: "Aucune activité pour le moment",
          noActivityHint: "L'activité démarre quand les étudiants importent un CV ou lancent une analyse de matching."
        };

  useEffect(() => {
    getSchoolOverview(user.id)
      .then(setOverview)
      .catch((err) => setError(getFriendlyErrorMessage(err, language)));
    getSchoolStudents(user.id)
      .then((items) =>
        setRecentStudents([...items].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5))
      )
      .catch(() => setRecentStudents([]));
  }, [user.id]);

  if (error) return <p className="field-error">{error}</p>;
  if (!overview) return <AdminPageLoader language={language} />;

  return (
    <section className="admin-dashboard">
      <header className="module-header">
        <h2>{copy.title}</h2>
        <p>{copy.subtitle}</p>
      </header>

      <div className="admin-kpi-grid">
        <AdminKpiCard tone="primary" icon="profile" value={overview.totalStudents} label={copy.students} />
        <AdminKpiCard
          tone="warning"
          icon="save"
          value={`${overview.seatsUsed}/${overview.seatsTotal}`}
          label={copy.seats}
        />
        <AdminKpiCard tone="success" icon="chart" value={`${overview.activationRate}%`} label={copy.activation} />
        <AdminKpiCard tone="primary" icon="upload" value={overview.totalCvs} label={copy.cvs} />
        <AdminKpiCard tone="warning" icon="chart" value={overview.totalMatchRuns} label={copy.matches} />
        <AdminKpiCard
          tone="success"
          icon="scale"
          value={overview.avgScore != null ? `${overview.avgScore}%` : "—"}
          label={copy.avgScore}
        />
        <AdminKpiCard tone="danger" icon="alert" value={overview.inactiveStudents} label={copy.inactive} />
      </div>

      <div className="admin-panel-grid">
        <div className="admin-panel admin-trend-panel">
          <h3>{copy.trend}</h3>
          {overview.signupsTrend?.some((point) => point.count > 0) ? (
            <AdminTrendChart trend={overview.signupsTrend} language={language} />
          ) : (
            <SchoolEmptyState icon="chart" title={copy.noTrendTitle} hint={copy.noTrendHint} />
          )}
        </div>

        <div className="admin-panel admin-trend-panel">
          <h3>{copy.recentStudents}</h3>
          {recentStudents?.length ? (
            <div className="admin-recent-activity">
              {recentStudents.map((student) => (
                <div key={student.id} className="admin-recent-activity-row">
                  <AvatarCircle user={student} />
                  <div>
                    <strong>
                      {student.firstName} {student.lastName}
                    </strong>
                    <span className="muted">{student.email}</span>
                  </div>
                  <span className="admin-recent-activity-time">
                    {copy.joinedOn} {formatDate(student.createdAt)}
                  </span>
                </div>
              ))}
            </div>
          ) : recentStudents ? (
            <SchoolEmptyState icon="profile" title={copy.recentStudents} hint={copy.noStudents} />
          ) : (
            <AdminPageLoader language={language} />
          )}
        </div>

        <div className="admin-panel admin-trend-panel">
          <h3>{copy.activityBreakdown}</h3>
          {overview.totalStudents ? (
            <AdminDonutChart
              segments={[
                {
                  label: copy.activeLabel,
                  value: overview.totalStudents - overview.inactiveStudents,
                  color: "var(--success)"
                },
                { label: copy.inactiveLabel, value: overview.inactiveStudents, color: "var(--danger)" }
              ]}
              emptyLabel={copy.noStudents}
            />
          ) : (
            <SchoolEmptyState icon="chart" title={copy.noActivityTitle} hint={copy.noActivityHint} />
          )}
        </div>
      </div>
    </section>
  );
}

function SchoolStudentsPage({ user, language, initialSearch }) {
  const copy =
    language === "en"
      ? {
          title: "Students",
          subtitle: "Students linked to your school's license.",
          search: "Search by name or email…",
          colName: "Name",
          colJoined: "Joined on",
          colActivity: "Last activity",
          colScore: "Latest score",
          colStatus: "Status",
          colActions: "Actions",
          active: "Active",
          inactive: "Inactive",
          never: "No activity yet",
          totalLabel: "Students",
          activeLabel: "Active accounts",
          scoredLabel: "With match score",
          remove: "Remove",
          removeTitle: "Remove this student",
          removeWarning: "This frees up a seat on your license. The student switches back to the free plan and keeps their data.",
          removeConfirm: "Remove",
          cancel: "Cancel",
          empty: "No student found."
        }
      : {
          title: "Étudiants",
          subtitle: "Étudiants rattachés à la licence de votre établissement.",
          search: "Rechercher par nom ou email…",
          colName: "Nom",
          colJoined: "Inscrit le",
          colActivity: "Dernière activité",
          colScore: "Dernier score",
          colStatus: "Statut",
          colActions: "Actions",
          active: "Actif",
          inactive: "Inactif",
          never: "Aucune activité",
          totalLabel: "Étudiants",
          activeLabel: "Comptes actifs",
          scoredLabel: "Avec score",
          remove: "Retirer",
          removeTitle: "Retirer cet étudiant",
          removeWarning: "Cela libère un siège sur votre licence. L'étudiant repasse au plan gratuit et conserve ses données.",
          removeConfirm: "Retirer",
          cancel: "Annuler",
          empty: "Aucun étudiant trouvé."
        };

  const [students, setStudents] = useState([]);
  const [search, setSearch] = useState(initialSearch || "");
  const [page, setPage] = useState(1);
  const [error, setError] = useState("");

  useEffect(() => {
    if (initialSearch) setSearch(initialSearch);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialSearch]);

  function reload() {
    getSchoolStudents(user.id, { search })
      .then(setStudents)
      .catch((err) => setError(getFriendlyErrorMessage(err, language)));
  }

  useEffect(() => {
    setPage(1);
    setError("");
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const totalPages = Math.max(1, Math.ceil(students.length / ADMIN_PAGE_SIZE));
  const pagedStudents = students.slice((page - 1) * ADMIN_PAGE_SIZE, page * ADMIN_PAGE_SIZE);
  const activeCount = students.filter((student) => student.active).length;
  const scoredCount = students.filter((student) => student.latestScore != null).length;

  async function handleRemove(student) {
    const result = await Swal.fire({
      icon: "warning",
      title: copy.removeTitle,
      html: `<p style="text-align:left;margin-bottom:0.6rem;">${copy.removeWarning}</p><p style="text-align:left;font-weight:700;">${student.firstName} ${student.lastName} · ${student.email}</p>`,
      showCancelButton: true,
      confirmButtonText: copy.removeConfirm,
      cancelButtonText: copy.cancel,
      confirmButtonColor: "#b91c1c",
      focusCancel: true
    });

    if (!result.isConfirmed) return;

    try {
      await removeSchoolStudent(user.id, student.id);
      reload();
      Swal.fire({
        toast: true,
        position: "top-end",
        icon: "success",
        title: language === "en" ? "Student removed." : "Étudiant retiré.",
        showConfirmButton: false,
        timer: 2800,
        timerProgressBar: true,
        customClass: { popup: "career-toast", title: "career-toast-title" }
      });
    } catch (err) {
      Swal.fire({ icon: "error", title: getFriendlyErrorMessage(err, language) });
    }
  }

  return (
    <section className="admin-accounts">
      <header className="module-header">
        <div>
          <h2>{copy.title}</h2>
          <p>{copy.subtitle}</p>
        </div>
        <SchoolExportCsvButton userId={user.id} language={language} />
      </header>

      <div className="admin-module-metrics">
        <AdminMiniMetric icon="profile" label={copy.totalLabel} value={students.length} tone="primary" />
        <AdminMiniMetric icon="chart" label={copy.activeLabel} value={activeCount} tone="success" />
        <AdminMiniMetric icon="scale" label={copy.scoredLabel} value={scoredCount} tone="warning" />
      </div>

      <div className="admin-table-toolbar">
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={copy.search} />
      </div>

      {error ? <p className="field-error">{error}</p> : null}

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>{copy.colName}</th>
              <th>{copy.colJoined}</th>
              <th>{copy.colActivity}</th>
              <th>{copy.colScore}</th>
              <th>{copy.colStatus}</th>
              <th>{copy.colActions}</th>
            </tr>
          </thead>
          <tbody>
            {pagedStudents.length ? (
              pagedStudents.map((student) => (
                <tr key={student.id}>
                  <td>
                    <div className="admin-table-name">
                      <AvatarCircle user={student} />
                      <div>
                        <strong>
                          {student.firstName} {student.lastName}
                        </strong>
                        <span className="muted">{student.email}</span>
                      </div>
                    </div>
                  </td>
                  <td className="muted">{formatDate(student.createdAt)}</td>
                  <td className="muted">{student.lastActivity ? formatDate(student.lastActivity) : copy.never}</td>
                  <td>
                    {student.latestScore != null ? (
                      <span className="tag">{student.latestScore}%</span>
                    ) : (
                      <span className="muted">—</span>
                    )}
                  </td>
                  <td>
                    <span className={`tag ${student.active ? "tag-success" : ""}`}>
                      {student.active ? copy.active : copy.inactive}
                    </span>
                  </td>
                  <td>
                    <div className="admin-row-actions">
                      <button type="button" className="admin-row-action danger" onClick={() => handleRemove(student)}>
                        <UiIcon name="alert" /> {copy.remove}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="admin-table-empty muted">
                  {copy.empty}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <AdminPagination page={page} totalPages={totalPages} onChange={setPage} language={language} totalItems={students.length} />
    </section>
  );
}

function SchoolInvitationsPage({ user, language }) {
  const copy =
    language === "en"
      ? {
          title: "Invitations",
          subtitle: "Invite a student by email — a license seat is reserved automatically.",
          emailLabel: "Student email",
          send: "Send invitation",
          sending: "Sending…",
          colEmail: "Email",
          colCode: "License code",
          colStatus: "Status",
          colSent: "Sent on",
          statusPending: "Pending",
          statusRedeemed: "Accepted",
          sentLabel: "Invitations",
          pendingLabel: "Pending",
          acceptedLabel: "Accepted",
          empty: "No invitation sent yet."
        }
      : {
          title: "Invitations",
          subtitle: "Invitez un étudiant par email — un siège de licence est réservé automatiquement.",
          emailLabel: "Email de l'étudiant",
          send: "Envoyer l'invitation",
          sending: "Envoi…",
          colEmail: "Email",
          colCode: "Code de licence",
          colStatus: "Statut",
          colSent: "Envoyée le",
          statusPending: "En attente",
          statusRedeemed: "Acceptée",
          sentLabel: "Invitations",
          pendingLabel: "En attente",
          acceptedLabel: "Acceptées",
          empty: "Aucune invitation envoyée pour l'instant."
        };

  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [invitations, setInvitations] = useState([]);

  function reload() {
    getSchoolInvitations(user.id)
      .then(setInvitations)
      .catch((err) => setError(getFriendlyErrorMessage(err, language)));
  }

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function submit(event) {
    event.preventDefault();
    setError("");
    setMessage("");
    setSending(true);
    try {
      await sendSchoolInvitation(user.id, email);
      setMessage(language === "en" ? "Invitation sent." : "Invitation envoyée.");
      setEmail("");
      reload();
    } catch (err) {
      setError(getFriendlyErrorMessage(err, language));
    } finally {
      setSending(false);
    }
  }

  const pendingCount = invitations.filter((invite) => invite.status !== "redeemed").length;
  const redeemedCount = invitations.filter((invite) => invite.status === "redeemed").length;

  return (
    <section className="admin-accounts">
      <header className="module-header">
        <h2>{copy.title}</h2>
        <p>{copy.subtitle}</p>
      </header>

      <div className="admin-module-metrics">
        <AdminMiniMetric icon="mail" label={copy.sentLabel} value={invitations.length} tone="primary" />
        <AdminMiniMetric icon="history" label={copy.pendingLabel} value={pendingCount} tone="warning" />
        <AdminMiniMetric icon="shield" label={copy.acceptedLabel} value={redeemedCount} tone="success" />
      </div>

      <form className="admin-inline-form" onSubmit={submit}>
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder={copy.emailLabel}
          required
        />
        <button type="submit" className="btn-main ready" disabled={sending}>
          {sending ? <span className="btn-spinner" /> : null} {sending ? copy.sending : copy.send}
        </button>
      </form>

      {error ? <p className="field-error">{error}</p> : null}
      {message ? <p className="field-hint success">{message}</p> : null}

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>{copy.colEmail}</th>
              <th>{copy.colCode}</th>
              <th>{copy.colStatus}</th>
              <th>{copy.colSent}</th>
            </tr>
          </thead>
          <tbody>
            {invitations.length ? (
              invitations.map((invite) => (
                <tr key={invite.id}>
                  <td>{invite.email}</td>
                  <td className="admin-license-code">{invite.licenseCode}</td>
                  <td>
                    <span className={`tag ${invite.status === "redeemed" ? "tag-success" : ""}`}>
                      {invite.status === "redeemed" ? copy.statusRedeemed : copy.statusPending}
                    </span>
                  </td>
                  <td className="muted">{formatDate(invite.createdAt)}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} className="admin-table-empty muted">
                  {copy.empty}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function SchoolPromotionsPage({ user, language }) {
  const copy = language === "en"
    ? {
        title: "Promotions",
        subtitle: "Organize students by program, campus and academic year.",
        name: "Promotion name",
        program: "Program",
        level: "Level",
        campus: "Campus",
        year: "Academic year",
        create: "Create promotion",
        assign: "Assign a student",
        addStudent: "Add",
        removeStudent: "Remove",
        students: "students",
        empty: "No promotion created yet.",
        delete: "Delete"
      }
    : {
        title: "Promotions",
        subtitle: "Organisez les étudiants par programme, campus et année académique.",
        name: "Nom de la promotion",
        program: "Programme",
        level: "Niveau",
        campus: "Campus",
        year: "Année académique",
        create: "Créer la promotion",
        assign: "Affecter un étudiant",
        addStudent: "Ajouter",
        removeStudent: "Retirer",
        students: "étudiants",
        empty: "Aucune promotion créée pour le moment.",
        delete: "Supprimer"
      };
  const [data, setData] = useState({ items: [], students: [] });
  const [form, setForm] = useState({ name: "", program: "", level: "", campus: "", academicYear: "" });
  const [selectedStudents, setSelectedStudents] = useState({});
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  function reload() {
    getSchoolPromotions(user.id).then(setData).catch((err) => setError(getFriendlyErrorMessage(err, language)));
  }

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.id]);

  async function submit(event) {
    event.preventDefault();
    setError("");
    setSaving(true);
    try {
      await createSchoolPromotion(user.id, form);
      setForm({ name: "", program: "", level: "", campus: "", academicYear: "" });
      reload();
      Swal.fire({ icon: "success", title: language === "en" ? "Promotion created." : "Promotion créée.", timer: 1800, showConfirmButton: false });
    } catch (err) {
      setError(getFriendlyErrorMessage(err, language));
    } finally {
      setSaving(false);
    }
  }

  async function remove(item) {
    const result = await Swal.fire({
      icon: "warning",
      title: language === "en" ? "Delete this promotion?" : "Supprimer cette promotion ?",
      text: item.name,
      showCancelButton: true,
      confirmButtonText: copy.delete,
      cancelButtonText: language === "en" ? "Cancel" : "Annuler",
      confirmButtonColor: "#dc2626"
    });
    if (!result.isConfirmed) return;
    await deleteSchoolPromotion(user.id, item.id);
    reload();
  }

  async function updateStudent(item, action, studentId) {
    const id = studentId || selectedStudents[item.id];
    if (!id) return;
    setError("");
    try {
      await updateSchoolPromotionStudent(user.id, item.id, id, action);
      setSelectedStudents((current) => ({ ...current, [item.id]: "" }));
      reload();
    } catch (err) {
      setError(getFriendlyErrorMessage(err, language));
    }
  }

  return (
    <section className="school-promotions">
      <header className="module-header">
        <h2>{copy.title}</h2>
        <p>{copy.subtitle}</p>
      </header>
      <form className="school-settings-form school-promotion-form" onSubmit={submit}>
        <input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder={copy.name} />
        <input value={form.program} onChange={(event) => setForm({ ...form, program: event.target.value })} placeholder={copy.program} />
        <input value={form.level} onChange={(event) => setForm({ ...form, level: event.target.value })} placeholder={copy.level} />
        <input value={form.campus} onChange={(event) => setForm({ ...form, campus: event.target.value })} placeholder={copy.campus} />
        <input value={form.academicYear} onChange={(event) => setForm({ ...form, academicYear: event.target.value })} placeholder={copy.year} />
        <button className="btn-main ready" disabled={saving}>{saving ? <span className="btn-spinner" /> : null} {copy.create}</button>
      </form>
      {error ? <p className="field-error">{error}</p> : null}
      <div className="school-card-grid">
        {data.items.length ? data.items.map((item) => {
          const assignedIds = new Set(item.studentIds || []);
          const assigned = data.students.filter((student) => assignedIds.has(student.id));
          const available = data.students.filter((student) => !assignedIds.has(student.id));
          return (
            <article key={item.id} className="school-data-card">
              <div>
                <strong>{item.name}</strong>
                <span>{[item.program, item.level, item.campus, item.academicYear].filter(Boolean).join(" · ") || "—"}</span>
              </div>
              <small>{item.studentCount} {copy.students}</small>
              <div className="school-promotion-assign">
                <select
                  value={selectedStudents[item.id] || ""}
                  onChange={(event) => setSelectedStudents((current) => ({ ...current, [item.id]: event.target.value }))}
                >
                  <option value="">{copy.assign}</option>
                  {available.map((student) => (
                    <option key={student.id} value={student.id}>
                      {student.firstName} {student.lastName} · {student.email}
                    </option>
                  ))}
                </select>
                <button type="button" className="btn-ghost" onClick={() => updateStudent(item, "add")} disabled={!selectedStudents[item.id]}>
                  <UiIcon name="plus" /> {copy.addStudent}
                </button>
              </div>
              {assigned.length ? (
                <div className="school-promotion-students">
                  {assigned.map((student) => (
                    <span key={student.id} className="school-promotion-student-pill">
                      <AvatarCircle user={student} />
                      {student.firstName} {student.lastName}
                      <button type="button" onClick={() => updateStudent(item, "remove", student.id)} title={copy.removeStudent}>
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              ) : null}
              <button type="button" className="admin-row-action danger" onClick={() => remove(item)}>
                <UiIcon name="trash" /> {copy.delete}
              </button>
            </article>
          );
        }) : <SchoolEmptyState icon="network" title={copy.title} hint={copy.empty} />}
      </div>
    </section>
  );
}

function maskLicenseCode(code) {
  if (!code) return code;
  const parts = code.split("-");
  if (parts.length < 3) return code.replace(/[A-Z0-9]/g, "•");
  return `${parts[0]}-••••-${parts[parts.length - 1]}`;
}

function SchoolLicenseCard({ item, language, currency, copy }) {
  const [copied, setCopied] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const pct = item.seatsTotal ? Math.min(100, Math.round((item.seatsUsed / item.seatsTotal) * 100)) : 0;
  const remaining = Math.max(0, Number(item.seatsTotal || 0) - Number(item.seatsUsed || 0));

  function handleCopy() {
    navigator.clipboard?.writeText(item.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  return (
    <div className="school-license-card">
      <div className="school-license-card-top">
        <span className="school-license-plan-icon">
          <UiIcon name="save" />
        </span>
        <div className="school-license-plan-meta">
          <strong>{getPlanById(item.planId)?.name?.[language] || item.planId}</strong>
          <span className="muted">
            {copy.created} {formatDate(item.createdAt)}
          </span>
        </div>
        <span className={`tag ${item.revoked ? "tag-danger" : "tag-success"}`}>
          {item.revoked ? copy.revoked : copy.active}
        </span>
      </div>

      <div className="school-license-code-row">
        <span className="school-license-code-pill">{revealed ? item.code : maskLicenseCode(item.code)}</span>
        <button
          type="button"
          className="school-license-reveal-btn"
          onClick={() => setRevealed((prev) => !prev)}
          aria-label={revealed ? copy.hide : copy.reveal}
          title={revealed ? copy.hide : copy.reveal}
        >
          <UiIcon name="eye" />
        </button>
        <button type="button" className="school-license-copy-btn" onClick={handleCopy}>
          {copied ? copy.copied : copy.copy}
        </button>
      </div>

      <div className="school-license-progress">
        <div className="school-license-progress-head">
          <span>{copy.seats}</span>
          <strong>
            {item.seatsUsed}/{item.seatsTotal}
          </strong>
        </div>
        <div className="school-license-bar">
          <div className="school-license-bar-fill" style={{ width: `${pct}%` }} />
        </div>
        <span className="school-license-remaining">
          {pct}% · {remaining} {copy.remaining}
        </span>
      </div>

      <div className="school-license-price">
        <span className="muted">{copy.plan}</span>
        <strong>{planPriceLabel(item.planId, "annual", "Gratuit", currency)}</strong>
      </div>
    </div>
  );
}

function SchoolLicensePage({ user, language, currency }) {
  const copy =
    language === "en"
      ? {
          title: "My license",
          subtitle: "Seats granted by Career App for your institution.",
          seats: "Seats used",
          plan: "Plan",
          created: "Issued on",
          active: "Active",
          revoked: "Revoked",
          copy: "Copy code",
          copied: "Copied!",
          reveal: "Show code",
          hide: "Hide code",
          remaining: "seats left",
          emptyTitle: "No license code yet",
          empty: "Contact Career App to get a license for your institution."
        }
      : {
          title: "Ma licence",
          subtitle: "Sièges accordés par Career App pour votre établissement.",
          seats: "Sièges utilisés",
          plan: "Plan",
          created: "Émise le",
          active: "Active",
          revoked: "Révoquée",
          copy: "Copier le code",
          copied: "Copié !",
          reveal: "Afficher le code",
          hide: "Masquer le code",
          remaining: "sièges restants",
          emptyTitle: "Aucun code de licence",
          empty: "Contactez Career App pour obtenir une licence pour votre établissement."
        };

  const [codes, setCodes] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    getSchoolLicense(user.id)
      .then(setCodes)
      .catch((err) => setError(getFriendlyErrorMessage(err, language)));
  }, [user.id]);

  if (error) return <p className="field-error">{error}</p>;

  return (
    <section className="admin-accounts">
      <header className="module-header">
        <h2>{copy.title}</h2>
        <p>{copy.subtitle}</p>
      </header>

      {codes.length ? (
        <div className="school-license-grid">
          {codes.map((item) => (
            <SchoolLicenseCard key={item.code} item={item} language={language} currency={currency} copy={copy} />
          ))}
        </div>
      ) : (
        <SchoolEmptyState icon="save" title={copy.emptyTitle} hint={copy.empty} />
      )}
    </section>
  );
}

function SchoolEmptyState({ icon, title, hint }) {
  return (
    <div className="school-empty-state">
      <span className="school-empty-icon">
        <UiIcon name={icon} />
      </span>
      <strong>{title}</strong>
      <p>{hint}</p>
    </div>
  );
}

function SchoolInsightsPage({ user, language }) {
  const copy =
    language === "en"
      ? {
          title: "Tracking & employability",
          subtitle: "Aggregated view of your students' match performance.",
          distribution: "Score distribution",
          missing: "Most common missing keywords",
          ranking: "Student ranking by score",
          emptyDistribution: "No score data yet",
          emptyDistributionHint: "This chart fills in as soon as your students run their first CV/offer matches.",
          emptyMissing: "No missing keywords yet",
          emptyMissingHint: "Recurring skill gaps across your students will show up here.",
          emptyRanking: "No ranking yet",
          emptyRankingHint: "Once students have a match score, they'll appear here ranked from best to worst fit."
        }
      : {
          title: "Suivi & employabilité",
          subtitle: "Vue agrégée de la performance de matching de vos étudiants.",
          distribution: "Répartition des scores",
          missing: "Mots-clés manquants les plus fréquents",
          ranking: "Classement des étudiants par score",
          emptyDistribution: "Pas encore de score",
          emptyDistributionHint: "Ce graphique se remplit dès que vos étudiants lancent leurs premières analyses CV/offre.",
          emptyMissing: "Pas encore de mots-clés",
          emptyMissingHint: "Les manques récurrents de compétences chez vos étudiants apparaîtront ici.",
          emptyRanking: "Pas encore de classement",
          emptyRankingHint: "Dès qu'un étudiant obtient un score de matching, il apparaît ici classé du meilleur au moins bon."
        };

  const [insights, setInsights] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    getSchoolInsights(user.id)
      .then(setInsights)
      .catch((err) => setError(getFriendlyErrorMessage(err, language)));
  }, [user.id]);

  if (error) return <p className="field-error">{error}</p>;
  if (!insights) return <p className="muted">…</p>;

  const bucketEntries = Object.entries(insights.scoreBuckets || {});
  const maxBucket = Math.max(1, ...bucketEntries.map(([, count]) => count));
  const hasData = bucketEntries.some(([, count]) => count > 0);

  return (
    <section className="admin-dashboard">
      <header className="module-header">
        <h2>{copy.title}</h2>
        <p>{copy.subtitle}</p>
      </header>

      <div className="admin-panel school-insight-panel">
        <h3>
          <span className="school-panel-icon">
            <UiIcon name="chart" />
          </span>
          {copy.distribution}
        </h3>
        {hasData ? (
          <div className="admin-trend-chart school-score-chart">
            {bucketEntries.map(([label, count]) => (
              <div key={label} className="admin-trend-bar-col">
                <div className="admin-trend-bar-track">
                  <div className="admin-trend-bar" style={{ height: `${Math.max(4, (count / maxBucket) * 100)}%` }}>
                    {count > 0 ? <span>{count}</span> : null}
                  </div>
                </div>
                <span className="admin-trend-label">{label}</span>
              </div>
            ))}
          </div>
        ) : (
          <SchoolEmptyState icon="chart" title={copy.emptyDistribution} hint={copy.emptyDistributionHint} />
        )}
      </div>

      <div className="admin-panel-grid">
        <div className="admin-panel school-insight-panel">
          <h3>
            <span className="school-panel-icon">
              <UiIcon name="network" />
            </span>
            {copy.missing}
          </h3>
          {insights.topMissingKeywords?.length ? (
            <div className="admin-permission-tags">
              {insights.topMissingKeywords.map((item) => (
                <span key={item.keyword} className="tag">
                  {item.keyword} · {item.count}
                </span>
              ))}
            </div>
          ) : (
            <SchoolEmptyState icon="network" title={copy.emptyMissing} hint={copy.emptyMissingHint} />
          )}
        </div>

        <div className="admin-panel school-insight-panel">
          <h3>
            <span className="school-panel-icon">
              <UiIcon name="profile" />
            </span>
            {copy.ranking}
          </h3>
          {insights.ranking?.length ? (
            <div className="school-ranking-list">
              {insights.ranking.slice(0, 10).map((student, index) => (
                <div key={student.id} className="school-ranking-row">
                  <span className={`school-ranking-index ${index < 3 ? "top" : ""}`}>{index + 1}</span>
                  <AvatarCircle user={student} />
                  <div>
                    <strong>
                      {student.firstName} {student.lastName}
                    </strong>
                    <span className="muted">{student.email}</span>
                  </div>
                  <span className="tag tag-success">{student.score}%</span>
                </div>
              ))}
            </div>
          ) : (
            <SchoolEmptyState icon="profile" title={copy.emptyRanking} hint={copy.emptyRankingHint} />
          )}
        </div>
      </div>
    </section>
  );
}

function SchoolReportsPage({ user, language }) {
  const copy = language === "en"
    ? {
        title: "Reports",
        subtitle: "Generate employability reports for management and academic teams.",
        generateMonthly: "Generate monthly report",
        generateWeekly: "Generate weekly report",
        totalStudents: "Students",
        activeStudents: "Active",
        withoutCv: "Without CV",
        lowScores: "Low scores",
        avgScore: "Average score",
        history: "Generated reports",
        empty: "No report generated yet."
      }
    : {
        title: "Rapports",
        subtitle: "Générez des rapports d'employabilité pour la direction et les équipes pédagogiques.",
        generateMonthly: "Générer le rapport mensuel",
        generateWeekly: "Générer le rapport hebdomadaire",
        totalStudents: "Étudiants",
        activeStudents: "Actifs",
        withoutCv: "Sans CV",
        lowScores: "Scores faibles",
        avgScore: "Score moyen",
        history: "Rapports générés",
        empty: "Aucun rapport généré pour le moment."
      };
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  function reload() {
    getSchoolReports(user.id).then(setData).catch((err) => setError(getFriendlyErrorMessage(err, language)));
  }

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.id]);

  async function generate(period) {
    setBusy(period);
    try {
      await generateSchoolReport(user.id, period);
      reload();
      Swal.fire({ icon: "success", title: language === "en" ? "Report generated." : "Rapport généré.", timer: 1800, showConfirmButton: false });
    } catch (err) {
      setError(getFriendlyErrorMessage(err, language));
    } finally {
      setBusy("");
    }
  }

  if (!data) return <AdminPageLoader language={language} />;

  return (
    <section className="school-reports">
      <header className="module-header">
        <h2>{copy.title}</h2>
        <p>{copy.subtitle}</p>
      </header>
      <div className="admin-module-metrics">
        <AdminMiniMetric icon="profile" label={copy.totalStudents} value={data.snapshot.totalStudents} />
        <AdminMiniMetric icon="chart" label={copy.activeStudents} value={data.snapshot.activeStudents} tone="success" />
        <AdminMiniMetric icon="upload" label={copy.withoutCv} value={data.snapshot.withoutCv} tone="warning" />
        <AdminMiniMetric icon="alert" label={copy.lowScores} value={data.snapshot.lowScores} tone="danger" />
        <AdminMiniMetric icon="scale" label={copy.avgScore} value={data.snapshot.avgScore != null ? `${data.snapshot.avgScore}%` : "—"} />
      </div>
      <div className="school-report-actions">
        <button className="btn-main ready" onClick={() => generate("monthly")} disabled={Boolean(busy)}>
          {busy === "monthly" ? <span className="btn-spinner" /> : <UiIcon name="file" />} {copy.generateMonthly}
        </button>
        <button className="btn-ghost" onClick={() => generate("weekly")} disabled={Boolean(busy)}>
          {busy === "weekly" ? <span className="btn-spinner dark" /> : <UiIcon name="history" />} {copy.generateWeekly}
        </button>
      </div>
      {error ? <p className="field-error">{error}</p> : null}
      <div className="admin-panel school-insight-panel">
        <h3>{copy.history}</h3>
        {data.items.length ? (
          <div className="school-report-list">
            {data.items.map((item) => (
              <article key={item.id} className="school-report-row">
                <div>
                  <strong>{item.title}</strong>
                  <span className="muted">{formatDate(item.createdAt)} · {item.period}</span>
                </div>
                <span className="tag">{item.payload?.avgScore != null ? `${item.payload.avgScore}%` : "—"}</span>
              </article>
            ))}
          </div>
        ) : (
          <SchoolEmptyState icon="file" title={copy.history} hint={copy.empty} />
        )}
      </div>
    </section>
  );
}

function SchoolSettingsPage({ user, language }) {
  const copy = language === "en"
    ? {
        title: "Institution settings",
        subtitle: "Manage the institution identity separately from the administrator account.",
        adminBlock: "Administrator",
        schoolBlock: "Institution",
        save: "Save settings",
        orgName: "Official institution name",
        acronym: "Acronym / short name",
        orgType: "Type",
        website: "Website",
        emailDomain: "Email domain",
        address: "Address",
        city: "City",
        country: "Country",
        contactName: "Primary contact",
        contactEmail: "Contact email",
        contactPhone: "Contact phone",
        notes: "Internal notes"
      }
    : {
        title: "Paramètres de l'établissement",
        subtitle: "Gérez l'identité de l'établissement séparément du compte administrateur.",
        adminBlock: "Administrateur",
        schoolBlock: "Établissement",
        save: "Enregistrer les paramètres",
        orgName: "Nom officiel de l'établissement",
        acronym: "Sigle",
        orgType: "Type",
        website: "Site web",
        emailDomain: "Domaine email",
        address: "Adresse",
        city: "Ville",
        country: "Pays",
        contactName: "Contact principal",
        contactEmail: "Email de contact",
        contactPhone: "Téléphone de contact",
        notes: "Notes internes"
      };
  const [data, setData] = useState(null);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    getSchoolProfile(user.id)
      .then((payload) => {
        setData(payload);
        setForm(payload.profile || {});
      })
      .catch((err) => setError(getFriendlyErrorMessage(err, language)));
  }, [user.id]);

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleLogoUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type?.startsWith("image/")) {
      setError(language === "en" ? "Please select an image file." : "Veuillez sélectionner une image.");
      event.target.value = "";
      return;
    }
    try {
      // fileToBase64 renvoie le base64 brut sans préfixe "data:" (pensé pour
      // l'upload de CV, où le mimeType part séparément côté serveur) — pour
      // un <img src>, il faut reconstruire une vraie data URL avec son type MIME.
      const content = await fileToBase64(file);
      update("logoDataUrl", `data:${file.type};base64,${content}`);
    } catch (_error) {
      setError(language === "en" ? "Unable to read this image." : "Impossible de lire cette image.");
    } finally {
      event.target.value = "";
    }
  }

  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const payload = await updateSchoolProfile(user.id, form);
      setForm(payload.profile || form);
      Swal.fire({ icon: "success", title: language === "en" ? "Settings saved." : "Paramètres enregistrés.", timer: 1800, showConfirmButton: false });
    } catch (err) {
      setError(getFriendlyErrorMessage(err, language));
    } finally {
      setSaving(false);
    }
  }

  if (!data) return <AdminPageLoader language={language} />;

  return (
    <section className="school-settings">
      <header className="module-header">
        <h2>{copy.title}</h2>
        <p>{copy.subtitle}</p>
      </header>
      <div className="school-settings-grid">
        <article className="admin-panel">
          <h3>{copy.adminBlock}</h3>
          <div className="school-admin-identity">
            <AvatarCircle user={data.admin} />
            <div>
              <strong>{data.admin.firstName} {data.admin.lastName}</strong>
              <span className="muted">{data.admin.email}</span>
            </div>
          </div>
        </article>
        <form className="admin-panel school-settings-form" onSubmit={submit}>
          <h3>{copy.schoolBlock}</h3>
          <div className="school-logo-editor">
            <span className="school-logo-preview">
              {form.logoDataUrl ? <img src={form.logoDataUrl} alt="" /> : <UiIcon name="briefcase" />}
            </span>
            <label className="btn-ghost">
              <UiIcon name="upload" />
              {language === "en" ? "Upload logo" : "Télécharger le logo"}
              <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={handleLogoUpload} />
            </label>
            {form.logoDataUrl ? (
              <button type="button" className="admin-row-action danger" onClick={() => update("logoDataUrl", "")}>
                {language === "en" ? "Remove logo" : "Supprimer le logo"}
              </button>
            ) : null}
          </div>
          <input value={form.organizationName || ""} onChange={(event) => update("organizationName", event.target.value)} placeholder={copy.orgName} />
          <input value={form.acronym || ""} onChange={(event) => update("acronym", event.target.value)} placeholder={copy.acronym} />
          <input value={form.organizationType || ""} onChange={(event) => update("organizationType", event.target.value)} placeholder={copy.orgType} />
          <input value={form.website || ""} onChange={(event) => update("website", event.target.value)} placeholder={copy.website} />
          <input value={form.emailDomain || ""} onChange={(event) => update("emailDomain", event.target.value)} placeholder={copy.emailDomain} />
          <input value={form.address || ""} onChange={(event) => update("address", event.target.value)} placeholder={copy.address} />
          <input value={form.city || ""} onChange={(event) => update("city", event.target.value)} placeholder={copy.city} />
          <input value={form.country || ""} onChange={(event) => update("country", event.target.value)} placeholder={copy.country} />
          <input value={form.primaryContactName || ""} onChange={(event) => update("primaryContactName", event.target.value)} placeholder={copy.contactName} />
          <input value={form.contactEmail || ""} onChange={(event) => update("contactEmail", event.target.value)} placeholder={copy.contactEmail} />
          <input value={form.contactPhone || ""} onChange={(event) => update("contactPhone", event.target.value)} placeholder={copy.contactPhone} />
          <textarea value={form.notes || ""} onChange={(event) => update("notes", event.target.value)} placeholder={copy.notes} />
          {error ? <p className="field-error">{error}</p> : null}
          <button className="btn-main ready" disabled={saving}>{saving ? <span className="btn-spinner" /> : null} {copy.save}</button>
        </form>
      </div>
    </section>
  );
}

const ADMIN_DASHBOARD_ROLES = [
  { id: "student", icon: "profile", color: "#2f5bff" },
  { id: "school", icon: "shield", color: "#0e9f6e" },
  { id: "recruiter_firm", icon: "briefcase", color: "#d97706" }
];

function AdminTrendChart({ trend, language, valueKey = "count", formatValue }) {
  if (!trend?.length) return null;
  const max = Math.max(1, ...trend.map((point) => point[valueKey]));
  const weekFormatter = new Intl.DateTimeFormat(language === "en" ? "en-US" : "fr-FR", {
    day: "2-digit",
    month: "2-digit"
  });
  const display = formatValue || ((value) => value);

  return (
    <div className="admin-trend-chart">
      {trend.map((point) => (
        <div key={point.weekStart} className="admin-trend-bar-col">
          <div className="admin-trend-bar-track">
            <div
              className="admin-trend-bar"
              style={{ height: `${Math.max(4, (point[valueKey] / max) * 100)}%` }}
              title={`${display(point[valueKey])}`}
            >
              {point[valueKey] > 0 ? <span>{display(point[valueKey])}</span> : null}
            </div>
          </div>
          <span className="admin-trend-label">{weekFormatter.format(new Date(point.weekStart))}</span>
        </div>
      ))}
    </div>
  );
}

function AdminDonutChart({ segments, emptyLabel }) {
  const total = segments.reduce((sum, seg) => sum + seg.value, 0);
  if (!total) return <p className="muted">{emptyLabel}</p>;

  let cumulative = 0;
  const stops = segments
    .filter((seg) => seg.value > 0)
    .map((seg) => {
      const start = (cumulative / total) * 360;
      cumulative += seg.value;
      const end = (cumulative / total) * 360;
      return `${seg.color} ${start}deg ${end}deg`;
    })
    .join(", ");

  return (
    <div className="admin-donut-wrap">
      <div className="admin-donut" style={{ background: `conic-gradient(${stops})` }}>
        <div className="admin-donut-hole">
          <strong>{total}</strong>
        </div>
      </div>
      <div className="admin-donut-legend">
        {segments
          .filter((seg) => seg.value > 0)
          .map((seg) => (
            <div key={seg.label} className="admin-donut-legend-row">
              <span className="admin-donut-dot" style={{ background: seg.color }} />
              <span>{seg.label}</span>
              <strong>{seg.value}</strong>
            </div>
          ))}
      </div>
    </div>
  );
}

function AdminDashboardPage({ user, language }) {
  const [overview, setOverview] = useState(null);
  const [recentActivity, setRecentActivity] = useState(null);
  const [recentUsers, setRecentUsers] = useState(null);
  const [error, setError] = useState("");
  const copy =
    language === "en"
      ? {
          title: "Dashboard",
          subtitle: "Real-time indicators across the platform.",
          byRole: "Accounts by role",
          cvs: "CVs imported",
          matches: "Matches run",
          signups: "Signups (last 30 days)",
          plans: "Active plans",
          trend: "New signups — last 8 weeks",
          noPlan: "No active plan",
          recentActivity: "Recent activity",
          noActivity: "No activity recorded yet.",
          planDistribution: "Active plans breakdown",
          noPlanData: "No active plan yet.",
          conversionRate: "Free to paid conversion",
          revenueThisMonth: "Revenue this month",
          revenueNoData: "No revenue last month to compare",
          licenseUsage: "License seats used",
          licenseNoSeats: "No license sold yet",
          pendingInvitations: "Pending school invitations",
          emailScoutSearches: "Email Scout searches",
          inactiveAccounts: "Inactive accounts (30d+)",
          latestUsers: "Last 10 signups",
          colUser: "User",
          colRole: "Role",
          colPlan: "Plan",
          colDate: "Signup date",
          noRecentUsers: "No signup yet.",
          planFocus: "Plan overview",
          activeSubscribers: "active subscriber(s)"
        }
      : {
          title: "Dashboard",
          subtitle: "Indicateurs en temps réel de la plateforme.",
          byRole: "Comptes par rôle",
          cvs: "CV importés",
          matches: "Analyses réalisées",
          signups: "Inscriptions (30 derniers jours)",
          plans: "Plans actifs",
          trend: "Nouvelles inscriptions — 8 dernières semaines",
          noPlan: "Aucun plan actif",
          recentActivity: "Activité récente",
          noActivity: "Aucune activité enregistrée pour l'instant.",
          planDistribution: "Répartition des plans actifs",
          noPlanData: "Aucun plan actif pour l'instant.",
          conversionRate: "Conversion gratuit vers payant",
          revenueThisMonth: "Revenu ce mois-ci",
          revenueNoData: "Aucun revenu le mois dernier pour comparer",
          licenseUsage: "Sièges de licence utilisés",
          licenseNoSeats: "Aucune licence vendue pour l'instant",
          pendingInvitations: "Invitations école en attente",
          emailScoutSearches: "Recherches Email Scout",
          inactiveAccounts: "Comptes inactifs (30j+)",
          latestUsers: "10 dernières inscriptions",
          colUser: "Utilisateur",
          colRole: "Rôle",
          colPlan: "Plan",
          colDate: "Inscription",
          noRecentUsers: "Aucune inscription pour le moment.",
          planFocus: "Vue des plans",
          activeSubscribers: "abonné(s) actif(s)"
        };

  const DONUT_COLORS = [
    "var(--primary)",
    "var(--success)",
    "var(--warning)",
    "var(--danger)",
    "var(--primary-2)"
  ];

  useEffect(() => {
    getAdminOverview(user.id)
      .then(setOverview)
      .catch((err) => setError(getFriendlyErrorMessage(err, language)));
    getAdminActivityLog(user.id)
      .then((data) => setRecentActivity(data.items.slice(0, 5)))
      .catch(() => setRecentActivity([]));
    listAdminUsers(user.id)
      .then((items) => {
        const latest = [...items]
          .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
          .slice(0, 10);
        setRecentUsers(latest);
      })
      .catch(() => setRecentUsers([]));
  }, [user.id]);

  if (error) return <p className="field-error">{error}</p>;
  if (!overview) return <p className="muted">…</p>;

  const planEntries = Object.entries(overview.planCounts || {});
  const planSegments = planEntries.map(([planId, count], index) => ({
    label: getPlanById(planId)?.name?.[language] || planId,
    value: count,
    color: DONUT_COLORS[index % DONUT_COLORS.length]
  }));
  const activePlanTotal = planEntries.reduce((total, [, count]) => total + Number(count || 0), 0);

  return (
    <section className="admin-dashboard">
      <header className="module-header">
        <h2>{copy.title}</h2>
        <p>{copy.subtitle}</p>
      </header>

      <div className="admin-kpi-grid">
        <AdminKpiCard tone="primary" icon="upload" value={overview.totalCvs} label={copy.cvs} />
        <AdminKpiCard tone="warning" icon="chart" value={overview.totalMatchRuns} label={copy.matches} />
        <AdminKpiCard tone="success" icon="profile" value={overview.signupsLast30Days} label={copy.signups} />
        <AdminKpiCard tone="danger" icon="pricetag" value={activePlanTotal} label={copy.plans} />
      </div>

      <div className="admin-kpi-grid admin-kpi-grid-secondary">
        <AdminKpiCard
          tone="primary"
          icon="scale"
          value={`${Math.round((overview.conversionRate || 0) * 100)}%`}
          label={copy.conversionRate}
        />
        <AdminKpiCard
          tone="success"
          icon="pricetag"
          value={formatEur(overview.revenueThisMonth, "EUR")}
          label={
            overview.revenueGrowth == null
              ? copy.revenueThisMonth
              : `${copy.revenueThisMonth} (${overview.revenueGrowth >= 0 ? "+" : ""}${Math.round(overview.revenueGrowth * 100)}%)`
          }
        />
        <AdminKpiCard
          tone="warning"
          icon="shield"
          value={overview.licenseSeatsTotal ? `${overview.licenseSeatsUsed}/${overview.licenseSeatsTotal}` : "—"}
          label={copy.licenseUsage}
        />
        <AdminKpiCard tone="primary" icon="mail" value={overview.pendingInvitations} label={copy.pendingInvitations} />
        <AdminKpiCard tone="success" icon="network" value={overview.emailScoutSearches} label={copy.emailScoutSearches} />
        <AdminKpiCard tone="warning" icon="alert" value={overview.inactiveAccounts} label={copy.inactiveAccounts} />
      </div>

      <div className="admin-panel-grid">
        <div className="admin-panel admin-trend-panel">
          <h3>{copy.trend}</h3>
          <AdminTrendChart trend={overview.signupsTrend} language={language} />
        </div>

        <div className="admin-panel admin-trend-panel">
          <h3>{copy.recentActivity}</h3>
          {recentActivity?.length ? (
            <div className="admin-recent-activity">
              {recentActivity.map((event) => (
                <div key={event.id} className="admin-recent-activity-row">
                  <AvatarCircle user={{ firstName: event.userFirstName, lastName: event.userLastName, avatarDataUrl: event.userAvatarDataUrl }} />
                  <div>
                    <strong>
                      {event.userFirstName} {event.userLastName}
                    </strong>
                    <span className="muted">{eventTypeLabel(event.eventType, language)}</span>
                  </div>
                  <span className="admin-recent-activity-time">{formatDate(event.createdAt)}</span>
                </div>
              ))}
            </div>
          ) : recentActivity ? (
            <p className="muted">{copy.noActivity}</p>
          ) : (
            <p className="muted">…</p>
          )}
        </div>

        <div className="admin-panel admin-trend-panel">
          <h3>{copy.planDistribution}</h3>
          <AdminDonutChart segments={planSegments} emptyLabel={copy.noPlanData} />
        </div>
      </div>

      <div className="admin-role-grid">
        {ADMIN_DASHBOARD_ROLES.map((role) => {
          const count = overview.usersByRole?.[role.id] || 0;
          const rolePlans = Object.entries(overview.planCountsByRole?.[role.id] || {});
          return (
            <div key={role.id} className="admin-role-card" style={{ "--role-color": role.color }}>
              <div className="admin-role-card-head">
                <span className="admin-role-icon">
                  <UiIcon name={role.icon} />
                </span>
                <div>
                  <span className="admin-role-count">{count}</span>
                  <span className="admin-role-label">{getAccountLabel(role.id, language)}</span>
                </div>
              </div>
              <ul className="admin-role-plan-list">
                {rolePlans.length ? (
                  rolePlans.map(([planId, planCount]) => (
                    <li key={planId}>
                      <span>{getPlanById(planId)?.name?.[language] || getPlanById(planId)?.name?.fr || planId}</span>
                      <strong>{planCount}</strong>
                    </li>
                  ))
                ) : (
                  <li className="muted">{copy.noPlan}</li>
                )}
              </ul>
            </div>
          );
        })}
      </div>

      <div className="admin-dashboard-insights">
        <div className="admin-panel admin-latest-users-panel">
          <div className="admin-panel-title-row">
            <h3>{copy.latestUsers}</h3>
            <span>{overview.totalUsers || recentUsers?.length || 0}</span>
          </div>
          {recentUsers?.length ? (
            <div className="admin-table-wrap compact">
              <table className="admin-table admin-latest-users-table">
                <thead>
                  <tr>
                    <th>{copy.colUser}</th>
                    <th>{copy.colRole}</th>
                    <th>{copy.colPlan}</th>
                    <th>{copy.colDate}</th>
                  </tr>
                </thead>
                <tbody>
                  {recentUsers.map((item) => {
                    const plan = item.planId ? getPlanById(item.planId) : null;
                    return (
                      <tr key={item.id}>
                        <td>
                          <div className="admin-latest-user-cell">
                            <AvatarCircle user={item} />
                            <div>
                              <strong>
                                {item.firstName} {item.lastName}
                              </strong>
                              <span>{item.email}</span>
                            </div>
                          </div>
                        </td>
                        <td>{getAccountLabel(item.roleType, language)}</td>
                        <td>
                          <span className={`status-pill ${plan ? "active" : "neutral"}`}>
                            {plan?.name?.[language] || plan?.name?.fr || copy.noPlan}
                          </span>
                        </td>
                        <td>{formatDate(item.createdAt)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : recentUsers ? (
            <p className="muted">{copy.noRecentUsers}</p>
          ) : (
            <p className="muted">…</p>
          )}
        </div>

        <div className="admin-panel admin-plan-focus-panel">
          <div className="admin-panel-title-row">
            <h3>{copy.planFocus}</h3>
            <span>{activePlanTotal} {copy.activeSubscribers}</span>
          </div>
          <div className="admin-plan-focus-list">
            {planEntries.length ? (
              planEntries.map(([planId, count]) => {
                const percent = activePlanTotal ? Math.round((Number(count || 0) / activePlanTotal) * 100) : 0;
                return (
                  <div key={planId} className="admin-plan-focus-item">
                    <div>
                      <strong>{getPlanById(planId)?.name?.[language] || getPlanById(planId)?.name?.fr || planId}</strong>
                      <span>{count} {copy.activeSubscribers}</span>
                    </div>
                    <div className="admin-plan-focus-meter" style={{ "--pct": `${percent}%` }}>
                      <span />
                    </div>
                    <em>{percent}%</em>
                  </div>
                );
              })
            ) : (
              <p className="muted">{copy.noPlanData}</p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function AdminPricingPage({ user, language, currency = "EUR" }) {
  const copy =
    language === "en"
      ? {
          title: "Pricing",
          subtitle: "Plans currently in effect — prices can be edited here.",
          edit: "Edit",
          save: "Save",
          saving: "Saving…",
          cancel: "Cancel",
          reset: "Reset to default",
          features: "Included",
          monthlyLabel: "Monthly",
          annualLabel: "Annual",
          monthly: "Monthly price (€)",
          annual: "Annual price (€)",
          singlePrice: "Price (€)",
          customBadge: "Custom price",
          confirmStripeTitle: "Changing this price creates a new Stripe price",
          confirmStripeText:
            "Stripe prices can't be edited in place — a new one will be created and used from now on for checkout. Existing subscribers keep their current price until they change plans.",
          confirmBtn: "Confirm"
        }
      : {
          title: "Tarifs",
          subtitle: "Grilles tarifaires en vigueur — les prix sont modifiables ici.",
          edit: "Modifier",
          save: "Enregistrer",
          saving: "Enregistrement…",
          cancel: "Annuler",
          reset: "Réinitialiser au tarif par défaut",
          features: "Inclus",
          monthlyLabel: "Mensuel",
          annualLabel: "Annuel",
          monthly: "Prix mensuel (€)",
          annual: "Prix annuel (€)",
          singlePrice: "Prix (€)",
          customBadge: "Tarif personnalisé",
          confirmStripeTitle: "Modifier ce tarif crée un nouveau prix Stripe",
          confirmStripeText:
            "Les tarifs Stripe ne peuvent pas être modifiés sur place — un nouveau sera créé et utilisé désormais pour le paiement. Les abonnés existants gardent leur tarif actuel tant qu'ils ne changent pas de plan.",
          confirmBtn: "Confirmer"
        };
  const pricingCopy = APP_COPY[language]?.pricing || APP_COPY.fr.pricing;

  const [overrides, setOverrides] = useState({});
  const [loaded, setLoaded] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ monthlyPrice: "", annualPrice: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function load() {
    getAdminPlans(user.id)
      .then((items) => {
        setOverrides(Object.fromEntries(items.map((item) => [item.id, item])));
        setLoaded(true);
      })
      .catch((err) => setError(getFriendlyErrorMessage(err, language)));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.id]);

  function startEdit(plan, effective) {
    setEditingId(plan.id);
    setError("");
    setForm({
      monthlyPrice: effective.isSinglePrice ? "" : String(effective.monthlyPrice ?? ""),
      annualPrice: String(effective.annualPrice ?? "")
    });
  }

  async function saveEdit(plan, effective) {
    if (plan.grantsPremium) {
      const result = await Swal.fire({
        icon: "warning",
        title: copy.confirmStripeTitle,
        text: copy.confirmStripeText,
        showCancelButton: true,
        confirmButtonText: copy.confirmBtn,
        cancelButtonText: copy.cancel
      });
      if (!result.isConfirmed) return;
    }
    setSaving(true);
    setError("");
    try {
      await updateAdminPlan({
        adminUserId: user.id,
        planId: plan.id,
        monthlyPrice: effective.isSinglePrice ? null : Number(form.monthlyPrice),
        annualPrice: Number(form.annualPrice)
      });
      setEditingId(null);
      load();
    } catch (err) {
      setError(getFriendlyErrorMessage(err, language));
    } finally {
      setSaving(false);
    }
  }

  async function resetPlan(plan) {
    setSaving(true);
    setError("");
    try {
      await resetAdminPlan({ adminUserId: user.id, planId: plan.id });
      setEditingId(null);
      load();
    } catch (err) {
      setError(getFriendlyErrorMessage(err, language));
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="admin-pricing">
      <header className="module-header">
        <h2>{copy.title}</h2>
        <p>{copy.subtitle}</p>
      </header>

      {error ? <p className="field-error">{error}</p> : null}

      {PLAN_SEGMENTS.map((segment) => (
        <div key={segment} className="admin-pricing-segment">
          <h3>
            {segment === "candidate"
              ? pricingCopy.segmentCandidate
              : segment === "agency"
              ? pricingCopy.segmentAgency
              : pricingCopy.segmentSchool}
          </h3>
          <div className="admin-pricing-grid">
            {PLANS.filter((plan) => plan.segment === segment).map((plan) => {
              const effective = overrides[plan.id] || {
                monthlyPrice: plan.monthlyPrice,
                annualPrice: plan.annualPrice,
                isSinglePrice: plan.monthlyPrice == null,
                overridden: false
              };
              const price = formatPlanPrice(
                { ...plan, monthlyPrice: effective.monthlyPrice, annualPrice: effective.annualPrice },
                "monthly",
                language,
                pricingCopy,
                currency
              );
              const isEditing = editingId === plan.id;
              return (
                <article key={plan.id} className={`admin-pricing-card ${plan.highlighted ? "recommended" : ""}`}>
                  <div className="admin-pricing-card-head">
                    <div>
                      <div className="admin-pricing-badges">
                        {plan.badge ? <span>{plan.badge[language] || plan.badge.fr}</span> : null}
                        {effective.overridden ? <span className="is-custom">{copy.customBadge}</span> : null}
                      </div>
                      <h4>{plan.name[language] || plan.name.fr}</h4>
                      <p>{plan.tagline[language] || plan.tagline.fr}</p>
                    </div>
                    <span className="admin-pricing-icon">
                      <UiIcon name={plan.grantsPremium ? "pricetag" : "shield"} />
                    </span>
                  </div>
                  {isEditing ? (
                    <div className="admin-pricing-edit-form">
                      {!effective.isSinglePrice ? (
                        <label>
                          {copy.monthly}
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={form.monthlyPrice}
                            onChange={(event) => setForm((prev) => ({ ...prev, monthlyPrice: event.target.value }))}
                          />
                        </label>
                      ) : null}
                      <label>
                        {effective.isSinglePrice ? copy.singlePrice : copy.annual}
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={form.annualPrice}
                          onChange={(event) => setForm((prev) => ({ ...prev, annualPrice: event.target.value }))}
                        />
                      </label>
                      <div className="admin-pricing-edit-actions">
                        <button type="button" className="btn-ghost" onClick={() => setEditingId(null)} disabled={saving}>
                          {copy.cancel}
                        </button>
                        <button type="button" className="btn-main" onClick={() => saveEdit(plan, effective)} disabled={saving}>
                          {saving ? <span className="btn-spinner" /> : null} {saving ? copy.saving : copy.save}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="admin-pricing-price-row">
                        <div className="admin-pricing-price">
                          <span>{effective.isSinglePrice ? copy.singlePrice : copy.monthlyLabel}</span>
                          <strong>{price.amount}</strong>
                          <small>{price.unit}</small>
                        </div>
                        {!effective.isSinglePrice ? (
                          <div className="admin-pricing-price is-secondary">
                            <span>{copy.annualLabel}</span>
                            <strong>{formatEur(effective.annualPrice, currency)}</strong>
                            <small>{pricingCopy.perYear}</small>
                          </div>
                        ) : null}
                      </div>
                      <div className="admin-pricing-features-title">{copy.features}</div>
                      <ul className="admin-pricing-feature-list">
                        {(plan.features[language] || plan.features.fr).slice(0, 4).map((feature) => (
                          <li key={feature}>{feature}</li>
                        ))}
                      </ul>
                      <div className="admin-pricing-edit-actions">
                        <button type="button" className="btn-ghost" onClick={() => startEdit(plan, effective)} disabled={!loaded}>
                          <UiIcon name="edit" /> {copy.edit}
                        </button>
                        {effective.overridden ? (
                          <button type="button" className="btn-ghost" onClick={() => resetPlan(plan)} disabled={saving}>
                            {copy.reset}
                          </button>
                        ) : null}
                      </div>
                    </>
                  )}
                </article>
              );
            })}
          </div>
        </div>
      ))}
    </section>
  );
}

const ADMIN_ACCOUNT_SUBTABS = [
  { id: "all", label: { fr: "Tous les comptes", en: "All accounts" } },
  { id: "student", label: { fr: "Étudiants", en: "Students" } },
  { id: "school", label: { fr: "Écoles", en: "Schools" } },
  { id: "recruiter_firm", label: { fr: "Cabinets", en: "Agencies" } },
  { id: "admin", label: { fr: "Administrateurs", en: "Administrators" } }
];

const ADMIN_PAGE_SIZE = 8;

function getPaginationRange(current, total, delta = 1) {
  const range = [];
  for (let i = 1; i <= total; i += 1) {
    if (i === 1 || i === total || (i >= current - delta && i <= current + delta)) {
      range.push(i);
    }
  }
  const withDots = [];
  let last = 0;
  for (const num of range) {
    if (last) {
      if (num - last === 2) withDots.push(last + 1);
      else if (num - last > 2) withDots.push("…");
    }
    withDots.push(num);
    last = num;
  }
  return withDots;
}

function AdminPagination({ page, totalPages, onChange, language, totalItems, pageSize = ADMIN_PAGE_SIZE }) {
  if (totalPages <= 1) return null;

  const copy =
    language === "en"
      ? {
          previous: "Previous",
          next: "Next",
          showing: (from, to, total) => `Showing ${from} to ${to} of ${total} entries`
        }
      : {
          previous: "Précédent",
          next: "Suivant",
          showing: (from, to, total) => `Affichage de ${from} à ${to} sur ${total} entrées`
        };

  const from = totalItems ? (page - 1) * pageSize + 1 : null;
  const to = totalItems ? Math.min(page * pageSize, totalItems) : null;
  const pageNumbers = getPaginationRange(page, totalPages);

  return (
    <div className="admin-pagination-bar">
      <span className="admin-pagination-info">{totalItems ? copy.showing(from, to, totalItems) : ""}</span>
      <div className="admin-pagination">
        <button
          type="button"
          className="admin-pagination-textbtn"
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
        >
          {copy.previous}
        </button>
        {pageNumbers.map((num, index) =>
          num === "…" ? (
            <span key={`dots-${index}`} className="admin-pagination-ellipsis">
              …
            </span>
          ) : (
            <button
              key={num}
              type="button"
              className={`admin-pagination-num ${num === page ? "active" : ""}`}
              onClick={() => onChange(num)}
            >
              {num}
            </button>
          )
        )}
        <button
          type="button"
          className="admin-pagination-textbtn"
          disabled={page >= totalPages}
          onClick={() => onChange(page + 1)}
        >
          {copy.next}
        </button>
      </div>
    </div>
  );
}

function AdminOrgCard({ org, language, roleType }) {
  const copy =
    language === "en"
      ? { seats: "Seats", members: "Members", noMembers: "No member linked to a license code yet.", createdOn: "Created on" }
      : { seats: "Sièges", members: "Membres", noMembers: "Aucun membre lié à un code de licence pour l'instant.", createdOn: "Créé le" };

  const totalSeats = org.licenseCodes.reduce((sum, code) => sum + Number(code.seatsTotal || 0), 0);
  const usedSeats = org.licenseCodes.reduce((sum, code) => sum + Number(code.seatsUsed || 0), 0);

  return (
    <article className="admin-org-card">
      <div className="admin-org-card-head">
        <AvatarCircle user={org} />
        <div className="admin-org-card-meta">
          <strong>{org.organizationName || `${org.firstName} ${org.lastName}`}</strong>
          <span className="muted">
            {org.organizationName ? `${org.firstName} ${org.lastName} · ` : ""}
            {org.email}
          </span>
        </div>
        {org.licenseCodes.length ? (
          <span className="tag">
            {copy.seats}: {usedSeats}/{totalSeats}
          </span>
        ) : null}
        <span className="muted admin-org-card-date">
          {copy.createdOn} {formatDate(org.createdAt)}
        </span>
      </div>

      <div className="admin-org-members">
        <h4>
          {copy.members} ({org.members.length})
        </h4>
        {org.members.length ? (
          <div className="admin-org-members-list">
            {org.members.map((member) => (
              <div key={member.id} className="admin-org-member-row">
                <AvatarCircle user={member} />
                <div>
                  <strong>
                    {member.firstName} {member.lastName}
                  </strong>
                  <span className="muted">{member.email}</span>
                </div>
                <span className="tag">{getAccountLabel(member.roleType, language)}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="muted">{copy.noMembers}</p>
        )}
      </div>
    </article>
  );
}

function AdminAccountsPage({ user, language, currency = "EUR", initialSearch }) {
  const copy =
    language === "en"
      ? {
          title: "Account management",
          subtitle: "Browse every account on the platform and create new ones.",
          firstName: "First name",
          lastName: "Last name",
          email: "Email",
          password: "Password",
          accountType: "Account type",
          plan: "Plan (optional)",
          noPlan: "No plan",
          create: "Create account",
          creating: "Creating…",
          addAccount: "Create an account",
          search: "Search by name or email…",
          createdOn: "Created on",
          colName: "Name",
          colRole: "Role",
          colPlan: "Plan",
          colPrice: "Price",
          colCreated: "Created on",
          colActions: "Actions",
          empty: "No account found.",
          schoolOrgName: "School name",
          agencyOrgName: "Agency name",
          website: "Website (optional)",
          studentSchool: "School / institution (optional)",
          edit: "Edit",
          delete: "Delete",
          editTitle: "Edit account",
          save: "Save changes",
          saving: "Saving…",
          deleteTitle: "Delete this account",
          deleteWarning:
            "This will permanently delete the account and all its data (CVs, match history, license codes). This cannot be undone.",
          deleteConfirmLabel: "Type the account's email to confirm",
          deleteConfirm: "Delete permanently",
          cancel: "Cancel",
          free: "Free",
          adminModulesLabel: "Visible modules",
          adminModulesHint: "Leave everything checked for full access.",
          colPermissions: "Permissions",
          fullAccess: "Full access"
          ,
          colUsage: "Usage",
          colLastLogin: "Last login",
          colStatus: "Status",
          active: "Active",
          suspended: "Suspended",
          suspend: "Suspend",
          reactivate: "Reactivate"
        }
      : {
          title: "Gestion de compte",
          subtitle: "Consultez tous les comptes de la plateforme et créez-en de nouveaux.",
          firstName: "Prénom",
          lastName: "Nom",
          email: "Email",
          password: "Mot de passe",
          accountType: "Type de compte",
          plan: "Plan (optionnel)",
          noPlan: "Aucun plan",
          create: "Créer le compte",
          creating: "Création…",
          addAccount: "Créer un compte",
          search: "Rechercher par nom ou email…",
          createdOn: "Créé le",
          colName: "Nom",
          colRole: "Rôle",
          colPlan: "Plan",
          colPrice: "Tarif",
          colCreated: "Créé le",
          colActions: "Actions",
          schoolOrgName: "Nom de l'école",
          agencyOrgName: "Nom du cabinet",
          website: "Site web (optionnel)",
          studentSchool: "École / établissement (optionnel)",
          empty: "Aucun compte trouvé.",
          edit: "Modifier",
          delete: "Supprimer",
          editTitle: "Modifier le compte",
          save: "Enregistrer",
          saving: "Enregistrement…",
          deleteTitle: "Supprimer ce compte",
          deleteWarning:
            "Cela supprime définitivement le compte et toutes ses données (CV, historique de matching, codes de licence). Action irréversible.",
          deleteConfirmLabel: "Saisissez l'email du compte pour confirmer",
          deleteConfirm: "Supprimer définitivement",
          cancel: "Annuler",
          free: "Gratuit",
          adminModulesLabel: "Modules visibles",
          adminModulesHint: "Laissez tout coché pour un accès complet.",
          colPermissions: "Permissions",
          fullAccess: "Accès complet",
          colUsage: "Usage",
          colLastLogin: "Dernière connexion",
          colStatus: "Statut",
          active: "Actif",
          suspended: "Suspendu",
          suspend: "Suspendre",
          reactivate: "Réactiver"
        };

  const [subTab, setSubTab] = useState("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    accountType: "student",
    planId: "",
    billingCycle: "monthly",
    organizationName: "",
    schoolName: "",
    website: "",
    adminModules: []
  });
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [users, setUsers] = useState([]);
  const [orgAccounts, setOrgAccounts] = useState([]);
  const [search, setSearch] = useState(initialSearch || "");
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (initialSearch) setSearch(initialSearch);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialSearch]);
  const [editTarget, setEditTarget] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState("");

  const isOrgTab = subTab === "school" || subTab === "recruiter_firm";
  const selectedSegment = ADMIN_ACCOUNT_TYPES.find((item) => item.id === form.accountType)?.segment;
  const availablePlans = PLANS.filter((plan) => plan.segment === selectedSegment);
  const editSegment = editForm ? ADMIN_ACCOUNT_TYPES.find((item) => item.id === editForm.accountType)?.segment : null;
  const editAvailablePlans = PLANS.filter((plan) => plan.segment === editSegment);

  function reload() {
    if (isOrgTab) loadOrgAccounts();
    else loadUsers();
  }

  function openEdit(item) {
    setEditTarget(item);
    setEditError("");
    setEditForm({
      firstName: item.firstName,
      lastName: item.lastName,
      accountType: item.roleType,
      planId: item.planId || "",
      billingCycle: item.billingCycle || "monthly",
      organizationName: item.organizationName || "",
      website: item.website || "",
      adminModules: item.adminModules || []
    });
  }

  function toggleAdminModule(setter, moduleId) {
    setter((prev) => {
      const allIds = ADMIN_MODULE_DEFS.map((item) => item.id);
      const current = Array.isArray(prev.adminModules) && prev.adminModules.length ? prev.adminModules : allIds;
      const next = current.includes(moduleId) ? current.filter((id) => id !== moduleId) : [...current, moduleId];
      return { ...prev, adminModules: next.length === allIds.length ? [] : next };
    });
  }

  async function submitEdit(event) {
    event.preventDefault();
    setEditError("");
    setEditSaving(true);
    try {
      await updateAdminUser({
        adminUserId: user.id,
        userId: editTarget.id,
        firstName: editForm.firstName,
        lastName: editForm.lastName,
        organizationName: editForm.organizationName,
        website: editForm.website,
        planId: editForm.planId || null,
        billingCycle: editForm.billingCycle,
        adminModules: editForm.adminModules || []
      });
      setEditTarget(null);
      reload();
    } catch (err) {
      setEditError(getFriendlyErrorMessage(err, language));
    } finally {
      setEditSaving(false);
    }
  }

  async function openDelete(item) {
    const { value: confirmationEmail } = await Swal.fire({
      icon: "warning",
      title: copy.deleteTitle,
      html: `<p style="text-align:left;margin-bottom:0.6rem;">${copy.deleteWarning}</p><p style="text-align:left;font-weight:700;">${item.firstName} ${item.lastName} · ${item.email}</p>`,
      input: "text",
      inputPlaceholder: item.email,
      inputLabel: copy.deleteConfirmLabel,
      showCancelButton: true,
      confirmButtonText: copy.deleteConfirm,
      cancelButtonText: copy.cancel,
      confirmButtonColor: "#b91c1c",
      focusCancel: true,
      preConfirm: (value) => {
        if (value !== item.email) {
          Swal.showValidationMessage(copy.deleteConfirmLabel);
          return false;
        }
        return value;
      }
    });

    if (!confirmationEmail) return;

    try {
      await deleteAdminUser({ adminUserId: user.id, userId: item.id, confirmation: confirmationEmail });
      reload();
      Swal.fire({
        toast: true,
        position: "top-end",
        icon: "success",
        title: language === "en" ? "Account deleted." : "Compte supprimé.",
        showConfirmButton: false,
        timer: 2800,
        timerProgressBar: true,
        customClass: { popup: "career-toast", title: "career-toast-title" }
      });
    } catch (err) {
      Swal.fire({ icon: "error", title: getFriendlyErrorMessage(err, language) });
    }
  }

  async function toggleUserStatus(item) {
    const nextStatus = item.status === "suspended" ? "active" : "suspended";
    const isSuspending = nextStatus === "suspended";
    const result = await Swal.fire({
      icon: isSuspending ? "warning" : "question",
      title: isSuspending
        ? language === "en"
          ? "Suspend this account?"
          : "Suspendre ce compte ?"
        : language === "en"
          ? "Reactivate this account?"
          : "Réactiver ce compte ?",
      html: isSuspending
        ? language === "en"
          ? `<p style="text-align:left;margin:0;">The user will no longer be able to sign in. Active sessions will be closed.</p><p style="text-align:left;font-weight:700;margin-top:0.75rem;">${item.firstName} ${item.lastName} · ${item.email}</p>`
          : `<p style="text-align:left;margin:0;">L'utilisateur ne pourra plus se connecter. Les sessions actives seront fermées.</p><p style="text-align:left;font-weight:700;margin-top:0.75rem;">${item.firstName} ${item.lastName} · ${item.email}</p>`
        : language === "en"
          ? `<p style="text-align:left;margin:0;">This account will be allowed to sign in again.</p><p style="text-align:left;font-weight:700;margin-top:0.75rem;">${item.firstName} ${item.lastName} · ${item.email}</p>`
          : `<p style="text-align:left;margin:0;">Ce compte pourra de nouveau se connecter.</p><p style="text-align:left;font-weight:700;margin-top:0.75rem;">${item.firstName} ${item.lastName} · ${item.email}</p>`,
      showCancelButton: true,
      confirmButtonText: isSuspending ? copy.suspend : copy.reactivate,
      cancelButtonText: copy.cancel,
      confirmButtonColor: isSuspending ? "#dc2626" : "#4f46e5",
      focusCancel: true
    });
    if (!result.isConfirmed) return;

    try {
      await updateAdminUserStatus({ adminUserId: user.id, userId: item.id, status: nextStatus });
      reload();
      Swal.fire({
        toast: true,
        position: "top-end",
        icon: "success",
        title: isSuspending
          ? language === "en"
            ? "Account suspended."
            : "Compte suspendu."
          : language === "en"
            ? "Account reactivated."
            : "Compte réactivé.",
        showConfirmButton: false,
        timer: 2500,
        timerProgressBar: true,
        customClass: { popup: "career-toast", title: "career-toast-title" }
      });
    } catch (err) {
      Swal.fire({ icon: "error", title: getFriendlyErrorMessage(err, language) });
    }
  }

  function loadUsers() {
    listAdminUsers(user.id, { search, roleType: subTab === "all" ? "" : subTab })
      .then(setUsers)
      .catch((err) => setError(getFriendlyErrorMessage(err, language)));
  }

  function loadOrgAccounts() {
    getAdminOrgAccounts(user.id, subTab)
      .then(setOrgAccounts)
      .catch((err) => setError(getFriendlyErrorMessage(err, language)));
  }

  useEffect(() => {
    setPage(1);
    setError("");
    if (isOrgTab) {
      loadOrgAccounts();
    } else {
      loadUsers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subTab, search]);

  const totalPages = Math.max(1, Math.ceil(users.length / ADMIN_PAGE_SIZE));
  const pagedUsers = users.slice((page - 1) * ADMIN_PAGE_SIZE, page * ADMIN_PAGE_SIZE);

  function updateField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function submit(event) {
    event.preventDefault();
    setError("");
    setMessage("");
    setCreating(true);
    try {
      const result = await createAdminUser({
        adminUserId: user.id,
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        password: form.password,
        accountType: form.accountType,
        planId: form.planId || null,
        billingCycle: form.billingCycle,
        organizationName: form.organizationName,
        schoolName: form.schoolName,
        website: form.website,
        adminModules: form.accountType === "admin" ? form.adminModules : undefined
      });
      setMessage(
        result.licenseCode
          ? language === "en"
            ? `Account created. License code: ${result.licenseCode}`
            : `Compte créé. Code de licence : ${result.licenseCode}`
          : language === "en"
          ? "Account created."
          : "Compte créé."
      );
      setForm({
        firstName: "",
        lastName: "",
        email: "",
        password: "",
        accountType: "student",
        planId: "",
        billingCycle: "monthly",
        organizationName: "",
        schoolName: "",
        website: "",
        adminModules: []
      });
      if (isOrgTab) loadOrgAccounts();
      else loadUsers();
    } catch (err) {
      setError(getFriendlyErrorMessage(err, language));
    } finally {
      setCreating(false);
    }
  }

  return (
    <section className="admin-accounts">
      <header className="module-header admin-accounts-header">
        <div>
          <h2>{copy.title}</h2>
          <p>{copy.subtitle}</p>
        </div>
        <div className="admin-header-actions">
          <AdminExportCsvButton adminUserId={user.id} path="/admin/export/accounts" language={language} />
          <button type="button" className="btn-main ready" onClick={() => setCreateOpen(true)}>
            <UiIcon name="profile" /> {copy.addAccount}
          </button>
        </div>
      </header>

      <div className="admin-subtabs">
        {ADMIN_ACCOUNT_SUBTABS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`admin-subtab ${subTab === item.id ? "active" : ""}`}
            onClick={() => setSubTab(item.id)}
          >
            {item.label[language] || item.label.fr}
          </button>
        ))}
      </div>

      {!isOrgTab ? (
        <>
          <div className="admin-table-toolbar">
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={copy.search} />
          </div>

          {error ? <p className="field-error">{error}</p> : null}

          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>{copy.colName}</th>
                  <th>{copy.colRole}</th>
                  {subTab !== "admin" ? <th>{copy.colPlan}</th> : null}
                  {subTab !== "admin" ? <th>{copy.colPrice}</th> : null}
                  {subTab === "admin" ? <th>{copy.colPermissions}</th> : null}
                  {subTab !== "admin" ? <th>{copy.colUsage}</th> : null}
                  <th>{copy.colLastLogin}</th>
                  <th>{copy.colStatus}</th>
                  <th>{copy.colCreated}</th>
                  <th>{copy.colActions}</th>
                </tr>
              </thead>
              <tbody>
                {pagedUsers.length ? (
                  pagedUsers.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <div className="admin-table-name">
                          <AvatarCircle user={item} />
                          <div>
                            <strong>
                              {item.firstName} {item.lastName}
                            </strong>
                            <span className="muted">{item.email}</span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="tag">{getAccountLabel(item.roleType, language)}</span>
                      </td>
                      {subTab !== "admin" ? (
                        <td>
                          {item.planId ? (
                            <span className="tag">{getPlanById(item.planId)?.name?.[language] || item.planId}</span>
                          ) : (
                            <span className="muted">{copy.noPlan}</span>
                          )}
                        </td>
                      ) : null}
                      {subTab !== "admin" ? (
                        <td className="muted">{planPriceLabel(item.planId, item.billingCycle, copy.free, currency)}</td>
                      ) : null}
                      {subTab === "admin" ? (
                        <td>
                          {item.adminModules?.length ? (
                            <div className="admin-permission-tags">
                              {item.adminModules.map((moduleId) => (
                                <span key={moduleId} className="tag">
                                  {ADMIN_MODULE_LABELS[moduleId]?.[language] || ADMIN_MODULE_LABELS[moduleId]?.fr || moduleId}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="tag tag-success">{copy.fullAccess}</span>
                          )}
                        </td>
                      ) : null}
                      {subTab !== "admin" ? (
                        <td>
                          <div className="admin-usage-stack">
                            <span>{item.cvCount || 0} CV</span>
                            <span>{item.matchCount || 0} analyses</span>
                          </div>
                        </td>
                      ) : null}
                      <td className="muted">{item.lastLoginAt ? formatDate(item.lastLoginAt) : "—"}</td>
                      <td>
                        <span className={`tag ${item.status === "suspended" ? "tag-danger" : "tag-success"}`}>
                          {item.status === "suspended" ? copy.suspended : copy.active}
                        </span>
                      </td>
                      <td className="muted">{formatDate(item.createdAt)}</td>
                      <td>
                        <div className="admin-row-actions">
                          <button type="button" className="admin-row-action" onClick={() => openEdit(item)}>
                            <UiIcon name="edit" /> {copy.edit}
                          </button>
                          {item.roleType !== "admin" ? (
                            <>
                              <button type="button" className="admin-row-action" onClick={() => toggleUserStatus(item)}>
                                <UiIcon name="shield" /> {item.status === "suspended" ? copy.reactivate : copy.suspend}
                              </button>
                              <button type="button" className="admin-row-action danger" onClick={() => openDelete(item)}>
                                <UiIcon name="alert" /> {copy.delete}
                              </button>
                            </>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={subTab === "admin" ? 7 : 9} className="admin-table-empty muted">
                      {copy.empty}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <AdminPagination page={page} totalPages={totalPages} onChange={setPage} language={language} totalItems={users.length} />
        </>
      ) : (
        <div className="admin-org-list">
          {error ? <p className="field-error">{error}</p> : null}
          {orgAccounts.length ? (
            orgAccounts.map((org) => <AdminOrgCard key={org.id} org={org} language={language} roleType={subTab} />)
          ) : (
            <p className="muted">{copy.empty}</p>
          )}
        </div>
      )}

      {createOpen ? (
        <div className="modal-overlay" onMouseDown={() => setCreateOpen(false)}>
          <div className="admin-create-modal" onMouseDown={(event) => event.stopPropagation()}>
            <button type="button" className="modal-close" onClick={() => setCreateOpen(false)} aria-label="Fermer">
              ×
            </button>
            <h3>{copy.addAccount}</h3>
            <form onSubmit={submit}>
              <div className="admin-form-grid">
                <label>
                  {copy.firstName}
                  <input value={form.firstName} onChange={(event) => updateField("firstName", event.target.value)} required />
                </label>
                <label>
                  {copy.lastName}
                  <input value={form.lastName} onChange={(event) => updateField("lastName", event.target.value)} required />
                </label>
                <label>
                  {copy.email}
                  <input type="email" value={form.email} onChange={(event) => updateField("email", event.target.value)} required />
                </label>
                <label>
                  {copy.password}
                  <input
                    type="password"
                    minLength={8}
                    value={form.password}
                    onChange={(event) => updateField("password", event.target.value)}
                    required
                  />
                </label>
                <label>
                  {copy.accountType}
                  <select value={form.accountType} onChange={(event) => updateField("accountType", event.target.value)}>
                    {ADMIN_ACCOUNT_TYPES.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.label[language] || item.label.fr}
                      </option>
                    ))}
                  </select>
                </label>
                {form.accountType !== "admin" ? (
                  <label>
                    {copy.plan}
                    <select value={form.planId} onChange={(event) => updateField("planId", event.target.value)}>
                      <option value="">{copy.noPlan}</option>
                      {availablePlans.map((plan) => (
                        <option key={plan.id} value={plan.id}>
                          {plan.name[language] || plan.name.fr}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : null}

                {form.accountType === "school" ? (
                  <>
                    <label>
                      {copy.schoolOrgName}
                      <input
                        value={form.organizationName}
                        onChange={(event) => updateField("organizationName", event.target.value)}
                        required
                      />
                    </label>
                    <label>
                      {copy.website}
                      <input value={form.website} onChange={(event) => updateField("website", event.target.value)} />
                    </label>
                  </>
                ) : null}

                {form.accountType === "recruiter_firm" ? (
                  <>
                    <label>
                      {copy.agencyOrgName}
                      <input
                        value={form.organizationName}
                        onChange={(event) => updateField("organizationName", event.target.value)}
                        required
                      />
                    </label>
                    <label>
                      {copy.website}
                      <input value={form.website} onChange={(event) => updateField("website", event.target.value)} />
                    </label>
                  </>
                ) : null}

                {form.accountType === "student" ? (
                  <label>
                    {copy.studentSchool}
                    <input value={form.schoolName} onChange={(event) => updateField("schoolName", event.target.value)} />
                  </label>
                ) : null}
              </div>

              {form.accountType === "admin" ? (
                <div className="admin-permissions-block">
                  <strong>{copy.adminModulesLabel}</strong>
                  <p className="muted">{copy.adminModulesHint}</p>
                  <div className="admin-permissions-grid">
                    {ADMIN_MODULE_DEFS.map((moduleDef) => (
                      <label key={moduleDef.id} className="admin-permission-check">
                        <input
                          type="checkbox"
                          checked={!form.adminModules.length || form.adminModules.includes(moduleDef.id)}
                          onChange={() => toggleAdminModule(setForm, moduleDef.id)}
                        />
                        {ADMIN_MODULE_LABELS[moduleDef.id][language] || ADMIN_MODULE_LABELS[moduleDef.id].fr}
                      </label>
                    ))}
                  </div>
                </div>
              ) : null}

              {error ? <p className="field-error">{error}</p> : null}
              {message ? <p className="field-hint success">{message}</p> : null}

              <button type="submit" className="btn-main ready" disabled={creating}>
                {creating ? <span className="btn-spinner" /> : null} {creating ? copy.creating : copy.create}
              </button>
            </form>
          </div>
        </div>
      ) : null}

      {editTarget ? (
        <div className="modal-overlay" onMouseDown={() => setEditTarget(null)}>
          <div className="admin-create-modal" onMouseDown={(event) => event.stopPropagation()}>
            <button type="button" className="modal-close" onClick={() => setEditTarget(null)} aria-label="Fermer">
              ×
            </button>
            <h3>{copy.editTitle}</h3>
            <form onSubmit={submitEdit}>
              <div className="admin-form-grid">
                <label>
                  {copy.firstName}
                  <input
                    value={editForm.firstName}
                    onChange={(event) => setEditForm((prev) => ({ ...prev, firstName: event.target.value }))}
                    required
                  />
                </label>
                <label>
                  {copy.lastName}
                  <input
                    value={editForm.lastName}
                    onChange={(event) => setEditForm((prev) => ({ ...prev, lastName: event.target.value }))}
                    required
                  />
                </label>
                {editForm.accountType !== "admin" ? (
                  <label>
                    {copy.plan}
                    <select
                      value={editForm.planId}
                      onChange={(event) => setEditForm((prev) => ({ ...prev, planId: event.target.value }))}
                    >
                      <option value="">{copy.noPlan}</option>
                      {editAvailablePlans.map((plan) => (
                        <option key={plan.id} value={plan.id}>
                          {plan.name[language] || plan.name.fr}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : null}
                {(editForm.accountType === "school" || editForm.accountType === "recruiter_firm") ? (
                  <>
                    <label>
                      {editForm.accountType === "school" ? copy.schoolOrgName : copy.agencyOrgName}
                      <input
                        value={editForm.organizationName}
                        onChange={(event) => setEditForm((prev) => ({ ...prev, organizationName: event.target.value }))}
                      />
                    </label>
                    <label>
                      {copy.website}
                      <input
                        value={editForm.website}
                        onChange={(event) => setEditForm((prev) => ({ ...prev, website: event.target.value }))}
                      />
                    </label>
                  </>
                ) : null}
              </div>

              {editForm.accountType === "admin" ? (
                <div className="admin-permissions-block">
                  <strong>{copy.adminModulesLabel}</strong>
                  <p className="muted">{copy.adminModulesHint}</p>
                  <div className="admin-permissions-grid">
                    {ADMIN_MODULE_DEFS.map((moduleDef) => (
                      <label key={moduleDef.id} className="admin-permission-check">
                        <input
                          type="checkbox"
                          checked={!editForm.adminModules?.length || editForm.adminModules.includes(moduleDef.id)}
                          onChange={() => toggleAdminModule(setEditForm, moduleDef.id)}
                        />
                        {ADMIN_MODULE_LABELS[moduleDef.id][language] || ADMIN_MODULE_LABELS[moduleDef.id].fr}
                      </label>
                    ))}
                  </div>
                </div>
              ) : null}

              {editError ? <p className="field-error">{editError}</p> : null}

              <div className="admin-modal-actions">
                <button type="button" className="btn-ghost" onClick={() => setEditTarget(null)}>
                  {copy.cancel}
                </button>
                <button type="submit" className="btn-main ready" disabled={editSaving}>
                  {editSaving ? <span className="btn-spinner" /> : null} {editSaving ? copy.saving : copy.save}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

    </section>
  );
}

const ADMIN_FINANCE_SOURCES = [
  { id: "", label: { fr: "Toutes les sources", en: "All sources" } },
  { id: "stripe", label: { fr: "Stripe (paiement réel)", en: "Stripe (real payment)" } },
  { id: "instant", label: { fr: "Activation instantanée", en: "Instant activation" } },
  { id: "license_redeem", label: { fr: "Code de licence", en: "License code" } },
  { id: "admin_created", label: { fr: "Créé par l'admin", en: "Created by admin" } }
];

function formatEur(amount, currency = "EUR") {
  return formatAmountInCurrency(amount, currency, { decimals: true });
}

function planPriceLabel(planId, billingCycle, freeLabel, currency = "EUR") {
  const plan = getPlanById(planId);
  if (!plan) return "—";
  if (plan.monthlyPrice === 0 && plan.annualPrice === 0) return freeLabel || "Gratuit";
  if (plan.monthlyPrice == null) return formatEur(plan.annualPrice, currency);
  const amount = billingCycle === "annual" ? plan.annualPrice : plan.monthlyPrice;
  return `${formatEur(amount, currency)} / ${billingCycle === "annual" ? "an" : "mois"}`;
}

function AdminMiniMetric({ label, value, icon = "chart", tone = "" }) {
  return (
    <article className={`admin-mini-metric ${tone}`}>
      <span>
        <UiIcon name={icon} />
      </span>
      <div>
        <strong>{value}</strong>
        <small>{label}</small>
      </div>
    </article>
  );
}

function AdminCvsPage({ user, language }) {
  const copy =
    language === "en"
      ? {
          title: "Uploaded CVs",
          subtitle: "Every CV saved in the platform, with extraction status and quick actions.",
          search: "Search by user, file, skill…",
          all: "All statuses",
          extracted: "Extracted",
          partial: "Partial",
          needsReview: "Needs review",
          colCv: "CV",
          colUser: "User",
          colStatus: "Status",
          colData: "Extracted data",
          colActions: "Actions",
          reanalyze: "Reanalyze",
          delete: "Delete",
          empty: "No CV found."
        }
      : {
          title: "CV importés",
          subtitle: "Tous les CV enregistrés dans la plateforme, avec statut d'extraction et actions rapides.",
          search: "Rechercher par utilisateur, fichier, compétence…",
          all: "Tous les statuts",
          extracted: "Extrait",
          partial: "Partiel",
          needsReview: "À revoir",
          colCv: "CV",
          colUser: "Utilisateur",
          colStatus: "Statut",
          colData: "Données extraites",
          colActions: "Actions",
          reanalyze: "Réanalyser",
          delete: "Supprimer",
          empty: "Aucun CV trouvé."
        };
  const [data, setData] = useState({ items: [], statusCounts: {} });
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState("");
  const [loading, setLoading] = useState(true);

  function reload() {
    setLoading(true);
    getAdminCvs(user.id, { search, status })
      .then(setData)
      .catch((err) => setError(getFriendlyErrorMessage(err, language)))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    setPage(1);
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, status]);

  async function handleReanalyze(item) {
    setBusyId(item.id);
    try {
      await reanalyzeAdminCv({ adminUserId: user.id, cvId: item.id });
      reload();
    } catch (err) {
      Swal.fire({ icon: "error", title: getFriendlyErrorMessage(err, language) });
    } finally {
      setBusyId("");
    }
  }

  async function handleDelete(item) {
    const result = await Swal.fire({
      icon: "warning",
      title: language === "en" ? "Delete this CV?" : "Supprimer ce CV ?",
      text: item.fileName,
      showCancelButton: true,
      confirmButtonText: copy.delete,
      cancelButtonText: language === "en" ? "Cancel" : "Annuler",
      confirmButtonColor: "#dc2626"
    });
    if (!result.isConfirmed) return;
    setBusyId(item.id);
    try {
      await deleteAdminCv({ adminUserId: user.id, cvId: item.id });
      reload();
    } catch (err) {
      Swal.fire({ icon: "error", title: getFriendlyErrorMessage(err, language) });
    } finally {
      setBusyId("");
    }
  }

  const statusCopy = { extracted: copy.extracted, partial: copy.partial, needs_review: copy.needsReview };
  const totalPages = Math.max(1, Math.ceil(data.items.length / ADMIN_PAGE_SIZE));
  const pagedItems = data.items.slice((page - 1) * ADMIN_PAGE_SIZE, page * ADMIN_PAGE_SIZE);

  return (
    <section className="admin-cvs admin-module-pro">
      <header className="module-header">
        <h2>{copy.title}</h2>
        <p>{copy.subtitle}</p>
      </header>
      <div className="admin-module-metrics">
        <AdminMiniMetric icon="save" label={copy.extracted} value={data.statusCounts?.extracted || 0} tone="success" />
        <AdminMiniMetric icon="alert" label={copy.partial} value={data.statusCounts?.partial || 0} tone="warning" />
        <AdminMiniMetric icon="shield" label={copy.needsReview} value={data.statusCounts?.needs_review || 0} tone="danger" />
      </div>
      <div className="admin-table-toolbar split">
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={copy.search} />
        <select value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="">{copy.all}</option>
          <option value="extracted">{copy.extracted}</option>
          <option value="partial">{copy.partial}</option>
          <option value="needs_review">{copy.needsReview}</option>
        </select>
      </div>
      {error ? <p className="field-error">{error}</p> : null}
      {loading ? <AdminPageLoader language={language} /> : null}
      {!loading && !error ? (
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>{copy.colCv}</th>
              <th>{copy.colUser}</th>
              <th>{copy.colStatus}</th>
              <th>{copy.colData}</th>
              <th>{copy.colActions}</th>
            </tr>
          </thead>
          <tbody>
            {pagedItems.length ? pagedItems.map((item) => (
              <tr key={item.id}>
                <td>
                  <strong>{item.fileName}</strong>
                  <span className="muted admin-block-muted">{formatDate(item.createdAt)} · {item.characterCount} car.</span>
                </td>
                <td>
                  <div className="admin-table-name">
                    <AvatarCircle user={{ firstName: item.userFirstName, lastName: item.userLastName, avatarDataUrl: item.userAvatarDataUrl }} />
                    <div>
                      <strong>{item.userFirstName} {item.userLastName}</strong>
                      <span className="muted">{item.userEmail}</span>
                    </div>
                  </div>
                </td>
                <td><span className={`tag ${item.status === "extracted" ? "tag-success" : item.status === "needs_review" ? "tag-danger" : ""}`}>{statusCopy[item.status] || item.status}</span></td>
                <td>
                  <div className="admin-extract-preview">
                    <strong>{item.preview.headline || `${item.preview.firstName} ${item.preview.lastName}`.trim() || "—"}</strong>
                    <span>{item.extraction.counts.skills} skills · {item.extraction.counts.experiences} exp. · {item.extraction.counts.education} formations</span>
                    <small>{item.preview.skills.slice(0, 5).join(", ")}</small>
                  </div>
                </td>
                <td>
                  <div className="admin-row-actions">
                    <button type="button" className="admin-row-action" disabled={busyId === item.id} onClick={() => handleReanalyze(item)}>
                      <UiIcon name="history" /> {copy.reanalyze}
                    </button>
                    <button type="button" className="admin-row-action danger" disabled={busyId === item.id} onClick={() => handleDelete(item)}>
                      <UiIcon name="trash" /> {copy.delete}
                    </button>
                  </div>
                </td>
              </tr>
            )) : (
              <tr><td colSpan={5} className="admin-table-empty muted">{copy.empty}</td></tr>
            )}
          </tbody>
        </table>
      </div>
      ) : null}
      <AdminPagination page={page} totalPages={totalPages} onChange={setPage} language={language} totalItems={data.items.length} />
    </section>
  );
}

function AdminMatchesPage({ user, language }) {
  const copy = language === "en"
    ? { title: "Analyzed jobs", subtitle: "CV/job matching history and market signals from real user analyses.", search: "Search by user, job, company…", avg: "Average score", skills: "Top skills", sectors: "Top sectors", colJob: "Job", colUser: "User", colScore: "Score", colSignals: "Signals", empty: "No analyzed job yet." }
    : { title: "Offres analysées", subtitle: "Historique des matchings CV/offres et signaux métier issus des vraies analyses.", search: "Rechercher par utilisateur, poste, entreprise…", avg: "Score moyen", skills: "Compétences demandées", sectors: "Secteurs fréquents", colJob: "Offre", colUser: "Utilisateur", colScore: "Score", colSignals: "Signaux", empty: "Aucune offre analysée." };
  const [data, setData] = useState({ items: [], topSkills: [], topSectors: [], averageScore: null });
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    setPage(1);
    setLoading(true);
    getAdminMatches(user.id, { search }).then(setData).catch((err) => setError(getFriendlyErrorMessage(err, language))).finally(() => setLoading(false));
  }, [user.id, search, language]);
  const totalPages = Math.max(1, Math.ceil(data.items.length / ADMIN_PAGE_SIZE));
  const pagedItems = data.items.slice((page - 1) * ADMIN_PAGE_SIZE, page * ADMIN_PAGE_SIZE);
  return (
    <section className="admin-matches admin-module-pro">
      <header className="module-header"><h2>{copy.title}</h2><p>{copy.subtitle}</p></header>
      <div className="admin-module-split">
        <div className="admin-signal-card"><AdminMiniMetric icon="chart" label={copy.avg} value={data.averageScore == null ? "—" : `${data.averageScore}/100`} /></div>
        <div className="admin-signal-card"><h3>{copy.skills}</h3><div className="admin-chip-cloud">{data.topSkills.map((item) => <span key={item.name}>{item.name}<strong>{item.count}</strong></span>)}</div></div>
        <div className="admin-signal-card"><h3>{copy.sectors}</h3><div className="admin-chip-cloud">{data.topSectors.map((item) => <span key={item.name}>{item.name}<strong>{item.count}</strong></span>)}</div></div>
      </div>
      <div className="admin-table-toolbar"><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={copy.search} /></div>
      {error ? <p className="field-error">{error}</p> : null}
      {loading ? <AdminPageLoader language={language} /> : null}
      {!loading ? (
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead><tr><th>{copy.colJob}</th><th>{copy.colUser}</th><th>{copy.colScore}</th><th>{copy.colSignals}</th></tr></thead>
          <tbody>
            {pagedItems.length ? pagedItems.map((item) => (
              <tr key={item.id}>
                <td><strong>{item.title || "—"}</strong><span className="muted admin-block-muted">{item.company || "—"} · {item.location || "—"} · {formatDate(item.createdAt)}</span></td>
                <td><div className="admin-table-name"><AvatarCircle user={{ firstName: item.userFirstName, lastName: item.userLastName, avatarDataUrl: item.userAvatarDataUrl }} /><div><strong>{item.userFirstName} {item.userLastName}</strong><span className="muted">{item.userEmail}</span></div></div></td>
                <td><span className={`tag ${Number(item.score) >= 75 ? "tag-success" : Number(item.score) < 50 ? "tag-danger" : ""}`}>{item.score == null ? "—" : `${item.score}/100`}</span></td>
                <td><div className="admin-chip-cloud compact">{[...item.technicalSkills.slice(0, 4), ...item.missingKeywords.slice(0, 3)].map((skill) => <span key={skill}>{skill}</span>)}</div></td>
              </tr>
            )) : <tr><td colSpan={4} className="admin-table-empty muted">{copy.empty}</td></tr>}
          </tbody>
        </table>
      </div>
      ) : null}
      <AdminPagination page={page} totalPages={totalPages} onChange={setPage} language={language} totalItems={data.items.length} />
    </section>
  );
}

function AdminQualityPage({ user, language }) {
  const copy = language === "en"
    ? { title: "Extraction quality", subtitle: "CVs that deserve manual review before they damage matching quality.", search: "Search suspicious CVs…", needs: "Needs review", partial: "Partial", colCv: "CV", colUser: "User", colIssues: "Issues", colScore: "Quality", empty: "No quality issue detected." }
    : { title: "Qualité extraction", subtitle: "CV à contrôler manuellement avant qu'ils dégradent la qualité du matching.", search: "Rechercher les CV suspects…", needs: "À revoir", partial: "Partiels", colCv: "CV", colUser: "Utilisateur", colIssues: "Points à corriger", colScore: "Qualité", empty: "Aucun problème qualité détecté." };
  const [data, setData] = useState({ items: [], totals: {} });
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    setPage(1);
    setLoading(true);
    getAdminQuality(user.id, { search }).then(setData).catch((err) => setError(getFriendlyErrorMessage(err, language))).finally(() => setLoading(false));
  }, [user.id, search, language]);
  const totalPages = Math.max(1, Math.ceil(data.items.length / ADMIN_PAGE_SIZE));
  const pagedItems = data.items.slice((page - 1) * ADMIN_PAGE_SIZE, page * ADMIN_PAGE_SIZE);
  return (
    <section className="admin-quality admin-module-pro">
      <header className="module-header"><h2>{copy.title}</h2><p>{copy.subtitle}</p></header>
      <div className="admin-module-metrics">
        <AdminMiniMetric icon="alert" label={copy.needs} value={data.totals?.needsReview || 0} tone="danger" />
        <AdminMiniMetric icon="shield" label={copy.partial} value={data.totals?.partial || 0} tone="warning" />
      </div>
      <div className="admin-table-toolbar"><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={copy.search} /></div>
      {error ? <p className="field-error">{error}</p> : null}
      {loading ? <AdminPageLoader language={language} /> : null}
      {!loading ? (
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead><tr><th>{copy.colCv}</th><th>{copy.colUser}</th><th>{copy.colIssues}</th><th>{copy.colScore}</th></tr></thead>
          <tbody>{pagedItems.length ? pagedItems.map((item) => (
            <tr key={item.id}>
              <td><strong>{item.fileName}</strong><span className="muted admin-block-muted">{formatDate(item.createdAt)}</span></td>
              <td><div className="admin-table-name"><AvatarCircle user={{ firstName: item.userFirstName, lastName: item.userLastName, avatarDataUrl: item.userAvatarDataUrl }} /><div><strong>{item.userFirstName} {item.userLastName}</strong><span className="muted">{item.userEmail}</span></div></div></td>
              <td><div className="admin-chip-cloud compact">{[...item.missing, ...item.suspicious].map((issue) => <span key={issue}>{issue}</span>)}</div></td>
              <td><span className={`tag ${item.score >= 75 ? "tag-success" : item.score < 55 ? "tag-danger" : ""}`}>{item.score}/100</span></td>
            </tr>
          )) : <tr><td colSpan={4} className="admin-table-empty muted">{copy.empty}</td></tr>}</tbody>
        </table>
      </div>
      ) : null}
      <AdminPagination page={page} totalPages={totalPages} onChange={setPage} language={language} totalItems={data.items.length} />
    </section>
  );
}

function AdminAiMonitoringPage({ user, language }) {
  const copy = language === "en"
    ? { title: "AI monitoring", subtitle: "Operational view of extraction and matching reliability.", success: "Successful extractions", failed: "Needs review", partial: "Partial", runs: "Match analyses", cost: "Estimated cost", avg: "Average score", invalid: "Invalid responses / weak extractions" }
    : { title: "Monitoring IA", subtitle: "Vue opérationnelle de la fiabilité extraction et matching.", success: "Extractions réussies", failed: "À revoir", partial: "Partielles", runs: "Analyses matching", cost: "Coût estimé", avg: "Score moyen", invalid: "Réponses invalides / extractions faibles" };
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => {
    getAdminAiMonitoring(user.id).then(setData).catch((err) => setError(getFriendlyErrorMessage(err, language)));
  }, [user.id, language]);
  if (error) return <p className="field-error">{error}</p>;
  if (!data) return <AdminPageLoader language={language} />;
  return (
    <section className="admin-ai-monitoring admin-module-pro">
      <header className="module-header"><h2>{copy.title}</h2><p>{copy.subtitle}</p></header>
      <div className="admin-module-metrics wide">
        <AdminMiniMetric icon="shield" label={copy.success} value={data.successfulExtractions} tone="success" />
        <AdminMiniMetric icon="alert" label={copy.partial} value={data.partialExtractions} tone="warning" />
        <AdminMiniMetric icon="alert" label={copy.failed} value={data.failedExtractions} tone="danger" />
        <AdminMiniMetric icon="chart" label={copy.runs} value={data.totalMatchRuns} />
        <AdminMiniMetric icon="scale" label={copy.cost} value={`${data.estimatedCost.amount} ${data.estimatedCost.currency}`} />
        <AdminMiniMetric icon="matchmark" label={copy.avg} value={data.averageMatchScore == null ? "—" : `${data.averageMatchScore}/100`} />
      </div>
      <div className="admin-signal-card">
        <h3>{copy.invalid}</h3>
        <div className="admin-quality-feed">
          {data.invalidResponses.length ? data.invalidResponses.map((item) => (
            <article key={item.id}>
              <span className="tag tag-danger">{item.score}/100</span>
              <div><strong>{item.id}</strong><small>{[...item.missing, ...item.suspicious].join(", ") || "—"}</small></div>
            </article>
          )) : <p className="muted">Aucune anomalie détectée.</p>}
        </div>
      </div>
    </section>
  );
}

function AdminFinancePage({ user, language, currency = "EUR", initialSearch }) {
  const copy =
    language === "en"
      ? {
          title: "Finance management",
          subtitle: "Every transaction recorded on the platform, with real vs. listed amounts.",
          revenueCollected: "Real revenue collected",
          listedValue: "Total listed value (all sources)",
          transactionCount: "Transactions",
          trend: "Real revenue collected — last 8 weeks",
          bySource: "Transactions by source",
          byPlan: "Revenue collected by plan",
          search: "Search by user, email or plan…",
          colDate: "Date",
          colUser: "User",
          colPlan: "Plan",
          colCycle: "Cycle",
          colListed: "Listed price",
          colCollected: "Amount collected",
          colSource: "Source",
          colActions: "Actions",
          empty: "No transaction found.",
          refund: "Refund",
          refunded: "Refunded",
          refunding: "Refunding…",
          confirmRefundTitle: "Refund this transaction?",
          confirmRefundText: "This immediately refunds the customer via Stripe. This cannot be undone.",
          confirmRefundBtn: "Refund",
          cancel: "Cancel",
          disclaimer:
            "\"Listed price\" is the plan's catalog price at the time of the transaction. \"Amount collected\" is only non-zero for real Stripe payments — instant/admin/license activations are free or already covered by a license seat, so no money changes hands for those."
        }
      : {
          title: "Gestion de finance",
          subtitle: "Toutes les transactions de la plateforme, avec distinction montant réel / prix catalogue.",
          revenueCollected: "Revenu réel encaissé",
          listedValue: "Valeur catalogue totale (toutes sources)",
          transactionCount: "Transactions",
          trend: "Revenu réel encaissé — 8 dernières semaines",
          bySource: "Transactions par source",
          byPlan: "Revenu encaissé par plan",
          search: "Rechercher par utilisateur, email ou plan…",
          colDate: "Date",
          colUser: "Utilisateur",
          colPlan: "Plan",
          colCycle: "Cycle",
          colListed: "Prix catalogue",
          colCollected: "Montant encaissé",
          colSource: "Source",
          colActions: "Actions",
          empty: "Aucune transaction trouvée.",
          refund: "Rembourser",
          refunded: "Remboursé",
          refunding: "Remboursement…",
          confirmRefundTitle: "Rembourser cette transaction ?",
          confirmRefundText: "Cela rembourse immédiatement le client via Stripe. Action irréversible.",
          confirmRefundBtn: "Rembourser",
          cancel: "Annuler",
          disclaimer:
            "Le \"prix catalogue\" est le tarif du plan au moment de la transaction. Le \"montant encaissé\" n'est non-nul que pour les vrais paiements Stripe — les activations instantanées/admin/licence sont gratuites ou déjà couvertes par un siège de licence, donc aucun argent ne change de main pour celles-ci."
        };

  const sourceLabels =
    language === "en"
      ? {
          stripe: "Stripe",
          instant: "Instant activation",
          license_redeem: "License code",
          admin_created: "Created by admin"
        }
      : {
          stripe: "Stripe",
          instant: "Activation instantanée",
          license_redeem: "Code de licence",
          admin_created: "Créé par l'admin"
        };

  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [search, setSearch] = useState(initialSearch || "");
  const [source, setSource] = useState("");
  const [page, setPage] = useState(1);
  const [refundingId, setRefundingId] = useState("");

  useEffect(() => {
    if (initialSearch) setSearch(initialSearch);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialSearch]);

  function load() {
    getAdminFinance(user.id, { search, source })
      .then(setData)
      .catch((err) => setError(getFriendlyErrorMessage(err, language)));
  }

  useEffect(() => {
    setPage(1);
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.id, search, source]);

  async function handleRefund(item) {
    const result = await Swal.fire({
      icon: "warning",
      title: copy.confirmRefundTitle,
      text: copy.confirmRefundText,
      showCancelButton: true,
      confirmButtonText: copy.confirmRefundBtn,
      cancelButtonText: copy.cancel,
      confirmButtonColor: "#b91c1c"
    });
    if (!result.isConfirmed) return;
    setRefundingId(item.id);
    try {
      await refundAdminTransaction({ adminUserId: user.id, transactionId: item.id });
      load();
      Swal.fire({
        toast: true,
        position: "top-end",
        icon: "success",
        title: language === "en" ? "Refunded." : "Remboursé.",
        showConfirmButton: false,
        timer: 2600,
        timerProgressBar: true,
        customClass: { popup: "career-toast", title: "career-toast-title" }
      });
    } catch (err) {
      Swal.fire({ icon: "error", title: getFriendlyErrorMessage(err, language) });
    } finally {
      setRefundingId("");
    }
  }

  if (error) return <p className="field-error">{error}</p>;
  if (!data) return <AdminPageLoader language={language} />;

  const totalPages = Math.max(1, Math.ceil(data.items.length / ADMIN_PAGE_SIZE));
  const pagedItems = data.items.slice((page - 1) * ADMIN_PAGE_SIZE, page * ADMIN_PAGE_SIZE);
  const planEntries = Object.entries(data.revenueByPlan || {}).filter(([, amount]) => amount > 0);
  const sourceEntries = Object.entries(data.countBySource || {});

  return (
    <section className="admin-finance">
      <header className="module-header admin-accounts-header">
        <div>
          <h2>{copy.title}</h2>
          <p>{copy.subtitle}</p>
        </div>
        <AdminExportCsvButton adminUserId={user.id} path="/admin/export/transactions" language={language} />
      </header>

      <div className="admin-kpi-grid">
        <AdminKpiCard
          tone="success"
          icon="scale"
          value={formatEur(data.totalRevenueCollected, currency)}
          label={copy.revenueCollected}
        />
        <AdminKpiCard
          tone="warning"
          icon="pricetag"
          value={formatEur(data.totalListedValue, currency)}
          label={copy.listedValue}
        />
        <AdminKpiCard tone="primary" icon="chart" value={data.totalTransactions} label={copy.transactionCount} />
      </div>

      <p className="admin-finance-disclaimer muted">{copy.disclaimer}</p>

      <div className="admin-panel admin-trend-panel">
        <h3>{copy.trend}</h3>
        <AdminTrendChart
          trend={data.revenueTrend}
          language={language}
          valueKey="amount"
          formatValue={(amount) => formatEur(amount, currency)}
        />
      </div>

      <div className="admin-panel-grid">
        <div className="admin-panel">
          <h3>{copy.bySource}</h3>
          <ul className="admin-stat-list">
            {sourceEntries.map(([sourceId, count]) => (
              <li key={sourceId}>
                <span>{sourceLabels[sourceId] || sourceId}</span>
                <strong>{count}</strong>
              </li>
            ))}
          </ul>
        </div>
        <div className="admin-panel">
          <h3>{copy.byPlan}</h3>
          <ul className="admin-stat-list">
            {planEntries.length ? (
              planEntries.map(([planId, amount]) => (
                <li key={planId}>
                  <span>{getPlanById(planId)?.name?.[language] || getPlanById(planId)?.name?.fr || planId}</span>
                  <strong>{formatEur(amount, currency)}</strong>
                </li>
              ))
            ) : (
              <li className="muted">{copy.empty}</li>
            )}
          </ul>
        </div>
      </div>

      <div className="admin-table-toolbar admin-finance-toolbar">
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={copy.search} />
      </div>
      <div className="admin-subtabs">
        {ADMIN_FINANCE_SOURCES.map((item) => (
          <button
            key={item.id || "all"}
            type="button"
            className={`admin-subtab ${source === item.id ? "active" : ""}`}
            onClick={() => setSource(item.id)}
          >
            {item.label[language] || item.label.fr}
          </button>
        ))}
      </div>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>{copy.colDate}</th>
              <th>{copy.colUser}</th>
              <th>{copy.colPlan}</th>
              <th>{copy.colCycle}</th>
              <th>{copy.colListed}</th>
              <th>{copy.colCollected}</th>
              <th>{copy.colSource}</th>
              <th>{copy.colActions}</th>
            </tr>
          </thead>
          <tbody>
            {pagedItems.length ? (
              pagedItems.map((item) => (
                <tr key={item.id}>
                  <td className="muted">{formatDate(item.createdAt)}</td>
                  <td>
                    <div className="admin-table-name">
                      <AvatarCircle
                        user={{ firstName: item.userFirstName, lastName: item.userLastName, avatarDataUrl: item.userAvatarDataUrl }}
                      />
                      <div>
                        <strong>
                          {item.userFirstName} {item.userLastName}
                        </strong>
                        <span className="muted">{item.userEmail}</span>
                      </div>
                    </div>
                  </td>
                  <td>{getPlanById(item.planId)?.name?.[language] || getPlanById(item.planId)?.name?.fr || item.planId}</td>
                  <td className="muted">{item.billingCycle}</td>
                  <td>{formatEur(item.listedAmount, currency)}</td>
                  <td>
                    <strong className={item.amountCollected > 0 ? "admin-finance-real" : "muted"}>
                      {formatEur(item.amountCollected, currency)}
                    </strong>
                  </td>
                  <td>
                    <span className="tag">{sourceLabels[item.source] || item.source}</span>
                  </td>
                  <td>
                    {item.refunded ? (
                      <span className="tag tag-danger">{copy.refunded}</span>
                    ) : item.refundable ? (
                      <button
                        type="button"
                        className="admin-row-action danger"
                        disabled={refundingId === item.id}
                        onClick={() => handleRefund(item)}
                      >
                        {refundingId === item.id ? copy.refunding : copy.refund}
                      </button>
                    ) : (
                      <span className="muted">—</span>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={8} className="admin-table-empty muted">
                  {copy.empty}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <AdminPagination page={page} totalPages={totalPages} onChange={setPage} language={language} totalItems={data.items.length} />
    </section>
  );
}

const ADMIN_EVENT_LABELS = {
  login_password: { fr: "Connexion (mot de passe)", en: "Login (password)" },
  login_google: { fr: "Connexion (Google)", en: "Login (Google)" },
  connected_account_linked: { fr: "Compte Google lié", en: "Google account linked" },
  connected_account_removed: { fr: "Compte Google délié", en: "Google account unlinked" },
  account_deleted: { fr: "Compte supprimé (par l'utilisateur)", en: "Account deleted (by user)" },
  admin_user_updated: { fr: "Compte modifié par l'admin", en: "Account edited by admin" },
  admin_user_deleted: { fr: "Compte supprimé par l'admin", en: "Account deleted by admin" },
  admin_user_suspended: { fr: "Compte suspendu par l'admin", en: "Account suspended by admin" },
  admin_user_reactivated: { fr: "Compte réactivé par l'admin", en: "Account reactivated by admin" },
  admin_cv_reanalyzed: { fr: "CV réanalysé par l'admin", en: "CV reanalyzed by admin" },
  admin_cv_deleted: { fr: "CV supprimé par l'admin", en: "CV deleted by admin" },
  admin_license_code_revoked: { fr: "Code de licence révoqué", en: "License code revoked" },
  admin_license_code_restored: { fr: "Code de licence restauré", en: "License code restored" },
  admin_setting_changed: { fr: "Paramètre plateforme modifié", en: "Platform setting changed" }
};

function eventTypeLabel(eventType, language) {
  return ADMIN_EVENT_LABELS[eventType]?.[language] || ADMIN_EVENT_LABELS[eventType]?.fr || eventType;
}

// Traduit chaque type de notification admin en texte affichable. Chaque type
// correspond à un événement réel détecté côté serveur (nouvelle inscription,
// paiement Stripe encaissé, licence épuisée, échec d'envoi d'annonce) — pas
// de contenu fabriqué.
function adminNotificationText(item, language) {
  const name = [item.data?.firstName, item.data?.lastName].filter(Boolean).join(" ") || "—";
  const planName = item.data?.planId ? getPlanById(item.data.planId)?.name?.[language] || getPlanById(item.data.planId)?.name?.fr || item.data.planId : "";
  switch (item.type) {
    case "new_signup":
      return {
        icon: "profile",
        title: language === "en" ? "New account" : "Nouveau compte",
        detail: `${name} — ${getAccountLabel(item.data?.roleType, language)}`
      };
    case "new_org":
      return {
        icon: "briefcase",
        title: language === "en" ? "New organization" : "Nouvelle organisation",
        detail: `${name} — ${getAccountLabel(item.data?.roleType, language)}`
      };
    case "new_payment":
      return {
        icon: "scale",
        title: language === "en" ? "Payment received" : "Paiement encaissé",
        detail: `${name} — ${formatEur(item.data?.amount, item.data?.currency || "EUR")}${planName ? ` (${planName})` : ""}`
      };
    case "license_full":
      return {
        icon: "shield",
        title: language === "en" ? "License fully used" : "Licence épuisée",
        detail: `${item.data?.code} — ${name} (${item.data?.seatsTotal} ${language === "en" ? "seats" : "sièges"})`
      };
    case "announcement_failed":
      return {
        icon: "alert",
        title: language === "en" ? "Announcement send failures" : "Échecs d'envoi d'annonce",
        detail: `${item.data?.subject} — ${item.data?.failedCount} ${language === "en" ? "failed" : "échec(s)"}`
      };
    default:
      return { icon: "alert", title: item.type, detail: "" };
  }
}

function AdminActivityLogPage({ user, language }) {
  const copy =
    language === "en"
      ? {
          title: "Activity log",
          subtitle: "Every security-relevant event recorded on the platform: logins, account changes, admin actions.",
          search: "Search by user, email, event or IP…",
          colDate: "Date",
          colUser: "Actor",
          colEvent: "Event",
          colDetails: "Details",
          colIp: "IP address",
          empty: "No event found.",
          allEvents: "All events"
        }
      : {
          title: "Journal d'activité",
          subtitle: "Tous les événements de sécurité enregistrés : connexions, modifications de compte, actions admin.",
          search: "Rechercher par utilisateur, email, événement ou IP…",
          colDate: "Date",
          colUser: "Acteur",
          colEvent: "Événement",
          colDetails: "Détails",
          colIp: "Adresse IP",
          empty: "Aucun événement trouvé.",
          allEvents: "Tous les événements"
        };

  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [eventType, setEventType] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
    getAdminActivityLog(user.id, { search, eventType })
      .then(setData)
      .catch((err) => setError(getFriendlyErrorMessage(err, language)));
  }, [user.id, search, eventType]);

  if (error) return <p className="field-error">{error}</p>;
  if (!data) return <AdminPageLoader language={language} />;

  const totalPages = Math.max(1, Math.ceil(data.items.length / ADMIN_PAGE_SIZE));
  const pagedItems = data.items.slice((page - 1) * ADMIN_PAGE_SIZE, page * ADMIN_PAGE_SIZE);
  const eventEntries = Object.entries(data.eventTypeCounts || {});

  return (
    <section className="admin-activity">
      <header className="module-header">
        <h2>{copy.title}</h2>
        <p>{copy.subtitle}</p>
      </header>

      <div className="admin-table-toolbar">
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={copy.search} />
      </div>

      <div className="admin-subtabs">
        <button type="button" className={`admin-subtab ${eventType === "" ? "active" : ""}`} onClick={() => setEventType("")}>
          <span>{copy.allEvents}</span>
          <strong>{data.items.length}</strong>
        </button>
        {eventEntries.map(([type, count]) => (
          <button
            key={type}
            type="button"
            className={`admin-subtab ${eventType === type ? "active" : ""}`}
            onClick={() => setEventType(type)}
          >
            <span>{eventTypeLabel(type, language)}</span>
            <strong>{count}</strong>
          </button>
        ))}
      </div>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>{copy.colDate}</th>
              <th>{copy.colUser}</th>
              <th>{copy.colEvent}</th>
              <th>{copy.colDetails}</th>
              <th>{copy.colIp}</th>
            </tr>
          </thead>
          <tbody>
            {pagedItems.length ? (
              pagedItems.map((item) => (
                <tr key={item.id}>
                  <td className="muted">{formatDate(item.createdAt)}</td>
                  <td>
                    <div className="admin-table-name">
                      <AvatarCircle
                        user={{ firstName: item.userFirstName, lastName: item.userLastName, avatarDataUrl: item.userAvatarDataUrl }}
                      />
                      <div>
                        <strong>
                          {item.userFirstName} {item.userLastName}
                        </strong>
                        <span className="muted">{item.userEmail}</span>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className="tag">{eventTypeLabel(item.eventType, language)}</span>
                  </td>
                  <td className="muted admin-activity-details">
                    {Object.keys(item.metadata || {}).length ? JSON.stringify(item.metadata) : "—"}
                  </td>
                  <td className="muted">{item.ipAddress || "—"}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="admin-table-empty muted">
                  {copy.empty}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <AdminPagination page={page} totalPages={totalPages} onChange={setPage} language={language} totalItems={data.items.length} />
    </section>
  );
}

function AdminSatisfactionPage({ user, language }) {
  const copy =
    language === "en"
      ? {
          title: "Satisfaction",
          subtitle: "CSAT survey results collected across the platform (1-10 scale).",
          average: "Average score",
          nps: "NPS",
          responses: "Total responses",
          promoters: "Promoters (9-10)",
          passives: "Passives (7-8)",
          detractors: "Detractors (1-6)",
          trendTitle: "Average score — last 8 weeks",
          recentTitle: "Recent responses",
          colUser: "User",
          colScore: "Score",
          colComment: "Comment",
          colDate: "Date",
          empty: "No response yet.",
          noComment: "—"
        }
      : {
          title: "Satisfaction",
          subtitle: "Résultats du sondage CSAT collectés sur la plateforme (échelle 1-10).",
          average: "Score moyen",
          nps: "NPS",
          responses: "Réponses totales",
          promoters: "Promoteurs (9-10)",
          passives: "Passifs (7-8)",
          detractors: "Détracteurs (1-6)",
          trendTitle: "Score moyen — 8 dernières semaines",
          recentTitle: "Réponses récentes",
          colUser: "Utilisateur",
          colScore: "Score",
          colComment: "Commentaire",
          colDate: "Date",
          empty: "Aucune réponse pour l'instant.",
          noComment: "—"
        };

  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    getAdminSatisfaction(user.id)
      .then(setData)
      .catch((err) => setError(getFriendlyErrorMessage(err, language)));
  }, [user.id, language]);

  if (error) return <p className="field-error">{error}</p>;
  if (!data) return <AdminPageLoader language={language} />;

  const trendForChart = data.trend.map((week) => ({ weekStart: week.weekStart, average: Math.round((week.average || 0) * 10) / 10 }));

  return (
    <section className="admin-satisfaction">
      <header className="module-header">
        <h2>{copy.title}</h2>
        <p>{copy.subtitle}</p>
      </header>

      <div className="admin-kpi-grid">
        <AdminKpiCard tone="primary" icon="chart" value={data.average != null ? data.average.toFixed(1) : "—"} label={copy.average} />
        <AdminKpiCard tone="success" icon="shield" value={data.nps != null ? data.nps : "—"} label={copy.nps} />
        <AdminKpiCard tone="primary" icon="profile" value={data.totalResponses} label={copy.responses} />
        <AdminKpiCard tone="success" icon="check" value={data.promoters} label={copy.promoters} />
        <AdminKpiCard tone="warning" icon="chat" value={data.passives} label={copy.passives} />
        <AdminKpiCard tone="danger" icon="alert" value={data.detractors} label={copy.detractors} />
      </div>

      <article className="card block admin-satisfaction-trend">
        <h3>{copy.trendTitle}</h3>
        <AdminTrendChart trend={trendForChart} language={language} valueKey="average" />
      </article>

      <article className="card block">
        <h3>{copy.recentTitle}</h3>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>{copy.colUser}</th>
                <th>{copy.colScore}</th>
                <th>{copy.colComment}</th>
                <th>{copy.colDate}</th>
              </tr>
            </thead>
            <tbody>
              {data.responses.length ? (
                data.responses.map((item) => (
                  <tr key={item.id}>
                    <td>{item.userName}</td>
                    <td>
                      <span className={`satisfaction-score-pill ${satisfactionTierFor(item.score).tone}`}>{item.score}</span>
                    </td>
                    <td>{item.comment || copy.noComment}</td>
                    <td>{formatDate(item.createdAt)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="admin-table-empty muted">
                    {copy.empty}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </article>
    </section>
  );
}

function AdminLicenseCodesPage({ user, language, initialSearch }) {
  const copy =
    language === "en"
      ? {
          title: "License codes",
          subtitle: "All license codes generated for agency and school seats.",
          search: "Search by code, owner or plan…",
          colCode: "Code",
          colOwner: "Owner",
          colPlan: "Plan",
          colSeats: "Seats",
          colStatus: "Status",
          colActions: "Actions",
          empty: "No license code found.",
          active: "Active",
          revoked: "Revoked",
          revoke: "Revoke",
          restore: "Restore",
          confirmRevokeTitle: "Revoke this license code?",
          confirmRevokeText: "It can no longer be redeemed by new members. Existing members keep their access.",
          confirmRevokeBtn: "Revoke",
          cancel: "Cancel"
        }
      : {
          title: "Codes de licence",
          subtitle: "Tous les codes de licence générés pour les sièges cabinet/école.",
          search: "Rechercher par code, propriétaire ou plan…",
          colCode: "Code",
          colOwner: "Propriétaire",
          colPlan: "Plan",
          colSeats: "Sièges",
          colStatus: "Statut",
          colActions: "Actions",
          empty: "Aucun code de licence trouvé.",
          active: "Actif",
          revoked: "Révoqué",
          revoke: "Révoquer",
          restore: "Restaurer",
          confirmRevokeTitle: "Révoquer ce code de licence ?",
          confirmRevokeText: "Il ne pourra plus être utilisé par de nouveaux membres. Les membres déjà inscrits gardent leur accès.",
          confirmRevokeBtn: "Révoquer",
          cancel: "Annuler"
        };

  const [items, setItems] = useState([]);
  const [error, setError] = useState("");
  const [search, setSearch] = useState(initialSearch || "");
  const [page, setPage] = useState(1);
  const [busyCode, setBusyCode] = useState("");

  useEffect(() => {
    if (initialSearch) setSearch(initialSearch);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialSearch]);

  function load() {
    getAdminLicenseCodes(user.id, { search })
      .then(setItems)
      .catch((err) => setError(getFriendlyErrorMessage(err, language)));
  }

  useEffect(() => {
    setPage(1);
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  async function handleRevoke(code) {
    const result = await Swal.fire({
      icon: "warning",
      title: copy.confirmRevokeTitle,
      text: copy.confirmRevokeText,
      showCancelButton: true,
      confirmButtonText: copy.confirmRevokeBtn,
      cancelButtonText: copy.cancel,
      confirmButtonColor: "#b91c1c"
    });
    if (!result.isConfirmed) return;
    setBusyCode(code);
    try {
      await revokeAdminLicenseCode(user.id, code);
      load();
    } catch (err) {
      Swal.fire({ icon: "error", title: getFriendlyErrorMessage(err, language) });
    } finally {
      setBusyCode("");
    }
  }

  async function handleRestore(code) {
    setBusyCode(code);
    try {
      await restoreAdminLicenseCode(user.id, code);
      load();
    } catch (err) {
      Swal.fire({ icon: "error", title: getFriendlyErrorMessage(err, language) });
    } finally {
      setBusyCode("");
    }
  }

  const totalPages = Math.max(1, Math.ceil(items.length / ADMIN_PAGE_SIZE));
  const pagedItems = items.slice((page - 1) * ADMIN_PAGE_SIZE, page * ADMIN_PAGE_SIZE);

  return (
    <section className="admin-licenses">
      <header className="module-header admin-accounts-header">
        <div>
          <h2>{copy.title}</h2>
          <p>{copy.subtitle}</p>
        </div>
        <AdminExportCsvButton adminUserId={user.id} path="/admin/export/license-codes" language={language} />
      </header>

      {error ? <p className="field-error">{error}</p> : null}

      <div className="admin-table-toolbar">
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={copy.search} />
      </div>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>{copy.colCode}</th>
              <th>{copy.colOwner}</th>
              <th>{copy.colPlan}</th>
              <th>{copy.colSeats}</th>
              <th>{copy.colStatus}</th>
              <th>{copy.colActions}</th>
            </tr>
          </thead>
          <tbody>
            {pagedItems.length ? (
              pagedItems.map((item) => (
                <tr key={item.code}>
                  <td>
                    <code className="admin-license-code">{item.code}</code>
                  </td>
                  <td>
                    <div className="admin-table-name">
                      <AvatarCircle
                        user={{ firstName: item.ownerFirstName, lastName: item.ownerLastName, avatarDataUrl: item.ownerAvatarDataUrl }}
                      />
                      <div>
                        <strong>
                          {item.ownerFirstName} {item.ownerLastName}
                        </strong>
                        <span className="muted">{item.ownerEmail}</span>
                      </div>
                    </div>
                  </td>
                  <td>{getPlanById(item.planId)?.name?.[language] || item.planId}</td>
                  <td className="muted">
                    {item.seatsUsed}/{item.seatsTotal}
                  </td>
                  <td>
                    <span className={`tag ${item.revoked ? "tag-danger" : "tag-success"}`}>
                      {item.revoked ? copy.revoked : copy.active}
                    </span>
                  </td>
                  <td>
                    {item.revoked ? (
                      <button
                        type="button"
                        className="admin-row-action"
                        disabled={busyCode === item.code}
                        onClick={() => handleRestore(item.code)}
                      >
                        {copy.restore}
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="admin-row-action danger"
                        disabled={busyCode === item.code}
                        onClick={() => handleRevoke(item.code)}
                      >
                        {copy.revoke}
                      </button>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="admin-table-empty muted">
                  {copy.empty}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <AdminPagination page={page} totalPages={totalPages} onChange={setPage} language={language} totalItems={items.length} />
    </section>
  );
}

function AdminAiSamplesPage({ user, language }) {
  const copy =
    language === "en"
      ? {
          title: "AI moderation",
          subtitle: "Sample of AI-generated match analyses, for quality and abuse review.",
          disclaimer:
            "Only CV/job match analyses are stored server-side and reviewable here. Generated cover letters live only in the user's browser and are never saved. Salary negotiation transcripts are now saved so users can resume them, but they remain private to each user's account and are not reviewable in this admin panel.",
          search: "Search by user, job title or company…",
          empty: "No analysis found.",
          score: "Score",
          strengths: "Strengths",
          missing: "Missing keywords",
          recommendation: "Recommendation",
          for: "for"
        }
      : {
          title: "Modération IA",
          subtitle: "Échantillon des analyses de matching générées par l'IA, pour contrôle qualité et détection d'abus.",
          disclaimer:
            "Seules les analyses de matching CV/offre sont enregistrées côté serveur et consultables ici. Les lettres de motivation générées ne vivent que dans le navigateur de l'utilisateur et ne sont jamais sauvegardées. Les transcripts de négociation salariale sont désormais sauvegardés pour permettre de les reprendre, mais restent privés au compte de chaque utilisateur et ne sont pas consultables dans ce panneau admin.",
          search: "Rechercher par utilisateur, poste ou entreprise…",
          empty: "Aucune analyse trouvée.",
          score: "Score",
          strengths: "Points forts",
          missing: "Mots-clés manquants",
          recommendation: "Recommandation",
          for: "pour"
        };

  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
    getAdminAiSamples(user.id, { search })
      .then(setData)
      .catch((err) => setError(getFriendlyErrorMessage(err, language)));
  }, [user.id, search]);

  if (error) return <p className="field-error">{error}</p>;
  if (!data) return <p className="muted">…</p>;

  const totalPages = Math.max(1, Math.ceil(data.items.length / ADMIN_PAGE_SIZE));
  const pagedItems = data.items.slice((page - 1) * ADMIN_PAGE_SIZE, page * ADMIN_PAGE_SIZE);

  return (
    <section className="admin-ai-samples">
      <header className="module-header">
        <h2>{copy.title}</h2>
        <p>{copy.subtitle}</p>
      </header>

      <p className="admin-finance-disclaimer muted">{copy.disclaimer}</p>

      <div className="admin-table-toolbar">
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={copy.search} />
      </div>

      <div className="admin-ai-sample-list">
        {pagedItems.length ? (
          pagedItems.map((item) => (
            <article key={item.id} className="admin-ai-sample-card">
              <div className="admin-ai-sample-head">
                <AvatarCircle
                  user={{ firstName: item.userFirstName, lastName: item.userLastName, avatarDataUrl: item.userAvatarDataUrl }}
                />
                <div>
                  <strong>
                    {item.userFirstName} {item.userLastName}
                  </strong>
                  <span className="muted">
                    {copy.for} {item.jobTitle}
                    {item.jobCompany ? ` · ${item.jobCompany}` : ""}
                  </span>
                </div>
                {item.score !== null ? (
                  <span className="admin-ai-sample-score">
                    {copy.score}: {item.score}/100
                  </span>
                ) : null}
                <span className="muted admin-ai-sample-date">{formatDate(item.createdAt)}</span>
              </div>

              {item.strengths.length ? (
                <p>
                  <strong>{copy.strengths} : </strong>
                  {item.strengths.join(", ")}
                </p>
              ) : null}
              {item.missingKeywords.length ? (
                <p>
                  <strong>{copy.missing} : </strong>
                  {item.missingKeywords.join(", ")}
                </p>
              ) : null}
              {item.recommendation ? (
                <p>
                  <strong>{copy.recommendation} : </strong>
                  {item.recommendation}
                </p>
              ) : null}
            </article>
          ))
        ) : (
          <p className="muted">{copy.empty}</p>
        )}
      </div>

      <AdminPagination page={page} totalPages={totalPages} onChange={setPage} language={language} totalItems={data.items.length} />
    </section>
  );
}

function AdminSettingsPage({ user, language }) {
  const copy =
    language === "en"
      ? {
          title: "Platform settings",
          subtitle: "Kill-switches for optional integrations — no .env change or restart needed.",
          google: "Google Sign-In",
          googleText: "Lets candidates sign in/up with their Google account.",
          stripe: "Stripe payments",
          stripeText: "Lets users pay for a plan with a real Stripe Checkout session.",
          enabled: "Enabled",
          disabled: "Disabled",
          notConfigured: "Not configured in .env — toggle has no effect",
          toggle: "Toggle"
        }
      : {
          title: "Paramètres plateforme",
          subtitle: "Interrupteurs pour les intégrations optionnelles — aucun changement de .env ni redémarrage nécessaire.",
          google: "Connexion Google",
          googleText: "Permet aux candidats de se connecter/inscrire avec leur compte Google.",
          stripe: "Paiement Stripe",
          stripeText: "Permet aux utilisateurs de payer un plan via une vraie session Stripe Checkout.",
          enabled: "Activé",
          disabled: "Désactivé",
          notConfigured: "Non configuré dans .env — le bouton n'a aucun effet",
          toggle: "Basculer"
        };

  const [settings, setSettings] = useState(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState("");

  useEffect(() => {
    getAdminSettings(user.id).then(setSettings).catch((err) => setError(getFriendlyErrorMessage(err, language)));
  }, [user.id]);

  async function toggle(key, currentValue) {
    setSaving(key);
    try {
      const updated = await updateAdminSetting(user.id, key, !currentValue);
      setSettings(updated);
    } catch (err) {
      setError(getFriendlyErrorMessage(err, language));
    } finally {
      setSaving("");
    }
  }

  if (error) return <p className="field-error">{error}</p>;
  if (!settings) return <p className="muted">…</p>;

  return (
    <section className="admin-settings">
      <header className="module-header">
        <h2>{copy.title}</h2>
        <p>{copy.subtitle}</p>
      </header>

      <div className="admin-panel-grid">
        <div className="admin-panel admin-settings-card">
          <div className="admin-settings-card-head">
            <h3>{copy.google}</h3>
            <span className={`tag ${settings.googleSignInEnabled ? "tag-success" : "tag-danger"}`}>
              {settings.googleSignInEnabled ? copy.enabled : copy.disabled}
            </span>
          </div>
          <p className="muted">{copy.googleText}</p>
          {!settings.googleConfigured ? <p className="admin-settings-warning">{copy.notConfigured}</p> : null}
          <button
            type="button"
            className="btn-ghost"
            disabled={saving === "google_signin_enabled"}
            onClick={() => toggle("google_signin_enabled", settings.googleSignInEnabled)}
          >
            {copy.toggle}
          </button>
        </div>

        <div className="admin-panel admin-settings-card">
          <div className="admin-settings-card-head">
            <h3>{copy.stripe}</h3>
            <span className={`tag ${settings.stripeEnabled ? "tag-success" : "tag-danger"}`}>
              {settings.stripeEnabled ? copy.enabled : copy.disabled}
            </span>
          </div>
          <p className="muted">{copy.stripeText}</p>
          {!settings.stripeConfigured ? <p className="admin-settings-warning">{copy.notConfigured}</p> : null}
          <button
            type="button"
            className="btn-ghost"
            disabled={saving === "stripe_enabled"}
            onClick={() => toggle("stripe_enabled", settings.stripeEnabled)}
          >
            {copy.toggle}
          </button>
        </div>
      </div>

    </section>
  );
}

const ADMIN_ANNOUNCEMENT_AUDIENCES = [
  { id: "", label: { fr: "Tous les utilisateurs", en: "All users" } },
  { id: "student", label: { fr: "Étudiants / Candidats", en: "Students / Candidates" } },
  { id: "school", label: { fr: "Écoles", en: "Schools" } },
  { id: "recruiter_firm", label: { fr: "Cabinets de recrutement", en: "Recruitment agencies" } }
];

function AdminAnnouncementsPage({ user, language }) {
  const copy =
    language === "en"
      ? {
          title: "Announcement emails",
          subtitle: "Send a real email to a segment of users via the configured SMTP server.",
          audience: "Audience",
          subject: "Subject",
          message: "Message",
          messagePlaceholder: "Write your announcement… (use a blank line to start a new paragraph)",
          recipients: "recipient(s)",
          send: "Send announcement",
          sending: "Sending…",
          confirmTitle: "Send this announcement?",
          confirmText: (count) => `This will email ${count} recipient(s) right now. This cannot be undone.`,
          confirmBtn: "Send",
          cancel: "Cancel",
          history: "Sent history",
          noHistory: "No announcement sent yet.",
          colDate: "Date",
          colSubject: "Subject",
          colAudience: "Audience",
          colRecipients: "Recipients",
          colFailed: "Failed",
          compose: "Compose",
          composeTitle: "Compose new message",
          folders: "Folders",
          inbox: "Audience",
          sent: "Sent",
          drafts: "Draft",
          failed: "Failed",
          labels: "Labels",
          important: "Important",
          platform: "Platform",
          schools: "Schools",
          to: "To:",
          subjectLine: "Subject:",
          normalText: "Normal text",
          attachment: "Attachment",
          attachmentHint: "Add a PDF, image or office document to this campaign.",
          attachFile: "Attach file",
          removeFile: "Remove file",
          draftSaved: "Draft saved.",
          linkPrompt: "Paste the link to insert",
          importantPrefix: "[Important]",
          platformPrefix: "[Platform]",
          schoolPrefix: "[Schools]"
        }
      : {
          title: "Emails d'annonce",
          subtitle: "Envoie un vrai email à un segment d'utilisateurs via le serveur SMTP configuré.",
          audience: "Audience",
          subject: "Objet",
          message: "Message",
          messagePlaceholder: "Rédigez votre annonce… (laissez une ligne vide pour un nouveau paragraphe)",
          recipients: "destinataire(s)",
          send: "Envoyer l'annonce",
          sending: "Envoi en cours…",
          confirmTitle: "Envoyer cette annonce ?",
          confirmText: (count) => `Cela enverra un email à ${count} destinataire(s) immédiatement. Action irréversible.`,
          confirmBtn: "Envoyer",
          cancel: "Annuler",
          history: "Historique des envois",
          noHistory: "Aucune annonce envoyée pour l'instant.",
          colDate: "Date",
          colSubject: "Objet",
          colAudience: "Audience",
          colRecipients: "Destinataires",
          colFailed: "Échecs",
          compose: "Composer",
          composeTitle: "Nouveau message",
          folders: "Dossiers",
          inbox: "Audience",
          sent: "Envoyés",
          drafts: "Brouillon",
          failed: "Échecs",
          labels: "Labels",
          important: "Important",
          platform: "Plateforme",
          schools: "Écoles",
          to: "À :",
          subjectLine: "Objet :",
          normalText: "Texte normal",
          attachment: "Pièce jointe",
          attachmentHint: "Ajoute un PDF, une image ou un document bureautique à cette campagne.",
          attachFile: "Joindre un fichier",
          removeFile: "Retirer le fichier",
          draftSaved: "Brouillon enregistré.",
          linkPrompt: "Colle le lien à insérer",
          importantPrefix: "[Important]",
          platformPrefix: "[Plateforme]",
          schoolPrefix: "[Écoles]"
        };

  const [audience, setAudience] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [audienceCount, setAudienceCount] = useState(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [history, setHistory] = useState([]);
  const [activeFolder, setActiveFolder] = useState("compose");
  const [activeLabel, setActiveLabel] = useState("");
  const [mailSearch, setMailSearch] = useState("");
  const [attachment, setAttachment] = useState(null);
  const messageRef = useRef(null);
  const attachmentInputRef = useRef(null);
  const failedTotal = history.reduce((total, item) => total + Number(item.failedCount || 0), 0);
  const folderHistory = activeFolder === "failed" ? history.filter((item) => Number(item.failedCount || 0) > 0) : history;
  const visibleHistory = folderHistory.filter((item) => {
    const term = mailSearch.trim().toLowerCase();
    if (!term) return true;
    const audienceLabel =
      ADMIN_ANNOUNCEMENT_AUDIENCES.find((a) => a.id === item.audience || (a.id === "" && item.audience === "all"))
        ?.label[language] || item.audience;
    return `${item.subject} ${audienceLabel}`.toLowerCase().includes(term);
  });
  const showMailbox = activeFolder === "sent" || activeFolder === "failed";

  function loadHistory() {
    getAdminAnnouncements(user.id)
      .then(setHistory)
      .catch((err) => setError(getFriendlyErrorMessage(err, language)));
  }

  useEffect(() => {
    loadHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    getAdminAnnouncementAudienceCount(user.id, audience)
      .then(setAudienceCount)
      .catch(() => setAudienceCount(null));
  }, [user.id, audience]);

  useEffect(() => {
    try {
      const draft = JSON.parse(localStorage.getItem("career_app_admin_announcement_draft") || "null");
      if (draft?.subject || draft?.message) {
        setSubject(draft.subject || "");
        setMessage(draft.message || "");
        setAudience(draft.audience || "");
        setAttachment(draft.attachmentMeta || null);
      }
    } catch (_error) {
      // ignore malformed draft
    }
  }, []);

  function focusMessage() {
    setTimeout(() => messageRef.current?.focus(), 0);
  }

  function handleFolderClick(folder) {
    setActiveFolder(folder);
    if (folder === "compose" || folder === "audience" || folder === "draft") {
      focusMessage();
    }
  }

  function getAudienceLabel(value) {
    return (
      ADMIN_ANNOUNCEMENT_AUDIENCES.find((a) => a.id === value || (a.id === "" && value === "all"))?.label[language] ||
      value ||
      ADMIN_ANNOUNCEMENT_AUDIENCES[0].label[language]
    );
  }

  function insertInMessage(before, after = "", fallback = "") {
    const textarea = messageRef.current;
    const start = textarea?.selectionStart ?? message.length;
    const end = textarea?.selectionEnd ?? message.length;
    const selected = message.slice(start, end) || fallback;
    const next = `${message.slice(0, start)}${before}${selected}${after}${message.slice(end)}`;
    setMessage(next);
    requestAnimationFrame(() => {
      messageRef.current?.focus();
      const cursorStart = start + before.length;
      const cursorEnd = cursorStart + selected.length;
      messageRef.current?.setSelectionRange(cursorStart, cursorEnd);
    });
  }

  function applyLabel(label) {
    setActiveLabel(label);
    const prefix = label === "important" ? copy.importantPrefix : label === "schools" ? copy.schoolPrefix : copy.platformPrefix;
    if (!subject.startsWith(prefix)) {
      setSubject((prev) => `${prefix} ${prev}`.trim());
    }
    if (label === "schools") setAudience("school");
    if (label === "platform") setAudience("");
    focusMessage();
  }

  async function insertLink() {
    const result = await Swal.fire({
      title: copy.linkPrompt,
      input: "url",
      inputPlaceholder: "https://",
      showCancelButton: true,
      confirmButtonText: "OK",
      cancelButtonText: copy.cancel,
      confirmButtonColor: "#5964e8"
    });
    if (result.isConfirmed && result.value) {
      insertInMessage("", "", result.value);
    }
  }

  function saveDraft() {
    localStorage.setItem(
      "career_app_admin_announcement_draft",
      JSON.stringify({
        subject,
        message,
        audience,
        attachmentMeta: attachment ? { name: attachment.name, size: attachment.size, type: attachment.type } : null,
        savedAt: new Date().toISOString()
      })
    );
    setActiveFolder("draft");
    Swal.fire({
      toast: true,
      position: "top-end",
      icon: "success",
      title: copy.draftSaved,
      showConfirmButton: false,
      timer: 2200,
      timerProgressBar: true,
      customClass: { popup: "career-toast", title: "career-toast-title" }
    });
  }

  async function handleAttachmentChange(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const content = await fileToBase64(file);
      setAttachment({ name: file.name, size: file.size, type: file.type || "application/octet-stream", content });
    } catch (_error) {
      setError(
        language === "en"
          ? "Unable to read this attachment. Try another file."
          : "Impossible de lire cette pièce jointe. Essaie un autre fichier."
      );
    } finally {
      event.target.value = "";
    }
  }

  async function handleSend(event) {
    event.preventDefault();
    setError("");

    const result = await Swal.fire({
      icon: "warning",
      title: copy.confirmTitle,
      text: copy.confirmText(audienceCount ?? "?"),
      showCancelButton: true,
      confirmButtonText: copy.confirmBtn,
      cancelButtonText: copy.cancel,
      confirmButtonColor: "#2f5bff"
    });
    if (!result.isConfirmed) return;

    setSending(true);
    try {
      const response = await sendAdminAnnouncement({ adminUserId: user.id, subject, message, audience, attachment });
      setSubject("");
      setMessage("");
      setAttachment(null);
      localStorage.removeItem("career_app_admin_announcement_draft");
      setActiveFolder("sent");
      loadHistory();
      Swal.fire({
        toast: true,
        position: "top-end",
        icon: "success",
        title:
          language === "en"
            ? `Sent to ${response.recipientCount} recipient(s)${response.failedCount ? `, ${response.failedCount} failed` : ""}.`
            : `Envoyé à ${response.recipientCount} destinataire(s)${response.failedCount ? `, ${response.failedCount} échec(s)` : ""}.`,
        showConfirmButton: false,
        timer: 3500,
        timerProgressBar: true,
        customClass: { popup: "career-toast", title: "career-toast-title" }
      });
    } catch (err) {
      setError(getFriendlyErrorMessage(err, language));
    } finally {
      setSending(false);
    }
  }

  return (
    <section className="admin-announcements">
      <header className="module-header">
        <h2>{copy.title}</h2>
        <p>{copy.subtitle}</p>
      </header>

      <div className="admin-mail-layout">
        <aside className="admin-mail-sidebar">
          <button type="button" className="admin-mail-compose-btn" onClick={() => handleFolderClick("compose")}>
            <UiIcon name="mail" /> {copy.compose}
          </button>

          <div className="admin-mail-card">
            <div className="admin-mail-card-title">
              <span>{copy.folders}</span>
              <strong>-</strong>
            </div>
            <button
              type="button"
              className={`admin-mail-folder ${activeFolder === "audience" || activeFolder === "compose" ? "active" : ""}`}
              onClick={() => handleFolderClick("audience")}
            >
              <UiIcon name="profile" />
              <span>{copy.inbox}</span>
              <strong>{audienceCount ?? "…"}</strong>
            </button>
            <button
              type="button"
              className={`admin-mail-folder ${activeFolder === "sent" ? "active" : ""}`}
              onClick={() => handleFolderClick("sent")}
            >
              <UiIcon name="mail" />
              <span>{copy.sent}</span>
              <strong>{history.length}</strong>
            </button>
            <button
              type="button"
              className={`admin-mail-folder ${activeFolder === "draft" ? "active" : ""}`}
              onClick={() => handleFolderClick("draft")}
            >
              <UiIcon name="docModern" />
              <span>{copy.drafts}</span>
              <strong>{subject || message ? 1 : 0}</strong>
            </button>
            <button
              type="button"
              className={`admin-mail-folder ${activeFolder === "failed" ? "active" : ""}`}
              onClick={() => handleFolderClick("failed")}
            >
              <UiIcon name="alert" />
              <span>{copy.failed}</span>
              <strong>{failedTotal}</strong>
            </button>
          </div>

          <div className="admin-mail-card">
            <div className="admin-mail-card-title">
              <span>{copy.labels}</span>
              <strong>-</strong>
            </div>
            <button
              type="button"
              className={`admin-mail-label important ${activeLabel === "important" ? "active" : ""}`}
              onClick={() => applyLabel("important")}
            >
              {copy.important}
            </button>
            <button
              type="button"
              className={`admin-mail-label platform ${activeLabel === "platform" ? "active" : ""}`}
              onClick={() => applyLabel("platform")}
            >
              {copy.platform}
            </button>
            <button
              type="button"
              className={`admin-mail-label schools ${activeLabel === "schools" ? "active" : ""}`}
              onClick={() => applyLabel("schools")}
            >
              {copy.schools}
            </button>
          </div>
        </aside>

        <div className="admin-mail-main">
          {showMailbox ? (
            <div className="admin-mail-inbox">
              <div className="admin-mail-inbox-toolbar">
                <div className="admin-mail-inbox-actions">
                  <button type="button" title={language === "en" ? "Select" : "Sélectionner"}>
                    ?
                  </button>
                  <button type="button" title={language === "en" ? "Refresh" : "Actualiser"} onClick={loadHistory}>
                    <UiIcon name="history" />
                  </button>
                  <button type="button" title={language === "en" ? "More" : "Plus"}>
                    ?
                  </button>
                </div>
                <input
                  value={mailSearch}
                  onChange={(event) => setMailSearch(event.target.value)}
                  placeholder={language === "en" ? "Search sent announcements" : "Rechercher dans les annonces envoyées"}
                />
                <span className="admin-mail-range">
                  {visibleHistory.length ? `1-${visibleHistory.length}` : "0"} / {folderHistory.length}
                </span>
              </div>

              <div className="admin-mail-tabs">
                <button type="button" className="active">
                  <UiIcon name="mail" />
                  {language === "en" ? "Primary" : "Principal"}
                </button>
                <button type="button">
                  <UiIcon name="pricetag" />
                  {copy.platform}
                </button>
                <button type="button">
                  <UiIcon name="profile" />
                  {copy.schools}
                </button>
              </div>

              <div className="admin-mail-list">
                {visibleHistory.length ? (
                  visibleHistory.map((item) => (
                    <button type="button" key={item.id} className="admin-mail-row">
                      <span className="admin-mail-check">?</span>
                      <span className="admin-mail-star">?</span>
                      <strong>{getAudienceLabel(item.audience)}</strong>
                      <span className="admin-mail-row-subject">{item.subject}</span>
                      <span className={item.failedCount ? "admin-mail-row-failed" : "admin-mail-row-count"}>
                        {item.failedCount ? `${item.failedCount} ${copy.failed}` : `${item.recipientCount} ${copy.recipients}`}
                      </span>
                      <time>{formatDate(item.createdAt)}</time>
                    </button>
                  ))
                ) : (
                  <div className="admin-mail-empty">
                    {activeFolder === "failed"
                      ? language === "en"
                        ? "No failed send."
                        : "Aucun échec d'envoi."
                      : copy.noHistory}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <form className="admin-create-form admin-announcement-form admin-mail-compose" onSubmit={handleSend}>
            <div className="admin-mail-compose-head">
              <h3>{copy.composeTitle}</h3>
              {audienceCount !== null ? (
                <span className="admin-mail-recipient-badge">
                  {audienceCount} {copy.recipients}
                </span>
              ) : null}
            </div>

            <label className="admin-mail-line">
              <span>{copy.to}</span>
              <select value={audience} onChange={(event) => setAudience(event.target.value)}>
                {ADMIN_ANNOUNCEMENT_AUDIENCES.map((item) => (
                  <option key={item.id || "all"} value={item.id}>
                    {item.label[language] || item.label.fr}
                  </option>
                ))}
              </select>
            </label>

            <label className="admin-mail-line">
              <span>{copy.subjectLine}</span>
              <input value={subject} onChange={(event) => setSubject(event.target.value)} required />
            </label>

            <div className="admin-mail-editor-toolbar" aria-label={language === "en" ? "Formatting toolbar" : "Barre de mise en forme"}>
              <button type="button" className="admin-mail-format-select" onClick={() => insertInMessage("\n\n", "", language === "en" ? "New paragraph" : "Nouveau paragraphe")}>
                A {copy.normalText} ?
              </button>
              <button type="button" onClick={() => insertInMessage("**", "**", language === "en" ? "bold text" : "texte en gras")}>
                <strong>B</strong>
              </button>
              <button type="button" onClick={() => insertInMessage("_", "_", language === "en" ? "italic text" : "texte italique")}>
                <em>I</em>
              </button>
              <button type="button" onClick={() => insertInMessage("\n\n> ", "", language === "en" ? "Quote" : "Citation")}>
                “
              </button>
              <button type="button" onClick={() => insertInMessage("\n- ", "", language === "en" ? "List item" : "Élément de liste")}>
                ?
              </button>
              <button type="button" onClick={() => insertInMessage("\n1. ", "", language === "en" ? "First item" : "Premier élément")}>
                =
              </button>
              <button type="button" onClick={insertLink}>
                ?
              </button>
            </div>

            <textarea
              ref={messageRef}
              className="admin-mail-message"
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder={copy.messagePlaceholder}
              rows={12}
              required
            />

            <div className="admin-mail-attachment">
              <UiIcon name="upload" />
              <div>
                <strong>{copy.attachment}</strong>
                <span>
                  {attachment?.name
                    ? `${attachment.name} · ${Math.max(1, Math.round((attachment.size || 0) / 1024))} Ko`
                    : copy.attachmentHint}
                </span>
              </div>
              <input
                ref={attachmentInputRef}
                type="file"
                accept=".pdf,.doc,.docx,.txt,.csv,.xlsx,.png,.jpg,.jpeg,.webp"
                onChange={handleAttachmentChange}
              />
              <div className="admin-mail-attachment-actions">
                <button type="button" className="btn-ghost" onClick={() => attachmentInputRef.current?.click()} disabled={sending}>
                  <UiIcon name="upload" /> {copy.attachFile}
                </button>
                {attachment ? (
                  <button type="button" className="btn-ghost danger" onClick={() => setAttachment(null)} disabled={sending}>
                    {copy.removeFile}
                  </button>
                ) : null}
              </div>
            </div>

            {error ? <p className="field-error">{error}</p> : null}

            <div className="admin-mail-actions">
              <button type="button" className="btn-ghost" onClick={saveDraft} disabled={(!message && !subject) || sending}>
                <UiIcon name="docModern" /> {copy.drafts}
              </button>
              <button type="submit" className="btn-main ready" disabled={sending || !audienceCount}>
                {sending ? <span className="btn-spinner" /> : <UiIcon name="mail" />} {sending ? copy.sending : copy.send}
              </button>
            </div>
            </form>
          )}

        </div>
      </div>
    </section>
  );
}

const SATISFACTION_TIERS = [
  { max: 2, emoji: "😡", tone: "tier-1" },
  { max: 4, emoji: "🙁", tone: "tier-2" },
  { max: 6, emoji: "😐", tone: "tier-3" },
  { max: 8, emoji: "🙂", tone: "tier-4" },
  { max: 10, emoji: "😍", tone: "tier-5" }
];

function satisfactionTierFor(score) {
  return SATISFACTION_TIERS.find((tier) => score <= tier.max) || SATISFACTION_TIERS[SATISFACTION_TIERS.length - 1];
}

function SatisfactionSurveyModal({ userId, language, onClose }) {
  const copy = APP_COPY[language]?.satisfaction || APP_COPY.fr.satisfaction;
  const [score, setScore] = useState(null);
  const [hovered, setHovered] = useState(null);
  const [comment, setComment] = useState("");
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");

  const displayScore = hovered ?? score;
  const tier = displayScore ? satisfactionTierFor(displayScore) : null;
  const tierLabel = displayScore ? copy.tierLabels[SATISFACTION_TIERS.findIndex((t) => t.max >= displayScore)] : "";

  async function handleDismiss() {
    onClose();
    try {
      await dismissSatisfactionSurvey(userId);
    } catch (_error) {
      // Non bloquant : au pire, l'utilisateur sera resollicité un peu plus tôt.
    }
  }

  async function handleSubmit() {
    if (!score || status === "saving") return;
    setStatus("saving");
    setError("");
    try {
      await submitSatisfactionSurvey({ userId, score, comment: comment.trim() });
      setStatus("done");
      setTimeout(onClose, 2200);
    } catch (err) {
      setStatus("idle");
      setError(copy.error);
    }
  }

  return (
    <div className="satisfaction-overlay">
      <div className={`satisfaction-card ${tier ? tier.tone : ""}`}>
        <button type="button" className="satisfaction-close" onClick={handleDismiss} aria-label={copy.later}>
          ×
        </button>

        {status === "done" ? (
          <div className="satisfaction-thanks">
            <span className="satisfaction-thanks-emoji">🎉</span>
            <h3>{copy.thanksTitle}</h3>
            <p>{copy.thanksText}</p>
          </div>
        ) : (
          <>
            <span className="satisfaction-eyebrow">{copy.eyebrow}</span>
            <h3>{copy.title}</h3>
            <p className="satisfaction-text">{copy.question}</p>

            <div className="satisfaction-emoji-stage">
              <span className="satisfaction-big-emoji">{tier ? tier.emoji : "🤔"}</span>
              <span className="satisfaction-tier-label">{tierLabel || " "}</span>
            </div>

            <div className="satisfaction-scale">
              {Array.from({ length: 10 }, (_, index) => index + 1).map((value) => (
                <button
                  key={value}
                  type="button"
                  className={`satisfaction-score-btn ${satisfactionTierFor(value).tone} ${score === value ? "selected" : ""}`}
                  onMouseEnter={() => setHovered(value)}
                  onMouseLeave={() => setHovered(null)}
                  onClick={() => setScore(value)}
                >
                  {value}
                </button>
              ))}
            </div>

            {score ? (
              <div className="satisfaction-comment">
                <label>{copy.commentLabel}</label>
                <textarea
                  rows={2}
                  value={comment}
                  onChange={(event) => setComment(event.target.value)}
                  placeholder={copy.commentPlaceholder}
                />
              </div>
            ) : null}

            {error ? <p className="field-error">{error}</p> : null}

            <div className="satisfaction-actions">
              <button type="button" className="satisfaction-later-btn" onClick={handleDismiss}>
                {copy.later}
              </button>
              <button type="button" className="btn-main ready" disabled={!score || status === "saving"} onClick={handleSubmit}>
                {status === "saving" ? copy.submitting : copy.submit}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function RoleQuizModal({ language, onComplete }) {
  const copy = APP_COPY[language]?.roleQuiz || APP_COPY.fr.roleQuiz;
  const [step, setStep] = useState(1);
  const [role, setRole] = useState("");
  const [sector, setSector] = useState("");
  const [roleOther, setRoleOther] = useState("");
  const [sectorOther, setSectorOther] = useState("");

  const otherLabel = language === "en" ? "Other" : "Autre";
  const isRoleOther = role === otherLabel;
  const isSectorOther = sector === otherLabel;
  const MIN_OTHER_LENGTH = 3;
  const roleOtherTooShort = isRoleOther && roleOther.trim().length > 0 && roleOther.trim().length < MIN_OTHER_LENGTH;
  const sectorOtherTooShort = isSectorOther && sectorOther.trim().length > 0 && sectorOther.trim().length < MIN_OTHER_LENGTH;

  function handleRoleContinue() {
    if (!role) return;
    if (isRoleOther && roleOther.trim().length < MIN_OTHER_LENGTH) return;
    setStep(2);
  }

  function handleFinish(sectorValue, sectorOtherValue) {
    const finalRole = isRoleOther ? roleOther.trim() : role;
    const finalSector = sectorValue === otherLabel ? sectorOtherValue.trim() : sectorValue || "";
    onComplete(finalRole, finalSector);
  }

  return (
    <div className="modal-overlay">
      <div className="role-quiz-modal">
        <button type="button" className="modal-close" onClick={() => onComplete("", "")} aria-label="Close">
          ×
        </button>
        <div className="role-quiz-icon">
          <UiIcon name="briefcase" />
        </div>
        <h2>{step === 1 ? copy.step1Title : copy.step2Title}</h2>
        <p className="muted">{step === 1 ? copy.step1Text : copy.step2Text}</p>

        <div className="role-quiz-progress">
          <div className="role-quiz-progress-bar" style={{ width: step === 1 ? "50%" : "100%" }} />
        </div>

        {step === 1 ? (
          <>
            <div className="role-quiz-grid">
              {copy.roles.map((item) => (
                <button
                  key={item}
                  type="button"
                  className={`role-quiz-option ${role === item ? "active" : ""}`}
                  onClick={() => setRole(item)}
                >
                  {item}
                </button>
              ))}
            </div>
            {isRoleOther ? (
              <>
                <input
                  className={`role-quiz-other-input ${roleOtherTooShort ? "invalid" : ""}`}
                  value={roleOther}
                  onChange={(event) => setRoleOther(event.target.value)}
                  placeholder={language === "en" ? "Tell us your target role..." : "Précisez le poste que vous visez..."}
                  minLength={MIN_OTHER_LENGTH}
                  autoFocus
                />
                {roleOtherTooShort ? (
                  <p className="field-hint error">
                    {language === "en"
                      ? `At least ${MIN_OTHER_LENGTH} characters required.`
                      : `${MIN_OTHER_LENGTH} caractères minimum requis.`}
                  </p>
                ) : null}
              </>
            ) : null}
            <button
              type="button"
              className="btn-main ready role-quiz-submit"
              disabled={!role || (isRoleOther && roleOther.trim().length < MIN_OTHER_LENGTH)}
              onClick={handleRoleContinue}
            >
              {copy.continue} <UiIcon name="chevron" className="btn-chevron" />
            </button>
          </>
        ) : (
          <>
            <div className="role-quiz-grid">
              {copy.sectors.map((item) => (
                <button
                  key={item}
                  type="button"
                  className={`role-quiz-option ${sector === item ? "active" : ""}`}
                  onClick={() => setSector(item)}
                >
                  {item}
                </button>
              ))}
            </div>
            {isSectorOther ? (
              <>
                <input
                  className={`role-quiz-other-input ${sectorOtherTooShort ? "invalid" : ""}`}
                  value={sectorOther}
                  onChange={(event) => setSectorOther(event.target.value)}
                  placeholder={language === "en" ? "Tell us your industry..." : "Précisez votre secteur..."}
                  minLength={MIN_OTHER_LENGTH}
                  autoFocus
                />
                {sectorOtherTooShort ? (
                  <p className="field-hint error">
                    {language === "en"
                      ? `At least ${MIN_OTHER_LENGTH} characters required.`
                      : `${MIN_OTHER_LENGTH} caractères minimum requis.`}
                  </p>
                ) : null}
              </>
            ) : null}
            <button
              type="button"
              className="btn-main ready role-quiz-submit"
              disabled={isSectorOther && sectorOther.trim().length < MIN_OTHER_LENGTH}
              onClick={() => handleFinish(sector, sectorOther)}
            >
              {copy.start} <UiIcon name="chevron" className="btn-chevron" />
            </button>
            <button type="button" className="role-quiz-skip" onClick={() => handleFinish("", "")}>
              {copy.skip}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function AccountDrawer({
  user,
  language,
  setLanguage,
  currency,
  setCurrency,
  theme,
  setTheme,
  mode,
  setMode,
  density,
  setDensity,
  activePanel,
  setActivePanel,
  onClose,
  onSaveAccount,
  onAvatarUpload,
  avatarUploading,
  onRequestSecondaryEmail,
  onVerifySecondaryEmail,
  onSetPrimaryEmail,
  onRemoveEmail,
  onRemoveConnectedAccount,
  onLinkGoogleAccount,
  securityForm,
  setSecurityForm,
  securitySaving,
  onSubmitPassword,
  onDeleteAccount
}) {
  const [profileForm, setProfileForm] = useState({
    firstName: user.firstName || "",
    lastName: user.lastName || "",
    username: user.username || ""
  });
  const [emailForm, setEmailForm] = useState("");
  const [pendingEmail, setPendingEmail] = useState("");
  const [emailCode, setEmailCode] = useState("");
  const [emailSaving, setEmailSaving] = useState(false);
  const [localError, setLocalError] = useState("");
  const [profileAvatarPreview, setProfileAvatarPreview] = useState(() => getAvatarSource(user));
  const [profileAvatarFile, setProfileAvatarFile] = useState(null);
  const [editingProfile, setEditingProfile] = useState(false);
  const [editingUsername, setEditingUsername] = useState(false);
  const [addingEmail, setAddingEmail] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleteSaving, setDeleteSaving] = useState(false);
  const [connectedMenuOpen, setConnectedMenuOpen] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const emails = user.emailAddresses?.length
    ? user.emailAddresses
    : [{ id: "primary", email: user.email, isPrimary: true, isVerified: true }];

  useEffect(() => {
    setProfileForm({
      firstName: user.firstName || "",
      lastName: user.lastName || "",
      username: user.username || ""
    });
    setProfileAvatarPreview(getAvatarSource(user));
    setProfileAvatarFile(null);
  }, [user]);

  async function submitProfile(event) {
    event.preventDefault();
    setLocalError("");
    if (editingUsername) {
      const usernameError = getUsernameValidation(profileForm.username, language);
      if (usernameError) {
        setLocalError(usernameError);
        return;
      }
    }
    setSavingProfile(true);
    try {
      if (profileAvatarFile) {
        await onAvatarUpload(profileAvatarFile);
        setProfileAvatarFile(null);
      } else if (profileAvatarPreview === "") {
        await onAvatarUpload(null);
      }
      await onSaveAccount({
        firstName: profileForm.firstName,
        lastName: profileForm.lastName,
        username: profileForm.username
      });
      setEditingProfile(false);
      setEditingUsername(false);
    } finally {
      setSavingProfile(false);
    }
  }

  async function chooseProfileImage(file) {
    setLocalError("");
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setLocalError(language === "en" ? "Select a valid image." : "Sélectionne une image valide.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setLocalError(language === "en" ? "Image too large. Maximum 10 MB." : "Image trop lourde. Maximum 10 Mo.");
      return;
    }
    setProfileAvatarFile(file);
    setProfileAvatarPreview(await resizeImageFileToDataUrl(file));
  }

  async function requestEmail(event) {
    event.preventDefault();
    setLocalError("");
    try {
      setEmailSaving(true);
      await onRequestSecondaryEmail(emailForm);
      setPendingEmail(emailForm.trim());
      setEmailCode("");
    } catch (error) {
      setLocalError(getFriendlyErrorMessage(error, language));
    } finally {
      setEmailSaving(false);
    }
  }

  async function verifyEmail(event) {
    event.preventDefault();
    setLocalError("");
    try {
      setEmailSaving(true);
      await onVerifySecondaryEmail(pendingEmail, emailCode);
      setEmailForm("");
      setPendingEmail("");
      setEmailCode("");
      setAddingEmail(false);
    } catch (error) {
      setLocalError(getFriendlyErrorMessage(error, language));
    } finally {
      setEmailSaving(false);
    }
  }

  async function submitDeleteAccount(event) {
    event.preventDefault();
    setLocalError("");
    try {
      setDeleteSaving(true);
      await onDeleteAccount(deleteConfirm);
    } catch (error) {
      setLocalError(getFriendlyErrorMessage(error, language));
    } finally {
      setDeleteSaving(false);
    }
  }

  const copy =
    language === "en"
      ? {
          title: "Profile",
          subtitle: "Manage your account.",
          account: "Account",
          security: "Security",
          profile: "Profile",
          updateProfile: "Update profile",
          username: "Username",
          changeUsername: "Change username",
          emails: "Email addresses",
          primary: "Primary",
          verified: "Verified",
          pending: "Pending",
          addEmail: "Add an email address",
          addText: "Verify this email before it can be added to your account.",
          email: "Email address",
          sendCode: "Send code",
          code: "Verification code",
          verify: "Verify and add",
          connected: "Connected accounts",
          removeConnected: "Remove",
          connectedRemoveTitle: "Google sign-in",
          connectedRemoveText: "This unlinks your Google account. You won't be able to sign in with it anymore, but password and email-code login remain available.",
          schoolSection: "School",
          schoolType: "Type",
          schoolWebsite: "Website",
          schoolLocation: "Location",
          schoolEmailDomain: "Email domain",
          schoolContactPerson: "Primary contact",
          schoolContact: "Contact email",
          schoolPhone: "Phone",
          preferences: "Preferences",
          language: "Language",
          currency: "Currency",
          currencyHint: "Prices shown across the app (plans, pricing) are converted to your chosen currency using a fixed indicative rate.",
          theme: "Color theme",
          themeHint: "Changes the accent color used across buttons, links and highlights throughout the app.",
          mode: "Appearance",
          modeLight: "Light",
          modeDark: "Dark",
          density: "Density",
          densityComfortable: "Comfortable",
          densityCompact: "Compact",
          password: "Password",
          setPassword: "Set password",
          updatePassword: "Update password",
          currentPassword: "Current password",
          newPassword: "New password",
          confirmPassword: "Confirm password",
          passwordTooShort: "Your password must contain 8 characters or more.",
          logoutOthers: "Log out of all other devices",
          logoutOthersText: "Recommended if another device may have used your previous password.",
          activeDevices: "Active devices",
          danger: "Danger",
          deleteTitle: "Delete account",
          deleteLead: "Are you sure you want to delete your account? Some associated data may be retained. For complete data deletion, contact support.",
          deleteWarning: "This action is final and irreversible.",
          deletePrompt: 'Type "Supprimer le compte" below to continue.',
          deletePlaceholder: "Supprimer le compte",
          deleteButton: "Delete account",
          cancel: "Cancel",
          save: "Save",
          makePrimary: "Make primary",
          remove: "Remove",
          usernameHint: "3 to 30 characters: letters, numbers, - or _.",
          secured: "Secured by Career App"
        }
      : {
          title: "Profil",
          subtitle: "Gérer votre compte.",
          account: "Compte",
          security: "Sécurité",
          profile: "Profil",
          updateProfile: "Mettre à jour le profil",
          username: "Nom d'utilisateur",
          changeUsername: "Changer le nom d'utilisateur",
          emails: "Adresses e-mail",
          primary: "Principal",
          verified: "Vérifiée",
          pending: "En attente",
          addEmail: "Ajouter une adresse e-mail",
          addText: "Vous devrez vérifier cette adresse e-mail avant qu'elle puisse être ajoutée à votre compte.",
          email: "Adresse e-mail",
          sendCode: "Envoyer le code",
          code: "Code de vérification",
          verify: "Vérifier et ajouter",
          connected: "Comptes connectés",
          removeConnected: "Retirer",
          connectedRemoveTitle: "Connexion Google",
          connectedRemoveText: "Cela délie votre compte Google. Vous ne pourrez plus l'utiliser pour vous connecter, mais la connexion par mot de passe et code e-mail reste disponible.",
          schoolSection: "École",
          schoolType: "Type",
          schoolWebsite: "Site web",
          schoolLocation: "Localisation",
          schoolEmailDomain: "Domaine email",
          schoolContactPerson: "Contact principal",
          schoolContact: "Email de contact",
          schoolPhone: "Téléphone",
          preferences: "Préférences",
          language: "Langue",
          currency: "Devise",
          currencyHint: "Les prix affichés dans l'app (offres, tarifs) sont convertis dans votre devise avec un taux indicatif fixe.",
          theme: "Thème de couleur",
          themeHint: "Changez la couleur d'accent utilisée pour les boutons, liens et éléments mis en avant dans toute l'app.",
          mode: "Apparence",
          modeLight: "Clair",
          modeDark: "Sombre",
          density: "Densité",
          densityComfortable: "Confortable",
          densityCompact: "Compact",
          password: "Mot de passe",
          setPassword: "Définir le mot de passe",
          updatePassword: "Mettre à jour le mot de passe",
          currentPassword: "Mot de passe actuel",
          newPassword: "Nouveau mot de passe",
          confirmPassword: "Confirmer le mot de passe",
          passwordTooShort: "Votre mot de passe doit contenir 8 caractères ou plus.",
          logoutOthers: "Se déconnecter de tous les autres appareils",
          logoutOthersText: "Il est recommandé de se déconnecter de tous les autres appareils qui pourraient avoir utilisé votre ancien mot de passe.",
          activeDevices: "Appareils actifs",
          danger: "Danger",
          deleteTitle: "Supprimer le compte",
          deleteLead: "Êtes-vous sûr de vouloir supprimer votre compte ? Certaines données associées peuvent être conservées. Pour demander la suppression complète des données, veuillez contacter l'assistance.",
          deleteWarning: "Cette action est définitive et irréversible.",
          deletePrompt: 'Saisissez "Supprimer le compte" ci-dessous pour continuer.',
          deletePlaceholder: "Supprimer le compte",
          deleteButton: "Supprimer le compte",
          cancel: "Annuler",
          save: "Enregistrer",
          makePrimary: "Définir principale",
          remove: "Supprimer",
          usernameHint: "3 à 30 caractères : lettres, chiffres, - ou _.",
          secured: "Sécurisé par Career App"
        };

  const usernameValidation = editingUsername ? getUsernameValidation(profileForm.username, language) : "";

  return (
    <div className="account-drawer-backdrop" onMouseDown={onClose}>
      <aside className="account-drawer" onMouseDown={(event) => event.stopPropagation()}>
        <button className="account-drawer-close" onClick={onClose} aria-label="Close">
          ×
        </button>
        <div className="account-drawer-sidebar">
          <div>
            <h2>{copy.title}</h2>
            <p>{copy.subtitle}</p>
          </div>
          <button className={activePanel === "account" ? "active" : ""} onClick={() => setActivePanel("account")}>
            <UiIcon name="profile" />
            {copy.account}
          </button>
          <button className={activePanel === "security" ? "active" : ""} onClick={() => setActivePanel("security")}>
            <UiIcon name="shield" />
            {copy.security}
          </button>
          <button className={activePanel === "preferences" ? "active" : ""} onClick={() => setActivePanel("preferences")}>
            <UiIcon name="globe" />
            {copy.preferences}
          </button>
          <div className="account-drawer-secured">{copy.secured}</div>
        </div>

        <div className="account-drawer-main">
          {activePanel === "account" ? (
            <>
              <h3>{copy.account}</h3>
              <form className="account-rows" onSubmit={submitProfile}>
                <div className={`account-row ${editingProfile ? "popover-open profile-edit-open" : ""}`}>
                  <span>{copy.profile}</span>
                  <div className="account-profile-mini">
                    <AvatarCircle user={user} />
                    <strong>{user.firstName} {user.lastName}</strong>
                  </div>
                  <button type="button" className="account-link" onClick={() => setEditingProfile((prev) => !prev)}>
                    {copy.updateProfile}
                  </button>
                  {editingProfile ? (
                    <div className="account-edit-card profile-popover">
                      <h4>{copy.updateProfile}</h4>
                      <div className="profile-photo-editor">
                        <div className="profile-photo-preview">
                          {profileAvatarPreview ? (
                            <img src={profileAvatarPreview} alt="" />
                          ) : (
                            <AvatarCircle user={{ ...user, avatarDataUrl: "" }} />
                          )}
                        </div>
                        <label className="profile-photo-upload">
                          <input type="file" accept="image/jpeg,image/png,image/gif,image/webp" onChange={(event) => chooseProfileImage(event.target.files?.[0])} />
                          {avatarUploading ? (language === "en" ? "Uploading..." : "Téléchargement...") : language === "en" ? "Upload image" : "Télécharger une image"}
                        </label>
                        <button type="button" className="profile-photo-remove" onClick={() => { setProfileAvatarPreview(""); setProfileAvatarFile(null); }}>
                          {language === "en" ? "Remove image" : "Supprimer l'image"}
                        </button>
                        <p>{language === "en" ? "Upload a JPG, PNG, GIF or WEBP image under 10 MB" : "Téléchargez une image JPG, PNG, GIF ou WEBP inférieure à 10 Mo"}</p>
                      </div>
                      {localError ? <div className="form-error">{localError}</div> : null}
                      <div className="account-inline-fields two">
                        <label>
                          {language === "en" ? "First name" : "Prénom"}
                          <input value={profileForm.firstName} onChange={(event) => setProfileForm((prev) => ({ ...prev, firstName: event.target.value }))} />
                        </label>
                        <label>
                          {language === "en" ? "Last name" : "Nom"}
                          <input value={profileForm.lastName} onChange={(event) => setProfileForm((prev) => ({ ...prev, lastName: event.target.value }))} />
                        </label>
                      </div>
                      <div className="account-form-actions">
                        <button type="button" className="btn-secondary" onClick={() => setEditingProfile(false)}>{copy.cancel}</button>
                        <button className="btn-main" disabled={savingProfile}>
                          {savingProfile ? <span className="btn-spinner" /> : null} {copy.save}
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
                <div className={`account-row ${editingUsername ? "popover-open" : ""}`}>
                  <span>{copy.username}</span>
                  <strong className="account-value">{user.username || user.email.split("@")[0]}</strong>
                  <button type="button" className="account-link" onClick={() => setEditingUsername((prev) => !prev)}>
                    {copy.changeUsername}
                  </button>
                  {editingUsername ? (
                    <div className="account-edit-card compact">
                      <h4>{copy.changeUsername}</h4>
                      <label>
                        {copy.username}
                        <input
                          value={profileForm.username}
                          onChange={(event) => {
                            setLocalError("");
                            setProfileForm((prev) => ({ ...prev, username: event.target.value }));
                          }}
                          aria-invalid={Boolean(usernameValidation)}
                          aria-describedby="username-help"
                        />
                      </label>
                      <p id="username-help" className={usernameValidation ? "field-hint error" : "field-hint"}>
                        {usernameValidation || copy.usernameHint}
                      </p>
                      <div className="account-form-actions">
                        <button type="button" className="btn-secondary" onClick={() => setEditingUsername(false)}>{copy.cancel}</button>
                        <button className="btn-main" disabled={Boolean(usernameValidation)}>{copy.save}</button>
                      </div>
                    </div>
                  ) : null}
                </div>
              </form>

              <div className="account-rows">
                <div className={`account-row email-row ${addingEmail ? "popover-open" : ""}`}>
                  <span>{copy.emails}</span>
                  <div className="email-list">
                    {emails.map((item) => (
                      <div className="email-item" key={item.id}>
                        <div>
                          <strong>{item.email}</strong>
                          <small>{item.isPrimary ? copy.primary : item.isVerified ? copy.verified : copy.pending}</small>
                        </div>
                        <div className="email-actions">
                          {!item.isPrimary && item.isVerified ? (
                            <button type="button" onClick={() => onSetPrimaryEmail(item.id)}>{copy.makePrimary}</button>
                          ) : null}
                          {!item.isPrimary ? (
                            <button type="button" onClick={() => onRemoveEmail(item.id)}>{copy.remove}</button>
                          ) : null}
                        </div>
                      </div>
                    ))}
                    <button type="button" className="add-email-link" onClick={() => setAddingEmail((prev) => !prev)}>
                      <span>+</span>
                      {copy.addEmail}
                    </button>
                  </div>
                  {addingEmail ? (
                    <div className="account-add-email">
                      <h4>{copy.addEmail}</h4>
                      <p>{copy.addText}</p>
                      {localError ? <div className="form-error">{localError}</div> : null}
                      {!pendingEmail ? (
                        <form onSubmit={requestEmail}>
                          <label>
                            {copy.email}
                            <input type="email" value={emailForm} onChange={(event) => setEmailForm(event.target.value)} placeholder={copy.email} required />
                          </label>
                          <div className="account-form-actions">
                            <button type="button" className="btn-secondary" onClick={() => { setEmailForm(""); setAddingEmail(false); }}>{copy.cancel}</button>
                            <button className="btn-main" disabled={emailSaving}>{emailSaving ? "..." : copy.sendCode}</button>
                          </div>
                        </form>
                      ) : (
                        <form onSubmit={verifyEmail}>
                          <label>
                            {copy.code}
                            <input inputMode="numeric" maxLength={6} value={emailCode} onChange={(event) => setEmailCode(event.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="000000" required />
                          </label>
                          <div className="account-form-actions">
                            <button type="button" className="btn-secondary" onClick={() => setPendingEmail("")}>{copy.cancel}</button>
                            <button className="btn-main" disabled={emailSaving || emailCode.length !== 6}>{emailSaving ? "..." : copy.verify}</button>
                          </div>
                        </form>
                      )}
                    </div>
                  ) : null}
                </div>

                <div className="account-row">
                  <span>{copy.connected}</span>
                  {user.googleLinked ? (
                    <>
                      <div className="connected-provider"><GoogleLogo /> Google · {user.email}</div>
                      <button type="button" className="account-kebab" onClick={() => setConnectedMenuOpen((prev) => !prev)}>...</button>
                      {connectedMenuOpen ? (
                        <div className="connected-popover">
                          <strong>{copy.connectedRemoveTitle}</strong>
                          <p>{copy.connectedRemoveText}</p>
                          <button
                            type="button"
                            onClick={() => {
                              onRemoveConnectedAccount("google");
                              setConnectedMenuOpen(false);
                            }}
                          >
                            {copy.removeConnected}
                          </button>
                        </div>
                      ) : null}
                    </>
                  ) : (
                    <>
                      <div className="connected-provider connected-provider-empty">
                        {language === "en" ? "No connected account" : "Aucun compte connecté"}
                      </div>
                      <GoogleSignInButton
                        language={language}
                        onCredential={(credential) => onLinkGoogleAccount(credential)}
                      />
                    </>
                  )}
                </div>

                {user.schoolLicense && !user.schoolLicense.revoked && user.schoolLicense.organizationName ? (
                  <div className="account-row account-row-school">
                    <span>{copy.schoolSection}</span>
                    <div className="account-school-card">
                      <div className="account-school-head">
                        {user.schoolLicense.logoDataUrl ? (
                          <img src={user.schoolLicense.logoDataUrl} alt="" className="account-school-logo" />
                        ) : (
                          <span className="account-school-logo account-school-logo-fallback">
                            <UiIcon name="briefcase" />
                          </span>
                        )}
                        <div>
                          <strong>{user.schoolLicense.organizationName}</strong>
                          {user.schoolLicense.acronym ? <span className="muted">{user.schoolLicense.acronym}</span> : null}
                        </div>
                      </div>
                      <ul className="account-school-details">
                        {user.schoolLicense.organizationType ? (
                          <li>
                            <span className="muted">{copy.schoolType}</span>
                            <span>{user.schoolLicense.organizationType}</span>
                          </li>
                        ) : null}
                        {user.schoolLicense.website ? (
                          <li>
                            <span className="muted">{copy.schoolWebsite}</span>
                            <a href={/^https?:\/\//i.test(user.schoolLicense.website) ? user.schoolLicense.website : `https://${user.schoolLicense.website}`} target="_blank" rel="noreferrer">
                              {user.schoolLicense.website}
                            </a>
                          </li>
                        ) : null}
                        {user.schoolLicense.address || user.schoolLicense.city || user.schoolLicense.country ? (
                          <li>
                            <span className="muted">{copy.schoolLocation}</span>
                            <span>{[user.schoolLicense.address, user.schoolLicense.city, user.schoolLicense.country].filter(Boolean).join(", ")}</span>
                          </li>
                        ) : null}
                        {user.schoolLicense.emailDomain ? (
                          <li>
                            <span className="muted">{copy.schoolEmailDomain}</span>
                            <span>{user.schoolLicense.emailDomain}</span>
                          </li>
                        ) : null}
                        {user.schoolLicense.primaryContactName ? (
                          <li>
                            <span className="muted">{copy.schoolContactPerson}</span>
                            <span>{user.schoolLicense.primaryContactName}</span>
                          </li>
                        ) : null}
                        {user.schoolLicense.contactEmail ? (
                          <li>
                            <span className="muted">{copy.schoolContact}</span>
                            <span>{user.schoolLicense.contactEmail}</span>
                          </li>
                        ) : null}
                        {user.schoolLicense.contactPhone ? (
                          <li>
                            <span className="muted">{copy.schoolPhone}</span>
                            <span>{user.schoolLicense.contactPhone}</span>
                          </li>
                        ) : null}
                      </ul>
                    </div>
                  </div>
                ) : null}
              </div>
            </>
          ) : activePanel === "preferences" ? (
            <>
              <h3>{copy.preferences}</h3>
              <div className="account-rows">
                <div className="account-row account-row-preference">
                  <span>{copy.language}</span>
                  <LanguageSwitch language={language} setLanguage={setLanguage} />
                </div>
                <div className="account-row account-row-preference">
                  <span>{copy.currency}</span>
                  <div className="currency-pills">
                    {CURRENCY_OPTIONS.map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        className={`currency-pill ${currency === option.id ? "active" : ""}`}
                        onClick={() => setCurrency(option.id)}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <p className="preferences-hint">{copy.currencyHint}</p>

              <div className="account-rows">
                <div className="account-row account-row-preference account-row-theme">
                  <span>{copy.theme}</span>
                  <div className="theme-swatch-row">
                    {THEME_PRESETS.map((preset) => (
                      <button
                        key={preset.id}
                        type="button"
                        className={`theme-swatch ${theme === preset.id ? "active" : ""}`}
                        style={{ "--swatch-color": preset.swatch }}
                        onClick={() => setTheme(preset.id)}
                        title={preset.label[language] || preset.label.fr}
                        aria-label={preset.label[language] || preset.label.fr}
                      />
                    ))}
                  </div>
                </div>
              </div>
              <p className="preferences-hint">{copy.themeHint}</p>

              <div className="account-rows">
                <div className="account-row account-row-preference">
                  <span>{copy.mode}</span>
                  <div className="currency-pills">
                    <button
                      type="button"
                      className={`currency-pill ${mode === "light" ? "active" : ""}`}
                      onClick={() => setMode("light")}
                    >
                      {copy.modeLight}
                    </button>
                    <button
                      type="button"
                      className={`currency-pill ${mode === "dark" ? "active" : ""}`}
                      onClick={() => setMode("dark")}
                    >
                      {copy.modeDark}
                    </button>
                  </div>
                </div>
                <div className="account-row account-row-preference">
                  <span>{copy.density}</span>
                  <div className="currency-pills">
                    <button
                      type="button"
                      className={`currency-pill ${density === "comfortable" ? "active" : ""}`}
                      onClick={() => setDensity("comfortable")}
                    >
                      {copy.densityComfortable}
                    </button>
                    <button
                      type="button"
                      className={`currency-pill ${density === "compact" ? "active" : ""}`}
                      onClick={() => setDensity("compact")}
                    >
                      {copy.densityCompact}
                    </button>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
              <h3>{copy.security}</h3>
              <div className="account-rows">
                <div className="account-row">
                  <span>{copy.password}</span>
                  <strong>{copy.setPassword}</strong>
                  <button type="button" className="account-link" onClick={() => setPasswordOpen((prev) => !prev)}>
                    {copy.updatePassword}
                  </button>
                </div>

                {passwordOpen ? (
                  <form className="account-security-card" onSubmit={onSubmitPassword}>
                    <h4>{copy.updatePassword}</h4>
                    <label>
                      {copy.currentPassword}
                      <input
                        type="password"
                        value={securityForm.currentPassword}
                        onChange={(event) => setSecurityForm((prev) => ({ ...prev, currentPassword: event.target.value }))}
                        required
                      />
                    </label>
                    <label>
                      {copy.newPassword}
                      <input
                        type="password"
                        minLength={8}
                        value={securityForm.newPassword}
                        onChange={(event) => setSecurityForm((prev) => ({ ...prev, newPassword: event.target.value }))}
                        required
                      />
                      {securityForm.newPassword && securityForm.newPassword.length < 8 ? (
                        <small className="field-error">{copy.passwordTooShort}</small>
                      ) : null}
                    </label>
                    <label>
                      {copy.confirmPassword}
                      <input
                        type="password"
                        minLength={8}
                        value={securityForm.confirmPassword}
                        onChange={(event) => setSecurityForm((prev) => ({ ...prev, confirmPassword: event.target.value }))}
                        required
                      />
                    </label>
                    <label className="security-checkbox">
                      <input
                        type="checkbox"
                        checked={securityForm.logoutOtherSessions}
                        onChange={(event) => setSecurityForm((prev) => ({ ...prev, logoutOtherSessions: event.target.checked }))}
                      />
                      <span>
                        <strong>{copy.logoutOthers}</strong>
                        <small>{copy.logoutOthersText}</small>
                      </span>
                    </label>
                    <div className="account-form-actions">
                      <button type="button" className="btn-secondary" onClick={() => setPasswordOpen(false)}>
                        {copy.cancel}
                      </button>
                      <button
                        className="btn-main"
                        disabled={securitySaving || !securityForm.currentPassword || securityForm.newPassword.length < 8}
                      >
                        {securitySaving ? "..." : copy.save}
                      </button>
                    </div>
                  </form>
                ) : null}

                <div className="account-row">
                  <span>{copy.activeDevices}</span>
                  <div className="device-list">
                    {(user.sessions?.length ? user.sessions : [{ device: "Windows", browser: "Chrome", ipAddress: "127.0.0.1", lastSeenAt: new Date().toISOString() }]).map((session, index) => (
                      <div className="device-info" key={session.id || index}>
                        <span className="device-screen" />
                        <div>
                          <strong>
                            {session.device || "Windows"} <em>{index === 0 ? (language === "en" ? "This device" : "Cet appareil") : ""}</em>
                          </strong>
                          <small>{session.browser || "Chrome"} · {session.ipAddress || "127.0.0.1"}</small>
                          <small>{formatDate(session.lastSeenAt || session.createdAt)}</small>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="account-row danger">
                  <span>{copy.danger}</span>
                  <button type="button" onClick={() => setDeleteOpen((prev) => !prev)}>
                    {copy.deleteButton}
                  </button>
                </div>

                {deleteOpen ? (
                  <form className="delete-account-card" onSubmit={submitDeleteAccount}>
                    <h4>{copy.deleteTitle}</h4>
                    <p>{copy.deleteLead}</p>
                    <p className="delete-warning">{copy.deleteWarning}</p>
                    {localError ? <div className="form-error">{localError}</div> : null}
                    <label>
                      {copy.deletePrompt}
                      <input
                        value={deleteConfirm}
                        onChange={(event) => setDeleteConfirm(event.target.value)}
                        placeholder={copy.deletePlaceholder}
                      />
                    </label>
                    <div className="account-form-actions">
                      <button
                        type="button"
                        className="btn-secondary"
                        onClick={() => {
                          setDeleteOpen(false);
                          setDeleteConfirm("");
                        }}
                      >
                        {copy.cancel}
                      </button>
                      <button className="delete-account-btn" disabled={deleteConfirm !== "Supprimer le compte" || deleteSaving}>
                        {deleteSaving ? "..." : copy.deleteButton}
                      </button>
                    </div>
                  </form>
                ) : null}
              </div>
            </>
          )}
        </div>
      </aside>
    </div>
  );
}

function AvatarCircle({ user, large = false }) {
  const src = getAvatarSource(user);
  const initials = withInitials(user);

  return (
    <div className={`avatar ${large ? "large" : ""} ${src ? "has-image" : ""}`}>
      {src ? <img src={src} alt="" loading="lazy" /> : initials}
    </div>
  );
}

function LanguageSwitch({ language, setLanguage, compact = false }) {
  return (
    <div className={`language-switch ${compact ? "compact" : ""}`} aria-label="Choix de la langue">
      {LANGUAGE_OPTIONS.map((item) => (
        <button
          key={item.id}
          type="button"
          className={language === item.id ? "active" : ""}
          onClick={() => setLanguage(item.id)}
          aria-pressed={language === item.id}
        >
          <span className={`flag ${item.flagClass}`} aria-hidden="true" />
          <span>{item.label}</span>
        </button>
      ))}
    </div>
  );
}

function GoogleLogo() {
  return (
    <svg className="google-logo" viewBox="0 0 48 48" aria-hidden="true" focusable="false">
      <path
        fill="#FFC107"
        d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.2 6.1 29.4 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"
      />
      <path
        fill="#FF3D00"
        d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.2 6.1 29.4 4 24 4 16.2 4 9.5 8.5 6.3 14.7z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.3 0 10.1-2 13.6-5.3l-6.3-5.3C29.2 35 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.4 39.6 16.1 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.2 4.1-4.1 5.4l6.3 5.3C37.1 39.1 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"
      />
    </svg>
  );
}

const PRODUCT_SECTION_IDS = ["section-features", "section-matching", "section-entretiens", "section-offres"];

function LandingPage({
  copy,
  language,
  setLanguage,
  onLoginClick,
  onSignupClick,
  onPrivacyClick,
  onTermsClick,
  onCookiesClick,
  onAboutClick,
  onContactClick,
  onPricingClick,
  onSecurityClick
}) {
  const previewItems =
    language === "en"
      ? [
          {
            role: "Junior Data Analyst",
            score: 86,
            progress: 2,
            skills: "Python · SQL · BI",
            keywords: "3 keywords",
            offers: "+15 jobs",
            action: "Prepare the HR interview",
            skillLabel: "Strong skills detected",
            keywordLabel: "To add to the CV",
            offerLabel: "Jobs to prioritize",
            nextLabel: "Next action"
          },
          {
            role: "UX/UI Designer",
            score: 74,
            progress: 3,
            skills: "Figma · Research",
            keywords: "5 keywords",
            offers: "+8 jobs",
            action: "Rewrite the project section",
            skillLabel: "Portfolio signals found",
            keywordLabel: "Missing in the CV",
            offerLabel: "Relevant openings",
            nextLabel: "Next action"
          },
          {
            role: "Junior Developer",
            score: 91,
            progress: 4,
            skills: "React · Node · API",
            keywords: "2 keywords",
            offers: "+21 jobs",
            action: "Practice technical questions",
            skillLabel: "Technical fit detected",
            keywordLabel: "To reinforce",
            offerLabel: "Best matches",
            nextLabel: "Next action"
          }
        ]
      : [
          {
            role: "Data Analyst Junior",
            score: 86,
            progress: 2,
            skills: "Python · SQL · BI",
            keywords: "3 mots-clés",
            offers: "+15 offres",
            action: "Préparer l'entretien RH",
            skillLabel: "Compétences fortes détectées",
            keywordLabel: "À ajouter dans le CV",
            offerLabel: "Offres à prioriser",
            nextLabel: "Action suivante"
          },
          {
            role: "UX/UI Designer",
            score: 74,
            progress: 3,
            skills: "Figma · Recherche",
            keywords: "5 mots-clés",
            offers: "+8 offres",
            action: "Réécrire la section projets",
            skillLabel: "Signaux portfolio détectés",
            keywordLabel: "Manquants dans le CV",
            offerLabel: "Offres pertinentes",
            nextLabel: "Action suivante"
          },
          {
            role: "Développeur Junior",
            score: 91,
            progress: 4,
            skills: "React · Node · API",
            keywords: "2 mots-clés",
            offers: "+21 offres",
            action: "S'entraîner aux questions techniques",
            skillLabel: "Adéquation technique détectée",
            keywordLabel: "À renforcer",
            offerLabel: "Meilleurs matchs",
            nextLabel: "Action suivante"
          }
        ];
  const [previewIndex, setPreviewIndex] = useState(0);
  const activePreview = previewItems[previewIndex % previewItems.length];
  const journeyLabels = language === "en" ? ["CV", "Match", "CV+", "Interview"] : ["CV", "Match", "CV+", "Entretien"];

  useEffect(() => {
    const timer = setInterval(() => {
      setPreviewIndex((current) => (current + 1) % previewItems.length);
    }, 3200);
    return () => clearInterval(timer);
  }, [previewItems.length]);

  return (
    <div className="landing-shell">
      <header className="landing-nav">
        <div className="landing-brand">
          <span className="brand-mark" aria-hidden="true">
            <UiIcon name="matchmark" />
          </span>
          <strong>Career App</strong>
        </div>
        <div className="landing-actions">
          <LanguageSwitch language={language} setLanguage={setLanguage} />
          <button className="landing-link" type="button" onClick={onLoginClick}>
            {copy.login}
          </button>
          <button className="landing-signup" type="button" onClick={onSignupClick}>
            {copy.signup}
          </button>
        </div>
      </header>

      <main>
        <section className="landing-hero">
          <div className="landing-hero-copy">
            <h1>
              {copy.heroTitleTop}
              <span>{copy.heroTitleAccent}</span>
            </h1>
            <p>{copy.heroText}</p>
            <button className="landing-cta" type="button" onClick={onSignupClick}>
              {copy.cta} <UiIcon name="chevron" className="btn-chevron" />
            </button>
            <small>{copy.freeCredits}</small>
            <div className="landing-trust">
              {copy.trust.map((item, index) => (
                <span key={item}>
                  <UiIcon name={index === 0 ? "shield" : index === 1 ? "chart" : "profile"} />
                  {item}
                </span>
              ))}
            </div>
          </div>

          <div className="hero-product" aria-label="Aperçu du produit Career App">
            <div className="career-dashboard-preview">
              <div className="dashboard-preview-top">
                <div>
                  <span>{copy.profile}</span>
                  <strong>{activePreview.role}</strong>
                </div>
                <div className="dashboard-score">
                  <strong>{activePreview.score}</strong>
                  <span>{copy.score}</span>
                </div>
              </div>

              <div className="journey-track">
                {journeyLabels.map((label, index) => (
                  <span key={label} className={index < activePreview.progress ? "done" : ""}>
                    {label}
                  </span>
                ))}
              </div>

              <div className="insight-grid">
                <article>
                  <span>01</span>
                  <strong>{activePreview.skills}</strong>
                  <small>{activePreview.skillLabel}</small>
                </article>
                <article>
                  <span>02</span>
                  <strong>{activePreview.keywords}</strong>
                  <small>{activePreview.keywordLabel}</small>
                </article>
                <article>
                  <span>03</span>
                  <strong>{activePreview.offers}</strong>
                  <small>{activePreview.offerLabel}</small>
                </article>
              </div>

              <div className="next-action-card">
                <div>
                  <span>{activePreview.nextLabel}</span>
                  <strong>{activePreview.action}</strong>
                </div>
                <button type="button">
                  <UiIcon name="chevron" className="btn-chevron" />
                </button>
              </div>
            </div>
          </div>
        </section>

        <section className="ats-band" id="section-matching">
          <div>
            <span className="section-eyebrow">{copy.atsEyebrow}</span>
            <h2>
              {copy.atsTitleA}
              <span>{copy.atsTitleB}</span>
            </h2>
            <p>{copy.atsText}</p>
            <div className="diagnostic-proof-grid">
              <article>
                <strong>4</strong>
                <span>axes analysés</span>
              </article>
              <article>
                <strong>60s</strong>
                <span>pour obtenir un score</span>
              </article>
              <article>
                <strong>CV+</strong>
                <span>plan d'amélioration</span>
              </article>
            </div>
            <div className="diagnostic-note">
              <UiIcon name="shield" />
              <span>Les résultats servent directement aux modules Offres, CV+ et Entretiens.</span>
            </div>
          </div>
          <div className="ats-panel">
            <span className="ats-badge">CV</span>
            <h3>{copy.atsPanelTitle}</h3>
            <p>{copy.atsPanelHint}</p>
            <div className="diagnostic-score-row">
              <div className="diagnostic-score">
                <strong>78</strong>
                <span>/100</span>
              </div>
              <div>
                <b>Compatibilité solide</b>
                <small>Quelques mots-clés et preuves d'impact à renforcer.</small>
              </div>
            </div>
            <div className="diagnostic-bars">
              <span style={{ "--width": "86%" }}>Compétences détectées</span>
              <span style={{ "--width": "68%" }}>Mots-clés présents</span>
              <span style={{ "--width": "74%" }}>Expérience alignée</span>
            </div>
            <div className="diagnostic-actions">
              <span>Priorité 1 · Ajouter SQL avancé</span>
              <span>Priorité 2 · Chiffrer les résultats</span>
            </div>
          </div>
        </section>

        <section className="features-section" id="section-features">
          <div className="section-heading">
            <h2>{copy.featuresTitle}</h2>
            <p>{copy.featuresText}</p>
          </div>
          <div className="feature-grid">
            {copy.featureCards.map((card, index) => (
              <article className={index === 1 ? "feature-card dark" : "feature-card"} key={card.title}>
                <span className="feature-icon">
                  <UiIcon name={index === 0 ? "upload" : index === 1 ? "chat" : "chart"} />
                </span>
                <h3>{card.title}</h3>
                <p>{card.text}</p>
                <div className="feature-tags">
                  {card.tags.map((tag) => (
                    <span key={tag}>{tag}</span>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="steps-section" id="section-entretiens">
          <div className="section-heading">
            <h2>{copy.stepsTitle}</h2>
            <p>{copy.stepsText}</p>
          </div>
          <div className="landing-steps">
            {copy.steps.map((step, index) => (
              <article key={step.title}>
                <span className="step-number">{String(index + 1).padStart(2, "0")}</span>
                <span className="step-icon">
                  <UiIcon name={index === 0 ? "upload" : index === 1 ? "matchmark" : "chat"} />
                </span>
                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="career-section" id="section-offres">
          <div className="career-section-head">
            <div>
              <span className="section-eyebrow">{language === "en" ? "Career paths" : "Parcours métiers"}</span>
              <h2>{copy.careersTitle}</h2>
            </div>
            <p>
              {language === "en"
                ? "Quick examples of roles that Career App can compare with your CV."
                : "Quelques exemples de métiers que Career App peut comparer avec votre CV."}
            </p>
          </div>
          <div className="career-grid">
            {CAREER_CARDS.map((career) => (
              <article className={`career-card ${career.tone}`} key={career.title}>
                <div className="career-card-top">
                  <h3>{career.title}</h3>
                  <span>{career.score}%</span>
                </div>
                <p>{career.skills}</p>
                <div className="career-card-bottom">
                  <small>{copy.careerSubtitle}</small>
                  <button type="button" aria-label={`${copy.careerSubtitle} ${career.title}`}>
                    <UiIcon name="chevron" className="btn-chevron" />
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>

        <FaqSection copy={copy} />
      </main>

      <footer className="landing-footer">
        <div>
          <div className="landing-brand footer-brand">
            <span className="brand-mark" aria-hidden="true">
              <UiIcon name="matchmark" />
            </span>
            <strong>Career App</strong>
          </div>
          <p>{copy.footerText}</p>
        </div>
        <FooterColumn
          title={copy.footerProduct}
          links={copy.linksProduct}
          onLinkClick={(_link, index) => {
            if (index === 4) {
              onPricingClick?.();
              return;
            }
            if (index === 5) {
              document.getElementById("section-faq")?.scrollIntoView({ behavior: "smooth", block: "start" });
              return;
            }
            document.getElementById(PRODUCT_SECTION_IDS[index])?.scrollIntoView({ behavior: "smooth", block: "start" });
          }}
        />
        <FooterColumn
          title={copy.footerCompany}
          links={copy.linksCompany}
          onLinkClick={(_link, index) => {
            if (index === 0) onAboutClick?.();
            if (index === 1) onContactClick?.();
            if (index === 2) onContactClick?.();
          }}
        />
        <FooterColumn
          title={copy.footerLegal}
          links={copy.linksLegal}
          onLinkClick={(_link, index) => {
            if (index === 0) onPrivacyClick?.();
            if (index === 1) onTermsClick?.();
            if (index === 2) onCookiesClick?.();
            if (index === 3) onSecurityClick?.();
          }}
        />
      </footer>
    </div>
  );
}

function FaqSection({ copy }) {
  const [openIndex, setOpenIndex] = useState(0);
  const items = copy.faq || [];
  if (!items.length) return null;

  return (
    <section className="faq-section" id="section-faq">
      <div className="section-heading">
        <span className="section-eyebrow">{copy.faqEyebrow}</span>
        <h2>{copy.faqTitle}</h2>
        <p>{copy.faqText}</p>
      </div>
      <div className="faq-list">
        {items.map((item, index) => {
          const isOpen = index === openIndex;
          return (
            <article key={item.q} className={`faq-item ${isOpen ? "open" : ""}`}>
              <button
                type="button"
                className="faq-question"
                aria-expanded={isOpen}
                onClick={() => setOpenIndex(isOpen ? -1 : index)}
              >
                <span className="faq-index">{String(index + 1).padStart(2, "0")}</span>
                <span className="faq-question-text">{item.q}</span>
                <span className="faq-toggle" aria-hidden="true">
                  <UiIcon name="plus" />
                </span>
              </button>
              <div className="faq-answer-wrap">
                <div className="faq-answer-inner">
                  <p className="faq-answer">{item.a}</p>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function FooterColumn({ title, links, onLinkClick }) {
  return (
    <div className="footer-column">
      <h3>{title}</h3>
      {links.map((link, index) => (
        <button type="button" key={link} onClick={() => onLinkClick?.(link, index)}>
          {link}
        </button>
      ))}
    </div>
  );
}

function ConnectedFooter({
  copy,
  onPrivacyClick,
  onTermsClick,
  onCookiesClick,
  onAboutClick,
  onContactClick,
  onPricingClick,
  onSecurityClick
}) {
  const hasCompanyNav = Boolean(onAboutClick || onContactClick);

  return (
    <footer className="connected-footer">
      <div>
        <div className="landing-brand footer-brand">
          <span className="brand-mark" aria-hidden="true">
            <UiIcon name="matchmark" />
          </span>
          <strong>Career App</strong>
        </div>
        <p>{copy.footerText}</p>
      </div>
      <FooterColumn
        title={copy.footerProduct}
        links={copy.linksProduct}
        onLinkClick={
          onPricingClick
            ? (_link, index) => {
                if (index === 4) onPricingClick?.();
              }
            : undefined
        }
      />
      <FooterColumn
        title={copy.footerCompany}
        links={copy.linksCompany}
        onLinkClick={
          hasCompanyNav
            ? (_link, index) => {
                if (index === 0) onAboutClick?.();
                if (index === 1) onContactClick?.();
                if (index === 2) onContactClick?.();
              }
            : undefined
        }
      />
      <FooterColumn
        title={copy.footerLegal}
        links={copy.linksLegal}
        onLinkClick={(_link, index) => {
          if (index === 0) onPrivacyClick?.();
          if (index === 1) onTermsClick?.();
          if (index === 2) onCookiesClick?.();
          if (index === 3) onSecurityClick?.();
        }}
      />
    </footer>
  );
}

function loadGoogleIdentityScript() {
  if (window.google?.accounts?.id) return Promise.resolve();
  const existing = document.getElementById("google-identity-script");
  if (existing) {
    return new Promise((resolve) => {
      existing.addEventListener("load", () => resolve(), { once: true });
      if (window.google?.accounts?.id) resolve();
    });
  }
  return new Promise((resolve) => {
    const script = document.createElement("script");
    script.id = "google-identity-script";
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    document.body.appendChild(script);
  });
}

function GoogleSignInButton({ language, onCredential, showLastUsed = false }) {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID || !containerRef.current) return;
    let cancelled = false;

    loadGoogleIdentityScript().then(() => {
      if (cancelled || !window.google?.accounts?.id || !containerRef.current) return;
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: async (response) => {
          try {
            await onCredential(response.credential);
          } catch (_error) {
            // handled via onCredential's own error state
          }
        }
      });
      containerRef.current.innerHTML = "";
      window.google.accounts.id.renderButton(containerRef.current, {
        theme: "outline",
        size: "large",
        shape: "rectangular",
        text: "continue_with",
        width: 320,
        locale: language === "en" ? "en" : "fr"
      });
    });

    return () => {
      cancelled = true;
    };
  }, [language, onCredential]);

  if (!GOOGLE_CLIENT_ID) {
    return (
      <button className="google-login-btn" type="button" disabled title="Connexion Google non configurée">
        <GoogleLogo />
        {language === "en" ? "Continue with Google" : "Continuer avec Google"}
      </button>
    );
  }

  return (
    <div className="google-identity-button-wrap">
      <div className="google-identity-button" ref={containerRef} />
      {showLastUsed ? (
        <span className="google-last-used-badge">
          {language === "en" ? "Last used" : "Dernière utilisation"}
        </span>
      ) : null}
    </div>
  );
}

const PRIVACY_CONTACT_EMAIL = "support@career-app.example";
const PRIVACY_LAST_UPDATED = { fr: "27 juillet 2026", en: "July 27, 2026" };

function slugify(text) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function LegalDocPage({
  eyebrow,
  title,
  updated,
  sections,
  closing,
  language,
  setLanguage,
  onBack,
  onLoginClick,
  onSignupClick,
  landingCopy,
  onPrivacyClick,
  onTermsClick,
  onCookiesClick,
  onAboutClick,
  onContactClick,
  onPricingClick,
  onSecurityClick,
  initialSectionIndex
}) {
  const initialId = sections[initialSectionIndex] ? slugify(sections[initialSectionIndex].heading) : sections[0] ? slugify(sections[0].heading) : "";
  const [activeId, setActiveId] = useState(initialId);

  function handleTocClick(id) {
    setActiveId(id);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  useEffect(() => {
    if (initialSectionIndex == null) return;
    const id = sections[initialSectionIndex] ? slugify(sections[initialSectionIndex].heading) : "";
    if (!id) return;
    const timer = setTimeout(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 60);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="landing-shell legal-shell">
      <header className="landing-nav">
        <div className="landing-brand">
          <span className="brand-mark" aria-hidden="true">
            <UiIcon name="matchmark" />
          </span>
          <strong>Career App</strong>
        </div>
        <div className="landing-actions">
          <LanguageSwitch language={language} setLanguage={setLanguage} />
          <button className="landing-link" type="button" onClick={onLoginClick}>
            {language === "en" ? "Log in" : "Se connecter"}
          </button>
          <button className="landing-signup" type="button" onClick={onSignupClick}>
            {language === "en" ? "Sign up" : "S'inscrire"}
          </button>
        </div>
      </header>

      <main className="legal-page">
        <button type="button" className="legal-back" onClick={onBack}>
          {language === "en" ? "? Back to home" : "? Retour à l'accueil"}
        </button>

        <p className="legal-eyebrow">{eyebrow}</p>
        <h1 className="legal-doc-title">{title}</h1>
        <p className="legal-doc-updated">{updated}</p>

        <div className="legal-doc-layout">
          <nav className="legal-toc" aria-label="Sommaire">
            <span className="legal-toc-label">{language === "en" ? "On this page" : "Sur cette page"}</span>
            {sections.map((section) => {
              const id = slugify(section.heading);
              return (
                <button
                  key={id}
                  type="button"
                  className={activeId === id ? "active" : ""}
                  onClick={() => handleTocClick(id)}
                >
                  {section.heading}
                </button>
              );
            })}
          </nav>

          <div className="legal-doc-content">
            {sections.map((section) => {
              const id = slugify(section.heading);
              return (
                <section key={id} id={id} className="legal-doc-section">
                  <h2>{section.heading}</h2>
                  {section.paragraphs?.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                  {section.list ? (
                    <ul className="legal-doc-list">
                      {section.list.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  ) : null}
                  {section.note ? <div className="legal-callout">{section.note}</div> : null}
                </section>
              );
            })}

            <div className="legal-doc-closing">
              <p>{closing.body}</p>
              <p>
                <strong>{PRIVACY_CONTACT_EMAIL}</strong>
              </p>
            </div>
          </div>
        </div>
      </main>

      <ConnectedFooter
        copy={landingCopy}
        onPrivacyClick={onPrivacyClick}
        onTermsClick={onTermsClick}
        onCookiesClick={onCookiesClick}
        onAboutClick={onAboutClick}
        onContactClick={onContactClick}
        onPricingClick={onPricingClick}
        onSecurityClick={onSecurityClick}
      />
    </div>
  );
}

function PrivacyPolicyPage({
  language,
  setLanguage,
  onBack,
  onLoginClick,
  onSignupClick,
  onNavigateLegal,
  landingCopy,
  focusCookies,
  focusSecurity
}) {
  const isEn = language === "en";

  const sections = isEn
    ? [
        {
          heading: "What does this policy cover?",
          paragraphs: [
            "This page explains what personal data Career App collects when you use the platform, why we collect it, and the choices you have. It applies to every visitor and every registered account (candidates, schools, and recruitment agencies).",
            "By creating an account, you acknowledge that you have read this page."
          ]
        },
        {
          heading: "What data do we collect?",
          paragraphs: [
            "When you register, we ask for your first name, last name, email address, and a password, which we store using salted cryptographic hashing — never in plain text.",
            "When you use the CV analysis or matching tools, we process the content of the CVs you upload and the job offers you submit, purely to generate your results.",
            "We also automatically record basic technical data (IP address, browser, device) and account security events (logins, password changes), kept for fraud prevention and to let you review your own account activity."
          ]
        },
        {
          heading: "Why do we process it?",
          list: [
            "To run the CV/offer matching engine and produce your compatibility score and suggestions.",
            "To generate the cover letters and negotiation guidance you request.",
            "To keep your account secure and let you sign in.",
            "To send you account-related notifications, and — only if you have not opted out — occasional service announcements."
          ]
        },
        {
          heading: "Who else sees it?",
          paragraphs: [
            "We do not sell personal data, and we keep the list of parties who process it on our behalf as short as possible:"
          ],
          list: [
            "An AI inference provider, to analyze the text of your CV and the job offers you submit and generate matching results.",
            "Supabase, which hosts our application database.",
            "Stripe, which processes subscription payments — we never see or store your card details.",
            "Google, only if you actively choose to sign in with a Google account.",
            "Our email delivery provider, to send verification codes and, if enabled, announcements."
          ]
        },
        {
          heading: "How do we protect it?",
          list: [
            "All traffic between your browser and our servers is encrypted (HTTPS/TLS).",
            "Passwords are salted and hashed; they are never recoverable in plain text, by us or anyone else.",
            "Access to production data is limited and logged."
          ]
        },
        {
          heading: "Do we use cookies?",
          paragraphs: [
            "We use a strictly necessary cookie to keep you signed in. We do not run third-party advertising or cross-site tracking cookies."
          ]
        },
        {
          heading: "What are your rights?",
          paragraphs: ["You are always in control of your data. From your account settings, or by writing to us, you can:"],
          list: [
            "Request a copy of the personal data we hold about you.",
            "Correct information that is inaccurate.",
            "Delete your account and the data attached to it.",
            "Export your data in a portable format."
          ]
        }
      ]
    : [
        {
          heading: "Que couvre cette politique ?",
          paragraphs: [
            "Cette page explique quelles données personnelles Career App collecte lorsque vous utilisez la plateforme, pourquoi nous les collectons, et les choix qui sont les vôtres. Elle s'applique à tout visiteur et à tout titulaire de compte (candidats, écoles et cabinets de recrutement).",
            "En créant un compte, vous reconnaissez avoir pris connaissance de cette page."
          ]
        },
        {
          heading: "Quelles données collectons-nous ?",
          paragraphs: [
            "À l'inscription, nous demandons votre prénom, votre nom, votre adresse email et un mot de passe, que nous stockons via un hachage cryptographique salé — jamais en clair.",
            "Lorsque vous utilisez les outils d'analyse de CV ou de matching, nous traitons le contenu des CV que vous téléchargez et des offres que vous soumettez, uniquement pour produire vos résultats.",
            "Nous enregistrons également des données techniques basiques (adresse IP, navigateur, appareil) et des événements de sécurité du compte (connexions, changements de mot de passe), conservés pour prévenir la fraude et vous permettre de consulter l'activité de votre propre compte."
          ]
        },
        {
          heading: "Pourquoi les traitons-nous ?",
          list: [
            "Pour faire fonctionner le moteur de matching CV/offre et produire votre score de compatibilité et nos suggestions.",
            "Pour générer les lettres de motivation et conseils de négociation que vous demandez.",
            "Pour sécuriser votre compte et permettre votre connexion.",
            "Pour vous envoyer des notifications liées à votre compte et, seulement si vous n'avez pas refusé, d'occasionnelles annonces de service."
          ]
        },
        {
          heading: "Qui y a accès ?",
          paragraphs: [
            "Nous ne vendons jamais de données personnelles, et nous limitons volontairement le nombre de partenaires qui les traitent pour notre compte :"
          ],
          list: [
            "Un fournisseur d'inférence IA, pour analyser le texte de votre CV et des offres soumises et générer les résultats de matching.",
            "Supabase, qui héberge notre base de données applicative.",
            "Stripe, qui traite les paiements d'abonnement — nous ne voyons ni ne stockons jamais vos données bancaires.",
            "Google, uniquement si vous choisissez activement de vous connecter avec un compte Google.",
            "Notre prestataire d'envoi d'emails, pour les codes de vérification et, si activées, les annonces."
          ]
        },
        {
          heading: "Comment protégeons-nous vos données ?",
          list: [
            "Tout le trafic entre votre navigateur et nos serveurs est chiffré (HTTPS/TLS).",
            "Les mots de passe sont salés et hachés ; ils ne sont récupérables en clair par personne, y compris nous.",
            "L'accès aux données de production est restreint et journalisé."
          ]
        },
        {
          heading: "Utilisons-nous des cookies ?",
          paragraphs: [
            "Nous utilisons uniquement un cookie strictement nécessaire au maintien de votre connexion. Nous n'utilisons aucun cookie publicitaire ou de traçage tiers."
          ]
        },
        {
          heading: "Quels sont vos droits ?",
          paragraphs: ["Vous gardez le contrôle de vos données. Depuis les paramètres de votre compte, ou en nous écrivant, vous pouvez :"],
          list: [
            "Demander une copie des données personnelles que nous détenons sur vous.",
            "Corriger une information inexacte.",
            "Supprimer votre compte et les données qui y sont attachées.",
            "Exporter vos données dans un format réutilisable."
          ]
        }
      ];

  return (
    <LegalDocPage
      eyebrow={isEn ? "Legal" : "Juridique"}
      title={isEn ? "Privacy Policy" : "Politique de Confidentialité"}
      updated={isEn ? `Last updated: ${PRIVACY_LAST_UPDATED.en}` : `Dernière mise à jour : ${PRIVACY_LAST_UPDATED.fr}`}
      sections={sections}
      closing={{
        body: isEn
          ? "Questions about how your data is handled, or about exercising your rights? Write to us — we typically reply within a few business days."
          : "Une question sur le traitement de vos données, ou sur l'exercice de vos droits ? Écrivez-nous — nous répondons en général sous quelques jours ouvrés."
      }}
      language={language}
      setLanguage={setLanguage}
      onBack={onBack}
      onLoginClick={onLoginClick}
      onSignupClick={onSignupClick}
      landingCopy={landingCopy}
      onPrivacyClick={() => onNavigateLegal?.("privacy")}
      onTermsClick={() => onNavigateLegal?.("terms")}
      onCookiesClick={() => onNavigateLegal?.("cookies")}
      onAboutClick={() => onNavigateLegal?.("about")}
      onContactClick={() => onNavigateLegal?.("contact")}
      onPricingClick={() => onNavigateLegal?.("pricing")}
      onSecurityClick={() => onNavigateLegal?.("security")}
      initialSectionIndex={focusCookies ? 5 : focusSecurity ? 4 : undefined}
    />
  );
}

function TermsOfServicePage({ language, setLanguage, onBack, onLoginClick, onSignupClick, onNavigateLegal, landingCopy }) {
  const isEn = language === "en";

  const sections = isEn
    ? [
        {
          heading: "What does agreeing to these terms mean?",
          paragraphs: [
            "These Terms of Service govern your use of Career App. Creating an account, or simply using the platform, means you accept them. If any part of them is unacceptable to you, please don't use the service."
          ]
        },
        {
          heading: "What does the service do — and not do?",
          paragraphs: [
            "Career App analyzes your CV against job offers, scores their compatibility, and can draft cover letters and negotiation guidance using AI.",
            "These outputs are assistance, not guarantees. AI-generated content can contain mistakes, and we make no promise that using Career App will lead to an interview or a job offer. You are responsible for reviewing anything generated by the platform before you send it to a third party."
          ]
        },
        {
          heading: "What use is acceptable?",
          paragraphs: ["When using the platform, you agree not to:"],
          list: [
            "Send spam or harass anyone using information obtained through the service.",
            "Upload files containing malware or content that is illegal in your jurisdiction.",
            "Attempt to bypass rate limits, security controls, or access data that isn't yours.",
            "Share your login credentials with someone else or resell access to your account."
          ]
        },
        {
          heading: "How do tokens, plans and payments work?",
          paragraphs: [
            "Certain actions (generating a cover letter, starting a negotiation, running a CV analysis) consume tokens, granted according to your plan.",
            "New accounts receive a set of free tokens to try the service; they are personal to your account and are not transferable or exchangeable for cash.",
            "Paid plans are billed through Stripe, monthly or annually depending on what you select; current pricing is always visible on our pricing page before you subscribe.",
            "Schools and recruitment agencies may issue license codes to members of their organization; a code can be revoked by the issuing organization or by us if it is misused.",
            "Because subscription access is granted immediately on payment, charges are final once processed, except where the law gives you a right of withdrawal or in case of a proven fault on our part."
          ]
        },
        {
          heading: "Who owns what?",
          paragraphs: [
            "Your CV and personal data remain yours; using the platform only grants us a limited, temporary right to process them to deliver the analysis you ask for.",
            "In turn, the Career App name, interface, source code, and matching logic belong to us. You may not copy, reverse-engineer, or redistribute them without our written permission."
          ]
        },
        {
          heading: "What is our liability?",
          paragraphs: [
            "The service is provided on an \"as available\" basis. To the extent permitted by law, we are not liable for indirect or consequential outcomes of using our results — for example, an unsuccessful interview or an approximation in an AI-generated document. Reviewing and validating generated content before you rely on it is your responsibility."
          ]
        },
        {
          heading: "What happens if an account is suspended or terms change?",
          paragraphs: [
            "We may suspend or close an account that breaches these terms. We may also update this page over time; the version published here is the one that applies, and we'll flag any change that materially affects your rights."
          ]
        },
        {
          heading: "Which law applies?",
          paragraphs: [
            "These terms are governed by French law, without prejudice to any mandatory consumer-protection rules of your place of residence. Disputes are handled by the courts with jurisdiction under applicable law."
          ]
        }
      ]
    : [
        {
          heading: "Que signifie accepter ces conditions ?",
          paragraphs: [
            "Ces Conditions Générales d'Utilisation régissent votre usage de Career App. Créer un compte, ou simplement utiliser la plateforme, vaut acceptation. Si l'une de ces clauses ne vous convient pas, merci de ne pas utiliser le service."
          ]
        },
        {
          heading: "Que fait le service — et que ne fait-il pas ?",
          paragraphs: [
            "Career App analyse votre CV au regard d'offres d'emploi, calcule un score de compatibilité, et peut rédiger des lettres de motivation et des conseils de négociation à l'aide de l'IA.",
            "Ces résultats sont une aide, pas une garantie. Un contenu généré par IA peut contenir des erreurs, et nous ne promettons pas que l'usage de Career App mène à un entretien ou à une embauche. Il vous appartient de relire tout contenu généré avant de l'envoyer à un tiers."
          ]
        },
        {
          heading: "Quel usage est acceptable ?",
          paragraphs: ["En utilisant la plateforme, vous vous engagez à ne pas :"],
          list: [
            "Envoyer des messages non sollicités ou harceler quiconque à l'aide d'informations obtenues via le service.",
            "Téléverser des fichiers contenant un logiciel malveillant ou un contenu illégal dans votre juridiction.",
            "Tenter de contourner nos limites d'utilisation, nos contrôles de sécurité, ou accéder à des données qui ne sont pas les vôtres.",
            "Partager vos identifiants de connexion avec un tiers ou revendre l'accès à votre compte."
          ]
        },
        {
          heading: "Comment fonctionnent jetons, plans et paiements ?",
          paragraphs: [
            "Certaines actions (générer une lettre de motivation, démarrer une négociation, lancer une analyse de CV) consomment des jetons, accordés selon votre plan.",
            "Les nouveaux comptes reçoivent un lot de jetons gratuits pour tester le service ; ils sont personnels à votre compte et ne sont ni transférables ni échangeables contre de l'argent.",
            "Les plans payants sont facturés via Stripe, mensuellement ou annuellement selon votre choix ; le tarif en vigueur est toujours visible sur notre page tarifs avant toute souscription.",
            "Les écoles et cabinets de recrutement peuvent émettre des codes de licence pour les membres de leur organisation ; un code peut être révoqué par l'organisation émettrice ou par nous-mêmes en cas d'usage abusif.",
            "L'accès à l'abonnement étant accordé immédiatement après paiement, les sommes versées sont dues une fois le paiement validé, sauf disposition légale contraire vous ouvrant un droit de rétractation, ou en cas de faute avérée de notre part."
          ]
        },
        {
          heading: "À qui appartiennent les données et le service ?",
          paragraphs: [
            "Votre CV et vos données personnelles restent les vôtres ; l'usage de la plateforme nous accorde seulement un droit limité et temporaire de les traiter pour vous fournir l'analyse demandée.",
            "À l'inverse, le nom Career App, son interface, son code source et sa logique de matching nous appartiennent. Vous ne pouvez ni les copier, ni les décompiler, ni les redistribuer sans notre autorisation écrite."
          ]
        },
        {
          heading: "Quelle est notre responsabilité ?",
          paragraphs: [
            "Le service est fourni « en l'état, selon disponibilité ». Dans la mesure permise par la loi, nous ne sommes pas responsables des conséquences indirectes de l'usage de nos résultats — par exemple un entretien manqué ou une approximation dans un document généré par IA. Il vous appartient de relire et de valider tout contenu généré avant de vous y fier."
          ]
        },
        {
          heading: "Que se passe-t-il en cas de suspension ou de modification ?",
          paragraphs: [
            "Nous pouvons suspendre ou clôturer un compte qui viole ces conditions. Nous pouvons également faire évoluer cette page dans le temps ; la version publiée ici fait foi, et nous signalerons tout changement affectant significativement vos droits."
          ]
        },
        {
          heading: "Quel droit s'applique ?",
          paragraphs: [
            "Ces conditions sont régies par le droit français, sans préjudice des règles impératives de protection des consommateurs de votre lieu de résidence. Les litiges relèvent des tribunaux compétents en application du droit applicable."
          ]
        }
      ];

  return (
    <LegalDocPage
      eyebrow={isEn ? "Legal" : "Juridique"}
      title={isEn ? "Terms of Service" : "Conditions Générales d'Utilisation"}
      updated={isEn ? `Last updated: ${PRIVACY_LAST_UPDATED.en}` : `Dernière mise à jour : ${PRIVACY_LAST_UPDATED.fr}`}
      sections={sections}
      closing={{
        body: isEn
          ? "Questions about these terms? Write to us — we typically reply within a few business days."
          : "Une question sur ces conditions ? Écrivez-nous — nous répondons en général sous quelques jours ouvrés."
      }}
      language={language}
      setLanguage={setLanguage}
      onBack={onBack}
      onLoginClick={onLoginClick}
      onSignupClick={onSignupClick}
      landingCopy={landingCopy}
      onPrivacyClick={() => onNavigateLegal?.("privacy")}
      onTermsClick={() => onNavigateLegal?.("terms")}
      onCookiesClick={() => onNavigateLegal?.("cookies")}
      onAboutClick={() => onNavigateLegal?.("about")}
      onContactClick={() => onNavigateLegal?.("contact")}
      onPricingClick={() => onNavigateLegal?.("pricing")}
      onSecurityClick={() => onNavigateLegal?.("security")}
    />
  );
}

function InfoPage({
  eyebrow,
  title,
  subtitle,
  children,
  language,
  setLanguage,
  onBack,
  onLoginClick,
  onSignupClick,
  landingCopy,
  onPrivacyClick,
  onTermsClick,
  onCookiesClick,
  onAboutClick,
  onContactClick,
  onPricingClick,
  onSecurityClick
}) {
  return (
    <div className="landing-shell legal-shell">
      <header className="landing-nav">
        <div className="landing-brand">
          <span className="brand-mark" aria-hidden="true">
            <UiIcon name="matchmark" />
          </span>
          <strong>Career App</strong>
        </div>
        <div className="landing-actions">
          <LanguageSwitch language={language} setLanguage={setLanguage} />
          <button className="landing-link" type="button" onClick={onLoginClick}>
            {language === "en" ? "Log in" : "Se connecter"}
          </button>
          <button className="landing-signup" type="button" onClick={onSignupClick}>
            {language === "en" ? "Sign up" : "S'inscrire"}
          </button>
        </div>
      </header>

      <main className="legal-page info-page">
        <button type="button" className="legal-back" onClick={onBack}>
          {language === "en" ? "? Back to home" : "? Retour à l'accueil"}
        </button>

        <p className="legal-eyebrow">{eyebrow}</p>
        <h1 className="legal-doc-title info-title">{title}</h1>
        {subtitle ? <p className="info-subtitle">{subtitle}</p> : null}

        {children}
      </main>

      <ConnectedFooter
        copy={landingCopy}
        onPrivacyClick={onPrivacyClick}
        onTermsClick={onTermsClick}
        onCookiesClick={onCookiesClick}
        onAboutClick={onAboutClick}
        onContactClick={onContactClick}
        onPricingClick={onPricingClick}
        onSecurityClick={onSecurityClick}
      />
    </div>
  );
}

function AboutPage({ language, setLanguage, onBack, onLoginClick, onSignupClick, onNavigateLegal, landingCopy }) {
  const isEn = language === "en";

  const copy = isEn
    ? {
        eyebrow: "About",
        title: "About Career App",
        subtitle: "The AI copilot that helps you present yourself well and target the right opportunities.",
        missionTitle: "Our mission",
        missionBody:
          "Job hunting shouldn't mean guessing what a recruiter wants to read. Career App was built to give every candidate the same tools a well-coached applicant already has: a clear read on how their CV stacks up against a role, the missing keywords worth adding, and a way to rehearse before the interview.",
        howTitle: "What's inside",
        howItems: [
          { title: "CV Optimizer", text: "Upload a CV and a job offer to get a compatibility score, missing keywords, and concrete rewrite suggestions." },
          { title: "Job Matching", text: "See how a set of offers rank against your profile, so you spend time on the ones worth applying to." },
          { title: "Interview Coach", text: "Practice with role-specific questions and structured feedback before the real thing." },
          { title: "Cover letters & negotiation", text: "Generate a first draft tailored to the offer, and get guidance when it's time to talk salary." }
        ],
        valuesTitle: "How we operate",
        valuesItems: [
          "Privacy by design: your CV is processed to serve you, never sold, and you can delete it at any time.",
          "Transparent pricing: a token-based system with a free allowance, no hidden fees.",
          "AI as a copilot, not a substitute: every result is a suggestion for you to review, not an automatic decision."
        ],
        ctaTitle: "Ready to try it?",
        ctaBody: "Create an account and run your first CV analysis in a couple of minutes.",
        ctaButton: "Get started for free"
      }
    : {
        eyebrow: "À propos",
        title: "À propos de Career App",
        subtitle: "Le copilote IA qui vous aide à bien vous présenter et à cibler les bonnes opportunités.",
        missionTitle: "Notre mission",
        missionBody:
          "Chercher un emploi ne devrait pas se résumer à deviner ce qu'un recruteur a envie de lire. Career App a été conçu pour donner à chaque candidat les mêmes outils qu'un candidat bien accompagné : une lecture claire de la compatibilité entre son CV et un poste, les mots-clés à ajouter, et un moyen de s'entraîner avant l'entretien.",
        howTitle: "Ce que vous y trouverez",
        howItems: [
          { title: "CV Optimizer", text: "Importez un CV et une offre pour obtenir un score de compatibilité, les mots-clés manquants et des suggestions de réécriture concrètes." },
          { title: "Job Matching", text: "Comparez plusieurs offres avec votre profil pour concentrer vos efforts sur celles qui en valent la peine." },
          { title: "Interview Coach", text: "Entraînez-vous avec des questions adaptées au poste et un retour structuré avant le vrai entretien." },
          { title: "Lettres & négociation", text: "Générez un premier brouillon de lettre de motivation adapté à l'offre, et obtenez des conseils au moment de négocier votre salaire." }
        ],
        valuesTitle: "Comment nous travaillons",
        valuesItems: [
          "Confidentialité par conception : votre CV est traité pour vous servir, jamais vendu, et vous pouvez le supprimer à tout moment.",
          "Tarification transparente : un système de jetons avec un quota gratuit, sans frais cachés.",
          "L'IA comme copilote, jamais comme substitut : chaque résultat est une suggestion à relire, pas une décision automatique."
        ],
        ctaTitle: "Prêt à essayer ?",
        ctaBody: "Créez un compte et lancez votre première analyse de CV en quelques minutes.",
        ctaButton: "Commencer gratuitement"
      };

  return (
    <InfoPage
      eyebrow={copy.eyebrow}
      title={copy.title}
      subtitle={copy.subtitle}
      language={language}
      setLanguage={setLanguage}
      onBack={onBack}
      onLoginClick={onLoginClick}
      onSignupClick={onSignupClick}
      landingCopy={landingCopy}
      onPrivacyClick={() => onNavigateLegal?.("privacy")}
      onTermsClick={() => onNavigateLegal?.("terms")}
      onCookiesClick={() => onNavigateLegal?.("cookies")}
      onAboutClick={() => onNavigateLegal?.("about")}
      onContactClick={() => onNavigateLegal?.("contact")}
      onPricingClick={() => onNavigateLegal?.("pricing")}
      onSecurityClick={() => onNavigateLegal?.("security")}
    >
      <section className="info-section">
        <h2>{copy.missionTitle}</h2>
        <p>{copy.missionBody}</p>
      </section>

      <section className="info-section">
        <h2>{copy.howTitle}</h2>
        <div className="info-card-grid">
          {copy.howItems.map((item) => (
            <div key={item.title} className="info-card">
              <strong>{item.title}</strong>
              <p>{item.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="info-section">
        <h2>{copy.valuesTitle}</h2>
        <ul className="legal-doc-list">
          {copy.valuesItems.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <section className="info-cta">
        <div>
          <h2>{copy.ctaTitle}</h2>
          <p>{copy.ctaBody}</p>
        </div>
        <button type="button" className="landing-signup" onClick={onSignupClick}>
          {copy.ctaButton}
        </button>
      </section>
    </InfoPage>
  );
}

function ContactPage({ language, setLanguage, onBack, onLoginClick, onSignupClick, onNavigateLegal, landingCopy }) {
  const isEn = language === "en";

  const copy = isEn
    ? {
        eyebrow: "Contact",
        title: "Get in touch",
        subtitle: "Pick the right inbox below and we'll get back to you within a few business days.",
        cards: [
          {
            title: "General support",
            text: "Questions about your account, a CV analysis, or a bug you've run into.",
            email: "support@career-app.example"
          },
          {
            title: "Privacy & data rights",
            text: "Access, correction, deletion, or export requests for your personal data.",
            email: "privacy@career-app.example"
          },
          {
            title: "Schools & recruitment agencies",
            text: "Partnership requests, license codes, or questions about a team plan.",
            email: "partners@career-app.example"
          }
        ]
      }
    : {
        eyebrow: "Contact",
        title: "Nous contacter",
        subtitle: "Choisissez la bonne adresse ci-dessous, nous répondons en général sous quelques jours ouvrés.",
        cards: [
          {
            title: "Support général",
            text: "Questions sur votre compte, une analyse de CV, ou un bug rencontré.",
            email: "support@career-app.example"
          },
          {
            title: "Confidentialité & données",
            text: "Demandes d'accès, de rectification, de suppression ou d'export de vos données personnelles.",
            email: "privacy@career-app.example"
          },
          {
            title: "Écoles & cabinets de recrutement",
            text: "Demandes de partenariat, codes de licence, ou questions sur une offre équipe.",
            email: "partners@career-app.example"
          }
        ]
      };

  return (
    <InfoPage
      eyebrow={copy.eyebrow}
      title={copy.title}
      subtitle={copy.subtitle}
      language={language}
      setLanguage={setLanguage}
      onBack={onBack}
      onLoginClick={onLoginClick}
      onSignupClick={onSignupClick}
      landingCopy={landingCopy}
      onPrivacyClick={() => onNavigateLegal?.("privacy")}
      onTermsClick={() => onNavigateLegal?.("terms")}
      onCookiesClick={() => onNavigateLegal?.("cookies")}
      onAboutClick={() => onNavigateLegal?.("about")}
      onContactClick={() => onNavigateLegal?.("contact")}
      onPricingClick={() => onNavigateLegal?.("pricing")}
      onSecurityClick={() => onNavigateLegal?.("security")}
    >
      <div className="info-card-grid info-contact-grid">
        {copy.cards.map((card) => (
          <div key={card.title} className="info-card">
            <strong>{card.title}</strong>
            <p>{card.text}</p>
            <a href={`mailto:${card.email}`} className="info-contact-email">
              {card.email}
            </a>
          </div>
        ))}
      </div>
    </InfoPage>
  );
}

function PublicPricingPage({ language, setLanguage, onBack, onLoginClick, onSignupClick, onNavigateLegal, landingCopy, currency = "EUR" }) {
  const isEn = language === "en";
  const copy = isEn
    ? { eyebrow: "Pricing", title: "Plans & pricing", subtitle: "Every plan currently in effect on Career App — no surprises." }
    : { eyebrow: "Tarifs", title: "Plans & tarifs", subtitle: "Toutes les grilles tarifaires en vigueur sur Career App — sans surprise." };
  const pricingCopy = APP_COPY[language]?.pricing || APP_COPY.fr.pricing;

  return (
    <InfoPage
      eyebrow={copy.eyebrow}
      title={copy.title}
      subtitle={copy.subtitle}
      language={language}
      setLanguage={setLanguage}
      onBack={onBack}
      onLoginClick={onLoginClick}
      onSignupClick={onSignupClick}
      landingCopy={landingCopy}
      onPrivacyClick={() => onNavigateLegal?.("privacy")}
      onTermsClick={() => onNavigateLegal?.("terms")}
      onCookiesClick={() => onNavigateLegal?.("cookies")}
      onAboutClick={() => onNavigateLegal?.("about")}
      onContactClick={() => onNavigateLegal?.("contact")}
      onPricingClick={() => onNavigateLegal?.("pricing")}
      onSecurityClick={() => onNavigateLegal?.("security")}
    >
      {PLAN_SEGMENTS.map((segment) => (
        <section key={segment} className="info-section">
          <h2>
            {segment === "candidate"
              ? pricingCopy.segmentCandidate
              : segment === "agency"
              ? pricingCopy.segmentAgency
              : pricingCopy.segmentSchool}
          </h2>
          <div className="pricing-grid">
            {PLANS.filter((plan) => plan.segment === segment).map((plan) => {
              const price = formatPlanPrice(plan, "monthly", language, pricingCopy, currency);
              return (
                <article key={plan.id} className={`pricing-card ${plan.highlighted ? "recommended" : ""}`}>
                  {plan.badge ? <span className="pricing-badge">{plan.badge[language] || plan.badge.fr}</span> : null}
                  <h3>{plan.name[language] || plan.name.fr}</h3>
                  <p className="muted">{plan.tagline[language] || plan.tagline.fr}</p>
                  <div className="pricing-price">
                    <strong>{price.amount}</strong>
                    <span>{price.unit}</span>
                  </div>
                  <ul className="pricing-feature-list">
                    {(plan.features[language] || plan.features.fr).map((feature) => (
                      <li key={feature}>{feature}</li>
                    ))}
                  </ul>
                </article>
              );
            })}
          </div>
        </section>
      ))}

      <section className="info-cta">
        <div>
          <h2>{isEn ? "Ready to start?" : "Prêt à commencer ?"}</h2>
          <p>
            {isEn
              ? "Create a free account, no card required."
              : "Crée un compte gratuit, sans carte bancaire."}
          </p>
        </div>
        <button type="button" className="landing-signup" onClick={onSignupClick}>
          {isEn ? "Sign up for free" : "S'inscrire gratuitement"}
        </button>
      </section>
    </InfoPage>
  );
}

function AuthScreen({
  onLogin,
  onRequestLoginCode,
  onSignup,
  onVerifySignupCode,
  onResendSignupCode,
  onGoogleLogin,
  onClearError,
  error,
  helper,
  language,
  setLanguage,
  copy,
  landingCopy
}) {
  const [showLanding, setShowLanding] = useState(true);
  const [legalPage, setLegalPage] = useState(null);
  const [lastAuthMethod] = useState(getLastAuthMethod);

  const [mode, setMode] = useState("login");
  const [loginStep, setLoginStep] = useState("identifier");
  const [signupPhase, setSignupPhase] = useState("form");
  const [loginCode, setLoginCode] = useState(["", "", "", "", "", ""]);
  const [verificationEmail, setVerificationEmail] = useState("");
  const [resendSeconds, setResendSeconds] = useState(0);

  const [loginForm, setLoginForm] = useState({
    identifier: "",
    password: ""
  });

  const [signupForm, setSignupForm] = useState({
    firstName: "",
    lastName: "",
    username: "",
    email: "",
    password: ""
  });
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [googleProcessing, setGoogleProcessing] = useState(false);

  async function handleGoogleCredential(credential) {
    setGoogleProcessing(true);
    try {
      await onGoogleLogin(credential);
    } finally {
      setGoogleProcessing(false);
    }
  }

  const signupUsernameError = signupForm.username ? getUsernameValidation(signupForm.username, language) : "";

  function updateLoginField(key, value) {
    setLoginForm((prev) => ({ ...prev, [key]: value }));
  }

  function updateSignupField(key, value) {
    setSignupForm((prev) => ({ ...prev, [key]: value }));
  }

  function switchMode(nextMode) {
    setMode(nextMode);
    setLoginStep("identifier");
    setSignupPhase("form");
    setLoginCode(["", "", "", "", "", ""]);
    setVerificationEmail("");
    setShowLanding(false);
    onClearError();
  }

  useEffect(() => {
    if (resendSeconds <= 0) return undefined;
    const timer = setTimeout(() => setResendSeconds((value) => Math.max(0, value - 1)), 1000);
    return () => clearTimeout(timer);
  }, [resendSeconds]);

  function validateSignupForm() {
    if (!signupForm.firstName || !signupForm.lastName) {
      throw new Error(language === "en" ? "First and last name are required." : "Prénom et nom sont requis.");
    }
    if (!signupForm.username.trim()) {
      throw new Error(language === "en" ? "Username is required." : "Le nom d'utilisateur est obligatoire.");
    }
    if (signupUsernameError) throw new Error(signupUsernameError);
    if (!signupForm.email.includes("@")) throw new Error(language === "en" ? "Invalid email." : "Email invalide.");
    if (signupForm.password.length < 8) {
      throw new Error(
        language === "en"
          ? "The password must contain at least 8 characters."
          : "Le mot de passe doit contenir au moins 8 caractères."
      );
    }
  }

  function buildSignupPayload() {
    return {
      firstName: signupForm.firstName,
      lastName: signupForm.lastName,
      username: signupForm.username,
      email: signupForm.email,
      password: signupForm.password,
      accountType: "student",
      onboarding: buildAccountPatch({ accountType: "student" })
    };
  }

  async function submit(event) {
    event.preventDefault();
    if (mode === "login") {
      if (loginStep === "identifier") {
        if (!loginForm.identifier.trim()) return;
        setIsSubmitting(true);
        try {
          const result = await onRequestLoginCode({ identifier: loginForm.identifier });
          setVerificationEmail(result.email || loginForm.identifier);
          setResendSeconds(result.resendAfterSeconds || 30);
          setLoginCode(["", "", "", "", "", ""]);
          setLoginStep("code");
        } catch (_error) {
          // Error already surfaced via the inline auth error state.
        } finally {
          setIsSubmitting(false);
        }
        return;
      }
      if (loginStep === "code") {
        const code = loginCode.join("");
        if (code.length !== 6) return;
        setIsSubmitting(true);
        try {
          await onLogin({ identifier: loginForm.identifier, code });
        } finally {
          setIsSubmitting(false);
        }
        return;
      }
      setIsSubmitting(true);
      try {
        await onLogin(loginForm);
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    if (signupPhase === "form") {
      try {
        validateSignupForm();
      } catch (validationError) {
        alert(validationError.message);
        return;
      }

      setIsSubmitting(true);
      try {
        const result = await onSignup(buildSignupPayload());
        setVerificationEmail(result.verification?.email || signupForm.email);
        setResendSeconds(result.verification?.resendAfterSeconds || 30);
        setLoginCode(["", "", "", "", "", ""]);
        setSignupPhase("code");
      } catch (_error) {
        // Error already surfaced via the inline auth error state.
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    const code = loginCode.join("");
    if (code.length !== 6) return;
    setIsSubmitting(true);
    try {
      await onVerifySignupCode({ identifier: signupForm.email, code });
    } catch (_error) {
      // Error already surfaced via the inline auth error state.
    } finally {
      setIsSubmitting(false);
    }
  }

  async function resendCode() {
    if (resendSeconds > 0) return;
    if (mode === "signup") {
      try {
        const result = await onResendSignupCode(signupForm.email);
        setVerificationEmail(result.email || signupForm.email);
        setResendSeconds(result.resendAfterSeconds || 30);
        setLoginCode(["", "", "", "", "", ""]);
      } catch (_error) {
        // Error already surfaced via the inline auth error state.
      }
      return;
    }
    if (!loginForm.identifier.trim()) return;
    try {
      const result = await onRequestLoginCode({ identifier: loginForm.identifier });
      setVerificationEmail(result.email || loginForm.identifier);
      setResendSeconds(result.resendAfterSeconds || 30);
      setLoginCode(["", "", "", "", "", ""]);
    } catch (_error) {
      // Error already surfaced via the inline auth error state.
    }
  }

  function updateCodeDigit(index, value) {
    const digit = value.replace(/\D/g, "").slice(-1);
    setLoginCode((current) => {
      const next = [...current];
      next[index] = digit;
      return next;
    });
    if (digit) {
      const nextInput = document.querySelector(`[data-code-index="${index + 1}"]`);
      nextInput?.focus();
    }
  }

  if (legalPage) {
    const sharedProps = {
      language,
      setLanguage,
      onBack: () => setLegalPage(null),
      onLoginClick: () => {
        setLegalPage(null);
        switchMode("login");
      },
      onSignupClick: () => {
        setLegalPage(null);
        switchMode("signup");
      },
      onNavigateLegal: (page) => setLegalPage(page),
      landingCopy
    };

    if (legalPage === "privacy") return <PrivacyPolicyPage {...sharedProps} />;
    if (legalPage === "cookies") return <PrivacyPolicyPage {...sharedProps} focusCookies />;
    if (legalPage === "security") return <PrivacyPolicyPage {...sharedProps} focusSecurity />;
    if (legalPage === "terms") return <TermsOfServicePage {...sharedProps} />;
    if (legalPage === "about") return <AboutPage {...sharedProps} />;
    if (legalPage === "contact") return <ContactPage {...sharedProps} />;
    if (legalPage === "pricing") return <PublicPricingPage {...sharedProps} />;
  }

  return (
    <div className="auth-modal-page">
      <LandingPage
        copy={landingCopy}
        language={language}
        setLanguage={setLanguage}
        onLoginClick={() => switchMode("login")}
        onSignupClick={() => switchMode("signup")}
        onPrivacyClick={() => setLegalPage("privacy")}
        onTermsClick={() => setLegalPage("terms")}
        onCookiesClick={() => setLegalPage("cookies")}
        onAboutClick={() => setLegalPage("about")}
        onContactClick={() => setLegalPage("contact")}
        onPricingClick={() => setLegalPage("pricing")}
        onSecurityClick={() => setLegalPage("security")}
      />

      {!showLanding ? (
        <div className="auth-modal-backdrop" onMouseDown={() => setShowLanding(true)}>
          <div className="auth-modal-card login-style" onMouseDown={(event) => event.stopPropagation()}>
            <div className="auth-modal-close-sticky">
              <button className="auth-modal-close" type="button" onClick={() => setShowLanding(true)} aria-label="Fermer">
                ×
              </button>
            </div>

            <div className="login-modal-head">
              <h2>
                {mode === "signup"
                  ? signupPhase === "code"
                    ? language === "en"
                      ? "Check your inbox"
                      : "Vérifiez votre messagerie"
                    : copy.createAccount
                  : loginStep === "identifier"
                    ? language === "en"
                      ? "Identify yourself"
                      : "S'identifier"
                    : loginStep === "code"
                      ? language === "en"
                        ? "Check your inbox"
                        : "Vérifiez votre messagerie"
                      : copy.password}
              </h2>
              <p>
                {mode === "signup" && signupPhase === "code"
                  ? language === "en"
                    ? "Welcome to Career App"
                    : "Bienvenue sur Career App"
                  : language === "en"
                    ? "to continue to Career App"
                    : "pour continuer vers Career App"}
                {(loginStep === "code" && mode === "login") || (signupPhase === "code" && mode === "signup") ? (
                  <>
                    <br />
                    <strong>{verificationEmail}</strong>
                    {mode === "login" ? (
                      <button type="button" onClick={() => setLoginStep("identifier")} aria-label="Modifier l'adresse">
                        ?
                      </button>
                    ) : null}
                  </>
                ) : null}
              </p>
            </div>

      <form className="auth-card auth-card-modal" onSubmit={submit}>
        {mode === "login" ? (
          <>
            {loginStep === "identifier" ? (
              <>
                <div className="google-btn-wrap-relative">
                  <GoogleSignInButton
                    language={language}
                    onCredential={handleGoogleCredential}
                    showLastUsed={lastAuthMethod === "google"}
                  />
                  {googleProcessing ? (
                    <div className="google-btn-loading-overlay">
                      <span className="btn-spinner dark" />
                    </div>
                  ) : null}
                </div>

                <div className="auth-separator">
                  <span>{language === "en" ? "or" : "ou"}</span>
                </div>

                <label>
                  {language === "en" ? "Email or username" : "Adresse e-mail ou nom d'utilisateur"}
                  <input
                    value={loginForm.identifier}
                    onChange={(event) => updateLoginField("identifier", event.target.value)}
                    placeholder={language === "en" ? "Username or email address" : "Nom d'utilisateur ou adresse e-mail"}
                    autoFocus
                    required
                  />
                </label>
              </>
            ) : (
              <>
                {loginStep === "code" ? (
                  <div className="code-verification-block">
                    <div className="code-input-row" aria-label="Code de vérification">
                      {loginCode.map((digit, index) => (
                        <input
                          key={index}
                          data-code-index={index}
                          value={digit}
                          onChange={(event) => updateCodeDigit(index, event.target.value)}
                          onKeyDown={(event) => {
                            if (event.key === "Backspace" && !loginCode[index] && index > 0) {
                              document.querySelector(`[data-code-index="${index - 1}"]`)?.focus();
                            }
                          }}
                          inputMode="numeric"
                          maxLength={1}
                          autoFocus={index === 0}
                        />
                      ))}
                    </div>
                    <button className="resend-code-btn" type="button" onClick={resendCode} disabled={resendSeconds > 0}>
                      {resendSeconds > 0
                        ? language === "en"
                          ? `Resend code (${resendSeconds})`
                          : `Renvoyer le code (${resendSeconds})`
                        : language === "en"
                          ? "Resend code"
                          : "Renvoyer le code"}
                    </button>
                    <button className="other-method-btn" type="button" onClick={() => setLoginStep("password")}>
                      {language === "en" ? "Use password instead" : "Utiliser une autre méthode"}
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="auth-identity-chip">
                      <span>{language === "en" ? "Signing in as" : "Connexion avec"}</span>
                      <strong>{loginForm.identifier}</strong>
                      <button type="button" onClick={() => setLoginStep("identifier")}>
                        {language === "en" ? "Change" : "Modifier"}
                      </button>
                    </div>
                    <label>
                      {copy.password}
                      <input
                        type="password"
                        value={loginForm.password}
                        onChange={(event) => updateLoginField("password", event.target.value)}
                        minLength={8}
                        autoFocus
                        required
                      />
                    </label>
                  </>
                )}
              </>
            )}
          </>
        ) : signupPhase === "code" ? (
          <div className="code-verification-block">
            <div className="code-input-row" aria-label="Code de vérification">
              {loginCode.map((digit, index) => (
                <input
                  key={index}
                  data-code-index={index}
                  value={digit}
                  onChange={(event) => updateCodeDigit(index, event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Backspace" && !loginCode[index] && index > 0) {
                      document.querySelector(`[data-code-index="${index - 1}"]`)?.focus();
                    }
                  }}
                  inputMode="numeric"
                  maxLength={1}
                  autoFocus={index === 0}
                />
              ))}
            </div>
            <button className="resend-code-btn" type="button" onClick={resendCode} disabled={resendSeconds > 0}>
              {resendSeconds > 0
                ? language === "en"
                  ? `Resend code (${resendSeconds})`
                  : `Renvoyer le code (${resendSeconds})`
                : language === "en"
                  ? "Resend code"
                  : "Renvoyer le code"}
            </button>
          </div>
        ) : (
          <>
            <div className="google-btn-wrap-relative">
              <GoogleSignInButton language={language} onCredential={handleGoogleCredential} />
              {googleProcessing ? (
                <div className="google-btn-loading-overlay">
                  <span className="btn-spinner dark" />
                </div>
              ) : null}
            </div>

            <div className="auth-separator">
              <span>{language === "en" ? "or" : "ou"}</span>
            </div>

            <div className="auth-grid">
              <label>
                {copy.firstName}
                <input
                  value={signupForm.firstName}
                  onChange={(event) => updateSignupField("firstName", event.target.value)}
                  required
                />
              </label>
              <label>
                {copy.lastName}
                <input
                  value={signupForm.lastName}
                  onChange={(event) => updateSignupField("lastName", event.target.value)}
                  required
                />
              </label>
            </div>

            <label>
              {language === "en" ? "Username" : "Nom d'utilisateur"}
              <input
                value={signupForm.username}
                onChange={(event) => updateSignupField("username", event.target.value)}
                required
                aria-invalid={Boolean(signupUsernameError)}
                className={signupForm.username ? (signupUsernameError ? "invalid" : "valid") : ""}
              />
            </label>
            {signupForm.username ? (
              <p className={signupUsernameError ? "field-hint error" : "field-hint success"}>
                {signupUsernameError ? (
                  signupUsernameError
                ) : (
                  <>
                    <UiIcon name="shield" /> {language === "en" ? "Username looks good." : "Nom d'utilisateur valide."}
                  </>
                )}
              </p>
            ) : null}

            <label>
              {copy.email}
              <input
                type="email"
                value={signupForm.email}
                onChange={(event) => updateSignupField("email", event.target.value)}
                required
              />
            </label>

            <label>
              {copy.password}
              <div className="password-field">
                <input
                  type={showSignupPassword ? "text" : "password"}
                  value={signupForm.password}
                  onChange={(event) => updateSignupField("password", event.target.value)}
                  minLength={8}
                  required
                  className={signupForm.password ? (signupForm.password.length >= 8 ? "valid" : "invalid") : ""}
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowSignupPassword((value) => !value)}
                  aria-label={showSignupPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                >
                  <UiIcon name="eye" />
                </button>
              </div>
            </label>
            {signupForm.password ? (
              <p className={signupForm.password.length >= 8 ? "field-hint success" : "field-hint error"}>
                {signupForm.password.length >= 8 ? (
                  <>
                    <UiIcon name="shield" />{" "}
                    {language === "en" ? "Nice, that's a strong password." : "Bien joué. C'est un excellent mot de passe."}
                  </>
                ) : language === "en" ? (
                  "At least 8 characters required."
                ) : (
                  "8 caractères minimum requis."
                )}
              </p>
            ) : null}
          </>
        )}

        {error ? (
          <div className="auth-error">
            <UiIcon name="alert" />
            <span>{error}</span>
          </div>
        ) : null}
        <div className="auth-helper">{helper}</div>

        <div className="auth-actions">
          <button className="btn-main" type="submit" disabled={isSubmitting}>
            {isSubmitting ? <span className="btn-spinner" /> : null}{" "}
            {mode === "login"
              ? loginStep === "identifier" || loginStep === "code"
                ? copy.continue
                : copy.connect
              : signupPhase === "code"
                ? language === "en"
                  ? "Verify"
                  : "Vérifier"
                : copy.createAccount}
          </button>
        </div>
      </form>
            <div className="login-modal-footer">
              <p>
                {mode === "login" ? (
                  <>
                    {language === "en" ? "No account yet?" : "Vous n'avez pas encore de compte ?"}{" "}
                    <button type="button" onClick={() => switchMode("signup")}>
                      {copy.signup}
                    </button>
                  </>
                ) : (
                  <>
                    {language === "en" ? "Already have an account?" : "Vous avez déjà un compte ?"}{" "}
                    <button type="button" onClick={() => switchMode("login")}>
                      {copy.login}
                    </button>
                  </>
                )}
              </p>
              <small>
                {language === "en" ? "Secured by" : "Sécurisé par"} <strong>Career App</strong>
              </small>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function HomePage({ onStart, onSeeTarifs, user, premium, profileCompleteness, latestMatch, cvCount, language }) {
  const copy = APP_COPY[language]?.home || APP_COPY.fr.home;
  const userLabel = `${user?.firstName || ""} ${user?.lastName || ""}`.trim() || copy.userFallback;
  const roleLabel = getAccountLabel(user?.roleType, language);
  const profileLabel =
    profileCompleteness >= 100 ? copy.profileDone : `${copy.profilePct} ${profileCompleteness}%`;
  const scoreLabel = latestMatch?.summary?.globalScore
    ? `${copy.latestMatch} : ${latestMatch.summary.globalScore}/100`
    : copy.noMatch;
  const objectiveLabel = user?.profile?.targetRole
    ? `${copy.objective}: ${user.profile.targetRole}`
    : copy.addTarget;
  const subscription = user?.subscription || {};
  const activePlan = subscription.planId ? getPlanById(subscription.planId) : null;
  const planName = activePlan ? activePlan.name[language] || activePlan.name.fr : language === "en" ? "Essential" : "Essentiel";
  const tokensLabel =
    typeof subscription.credits === "number" && subscription.credits < 999
      ? `${subscription.credits} ${copy.tokens}`
      : copy.unlimitedTokens;
  const planLabel = `${copy.planLabel}: ${planName} · ${tokensLabel}`;
  const cvLabel = cvCount > 0 ? `${cvCount} ${copy.importedCv}` : copy.noCv;
  const schoolLicense = user?.schoolLicense;
  const schoolLabel =
    schoolLicense && !schoolLicense.revoked && schoolLicense.organizationName
      ? `${copy.schoolMember} ${schoolLicense.organizationName}`
      : null;
  const tickerItems = [
    `${copy.welcome} ${userLabel}`,
    `${copy.accountType}: ${roleLabel}`,
    profileLabel,
    cvLabel,
    scoreLabel,
    planLabel,
    ...(schoolLabel ? [schoolLabel] : []),
    objectiveLabel
  ];

  return (
    <section className="home-page">
      <div className="hero-eyebrow">{copy.eyebrow}</div>
      <h2>
        {copy.titleA}
        <br />
        {copy.titleB} <em>{copy.titleAccent}</em>
      </h2>
      <p>{copy.intro}</p>

      <div className="workflow-strip">
        {copy.workflow.map((item) => (
          <article key={item.number}>
            <strong>{item.number}</strong>
            <h3>{item.title}</h3>
            <p>{item.text}</p>
          </article>
        ))}
      </div>

      <div className="home-cta-row">
        <button className="home-primary-cta" onClick={onStart}>
          {copy.start} <UiIcon name="chevron" className="btn-chevron" />
        </button>
        <button type="button" className="home-secondary-cta" onClick={onSeeTarifs}>
          {copy.seeTarifs}
        </button>
      </div>

      <div className="home-ticker" aria-label={copy.tickerLabel}>
        <div className="home-ticker-track">
          {[0, 1].map((copyIndex) => (
            <div className="home-ticker-row" key={copyIndex} aria-hidden={copyIndex === 1}>
              {tickerItems.map((item) => (
                <span className="home-ticker-item" key={`${copyIndex}-${item}`}>
                  {item}
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
function ImportPage({
  latestCv,
  offerText,
  setOfferText,
  onFileUpload,
  onReviewSave,
  onReimport,
  onAnalyse,
  onJobReview,
  jobReview,
  onEditJob,
  onStepClick,
  canAnalyse,
  isReviewingJob,
  isAnalysing,
  matchInsights,
  matchRunId,
  userId,
  subscription,
  onGoToTarifs,
  language,
  importStep,
  isExtractingCv,
  cvReview,
  setCvReview,
  cvFileName,
  cvSourceText,
  avatarDataUrl,
  tokensBalance,
  onApplyOptimization,
  onSaveCvReview,
  onConsumeToken
}) {
  const copy = APP_COPY[language]?.import || APP_COPY.fr.import;
  const activeIndex = importStep === "review" ? 1 : importStep === "job" ? 2 : importStep === "results" ? 3 : 0;
  const stepKeys = ["upload", "review", "job", "results"];
  const maxReachableIndex = importStep === "results" ? 3 : latestCv ? 2 : cvReview ? 1 : 0;

  function updateReview(key, value) {
    setCvReview((prev) => ({ ...(prev || {}), [key]: value }));
  }

  function updateList(key, value) {
    updateReview(key, value.split(",").map((item) => item.trim()).filter(Boolean));
  }

  function updateArrayItem(key, index, value) {
    setCvReview((prev) => ({
      ...(prev || {}),
      [key]: (prev?.[key] || []).map((item, itemIndex) => (itemIndex === index ? value : item))
    }));
  }

  function addArrayItem(key) {
    setCvReview((prev) => ({
      ...(prev || {}),
      [key]: [...(prev?.[key] || []), ""]
    }));
  }

  function removeArrayItem(key, index) {
    setCvReview((prev) => ({
      ...(prev || {}),
      [key]: (prev?.[key] || []).filter((_, itemIndex) => itemIndex !== index)
    }));
  }

  function addCollectionItem(key, item) {
    setCvReview((prev) => ({
      ...(prev || {}),
      [key]: [...(prev?.[key] || []), item]
    }));
  }

  function updateCollectionItem(key, index, field, value) {
    setCvReview((prev) => ({
      ...(prev || {}),
      [key]: (prev?.[key] || []).map((item, itemIndex) => (itemIndex === index ? { ...item, [field]: value } : item))
    }));
  }

  function removeCollectionItem(key, index) {
    setCvReview((prev) => ({
      ...(prev || {}),
      [key]: (prev?.[key] || []).filter((_, itemIndex) => itemIndex !== index)
    }));
  }

  return (
    <section className="import-wizard-page">
      <div className="import-steps">
        {copy.steps.map((step, index) => {
          const isReachable = index <= maxReachableIndex && index !== activeIndex && stepKeys[index] !== "results";
          const StepTag = isReachable ? "button" : "div";
          return (
            <StepTag
              key={step.title}
              type={isReachable ? "button" : undefined}
              className={`import-step ${index === activeIndex ? "active" : ""} ${index < activeIndex ? "done" : ""} ${isReachable ? "clickable" : ""}`}
              onClick={isReachable ? () => onStepClick(stepKeys[index]) : undefined}
              aria-current={index === activeIndex ? "step" : undefined}
            >
              <span>{index < activeIndex ? <UiIcon name="check" /> : index + 1}</span>
              <div>
                <strong>{step.title}</strong>
                <small>{step.text}</small>
              </div>
            </StepTag>
          );
        })}
      </div>

      {importStep === "upload" ? (
        <div className="import-upload-shell">
          <header>
            <h2>{copy.uploadTitle}</h2>
            <p>{copy.uploadText}</p>
          </header>

          <label className={`upload-zone import-dropzone ${latestCv ? "done" : ""}`}>
            <input
              type="file"
              accept=".txt,.md,.pdf,.doc,.docx"
              onChange={(event) => onFileUpload(event.target.files?.[0])}
            />
            {isExtractingCv ? (
              <div className="extracting-state">
                <div className="loader-ring" />
                <strong>{copy.analysingTitle}</strong>
                <span>{copy.analysingText}</span>
              </div>
            ) : (
              <>
                <span className="upload-icon">
                  <UiIcon name="upload" />
                </span>
                <strong>{cvFileName || copy.chooseFile}</strong>
                <span>{copy.formats}</span>
              </>
            )}
          </label>

        </div>
      ) : null}

      {importStep === "review" && cvReview ? (
        <div className="cv-review-shell">
          <div className="review-head">
            <div>
              <h2>{copy.reviewTitle}</h2>
              <p>{copy.reviewText}</p>
            </div>
            <div className="review-actions">
              <button className="btn-secondary" onClick={onReimport}>
                <UiIcon name="upload" />
                {copy.reimport}
              </button>
              <button className="btn-main" onClick={() => onReviewSave(cvReview)}>
                <UiIcon name="save" />
                {copy.saveContinue}
              </button>
            </div>
          </div>

          <div className="cv-review-grid">
            <div className="review-column compact">
              <ReviewCard title={copy.personalInfo} icon="profile">
                <div className="two-cols">
                  <label>
                    {language === "en" ? "First name" : "Prénom"}
                    <input value={cvReview.firstName || ""} onChange={(event) => updateReview("firstName", event.target.value)} />
                  </label>
                  <label>
                    {language === "en" ? "Last name" : "Nom"}
                    <input value={cvReview.lastName || ""} onChange={(event) => updateReview("lastName", event.target.value)} />
                  </label>
                </div>
                <label>
                  Email
                  <input value={cvReview.email || ""} onChange={(event) => updateReview("email", event.target.value)} />
                </label>
                <label>
                  LinkedIn
                  <input value={cvReview.linkedinUrl || ""} onChange={(event) => updateReview("linkedinUrl", event.target.value)} />
                </label>
                <label>
                  {language === "en" ? "Phone" : "Téléphone"}
                  <input value={cvReview.phone || ""} onChange={(event) => updateReview("phone", event.target.value)} />
                </label>
                <label>
                  {language === "en" ? "Location" : "Localisation"}
                  <input value={cvReview.location || ""} onChange={(event) => updateReview("location", event.target.value)} />
                </label>
              </ReviewCard>

              <ReviewCard title={copy.summary} icon="chart">
                <label>
                  {language === "en" ? "Headline" : "Titre professionnel"}
                  <input value={cvReview.headline || ""} onChange={(event) => updateReview("headline", event.target.value)} />
                </label>
                <textarea rows={7} value={cvReview.summary || ""} onChange={(event) => updateReview("summary", event.target.value)} />
              </ReviewCard>
            </div>

            <div className="review-column">
              <ReviewCard title={copy.skillsLanguages} icon="chart">
                <TokenEditor
                  label="Technical skills"
                  items={cvReview.skills || []}
                  addLabel={copy.addSkill}
                  onChange={(index, value) => updateArrayItem("skills", index, value)}
                  onRemove={(index) => removeArrayItem("skills", index)}
                  onAdd={() => addArrayItem("skills")}
                />
                <TokenEditor
                  label={language === "en" ? "Languages" : "Langues"}
                  items={cvReview.languages || []}
                  addLabel={copy.addLanguage}
                  onChange={(index, value) => updateArrayItem("languages", index, value)}
                  onRemove={(index) => removeArrayItem("languages", index)}
                  onAdd={() => addArrayItem("languages")}
                />
              </ReviewCard>

              <ReviewCard title={copy.experiences} icon="briefcase">
                {(cvReview.experiences || []).map((item, index) => (
                  <EditableBlock
                    key={`exp-${index}`}
                    title={[item.company, item.role].filter(Boolean).join("  |  ") || `${copy.experiences} ${index + 1}`}
                    onRemove={() => removeCollectionItem("experiences", index)}
                  >
                    <div className="two-cols field-grid">
                      <label>
                        {language === "en" ? "Company" : "Entreprise"}
                        <input value={item.company || ""} onChange={(event) => updateCollectionItem("experiences", index, "company", event.target.value)} />
                      </label>
                      <label>
                        {language === "en" ? "Role" : "Rôle"}
                        <input value={item.role || ""} onChange={(event) => updateCollectionItem("experiences", index, "role", event.target.value)} />
                      </label>
                    </div>
                    <label>
                      Dates
                      <input value={item.dates || ""} onChange={(event) => updateCollectionItem("experiences", index, "dates", event.target.value)} />
                    </label>
                    <label>
                      Description
                      <textarea rows={4} value={item.description || ""} onChange={(event) => updateCollectionItem("experiences", index, "description", event.target.value)} />
                    </label>
                  </EditableBlock>
                ))}
                <button className="btn-ghost full" onClick={() => addCollectionItem("experiences", { company: "", role: "", dates: "", description: "" })}>
                  + {copy.addExperience}
                </button>
              </ReviewCard>

              <ReviewCard title={copy.educationBlock} icon="chart">
                {(cvReview.educationItems || []).length ? (
                  (cvReview.educationItems || []).map((item, index) => (
                  <EditableBlock
                    key={`edu-${index}`}
                    title={[item.school, item.degree].filter(Boolean).join("  |  ") || `${copy.educationBlock} ${index + 1}`}
                    onRemove={() => removeCollectionItem("educationItems", index)}
                  >
                    <div className="two-cols field-grid">
                      <label>
                        {language === "en" ? "School" : "École"}
                        <input value={item.school || ""} onChange={(event) => updateCollectionItem("educationItems", index, "school", event.target.value)} />
                      </label>
                      <label>
                        {language === "en" ? "Degree" : "Diplôme"}
                        <input value={item.degree || ""} onChange={(event) => updateCollectionItem("educationItems", index, "degree", event.target.value)} />
                      </label>
                    </div>
                    <label>
                      Dates
                      <input value={item.dates || ""} onChange={(event) => updateCollectionItem("educationItems", index, "dates", event.target.value)} />
                    </label>
                    <label>
                      Description
                      <textarea rows={3} value={item.description || ""} onChange={(event) => updateCollectionItem("educationItems", index, "description", event.target.value)} />
                    </label>
                  </EditableBlock>
                  ))
                ) : (
                  <p className="review-empty">{language === "en" ? "No education detected. Add it manually if needed." : "Aucune formation détectée. Ajoute-la manuellement si besoin."}</p>
                )}
                <button className="btn-ghost full" onClick={() => addCollectionItem("educationItems", { school: "", degree: "", dates: "", description: "" })}>
                  + {copy.addEducation}
                </button>
              </ReviewCard>

              <ReviewCard title={copy.certifications} icon="shield">
                {(cvReview.certifications || []).length ? (
                  (cvReview.certifications || []).map((item, index) => (
                  <EditableBlock
                    key={`cert-${index}`}
                    title={item.name || `${copy.certifications} ${index + 1}`}
                    onRemove={() => removeCollectionItem("certifications", index)}
                  >
                    <div className="two-cols field-grid">
                      <label>
                        {language === "en" ? "Certification name" : "Nom de la certification"}
                        <input value={item.name || ""} onChange={(event) => updateCollectionItem("certifications", index, "name", event.target.value)} />
                      </label>
                      <label>
                        {language === "en" ? "Validation link" : "Lien de validation"}
                        <input placeholder="https://..." value={item.url || ""} onChange={(event) => updateCollectionItem("certifications", index, "url", event.target.value)} />
                      </label>
                    </div>
                  </EditableBlock>
                  ))
                ) : (
                  <p className="review-empty">{language === "en" ? "No certification detected." : "Aucune certification détectée."}</p>
                )}
                <button className="btn-ghost full" onClick={() => addCollectionItem("certifications", { name: "", url: "" })}>
                  + {copy.addCertification}
                </button>
              </ReviewCard>

              <ReviewCard title={copy.interests} icon="chat">
                {(cvReview.interests || []).length ? (
                  <TokenEditor
                    label="Interests"
                    items={cvReview.interests || []}
                    addLabel={copy.addInterest}
                    onChange={(index, value) => updateArrayItem("interests", index, value)}
                    onRemove={(index) => removeArrayItem("interests", index)}
                    onAdd={() => addArrayItem("interests")}
                  />
                ) : (
                  <>
                    <p className="review-empty">{language === "en" ? "No interest detected." : "Aucun centre d'intérêt détecté."}</p>
                    <button type="button" className="btn-ghost token-add" onClick={() => addArrayItem("interests")}>
                      + {copy.addInterest}
                    </button>
                  </>
                )}
              </ReviewCard>
            </div>
          </div>
        </div>
      ) : null}

      {importStep === "job" ? (
        <div className="job-target-shell">
          {!jobReview ? (
            <>
              <header>
                <h2>{copy.jobTitle}</h2>
                <p>{copy.jobText}</p>
              </header>
              <div className="card block job-card">
                <label>
                  {copy.jobDescription}
                  <textarea
                    value={offerText}
                    onChange={(event) => setOfferText(event.target.value)}
                    placeholder={copy.offerPlaceholder}
                    rows={12}
                  />
                </label>
                <div className="counter-row">
                  <span>{offerText.trim().length} {copy.chars}</span>
                  <span>{offerText.trim().length > 50 ? copy.ready : copy.minimum}</span>
                </div>
                <button className={`btn-main ${offerText.trim().length > 50 ? "ready" : ""}`} disabled={offerText.trim().length <= 50 || isReviewingJob} onClick={onJobReview}>
                  {isReviewingJob ? (
                    <>
                      <span className="btn-spinner" /> {copy.reviewingJob}
                    </>
                  ) : (
                    <>
                      {copy.reviewJob} <UiIcon name="chevron" className="btn-chevron" />
                    </>
                  )}
                </button>
              </div>
            </>
          ) : (
            <>
              <header>
                <h2>{copy.jobSummaryTitle}</h2>
                <p>{copy.jobSummaryText}</p>
              </header>
              <article className="job-summary-card">
                <div className="job-summary-title">
                  <span>
                    <UiIcon name="briefcase" />
                  </span>
                  <h3>{jobReview.title}</h3>
                </div>
                <div className="job-summary-company">
                  <UiIcon name="briefcase" />
                  <strong>{jobReview.company}</strong>
                </div>
                <div className="job-description-box">
                  <strong>Description</strong>
                  <p>{jobReview.description}</p>
                </div>
                <div className="job-skill-groups">
                  <div>
                    <h4>{copy.technicalSkills}</h4>
                    <div className="job-chip-row">
                      {jobReview.skills?.length ? (
                        jobReview.skills.map((skill) => <span key={skill}>{skill}</span>)
                      ) : (
                        <span className="muted">{copy.noSkillsDetected}</span>
                      )}
                    </div>
                  </div>
                  <div>
                    <h4>{copy.softSkills}</h4>
                    <div className="job-chip-row">
                      {jobReview.softSkills?.length ? (
                        jobReview.softSkills.map((skill) => <span key={skill}>{skill}</span>)
                      ) : (
                        <span className="muted">{copy.noSkillsDetected}</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="job-summary-actions">
                  <button className="btn-secondary" onClick={onEditJob}>{copy.backToEdit}</button>
                  <button className={`btn-main ${canAnalyse ? "ready" : ""}`} disabled={!canAnalyse} onClick={onAnalyse}>
                    {isAnalysing ? copy.analysing : copy.analyseJob} <UiIcon name="chevron" className="btn-chevron" />
                  </button>
                </div>
              </article>
            </>
          )}
        </div>
      ) : null}

      {importStep === "results" ? (
        <MatchResultsStep
          isAnalysing={isAnalysing}
          matchInsights={matchInsights}
          matchRunId={matchRunId}
          userId={userId}
          subscription={subscription}
          onGoToTarifs={onGoToTarifs}
          jobReview={jobReview}
          cvReview={cvReview}
          cvSourceText={cvSourceText}
          copy={copy}
          language={language}
          avatarDataUrl={avatarDataUrl}
          cvId={latestCv?.id || ""}
          tokensBalance={tokensBalance}
          onApplyOptimization={onApplyOptimization}
          onSaveCvReview={onSaveCvReview}
          onConsumeToken={onConsumeToken}
        />
      ) : null}
    </section>
  );
}

function fillTemplate(template, values) {
  return String(template || "").replace(/\{(\w+)\}/g, (match, key) => (values[key] != null && values[key] !== "" ? values[key] : match));
}

const CV_LANGUAGE_MARKERS = {
  fr: ["le ", "la ", "les ", "des ", "et ", "avec ", "pour ", "expérience", "compétences", "formation", "diplôme", "années", "projet", "responsable", "société", "entreprise"],
  en: ["the ", "and ", "with ", "for ", "experience", "skills", "education", "degree", "years", "project", "responsible", "company", "team"]
};

function linkedinSearchUrl(query) {
  return `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(query)}`;
}

function buildNetworkingQueries({ title, company, language, copy }) {
  if (!company) return [];
  const roleWord = title ? title.split(/[\/,|-]/)[0].trim() : "";
  const recruiterWord = language === "en" ? "Recruiter" : "Recruteur";
  const hrWord = language === "en" ? "Talent Acquisition" : "RH Ressources Humaines";

  return [
    { label: copy.matchNetworkingRoleLabel, query: [roleWord, company].filter(Boolean).join(" ") },
    { label: copy.matchNetworkingRecruiterLabel, query: `${recruiterWord} ${company}` },
    { label: copy.matchNetworkingHrLabel, query: `${hrWord} ${company}` }
  ].filter((item) => item.query.trim().length > company.length);
}

function detectCvLanguage(text) {
  const normalized = ` ${String(text || "").toLowerCase()} `;
  if (!normalized.trim()) return "";

  let frScore = 0;
  let enScore = 0;
  for (const marker of CV_LANGUAGE_MARKERS.fr) {
    if (normalized.includes(marker)) frScore += 1;
  }
  for (const marker of CV_LANGUAGE_MARKERS.en) {
    if (normalized.includes(marker)) enScore += 1;
  }

  if (frScore === 0 && enScore === 0) return "";
  return frScore >= enScore ? "fr" : "en";
}

function MatchResultsStep({
  isAnalysing,
  matchInsights,
  matchRunId,
  userId,
  subscription,
  onGoToTarifs,
  jobReview,
  cvReview,
  cvSourceText,
  copy,
  language,
  avatarDataUrl,
  cvId,
  tokensBalance,
  onApplyOptimization,
  onSaveCvReview,
  onConsumeToken
}) {
  const [feedback, setFeedback] = useState(null);
  const [feedbackSaving, setFeedbackSaving] = useState(false);
  const [networkingState, setNetworkingState] = useState("idle");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [shareStatus, setShareStatus] = useState("idle");
  const [trackerStatus, setTrackerStatus] = useState("idle");
  const [trackerApplicationId, setTrackerApplicationId] = useState(null);
  const trackerLockRef = useRef(false);
  const cvCopy = APP_COPY[language]?.cv || APP_COPY.fr.cv;
  const applicationsCopy = APP_COPY[language]?.applications || APP_COPY.fr.applications;
  const [atsOptimization, setAtsOptimization] = useState(null);
  const [isAtsOptimizing, setIsAtsOptimizing] = useState(false);
  const [atsError, setAtsError] = useState("");
  const [atsApplied, setAtsApplied] = useState(false);
  const [atsSaving, setAtsSaving] = useState(false);
  const hasOfferContext = Boolean(cvReview?.experiences?.length || cvReview?.summary) && Boolean(jobReview?.title);
  const outOfTokens = tokensBalance < 999 && tokensBalance <= 0;

  async function handleAtsOptimize() {
    if (!hasOfferContext || isAtsOptimizing) return;
    if (outOfTokens) {
      onGoToTarifs();
      return;
    }
    setAtsError("");
    setAtsApplied(false);
    setIsAtsOptimizing(true);
    try {
      const result = await optimizeCvForAts({ candidate: cvReview, offer: jobReview, language });
      setAtsOptimization(result);
      await onConsumeToken();
    } catch (err) {
      setAtsError(getFriendlyErrorMessage(err, language));
    } finally {
      setIsAtsOptimizing(false);
    }
  }

  async function handleAtsApply() {
    if (!atsOptimization || atsSaving) return;
    const compact = (value) => String(value || "").toLowerCase().trim();
    const nextExperiences = (cvReview.experiences || []).map((exp) => {
      const match = atsOptimization.experiences.find((item) => compact(item.company) === compact(exp.company));
      return match ? { ...exp, description: match.optimizedDescription } : exp;
    });
    const nextReview = {
      ...cvReview,
      headline: atsOptimization.optimizedHeadline || cvReview.headline,
      summary: atsOptimization.optimizedSummary || cvReview.summary,
      skills: atsOptimization.prioritizedSkills?.length ? atsOptimization.prioritizedSkills : cvReview.skills,
      experiences: nextExperiences
    };
    onApplyOptimization(nextReview);
    setAtsSaving(true);
    setAtsError("");
    try {
      // Enregistré tout de suite en base, sans faire naviguer l'utilisateur
      // vers une autre étape du wizard (qui ferait perdre sa progression).
      await onSaveCvReview(nextReview);
      setAtsApplied(true);
    } catch (err) {
      setAtsApplied(false);
      setAtsError(getFriendlyErrorMessage(err, language));
    } finally {
      setAtsSaving(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    setFeedback(null);
    if (!userId || !matchRunId) return undefined;

    getMatchFeedback({ userId, matchRunId }).then((existing) => {
      if (!cancelled && existing) {
        setFeedback(existing.useful ? "yes" : "no");
      }
    });

    return () => {
      cancelled = true;
    };
  }, [userId, matchRunId]);

  // Vérifie si cette offre (même poste + même entreprise) est déjà dans le
  // suivi de candidatures, pour ne pas proposer d'en créer un doublon quand
  // l'utilisateur revient sur cette analyse plus tard.
  useEffect(() => {
    let cancelled = false;
    setTrackerStatus("idle");
    setTrackerApplicationId(null);
    if (!userId || !jobReview?.title) return undefined;

    const compact = (value) => String(value || "").toLowerCase().trim();
    listJobApplications(userId).then((list) => {
      if (cancelled) return;
      const existing = (list || []).find(
        (app) => compact(app.title) === compact(jobReview.title) && compact(app.company) === compact(jobReview.company)
      );
      if (existing) {
        setTrackerApplicationId(existing.id);
        setTrackerStatus("done");
      }
    });

    return () => {
      cancelled = true;
    };
  }, [userId, jobReview?.title, jobReview?.company]);

  async function handleFeedback(useful) {
    if (feedbackSaving || !userId || !matchRunId) return;
    const previous = feedback;
    setFeedback(useful ? "yes" : "no");
    setFeedbackSaving(true);
    try {
      await submitMatchFeedback({ userId, matchRunId, useful });
    } catch (_error) {
      setFeedback(previous);
    } finally {
      setFeedbackSaving(false);
    }
  }

  function fireTrackerToast(icon, title) {
    Swal.fire({
      toast: true,
      position: "top-end",
      icon,
      title,
      showConfirmButton: false,
      timer: icon === "error" ? 4200 : 3200,
      timerProgressBar: true,
      customClass: {
        popup: "career-toast",
        title: "career-toast-title"
      }
    });
  }

  async function handleAddToTracker() {
    // Garde-fou synchrone : trackerStatus (state React) ne se met à jour
    // qu'au prochain rendu, donc un double-clic très rapide peut passer ce
    // contrôle deux fois avant que le bouton soit visuellement désactivé.
    // trackerLockRef, lui, change de valeur immédiatement, sans attendre
    // de rendu — il bloque vraiment dès le premier clic.
    if (!userId || trackerLockRef.current) return;
    trackerLockRef.current = true;
    setTrackerStatus("saving");
    try {
      const created = await createJobApplication({
        userId,
        status: "to_apply",
        title: jobReview?.title || "",
        company: jobReview?.company || "",
        location: jobReview?.location || "",
        offerText: jobReview?.description || "",
        matchScore: typeof matchInsights?.score === "number" ? matchInsights.score : null,
        cvId: cvId || ""
      });
      setTrackerApplicationId(created.id);
      setTrackerStatus("done");
      fireTrackerToast("success", applicationsCopy.addedToTracker);
    } catch (error) {
      setTrackerStatus("idle");
      fireTrackerToast("error", getFriendlyErrorMessage(error, language));
    } finally {
      trackerLockRef.current = false;
    }
  }

  async function handleRemoveFromTracker() {
    if (!userId || !trackerApplicationId || trackerLockRef.current) return;
    trackerLockRef.current = true;
    setTrackerStatus("removing");
    try {
      await deleteJobApplication({ id: trackerApplicationId, userId });
      setTrackerApplicationId(null);
      setTrackerStatus("idle");
      fireTrackerToast("success", applicationsCopy.removedFromTracker);
    } catch (error) {
      setTrackerStatus("done");
      fireTrackerToast("error", getFriendlyErrorMessage(error, language));
    } finally {
      trackerLockRef.current = false;
    }
  }

  if (isAnalysing || !matchInsights) {
    return (
      <div className="match-results-shell">
        <div className="extracting-state match-loading">
          <div className="loader-ring" />
          <strong>{copy.matchingTitle}</strong>
          <span>{copy.matchingText}</span>
        </div>
      </div>
    );
  }

  const missingKeywords = matchInsights.missingKeywords || [];
  const company = jobReview?.company || "";
  const title = jobReview?.title || "";
  const searchQuery = [company, title].filter(Boolean).join(" ") || title || company;
  const networkingQueries = buildNetworkingQueries({ title, company, language, copy });
  const verdictLabel = matchInsights.verdict || ratingLabel(matchInsights.score, language);
  const cvTextSample =
    cvSourceText ||
    [cvReview?.headline, cvReview?.summary, ...(cvReview?.experiences || []).map((item) => item.description)].filter(Boolean).join(" ");
  const detectedCvLanguage = detectCvLanguage(cvTextSample) || language;
  const languageLabel = detectedCvLanguage === "en" ? "English" : "Français";

  function handleFindContacts() {
    setNetworkingState("searching");
    setTimeout(() => setNetworkingState("done"), 700);
  }

  const isFreePlan = !getPlanById(subscription?.planId)?.grantsPremium;

  async function handleShare() {
    if (isFreePlan) {
      onGoToTarifs();
      return;
    }
    const summary = `${title}${company ? ` · ${company}` : ""} — ${copy.matchScoreLabel}: ${matchInsights.score}/100 (${verdictLabel})`;
    try {
      if (navigator.share) {
        await navigator.share({ title: copy.matchResultsTitle, text: summary });
        return;
      }
      await navigator.clipboard.writeText(summary);
      setShareStatus("copied");
      setTimeout(() => setShareStatus("idle"), 2400);
    } catch (_error) {
      // Share cancelled or unavailable, nothing to surface.
    }
  }

  function handleDownloadPdf() {
    if (isFreePlan) {
      onGoToTarifs();
      return;
    }
    if (!cvReview) {
      window.print();
      return;
    }
    // Le bouton doit imprimer uniquement le CV, pas toute la page de
    // résultats (score, recommandations, réseautage...). On force l'aperçu
    // CV à s'ouvrir si besoin, on masque le reste via une classe le temps de
    // l'impression, puis on restaure l'état initial.
    const wasPreviewOpen = previewOpen;
    if (!wasPreviewOpen) setPreviewOpen(true);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        document.body.classList.add("print-cv-only");
        window.print();
        document.body.classList.remove("print-cv-only");
        if (!wasPreviewOpen) setPreviewOpen(false);
      });
    });
  }

  const scoreTier =
    matchInsights.score >= 80 ? "excellent" : matchInsights.score >= 65 ? "good" : matchInsights.score >= 50 ? "average" : "weak";

  return (
    <div className="match-results-shell" id="match-print-area">
      <div className="match-top-grid">
        <article className="card match-score-card">
          <h3>
            <UiIcon name="chart" /> {copy.matchScoreLabel}
          </h3>
          <div className={`score-ring match-score-ring-lg tier-${scoreTier}`} style={{ "--pct": `${matchInsights.score}%` }}>
            <strong>{matchInsights.score}%</strong>
          </div>
          <span className={`match-verdict-pill tier-${scoreTier}`}>{verdictLabel}</span>
          {trackerStatus === "done" ? (
            <button
              type="button"
              className="btn-secondary match-tracker-btn match-tracker-btn-remove no-print"
              disabled={trackerStatus === "removing"}
              onClick={handleRemoveFromTracker}
            >
              <UiIcon name="trash" />
              {trackerStatus === "removing" ? applicationsCopy.formSaving : applicationsCopy.removeFromTrackerBtn}
            </button>
          ) : (
            <button
              type="button"
              className="btn-secondary match-tracker-btn no-print"
              disabled={trackerStatus === "saving"}
              onClick={handleAddToTracker}
            >
              <UiIcon name="briefcase" />
              {trackerStatus === "saving" ? applicationsCopy.formSaving : applicationsCopy.addToTrackerBtn}
            </button>
          )}
        </article>

        <article className="card match-results-card">
          <h3>
            <UiIcon name="chart" /> {copy.matchResultsTitle}
          </h3>
          <p className="muted">{copy.matchResultsSubtitle}</p>
          <div className="match-grid">
            <div className="match-subblock match-subblock-success">
              <h4 className="success-heading">
                <UiIcon name="shield" /> {copy.matchStrengths}
              </h4>
              <ul className="match-strength-list">
                {(matchInsights.strengths || []).map((point, index) => (
                  <li key={`${point}-${index}`}>{point}</li>
                ))}
              </ul>
            </div>

            <div className="match-subblock match-subblock-danger">
              <h4 className="danger-heading">
                <UiIcon name="alert" /> {copy.matchMissingKeywords}
              </h4>
              {missingKeywords.length ? (
                <div className="job-chip-row missing-keyword-row">
                  {missingKeywords.map((keyword) => (
                    <span key={keyword} className="missing-keyword-chip">
                      {keyword}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="muted">{copy.matchNoMissingKeywords}</p>
              )}
            </div>
          </div>
        </article>
      </div>

      <article className="card block cultural-fit-card">
        <h3>
          <UiIcon name="chat" /> {copy.matchCulturalFit}
        </h3>
        <div className="cultural-fit-box">
          <p>{matchInsights.culturalFit}</p>
        </div>
      </article>

      <article className="card block match-block">
        <div className="match-block-head">
          <h3>
            <UiIcon name="chart" /> {copy.matchRecommendations}
          </h3>
          <div className="match-feedback no-print">
            {feedback ? (
              <span className="match-feedback-thanks">{copy.matchFeedbackThanks}</span>
            ) : (
              <>
                <span>{copy.matchFeedbackQuestion}</span>
                <button type="button" className="match-feedback-btn" disabled={feedbackSaving} onClick={() => handleFeedback(true)}>
                  <UiIcon name="thumbUp" /> {copy.matchFeedbackYes}
                </button>
                <button type="button" className="match-feedback-btn" disabled={feedbackSaving} onClick={() => handleFeedback(false)}>
                  <UiIcon name="thumbDown" /> {copy.matchFeedbackNo}
                </button>
              </>
            )}
          </div>
        </div>
        <ol className="match-recommendation-list">
          {(matchInsights.recommendations || []).map((item, index) => (
            <li key={`${item.title}-${index}`} className={`match-recommendation ${levelTag(item.level)}`}>
              <span className="match-recommendation-index">{index + 1}</span>
              <div className="match-recommendation-body">
                <div className="match-recommendation-head">
                  <strong>{item.title}</strong>
                  <span className={`match-recommendation-level ${levelTag(item.level)}`}>
                    {recommendationLevelLabel(item.level, language)}
                  </span>
                </div>
                <p>{item.detail}</p>
              </div>
            </li>
          ))}
        </ol>
      </article>

      <article className="card block ats-optimize-card no-print">
        <h3>
          <UiIcon name="spark" /> {cvCopy.atsOptimizeTitle}
        </h3>
        <p className="muted">{cvCopy.atsOptimizeText}</p>
        {atsError ? <p className="field-error">{atsError}</p> : null}
        {!hasOfferContext ? (
          <p className="muted">{cvCopy.atsNoOffer}</p>
        ) : (
          <button type="button" className="btn-main ready" onClick={handleAtsOptimize} disabled={isAtsOptimizing}>
            {isAtsOptimizing ? (
              <>
                <span className="btn-spinner" /> {cvCopy.atsOptimizing}
              </>
            ) : (
              cvCopy.atsOptimizeBtn
            )}
          </button>
        )}

        {atsOptimization ? (
          <div className="ats-result">
            <h4>{cvCopy.atsResultTitle}</h4>
            {atsOptimization.optimizedHeadline ? (
              <div className="ats-result-block">
                <span className="muted">{cvCopy.atsHeadline}</span>
                <p>{atsOptimization.optimizedHeadline}</p>
              </div>
            ) : null}
            {atsOptimization.optimizedSummary ? (
              <div className="ats-result-block">
                <span className="muted">{cvCopy.atsSummary}</span>
                <p>{atsOptimization.optimizedSummary}</p>
              </div>
            ) : null}
            {atsOptimization.experiences?.length ? (
              <div className="ats-result-block">
                <span className="muted">{cvCopy.atsExperiences}</span>
                {atsOptimization.experiences.map((item, index) => (
                  <div key={`${item.company}-${index}`} className="ats-result-experience">
                    <strong>{item.role} · {item.company}</strong>
                    <CvEntryDescription text={item.optimizedDescription} />
                  </div>
                ))}
              </div>
            ) : null}
            {atsOptimization.prioritizedSkills?.length ? (
              <div className="ats-result-block">
                <span className="muted">{cvCopy.atsSkillsOrder}</span>
                <div className="cv-document-skill-chips">
                  {atsOptimization.prioritizedSkills.map((skill) => (
                    <span key={skill} className="cv-document-skill-chip">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
            {atsOptimization.missingKeywords?.length ? (
              <div className="ats-result-block">
                <span className="muted">{cvCopy.atsMissingKeywords}</span>
                <div className="cv-document-skill-chips">
                  {atsOptimization.missingKeywords.map((skill) => (
                    <span key={skill} className="cv-document-skill-chip soft">
                      {skill}
                    </span>
                  ))}
                </div>
                <p className="ats-missing-hint muted">{cvCopy.atsMissingKeywordsHint}</p>
              </div>
            ) : null}
            {atsOptimization.atsNotes ? (
              <div className="ats-result-block">
                <span className="muted">{cvCopy.atsNotesTitle}</span>
                <p>{atsOptimization.atsNotes}</p>
              </div>
            ) : null}
            <button type="button" className="btn-main ready" onClick={handleAtsApply} disabled={atsSaving}>
              {atsSaving ? (
                <>
                  <span className="btn-spinner" /> {cvCopy.atsApplying}
                </>
              ) : (
                <>
                  <UiIcon name="check" /> {cvCopy.atsApply}
                </>
              )}
            </button>
            {atsApplied ? <p className="ats-applied-hint">{cvCopy.atsApplied}</p> : null}
          </div>
        ) : null}
      </article>

      <article className="card block match-networking-card no-print">
        <h3>
          <UiIcon name="briefcase" /> {copy.matchNetworkingTitle}
        </h3>
        <p className="muted">{fillTemplate(copy.matchNetworkingText, { company: company || "cette entreprise" })}</p>
        <button type="button" className="btn-main ready" onClick={handleFindContacts} disabled={networkingState === "searching"}>
          {networkingState === "searching" ? copy.matchNetworkingSearching : copy.matchNetworkingButton}
        </button>
        {networkingState === "done" ? (
          <div className="match-networking-result">
            <p>{copy.matchNetworkingEmpty}</p>
            <div className="match-networking-links">
              {(networkingQueries.length ? networkingQueries : [{ label: copy.matchNetworkingOpenLinkedin, query: searchQuery }]).map(
                (item) => (
                  <a key={item.label} href={linkedinSearchUrl(item.query)} target="_blank" rel="noreferrer">
                    <UiIcon name="briefcase" />
                    <span>{item.label}</span>
                    <UiIcon name="chevron" className="match-networking-arrow" />
                  </a>
                )
              )}
            </div>
          </div>
        ) : null}
      </article>

      {previewOpen ? (
        <CvPreviewCard cvReview={cvReview} copy={copy} language={language} avatarDataUrl={avatarDataUrl} onClose={() => setPreviewOpen(false)} />
      ) : null}

      <div className="match-action-bar no-print">
        <div className="match-language-pill">
          <UiIcon name="globe" />
          <span>{copy.matchCvLanguageLabel}</span>
          <strong>{languageLabel}</strong>
        </div>
        <div className="match-action-buttons">
          <button type="button" className="btn-secondary" onClick={() => setPreviewOpen((value) => !value)}>
            <UiIcon name="eye" /> {previewOpen ? copy.matchHidePreview : copy.matchPreviewCv}
          </button>
          <button type="button" className="btn-secondary" onClick={handleShare}>
            <UiIcon name="share" /> {shareStatus === "copied" ? copy.matchShareCopied : copy.matchShare}
          </button>
          <button type="button" className="btn-main ready" onClick={handleDownloadPdf}>
            <UiIcon name="download" /> {copy.matchDownloadPdf}
          </button>
        </div>
      </div>
    </div>
  );
}

// Rend une description d'expérience/formation en points distincts (une
// réalisation par ligne) plutôt qu'un seul paragraphe bloc — bien plus lisible
// dès qu'il y a plusieurs missions. Le texte source peut arriver déjà
// découpé par \n (heuristique et prompt IA) ou en un seul bloc plus ancien ;
// dans ce dernier cas on retombe sur un découpage par phrase.
function CvEntryDescription({ text }) {
  if (!text) return null;
  const rawLines = text.includes("\n") ? text.split("\n") : text.split(/(?<=[.!?])\s+(?=[A-ZÀ-Ý])/);
  const lines = rawLines.map((line) => line.trim()).filter(Boolean);
  if (lines.length <= 1) {
    return <p className="cv-document-entry-desc">{lines[0] || text}</p>;
  }
  return (
    <ul className="cv-document-entry-desc-list">
      {lines.map((line, index) => (
        <li key={index}>{line}</li>
      ))}
    </ul>
  );
}

const APPLICATION_COLUMNS = ["to_apply", "applied", "interview", "offer", "rejected"];

function ApplicationsPage({ language, userId, cvHistory }) {
  const copy = APP_COPY[language]?.applications || APP_COPY.fr.applications;
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  useEffect(() => {
    let cancelled = false;
    if (!userId) {
      setItems([]);
      setIsLoading(false);
      return undefined;
    }
    setIsLoading(true);
    listJobApplications(userId)
      .then((list) => {
        if (!cancelled) setItems(list || []);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const STATUS_MESSAGE_KEYS = {
    to_apply: "statusMessageToApply",
    applied: "statusMessageApplied",
    interview: "statusMessageInterview",
    offer: "statusMessageOffer",
    rejected: "statusMessageRejected"
  };
  const STATUS_TOAST_ICONS = {
    to_apply: "info",
    applied: "success",
    interview: "success",
    offer: "success",
    rejected: "info"
  };

  async function handleStatusChange(item, status) {
    if (item.status === status) return;
    const previousStatus = item.status;
    setItems((prev) => prev.map((it) => (it.id === item.id ? { ...it, status } : it)));
    try {
      await updateJobApplication(item.id, { userId, status });
      const template = copy[STATUS_MESSAGE_KEYS[status]];
      if (template) {
        Swal.fire({
          toast: true,
          position: "top-end",
          icon: STATUS_TOAST_ICONS[status] || "success",
          title: fillTemplate(template, { title: item.title || "—", company: item.company || "—" }),
          showConfirmButton: false,
          timer: 3800,
          timerProgressBar: true,
          customClass: {
            popup: "career-toast",
            title: "career-toast-title"
          }
        });
      }
    } catch (_error) {
      setItems((prev) => prev.map((it) => (it.id === item.id ? { ...it, status: previousStatus } : it)));
    }
  }

  async function handleDelete(item) {
    const result = await Swal.fire({
      icon: "warning",
      title: copy.deleteConfirmTitle,
      text: [item.title, item.company].filter(Boolean).join(" · "),
      showCancelButton: true,
      confirmButtonText: copy.delete,
      cancelButtonText: copy.formCancel,
      confirmButtonColor: "#dc2626"
    });
    if (!result.isConfirmed) return;
    const previous = items;
    setItems((prev) => prev.filter((it) => it.id !== item.id));
    try {
      await deleteJobApplication({ id: item.id, userId });
    } catch (_error) {
      setItems(previous);
    }
  }

  async function handleSubmit(payload) {
    if (editingItem) {
      const updated = await updateJobApplication(editingItem.id, { userId, ...payload });
      setItems((prev) => prev.map((it) => (it.id === updated.id ? updated : it)));
    } else {
      const created = await createJobApplication({ userId, ...payload });
      setItems((prev) => [created, ...prev]);
    }
    setFormOpen(false);
    setEditingItem(null);
  }

  const columnLabels = {
    to_apply: copy.columnToApply,
    applied: copy.columnApplied,
    interview: copy.columnInterview,
    offer: copy.columnOffer,
    rejected: copy.columnRejected
  };

  return (
    <section className="applications-page">
      <div className="applications-header">
        <div>
          <h2>{copy.title}</h2>
          <p className="muted">{copy.text}</p>
        </div>
        <button
          type="button"
          className="btn-main ready"
          onClick={() => {
            setEditingItem(null);
            setFormOpen(true);
          }}
        >
          <UiIcon name="plus" /> {copy.addButton}
        </button>
      </div>

      {isLoading ? (
        <div className="extracting-state">
          <div className="loader-ring" />
          <span>{copy.loading}</span>
        </div>
      ) : (
        <div className="kanban-board">
          {APPLICATION_COLUMNS.map((columnKey) => {
            const columnItems = items.filter((item) => item.status === columnKey);
            return (
              <div
                key={columnKey}
                className="kanban-column"
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                  event.preventDefault();
                  const id = event.dataTransfer.getData("text/plain");
                  const item = items.find((it) => it.id === id);
                  if (item) handleStatusChange(item, columnKey);
                }}
              >
                <div className="kanban-column-head">
                  <span>{columnLabels[columnKey]}</span>
                  <span className="kanban-count">{columnItems.length}</span>
                </div>
                <div className="kanban-column-body">
                  {columnItems.length ? (
                    columnItems.map((item) => (
                      <article
                        key={item.id}
                        className="kanban-card"
                        draggable
                        onDragStart={(event) => event.dataTransfer.setData("text/plain", item.id)}
                      >
                        <div className="kanban-card-head">
                          <strong>{item.title || "—"}</strong>
                          {typeof item.matchScore === "number" ? <span className="kanban-score">{item.matchScore}%</span> : null}
                        </div>
                        {item.company ? <p className="kanban-company">{item.company}</p> : null}
                        {item.location ? <p className="kanban-location">{item.location}</p> : null}
                        <p className="kanban-date">
                          {item.status === "applied" && item.appliedAt
                            ? `${copy.appliedAtLabel} ${formatShortDate(item.appliedAt, language)}`
                            : `${copy.addedOnLabel} ${formatShortDate(item.createdAt, language)}`}
                        </p>
                        <div className="kanban-card-actions">
                          {item.offerUrl ? (
                            <a href={item.offerUrl} target="_blank" rel="noreferrer" title={copy.cardOpenOffer}>
                              <UiIcon name="chevron" />
                            </a>
                          ) : null}
                          <button
                            type="button"
                            title={copy.edit}
                            onClick={() => {
                              setEditingItem(item);
                              setFormOpen(true);
                            }}
                          >
                            <UiIcon name="edit" />
                          </button>
                          <button type="button" title={copy.delete} onClick={() => handleDelete(item)}>
                            <UiIcon name="trash" />
                          </button>
                        </div>
                      </article>
                    ))
                  ) : (
                    <p className="kanban-empty muted">{copy.empty}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {formOpen ? (
        <ApplicationFormModal
          copy={copy}
          item={editingItem}
          cvHistory={cvHistory}
          onClose={() => {
            setFormOpen(false);
            setEditingItem(null);
          }}
          onSubmit={handleSubmit}
        />
      ) : null}
    </section>
  );
}

function ApplicationFormModal({ copy, item, cvHistory, onClose, onSubmit }) {
  const [form, setForm] = useState({
    title: item?.title || "",
    company: item?.company || "",
    location: item?.location || "",
    offerUrl: item?.offerUrl || "",
    cvId: item?.cvId || "",
    notes: item?.notes || "",
    status: item?.status || "to_apply"
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  function update(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!form.title.trim() && !form.company.trim()) {
      setError(copy.formError);
      return;
    }
    setError("");
    setSaving(true);
    try {
      await onSubmit(form);
    } catch (err) {
      setError(err?.message || copy.formError);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(event) => event.stopPropagation()}>
        <form onSubmit={handleSubmit} className="application-form">
          <input
            value={form.title}
            onChange={(event) => update("title", event.target.value)}
            placeholder={copy.formTitlePlaceholder}
          />
          <input
            value={form.company}
            onChange={(event) => update("company", event.target.value)}
            placeholder={copy.formCompanyPlaceholder}
          />
          <input
            value={form.location}
            onChange={(event) => update("location", event.target.value)}
            placeholder={copy.formLocationPlaceholder}
          />
          <input
            value={form.offerUrl}
            onChange={(event) => update("offerUrl", event.target.value)}
            placeholder={copy.formUrlPlaceholder}
          />
          <label>
            {copy.formCvLabel}
            <select value={form.cvId} onChange={(event) => update("cvId", event.target.value)}>
              <option value="">{copy.formCvNone}</option>
              {(cvHistory || []).map((cv) => (
                <option key={cv.id} value={cv.id}>
                  {cv.fileName} · {new Date(cv.createdAt).toLocaleDateString()}
                </option>
              ))}
            </select>
          </label>
          <textarea
            rows={3}
            value={form.notes}
            onChange={(event) => update("notes", event.target.value)}
            placeholder={copy.notesPlaceholder}
          />
          {error ? <p className="field-error">{error}</p> : null}
          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>
              {copy.formCancel}
            </button>
            <button type="submit" className="btn-main ready" disabled={saving}>
              {saving ? copy.formSaving : copy.formSave}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function CvPreviewCard({ cvReview, copy, language, avatarDataUrl, onClose }) {
  const [template, setTemplate] = useState("classic");

  if (!cvReview) {
    return (
      <article className="card block cv-preview-card no-print">
        <h3>
          <UiIcon name="profile" /> {copy.matchCvPreviewTitle}
        </h3>
        <p className="muted">{copy.matchCvPreviewEmpty}</p>
      </article>
    );
  }

  return (
    <article className="card block cv-preview-card">
      <div className="cv-preview-toolbar no-print">
        <h3>
          <UiIcon name="profile" /> {copy.matchCvPreviewTitle}
        </h3>
        <div className="cv-template-switch">
          <button type="button" className={template === "classic" ? "active" : ""} onClick={() => setTemplate("classic")}>
            {copy.cvTemplateClassic}
          </button>
          <button type="button" className={template === "sidebar" ? "active" : ""} onClick={() => setTemplate("sidebar")}>
            {copy.cvTemplateSidebar}
          </button>
        </div>
        <button type="button" className="cv-preview-close" onClick={onClose}>
          {copy.matchHidePreview}
        </button>
      </div>

      {template === "sidebar" ? (
        <CvDocumentSidebar cvReview={cvReview} copy={copy} avatarDataUrl={avatarDataUrl} />
      ) : (
        <CvDocumentClassic cvReview={cvReview} copy={copy} />
      )}
    </article>
  );
}

function CvDocumentClassic({ cvReview, copy }) {
  const fullName = [cvReview.firstName, cvReview.lastName].filter(Boolean).join(" ");
  const contactItems = [cvReview.email, cvReview.phone, cvReview.location].filter(Boolean);

  return (
    <>
      <div className="cv-document" id="cv-preview-document">
        <header className="cv-document-header">
          {fullName ? <h2>{fullName.toUpperCase()}</h2> : null}
          {cvReview.headline ? <p className="cv-document-headline">{cvReview.headline}</p> : null}
          {contactItems.length || cvReview.linkedinUrl ? (
            <div className="cv-document-contact">
              {contactItems.map((item) => (
                <span key={item}>{item}</span>
              ))}
              {cvReview.linkedinUrl ? (
                <a href={cvReview.linkedinUrl} target="_blank" rel="noreferrer">
                  LinkedIn
                </a>
              ) : null}
            </div>
          ) : null}
        </header>

        {cvReview.summary ? (
          <section className="cv-document-section">
            <h4>{copy.cvPreviewSummary}</h4>
            <p>{cvReview.summary}</p>
          </section>
        ) : null}

        {(cvReview.experiences || []).length ? (
          <section className="cv-document-section">
            <h4>{copy.cvPreviewExperience}</h4>
            {cvReview.experiences.slice(0, 6).map((experience, index) => (
              <div className="cv-document-entry" key={`${experience.company}-${index}`}>
                <div className="cv-document-entry-head">
                  <strong>{experience.role}</strong>
                  {experience.dates ? <span>{experience.dates}</span> : null}
                </div>
                {experience.company ? <p className="cv-document-entry-org">{experience.company}</p> : null}
                <CvEntryDescription text={experience.description} />
              </div>
            ))}
          </section>
        ) : null}

        {(cvReview.educationItems || []).length ? (
          <section className="cv-document-section">
            <h4>{copy.cvPreviewEducation}</h4>
            {cvReview.educationItems.slice(0, 4).map((item, index) => (
              <div className="cv-document-entry" key={`${item.school}-${index}`}>
                <div className="cv-document-entry-head">
                  <strong>{item.school}</strong>
                  {item.dates ? <span>{item.dates}</span> : null}
                </div>
                {item.degree ? <p className="cv-document-entry-org">{item.degree}</p> : null}
                <CvEntryDescription text={item.description} />
              </div>
            ))}
          </section>
        ) : null}

        {(cvReview.skills || []).length || (cvReview.softSkills || []).length ? (
          <section className="cv-document-section cv-document-skills-grid">
            {(cvReview.skills || []).length ? (
              <div>
                <h4>{copy.cvPreviewTechnicalSkills}</h4>
                <div className="cv-document-skill-chips">
                  {cvReview.skills.filter(Boolean).map((skill) => (
                    <span key={skill} className="cv-document-skill-chip">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
            {(cvReview.softSkills || []).length ? (
              <div>
                <h4>{copy.cvPreviewSoftSkills}</h4>
                <div className="cv-document-skill-chips">
                  {cvReview.softSkills.filter(Boolean).map((skill) => (
                    <span key={skill} className="cv-document-skill-chip soft">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
          </section>
        ) : null}

        {(cvReview.languages || []).length || (cvReview.certifications || []).length || (cvReview.interests || []).length ? (
          <section className="cv-document-section cv-document-skills-grid">
            {(cvReview.languages || []).length ? (
              <div>
                <h4>{copy.cvPreviewLanguages}</h4>
                <div className="cv-document-skill-chips">
                  {cvReview.languages.filter(Boolean).map((language) => (
                    <span key={language} className="cv-document-skill-chip">
                      {language}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
            {(cvReview.certifications || []).length ? (
              <div>
                <h4>{copy.cvPreviewCertifications}</h4>
                <div className="cv-document-skill-chips">
                  {cvReview.certifications
                    .filter((item) => item?.name || item?.issuer)
                    .map((item, index) => (
                      <span key={`${item.name}-${index}`} className="cv-document-skill-chip">
                        {[item.name, item.issuer].filter(Boolean).join(" · ")}
                      </span>
                    ))}
                </div>
              </div>
            ) : null}
            {(cvReview.interests || []).length ? (
              <div>
                <h4>{copy.cvPreviewInterests}</h4>
                <div className="cv-document-skill-chips">
                  {cvReview.interests.filter(Boolean).map((interest) => (
                    <span key={interest} className="cv-document-skill-chip soft">
                      {interest}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
          </section>
        ) : null}
      </div>
    </>
  );
}

function CvSidebarInitials({ firstName, lastName }) {
  const initials = [firstName, lastName]
    .map((part) => (part || "").trim().charAt(0))
    .filter(Boolean)
    .join("")
    .toUpperCase();
  return <span className="cv-sidebar-avatar-initials">{initials || "?"}</span>;
}

function CvDocumentSidebar({ cvReview, copy, avatarDataUrl }) {
  const fullName = [cvReview.firstName, cvReview.lastName].filter(Boolean).join(" ");
  const socialLinks = [
    cvReview.linkedinUrl ? { label: "LinkedIn", url: cvReview.linkedinUrl } : null,
    cvReview.portfolioUrl ? { label: copy.cvPreviewPortfolio, url: cvReview.portfolioUrl } : null
  ].filter(Boolean);

  return (
    <div className="cv-document cv-document-sidebar" id="cv-preview-document">
      <aside className="cv-sidebar-aside">
        <div className="cv-sidebar-avatar">
          {avatarDataUrl ? (
            <img src={avatarDataUrl} alt={fullName} />
          ) : (
            <CvSidebarInitials firstName={cvReview.firstName} lastName={cvReview.lastName} />
          )}
        </div>

        {cvReview.email || cvReview.phone || cvReview.location ? (
          <div className="cv-sidebar-block">
            {cvReview.email ? (
              <div className="cv-sidebar-contact-row">
                <UiIcon name="mail" />
                <span>{cvReview.email}</span>
              </div>
            ) : null}
            {cvReview.phone ? (
              <div className="cv-sidebar-contact-row">
                <UiIcon name="phone" />
                <span>{cvReview.phone}</span>
              </div>
            ) : null}
            {cvReview.location ? (
              <div className="cv-sidebar-contact-row">
                <UiIcon name="pin" />
                <span>{cvReview.location}</span>
              </div>
            ) : null}
          </div>
        ) : null}

        {(cvReview.certifications || []).length ? (
          <div className="cv-sidebar-block">
            <h4>{copy.cvPreviewCertifications}</h4>
            <ul className="cv-sidebar-list">
              {cvReview.certifications
                .filter((item) => item?.name || item?.issuer)
                .map((item, index) => (
                  <li key={`${item.name}-${index}`}>{[item.name, item.issuer].filter(Boolean).join(" · ")}</li>
                ))}
            </ul>
          </div>
        ) : null}

        {(cvReview.languages || []).length ? (
          <div className="cv-sidebar-block">
            <h4>{copy.cvPreviewLanguages}</h4>
            <div className="cv-document-skill-chips">
              {cvReview.languages.map((item) => (
                <span key={item} className="cv-document-skill-chip">
                  {item}
                </span>
              ))}
            </div>
          </div>
        ) : null}

        {socialLinks.length ? (
          <div className="cv-sidebar-block">
            <h4>{copy.cvPreviewSocial}</h4>
            <ul className="cv-sidebar-list cv-sidebar-links">
              {socialLinks.map((item) => (
                <li key={item.label}>
                  <a href={item.url} target="_blank" rel="noreferrer">
                    {item.url}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {(cvReview.interests || []).length ? (
          <div className="cv-sidebar-block">
            <h4>{copy.cvPreviewInterests}</h4>
            <ul className="cv-sidebar-list">
              {cvReview.interests.map((interest) => (
                <li key={interest}>{interest}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </aside>

      <main className="cv-sidebar-main">
        <header className="cv-sidebar-header">
          {fullName ? <h2>{fullName}</h2> : null}
          {cvReview.headline ? <p className="cv-document-headline">{cvReview.headline}</p> : null}
        </header>

        {cvReview.summary ? (
          <section className="cv-sidebar-summary">
            <h4>{copy.cvPreviewSummary}</h4>
            <p>{cvReview.summary}</p>
          </section>
        ) : null}

        {(cvReview.skills || []).length || (cvReview.softSkills || []).length ? (
          <section className="cv-document-section">
            {(cvReview.skills || []).length ? (
              <div>
                <h4>{copy.cvPreviewTechnicalSkills}</h4>
                <div className="cv-document-skill-chips">
                  {cvReview.skills.map((skill) => (
                    <span key={skill} className="cv-document-skill-chip">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
            {(cvReview.softSkills || []).length ? (
              <div style={{ marginTop: (cvReview.skills || []).length ? "0.9rem" : 0 }}>
                <h4>{copy.cvPreviewSoftSkills}</h4>
                <div className="cv-document-skill-chips">
                  {cvReview.softSkills.map((skill) => (
                    <span key={skill} className="cv-document-skill-chip soft">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
          </section>
        ) : null}

        {(cvReview.experiences || []).length ? (
          <section className="cv-document-section cv-sidebar-timeline">
            <h4>{copy.cvPreviewExperience}</h4>
            {cvReview.experiences.slice(0, 6).map((experience, index) => (
              <div className="cv-sidebar-timeline-entry" key={`${experience.company}-${index}`}>
                <div className="cv-document-entry-head">
                  <strong>{[experience.role, experience.company].filter(Boolean).join(" | ")}</strong>
                  {experience.dates ? <span>{experience.dates}</span> : null}
                </div>
                {experience.location ? <p className="cv-document-entry-org">{experience.location}</p> : null}
                <CvEntryDescription text={experience.description} />
              </div>
            ))}
          </section>
        ) : null}

        {(cvReview.projects || []).length ? (
          <section className="cv-document-section cv-sidebar-timeline">
            <h4>{copy.cvPreviewProjects}</h4>
            {cvReview.projects.slice(0, 4).map((project, index) => (
              <div className="cv-sidebar-timeline-entry" key={`${project.name}-${index}`}>
                <div className="cv-document-entry-head">
                  <strong>{project.name}</strong>
                </div>
                {(project.technologies || []).length ? (
                  <div className="cv-document-skill-chips">
                    {project.technologies.map((tech) => (
                      <span key={tech} className="cv-document-skill-chip soft">
                        {tech}
                      </span>
                    ))}
                  </div>
                ) : null}
                <CvEntryDescription text={project.description} />
              </div>
            ))}
          </section>
        ) : null}

        {(cvReview.educationItems || []).length ? (
          <section className="cv-document-section cv-sidebar-timeline">
            <h4>{copy.cvPreviewEducation}</h4>
            {cvReview.educationItems.slice(0, 4).map((item, index) => (
              <div className="cv-sidebar-timeline-entry" key={`${item.school}-${index}`}>
                <div className="cv-document-entry-head">
                  <strong>{item.school}</strong>
                  {item.dates ? <span>{item.dates}</span> : null}
                </div>
                {item.degree ? <p className="cv-document-entry-org">{item.degree}</p> : null}
                <CvEntryDescription text={item.description} />
              </div>
            ))}
          </section>
        ) : null}
      </main>
    </div>
  );
}

function TokenEditor({ label, items, addLabel, onChange, onRemove, onAdd }) {
  return (
    <div className="token-editor">
      <div className="review-field-label">{label}</div>
      <div className="token-grid">
        {items.map((item, index) => (
          <div className="token-input" key={`${label}-${index}`}>
            <input value={item} onChange={(event) => onChange(index, event.target.value)} />
            <button type="button" onClick={() => onRemove(index)} aria-label="Remove">
              ×
            </button>
          </div>
        ))}
      </div>
      <button type="button" className="btn-ghost token-add" onClick={onAdd}>
        + {addLabel}
      </button>
    </div>
  );
}

function ReviewCard({ title, icon, children }) {
  return (
    <section className="review-card">
      <header>
        <span>
          <UiIcon name={icon} />
        </span>
        <h3>{title}</h3>
      </header>
      <div className="review-card-body">{children}</div>
    </section>
  );
}

function EditableBlock({ title, onRemove, children }) {
  return (
    <div className="editable-block">
      <div className="editable-block-head">
        <strong>{title}</strong>
        <button type="button" onClick={onRemove} aria-label="Remove">
          ×
        </button>
      </div>
      <div className="editable-block-body">{children}</div>
    </div>
  );
}

function ProfilePage({
  user,
  premium,
  profileCompleteness,
  onSaveProfile,
  onSaveAccount,
  onAvatarUpload,
  avatarUploading,
  onActivatePremium,
  language
}) {
  const copy = APP_COPY[language]?.profile || APP_COPY.fr.profile;
  const [profileForm, setProfileForm] = useState(() => profileToForm(user.profile));
  const [accountForm, setAccountForm] = useState(() => accountToForm(user));
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingAccount, setSavingAccount] = useState(false);

  useEffect(() => {
    setProfileForm(profileToForm(user.profile));
    setAccountForm(accountToForm(user));
  }, [user]);

  function updateProfileField(key, value) {
    setProfileForm((prev) => ({ ...prev, [key]: value }));
  }

  function updateAccountField(key, value) {
    setAccountForm((prev) => ({ ...prev, [key]: value }));
  }

  async function submitProfile(event) {
    event.preventDefault();
    setSavingProfile(true);
    try {
      await onSaveProfile({
        ...profileForm,
        experienceYears: Number(profileForm.experienceYears || 0),
        skills: profileForm.skills,
        languages: profileForm.languages
      });
    } finally {
      setSavingProfile(false);
    }
  }

  async function submitAccount(event) {
    event.preventDefault();
    setSavingAccount(true);
    try {
      await onSaveAccount(buildAccountPatch(accountForm));
    } finally {
      setSavingAccount(false);
    }
  }

  return (
    <section className="profile-page">
      <div className="profile-hero">
        <div className="profile-hero-avatar">
          <AvatarCircle user={user} large />
          <label className="avatar-upload-btn">
            <input type="file" accept="image/*" onChange={(event) => onAvatarUpload(event.target.files?.[0])} />
            {avatarUploading ? copy.uploading : copy.upload}
          </label>
        </div>
        <div>
          <h2>
            {user.firstName} {user.lastName}
          </h2>
          <p>{profileForm.headline || copy.addHeadline}</p>
          <div className="tag-row">
            <span className="tag">{user.email}</span>
            <span className="tag">{getAccountLabel(user.roleType, language)}</span>
            <span className="tag">{copy.completeness} : {profileCompleteness}%</span>
            <span className="tag">{copy.plan}: {user.subscription?.plan || "free"}</span>
          </div>
        </div>
      </div>

      <div className="section-grid profile-grid-extended">
        <form className="card block" onSubmit={submitProfile}>
          <h3>{copy.professional}</h3>
          <label>
            {copy.headline}
            <input
              value={profileForm.headline}
              onChange={(event) => updateProfileField("headline", event.target.value)}
              placeholder="Data Scientist - GenAI"
            />
          </label>
          <div className="two-cols">
            <label>
              {copy.targetRole}
              <input
                value={profileForm.targetRole}
                onChange={(event) => updateProfileField("targetRole", event.target.value)}
                placeholder="Data Scientist GenAI"
              />
            </label>
            <label>
              {copy.sector}
              <input
                value={profileForm.sector}
                onChange={(event) => updateProfileField("sector", event.target.value)}
                placeholder="Conseil, Santé, Finance..."
              />
            </label>
          </div>

          <div className="two-cols">
            <label>
              {copy.location}
              <input
                value={profileForm.location}
                onChange={(event) => updateProfileField("location", event.target.value)}
                placeholder="Paris"
              />
            </label>
            <label>
              {copy.experience}
              <input
                type="number"
                min="0"
                value={profileForm.experienceYears}
                onChange={(event) => updateProfileField("experienceYears", event.target.value)}
              />
            </label>
          </div>

          <label>
            {copy.education}
            <input
              value={profileForm.education}
              onChange={(event) => updateProfileField("education", event.target.value)}
              placeholder="Bac+5 / Master / Ingénieur"
            />
          </label>

          <label>
            {copy.skills}
            <textarea
              rows={4}
              value={profileForm.skills}
              onChange={(event) => updateProfileField("skills", event.target.value)}
              placeholder="python, sql, llm, rag, azure"
            />
          </label>

          <label>
            {copy.languages}
            <input
              value={profileForm.languages}
              onChange={(event) => updateProfileField("languages", event.target.value)}
              placeholder="français, anglais"
            />
          </label>

          <button className="btn-main" type="submit" disabled={savingProfile}>
            {savingProfile ? <span className="btn-spinner" /> : null} {copy.saveProfile}
          </button>
        </form>

        <form className="card block" onSubmit={submitAccount}>
          <h3>{copy.accountSettings}</h3>
          <div className="two-cols">
            <label>
              {copy.accountType}
              <select value={accountForm.accountType} onChange={(event) => updateAccountField("accountType", event.target.value)}>
                {ACCOUNT_TYPE_OPTIONS.map((item) => (
                  <option key={item.value} value={item.value}>
                    {getAccountLabel(item.value, language)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              {copy.phone}
              <input value={accountForm.phone} onChange={(event) => updateAccountField("phone", event.target.value)} />
            </label>
          </div>

          <div className="two-cols">
            <label>
              {copy.city}
              <input value={accountForm.city} onChange={(event) => updateAccountField("city", event.target.value)} />
            </label>
            <label>
              {copy.country}
              <input value={accountForm.country} onChange={(event) => updateAccountField("country", event.target.value)} />
            </label>
          </div>

          <RoleSpecificFields form={accountForm} updateField={updateAccountField} language={language} />

          <button className="btn-main" type="submit" disabled={savingAccount}>
            {savingAccount ? <span className="btn-spinner" /> : null} {copy.saveAccount}
          </button>
        </form>

        <div className="card block premium-card">
          <h3>{copy.premiumTitle}</h3>
          <p className="muted">{copy.premiumText}</p>

          <div className="premium-score">
            <div className="ring" style={{ "--pct": `${premium?.eligibility?.score || 0}%` }}>
              <strong>{premium?.eligibility?.score || 0}</strong>
              <span>/100</span>
            </div>
            <div>
              <h4>
                {copy.level}: {premium?.eligibility?.tier || "Starter"} · {premium?.hasAccess ? copy.accessOpen : copy.accessRestricted}
              </h4>
              <ul className="flat-list">
                {(premium?.eligibility?.reasons || []).map((reason, idx) => (
                  <li key={`${reason}-${idx}`}>{reason}</li>
                ))}
              </ul>
            </div>
          </div>

          <div className="premium-meta">
            <span>{copy.accessSource}: {premium?.source || "locked"}</span>
            <span>{copy.renewal}: {formatDate(user.subscription?.renewalAt)}</span>
          </div>

          <button className="btn-secondary" onClick={onActivatePremium}>
            {copy.activatePremium}
          </button>
        </div>
      </div>
    </section>
  );
}

function RoleSpecificFields({ form, updateField, language }) {
  const t =
    language === "en"
      ? {
          currentTitle: "Current title",
          searchedRole: "Target role",
          experience: "Experience (years)",
          school: "School / University",
          studyLevel: "Education level",
          graduation: "Graduation year",
          contract: "Contract sought",
          contractPlaceholder: "Full-time, apprenticeship, internship...",
          availability: "Availability",
          availabilityPlaceholder: "Immediate, 1 month...",
          organization: "Organization name",
          recruiterFunction: "Recruiting function",
          hiringVolume: "Hiring volume",
          hiringPlaceholder: "e.g. 20 roles / quarter",
          sector: "Industry",
          website: "Website",
          organizationType: "Organization type",
          department: "Department",
          size: "Size",
          contactRole: "Contact role",
          notes: "Additional notes"
        }
      : {
          currentTitle: "Titre actuel",
          searchedRole: "Rôle recherché",
          experience: "Expérience (ans)",
          school: "École / Université",
          studyLevel: "Niveau d'études",
          graduation: "Année de diplomation",
          contract: "Contrat recherché",
          contractPlaceholder: "CDI, alternance, stage...",
          availability: "Disponibilité",
          availabilityPlaceholder: "Immédiate, 1 mois...",
          organization: "Nom de la structure",
          recruiterFunction: "Fonction recrutement",
          hiringVolume: "Volume de recrutements",
          hiringPlaceholder: "ex: 20 postes / trimestre",
          sector: "Secteur",
          website: "Site web",
          organizationType: "Type d'organisation",
          department: "Département",
          size: "Taille",
          contactRole: "Rôle contact",
          notes: "Notes complémentaires"
        };
  if (form.accountType === "candidate" || form.accountType === "student") {
    return (
      <div className="role-fields">
        <label>
          {t.currentTitle}
          <input value={form.currentTitle} onChange={(event) => updateField("currentTitle", event.target.value)} />
        </label>
        <div className="two-cols">
          <label>
            {t.searchedRole}
            <input value={form.targetRole} onChange={(event) => updateField("targetRole", event.target.value)} />
          </label>
          <label>
            {t.experience}
            <input
              type="number"
              min="0"
              value={form.experienceYears}
              onChange={(event) => updateField("experienceYears", event.target.value)}
            />
          </label>
        </div>
        <div className="two-cols">
          <label>
            {t.school}
            <input value={form.schoolName} onChange={(event) => updateField("schoolName", event.target.value)} />
          </label>
          <label>
            {t.studyLevel}
            <input value={form.studyLevel} onChange={(event) => updateField("studyLevel", event.target.value)} />
          </label>
        </div>
        <div className="two-cols">
          <label>
            {t.graduation}
            <input value={form.graduationYear} onChange={(event) => updateField("graduationYear", event.target.value)} />
          </label>
          <label>
            {t.contract}
            <input
              placeholder={t.contractPlaceholder}
              value={form.contractPreference}
              onChange={(event) => updateField("contractPreference", event.target.value)}
            />
          </label>
        </div>
        <label>
          {t.availability}
          <input
            placeholder={t.availabilityPlaceholder}
            value={form.availability}
            onChange={(event) => updateField("availability", event.target.value)}
          />
        </label>
        <div className="two-cols">
          <label>
            Portfolio
            <input value={form.portfolioUrl} onChange={(event) => updateField("portfolioUrl", event.target.value)} />
          </label>
          <label>
            LinkedIn
            <input value={form.linkedinUrl} onChange={(event) => updateField("linkedinUrl", event.target.value)} />
          </label>
        </div>
      </div>
    );
  }

  if (form.accountType === "recruiter_firm" || form.accountType === "recruiter_internal") {
    return (
      <div className="role-fields">
        <label>
          {t.organization}
          <input value={form.organizationName} onChange={(event) => updateField("organizationName", event.target.value)} />
        </label>
        <div className="two-cols">
          <label>
            {t.recruiterFunction}
            <input value={form.recruiterRole} onChange={(event) => updateField("recruiterRole", event.target.value)} />
          </label>
          <label>
            {t.hiringVolume}
            <input
              placeholder={t.hiringPlaceholder}
              value={form.hiringVolume}
              onChange={(event) => updateField("hiringVolume", event.target.value)}
            />
          </label>
        </div>
        <div className="two-cols">
          <label>
            {t.sector}
            <input value={form.industry} onChange={(event) => updateField("industry", event.target.value)} />
          </label>
          <label>
            {t.website}
            <input value={form.website} onChange={(event) => updateField("website", event.target.value)} />
          </label>
        </div>
      </div>
    );
  }

  return (
    <div className="role-fields">
      <label>
        {t.organization}
        <input value={form.organizationName} onChange={(event) => updateField("organizationName", event.target.value)} />
      </label>
      <div className="two-cols">
        <label>
          {t.organizationType}
          <input value={form.organizationType} onChange={(event) => updateField("organizationType", event.target.value)} />
        </label>
        <label>
          {t.department}
          <input value={form.department} onChange={(event) => updateField("department", event.target.value)} />
        </label>
      </div>
      <div className="two-cols">
        <label>
          {t.size}
          <input value={form.sizeRange} onChange={(event) => updateField("sizeRange", event.target.value)} />
        </label>
        <label>
          {t.sector}
          <input value={form.industry} onChange={(event) => updateField("industry", event.target.value)} />
        </label>
      </div>
      <div className="two-cols">
        <label>
          {t.contactRole}
          <input value={form.contactRole} onChange={(event) => updateField("contactRole", event.target.value)} />
        </label>
        <label>
          {t.website}
          <input value={form.website} onChange={(event) => updateField("website", event.target.value)} />
        </label>
      </div>
      <label>
        {t.notes}
        <textarea rows={3} value={form.notes} onChange={(event) => updateField("notes", event.target.value)} />
      </label>
    </div>
  );
}

function AnalysisPage({ matchData, language }) {
  const copy = APP_COPY[language]?.analysis || APP_COPY.fr.analysis;
  if (!matchData) {
    return <Placeholder title={copy.unavailableTitle} text={copy.unavailableText} />;
  }

  const { summary, domainScores, strengths, gaps, bestMatch } = matchData;

  return (
    <section className="analysis-page">
      <div className="score-hero card">
        <div className="score-ring" style={{ "--pct": `${summary.globalScore}%` }}>
          <strong>{summary.globalScore}</strong>
          <span>/100</span>
        </div>
        <div>
          <h2>
            {ratingLabel(summary.globalScore, language)} · {summary.title}
          </h2>
          <p>{summary.subtitle}</p>
          <div className="tag-row">
            <span className="tag">{copy.skillCoverage}: {bestMatch.skillCoverage}%</span>
            <span className="tag">{copy.experienceFit}: {bestMatch.experienceFit}%</span>
            <span className="tag">{copy.verdict}: {summary.verdict}</span>
          </div>
        </div>
      </div>

      <div className="section-grid">
        <div className="card block">
          <h3>{copy.domain}</h3>
          {domainScores.map((item) => (
            <div className="bar-item" key={item.domain}>
              <div className="bar-meta">
                <span>{item.domain}</span>
                <span>{item.value}%</span>
              </div>
              <div className="bar-track">
                <div className="bar-fill" style={{ width: `${item.value}%` }} />
              </div>
            </div>
          ))}
        </div>

        <div className="card block">
          <h3>{copy.quickRead}</h3>
          <div className="point-group">
            <h4>{copy.strengths}</h4>
            <ul>
              {strengths.map((point, idx) => (
                <li key={`${point}-${idx}`}>{point}</li>
              ))}
            </ul>
          </div>
          <div className="point-group">
            <h4>{copy.gaps}</h4>
            <ul>
              {gaps.map((gap, idx) => (
                <li key={`${gap}-${idx}`}>{gap}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

function OffersPage({ matchData, premium, language }) {
  const copy = APP_COPY[language]?.offers || APP_COPY.fr.offers;
  if (!matchData) {
    return <Placeholder title={copy.unavailableTitle} text={copy.unavailableText} />;
  }

  return (
    <section className="offers-page">
      <div className="card block offers-head">
        <h2>{copy.title}</h2>
        <p>
          {copy.average} : <strong>{matchData.portfolioScore}</strong> / 100
        </p>
        <p className="muted">
          {copy.premiumAccess} : {premium?.hasAccess ? copy.open : copy.closed} ({premium?.source || "locked"})
        </p>
      </div>

      <div className="offers-grid">
        {matchData.rankedOffers.map((item) => (
          <article key={item.offer.id} className={`offer-card ${item.locked ? "locked" : ""}`}>
            <div className="offer-top">
              <div>
                <h3>{item.offer.title}</h3>
                <p>
                  {item.offer.company} · {item.offer.location} · {item.offer.contract}
                </p>
              </div>
              <div className="score-pill">{item.score}</div>
            </div>

            <div className="tag-row">
              <span className="tag">{ratingLabel(item.score, language)}</span>
              <span className="tag">{copy.skills} {item.skillCoverage}%</span>
              {item.offer.premium ? <span className="tag premium">Premium</span> : null}
              {item.locked ? <span className="tag crit">{copy.locked}</span> : null}
            </div>

            <div className="offer-body">
              <div>
                <h4>{copy.detected}</h4>
                <p>{item.matchedSkills.length ? item.matchedSkills.join(", ") : copy.noDetection}</p>
              </div>
              <div>
                <h4>{copy.mainGaps}</h4>
                <p>{item.missingSkills.length ? item.missingSkills.slice(0, 5).join(", ") : copy.noGap}</p>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function CvAdvicePage({ matchData, language }) {
  const copy = APP_COPY[language]?.cv || APP_COPY.fr.cv;
  if (!matchData) {
    return <Placeholder title={copy.unavailableTitle} text={copy.unavailableText} />;
  }

  return (
    <section className="cv-page">
      <div className="card block">
        <h2>{copy.title}</h2>
        <p className="muted">{copy.text}</p>
      </div>

      {matchData.recommendations.map((item, index) => (
        <article key={`${item.title}-${index}`} className={`advice-card ${levelTag(item.level)}`}>
          <div className="advice-head">
            <h3>{item.title}</h3>
            <span className="tag">{item.level}</span>
          </div>
          <p>{item.detail}</p>
        </article>
      ))}
    </section>
  );
}

const PRICING_SEGMENTS = [
  { id: "candidate", labelKey: "segmentCandidate" },
  { id: "agency", labelKey: "segmentAgency" },
  { id: "school", labelKey: "segmentSchool" }
];

function formatPlanPrice(plan, billingCycle, language, copy, currency = "EUR") {
  if (plan.monthlyPrice === 0 && plan.annualPrice === 0) {
    return { amount: copy.free, unit: "" };
  }

  if (plan.monthlyPrice == null) {
    const unit = plan.annualPriceUnit?.[language] || plan.annualPriceUnit?.fr || copy.perYear;
    return { amount: formatAmountInCurrency(plan.annualPrice, currency), unit };
  }

  const amount = billingCycle === "annual" ? plan.annualPrice : plan.monthlyPrice;
  const unit = billingCycle === "annual" ? copy.perYear : copy.perMonth;
  return { amount: formatAmountInCurrency(amount, currency), unit };
}

function allowedPricingSegmentsForRole(roleType) {
  if (roleType === "recruiter_firm" || roleType === "recruiter_internal" || roleType === "company") return ["agency"];
  if (roleType === "school") return ["school"];
  return ["candidate"];
}

function PricingPage({
  user,
  premium,
  language,
  currency,
  stripeEnabled,
  planOverrides = {},
  onActivatePlan,
  onStripeCheckout,
  onRedeemCode,
  pendingPlanAction
}) {
  const copy = APP_COPY[language]?.pricing || APP_COPY.fr.pricing;
  const allowedSegments = allowedPricingSegmentsForRole(user?.roleType);
  const visibleSegments = PRICING_SEGMENTS.filter((item) => allowedSegments.includes(item.id));
  const [segment, setSegment] = useState(allowedSegments[0]);
  const [billingCycle, setBillingCycle] = useState("monthly");
  const [licenseCode, setLicenseCode] = useState("");
  const [studentSeats, setStudentSeats] = useState(30);

  useEffect(() => {
    if (!allowedSegments.includes(segment)) {
      setSegment(allowedSegments[0]);
    }
  }, [allowedSegments, segment]);

  const subscription = user?.subscription || {};
  const currentBalance = Number(subscription.credits || 0);
  // Un admin a pu modifier un tarif depuis Tarifs (admin) — l'affichage
  // candidat/cabinet/école doit refléter le prix réellement facturé, pas la
  // valeur par défaut figée dans plans.js.
  const segmentPlans = PLANS.filter((plan) => plan.segment === segment).map((plan) => {
    const override = planOverrides[plan.id];
    if (!override) return plan;
    return {
      ...plan,
      monthlyPrice: override.monthlyPrice != null ? override.monthlyPrice : plan.monthlyPrice,
      annualPrice: override.annualPrice != null ? override.annualPrice : plan.annualPrice
    };
  });
  const hasRecurringPlans = segmentPlans.some((plan) => plan.monthlyPrice > 0);

  return (
    <section className="pricing-page">
      <header className="pricing-header">
        <h2>{copy.title}</h2>
        <p className="muted">{copy.text}</p>
        <div className="pricing-balance-pill">
          <UiIcon name="pricetag" />
          <span>
            {copy.currentBalance} : {currentBalance} {copy.credits}
          </span>
        </div>
      </header>

      {visibleSegments.length > 1 ? (
      <div className="pricing-segment-tabs">
        {visibleSegments.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`pricing-segment-tab ${segment === item.id ? "active" : ""}`}
            onClick={() => setSegment(item.id)}
          >
            {copy[item.labelKey]}
          </button>
        ))}
      </div>
      ) : null}

      {hasRecurringPlans ? (
        <div className="pricing-toggle">
          <button
            type="button"
            className={billingCycle === "monthly" ? "active" : ""}
            onClick={() => setBillingCycle("monthly")}
          >
            {copy.billingMonthly}
          </button>
          <button
            type="button"
            className={billingCycle === "annual" ? "active" : ""}
            onClick={() => setBillingCycle("annual")}
          >
            {copy.billingAnnual} <span className="pricing-toggle-save">{copy.billingSave}</span>
          </button>
        </div>
      ) : null}

      <div className="pricing-grid">
        {segmentPlans.map((plan) => {
          const price = formatPlanPrice(plan, billingCycle, language, copy, currency);
          const isDefaultFreePlan = !subscription.planId && plan.monthlyPrice === 0 && plan.annualPrice === 0;
          const isCurrentPlan = subscription.planId === plan.id || isDefaultFreePlan;
          return (
            <article key={plan.id} className={`pricing-card ${plan.highlighted ? "recommended" : ""}`}>
              {plan.badge ? <span className="pricing-badge">{plan.badge[language] || plan.badge.fr}</span> : null}
              <div className="pricing-card-icon">
                <UiIcon name={plan.segment === "candidate" ? "pricetag" : plan.segment === "agency" ? "briefcase" : "profile"} />
              </div>
              <h3>{plan.name[language] || plan.name.fr}</h3>
              <p className="muted">{plan.tagline[language] || plan.tagline.fr}</p>
              <div className="pricing-price">
                <strong>{price.amount}</strong>
                {price.unit ? <span>{price.unit}</span> : null}
              </div>
              {plan.seats ? (
                <span className="tag">
                  {plan.seats} {copy.seatsIncluded}
                </span>
              ) : plan.credits < 999 ? (
                <span className="tag">
                  {plan.monthlyPrice === 0 && plan.annualPrice === 0 ? "" : "+"}
                  {plan.credits} {copy.creditsIncluded}
                </span>
              ) : null}
              <ul className="pricing-feature-list">
                {(plan.features[language] || plan.features.fr).map((feature) => (
                  <li key={feature}>{feature}</li>
                ))}
              </ul>
              {plan.id === "school_license" ? (
                <label className="pricing-seats-input">
                  <span>{copy.studentSeatsLabel}</span>
                  <input
                    type="number"
                    min={plan.seats}
                    step={1}
                    value={studentSeats}
                    onChange={(event) => {
                      const next = Number(event.target.value.replace(/\D/g, "")) || plan.seats;
                      setStudentSeats(Math.max(plan.seats, next));
                    }}
                  />
                  <span className="pricing-seats-total">
                    {copy.studentSeatsTotal}{" "}
                    <strong>{formatAmountInCurrency(plan.annualPrice * studentSeats, currency)}</strong>
                  </span>
                </label>
              ) : null}
              <button
                type="button"
                className={`btn-main ${plan.highlighted ? "ready" : ""}`}
                disabled={isCurrentPlan || Boolean(pendingPlanAction)}
                onClick={() =>
                  stripeEnabled && plan.grantsPremium
                    ? onStripeCheckout(plan.id, billingCycle, plan.id === "school_license" ? studentSeats : 1)
                    : onActivatePlan(plan.id, billingCycle)
                }
              >
                {pendingPlanAction === plan.id ? <span className="btn-spinner" /> : null}{" "}
                {isCurrentPlan ? copy.currentPlan : copy.activate}
              </button>
            </article>
          );
        })}
      </div>

      <div className="pricing-license-block">
        <h3>{copy.licenseCodeTitle}</h3>
        <p className="muted">{copy.licenseCodeHint}</p>
        <div className="pricing-license-form">
          <input
            value={licenseCode}
            onChange={(event) => setLicenseCode(event.target.value)}
            placeholder={copy.licenseCodePlaceholder}
          />
          <button
            type="button"
            className="btn-main ready"
            disabled={!licenseCode.trim() || Boolean(pendingPlanAction)}
            onClick={() => {
              onRedeemCode(licenseCode);
              setLicenseCode("");
            }}
          >
            {pendingPlanAction === "license" ? <span className="btn-spinner" /> : null} {copy.licenseCodeSubmit}
          </button>
        </div>
      </div>
    </section>
  );
}

function LockBadge({ cx, cy }) {
  return (
    <>
      <circle cx={cx} cy={cy} r="28" fill="var(--primary)" />
      <path
        d={`M${cx} ${cy - 12}a6.5 6.5 0 00-6.5 6.5v3.5h-1a2.5 2.5 0 00-2.5 2.5v13a2.5 2.5 0 002.5 2.5h15a2.5 2.5 0 002.5-2.5v-13a2.5 2.5 0 00-2.5-2.5h-1v-3.5A6.5 6.5 0 00${cx} ${cy - 12}zm0 3.5a3 3 0 013 3v3.5h-6v-3.5a3 3 0 013-3z`}
        fill="#fff"
      />
    </>
  );
}

function InterviewAssistantIllustration() {
  return (
    <svg viewBox="0 0 340 300" className="interview-locked-svg" aria-hidden="true" focusable="false">
      <rect x="14" y="18" width="290" height="230" rx="22" fill="var(--surface)" stroke="var(--line)" />

      <rect x="38" y="42" width="84" height="84" rx="18" fill="var(--bg-accent)" />
      <circle cx="80" cy="78" r="15" fill="none" stroke="var(--primary)" strokeWidth="3" />
      <path
        d="M56 112c2-14 12-22 24-22s22 8 24 22"
        fill="none"
        stroke="var(--primary)"
        strokeWidth="3"
        strokeLinecap="round"
      />

      <rect x="216" y="42" width="84" height="84" rx="18" fill="#eef0ff" />
      <rect x="240" y="66" width="36" height="30" rx="10" fill="#4f46e5" />
      <circle cx="251" cy="80" r="3" fill="#fff" />
      <circle cx="265" cy="80" r="3" fill="#fff" />
      <rect x="255" y="58" width="6" height="8" rx="3" fill="#4f46e5" />

      <path
        d="M122 70h34a8 8 0 018 8v6a8 8 0 01-8 8h-20l-8 8v-8h-6a8 8 0 01-8-8v-6a8 8 0 018-8z"
        fill="var(--primary)"
        opacity="0.9"
      />
      <path
        d="M186 96h30a7 7 0 017 7v5a7 7 0 01-7 7h-6v7l-9-7h-15a7 7 0 01-7-7v-5a7 7 0 017-7z"
        fill="#4f46e5"
        opacity="0.9"
      />

      <rect x="38" y="150" width="262" height="60" rx="16" fill="var(--bg-accent)" />
      <rect x="58" y="164" width="200" height="9" rx="4.5" fill="#fff" opacity="0.75" />
      <rect x="58" y="184" width="150" height="9" rx="4.5" fill="#fff" opacity="0.75" />

      <g opacity="0.5">
        <rect x="38" y="220" width="160" height="34" rx="14" fill="var(--surface-2)" stroke="var(--line)" strokeDasharray="4 5" />
        <rect x="56" y="232" width="120" height="8" rx="4" fill="var(--line-strong)" />
      </g>

      <LockBadge cx={284} cy={222} />
    </svg>
  );
}

function InterviewPage({ language, subscription, onGoToTarifs }) {
  const copy = APP_COPY[language]?.interview || APP_COPY.fr.interview;
  const isFreePlan = !getPlanById(subscription?.planId)?.grantsPremium;

  const [track, setTrack] = useState("rh");
  const [messages, setMessages] = useState([]);
  const [step, setStep] = useState(0);
  const [input, setInput] = useState("");
  const [hintOpen, setHintOpen] = useState(false);
  const [doneTracks, setDoneTracks] = useState({});

  const config = INTERVIEW_SCRIPTS[track];
  const currentQuestion = config.steps[step];
  const progress = Math.round((step / config.steps.length) * 100);

  useEffect(() => {
    resetTrack(track);
  }, [track]);

  function resetTrack(trackKey) {
    const first = INTERVIEW_SCRIPTS[trackKey].steps[0];
    setMessages([{ type: "ai", text: first.question }]);
    setStep(0);
    setInput("");
    setHintOpen(false);
  }

  function submitReply() {
    const text = input.trim();
    if (!text || step >= config.steps.length) return;

    const reply = config.steps[step];
    const nextMessages = [
      ...messages,
      { type: "user", text },
      { type: "feedback", text: `${copy.modelAnswer}: ${reply.model}` }
    ];

    const nextStep = step + 1;
    if (nextStep < config.steps.length) {
      nextMessages.push({ type: "ai", text: config.steps[nextStep].question });
    } else {
      setDoneTracks((prev) => ({ ...prev, [track]: true }));
    }

    setMessages(nextMessages);
    setStep(nextStep);
    setInput("");
    setHintOpen(false);
  }

  if (isFreePlan) {
    return (
      <section className="interview-locked">
        <div className="interview-locked-copy">
          <span className="interview-locked-badge">
            <UiIcon name="chart" /> Trajectoire Pro
          </span>
          <h2>{copy.lockedTitle}</h2>
          <p>{copy.lockedText}</p>
          <ul className="interview-locked-features">
            {copy.lockedFeatures.map((feature, index) => (
              <li key={feature}>
                <span className={`interview-locked-feature-icon icon-${index}`}>
                  <UiIcon name={["chat", "shield", "network"][index] || "shield"} />
                </span>
                {feature}
              </li>
            ))}
          </ul>
          <button type="button" className="btn-main ready" onClick={onGoToTarifs}>
            {copy.lockedCta} <UiIcon name="chevron" className="btn-chevron" />
          </button>
        </div>
        <div className="interview-locked-art">
          <InterviewAssistantIllustration />
        </div>
      </section>
    );
  }

  return (
    <section className="interview-page">
      <div className="tabs">
        {Object.entries(INTERVIEW_SCRIPTS).map(([key, value]) => (
          <button
            key={key}
            className={`tab-btn ${track === key ? "active" : ""} ${doneTracks[key] ? "done" : ""}`}
            onClick={() => setTrack(key)}
          >
            <small>{value.label}</small>
            <strong>{value.meta.name}</strong>
          </button>
        ))}
      </div>

      <div className="chat card">
        <div className="chat-top">
          <div className="avatar">{config.meta.avatar}</div>
          <div>
            <h3>{config.meta.name}</h3>
            <p>{config.meta.subtitle}</p>
          </div>
          <div className="progress">{progress}%</div>
        </div>

        <div className="chat-stream">
          {messages.map((msg, idx) => (
            <div key={`${msg.type}-${idx}`} className={`msg ${msg.type}`}>
              <p>{msg.text}</p>
            </div>
          ))}
        </div>

        {step < config.steps.length ? (
          <>
            <button className="hint" onClick={() => setHintOpen((prev) => !prev)}>
              {copy.hint}
            </button>
            {hintOpen ? <p className="hint-body">{currentQuestion?.hint}</p> : null}

            <div className="chat-input-row">
              <textarea
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder={copy.placeholder}
                rows={2}
              />
              <button className="btn-main" onClick={submitReply}>
                {copy.send}
              </button>
            </div>
          </>
        ) : (
          <div className="coaching-bilan">
            <h4>{copy.report}</h4>
            <div className="three-cols">
              <div>
                <h5>{copy.good}</h5>
                <ul>
                  {config.feedback.positive.map((point, idx) => (
                    <li key={`${point}-${idx}`}>{point}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h5>{copy.improve}</h5>
                <ul>
                  {config.feedback.improve.map((point, idx) => (
                    <li key={`${point}-${idx}`}>{point}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h5>{copy.keyAdvice}</h5>
                <p>{config.feedback.key}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function CoverLetterIllustration() {
  return (
    <svg viewBox="0 0 320 240" className="module-illustration" aria-hidden="true">
      <rect x="20" y="20" width="200" height="200" rx="18" fill="var(--surface-2)" stroke="var(--line)" />
      <rect x="40" y="46" width="160" height="10" rx="5" fill="var(--primary)" opacity="0.85" />
      <rect x="40" y="70" width="140" height="7" rx="3.5" fill="var(--line-strong)" />
      <rect x="40" y="86" width="150" height="7" rx="3.5" fill="var(--line-strong)" />
      <rect x="40" y="102" width="120" height="7" rx="3.5" fill="var(--line-strong)" />
      <rect x="40" y="126" width="150" height="7" rx="3.5" fill="var(--line-strong)" />
      <rect x="40" y="142" width="140" height="7" rx="3.5" fill="var(--line-strong)" />
      <rect x="40" y="158" width="90" height="7" rx="3.5" fill="var(--line-strong)" />
      <path d="M150 182l20 12 20-12" stroke="var(--primary)" strokeWidth="3" fill="none" strokeLinecap="round" />
      <circle cx="252" cy="60" r="42" fill="#eef0ff" />
      <path
        d="M234 58l12 12 22-24"
        stroke="var(--success, #16a34a)"
        strokeWidth="6"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function NegotiationIllustration() {
  return (
    <svg viewBox="0 0 320 240" className="module-illustration" aria-hidden="true">
      <rect x="20" y="150" width="90" height="12" rx="6" fill="var(--line)" />
      <rect x="60" y="30" width="10" height="130" rx="5" fill="var(--line)" />
      <rect x="45" y="70" width="40" height="60" rx="8" fill="var(--primary)" opacity="0.85" />
      <circle cx="65" cy="52" r="16" fill="#eef0ff" stroke="var(--primary)" strokeWidth="2" />
      <rect x="210" y="150" width="90" height="12" rx="6" fill="var(--line)" />
      <rect x="248" y="30" width="10" height="130" rx="5" fill="var(--line)" />
      <rect x="233" y="70" width="40" height="60" rx="8" fill="#4f46e5" opacity="0.85" />
      <circle cx="253" cy="52" r="16" fill="#eef0ff" stroke="#4f46e5" strokeWidth="2" />
      <path
        d="M105 100h40a10 10 0 0110 10v4a10 10 0 01-10 10h-24l-10 10v-10h-6a10 10 0 01-10-10v-4a10 10 0 0110-10z"
        fill="var(--surface-2)"
        stroke="var(--line)"
      />
      <text x="150" y="122" fontSize="16" fontWeight="700" fill="var(--primary)">%</text>
      <path
        d="M175 60h40a9 9 0 019 9v4a9 9 0 01-9 9h-8v9l-11-9h-21a9 9 0 01-9-9v-4a9 9 0 019-9z"
        fill="var(--surface-2)"
        stroke="var(--line)"
      />
    </svg>
  );
}

const LETTER_TEMPLATES = [
  { id: "classic", label: { fr: "Classique", en: "Classic" }, icon: "docClassic" },
  { id: "modern", label: { fr: "Moderne", en: "Modern" }, icon: "docModern" },
  { id: "minimal", label: { fr: "Minimaliste", en: "Minimal" }, icon: "docMinimal" }
];

const LETTER_TONE_ICONS = { formal: "shield", enthusiastic: "matchmark", direct: "share" };

const EMAIL_CONFIDENCE_COPY = {
  smtp_confirmed: { fr: "Confirmé par le serveur mail", en: "Confirmed by the mail server" },
  pattern_only: { fr: "Suggestion probable (non vérifiée)", en: "Likely suggestion (unverified)" },
  smtp_rejected: { fr: "Rejeté par le serveur mail", en: "Rejected by the mail server" }
};

function EmailFinderPage({ language, userId, tokensBalance, onGoToTarifs, onConsumeToken }) {
  const copy =
    language === "en"
      ? {
          title: "Email Scout",
          subtitle: "Guess a professional email address from a name and a company — free, pattern-based.",
          disclaimer:
            "We generate the most common email patterns and check that the domain can receive mail. We only confirm real deliverability when the mail server responds during the search (not guaranteed) — never a fabricated score.",
          company: "Company name",
          companyPlaceholder: "e.g. Google",
          domain: "Or domain directly (optional)",
          domainPlaceholder: "e.g. google.com",
          firstName: "First name",
          firstNamePlaceholder: "e.g. Jean",
          lastName: "Last name",
          lastNamePlaceholder: "e.g. Dupont",
          submit: "Find email (1 token)",
          searching: "Searching…",
          noTokens: "You're out of tokens. Upgrade your plan to keep using Email Scout.",
          domainNoMxTitle: "Domain doesn't accept email",
          domainNoMx: "This domain doesn't appear to accept email — double-check the company name or domain.",
          bestMatch: "Most likely email",
          otherSuggestions: "Other suggestions",
          copy: "Copy",
          copied: "Copied!",
          emptyTitle: "No search yet",
          empty: "Fill in the form to get email suggestions."
        }
      : {
          title: "Email Scout",
          subtitle: "Devine une adresse email professionnelle à partir d'un nom et d'une entreprise — gratuit, basé sur des motifs.",
          disclaimer:
            "On génère les motifs d'email les plus courants et on vérifie que le domaine peut recevoir des emails. On ne confirme une vraie livrabilité que lorsque le serveur mail répond pendant la recherche (non garanti) — jamais un score inventé.",
          company: "Nom de l'entreprise",
          companyPlaceholder: "ex : Google",
          domain: "Ou domaine directement (optionnel)",
          domainPlaceholder: "ex : google.com",
          firstName: "Prénom",
          firstNamePlaceholder: "ex : Jean",
          lastName: "Nom",
          lastNamePlaceholder: "ex : Dupont",
          submit: "Trouver l'email (1 jeton)",
          searching: "Recherche…",
          noTokens: "Vous n'avez plus de jetons. Passez à un plan supérieur pour continuer à utiliser Email Scout.",
          domainNoMxTitle: "Domaine sans email",
          domainNoMx: "Ce domaine ne semble pas accepter d'emails — vérifie le nom de l'entreprise ou le domaine.",
          bestMatch: "Email le plus probable",
          otherSuggestions: "Autres suggestions",
          copy: "Copier",
          copied: "Copié !",
          emptyTitle: "Aucune recherche",
          empty: "Remplis le formulaire pour obtenir des suggestions d'email."
        };

  const [companyName, setCompanyName] = useState("");
  const [domain, setDomain] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const [copiedEmail, setCopiedEmail] = useState("");

  const outOfTokens = tokensBalance < 999 && tokensBalance <= 0;
  const canSubmit = firstName.trim() && lastName.trim() && (companyName.trim() || domain.trim());

  async function handleSubmit(event) {
    event.preventDefault();
    if (!canSubmit || isSearching) return;
    if (outOfTokens) {
      onGoToTarifs();
      return;
    }
    setError("");
    setIsSearching(true);
    setResult(null);
    try {
      const data = await findEmail({
        userId,
        companyName: companyName.trim(),
        domain: domain.trim(),
        firstName: firstName.trim(),
        lastName: lastName.trim()
      });
      setResult(data);
      await onConsumeToken();
    } catch (err) {
      setError(getFriendlyErrorMessage(err, language));
    } finally {
      setIsSearching(false);
    }
  }

  function handleCopy(email) {
    navigator.clipboard?.writeText(email);
    setCopiedEmail(email);
    setTimeout(() => setCopiedEmail(""), 1800);
  }

  return (
    <section className="email-finder-page">
      <header className="module-header feature-page-header">
        <span className="feature-page-header-icon">
          <UiIcon name="network" />
        </span>
        <div>
          <h2>{copy.title}</h2>
          <p>{copy.subtitle}</p>
        </div>
      </header>

      <div className="email-finder-callout">
        <span className="email-finder-callout-icon">
          <UiIcon name="shield" />
        </span>
        <p>{copy.disclaimer}</p>
      </div>

      <div className="email-finder-grid">
        <form className="email-finder-form" onSubmit={handleSubmit}>
          <label>
            {copy.company}
            <div className="email-finder-input-wrap">
              <UiIcon name="briefcase" />
              <input
                value={companyName}
                onChange={(event) => setCompanyName(event.target.value)}
                placeholder={copy.companyPlaceholder}
              />
            </div>
          </label>
          <label>
            {copy.domain}
            <div className="email-finder-input-wrap">
              <UiIcon name="globe" />
              <input value={domain} onChange={(event) => setDomain(event.target.value)} placeholder={copy.domainPlaceholder} />
            </div>
          </label>
          <div className="email-finder-name-row">
            <label>
              {copy.firstName}
              <div className="email-finder-input-wrap">
                <UiIcon name="profile" />
                <input
                  value={firstName}
                  onChange={(event) => setFirstName(event.target.value)}
                  placeholder={copy.firstNamePlaceholder}
                  required
                />
              </div>
            </label>
            <label>
              {copy.lastName}
              <div className="email-finder-input-wrap">
                <UiIcon name="profile" />
                <input
                  value={lastName}
                  onChange={(event) => setLastName(event.target.value)}
                  placeholder={copy.lastNamePlaceholder}
                  required
                />
              </div>
            </label>
          </div>

          {error ? <p className="field-error">{error}</p> : null}
          {outOfTokens ? <p className="field-hint">{copy.noTokens}</p> : null}

          <button type="submit" className="btn-main ready" disabled={!canSubmit || isSearching}>
            {isSearching ? <span className="btn-spinner" /> : null} {isSearching ? copy.searching : copy.submit}
          </button>
        </form>

        <div className="email-finder-results">
          {!result ? (
            <SchoolEmptyState icon="network" title={copy.emptyTitle} hint={copy.empty} />
          ) : !result.domainHasMx ? (
            <SchoolEmptyState icon="alert" title={copy.domainNoMxTitle} hint={copy.domainNoMx} />
          ) : (
            <>
              {result.best ? (
                <div className="email-finder-best">
                  <span className="email-finder-best-label">{copy.bestMatch}</span>
                  <div className="email-finder-email-row">
                    <strong>{result.best.email}</strong>
                    <button type="button" onClick={() => handleCopy(result.best.email)}>
                      {copiedEmail === result.best.email ? copy.copied : copy.copy}
                    </button>
                  </div>
                  <span className={`tag email-confidence-${result.best.confidence}`}>
                    {EMAIL_CONFIDENCE_COPY[result.best.confidence]?.[language] || result.best.confidence}
                  </span>
                </div>
              ) : null}

              {result.items?.length > 1 ? (
                <div className="email-finder-alternates">
                  <span className="email-finder-best-label">{copy.otherSuggestions}</span>
                  {result.items
                    .filter((item) => item.email !== result.best?.email)
                    .map((item) => (
                      <div key={item.email} className="email-finder-alt-row">
                        <span>{item.email}</span>
                        <span className={`tag email-confidence-${item.confidence}`}>
                          {EMAIL_CONFIDENCE_COPY[item.confidence]?.[language] || item.confidence}
                        </span>
                        <button type="button" onClick={() => handleCopy(item.email)}>
                          {copiedEmail === item.email ? copy.copied : copy.copy}
                        </button>
                      </div>
                    ))}
                </div>
              ) : null}
            </>
          )}
        </div>
      </div>
    </section>
  );
}

function CoverLetterPage({ language, userId, candidate, offer, tokensBalance, onGoToTarifs, onConsumeToken }) {
  const copy = APP_COPY[language]?.coverLetter || APP_COPY.fr.coverLetter;
  const [tone, setTone] = useState("formal");
  const [template, setTemplate] = useState("classic");
  const [letter, setLetter] = useState("");
  const [subject, setSubject] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [draftLetter, setDraftLetter] = useState("");
  const [conversations, setConversations] = useState([]);
  const [conversationId, setConversationId] = useState(null);

  const hasContext = Boolean(candidate && offer && (offer.title || offer.skills?.length));
  const outOfTokens = tokensBalance < 999 && tokensBalance <= 0;

  useEffect(() => {
    let cancelled = false;
    if (!userId) return undefined;
    listCoverLetters(userId)
      .then((items) => {
        if (!cancelled) setConversations(items || []);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const tones = [
    { id: "formal", label: copy.toneFormal },
    { id: "enthusiastic", label: copy.toneEnthusiastic },
    { id: "direct", label: copy.toneDirect }
  ];

  function conversationTitle() {
    return offer?.title ? `${offer.title}${offer.company ? ` · ${offer.company}` : ""}` : copy.untitled;
  }

  async function persistConversation(nextLetter, nextSubject) {
    if (!userId) return;
    const payload = { letter: nextLetter, subject: nextSubject, tone, template, offer };
    try {
      if (conversationId) {
        await updateCoverLetter({ userId, conversationId, payload });
        setConversations((prev) =>
          prev.map((item) => (item.id === conversationId ? { ...item, ...payload, updatedAt: new Date().toISOString() } : item))
        );
      } else {
        const created = await saveCoverLetter({ userId, title: conversationTitle(), payload });
        setConversationId(created.id);
        setConversations((prev) => [{ ...created }, ...prev]);
      }
    } catch (_err) {
      // La sauvegarde de l'historique est secondaire : la lettre reste utilisable même si elle échoue.
    }
  }

  function handleNewConversation() {
    setLetter("");
    setSubject("");
    setConversationId(null);
    setIsEditing(false);
    setError("");
  }

  function handleResumeConversation(conv) {
    setConversationId(conv.id);
    setLetter(conv.letter || "");
    setSubject(conv.subject || "");
    if (conv.tone) setTone(conv.tone);
    if (conv.template) setTemplate(conv.template);
    setIsEditing(false);
    setError("");
  }

  async function handleDeleteConversation(event, conv) {
    event.stopPropagation();
    if (!userId) return;
    if (typeof window !== "undefined" && !window.confirm(copy.deleteConfirm)) return;
    try {
      await deleteCoverLetter({ userId, conversationId: conv.id });
      setConversations((prev) => prev.filter((item) => item.id !== conv.id));
      if (conversationId === conv.id) handleNewConversation();
    } catch (_err) {
      // Non bloquant.
    }
  }

  async function handleGenerate() {
    if (!hasContext || isGenerating) return;
    if (outOfTokens) {
      onGoToTarifs();
      return;
    }
    setError("");
    setIsGenerating(true);
    setIsEditing(false);
    try {
      const result = await generateCoverLetter({ candidate, offer, tone, language });
      setLetter(result.letter);
      setSubject(result.subject || "");
      await onConsumeToken();
      await persistConversation(result.letter, result.subject || "");
    } catch (err) {
      setError(getFriendlyErrorMessage(err, language));
    } finally {
      setIsGenerating(false);
    }
  }

  function handleCopy() {
    navigator.clipboard?.writeText(letter);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  function handleDownload() {
    window.print();
  }

  function startEditing() {
    setDraftLetter(letter);
    setIsEditing(true);
  }

  async function saveEditing() {
    setLetter(draftLetter);
    setIsEditing(false);
    await persistConversation(draftLetter, subject);
  }

  function cancelEditing() {
    setIsEditing(false);
  }

  if (!hasContext) {
    return (
      <section className="module-locked">
        <div className="module-locked-copy">
          <h2>{copy.title}</h2>
          <p>{copy.empty}</p>
        </div>
        <div className="module-locked-art">
          <CoverLetterIllustration />
        </div>
      </section>
    );
  }

  const historySidebar = (
    <aside className="negotiation-history">
      <button type="button" className="negotiation-new-btn" onClick={handleNewConversation}>
        <UiIcon name="plus" /> {copy.newConversation}
      </button>
      <span className="negotiation-history-label">{copy.history}</span>
      {conversations.length ? (
        <ul className="negotiation-history-list">
          {conversations.map((conv) => (
            <li
              key={conv.id}
              className={`negotiation-history-item${conv.id === conversationId ? " active" : ""}`}
              onClick={() => handleResumeConversation(conv)}
            >
              <span className="negotiation-history-title">{conv.title || copy.untitled}</span>
              <button
                type="button"
                className="negotiation-history-delete"
                onClick={(event) => handleDeleteConversation(event, conv)}
                aria-label={copy.deleteConversation}
              >
                <UiIcon name="trash" />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="negotiation-history-empty">{copy.noHistory}</p>
      )}
    </aside>
  );

  return (
    <div className="negotiation-layout">
      {historySidebar}
      <section className="cover-letter-page">
      <header className="module-header feature-page-header">
        <span className="feature-page-header-icon">
          <UiIcon name="mail" />
        </span>
        <div>
          <h2>{copy.title}</h2>
          <p>{copy.subtitle}</p>
        </div>
      </header>

      <div className="cover-letter-config-card">
        <div className="tone-selector">
          <span>{copy.toneLabel}</span>
          <div className="tone-pills">
            {tones.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`tone-pill ${tone === item.id ? "active" : ""}`}
                onClick={() => setTone(item.id)}
              >
                <UiIcon name={LETTER_TONE_ICONS[item.id]} />
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div className="tone-selector">
          <span>{copy.templateLabel}</span>
          <div className="tone-pills">
            {LETTER_TEMPLATES.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`tone-pill template-pill template-pill-${item.id} ${template === item.id ? "active" : ""}`}
                onClick={() => setTemplate(item.id)}
              >
                <UiIcon name={item.icon} />
                {item.label[language] || item.label.fr}
              </button>
            ))}
          </div>
        </div>
      </div>

      {error ? <p className="field-error">{error}</p> : null}

      {!letter ? (
        <div className="cover-letter-empty">
          <CoverLetterIllustration />
          <button type="button" className="btn-main ready" onClick={handleGenerate} disabled={isGenerating}>
            {isGenerating ? (
              <>
                <span className="btn-spinner" /> {copy.generating}
              </>
            ) : (
              copy.generate
            )}
          </button>
        </div>
      ) : (
        <div className="letter-document-card">
          <div className="letter-toolbar no-print">
            {isEditing ? (
              <>
                <button type="button" className="btn-ghost" onClick={cancelEditing}>
                  {copy.cancelEdit}
                </button>
                <button type="button" className="btn-main" onClick={saveEditing}>
                  {copy.saveEdit}
                </button>
              </>
            ) : (
              <>
                <button type="button" className="btn-ghost" onClick={handleGenerate} disabled={isGenerating}>
                  {isGenerating ? <span className="btn-spinner" /> : null} {copy.regenerate}
                </button>
                <button type="button" className="btn-ghost" onClick={startEditing}>
                  <UiIcon name="edit" /> {copy.edit}
                </button>
                <button type="button" className="btn-ghost" onClick={handleCopy}>
                  {copied ? copy.copied : copy.copy}
                </button>
                <button type="button" className="btn-main" onClick={handleDownload}>
                  <UiIcon name="download" /> {copy.download}
                </button>
              </>
            )}
          </div>
          {isEditing ? (
            <textarea
              className={`letter-document letter-document-edit template-${template}`}
              value={draftLetter}
              onChange={(event) => setDraftLetter(event.target.value)}
            />
          ) : (
            <div className={`letter-document template-${template}`} id="cover-letter-document">
              {subject ? <p className="letter-subject">{subject}</p> : null}
              {letter.split("\n\n").map((paragraph, index) => (
                <p key={`para-${index}`}>{paragraph}</p>
              ))}
            </div>
          )}
        </div>
      )}
      </section>
    </div>
  );
}

function SalaryNegotiationPage({ language, currency = "EUR", userId, candidate, offer, tokensBalance, onGoToTarifs, onConsumeToken }) {
  const copy = APP_COPY[language]?.negotiation || APP_COPY.fr.negotiation;
  const currencyOption = getCurrencyOption(currency);
  const [targetSalary, setTargetSalary] = useState("");
  const [started, setStarted] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isFinishing, setIsFinishing] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState("");
  const [salaryReference, setSalaryReference] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [conversationId, setConversationId] = useState(null);

  useEffect(() => {
    let cancelled = false;
    if (!userId) return undefined;
    listNegotiationConversations(userId)
      .then((items) => {
        if (!cancelled) setConversations(items || []);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [userId]);

  function conversationTitle() {
    return offer?.title ? `${offer.title}${offer.location ? ` · ${offer.location}` : ""}` : copy.untitled;
  }

  function buildPayload(nextMessages, nextSalaryReference, nextSummary) {
    return {
      messages: nextMessages,
      salaryReference: nextSalaryReference,
      targetSalary,
      offer,
      summary: nextSummary || null
    };
  }

  async function persistConversation(nextMessages, nextSalaryReference, nextSummary) {
    if (!userId) return;
    const payload = buildPayload(nextMessages, nextSalaryReference, nextSummary);
    try {
      if (conversationId) {
        await updateNegotiationConversation({ userId, conversationId, payload });
        setConversations((prev) =>
          prev.map((item) => (item.id === conversationId ? { ...item, ...payload, updatedAt: nowIsoClient() } : item))
        );
      } else {
        const created = await saveNegotiationConversation({ userId, title: conversationTitle(), payload });
        setConversationId(created.id);
        setConversations((prev) => [{ ...created }, ...prev]);
      }
    } catch (_err) {
      // La sauvegarde de l'historique est secondaire : la négociation en cours reste utilisable même si elle échoue.
    }
  }

  function nowIsoClient() {
    return new Date().toISOString();
  }

  function handleNewConversation() {
    setStarted(false);
    setMessages([]);
    setSalaryReference(null);
    setSummary(null);
    setTargetSalary("");
    setConversationId(null);
    setError("");
  }

  function handleResumeConversation(conv) {
    setConversationId(conv.id);
    setMessages(conv.messages || []);
    setSalaryReference(conv.salaryReference || null);
    setSummary(conv.summary || null);
    setTargetSalary(conv.targetSalary || "");
    setStarted(true);
    setError("");
  }

  async function handleDeleteConversation(event, conv) {
    event.stopPropagation();
    if (!userId) return;
    if (typeof window !== "undefined" && !window.confirm(copy.deleteConfirm)) return;
    try {
      await deleteNegotiationConversation({ userId, conversationId: conv.id });
      setConversations((prev) => prev.filter((item) => item.id !== conv.id));
      if (conversationId === conv.id) handleNewConversation();
    } catch (_err) {
      // Non bloquant.
    }
  }

  const hasContext = Boolean(candidate && offer && (offer.title || offer.skills?.length));
  const outOfTokens = tokensBalance < 999 && tokensBalance <= 0;

  const targetSalaryDisplay = targetSalary ? Number(targetSalary).toLocaleString(language === "en" ? "en-US" : "fr-FR") : "";
  const targetSalaryFormatted = targetSalary
    ? currencyOption.position === "before"
      ? `${currencyOption.symbol}${targetSalaryDisplay}`
      : `${targetSalaryDisplay} ${currencyOption.symbol}`
    : "";
  const targetSalaryLabel = targetSalary
    ? language === "en"
      ? `${targetSalaryFormatted} / year`
      : `${targetSalaryFormatted} brut annuel`
    : "";

  function handleTargetSalaryChange(event) {
    setTargetSalary(event.target.value.replace(/\D/g, "").slice(0, 7));
  }

  function historyPayload(nextMessages) {
    return nextMessages.map((msg) => ({
      role: msg.type === "user" ? "user" : "recruiter",
      text: msg.text
    }));
  }

  async function handleStart() {
    if (!hasContext || isStarting) return;
    if (outOfTokens) {
      onGoToTarifs();
      return;
    }
    setError("");
    setIsStarting(true);
    try {
      const result = await negotiationReply({
        candidate,
        offer,
        history: [],
        targetSalary: targetSalaryLabel,
        finish: false,
        currencyLabel: currencyOption.label
      });
      const nextMessages = [{ type: "ai", text: result.reply }, { type: "feedback", text: `${copy.tip}: ${result.tip}` }];
      setMessages(nextMessages);
      setSalaryReference(result.salaryReference || null);
      await onConsumeToken();
      setStarted(true);
      await persistConversation(nextMessages, result.salaryReference || null, null);
    } catch (err) {
      setError(getFriendlyErrorMessage(err, language));
    } finally {
      setIsStarting(false);
    }
  }

  async function handleSend() {
    const text = input.trim();
    if (!text || isSending) return;
    const withUser = [...messages, { type: "user", text }];
    setMessages(withUser);
    setInput("");
    setIsSending(true);
    setError("");
    try {
      const result = await negotiationReply({
        candidate,
        offer,
        history: historyPayload(withUser),
        targetSalary: targetSalaryLabel,
        finish: false,
        currencyLabel: currencyOption.label,
        salaryReference
      });
      const nextMessages = [...withUser, { type: "ai", text: result.reply }, { type: "feedback", text: `${copy.tip}: ${result.tip}` }];
      setMessages(nextMessages);
      await persistConversation(nextMessages, salaryReference, null);
    } catch (err) {
      setError(getFriendlyErrorMessage(err, language));
    } finally {
      setIsSending(false);
    }
  }

  async function handleFinish() {
    if (isFinishing || !messages.length) return;
    setIsFinishing(true);
    setError("");
    try {
      const result = await negotiationReply({
        candidate,
        offer,
        history: historyPayload(messages),
        targetSalary: targetSalaryLabel,
        finish: true,
        currencyLabel: currencyOption.label
      });
      setSummary(result);
      await persistConversation(messages, salaryReference, result);
    } catch (err) {
      setError(getFriendlyErrorMessage(err, language));
    } finally {
      setIsFinishing(false);
    }
  }

  if (!hasContext) {
    return (
      <section className="module-locked">
        <div className="module-locked-copy">
          <h2>{copy.title}</h2>
          <p>{copy.empty}</p>
        </div>
        <div className="module-locked-art">
          <NegotiationIllustration />
        </div>
      </section>
    );
  }

  const historySidebar = (
    <aside className="negotiation-history">
      <button type="button" className="negotiation-new-btn" onClick={handleNewConversation}>
        <UiIcon name="plus" /> {copy.newConversation}
      </button>
      <span className="negotiation-history-label">{copy.history}</span>
      {conversations.length ? (
        <ul className="negotiation-history-list">
          {conversations.map((conv) => (
            <li
              key={conv.id}
              className={`negotiation-history-item${conv.id === conversationId ? " active" : ""}`}
              onClick={() => handleResumeConversation(conv)}
            >
              <span className="negotiation-history-title">{conv.title || copy.untitled}</span>
              <button
                type="button"
                className="negotiation-history-delete"
                onClick={(event) => handleDeleteConversation(event, conv)}
                aria-label={copy.deleteConversation}
              >
                <UiIcon name="trash" />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="negotiation-history-empty">{copy.noHistory}</p>
      )}
    </aside>
  );

  if (!started) {
    return (
      <div className="negotiation-layout">
        {historySidebar}
        <section className="negotiation-start">
          <NegotiationIllustration />
          <h2>{copy.title}</h2>
          <p>{copy.subtitle}</p>
          <label className="negotiation-target">
            <span>{copy.targetLabel}</span>
            <div className="negotiation-target-input">
              <input
                type="text"
                inputMode="numeric"
                value={targetSalaryDisplay}
                onChange={handleTargetSalaryChange}
                placeholder={copy.targetPlaceholder}
              />
              <span className="negotiation-target-suffix">
                {currencyOption.symbol} {language === "en" ? "/ yr" : "/ an"}
              </span>
            </div>
          </label>
          {error ? <p className="field-error">{error}</p> : null}
          <button type="button" className="btn-main ready" onClick={handleStart} disabled={isStarting}>
            {isStarting ? (
              <>
                <span className="btn-spinner" /> {copy.starting}
              </>
            ) : (
              copy.start
            )}
          </button>
        </section>
      </div>
    );
  }

  if (summary) {
    return (
      <div className="negotiation-layout">
        {historySidebar}
        <section className="negotiation-summary advice-card">
          <h3>{copy.summary}</h3>
          <p>{summary.summary}</p>
          <div className="three-cols">
            <div>
              <h5>{copy.strengths}</h5>
              <ul>
                {(summary.strengths || []).map((point, idx) => (
                  <li key={`s-${idx}`}>{point}</li>
                ))}
              </ul>
            </div>
            <div>
              <h5>{copy.improvements}</h5>
              <ul>
                {(summary.improvements || []).map((point, idx) => (
                  <li key={`i-${idx}`}>{point}</li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="negotiation-layout">
      {historySidebar}
      <section className="negotiation-page">
      {salaryReference ? (
        <div className="salary-reference-banner">
          <UiIcon name="chart" />
          <span>
            {language === "en" ? "Real market range: " : "Fourchette réelle de marché : "}
            <strong>
              {formatAmountInCurrency(salaryReference.min, currency)} – {formatAmountInCurrency(salaryReference.max, currency)}
            </strong>{" "}
            {language === "en" ? "based on" : "basée sur"}{" "}
            {salaryReference.sources.map((source) => source.name).join(" + ")}
            {language === "en" ? " listings." : "."}
          </span>
        </div>
      ) : (
        <div className="salary-reference-banner muted">
          <UiIcon name="alert" />
          <span>
            {language === "en"
              ? "No real market data found for this role — figures below are AI estimates only."
              : "Aucune donnée de marché réelle trouvée pour ce poste — les montants ci-dessous sont des estimations IA uniquement."}
          </span>
        </div>
      )}

      <div className="chat card">
        <div className="chat-stream negotiation-stream">
          {messages.map((msg, idx) => {
            if (msg.type === "feedback") {
              return (
                <div key={`${msg.type}-${idx}`} className={`msg ${msg.type}`}>
                  <p>{msg.text}</p>
                </div>
              );
            }
            return (
              <div key={`${msg.type}-${idx}`} className={`msg-row msg-row-${msg.type}`}>
                {msg.type === "ai" ? (
                  <span className="msg-avatar msg-avatar-ai">
                    <UiIcon name="briefcase" />
                  </span>
                ) : null}
                <div className={`msg ${msg.type}`}>
                  <p>{msg.text}</p>
                </div>
                {msg.type === "user" ? (
                  <span className="msg-avatar msg-avatar-user">
                    <UiIcon name="profile" />
                  </span>
                ) : null}
              </div>
            );
          })}
        </div>
        {error ? <p className="field-error">{error}</p> : null}
        <div className="chat-input-row">
          <textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder={copy.placeholder}
            rows={2}
          />
          <button className="btn-main" onClick={handleSend} disabled={isSending}>
            {isSending ? <span className="btn-spinner" /> : copy.send}
          </button>
        </div>
        <button type="button" className="btn-ghost negotiation-finish" onClick={handleFinish} disabled={isFinishing}>
          {isFinishing ? (
            <>
              <span className="btn-spinner" /> {copy.finishing}
            </>
          ) : (
            copy.finish
          )}
        </button>
      </div>
      </section>
    </div>
  );
}

function CvHistoryPage({ cvHistory, latestMatch, language }) {
  const [expandedIds, setExpandedIds] = useState({});

  const emptyTitle = language === "en" ? "No CV generated yet" : "Aucun CV généré pour le moment";
  const emptyText =
    language === "en"
      ? "Your history will appear here each time you import and optimize a CV."
      : "Votre historique apparaîtra ici à chaque fois que vous importerez et optimiserez un CV.";

  function toggleExpanded(cvId) {
    setExpandedIds((prev) => ({ ...prev, [cvId]: !prev[cvId] }));
  }

  if (!cvHistory.length) {
    return (
      <section className="history-empty">
        <div className="history-empty-icon">
          <UiIcon name="history" />
        </div>
        <h2>{emptyTitle}</h2>
        <p>{emptyText}</p>
      </section>
    );
  }

  return (
    <section className="cv-history-page">
      <div className="card block history-head">
        <div className="feature-page-header">
          <span className="feature-page-header-icon">
            <UiIcon name="history" />
          </span>
          <div>
            <h2>{language === "en" ? "CV history" : "Historique CV"}</h2>
            <p className="muted">
              {language === "en"
                ? "All imported CVs are kept here with their extracted data."
                : "Tous les CV importés sont conservés ici avec leurs données extraites."}
            </p>
          </div>
        </div>
        <div className="history-count-badge">
          <strong>{cvHistory.length}</strong>
          <span>{cvHistory.length > 1 ? (language === "en" ? "CVs" : "CV importés") : (language === "en" ? "CV" : "CV importé")}</span>
        </div>
      </div>

      <div className="history-list">
        {cvHistory.map((cv) => {
          const skills = cv.parsed?.skills || [];
          const score = latestMatch?.summary?.globalScore ?? null;
          const scoreTier = score === null ? null : score >= 80 ? "excellent" : score >= 65 ? "good" : score >= 50 ? "average" : "weak";
          const isExpanded = Boolean(expandedIds[cv.id]);
          const collapsedCount = 10;
          const visibleSkills = isExpanded ? skills : skills.slice(0, collapsedCount);
          const hiddenCount = skills.length - visibleSkills.length;

          return (
            <article className="history-card" key={cv.id}>
              <div className="history-card-top">
                <div className="history-card-main">
                  <span className="history-card-icon">
                    <UiIcon name="history" />
                  </span>
                  <div>
                    <h3>{cv.fileName}</h3>
                    <p>{formatDate(cv.createdAt)}</p>
                  </div>
                </div>
                {score !== null ? (
                  <div className={`history-card-score tier-${scoreTier}`}>
                    <strong>{score}</strong>
                    <span>/100</span>
                  </div>
                ) : null}
              </div>

              <div className="history-card-stats">
                <span className="history-card-stat">
                  <UiIcon name="chart" />
                  {skills.length} {language === "en" ? "skills detected" : "compétences détectées"}
                </span>
              </div>

              <div className="job-chip-row history-skill-row">
                {visibleSkills.map((skill) => (
                  <span key={`${cv.id}-${skill}`}>{skill}</span>
                ))}
                {!skills.length ? <span>{language === "en" ? "No skill detected" : "Aucune compétence détectée"}</span> : null}
              </div>
              {skills.length > collapsedCount ? (
                <button type="button" className="history-skill-toggle" onClick={() => toggleExpanded(cv.id)}>
                  {isExpanded
                    ? language === "en"
                      ? "Show less"
                      : "Voir moins"
                    : language === "en"
                    ? `Show all (+${hiddenCount})`
                    : `Voir tout (+${hiddenCount})`}
                  <UiIcon name="chevron" className={`history-skill-toggle-icon ${isExpanded ? "open" : ""}`} />
                </button>
              ) : null}
            </article>
          );
        })}
      </div>
    </section>
  );
}

function Placeholder({ title, text }) {
  return (
    <section className="placeholder card">
      <h2>{title}</h2>
      <p>{text}</p>
    </section>
  );
}

function profileToForm(profile = {}) {
  return {
    headline: profile.headline || "",
    location: profile.location || "",
    targetRole: profile.targetRole || "",
    sector: profile.sector || "",
    experienceYears: profile.experienceYears || 0,
    education: profile.education || "",
    skills: Array.isArray(profile.skills) ? profile.skills.join(", ") : "",
    languages: Array.isArray(profile.languages) ? profile.languages.join(", ") : ""
  };
}








