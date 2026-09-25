// Sous-groupe de routes extrait de backend/routes/cabinet.js
// (voir ARCHITECTURE.md). Dépendances lues depuis app.locals.ctx.
export function registerCabinetMissionsRoutes(app) {
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
    resolveAccountSegments,
    logCabinetActivity,
    ensureCabinetClient
  } = app.locals.ctx;

const CABINET_MISSION_STATUSES = new Set(["open", "in_progress", "closed"]);
const CABINET_MISSION_STAGES = new Set(["sourced", "contacted", "interviewing", "placed", "rejected"]);

// Comparaison de missions — même principe que /api/school/promotions/compare
// : indicateurs clés côte à côte pour repérer la mission qui décroche.
app.get("/api/cabinet/missions/compare", async (req, res) => {
  try {
    const userId = coerceString(req.query?.userId);
    if (!requireMatchingSession(req, res, userId)) return;
    const cabinet = await requireCabinetOwner(userId);

    const { rows: missionRows } = await db.query(
      "SELECT * FROM cabinet_missions WHERE cabinet_user_id = $1 ORDER BY created_at DESC",
      [cabinet.cabinetRootId]
    );
    const missionIds = missionRows.map((row) => row.id);
    const { rows: linkRows } = missionIds.length
      ? await db.query(
          `SELECT mc.mission_id, mc.stage FROM cabinet_mission_candidates mc WHERE mc.mission_id = ANY($1)`,
          [missionIds]
        )
      : { rows: [] };

    const items = missionRows.map((row) => {
      const links = linkRows.filter((link) => link.mission_id === row.id);
      const stageCounts = {};
      for (const link of links) stageCounts[link.stage] = (stageCounts[link.stage] || 0) + 1;
      return {
        id: row.id,
        title: row.title,
        clientName: row.client_name,
        location: row.location,
        status: row.status,
        candidateCount: links.length,
        placedCount: stageCounts.placed || 0,
        interviewingCount: stageCounts.interviewing || 0,
        rejectedCount: stageCounts.rejected || 0,
        sourcedCount: stageCounts.sourced || 0,
        contactedCount: stageCounts.contacted || 0,
        placementAmount: row.placement_amount != null ? Number(row.placement_amount) : null,
        createdAt: row.created_at
      };
    });

    return res.json({ items });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ error: error.message || "Erreur serveur." });
  }
});

app.get("/api/cabinet/missions/export", async (req, res) => {
  try {
    const userId = coerceString(req.query?.userId);
    if (!requireMatchingSession(req, res, userId)) return;
    const cabinet = await requireCabinetOwner(userId);

    const { rows } = await db.query(
      "SELECT * FROM cabinet_missions WHERE cabinet_user_id = $1 ORDER BY created_at DESC",
      [cabinet.cabinetRootId]
    );
    const missionIds = rows.map((row) => row.id);
    const { rows: countRows } = missionIds.length
      ? await db.query(
          "SELECT mission_id, COUNT(*)::int AS count FROM cabinet_mission_candidates WHERE mission_id = ANY($1) GROUP BY mission_id",
          [missionIds]
        )
      : { rows: [] };
    const countByMission = new Map(countRows.map((row) => [row.mission_id, row.count]));

    return sendCsv(
      res,
      "missions.csv",
      ["Poste", "Client", "Localisation", "Statut", "Candidats affectés", "Montant facturé (€)", "Créée le"],
      rows.map((row) => [
        row.title,
        row.client_name,
        row.location,
        row.status,
        countByMission.get(row.id) || 0,
        row.placement_amount ?? "",
        row.created_at
      ])
    );
  } catch (error) {
    return res.status(error.statusCode || 500).json({ error: error.message || "Erreur serveur." });
  }
});

const CONTRACT_TYPES = new Set(["", "cdi", "cdd", "freelance", "interim", "stage", "alternance"]);
const REMOTE_POLICIES = new Set(["", "onsite", "hybrid", "remote"]);

function missionError(message, field) {
  return Object.assign(new Error(message), { statusCode: 400, code: field ? `field:${field}` : undefined });
}

