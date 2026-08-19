// Sous-groupe de routes extrait de backend/routes/school.js
// (voir ARCHITECTURE.md). Dépendances lues depuis app.locals.ctx.
export function registerSchoolInvitationsRoutes(app) {
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

app.get("/api/school/invitations", async (req, res) => {
  try {
    const userId = coerceString(req.query?.userId);
    await requireSchoolOwner(userId);

    const { rows } = await db.query(
      "SELECT * FROM school_invitations WHERE school_user_id = $1 ORDER BY created_at DESC LIMIT 300",
      [userId]
    );

    return res.json({
      items: rows.map((row) => ({
        id: row.id,
        email: row.email,
        licenseCode: row.license_code,
        status: row.status,
        createdAt: row.created_at,
        redeemedAt: row.redeemed_at
      }))
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ error: error.message || "Erreur serveur." });
  }
});

app.post("/api/school/invitations/send", async (req, res) => {
  try {
    const userId = coerceString(req.body?.userId);
    const school = await requireSchoolOwner(userId);

    const email = normalizeEmail(req.body?.email);
    if (!email.includes("@")) {
      return res.status(400).json({ error: "Email invalide." });
    }

    const codeRows = await getSchoolLicenseCodeRows(userId);
    const activeCode = codeRows.find((row) => !Number(row.revoked) && Number(row.seats_used) < Number(row.seats_total));
    if (!activeCode) {
      return res.status(400).json({ error: "Aucun siège disponible sur votre licence." });
    }

    const existingUser = await getUserRowByAnyEmail(email);
    if (existingUser) {
      return res.status(409).json({ error: "Un compte existe déjà avec cet email." });
    }

    const { rows: orgProfileRows } = await db.query(
      "SELECT organization_name FROM user_org_profiles WHERE user_id = $1",
      [userId]
    );
    const organizationName = orgProfileRows[0]?.organization_name || school.first_name;

    const id = `inv-${crypto.randomUUID()}`;
    await db.query(
      `INSERT INTO school_invitations (id, school_user_id, email, license_code, status, created_at, redeemed_at)
       VALUES ($1,$2,$3,$4,'pending',$5,NULL)`,
      [id, userId, email, activeCode.code, nowIso()]
    );

    const transporter = getMailTransporter();
    if (transporter) {
      const html = `
        <div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;">
          <h2 style="color:#2f5bff;margin:0 0 18px;">Career App</h2>
          <p style="margin:0 0 14px;color:#1f2634;">Bonjour,</p>
          <p style="margin:0 0 14px;line-height:1.6;color:#1f2634;">
            ${organizationName} vous invite à rejoindre Career App pour optimiser votre CV et préparer vos candidatures.
          </p>
          <p style="margin:0 0 14px;color:#1f2634;">Votre code de licence : <strong>${activeCode.code}</strong></p>
          <p style="margin:0 0 14px;color:#1f2634;">Créez votre compte puis renseignez ce code depuis la page Tarifs pour activer votre accès gratuitement.</p>
          <p style="margin:24px 0 0;color:#5b6478;font-size:0.85rem;">— L'équipe Career App</p>
        </div>`;
      const text = `Bonjour,\n\n${organizationName} vous invite à rejoindre Career App.\nVotre code de licence : ${activeCode.code}\nCréez votre compte puis renseignez ce code depuis la page Tarifs.\n\n— L'équipe Career App`;
      const recipient = AUTH_EMAIL_TO || email;
      try {
        await transporter.sendMail({ from: MAIL_FROM, to: recipient, subject: "Invitation Career App", html, text });
      } catch (_error) {
        // Invitation is still recorded even if the email delivery fails.
      }
    }

    await logSecurityEvent(req, userId, "school_invitation_sent", { email, licenseCode: activeCode.code });

    return res.status(201).json({ ok: true, licenseCode: activeCode.code });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ error: error.message || "Erreur serveur." });
  }
});
}
