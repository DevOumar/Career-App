import React from "react";
// Module Candidatures : suivi en kanban (À postuler / Postulé / Entretien /
// Offre / Refusé), ajout manuel via ApplicationFormModal, glisser-déposer
// pour changer de statut avec toast de félicitations adapté.
import { useState, useEffect } from "react";
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

const APPLICATION_COLUMNS = ["to_apply", "applied", "interview", "offer", "rejected"];

function ApplicationsPage({ language, userId, cvHistory }) {
  const copy = APPLICATIONS_COPY[language] || APPLICATIONS_COPY.fr;
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

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
    setItems((prev) => prev.map((it) => (it.id === item.id ? { ...it, status } : it)));
    try {
      await updateJobApplication(item.id, { userId, status });
      const template = copy[STATUS_MESSAGE_KEYS[status]];
      if (template) {
        Swal.fire({
          toast: true,
          position: "top-end",
          icon: STATUS_TOAST_ICONS[status] || "success",
          title: fillTemplate(template, { title: item.title || "—", company: item.company || "—" }),
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
      setItems((prev) => prev.map((it) => (it.id === item.id ? { ...it, status: previousStatus } : it)));
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
      confirmButtonColor: "#dc2626"
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

  return (
    <section className="applications-page">
      <div className="applications-header">
        <div>
          <h2>{copy.title}</h2>
          <p className="muted">{copy.text}</p>
        </div>
        <button
          type="button"
          className="btn-main ready"
          onClick={() => {
            setEditingItem(null);
            setFormOpen(true);
          }}
        >
          <UiIcon name="plus" /> {copy.addButton}
        </button>
      </div>

      {isLoading ? (
        <div className="extracting-state">
          <div className="loader-ring" />
          <span>{copy.loading}</span>
        </div>
      ) : (
        <div className="kanban-board">
          {APPLICATION_COLUMNS.map((columnKey) => {
            const columnItems = items.filter((item) => item.status === columnKey);
            return (
              <div
                key={columnKey}
                className="kanban-column"
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                  event.preventDefault();
                  const id = event.dataTransfer.getData("text/plain");
                  const item = items.find((it) => it.id === id);
                  if (item) handleStatusChange(item, columnKey);
                }}
              >
                <div className="kanban-column-head">
                  <span>{columnLabels[columnKey]}</span>
                  <span className="kanban-count">{columnItems.length}</span>
                </div>
                <div className="kanban-column-body">
                  {columnItems.length ? (
                    columnItems.map((item) => (
                      <article
                        key={item.id}
                        className="kanban-card"
                        draggable
                        onDragStart={(event) => event.dataTransfer.setData("text/plain", item.id)}
                      >
                        <div className="kanban-card-head">
                          <strong>{item.title || "—"}</strong>
                          {typeof item.matchScore === "number" ? <span className="kanban-score">{item.matchScore}%</span> : null}
                        </div>
                        {item.company ? <p className="kanban-company">{item.company}</p> : null}
                        {item.location ? <p className="kanban-location">{item.location}</p> : null}
                        <p className="kanban-date">
                          {item.status === "applied" && item.appliedAt
                            ? `${copy.appliedAtLabel} ${formatShortDate(item.appliedAt, language)}`
                            : `${copy.addedOnLabel} ${formatShortDate(item.createdAt, language)}`}
                        </p>
                        <div className="kanban-card-actions">
                          {item.offerUrl ? (
                            <a href={item.offerUrl} target="_blank" rel="noreferrer" title={copy.cardOpenOffer}>
                              <UiIcon name="chevron" />
                            </a>
                          ) : null}
                          <button
                            type="button"
                            title={copy.edit}
                            onClick={() => {
                              setEditingItem(item);
                              setFormOpen(true);
                            }}
                          >
                            <UiIcon name="edit" />
                          </button>
                          <button type="button" title={copy.delete} onClick={() => handleDelete(item)}>
                            <UiIcon name="trash" />
                          </button>
                        </div>
                      </article>
                    ))
                  ) : (
                    <p className="kanban-empty muted">{copy.empty}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {formOpen ? (
        <ApplicationFormModal
          copy={copy}
          item={editingItem}
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

function ApplicationFormModal({ copy, item, cvHistory, onClose, onSubmit }) {
  const [form, setForm] = useState({
    title: item?.title || "",
    company: item?.company || "",
    location: item?.location || "",
    offerUrl: item?.offerUrl || "",
    cvId: item?.cvId || "",
    notes: item?.notes || "",
    status: item?.status || "to_apply"
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  function update(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!form.title.trim() && !form.company.trim()) {
      setError(copy.formError);
      return;
    }
    setError("");
    setSaving(true);
    try {
      await onSubmit(form);
    } catch (err) {
      setError(err?.message || copy.formError);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(event) => event.stopPropagation()}>
        <form onSubmit={handleSubmit} className="application-form">
          <input
            value={form.title}
            onChange={(event) => update("title", event.target.value)}
            placeholder={copy.formTitlePlaceholder}
          />
          <input
            value={form.company}
            onChange={(event) => update("company", event.target.value)}
            placeholder={copy.formCompanyPlaceholder}
          />
          <input
            value={form.location}
            onChange={(event) => update("location", event.target.value)}
            placeholder={copy.formLocationPlaceholder}
          />
          <input
            value={form.offerUrl}
            onChange={(event) => update("offerUrl", event.target.value)}
            placeholder={copy.formUrlPlaceholder}
          />
          <label>
            {copy.formCvLabel}
            <select value={form.cvId} onChange={(event) => update("cvId", event.target.value)}>
              <option value="">{copy.formCvNone}</option>
              {(cvHistory || []).map((cv) => (
                <option key={cv.id} value={cv.id}>
                  {cv.fileName} · {new Date(cv.createdAt).toLocaleDateString()}
                </option>
              ))}
            </select>
          </label>
          <textarea
            rows={3}
            value={form.notes}
            onChange={(event) => update("notes", event.target.value)}
            placeholder={copy.notesPlaceholder}
          />
          {error ? <p className="field-error">{error}</p> : null}
          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>
              {copy.formCancel}
            </button>
            <button type="submit" className="btn-main ready" disabled={saving}>
              {saving ? copy.formSaving : copy.formSave}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ApplicationsPage;
