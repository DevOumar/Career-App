// Routes auth — extrait automatiquement de backend/index.js (voir
// ARCHITECTURE.md). Toutes les dépendances (db, helpers, constantes) sont
// lues depuis app.locals.ctx, rempli une fois dans index.js après
// l'initialisation complète (DB ouverte, helpers définis).
export function registerAuthRoutes(app) {
  const {
    requireMatchingSession,
    mfa,
    cors,
    crypto,
    express,
    fs,
    fsPromises,
    dns,
    net,
    mammoth,
    nodemailer,
    path,
    PDFParse,
    fileURLToPath,
    PGlite,
    pg,
    OAuth2Client,
    Stripe,
    OFFERS,
    EDUCATION_LEVELS,
    SKILL_KEYWORDS,
    buildLocalMatchInsights,
    PLANS,
    getPlanById,
    applyStripeWebhookEvent,
    buildCheckoutSessionParams,
    resolveStripeMode,
    resolveStripePriceEnvVar,
    getRealSalaryReference,
    BASE_PORT,
    PORT_RETRY_COUNT,
    LOCAL_ORIGIN_PATTERN,
    ACCOUNT_TYPES,
    CANDIDATE_TYPES,
    RECRUITER_TYPES,
    ADMIN_MODULE_IDS,
    sanitizeAdminModules,
    __filename,
    __dirname,
    PROJECT_ROOT,
    PROJECT_DATA_DIR,
    LEGACY_DATA_DIR,
    LOCAL_APP_ROOT,
    RUNTIME_DATA_DIR,
    CUSTOM_DATA_DIR,
    SMTP_HOST,
    SMTP_PORT,
    SMTP_SECURE,
    AI_PROVIDER,
    AI_MODEL,
    XAI_API_KEY,
    GROQ_API_KEY,
    OPENAI_API_KEY,
    AI_TIMEOUT_MS,
    SMTP_USER,
    SMTP_PASS,
    MAIL_FROM_NAME,
    MAIL_FROM,
    MAIL_FROM_ADDRESS,
    AUTH_EMAIL_TO,
    AUTH_SKIP_SIGNUP_OTP,
    DATABASE_URL,
    GOOGLE_CLIENT_ID,
    googleOAuthClient,
    STRIPE_SECRET_KEY,
    STRIPE_WEBHOOK_SECRET,
    APP_URL,
    stripe,
    loadLocalEnv,
    uniquePaths,
    isDataDirectoryCorrupted,
    createDirectorySafe,
    prepareDataDirectory,
    buildRecoveryDirectory,
    createDbFromDirectory,
    openEmbeddedPostgres,
    openSupabasePostgres,
    openDatabase,
    isCareerApiRunning,
    startServer,
    db,
    dataDirectory,
    DEFAULT_PROFILE,
    nowIso,
    normalizeText,
    normalizeEmail,
    normalizeUsername,
    validateUsernameInput,
    buildUsername,
    normalizeSkillList,
    stripNullBytes,
    coerceString,
    coerceInteger,
    sanitizeAccountType,
    hashPassword,
    createPasswordRecord,
    verifyPassword,
    createSixDigitCode,
    hashSessionToken,
    addMinutes,
    escapeHtml,
    buildVerificationEmail,
    getMailTransporter,
    buildAnnouncementEmail,
    resolveAnnouncementAudience,
    sendVerificationEmail,
    createEmailVerificationCode,
    getRequestIp,
    getRequestUserAgent,
    getDeviceName,
    getBrowserName,
    createSessionForRequest,
    ensureUserCanAuthenticate,
    logSecurityEvent,
    parseJsonField,
    getCvExtractionStatus,
    summarizeCvParsed,
    ensureCvStorageSchema,
    getAdminCvRows,
    getMatchPayloadSummary,
    sanitizeProfilePatch,
    sanitizeCandidateDetails,
    sanitizeRecruiterDetails,
    sanitizeOrgDetails,
    sanitizeOnboardingPayload,
    applyOnboardingToProfile,
    fetchRemoteAvatarAsDataUrl,
    normalizeAvatarDataUrl,
    cleanExtractedText,
    bufferFromBase64,
    extractTextFromUpload,
    CV_EXTRACTION_SCHEMA,
    aiExtractionConfig,
    normalizeAiList,
    normalizeAiCollection,
    sanitizeAiCvExtraction,
    JOB_EXTRACTION_SCHEMA,
    JOB_SOFT_SKILLS,
    extractLocalJobSummary,
    sanitizeAiJobExtraction,
    extractJobWithAi,
    MATCH_ANALYSIS_SCHEMA,
    RECOMMENDATION_LEVELS,
    sanitizeAiMatchAnalysis,
    analyzeMatchWithAi,
    COVER_LETTER_SCHEMA,
    TONE_LABELS,
    buildLocalCoverLetter,
    sanitizeAiCoverLetter,
    generateCoverLetterWithAi,
    CV_ATS_OPTIMIZATION_SCHEMA,
    sanitizeAiCvOptimization,
    generateCvAtsOptimizationWithAi,
    NEGOTIATION_REPLY_SCHEMA,
    NEGOTIATION_SUMMARY_SCHEMA,
    localNegotiationReply,
    localNegotiationSummary,
    negotiationReplyWithAi,
    parseCvLocally,
    CV_SKILL_LABELS,
    DATE_MONTH_PATTERN,
    DATE_RANGE_PATTERN,
    uniqueByNormalized,
    compactKey,
    detectSkillsFromText,
    extractRobustLinkedin,
    repairLinkedinWithName,
    formatFrenchPhone,
    cleanLocation,
    extractProfessionalSummary,
    extractHeadline,
    cleanExperienceDate,
    escapeRegex,
    findDateNearCompany,
    textWindowAroundCompany,
    dateAfterLabel,
    cleanRole,
    hasRoleLikeText,
    detectExperiencesFromText,
    detectEducationFromText,
    normalizeExperienceForReview,
    mergeExperiencesForReview,
    mergeEducationForReview,
    cleanCertificationName,
    detectCertificationsFromText,
    mergeCertificationsForReview,
    mergeCollections,
    textLeaksSummary,
    postProcessCvExtraction,
    repairTruncatedJson,
    estimateTokenCount,
    computeMaxCompletionTokens,
    extractCvWithAi,
    requireFields,
    getUserRowById,
    getEffectivePlanById,
    requireAdmin,
    PLATFORM_SETTING_DEFAULTS,
    platformSettingsCache,
    loadPlatformSettings,
    getPlatformSetting,
    getPlatformSettingBool,
    setPlatformSetting,
    getUserRowByEmail,
    getUserRowByAnyEmail,
    getEmailRowsForUser,
    getUserRowByUsername,
    getUserRowByIdentifier,
    buildUniqueUsername,
    ensureUsernames,
    getAccountRows,
    toPublicUser,
    getPublicUserById,
    upsertUserAccount,
    upsertCandidateProfile,
    upsertRecruiterProfile,
    upsertOrgProfile,
    clearUnusedRoleProfiles,
    upsertRoleDetails,
    ensureAccountRowsForLegacyUsers,
    seedOffersIfNeeded,
    getCvCount,
    getMatchScores,
    scorePremiumEligibility,
    computePremiumAccess,
    generateLicenseCodeForPlan,
    generateLicenseCode,
    applyPlanToUser,
    SATISFACTION_COOLDOWN_MS,
    csvCell,
    toCsv,
    sendCsv,
    requireSchoolOwner,
    getSchoolLicenseCodeRows,
    getSchoolStudentRows,
    getSchoolOrgProfile,
    buildSchoolMetrics,
    buildSchoolAlerts,
    slugifyForEmail,
    companyNameToDomain,
    generateEmailCandidates,
    probeSmtp,
    JOB_APPLICATION_STATUSES,
    toPublicJobApplication
  } = app.locals.ctx;

// Premier facteur validé (mot de passe, Google ou réinitialisation) : si le
// compte a une double authentification, on ne crée PAS de session — on
// renvoie un ticket court à échanger contre la session une fois le second
// facteur vérifié (voir routes/mfa.js, POST /api/auth/mfa/verify).
async function finishFirstFactor(req, res, user, firstFactor, eventType, eventMeta = {}) {
  const methods = await mfa.loginMethods(user.id);
  if (methods.length) {
    const mfaTicket = await mfa.createLoginTicket(user.id, firstFactor);
    await logSecurityEvent(req, user.id, "mfa_challenge_started", { firstFactor });
    return res.json({ mfaRequired: true, mfaTicket, methods });
  }
  const token = await createSessionForRequest(req, user.id);
  await logSecurityEvent(req, user.id, eventType, eventMeta);
  return res.json({ token, user: await getPublicUserById(user.id) });
}

app.post("/api/auth/register", async (req, res) => {
  try {
    requireFields(req.body, ["firstName", "lastName", "email", "password"]);

    const firstName = coerceString(req.body.firstName);
    const lastName = coerceString(req.body.lastName);
    const email = normalizeEmail(req.body.email);
    const usernameError = validateUsernameInput(req.body.username || "");
    if (usernameError) {
      return res.status(400).json({ error: usernameError });
    }
    const requestedUsername = normalizeUsername(req.body.username || "");
    const password = String(req.body.password || "");

    const accountType = sanitizeAccountType(req.body.accountType || "candidate");
    if (accountType === "admin") {
      return res.status(403).json({ error: "Inscription non autorisée pour ce type de compte." });
    }
    const onboardingPayload = sanitizeOnboardingPayload(accountType, req.body.onboarding || {});

    if (!email.includes("@")) {
      return res.status(400).json({ error: "Email invalide." });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: "Le mot de passe doit contenir au moins 8 caractères." });
    }

    const existingUser = await getUserRowByAnyEmail(email);
    // Un compte jamais vérifié (inscription abandonnée avant le code) ne
    // bloque pas l'adresse : sinon n'importe qui pourrait « réserver » l'e-mail
    // d'autrui. On le remplace par la nouvelle inscription.
    const reusableUnverified =
      existingUser && !existingUser.email_verified_at && !existingUser.google_id ? existingUser : null;
    if (existingUser && !reusableUnverified) {
      return res.status(409).json({ error: "Un compte existe déjà avec cet email." });
    }

    if (requestedUsername) {
      const usernameOwner = await getUserRowByUsername(requestedUsername);
      if (usernameOwner && usernameOwner.id !== reusableUnverified?.id) {
        return res.status(409).json({ error: "Ce nom d'utilisateur est deja utilise." });
      }
    }

    const id = reusableUnverified?.id || `usr-${crypto.randomUUID()}`;
    const createdAt = nowIso();
    const passwordRecord = createPasswordRecord(password);
    const avatarDataUrl = normalizeAvatarDataUrl(req.body.avatarDataUrl || "");
    const username = requestedUsername || (await buildUniqueUsername(firstName, lastName, email));

    const seededProfile = applyOnboardingToProfile(
      { ...DEFAULT_PROFILE },
      onboardingPayload.accountType,
      onboardingPayload.details
    );
    // Bascule démo (AUTH_SKIP_SIGNUP_OTP) : l'adresse est tenue pour vérifiée.
    const verifiedAt = AUTH_SKIP_SIGNUP_OTP ? createdAt : "";

    if (reusableUnverified) {
      await db.query(
        `UPDATE users SET first_name = $1, last_name = $2, username = $3, password_hash = $4, password_salt = $5,
           updated_at = $6, role_type = $7, avatar_data_url = $8, profile_json = $9, password_set = 1,
           email_verified_at = $10, failed_login_attempts = 0, locked_until = ''
         WHERE id = $11`,
        [
          firstName,
          lastName,
          username,
          passwordRecord.hash,
          passwordRecord.salt,
          createdAt,
          onboardingPayload.accountType,
          avatarDataUrl,
          JSON.stringify(seededProfile),
          verifiedAt,
          id
        ]
      );
    } else {
      await db.query(
        `INSERT INTO users (
          id, first_name, last_name, email, username, password_hash, password_salt, created_at,
          updated_at, role_type, avatar_data_url, profile_json, subscription_json, password_set, email_verified_at
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,1,$14)`,
        [
          id,
          firstName,
          lastName,
          email,
          username,
          passwordRecord.hash,
          passwordRecord.salt,
          createdAt,
          createdAt,
          onboardingPayload.accountType,
          avatarDataUrl,
          JSON.stringify(seededProfile),
          JSON.stringify({
            plan: "free",
            status: "active",
            startedAt: createdAt,
            renewalAt: null
          }),
          verifiedAt
        ]
      );
      await db.query(
        `INSERT INTO user_email_addresses (id, user_id, email, is_primary, is_verified, created_at, updated_at)
         VALUES ($1,$2,$3,1,$4,$5,$6)`,
        [`eml-${crypto.randomUUID()}`, id, email, verifiedAt ? 1 : 0, createdAt, createdAt]
      );
    }

    await upsertUserAccount(id, onboardingPayload.accountType, onboardingPayload.base, avatarDataUrl);
    await upsertRoleDetails(id, onboardingPayload.accountType, onboardingPayload.details);

    const publicUser = await getPublicUserById(id);

    // Bascule temporaire (démo/soutenance) : on saute l'envoi du code et on
    // connecte directement — voir AUTH_SKIP_SIGNUP_OTP dans index.js.
    if (AUTH_SKIP_SIGNUP_OTP) {
      const token = await createSessionForRequest(req, id);
      await logSecurityEvent(req, id, "login_password", { method: "signup_no_otp" });
      return res.status(201).json({ user: publicUser, token });
    }

    const verification = await createEmailVerificationCode({ id, email, first_name: firstName }, "signup", email);

    return res.status(201).json({
      user: publicUser,
      verification: { email: verification.email, expiresAt: verification.expiresAt, resendAfterSeconds: 30 }
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ error: error.message || "Erreur serveur." });
  }
});

