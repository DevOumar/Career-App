// Intégration France Travail (ex-Pôle Emploi), API "Offres d'emploi v2" —
// alternative officielle, gratuite et légale au scraping LinkedIn/Indeed/Welcome
// to the Jungle (dont les CGU interdisent explicitement la collecte automatisée :
// rupture de contrat, bannissement, contentieux documentés — cf. affaire hiQ Labs
// c. LinkedIn). Inscription libre sur francetravail.io, ~300 000 offres réelles
// en temps réel, données publiques administratives (aucun souci RGPD).
//
// Comme pour Stripe (server/stripeService.js), la logique métier est isolée ici
// pour rester testable sans appel réseau réel ni serveur — `fetchImpl` est
// injectable dans createFranceTravailClient (cf. __tests__/franceTravailService.test.js).

import { SKILL_KEYWORDS, SKILL_SYNONYMS, EDUCATION_LEVELS } from "../src/data/skills.js";

const TOKEN_URL = "https://entreprise.francetravail.fr/connexion/oauth2/access_token?realm=%2Fpartenaire";
const SEARCH_URL = "https://api.francetravail.io/partenaire/offresdemploi/v2/offres/search";

/** Corps de la requête OAuth2 client_credentials (form-urlencoded). */
export function buildTokenRequestBody(clientId, clientSecret) {
  return new URLSearchParams({
    grant_type: "client_credentials",
    client_id: clientId,
    client_secret: clientSecret,
    scope: `api_offresdemploiv2 o2dsoffre application_${clientId}`
  });
}

/** Renouvelle le token un peu avant son expiration réelle, par prudence
 * (évite une requête de recherche rejetée pour cause de token tout juste expiré). */
export function isTokenExpired(token, now = () => Date.now()) {
  if (!token || !token.expiresAt) return true;
  const SAFETY_MARGIN_MS = 30_000;
  return now() >= token.expiresAt - SAFETY_MARGIN_MS;
}

/** Traduit nos critères internes vers les paramètres camelCase attendus par
 * l'API (cf. documentation "Rechercher par critères"). `range` est plafonné à
 * 150 résultats par page côté API (contrainte de leur pagination), donc borné
 * ici pour ne jamais dépasser cette limite même si un appelant en demande plus. */
export function buildSearchParams({ motsCles, commune, distance, typeContrat, range } = {}) {
  const params = {};
  if (motsCles) params.motsCles = motsCles;
  if (commune) params.commune = commune;
  if (distance !== undefined && distance !== null) params.distance = String(distance);
  if (typeContrat) params.typeContrat = typeContrat;
  params.range = range || "0-19";
  params.sort = "1"; // tri par pertinence
  return params;
}

