// Sous-groupe de routes extrait de backend/routes/admin.js
// (voir ARCHITECTURE.md). Dépendances lues depuis app.locals.ctx.
export function registerAdminUsersRoutes(app) {
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
    requireAdminModule,
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

app.get("/api/admin/users", async (req, res) => {
  try {
    const adminUserId = coerceString(req.query?.adminUserId);
    if (!requireMatchingSession(req, res, adminUserId)) return;
    await requireAdminModule(adminUserId, "accounts");

    const search = coerceString(req.query?.search).toLowerCase();
    const roleType = coerceString(req.query?.roleType);

    const { rows } = await db.query(
      "SELECT id, first_name, last_name, email, role_type, avatar_data_url, status, created_at, subscription_json, admin_modules_json FROM users ORDER BY created_at DESC LIMIT 300"
    );
    const userIds = rows.map((row) => row.id);
    const [{ rows: cvRows }, { rows: matchRows }, { rows: loginRows }] = await Promise.all([
      userIds.length
        ? db.query("SELECT user_id, COUNT(*)::int AS count FROM cvs WHERE user_id = ANY($1) GROUP BY user_id", [userIds])
        : { rows: [] },
      userIds.length
        ? db.query("SELECT user_id, COUNT(*)::int AS count FROM match_runs WHERE user_id = ANY($1) GROUP BY user_id", [userIds])
        : { rows: [] },
      userIds.length
        ? db.query(
            `SELECT user_id, MAX(created_at) AS last_login
             FROM account_security_events
             WHERE user_id = ANY($1) AND event_type IN ('login_password', 'login_google', 'login_email_code')
             GROUP BY user_id`,
            [userIds]
          )
        : { rows: [] }
    ]);
    const cvCountByUser = Object.fromEntries(cvRows.map((row) => [row.user_id, row.count]));
    const matchCountByUser = Object.fromEntries(matchRows.map((row) => [row.user_id, row.count]));
    const lastLoginByUser = Object.fromEntries(loginRows.map((row) => [row.user_id, row.last_login]));

    // Organisation (écoles / cabinets), école déclarée (candidats) et
    // rattachement via code de licence (candidat lié à une école ou un cabinet).
    const licenseCodeByUser = Object.fromEntries(
      rows
        .map((row) => [row.id, parseJsonField(row.subscription_json, {})?.licenseCode])
        .filter(([, code]) => Boolean(code))
    );
    const usedCodes = [...new Set(Object.values(licenseCodeByUser))];
    const [{ rows: schoolProfileRows }, { rows: agencyProfileRows }, { rows: candidateProfileRows }, { rows: codeRows }] =
      await Promise.all([
        userIds.length
          ? db.query("SELECT user_id, organization_name, website FROM user_org_profiles WHERE user_id = ANY($1)", [userIds])
          : { rows: [] },
        userIds.length
          ? db.query("SELECT user_id, organization_name, website FROM user_recruiter_profiles WHERE user_id = ANY($1)", [userIds])
          : { rows: [] },
        userIds.length
          ? db.query("SELECT user_id, school_name FROM user_candidate_profiles WHERE user_id = ANY($1)", [userIds])
          : { rows: [] },
        usedCodes.length
          ? db.query(
              `SELECT lc.code, lc.owner_user_id, u.role_type, u.first_name, u.last_name, u.email,
                      COALESCE(op.organization_name, rp.organization_name, '') AS organization_name
               FROM license_codes lc
               JOIN users u ON u.id = lc.owner_user_id
               LEFT JOIN user_org_profiles op ON op.user_id = lc.owner_user_id
               LEFT JOIN user_recruiter_profiles rp ON rp.user_id = lc.owner_user_id
               WHERE lc.code = ANY($1)`,
              [usedCodes]
            )
          : { rows: [] }
      ]);
    const orgProfileByUser = Object.fromEntries(
      [...schoolProfileRows, ...agencyProfileRows].map((row) => [row.user_id, row])
    );
    const declaredSchoolByUser = Object.fromEntries(candidateProfileRows.map((row) => [row.user_id, row.school_name || ""]));
    const codeOwnerByCode = Object.fromEntries(codeRows.map((row) => [row.code, row]));

    function affiliationFor(row) {
      const code = licenseCodeByUser[row.id];
      const owner = code ? codeOwnerByCode[code] : null;
      if (!owner || owner.owner_user_id === row.id) return null;
      return {
        type: owner.role_type === "school" ? "school" : "agency",
        organizationName: owner.organization_name || `${owner.first_name || ""} ${owner.last_name || ""}`.trim(),
        contactName: `${owner.first_name || ""} ${owner.last_name || ""}`.trim(),
        contactEmail: owner.email || "",
        licenseCode: code,
        since: parseJsonField(row.subscription_json, {})?.startedAt || null
      };
    }

    const filtered = rows.filter((row) => {
      if (roleType && row.role_type !== roleType) return false;
      if (!search) return true;
      const haystack = `${row.first_name} ${row.last_name} ${row.email}`.toLowerCase();
      return haystack.includes(search);
    });

    return res.json({
      items: filtered.map((row) => {
        const subscription = parseJsonField(row.subscription_json, {});
        return {
          id: row.id,
          firstName: row.first_name,
          lastName: row.last_name,
          email: row.email,
          roleType: row.role_type,
          avatarDataUrl: row.avatar_data_url || "",
          status: row.status || "active",
          planId: subscription.planId || null,
          billingCycle: subscription.billingCycle || null,
          cvCount: cvCountByUser[row.id] || 0,
          matchCount: matchCountByUser[row.id] || 0,
          lastLoginAt: lastLoginByUser[row.id] || "",
          createdAt: row.created_at,
          organizationName: orgProfileByUser[row.id]?.organization_name || "",
          website: orgProfileByUser[row.id]?.website || "",
          declaredSchool: declaredSchoolByUser[row.id] || "",
          affiliation: affiliationFor(row),
          adminModules: row.role_type === "admin" ? sanitizeAdminModules(parseJsonField(row.admin_modules_json, [])) : undefined
        };
      })
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ error: error.message || "Erreur serveur." });
  }
});

app.get("/api/admin/org-accounts", async (req, res) => {
  try {
    const adminUserId = coerceString(req.query?.adminUserId);
    if (!requireMatchingSession(req, res, adminUserId)) return;
    await requireAdminModule(adminUserId, "accounts");

    const roleType = coerceString(req.query?.roleType);
    if (roleType !== "school" && roleType !== "recruiter_firm") {
      return res.status(400).json({ error: "roleType doit être 'school' ou 'recruiter_firm'." });
    }

    const { rows: orgRows } = await db.query(
      "SELECT id, first_name, last_name, email, avatar_data_url, created_at FROM users WHERE role_type = $1 ORDER BY created_at DESC",
      [roleType]
    );
    const { rows: codeRows } = await db.query(
      "SELECT code, owner_user_id, plan_id, seats_total, seats_used FROM license_codes"
    );
    const { rows: memberRows } = await db.query(
      "SELECT id, first_name, last_name, email, role_type, avatar_data_url, created_at, subscription_json FROM users"
    );
    const profileTable = roleType === "school" ? "user_org_profiles" : "user_recruiter_profiles";
    const { rows: profileRows } = await db.query(
      `SELECT user_id, organization_name FROM ${profileTable}`
    );
    const orgNameByUser = Object.fromEntries(profileRows.map((row) => [row.user_id, row.organization_name]));

    const codesByOwner = {};
    for (const code of codeRows) {
      if (!codesByOwner[code.owner_user_id]) codesByOwner[code.owner_user_id] = [];
      codesByOwner[code.owner_user_id].push(code);
    }

    const items = orgRows.map((org) => {
      const orgCodes = codesByOwner[org.id] || [];
      const codeSet = new Set(orgCodes.map((code) => code.code));
      const members = memberRows
        .filter((member) => {
          const subscription = parseJsonField(member.subscription_json, {});
          return subscription.licenseCode && codeSet.has(subscription.licenseCode);
        })
        .map((member) => ({
          id: member.id,
          firstName: member.first_name,
          lastName: member.last_name,
          email: member.email,
          roleType: member.role_type,
          avatarDataUrl: member.avatar_data_url || "",
          createdAt: member.created_at
        }));

      return {
        id: org.id,
        firstName: org.first_name,
        lastName: org.last_name,
        avatarDataUrl: org.avatar_data_url || "",
        organizationName: orgNameByUser[org.id] || "",
        email: org.email,
        createdAt: org.created_at,
        licenseCodes: orgCodes.map((code) => ({
          code: code.code,
          planId: code.plan_id,
          seatsTotal: code.seats_total,
          seatsUsed: code.seats_used
        })),
        members
      };
    });

    return res.json({ items });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ error: error.message || "Erreur serveur." });
  }
});

