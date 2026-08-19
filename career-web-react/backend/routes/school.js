// Routes school — extrait automatiquement de backend/index.js (voir
// ARCHITECTURE.md). Toutes les dépendances (db, helpers, constantes) sont
// lues depuis app.locals.ctx, rempli une fois dans index.js après
// l'initialisation complète (DB ouverte, helpers définis).
export function registerSchoolRoutes(app) {
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

app.get("/api/school/overview", async (req, res) => {
  try {
    const userId = coerceString(req.query?.userId);
    await requireSchoolOwner(userId);

    const metrics = await buildSchoolMetrics(userId);
    const students = metrics.students;

    const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
    const weekCount = 8;
    const now = Date.now();
    const buckets = Array.from({ length: weekCount }, (_, index) => {
      const weeksAgo = weekCount - 1 - index;
      const start = now - (weeksAgo + 1) * WEEK_MS;
      const end = now - weeksAgo * WEEK_MS;
      return { start, end, count: 0 };
    });
    for (const student of students) {
      const createdAt = new Date(student.created_at).getTime();
      if (Number.isNaN(createdAt)) continue;
      const bucket = buckets.find((item) => createdAt >= item.start && createdAt < item.end);
      if (bucket) bucket.count += 1;
    }
    const signupsTrend = buckets.map((bucket) => ({
      weekStart: new Date(bucket.start).toISOString(),
      count: bucket.count
    }));

    return res.json({
      totalStudents: students.length,
      seatsTotal: metrics.seatsTotal,
      seatsUsed: metrics.seatsUsed,
      activationRate: metrics.activationRate,
      totalCvs: metrics.cvRows.length,
      totalMatchRuns: metrics.matchRows.length,
      avgScore: metrics.avgScore,
      inactiveStudents: metrics.inactiveStudents.length,
      withoutCv: metrics.withoutCvStudents.length,
      lowScores: metrics.lowScoreStudents.length,
      topTargetRoles: metrics.topTargetRoles,
      topSkills: metrics.topSkills,
      alerts: buildSchoolAlerts(metrics, coerceString(req.query?.language || "fr")),
      signupsTrend
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ error: error.message || "Erreur serveur." });
  }
});

app.get("/api/school/students", async (req, res) => {
  try {
    const userId = coerceString(req.query?.userId);
    await requireSchoolOwner(userId);

    const search = coerceString(req.query?.search).toLowerCase();
    const students = await getSchoolStudentRows(userId);
    const studentIds = students.map((row) => row.id);

    const { rows: cvRows } = studentIds.length
      ? await db.query("SELECT user_id, created_at FROM cvs WHERE user_id = ANY($1)", [studentIds])
      : { rows: [] };
    const { rows: matchRows } = studentIds.length
      ? await db.query("SELECT user_id, created_at, payload_json FROM match_runs WHERE user_id = ANY($1) ORDER BY created_at DESC", [
          studentIds
        ])
      : { rows: [] };

    const lastActivityByStudent = {};
    for (const row of [...cvRows, ...matchRows]) {
      const time = new Date(row.created_at).getTime();
      if (!lastActivityByStudent[row.user_id] || time > lastActivityByStudent[row.user_id]) {
        lastActivityByStudent[row.user_id] = time;
      }
    }
    const latestScoreByStudent = {};
    for (const row of matchRows) {
      if (latestScoreByStudent[row.user_id] !== undefined) continue;
      const score = parseJsonField(row.payload_json, {})?.matchInsights?.score;
      latestScoreByStudent[row.user_id] = typeof score === "number" ? score : null;
    }

    const filtered = students.filter((row) => {
      if (!search) return true;
      const haystack = `${row.first_name} ${row.last_name} ${row.email}`.toLowerCase();
      return haystack.includes(search);
    });

    return res.json({
      items: filtered.map((row) => {
        const subscription = parseJsonField(row.subscription_json, {});
        const lastActivity = lastActivityByStudent[row.id] ? new Date(lastActivityByStudent[row.id]).toISOString() : null;
        return {
          id: row.id,
          firstName: row.first_name,
          lastName: row.last_name,
          email: row.email,
          avatarDataUrl: row.avatar_data_url || "",
          createdAt: row.created_at,
          licenseCode: subscription.licenseCode || null,
          lastActivity,
          active: Boolean(lastActivity && new Date(lastActivity).getTime() >= Date.now() - 30 * 24 * 60 * 60 * 1000),
          latestScore: latestScoreByStudent[row.id] ?? null
        };
      })
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ error: error.message || "Erreur serveur." });
  }
});

app.post("/api/school/students/remove", async (req, res) => {
  try {
    const userId = coerceString(req.body?.userId);
    await requireSchoolOwner(userId);

    const studentId = coerceString(req.body?.studentId);
    const students = await getSchoolStudentRows(userId);
    const target = students.find((row) => row.id === studentId);
    if (!target) {
      return res.status(404).json({ error: "Étudiant introuvable pour cet établissement." });
    }

    const subscription = parseJsonField(target.subscription_json, {});
    const freePlan = getPlanById("candidate_discovery");
    await db.query("UPDATE users SET subscription_json = $1, updated_at = $2 WHERE id = $3", [
      JSON.stringify({
        plan: "free",
        status: "active",
        planId: freePlan?.id || null,
        billingCycle: null,
        startedAt: nowIso(),
        renewalAt: null,
        licenseCode: null,
        credits: freePlan?.credits ?? 0
      }),
      nowIso(),
      studentId
    ]);

    if (subscription.licenseCode) {
      await db.query("UPDATE license_codes SET seats_used = GREATEST(0, seats_used - 1) WHERE code = $1", [
        subscription.licenseCode
      ]);
    }

    await logSecurityEvent(req, userId, "school_student_removed", { studentId });

    return res.json({ ok: true });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ error: error.message || "Erreur serveur." });
  }
});

