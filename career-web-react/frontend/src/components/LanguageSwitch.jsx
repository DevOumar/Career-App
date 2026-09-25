import React, { useEffect, useRef, useState } from "react";
// Sélecteur de langue FR/EN — utilisé dans la topbar candidat, admin et école.
export const LANGUAGE_OPTIONS = [
  { id: "fr", label: "FR", name: "Français", flagClass: "france" },
  { id: "en", label: "EN", name: "English", flagClass: "uk" }
];

// Drapeaux en SVG (couleurs officielles) pour la variante « menu ».
function FlagIcon({ id }) {
  if (id === "en") {
    return (
      <svg className="language-menu-flag" viewBox="0 0 60 30" aria-hidden="true" focusable="false">
        <clipPath id="language-flag-uk-clip">
          <path d="M30,15 h30 v15 z v15 h-30 z h-30 v-15 z v-15 h30 z" />
        </clipPath>
        <path d="M0,0 v30 h60 v-30 z" fill="#012169" />
        <path d="M0,0 L60,30 M60,0 L0,30" stroke="#fff" strokeWidth="6" />
        <path d="M0,0 L60,30 M60,0 L0,30" clipPath="url(#language-flag-uk-clip)" stroke="#C8102E" strokeWidth="4" />
        <path d="M30,0 v30 M0,15 h60" stroke="#fff" strokeWidth="10" />
        <path d="M30,0 v30 M0,15 h60" stroke="#C8102E" strokeWidth="6" />
      </svg>
    );
  }
  return (
    <svg className="language-menu-flag" viewBox="0 0 3 2" aria-hidden="true" focusable="false">
      <rect width="1" height="2" fill="#0055A4" />
      <rect x="1" width="1" height="2" fill="#FFFFFF" />
      <rect x="2" width="1" height="2" fill="#EF4135" />
    </svg>
  );
}

// Variante « menu » : drapeau + nom complet + code + chevron, qui déplie la
// liste des langues (chaque langue affichée dans sa propre langue).
function LanguageMenu({ language, setLanguage }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const current = LANGUAGE_OPTIONS.find((item) => item.id === language) || LANGUAGE_OPTIONS[0];

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (event) => {
      if (ref.current && !ref.current.contains(event.target)) setOpen(false);
    };
    const onKey = (event) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="language-menu" ref={ref}>
      <button
        type="button"
        className={`language-menu-trigger ${open ? "is-open" : ""}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={language === "en" ? "Language" : "Langue"}
        onClick={() => setOpen((prev) => !prev)}
      >
        <FlagIcon id={current.id} />
        <span className="language-menu-name">{current.name}</span>
        <span className="language-menu-code">{current.label}</span>
        <svg className="language-menu-chevron" viewBox="0 0 20 20" aria-hidden="true" focusable="false">
          <path d="m5.5 8 4.5 4.5L14.5 8" />
        </svg>
      </button>
      {open ? (
        <ul className="language-menu-list" role="listbox" aria-label={language === "en" ? "Language" : "Langue"}>
          {LANGUAGE_OPTIONS.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                role="option"
                aria-selected={item.id === current.id}
                className={item.id === current.id ? "is-active" : ""}
                onClick={() => {
                  setLanguage(item.id);
                  setOpen(false);
                }}
              >
                <FlagIcon id={item.id} />
                <span className="language-menu-name">{item.name}</span>
                <span className="language-menu-code">{item.label}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export function LanguageSwitch({ language, setLanguage, compact = false, variant = "buttons" }) {
  if (variant === "menu") return <LanguageMenu language={language} setLanguage={setLanguage} />;

  if (variant === "dropdown") {
    const current = LANGUAGE_OPTIONS.find((item) => item.id === language) || LANGUAGE_OPTIONS[0];
    return (
      <label className="language-switch-dropdown" aria-label="Choix de la langue">
        <span className={`flag ${current.flagClass}`} aria-hidden="true" />
        <select value={language} onChange={(event) => setLanguage(event.target.value)}>
          {LANGUAGE_OPTIONS.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label}
            </option>
          ))}
        </select>
      </label>
    );
  }

  return (
    <div className={`language-switch ${compact ? "compact" : ""}`} aria-label="Choix de la langue">
      {LANGUAGE_OPTIONS.map((item) => (
        <button
          key={item.id}
          type="button"
          className={language === item.id ? "active" : ""}
          onClick={() => setLanguage(item.id)}
          aria-pressed={language === item.id}
        >
          <span className={`flag ${item.flagClass}`} aria-hidden="true" />
          <span>{item.label}</span>
        </button>
      ))}
    </div>
  );
}
