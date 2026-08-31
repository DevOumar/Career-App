// Tests d'intégration de l'espace École — complète api.test.mjs (couvre déjà
// auth/candidat) avec les routes ajoutées/durcies pour ce module cette
// session : garde de session sur les routes École, contrôle du format
// promotion, et le nouveau bulk-invite. Même vrai serveur/vraie base que
// api.test.mjs, comptes jetables (@example.test) nettoyés en fin de suite.
//
// Lancer : npm test (depuis career-web-react/)

import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs";
import pg from "pg";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, "..", "..");
const TEST_PORT = 8798;
const BASE = `http://127.0.0.1:${TEST_PORT}`;

let serverProcess;
let serverLogs = "";
let pool;
const createdUserIds = [];
const createdLicenseCodes = [];

function readEnvValue(key) {
  const content = fs.readFileSync(path.join(PROJECT_ROOT, ".env"), "utf8");
  const match = content.match(new RegExp(`^${key}=(.*)$`, "m"));
  return match ? match[1].trim() : "";
}

function waitForServerReady(timeoutMs = 20000) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const check = async () => {
      try {
        const res = await fetch(`${BASE}/api/health`);
        if (res.ok) return resolve();
      } catch (_error) {
        // Serveur pas encore prêt, on retente.
      }
      if (Date.now() - start > timeoutMs) return reject(new Error("Le serveur de test n'a pas démarré à temps."));
      setTimeout(check, 400);
    };
    check();
  });
}

function extractOtpFromLogs(email) {
  const pattern = new RegExp(`Code (?:reset|login|signup) pour ${email.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}: (\\d{6})`);
  const matches = [...serverLogs.matchAll(new RegExp(pattern, "g"))];
  const last = matches[matches.length - 1];
  return last ? last[1] : null;
}

before(async () => {
  const databaseUrl = readEnvValue("DATABASE_URL") || readEnvValue("SUPABASE_DB_URL");
  pool = new pg.Pool({ connectionString: databaseUrl, ssl: databaseUrl ? { rejectUnauthorized: false } : undefined });

  serverProcess = spawn(process.execPath, ["backend/index.js"], {
    cwd: PROJECT_ROOT,
    env: { ...process.env, PORT: String(TEST_PORT), PORT_RETRY_COUNT: "0", DISABLE_AUTH_RATE_LIMIT: "1" }
  });
  serverProcess.stdout.on("data", (chunk) => {
    serverLogs += chunk.toString();
  });
  serverProcess.stderr.on("data", (chunk) => {
    serverLogs += chunk.toString();
  });

  await waitForServerReady();
});

after(async () => {
  if (createdLicenseCodes.length) {
    await pool.query("DELETE FROM license_codes WHERE code = ANY($1)", [createdLicenseCodes]).catch(() => {});
  }
  if (createdUserIds.length) {
    const tables = [
      "sessions",
      "email_verification_codes",
      "user_email_addresses",
      "account_security_events",
      "school_promotion_students",
      "school_promotions",
      "school_invitations",
      "school_reports",
      "school_notifications"
    ];
    for (const table of tables) {
      const column = table.startsWith("school_") && table !== "school_promotion_students" ? "school_user_id" : "user_id";
      await pool.query(`DELETE FROM ${table} WHERE ${column} = ANY($1)`, [createdUserIds]).catch(() => {});
    }
    await pool.query("DELETE FROM users WHERE id = ANY($1)", [createdUserIds]).catch(() => {});
  }
  await pool?.end().catch(() => {});
  serverProcess?.kill();
});

