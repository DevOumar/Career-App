import React, { useEffect, useState } from "react";
// Espace Cabinet › Annonces à l'équipe : e-mails envoyés à tous les
// recruteurs rattachés à la licence, avec des modèles de message
// réutilisables. Boîte de réception façon messagerie (liste + détail).
import { AdminPageLoader } from "../../../components/AdminPageLoader.jsx";
import { getFriendlyErrorMessage } from "../../../lib/errors.js";
import { formatDateTime } from "../../../lib/format.js";
import {
  createCabinetMessageTemplate,
  deleteCabinetMessageTemplate,
  getCabinetAnnouncements,
  getCabinetMessageTemplates,
  sendCabinetAnnouncement
} from "../../../lib/inMemoryDb.js";
import { AdminLineIcon } from "../../admin/AdminApp.jsx";
import { MfaDialog, MfaError } from "../../account/mfa/MfaUi.jsx";
import { cabinetToast } from "./cabinetToast.js";
import { useConfirm } from "./cabinetUi.jsx";

const EMPTY_DRAFT = { subject: "", message: "" };

export default function CabinetAnnouncementsPage({ user, language, isCabinetOwner = true }) {
  const t = (fr, en) => (language === "en" ? en : fr);
  const [items, setItems] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [composeOpen, setComposeOpen] = useState(false);
  const [draft, setDraft] = useState(EMPTY_DRAFT);
  const [touched, setTouched] = useState(false);
  const [sending, setSending] = useState(false);
  const [dialogError, setDialogError] = useState("");
  const [templateName, setTemplateName] = useState("");
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [confirm, confirmDialog] = useConfirm(language);

  function reload() {
    getCabinetAnnouncements(user.id)
      .then(setItems)
      .catch((err) => setError(getFriendlyErrorMessage(err, language)));
  }
  function reloadTemplates() {
    getCabinetMessageTemplates(user.id)
      .then(setTemplates)
      .catch(() => setTemplates([]));
  }

  useEffect(() => {
    reload();
    reloadTemplates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.id]);

  function openCompose(initial = EMPTY_DRAFT) {
    setDraft({ ...EMPTY_DRAFT, ...initial });
    setTouched(false);
    setDialogError("");
    setTemplateName("");
    setComposeOpen(true);
  }

  const subjectError = draft.subject.trim().length < 2 ? t("L'objet doit contenir au moins 2 caractères.", "The subject needs at least 2 characters.") : "";
  const messageError = !draft.message.trim() ? t("Écrivez un message.", "Write a message.") : "";

  async function send() {
    setTouched(true);
    if (subjectError || messageError) return;
    setSending(true);
    setDialogError("");
    try {
      const result = await sendCabinetAnnouncement(user.id, { subject: draft.subject.trim(), message: draft.message.trim() });
      setComposeOpen(false);
      reload();
      cabinetToast({ title: t("Annonce envoyée.", "Announcement sent."), text: t(`${result?.recipientCount ?? 0} destinataire(s)`, `${result?.recipientCount ?? 0} recipient(s)`) });
    } catch (err) {
      setDialogError(getFriendlyErrorMessage(err, language));
    } finally {
      setSending(false);
    }
  }

  async function saveTemplate() {
    if (!templateName.trim() || !draft.message.trim()) return;
    setSavingTemplate(true);
    try {
      await createCabinetMessageTemplate(user.id, { name: templateName.trim(), subject: draft.subject, message: draft.message });
      setTemplateName("");
      reloadTemplates();
      cabinetToast({ title: t("Modèle enregistré.", "Template saved.") });
    } catch (err) {
      setDialogError(getFriendlyErrorMessage(err, language));
    } finally {
      setSavingTemplate(false);
    }
  }

  async function removeTemplate(template) {
    const ok = await confirm({ title: t("Supprimer ce modèle ?", "Delete this template?"), description: template.name, confirmLabel: t("Supprimer", "Delete") });
    if (!ok) return;
    try {
      await deleteCabinetMessageTemplate(user.id, template.id);
      reloadTemplates();
      cabinetToast({ title: t("Modèle supprimé.", "Template deleted.") });
    } catch (err) {
      cabinetToast({ title: getFriendlyErrorMessage(err, language), icon: "error" });
    }
  }

  if (error) return <p className="field-error">{error}</p>;
  if (!items) return <AdminPageLoader language={language} />;

  const sorted = [...items].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const needle = query.trim().toLowerCase();
  const visible = sorted.filter((item) => !needle || `${item.subject} ${item.message || ""}`.toLowerCase().includes(needle));
  const selected = sorted.find((item) => item.id === selectedId) || visible[0] || null;
  const recipients = sorted.reduce((sum, item) => sum + Number(item.recipientCount || 0), 0);
  const failed = sorted.reduce((sum, item) => sum + Number(item.failedCount || 0), 0);

  const cards = [
    { icon: "announcements", label: t("Annonces envoyées", "Announcements sent"), value: sorted.length, tone: "" },
    { icon: "accounts", label: t("E-mails distribués", "Emails delivered"), value: Math.max(0, recipients - failed), tone: "green" },
    { icon: "alert", label: t("Échecs d'envoi", "Failed sends"), value: failed, tone: failed ? "danger" : "" },
    { icon: "fileText", label: t("Modèles enregistrés", "Saved templates"), value: templates.length, tone: "gold" }
  ];

  return (
    <section className="admin-accounts jy-communication">
      <header className="module-header admin-accounts-header">
        <div>
          <h2>{t("Annonces à l'équipe", "Team announcements")}</h2>
          <p>{t("Un e-mail envoyé à tous les recruteurs rattachés à votre licence.", "An email sent to every recruiter linked to your license.")}</p>
        </div>
        {isCabinetOwner ? (
          <div className="admin-header-actions">
            <button type="button" className="jy-btn jy-btn-primary" onClick={() => openCompose()}>
              <AdminLineIcon name="plus" />
              {t("Nouvelle annonce", "New announcement")}
            </button>
          </div>
        ) : null}
      </header>

      {!isCabinetOwner ? (
        <div className="jy-callout info">
          <AdminLineIcon name="info" />
          <span>{t("Seul le compte titulaire du cabinet peut envoyer des annonces à toute l'équipe. Vous consultez ici l'historique.", "Only the firm's owner account can send team-wide announcements. You're viewing the history here.")}</span>
        </div>
      ) : null}

      <div className="jy-mini-cards">
        {cards.map((card) => (
          <div key={card.label} className="jy-mini-card">
            <span className="jy-mini-card-label">
              <AdminLineIcon name={card.icon} />
              {card.label}
            </span>
            <strong className={card.tone}>{card.value}</strong>
          </div>
        ))}
      </div>

      {isCabinetOwner && templates.length ? (
        <div className="jy-card">
          <div className="jy-card-head">
            <div>
              <h3>{t("Modèles de message", "Message templates")}</h3>
              <p className="jy-card-sub">{t("Cliquez sur un modèle pour rédiger une annonce à partir de celui-ci.", "Click a template to write an announcement from it.")}</p>
            </div>
          </div>
          <div className="jy-template-grid">
            {templates.map((template) => (
              <div key={template.id} className="jy-template-card">
                <button type="button" className="jy-template-main" onClick={() => openCompose({ subject: template.subject || "", message: template.message || "" })}>
                  <AdminLineIcon name="fileText" />
                  <span>
                    <strong>{template.name}</strong>
                    <small>{template.subject || template.message}</small>
                  </span>
                </button>
                <button type="button" className="jy-icon-btn small" title={t("Supprimer", "Delete")} aria-label={t("Supprimer", "Delete")} onClick={() => removeTemplate(template)}>
                  <AdminLineIcon name="trash" />
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {sorted.length ? (
        <div className="jy-inbox">
          <aside className="jy-inbox-list">
            <label className="jy-inbox-search">
              <AdminLineIcon name="search" />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t("Rechercher une annonce…", "Search an announcement…")} />
            </label>
            <div className="jy-inbox-items">
              {visible.length ? (
                visible.map((item) => (
                  <button type="button" key={item.id} className={`jy-inbox-item ${selected?.id === item.id ? "is-active" : ""}`} onClick={() => setSelectedId(item.id)}>
                    <span className="jy-inbox-icon">
                      <AdminLineIcon name="accounts" />
                    </span>
                    <span className="jy-inbox-text">
                      <span className="jy-inbox-row">
                        <strong>{t("Toute l'équipe", "Whole team")}</strong>
                        <small>{formatDateTime(item.createdAt, language)}</small>
                      </span>
                      <span className="jy-inbox-subject">{item.subject}</span>
                      <small>
                        {item.recipientCount} {t("destinataire(s)", "recipient(s)")}
                        {item.failedCount ? ` · ${item.failedCount} ${t("échec(s)", "failed")}` : ""}
                      </small>
                    </span>
                  </button>
                ))
              ) : (
                <p className="jy-empty">{t("Aucune annonce ne correspond.", "No announcement matches.")}</p>
              )}
            </div>
          </aside>
          {selected ? (
            <article className="jy-inbox-detail">
              <header>
                <div>
                  <h3>{selected.subject}</h3>
                  <p>
                    {t("Toute l'équipe", "Whole team")} · {formatDateTime(selected.createdAt, language)}
                  </p>
                </div>
                <span className={`tag ${selected.failedCount ? "tag-warning" : "tag-success"}`}>{selected.failedCount ? t("Envoi partiel", "Partially sent") : t("Envoyée", "Sent")}</span>
              </header>
              <div className="jy-inbox-message">{selected.message || t("Contenu indisponible.", "Content unavailable.")}</div>
              <div className="jy-inbox-stats">
                <span>
                  <strong>{selected.recipientCount}</strong>
                  <small>{t("destinataires", "recipients")}</small>
                </span>
                <span>
                  <strong className="green">{Number(selected.recipientCount || 0) - Number(selected.failedCount || 0)}</strong>
                  <small>{t("délivrés", "delivered")}</small>
                </span>
                <span>
                  <strong className={selected.failedCount ? "danger" : ""}>{selected.failedCount || 0}</strong>
                  <small>{t("échecs", "failed")}</small>
                </span>
              </div>
              {isCabinetOwner ? (
                <div className="jy-inbox-actions">
                  <button type="button" className="jy-btn jy-btn-outline jy-btn-sm" onClick={() => openCompose({ subject: selected.subject, message: selected.message || "" })}>
                    <AdminLineIcon name="send" />
                    {t("Renvoyer une annonce similaire", "Send a similar announcement")}
                  </button>
                </div>
              ) : null}
            </article>
          ) : null}
        </div>
      ) : (
        <div className="jy-card jy-empty-block">
          <span className="jy-empty-icon">
            <AdminLineIcon name="announcements" />
          </span>
          <strong>{t("Aucune annonce envoyée pour l'instant", "No announcement sent yet")}</strong>
          <span>{t("Écrivez à toute votre équipe de recruteurs : l'e-mail part via le serveur de la plateforme.", "Write to your whole recruiting team: the email is sent through the platform's server.")}</span>
          {isCabinetOwner ? (
            <button type="button" className="jy-btn jy-btn-primary jy-btn-sm" onClick={() => openCompose()}>
              <AdminLineIcon name="plus" />
              {t("Nouvelle annonce", "New announcement")}
            </button>
          ) : null}
        </div>
      )}

      <MfaDialog
        open={composeOpen}
        onClose={() => !sending && setComposeOpen(false)}
        icon="send"
        title={t("Nouvelle annonce à l'équipe", "New team announcement")}
        description={t("L'e-mail est envoyé à tous les recruteurs rattachés à votre licence.", "The email goes to every recruiter linked to your license.")}
        width={600}
        footer={
          <>
            <button type="button" className="mfa-btn ghost" onClick={() => setComposeOpen(false)} disabled={sending}>
              {t("Annuler", "Cancel")}
            </button>
            <button type="button" className="mfa-btn primary" onClick={send} disabled={sending}>
              {sending ? <span className="mfa-spinner" /> : null}
              {t("Envoyer l'annonce", "Send announcement")}
            </button>
          </>
        }
      >
        <MfaError message={dialogError} />
        {templates.length ? (
          <label className="mfa-field">
            <span>{t("Partir d'un modèle", "Start from a template")}</span>
            <select
              value=""
              onChange={(event) => {
                const template = templates.find((item) => item.id === event.target.value);
                if (template) setDraft({ subject: template.subject || "", message: template.message || "" });
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
          <input autoFocus maxLength={160} value={draft.subject} placeholder={t("Ex. Point pipeline de la semaine", "e.g. Weekly pipeline review")} onChange={(event) => setDraft({ ...draft, subject: event.target.value })} />
          {touched && subjectError ? <small className="jy-field-error">{subjectError}</small> : null}
        </label>
        <label className={`mfa-field ${touched && messageError ? "has-error" : ""}`}>
          <span>{t("Message", "Message")}</span>
          <textarea rows={7} className="jy-textarea" maxLength={5000} value={draft.message} placeholder={t("Votre message à l'équipe…", "Your message to the team…")} onChange={(event) => setDraft({ ...draft, message: event.target.value })} />
          {touched && messageError ? <small className="jy-field-error">{messageError}</small> : null}
        </label>
        <div className="jy-template-save">
          <input value={templateName} maxLength={80} placeholder={t("Nom du modèle (pour réutiliser ce message)", "Template name (to reuse this message)")} onChange={(event) => setTemplateName(event.target.value)} />
          <button type="button" className="jy-btn jy-btn-outline jy-btn-sm" disabled={savingTemplate || !templateName.trim() || !draft.message.trim()} onClick={saveTemplate}>
            {savingTemplate ? <span className="btn-spinner dark" /> : <AdminLineIcon name="download" />}
            {t("Enregistrer comme modèle", "Save as template")}
          </button>
        </div>
      </MfaDialog>

      {confirmDialog}
    </section>
  );
}
