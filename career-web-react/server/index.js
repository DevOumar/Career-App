import cors from "cors";
import crypto from "crypto";
import express from "express";
import fs from "node:fs";
import { promises as fsPromises } from "node:fs";
import path from "path";
import { fileURLToPath } from "url";
import { PGlite } from "@electric-sql/pglite";
import { OFFERS } from "../src/data/offers.js";

const BASE_PORT = Number(process.env.PORT || 8787);
const PORT_RETRY_COUNT = Number(process.env.PORT_RETRY_COUNT || 4);
const LOCAL_ORIGIN_PATTERN = /^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/i;

const ACCOUNT_TYPES = new Set([
  "candidate",
  "student",
  "recruiter_firm",
  "recruiter_internal",
  "company",
  "school",
  "coach",
  "other"
]);

const CANDIDATE_TYPES = new Set(["candidate", "student"]);
const RECRUITER_TYPES = new Set(["recruiter_firm", "recruiter_internal"]);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_DATA_DIR = path.join(__dirname, "postgres-data");
const LEGACY_DATA_DIR = path.join(__dirname, "pgdata");
const LOCAL_APP_ROOT = path.join(__dirname, "postgres-runtime");
const RUNTIME_DATA_DIR = path.join(LOCAL_APP_ROOT, "postgres-data");
const CUSTOM_DATA_DIR = process.env.PGLITE_DATA_DIR ? path.resolve(process.env.PGLITE_DATA_DIR) : null;

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
      const server = app.listen(port, "127.0.0.1");

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
          console.warn(`API deja active sur http://127.0.0.1:${port} (processus existant conserve).`);
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

const { db, dataDirectory } = await openEmbeddedPostgres();

