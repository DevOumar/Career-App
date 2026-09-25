import React, { useEffect, useState } from "react";
// Espace École › Annonces & événements : deux outils proches réunis sur une
// page à onglets.
//  - Annonces : boîte d'envoi façon Messagerie (liste + détail) et fenêtre
//    de rédaction (tous les étudiants ou une promotion) ;
//  - Événements : frise « à venir / passés » et fenêtre de création.
// Passerelle entre les deux : « Annoncer par e-mail » pré-remplit une annonce
// à partir d'un événement.
import Swal from "sweetalert2";
import { AdminPageLoader } from "../../../components/AdminPageLoader.jsx";
import { getFriendlyErrorMessage } from "../../../lib/errors.js";
import { formatDateTime } from "../../../lib/format.js";
import {
  createSchoolEvent,
  deleteSchoolEvent,
  getSchoolAnnouncements,
  getSchoolEvents,
  getSchoolPromotions,
  sendSchoolAnnouncement
} from "../../../lib/inMemoryDb.js";
import { AdminLineIcon } from "../../admin/AdminApp.jsx";
import { MfaDialog, MfaError } from "../../account/mfa/MfaUi.jsx";

const EMPTY_ANNOUNCEMENT = { subject: "", message: "", promotionId: "" };
const EMPTY_EVENT = { title: "", eventDate: "", description: "" };

function toast(title) {
  Swal.fire({ toast: true, position: "top-end", icon: "success", title, showConfirmButton: false, timer: 2400, customClass: { popup: "career-toast", title: "career-toast-title" } });
}

