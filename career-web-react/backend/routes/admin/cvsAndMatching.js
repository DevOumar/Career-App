// Sous-groupe de routes extrait de backend/routes/admin.js
// (voir ARCHITECTURE.md). Dépendances lues depuis app.locals.ctx.
export function registerAdminCvsAndMatchingRoutes(app) {
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

app.get("/api/admin/cvs", async (req, res) => {
  try {
    const adminUserId = coerceString(req.query?.adminUserId);
    await requireAdmin(adminUserId);

    const search = coerceString(req.query?.search).toLowerCase();
    const statusFilter = coerceString(req.query?.status);
    const cvRows = await getAdminCvRows();
    const userIds = [...new Set(cvRows.map((row) => row.user_id))];
    const { rows: userRows } = userIds.length
      ? await db.query("SELECT id, first_name, last_name, email, role_type, avatar_data_url FROM users WHERE id = ANY($1)", [userIds])
      : { rows: [] };
    const userById = Object.fromEntries(userRows.map((row) => [row.id, row]));

    const items = cvRows
      .map((row) => {
        const parsed = parseJsonField(row.parsed_json, {});
        const extraction = getCvExtractionStatus(parsed);
        const owner = userById[row.user_id];
        return {
          id: row.id,
          userId: row.user_id,
          userFirstName: owner?.first_name || "",
          userLastName: owner?.last_name || "",
          userEmail: owner?.email || "",
          userRoleType: owner?.role_type || "",
          userAvatarDataUrl: owner?.avatar_data_url || "",
          createdAt: row.created_at,
          fileName: row.file_name,
          characterCount: String(row.source_text || "").length,
          status: extraction.status,
          extraction,
          preview: summarizeCvParsed(parsed)
        };
      })
      .filter((item) => {
        if (statusFilter && item.status !== statusFilter) return false;
        if (!search) return true;
        const haystack = `${item.fileName} ${item.userFirstName} ${item.userLastName} ${item.userEmail} ${item.preview.headline} ${item.preview.skills.join(" ")}`.toLowerCase();
        return haystack.includes(search);
      });

    const statusCounts = items.reduce((acc, item) => {
      acc[item.status] = (acc[item.status] || 0) + 1;
      return acc;
    }, {});
    return res.json({ items, statusCounts });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ error: error.message || "Erreur serveur." });
  }
});

app.post("/api/admin/cvs/:id/reanalyze", async (req, res) => {
  try {
    const adminUserId = coerceString(req.body?.adminUserId);
    await requireAdmin(adminUserId);
    const cvId = coerceString(req.params.id);
    const { rows } = await db.query("SELECT source_text FROM cvs WHERE id = $1 LIMIT 1", [cvId]);
    if (!rows[0]) return res.status(404).json({ error: "CV introuvable." });
    const parsed = postProcessCvExtraction(rows[0].source_text, await extractCvWithAi(rows[0].source_text));
    await db.query("UPDATE cvs SET parsed_json = $1 WHERE id = $2", [JSON.stringify(parsed), cvId]);
    await logSecurityEvent(req, adminUserId, "admin_cv_reanalyzed", { cvId });
    return res.json({ ok: true, parsed, extraction: getCvExtractionStatus(parsed) });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ error: error.message || "Réanalyse impossible." });
  }
});

app.delete("/api/admin/cvs/:id", async (req, res) => {
  try {
    const adminUserId = coerceString(req.body?.adminUserId);
    await requireAdmin(adminUserId);
    const cvId = coerceString(req.params.id);
    await db.query("DELETE FROM cvs WHERE id = $1", [cvId]);
    await logSecurityEvent(req, adminUserId, "admin_cv_deleted", { cvId });
    return res.json({ ok: true });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ error: error.message || "Suppression impossible." });
  }
});

