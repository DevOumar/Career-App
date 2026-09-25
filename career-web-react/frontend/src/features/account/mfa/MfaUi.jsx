import React, { useEffect, useRef, useState } from "react";
import Swal from "sweetalert2";
// Briques d'interface de la double authentification, sur le modèle de
// Jurysia : fenêtre avec en-tête à icône, saisie en six cases, codes de
// récupération (affichés une seule fois), confirmation d'identité.
// Aucune décision de sécurité ici : tout est vérifié par l'API.
import { getStepUpKeyOptions } from "../../../lib/inMemoryDb.js";
import { getSecurityKeyAssertion, supportsSecurityKeys } from "./webauthnClient.js";
// Import « arrière » volontaire (même schéma qu'AccountDrawer) : le bouton
// Google n'est utilisé qu'au rendu, bien après la résolution des modules.
import { GoogleSignInButton } from "../../../App.jsx";
import "./mfa.css";

export const mfaT = (language) => (fr, en) => (language === "en" ? en : fr);

export function mfaToast(icon, title) {
  Swal.fire({
    toast: true,
    position: "top-end",
    icon,
    title,
    showConfirmButton: false,
    timer: 2600,
    timerProgressBar: true,
    customClass: { popup: "career-toast", title: "career-toast-title" }
  });
}

