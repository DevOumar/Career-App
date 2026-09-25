// Double authentification (MFA) : application TOTP, clés de sécurité
// WebAuthn/FIDO2 et codes de récupération — sur le modèle de Jurysia.
//
// Principes :
//  - le secret TOTP est CHIFFRÉ en base (AES-256-GCM, clé MFA_ENCRYPTION_KEY
//    fournie par l'environnement, jamais stockée en base) ;
//  - les codes de récupération sont HACHÉS (usage unique, jamais relisibles) ;
//  - une connexion avec MFA ne crée AUCUNE session tant que le second facteur
//    n'est pas validé : le mot de passe (ou Google) ne délivre qu'un « ticket »
//    court (10 min, 5 essais) échangé ensuite contre la session ;
//  - un code TOTP ne peut servir qu'une fois (anti-rejeu par compteur).
import crypto from "node:crypto";
import QRCode from "qrcode";
import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse
} from "@simplewebauthn/server";

export const MFA_ISSUER = "Career CV";
const TOTP_STEP_SECONDS = 30;
const TOTP_DIGITS = 6;
const TOTP_WINDOW = 1; // tolérance d'un pas (±30 s) pour les horloges décalées
const RECOVERY_CODE_COUNT = 10;
const TICKET_TTL_MINUTES = 10;
const TICKET_MAX_ATTEMPTS = 5;
const KEY_CHALLENGE_TTL_MINUTES = 5;

// ------------------------------------------------------------------ base32 (RFC 4648)
const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

export function base32Encode(buffer) {
  let bits = 0;
  let value = 0;
  let output = "";
  for (const byte of buffer) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  return output;
}

export function base32Decode(input) {
  const clean = String(input || "").toUpperCase().replace(/[^A-Z2-7]/g, "");
  let bits = 0;
  let value = 0;
  const bytes = [];
  for (const char of clean) {
    value = (value << 5) | BASE32_ALPHABET.indexOf(char);
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}

// ------------------------------------------------------------------ TOTP (RFC 6238, HMAC-SHA1)
function hotp(secretBuffer, counter) {
  const message = Buffer.alloc(8);
  message.writeBigUInt64BE(BigInt(counter));
  const digest = crypto.createHmac("sha1", secretBuffer).update(message).digest();
  const offset = digest[digest.length - 1] & 0x0f;
  const binary = (digest.readUInt32BE(offset) & 0x7fffffff) % 10 ** TOTP_DIGITS;
  return String(binary).padStart(TOTP_DIGITS, "0");
}

/**
 * Vérifie un code TOTP. Renvoie le compteur accepté (pour l'anti-rejeu) ou
 * null. `lastCounter` : dernier compteur déjà utilisé pour ce compte — un code
 * de la même fenêtre ne peut pas être réutilisé.
 */
export function verifyTotp(secretBase32, code, lastCounter = -1, now = Date.now()) {
  const clean = String(code || "").replace(/\D/g, "");
  if (clean.length !== TOTP_DIGITS) return null;
  const secret = base32Decode(secretBase32);
  const current = Math.floor(now / 1000 / TOTP_STEP_SECONDS);
  for (let delta = -TOTP_WINDOW; delta <= TOTP_WINDOW; delta += 1) {
    const counter = current + delta;
    if (counter <= lastCounter) continue;
    const expected = hotp(secret, counter);
    if (crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(clean))) return counter;
  }
  return null;
}

export function generateTotpSecret() {
  return base32Encode(crypto.randomBytes(20));
}

export function totpUri(secretBase32, accountLabel) {
  const label = encodeURIComponent(`${MFA_ISSUER}:${accountLabel}`);
  const params = new URLSearchParams({
    secret: secretBase32,
    issuer: MFA_ISSUER,
    algorithm: "SHA1",
    digits: String(TOTP_DIGITS),
    period: String(TOTP_STEP_SECONDS)
  });
  return `otpauth://totp/${label}?${params.toString()}`;
}

// ------------------------------------------------------------------ chiffrement du secret TOTP
function parseEncryptionKey(raw) {
  const value = String(raw || "").trim();
  if (!value) return null;
  const buffer = /^[0-9a-f]{64}$/i.test(value) ? Buffer.from(value, "hex") : Buffer.from(value, "base64");
  return buffer.length === 32 ? buffer : null;
}

