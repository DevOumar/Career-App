import React, { useCallback, useRef, useState } from "react";
// Briques communes aux pages de l'espace Cabinet : libellés des statuts,
// tons associés et boîte de confirmation (même modale que la double
// authentification, à la place des popups SweetAlert).
import { MfaDialog } from "../../account/mfa/MfaUi.jsx";

// Étapes d'un candidat, dans l'ordre du pipeline.
export const CANDIDATE_STATUSES = ["sourced", "contacted", "interviewing", "placed", "rejected"];
export const CANDIDATE_STATUS_LABELS = {
  fr: { sourced: "Sourcé", contacted: "Contacté", interviewing: "En entretien", placed: "Placé", rejected: "Écarté" },
  en: { sourced: "Sourced", contacted: "Contacted", interviewing: "Interviewing", placed: "Placed", rejected: "Rejected" }
};
export const CANDIDATE_STATUS_TONES = { sourced: "neutral", contacted: "blue", interviewing: "gold", placed: "green", rejected: "danger" };

export const MISSION_STATUSES = ["open", "in_progress", "closed"];
export const MISSION_STATUS_LABELS = {
  fr: { open: "Ouverte", in_progress: "En cours", closed: "Clôturée" },
  en: { open: "Open", in_progress: "In progress", closed: "Closed" }
};
export const MISSION_STATUS_TONES = { open: "green", in_progress: "gold", closed: "neutral" };

export const candidateStatusLabel = (status, language) => (CANDIDATE_STATUS_LABELS[language === "en" ? "en" : "fr"][status] || status || "");
export const missionStatusLabel = (status, language) => (MISSION_STATUS_LABELS[language === "en" ? "en" : "fr"][status] || status || "");

export function StatusPill({ tone = "neutral", children }) {
  return <span className={`jy-pill ${tone}`}>{children}</span>;
}

// Montant sans centimes (cartes, indicateurs) : « 9 500 € ».
export function compactMoney(value, language = "fr", currency = "EUR") {
  return new Intl.NumberFormat(language === "en" ? "en-GB" : "fr-FR", { style: "currency", currency: currency || "EUR", maximumFractionDigits: 0 }).format(Number(value || 0));
}

export const candidateName = (item) => `${item?.firstName || ""} ${item?.lastName || ""}`.trim() || item?.email || "";

// Boîte de confirmation asynchrone : `const [confirm, dialog] = useConfirm();`
// puis `if (await confirm({ title, description, confirmLabel })) …`, en
// rendant `dialog` dans la page.
export function useConfirm(language) {
  const [state, setState] = useState(null);
  const resolver = useRef(null);
  const t = (fr, en) => (language === "en" ? en : fr);

  const confirm = useCallback((options) => {
    return new Promise((resolve) => {
      resolver.current = resolve;
      setState(options);
    });
  }, []);

  function close(result) {
    resolver.current?.(result);
    resolver.current = null;
    setState(null);
  }

  const dialog = (
    <MfaDialog
      open={Boolean(state)}
      onClose={() => close(false)}
      icon={state?.icon || "trash"}
      tone={state?.tone || "danger"}
      title={state?.title || ""}
      description={state?.description}
      width={460}
      footer={
        <>
          <button type="button" className="mfa-btn ghost" onClick={() => close(false)}>
            {t("Annuler", "Cancel")}
          </button>
          <button type="button" className={`mfa-btn ${state?.tone === "brand" ? "primary" : "danger"}`} onClick={() => close(true)} autoFocus>
            {state?.confirmLabel || t("Confirmer", "Confirm")}
          </button>
        </>
      }
    >
      {state?.detail ? <p className="jy-confirm-detail">{state.detail}</p> : null}
    </MfaDialog>
  );

  return [confirm, dialog];
}