// ------------------------------------------------------------------ icônes (trait, style lucide)
const PATHS = {
  shieldCheck: (
    <>
      <path d="M12 3 5 6v5c0 4.5 3 8.3 7 10 4-1.7 7-5.5 7-10V6l-7-3Z" />
      <path d="m9 12 2 2 4-4" />
    </>
  ),
  shieldOff: (
    <>
      <path d="M19 13c.3-.7.4-1.4.4-2V6l-7-3-4.2 1.8" />
      <path d="M5.3 5.3 5 6v5c0 4.5 3 8.3 7 10 1.9-.8 3.5-2 4.7-3.6" />
      <path d="m3 3 18 18" />
    </>
  ),
  smartphone: (
    <>
      <rect x="7" y="2.5" width="10" height="19" rx="2" />
      <path d="M11 18h2" />
    </>
  ),
  usb: (
    <>
      <circle cx="10" cy="7" r="1" />
      <circle cx="4" cy="20" r="1" />
      <path d="M4.7 19.3 19 5" />
      <path d="m21 3-3 1 2 2Z" />
      <path d="M9.26 7.68 5 12l2 5" />
      <path d="m10 14 5 2 3.5-3.5" />
      <path d="m18 12 1-1 1 1-1 1Z" />
    </>
  ),
  key: (
    <>
      <circle cx="7.5" cy="15.5" r="4.5" />
      <path d="m10.7 12.3 8.8-8.8M16 7l2.5 2.5M18.5 4.5 21 7" />
    </>
  ),
  copy: (
    <>
      <rect x="9" y="9" width="12" height="12" rx="2" />
      <path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  edit: (
    <>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </>
  ),
  logout: (
    <>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="m16 17 5-5-5-5M21 12H9" />
    </>
  ),
  trash: (
    <>
      <path d="M4 7h16M10 11v6M14 11v6" />
      <path d="M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3" />
    </>
  ),
  alert: (
    <>
      <path d="M12 9v4M12 17h.01" />
      <path d="M10.3 3.9 2.4 17.5A2 2 0 0 0 4.1 20.5h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
    </>
  ),
  lock: (
    <>
      <rect x="4" y="11" width="16" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </>
  ),
  download: (
    <>
      <path d="M12 3v12M7 10l5 5 5-5" />
      <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
    </>
  ),
  close: <path d="M6 6l12 12M18 6 6 18" />,
  eye: (
    <>
      <path d="M2.1 12.3a1 1 0 0 1 0-.6 10.8 10.8 0 0 1 19.8 0 1 1 0 0 1 0 .6 10.8 10.8 0 0 1-19.8 0" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  eyeOff: (
    <>
      <path d="M10.7 5.1A10.7 10.7 0 0 1 21.9 11.7a1 1 0 0 1 0 .6 10.8 10.8 0 0 1-1.4 2.5" />
      <path d="M14.1 14.2a3 3 0 0 1-4.2-4.2" />
      <path d="M17.5 17.5a10.8 10.8 0 0 1-15.4-5.2 1 1 0 0 1 0-.6 10.8 10.8 0 0 1 4.4-5.2" />
      <path d="m2 2 20 20" />
    </>
  )
};

export function MfaIcon({ name, className = "" }) {
  return (
    <svg className={`mfa-icon ${className}`} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      {PATHS[name] || PATHS.shieldCheck}
    </svg>
  );
}

// ------------------------------------------------------------------ fenêtre
export function MfaDialog({ open, onClose, icon, tone = "brand", title, description, children, footer, closable = true, width = 448 }) {
  useEffect(() => {
    if (!open || !closable) return undefined;
    const onKey = (event) => {
      if (event.key === "Escape") onClose?.();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, closable, onClose]);

  if (!open) return null;
  return (
    <div className="mfa-overlay" onMouseDown={() => closable && onClose?.()}>
      <div className="mfa-dialog" role="dialog" aria-modal="true" aria-label={title} style={{ maxWidth: width }} onMouseDown={(event) => event.stopPropagation()}>
        {closable ? (
          <button type="button" className="mfa-dialog-close" onClick={onClose} aria-label="Fermer">
            <MfaIcon name="close" />
          </button>
        ) : null}
        <div className="mfa-dialog-head">
          {icon ? (
            <span className={`mfa-dialog-icon ${tone}`}>
              <MfaIcon name={icon} />
            </span>
          ) : null}
          <div>
            <h3>{title}</h3>
            {description ? <p>{description}</p> : null}
          </div>
        </div>
        {children ? <div className="mfa-dialog-body">{children}</div> : null}
        {footer ? <div className="mfa-dialog-foot">{footer}</div> : null}
      </div>
    </div>
  );
}

export function MfaError({ message }) {
  if (!message) return null;
  return (
    <div className="mfa-error" role="alert">
      <MfaIcon name="alert" />
      <span>{message}</span>
    </div>
  );
}

// ------------------------------------------------------------------ saisie en six cases
export function OtpBoxes({ value, onChange, onComplete, disabled, autoFocus = true }) {
  const refs = useRef([]);
  const digits = Array.from({ length: 6 }, (_, index) => value[index] ?? "");

  function setDigit(index, raw) {
    const clean = raw.replace(/\D/g, "");
    if (!clean) {
      onChange(value.slice(0, index) + value.slice(index + 1));
      return;
    }
    const merged = (value.slice(0, index) + clean + value.slice(index + clean.length)).replace(/\s/g, "").slice(0, 6);
    onChange(merged);
    refs.current[Math.min(index + clean.length, 5)]?.focus();
    if (merged.length === 6) onComplete?.(merged);
  }

  function handleKeyDown(index, event) {
    if (event.key === "Backspace" && !digits[index] && index > 0) refs.current[index - 1]?.focus();
    else if (event.key === "ArrowLeft" && index > 0) refs.current[index - 1]?.focus();
    else if (event.key === "ArrowRight" && index < 5) refs.current[index + 1]?.focus();
  }

  function handlePaste(event) {
    const pasted = event.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;
    event.preventDefault();
    onChange(pasted);
    refs.current[Math.min(pasted.length, 5)]?.focus();
    if (pasted.length === 6) onComplete?.(pasted);
  }

  return (
    <div className="mfa-otp" onPaste={handlePaste}>
      {digits.map((digit, index) => (
        <input
          key={index}
          ref={(element) => {
            refs.current[index] = element;
          }}
          inputMode="numeric"
          autoComplete={index === 0 ? "one-time-code" : "off"}
          maxLength={1}
          value={digit}
          disabled={disabled}
          aria-label={`Chiffre ${index + 1}`}
          onChange={(event) => setDigit(index, event.target.value)}
          onKeyDown={(event) => handleKeyDown(index, event)}
          autoFocus={autoFocus && index === 0}
        />
      ))}
    </div>
  );
}

// ------------------------------------------------------------------ codes de récupération (affichés une seule fois)
export function RecoveryCodesDialog({ codes, onClose, language }) {
  const t = mfaT(language);
  const [acknowledged, setAcknowledged] = useState(false);
  if (!codes || !codes.length) return null;

  async function copy() {
    try {
      await navigator.clipboard.writeText(codes.join("\n"));
      mfaToast("success", t("Codes copiés", "Codes copied"));
      setAcknowledged(true);
    } catch (_error) {
      // Presse-papiers refusé : les codes restent lisibles à l'écran.
    }
  }

  function download() {
    const blob = new Blob([`Career CV - ${t("codes de récupération", "recovery codes")}\n\n${codes.join("\n")}\n`], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "career-cv-codes-recuperation.txt";
    link.click();
    URL.revokeObjectURL(url);
    setAcknowledged(true);
  }

  return (
    <MfaDialog
      open
      // Fermeture impossible tant que les codes n'ont pas été conservés : ils
      // ne réapparaîtront jamais.
      closable={acknowledged}
      onClose={onClose}
      icon="key"
      title={t("Codes de récupération", "Recovery codes")}
      description={t(
        "Codes à usage unique, à conserver hors ligne. Ils permettent d'accéder au compte en cas de perte du téléphone et des clés.",
        "Single-use codes to keep offline. They let you into your account if you lose your phone and keys."
      )}
      footer={
        <button type="button" className="mfa-btn primary" onClick={onClose}>
          {t("J'ai conservé mes codes", "I have saved my codes")}
        </button>
      }
    >
      <p className="mfa-note">
        <MfaIcon name="alert" />
        {t(
          "Ces codes ne seront plus jamais affichés. Imprimez-les ou conservez-les dans un gestionnaire de mots de passe.",
          "These codes will never be shown again. Print them or keep them in a password manager."
        )}
      </p>
      <ul className="mfa-codes">
        {codes.map((code) => (
          <li key={code}>{code}</li>
        ))}
      </ul>
      <div className="mfa-row">
        <button type="button" className="mfa-btn secondary grow" onClick={copy}>
          <MfaIcon name="copy" /> {t("Copier", "Copy")}
        </button>
        <button type="button" className="mfa-btn secondary grow" onClick={download}>
          <MfaIcon name="download" /> {t("Télécharger", "Download")}
        </button>
      </div>
    </MfaDialog>
  );
}

// ------------------------------------------------------------------ confirmation d'identité (step-up)
/**
 * Ouverte quand l'API répond STEP_UP_REQUIRED. `methods` vient du serveur
 * (password / totp / security_key). `onConfirm(stepUp)` rejoue l'action avec
 * la preuve ; il renvoie une chaîne d'erreur ou rien en cas de succès.
 */
export function StepUpDialog({ open, methods = [], userId, language, onCancel, onConfirm, externalError = "" }) {
  const t = mfaT(language);
  const available = methods.filter((method) => method !== "security_key" || supportsSecurityKeys());
  const [method, setMethod] = useState(available[0] || "password");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      // Ordre de préférence : application, clé, Google, puis mot de passe (un
      // compte créé avec Google ne connaît souvent pas son mot de passe).
      setMethod(["totp", "security_key", "google", "password", "recovery_code"].find((item) => available.includes(item)) || "password");
      setPassword("");
      setShowPassword(false);
      setCode("");
      setError("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, methods.join(",")]);

  async function submit(proof) {
    setBusy(true);
    setError("");
    const failure = await onConfirm(proof);
    setBusy(false);
    if (failure) setError(failure);
  }

  async function confirmWithKey() {
    setBusy(true);
    setError("");
    try {
      const { options } = await getStepUpKeyOptions(userId);
      const assertion = await getSecurityKeyAssertion(options);
      setBusy(false);
      if (!assertion.ok) {
        if (assertion.reason !== "cancelled") setError(t("L'opération avec la clé de sécurité a échoué.", "The security key operation failed."));
        return;
      }
      await submit({ method: "security_key", response: assertion.response });
    } catch (keyError) {
      setBusy(false);
      setError(keyError.message);
    }
  }

  const labels = {
    google: "Google",
    recovery_code: t("Code de secours", "Recovery code"),
    password: t("Mot de passe", "Password"),
    totp: t("Application", "App"),
    security_key: t("Clé de sécurité", "Security key")
  };

  return (
    <MfaDialog
      open={open}
      onClose={onCancel}
      icon="lock"
      title={t("Confirmez votre identité", "Confirm your identity")}
      description={
        available.some((item) => item === "password" || item === "google")
          ? t(
              "Cette action est sensible. Confirmez qu'il s'agit bien de vous avant de continuer.",
              "This action is sensitive. Confirm it's really you before continuing."
            )
          : t(
              "Cette action réduit la protection de votre compte : confirmez avec votre second facteur.",
              "This action lowers your account's protection: confirm with your second factor."
            )
      }
      footer={
        <>
          <button type="button" className="mfa-btn ghost" onClick={onCancel}>
            {t("Annuler", "Cancel")}
          </button>
          {method === "google" ? null : method === "security_key" ? (
            <button type="button" className="mfa-btn primary" disabled={busy} onClick={confirmWithKey}>
              {busy ? <span className="mfa-spinner" /> : null}
              {t("Utiliser ma clé", "Use my key")}
            </button>
          ) : (
            <button
              type="button"
              className="mfa-btn primary"
              disabled={
                busy ||
                (method === "password"
                  ? !password
                  : method === "recovery_code"
                  ? code.replace(/[^A-Za-z0-9]/g, "").length !== 10
                  : code.length !== 6)
              }
              onClick={() => submit(method === "password" ? { method, password } : { method, code })}
            >
              {busy ? <span className="mfa-spinner" /> : null}
              {t("Confirmer", "Confirm")}
            </button>
          )}
        </>
      }
    >
      <MfaError message={error || externalError} />
      {available.length > 1 ? (
        <div className="mfa-seg" role="tablist">
          {available.map((item) => (
            <button key={item} type="button" role="tab" aria-selected={method === item} className={method === item ? "active" : ""} onClick={() => { setMethod(item); setError(""); setCode(""); }}>
              {labels[item]}
            </button>
          ))}
        </div>
      ) : null}
      {method === "google" ? (
        <div className="mfa-field mfa-google">
          <span>{t("Reconnectez-vous avec le compte Google lié à ce compte.", "Sign in again with the Google account linked to this account.")}</span>
          <div className="mfa-google-btn">
            <GoogleSignInButton language={language} onCredential={(credential) => submit({ method: "google", credential })} />
          </div>
          {busy ? <span className="mfa-spinner dark" /> : null}
        </div>
      ) : method === "password" ? (
        <label className="mfa-field">
          <span>{t("Mot de passe actuel", "Current password")}</span>
          <div className="password-field">
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              autoFocus
              autoComplete="current-password"
              onChange={(event) => setPassword(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && password) submit({ method, password });
              }}
            />
            <button
              type="button"
              className="password-toggle"
              onClick={() => setShowPassword((value) => !value)}
              aria-label={showPassword ? t("Masquer le mot de passe", "Hide password") : t("Afficher le mot de passe", "Show password")}
              title={showPassword ? t("Masquer le mot de passe", "Hide password") : t("Afficher le mot de passe", "Show password")}
            >
              <MfaIcon name={showPassword ? "eyeOff" : "eye"} />
            </button>
          </div>
        </label>
      ) : method === "recovery_code" ? (
        <label className="mfa-field">
          <span>{t("Code de récupération", "Recovery code")}</span>
          <input
            value={code}
            autoFocus
            autoComplete="off"
            spellCheck={false}
            placeholder="XXXXX-XXXXX"
            onChange={(event) => setCode(event.target.value.toUpperCase())}
            onKeyDown={(event) => {
              if (event.key === "Enter" && code.replace(/[^A-Za-z0-9]/g, "").length === 10) submit({ method, code });
            }}
          />
          <small>{t("Ce code sera consommé : il ne pourra plus resservir.", "This code will be used up and can't be reused.")}</small>
        </label>
      ) : method === "totp" ? (
        <div className="mfa-field">
          <span>{t("Code de votre application d'authentification", "Code from your authenticator app")}</span>
          <OtpBoxes value={code} onChange={setCode} disabled={busy} onComplete={(value) => submit({ method, code: value })} />
        </div>
      ) : (
        <div className="mfa-key-zone compact">
          <span className="mfa-key-pulse">
            <MfaIcon name="usb" />
          </span>
          <p>{t("Branchez ou approchez votre clé, puis touchez le capteur.", "Plug in or hold your key close, then touch the sensor.")}</p>
        </div>
      )}
    </MfaDialog>
  );
}

/**
 * Exécute une action de gestion ; si l'API exige une confirmation
 * d'identité, ouvre la fenêtre puis REJOUE l'action avec la preuve.
 * Renvoie { run, dialog } : `dialog` est l'élément à rendre.
 */
export function useStepUp({ userId, language }) {
  const [pending, setPending] = useState(null);

  async function run(action) {
    try {
      return { ok: true, data: await action(undefined) };
    } catch (error) {
      if (error.code !== "STEP_UP_REQUIRED") return { ok: false, error };
      return new Promise((resolve) => {
        setPending({ methods: error.methods || [], action, resolve });
      });
    }
  }

  const dialog = (
    <StepUpDialog
      open={Boolean(pending)}
      methods={pending?.methods || []}
      userId={userId}
      language={language}
      onCancel={() => {
        pending?.resolve({ ok: false, cancelled: true });
        setPending(null);
      }}
      onConfirm={async (stepUp) => {
        try {
          const data = await pending.action(stepUp);
          pending.resolve({ ok: true, data });
          setPending(null);
          return "";
        } catch (error) {
          if (error.code === "STEP_UP_FAILED" || error.code === "RATE_LIMITED") {
            return error.code === "RATE_LIMITED"
              ? mfaT(language)("Trop de tentatives. Réessayez dans quelques minutes.", "Too many attempts. Try again in a few minutes.")
              : mfaT(language)("La confirmation a échoué.", "Confirmation failed.");
          }
          pending.resolve({ ok: false, error });
          setPending(null);
          return "";
        }
      }}
    />
  );

  return { run, dialog };
}
