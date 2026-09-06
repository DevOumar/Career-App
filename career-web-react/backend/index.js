import cors from "cors";
import crypto from "crypto";
import express from "express";
import { rateLimit, ipKeyGenerator } from "express-rate-limit";
import fs from "node:fs";
import { promises as fsPromises } from "node:fs";
import dns from "node:dns/promises";
import net from "node:net";
import mammoth from "mammoth";
import nodemailer from "nodemailer";
import path from "path";
import { PDFParse } from "pdf-parse";
import { fileURLToPath } from "url";
import { PGlite } from "@electric-sql/pglite";
import pg from "pg";
import { OAuth2Client } from "google-auth-library";
import Stripe from "stripe";
import { OFFERS } from "../frontend/src/data/offers.js";
import { EDUCATION_LEVELS, SKILL_KEYWORDS } from "../frontend/src/data/skills.js";
import { buildLocalMatchInsights } from "../frontend/src/lib/matchingService.js";
import { PLANS, getPlanById } from "../frontend/src/data/plans.js";
import {
  applyStripeWebhookEvent,
  buildCheckoutSessionParams,
  resolveStripeMode,
  resolveStripePriceEnvVar
} from "./stripeService.js";
import { getRealSalaryReference } from "./salaryDataService.js";
import { registerHealthRoutes } from "./routes/health.js";
import { registerAuthRoutes } from "./routes/auth.js";
import { registerProfileRoutes } from "./routes/profile.js";
import { registerPremiumRoutes } from "./routes/premium.js";
import { registerBillingRoutes } from "./routes/billing.js";
import { registerAdminRoutes } from "./routes/admin.js";
import { registerSatisfactionRoutes } from "./routes/satisfaction.js";
import { registerSchoolRoutes } from "./routes/school.js";
import { registerCabinetRoutes } from "./routes/cabinet.js";
import { registerTokensRoutes } from "./routes/tokens.js";
import { registerEmailFinderRoutes } from "./routes/emailFinder.js";
import { registerCvRoutes } from "./routes/cv.js";
import { registerMatchingRoutes } from "./routes/matching.js";
import { registerCoverLetterRoutes } from "./routes/coverLetter.js";
import { registerNegotiationRoutes } from "./routes/negotiation.js";
import { registerApplicationsRoutes } from "./routes/applications.js";
import { registerInterviewRoutes } from "./routes/interview.js";

const BASE_PORT = Number(process.env.PORT || 8787);
const SESSION_LIFETIME_MINUTES = 30 * 24 * 60; // 30 jours
const PORT_RETRY_COUNT = Number(process.env.PORT_RETRY_COUNT || 4);
const SERVER_HOST = String(process.env.HOST || (process.env.NODE_ENV === "production" ? "0.0.0.0" : "127.0.0.1")).trim();
const LOCAL_ORIGIN_PATTERN = /^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/i;

const ACCOUNT_TYPES = new Set([
  "candidate",
  "student",
  "recruiter_firm",
  "recruiter_internal",
  "company",
  "school",
  "coach",
  "other",
  "admin"
]);

const CANDIDATE_TYPES = new Set(["candidate", "student"]);
const RECRUITER_TYPES = new Set(["recruiter_firm", "recruiter_internal"]);

const ADMIN_MODULE_IDS = new Set([
  "dashboard",
  "accounts",
  "adminCvs",
  "adminMatches",
  "quality",
  "aiMonitoring",
  "finance",
  "activity",
  "licenses",
  "aiSamples",
  "settings",
  "announcements",
  "pricing",
  "satisfaction",
  "schools",
  "cabinets"
]);

function sanitizeAdminModules(input) {
  if (!Array.isArray(input)) return [];
  return [...new Set(input.filter((item) => ADMIN_MODULE_IDS.has(item)))];
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, "..");
const PROJECT_DATA_DIR = path.join(__dirname, "postgres-data");
const LEGACY_DATA_DIR = path.join(__dirname, "pgdata");
const LOCAL_APP_ROOT = path.join(__dirname, "postgres-runtime");
const RUNTIME_DATA_DIR = path.join(LOCAL_APP_ROOT, "postgres-data");
const CUSTOM_DATA_DIR = process.env.PGLITE_DATA_DIR ? path.resolve(process.env.PGLITE_DATA_DIR) : null;

loadLocalEnv();

const SMTP_HOST = String(process.env.SMTP_HOST || "smtp.gmail.com").trim();
const SMTP_PORT = Number(process.env.SMTP_PORT || 587);
const SMTP_SECURE = String(process.env.SMTP_SECURE || "false").toLowerCase() === "true";
const AI_PROVIDER = String(process.env.AI_PROVIDER || "none").trim().toLowerCase();
const AI_MODEL = String(process.env.AI_MODEL || "").trim();
const XAI_API_KEY = String(process.env.XAI_API_KEY || "").trim();
const GROQ_API_KEY = String(process.env.GROQ_API_KEY || "").trim();
const OPENAI_API_KEY = String(process.env.OPENAI_API_KEY || "").trim();
const AI_TIMEOUT_MS = Number(process.env.AI_TIMEOUT_MS || 45000);
const SMTP_USER = String(process.env.SMTP_USER || process.env.GMAIL_USER || "").trim();
const SMTP_PASS = String(process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD || "").trim();
const MAIL_FROM_NAME = String(process.env.MAIL_FROM_NAME || "Career CV").trim();
const MAIL_FROM = String(process.env.MAIL_FROM || "").trim();
const MAIL_FROM_ADDRESS = String(process.env.MAIL_FROM_ADDRESS || SMTP_USER).trim();
const AUTH_EMAIL_TO = String(process.env.AUTH_EMAIL_TO || "").trim();
// Bascule temporaire (soutenance / démo) : saute l'envoi + la saisie du code
// OTP à l'inscription, l'inscription connecte directement comme un login. À
// remettre à "false" (ou retirer la variable) une fois la démo terminée —
// ne touche PAS à la connexion par mot de passe, déjà sans OTP par défaut.
const AUTH_SKIP_SIGNUP_OTP = String(process.env.AUTH_SKIP_SIGNUP_OTP || "").trim() === "true";
const DATABASE_URL = String(process.env.DATABASE_URL || process.env.SUPABASE_DB_URL || "").trim();
const GOOGLE_CLIENT_ID = String(process.env.GOOGLE_CLIENT_ID || "").trim();
const googleOAuthClient = GOOGLE_CLIENT_ID ? new OAuth2Client(GOOGLE_CLIENT_ID) : null;
const STRIPE_SECRET_KEY = String(process.env.STRIPE_SECRET_KEY || "").trim();
const STRIPE_WEBHOOK_SECRET = String(process.env.STRIPE_WEBHOOK_SECRET || "").trim();
const APP_URL = String(process.env.APP_URL || "http://127.0.0.1:5174").trim();
const stripe = STRIPE_SECRET_KEY ? new Stripe(STRIPE_SECRET_KEY) : null;
const ALLOWED_ORIGINS = uniquePaths(
  [
    APP_URL,
    ...String(process.env.CORS_ORIGINS || "")
      .split(",")
      .map((origin) => origin.trim())
  ]
    .filter(Boolean)
    .map((origin) => origin.replace(/\/+$/, ""))
);

function loadLocalEnv() {
  const envPath = path.join(PROJECT_ROOT, ".env");
  if (!fs.existsSync(envPath)) return;

  const content = fs.readFileSync(envPath, "utf8");
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const index = trimmed.indexOf("=");
    const key = trimmed.slice(0, index).trim();
    const rawValue = trimmed.slice(index + 1).trim();
    const value = rawValue.replace(/^['"]|['"]$/g, "");
    if (key && !process.env[key]) {
      process.env[key] = value;
    }
  }
}

function uniquePaths(list) {
  return list.filter(Boolean).filter((value, index, self) => self.indexOf(value) === index);
}

function isDataDirectoryCorrupted(entries) {
  const hasPgVersion = entries.includes("PG_VERSION");
  return entries.length > 0 && !hasPgVersion;
}

async function createDirectorySafe(targetDir) {
  await fsPromises.mkdir(targetDir, { recursive: true });
  return targetDir;
}

async function prepareDataDirectory(dataDir) {
  if (!fs.existsSync(dataDir)) {
    await createDirectorySafe(dataDir);
    return dataDir;
  }

  const entries = await fsPromises.readdir(dataDir);
  if (!isDataDirectoryCorrupted(entries)) {
    return dataDir;
  }

  const backupDir = `${dataDir}-broken-${Date.now()}`;
  try {
    await fsPromises.rename(dataDir, backupDir);
    await createDirectorySafe(dataDir);
    console.warn(`Dossier PostgreSQL invalide deplace vers: ${backupDir}`);
    return dataDir;
  } catch (_error) {
    const fallbackDir = path.join(LOCAL_APP_ROOT, `postgres-data-repair-${Date.now()}`);
    try {
      await createDirectorySafe(fallbackDir);
      console.warn(`Dossier PostgreSQL verrouille (${dataDir}). Dossier de reprise: ${fallbackDir}`);
      return fallbackDir;
    } catch (_error2) {
      const localFallback = `${dataDir}-recovery-${Date.now()}`;
      await createDirectorySafe(localFallback);
      console.warn(`Reprise locale PostgreSQL via: ${localFallback}`);
      return localFallback;
    }
  }
}

function buildRecoveryDirectory() {
  return path.join(LOCAL_APP_ROOT, `postgres-data-recovery-${Date.now()}`);
}

async function createDbFromDirectory(dataDir) {
  const directory = await prepareDataDirectory(dataDir);
  const instance = await PGlite.create(directory);
  return { db: instance, dataDirectory: directory };
}

async function openEmbeddedPostgres() {
  const candidates = uniquePaths([CUSTOM_DATA_DIR, RUNTIME_DATA_DIR, PROJECT_DATA_DIR, LEGACY_DATA_DIR]);

  for (const candidate of candidates) {
    try {
      return await createDbFromDirectory(candidate);
    } catch (error) {
      console.error(`Echec ouverture PGlite (${candidate})`, error);
    }
  }

  const recoveryDirectory = buildRecoveryDirectory();
  await createDirectorySafe(recoveryDirectory);
  const recoveryDb = await PGlite.create(recoveryDirectory);
  console.warn(`Demarrage en mode recuperation avec: ${recoveryDirectory}`);
  return { db: recoveryDb, dataDirectory: recoveryDirectory };
}

async function openSupabasePostgres(connectionString) {
  const pool = new pg.Pool({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });
  pool.exec = (sql) => pool.query(sql);
  await pool.query("SELECT 1");
  console.log("Connecte a la base Postgres Supabase.");
  return { db: pool, dataDirectory: "supabase" };
}

async function openDatabase() {
  if (DATABASE_URL) {
    try {
      return await openSupabasePostgres(DATABASE_URL);
    } catch (error) {
      console.error("Echec de connexion a Supabase, repli sur PGlite local.", error.message);
    }
  }
  return openEmbeddedPostgres();
}

async function isCareerApiRunning(port) {
  try {
    const response = await fetch(`http://127.0.0.1:${port}/api/health`);
    if (!response.ok) return false;
    const payload = await response.json().catch(() => ({}));
    return payload?.ok === true;
  } catch (_error) {
    return false;
  }
}

async function startServer(app) {
  for (let step = 0; step <= PORT_RETRY_COUNT; step += 1) {
    const port = BASE_PORT + step;

    const result = await new Promise((resolve, reject) => {
      const server = app.listen(port, SERVER_HOST);

      server.once("listening", () => {
        resolve({ status: "ok", server, port });
      });

      server.once("error", async (error) => {
        if (error.code !== "EADDRINUSE") {
          reject(error);
          return;
        }

        const healthy = await isCareerApiRunning(port);
        if (healthy) {
          console.warn(`API deja active sur http://${SERVER_HOST}:${port} (processus existant conserve).`);
          resolve({ status: "existing", server: null, port });
          return;
        }

        resolve({ status: "busy", server: null, port });
      });
    });

    if (result.status === "ok" || result.status === "existing") {
      return result;
    }
  }

  throw new Error(`Aucun port disponible entre ${BASE_PORT} et ${BASE_PORT + PORT_RETRY_COUNT}.`);
}

const { db, dataDirectory } = await openDatabase();

const app = express();
app.use(
  cors({
    origin(origin, callback) {
      const normalizedOrigin = String(origin || "").replace(/\/+$/, "");
      if (!origin || LOCAL_ORIGIN_PATTERN.test(origin) || ALLOWED_ORIGINS.includes(normalizedOrigin)) {
        callback(null, true);
        return;
      }
      callback(new Error("Origin non autorisee"), false);
    }
  })
);

// Route webhook Stripe enregistrée AVANT express.json() : Stripe signe le corps
// BRUT (non parsé) de la requête, donc express.json() ne doit jamais y toucher
// (sinon la vérification de signature échoue systématiquement).
app.post("/api/stripe/webhook", express.raw({ type: "application/json" }), async (req, res) => {
  if (!stripe || !STRIPE_WEBHOOK_SECRET) {
    console.error("Webhook Stripe recu mais STRIPE_SECRET_KEY / STRIPE_WEBHOOK_SECRET absent(s) du .env.");
    return res.status(503).send("Stripe non configure cote serveur.");
  }

  const signature = req.headers["stripe-signature"];
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, signature, STRIPE_WEBHOOK_SECRET);
  } catch (error) {
    console.error("Signature webhook Stripe invalide:", error.message);
    return res.status(400).send(`Webhook Error: ${error.message}`);
  }

  try {
    // event.id est unique par événement Stripe (y compris les retries : un
    // même événement retenté garde le même id) — on ne l'applique qu'une
    // seule fois, même si Stripe le renvoie plusieurs fois ou si la session
    // a déjà été traitée par le filet de sécurité /confirm-checkout-session.
    const isNewEvent = await claimStripeEventOnce(event.id);
    if (!isNewEvent) {
      return res.json({ received: true, handled: false, reason: "already_processed" });
    }
    // Pour checkout.session.completed, on protège aussi sur l'id de session
    // lui-même : /confirm-checkout-session (filet de secours côté front, cf.
    // routes/billing.js) peut avoir déjà traité cette session avant que le
    // webhook n'arrive.
    if (event.type === "checkout.session.completed") {
      const sessionClaimId = `session:${event.data.object.id}`;
      const isNewSession = await claimStripeEventOnce(sessionClaimId);
      if (!isNewSession) {
        return res.json({ received: true, handled: false, reason: "session_already_processed" });
      }
    }

    const result = await applyStripeWebhookEvent(event, {
      db,
      parseJsonField,
      getPlanById: getEffectivePlanById,
      applyPlanToUser,
      generateLicenseCodeForPlan
    });
    return res.json({ received: true, ...result });
  } catch (error) {
    console.error("Erreur traitement webhook Stripe:", error);
    // 500 volontaire : Stripe retentera automatiquement l'envoi.
    return res.status(500).send("Erreur traitement webhook.");
  }
});

app.use(express.json({ limit: "10mb" }));

// Anti-bourrinage sur les routes d'authentification (connexion, inscription,
// demande/vérification de code) : au-delà de 20 requêtes en 15 minutes
// depuis la même IP, on bloque temporairement. Ne remplace pas le
// verrouillage par compte (voir requireLoginAttemptsAllowed dans
// routes/auth.js) : ceci protège contre le bourrinage massif/distribué
// (spam d'inscriptions, énumération d'emails), le verrouillage par compte
// protège un compte ciblé précis.
// GET /api/auth/session (vérification de session, appelée à chaque
// chargement de page) et /api/auth/logout ne doivent pas consommer le même
// quota que les tentatives de connexion/inscription réelles : sinon une
// simple navigation normale dans l'app peut épuiser la limite sans qu'aucune
// vraie tentative n'ait eu lieu.
const AUTH_RATE_LIMIT_EXEMPT_PATHS = new Set(["/session", "/logout"]);
// La suite de tests (backend/tests/api.test.mjs) enchaîne volontairement
// beaucoup d'appels /api/auth/* en rafale sur 127.0.0.1 (inscriptions,
// tentatives de connexion pour tester le verrouillage...) — sans ce garde-fou
// elle se ferait bloquer par ce même rate-limiter, pour des raisons sans
// rapport avec ce qu'elle teste réellement. Jamais actif en dehors des tests
// (il faut positionner la variable d'env explicitement).
const authRateLimitDisabledForTests = process.env.DISABLE_AUTH_RATE_LIMIT === "1";
const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Trop de tentatives. Réessayez dans quelques minutes." },
  skip: (req) => authRateLimitDisabledForTests || AUTH_RATE_LIMIT_EXEMPT_PATHS.has(req.path)
});
app.use("/api/auth", authRateLimiter);

// Garde-fou coût/abus sur les routes qui appellent un modèle IA : un compte
// à solde "illimité" (999 jetons, cas des licences école/cabinet, voir
// data/plans.js) n'a aucune autre limite technique sur ces routes — rien
// n'empêchait aujourd'hui un usage automatisé de générer un coût API
// incontrôlé. Plafond par utilisateur (pas par IP : un labo informatique
// partage une IP), pas par requête HTTP brute.
//
// Deux profils, car toutes les routes IA n'ont pas la même granularité :
// - "action" : un clic = un appel (analyse CV/offre, lettre, Email Scout,
//   extraction CV/offre) → 20/jour est déjà généreux pour un usage humain.
// - "conversation" : un tour de dialogue = un appel (négociation, entretien,
//   4 à 10 appels par session normale) → plafond bien plus haut pour ne
//   jamais gêner une vraie session de pratique, tout en bloquant un script.
function makeAiRateLimiter({ windowMs, limit, envFlag, message }) {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => coerceString(req.body?.userId || req.query?.userId) || ipKeyGenerator(req),
    skip: () => process.env[envFlag] === "1",
    message: { error: message }
  });
}

const aiActionRateLimiter = makeAiRateLimiter({
  windowMs: 24 * 60 * 60 * 1000,
  limit: 20,
  envFlag: "DISABLE_AI_RATE_LIMIT",
  message: "Limite quotidienne d'actions IA atteinte (20/jour). Réessayez demain."
});

const aiConversationRateLimiter = makeAiRateLimiter({
  windowMs: 24 * 60 * 60 * 1000,
  limit: 150,
  envFlag: "DISABLE_AI_RATE_LIMIT",
  message: "Limite quotidienne d'échanges IA atteinte pour aujourd'hui. Réessayez demain."
});

// Résout la session (token Bearer) sur CHAQUE requête, avant les routes :
// req.sessionUserId contient l'id de l'utilisateur réellement authentifié
// pour cette requête (ou null si aucun token valide). Ne bloque rien ici
// (beaucoup de routes sont publiques, ex. /api/health, /api/offers) — les
// routes qui manipulent des données propres à un utilisateur appellent
// requireMatchingSession(req, res, userId) pour vérifier que le userId
// qu'elles reçoivent (body/query) correspond bien à la session active,
// plutôt que de faire confiance à un userId envoyé tel quel par le client.
app.use(async (req, res, next) => {
  try {
    const authHeader = String(req.headers.authorization || "");
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
    if (!token) {
      req.sessionUserId = null;
      return next();
    }
    const { rows } = await db.query("SELECT user_id, expires_at FROM sessions WHERE token = $1 LIMIT 1", [token]);
    const session = rows[0];
    if (!session) {
      req.sessionUserId = null;
      return next();
    }
    if (session.expires_at && new Date(session.expires_at).getTime() < Date.now()) {
      await db.query("DELETE FROM sessions WHERE token = $1", [token]);
      req.sessionUserId = null;
      return next();
    }
    req.sessionUserId = session.user_id;
    return next();
  } catch (error) {
    console.error("Erreur resolution de session:", error);
    req.sessionUserId = null;
    return next();
  }
});

// À appeler en tout début de route avec le userId reçu du client (body ou
// query) : renvoie false (et a déjà répondu 401/403) si ce userId ne
// correspond pas à la session active pour cette requête. Utilisation :
//   if (!requireMatchingSession(req, res, userId)) return;
function requireMatchingSession(req, res, claimedUserId) {
  if (!req.sessionUserId) {
    res.status(401).json({ error: "Authentification requise." });
    return false;
  }
  if (!claimedUserId || req.sessionUserId !== claimedUserId) {
    res.status(403).json({ error: "Accès refusé." });
    return false;
  }
  return true;
}

