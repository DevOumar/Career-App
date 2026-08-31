import React, { useEffect, useMemo, useRef, useState } from "react";
import Swal from "sweetalert2";
import "sweetalert2/dist/sweetalert2.min.css";
import { UiIcon } from "./components/UiIcon.jsx";
import { AvatarCircle, getAvatarSource } from "./components/AvatarCircle.jsx";
import { LanguageSwitch } from "./components/LanguageSwitch.jsx";
import InterviewPage from "./features/interviews/InterviewPage.jsx";
import SalaryNegotiationPage from "./features/negotiation/SalaryNegotiationPage.jsx";
import ApplicationsPage from "./features/applications/ApplicationsPage.jsx";
import { AdminApp } from "./features/admin/AdminApp.jsx";
import SchoolApp, { SchoolEmptyState } from "./features/school/SchoolApp.jsx";
import { ImportPage, AnalysisPage, OffersPage, CvHistoryPage } from "./features/cv/CvPages.jsx";
import { APPLICATIONS_COPY } from "./features/applications/applicationsCopy.js";
import { SatisfactionSurveyModal, satisfactionTierFor } from "./features/satisfaction/SatisfactionSurveyModal.jsx";
import AccountDrawer from "./features/account/AccountDrawer.jsx";
import { LandingPage, PRODUCT_SECTION_IDS, InfoPage, AboutPage, ContactPage, FooterColumn } from "./features/landing/LandingPage.jsx";
import { LegalDocPage, PrivacyPolicyPage, TermsOfServicePage } from "./features/legal/LegalPages.jsx";
import { PublicPricingPage, PricingPage, PRICING_SEGMENTS, allowedPricingSegmentsForRole } from "./features/pricing/PricingPage.jsx";
import HomePage from "./features/home/HomePage.jsx";
import ProfilePage from "./features/profile/ProfilePage.jsx";
import CoverLetterPage from "./features/coverLetter/CoverLetterPage.jsx";
import EmailFinderPage from "./features/emailScout/EmailFinderPage.jsx";
import {
  CURRENCY_OPTIONS,
  getCurrencyOption,
  formatAmountInCurrency,
  formatPlanPrice,
  fillTemplate,
  formatDate,
  formatShortDate
} from "./lib/format.js";
import { getFriendlyErrorMessage, getCvImportErrorMessage } from "./lib/errors.js";
import { ACCOUNT_LABELS, getAccountLabel, getUsernameValidation, accountToForm, buildAccountPatch } from "./lib/accounts.js";
import { resizeImageFileToDataUrl } from "./lib/images.js";
import {
  activatePlan,
  activatePremiumSubscription,
  addCvRecord,
  analyzeMatch,
  changeUserPassword,
  consumeTokens,
  createStripeCheckoutSession,
  confirmStripeCheckoutSession,
  requestPasswordReset,
  resetPassword,
  getNotifications,
  revokeSession,
  exportAccountData,
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

function getCurrency() {
  try {
    return localStorage.getItem("career_app_currency") || "EUR";
  } catch (_error) {
    return "EUR";
  }
}

export const THEME_PRESETS = [
  {
    id: "blue",
    label: { fr: "Bleu", en: "Blue" },
    swatch: "#1a0dab",
    vars: { "--primary": "#1a0dab", "--primary-2": "#1a0dab", "--primary-ink": "#120879", "--bg-accent": "#f0edf8" }
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
    label: { fr: "Corail (défaut)", en: "Coral (default)" },
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
    return THEME_PRESETS.some((item) => item.id === stored) ? stored : "orange";
  } catch (_error) {
    return "orange";
  }
}

function applyThemeVars(themeId) {
  const preset = THEME_PRESETS.find((item) => item.id === themeId) || THEME_PRESETS.find((item) => item.id === "orange");
  const root = document.documentElement;
  Object.entries(preset.vars).forEach(([key, value]) => {
    root.style.setProperty(key, value);
  });
}

function getMode() {
  // Le mode sombre n'est pas fini : la plupart des composants utilisent des
  // couleurs codées en dur plutôt que les variables de thème, ce qui rend
  // l'app illisible par endroits une fois activé (topbar, AccountDrawer...).
  // Le bouton pour l'activer est retiré des Préférences en attendant un
  // vrai passage sur tout le CSS ; on force aussi "light" ici pour remettre
  // d'aplomb un compte resté coincé en sombre avant ce retrait.
  return "light";
}

function getDensity() {
  try {
    const stored = localStorage.getItem("career_app_density");
    return stored === "compact" ? "compact" : "comfortable";
  } catch (_error) {
    return "comfortable";
  }
}

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
      "Career CV transforme le CV et l'offre en lecture simple : score, mots-clés manquants, forces détectées et priorités d'amélioration.",
    atsPanelTitle: "Aperçu d'analyse",
    atsPanelHint: "Le module compare votre CV avec l'offre ciblée et prépare les prochaines actions.",
    featuresTitle: "Tout ce qu'il vous faut.",
    featuresText: "Une suite d'outils pour transformer un CV en candidatures mieux ciblées.",
    featureCards: [
      {
        title: "CV Optimizer",
        text: "Analyse CV/offre, score de compatibilité et recommandations concrètes.",
        tags: ["Analyse ATS", "Mots-clés", "Réécriture"],
        icon: "upload"
      },
      {
        title: "Interview Coach",
        text: "Simulateur d'entretien avec feedback en direct, chat ou appel vocal, et bilan détaillé en fin de session.",
        tags: ["RH", "Technique", "Voix"],
        icon: "chat"
      },
      {
        title: "Job Matching",
        text: "Classement des offres selon vos compétences, votre expérience et vos objectifs.",
        tags: ["Score", "Gaps", "Priorités"],
        icon: "chart"
      },
      {
        title: "Lettre IA",
        text: "Lettre de motivation générée à partir de votre profil réel et de l'offre visée, en plusieurs tons et modèles.",
        tags: ["Personnalisée", "Modifiable", "Export PDF"],
        icon: "matchmark"
      },
      {
        title: "Négociation salariale",
        text: "Entraînez-vous face à un recruteur IA réaliste et recevez des conseils concrets avant l'entretien décisif.",
        tags: ["Coaching", "Prétentions", "Confiance"],
        icon: "scale"
      },
      {
        title: "Email Scout",
        text: "Retrouvez l'email professionnel probable d'un recruteur en quelques secondes, avec vérification du domaine.",
        tags: ["Contact direct", "Vérifié", "Rapide"],
        icon: "mail"
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
    faqText: "Réponses courtes et claires sur ce que Career CV fait réellement.",
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
      },
      {
        q: "Comment fonctionne le simulateur de négociation salariale ?",
        a: "Indiquez votre prétention salariale visée, puis échangez avec un recruteur IA réaliste qui teste vos arguments. Vous recevez des conseils concrets et un bilan pour aborder la vraie négociation avec plus de confiance."
      },
      {
        q: "Qu'est-ce qu'Email Scout ?",
        a: "À partir du nom d'une entreprise et d'un contact, Email Scout teste les formats d'email les plus courants et vérifie en direct que le domaine peut recevoir des messages, pour vous donner une piste fiable plutôt qu'un coup de chance."
      },
      {
        q: "J'ai oublié mon mot de passe, comment le récupérer ?",
        a: "Cliquez sur « Mot de passe oublié ? » sur l'écran de connexion : vous recevez un code par email pour choisir un nouveau mot de passe, sans perdre l'accès à votre compte."
      }
    ],
    footerText: "Career CV aide les candidats à optimiser leur CV, cibler les bonnes offres et préparer leurs entretiens.",
    footerProduct: "Produit",
    footerCompany: "Entreprise",
    footerLegal: "Légal",
    linksProduct: ["Fonctionnalités", "Matching CV", "Entretiens", "Lettre IA", "Négociation", "Email Scout", "Offres", "Tarifs", "FAQ"],
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
      "Career CV turns a CV and job post into a clear reading: score, missing keywords, detected strengths, and improvement priorities.",
    atsPanelTitle: "Analysis preview",
    atsPanelHint: "The module compares your CV with the target role and prepares the next actions.",
    featuresTitle: "Everything you need.",
    featuresText: "A focused toolkit to turn one CV into better targeted applications.",
    featureCards: [
      {
        title: "CV Optimizer",
        text: "CV/job analysis, compatibility score, and concrete recommendations.",
        tags: ["ATS analysis", "Keywords", "Rewrite"],
        icon: "upload"
      },
      {
        title: "Interview Coach",
        text: "Interview simulator with live feedback, chat or voice call, and a detailed wrap-up at the end.",
        tags: ["HR", "Technical", "Voice"],
        icon: "chat"
      },
      {
        title: "Job Matching",
        text: "Rank jobs based on your skills, experience, and goals.",
        tags: ["Score", "Gaps", "Priorities"],
        icon: "chart"
      },
      {
        title: "AI Cover Letter",
        text: "A cover letter generated from your real profile and the target job, in several tones and templates.",
        tags: ["Personalized", "Editable", "PDF export"],
        icon: "matchmark"
      },
      {
        title: "Salary Negotiation",
        text: "Practice with a realistic AI recruiter and get concrete coaching before the real conversation.",
        tags: ["Coaching", "Expectations", "Confidence"],
        icon: "scale"
      },
      {
        title: "Email Scout",
        text: "Find a recruiter's likely professional email in seconds, with domain verification.",
        tags: ["Direct contact", "Verified", "Fast"],
        icon: "mail"
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
    faqText: "Short, honest answers about what Career CV actually does.",
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
      },
      {
        q: "How does the salary negotiation simulator work?",
        a: "Enter your target salary, then chat with a realistic AI recruiter who tests your arguments. You get concrete coaching and a wrap-up to approach the real negotiation with more confidence."
      },
      {
        q: "What is Email Scout?",
        a: "From a company name and a contact's name, Email Scout tests the most common email formats and verifies live that the domain can receive messages, giving you a reliable lead instead of a guess."
      },
      {
        q: "I forgot my password, how do I get it back?",
        a: "Click \"Forgot password?\" on the login screen: you'll receive a code by email to choose a new password without losing access to your account."
      }
    ],
    footerText: "Career CV helps candidates optimize CVs, target the right jobs, and prepare interviews.",
    footerProduct: "Product",
    footerCompany: "Company",
    footerLegal: "Legal",
    linksProduct: ["Features", "CV matching", "Interviews", "AI Letter", "Negotiation", "Email Scout", "Jobs", "Pricing", "FAQ"],
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

export const ACCOUNT_TYPE_OPTIONS = [
  { value: "student", label: "Étudiant", description: "Recherche de stage, alternance ou premier emploi." },
  { value: "candidate", label: "Candidat", description: "Recherche active d'opportunités professionnelles." },
  { value: "recruiter_firm", label: "Cabinet de recrutement", description: "Sourcing et placement pour des clients." },
  { value: "recruiter_internal", label: "Recruteur interne", description: "Talent acquisition au sein d'une entreprise." },
  { value: "company", label: "Entreprise", description: "Équipe RH ou manager qui publie des offres." },
  { value: "school", label: "École / Université", description: "Placement étudiants et partenariat entreprises." },
  { value: "coach", label: "Coach carrière", description: "Accompagnement CV, préparation entretien, mentoring." },
  { value: "other", label: "Autre", description: "Autre profil professionnel lié à l'emploi." }
];

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
  }
};

