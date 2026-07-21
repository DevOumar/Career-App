import { describe, it, expect } from "vitest";
import { parseCvText, createCvRecord } from "../cvService";

describe("cvService — extraction de compétences", () => {
  it("détecte des compétences dans un CV data/tech", () => {
    const parsed = parseCvText("Expert Python, SQL, Docker et Kubernetes, 5 ans d'expérience.");
    expect(parsed.skills).toContain("python");
    expect(parsed.skills).toContain("docker");
  });

  it("détecte des compétences dans un CV non technique (marketing)", () => {
    const parsed = parseCvText(
      "Chargée de marketing digital, growth hacking, SEO/SEA, Google Analytics et HubSpot."
    );
    expect(parsed.skills).toContain("growth hacking");
    expect(parsed.skills).toContain("seo");
    expect(parsed.skills).toContain("hubspot");
  });

  it("ne remonte pas de faux positifs sur des mots-clés courts", () => {
    const parsed = parseCvText("Data Engineer avec une expertise en ingénierie logicielle.");
    expect(parsed.skills).not.toContain("r");
  });

  it("reconnaît les synonymes (JS -> javascript)", () => {
    const parsed = parseCvText("Développeur JS front-end, 3 ans d'expérience.");
    expect(parsed.skills).toContain("javascript");
  });
});

describe("cvService — extraction d'expérience", () => {
  it("calcule l'expérience à partir de plages de dates fermées", () => {
    const parsed = parseCvText(
      "Data Engineer (Stage) - avril 2023 à octobre 2023\nData Analyst (Stage) - avril 2024 à septembre 2024"
    );
    expect(parsed.experienceYears).toBeGreaterThan(0.5);
    expect(parsed.experienceYears).toBeLessThan(2);
  });

  it("gère une période ouverte ('à aujourd'hui')", () => {
    const now = new Date();
    const startYear = now.getFullYear() - 1;
    const parsed = parseCvText(`Data Engineer - janvier ${startYear} à aujourd'hui`);
    expect(parsed.experienceYears).toBeGreaterThan(0.5);
  });

  it("retombe sur 1 an par défaut si seul 'stage' ou 'alternance' est mentionné sans date", () => {
    const parsed = parseCvText("Stage de fin d'études en data science.");
    expect(parsed.experienceYears).toBe(1);
  });
});

describe("cvService — niveau d'études", () => {
  it("distingue 'bac+5' de 'bac' malgré un espace avant le +", () => {
    const parsed = parseCvText("Diplômé d'un Bac +5 en informatique.");
    expect(parsed.education).toBe("bac+5");
  });
});

describe("cvService — signaux qualité (recommandations CV+)", () => {
  it("détecte la présence de résultats quantifiés", () => {
    const parsed = parseCvText("Réduction de 20% des coûts grâce à l'automatisation.");
    expect(parsed.signals.hasQuantifiedResults).toBe(true);
  });

  it("détecte l'absence de coordonnées", () => {
    // Attention : ne pas mentionner littéralement le mot "LinkedIn" dans le texte,
    // même pour dire qu'il est absent — la détection est un simple test de
    // sous-chaîne et se déclencherait sur le mot lui-même (limite heuristique connue).
    const parsed = parseCvText("CV totalement anonyme, aucune coordonnée renseignée nulle part dans ce document.");
    expect(parsed.signals.hasContactInfo).toBe(false);
  });

  it("détecte la présence d'un email comme coordonnée", () => {
    const parsed = parseCvText("Contact : jean.dupont@email.com");
    expect(parsed.signals.hasContactInfo).toBe(true);
  });

  it("attribue une confiance basse à un CV très court sans signal", () => {
    const parsed = parseCvText("CV court.");
    expect(parsed.signals.extractionConfidence).toBe("basse");
  });

  it("attribue une confiance haute à un CV riche en signaux", () => {
    const richCv = `
      Jean Dupont — Data Engineer, jean.dupont@email.com, 06 12 34 56 78.
      5 ans d'expérience en Python, SQL, Docker, Kubernetes, AWS, Spark, Airflow, GitHub.
      Master Data & IA — HETIC Paris. Expériences professionnelles chez plusieurs entreprises
      tech, avec des responsabilités variées et des projets menés de bout en bout, incluant
      la mise en place de pipelines de données robustes et scalables pour des volumétries
      importantes, en environnement cloud. Formation initiale en école d'ingénieur, complétée
      par une spécialisation en ingénierie des données et intelligence artificielle appliquée.
    `.repeat(2);
    const parsed = parseCvText(richCv);
    expect(parsed.signals.extractionConfidence).toBe("haute");
  });
});

describe("createCvRecord", () => {
  it("associe le texte source et les données extraites", () => {
    const record = createCvRecord({ fileName: "cv.txt", sourceText: "Python, SQL, 3 ans d'expérience." });
    expect(record.fileName).toBe("cv.txt");
    expect(record.sourceText).toContain("Python");
    expect(record.parsed.skills).toContain("python");
  });
});
