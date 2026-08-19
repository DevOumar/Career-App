// Routes admin — extrait automatiquement de backend/index.js (voir
// ARCHITECTURE.md). Toutes les dépendances (db, helpers, constantes) sont
// lues depuis app.locals.ctx, rempli une fois dans index.js après
// l'initialisation complète (DB ouverte, helpers définis).
export function registerAdminRoutes(app) {
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

app.get("/api/admin/satisfaction", async (req, res) => {
  try {
    const adminUserId = coerceString(req.query?.adminUserId);
    await requireAdmin(adminUserId);

    const { rows } = await db.query(
      `SELECT s.id, s.user_id, s.score, s.comment, s.created_at, u.first_name, u.last_name, u.email
       FROM satisfaction_surveys s
       LEFT JOIN users u ON u.id = s.user_id
       ORDER BY s.created_at DESC
       LIMIT 500`
    );

    const scores = rows.map((row) => Number(row.score)).filter((score) => Number.isFinite(score));
    const average = scores.length ? scores.reduce((sum, score) => sum + score, 0) / scores.length : null;
    const promoters = scores.filter((score) => score >= 9).length;
    const passives = scores.filter((score) => score >= 7 && score <= 8).length;
    const detractors = scores.filter((score) => score <= 6).length;
    const nps = scores.length ? Math.round(((promoters - detractors) / scores.length) * 100) : null;

    const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
    const weekCount = 8;
    const now = Date.now();
    const buckets = Array.from({ length: weekCount }, (_, index) => {
      const weeksAgo = weekCount - 1 - index;
      const start = now - (weeksAgo + 1) * WEEK_MS;
      const end = now - weeksAgo * WEEK_MS;
      return { start, end, scores: [] };
    });
    for (const row of rows) {
      const createdAt = new Date(row.created_at).getTime();
      if (Number.isNaN(createdAt)) continue;
      const bucket = buckets.find((item) => createdAt >= item.start && createdAt < item.end);
      if (bucket) bucket.scores.push(Number(row.score));
    }
    const trend = buckets.map((bucket) => ({
      weekStart: new Date(bucket.start).toISOString(),
      average: bucket.scores.length ? bucket.scores.reduce((sum, score) => sum + score, 0) / bucket.scores.length : null,
      count: bucket.scores.length
    }));

    return res.json({
      average,
      nps,
      totalResponses: scores.length,
      promoters,
      passives,
      detractors,
      trend,
      responses: rows.map((row) => ({
        id: row.id,
        userId: row.user_id,
        userName: `${row.first_name || ""} ${row.last_name || ""}`.trim() || row.email || "—",
        score: Number(row.score),
        comment: row.comment || "",
        createdAt: row.created_at
      }))
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

app.get("/api/admin/plans", async (req, res) => {
  try {
    const adminUserId = coerceString(req.query?.adminUserId);
    await requireAdmin(adminUserId);

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
    await requireAdmin(adminUserId);

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
          const product = await stripe.products.create({ name: `Career App - ${plan.name.fr} (tarif admin)` });
          const price = await stripe.prices.create({
            product: product.id,
            unit_amount: Math.round(nextAnnual * 100),
            currency: "eur"
          });
          stripePriceIdAnnual = price.id;
        }
      } else {
        if (nextMonthly !== currentMonthly || !existing?.stripe_price_id_monthly) {
          const product = await stripe.products.create({ name: `Career App - ${plan.name.fr} (mensuel, tarif admin)` });
          const price = await stripe.prices.create({
            product: product.id,
            unit_amount: Math.round(nextMonthly * 100),
            currency: "eur",
            recurring: { interval: "month" }
          });
          stripePriceIdMonthly = price.id;
        }
        if (nextAnnual !== currentAnnual || !existing?.stripe_price_id_annual) {
          const product = await stripe.products.create({ name: `Career App - ${plan.name.fr} (annuel, tarif admin)` });
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
    await requireAdmin(adminUserId);
    const planId = coerceString(req.params.id);
    await db.query("DELETE FROM plan_overrides WHERE plan_id = $1", [planId]);
    await logSecurityEvent(req, adminUserId, "admin_plan_price_reset", { planId });
    return res.json({ ok: true });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ error: error.message || "Erreur serveur." });
  }
});

app.get("/api/admin/users", async (req, res) => {
  try {
    const adminUserId = coerceString(req.query?.adminUserId);
    await requireAdmin(adminUserId);

    const search = coerceString(req.query?.search).toLowerCase();
    const roleType = coerceString(req.query?.roleType);

    const { rows } = await db.query(
      "SELECT id, first_name, last_name, email, role_type, avatar_data_url, status, created_at, subscription_json, admin_modules_json FROM users ORDER BY created_at DESC LIMIT 300"
    );
    const userIds = rows.map((row) => row.id);
    const [{ rows: cvRows }, { rows: matchRows }, { rows: loginRows }] = await Promise.all([
      userIds.length
        ? db.query("SELECT user_id, COUNT(*)::int AS count FROM cvs WHERE user_id = ANY($1) GROUP BY user_id", [userIds])
        : { rows: [] },
      userIds.length
        ? db.query("SELECT user_id, COUNT(*)::int AS count FROM match_runs WHERE user_id = ANY($1) GROUP BY user_id", [userIds])
        : { rows: [] },
      userIds.length
        ? db.query(
            `SELECT user_id, MAX(created_at) AS last_login
             FROM account_security_events
             WHERE user_id = ANY($1) AND event_type IN ('login_password', 'login_google', 'login_email_code')
             GROUP BY user_id`,
            [userIds]
          )
        : { rows: [] }
    ]);
    const cvCountByUser = Object.fromEntries(cvRows.map((row) => [row.user_id, row.count]));
    const matchCountByUser = Object.fromEntries(matchRows.map((row) => [row.user_id, row.count]));
    const lastLoginByUser = Object.fromEntries(loginRows.map((row) => [row.user_id, row.last_login]));

    const filtered = rows.filter((row) => {
      if (roleType && row.role_type !== roleType) return false;
      if (!search) return true;
      const haystack = `${row.first_name} ${row.last_name} ${row.email}`.toLowerCase();
      return haystack.includes(search);
    });

    return res.json({
      items: filtered.map((row) => {
        const subscription = parseJsonField(row.subscription_json, {});
        return {
          id: row.id,
          firstName: row.first_name,
          lastName: row.last_name,
          email: row.email,
          roleType: row.role_type,
          avatarDataUrl: row.avatar_data_url || "",
          status: row.status || "active",
          planId: subscription.planId || null,
          billingCycle: subscription.billingCycle || null,
          cvCount: cvCountByUser[row.id] || 0,
          matchCount: matchCountByUser[row.id] || 0,
          lastLoginAt: lastLoginByUser[row.id] || "",
          createdAt: row.created_at,
          adminModules: row.role_type === "admin" ? sanitizeAdminModules(parseJsonField(row.admin_modules_json, [])) : undefined
        };
      })
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ error: error.message || "Erreur serveur." });
  }
});

app.get("/api/admin/org-accounts", async (req, res) => {
  try {
    const adminUserId = coerceString(req.query?.adminUserId);
    await requireAdmin(adminUserId);

    const roleType = coerceString(req.query?.roleType);
    if (roleType !== "school" && roleType !== "recruiter_firm") {
      return res.status(400).json({ error: "roleType doit être 'school' ou 'recruiter_firm'." });
    }

    const { rows: orgRows } = await db.query(
      "SELECT id, first_name, last_name, email, avatar_data_url, created_at FROM users WHERE role_type = $1 ORDER BY created_at DESC",
      [roleType]
    );
    const { rows: codeRows } = await db.query(
      "SELECT code, owner_user_id, plan_id, seats_total, seats_used FROM license_codes"
    );
    const { rows: memberRows } = await db.query(
      "SELECT id, first_name, last_name, email, role_type, avatar_data_url, created_at, subscription_json FROM users"
    );
    const profileTable = roleType === "school" ? "user_org_profiles" : "user_recruiter_profiles";
    const { rows: profileRows } = await db.query(
      `SELECT user_id, organization_name FROM ${profileTable}`
    );
    const orgNameByUser = Object.fromEntries(profileRows.map((row) => [row.user_id, row.organization_name]));

    const codesByOwner = {};
    for (const code of codeRows) {
      if (!codesByOwner[code.owner_user_id]) codesByOwner[code.owner_user_id] = [];
      codesByOwner[code.owner_user_id].push(code);
    }

    const items = orgRows.map((org) => {
      const orgCodes = codesByOwner[org.id] || [];
      const codeSet = new Set(orgCodes.map((code) => code.code));
      const members = memberRows
        .filter((member) => {
          const subscription = parseJsonField(member.subscription_json, {});
          return subscription.licenseCode && codeSet.has(subscription.licenseCode);
        })
        .map((member) => ({
          id: member.id,
          firstName: member.first_name,
          lastName: member.last_name,
          email: member.email,
          roleType: member.role_type,
          avatarDataUrl: member.avatar_data_url || "",
          createdAt: member.created_at
        }));

      return {
        id: org.id,
        firstName: org.first_name,
        lastName: org.last_name,
        avatarDataUrl: org.avatar_data_url || "",
        organizationName: orgNameByUser[org.id] || "",
        email: org.email,
        createdAt: org.created_at,
        licenseCodes: orgCodes.map((code) => ({
          code: code.code,
          planId: code.plan_id,
          seatsTotal: code.seats_total,
          seatsUsed: code.seats_used
        })),
        members
      };
    });

    return res.json({ items });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ error: error.message || "Erreur serveur." });
  }
});

app.get("/api/admin/activity-log", async (req, res) => {
  try {
    const adminUserId = coerceString(req.query?.adminUserId);
    await requireAdmin(adminUserId);

    const search = coerceString(req.query?.search).toLowerCase();
    const eventType = coerceString(req.query?.eventType);

    const { rows: eventRows } = await db.query(
      "SELECT * FROM account_security_events ORDER BY created_at DESC LIMIT 500"
    );
    const userIds = [...new Set(eventRows.map((row) => row.user_id))];
    const { rows: userRows } = userIds.length
      ? await db.query(
          "SELECT id, first_name, last_name, email, avatar_data_url FROM users WHERE id = ANY($1)",
          [userIds]
        )
      : { rows: [] };
    const userById = Object.fromEntries(userRows.map((row) => [row.id, row]));

    const filtered = eventRows.filter((row) => {
      if (eventType && row.event_type !== eventType) return false;
      if (!search) return true;
      const actor = userById[row.user_id];
      const haystack = `${actor?.first_name || ""} ${actor?.last_name || ""} ${actor?.email || ""} ${row.event_type} ${row.ip_address}`.toLowerCase();
      return haystack.includes(search);
    });

    const eventTypeCounts = {};
    for (const row of eventRows) {
      eventTypeCounts[row.event_type] = (eventTypeCounts[row.event_type] || 0) + 1;
    }

    return res.json({
      items: filtered.map((row) => {
        const actor = userById[row.user_id];
        return {
          id: row.id,
          userId: row.user_id,
          userFirstName: actor?.first_name || "",
          userLastName: actor?.last_name || "",
          userEmail: actor?.email || row.user_id,
          userAvatarDataUrl: actor?.avatar_data_url || "",
          eventType: row.event_type,
          metadata: parseJsonField(row.metadata_json, {}),
          ipAddress: row.ip_address,
          userAgent: row.user_agent,
          createdAt: row.created_at
        };
      }),
      total: eventRows.length,
      eventTypeCounts
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ error: error.message || "Erreur serveur." });
  }
});

app.get("/api/admin/license-codes", async (req, res) => {
  try {
    const adminUserId = coerceString(req.query?.adminUserId);
    await requireAdmin(adminUserId);

    const search = coerceString(req.query?.search).toLowerCase();

    const { rows: codeRows } = await db.query("SELECT * FROM license_codes ORDER BY created_at DESC LIMIT 500");
    const ownerIds = [...new Set(codeRows.map((row) => row.owner_user_id))];
    const { rows: ownerRows } = ownerIds.length
      ? await db.query(
          "SELECT id, first_name, last_name, email, role_type, avatar_data_url FROM users WHERE id = ANY($1)",
          [ownerIds]
        )
      : { rows: [] };
    const ownerById = Object.fromEntries(ownerRows.map((row) => [row.id, row]));

    const filtered = codeRows.filter((row) => {
      if (!search) return true;
      const owner = ownerById[row.owner_user_id];
      const haystack = `${row.code} ${owner?.first_name || ""} ${owner?.last_name || ""} ${owner?.email || ""} ${row.plan_id}`.toLowerCase();
      return haystack.includes(search);
    });

    return res.json({
      items: filtered.map((row) => {
        const owner = ownerById[row.owner_user_id];
        return {
          code: row.code,
          ownerId: row.owner_user_id,
          ownerFirstName: owner?.first_name || "",
          ownerLastName: owner?.last_name || "",
          ownerEmail: owner?.email || "",
          ownerRoleType: owner?.role_type || "",
          ownerAvatarDataUrl: owner?.avatar_data_url || "",
          planId: row.plan_id,
          seatsTotal: row.seats_total,
          seatsUsed: row.seats_used,
          revoked: Boolean(Number(row.revoked)),
          createdAt: row.created_at
        };
      })
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ error: error.message || "Erreur serveur." });
  }
});

app.post("/api/admin/license-codes/revoke", async (req, res) => {
  try {
    const adminUserId = coerceString(req.body?.adminUserId);
    await requireAdmin(adminUserId);

    const code = coerceString(req.body?.code).toUpperCase();
    const { rows } = await db.query("SELECT * FROM license_codes WHERE code = $1", [code]);
    if (!rows[0]) {
      return res.status(404).json({ error: "Code de licence introuvable." });
    }

    await db.query("UPDATE license_codes SET revoked = 1, revoked_at = $1 WHERE code = $2", [nowIso(), code]);
    await logSecurityEvent(req, adminUserId, "admin_license_code_revoked", { code });

    return res.json({ ok: true });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ error: error.message || "Erreur serveur." });
  }
});

