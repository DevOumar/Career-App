const explicitApiBase = String(import.meta?.env?.VITE_API_URL || "").trim();
const hostedApiBase =
  typeof window !== "undefined" && window.location.hostname === "career-cv-henna.vercel.app"
    ? "https://career-app-api-mlk9.onrender.com/api"
    : "";
const fallbackApiBases = [
  hostedApiBase,
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

function getStoredSessionToken() {
  try {
    return localStorage.getItem("career_app_token") || "";
  } catch (_error) {
    return "";
  }
}

// --- Second facteur pour les actions sensibles --------------------------------
// Quand la double authentification est active, le serveur répond
// STEP_UP_REQUIRED aux actions sensibles (mot de passe, e-mails, Google,
// suppression du compte…). Un « hôte » (StepUpHost, monté dans main.jsx)
// affiche alors la fenêtre de confirmation ; la requête est rejouée avec la
// preuve, sans que chaque écran ait à gérer ce cas. Les routes /auth/mfa/*
// gèrent elles-mêmes leur confirmation (voir useStepUp) et sont exclues.
let stepUpHost = null;
export function registerStepUpHost(host) {
  stepUpHost = host;
  return () => {
    if (stepUpHost === host) stepUpHost = null;
  };
}

async function request(path, options = {}) {
  try {
    return await rawRequest(path, options);
  } catch (error) {
    const eligible =
      error.code === "STEP_UP_REQUIRED" &&
      stepUpHost &&
      options.body &&
      typeof options.body === "object" &&
      !options.body.stepUp &&
      !path.startsWith("/auth/mfa/");
    if (!eligible) throw error;

    let lastError = "";
    // Plusieurs essais possibles (code mal saisi) ; l'annulation abandonne.
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const proof = await stepUpHost.ask({ methods: error.methods || [], userId: options.body.userId, error: lastError });
      if (!proof) {
        stepUpHost.close();
        throw Object.assign(new Error("Action annulée."), { code: "STEP_UP_CANCELLED", cancelled: true });
      }
      try {
        const result = await rawRequest(path, { ...options, body: { ...options.body, stepUp: proof } });
        stepUpHost.close();
        return result;
      } catch (retryError) {
        if (retryError.code !== "STEP_UP_FAILED") {
          stepUpHost.close();
          throw retryError;
        }
        lastError = retryError.message;
      }
    }
    stepUpHost.close();
    throw error;
  }
}

async function rawRequest(path, options = {}) {
  const apiBase = await resolveApiBase();
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };

  // Le token de session est attaché automatiquement à chaque requête (le
  // serveur vérifie désormais que le userId envoyé en body/query correspond
  // bien à la session active) — options.token permet de le forcer/écraser
  // explicitement (ex. juste après une connexion, avant qu'il soit relu du
  // storage), mais ce n'est plus nécessaire dans le cas général.
  const token = options.token || getStoredSessionToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
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
    const error = new Error(data.error || "Erreur serveur.");
    // Certaines routes renvoient un code machine-readable (ex:
    // NO_ACCOUNT_GOOGLE) pour permettre à l'appelant de réagir différemment
    // du simple affichage du message (proposer un bouton, changer d'écran...).
    if (data.code) error.code = data.code;
    // Le code HTTP et tout champ additionnel (ex: `duplicate` sur la
    // détection de doublon candidat cabinet) restent accessibles à
    // l'appelant sans avoir à reparser la réponse.
    error.statusCode = response.status;
    for (const key of Object.keys(data)) {
      if (key !== "error") error[key] = data[key];
    }
    throw error;
  }

  return data;
}

// Utilisé pour construire des liens de téléchargement directs (export CSV)
// qu'un simple <a href> peut suivre, sans passer par fetch/blob.
export async function getApiBase() {
  return resolveApiBase();
}

