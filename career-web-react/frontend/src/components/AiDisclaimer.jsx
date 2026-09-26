import React from "react";
// Mention de transparence affichée sous chaque contenu généré par l'IA
// (règlement européen sur l'IA : l'utilisateur doit savoir qu'un contenu est
// généré et rester maître de la décision). Jamais imprimée ni exportée.
export function AiDisclaimer({ language = "fr", text, className = "" }) {
  const message =
    text ||
    (language === "en"
      ? "AI-generated content: it may contain errors. Always check it before using it."
      : "Contenu généré par l'IA : il peut comporter des erreurs. Vérifiez-le toujours avant de l'utiliser.");
  return (
    <p className={`ai-disclaimer no-print ${className}`} role="note">
      <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false">
        <circle cx="10" cy="10" r="7.25" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <path d="M10 9v4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        <circle cx="10" cy="6.4" r="1" fill="currentColor" />
      </svg>
      <span>{message}</span>
    </p>
  );
}
