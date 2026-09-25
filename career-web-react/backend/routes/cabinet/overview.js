// Sous-groupe de routes extrait de backend/routes/cabinet.js
// (voir ARCHITECTURE.md). Dépendances lues depuis app.locals.ctx.
export function registerCabinetOverviewRoutes(app) {
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
    getCabinetExpiredCandidateIds,
    resolveAccountSegments
  } = app.locals.ctx;

app.get("/api/cabinet/overview", async (req, res) => {
  try {
    const userId = coerceString(req.query?.userId);
    if (!requireMatchingSession(req, res, userId)) return;
    const cabinet = await requireCabinetOwner(userId);
    const rootId = cabinet.cabinetRootId;

    const metrics = await buildCabinetMetrics(rootId);
    const alerts = buildCabinetAlerts(metrics, coerceString(req.query?.language || "fr"));

    const { rows: recentCandidates } = await db.query(
      "SELECT id, first_name, last_name, email, headline, status, created_at FROM cabinet_candidates WHERE cabinet_user_id = $1 ORDER BY created_at DESC LIMIT 6",
      [rootId]
    );

    // Indicateurs de pilotage de l'Accueil (lecture seule) : pipeline par
    // étape, missions par statut, entrées au vivier sur 8 semaines,
    // compétences les plus présentes et relances échues.
    const { rows: pipelineRows } = await db.query(
      "SELECT status, skills_json, created_at, follow_up_date, created_by, source_text <> '' AS has_cv FROM cabinet_candidates WHERE cabinet_user_id = $1",
      [rootId]
    );
    const candidateStatusCounts = {};
    const skillCounts = new Map();
    let followUpDueCount = 0;
    const nowStamp = nowIso();
    for (const row of pipelineRows) {
      candidateStatusCounts[row.status] = (candidateStatusCounts[row.status] || 0) + 1;
      if (row.follow_up_date && row.follow_up_date <= nowStamp) followUpDueCount += 1;
      for (const skill of parseJsonField(row.skills_json, [])) {
        const label = coerceString(skill).trim();
        if (!label) continue;
        const key = label.toLowerCase();
        const entry = skillCounts.get(key) || { label, count: 0 };
        entry.count += 1;
        skillCounts.set(key, entry);
      }
    }
    const topSkills = [...skillCounts.values()].sort((a, b) => b.count - a.count || a.label.localeCompare(b.label)).slice(0, 8);

    const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
    const nowMs = Date.now();
    const buckets = Array.from({ length: 8 }, (_, index) => {
      const weeksAgo = 7 - index;
      return { start: nowMs - (weeksAgo + 1) * WEEK_MS, end: nowMs - weeksAgo * WEEK_MS, count: 0 };
    });
    for (const row of pipelineRows) {
      const createdAt = new Date(row.created_at).getTime();
      const bucket = buckets.find((item) => createdAt >= item.start && createdAt < item.end);
      if (bucket) bucket.count += 1;
    }
    const candidatesTrend = buckets.map((bucket) => ({ weekStart: new Date(bucket.start).toISOString(), count: bucket.count }));

    const { rows: missionStatusRows } = await db.query(
      "SELECT status, COUNT(*)::int AS count, COUNT(*) FILTER (WHERE placement_amount IS NOT NULL AND placement_amount > 0)::int AS billed FROM cabinet_missions WHERE cabinet_user_id = $1 GROUP BY status",
      [rootId]
    );
    const missionStatusCounts = {};
    let billedMissionCount = 0;
    for (const row of missionStatusRows) {
      missionStatusCounts[row.status] = row.count;
      billedMissionCount += row.billed;
    }
    // ------------------------------------------------ performance du cabinet
    const DAY = 24 * 60 * 60 * 1000;
    const monthStart = new Date(Date.UTC(new Date(nowMs).getUTCFullYear(), new Date(nowMs).getUTCMonth(), 1)).getTime();
    const prevMonthStart = new Date(Date.UTC(new Date(nowMs).getUTCFullYear(), new Date(nowMs).getUTCMonth() - 1, 1)).getTime();
    const inRange = (value, from, to) => {
      const time = new Date(value || "").getTime();
      return !Number.isNaN(time) && time >= from && time < to;
    };
    const candidatesThisMonth = pipelineRows.filter((row) => inRange(row.created_at, monthStart, nowMs + DAY)).length;
    const candidatesLastMonth = pipelineRows.filter((row) => inRange(row.created_at, prevMonthStart, monthStart)).length;
    const candidatesWithCv = pipelineRows.filter((row) => row.has_cv).length;
    const followUpsNext7 = pipelineRows.filter((row) => row.follow_up_date && row.follow_up_date > nowStamp && inRange(row.follow_up_date, nowMs, nowMs + 7 * DAY)).length;
    const activeRecruiters30 = new Set(pipelineRows.filter((row) => row.created_by && inRange(row.created_at, nowMs - 30 * DAY, nowMs + DAY)).map((row) => row.created_by)).size;

    // Placements datés (enregistrés depuis l'ajout des dates d'étape).
    const { rows: placedRows } = await db.query(
      `SELECT mc.created_at, mc.placed_at FROM cabinet_mission_candidates mc
       JOIN cabinet_missions m ON m.id = mc.mission_id
       WHERE m.cabinet_user_id = $1 AND mc.stage = 'placed' AND mc.placed_at IS NOT NULL`,
      [rootId]
    );
    const placementsThisMonth = placedRows.filter((row) => inRange(row.placed_at, monthStart, nowMs + DAY)).length;
    const placementsLastMonth = placedRows.filter((row) => inRange(row.placed_at, prevMonthStart, monthStart)).length;
    const placementDelays = placedRows
      .map((row) => (new Date(row.placed_at).getTime() - new Date(row.created_at).getTime()) / DAY)
      .filter((days) => Number.isFinite(days) && days >= 0);
    const avgDaysToPlacement = placementDelays.length ? Math.round((placementDelays.reduce((sum, days) => sum + days, 0) / placementDelays.length) * 10) / 10 : null;

    const { rows: missionRowsFull } = await db.query(
      "SELECT id, client_name, status, created_at, closed_at, placement_amount FROM cabinet_missions WHERE cabinet_user_id = $1",
      [rootId]
    );
    const closedDelays = missionRowsFull
      .filter((row) => row.status === "closed" && row.closed_at)
      .map((row) => (new Date(row.closed_at).getTime() - new Date(row.created_at).getTime()) / DAY)
      .filter((days) => Number.isFinite(days) && days >= 0);
    const avgDaysToClose = closedDelays.length ? Math.round((closedDelays.reduce((sum, days) => sum + days, 0) / closedDelays.length) * 10) / 10 : null;
    // Chiffre d'affaires réel : factures émises (hors brouillons et annulées)
    // et encaissements, à leur date.
    const { rows: invoiceRows } = await db.query(
      "SELECT status, amount_ht, issued_at, paid_at, due_at FROM cabinet_invoices WHERE cabinet_user_id = $1 AND status IN ('sent', 'paid')",
      [rootId]
    );
    const sumHt = (list) => Math.round(list.reduce((sum, row) => sum + Number(row.amount_ht || 0), 0) * 100) / 100;
    const revenueThisMonth = sumHt(invoiceRows.filter((row) => inRange(row.issued_at, monthStart, nowMs + DAY)));
    const revenueLastMonth = sumHt(invoiceRows.filter((row) => inRange(row.issued_at, prevMonthStart, monthStart)));
    const cashedThisMonth = sumHt(invoiceRows.filter((row) => row.status === "paid" && inRange(row.paid_at, monthStart, nowMs + DAY)));
    const invoicedTotal = sumHt(invoiceRows);
    const outstanding = sumHt(invoiceRows.filter((row) => row.status === "sent"));
    const overdueInvoiceCount = invoiceRows.filter((row) => row.status === "sent" && row.due_at && row.due_at < nowStamp).length;

    const { rows: interviewRows } = await db.query(
      "SELECT scheduled_at FROM cabinet_interviews WHERE cabinet_user_id = $1 AND status = 'planned' AND scheduled_at >= $2 AND scheduled_at < $3",
      [rootId, new Date(nowMs - DAY).toISOString(), new Date(nowMs + 7 * DAY).toISOString()]
    );
    const interviewsNext7 = interviewRows.filter((row) => inRange(row.scheduled_at, nowMs, nowMs + 7 * DAY)).length;

    // Portefeuille clients (nom saisi sur les missions).
    const clientMap = new Map();
    for (const row of missionRowsFull) {
      const name = coerceString(row.client_name).trim();
      if (!name) continue;
      const key = name.toLowerCase();
      const entry = clientMap.get(key) || { name, missions: 0, openMissions: 0, revenue: 0 };
      entry.missions += 1;
      if (row.status !== "closed") entry.openMissions += 1;
      entry.revenue += Number(row.placement_amount || 0);
      clientMap.set(key, entry);
    }
    const clients = [...clientMap.values()].sort((a, b) => b.revenue - a.revenue || b.missions - a.missions);

    const { rows: assignmentRows } = await db.query(
      `SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE mc.stage = 'placed')::int AS placed
       FROM cabinet_mission_candidates mc JOIN cabinet_missions m ON m.id = mc.mission_id
       WHERE m.cabinet_user_id = $1`,
      [rootId]
    );

    // Missions ouvertes depuis 3j+ sans aucun candidat affecté et candidats
    // encore "sourcés" (jamais contactés) — les deux segments concrets pour
    // une relance ciblée depuis le dashboard (voir panneau "Relances").
    const { rows: staleMissionRows } = await db.query(
      `SELECT m.id FROM cabinet_missions m
       WHERE m.cabinet_user_id = $1 AND m.status != 'closed' AND m.created_at < $2
         AND NOT EXISTS (SELECT 1 FROM cabinet_mission_candidates mc WHERE mc.mission_id = m.id)`,
      [rootId, new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()]
    );
    const { rows: uncontactedRows } = await db.query(
      "SELECT COUNT(*)::int AS count FROM cabinet_candidates WHERE cabinet_user_id = $1 AND status = 'sourced'",
      [rootId]
    );
    const { rows: placementRows } = await db.query(
      "SELECT COALESCE(SUM(placement_amount), 0) AS total FROM cabinet_missions WHERE cabinet_user_id = $1",
      [rootId]
    );

    // Performance par recruteur — désormais pertinent puisque le vivier est
    // partagé au sein du cabinet : nombre de candidats sourcés et placés
    // imputés à chaque compte (created_by), avec le titulaire lui-même
    // inclus comme un membre de l'équipe parmi d'autres.
    const { rows: performanceRows } = await db.query(
      `SELECT c.created_by AS user_id, u.first_name, u.last_name,
              COUNT(*)::int AS sourced_count,
              COUNT(*) FILTER (WHERE c.status = 'placed')::int AS placed_count
       FROM cabinet_candidates c
       LEFT JOIN users u ON u.id = c.created_by
       WHERE c.cabinet_user_id = $1 AND c.created_by IS NOT NULL
       GROUP BY c.created_by, u.first_name, u.last_name
       ORDER BY placed_count DESC, sourced_count DESC`,
      [rootId]
    );

    return res.json({
      recruiterCount: metrics.recruiters.length,
      seatsTotal: metrics.seatsTotal,
      seatsUsed: metrics.seatsUsed,
      candidateCount: metrics.candidateCount,
      missionCount: metrics.missionCount,
      openMissionCount: metrics.openMissionCount,
      staleMissionCount: staleMissionRows.length,
      uncontactedCandidateCount: uncontactedRows[0]?.count || 0,
      totalPlacementRevenue: Number(placementRows[0]?.total || 0),
      billedMissionCount,
      candidateStatusCounts,
      missionStatusCounts,
      assignmentCount: assignmentRows[0]?.total || 0,
      assignmentPlacedCount: assignmentRows[0]?.placed || 0,
      followUpDueCount,
      followUpsNext7,
      candidatesThisMonth,
      candidatesLastMonth,
      candidatesWithCv,
      activeRecruiters30,
      placementsThisMonth,
      placementsLastMonth,
      avgDaysToPlacement,
      avgDaysToClose,
      revenueThisMonth,
      revenueLastMonth,
      cashedThisMonth,
      invoicedTotal,
      outstanding,
      overdueInvoiceCount,
      interviewsNext7,
      clientCount: clients.length,
      topClients: clients.slice(0, 5),
      topSkills,
      candidatesTrend,
      alerts,
      recentCandidates: recentCandidates.map((row) => ({
        id: row.id,
        firstName: row.first_name,
        lastName: row.last_name,
        email: row.email || "",
        headline: row.headline || "",
        status: row.status,
        createdAt: row.created_at
      })),
      recruiterPerformance: performanceRows.map((row) => ({
        userId: row.user_id,
        firstName: row.first_name || "",
        lastName: row.last_name || "",
        sourcedCount: row.sourced_count,
        placedCount: row.placed_count
      }))
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ error: error.message || "Erreur serveur." });
  }
});

