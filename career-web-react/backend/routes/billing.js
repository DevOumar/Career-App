// Routes billing — extrait automatiquement de backend/index.js (voir
// ARCHITECTURE.md). Toutes les dépendances (db, helpers, constantes) sont
// lues depuis app.locals.ctx, rempli une fois dans index.js après
// l'initialisation complète (DB ouverte, helpers définis).
export function registerBillingRoutes(app) {
  const {
    requireMatchingSession,
    claimStripeEventOnce,
    releaseStripeEventClaim,
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

    // Filtres : statut (paid / free / refunded), plan, et période (dates
    // ISO). Tous optionnels — sans filtre, on retourne tout l'historique
    // paginé par date décroissante.
    const statusFilter = coerceString(req.query?.status); // "paid" | "free" | "refunded"
    const planFilter = coerceString(req.query?.planId);
    const fromDate = coerceString(req.query?.from);
    const toDate = coerceString(req.query?.to);
    const page = Math.max(1, Math.round(Number(req.query?.page) || 1));
    const pageSize = Math.min(50, Math.max(1, Math.round(Number(req.query?.pageSize) || 10)));

    const conditions = ["user_id = $1"];
    const params = [userId];

    if (planFilter) {
      params.push(planFilter);
      conditions.push(`plan_id = $${params.length}`);
    }
    if (fromDate) {
      params.push(fromDate);
      conditions.push(`created_at >= $${params.length}`);
    }
    if (toDate) {
      params.push(toDate);
      conditions.push(`created_at <= $${params.length}`);
    }
    if (statusFilter === "refunded") {
      conditions.push("refunded = 1");
    } else if (statusFilter === "paid") {
      conditions.push("refunded = 0 AND amount_collected > 0");
    } else if (statusFilter === "free") {
      conditions.push("refunded = 0 AND amount_collected = 0");
    }

    const whereClause = conditions.join(" AND ");
    const { rows: countRows } = await db.query(
      `SELECT COUNT(*)::int AS total FROM transactions WHERE ${whereClause}`,
      params
    );
    const total = countRows[0]?.total || 0;

    params.push(pageSize, (page - 1) * pageSize);
    const { rows } = await db.query(
      `SELECT id, plan_id, billing_cycle, listed_amount, amount_collected, currency, source,
              license_code, refunded, refunded_at, created_at
       FROM transactions WHERE ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );
    const transactions = rows.map((row) => {
      const plan = getPlanById(row.plan_id);
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
    return res.json({ transactions, total, page, pageSize });
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

    if (plan.contactSalesOnly) {
      return res.status(400).json({ error: "Ce plan nécessite un contrat négocié : contactez-nous plutôt que de payer via Stripe." });
    }

    // Les plans école/cabinet tarifés "par étudiant" (pricedPerSeat) : la
    // quantité vient du formulaire (nombre d'étudiants), avec le minimum de
    // sièges du plan comme plancher et sa borne haute (seatsMax) comme
    // plafond — un établissement qui dépasse le palier doit passer au
    // palier supérieur, pas acheter un volume hors palier au mauvais prix.
    // Pour tous les autres plans, un seul exemplaire du bundle est vendu
    // (ignorer toute quantité fournie par le client évite un montant gonflé
    // accidentellement pour un plan à prix fixe).
    const requestedQuantity = Math.round(Number(req.body?.quantity) || 1);
    let quantity = 1;
    if (plan.pricedPerSeat) {
      quantity = Math.max(plan.seats || 1, requestedQuantity);
      if (plan.seatsMax && quantity > plan.seatsMax) {
        return res.status(400).json({
          error: `Ce palier est limité à ${plan.seatsMax} étudiants. Choisissez le palier supérieur pour un volume plus important.`
        });
      }
    }

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
    // La clé envoyée par le front (une par tentative d'achat, réutilisée en
    // cas de retry) prime ; à défaut, fenêtre d'une minute.
    const clientKey = coerceString(req.headers["idempotency-key"]).trim();
    const idempotencyKey = clientKey
      ? `checkout:${userId}:${clientKey}`
      : `checkout:${userId}:${planId}:${billingCycle}:${quantity}:${Math.floor(Date.now() / 60000)}`;
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

    let result;
    try {
      result = await applyStripeWebhookEvent(
        { type: "checkout.session.completed", data: { object: session } },
        { db, parseJsonField, getPlanById: getEffectivePlanById, applyPlanToUser, generateLicenseCodeForPlan }
      );
    } catch (applyError) {
      await releaseStripeEventClaim(`session:${session.id}`);
      throw applyError;
    }
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

    // Un plan payant ne s'obtient QUE par un paiement confirmé (Stripe) ou un
    // code de licence. Cette route ne sert qu'aux plans gratuits — sauf en
    // développement local, si ALLOW_UNPAID_PLAN_ACTIVATION=1.
    if (plan.grantsPremium && process.env.ALLOW_UNPAID_PLAN_ACTIVATION !== "1") {
      return res.status(402).json({
        error: "Ce plan est payant : l'activation passe par le paiement sécurisé.",
        code: "PAYMENT_REQUIRED"
      });
    }

    // Idempotent : réactiver le plan déjà actif ne change rien (pas de
    // jetons recrédités, pas de nouvelle date de début).
    const currentSubscription = parseJsonField(user.subscription_json, {});
    if (currentSubscription.planId === plan.id && currentSubscription.status === "active") {
      const premium = await computePremiumAccess(user);
      return res.json({ user: await getPublicUserById(userId), premium, licenseCode: null, alreadyActive: true });
    }

    await applyPlanToUser(userId, plan, billingCycle, null, null, "instant");

    const licenseCode = plan.seats ? await generateLicenseCodeForPlan(userId, plan) : null;

    const updatedUser = await getUserRowById(userId);
    const premium = await computePremiumAccess(updatedUser);
    return res.json({ user: await getPublicUserById(userId), premium, licenseCode });
  } catch (error) {
    if (error.code === "DOWNGRADE_BLOCKED") {
      return res.status(409).json({ error: error.message });
    }
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
    // L'utilisateur est déjà rattaché à UN AUTRE code de licence (école ou
    // cabinet différent, ou renouvellement avec un nouveau code) : on ne
    // bloque pas ce cas (transfert d'établissement légitime), mais le front
    // doit le confirmer explicitement avant d'écraser l'accès actuel — voir
    // requiresConfirmation ci-dessous.
    const switchingFromAnotherLicense = Boolean(currentSubscription.licenseCode) && !alreadyRedeemed;
    const confirmed = Boolean(req.body?.confirmSwitch);

    if (switchingFromAnotherLicense && !confirmed) {
      // Le code n'est jamais renvoyé en clair, même dans cette réponse de
      // confirmation destinée au propriétaire du compte — juste de quoi
      // reconnaître visuellement "c'est bien mon ancienne licence".
      const rawCode = String(currentSubscription.licenseCode || "");
      return res.json({
        requiresConfirmation: true,
        currentLicenseCodeMasked: rawCode ? `••••-${rawCode.slice(-4)}` : "",
        newPlanName: plan.name?.fr || plan.id
      });
    }

    if (!alreadyRedeemed) {
      if (Number(licenseRow.seats_used) >= Number(licenseRow.seats_total)) {
        return res.status(409).json({ error: "Ce code de licence a atteint son nombre maximum d'utilisateurs." });
      }
      if (switchingFromAnotherLicense) {
        // Libère le siège occupé sur l'ancien code — sans ça, l'ancien
        // établissement facture/compte un siège pour un étudiant qui n'y
        // est plus rattaché.
        await db.query(
          "UPDATE license_codes SET seats_used = GREATEST(0, seats_used - 1) WHERE code = $1",
          [currentSubscription.licenseCode]
        );
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
