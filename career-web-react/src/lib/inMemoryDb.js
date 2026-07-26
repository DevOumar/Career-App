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
  return request("/auth/register", { method: "POST", body: payload });
}

export async function loginUser({ email, identifier, password }) {
  return request("/auth/login", {
    method: "POST",
    body: { email, identifier, password }
  });
}

export async function requestLoginCode({ email, identifier, purpose }) {
  return request("/auth/request-code", {
    method: "POST",
    body: { email, identifier, purpose }
  });
}

export async function verifyLoginCode({ email, identifier, code, purpose }) {
  return request("/auth/verify-code", {
    method: "POST",
    body: { email, identifier, code, purpose }
  });
}

export async function loginWithGoogle(credential) {
  return request("/auth/google", {
    method: "POST",
    body: { credential }
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

export async function changeUserPassword(userId, currentPassword, newPassword, options = {}) {
  return request("/auth/password", {
    method: "POST",
    token: options.token,
    body: { userId, currentPassword, newPassword, logoutOtherSessions: Boolean(options.logoutOtherSessions) }
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

export async function requestSecondaryEmailCode(userId, email) {
  return request("/account/emails/request", {
    method: "POST",
    body: { userId, email }
  });
}

export async function verifySecondaryEmail(userId, email, code) {
  return request("/account/emails/verify", {
    method: "POST",
    body: { userId, email, code }
  });
}

export async function setPrimaryEmail(userId, emailId) {
  return request("/account/emails/primary", {
    method: "PATCH",
    body: { userId, emailId }
  });
}

export async function removeSecondaryEmail(userId, emailId) {
  return request("/account/emails", {
    method: "DELETE",
    body: { userId, emailId }
  });
}

export async function deleteUserAccount(userId, confirmation) {
  return request("/account", {
    method: "DELETE",
    body: { userId, confirmation }
  });
}

export async function removeConnectedAccount(userId, provider = "google") {
  return request("/account/connected-accounts/remove", {
    method: "POST",
    body: { userId, provider }
  });
}

export async function linkGoogleAccount(userId, credential) {
  return request("/account/connected-accounts/link-google", {
    method: "POST",
    body: { userId, credential }
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

export async function activatePlan({ userId, planId, billingCycle }) {
  return request("/plans/activate", {
    method: "POST",
    body: { userId, planId, billingCycle }
  });
}

export async function createStripeCheckoutSession({ userId, planId, billingCycle }) {
  return request("/stripe/create-checkout-session", {
    method: "POST",
    body: { userId, planId, billingCycle }
  });
}

export async function getHealth() {
  return request("/health");
}

export async function redeemLicenseCode({ userId, code }) {
  return request("/plans/redeem", {
    method: "POST",
    body: { userId, code }
  });
}

export async function consumeTokens({ userId, amount = 1 }) {
  return request("/tokens/consume", {
    method: "POST",
    body: { userId, amount }
  });
}

export async function addCvRecord(userId, cvRecord) {
  const data = await request("/cv", {
    method: "POST",
    body: { userId, cvRecord }
  });
  return data.cv;
}

export async function extractCvFile({ fileName, mimeType, base64 }) {
  return request("/cv/extract", {
    method: "POST",
    body: { fileName, mimeType, base64 }
  });
}

export async function extractJobOffer({ text }) {
  return request("/jobs/extract", {
    method: "POST",
    body: { text }
  });
}

export async function analyzeMatch({ candidate, offer }) {
  return request("/match/analyze", {
    method: "POST",
    body: { candidate, offer }
  });
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

export async function submitMatchFeedback({ userId, matchRunId, useful }) {
  const data = await request("/matches/feedback", {
    method: "POST",
    body: { userId, matchRunId, useful }
  });
  return data.feedback;
}

export async function getMatchFeedback({ userId, matchRunId }) {
  if (!userId || !matchRunId) return null;
  const data = await request(`/matches/feedback?userId=${encodeURIComponent(userId)}&matchRunId=${encodeURIComponent(matchRunId)}`);
  return data.feedback;
}

export async function generateCoverLetter({ candidate, offer, tone, language }) {
  return request("/coverletter/generate", {
    method: "POST",
    body: { candidate, offer, tone, language }
  });
}

export async function negotiationReply({ candidate, offer, history, targetSalary, finish, currencyLabel }) {
  return request("/negotiation/reply", {
    method: "POST",
    body: { candidate, offer, history, targetSalary, finish, currencyLabel }
  });
}

export async function getPremiumSnapshot(userId) {
  return request(`/premium?userId=${encodeURIComponent(userId)}`);
}
