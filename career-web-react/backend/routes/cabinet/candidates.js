// Sous-groupe de routes extrait de backend/routes/cabinet.js
// (voir ARCHITECTURE.md). Dépendances lues depuis app.locals.ctx.
export function registerCabinetCandidatesRoutes(app) {
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
    computeContentHash,
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
    resolveAccountSegments,
    aiActionRateLimiter,
    logCabinetActivity
  } = app.locals.ctx;

const CABINET_CANDIDATE_STATUSES = new Set(["sourced", "contacted", "interviewing", "placed", "rejected"]);
// RGPD : consentement du candidat au traitement de ses données par le cabinet.
const CABINET_CONSENT_STATUSES = new Set(["pending", "granted", "refused"]);
const CABINET_CONSENT_SOURCES = new Set(["", "email", "phone", "form", "meeting", "job_board", "other"]);

function normalizeCabinetContact(value) {
  return coerceString(value).trim().toLowerCase();
}

app.get("/api/cabinet/candidates", async (req, res) => {
  try {
    const userId = coerceString(req.query?.userId);
    if (!requireMatchingSession(req, res, userId)) return;
    const cabinet = await requireCabinetOwner(userId);

    const search = coerceString(req.query?.search).toLowerCase();
    const statusFilter = coerceString(req.query?.status);
    const skillFilter = coerceString(req.query?.skill).toLowerCase();
    const missionFilter = coerceString(req.query?.missionId);
    const followUpOnly = coerceString(req.query?.followUp) === "1";
    const { rows } = await db.query(
      "SELECT * FROM cabinet_candidates WHERE cabinet_user_id = $1 ORDER BY created_at DESC LIMIT 500",
      [cabinet.cabinetRootId]
    );

    let assignedCandidateIds = null;
    if (missionFilter) {
      const { rows: assignRows } = await db.query(
        "SELECT candidate_id FROM cabinet_mission_candidates WHERE mission_id = $1",
        [missionFilter]
      );
      assignedCandidateIds = new Set(assignRows.map((row) => row.candidate_id));
    }

    const now = nowIso();
    const items = rows
      .map((row) => ({
        id: row.id,
        firstName: row.first_name,
        lastName: row.last_name,
        email: row.email,
        phone: row.phone,
        headline: row.headline,
        skills: parseJsonField(row.skills_json, []),
        notes: row.notes,
        status: row.status,
        cvFileName: row.cv_file_name || "",
        hasCv: Boolean(row.source_text),
        followUpDate: row.follow_up_date || null,
        followUpDue: Boolean(row.follow_up_date && row.follow_up_date <= now),
        consentStatus: row.consent_status || "pending",
        consentAt: row.consent_at || null,
        consentSource: row.consent_source || "",
        anonymizedAt: row.anonymized_at || null,
        statusUpdatedAt: row.status_updated_at || null,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }))
      .filter((item) => {
        if (statusFilter && item.status !== statusFilter) return false;
        if (skillFilter && !item.skills.some((skill) => skill.toLowerCase().includes(skillFilter))) return false;
        if (assignedCandidateIds && !assignedCandidateIds.has(item.id)) return false;
        if (followUpOnly && !item.followUpDue) return false;
        if (!search) return true;
        const haystack = `${item.firstName} ${item.lastName} ${item.email} ${item.headline} ${item.skills.join(" ")}`.toLowerCase();
        return haystack.includes(search);
      });

    const statusCounts = {};
    for (const item of items) statusCounts[item.status] = (statusCounts[item.status] || 0) + 1;

    const skillSet = new Set();
    for (const row of rows) {
      for (const skill of parseJsonField(row.skills_json, [])) {
        if (skill) skillSet.add(skill);
      }
    }

    return res.json({ items, statusCounts, availableSkills: [...skillSet].sort((a, b) => a.localeCompare(b)) });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ error: error.message || "Erreur serveur." });
  }
});

