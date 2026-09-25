import React, { useEffect, useRef, useState } from "react";
// Hôte global de la confirmation par second facteur pour les actions
// sensibles du compte (voir registerStepUpHost dans lib/inMemoryDb.js) :
// quand le serveur répond STEP_UP_REQUIRED, le client HTTP demande ici une
// preuve, puis rejoue la requête. Monté une seule fois (main.jsx).
import { registerStepUpHost } from "../../../lib/inMemoryDb.js";
import { StepUpDialog } from "./MfaUi.jsx";

export default function StepUpHost() {
  const [request, setRequest] = useState(null);
  const resolverRef = useRef(null);

  useEffect(
    () =>
      registerStepUpHost({
        ask: ({ methods, userId, error }) =>
          new Promise((resolve) => {
            resolverRef.current = resolve;
            // `key` change à chaque demande : la fenêtre repart propre, sauf
            // l'erreur du précédent essai affichée en tête.
            setRequest({ methods, userId, error, key: Date.now() });
          }),
        close: () => {
          resolverRef.current = null;
          setRequest(null);
        }
      }),
    []
  );

  const language = (() => {
    try {
      return localStorage.getItem("career_app_language") || "fr";
    } catch (_error) {
      return "fr";
    }
  })();

  function settle(value) {
    const resolve = resolverRef.current;
    resolverRef.current = null;
    resolve?.(value);
  }

  return (
    <StepUpDialog
      key={request?.key || "idle"}
      open={Boolean(request)}
      methods={request?.methods || []}
      userId={request?.userId}
      language={language}
      externalError={request?.error || ""}
      onCancel={() => {
        settle(null);
        setRequest(null);
      }}
      // La fenêtre reste ouverte pendant la vérification ; le client HTTP
      // la ferme (succès) ou redemande avec l'erreur (code refusé).
      onConfirm={async (proof) => {
        settle(proof);
        return "";
      }}
    />
  );
}
