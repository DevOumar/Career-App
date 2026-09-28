import React, { Suspense, lazy, useEffect, useMemo, useRef, useState } from "react";
import { CodeEntry } from "./components/CodeEntry.jsx";
import Swal from "sweetalert2";
import { promptPasswordChange } from "./lib/passwordNotice.js";
import "sweetalert2/dist/sweetalert2.min.css";
import { UiIcon } from "./components/UiIcon.jsx";
import { AvatarCircle, getAvatarSource } from "./components/AvatarCircle.jsx";
import { LanguageSwitch } from "./components/LanguageSwitch.jsx";
import MfaLoginStep from "./features/account/mfa/MfaLoginStep.jsx";
import { askLogoutConfirmation } from "./features/account/LogoutConfirmHost.jsx";
const AdminApp = lazy(() => import("./features/admin/AdminApp.jsx").then((module) => ({ default: module.AdminApp })));
const SchoolApp = lazy(() => import("./features/school/SchoolApp.jsx"));
const CabinetApp = lazy(() => import("./features/cabinet/CabinetApp.jsx"));
const SalaryNegotiationPage = lazy(() => import("./features/negotiation/SalaryNegotiationPage.jsx"));
const ApplicationsPage = lazy(() => import("./features/applications/ApplicationsPage.jsx"));
const ImportPage = lazy(() => import("./features/cv/CvPages.jsx").then((module) => ({ default: module.ImportPage })));
const AnalysisPage = lazy(() => import("./features/cv/CvPages.jsx").then((module) => ({ default: module.AnalysisPage })));
const OffersPage = lazy(() => import("./features/cv/CvPages.jsx").then((module) => ({ default: module.OffersPage })));
const CvHistoryPage = lazy(() => import("./features/cv/CvPages.jsx").then((module) => ({ default: module.CvHistoryPage })));
import { APPLICATIONS_COPY } from "./features/applications/applicationsCopy.js";
import { SatisfactionSurveyModal, satisfactionTierFor } from "./features/satisfaction/SatisfactionSurveyModal.jsx";
import AccountDrawer from "./features/account/AccountDrawer.jsx";
import { LandingPage, PRODUCT_SECTION_IDS, InfoPage, AboutPage, ContactPage } from "./features/landing/LandingPage.jsx";
import { LegalDocPage, PrivacyPolicyPage, TermsOfServicePage } from "./features/legal/LegalPages.jsx";
const PublicPricingPage = lazy(() => import("./features/pricing/PricingPage.jsx").then((module) => ({ default: module.PublicPricingPage })));
const PricingPage = lazy(() => import("./features/pricing/PricingPage.jsx").then((module) => ({ default: module.PricingPage })));
import HomePage from "./features/home/HomePage.jsx";
const CoverLetterPage = lazy(() => import("./features/coverLetter/CoverLetterPage.jsx"));
const EmailFinderPage = lazy(() => import("./features/emailScout/EmailFinderPage.jsx"));
const InterviewHub = lazy(() => import("./features/interviews/InterviewHub.jsx"));
import {
  CURRENCY_OPTIONS,
  getCurrencyOption,
  applyFxRates,
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
  addCvRecord,
  analyzeMatch,
  changeUserPassword,
  getFxRates,
  createStripeCheckoutSession,
  confirmStripeCheckoutSession,
  requestPasswordReset,
  resetPassword,
  getNotifications,
  revokeSession,
  revokeOtherSessions,
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
  listMatchRuns,
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
  verifyMfaLogin,
  verifySecondaryEmail
} from "./lib/inMemoryDb";
import { createCvRecord, fileToBase64, parseCvText, readFileAsText } from "./lib/cvService";
import { alignMatchScores, extractOfferSummary, runMatching } from "./lib/matchingService";
import { PLANS, PLAN_SEGMENTS, getPlanById } from "./data/plans";

