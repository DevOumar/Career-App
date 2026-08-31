import React from "react";
import { useState, useEffect, useRef } from "react";
import Swal from "sweetalert2";
import { UiIcon } from "../../../components/UiIcon.jsx";
import { getFriendlyErrorMessage } from "../../../lib/errors.js";
import { createCabinetCandidate, updateCabinetCandidate, deleteCabinetCandidate, getCabinetCandidates, extractCabinetCandidateCv } from "../../../lib/inMemoryDb.js";
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
          statusLabels: { sourced: "Sourced", contacted: "Contacted", interviewing: "Interviewing", placed: "Placed", rejected: "Rejected" },
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
          save: "Save",
          formError: "First or last name required.",
          uploadCv: "Import a CV (AI-filled)",
          extracting: "Reading CV…",
          extractError: "Could not read this CV. Try another file, or fill the form manually.",
          extractedFrom: (name) => `Prefilled from ${name}`
        }
      : {
          title: "Vivier de candidats",
          subtitle: "Tous les candidats que votre équipe a sourcés ou évalués pour des missions clients.",
          search: "Rechercher par nom, email, compétence…",
          allStatuses: "Tous les statuts",
          statusLabels: { sourced: "Sourcé", contacted: "Contacté", interviewing: "En entretien", placed: "Placé", rejected: "Écarté" },
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
          save: "Enregistrer",
          formError: "Prénom ou nom requis.",
          uploadCv: "Importer un CV (préremplissage IA)",
          extracting: "Lecture du CV…",
          extractError: "Impossible de lire ce CV. Essayez un autre fichier, ou remplissez le formulaire à la main.",
          extractedFrom: (name) => `Préempli depuis ${name}`
        };

  const [data, setData] = useState(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  function reload() {
    getCabinetCandidates(user.id, { search, status })
      .then(setData)
      .catch((err) => setError(getFriendlyErrorMessage(err, language)));
  }

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.id, search, status]);

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
        <button type="button" className="btn-main ready" onClick={() => { setEditingItem(null); setFormOpen(true); }}>
          <UiIcon name="plus" /> {copy.add}
        </button>
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
                    <p>{item.headline || item.email || "—"}</p>
                  </div>
                </div>
                <span className="tag">{copy.statusLabels[item.status] || item.status}</span>
              </div>
              {item.skills?.length ? (
                <div className="job-chip-row history-skill-row">
                  {item.skills.slice(0, 8).map((skill) => (
                    <span key={skill}>{skill}</span>
                  ))}
                </div>
              ) : null}
              <div className="history-card-stats">
                <button type="button" className="btn-ghost" onClick={() => { setEditingItem(item); setFormOpen(true); }}>
                  <UiIcon name="edit" /> {copy.edit}
                </button>
                <button type="button" className="btn-ghost" onClick={() => handleDelete(item)}>
                  <UiIcon name="trash" /> {copy.delete}
                </button>
              </div>
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
          onSubmit={async (payload) => {
            if (editingItem) {
              await updateCabinetCandidate(user.id, editingItem.id, payload);
            } else {
              await createCabinetCandidate(user.id, payload);
            }
            setFormOpen(false);
            setEditingItem(null);
            reload();
            cabinetToast({ title: language === "en" ? "Candidate saved." : "Candidat enregistré." });
          }}
        />
      ) : null}
    </section>
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
      await onSubmit({ ...form, skills: form.skills.split(",").map((value) => value.trim()).filter(Boolean) });
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
