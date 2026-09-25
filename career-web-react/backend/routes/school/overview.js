// Sous-groupe de routes extrait de backend/routes/school.js
// (voir ARCHITECTURE.md). Dépendances lues depuis app.locals.ctx.
export function registerSchoolOverviewRoutes(app) {
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

app.get("/api/school/overview", async (req, res) => {
  try {
    const userId = coerceString(req.query?.userId);
    if (!requireMatchingSession(req, res, userId)) return;
    await requireSchoolOwner(userId);

    const metrics = await buildSchoolMetrics(userId);
    const students = metrics.students;

    const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
    const weekCount = 8;
    const now = Date.now();
    const buckets = Array.from({ length: weekCount }, (_, index) => {
      const weeksAgo = weekCount - 1 - index;
      const start = now - (weeksAgo + 1) * WEEK_MS;
      const end = now - weeksAgo * WEEK_MS;
      return { start, end, count: 0 };
    });
    for (const student of students) {
      const createdAt = new Date(student.created_at).getTime();
      if (Number.isNaN(createdAt)) continue;
      const bucket = buckets.find((item) => createdAt >= item.start && createdAt < item.end);
      if (bucket) bucket.count += 1;
    }
    const signupsTrend = buckets.map((bucket) => ({
      weekStart: new Date(bucket.start).toISOString(),
      count: bucket.count
    }));

    // Usage réel du produit par les étudiants de l'école (indicateurs
    // d'engagement et d'employabilité de l'Accueil) — lecture seule.
    const studentIds = students.map((student) => student.id);
    const countFor = async (table) =>
      studentIds.length
        ? Number((await db.query(`SELECT COUNT(*)::int AS n FROM ${table} WHERE user_id = ANY($1)`, [studentIds])).rows[0]?.n || 0)
        : 0;
    const applicationsByStatus = {};
    let studentsWithApplication = 0;
    if (studentIds.length) {
      const { rows: statusRows } = await db.query(
        "SELECT status, COUNT(*)::int AS n FROM job_applications WHERE user_id = ANY($1) GROUP BY status",
        [studentIds]
      );
      for (const row of statusRows) applicationsByStatus[row.status] = Number(row.n || 0);
      const { rows: distinctRows } = await db.query(
        "SELECT COUNT(DISTINCT user_id)::int AS n FROM job_applications WHERE user_id = ANY($1)",
        [studentIds]
      );
      studentsWithApplication = Number(distinctRows[0]?.n || 0);
    }
    // Dernier score de matching de chaque étudiant : « prêt à l'emploi » = 60 % et plus.
    const latestScoreByStudent = {};
    for (const row of [...metrics.matchRows].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))) {
      if (latestScoreByStudent[row.user_id] !== undefined) continue;
      const score = parseJsonField(row.payload_json, {})?.matchInsights?.score;
      if (typeof score === "number") latestScoreByStudent[row.user_id] = score;
    }
    const latestScores = Object.values(latestScoreByStudent);
    const engagement = {
      coverLetters: await countFor("cover_letters"),
      interviews: await countFor("interview_conversations"),
      negotiations: await countFor("negotiation_conversations"),
      applications: Object.values(applicationsByStatus).reduce((sum, n) => sum + n, 0),
      applicationsByStatus,
      studentsWithApplication,
      studentsWithScore: latestScores.length,
      readyStudents: latestScores.filter((score) => score >= 60).length
    };

    return res.json({
      totalStudents: students.length,
      seatsTotal: metrics.seatsTotal,
      seatsUsed: metrics.seatsUsed,
      activationRate: metrics.activationRate,
      totalCvs: metrics.cvRows.length,
      totalMatchRuns: metrics.matchRows.length,
      avgScore: metrics.avgScore,
      inactiveStudents: metrics.inactiveStudents.length,
      withoutCv: metrics.withoutCvStudents.length,
      lowScores: metrics.lowScoreStudents.length,
      topTargetRoles: metrics.topTargetRoles,
      topSkills: metrics.topSkills,
      alerts: buildSchoolAlerts(metrics, coerceString(req.query?.language || "fr")),
      signupsTrend,
      engagement,
      // Ids exposés pour les actions de relance ciblée (bouton "Relancer" —
      // envoie une annonce uniquement à ce segment via
      // POST /api/school/announcements/send avec studentIds).
      inactiveStudentIds: metrics.inactiveStudents.map((row) => row.id),
      withoutCvStudentIds: metrics.withoutCvStudents.map((row) => row.id),
      lowScoreStudentIds: metrics.lowScoreStudents.map((row) => row.id)
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ error: error.message || "Erreur serveur." });
  }
});
}
