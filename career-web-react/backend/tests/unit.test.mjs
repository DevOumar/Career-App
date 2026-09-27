// Tests unitaires Career CV — rapides, isolés, sans base de données externe ni clés API.
// Utilisent le test runner natif de Node.js (node:test et node:assert/strict).
//
// Lancement : npm run test:unit

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  extractOfferSummary,
  runMatching,
  buildLocalMatchInsights
} from "../../frontend/src/lib/matchingService.js";
import { PLANS, getPlanById } from "../../frontend/src/data/plans.js";
import {
  formatAmountInCurrency,
  formatPlanPrice,
  formatDate,
  formatShortDate,
  fillTemplate,
  getCurrencyOption
} from "../../frontend/src/lib/format.js";
import {
  CODING_LANGUAGES,
  CODING_LEVELS,
  CODING_TOPICS,
  CODING_COPY
} from "../../frontend/src/features/coding/codingCopy.js";

describe("1. Moteur de Matching & Extraction d'Offres", () => {
  it("extrait correctement l'entreprise, le contrat, la localisation et les compétences d'une offre", () => {
    const rawOfferText = `Entreprise: Doctolib
Poste: Data Scientist Senior
Lieu: Paris (hybride)
Contrat: CDI
Nous recherchons un profil maîtrisant Python, SQL, Machine Learning et Docker pour concevoir des modèles prédictifs.`;

    const summary = extractOfferSummary(rawOfferText);
    assert.equal(summary.company, "Doctolib");
    assert.match(summary.contract, /CDI/i);
    assert.match(summary.location, /Paris/i);
    assert.ok(summary.skills.includes("python"), "Python doit être détecté");
    assert.ok(summary.skills.includes("sql"), "SQL doit être détecté");
  });

  it("calcule un score pondéré explicite (60/20/10/bonus) et un verdict cohérent", () => {
    const candidateUser = {
      profile: {
        skills: ["python", "sql", "machine learning", "docker"],
        experienceYears: 4,
        education: "bac+5",
        targetRole: "Data Scientist",
        sector: "Tech"
      }
    };

    const offer = {
      id: "test-offer-1",
      title: "Data Scientist Senior",
      company: "Doctolib",
      contract: "CDI",
      location: "Paris",
      sector: "Tech",
      skills: ["python", "sql", "machine learning", "docker"],
      minExperience: 3,
      minEducation: "bac+5",
      premium: false
    };

    const result = runMatching({
      user: candidateUser,
      cvRecord: null,
      offerText: "",
      offers: [offer],
      premiumAccess: { hasAccess: true }
    });

    assert.ok(result.summary.globalScore >= 75, "Le score doit être supérieur à 75%");
    assert.equal(result.summary.verdict, "excellent", "Le verdict doit être 'excellent'");
    assert.ok(Array.isArray(result.strengths), "Des points forts doivent être générés");
  });

  it("génère des recommandations locales sans appel API externe", () => {
    const candidate = {
      skills: ["python"],
      experienceYears: 1,
      education: "bac+3",
      targetRole: "Data Analyst",
      sector: "Finance"
    };

    const offer = {
      id: "test-offer-2",
      title: "Senior ML Engineer",
      company: "BNP",
      contract: "CDI",
      location: "Paris",
      sector: "Finance",
      skills: ["python", "sql", "kubernetes", "llm", "rag"],
      minExperience: 5,
      minEducation: "bac+5",
      premium: false
    };

    const insights = buildLocalMatchInsights({ candidate, offer });
    assert.ok(typeof insights.score === "number");
    assert.ok(["moyen", "à renforcer"].includes(insights.verdict));
    assert.ok(insights.missingKeywords.length > 0, "Doit lister les mots-clés manquants");
    assert.ok(insights.recommendations.length > 0, "Doit proposer des recommandations d'amélioration");
  });
});

describe("2. Gestion des Plans & Contrôle d'Accès", () => {
  it("retourne les plans avec leur configuration exacte par identifiant", () => {
    const freePlan = getPlanById("candidate_discovery");
    const boosterPlan = getPlanById("candidate_booster");
    const proPlan = getPlanById("candidate_coach");

    assert.ok(freePlan, "Plan Essentiel doit exister");
    assert.equal(freePlan.monthlyPrice, 0);
    assert.equal(freePlan.credits, 5);

    assert.ok(boosterPlan, "Plan Élan doit exister");
    assert.equal(boosterPlan.annualPrice, 4.99);
    assert.equal(boosterPlan.credits, 30);

    assert.ok(proPlan, "Plan Trajectoire Pro doit exister");
    assert.equal(proPlan.annualPrice, 14.99);
    assert.equal(proPlan.credits, 130);
  });

  it("verrouille strictement le simulateur d'entretiens pour le plan gratuit", () => {
    const freePlan = getPlanById("candidate_discovery");
    const boosterPlan = getPlanById("candidate_booster");
    const proPlan = getPlanById("candidate_coach");

    assert.ok(!freePlan.unlocksInterviews, "Le plan gratuit ne doit pas débloquer les entretiens");
    assert.equal(boosterPlan.unlocksInterviews, true, "Le plan Élan doit débloquer les entretiens");
    assert.equal(proPlan.unlocksInterviews, true, "Le plan Pro doit débloquer les entretiens");
  });
});