const LOGIN_MAX_ATTEMPTS = 5;
const LOGIN_LOCKOUT_MINUTES = 15;

app.post("/api/auth/login", async (req, res) => {
  try {
    const identifier = coerceString(req.body?.identifier || req.body?.email);
    const password = String(req.body?.password || "");
    if (!identifier || !password) {
      return res.status(400).json({ error: "Identifiant et mot de passe requis." });
    }

    const user = await getUserRowByIdentifier(identifier);
    if (!user) {
      return res.status(401).json({ error: "Identifiants invalides." });
    }

    // Compte verrouillé suite à trop d'échecs récents : on ne teste même
    // pas le mot de passe (évite de laisser une chance supplémentaire
    // pendant le verrouillage, et limite le travail fait par requête).
    const lockedUntil = user.locked_until ? new Date(user.locked_until).getTime() : 0;
    if (lockedUntil && lockedUntil > Date.now()) {
      const minutesLeft = Math.max(1, Math.ceil((lockedUntil - Date.now()) / 60000));
      return res.status(429).json({
        error: `Trop de tentatives échouées. Réessayez dans ${minutesLeft} min ou réinitialisez votre mot de passe.`
      });
    }

    // Compte créé avec Google, jamais doté d'un mot de passe : on l'oriente
    // vers Google ou la création d'un mot de passe (lien par e-mail).
    if (Number(user.password_set ?? 1) !== 1) {
      return res.status(409).json({
        error: "Ce compte a été créé avec Google et n'a pas encore de mot de passe. Continuez avec Google, ou créez un mot de passe.",
        code: "PASSWORD_NOT_SET"
      });
    }

    if (!verifyPassword(password, user.password_salt, user.password_hash)) {
      const attempts = Number(user.failed_login_attempts || 0) + 1;
      if (attempts >= LOGIN_MAX_ATTEMPTS) {
        await db.query(
          "UPDATE users SET failed_login_attempts = 0, locked_until = $1 WHERE id = $2",
          [addMinutes(new Date(), LOGIN_LOCKOUT_MINUTES), user.id]
        );
        await logSecurityEvent(req, user.id, "login_locked", { method: "password", attempts });
      } else {
        await db.query("UPDATE users SET failed_login_attempts = $1 WHERE id = $2", [attempts, user.id]);
      }
      return res.status(401).json({ error: "Identifiants invalides." });
    }

    ensureUserCanAuthenticate(user);

    if (Number(user.failed_login_attempts || 0) > 0 || user.locked_until) {
      await db.query("UPDATE users SET failed_login_attempts = 0, locked_until = '' WHERE id = $1", [user.id]);
    }

    // Adresse jamais vérifiée (inscription interrompue avant le code) : pas
    // de session, on renvoie un code de vérification. Le mot de passe étant
    // correct, cette réponse ne révèle rien à un tiers.
    if (!user.email_verified_at) {
      const verification = await createEmailVerificationCode(user, "signup", user.email);
      return res.status(403).json({
        error: "Vérifiez d'abord votre adresse e-mail : un code vient de vous être envoyé.",
        code: "EMAIL_NOT_VERIFIED",
        verification: { email: verification.email, expiresAt: verification.expiresAt, resendAfterSeconds: 30 }
      });
    }

    return finishFirstFactor(req, res, user, "password", "login_password", { method: "password" });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ error: error.message || "Erreur serveur." });
  }
});

