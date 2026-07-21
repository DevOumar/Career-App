const explicitApiBase = String(import.meta?.env?.VITE_API_URL || "").trim();
const fallbackApiBases = [
  "http://127.0.0.1:8787/api",
  "http://127.0.0.1:8788/api",
  "http://127.0.0.1:8789/api",
  "http://127.0.0.1:8790/api"
];
const probeTimeoutMs = 1200;

let resolvedApiBase = normalizeBase(explicitApiBase);
let resolvePromise = null;

function normalizeBase(base) {
  if (!base) return "";
  return String(base).replace(/\/+$/, "");
}

function withTimeout(ms) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  return { controller, timer };
}

async function probeApiBase(base) {
  const candidate = normalizeBase(base);
  if (!candidate) return false;

  const { controller, timer } = withTimeout(probeTimeoutMs);
  try {
    const response = await fetch(`${candidate}/health`, {
      method: "GET",
      signal: controller.signal
    });
    return response.ok;
  } catch (_error) {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

async function resolveApiBase() {
  if (resolvedApiBase) {
    return resolvedApiBase;
  }

  if (!resolvePromise) {
    resolvePromise = (async () => {
      const candidates = [explicitApiBase, ...fallbackApiBases]
        .map((item) => normalizeBase(item))
        .filter(Boolean)
        .filter((value, index, self) => self.indexOf(value) === index);

      for (const candidate of candidates) {
        if (await probeApiBase(candidate)) {
          resolvedApiBase = candidate;
          return resolvedApiBase;
        }
      }

      resolvedApiBase = normalizeBase(explicitApiBase) || fallbackApiBases[0];
      return resolvedApiBase;
    })().finally(() => {
      resolvePromise = null;
    });
  }

  return resolvePromise;
}

async function request(path, options = {}) {
  const apiBase = await resolveApiBase();
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };

  if (options.token) {
    headers.Authorization = `Bearer ${options.token}`;
  }

  let response;
  try {
    response = await fetch(`${apiBase}${path}`, {
      method: options.method || "GET",
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined
    });
  } catch (error) {
    if (!explicitApiBase) {
      resolvedApiBase = "";
      const retryBase = await resolveApiBase();
      response = await fetch(`${retryBase}${path}`, {
        method: options.method || "GET",
        headers,
        body: options.body ? JSON.stringify(options.body) : undefined
      });
    } else {
      throw error;
    }
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || "Erreur serveur.");
  }

  return data;
}

export async function registerUser(payload) {
  const data = await request("/auth/register", { method: "POST", body: payload });
  return data.user;
}

export async function loginUser({ email, password }) {
  return request("/auth/login", {
    method: "POST",
    body: { email, password }
  });
}

export async function getUserFromSession(token) {
  if (!token) return null;
  try {
    return await request("/auth/session", { token });
  } catch (_error) {
    return null;
  }
}

export async function logoutUser(token) {
  if (!token) return;
  await request("/auth/logout", { method: "POST", token });
}

export async function changeUserPassword(userId, currentPassword, newPassword) {
  return request("/auth/password", {
    method: "POST",
    body: { userId, currentPassword, newPassword }
  });
}

export async function deleteUserAccount(userId, password) {
  return request("/account/delete", {
    method: "POST",
    body: { userId, password }
  });
}

export async function updateUserProfile(userId, patch) {
  return request("/profile", {
    method: "PATCH",
    body: { userId, patch }
  });
}

export async function updateUserAccount(userId, patch) {
  return request("/account", {
    method: "PATCH",
    body: { userId, patch }
  });
}

export async function updateUserAvatar(userId, avatarDataUrl) {
  return request("/profile/avatar", {
    method: "PATCH",
    body: { userId, avatarDataUrl }
  });
}

export async function activatePremiumSubscription(userId) {
  return request("/premium/activate", {
    method: "POST",
    body: { userId }
  });
}

// Distinct de activatePremiumSubscription ci-dessus : celle-ci active gratuitement
// selon le score d'éligibilité (aucun paiement). Celle-ci crée une session de
// paiement Stripe réelle — l'activation effective se fait ensuite côté serveur
// via le webhook (/api/stripe/webhook), pas directement en réponse à cet appel.
export async function createPremiumCheckoutSession(userId) {
  return request("/stripe/create-checkout-session", {
    method: "POST",
    body: { userId }
  });
}

export async function addCvRecord(userId, cvRecord) {
  const data = await request("/cv", {
    method: "POST",
    body: { userId, cvRecord }
  });
  return data.cv;
}

export async function listUserCvs(userId) {
  if (!userId) return [];
  const data = await request(`/cv?userId=${encodeURIComponent(userId)}`);
  return data.items;
}

export async function listOffers() {
  const data = await request("/offers");
  return data.items;
}

export async function saveMatchRun(userId, payload) {
  const data = await request("/matches", {
    method: "POST",
    body: { userId, payload }
  });
  return data.run;
}

export async function getLatestMatchRun(userId) {
  if (!userId) return null;
  const data = await request(`/matches/latest?userId=${encodeURIComponent(userId)}`);
  return data.run;
}

export async function getPremiumSnapshot(userId) {
  return request(`/premium?userId=${encodeURIComponent(userId)}`);
}

export async function saveInterviewAttempt(userId, track, payload) {
  const data = await request("/interviews", {
    method: "POST",
    body: { userId, track, payload }
  });
  return data.attempt;
}

export async function listInterviewAttempts(userId) {
  if (!userId) return [];
  const data = await request(`/interviews?userId=${encodeURIComponent(userId)}`);
  return data.items;
}

export async function requestAiEvaluation({ userId, question, answer, personaName, personaSubtitle }) {
  return request("/interviews/evaluate-ai", {
    method: "POST",
    body: { userId, question, answer, personaName, personaSubtitle }
  });
}

export async function requestLiveTurn({ userId, personaName, personaSubtitle, offerTitle, offerCompany, offerSkills, history, userMessage }) {
  return request("/interviews/live-turn", {
    method: "POST",
    body: { userId, personaName, personaSubtitle, offerTitle, offerCompany, offerSkills, history, userMessage }
  });
}

export async function listOfferStatuses(userId) {
  if (!userId) return [];
  const data = await request(`/offer-status?userId=${encodeURIComponent(userId)}`);
  return data.items;
}

export async function updateOfferStatus(userId, offerId, patch) {
  return request("/offer-status", {
    method: "POST",
    body: { userId, offerId, ...patch }
  });
}

export async function requestCvRewrite({ userId, cvText, offerTitle, offerCompany, offerSkills, missingSkills }) {
  return request("/cv/rewrite-ai", {
    method: "POST",
    body: { userId, cvText, offerTitle, offerCompany, offerSkills, missingSkills }
  });
}

// Pas de userId requis ici : calcul 100% local côté serveur (aucun coût API),
// contrairement aux fonctionnalités du bloc ci-dessus qui appellent Claude.
export async function requestSemanticScore({ cvText, offerText }) {
  return request("/match/semantic-score", {
    method: "POST",
    body: { cvText, offerText }
  });
}