app.post("/api/admin/license-codes/restore", async (req, res) => {
  try {
    const adminUserId = coerceString(req.body?.adminUserId);
    await requireAdmin(adminUserId);

    const code = coerceString(req.body?.code).toUpperCase();
    const { rows } = await db.query("SELECT * FROM license_codes WHERE code = $1", [code]);
    if (!rows[0]) {
      return res.status(404).json({ error: "Code de licence introuvable." });
    }

    await db.query("UPDATE license_codes SET revoked = 0, revoked_at = '' WHERE code = $1", [code]);
    await logSecurityEvent(req, adminUserId, "admin_license_code_restored", { code });

    return res.json({ ok: true });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ error: error.message || "Erreur serveur." });
  }
});

app.get("/api/admin/settings", async (req, res) => {
  try {
    const adminUserId = coerceString(req.query?.adminUserId);
    await requireAdmin(adminUserId);

    return res.json({
      googleSignInEnabled: getPlatformSettingBool("google_signin_enabled"),
      googleConfigured: Boolean(googleOAuthClient),
      stripeEnabled: getPlatformSettingBool("stripe_enabled"),
      stripeConfigured: Boolean(stripe)
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ error: error.message || "Erreur serveur." });
  }
});

app.post("/api/admin/settings", async (req, res) => {
  try {
    const adminUserId = coerceString(req.body?.adminUserId);
    await requireAdmin(adminUserId);

    const key = coerceString(req.body?.key);
    const value = Boolean(req.body?.value);
    if (!Object.prototype.hasOwnProperty.call(PLATFORM_SETTING_DEFAULTS, key)) {
      return res.status(400).json({ error: "Paramètre inconnu." });
    }

    await setPlatformSetting(key, value ? "true" : "false");
    await logSecurityEvent(req, adminUserId, "admin_setting_changed", { key, value });

    return res.json({
      googleSignInEnabled: getPlatformSettingBool("google_signin_enabled"),
      googleConfigured: Boolean(googleOAuthClient),
      stripeEnabled: getPlatformSettingBool("stripe_enabled"),
      stripeConfigured: Boolean(stripe)
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ error: error.message || "Erreur serveur." });
  }
});