const app = express();
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || LOCAL_ORIGIN_PATTERN.test(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error("Origin non autorisee"), false);
    }
  })
);
app.use(express.json({ limit: "10mb" }));

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
`);

await db.query("UPDATE users SET updated_at = created_at WHERE COALESCE(updated_at, '') = ''");

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

function parseJsonField(input, fallback) {
  try {
    return input ? JSON.parse(input) : fallback;
  } catch (error) {
    return fallback;
  }
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

async function getUserRowByEmail(email) {
  const { rows } = await db.query("SELECT * FROM users WHERE email = $1 LIMIT 1", [normalizeEmail(email)]);
  return rows[0] || null;
}

async function getAccountRows(userId) {
  const [accountQ, candidateQ, recruiterQ, orgQ] = await Promise.all([
    db.query("SELECT * FROM user_accounts WHERE user_id = $1 LIMIT 1", [userId]),
    db.query("SELECT * FROM user_candidate_profiles WHERE user_id = $1 LIMIT 1", [userId]),
    db.query("SELECT * FROM user_recruiter_profiles WHERE user_id = $1 LIMIT 1", [userId]),
    db.query("SELECT * FROM user_org_profiles WHERE user_id = $1 LIMIT 1", [userId])
  ]);

  return {
    account: accountQ.rows[0] || null,
    candidate: candidateQ.rows[0] || null,
    recruiter: recruiterQ.rows[0] || null,
    org: orgQ.rows[0] || null
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

  return {
    id: userRow.id,
    firstName: userRow.first_name,
    lastName: userRow.last_name,
    email: userRow.email,
    createdAt: userRow.created_at,
    updatedAt: userRow.updated_at,
    roleType: accountType,
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
  return toPublicUser(userRow, relations);
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
    reasons: reasons.length ? reasons : ["complète ton profil pour évaluer l'éligibilité premium"],
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

app.get("/api/health", async (_req, res) => {
  const ping = await db.query("SELECT 1 AS ok");
  res.json({ ok: ping.rows[0]?.ok === 1 });
});

app.post("/api/auth/register", async (req, res) => {
  try {
    requireFields(req.body, ["firstName", "lastName", "email", "password"]);

    const firstName = coerceString(req.body.firstName);
    const lastName = coerceString(req.body.lastName);
    const email = normalizeEmail(req.body.email);
    const password = String(req.body.password || "");

    const accountType = sanitizeAccountType(req.body.accountType || "candidate");
    const onboardingPayload = sanitizeOnboardingPayload(accountType, req.body.onboarding || {});

    if (!email.includes("@")) {
      return res.status(400).json({ error: "Email invalide." });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: "Le mot de passe doit contenir au moins 8 caractères." });
    }

    const existingUser = await getUserRowByEmail(email);
    if (existingUser) {
      return res.status(409).json({ error: "Un compte existe déjà avec cet email." });
    }

    const id = `usr-${crypto.randomUUID()}`;
    const createdAt = nowIso();
    const passwordRecord = createPasswordRecord(password);
    const avatarDataUrl = normalizeAvatarDataUrl(req.body.avatarDataUrl || "");

    const seededProfile = applyOnboardingToProfile(
      { ...DEFAULT_PROFILE },
      onboardingPayload.accountType,
      onboardingPayload.details
    );

    await db.query(
      `INSERT INTO users (
        id, first_name, last_name, email, password_hash, password_salt, created_at,
        updated_at, role_type, avatar_data_url, profile_json, subscription_json
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
      [
        id,
        firstName,
        lastName,
        email,
        passwordRecord.hash,
        passwordRecord.salt,
        createdAt,
        createdAt,
        onboardingPayload.accountType,
        avatarDataUrl,
        JSON.stringify(seededProfile),
        JSON.stringify({
          plan: "free",
          status: "active",
          startedAt: createdAt,
          renewalAt: null
        })
      ]
    );

    await upsertUserAccount(id, onboardingPayload.accountType, onboardingPayload.base, avatarDataUrl);
    await upsertRoleDetails(id, onboardingPayload.accountType, onboardingPayload.details);

    const publicUser = await getPublicUserById(id);
    return res.status(201).json({ user: publicUser });
  } catch (error) {
    return res.status(500).json({ error: error.message || "Erreur serveur." });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const email = normalizeEmail(req.body?.email);
    const password = String(req.body?.password || "");

    const user = await getUserRowByEmail(email);
    if (!user || !verifyPassword(password, user.password_salt, user.password_hash)) {
      return res.status(401).json({ error: "Identifiants invalides." });
    }

    const token = `sess-${crypto.randomUUID()}`;
    await db.query("INSERT INTO sessions (token, user_id, created_at) VALUES ($1, $2, $3)", [token, user.id, nowIso()]);

    return res.json({ token, user: await getPublicUserById(user.id) });
  } catch (error) {
    return res.status(500).json({ error: error.message || "Erreur serveur." });
  }
});

app.post("/api/auth/password", async (req, res) => {
  try {
    const userId = coerceString(req.body?.userId);
    const currentPassword = String(req.body?.currentPassword || "");
    const newPassword = String(req.body?.newPassword || "");

    if (!userId || !currentPassword || !newPassword) {
      return res.status(400).json({ error: "Paramètres manquants pour changer le mot de passe." });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ error: "Le nouveau mot de passe doit contenir au moins 8 caractères." });
    }

    const user = await getUserRowById(userId);
    if (!user) {
      return res.status(404).json({ error: "Utilisateur introuvable." });
    }

    if (!verifyPassword(currentPassword, user.password_salt, user.password_hash)) {
      return res.status(401).json({ error: "Mot de passe actuel incorrect." });
    }

    const next = createPasswordRecord(newPassword);
    await db.query(
      "UPDATE users SET password_hash = $1, password_salt = $2, updated_at = $3 WHERE id = $4",
      [next.hash, next.salt, nowIso(), userId]
    );

    await db.query("DELETE FROM sessions WHERE user_id = $1", [userId]);
    return res.json({ ok: true });
  } catch (error) {
    return res.status(500).json({ error: error.message || "Erreur serveur." });
  }
});

