// Traduction des erreurs techniques (fetch, JSON, etc.) en messages
// compréhensibles par l'utilisateur. Utilisé par tous les modules qui
// appellent l'API (CV, matching, entretiens, négociation, admin...).
export function getFriendlyErrorMessage(error, language = "fr") {
  const raw = typeof error === "string" ? error : error?.message || "";
  const message = String(raw || "").trim();
  const fallback =
    language === "en"
      ? "Something went wrong. Please try again."
      : "Une erreur est survenue. Réessaie dans quelques instants.";
  const networkFallback =
    language === "en"
      ? "Can't reach the server. Check your internet connection and try again in a moment."
      : "Impossible de contacter le serveur. Vérifiez votre connexion internet et réessayez dans quelques instants.";

  if (!message) return fallback;

  const networkPatterns = [/failed to fetch/i, /networkerror/i, /load failed/i, /network request failed/i];
  if (networkPatterns.some((pattern) => pattern.test(message))) {
    return networkFallback;
  }

  const technicalPatterns = [
    /is not defined/i,
    /cannot read properties/i,
    /undefined/i,
    /null/i,
    /stack/i,
    /syntaxerror/i,
    /referenceerror/i,
    /typeerror/i,
    /json/i
  ];

  if (technicalPatterns.some((pattern) => pattern.test(message))) {
    return fallback;
  }

  return message.length > 180 ? `${message.slice(0, 177)}...` : message;
}

export function getCvImportErrorMessage(error, language = "fr") {
  const friendly = getFriendlyErrorMessage(error, language);
  const generic =
    language === "en"
      ? "CV extraction failed. Upload a readable PDF or DOCX."
      : "L'extraction du CV a échoué. Importe un PDF texte ou un DOCX lisible.";
  return friendly.includes("Une erreur est survenue") || friendly.includes("Something went wrong") ? generic : friendly;
}
