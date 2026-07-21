import { describe, it, expect } from "vitest";
import { runMatching, filterScoredOffers } from "../matchingService";
import { OFFERS } from "../../data/offers";

// Offre de démonstration minimale utilisée dans plusieurs tests.
const baseOffer = OFFERS.find((o) => o.id === "off-002"); // Doctolib, ML Engineer Health AI

function candidate({ skills = [], experienceYears = 0, education = "", targetRole = "", sector = "", location = "" } = {}) {
  return {
    id: "test-user",
    profile: { skills, experienceYears, education, targetRole, sector, location }
  };
}

const noPremium = { hasAccess: false };
const premium = { hasAccess: true };

describe("matchingService — extraction du texte d'offre collé", () => {
  it("détecte le titre après un motif 'recherchons un(e) <Titre>'", () => {
    const result = runMatching({
      user: candidate(),
      cvRecord: null,
      offerText:
        "Notre entreprise grandit vite. Dans ce cadre, nous recherchons un(e) Data Engineer motivé(e) pour rejoindre l'équipe data.",
      offers: OFFERS,
      premiumAccess: noPremium
    });
    const custom = result.rankedOffers.find((r) => r.offer.id === "custom-offer");
    expect(custom.offer.title).toBe("Data Engineer");
  });

  it("retombe sur un intitulé générique si aucun motif de titre n'est détecté", () => {
    const result = runMatching({
      user: candidate(),
      cvRecord: null,
      offerText: "Une longue phrase d'accroche marketing sans titre de poste identifiable nulle part dans le texte fourni ici.",
      offers: OFFERS,
      premiumAccess: noPremium
    });
    const custom = result.rankedOffers.find((r) => r.offer.id === "custom-offer");
    expect(custom.offer.title).toBe("Poste (offre importée)");
  });

  it("ne détecte pas de faux positifs sur des mots-clés courts (ex. 'r' dans enginee-r)", () => {
    const result = runMatching({
      user: candidate({ skills: ["python"] }),
      cvRecord: null,
      offerText: "Nous recherchons un(e) Data Engineer, poste basé à Paris, minimum 3 ans d'expérience en ingénierie de données.",
      offers: OFFERS,
      premiumAccess: noPremium
    });
    const custom = result.rankedOffers.find((r) => r.offer.id === "custom-offer");
    expect(custom.offer.skills).not.toContain("r");
    expect(custom.offer.skills).not.toContain("scala");
  });

  it("extrait un minimum d'expérience à partir de formulations variées", () => {
    const result = runMatching({
      user: candidate({ experienceYears: 5, skills: ["python", "sql"] }),
      cvRecord: null,
      offerText: "Nous recherchons un(e) Data Analyst avec minimum 4 ans d'expérience en analyse de données.",
      offers: OFFERS,
      premiumAccess: noPremium
    });
    const custom = result.rankedOffers.find((r) => r.offer.id === "custom-offer");
    expect(custom.offer.experienceMin).toBe(4);
  });
});

describe("matchingService — ancrage sur l'offre explicitement traitée", () => {
  it("garde l'offre collée comme cible même si une offre du portefeuille score mieux", () => {
    // CV taillé pour matcher parfaitement une offre du portefeuille (Capgemini),
    // mais l'offre collée ne demande que des compétences absentes du CV.
    const result = runMatching({
      user: candidate({
        skills: ["python", "sql", "power bi", "azure", "communication", "consulting"],
        experienceYears: 5,
        education: "master"
      }),
      cvRecord: null,
      offerText:
        "Nous recherchons un(e) Développeur Rust avec une solide expérience en Elixir et Cobol, minimum 4 ans d'expérience.",
      offers: OFFERS,
      premiumAccess: noPremium
    });

    expect(result.bestMatch.offer.id).toBe("custom-offer");
  });

  it("utilise le meilleur score du portefeuille quand aucune offre n'est collée (texte < 50 caractères)", () => {
    const result = runMatching({
      user: candidate({
        skills: ["python", "sql", "power bi", "azure", "communication", "consulting"],
        experienceYears: 5,
        education: "master"
      }),
      cvRecord: null,
      offerText: "",
      offers: OFFERS,
      premiumAccess: noPremium
    });

    expect(result.bestMatch.offer.id).not.toBe("custom-offer");
  });
});

describe("matchingService — scoring et gating premium", () => {
  it("verrouille une offre premium si l'utilisateur n'a pas accès premium", () => {
    const result = runMatching({
      user: candidate({ skills: ["python", "ml"], experienceYears: 3 }),
      cvRecord: null,
      offerText: "",
      offers: OFFERS,
      premiumAccess: noPremium
    });
    const doctolib = result.rankedOffers.find((r) => r.offer.id === "off-002");
    expect(doctolib.locked).toBe(true);
  });

  it("déverrouille la même offre premium si l'utilisateur a accès premium", () => {
    const result = runMatching({
      user: candidate({ skills: ["python", "ml"], experienceYears: 3 }),
      cvRecord: null,
      offerText: "",
      offers: OFFERS,
      premiumAccess: premium
    });
    const doctolib = result.rankedOffers.find((r) => r.offer.id === "off-002");
    expect(doctolib.locked).toBe(false);
  });

  it("attribue le score maximal atteignable à un candidat couvrant compétences, expérience, niveau d'études, rôle, secteur et localisation", () => {
    // Score max structurel = 55 (compétences) + 20 (expérience) + 10 (études) + 6 (rôle)
    // + 4 (secteur) + 4 (localisation) = 99, jamais 100 avec la pondération actuelle.
    const result = runMatching({
      user: candidate({
        skills: baseOffer.skills,
        experienceYears: baseOffer.experienceMin + 2,
        education: "doctorat",
        targetRole: baseOffer.title,
        sector: baseOffer.sector,
        location: baseOffer.location
      }),
      cvRecord: null,
      offerText: "",
      offers: [baseOffer],
      premiumAccess: premium
    });
    expect(result.bestMatch.score).toBe(99);
  });
});

describe("filterScoredOffers", () => {
  it("filtre par secteur", () => {
    const result = runMatching({
      user: candidate({ skills: ["python"] }),
      cvRecord: null,
      offerText: "",
      offers: OFFERS,
      premiumAccess: premium
    });
    const filtered = filterScoredOffers(result.rankedOffers, { sector: "Santé" });
    expect(filtered.every((r) => r.offer.sector === "Santé")).toBe(true);
    expect(filtered.length).toBeGreaterThan(0);
  });

  it("filtre par recherche libre sur le titre/l'entreprise/les compétences", () => {
    const result = runMatching({
      user: candidate({ skills: ["python"] }),
      cvRecord: null,
      offerText: "",
      offers: OFFERS,
      premiumAccess: premium
    });
    const filtered = filterScoredOffers(result.rankedOffers, { query: "doctolib" });
    expect(filtered).toHaveLength(1);
    expect(filtered[0].offer.company.toLowerCase()).toBe("doctolib");
  });
});