app.post("/api/auth/google", async (req, res) => {
  try {
    if (!googleOAuthClient) {
      return res.status(500).json({ error: "Connexion Google non configurée sur le serveur." });
    }
    if (!getPlatformSettingBool("google_signin_enabled")) {
      return res.status(503).json({ error: "La connexion Google est temporairement désactivée." });
    }
    const credential = coerceString(req.body?.credential);
    if (!credential) {
      return res.status(400).json({ error: "Jeton Google manquant." });
    }
    // "login" : bouton Google de l'écran de connexion — ne doit jamais créer
    // de compte silencieusement. "signup" (défaut, comportement historique) :
    // bouton Google de l'écran d'inscription — crée le compte s'il n'existe
    // pas encore, ou connecte directement s'il existe déjà (Google reste un
    // moyen d'auth valide même si le compte a été créé par email/mdp).
    const intent = coerceString(req.body?.intent) === "login" ? "login" : "signup";

    const ticket = await googleOAuthClient.verifyIdToken({ idToken: credential, audience: GOOGLE_CLIENT_ID });
    const payload = ticket.getPayload();
    if (!payload?.email) {
      return res.status(400).json({ error: "Impossible de récupérer l'email Google." });
    }

    const googleId = coerceString(payload.sub);
    const email = normalizeEmail(payload.email);

    let user = null;
    const { rows: byGoogleId } = await db.query("SELECT * FROM users WHERE google_id = $1 LIMIT 1", [googleId]);
    user = byGoogleId[0] || null;

    if (!user) {
      user = await getUserRowByAnyEmail(email);
      if (user) {
        await db.query("UPDATE users SET google_id = $1 WHERE id = $2", [googleId, user.id]);
      }
    }

    // Google certifie l'adresse (email_verified) : un compte existant encore
    // non vérifié le devient.
    if (user && !user.email_verified_at && payload.email_verified) {
      const verifiedAt = nowIso();
      await db.query("UPDATE users SET email_verified_at = $1 WHERE id = $2", [verifiedAt, user.id]);
      await db.query("UPDATE user_email_addresses SET is_verified = 1, updated_at = $1 WHERE user_id = $2 AND email = $3", [
        verifiedAt,
        user.id,
        email
      ]);
      user = await getUserRowById(user.id);
    }

    if (!user && intent === "login") {
      return res.status(404).json({
        error: "Aucun compte Career CV n'est associé à ce compte Google. Inscrivez-vous d'abord.",
        code: "NO_ACCOUNT_GOOGLE"
      });
    }

    if (!user) {
      const id = `usr-${crypto.randomUUID()}`;
      const createdAt = nowIso();
      const firstName = coerceString(payload.given_name) || coerceString(payload.name) || "Utilisateur";
      const lastName = coerceString(payload.family_name) || "";
      const passwordRecord = createPasswordRecord(crypto.randomUUID());
      const avatarDataUrl = await fetchRemoteAvatarAsDataUrl(payload.picture || "");
      const username = await buildUniqueUsername(firstName, lastName, email);
      const onboardingPayload = sanitizeOnboardingPayload("student", {});
      const seededProfile = applyOnboardingToProfile(
        { ...DEFAULT_PROFILE },
        onboardingPayload.accountType,
        onboardingPayload.details
      );

      await db.query(
        `INSERT INTO users (
          id, first_name, last_name, email, username, password_hash, password_salt, created_at,
          updated_at, role_type, avatar_data_url, profile_json, subscription_json, google_id,
          password_set, email_verified_at
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,0,$15)`,
        [
          id,
          firstName,
          lastName,
          email,
          username,
          passwordRecord.hash,
          passwordRecord.salt,
          createdAt,
          createdAt,
          onboardingPayload.accountType,
          avatarDataUrl,
          JSON.stringify(seededProfile),
          JSON.stringify({ plan: "free", status: "active", startedAt: createdAt, renewalAt: null }),
          googleId,
          // Adresse garantie par Google ; mot de passe à créer plus tard
          // (password_set = 0 : le hash aléatoire ci-dessus n'est connu de personne).
          createdAt
        ]
      );

      await upsertUserAccount(id, onboardingPayload.accountType, onboardingPayload.base, avatarDataUrl);
      await upsertRoleDetails(id, onboardingPayload.accountType, onboardingPayload.details);
      await db.query(
        `INSERT INTO user_email_addresses (id, user_id, email, is_primary, is_verified, created_at, updated_at)
         VALUES ($1,$2,$3,1,1,$4,$5)`,
        [`eml-${crypto.randomUUID()}`, id, email, createdAt, createdAt]
      );

      user = await getUserRowById(id);
    }
    ensureUserCanAuthenticate(user);

    return finishFirstFactor(req, res, user, "google", "login_google", { method: "google" });
  } catch (error) {
    return res.status(error.statusCode || 401).json({ error: error.message || "Connexion Google impossible." });
  }
});

