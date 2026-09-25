// Sous-groupe de routes extrait de backend/routes/admin.js
// (voir ARCHITECTURE.md). Dépendances lues depuis app.locals.ctx.
export function registerAdminSchoolsRoutes(app) {
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

// Vue plateforme des établissements — inexistante jusqu'ici : l'Admin ne
// pouvait piloter les écoles qu'une par une via Comptes/Licences. Agrège les
// mêmes calculs que buildSchoolMetrics (déjà utilisés côté École pour son
// propre dashboard), une fois par établissement.
// Étudiants rattachés à une école (via ses codes de licence), avec leur
// activité : nombre de CV, d'analyses, dernier score et statut d'alerte.
function buildStudentList(metrics) {
  const cvCount = {};
  for (const row of metrics.cvRows || []) cvCount[row.user_id] = (cvCount[row.user_id] || 0) + 1;
  const matchCount = {};
  const latestScore = {};
  const latestAt = {};
  for (const row of metrics.matchRows || []) {
    matchCount[row.user_id] = (matchCount[row.user_id] || 0) + 1;
    const score = parseJsonField(row.payload_json, {})?.matchInsights?.score;
    if (typeof score === "number" && (!latestAt[row.user_id] || row.created_at > latestAt[row.user_id])) {
      latestAt[row.user_id] = row.created_at;
      latestScore[row.user_id] = score;
    }
  }
  const inactiveIds = new Set((metrics.inactiveStudents || []).map((row) => row.id));
  return (metrics.students || []).map((student) => {
    const subscription = parseJsonField(student.subscription_json, {});
    return {
      id: student.id,
      firstName: student.first_name || "",
      lastName: student.last_name || "",
      email: student.email || "",
      avatarDataUrl: student.avatar_data_url || "",
      joinedAt: subscription.startedAt || student.created_at,
      cvCount: cvCount[student.id] || 0,
      matchCount: matchCount[student.id] || 0,
      latestScore: typeof latestScore[student.id] === "number" ? latestScore[student.id] : null,
      inactive: inactiveIds.has(student.id)
    };
  });
}

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

app.get("/api/admin/schools", async (req, res) => {
  try {
    const adminUserId = coerceString(req.query?.adminUserId);
    if (!requireMatchingSession(req, res, adminUserId)) return;
    await requireAdminModule(adminUserId, "schools");

    const { rows: schoolRows } = await db.query(
      "SELECT id, first_name, last_name, email, created_at FROM users WHERE role_type = 'school' ORDER BY created_at DESC"
    );
    const { rows: orgProfileRows } = schoolRows.length
      ? await db.query("SELECT * FROM user_org_profiles WHERE user_id = ANY($1)", [
          schoolRows.map((row) => row.id)
        ])
      : { rows: [] };
    const orgNameByUser = Object.fromEntries(orgProfileRows.map((row) => [row.user_id, row.organization_name]));
    const orgProfileByUser = Object.fromEntries(orgProfileRows.map((row) => [row.user_id, row]));

    const items = [];
    let totalSeats = 0;
    let totalSeatsUsed = 0;
    let totalStudents = 0;

    for (const school of schoolRows) {
      const metrics = await buildSchoolMetrics(school.id);
      const alerts = buildSchoolAlerts(metrics, coerceString(req.query?.language || "fr"));
      totalSeats += metrics.seatsTotal;
      totalSeatsUsed += metrics.seatsUsed;
      totalStudents += metrics.students.length;
      items.push({
        id: school.id,
        name: orgNameByUser[school.id] || `${school.first_name} ${school.last_name}`.trim(),
        email: school.email,
        createdAt: school.created_at,
        seatsTotal: metrics.seatsTotal,
        seatsUsed: metrics.seatsUsed,
        studentCount: metrics.students.length,
        activationRate: metrics.activationRate,
        avgScore: metrics.avgScore,
        alertCount: alerts.length,
        alerts: alerts.map((alert) => ({ type: alert.type, title: alert.title, body: alert.body })),
        students: buildStudentList(metrics),
        ...organizationProfileFields(orgProfileByUser[school.id], school)
      });
    }

    // Écoles les plus proches de la saturation en premier — c'est
    // l'information la plus actionnable pour l'Admin (relancer une école
    // pour qu'elle augmente son tarif/sièges avant qu'elle bloque ses
    // propres étudiants).
    items.sort((a, b) => {
      const remainingA = a.seatsTotal ? (a.seatsTotal - a.seatsUsed) / a.seatsTotal : 1;
      const remainingB = b.seatsTotal ? (b.seatsTotal - b.seatsUsed) / b.seatsTotal : 1;
      return remainingA - remainingB;
    });

    return res.json({
      items,
      totalSchools: schoolRows.length,
      totalSeats,
      totalSeatsUsed,
      totalStudents
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ error: error.message || "Erreur serveur." });
  }
});

// Vue modération : toutes les annonces envoyées par toutes les écoles, tous
// établissements confondus — permet à l'Admin de repérer un usage abusif
// (spam, contenu inapproprié) sans avoir à se connecter établissement par
// établissement.
app.get("/api/admin/school-announcements", async (req, res) => {
  try {
    const adminUserId = coerceString(req.query?.adminUserId);
    if (!requireMatchingSession(req, res, adminUserId)) return;
    await requireAdminModule(adminUserId, "schools");

    const { rows } = await db.query(
      `SELECT sa.id, sa.subject, sa.message, sa.recipient_count, sa.failed_count, sa.created_at, u.first_name AS school_name, u.email AS school_email
       FROM school_announcements sa
       JOIN users u ON u.id = sa.school_user_id
       ORDER BY sa.created_at DESC LIMIT 100`
    );
    return res.json({
      items: rows.map((row) => ({
        id: row.id,
        subject: row.subject,
        message: row.message,
        recipientCount: row.recipient_count,
        failedCount: row.failed_count,
        createdAt: row.created_at,
        schoolName: row.school_name,
        schoolEmail: row.school_email
      }))
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ error: error.message || "Erreur serveur." });
  }
});
}
