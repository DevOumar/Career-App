// Sous-groupe de routes extrait de backend/routes/admin.js
// (voir ARCHITECTURE.md). Dépendances lues depuis app.locals.ctx.
export function registerAdminExportRoutes(app) {
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

app.get("/api/admin/export/accounts", async (req, res) => {
  try {
    const adminUserId = coerceString(req.query?.adminUserId);
    await requireAdmin(adminUserId);

    const { rows } = await db.query(
      "SELECT id, first_name, last_name, email, role_type, subscription_json, created_at FROM users ORDER BY created_at DESC"
    );
    const csvRows = rows.map((row) => {
      const subscription = parseJsonField(row.subscription_json, {});
      return [
        row.id,
        row.first_name,
        row.last_name,
        row.email,
        row.role_type,
        subscription.planId || "",
        subscription.billingCycle || "",
        row.created_at
      ];
    });
    return sendCsv(
      res,
      "comptes.csv",
      ["ID", "Prénom", "Nom", "Email", "Rôle", "Plan", "Cycle de facturation", "Créé le"],
      csvRows
    );
  } catch (error) {
    return res.status(error.statusCode || 500).json({ error: error.message || "Erreur serveur." });
  }
});

app.get("/api/admin/export/transactions", async (req, res) => {
  try {
    const adminUserId = coerceString(req.query?.adminUserId);
    await requireAdmin(adminUserId);

    const { rows } = await db.query(
      `SELECT t.id, t.plan_id, t.billing_cycle, t.listed_amount, t.amount_collected, t.currency, t.source, t.created_at,
              t.refunded, t.refunded_at, u.first_name, u.last_name, u.email
       FROM transactions t
       LEFT JOIN users u ON u.id = t.user_id
       ORDER BY t.created_at DESC`
    );
    const csvRows = rows.map((row) => [
      row.id,
      row.created_at,
      `${row.first_name || ""} ${row.last_name || ""}`.trim(),
      row.email || "",
      row.plan_id,
      row.billing_cycle,
      row.listed_amount,
      row.amount_collected,
      row.currency,
      row.source,
      Number(row.refunded) ? `Remboursé le ${row.refunded_at}` : ""
    ]);
    return sendCsv(
      res,
      "transactions.csv",
      ["ID", "Date", "Utilisateur", "Email", "Plan", "Cycle", "Prix catalogue", "Montant encaissé", "Devise", "Source", "Remboursement"],
      csvRows
    );
  } catch (error) {
    return res.status(error.statusCode || 500).json({ error: error.message || "Erreur serveur." });
  }
});

app.get("/api/admin/export/license-codes", async (req, res) => {
  try {
    const adminUserId = coerceString(req.query?.adminUserId);
    await requireAdmin(adminUserId);

    const { rows } = await db.query(
      `SELECT lc.code, lc.plan_id, lc.seats_total, lc.seats_used, lc.revoked, lc.created_at,
              u.first_name, u.last_name, u.email
       FROM license_codes lc
       LEFT JOIN users u ON u.id = lc.owner_user_id
       ORDER BY lc.created_at DESC`
    );
    const csvRows = rows.map((row) => [
      row.code,
      `${row.first_name || ""} ${row.last_name || ""}`.trim(),
      row.email || "",
      row.plan_id,
      row.seats_used,
      row.seats_total,
      Number(row.revoked) ? "Révoqué" : "Actif",
      row.created_at
    ]);
    return sendCsv(
      res,
      "codes-de-licence.csv",
      ["Code", "Propriétaire", "Email", "Plan", "Sièges utilisés", "Sièges totaux", "Statut", "Créé le"],
      csvRows
    );
  } catch (error) {
    return res.status(error.statusCode || 500).json({ error: error.message || "Erreur serveur." });
  }
});
}
