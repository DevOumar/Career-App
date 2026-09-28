// Sous-groupe de routes extrait de backend/routes/school.js
// (voir ARCHITECTURE.md). Dépendances lues depuis app.locals.ctx.
export function registerSchoolStudentsRoutes(app) {
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
    buildSchoolInvitationEmail,
    getSchoolSeatAvailability,
    reserveSchoolSeat,
    sendAppEmail,
    orgLicenseExpired
  } = app.locals.ctx;

app.get("/api/school/students", async (req, res) => {
  try {
    const userId = coerceString(req.query?.userId);
    if (!requireMatchingSession(req, res, userId)) return;
    await requireSchoolOwner(userId);

    const search = coerceString(req.query?.search).toLowerCase();
    const students = await getSchoolStudentRows(userId);
    const studentIds = students.map((row) => row.id);

    const { rows: cvRows } = studentIds.length
      ? await db.query("SELECT user_id, created_at FROM cvs WHERE user_id = ANY($1) AND deleted_at IS NULL", [studentIds])
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

    const promotionByStudent = {};
    if (studentIds.length) {
      const { rows: promoLinks } = await db.query(
        `SELECT sps.student_user_id, sp.name
         FROM school_promotion_students sps
         JOIN school_promotions sp ON sp.id = sps.promotion_id
         WHERE sp.school_user_id = $1 AND sps.student_user_id = ANY($2)`,
        [userId, studentIds]
      );
      for (const row of promoLinks) {
        promotionByStudent[row.student_user_id] = row.name;
      }
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
          promotionName: promotionByStudent[row.id] || null,
          lastActivity,
          active: Boolean(lastActivity && new Date(lastActivity).getTime() >= Date.now() - 30 * 24 * 60 * 60 * 1000),
          suspended: Boolean(subscription.licenseSuspended),
          suspendedAt: subscription.licenseSuspendedAt || null,
          latestScore: latestScoreByStudent[row.id] ?? null
        };
      })
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ error: error.message || "Erreur serveur." });
  }
});

// Suspension temporaire de l'accès fourni par l'école (l'étudiant garde son
// compte, ses données et son siège) ; réactivation en un clic.
app.post("/api/school/students/suspend", async (req, res) => {
  try {
    const userId = coerceString(req.body?.userId);
    if (!requireMatchingSession(req, res, userId)) return;
    await requireSchoolOwner(userId);

    const studentId = coerceString(req.body?.studentId);
    const suspended = Boolean(req.body?.suspended);
    const students = await getSchoolStudentRows(userId);
    const target = students.find((row) => row.id === studentId);
    if (!target) {
      return res.status(404).json({ error: "Étudiant introuvable pour cet établissement." });
    }
    const subscription = parseJsonField(target.subscription_json, {});
    const next = { ...subscription };
    if (suspended) {
      next.licenseSuspended = true;
      next.licenseSuspendedAt = nowIso();
    } else {
      delete next.licenseSuspended;
      delete next.licenseSuspendedAt;
    }
    await db.query("UPDATE users SET subscription_json = $1, updated_at = $2 WHERE id = $3", [JSON.stringify(next), nowIso(), studentId]);
    await logSecurityEvent(req, userId, suspended ? "school_student_suspended" : "school_student_reactivated", { studentId });
    return res.json({ ok: true, suspended });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ error: error.message || "Erreur serveur." });
  }
});

