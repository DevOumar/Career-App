// Sous-groupe de routes extrait de backend/routes/cabinet.js
// (voir ARCHITECTURE.md). Dépendances lues depuis app.locals.ctx.
export function registerCabinetInvitationsRoutes(app) {
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
    resolveAccountSegments
  } = app.locals.ctx;

app.get("/api/cabinet/invitations", async (req, res) => {
  try {
    const userId = coerceString(req.query?.userId);
    if (!requireMatchingSession(req, res, userId)) return;
    const cabinet = await requireCabinetOwner(userId);

    const { rows } = await db.query(
      "SELECT * FROM cabinet_invitations WHERE cabinet_user_id = $1 ORDER BY created_at DESC LIMIT 300",
      [cabinet.cabinetRootId]
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

async function sendCabinetInvitationEmail({ transporter, organizationName, code, email }) {
  const safeOrg = escapeHtml(organizationName || "Votre organisation");
  const safeCode = escapeHtml(code);
  const html = `<!doctype html>
<html lang="fr">
  <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Invitation Career CV</title></head>
  <body style="margin:0;background:#f6f2ec;font-family:Arial,Helvetica,sans-serif;color:#171317;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f6f2ec;padding:34px 12px;">
      <tr><td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:590px;background:#ffffff;border:1px solid #eadfd3;border-radius:24px;overflow:hidden;box-shadow:0 18px 45px rgba(92,26,6,0.10);">
          <tr><td style="padding:28px 30px 22px;background:linear-gradient(135deg,#5c1a06 0%,#b83309 100%);">
            <div style="display:inline-block;width:42px;height:42px;border-radius:14px;background:#ffffff;color:#b83309;text-align:center;line-height:42px;font-size:22px;font-weight:900;vertical-align:middle;">CV</div>
            <span style="display:inline-block;margin-left:12px;font-size:20px;font-weight:800;color:#ffffff;vertical-align:middle;">Career CV</span>
          </td></tr>
          <tr><td style="padding:30px 30px 8px;">
            <p style="margin:0 0 8px;color:#7b6d63;font-size:14px;">Bonjour,</p>
            <h1 style="margin:0;font-size:27px;line-height:1.2;color:#171317;">Invitation cabinet</h1>
            <p style="margin:13px 0 0;color:#5f5651;font-size:16px;line-height:1.65;"><strong>${safeOrg}</strong> vous invite a rejoindre Career CV pour evaluer des candidats avec l'aide de l'IA.</p>
          </td></tr>
          <tr><td style="padding:24px 30px;">
            <div style="background:#fff7f0;border:1px solid #f0d7c7;border-radius:18px;padding:22px;text-align:center;">
              <p style="margin:0 0 12px;color:#9a4318;font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:.13em;">Code de licence</p>
              <div style="font-size:28px;line-height:1.2;font-weight:900;letter-spacing:2px;color:#171317;">${safeCode}</div>
            </div>
          </td></tr>
          <tr><td style="padding:0 30px 30px;color:#5f5651;font-size:15px;line-height:1.65;">
            Creez votre compte recruteur, puis renseignez ce code depuis la page Tarifs pour activer votre acces gratuitement.
          </td></tr>
          <tr><td style="padding:18px 30px;background:#fbf8f4;border-top:1px solid #eadfd3;color:#7b6d63;font-size:12px;line-height:1.5;">&copy; ${new Date().getFullYear()} Career CV. Email automatique envoye par noreply@careercv.fr.</td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;
  const text = `Bonjour,\n\n${organizationName} vous invite a rejoindre Career CV.\nVotre code de licence : ${code}\nCreez votre compte puis renseignez ce code depuis la page Tarifs.\n\nL'equipe Career CV`;
  const recipient = AUTH_EMAIL_TO || email;
  try {
    await transporter.sendMail({ from: MAIL_FROM, to: recipient, subject: "Invitation Career CV", html, text });
  } catch (_error) {
    // L'invitation reste enregistree meme si l'envoi echoue.
  }
}
app.post("/api/cabinet/invitations/send", async (req, res) => {
  try {
    const userId = coerceString(req.body?.userId);
    if (!requireMatchingSession(req, res, userId)) return;
    const cabinet = await requireCabinetOwner(userId);
    requireCabinetOwnerRole(cabinet);

    const email = normalizeEmail(req.body?.email);
    if (!email.includes("@")) {
      return res.status(400).json({ error: "Email invalide." });
    }

    const codeRows = await getCabinetLicenseCodeRows(cabinet.cabinetRootId);
    const activeCode = codeRows.find((row) => !Number(row.revoked) && Number(row.seats_used) < Number(row.seats_total));
    if (!activeCode) {
      return res.status(400).json({ error: "Aucun siège disponible sur votre licence." });
    }

    const existingUser = await getUserRowByAnyEmail(email);
    if (existingUser) {
      return res.status(409).json({ error: "Un compte existe déjà avec cet email." });
    }

    const { rows: orgProfileRows } = await db.query(
      "SELECT organization_name FROM user_recruiter_profiles WHERE user_id = $1",
      [cabinet.cabinetRootId]
    );
    const organizationName = orgProfileRows[0]?.organization_name || cabinet.first_name;

    const id = `cinv-${crypto.randomUUID()}`;
    await db.query(
      `INSERT INTO cabinet_invitations (id, cabinet_user_id, email, license_code, status, created_at, redeemed_at)
       VALUES ($1,$2,$3,$4,'pending',$5,NULL)`,
      [id, cabinet.cabinetRootId, email, activeCode.code, nowIso()]
    );

    const transporter = getMailTransporter();
    if (transporter) {
      await sendCabinetInvitationEmail({ transporter, organizationName, code: activeCode.code, email });
    }

    await logSecurityEvent(req, userId, "cabinet_invitation_sent", { email, licenseCode: activeCode.code });
    return res.status(201).json({ ok: true, licenseCode: activeCode.code });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ error: error.message || "Erreur serveur." });
  }
});

app.post("/api/cabinet/recruiters/bulk-invite", async (req, res) => {
  try {
    const userId = coerceString(req.body?.userId);
    if (!requireMatchingSession(req, res, userId)) return;
    const cabinet = await requireCabinetOwner(userId);
    requireCabinetOwnerRole(cabinet);

    const rawEmails = Array.isArray(req.body?.emails) ? req.body.emails : [];
    const emails = [...new Set(rawEmails.map((value) => normalizeEmail(coerceString(value))).filter((value) => value.includes("@")))].slice(
      0,
      500
    );
    if (!emails.length) {
      return res.status(400).json({ error: "Aucun email valide fourni." });
    }

    const codeRows = await getCabinetLicenseCodeRows(cabinet.cabinetRootId);
    let activeCode = codeRows.find((row) => !Number(row.revoked) && Number(row.seats_used) < Number(row.seats_total));

    const { rows: orgProfileRows } = await db.query(
      "SELECT organization_name FROM user_recruiter_profiles WHERE user_id = $1",
      [cabinet.cabinetRootId]
    );
    const organizationName = orgProfileRows[0]?.organization_name || cabinet.first_name;
    const transporter = getMailTransporter();

    // Idempotence : une adresse déjà invitée (invitation en attente) n'est ni
    // réinvitée ni recomptée — réimporter le même fichier ne change rien.
    const { rows: pendingRows } = await db.query(
      "SELECT email FROM cabinet_invitations WHERE cabinet_user_id = $1 AND status = 'pending'",
      [cabinet.cabinetRootId]
    );
    const pendingEmails = new Set(pendingRows.map((row) => normalizeEmail(row.email)));

    const results = { sent: [], skippedExisting: [], skippedPending: [], skippedNoSeat: [] };
    for (const email of emails) {
      if (pendingEmails.has(email)) {
        results.skippedPending.push(email);
        continue;
      }
      if (!activeCode || Number(activeCode.seats_used) >= Number(activeCode.seats_total)) {
        results.skippedNoSeat.push(email);
        continue;
      }
      const existingUser = await getUserRowByAnyEmail(email);
      if (existingUser) {
        results.skippedExisting.push(email);
        continue;
      }
      const id = `cinv-${crypto.randomUUID()}`;
      await db.query(
        `INSERT INTO cabinet_invitations (id, cabinet_user_id, email, license_code, status, created_at, redeemed_at)
         VALUES ($1,$2,$3,$4,'pending',$5,NULL)`,
        [id, cabinet.cabinetRootId, email, activeCode.code, nowIso()]
      );
      if (transporter) {
        await sendCabinetInvitationEmail({ transporter, organizationName, code: activeCode.code, email });
      }
      results.sent.push(email);
      activeCode = { ...activeCode, seats_used: Number(activeCode.seats_used) + 1 };
    }

    await logSecurityEvent(req, userId, "cabinet_invitation_bulk_sent", {
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

