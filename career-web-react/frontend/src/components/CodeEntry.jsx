import React from "react";
import { OtpBoxes } from "../features/account/mfa/MfaUi.jsx";

// Bloc commun de saisie d'un code recu par e-mail : inscription, connexion,
// mot de passe oublie et adresse e-mail secondaire.
export function CodeEntry({
  language = "fr",
  email,
  onChangeEmail,
  value,
  onChange,
  onComplete,
  onResend,
  resendSeconds = 0,
  disabled = false,
  compact = false
}) {
  const t = (fr, en) => (language === "en" ? en : fr);
  return (
    <div className={`ce-block ${compact ? "is-compact" : ""}`}>
      {!compact ? (
        <span className="ce-badge" aria-hidden="true">
          <svg viewBox="0 0 48 48">
            <rect x="6" y="11" width="36" height="26" rx="6" fill="currentColor" opacity="0.14" />
            <rect x="6" y="11" width="36" height="26" rx="6" fill="none" stroke="currentColor" strokeWidth="2.4" />
            <path d="M8 14l16 12 16-12" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="38" cy="12" r="7" fill="#237804" />
            <path d="M35 12l2.2 2.2 4-4.4" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      ) : null}
      {email ? (
        <p className="ce-sent">
          {t("Code envoye a", "Code sent to")}
          <span className="ce-email">{email}</span>
          {onChangeEmail ? (
            <button type="button" className="ce-link" onClick={onChangeEmail}>
              {t("Modifier", "Change")}
            </button>
          ) : null}
        </p>
      ) : null}
      <OtpBoxes value={value} onChange={onChange} onComplete={onComplete} disabled={disabled} />
      {onResend ? (
        <p className="ce-resend">
          {t("Vous n'avez rien recu ?", "Didn't get it?")}
          <button type="button" className="ce-link" onClick={onResend} disabled={disabled || resendSeconds > 0}>
            {resendSeconds > 0 ? t(`Renvoyer dans ${resendSeconds} s`, `Resend in ${resendSeconds}s`) : t("Renvoyer le code", "Resend code")}
          </button>
        </p>
      ) : null}
      <p className="ce-hint">
        {t("Le code est valable 10 minutes. Pensez a verifier vos courriers indesirables.", "The code is valid for 10 minutes. Check your spam folder too.")}
      </p>
    </div>
  );
}
