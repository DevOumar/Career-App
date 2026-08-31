import React, { useId } from "react";
// Sélecteur de langue FR/EN — utilisé dans la topbar candidat, admin et école.
export const LANGUAGE_OPTIONS = [
  { id: "fr", label: "FR", flagClass: "france" },
  { id: "en", label: "EN", flagClass: "uk" }
];

// Le drapeau français reste un simple dégradé CSS (3 bandes verticales,
// voir .flag.france dans styles.css) : un dégradé suffit très bien pour ça.
// Le drapeau UK est un vrai Union Jack (croix de Saint-André blanche en
// diagonale + croix de Saint-Patrick rouge décalée par-dessus + croix de
// Saint-Georges bordée de blanc au centre) qu'un dégradé CSS ne peut pas
// représenter fidèlement — d'où ce SVG dédié. Même boîte que les autres
// drapeaux (~1rem x 0.7rem, arrondi 2px, ombre) posée par .flag sur le
// <span> englobant ; le SVG se contente de remplir cette boîte.
function UkFlagIcon() {
  const clipId = useId();
  return (
    <svg
      viewBox="0 0 20 14"
      width="100%"
      height="100%"
      preserveAspectRatio="none"
      role="img"
      aria-hidden="true"
    >
      <clipPath id={clipId}>
        <rect width="20" height="14" />
      </clipPath>
      <g clipPath={`url(#${clipId})`}>
        {/* Fond marine */}
        <rect width="20" height="14" fill="#012169" />
        {/* Croix de Saint-André (blanche, diagonale) */}
        <path d="M0 0 L20 14 M20 0 L0 14" stroke="#fff" strokeWidth="3" />
        {/* Croix de Saint-Patrick (rouge, diagonale, décalée par-dessus le blanc) */}
        <path
          d="M-0.52 0.74 L19.48 14.74 M19.48 -0.74 L-0.52 13.26"
          stroke="#c8102e"
          strokeWidth="1.5"
        />
        {/* Croix de Saint-Georges (rouge bordée de blanc, au centre) */}
        <rect x="8" y="0" width="4" height="14" fill="#fff" />
        <rect x="0" y="5" width="20" height="4" fill="#fff" />
        <rect x="8.8" y="0" width="2.4" height="14" fill="#c8102e" />
        <rect x="0" y="5.8" width="20" height="2.4" fill="#c8102e" />
      </g>
    </svg>
  );
}

function FlagIcon({ flagClass }) {
  if (flagClass === "uk") {
    return (
      <span className="flag uk" aria-hidden="true">
        <UkFlagIcon />
      </span>
    );
  }
  return <span className={`flag ${flagClass}`} aria-hidden="true" />;
}

export function LanguageSwitch({ language, setLanguage, compact = false, variant = "buttons" }) {
  if (variant === "dropdown") {
    const current = LANGUAGE_OPTIONS.find((item) => item.id === language) || LANGUAGE_OPTIONS[0];
    return (
      <label className="language-switch-dropdown" aria-label="Choix de la langue">
        <FlagIcon flagClass={current.flagClass} />
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
          <FlagIcon flagClass={item.flagClass} />
          <span>{item.label}</span>
        </button>
      ))}
    </div>
  );
}