await db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    password_salt TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    role_type TEXT NOT NULL DEFAULT 'candidate',
    avatar_data_url TEXT NOT NULL DEFAULT '',
    profile_json TEXT NOT NULL,
    subscription_json TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS user_accounts (
    user_id TEXT PRIMARY KEY,
    account_type TEXT NOT NULL,
    phone TEXT NOT NULL DEFAULT '',
    city TEXT NOT NULL DEFAULT '',
    country TEXT NOT NULL DEFAULT '',
    onboarding_completed INTEGER NOT NULL DEFAULT 0,
    avatar_data_url TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS user_email_addresses (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    is_primary INTEGER NOT NULL DEFAULT 0,
    is_verified INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS user_candidate_profiles (
    user_id TEXT PRIMARY KEY,
    current_title TEXT NOT NULL DEFAULT '',
    target_role TEXT NOT NULL DEFAULT '',
    experience_years INTEGER NOT NULL DEFAULT 0,
    school_name TEXT NOT NULL DEFAULT '',
    study_level TEXT NOT NULL DEFAULT '',
    graduation_year INTEGER,
    contract_preference TEXT NOT NULL DEFAULT '',
    availability TEXT NOT NULL DEFAULT '',
    portfolio_url TEXT NOT NULL DEFAULT '',
    linkedin_url TEXT NOT NULL DEFAULT '',
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS user_recruiter_profiles (
    user_id TEXT PRIMARY KEY,
    organization_name TEXT NOT NULL DEFAULT '',
    recruiter_role TEXT NOT NULL DEFAULT '',
    hiring_volume TEXT NOT NULL DEFAULT '',
    industry TEXT NOT NULL DEFAULT '',
    website TEXT NOT NULL DEFAULT '',
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS user_org_profiles (
    user_id TEXT PRIMARY KEY,
    organization_name TEXT NOT NULL DEFAULT '',
    organization_type TEXT NOT NULL DEFAULT '',
    department TEXT NOT NULL DEFAULT '',
    website TEXT NOT NULL DEFAULT '',
    size_range TEXT NOT NULL DEFAULT '',
    industry TEXT NOT NULL DEFAULT '',
    contact_role TEXT NOT NULL DEFAULT '',
    notes TEXT NOT NULL DEFAULT '',
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    created_at TEXT NOT NULL,
    user_agent TEXT NOT NULL DEFAULT '',
    ip_address TEXT NOT NULL DEFAULT '',
    last_seen_at TEXT NOT NULL DEFAULT ''
  );

  CREATE TABLE IF NOT EXISTS account_security_events (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    event_type TEXT NOT NULL,
    metadata_json TEXT NOT NULL,
    ip_address TEXT NOT NULL DEFAULT '',
    user_agent TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS email_verification_codes (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    email TEXT NOT NULL,
    code_hash TEXT NOT NULL,
    code_salt TEXT NOT NULL,
    purpose TEXT NOT NULL,
    attempts INTEGER NOT NULL DEFAULT 0,
    consumed_at TEXT NOT NULL DEFAULT '',
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS cvs (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    created_at TEXT NOT NULL,
    file_name TEXT NOT NULL,
    source_text TEXT NOT NULL,
    parsed_json TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS match_runs (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    created_at TEXT NOT NULL,
    payload_json TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS job_applications (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'to_apply',
    title TEXT NOT NULL DEFAULT '',
    company TEXT NOT NULL DEFAULT '',
    location TEXT NOT NULL DEFAULT '',
    offer_url TEXT NOT NULL DEFAULT '',
    offer_text TEXT NOT NULL DEFAULT '',
    match_score INTEGER,
    cv_id TEXT NOT NULL DEFAULT '',
    notes TEXT NOT NULL DEFAULT '',
    applied_at TEXT NOT NULL DEFAULT '',
    next_action_at TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS satisfaction_surveys (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    score INTEGER NOT NULL,
    comment TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS negotiation_conversations (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    title TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    payload_json TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS interview_conversations (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    title TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    payload_json TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS cover_letters (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    title TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    payload_json TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS match_feedback (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    match_run_id TEXT NOT NULL,
    useful INTEGER NOT NULL,
    created_at TEXT NOT NULL,
    UNIQUE (user_id, match_run_id)
  );

  CREATE TABLE IF NOT EXISTS license_codes (
    code TEXT PRIMARY KEY,
    owner_user_id TEXT NOT NULL,
    plan_id TEXT NOT NULL,
    seats_total INTEGER NOT NULL,
    seats_used INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS school_invitations (
    id TEXT PRIMARY KEY,
    school_user_id TEXT NOT NULL,
    email TEXT NOT NULL,
    license_code TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TEXT NOT NULL,
    redeemed_at TEXT
  );

  CREATE TABLE IF NOT EXISTS school_promotions (
    id TEXT PRIMARY KEY,
    school_user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    program TEXT NOT NULL DEFAULT '',
    level TEXT NOT NULL DEFAULT '',
    campus TEXT NOT NULL DEFAULT '',
    academic_year TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS school_promotion_students (
    id TEXT PRIMARY KEY,
    promotion_id TEXT NOT NULL,
    student_user_id TEXT NOT NULL,
    created_at TEXT NOT NULL,
    UNIQUE (promotion_id, student_user_id)
  );

  CREATE TABLE IF NOT EXISTS school_reports (
    id TEXT PRIMARY KEY,
    school_user_id TEXT NOT NULL,
    title TEXT NOT NULL,
    period TEXT NOT NULL,
    payload_json TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS school_announcements (
    id TEXT PRIMARY KEY,
    school_user_id TEXT NOT NULL,
    subject TEXT NOT NULL,
    message TEXT NOT NULL,
    promotion_id TEXT,
    recipient_count INTEGER NOT NULL DEFAULT 0,
    failed_count INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS school_events (
    id TEXT PRIMARY KEY,
    school_user_id TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    event_date TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS school_announcement_recipients (
    announcement_id TEXT NOT NULL,
    student_user_id TEXT NOT NULL,
    PRIMARY KEY (announcement_id, student_user_id)
  );

  CREATE TABLE IF NOT EXISTS school_digest_log (
    school_user_id TEXT PRIMARY KEY,
    last_sent_at TEXT NOT NULL
  );

  -- Espace Cabinet (cabinet_* — mêmes principes que school_*, adaptés au
  -- métier recrutement : les "membres" sont des recruteurs de l'équipe
  -- (invités comme les étudiants d'une école), mais les candidats évalués
  -- (cabinet_candidates) sont un vivier propre au cabinet, PAS des comptes
  -- Career CV — un recruteur y importe/saisit des profils externes.
  CREATE TABLE IF NOT EXISTS cabinet_invitations (
    id TEXT PRIMARY KEY,
    cabinet_user_id TEXT NOT NULL,
    email TEXT NOT NULL,
    license_code TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TEXT NOT NULL,
    redeemed_at TEXT
  );

  CREATE TABLE IF NOT EXISTS cabinet_candidates (
    id TEXT PRIMARY KEY,
    cabinet_user_id TEXT NOT NULL,
    first_name TEXT NOT NULL DEFAULT '',
    last_name TEXT NOT NULL DEFAULT '',
    email TEXT NOT NULL DEFAULT '',
    phone TEXT NOT NULL DEFAULT '',
    headline TEXT NOT NULL DEFAULT '',
    skills_json TEXT NOT NULL DEFAULT '[]',
    notes TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'sourced',
    created_by TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS cabinet_missions (
    id TEXT PRIMARY KEY,
    cabinet_user_id TEXT NOT NULL,
    title TEXT NOT NULL,
    client_name TEXT NOT NULL DEFAULT '',
    location TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'open',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS cabinet_mission_candidates (
    mission_id TEXT NOT NULL,
    candidate_id TEXT NOT NULL,
    stage TEXT NOT NULL DEFAULT 'sourced',
    score INTEGER,
    created_at TEXT NOT NULL,
    PRIMARY KEY (mission_id, candidate_id)
  );

  CREATE TABLE IF NOT EXISTS cabinet_announcements (
    id TEXT PRIMARY KEY,
    cabinet_user_id TEXT NOT NULL,
    subject TEXT NOT NULL,
    message TEXT NOT NULL,
    recipient_count INTEGER NOT NULL DEFAULT 0,
    failed_count INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS cabinet_reports (
    id TEXT PRIMARY KEY,
    cabinet_user_id TEXT NOT NULL,
    title TEXT NOT NULL,
    mission_id TEXT,
    payload_json TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS cabinet_digest_log (
    cabinet_user_id TEXT PRIMARY KEY,
    last_sent_at TEXT NOT NULL
  );

  -- Fil de notes horodatées par candidat du vivier (suivi des interactions,
  -- pas de champ libre unique comme cabinet_candidates.notes qui reste la
  -- "fiche" ; ici c'est un historique cumulatif, jamais écrasé).
  CREATE TABLE IF NOT EXISTS cabinet_candidate_notes (
    id TEXT PRIMARY KEY,
    candidate_id TEXT NOT NULL,
    cabinet_user_id TEXT NOT NULL,
    author_name TEXT NOT NULL DEFAULT '',
    body TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  -- Modèles de message réutilisables pour les relances ciblées et les
  -- annonces (le cabinet définit ses propres formulations au lieu du texte
  -- fixe embarqué côté frontend).
  CREATE TABLE IF NOT EXISTS cabinet_message_templates (
    id TEXT PRIMARY KEY,
    cabinet_user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    subject TEXT NOT NULL DEFAULT '',
    message TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS school_notifications (
    id TEXT PRIMARY KEY,
    school_user_id TEXT NOT NULL,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    metadata_json TEXT NOT NULL DEFAULT '{}',
    read_at TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS platform_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS announcements (
    id TEXT PRIMARY KEY,
    admin_user_id TEXT NOT NULL,
    subject TEXT NOT NULL,
    message TEXT NOT NULL,
    audience TEXT NOT NULL,
    recipient_count INTEGER NOT NULL DEFAULT 0,
    failed_count INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS plan_overrides (
    plan_id TEXT PRIMARY KEY,
    monthly_price NUMERIC,
    annual_price NUMERIC,
    stripe_price_id_monthly TEXT,
    stripe_price_id_annual TEXT,
    updated_at TEXT NOT NULL
  );

  -- Déduplication des événements Stripe (webhook + confirmation manuelle de
  -- secours peuvent recevoir le même événement plusieurs fois : retries
  -- réseau Stripe, ou webhook + confirm-checkout-session sur la même
  -- session). Un id Stripe (evt_... ou cs_...) ne doit être appliqué qu'une
  -- seule fois.
  CREATE TABLE IF NOT EXISTS processed_stripe_events (
    id TEXT PRIMARY KEY,
    processed_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    plan_id TEXT NOT NULL,
    billing_cycle TEXT NOT NULL,
    listed_amount NUMERIC NOT NULL DEFAULT 0,
    amount_collected NUMERIC NOT NULL DEFAULT 0,
    currency TEXT NOT NULL DEFAULT 'EUR',
    source TEXT NOT NULL,
    license_code TEXT,
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT,
    stripe_payment_intent_id TEXT,
    refunded INTEGER NOT NULL DEFAULT 0,
    refunded_at TEXT,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS offers (
    id TEXT PRIMARY KEY,
    company TEXT NOT NULL,
    title TEXT NOT NULL,
    location TEXT NOT NULL,
    contract TEXT NOT NULL,
    premium INTEGER NOT NULL DEFAULT 0,
    sector TEXT NOT NULL,
    experience_min INTEGER NOT NULL DEFAULT 0,
    education TEXT NOT NULL DEFAULT '',
    skills_json TEXT NOT NULL,
    missions_json TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
`);

await db.exec(`
  ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TEXT NOT NULL DEFAULT '';
  ALTER TABLE users ADD COLUMN IF NOT EXISTS role_type TEXT NOT NULL DEFAULT 'candidate';
  ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_data_url TEXT NOT NULL DEFAULT '';
  ALTER TABLE users ADD COLUMN IF NOT EXISTS username TEXT NOT NULL DEFAULT '';
  ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id TEXT NOT NULL DEFAULT '';
  ALTER TABLE users ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active';
  ALTER TABLE license_codes ADD COLUMN IF NOT EXISTS revoked INTEGER NOT NULL DEFAULT 0;
  ALTER TABLE license_codes ADD COLUMN IF NOT EXISTS revoked_at TEXT NOT NULL DEFAULT '';
  ALTER TABLE users ADD COLUMN IF NOT EXISTS admin_modules_json TEXT NOT NULL DEFAULT '[]';
  ALTER TABLE user_org_profiles ADD COLUMN IF NOT EXISTS logo_data_url TEXT NOT NULL DEFAULT '';
  ALTER TABLE user_org_profiles ADD COLUMN IF NOT EXISTS address TEXT NOT NULL DEFAULT '';
  ALTER TABLE user_org_profiles ADD COLUMN IF NOT EXISTS city TEXT NOT NULL DEFAULT '';
  ALTER TABLE user_org_profiles ADD COLUMN IF NOT EXISTS country TEXT NOT NULL DEFAULT '';
  ALTER TABLE user_org_profiles ADD COLUMN IF NOT EXISTS email_domain TEXT NOT NULL DEFAULT '';
  ALTER TABLE user_org_profiles ADD COLUMN IF NOT EXISTS contact_email TEXT NOT NULL DEFAULT '';
  ALTER TABLE user_org_profiles ADD COLUMN IF NOT EXISTS contact_phone TEXT NOT NULL DEFAULT '';
  ALTER TABLE user_org_profiles ADD COLUMN IF NOT EXISTS primary_contact_name TEXT NOT NULL DEFAULT '';
  ALTER TABLE user_org_profiles ADD COLUMN IF NOT EXISTS acronym TEXT NOT NULL DEFAULT '';
  ALTER TABLE sessions ADD COLUMN IF NOT EXISTS user_agent TEXT NOT NULL DEFAULT '';
  ALTER TABLE sessions ADD COLUMN IF NOT EXISTS ip_address TEXT NOT NULL DEFAULT '';
  ALTER TABLE sessions ADD COLUMN IF NOT EXISTS last_seen_at TEXT NOT NULL DEFAULT '';
  ALTER TABLE sessions ADD COLUMN IF NOT EXISTS expires_at TEXT NOT NULL DEFAULT '';
  ALTER TABLE users ADD COLUMN IF NOT EXISTS failed_login_attempts INTEGER NOT NULL DEFAULT 0;
  ALTER TABLE users ADD COLUMN IF NOT EXISTS locked_until TEXT NOT NULL DEFAULT '';
  ALTER TABLE transactions ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT;
  ALTER TABLE transactions ADD COLUMN IF NOT EXISTS refunded INTEGER NOT NULL DEFAULT 0;
  ALTER TABLE transactions ADD COLUMN IF NOT EXISTS refunded_at TEXT;
  ALTER TABLE cvs ADD COLUMN IF NOT EXISTS file_name TEXT NOT NULL DEFAULT 'CV importé';
  ALTER TABLE cvs ADD COLUMN IF NOT EXISTS source_text TEXT NOT NULL DEFAULT '';
  ALTER TABLE cvs ADD COLUMN IF NOT EXISTS parsed_json TEXT NOT NULL DEFAULT '{}';
  ALTER TABLE users ADD COLUMN IF NOT EXISTS satisfaction_last_prompted_at TEXT NOT NULL DEFAULT '';
  ALTER TABLE cabinet_candidates ADD COLUMN IF NOT EXISTS cv_file_name TEXT NOT NULL DEFAULT '';
  ALTER TABLE cabinet_candidates ADD COLUMN IF NOT EXISTS source_text TEXT NOT NULL DEFAULT '';
  ALTER TABLE cabinet_candidates ADD COLUMN IF NOT EXISTS parsed_json TEXT NOT NULL DEFAULT '{}';
  ALTER TABLE user_recruiter_profiles ADD COLUMN IF NOT EXISTS address TEXT NOT NULL DEFAULT '';
  ALTER TABLE user_recruiter_profiles ADD COLUMN IF NOT EXISTS city TEXT NOT NULL DEFAULT '';
  ALTER TABLE user_recruiter_profiles ADD COLUMN IF NOT EXISTS country TEXT NOT NULL DEFAULT '';
  ALTER TABLE user_recruiter_profiles ADD COLUMN IF NOT EXISTS contact_email TEXT NOT NULL DEFAULT '';
  ALTER TABLE user_recruiter_profiles ADD COLUMN IF NOT EXISTS contact_phone TEXT NOT NULL DEFAULT '';
  ALTER TABLE user_recruiter_profiles ADD COLUMN IF NOT EXISTS primary_contact_name TEXT NOT NULL DEFAULT '';
  ALTER TABLE user_recruiter_profiles ADD COLUMN IF NOT EXISTS logo_data_url TEXT NOT NULL DEFAULT '';
  ALTER TABLE cabinet_missions ADD COLUMN IF NOT EXISTS placement_amount NUMERIC;
  ALTER TABLE cabinet_candidates ADD COLUMN IF NOT EXISTS follow_up_date TEXT;
  ALTER TABLE user_recruiter_profiles ADD COLUMN IF NOT EXISTS public_page_enabled INTEGER NOT NULL DEFAULT 0;
  ALTER TABLE user_recruiter_profiles ADD COLUMN IF NOT EXISTS public_slug TEXT NOT NULL DEFAULT '';
  ALTER TABLE user_recruiter_profiles ADD COLUMN IF NOT EXISTS description TEXT NOT NULL DEFAULT '';
`);

// Sessions déjà expirées avant l'ajout de la colonne expires_at (créées
// sans date d'expiration) : on leur donne 30 jours à partir de maintenant
// plutôt que de les supprimer immédiatement (déconnexion surprise de tout
// le monde au déploiement de ce changement).
await db.query(
  "UPDATE sessions SET expires_at = $1 WHERE COALESCE(expires_at, '') = ''",
  [addMinutes(new Date(), SESSION_LIFETIME_MINUTES)]
);
await db.query("DELETE FROM sessions WHERE expires_at <> '' AND expires_at < $1", [nowIso()]);

await db.query("UPDATE users SET updated_at = created_at WHERE COALESCE(updated_at, '') = ''");
await db.query(
  `INSERT INTO user_email_addresses (id, user_id, email, is_primary, is_verified, created_at, updated_at)
   SELECT 'eml-' || id, id, email, 1, 1, created_at, updated_at
   FROM users
   WHERE email NOT IN (SELECT email FROM user_email_addresses)`
);

const DEFAULT_PROFILE = {
  headline: "",
  location: "",
  targetRole: "",
  sector: "",
  experienceYears: 0,
  education: "",
  skills: [],
  languages: []
};

function nowIso() {
  return new Date().toISOString();
}

function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function normalizeEmail(email) {
  return normalizeText(email);
}

function normalizeUsername(value) {
  return normalizeText(value)
    .replace(/[^a-z0-9_-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 30);
}

function validateUsernameInput(value, required = false) {
  const raw = coerceString(value).trim();
  if (!raw) {
    return required ? "Le nom d'utilisateur est obligatoire." : "";
  }
  if (!/^[a-z0-9_-]{3,30}$/i.test(raw)) {
    return "Le nom d'utilisateur doit contenir 3 à 30 caractères : lettres, chiffres, - ou _.";
  }
  return "";
}

function buildUsername(firstName, lastName, email) {
  const fromName = normalizeUsername(`${firstName}_${lastName}`);
  return fromName || normalizeUsername(String(email || "").split("@")[0]) || `user_${crypto.randomUUID().slice(0, 8)}`;
}

function normalizeSkillList(rawSkills) {
  if (!rawSkills) return [];
  if (Array.isArray(rawSkills)) {
    return [...new Set(rawSkills.map(normalizeText).filter(Boolean))];
  }
  return [...new Set(String(rawSkills).split(",").map(normalizeText).filter(Boolean))];
}

function stripNullBytes(value) {
  return String(value || "").replace(/\u0000/g, "");
}

function coerceString(value) {
  return stripNullBytes(value).trim();
}

function coerceInteger(value, fallback = 0) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(0, Math.round(parsed));
}

function sanitizeAccountType(input) {
  const normalized = normalizeText(input)
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

  const aliases = {
    etudiant: "student",
    etudiante: "student",
    student: "student",
    candidat: "candidate",
    candidate: "candidate",
    cabinet_recrutement: "recruiter_firm",
    agence_recrutement: "recruiter_firm",
    recruiter_firm: "recruiter_firm",
    recruteur_interne: "recruiter_internal",
    recruiter_internal: "recruiter_internal",
    entreprise: "company",
    company: "company",
    ecole: "school",
    universite: "school",
    school: "school",
    coach: "coach",
    autre: "other",
    other: "other"
  };

  const mapped = aliases[normalized] || normalized;
  if (!ACCOUNT_TYPES.has(mapped)) return "other";
  return mapped;
}

function hashPassword(password, salt) {
  return crypto.pbkdf2Sync(password, salt, 140000, 64, "sha512").toString("hex");
}

function createPasswordRecord(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  return {
    salt,
    hash: hashPassword(password, salt)
  };
}

function verifyPassword(password, salt, expectedHash) {
  return crypto.timingSafeEqual(
    Buffer.from(hashPassword(password, salt), "hex"),
    Buffer.from(String(expectedHash || ""), "hex")
  );
}

// Dérive un identifiant stable mais non réutilisable à partir d'un token de
// session — jamais le token brut lui-même côté client (voir toPublicUser).
// Un hash simple suffit : l'objectif n'est pas la sécurité cryptographique
// du token (déjà un random.UUID, largement assez fort) mais juste éviter
// d'exposer une valeur qui permettrait de rejouer la session si interceptée
// ailleurs (logs, extension navigateur compromise, etc.).
function hashSessionToken(token) {
  return crypto.createHash("sha256").update(String(token)).digest("hex").slice(0, 16);
}

function createSixDigitCode() {
  return String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
}

function addMinutes(date, minutes) {
  return new Date(date.getTime() + minutes * 60 * 1000).toISOString();
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildVerificationEmail({ code, firstName, email, purpose = "login" }) {
  const safeName = escapeHtml(firstName || "Bonjour");
  const safeEmail = escapeHtml(email);
  const safeCode = escapeHtml(code);
  const isSignup = purpose === "signup";
  const isReset = purpose === "reset";

  const subject = isSignup
    ? `Bienvenue sur Career CV - votre code de vérification : ${safeCode}`
    : isReset
    ? `${safeCode} est votre code de réinitialisation Career CV`
    : `${safeCode} est votre code de vérification Career CV`;

  const introTitle = isSignup ? "Bienvenue sur Career CV !" : isReset ? "Réinitialisez votre mot de passe" : "Vérifiez votre messagerie";
  const introText = isSignup
    ? `Merci de rejoindre Career CV, ${safeName}. Confirmez votre adresse <strong>${safeEmail}</strong> avec le code ci-dessous pour activer votre compte et commencer à optimiser vos candidatures.`
    : isReset
    ? `Utilisez le code ci-dessous pour choisir un nouveau mot de passe pour le compte associé à <strong>${safeEmail}</strong>. Si vous n'êtes pas à l'origine de cette demande, ignorez simplement cet email : votre mot de passe actuel reste inchangé.`
    : `Utilisez le code ci-dessous pour continuer vers Career CV avec l'adresse <strong>${safeEmail}</strong>.`;

  const text = [
    isSignup ? `Bienvenue sur Career CV, ${firstName || ""} !`.trim() : `Bonjour ${firstName || ""}`.trim(),
    "",
    isSignup
      ? `Merci de rejoindre Career CV. Votre code de vérification est : ${code}`
      : isReset
      ? `Votre code de réinitialisation de mot de passe Career CV est : ${code}`
      : `Votre code de vérification Career CV est : ${code}`,
    "",
    "Ce code expire dans 10 minutes.",
    "Ne le partagez avec personne. Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer cet email.",
    "",
    "Career CV"
  ].join("\n");

  const html = `<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${isSignup ? "Bienvenue sur Career CV" : isReset ? "Réinitialisation de mot de passe" : "Code de vérification Career CV"}</title>
  </head>
  <body style="margin:0;background:#f4f7fb;font-family:Arial,Helvetica,sans-serif;color:#101828;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f7fb;padding:32px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border:1px solid #e5eaf3;border-radius:24px;overflow:hidden;box-shadow:0 18px 45px rgba(15,23,42,0.08);">
            <tr>
              <td style="padding:28px 30px 18px;">
                <div style="display:inline-block;width:42px;height:42px;border-radius:14px;background:linear-gradient(135deg,#4f46e5,#10b981);vertical-align:middle;"></div>
                <span style="display:inline-block;margin-left:12px;font-size:20px;font-weight:800;color:#101828;vertical-align:middle;">Career CV</span>
              </td>
            </tr>
            <tr>
              <td style="padding:8px 30px 4px;">
                <p style="margin:0 0 8px;color:#667085;font-size:14px;">Bonjour ${safeName},</p>
                <h1 style="margin:0;font-size:28px;line-height:1.2;color:#101828;">${introTitle}</h1>
                <p style="margin:12px 0 0;color:#475467;font-size:16px;line-height:1.6;">${introText}</p>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 30px;">
                <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:18px;padding:22px;text-align:center;">
                  <p style="margin:0 0 12px;color:#667085;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:.12em;">Code de vérification</p>
                  <div style="font-size:42px;line-height:1;font-weight:900;letter-spacing:10px;color:#111827;">${safeCode}</div>
                  <p style="margin:16px 0 0;color:#667085;font-size:14px;">Ce code expire dans 10 minutes.</p>
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding:0 30px 28px;">
                <div style="border-left:4px solid #10b981;background:#ecfdf5;border-radius:14px;padding:14px 16px;color:#065f46;font-size:14px;line-height:1.55;">
                  Ne partagez jamais ce code. Si vous n'êtes pas à l'origine de cette demande, ignorez simplement cet email.
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding:18px 30px;background:#f8fafc;border-top:1px solid #e5eaf3;color:#667085;font-size:12px;line-height:1.5;">
                © ${new Date().getFullYear()} Career CV. Email automatique envoyé pour sécuriser votre connexion.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  return { subject, text, html };
}

let cachedMailTransporter = null;

function getMailTransporter() {
  if (!SMTP_USER || !SMTP_PASS) return null;
  if (!cachedMailTransporter) {
    cachedMailTransporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_SECURE,
      auth: { user: SMTP_USER, pass: SMTP_PASS }
    });
  }
  return cachedMailTransporter;
}

function buildAnnouncementEmail({ subject, message, firstName }) {
  const greeting = firstName ? `Bonjour ${firstName},` : "Bonjour,";
  const paragraphs = String(message || "")
    .split(/\n{2,}/)
    .map((p) => `<p style="margin:0 0 14px;line-height:1.6;color:#1f2634;">${p.replace(/\n/g, "<br/>")}</p>`)
    .join("");

  const html = `
    <div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;">
      <h2 style="color:#2f5bff;margin:0 0 18px;">Career CV</h2>
      <p style="margin:0 0 14px;color:#1f2634;">${greeting}</p>
      ${paragraphs}
      <p style="margin:24px 0 0;color:#5b6478;font-size:0.85rem;">— L'équipe Career CV</p>
    </div>`;

  const text = `${greeting}\n\n${message}\n\n— L'équipe Career CV`;

  return { subject, html, text };
}

async function resolveAnnouncementAudience(audience) {
  if (audience && !ACCOUNT_TYPES.has(audience)) {
    const error = new Error("Audience inconnue.");
    error.statusCode = 400;
    throw error;
  }
  const query = audience
    ? "SELECT id, first_name, email FROM users WHERE role_type = $1"
    : "SELECT id, first_name, email FROM users WHERE role_type <> 'admin'";
  const { rows } = await db.query(query, audience ? [audience] : []);
  return rows;
}

async function sendVerificationEmail({ to, code, firstName, purpose = "login" }) {
  const message = buildVerificationEmail({ code, firstName, email: to, purpose });
  const recipient = AUTH_EMAIL_TO || to;

  if (!SMTP_USER || !SMTP_PASS) {
    console.warn("[Career CV] SMTP non configure. Code affiche dans les logs uniquement.");
    return { sent: false, reason: "missing_smtp_config" };
  }

  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_SECURE,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS
    }
  });

  try {
    await transporter.sendMail({
      from: MAIL_FROM || `"${MAIL_FROM_NAME}" <${MAIL_FROM_ADDRESS || SMTP_USER}>`,
      to: recipient,
      subject: message.subject,
      text: message.text,
      html: message.html
    });
    return { sent: true, recipient };
  } catch (error) {
    console.warn(`[Career CV] Echec d'envoi d'email SMTP (${error.message}). Code disponible dans la console ci-dessus.`);
    return { sent: false, reason: "smtp_send_error", error: error.message };
  }
}

async function createEmailVerificationCode(user, purpose = "login", targetEmail = "") {
  const code = createSixDigitCode();
  const record = createPasswordRecord(code);
  const createdAt = nowIso();
  const expiresAt = addMinutes(new Date(), 10);
  const id = `evc-${crypto.randomUUID()}`;
  const email = normalizeEmail(targetEmail || user.email);

  await db.query(
    `INSERT INTO email_verification_codes (
      id, user_id, email, code_hash, code_salt, purpose, attempts, consumed_at, expires_at, created_at
    ) VALUES ($1,$2,$3,$4,$5,$6,0,'',$7,$8)`,
    [id, user.id, email, record.hash, record.salt, purpose, expiresAt, createdAt]
  );

  const delivery = await sendVerificationEmail({ to: email, code, firstName: user.first_name, purpose });
  console.log(`[Career CV] Code ${purpose} pour ${email}: ${code} (expire dans 10 min, email=${delivery.sent ? "envoye" : "non_configure"})`);
  return { id, email, expiresAt, code };
}

function getRequestIp(req) {
  return coerceString(req.headers["x-forwarded-for"] || req.socket?.remoteAddress || req.ip || "")
    .split(",")[0]
    .trim();
}

function getRequestUserAgent(req) {
  return coerceString(req.headers["user-agent"] || "");
}

function getDeviceName(userAgent = "") {
  if (/Windows/i.test(userAgent)) return "Windows";
  if (/Macintosh|Mac OS/i.test(userAgent)) return "macOS";
  if (/Android/i.test(userAgent)) return "Android";
  if (/iPhone|iPad/i.test(userAgent)) return "iOS";
  if (/Linux/i.test(userAgent)) return "Linux";
  return "Appareil";
}

function getBrowserName(userAgent = "") {
  if (/Edg\//i.test(userAgent)) return "Microsoft Edge";
  if (/Chrome\//i.test(userAgent)) return "Chrome";
  if (/Firefox\//i.test(userAgent)) return "Firefox";
  if (/Safari\//i.test(userAgent)) return "Safari";
  return "Navigateur";
}

async function createSessionForRequest(req, userId) {
  const token = `sess-${crypto.randomUUID()}`;
  const timestamp = nowIso();
  const expiresAt = addMinutes(new Date(), SESSION_LIFETIME_MINUTES);
  await db.query(
    `INSERT INTO sessions (token, user_id, created_at, user_agent, ip_address, last_seen_at, expires_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7)`,
    [token, userId, timestamp, getRequestUserAgent(req), getRequestIp(req), timestamp, expiresAt]
  );
  return token;
}

function ensureUserCanAuthenticate(userRow) {
  if (coerceString(userRow?.status || "active") === "suspended") {
    const error = new Error("Ce compte est suspendu. Veuillez contacter l'administrateur Career CV pour rétablir l'accès.");
    error.statusCode = 403;
    throw error;
  }
}

async function logSecurityEvent(req, userId, eventType, metadata = {}) {
  await db.query(
    `INSERT INTO account_security_events (id, user_id, event_type, metadata_json, ip_address, user_agent, created_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7)`,
    [
      `sec-${crypto.randomUUID()}`,
      userId,
      eventType,
      JSON.stringify(metadata || {}),
      getRequestIp(req),
      getRequestUserAgent(req),
      nowIso()
    ]
  );
}

function parseJsonField(input, fallback) {
  try {
    return input ? JSON.parse(input) : fallback;
  } catch (error) {
    return fallback;
  }
}

function getCvExtractionStatus(parsed) {
  const skills = Array.isArray(parsed?.skills) ? parsed.skills.filter(Boolean) : [];
  const experiences = Array.isArray(parsed?.experiences) ? parsed.experiences.filter(Boolean) : [];
  const education = Array.isArray(parsed?.educationItems) ? parsed.educationItems.filter(Boolean) : [];
  const certifications = Array.isArray(parsed?.certifications) ? parsed.certifications.filter(Boolean) : [];
  const missing = [];
  if (!parsed?.firstName) missing.push("firstName");
  if (!parsed?.lastName) missing.push("lastName");
  if (!parsed?.email) missing.push("email");
  if (!skills.length) missing.push("skills");
  if (!experiences.length) missing.push("experiences");
  if (!education.length) missing.push("education");
  const suspicious = [];
  if (skills.some((item) => String(item).trim().length <= 1)) suspicious.push("short_skill");
  if (parsed?.linkedinUrl && !String(parsed.linkedinUrl).includes("linkedin.com")) suspicious.push("linkedin_incomplete");
  if (experiences.some((item) => !item.company || !item.role || !item.dates)) suspicious.push("experience_incomplete");
  if (education.some((item) => !item.school && !item.degree)) suspicious.push("education_incomplete");
  const status = missing.length >= 3 || suspicious.length >= 2 ? "needs_review" : missing.length || suspicious.length ? "partial" : "extracted";
  return {
    status,
    missing,
    suspicious,
    score: Math.max(0, 100 - missing.length * 12 - suspicious.length * 10),
    counts: {
      skills: skills.length,
      experiences: experiences.length,
      education: education.length,
      certifications: certifications.length
    }
  };
}

function summarizeCvParsed(parsed) {
  return {
    firstName: parsed?.firstName || "",
    lastName: parsed?.lastName || "",
    email: parsed?.email || "",
    phone: parsed?.phone || "",
    linkedinUrl: parsed?.linkedinUrl || "",
    location: parsed?.location || "",
    headline: parsed?.headline || "",
    summary: parsed?.summary || "",
    skills: Array.isArray(parsed?.skills) ? parsed.skills.filter(Boolean).slice(0, 40) : [],
    experiences: Array.isArray(parsed?.experiences) ? parsed.experiences.slice(0, 8) : [],
    educationItems: Array.isArray(parsed?.educationItems) ? parsed.educationItems.slice(0, 8) : [],
    certifications: Array.isArray(parsed?.certifications) ? parsed.certifications.slice(0, 12) : []
  };
}

async function ensureCvStorageSchema() {
  const statements = [
    "ALTER TABLE cvs ADD COLUMN IF NOT EXISTS file_name TEXT NOT NULL DEFAULT 'CV importé'",
    "ALTER TABLE cvs ADD COLUMN IF NOT EXISTS source_text TEXT NOT NULL DEFAULT ''",
    "ALTER TABLE cvs ADD COLUMN IF NOT EXISTS parsed_json TEXT NOT NULL DEFAULT '{}'"
  ];
  for (const statement of statements) {
    await db.query(statement);
  }
}

async function getAdminCvRows() {
  try {
    await ensureCvStorageSchema();
    const { rows } = await db.query(
      "SELECT id, user_id, created_at, file_name, source_text, parsed_json FROM cvs ORDER BY created_at DESC LIMIT 500"
    );
    return rows;
  } catch (error) {
    const { rows } = await db.query("SELECT id, user_id, created_at FROM cvs ORDER BY created_at DESC LIMIT 500");
    return rows.map((row) => ({
      ...row,
      file_name: "CV importé",
      source_text: "",
      parsed_json: "{}"
    }));
  }
}

function getMatchPayloadSummary(payload) {
  const job = payload?.jobReview || payload?.offer || {};
  const insights = payload?.matchInsights || payload?.analysis || {};
  return {
    title: job.title || "",
    company: job.company || "",
    location: job.location || "",
    sector: job.sector || "",
    score: insights.score ?? null,
    technicalSkills: Array.isArray(job.skills) ? job.skills : [],
    missingKeywords: Array.isArray(insights.missingKeywords) ? insights.missingKeywords : [],
    strengths: Array.isArray(insights.strengths) ? insights.strengths : [],
    recommendation: insights.recommendation || ""
  };
}

function sanitizeProfilePatch(rawPatch = {}) {
  const patch = {};

  if (Object.prototype.hasOwnProperty.call(rawPatch, "headline")) patch.headline = coerceString(rawPatch.headline);
  if (Object.prototype.hasOwnProperty.call(rawPatch, "location")) patch.location = coerceString(rawPatch.location);
  if (Object.prototype.hasOwnProperty.call(rawPatch, "targetRole")) patch.targetRole = coerceString(rawPatch.targetRole);
  if (Object.prototype.hasOwnProperty.call(rawPatch, "sector")) patch.sector = coerceString(rawPatch.sector);
  if (Object.prototype.hasOwnProperty.call(rawPatch, "experienceYears")) {
    patch.experienceYears = coerceInteger(rawPatch.experienceYears);
  }
  if (Object.prototype.hasOwnProperty.call(rawPatch, "education")) patch.education = coerceString(rawPatch.education);
  if (Object.prototype.hasOwnProperty.call(rawPatch, "skills")) patch.skills = normalizeSkillList(rawPatch.skills);
  if (Object.prototype.hasOwnProperty.call(rawPatch, "languages")) patch.languages = normalizeSkillList(rawPatch.languages);
  if (Object.prototype.hasOwnProperty.call(rawPatch, "onboardingQuizSeen")) {
    patch.onboardingQuizSeen = Boolean(rawPatch.onboardingQuizSeen);
  }

  return patch;
}

function sanitizeCandidateDetails(raw = {}) {
  return {
    currentTitle: coerceString(raw.currentTitle),
    targetRole: coerceString(raw.targetRole),
    experienceYears: coerceInteger(raw.experienceYears),
    schoolName: coerceString(raw.schoolName),
    studyLevel: coerceString(raw.studyLevel),
    graduationYear: raw.graduationYear ? coerceInteger(raw.graduationYear) : null,
    contractPreference: coerceString(raw.contractPreference),
    availability: coerceString(raw.availability),
    portfolioUrl: coerceString(raw.portfolioUrl),
    linkedinUrl: coerceString(raw.linkedinUrl)
  };
}

function sanitizeRecruiterDetails(raw = {}) {
  return {
    organizationName: coerceString(raw.organizationName),
    recruiterRole: coerceString(raw.recruiterRole),
    hiringVolume: coerceString(raw.hiringVolume),
    industry: coerceString(raw.industry),
    website: coerceString(raw.website)
  };
}

function sanitizeOrgDetails(raw = {}, accountType = "other") {
  return {
    organizationName: coerceString(raw.organizationName),
    organizationType: coerceString(raw.organizationType || accountType),
    department: coerceString(raw.department),
    website: coerceString(raw.website),
    sizeRange: coerceString(raw.sizeRange),
    industry: coerceString(raw.industry),
    contactRole: coerceString(raw.contactRole),
    notes: coerceString(raw.notes)
  };
}

function sanitizeOnboardingPayload(accountType, onboarding = {}) {
  const cleanType = sanitizeAccountType(accountType);
  const base = {
    phone: coerceString(onboarding.phone),
    city: coerceString(onboarding.city),
    country: coerceString(onboarding.country),
    onboardingCompleted: onboarding.onboardingCompleted === false ? 0 : 1
  };

  const rawDetails = onboarding.details || {};
  if (CANDIDATE_TYPES.has(cleanType)) {
    return { accountType: cleanType, base, details: sanitizeCandidateDetails(rawDetails) };
  }
  if (RECRUITER_TYPES.has(cleanType)) {
    return { accountType: cleanType, base, details: sanitizeRecruiterDetails(rawDetails) };
  }
  return { accountType: cleanType, base, details: sanitizeOrgDetails(rawDetails, cleanType) };
}

function applyOnboardingToProfile(profile, accountType, details) {
  const next = { ...profile };
  if (CANDIDATE_TYPES.has(accountType)) {
    if (!next.headline && details.currentTitle) next.headline = details.currentTitle;
    if (!next.targetRole && details.targetRole) next.targetRole = details.targetRole;
    if (!next.experienceYears && details.experienceYears) next.experienceYears = details.experienceYears;
    if (!next.education && details.studyLevel) next.education = details.studyLevel;
  }
  return next;
}

async function fetchRemoteAvatarAsDataUrl(url) {
  const remoteUrl = coerceString(url);
  if (!remoteUrl.startsWith("https://")) return "";

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const response = await fetch(remoteUrl, { signal: controller.signal });
    clearTimeout(timeout);
    if (!response.ok) return "";

    const contentType = response.headers.get("content-type") || "image/jpeg";
    if (!contentType.startsWith("image/")) return "";

    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.length > 2_000_000) return "";

    return `data:${contentType};base64,${buffer.toString("base64")}`;
  } catch (_error) {
    return "";
  }
}

function normalizeAvatarDataUrl(value) {
  const dataUrl = coerceString(value);
  if (!dataUrl) return "";
  if (!dataUrl.startsWith("data:image/")) {
    throw new Error("Format d'image non supporté.");
  }
  if (dataUrl.length > 2_400_000) {
    throw new Error("Image trop volumineuse (max 2 Mo recommandés).");
  }
  return dataUrl;
}

function cleanExtractedText(value) {
  return String(value || "")
    .replace(/\u0000/g, "")
    .replace(/\r\n/g, "\n")
    .replace(/[\u0001-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, " ")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function bufferFromBase64(value) {
  const raw = String(value || "");
  const base64 = raw.includes(",") ? raw.split(",").pop() : raw;
  if (!base64) throw new Error("Fichier vide.");
  const buffer = Buffer.from(base64, "base64");
  if (!buffer.length) throw new Error("Fichier vide.");
  if (buffer.length > 8 * 1024 * 1024) {
    throw new Error("Fichier trop lourd. Maximum 8 Mo.");
  }
  return buffer;
}

async function extractTextFromUpload({ fileName, mimeType, base64 }) {
  const name = coerceString(fileName).toLowerCase();
  const type = coerceString(mimeType).toLowerCase();
  const buffer = bufferFromBase64(base64);

  if (name.endsWith(".pdf") || type.includes("pdf")) {
    const parser = new PDFParse({ data: buffer });
    try {
      const output = await parser.getText();
      return cleanExtractedText(output.text);
    } finally {
      await parser.destroy();
    }
  }

  if (name.endsWith(".docx") || type.includes("officedocument.wordprocessingml")) {
    const output = await mammoth.extractRawText({ buffer });
    return cleanExtractedText(output.value);
  }

  if (name.endsWith(".doc") || type.includes("msword")) {
    throw new Error("Le format .doc ancien n'est pas supporté. Convertis le fichier en .docx puis réimporte le CV.");
  }

  return cleanExtractedText(buffer.toString("utf8"));
}

const CV_EXTRACTION_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    firstName: { type: "string" },
    lastName: { type: "string" },
    email: { type: "string" },
    phone: { type: "string" },
    linkedinUrl: { type: "string" },
    portfolioUrl: { type: "string" },
    location: { type: "string" },
    headline: { type: "string" },
    summary: { type: "string" },
    experienceYears: { type: "number" },
    skills: { type: "array", items: { type: "string" } },
    softSkills: { type: "array", items: { type: "string" } },
    languages: { type: "array", items: { type: "string" } },
    experiences: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          company: { type: "string" },
          role: { type: "string" },
          dates: { type: "string" },
          location: { type: "string" },
          description: { type: "string" }
        },
        required: ["company", "role", "dates", "location", "description"]
      }
    },
    education: { type: "string" },
    educationItems: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          school: { type: "string" },
          degree: { type: "string" },
          dates: { type: "string" },
          location: { type: "string" },
          description: { type: "string" }
        },
        required: ["school", "degree", "dates", "location", "description"]
      }
    },
    certifications: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          name: { type: "string" },
          issuer: { type: "string" },
          date: { type: "string" },
          url: { type: "string" }
        },
        required: ["name", "issuer", "date", "url"]
      }
    },
    projects: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          name: { type: "string" },
          role: { type: "string" },
          technologies: { type: "array", items: { type: "string" } },
          description: { type: "string" },
          url: { type: "string" }
        },
        required: ["name", "role", "technologies", "description", "url"]
      }
    },
    interests: { type: "array", items: { type: "string" } },
    extractionWarnings: { type: "array", items: { type: "string" } }
  },
  required: [
    "firstName",
    "lastName",
    "email",
    "phone",
    "linkedinUrl",
    "portfolioUrl",
    "location",
    "headline",
    "summary",
    "experienceYears",
    "skills",
    "softSkills",
    "languages",
    "experiences",
    "education",
    "educationItems",
    "certifications",
    "projects",
    "interests",
    "extractionWarnings"
  ]
};

function aiExtractionConfig() {
  if (AI_PROVIDER === "groq") {
    return {
      provider: "groq",
      apiKey: GROQ_API_KEY || XAI_API_KEY,
      model: AI_MODEL || "openai/gpt-oss-120b",
      url: "https://api.groq.com/openai/v1/chat/completions"
    };
  }
  if (AI_PROVIDER === "xai" || AI_PROVIDER === "grok") {
    return {
      provider: "xai",
      apiKey: XAI_API_KEY,
      model: AI_MODEL || "grok-4.3",
      url: "https://api.x.ai/v1/chat/completions"
    };
  }
  if (AI_PROVIDER === "openai") {
    return {
      provider: "openai",
      apiKey: OPENAI_API_KEY,
      model: AI_MODEL || "gpt-4.1-mini",
      url: "https://api.openai.com/v1/chat/completions"
    };
  }
  return null;
}

function normalizeAiList(value, max = 40) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map((item) => coerceString(item)).filter(Boolean))].slice(0, max);
}

function normalizeAiCollection(value, fields, max = 12) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item) => item && typeof item === "object")
    .slice(0, max)
    .map((item) => {
      const normalized = {};
      for (const field of fields) {
        normalized[field] = Array.isArray(item[field]) ? normalizeAiList(item[field], 16) : coerceString(item[field]);
      }
      return normalized;
    });
}

function sanitizeAiCvExtraction(raw) {
  const parsed = raw && typeof raw === "object" ? raw : {};
  return {
    firstName: coerceString(parsed.firstName),
    lastName: coerceString(parsed.lastName).toUpperCase(),
    email: normalizeEmail(parsed.email),
    phone: coerceString(parsed.phone),
    linkedinUrl: coerceString(parsed.linkedinUrl),
    portfolioUrl: coerceString(parsed.portfolioUrl),
    location: coerceString(parsed.location),
    headline: coerceString(parsed.headline),
    summary: coerceString(parsed.summary),
    experienceYears: Math.max(0, Number(parsed.experienceYears || 0)),
    skills: normalizeAiList(parsed.skills, 60),
    softSkills: normalizeAiList(parsed.softSkills, 30),
    languages: normalizeAiList(parsed.languages, 20),
    experiences: normalizeAiCollection(parsed.experiences, ["company", "role", "dates", "location", "description"], 12),
    education: coerceString(parsed.education),
    educationItems: normalizeAiCollection(parsed.educationItems, ["school", "degree", "dates", "location", "description"], 8),
    certifications: normalizeAiCollection(parsed.certifications, ["name", "issuer", "date", "url"], 12),
    projects: normalizeAiCollection(parsed.projects, ["name", "role", "technologies", "description", "url"], 10),
    interests: normalizeAiList(parsed.interests, 20),
    extractionWarnings: normalizeAiList(parsed.extractionWarnings, 10),
    extractionMode: "ai"
  };
}

const JOB_EXTRACTION_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    title: { type: "string" },
    company: { type: "string" },
    location: { type: "string" },
    contract: { type: "string" },
    sector: { type: "string" },
    experienceMin: { type: "number" },
    education: { type: "string" },
    skills: { type: "array", items: { type: "string" } },
    softSkills: { type: "array", items: { type: "string" } },
    description: { type: "string" },
    missions: { type: "array", items: { type: "string" } }
  },
  required: [
    "title",
    "company",
    "location",
    "contract",
    "sector",
    "experienceMin",
    "education",
    "skills",
    "softSkills",
    "description",
    "missions"
  ]
};

const JOB_SOFT_SKILLS = [
  "communication",
  "collaboration",
  "autonomie",
  "rigueur",
  "curiosité",
  "leadership",
  "organisation",
  "analyse",
  "esprit critique",
  "résolution de problèmes",
  "pédagogie",
  "adaptabilité"
];

function extractLocalJobSummary(text) {
  const raw = cleanExtractedText(text);
  const normalized = normalizeText(raw);
  const lines = raw.split(/\n+/).map((line) => line.trim()).filter(Boolean);
  const skills = SKILL_KEYWORDS.filter((skill) => {
    const normalizedSkill = normalizeText(skill);
    if (normalizedSkill.length <= 2) {
      return new RegExp(`(^|[^a-z0-9])${escapeRegex(normalizedSkill)}([^a-z0-9]|$)`, "i").test(normalized);
    }
    return normalized.includes(normalizedSkill);
  });
  const softSkills = JOB_SOFT_SKILLS.filter((skill) => normalized.includes(normalizeText(skill)));
  const yearsMatch = normalized.match(/(\d+)\s*(ans|an|years|year)/);
  const companyLine = lines.find((line) => /entreprise\s*:|soci[eé]t[eé]\s*:|company\s*:|chez\s+/i.test(line));
  const titleLine =
    lines.find((line) => /data|analyst|engineer|developpeur|développeur|chef de projet|manager|consultant|architecte|alternance|stage/i.test(line) && line.length <= 120) ||
    lines[0] ||
    "Poste personnalisé";
  const description = lines.filter((line) => line.length > 60).slice(0, 6).join(" ") || raw.slice(0, 700);
  return {
    id: "custom-offer",
    title: titleLine,
    company: companyLine ? companyLine.replace(/.*(?:entreprise\s*:|soci[eé]t[eé]\s*:|company\s*:|chez)\s*/i, "").split(/[,.]/)[0].trim() : "Entreprise non précisée",
    location: lines.find((line) => /(paris|lyon|nantes|lille|marseille|toulouse|bordeaux|france|remote|télétravail|teletravail)/i.test(normalizeText(line))) || "Non précisé",
    contract: lines.find((line) => /\b(cdi|cdd|stage|alternance|freelance|intérim|interim)\b/i.test(normalizeText(line))) || "À définir",
    premium: false,
    sector: "Général",
    experienceMin: yearsMatch ? Number(yearsMatch[1]) : 0,
    education: EDUCATION_LEVELS.find((level) => normalized.includes(normalizeText(level))) || "",
    skills: uniqueByNormalized(skills).slice(0, 14),
    softSkills: uniqueByNormalized(softSkills).slice(0, 10),
    description,
    missions: lines.filter((line) => /^[-•+]/.test(line) || /\b(vous serez|mission|responsabilit|contribu|particip|développ|developp|analy)/i.test(line)).slice(0, 8)
  };
}

function sanitizeAiJobExtraction(raw, sourceText) {
  const parsed = raw && typeof raw === "object" ? raw : {};
  const fallback = extractLocalJobSummary(sourceText);
  const normalizedSource = normalizeText(sourceText);
  const aiSkills = normalizeAiList(parsed.skills, 20).filter((skill) => {
    const normalizedSkill = normalizeText(skill);
    if (normalizedSkill.length <= 2) {
      return new RegExp(`(^|[^a-z0-9])${escapeRegex(normalizedSkill)}([^a-z0-9]|$)`, "i").test(normalizedSource);
    }
    return true;
  });
  const detectedSkills = SKILL_KEYWORDS.filter((skill) => {
    const normalizedSkill = normalizeText(skill);
    if (normalizedSkill.length <= 2) {
      return new RegExp(`(^|[^a-z0-9])${escapeRegex(normalizedSkill)}([^a-z0-9]|$)`, "i").test(normalizedSource);
    }
    return normalizedSource.includes(normalizedSkill);
  });
  const skills = uniqueByNormalized([...aiSkills, ...detectedSkills, ...(fallback.skills || [])])
    .filter((skill) => {
      const normalizedSkill = normalizeText(skill);
      if (normalizedSkill.length <= 2) {
        return new RegExp(`(^|\\s|[,;/|])${escapeRegex(normalizedSkill)}($|\\s|[,;/|])`, "i").test(normalizedSource);
      }
      return true;
    })
    .slice(0, 18);

  return {
    id: "custom-offer",
    title: coerceString(parsed.title) || fallback.title,
    company: coerceString(parsed.company) || fallback.company,
    location: coerceString(parsed.location) || fallback.location,
    contract: coerceString(parsed.contract) || fallback.contract,
    premium: false,
    sector: coerceString(parsed.sector) || fallback.sector,
    experienceMin: Math.max(0, Number(parsed.experienceMin || fallback.experienceMin || 0)),
    education: coerceString(parsed.education) || fallback.education,
    skills,
    softSkills: uniqueByNormalized([...normalizeAiList(parsed.softSkills, 14), ...(fallback.softSkills || [])]).slice(0, 12),
    description: coerceString(parsed.description) || fallback.description,
    missions: normalizeAiList(parsed.missions, 10).length ? normalizeAiList(parsed.missions, 10) : fallback.missions
  };
}

async function extractJobWithAi(sourceText) {
  const config = aiExtractionConfig();
  if (!config?.apiKey) return null;

  const messages = [
    {
      role: "system",
      content:
        "Tu es un parseur ATS senior spécialisé dans les offres d'emploi françaises et anglaises. Tu extrais un résumé structuré pour matcher un CV avec une offre. Réponds uniquement en JSON. N'invente pas l'entreprise, le contrat ou le lieu si ce n'est pas indiqué."
    },
    {
      role: "user",
      content:
        "Analyse cette offre d'emploi. Extrais: titre du poste, entreprise, lieu, contrat, secteur, années d'expérience minimum, niveau d'étude, compétences techniques, soft skills, description synthétique fidèle et missions principales. Le titre ne doit pas être une phrase longue de contexte; choisis le vrai intitulé du poste si présent.\n\n" +
        `OFFRE:\n${cleanExtractedText(sourceText).slice(0, 60000)}`
    }
  ];

  async function callAi(responseFormat) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);
    try {
      const response = await fetch(config.url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          "Content-Type": "application/json"
        },
        signal: controller.signal,
        body: JSON.stringify({
          model: config.model,
          temperature: 0.05,
          messages,
          response_format: responseFormat
        })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error?.message || "Extraction IA du poste indisponible.");
      }
      return JSON.parse(data.choices?.[0]?.message?.content || "{}");
    } finally {
      clearTimeout(timeout);
    }
  }

  try {
    return sanitizeAiJobExtraction(
      await callAi({
        type: "json_schema",
        json_schema: {
          name: "job_offer_extraction",
          strict: false,
          schema: JOB_EXTRACTION_SCHEMA
        }
      }),
      sourceText
    );
  } catch (_schemaError) {
    return sanitizeAiJobExtraction(await callAi({ type: "json_object" }), sourceText);
  }
}

const MATCH_ANALYSIS_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    score: { type: "number" },
    verdict: { type: "string" },
    strengths: { type: "array", items: { type: "string" } },
    missingKeywords: { type: "array", items: { type: "string" } },
    culturalFit: { type: "string" },
    recommendations: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          level: { type: "string" },
          title: { type: "string" },
          detail: { type: "string" }
        },
        required: ["level", "title", "detail"]
      }
    }
  },
  required: ["score", "verdict", "strengths", "missingKeywords", "culturalFit", "recommendations"]
};