// ------------------------------------------------------------------ codes de récupération
// Alphabet sans caractères ambigus (0/O, 1/I/L) : les codes se recopient à la main.
const RECOVERY_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

function randomRecoveryCode() {
  const bytes = crypto.randomBytes(10);
  const chars = Array.from(bytes, (byte) => RECOVERY_ALPHABET[byte % RECOVERY_ALPHABET.length]).join("");
  return `${chars.slice(0, 5)}-${chars.slice(5)}`;
}

export function normalizeRecoveryCode(code) {
  return String(code || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}

// Codes aléatoires à ~49 bits d'entropie + tentatives limitées : un SHA-256
// salé suffit (un hachage lent type PBKDF2 ×10 codes rendrait chaque essai
// inutilement coûteux pour le serveur).
function hashRecoveryCode(code, salt) {
  return crypto.createHash("sha256").update(`${salt}:${normalizeRecoveryCode(code)}`).digest("hex");
}

const sha256 = (value) => crypto.createHash("sha256").update(String(value)).digest("hex");

/**
 * Service MFA lié à la base. `origins` : origines autorisées (APP_URL +
 * CORS_ORIGINS) — WebAuthn lie chaque clé à un domaine (rpID) et vérifie
 * l'origine de chaque opération.
 */
export function createMfaService({ db, nowIso, encryptionKey, origins = [] }) {
  const key = parseEncryptionKey(encryptionKey);

  function encryptSecret(plain) {
    if (!key) throw Object.assign(new Error("Double authentification indisponible : MFA_ENCRYPTION_KEY n'est pas configurée sur le serveur."), { statusCode: 503 });
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
    const encrypted = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
    return `v1:${iv.toString("base64")}:${cipher.getAuthTag().toString("base64")}:${encrypted.toString("base64")}`;
  }

  function decryptSecret(payload) {
    if (!key) throw Object.assign(new Error("Double authentification indisponible : MFA_ENCRYPTION_KEY n'est pas configurée sur le serveur."), { statusCode: 503 });
    const [version, iv, tag, data] = String(payload || "").split(":");
    if (version !== "v1" || !iv || !tag || !data) throw new Error("Secret MFA illisible.");
    const decipher = crypto.createDecipheriv("aes-256-gcm", key, Buffer.from(iv, "base64"));
    decipher.setAuthTag(Buffer.from(tag, "base64"));
    return Buffer.concat([decipher.update(Buffer.from(data, "base64")), decipher.final()]).toString("utf8");
  }

  // --------------------------------------------------------------- état
  async function getState(userId) {
    const { rows: userRows } = await db.query(
      "SELECT totp_secret_enc, totp_enabled_at, totp_last_counter FROM users WHERE id = $1",
      [userId]
    );
    const user = userRows[0] || {};
    const { rows: keyRows } = await db.query(
      "SELECT id, name, created_at, last_used_at FROM user_security_keys WHERE user_id = $1 ORDER BY created_at ASC",
      [userId]
    );
    const { rows: codeRows } = await db.query(
      "SELECT COUNT(*)::int AS remaining FROM user_recovery_codes WHERE user_id = $1 AND used_at = ''",
      [userId]
    );
    const totpActive = Boolean(user.totp_enabled_at && user.totp_secret_enc);
    const keys = keyRows.map((row) => ({ id: row.id, name: row.name, createdAt: row.created_at, lastUsedAt: row.last_used_at || null }));
    return {
      enabled: totpActive || keys.length > 0,
      totp: { active: totpActive, enabledAt: totpActive ? user.totp_enabled_at : null },
      securityKeys: keys,
      recoveryCodes: { remaining: Number(codeRows[0]?.remaining || 0) },
      available: Boolean(key)
    };
  }

  async function loginMethods(userId) {
    const state = await getState(userId);
    if (!state.enabled) return [];
    const methods = [];
    if (state.totp.active) methods.push("totp");
    if (state.securityKeys.length) methods.push("security_key");
    if (state.recoveryCodes.remaining > 0) methods.push("recovery_code");
    return methods;
  }

  // --------------------------------------------------------------- TOTP
  async function startTotpEnrollment(userId, accountLabel) {
    const secret = generateTotpSecret();
    await db.query("UPDATE users SET totp_pending_enc = $1 WHERE id = $2", [encryptSecret(secret), userId]);
    const uri = totpUri(secret, accountLabel);
    const qrCodeDataUrl = await QRCode.toDataURL(uri, { margin: 1, width: 376, errorCorrectionLevel: "M" });
    return { secret, qrCodeDataUrl };
  }

  async function confirmTotpEnrollment(userId, code) {
    const { rows } = await db.query("SELECT totp_pending_enc FROM users WHERE id = $1", [userId]);
    const pending = rows[0]?.totp_pending_enc;
    if (!pending) return { ok: false, error: "no_pending" };
    const secret = decryptSecret(pending);
    const counter = verifyTotp(secret, code);
    if (counter === null) return { ok: false, error: "invalid_code" };
    await db.query(
      "UPDATE users SET totp_secret_enc = $1, totp_pending_enc = '', totp_enabled_at = $2, totp_last_counter = $3 WHERE id = $4",
      [pending, nowIso(), counter, userId]
    );
    return { ok: true };
  }

  async function cancelTotpEnrollment(userId) {
    await db.query("UPDATE users SET totp_pending_enc = '' WHERE id = $1", [userId]);
  }

  /** Vérifie un code de l'application (connexion ou confirmation d'identité). */
  async function checkTotp(userId, code) {
    const { rows } = await db.query("SELECT totp_secret_enc, totp_enabled_at, totp_last_counter FROM users WHERE id = $1", [userId]);
    const row = rows[0];
    if (!row?.totp_enabled_at || !row.totp_secret_enc) return false;
    const counter = verifyTotp(decryptSecret(row.totp_secret_enc), code, Number(row.totp_last_counter ?? -1));
    if (counter === null) return false;
    // Anti-rejeu : le même code (même fenêtre de 30 s) ne passera plus.
    await db.query("UPDATE users SET totp_last_counter = $1 WHERE id = $2", [counter, userId]);
    return true;
  }

  async function disableTotp(userId) {
    await db.query(
      "UPDATE users SET totp_secret_enc = '', totp_pending_enc = '', totp_enabled_at = '', totp_last_counter = -1 WHERE id = $1",
      [userId]
    );
    await invalidateRecoveryCodesIfNoFactor(userId);
  }

  // --------------------------------------------------------------- codes de récupération
  async function regenerateRecoveryCodes(userId) {
    const codes = Array.from({ length: RECOVERY_CODE_COUNT }, randomRecoveryCode);
    const createdAt = nowIso();
    await db.query("DELETE FROM user_recovery_codes WHERE user_id = $1", [userId]);
    for (const code of codes) {
      const salt = crypto.randomBytes(8).toString("hex");
      await db.query(
        "INSERT INTO user_recovery_codes (id, user_id, code_hash, code_salt, used_at, created_at) VALUES ($1,$2,$3,$4,'',$5)",
        [`rcv-${crypto.randomUUID()}`, userId, hashRecoveryCode(code, salt), salt, createdAt]
      );
    }
    return codes;
  }

  async function consumeRecoveryCode(userId, code) {
    if (normalizeRecoveryCode(code).length !== 10) return false;
    const { rows } = await db.query(
      "SELECT id, code_hash, code_salt FROM user_recovery_codes WHERE user_id = $1 AND used_at = ''",
      [userId]
    );
    const match = rows.find((row) =>
      crypto.timingSafeEqual(Buffer.from(row.code_hash, "hex"), Buffer.from(hashRecoveryCode(code, row.code_salt), "hex"))
    );
    if (!match) return false;
    const { rowCount } = await db.query("UPDATE user_recovery_codes SET used_at = $1 WHERE id = $2 AND used_at = ''", [nowIso(), match.id]);
    return rowCount > 0;
  }

  // Plus aucun facteur actif : les codes de récupération n'ont plus d'objet.
  async function invalidateRecoveryCodesIfNoFactor(userId) {
    const state = await getState(userId);
    if (!state.totp.active && state.securityKeys.length === 0) {
      await db.query("DELETE FROM user_recovery_codes WHERE user_id = $1", [userId]);
    }
  }

  // --------------------------------------------------------------- WebAuthn
  /**
   * Domaine (rpID) et origine attendus, déduits de l'en-tête Origin de la
   * requête — seulement s'il fait partie des origines autorisées. Les
   * navigateurs refusent WebAuthn sur une adresse IP : en local, il faut
   * ouvrir l'application via « localhost ».
   */
  function relyingParty(req) {
    const origin = String(req.headers.origin || "").replace(/\/+$/, "");
    const allowed = new Set(
      [...origins, ...origins.map((item) => item.replace("127.0.0.1", "localhost"))].map((item) => item.replace(/\/+$/, ""))
    );
    if (!origin || !allowed.has(origin)) {
      throw Object.assign(new Error("Origine non autorisée pour les clés de sécurité."), { statusCode: 400 });
    }
    const hostname = new URL(origin).hostname;
    if (/^\d+\.\d+\.\d+\.\d+$/.test(hostname) || hostname.includes(":")) {
      throw Object.assign(new Error("Les clés de sécurité exigent un nom de domaine : ouvrez l'application via « localhost » ou en HTTPS."), { statusCode: 400 });
    }
    return { rpID: hostname, origin };
  }

  async function saveKeyChallenge(userId, purpose, challenge, ticketId = "") {
    await db.query("DELETE FROM mfa_key_challenges WHERE user_id = $1 AND purpose = $2", [userId, purpose]);
    await db.query(
      "INSERT INTO mfa_key_challenges (id, user_id, purpose, challenge, ticket_id, expires_at, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7)",
      [`kch-${crypto.randomUUID()}`, userId, purpose, challenge, ticketId, new Date(Date.now() + KEY_CHALLENGE_TTL_MINUTES * 60000).toISOString(), nowIso()]
    );
  }

  async function takeKeyChallenge(userId, purpose) {
    const { rows } = await db.query(
      "DELETE FROM mfa_key_challenges WHERE user_id = $1 AND purpose = $2 RETURNING challenge, ticket_id, expires_at",
      [userId, purpose]
    );
    const row = rows[0];
    if (!row || new Date(row.expires_at).getTime() < Date.now()) return null;
    return row;
  }

  async function startKeyRegistration(req, user) {
    const { rpID } = relyingParty(req);
    const { rows } = await db.query("SELECT credential_id, transports_json FROM user_security_keys WHERE user_id = $1", [user.id]);
    const options = await generateRegistrationOptions({
      rpName: MFA_ISSUER,
      rpID,
      userName: user.email,
      userDisplayName: `${user.first_name || ""} ${user.last_name || ""}`.trim() || user.email,
      userID: new TextEncoder().encode(user.id),
      attestationType: "none",
      excludeCredentials: rows.map((row) => ({ id: row.credential_id, transports: JSON.parse(row.transports_json || "[]") })),
      authenticatorSelection: { residentKey: "preferred", userVerification: "preferred" }
    });
    await saveKeyChallenge(user.id, "register", options.challenge);
    return options;
  }

  async function finishKeyRegistration(req, userId, name, response) {
    const { rpID, origin } = relyingParty(req);
    const pending = await takeKeyChallenge(userId, "register");
    if (!pending) return { ok: false, error: "expired" };
    let verification;
    try {
      verification = await verifyRegistrationResponse({
        response,
        expectedChallenge: pending.challenge,
        expectedOrigin: origin,
        expectedRPID: rpID,
        requireUserVerification: false
      });
    } catch (_error) {
      return { ok: false, error: "invalid" };
    }
    if (!verification.verified || !verification.registrationInfo) return { ok: false, error: "invalid" };
    const { credential } = verification.registrationInfo;
    const { rows: existing } = await db.query("SELECT id FROM user_security_keys WHERE credential_id = $1", [credential.id]);
    if (existing.length) return { ok: false, error: "conflict" };
    await db.query(
      `INSERT INTO user_security_keys (id, user_id, credential_id, public_key, counter, transports_json, name, created_at, last_used_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'')`,
      [
        `key-${crypto.randomUUID()}`,
        userId,
        credential.id,
        Buffer.from(credential.publicKey).toString("base64url"),
        Number(credential.counter || 0),
        JSON.stringify(response?.response?.transports || credential.transports || []),
        String(name || "").trim().slice(0, 64) || "Clé de sécurité",
        nowIso()
      ]
    );
    return { ok: true };
  }

  async function startKeyAuthentication(req, userId, purpose, ticketId = "") {
    const { rpID } = relyingParty(req);
    const { rows } = await db.query("SELECT credential_id, transports_json FROM user_security_keys WHERE user_id = $1", [userId]);
    if (!rows.length) throw Object.assign(new Error("Aucune clé de sécurité enregistrée."), { statusCode: 400 });
    const options = await generateAuthenticationOptions({
      rpID,
      userVerification: "preferred",
      allowCredentials: rows.map((row) => ({ id: row.credential_id, transports: JSON.parse(row.transports_json || "[]") }))
    });
    await saveKeyChallenge(userId, purpose, options.challenge, ticketId);
    return options;
  }

  async function finishKeyAuthentication(req, userId, purpose, response) {
    const { rpID, origin } = relyingParty(req);
    const pending = await takeKeyChallenge(userId, purpose);
    if (!pending) return false;
    const { rows } = await db.query(
      "SELECT id, credential_id, public_key, counter, transports_json FROM user_security_keys WHERE user_id = $1 AND credential_id = $2",
      [userId, String(response?.id || "")]
    );
    const stored = rows[0];
    if (!stored) return false;
    let verification;
    try {
      verification = await verifyAuthenticationResponse({
        response,
        expectedChallenge: pending.challenge,
        expectedOrigin: origin,
        expectedRPID: rpID,
        requireUserVerification: false,
        credential: {
          id: stored.credential_id,
          publicKey: new Uint8Array(Buffer.from(stored.public_key, "base64url")),
          counter: Number(stored.counter || 0),
          transports: JSON.parse(stored.transports_json || "[]")
        }
      });
    } catch (_error) {
      return false;
    }
    if (!verification.verified) return false;
    await db.query("UPDATE user_security_keys SET counter = $1, last_used_at = $2 WHERE id = $3", [
      Number(verification.authenticationInfo.newCounter || 0),
      nowIso(),
      stored.id
    ]);
    return true;
  }

  async function revokeKey(userId, keyId) {
    const { rowCount } = await db.query("DELETE FROM user_security_keys WHERE id = $1 AND user_id = $2", [keyId, userId]);
    if (rowCount) await invalidateRecoveryCodesIfNoFactor(userId);
    return rowCount > 0;
  }

  // --------------------------------------------------------------- tickets de connexion
  /**
   * Le premier facteur (mot de passe, Google ou lien de réinitialisation) est
   * validé : on délivre un ticket opaque, jamais une session. Seul son hachage
   * est stocké.
   */
  async function createLoginTicket(userId, method) {
    const token = `mfat-${crypto.randomBytes(24).toString("base64url")}`;
    await db.query("DELETE FROM mfa_login_tickets WHERE user_id = $1 OR expires_at < $2", [userId, nowIso()]);
    await db.query(
      "INSERT INTO mfa_login_tickets (id, user_id, token_hash, first_factor, attempts, expires_at, created_at) VALUES ($1,$2,$3,$4,0,$5,$6)",
      [`mft-${crypto.randomUUID()}`, userId, sha256(token), method, new Date(Date.now() + TICKET_TTL_MINUTES * 60000).toISOString(), nowIso()]
    );
    return token;
  }

  /** Ticket encore valable (non expiré, essais restants), sinon null. */
  async function readLoginTicket(token) {
    const { rows } = await db.query("SELECT * FROM mfa_login_tickets WHERE token_hash = $1", [sha256(token)]);
    const ticket = rows[0];
    if (!ticket) return null;
    if (new Date(ticket.expires_at).getTime() < Date.now() || Number(ticket.attempts) >= TICKET_MAX_ATTEMPTS) {
      await db.query("DELETE FROM mfa_login_tickets WHERE id = $1", [ticket.id]);
      return null;
    }
    return ticket;
  }

  async function failLoginTicket(ticketId) {
    const { rows } = await db.query("UPDATE mfa_login_tickets SET attempts = attempts + 1 WHERE id = $1 RETURNING attempts", [ticketId]);
    return TICKET_MAX_ATTEMPTS - Number(rows[0]?.attempts || TICKET_MAX_ATTEMPTS);
  }

  async function consumeLoginTicket(ticketId) {
    await db.query("DELETE FROM mfa_login_tickets WHERE id = $1", [ticketId]);
  }

  // --------------------------------------------------------------- actions sensibles du compte
  const secondFactorFailures = new Map();

  /**
   * Garde des actions sensibles du compte (mot de passe, adresses e-mail,
   * nom d'utilisateur, Google, suppression du compte). Sans double
   * authentification : ne change rien. Avec : exige, au moment même de
   * l'action, le code de l'application, une clé de sécurité ou un code de
   * récupération (`req.body.stepUp`). Renvoie true si l'action peut
   * continuer ; sinon a déjà répondu (403 STEP_UP_REQUIRED / STEP_UP_FAILED).
   */
  async function requireSecondFactor(req, res, userId) {
    const state = await getState(userId);
    if (!state.enabled) return true;
    const methods = [];
    if (state.totp.active) methods.push("totp");
    if (state.securityKeys.length) methods.push("security_key");
    if (state.recoveryCodes.remaining > 0) methods.push("recovery_code");

    const failures = secondFactorFailures.get(userId);
    if (failures && failures.lockedUntil > Date.now()) {
      res.status(429).json({ error: "Trop de tentatives. Réessayez dans quelques minutes.", code: "RATE_LIMITED" });
      return false;
    }
    const proof = req.body?.stepUp || null;
    if (!proof) {
      res.status(403).json({ error: "Confirmez avec votre second facteur pour continuer.", code: "STEP_UP_REQUIRED", methods });
      return false;
    }
    let ok = false;
    if (proof.method === "totp" && methods.includes("totp")) ok = await checkTotp(userId, proof.code);
    else if (proof.method === "security_key" && methods.includes("security_key")) ok = await finishKeyAuthentication(req, userId, "step_up", proof.response);
    else if (proof.method === "recovery_code" && methods.includes("recovery_code")) ok = await consumeRecoveryCode(userId, proof.code);
    if (!ok) {
      const current = secondFactorFailures.get(userId) || { count: 0, lockedUntil: 0 };
      current.count += 1;
      if (current.count >= 5) {
        current.count = 0;
        current.lockedUntil = Date.now() + 15 * 60000;
      }
      secondFactorFailures.set(userId, current);
      res.status(403).json({ error: "La confirmation a échoué.", code: "STEP_UP_FAILED", methods });
      return false;
    }
    secondFactorFailures.delete(userId);
    return true;
  }

  return {
    available: Boolean(key),
    requireSecondFactor,
    getState,
    loginMethods,
    startTotpEnrollment,
    confirmTotpEnrollment,
    cancelTotpEnrollment,
    checkTotp,
    disableTotp,
    regenerateRecoveryCodes,
    consumeRecoveryCode,
    startKeyRegistration,
    finishKeyRegistration,
    startKeyAuthentication,
    finishKeyAuthentication,
    revokeKey,
    createLoginTicket,
    readLoginTicket,
    failLoginTicket,
    consumeLoginTicket
  };
}

// Schéma : colonnes et tables nécessaires (idempotent).
export const MFA_SCHEMA_SQL = `
  ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified_at TEXT NOT NULL DEFAULT '';
  ALTER TABLE users ADD COLUMN IF NOT EXISTS password_set INTEGER NOT NULL DEFAULT 1;
  ALTER TABLE users ADD COLUMN IF NOT EXISTS totp_secret_enc TEXT NOT NULL DEFAULT '';
  ALTER TABLE users ADD COLUMN IF NOT EXISTS totp_pending_enc TEXT NOT NULL DEFAULT '';
  ALTER TABLE users ADD COLUMN IF NOT EXISTS totp_enabled_at TEXT NOT NULL DEFAULT '';
  ALTER TABLE users ADD COLUMN IF NOT EXISTS totp_last_counter BIGINT NOT NULL DEFAULT -1;
  ALTER TABLE sessions ADD COLUMN IF NOT EXISTS step_up_until TEXT NOT NULL DEFAULT '';
  CREATE TABLE IF NOT EXISTS user_security_keys (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    credential_id TEXT NOT NULL UNIQUE,
    public_key TEXT NOT NULL,
    counter BIGINT NOT NULL DEFAULT 0,
    transports_json TEXT NOT NULL DEFAULT '[]',
    name TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL,
    last_used_at TEXT NOT NULL DEFAULT ''
  );
  CREATE INDEX IF NOT EXISTS user_security_keys_user_idx ON user_security_keys (user_id);
  CREATE TABLE IF NOT EXISTS user_recovery_codes (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    code_hash TEXT NOT NULL,
    code_salt TEXT NOT NULL,
    used_at TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS user_recovery_codes_user_idx ON user_recovery_codes (user_id);
  CREATE TABLE IF NOT EXISTS mfa_login_tickets (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    token_hash TEXT NOT NULL UNIQUE,
    first_factor TEXT NOT NULL DEFAULT '',
    attempts INTEGER NOT NULL DEFAULT 0,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS mfa_key_challenges (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    purpose TEXT NOT NULL,
    challenge TEXT NOT NULL,
    ticket_id TEXT NOT NULL DEFAULT '',
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
`;
