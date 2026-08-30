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
    id: "school_license",
    segment: "school",
    name: { fr: "Licence Campus", en: "Campus License" },
    tagline: {
      fr: "Activez l'offre Trajectoire Pro pour vos étudiants.",
      en: "Activates the Pro Track plan for your students."
    },
    monthlyPrice: null,
    annualPrice: 3,
    annualPriceUnit: { fr: "/ étudiant / an (min. 30)", en: "/ student / year (min. 30)" },
    credits: 999,
    seats: 30,
    grantsPremium: true,
    // Active explicitement le plan Trajectoire Pro pour chaque étudiant
    // (voir tagline) : mêmes avantages, dont le simulateur d'entretiens.
    unlocksInterviews: true,
    highlighted: false,
    badge: null,
    features: {
      fr: ["30 sièges étudiants minimum", "Plan Trajectoire Pro pour chaque étudiant", "Code de licence à distribuer"],
      en: ["Minimum 30 student seats", "Pro Track plan for every student", "License code to distribute"]
    }
  }
];

export function getPlanById(planId) {
  return PLANS.find((plan) => plan.id === planId) || null;
}
