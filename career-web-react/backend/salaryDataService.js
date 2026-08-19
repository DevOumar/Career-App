// Références salariales réelles (marché) pour le simulateur de négociation.
// Deux sources indépendantes, chacune optionnelle : si les identifiants ne
// sont pas configurés dans .env, la fonction correspondante renvoie null
// silencieusement (pas d'erreur, pas de chiffre inventé).

// Lues à l'appel (pas au chargement du module) : le loader .env maison de
// index.js remplit process.env après que les imports ES module (dont celui-ci)
// aient déjà été évalués, donc des const top-level figeraient des valeurs vides.
function getAdzunaCredentials() {
  return {
    appId: String(process.env.ADZUNA_APP_ID || "").trim(),
    appKey: String(process.env.ADZUNA_APP_KEY || "").trim()
  };
}

function getFranceTravailCredentials() {
  return {
    clientId: String(process.env.FRANCE_TRAVAIL_CLIENT_ID || "").trim(),
    clientSecret: String(process.env.FRANCE_TRAVAIL_CLIENT_SECRET || "").trim()
  };
}

let franceTravailTokenCache = { token: null, expiresAt: 0 };

/**
 * Interroge l'API Recherche Adzuna (France) pour une estimation salariale
 * réelle basée sur les annonces correspondant à l'intitulé de poste.
 * https://developer.adzuna.com/docs/search
 */
export async function getAdzunaSalaryReference({ title, location }) {
  const { appId, appKey } = getAdzunaCredentials();
  if (!appId || !appKey || !title) return null;

  try {
    const params = new URLSearchParams({
      app_id: appId,
      app_key: appKey,
      what: title,
      "content-type": "application/json",
      results_per_page: "20"
    });
    if (location && location !== "Non précisé") {
      params.set("where", location);
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    let response;
    try {
      response = await fetch(`https://api.adzuna.com/v1/api/jobs/fr/search/1?${params.toString()}`, {
        signal: controller.signal
      });
    } finally {
      clearTimeout(timeout);
    }
    if (!response.ok) return null;

    const data = await response.json().catch(() => null);
    const results = Array.isArray(data?.results) ? data.results : [];
    const withSalary = results.filter((item) => Number(item.salary_min) > 0 || Number(item.salary_max) > 0);
    if (!withSalary.length) return null;

    const mins = withSalary.map((item) => Number(item.salary_min) || Number(item.salary_max));
    const maxs = withSalary.map((item) => Number(item.salary_max) || Number(item.salary_min));
    const min = Math.round(mins.reduce((sum, value) => sum + value, 0) / mins.length);
    const max = Math.round(maxs.reduce((sum, value) => sum + value, 0) / maxs.length);
    const predicted = withSalary.every((item) => item.salary_is_predicted === "1" || item.salary_is_predicted === 1);

    return {
      source: "Adzuna",
      min,
      max,
      currency: "EUR",
      sampleSize: withSalary.length,
      predicted
    };
  } catch (_error) {
    return null;
  }
}

async function getFranceTravailToken() {
  const { clientId, clientSecret } = getFranceTravailCredentials();
  if (!clientId || !clientSecret) return null;
  if (franceTravailTokenCache.token && franceTravailTokenCache.expiresAt > Date.now() + 5000) {
    return franceTravailTokenCache.token;
  }

  try {
    const params = new URLSearchParams({
      grant_type: "client_credentials",
      client_id: clientId,
      client_secret: clientSecret,
      scope: "api_offresdemploiv2 o2dsoffre"
    });
    const response = await fetch(
      "https://entreprise.pole-emploi.fr/connexion/oauth2/access_token?realm=%2Fpartenaire",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: params.toString()
      }
    );
    if (!response.ok) return null;
    const data = await response.json();
    if (!data?.access_token) return null;
    franceTravailTokenCache = {
      token: data.access_token,
      expiresAt: Date.now() + (Number(data.expires_in) || 1200) * 1000
    };
    return data.access_token;
  } catch (_error) {
    return null;
  }
}

