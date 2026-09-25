import React, { useEffect, useState } from "react";
// Fiche candidat (espace Cabinet) : e-mail au candidat, fil des missions /
// entretiens / e-mails, export RGPD et vue pipeline par étape.
import { AvatarCircle } from "../../../components/AvatarCircle.jsx";
import { getFriendlyErrorMessage } from "../../../lib/errors.js";
import { formatDateTime } from "../../../lib/format.js";
import { exportCabinetCandidateData, getCabinetCandidateTimeline, getCabinetMessageTemplates, sendCabinetCandidateEmail } from "../../../lib/inMemoryDb.js";
import { AdminLineIcon } from "../../admin/AdminApp.jsx";
import { MfaDialog, MfaError } from "../../account/mfa/MfaUi.jsx";
import { cabinetToast } from "./cabinetToast.js";
import { INTERVIEW_MODES, INTERVIEW_STATUS } from "./CabinetInterviewsPage.jsx";
import { CANDIDATE_STATUSES, CANDIDATE_STATUS_TONES, StatusPill, candidateName, candidateStatusLabel } from "./cabinetUi.jsx";

export const CONSENT_LABELS = {
  pending: { fr: "Consentement en attente", en: "Consent pending", short: { fr: "En attente", en: "Pending" }, tone: "gold" },
  granted: { fr: "Consentement accordé", en: "Consent granted", short: { fr: "Accordé", en: "Granted" }, tone: "green" },
  refused: { fr: "Refus d'être contacté", en: "Refused contact", short: { fr: "Refusé", en: "Refused" }, tone: "danger" },
  anonymized: { fr: "Données anonymisées", en: "Data anonymized", short: { fr: "Anonymisé", en: "Anonymized" }, tone: "neutral" }
};
export const CONSENT_SOURCES = {
  email: { fr: "Par e-mail", en: "By email" },
  phone: { fr: "Par téléphone", en: "By phone" },
  form: { fr: "Formulaire / candidature", en: "Form / application" },
  meeting: { fr: "En rendez-vous", en: "In a meeting" },
  job_board: { fr: "Via un site d'emploi", en: "Via a job board" },
  other: { fr: "Autre", en: "Other" }
};