app.get("/api/auth/session", async (req, res) => {
  try {
    const authHeader = String(req.headers.authorization || "");
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
    if (!token) {
      return res.status(401).json({ error: "Session invalide." });
    }

    const sessionRows = await db.query("SELECT user_id FROM sessions WHERE token = $1 LIMIT 1", [token]);
    const session = sessionRows.rows[0];
    if (!session) {
      return res.status(401).json({ error: "Session expirée." });
    }

    const user = await getUserRowById(session.user_id);
    if (!user) {
      return res.status(404).json({ error: "Utilisateur introuvable." });
    }

    const premium = await computePremiumAccess(user);
    return res.json({ user: await getPublicUserById(user.id), premium });
  } catch (error) {
    return res.status(500).json({ error: error.message || "Erreur serveur." });
  }
});

app.post("/api/auth/logout", async (req, res) => {
  try {
    const authHeader = String(req.headers.authorization || "");
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
    if (token) {
      await db.query("DELETE FROM sessions WHERE token = $1", [token]);
    }
    return res.json({ ok: true });
  } catch (error) {
    return res.status(500).json({ error: error.message || "Erreur serveur." });
  }
});

app.patch("/api/profile", async (req, res) => {
  try {
    const userId = coerceString(req.body?.userId);
    if (!userId) {
      return res.status(400).json({ error: "userId requis." });
    }

    const user = await getUserRowById(userId);
    if (!user) {
      return res.status(404).json({ error: "Utilisateur introuvable." });
    }

    const currentProfile = parseJsonField(user.profile_json, { ...DEFAULT_PROFILE });
    const patch = sanitizeProfilePatch(req.body?.patch || {});
    const nextProfile = {
      ...currentProfile,
      ...patch
    };

    await db.query("UPDATE users SET profile_json = $1, updated_at = $2 WHERE id = $3", [
      JSON.stringify(nextProfile),
      nowIso(),
      userId
    ]);

    const updatedUser = await getUserRowById(userId);
    const premium = await computePremiumAccess(updatedUser);
    return res.json({ user: await getPublicUserById(userId), premium });
  } catch (error) {
    return res.status(500).json({ error: error.message || "Erreur serveur." });
  }
});

app.patch("/api/account", async (req, res) => {
  try {
    const userId = coerceString(req.body?.userId);
    const patch = req.body?.patch || {};

    if (!userId) {
      return res.status(400).json({ error: "userId requis." });
    }

    const user = await getUserRowById(userId);
    if (!user) {
      return res.status(404).json({ error: "Utilisateur introuvable." });
    }

    const relations = await getAccountRows(userId);
    const currentAccountType = sanitizeAccountType(
      patch.accountType || relations.account?.account_type || user.role_type || "candidate"
    );

    const onboarding = sanitizeOnboardingPayload(currentAccountType, {
      phone: Object.prototype.hasOwnProperty.call(patch, "phone") ? patch.phone : relations.account?.phone,
      city: Object.prototype.hasOwnProperty.call(patch, "city") ? patch.city : relations.account?.city,
      country: Object.prototype.hasOwnProperty.call(patch, "country") ? patch.country : relations.account?.country,
      onboardingCompleted: Object.prototype.hasOwnProperty.call(patch, "onboardingCompleted")
        ? patch.onboardingCompleted
        : relations.account?.onboarding_completed,
      details: patch.details || {}
    });

    await db.query("UPDATE users SET role_type = $1, updated_at = $2 WHERE id = $3", [
      onboarding.accountType,
      nowIso(),
      userId
    ]);

    await upsertUserAccount(userId, onboarding.accountType, onboarding.base);
    await upsertRoleDetails(userId, onboarding.accountType, onboarding.details);

    const currentProfile = parseJsonField(user.profile_json, { ...DEFAULT_PROFILE });
    const nextProfile = applyOnboardingToProfile(currentProfile, onboarding.accountType, onboarding.details);
    await db.query("UPDATE users SET profile_json = $1, updated_at = $2 WHERE id = $3", [
      JSON.stringify(nextProfile),
      nowIso(),
      userId
    ]);

    const updatedUser = await getUserRowById(userId);
    const premium = await computePremiumAccess(updatedUser);
    return res.json({ user: await getPublicUserById(userId), premium });
  } catch (error) {
    return res.status(500).json({ error: error.message || "Erreur serveur." });
  }
});

