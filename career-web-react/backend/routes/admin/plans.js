// Sous-groupe de routes extrait de backend/routes/admin.js
// (voir ARCHITECTURE.md). Dépendances lues depuis app.locals.ctx.
export function registerAdminPlansRoutes(app) {
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

app.get("/api/admin/plans", async (req, res) => {
  try {
    const adminUserId = coerceString(req.query?.adminUserId);
    if (!requireMatchingSession(req, res, adminUserId)) return;
    await requireAdminModule(adminUserId, "pricing");

    const { rows } = await db.query("SELECT * FROM plan_overrides");
    const overrideByPlan = Object.fromEntries(rows.map((row) => [row.plan_id, row]));

    const items = PLANS.map((plan) => {
      const override = overrideByPlan[plan.id];
      return {
        id: plan.id,
        segment: plan.segment,
        name: plan.name,
        grantsPremium: plan.grantsPremium,
        isSinglePrice: plan.monthlyPrice == null,
        monthlyPrice: override?.monthly_price != null ? Number(override.monthly_price) : plan.monthlyPrice,
        annualPrice: override?.annual_price != null ? Number(override.annual_price) : plan.annualPrice,
        defaultMonthlyPrice: plan.monthlyPrice,
        defaultAnnualPrice: plan.annualPrice,
        overridden: Boolean(override),
        updatedAt: override?.updated_at || null
      };
    });

    return res.json({ items });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ error: error.message || "Erreur serveur." });
  }
});

app.put("/api/admin/plans/:id", async (req, res) => {
  try {
    const adminUserId = coerceString(req.body?.adminUserId);
    if (!requireMatchingSession(req, res, adminUserId)) return;
    await requireAdminModule(adminUserId, "pricing");

    const planId = coerceString(req.params.id);
    const plan = getPlanById(planId);
    if (!plan) {
      return res.status(404).json({ error: "Plan inconnu." });
    }

    const { rows: existingRows } = await db.query("SELECT * FROM plan_overrides WHERE plan_id = $1", [planId]);
    const existing = existingRows[0] || null;
    const isSinglePrice = plan.monthlyPrice == null;

    const currentMonthly = existing?.monthly_price != null ? Number(existing.monthly_price) : plan.monthlyPrice;
    const currentAnnual = existing?.annual_price != null ? Number(existing.annual_price) : plan.annualPrice;

    const nextMonthly = isSinglePrice ? null : Number(req.body?.monthlyPrice);
    const nextAnnual = Number(req.body?.annualPrice);

    if (!isSinglePrice && (!Number.isFinite(nextMonthly) || nextMonthly < 0)) {
      return res.status(400).json({ error: "Prix mensuel invalide." });
    }
    if (!Number.isFinite(nextAnnual) || nextAnnual < 0) {
      return res.status(400).json({ error: "Prix annuel invalide." });
    }

    // Les Price Stripe sont immuables : changer un montant nécessite d'en
    // créer un nouveau et de pointer dessus, plutôt que de modifier l'ancien.
    // On ne recrée que ce qui a réellement changé, pour ne pas polluer le
    // dashboard Stripe de Price inutiles à chaque sauvegarde.
    let stripePriceIdMonthly = null;
    let stripePriceIdAnnual = null;

    if (plan.grantsPremium && stripe) {
      if (isSinglePrice) {
        if (nextAnnual !== currentAnnual || !existing?.stripe_price_id_annual) {
          const product = await stripe.products.create({ name: `Career CV - ${plan.name.fr}` });
          const price = await stripe.prices.create({
            product: product.id,
            unit_amount: Math.round(nextAnnual * 100),
            currency: "eur"
          });
          stripePriceIdAnnual = price.id;
        }
      } else {
        if (nextMonthly !== currentMonthly || !existing?.stripe_price_id_monthly) {
          const product = await stripe.products.create({ name: `Career CV - ${plan.name.fr} (mensuel)` });
          const price = await stripe.prices.create({
            product: product.id,
            unit_amount: Math.round(nextMonthly * 100),
            currency: "eur",
            recurring: { interval: "month" }
          });
          stripePriceIdMonthly = price.id;
        }
        if (nextAnnual !== currentAnnual || !existing?.stripe_price_id_annual) {
          const product = await stripe.products.create({ name: `Career CV - ${plan.name.fr} (annuel)` });
          const price = await stripe.prices.create({
            product: product.id,
            unit_amount: Math.round(nextAnnual * 100),
            currency: "eur",
            recurring: { interval: "year" }
          });
          stripePriceIdAnnual = price.id;
        }
      }
    }

    const updatedAt = nowIso();
    await db.query(
      `INSERT INTO plan_overrides (plan_id, monthly_price, annual_price, stripe_price_id_monthly, stripe_price_id_annual, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (plan_id) DO UPDATE SET
         monthly_price = $2,
         annual_price = $3,
         stripe_price_id_monthly = COALESCE($4, plan_overrides.stripe_price_id_monthly),
         stripe_price_id_annual = COALESCE($5, plan_overrides.stripe_price_id_annual),
         updated_at = $6`,
      [planId, isSinglePrice ? null : nextMonthly, nextAnnual, stripePriceIdMonthly, stripePriceIdAnnual, updatedAt]
    );

    await logSecurityEvent(req, adminUserId, "admin_plan_price_changed", {
      planId,
      monthlyPrice: isSinglePrice ? null : nextMonthly,
      annualPrice: nextAnnual
    });

    return res.json({
      ok: true,
      planId,
      monthlyPrice: isSinglePrice ? null : nextMonthly,
      annualPrice: nextAnnual
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ error: error.message || "Erreur serveur." });
  }
});

app.post("/api/admin/plans/:id/reset", async (req, res) => {
  try {
    const adminUserId = coerceString(req.body?.adminUserId);
    if (!requireMatchingSession(req, res, adminUserId)) return;
    await requireAdminModule(adminUserId, "pricing");
    const planId = coerceString(req.params.id);
    await db.query("DELETE FROM plan_overrides WHERE plan_id = $1", [planId]);
    await logSecurityEvent(req, adminUserId, "admin_plan_price_reset", { planId });
    return res.json({ ok: true });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ error: error.message || "Erreur serveur." });
  }
});
}