export function CandidateEmailDialog({ language, userId, candidate, onClose, onSent }) {
  const t = (fr, en) => (language === "en" ? en : fr);
  const [templates, setTemplates] = useState([]);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState(() => t(`Bonjour ${candidate.firstName || ""},\n\n`, `Hello ${candidate.firstName || ""},\n\n`));
  const [touched, setTouched] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    getCabinetMessageTemplates(userId)
      .then(setTemplates)
      .catch(() => setTemplates([]));
  }, [userId]);

  const subjectError = subject.trim().length < 2 ? t("Indiquez un objet.", "Enter a subject.") : "";
  const messageError = !message.trim() ? t("Écrivez un message.", "Write a message.") : "";

  async function send() {
    setTouched(true);
    if (subjectError || messageError) return;
    setSending(true);
    setError("");
    try {
      await sendCabinetCandidateEmail(userId, candidate.id, { subject: subject.trim(), message: message.trim() });
      cabinetToast({ title: t("E-mail envoyé.", "Email sent."), text: candidate.email });
      await onSent?.();
    } catch (err) {
      setError(getFriendlyErrorMessage(err, language));
    } finally {
      setSending(false);
    }
  }

  return (
    <MfaDialog
      open
      onClose={() => !sending && onClose()}
      icon="send"
      title={t(`Écrire à ${candidateName(candidate)}`, `Email ${candidateName(candidate)}`)}
      description={candidate.email}
      width={600}
      footer={
        <>
          <button type="button" className="mfa-btn ghost" onClick={onClose} disabled={sending}>
            {t("Annuler", "Cancel")}
          </button>
          <button type="button" className="mfa-btn primary" onClick={send} disabled={sending}>
            {sending ? <span className="mfa-spinner" /> : null}
            {t("Envoyer", "Send")}
          </button>
        </>
      }
    >
      <MfaError message={error} />
      {templates.length ? (
        <label className="mfa-field">
          <span>{t("Partir d'un modèle", "Start from a template")}</span>
          <select
            value=""
            onChange={(event) => {
              const template = templates.find((item) => item.id === event.target.value);
              if (template) {
                setSubject(template.subject || "");
                setMessage(template.message || "");
              }
            }}
          >
            <option value="">{t("Choisir un modèle…", "Choose a template…")}</option>
            {templates.map((template) => (
              <option key={template.id} value={template.id}>
                {template.name}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      <label className={`mfa-field ${touched && subjectError ? "has-error" : ""}`}>
        <span>{t("Objet", "Subject")}</span>
        <input autoFocus maxLength={200} value={subject} onChange={(event) => setSubject(event.target.value)} />
        {touched && subjectError ? <small className="jy-field-error">{subjectError}</small> : null}
      </label>
      <label className={`mfa-field ${touched && messageError ? "has-error" : ""}`}>
        <span>{t("Message", "Message")}</span>
        <textarea rows={8} className="jy-textarea" maxLength={8000} value={message} onChange={(event) => setMessage(event.target.value)} />
        {touched && messageError ? <small className="jy-field-error">{messageError}</small> : null}
      </label>
      <small className="jy-dialog-note">
        {t(
          "Le candidat peut répondre directement à votre adresse. Un rappel de ses droits RGPD est ajouté en bas de l'e-mail, et l'envoi est tracé dans sa fiche.",
          "The candidate can reply straight to your address. A reminder of their GDPR rights is added at the bottom, and the email is logged on their profile."
        )}
      </small>
    </MfaDialog>
  );
}

// Fil de la fiche : missions, entretiens et e-mails du candidat.
export function CandidateTimeline({ userId, candidateId, language, refreshKey }) {
  const t = (fr, en) => (language === "en" ? en : fr);
  const [data, setData] = useState(null);
  const lang = language === "en" ? "en" : "fr";

  useEffect(() => {
    getCabinetCandidateTimeline(userId, candidateId)
      .then(setData)
      .catch(() => setData({ emails: [], interviews: [], missions: [] }));
  }, [userId, candidateId, refreshKey]);

  if (!data) return <p className="jy-drawer-empty">{t("Chargement…", "Loading…")}</p>;
  const events = [
    ...data.missions.map((item) => ({
      key: `m-${item.id}`,
      date: item.assignedAt,
      icon: "briefcase",
      title: t(`Affecté à « ${item.title} »`, `Assigned to “${item.title}”`),
      detail: [item.clientName, candidateStatusLabel(item.stage, language), item.score != null ? t(`score ${item.score}`, `score ${item.score}`) : ""].filter(Boolean).join(" · ")
    })),
    ...data.interviews.map((item) => ({
      key: `i-${item.id}`,
      date: item.scheduledAt,
      icon: "calendar",
      title: t(`Entretien ${INTERVIEW_STATUS[item.status]?.fr.toLowerCase() || ""}`, `Interview ${INTERVIEW_STATUS[item.status]?.en.toLowerCase() || ""}`),
      detail: [INTERVIEW_MODES[item.mode]?.[lang], item.missionTitle, item.feedback].filter(Boolean).join(" · ")
    })),
    ...data.emails.map((item) => ({
      key: `e-${item.id}`,
      date: item.createdAt,
      icon: item.status === "sent" ? "send" : "alert",
      title: item.status === "sent" ? t(`E-mail envoyé : « ${item.subject} »`, `Email sent: “${item.subject}”`) : t(`Échec d'envoi : « ${item.subject} »`, `Failed email: “${item.subject}”`),
      detail: item.sentByName ? t(`par ${item.sentByName}`, `by ${item.sentByName}`) : ""
    }))
  ].sort((a, b) => new Date(b.date) - new Date(a.date));

  if (!events.length) return <p className="jy-drawer-empty">{t("Aucune mission, aucun entretien ni e-mail pour l'instant.", "No mission, interview or email yet.")}</p>;
  return (
    <ul className="jy-activity-feed compact">
      {events.map((event) => (
        <li key={event.key}>
          <span className="jy-activity-icon">
            <AdminLineIcon name={event.icon} />
          </span>
          <span className="jy-activity-text">
            <span>
              <strong>{event.title}</strong>
            </span>
            {event.detail ? <small>{event.detail}</small> : null}
            <small>{formatDateTime(event.date, language)}</small>
          </span>
        </li>
      ))}
    </ul>
  );
}

// Export RGPD (droit d'accès / portabilité) : fichier JSON complet.
export async function downloadCandidateData(userId, candidate, language) {
  try {
    const data = await exportCabinetCandidateData(userId, candidate.id);
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `donnees-${candidateName(candidate).toLowerCase().replace(/[^a-z0-9]+/gi, "-")}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    cabinetToast({ title: language === "en" ? "Data exported." : "Données exportées." });
  } catch (err) {
    cabinetToast({ title: getFriendlyErrorMessage(err, language), icon: "error" });
  }
}

// Vue pipeline : une colonne par étape, déplacement par glisser-déposer.
export function CandidatePipelineBoard({ items, language, onMove, onOpen }) {
  const t = (fr, en) => (language === "en" ? en : fr);
  const [dragId, setDragId] = useState("");
  const [overStatus, setOverStatus] = useState("");
  return (
    <div className="jy-board">
      {CANDIDATE_STATUSES.map((status) => {
        const column = items.filter((item) => item.status === status);
        return (
          <div
            key={status}
            className={`jy-board-col tone-${CANDIDATE_STATUS_TONES[status]} ${overStatus === status ? "is-over" : ""}`}
            onDragOver={(event) => {
              if (!dragId) return;
              event.preventDefault();
              setOverStatus(status);
            }}
            onDragLeave={() => setOverStatus("")}
            onDrop={(event) => {
              event.preventDefault();
              const item = items.find((entry) => entry.id === dragId);
              setOverStatus("");
              setDragId("");
              if (item && item.status !== status) onMove(item, status);
            }}
          >
            <div className="jy-board-head">
              <span>{candidateStatusLabel(status, language)}</span>
              <strong>{column.length}</strong>
            </div>
            <div className="jy-board-cards">
              {column.map((item) => (
                <button
                  type="button"
                  key={item.id}
                  className={`jy-board-card ${item.anonymizedAt ? "is-locked" : ""}`}
                  draggable={!item.anonymizedAt}
                  onDragStart={(event) => {
                    setDragId(item.id);
                    event.dataTransfer.effectAllowed = "move";
                  }}
                  onDragEnd={() => {
                    setDragId("");
                    setOverStatus("");
                  }}
                  onClick={() => onOpen(item)}
                >
                  <span className="jy-board-card-top">
                    <AvatarCircle user={item} />
                    <span>
                      <strong>{candidateName(item)}</strong>
                      <small>{item.headline || item.email || "-"}</small>
                    </span>
                  </span>
                  {item.skills?.length ? (
                    <span className="jy-skill-chips">
                      {item.skills.slice(0, 2).map((skill) => (
                        <span key={skill} className="jy-chip small">
                          {skill}
                        </span>
                      ))}
                    </span>
                  ) : null}
                  {item.followUpDue ? <StatusPill tone="danger">{t("Relance à faire", "Follow-up due")}</StatusPill> : null}
                </button>
              ))}
              {!column.length ? <p className="jy-board-empty">{t("Déposez un candidat ici", "Drop a candidate here")}</p> : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}