function unique(list) {
  return [...new Set(list.filter(Boolean))];
}

export function levelTag(level) {
  if (level === "critique") return "crit";
  if (level === "important") return "warn";
  if (level === "premium") return "premium";
  return "good";
}

export function recommendationLevelLabel(level, language = "fr") {
  const labels = {
    fr: { critique: "Critique", important: "Important", bonus: "Bonus", premium: "Premium" },
    en: { critique: "Critical", important: "Important", bonus: "Bonus", premium: "Premium" }
  };
  return labels[language]?.[level] || labels.fr[level] || level;
}

export function ratingLabel(score, language = "fr") {
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


// Date + heure (contrairement à formatDate, partagé ailleurs et qui ne
// montre que la date) : utile ici pour distinguer plusieurs notifications
// du même jour dans un flux qui se rafraîchit toutes les 60s.
function formatDateTime(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

// Traduit chaque type de notification candidat en texte affichable. Chaque
// type correspond à un événement réel calculé côté serveur (voir
// GET /api/notifications, backend/routes/applications.js) — sécurité du
// compte, paiement encaissé, solde de jetons bas, candidature laissée en
// attente, profil incomplet. Rien de fabriqué côté front.
function candidateNotificationText(item, language) {
  switch (item.type) {
    case "password_changed":
      return {
        icon: "shield",
        title: language === "en" ? "Password changed" : "Mot de passe modifié",
        detail: language === "en" ? "Your password was changed." : "Votre mot de passe a été changé."
      };
    case "password_reset_completed":
      return {
        icon: "shield",
        title: language === "en" ? "Password reset" : "Mot de passe réinitialisé",
        detail: language === "en" ? "Your password was reset via email code." : "Votre mot de passe a été réinitialisé via un code email."
      };
    case "login_locked":
      return {
        icon: "alert",
        title: language === "en" ? "Account temporarily locked" : "Compte temporairement verrouillé",
        detail: language === "en" ? "Too many failed login attempts." : "Trop de tentatives de connexion échouées."
      };
    case "connected_account_linked":
      return {
        icon: "shield",
        title: language === "en" ? "Google account linked" : "Compte Google lié",
        detail: language === "en" ? "You can now sign in with Google." : "Vous pouvez désormais vous connecter avec Google."
      };
    case "connected_account_removed":
      return {
        icon: "shield",
        title: language === "en" ? "Google account unlinked" : "Compte Google délié",
        detail: language === "en" ? "Google sign-in was removed from your account." : "La connexion Google a été retirée de votre compte."
      };
    case "payment_confirmed": {
      const planName = getPlanById(item.data?.planId)?.name?.[language] || getPlanById(item.data?.planId)?.name?.fr || item.data?.planId;
      return {
        icon: "pricetag",
        title: language === "en" ? "Payment confirmed" : "Paiement confirmé",
        detail: `${formatAmountInCurrency(item.data?.amount, item.data?.currency || "EUR")} · ${planName}`
      };
    }
    case "balance_empty":
      return {
        icon: "alert",
        title: language === "en" ? "Token balance empty" : "Solde de jetons épuisé",
        detail: language === "en" ? "Top up to keep using the AI modules." : "Rechargez pour continuer à utiliser les modules IA."
      };
    case "balance_low":
      return {
        icon: "alert",
        title: language === "en" ? "Token balance running low" : "Solde de jetons bas",
        detail: language === "en" ? `${item.data?.credits} token(s) left.` : `Il reste ${item.data?.credits} jeton(s).`
      };
    case "application_stale":
      return {
        icon: "briefcase",
        title: language === "en" ? "Application waiting" : "Candidature en attente",
        detail: [item.data?.title, item.data?.company].filter(Boolean).join(" · ") || (language === "en" ? "Still marked as 'to apply'." : "Toujours marquée « à postuler ».")
      };
    case "profile_incomplete":
      return {
        icon: "profile",
        title: language === "en" ? "Profile incomplete" : "Profil incomplet",
        detail: language === "en" ? "Complete your profile to unlock more relevant features." : "Complétez votre profil pour des fonctionnalités plus pertinentes."
      };
    case "school_announcement":
      return {
        icon: "mail",
        title: item.data?.subject || (language === "en" ? "Announcement from your school" : "Annonce de votre école"),
        detail: [item.data?.schoolName, item.data?.message].filter(Boolean).join(" · ")
      };
    default:
      return { icon: "bell", title: item.type, detail: "" };
  }
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
  const [legalPage, setLegalPage] = useState(null);

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

  const [notifications, setNotifications] = useState([]);
  const [notifOpen, setNotifOpen] = useState(false);
  // Notifications recalculées à la volée côté serveur (voir GET
  // /api/notifications) : "lu" n'existe nulle part en base, on le garde
  // simplement en local par compte pour retenir quels ids l'utilisateur a
  // déjà vus. Un item redevient "non lu" tout seul s'il change réellement
  // (nouvel id, ex: nouveau paiement).
  const [readNotificationIds, setReadNotificationIds] = useState(new Set());
  const notifRef = useRef(null);

  const unreadNotificationCount = notifications.filter((item) => !readNotificationIds.has(item.id)).length;

  const analysisUnlocked = Boolean(latestMatch);
  const user = session?.user;
  const [satisfactionEligible, setSatisfactionEligible] = useState(false);

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
    if (!user?.id) {
      setReadNotificationIds(new Set());
      return;
    }
    try {
      const stored = JSON.parse(localStorage.getItem(`career_app_read_notifications_${user.id}`) || "[]");
      setReadNotificationIds(new Set(Array.isArray(stored) ? stored : []));
    } catch (_error) {
      setReadNotificationIds(new Set());
    }
  }, [user?.id]);

  function markAllNotificationsRead() {
    if (!user?.id) return;
    const nextIds = new Set([...readNotificationIds, ...notifications.map((item) => item.id)]);
    setReadNotificationIds(nextIds);
    try {
      localStorage.setItem(`career_app_read_notifications_${user.id}`, JSON.stringify([...nextIds]));
    } catch (_error) {
      // Stockage indisponible (navigation privée...) : l'état reste correct
      // en mémoire pour cette session, juste pas persisté au rechargement.
    }
  }

  useEffect(() => {
    if (!user?.id) return undefined;
    let cancelled = false;
    function load() {
      getNotifications(user.id)
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
  }, [user?.id]);

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

  // Seuls targetRole et sector sont réellement demandés à l'utilisateur
  // (quiz de bienvenue juste après l'inscription) — location, skills et
  // experienceYears ne sont jamais sollicités nulle part, donc les compter
  // ici pénaliserait injustement quasi tout le monde pour des champs que
  // personne ne lui a proposé de remplir.
  const profileCompleteness = useMemo(() => {
    if (!user) return 0;
    const profile = user.profile || {};
    let score = 0;
    if (profile.targetRole) score += 50;
    if (profile.sector) score += 50;
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
      const currentToken = localStorage.getItem("career_app_token") || "";
      const sessionId = params.get("session_id");
      // Le webhook Stripe qui active normalement le plan est asynchrone (et
      // injoignable en local sans `stripe listen`) : on confirme aussi la
      // session directement auprès de Stripe en filet de sécurité, avant de
      // relire la session utilisateur pour refléter le nouveau plan.
      const confirmThenSync = async () => {
        if (sessionId && currentToken) {
          try {
            const snapshot = await getUserFromSession(currentToken);
            if (snapshot?.user?.id) {
              await confirmStripeCheckoutSession({ userId: snapshot.user.id, sessionId });
            }
          } catch (_error) {
            // Le webhook a pu déjà traiter l'événement entre-temps ; on
            // laisse simplement syncSession refléter l'état réel ensuite.
          }
        }
        if (currentToken) syncSession(currentToken);
      };
      setTimeout(confirmThenSync, 1200);
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

  async function handleGoogleLogin(credential, intent = "signup") {
    try {
      clearMessages();
      const result = await loginWithGoogle(credential, intent);
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

  async function handleForgotPassword({ identifier }) {
    try {
      clearMessages();
      return await requestPasswordReset({ identifier });
    } catch (error) {
      setAuthError(getFriendlyErrorMessage(error, language));
      throw error;
    }
  }

  async function handleResetPassword({ identifier, code, newPassword }) {
    try {
      clearMessages();
      const result = await resetPassword({ identifier, code, newPassword });
      setToken(result.token);
      setSessionLoading(true);
      await syncSession(result.token);
      setActivePage("home");
      rememberLastAuthMethod("password");
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
          ? "Account verified. Welcome to Career CV."
          : "Compte vérifié. Bienvenue sur Career CV."
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
            : "Le fichier semble vide ou non lisible. Importez un PDF texte ou un DOCX lisible."
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
      setPageMessage(language === "en" ? "CV saved. Add the target job." : "CV enregistré. Ajoutez maintenant le poste visé.");
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
        throw new Error(language === "en" ? "Paste at least 50 characters for the job description." : "Collez au moins 50 caractères pour la description du poste.");
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
      const trimmedCode = code.trim();
      let result = await redeemLicenseCode({ userId: user.id, code: trimmedCode });

      // Déjà rattaché à un AUTRE code de licence (transfert d'établissement,
      // renouvellement avec un nouveau code...) : le backend ne bascule pas
      // silencieusement, il demande confirmation d'abord (voir
      // routes/billing.js, requiresConfirmation).
      if (result.requiresConfirmation) {
        const confirmResult = await Swal.fire({
          icon: "warning",
          title: language === "en" ? "Replace your current access?" : "Remplacer votre accès actuel ?",
          html:
            language === "en"
              ? `You're already using license <b style="color:#b83309;font-family:monospace;">${result.currentLicenseCodeMasked}</b>. Activating this new code switches you to <b>${result.newPlanName}</b> and frees your seat on the previous license.`
              : `Vous utilisez déjà la licence <b style="color:#b83309;font-family:monospace;">${result.currentLicenseCodeMasked}</b>. Activer ce nouveau code vous bascule vers <b>${result.newPlanName}</b> et libère votre siège sur l'ancienne licence.`,
          showCancelButton: true,
          confirmButtonText: language === "en" ? "Switch" : "Basculer",
          cancelButtonText: language === "en" ? "Cancel" : "Annuler",
          confirmButtonColor: "#b83309"
        });
        if (!confirmResult.isConfirmed) return;
        result = await redeemLicenseCode({ userId: user.id, code: trimmedCode, confirmSwitch: true });
      }

      setSession({ user: result.user, premium: result.premium });
      setPremium(result.premium);
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

  async function handleExportAccountData() {
    if (!user) return;
    try {
      clearMessages();
      const result = await exportAccountData(user.id);
      const blob = new Blob([JSON.stringify(result, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `career-cv-donnees-${user.id}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      setProcessingError(getFriendlyErrorMessage(error, language));
    }
  }

  // Résumé humainement lisible du même export RGPD (le JSON complet reste
  // le format de référence, celui-ci est juste une vue de confort) — même
  // principe que l'export PDF de la Lettre IA : impression navigateur, pas
  // de librairie PDF supplémentaire.
  async function handleExportSummary() {
    if (!user) return;
    try {
      clearMessages();
      const result = await exportAccountData(user.id);
      const d = result.data;
      const isEn = language === "en";
      const esc = (value) => String(value ?? "").replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
      const planName = getPlanById(d.profile.subscription_json ? JSON.parse(d.profile.subscription_json).planId : "")?.name?.[language];

      const paymentRows = (d.transactions || [])
        .map(
          (t) =>
            `<tr><td>${esc(formatDateTime(t.created_at))}</td><td>${esc(getPlanById(t.plan_id)?.name?.[language] || t.plan_id)}</td><td>${esc(formatAmountInCurrency(Number(t.amount_collected), t.currency))}</td><td>${esc(t.source)}</td></tr>`
        )
        .join("");

      const securityRows = (d.account_security_events || [])
        .slice(0, 15)
        .map((e) => `<tr><td>${esc(formatDateTime(e.created_at))}</td><td>${esc(e.event_type)}</td></tr>`)
        .join("");

      const html = `<!doctype html>
<html lang="${language}">
<head>
<meta charset="utf-8" />
<title>${isEn ? "My Career CV data" : "Mes données Career CV"}</title>
<style>
  body { font-family: Arial, Helvetica, sans-serif; color: #101828; padding: 2rem; max-width: 720px; margin: 0 auto; }
  h1 { font-size: 1.4rem; margin-bottom: 0.2rem; }
  h2 { font-size: 1.05rem; margin-top: 2rem; border-bottom: 1px solid #e5e7eb; padding-bottom: 0.3rem; }
  table { width: 100%; border-collapse: collapse; margin-top: 0.6rem; font-size: 0.85rem; }
  th, td { text-align: left; padding: 0.4rem 0.5rem; border-bottom: 1px solid #eee; }
  .muted { color: #667085; font-size: 0.85rem; }
  .row { display: flex; justify-content: space-between; padding: 0.3rem 0; border-bottom: 1px solid #f2f2f2; }
</style>
</head>
<body>
  <h1>${isEn ? "My Career CV data" : "Mes données Career CV"}</h1>
  <p class="muted">${isEn ? "Exported on" : "Exporté le"} ${esc(formatDateTime(result.exportedAt))}</p>

  <h2>${isEn ? "Profile" : "Profil"}</h2>
  <div class="row"><span>${isEn ? "Name" : "Nom"}</span><strong>${esc(d.profile.first_name)} ${esc(d.profile.last_name)}</strong></div>
  <div class="row"><span>Email</span><strong>${esc(d.profile.email)}</strong></div>
  <div class="row"><span>${isEn ? "Username" : "Nom d'utilisateur"}</span><strong>${esc(d.profile.username)}</strong></div>
  <div class="row"><span>${isEn ? "Account created" : "Compte créé le"}</span><strong>${esc(formatDateTime(d.profile.created_at))}</strong></div>
  <div class="row"><span>${isEn ? "Plan" : "Plan"}</span><strong>${esc(planName || "—")}</strong></div>

  <h2>${isEn ? "Payment history" : "Historique de paiement"}</h2>
  ${
    paymentRows
      ? `<table><thead><tr><th>${isEn ? "Date" : "Date"}</th><th>${isEn ? "Plan" : "Plan"}</th><th>${isEn ? "Amount" : "Montant"}</th><th>${isEn ? "Source" : "Moyen"}</th></tr></thead><tbody>${paymentRows}</tbody></table>`
      : `<p class="muted">${isEn ? "No payment recorded." : "Aucun paiement enregistré."}</p>`
  }

  <h2>${isEn ? "Recent account security events" : "Événements de sécurité récents"}</h2>
  ${
    securityRows
      ? `<table><thead><tr><th>${isEn ? "Date" : "Date"}</th><th>${isEn ? "Event" : "Événement"}</th></tr></thead><tbody>${securityRows}</tbody></table>`
      : `<p class="muted">${isEn ? "No event recorded." : "Aucun événement enregistré."}</p>`
  }

  <h2>${isEn ? "Content" : "Contenu"}</h2>
  <div class="row"><span>${isEn ? "Saved CVs" : "CV enregistrés"}</span><strong>${(d.cvs || []).length}</strong></div>
  <div class="row"><span>${isEn ? "Cover letters" : "Lettres de motivation"}</span><strong>${(d.cover_letters || []).length}</strong></div>
  <div class="row"><span>${isEn ? "Negotiation sessions" : "Sessions de négociation"}</span><strong>${(d.negotiation_conversations || []).length}</strong></div>
  <div class="row"><span>${isEn ? "Interview sessions" : "Sessions d'entretien"}</span><strong>${(d.interview_conversations || []).length}</strong></div>
  <div class="row"><span>${isEn ? "Job applications tracked" : "Candidatures suivies"}</span><strong>${(d.job_applications || []).length}</strong></div>

  <p class="muted" style="margin-top:2rem;">
    ${isEn
      ? "This is a summary for readability. The complete machine-readable export (JSON) remains the reference document."
      : "Ceci est un résumé pour la lisibilité. L'export complet exploitable (JSON) reste le document de référence."}
  </p>
</body>
</html>`;

      const printWindow = window.open("", "_blank");
      if (!printWindow) return;
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => printWindow.print(), 300);
    } catch (error) {
      setProcessingError(getFriendlyErrorMessage(error, language));
    }
  }

  async function handleRevokeSession(sessionId) {
    if (!user) return;
    try {
      clearMessages();
      await revokeSession({ userId: user.id, sessionId });
      const updated = await getUserFromSession(token);
      if (updated) setSession(updated);
      setPageMessage(language === "en" ? "Device disconnected." : "Appareil déconnecté.");
    } catch (error) {
      setProcessingError(getFriendlyErrorMessage(error, language));
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
          <img src="/favicon.png" alt="" className="app-boot-icon" />
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
        onForgotPassword={handleForgotPassword}
        onResetPassword={handleResetPassword}
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

  if (legalPage) {
    // Pas de onLoginClick/onSignupClick ici : l'utilisateur est déjà connecté,
    // ces boutons n'ont pas de sens (InfoPage/LegalDocPage les masquent
    // automatiquement quand ces props sont absentes).
    const sharedLegalProps = {
      language,
      setLanguage,
      onBack: () => setLegalPage(null),
      onNavigateLegal: (page) => setLegalPage(page),
      landingCopy
    };

    if (legalPage === "privacy") return <PrivacyPolicyPage {...sharedLegalProps} />;
    if (legalPage === "cookies") return <PrivacyPolicyPage {...sharedLegalProps} focusCookies />;
    if (legalPage === "security") return <PrivacyPolicyPage {...sharedLegalProps} focusSecurity />;
    if (legalPage === "terms") return <TermsOfServicePage {...sharedLegalProps} />;
    if (legalPage === "about") return <AboutPage {...sharedLegalProps} />;
    if (legalPage === "contact") return <ContactPage {...sharedLegalProps} />;
    if (legalPage === "pricing") return <PublicPricingPage {...sharedLegalProps} currency={currency} />;
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
        onRevokeSession={handleRevokeSession}
        currentSessionId={session?.currentSessionId}
        onExportData={handleExportAccountData}
        onExportSummary={handleExportSummary}
        onDeleteAccount={handleDeleteAccount}
        onNavigateLegal={setLegalPage}
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
        onRevokeSession={handleRevokeSession}
        currentSessionId={session?.currentSessionId}
        onExportData={handleExportAccountData}
        onExportSummary={handleExportSummary}
        onDeleteAccount={handleDeleteAccount}
        onNavigateLegal={setLegalPage}
      />
    );
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <button type="button" className="brand brand-link" onClick={() => goTo("home")}>
          <img src="/logo-career-cv.png" alt="Career CV" className="brand-logo" />
        </button>

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
          <div className="topbar-notif" ref={notifRef}>
            <button
              type="button"
              className="topbar-icon-btn"
              title={language === "en" ? "Notifications" : "Notifications"}
              onClick={() => setNotifOpen((prev) => !prev)}
            >
              <UiIcon name="bell" />
              {unreadNotificationCount ? (
                <span className="topbar-notif-badge">{unreadNotificationCount > 9 ? "9+" : unreadNotificationCount}</span>
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
                {unreadNotificationCount ? (
                  <button type="button" className="topbar-notif-mark-read" onClick={markAllNotificationsRead}>
                    {language === "en" ? "Mark all as read" : "Marquer tout comme lu"}
                  </button>
                ) : null}
                {notifications.length ? (
                  <div className="topbar-notif-list">
                    {notifications.map((item) => {
                      const text = candidateNotificationText(item, language);
                      const isUnread = !readNotificationIds.has(item.id);
                      return (
                        <div key={item.id} className={`topbar-notif-row ${isUnread ? "unread" : ""}`}>
                          <span className="topbar-notif-icon">
                            <UiIcon name={text.icon} />
                          </span>
                          <div>
                            <strong>{text.title}</strong>
                            <span className="muted" title={text.detail}>{text.detail}</span>
                            {item.createdAt ? <span className="topbar-notif-time">{formatDateTime(item.createdAt)}</span> : null}
                          </div>
                          {isUnread ? <span className="topbar-notif-dot" aria-hidden="true" /> : null}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="muted topbar-notif-empty">
                    {language === "en"
                      ? "Payments, low token balance, account security and stale applications will show up here."
                      : "Paiements, solde de jetons bas, sécurité du compte et candidatures en attente apparaîtront ici."}
                  </p>
                )}
              </div>
            ) : null}
          </div>
          <LanguageSwitch language={language} setLanguage={setLanguage} variant="dropdown" />
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
              <div className="user-dropdown-secured">Secured by <strong>Career CV</strong></div>
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
          <InterviewPage language={language} subscription={user?.subscription} onGoToTarifs={() => goTo("tarifs")} userId={user?.id} />
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
            onContactSales={() => setLegalPage("contact")}
          />
        ) : null}
      </main>

      <ConnectedFooter
        copy={landingCopy}
        onBrandClick={() => goTo("home")}
        onHomeClick={() => goTo("home")}
        onImportClick={() => goTo("import")}
        onInterviewsClick={() => goTo("entretiens")}
        onLetterClick={() => goTo("lettre")}
        onNegotiationClick={() => goTo("negociation")}
        onEmailScoutClick={() => goTo("email-finder")}
        onApplicationsClick={() => goTo("candidatures")}
        onPricingClick={() => goTo("tarifs")}
        onAboutClick={() => setLegalPage("about")}
        onContactClick={() => setLegalPage("contact")}
        onPrivacyClick={() => setLegalPage("privacy")}
        onTermsClick={() => setLegalPage("terms")}
        onCookiesClick={() => setLegalPage("cookies")}
        onSecurityClick={() => setLegalPage("security")}
      />

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
          onSaveProfile={handleProfileSave}
          roleOptions={(APP_COPY[language]?.roleQuiz || APP_COPY.fr.roleQuiz).roles}
          sectorOptions={(APP_COPY[language]?.roleQuiz || APP_COPY.fr.roleQuiz).sectors}
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
          onRevokeSession={handleRevokeSession}
          currentSessionId={session?.currentSessionId}
          onExportData={handleExportAccountData}
        onExportSummary={handleExportSummary}
          onDeleteAccount={handleDeleteAccount}
        />
      ) : null}
    </div>
  );
}

export const ADMIN_ACCOUNT_TYPES = [
  { id: "student", segment: "candidate", label: { fr: "Étudiant / Candidat", en: "Student / Candidate" } },
  { id: "school", segment: "school", label: { fr: "École", en: "School" } },
  { id: "recruiter_firm", segment: "agency", label: { fr: "Cabinet de recrutement", en: "Recruitment agency" } },
  { id: "admin", segment: null, label: { fr: "Administrateur", en: "Administrator" } }
];


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


export function GoogleLogo() {
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


export function ConnectedFooter({
  copy,
  onPrivacyClick,
  onTermsClick,
  onCookiesClick,
  onAboutClick,
  onContactClick,
  onPricingClick,
  onSecurityClick,
  onBrandClick,
  onHomeClick,
  onImportClick,
  onInterviewsClick,
  onLetterClick,
  onNegotiationClick,
  onEmailScoutClick,
  onApplicationsClick
}) {
  const hasCompanyNav = Boolean(onAboutClick || onContactClick);

  // Ordre synchronisé avec linksProduct dans LANDING_COPY : Fonctionnalités,
  // Matching CV, Entretiens, Lettre IA, Négociation, Email Scout, Offres,
  // Tarifs, FAQ. Tableau explicite plutôt que des `if (index === N)`
  // égrenés — plus facile à vérifier d'un coup d'œil et moins sujet à
  // erreur quand on ajoute/retire un lien (un vrai bug de ce type existait
  // ici : "FAQ" renvoyait par erreur vers "À propos").
  const productHandlers = [
    onHomeClick || onBrandClick,
    onImportClick || onHomeClick,
    onInterviewsClick || onHomeClick,
    onLetterClick || onHomeClick,
    onNegotiationClick || onHomeClick,
    onEmailScoutClick || onHomeClick,
    onApplicationsClick || onHomeClick,
    onPricingClick,
    // Pas de page FAQ dédiée une fois connecté : Contact reste la
    // destination la plus utile pour "j'ai une question" (à défaut, À propos).
    onContactClick || onAboutClick
  ];

  return (
    <footer className="connected-footer">
      <div>
        {onBrandClick ? (
          <button type="button" className="landing-brand footer-brand brand-link" onClick={onBrandClick}>
            <img src="/logo-career-cv.png" alt="Career CV" className="brand-logo" />
          </button>
        ) : (
          <div className="landing-brand footer-brand">
            <img src="/logo-career-cv.png" alt="Career CV" className="brand-logo" />
          </div>
        )}
        <p>{copy.footerText}</p>
      </div>
      <FooterColumn
        title={copy.footerProduct}
        links={copy.linksProduct}
        onLinkClick={(_link, index) => productHandlers[index]?.()}
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

export function GoogleSignInButton({ language, onCredential, showLastUsed = false }) {
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



function AuthScreen({
  onLogin,
  onRequestLoginCode,
  onSignup,
  onVerifySignupCode,
  onResendSignupCode,
  onForgotPassword,
  onResetPassword,
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

  // mode === "forgot" : réinitialisation de mot de passe, en 2 étapes
  // (identifiant -> code reçu par email + nouveau mot de passe). Séparé du
  // reste de la state machine login/signup pour ne pas complexifier leur
  // logique déjà dense.
  const [forgotStep, setForgotStep] = useState("identifier");
  const [forgotIdentifier, setForgotIdentifier] = useState("");
  const [forgotCode, setForgotCode] = useState(["", "", "", "", "", ""]);
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [forgotResendSeconds, setForgotResendSeconds] = useState(0);

  // Le champ accepte email OU nom d'utilisateur : si ça ressemble à une
  // tentative d'email (contient un "@"), on exige un format valide ; sinon
  // on ne demande qu'un identifiant non vide (nom d'utilisateur).
  const EMAIL_FORMAT_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const forgotIdentifierTrimmed = forgotIdentifier.trim();
  const isForgotIdentifierValid = forgotIdentifierTrimmed.includes("@")
    ? EMAIL_FORMAT_REGEX.test(forgotIdentifierTrimmed)
    : forgotIdentifierTrimmed.length > 0;

  function startForgotPassword() {
    onClearError();
    setForgotIdentifier(loginForm.identifier || "");
    setForgotStep("identifier");
    setForgotCode(["", "", "", "", "", ""]);
    setNewPassword("");
    setConfirmNewPassword("");
    setMode("forgot");
  }

  function updateForgotCodeDigit(index, rawValue) {
    const value = rawValue.replace(/\D/g, "").slice(-1);
    setForgotCode((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
    if (value && index < 5) {
      document.querySelector(`[data-forgot-code-index="${index + 1}"]`)?.focus();
    }
  }

  useEffect(() => {
    if (forgotResendSeconds <= 0) return undefined;
    const timer = setTimeout(() => setForgotResendSeconds((value) => Math.max(0, value - 1)), 1000);
    return () => clearTimeout(timer);
  }, [forgotResendSeconds]);

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
      // Depuis l'écran de connexion, on ne veut jamais créer de compte
      // silencieusement : intent "login" fait échouer proprement si aucun
      // compte Google n'existe (voir onGoogleLogin / NO_ACCOUNT_GOOGLE),
      // plutôt que d'inscrire l'utilisateur sans qu'il l'ait demandé.
      await onGoogleLogin(credential, mode === "signup" ? "signup" : "login");
    } catch (error) {
      if (error.code === "NO_ACCOUNT_GOOGLE") {
        // L'erreur générique est déjà affichée par onGoogleLogin ; on
        // bascule en plus directement vers l'inscription pour lui éviter un
        // clic de plus, le compte Google servira à pré-remplir le formulaire.
        setMode("signup");
      }
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
    if (mode === "forgot") {
      if (forgotStep === "identifier") {
        if (!isForgotIdentifierValid) return;
        setIsSubmitting(true);
        try {
          const result = await onForgotPassword({ identifier: forgotIdentifier });
          setForgotResendSeconds(result.resendAfterSeconds || 30);
          setForgotCode(["", "", "", "", "", ""]);
          setForgotStep("code");
        } catch (_error) {
          // Error already surfaced via the inline auth error state.
        } finally {
          setIsSubmitting(false);
        }
        return;
      }
      if (forgotStep === "code") {
        // Le code n'est vérifié qu'à la toute fin (avec le nouveau mot de
        // passe, en un seul appel atomique côté backend) : on avance juste
        // à l'étape suivante ici, sans appel réseau.
        const code = forgotCode.join("");
        if (code.length !== 6) return;
        setForgotStep("newPassword");
        return;
      }
      // forgotStep === "newPassword"
      const code = forgotCode.join("");
      if (newPassword.length < 8) {
        alert(language === "en" ? "The password must contain at least 8 characters." : "Le mot de passe doit contenir au moins 8 caractères.");
        return;
      }
      if (newPassword !== confirmNewPassword) {
        alert(language === "en" ? "Passwords do not match." : "Les mots de passe ne correspondent pas.");
        return;
      }
      setIsSubmitting(true);
      try {
        await onResetPassword({ identifier: forgotIdentifier, code, newPassword });
      } catch (_error) {
        // Error already surfaced via the inline auth error state.
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

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

  async function resendForgotCode() {
    if (forgotResendSeconds > 0 || !forgotIdentifier.trim()) return;
    try {
      const result = await onForgotPassword({ identifier: forgotIdentifier });
      setForgotResendSeconds(result.resendAfterSeconds || 30);
      setForgotCode(["", "", "", "", "", ""]);
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
                {mode === "forgot"
                  ? forgotStep === "identifier"
                    ? language === "en"
                      ? "Reset your password"
                      : "Réinitialiser le mot de passe"
                    : forgotStep === "code"
                      ? language === "en"
                        ? "Check your inbox"
                        : "Vérifiez votre messagerie"
                      : language === "en"
                        ? "Choose a new password"
                        : "Choisissez un nouveau mot de passe"
                  : mode === "signup"
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
                {mode === "forgot"
                  ? forgotStep === "identifier"
                    ? language === "en"
                      ? "Enter your email or username, we'll send you a reset code."
                      : "Indiquez votre e-mail ou nom d'utilisateur, on vous envoie un code de réinitialisation."
                    : forgotStep === "code"
                      ? language === "en"
                        ? "Enter the 6-digit code we sent you"
                        : "Saisissez le code à 6 chiffres reçu par email"
                      : language === "en"
                        ? "Almost done, pick a new password"
                        : "Encore une étape : choisissez votre nouveau mot de passe"
                  : mode === "signup" && signupPhase === "code"
                  ? language === "en"
                    ? "Welcome to Career CV"
                    : "Bienvenue sur Career CV"
                  : language === "en"
                    ? "to continue to Career CV"
                    : "pour continuer vers Career CV"}
                {(mode === "forgot" && forgotStep !== "identifier") ? (
                  <>
                    <br />
                    <strong>{forgotIdentifier}</strong>
                    <button type="button" onClick={() => setForgotStep("identifier")} aria-label="Modifier l'adresse">
                      ?
                    </button>
                  </>
                ) : (loginStep === "code" && mode === "login") || (signupPhase === "code" && mode === "signup") ? (
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
        {mode === "forgot" ? (
          <>
            {forgotStep === "identifier" ? (
              <label>
                {language === "en" ? "Email or username" : "Adresse e-mail ou nom d'utilisateur"}
                <input
                  value={forgotIdentifier}
                  onChange={(event) => setForgotIdentifier(event.target.value)}
                  placeholder={language === "en" ? "Username or email address" : "Nom d'utilisateur ou adresse e-mail"}
                  autoFocus
                  required
                />
              </label>
            ) : forgotStep === "code" ? (
              <div className="code-verification-block">
                <div className="code-input-row" aria-label="Code de vérification">
                  {forgotCode.map((digit, index) => (
                    <input
                      key={index}
                      data-forgot-code-index={index}
                      value={digit}
                      onChange={(event) => updateForgotCodeDigit(index, event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Backspace" && !forgotCode[index] && index > 0) {
                          document.querySelector(`[data-forgot-code-index="${index - 1}"]`)?.focus();
                        }
                      }}
                      inputMode="numeric"
                      maxLength={1}
                      autoFocus={index === 0}
                    />
                  ))}
                </div>
                <button className="resend-code-btn" type="button" onClick={resendForgotCode} disabled={forgotResendSeconds > 0}>
                  {forgotResendSeconds > 0
                    ? language === "en"
                      ? `Resend code (${forgotResendSeconds})`
                      : `Renvoyer le code (${forgotResendSeconds})`
                    : language === "en"
                      ? "Resend code"
                      : "Renvoyer le code"}
                </button>
              </div>
            ) : (
              <>
                <div className="auth-identity-chip">
                  <span>{language === "en" ? "Code verified" : "Code saisi"}</span>
                  <button type="button" onClick={() => setForgotStep("code")}>
                    {language === "en" ? "Change" : "Modifier"}
                  </button>
                </div>
                <label>
                  {language === "en" ? "New password" : "Nouveau mot de passe"}
                  <div className="password-field">
                    <input
                      type={showNewPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(event) => setNewPassword(event.target.value)}
                      minLength={8}
                      autoFocus
                      required
                    />
                    <button type="button" className="password-toggle" onClick={() => setShowNewPassword((prev) => !prev)} aria-label="Afficher/masquer le mot de passe">
                      <UiIcon name="eye" />
                    </button>
                  </div>
                </label>
                <label>
                  {language === "en" ? "Confirm new password" : "Confirmer le nouveau mot de passe"}
                  <input
                    type={showNewPassword ? "text" : "password"}
                    value={confirmNewPassword}
                    onChange={(event) => setConfirmNewPassword(event.target.value)}
                    minLength={8}
                    required
                  />
                </label>
              </>
            )}
          </>
        ) : mode === "login" ? (
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
          <button
            className="btn-main"
            type="submit"
            disabled={
              isSubmitting ||
              (mode === "forgot" && forgotStep === "identifier" && !isForgotIdentifierValid) ||
              (mode === "forgot" && forgotStep === "code" && forgotCode.join("").length !== 6)
            }
          >
            {isSubmitting ? <span className="btn-spinner" /> : null}{" "}
            {mode === "forgot"
              ? forgotStep === "identifier"
                ? language === "en"
                  ? "Send reset code"
                  : "Envoyer le code"
                : forgotStep === "code"
                  ? copy.continue
                  : language === "en"
                    ? "Reset password"
                    : "Réinitialiser le mot de passe"
              : mode === "login"
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
                {mode === "forgot" ? (
                  <button type="button" onClick={() => { setMode("login"); onClearError(); }}>
                    {language === "en" ? "Back to login" : "Retour à la connexion"}
                  </button>
                ) : mode === "login" ? (
                  <>
                    {language === "en" ? "No account yet?" : "Vous n'avez pas encore de compte ?"}{" "}
                    <button type="button" onClick={() => switchMode("signup")}>
                      {copy.signup}
                    </button>
                    <br />
                    <button type="button" className="forgot-password-link" onClick={startForgotPassword}>
                      {language === "en" ? "Forgot password?" : "Mot de passe oublié ?"}
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
                {language === "en" ? "Secured by" : "Sécurisé par"} <strong>Career CV</strong>
              </small>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}