/**
 * Parse le champ "salaire.libelle" de l'API France Travail, qui est du texte
 * libre du type "Annuel de 35000.00 Euros à 40000.00 Euros sur 12.0 mois".
 * Renvoie null si aucun nombre exploitable n'est trouvé.
 */
function parseFranceTravailSalaryLabel(libelle) {
  if (!libelle) return null;
  const text = String(libelle);

  // "Horaire" figures need a weekly-hours assumption to annualize — rather
  // than guess, we skip them to avoid a fabricated conversion.
  if (/horaire/i.test(text)) return null;
  const isMonthly = /mensuel/i.test(text);

  // Le libellé se termine souvent par "sur 12 mois" / "sur 12.0 mois" : ce
  // nombre n'est pas un montant et fausserait le min (ex: min=12) s'il était
  // inclus, donc on le retire avant d'extraire les montants.
  const withoutDuration = text.replace(/sur\s+\d+(\.\d+)?\s*mois/i, "");
  const numbers = withoutDuration.replace(/,/g, ".").match(/\d+(\.\d+)?/g);
  if (!numbers || !numbers.length) return null;

  let values = numbers.map(Number).filter((value) => value > 0);
  if (!values.length) return null;
  if (isMonthly) values = values.map((value) => value * 12);

  const min = Math.min(...values);
  const max = Math.max(...values);

  // Sanity bounds discard obvious data-entry errors on the source's side
  // (e.g. a "Mensuel" label on what is clearly already an annual figure)
  // rather than let them skew the average silently.
  if (min < 12000 || max > 300000) return null;

  return { min, max };
}

/**
 * Recherche des offres réelles sur France Travail pour l'intitulé donné et
 * agrège les fourchettes salariales renseignées par les recruteurs eux-mêmes.
 * https://francetravail.io/data/api/offres-emploi
 */
export async function getFranceTravailSalaryReference({ title, location }) {
  const token = await getFranceTravailToken();
  if (!token || !title) return null;

  try {
    const params = new URLSearchParams({ motsCles: title, range: "0-49" });
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    let response;
    try {
      response = await fetch(
        `https://api.francetravail.io/partenaire/offresdemploi/v2/offres/search?${params.toString()}`,
        {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal
        }
      );
    } finally {
      clearTimeout(timeout);
    }
    if (!response.ok && response.status !== 206) return null;

    const data = await response.json().catch(() => null);
    const offers = Array.isArray(data?.resultats) ? data.resultats : [];
    const parsed = offers
      .map((offer) => parseFranceTravailSalaryLabel(offer?.salaire?.libelle))
      .filter(Boolean);
    if (!parsed.length) return null;

    const min = Math.round(parsed.reduce((sum, item) => sum + item.min, 0) / parsed.length);
    const max = Math.round(parsed.reduce((sum, item) => sum + item.max, 0) / parsed.length);

    return {
      source: "France Travail",
      min,
      max,
      currency: "EUR",
      sampleSize: parsed.length,
      predicted: false
    };
  } catch (_error) {
    return null;
  }
}

/**
 * Combine les deux sources disponibles. Ne renvoie jamais de chiffre
 * fabriqué : si aucune source réelle n'a pu répondre, renvoie null et
 * l'appelant doit alors traiter la négociation comme une estimation IA pure.
 */
export async function getRealSalaryReference({ title, location }) {
  const [adzuna, franceTravail] = await Promise.all([
    getAdzunaSalaryReference({ title, location }),
    getFranceTravailSalaryReference({ title, location })
  ]);

  const references = [franceTravail, adzuna].filter(Boolean);
  if (!references.length) return null;

  const min = Math.round(references.reduce((sum, item) => sum + item.min, 0) / references.length);
  const max = Math.round(references.reduce((sum, item) => sum + item.max, 0) / references.length);

  return {
    min,
    max,
    currency: "EUR",
    sources: references.map((item) => ({
      name: item.source,
      min: item.min,
      max: item.max,
      sampleSize: item.sampleSize,
      predicted: item.predicted
    }))
  };
}
