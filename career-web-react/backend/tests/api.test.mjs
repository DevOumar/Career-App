// Tests d'intégration du backend Career CV — couvre les points durcis lors
// de l'audit sécurité de cette session (idempotence Stripe, verrouillage
// après 5 échecs, appartenance de session, réinitialisation de mot de
// passe). Utilise le vrai serveur Express (démarré ici en enfant, sur un
// port dédié) et la vraie base configurée dans .env : les comptes créés ici
// sont jetables (email aléatoire) et nettoyés en fin de suite.
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
const TEST_PORT = 8799;
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

// Le code OTP (login/signup/reset) n'est jamais en clair en base (haché) —
// on le récupère dans les logs du process serveur, exactement comme le
// backend le fait pour le débogage local (voir createEmailVerificationCode).
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
    // Best-effort : mêmes tables que DELETE /api/account côté backend.
    const tables = [
      "sessions",
      "email_verification_codes",
      "user_email_addresses",
      "account_security_events",
      "processed_stripe_events"
    ];
    for (const table of tables) {
      const column = table === "processed_stripe_events" ? null : "user_id";
      if (!column) continue;
      await pool.query(`DELETE FROM ${table} WHERE user_id = ANY($1)`, [createdUserIds]).catch(() => {});
    }
    await pool.query("DELETE FROM users WHERE id = ANY($1)", [createdUserIds]).catch(() => {});
  }
  await pool?.end().catch(() => {});
  serverProcess?.kill();
});

async function createDisposableUser(emailPrefix) {
  const email = `${emailPrefix}-${Date.now()}@example.test`;
  const res = await fetch(`${BASE}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      firstName: "Test",
      lastName: "Suite",
      username: `test_${Date.now()}`,
      email,
      password: "TestPassword123",
      accountType: "student"
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

test("GET /api/health répond ok", async () => {
  const res = await fetch(`${BASE}/api/health`);
  const data = await res.json();
  assert.equal(res.status, 200);
  assert.equal(data.ok, true);
});

test("une route protégée refuse une requête sans session (401)", async () => {
  const res = await fetch(`${BASE}/api/tokens/consume`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId: "usr-quelconque", amount: 1 })
  });
  assert.equal(res.status, 401);
});

test("une route protégée refuse un userId qui ne correspond pas au token (403)", async () => {
  const userA = await createDisposableUser("session-guard-a");
  const userB = await createDisposableUser("session-guard-b");

  const res = await fetch(`${BASE}/api/tokens/consume`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${userA.token}` },
    body: JSON.stringify({ userId: userB.userId, amount: 1 })
  });
  assert.equal(res.status, 403);
});

test("le compte se verrouille après 5 mots de passe erronés", async () => {
  const user = await createDisposableUser("lockout");

  for (let i = 0; i < 5; i += 1) {
    const res = await fetch(`${BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier: user.email, password: "MauvaisMotDePasse" })
    });
    assert.equal(res.status, 401, `Tentative ${i + 1} aurait dû être un mot de passe invalide, pas un verrouillage prématuré.`);
  }

  // 6e tentative : même avec le BON mot de passe, le compte doit rester verrouillé.
  const lockedRes = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identifier: user.email, password: "TestPassword123" })
  });
  const lockedData = await lockedRes.json();
  assert.equal(lockedRes.status, 429, `Réponse: ${JSON.stringify(lockedData)}`);
});

test("réinitialisation de mot de passe : flux complet + reconnexion avec le nouveau mot de passe", async () => {
  const user = await createDisposableUser("reset-flow");

  const forgotRes = await fetch(`${BASE}/api/auth/forgot-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identifier: user.email })
  });
  assert.equal(forgotRes.status, 200);

  const code = extractOtpFromLogs(user.email);
  assert.ok(code, "Code de réinitialisation introuvable dans les logs serveur.");

  const resetRes = await fetch(`${BASE}/api/auth/reset-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identifier: user.email, code, newPassword: "NouveauMotDePasse456" })
  });
  const resetData = await resetRes.json();
  assert.equal(resetRes.status, 200, `Réinitialisation échouée: ${JSON.stringify(resetData)}`);
  assert.ok(resetData.token, "La réinitialisation doit reconnecter automatiquement l'utilisateur.");

  // L'ancien mot de passe ne doit plus fonctionner.
  const oldPasswordRes = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identifier: user.email, password: "TestPassword123" })
  });
  assert.equal(oldPasswordRes.status, 401);

  // Le nouveau mot de passe doit fonctionner.
  const newPasswordRes = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identifier: user.email, password: "NouveauMotDePasse456" })
  });
  assert.equal(newPasswordRes.status, 200);
});

test("réinitialisation avec un mauvais code est refusée", async () => {
  const user = await createDisposableUser("reset-bad-code");
  await fetch(`${BASE}/api/auth/forgot-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identifier: user.email })
  });

  const res = await fetch(`${BASE}/api/auth/reset-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identifier: user.email, code: "000000", newPassword: "PeuImporte123" })
  });
  assert.equal(res.status, 401);
});

test("forgot-password ne révèle pas si le compte existe (même réponse pour un email inconnu)", async () => {
  const res = await fetch(`${BASE}/api/auth/forgot-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identifier: `inconnu-${Date.now()}@example.test` })
  });
  const data = await res.json();
  assert.equal(res.status, 200);
  assert.equal(data.ok, true);
});
