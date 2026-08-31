// Routes applications — extrait automatiquement de backend/index.js (voir
// ARCHITECTURE.md). Toutes les dépendances (db, helpers, constantes) sont
// lues depuis app.locals.ctx, rempli une fois dans index.js après
// l'initialisation complète (DB ouverte, helpers définis).
export function registerApplicationsRoutes(app) {
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
    toPublicJobApplication
  } = app.locals.ctx;

app.get("/api/applications", async (req, res) => {
  try {
    const userId = coerceString(req.query.userId);
    if (!requireMatchingSession(req, res, userId)) return;
    if (!userId) {
      return res.status(400).json({ error: "userId requis." });
    }
    const { rows } = await db.query(
      `SELECT id, user_id, status, title, company, location, offer_url, offer_text, match_score, cv_id, notes,
              applied_at, next_action_at, created_at, updated_at
       FROM job_applications WHERE user_id = $1 ORDER BY updated_at DESC`,
      [userId]
    );
    return res.json({ items: rows.map(toPublicJobApplication) });
  } catch (error) {
    return res.status(500).json({ error: error.message || "Erreur serveur." });
  }
});

app.post("/api/applications", async (req, res) => {
  try {
    const userId = coerceString(req.body?.userId);
    if (!requireMatchingSession(req, res, userId)) return;
    if (!userId) {
      return res.status(400).json({ error: "userId requis." });
    }
    const title = coerceString(req.body?.title);
    const company = coerceString(req.body?.company);
    if (!title && !company) {
      return res.status(422).json({ error: "Indique au moins un poste ou une entreprise." });
    }
    const user = await getUserRowById(userId);
    if (!user) {
      return res.status(404).json({ error: "Utilisateur introuvable." });
    }

    const status = JOB_APPLICATION_STATUSES.has(coerceString(req.body?.status)) ? coerceString(req.body.status) : "to_apply";
    const id = `app-${crypto.randomUUID()}`;
    const now = nowIso();
    const matchScoreInput = req.body?.matchScore;
    const matchScore = matchScoreInput === null || matchScoreInput === undefined || matchScoreInput === "" ? null : Number(matchScoreInput);

    await db.query(
      `INSERT INTO job_applications
         (id, user_id, status, title, company, location, offer_url, offer_text, match_score, cv_id, notes, applied_at, next_action_at, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
      [
        id,
        userId,
        status,
        title,
        company,
        coerceString(req.body?.location),
        coerceString(req.body?.offerUrl),
        stripNullBytes(coerceString(req.body?.offerText)),
        Number.isFinite(matchScore) ? matchScore : null,
        coerceString(req.body?.cvId),
        coerceString(req.body?.notes),
        coerceString(req.body?.appliedAt),
        coerceString(req.body?.nextActionAt),
        now,
        now
      ]
    );

    const { rows } = await db.query(
      `SELECT id, user_id, status, title, company, location, offer_url, offer_text, match_score, cv_id, notes,
              applied_at, next_action_at, created_at, updated_at
       FROM job_applications WHERE id = $1`,
      [id]
    );
    return res.json({ item: toPublicJobApplication(rows[0]) });
  } catch (error) {
    return res.status(400).json({ error: error.message || "Création de la candidature impossible." });
  }
});

app.put("/api/applications/:id", async (req, res) => {
  try {
    const userId = coerceString(req.body?.userId);
    if (!requireMatchingSession(req, res, userId)) return;
    const id = coerceString(req.params.id);
    if (!userId || !id) {
      return res.status(400).json({ error: "userId et id requis." });
    }
    const { rows: existingRows } = await db.query("SELECT * FROM job_applications WHERE id = $1 AND user_id = $2", [id, userId]);
    const existing = existingRows[0];
    if (!existing) {
      return res.status(404).json({ error: "Candidature introuvable." });
    }

    const patch = req.body || {};
    const status = patch.status !== undefined ? (JOB_APPLICATION_STATUSES.has(coerceString(patch.status)) ? coerceString(patch.status) : existing.status) : existing.status;
    const matchScoreProvided = Object.prototype.hasOwnProperty.call(patch, "matchScore");
    const nextMatchScore = matchScoreProvided
      ? (patch.matchScore === null || patch.matchScore === "" ? null : Number(patch.matchScore))
      : existing.match_score;

    const next = {
      status,
      title: patch.title !== undefined ? coerceString(patch.title) : existing.title,
      company: patch.company !== undefined ? coerceString(patch.company) : existing.company,
      location: patch.location !== undefined ? coerceString(patch.location) : existing.location,
      offerUrl: patch.offerUrl !== undefined ? coerceString(patch.offerUrl) : existing.offer_url,
      offerText: patch.offerText !== undefined ? stripNullBytes(coerceString(patch.offerText)) : existing.offer_text,
      matchScore: Number.isFinite(nextMatchScore) ? nextMatchScore : null,
      cvId: patch.cvId !== undefined ? coerceString(patch.cvId) : existing.cv_id,
      notes: patch.notes !== undefined ? coerceString(patch.notes) : existing.notes,
      appliedAt: patch.appliedAt !== undefined ? coerceString(patch.appliedAt) : existing.applied_at,
      nextActionAt: patch.nextActionAt !== undefined ? coerceString(patch.nextActionAt) : existing.next_action_at
    };

    await db.query(
      `UPDATE job_applications SET
         status=$1, title=$2, company=$3, location=$4, offer_url=$5, offer_text=$6, match_score=$7, cv_id=$8,
         notes=$9, applied_at=$10, next_action_at=$11, updated_at=$12
       WHERE id=$13 AND user_id=$14`,
      [
        next.status,
        next.title,
        next.company,
        next.location,
        next.offerUrl,
        next.offerText,
        next.matchScore,
        next.cvId,
        next.notes,
        next.appliedAt,
        next.nextActionAt,
        nowIso(),
        id,
        userId
      ]
    );

    const { rows } = await db.query(
      `SELECT id, user_id, status, title, company, location, offer_url, offer_text, match_score, cv_id, notes,
              applied_at, next_action_at, created_at, updated_at
       FROM job_applications WHERE id = $1`,
      [id]
    );
    return res.json({ item: toPublicJobApplication(rows[0]) });
  } catch (error) {
    return res.status(400).json({ error: error.message || "Mise à jour de la candidature impossible." });
  }
});

app.delete("/api/applications/:id", async (req, res) => {
  try {
    const userId = coerceString(req.query.userId);
    if (!requireMatchingSession(req, res, userId)) return;
    const id = coerceString(req.params.id);
    if (!userId || !id) {
      return res.status(400).json({ error: "userId et id requis." });
    }
    await db.query("DELETE FROM job_applications WHERE id = $1 AND user_id = $2", [id, userId]);
    return res.json({ ok: true });
  } catch (error) {
    return res.status(400).json({ error: error.message || "Suppression impossible." });
  }
});

// Notifications candidat : même principe que /api/admin/notifications (voir
// routes/admin/overview.js) — calculées à la volée depuis de vraies tables,
// jamais stockées ni "marquées comme lues" (pas de complexité read/unread
// pour l'instant, cohérent avec la version admin).
const MEANINGFUL_SECURITY_EVENT_TYPES = new Set([
  "password_changed",
  "password_reset_completed",
  "login_locked",
  "connected_account_linked",
  "connected_account_removed"
]);

app.get("/api/notifications", async (req, res) => {
  try {
    const userId = coerceString(req.query?.userId);
    if (!requireMatchingSession(req, res, userId)) return;

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const [securityRes, paymentRes, staleApplicationsRes, userRow, announcementRes] = await Promise.all([
      db.query(
        // Filtre les types "significatifs" directement en SQL (pas en JS
        // après coup) : sinon un compte actif dont le login (login_google,
        // login_email_code...) génère beaucoup de lignes peut évincer les
        // vrais événements utiles hors des 10 lignes ramenées par LIMIT.
        `SELECT id, event_type, metadata_json, created_at FROM account_security_events
         WHERE user_id = $1 AND created_at >= $2 AND event_type = ANY($3)
         ORDER BY created_at DESC LIMIT 10`,
        [userId, sevenDaysAgo, [...MEANINGFUL_SECURITY_EVENT_TYPES]]
      ),
      db.query(
        `SELECT id, amount_collected, currency, plan_id, created_at FROM transactions
         WHERE user_id = $1 AND source = 'stripe' AND amount_collected > 0 AND created_at >= $2
         ORDER BY created_at DESC LIMIT 10`,
        [userId, sevenDaysAgo]
      ),
      db.query(
        `SELECT id, title, company, created_at FROM job_applications
         WHERE user_id = $1 AND status = 'to_apply' AND created_at < $2
         ORDER BY created_at ASC LIMIT 5`,
        [userId, sevenDaysAgo]
      ),
      getUserRowById(userId),
      db.query(
        `SELECT sa.id, sa.subject, sa.message, sa.created_at, u.first_name AS school_name
         FROM school_announcement_recipients sar
         JOIN school_announcements sa ON sa.id = sar.announcement_id
         JOIN users u ON u.id = sa.school_user_id
         WHERE sar.student_user_id = $1 AND sa.created_at >= $2
         ORDER BY sa.created_at DESC LIMIT 10`,
        [userId, sevenDaysAgo]
      )
    ]);

    const items = [];

    for (const row of securityRes.rows) {
      if (!MEANINGFUL_SECURITY_EVENT_TYPES.has(row.event_type)) continue;
      items.push({
        id: `security-${row.id}`,
        type: row.event_type,
        createdAt: row.created_at,
        data: parseJsonField(row.metadata_json, {})
      });
    }

    for (const row of paymentRes.rows) {
      items.push({
        id: `payment-${row.id}`,
        type: "payment_confirmed",
        createdAt: row.created_at,
        data: { amount: Number(row.amount_collected), currency: row.currency, planId: row.plan_id }
      });
    }

    for (const row of announcementRes.rows) {
      items.push({
        id: `announcement-${row.id}`,
        type: "school_announcement",
        createdAt: row.created_at,
        data: { subject: row.subject, message: row.message, schoolName: row.school_name }
      });
    }

    for (const row of staleApplicationsRes.rows) {
      items.push({
        id: `application-stale-${row.id}`,
        type: "application_stale",
        createdAt: row.created_at,
        data: { title: row.title, company: row.company }
      });
    }

    if (userRow) {
      const subscription = parseJsonField(userRow.subscription_json, {});
      const credits = Number(subscription.credits) || 0;
      if (credits < 999) {
        if (credits <= 0) {
          items.push({ id: "balance-empty", type: "balance_empty", createdAt: null, data: {} });
        } else if (credits <= 5) {
          items.push({ id: "balance-low", type: "balance_low", createdAt: null, data: { credits } });
        }
      }

      const profile = parseJsonField(userRow.profile_json, {});
      if (!profile.targetRole || !profile.sector) {
        items.push({ id: "profile-incomplete", type: "profile_incomplete", createdAt: null, data: {} });
      }
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