// Export CSV du vivier — même principe que GET /api/school/students/export :
// respecte les mêmes filtres que la liste (search/status/skill) pour que
// l'export corresponde exactement à ce que le recruteur a sous les yeux.
app.get("/api/cabinet/candidates/export", async (req, res) => {
  try {
    const userId = coerceString(req.query?.userId);
    if (!requireMatchingSession(req, res, userId)) return;
    const cabinet = await requireCabinetOwner(userId);

    const search = coerceString(req.query?.search).toLowerCase();
    const statusFilter = coerceString(req.query?.status);
    const { rows } = await db.query(
      "SELECT * FROM cabinet_candidates WHERE cabinet_user_id = $1 ORDER BY created_at DESC LIMIT 5000",
      [cabinet.cabinetRootId]
    );
    const filtered = rows.filter((row) => {
      if (statusFilter && row.status !== statusFilter) return false;
      if (!search) return true;
      const skills = parseJsonField(row.skills_json, []).join(" ");
      const haystack = `${row.first_name} ${row.last_name} ${row.email} ${row.headline} ${skills}`.toLowerCase();
      return haystack.includes(search);
    });

    return sendCsv(
      res,
      "vivier-candidats.csv",
      ["Prénom", "Nom", "Email", "Téléphone", "Poste ciblé", "Compétences", "Statut", "Ajouté le"],
      filtered.map((row) => [
        row.first_name,
        row.last_name,
        row.email,
        row.phone,
        row.headline,
        parseJsonField(row.skills_json, []).join("; "),
        row.status,
        row.created_at
      ])
    );
  } catch (error) {
    return res.status(error.statusCode || 500).json({ error: error.message || "Erreur serveur." });
  }
});

// Extraction IA d'un CV pour préremplir la fiche vivier — même pipeline que
// POST /api/cv/extract côté candidat (extractTextFromUpload +
// extractCvWithAi + postProcessCvExtraction), mais rien n'est enregistré
// dans la table `cvs` (réservée aux comptes Career CV) : le texte source et
// le JSON extrait ne sont persistés que si/quand la fiche candidat vivier
// est effectivement créée (voir POST /api/cabinet/candidates).
app.post("/api/cabinet/candidates/extract", aiActionRateLimiter, async (req, res) => {
  try {
    const userId = coerceString(req.body?.userId);
    if (!requireMatchingSession(req, res, userId)) return;
    await requireCabinetOwner(userId);

    const fileName = coerceString(req.body?.fileName || "cv.txt");
    const mimeType = coerceString(req.body?.mimeType);
    const sourceText = await extractTextFromUpload({ fileName, mimeType, base64: req.body?.base64 });

    if (sourceText.length < 20) {
      return res.status(422).json({
        error: "Impossible d'extraire assez de texte depuis ce fichier. Essaie un PDF texte ou un DOCX plus lisible."
      });
    }

    let parsed = null;
    try {
      parsed = await extractCvWithAi(sourceText);
    } catch (aiError) {
      parsed = null;
      console.warn(`Extraction IA (vivier cabinet) indisponible: ${aiError.message}`);
    }
    const finalParsed = postProcessCvExtraction(sourceText, parsed);

    return res.json({
      fileName,
      sourceText,
      parsed: finalParsed
    });
  } catch (error) {
    return res.status(400).json({ error: error.message || "Extraction du CV impossible." });
  }
});

