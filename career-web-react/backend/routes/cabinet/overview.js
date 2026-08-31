// Sous-groupe de routes extrait de backend/routes/cabinet.js
// (voir ARCHITECTURE.md). Dépendances lues depuis app.locals.ctx.
export function registerCabinetOverviewRoutes(app) {
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
    toPublicJobApplication,
    requireCabinetOwner,
    getCabinetLicenseCodeRows,
    getCabinetRecruiterRows,
    buildCabinetMetrics,
    buildCabinetAlerts,
    resolveAccountSegments
  } = app.locals.ctx;

app.get("/api/cabinet/overview", async (req, res) => {
  try {
    const userId = coerceString(req.query?.userId);
    if (!requireMatchingSession(req, res, userId)) return;
    await requireCabinetOwner(userId);

    const metrics = await buildCabinetMetrics(userId);
    const alerts = buildCabinetAlerts(metrics, coerceString(req.query?.language || "fr"));

    const { rows: recentCandidates } = await db.query(
      "SELECT id, first_name, last_name, status, created_at FROM cabinet_candidates WHERE cabinet_user_id = $1 ORDER BY created_at DESC LIMIT 5",
      [userId]
    );

    return res.json({
      recruiterCount: metrics.recruiters.length,
      seatsTotal: metrics.seatsTotal,
      seatsUsed: metrics.seatsUsed,
      candidateCount: metrics.candidateCount,
      missionCount: metrics.missionCount,
      openMissionCount: metrics.openMissionCount,
      alerts,
      recentCandidates: recentCandidates.map((row) => ({
        id: row.id,
        firstName: row.first_name,
        lastName: row.last_name,
        status: row.status,
        createdAt: row.created_at
      }))
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ error: error.message || "Erreur serveur." });
  }
});

// Cloche de notifications — même principe que GET /api/notifications côté
// candidat : rien n'est stocké, tout est recalculé à la volée à partir
// d'événements réels (jamais de contenu fabriqué), avec des ids stables
// pour que le "lu" (géré en local côté client) reste cohérent d'un appel à
// l'autre.
app.get("/api/cabinet/notifications", async (req, res) => {
  try {
    const userId = coerceString(req.query?.userId);
    if (!requireMatchingSession(req, res, userId)) return;
    await requireCabinetOwner(userId);
    const language = coerceString(req.query?.language || "fr");

    const metrics = await buildCabinetMetrics(userId);
    const alerts = buildCabinetAlerts(metrics, language);
    const items = alerts.map((alert) => ({
      id: `alert-${alert.type}`,
      type: alert.type,
      title: alert.title,
      body: alert.body,
      createdAt: null
    }));

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    // Nouveaux recruteurs ayant rejoint récemment (invitation acceptée).
    const { rows: redeemedInvites } = await db.query(
      `SELECT id, email, redeemed_at FROM cabinet_invitations
       WHERE cabinet_user_id = $1 AND status = 'redeemed' AND redeemed_at >= $2
       ORDER BY redeemed_at DESC LIMIT 10`,
      [userId, sevenDaysAgo]
    );
    for (const row of redeemedInvites) {
      items.push({
        id: `recruiter-joined-${row.id}`,
        type: "recruiter_joined",
        title: language === "en" ? "A recruiter joined your firm" : "Un recruteur a rejoint votre cabinet",
        body: row.email,
        createdAt: row.redeemed_at
      });
    }

    // Missions ouvertes depuis plus de 3 jours sans aucun candidat affecté —
    // signal actionnable, pas juste un compteur.
    const { rows: staleMissions } = await db.query(
      `SELECT m.id, m.title, m.created_at FROM cabinet_missions m
       WHERE m.cabinet_user_id = $1 AND m.status != 'closed' AND m.created_at < $2
         AND NOT EXISTS (SELECT 1 FROM cabinet_mission_candidates mc WHERE mc.mission_id = m.id)
       ORDER BY m.created_at ASC LIMIT 10`,
      [userId, new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()]
    );
    for (const row of staleMissions) {
      items.push({
        id: `mission-no-candidate-${row.id}`,
        type: "mission_no_candidate",
        title: language === "en" ? "Mission without any candidate" : "Mission sans candidat affecté",
        body: row.title,
        createdAt: row.created_at
      });
    }

    items.sort((a, b) => {
      if (!a.createdAt && !b.createdAt) return 0;
      if (!a.createdAt) return -1;
      if (!b.createdAt) return 1;
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    return res.json({ items: items.slice(0, 30) });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ error: error.message || "Erreur serveur." });
  }
});
}

