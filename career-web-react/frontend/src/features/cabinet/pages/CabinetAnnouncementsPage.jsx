import React from "react";
import { useState, useEffect } from "react";
import Swal from "sweetalert2";
import { UiIcon } from "../../../components/UiIcon.jsx";
import { getFriendlyErrorMessage } from "../../../lib/errors.js";
import { formatDate } from "../../../lib/format.js";
import {
  getCabinetAnnouncements,
  sendCabinetAnnouncement,
  getCabinetMessageTemplates,
  createCabinetMessageTemplate,
  deleteCabinetMessageTemplate
} from "../../../lib/inMemoryDb.js";
import { CabinetEmptyState } from "./CabinetEmptyState.jsx";
import { cabinetToast } from "./cabinetToast.js";

export default function CabinetAnnouncementsPage({ user, language, isCabinetOwner = true }) {
  const copy =
    language === "en"
      ? {
          title: "Announcements",
          subtitle: "Send an email to every recruiter linked to your license.",
          subjectLabel: "Subject",
          messageLabel: "Message",
          send: "Send announcement",
          sending: "Sending…",
          empty: "No announcement sent yet.",
          emptyHint: "Send your first announcement to your team above.",
          recipients: (n) => `${n} recipient(s)`,
          templatesTitle: "Message templates",
          templatesHint: "Save reusable wording for your follow-ups and announcements.",
          useTemplate: "Use a template…",
          templateName: "Template name",
          saveAsTemplate: "Save current message as template",
          templateSaved: "Template saved.",
          templateDeleted: "Template deleted.",
          deleteConfirmTitle: "Delete this template?",
          cancel: "Cancel",
          delete: "Delete"
        }
      : {
          title: "Annonces",
          subtitle: "Envoyez un email à tous les recruteurs rattachés à votre licence.",
          subjectLabel: "Objet",
          messageLabel: "Message",
          send: "Envoyer l'annonce",
          sending: "Envoi…",
          empty: "Aucune annonce envoyée pour l'instant.",
          emptyHint: "Envoyez votre première annonce à votre équipe ci-dessus.",
          recipients: (n) => `${n} destinataire(s)`,
          templatesTitle: "Modèles de message",
          templatesHint: "Enregistrez des formulations réutilisables pour vos relances et annonces.",
          useTemplate: "Utiliser un modèle…",
          templateName: "Nom du modèle",
          saveAsTemplate: "Enregistrer le message actuel comme modèle",
          templateSaved: "Modèle enregistré.",
          templateDeleted: "Modèle supprimé.",
          deleteConfirmTitle: "Supprimer ce modèle ?",
          cancel: "Annuler",
          delete: "Supprimer"
        };

  const [items, setItems] = useState(null);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [templates, setTemplates] = useState([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");

  function reload() {
    getCabinetAnnouncements(user.id).then(setItems).catch((err) => setError(getFriendlyErrorMessage(err, language)));
  }

  function reloadTemplates() {
    getCabinetMessageTemplates(user.id).then(setTemplates).catch(() => setTemplates([]));
  }

  useEffect(() => {
    reload();
    reloadTemplates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.id]);

  function applyTemplate(templateId) {
    setSelectedTemplateId(templateId);
    const template = templates.find((item) => item.id === templateId);
    if (template) {
      setSubject(template.subject || "");
      setMessage(template.message || "");
    }
  }

  async function handleSaveTemplate() {
    if (!message.trim()) return;
    const { value: name } = await Swal.fire({
      icon: "question",
      title: copy.templateName,
      input: "text",
      showCancelButton: true,
      cancelButtonText: copy.cancel
    });
    if (!name) return;
    await createCabinetMessageTemplate(user.id, { name, subject, message });
    reloadTemplates();
    cabinetToast({ title: copy.templateSaved });
  }

  async function handleDeleteTemplate(templateId, event) {
    event.stopPropagation();
    const result = await Swal.fire({
      icon: "warning",
      title: copy.deleteConfirmTitle,
      showCancelButton: true,
      confirmButtonText: copy.delete,
      cancelButtonText: copy.cancel,
      confirmButtonColor: "#f5222d"
    });
    if (!result.isConfirmed) return;
    await deleteCabinetMessageTemplate(user.id, templateId);
    if (selectedTemplateId === templateId) setSelectedTemplateId("");
    reloadTemplates();
    cabinetToast({ title: copy.templateDeleted });
  }

  async function submit(event) {
    event.preventDefault();
    setError("");
    setSending(true);
    try {
      const result = await sendCabinetAnnouncement(user.id, { subject, message });
      setSubject("");
      setMessage("");
      setSelectedTemplateId("");
      reload();
      cabinetToast({
        title: language === "en" ? "Announcement sent." : "Annonce envoyée.",
        text: copy.recipients(result.recipientCount)
      });
    } catch (err) {
      setError(getFriendlyErrorMessage(err, language));
    } finally {
      setSending(false);
    }
  }

  return (
    <section className="cv-history-page cabinet-page">
      <div className="card block history-head">
        <div className="feature-page-header">
          <span className="feature-page-header-icon">
            <UiIcon name="chat" />
          </span>
          <div>
            <h2>{copy.title}</h2>
            <p className="muted">{copy.subtitle}</p>
          </div>
        </div>
      </div>

      {!isCabinetOwner ? (
        <div className="card block">
          <p className="muted">
            {language === "en"
              ? "Only the firm's owner account can send team-wide announcements."
              : "Seul le compte titulaire du cabinet peut envoyer des annonces à toute l'équipe."}
          </p>
        </div>
      ) : null}

      {isCabinetOwner && templates.length ? (
        <div className="card block">
          <h3>{copy.templatesTitle}</h3>
          <p className="muted">{copy.templatesHint}</p>
          <select value={selectedTemplateId} onChange={(event) => applyTemplate(event.target.value)}>
            <option value="">{copy.useTemplate}</option>
            {templates.map((template) => (
              <option key={template.id} value={template.id}>{template.name}</option>
            ))}
          </select>
          <div className="cabinet-template-list">
            {templates.map((template) => (
              <span key={template.id} className="tag cabinet-template-chip">
                {template.name}
                <button type="button" onClick={(event) => handleDeleteTemplate(template.id, event)}>×</button>
              </span>
            ))}
          </div>
        </div>
      ) : null}

      {isCabinetOwner ? (
      <form className="card block application-form" onSubmit={submit}>
        <input required minLength={2} value={subject} onChange={(event) => setSubject(event.target.value)} placeholder={copy.subjectLabel} />
        <textarea required rows={5} value={message} onChange={(event) => setMessage(event.target.value)} placeholder={copy.messageLabel} />
        <div className="cabinet-quick-actions">
          <button type="button" className="btn-secondary" onClick={handleSaveTemplate} disabled={!message.trim()}>
            <UiIcon name="save" /> {copy.saveAsTemplate}
          </button>
          <button type="submit" className="btn-main ready" disabled={sending}>
            {sending ? copy.sending : copy.send}
          </button>
        </div>
      </form>
      ) : null}
      {error ? <p className="field-error">{error}</p> : null}

      {items?.length ? (
        <div className="history-list">
          {items.map((item) => (
            <article className="history-card" key={item.id}>
              <div className="history-card-top">
                <div className="history-card-main">
                  <div>
                    <h3>{item.subject}</h3>
                    <p>{formatDate(item.createdAt)}</p>
                  </div>
                </div>
                <span className="tag">{copy.recipients(item.recipientCount)}</span>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <CabinetEmptyState icon="chat" title={copy.empty} hint={copy.emptyHint} />
      )}
    </section>
  );
}
