export const PLAN_SEGMENTS = ["candidate", "agency", "school"];

export const PLANS = [
  {
    id: "candidate_discovery",
    segment: "candidate",
    name: { fr: "Essentiel", en: "Essential" },
    tagline: {
      fr: "Pour tester la puissance de l'IA.",
      en: "To try the power of the AI."
    },
    monthlyPrice: 0,
    annualPrice: 0,
    credits: 5,
    seats: null,
    grantsPremium: false,
    highlighted: false,
    badge: null,
    features: {
      fr: [
        "Analyse CV & Offre (IA)",
        "Score de matching",
        "1 CV enregistré",
        "Lettre de motivation IA",
        "Simulateur de négociation salariale",
        "Email Scout (recherche d'email pro)"
      ],
      en: [
        "CV & Job analysis (AI)",
        "Matching score",
        "1 saved CV",
        "AI cover letter",
        "Salary negotiation simulator",
        "Email Scout (pro email finder)"
      ]
    }
  },
  {
    id: "candidate_booster",
    segment: "candidate",
    name: { fr: "Élan", en: "Momentum" },
    tagline: {
      fr: "Idéal pour décrocher vos premiers entretiens.",
      en: "Ideal to land your first interviews."
    },
    monthlyPrice: null,
    annualPrice: 4.99,
    annualPriceUnit: { fr: "/ unique", en: "/ one-time" },
    credits: 30,
    seats: null,
    grantsPremium: true,
    unlocksInterviews: true,
    highlighted: false,
    badge: null,
    features: {
      fr: ["30 jetons d'analyse (6x plus qu'Essentiel)", "Simulateur d'entretiens", "Historique CV illimité", "Export PDF", "Lettre de motivation IA", "Simulateur de négociation salariale", "Email Scout (recherche d'email pro)", "Support standard"],
      en: ["30 analysis tokens (6x more than Essentiel)", "Interview simulator", "Unlimited CV history", "PDF export", "AI cover letter", "Salary negotiation simulator", "Email Scout (pro email finder)", "Standard support"]
    }
  },
  {
    id: "candidate_coach",
    segment: "candidate",
    name: { fr: "Trajectoire Pro", en: "Pro Track" },
    tagline: {
      fr: "Pour une recherche active et intensive.",
      en: "For an active, intensive job search."
    },
    monthlyPrice: null,
    annualPrice: 14.99,
    annualPriceUnit: { fr: "/ unique", en: "/ one-time" },
    credits: 130,
    seats: null,
    grantsPremium: true,
    // Élan et Trajectoire Pro débloquent tous les deux le simulateur
    // d'entretiens (consommé en jetons dans les deux cas, aucun des deux
    // n'est réellement "illimité") — seul Essentiel (gratuit) en est exclu.
    unlocksInterviews: true,
    highlighted: true,
    badge: { fr: "Recommandé", en: "Recommended" },
    // Tout est décompté en jetons (130 ici, contre 30 pour Élan) : on évite
    // "illimité" qui serait trompeur pour un pack fini, et on met en avant
    // le volume + les vrais avantages exclusifs (réseautage, support).
    features: {
      fr: [
        "130 jetons d'analyse (4x plus qu'Élan)",
        "Simulateur d'entretiens",
        "Lettre de motivation IA",
        "Simulateur de négociation salariale",
        "Email Scout (recherche d'email pro)",
        "Suggestions de réseautage avancées",
        "Support prioritaire"
      ],
      en: [
        "130 analysis tokens (4x more than Élan)",
        "Interview simulator",
        "AI cover letter",
        "Salary negotiation simulator",
        "Email Scout (pro email finder)",
        "Advanced networking suggestions",
        "Priority support"
      ]
    }
  },
  {
    id: "agency_starter",
    segment: "agency",
    name: { fr: "Cabinet Essentiel", en: "Firm Essential" },
    tagline: {
      fr: "Pour les petits cabinets et boutiques conseil.",
      en: "For small firms and boutique consultancies."
    },
    monthlyPrice: 49,
    annualPrice: 470,
    credits: 999,
    seats: 3,
    grantsPremium: true,
    // Jetons illimités (999) : tous les modules IA doivent être disponibles,
    // Entretiens y compris, sans restriction supplémentaire.
    unlocksInterviews: true,
    highlighted: false,
    badge: null,
    features: {
      fr: ["3 sièges recruteurs", "Analyses candidats illimitées", "Code de licence à distribuer"],
      en: ["3 recruiter seats", "Unlimited candidate analyses", "License code to distribute"]
    }
  },
  {
    id: "agency_growth",
    segment: "agency",
    name: { fr: "Cabinet Croissance", en: "Firm Growth" },
    tagline: {
      fr: "Pour les cabinets et boîtes de conseil en croissance.",
      en: "For growing recruitment and consulting firms."
    },
    monthlyPrice: 149,
    annualPrice: 1430,
    credits: 999,
    seats: 10,
    grantsPremium: true,
    unlocksInterviews: true,
    highlighted: true,
    badge: { fr: "Recommandé", en: "Recommended" },
    features: {
      fr: ["10 sièges recruteurs", "Export de rapports", "Support prioritaire", "Code de licence à distribuer"],
      en: ["10 recruiter seats", "Report exports", "Priority support", "License code to distribute"]
    }
  },
  {
    id: "school_institut",
    segment: "school",
    name: { fr: "Institut", en: "Institute" },
    tagline: {
      fr: "Pour les instituts et petites écoles.",
      en: "For institutes and small schools."
    },
    monthlyPrice: null,
    annualPrice: 4.9,
    annualPriceUnit: { fr: "/ étudiant / an (30 à 199 étudiants)", en: "/ student / year (30 to 199 students)" },
    credits: 999,
    seats: 30,
    // Borne haute du palier : au-delà, l'établissement doit passer au
    // palier Campus (voir PricingPage.jsx, qui bloque/redirige plutôt que
    // de vendre un volume hors palier au mauvais prix).
    seatsMax: 199,
    grantsPremium: true,
    // Marque les plans école tarifés "par étudiant" (quantité = nombre de
    // sièges, pas 1) — remplace l'ancien test en dur sur l'id "school_license"
    // maintenant qu'il y a 3 plans école distincts.
    pricedPerSeat: true,
    unlocksInterviews: true,
    highlighted: false,
    badge: null,
    features: {
      fr: [
        "Accès illimité aux modules IA pour chaque étudiant (analyse CV, lettre de motivation, négociation salariale, Email Scout)",
        "Simulateur d'entretiens illimité (chat et appel vocal) pour chaque étudiant",
        "Historique CV et candidatures, export CV en PDF pour chaque étudiant",
        "Codes de licence à distribuer",
        "Tableau de bord établissement",
        "Support standard (72h)"
      ],
      en: [
        "Unlimited AI modules for every student (CV analysis, cover letter, salary negotiation, Email Scout)",
        "Unlimited interview simulator (chat and voice call) for every student",
        "CV and application history, CV export to PDF for every student",
        "License codes to distribute",
        "Institution dashboard",
        "Standard support (72h)"
      ]
    }
  },
  {
    id: "school_campus",
    segment: "school",
    name: { fr: "Campus", en: "Campus" },
    tagline: {
      fr: "Pour les écoles et campus en croissance.",
      en: "For growing schools and campuses."
    },
    monthlyPrice: null,
    annualPrice: 3.2,
    annualPriceUnit: { fr: "/ étudiant / an (200 à 999 étudiants)", en: "/ student / year (200 to 999 students)" },
    credits: 999,
    seats: 200,
    seatsMax: 999,
    grantsPremium: true,
    pricedPerSeat: true,
    unlocksInterviews: true,
    highlighted: true,
    badge: { fr: "Recommandé", en: "Recommended" },
    features: {
      fr: [
        "Tout Institut, inclus (étudiants + établissement)",
        "Rapports d'employabilité (mensuel/hebdomadaire)",
        "Statistiques par promotion",
        "Support prioritaire (24h)"
      ],
      en: [
        "Everything in Institute (students + institution)",
        "Employability reports (monthly/weekly)",
        "Per-cohort statistics",
        "Priority support (24h)"
      ]
    }
  },
  {
    id: "school_grand_campus",
    segment: "school",
    name: { fr: "Grand campus", en: "Large campus" },
    tagline: {
      fr: "Pour les grands établissements, plusieurs milliers d'étudiants.",
      en: "For large institutions, several thousand students."
    },
    monthlyPrice: null,
    annualPrice: 1.9,
    annualPriceUnit: { fr: "/ étudiant / an (1 000+ étudiants)", en: "/ student / year (1,000+ students)" },
    credits: 999,
    seats: 1000,
    seatsMax: null,
    grantsPremium: true,
    pricedPerSeat: true,
    unlocksInterviews: true,
    // Contrat négocié plutôt qu'un paiement Stripe en self-service à ce
    // volume : le bouton "Activer" est remplacé par "Nous contacter" côté
    // PricingPage.jsx.
    contactSalesOnly: true,
    highlighted: false,
    badge: null,
    features: {
      fr: [
        "Tout Campus, inclus",
        "Contrat annuel négocié, facturation unique",
        "Export API des données employabilité",
        "Interlocuteur dédié"
      ],
      en: [
        "Everything in Campus",
        "Negotiated annual contract, single invoice",
        "Employability data API export",
        "Dedicated point of contact"
      ]
    }
  }
];

// Anciens ids de plan qui n'existent plus dans PLANS mais qui sont encore
// stockés tels quels sur des comptes déjà abonnés (subscription_json.planId,
// license_codes.plan_id, plan_overrides.plan_id) — sans cet alias, ces
// comptes perdraient silencieusement l'accès aux avantages liés au plan
// (ex: unlocksInterviews) dès qu'on renomme/scinde un plan. Ajouter une
// entrée ici à chaque renommage d'id, ne jamais en retirer une existante.
const LEGACY_PLAN_ID_ALIASES = {
  // school_license a été scindé en 3 paliers (Institut/Campus/Grand campus,
  // voir PLANS) : les licences déjà émises sous l'ancien id générique
  // continuent de pointer vers le palier d'entrée, jusqu'à ce que l'école
  // choisisse explicitement un palier au renouvellement.
  school_license: "school_institut"
};

export function getPlanById(planId) {
  const resolvedId = LEGACY_PLAN_ID_ALIASES[planId] || planId;
  return PLANS.find((plan) => plan.id === resolvedId) || null;
}
