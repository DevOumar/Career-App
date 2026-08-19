// Sous-groupe de routes extrait de backend/routes/school.js
// (voir ARCHITECTURE.md). Dépendances lues depuis app.locals.ctx.
export function registerSchoolPromotionsRoutes(app) {
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

app.get("/api/school/promotions", async (req, res) => {
  try {
    const userId = coerceString(req.query?.userId);
    await requireSchoolOwner(userId);
    const students = await getSchoolStudentRows(userId);
    const { rows } = await db.query("SELECT * FROM school_promotions WHERE school_user_id = $1 ORDER BY created_at DESC", [userId]);
    const promotionIds = rows.map((row) => row.id);
    const { rows: links } = promotionIds.length
      ? await db.query("SELECT promotion_id, student_user_id FROM school_promotion_students WHERE promotion_id = ANY($1)", [promotionIds])
      : { rows: [] };
    return res.json({
      items: rows.map((row) => ({
        id: row.id,
        name: row.name,
        program: row.program,
        level: row.level,
        campus: row.campus,
        academicYear: row.academic_year,
        createdAt: row.created_at,
        studentIds: links.filter((link) => link.promotion_id === row.id).map((link) => link.student_user_id),
        studentCount: links.filter((link) => link.promotion_id === row.id).length
      })),
      students: students.map((row) => ({
        id: row.id,
        firstName: row.first_name,
        lastName: row.last_name,
        email: row.email,
        avatarDataUrl: row.avatar_data_url || ""
      }))
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ error: error.message || "Erreur serveur." });
  }
});

app.post("/api/school/promotions", async (req, res) => {
  try {
    const userId = coerceString(req.body?.userId);
    await requireSchoolOwner(userId);
    const name = coerceString(req.body?.name);
    if (!name) return res.status(400).json({ error: "Le nom de la promotion est requis." });
    const id = `promo-${crypto.randomUUID()}`;
    await db.query(
      `INSERT INTO school_promotions (id, school_user_id, name, program, level, campus, academic_year, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$8)`,
      [
        id,
        userId,
        name,
        coerceString(req.body?.program),
        coerceString(req.body?.level),
        coerceString(req.body?.campus),
        coerceString(req.body?.academicYear),
        nowIso()
      ]
    );
    await logSecurityEvent(req, userId, "school_promotion_created", { promotionId: id });
    return res.status(201).json({ ok: true, id });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ error: error.message || "Erreur serveur." });
  }
});

app.post("/api/school/promotions/:id/students", async (req, res) => {
  try {
    const userId = coerceString(req.body?.userId);
    await requireSchoolOwner(userId);
    const promotionId = coerceString(req.params.id);
    const studentId = coerceString(req.body?.studentId);
    const action = coerceString(req.body?.action || "add");
    if (!promotionId || !studentId) return res.status(400).json({ error: "Promotion et étudiant requis." });

    const { rows: promoRows } = await db.query("SELECT id FROM school_promotions WHERE id = $1 AND school_user_id = $2", [
      promotionId,
      userId
    ]);
    if (!promoRows.length) return res.status(404).json({ error: "Promotion introuvable." });

    const students = await getSchoolStudentRows(userId);
    if (!students.some((student) => student.id === studentId)) {
      return res.status(403).json({ error: "Cet étudiant n'est pas rattaché à votre établissement." });
    }

    if (action === "remove") {
      await db.query("DELETE FROM school_promotion_students WHERE promotion_id = $1 AND student_user_id = $2", [
        promotionId,
        studentId
      ]);
      await logSecurityEvent(req, userId, "school_promotion_student_removed", { promotionId, studentId });
    } else {
      await db.query(
        `INSERT INTO school_promotion_students (id, promotion_id, student_user_id, created_at)
         VALUES ($1,$2,$3,$4)
         ON CONFLICT (promotion_id, student_user_id) DO NOTHING`,
        [`promo-student-${crypto.randomUUID()}`, promotionId, studentId, nowIso()]
      );
      await logSecurityEvent(req, userId, "school_promotion_student_added", { promotionId, studentId });
    }
    return res.json({ ok: true });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ error: error.message || "Erreur serveur." });
  }
});

app.delete("/api/school/promotions/:id", async (req, res) => {
  try {
    const userId = coerceString(req.query?.userId || req.body?.userId);
    await requireSchoolOwner(userId);
    const promotionId = coerceString(req.params.id);
    await db.query("DELETE FROM school_promotion_students WHERE promotion_id = $1", [promotionId]);
    await db.query("DELETE FROM school_promotions WHERE id = $1 AND school_user_id = $2", [promotionId, userId]);
    await logSecurityEvent(req, userId, "school_promotion_deleted", { promotionId });
    return res.json({ ok: true });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ error: error.message || "Erreur serveur." });
  }
});
}