app.post("/api/cabinet/candidates", async (req, res) => {
  try {
    const userId = coerceString(req.body?.userId);
    if (!requireMatchingSession(req, res, userId)) return;
    const cabinet = await requireCabinetOwner(userId);

    const firstName = coerceString(req.body?.firstName).trim();
    const lastName = coerceString(req.body?.lastName).trim();
    if (!firstName && !lastName) {
      return res.status(400).json({ error: "Le nom du candidat est requis." });
    }
    const skills = Array.isArray(req.body?.skills) ? req.body.skills.map((value) => coerceString(value).trim()).filter(Boolean) : [];
    const email = coerceString(req.body?.email).trim();
    const phone = coerceString(req.body?.phone).trim();

    // Détection de doublon (email ou téléphone déjà présents dans le
    // vivier) : bloquant sauf si le front confirme explicitement vouloir
    // ajouter quand même (force=true), pour éviter les vivier gonflés par
    // des imports CV répétés.
    const cvHash = computeContentHash(coerceString(req.body?.sourceText));
    if (!coerceString(req.body?.force) && (email || phone || cvHash)) {
      const { rows: existingRows } = await db.query(
        "SELECT id, first_name, last_name, email, phone, cv_hash FROM cabinet_candidates WHERE cabinet_user_id = $1 AND anonymized_at IS NULL",
        [cabinet.cabinetRootId]
      );
      let sameCv = false;
      const duplicate = existingRows.find((row) => {
        const sameEmail = email && normalizeCabinetContact(row.email) === normalizeCabinetContact(email);
        const samePhone = phone && normalizeCabinetContact(row.phone) === normalizeCabinetContact(phone);
        sameCv = Boolean(cvHash && row.cv_hash === cvHash);
        return sameEmail || samePhone || sameCv;
      });
      if (duplicate) {
        return res.status(409).json({
          error: sameCv
            ? "Ce CV a déjà été importé dans le vivier."
            : "Un candidat avec cet email ou ce téléphone existe déjà dans le vivier.",
          duplicateReason: sameCv ? "cv" : "contact",
          duplicate: { id: duplicate.id, firstName: duplicate.first_name, lastName: duplicate.last_name }
        });
      }
    }

    const id = `ccand-${crypto.randomUUID()}`;
    const now = nowIso();
    const followUpDate = coerceString(req.body?.followUpDate).trim() || null;
    // cvFileName/sourceText/parsedJson : renseignés quand le candidat est
    // créé à partir d'un CV importé (voir POST .../extract) — optionnels,
    // vides pour une fiche saisie manuellement.
    await db.query(
      `INSERT INTO cabinet_candidates
        (id, cabinet_user_id, first_name, last_name, email, phone, headline, skills_json, notes, status, created_by, cv_file_name, source_text, parsed_json, follow_up_date, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$16)`,
      [
        id,
        cabinet.cabinetRootId,
        firstName,
        lastName,
        email,
        phone,
        coerceString(req.body?.headline).trim(),
        JSON.stringify(skills),
        coerceString(req.body?.notes).trim(),
        "sourced",
        userId,
        coerceString(req.body?.cvFileName).trim(),
        coerceString(req.body?.sourceText),
        req.body?.parsedJson ? JSON.stringify(req.body.parsedJson) : "{}",
        followUpDate,
        now
      ]
    );
    await db.query(
      "UPDATE cabinet_candidates SET status_updated_at = created_at, placed_at = CASE WHEN status = 'placed' THEN created_at ELSE NULL END, cv_hash = $2 WHERE id = $1",
      [id, cvHash]
    );
    const consentStatus = CABINET_CONSENT_STATUSES.has(coerceString(req.body?.consentStatus)) ? coerceString(req.body?.consentStatus) : "pending";
    const consentSource = CABINET_CONSENT_SOURCES.has(coerceString(req.body?.consentSource)) ? coerceString(req.body?.consentSource) : "";
    await db.query("UPDATE cabinet_candidates SET consent_status = $1, consent_source = $2, consent_at = $3 WHERE id = $4", [
      consentStatus,
      consentSource,
      consentStatus === "pending" ? null : now,
      id
    ]);
    await logCabinetActivity(cabinet, "candidate_created", {
      entityType: "candidate",
      entityId: id,
      entityLabel: `${firstName} ${lastName}`.trim(),
      details: { fromCv: Boolean(coerceString(req.body?.sourceText)) }
    });
    await logSecurityEvent(req, userId, "cabinet_candidate_created", { candidateId: id });
    return res.status(201).json({ ok: true, id });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ error: error.message || "Erreur serveur." });
  }
});