const RECOMMENDATION_LEVELS = new Set(["critique", "important", "bonus"]);

function sanitizeAiMatchAnalysis(raw, { candidate, offer }) {
  const fallback = buildLocalMatchInsights({ candidate, offer });
  const parsed = raw && typeof raw === "object" ? raw : {};

  const score = Number.isFinite(Number(parsed.score)) ? Math.max(0, Math.min(100, Math.round(Number(parsed.score)))) : fallback.score;
  const strengths = normalizeAiList(parsed.strengths, 8);
  const missingKeywords = uniqueByNormalized([...normalizeAiList(parsed.missingKeywords, 14), ...fallback.missingKeywords]).slice(0, 14);
  const culturalFit = coerceString(parsed.culturalFit);

  const recommendations = Array.isArray(parsed.recommendations)
    ? parsed.recommendations
        .filter((item) => item && typeof item === "object" && coerceString(item.title) && coerceString(item.detail))
        .slice(0, 6)
        .map((item) => ({
          level: RECOMMENDATION_LEVELS.has(coerceString(item.level)) ? coerceString(item.level) : "important",
          title: coerceString(item.title),
          detail: coerceString(item.detail)
        }))
    : [];

  return {
    score,
    verdict: coerceString(parsed.verdict) || fallback.verdict,
    strengths: strengths.length ? strengths : fallback.strengths,
    missingKeywords,
    culturalFit: culturalFit || fallback.culturalFit,
    recommendations: recommendations.length ? recommendations : fallback.recommendations
  };
}

