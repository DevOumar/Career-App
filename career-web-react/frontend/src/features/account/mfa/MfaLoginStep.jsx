import React, { useState } from "react";
// Étape « Vérification en deux étapes » de la connexion : le premier facteur
// (mot de passe ou Google) a délivré un ticket ; on le complète ici avec
// l'application d'authentification, une clé de sécurité ou un code de
// récupération. Le serveur seul décide (voir POST /api/auth/mfa/verify).
import { getMfaLoginKeyOptions } from "../../../lib/inMemoryDb.js";
import { MfaError, MfaIcon, OtpBoxes, mfaT } from "./MfaUi.jsx";
import { getSecurityKeyAssertion, supportsSecurityKeys } from "./webauthnClient.js";

export default function MfaLoginStep({ ticket, methods = [], language, onVerify, onRestart }) {
  const t = mfaT(language);
  const keyUsable = methods.includes("security_key") && supportsSecurityKeys();
  const initial = methods.includes("totp") ? "totp" : keyUsable ? "security_key" : "recovery_code";
  const [method, setMethod] = useState(initial);
  const [code, setCode] = useState("");
  const [recoveryCode, setRecoveryCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function verify(payload) {
    setBusy(true);
    setError("");
    try {
      await onVerify({ ticket, ...payload });
    } catch (verifyError) {
      if (verifyError.code === "TICKET_EXPIRED") {
        onRestart(verifyError.message);
        return;
      }
      setError(verifyError.message || t("Code incorrect ou expiré.", "Incorrect or expired code."));
      setCode("");
    } finally {
      setBusy(false);
    }
  }

  async function useKey() {
    setBusy(true);
    setError("");
    try {
      const { options } = await getMfaLoginKeyOptions(ticket);
      const assertion = await getSecurityKeyAssertion(options);
      if (!assertion.ok) {
        setBusy(false);
        if (assertion.reason !== "cancelled") setError(t("L'opération avec la clé de sécurité a échoué.", "The security key operation failed."));
        return;
      }
      await verify({ method: "security_key", response: assertion.response });
    } catch (keyError) {
      setBusy(false);
      if (keyError.code === "TICKET_EXPIRED") onRestart(keyError.message);
      else setError(keyError.message);
    }
  }

  function switchTo(next) {
    setMethod(next);
    setError("");
    setCode("");
    setRecoveryCode("");
  }

  const alternatives = [
    methods.includes("totp") && method !== "totp" ? { id: "totp", label: t("Utiliser mon application d'authentification", "Use my authenticator app") } : null,
    keyUsable && method !== "security_key" ? { id: "security_key", label: t("Utiliser une clé de sécurité", "Use a security key") } : null,
    methods.includes("recovery_code") && method !== "recovery_code" ? { id: "recovery_code", label: t("Utiliser un code de récupération", "Use a recovery code") } : null
  ].filter(Boolean);

  return (
    <div className="mfa-login">
      <MfaError message={error} />

      {method === "totp" ? (
        <div className="mfa-field">
          <span>{t("Code de votre application d'authentification", "Code from your authenticator app")}</span>
          <OtpBoxes value={code} onChange={setCode} disabled={busy} onComplete={(value) => verify({ method: "totp", code: value })} />
          <button type="button" className="btn-main mfa-login-submit" disabled={busy || code.length !== 6} onClick={() => verify({ method: "totp", code })}>
            {busy ? <span className="btn-spinner" /> : null} {t("Vérifier", "Verify")}
          </button>
        </div>
      ) : method === "security_key" ? (
        <div className="mfa-field">
          <div className="mfa-key-zone compact">
            <span className="mfa-key-pulse">
              <MfaIcon name="usb" />
            </span>
            <p>{t("Branchez ou approchez votre clé, puis touchez le capteur.", "Plug in or hold your key close, then touch the sensor.")}</p>
          </div>
          <button type="button" className="btn-main mfa-login-submit" disabled={busy} onClick={useKey}>
            {busy ? <span className="btn-spinner" /> : null} {t("Utiliser ma clé de sécurité", "Use my security key")}
          </button>
        </div>
      ) : (
        <label className="mfa-field">
          <span>{t("Code de récupération", "Recovery code")}</span>
          <input
            value={recoveryCode}
            autoFocus
            autoComplete="off"
            spellCheck={false}
            placeholder="XXXXX-XXXXX"
            onChange={(event) => setRecoveryCode(event.target.value.toUpperCase())}
            onKeyDown={(event) => {
              if (event.key === "Enter" && recoveryCode.trim()) verify({ method: "recovery_code", code: recoveryCode });
            }}
          />
          <small>{t("Chaque code ne peut servir qu'une seule fois.", "Each code can only be used once.")}</small>
          <button
            type="button"
            className="btn-main mfa-login-submit"
            disabled={busy || recoveryCode.replace(/[^A-Za-z0-9]/g, "").length !== 10}
            onClick={() => verify({ method: "recovery_code", code: recoveryCode })}
          >
            {busy ? <span className="btn-spinner" /> : null} {t("Vérifier", "Verify")}
          </button>
        </label>
      )}

      {alternatives.length ? (
        <div className="mfa-login-alt">
          {alternatives.map((item) => (
            <button key={item.id} type="button" onClick={() => switchTo(item.id)}>
              {item.label}
            </button>
          ))}
        </div>
      ) : null}

      <p className="mfa-login-help">
        {t(
          "Vous avez perdu l'accès à votre second facteur ? Utilisez un code de récupération, ou contactez l'administrateur Career CV.",
          "Lost access to your second factor? Use a recovery code, or contact the Career CV administrator."
        )}
      </p>
      <button type="button" className="mfa-login-back" onClick={() => onRestart("")}>
        {t("Revenir à la connexion", "Back to sign in")}
      </button>
    </div>
  );
}