app.put("/api/cabinet/candidates/:id", async (req, res) => {
  try {
    const userId = coerceString(req.body?.userId);
    if (!requireMatchingSession(req, res, userId)) return;
    const cabinet = await requireCabinetOwner(userId);
    const candidateId = coerceString(req.params.id);

    const status = coerceString(req.body?.status);
    if (status && !CABINET_CANDIDATE_STATUSES.has(status)) {
      return res.status(400).json({ error: "Statut invalide." });
    }

    const { rows: existingRows } = await db.query(
      "SELECT * FROM cabinet_candidates WHERE id = $1 AND cabinet_user_id = $2",
      [candidateId, cabinet.cabinetRootId]
    );
    if (!existingRows.length) return res.status(404).json({ error: "Candidat introuvable." });
    const existing = existingRows[0];
    if (existing.anonymized_at) return res.status(400).json({ error: "Ce candidat a été anonymisé : sa fiche ne peut plus être modifiée." });
    const consentStatus = coerceString(req.body?.consentStatus);
    if (consentStatus && !CABINET_CONSENT_STATUSES.has(consentStatus)) return res.status(400).json({ error: "Consentement invalide." });
    const consentSource = req.body?.consentSource !== undefined ? coerceString(req.body.consentSource) : existing.consent_source;
    if (!CABINET_CONSENT_SOURCES.has(consentSource || "")) return res.status(400).json({ error: "Origine du consentement invalide." });

    const skills = Array.isArray(req.body?.skills)
      ? req.body.skills.map((value) => coerceString(value).trim()).filter(Boolean)
      : parseJsonField(existing.skills_json, []);

    await db.query(
      `UPDATE cabinet_candidates SET
        first_name = $1, last_name = $2, email = $3, phone = $4, headline = $5,
        skills_json = $6, notes = $7, status = $8,
        cv_file_name = $9, source_text = $10, parsed_json = $11, follow_up_date = $12, updated_at = $13
       WHERE id = $14 AND cabinet_user_id = $15`,
      [
        coerceString(req.body?.firstName ?? existing.first_name).trim(),
        coerceString(req.body?.lastName ?? existing.last_name).trim(),
        coerceString(req.body?.email ?? existing.email).trim(),
        coerceString(req.body?.phone ?? existing.phone).trim(),
        coerceString(req.body?.headline ?? existing.headline).trim(),
        JSON.stringify(skills),
        coerceString(req.body?.notes ?? existing.notes).trim(),
        status || existing.status,
        req.body?.cvFileName !== undefined ? coerceString(req.body.cvFileName).trim() : existing.cv_file_name,
        req.body?.sourceText !== undefined ? coerceString(req.body.sourceText) : existing.source_text,
        req.body?.parsedJson ? JSON.stringify(req.body.parsedJson) : existing.parsed_json,
        req.body?.followUpDate !== undefined ? (coerceString(req.body.followUpDate).trim() || null) : existing.follow_up_date,
        nowIso(),
        candidateId,
        cabinet.cabinetRootId
      ]
    );
    const candidateLabel = `${coerceString(req.body?.firstName ?? existing.first_name)} ${coerceString(req.body?.lastName ?? existing.last_name)}`.trim();
    if ((consentStatus && consentStatus !== existing.consent_status) || (consentSource || "") !== (existing.consent_source || "")) {
      const nextConsent = consentStatus || existing.consent_status;
      await db.query("UPDATE cabinet_candidates SET consent_status = $1, consent_source = $2, consent_at = $3 WHERE id = $4", [
        nextConsent,
        consentSource || "",
        nextConsent === "pending" ? null : nextConsent !== existing.consent_status ? nowIso() : existing.consent_at,
        candidateId
      ]);
      if (nextConsent !== existing.consent_status) {
        await logCabinetActivity(cabinet, "candidate_consent_changed", {
          entityType: "candidate",
          entityId: candidateId,
          entityLabel: candidateLabel,
          details: { from: existing.consent_status, to: nextConsent }
        });
      }
    }
    if (status && status !== existing.status) {
      await logCabinetActivity(cabinet, "candidate_status_changed", {
        entityType: "candidate",
        entityId: candidateId,
        entityLabel: candidateLabel,
        details: { from: existing.status, to: status }
      });
    } else {
      await logCabinetActivity(cabinet, "candidate_updated", { entityType: "candidate", entityId: candidateId, entityLabel: candidateLabel });
    }
    // Date du changement d'étape (et du placement) pour les délais de l'Accueil.
    if (status && status !== existing.status) {
      const changedAt = nowIso();
      await db.query(
        `UPDATE cabinet_candidates
         SET status_updated_at = $1,
             placed_at = CASE WHEN $2 = 'placed' THEN $1 ELSE NULL END
         WHERE id = $3 AND cabinet_user_id = $4`,
        [changedAt, status, candidateId, cabinet.cabinetRootId]
      );
    }
    return res.json({ ok: true });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ error: error.message || "Erreur serveur." });
  }
});

// Fil de notes horodatées par candidat (historique des interactions,
// distinct de la fiche "notes" libre qui reste un champ unique éditable).
app.get("/api/cabinet/candidates/:id/notes", async (req, res) => {
  try {
    const userId = coerceString(req.query?.userId);
    if (!requireMatchingSession(req, res, userId)) return;
    const cabinet = await requireCabinetOwner(userId);
    const candidateId = coerceString(req.params.id);

    const { rows } = await db.query(
      "SELECT id, author_name, body, created_at FROM cabinet_candidate_notes WHERE candidate_id = $1 AND cabinet_user_id = $2 ORDER BY created_at DESC LIMIT 200",
      [candidateId, cabinet.cabinetRootId]
    );
    return res.json({
      items: rows.map((row) => ({ id: row.id, authorName: row.author_name, body: row.body, createdAt: row.created_at }))
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ error: error.message || "Erreur serveur." });
  }
});