export default function SchoolCommunicationPage({ user, language, initialTab = "announcements" }) {
  const t = (fr, en) => (language === "en" ? en : fr);
  const [tab, setTab] = useState(initialTab === "events" ? "events" : "announcements");
  const [announcements, setAnnouncements] = useState(null);
  const [events, setEvents] = useState(null);
  const [promotions, setPromotions] = useState([]);
  const [error, setError] = useState("");

  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState("");

  const [composeOpen, setComposeOpen] = useState(false);
  const [draft, setDraft] = useState(EMPTY_ANNOUNCEMENT);
  const [draftTouched, setDraftTouched] = useState(false);
  const [composeError, setComposeError] = useState("");
  const [sending, setSending] = useState(false);

  const [eventOpen, setEventOpen] = useState(false);
  const [eventForm, setEventForm] = useState(EMPTY_EVENT);
  const [eventTouched, setEventTouched] = useState(false);
  const [eventError, setEventError] = useState("");
  const [savingEvent, setSavingEvent] = useState(false);
  const [showPast, setShowPast] = useState(false);

  function reload() {
    getSchoolAnnouncements(user.id)
      .then((items) => setAnnouncements(items || []))
      .catch((err) => setError(getFriendlyErrorMessage(err, language)));
    getSchoolEvents(user.id)
      .then((items) => setEvents(items || []))
      .catch((err) => setError(getFriendlyErrorMessage(err, language)));
  }

  useEffect(() => {
    reload();
    getSchoolPromotions(user.id)
      .then((data) => setPromotions(data.items || []))
      .catch(() => setPromotions([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.id]);

  useEffect(() => {
    setTab(initialTab === "events" ? "events" : "announcements");
  }, [initialTab]);

  const promotionName = (id) => promotions.find((item) => item.id === id)?.name;
  const audienceLabel = (promotionId) => (promotionId ? promotionName(promotionId) || t("Une promotion", "A promotion") : t("Tous les étudiants", "All students"));

  // ------------------------------------------------------------- annonces
  const subjectError = draft.subject.trim().length < 2 ? t("Au moins 2 caractères.", "At least 2 characters.") : "";
  const messageError = draft.message.trim().length < 2 ? t("Le message est vide.", "The message is empty.") : "";

  function openCompose(prefill = EMPTY_ANNOUNCEMENT) {
    setDraft(prefill);
    setDraftTouched(false);
    setComposeError("");
    setComposeOpen(true);
  }

  async function sendAnnouncement() {
    setDraftTouched(true);
    if (subjectError || messageError) return;
    setSending(true);
    setComposeError("");
    try {
      const result = await sendSchoolAnnouncement(user.id, { subject: draft.subject.trim(), message: draft.message.trim(), promotionId: draft.promotionId });
      setComposeOpen(false);
      setTab("announcements");
      reload();
      toast(
        `${t("Annonce envoyée", "Announcement sent")} · ${result.recipientCount} ${t("destinataire(s)", "recipient(s)")}${result.failedCount ? ` · ${result.failedCount} ${t("échec(s)", "failed")}` : ""}`
      );
    } catch (err) {
      setComposeError(getFriendlyErrorMessage(err, language));
    } finally {
      setSending(false);
    }
  }

  // ------------------------------------------------------------- événements
  const todayIso = new Date().toISOString().slice(0, 10);
  const eventTitleError = eventForm.title.trim().length < 2 ? t("Au moins 2 caractères.", "At least 2 characters.") : "";
  const eventDateError = !/^\d{4}-\d{2}-\d{2}$/.test(eventForm.eventDate) ? t("Choisissez une date.", "Pick a date.") : "";

  function openEvent() {
    setEventForm(EMPTY_EVENT);
    setEventTouched(false);
    setEventError("");
    setEventOpen(true);
  }

  async function saveEvent() {
    setEventTouched(true);
    if (eventTitleError || eventDateError) return;
    setSavingEvent(true);
    setEventError("");
    try {
      await createSchoolEvent(user.id, { title: eventForm.title.trim(), eventDate: eventForm.eventDate, description: eventForm.description.trim() });
      setEventOpen(false);
      setTab("events");
      reload();
      toast(t("Événement ajouté.", "Event added."));
    } catch (err) {
      setEventError(getFriendlyErrorMessage(err, language));
    } finally {
      setSavingEvent(false);
    }
  }

  async function removeEvent(item) {
    const result = await Swal.fire({
      icon: "warning",
      title: t("Supprimer cet événement ?", "Delete this event?"),
      text: item.title,
      showCancelButton: true,
      confirmButtonText: t("Supprimer", "Delete"),
      cancelButtonText: t("Annuler", "Cancel"),
      confirmButtonColor: "#b3261e",
      focusCancel: true
    });
    if (!result.isConfirmed) return;
    try {
      await deleteSchoolEvent(user.id, item.id);
      reload();
      toast(t("Événement supprimé.", "Event deleted."));
    } catch (err) {
      Swal.fire({ icon: "error", title: getFriendlyErrorMessage(err, language) });
    }
  }

  const eventDateLabel = (iso) =>
    new Intl.DateTimeFormat(language === "en" ? "en-GB" : "fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(new Date(`${iso}T12:00:00`));

  function announceEvent(item) {
    openCompose({
      subject: t(`À vos agendas : ${item.title}`, `Save the date: ${item.title}`),
      message: [
        t(`Nous vous donnons rendez-vous le ${eventDateLabel(item.eventDate)} pour : ${item.title}.`, `Join us on ${eventDateLabel(item.eventDate)} for: ${item.title}.`),
        item.description || ""
      ]
        .filter(Boolean)
        .join("\n\n"),
      promotionId: ""
    });
  }

  if (error) return <p className="field-error">{error}</p>;
  if (!announcements || !events) return <AdminPageLoader language={language} />;

  const upcoming = events.filter((item) => item.eventDate >= todayIso).sort((a, b) => a.eventDate.localeCompare(b.eventDate));
  const past = events.filter((item) => item.eventDate < todayIso).sort((a, b) => b.eventDate.localeCompare(a.eventDate));
  const totalRecipients = announcements.reduce((sum, item) => sum + Number(item.recipientCount || 0), 0);
  const totalFailed = announcements.reduce((sum, item) => sum + Number(item.failedCount || 0), 0);
  const deliveryRate = totalRecipients ? Math.round(((totalRecipients - totalFailed) / totalRecipients) * 100) : null;
  const daysUntil = (iso) => Math.round((new Date(`${iso}T00:00:00`) - new Date(`${todayIso}T00:00:00`)) / 86400000);
  const countdown = (iso) => {
    const days = daysUntil(iso);
    if (days === 0) return t("Aujourd'hui", "Today");
    if (days === 1) return t("Demain", "Tomorrow");
    if (days > 1) return t(`Dans ${days} jours`, `In ${days} days`);
    return t(`Il y a ${-days} jour(s)`, `${-days} day(s) ago`);
  };

  const cards = [
    { icon: "announcements", label: t("Annonces envoyées", "Announcements sent"), value: announcements.length, tone: "" },
    { icon: "accounts", label: t("E-mails délivrés", "Emails delivered"), value: totalRecipients - totalFailed, tone: "green" },
    { icon: "quality", label: t("Taux de délivrabilité", "Delivery rate"), value: deliveryRate == null ? "-" : `${deliveryRate} %`, tone: "green" },
    { icon: "calendar", label: t("Événements à venir", "Upcoming events"), value: upcoming.length, tone: "gold" }
  ];

  const term = query.trim().toLowerCase();
  const sorted = [...announcements].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const visibleAnnouncements = sorted.filter((item) => !term || `${item.subject} ${item.message || ""}`.toLowerCase().includes(term));
  const selected = visibleAnnouncements.find((item) => item.id === selectedId) || visibleAnnouncements[0] || null;

  const renderEvent = (item, isPast = false) => {
    const date = new Date(`${item.eventDate}T12:00:00`);
    return (
      <div key={item.id} className={`jy-event ${isPast ? "is-past" : ""}`}>
        <span className="jy-event-date">
          <small>{new Intl.DateTimeFormat(language === "en" ? "en-GB" : "fr-FR", { month: "short" }).format(date)}</small>
          <strong>{date.getDate()}</strong>
          <small>{date.getFullYear()}</small>
        </span>
        <span className="jy-event-body">
          <span className="jy-event-top">
            <strong>{item.title}</strong>
            <span className={`jy-event-when ${!isPast && daysUntil(item.eventDate) <= 7 ? "soon" : ""}`}>{countdown(item.eventDate)}</span>
          </span>
          <small className="jy-event-full">{eventDateLabel(item.eventDate)}</small>
          {item.description ? <p>{item.description}</p> : null}
        </span>
        <span className="jy-event-actions">
          {!isPast ? (
            <button type="button" className="jy-btn jy-btn-outline jy-btn-sm" onClick={() => announceEvent(item)}>
              <AdminLineIcon name="send" />
              {t("Annoncer par e-mail", "Announce by email")}
            </button>
          ) : null}
          <button type="button" className="admin-row-action danger icon-only" title={t("Supprimer", "Delete")} aria-label={t("Supprimer", "Delete")} onClick={() => removeEvent(item)}>
            <AdminLineIcon name="trash" />
          </button>
        </span>
      </div>
    );
  };

  return (
    <section className="admin-accounts jy-communication">
      <header className="module-header admin-accounts-header">
        <div>
          <h2>{t("Annonces & événements", "Announcements & events")}</h2>
          <p>{t("Informez vos étudiants par e-mail et partagez les dates clés : forums, dates limites, ateliers.", "Inform your students by email and share key dates: fairs, deadlines, workshops.")}</p>
        </div>
        <div className="admin-header-actions">
          <button type="button" className="jy-btn jy-btn-outline" onClick={openEvent}>
            <AdminLineIcon name="calendar" />
            {t("Nouvel événement", "New event")}
          </button>
          <button type="button" className="jy-btn jy-btn-primary" onClick={() => openCompose()}>
            <AdminLineIcon name="plus" />
            {t("Nouvelle annonce", "New announcement")}
          </button>
        </div>
      </header>

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

      <div className="jy-notif-tabs" role="tablist">
        <button type="button" role="tab" aria-selected={tab === "announcements"} className={tab === "announcements" ? "is-active" : ""} onClick={() => setTab("announcements")}>
          {t("Annonces", "Announcements")}
          <span>({announcements.length})</span>
        </button>
        <button type="button" role="tab" aria-selected={tab === "events"} className={tab === "events" ? "is-active" : ""} onClick={() => setTab("events")}>
          {t("Événements", "Events")}
          <span>({events.length})</span>
        </button>
      </div>

      {tab === "announcements" ? (
        announcements.length ? (
          <div className="jy-inbox">
            <aside className="jy-inbox-list">
              <label className="jy-inbox-search">
                <AdminLineIcon name="search" />
                <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t("Rechercher une annonce…", "Search an announcement…")} />
              </label>
              <div className="jy-inbox-items">
                {visibleAnnouncements.length ? (
                  visibleAnnouncements.map((item) => (
                    <button type="button" key={item.id} className={`jy-inbox-item ${selected?.id === item.id ? "is-active" : ""}`} onClick={() => setSelectedId(item.id)}>
                      <span className="jy-inbox-icon">
                        <AdminLineIcon name={item.promotionId ? "layers" : "accounts"} />
                      </span>
                      <span className="jy-inbox-text">
                        <span className="jy-inbox-row">
                          <strong>{audienceLabel(item.promotionId)}</strong>
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
                      {t("Public", "Audience")} : {audienceLabel(selected.promotionId)} · {formatDateTime(selected.createdAt, language)}
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
                <div className="jy-inbox-actions">
                  <button type="button" className="jy-btn jy-btn-outline jy-btn-sm" onClick={() => openCompose({ subject: selected.subject, message: selected.message || "", promotionId: selected.promotionId || "" })}>
                    <AdminLineIcon name="send" />
                    {t("Renvoyer une annonce similaire", "Send a similar announcement")}
                  </button>
                </div>
              </article>
            ) : null}
          </div>
        ) : (
          <div className="jy-card jy-empty-block">
            <span className="jy-empty-icon">
              <AdminLineIcon name="announcements" />
            </span>
            <strong>{t("Aucune annonce envoyée pour l'instant", "No announcement sent yet")}</strong>
            <span>{t("Écrivez à tous vos étudiants ou à une seule promotion : l'e-mail part via le serveur de la plateforme.", "Write to all your students or one promotion: the email is sent through the platform's server.")}</span>
            <button type="button" className="jy-btn jy-btn-primary jy-btn-sm" onClick={() => openCompose()}>
              <AdminLineIcon name="plus" />
              {t("Nouvelle annonce", "New announcement")}
            </button>
          </div>
        )
      ) : (
        <div className="jy-events">
          <div className="jy-card">
            <div className="jy-card-head">
              <h3>{t("À venir", "Upcoming")}</h3>
              <span className="jy-count-badge">{upcoming.length}</span>
            </div>
            {upcoming.length ? (
              <div className="jy-event-list">{upcoming.map((item) => renderEvent(item))}</div>
            ) : (
              <div className="jy-empty-block compact">
                <span className="jy-empty-icon">
                  <AdminLineIcon name="calendar" />
                </span>
                <strong>{t("Aucun événement programmé", "No event scheduled")}</strong>
                <span>{t("Ajoutez une date pour informer vos étudiants de ce qui arrive.", "Add a date to let your students know what's coming.")}</span>
                <button type="button" className="jy-btn jy-btn-primary jy-btn-sm" onClick={openEvent}>
                  <AdminLineIcon name="plus" />
                  {t("Nouvel événement", "New event")}
                </button>
              </div>
            )}
          </div>
          {past.length ? (
            <div className="jy-card">
              <div className="jy-card-head">
                <h3>{t("Passés", "Past")}</h3>
                <button type="button" className="jy-link" onClick={() => setShowPast((value) => !value)}>
                  {showPast ? t("Masquer", "Hide") : t(`Afficher (${past.length})`, `Show (${past.length})`)}
                </button>
              </div>
              {showPast ? <div className="jy-event-list">{past.map((item) => renderEvent(item, true))}</div> : null}
            </div>
          ) : null}
        </div>
      )}

      {/* ------------------------------------------------ Rédiger une annonce */}
      <MfaDialog
        open={composeOpen}
        onClose={() => !sending && setComposeOpen(false)}
        icon="send"
        title={t("Nouvelle annonce", "New announcement")}
        description={t("L'e-mail est envoyé immédiatement aux étudiants choisis.", "The email is sent right away to the chosen students.")}
        width={600}
        footer={
          <>
            <button type="button" className="mfa-btn ghost" onClick={() => setComposeOpen(false)} disabled={sending}>
              {t("Annuler", "Cancel")}
            </button>
            <button type="button" className="mfa-btn primary" onClick={sendAnnouncement} disabled={sending}>
              {sending ? <span className="mfa-spinner" /> : <AdminLineIcon name="send" />}
              {t("Envoyer", "Send")}
            </button>
          </>
        }
      >
        <MfaError message={composeError} />
        <label className="mfa-field">
          <span>{t("Destinataires", "Recipients")}</span>
          <select value={draft.promotionId} onChange={(event) => setDraft({ ...draft, promotionId: event.target.value })}>
            <option value="">{t("Tous les étudiants", "All students")}</option>
            {promotions.map((promo) => (
              <option key={promo.id} value={promo.id}>
                {promo.name} ({promo.studentCount ?? (promo.studentIds || []).length})
              </option>
            ))}
          </select>
        </label>
        <label className={`mfa-field ${draftTouched && subjectError ? "has-error" : ""}`}>
          <span>{t("Objet", "Subject")}</span>
          <input maxLength={140} value={draft.subject} placeholder={t("Ex. Forum entreprises le 12 octobre", "e.g. Career fair on October 12")} onChange={(event) => setDraft({ ...draft, subject: event.target.value })} />
          {draftTouched && subjectError ? <small className="jy-field-error">{subjectError}</small> : <small>{draft.subject.length} / 140</small>}
        </label>
        <label className={`mfa-field ${draftTouched && messageError ? "has-error" : ""}`}>
          <span>{t("Message", "Message")}</span>
          <textarea rows={7} className="jy-textarea" value={draft.message} placeholder={t("Votre message aux étudiants…", "Your message to students…")} onChange={(event) => setDraft({ ...draft, message: event.target.value })} />
          {draftTouched && messageError ? <small className="jy-field-error">{messageError}</small> : null}
        </label>
      </MfaDialog>

      {/* ------------------------------------------------ Nouvel événement */}
      <MfaDialog
        open={eventOpen}
        onClose={() => !savingEvent && setEventOpen(false)}
        icon="calendar"
        title={t("Nouvel événement", "New event")}
        description={t("Forum emploi, date limite de candidature, atelier…", "Job fair, application deadline, workshop…")}
        width={520}
        footer={
          <>
            <button type="button" className="mfa-btn ghost" onClick={() => setEventOpen(false)} disabled={savingEvent}>
              {t("Annuler", "Cancel")}
            </button>
            <button type="button" className="mfa-btn primary" onClick={saveEvent} disabled={savingEvent}>
              {savingEvent ? <span className="mfa-spinner" /> : null}
              {t("Ajouter l'événement", "Add event")}
            </button>
          </>
        }
      >
        <MfaError message={eventError} />
        <label className={`mfa-field ${eventTouched && eventTitleError ? "has-error" : ""}`}>
          <span>{t("Titre", "Title")}</span>
          <input autoFocus maxLength={120} value={eventForm.title} placeholder={t("Ex. Forum entreprises", "e.g. Career fair")} onChange={(event) => setEventForm({ ...eventForm, title: event.target.value })} />
          {eventTouched && eventTitleError ? <small className="jy-field-error">{eventTitleError}</small> : null}
        </label>
        <label className={`mfa-field ${eventTouched && eventDateError ? "has-error" : ""}`}>
          <span>{t("Date", "Date")}</span>
          <input type="date" min={todayIso} value={eventForm.eventDate} onChange={(event) => setEventForm({ ...eventForm, eventDate: event.target.value })} />
          {eventTouched && eventDateError ? <small className="jy-field-error">{eventDateError}</small> : null}
        </label>
        <label className="mfa-field">
          <span>{t("Description (facultatif)", "Description (optional)")}</span>
          <textarea rows={4} className="jy-textarea" value={eventForm.description} placeholder={t("Lieu, horaires, informations utiles…", "Place, times, useful information…")} onChange={(event) => setEventForm({ ...eventForm, description: event.target.value })} />
        </label>
      </MfaDialog>
    </section>
  );
}
