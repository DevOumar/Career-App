// Tests unitaires du Module d'Entretiens (RAG & Simulateur) de Career CV.
// Entièrement isolés, sans dépendance à Supabase ni à une clé API externe.
//
// Lancement : node --test backend/tests/interview.unit.test.mjs

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  retrieveChunks,
  formatContext,
  DISCLAIMER,
  INTERVIEWER_SYSTEM_PROMPT
} from "../routes/interview.js";
import { INTERVIEW_SCRIPTS } from "../../frontend/src/features/interviews/interviewScripts.js";
import { INTERVIEW_COPY } from "../../frontend/src/features/interviews/interviewCopy.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CORPUS_PATH = path.join(__dirname, "..", "data", "interviewCorpus.json");

describe("1. Intégrité du Corpus RAG d'Entretiens", () => {
  it("charge le corpus JSON et vérifie la structure de chaque chunk", () => {
    assert.ok(fs.existsSync(CORPUS_PATH), "Le fichier interviewCorpus.json doit exister");
    const raw = fs.readFileSync(CORPUS_PATH, "utf8");
    const corpus = JSON.parse(raw);

    assert.ok(Array.isArray(corpus), "Le corpus doit être un tableau");
    assert.ok(corpus.length >= 20, "Le corpus doit contenir au moins 20 extraits de référence");

    for (const item of corpus) {
      assert.ok(item.id, "Chaque chunk doit avoir un id unique");
      assert.ok(typeof item.texte === "string" && item.texte.length >= 10, "Le texte du chunk doit être substantiel");
      assert.ok(["RH", "technique", "direction"].includes(item.type_entretien), "type_entretien doit être RH, technique ou direction");
      assert.ok(item.sous_theme, "Chaque chunk doit avoir un sous_theme");
      assert.ok(item.domaine, "Chaque chunk doit avoir un domaine");
    }
  });

  it("contient les sous-thèmes essentiels de préparation (STAR, défauts, salaire, motivation)", () => {
    const raw = fs.readFileSync(CORPUS_PATH, "utf8");
    const corpus = JSON.parse(raw);
    const themes = new Set(corpus.map((c) => c.sous_theme));

    assert.ok(themes.has("motivation_parcours"), "Sous-thème motivation_parcours requis");
    assert.ok(themes.has("qualites_defauts"), "Sous-thème qualites_defauts requis");
    assert.ok(themes.has("methode_star"), "Sous-thème methode_star requis");
    assert.ok(themes.has("pretentions_salariales"), "Sous-thème pretentions_salariales requis");
  });
});

describe("2. Moteur de Recherche Sémantique / RAG Retrieval", () => {
  it("retrouve les chunks pertinents sur les qualités et défauts", () => {
    const results = retrieveChunks("Comment parler de mes défauts en entretien ?", "RH", "générique", 3);
    assert.ok(results.length > 0, "Doit retourner des résultats");
    assert.ok(results.length <= 3, "Respecte le paramètre topK=3");

    const matchedThemes = results.map((r) => r.sous_theme);
    assert.ok(matchedThemes.includes("qualites_defauts"), "Doit inclure le sous-thème qualites_defauts");
  });

  it("priorise les extraits selon le domaine métier ciblé (Tech vs Finance)", () => {
    const techResults = retrieveChunks("salaire prétentions", "RH", "tech", 2);
    assert.ok(techResults.length > 0);
    assert.equal(techResults[0].domaine, "tech", "Le premier résultat doit être du domaine tech");

    const financeResults = retrieveChunks("salaire prétentions", "RH", "finance", 2);
    assert.ok(financeResults.length > 0);
    assert.equal(financeResults[0].domaine, "finance", "Le premier résultat doit être du domaine finance");
  });

  it("gère gracieusement les requêtes vides sans lever d'exception", () => {
    const emptyResults = retrieveChunks("", "RH", "générique", 2);
    assert.ok(Array.isArray(emptyResults));
    assert.ok(emptyResults.length <= 2);
  });
});