function stripAccents(text) {
  return String(text || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/** Extraction de compétences par dictionnaire de mots-clés — même vocabulaire
 * (SKILL_KEYWORDS/SKILL_SYNONYMS) et même logique que le parsing de CV côté
 * client, appliquée au texte libre de l'offre (intitulé + description). Les
 * "competences" renvoyées telles quelles par l'API sont des phrases longues
 * ("Réaliser un diagnostic technique"), pas des mots-clés directement
 * comparables au dictionnaire — d'où ce choix de reparser le texte libre plutôt
 * que d'utiliser ce champ, pour rester scorable par matchingService. */
export function extractSkillsFromText(text) {
  const normalized = stripAccents(text);
  const found = new Set();

  for (const [synonym, canonical] of Object.entries(SKILL_SYNONYMS)) {
    if (normalized.includes(stripAccents(synonym))) {
      found.add(canonical);
    }
  }

  for (const keyword of SKILL_KEYWORDS) {
    if (keyword.length <= 2) continue; // évite les faux positifs sur mots courts (ex. "r", "go")
    if (normalized.includes(stripAccents(keyword))) {
      found.add(keyword);
    }
  }

  return Array.from(found);
}

/** Estimation heuristique de l'expérience minimale à partir du libellé libre
 * renvoyé par l'API ("Débutant accepté", "1 an", "3 ans et plus"...). Best-effort
 * assumé : contrairement au parsing de CV (plages de dates), pas d'analyse plus
 * fine possible sur ce champ. */
export function guessExperienceMin(experienceLibelle) {
  const text = stripAccents(experienceLibelle);
  if (!text) return 0;
  if (text.includes("debutant")) return 0;
  const match = text.match(/(\d+)\s*an/);
  return match ? Number(match[1]) : 0;
}

/** Estimation heuristique du niveau d'études à partir des formations renvoyées
 * par l'API (best-effort, cf. limite ci-dessus). */
export function guessEducation(formations) {
  const list = Array.isArray(formations) ? formations : [];
  const joined = stripAccents(list.map((f) => `${f.niveauLibelle || ""} ${f.domaineLibelle || ""}`).join(" "));
  for (const level of [...EDUCATION_LEVELS].reverse()) {
    if (joined.includes(level)) return level;
  }
  return "";
}

/** Découpe une description libre en quelques lignes courtes exploitables comme
 * "missions" (l'API ne renvoie pas de liste structurée de missions). */
export function extractMissionsFromDescription(description, limit = 4) {
  return String(description || "")
    .split(/\n|(?<=[.;])\s+/)
    .map((line) => line.trim())
    .filter((line) => line.length > 12 && line.length < 200)
    .slice(0, limit);
}

/** Traduit une offre au format France Travail vers notre schéma interne, pour
 * qu'elle soit scorable par matchingService exactement comme les offres de
 * démonstration (mêmes clés : id, company, title, location, contract, sector,
 * experienceMin, education, skills, missions). Le préfixe "ft-" sur l'id évite
 * toute collision avec les identifiants "off-xxx" du jeu de démonstration. */
export function mapOffreToInternal(offre) {
  const description = offre?.description || "";
  return {
    id: `ft-${offre?.id}`,
    company: offre?.entreprise?.nom || "Entreprise non communiquée",
    title: offre?.intitule || "Poste (France Travail)",
    location: offre?.lieuTravail?.libelle || "",
    contract: offre?.typeContratLibelle || offre?.typeContrat || "",
    premium: false,
    sector: offre?.secteurActiviteLibelle || offre?.appellationlibelle || "",
    experienceMin: guessExperienceMin(offre?.experienceLibelle),
    education: guessEducation(offre?.formations),
    skills: extractSkillsFromText(`${offre?.intitule || ""} ${description}`),
    missions: extractMissionsFromDescription(description),
    source: "france-travail",
    externalUrl: offre?.origineOffre?.urlOrigine || null
  };
}

/**
 * Fabrique un client France Travail (authentification + recherche + cache de
 * token en mémoire). `fetchImpl` est injectable pour les tests — aucun appel
 * réseau réel n'est fait en dehors de l'exécution du vrai serveur.
 */
export function createFranceTravailClient({ clientId, clientSecret, fetchImpl = fetch, now = () => Date.now() } = {}) {
  let cachedToken = null;

  async function getAccessToken() {
    if (!isTokenExpired(cachedToken, now)) {
      return cachedToken.accessToken;
    }
    const response = await fetchImpl(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: buildTokenRequestBody(clientId, clientSecret)
    });
    if (!response.ok) {
      throw new Error(`Authentification France Travail échouée (HTTP ${response.status}).`);
    }
    const data = await response.json();
    cachedToken = {
      accessToken: data.access_token,
      expiresAt: now() + Number(data.expires_in || 0) * 1000
    };
    return cachedToken.accessToken;
  }

  async function searchOffers(criteria) {
    const token = await getAccessToken();
    const params = buildSearchParams(criteria);
    const url = `${SEARCH_URL}?${new URLSearchParams(params).toString()}`;
    const response = await fetchImpl(url, {
      headers: { Authorization: `Bearer ${token}` }
    });
    // 200 = page complète, 206 = pagination partielle : comportement normal de
    // cette API, pas une erreur (cf. doc officielle sur le paramètre "range").
    if (!response.ok && response.status !== 206) {
      throw new Error(`Recherche France Travail échouée (HTTP ${response.status}).`);
    }
    const data = await response.json();
    return (data.resultats || []).map(mapOffreToInternal);
  }

  return { searchOffers, getAccessToken };
}
