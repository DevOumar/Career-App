import { describe, it, expect, vi } from "vitest";
import {
  buildTokenRequestBody,
  isTokenExpired,
  buildSearchParams,
  extractSkillsFromText,
  guessExperienceMin,
  guessEducation,
  extractMissionsFromDescription,
  mapOffreToInternal,
  createFranceTravailClient
} from "../franceTravailService";

describe("buildTokenRequestBody", () => {
  it("construit un corps de requête OAuth2 client_credentials avec le bon scope", () => {
    const body = buildTokenRequestBody("mon-client-id", "mon-secret");
    const params = new URLSearchParams(body);
    expect(params.get("grant_type")).toBe("client_credentials");
    expect(params.get("client_id")).toBe("mon-client-id");
    expect(params.get("client_secret")).toBe("mon-secret");
    expect(params.get("scope")).toBe("api_offresdemploiv2 o2dsoffre application_mon-client-id");
  });
});

describe("isTokenExpired", () => {
  it("retourne true si aucun token n'existe", () => {
    expect(isTokenExpired(null)).toBe(true);
  });

  it("retourne true si le token est expiré", () => {
    const now = () => 100_000;
    expect(isTokenExpired({ expiresAt: 50_000 }, now)).toBe(true);
  });

  it("retourne true dans la marge de sécurité avant expiration réelle (30s)", () => {
    const now = () => 100_000;
    expect(isTokenExpired({ expiresAt: 100_000 + 10_000 }, now)).toBe(true);
  });

  it("retourne false si le token est encore valide au-delà de la marge de sécurité", () => {
    const now = () => 100_000;
    expect(isTokenExpired({ expiresAt: 100_000 + 60_000 }, now)).toBe(false);
  });
});

describe("buildSearchParams", () => {
  it("inclut motsCles, commune et typeContrat quand fournis", () => {
    const params = buildSearchParams({ motsCles: "data scientist", commune: "75056", typeContrat: "CDI" });
    expect(params.motsCles).toBe("data scientist");
    expect(params.commune).toBe("75056");
    expect(params.typeContrat).toBe("CDI");
  });

  it("utilise un range par défaut si non fourni", () => {
    const params = buildSearchParams({});
    expect(params.range).toBe("0-19");
  });

  it("omet les champs non fournis plutôt que d'envoyer des valeurs vides", () => {
    const params = buildSearchParams({});
    expect(params.motsCles).toBeUndefined();
    expect(params.commune).toBeUndefined();
  });
});

describe("extractSkillsFromText", () => {
  it("détecte des compétences connues dans un texte libre", () => {
    const skills = extractSkillsFromText("Poste de Data Analyst : maîtrise de Python, SQL et Power BI exigée.");
    expect(skills).toContain("python");
    expect(skills).toContain("sql");
    expect(skills).toContain("power bi");
  });

  it("résout les synonymes vers leur mot-clé canonique", () => {
    const skills = extractSkillsFromText("Développeur JS front-end recherché.");
    expect(skills).toContain("javascript");
  });

  it("ne remonte pas de faux positifs sur des mots-clés trop courts", () => {
    const skills = extractSkillsFromText("Ingénieur logiciel avec de bonnes bases théoriques.");
    expect(skills).not.toContain("r");
  });

  it("détecte des compétences non-tech (marketing, RH...)", () => {
    const skills = extractSkillsFromText("Growth marketing manager : SEO, SEA et growth hacking au quotidien.");
    expect(skills).toContain("seo");
    expect(skills).toContain("growth hacking");
  });
});

describe("guessExperienceMin", () => {
  it("retourne 0 pour un poste débutant accepté", () => {
    expect(guessExperienceMin("Débutant accepté")).toBe(0);
  });

  it("extrait le nombre d'années depuis un libellé libre", () => {
    expect(guessExperienceMin("Expérience de 3 ans et plus")).toBe(3);
    expect(guessExperienceMin("1 an")).toBe(1);
  });

  it("retourne 0 si le libellé est absent ou non reconnu", () => {
    expect(guessExperienceMin("")).toBe(0);
    expect(guessExperienceMin(undefined)).toBe(0);
  });
});

describe("guessEducation", () => {
  it("détecte un niveau d'études depuis les formations", () => {
    const level = guessEducation([{ niveauLibelle: "Bac+5 et plus ou équivalent", domaineLibelle: "Informatique" }]);
    expect(level).toBe("bac+5");
  });

  it("retourne une chaîne vide si aucune formation ne correspond", () => {
    expect(guessEducation([])).toBe("");
    expect(guessEducation(undefined)).toBe("");
  });
});

describe("extractMissionsFromDescription", () => {
  it("découpe une description en lignes courtes exploitables", () => {
    const missions = extractMissionsFromDescription(
      "Vous concevrez des pipelines de données robustes. Vous collaborerez avec les équipes produit. OK."
    );
    expect(missions.length).toBeGreaterThan(0);
    expect(missions.every((m) => m.length > 12 && m.length < 200)).toBe(true);
  });

  it("retourne un tableau vide pour une description absente", () => {
    expect(extractMissionsFromDescription("")).toEqual([]);
  });
});