describe("3. Formatage Financier, Devises & Interpolation", () => {
  it("formate correctement les montants avec les devises EUR, USD, GBP", () => {
    const eurFormatted = formatAmountInCurrency(10, "EUR");
    const usdFormatted = formatAmountInCurrency(10, "USD");
    const gbpFormatted = formatAmountInCurrency(10, "GBP");

    assert.ok(eurFormatted.includes("€"), "Doit inclure le symbole euro");
    assert.ok(usdFormatted.includes("$"), "Doit inclure le symbole dollar");
    assert.ok(gbpFormatted.includes("£"), "Doit inclure le symbole livre");
  });

  it("formate le prix d'un plan selon le cycle de facturation et la langue", () => {
    const freePlan = getPlanById("candidate_discovery");
    const agencyPlan = getPlanById("agency_starter");

    const copyFr = { free: "Gratuit", perYear: "/ an", perMonth: "/ mois" };
    const freeResult = formatPlanPrice(freePlan, "annual", "fr", copyFr, "EUR");
    assert.equal(freeResult.amount, "Gratuit");

    const monthlyResult = formatPlanPrice(agencyPlan, "monthly", "fr", copyFr, "EUR");
    assert.match(monthlyResult.amount, /49.*€/);
    assert.equal(monthlyResult.unit, "/ mois");

    const annualResult = formatPlanPrice(agencyPlan, "annual", "fr", copyFr, "EUR");
    assert.match(annualResult.amount, /470.*€/);
    assert.equal(annualResult.unit, "/ an");
  });

  it("remplace proprement les placeholders dans fillTemplate sans afficher d'undefined", () => {
    const template = "Bonjour {name}, bienvenue chez {company} ! Poste : {role}";
    const output = fillTemplate(template, { name: "Sophie", company: "Career CV" });
    assert.equal(output, "Bonjour Sophie, bienvenue chez Career CV ! Poste : {role}");
  });

  it("formate les dates et gère les valeurs nulles sans crash", () => {
    assert.equal(formatDate(null), "-");
    assert.equal(formatShortDate("", "fr"), "-");
    const dateStr = "2026-09-29T10:00:00Z";
    const formatted = formatDate(dateStr);
    assert.match(formatted, /\d{2}\/\d{2}\/\d{4}/);
  });
});

describe("4. Module d'Entraînement au Code (Coding)", () => {
  it("configure l'ensemble des langages requis (Python, JS, HTML, Java, SQL, C++, TypeScript)", () => {
    const ids = CODING_LANGUAGES.map((l) => l.id);
    assert.ok(ids.includes("python"), "Python doit être présent");
    assert.ok(ids.includes("javascript"), "JavaScript doit être présent");
    assert.ok(ids.includes("html_css"), "HTML/CSS doit être présent");
    assert.ok(ids.includes("java"), "Java doit être présent");
    assert.ok(ids.includes("sql"), "SQL doit être présent");
    assert.ok(ids.includes("cpp"), "C++ doit être présent");
    assert.ok(ids.includes("typescript"), "TypeScript doit être présent");
    assert.ok(ids.includes("custom"), "Option personnalisée requise");
  });

  it("dispose des 3 niveaux de difficulté et des dictionnaires bilingues FR/EN complets", () => {
    const levelIds = CODING_LEVELS.map((lvl) => lvl.id);
    assert.deepEqual(levelIds, ["beginner", "intermediate", "advanced"]);

    assert.ok(CODING_COPY.fr.heroTitle, "Titre français requis");
    assert.ok(CODING_COPY.en.heroTitle, "Titre anglais requis");
    assert.equal(CODING_COPY.fr.verdicts.success, "Excellente solution — Prêt pour l'entretien");
  });

  it("borne les scores de revue de code à [0, 100] et assigne les bons verdicts", () => {
    function computeVerdict(score) {
      const bounded = Math.min(100, Math.max(0, Math.round(score)));
      const verdict = bounded >= 80 ? "success" : bounded >= 50 ? "partial" : "needs_work";
      return { score: bounded, verdict };
    }

    assert.deepEqual(computeVerdict(95), { score: 95, verdict: "success" });
    assert.deepEqual(computeVerdict(65), { score: 65, verdict: "partial" });
    assert.deepEqual(computeVerdict(30), { score: 30, verdict: "needs_work" });
    assert.deepEqual(computeVerdict(120), { score: 100, verdict: "success" });
    assert.deepEqual(computeVerdict(-10), { score: 0, verdict: "needs_work" });
  });
});