app.get("/api/school/license", async (req, res) => {
  try {
    const userId = coerceString(req.query?.userId);
    await requireSchoolOwner(userId);

    const codeRows = await getSchoolLicenseCodeRows(userId);

    return res.json({
      items: codeRows.map((row) => ({
        code: row.code,
        planId: row.plan_id,
        seatsTotal: row.seats_total,
        seatsUsed: row.seats_used,
        revoked: Boolean(Number(row.revoked)),
        createdAt: row.created_at
      }))
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ error: error.message || "Erreur serveur." });
  }
});

app.get("/api/school/insights", async (req, res) => {
  try {
    const userId = coerceString(req.query?.userId);
    await requireSchoolOwner(userId);

    const students = await getSchoolStudentRows(userId);
    const studentIds = students.map((row) => row.id);

    const { rows: matchRows } = studentIds.length
      ? await db.query("SELECT user_id, payload_json FROM match_runs WHERE user_id = ANY($1)", [studentIds])
      : { rows: [] };

    const scoreBuckets = { "0-39": 0, "40-59": 0, "60-79": 0, "80-100": 0 };
    const keywordCounts = {};
    const latestScoreByStudent = new Map();

    for (const row of matchRows) {
      const insights = parseJsonField(row.payload_json, {})?.matchInsights || {};
      if (typeof insights.score === "number") {
        latestScoreByStudent.set(row.user_id, insights.score);
      }
      const keywords = Array.isArray(insights.missingKeywords) ? insights.missingKeywords : [];
      for (const keyword of keywords) {
        const key = String(keyword).trim();
        if (!key) continue;
        keywordCounts[key] = (keywordCounts[key] || 0) + 1;
      }
    }

    for (const score of latestScoreByStudent.values()) {
      if (score < 40) scoreBuckets["0-39"] += 1;
      else if (score < 60) scoreBuckets["40-59"] += 1;
      else if (score < 80) scoreBuckets["60-79"] += 1;
      else scoreBuckets["80-100"] += 1;
    }

    const topMissingKeywords = Object.entries(keywordCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([keyword, count]) => ({ keyword, count }));

    const studentById = Object.fromEntries(students.map((row) => [row.id, row]));
    const ranking = [...latestScoreByStudent.entries()]
      .map(([studentId, score]) => ({ student: studentById[studentId], score }))
      .filter((entry) => entry.student)
      .sort((a, b) => b.score - a.score)
      .map((entry) => ({
        id: entry.student.id,
        firstName: entry.student.first_name,
        lastName: entry.student.last_name,
        email: entry.student.email,
        avatarDataUrl: entry.student.avatar_data_url || "",
        score: entry.score
      }));

    return res.json({ scoreBuckets, topMissingKeywords, ranking });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ error: error.message || "Erreur serveur." });
  }
});

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