// ---------------------------------------------------------------------------
// Validation des formulaires admin de création / modification de compte.
// Mêmes règles que le frontend (AdminAccountFormModal.jsx). En cas d'erreur,
// on renvoie `code: "field:<nom>"` pour que l'interface place le message sous
// le bon champ.
// ---------------------------------------------------------------------------
const ACCOUNT_NAME_RE = /^[\p{L}][\p{L}\p{M}' .-]*$/u;
const ACCOUNT_EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const ACCOUNT_WEBSITE_RE = /^(https?:\/\/)?([\p{L}\d-]+\.)+[\p{L}]{2,}(\/\S*)?$/iu;
const PLAN_SEGMENT_BY_ACCOUNT_TYPE = { student: "candidate", candidate: "candidate", school: "school", recruiter_firm: "agency" };

function fieldError(res, field, message) {
  return res.status(400).json({ error: message, code: `field:${field}` });
}

function validatePersonName(value, field, label) {
  if (!value) return { field, message: `${label} est requis.` };
  if (value.length > 60 || !ACCOUNT_NAME_RE.test(value)) {
    return { field, message: `${label} est invalide (lettres, espaces, apostrophes et tirets uniquement).` };
  }
  return null;
}

function validateOrganizationFields(accountType, organizationName, website) {
  if (accountType !== "school" && accountType !== "recruiter_firm") return null;
  if (!organizationName) {
    return { field: "organizationName", message: accountType === "school" ? "Le nom de l'école est requis." : "Le nom du cabinet est requis." };
  }
  if (organizationName.length > 120) return { field: "organizationName", message: "Le nom ne doit pas dépasser 120 caractères." };
  if (website && (website.length > 200 || !ACCOUNT_WEBSITE_RE.test(website))) {
    return { field: "website", message: "Adresse de site web invalide (ex. www.exemple.com)." };
  }
  return null;
}

async function resolvePlanForAccount(planId, accountType, getEffectivePlanById) {
  if (!planId) return { plan: null };
  const plan = await getEffectivePlanById(planId);
  if (!plan) return { error: { field: "planId", message: "Plan inconnu." } };
  const expectedSegment = PLAN_SEGMENT_BY_ACCOUNT_TYPE[accountType];
  if (plan.segment && expectedSegment && plan.segment !== expectedSegment) {
    return { error: { field: "planId", message: "Ce plan ne correspond pas à ce type de compte." } };
  }
  return { plan };
}

function normalizeWebsite(website) {
  if (!website) return "";
  return /^https?:\/\//i.test(website) ? website : `https://${website}`;
}

app.post("/api/admin/users", async (req, res) => {
  try {
    const adminUserId = coerceString(req.body?.adminUserId);
    if (!requireMatchingSession(req, res, adminUserId)) return;
    await requireAdminModule(adminUserId, "accounts");

    requireFields(req.body, ["firstName", "lastName", "email", "password", "accountType"]);
    const firstName = coerceString(req.body.firstName);
    const lastName = coerceString(req.body.lastName);
    const email = normalizeEmail(req.body.email);
    const password = String(req.body.password || "");
    const accountType = sanitizeAccountType(req.body.accountType);
    const planId = coerceString(req.body.planId);
    const billingCycle = coerceString(req.body.billingCycle);
    const organizationName = coerceString(req.body.organizationName);
    const schoolName = coerceString(req.body.schoolName);
    const website = coerceString(req.body.website);
    const adminModules = sanitizeAdminModules(req.body.adminModules);

    if (accountType === "other") {
      return fieldError(res, "accountType", "Type de compte invalide pour une création par l'admin.");
    }
    const nameIssue =
      validatePersonName(firstName, "firstName", "Le prénom") || validatePersonName(lastName, "lastName", "Le nom");
    if (nameIssue) return fieldError(res, nameIssue.field, nameIssue.message);
    if (email.length > 254 || !ACCOUNT_EMAIL_RE.test(email)) {
      return fieldError(res, "email", "Adresse e-mail invalide.");
    }
    if (password.length < 8) {
      return fieldError(res, "password", "Le mot de passe doit contenir au moins 8 caractères.");
    }
    if (password.length > 128) {
      return fieldError(res, "password", "Le mot de passe ne doit pas dépasser 128 caractères.");
    }
    if (!/[a-zA-Z]/.test(password) || !/\d/.test(password)) {
      return fieldError(res, "password", "Le mot de passe doit contenir au moins une lettre et un chiffre.");
    }
    const orgIssue = validateOrganizationFields(accountType, organizationName, website);
    if (orgIssue) return fieldError(res, orgIssue.field, orgIssue.message);
    if (schoolName.length > 120) {
      return fieldError(res, "schoolName", "Le nom de l'établissement ne doit pas dépasser 120 caractères.");
    }
    if (billingCycle && !["monthly", "annual"].includes(billingCycle)) {
      return fieldError(res, "billingCycle", "Périodicité de facturation invalide.");
    }
    // Le plan est vérifié AVANT toute écriture : un plan invalide ne doit
    // jamais laisser un compte à moitié créé.
    const planCheck = accountType === "admin" ? { plan: null } : await resolvePlanForAccount(planId, accountType, getEffectivePlanById);
    if (planCheck.error) return fieldError(res, planCheck.error.field, planCheck.error.message);

    const existingUser = await getUserRowByAnyEmail(email);
    if (existingUser) {
      return res.status(409).json({ error: "Un compte existe déjà avec cette adresse e-mail.", code: "field:email" });
    }

    const id = `usr-${crypto.randomUUID()}`;
    const createdAt = nowIso();
    const passwordRecord = createPasswordRecord(password);
    const username = await buildUniqueUsername(firstName, lastName, email);
    const detailsByType = {
      school: { organizationName, website: normalizeWebsite(website) },
      recruiter_firm: { organizationName, website: normalizeWebsite(website) },
      student: { schoolName },
      candidate: { schoolName }
    };
    const onboardingPayload = sanitizeOnboardingPayload(accountType, { details: detailsByType[accountType] || {} });
    const seededProfile = applyOnboardingToProfile(
      { ...DEFAULT_PROFILE },
      onboardingPayload.accountType,
      onboardingPayload.details
    );

    await db.query(
      `INSERT INTO users (
        id, first_name, last_name, email, username, password_hash, password_salt, created_at,
        updated_at, role_type, avatar_data_url, profile_json, subscription_json, admin_modules_json, email_verified_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
      [
        id,
        firstName,
        lastName,
        email,
        username,
        passwordRecord.hash,
        passwordRecord.salt,
        createdAt,
        createdAt,
        onboardingPayload.accountType,
        "",
        JSON.stringify(seededProfile),
        JSON.stringify({ plan: "free", status: "active", startedAt: createdAt, renewalAt: null }),
        JSON.stringify(adminModules),
        // Compte créé par un administrateur : l'adresse est considérée comme
        // vérifiée (l'admin l'a saisie et remet les accès à la personne).
        createdAt
      ]
    );

    if (accountType !== "admin") {
      await upsertUserAccount(id, onboardingPayload.accountType, onboardingPayload.base, "");
      await upsertRoleDetails(id, onboardingPayload.accountType, onboardingPayload.details);
    }
    await db.query(
      `INSERT INTO user_email_addresses (id, user_id, email, is_primary, is_verified, created_at, updated_at)
       VALUES ($1,$2,$3,1,1,$4,$5)`,
      [`eml-${crypto.randomUUID()}`, id, email, createdAt, createdAt]
    );

    let licenseCode = null;
    if (planCheck.plan) {
      const plan = planCheck.plan;
      await applyPlanToUser(id, plan, billingCycle || "monthly", null, null, "admin_created");
      if (plan.seats) {
        licenseCode = await generateLicenseCodeForPlan(id, plan);
      }
    }

    return res.status(201).json({ user: await getPublicUserById(id), licenseCode });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ error: error.message || "Erreur serveur." });
  }
});

app.post("/api/admin/users/update", async (req, res) => {
  try {
    const adminUserId = coerceString(req.body?.adminUserId);
    if (!requireMatchingSession(req, res, adminUserId)) return;
    await requireAdminModule(adminUserId, "accounts");

    const targetUserId = coerceString(req.body?.userId);
    const target = await getUserRowById(targetUserId);
    if (!target) {
      return res.status(404).json({ error: "Utilisateur introuvable." });
    }
    const firstName = coerceString(req.body?.firstName) || target.first_name;
    const lastName = coerceString(req.body?.lastName) || target.last_name;
    const updateNameIssue =
      validatePersonName(firstName, "firstName", "Le prénom") || validatePersonName(lastName, "lastName", "Le nom");
    if (updateNameIssue) return fieldError(res, updateNameIssue.field, updateNameIssue.message);

    if (target.role_type === "admin") {
      const adminModules = sanitizeAdminModules(req.body?.adminModules);
      await db.query(
        "UPDATE users SET first_name = $1, last_name = $2, admin_modules_json = $3, updated_at = $4 WHERE id = $5",
        [firstName, lastName, JSON.stringify(adminModules), nowIso(), targetUserId]
      );
      await logSecurityEvent(req, adminUserId, "admin_user_updated", { targetUserId });
      return res.json({ user: await getPublicUserById(targetUserId) });
    }

    const organizationName = coerceString(req.body?.organizationName);
    const website = coerceString(req.body?.website);
    const planId = coerceString(req.body?.planId);
    const billingCycle = coerceString(req.body?.billingCycle);

    if (target.role_type === "school" || target.role_type === "recruiter_firm") {
      const updateOrgIssue = validateOrganizationFields(target.role_type, organizationName, website);
      if (updateOrgIssue) return fieldError(res, updateOrgIssue.field, updateOrgIssue.message);
    }
    if (billingCycle && !["monthly", "annual"].includes(billingCycle)) {
      return fieldError(res, "billingCycle", "Périodicité de facturation invalide.");
    }
    const updatePlanCheck = await resolvePlanForAccount(planId, target.role_type, getEffectivePlanById);
    if (updatePlanCheck.error) return fieldError(res, updatePlanCheck.error.field, updatePlanCheck.error.message);

    await db.query("UPDATE users SET first_name = $1, last_name = $2, updated_at = $3 WHERE id = $4", [
      firstName,
      lastName,
      nowIso(),
      targetUserId
    ]);

    if (organizationName && (target.role_type === "school" || target.role_type === "recruiter_firm")) {
      const table = target.role_type === "school" ? "user_org_profiles" : "user_recruiter_profiles";
      await db.query(`UPDATE ${table} SET organization_name = $1, website = $2, updated_at = $3 WHERE user_id = $4`, [
        organizationName,
        normalizeWebsite(website),
        nowIso(),
        targetUserId
      ]);
    }

    if (updatePlanCheck.plan) {
      await applyPlanToUser(targetUserId, updatePlanCheck.plan, billingCycle || "monthly", null, null, "admin_created");
    }

    await logSecurityEvent(req, adminUserId, "admin_user_updated", { targetUserId });
    return res.json({ user: await getPublicUserById(targetUserId) });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ error: error.message || "Erreur serveur." });
  }
});

app.post("/api/admin/users/status", async (req, res) => {
  try {
    const adminUserId = coerceString(req.body?.adminUserId);
    if (!requireMatchingSession(req, res, adminUserId)) return;
    await requireAdminModule(adminUserId, "accounts");

    const targetUserId = coerceString(req.body?.userId);
    const status = coerceString(req.body?.status) === "suspended" ? "suspended" : "active";
    const target = await getUserRowById(targetUserId);
    if (!target) {
      return res.status(404).json({ error: "Utilisateur introuvable." });
    }
    if (target.role_type === "admin") {
      return res.status(403).json({ error: "Le statut d'un administrateur ne peut pas être changé ici." });
    }

    await db.query("UPDATE users SET status = $1, updated_at = $2 WHERE id = $3", [status, nowIso(), targetUserId]);
    if (status === "suspended") {
      await db.query("DELETE FROM sessions WHERE user_id = $1", [targetUserId]);
    }
    await logSecurityEvent(req, adminUserId, status === "suspended" ? "admin_user_suspended" : "admin_user_reactivated", {
      targetUserId,
      email: target.email
    });
    return res.json({ ok: true });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ error: error.message || "Erreur serveur." });
  }
});

app.post("/api/admin/users/delete", async (req, res) => {
  try {
    const adminUserId = coerceString(req.body?.adminUserId);
    if (!requireMatchingSession(req, res, adminUserId)) return;
    await requireAdminModule(adminUserId, "accounts");

    const targetUserId = coerceString(req.body?.userId);
    const confirmation = coerceString(req.body?.confirmation);

    const target = await getUserRowById(targetUserId);
    if (!target) {
      return res.status(404).json({ error: "Utilisateur introuvable." });
    }
    if (target.role_type === "admin") {
      return res.status(403).json({ error: "Impossible de supprimer un compte administrateur." });
    }
    if (confirmation !== target.email) {
      return res.status(400).json({ error: "Confirmation invalide : saisis exactement l'email du compte à supprimer." });
    }

    await logSecurityEvent(req, adminUserId, "admin_user_deleted", { targetUserId, email: target.email });
    await db.query("DELETE FROM sessions WHERE user_id = $1", [targetUserId]);
    await db.query("DELETE FROM email_verification_codes WHERE user_id = $1", [targetUserId]);
    await db.query("DELETE FROM user_email_addresses WHERE user_id = $1", [targetUserId]);
    await db.query("DELETE FROM cvs WHERE user_id = $1", [targetUserId]);
    await db.query("DELETE FROM match_runs WHERE user_id = $1", [targetUserId]);
    await db.query("DELETE FROM match_feedback WHERE user_id = $1", [targetUserId]);
    await db.query("DELETE FROM negotiation_conversations WHERE user_id = $1", [targetUserId]);
    await db.query("DELETE FROM cover_letters WHERE user_id = $1", [targetUserId]);
    await db.query("DELETE FROM user_candidate_profiles WHERE user_id = $1", [targetUserId]);
    await db.query("DELETE FROM user_recruiter_profiles WHERE user_id = $1", [targetUserId]);
    await db.query("DELETE FROM user_org_profiles WHERE user_id = $1", [targetUserId]);
    await db.query("DELETE FROM user_accounts WHERE user_id = $1", [targetUserId]);
    await db.query("DELETE FROM license_codes WHERE owner_user_id = $1", [targetUserId]);
    await db.query("DELETE FROM users WHERE id = $1", [targetUserId]);

    return res.json({ ok: true });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ error: error.message || "Erreur serveur." });
  }
});
}