app.get("/api/admin/announcements/audience-count", async (req, res) => {
  try {
    const adminUserId = coerceString(req.query?.adminUserId);
    await requireAdmin(adminUserId);

    const audience = coerceString(req.query?.audience);
    const recipients = await resolveAnnouncementAudience(audience);
    return res.json({ count: recipients.length });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ error: error.message || "Erreur serveur." });
  }
});

app.get("/api/admin/announcements", async (req, res) => {
  try {
    const adminUserId = coerceString(req.query?.adminUserId);
    await requireAdmin(adminUserId);

    const { rows } = await db.query("SELECT * FROM announcements ORDER BY created_at DESC LIMIT 100");
    return res.json({
      items: rows.map((row) => ({
        id: row.id,
        subject: row.subject,
        message: row.message,
        audience: row.audience,
        recipientCount: row.recipient_count,
        failedCount: row.failed_count,
        createdAt: row.created_at
      }))
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ error: error.message || "Erreur serveur." });
  }
});

app.post("/api/admin/announcements/send", async (req, res) => {
  try {
    const adminUserId = coerceString(req.body?.adminUserId);
    await requireAdmin(adminUserId);

    const subject = coerceString(req.body?.subject);
    const message = coerceString(req.body?.message);
    const audience = coerceString(req.body?.audience);
    const attachment = req.body?.attachment && typeof req.body.attachment === "object" ? req.body.attachment : null;

    if (!subject || !message) {
      return res.status(400).json({ error: "Objet et message requis." });
    }

    let attachments = [];
    if (attachment?.content && attachment?.name) {
      const filename = coerceString(attachment.name).replace(/[<>:"/\\|?*\x00-\x1F]/g, "_").slice(0, 160);
      const contentType = coerceString(attachment.type) || "application/octet-stream";
      const content = String(attachment.content).includes(",")
        ? String(attachment.content).split(",").pop()
        : String(attachment.content);
      if (Buffer.byteLength(content, "base64") > 10 * 1024 * 1024) {
        return res.status(400).json({ error: "La pièce jointe ne doit pas dépasser 10 Mo." });
      }
      attachments = [{ filename, content, encoding: "base64", contentType }];
    }

    const transporter = getMailTransporter();
    if (!transporter) {
      return res.status(503).json({ error: "SMTP non configuré côté serveur : impossible d'envoyer des emails." });
    }

    const recipients = await resolveAnnouncementAudience(audience);
    if (!recipients.length) {
      return res.status(400).json({ error: "Aucun destinataire pour cette audience." });
    }

    let failedCount = 0;
    for (const recipient of recipients) {
      const built = buildAnnouncementEmail({ subject, message, firstName: recipient.first_name });
      try {
        await transporter.sendMail({
          from: MAIL_FROM || `"${MAIL_FROM_NAME}" <${MAIL_FROM_ADDRESS || SMTP_USER}>`,
          to: recipient.email,
          subject: built.subject,
          text: built.text,
          html: built.html,
          attachments
        });
      } catch (sendError) {
        failedCount += 1;
        console.warn(`Echec envoi annonce a ${recipient.email}: ${sendError.message}`);
      }
    }

    const id = `ann-${crypto.randomUUID()}`;
    await db.query(
      `INSERT INTO announcements (id, admin_user_id, subject, message, audience, recipient_count, failed_count, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [id, adminUserId, subject, message, audience || "all", recipients.length, failedCount, nowIso()]
    );
    await logSecurityEvent(req, adminUserId, "admin_announcement_sent", {
      audience: audience || "all",
      recipientCount: recipients.length,
      failedCount
    });

    return res.json({ ok: true, recipientCount: recipients.length, failedCount });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ error: error.message || "Erreur serveur." });
  }
});

app.get("/api/admin/ai-samples", async (req, res) => {
  try {
    const adminUserId = coerceString(req.query?.adminUserId);
    await requireAdmin(adminUserId);

    const search = coerceString(req.query?.search).toLowerCase();

    const { rows: runRows } = await db.query(
      "SELECT id, user_id, created_at, payload_json FROM match_runs ORDER BY created_at DESC LIMIT 300"
    );
    const userIds = [...new Set(runRows.map((row) => row.user_id))];
    const { rows: userRows } = userIds.length
      ? await db.query(
          "SELECT id, first_name, last_name, email, avatar_data_url FROM users WHERE id = ANY($1)",
          [userIds]
        )
      : { rows: [] };
    const userById = Object.fromEntries(userRows.map((row) => [row.id, row]));

    const items = runRows
      .map((row) => {
        const payload = parseJsonField(row.payload_json, {});
        const owner = userById[row.user_id];
        return {
          id: row.id,
          userId: row.user_id,
          userFirstName: owner?.first_name || "",
          userLastName: owner?.last_name || "",
          userEmail: owner?.email || "",
          userAvatarDataUrl: owner?.avatar_data_url || "",
          jobTitle: payload.jobReview?.title || "",
          jobCompany: payload.jobReview?.company || "",
          score: payload.matchInsights?.score ?? null,
          strengths: Array.isArray(payload.matchInsights?.strengths) ? payload.matchInsights.strengths : [],
          missingKeywords: Array.isArray(payload.matchInsights?.missingKeywords) ? payload.matchInsights.missingKeywords : [],
          culturalFit: payload.matchInsights?.culturalFit || null,
          recommendation: payload.matchInsights?.recommendation || "",
          createdAt: row.created_at
        };
      })
      .filter((item) => {
        if (!search) return true;
        const haystack = `${item.userFirstName} ${item.userLastName} ${item.userEmail} ${item.jobTitle} ${item.jobCompany}`.toLowerCase();
        return haystack.includes(search);
      });

    return res.json({ items, total: runRows.length });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ error: error.message || "Erreur serveur." });
  }
});

app.get("/api/admin/ai-monitoring", async (req, res) => {
  try {
    const adminUserId = coerceString(req.query?.adminUserId);
    await requireAdmin(adminUserId);

    const { rows: cvRows } = await db.query("SELECT id, created_at, parsed_json FROM cvs ORDER BY created_at DESC LIMIT 500");
    const { rows: matchRows } = await db.query("SELECT id, created_at, payload_json FROM match_runs ORDER BY created_at DESC LIMIT 500");
    const { rows: eventRows } = await db.query(
      `SELECT event_type, COUNT(*)::int AS count
       FROM account_security_events
       WHERE event_type IN ('cv_upload', 'match_analysis', 'admin_announcement_sent')
       GROUP BY event_type`
    );

    const cvStatuses = cvRows.map((row) => getCvExtractionStatus(parseJsonField(row.parsed_json, {})));
    const successfulExtractions = cvStatuses.filter((item) => item.status === "extracted").length;
    const partialExtractions = cvStatuses.filter((item) => item.status === "partial").length;
    const failedExtractions = cvStatuses.filter((item) => item.status === "needs_review").length;
    const invalidResponses = cvStatuses.filter((item) => item.suspicious.length || item.missing.length >= 3);
    const providerCounts = {};
    const scores = [];
    for (const row of matchRows) {
      const payload = parseJsonField(row.payload_json, {});
      const provider = payload.provider || payload.extractionProvider || "local";
      providerCounts[provider] = (providerCounts[provider] || 0) + 1;
      const summary = getMatchPayloadSummary(payload);
      if (Number.isFinite(Number(summary.score))) scores.push(Number(summary.score));
    }

    const eventCounts = Object.fromEntries(eventRows.map((row) => [row.event_type, row.count]));
    return res.json({
      successfulExtractions,
      partialExtractions,
      failedExtractions,
      totalMatchRuns: matchRows.length,
      averageMatchScore: scores.length ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length) : null,
      providerCounts,
      estimatedCost: {
        currency: "EUR",
        amount: Number(((cvRows.length + matchRows.length) * 0.002).toFixed(3)),
        note: "Estimation indicative basée sur le nombre d'appels IA enregistrés."
      },
      averageAnalysisTimeSeconds: null,
      apiErrors: failedExtractions,
      eventCounts,
      invalidResponses: invalidResponses.slice(0, 12).map((status, index) => ({
        id: cvRows[index]?.id || `invalid-${index}`,
        createdAt: cvRows[index]?.created_at || "",
        missing: status.missing,
        suspicious: status.suspicious,
        score: status.score
      }))
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ error: error.message || "Erreur serveur." });
  }
});

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

app.get("/api/admin/finance", async (req, res) => {
  try {
    const adminUserId = coerceString(req.query?.adminUserId);
    await requireAdmin(adminUserId);

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
    for (const row of txnRows) {
      revenueByPlan[row.plan_id] = (revenueByPlan[row.plan_id] || 0) + Number(row.amount_collected);
      countBySource[row.source] = (countBySource[row.source] || 0) + 1;
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
    await requireAdmin(adminUserId);

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

app.post("/api/admin/users", async (req, res) => {
  try {
    const adminUserId = coerceString(req.body?.adminUserId);
    await requireAdmin(adminUserId);

    requireFields(req.body, ["firstName", "lastName", "email", "password", "accountType"]);
    const firstName = coerceString(req.body.firstName);
    const lastName = coerceString(req.body.lastName);
    const email = normalizeEmail(req.body.email);
    const password = String(req.body.password || "");
    const accountType = sanitizeAccountType(req.body.accountType);
    const planId = coerceString(req.body.planId);
    const billingCycle = coerceString(req.body.billingCycle);
    const organizationName = coerceString(req.body.organizationName);
    const schoolName = coerceString(req.body.schoolName);
    const website = coerceString(req.body.website);
    const adminModules = sanitizeAdminModules(req.body.adminModules);

    if (accountType === "other") {
      return res.status(400).json({ error: "Type de compte invalide pour une création par l'admin." });
    }
    if (!email.includes("@")) {
      return res.status(400).json({ error: "Email invalide." });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: "Le mot de passe doit contenir au moins 8 caractères." });
    }
    if ((accountType === "school" || accountType === "recruiter_firm") && !organizationName) {
      return res.status(400).json({
        error: accountType === "school" ? "Le nom de l'école est requis." : "Le nom du cabinet est requis."
      });
    }

    const existingUser = await getUserRowByAnyEmail(email);
    if (existingUser) {
      return res.status(409).json({ error: "Un compte existe déjà avec cet email." });
    }

    const id = `usr-${crypto.randomUUID()}`;
    const createdAt = nowIso();
    const passwordRecord = createPasswordRecord(password);
    const username = await buildUniqueUsername(firstName, lastName, email);
    const detailsByType = {
      school: { organizationName, website },
      recruiter_firm: { organizationName, website },
      student: { schoolName },
      candidate: { schoolName }
    };
    const onboardingPayload = sanitizeOnboardingPayload(accountType, { details: detailsByType[accountType] || {} });
    const seededProfile = applyOnboardingToProfile(
      { ...DEFAULT_PROFILE },
      onboardingPayload.accountType,
      onboardingPayload.details
    );

    await db.query(
      `INSERT INTO users (
        id, first_name, last_name, email, username, password_hash, password_salt, created_at,
        updated_at, role_type, avatar_data_url, profile_json, subscription_json, admin_modules_json
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
      [
        id,
        firstName,
        lastName,
        email,
        username,
        passwordRecord.hash,
        passwordRecord.salt,
        createdAt,
        createdAt,
        onboardingPayload.accountType,
        "",
        JSON.stringify(seededProfile),
        JSON.stringify({ plan: "free", status: "active", startedAt: createdAt, renewalAt: null }),
        JSON.stringify(adminModules)
      ]
    );

    if (accountType !== "admin") {
      await upsertUserAccount(id, onboardingPayload.accountType, onboardingPayload.base, "");
      await upsertRoleDetails(id, onboardingPayload.accountType, onboardingPayload.details);
    }
    await db.query(
      `INSERT INTO user_email_addresses (id, user_id, email, is_primary, is_verified, created_at, updated_at)
       VALUES ($1,$2,$3,1,1,$4,$5)`,
      [`eml-${crypto.randomUUID()}`, id, email, createdAt, createdAt]
    );

    let licenseCode = null;
    if (planId) {
      const plan = await getEffectivePlanById(planId);
      if (!plan) {
        return res.status(400).json({ error: "Plan inconnu." });
      }
      await applyPlanToUser(id, plan, billingCycle, null, null, "admin_created");
      if (plan.seats) {
        licenseCode = await generateLicenseCodeForPlan(id, plan);
      }
    }

    return res.status(201).json({ user: await getPublicUserById(id), licenseCode });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ error: error.message || "Erreur serveur." });
  }
});

app.post("/api/admin/users/update", async (req, res) => {
  try {
    const adminUserId = coerceString(req.body?.adminUserId);
    await requireAdmin(adminUserId);

    const targetUserId = coerceString(req.body?.userId);
    const target = await getUserRowById(targetUserId);
    if (!target) {
      return res.status(404).json({ error: "Utilisateur introuvable." });
    }
    const firstName = coerceString(req.body?.firstName) || target.first_name;
    const lastName = coerceString(req.body?.lastName) || target.last_name;

    if (target.role_type === "admin") {
      const adminModules = sanitizeAdminModules(req.body?.adminModules);
      await db.query(
        "UPDATE users SET first_name = $1, last_name = $2, admin_modules_json = $3, updated_at = $4 WHERE id = $5",
        [firstName, lastName, JSON.stringify(adminModules), nowIso(), targetUserId]
      );
      await logSecurityEvent(req, adminUserId, "admin_user_updated", { targetUserId });
      return res.json({ user: await getPublicUserById(targetUserId) });
    }

    const organizationName = coerceString(req.body?.organizationName);
    const website = coerceString(req.body?.website);
    const planId = coerceString(req.body?.planId);
    const billingCycle = coerceString(req.body?.billingCycle);

    await db.query("UPDATE users SET first_name = $1, last_name = $2, updated_at = $3 WHERE id = $4", [
      firstName,
      lastName,
      nowIso(),
      targetUserId
    ]);

    if (organizationName && (target.role_type === "school" || target.role_type === "recruiter_firm")) {
      const table = target.role_type === "school" ? "user_org_profiles" : "user_recruiter_profiles";
      await db.query(`UPDATE ${table} SET organization_name = $1, website = $2, updated_at = $3 WHERE user_id = $4`, [
        organizationName,
        website,
        nowIso(),
        targetUserId
      ]);
    }

    if (planId) {
      const plan = await getEffectivePlanById(planId);
      if (!plan) {
        return res.status(400).json({ error: "Plan inconnu." });
      }
      await applyPlanToUser(targetUserId, plan, billingCycle, null, null, "admin_created");
    }

    await logSecurityEvent(req, adminUserId, "admin_user_updated", { targetUserId });
    return res.json({ user: await getPublicUserById(targetUserId) });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ error: error.message || "Erreur serveur." });
  }
});