app.post("/api/school/students/remove", async (req, res) => {
  try {
    const userId = coerceString(req.body?.userId);
    if (!requireMatchingSession(req, res, userId)) return;
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
        // Jetons achetés avant la licence rendus (au moins l'offre gratuite).
        credits: Math.max(freePlan?.credits ?? 0, Number(subscription.savedCredits) || 0)
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

app.get("/api/school/students/export", async (req, res) => {
  try {
    const userId = coerceString(req.query?.userId);
    if (!requireMatchingSession(req, res, userId)) return;
    await requireSchoolOwner(userId);
    const students = await getSchoolStudentRows(userId);
    const studentIds = students.map((row) => row.id);
    const promotionByStudent = {};
    if (studentIds.length) {
      const { rows: promoLinks } = await db.query(
        `SELECT sps.student_user_id, sp.name
         FROM school_promotion_students sps
         JOIN school_promotions sp ON sp.id = sps.promotion_id
         WHERE sp.school_user_id = $1 AND sps.student_user_id = ANY($2)`,
        [userId, studentIds]
      );
      for (const row of promoLinks) promotionByStudent[row.student_user_id] = row.name;
    }
    const header = ["prenom", "nom", "email", "promotion", "date_inscription"].join(",");
    const lines = students.map((row) =>
      [row.first_name, row.last_name, row.email, promotionByStudent[row.id] || "", row.created_at]
        .map((value) => `"${String(value || "").replace(/"/g, '""')}"`)
        .join(",")
    );
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", "attachment; filename=\"career-app-etudiants.csv\"");
    return res.send([header, ...lines].join("\n"));
  } catch (error) {
    return res.status(error.statusCode || 500).json({ error: error.message || "Erreur serveur." });
  }
});

app.post("/api/school/students/bulk-invite", async (req, res) => {
  try {
    const userId = coerceString(req.body?.userId);
    if (!requireMatchingSession(req, res, userId)) return;
    const school = await requireSchoolOwner(userId);
    if (orgLicenseExpired(parseJsonField(school.subscription_json, {}))) {
      return res.status(403).json({ error: "Votre licence a expiré : les invitations sont suspendues jusqu'à son renouvellement.", code: "LICENSE_EXPIRED" });
    }

    const rawEmails = Array.isArray(req.body?.emails) ? req.body.emails : [];
    const emails = [...new Set(rawEmails.map((value) => normalizeEmail(coerceString(value))).filter((value) => value.includes("@")))].slice(
      0,
      500
    );
    if (!emails.length) {
      return res.status(400).json({ error: "Aucun email valide fourni." });
    }

    const availability = await getSchoolSeatAvailability(userId);

    const { rows: orgProfileRows } = await db.query(
      "SELECT organization_name FROM user_org_profiles WHERE user_id = $1",
      [userId]
    );
    const organizationName = orgProfileRows[0]?.organization_name || school.first_name;

    // Idempotence : une adresse déjà invitée (invitation en attente) n'est ni
    // réinvitée ni recomptée — réimporter le même fichier ne change rien.
    const { rows: pendingRows } = await db.query(
      "SELECT email FROM school_invitations WHERE school_user_id = $1 AND status = 'pending'",
      [userId]
    );
    const pendingEmails = new Set(pendingRows.map((row) => normalizeEmail(row.email)));

    // skippedExisting : déjà rattachés à cet établissement. Un compte Career CV
    // existant non rattaché est invité (e-mail « activez votre code »).
    const results = { sent: [], invitedExisting: [], skippedExisting: [], skippedPending: [], skippedNoSeat: [], emailFailed: [] };
    for (const email of emails) {
      if (pendingEmails.has(email)) {
        results.skippedPending.push(email);
        continue;
      }
      const existingUser = await getUserRowByAnyEmail(email);
      if (existingUser && availability.codeSet.has(parseJsonField(existingUser.subscription_json, {}).licenseCode)) {
        results.skippedExisting.push(email);
        continue;
      }
      const licenseCode = reserveSchoolSeat(availability);
      if (!licenseCode) {
        results.skippedNoSeat.push(email);
        continue;
      }
      const id = `inv-${crypto.randomUUID()}`;
      await db.query(
        `INSERT INTO school_invitations (id, school_user_id, email, license_code, status, created_at, redeemed_at)
         VALUES ($1,$2,$3,$4,'pending',$5,NULL)`,
        [id, userId, email, licenseCode, nowIso()]
      );
      const message = buildSchoolInvitationEmail({ organizationName, code: licenseCode, email, hasAccount: Boolean(existingUser), siteUrl: APP_URL });
      const mail = await sendAppEmail({ to: email, ...message }).catch(() => ({ sent: false }));
      if (!mail.sent) results.emailFailed.push(email);
      results.sent.push(email);
      if (existingUser) results.invitedExisting.push(email);
      pendingEmails.add(email);
    }

    await logSecurityEvent(req, userId, "school_invitation_bulk_sent", {
      sentCount: results.sent.length,
      skippedExistingCount: results.skippedExisting.length,
      skippedPendingCount: results.skippedPending.length,
      skippedNoSeatCount: results.skippedNoSeat.length
    });

    return res.status(201).json(results);
  } catch (error) {
    return res.status(error.statusCode || 500).json({ error: error.message || "Erreur serveur." });
  }
});
}
