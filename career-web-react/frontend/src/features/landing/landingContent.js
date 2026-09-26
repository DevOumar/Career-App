// Contenu éditorial de la landing publique (FR/EN).
// Règle : chaque phrase décrit une fonctionnalité réellement implémentée.
// Aucun chiffre d'usage, logo client ou témoignage inventé. Les prix et le
// nombre de jetons offerts viennent de data/plans.js (+ surcharges admin).

export const LANDING_CONTENT = {
  fr: {
    nav: [
      { id: "lp-espaces", label: "Espaces" },
      { id: "lp-ia", label: "IA" },
      { id: "lp-securite", label: "Sécurité" },
      { id: "lp-tarifs", label: "Tarifs" },
      { id: "lp-faq", label: "FAQ" }
    ],
    login: "Se connecter",
    signup: "Créer un compte",
    menuOpen: "Ouvrir le menu",
    menuClose: "Fermer le menu",
    homeLabel: "Career CV, retour en haut de page",
    hero: {
      eyebrow: "Plateforme carrière & recrutement propulsée par l'IA",
      titleA: "Du CV à l'embauche,",
      titleB: "une seule plateforme.",
      text:
        "Career CV réunit candidats, écoles et cabinets de recrutement autour des mêmes outils d'IA : analyse de CV, matching avec les offres, préparation aux entretiens et pilotage des recrutements.",
      primary: "Créer un compte gratuit",
      secondary: "Découvrir la plateforme",
      freeNote: (credits) => `${credits} jetons offerts à l'inscription · sans carte bancaire`,
      audiences: ["Candidats & étudiants", "Écoles", "Cabinets de recrutement"],
      mockLabel: "Aperçu illustratif de l'interface",
      mockTitle: "Analyse CV ↔ offre",
      mockExample: "Exemple",
      mockRole: "Data Analyst · Alternance",
      mockScoreLabel: "Score de compatibilité",
      mockSkills: "Compétences détectées",
      mockMissing: "Mots-clés manquants",
      mockNext: "Prochaine étape",
      mockNextValue: "Simuler l'entretien RH",
      mockPipeline: ["À postuler", "Postulé", "Entretien", "Offre"],
      mockChips: ["Python", "SQL", "Power BI"],
      mockMissingChips: ["dbt", "A/B testing"]
    },
    facts: [
      { icon: "users", value: "3", label: "espaces dédiés : candidat, école, cabinet" },
      { icon: "doc", value: "PDF · DOCX", label: "import de CV avec extraction par IA" },
      { icon: "mic", value: "Chat & voix", label: "simulateur d'entretien avec bilan détaillé" },
      { icon: "shield", value: "TOTP · Passkeys", label: "double authentification et clés de sécurité" }
    ],
    spaces: {
      eyebrow: "Trois espaces, une même plateforme",
      title: "Un espace conçu pour chaque acteur du recrutement",
      text:
        "Chaque profil dispose de son propre tableau de bord, de ses outils et de ses droits. Les données restent cloisonnées par espace.",
      items: [
        {
          id: "candidats",
          icon: "user",
          tag: "Candidats & étudiants",
          title: "Décrocher le bon poste, préparé",
          text:
            "De l'import du CV jusqu'à la négociation du salaire, chaque étape de la recherche d'emploi est accompagnée par l'IA.",
          features: [
            { icon: "doc", title: "Analyse et extraction de CV", text: "Import PDF ou DOCX : l'IA extrait identité, expériences, formations et compétences pour pré-remplir le profil." },
            { icon: "target", title: "Matching CV ↔ offre", text: "Score de compatibilité calculé à partir des exigences réelles de l'offre, avec les compétences manquantes." },
            { icon: "sparkle", title: "Optimisation ATS", text: "Repérage des mots-clés absents et suggestions de réécriture pour passer les filtres automatiques." },
            { icon: "pen", title: "Lettres de motivation IA", text: "Une lettre rédigée à partir du profil réel et de l'offre visée, modifiable avant export." },
            { icon: "mic", title: "Simulateur d'entretien", text: "Entretien en chat ou en appel vocal avec un recruteur IA, puis bilan détaillé en Markdown." },
            { icon: "scale", title: "Négociation salariale", text: "Entraînement face à un recruteur IA qui teste vos arguments, avec conseils concrets." },
            { icon: "kanban", title: "Suivi des candidatures", text: "Tableau de suivi par statut : à postuler, postulé, entretien, offre." },
            { icon: "mail", title: "Email Scout", text: "Recherche de l'email professionnel probable d'un recruteur, avec vérification du domaine." }
          ]
        },
        {
          id: "ecoles",
          icon: "school",
          tag: "Écoles & établissements",
          title: "Piloter l'employabilité des promotions",
          text:
            "Les écoles équipent leurs étudiants des outils Career CV et suivent leur progression promotion par promotion.",
          features: [
            { icon: "users", title: "Étudiants & promotions", text: "Organisation des étudiants par promotion, avec une vue détaillée de chaque profil." },
            { icon: "compare", title: "Comparaison de promotions", text: "Mise en regard des promotions pour repérer celles qui ont besoin d'un accompagnement." },
            { icon: "send", title: "Invitations & sièges de licence", text: "Invitations unitaires ou import CSV en masse, rattachées aux sièges de la licence." },
            { icon: "megaphone", title: "Annonces & événements", text: "Communication directe avec les étudiants : annonces et événements de l'école." },
            { icon: "gauge", title: "Suivi d'employabilité", text: "Niveaux de score et compétences manquantes les plus fréquentes, par étudiant et par promotion." },
            { icon: "printer", title: "Rapports imprimables", text: "Rapports d'employabilité prêts à imprimer ou à partager avec la direction." },
            { icon: "card", title: "Licence & facturation", text: "Gestion de la licence, des sièges, des tarifs et de l'historique de facturation." }
          ]
        },
        {
          id: "cabinets",
          icon: "building",
          tag: "Cabinets de recrutement",
          title: "Un outil de recrutement complet, de la mission à la facture",
          text:
            "Vivier partagé, missions, matching par IA, agenda, clients, facturation et RGPD : tout le quotidien d'un cabinet au même endroit.",
          features: [
            { icon: "users", title: "Vivier de candidats partagé", text: "Vivier commun à l'équipe, alimenté par import de CV analysé par l'IA." },
            { icon: "kanban", title: "Liste et pipeline", text: "Vue liste ou pipeline en glisser-déposer pour faire avancer chaque candidat." },
            { icon: "briefcase", title: "Missions & fiches de poste", text: "Missions avec fiche de poste complète, rattachées à vos clients." },
            { icon: "target", title: "Matching candidat ↔ mission", text: "Score de compatibilité et analyse IA détaillée à la demande pour chaque candidat." },
            { icon: "calendar", title: "Agenda d'entretiens", text: "Planification des entretiens et export au format .ics vers votre calendrier." },
            { icon: "mail", title: "Emails aux candidats", text: "Envoi d'emails aux candidats directement depuis leur fiche." },
            { icon: "building", title: "Fiches clients", text: "Suivi des entreprises clientes et de leurs missions." },
            { icon: "receipt", title: "Factures d'honoraires", text: "Numérotation séquentielle, mentions légales et export PDF." },
            { icon: "lock", title: "RGPD intégré", text: "Suivi du consentement, durée de conservation, anonymisation et export des données." },
            { icon: "history", title: "Journal d'activité", text: "Historique des actions de l'équipe pour savoir qui a fait quoi." },
            { icon: "globe", title: "Page recrutement publique", text: "Une page publique pour présenter le cabinet et ses offres." },
            { icon: "file", title: "Rapports de shortlist", text: "Rapports de shortlist à transmettre aux clients." }
          ]
        }
      ]
    },
    steps: {
      eyebrow: "Comment ça marche",
      title: "Opérationnel en quelques minutes",
      items: [
        { title: "Créez votre espace", text: "Inscription par email vérifié ou avec Google, puis choix du profil : candidat, école ou cabinet." },
        { title: "Importez vos données", text: "Un CV pour un candidat, une promotion ou un fichier CSV pour une école, des CV et des missions pour un cabinet." },
        { title: "Laissez l'IA analyser", text: "Extraction des profils, scores de compatibilité, compétences manquantes et recommandations concrètes." },
        { title: "Passez à l'action", text: "Candidatures, entretiens simulés, suivi des promotions, pipeline et facturation : tout se pilote au même endroit." }
      ]
    },
    ai: {
      eyebrow: "L'IA au cœur du produit",
      title: "Une IA qui propose, des humains qui décident",
      text:
        "Chaque résultat est une recommandation argumentée, jamais une décision automatique. Les analyses s'appuient sur le contenu réel du CV et de l'offre, pas sur un score générique.",
      items: [
        { icon: "doc", title: "Extraction de CV", text: "PDF et DOCX transformés en profil structuré." },
        { icon: "target", title: "Scores de matching", text: "CV ↔ offre et candidat ↔ mission, avec les écarts identifiés." },
        { icon: "sparkle", title: "Optimisation ATS", text: "Mots-clés manquants et réécritures ciblées." },
        { icon: "pen", title: "Rédaction assistée", text: "Lettres de motivation adaptées à chaque offre." },
        { icon: "mic", title: "Entretiens en voix", text: "Simulation en chat ou vocale et bilan structuré." },
        { icon: "scale", title: "Négociation", text: "Jeu de rôle réaliste face à un recruteur IA." }
      ],
      note: "Les coûts d'IA sont suivis en continu depuis le back-office (monitoring IA, coût par utilisateur actif)."
    },
    security: {
      eyebrow: "Sécurité & conformité",
      title: "Des comptes protégés, des données maîtrisées",
      text: "La sécurité des comptes et la conformité RGPD sont intégrées au produit.",
      accountTitle: "Sécurité des comptes",
      account: [
        "Email et mot de passe avec vérification de l'adresse email",
        "Connexion avec Google",
        "Double authentification par application (TOTP)",
        "Clés de sécurité et passkeys (WebAuthn)",
        "Codes de récupération à usage unique",
        "Confirmation renforcée avant les actions sensibles",
        "Gestion des appareils connectés"
      ],
      gdprTitle: "RGPD côté cabinet",
      gdpr: [
        "Suivi du consentement des candidats",
        "Durée de conservation paramétrable",
        "Anonymisation des profils",
        "Export des données sur demande",
        "Journal d'activité de l'équipe"
      ],
      legalLinks: { privacy: "Politique de confidentialité", security: "Page sécurité", terms: "CGU" }
    },
    platform: {
      eyebrow: "Back-office de la plateforme",
      title: "Une plateforme pilotée par la donnée",
      text: "L'équipe Career CV dispose d'un back-office complet pour suivre l'activité, les revenus et la qualité de l'IA.",
      items: [
        { icon: "chart", title: "Métriques investisseurs", text: "MRR / ARR, cohortes de rétention, taux de placement." },
        { icon: "gauge", title: "Monitoring IA", text: "Suivi des appels IA et du coût par utilisateur actif." },
        { icon: "receipt", title: "Finance", text: "Transactions, remboursements et tarifs ajustables par plan." },
        { icon: "megaphone", title: "Annonces & licences", text: "Communication plateforme et gestion des licences écoles et cabinets." }
      ]
    },
    pricing: {
      eyebrow: "Tarifs",
      title: "Des offres adaptées à chaque espace",
      text: "Tarifs en vigueur, identiques à ceux appliqués au paiement.",
      tabs: { candidate: "Candidats", school: "Écoles", agency: "Cabinets" },
      monthly: "Mensuel",
      annual: "Annuel",
      free: "Gratuit",
      perMonth: "/ mois",
      perYear: "/ an",
      tokens: (n) => (n >= 999 ? "Jetons illimités" : `${n} jetons inclus`),
      seats: (n) => `${n} sièges inclus`,
      cta: "Commencer",
      ctaContact: "Nous contacter",
      more: "Voir le détail des tarifs",
      tabsLabel: "Choisir un espace"
    },
    faq: {
      eyebrow: "Questions fréquentes",
      title: "Des réponses claires",
      items: [
        { q: "À qui s'adresse Career CV ?", a: "Aux candidats et étudiants qui cherchent un emploi, aux écoles qui accompagnent leurs promotions vers l'insertion professionnelle, et aux cabinets de recrutement qui gèrent missions, candidats et clients. Chaque profil dispose de son propre espace." },
        { q: "Puis-je importer un CV existant ?", a: "Oui. Importez votre CV au format PDF ou DOCX : l'IA en extrait automatiquement identité, expériences, formations et compétences. Vous gardez la main pour tout corriger avant d'enregistrer." },
        { q: "Comment fonctionne le score de compatibilité ?", a: "Vos compétences, votre expérience et votre formation sont comparées aux exigences extraites de l'offre que vous collez. Vous obtenez un score et la liste des compétences manquantes, jamais un chiffre générique." },
        { q: "Comment fonctionnent les jetons ?", a: "Les actions IA consomment des jetons. Le plan Essentiel est gratuit et inclut des jetons de départ ; les packs Élan et Trajectoire Pro en ajoutent. Les licences écoles et cabinets donnent un accès sans limite de jetons." },
        { q: "Comment une école équipe-t-elle ses étudiants ?", a: "L'école souscrit une licence au nombre d'étudiants, puis les invite un par un ou en masse par fichier CSV. Chaque invitation occupe un siège de la licence et débloque les outils pour l'étudiant." },
        { q: "Comment le cabinet gère-t-il le RGPD ?", a: "L'espace cabinet suit le consentement de chaque candidat, applique une durée de conservation, permet d'anonymiser un profil et d'exporter ses données sur demande." },
        { q: "Comment mon compte est-il protégé ?", a: "Adresse email vérifiée, double authentification par application (TOTP), clés de sécurité et passkeys, codes de récupération, confirmation renforcée avant les actions sensibles et gestion des appareils connectés." },
        { q: "L'IA prend-elle des décisions à ma place ?", a: "Non. Les scores et analyses sont des recommandations à relire. Le choix d'un candidat, d'une candidature ou d'une réponse reste toujours humain." }
      ]
    },
    finalCta: {
      title: "Prêt à essayer Career CV ?",
      text: "Créez un compte gratuitement et lancez votre première analyse de CV en quelques minutes.",
      primary: "Créer un compte gratuit",
      secondary: "Se connecter"
    },
    footer: {
      text: "La plateforme carrière et recrutement propulsée par l'IA, pour les candidats, les écoles et les cabinets.",
      product: "Produit",
      spaces: "Espaces",
      company: "Entreprise",
      legal: "Légal",
      productLinks: [
        { id: "lp-ia", label: "Fonctionnalités IA" },
        { id: "lp-etapes", label: "Comment ça marche" },
        { id: "lp-securite", label: "Sécurité" },
        { id: "lp-faq", label: "FAQ" }
      ],
      spaceLinks: [
        { id: "lp-candidats", label: "Candidats" },
        { id: "lp-ecoles", label: "Écoles" },
        { id: "lp-cabinets", label: "Cabinets" }
      ],
      pricing: "Tarifs",
      about: "À propos",
      contact: "Contact",
      privacy: "Confidentialité",
      terms: "CGU",
      cookies: "Cookies",
      securityPage: "Sécurité",
      rights: "Tous droits réservés."
    }
  },
  en: {
    nav: [
      { id: "lp-espaces", label: "Spaces" },
      { id: "lp-ia", label: "AI" },
      { id: "lp-securite", label: "Security" },
      { id: "lp-tarifs", label: "Pricing" },
      { id: "lp-faq", label: "FAQ" }
    ],
    login: "Log in",
    signup: "Create account",
    menuOpen: "Open menu",
    menuClose: "Close menu",
    homeLabel: "Career CV, back to top",
    hero: {
      eyebrow: "AI-powered career & recruitment platform",
      titleA: "From CV to hire,",
      titleB: "one single platform.",
      text:
        "Career CV brings candidates, schools and recruitment firms together around the same AI tools: CV analysis, job matching, interview preparation and hiring management.",
      primary: "Create a free account",
      secondary: "Explore the platform",
      freeNote: (credits) => `${credits} free tokens on sign-up · no credit card`,
      audiences: ["Candidates & students", "Schools", "Recruitment firms"],
      mockLabel: "Illustrative preview of the interface",
      mockTitle: "CV ↔ job analysis",
      mockExample: "Example",
      mockRole: "Data Analyst · Work-study",
      mockScoreLabel: "Compatibility score",
      mockSkills: "Detected skills",
      mockMissing: "Missing keywords",
      mockNext: "Next step",
      mockNextValue: "Simulate the HR interview",
      mockPipeline: ["To apply", "Applied", "Interview", "Offer"],
      mockChips: ["Python", "SQL", "Power BI"],
      mockMissingChips: ["dbt", "A/B testing"]
    },
    facts: [
      { icon: "users", value: "3", label: "dedicated spaces: candidate, school, firm" },
      { icon: "doc", value: "PDF · DOCX", label: "CV import with AI extraction" },
      { icon: "mic", value: "Chat & voice", label: "interview simulator with detailed debrief" },
      { icon: "shield", value: "TOTP · Passkeys", label: "two-factor authentication and security keys" }
    ],
    spaces: {
      eyebrow: "Three spaces, one platform",
      title: "A space designed for every hiring stakeholder",
      text: "Each profile has its own dashboard, tools and permissions. Data stays separated per space.",
      items: [
        {
          id: "candidats",
          icon: "user",
          tag: "Candidates & students",
          title: "Land the right job, prepared",
          text: "From CV import to salary negotiation, every step of the job search is assisted by AI.",
          features: [
            { icon: "doc", title: "CV analysis & extraction", text: "PDF or DOCX import: the AI extracts identity, experience, education and skills to pre-fill the profile." },
            { icon: "target", title: "CV ↔ job matching", text: "Compatibility score computed from the job's real requirements, with missing skills." },
            { icon: "sparkle", title: "ATS optimization", text: "Missing keywords spotted and rewrite suggestions to pass automated filters." },
            { icon: "pen", title: "AI cover letters", text: "A letter written from your real profile and the target job, editable before export." },
            { icon: "mic", title: "Interview simulator", text: "Chat or voice interview with an AI recruiter, followed by a detailed Markdown debrief." },
            { icon: "scale", title: "Salary negotiation", text: "Practice against an AI recruiter who tests your arguments, with concrete coaching." },
            { icon: "kanban", title: "Application tracker", text: "Board by status: to apply, applied, interview, offer." },
            { icon: "mail", title: "Email Scout", text: "Find a recruiter's likely professional email, with domain verification." }
          ]
        },
        {
          id: "ecoles",
          icon: "school",
          tag: "Schools & institutions",
          title: "Manage the employability of every cohort",
          text: "Schools equip their students with Career CV tools and track progress cohort by cohort.",
          features: [
            { icon: "users", title: "Students & cohorts", text: "Students organized by cohort, with a detailed view of each profile." },
            { icon: "compare", title: "Cohort comparison", text: "Compare cohorts side by side to spot those needing support." },
            { icon: "send", title: "Invitations & license seats", text: "Single invitations or bulk CSV import, tied to license seats." },
            { icon: "megaphone", title: "Announcements & events", text: "Talk directly to students: school announcements and events." },
            { icon: "gauge", title: "Employability tracking", text: "Score levels and most frequent missing skills, per student and per cohort." },
            { icon: "printer", title: "Printable reports", text: "Employability reports ready to print or share with management." },
            { icon: "card", title: "License & billing", text: "Manage the license, seats, pricing and billing history." }
          ]
        },
        {
          id: "cabinets",
          icon: "building",
          tag: "Recruitment firms",
          title: "A complete recruiting tool, from mission to invoice",
          text: "Shared talent pool, missions, AI matching, calendar, clients, invoicing and GDPR: a firm's daily work in one place.",
          features: [
            { icon: "users", title: "Shared candidate pool", text: "A pool shared by the team, fed by AI-analyzed CV import." },
            { icon: "kanban", title: "List & pipeline", text: "List view or drag-and-drop pipeline to move each candidate forward." },
            { icon: "briefcase", title: "Missions & job sheets", text: "Missions with a full job sheet, linked to your clients." },
            { icon: "target", title: "Candidate ↔ mission matching", text: "Compatibility score and detailed on-demand AI analysis for each candidate." },
            { icon: "calendar", title: "Interview calendar", text: "Schedule interviews and export them as .ics to your calendar." },
            { icon: "mail", title: "Emails to candidates", text: "Send emails to candidates right from their record." },
            { icon: "building", title: "Client records", text: "Track client companies and their missions." },
            { icon: "receipt", title: "Fee invoices", text: "Sequential numbering, legal mentions and PDF export." },
            { icon: "lock", title: "Built-in GDPR", text: "Consent tracking, retention period, anonymization and data export." },
            { icon: "history", title: "Activity log", text: "History of team actions to know who did what." },
            { icon: "globe", title: "Public recruiting page", text: "A public page to showcase the firm and its openings." },
            { icon: "file", title: "Shortlist reports", text: "Shortlist reports to send to clients." }
          ]
        }
      ]
    },
    steps: {
      eyebrow: "How it works",
      title: "Up and running in minutes",
      items: [
        { title: "Create your space", text: "Sign up with a verified email or Google, then pick a profile: candidate, school or firm." },
        { title: "Import your data", text: "A CV for a candidate, a cohort or CSV file for a school, CVs and missions for a firm." },
        { title: "Let the AI analyze", text: "Profile extraction, compatibility scores, missing skills and concrete recommendations." },
        { title: "Take action", text: "Applications, mock interviews, cohort tracking, pipeline and invoicing: all managed in one place." }
      ]
    },
    ai: {
      eyebrow: "AI at the core",
      title: "AI that suggests, humans who decide",
      text: "Every result is a reasoned recommendation, never an automatic decision. Analyses rely on the actual CV and job content, not a generic score.",
      items: [
        { icon: "doc", title: "CV extraction", text: "PDF and DOCX turned into a structured profile." },
        { icon: "target", title: "Matching scores", text: "CV ↔ job and candidate ↔ mission, with gaps identified." },
        { icon: "sparkle", title: "ATS optimization", text: "Missing keywords and targeted rewrites." },
        { icon: "pen", title: "Assisted writing", text: "Cover letters tailored to each job." },
        { icon: "mic", title: "Voice interviews", text: "Chat or voice simulation with a structured debrief." },
        { icon: "scale", title: "Negotiation", text: "Realistic role-play against an AI recruiter." }
      ],
      note: "AI costs are tracked continuously from the back office (AI monitoring, cost per active user)."
    },
    security: {
      eyebrow: "Security & compliance",
      title: "Protected accounts, controlled data",
      text: "Account security and GDPR compliance are built into the product.",
      accountTitle: "Account security",
      account: [
        "Email and password with email address verification",
        "Sign in with Google",
        "App-based two-factor authentication (TOTP)",
        "Security keys and passkeys (WebAuthn)",
        "Single-use recovery codes",
        "Step-up confirmation before sensitive actions",
        "Connected device management"
      ],
      gdprTitle: "GDPR for firms",
      gdpr: [
        "Candidate consent tracking",
        "Configurable retention period",
        "Profile anonymization",
        "Data export on request",
        "Team activity log"
      ],
      legalLinks: { privacy: "Privacy policy", security: "Security page", terms: "Terms" }
    },
    platform: {
      eyebrow: "Platform back office",
      title: "A data-driven platform",
      text: "The Career CV team runs a full back office to track activity, revenue and AI quality.",
      items: [
        { icon: "chart", title: "Investor metrics", text: "MRR / ARR, retention cohorts, placement rate." },
        { icon: "gauge", title: "AI monitoring", text: "AI calls and cost per active user." },
        { icon: "receipt", title: "Finance", text: "Transactions, refunds and adjustable plan prices." },
        { icon: "megaphone", title: "Announcements & licenses", text: "Platform messaging and school/firm license management." }
      ]
    },
    pricing: {
      eyebrow: "Pricing",
      title: "Plans for every space",
      text: "Current prices, identical to those charged at checkout.",
      tabs: { candidate: "Candidates", school: "Schools", agency: "Firms" },
      monthly: "Monthly",
      annual: "Annual",
      free: "Free",
      perMonth: "/ month",
      perYear: "/ year",
      tokens: (n) => (n >= 999 ? "Unlimited tokens" : `${n} tokens included`),
      seats: (n) => `${n} seats included`,
      cta: "Get started",
      ctaContact: "Contact us",
      more: "See full pricing details",
      tabsLabel: "Choose a space"
    },
    faq: {
      eyebrow: "FAQ",
      title: "Clear answers",
      items: [
        { q: "Who is Career CV for?", a: "Candidates and students looking for a job, schools supporting their cohorts into employment, and recruitment firms managing missions, candidates and clients. Each profile has its own space." },
        { q: "Can I import an existing CV?", a: "Yes. Upload your CV as PDF or DOCX: the AI automatically extracts identity, experience, education and skills. You can correct anything before saving." },
        { q: "How does the compatibility score work?", a: "Your skills, experience and education are compared with the requirements extracted from the job you paste. You get a score and the list of missing skills, never a generic number." },
        { q: "How do tokens work?", a: "AI actions consume tokens. The Essential plan is free and includes starter tokens; the Momentum and Pro Track packs add more. School and firm licenses give access without token limits." },
        { q: "How does a school equip its students?", a: "The school buys a license based on student count, then invites students one by one or in bulk via CSV. Each invitation uses a license seat and unlocks the tools for the student." },
        { q: "How do firms handle GDPR?", a: "The firm space tracks each candidate's consent, applies a retention period, lets you anonymize a profile and export its data on request." },
        { q: "How is my account protected?", a: "Verified email, app-based two-factor authentication (TOTP), security keys and passkeys, recovery codes, step-up confirmation before sensitive actions and connected device management." },
        { q: "Does the AI make decisions for me?", a: "No. Scores and analyses are recommendations to review. Choosing a candidate, an application or an answer always stays human." }
      ]
    },
    finalCta: {
      title: "Ready to try Career CV?",
      text: "Create a free account and run your first CV analysis in a few minutes.",
      primary: "Create a free account",
      secondary: "Log in"
    },
    footer: {
      text: "The AI-powered career and recruitment platform for candidates, schools and firms.",
      product: "Product",
      spaces: "Spaces",
      company: "Company",
      legal: "Legal",
      productLinks: [
        { id: "lp-ia", label: "AI features" },
        { id: "lp-etapes", label: "How it works" },
        { id: "lp-securite", label: "Security" },
        { id: "lp-faq", label: "FAQ" }
      ],
      spaceLinks: [
        { id: "lp-candidats", label: "Candidates" },
        { id: "lp-ecoles", label: "Schools" },
        { id: "lp-cabinets", label: "Firms" }
      ],
      pricing: "Pricing",
      about: "About",
      contact: "Contact",
      privacy: "Privacy",
      terms: "Terms",
      cookies: "Cookies",
      securityPage: "Security",
      rights: "All rights reserved."
    }
  }
};