app.post("/api/admin/users/status", async (req, res) => {
  try {
    const adminUserId = coerceString(req.body?.adminUserId);
    await requireAdmin(adminUserId);

    const targetUserId = coerceString(req.body?.userId);
    const status = coerceString(req.body?.status) === "suspended" ? "suspended" : "active";
    const target = await getUserRowById(targetUserId);
    if (!target) {
      return res.status(404).json({ error: "Utilisateur introuvable." });
    }
    if (target.role_type === "admin") {
      return res.status(403).json({ error: "Le statut d'un administrateur ne peut pas être changé ici." });
    }

    await db.query("UPDATE users SET status = $1, updated_at = $2 WHERE id = $3", [status, nowIso(), targetUserId]);
    if (status === "suspended") {
      await db.query("DELETE FROM sessions WHERE user_id = $1", [targetUserId]);
    }
    await logSecurityEvent(req, adminUserId, status === "suspended" ? "admin_user_suspended" : "admin_user_reactivated", {
      targetUserId,
      email: target.email
    });
    return res.json({ ok: true });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ error: error.message || "Erreur serveur." });
  }
});

app.post("/api/admin/users/delete", async (req, res) => {
  try {
    const adminUserId = coerceString(req.body?.adminUserId);
    await requireAdmin(adminUserId);

    const targetUserId = coerceString(req.body?.userId);
    const confirmation = coerceString(req.body?.confirmation);

    const target = await getUserRowById(targetUserId);
    if (!target) {
      return res.status(404).json({ error: "Utilisateur introuvable." });
    }
    if (target.role_type === "admin") {
      return res.status(403).json({ error: "Impossible de supprimer un compte administrateur." });
    }
    if (confirmation !== target.email) {
      return res.status(400).json({ error: "Confirmation invalide : saisis exactement l'email du compte à supprimer." });
    }

    await logSecurityEvent(req, adminUserId, "admin_user_deleted", { targetUserId, email: target.email });
    await db.query("DELETE FROM sessions WHERE user_id = $1", [targetUserId]);
    await db.query("DELETE FROM email_verification_codes WHERE user_id = $1", [targetUserId]);
    await db.query("DELETE FROM user_email_addresses WHERE user_id = $1", [targetUserId]);
    await db.query("DELETE FROM cvs WHERE user_id = $1", [targetUserId]);
    await db.query("DELETE FROM match_runs WHERE user_id = $1", [targetUserId]);
    await db.query("DELETE FROM match_feedback WHERE user_id = $1", [targetUserId]);
    await db.query("DELETE FROM negotiation_conversations WHERE user_id = $1", [targetUserId]);
    await db.query("DELETE FROM cover_letters WHERE user_id = $1", [targetUserId]);
    await db.query("DELETE FROM user_candidate_profiles WHERE user_id = $1", [targetUserId]);
    await db.query("DELETE FROM user_recruiter_profiles WHERE user_id = $1", [targetUserId]);
    await db.query("DELETE FROM user_org_profiles WHERE user_id = $1", [targetUserId]);
    await db.query("DELETE FROM user_accounts WHERE user_id = $1", [targetUserId]);
    await db.query("DELETE FROM license_codes WHERE owner_user_id = $1", [targetUserId]);
    await db.query("DELETE FROM users WHERE id = $1", [targetUserId]);

    return res.json({ ok: true });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ error: error.message || "Erreur serveur." });
  }
});
}