// Champs détaillés d'une mission, validés (création comme modification).
async function readMissionFields(body, cabinet, existing = null) {
  const pick = (key, fallback) => (body?.[key] !== undefined ? body[key] : fallback);
  const title = coerceString(pick("title", existing?.title)).trim().slice(0, 160);
  if (title.length < 2) throw missionError("Le titre du poste doit contenir au moins 2 caractères.", "title");
  const contractType = coerceString(pick("contractType", existing?.contract_type || "")).trim();
  if (!CONTRACT_TYPES.has(contractType)) throw missionError("Type de contrat invalide.", "contractType");
  const remotePolicy = coerceString(pick("remotePolicy", existing?.remote_policy || "")).trim();
  if (!REMOTE_POLICIES.has(remotePolicy)) throw missionError("Mode de travail invalide.", "remotePolicy");
  const toNumber = (value) => (value === "" || value === null || value === undefined ? null : Number(value));
  const salaryMin = toNumber(pick("salaryMin", existing?.salary_min));
  const salaryMax = toNumber(pick("salaryMax", existing?.salary_max));
  if (salaryMin !== null && (!Number.isFinite(salaryMin) || salaryMin < 0)) throw missionError("Salaire minimum invalide.", "salaryMin");
  if (salaryMax !== null && (!Number.isFinite(salaryMax) || salaryMax < 0)) throw missionError("Salaire maximum invalide.", "salaryMax");
  if (salaryMin !== null && salaryMax !== null && salaryMax < salaryMin) throw missionError("Le salaire maximum doit être supérieur au minimum.", "salaryMax");
  const experienceMin = toNumber(pick("experienceMin", existing?.experience_min));
  if (experienceMin !== null && (!Number.isInteger(experienceMin) || experienceMin < 0 || experienceMin > 40)) {
    throw missionError("Expérience minimale invalide (0 à 40 ans).", "experienceMin");
  }
  const rawDeadline = coerceString(pick("deadline", existing?.deadline || "")).trim();
  const deadline = rawDeadline ? new Date(rawDeadline) : null;
  if (deadline && Number.isNaN(deadline.getTime())) throw missionError("Date limite invalide.", "deadline");
  const skillsSource = body?.skills !== undefined ? body.skills : parseJsonField(existing?.skills_json, []);
  const skills = [...new Set((Array.isArray(skillsSource) ? skillsSource : []).map((value) => coerceString(value).trim()).filter(Boolean))].slice(0, 30);

  let clientId = existing?.client_id || null;
  let clientName = existing?.client_name || "";
  if (body?.clientId !== undefined || body?.clientName !== undefined) {
    const requestedId = coerceString(body?.clientId).trim();
    if (requestedId) {
      const { rows } = await db.query("SELECT id, name FROM cabinet_clients WHERE id = $1 AND cabinet_user_id = $2", [requestedId, cabinet.cabinetRootId]);
      if (!rows.length) throw missionError("Client introuvable.", "clientId");
      clientId = rows[0].id;
      clientName = rows[0].name;
    } else {
      clientName = coerceString(body?.clientName).trim().slice(0, 160);
      clientId = clientName ? await ensureCabinetClient(cabinet.cabinetRootId, clientName) : null;
    }
  }

  return {
    title,
    clientId,
    clientName,
    location: coerceString(pick("location", existing?.location || "")).trim().slice(0, 160),
    description: coerceString(pick("description", existing?.description || "")).trim().slice(0, 8000),
    contractType,
    remotePolicy,
    salaryMin,
    salaryMax,
    experienceMin,
    deadline: deadline ? deadline.toISOString().slice(0, 10) : null,
    skills,
    isPublic: pick("isPublic", existing ? Boolean(Number(existing.is_public)) : true) ? 1 : 0
  };
}

function toPublicMission(row, links) {
  return {
    id: row.id,
    title: row.title,
    clientId: row.client_id || "",
    clientName: row.client_name,
    location: row.location,
    status: row.status,
    description: row.description || "",
    contractType: row.contract_type || "",
    remotePolicy: row.remote_policy || "",
    salaryMin: row.salary_min != null ? Number(row.salary_min) : null,
    salaryMax: row.salary_max != null ? Number(row.salary_max) : null,
    experienceMin: row.experience_min ?? null,
    deadline: row.deadline || null,
    skills: parseJsonField(row.skills_json, []),
    isPublic: Boolean(Number(row.is_public)),
    placementAmount: row.placement_amount != null ? Number(row.placement_amount) : null,
    createdAt: row.created_at,
    closedAt: row.closed_at || null,
    candidates: links
      .filter((link) => link.mission_id === row.id)
      .map((link) => ({
        candidateId: link.candidate_id,
        firstName: link.first_name,
        lastName: link.last_name,
        email: link.email,
        stage: link.stage,
        score: link.score,
        aiAnalyzed: Boolean(parseJsonField(link.match_json, {})?.analyzedAt),
        stageUpdatedAt: link.stage_updated_at || null
      }))
  };
}