async function analyzeMatchWithAi(candidate, offer) {
  const config = aiExtractionConfig();
  if (!config?.apiKey) return null;

  const candidateName = [candidate?.firstName, candidate?.lastName].filter(Boolean).join(" ").trim();

  const messages = [
    {
      role: "system",
      content:
        "Vous êtes un expert recrutement et carriere. Vous comparez un profil candidat a une offre d'emploi et vous produisez une analyse de matching honnete, actionnable et en francais. Repondez uniquement en JSON. Le score reflete la compatibilite reelle (0-100). N'inventez pas de mots-cles absents de l'offre ou du profil. Ecrivez dans un style naturel et personnalise, jamais generique ou robotique."
    },
    {
      role: "user",
      content:
        "Compare ce profil candidat a cette offre. Produis : un score de compatibilite (0-100), un verdict court (ex: Match Excellent, Bon match, Match moyen, A renforcer), 3 a 6 points forts concrets du candidat par rapport a l'offre, les mots-cles/competences demandes par l'offre qui manquent chez le candidat, une analyse du fit culturel en 5 a 7 phrases (adequation entre le parcours, les soft skills et les valeurs du candidat d'une part, et la culture/le contexte/le mode de fonctionnement de l'entreprise d'autre part ; developpe des exemples concrets tires du profil, nuance les points de vigilance eventuels, ne te limite pas a une ou deux phrases), et 3 a 5 recommandations strategiques classees par niveau (critique, important, bonus) pour ameliorer ses chances.\n" +
        (candidateName
          ? `Le candidat s'appelle ${candidateName}. Utilise son prenom (ou prenom + nom) dans le texte, notamment dans le fit culturel et les points forts, plutot que des formules generiques comme "le candidat" ou "la candidate".\n`
          : "") +
        "\n" +
        `PROFIL CANDIDAT:\n${JSON.stringify(candidate).slice(0, 12000)}\n\n` +
        `OFFRE:\n${JSON.stringify(offer).slice(0, 12000)}`
    }
  ];

  async function callAi(responseFormat) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);
    try {
      const response = await fetch(config.url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          "Content-Type": "application/json"
        },
        signal: controller.signal,
        body: JSON.stringify({
          model: config.model,
          temperature: 0.2,
          messages,
          response_format: responseFormat
        })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error?.message || "Analyse IA du matching indisponible.");
      }
      return JSON.parse(data.choices?.[0]?.message?.content || "{}");
    } finally {
      clearTimeout(timeout);
    }
  }

  try {
    return sanitizeAiMatchAnalysis(
      await callAi({
        type: "json_schema",
        json_schema: {
          name: "match_analysis",
          strict: false,
          schema: MATCH_ANALYSIS_SCHEMA
        }
      }),
      { candidate, offer }
    );
  } catch (_schemaError) {
    return sanitizeAiMatchAnalysis(await callAi({ type: "json_object" }), { candidate, offer });
  }
}

const COVER_LETTER_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    subject: { type: "string" },
    letter: { type: "string" }
  },
  required: ["subject", "letter"]
};

const TONE_LABELS = {
  fr: { formal: "formel et professionnel", enthusiastic: "enthousiaste et energique", direct: "direct et concis" },
  en: { formal: "formal and professional", enthusiastic: "enthusiastic and energetic", direct: "direct and concise" }
};

function buildLocalCoverLetter(candidate, offer, language) {
  const candidateName = [candidate?.firstName, candidate?.lastName].filter(Boolean).join(" ").trim() || "";
  const skills = (candidate?.skills || []).slice(0, 3).join(", ");
  const title = offer?.title || "";
  const company = offer?.company || "";

  if (language === "en") {
    return {
      subject: `Application for ${title || "the position"}${company ? ` at ${company}` : ""}`,
      letter:
        `Dear Hiring Manager,\n\n` +
        `I am writing to apply for the ${title || "position"} role${company ? ` at ${company}` : ""}. ` +
        `With hands-on experience in ${skills || "the relevant skills for this role"}, I am confident I can contribute quickly and meaningfully to your team.\n\n` +
        `I would welcome the opportunity to discuss how my background aligns with your needs.\n\n` +
        `Sincerely,\n${candidateName}`
    };
  }

  return {
    subject: `Candidature au poste de ${title || "poste visé"}${company ? ` chez ${company}` : ""}`,
    letter:
      `Madame, Monsieur,\n\n` +
      `Je me permets de vous adresser ma candidature pour le poste de ${title || "poste visé"}${company ? ` au sein de ${company}` : ""}. ` +
      `Fort(e) d'une expérience concrète en ${skills || "compétences pertinentes pour ce poste"}, je suis convaincu(e) de pouvoir apporter rapidement une contribution utile à votre équipe.\n\n` +
      `Je serais ravi(e) d'échanger avec vous pour vous exposer plus en détail ma motivation et mon parcours.\n\n` +
      `Cordialement,\n${candidateName}`
  };
}

function sanitizeAiCoverLetter(raw, { candidate, offer, language }) {
  const parsed = raw && typeof raw === "object" ? raw : {};
  const fallback = buildLocalCoverLetter(candidate, offer, language);
  const letter = coerceString(parsed.letter);
  return {
    subject: coerceString(parsed.subject) || fallback.subject,
    letter: letter.length > 40 ? letter : fallback.letter
  };
}

async function generateCoverLetterWithAi(candidate, offer, tone, language) {
  const config = aiExtractionConfig();
  if (!config?.apiKey) return null;

  const candidateName = [candidate?.firstName, candidate?.lastName].filter(Boolean).join(" ").trim();
  const toneLabel = TONE_LABELS[language]?.[tone] || TONE_LABELS.fr[tone] || TONE_LABELS.fr.formal;
  const langLabel = language === "en" ? "in English" : "en francais";

  const messages = [
    {
      role: "system",
      content:
        "Tu es un coach carriere expert en redaction de lettres de motivation percutantes. Tu ecris des lettres personnalisees, jamais generiques, qui s'appuient sur de vrais elements du profil et de l'offre. Reponds uniquement en JSON."
    },
    {
      role: "user",
      content:
        `Redige une lettre de motivation complete, sur un ton ${toneLabel}, ${langLabel}, entre 220 et 320 mots. ` +
        "Mentionne 2 a 3 elements concrets et verifiables du profil du candidat en lien direct avec l'offre (competences, experiences, resultats). " +
        "Evite les formules toutes faites et les cliches. Structure la lettre en paragraphes clairs (accroche, valeur ajoutee, motivation, conclusion), termine par une formule de politesse et la signature." +
        (candidateName ? ` Le candidat s'appelle ${candidateName}, signe la lettre avec ce nom.` : "") +
        "\n\n" +
        `PROFIL CANDIDAT:\n${JSON.stringify(candidate).slice(0, 10000)}\n\n` +
        `OFFRE:\n${JSON.stringify(offer).slice(0, 10000)}`
    }
  ];

  async function callAi(responseFormat) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);
    try {
      const response = await fetch(config.url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          "Content-Type": "application/json"
        },
        signal: controller.signal,
        body: JSON.stringify({
          model: config.model,
          temperature: 0.55,
          messages,
          response_format: responseFormat
        })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error?.message || "Generation IA de la lettre indisponible.");
      }
      return JSON.parse(data.choices?.[0]?.message?.content || "{}");
    } finally {
      clearTimeout(timeout);
    }
  }

  try {
    return sanitizeAiCoverLetter(
      await callAi({
        type: "json_schema",
        json_schema: { name: "cover_letter", strict: false, schema: COVER_LETTER_SCHEMA }
      }),
      { candidate, offer, language }
    );
  } catch (_schemaError) {
    return sanitizeAiCoverLetter(await callAi({ type: "json_object" }), { candidate, offer, language });
  }
}

const CV_ATS_OPTIMIZATION_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    optimizedHeadline: { type: "string" },
    optimizedSummary: { type: "string" },
    experiences: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          company: { type: "string" },
          role: { type: "string" },
          optimizedDescription: { type: "string" }
        },
        required: ["company", "role", "optimizedDescription"]
      }
    },
    prioritizedSkills: { type: "array", items: { type: "string" } },
    missingKeywords: { type: "array", items: { type: "string" } },
    atsNotes: { type: "string" }
  },
  required: ["optimizedHeadline", "optimizedSummary", "experiences", "prioritizedSkills", "missingKeywords", "atsNotes"]
};

// Garde-fou anti-fabrication : même si le prompt l'interdit déjà, on ne fait
// jamais confiance aveuglément à une sortie IA pour un document aussi
// sensible qu'un CV. On force prioritizedSkills à rester un sous-ensemble
// des compétences réellement présentes dans le CV d'origine (aucune
// compétence "inventée" ne peut donc jamais atterrir dans le CV du candidat),
// et missingKeywords ne peut contenir que des mots-clés qui n'y figurent pas
// déjà (évite les doublons/incohérences).
function sanitizeAiCvOptimization(raw, { candidate, offer }) {
  const parsed = raw && typeof raw === "object" ? raw : {};
  const originalSkills = uniqueByNormalized([...(candidate?.skills || []), ...(candidate?.softSkills || [])]);
  const originalSkillsNormalized = new Set(originalSkills.map((skill) => normalizeText(skill)));
  const originalExperiences = Array.isArray(candidate?.experiences) ? candidate.experiences : [];

  const prioritizedSkills = Array.isArray(parsed.prioritizedSkills)
    ? uniqueByNormalized(parsed.prioritizedSkills.map((skill) => coerceString(skill)).filter((skill) => originalSkillsNormalized.has(normalizeText(skill))))
    : originalSkills;
  // Complète avec les compétences réelles qui n'auraient pas été reprises
  // par l'IA, pour ne jamais perdre une compétence existante du candidat.
  const finalSkills = uniqueByNormalized([...prioritizedSkills, ...originalSkills]);

  const missingKeywords = Array.isArray(parsed.missingKeywords)
    ? uniqueByNormalized(parsed.missingKeywords.map((skill) => coerceString(skill)).filter((skill) => skill && !originalSkillsNormalized.has(normalizeText(skill))))
    : [];

  const experiences = Array.isArray(parsed.experiences)
    ? parsed.experiences
        .map((item) => {
          const company = coerceString(item?.company);
          const match = originalExperiences.find((exp) => normalizeText(exp.company) === normalizeText(company));
          const optimizedDescription = coerceString(item?.optimizedDescription);
          // On ne garde une réécriture que si une expérience du même nom
          // existe réellement dans le CV d'origine — impossible d'injecter
          // une expérience fictive via cette réponse.
          if (!match || !optimizedDescription) return null;
          return { company: match.company, role: match.role || coerceString(item?.role), optimizedDescription };
        })
        .filter(Boolean)
    : [];

  return {
    optimizedHeadline: coerceString(parsed.optimizedHeadline) || coerceString(candidate?.headline),
    optimizedSummary: coerceString(parsed.optimizedSummary) || coerceString(candidate?.summary),
    experiences,
    prioritizedSkills: finalSkills,
    missingKeywords,
    atsNotes: coerceString(parsed.atsNotes)
  };
}

async function generateCvAtsOptimizationWithAi(candidate, offer, language) {
  const config = aiExtractionConfig();
  if (!config?.apiKey) return null;

  const langLabel = language === "en" ? "in English" : "en francais";

  const messages = [
    {
      role: "system",
      content:
        "Tu es un expert CV et systemes ATS (Applicant Tracking System). Ta mission: reformuler un CV existant pour qu'il soit mieux lu par les ATS et mieux aligne avec une offre precise, SANS JAMAIS inventer une competence, un outil, une experience, un diplome ou un resultat chiffre absent du CV fourni. Tu peux reformuler ce qui existe deja avec un vocabulaire plus standard et aligne aux mots-cles du poste, reordonner les competences existantes pour mettre en avant celles qui matchent l'offre, et signaler separement les mots-cles demandes par l'offre qui manquent reellement au CV (sans jamais les ajouter au CV lui-meme). Reponds uniquement en JSON."
    },
    {
      role: "user",
      content:
        `Optimise ce CV pour le poste vise, ${langLabel}. Reformule l'accroche (headline), le resume (summary) et la description de chaque experience listee, en gardant strictement les memes faits (memes entreprises, memes missions, memes resultats) mais avec une formulation plus percutante et des mots-cles du poste quand c'est honnetement applicable. Propose un ordre de competences (prioritizedSkills) qui met en avant celles qui matchent le poste — n'invente aucune nouvelle competence. Liste separement dans missingKeywords les competences demandees par l'offre qui ne sont vraiment pas dans le CV. Ajoute une note atsNotes de 1-2 phrases expliquant les changements cles.\n\n` +
        `CV ORIGINAL:\n${JSON.stringify(candidate).slice(0, 12000)}\n\n` +
        `OFFRE VISEE:\n${JSON.stringify(offer).slice(0, 6000)}`
    }
  ];

  async function callAi(responseFormat) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);
    try {
      const response = await fetch(config.url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          "Content-Type": "application/json"
        },
        signal: controller.signal,
        body: JSON.stringify({
          model: config.model,
          temperature: 0.3,
          messages,
          response_format: responseFormat
        })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error?.message || "Optimisation ATS indisponible.");
      }
      return JSON.parse(data.choices?.[0]?.message?.content || "{}");
    } finally {
      clearTimeout(timeout);
    }
  }

  let raw;
  try {
    raw = await callAi({
      type: "json_schema",
      json_schema: { name: "cv_ats_optimization", strict: false, schema: CV_ATS_OPTIMIZATION_SCHEMA }
    });
  } catch (_schemaError) {
    raw = await callAi({ type: "json_object" });
  }
  return sanitizeAiCvOptimization(raw, { candidate, offer });
}

const NEGOTIATION_REPLY_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    reply: { type: "string" },
    tip: { type: "string" }
  },
  required: ["reply", "tip"]
};

const NEGOTIATION_SUMMARY_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    summary: { type: "string" },
    strengths: { type: "array", items: { type: "string" } },
    improvements: { type: "array", items: { type: "string" } }
  },
  required: ["summary", "strengths", "improvements"]
};