// Cloche de notifications — même principe que GET /api/notifications côté
// candidat : rien n'est stocké, tout est recalculé à la volée à partir
// d'événements réels (jamais de contenu fabriqué), avec des ids stables
// pour que le "lu" (géré en local côté client) reste cohérent d'un appel à
// l'autre.
app.get("/api/cabinet/notifications", async (req, res) => {
  try {
    const userId = coerceString(req.query?.userId);
    if (!requireMatchingSession(req, res, userId)) return;
    const cabinet = await requireCabinetOwner(userId);
    const rootId = cabinet.cabinetRootId;
    const language = coerceString(req.query?.language || "fr");

    const metrics = await buildCabinetMetrics(rootId);
    const alerts = buildCabinetAlerts(metrics, language);
    const items = alerts.map((alert) => ({
      id: `alert-${alert.type}`,
      type: alert.type,
      title: alert.title,
      body: alert.body,
      createdAt: null
    }));

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    // Nouveaux recruteurs ayant rejoint récemment (invitation acceptée).
    const { rows: redeemedInvites } = await db.query(
      `SELECT id, email, redeemed_at FROM cabinet_invitations
       WHERE cabinet_user_id = $1 AND status = 'redeemed' AND redeemed_at >= $2
       ORDER BY redeemed_at DESC LIMIT 10`,
      [rootId, sevenDaysAgo]
    );
    for (const row of redeemedInvites) {
      items.push({
        id: `recruiter-joined-${row.id}`,
        type: "recruiter_joined",
        title: language === "en" ? "A recruiter joined your firm" : "Un recruteur a rejoint votre cabinet",
        body: row.email,
        createdAt: row.redeemed_at
      });
    }

    // Missions ouvertes depuis plus de 3 jours sans aucun candidat affecté —
    // signal actionnable, pas juste un compteur.
    const { rows: staleMissions } = await db.query(
      `SELECT m.id, m.title, m.created_at FROM cabinet_missions m
       WHERE m.cabinet_user_id = $1 AND m.status != 'closed' AND m.created_at < $2
         AND NOT EXISTS (SELECT 1 FROM cabinet_mission_candidates mc WHERE mc.mission_id = m.id)
       ORDER BY m.created_at ASC LIMIT 10`,
      [rootId, new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()]
    );
    for (const row of staleMissions) {
      items.push({
        id: `mission-no-candidate-${row.id}`,
        type: "mission_no_candidate",
        title: language === "en" ? "Mission without any candidate" : "Mission sans candidat affecté",
        body: row.title,
        createdAt: row.created_at
      });
    }

    // Rappels de suivi candidats échus (follow_up_date <= aujourd'hui).
    const { rows: dueFollowUps } = await db.query(
      `SELECT id, first_name, last_name, follow_up_date FROM cabinet_candidates
       WHERE cabinet_user_id = $1 AND follow_up_date IS NOT NULL AND follow_up_date <= $2
       ORDER BY follow_up_date ASC LIMIT 10`,
      [rootId, nowIso()]
    );
    for (const row of dueFollowUps) {
      items.push({
        id: `follow-up-${row.id}`,
        type: "candidate_follow_up",
        title: language === "en" ? "Follow-up reminder" : "Rappel de relance",
        body: `${row.first_name} ${row.last_name}`.trim(),
        createdAt: row.follow_up_date
      });
    }

    // Entretiens planifiés aujourd'hui et demain.
    const dayMs = 24 * 60 * 60 * 1000;
    const { rows: soonInterviews } = await db.query(
      `SELECT i.id, i.scheduled_at, c.first_name, c.last_name FROM cabinet_interviews i
       LEFT JOIN cabinet_candidates c ON c.id = i.candidate_id
       WHERE i.cabinet_user_id = $1 AND i.status = 'planned' AND i.scheduled_at >= $2 AND i.scheduled_at < $3
       ORDER BY i.scheduled_at ASC LIMIT 10`,
      [rootId, nowIso(), new Date(Date.now() + 2 * dayMs).toISOString()]
    );
    const timeFormat = new Intl.DateTimeFormat(language === "en" ? "en-GB" : "fr-FR", { weekday: "long", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" });
    for (const row of soonInterviews) {
      items.push({
        id: `interview-${row.id}`,
        type: "interview_upcoming",
        title: language === "en" ? "Upcoming interview" : "Entretien à venir",
        body: `${`${row.first_name || ""} ${row.last_name || ""}`.trim()} · ${timeFormat.format(new Date(row.scheduled_at))}`,
        createdAt: row.scheduled_at
      });
    }

    // Factures émises dont l'échéance est dépassée (titulaire uniquement).
    if (cabinet.isCabinetOwner) {
      const { rows: overdue } = await db.query(
        "SELECT id, number, client_name, due_at FROM cabinet_invoices WHERE cabinet_user_id = $1 AND status = 'sent' AND due_at < $2 ORDER BY due_at LIMIT 10",
        [rootId, nowIso()]
      );
      for (const row of overdue) {
        items.push({
          id: `invoice-overdue-${row.id}`,
          type: "invoice_overdue",
          title: language === "en" ? "Overdue invoice" : "Facture en retard de paiement",
          body: `${row.number} · ${row.client_name}`,
          createdAt: row.due_at
        });
      }
      // RGPD : candidats au-delà de la durée de conservation.
      const { rows: profileRows } = await db.query("SELECT retention_months FROM user_recruiter_profiles WHERE user_id = $1", [rootId]);
      const expired = await getCabinetExpiredCandidateIds(rootId, profileRows[0]?.retention_months || 24);
      if (expired.length) {
        items.push({
          id: `rgpd-expired-${expired.length}`,
          type: "rgpd_retention",
          title: language === "en" ? "Candidate data to anonymize" : "Données candidats à anonymiser",
          body:
            language === "en"
              ? `${expired.length} candidate(s) exceed your retention period.`
              : `${expired.length} candidat(s) dépassent votre durée de conservation.`,
          createdAt: null
        });
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