app.get("/api/cabinet/missions", async (req, res) => {
  try {
    const userId = coerceString(req.query?.userId);
    if (!requireMatchingSession(req, res, userId)) return;
    const cabinet = await requireCabinetOwner(userId);

    const { rows } = await db.query(
      "SELECT * FROM cabinet_missions WHERE cabinet_user_id = $1 ORDER BY created_at DESC",
      [cabinet.cabinetRootId]
    );
    const missionIds = rows.map((row) => row.id);
    const { rows: linkRows } = missionIds.length
      ? await db.query(
          `SELECT mc.mission_id, mc.candidate_id, mc.stage, mc.score, mc.match_json, mc.stage_updated_at, c.first_name, c.last_name, c.email
           FROM cabinet_mission_candidates mc
           JOIN cabinet_candidates c ON c.id = mc.candidate_id
           WHERE mc.mission_id = ANY($1)
           ORDER BY mc.score DESC NULLS LAST, mc.created_at`,
          [missionIds]
        )
      : { rows: [] };

    return res.json({ items: rows.map((row) => toPublicMission(row, linkRows)) });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ error: error.message || "Erreur serveur." });
  }
});

app.post("/api/cabinet/missions", async (req, res) => {
  try {
    const userId = coerceString(req.body?.userId);
    if (!requireMatchingSession(req, res, userId)) return;
    const cabinet = await requireCabinetOwner(userId);
    const fields = await readMissionFields(req.body, cabinet);
    const id = `cmis-${crypto.randomUUID()}`;
    const now = nowIso();
    await db.query(
      `INSERT INTO cabinet_missions (id, cabinet_user_id, title, client_id, client_name, location, status, description, contract_type, remote_policy,
         salary_min, salary_max, experience_min, deadline, skills_json, is_public, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,'open',$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$16)`,
      [
        id,
        cabinet.cabinetRootId,
        fields.title,
        fields.clientId,
        fields.clientName,
        fields.location,
        fields.description,
        fields.contractType,
        fields.remotePolicy,
        fields.salaryMin,
        fields.salaryMax,
        fields.experienceMin,
        fields.deadline,
        JSON.stringify(fields.skills),
        fields.isPublic,
        now
      ]
    );
    await logCabinetActivity(cabinet, "mission_created", { entityType: "mission", entityId: id, entityLabel: fields.title, details: { client: fields.clientName } });
    return res.status(201).json({ ok: true, id });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ error: error.message || "Erreur serveur.", code: error.code });
  }
});

app.put("/api/cabinet/missions/:id", async (req, res) => {
  try {
    const userId = coerceString(req.body?.userId);
    if (!requireMatchingSession(req, res, userId)) return;
    const cabinet = await requireCabinetOwner(userId);
    const missionId = coerceString(req.params.id);
    const status = coerceString(req.body?.status);
    if (status && !CABINET_MISSION_STATUSES.has(status)) {
      return res.status(400).json({ error: "Statut invalide." });
    }
    const { rows } = await db.query("SELECT * FROM cabinet_missions WHERE id = $1 AND cabinet_user_id = $2", [
      missionId,
      cabinet.cabinetRootId
    ]);
    if (!rows.length) return res.status(404).json({ error: "Mission introuvable." });
    const existing = rows[0];
    const fields = await readMissionFields(req.body, cabinet, existing);
    // Le montant facturé n'a de sens qu'une fois une mission clôturée — on
    // le garde nullable ailleurs et on n'écrase la valeur existante que si
    // le champ a explicitement été envoyé.
    let placementAmount = existing.placement_amount;
    if (req.body?.placementAmount !== undefined) {
      const parsed = req.body.placementAmount === null || req.body.placementAmount === "" ? null : Number(req.body.placementAmount);
      if (parsed !== null && (!Number.isFinite(parsed) || parsed < 0)) return res.status(400).json({ error: "Montant invalide.", code: "field:placementAmount" });
      placementAmount = parsed;
    }
    const nextStatus = status || existing.status;
    const now = nowIso();
    const closedAt = nextStatus !== existing.status ? (nextStatus === "closed" ? now : null) : existing.closed_at;
    await db.query(
      `UPDATE cabinet_missions SET title = $1, client_id = $2, client_name = $3, location = $4, status = $5, placement_amount = $6,
         description = $7, contract_type = $8, remote_policy = $9, salary_min = $10, salary_max = $11, experience_min = $12,
         deadline = $13, skills_json = $14, is_public = $15, closed_at = $16, updated_at = $17
       WHERE id = $18 AND cabinet_user_id = $19`,
      [
        fields.title,
        fields.clientId,
        fields.clientName,
        fields.location,
        nextStatus,
        placementAmount,
        fields.description,
        fields.contractType,
        fields.remotePolicy,
        fields.salaryMin,
        fields.salaryMax,
        fields.experienceMin,
        fields.deadline,
        JSON.stringify(fields.skills),
        fields.isPublic,
        closedAt,
        now,
        missionId,
        cabinet.cabinetRootId
      ]
    );
    if (nextStatus !== existing.status) {
      await logCabinetActivity(cabinet, "mission_status_changed", {
        entityType: "mission",
        entityId: missionId,
        entityLabel: fields.title,
        details: { from: existing.status, to: nextStatus }
      });
    } else if (req.body?.placementAmount !== undefined && Number(placementAmount ?? -1) !== Number(existing.placement_amount ?? -1)) {
      await logCabinetActivity(cabinet, "mission_amount_updated", { entityType: "mission", entityId: missionId, entityLabel: fields.title, details: { amount: placementAmount } });
    } else {
      await logCabinetActivity(cabinet, "mission_updated", { entityType: "mission", entityId: missionId, entityLabel: fields.title });
    }
    return res.json({ ok: true });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ error: error.message || "Erreur serveur.", code: error.code });
  }
});