function localNegotiationReply(language) {
  return language === "en"
    ? {
        reply: "Thank you for sharing that. I'll need to check this with the team before confirming a final number.",
        tip: "Back up your request with a specific, measurable achievement or market data point."
      }
    : {
        reply: "Merci pour ces precisions. Je dois en discuter avec l'equipe avant de valider un montant definitif.",
        tip: "Appuyez votre demande sur un resultat chiffre concret ou une donnee de marche precise."
      };
}

function localNegotiationSummary(language) {
  return language === "en"
    ? {
        summary: "You engaged in the negotiation and made your case. Keep practicing to sharpen your arguments.",
        strengths: ["You stayed engaged in the conversation"],
        improvements: ["Use more concrete numbers and market benchmarks to support your ask"]
      }
    : {
        summary: "Vous avez tenu votre position pendant la negociation. Continuez a vous entrainer pour affiner vos arguments.",
        strengths: ["Vous etes reste(e) engage(e) dans l'echange"],
        improvements: ["Appuyez davantage vos demandes sur des chiffres et des reperes de marche"]
      };
}

async function negotiationReplyWithAi(candidate, offer, history, options = {}) {
  const config = aiExtractionConfig();
  if (!config?.apiKey) return null;

  const language = options.language === "en" ? "en" : "fr";
  const finish = Boolean(options.finish);
  const targetSalary = coerceString(options.targetSalary);
  const currencyLabel = coerceString(options.currencyLabel) || "EUR (€)";

  const systemPrompt =
    "Tu es un(e) responsable recrutement/RH realiste qui negocie un salaire avec un(e) candidat(e) pour le poste decrit. " +
    "Vous etes ferme mais correct, vous tenez compte du budget implicite de l'offre et du marche, vous ne cedez pas facilement mais vous restez respectueux et professionnel. " +
    `Exprime systematiquement tous les montants en ${currencyLabel}, jamais dans une autre devise. ` +
    "Reponds uniquement en JSON.";

  const salaryReference = options.salaryReference;
  const salaryReferenceBlock = salaryReference
    ? `REFERENCE SALARIALE REELLE DE MARCHE (sources: ${salaryReference.sources.map((s) => s.name).join(", ")}): ` +
      `entre ${salaryReference.min} et ${salaryReference.max} ${salaryReference.currency} par an. ` +
      "Basez-vous sur cette fourchette reelle pour rester credible, ne proposez pas un montant hors de cette plage sans le justifier explicitement.\n\n"
    : "AUCUNE REFERENCE SALARIALE DE MARCHE REELLE DISPONIBLE. Reste prudent(e) et generique sur les montants precis, sans pretendre citer une donnee de marche.\n\n";

  const contextBlock =
    salaryReferenceBlock +
    `PROFIL CANDIDAT:\n${JSON.stringify(candidate).slice(0, 8000)}\n\n` +
    `OFFRE:\n${JSON.stringify(offer).slice(0, 8000)}\n\n` +
    (targetSalary ? `PRETENTION SALARIALE DU CANDIDAT: ${targetSalary}\n\n` : "") +
    `HISTORIQUE DE LA NEGOCIATION (ordre chronologique):\n${JSON.stringify(history || []).slice(0, 8000)}`;

  const userPrompt = finish
    ? "La negociation est terminee. Produis un bilan de coaching : un resume court (3-4 phrases), 2 a 4 points forts du candidat pendant la negociation, et 2 a 4 axes d'amelioration concrets."
    : "Continuez la negociation en repondant au dernier message du candidat, en restant dans votre role de recruteur. " +
      "Produis aussi un conseil court et actionnable pour aider le candidat a mieux negocier son prochain message.";

  const messages = [
    { role: "system", content: systemPrompt },
    { role: "user", content: `${userPrompt}\n\n${contextBlock}` }
  ];

  async function callAi(responseFormat) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);
    try {
      const response = await fetch(config.url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          "Content-Type": "application/json"
        },
        signal: controller.signal,
        body: JSON.stringify({
          model: config.model,
          temperature: 0.6,
          messages,
          response_format: responseFormat
        })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error?.message || "Reponse IA de negociation indisponible.");
      }
      return JSON.parse(data.choices?.[0]?.message?.content || "{}");
    } finally {
      clearTimeout(timeout);
    }
  }

  const schema = finish ? NEGOTIATION_SUMMARY_SCHEMA : NEGOTIATION_REPLY_SCHEMA;
  const schemaName = finish ? "negotiation_summary" : "negotiation_reply";

  let raw;
  try {
    raw = await callAi({ type: "json_schema", json_schema: { name: schemaName, strict: false, schema } });
  } catch (_schemaError) {
    raw = await callAi({ type: "json_object" });
  }

  if (finish) {
    const parsed = raw && typeof raw === "object" ? raw : {};
    const fallback = localNegotiationSummary(language);
    return {
      summary: coerceString(parsed.summary) || fallback.summary,
      strengths: normalizeAiList(parsed.strengths, 6).length ? normalizeAiList(parsed.strengths, 6) : fallback.strengths,
      improvements: normalizeAiList(parsed.improvements, 6).length
        ? normalizeAiList(parsed.improvements, 6)
        : fallback.improvements
    };
  }

  const parsed = raw && typeof raw === "object" ? raw : {};
  const fallback = localNegotiationReply(language);
  return {
    reply: coerceString(parsed.reply) || fallback.reply,
    tip: coerceString(parsed.tip) || fallback.tip
  };
}

function parseCvLocally(sourceText) {
  const text = cleanExtractedText(sourceText);
  const lines = text.split(/\n+/).map((line) => line.trim()).filter(Boolean);
  const normalized = normalizeText(text);
  const email = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] || "";
  const phone = text.match(/(?:\+\d{1,3}[\s.-]?)?(?:\(?\d{1,4}\)?[\s.-]?){4,7}\d{2}/)?.[0]?.trim() || "";
  const linkedinUrl = text.match(/https?:\/\/(?:www\.)?linkedin\.com\/[^\s)]+/i)?.[0] || "";
  const firstNameLine =
    lines.find((line) => line.length >= 3 && line.length <= 60 && !line.includes("@") && !/^\+?\d/.test(line)) ||
    String(email).split("@")[0].replace(/[._-]+/g, " ");
  const nameParts = firstNameLine.split(/\s+/).filter(Boolean);
  const knownSkills = [
    "python",
    "sql",
    "power bi",
    "tableau",
    "excel",
    "react",
    "node",
    "fastapi",
    "django",
    "docker",
    "postgresql",
    "mysql",
    "mongodb",
    "tensorflow",
    "scikit-learn",
    "pandas",
    "numpy",
    "data engineering",
    "airflow",
    "git",
    "supabase",
    "rest api",
    "machine learning",
    "nlp",
    "llm",
    "rag",
    "computer vision"
  ];
  const skills = knownSkills.filter((skill) => normalized.includes(normalizeText(skill)));
  const location = lines.find((line) => /(paris|france|ile-de-france|lyon|marseille|remote|teletravail)/i.test(normalizeText(line))) || "";
  const summary = lines.find((line) => line.length > 80 && line.length < 520) || "";
  const languageMap = [
    ["francais", "Français"],
    ["anglais", "Anglais"],
    ["english", "Anglais"],
    ["espagnol", "Espagnol"],
    ["allemand", "Allemand"]
  ];
  const languages = languageMap.filter(([key]) => normalized.includes(key)).map(([, label]) => label);
  return {
    firstName: nameParts.slice(0, 1).join(" "),
    lastName: nameParts.slice(1).join(" ").toUpperCase(),
    email,
    phone,
    linkedinUrl,
    portfolioUrl: "",
    location,
    headline: lines.slice(0, 8).find((line) => line !== firstNameLine && !line.includes("@") && line.length >= 8 && line.length <= 100) || "",
    summary,
    experienceYears: Number(text.match(/(\d+)\s*(ans|an|years|year)/i)?.[1] || 0),
    skills,
    softSkills: [],
    languages,
    experiences: [],
    education: "",
    educationItems: [],
    certifications: [],
    projects: [],
    interests: [],
    extractionWarnings: ["Extraction locale utilisée. Vérifie les sections manquantes."],
    extractionMode: "local"
  };
}

const CV_SKILL_LABELS = [
  "Docker",
  "REST API",
  "Supabase",
  "Cloudflare",
  "Redis Cache",
  "Scikit-learn",
  "TensorFlow",
  "Streamlit",
  "LLM",
  "RAG",
  "ChromaDB",
  "FAISS",
  "Power BI",
  "Tableau Software",
  "Qlik Sense",
  "Looker Studio",
  "Talend",
  "Power Query",
  "BigQuery",
  "Data Lake (concepts)",
  "SQL",
  "MySQL",
  "NoSQL",
  "Oracle",
  "PostgreSQL",
  "Python",
  "Pandas",
  "FastAPI",
  "Jira",
  "Git/GitHub",
  "Bitbucket",
  "Agile/Scrum",
  "Waterfall",
  "React",
  "Machine Learning",
  "NLP",
  "Computer Vision",
  "VBA",
  "Business Intelligence",
  "Data Visualisation",
  "Data Analysis",
  "Reporting"
];

// Couvre à la fois les abréviations ("jan.", "févr.") et les noms complets
// ("Janvier", "Février") — un mois écrit en toutes lettres brisait le match
// suivant ("\s*\d{4}") car seule l'abréviation était consommée, laissant le
// reste du mot ("vier", "rier", "let"...) juste avant l'année.
const DATE_MONTH_PATTERN = "(?:jan(?:vier)?\\.?|f.vr(?:ier)?\\.?|fevr(?:ier)?\\.?|mars|avr(?:il)?\\.?|mai|juin|juil(?:let)?\\.?|ao.t|aout|sept(?:embre)?\\.?|oct(?:obre)?\\.?|nov(?:embre)?\\.?|d.c(?:embre)?\\.?|dec(?:embre)?\\.?)";
const DATE_RANGE_PATTERN = `(?:de\\s+)?(${DATE_MONTH_PATTERN}\\s*\\d{4})\\s*(?:-|\\u2013|\\u2014|à|a|au|to|\\?)\\s*(${DATE_MONTH_PATTERN}\\s*\\d{4}|aujourd'hui|present|présent|pr.sent)`;

function uniqueByNormalized(list) {
  const seen = new Set();
  const output = [];
  for (const item of list.map((value) => coerceString(value)).filter(Boolean)) {
    const key = normalizeText(item).replace(/[^a-z0-9]+/g, "");
    if (!key || seen.has(key)) continue;
    seen.add(key);
    output.push(item);
  }
  return output;
}

function compactKey(value) {
  return normalizeText(value)
    .replace(/[-–—]/g, "-")
    .replace(/[^a-z0-9]+/g, "");
}

function detectSkillsFromText(sourceText) {
  const normalized = normalizeText(sourceText);
  const compact = normalized.replace(/[^a-z0-9]+/g, "");
  return CV_SKILL_LABELS.filter((skill) => {
    const key = normalizeText(skill);
    if (key.length <= 2) {
      return new RegExp(`(^|[^a-z0-9])${escapeRegex(key)}([^a-z0-9]|$)`, "i").test(normalized);
    }
    const variants = [key, key.replace(/[\/()]/g, " "), key.replace(/\s+/g, "")];
    return variants.some((variant) => {
      const clean = variant.trim();
      return clean && (normalized.includes(clean) || compact.includes(clean.replace(/[^a-z0-9]+/g, "")));
    });
  });
}

function extractRobustLinkedin(sourceText, current = "") {
  const candidate = coerceString(current);
  if (candidate.includes("linkedin.com") && candidate.length > 35 && !candidate.endsWith("-")) return candidate;
  const text = String(sourceText || "");
  const match = text.match(/https?:\/\/(?:www\.)?linkedin\.com\/[^\n\r\t ]+(?:\s*[-_]\s*[A-Za-z0-9-]+)?/i);
  if (!match) return candidate;
  return match[0].replace(/\s+/g, "").replace(/[),.;]+$/g, "");
}

function repairLinkedinWithName(url, firstName, lastName) {
  const current = coerceString(url);
  if (!current.includes("linkedin.com")) return current;
  if (!current.endsWith("-")) return current;
  const first = normalizeText(firstName).replace(/[^a-z0-9]+/g, "");
  const last = normalizeText(lastName).replace(/[^a-z0-9]+/g, "");
  if (!first || !last) return current;
  return current.replace(/\/in\/[^/]+$/i, `/in/${first}-${last}`);
}

function formatFrenchPhone(value) {
  const raw = coerceString(value);
  const digits = raw.replace(/\D/g, "");
  if (/^0[67]\d{8}$/.test(digits)) {
    return `+33 ${digits[1]} ${digits.slice(2, 4)} ${digits.slice(4, 6)} ${digits.slice(6, 8)} ${digits.slice(8, 10)}`;
  }
  if (/^33[67]\d{8}$/.test(digits)) {
    return `+33 ${digits[2]} ${digits.slice(3, 5)} ${digits.slice(5, 7)} ${digits.slice(7, 9)} ${digits.slice(9, 11)}`;
  }
  return raw;
}

