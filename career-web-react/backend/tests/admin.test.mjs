// Tests d'intégration Admin — couvre la faille corrigée cette session :
// requireAdminModule() doit être vérifié côté serveur, pas seulement caché
// dans le menu côté frontend. Un compte admin créé avec un accès restreint
// à un seul module ne doit pas pouvoir appeler l'API des autres modules,
// même en connaissant l'URL directement.
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
const TEST_PORT = 8797;
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
    const tables = ["sessions", "email_verification_codes", "user_email_addresses", "account_security_events"];
    for (const table of tables) {
      await pool.query(`DELETE FROM ${table} WHERE user_id = ANY($1)`, [createdUserIds]).catch(() => {});
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

// Promeut un compte déjà créé (register+verify classique) en admin restreint
// à une liste de modules, directement en base — plus simple/robuste que de
// dépendre du parcours de création d'admin par un autre admin.
async function promoteToRestrictedAdmin(userId, allowedModules) {
  await pool.query("UPDATE users SET role_type = 'admin', admin_modules_json = $2 WHERE id = $1", [
    userId,
    JSON.stringify(allowedModules)
  ]);
}

test("un compte non-admin se voit refuser l'accès à la vue plateforme École (403)", async () => {
  const candidate = await createDisposableUser("admin-guard-candidate", "student");
  const res = await fetch(`${BASE}/api/admin/schools?adminUserId=${candidate.userId}`, {
    headers: { Authorization: `Bearer ${candidate.token}` }
  });
  assert.equal(res.status, 403);
});

test("un admin restreint à un seul module ne peut pas appeler l'API d'un autre module (403), même en connaissant l'URL", async () => {
  const admin = await createDisposableUser("admin-restricted", "student");
  await promoteToRestrictedAdmin(admin.userId, ["accounts"]);

  // Autorisé : le module qu'on lui a explicitement donné.
  const allowedRes = await fetch(`${BASE}/api/admin/users?adminUserId=${admin.userId}&page=1&pageSize=1`, {
    headers: { Authorization: `Bearer ${admin.token}` }
  });
  assert.equal(allowedRes.status, 200, `Le module autorisé (accounts) aurait dû répondre 200: ${await allowedRes.text()}`);

  // Refusé : un module qu'il n'a pas, même si l'API existe et qu'il est bien admin.
  const deniedRes = await fetch(`${BASE}/api/admin/finance?adminUserId=${admin.userId}`, {
    headers: { Authorization: `Bearer ${admin.token}` }
  });
  assert.equal(deniedRes.status, 403, `Le module non autorisé (finance) aurait dû répondre 403, a répondu ${deniedRes.status}`);
});

test("un admin sans restriction (adminModules vide) garde l'accès complet", async () => {
  const admin = await createDisposableUser("admin-full", "student");
  await promoteToRestrictedAdmin(admin.userId, []);

  const res = await fetch(`${BASE}/api/admin/finance?adminUserId=${admin.userId}`, {
    headers: { Authorization: `Bearer ${admin.token}` }
  });
  assert.equal(res.status, 200, `Un admin full access devrait accéder à finance: ${await res.text()}`);
});