async function createDisposableUser(emailPrefix, accountType = "student") {
  const email = `${emailPrefix}-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.test`;
  const res = await fetch(`${BASE}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      firstName: "Test",
      lastName: "Suite",
      username: `test_${Date.now()}_${Math.floor(Math.random() * 1e6)}`,
      email,
      password: "TestPassword123",
      accountType
    })
  });
  const data = await res.json();
  assert.equal(res.status, 201, `Inscription échouée: ${JSON.stringify(data)}`);

  const code = extractOtpFromLogs(email);
  assert.ok(code, "Code de vérification introuvable dans les logs serveur.");

  const verifyRes = await fetch(`${BASE}/api/auth/verify-code`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identifier: email, code, purpose: "signup" })
  });
  const verifyData = await verifyRes.json();
  assert.equal(verifyRes.status, 200, `Vérification échouée: ${JSON.stringify(verifyData)}`);

  createdUserIds.push(verifyData.user.id);
  return { email, userId: verifyData.user.id, token: verifyData.token };
}

async function grantLicenseSeats(schoolUserId, seatsTotal = 5) {
  const code = `LIC-TEST-${Math.floor(Math.random() * 1e6)}`;
  await pool.query(
    "INSERT INTO license_codes (code, owner_user_id, plan_id, seats_total, seats_used, created_at) VALUES ($1,$2,$3,$4,0,$5)",
    [code, schoolUserId, "school_institut", seatsTotal, new Date().toISOString()]
  );
  createdLicenseCodes.push(code);
  return code;
}

test("les routes École refusent une requête sans session (401)", async () => {
  const res = await fetch(`${BASE}/api/school/students?userId=usr-quelconque`);
  assert.equal(res.status, 401);
});

test("un compte non-école se voit refuser l'accès aux routes École (403)", async () => {
  const candidate = await createDisposableUser("school-guard-candidate", "student");
  const res = await fetch(`${BASE}/api/school/students?userId=${candidate.userId}`, {
    headers: { Authorization: `Bearer ${candidate.token}` }
  });
  assert.equal(res.status, 403);
});

test("une école ne peut pas agir avec le token d'une autre école (403)", async () => {
  const schoolA = await createDisposableUser("school-guard-a", "school");
  const schoolB = await createDisposableUser("school-guard-b", "school");

  const res = await fetch(`${BASE}/api/school/promotions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${schoolA.token}` },
    body: JSON.stringify({ userId: schoolB.userId, name: "Promo usurpée" })
  });
  assert.equal(res.status, 403);
});

test("création de promotion : nom trop court refusé, année académique mal formée refusée", async () => {
  const school = await createDisposableUser("promo-validation", "school");

  const shortNameRes = await fetch(`${BASE}/api/school/promotions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${school.token}` },
    body: JSON.stringify({ userId: school.userId, name: "A" })
  });
  assert.equal(shortNameRes.status, 400);

  const badYearRes = await fetch(`${BASE}/api/school/promotions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${school.token}` },
    body: JSON.stringify({ userId: school.userId, name: "Promo Data", academicYear: "2025/2026" })
  });
  assert.equal(badYearRes.status, 400);

  const okRes = await fetch(`${BASE}/api/school/promotions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${school.token}` },
    body: JSON.stringify({ userId: school.userId, name: "Promo Data", academicYear: "2025-2026" })
  });
  const okData = await okRes.json();
  assert.equal(okRes.status, 201, `Création échouée: ${JSON.stringify(okData)}`);
});

test("import en masse : sans siège disponible, toutes les invitations sont ignorées (skippedNoSeat)", async () => {
  const school = await createDisposableUser("bulk-no-seat", "school");

  const res = await fetch(`${BASE}/api/school/students/bulk-invite`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${school.token}` },
    body: JSON.stringify({ userId: school.userId, emails: ["etudiant1@example.test", "etudiant2@example.test"] })
  });
  const data = await res.json();
  assert.equal(res.status, 201, `Réponse: ${JSON.stringify(data)}`);
  assert.equal(data.sent.length, 0);
  assert.equal(data.skippedNoSeat.length, 2);
});

test("import en masse : avec des sièges disponibles, les invitations sont envoyées et bornées à la capacité", async () => {
  const school = await createDisposableUser("bulk-with-seats", "school");
  await grantLicenseSeats(school.userId, 1);

  const res = await fetch(`${BASE}/api/school/students/bulk-invite`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${school.token}` },
    body: JSON.stringify({
      userId: school.userId,
      emails: ["etudiant-a@example.test", "etudiant-b@example.test"]
    })
  });
  const data = await res.json();
  assert.equal(res.status, 201, `Réponse: ${JSON.stringify(data)}`);
  assert.equal(data.sent.length, 1, "Un seul siège disponible => une seule invitation envoyée.");
  assert.equal(data.skippedNoSeat.length, 1);
});