// Code à 6 chiffres : sert UNIQUEMENT à vérifier l'adresse d'un compte qui
// ne l'est pas encore. La connexion par code e-mail n'existe plus (la
// connexion se fait par mot de passe ou Google, plus la double
// authentification éventuelle).
app.post("/api/auth/request-code", async (req, res) => {
  try {
    const identifier = coerceString(req.body?.identifier || req.body?.email);
    if (coerceString(req.body?.purpose) !== "signup") {
      return res.status(410).json({
        error: "La connexion par code e-mail n'est plus disponible. Connectez-vous avec votre mot de passe ou avec Google.",
        code: "EMAIL_CODE_LOGIN_REMOVED"
      });
    }
    const user = await getUserRowByIdentifier(identifier);
    if (!user) {
      // Message générique volontairement, pour ne pas révéler si un compte
      // existe pour cet identifiant (énumération de comptes).
      return res.status(401).json({ error: "Identifiants incorrects, veuillez réessayer." });
    }
    if (user.email_verified_at) {
      return res.status(400).json({ error: "Cette adresse est déjà vérifiée. Connectez-vous avec votre mot de passe.", code: "EMAIL_ALREADY_VERIFIED" });
    }
    ensureUserCanAuthenticate(user);

    const verification = await createEmailVerificationCode(user, "signup", user.email);
    return res.json({
      ok: true,
      email: verification.email,
      expiresAt: verification.expiresAt,
      resendAfterSeconds: 30
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ error: error.message || "Erreur serveur." });
  }
});

