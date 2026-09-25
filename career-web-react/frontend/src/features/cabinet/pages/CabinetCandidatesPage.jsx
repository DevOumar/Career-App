import React from "react";
import { useState, useEffect, useRef } from "react";
import Swal from "sweetalert2";
import { UiIcon } from "../../../components/UiIcon.jsx";
import { ExportCsvButton } from "../../../components/AdminExportCsvButton.jsx";
import { getFriendlyErrorMessage } from "../../../lib/errors.js";
import { formatDate } from "../../../lib/format.js";
import {
  createCabinetCandidate,
  updateCabinetCandidate,
  deleteCabinetCandidate,
  getCabinetCandidates,
  extractCabinetCandidateCv,
  getCabinetCandidateNotes,
  addCabinetCandidateNote,
  deleteCabinetCandidateNote
} from "../../../lib/inMemoryDb.js";
import { fileToBase64 } from "../../../lib/cvService.js";
import { CabinetEmptyState } from "./CabinetEmptyState.jsx";
import { cabinetToast } from "./cabinetToast.js";

const STATUSES = ["sourced", "contacted", "interviewing", "placed", "rejected"];

export default function CabinetCandidatesPage({ user, language }) {
  const copy =
    language === "en"
      ? {
          title: "Candidate pool",
          subtitle: "Every candidate your team has sourced or evaluated for client missions.",
          search: "Search by name, email, skill…",
          allStatuses: "All statuses",
          allSkills: "All skills",
          statusLabels: { sourced: "Sourced", contacted: "Contacted", interviewing: "Interviewing", placed: "Placed", rejected: "Rejected" },
          followUpOnly: "Follow-up due",
          add: "Add a candidate",
          empty: "No candidate added yet.",
          emptyHint: "Add your first candidate manually, or import a CV to prefill the form with AI.",
          edit: "Edit",
          delete: "Delete",
          deleteConfirmTitle: "Delete this candidate?",
          deleteConfirmBtn: "Delete",
          cancel: "Cancel",
          formTitle: "Candidate",
          firstName: "First name",
          lastName: "Last name",
          email: "Email",
          phone: "Phone",
          headline: "Headline / target role",
          skills: "Skills (comma-separated)",
          notes: "Notes",
          status: "Status",
          followUpDate: "Follow-up reminder",
          save: "Save",
          formError: "First or last name required.",
          uploadCv: "Import a CV (AI-filled)",
          extracting: "Reading CV…",
          extractError: "Could not read this CV. Try another file, or fill the form manually.",
          extractedFrom: (name) => `Prefilled from ${name}`,
          duplicateTitle: "Possible duplicate",
          duplicateText: (name) => `A candidate named ${name} already has this email or phone. Add anyway?`,
          duplicateConfirm: "Add anyway",
          followUpBadge: "Follow-up due",
          notesTitle: "History",
          notesEmpty: "No note yet.",
          notesPlaceholder: "Add a note (call, feedback…)",
          notesAdd: "Add",
          history: "History",
          hideHistory: "Hide history"
        }
      : {
          title: "Vivier de candidats",
          subtitle: "Tous les candidats que votre équipe a sourcés ou évalués pour des missions clients.",
          search: "Rechercher par nom, email, compétence…",
          allStatuses: "Tous les statuts",
          allSkills: "Toutes les compétences",
          statusLabels: { sourced: "Sourcé", contacted: "Contacté", interviewing: "En entretien", placed: "Placé", rejected: "Écarté" },
          followUpOnly: "Relance à faire",
          add: "Ajouter un candidat",
          empty: "Aucun candidat ajouté pour l'instant.",
          emptyHint: "Ajoutez votre premier candidat à la main, ou importez un CV pour préremplir la fiche par IA.",
          edit: "Modifier",
          delete: "Supprimer",
          deleteConfirmTitle: "Supprimer ce candidat ?",
          deleteConfirmBtn: "Supprimer",
          cancel: "Annuler",
          formTitle: "Candidat",
          firstName: "Prénom",
          lastName: "Nom",
          email: "Email",
          phone: "Téléphone",
          headline: "Titre / poste visé",
          skills: "Compétences (séparées par des virgules)",
          notes: "Notes",
          status: "Statut",
          followUpDate: "Rappel de relance",
          save: "Enregistrer",
          formError: "Prénom ou nom requis.",
          uploadCv: "Importer un CV (préremplissage IA)",
          extracting: "Lecture du CV…",
          extractError: "Impossible de lire ce CV. Essayez un autre fichier, ou remplissez le formulaire à la main.",
          extractedFrom: (name) => `Préempli depuis ${name}`,
          duplicateTitle: "Doublon possible",
          duplicateText: (name) => `Un candidat nommé ${name} a déjà cet email ou ce téléphone. Ajouter quand même ?`,
          duplicateConfirm: "Ajouter quand même",
          followUpBadge: "Relance à faire",
          notesTitle: "Historique",
          notesEmpty: "Aucune note pour l'instant.",
          notesPlaceholder: "Ajouter une note (appel, retour…)",
          notesAdd: "Ajouter",
          history: "Historique",
          hideHistory: "Masquer l'historique"
        };

  const [data, setData] = useState(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [skill, setSkill] = useState("");
  const [followUpOnly, setFollowUpOnly] = useState(false);
  const [error, setError] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [expandedId, setExpandedId] = useState(null);

  function reload() {
    getCabinetCandidates(user.id, { search, status, skill, followUp: followUpOnly })
      .then(setData)
      .catch((err) => setError(getFriendlyErrorMessage(err, language)));
  }

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.id, search, status, skill, followUpOnly]);

  async function handleDelete(item) {
    const result = await Swal.fire({
      icon: "warning",
      title: copy.deleteConfirmTitle,
      text: `${item.firstName} ${item.lastName}`,
      showCancelButton: true,
      confirmButtonText: copy.deleteConfirmBtn,
      cancelButtonText: copy.cancel,
      confirmButtonColor: "#f5222d"
    });
    if (!result.isConfirmed) return;
    await deleteCabinetCandidate(user.id, item.id);
    reload();
  }

  async function handleFormSubmit(payload) {
    try {
      if (editingItem) {
        await updateCabinetCandidate(user.id, editingItem.id, payload);
      } else {
        await createCabinetCandidate(user.id, payload);
      }
    } catch (err) {
      if (err?.statusCode === 409 && err?.duplicate) {
        const result = await Swal.fire({
          icon: "warning",
          title: copy.duplicateTitle,
          text: copy.duplicateText(`${err.duplicate.firstName} ${err.duplicate.lastName}`),
          showCancelButton: true,
          confirmButtonText: copy.duplicateConfirm,
          cancelButtonText: copy.cancel
        });
        if (!result.isConfirmed) return;
        await createCabinetCandidate(user.id, { ...payload, force: "1" });
      } else {
        throw err;
      }
    }
    setFormOpen(false);
    setEditingItem(null);
    reload();
    cabinetToast({ title: language === "en" ? "Candidate saved." : "Candidat enregistré." });
  }

  return (
    <section className="cv-history-page cabinet-page">
      <div className="card block history-head">
        <div className="feature-page-header">
          <span className="feature-page-header-icon">
            <UiIcon name="network" />
          </span>
          <div>
            <h2>{copy.title}</h2>
            <p className="muted">{copy.subtitle}</p>
          </div>
        </div>
        <div className="cabinet-quick-actions">
          <ExportCsvButton userId={user.id} path="/cabinet/candidates/export" language={language} />
          <button type="button" className="btn-main ready" onClick={() => { setEditingItem(null); setFormOpen(true); }}>
            <UiIcon name="plus" /> {copy.add}
          </button>
        </div>
      </div>

      <div className="card block cabinet-filters-row">
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={copy.search} />
        <select value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="">{copy.allStatuses}</option>
          {STATUSES.map((item) => (
            <option key={item} value={item}>
              {copy.statusLabels[item]} ({data?.statusCounts?.[item] || 0})
            </option>
          ))}
        </select>
        {data?.availableSkills?.length ? (
          <select value={skill} onChange={(event) => setSkill(event.target.value)}>
            <option value="">{copy.allSkills}</option>
            {data.availableSkills.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
        ) : null}
        <label className="cabinet-checkbox-filter">
          <input type="checkbox" checked={followUpOnly} onChange={(event) => setFollowUpOnly(event.target.checked)} />
          {copy.followUpOnly}
        </label>
      </div>

      {error ? <p className="field-error">{error}</p> : null}

      {data?.items?.length ? (
        <div className="history-list">
          {data.items.map((item) => (
            <article className="history-card" key={item.id}>
              <div className="history-card-top">
                <div className="history-card-main">
                  <span className="history-card-icon">
                    <UiIcon name="profile" />
                  </span>
                  <div>
                    <h3>{item.firstName} {item.lastName}</h3>
                    <p>{item.headline || item.email || "-"}</p>
                  </div>
                </div>
                <div className="cabinet-card-badges">
                  {item.followUpDue ? <span className="tag tag-warning">{copy.followUpBadge}</span> : null}
                  <span className="tag">{copy.statusLabels[item.status] || item.status}</span>
                </div>
              </div>
              {item.skills?.length ? (
                <div className="job-chip-row history-skill-row">
                  {item.skills.slice(0, 8).map((s) => (
                    <span key={s}>{s}</span>
                  ))}
                </div>
              ) : null}
              <div className="history-card-stats">
                <button type="button" className="btn-ghost" onClick={() => { setEditingItem(item); setFormOpen(true); }}>
                  <UiIcon name="edit" /> {copy.edit}
                </button>
                <button type="button" className="btn-ghost" onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}>
                  <UiIcon name="chat" /> {expandedId === item.id ? copy.hideHistory : copy.history}
                </button>
                <button type="button" className="btn-ghost" onClick={() => handleDelete(item)}>
                  <UiIcon name="trash" /> {copy.delete}
                </button>
              </div>
              {expandedId === item.id ? (
                <CandidateNotesPanel copy={copy} userId={user.id} candidateId={item.id} language={language} />
              ) : null}
            </article>
          ))}
        </div>
      ) : data ? (
        <CabinetEmptyState icon="network" title={copy.empty} hint={copy.emptyHint} />
      ) : null}

      {formOpen ? (
        <CandidateFormModal
          copy={copy}
          item={editingItem}
          userId={user.id}
          onClose={() => { setFormOpen(false); setEditingItem(null); }}
          onSubmit={handleFormSubmit}
        />
      ) : null}
    </section>
  );
}

