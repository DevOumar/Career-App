// Tests d'intégration de l'espace Cabinet — même principe que
// school.test.mjs : garde de session sur les routes cabinet, et le
// parcours mission + candidat de bout en bout.
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
const TEST_PORT = 8796;
const BASE = `http://127.0.0.1:${TEST_PORT}`;

let serverProcess;
let serverLogs = "";
let pool;
const createdUserIds = [];

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
  if (createdUserIds.length) {
    const tables = [
      "sessions",
      "email_verification_codes",
      "user_email_addresses",
      "account_security_events",
      "cabinet_candidates",
      "cabinet_missions",
      "cabinet_invitations",
      "cabinet_announcements",
      "cabinet_reports"
    ];
    for (const table of tables) {
      const column = table.startsWith("cabinet_") ? "cabinet_user_id" : "user_id";
      await pool.query(`DELETE FROM ${table} WHERE ${column} = ANY($1)`, [createdUserIds]).catch(() => {});
    }
    await pool.query("DELETE FROM cabinet_mission_candidates WHERE candidate_id IN (SELECT id FROM cabinet_candidates WHERE cabinet_user_id = ANY($1))", [createdUserIds]).catch(() => {});
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

test("les routes Cabinet refusent un compte non-cabinet (403)", async () => {
  const candidate = await createDisposableUser("cabinet-guard-candidate", "student");
  const res = await fetch(`${BASE}/api/cabinet/overview?userId=${candidate.userId}`, {
    headers: { Authorization: `Bearer ${candidate.token}` }
  });
  assert.equal(res.status, 403);
});

test("parcours mission : création, ajout d'un candidat du vivier, changement d'étape", async () => {
  const cabinet = await createDisposableUser("cabinet-flow", "recruiter_firm");

  const missionRes = await fetch(`${BASE}/api/cabinet/missions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${cabinet.token}` },
    body: JSON.stringify({ userId: cabinet.userId, title: "Data Engineer Senior", clientName: "Client X" })
  });
  const missionData = await missionRes.json();
  assert.equal(missionRes.status, 201, `Création mission échouée: ${JSON.stringify(missionData)}`);

  const candidateRes = await fetch(`${BASE}/api/cabinet/candidates`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${cabinet.token}` },
    body: JSON.stringify({ userId: cabinet.userId, firstName: "Ada", lastName: "Lovelace", skills: ["Python", "SQL"] })
  });
  const candidateData = await candidateRes.json();
  assert.equal(candidateRes.status, 201, `Création candidat échouée: ${JSON.stringify(candidateData)}`);

  const linkRes = await fetch(`${BASE}/api/cabinet/missions/${missionData.id}/candidates`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${cabinet.token}` },
    body: JSON.stringify({ userId: cabinet.userId, candidateId: candidateData.id, action: "add" })
  });
  assert.equal(linkRes.status, 201);

  const stageRes = await fetch(`${BASE}/api/cabinet/missions/${missionData.id}/candidates`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${cabinet.token}` },
    body: JSON.stringify({ userId: cabinet.userId, candidateId: candidateData.id, action: "stage", stage: "interviewing" })
  });
  assert.equal(stageRes.status, 200);

  const listRes = await fetch(`${BASE}/api/cabinet/missions?userId=${cabinet.userId}`, {
    headers: { Authorization: `Bearer ${cabinet.token}` }
  });
  const listData = await listRes.json();
  assert.equal(listData.items[0].candidates[0].stage, "interviewing");
});
