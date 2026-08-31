import React from "react";
import { useState, useEffect } from "react";
import Swal from "sweetalert2";
import { UiIcon } from "../../../components/UiIcon.jsx";
import { getFriendlyErrorMessage } from "../../../lib/errors.js";
import {
  getCabinetMissions,
  createCabinetMission,
  updateCabinetMission,
  deleteCabinetMission,
  updateCabinetMissionCandidate,
  getCabinetCandidates
} from "../../../lib/inMemoryDb.js";

const STATUSES = ["open", "in_progress", "closed"];
const STAGES = ["sourced", "contacted", "interviewing", "placed", "rejected"];

export default function CabinetMissionsPage({ user, language }) {
  const copy =
    language === "en"
      ? {
          title: "Missions",
          subtitle: "Client positions your team is working to fill.",
          statusLabels: { open: "Open", in_progress: "In progress", closed: "Closed" },
          stageLabels: { sourced: "Sourced", contacted: "Contacted", interviewing: "Interviewing", placed: "Placed", rejected: "Rejected" },
          add: "New mission",
          empty: "No mission created yet.",
          candidatesCount: (n) => `${n} candidate(s)`,
          formTitle: "Mission",
          missionTitle: "Position title",
          clientName: "Client",
          location: "Location",
          status: "Status",
          save: "Save",
          cancel: "Cancel",
          delete: "Delete",
          deleteConfirmTitle: "Delete this mission?",
          assign: "Assign a candidate",
          addCandidate: "Add",
          removeCandidate: "Remove",
          formError: "Position title required (min 2 characters)."
        }
      : {
          title: "Missions",
          subtitle: "Postes clients que votre équipe doit pourvoir.",
          statusLabels: { open: "Ouverte", in_progress: "En cours", closed: "Clôturée" },
          stageLabels: { sourced: "Sourcé", contacted: "Contacté", interviewing: "En entretien", placed: "Placé", rejected: "Écarté" },
          add: "Nouvelle mission",
          empty: "Aucune mission créée pour le moment.",
          candidatesCount: (n) => `${n} candidat(s)`,
          formTitle: "Mission",
          missionTitle: "Titre du poste",
          clientName: "Client",
          location: "Localisation",
          status: "Statut",
          save: "Enregistrer",
          cancel: "Annuler",
          delete: "Supprimer",
          deleteConfirmTitle: "Supprimer cette mission ?",
          assign: "Affecter un candidat",
          addCandidate: "Ajouter",
          removeCandidate: "Retirer",
          formError: "Titre du poste requis (2 caractères min)."
        };

  const [items, setItems] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [error, setError] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [selectedCandidateByMission, setSelectedCandidateByMission] = useState({});

  function reload() {
    getCabinetMissions(user.id).then(setItems).catch((err) => setError(getFriendlyErrorMessage(err, language)));
  }

  useEffect(() => {
    reload();
    getCabinetCandidates(user.id, {}).then((data) => setCandidates(data.items || [])).catch(() => setCandidates([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.id]);

  async function handleStatusChange(mission, status) {
    await updateCabinetMission(user.id, mission.id, { status });
    reload();
  }

  async function handleDelete(mission) {
    const result = await Swal.fire({
      icon: "warning",
      title: copy.deleteConfirmTitle,
      text: mission.title,
      showCancelButton: true,
      confirmButtonColor: "#f5222d",
      cancelButtonText: copy.cancel
    });
    if (!result.isConfirmed) return;
    await deleteCabinetMission(user.id, mission.id);
    reload();
  }

  async function handleAddCandidate(mission) {
    const candidateId = selectedCandidateByMission[mission.id];
    if (!candidateId) return;
    await updateCabinetMissionCandidate(user.id, mission.id, candidateId, "add");
    setSelectedCandidateByMission((prev) => ({ ...prev, [mission.id]: "" }));
    reload();
  }

  async function handleStageChange(mission, candidateId, stage) {
    await updateCabinetMissionCandidate(user.id, mission.id, candidateId, "stage", { stage });
    reload();
  }

  async function handleRemoveCandidate(mission, candidateId) {
    await updateCabinetMissionCandidate(user.id, mission.id, candidateId, "remove");
    reload();
  }

  return (
    <section className="cv-history-page">
      <div className="card block history-head">
        <div className="feature-page-header">
          <span className="feature-page-header-icon">
            <UiIcon name="briefcase" />
          </span>
          <div>
            <h2>{copy.title}</h2>
            <p className="muted">{copy.subtitle}</p>
          </div>
        </div>
        <button type="button" className="btn-main ready" onClick={() => setFormOpen(true)}>
          <UiIcon name="plus" /> {copy.add}
        </button>
      </div>

      {error ? <p className="field-error">{error}</p> : null}

      {items?.length ? (
        <div className="history-list">
          {items.map((mission) => {
            const assignedIds = new Set(mission.candidates.map((item) => item.candidateId));
            const available = candidates.filter((item) => !assignedIds.has(item.id));
            return (
              <article className="history-card" key={mission.id}>
                <div className="history-card-top">
                  <div className="history-card-main">
                    <span className="history-card-icon">
                      <UiIcon name="briefcase" />
                    </span>
                    <div>
                      <h3>{mission.title}</h3>
                      <p>{[mission.clientName, mission.location].filter(Boolean).join(" · ") || "—"}</p>
                    </div>
                  </div>
                  <select value={mission.status} onChange={(event) => handleStatusChange(mission, event.target.value)}>
                    {STATUSES.map((value) => (
                      <option key={value} value={value}>{copy.statusLabels[value]}</option>
                    ))}
                  </select>
                </div>

                <div className="history-card-stats">
                  <span className="history-card-stat">{copy.candidatesCount(mission.candidates.length)}</span>
                  <button type="button" className="btn-ghost" onClick={() => handleDelete(mission)}>
                    <UiIcon name="trash" /> {copy.delete}
                  </button>
                </div>

                <div className="cabinet-mission-assign">
                  <select
                    value={selectedCandidateByMission[mission.id] || ""}
                    onChange={(event) => setSelectedCandidateByMission((prev) => ({ ...prev, [mission.id]: event.target.value }))}
                  >
                    <option value="">{copy.assign}</option>
                    {available.map((item) => (
                      <option key={item.id} value={item.id}>{item.firstName} {item.lastName}</option>
                    ))}
                  </select>
                  <button type="button" className="btn-ghost" onClick={() => handleAddCandidate(mission)} disabled={!selectedCandidateByMission[mission.id]}>
                    <UiIcon name="plus" /> {copy.addCandidate}
                  </button>
                </div>

                {mission.candidates.length ? (
                  <div className="cabinet-mission-candidates">
                    {mission.candidates.map((candidate) => (
                      <div key={candidate.candidateId} className="cabinet-mission-candidate-row">
                        <span>{candidate.firstName} {candidate.lastName}</span>
                        <select value={candidate.stage} onChange={(event) => handleStageChange(mission, candidate.candidateId, event.target.value)}>
                          {STAGES.map((value) => (
                            <option key={value} value={value}>{copy.stageLabels[value]}</option>
                          ))}
                        </select>
                        <button type="button" onClick={() => handleRemoveCandidate(mission, candidate.candidateId)} title={copy.removeCandidate}>
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      ) : items ? (
        <p className="muted">{copy.empty}</p>
      ) : null}

      {formOpen ? (
        <MissionFormModal
          copy={copy}
          onClose={() => setFormOpen(false)}
          onSubmit={async (payload) => {
            await createCabinetMission(user.id, payload);
            setFormOpen(false);
            reload();
          }}
        />
      ) : null}
    </section>
  );
}

function MissionFormModal({ copy, onClose, onSubmit }) {
  const [form, setForm] = useState({ title: "", clientName: "", location: "" });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    if (form.title.trim().length < 2) {
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
          <h3>{copy.formTitle}</h3>
          <input value={form.title} onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))} placeholder={copy.missionTitle} />
          <input value={form.clientName} onChange={(event) => setForm((prev) => ({ ...prev, clientName: event.target.value }))} placeholder={copy.clientName} />
          <input value={form.location} onChange={(event) => setForm((prev) => ({ ...prev, location: event.target.value }))} placeholder={copy.location} />
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