app.post("/api/cabinet/candidates/:id/notes", async (req, res) => {
  try {
    const userId = coerceString(req.body?.userId);
    if (!requireMatchingSession(req, res, userId)) return;
    const cabinet = await requireCabinetOwner(userId);
    const candidateId = coerceString(req.params.id);

    const body = coerceString(req.body?.body).trim();
    if (!body) return res.status(400).json({ error: "Le contenu de la note est requis." });

    const { rows: candidateRows } = await db.query(
      "SELECT id, anonymized_at FROM cabinet_candidates WHERE id = $1 AND cabinet_user_id = $2",
      [candidateId, cabinet.cabinetRootId]
    );
    if (!candidateRows.length) return res.status(404).json({ error: "Candidat introuvable." });
    if (candidateRows[0].anonymized_at) return res.status(400).json({ error: "Ce candidat a été anonymisé." });

    const id = `ccnote-${crypto.randomUUID()}`;
    const now = nowIso();
    // author_name reflète l'auteur réel de la note (le recruteur connecté),
    // même si cabinet_user_id (partagé) pointe vers le titulaire.
    await db.query(
      `INSERT INTO cabinet_candidate_notes (id, candidate_id, cabinet_user_id, author_name, body, created_at)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [id, candidateId, cabinet.cabinetRootId, `${cabinet.first_name} ${cabinet.last_name}`.trim(), body, now]
    );
    await db.query("UPDATE cabinet_candidates SET updated_at = $1 WHERE id = $2", [now, candidateId]);
    await logCabinetActivity(cabinet, "candidate_note_added", { entityType: "candidate", entityId: candidateId, details: { excerpt: body.slice(0, 120) } });
    return res.status(201).json({ ok: true, id, createdAt: now });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ error: error.message || "Erreur serveur." });
  }
});

app.delete("/api/cabinet/candidates/:id/notes/:noteId", async (req, res) => {
  try {
    const userId = coerceString(req.query?.userId);
    if (!requireMatchingSession(req, res, userId)) return;
    const cabinet = await requireCabinetOwner(userId);
    const noteId = coerceString(req.params.noteId);
    await db.query("DELETE FROM cabinet_candidate_notes WHERE id = $1 AND cabinet_user_id = $2", [noteId, cabinet.cabinetRootId]);
    return res.json({ ok: true });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ error: error.message || "Erreur serveur." });
  }
});

app.delete("/api/cabinet/candidates/:id", async (req, res) => {
  try {
    const userId = coerceString(req.query?.userId || req.body?.userId);
    if (!requireMatchingSession(req, res, userId)) return;
    const cabinet = await requireCabinetOwner(userId);
    const candidateId = coerceString(req.params.id);
    const { rows: ownedRows } = await db.query("SELECT first_name, last_name FROM cabinet_candidates WHERE id = $1 AND cabinet_user_id = $2", [
      candidateId,
      cabinet.cabinetRootId
    ]);
    if (!ownedRows.length) return res.status(404).json({ error: "Candidat introuvable." });
    await db.query("DELETE FROM cabinet_mission_candidates WHERE candidate_id = $1", [candidateId]);
    await db.query("DELETE FROM cabinet_candidate_notes WHERE candidate_id = $1", [candidateId]);
    await db.query("DELETE FROM cabinet_candidate_emails WHERE candidate_id = $1", [candidateId]);
    await db.query("DELETE FROM cabinet_interviews WHERE candidate_id = $1", [candidateId]);
    await db.query("DELETE FROM cabinet_candidates WHERE id = $1 AND cabinet_user_id = $2", [candidateId, cabinet.cabinetRootId]);
    await logCabinetActivity(cabinet, "candidate_deleted", {
      entityType: "candidate",
      entityId: candidateId,
      entityLabel: `${ownedRows[0].first_name} ${ownedRows[0].last_name}`.trim()
    });
    await logSecurityEvent(req, userId, "cabinet_candidate_deleted", { candidateId });
    return res.json({ ok: true });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ error: error.message || "Erreur serveur." });
  }
});
}

