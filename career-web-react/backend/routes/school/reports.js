// Sous-groupe de routes extrait de backend/routes/school.js
// (voir ARCHITECTURE.md). Dépendances lues depuis app.locals.ctx.
export function registerSchoolReportsRoutes(app) {
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

app.get("/api/school/reports", async (req, res) => {
  try {
    const userId = coerceString(req.query?.userId);
    if (!requireMatchingSession(req, res, userId)) return;
    await requireSchoolOwner(userId);
    const { rows: promotionRows } = await db.query(
      "SELECT id, name FROM school_promotions WHERE school_user_id = $1 ORDER BY created_at DESC",
      [userId]
    );
    const metrics = await buildSchoolMetrics(userId);
    const { rows } = await db.query("SELECT * FROM school_reports WHERE school_user_id = $1 ORDER BY created_at DESC LIMIT 50", [userId]);
    return res.json({
      promotions: promotionRows.map((row) => ({ id: row.id, name: row.name })),
      snapshot: {
        totalStudents: metrics.students.length,
        activeStudents: metrics.students.length - metrics.inactiveStudents.length,
        withoutCv: metrics.withoutCvStudents.length,
        lowScores: metrics.lowScoreStudents.length,
        avgScore: metrics.avgScore,
        topTargetRoles: metrics.topTargetRoles,
        topSkills: metrics.topSkills
      },
      items: rows.map((row) => ({
        id: row.id,
        title: row.title,
        period: row.period,
        payload: parseJsonField(row.payload_json, {}),
        createdAt: row.created_at
      }))
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ error: error.message || "Erreur serveur." });
  }
});

app.post("/api/school/reports/generate", async (req, res) => {
  try {
    const userId = coerceString(req.body?.userId);
    if (!requireMatchingSession(req, res, userId)) return;
    await requireSchoolOwner(userId);
    const period = coerceString(req.body?.period || "monthly");
    const promotionId = coerceString(req.body?.promotionId);

    let restrictToStudentIds = null;
    let promotionName = "";
    if (promotionId) {
      const { rows: promoRow } = await db.query(
        "SELECT name FROM school_promotions WHERE id = $1 AND school_user_id = $2",
        [promotionId, userId]
      );
      if (!promoRow.length) {
        return res.status(404).json({ error: "Promotion introuvable." });
      }
      promotionName = promoRow[0].name;
      const { rows: memberRows } = await db.query(
        "SELECT student_user_id FROM school_promotion_students WHERE promotion_id = $1",
        [promotionId]
      );
      restrictToStudentIds = new Set(memberRows.map((row) => row.student_user_id));
    }

    const metrics = await buildSchoolMetrics(userId, { restrictToStudentIds });
    const payload = {
      generatedAt: nowIso(),
      promotionName: promotionName || null,
      totalStudents: metrics.students.length,
      activeStudents: metrics.students.length - metrics.inactiveStudents.length,
      inactiveStudents: metrics.inactiveStudents.length,
      withoutCv: metrics.withoutCvStudents.length,
      lowScores: metrics.lowScoreStudents.length,
      avgScore: metrics.avgScore,
      topTargetRoles: metrics.topTargetRoles,
      topSkills: metrics.topSkills,
      alerts: buildSchoolAlerts(metrics, "fr")
    };
    const id = `report-${crypto.randomUUID()}`;
    const baseTitle = period === "weekly" ? "Rapport hebdomadaire employabilité" : "Rapport mensuel employabilité";
    const title = promotionName ? `${baseTitle} — ${promotionName}` : baseTitle;
    await db.query(
      "INSERT INTO school_reports (id, school_user_id, title, period, payload_json, created_at) VALUES ($1,$2,$3,$4,$5,$6)",
      [id, userId, title, period, JSON.stringify(payload), nowIso()]
    );
    await logSecurityEvent(req, userId, "school_report_generated", { reportId: id, period });
    return res.status(201).json({ ok: true, id, payload });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ error: error.message || "Erreur serveur." });
  }
});
}
