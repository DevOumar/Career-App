// Sous-groupe de routes extrait de backend/routes/admin.js
// (voir ARCHITECTURE.md). Dépendances lues depuis app.locals.ctx.
export function registerAdminAnnouncementsRoutes(app) {
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
}