app.get("/api/school/profile", async (req, res) => {
  try {
    const userId = coerceString(req.query?.userId);
    const school = await requireSchoolOwner(userId);
    const profile = await getSchoolOrgProfile(userId);
    return res.json({
      admin: {
        id: school.id,
        firstName: school.first_name,
        lastName: school.last_name,
        email: school.email,
        avatarDataUrl: school.avatar_data_url || ""
      },
      profile
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ error: error.message || "Erreur serveur." });
  }
});

app.put("/api/school/profile", async (req, res) => {
  try {
    const userId = coerceString(req.body?.userId);
    await requireSchoolOwner(userId);
    const profile = req.body?.profile || {};
    await db.query(
      `INSERT INTO user_org_profiles (
        user_id, organization_name, acronym, organization_type, department, website, size_range, industry, contact_role, notes,
        logo_data_url, address, city, country, email_domain, contact_email, contact_phone, primary_contact_name, updated_at
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)
      ON CONFLICT (user_id) DO UPDATE SET
        organization_name=EXCLUDED.organization_name,
        acronym=EXCLUDED.acronym,
        organization_type=EXCLUDED.organization_type,
        department=EXCLUDED.department,
        website=EXCLUDED.website,
        size_range=EXCLUDED.size_range,
        industry=EXCLUDED.industry,
        contact_role=EXCLUDED.contact_role,
        notes=EXCLUDED.notes,
        logo_data_url=EXCLUDED.logo_data_url,
        address=EXCLUDED.address,
        city=EXCLUDED.city,
        country=EXCLUDED.country,
        email_domain=EXCLUDED.email_domain,
        contact_email=EXCLUDED.contact_email,
        contact_phone=EXCLUDED.contact_phone,
        primary_contact_name=EXCLUDED.primary_contact_name,
        updated_at=EXCLUDED.updated_at`,
      [
        userId,
        coerceString(profile.organizationName),
        coerceString(profile.acronym),
        coerceString(profile.organizationType),
        coerceString(profile.department),
        coerceString(profile.website),
        coerceString(profile.sizeRange),
        coerceString(profile.industry),
        coerceString(profile.contactRole),
        coerceString(profile.notes),
        coerceString(profile.logoDataUrl),
        coerceString(profile.address),
        coerceString(profile.city),
        coerceString(profile.country),
        coerceString(profile.emailDomain),
        normalizeEmail(profile.contactEmail || ""),
        coerceString(profile.contactPhone),
        coerceString(profile.primaryContactName),
        nowIso()
      ]
    );
    await logSecurityEvent(req, userId, "school_profile_updated", {});
    return res.json({ ok: true, profile: await getSchoolOrgProfile(userId) });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ error: error.message || "Erreur serveur." });
  }
});

app.get("/api/school/notifications", async (req, res) => {
  try {
    const userId = coerceString(req.query?.userId);
    await requireSchoolOwner(userId);
    const metrics = await buildSchoolMetrics(userId);
    const generated = buildSchoolAlerts(metrics, coerceString(req.query?.language || "fr")).map((item, index) => ({
      id: `generated-${item.type}-${index}`,
      ...item,
      readAt: "",
      createdAt: nowIso(),
      generated: true
    }));
    const { rows } = await db.query(
      "SELECT * FROM school_notifications WHERE school_user_id = $1 ORDER BY created_at DESC LIMIT 50",
      [userId]
    );
    const stored = rows.map((row) => ({
      id: row.id,
      type: row.type,
      title: row.title,
      body: row.body,
      metadata: parseJsonField(row.metadata_json, {}),
      readAt: row.read_at,
      createdAt: row.created_at,
      generated: false
    }));
    return res.json({ items: [...generated, ...stored], unreadCount: [...generated, ...stored].filter((item) => !item.readAt).length });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ error: error.message || "Erreur serveur." });
  }
});

