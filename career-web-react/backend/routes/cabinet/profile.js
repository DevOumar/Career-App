// Sous-groupe de routes extrait de backend/routes/cabinet.js
// (voir ARCHITECTURE.md). Dépendances lues depuis app.locals.ctx.
export function registerCabinetProfileRoutes(app) {
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
    requireCabinetOwnerRole,
    getCabinetLicenseCodeRows,
    getCabinetRecruiterRows,
    buildCabinetMetrics,
    buildCabinetAlerts,
    resolveAccountSegments
  } = app.locals.ctx;

app.get("/api/cabinet/profile", async (req, res) => {
  try {
    const userId = coerceString(req.query?.userId);
    if (!requireMatchingSession(req, res, userId)) return;
    const cabinet = await requireCabinetOwner(userId);
    // Un compte recruiter_firm/recruiter_internal stocke son profil dans
    // user_recruiter_profiles (rempli dès l'inscription/la création par un
    // admin via upsertRecruiterProfile), PAS dans user_org_profiles qui est
    // réservée aux comptes school — lire la mauvaise table faisait
    // disparaître le nom de cabinet saisi à l'inscription. On lit toujours
    // le profil du TITULAIRE (cabinetRootId) : un recruteur invité voit la
    // fiche du cabinet, pas une fiche vide propre à son compte.
    const { rows } = await db.query("SELECT * FROM user_recruiter_profiles WHERE user_id = $1", [cabinet.cabinetRootId]);
    const row = rows[0] || {};
    return res.json({
      admin: {
        id: cabinet.id,
        firstName: cabinet.first_name,
        lastName: cabinet.last_name,
        email: cabinet.email,
        avatarDataUrl: cabinet.avatar_data_url || ""
      },
      profile: {
        organizationName: row.organization_name || "",
        website: row.website || "",
        address: row.address || "",
        city: row.city || "",
        country: row.country || "",
        contactEmail: row.contact_email || "",
        contactPhone: row.contact_phone || "",
        primaryContactName: row.primary_contact_name || "",
        logoDataUrl: row.logo_data_url || "",
        description: row.description || "",
        publicPageEnabled: Boolean(Number(row.public_page_enabled)),
        publicSlug: row.public_slug || ""
      }
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ error: error.message || "Erreur serveur." });
  }
});

app.put("/api/cabinet/profile", async (req, res) => {
  try {
    const userId = coerceString(req.body?.userId);
    if (!requireMatchingSession(req, res, userId)) return;
    const cabinet = await requireCabinetOwner(userId);
    requireCabinetOwnerRole(cabinet);
    const rootId = cabinet.cabinetRootId;
    const profile = req.body?.profile || {};

    // Slug de la page publique : dérivé du nom de cabinet, garanti unique en
    // suffixant l'id si besoin (pas de collision possible entre cabinets).
    let publicSlug = "";
    if (profile.publicPageEnabled) {
      const base = coerceString(profile.organizationName)
        .toLowerCase()
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 60) || "cabinet";
      const { rows: existingSlugRows } = await db.query(
        "SELECT user_id FROM user_recruiter_profiles WHERE public_slug = $1 AND user_id != $2",
        [base, rootId]
      );
      publicSlug = existingSlugRows.length ? `${base}-${rootId.slice(-6)}` : base;
    }

    await db.query(
      `INSERT INTO user_recruiter_profiles (user_id, organization_name, website, address, city, country, contact_email, contact_phone, primary_contact_name, logo_data_url, description, public_page_enabled, public_slug, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
       ON CONFLICT (user_id) DO UPDATE SET
         organization_name=EXCLUDED.organization_name,
         website=EXCLUDED.website,
         address=EXCLUDED.address,
         city=EXCLUDED.city,
         country=EXCLUDED.country,
         contact_email=EXCLUDED.contact_email,
         contact_phone=EXCLUDED.contact_phone,
         primary_contact_name=EXCLUDED.primary_contact_name,
         logo_data_url=EXCLUDED.logo_data_url,
         description=EXCLUDED.description,
         public_page_enabled=EXCLUDED.public_page_enabled,
         public_slug=EXCLUDED.public_slug,
         updated_at=EXCLUDED.updated_at`,
      [
        rootId,
        coerceString(profile.organizationName),
        coerceString(profile.website),
        coerceString(profile.address),
        coerceString(profile.city),
        coerceString(profile.country),
        normalizeEmail(profile.contactEmail || ""),
        coerceString(profile.contactPhone),
        coerceString(profile.primaryContactName),
        normalizeAvatarDataUrl(profile.logoDataUrl || ""),
        coerceString(profile.description).slice(0, 2000),
        profile.publicPageEnabled ? 1 : 0,
        publicSlug,
        nowIso()
      ]
    );
    await logSecurityEvent(req, userId, "cabinet_profile_updated", {});
    return res.json({ ok: true, publicSlug });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ error: error.message || "Erreur serveur." });
  }
});

// Page publique du cabinet (visiteur non connecté) — vitrine minimale
// affichant le cabinet et ses missions ouvertes, uniquement si le cabinet a
// explicitement activé public_page_enabled (opt-in, pas de fuite par
// défaut).
app.get("/api/public/cabinet/:slug", async (req, res) => {
  try {
    const slug = coerceString(req.params.slug);
    const { rows } = await db.query(
      "SELECT * FROM user_recruiter_profiles WHERE public_slug = $1 AND public_page_enabled = 1",
      [slug]
    );
    if (!rows.length) return res.status(404).json({ error: "Page introuvable." });
    const row = rows[0];

    const { rows: missionRows } = await db.query(
      "SELECT id, title, location, created_at FROM cabinet_missions WHERE cabinet_user_id = $1 AND status = 'open' ORDER BY created_at DESC LIMIT 30",
      [row.user_id]
    );

    return res.json({
      organizationName: row.organization_name || "",
      website: row.website || "",
      city: row.city || "",
      country: row.country || "",
      description: row.description || "",
      logoDataUrl: row.logo_data_url || "",
      openMissions: missionRows.map((mission) => ({
        id: mission.id,
        title: mission.title,
        location: mission.location,
        createdAt: mission.created_at
      }))
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ error: error.message || "Erreur serveur." });
  }
});
}

