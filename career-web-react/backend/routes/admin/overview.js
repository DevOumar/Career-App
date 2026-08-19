// Sous-groupe de routes extrait de backend/routes/admin.js
// (voir ARCHITECTURE.md). Dépendances lues depuis app.locals.ctx.
export function registerAdminOverviewRoutes(app) {
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

app.get("/api/admin/overview", async (req, res) => {
  try {
    const adminUserId = coerceString(req.query?.adminUserId);
    await requireAdmin(adminUserId);

    const { rows: roleCounts } = await db.query(
      "SELECT role_type, COUNT(*)::int AS count FROM users GROUP BY role_type"
    );
    const { rows: cvCountRows } = await db.query("SELECT COUNT(*)::int AS count FROM cvs");
    const { rows: matchCountRows } = await db.query("SELECT COUNT(*)::int AS count FROM match_runs");
    const { rows: signupRows } = await db.query(
      "SELECT COUNT(*)::int AS count FROM users WHERE created_at >= $1",
      [new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()]
    );
    const { rows: userRows } = await db.query("SELECT role_type, subscription_json, created_at FROM users");

    const planCounts = {};
    const planCountsByRole = {};
    for (const row of userRows) {
      const subscription = parseJsonField(row.subscription_json, {});
      const planId = subscription.planId || "candidate_discovery";
      planCounts[planId] = (planCounts[planId] || 0) + 1;
      if (!planCountsByRole[row.role_type]) planCountsByRole[row.role_type] = {};
      planCountsByRole[row.role_type][planId] = (planCountsByRole[row.role_type][planId] || 0) + 1;
    }

    const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
    const weekCount = 8;
    const now = Date.now();
    const buckets = Array.from({ length: weekCount }, (_, index) => {
      const weeksAgo = weekCount - 1 - index;
      const start = now - (weeksAgo + 1) * WEEK_MS;
      const end = now - weeksAgo * WEEK_MS;
      return { start, end, count: 0 };
    });
    for (const row of userRows) {
      const createdAt = new Date(row.created_at).getTime();
      if (Number.isNaN(createdAt)) continue;
      const bucket = buckets.find((item) => createdAt >= item.start && createdAt < item.end);
      if (bucket) bucket.count += 1;
    }
    const signupsTrend = buckets.map((bucket) => ({
      weekStart: new Date(bucket.start).toISOString(),
      count: bucket.count
    }));

    // Taux de conversion gratuit -> payant : part des comptes dont le plan
    // actif "grantsPremium" (donc réellement payant), calculé sur les mêmes
    // lignes déjà chargées ci-dessus (pas de requête supplémentaire).
    let paidUsers = 0;
    for (const row of userRows) {
      const subscription = parseJsonField(row.subscription_json, {});
      const plan = getPlanById(subscription.planId);
      if (plan?.grantsPremium) paidUsers += 1;
    }
    const conversionRate = userRows.length ? paidUsers / userRows.length : 0;

    // Revenu encaissé ce mois-ci vs le mois précédent (croissance).
    const monthStart = new Date();
    monthStart.setUTCDate(1);
    monthStart.setUTCHours(0, 0, 0, 0);
    const prevMonthStart = new Date(monthStart);
    prevMonthStart.setUTCMonth(prevMonthStart.getUTCMonth() - 1);
    const { rows: revenueRows } = await db.query(
      `SELECT
         COALESCE(SUM(amount_collected) FILTER (WHERE created_at >= $1), 0) AS current_month,
         COALESCE(SUM(amount_collected) FILTER (WHERE created_at >= $2 AND created_at < $1), 0) AS previous_month
       FROM transactions`,
      [monthStart.toISOString(), prevMonthStart.toISOString()]
    );
    const revenueThisMonth = Number(revenueRows[0]?.current_month || 0);
    const revenuePreviousMonth = Number(revenueRows[0]?.previous_month || 0);
    const revenueGrowth = revenuePreviousMonth > 0 ? (revenueThisMonth - revenuePreviousMonth) / revenuePreviousMonth : null;

    // Utilisation des sièges de licence, agrégée sur tous les codes actifs
    // (non révoqués).
    const { rows: licenseUsageRows } = await db.query(
      "SELECT COALESCE(SUM(seats_used),0)::int AS used, COALESCE(SUM(seats_total),0)::int AS total FROM license_codes WHERE COALESCE(revoked,0) = 0"
    );
    const seatsUsed = licenseUsageRows[0]?.used || 0;
    const seatsTotal = licenseUsageRows[0]?.total || 0;

    // Invitations école envoyées mais jamais activées.
    const { rows: pendingInviteRows } = await db.query(
      "SELECT COUNT(*)::int AS count FROM school_invitations WHERE status = 'pending'"
    );

    // Recherches Email Scout effectuées (event déjà loggé par la fonctionnalité).
    const { rows: emailScoutRows } = await db.query(
      "SELECT COUNT(*)::int AS count FROM account_security_events WHERE event_type = 'email_finder_search'"
    );

    // Comptes inactifs : créés il y a plus de 30 jours et sans aucune
    // connexion enregistrée depuis 30 jours (les comptes tout juste créés ne
    // sont pas comptés comme "inactifs", ils n'ont simplement pas encore eu
    // l'occasion de se reconnecter).
    const { rows: inactiveRows } = await db.query(
      `SELECT COUNT(*)::int AS count
       FROM users u
       WHERE u.created_at < $1
         AND NOT EXISTS (
           SELECT 1 FROM account_security_events e
           WHERE e.user_id = u.id
             AND e.event_type IN ('login_password', 'login_google')
             AND e.created_at >= $1
         )`,
      [new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()]
    );
    const inactiveAccounts = inactiveRows[0]?.count || 0;

    return res.json({
      usersByRole: Object.fromEntries(roleCounts.map((row) => [row.role_type, row.count])),
      totalCvs: cvCountRows[0]?.count || 0,
      totalMatchRuns: matchCountRows[0]?.count || 0,
      signupsLast30Days: signupRows[0]?.count || 0,
      planCounts,
      planCountsByRole,
      signupsTrend,
      conversionRate,
      revenueThisMonth,
      revenuePreviousMonth,
      revenueGrowth,
      licenseSeatsUsed: seatsUsed,
      licenseSeatsTotal: seatsTotal,
      pendingInvitations: pendingInviteRows[0]?.count || 0,
      emailScoutSearches: emailScoutRows[0]?.count || 0,
      inactiveAccounts
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ error: error.message || "Erreur serveur." });
  }
});

app.get("/api/admin/notifications", async (req, res) => {
  try {
    const adminUserId = coerceString(req.query?.adminUserId);
    await requireAdmin(adminUserId);

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const [signupRes, paymentRes, fullCodesRes, failedAnnouncementsRes] = await Promise.all([
      db.query(
        "SELECT id, first_name, last_name, role_type, created_at FROM users WHERE created_at >= $1 ORDER BY created_at DESC LIMIT 10",
        [sevenDaysAgo]
      ),
      db.query(
        `SELECT t.id, t.amount_collected, t.currency, t.plan_id, t.created_at, u.first_name, u.last_name
         FROM transactions t
         LEFT JOIN users u ON u.id = t.user_id
         WHERE t.source = 'stripe' AND t.amount_collected > 0 AND t.created_at >= $1
         ORDER BY t.created_at DESC LIMIT 10`,
        [sevenDaysAgo]
      ),
      db.query(
        `SELECT code, owner_user_id, plan_id, seats_total, seats_used, u.first_name, u.last_name
         FROM license_codes
         LEFT JOIN users u ON u.id = license_codes.owner_user_id
         WHERE COALESCE(revoked,0) = 0 AND seats_total > 0 AND seats_used >= seats_total
         ORDER BY license_codes.created_at DESC LIMIT 10`
      ),
      db.query(
        "SELECT id, subject, audience, failed_count, created_at FROM announcements WHERE failed_count > 0 ORDER BY created_at DESC LIMIT 10"
      )
    ]);

    const items = [];

    for (const row of signupRes.rows) {
      const isOrg = row.role_type === "school" || row.role_type === "recruiter_firm";
      items.push({
        id: `signup-${row.id}`,
        type: isOrg ? "new_org" : "new_signup",
        createdAt: row.created_at,
        data: { firstName: row.first_name, lastName: row.last_name, roleType: row.role_type }
      });
    }

    for (const row of paymentRes.rows) {
      items.push({
        id: `payment-${row.id}`,
        type: "new_payment",
        createdAt: row.created_at,
        data: {
          firstName: row.first_name,
          lastName: row.last_name,
          amount: Number(row.amount_collected),
          currency: row.currency,
          planId: row.plan_id
        }
      });
    }

    for (const row of fullCodesRes.rows) {
      items.push({
        id: `license-full-${row.code}`,
        type: "license_full",
        createdAt: null,
        data: {
          code: row.code,
          firstName: row.first_name,
          lastName: row.last_name,
          planId: row.plan_id,
          seatsTotal: row.seats_total
        }
      });
    }

    for (const row of failedAnnouncementsRes.rows) {
      items.push({
        id: `announcement-failed-${row.id}`,
        type: "announcement_failed",
        createdAt: row.created_at,
        data: { subject: row.subject, audience: row.audience, failedCount: row.failed_count }
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
