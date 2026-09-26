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
    aiActionRateLimiter,
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
    computeContentHash,
    CV_TRASH_RETENTION_DAYS,
    hardDeleteCvs,
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

app.post("/api/cv/extract", aiActionRateLimiter, async (req, res) => {
  try {
    if (!req.sessionUserId) {
      return res.status(401).json({ error: "Authentification requise." });
    }
    const fileName = coerceString(req.body?.fileName || "cv.txt");
    const mimeType = coerceString(req.body?.mimeType);
    const sourceText = await extractTextFromUpload({
      fileName,
      mimeType,
      base64: req.body?.base64
    });

    if (sourceText.length < 20) {
      // PDF sans texte lisible : presque toujours un CV scanné ou exporté en
      // image. On l'explique clairement plutôt qu'un message générique.
      const isPdf = /\.pdf$/i.test(fileName) || /pdf/i.test(mimeType);
      return res.status(422).json({
        code: isPdf ? "CV_IMAGE_PDF" : "CV_UNREADABLE",
        error: isPdf
          ? "Ce CV semble être une image (PDF scanné ou exporté en image) : son texte ne peut pas être lu. Exportez-le en PDF depuis Word, Canva ou Google Docs (texte sélectionnable), ou importez le fichier DOCX."
          : "Impossible d'extraire assez de texte depuis ce fichier. Importez un PDF texte ou un DOCX."
      });
    }

    let parsed = null;
    let extractionProvider = "local";
    // Jusqu'à 3 essais espacés : une limite de débit passagère du
    // fournisseur IA (plusieurs imports rapprochés) ne doit pas faire
    // retomber sur l'analyse locale, bien moins précise.
    for (let attempt = 0; attempt < 3 && !parsed; attempt += 1) {
      if (attempt) await new Promise((resolve) => setTimeout(resolve, attempt * 1500));
      try {
        parsed = await extractCvWithAi(sourceText);
        if (parsed) extractionProvider = AI_PROVIDER === "grok" ? "xai" : AI_PROVIDER;
      } catch (aiError) {
        parsed = null;
        console.warn(`Extraction IA indisponible (essai ${attempt + 1}/3): ${aiError.message}`);
      }
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

app.post("/api/jobs/extract", aiActionRateLimiter, async (req, res) => {
  try {
    if (!req.sessionUserId) {
      return res.status(401).json({ error: "Authentification requise." });
    }
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

app.post("/api/cv/optimize-ats", aiActionRateLimiter, async (req, res) => {
  try {
    if (!req.sessionUserId) {
      return res.status(401).json({ error: "Authentification requise." });
    }
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

    const fileName = (coerceString(cvRecord.fileName || "cv.txt") || "cv.txt").slice(0, 255);
    const sourceText = stripNullBytes(cvRecord.sourceText || "");
    if (sourceText.trim().length < 20) {
      return res.status(422).json({ error: "Le contenu du CV est vide ou illisible." });
    }
    if (sourceText.length > 200_000) {
      return res.status(413).json({ error: "Le CV est trop volumineux." });
    }
    const parsedJson = JSON.stringify(cvRecord.parsed || {});
    const contentHash = computeContentHash(sourceText);

    // Idempotence par contenu : le même CV (même texte, quel que soit le nom
    // du fichier) déjà importé par cet utilisateur est mis à jour — pas de
    // doublon dans l'historique ni dans les statistiques.
    const { rows: sameRows } = await db.query(
      "SELECT id, created_at, deleted_at FROM cvs WHERE user_id = $1 AND content_hash = $2 ORDER BY created_at DESC LIMIT 1",
      [userId, contentHash]
    );
    if (sameRows[0]) {
      // Un CV réimporté alors qu'il est dans la corbeille en ressort.
      await db.query("UPDATE cvs SET file_name = $1, parsed_json = $2, deleted_at = NULL WHERE id = $3", [
        fileName,
        parsedJson,
        sameRows[0].id
      ]);
      return res.status(200).json({
        duplicate: true,
        restored: Boolean(sameRows[0].deleted_at),
        cv: {
          id: sameRows[0].id,
          userId,
          createdAt: sameRows[0].created_at,
          fileName,
          sourceText,
          parsed: cvRecord.parsed || {}
        }
      });
    }

    const id = `cv-${crypto.randomUUID()}`;
    const createdAt = nowIso();
    await db.query(
      `INSERT INTO cvs (id, user_id, created_at, file_name, source_text, parsed_json, content_hash)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [id, userId, createdAt, fileName, sourceText, parsedJson, contentHash]
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
      "SELECT id, user_id, created_at, file_name, source_text, parsed_json FROM cvs WHERE user_id = $1 AND deleted_at IS NULL ORDER BY created_at DESC",
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

// ---------------------------------------------------------------------------
// Corbeille des CV
// ---------------------------------------------------------------------------
// Supprimer un CV le place d'abord en corbeille (restaurable pendant
// CV_TRASH_RETENTION_DAYS jours) ; la suppression définitive est explicite
// (ou automatique à l'échéance). Toutes les opérations ne portent que sur les
// CV de l'utilisateur connecté et sont idempotentes : rejouer la même
// demande ne change rien de plus.
function readCvIds(body) {
  const raw = Array.isArray(body?.ids) ? body.ids : [];
  return [...new Set(raw.map((value) => coerceString(value).trim()).filter(Boolean))].slice(0, 500);
}

function cvPurgeAt(deletedAt) {
  return new Date(new Date(deletedAt).getTime() + CV_TRASH_RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString();
}

app.get("/api/cv/trash", async (req, res) => {
  try {
    const userId = coerceString(req.query.userId);
    if (!requireMatchingSession(req, res, userId)) return;
    const { rows } = await db.query(
      "SELECT id, created_at, deleted_at, file_name, parsed_json FROM cvs WHERE user_id = $1 AND deleted_at IS NOT NULL ORDER BY deleted_at DESC",
      [userId]
    );
    return res.json({
      retentionDays: CV_TRASH_RETENTION_DAYS,
      items: rows.map((row) => ({
        id: row.id,
        createdAt: row.created_at,
        deletedAt: row.deleted_at,
        purgeAt: cvPurgeAt(row.deleted_at),
        fileName: row.file_name,
        parsed: parseJsonField(row.parsed_json, {})
      }))
    });
  } catch (error) {
    return res.status(500).json({ error: error.message || "Erreur serveur." });
  }
});

app.post("/api/cv/trash", async (req, res) => {
  try {
    const userId = coerceString(req.body?.userId);
    if (!requireMatchingSession(req, res, userId)) return;
    const ids = readCvIds(req.body);
    if (!ids.length) return res.status(400).json({ error: "Sélectionnez au moins un CV." });
    const result = await db.query(
      "UPDATE cvs SET deleted_at = $1 WHERE user_id = $2 AND id = ANY($3) AND deleted_at IS NULL",
      [nowIso(), userId, ids]
    );
    const moved = Number(result?.rowCount ?? result?.affectedRows ?? 0);
    await logSecurityEvent(req, userId, "cv_trashed", { count: moved });
    return res.json({ moved, retentionDays: CV_TRASH_RETENTION_DAYS });
  } catch (error) {
    return res.status(500).json({ error: error.message || "Erreur serveur." });
  }
});

app.post("/api/cv/restore", async (req, res) => {
  try {
    const userId = coerceString(req.body?.userId);
    if (!requireMatchingSession(req, res, userId)) return;
    const ids = readCvIds(req.body);
    if (!ids.length) return res.status(400).json({ error: "Sélectionnez au moins un CV." });
    const result = await db.query(
      "UPDATE cvs SET deleted_at = NULL WHERE user_id = $1 AND id = ANY($2) AND deleted_at IS NOT NULL",
      [userId, ids]
    );
    const restored = Number(result?.rowCount ?? result?.affectedRows ?? 0);
    await logSecurityEvent(req, userId, "cv_restored", { count: restored });
    return res.json({ restored });
  } catch (error) {
    return res.status(500).json({ error: error.message || "Erreur serveur." });
  }
});

// Suppression définitive : uniquement des CV déjà en corbeille (ids fournis,
// ou toute la corbeille avec all=true).
app.post("/api/cv/purge", async (req, res) => {
  try {
    const userId = coerceString(req.body?.userId);
    if (!requireMatchingSession(req, res, userId)) return;
    let ids = readCvIds(req.body);
    if (req.body?.all === true) {
      const { rows } = await db.query("SELECT id FROM cvs WHERE user_id = $1 AND deleted_at IS NOT NULL", [userId]);
      ids = rows.map((row) => row.id);
    }
    if (!ids.length) return res.json({ deleted: 0 });
    const deleted = await hardDeleteCvs(userId, ids);
    await logSecurityEvent(req, userId, "cv_purged", { count: deleted });
    return res.json({ deleted });
  } catch (error) {
    return res.status(500).json({ error: error.message || "Erreur serveur." });
  }
});
}