function cleanLocation(value) {
  return coerceString(value)
    .replace(/^[^\p{L}\p{N}]+/u, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

// Repli générique : cherche un titre de section "profil/résumé/summary" et
// prend les lignes qui suivent, plutôt que de reconnaître une formulation
// figée (une version antérieure ne reconnaissait que le résumé d'un CV de
// test précis, ce qui ne fonctionnait pour aucun autre candidat).
function extractProfessionalSummary(sourceText, current = "") {
  const currentText = coerceString(current);
  if (currentText.length >= 220) return currentText;
  const lines = cleanExtractedText(sourceText).split(/\n+/).map((line) => line.trim()).filter(Boolean);
  const start = lines.findIndex((line) => /^(profil|résumé|resume|summary|professional summary|à propos|a propos|about)\b/i.test(normalizeText(line)));
  if (start < 0) return currentText;
  const block = [];
  for (const line of lines.slice(start + 1, start + 9)) {
    if (/^(experience|expériences|formation|certifications?|competences|compétences|langues)\b/i.test(normalizeText(line))) break;
    block.push(line);
  }
  return block.join(" ").replace(/\s{2,}/g, " ").trim() || currentText;
}

function extractHeadline(sourceText, current = "") {
  const currentText = coerceString(current);
  if (currentText && currentText.length <= 90 && !currentText.includes("|")) return currentText;
  const lines = cleanExtractedText(sourceText).split(/\n+/).map((line) => line.trim()).filter(Boolean);
  return (
    lines.find((line) => /data analyst|business intelligence|data manager|data scientist|bim/i.test(line) && line.length <= 90) ||
    currentText
  );
}

function cleanExperienceDate(value) {
  const text = coerceString(value);
  const range = new RegExp(DATE_RANGE_PATTERN, "i");
  const match = text.match(range);
  if (match) return `${match[1].replace(/^de\s+/i, "")} - ${match[2]}`.replace(/\s{2,}/g, " ");

  const normalized = normalizeText(text).replace(/\s+/g, " ");
  // Même remarque que pour DATE_MONTH_PATTERN : accepter les noms de mois
  // complets ("janvier", "fevrier"...) en plus des abréviations.
  const looseMonth = "(?:janv(?:ier)?\\.?|fevr(?:ier)?\\.?|f.vr(?:ier)?\\.?|mars|avr(?:il)?\\.?|mai|juin|juil(?:let)?\\.?|aout|ao.t|sept(?:embre)?\\.?|oct(?:obre)?\\.?|nov(?:embre)?\\.?|dec(?:embre)?\\.?|d.c(?:embre)?\\.?)";
  const loose = normalized.match(new RegExp(`(?:de\\s+)?(${looseMonth}\\s*\\d{4})\\s*(?:-|\\u2013|\\u2014|a|au|to|\\?)\\s*(${looseMonth}\\s*\\d{4}|aujourd'hui|present|pr.sent)`, "i"));
  if (!loose) return "";
  const cleanPart = (part) =>
    coerceString(part)
      .replace(/^janv(?:ier)?\.?/i, "jan.")
      .replace(/^f.vr(?:ier)?\.?/i, "févr.")
      .replace(/^fevr(?:ier)?\.?/i, "févr.")
      .replace(/^avr(?:il)?\.?/i, "avr.")
      .replace(/^juil(?:let)?\.?/i, "juil.")
      .replace(/^ao.t/i, "août")
      .replace(/^aout/i, "août")
      .replace(/^sept(?:embre)?\.?/i, "sept.")
      .replace(/^oct(?:obre)?\.?/i, "oct.")
      .replace(/^nov(?:embre)?\.?/i, "nov.")
      .replace(/^d.c(?:embre)?\.?/i, "déc.")
      .replace(/^dec(?:embre)?\.?/i, "déc.");
  return `${cleanPart(loose[1])} - ${cleanPart(loose[2])}`.replace(/\s{2,}/g, " ");
}

function escapeRegex(value) {
  return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function findDateNearCompany(sourceText, company) {
  const companyText = coerceString(company);
  if (!companyText) return "";
  const text = cleanExtractedText(sourceText);
  const lines = text.split(/\n+/).map((line) => line.trim()).filter(Boolean);
  const companyTokens = normalizeText(companyText).split(/\s+/).filter((token) => token.length > 2);
  const lineIndex = lines.findIndex((line) => {
    const normalizedLine = normalizeText(line);
    return companyTokens.every((token) => normalizedLine.includes(token));
  });
  const windowText =
    lineIndex >= 0
      ? lines.slice(Math.max(0, lineIndex - 2), lineIndex + 10).join("\n")
      : "";
  return cleanExperienceDate(windowText.match(new RegExp(DATE_RANGE_PATTERN, "i"))?.[0] || "");
}

function textWindowAroundCompany(sourceText, company, beforeLines = 2, afterLines = 10) {
  const lines = cleanExtractedText(sourceText).split(/\n+/).map((line) => line.trim()).filter(Boolean);
  const companyTokens = normalizeText(company).split(/\s+/).filter((token) => token.length > 2);
  const index = lines.findIndex((line) => {
    const normalizedLine = normalizeText(line);
    return companyTokens.every((token) => normalizedLine.includes(token));
  });
  if (index < 0) return cleanExtractedText(sourceText);
  return lines.slice(Math.max(0, index - beforeLines), index + afterLines).join("\n");
}

function dateAfterLabel(sourceText, label, maxChars = 500) {
  const text = cleanExtractedText(sourceText);
  const tokens = normalizeText(label).split(/\s+/).filter((token) => token.length > 2);
  const lines = text.split(/\n+/).map((line) => line.trim()).filter(Boolean);
  const index = lines.findIndex((line) => {
    const normalizedLine = normalizeText(line);
    return tokens.every((token) => normalizedLine.includes(token));
  });
  const windowText =
    index >= 0
      ? lines.slice(index, index + 8).join("\n")
      : text.match(new RegExp(tokens.map(escapeRegex).join("[\\s\\S]{0,40}") + `[\\s\\S]{0,${maxChars}}`, "i"))?.[0] || "";
  return cleanExperienceDate(windowText);
}

function cleanRole(value) {
  const role = coerceString(value).replace(/\s{2,}/g, " ").trim();
  if (/^(développement|developpement|participation|création|creation|automatisation|exploitation|recueil)\b/i.test(role)) return "";
  if (role.length > 80) return "";
  return role;
}

function hasRoleLikeText(value) {
  return /(data manager|data analyst|stage|alternance|business intelligence|digital|bim|analyst|manager)/i.test(coerceString(value));
}

// NOTE: cette fonction ne fait plus de détection "en dur" par nom d'entreprise
// (une version antérieure ne reconnaissait que VINCI/EIFFAGE/ECOBANK, ce qui
// ne fonctionnait que pour un seul CV de test et ne détectait rien pour les
// autres candidats). L'extraction générique des expériences est assurée par
// extractCvWithAi (IA) et, en repli, par parseCvLocally — cette fonction est
// gardée en no-op pour ne pas casser mergeExperiencesForReview qui l'appelle.
function detectExperiencesFromText(_sourceText) {
  return [];
}

// Même remarque que detectExperiencesFromText ci-dessus : plus de détection
// en dur par nom d'école (HETIC/MIAGE). No-op générique, gardé pour la
// compatibilité de mergeEducationForReview.
function detectEducationFromText(_sourceText) {
  return [];
}

function normalizeExperienceForReview(item, sourceText) {
  const company = coerceString(item?.company).replace(/\s{2,}/g, " ");
  const role = cleanRole(item?.role);
  const dates = cleanExperienceDate(item?.dates) || findDateNearCompany(sourceText, company);
  const description = coerceString(item?.description)
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !new RegExp(DATE_RANGE_PATTERN, "i").test(line))
    .join("\n");
  return {
    company,
    role,
    dates,
    location: cleanLocation(item?.location),
    description
  };
}

function mergeExperiencesForReview(sourceText, detected, aiItems) {
  const output = [];
  const byCompany = new Map();
  const scoreExperience = (item) => {
    let score = 0;
    if (item.dates) score += 4;
    if (item.role) score += 2;
    if (item.location) score += 1;
    if (item.description && item.description.length > 50) score += 2;
    if (/linkedin\.com|technical skills/i.test(item.description || "")) score -= 4;
    return score;
  };
  for (const item of [...(detected || []), ...(aiItems || [])].map((entry) => normalizeExperienceForReview(entry, sourceText))) {
    const companyKey = compactKey(item.company);
    if (!companyKey && !item.role) continue;
    if (!companyKey) {
      output.push(item);
      continue;
    }
    const previous = byCompany.get(companyKey);
    if (!previous || scoreExperience(item) > scoreExperience(previous)) {
      byCompany.set(companyKey, item);
    }
  }
  output.push(...byCompany.values());
  return output;
}

function mergeEducationForReview(primary, secondary) {
  const bySchool = new Map();
  const scoreEducation = (item) => {
    let score = 0;
    if (coerceString(item?.school)) score += 2;
    if (coerceString(item?.degree)) score += 2;
    if (cleanExperienceDate(item?.dates)) score += 3;
    if (/master|mast[èe]re|licence|bachelor/i.test(`${item?.school || ""} ${item?.degree || ""}`)) score += 2;
    return score;
  };
  for (const item of [...(primary || []), ...(secondary || [])]) {
    const schoolKey = compactKey(item?.school);
    if (!schoolKey) continue;
    const normalized = {
      ...item,
      school: coerceString(item.school),
      degree: coerceString(item.degree),
      dates: cleanExperienceDate(item.dates) || coerceString(item.dates),
      location: cleanLocation(item.location),
      description: coerceString(item.description)
    };
    const previous = bySchool.get(schoolKey);
    if (!previous || scoreEducation(normalized) > scoreEducation(previous)) {
      bySchool.set(schoolKey, normalized);
    }
  }
  return [...bySchool.values()];
}

function cleanCertificationName(value) {
  return coerceString(value)
    .replace(/^[•\-–—+\d.)\s]+/, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function detectCertificationsFromText(sourceText) {
  const lines = cleanExtractedText(sourceText)
    .split(/\n+/)
    .map((line) => cleanCertificationName(line))
    .filter(Boolean);
  const sectionStart = lines.findIndex((line) => /^(certifications?|certificats?|formations?\s+certifiantes?)$/i.test(normalizeText(line)));
  const sectionLines = [];
  if (sectionStart >= 0) {
    for (const line of lines.slice(sectionStart + 1)) {
      const normalized = normalizeText(line);
      if (/^(experiences?|expériences?|formation|education|compétences|competences|projets?|projects?|langues?|interests?|centres? d'interet)\b/i.test(normalized)) break;
      sectionLines.push(line);
    }
  }

  const keywordLines = lines.filter((line) => {
    const normalized = normalizeText(line);
    if (/^(formation|education|certifications?|certificats?|technical skills|compétences|competences)$/i.test(normalized)) return false;
    if (/universite|university|ecole|school|master|mastère|mastere|licence|bachelor/.test(normalized)) return false;
    return /certification|certificate|certificat|formation|academy|coursera|udemy|google|microsoft|aws|azure|oracle|cisco|scrum|salesforce|databricks|snowflake/.test(normalized);
  });

  return uniqueByNormalized([...sectionLines, ...keywordLines])
    .filter((name) => name.length >= 4 && name.length <= 140)
    .slice(0, 12)
    .map((name) => ({
      name,
      issuer: name.match(/\b(Microsoft|Google|AWS|Amazon|Oracle|Cisco|IBM|Meta|Salesforce|Databricks|Snowflake|Coursera|Udemy)\b/i)?.[0] || "",
      date: cleanExperienceDate(name),
      url: name.match(/https?:\/\/[^\s)]+/i)?.[0] || ""
    }));
}

function mergeCertificationsForReview(primary, secondary) {
  const output = [];
  const seen = new Set();
  for (const item of [...(primary || []), ...(secondary || [])]) {
    const name = cleanCertificationName(item?.name || item);
    const key = compactKey(name);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    output.push({
      name,
      issuer: coerceString(item?.issuer),
      date: cleanExperienceDate(item?.date) || coerceString(item?.date),
      url: coerceString(item?.url)
    });
  }
  return output.slice(0, 12);
}

function mergeCollections(primary, secondary, keyFields) {
  const output = [];
  const seen = new Set();
  for (const item of [...(primary || []), ...(secondary || [])]) {
    const key = keyFields.map((field) => compactKey(item?.[field] || "")).join("|");
    if (!key.replace(/\|/g, "") || seen.has(key)) continue;
    seen.add(key);
    output.push(item);
  }
  return output;
}

// Détecte quand une description d'expérience/formation a en fait "aspiré"
// le résumé professionnel (bug d'extraction fréquent sur les CV en PDF à
// colonnes, quand le texte brut mélange l'ordre des blocs) — dans ce cas
// mieux vaut n'afficher aucune description que d'en afficher une fausse.
// Générique : ne dépend d'aucun nom de candidat ni d'entreprise particulier.
function textLeaksSummary(text, summary) {
  const a = normalizeText(text).replace(/\s+/g, " ").trim();
  const b = normalizeText(summary).replace(/\s+/g, " ").trim();
  if (!a || !b) return false;
  if (a === b) return true;
  const probe = b.slice(0, 60);
  return probe.length >= 40 && a.includes(probe);
}

function postProcessCvExtraction(sourceText, parsed) {
  const base = parsed || parseCvLocally(sourceText);
  const detectedSkills = detectSkillsFromText(sourceText);
  const detectedExperiences = detectExperiencesFromText(sourceText);
  const detectedEducation = detectEducationFromText(sourceText);
  const detectedCertifications = detectCertificationsFromText(sourceText);
  const summary = extractProfessionalSummary(sourceText, base.summary);
  const next = {
    ...base,
    linkedinUrl: repairLinkedinWithName(extractRobustLinkedin(sourceText, base.linkedinUrl), base.firstName, base.lastName),
    phone: formatFrenchPhone(base.phone),
    location: cleanLocation(base.location),
    headline: extractHeadline(sourceText, base.headline),
    summary,
    skills: uniqueByNormalized([...detectedSkills, ...(base.skills || [])]),
    languages: uniqueByNormalized([...(base.languages || []), ...(normalizeText(sourceText).includes("anglais") ? ["Anglais"] : []), ...(normalizeText(sourceText).includes("francais") || normalizeText(sourceText).includes("français") ? ["Français"] : [])]),
    experiences: mergeExperiencesForReview(sourceText, detectedExperiences, base.experiences || []),
    educationItems: mergeEducationForReview(detectedEducation, base.educationItems || []),
    certifications: mergeCertificationsForReview(detectedCertifications, base.certifications || [])
  };
  if (summary) {
    next.experiences = next.experiences.map((item) =>
      item.description && textLeaksSummary(item.description, summary) ? { ...item, description: "" } : item
    );
    next.educationItems = next.educationItems.map((item) =>
      item.description && textLeaksSummary(item.description, summary) ? { ...item, description: "" } : item
    );
  }
  next.education = next.education || next.educationItems?.[0]?.degree || "";
  return next;
}

// Répare un JSON tronqué (réponse IA coupée par la limite de tokens en
// plein milieu d'une chaîne ou d'un objet) en refermant proprement les
// structures encore ouvertes, pour récupérer un maximum de champs déjà
// générés plutôt que de tout perdre et retomber sur le parseur local.
function repairTruncatedJson(text) {
  const closers = { "{": "}", "[": "]" };
  function openStackAt(str) {
    const stack = [];
    let inString = false;
    let escape = false;
    for (let i = 0; i < str.length; i++) {
      const ch = str[i];
      if (escape) {
        escape = false;
        continue;
      }
      if (ch === "\\") {
        escape = true;
        continue;
      }
      if (ch === '"') {
        inString = !inString;
        continue;
      }
      if (inString) continue;
      if (ch === "{" || ch === "[") stack.push(ch);
      else if (ch === "}" || ch === "]") stack.pop();
    }
    return { stack, inString };
  }

  const { stack, inString } = openStackAt(text);
  if (!stack.length && !inString) return text;

  // Repère le dernier point "sûr" (juste après une accolade/crochet fermé
  // ou une virgule séparant deux éléments complets) pour couper avant tout
  // fragment incomplet (ex: une chaîne ou une clé coupée en plein milieu).
  let lastSafeIndex = 0;
  let scanInString = false;
  let scanEscape = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (scanEscape) {
      scanEscape = false;
      continue;
    }
    if (ch === "\\") {
      scanEscape = true;
      continue;
    }
    if (ch === '"') {
      scanInString = !scanInString;
      continue;
    }
    if (scanInString) continue;
    if (ch === "}" || ch === "]") lastSafeIndex = i + 1;
    else if (ch === ",") lastSafeIndex = i;
  }

  let repaired = text.slice(0, lastSafeIndex).replace(/,\s*$/, "");
  const remaining = openStackAt(repaired).stack;
  for (let i = remaining.length - 1; i >= 0; i--) {
    repaired += closers[remaining[i]];
  }
  return repaired;
}

// Estimation grossière du nombre de tokens (≈ 1 token / 3.5 caractères en
// français) — pas un vrai tokenizer, mais suffisant pour rester prudent
// sous le plafond de tokens/minute (TPM) du compte IA en place, qui est très
// restreint (voir computeMaxCompletionTokens ci-dessous) et peut à lui seul
// faire échouer toute une extraction si on réserve trop de tokens de sortie.
function estimateTokenCount(text) {
  return Math.ceil(String(text || "").length / 3.5);
}

// Le plafond de tokens/minute du compte IA (actuellement 8000 chez Groq,
// partagé entre le prompt ET la réponse demandée) est trop bas pour réserver
// un max_completion_tokens fixe : sur un CV riche (plusieurs expériences),
// une valeur fixe comme 6000-8000 dépasse systématiquement le plafond et
// fait échouer toute l'extraction, qui retombe alors sur le parseur local
// très limité. On calcule donc un budget de sortie réaliste en fonction de
// ce qui a déjà été consommé par le prompt (et le schéma JSON s'il est
// envoyé), avec une marge de sécurité.
function computeMaxCompletionTokens(messages, responseFormat, ceiling = 8000) {
  const schemaText = responseFormat?.type === "json_schema" ? JSON.stringify(responseFormat.json_schema?.schema || {}) : "";
  const promptTokens = messages.reduce((sum, message) => sum + estimateTokenCount(message.content), 0) + estimateTokenCount(schemaText);
  return Math.max(1200, Math.min(4500, ceiling - promptTokens - 500));
}

async function extractCvWithAi(sourceText) {
  const config = aiExtractionConfig();
  if (!config?.apiKey) return null;

  // Le texte source est borné à une taille raisonnable : au-delà, on garde
  // le début (identité, résumé, expériences récentes — l'essentiel d'un CV)
  // plutôt que d'envoyer un texte trop long qui grignoterait tout le budget
  // de tokens disponible pour la réponse.
  const CV_SOURCE_TEXT_CAP = 6000;
  const messages = [
    {
      role: "system",
      content:
        "Tu es un parseur ATS senior spécialisé dans les CV français et anglais. Tu dois extraire un CV complet pour une app de matching CV/offre. Réponds uniquement en JSON. N'invente aucune donnée. Ne déplace jamais des expériences professionnelles dans les centres d'intérêt. Les formations doivent être détectées même si elles sont écrites sans titre de section clair. Les expériences doivent être séparées par entreprise/poste/date, même si le PDF a perdu les colonnes."
    },
    {
      role: "user",
      content:
        "Structure ce CV. Cherche précisément: identité, titre, résumé, compétences techniques, soft skills, langues, expériences, formations, certifications, projets et centres d'intérêt. Pour les formations, repère toute école, université ou diplôme mentionné (quel que soit son nom : Master, Mastère, Licence, Bachelor, BTS, DUT, etc.), même écrits sans titre de section clair. Pour les expériences, repère chaque entreprise mentionnée (quel que soit son nom), stages, alternances, CDI, CDD, dates et descriptions. Pour le champ description de chaque expérience et formation, découpe le texte en plusieurs points distincts (une réalisation/mission par ligne, phrases courtes et concrètes) séparés par des retours à la ligne (\\n) plutôt qu'un seul paragraphe continu — ne fusionne jamais deux idées différentes sur la même ligne.\n\n" +
        `CV:\n${sourceText.slice(0, CV_SOURCE_TEXT_CAP)}`
    }
  ];

  async function callAi(responseFormat) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);
    try {
      const response = await fetch(config.url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          "Content-Type": "application/json"
        },
        signal: controller.signal,
        body: JSON.stringify({
          model: config.model,
          temperature: 0,
          max_completion_tokens: computeMaxCompletionTokens(messages, responseFormat),
          response_format: responseFormat,
          messages
        })
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error?.message || payload?.error || `Erreur IA ${response.status}`);
      }
      const choice = payload?.choices?.[0];
      const content = choice?.message?.content;
      if (!content) throw new Error("Réponse IA vide.");
      const start = content.indexOf("{");
      const end = content.lastIndexOf("}");
      const jsonText = start >= 0 && end > start ? content.slice(start, end + 1) : content;
      try {
        return sanitizeAiCvExtraction(JSON.parse(jsonText));
      } catch (parseError) {
        // La réponse a probablement été coupée par la limite de tokens
        // (fréquent sur les CV longs/riches en expériences) — on tente de
        // récupérer un maximum de champs déjà générés avant d'abandonner.
        if (choice?.finish_reason === "length" || start >= 0) {
          const repaired = repairTruncatedJson(start >= 0 ? content.slice(start) : content);
          const parsedRepaired = JSON.parse(repaired);
          console.warn("Extraction IA: JSON tronqué détecté et réparé automatiquement.");
          return sanitizeAiCvExtraction(parsedRepaired);
        }
        throw parseError;
      }
    } finally {
      clearTimeout(timeout);
    }
  }

  const schemaFormat = {
    type: "json_schema",
    json_schema: {
      name: "career_app_cv_extraction",
      strict: false,
      schema: CV_EXTRACTION_SCHEMA
    }
  };

  try {
    return await callAi(schemaFormat);
  } catch (schemaError) {
    console.warn(`Extraction IA schema indisponible: ${schemaError.message}`);
    return callAi({ type: "json_object" });
  }
}

function requireFields(payload, fields) {
  for (const field of fields) {
    if (!String(payload?.[field] || "").trim()) {
      throw new Error(`Champ requis: ${field}`);
    }
  }
}

async function getUserRowById(userId) {
  const { rows } = await db.query("SELECT * FROM users WHERE id = $1 LIMIT 1", [userId]);
  return rows[0] || null;
}

// Fusionne un plan statique (src/data/plans.js) avec une éventuelle
// surcharge de tarif admin (table plan_overrides) : mêmes nom/features/segment,
// prix potentiellement différents. Utilisé partout où un montant réel doit
// être calculé (checkout Stripe, enregistrement de transaction) pour ne
// jamais utiliser un prix figé et périmé après une modification admin.
async function getEffectivePlanById(planId) {
  const plan = getPlanById(planId);
  if (!plan) return null;
  const { rows } = await db.query("SELECT monthly_price, annual_price FROM plan_overrides WHERE plan_id = $1", [planId]);
  const override = rows[0];
  if (!override) return plan;
  return {
    ...plan,
    monthlyPrice: override.monthly_price != null ? Number(override.monthly_price) : plan.monthlyPrice,
    annualPrice: override.annual_price != null ? Number(override.annual_price) : plan.annualPrice
  };
}

async function requireAdmin(adminUserId) {
  const admin = await getUserRowById(adminUserId);
  if (!admin || admin.role_type !== "admin") {
    const error = new Error("Accès administrateur requis.");
    error.statusCode = 403;
    throw error;
  }
  return admin;
}

// Étend requireAdmin() avec la vérification du module : un compte admin dont
// admin_modules_json est restreint (sous-admin) ne peut appeler l'API que
// pour les modules qu'il a explicitement. Miroir serveur de
// getAllowedAdminModules() côté frontend (qui, elle, ne fait QUE cacher les
// onglets du menu — sans ce contrôle ici, un sous-admin restreint pouvait
// appeler n'importe quelle route admin directement, en contournant l'UI).
// Liste vide = accès complet (admin "full", comportement historique inchangé).
async function requireAdminModule(adminUserId, moduleId) {
  const admin = await requireAdmin(adminUserId);
  const modules = sanitizeAdminModules(parseJsonField(admin.admin_modules_json, []));
  if (modules.length && !modules.includes(moduleId)) {
    const error = new Error("Ce module n'est pas autorisé pour votre compte administrateur.");
    error.statusCode = 403;
    throw error;
  }
  return admin;
}

const PLATFORM_SETTING_DEFAULTS = {
  google_signin_enabled: "true",
  stripe_enabled: "true"
};

const platformSettingsCache = new Map();

async function loadPlatformSettings() {
  const { rows } = await db.query("SELECT key, value FROM platform_settings");
  platformSettingsCache.clear();
  for (const row of rows) {
    platformSettingsCache.set(row.key, row.value);
  }
}

function getPlatformSetting(key) {
  if (platformSettingsCache.has(key)) return platformSettingsCache.get(key);
  return PLATFORM_SETTING_DEFAULTS[key] ?? null;
}

function getPlatformSettingBool(key) {
  return getPlatformSetting(key) === "true";
}

async function setPlatformSetting(key, value) {
  await db.query(
    `INSERT INTO platform_settings (key, value, updated_at) VALUES ($1,$2,$3)
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = EXCLUDED.updated_at`,
    [key, value, nowIso()]
  );
  platformSettingsCache.set(key, value);
}

async function getUserRowByEmail(email) {
  const { rows } = await db.query("SELECT * FROM users WHERE email = $1 LIMIT 1", [normalizeEmail(email)]);
  return rows[0] || null;
}

async function getUserRowByAnyEmail(email) {
  const normalized = normalizeEmail(email);
  const primary = await getUserRowByEmail(normalized);
  if (primary) return primary;
  const { rows } = await db.query(
    `SELECT users.*
     FROM user_email_addresses
     JOIN users ON users.id = user_email_addresses.user_id
     WHERE user_email_addresses.email = $1
     LIMIT 1`,
    [normalized]
  );
  return rows[0] || null;
}

async function getEmailRowsForUser(userId) {
  const { rows } = await db.query(
    `SELECT id, email, is_primary, is_verified, created_at, updated_at
     FROM user_email_addresses
     WHERE user_id = $1
     ORDER BY is_primary DESC, created_at ASC`,
    [userId]
  );
  return rows;
}

async function getUserRowByUsername(username) {
  const { rows } = await db.query("SELECT * FROM users WHERE username = $1 LIMIT 1", [normalizeUsername(username)]);
  return rows[0] || null;
}

async function getUserRowByIdentifier(identifier) {
  const normalized = normalizeText(identifier);
  if (!normalized) return null;
  if (normalized.includes("@")) {
    return getUserRowByAnyEmail(normalized);
  }
  return getUserRowByUsername(normalized);
}

async function buildUniqueUsername(firstName, lastName, email) {
  const base = buildUsername(firstName, lastName, email);
  let candidate = base;
  let suffix = 2;

  while (await getUserRowByUsername(candidate)) {
    candidate = `${base}_${suffix}`;
    suffix += 1;
  }

  return candidate;
}

async function ensureUsernames() {
  const { rows } = await db.query("SELECT id, first_name, last_name, email FROM users WHERE COALESCE(username, '') = ''");
  for (const row of rows) {
    const username = await buildUniqueUsername(row.first_name, row.last_name, row.email);
    await db.query("UPDATE users SET username = $1 WHERE id = $2", [username, row.id]);
  }
}

async function getAccountRows(userId) {
  const [accountQ, candidateQ, recruiterQ, orgQ, emailsQ, sessionsQ] = await Promise.all([
    db.query("SELECT * FROM user_accounts WHERE user_id = $1 LIMIT 1", [userId]),
    db.query("SELECT * FROM user_candidate_profiles WHERE user_id = $1 LIMIT 1", [userId]),
    db.query("SELECT * FROM user_recruiter_profiles WHERE user_id = $1 LIMIT 1", [userId]),
    db.query("SELECT * FROM user_org_profiles WHERE user_id = $1 LIMIT 1", [userId]),
    getEmailRowsForUser(userId),
    db.query("SELECT token, created_at, user_agent, ip_address, last_seen_at FROM sessions WHERE user_id = $1 ORDER BY created_at DESC", [userId])
  ]);

  return {
    account: accountQ.rows[0] || null,
    candidate: candidateQ.rows[0] || null,
    recruiter: recruiterQ.rows[0] || null,
    org: orgQ.rows[0] || null,
    emails: emailsQ || [],
    sessions: sessionsQ.rows || []
  };
}

function toPublicUser(userRow, relations) {
  if (!userRow) return null;
  const accountRow = relations.account;
  const accountType = sanitizeAccountType(accountRow?.account_type || userRow.role_type || "candidate");

  let details = {};
  if (CANDIDATE_TYPES.has(accountType)) {
    const candidate = relations.candidate || {};
    details = {
      currentTitle: candidate.current_title || "",
      targetRole: candidate.target_role || "",
      experienceYears: Number(candidate.experience_years || 0),
      schoolName: candidate.school_name || "",
      studyLevel: candidate.study_level || "",
      graduationYear: candidate.graduation_year || null,
      contractPreference: candidate.contract_preference || "",
      availability: candidate.availability || "",
      portfolioUrl: candidate.portfolio_url || "",
      linkedinUrl: candidate.linkedin_url || ""
    };
  } else if (RECRUITER_TYPES.has(accountType)) {
    const recruiter = relations.recruiter || {};
    details = {
      organizationName: recruiter.organization_name || "",
      recruiterRole: recruiter.recruiter_role || "",
      hiringVolume: recruiter.hiring_volume || "",
      industry: recruiter.industry || "",
      website: recruiter.website || ""
    };
  } else {
    const org = relations.org || {};
    details = {
      organizationName: org.organization_name || "",
      organizationType: org.organization_type || accountType,
      department: org.department || "",
      website: org.website || "",
      sizeRange: org.size_range || "",
      industry: org.industry || "",
      contactRole: org.contact_role || "",
      notes: org.notes || ""
    };
  }

  const profile = parseJsonField(userRow.profile_json, { ...DEFAULT_PROFILE });
  const subscription = parseJsonField(userRow.subscription_json, {
    plan: "free",
    status: "active",
    startedAt: userRow.created_at,
    renewalAt: null
  });

  const avatarDataUrl = userRow.avatar_data_url || accountRow?.avatar_data_url || "";
  const emailRows = (relations.emails || []).length
    ? relations.emails
    : [
        {
          id: `eml-${userRow.id}`,
          email: userRow.email,
          is_primary: 1,
          is_verified: 1,
          created_at: userRow.created_at,
          updated_at: userRow.updated_at
        }
      ];

  return {
    id: userRow.id,
    firstName: userRow.first_name,
    lastName: userRow.last_name,
    email: userRow.email,
    emailAddresses: emailRows.map((row) => ({
      id: row.id,
      email: row.email,
      isPrimary: Boolean(Number(row.is_primary || 0)),
      isVerified: Boolean(Number(row.is_verified || 0)),
      createdAt: row.created_at,
      updatedAt: row.updated_at
    })),
    sessions: (relations.sessions || []).map((row) => ({
      // Jamais le vrai token de session ici : cet objet part côté client
      // (affiché dans Compte > Sécurité). Un id dérivé (hash) permet de
      // cibler une session précise pour la révoquer (DELETE
      // /api/auth/sessions/:sessionId) sans jamais exposer une valeur
      // réutilisable pour usurper la session.
      id: hashSessionToken(row.token),
      device: getDeviceName(row.user_agent || ""),
      browser: getBrowserName(row.user_agent || ""),
      ipAddress: row.ip_address || "",
      createdAt: row.created_at,
      lastSeenAt: row.last_seen_at || row.created_at
    })),
    username: userRow.username || "",
    createdAt: userRow.created_at,
    updatedAt: userRow.updated_at,
    roleType: accountType,
    googleLinked: Boolean(userRow.google_id),
    adminModules: accountType === "admin" ? parseJsonField(userRow.admin_modules_json, []) : undefined,
    avatarDataUrl,
    profile,
    subscription,
    account: {
      accountType,
      phone: accountRow?.phone || "",
      city: accountRow?.city || "",
      country: accountRow?.country || "",
      onboardingCompleted: Boolean(Number(accountRow?.onboarding_completed || 0)),
      details
    }
  };
}

