// Routes billing — extrait automatiquement de backend/index.js (voir
// ARCHITECTURE.md). Toutes les dépendances (db, helpers, constantes) sont
// lues depuis app.locals.ctx, rempli une fois dans index.js après
// l'initialisation complète (DB ouverte, helpers définis).
export function registerBillingRoutes(app) {
  const {
    requireMatchingSession,
    claimStripeEventOnce,
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

app.get("/api/billing/transactions", async (req, res) => {
  try {
    const userId = coerceString(req.query?.userId);
    if (!requireMatchingSession(req, res, userId)) return;

    const { rows } = await db.query(
      `SELECT id, plan_id, billing_cycle, listed_amount, amount_collected, currency, source,
              license_code, refunded, refunded_at, created_at
       FROM transactions WHERE user_id = $1 ORDER BY created_at DESC`,
      [userId]
    );
    const transactions = rows.map((row) => {
      const plan = PLANS.find((item) => item.id === row.plan_id) || null;
      return {
        id: row.id,
        planId: row.plan_id,
        planName: plan ? plan.name.fr : row.plan_id,
        billingCycle: row.billing_cycle,
        listedAmount: Number(row.listed_amount),
        amountCollected: Number(row.amount_collected),
        currency: row.currency,
        source: row.source,
        licenseCode: row.license_code,
        refunded: Boolean(row.refunded),
        refundedAt: row.refunded_at,
        createdAt: row.created_at
      };
    });
    return res.json({ transactions });
  } catch (error) {
    console.error("Erreur lecture historique de paiement:", error);
    return res.status(500).json({ error: "Impossible de charger l'historique de paiement." });
  }
});

app.post("/api/stripe/create-checkout-session", async (req, res) => {
  try {
    if (!stripe) {
      return res.status(503).json({ error: "Paiement Stripe non configuré côté serveur." });
    }
    if (!getPlatformSettingBool("stripe_enabled")) {
      return res.status(503).json({ error: "Le paiement Stripe est temporairement désactivé." });
    }

    const userId = coerceString(req.body?.userId);
    if (!requireMatchingSession(req, res, userId)) return;
    const planId = coerceString(req.body?.planId);
    const billingCycle = coerceString(req.body?.billingCycle) === "annual" ? "annual" : "monthly";

    const user = await getUserRowById(userId);
    if (!user) {
      return res.status(404).json({ error: "Utilisateur introuvable." });
    }

    const plan = await getEffectivePlanById(planId);
    if (!plan || !plan.grantsPremium) {
      return res.status(400).json({ error: "Ce plan ne nécessite pas de paiement Stripe." });
    }

    // Un admin a pu changer le tarif depuis Tarifs > Modifier, ce qui crée un
    // nouveau Price Stripe (les Price sont immuables) et l'enregistre ici.
    // Cette valeur prime sur le price_id figé dans .env.
    const { rows: overrideRows } = await db.query(
      "SELECT stripe_price_id_monthly, stripe_price_id_annual FROM plan_overrides WHERE plan_id = $1",
      [planId]
    );
    const overrideRow = overrideRows[0];
    const overridePriceId = overrideRow
      ? plan.monthlyPrice == null
        ? overrideRow.stripe_price_id_annual
        : billingCycle === "annual"
        ? overrideRow.stripe_price_id_annual
        : overrideRow.stripe_price_id_monthly
      : null;

    const priceEnvVar = resolveStripePriceEnvVar(plan, billingCycle);
    const priceId = overridePriceId || String(process.env[priceEnvVar] || "").trim();
    if (!priceId) {
      return res.status(500).json({ error: `${priceEnvVar} manquant dans .env pour ce plan.` });
    }

    // Seul school_license est tarifé "par étudiant" : la quantité vient du
    // formulaire (nombre d'étudiants), avec le minimum de sièges du plan comme
    // plancher. Pour tous les autres plans, un seul exemplaire du bundle est
    // vendu (ignorer toute quantité fournie par le client évite un montant
    // gonflé accidentellement pour un plan à prix fixe).
    const requestedQuantity = Math.round(Number(req.body?.quantity) || 1);
    const quantity = plan.id === "school_license" ? Math.max(plan.seats || 1, requestedQuantity) : 1;

    const subscription = parseJsonField(user.subscription_json, {});
    const params = buildCheckoutSessionParams({
      userId,
      userEmail: user.email,
      subscription,
      priceId,
      mode: resolveStripeMode(plan),
      planId: plan.id,
      billingCycle,
      successUrl: `${APP_URL}/#/app/tarifs?stripe=success&session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${APP_URL}/#/app/tarifs?stripe=cancel`,
      quantity
    });

    // Clé d'idempotence Stripe : un double-clic ou un retry réseau du front
    // sur la même minute pour le même utilisateur/plan réutilise la même
    // session au lieu d'en créer une seconde. Passée la fenêtre d'une
    // minute, un nouvel achat du même plan crée bien une nouvelle session.
    const idempotencyKey = `checkout:${userId}:${planId}:${billingCycle}:${quantity}:${Math.floor(Date.now() / 60000)}`;
    const session = await stripe.checkout.sessions.create(params, { idempotencyKey });
    return res.json({ url: session.url });
  } catch (error) {
    console.error("Erreur création session Stripe Checkout:", error);
    return res.status(500).json({ error: error.message || "Impossible de créer la session de paiement." });
  }
});

// Filet de sécurité pour le retour de Stripe Checkout : le webhook
// /api/stripe/webhook active normalement le plan de façon asynchrone, mais en
// local (pas d'URL publique joignable par Stripe sans `stripe listen`) ou en
// cas de retard du webhook, l'utilisateur reviendrait sur "success" sans que
// son plan soit activé. On revérifie donc ici directement auprès de Stripe
// avec le session_id renvoyé dans l'URL de succès, et on applique la même
// logique d'activation que le webhook si le paiement est bien confirmé.
app.post("/api/stripe/confirm-checkout-session", async (req, res) => {
  try {
    if (!stripe) {
      return res.status(503).json({ error: "Paiement Stripe non configuré côté serveur." });
    }
    const userId = coerceString(req.body?.userId);
    if (!requireMatchingSession(req, res, userId)) return;
    const sessionId = coerceString(req.body?.sessionId);
    if (!sessionId) {
      return res.status(400).json({ error: "sessionId manquant." });
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.client_reference_id !== userId) {
      return res.status(403).json({ error: "Cette session de paiement ne correspond pas à cet utilisateur." });
    }
    if (session.payment_status !== "paid" && session.status !== "complete") {
      return res.json({ handled: false, reason: "not_paid" });
    }

    // Même protection anti-doublon que le webhook (même id de réclamation
    // "session:<id>") : si le webhook a déjà traité cette session avant que
    // ce filet de secours ne s'exécute (ou l'inverse), on ne l'applique
    // qu'une fois.
    const isNewSession = await claimStripeEventOnce(`session:${session.id}`);
    if (!isNewSession) {
      return res.json({ handled: false, reason: "already_processed" });
    }

    const result = await applyStripeWebhookEvent(
      { type: "checkout.session.completed", data: { object: session } },
      { db, parseJsonField, getPlanById: getEffectivePlanById, applyPlanToUser, generateLicenseCodeForPlan }
    );
    return res.json(result);
  } catch (error) {
    console.error("Erreur confirmation session Stripe Checkout:", error);
    return res.status(500).json({ error: error.message || "Impossible de confirmer le paiement." });
  }
});

app.post("/api/plans/activate", async (req, res) => {
  try {
    const userId = coerceString(req.body?.userId);
    if (!requireMatchingSession(req, res, userId)) return;
    const planId = coerceString(req.body?.planId);
    const billingCycle = coerceString(req.body?.billingCycle);

    if (!userId || !planId) {
      return res.status(400).json({ error: "userId et planId requis." });
    }

    const user = await getUserRowById(userId);
    if (!user) {
      return res.status(404).json({ error: "Utilisateur introuvable." });
    }

    const plan = await getEffectivePlanById(planId);
    if (!plan) {
      return res.status(400).json({ error: "Plan inconnu." });
    }

    await applyPlanToUser(userId, plan, billingCycle, null, null, "instant");

    const licenseCode = plan.seats ? await generateLicenseCodeForPlan(userId, plan) : null;

    const updatedUser = await getUserRowById(userId);
    const premium = await computePremiumAccess(updatedUser);
    return res.json({ user: await getPublicUserById(userId), premium, licenseCode });
  } catch (error) {
    return res.status(500).json({ error: error.message || "Erreur serveur." });
  }
});

app.post("/api/plans/redeem", async (req, res) => {
  try {
    const userId = coerceString(req.body?.userId);
    if (!requireMatchingSession(req, res, userId)) return;
    const code = coerceString(req.body?.code).toUpperCase();

    if (!userId || !code) {
      return res.status(400).json({ error: "userId et code requis." });
    }

    const user = await getUserRowById(userId);
    if (!user) {
      return res.status(404).json({ error: "Utilisateur introuvable." });
    }

    const { rows: codeRows } = await db.query("SELECT * FROM license_codes WHERE code = $1", [code]);
    const licenseRow = codeRows[0];
    if (!licenseRow) {
      return res.status(404).json({ error: "Code de licence introuvable." });
    }

    if (Number(licenseRow.revoked)) {
      return res.status(410).json({ error: "Ce code de licence a été révoqué." });
    }

    const plan = await getEffectivePlanById(licenseRow.plan_id);
    if (!plan) {
      return res.status(400).json({ error: "Plan associé au code introuvable." });
    }

    const currentSubscription = parseJsonField(user.subscription_json, {});
    const alreadyRedeemed = currentSubscription.licenseCode === code;

    if (!alreadyRedeemed) {
      if (Number(licenseRow.seats_used) >= Number(licenseRow.seats_total)) {
        return res.status(409).json({ error: "Ce code de licence a atteint son nombre maximum d'utilisateurs." });
      }
      await db.query("UPDATE license_codes SET seats_used = seats_used + 1 WHERE code = $1", [code]);
      await applyPlanToUser(userId, plan, null, code, null, "license_redeem");
      await db.query(
        "UPDATE school_invitations SET status = 'redeemed', redeemed_at = $1 WHERE license_code = $2 AND email = $3 AND status = 'pending'",
        [nowIso(), code, normalizeEmail(user.email)]
      );
    }

    const updatedUser = await getUserRowById(userId);
    const premium = await computePremiumAccess(updatedUser);
    return res.json({ user: await getPublicUserById(userId), premium });
  } catch (error) {
    return res.status(500).json({ error: error.message || "Erreur serveur." });
  }
});

app.get("/api/plans/overrides", async (_req, res) => {
  try {
    const { rows } = await db.query("SELECT plan_id, monthly_price, annual_price FROM plan_overrides");
    const overrides = {};
    for (const row of rows) {
      overrides[row.plan_id] = {
        monthlyPrice: row.monthly_price != null ? Number(row.monthly_price) : null,
        annualPrice: row.annual_price != null ? Number(row.annual_price) : null
      };
    }
    return res.json({ overrides });
  } catch (_error) {
    return res.json({ overrides: {} });
  }
});
}
