// Routes cv — extrait automatiquement de backend/index.js (voir
// ARCHITECTURE.md). Toutes les dépendances (db, helpers, constantes) sont
// lues depuis app.locals.ctx, rempli une fois dans index.js après
// l'initialisation complète (DB ouverte, helpers définis).
export function registerCvRoutes(app) {
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

app.post("/api/cv/extract", async (req, res) => {
  try {
    const fileName = coerceString(req.body?.fileName || "cv.txt");
    const mimeType = coerceString(req.body?.mimeType);
    const sourceText = await extractTextFromUpload({
      fileName,
      mimeType,
      base64: req.body?.base64
    });

    if (sourceText.length < 20) {
      return res.status(422).json({
        error: "Impossible d'extraire assez de texte depuis ce fichier. Essaie un PDF texte ou un DOCX plus lisible."
      });
    }

    let parsed = null;
    let extractionProvider = "local";
    try {
      parsed = await extractCvWithAi(sourceText);
      if (parsed) extractionProvider = AI_PROVIDER === "grok" ? "xai" : AI_PROVIDER;
    } catch (aiError) {
      parsed = null;
      console.warn(`Extraction IA indisponible: ${aiError.message}`);
    }

    const finalParsed = postProcessCvExtraction(sourceText, parsed);

    return res.json({
      fileName,
      sourceText,
      characterCount: sourceText.length,
      parsed: finalParsed,
      extractionProvider
    });
  } catch (error) {
    return res.status(400).json({ error: error.message || "Extraction du CV impossible." });
  }
});

app.post("/api/jobs/extract", async (req, res) => {
  try {
    const text = cleanExtractedText(req.body?.text);
    if (text.length < 50) {
      return res.status(422).json({ error: "Colle une description de poste plus complète avant de lancer l'extraction." });
    }

    let parsed = null;
    let extractionProvider = "local";
    try {
      parsed = await extractJobWithAi(text);
      if (parsed) extractionProvider = AI_PROVIDER === "grok" ? "xai" : AI_PROVIDER;
    } catch (aiError) {
      parsed = null;
      console.warn(`Extraction IA du poste indisponible: ${aiError.message}`);
    }

    return res.json({
      parsed: parsed || extractLocalJobSummary(text),
      extractionProvider
    });
  } catch (error) {
    return res.status(400).json({ error: error.message || "Extraction du poste impossible." });
  }
});

app.post("/api/cv/optimize-ats", async (req, res) => {
  try {
    const candidate = req.body?.candidate && typeof req.body.candidate === "object" ? req.body.candidate : {};
    const offer = req.body?.offer && typeof req.body.offer === "object" ? req.body.offer : {};
    const language = req.body?.language === "en" ? "en" : "fr";

    if (!Array.isArray(candidate.experiences) && !candidate.summary) {
      return res.status(422).json({
        error:
          language === "en"
            ? "Import a CV with at least a summary or an experience before optimizing it."
            : "Importe un CV avec au moins un résumé ou une expérience avant de l'optimiser."
      });
    }

    let result = null;
    try {
      result = await generateCvAtsOptimizationWithAi(candidate, offer, language);
    } catch (aiError) {
      console.warn(`Optimisation ATS indisponible: ${aiError.message}`);
    }

    if (!result) {
      return res.status(503).json({
        error:
          language === "en"
            ? "AI optimization is temporarily unavailable. Try again shortly."
            : "L'optimisation IA est temporairement indisponible. Réessaie dans un instant."
      });
    }

    return res.json({ optimization: result });
  } catch (error) {
    return res.status(400).json({ error: error.message || "Optimisation ATS impossible." });
  }
});

app.post("/api/cv", async (req, res) => {
  try {
    const userId = coerceString(req.body?.userId);
    if (!requireMatchingSession(req, res, userId)) return;
    const cvRecord = req.body?.cvRecord;

    if (!userId || !cvRecord) {
      return res.status(400).json({ error: "userId et cvRecord requis." });
    }

    const user = await getUserRowById(userId);
    if (!user) {
      return res.status(404).json({ error: "Utilisateur introuvable." });
    }

    const id = `cv-${crypto.randomUUID()}`;
    const createdAt = nowIso();
    const fileName = coerceString(cvRecord.fileName || "cv.txt") || "cv.txt";
    const sourceText = stripNullBytes(cvRecord.sourceText || "");
    const parsedJson = JSON.stringify(cvRecord.parsed || {});

    await db.query(
      `INSERT INTO cvs (id, user_id, created_at, file_name, source_text, parsed_json)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        id,
        userId,
        createdAt,
        fileName,
        sourceText,
        parsedJson
      ]
    );

    return res.status(201).json({
      cv: {
        id,
        userId,
        createdAt,
        fileName,
        sourceText,
        parsed: cvRecord.parsed || {}
      }
    });
  } catch (error) {
    return res.status(500).json({ error: error.message || "Erreur serveur." });
  }
});

app.get("/api/cv", async (req, res) => {
  try {
    const userId = coerceString(req.query.userId);
    if (!requireMatchingSession(req, res, userId)) return;
    if (!userId) {
      return res.status(400).json({ error: "userId requis." });
    }

    const { rows } = await db.query(
      "SELECT id, user_id, created_at, file_name, source_text, parsed_json FROM cvs WHERE user_id = $1 ORDER BY created_at DESC",
      [userId]
    );

    const items = rows.map((row) => ({
      id: row.id,
      userId: row.user_id,
      createdAt: row.created_at,
      fileName: row.file_name,
      sourceText: row.source_text,
      parsed: parseJsonField(row.parsed_json, {})
    }));

    return res.json({ items });
  } catch (error) {
    return res.status(500).json({ error: error.message || "Erreur serveur." });
  }
});
}