async function getPublicUserById(userId) {
  const userRow = await getUserRowById(userId);
  if (!userRow) return null;
  const relations = await getAccountRows(userId);
  const publicUser = toPublicUser(userRow, relations);

  // Si le compte a été activé via un code de licence (école/cabinet), on
  // résout le nom réel de l'organisation propriétaire du code — jamais
  // stocké en dur côté étudiant, toujours recalculé pour rester exact même
  // si l'école renomme son compte.
  const subscription = parseJsonField(userRow.subscription_json, {});
  if (subscription.licenseCode) {
    // Le propriétaire d'un code de licence peut être une école
    // (user_org_profiles) OU un cabinet (user_recruiter_profiles) — deux
    // tables différentes selon son role_type. On les joint toutes les deux
    // et on prend celle qui a une ligne (COALESCE), sinon le contact recruteur
    // "Comptes connectés" d'un compte recruiter_internal restait vide alors
    // que le cabinet avait bien rempli ses informations dans ses Paramètres.
    const { rows } = await db.query(
      `SELECT lc.plan_id, lc.revoked, u.first_name, u.last_name, u.email,
              COALESCE(o.organization_name, r.organization_name) AS organization_name,
              o.acronym, o.organization_type,
              COALESCE(o.website, r.website) AS website,
              COALESCE(o.logo_data_url, r.logo_data_url) AS logo_data_url,
              COALESCE(o.address, r.address) AS address,
              COALESCE(o.city, r.city) AS city,
              COALESCE(o.country, r.country) AS country,
              o.email_domain,
              COALESCE(o.contact_email, r.contact_email) AS contact_email,
              COALESCE(o.contact_phone, r.contact_phone) AS contact_phone,
              COALESCE(o.primary_contact_name, r.primary_contact_name) AS primary_contact_name
       FROM license_codes lc
       LEFT JOIN users u ON u.id = lc.owner_user_id
       LEFT JOIN user_org_profiles o ON o.user_id = lc.owner_user_id
       LEFT JOIN user_recruiter_profiles r ON r.user_id = lc.owner_user_id
       WHERE lc.code = $1`,
      [subscription.licenseCode]
    );
    const row = rows[0];
    if (row) {
      publicUser.schoolLicense = {
        code: subscription.licenseCode,
        organizationName: row.organization_name || `${row.first_name || ""} ${row.last_name || ""}`.trim(),
        acronym: row.acronym || "",
        organizationType: row.organization_type || "",
        website: row.website || "",
        logoDataUrl: row.logo_data_url || "",
        address: row.address || "",
        city: row.city || "",
        country: row.country || "",
        emailDomain: row.email_domain || "",
        // Contact affiché : coordonnées de contact renseignées dans les
        // paramètres de l'établissement/cabinet si présentes, sinon l'email
        // de connexion du compte propriétaire comme repli honnête (pas de
        // valeur inventée).
        contactEmail: row.contact_email || row.email || "",
        contactPhone: row.contact_phone || "",
        primaryContactName: row.primary_contact_name || "",
        planId: row.plan_id,
        revoked: Boolean(Number(row.revoked)),
        renewalAt: subscription.renewalAt || null
      };
    }
  } else if (userRow.role_type === "school" || userRow.role_type === "recruiter_firm") {
    // Le propriétaire lui-même (école ou cabinet) n'a pas de licenseCode à
    // résoudre (c'est LUI qui émet les codes) — mais son propre Compte doit
    // quand même afficher sa fiche établissement sous "Comptes connectés",
    // pas seulement les comptes qui ont rejoint via son code.
    const table = userRow.role_type === "school" ? "user_org_profiles" : "user_recruiter_profiles";
    const { rows } = await db.query(`SELECT * FROM ${table} WHERE user_id = $1`, [userId]);
    const row = rows[0];
    if (row && row.organization_name) {
      publicUser.schoolLicense = {
        code: "",
        organizationName: row.organization_name,
        acronym: row.acronym || "",
        organizationType: row.organization_type || "",
        website: row.website || "",
        logoDataUrl: row.logo_data_url || "",
        address: row.address || "",
        city: row.city || "",
        country: row.country || "",
        emailDomain: row.email_domain || "",
        contactEmail: row.contact_email || userRow.email || "",
        contactPhone: row.contact_phone || "",
        primaryContactName: row.primary_contact_name || "",
        planId: null,
        revoked: false,
        renewalAt: null
      };
    }
  }

  return publicUser;
}

async function upsertUserAccount(userId, accountType, base, avatarDataUrl = "") {
  const timestamp = nowIso();
  await db.query(
    `INSERT INTO user_accounts (user_id, account_type, phone, city, country, onboarding_completed, avatar_data_url, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     ON CONFLICT(user_id) DO UPDATE SET
       account_type = EXCLUDED.account_type,
       phone = EXCLUDED.phone,
       city = EXCLUDED.city,
       country = EXCLUDED.country,
       onboarding_completed = EXCLUDED.onboarding_completed,
       avatar_data_url = CASE WHEN EXCLUDED.avatar_data_url <> '' THEN EXCLUDED.avatar_data_url ELSE user_accounts.avatar_data_url END,
       updated_at = EXCLUDED.updated_at`,
    [
      userId,
      accountType,
      coerceString(base.phone),
      coerceString(base.city),
      coerceString(base.country),
      Number(base.onboardingCompleted ? 1 : 0),
      avatarDataUrl,
      timestamp,
      timestamp
    ]
  );
}

async function upsertCandidateProfile(userId, details) {
  const timestamp = nowIso();
  await db.query(
    `INSERT INTO user_candidate_profiles (
      user_id, current_title, target_role, experience_years, school_name, study_level,
      graduation_year, contract_preference, availability, portfolio_url, linkedin_url, updated_at
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
    ON CONFLICT(user_id) DO UPDATE SET
      current_title=EXCLUDED.current_title,
      target_role=EXCLUDED.target_role,
      experience_years=EXCLUDED.experience_years,
      school_name=EXCLUDED.school_name,
      study_level=EXCLUDED.study_level,
      graduation_year=EXCLUDED.graduation_year,
      contract_preference=EXCLUDED.contract_preference,
      availability=EXCLUDED.availability,
      portfolio_url=EXCLUDED.portfolio_url,
      linkedin_url=EXCLUDED.linkedin_url,
      updated_at=EXCLUDED.updated_at`,
    [
      userId,
      details.currentTitle,
      details.targetRole,
      coerceInteger(details.experienceYears),
      details.schoolName,
      details.studyLevel,
      details.graduationYear,
      details.contractPreference,
      details.availability,
      details.portfolioUrl,
      details.linkedinUrl,
      timestamp
    ]
  );
}

async function upsertRecruiterProfile(userId, details) {
  const timestamp = nowIso();
  await db.query(
    `INSERT INTO user_recruiter_profiles (user_id, organization_name, recruiter_role, hiring_volume, industry, website, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7)
     ON CONFLICT(user_id) DO UPDATE SET
      organization_name=EXCLUDED.organization_name,
      recruiter_role=EXCLUDED.recruiter_role,
      hiring_volume=EXCLUDED.hiring_volume,
      industry=EXCLUDED.industry,
      website=EXCLUDED.website,
      updated_at=EXCLUDED.updated_at`,
    [
      userId,
      details.organizationName,
      details.recruiterRole,
      details.hiringVolume,
      details.industry,
      details.website,
      timestamp
    ]
  );
}

async function upsertOrgProfile(userId, details) {
  const timestamp = nowIso();
  await db.query(
    `INSERT INTO user_org_profiles (
      user_id, organization_name, organization_type, department, website, size_range,
      industry, contact_role, notes, updated_at
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
    ON CONFLICT(user_id) DO UPDATE SET
      organization_name=EXCLUDED.organization_name,
      organization_type=EXCLUDED.organization_type,
      department=EXCLUDED.department,
      website=EXCLUDED.website,
      size_range=EXCLUDED.size_range,
      industry=EXCLUDED.industry,
      contact_role=EXCLUDED.contact_role,
      notes=EXCLUDED.notes,
      updated_at=EXCLUDED.updated_at`,
    [
      userId,
      details.organizationName,
      details.organizationType,
      details.department,
      details.website,
      details.sizeRange,
      details.industry,
      details.contactRole,
      details.notes,
      timestamp
    ]
  );
}

async function clearUnusedRoleProfiles(userId, accountType) {
  if (CANDIDATE_TYPES.has(accountType)) {
    await Promise.all([
      db.query("DELETE FROM user_recruiter_profiles WHERE user_id = $1", [userId]),
      db.query("DELETE FROM user_org_profiles WHERE user_id = $1", [userId])
    ]);
    return;
  }

  if (RECRUITER_TYPES.has(accountType)) {
    await Promise.all([
      db.query("DELETE FROM user_candidate_profiles WHERE user_id = $1", [userId]),
      db.query("DELETE FROM user_org_profiles WHERE user_id = $1", [userId])
    ]);
    return;
  }

  await Promise.all([
    db.query("DELETE FROM user_candidate_profiles WHERE user_id = $1", [userId]),
    db.query("DELETE FROM user_recruiter_profiles WHERE user_id = $1", [userId])
  ]);
}

async function upsertRoleDetails(userId, accountType, details) {
  await clearUnusedRoleProfiles(userId, accountType);
  if (CANDIDATE_TYPES.has(accountType)) {
    await upsertCandidateProfile(userId, details);
    return;
  }
  if (RECRUITER_TYPES.has(accountType)) {
    await upsertRecruiterProfile(userId, details);
    return;
  }
  await upsertOrgProfile(userId, details);
}

async function ensureAccountRowsForLegacyUsers() {
  const users = await db.query("SELECT id, role_type, avatar_data_url FROM users");

  for (const row of users.rows) {
    const roleType = sanitizeAccountType(row.role_type || "candidate");
    await upsertUserAccount(
      row.id,
      roleType,
      { phone: "", city: "", country: "", onboardingCompleted: 0 },
      row.avatar_data_url || ""
    );
  }
}

async function seedOffersIfNeeded() {
  const countRows = await db.query("SELECT COUNT(*)::int AS total FROM offers");
  const total = Number(countRows.rows[0]?.total || 0);
  if (total > 0) return;

  const createdAt = nowIso();
  for (const offer of OFFERS) {
    await db.query(
      `INSERT INTO offers (
        id, company, title, location, contract, premium, sector,
        experience_min, education, skills_json, missions_json, created_at, updated_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
      [
        offer.id,
        offer.company,
        offer.title,
        offer.location,
        offer.contract,
        offer.premium ? 1 : 0,
        offer.sector,
        Number(offer.experienceMin || 0),
        offer.education || "",
        JSON.stringify(offer.skills || []),
        JSON.stringify(offer.missions || []),
        createdAt,
        createdAt
      ]
    );
  }
}

await ensureAccountRowsForLegacyUsers();
await seedOffersIfNeeded();

async function getCvCount(userId) {
  const { rows } = await db.query("SELECT COUNT(*)::int AS total FROM cvs WHERE user_id = $1", [userId]);
  return Number(rows[0]?.total || 0);
}

async function getMatchScores(userId) {
  const { rows } = await db.query(
    "SELECT payload_json FROM match_runs WHERE user_id = $1 ORDER BY created_at DESC LIMIT 10",
    [userId]
  );

  return rows
    .map((row) => parseJsonField(row.payload_json, null))
    .map((payload) => Number(payload?.summary?.globalScore || 0))
    .filter((value) => Number.isFinite(value));
}

async function scorePremiumEligibility(userRow) {
  const user = await getPublicUserById(userRow.id);
  const profile = user.profile || DEFAULT_PROFILE;
  const exp = Number(profile.experienceYears || 0);
  const skillCount = normalizeSkillList(profile.skills).length;
  const targetRoleBonus = profile.targetRole ? 12 : 0;
  const sectorBonus = profile.sector ? 8 : 0;
  const onboardingBonus = user.account?.onboardingCompleted ? 8 : 0;

  const cvCount = await getCvCount(user.id);
  const cvCountBonus = cvCount > 0 ? 15 : 0;

  const matchScores = await getMatchScores(user.id);
  const avgMatch = matchScores.length
    ? matchScores.reduce((acc, value) => acc + value, 0) / matchScores.length
    : 0;
  const matchBonus = avgMatch >= 70 ? 20 : avgMatch >= 55 ? 12 : 0;

  const score = Math.min(
    100,
    exp * 8 + Math.min(30, skillCount * 3) + targetRoleBonus + sectorBonus + onboardingBonus + cvCountBonus + matchBonus
  );

  const reasons = [];
  if (exp >= 2) reasons.push("expérience professionnelle solide");
  if (skillCount >= 8) reasons.push("socle de compétences dense");
  if (avgMatch >= 60) reasons.push("bon potentiel de matching");
  if (cvCount > 0) reasons.push("CV déjà structuré dans la plateforme");
  if (user.account?.onboardingCompleted) reasons.push("onboarding compte complet");

  return {
    score,
    eligible: score >= 55,
    reasons: reasons.length ? reasons : ["Complétez votre profil pour évaluer l'éligibilité premium"],
    tier: score >= 80 ? "Elite" : score >= 65 ? "Plus" : "Starter"
  };
}

async function computePremiumAccess(userRow) {
  const eligibility = await scorePremiumEligibility(userRow);
  const subscription = parseJsonField(userRow.subscription_json, {});
  const activeSubscription = subscription.plan === "premium" && subscription.status === "active";

  return {
    eligibility,
    hasAccess: activeSubscription || eligibility.score >= 70,
    source: activeSubscription ? "subscription" : eligibility.score >= 70 ? "profile_unlock" : "locked"
  };
}

await ensureUsernames();











































async function generateLicenseCodeForPlan(userId, plan, seatsOverride = null) {
  const code = generateLicenseCode();
  const seatsTotal = seatsOverride && seatsOverride > 0 ? seatsOverride : plan.seats;
  await db.query(
    "INSERT INTO license_codes (code, owner_user_id, plan_id, seats_total, seats_used, created_at) VALUES ($1,$2,$3,$4,0,$5)",
    [code, userId, plan.id, seatsTotal, nowIso()]
  );
  return code;
}

function generateLicenseCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "LIC-";
  for (let i = 0; i < 8; i += 1) {
    if (i === 4) code += "-";
    code += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return code;
}

// Marque un événement Stripe (id evt_... du webhook, ou id cs_... d'une
// session Checkout pour le filet de sécurité manuel) comme traité. Retourne
// true la première fois (l'appelant doit appliquer l'événement), false si
// déjà traité (l'appelant doit l'ignorer) — protège contre les doublons dus
// aux retries webhook de Stripe ou au chevauchement webhook / confirmation
// manuelle sur la même session.
async function claimStripeEventOnce(eventId) {
  if (!eventId) return true;
  try {
    const result = await db.query(
      "INSERT INTO processed_stripe_events (id, processed_at) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING",
      [eventId, nowIso()]
    );
    return result.rowCount > 0;
  } catch (error) {
    console.error("Erreur verification idempotence evenement Stripe:", error);
    return true;
  }
}

async function applyPlanToUser(userId, plan, billingCycle, licenseCode, stripeIds = null, source = "instant") {
  const { rows: userRows } = await db.query("SELECT subscription_json FROM users WHERE id = $1", [userId]);
  const currentSubscription = parseJsonField(userRows[0]?.subscription_json, {});
  const wasPremium = currentSubscription.plan === "premium";
  const currentCredits = Number(currentSubscription.credits) || 0;

  // Un plan gratuit ne doit jamais pouvoir "écraser" un plan payant déjà
  // actif (ça effacerait des jetons réellement payés). Une fois premium, on
  // ne peut qu'upgrader vers un autre plan payant, jamais redescendre au
  // plan gratuit depuis cette route.
  if (!plan.grantsPremium && wasPremium) {
    const error = new Error(
      "Un plan payant est déjà actif sur ce compte : impossible de revenir au plan gratuit depuis cette action."
    );
    error.code = "DOWNGRADE_BLOCKED";
    throw error;
  }

  const cycle = billingCycle === "annual" ? "annual" : plan.monthlyPrice == null ? "annual" : "monthly";
  const startedAt = nowIso();
  const renewalDays = cycle === "annual" ? 365 : 30;
  const renewalAt = new Date(Date.now() + renewalDays * 24 * 60 * 60 * 1000).toISOString();
  // Achat d'un plan payant : les jetons restants du plan précédent
  // s'additionnent au nouveau pack plutôt que d'être perdus (upgrade, pas
  // remplacement). Un plan gratuit part toujours de son solde propre (il
  // n'est atteignable ici que pour un compte qui n'était pas encore premium).
  const nextCredits = plan.grantsPremium ? currentCredits + Number(plan.credits || 0) : Number(plan.credits || 0);

  await db.query("UPDATE users SET subscription_json = $1, updated_at = $2 WHERE id = $3", [
    JSON.stringify({
      plan: plan.grantsPremium ? "premium" : "free",
      status: "active",
      planId: plan.id,
      billingCycle: cycle,
      credits: nextCredits,
      licenseCode: licenseCode || null,
      startedAt,
      renewalAt,
      stripeCustomerId: stripeIds?.stripeCustomerId || null,
      stripeSubscriptionId: stripeIds?.stripeSubscriptionId || null
    }),
    nowIso(),
    userId
  ]);

  const listedAmount = cycle === "annual" ? plan.annualPrice || 0 : plan.monthlyPrice || 0;
  const amountCollected = source === "stripe" ? listedAmount : 0;
  await db.query(
    `INSERT INTO transactions (
      id, user_id, plan_id, billing_cycle, listed_amount, amount_collected, currency, source,
      license_code, stripe_customer_id, stripe_subscription_id, stripe_payment_intent_id, created_at
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
    [
      `txn-${crypto.randomUUID()}`,
      userId,
      plan.id,
      cycle,
      listedAmount,
      amountCollected,
      "EUR",
      source,
      licenseCode || null,
      stripeIds?.stripeCustomerId || null,
      stripeIds?.stripeSubscriptionId || null,
      stripeIds?.stripePaymentIntentId || null,
      nowIso()
    ]
  );
}









// Sondage de satisfaction (CSAT 1-10) : on ne relance pas un utilisateur
// avant SATISFACTION_COOLDOWN_MS depuis la dernière fois où le sondage lui
// a été montré — qu'il ait répondu ou fermé sans répondre. On ne le propose
// pas non plus avant qu'il ait un minimum d'usage réel (au moins un CV
// importé), pour ne pas demander un avis à un compte encore vide.
const SATISFACTION_COOLDOWN_MS = 21 * 24 * 60 * 60 * 1000;











function csvCell(value) {
  const text = value === null || value === undefined ? "" : String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function toCsv(headers, rows) {
  const lines = [headers.map(csvCell).join(",")];
  for (const row of rows) {
    lines.push(row.map(csvCell).join(","));
  }
  // BOM UTF-8 : Excel ouvre correctement les accents sans ça.
  return `?${lines.join("\r\n")}`;
}

function sendCsv(res, filename, headers, rows) {
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  return res.send(toCsv(headers, rows));
}







// Public : nécessaire pour que les pages tarifs (visiteurs non connectés
// inclus) affichent le prix réellement en vigueur si un admin l'a modifié.
























































async function requireSchoolOwner(userId) {
  const school = await getUserRowById(userId);
  if (!school || school.role_type !== "school") {
    const error = new Error("Accès établissement requis.");
    error.statusCode = 403;
    throw error;
  }
  return school;
}

// Résout l'id "racine" du cabinet (celui utilisé comme cabinet_user_id sur
// toutes les tables cabinet_*) à partir d'un compte recruteur quelconque :
// - recruiter_firm (titulaire) : racine = son propre id.
// - recruiter_internal (recruteur invité) : racine = le titulaire ayant émis
//   le code de licence qu'il a redeemed (license_codes.owner_user_id).
// Sans cette résolution, chaque recruteur travaillait sur un vivier/missions
// cloisonnés à son seul compte — aucune donnée n'était réellement partagée
// au sein d'une même équipe cabinet, ce qui rendait les rôles internes et
// les statistiques par recruteur sans objet.
async function resolveCabinetRootId(userRow) {
  if (userRow.role_type === "recruiter_firm") return userRow.id;
  const subscription = parseJsonField(userRow.subscription_json, {});
  if (subscription.licenseCode) {
    const { rows } = await db.query("SELECT owner_user_id FROM license_codes WHERE code = $1", [subscription.licenseCode]);
    if (rows[0]?.owner_user_id) return rows[0].owner_user_id;
  }
  // Compte recruiter_internal jamais rattaché à un code (cas résiduel) :
  // reste maître de ses propres données plutôt que de planter.
  return userRow.id;
}

async function requireCabinetOwner(userId) {
  const cabinet = await getUserRowById(userId);
  if (!cabinet || !RECRUITER_TYPES.has(cabinet.role_type)) {
    const error = new Error("Accès cabinet requis.");
    error.statusCode = 403;
    throw error;
  }
  cabinet.cabinetRootId = await resolveCabinetRootId(cabinet);
  cabinet.isCabinetOwner = cabinet.role_type === "recruiter_firm";
  return cabinet;
}

// Certaines actions (licence, invitations, suppression de recruteur,
// profil/vitrine publique, RGPD) restent réservées au titulaire — un
// recruteur invité partage désormais le vivier et les missions, mais ne
// gère ni la facturation ni les accès de l'équipe.
function requireCabinetOwnerRole(cabinet) {
  if (!cabinet.isCabinetOwner) {
    const error = new Error("Action réservée au titulaire du cabinet.");
    error.statusCode = 403;
    throw error;
  }
}

async function getSchoolLicenseCodeRows(schoolUserId) {
  const { rows } = await db.query("SELECT * FROM license_codes WHERE owner_user_id = $1 ORDER BY created_at DESC", [
    schoolUserId
  ]);
  return rows;
}

async function getSchoolStudentRows(schoolUserId) {
  const codeRows = await getSchoolLicenseCodeRows(schoolUserId);
  const codeSet = new Set(codeRows.map((row) => row.code));
  if (!codeSet.size) return [];
  const { rows: allUsers } = await db.query(
    "SELECT id, first_name, last_name, email, avatar_data_url, created_at, subscription_json FROM users WHERE role_type = 'student' OR role_type = 'candidate'"
  );
  return allUsers.filter((row) => {
    const subscription = parseJsonField(row.subscription_json, {});
    return subscription.licenseCode && codeSet.has(subscription.licenseCode);
  });
}

async function getCabinetLicenseCodeRows(cabinetUserId) {
  const { rows } = await db.query("SELECT * FROM license_codes WHERE owner_user_id = $1 ORDER BY created_at DESC", [
    cabinetUserId
  ]);
  return rows;
}

async function getCabinetRecruiterRows(cabinetUserId) {
  const codeRows = await getCabinetLicenseCodeRows(cabinetUserId);
  const codeSet = new Set(codeRows.map((row) => row.code));
  if (!codeSet.size) return [];
  const { rows: allUsers } = await db.query(
    "SELECT id, first_name, last_name, email, avatar_data_url, created_at, subscription_json FROM users WHERE role_type = 'recruiter_internal' OR role_type = 'recruiter_firm'"
  );
  return allUsers.filter((row) => {
    if (row.id === cabinetUserId) return false;
    const subscription = parseJsonField(row.subscription_json, {});
    return subscription.licenseCode && codeSet.has(subscription.licenseCode);
  });
}

async function buildCabinetMetrics(cabinetUserId) {
  const recruiters = await getCabinetRecruiterRows(cabinetUserId);
  const codeRows = await getCabinetLicenseCodeRows(cabinetUserId);
  const seatsTotal = codeRows.reduce((sum, row) => sum + Number(row.seats_total || 0), 0);
  const seatsUsed = codeRows.reduce((sum, row) => sum + Number(row.seats_used || 0), 0);
  const { rows: candidateRows } = await db.query(
    "SELECT id, status FROM cabinet_candidates WHERE cabinet_user_id = $1",
    [cabinetUserId]
  );
  const { rows: missionRows } = await db.query(
    "SELECT id, status FROM cabinet_missions WHERE cabinet_user_id = $1",
    [cabinetUserId]
  );
  const openMissions = missionRows.filter((row) => row.status === "open" || row.status === "in_progress");
  return {
    recruiters,
    codeRows,
    seatsTotal,
    seatsUsed,
    candidateCount: candidateRows.length,
    missionCount: missionRows.length,
    openMissionCount: openMissions.length
  };
}

function buildCabinetAlerts(metrics, language = "fr") {
  const alerts = [];
  const remainingSeats = Math.max(0, Number(metrics.seatsTotal || 0) - Number(metrics.seatsUsed || 0));
  if (metrics.seatsTotal && remainingSeats <= Math.max(1, Math.ceil(metrics.seatsTotal * 0.1))) {
    alerts.push({
      type: "license_capacity",
      title: language === "en" ? "License capacity is almost full" : "Licence presque saturée",
      body: language === "en" ? `${remainingSeats} seat(s) remaining.` : `${remainingSeats} siège(s) restant(s).`
    });
  }
  if (metrics.openMissionCount === 0 && metrics.missionCount > 0) {
    alerts.push({
      type: "no_open_mission",
      title: language === "en" ? "No open mission" : "Aucune mission ouverte",
      body: language === "en" ? "All missions are closed." : "Toutes les missions sont clôturées."
    });
  }
  return alerts;
}

// Résout, pour un lot d'utilisateurs (avec leur subscription_json déjà
// chargé), le segment de compte : "solo" (aucun code de licence), "school"
// (code émis par un établissement) ou "agency" (code émis par un
// cabinet/recruteur/entreprise). Centralisé ici pour rester identique entre
// CV importés, Offres analysées, et toute future vue Admin qui en aurait
// besoin — un code de licence peut être émis par une école OU un cabinet,
// donc la présence seule ne suffit pas, il faut le role_type du propriétaire.
async function resolveAccountSegments(usersWithSubscription) {
  const licenseCodes = [
    ...new Set(usersWithSubscription.map((row) => parseJsonField(row.subscription_json, {})?.licenseCode).filter(Boolean))
  ];
  const { rows: codeOwnerRows } = licenseCodes.length
    ? await db.query(
        `SELECT lc.code, u.role_type FROM license_codes lc JOIN users u ON u.id = lc.owner_user_id WHERE lc.code = ANY($1)`,
        [licenseCodes]
      )
    : { rows: [] };
  const segmentByCode = Object.fromEntries(
    codeOwnerRows.map((row) => [row.code, row.role_type === "school" ? "school" : "agency"])
  );
  const segmentByUserId = {};
  for (const row of usersWithSubscription) {
    const licenseCode = parseJsonField(row.subscription_json, {})?.licenseCode;
    segmentByUserId[row.id] = licenseCode && segmentByCode[licenseCode] ? segmentByCode[licenseCode] : "solo";
  }
  return segmentByUserId;
}

async function getSchoolOrgProfile(userId) {
  const { rows } = await db.query("SELECT * FROM user_org_profiles WHERE user_id = $1", [userId]);
  const row = rows[0] || {};
  return {
    organizationName: row.organization_name || "",
    acronym: row.acronym || "",
    organizationType: row.organization_type || "",
    department: row.department || "",
    website: row.website || "",
    sizeRange: row.size_range || "",
    industry: row.industry || "",
    contactRole: row.contact_role || "",
    notes: row.notes || "",
    logoDataUrl: row.logo_data_url || "",
    address: row.address || "",
    city: row.city || "",
    country: row.country || "",
    emailDomain: row.email_domain || "",
    contactEmail: row.contact_email || "",
    contactPhone: row.contact_phone || "",
    primaryContactName: row.primary_contact_name || "",
    updatedAt: row.updated_at || ""
  };
}

async function buildSchoolMetrics(userId, { restrictToStudentIds = null } = {}) {
  const allStudents = await getSchoolStudentRows(userId);
  const students = restrictToStudentIds ? allStudents.filter((row) => restrictToStudentIds.has(row.id)) : allStudents;
  const studentIds = students.map((row) => row.id);
  const codeRows = await getSchoolLicenseCodeRows(userId);
  const seatsTotal = codeRows.reduce((sum, row) => sum + Number(row.seats_total || 0), 0);
  const seatsUsed = codeRows.reduce((sum, row) => sum + Number(row.seats_used || 0), 0);
  const { rows: cvRows } = studentIds.length
    ? await db.query("SELECT user_id, created_at, parsed_json FROM cvs WHERE user_id = ANY($1)", [studentIds])
    : { rows: [] };
  const { rows: matchRows } = studentIds.length
    ? await db.query("SELECT user_id, created_at, payload_json FROM match_runs WHERE user_id = ANY($1)", [studentIds])
    : { rows: [] };
  const lastActivityByStudent = {};
  for (const row of [...cvRows, ...matchRows]) {
    const time = new Date(row.created_at).getTime();
    if (!lastActivityByStudent[row.user_id] || time > lastActivityByStudent[row.user_id]) {
      lastActivityByStudent[row.user_id] = time;
    }
  }
  const activeStudentIds = new Set([...cvRows.map((row) => row.user_id), ...matchRows.map((row) => row.user_id)]);
  const scores = matchRows
    .map((row) => parseJsonField(row.payload_json, {})?.matchInsights?.score)
    .filter((score) => typeof score === "number");
  const latestScoreByStudent = {};
  for (const row of [...matchRows].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))) {
    if (latestScoreByStudent[row.user_id] !== undefined) continue;
    const score = parseJsonField(row.payload_json, {})?.matchInsights?.score;
    latestScoreByStudent[row.user_id] = typeof score === "number" ? score : null;
  }
  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const inactiveStudents = students.filter((student) => {
    const lastActivity = lastActivityByStudent[student.id];
    return !lastActivity || lastActivity < thirtyDaysAgo;
  });
  const lowScoreStudents = students.filter((student) => {
    const score = latestScoreByStudent[student.id];
    return typeof score === "number" && score < 50;
  });
  const withoutCvStudents = students.filter((student) => !cvRows.some((row) => row.user_id === student.id));
  const parsedCvs = cvRows.map((row) => parseJsonField(row.parsed_json, {}));
  const targetRoleCounts = {};
  const skillCounts = {};
  for (const parsed of parsedCvs) {
    const target = coerceString(parsed.targetRole || parsed.headline || "").trim();
    if (target) targetRoleCounts[target] = (targetRoleCounts[target] || 0) + 1;
    for (const skill of Array.isArray(parsed.skills) ? parsed.skills : []) {
      const key = coerceString(skill).trim();
      if (key) skillCounts[key] = (skillCounts[key] || 0) + 1;
    }
  }
  return {
    students,
    codeRows,
    cvRows,
    matchRows,
    seatsTotal,
    seatsUsed,
    activationRate: studentIds.length ? Math.round((activeStudentIds.size / studentIds.length) * 100) : 0,
    avgScore: scores.length ? Math.round(scores.reduce((sum, value) => sum + value, 0) / scores.length) : null,
    inactiveStudents,
    lowScoreStudents,
    withoutCvStudents,
    topTargetRoles: Object.entries(targetRoleCounts).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([label, count]) => ({ label, count })),
    topSkills: Object.entries(skillCounts).sort((a, b) => b[1] - a[1]).slice(0, 12).map(([label, count]) => ({ label, count }))
  };
}

