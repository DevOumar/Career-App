import { describe, it, expect } from "vitest";
import { evaluateAnswer, summarizeSession } from "../interviewEvaluation";

const questionWithStar = {
  question: "Raconte une situation où tu as dû convaincre une équipe non technique.",
  keywords: ["equipe", "convaincre", "adoption", "resultat", "collaboration"],
  starHint: true
};

const questionWithoutStar = {
  question: "Fine-tuning vs prompt engineering : comment choisis-tu ?",
  keywords: ["prompt", "fine-tuning", "cout", "rag"],
  starHint: false
};

describe("evaluateAnswer", () => {
  it("attribue un score très bas à une réponse vide", () => {
    const result = evaluateAnswer({ answer: "", step: questionWithStar });
    expect(result.score).toBeLessThan(20);
  });

  it("attribue un score bas à une réponse très courte hors-sujet", () => {
    const result = evaluateAnswer({ answer: "je ne sais pas", step: questionWithStar });
    expect(result.score).toBeLessThan(30);
  });

  it("récompense la couverture des mots-clés attendus", () => {
    const weak = evaluateAnswer({ answer: "je ne sais pas trop", step: questionWithoutStar });
    const strong = evaluateAnswer({
      answer: "Je choisis d'abord le prompt engineering car le coût est plus faible, et je réserve le fine-tuning et le RAG aux cas plus complexes.",
      step: questionWithoutStar
    });
    expect(strong.score).toBeGreaterThan(weak.score);
  });

  it("détecte une structure STAR complète et la valorise", () => {
    const withStar = evaluateAnswer({
      answer:
        "Le contexte était un projet où l'équipe marketing ne comprenait pas nos choix techniques. J'ai organisé des ateliers hebdomadaires pour expliquer nos décisions avec des exemples concrets. Résultat : l'adoption a triplé en deux mois grâce à cette collaboration renforcée avec l'équipe.",
      step: questionWithStar
    });
    const withoutStar = evaluateAnswer({
      answer: "J'ai réussi à convaincre l'équipe finalement après quelques discussions.",
      step: questionWithStar
    });
    expect(withStar.score).toBeGreaterThan(withoutStar.score);
    expect(withStar.feedback.some((f) => f.includes("bien présente"))).toBe(true);
  });

  it("ne dépasse jamais 100 et ne descend jamais sous 0", () => {
    const perfect = evaluateAnswer({
      answer:
        "Le contexte, mon action précise et le résultat obtenu concret. " +
        "prompt fine-tuning cout rag equipe convaincre adoption resultat collaboration ".repeat(5),
      step: questionWithStar
    });
    expect(perfect.score).toBeLessThanOrEqual(100);
    expect(perfect.score).toBeGreaterThanOrEqual(0);
  });
});

describe("summarizeSession", () => {
  it("retourne une moyenne à 0 et un libellé neutre sans réponse", () => {
    const summary = summarizeSession([]);
    expect(summary.averageScore).toBe(0);
    expect(summary.label).toBe("Aucune réponse");
  });

  it("calcule correctement la moyenne des scores", () => {
    const summary = summarizeSession([{ score: 80 }, { score: 60 }, { score: 40 }]);
    expect(summary.averageScore).toBe(60);
  });

  it("attribue le bon libellé selon le seuil de score", () => {
    expect(summarizeSession([{ score: 80 }]).label).toBe("Excellent");
    expect(summarizeSession([{ score: 60 }]).label).toBe("Bon");
    expect(summarizeSession([{ score: 40 }]).label).toBe("À travailler");
    expect(summarizeSession([{ score: 10 }]).label).toBe("Insuffisant");
  });
});
