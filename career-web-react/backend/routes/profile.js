// Routes profile — extrait automatiquement de backend/index.js (voir
// ARCHITECTURE.md). Toutes les dépendances (db, helpers, constantes) sont
// lues depuis app.locals.ctx, rempli une fois dans index.js après
// l'initialisation complète (DB ouverte, helpers définis).
export function registerProfileRoutes(app) {
  const {
    requireMatchingSession,
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

app.patch("/api/profile", async (req, res) => {
  try {
    const userId = coerceString(req.body?.userId);
    if (!requireMatchingSession(req, res, userId)) return;
    if (!userId) {
      return res.status(400).json({ error: "userId requis." });
    }

    const user = await getUserRowById(userId);
    if (!user) {
      return res.status(404).json({ error: "Utilisateur introuvable." });
    }

    const currentProfile = parseJsonField(user.profile_json, { ...DEFAULT_PROFILE });
    const patch = sanitizeProfilePatch(req.body?.patch || {});
    const nextProfile = {
      ...currentProfile,
      ...patch
    };

    await db.query("UPDATE users SET profile_json = $1, updated_at = $2 WHERE id = $3", [
      JSON.stringify(nextProfile),
      nowIso(),
      userId
    ]);

    const updatedUser = await getUserRowById(userId);
    const premium = await computePremiumAccess(updatedUser);
    return res.json({ user: await getPublicUserById(userId), premium });
  } catch (error) {
    return res.status(500).json({ error: error.message || "Erreur serveur." });
  }
});

app.patch("/api/account", async (req, res) => {
  try {
    const userId = coerceString(req.body?.userId);
    if (!requireMatchingSession(req, res, userId)) return;
    const patch = req.body?.patch || {};

    if (!userId) {
      return res.status(400).json({ error: "userId requis." });
    }

    const user = await getUserRowById(userId);
    if (!user) {
      return res.status(404).json({ error: "Utilisateur introuvable." });
    }

    const accountUserPatch = {};
    if (Object.prototype.hasOwnProperty.call(patch, "firstName")) accountUserPatch.firstName = coerceString(patch.firstName);
    if (Object.prototype.hasOwnProperty.call(patch, "lastName")) accountUserPatch.lastName = coerceString(patch.lastName);
    if (Object.prototype.hasOwnProperty.call(patch, "username")) {
      const usernameError = validateUsernameInput(patch.username, true);
      if (usernameError) {
        return res.status(400).json({ error: usernameError });
      }
      accountUserPatch.username = normalizeUsername(patch.username);
    }

    if (accountUserPatch.username) {
      const owner = await getUserRowByUsername(accountUserPatch.username);
      if (owner && owner.id !== userId) {
        return res.status(409).json({ error: "Ce nom d'utilisateur est déjà utilisé." });
      }
    }

    if (Object.keys(accountUserPatch).length) {
      await db.query(
        `UPDATE users
         SET first_name = $1,
             last_name = $2,
             username = $3,
             updated_at = $4
         WHERE id = $5`,
        [
          accountUserPatch.firstName || user.first_name,
          accountUserPatch.lastName || user.last_name,
          accountUserPatch.username || user.username || (await buildUniqueUsername(user.first_name, user.last_name, user.email)),
          nowIso(),
          userId
        ]
      );
    }

    const relations = await getAccountRows(userId);
    const currentAccountType = sanitizeAccountType(
      patch.accountType || relations.account?.account_type || user.role_type || "candidate"
    );

    const onboarding = sanitizeOnboardingPayload(currentAccountType, {
      phone: Object.prototype.hasOwnProperty.call(patch, "phone") ? patch.phone : relations.account?.phone,
      city: Object.prototype.hasOwnProperty.call(patch, "city") ? patch.city : relations.account?.city,
      country: Object.prototype.hasOwnProperty.call(patch, "country") ? patch.country : relations.account?.country,
      onboardingCompleted: Object.prototype.hasOwnProperty.call(patch, "onboardingCompleted")
        ? patch.onboardingCompleted
        : relations.account?.onboarding_completed,
      details: patch.details || {}
    });

    await db.query("UPDATE users SET role_type = $1, updated_at = $2 WHERE id = $3", [
      onboarding.accountType,
      nowIso(),
      userId
    ]);

    await upsertUserAccount(userId, onboarding.accountType, onboarding.base);
    await upsertRoleDetails(userId, onboarding.accountType, onboarding.details);

    const currentProfile = parseJsonField(user.profile_json, { ...DEFAULT_PROFILE });
    const nextProfile = applyOnboardingToProfile(currentProfile, onboarding.accountType, onboarding.details);
    await db.query("UPDATE users SET profile_json = $1, updated_at = $2 WHERE id = $3", [
      JSON.stringify(nextProfile),
      nowIso(),
      userId
    ]);

    const updatedUser = await getUserRowById(userId);
    const premium = await computePremiumAccess(updatedUser);
    return res.json({ user: await getPublicUserById(userId), premium });
  } catch (error) {
    return res.status(500).json({ error: error.message || "Erreur serveur." });
  }
});

app.post("/api/account/emails/request", async (req, res) => {
  try {
    const userId = coerceString(req.body?.userId);
    if (!requireMatchingSession(req, res, userId)) return;
    const email = normalizeEmail(req.body?.email);

    if (!userId || !email.includes("@")) {
      return res.status(400).json({ error: "Adresse e-mail invalide." });
    }

    const user = await getUserRowById(userId);
    if (!user) {
      return res.status(404).json({ error: "Utilisateur introuvable." });
    }

    const existing = await getUserRowByAnyEmail(email);
    if (existing && existing.id !== userId) {
      return res.status(409).json({ error: "Cette adresse e-mail est déjà utilisée par un autre compte." });
    }

    const ownEmails = await getEmailRowsForUser(userId);
    if (ownEmails.some((item) => normalizeEmail(item.email) === email)) {
      return res.status(409).json({ error: "Cette adresse e-mail est déjà liée à votre compte." });
    }

    const verification = await createEmailVerificationCode(user, "add_email", email);
    return res.json({
      ok: true,
      email: verification.email,
      expiresAt: verification.expiresAt,
      resendAfterSeconds: 30
    });
  } catch (error) {
    return res.status(500).json({ error: error.message || "Erreur serveur." });
  }
});

app.post("/api/account/emails/verify", async (req, res) => {
  try {
    const userId = coerceString(req.body?.userId);
    if (!requireMatchingSession(req, res, userId)) return;
    const email = normalizeEmail(req.body?.email);
    const code = coerceString(req.body?.code).replace(/\D/g, "");

    if (!userId || !email.includes("@") || code.length !== 6) {
      return res.status(400).json({ error: "Code ou adresse e-mail invalide." });
    }

    const user = await getUserRowById(userId);
    if (!user) {
      return res.status(404).json({ error: "Utilisateur introuvable." });
    }

    const { rows } = await db.query(
      `SELECT * FROM email_verification_codes
       WHERE user_id = $1 AND email = $2 AND purpose = 'add_email' AND consumed_at = ''
       ORDER BY created_at DESC
       LIMIT 1`,
      [userId, email]
    );
    const verification = rows[0];
    if (!verification) {
      return res.status(404).json({ error: "Aucun code actif pour cette adresse." });
    }
    if (new Date(verification.expires_at).getTime() < Date.now()) {
      return res.status(410).json({ error: "Le code a expiré. Renvoie un nouveau code." });
    }
    if (Number(verification.attempts || 0) >= 5) {
      return res.status(429).json({ error: "Trop de tentatives. Renvoie un nouveau code." });
    }
    if (!verifyPassword(code, verification.code_salt, verification.code_hash)) {
      await db.query("UPDATE email_verification_codes SET attempts = attempts + 1 WHERE id = $1", [verification.id]);
      return res.status(401).json({ error: "Code incorrect." });
    }

    const existing = await getUserRowByAnyEmail(email);
    if (existing && existing.id !== userId) {
      return res.status(409).json({ error: "Cette adresse e-mail est déjà utilisée par un autre compte." });
    }

    const timestamp = nowIso();
    await db.query("UPDATE email_verification_codes SET consumed_at = $1 WHERE id = $2", [timestamp, verification.id]);
    await db.query(
      `INSERT INTO user_email_addresses (id, user_id, email, is_primary, is_verified, created_at, updated_at)
       VALUES ($1,$2,$3,0,1,$4,$5)`,
      [`eml-${crypto.randomUUID()}`, userId, email, timestamp, timestamp]
    );

    return res.json({ user: await getPublicUserById(userId), premium: await computePremiumAccess(user) });
  } catch (error) {
    return res.status(500).json({ error: error.message || "Erreur serveur." });
  }
});

app.patch("/api/account/emails/primary", async (req, res) => {
  try {
    const userId = coerceString(req.body?.userId);
    if (!requireMatchingSession(req, res, userId)) return;
    const emailId = coerceString(req.body?.emailId);
    const user = await getUserRowById(userId);
    if (!user || !emailId) {
      return res.status(400).json({ error: "Paramètres invalides." });
    }

    const { rows } = await db.query(
      "SELECT * FROM user_email_addresses WHERE id = $1 AND user_id = $2 LIMIT 1",
      [emailId, userId]
    );
    const target = rows[0];
    if (!target) {
      return res.status(404).json({ error: "Adresse e-mail introuvable." });
    }
    if (!Number(target.is_verified || 0)) {
      return res.status(400).json({ error: "Cette adresse doit être vérifiée avant de devenir principale." });
    }

    const timestamp = nowIso();
    await db.query("UPDATE user_email_addresses SET is_primary = 0, updated_at = $1 WHERE user_id = $2", [timestamp, userId]);
    await db.query("UPDATE user_email_addresses SET is_primary = 1, updated_at = $1 WHERE id = $2", [timestamp, emailId]);
    await db.query("UPDATE users SET email = $1, updated_at = $2 WHERE id = $3", [target.email, timestamp, userId]);

    const updatedUser = await getUserRowById(userId);
    return res.json({ user: await getPublicUserById(userId), premium: await computePremiumAccess(updatedUser) });
  } catch (error) {
    return res.status(500).json({ error: error.message || "Erreur serveur." });
  }
});

app.delete("/api/account/emails", async (req, res) => {
  try {
    const userId = coerceString(req.body?.userId);
    if (!requireMatchingSession(req, res, userId)) return;
    const emailId = coerceString(req.body?.emailId);
    const { rows } = await db.query(
      "SELECT * FROM user_email_addresses WHERE id = $1 AND user_id = $2 LIMIT 1",
      [emailId, userId]
    );
    const target = rows[0];
    if (!target) {
      return res.status(404).json({ error: "Adresse e-mail introuvable." });
    }
    if (Number(target.is_primary || 0)) {
      return res.status(400).json({ error: "Impossible de supprimer l'adresse principale." });
    }

    await db.query("DELETE FROM user_email_addresses WHERE id = $1 AND user_id = $2", [emailId, userId]);
    const user = await getUserRowById(userId);
    return res.json({ user: await getPublicUserById(userId), premium: await computePremiumAccess(user) });
  } catch (error) {
    return res.status(500).json({ error: error.message || "Erreur serveur." });
  }
});

app.post("/api/account/connected-accounts/link-google", async (req, res) => {
  try {
    if (!googleOAuthClient) {
      return res.status(500).json({ error: "Connexion Google non configurée sur le serveur." });
    }
    const userId = coerceString(req.body?.userId);
    if (!requireMatchingSession(req, res, userId)) return;
    const credential = coerceString(req.body?.credential);
    const user = await getUserRowById(userId);
    if (!user || !credential) {
      return res.status(400).json({ error: "Paramètres invalides." });
    }

    const ticket = await googleOAuthClient.verifyIdToken({ idToken: credential, audience: GOOGLE_CLIENT_ID });
    const payload = ticket.getPayload();
    const googleId = coerceString(payload?.sub);
    if (!googleId) {
      return res.status(400).json({ error: "Compte Google invalide." });
    }

    const { rows: existing } = await db.query(
      "SELECT id FROM users WHERE google_id = $1 AND id <> $2 LIMIT 1",
      [googleId, userId]
    );
    if (existing.length) {
      return res.status(409).json({ error: "Ce compte Google est déjà lié à un autre compte Career CV." });
    }

    await db.query("UPDATE users SET google_id = $1 WHERE id = $2", [googleId, userId]);
    await logSecurityEvent(req, userId, "connected_account_linked", { provider: "google" });

    return res.json({ user: await getPublicUserById(userId), premium: await computePremiumAccess(user) });
  } catch (error) {
    return res.status(400).json({ error: error.message || "Liaison Google impossible." });
  }
});

app.post("/api/account/connected-accounts/remove", async (req, res) => {
  try {
    const userId = coerceString(req.body?.userId);
    if (!requireMatchingSession(req, res, userId)) return;
    const provider = coerceString(req.body?.provider || "google");
    const user = await getUserRowById(userId);
    if (!user) {
      return res.status(404).json({ error: "Utilisateur introuvable." });
    }

    if (provider === "google") {
      await db.query("UPDATE users SET google_id = '' WHERE id = $1", [userId]);
    }

    await logSecurityEvent(req, userId, "connected_account_removed", { provider });
    return res.json({ user: await getPublicUserById(userId), premium: await computePremiumAccess(user) });
  } catch (error) {
    return res.status(500).json({ error: error.message || "Erreur serveur." });
  }
});

// Export RGPD : toutes les données personnelles détenues sur ce compte, dans
// un seul JSON téléchargeable. Couvre les mêmes tables que la suppression de
// compte juste en dessous (garde les deux listes synchronisées si une
// nouvelle table liée à un utilisateur est ajoutée un jour).
app.get("/api/account/export", async (req, res) => {
  try {
    const userId = coerceString(req.query?.userId);
    if (!requireMatchingSession(req, res, userId)) return;

    const user = await getUserRowById(userId);
    if (!user) {
      return res.status(404).json({ error: "Utilisateur introuvable." });
    }

    const tables = [
      "user_email_addresses",
      "cvs",
      "match_runs",
      "negotiation_conversations",
      "cover_letters",
      "interview_conversations",
      "job_applications",
      "transactions",
      "account_security_events",
      "user_candidate_profiles",
      "user_recruiter_profiles",
      "user_org_profiles",
      "user_accounts"
    ];

    const results = await Promise.all(
      tables.map((table) =>
        db.query(`SELECT * FROM ${table} WHERE user_id = $1`, [userId]).catch(() => ({ rows: [] }))
      )
    );

    const data = { profile: user };
    tables.forEach((table, index) => {
      data[table] = results[index].rows;
    });

    // Jamais le hash/sel du mot de passe dans un export destiné à
    // l'utilisateur (même le sien) — aucune valeur exploitable pour se
    // faire passer pour lui ne doit sortir de la base par ce canal.
    delete data.profile.password_hash;
    delete data.profile.password_salt;
    delete data.profile.google_id;

    res.setHeader("Content-Disposition", `attachment; filename="career-cv-donnees-${userId}.json"`);
    return res.json({ exportedAt: nowIso(), userId, data });
  } catch (error) {
    return res.status(500).json({ error: error.message || "Erreur serveur." });
  }
});

app.delete("/api/account", async (req, res) => {
  try {
    const userId = coerceString(req.body?.userId);
    if (!requireMatchingSession(req, res, userId)) return;
    const confirmation = coerceString(req.body?.confirmation);

    if (!userId || confirmation !== "Supprimer le compte") {
      return res.status(400).json({ error: "Confirmation invalide." });
    }

    const user = await getUserRowById(userId);
    if (!user) {
      return res.status(404).json({ error: "Utilisateur introuvable." });
    }

    await logSecurityEvent(req, userId, "account_deleted", { email: user.email });
    await db.query("DELETE FROM sessions WHERE user_id = $1", [userId]);
    await db.query("DELETE FROM email_verification_codes WHERE user_id = $1", [userId]);
    await db.query("DELETE FROM user_email_addresses WHERE user_id = $1", [userId]);
    await db.query("DELETE FROM cvs WHERE user_id = $1", [userId]);
    await db.query("DELETE FROM match_runs WHERE user_id = $1", [userId]);
    await db.query("DELETE FROM negotiation_conversations WHERE user_id = $1", [userId]);
    await db.query("DELETE FROM cover_letters WHERE user_id = $1", [userId]);
    await db.query("DELETE FROM user_candidate_profiles WHERE user_id = $1", [userId]);
    await db.query("DELETE FROM user_recruiter_profiles WHERE user_id = $1", [userId]);
    await db.query("DELETE FROM user_org_profiles WHERE user_id = $1", [userId]);
    await db.query("DELETE FROM user_accounts WHERE user_id = $1", [userId]);
    await db.query("DELETE FROM users WHERE id = $1", [userId]);

    return res.json({ ok: true });
  } catch (error) {
    return res.status(500).json({ error: error.message || "Erreur serveur." });
  }
});

app.patch("/api/profile/avatar", async (req, res) => {
  try {
    const userId = coerceString(req.body?.userId);
    if (!requireMatchingSession(req, res, userId)) return;
    const avatarDataUrl = normalizeAvatarDataUrl(req.body?.avatarDataUrl || "");

    if (!userId) {
      return res.status(400).json({ error: "userId requis." });
    }

    const user = await getUserRowById(userId);
    if (!user) {
      return res.status(404).json({ error: "Utilisateur introuvable." });
    }

    await db.query("UPDATE users SET avatar_data_url = $1, updated_at = $2 WHERE id = $3", [
      avatarDataUrl,
      nowIso(),
      userId
    ]);

    const relations = await getAccountRows(userId);
    const accountType = sanitizeAccountType(relations.account?.account_type || user.role_type || "candidate");
    await upsertUserAccount(
      userId,
      accountType,
      {
        phone: relations.account?.phone || "",
        city: relations.account?.city || "",
        country: relations.account?.country || "",
        onboardingCompleted: Number(relations.account?.onboarding_completed || 0)
      },
      avatarDataUrl
    );

    const updatedUser = await getUserRowById(userId);
    const premium = await computePremiumAccess(updatedUser);
    return res.json({ user: await getPublicUserById(userId), premium });
  } catch (error) {
    return res.status(500).json({ error: error.message || "Erreur serveur." });
  }
});
}
