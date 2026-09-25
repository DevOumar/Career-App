import React, { useState } from "react";
// Champ mot de passe avec l'œil « afficher / masquer », comme sur la page de
// connexion (styles .password-field / .password-toggle). Toutes les autres
// props sont transmises à l'<input>.
export function PasswordInput({ language = "fr", className = "", ...inputProps }) {
  const [visible, setVisible] = useState(false);
  const label = visible
    ? language === "en"
      ? "Hide password"
      : "Masquer le mot de passe"
    : language === "en"
      ? "Show password"
      : "Afficher le mot de passe";

  return (
    <div className={`password-field ${className}`}>
      <input {...inputProps} type={visible ? "text" : "password"} />
      <button type="button" className="password-toggle" onClick={() => setVisible((value) => !value)} aria-label={label} title={label}>
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          {visible ? (
            <>
              <path d="M10.7 5.1A10.7 10.7 0 0 1 21.9 11.7a1 1 0 0 1 0 .6 10.8 10.8 0 0 1-1.4 2.5" />
              <path d="M14.1 14.2a3 3 0 0 1-4.2-4.2" />
              <path d="M17.5 17.5a10.8 10.8 0 0 1-15.4-5.2 1 1 0 0 1 0-.6 10.8 10.8 0 0 1 4.4-5.2" />
              <path d="m2 2 20 20" />
            </>
          ) : (
            <>
              <path d="M2.1 12.3a1 1 0 0 1 0-.6 10.8 10.8 0 0 1 19.8 0 1 1 0 0 1 0 .6 10.8 10.8 0 0 1-19.8 0" />
              <circle cx="12" cy="12" r="3" />
            </>
          )}
        </svg>
      </button>
    </div>
  );
}
