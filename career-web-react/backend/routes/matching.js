// Routes matching — extrait automatiquement de backend/index.js (voir
// ARCHITECTURE.md). Toutes les dépendances (db, helpers, constantes) sont
// lues depuis app.locals.ctx, rempli une fois dans index.js après
// l'initialisation complète (DB ouverte, helpers définis).
export function registerMatchingRoutes(app) {
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

app.post("/api/match/analyze", async (req, res) => {
  try {
    const candidate = req.body?.candidate && typeof req.body.candidate === "object" ? req.body.candidate : {};
    const offer = req.body?.offer && typeof req.body.offer === "object" ? req.body.offer : {};

    if (!Array.isArray(offer.skills) || !offer.title) {
      return res.status(400).json({ error: "Offre invalide pour lancer le matching." });
    }

    let analysis = null;
    let provider = "local";
    try {
      analysis = await analyzeMatchWithAi(candidate, offer);
      if (analysis) provider = AI_PROVIDER === "grok" ? "xai" : AI_PROVIDER;
    } catch (aiError) {
      analysis = null;
      console.warn(`Analyse IA du matching indisponible: ${aiError.message}`);
    }

    return res.json({
      analysis: analysis || buildLocalMatchInsights({ candidate, offer }),
      provider
    });
  } catch (error) {
    return res.status(400).json({ error: error.message || "Analyse du matching impossible." });
  }
});

app.get("/api/offers", async (_req, res) => {
  const { rows } = await db.query(
    `SELECT id, company, title, location, contract, premium, sector, experience_min, education, skills_json, missions_json
     FROM offers ORDER BY company, title`
  );

  const items = rows.map((row) => ({
    id: row.id,
    company: row.company,
    title: row.title,
    location: row.location,
    contract: row.contract,
    premium: Boolean(Number(row.premium || 0)),
    sector: row.sector,
    experienceMin: Number(row.experience_min || 0),
    education: row.education,
    skills: parseJsonField(row.skills_json, []),
    missions: parseJsonField(row.missions_json, [])
  }));

  res.json({ items });
});

app.post("/api/matches", async (req, res) => {
  try {
    const userId = coerceString(req.body?.userId);
    const payload = req.body?.payload;

    if (!userId || !payload) {
      return res.status(400).json({ error: "userId et payload requis." });
    }

    const user = await getUserRowById(userId);
    if (!user) {
      return res.status(404).json({ error: "Utilisateur introuvable." });
    }

    const id = `match-${crypto.randomUUID()}`;
    const createdAt = nowIso();

    await db.query(
      "INSERT INTO match_runs (id, user_id, created_at, payload_json) VALUES ($1, $2, $3, $4)",
      [id, userId, createdAt, JSON.stringify(payload)]
    );

    return res.status(201).json({
      run: {
        id,
        userId,
        createdAt,
        ...payload
      }
    });
  } catch (error) {
    return res.status(500).json({ error: error.message || "Erreur serveur." });
  }
});

app.get("/api/matches/latest", async (req, res) => {
  try {
    const userId = coerceString(req.query.userId);
    if (!userId) {
      return res.status(400).json({ error: "userId requis." });
    }

    const { rows } = await db.query(
      "SELECT id, user_id, created_at, payload_json FROM match_runs WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1",
      [userId]
    );

    if (!rows[0]) {
      return res.json({ run: null });
    }

    return res.json({
      run: {
        id: rows[0].id,
        userId: rows[0].user_id,
        createdAt: rows[0].created_at,
        ...parseJsonField(rows[0].payload_json, {})
      }
    });
  } catch (error) {
    return res.status(500).json({ error: error.message || "Erreur serveur." });
  }
});

app.post("/api/matches/feedback", async (req, res) => {
  try {
    const userId = coerceString(req.body?.userId);
    const matchRunId = coerceString(req.body?.matchRunId);
    const useful = Boolean(req.body?.useful);

    if (!userId || !matchRunId) {
      return res.status(400).json({ error: "userId et matchRunId requis." });
    }

    const { rows: runRows } = await db.query("SELECT id FROM match_runs WHERE id = $1 AND user_id = $2", [matchRunId, userId]);
    if (!runRows[0]) {
      return res.status(404).json({ error: "Analyse introuvable." });
    }

    const id = `mfb-${crypto.randomUUID()}`;
    const createdAt = nowIso();

    await db.query(
      `INSERT INTO match_feedback (id, user_id, match_run_id, useful, created_at)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (user_id, match_run_id) DO UPDATE SET useful = EXCLUDED.useful, created_at = EXCLUDED.created_at`,
      [id, userId, matchRunId, useful ? 1 : 0, createdAt]
    );

    return res.status(201).json({ feedback: { userId, matchRunId, useful, createdAt } });
  } catch (error) {
    return res.status(500).json({ error: error.message || "Erreur serveur." });
  }
});

app.get("/api/matches/feedback", async (req, res) => {
  try {
    const userId = coerceString(req.query.userId);
    const matchRunId = coerceString(req.query.matchRunId);
    if (!userId || !matchRunId) {
      return res.status(400).json({ error: "userId et matchRunId requis." });
    }

    const { rows } = await db.query(
      "SELECT useful, created_at FROM match_feedback WHERE user_id = $1 AND match_run_id = $2",
      [userId, matchRunId]
    );

    if (!rows[0]) {
      return res.json({ feedback: null });
    }

    return res.json({
      feedback: { useful: Boolean(Number(rows[0].useful)), createdAt: rows[0].created_at }
    });
  } catch (error) {
    return res.status(500).json({ error: error.message || "Erreur serveur." });
  }
});
}
