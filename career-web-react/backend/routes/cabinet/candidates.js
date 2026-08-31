// Sous-groupe de routes extrait de backend/routes/cabinet.js
// (voir ARCHITECTURE.md). Dépendances lues depuis app.locals.ctx.
export function registerCabinetCandidatesRoutes(app) {
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

const CABINET_CANDIDATE_STATUSES = new Set(["sourced", "contacted", "interviewing", "placed", "rejected"]);

app.get("/api/cabinet/candidates", async (req, res) => {
  try {
    const userId = coerceString(req.query?.userId);
    if (!requireMatchingSession(req, res, userId)) return;
    await requireCabinetOwner(userId);

    const search = coerceString(req.query?.search).toLowerCase();
    const statusFilter = coerceString(req.query?.status);
    const { rows } = await db.query(
      "SELECT * FROM cabinet_candidates WHERE cabinet_user_id = $1 ORDER BY created_at DESC LIMIT 500",
      [userId]
    );
    const items = rows
      .map((row) => ({
        id: row.id,
        firstName: row.first_name,
        lastName: row.last_name,
        email: row.email,
        phone: row.phone,
        headline: row.headline,
        skills: parseJsonField(row.skills_json, []),
        notes: row.notes,
        status: row.status,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }))
      .filter((item) => {
        if (statusFilter && item.status !== statusFilter) return false;
        if (!search) return true;
        const haystack = `${item.firstName} ${item.lastName} ${item.email} ${item.headline} ${item.skills.join(" ")}`.toLowerCase();
        return haystack.includes(search);
      });

    const statusCounts = {};
    for (const item of items) statusCounts[item.status] = (statusCounts[item.status] || 0) + 1;

    return res.json({ items, statusCounts });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ error: error.message || "Erreur serveur." });
  }
});

app.post("/api/cabinet/candidates", async (req, res) => {
  try {
    const userId = coerceString(req.body?.userId);
    if (!requireMatchingSession(req, res, userId)) return;
    await requireCabinetOwner(userId);

    const firstName = coerceString(req.body?.firstName).trim();
    const lastName = coerceString(req.body?.lastName).trim();
    if (!firstName && !lastName) {
      return res.status(400).json({ error: "Le nom du candidat est requis." });
    }
    const skills = Array.isArray(req.body?.skills) ? req.body.skills.map((value) => coerceString(value).trim()).filter(Boolean) : [];
    const id = `ccand-${crypto.randomUUID()}`;
    const now = nowIso();
    await db.query(
      `INSERT INTO cabinet_candidates
        (id, cabinet_user_id, first_name, last_name, email, phone, headline, skills_json, notes, status, created_by, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$12)`,
      [
        id,
        userId,
        firstName,
        lastName,
        coerceString(req.body?.email).trim(),
        coerceString(req.body?.phone).trim(),
        coerceString(req.body?.headline).trim(),
        JSON.stringify(skills),
        coerceString(req.body?.notes).trim(),
        "sourced",
        userId,
        now
      ]
    );
    await logSecurityEvent(req, userId, "cabinet_candidate_created", { candidateId: id });
    return res.status(201).json({ ok: true, id });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ error: error.message || "Erreur serveur." });
  }
});

app.put("/api/cabinet/candidates/:id", async (req, res) => {
  try {
    const userId = coerceString(req.body?.userId);
    if (!requireMatchingSession(req, res, userId)) return;
    await requireCabinetOwner(userId);
    const candidateId = coerceString(req.params.id);

    const status = coerceString(req.body?.status);
    if (status && !CABINET_CANDIDATE_STATUSES.has(status)) {
      return res.status(400).json({ error: "Statut invalide." });
    }

    const { rows: existingRows } = await db.query(
      "SELECT * FROM cabinet_candidates WHERE id = $1 AND cabinet_user_id = $2",
      [candidateId, userId]
    );
    if (!existingRows.length) return res.status(404).json({ error: "Candidat introuvable." });
    const existing = existingRows[0];

    const skills = Array.isArray(req.body?.skills)
      ? req.body.skills.map((value) => coerceString(value).trim()).filter(Boolean)
      : parseJsonField(existing.skills_json, []);

    await db.query(
      `UPDATE cabinet_candidates SET
        first_name = $1, last_name = $2, email = $3, phone = $4, headline = $5,
        skills_json = $6, notes = $7, status = $8, updated_at = $9
       WHERE id = $10 AND cabinet_user_id = $11`,
      [
        coerceString(req.body?.firstName ?? existing.first_name).trim(),
        coerceString(req.body?.lastName ?? existing.last_name).trim(),
        coerceString(req.body?.email ?? existing.email).trim(),
        coerceString(req.body?.phone ?? existing.phone).trim(),
        coerceString(req.body?.headline ?? existing.headline).trim(),
        JSON.stringify(skills),
        coerceString(req.body?.notes ?? existing.notes).trim(),
        status || existing.status,
        nowIso(),
        candidateId,
        userId
      ]
    );
    return res.json({ ok: true });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ error: error.message || "Erreur serveur." });
  }
});

app.delete("/api/cabinet/candidates/:id", async (req, res) => {
  try {
    const userId = coerceString(req.query?.userId || req.body?.userId);
    if (!requireMatchingSession(req, res, userId)) return;
    await requireCabinetOwner(userId);
    const candidateId = coerceString(req.params.id);
    await db.query("DELETE FROM cabinet_mission_candidates WHERE candidate_id = $1", [candidateId]);
    await db.query("DELETE FROM cabinet_candidates WHERE id = $1 AND cabinet_user_id = $2", [candidateId, userId]);
    await logSecurityEvent(req, userId, "cabinet_candidate_deleted", { candidateId });
    return res.json({ ok: true });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ error: error.message || "Erreur serveur." });
  }
});
}