function notifRelativeLabel(value, language) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const en = language === "en";
  const time = date.toLocaleTimeString(en ? "en-GB" : "fr-FR", { hour: "2-digit", minute: "2-digit" });
  const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diffDays = Math.round((startOfDay(new Date()) - startOfDay(date)) / 86400000);
  if (diffDays <= 0) return `${en ? "Today" : "Aujourd'hui"} ${time}`;
  if (diffDays === 1) return `${en ? "Yesterday" : "Hier"} ${time}`;
  if (diffDays < 7) return `${en ? `${diffDays} days ago` : `Il y a ${diffDays} jours`} · ${time}`;
  return date.toLocaleDateString(en ? "en-GB" : "fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}

function LazyAppFallback() {
  return (
    <div className="app-boot" aria-busy="true">
      <img src="/favicon.png" alt="" className="app-boot-icon" />
      <p>Chargement...</p>
    </div>
  );
}

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
  "analyse",
  "offres",
  "candidatures",
  "entretiens",
  "coding",
  "lettre",
  "negociation",
  "email-finder",
  "historique",
  "notifications",
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
  const hashPath = (window.location.hash || "").split("?")[0];
  const directMatch = hashPath.match(/^#\/app\/([a-z-]+)$/i);
  const legacyMatch = hashPath.match(/^#\/app\/[^/]+\/([a-z-]+)$/i);
  const match = directMatch || legacyMatch;
  const pageId = match?.[1];
  return pageId && VALID_APP_PAGE_IDS.has(pageId) ? pageId : "home";
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
        a: "On compare vos compétences, votre expérience et votre formation avec les exigences réelles extraites de l'offre que vous collez, puis on calcule un score et la liste des compétences manquantes, jamais un chiffre générique."
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
        a: "The Classic template uses a single column and standard section headers, designed to be read well by most ATS. The Sidebar template (photo, column layout) is more visual but some strict ATS parse it less reliably, we recommend the Classic template if you're applying through an ATS. The AI optimization module also flags job keywords still missing from your CV."
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
        a: "We compare your skills, experience, and education against the actual requirements extracted from the job posting you paste, then compute a score and the list of missing skills, never a generic number."
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
        title: language === "en" ? "No tokens left" : "Plus de jetons disponibles",
        detail: language === "en" ? "Choose a plan in Pricing to keep using the AI modules." : "Choisissez une offre dans Tarifs pour continuer à utiliser les modules IA."
      };
    case "balance_low":
      return {
        icon: "alert",
        title: language === "en" ? "Only a few tokens left" : "Plus que quelques jetons",
        detail:
          language === "en"
            ? `${item.data?.credits} token${Number(item.data?.credits) > 1 ? "s" : ""} left. Top up in Pricing to avoid being blocked.`
            : `Il vous reste ${item.data?.credits} jeton${Number(item.data?.credits) > 1 ? "s" : ""}. Rechargez depuis Tarifs pour ne pas être bloqué.`
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

// Où mène chaque notification candidat quand on clique dessus.
function candidateNotificationTarget(item) {
  switch (item.type) {
    case "password_changed":
    case "password_reset_completed":
    case "login_locked":
    case "connected_account_linked":
    case "connected_account_removed":
      return { panel: "security" };
    case "payment_confirmed":
    case "balance_empty":
    case "balance_low":
      return { page: "tarifs" };
    case "application_stale":
      return { page: "candidatures" };
    case "profile_incomplete":
      return { panel: "account" };
    default:
      return { page: "notifications" };
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


function CandidateNotificationsPage({ language, notifications, unreadCount, isUnread, renderItem, onMarkAllRead }) {
  const [filter, setFilter] = useState("all");
  const t = (fr, en) => (language === "en" ? en : fr);
  const shown = filter === "unread" ? notifications.filter(isUnread) : notifications;
  return (
    <section className="cn-notif-page">
      <header className="cn-notif-page-head">
        <div>
          <h2>Notifications</h2>
          <p>{t("Sécurité du compte, paiements, solde de jetons, candidatures et annonces de votre école.", "Account security, payments, token balance, applications and announcements from your school.")}</p>
        </div>
        {unreadCount ? (
          <button type="button" className="btn-secondary" onClick={onMarkAllRead}>
            <UiIcon name="check" />
            {t("Tout marquer comme lu", "Mark all as read")}
          </button>
        ) : null}
      </header>
      <div className="cn-notif-tabs" role="tablist">
        {["all", "unread"].map((value) => (
          <button key={value} type="button" role="tab" aria-selected={filter === value} className={filter === value ? "is-active" : ""} onClick={() => setFilter(value)}>
            {value === "all" ? t("Toutes", "All") : t("Non lues", "Unread")}
            {value === "unread" ? <span>({unreadCount})</span> : null}
          </button>
        ))}
      </div>
      {shown.length ? (
        <div className="cn-notif-page-list">{shown.map(renderItem)}</div>
      ) : (
        <div className="cn-notif-page-empty">
          <UiIcon name="bell" />
          <strong>{filter === "unread" ? t("Aucune notification non lue", "No unread notifications") : t("Aucune notification", "No notifications")}</strong>
          <span>{t("Les nouvelles activités apparaîtront ici.", "New activity will appear here.")}</span>
        </div>
      )}
    </section>
  );
}

export default function App() {
  const [token, setToken] = useState(() => localStorage.getItem("career_app_token") || "");
  const [sessionLoading, setSessionLoading] = useState(() => Boolean(localStorage.getItem("career_app_token")));
  const [language, setLanguage] = useState(() => localStorage.getItem("career_app_language") || "fr");
  const [currency, setCurrency] = useState(getCurrency);
  // Taux de change réels (BCE) pour l'affichage des prix dans la devise choisie.
  const [, setFxVersion] = useState(0);
  useEffect(() => {
    getFxRates()
      .then((data) => {
        if (applyFxRates(data)) setFxVersion((value) => value + 1);
      })
      .catch(() => {});
  }, []);
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
  const [authSkipOtp, setAuthSkipOtp] = useState(false);
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
  const [matchRuns, setMatchRuns] = useState([]);
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
  // Menu des modules sur mobile (bouton ☰), comme sur la landing page.
  const [navMenuOpen, setNavMenuOpen] = useState(false);
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

  // Mot de passe provisoire (compte créé par l'admin) : invitation à le changer.
  useEffect(() => {
    promptPasswordChange({
      user,
      language,
      onOpenSecurity: () => {
        setAccountPanel("security");
        setAccountDrawerOpen(true);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, user?.mustChangePassword]);
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

  function markNotificationsRead(ids) {
    if (!user?.id) return;
    const nextIds = new Set([...readNotificationIds, ...ids]);
    setReadNotificationIds(nextIds);
    try {
      localStorage.setItem(`career_app_read_notifications_${user.id}`, JSON.stringify([...nextIds]));
    } catch (_error) {
      // stockage indisponible : l'état lu reste valable pour cette session
    }
  }

  function openCandidateNotification(item) {
    markNotificationsRead([item.id]);
    setNotifOpen(false);
    const target = candidateNotificationTarget(item);
    if (target.panel) {
      setAccountPanel(target.panel);
      setAccountDrawerOpen(true);
    } else if (target.page) {
      goTo(target.page);
    }
  }

  function renderCandidateNotif(item, large = false) {
    const text = candidateNotificationText(item, language);
    const unread = !readNotificationIds.has(item.id);
    return (
      <button key={item.id} type="button" className={`cn-notif-event ${large ? "is-large" : ""} ${unread ? "is-unread" : ""}`} onClick={() => openCandidateNotification(item)}>
        <span className="cn-notif-icon">
          <UiIcon name={text.icon} />
        </span>
        <span className="cn-notif-body">
          <strong>{text.title}</strong>
          {text.detail ? <span>{text.detail}</span> : null}
          <small>{item.createdAt ? notifRelativeLabel(item.createdAt, language) : language === "en" ? "Needs attention" : "À traiter"}</small>
        </span>
        {unread ? <span className="cn-notif-dot" aria-label={language === "en" ? "Unread" : "Non lue"} /> : null}
      </button>
    );
  }

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
      .then((health) => {
        setStripeEnabled(Boolean(health.stripeEnabled));
        setAuthSkipOtp(Boolean(health.authSkipOtp));
      })
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
    const nextHash = `#/app/${activePage}`;
    if (window.location.hash !== nextHash) {
      window.history.replaceState(null, "", nextHash);
    }
  }, [user, activePage]);

  useEffect(() => {
    if (!navMenuOpen) return undefined;
    const onKey = (event) => {
      if (event.key === "Escape") setNavMenuOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [navMenuOpen]);

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
      setLatestMatch(alignMatchScores(matchRun));
      listMatchRuns(snapshot.user.id)
        .then(setMatchRuns)
        .catch(() => setMatchRuns([]));
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

  // Session obtenue (directement, ou après la double authentification).
  async function openSession(result, method) {
    setToken(result.token);
    setSessionLoading(true);
    await syncSession(result.token);
    setActivePage("home");
    rememberLastAuthMethod(method);
  }

  // Connexion par identifiant + mot de passe. Renvoie { mfaRequired, … }
  // quand un second facteur est exigé (AuthScreen affiche alors l'étape de
  // vérification) ; relance l'erreur pour que l'écran puisse réagir à son
  // code (EMAIL_NOT_VERIFIED, PASSWORD_NOT_SET).
  async function handleLogin(credentials) {
    try {
      clearMessages();
      const result = await loginUser(credentials);
      if (result.mfaRequired) return result;
      await openSession(result, "password");
      return result;
    } catch (error) {
      setAuthError(getFriendlyErrorMessage(error, language));
      throw error;
    }
  }

  async function handleGoogleLogin(credential, intent = "signup") {
    try {
      clearMessages();
      const result = await loginWithGoogle(credential, intent);
      if (result.mfaRequired) return result;
      await openSession(result, "google");
      return result;
    } catch (error) {
      setAuthError(getFriendlyErrorMessage(error, language));
      throw error;
    }
  }

  // Second facteur validé : le serveur échange le ticket contre la session.
  async function handleVerifyMfa(payload) {
    clearMessages();
    const result = await verifyMfaLogin(payload);
    await openSession(result, result.firstFactor === "google" ? "google" : "password");
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
      // Mot de passe changé, mais la double authentification reste exigée.
      if (result.mfaRequired) return result;
      await openSession(result, "password");
      return result;
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
      const result = await registerUser(payload);
      // Bascule temporaire côté serveur (AUTH_SKIP_SIGNUP_OTP) : l'inscription
      // renvoie directement un token au lieu d'un objet "verification" — on
      // connecte tout de suite, sans passer par l'écran de saisie du code.
      if (result.token) {
        setToken(result.token);
        setSessionLoading(true);
        await syncSession(result.token);
        setActivePage("home");
        rememberLastAuthMethod("password");
      }
      return result;
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

  async function handleCompleteRoleQuiz({ targetRole, sector, experienceYears, education } = {}) {
    if (!user) return;
    try {
      const patch = { onboardingQuizSeen: true };
      if (targetRole) patch.targetRole = targetRole;
      if (sector) patch.sector = sector;
      if (typeof experienceYears === "number") patch.experienceYears = experienceYears;
      if (education) patch.education = education;
      const updated = await updateUserProfile(user.id, patch);
      setSession({ user: updated.user, premium: updated.premium });
      setPremium(updated.premium);
    } catch (error) {
      setProcessingError(getFriendlyErrorMessage(error, language));
    }
  }

  // Déconnexion demandée depuis n'importe quel espace : confirmation d'abord
  // (fenêtre « Se déconnecter de Career CV ? », modèle Jurysia).
  async function requestLogout() {
    if (await askLogoutConfirmation({ user, language })) await handleLogout();
  }

  async function handleLogout() {
    if (token) {
      try {
        await logoutUser(token);
      } catch (_error) {
        // Ignore transport errors and clear local session anyway.
      }
    }
    try {
      // L'espace admin repart sur l'Accueil à la prochaine connexion.
      sessionStorage.removeItem("career_app_admin_tab");
      sessionStorage.removeItem("career_app_school_tab");
    } catch (_error) {
      // stockage indisponible
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

  // Après une mise en corbeille / restauration : recharge l'historique et,
  // si le CV actif n'est plus disponible, bascule sur le plus récent restant.
  async function refreshCvHistory() {
    if (!user) return;
    const items = await listUserCvs(user.id);
    setCvHistory(items);
    if (latestCv && !items.some((cv) => cv.id === latestCv.id)) {
      const nextCv = items[0] || null;
      setLatestCv(nextCv);
      setCvSourceText(nextCv?.sourceText || "");
      setCvFileName(nextCv?.fileName || "");
      setCvReview(nextCv?.parsed || null);
      if (!nextCv) setImportStep("upload");
    }
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
      const saved = await saveCvToDb({
        fileName: cvFileName || `cv-${new Date().toISOString().slice(0, 10)}.txt`,
        text: cvSourceText,
        parsed: nextReview
      });
      setImportStep("job");
      setPageMessage(
        saved?.restored
          ? language === "en"
            ? "This CV was in your trash: it has been restored. Add the target job."
            : "Ce CV était dans la corbeille : il a été restauré. Ajoutez maintenant le poste visé."
          : saved?.duplicate
          ? language === "en"
            ? "This CV was already in your history: it has been updated, not duplicated. Add the target job."
            : "Ce CV était déjà dans votre historique : il a été mis à jour, sans doublon. Ajoutez maintenant le poste visé."
          : language === "en"
          ? "CV saved. Add the target job."
          : "CV enregistré. Ajoutez maintenant le poste visé."
      );
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

  // Solde de jetons renvoyé par le serveur après une action IA (le débit
  // est fait côté serveur, jamais par le navigateur).
  function applyServerAccount(account) {
    if (!account?.user) return;
    setSession({ user: account.user, premium: account.premium });
    setPremium(account.premium);
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

      const alignedRun = alignMatchScores({ ...result, matchInsights: matchResponse.analysis });
      await saveMatchRun(user.id, { ...alignedRun, cvId: latestCv?.id || null, jobReview: offerForAi, offerText });
      setLatestMatch(alignedRun);
      listMatchRuns(user.id)
        .then(setMatchRuns)
        .catch(() => {});
      setMatchInsights(matchResponse.analysis);

      // Jeton débité par le serveur : on affiche le solde qu'il renvoie.
      applyServerAccount(matchResponse.account);

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
  <div class="row"><span>${isEn ? "Plan" : "Plan"}</span><strong>${esc(planName || "-")}</strong></div>

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

  async function handleRevokeOtherSessions() {
    if (!user) return;
    try {
      clearMessages();
      const result = await revokeOtherSessions(user.id);
      const updated = await getUserFromSession(token);
      if (updated) setSession(updated);
      setPageMessage(
        language === "en"
          ? `${result.revoked || 0} device(s) disconnected.`
          : `${result.revoked || 0} appareil(s) déconnecté(s).`
      );
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
    setNavMenuOpen(false);
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
        onVerifyMfa={handleVerifyMfa}
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
        authSkipOtp={authSkipOtp}
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
    if (legalPage === "pricing") {
      return (
        <Suspense fallback={<LazyAppFallback />}>
          <PublicPricingPage {...sharedLegalProps} currency={currency} />
        </Suspense>
      );
    }
  }

  if (user.roleType === "admin") {
    return (
      <Suspense fallback={<LazyAppFallback />}>
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
          onLogout={requestLogout}
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
          onRevokeOtherSessions={handleRevokeOtherSessions}
          currentSessionId={session?.currentSessionId}
          onExportData={handleExportAccountData}
          onExportSummary={handleExportSummary}
          onDeleteAccount={handleDeleteAccount}
          onNavigateLegal={setLegalPage}
        />
      </Suspense>
    );
  }

  if (user.roleType === "school") {
    return (
      <Suspense fallback={<LazyAppFallback />}>
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
          onLogout={requestLogout}
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
          onRevokeOtherSessions={handleRevokeOtherSessions}
          currentSessionId={session?.currentSessionId}
          onExportData={handleExportAccountData}
          onExportSummary={handleExportSummary}
          onDeleteAccount={handleDeleteAccount}
          onNavigateLegal={setLegalPage}
        />
      </Suspense>
    );
  }

  if (user.roleType === "recruiter_firm" || user.roleType === "recruiter_internal") {
    return (
      <Suspense fallback={<LazyAppFallback />}>
        <CabinetApp
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
          onLogout={requestLogout}
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
          onRevokeOtherSessions={handleRevokeOtherSessions}
          currentSessionId={session?.currentSessionId}
          onExportData={handleExportAccountData}
          onExportSummary={handleExportSummary}
          onDeleteAccount={handleDeleteAccount}
          onNavigateLegal={setLegalPage}
        />
      </Suspense>
    );
  }

  return (
    <div className="app-shell">
      <header className={`topbar ${navMenuOpen ? "is-nav-open" : ""}`}>
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
              className={`topbar-icon-btn ${unreadNotificationCount ? "has-unread" : ""}`}
              title="Notifications"
              aria-label={
                unreadNotificationCount
                  ? language === "en"
                    ? `Notifications, ${unreadNotificationCount} unread`
                    : `Notifications, ${unreadNotificationCount} non lue(s)`
                  : "Notifications"
              }
              onClick={() => setNotifOpen((prev) => !prev)}
            >
              <UiIcon name="bell" />
              {unreadNotificationCount ? (
                <span className="topbar-notif-badge is-new">{unreadNotificationCount > 9 ? "9+" : unreadNotificationCount}</span>
              ) : null}
            </button>
            {notifOpen ? (
              <div className="cn-notif-panel">
                <div className="cn-notif-head">
                  <strong>Notifications</strong>
                  {unreadNotificationCount ? (
                    <button type="button" onClick={markAllNotificationsRead}>
                      {language === "en" ? "Mark all as read" : "Tout marquer comme lu"}
                    </button>
                  ) : null}
                </div>
                <div className="cn-notif-events">
                  {notifications.length ? (
                    notifications.slice(0, 12).map((item) => renderCandidateNotif(item))
                  ) : (
                    <div className="cn-notif-none">
                      <UiIcon name="bell" />
                      <span>{language === "en" ? "No notifications." : "Aucune notification."}</span>
                    </div>
                  )}
                </div>
                <div className="cn-notif-foot">
                  <button
                    type="button"
                    onClick={() => {
                      setNotifOpen(false);
                      goTo("notifications");
                    }}
                  >
                    {language === "en" ? "View all notifications" : "Voir toutes les notifications"}
                  </button>
                </div>
              </div>
            ) : null}
          </div>
          <div className="topbar-lang-desktop">
            <LanguageSwitch language={language} setLanguage={setLanguage} variant="menu" />
          </div>
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
              <button onClick={requestLogout}>
                <span className="dropdown-icon danger">
                  <UiIcon name="logout" />
                </span>
                {appCopy.menu.logout}
              </button>
              <div className="user-dropdown-secured">Secured by <strong>Career CV</strong></div>
            </div>
          ) : null}
        </div>
        <button
          type="button"
          className="topbar-burger"
          aria-expanded={navMenuOpen}
          aria-controls="app-mobile-menu"
          aria-label={navMenuOpen ? (language === "en" ? "Close menu" : "Fermer le menu") : language === "en" ? "Open menu" : "Ouvrir le menu"}
          onClick={() => setNavMenuOpen((open) => !open)}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            {navMenuOpen ? (
              <path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            ) : (
              <path d="M4 7h16M4 12h16M4 17h16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            )}
          </svg>
        </button>

        <nav id="app-mobile-menu" className="topbar-mobile-menu" hidden={!navMenuOpen} aria-label={language === "en" ? "Modules" : "Modules"}>
          <div className="tmm-list">
            {NAV_ITEMS.map((item) => {
              const isLocked = !item.always && !analysisUnlocked;
              const isActive = activePage === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  className={`tmm-item ${isActive ? "is-active" : ""}`}
                  onClick={() => goTo(item.id)}
                  disabled={isLocked}
                  aria-current={isActive ? "page" : undefined}
                >
                  <span className="tmm-icon">
                    <UiIcon name={item.icon} />
                  </span>
                  <span className="tmm-label">{item.label[language] || item.label.fr}</span>
                  {isLocked ? (
                    <small className="tmm-hint">{language === "en" ? "After a first analysis" : "Après une 1re analyse"}</small>
                  ) : (
                    <span className="tmm-chevron" aria-hidden="true">
                      <UiIcon name="chevron" />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          <div className="tmm-footer">
            <span>{language === "en" ? "Language" : "Langue"}</span>
            <LanguageSwitch language={language} setLanguage={setLanguage} variant="menu" />
          </div>
        </nav>
      </header>
      {navMenuOpen ? <div className="topbar-mobile-backdrop" onClick={() => setNavMenuOpen(false)} aria-hidden="true" /> : null}

      <main className={`main-wrap ${activePage === "import" ? "main-wrap-wide" : ""}`}>
        {user?.subscription?.licenseExpired && !user?.subscription?.licenseSuspended ? (
          <div className="license-suspended-banner" role="status">
            <UiIcon name="alert" />
            <div>
              <strong>{language === "en" ? "Your school's license has expired" : "La licence de votre établissement a expiré"}</strong>
              <span>
                {language === "en"
                  ? "CV import and analysis, ATS optimisation, AI letter, negotiation, Email Scout, interviews and coding test are unavailable until it is renewed. Your CVs, history and applications remain available."
                  : "Import et analyse de CV, optimisation ATS, Lettre IA, négociation, Email Scout, entretiens et test technique sont indisponibles jusqu'à son renouvellement. Vos CV, votre historique et vos candidatures restent consultables."}
              </span>
            </div>
          </div>
        ) : null}
        {user?.subscription?.licenseSuspended ? (
          <div className="license-suspended-banner" role="status">
            <UiIcon name="alert" />
            <div>
              <strong>{language === "en" ? "Access suspended by your school" : "Accès suspendu par votre établissement"}</strong>
              <span>
                {language === "en"
                  ? "Your school has temporarily suspended the access it provides. Unavailable until reactivation: CV import and analysis, ATS optimisation, AI letter, salary negotiation, Email Scout, interviews and coding test. Your CVs already imported, your history and your applications remain available. Contact your school to reactivate it."
                  : "Votre école a suspendu temporairement l'accès qu'elle vous fournit. Indisponibles jusqu'à la réactivation : import et analyse de CV, optimisation ATS, Lettre IA, négociation salariale, Email Scout, entretiens et test technique. Vos CV déjà importés, votre historique et vos candidatures restent consultables. Contactez votre établissement pour le réactiver."}
              </span>
            </div>
          </div>
        ) : null}
        <Suspense fallback={<LazyAppFallback />}>
          {activePage === "home" ? (
            <HomePage
              onStart={() => goTo("import")}
              onSeeTarifs={() => goTo("tarifs")}
              onNavigate={goTo}
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
              onGoToModule={(page) => goTo(page)}
              onConsumeToken={applyServerAccount}
            />
          ) : null}

        {activePage === "analyse" ? <AnalysisPage matchData={latestMatch} language={language} /> : null}
        {activePage === "offres" ? <OffersPage matchData={latestMatch} premium={premium} language={language} /> : null}
        {activePage === "candidatures" ? <ApplicationsPage language={language} userId={user?.id} cvHistory={cvHistory} /> : null}
        {activePage === "entretiens" || activePage === "coding" ? (
          <InterviewHub
            language={language}
            initialTab={activePage === "coding" ? "technical" : "interview"}
            user={user}
            subscription={user?.subscription}
            onGoToTarifs={() => goTo("tarifs")}
            userId={user?.id}
            avatarDataUrl={user?.avatarDataUrl}
            analyzedOffer={jobReview}
            onSessionUpdate={(nextUser, nextPremium) => {
              setSession({ user: nextUser, premium: nextPremium });
              if (nextPremium) setPremium(nextPremium);
            }}
          />
        ) : null}
        {activePage === "lettre" ? (
          <CoverLetterPage
            language={language}
            userId={user?.id}
            candidate={user ? buildCandidatePayload() : null}
            offer={jobReview || extractOfferSummary(offerText)}
            tokensBalance={tokensBalance}
            onGoToTarifs={() => goTo("tarifs")}
            onGoToImport={() => goTo("import")}
            onConsumeToken={applyServerAccount}
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
            onGoToImport={() => goTo("import")}
            onConsumeToken={applyServerAccount}
          />
        ) : null}
        {activePage === "email-finder" ? (
          <EmailFinderPage
            language={language}
            userId={user.id}
            tokensBalance={tokensBalance}
            onGoToTarifs={() => goTo("tarifs")}
            onGoToImport={() => goTo("import")}
            onConsumeToken={applyServerAccount}
          />
        ) : null}
        {activePage === "historique" ? (
          <CvHistoryPage cvHistory={cvHistory} matchRuns={matchRuns} language={language} userId={user?.id} onCvsChanged={refreshCvHistory} />
        ) : null}
        {activePage === "notifications" ? (
          <CandidateNotificationsPage
            language={language}
            notifications={notifications}
            unreadCount={unreadNotificationCount}
            isUnread={(item) => !readNotificationIds.has(item.id)}
            renderItem={(item) => renderCandidateNotif(item, true)}
            onMarkAllRead={markAllNotificationsRead}
          />
        ) : null}
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
        </Suspense>
      </main>

      <ConnectedFooter
        copy={landingCopy}
        onBrandClick={() => goTo("home")}
        onHomeClick={() => goTo("home")}
        onImportClick={() => goTo("import")}
        onInterviewsClick={() => goTo("entretiens")}
        onCodingClick={() => goTo("coding")}
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
        onRevokeOtherSessions={handleRevokeOtherSessions}
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


// Questionnaire d'accueil (après l'inscription) : poste visé, secteur,
// expérience et niveau d'études. Tout est enregistré dans le profil et sert
// directement au score de compatibilité et à la personnalisation.
const ONBOARDING_ROLE_ICONS = ["code", "settings", "chart", "share", "network", "edit", "scale", "profile", "briefcase", "chat", "plus"];
const ONBOARDING_SECTOR_ICONS = ["code", "scale", "shield", "chat", "pricetag", "settings", "share", "globe", "plus"];

function OnboardingArt() {
  return (
    <svg viewBox="0 0 240 180" className="ob-art" aria-hidden="true">
      <defs>
        <linearGradient id="ob-card" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#fff4ec" />
        </linearGradient>
      </defs>
      <circle cx="120" cy="92" r="78" fill="#ffffff" fillOpacity="0.14" />
      <circle cx="120" cy="92" r="54" fill="#ffffff" fillOpacity="0.12" />
      <rect x="62" y="40" width="116" height="100" rx="16" fill="url(#ob-card)" />
      <circle cx="90" cy="70" r="14" fill="#f5d2bd" />
      <path d="M78 96c2-10 22-10 24 0" fill="#f26a2e" />
      <rect x="112" y="60" width="50" height="7" rx="3.5" fill="#b83309" />
      <rect x="112" y="73" width="36" height="5" rx="2.5" fill="#ecdfd4" />
      <rect x="78" y="108" width="84" height="5" rx="2.5" fill="#ecdfd4" />
      <rect x="78" y="118" width="60" height="5" rx="2.5" fill="#ecdfd4" />
      <circle cx="176" cy="132" r="17" fill="#237804" />
      <path d="M169 132l5 5 10-11" stroke="#fff" strokeWidth="3.2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M44 48l4 10 10 4-10 4-4 10-4-10-10-4 10-4z" fill="#ffffff" />
      <path d="M196 36l3 7 7 3-7 3-3 7-3-7-7-3 7-3z" fill="#ffe0cc" />
    </svg>
  );
}

function RoleQuizModal({ language, onComplete }) {
  const copy = APP_COPY[language]?.roleQuiz || APP_COPY.fr.roleQuiz;
  const en = language === "en";
  const t = (fr, enText) => (en ? enText : fr);
  const otherLabel = en ? "Other" : "Autre";
  const MIN_OTHER_LENGTH = 3;

  const EXPERIENCES = [
    { years: 0, label: t("Étudiant ou premier emploi", "Student or first job"), hint: t("Stage, alternance, jeune diplômé", "Internship, apprenticeship, graduate"), icon: "profile" },
    { years: 1, label: t("Moins de 2 ans", "Less than 2 years"), hint: t("Premières expériences", "First experiences"), icon: "history" },
    { years: 3, label: t("2 à 5 ans", "2 to 5 years"), hint: t("Profil confirmé", "Experienced"), icon: "chart" },
    { years: 7, label: t("5 à 10 ans", "5 to 10 years"), hint: t("Profil senior", "Senior"), icon: "briefcase" },
    { years: 12, label: t("Plus de 10 ans", "More than 10 years"), hint: t("Expert, management", "Expert, management"), icon: "shield" }
  ];
  const EDUCATIONS = [
    { value: "Bac", label: t("Bac", "High school diploma"), hint: t("Baccalauréat ou équivalent", "Baccalaureate or equivalent") },
    { value: "Bac+2", label: "Bac+2", hint: t("BTS, DUT", "Associate degree") },
    { value: "Bac+3", label: "Bac+3", hint: t("Licence, Bachelor, BUT", "Bachelor's degree") },
    { value: "Bac+5", label: "Bac+5", hint: t("Master, école d'ingénieur ou de commerce", "Master's, engineering or business school") },
    { value: "Doctorat", label: t("Doctorat", "PhD"), hint: t("Bac+8", "Doctorate") }
  ];
  const STEPS = [
    { key: "role", label: t("Poste visé", "Target role"), title: copy.step1Title, text: t("Pour cibler les offres et les conseils.", "To target jobs and advice.") },
    { key: "sector", label: t("Secteur", "Industry"), title: copy.step2Title, text: t("Pour adapter les analyses à votre marché.", "To tailor analyses to your market.") },
    { key: "experience", label: t("Expérience", "Experience"), title: t("Quelle est votre expérience ?", "How much experience do you have?"), text: t("Elle compte dans le score de compatibilité.", "It counts in the compatibility score.") },
    { key: "education", label: t("Formation", "Education"), title: t("Votre niveau d'études ?", "Your education level?"), text: t("Comparé au niveau demandé par les offres.", "Compared with the level required by jobs.") }
  ];

  const [step, setStep] = useState(0);
  const [role, setRole] = useState("");
  const [roleOther, setRoleOther] = useState("");
  const [sector, setSector] = useState("");
  const [sectorOther, setSectorOther] = useState("");
  const [experience, setExperience] = useState(null);
  const [education, setEducation] = useState("");

  const current = STEPS[step];
  const otherInvalid = (value, other) => value === otherLabel && other.trim().length < MIN_OTHER_LENGTH;
  const canContinue =
    (current.key === "role" && role && !otherInvalid(role, roleOther)) ||
    (current.key === "sector" && sector && !otherInvalid(sector, sectorOther)) ||
    (current.key === "experience" && experience !== null) ||
    (current.key === "education" && education);

  function finish(skipRemaining = false) {
    onComplete({
      targetRole: role === otherLabel ? roleOther.trim() : role,
      sector: sector === otherLabel ? sectorOther.trim() : sector,
      experienceYears: skipRemaining && experience === null ? undefined : experience ?? undefined,
      education: education || undefined
    });
  }

  function next() {
    if (!canContinue) return;
    if (step < STEPS.length - 1) setStep(step + 1);
    else finish();
  }

  function skip() {
    if (step < STEPS.length - 1) setStep(step + 1);
    else finish(true);
  }

  function optionGrid(items, selected, onSelect, icons) {
    return (
      <div className="ob-grid">
        {items.map((item, index) => {
          const value = typeof item === "string" ? item : item.value ?? item.years;
          const label = typeof item === "string" ? item : item.label;
          const active = selected === value;
          return (
            <button key={label} type="button" className={`ob-option ${active ? "is-active" : ""}`} onClick={() => onSelect(value)} aria-pressed={active}>
              <span className="ob-option-icon">
                <UiIcon name={(icons && icons[index]) || item.icon || "check"} />
              </span>
              <span className="ob-option-text">
                <strong>{label}</strong>
                {item.hint ? <small>{item.hint}</small> : null}
              </span>
              {active ? (
                <span className="ob-option-check" aria-hidden="true">
                  <UiIcon name="check" />
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    );
  }

  function otherInput(value, other, setOther, placeholder) {
    if (value !== otherLabel) return null;
    const tooShort = other.trim().length > 0 && other.trim().length < MIN_OTHER_LENGTH;
    return (
      <div className="ob-other">
        <input
          className={tooShort ? "invalid" : ""}
          value={other}
          maxLength={80}
          onChange={(event) => setOther(event.target.value)}
          placeholder={placeholder}
          autoFocus
        />
        {tooShort ? <small className="field-hint error">{t(`${MIN_OTHER_LENGTH} caractères minimum.`, `At least ${MIN_OTHER_LENGTH} characters.`)}</small> : null}
      </div>
    );
  }

  return (
    <div className="modal-overlay ob-overlay">
      <div className="ob-modal" role="dialog" aria-modal="true" aria-labelledby="ob-title">
        <aside className="ob-aside">
          <OnboardingArt />
          <h3>{t("Personnalisons votre espace", "Let's personalise your space")}</h3>
          <p>{t("Quatre questions rapides pour des analyses et des conseils adaptés à votre profil.", "Four quick questions for analyses and advice tailored to your profile.")}</p>
          <ol className="ob-steps">
            {STEPS.map((item, index) => (
              <li key={item.key} className={index < step ? "is-done" : index === step ? "is-current" : ""}>
                <span>{index < step ? <UiIcon name="check" /> : index + 1}</span>
                {item.label}
              </li>
            ))}
          </ol>
        </aside>

        <section className="ob-main">
          <div className="ob-top">
            <span className="ob-count">
              {t("Étape", "Step")} {step + 1} / {STEPS.length}
            </span>
            <button type="button" className="ob-close" onClick={() => finish(true)} aria-label={t("Fermer", "Close")}>
              <svg viewBox="0 0 20 20" aria-hidden="true">
                <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </button>
          </div>
          <div className="ob-progress" aria-hidden="true">
            <i style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} />
          </div>

          <h2 id="ob-title">{current.title}</h2>
          <p className="ob-text">{current.text}</p>

          <div className="ob-body">
            {current.key === "role" ? (
              <>
                {optionGrid(copy.roles, role, setRole, ONBOARDING_ROLE_ICONS)}
                {otherInput(role, roleOther, setRoleOther, t("Précisez le poste que vous visez…", "Tell us your target role…"))}
              </>
            ) : null}
            {current.key === "sector" ? (
              <>
                {optionGrid(copy.sectors, sector, setSector, ONBOARDING_SECTOR_ICONS)}
                {otherInput(sector, sectorOther, setSectorOther, t("Précisez votre secteur…", "Tell us your industry…"))}
              </>
            ) : null}
            {current.key === "experience" ? optionGrid(EXPERIENCES, experience, setExperience) : null}
            {current.key === "education" ? optionGrid(EDUCATIONS, education, setEducation, EDUCATIONS.map(() => "docClassic")) : null}
          </div>

          <div className="ob-actions">
            {step > 0 ? (
              <button type="button" className="btn-secondary" onClick={() => setStep(step - 1)}>
                {t("Retour", "Back")}
              </button>
            ) : (
              <span />
            )}
            <div className="ob-actions-right">
              <button type="button" className="ob-skip" onClick={skip}>
                {t("Passer", "Skip")}
              </button>
              <button type="button" className="btn-main ready" disabled={!canContinue} onClick={next}>
                {step === STEPS.length - 1 ? t("Terminer", "Finish") : copy.continue}
                <UiIcon name={step === STEPS.length - 1 ? "check" : "chevron"} />
              </button>
            </div>
          </div>
        </section>
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


// Pied de page commun (espace candidat, admin, école, cabinet, pages légales).
// Un lien n'est affiché que s'il a une vraie destination dans l'espace courant :
// jamais de lien mort ni de lien qui renvoie ailleurs que ce qu'il annonce.
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
  onCodingClick,
  onLetterClick,
  onNegotiationClick,
  onEmailScoutClick,
  onApplicationsClick
}) {
  const en = copy?.footerProduct === "Product";
  const t = (fr, enText) => (en ? enText : fr);
  const year = new Date().getFullYear();

  const columns = [
    {
      title: t("Modules", "Modules"),
      links: [
        { label: t("Analyse de CV", "CV analysis"), onClick: onImportClick },
        { label: t("Candidatures", "Applications"), onClick: onApplicationsClick },
        { label: t("Entretiens", "Interviews"), onClick: onInterviewsClick },
        { label: t("Test technique", "Coding test"), onClick: onCodingClick },
        { label: t("Lettre IA", "AI letter"), onClick: onLetterClick },
        { label: t("Négociation", "Negotiation"), onClick: onNegotiationClick },
        { label: "Email Scout", onClick: onEmailScoutClick }
      ]
    },
    {
      title: t("Plateforme", "Platform"),
      links: [
        { label: t("Accueil", "Home"), onClick: onHomeClick || onBrandClick },
        { label: t("Tarifs", "Pricing"), onClick: onPricingClick },
        { label: t("Aide et contact", "Help & contact"), onClick: onContactClick }
      ]
    },
    {
      title: copy?.footerCompany || t("Entreprise", "Company"),
      links: [
        { label: t("À propos", "About"), onClick: onAboutClick },
        { label: t("Partenariats écoles et cabinets", "School & firm partnerships"), onClick: onContactClick }
      ]
    },
    {
      title: copy?.footerLegal || t("Légal", "Legal"),
      links: [
        { label: t("Confidentialité", "Privacy"), onClick: onPrivacyClick },
        { label: t("Conditions d'utilisation", "Terms of use"), onClick: onTermsClick },
        { label: t("Cookies", "Cookies"), onClick: onCookiesClick },
        { label: t("Sécurité", "Security"), onClick: onSecurityClick }
      ]
    }
  ]
    .map((column) => ({ ...column, links: column.links.filter((link) => typeof link.onClick === "function") }))
    .filter((column) => column.links.length);

  const brand = <img src="/logo-career-cv.png" alt="Career CV" className="brand-logo" />;

  return (
    <footer className="connected-footer cf-footer">
      <div className="cf-top">
        <div className="cf-brand">
          {onBrandClick ? (
            <button type="button" className="cf-logo" onClick={onBrandClick} aria-label={t("Accueil Career CV", "Career CV home")}>
              {brand}
            </button>
          ) : (
            <div className="cf-logo">{brand}</div>
          )}
          <p>{copy?.footerText}</p>
          {onContactClick ? (
            <button type="button" className="cf-cta" onClick={onContactClick}>
              <svg viewBox="0 0 20 20" aria-hidden="true">
                <path d="M3 5.5A1.5 1.5 0 0 1 4.5 4h11A1.5 1.5 0 0 1 17 5.5v9a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 3 14.5z" fill="none" stroke="currentColor" strokeWidth="1.6" />
                <path d="M3.5 5l6.5 5 6.5-5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {t("Nous contacter", "Contact us")}
            </button>
          ) : null}
        </div>
        <div className="cf-columns" style={{ "--cf-cols": columns.length }}>
          {columns.map((column) => (
            <nav key={column.title} className="cf-column" aria-label={column.title}>
              <h3>{column.title}</h3>
              <ul>
                {column.links.map((link) => (
                  <li key={link.label}>
                    <button type="button" onClick={link.onClick}>
                      {link.label}
                    </button>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
      </div>
      <div className="cf-bottom">
        <span>© {year} Career CV. {t("Tous droits réservés.", "All rights reserved.")}</span>
        <button
          type="button"
          className="cf-top-link"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        >
          {t("Retour en haut", "Back to top")}
          <svg viewBox="0 0 20 20" aria-hidden="true">
            <path d="M10 15V5M5.5 9.5L10 5l4.5 4.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
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



// Alerte d'erreur au style de l'app (toast), à la place de window.alert.
function showErrorToast(message) {
  if (!message) return;
  Swal.fire({
    toast: true,
    position: "top-end",
    icon: "error",
    title: message,
    showConfirmButton: false,
    timer: 4200,
    timerProgressBar: true,
    customClass: {
      popup: "career-toast",
      title: "career-toast-title"
    }
  });
}

function AuthScreen({
  onLogin,
  onVerifyMfa,
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
  landingCopy,
  authSkipOtp = false
}) {
  // careercv.fr/#/login (lien des e-mails) ouvre directement la connexion.
  const [showLanding, setShowLanding] = useState(() => (typeof window === "undefined" ? true : !/^#\/login/.test(window.location.hash || "")));
  const [legalPage, setLegalPage] = useState(null);
  const [lastAuthMethod] = useState(getLastAuthMethod);

  const [mode, setMode] = useState("login");
  // Connexion : "credentials" (identifiant + mot de passe sur le même écran),
  // "verify" (adresse jamais vérifiée : code reçu par e-mail) ou "mfa"
  // (double authentification). Plus de connexion par code e-mail.
  const [loginStep, setLoginStep] = useState("credentials");
  const [mfaChallenge, setMfaChallenge] = useState(null);
  const [passwordNotSet, setPasswordNotSet] = useState(false);
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
    setPasswordNotSet(false);
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
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [googleProcessing, setGoogleProcessing] = useState(false);

  // Le premier facteur a réussi mais le compte exige un second facteur.
  function startMfaStep(result) {
    onClearError();
    setMfaChallenge({ ticket: result.mfaTicket, methods: result.methods || [] });
    setMode("login");
    setLoginStep("mfa");
  }

  async function handleGoogleCredential(credential) {
    setGoogleProcessing(true);
    try {
      // Depuis l'écran de connexion, on ne veut jamais créer de compte
      // silencieusement : intent "login" fait échouer proprement si aucun
      // compte Google n'existe (voir onGoogleLogin / NO_ACCOUNT_GOOGLE),
      // plutôt que d'inscrire l'utilisateur sans qu'il l'ait demandé.
      const result = await onGoogleLogin(credential, mode === "signup" ? "signup" : "login");
      if (result?.mfaRequired) startMfaStep(result);
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
    onClearError();
    setPasswordNotSet(false);
    setLoginForm((prev) => ({ ...prev, [key]: value }));
  }

  function updateSignupField(key, value) {
    onClearError();
    setSignupForm((prev) => ({ ...prev, [key]: value }));
  }

  function switchMode(nextMode) {
    setMode(nextMode);
    setLoginStep("credentials");
    setMfaChallenge(null);
    setPasswordNotSet(false);
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
        showErrorToast(language === "en" ? "The password must contain at least 8 characters." : "Le mot de passe doit contenir au moins 8 caractères.");
        return;
      }
      if (newPassword !== confirmNewPassword) {
        showErrorToast(language === "en" ? "Passwords do not match." : "Les mots de passe ne correspondent pas.");
        return;
      }
      setIsSubmitting(true);
      try {
        const result = await onResetPassword({ identifier: forgotIdentifier, code, newPassword });
        if (result?.mfaRequired) startMfaStep(result);
      } catch (_error) {
        // Error already surfaced via the inline auth error state.
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    if (mode === "login") {
      // Adresse jamais vérifiée : on valide le code reçu, puis connexion.
      if (loginStep === "verify") {
        const code = loginCode.join("");
        if (code.length !== 6) return;
        setIsSubmitting(true);
        try {
          await onVerifySignupCode({ identifier: verificationEmail, code });
        } catch (_error) {
          // Error already surfaced via the inline auth error state.
        } finally {
          setIsSubmitting(false);
        }
        return;
      }
      if (!loginForm.identifier.trim() || !loginForm.password) return;
      setIsSubmitting(true);
      try {
        const result = await onLogin({ identifier: loginForm.identifier.trim(), password: loginForm.password });
        if (result?.mfaRequired) startMfaStep(result);
      } catch (error) {
        if (error.code === "EMAIL_NOT_VERIFIED") {
          onClearError();
          setVerificationEmail(error.verification?.email || loginForm.identifier);
          setResendSeconds(error.verification?.resendAfterSeconds || 30);
          setLoginCode(["", "", "", "", "", ""]);
          setLoginStep("verify");
        } else if (error.code === "PASSWORD_NOT_SET") {
          setPasswordNotSet(true);
        }
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    if (signupPhase === "form") {
      try {
        validateSignupForm();
      } catch (validationError) {
        showErrorToast(validationError.message);
        return;
      }

      setIsSubmitting(true);
      try {
        const result = await onSignup(buildSignupPayload());
        // Si le serveur a déjà connecté directement (bascule temporaire
        // AUTH_SKIP_SIGNUP_OTP), pas d'écran de code à afficher.
        if (result.token) return;
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
    // Seul usage restant du code par e-mail : vérifier une adresse (inscription,
    // ou connexion d'un compte dont l'adresse n'a jamais été vérifiée).
    const email = mode === "signup" ? signupForm.email : verificationEmail;
    if (!email) return;
    try {
      const result = await onResendSignupCode(email);
      setVerificationEmail(result.email || email);
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
    if (legalPage === "pricing") {
      return (
        <Suspense fallback={<LazyAppFallback />}>
          <PublicPricingPage {...sharedProps} />
        </Suspense>
      );
    }
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
        <div
          className="auth-modal-backdrop"
          onMouseDown={() => {
            onClearError();
            setShowLanding(true);
          }}
        >
          <div className="auth-modal-card login-style" onMouseDown={(event) => event.stopPropagation()}>
            <div className="auth-modal-close-sticky">
              <button
                className="auth-modal-close"
                type="button"
                onClick={() => {
                  onClearError();
                  setShowLanding(true);
                }}
                aria-label="Fermer"
              >
                ×
              </button>
            </div>

            <div className="login-modal-head">
              <h2>
                {mode === "forgot"
                  ? forgotStep === "identifier"
                    ? language === "en"
                      ? "Reset or create your password"
                      : "Réinitialiser ou créer un mot de passe"
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
                  : loginStep === "mfa"
                    ? language === "en"
                      ? "Two-step verification"
                      : "Vérification en deux étapes"
                    : loginStep === "verify"
                      ? language === "en"
                        ? "Verify your email"
                        : "Vérifiez votre adresse e-mail"
                      : language === "en"
                        ? "Identify yourself"
                        : "S'identifier"}
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
                    ? "Enter the 6-digit code we sent to confirm your address"
                    : "Saisissez le code à 6 chiffres envoyé pour confirmer votre adresse"
                  : mode === "login" && loginStep === "mfa"
                  ? language === "en"
                    ? "Confirm your identity to finish signing in."
                    : "Confirmez votre identité pour terminer la connexion."
                  : mode === "login" && loginStep === "verify"
                  ? language === "en"
                    ? "Enter the 6-digit code we just sent to confirm your address"
                    : "Saisissez le code à 6 chiffres envoyé pour confirmer votre adresse"
                  : language === "en"
                    ? "to continue to Career CV"
                    : "pour continuer vers Career CV"}
                {mode === "forgot" && forgotStep === "newPassword" ? (
                  <>
                    <br />
                    <strong>{forgotIdentifier}</strong>
                  </>
                ) : null}
              </p>
            </div>

      {mode === "login" && loginStep === "mfa" && mfaChallenge ? (
        <div className="auth-card auth-card-modal">
          <MfaLoginStep
            ticket={mfaChallenge.ticket}
            methods={mfaChallenge.methods}
            language={language}
            onVerify={onVerifyMfa}
            onRestart={(message) => {
              setMfaChallenge(null);
              setLoginStep("credentials");
              setLoginForm((prev) => ({ ...prev, password: "" }));
              if (message) showErrorToast(message);
            }}
          />
        </div>
      ) : (
      <form className="auth-card auth-card-modal" onSubmit={submit}>
        {mode === "forgot" ? (
          <>
            {forgotStep === "identifier" ? (
              <label>
                {language === "en" ? "Email or username" : "Adresse e-mail ou nom d'utilisateur"}
                <input
                  value={forgotIdentifier}
                  onChange={(event) => {
                    onClearError();
                    setForgotIdentifier(event.target.value);
                  }}
                  placeholder={language === "en" ? "Username or email address" : "Nom d'utilisateur ou adresse e-mail"}
                  autoFocus
                  required
                />
              </label>
            ) : forgotStep === "code" ? (
              <CodeEntry
                language={language}
                email={forgotIdentifier}
                onChangeEmail={() => setForgotStep("identifier")}
                value={forgotCode.join("")}
                onChange={(value) => {
                  onClearError();
                  setForgotCode(Array.from({ length: 6 }, (_, i) => value[i] || ""));
                }}
                onResend={resendForgotCode}
                resendSeconds={forgotResendSeconds}
              />
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
                      onChange={(event) => {
                        onClearError();
                        setNewPassword(event.target.value);
                      }}
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
                    onChange={(event) => {
                      onClearError();
                      setConfirmNewPassword(event.target.value);
                    }}
                    minLength={8}
                    required
                  />
                </label>
              </>
            )}
          </>
        ) : mode === "login" ? (
          <>
            {loginStep === "verify" ? (
              <CodeEntry
                language={language}
                email={verificationEmail}
                onChangeEmail={() => setLoginStep("credentials")}
                value={loginCode.join("")}
                onChange={(value) => {
                  onClearError();
                  setLoginCode(Array.from({ length: 6 }, (_, i) => value[i] || ""));
                }}
                onResend={resendCode}
                resendSeconds={resendSeconds}
              />
            ) : (
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
                    autoComplete="username"
                    autoFocus
                    required
                  />
                </label>
                <label>
                  {copy.password}
                  <div className="password-field">
                    <input
                      type={showLoginPassword ? "text" : "password"}
                      value={loginForm.password}
                      onChange={(event) => updateLoginField("password", event.target.value)}
                      placeholder={language === "en" ? "Your password" : "Votre mot de passe"}
                      autoComplete="current-password"
                      required
                    />
                    <button
                      type="button"
                      className="password-toggle"
                      onClick={() => setShowLoginPassword((value) => !value)}
                      aria-label={showLoginPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                    >
                      <UiIcon name="eye" />
                    </button>
                  </div>
                </label>
                {passwordNotSet ? (
                  <div className="auth-google-hint">
                    <p>
                      {language === "en"
                        ? "You signed up with Google: continue with Google above, or create a password to also sign in with your email."
                        : "Vous vous êtes inscrit avec Google : continuez avec Google ci-dessus, ou créez un mot de passe pour vous connecter aussi par e-mail."}
                    </p>
                    <button type="button" onClick={startForgotPassword}>
                      {language === "en" ? "Create a password" : "Créer un mot de passe"}
                    </button>
                  </div>
                ) : null}
              </>
            )}
          </>
        ) : signupPhase === "code" ? (
          <CodeEntry
            language={language}
            email={verificationEmail}
            value={loginCode.join("")}
            onChange={(value) => {
              onClearError();
              setLoginCode(Array.from({ length: 6 }, (_, i) => value[i] || ""));
            }}
            onResend={resendCode}
            resendSeconds={resendSeconds}
          />
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
              ? loginStep === "verify"
                ? language === "en"
                  ? "Verify"
                  : "Vérifier"
                : copy.connect
              : signupPhase === "code"
                ? language === "en"
                  ? "Verify"
                  : "Vérifier"
                : copy.createAccount}
          </button>
        </div>
      </form>
      )}
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