app.post("/api/auth/verify-code", async (req, res) => {
  try {
    const identifier = coerceString(req.body?.identifier || req.body?.email);
    const code = coerceString(req.body?.code).replace(/\D/g, "");
    if (coerceString(req.body?.purpose) !== "signup") {
      return res.status(410).json({
        error: "La connexion par code e-mail n'est plus disponible. Connectez-vous avec votre mot de passe ou avec Google.",
        code: "EMAIL_CODE_LOGIN_REMOVED"
      });
    }
    const user = await getUserRowByIdentifier(identifier);

    if (!user || code.length !== 6) {
      return res.status(401).json({ error: "Code invalide." });
    }
    // Déjà vérifiée : ce code ne peut pas servir de porte d'entrée sans mot de passe.
    if (user.email_verified_at) {
      return res.status(400).json({ error: "Cette adresse est déjà vérifiée. Connectez-vous avec votre mot de passe.", code: "EMAIL_ALREADY_VERIFIED" });
    }
    ensureUserCanAuthenticate(user);

    const { rows } = await db.query(
      `SELECT * FROM email_verification_codes
       WHERE user_id = $1 AND email = $2 AND purpose = 'signup' AND consumed_at = ''
       ORDER BY created_at DESC
       LIMIT 1`,
      [user.id, user.email]
    );
    const verification = rows[0];

    if (!verification) {
      return res.status(401).json({ error: "Demande de code introuvable." });
    }
    if (new Date(verification.expires_at).getTime() < Date.now()) {
      return res.status(401).json({ error: "Code expiré. Demandez un nouveau code." });
    }
    if (Number(verification.attempts || 0) >= 5) {
      return res.status(429).json({ error: "Trop de tentatives. Demandez un nouveau code." });
    }

    const valid = verifyPassword(code, verification.code_salt, verification.code_hash);
    if (!valid) {
      await db.query("UPDATE email_verification_codes SET attempts = attempts + 1 WHERE id = $1", [verification.id]);
      return res.status(401).json({ error: "Code invalide." });
    }

    const verifiedAt = nowIso();
    await db.query("UPDATE email_verification_codes SET consumed_at = $1 WHERE id = $2", [verifiedAt, verification.id]);
    await db.query("UPDATE users SET email_verified_at = $1 WHERE id = $2", [verifiedAt, user.id]);
    await db.query("UPDATE user_email_addresses SET is_verified = 1, updated_at = $1 WHERE user_id = $2 AND email = $3", [
      verifiedAt,
      user.id,
      user.email
    ]);

    const token = await createSessionForRequest(req, user.id);
    await logSecurityEvent(req, user.id, "signup_email_code", { method: "email_code", email: user.email });

    return res.json({ token, user: await getPublicUserById(user.id) });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ error: error.message || "Erreur serveur." });
  }
});