// Exposé pour /api/interview/audio-message : upload binaire brut (le corps
// n'est pas du JSON), donc request() ne convient pas telle quelle — mais on
// veut quand même le même token de session que le reste de l'app.
export function getSessionToken() {
  return getStoredSessionToken();
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

export async function requestPasswordReset({ identifier }) {
  return request("/auth/forgot-password", {
    method: "POST",
    body: { identifier }
  });
}

export async function resetPassword({ identifier, code, newPassword }) {
  return request("/auth/reset-password", {
    method: "POST",
    body: { identifier, code, newPassword }
  });
}

// intent "login" : ne crée jamais de compte — si aucun compte Google
// n'existe déjà, le backend renvoie une erreur avec code NO_ACCOUNT_GOOGLE
// plutôt que d'en créer un silencieusement. intent "signup" garde le
// comportement historique (crée le compte s'il n'existe pas encore, ou
// connecte directement s'il existe déjà).
export async function loginWithGoogle(credential, intent = "signup") {
  return request("/auth/google", {
    method: "POST",
    body: { credential, intent }
  });
}

// --- Double authentification (voir backend/routes/mfa.js) -------------------
// Connexion : le 1er facteur a renvoyé { mfaRequired, mfaTicket, methods }.
export async function verifyMfaLogin({ ticket, method, code, response }) {
  return request("/auth/mfa/verify", { method: "POST", body: { ticket, method, code, response } });
}

export async function getMfaLoginKeyOptions(ticket) {
  return request("/auth/mfa/key-options", { method: "POST", body: { ticket } });
}

// Gestion (session requise). `stepUp` : confirmation d'identité, jointe quand
// le serveur a répondu STEP_UP_REQUIRED.
export async function getMfaStatus(userId) {
  return request(`/auth/mfa/status?userId=${encodeURIComponent(userId)}`);
}

export async function getStepUpKeyOptions(userId) {
  return request("/auth/mfa/step-up/key-options", { method: "POST", body: { userId } });
}

export async function startTotpEnrollment(userId, stepUp) {
  return request("/auth/mfa/totp/start", { method: "POST", body: { userId, stepUp } });
}

export async function confirmTotpEnrollment(userId, code) {
  return request("/auth/mfa/totp/confirm", { method: "POST", body: { userId, code } });
}

export async function cancelTotpEnrollment(userId) {
  return request("/auth/mfa/totp/cancel", { method: "POST", body: { userId } });
}

export async function disableTotp(userId, stepUp) {
  return request("/auth/mfa/totp/disable", { method: "POST", body: { userId, stepUp } });
}

export async function regenerateRecoveryCodes(userId, stepUp) {
  return request("/auth/mfa/recovery-codes", { method: "POST", body: { userId, stepUp } });
}

export async function startSecurityKeyRegistration(userId, stepUp) {
  return request("/auth/mfa/keys/options", { method: "POST", body: { userId, stepUp } });
}

export async function finishSecurityKeyRegistration(userId, name, response) {
  return request("/auth/mfa/keys", { method: "POST", body: { userId, name, response } });
}

export async function revokeSecurityKey(userId, keyId, stepUp) {
  return request(`/auth/mfa/keys/${encodeURIComponent(keyId)}?userId=${encodeURIComponent(userId)}`, {
    method: "DELETE",
    body: { userId, stepUp }
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

export async function exportAccountData(userId) {
  return request(`/account/export?userId=${encodeURIComponent(userId)}`);
}

export async function revokeSession({ userId, sessionId }) {
  return request(`/auth/sessions/${encodeURIComponent(sessionId)}?userId=${encodeURIComponent(userId)}`, {
    method: "DELETE"
  });
}

export async function revokeOtherSessions(userId) {
  return request("/auth/sessions/revoke-others", { method: "POST", body: { userId } });
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

export async function createStripeCheckoutSession({ userId, planId, billingCycle, quantity = 1 }) {
  return request("/stripe/create-checkout-session", {
    method: "POST",
    body: { userId, planId, billingCycle, quantity }
  });
}

export async function confirmStripeCheckoutSession({ userId, sessionId }) {
  return request("/stripe/confirm-checkout-session", {
    method: "POST",
    body: { userId, sessionId }
  });
}

export async function listBillingTransactions(userId, filters = {}) {
  const params = new URLSearchParams({ userId });
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") params.set(key, value);
  });
  return request(`/billing/transactions?${params.toString()}`);
}

export async function getNotifications(userId) {
  const data = await request(`/notifications?userId=${encodeURIComponent(userId)}`);
  return data.items;
}

export async function getHealth() {
  return request("/health");
}

export async function redeemLicenseCode({ userId, code, confirmSwitch = false }) {
  return request("/plans/redeem", {
    method: "POST",
    body: { userId, code, confirmSwitch }
  });
}

export async function consumeTokens({ userId, amount = 1 }) {
  return request("/tokens/consume", {
    method: "POST",
    body: { userId, amount }
  });
}

export async function findEmail({ userId, companyName, domain, firstName, lastName }) {
  return request("/email-finder/search", {
    method: "POST",
    body: { userId, companyName, domain, firstName, lastName }
  });
}

export async function addCvRecord(userId, cvRecord) {
  const data = await request("/cv", {
    method: "POST",
    body: { userId, cvRecord }
  });
  return data.cv;
}

export async function listJobApplications(userId) {
  const data = await request(`/applications?userId=${encodeURIComponent(userId)}`);
  return data.items;
}

export async function createJobApplication(payload) {
  const data = await request("/applications", { method: "POST", body: payload });
  return data.item;
}

export async function updateJobApplication(id, payload) {
  const data = await request(`/applications/${encodeURIComponent(id)}`, { method: "PUT", body: payload });
  return data.item;
}

export async function deleteJobApplication({ id, userId }) {
  return request(`/applications/${encodeURIComponent(id)}?userId=${encodeURIComponent(userId)}`, { method: "DELETE" });
}

export async function getSatisfactionStatus(userId) {
  const data = await request(`/satisfaction/status?userId=${encodeURIComponent(userId)}`);
  return data.eligible;
}

export async function dismissSatisfactionSurvey(userId) {
  return request("/satisfaction/dismiss", { method: "POST", body: { userId } });
}

export async function submitSatisfactionSurvey({ userId, score, comment }) {
  return request("/satisfaction", { method: "POST", body: { userId, score, comment } });
}

export async function getAdminSatisfaction(adminUserId) {
  return request(`/admin/satisfaction?adminUserId=${encodeURIComponent(adminUserId)}`);
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

export async function optimizeCvForAts({ candidate, offer, language }) {
  const data = await request("/cv/optimize-ats", {
    method: "POST",
    body: { candidate, offer, language }
  });
  return data.optimization;
}

export async function generateCoverLetter({ candidate, offer, tone, language }) {
  return request("/coverletter/generate", {
    method: "POST",
    body: { candidate, offer, tone, language }
  });
}

export async function negotiationReply({ candidate, offer, history, targetSalary, finish, currencyLabel, salaryReference }) {
  return request("/negotiation/reply", {
    method: "POST",
    body: { candidate, offer, history, targetSalary, finish, currencyLabel, salaryReference }
  });
}

export async function listNegotiationConversations(userId) {
  if (!userId) return [];
  const data = await request(`/negotiation/conversations?userId=${encodeURIComponent(userId)}`);
  return data.items;
}

export async function saveNegotiationConversation({ userId, title, payload }) {
  const data = await request("/negotiation/conversations", {
    method: "POST",
    body: { userId, title, payload }
  });
  return data.conversation;
}

export async function updateNegotiationConversation({ userId, conversationId, title, payload }) {
  return request(`/negotiation/conversations/${encodeURIComponent(conversationId)}`, {
    method: "PUT",
    body: { userId, title, payload }
  });
}

export async function deleteNegotiationConversation({ userId, conversationId }) {
  return request(`/negotiation/conversations/${encodeURIComponent(conversationId)}?userId=${encodeURIComponent(userId)}`, {
    method: "DELETE"
  });
}

export async function listInterviewConversations(userId) {
  if (!userId) return [];
  const data = await request(`/interview/conversations?userId=${encodeURIComponent(userId)}`);
  return data.items;
}

export async function saveInterviewConversation({ userId, title, payload }) {
  const data = await request("/interview/conversations", {
    method: "POST",
    body: { userId, title, payload }
  });
  return data.conversation;
}

export async function updateInterviewConversation({ userId, conversationId, title, payload }) {
  return request(`/interview/conversations/${encodeURIComponent(conversationId)}`, {
    method: "PUT",
    body: { userId, title, payload }
  });
}

export async function deleteInterviewConversation({ userId, conversationId }) {
  return request(`/interview/conversations/${encodeURIComponent(conversationId)}?userId=${encodeURIComponent(userId)}`, {
    method: "DELETE"
  });
}

// userId est requis ici (contrairement à un simple appel fetch relatif) :
// le backend vérifie que le plan de cet utilisateur donne bien droit au
// simulateur d'entretiens avant de démarrer une session.
export async function startInterviewSession({ userId, type_entretien, domaine, offre }) {
  const data = await request("/interview/start", {
    method: "POST",
    body: { userId, type_entretien, domaine, offre }
  });
  return { message: data.message, history: data.history || [] };
}

export async function sendInterviewMessage({ userId, text, history = [], type_entretien, domaine, offre }) {
  const data = await request("/interview/message", {
    method: "POST",
    body: { userId, message: text, history, type_entretien, domaine, offre }
  });
  return { message: data.message, history: data.history || history };
}

export async function listCoverLetters(userId) {
  if (!userId) return [];
  const data = await request(`/coverletter/conversations?userId=${encodeURIComponent(userId)}`);
  return data.items;
}

export async function saveCoverLetter({ userId, title, payload }) {
  const data = await request("/coverletter/conversations", {
    method: "POST",
    body: { userId, title, payload }
  });
  return data.conversation;
}

export async function updateCoverLetter({ userId, conversationId, title, payload }) {
  return request(`/coverletter/conversations/${encodeURIComponent(conversationId)}`, {
    method: "PUT",
    body: { userId, title, payload }
  });
}

export async function deleteCoverLetter({ userId, conversationId }) {
  return request(`/coverletter/conversations/${encodeURIComponent(conversationId)}?userId=${encodeURIComponent(userId)}`, {
    method: "DELETE"
  });
}

export async function getPremiumSnapshot(userId) {
  return request(`/premium?userId=${encodeURIComponent(userId)}`);
}

export async function refundAdminTransaction({ adminUserId, transactionId }) {
  return request(`/admin/transactions/${encodeURIComponent(transactionId)}/refund`, {
    method: "POST",
    body: { adminUserId }
  });
}

export async function getPlanOverrides() {
  try {
    const data = await request("/plans/overrides");
    return data.overrides || {};
  } catch (_error) {
    return {};
  }
}

export async function getAdminPlans(adminUserId) {
  const data = await request(`/admin/plans?adminUserId=${encodeURIComponent(adminUserId)}`);
  return data.items;
}

export async function updateAdminPlan({ adminUserId, planId, monthlyPrice, annualPrice }) {
  return request(`/admin/plans/${encodeURIComponent(planId)}`, {
    method: "PUT",
    body: { adminUserId, monthlyPrice, annualPrice }
  });
}

export async function resetAdminPlan({ adminUserId, planId }) {
  return request(`/admin/plans/${encodeURIComponent(planId)}/reset`, {
    method: "POST",
    body: { adminUserId }
  });
}

export async function getAdminOverview(adminUserId) {
  return request(`/admin/overview?adminUserId=${encodeURIComponent(adminUserId)}`);
}

export async function getAdminNotifications(adminUserId) {
  const data = await request(`/admin/notifications?adminUserId=${encodeURIComponent(adminUserId)}`);
  return data.items;
}

export async function listAdminUsers(adminUserId, { search = "", roleType = "" } = {}) {
  const params = new URLSearchParams({ adminUserId, search, roleType });
  const data = await request(`/admin/users?${params.toString()}`);
  return data.items;
}

export async function createAdminUser(payload) {
  return request("/admin/users", {
    method: "POST",
    body: payload
  });
}

export async function getAdminOrgAccounts(adminUserId, roleType) {
  const params = new URLSearchParams({ adminUserId, roleType });
  const data = await request(`/admin/org-accounts?${params.toString()}`);
  return data.items;
}

export async function getAdminFinance(adminUserId, { source = "", search = "" } = {}) {
  const params = new URLSearchParams({ adminUserId, source, search });
  return request(`/admin/finance?${params.toString()}`);
}

export async function getAdminSchools(adminUserId, language = "fr") {
  const params = new URLSearchParams({ adminUserId, language });
  return request(`/admin/schools?${params.toString()}`);
}

export async function getAdminSchoolAnnouncements(adminUserId) {
  const data = await request(`/admin/school-announcements?adminUserId=${encodeURIComponent(adminUserId)}`);
  return data.items;
}

export async function getAdminCabinets(adminUserId, language = "fr") {
  const params = new URLSearchParams({ adminUserId, language });
  return request(`/admin/cabinets?${params.toString()}`);
}

export async function getAdminCabinetAnnouncements(adminUserId) {
  const data = await request(`/admin/cabinet-announcements?adminUserId=${encodeURIComponent(adminUserId)}`);
  return data.items;
}

export async function updateAdminUser(payload) {
  return request("/admin/users/update", {
    method: "POST",
    body: payload
  });
}

export async function updateAdminUserStatus({ adminUserId, userId, status }) {
  return request("/admin/users/status", {
    method: "POST",
    body: { adminUserId, userId, status }
  });
}

export async function deleteAdminUser({ adminUserId, userId, confirmation }) {
  return request("/admin/users/delete", {
    method: "POST",
    body: { adminUserId, userId, confirmation }
  });
}

export async function getAdminActivityLog(adminUserId, { search = "", eventType = "" } = {}) {
  const params = new URLSearchParams({ adminUserId, search, eventType });
  return request(`/admin/activity-log?${params.toString()}`);
}

export async function getAdminLicenseCodes(adminUserId, { search = "" } = {}) {
  const params = new URLSearchParams({ adminUserId, search });
  const data = await request(`/admin/license-codes?${params.toString()}`);
  return data.items;
}

export async function revokeAdminLicenseCode(adminUserId, code) {
  return request("/admin/license-codes/revoke", {
    method: "POST",
    body: { adminUserId, code }
  });
}

export async function restoreAdminLicenseCode(adminUserId, code) {
  return request("/admin/license-codes/restore", {
    method: "POST",
    body: { adminUserId, code }
  });
}

export async function getAdminAiSamples(adminUserId, { search = "" } = {}) {
  const params = new URLSearchParams({ adminUserId, search });
  return request(`/admin/ai-samples?${params.toString()}`);
}

export async function getAdminAiMonitoring(adminUserId) {
  const params = new URLSearchParams({ adminUserId });
  return request(`/admin/ai-monitoring?${params.toString()}`);
}

export async function getAdminCvs(adminUserId, { search = "", status = "", segment = "" } = {}) {
  const params = new URLSearchParams({ adminUserId, search, status, segment });
  return request(`/admin/cvs?${params.toString()}`);
}

export async function deleteAdminAnnouncement({ adminUserId, announcementId }) {
  return request(`/admin/announcements/${encodeURIComponent(announcementId)}`, {
    method: "DELETE",
    body: { adminUserId }
  });
}

export async function deleteAdminCv({ adminUserId, cvId }) {
  return request(`/admin/cvs/${encodeURIComponent(cvId)}`, {
    method: "DELETE",
    body: { adminUserId }
  });
}

export async function reanalyzeAdminCv({ adminUserId, cvId }) {
  return request(`/admin/cvs/${encodeURIComponent(cvId)}/reanalyze`, {
    method: "POST",
    body: { adminUserId }
  });
}

export async function getAdminMatches(adminUserId, { search = "", segment = "" } = {}) {
  const params = new URLSearchParams({ adminUserId, search, segment });
  return request(`/admin/matches?${params.toString()}`);
}

export async function getAdminQuality(adminUserId, { search = "" } = {}) {
  const params = new URLSearchParams({ adminUserId, search });
  return request(`/admin/quality?${params.toString()}`);
}

export async function getAdminSettings(adminUserId) {
  const params = new URLSearchParams({ adminUserId });
  return request(`/admin/settings?${params.toString()}`);
}

export async function updateAdminSetting(adminUserId, key, value) {
  return request("/admin/settings", {
    method: "POST",
    body: { adminUserId, key, value }
  });
}

export async function getAdminAnnouncementAudienceCount(adminUserId, audience) {
  const params = new URLSearchParams({ adminUserId, audience });
  const data = await request(`/admin/announcements/audience-count?${params.toString()}`);
  return data.count;
}

export async function getAdminAnnouncements(adminUserId) {
  const params = new URLSearchParams({ adminUserId });
  const data = await request(`/admin/announcements?${params.toString()}`);
  return data.items;
}

export async function sendAdminAnnouncement({ adminUserId, subject, message, audience, attachment }) {
  return request("/admin/announcements/send", {
    method: "POST",
    body: { adminUserId, subject, message, audience, attachment }
  });
}

export async function getSchoolOverview(userId) {
  const params = new URLSearchParams({ userId });
  return request(`/school/overview?${params.toString()}`);
}

export async function getSchoolStudents(userId, { search = "" } = {}) {
  const params = new URLSearchParams({ userId, search });
  const data = await request(`/school/students?${params.toString()}`);
  return data.items;
}

export async function removeSchoolStudent(userId, studentId) {
  return request("/school/students/remove", {
    method: "POST",
    body: { userId, studentId }
  });
}

export async function getSchoolLicense(userId) {
  const params = new URLSearchParams({ userId });
  const data = await request(`/school/license?${params.toString()}`);
  return data.items;
}

export async function getSchoolInsights(userId, { promotionId = "" } = {}) {
  const params = new URLSearchParams({ userId });
  if (promotionId) params.set("promotionId", promotionId);
  return request(`/school/insights?${params.toString()}`);
}

export async function getSchoolInvitations(userId) {
  const params = new URLSearchParams({ userId });
  const data = await request(`/school/invitations?${params.toString()}`);
  return data.items;
}

export async function sendSchoolInvitation(userId, email) {
  return request("/school/invitations/send", {
    method: "POST",
    body: { userId, email }
  });
}

export async function sendSchoolInvitationsBulk(userId, emails) {
  return request("/school/students/bulk-invite", {
    method: "POST",
    body: { userId, emails }
  });
}

export async function getSchoolProfile(userId) {
  return request(`/school/profile?userId=${encodeURIComponent(userId)}`);
}

export async function updateSchoolProfile(userId, profile) {
  return request("/school/profile", {
    method: "PUT",
    body: { userId, profile }
  });
}

export async function getSchoolNotifications(userId, language = "fr") {
  return request(`/school/notifications?userId=${encodeURIComponent(userId)}&language=${encodeURIComponent(language)}`);
}

export async function markSchoolNotificationsRead(userId) {
  return request("/school/notifications/read", {
    method: "POST",
    body: { userId }
  });
}

export async function getSchoolPromotions(userId) {
  return request(`/school/promotions?userId=${encodeURIComponent(userId)}`);
}

export async function createSchoolPromotion(userId, payload) {
  return request("/school/promotions", {
    method: "POST",
    body: { userId, ...payload }
  });
}

export async function deleteSchoolPromotion(userId, promotionId) {
  return request(`/school/promotions/${encodeURIComponent(promotionId)}?userId=${encodeURIComponent(userId)}`, {
    method: "DELETE"
  });
}

export async function updateSchoolPromotionStudent(userId, promotionId, studentId, action = "add") {
  return request(`/school/promotions/${encodeURIComponent(promotionId)}/students`, {
    method: "POST",
    body: { userId, studentId, action }
  });
}

export async function getSchoolReports(userId) {
  return request(`/school/reports?userId=${encodeURIComponent(userId)}`);
}

export async function generateSchoolReport(userId, period = "monthly", promotionId = "") {
  return request("/school/reports/generate", {
    method: "POST",
    body: { userId, period, promotionId }
  });
}

export async function updateSchoolPromotion(userId, promotionId, payload) {
  return request(`/school/promotions/${encodeURIComponent(promotionId)}`, {
    method: "PUT",
    body: { userId, ...payload }
  });
}

export async function getSchoolPromotionsCompare(userId) {
  const params = new URLSearchParams({ userId });
  const data = await request(`/school/promotions/compare?${params.toString()}`);
  return data.items;
}

export async function getSchoolAnnouncements(userId) {
  const data = await request(`/school/announcements?userId=${encodeURIComponent(userId)}`);
  return data.items;
}

export async function sendSchoolAnnouncement(userId, { subject, message, promotionId = "", studentIds = null }) {
  return request("/school/announcements/send", {
    method: "POST",
    body: { userId, subject, message, promotionId, studentIds }
  });
}

export async function getSchoolEvents(userId) {
  const data = await request(`/school/events?userId=${encodeURIComponent(userId)}`);
  return data.items;
}

export async function createSchoolEvent(userId, payload) {
  return request("/school/events", {
    method: "POST",
    body: { userId, ...payload }
  });
}

export async function deleteSchoolEvent(userId, eventId) {
  return request(`/school/events/${encodeURIComponent(eventId)}?userId=${encodeURIComponent(userId)}`, {
    method: "DELETE"
  });
}

// --- Espace Cabinet -------------------------------------------------------

export async function getCabinetOverview(userId, language = "fr") {
  const params = new URLSearchParams({ userId, language });
  return request(`/cabinet/overview?${params.toString()}`);
}

export async function getCabinetNotifications(userId, language = "fr") {
  const params = new URLSearchParams({ userId, language });
  const data = await request(`/cabinet/notifications?${params.toString()}`);
  return data.items;
}

export async function getCabinetRecruiters(userId, { search = "" } = {}) {
  const params = new URLSearchParams({ userId, search });
  const data = await request(`/cabinet/recruiters?${params.toString()}`);
  return data.items;
}

export async function removeCabinetRecruiter(userId, targetUserId) {
  return request("/cabinet/recruiters/remove", { method: "POST", body: { userId, targetUserId } });
}

export async function getCabinetInvitations(userId) {
  const data = await request(`/cabinet/invitations?userId=${encodeURIComponent(userId)}`);
  return data.items;
}

export async function sendCabinetInvitation(userId, email) {
  return request("/cabinet/invitations/send", { method: "POST", body: { userId, email } });
}

export async function sendCabinetInvitationsBulk(userId, emails) {
  return request("/cabinet/recruiters/bulk-invite", { method: "POST", body: { userId, emails } });
}

export async function getCabinetLicense(userId) {
  const data = await request(`/cabinet/license?userId=${encodeURIComponent(userId)}`);
  return data.items;
}

export async function getCabinetCandidates(
  userId,
  { search = "", status = "", skill = "", missionId = "", followUp = false } = {}
) {
  const params = new URLSearchParams({ userId, search, status, skill, missionId });
  if (followUp) params.set("followUp", "1");
  return request(`/cabinet/candidates?${params.toString()}`);
}

export async function getCabinetCandidateNotes(userId, candidateId) {
  const data = await request(
    `/cabinet/candidates/${encodeURIComponent(candidateId)}/notes?userId=${encodeURIComponent(userId)}`
  );
  return data.items;
}

export async function addCabinetCandidateNote(userId, candidateId, body) {
  return request(`/cabinet/candidates/${encodeURIComponent(candidateId)}/notes`, {
    method: "POST",
    body: { userId, body }
  });
}

export async function deleteCabinetCandidateNote(userId, candidateId, noteId) {
  return request(
    `/cabinet/candidates/${encodeURIComponent(candidateId)}/notes/${encodeURIComponent(noteId)}?userId=${encodeURIComponent(userId)}`,
    { method: "DELETE" }
  );
}

export async function extractCabinetCandidateCv(userId, { fileName, mimeType, base64 }) {
  return request("/cabinet/candidates/extract", {
    method: "POST",
    body: { userId, fileName, mimeType, base64 }
  });
}

export async function createCabinetCandidate(userId, payload) {
  return request("/cabinet/candidates", { method: "POST", body: { userId, ...payload } });
}

export async function updateCabinetCandidate(userId, candidateId, payload) {
  return request(`/cabinet/candidates/${encodeURIComponent(candidateId)}`, {
    method: "PUT",
    body: { userId, ...payload }
  });
}

export async function deleteCabinetCandidate(userId, candidateId) {
  return request(`/cabinet/candidates/${encodeURIComponent(candidateId)}?userId=${encodeURIComponent(userId)}`, {
    method: "DELETE"
  });
}

export async function getCabinetMissionsCompare(userId) {
  const data = await request(`/cabinet/missions/compare?userId=${encodeURIComponent(userId)}`);
  return data.items;
}

export async function getCabinetMissions(userId) {
  const data = await request(`/cabinet/missions?userId=${encodeURIComponent(userId)}`);
  return data.items;
}

export async function createCabinetMission(userId, payload) {
  return request("/cabinet/missions", { method: "POST", body: { userId, ...payload } });
}

export async function updateCabinetMission(userId, missionId, payload) {
  return request(`/cabinet/missions/${encodeURIComponent(missionId)}`, {
    method: "PUT",
    body: { userId, ...payload }
  });
}

export async function deleteCabinetMission(userId, missionId) {
  return request(`/cabinet/missions/${encodeURIComponent(missionId)}?userId=${encodeURIComponent(userId)}`, {
    method: "DELETE"
  });
}

export async function duplicateCabinetMission(userId, missionId) {
  return request(`/cabinet/missions/${encodeURIComponent(missionId)}/duplicate`, {
    method: "POST",
    body: { userId }
  });
}

export async function updateCabinetMissionCandidate(userId, missionId, candidateId, action, extra = {}) {
  return request(`/cabinet/missions/${encodeURIComponent(missionId)}/candidates`, {
    method: "POST",
    body: { userId, candidateId, action, ...extra }
  });
}

export async function getCabinetMessageTemplates(userId) {
  const data = await request(`/cabinet/message-templates?userId=${encodeURIComponent(userId)}`);
  return data.items;
}

export async function createCabinetMessageTemplate(userId, payload) {
  return request("/cabinet/message-templates", { method: "POST", body: { userId, ...payload } });
}

export async function deleteCabinetMessageTemplate(userId, templateId) {
  return request(`/cabinet/message-templates/${encodeURIComponent(templateId)}?userId=${encodeURIComponent(userId)}`, {
    method: "DELETE"
  });
}

export async function getCabinetAnnouncements(userId) {
  const data = await request(`/cabinet/announcements?userId=${encodeURIComponent(userId)}`);
  return data.items;
}

export async function sendCabinetAnnouncement(userId, { subject, message }) {
  return request("/cabinet/announcements/send", { method: "POST", body: { userId, subject, message } });
}

export async function getCabinetReports(userId) {
  return request(`/cabinet/reports?userId=${encodeURIComponent(userId)}`);
}

export async function generateCabinetReport(userId, missionId) {
  return request("/cabinet/reports/generate", { method: "POST", body: { userId, missionId } });
}

export async function getCabinetProfile(userId) {
  return request(`/cabinet/profile?userId=${encodeURIComponent(userId)}`);
}

export async function updateCabinetProfile(userId, profile) {
  return request("/cabinet/profile", { method: "PUT", body: { userId, profile } });
}

export async function getPublicCabinetPage(slug) {
  return request(`/public/cabinet/${encodeURIComponent(slug)}`);
}