describe("3. Formatage du Contexte pour Injection LLM", () => {
  it("formate les extraits de contexte RAG avec leurs métadonnées", () => {
    const chunks = [
      { sous_theme: "methode_star", domaine: "générique", texte: "Détaillez la Situation, Tâche, Action, Résultat." },
      { sous_theme: "salaire", domaine: "tech", texte: "Donnez une fourchette réaliste basée sur le marché." }
    ];

    const formatted = formatContext(chunks);
    assert.ok(formatted.includes("[Extrait 1 — methode_star / générique]"));
    assert.ok(formatted.includes("Détaillez la Situation, Tâche, Action, Résultat."));
    assert.ok(formatted.includes("[Extrait 2 — salaire / tech]"));
  });

  it("retourne un message de repli clair si aucun chunk n'est fourni", () => {
    const formatted = formatContext([]);
    assert.equal(formatted, "(aucun contexte spécifique trouvé)");
  });
});

describe("4. Prompt Système & Directives d'Évaluation STAR", () => {
  it("contient les règles strictes de conduite de l'entretien par l'IA", () => {
    assert.ok(INTERVIEWER_SYSTEM_PROMPT.includes("Tu incarnes un(e) RH senior"));
    assert.ok(INTERVIEWER_SYSTEM_PROMPT.includes("Pose UNE seule question à la fois"));
    assert.ok(INTERVIEWER_SYSTEM_PROMPT.includes("Points forts"));
    assert.ok(INTERVIEWER_SYSTEM_PROMPT.includes("Axes d'amélioration & Corrections"));
    assert.ok(INTERVIEWER_SYSTEM_PROMPT.includes("Synthèse & Conseil global"));
  });

  it("définit un disclaimer officiel d'avertissement", () => {
    assert.ok(DISCLAIMER.includes("ne remplace pas un accompagnement RH"));
  });
});

describe("5. Scripts d'Entretien Prédéfinis (RH, Tech, Live Coding)", () => {
  it("propose les 3 profils de recruteurs : RH, Tech et Live Coding", () => {
    assert.ok(INTERVIEW_SCRIPTS.rh, "Profil RH requis");
    assert.ok(INTERVIEW_SCRIPTS.tech, "Profil Tech requis");
    assert.ok(INTERVIEW_SCRIPTS.code, "Profil Live Coding requis");

    assert.equal(INTERVIEW_SCRIPTS.rh.meta.avatar, "SO");
    assert.equal(INTERVIEW_SCRIPTS.tech.meta.avatar, "TH");
    assert.equal(INTERVIEW_SCRIPTS.code.meta.avatar, "SA");
  });

  it("chaque profil dispose d'une séquence de questions avec astuces et réponses types", () => {
    for (const [key, script] of Object.entries(INTERVIEW_SCRIPTS)) {
      assert.ok(script.label, `Le script ${key} doit avoir un label`);
      assert.ok(Array.isArray(script.steps) && script.steps.length >= 3, `Le script ${key} doit avoir au moins 3 étapes`);
      assert.ok(Array.isArray(script.feedback.positive), `Feedback positif requis pour ${key}`);
      assert.ok(Array.isArray(script.feedback.improve), `Feedback d'amélioration requis pour ${key}`);
      assert.ok(script.feedback.key, `Conseil clé requis pour ${key}`);

      for (const step of script.steps) {
        assert.ok(step.question && step.question.length > 10, "Question substantielle requise");
        assert.ok(step.hint && step.hint.length > 5, "Indice requis");
        assert.ok(step.model && step.model.length > 10, "Réponse modèle requise");
      }
    }
  });
});

describe("6. Bilinguisme & Gating du Module Entretiens", () => {
  it("fournit les traductions complètes FR et EN pour l'interface d'entretien", () => {
    assert.ok(INTERVIEW_COPY.fr.report, "Titre rapport FR requis");
    assert.ok(INTERVIEW_COPY.en.report, "Titre report EN requis");
    assert.equal(INTERVIEW_COPY.fr.modelAnswer, "Réponse modèle");
    assert.equal(INTERVIEW_COPY.en.modelAnswer, "Model answer");
    assert.ok(INTERVIEW_COPY.fr.lockedTitle, "Titre offre verrouillée requis");
    assert.ok(INTERVIEW_COPY.en.lockedTitle, "Locked title required");
  });
});
