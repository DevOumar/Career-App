// Sous-groupe de routes extrait de backend/routes/admin.js
// (voir ARCHITECTURE.md). Dépendances lues depuis app.locals.ctx.
export function registerAdminCabinetsRoutes(app) {
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
    toPublicJobApplication,
    buildCabinetMetrics,
    buildCabinetAlerts
  } = app.locals.ctx;

// Vue plateforme des cabinets — miroir de /api/admin/schools : l'Admin ne
// pouvait piloter les cabinets qu'un par un via Comptes/Licences.
// Fiche publique d'une organisation (logo, sigle, coordonnées…) pour la vue
// admin. Les colonnes ajoutées par migration peuvent manquer sur une vieille
// base : chaque champ retombe sur une chaîne vide.
function organizationProfileFields(row = {}, owner = {}) {
  return {
    logoDataUrl: row.logo_data_url || "",
    acronym: row.acronym || "",
    organizationType: row.organization_type || "",
    industry: row.industry || "",
    website: row.website || "",
    address: row.address || "",
    city: row.city || "",
    country: row.country || "",
    emailDomain: row.email_domain || "",
    contactEmail: row.contact_email || "",
    contactPhone: row.contact_phone || "",
    primaryContactName: row.primary_contact_name || "",
    description: row.description || "",
    ownerName: `${owner.first_name || ""} ${owner.last_name || ""}`.trim()
  };
}

app.get("/api/admin/cabinets", async (req, res) => {
  try {
    const adminUserId = coerceString(req.query?.adminUserId);
    if (!requireMatchingSession(req, res, adminUserId)) return;
    await requireAdminModule(adminUserId, "cabinets");

    const { rows: cabinetRows } = await db.query(
      "SELECT id, first_name, last_name, email, created_at FROM users WHERE role_type = 'recruiter_firm' ORDER BY created_at DESC"
    );
    const { rows: profileRows } = cabinetRows.length
      ? await db.query("SELECT * FROM user_recruiter_profiles WHERE user_id = ANY($1)", [
          cabinetRows.map((row) => row.id)
        ])
      : { rows: [] };
    const orgNameByUser = Object.fromEntries(profileRows.map((row) => [row.user_id, row.organization_name]));
    const orgProfileByUser = Object.fromEntries(profileRows.map((row) => [row.user_id, row]));
    // Candidats du vivier de chaque cabinet (profils importés/saisis par ses recruteurs).
    const { rows: poolRows } = cabinetRows.length
      ? await db.query(
          `SELECT id, cabinet_user_id, first_name, last_name, email, headline, status, created_at
           FROM cabinet_candidates WHERE cabinet_user_id = ANY($1) ORDER BY created_at DESC`,
          [cabinetRows.map((row) => row.id)]
        )
      : { rows: [] };
    const poolByCabinet = {};
    for (const row of poolRows) {
      (poolByCabinet[row.cabinet_user_id] = poolByCabinet[row.cabinet_user_id] || []).push({
        id: row.id,
        firstName: row.first_name || "",
        lastName: row.last_name || "",
        email: row.email || "",
        headline: row.headline || "",
        status: row.status || "sourced",
        createdAt: row.created_at
      });
    }

    const items = [];
    let totalSeats = 0;
    let totalSeatsUsed = 0;
    let totalCandidates = 0;
    let totalMissions = 0;

    for (const cabinet of cabinetRows) {
      const metrics = await buildCabinetMetrics(cabinet.id);
      const alerts = buildCabinetAlerts(metrics, coerceString(req.query?.language || "fr"));
      totalSeats += metrics.seatsTotal;
      totalSeatsUsed += metrics.seatsUsed;
      totalCandidates += metrics.candidateCount;
      totalMissions += metrics.missionCount;
      items.push({
        id: cabinet.id,
        name: orgNameByUser[cabinet.id] || `${cabinet.first_name} ${cabinet.last_name}`.trim(),
        email: cabinet.email,
        createdAt: cabinet.created_at,
        seatsTotal: metrics.seatsTotal,
        seatsUsed: metrics.seatsUsed,
        recruiterCount: metrics.recruiters.length,
        candidateCount: metrics.candidateCount,
        missionCount: metrics.missionCount,
        openMissionCount: metrics.openMissionCount,
        alertCount: alerts.length,
        alerts: alerts.map((alert) => ({ type: alert.type, title: alert.title, body: alert.body })),
        recruiters: (metrics.recruiters || []).map((recruiter) => ({
          id: recruiter.id,
          name: `${recruiter.first_name || recruiter.firstName || ""} ${recruiter.last_name || recruiter.lastName || ""}`.trim(),
          email: recruiter.email || "",
          avatarDataUrl: recruiter.avatar_data_url || recruiter.avatarDataUrl || ""
        })),
        candidates: poolByCabinet[cabinet.id] || [],
        ...organizationProfileFields(orgProfileByUser[cabinet.id], cabinet)
      });
    }

    // Cabinets les plus proches de la saturation de sièges en premier —
    // même logique actionnable que pour les écoles.
    items.sort((a, b) => {
      const remainingA = a.seatsTotal ? (a.seatsTotal - a.seatsUsed) / a.seatsTotal : 1;
      const remainingB = b.seatsTotal ? (b.seatsTotal - b.seatsUsed) / b.seatsTotal : 1;
      return remainingA - remainingB;
    });

    return res.json({
      items,
      totalCabinets: cabinetRows.length,
      totalSeats,
      totalSeatsUsed,
      totalCandidates,
      totalMissions
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ error: error.message || "Erreur serveur." });
  }
});

// Vue modération : toutes les annonces envoyées par tous les cabinets.
app.get("/api/admin/cabinet-announcements", async (req, res) => {
  try {
    const adminUserId = coerceString(req.query?.adminUserId);
    if (!requireMatchingSession(req, res, adminUserId)) return;
    await requireAdminModule(adminUserId, "cabinets");

    const { rows } = await db.query(
      `SELECT ca.id, ca.subject, ca.message, ca.recipient_count, ca.failed_count, ca.created_at, u.first_name AS cabinet_name, u.email AS cabinet_email
       FROM cabinet_announcements ca
       JOIN users u ON u.id = ca.cabinet_user_id
       ORDER BY ca.created_at DESC LIMIT 100`
    );
    return res.json({
      items: rows.map((row) => ({
        id: row.id,
        subject: row.subject,
        message: row.message,
        recipientCount: row.recipient_count,
        failedCount: row.failed_count,
        createdAt: row.created_at,
        cabinetName: row.cabinet_name,
        cabinetEmail: row.cabinet_email
      }))
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ error: error.message || "Erreur serveur." });
  }
});
}