app.post("/api/school/notifications/read", async (req, res) => {
  try {
    const userId = coerceString(req.body?.userId);
    await requireSchoolOwner(userId);
    await db.query("UPDATE school_notifications SET read_at = $1 WHERE school_user_id = $2 AND COALESCE(read_at, '') = ''", [
      nowIso(),
      userId
    ]);
    return res.json({ ok: true });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ error: error.message || "Erreur serveur." });
  }
});

app.get("/api/school/promotions", async (req, res) => {
  try {
    const userId = coerceString(req.query?.userId);
    await requireSchoolOwner(userId);
    const students = await getSchoolStudentRows(userId);
    const { rows } = await db.query("SELECT * FROM school_promotions WHERE school_user_id = $1 ORDER BY created_at DESC", [userId]);
    const promotionIds = rows.map((row) => row.id);
    const { rows: links } = promotionIds.length
      ? await db.query("SELECT promotion_id, student_user_id FROM school_promotion_students WHERE promotion_id = ANY($1)", [promotionIds])
      : { rows: [] };
    return res.json({
      items: rows.map((row) => ({
        id: row.id,
        name: row.name,
        program: row.program,
        level: row.level,
        campus: row.campus,
        academicYear: row.academic_year,
        createdAt: row.created_at,
        studentIds: links.filter((link) => link.promotion_id === row.id).map((link) => link.student_user_id),
        studentCount: links.filter((link) => link.promotion_id === row.id).length
      })),
      students: students.map((row) => ({
        id: row.id,
        firstName: row.first_name,
        lastName: row.last_name,
        email: row.email,
        avatarDataUrl: row.avatar_data_url || ""
      }))
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ error: error.message || "Erreur serveur." });
  }
});

app.post("/api/school/promotions", async (req, res) => {
  try {
    const userId = coerceString(req.body?.userId);
    await requireSchoolOwner(userId);
    const name = coerceString(req.body?.name);
    if (!name) return res.status(400).json({ error: "Le nom de la promotion est requis." });
    const id = `promo-${crypto.randomUUID()}`;
    await db.query(
      `INSERT INTO school_promotions (id, school_user_id, name, program, level, campus, academic_year, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$8)`,
      [
        id,
        userId,
        name,
        coerceString(req.body?.program),
        coerceString(req.body?.level),
        coerceString(req.body?.campus),
        coerceString(req.body?.academicYear),
        nowIso()
      ]
    );
    await logSecurityEvent(req, userId, "school_promotion_created", { promotionId: id });
    return res.status(201).json({ ok: true, id });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ error: error.message || "Erreur serveur." });
  }
});

app.post("/api/school/promotions/:id/students", async (req, res) => {
  try {
    const userId = coerceString(req.body?.userId);
    await requireSchoolOwner(userId);
    const promotionId = coerceString(req.params.id);
    const studentId = coerceString(req.body?.studentId);
    const action = coerceString(req.body?.action || "add");
    if (!promotionId || !studentId) return res.status(400).json({ error: "Promotion et étudiant requis." });

    const { rows: promoRows } = await db.query("SELECT id FROM school_promotions WHERE id = $1 AND school_user_id = $2", [
      promotionId,
      userId
    ]);
    if (!promoRows.length) return res.status(404).json({ error: "Promotion introuvable." });

    const students = await getSchoolStudentRows(userId);
    if (!students.some((student) => student.id === studentId)) {
      return res.status(403).json({ error: "Cet étudiant n'est pas rattaché à votre établissement." });
    }

    if (action === "remove") {
      await db.query("DELETE FROM school_promotion_students WHERE promotion_id = $1 AND student_user_id = $2", [
        promotionId,
        studentId
      ]);
      await logSecurityEvent(req, userId, "school_promotion_student_removed", { promotionId, studentId });
    } else {
      await db.query(
        `INSERT INTO school_promotion_students (id, promotion_id, student_user_id, created_at)
         VALUES ($1,$2,$3,$4)
         ON CONFLICT (promotion_id, student_user_id) DO NOTHING`,
        [`promo-student-${crypto.randomUUID()}`, promotionId, studentId, nowIso()]
      );
      await logSecurityEvent(req, userId, "school_promotion_student_added", { promotionId, studentId });
    }
    return res.json({ ok: true });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ error: error.message || "Erreur serveur." });
  }
});

