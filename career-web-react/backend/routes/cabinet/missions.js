// Sous-groupe de routes extrait de backend/routes/cabinet.js
// (voir ARCHITECTURE.md). Dépendances lues depuis app.locals.ctx.
export function registerCabinetMissionsRoutes(app) {
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

const CABINET_MISSION_STATUSES = new Set(["open", "in_progress", "closed"]);
const CABINET_MISSION_STAGES = new Set(["sourced", "contacted", "interviewing", "placed", "rejected"]);

app.get("/api/cabinet/missions", async (req, res) => {
  try {
    const userId = coerceString(req.query?.userId);
    if (!requireMatchingSession(req, res, userId)) return;
    await requireCabinetOwner(userId);

    const { rows } = await db.query(
      "SELECT * FROM cabinet_missions WHERE cabinet_user_id = $1 ORDER BY created_at DESC",
      [userId]
    );
    const missionIds = rows.map((row) => row.id);
    const { rows: linkRows } = missionIds.length
      ? await db.query(
          `SELECT mc.mission_id, mc.candidate_id, mc.stage, mc.score, c.first_name, c.last_name, c.email
           FROM cabinet_mission_candidates mc
           JOIN cabinet_candidates c ON c.id = mc.candidate_id
           WHERE mc.mission_id = ANY($1)`,
          [missionIds]
        )
      : { rows: [] };

    return res.json({
      items: rows.map((row) => ({
        id: row.id,
        title: row.title,
        clientName: row.client_name,
        location: row.location,
        status: row.status,
        createdAt: row.created_at,
        candidates: linkRows
          .filter((link) => link.mission_id === row.id)
          .map((link) => ({
            candidateId: link.candidate_id,
            firstName: link.first_name,
            lastName: link.last_name,
            email: link.email,
            stage: link.stage,
            score: link.score
          }))
      }))
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ error: error.message || "Erreur serveur." });
  }
});

app.post("/api/cabinet/missions", async (req, res) => {
  try {
    const userId = coerceString(req.body?.userId);
    if (!requireMatchingSession(req, res, userId)) return;
    await requireCabinetOwner(userId);

    const title = coerceString(req.body?.title).trim();
    if (title.length < 2) {
      return res.status(400).json({ error: "Le titre de la mission doit contenir au moins 2 caractères." });
    }
    const id = `cmis-${crypto.randomUUID()}`;
    const now = nowIso();
    await db.query(
      `INSERT INTO cabinet_missions (id, cabinet_user_id, title, client_name, location, status, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,'open',$6,$6)`,
      [id, userId, title, coerceString(req.body?.clientName).trim(), coerceString(req.body?.location).trim(), now]
    );
    return res.status(201).json({ ok: true, id });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ error: error.message || "Erreur serveur." });
  }
});

app.put("/api/cabinet/missions/:id", async (req, res) => {
  try {
    const userId = coerceString(req.body?.userId);
    if (!requireMatchingSession(req, res, userId)) return;
    await requireCabinetOwner(userId);
    const missionId = coerceString(req.params.id);
    const status = coerceString(req.body?.status);
    if (status && !CABINET_MISSION_STATUSES.has(status)) {
      return res.status(400).json({ error: "Statut invalide." });
    }
    const { rows } = await db.query("SELECT * FROM cabinet_missions WHERE id = $1 AND cabinet_user_id = $2", [
      missionId,
      userId
    ]);
    if (!rows.length) return res.status(404).json({ error: "Mission introuvable." });
    const existing = rows[0];
    await db.query(
      `UPDATE cabinet_missions SET title = $1, client_name = $2, location = $3, status = $4, updated_at = $5
       WHERE id = $6 AND cabinet_user_id = $7`,
      [
        coerceString(req.body?.title ?? existing.title).trim() || existing.title,
        coerceString(req.body?.clientName ?? existing.client_name).trim(),
        coerceString(req.body?.location ?? existing.location).trim(),
        status || existing.status,
        nowIso(),
        missionId,
        userId
      ]
    );
    return res.json({ ok: true });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ error: error.message || "Erreur serveur." });
  }
});

app.delete("/api/cabinet/missions/:id", async (req, res) => {
  try {
    const userId = coerceString(req.query?.userId || req.body?.userId);
    if (!requireMatchingSession(req, res, userId)) return;
    await requireCabinetOwner(userId);
    const missionId = coerceString(req.params.id);
    await db.query("DELETE FROM cabinet_mission_candidates WHERE mission_id = $1", [missionId]);
    await db.query("DELETE FROM cabinet_missions WHERE id = $1 AND cabinet_user_id = $2", [missionId, userId]);
    return res.json({ ok: true });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ error: error.message || "Erreur serveur." });
  }
});

app.post("/api/cabinet/missions/:id/candidates", async (req, res) => {
  try {
    const userId = coerceString(req.body?.userId);
    if (!requireMatchingSession(req, res, userId)) return;
    await requireCabinetOwner(userId);
    const missionId = coerceString(req.params.id);
    const candidateId = coerceString(req.body?.candidateId);
    const action = coerceString(req.body?.action || "add");

    const { rows: missionRows } = await db.query(
      "SELECT id FROM cabinet_missions WHERE id = $1 AND cabinet_user_id = $2",
      [missionId, userId]
    );
    if (!missionRows.length) return res.status(404).json({ error: "Mission introuvable." });
    const { rows: candidateRows } = await db.query(
      "SELECT id FROM cabinet_candidates WHERE id = $1 AND cabinet_user_id = $2",
      [candidateId, userId]
    );
    if (!candidateRows.length) return res.status(404).json({ error: "Candidat introuvable." });

    if (action === "remove") {
      await db.query("DELETE FROM cabinet_mission_candidates WHERE mission_id = $1 AND candidate_id = $2", [
        missionId,
        candidateId
      ]);
      return res.json({ ok: true });
    }

    if (action === "stage") {
      const stage = coerceString(req.body?.stage);
      if (!CABINET_MISSION_STAGES.has(stage)) return res.status(400).json({ error: "Étape invalide." });
      await db.query("UPDATE cabinet_mission_candidates SET stage = $1 WHERE mission_id = $2 AND candidate_id = $3", [
        stage,
        missionId,
        candidateId
      ]);
      return res.json({ ok: true });
    }

    await db.query(
      `INSERT INTO cabinet_mission_candidates (mission_id, candidate_id, stage, created_at)
       VALUES ($1,$2,'sourced',$3) ON CONFLICT (mission_id, candidate_id) DO NOTHING`,
      [missionId, candidateId, nowIso()]
    );
    return res.status(201).json({ ok: true });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ error: error.message || "Erreur serveur." });
  }
});
}

