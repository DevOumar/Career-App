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
  extractJobOffer,
  generateCoverLetter,
  getLatestMatchRun,
  getHealth,
  getMatchFeedback,
  getPremiumSnapshot,
  getUserFromSession,
  linkGoogleAccount,
  listOffers,
  listUserCvs,
  loginUser,
  loginWithGoogle,
  logoutUser,
  negotiationReply,
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
import { PLANS, getPlanById } from "./data/plans";

const NAV_ITEMS = [
  { id: "home", label: { fr: "Accueil", en: "Home" }, always: true, icon: "home" },
  { id: "import", label: { fr: "Importer CV", en: "Import CV" }, always: true, icon: "upload" },
  { id: "entretiens", label: { fr: "Entretiens", en: "Interviews" }, icon: "chat" },
  { id: "lettre", label: { fr: "Lettre IA", en: "AI Letter" }, icon: "mail" },
  { id: "negociation", label: { fr: "Négociation", en: "Negotiation" }, icon: "scale" },
  { id: "historique", label: { fr: "Historique CV", en: "CV history" }, always: true, icon: "history" },
  { id: "tarifs", label: { fr: "Tarifs", en: "Pricing" }, always: true, icon: "pricetag" }
];

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
    footerText: "Career App aide les candidats à optimiser leur CV, cibler les bonnes offres et préparer leurs entretiens.",
    footerProduct: "Produit",
    footerCompany: "Entreprise",
    footerLegal: "Légal",
    linksProduct: ["Fonctionnalités", "Matching CV", "Entretiens", "Offres"],
    linksCompany: ["À propos", "Contact"],
    linksLegal: ["Confidentialité", "CGU", "Cookies"]
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
    footerText: "Career App helps candidates optimize CVs, target the right jobs, and prepare interviews.",
    footerProduct: "Product",
    footerCompany: "Company",
    footerLegal: "Legal",
    linksProduct: ["Features", "CV matching", "Interviews", "Jobs"],
    linksCompany: ["About", "Contact"],
    linksLegal: ["Privacy", "Terms", "Cookies"]
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
    role: "Choisir ton rôle",
    activate: "Activer ton parcours",
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
    other: "Autre"
  },
  en: {
    student: "Candidate/Student",
    candidate: "Candidate",
    recruiter_firm: "Recruitment agency",
    recruiter_internal: "Internal recruiter",
    company: "Company",
    school: "School / University",
    coach: "Career coach",
    other: "Other"
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
      text: "Change ton mot de passe de connexion.",
      current: "Mot de passe actuel",
      next: "Nouveau mot de passe",
      confirm: "Confirmation",
      submit: "Mettre à jour"
    },
    home: {
      userFallback: "Utilisateur",
      eyebrow: "Assistant carrière nouvelle génération",
      titleA: "Décroche le poste qui te correspond,",
      titleB: "avec un parcours",
      titleAccent: "guidé par la data",
      intro: "Importe ton CV, colle une offre, et laisse l'IA calculer ton score de match, tes mots-clés manquants et ton fit culturel — avant de t'entraîner à l'entretien.",
      start: "Commencer",
      tickerLabel: "Informations personnalisées",
      welcome: "Bienvenue",
      accountType: "Type de compte",
      profileDone: "Profil complété",
      profilePct: "Profil complété à",
      noMatch: "Aucun matching lancé pour le moment",
      latestMatch: "Dernier matching",
      objective: "Objectif",
      addTarget: "Ajoute ton rôle cible dans Profil",
      planLabel: "Plan",
      tokens: "jetons",
      unlimitedTokens: "illimité",
      seeTarifs: "Voir les tarifs",
      importedCv: "CV importé(s)",
      noCv: "Aucun CV importé",
      workflow: [
        { number: "01", title: "Importer", text: "Ton CV et l'offre visée" },
        { number: "02", title: "Analyser", text: "Score IA, mots-clés manquants, fit culturel" },
        { number: "03", title: "Passer à l'action", text: "Recommandations, réseautage, CV optimisé en PDF" },
        { number: "04", title: "S'entraîner", text: "Simulateur d'entretiens avec feedback" }
      ]
    },
    import: {
      title: "Importer ton CV",
      text: "Télécharge ton CV, vérifie les informations extraites, puis colle l'offre cible pour lancer le matching.",
      steps: [
        { title: "Télécharger CV", text: "Extraction automatique" },
        { title: "Réviser le profil", text: "Infos modifiables" },
        { title: "Poste visé", text: "Description de l'offre" },
        { title: "Analyse", text: "Match & Optimisation" }
      ],
      uploadTitle: "Téléchargez votre CV",
      uploadText: "Nous extrayons les informations pour préparer ton profil candidat.",
      analysingTitle: "Analyse de votre CV...",
      analysingText: "Cela prend généralement 10-20 secondes.",
      reviewTitle: "Révision de l'extraction",
      reviewText: "Vérifie et corrige les informations avant de les enregistrer.",
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
      jobText: "Colle la description complète du poste ci-dessous.",
      jobDescription: "Description du poste",
      jobSummaryTitle: "Résumé du poste",
      jobSummaryText: "Vérifie les détails extraits avant de lancer l'analyse.",
      technicalSkills: "Compétences techniques",
      softSkills: "Soft skills",
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
      offerPlaceholder: "Colle l'offre d'emploi complète ici...",
      chars: "caractères",
      ready: "Prêt",
      minimum: "Minimum 50 caractères",
      analysing: "Analyse en cours...",
      analyse: "Analyser mon profil",
      matchingTitle: "Analyse du matching en cours...",
      matchingText: "L'IA compare ton profil à l'offre. Cela prend généralement 10-20 secondes.",
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
      matchFeedbackThanks: "Merci pour ton retour !",
      matchNetworkingTitle: "Opportunités Réseautage",
      matchNetworkingText: "Connecte-toi avec des employés chez {company} pour augmenter tes chances.",
      matchNetworkingButton: "Trouver des contacts dans l'entreprise",
      matchNetworkingSearching: "Préparation des recherches...",
      matchNetworkingEmpty: "Career App n'a pas accès à un annuaire LinkedIn : voici des recherches ciblées à lancer toi-même en un clic.",
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
      matchCvPreviewEmpty: "Importe et révise ton CV pour voir un aperçu ici.",
      cvPreviewSummary: "Résumé professionnel",
      cvPreviewExperience: "Expérience",
      cvPreviewEducation: "Formation",
      cvPreviewTechnicalSkills: "Compétences techniques",
      cvPreviewSoftSkills: "Compétences comportementales",
      cvPreviewLanguages: "Langues",
      cvPreviewCertifications: "Certifications",
      cvPreviewInterests: "Centres d'intérêt"
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
      text: "Recommandations automatiques basées sur les écarts détectés pendant le matching."
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
      activate: "Activer",
      currentPlan: "Plan actuel",
      licenseCodeTitle: "Vous avez reçu un code de licence ?",
      licenseCodePlaceholder: "Ex : LIC-XXXX-XXXX",
      licenseCodeSubmit: "Activer",
      licenseCodeHint: "Ton établissement ou ton cabinet t'a transmis un code ? Active-le ici pour débloquer ton offre."
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
      placeholder: "Ta réponse...",
      send: "Envoyer",
      report: "Bilan coaching",
      good: "Ce qui est bien",
      improve: "À améliorer",
      keyAdvice: "Conseil clé",
      lockedTitle: "Prépare tes entretiens comme un pro",
      lockedText:
        "Le simulateur d'entretiens IA (feedback en direct, questions RH/technique/comportementale, conseils personnalisés) fait partie de l'offre Trajectoire Pro. Passe au plan adapté pour t'entraîner sans limite avant le grand jour.",
      lockedFeatures: [
        "Simulateur d'entretiens illimité",
        "Feedback immédiat sur chaque réponse",
        "Suggestions de réseautage avancées"
      ],
      lockedCta: "Voir les offres Trajectoire Pro"
    },
    coverLetter: {
      title: "Lettre de motivation IA",
      subtitle: "Une lettre unique, écrite à partir de ton vrai profil et de l'offre visée.",
      toneLabel: "Choisis un ton",
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
      noTokens: "Tu n'as plus de jetons. Passe à un plan supérieur pour générer ta lettre.",
      generating: "Rédaction en cours..."
    },
    negotiation: {
      title: "Simulateur de négociation salariale",
      subtitle: "Entraîne-toi face à un recruteur IA réaliste avant l'entretien décisif.",
      targetLabel: "Prétention salariale visée (optionnel)",
      targetPlaceholder: "Ex : 42 000",
      start: "Démarrer la négociation (1 jeton)",
      starting: "Connexion au recruteur...",
      placeholder: "Ta réponse au recruteur...",
      send: "Envoyer",
      tip: "Conseil coaching",
      finish: "Terminer & voir mon bilan",
      finishing: "Analyse de la négociation...",
      summary: "Bilan de négociation",
      strengths: "Points forts",
      improvements: "Axes d'amélioration",
      empty: "Importe un CV et analyse une offre pour débloquer ce module.",
      noTokens: "Tu n'as plus de jetons. Passe à un plan supérieur pour démarrer une négociation."
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
      cvPreviewInterests: "Interests"
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
      text: "Automatic recommendations based on gaps detected during matching."
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
      generating: "Writing in progress..."
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
      noTokens: "You're out of tokens. Upgrade your plan to start a negotiation."
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

function withInitials(user) {
  const first = user?.firstName?.[0] || "U";
  const last = user?.lastName?.[0] || "X";
  return `${first}${last}`.toUpperCase();
}

function getAvatarSource(user) {
  return user?.avatarDataUrl || user?.account?.avatarDataUrl || "";
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

  if (!message) return fallback;

  const technicalPatterns = [
    /is not defined/i,
    /cannot read properties/i,
    /undefined/i,
    /null/i,
    /stack/i,
    /syntaxerror/i,
    /referenceerror/i,
    /typeerror/i,
    /failed to fetch/i,
    /networkerror/i,
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
    spark: (
      <path
        d="M10 2.5l1.3 3.14L14.5 7l-3.2 1.36L10 11.5 8.7 8.36 5.5 7l3.2-1.36L10 2.5zm5 7l.7 1.7 1.8.8-1.8.8-.7 1.7-.7-1.7-1.8-.8 1.8-.8.7-1.7zM4.5 11l.9 2.18 2.2.95-2.2.95-.9 2.17-.9-2.17-2.2-.95 2.2-.95.9-2.18z"
        fill="currentColor"
      />
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
    )
  };

  return (
    <svg className={className} viewBox="0 0 20 20" aria-hidden="true" focusable="false">
      {map[name] || map.spark}
    </svg>
  );
}

export default function App() {
  const [token, setToken] = useState(() => localStorage.getItem("career_app_token") || "");
  const [language, setLanguage] = useState(() => localStorage.getItem("career_app_language") || "fr");
  const [currency, setCurrency] = useState(getCurrency);
  const [stripeEnabled, setStripeEnabled] = useState(false);
  const [session, setSession] = useState(null);
  const [premium, setPremium] = useState(null);
  const [activePage, setActivePage] = useState("home");

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
      await syncSession(result.token);
      setActivePage("home");
      rememberLastAuthMethod("password");
    } catch (error) {
      setAuthError(error.message);
    }
  }

  async function handleGoogleLogin(credential) {
    try {
      clearMessages();
      const result = await loginWithGoogle(credential);
      setToken(result.token);
      await syncSession(result.token);
      setActivePage("home");
      rememberLastAuthMethod("google");
    } catch (error) {
      setAuthError(error.message);
      throw error;
    }
  }

  async function handleRequestLoginCode(payload) {
    try {
      clearMessages();
      return await requestLoginCode(payload);
    } catch (error) {
      setAuthError(error.message);
      throw error;
    }
  }

  async function handleSignup(payload) {
    try {
      clearMessages();
      return await registerUser(payload);
    } catch (error) {
      setAuthError(error.message);
      throw error;
    }
  }

  async function handleVerifySignupCode({ identifier, code }) {
    try {
      clearMessages();
      const result = await verifyLoginCode({ identifier, code, purpose: "signup" });
      setToken(result.token);
      await syncSession(result.token);
      setActivePage("home");
      setPageMessage(
        language === "en"
          ? "Account verified. Welcome to Career App."
          : "Compte vérifié. Bienvenue sur Career App."
      );
    } catch (error) {
      setAuthError(error.message);
      throw error;
    }
  }

  async function handleResendSignupCode(identifier) {
    try {
      clearMessages();
      return await requestLoginCode({ identifier, purpose: "signup" });
    } catch (error) {
      setAuthError(error.message);
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
      setProcessingError(error.message);
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

  async function saveCvToDb({ fileName, text, parsed }) {
    if (!user) return;

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
      setProcessingError(error.message);
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
      setProcessingError(error.message || (language === "en" ? "Unable to analyze this job offer." : "Impossible d'analyser cette offre."));
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
      setProcessingError(error.message);
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
      setProcessingError(error.message);
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
      const avatarDataUrl = await readFileAsDataUrl(file);
      const updated = await updateUserAvatar(user.id, avatarDataUrl);
      setSession({ user: updated.user, premium: updated.premium });
      setPremium(updated.premium);
      setPageMessage(language === "en" ? "Profile photo updated." : "Photo de profil mise à jour.");
    } catch (error) {
      setProcessingError(error.message);
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
      setProcessingError(error.message);
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
      setProcessingError(error.message);
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
      setProcessingError(error.message);
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
      setProcessingError(error.message);
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
      setProcessingError(error.message);
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
      setProcessingError(error.message);
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
      setProcessingError(error.message);
    }
  }

  async function handleActivatePlan(planId, billingCycle) {
    if (!user) return;
    try {
      clearMessages();
      const updated = await activatePlan({ userId: user.id, planId, billingCycle });
      setSession({ user: updated.user, premium: updated.premium });
      setPremium(updated.premium);
      if (updated.licenseCode) {
        setPageMessage(
          language === "en"
            ? `Plan activated. Your license code to share: ${updated.licenseCode}`
            : `Plan activé. Ton code de licence à partager : ${updated.licenseCode}`
        );
      } else {
        setPageMessage(language === "en" ? "Plan activated." : "Plan activé.");
      }
    } catch (error) {
      setProcessingError(error.message);
    }
  }

  async function handleStripeCheckout(planId, billingCycle) {
    if (!user) return;
    try {
      clearMessages();
      const { url } = await createStripeCheckoutSession({ userId: user.id, planId, billingCycle });
      window.location.href = url;
    } catch (error) {
      setProcessingError(error.message);
    }
  }

  async function handleRedeemLicenseCode(code) {
    if (!user || !code.trim()) return;
    try {
      clearMessages();
      const updated = await redeemLicenseCode({ userId: user.id, code: code.trim() });
      setSession({ user: updated.user, premium: updated.premium });
      setPremium(updated.premium);
      setPageMessage(language === "en" ? "License code activated." : "Code de licence activé.");
    } catch (error) {
      setProcessingError(error.message);
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
          : "Tu n'as plus de jetons. Choisis un plan pour continuer à analyser des offres."
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
          : "Analyse terminée. Tu peux ouvrir Analyse, Offres, CV+ et Entretiens."
      );
    } catch (error) {
      setProcessingError(error.message || "Échec de l'analyse.");
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
      setProcessingError(error.message);
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
            <span className="menu-caret">▾</span>
          </button>

          {userMenuOpen ? (
            <div className="user-dropdown">
              <div className="user-dropdown-head">
                <AvatarCircle user={user} />
                <div>
                  <strong>{user.firstName} {user.lastName}</strong>
                  <span>{user.username || user.email.split("@")[0]}</span>
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
        {activePage === "cv" ? <CvAdvicePage matchData={latestMatch} language={language} /> : null}
        {activePage === "entretiens" ? (
          <InterviewPage language={language} subscription={user?.subscription} onGoToTarifs={() => goTo("tarifs")} />
        ) : null}
        {activePage === "lettre" ? (
          <CoverLetterPage
            language={language}
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
        {activePage === "historique" ? <CvHistoryPage cvHistory={cvHistory} latestMatch={latestMatch} language={language} /> : null}
        {activePage === "tarifs" ? (
          <PricingPage
            user={user}
            premium={premium}
            language={language}
            currency={currency}
            stripeEnabled={stripeEnabled}
            onActivatePlan={handleActivatePlan}
            onStripeCheckout={handleStripeCheckout}
            onRedeemCode={handleRedeemLicenseCode}
          />
        ) : null}
      </main>

      <ConnectedFooter copy={landingCopy} />

      {showRoleQuizModal ? <RoleQuizModal language={language} onComplete={handleCompleteRoleQuiz} /> : null}

      {accountDrawerOpen ? (
        <AccountDrawer
          user={user}
          language={language}
          setLanguage={setLanguage}
          currency={currency}
          setCurrency={setCurrency}
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
                  placeholder={language === "en" ? "Tell us your target role..." : "Précise le poste que tu vises..."}
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
                  placeholder={language === "en" ? "Tell us your industry..." : "Précise ton secteur..."}
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
    setProfileAvatarPreview(await readFileAsDataUrl(file));
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
      setLocalError(error.message);
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
      setLocalError(error.message);
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
      setLocalError(error.message);
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
          preferences: "Preferences",
          language: "Language",
          currency: "Currency",
          currencyHint: "Prices shown across the app (plans, pricing) are converted to your chosen currency using a fixed indicative rate.",
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
          connectedRemoveText: "Cela délie ton compte Google. Tu ne pourras plus l'utiliser pour te connecter, mais la connexion par mot de passe et code e-mail reste disponible.",
          preferences: "Préférences",
          language: "Langue",
          currency: "Devise",
          currencyHint: "Les prix affichés dans l'app (offres, tarifs) sont convertis dans ta devise avec un taux indicatif fixe.",
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
                        <button className="btn-main">{copy.save}</button>
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
  const style = src
    ? {
        backgroundImage: `url(${src})`,
        backgroundSize: "cover",
        backgroundPosition: "center"
      }
    : undefined;

  return (
    <div className={`avatar ${large ? "large" : ""} ${src ? "has-image" : ""}`} style={style}>
      {src ? null : initials}
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

function LandingPage({ copy, language, setLanguage, onLoginClick, onSignupClick }) {
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
            <UiIcon name="spark" />
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
                  <UiIcon name={index === 0 ? "shield" : index === 1 ? "spark" : "profile"} />
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

        <section className="ats-band">
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

        <section className="features-section">
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

        <section className="steps-section">
          <div className="section-heading">
            <h2>{copy.stepsTitle}</h2>
            <p>{copy.stepsText}</p>
          </div>
          <div className="landing-steps">
            {copy.steps.map((step, index) => (
              <article key={step.title}>
                <span className="step-number">{String(index + 1).padStart(2, "0")}</span>
                <span className="step-icon">
                  <UiIcon name={index === 0 ? "upload" : index === 1 ? "spark" : "chat"} />
                </span>
                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="career-section">
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
      </main>

      <footer className="landing-footer">
        <div>
          <div className="landing-brand footer-brand">
            <span className="brand-mark" aria-hidden="true">
              <UiIcon name="spark" />
            </span>
            <strong>Career App</strong>
          </div>
          <p>{copy.footerText}</p>
        </div>
        <FooterColumn title={copy.footerProduct} links={copy.linksProduct} />
        <FooterColumn title={copy.footerCompany} links={copy.linksCompany} />
        <FooterColumn title={copy.footerLegal} links={copy.linksLegal} />
      </footer>
    </div>
  );
}

function FooterColumn({ title, links }) {
  return (
    <div className="footer-column">
      <h3>{title}</h3>
      {links.map((link) => (
        <button type="button" key={link}>
          {link}
        </button>
      ))}
    </div>
  );
}

function ConnectedFooter({ copy }) {
  return (
    <footer className="connected-footer">
      <div>
        <div className="landing-brand footer-brand">
          <span className="brand-mark" aria-hidden="true">
            <UiIcon name="spark" />
          </span>
          <strong>Career App</strong>
        </div>
        <p>{copy.footerText}</p>
      </div>
      <FooterColumn title={copy.footerProduct} links={copy.linksProduct} />
      <FooterColumn title={copy.footerCompany} links={copy.linksCompany} />
      <FooterColumn title={copy.footerLegal} links={copy.linksLegal} />
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
        try {
          const result = await onRequestLoginCode({ identifier: loginForm.identifier });
          setVerificationEmail(result.email || loginForm.identifier);
          setResendSeconds(result.resendAfterSeconds || 30);
          setLoginCode(["", "", "", "", "", ""]);
          setLoginStep("code");
        } catch (_error) {
          // Error already surfaced via the inline auth error state.
        }
        return;
      }
      if (loginStep === "code") {
        const code = loginCode.join("");
        if (code.length !== 6) return;
        onLogin({ identifier: loginForm.identifier, code });
        return;
      }
      onLogin(loginForm);
      return;
    }

    if (signupPhase === "form") {
      try {
        validateSignupForm();
      } catch (validationError) {
        alert(validationError.message);
        return;
      }

      try {
        const result = await onSignup(buildSignupPayload());
        setVerificationEmail(result.verification?.email || signupForm.email);
        setResendSeconds(result.verification?.resendAfterSeconds || 30);
        setLoginCode(["", "", "", "", "", ""]);
        setSignupPhase("code");
      } catch (_error) {
        // Error already surfaced via the inline auth error state.
      }
      return;
    }

    const code = loginCode.join("");
    if (code.length !== 6) return;
    try {
      await onVerifySignupCode({ identifier: signupForm.email, code });
    } catch (_error) {
      // Error already surfaced via the inline auth error state.
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

  return (
    <div className="auth-modal-page">
      <LandingPage
        copy={landingCopy}
        language={language}
        setLanguage={setLanguage}
        onLoginClick={() => switchMode("login")}
        onSignupClick={() => switchMode("signup")}
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
                        ✎
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
                <GoogleSignInButton language={language} onCredential={onGoogleLogin} showLastUsed={lastAuthMethod === "google"} />

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
            <GoogleSignInButton language={language} onCredential={onGoogleLogin} />

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
          <button className="btn-main" type="submit">
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
  const tickerItems = [
    `${copy.welcome} ${userLabel}`,
    `${copy.accountType}: ${roleLabel}`,
    profileLabel,
    cvLabel,
    scoreLabel,
    planLabel,
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
  cvSourceText
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
              <span>{index < activeIndex ? "✓" : index + 1}</span>
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
              <ReviewCard title={copy.skillsLanguages} icon="spark">
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
                      {(jobReview.skills || []).map((skill) => <span key={skill}>{skill}</span>)}
                    </div>
                  </div>
                  <div>
                    <h4>{copy.softSkills}</h4>
                    <div className="job-chip-row">
                      {(jobReview.softSkills?.length ? jobReview.softSkills : ["communication", "collaboration"]).map((skill) => <span key={skill}>{skill}</span>)}
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
  language
}) {
  const [feedback, setFeedback] = useState(null);
  const [feedbackSaving, setFeedbackSaving] = useState(false);
  const [networkingState, setNetworkingState] = useState("idle");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [shareStatus, setShareStatus] = useState("idle");

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
    window.print();
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
        </article>

        <article className="card match-results-card">
          <h3>
            <UiIcon name="spark" /> {copy.matchResultsTitle}
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
            <UiIcon name="spark" /> {copy.matchRecommendations}
          </h3>
          <div className="match-feedback no-print">
            {feedback ? (
              <span className="match-feedback-thanks">{copy.matchFeedbackThanks}</span>
            ) : (
              <>
                <span>{copy.matchFeedbackQuestion}</span>
                <button type="button" className="match-feedback-btn" disabled={feedbackSaving} onClick={() => handleFeedback(true)}>
                  👍 {copy.matchFeedbackYes}
                </button>
                <button type="button" className="match-feedback-btn" disabled={feedbackSaving} onClick={() => handleFeedback(false)}>
                  👎 {copy.matchFeedbackNo}
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

      {previewOpen ? <CvPreviewCard cvReview={cvReview} copy={copy} onClose={() => setPreviewOpen(false)} /> : null}

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

function CvPreviewCard({ cvReview, copy, onClose }) {
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

  const fullName = [cvReview.firstName, cvReview.lastName].filter(Boolean).join(" ");
  const contactItems = [cvReview.email, cvReview.phone, cvReview.location].filter(Boolean);

  return (
    <article className="card block cv-preview-card">
      <div className="cv-preview-toolbar no-print">
        <h3>
          <UiIcon name="profile" /> {copy.matchCvPreviewTitle}
        </h3>
        <button type="button" className="cv-preview-close" onClick={onClose}>
          {copy.matchHidePreview}
        </button>
      </div>

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
                {experience.description ? <p className="cv-document-entry-desc">{experience.description}</p> : null}
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
                {item.description ? <p className="cv-document-entry-desc">{item.description}</p> : null}
              </div>
            ))}
          </section>
        ) : null}

        {(cvReview.skills || []).length || (cvReview.softSkills || []).length ? (
          <section className="cv-document-section cv-document-skills-grid">
            {(cvReview.skills || []).length ? (
              <div>
                <h4>{copy.cvPreviewTechnicalSkills}</h4>
                <ul className="cv-document-list">
                  {cvReview.skills.map((skill) => (
                    <li key={skill}>{skill}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            {(cvReview.softSkills || []).length ? (
              <div>
                <h4>{copy.cvPreviewSoftSkills}</h4>
                <ul className="cv-document-list">
                  {cvReview.softSkills.map((skill) => (
                    <li key={skill}>{skill}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </section>
        ) : null}

        {(cvReview.languages || []).length || (cvReview.certifications || []).length || (cvReview.interests || []).length ? (
          <section className="cv-document-section cv-document-footer-grid">
            {(cvReview.languages || []).length ? (
              <div>
                <h4>{copy.cvPreviewLanguages}</h4>
                <ul className="cv-document-list">
                  {cvReview.languages.map((language) => (
                    <li key={language}>{language}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            {(cvReview.certifications || []).length ? (
              <div>
                <h4>{copy.cvPreviewCertifications}</h4>
                <ul className="cv-document-list">
                  {cvReview.certifications.map((item, index) => (
                    <li key={`${item.name}-${index}`}>{[item.name, item.issuer].filter(Boolean).join(" · ")}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            {(cvReview.interests || []).length ? (
              <div>
                <h4>{copy.cvPreviewInterests}</h4>
                <ul className="cv-document-list">
                  {cvReview.interests.map((interest) => (
                    <li key={interest}>{interest}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </section>
        ) : null}
      </div>
    </article>
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

  function submitProfile(event) {
    event.preventDefault();
    onSaveProfile({
      ...profileForm,
      experienceYears: Number(profileForm.experienceYears || 0),
      skills: profileForm.skills,
      languages: profileForm.languages
    });
  }

  function submitAccount(event) {
    event.preventDefault();
    onSaveAccount(buildAccountPatch(accountForm));
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

          <button className="btn-main" type="submit">
            {copy.saveProfile}
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

          <button className="btn-main" type="submit">
            {copy.saveAccount}
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

function PricingPage({ user, premium, language, currency, stripeEnabled, onActivatePlan, onStripeCheckout, onRedeemCode }) {
  const copy = APP_COPY[language]?.pricing || APP_COPY.fr.pricing;
  const allowedSegments = allowedPricingSegmentsForRole(user?.roleType);
  const visibleSegments = PRICING_SEGMENTS.filter((item) => allowedSegments.includes(item.id));
  const [segment, setSegment] = useState(allowedSegments[0]);
  const [billingCycle, setBillingCycle] = useState("monthly");
  const [licenseCode, setLicenseCode] = useState("");

  useEffect(() => {
    if (!allowedSegments.includes(segment)) {
      setSegment(allowedSegments[0]);
    }
  }, [allowedSegments, segment]);

  const subscription = user?.subscription || {};
  const currentBalance = Number(subscription.credits || 0);
  const segmentPlans = PLANS.filter((plan) => plan.segment === segment);
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
              <button
                type="button"
                className={`btn-main ${plan.highlighted ? "ready" : ""}`}
                disabled={isCurrentPlan}
                onClick={() =>
                  stripeEnabled && plan.grantsPremium
                    ? onStripeCheckout(plan.id, billingCycle)
                    : onActivatePlan(plan.id, billingCycle)
                }
              >
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
            disabled={!licenseCode.trim()}
            onClick={() => {
              onRedeemCode(licenseCode);
              setLicenseCode("");
            }}
          >
            {copy.licenseCodeSubmit}
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
            <UiIcon name="spark" /> Trajectoire Pro
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

const LETTER_TONE_ICONS = { formal: "briefcase", enthusiastic: "spark", direct: "chevron" };

function CoverLetterPage({ language, candidate, offer, tokensBalance, onGoToTarifs, onConsumeToken }) {
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

  const hasContext = Boolean(candidate && offer && (offer.title || offer.skills?.length));
  const outOfTokens = tokensBalance < 999 && tokensBalance <= 0;

  const tones = [
    { id: "formal", label: copy.toneFormal },
    { id: "enthusiastic", label: copy.toneEnthusiastic },
    { id: "direct", label: copy.toneDirect }
  ];

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
    } catch (err) {
      setError(err.message || "Erreur de génération.");
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

  function saveEditing() {
    setLetter(draftLetter);
    setIsEditing(false);
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

  return (
    <section className="cover-letter-page">
      <header className="module-header">
        <h2>{copy.title}</h2>
        <p>{copy.subtitle}</p>
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
  );
}

function SalaryNegotiationPage({ language, currency = "EUR", candidate, offer, tokensBalance, onGoToTarifs, onConsumeToken }) {
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
      setMessages([{ type: "ai", text: result.reply }, { type: "feedback", text: `${copy.tip}: ${result.tip}` }]);
      await onConsumeToken();
      setStarted(true);
    } catch (err) {
      setError(err.message || "Erreur de démarrage.");
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
        currencyLabel: currencyOption.label
      });
      setMessages([...withUser, { type: "ai", text: result.reply }, { type: "feedback", text: `${copy.tip}: ${result.tip}` }]);
    } catch (err) {
      setError(err.message || "Erreur de réponse.");
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
    } catch (err) {
      setError(err.message || "Erreur de bilan.");
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

  if (!started) {
    return (
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
    );
  }

  if (summary) {
    return (
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
    );
  }

  return (
    <section className="negotiation-page">
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
        <div>
          <h2>{language === "en" ? "CV history" : "Historique CV"}</h2>
          <p className="muted">
            {language === "en"
              ? "All imported CVs are kept here with their extracted data."
              : "Tous les CV importés sont conservés ici avec leurs données extraites."}
          </p>
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
                  <UiIcon name="spark" />
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