describe("mapOffreToInternal", () => {
  it("mappe une offre France Travail complète vers le schéma interne", () => {
    const offre = {
      id: "123ABCD",
      intitule: "Data Analyst",
      description: "Vous analyserez des données avec Python et SQL. Vous produirez des rapports Power BI.",
      entreprise: { nom: "Exemple SAS" },
      lieuTravail: { libelle: "Paris (75)" },
      typeContratLibelle: "CDI",
      secteurActiviteLibelle: "Conseil en systèmes informatiques",
      experienceLibelle: "Expérience de 2 ans souhaitée",
      formations: [{ niveauLibelle: "Bac+5 et plus ou équivalent" }],
      origineOffre: { urlOrigine: "https://exemple.fr/offre/123" }
    };

    const mapped = mapOffreToInternal(offre);
    expect(mapped.id).toBe("ft-123ABCD");
    expect(mapped.company).toBe("Exemple SAS");
    expect(mapped.title).toBe("Data Analyst");
    expect(mapped.location).toBe("Paris (75)");
    expect(mapped.contract).toBe("CDI");
    expect(mapped.premium).toBe(false);
    expect(mapped.experienceMin).toBe(2);
    expect(mapped.education).toBe("bac+5");
    expect(mapped.skills).toContain("python");
    expect(mapped.skills).toContain("sql");
    expect(mapped.source).toBe("france-travail");
    expect(mapped.externalUrl).toBe("https://exemple.fr/offre/123");
  });

  it("retombe sur des valeurs par défaut sûres si des champs sont absents", () => {
    const mapped = mapOffreToInternal({ id: "1" });
    expect(mapped.company).toBe("Entreprise non communiquée");
    expect(mapped.title).toBe("Poste (France Travail)");
    expect(mapped.skills).toEqual([]);
    expect(mapped.externalUrl).toBeNull();
  });
});

describe("createFranceTravailClient", () => {
  function fakeFetch({ tokenResponse, searchResponse, tokenStatus = 200, searchStatus = 200 } = {}) {
    const calls = [];
    const impl = vi.fn(async (url, options) => {
      calls.push({ url, options });
      if (url.startsWith("https://entreprise.francetravail.fr")) {
        return {
          ok: tokenStatus >= 200 && tokenStatus < 300,
          status: tokenStatus,
          json: async () => tokenResponse
        };
      }
      return {
        ok: searchStatus >= 200 && searchStatus < 300,
        status: searchStatus,
        json: async () => searchResponse
      };
    });
    impl.calls = calls;
    return impl;
  }

  it("récupère un token puis recherche des offres, avec le bon header d'autorisation", async () => {
    const fetchImpl = fakeFetch({
      tokenResponse: { access_token: "tok_abc", expires_in: 1500 },
      searchResponse: { resultats: [{ id: "1", intitule: "Data Analyst" }] }
    });

    const client = createFranceTravailClient({ clientId: "id", clientSecret: "secret", fetchImpl });
    const offers = await client.searchOffers({ motsCles: "python" });

    expect(offers).toHaveLength(1);
    expect(offers[0].id).toBe("ft-1");

    const searchCall = fetchImpl.calls.find((c) => c.url.includes("offresdemploi"));
    expect(searchCall.options.headers.Authorization).toBe("Bearer tok_abc");
  });

  it("réutilise le token en cache tant qu'il n'est pas expiré (un seul appel d'auth pour deux recherches)", async () => {
    const fetchImpl = fakeFetch({
      tokenResponse: { access_token: "tok_abc", expires_in: 1500 },
      searchResponse: { resultats: [] }
    });
    const client = createFranceTravailClient({ clientId: "id", clientSecret: "secret", fetchImpl });

    await client.searchOffers({});
    await client.searchOffers({});

    const tokenCalls = fetchImpl.calls.filter((c) => c.url.includes("access_token"));
    expect(tokenCalls).toHaveLength(1);
  });

  it("traite un statut 206 (pagination partielle) comme un succès, pas une erreur", async () => {
    const fetchImpl = fakeFetch({
      tokenResponse: { access_token: "tok_abc", expires_in: 1500 },
      searchResponse: { resultats: [{ id: "1", intitule: "Data Analyst" }] },
      searchStatus: 206
    });
    const client = createFranceTravailClient({ clientId: "id", clientSecret: "secret", fetchImpl });
    const offers = await client.searchOffers({});
    expect(offers).toHaveLength(1);
  });

  it("lève une erreur explicite si l'authentification échoue", async () => {
    const fetchImpl = fakeFetch({ tokenResponse: {}, tokenStatus: 401, searchResponse: {} });
    const client = createFranceTravailClient({ clientId: "id", clientSecret: "wrong", fetchImpl });
    await expect(client.searchOffers({})).rejects.toThrow(/Authentification France Travail échouée/);
  });

  it("lève une erreur explicite si la recherche échoue (hors 206)", async () => {
    const fetchImpl = fakeFetch({
      tokenResponse: { access_token: "tok_abc", expires_in: 1500 },
      searchResponse: {},
      searchStatus: 500
    });
    const client = createFranceTravailClient({ clientId: "id", clientSecret: "secret", fetchImpl });
    await expect(client.searchOffers({})).rejects.toThrow(/Recherche France Travail échouée/);
  });
});