function buildSchoolAlerts(metrics, language = "fr") {
  const alerts = [];
  const remainingSeats = Math.max(0, Number(metrics.seatsTotal || 0) - Number(metrics.seatsUsed || 0));
  if (metrics.seatsTotal && remainingSeats <= Math.max(2, Math.ceil(metrics.seatsTotal * 0.1))) {
    alerts.push({
      type: "license_capacity",
      title: language === "en" ? "License capacity is almost full" : "Licence presque saturée",
      body: language === "en" ? `${remainingSeats} seat(s) remaining.` : `${remainingSeats} siège(s) restant(s).`
    });
  }
  if (metrics.withoutCvStudents.length) {
    alerts.push({
      type: "students_without_cv",
      title: language === "en" ? "Students without CV" : "Étudiants sans CV",
      body: language === "en" ? `${metrics.withoutCvStudents.length} student(s) have not imported a CV.` : `${metrics.withoutCvStudents.length} étudiant(s) n'ont pas encore importé de CV.`
    });
  }
  if (metrics.lowScoreStudents.length) {
    alerts.push({
      type: "low_match_score",
      title: language === "en" ? "Low match scores detected" : "Scores de matching faibles détectés",
      body: language === "en" ? `${metrics.lowScoreStudents.length} student(s) are below 50%.` : `${metrics.lowScoreStudents.length} étudiant(s) sont sous 50 %.`
    });
  }
  if (metrics.inactiveStudents.length) {
    alerts.push({
      type: "inactive_students",
      title: language === "en" ? "Inactive students" : "Étudiants inactifs",
      body: language === "en" ? `${metrics.inactiveStudents.length} student(s) inactive for 30+ days.` : `${metrics.inactiveStudents.length} étudiant(s) inactifs depuis 30 jours ou plus.`
    });
  }
  return alerts;
}

// Digest hebdomadaire École : envoie un résumé par email des alertes actives
// (sièges bientôt saturés, étudiants sans CV, scores faibles, inactifs) aux
// établissements concernés, une fois par semaine max par établissement (suivi
// via school_digest_log). Purement additif au-dessus des mêmes calculs que la
// cloche de notif in-app — aucune alerte n'est stockée deux fois.
async function runSchoolWeeklyDigests() {
  try {
    const { rows: schools } = await db.query(
      "SELECT id, first_name, email FROM users WHERE role_type = 'school'"
    );
    if (!schools.length) return;
    const { rows: logRows } = await db.query("SELECT school_user_id, last_sent_at FROM school_digest_log");
    const lastSentByUser = Object.fromEntries(logRows.map((row) => [row.school_user_id, new Date(row.last_sent_at).getTime()]));
    const transporter = getMailTransporter();
    if (!transporter) return;
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
    const now = Date.now();

    for (const school of schools) {
      const lastSent = lastSentByUser[school.id];
      if (lastSent && now - lastSent < sevenDaysMs) continue;
      try {
        const metrics = await buildSchoolMetrics(school.id);
        const alerts = buildSchoolAlerts(metrics, "fr");
        if (alerts.length) {
          const { rows: orgProfileRows } = await db.query(
            "SELECT organization_name FROM user_org_profiles WHERE user_id = $1",
            [school.id]
          );
          const organizationName = orgProfileRows[0]?.organization_name || school.first_name || "votre établissement";
          const html = `
            <div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;">
              <h2 style="color:#b83309;margin:0 0 18px;">Career CV — Résumé hebdomadaire</h2>
              <p style="margin:0 0 14px;color:#1f2634;">Bonjour,</p>
              <p style="margin:0 0 14px;color:#1f2634;">Voici les points d'attention pour <strong>${escapeHtml(organizationName)}</strong> cette semaine :</p>
              <ul style="margin:0 0 18px;padding-left:20px;color:#1f2634;line-height:1.7;">
                ${alerts.map((alert) => `<li><strong>${escapeHtml(alert.title)}</strong> — ${escapeHtml(alert.body)}</li>`).join("")}
              </ul>
              <p style="margin:0 0 14px;color:#1f2634;">Connectez-vous à votre espace École pour plus de détails.</p>
              <p style="margin:24px 0 0;color:#5b6478;font-size:0.85rem;">— L'équipe Career CV</p>
            </div>`;
          const text = `Résumé hebdomadaire Career CV pour ${organizationName} :\n\n${alerts
            .map((alert) => `- ${alert.title} : ${alert.body}`)
            .join("\n")}\n\n— L'équipe Career CV`;
          const recipient = AUTH_EMAIL_TO || school.email;
          await transporter.sendMail({
            from: MAIL_FROM,
            to: recipient,
            subject: `Career CV — Résumé hebdomadaire (${alerts.length} point${alerts.length > 1 ? "s" : ""} d'attention)`,
            html,
            text
          });
        }
        await db.query(
          `INSERT INTO school_digest_log (school_user_id, last_sent_at) VALUES ($1, $2)
           ON CONFLICT (school_user_id) DO UPDATE SET last_sent_at = EXCLUDED.last_sent_at`,
          [school.id, new Date().toISOString()]
        );
      } catch (_perSchoolError) {
        // Une erreur sur un établissement ne doit pas bloquer les autres.
      }
    }
  } catch (_error) {
    // Le digest est une amélioration best-effort, jamais bloquante pour l'API.
  }
}

// Digest hebdomadaire Cabinet — miroir de runSchoolWeeklyDigests, mêmes
// garanties (best-effort, une fois par semaine max par cabinet).
async function runCabinetWeeklyDigests() {
  try {
    const { rows: cabinets } = await db.query(
      "SELECT id, first_name, email FROM users WHERE role_type = 'recruiter_firm'"
    );
    if (!cabinets.length) return;
    const { rows: logRows } = await db.query("SELECT cabinet_user_id, last_sent_at FROM cabinet_digest_log");
    const lastSentByUser = Object.fromEntries(logRows.map((row) => [row.cabinet_user_id, new Date(row.last_sent_at).getTime()]));
    const transporter = getMailTransporter();
    if (!transporter) return;
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
    const now = Date.now();

    for (const cabinet of cabinets) {
      const lastSent = lastSentByUser[cabinet.id];
      if (lastSent && now - lastSent < sevenDaysMs) continue;
      try {
        const metrics = await buildCabinetMetrics(cabinet.id);
        const alerts = buildCabinetAlerts(metrics, "fr");
        if (alerts.length) {
          const { rows: profileRows } = await db.query(
            "SELECT organization_name FROM user_recruiter_profiles WHERE user_id = $1",
            [cabinet.id]
          );
          const organizationName = profileRows[0]?.organization_name || cabinet.first_name || "votre cabinet";
          const html = `
            <div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;">
              <h2 style="color:#b83309;margin:0 0 18px;">Career CV — Résumé hebdomadaire</h2>
              <p style="margin:0 0 14px;color:#1f2634;">Bonjour,</p>
              <p style="margin:0 0 14px;color:#1f2634;">Voici les points d'attention pour <strong>${escapeHtml(organizationName)}</strong> cette semaine :</p>
              <ul style="margin:0 0 18px;padding-left:20px;color:#1f2634;line-height:1.7;">
                ${alerts.map((alert) => `<li><strong>${escapeHtml(alert.title)}</strong> — ${escapeHtml(alert.body)}</li>`).join("")}
              </ul>
              <p style="margin:0 0 14px;color:#1f2634;">Connectez-vous à votre espace Cabinet pour plus de détails.</p>
              <p style="margin:24px 0 0;color:#5b6478;font-size:0.85rem;">— L'équipe Career CV</p>
            </div>`;
          const text = `Résumé hebdomadaire Career CV pour ${organizationName} :\n\n${alerts
            .map((alert) => `- ${alert.title} : ${alert.body}`)
            .join("\n")}\n\n— L'équipe Career CV`;
          const recipient = AUTH_EMAIL_TO || cabinet.email;
          await transporter.sendMail({
            from: MAIL_FROM,
            to: recipient,
            subject: `Career CV — Résumé hebdomadaire (${alerts.length} point${alerts.length > 1 ? "s" : ""} d'attention)`,
            html,
            text
          });
        }
        await db.query(
          `INSERT INTO cabinet_digest_log (cabinet_user_id, last_sent_at) VALUES ($1, $2)
           ON CONFLICT (cabinet_user_id) DO UPDATE SET last_sent_at = EXCLUDED.last_sent_at`,
          [cabinet.id, new Date().toISOString()]
        );
      } catch (_perCabinetError) {
        // Une erreur sur un cabinet ne doit pas bloquer les autres.
      }
    }
  } catch (_error) {
    // Le digest est une amélioration best-effort, jamais bloquante pour l'API.
  }
}







































function slugifyForEmail(value) {
    return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function companyNameToDomain(companyName) {
  const slug = String(companyName || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\b(sa|sas|sarl|inc|ltd|llc|corp|co)\b/g, "")
    .replace(/[^a-z0-9]+/g, "");
  return slug ? `${slug}.com` : "";
}

function generateEmailCandidates(firstName, lastName, domain) {
  const f = slugifyForEmail(firstName);
  const l = slugifyForEmail(lastName);
  if (!f || !l || !domain) return [];
  const patterns = [
    { id: "first.last", email: `${f}.${l}@${domain}` },
    { id: "flast", email: `${f[0]}${l}@${domain}` },
    { id: "first", email: `${f}@${domain}` },
    { id: "firstlast", email: `${f}${l}@${domain}` },
    { id: "first_last", email: `${f}_${l}@${domain}` },
    { id: "last.first", email: `${l}.${f}@${domain}` }
  ];
  const seen = new Set();
  return patterns.filter((pattern) => {
    if (seen.has(pattern.email)) return false;
    seen.add(pattern.email);
    return true;
  });
}

/**
 * Best-effort SMTP RCPT TO probe, no API key required. Many hosts block
 * outbound port 25 and many mail servers accept-all at this stage (catch-all),
 * so a "timeout"/"unknown" outcome is common and expected — callers must treat
 * it as inconclusive, never as a false positive.
 */
function probeSmtp(email, mxHost, { timeoutMs = 4000 } = {}) {
  return new Promise((resolve) => {
    let settled = false;
    let step = 0;
    let buffer = "";
    const heloDomain = "careerapp.local";
    const mailFrom = "verify@careerapp.local";

    const socket = net.createConnection({ host: mxHost, port: 25 });
    socket.setTimeout(timeoutMs);

    function finish(status) {
      if (settled) return;
      settled = true;
      try {
        socket.destroy();
      } catch (_error) {
        // socket already closing
      }
      resolve({ status });
    }

    socket.on("timeout", () => finish("timeout"));
    socket.on("error", () => finish("error"));

    socket.on("data", (chunk) => {
      buffer += chunk.toString("utf8");
      const lines = buffer.split("\r\n").filter(Boolean);
      const last = lines[lines.length - 1] || "";
      if (!/^\d{3}[ -]/.test(last)) return;
      if (/^\d{3}-/.test(last)) return;
      const code = parseInt(last.slice(0, 3), 10);
      buffer = "";

      if (step === 0) {
        if (code === 220) {
          socket.write(`HELO ${heloDomain}\r\n`);
          step = 1;
        } else {
          finish("error");
        }
      } else if (step === 1) {
        if (code === 250) {
          socket.write(`MAIL FROM:<${mailFrom}>\r\n`);
          step = 2;
        } else {
          finish("error");
        }
      } else if (step === 2) {
        if (code === 250) {
          socket.write(`RCPT TO:<${email}>\r\n`);
          step = 3;
        } else {
          finish("error");
        }
      } else if (step === 3) {
        if (code === 250) finish("accepted");
        else if (code >= 550 && code < 560) finish("rejected");
        else finish("unknown");
      }
    });
  });
}



































const JOB_APPLICATION_STATUSES = new Set(["to_apply", "applied", "interview", "offer", "rejected"]);

function toPublicJobApplication(row) {
  return {
    id: row.id,
    userId: row.user_id,
    status: row.status,
    title: row.title,
    company: row.company,
    location: row.location,
    offerUrl: row.offer_url,
    offerText: row.offer_text,
    matchScore: row.match_score === null || row.match_score === undefined ? null : Number(row.match_score),
    cvId: row.cv_id,
    notes: row.notes,
    appliedAt: row.applied_at,
    nextActionAt: row.next_action_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}



















await loadPlatformSettings();

// Dépendances partagées par tous les modules de routes (backend/routes/*.js) :
// db, helpers, constantes — tout ce qui est défini plus haut dans ce fichier.
app.locals.ctx = {
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
  hashSessionToken,
  aiActionRateLimiter,
  aiConversationRateLimiter,
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
  resolveAccountSegments,
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
  claimStripeEventOnce,
  SATISFACTION_COOLDOWN_MS,
  csvCell,
  toCsv,
  sendCsv,
  requireSchoolOwner,
  getSchoolLicenseCodeRows,
  getSchoolStudentRows,
  requireCabinetOwner,
  requireCabinetOwnerRole,
  resolveCabinetRootId,
  AUTH_SKIP_SIGNUP_OTP,
  getCabinetLicenseCodeRows,
  getCabinetRecruiterRows,
  buildCabinetMetrics,
  buildCabinetAlerts,
  getSchoolOrgProfile,
  buildSchoolMetrics,
  buildSchoolAlerts,
  slugifyForEmail,
  companyNameToDomain,
  generateEmailCandidates,
  probeSmtp,
  JOB_APPLICATION_STATUSES,
  toPublicJobApplication
};

registerHealthRoutes(app);
registerAuthRoutes(app);
registerProfileRoutes(app);
registerPremiumRoutes(app);
registerBillingRoutes(app);
registerAdminRoutes(app);
registerSatisfactionRoutes(app);
registerSchoolRoutes(app);
registerCabinetRoutes(app);
registerTokensRoutes(app);
registerEmailFinderRoutes(app);
registerCvRoutes(app);
registerMatchingRoutes(app);
registerCoverLetterRoutes(app);
registerNegotiationRoutes(app);
registerApplicationsRoutes(app);
registerInterviewRoutes(app);

const serverStart = await startServer(app);

if (serverStart.status === "existing") {
  console.log(`Career API detectee deja active sur http://${SERVER_HOST}:${serverStart.port}`);
  console.log("Ce processus API reste en veille pour ne pas dupliquer le service.");
  setInterval(() => {}, 60_000);
} else {
  console.log(`Career API (PostgreSQL embarque) sur http://${SERVER_HOST}:${serverStart.port}`);
  console.log(`Donnees PostgreSQL: ${dataDirectory}`);

  // Digest hebdomadaire École : vérifié toutes les 6h, chaque établissement
  // n'est réellement notifié qu'une fois par semaine (voir school_digest_log
  // dans runSchoolWeeklyDigests). Un premier passage a lieu peu après le
  // démarrage pour ne pas dépendre d'un cron externe.
  setTimeout(() => runSchoolWeeklyDigests(), 60_000);
  setInterval(() => runSchoolWeeklyDigests(), 6 * 60 * 60 * 1000);
  setTimeout(() => runCabinetWeeklyDigests(), 90_000);
  setInterval(() => runCabinetWeeklyDigests(), 6 * 60 * 60 * 1000);
}





