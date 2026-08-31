// Sous-groupe de routes extrait de backend/routes/admin.js
// (voir ARCHITECTURE.md). Dépendances lues depuis app.locals.ctx.
export function registerAdminFinanceRoutes(app) {
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
    requireAdminModule,
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

app.get("/api/admin/finance", async (req, res) => {
  try {
    const adminUserId = coerceString(req.query?.adminUserId);
    if (!requireMatchingSession(req, res, adminUserId)) return;
    await requireAdminModule(adminUserId, "finance");

    const source = coerceString(req.query?.source);
    const search = coerceString(req.query?.search).toLowerCase();

    const { rows: txnRows } = await db.query(
      "SELECT * FROM transactions ORDER BY created_at DESC LIMIT 500"
    );
    const userIds = [...new Set(txnRows.map((row) => row.user_id))];
    const { rows: userRows } = userIds.length
      ? await db.query(
          `SELECT id, first_name, last_name, email, role_type, avatar_data_url FROM users WHERE id = ANY($1)`,
          [userIds]
        )
      : { rows: [] };
    const userById = Object.fromEntries(userRows.map((row) => [row.id, row]));

    const filtered = txnRows.filter((row) => {
      if (source && row.source !== source) return false;
      if (!search) return true;
      const owner = userById[row.user_id];
      const haystack = `${owner?.first_name || ""} ${owner?.last_name || ""} ${owner?.email || ""} ${row.plan_id}`.toLowerCase();
      return haystack.includes(search);
    });

    const items = filtered.map((row) => {
      const owner = userById[row.user_id];
      return {
        id: row.id,
        userId: row.user_id,
        userFirstName: owner?.first_name || "",
        userLastName: owner?.last_name || "",
        userEmail: owner?.email || "",
        userRoleType: owner?.role_type || "",
        userAvatarDataUrl: owner?.avatar_data_url || "",
        planId: row.plan_id,
        billingCycle: row.billing_cycle,
        listedAmount: Number(row.listed_amount),
        amountCollected: Number(row.amount_collected),
        currency: row.currency,
        source: row.source,
        licenseCode: row.license_code,
        createdAt: row.created_at,
        refunded: Boolean(Number(row.refunded)),
        refundedAt: row.refunded_at || null,
        // Un remboursement n'est proposable que si un payment_intent réel a
        // été capturé (sessions Stripe "payment", pas les abonnements) et
        // qu'un montant a bien été encaissé.
        refundable: row.source === "stripe" && Boolean(row.stripe_payment_intent_id) && Number(row.amount_collected) > 0 && !Number(row.refunded)
      };
    });

    const totalRevenueCollected = txnRows.reduce((sum, row) => sum + Number(row.amount_collected), 0);
    const totalListedValue = txnRows.reduce((sum, row) => sum + Number(row.listed_amount), 0);

    const revenueByPlan = {};
    const countBySource = {};
    // Segment (candidat / agence / école) dérivé du plan_id via getPlanById —
    // même mapping que le reste de l'app, pour que "combien l'école nous
    // rapporte" se lise directement ici sans croiser les tables à la main.
    const revenueBySegment = { candidate: 0, agency: 0, school: 0, other: 0 };
    for (const row of txnRows) {
      revenueByPlan[row.plan_id] = (revenueByPlan[row.plan_id] || 0) + Number(row.amount_collected);
      countBySource[row.source] = (countBySource[row.source] || 0) + 1;
      const segment = getPlanById(row.plan_id)?.segment || "other";
      revenueBySegment[segment] = (revenueBySegment[segment] || 0) + Number(row.amount_collected);
    }
    for (const key of Object.keys(revenueBySegment)) {
      revenueBySegment[key] = Math.round(revenueBySegment[key] * 100) / 100;
    }

    const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
    const weekCount = 8;
    const now = Date.now();
    const buckets = Array.from({ length: weekCount }, (_, index) => {
      const weeksAgo = weekCount - 1 - index;
      const start = now - (weeksAgo + 1) * WEEK_MS;
      const end = now - weeksAgo * WEEK_MS;
      return { start, end, amount: 0 };
    });
    for (const row of txnRows) {
      const createdAt = new Date(row.created_at).getTime();
      if (Number.isNaN(createdAt)) continue;
      const bucket = buckets.find((item) => createdAt >= item.start && createdAt < item.end);
      if (bucket) bucket.amount += Number(row.amount_collected);
    }
    const revenueTrend = buckets.map((bucket) => ({
      weekStart: new Date(bucket.start).toISOString(),
      amount: Math.round(bucket.amount * 100) / 100
    }));

    return res.json({
      items,
      totalTransactions: txnRows.length,
      totalRevenueCollected: Math.round(totalRevenueCollected * 100) / 100,
      totalListedValue: Math.round(totalListedValue * 100) / 100,
      revenueByPlan,
      revenueBySegment,
      countBySource,
      revenueTrend
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ error: error.message || "Erreur serveur." });
  }
});

app.post("/api/admin/transactions/:id/refund", async (req, res) => {
  try {
    const adminUserId = coerceString(req.body?.adminUserId);
    if (!requireMatchingSession(req, res, adminUserId)) return;
    await requireAdminModule(adminUserId, "finance");

    if (!stripe) {
      return res.status(503).json({ error: "Paiement Stripe non configuré côté serveur." });
    }

    const txnId = coerceString(req.params.id);
    const { rows } = await db.query("SELECT * FROM transactions WHERE id = $1", [txnId]);
    const txn = rows[0];
    if (!txn) {
      return res.status(404).json({ error: "Transaction introuvable." });
    }
    if (txn.source !== "stripe" || !txn.stripe_payment_intent_id) {
      return res.status(400).json({
        error:
          "Remboursement impossible pour cette transaction (pas de paiement Stripe direct — probablement un abonnement, à gérer depuis le dashboard Stripe)."
      });
    }
    if (Number(txn.refunded)) {
      return res.status(400).json({ error: "Cette transaction a déjà été remboursée." });
    }

    await stripe.refunds.create({ payment_intent: txn.stripe_payment_intent_id });

    const refundedAt = nowIso();
    await db.query("UPDATE transactions SET refunded = 1, refunded_at = $1 WHERE id = $2", [refundedAt, txnId]);

    await logSecurityEvent(req, adminUserId, "admin_transaction_refunded", {
      transactionId: txnId,
      userId: txn.user_id,
      amount: Number(txn.amount_collected)
    });

    return res.json({ ok: true, refundedAt });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ error: error.message || "Erreur serveur." });
  }
});
}