app.delete("/api/cabinet/missions/:id", async (req, res) => {
  try {
    const userId = coerceString(req.query?.userId || req.body?.userId);
    if (!requireMatchingSession(req, res, userId)) return;
    const cabinet = await requireCabinetOwner(userId);
    const missionId = coerceString(req.params.id);
    const { rows: ownedRows } = await db.query("SELECT id, title FROM cabinet_missions WHERE id = $1 AND cabinet_user_id = $2", [
      missionId,
      cabinet.cabinetRootId
    ]);
    if (!ownedRows.length) return res.status(404).json({ error: "Mission introuvable." });
    const { rows: invoiceRows } = await db.query("SELECT 1 FROM cabinet_invoices WHERE mission_id = $1 AND status <> 'draft' LIMIT 1", [missionId]);
    if (invoiceRows.length) return res.status(409).json({ error: "Cette mission a une facture émise : elle ne peut pas être supprimée." });
    await db.query("DELETE FROM cabinet_mission_candidates WHERE mission_id = $1", [missionId]);
    await db.query("UPDATE cabinet_interviews SET mission_id = NULL WHERE mission_id = $1 AND cabinet_user_id = $2", [missionId, cabinet.cabinetRootId]);
    await db.query("DELETE FROM cabinet_invoices WHERE mission_id = $1 AND cabinet_user_id = $2 AND status = 'draft'", [missionId, cabinet.cabinetRootId]);
    await db.query("DELETE FROM cabinet_missions WHERE id = $1 AND cabinet_user_id = $2", [missionId, cabinet.cabinetRootId]);
    await logCabinetActivity(cabinet, "mission_deleted", { entityType: "mission", entityId: missionId, entityLabel: ownedRows[0].title });
    return res.json({ ok: true });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ error: error.message || "Erreur serveur." });
  }
});

// Dupliquer une mission — un cabinet traite souvent des postes similaires
// pour plusieurs clients. Copie la fiche de poste (titre, client, lieu,
// description, compétences…), jamais les candidats affectés ni le montant
// facturé (nouvelle mission = nouveau pipeline vierge, statut "open").
app.post("/api/cabinet/missions/:id/duplicate", async (req, res) => {
  try {
    const userId = coerceString(req.body?.userId);
    if (!requireMatchingSession(req, res, userId)) return;
    const cabinet = await requireCabinetOwner(userId);
    const missionId = coerceString(req.params.id);
    const { rows } = await db.query("SELECT * FROM cabinet_missions WHERE id = $1 AND cabinet_user_id = $2", [
      missionId,
      cabinet.cabinetRootId
    ]);
    if (!rows.length) return res.status(404).json({ error: "Mission introuvable." });
    const source = rows[0];
    const id = `cmis-${crypto.randomUUID()}`;
    const now = nowIso();
    await db.query(
      `INSERT INTO cabinet_missions (id, cabinet_user_id, title, client_id, client_name, location, status, description, contract_type, remote_policy,
         salary_min, salary_max, experience_min, deadline, skills_json, is_public, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,'open',$7,$8,$9,$10,$11,$12,NULL,$13,$14,$15,$15)`,
      [
        id,
        cabinet.cabinetRootId,
        `${source.title} (copie)`,
        source.client_id,
        source.client_name,
        source.location,
        source.description || "",
        source.contract_type || "",
        source.remote_policy || "",
        source.salary_min,
        source.salary_max,
        source.experience_min,
        source.skills_json || "[]",
        source.is_public ?? 1,
        now
      ]
    );
    await logCabinetActivity(cabinet, "mission_duplicated", { entityType: "mission", entityId: id, entityLabel: `${source.title} (copie)` });
    return res.status(201).json({ ok: true, id });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ error: error.message || "Erreur serveur." });
  }
});