// Demande de réinitialisation : réutilise la même infrastructure de code à
// 6 chiffres que le login/signup (table email_verification_codes, purpose
// dédié "reset"), pour ne pas dupliquer la logique d'envoi/expiration.
// Ne révèle jamais si l'identifiant correspond à un compte existant (même
// réponse générique dans les deux cas) pour ne pas permettre d'énumérer les
// comptes enregistrés via ce formulaire.
app.post("/api/auth/forgot-password", async (req, res) => {
  try {
    const identifier = coerceString(req.body?.identifier || req.body?.email);
    if (!identifier) {
      return res.status(400).json({ error: "Identifiant requis." });
    }

    const genericResponse = { ok: true, resendAfterSeconds: 30 };
    const user = await getUserRowByIdentifier(identifier);
    if (!user) {
      // Compte inexistant : on répond quand même "ok" (pas d'énumération),
      // simplement sans envoyer d'email.
      return res.json(genericResponse);
    }

    const loginEmail = identifier.includes("@") ? normalizeEmail(identifier) : user.email;
    const verification = await createEmailVerificationCode(user, "reset", loginEmail);
    await logSecurityEvent(req, user.id, "password_reset_requested", { email: loginEmail });
    return res.json({ ...genericResponse, email: verification.email, expiresAt: verification.expiresAt });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ error: error.message || "Erreur serveur." });
  }
});

