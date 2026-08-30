// Sous-groupe de routes extrait de backend/routes/admin.js
// (voir ARCHITECTURE.md). Dépendances lues depuis app.locals.ctx.
export function registerAdminAiRoutes(app) {
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

app.get("/api/admin/ai-samples", async (req, res) => {
  try {
    const adminUserId = coerceString(req.query?.adminUserId);
    if (!requireMatchingSession(req, res, adminUserId)) return;
    await requireAdmin(adminUserId);

    const search = coerceString(req.query?.search).toLowerCase();

    const { rows: runRows } = await db.query(
      "SELECT id, user_id, created_at, payload_json FROM match_runs ORDER BY created_at DESC LIMIT 300"
    );
    const userIds = [...new Set(runRows.map((row) => row.user_id))];
    const { rows: userRows } = userIds.length
      ? await db.query(
          "SELECT id, first_name, last_name, email, avatar_data_url FROM users WHERE id = ANY($1)",
          [userIds]
        )
      : { rows: [] };
    const userById = Object.fromEntries(userRows.map((row) => [row.id, row]));

    const items = runRows
      .map((row) => {
        const payload = parseJsonField(row.payload_json, {});
        const owner = userById[row.user_id];
        return {
          id: row.id,
          userId: row.user_id,
          userFirstName: owner?.first_name || "",
          userLastName: owner?.last_name || "",
          userEmail: owner?.email || "",
          userAvatarDataUrl: owner?.avatar_data_url || "",
          jobTitle: payload.jobReview?.title || "",
          jobCompany: payload.jobReview?.company || "",
          score: payload.matchInsights?.score ?? null,
          strengths: Array.isArray(payload.matchInsights?.strengths) ? payload.matchInsights.strengths : [],
          missingKeywords: Array.isArray(payload.matchInsights?.missingKeywords) ? payload.matchInsights.missingKeywords : [],
          culturalFit: payload.matchInsights?.culturalFit || null,
          recommendation: payload.matchInsights?.recommendation || "",
          createdAt: row.created_at
        };
      })
      .filter((item) => {
        if (!search) return true;
        const haystack = `${item.userFirstName} ${item.userLastName} ${item.userEmail} ${item.jobTitle} ${item.jobCompany}`.toLowerCase();
        return haystack.includes(search);
      });

    return res.json({ items, total: runRows.length });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ error: error.message || "Erreur serveur." });
  }
});

app.get("/api/admin/ai-monitoring", async (req, res) => {
  try {
    const adminUserId = coerceString(req.query?.adminUserId);
    if (!requireMatchingSession(req, res, adminUserId)) return;
    await requireAdmin(adminUserId);

    const { rows: cvRows } = await db.query("SELECT id, created_at, parsed_json FROM cvs ORDER BY created_at DESC LIMIT 500");
    const { rows: matchRows } = await db.query("SELECT id, created_at, payload_json FROM match_runs ORDER BY created_at DESC LIMIT 500");
    const { rows: eventRows } = await db.query(
      `SELECT event_type, COUNT(*)::int AS count
       FROM account_security_events
       WHERE event_type IN ('cv_upload', 'match_analysis', 'admin_announcement_sent')
       GROUP BY event_type`
    );

    const cvStatuses = cvRows.map((row) => getCvExtractionStatus(parseJsonField(row.parsed_json, {})));
    const successfulExtractions = cvStatuses.filter((item) => item.status === "extracted").length;
    const partialExtractions = cvStatuses.filter((item) => item.status === "partial").length;
    const failedExtractions = cvStatuses.filter((item) => item.status === "needs_review").length;
    const invalidResponses = cvStatuses.filter((item) => item.suspicious.length || item.missing.length >= 3);
    const providerCounts = {};
    const scores = [];
    for (const row of matchRows) {
      const payload = parseJsonField(row.payload_json, {});
      const provider = payload.provider || payload.extractionProvider || "local";
      providerCounts[provider] = (providerCounts[provider] || 0) + 1;
      const summary = getMatchPayloadSummary(payload);
      if (Number.isFinite(Number(summary.score))) scores.push(Number(summary.score));
    }

    const eventCounts = Object.fromEntries(eventRows.map((row) => [row.event_type, row.count]));
    return res.json({
      successfulExtractions,
      partialExtractions,
      failedExtractions,
      totalMatchRuns: matchRows.length,
      averageMatchScore: scores.length ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length) : null,
      providerCounts,
      estimatedCost: {
        currency: "EUR",
        amount: Number(((cvRows.length + matchRows.length) * 0.002).toFixed(3)),
        note: "Estimation indicative basée sur le nombre d'appels IA enregistrés."
      },
      averageAnalysisTimeSeconds: null,
      apiErrors: failedExtractions,
      eventCounts,
      invalidResponses: invalidResponses.slice(0, 12).map((status, index) => ({
        id: cvRows[index]?.id || `invalid-${index}`,
        createdAt: cvRows[index]?.created_at || "",
        missing: status.missing,
        suspicious: status.suspicious,
        score: status.score
      }))
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ error: error.message || "Erreur serveur." });
  }
});
}
