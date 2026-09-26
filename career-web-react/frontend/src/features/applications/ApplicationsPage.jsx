import React from "react";
// Module Candidatures : suivi en kanban (À postuler / Postulé / Entretien /
// Offre / Refusé), ajout manuel via ApplicationFormModal, glisser-déposer
// pour changer de statut avec toast de félicitations adapté.
import { useState, useEffect, useRef } from "react";
import Swal from "sweetalert2";
import { UiIcon } from "../../components/UiIcon.jsx";
import { fillTemplate, formatShortDate } from "../../lib/format.js";
import {
  listJobApplications,
  createJobApplication,
  updateJobApplication,
  deleteJobApplication
} from "../../lib/inMemoryDb.js";
import { APPLICATIONS_COPY } from "./applicationsCopy.js";
import { ModuleHero, ApplicationsHeroArt } from "../../components/ModuleWorkspace.jsx";

const APPLICATION_COLUMNS = ["to_apply", "applied", "interview", "offer", "rejected"];

function ApplicationsPage({ language, userId, cvHistory }) {
  const copy = APPLICATIONS_COPY[language] || APPLICATIONS_COPY.fr;
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [dragOverColumn, setDragOverColumn] = useState("");

  useEffect(() => {
    let cancelled = false;
    if (!userId) {
      setItems([]);
      setIsLoading(false);
      return undefined;
    }
    setIsLoading(true);
    listJobApplications(userId)
      .then((list) => {
        if (!cancelled) setItems(list || []);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const STATUS_MESSAGE_KEYS = {
    to_apply: "statusMessageToApply",
    applied: "statusMessageApplied",
    interview: "statusMessageInterview",
    offer: "statusMessageOffer",
    rejected: "statusMessageRejected"
  };
  const STATUS_TOAST_ICONS = {
    to_apply: "info",
    applied: "success",
    interview: "success",
    offer: "success",
    rejected: "info"
  };

  async function handleStatusChange(item, status) {
    if (item.status === status) return;
    const previousStatus = item.status;
    const patch = { status };
    if (status !== "to_apply" && !item.appliedAt) patch.appliedAt = new Date().toISOString().slice(0, 10);
    setItems((prev) => prev.map((it) => (it.id === item.id ? { ...it, ...patch } : it)));
    try {
      await updateJobApplication(item.id, { userId, ...patch });
      const template = copy[STATUS_MESSAGE_KEYS[status]];
      if (template) {
        Swal.fire({
          toast: true,
          position: "top-end",
          icon: STATUS_TOAST_ICONS[status] || "success",
          title: fillTemplate(template, { title: item.title || "-", company: item.company || "-" }),
          showConfirmButton: false,
          timer: 3800,
          timerProgressBar: true,
          customClass: {
            popup: "career-toast",
            title: "career-toast-title"
          }
        });
      }
    } catch (_error) {
      setItems((prev) => prev.map((it) => (it.id === item.id ? item : it)));
    }
  }

  async function handleDelete(item) {
    const result = await Swal.fire({
      icon: "warning",
      title: copy.deleteConfirmTitle,
      text: [item.title, item.company].filter(Boolean).join(" · "),
      showCancelButton: true,
      confirmButtonText: copy.delete,
      cancelButtonText: copy.formCancel,
      confirmButtonColor: "#f5222d"
    });
    if (!result.isConfirmed) return;
    const previous = items;
    setItems((prev) => prev.filter((it) => it.id !== item.id));
    try {
      await deleteJobApplication({ id: item.id, userId });
    } catch (_error) {
      setItems(previous);
    }
  }

  async function handleSubmit(payload) {
    if (editingItem) {
      const updated = await updateJobApplication(editingItem.id, { userId, ...payload });
      setItems((prev) => prev.map((it) => (it.id === updated.id ? updated : it)));
    } else {
      const created = await createJobApplication({ userId, ...payload });
      setItems((prev) => [created, ...prev]);
    }
    setFormOpen(false);
    setEditingItem(null);
  }

  const columnLabels = {
    to_apply: copy.columnToApply,
    applied: copy.columnApplied,
    interview: copy.columnInterview,
    offer: copy.columnOffer,
    rejected: copy.columnRejected
  };

  // Indicateurs calculés sur les vraies candidatures de l'utilisateur.
  const countBy = (status) => items.filter((item) => item.status === status).length;
  const sentCount = countBy("applied") + countBy("interview") + countBy("offer") + countBy("rejected");
  const answeredCount = countBy("interview") + countBy("offer") + countBy("rejected");
  const responseRate = sentCount ? Math.round((answeredCount / sentCount) * 100) : null;
  const today = new Date().toISOString().slice(0, 10);
  const inSevenDays = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const openItems = items.filter((item) => item.status !== "offer" && item.status !== "rejected" && item.nextActionAt);
  const overdueCount = openItems.filter((item) => String(item.nextActionAt).slice(0, 10) < today).length;
  const upcomingCount = openItems.filter((item) => {
    const day = String(item.nextActionAt).slice(0, 10);
    return day >= today && day <= inSevenDays;
  }).length;

  const kpis = [
    { id: "total", icon: "briefcase", value: items.length, label: copy.kpiTotal },
    { id: "progress", icon: "chart", value: countBy("applied") + countBy("interview"), label: copy.kpiInProgress },
    { id: "interview", icon: "chat", value: countBy("interview"), label: copy.kpiInterviews },
    { id: "rate", icon: "thumbUp", value: responseRate === null ? "—" : `${responseRate} %`, label: copy.kpiResponseRate, hint: copy.kpiResponseRateHint }
  ];

  function openCreate() {
    setEditingItem(null);
    setFormOpen(true);
  }

  function logoColor(name) {
    const palette = ["#b83309", "#4b3fd6", "#237804", "#0958d9", "#c41d7f", "#d46b08"];
    let hash = 0;
    for (const char of String(name || "?")) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
    return palette[hash % palette.length];
  }

  return (
    <section className="applications-page ap-page">
      <ModuleHero
        eyebrow={copy.heroEyebrow}
        title={copy.title}
        subtitle={copy.text}
        art={<ApplicationsHeroArt />}
      />

      <div className="ap-toolbar">
        <div className="ap-kpis">
          {kpis.map((kpi) => (
            <div key={kpi.id} className={`ap-kpi kpi-${kpi.id}`} title={kpi.hint || undefined}>
              <span className="ap-kpi-icon">
                <UiIcon name={kpi.icon} />
              </span>
              <div>
                <strong>{kpi.value}</strong>
                <small>{kpi.label}</small>
              </div>
            </div>
          ))}
        </div>
        <button type="button" className="btn-main ready ap-add" onClick={openCreate}>
          <UiIcon name="plus" /> {copy.addButton}
        </button>
      </div>

      {overdueCount || upcomingCount ? (
        <p className={`ap-reminder ${overdueCount ? "is-late" : ""}`}>
          <UiIcon name="bell" />
          {[
            overdueCount ? copy.remindersOverdue.replace("{count}", overdueCount) : "",
            upcomingCount ? copy.remindersUpcoming.replace("{count}", upcomingCount) : ""
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
      ) : null}

      {isLoading ? (
        <div className="extracting-state">
          <div className="loader-ring" />
          <span>{copy.loading}</span>
        </div>
      ) : (
        <div className="kanban-board ap-board">
          {APPLICATION_COLUMNS.map((columnKey) => {
            const columnItems = items.filter((item) => item.status === columnKey);
            return (
              <div
                key={columnKey}
                className={`kanban-column ap-column status-${columnKey} ${dragOverColumn === columnKey ? "is-over" : ""}`}
                onDragOver={(event) => {
                  event.preventDefault();
                  if (dragOverColumn !== columnKey) setDragOverColumn(columnKey);
                }}
                onDragLeave={(event) => {
                  if (!event.currentTarget.contains(event.relatedTarget)) setDragOverColumn("");
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  setDragOverColumn("");
                  const id = event.dataTransfer.getData("text/plain");
                  const item = items.find((it) => it.id === id);
                  if (item) handleStatusChange(item, columnKey);
                }}
              >
                <div className="kanban-column-head">
                  <span className="ap-column-name">
                    <i />
                    {columnLabels[columnKey]}
                  </span>
                  <span className="kanban-count">{columnItems.length}</span>
                </div>
                <div className="kanban-column-body">
                  {columnItems.map((item) => {
                    const offerHref = safeOfferHref(item.offerUrl);
                    const nextDay = item.nextActionAt ? String(item.nextActionAt).slice(0, 10) : "";
                    const isLate = nextDay && nextDay < today && item.status !== "offer" && item.status !== "rejected";
                    const scoreTier =
                      typeof item.matchScore === "number"
                        ? item.matchScore >= 75
                          ? "high"
                          : item.matchScore >= 50
                          ? "mid"
                          : "low"
                        : "";
                    return (
                      <article
                        key={item.id}
                        className="kanban-card ap-card"
                        draggable
                        onDragStart={(event) => event.dataTransfer.setData("text/plain", item.id)}
                        onDragEnd={() => setDragOverColumn("")}
                      >
                        <div className="ap-card-top">
                          <span className="ap-logo" style={{ background: logoColor(item.company || item.title) }}>
                            {(item.company || item.title || "?").trim().charAt(0).toUpperCase()}
                          </span>
                          {scoreTier ? (
                            <span className={`ap-score tier-${scoreTier}`} title={copy.matchScoreLabel}>
                              {item.matchScore}%
                            </span>
                          ) : null}
                        </div>
                        <strong className="ap-title" title={item.title}>
                          {item.title || "-"}
                        </strong>
                        {item.company || (item.location && item.location !== "Non précisé") ? (
                          <p className="ap-company">
                            {[item.company, item.location && item.location !== "Non précisé" ? item.location : ""].filter(Boolean).join(" · ")}
                          </p>
                        ) : null}
                        <div className="ap-meta">
                          <span>
                            {item.appliedAt && item.status !== "to_apply"
                              ? `${copy.appliedAtLabel} ${formatShortDate(item.appliedAt, language)}`
                              : `${copy.addedOnLabel} ${formatShortDate(item.createdAt, language)}`}
                          </span>
                          {nextDay && item.status !== "offer" && item.status !== "rejected" ? (
                            <span className={`ap-followup ${isLate ? "is-late" : ""}`}>
                              <UiIcon name="bell" />
                              {isLate ? copy.followUpLate : `${copy.followUpOn} ${formatShortDate(item.nextActionAt, language)}`}
                            </span>
                          ) : null}
                        </div>
                        <div className="kanban-card-actions ap-actions">
                          {offerHref ? (
                            <a href={offerHref} target="_blank" rel="noopener noreferrer" title={copy.cardOpenOffer} aria-label={copy.cardOpenOffer}>
                              <UiIcon name="share" />
                            </a>
                          ) : null}
                          <button
                            type="button"
                            title={copy.edit}
                            aria-label={copy.edit}
                            onClick={() => {
                              setEditingItem(item);
                              setFormOpen(true);
                            }}
                          >
                            <UiIcon name="edit" />
                          </button>
                          <button type="button" title={copy.delete} aria-label={copy.delete} onClick={() => handleDelete(item)}>
                            <UiIcon name="trash" />
                          </button>
                        </div>
                      </article>
                    );
                  })}
                  {!columnItems.length ? (
                    <div className="ap-drop-empty">
                      <UiIcon name={columnKey === "to_apply" ? "plus" : "briefcase"} />
                      <span>{columnKey === "to_apply" && !items.length ? copy.emptyFirst : copy.dropHint}</span>
                      {columnKey === "to_apply" && !items.length ? (
                        <button type="button" className="link-button" onClick={openCreate}>
                          {copy.addButton}
                        </button>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {formOpen ? (
        <ApplicationFormModal
          copy={copy}
          language={language}
          item={editingItem}
          items={items}
          cvHistory={cvHistory}
          onClose={() => {
            setFormOpen(false);
            setEditingItem(null);
          }}
          onSubmit={handleSubmit}
        />
      ) : null}
    </section>
  );
}

const APPLICATION_FIELD_LIMITS = { title: 160, company: 160, location: 160, offerUrl: 2048, notes: 5000 };

function normalizeText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

// "www.site.fr/offre" -> "https://www.site.fr/offre" ; renvoie "" si invalide.
function normalizeOfferUrl(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(raw) ? raw : `https://${raw}`;
  try {
    const url = new URL(withScheme);
    if (!["http:", "https:"].includes(url.protocol) || !url.hostname.includes(".")) return "";
    return url.toString();
  } catch (_error) {
    return "";
  }
}

export function safeOfferHref(value) {
  return /^https?:\/\//i.test(String(value || "")) ? value : "";
}

function toDateInput(value) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
}

function todayInput() {
  return new Date().toISOString().slice(0, 10);
}

function ApplicationFormModal({ copy, language, item, items, cvHistory, onClose, onSubmit }) {
  const [form, setForm] = useState({
    title: item?.title || "",
    company: item?.company || "",
    location: item?.location && item.location !== "Non précisé" ? item.location : "",
    offerUrl: item?.offerUrl || "",
    cvId: item?.cvId || "",
    notes: item?.notes || "",
    status: item?.status || "to_apply",
    appliedAt: toDateInput(item?.appliedAt),
    nextActionAt: toDateInput(item?.nextActionAt)
  });
  const [touched, setTouched] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [duplicateAcknowledged, setDuplicateAcknowledged] = useState(false);
  const firstFieldRef = useRef(null);

  useEffect(() => {
    firstFieldRef.current?.focus();
  }, []);

  useEffect(() => {
    function onKeyDown(event) {
      if (event.key === "Escape" && !saving) onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [saving, onClose]);

  function update(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (key === "title" || key === "company") setDuplicateAcknowledged(false);
    setError("");
  }

  const cvIds = new Set((cvHistory || []).map((cv) => cv.id));
  const errors = {};
  if (!form.title.trim() && !form.company.trim()) {
    errors.title = copy.formErrorTitleOrCompany;
  }
  for (const [field, max] of Object.entries(APPLICATION_FIELD_LIMITS)) {
    if (form[field].trim().length > max) errors[field] = copy.formErrorTooLong.replace("{max}", max);
  }
  if (form.offerUrl.trim() && !normalizeOfferUrl(form.offerUrl)) {
    errors.offerUrl = copy.formErrorUrl;
  }
  if (form.appliedAt && form.appliedAt > todayInput()) {
    errors.appliedAt = copy.formErrorAppliedFuture;
  }
  if (form.nextActionAt && form.appliedAt && form.nextActionAt < form.appliedAt) {
    errors.nextActionAt = copy.formErrorNextBeforeApplied;
  }
  if (form.cvId && !cvIds.has(form.cvId)) {
    errors.cvId = copy.formErrorCv;
  }

  const duplicate = (items || []).find(
    (other) =>
      other.id !== item?.id &&
      normalizeText(other.title) === normalizeText(form.title) &&
      normalizeText(other.company) === normalizeText(form.company) &&
      (form.title.trim() || form.company.trim())
  );

  const show = (field) => (submitted || touched[field]) && errors[field];
  const blur = (field) => () => setTouched((prev) => ({ ...prev, [field]: true }));

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitted(true);
    if (saving || Object.keys(errors).length) return;
    if (duplicate && !duplicateAcknowledged) {
      setDuplicateAcknowledged(true);
      return;
    }
    setError("");
    setSaving(true);
    try {
      await onSubmit(
        {
          title: form.title.trim(),
          company: form.company.trim(),
          location: form.location.trim(),
          offerUrl: normalizeOfferUrl(form.offerUrl),
          cvId: form.cvId,
          notes: form.notes.trim(),
          status: form.status,
          appliedAt: form.appliedAt || (form.status !== "to_apply" && !item?.appliedAt ? todayInput() : form.appliedAt),
          nextActionAt: form.nextActionAt
        }
      );
    } catch (err) {
      setError(err?.message || copy.formErrorGeneric);
      setSaving(false);
    }
  }

  const statusOptions = [
    ["to_apply", copy.columnToApply],
    ["applied", copy.columnApplied],
    ["interview", copy.columnInterview],
    ["offer", copy.columnOffer],
    ["rejected", copy.columnRejected]
  ];
  const locale = language === "en" ? "en-GB" : "fr-FR";

  return (
    <div className="modal-overlay" onClick={() => !saving && onClose()}>
      <div
        className="modal-card app-form-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="app-form-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="app-form-head">
          <span className="app-form-head-icon">
            <UiIcon name={item ? "edit" : "briefcase"} />
          </span>
          <div>
            <h3 id="app-form-title">{item ? copy.formEditTitle : copy.formNewTitle}</h3>
            <p>{copy.formSubtitle}</p>
          </div>
          <button type="button" className="app-form-close" onClick={onClose} disabled={saving} aria-label={copy.formCancel}>
            <svg viewBox="0 0 20 20" aria-hidden="true">
              <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
        </header>

        <form onSubmit={handleSubmit} className="app-form" noValidate>
          <div className="app-form-grid">
            <label className={`app-field ${show("title") ? "has-error" : ""}`}>
              <span>
                {copy.formTitleLabel} <em>*</em>
              </span>
              <input
                ref={firstFieldRef}
                value={form.title}
                maxLength={APPLICATION_FIELD_LIMITS.title}
                onChange={(event) => update("title", event.target.value)}
                onBlur={blur("title")}
                placeholder={copy.formTitlePlaceholder}
                aria-invalid={Boolean(show("title"))}
              />
            </label>
            <label className="app-field">
              <span>
                {copy.formCompanyLabel} <em>*</em>
              </span>
              <input
                value={form.company}
                maxLength={APPLICATION_FIELD_LIMITS.company}
                onChange={(event) => update("company", event.target.value)}
                onBlur={blur("title")}
                placeholder={copy.formCompanyPlaceholder}
                aria-invalid={Boolean(show("title"))}
              />
            </label>
            {show("title") ? <small className="app-field-error app-form-full">{errors.title}</small> : <small className="app-field-hint app-form-full">{copy.formTitleHint}</small>}

            <label className="app-field">
              <span>{copy.formLocationLabel}</span>
              <input
                value={form.location}
                maxLength={APPLICATION_FIELD_LIMITS.location}
                onChange={(event) => update("location", event.target.value)}
                placeholder={copy.formLocationPlaceholder}
              />
            </label>
            <label className="app-field">
              <span>{copy.formStatusLabel}</span>
              <select value={form.status} onChange={(event) => update("status", event.target.value)}>
                {statusOptions.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>

            <label className={`app-field app-form-full ${show("offerUrl") ? "has-error" : ""}`}>
              <span>{copy.formUrlLabel}</span>
              <input
                type="url"
                inputMode="url"
                value={form.offerUrl}
                maxLength={APPLICATION_FIELD_LIMITS.offerUrl}
                onChange={(event) => update("offerUrl", event.target.value)}
                onBlur={blur("offerUrl")}
                placeholder="https://"
                aria-invalid={Boolean(show("offerUrl"))}
              />
              {show("offerUrl") ? <small className="app-field-error">{errors.offerUrl}</small> : null}
            </label>

            <label className={`app-field ${show("appliedAt") ? "has-error" : ""}`}>
              <span>{copy.formAppliedLabel}</span>
              <input
                type="date"
                value={form.appliedAt}
                max={todayInput()}
                onChange={(event) => update("appliedAt", event.target.value)}
                onBlur={blur("appliedAt")}
                aria-invalid={Boolean(show("appliedAt"))}
              />
              {show("appliedAt") ? <small className="app-field-error">{errors.appliedAt}</small> : null}
            </label>
            <label className={`app-field ${show("nextActionAt") ? "has-error" : ""}`}>
              <span>{copy.formNextActionLabel}</span>
              <input
                type="date"
                value={form.nextActionAt}
                min={form.appliedAt || undefined}
                onChange={(event) => update("nextActionAt", event.target.value)}
                onBlur={blur("nextActionAt")}
                aria-invalid={Boolean(show("nextActionAt"))}
              />
              {show("nextActionAt") ? <small className="app-field-error">{errors.nextActionAt}</small> : null}
            </label>

            <label className={`app-field app-form-full ${show("cvId") ? "has-error" : ""}`}>
              <span>{copy.formCvLabel}</span>
              <select value={form.cvId} onChange={(event) => update("cvId", event.target.value)}>
                <option value="">{copy.formCvNone}</option>
                {(cvHistory || []).map((cv) => (
                  <option key={cv.id} value={cv.id}>
                    {cv.fileName} · {new Date(cv.createdAt).toLocaleDateString(locale)}
                  </option>
                ))}
              </select>
              {show("cvId") ? <small className="app-field-error">{errors.cvId}</small> : null}
            </label>

            <label className={`app-field app-form-full ${show("notes") ? "has-error" : ""}`}>
              <span className="app-field-label-row">
                {copy.formNotesLabel}
                <small>
                  {form.notes.length} / {APPLICATION_FIELD_LIMITS.notes}
                </small>
              </span>
              <textarea
                rows={3}
                value={form.notes}
                maxLength={APPLICATION_FIELD_LIMITS.notes}
                onChange={(event) => update("notes", event.target.value)}
                placeholder={copy.notesPlaceholder}
              />
            </label>
          </div>

          {duplicate && duplicateAcknowledged && !error ? (
            <p className="app-form-banner warn" role="status">
              <UiIcon name="alert" />
              {copy.formDuplicateWarning}
            </p>
          ) : null}
          {error ? (
            <p className="app-form-banner error" role="alert">
              <UiIcon name="alert" />
              {error}
            </p>
          ) : null}

          <div className="modal-actions app-form-actions">
            <button type="button" className="btn-secondary" onClick={onClose} disabled={saving}>
              {copy.formCancel}
            </button>
            <button type="submit" className="btn-main ready" disabled={saving}>
              {saving ? copy.formSaving : duplicate && duplicateAcknowledged ? copy.formSaveAnyway : copy.formSave}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ApplicationsPage;