app.post("/api/auth/reset-password", async (req, res) => {
  try {
    const identifier = coerceString(req.body?.identifier || req.body?.email);
    const code = coerceString(req.body?.code).replace(/\D/g, "");
    const newPassword = String(req.body?.newPassword || "");

    if (newPassword.length < 8) {
      return res.status(400).json({ error: "Le nouveau mot de passe doit contenir au moins 8 caractères." });
    }

    const user = await getUserRowByIdentifier(identifier);
    const loginEmail = identifier.includes("@") ? normalizeEmail(identifier) : user?.email;
    if (!user || code.length !== 6) {
      return res.status(401).json({ error: "Code invalide." });
    }

    const { rows } = await db.query(
      `SELECT * FROM email_verification_codes
       WHERE user_id = $1 AND email = $2 AND purpose = 'reset' AND consumed_at = ''
       ORDER BY created_at DESC
       LIMIT 1`,
      [user.id, loginEmail]
    );
    const verification = rows[0];

    if (!verification) {
      return res.status(401).json({ error: "Demande de réinitialisation introuvable." });
    }
    if (new Date(verification.expires_at).getTime() < Date.now()) {
      return res.status(401).json({ error: "Code expiré. Demandez un nouveau code." });
    }
    if (Number(verification.attempts || 0) >= 5) {
      return res.status(429).json({ error: "Trop de tentatives. Demandez un nouveau code." });
    }

    const valid = verifyPassword(code, verification.code_salt, verification.code_hash);
    if (!valid) {
      await db.query("UPDATE email_verification_codes SET attempts = attempts + 1 WHERE id = $1", [verification.id]);
      return res.status(401).json({ error: "Code invalide." });
    }

    await db.query("UPDATE email_verification_codes SET consumed_at = $1 WHERE id = $2", [nowIso(), verification.id]);

    const next = createPasswordRecord(newPassword);
    const resetAt = nowIso();
    await db.query(
      // On lève aussi le verrouillage éventuel (5 tentatives échouées) :
      // prouver la possession de l'email est une preuve d'identité au moins
      // aussi forte qu'un mot de passe correct. Le lien prouve aussi la
      // possession de l'adresse (vérifiée si elle ne l'était pas) ; pour un
      // compte Google, c'est ainsi qu'il obtient son premier mot de passe.
      `UPDATE users SET password_hash = $1, password_salt = $2, failed_login_attempts = 0, locked_until = '',
         updated_at = $3, password_set = 1,
         email_verified_at = CASE WHEN email_verified_at = '' THEN $3 ELSE email_verified_at END
       WHERE id = $4`,
      [next.hash, next.salt, resetAt, user.id]
    );

    // Un mot de passe réinitialisé invalide toutes les sessions actives
    // (y compris celle d'un éventuel attaquant qui aurait eu l'ancien mot de
    // passe) — l'utilisateur devra se reconnecter partout.
    await db.query("DELETE FROM sessions WHERE user_id = $1", [user.id]);

    await logSecurityEvent(req, user.id, "password_reset_completed", { email: loginEmail });

    // Le mot de passe est changé, mais la double authentification reste
    // exigée : sinon « mot de passe oublié » suffirait à la contourner.
    return finishFirstFactor(req, res, await getUserRowById(user.id), "password_reset", "login_password", { method: "password_reset" });
  } catch (error) {
    return res.status(500).json({ error: error.message || "Erreur serveur." });
  }
});

app.post("/api/auth/password", async (req, res) => {
  try {
    const authHeader = String(req.headers.authorization || "");
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
    const userId = coerceString(req.body?.userId);
    if (!requireMatchingSession(req, res, userId)) return;
    const currentPassword = String(req.body?.currentPassword || "");
    const newPassword = String(req.body?.newPassword || "");
    const logoutOtherSessions = Boolean(req.body?.logoutOtherSessions);

    if (!userId || !newPassword) {
      return res.status(400).json({ error: "Paramètres manquants pour changer le mot de passe." });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ error: "Le nouveau mot de passe doit contenir au moins 8 caractères." });
    }

    const user = await getUserRowById(userId);
    if (!user) {
      return res.status(404).json({ error: "Utilisateur introuvable." });
    }

    const sessionRows = token ? await db.query("SELECT user_id FROM sessions WHERE token = $1 LIMIT 1", [token]) : { rows: [] };
    const session = sessionRows.rows[0];
    if (!session || session.user_id !== userId) {
      return res.status(401).json({ error: "Session invalide." });
    }

    // L'ancien mot de passe est obligatoire dès qu'il existe (avant, il
    // n'était vérifié que s'il était fourni : l'omettre suffisait). Un compte
    // Google sans mot de passe en définit un premier depuis sa session.
    const hadPassword = Number(user.password_set ?? 1) === 1;
    if (hadPassword && !verifyPassword(currentPassword, user.password_salt, user.password_hash)) {
      return res.status(401).json({ error: "Mot de passe actuel incorrect." });
    }
    // Double authentification active : second facteur exigé à ce moment précis.
    if (!(await mfa.requireSecondFactor(req, res, userId))) return;

    const next = createPasswordRecord(newPassword);
    await db.query(
      "UPDATE users SET password_hash = $1, password_salt = $2, updated_at = $3, password_set = 1 WHERE id = $4",
      [next.hash, next.salt, nowIso(), userId]
    );

    if (logoutOtherSessions) {
      await db.query("DELETE FROM sessions WHERE user_id = $1 AND token <> $2", [userId, token]);
    }

    await logSecurityEvent(req, userId, hadPassword ? "password_changed" : "password_set", { logoutOtherSessions });
    const updatedUser = await getUserRowById(userId);
    return res.json({ user: await getPublicUserById(userId), premium: await computePremiumAccess(updatedUser) });
  } catch (error) {
    return res.status(500).json({ error: error.message || "Erreur serveur." });
  }
});