app.patch("/api/profile/avatar", async (req, res) => {
  try {
    const userId = coerceString(req.body?.userId);
    const avatarDataUrl = normalizeAvatarDataUrl(req.body?.avatarDataUrl || "");

    if (!userId) {
      return res.status(400).json({ error: "userId requis." });
    }

    const user = await getUserRowById(userId);
    if (!user) {
      return res.status(404).json({ error: "Utilisateur introuvable." });
    }

    await db.query("UPDATE users SET avatar_data_url = $1, updated_at = $2 WHERE id = $3", [
      avatarDataUrl,
      nowIso(),
      userId
    ]);

    const relations = await getAccountRows(userId);
    const accountType = sanitizeAccountType(relations.account?.account_type || user.role_type || "candidate");
    await upsertUserAccount(
      userId,
      accountType,
      {
        phone: relations.account?.phone || "",
        city: relations.account?.city || "",
        country: relations.account?.country || "",
        onboardingCompleted: Number(relations.account?.onboarding_completed || 0)
      },
      avatarDataUrl
    );

    const updatedUser = await getUserRowById(userId);
    const premium = await computePremiumAccess(updatedUser);
    return res.json({ user: await getPublicUserById(userId), premium });
  } catch (error) {
    return res.status(500).json({ error: error.message || "Erreur serveur." });
  }
});

app.get("/api/premium", async (req, res) => {
  try {
    const userId = coerceString(req.query.userId);
    if (!userId) {
      return res.status(400).json({ error: "userId requis." });
    }
    const user = await getUserRowById(userId);
    if (!user) {
      return res.status(404).json({ error: "Utilisateur introuvable." });
    }
    return res.json(await computePremiumAccess(user));
  } catch (error) {
    return res.status(500).json({ error: error.message || "Erreur serveur." });
  }
});

app.post("/api/premium/activate", async (req, res) => {
  try {
    const userId = coerceString(req.body?.userId);
    if (!userId) {
      return res.status(400).json({ error: "userId requis." });
    }

    const user = await getUserRowById(userId);
    if (!user) {
      return res.status(404).json({ error: "Utilisateur introuvable." });
    }

    const access = await computePremiumAccess(user);
    if (!access.eligibility.eligible) {
      return res.status(400).json({ error: "Profil non éligible à l'activation premium." });
    }

    const startedAt = nowIso();
    const renewalAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    await db.query("UPDATE users SET subscription_json = $1, updated_at = $2 WHERE id = $3", [
      JSON.stringify({
        plan: "premium",
        status: "active",
        startedAt,
        renewalAt
      }),
      nowIso(),
      userId
    ]);

    const updatedUser = await getUserRowById(userId);
    const premium = await computePremiumAccess(updatedUser);
    return res.json({ user: await getPublicUserById(userId), premium });
  } catch (error) {
    return res.status(500).json({ error: error.message || "Erreur serveur." });
  }
});