app.post("/api/cabinet/missions/:id/candidates", async (req, res) => {
  try {
    const userId = coerceString(req.body?.userId);
    if (!requireMatchingSession(req, res, userId)) return;
    const cabinet = await requireCabinetOwner(userId);
    const missionId = coerceString(req.params.id);
    const candidateId = coerceString(req.body?.candidateId);
    const action = coerceString(req.body?.action || "add");

    const { rows: missionRows } = await db.query(
      "SELECT id, title FROM cabinet_missions WHERE id = $1 AND cabinet_user_id = $2",
      [missionId, cabinet.cabinetRootId]
    );
    if (!missionRows.length) return res.status(404).json({ error: "Mission introuvable." });
    const { rows: candidateRows } = await db.query(
      "SELECT id, first_name, last_name, anonymized_at FROM cabinet_candidates WHERE id = $1 AND cabinet_user_id = $2",
      [candidateId, cabinet.cabinetRootId]
    );
    if (!candidateRows.length) return res.status(404).json({ error: "Candidat introuvable." });
    const candidateLabel = `${candidateRows[0].first_name} ${candidateRows[0].last_name}`.trim();
    const activity = (name, details = {}) =>
      logCabinetActivity(cabinet, name, { entityType: "candidate", entityId: candidateId, entityLabel: candidateLabel, details: { missionId, missionTitle: missionRows[0].title, ...details } });

    if (action === "remove") {
      await db.query("DELETE FROM cabinet_mission_candidates WHERE mission_id = $1 AND candidate_id = $2", [
        missionId,
        candidateId
      ]);
      await activity("mission_candidate_removed");
      return res.json({ ok: true });
    }

    if (action === "stage") {
      const stage = coerceString(req.body?.stage);
      if (!CABINET_MISSION_STAGES.has(stage)) return res.status(400).json({ error: "Étape invalide." });
      const { rows: before } = await db.query("SELECT stage FROM cabinet_mission_candidates WHERE mission_id = $1 AND candidate_id = $2", [missionId, candidateId]);
      const changedAt = nowIso();
      await db.query(
        `UPDATE cabinet_mission_candidates
         SET stage_updated_at = CASE WHEN stage = $1 THEN stage_updated_at ELSE $4 END,
             placed_at = CASE WHEN $1 = 'placed' THEN COALESCE(placed_at, $4) ELSE NULL END,
             stage = $1
         WHERE mission_id = $2 AND candidate_id = $3`,
        [stage, missionId, candidateId, changedAt]
      );
      if (before[0]?.stage !== stage) await activity("mission_stage_changed", { from: before[0]?.stage || null, to: stage });
      return res.json({ ok: true });
    }

    if (candidateRows[0].anonymized_at) return res.status(400).json({ error: "Ce candidat a été anonymisé." });
    const now = nowIso();
    const score = await app.locals.ctx.computeCabinetMatchScore?.(missionId, candidateId);
    const { rows: inserted } = await db.query(
      `INSERT INTO cabinet_mission_candidates (mission_id, candidate_id, stage, score, created_at, stage_updated_at)
       VALUES ($1,$2,'sourced',$3,$4,$4) ON CONFLICT (mission_id, candidate_id) DO NOTHING RETURNING mission_id`,
      [missionId, candidateId, score ?? null, now]
    );
    if (inserted.length) await activity("mission_candidate_added", { score: score ?? null });
    return res.status(201).json({ ok: true, score: score ?? null });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ error: error.message || "Erreur serveur." });
  }
});
}