app.get("/api/auth/session", async (req, res) => {
  try {
    const authHeader = String(req.headers.authorization || "");
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
    if (!token) {
      return res.status(401).json({ error: "Session invalide." });
    }

    const sessionRows = await db.query("SELECT user_id, expires_at FROM sessions WHERE token = $1 LIMIT 1", [token]);
    const session = sessionRows.rows[0];
    if (!session) {
      return res.status(401).json({ error: "Session expirée." });
    }
    if (session.expires_at && new Date(session.expires_at).getTime() < Date.now()) {
      await db.query("DELETE FROM sessions WHERE token = $1", [token]);
      return res.status(401).json({ error: "Session expirée." });
    }

    await db.query(
      "UPDATE sessions SET last_seen_at = $1, user_agent = $2, ip_address = $3 WHERE token = $4",
      [nowIso(), getRequestUserAgent(req), getRequestIp(req), token]
    );

    const user = await getUserRowById(session.user_id);
    if (!user) {
      return res.status(404).json({ error: "Utilisateur introuvable." });
    }
    ensureUserCanAuthenticate(user);

    const premium = await computePremiumAccess(user);
    // Permet au front de savoir laquelle des sessions listées dans
    // user.sessions correspond à l'appareil actuel (voir Compte > Sécurité),
    // sans jamais lui exposer le token brut lui-même.
    return res.json({ user: await getPublicUserById(user.id), premium, currentSessionId: hashSessionToken(token) });
  } catch (error) {
    return res.status(500).json({ error: error.message || "Erreur serveur." });
  }
});

// Révoque une session précise (déconnecte un appareil listé dans Compte >
// Sécurité) sans manipuler le token brut : le front n'envoie que
// hashSessionToken(token) (voir toPublicUser), jamais le token lui-même —
// on retrouve la vraie session en re-hashant chaque token de l'utilisateur
// côté serveur jusqu'à trouver la correspondance.
app.delete("/api/auth/sessions/:sessionId", async (req, res) => {
  try {
    const userId = coerceString(req.body?.userId || req.query?.userId);
    if (!requireMatchingSession(req, res, userId)) return;
    const sessionId = coerceString(req.params.sessionId);
    if (!sessionId) {
      return res.status(400).json({ error: "sessionId requis." });
    }

    const { rows } = await db.query("SELECT token FROM sessions WHERE user_id = $1", [userId]);
    const match = rows.find((row) => hashSessionToken(row.token) === sessionId);
    if (!match) {
      return res.status(404).json({ error: "Session introuvable." });
    }

    await db.query("DELETE FROM sessions WHERE token = $1", [match.token]);
    await logSecurityEvent(req, userId, "session_revoked", {});
    return res.json({ ok: true });
  } catch (error) {
    return res.status(500).json({ error: error.message || "Erreur serveur." });
  }
});

// Déconnecte tous les appareils sauf celui qui fait la demande (Compte ›
// Sécurité › « Déconnecter tous les autres appareils »).
app.post("/api/auth/sessions/revoke-others", async (req, res) => {
  try {
    const userId = coerceString(req.body?.userId);
    if (!requireMatchingSession(req, res, userId)) return;
    const authHeader = String(req.headers.authorization || "");
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
    const { rowCount } = await db.query("DELETE FROM sessions WHERE user_id = $1 AND token <> $2", [userId, token]);
    await logSecurityEvent(req, userId, "session_revoked", { scope: "others", count: rowCount });
    return res.json({ ok: true, revoked: rowCount });
  } catch (error) {
    return res.status(500).json({ error: error.message || "Erreur serveur." });
  }
});

app.post("/api/auth/logout", async (req, res) => {
  try {
    const authHeader = String(req.headers.authorization || "");
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
    if (token) {
      await db.query("DELETE FROM sessions WHERE token = $1", [token]);
    }
    return res.json({ ok: true });
  } catch (error) {
    return res.status(500).json({ error: error.message || "Erreur serveur." });
  }
});
}
