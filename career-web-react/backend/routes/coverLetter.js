// Routes coverLetter — extrait automatiquement de backend/index.js (voir
// ARCHITECTURE.md). Toutes les dépendances (db, helpers, constantes) sont
// lues depuis app.locals.ctx, rempli une fois dans index.js après
// l'initialisation complète (DB ouverte, helpers définis).
export function registerCoverLetterRoutes(app) {
  const {
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

app.post("/api/coverletter/generate", async (req, res) => {
  try {
    const candidate = req.body?.candidate && typeof req.body.candidate === "object" ? req.body.candidate : {};
    const offer = req.body?.offer && typeof req.body.offer === "object" ? req.body.offer : {};
    const tone = coerceString(req.body?.tone) || "formal";
    const language = req.body?.language === "en" ? "en" : "fr";

    let letterResult = null;
    let provider = "local";
    try {
      letterResult = await generateCoverLetterWithAi(candidate, offer, tone, language);
      if (letterResult) provider = AI_PROVIDER === "grok" ? "xai" : AI_PROVIDER;
    } catch (aiError) {
      letterResult = null;
      console.warn(`Generation IA de la lettre indisponible: ${aiError.message}`);
    }

    const result = letterResult || buildLocalCoverLetter(candidate, offer, language);
    return res.json({ letter: result.letter, subject: result.subject, provider });
  } catch (error) {
    return res.status(400).json({ error: error.message || "Generation de la lettre impossible." });
  }
});

app.get("/api/coverletter/conversations", async (req, res) => {
  try {
    const userId = coerceString(req.query.userId);
    if (!userId) {
      return res.status(400).json({ error: "userId requis." });
    }

    const { rows } = await db.query(
      "SELECT id, title, created_at, updated_at, payload_json FROM cover_letters WHERE user_id = $1 ORDER BY updated_at DESC",
      [userId]
    );

    const items = rows.map((row) => ({
      id: row.id,
      title: row.title,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      ...parseJsonField(row.payload_json, {})
    }));

    return res.json({ items });
  } catch (error) {
    return res.status(500).json({ error: error.message || "Erreur serveur." });
  }
});

app.post("/api/coverletter/conversations", async (req, res) => {
  try {
    const userId = coerceString(req.body?.userId);
    const payload = req.body?.payload;
    const title = coerceString(req.body?.title) || "Lettre de motivation";

    if (!userId || !payload) {
      return res.status(400).json({ error: "userId et payload requis." });
    }

    const user = await getUserRowById(userId);
    if (!user) {
      return res.status(404).json({ error: "Utilisateur introuvable." });
    }

    const id = `letter-${crypto.randomUUID()}`;
    const createdAt = nowIso();

    await db.query(
      `INSERT INTO cover_letters (id, user_id, title, created_at, updated_at, payload_json)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [id, userId, title, createdAt, createdAt, JSON.stringify(payload)]
    );

    return res.status(201).json({
      conversation: { id, userId, title, createdAt, updatedAt: createdAt, ...payload }
    });
  } catch (error) {
    return res.status(500).json({ error: error.message || "Erreur serveur." });
  }
});

app.put("/api/coverletter/conversations/:id", async (req, res) => {
  try {
    const userId = coerceString(req.body?.userId);
    const conversationId = coerceString(req.params.id);
    const payload = req.body?.payload;
    const title = coerceString(req.body?.title);

    if (!userId || !conversationId || !payload) {
      return res.status(400).json({ error: "userId, id et payload requis." });
    }

    const { rows } = await db.query(
      "SELECT id FROM cover_letters WHERE id = $1 AND user_id = $2",
      [conversationId, userId]
    );
    if (!rows[0]) {
      return res.status(404).json({ error: "Lettre introuvable." });
    }

    const updatedAt = nowIso();
    if (title) {
      await db.query(
        "UPDATE cover_letters SET payload_json = $1, updated_at = $2, title = $3 WHERE id = $4",
        [JSON.stringify(payload), updatedAt, title, conversationId]
      );
    } else {
      await db.query(
        "UPDATE cover_letters SET payload_json = $1, updated_at = $2 WHERE id = $3",
        [JSON.stringify(payload), updatedAt, conversationId]
      );
    }

    return res.json({ ok: true, updatedAt });
  } catch (error) {
    return res.status(500).json({ error: error.message || "Erreur serveur." });
  }
});

app.delete("/api/coverletter/conversations/:id", async (req, res) => {
  try {
    const userId = coerceString(req.query.userId);
    const conversationId = coerceString(req.params.id);
    if (!userId || !conversationId) {
      return res.status(400).json({ error: "userId et id requis." });
    }

    await db.query("DELETE FROM cover_letters WHERE id = $1 AND user_id = $2", [conversationId, userId]);
    return res.json({ ok: true });
  } catch (error) {
    return res.status(500).json({ error: error.message || "Erreur serveur." });
  }
});
}
