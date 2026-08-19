import React from "react";
// Sélecteur de langue FR/EN — utilisé dans la topbar candidat, admin et école.
export const LANGUAGE_OPTIONS = [
  { id: "fr", label: "FR", flagClass: "france" },
  { id: "en", label: "EN", flagClass: "uk" }
];

export function LanguageSwitch({ language, setLanguage, compact = false }) {
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
