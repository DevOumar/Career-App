// Routes de double authentification (MFA) — voir backend/mfa.js.
//
// Deux familles :
//  1. Connexion (sans session) : le premier facteur a délivré un ticket ;
//     on l'échange ici contre une session une fois le second facteur vérifié.
//  2. Gestion (session requise) : activer / désactiver l'application TOTP,
//     ajouter / révoquer des clés de sécurité, régénérer les codes.
//
// Les actions de gestion sont SENSIBLES : elles exigent une confirmation
// d'identité récente (« step-up » : mot de passe, code de l'application ou
// clé de sécurité). Une confirmation réussie ouvre une fenêtre de 5 minutes
// sur la session courante, pour ne pas la redemander à chaque clic.
export function registerMfaRoutes(app) {
  const {
    mfa,
    db,
    nowIso,
    coerceString,
    verifyPassword,
    getUserRowById,
    getPublicUserById,
    createSessionForRequest,
    ensureUserCanAuthenticate,
    logSecurityEvent,
    requireMatchingSession,
    googleOAuthClient,
    GOOGLE_CLIENT_ID,
    getPlatformSettingBool
  } = app.locals.ctx;

  // Une confirmation Google n'est acceptée que si le jeton vient d'être émis
  // (reconnexion Google réelle, pas un vieux jeton rejoué).
  const GOOGLE_STEP_UP_MAX_AGE_SECONDS = 10 * 60;
  const googleStepUpAvailable = () => Boolean(googleOAuthClient && GOOGLE_CLIENT_ID) && getPlatformSettingBool("google_signin_enabled");

  async function verifyGoogleStepUp(user, credential) {
    if (!user.google_id || !googleStepUpAvailable() || !credential) return false;
    try {
      const ticket = await googleOAuthClient.verifyIdToken({ idToken: String(credential), audience: GOOGLE_CLIENT_ID });
      const payload = ticket.getPayload() || {};
      const freshEnough = Number(payload.iat || 0) >= Math.floor(Date.now() / 1000) - GOOGLE_STEP_UP_MAX_AGE_SECONDS;
      // Le compte Google utilisé doit être CELUI lié à ce compte Career CV.
      return String(payload.sub || "") === String(user.google_id) && freshEnough;
    } catch (_error) {
      return false;
    }
  }

  const STEP_UP_WINDOW_MINUTES = 5;
  const STEP_UP_MAX_FAILURES = 5;
  const STEP_UP_LOCK_MINUTES = 15;
  // Limite des échecs de confirmation d'identité, par compte (mémoire du
  // processus : suffisant pour freiner une attaque depuis une session volée).
  const stepUpFailures = new Map();

  const bearerToken = (req) => {
    const header = String(req.headers.authorization || "");
    return header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  };

  function sendError(res, error, fallback = "Erreur serveur.") {
    return res.status(error.statusCode || 500).json({ error: error.message || fallback, code: error.code });
  }

  // --------------------------------------------------------------- step-up
  async function stepUpMethods(user) {
    const state = await mfa.getState(user.id);
    const methods = [];
    if (Number(user.password_set ?? 1) === 1) methods.push("password");
    // Compte lié à Google : on peut aussi confirmer en se reconnectant à
    // Google (utile si le mot de passe est inconnu ou n'a jamais été choisi).
    if (user.google_id && googleStepUpAvailable()) methods.push("google");
    if (state.totp.active) methods.push("totp");
    if (state.securityKeys.length) methods.push("security_key");
    return methods;
  }

  async function hasRecentStepUp(req) {
    const token = bearerToken(req);
    if (!token) return false;
    const { rows } = await db.query("SELECT step_up_until FROM sessions WHERE token = $1", [token]);
    const until = rows[0]?.step_up_until;
    return Boolean(until && new Date(until).getTime() > Date.now());
  }

  async function grantStepUp(req) {
    const until = new Date(Date.now() + STEP_UP_WINDOW_MINUTES * 60000).toISOString();
    await db.query("UPDATE sessions SET step_up_until = $1 WHERE token = $2", [until, bearerToken(req)]);
  }

  /**
   * Vérifie la confirmation d'identité jointe à la requête (`stepUp`), ou une
   * confirmation récente sur cette session. Renvoie true si l'action peut
   * continuer ; sinon a déjà répondu (403 STEP_UP_REQUIRED + méthodes).
   */
  /**
   * `strong` : actions qui AFFAIBLISSENT la protection (désactiver
   * l'application, régénérer les codes, révoquer une clé). On exige alors une
   * preuve de possession du second facteur au moment même de l'action : code
   * de l'application, clé de sécurité ou code de récupération. Ni le mot de
   * passe, ni Google, ni une confirmation récente ne suffisent — sinon un
   * mot de passe volé permettrait de retirer la double authentification.
   */
  async function requireStepUp(req, res, user, { strong = false } = {}) {
    let methods = await stepUpMethods(user);
    if (strong) {
      const state = await mfa.getState(user.id);
      methods = methods.filter((method) => method === "totp" || method === "security_key");
      if (state.recoveryCodes.remaining > 0) methods.push("recovery_code");
    }
    // Compte Google sans mot de passe ni second facteur : la session est la
    // seule preuve disponible (c'est typiquement l'activation du 1er facteur).
    if (!methods.length) return true;
    if (!strong && (await hasRecentStepUp(req))) return true;

    const failures = stepUpFailures.get(user.id);
    if (failures && failures.lockedUntil > Date.now()) {
      res.status(429).json({ error: "Trop de tentatives. Réessayez dans quelques minutes.", code: "RATE_LIMITED" });
      return false;
    }

    const stepUp = req.body?.stepUp || null;
    if (!stepUp) {
      res.status(403).json({ error: "Confirmez votre identité pour continuer.", code: "STEP_UP_REQUIRED", methods });
      return false;
    }

    let ok = false;
    const method = coerceString(stepUp.method);
    if (method === "password" && methods.includes("password")) {
      ok = verifyPassword(String(stepUp.password || ""), user.password_salt, user.password_hash);
    } else if (method === "totp" && methods.includes("totp")) {
      ok = await mfa.checkTotp(user.id, stepUp.code);
    } else if (method === "security_key" && methods.includes("security_key")) {
      ok = await mfa.finishKeyAuthentication(req, user.id, "step_up", stepUp.response);
    } else if (method === "google" && methods.includes("google")) {
      ok = await verifyGoogleStepUp(user, stepUp.credential);
    } else if (method === "recovery_code" && methods.includes("recovery_code")) {
      ok = await mfa.consumeRecoveryCode(user.id, stepUp.code);
      if (ok) await logSecurityEvent(req, user.id, "mfa_recovery_code_used", { purpose: "step_up" });
    }

    if (!ok) {
      const current = stepUpFailures.get(user.id) || { count: 0, lockedUntil: 0 };
      current.count += 1;
      if (current.count >= STEP_UP_MAX_FAILURES) {
        current.count = 0;
        current.lockedUntil = Date.now() + STEP_UP_LOCK_MINUTES * 60000;
      }
      stepUpFailures.set(user.id, current);
      res.status(403).json({ error: "La confirmation a échoué.", code: "STEP_UP_FAILED", methods });
      return false;
    }

    stepUpFailures.delete(user.id);
    await grantStepUp(req);
    return true;
  }

  // Charge l'utilisateur de la session et vérifie qu'il correspond au userId annoncé.
  async function sessionUser(req, res) {
    const userId = coerceString(req.body?.userId || req.query?.userId);
    if (!requireMatchingSession(req, res, userId)) return null;
    const user = await getUserRowById(userId);
    if (!user) {
      res.status(404).json({ error: "Utilisateur introuvable." });
      return null;
    }
    return user;
  }

  // --------------------------------------------------------------- connexion : second facteur
  // Options WebAuthn pour se connecter avec une clé (ticket de connexion requis).
  app.post("/api/auth/mfa/key-options", async (req, res) => {
    try {
      const ticket = await mfa.readLoginTicket(coerceString(req.body?.ticket));
      if (!ticket) return res.status(401).json({ error: "Session de connexion expirée. Recommencez.", code: "TICKET_EXPIRED" });
      const options = await mfa.startKeyAuthentication(req, ticket.user_id, "login", ticket.id);
      return res.json({ options });
    } catch (error) {
      return sendError(res, error);
    }
  });

  app.post("/api/auth/mfa/verify", async (req, res) => {
    try {
      const ticket = await mfa.readLoginTicket(coerceString(req.body?.ticket));
      if (!ticket) return res.status(401).json({ error: "Session de connexion expirée. Recommencez.", code: "TICKET_EXPIRED" });

      const user = await getUserRowById(ticket.user_id);
      if (!user) return res.status(401).json({ error: "Session de connexion expirée. Recommencez.", code: "TICKET_EXPIRED" });
      ensureUserCanAuthenticate(user);

      const method = coerceString(req.body?.method);
      let ok = false;
      if (method === "totp") ok = await mfa.checkTotp(user.id, req.body?.code);
      else if (method === "recovery_code") ok = await mfa.consumeRecoveryCode(user.id, req.body?.code);
      else if (method === "security_key") ok = await mfa.finishKeyAuthentication(req, user.id, "login", req.body?.response);

      if (!ok) {
        const remaining = await mfa.failLoginTicket(ticket.id);
        await logSecurityEvent(req, user.id, "mfa_failed", { method });
        if (remaining <= 0) {
          await mfa.consumeLoginTicket(ticket.id);
          return res.status(401).json({ error: "Trop de tentatives. Recommencez la connexion.", code: "TICKET_EXPIRED" });
        }
        return res.status(401).json({ error: "Code incorrect ou expiré.", code: "MFA_INVALID" });
      }

      await mfa.consumeLoginTicket(ticket.id);
      const token = await createSessionForRequest(req, user.id);
      // La session vient de prouver le second facteur : fenêtre de confirmation ouverte.
      await db.query("UPDATE sessions SET step_up_until = $1 WHERE token = $2", [
        new Date(Date.now() + STEP_UP_WINDOW_MINUTES * 60000).toISOString(),
        token
      ]);
      await logSecurityEvent(req, user.id, ticket.first_factor === "google" ? "login_google" : "login_password", {
        method: ticket.first_factor,
        secondFactor: method
      });
      if (method === "recovery_code") await logSecurityEvent(req, user.id, "mfa_recovery_code_used", {});
      return res.json({ token, user: await getPublicUserById(user.id), firstFactor: ticket.first_factor });
    } catch (error) {
      return sendError(res, error);
    }
  });

  // --------------------------------------------------------------- gestion : état
  app.get("/api/auth/mfa/status", async (req, res) => {
    try {
      const user = await sessionUser(req, res);
      if (!user) return;
      const state = await mfa.getState(user.id);
      return res.json({ ...state, hasPassword: Number(user.password_set ?? 1) === 1 });
    } catch (error) {
      return sendError(res, error);
    }
  });

  // Options WebAuthn pour confirmer son identité avec une clé (step-up).
  app.post("/api/auth/mfa/step-up/key-options", async (req, res) => {
    try {
      const user = await sessionUser(req, res);
      if (!user) return;
      const options = await mfa.startKeyAuthentication(req, user.id, "step_up");
      return res.json({ options });
    } catch (error) {
      return sendError(res, error);
    }
  });

  // --------------------------------------------------------------- application d'authentification
  app.post("/api/auth/mfa/totp/start", async (req, res) => {
    try {
      const user = await sessionUser(req, res);
      if (!user) return;
      if (!(await requireStepUp(req, res, user))) return;
      const enrollment = await mfa.startTotpEnrollment(user.id, user.email);
      return res.json(enrollment);
    } catch (error) {
      return sendError(res, error);
    }
  });

  app.post("/api/auth/mfa/totp/confirm", async (req, res) => {
    try {
      const user = await sessionUser(req, res);
      if (!user) return;
      const result = await mfa.confirmTotpEnrollment(user.id, req.body?.code);
      if (!result.ok) {
        return res.status(400).json({ error: "Code incorrect ou expiré.", code: result.error === "no_pending" ? "NO_PENDING" : "MFA_INVALID" });
      }
      await logSecurityEvent(req, user.id, "mfa_totp_enabled", {});
      // Premier facteur activé : on remet un jeu de codes de secours.
      const state = await mfa.getState(user.id);
      const recoveryCodes = state.recoveryCodes.remaining === 0 ? await mfa.regenerateRecoveryCodes(user.id) : null;
      return res.json({ ok: true, recoveryCodes });
    } catch (error) {
      return sendError(res, error);
    }
  });

  app.post("/api/auth/mfa/totp/cancel", async (req, res) => {
    try {
      const user = await sessionUser(req, res);
      if (!user) return;
      await mfa.cancelTotpEnrollment(user.id);
      return res.json({ ok: true });
    } catch (error) {
      return sendError(res, error);
    }
  });

  app.post("/api/auth/mfa/totp/disable", async (req, res) => {
    try {
      const user = await sessionUser(req, res);
      if (!user) return;
      if (!(await requireStepUp(req, res, user, { strong: true }))) return;
      await mfa.disableTotp(user.id);
      await logSecurityEvent(req, user.id, "mfa_totp_disabled", {});
      return res.json({ ok: true });
    } catch (error) {
      return sendError(res, error);
    }
  });

  // --------------------------------------------------------------- codes de récupération
  app.post("/api/auth/mfa/recovery-codes", async (req, res) => {
    try {
      const user = await sessionUser(req, res);
      if (!user) return;
      const state = await mfa.getState(user.id);
      if (!state.enabled) return res.status(400).json({ error: "Activez d'abord un second facteur." });
      if (!(await requireStepUp(req, res, user, { strong: true }))) return;
      const recoveryCodes = await mfa.regenerateRecoveryCodes(user.id);
      await logSecurityEvent(req, user.id, "mfa_recovery_regenerated", {});
      return res.json({ recoveryCodes });
    } catch (error) {
      return sendError(res, error);
    }
  });

  // --------------------------------------------------------------- clés de sécurité
  app.post("/api/auth/mfa/keys/options", async (req, res) => {
    try {
      const user = await sessionUser(req, res);
      if (!user) return;
      if (!(await requireStepUp(req, res, user))) return;
      const options = await mfa.startKeyRegistration(req, user);
      return res.json({ options });
    } catch (error) {
      return sendError(res, error);
    }
  });

  app.post("/api/auth/mfa/keys", async (req, res) => {
    try {
      const user = await sessionUser(req, res);
      if (!user) return;
      const name = coerceString(req.body?.name).slice(0, 64);
      if (!name) return res.status(400).json({ error: "Donnez un nom à la clé." });
      const result = await mfa.finishKeyRegistration(req, user.id, name, req.body?.response);
      if (!result.ok) {
        const message =
          result.error === "conflict"
            ? "Cette clé est déjà enregistrée."
            : result.error === "expired"
            ? "Délai dépassé. Recommencez l'ajout de la clé."
            : "L'opération avec la clé de sécurité a échoué.";
        return res.status(400).json({ error: message, code: result.error.toUpperCase() });
      }
      await logSecurityEvent(req, user.id, "mfa_key_added", { name });
      const state = await mfa.getState(user.id);
      const recoveryCodes = state.recoveryCodes.remaining === 0 ? await mfa.regenerateRecoveryCodes(user.id) : null;
      return res.json({ ok: true, recoveryCodes });
    } catch (error) {
      return sendError(res, error);
    }
  });

  app.delete("/api/auth/mfa/keys/:keyId", async (req, res) => {
    try {
      const user = await sessionUser(req, res);
      if (!user) return;
      if (!(await requireStepUp(req, res, user, { strong: true }))) return;
      const removed = await mfa.revokeKey(user.id, coerceString(req.params.keyId));
      if (!removed) return res.status(404).json({ error: "Clé introuvable." });
      await logSecurityEvent(req, user.id, "mfa_key_revoked", {});
      return res.json({ ok: true });
    } catch (error) {
      return sendError(res, error);
    }
  });
}