function CandidateNotesPanel({ copy, userId, candidateId, language }) {
  const [notes, setNotes] = useState(null);
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);

  function reload() {
    getCabinetCandidateNotes(userId, candidateId).then(setNotes).catch(() => setNotes([]));
  }

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [candidateId]);

  async function handleAdd() {
    if (!text.trim()) return;
    setSaving(true);
    try {
      await addCabinetCandidateNote(userId, candidateId, text.trim());
      setText("");
      reload();
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteNote(noteId) {
    await deleteCabinetCandidateNote(userId, candidateId, noteId);
    reload();
  }

  return (
    <div className="cabinet-notes-panel">
      <div className="cabinet-notes-add">
        <input
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder={copy.notesPlaceholder}
          onKeyDown={(event) => event.key === "Enter" && handleAdd()}
        />
        <button type="button" className="btn-ghost" onClick={handleAdd} disabled={saving || !text.trim()}>
          <UiIcon name="plus" /> {copy.notesAdd}
        </button>
      </div>
      {notes?.length ? (
        <ul className="cabinet-notes-list">
          {notes.map((note) => (
            <li key={note.id}>
              <div>
                <span className="muted">{formatDate(note.createdAt)} · {note.authorName}</span>
                <p>{note.body}</p>
              </div>
              <button type="button" className="btn-ghost" onClick={() => handleDeleteNote(note.id)} title={copy.delete}>
                ×
              </button>
            </li>
          ))}
        </ul>
      ) : notes ? (
        <p className="muted">{copy.notesEmpty}</p>
      ) : null}
    </div>
  );
}

function CandidateFormModal({ copy, item, userId, onClose, onSubmit }) {
  const [form, setForm] = useState({
    firstName: item?.firstName || "",
    lastName: item?.lastName || "",
    email: item?.email || "",
    phone: item?.phone || "",
    headline: item?.headline || "",
    skills: (item?.skills || []).join(", "),
    notes: item?.notes || "",
    status: item?.status || "sourced",
    followUpDate: item?.followUpDate ? item.followUpDate.slice(0, 10) : "",
    cvFileName: item?.cvFileName || "",
    sourceText: "",
    parsedJson: null
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const fileInputRef = useRef(null);

  function update(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleFileSelected(file) {
    if (!file) return;
    setError("");
    setExtracting(true);
    try {
      const base64 = await fileToBase64(file);
      const result = await extractCabinetCandidateCv(userId, { fileName: file.name, mimeType: file.type, base64 });
      const parsed = result.parsed || {};
      setForm((prev) => ({
        ...prev,
        firstName: parsed.firstName || prev.firstName,
        lastName: parsed.lastName || prev.lastName,
        email: parsed.email || prev.email,
        phone: parsed.phone || prev.phone,
        headline: parsed.headline || prev.headline,
        skills: (parsed.skills || []).length ? parsed.skills.join(", ") : prev.skills,
        cvFileName: result.fileName,
        sourceText: result.sourceText,
        parsedJson: parsed
      }));
    } catch (err) {
      setError(err?.message || copy.extractError);
    } finally {
      setExtracting(false);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!form.firstName.trim() && !form.lastName.trim()) {
      setError(copy.formError);
      return;
    }
    setError("");
    setSaving(true);
    try {
      await onSubmit({
        ...form,
        skills: form.skills.split(",").map((value) => value.trim()).filter(Boolean),
        followUpDate: form.followUpDate || ""
      });
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
          <h3>{copy.formTitle}</h3>

          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.docx,.doc,.txt"
            style={{ display: "none" }}
            onChange={(event) => handleFileSelected(event.target.files?.[0])}
          />
          <button type="button" className="btn-secondary" onClick={() => fileInputRef.current?.click()} disabled={extracting}>
            {extracting ? <span className="btn-spinner dark" /> : <UiIcon name="upload" />}
            {extracting ? copy.extracting : copy.uploadCv}
          </button>
          {form.cvFileName ? <p className="field-hint success">{copy.extractedFrom(form.cvFileName)}</p> : null}

          <input value={form.firstName} onChange={(event) => update("firstName", event.target.value)} placeholder={copy.firstName} />
          <input value={form.lastName} onChange={(event) => update("lastName", event.target.value)} placeholder={copy.lastName} />
          <input value={form.email} onChange={(event) => update("email", event.target.value)} placeholder={copy.email} />
          <input value={form.phone} onChange={(event) => update("phone", event.target.value)} placeholder={copy.phone} />
          <input value={form.headline} onChange={(event) => update("headline", event.target.value)} placeholder={copy.headline} />
          <input value={form.skills} onChange={(event) => update("skills", event.target.value)} placeholder={copy.skills} />
          <label>
            {copy.status}
            <select value={form.status} onChange={(event) => update("status", event.target.value)}>
              {STATUSES.map((value) => (
                <option key={value} value={value}>{copy.statusLabels[value]}</option>
              ))}
            </select>
          </label>
          <label>
            {copy.followUpDate}
            <input type="date" value={form.followUpDate} onChange={(event) => update("followUpDate", event.target.value)} />
          </label>
          <textarea rows={3} value={form.notes} onChange={(event) => update("notes", event.target.value)} placeholder={copy.notes} />
          {error ? <p className="field-error">{error}</p> : null}
          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>{copy.cancel}</button>
            <button type="submit" className="btn-main ready" disabled={saving}>{copy.save}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