app.get("/api/admin/matches", async (req, res) => {
  try {
    const adminUserId = coerceString(req.query?.adminUserId);
    await requireAdmin(adminUserId);
    const search = coerceString(req.query?.search).toLowerCase();
    const { rows: runRows } = await db.query("SELECT id, user_id, created_at, payload_json FROM match_runs ORDER BY created_at DESC LIMIT 500");
    const userIds = [...new Set(runRows.map((row) => row.user_id))];
    const { rows: userRows } = userIds.length
      ? await db.query("SELECT id, first_name, last_name, email, avatar_data_url FROM users WHERE id = ANY($1)", [userIds])
      : { rows: [] };
    const userById = Object.fromEntries(userRows.map((row) => [row.id, row]));
    const skillCounts = {};
    const sectorCounts = {};
    const scores = [];
    const items = runRows.map((row) => {
      const payload = parseJsonField(row.payload_json, {});
      const summary = getMatchPayloadSummary(payload);
      summary.technicalSkills.forEach((skill) => {
        const key = String(skill).trim();
        if (key) skillCounts[key] = (skillCounts[key] || 0) + 1;
      });
      if (summary.sector) sectorCounts[summary.sector] = (sectorCounts[summary.sector] || 0) + 1;
      if (Number.isFinite(Number(summary.score))) scores.push(Number(summary.score));
      const owner = userById[row.user_id];
      return {
        id: row.id,
        userId: row.user_id,
        userFirstName: owner?.first_name || "",
        userLastName: owner?.last_name || "",
        userEmail: owner?.email || "",
        userAvatarDataUrl: owner?.avatar_data_url || "",
        createdAt: row.created_at,
        ...summary
      };
    }).filter((item) => {
      if (!search) return true;
      const haystack = `${item.userFirstName} ${item.userLastName} ${item.userEmail} ${item.title} ${item.company} ${item.sector}`.toLowerCase();
      return haystack.includes(search);
    });

    const topSkills = Object.entries(skillCounts).sort((a, b) => b[1] - a[1]).slice(0, 12).map(([name, count]) => ({ name, count }));
    const topSectors = Object.entries(sectorCounts).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([name, count]) => ({ name, count }));
    return res.json({
      items,
      averageScore: scores.length ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length) : null,
      topSkills,
      topSectors
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ error: error.message || "Erreur serveur." });
  }
});

app.get("/api/admin/quality", async (req, res) => {
  try {
    const adminUserId = coerceString(req.query?.adminUserId);
    await requireAdmin(adminUserId);
    const search = coerceString(req.query?.search).toLowerCase();
    const { rows: cvRows } = await db.query("SELECT id, user_id, created_at, file_name, parsed_json FROM cvs ORDER BY created_at DESC LIMIT 500");
    const userIds = [...new Set(cvRows.map((row) => row.user_id))];
    const { rows: userRows } = userIds.length
      ? await db.query("SELECT id, first_name, last_name, email, avatar_data_url FROM users WHERE id = ANY($1)", [userIds])
      : { rows: [] };
    const userById = Object.fromEntries(userRows.map((row) => [row.id, row]));
    const items = cvRows.map((row) => {
      const parsed = parseJsonField(row.parsed_json, {});
      const extraction = getCvExtractionStatus(parsed);
      const owner = userById[row.user_id];
      return {
        id: row.id,
        userId: row.user_id,
        userFirstName: owner?.first_name || "",
        userLastName: owner?.last_name || "",
        userEmail: owner?.email || "",
        userAvatarDataUrl: owner?.avatar_data_url || "",
        createdAt: row.created_at,
        fileName: row.file_name,
        status: extraction.status,
        score: extraction.score,
        missing: extraction.missing,
        suspicious: extraction.suspicious,
        counts: extraction.counts
      };
    }).filter((item) => {
      if (item.status === "extracted") return false;
      if (!search) return true;
      const haystack = `${item.fileName} ${item.userFirstName} ${item.userLastName} ${item.userEmail} ${item.missing.join(" ")}`.toLowerCase();
      return haystack.includes(search);
    });
    return res.json({
      items,
      totals: {
        needsReview: items.filter((item) => item.status === "needs_review").length,
        partial: items.filter((item) => item.status === "partial").length
      }
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ error: error.message || "Erreur serveur." });
  }
});
}
