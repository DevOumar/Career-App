// Sous-groupe de routes extrait de backend/routes/admin.js
// (voir ARCHITECTURE.md). Dépendances lues depuis app.locals.ctx.
export function registerAdminOverviewRoutes(app) {
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
    resolveAccountSegments,
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
    if (!requireMatchingSession(req, res, adminUserId)) return;
    await requireAdminModule(adminUserId, "dashboard");

    const { rows: roleCounts } = await db.query(
      "SELECT role_type, COUNT(*)::int AS count FROM users GROUP BY role_type"
    );
    const { rows: cvCountRows } = await db.query("SELECT COUNT(*)::int AS count FROM cvs WHERE deleted_at IS NULL");
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
      return { start, end, count: 0, paidCount: 0 };
    });
    for (const row of userRows) {
      const createdAt = new Date(row.created_at).getTime();
      if (Number.isNaN(createdAt)) continue;
      const bucket = buckets.find((item) => createdAt >= item.start && createdAt < item.end);
      if (!bucket) continue;
      bucket.count += 1;
      // Inscrits de la semaine dont le plan actif est payant (série "or" du graphique).
      const subscription = parseJsonField(row.subscription_json, {});
      if (getPlanById(subscription.planId)?.grantsPremium) bucket.paidCount += 1;
    }
    const signupsTrend = buckets.map((bucket) => ({
      weekStart: new Date(bucket.start).toISOString(),
      count: bucket.count,
      paidCount: bucket.paidCount
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

    // Répartition des comptes candidat/étudiant : solo (aucun code de
    // licence) vs rattaché école vs rattaché cabinet — la vue "usersByRole"
    // ci-dessus donne déjà le nombre d'écoles/cabinets en tant que comptes,
    // mais pas combien de LEURS étudiants/candidats ça représente au total.
    const { rows: candidateRows } = await db.query(
      "SELECT id, subscription_json FROM users WHERE role_type IN ('candidate', 'student')"
    );
    const candidateSegments = await resolveAccountSegments(candidateRows);
    const candidateSegmentCounts = { solo: 0, school: 0, agency: 0 };
    for (const segment of Object.values(candidateSegments)) {
      candidateSegmentCounts[segment] = (candidateSegmentCounts[segment] || 0) + 1;
    }

    return res.json({
      candidateSegmentCounts,
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
    if (!requireMatchingSession(req, res, adminUserId)) return;
    await requireAdminModule(adminUserId, "dashboard");

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const [signupRes, paymentRes, fullCodesRes, failedAnnouncementsRes] = await Promise.all([
      db.query(
        "SELECT id, first_name, last_name, role_type, created_at FROM users WHERE created_at >= $1 ORDER BY created_at DESC LIMIT 100",
        [sevenDaysAgo]
      ),
      db.query(
        `SELECT t.id, t.amount_collected, t.currency, t.plan_id, t.created_at, u.first_name, u.last_name
         FROM transactions t
         LEFT JOIN users u ON u.id = t.user_id
         WHERE t.source = 'stripe' AND t.amount_collected > 0 AND t.created_at >= $1
         ORDER BY t.created_at DESC LIMIT 100`,
        [sevenDaysAgo]
      ),
      db.query(
        `SELECT code, owner_user_id, plan_id, seats_total, seats_used, u.first_name, u.last_name
         FROM license_codes
         LEFT JOIN users u ON u.id = license_codes.owner_user_id
         WHERE COALESCE(revoked,0) = 0 AND seats_total > 0 AND seats_used >= seats_total
         ORDER BY license_codes.created_at DESC LIMIT 100`
      ),
      db.query(
        "SELECT id, subject, audience, failed_count, created_at FROM announcements WHERE failed_count > 0 ORDER BY created_at DESC LIMIT 100"
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
// Indicateurs investisseurs (rétention, revenu récurrent, économie unitaire
// de l'IA, placement). Tout est calculé à partir des données réellement
// enregistrées ; les comptes administrateurs sont exclus.
//  - Utilisateur actif : au moins une trace sur la période (connexion ou autre
//    événement de compte, activité de session, CV, analyse, candidature,
//    lettre, entretien, négociation, avis, action cabinet).
//  - Revenu récurrent mensuel (MRR) : dernière transaction payée non
//    remboursée de chaque compte, tant que sa période court (30 j mensuel,
//    365 j annuel) ; un paiement annuel compte pour 1/12 par mois.
//  - Coût IA : mesuré (tokens réels renvoyés par le fournisseur × tarif
//    public du modèle, converti au taux BCE), sur les 30 derniers jours.
app.get("/api/admin/investor-metrics", async (req, res) => {
  try {
    const adminUserId = coerceString(req.query?.adminUserId);
    if (!requireMatchingSession(req, res, adminUserId)) return;
    await requireAdminModule(adminUserId, "dashboard");

    const DAY_MS = 24 * 60 * 60 * 1000;
    const now = Date.now();
    const iso = (ms) => new Date(ms).toISOString();
    const since = (days) => iso(now - days * DAY_MS);

    const { rows: userRows } = await db.query("SELECT id, role_type, created_at FROM users WHERE role_type <> 'admin'");
    const userById = new Map(userRows.map((row) => [row.id, row]));

    // Toutes les traces d'activité des 13 derniers mois, par utilisateur.
    const ACTIVITY_SQL = `
      SELECT user_id, created_at AS ts FROM account_security_events WHERE event_type NOT LIKE 'admin\\_%'
      UNION ALL SELECT user_id, last_seen_at FROM sessions
      UNION ALL SELECT user_id, created_at FROM sessions
      UNION ALL SELECT user_id, created_at FROM cvs
      UNION ALL SELECT user_id, created_at FROM match_runs
      UNION ALL SELECT user_id, updated_at FROM job_applications
      UNION ALL SELECT user_id, updated_at FROM cover_letters
      UNION ALL SELECT user_id, updated_at FROM negotiation_conversations
      UNION ALL SELECT user_id, updated_at FROM interview_conversations
      UNION ALL SELECT user_id, created_at FROM satisfaction_surveys
      UNION ALL SELECT created_by, updated_at FROM cabinet_candidates WHERE created_by IS NOT NULL`;
    const { rows: activityRows } = await db.query(
      `SELECT user_id, ts FROM (${ACTIVITY_SQL}) a WHERE ts IS NOT NULL AND ts <> '' AND ts >= $1`,
      [since(400)]
    );
    const lastActivity = new Map();
    const activeMonths = new Map();
    const monthKey = (date) => `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
    for (const row of activityRows) {
      if (!userById.has(row.user_id)) continue;
      const date = new Date(row.ts);
      const time = date.getTime();
      if (Number.isNaN(time) || time > now + DAY_MS) continue;
      if (!lastActivity.has(row.user_id) || lastActivity.get(row.user_id) < time) lastActivity.set(row.user_id, time);
      if (!activeMonths.has(row.user_id)) activeMonths.set(row.user_id, new Set());
      activeMonths.get(row.user_id).add(monthKey(date));
    }
    const activeWithin = (days) => [...lastActivity.values()].filter((time) => time >= now - days * DAY_MS).length;
    const dau = activeWithin(1);
    const wau = activeWithin(7);
    const mau = activeWithin(30);

    // Rétention à 30 jours : comptes de plus de 30 jours encore actifs ce mois-ci.
    const matureUsers = userRows.filter((row) => new Date(row.created_at).getTime() < now - 30 * DAY_MS);
    const matureActive = matureUsers.filter((row) => (lastActivity.get(row.id) || 0) >= now - 30 * DAY_MS).length;

    // Cohortes : 6 derniers mois d'inscription, part encore active 1, 2 et 3
    // mois après le mois d'inscription (le mois d'inscription lui-même
    // n'est pas une mesure de rétention).
    const cohorts = [];
    const currentMonth = new Date(Date.UTC(new Date(now).getUTCFullYear(), new Date(now).getUTCMonth(), 1));
    for (let back = 5; back >= 0; back -= 1) {
      const start = new Date(Date.UTC(currentMonth.getUTCFullYear(), currentMonth.getUTCMonth() - back, 1));
      const key = monthKey(start);
      const members = userRows.filter((row) => {
        const created = new Date(row.created_at);
        return !Number.isNaN(created.getTime()) && monthKey(created) === key;
      });
      const retention = [];
      for (let offset = 1; offset <= 3; offset += 1) {
        const target = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + offset, 1));
        if (target > currentMonth) {
          retention.push(null);
          continue;
        }
        const targetKey = monthKey(target);
        const active = members.filter((row) => activeMonths.get(row.id)?.has(targetKey)).length;
        retention.push(members.length ? Math.round((active / members.length) * 100) : null);
      }
      cohorts.push({ month: key, size: members.length, retention });
    }

    // ------------------------------------------------ revenu récurrent
    const { rows: txRows } = await db.query(
      `SELECT user_id, plan_id, billing_cycle, amount_collected, created_at
       FROM transactions
       WHERE COALESCE(refunded, 0) = 0 AND amount_collected > 0
       ORDER BY created_at DESC`
    );
    const periodDays = (cycle) => (cycle === "annual" || cycle === "yearly" ? 365 : 30);
    const monthlyValue = (row) => Number(row.amount_collected || 0) / (periodDays(row.billing_cycle) === 365 ? 12 : 1);
    const segmentOf = (userId) => {
      const role = userById.get(userId)?.role_type || "";
      if (role === "school") return "school";
      if (role === "recruiter_firm" || role === "recruiter_internal") return "agency";
      return "candidate";
    };
    // MRR à une date donnée : dernière transaction de chaque compte dont la
    // période couvre cette date.
    function mrrAt(atMs) {
      const seen = new Set();
      const bySegment = { candidate: 0, school: 0, agency: 0 };
      let total = 0;
      let customers = 0;
      for (const row of txRows) {
        const start = new Date(row.created_at).getTime();
        if (Number.isNaN(start) || start > atMs || seen.has(row.user_id)) continue;
        seen.add(row.user_id);
        if (start + periodDays(row.billing_cycle) * DAY_MS < atMs) continue;
        const value = monthlyValue(row);
        total += value;
        customers += 1;
        bySegment[segmentOf(row.user_id)] += value;
      }
      return { total, customers, bySegment };
    }
    const round2 = (value) => Math.round(value * 100) / 100;
    const current = mrrAt(now);
    const mrrTrend = [];
    for (let back = 5; back >= 0; back -= 1) {
      const end = back === 0 ? now : Date.UTC(currentMonth.getUTCFullYear(), currentMonth.getUTCMonth() - back + 1, 1) - 1;
      mrrTrend.push({ weekStart: iso(Date.UTC(currentMonth.getUTCFullYear(), currentMonth.getUTCMonth() - back, 1)), mrr: round2(mrrAt(end).total) });
    }
    const previousMrr = mrrTrend.length > 1 ? mrrTrend[mrrTrend.length - 2].mrr : 0;

    // Revenu encaissé sur 30 jours (tous paiements non remboursés).
    const revenueLast30 = txRows
      .filter((row) => new Date(row.created_at).getTime() >= now - 30 * DAY_MS)
      .reduce((sum, row) => sum + Number(row.amount_collected || 0), 0);

    // ------------------------------------------------ coût IA réel (30 jours)
    // Tokens et durée audio renvoyés par le fournisseur à chaque appel
    // (table ai_usage), × tarif public du modèle, convertis au taux BCE.
    const from30 = since(30);
    const { rows: usageRows } = await db.query(
      `SELECT COUNT(*)::int AS calls, COALESCE(SUM(cost_usd), 0) AS cost_usd, MIN(created_at) AS first_call,
              COUNT(DISTINCT user_id)::int AS users
       FROM ai_usage WHERE created_at >= $1`,
      [from30]
    );
    const { rows: firstUsageRows } = await db.query("SELECT MIN(created_at) AS first FROM ai_usage");
    const fx = await app.locals.ctx.getFxRates();
    const usdPerEur = Number(fx?.rates?.USD) || null;
    const aiCalls = usageRows[0]?.calls || 0;
    const aiCostLast30 = usdPerEur ? Number(usageRows[0]?.cost_usd || 0) / usdPerEur : null;
    const measuredSince = firstUsageRows[0]?.first || null;

    // ------------------------------------------------ placement (cabinets)
    const { rows: placementRows } = await db.query(
      `SELECT
         (SELECT COUNT(*)::int FROM cabinet_candidates) AS candidates,
         (SELECT COUNT(*)::int FROM cabinet_candidates WHERE status = 'placed') AS placed,
         (SELECT COUNT(*)::int FROM cabinet_mission_candidates) AS assignments,
         (SELECT COUNT(*)::int FROM cabinet_mission_candidates WHERE stage = 'placed') AS assignments_placed,
         (SELECT COUNT(*)::int FROM cabinet_missions) AS missions,
         (SELECT COUNT(*)::int FROM cabinet_missions WHERE status = 'closed') AS missions_closed,
         (SELECT COALESCE(SUM(placement_amount), 0) FROM cabinet_missions) AS fees`
    );
    const placement = placementRows[0] || {};
    const { rows: applicationRows } = await db.query(
      "SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE status = 'offer')::int AS offers, COUNT(*) FILTER (WHERE status IN ('interview', 'offer'))::int AS interviews FROM job_applications"
    );
    const applications = applicationRows[0] || {};

    const share = (part, total) => (total ? Math.round((part / total) * 1000) / 10 : null);

    return res.json({
      generatedAt: iso(now),
      usage: {
        totalUsers: userRows.length,
        dau,
        wau,
        mau,
        stickiness: share(dau, mau),
        retention30: share(matureActive, matureUsers.length),
        matureUsers: matureUsers.length,
        matureActive,
        cohorts
      },
      revenue: {
        mrr: round2(current.total),
        arr: round2(current.total * 12),
        payingCustomers: current.customers,
        arpa: current.customers ? round2(current.total / current.customers) : null,
        mrrBySegment: Object.fromEntries(Object.entries(current.bySegment).map(([key, value]) => [key, round2(value)])),
        mrrGrowth: previousMrr > 0 ? share(current.total - previousMrr, previousMrr) : null,
        mrrTrend,
        revenueLast30: round2(revenueLast30)
      },
      unitEconomics: {
        aiCalls30: aiCalls,
        aiCost30: aiCostLast30 === null ? null : Math.round(aiCostLast30 * 10000) / 10000,
        measuredSince,
        fxDate: fx?.date || null,
        aiCostPerActiveUser: mau && aiCostLast30 !== null ? Math.round((aiCostLast30 / mau) * 10000) / 10000 : null,
        revenuePerActiveUser: mau ? round2(revenueLast30 / mau) : null,
        aiCostShareOfRevenue: revenueLast30 > 0 && aiCostLast30 !== null ? share(aiCostLast30, revenueLast30) : null
      },
      placement: {
        candidates: placement.candidates || 0,
        placed: placement.placed || 0,
        placementRate: share(placement.placed || 0, placement.candidates || 0),
        assignments: placement.assignments || 0,
        assignmentsPlaced: placement.assignments_placed || 0,
        missions: placement.missions || 0,
        missionsClosed: placement.missions_closed || 0,
        fees: Number(placement.fees || 0),
        applications: applications.total || 0,
        applicationInterviews: applications.interviews || 0,
        applicationOffers: applications.offers || 0
      }
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ error: error.message || "Erreur serveur." });
  }
});
}