app.post("/api/cv", async (req, res) => {
  try {
    const userId = coerceString(req.body?.userId);
    const cvRecord = req.body?.cvRecord;

    if (!userId || !cvRecord) {
      return res.status(400).json({ error: "userId et cvRecord requis." });
    }

    const user = await getUserRowById(userId);
    if (!user) {
      return res.status(404).json({ error: "Utilisateur introuvable." });
    }

    const id = `cv-${crypto.randomUUID()}`;
    const createdAt = nowIso();
    const fileName = coerceString(cvRecord.fileName || "cv.txt") || "cv.txt";
    const sourceText = stripNullBytes(cvRecord.sourceText || "");
    const parsedJson = JSON.stringify(cvRecord.parsed || {});

    await db.query(
      `INSERT INTO cvs (id, user_id, created_at, file_name, source_text, parsed_json)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        id,
        userId,
        createdAt,
        fileName,
        sourceText,
        parsedJson
      ]
    );

    return res.status(201).json({
      cv: {
        id,
        userId,
        createdAt,
        fileName,
        sourceText,
        parsed: cvRecord.parsed || {}
      }
    });
  } catch (error) {
    return res.status(500).json({ error: error.message || "Erreur serveur." });
  }
});

app.get("/api/cv", async (req, res) => {
  try {
    const userId = coerceString(req.query.userId);
    if (!userId) {
      return res.status(400).json({ error: "userId requis." });
    }

    const { rows } = await db.query(
      "SELECT id, user_id, created_at, file_name, source_text, parsed_json FROM cvs WHERE user_id = $1 ORDER BY created_at DESC",
      [userId]
    );

    const items = rows.map((row) => ({
      id: row.id,
      userId: row.user_id,
      createdAt: row.created_at,
      fileName: row.file_name,
      sourceText: row.source_text,
      parsed: parseJsonField(row.parsed_json, {})
    }));

    return res.json({ items });
  } catch (error) {
    return res.status(500).json({ error: error.message || "Erreur serveur." });
  }
});

app.get("/api/offers", async (_req, res) => {
  const { rows } = await db.query(
    `SELECT id, company, title, location, contract, premium, sector, experience_min, education, skills_json, missions_json
     FROM offers ORDER BY company, title`
  );

  const items = rows.map((row) => ({
    id: row.id,
    company: row.company,
    title: row.title,
    location: row.location,
    contract: row.contract,
    premium: Boolean(Number(row.premium || 0)),
    sector: row.sector,
    experienceMin: Number(row.experience_min || 0),
    education: row.education,
    skills: parseJsonField(row.skills_json, []),
    missions: parseJsonField(row.missions_json, [])
  }));

  res.json({ items });
});

app.post("/api/matches", async (req, res) => {
  try {
    const userId = coerceString(req.body?.userId);
    const payload = req.body?.payload;

    if (!userId || !payload) {
      return res.status(400).json({ error: "userId et payload requis." });
    }

    const user = await getUserRowById(userId);
    if (!user) {
      return res.status(404).json({ error: "Utilisateur introuvable." });
    }

    const id = `match-${crypto.randomUUID()}`;
    const createdAt = nowIso();

    await db.query(
      "INSERT INTO match_runs (id, user_id, created_at, payload_json) VALUES ($1, $2, $3, $4)",
      [id, userId, createdAt, JSON.stringify(payload)]
    );

    return res.status(201).json({
      run: {
        id,
        userId,
        createdAt,
        ...payload
      }
    });
  } catch (error) {
    return res.status(500).json({ error: error.message || "Erreur serveur." });
  }
});

app.get("/api/matches/latest", async (req, res) => {
  try {
    const userId = coerceString(req.query.userId);
    if (!userId) {
      return res.status(400).json({ error: "userId requis." });
    }

    const { rows } = await db.query(
      "SELECT id, user_id, created_at, payload_json FROM match_runs WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1",
      [userId]
    );

    if (!rows[0]) {
      return res.json({ run: null });
    }

    return res.json({
      run: {
        id: rows[0].id,
        userId: rows[0].user_id,
        createdAt: rows[0].created_at,
        ...parseJsonField(rows[0].payload_json, {})
      }
    });
  } catch (error) {
    return res.status(500).json({ error: error.message || "Erreur serveur." });
  }
});

const serverStart = await startServer(app);

if (serverStart.status === "existing") {
  console.log(`Career API detectee deja active sur http://127.0.0.1:${serverStart.port}`);
  console.log("Ce processus API reste en veille pour ne pas dupliquer le service.");
  setInterval(() => {}, 60_000);
} else {
  console.log(`Career API (PostgreSQL embarque) sur http://127.0.0.1:${serverStart.port}`);
  console.log(`Donnees PostgreSQL: ${dataDirectory}`);
}