app.delete("/api/school/promotions/:id", async (req, res) => {
  try {
    const userId = coerceString(req.query?.userId || req.body?.userId);
    await requireSchoolOwner(userId);
    const promotionId = coerceString(req.params.id);
    await db.query("DELETE FROM school_promotion_students WHERE promotion_id = $1", [promotionId]);
    await db.query("DELETE FROM school_promotions WHERE id = $1 AND school_user_id = $2", [promotionId, userId]);
    await logSecurityEvent(req, userId, "school_promotion_deleted", { promotionId });
    return res.json({ ok: true });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ error: error.message || "Erreur serveur." });
  }
});

app.get("/api/school/reports", async (req, res) => {
  try {
    const userId = coerceString(req.query?.userId);
    await requireSchoolOwner(userId);
    const metrics = await buildSchoolMetrics(userId);
    const { rows } = await db.query("SELECT * FROM school_reports WHERE school_user_id = $1 ORDER BY created_at DESC LIMIT 50", [userId]);
    return res.json({
      snapshot: {
        totalStudents: metrics.students.length,
        activeStudents: metrics.students.length - metrics.inactiveStudents.length,
        withoutCv: metrics.withoutCvStudents.length,
        lowScores: metrics.lowScoreStudents.length,
        avgScore: metrics.avgScore,
        topTargetRoles: metrics.topTargetRoles,
        topSkills: metrics.topSkills
      },
      items: rows.map((row) => ({
        id: row.id,
        title: row.title,
        period: row.period,
        payload: parseJsonField(row.payload_json, {}),
        createdAt: row.created_at
      }))
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ error: error.message || "Erreur serveur." });
  }
});

app.post("/api/school/reports/generate", async (req, res) => {
  try {
    const userId = coerceString(req.body?.userId);
    await requireSchoolOwner(userId);
    const period = coerceString(req.body?.period || "monthly");
    const metrics = await buildSchoolMetrics(userId);
    const payload = {
      generatedAt: nowIso(),
      totalStudents: metrics.students.length,
      activeStudents: metrics.students.length - metrics.inactiveStudents.length,
      inactiveStudents: metrics.inactiveStudents.length,
      withoutCv: metrics.withoutCvStudents.length,
      lowScores: metrics.lowScoreStudents.length,
      avgScore: metrics.avgScore,
      topTargetRoles: metrics.topTargetRoles,
      topSkills: metrics.topSkills,
      alerts: buildSchoolAlerts(metrics, "fr")
    };
    const id = `report-${crypto.randomUUID()}`;
    const title = period === "weekly" ? "Rapport hebdomadaire employabilité" : "Rapport mensuel employabilité";
    await db.query(
      "INSERT INTO school_reports (id, school_user_id, title, period, payload_json, created_at) VALUES ($1,$2,$3,$4,$5,$6)",
      [id, userId, title, period, JSON.stringify(payload), nowIso()]
    );
    await logSecurityEvent(req, userId, "school_report_generated", { reportId: id, period });
    return res.status(201).json({ ok: true, id, payload });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ error: error.message || "Erreur serveur." });
  }
});

app.get("/api/school/students/export", async (req, res) => {
  try {
    const userId = coerceString(req.query?.userId);
    await requireSchoolOwner(userId);
    const students = await getSchoolStudentRows(userId);
    const header = ["prenom", "nom", "email", "date_inscription"].join(",");
    const lines = students.map((row) =>
      [row.first_name, row.last_name, row.email, row.created_at].map((value) => `"${String(value || "").replace(/"/g, '""')}"`).join(",")
    );
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", "attachment; filename=\"career-app-etudiants.csv\"");
    return res.send([header, ...lines].join("\n"));
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
