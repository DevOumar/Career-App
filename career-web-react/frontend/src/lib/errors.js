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

  const duplicateEmailPatterns = [
    /user_email_addresses_email/i,
    /duplicate key value violates unique constraint/i,
    /violates unique constraint/i,
    /23505/i,
    /duplicate/i
  ];
  if (duplicateEmailPatterns.some((pattern) => pattern.test(message)) && /email|mail|user_email_addresses/i.test(message)) {
    return language === "en" ? "An account already exists with this email address." : "Un compte existe deja avec cet email.";
  }

  const duplicateUsernamePatterns = [/username/i, /nom d'utilisateur/i];
  if (duplicateEmailPatterns.some((pattern) => pattern.test(message)) && duplicateUsernamePatterns.some((pattern) => pattern.test(message))) {
    return language === "en" ? "This username is already taken." : "Ce nom d'utilisateur est deja utilise.";
  }

  const smtpPatterns = [/smtp/i, /nodemailer/i, /eauth/i, /etimedout/i, /econnrefused/i, /greeting timeout/i];
  if (smtpPatterns.some((pattern) => pattern.test(message))) {
    return language === "en"
      ? "The email could not be sent. Please try again in a moment."
      : "L'email n'a pas pu etre envoye. Reessayez dans quelques instants.";
  }

  const databasePatterns = [
    /postgres/i,
    /postgresql/i,
    /supabase/i,
    /sql/i,
    /relation .* does not exist/i,
    /column .* does not exist/i,
    /syntax error at or near/i,
    /violates foreign key constraint/i,
    /violates not-null constraint/i,
    /invalid input syntax/i,
    /deadlock detected/i,
    /database/i
  ];
  if (databasePatterns.some((pattern) => pattern.test(message))) {
    return fallback;
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
    /json/i,
    /constraint/i,
    /errno/i,
    /code:\s*['"]?[a-z0-9_]+/i,
    /enotfound/i,
    /econnreset/i,
    /timeout/i,
    /failed with status/i,
    /internal server error/i
  ];

  if (technicalPatterns.some((pattern) => pattern.test(message))) {
    return fallback;
  }

  return message.length > 180 ? `${message.slice(0, 177)}...` : message;
}

export function getCvImportErrorMessage(error, language = "fr") {
  // CV scanné / exporté en image : message complet, jamais tronqué.
  if (error?.code === "CV_IMAGE_PDF") {
    return language === "en"
      ? "This CV looks like an image (scanned PDF or exported as an image), so its text cannot be read. Export it as a PDF from Word, Canva or Google Docs (selectable text), or import the DOCX file."
      : "Ce CV semble être une image (PDF scanné ou exporté en image) : son texte ne peut pas être lu. Exportez-le en PDF depuis Word, Canva ou Google Docs (texte sélectionnable), ou importez le fichier DOCX.";
  }
  const friendly = getFriendlyErrorMessage(error, language);
  const generic =
    language === "en"
      ? "CV extraction failed. Upload a readable PDF or DOCX."
      : "L'extraction du CV a échoué. Importe un PDF texte ou un DOCX lisible.";
  return friendly.includes("Une erreur est survenue") || friendly.includes("Something went wrong") ? generic : friendly;
}
