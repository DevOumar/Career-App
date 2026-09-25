import React, { useEffect, useState } from "react";
// Espace Cabinet › Missions : postes clients à pourvoir, sous forme de
// cartes ; la fiche latérale porte le pipeline de la mission (affectation
// des candidats, étapes, montant facturé).
import { AdminPageLoader } from "../../../components/AdminPageLoader.jsx";
import { AvatarCircle } from "../../../components/AvatarCircle.jsx";
import { getFriendlyErrorMessage } from "../../../lib/errors.js";
import { formatDateTime } from "../../../lib/format.js";
import {
  createCabinetMission,
  deleteCabinetMission,
  duplicateCabinetMission,
  getCabinetCandidates,
  getCabinetClients,
  getCabinetMissions,
  updateCabinetMission,
  updateCabinetMissionCandidate
} from "../../../lib/inMemoryDb.js";
import { AdminLineIcon, JyDrawer } from "../../admin/AdminApp.jsx";
import { AdminExportMenu } from "../../admin/AdminListTools.jsx";
import { MfaDialog, MfaError } from "../../account/mfa/MfaUi.jsx";
import { cabinetToast } from "./cabinetToast.js";
import { MissionMatches, scoreTone } from "./MissionMatching.jsx";
import {
  CANDIDATE_STATUSES,
  CANDIDATE_STATUS_TONES,
  MISSION_STATUSES,
  MISSION_STATUS_TONES,
  StatusPill,
  candidateName,
  candidateStatusLabel,
  compactMoney,
  missionStatusLabel,
  useConfirm
} from "./cabinetUi.jsx";

const EMPTY_FORM = {
  title: "",
  clientId: "",
  newClientName: "",
  location: "",
  status: "open",
  placementAmount: "",
  description: "",
  contractType: "",
  remotePolicy: "",
  salaryMin: "",
  salaryMax: "",
  skills: "",
  experienceMin: "",
  deadline: "",
  isPublic: true
};
export const CONTRACT_LABELS = {
  cdi: { fr: "CDI", en: "Permanent" },
  cdd: { fr: "CDD", en: "Fixed-term" },
  freelance: { fr: "Freelance", en: "Freelance" },
  interim: { fr: "Intérim", en: "Temp" },
  stage: { fr: "Stage", en: "Internship" },
  alternance: { fr: "Alternance", en: "Work-study" }
};
export const REMOTE_LABELS = {
  onsite: { fr: "Sur site", en: "On site" },
  hybrid: { fr: "Hybride", en: "Hybrid" },
  remote: { fr: "Télétravail", en: "Remote" }
};
const initials = (value = "") =>
  value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase() || "M";

export default function CabinetMissionsPage({ user, language, currency, autoCreate = false, onAutoCreateDone }) {
  const t = (fr, en) => (language === "en" ? en : fr);
  const [missions, setMissions] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState("");
  const [form, setForm] = useState(EMPTY_FORM);
  const [touched, setTouched] = useState(false);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [assignId, setAssignId] = useState("");
  const [busy, setBusy] = useState("");
  const [amountDraft, setAmountDraft] = useState("");
  const [clients, setClients] = useState([]);
  const [confirm, confirmDialog] = useConfirm(language);

  function reload() {
    return getCabinetMissions(user.id)
      .then(setMissions)
      .catch((err) => setError(getFriendlyErrorMessage(err, language)));
  }

  useEffect(() => {
    reload();
    getCabinetCandidates(user.id, {})
      .then((data) => setCandidates(data.items || []))
      .catch(() => setCandidates([]));
    reloadClients();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.id]);

  function reloadClients() {
    getCabinetClients(user.id)
      .then(setClients)
      .catch(() => setClients([]));
  }

  useEffect(() => {
    if (!autoCreate) return;
    openCreate();
    onAutoCreateDone?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoCreate]);

  const selected = missions?.find((item) => item.id === selectedId) || null;
  useEffect(() => {
    setAssignId("");
    setAmountDraft(selected?.placementAmount != null ? String(selected.placementAmount) : "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, selected?.placementAmount]);

  function openCreate() {
    setEditingId("");
    setForm(EMPTY_FORM);
    setTouched(false);
    setFormError("");
    setFormOpen(true);
  }

  function openEdit(item) {
    setEditingId(item.id);
    setForm({
      ...EMPTY_FORM,
      title: item.title || "",
      clientId: item.clientId || "",
      location: item.location || "",
      status: item.status || "open",
      placementAmount: item.placementAmount != null ? String(item.placementAmount) : "",
      description: item.description || "",
      contractType: item.contractType || "",
      remotePolicy: item.remotePolicy || "",
      salaryMin: item.salaryMin != null ? String(item.salaryMin) : "",
      salaryMax: item.salaryMax != null ? String(item.salaryMax) : "",
      skills: (item.skills || []).join(", "),
      experienceMin: item.experienceMin != null ? String(item.experienceMin) : "",
      deadline: item.deadline || "",
      isPublic: item.isPublic !== false
    });
    setTouched(false);
    setFormError("");
    setFormOpen(true);
  }

  const titleError = form.title.trim().length < 2 ? t("Le titre du poste doit contenir au moins 2 caractères.", "The position title needs at least 2 characters.") : "";
  const amountError = form.placementAmount !== "" && !(Number(form.placementAmount) >= 0) ? t("Montant invalide.", "Invalid amount.") : "";
  const salaryError =
    (form.salaryMin !== "" && !(Number(form.salaryMin) >= 0)) || (form.salaryMax !== "" && !(Number(form.salaryMax) >= 0))
      ? t("Salaire invalide.", "Invalid salary.")
      : form.salaryMin !== "" && form.salaryMax !== "" && Number(form.salaryMax) < Number(form.salaryMin)
      ? t("Le maximum doit dépasser le minimum.", "Maximum must exceed minimum.")
      : "";
  const experienceError = form.experienceMin !== "" && !(Number.isInteger(Number(form.experienceMin)) && Number(form.experienceMin) >= 0 && Number(form.experienceMin) <= 40) ? t("Entre 0 et 40 ans.", "Between 0 and 40 years.") : "";
  const clientError = form.clientId === "__new" && form.newClientName.trim().length < 2 ? t("Nom du client : 2 caractères minimum.", "Client name: 2 characters minimum.") : "";

  function missionPayload() {
    return {
      title: form.title.trim(),
      ...(form.clientId === "__new" ? { clientId: "", clientName: form.newClientName.trim() } : { clientId: form.clientId, clientName: "" }),
      location: form.location.trim(),
      description: form.description.trim(),
      contractType: form.contractType,
      remotePolicy: form.remotePolicy,
      salaryMin: form.salaryMin === "" ? null : Number(form.salaryMin),
      salaryMax: form.salaryMax === "" ? null : Number(form.salaryMax),
      skills: form.skills
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean),
      experienceMin: form.experienceMin === "" ? null : Number(form.experienceMin),
      deadline: form.deadline || "",
      isPublic: form.isPublic
    };
  }

  async function submit(event) {
    event?.preventDefault();
    setTouched(true);
    if (titleError || amountError || salaryError || experienceError || clientError) return;
    setSaving(true);
    setFormError("");
    try {
      if (editingId) {
        await updateCabinetMission(user.id, editingId, {
          ...missionPayload(),
          status: form.status,
          placementAmount: form.placementAmount === "" ? null : Number(form.placementAmount)
        });
        cabinetToast({ title: t("Mission mise à jour.", "Mission updated.") });
      } else {
        const result = await createCabinetMission(user.id, missionPayload());
        if (result?.id) setSelectedId(result.id);
        cabinetToast({ title: t("Mission créée.", "Mission created.") });
      }
      setFormOpen(false);
      await reload();
      reloadClients();
    } catch (err) {
      setFormError(getFriendlyErrorMessage(err, language));
    } finally {
      setSaving(false);
    }
  }

  async function run(key, action, successTitle) {
    setBusy(key);
    try {
      await action();
      await reload();
      if (successTitle) cabinetToast({ title: successTitle });
    } catch (err) {
      cabinetToast({ title: getFriendlyErrorMessage(err, language), icon: "error" });
    } finally {
      setBusy("");
    }
  }

  async function remove(item) {
    const ok = await confirm({
      title: t("Supprimer cette mission ?", "Delete this mission?"),
      description: item.title,
      detail: t("Les candidats restent dans le vivier : seules la mission et ses affectations disparaissent.", "Candidates stay in the pool: only the mission and its assignments are removed."),
      confirmLabel: t("Supprimer", "Delete")
    });
    if (!ok) return;
    setSelectedId("");
    run("delete", () => deleteCabinetMission(user.id, item.id), t("Mission supprimée.", "Mission deleted."));
  }

  if (error && !missions) return <p className="field-error">{error}</p>;
  if (!missions) return <AdminPageLoader language={language} />;

  const stageCounts = (mission) => CANDIDATE_STATUSES.reduce((acc, key) => ({ ...acc, [key]: mission.candidates.filter((item) => item.stage === key).length }), {});
  const statusCounts = MISSION_STATUSES.reduce((acc, key) => ({ ...acc, [key]: missions.filter((item) => item.status === key).length }), {});
  const needle = search.trim().toLowerCase();
  const visible = missions.filter(
    (item) => (!status || item.status === status) && (!needle || `${item.title} ${item.clientName || ""} ${item.location || ""}`.toLowerCase().includes(needle))
  );
  const assignedTotal = missions.reduce((sum, item) => sum + item.candidates.length, 0);
  const revenue = missions.reduce((sum, item) => sum + Number(item.placementAmount || 0), 0);

  const cards = [
    { icon: "briefcase", label: t("Missions", "Missions"), value: missions.length, tone: "" },
    { icon: "activity", label: t("Ouvertes ou en cours", "Open or in progress"), value: statusCounts.open + statusCounts.in_progress, tone: "green" },
    { icon: "accounts", label: t("Candidats affectés", "Assigned candidates"), value: assignedTotal, tone: "gold" },
    { icon: "finance", label: t("Honoraires convenus", "Agreed fees"), value: compactMoney(revenue, language, currency), tone: "green" }
  ];

  const exportColumns = [
    { key: "title", label: t("Poste", "Position"), exportValue: (item) => item.title },
    { key: "client", label: t("Client", "Client"), exportValue: (item) => item.clientName || "" },
    { key: "location", label: t("Localisation", "Location"), exportValue: (item) => item.location || "" },
    { key: "status", label: t("Statut", "Status"), exportValue: (item) => missionStatusLabel(item.status, language) },
    { key: "candidates", label: t("Candidats affectés", "Assigned candidates"), exportValue: (item) => item.candidates.length },
    { key: "placed", label: t("Placés", "Placed"), exportValue: (item) => stageCounts(item).placed },
    { key: "amount", label: t("Honoraires HT (€)", "Fees excl. VAT (€)"), exportValue: (item) => (item.placementAmount != null ? item.placementAmount : "") },
    { key: "created", label: t("Créée le", "Created on"), exportValue: (item) => formatDateTime(item.createdAt, language) }
  ];

  const selectedStages = selected ? stageCounts(selected) : null;
  const assignable = selected ? candidates.filter((item) => !selected.candidates.some((link) => link.candidateId === item.id)) : [];

  return (
    <section className="admin-accounts">
      <header className="module-header admin-accounts-header">
        <div>
          <h2>{t("Missions", "Missions")}</h2>
          <p>{t("Les postes clients que votre équipe doit pourvoir, et le pipeline de chacun.", "The client positions your team is filling, and each one's pipeline.")}</p>
        </div>
        <div className="admin-header-actions">
          <button type="button" className="jy-btn jy-btn-primary" onClick={openCreate}>
            <AdminLineIcon name="plus" />
            {t("Nouvelle mission", "New mission")}
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

      <div className="admin-table-toolbar">
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t("Rechercher un poste, un client, une ville…", "Search a position, a client, a city…")} />
        <div className="jy-seg jy-seg-counts">
          <button type="button" className={!status ? "active" : ""} onClick={() => setStatus("")}>
            {t("Toutes", "All")}
            <span>({missions.length})</span>
          </button>
          {MISSION_STATUSES.map((key) => (
            <button key={key} type="button" className={status === key ? "active" : ""} onClick={() => setStatus(key)}>
              {missionStatusLabel(key, language)}
              <span>({statusCounts[key]})</span>
            </button>
          ))}
        </div>
        <div className="jy-list-tools">
          <AdminExportMenu language={language} title={t("Missions", "Missions")} fileBase="missions" columns={exportColumns} rows={visible} />
        </div>
      </div>

      {visible.length ? (
        <div className="jy-promo-grid">
          {visible.map((item) => {
            const stages = stageCounts(item);
            const total = item.candidates.length;
            return (
              <button type="button" key={item.id} className={`jy-promo-card ${selectedId === item.id ? "is-selected" : ""}`} onClick={() => setSelectedId(item.id)}>
                <span className="jy-promo-head">
                  <span className="jy-promo-badge">{initials(item.clientName || item.title)}</span>
                  <span className="jy-promo-title">
                    <strong>{item.title}</strong>
                    <small>{[item.clientName, item.location].filter(Boolean).join(" · ") || t("Client non renseigné", "No client")}</small>
                  </span>
                  <StatusPill tone={MISSION_STATUS_TONES[item.status]}>{missionStatusLabel(item.status, language)}</StatusPill>
                </span>
                {item.contractType || item.remotePolicy || item.skills?.length ? (
                  <span className="jy-promo-tags">
                    {item.contractType ? <span className="jy-chip small">{CONTRACT_LABELS[item.contractType]?.[language === "en" ? "en" : "fr"]}</span> : null}
                    {item.remotePolicy ? <span className="jy-chip small">{REMOTE_LABELS[item.remotePolicy]?.[language === "en" ? "en" : "fr"]}</span> : null}
                    {(item.skills || []).slice(0, 3).map((skill) => (
                      <span key={skill} className="jy-chip small">
                        {skill}
                      </span>
                    ))}
                  </span>
                ) : null}
                <span className="jy-stage-bar" aria-hidden="true">
                  {total
                    ? CANDIDATE_STATUSES.map((key) => (stages[key] ? <span key={key} className={`tone-${CANDIDATE_STATUS_TONES[key]}`} style={{ width: `${(stages[key] / total) * 100}%` }} /> : null))
                    : null}
                </span>
                <span className="jy-promo-stats">
                  <span>
                    <strong>{total}</strong>
                    <small>{t("candidats", "candidates")}</small>
                  </span>
                  <span>
                    <strong>{stages.interviewing}</strong>
                    <small>{t("en entretien", "interviewing")}</small>
                  </span>
                  <span>
                    <strong className={stages.placed ? "good" : ""}>{stages.placed}</strong>
                    <small>{t("placés", "placed")}</small>
                  </span>
                  <span>
                    <strong>{item.placementAmount != null ? compactMoney(item.placementAmount, language, currency) : "-"}</strong>
                    <small>{t("honoraires", "fees")}</small>
                  </span>
                </span>
                <span className="jy-promo-foot">
                  <span className="jy-avatar-stack">
                    {item.candidates.slice(0, 5).map((link) => (
                      <AvatarCircle key={link.candidateId} user={link} />
                    ))}
                    {total > 5 ? <span className="jy-avatar-more">+{total - 5}</span> : null}
                    {!total ? <small className="jy-warn-text">{t("Aucun candidat affecté", "No candidate assigned")}</small> : null}
                  </span>
                  <small>
                    {t("Créée le", "Created on")} {formatDateTime(item.createdAt, language)}
                  </small>
                </span>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="jy-card jy-empty-block">
          <span className="jy-empty-icon">
            <AdminLineIcon name="briefcase" />
          </span>
          <strong>{missions.length ? t("Aucune mission ne correspond.", "No mission matches.") : t("Aucune mission pour le moment", "No mission yet")}</strong>
          <span>
            {missions.length
              ? t("Modifiez la recherche ou le statut.", "Change the search or status.")
              : t("Créez votre première mission client pour commencer à y affecter des candidats.", "Create your first client mission to start assigning candidates.")}
          </span>
          {!missions.length ? (
            <button type="button" className="jy-btn jy-btn-primary" onClick={openCreate}>
              <AdminLineIcon name="plus" />
              {t("Nouvelle mission", "New mission")}
            </button>
          ) : null}
        </div>
      )}

      <JyDrawer
        open={Boolean(selected)}
        onClose={() => setSelectedId("")}
        language={language}
        avatar={selected ? <span className="jy-promo-badge large">{initials(selected.clientName || selected.title)}</span> : null}
        title={selected?.title || ""}
        subtitle={selected ? [selected.clientName, selected.location].filter(Boolean).join(" · ") : ""}
        badges={selected ? <StatusPill tone={MISSION_STATUS_TONES[selected.status]}>{missionStatusLabel(selected.status, language)}</StatusPill> : null}
        sections={
          selected
            ? [
                {
                  title: t("Statut de la mission", "Mission status"),
                  content: (
                    <div className="jy-seg jy-seg-full">
                      {MISSION_STATUSES.map((key) => (
                        <button
                          key={key}
                          type="button"
                          className={selected.status === key ? "active" : ""}
                          disabled={busy === "status"}
                          onClick={() => selected.status !== key && run("status", () => updateCabinetMission(user.id, selected.id, { status: key }), t("Statut mis à jour.", "Status updated."))}
                        >
                          {missionStatusLabel(key, language)}
                        </button>
                      ))}
                    </div>
                  )
                },
                {
                  title: t("Pipeline", "Pipeline"),
                  content: (
                    <>
                      <div className="jy-stage-summary">
                        {CANDIDATE_STATUSES.map((key) => (
                          <span key={key} className={`tone-${CANDIDATE_STATUS_TONES[key]}`}>
                            <strong>{selectedStages[key]}</strong>
                            <small>{candidateStatusLabel(key, language)}</small>
                          </span>
                        ))}
                      </div>
                      <div className="jy-assign-row">
                        <select value={assignId} onChange={(event) => setAssignId(event.target.value)} aria-label={t("Candidat à affecter", "Candidate to assign")}>
                          <option value="">{assignable.length ? t("Affecter un candidat du vivier…", "Assign a candidate from the pool…") : t("Tous les candidats sont déjà affectés", "Every candidate is already assigned")}</option>
                          {assignable.map((item) => (
                            <option key={item.id} value={item.id}>
                              {candidateName(item)}
                              {item.headline ? ` · ${item.headline}` : ""}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          className="jy-btn jy-btn-primary jy-btn-sm"
                          disabled={!assignId || busy === "assign"}
                          onClick={() =>
                            run(
                              "assign",
                              async () => {
                                await updateCabinetMissionCandidate(user.id, selected.id, assignId, "add");
                                setAssignId("");
                              },
                              t("Candidat affecté.", "Candidate assigned.")
                            )
                          }
                        >
                          <AdminLineIcon name="plus" />
                          {t("Affecter", "Assign")}
                        </button>
                      </div>
                      {selected.candidates.length ? (
                        <ul className="jy-mission-people">
                          {selected.candidates.map((link) => (
                            <li key={link.candidateId}>
                              <AvatarCircle user={link} />
                              <span className="jy-mission-person">
                                <strong>{candidateName(link)}</strong>
                                <small>{link.email || ""}</small>
                              </span>
                              {link.score != null ? (
                                <span className={`jy-match-score ${scoreTone(link.score)}`} title={link.aiAnalyzed ? t("Score de l'analyse IA", "AI analysis score") : t("Score de correspondance", "Match score")}>
                                  {link.score}
                                </span>
                              ) : null}
                              <select
                                className={`jy-status-select ${CANDIDATE_STATUS_TONES[link.stage]}`}
                                value={link.stage}
                                disabled={busy === `stage-${link.candidateId}`}
                                onChange={(event) => run(`stage-${link.candidateId}`, () => updateCabinetMissionCandidate(user.id, selected.id, link.candidateId, "stage", { stage: event.target.value }))}
                                aria-label={t("Étape", "Stage")}
                              >
                                {CANDIDATE_STATUSES.map((key) => (
                                  <option key={key} value={key}>
                                    {candidateStatusLabel(key, language)}
                                  </option>
                                ))}
                              </select>
                              <button
                                type="button"
                                className="jy-icon-btn small"
                                title={t("Retirer de la mission", "Remove from mission")}
                                aria-label={t("Retirer de la mission", "Remove from mission")}
                                onClick={() => run(`remove-${link.candidateId}`, () => updateCabinetMissionCandidate(user.id, selected.id, link.candidateId, "remove"), t("Candidat retiré de la mission.", "Candidate removed from the mission."))}
                              >
                                <AdminLineIcon name="close" />
                              </button>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="jy-drawer-empty">{t("Aucun candidat affecté pour l'instant.", "No candidate assigned yet.")}</p>
                      )}
                    </>
                  )
                },
                {
                  title: t("Honoraires du placement", "Placement fees"),
                  content: (
                    <div className="jy-amount-row">
                      <label className="jy-amount-input">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          inputMode="decimal"
                          value={amountDraft}
                          placeholder={t("Montant HT", "Amount excl. VAT")}
                          onChange={(event) => setAmountDraft(event.target.value)}
                        />
                        <span>€</span>
                      </label>
                      <button
                        type="button"
                        className="jy-btn jy-btn-outline jy-btn-sm"
                        disabled={busy === "amount" || amountDraft === (selected.placementAmount != null ? String(selected.placementAmount) : "") || (amountDraft !== "" && !(Number(amountDraft) >= 0))}
                        onClick={() => run("amount", () => updateCabinetMission(user.id, selected.id, { placementAmount: amountDraft === "" ? null : Number(amountDraft) }), t("Montant enregistré.", "Amount saved."))}
                      >
                        {t("Enregistrer", "Save")}
                      </button>
                      <small className="jy-amount-hint">{t("Honoraires HT convenus avec le client. Facturez-les ensuite depuis « Factures clients » : seul le facturé compte dans le chiffre d'affaires.", "Fees agreed with the client (excl. VAT). Then invoice them from “Client invoices”: only invoiced amounts count as revenue.")}</small>
                    </div>
                  )
                },
                {
                  title: t("Meilleurs candidats du vivier", "Best candidates in the pool"),
                  content: <MissionMatches userId={user.id} mission={selected} language={language} onAssigned={reload} onEditMission={() => openEdit(selected)} />
                },
                {
                  title: t("Fiche de poste", "Job sheet"),
                  rows: [
                    [t("Client", "Client"), selected.clientName || ""],
                    [t("Localisation", "Location"), selected.location || ""],
                    [t("Contrat", "Contract"), CONTRACT_LABELS[selected.contractType]?.[language === "en" ? "en" : "fr"] || ""],
                    [t("Mode de travail", "Work mode"), REMOTE_LABELS[selected.remotePolicy]?.[language === "en" ? "en" : "fr"] || ""],
                    [
                      t("Salaire annuel brut", "Annual gross salary"),
                      selected.salaryMin != null || selected.salaryMax != null
                        ? [selected.salaryMin, selected.salaryMax].filter((value) => value != null).map((value) => compactMoney(value, language, currency)).join(" – ")
                        : ""
                    ],
                    [t("Expérience minimale", "Minimum experience"), selected.experienceMin != null ? t(`${selected.experienceMin} an(s)`, `${selected.experienceMin} year(s)`) : ""],
                    [t("Date limite", "Deadline"), selected.deadline ? formatDateTime(selected.deadline, language).split(" ")[0] : ""],
                    [t("Page publique", "Public page"), selected.isPublic ? t("Visible", "Visible") : t("Masquée", "Hidden")],
                    [t("Créée le", "Created on"), formatDateTime(selected.createdAt, language)]
                  ]
                },
                selected.skills?.length || selected.description
                  ? {
                      title: t("Description et compétences", "Description and skills"),
                      content: (
                        <>
                          {selected.skills?.length ? (
                            <div className="jy-chip-cloud">
                              {selected.skills.map((skill) => (
                                <span key={skill} className="jy-chip">
                                  {skill}
                                </span>
                              ))}
                            </div>
                          ) : null}
                          {selected.description ? <p className="jy-drawer-text">{selected.description}</p> : null}
                        </>
                      )
                    }
                  : null
              ].filter(Boolean)
            : []
        }
        footer={
          selected ? (
            <>
              <button type="button" className="jy-btn jy-btn-outline" onClick={() => openEdit(selected)}>
                <AdminLineIcon name="edit" />
                {t("Modifier", "Edit")}
              </button>
              <button type="button" className="jy-btn jy-btn-outline" disabled={busy === "duplicate"} onClick={() => run("duplicate", () => duplicateCabinetMission(user.id, selected.id), t("Mission dupliquée.", "Mission duplicated."))}>
                <AdminLineIcon name="layers" />
                {t("Dupliquer", "Duplicate")}
              </button>
              <button type="button" className="jy-btn jy-btn-danger-outline" onClick={() => remove(selected)}>
                <AdminLineIcon name="trash" />
                {t("Supprimer", "Delete")}
              </button>
            </>
          ) : null
        }
      />

      <MfaDialog
        open={formOpen}
        onClose={() => !saving && setFormOpen(false)}
        icon={editingId ? "edit" : "plus"}
        title={editingId ? t("Modifier la mission", "Edit mission") : t("Nouvelle mission", "New mission")}
        description={editingId ? t("Les candidats affectés restent sur la mission.", "Assigned candidates stay on the mission.") : t("Un poste client à pourvoir. Vous y affecterez ensuite des candidats du vivier.", "A client position to fill. You'll then assign candidates from the pool.")}
        width={680}
        footer={
          <>
            <button type="button" className="mfa-btn ghost" onClick={() => setFormOpen(false)} disabled={saving}>
              {t("Annuler", "Cancel")}
            </button>
            <button type="button" className="mfa-btn primary" onClick={submit} disabled={saving}>
              {saving ? <span className="mfa-spinner" /> : null}
              {editingId ? t("Enregistrer", "Save") : t("Créer la mission", "Create mission")}
            </button>
          </>
        }
      >
        <MfaError message={formError} />
        <form className="jy-promo-form" onSubmit={submit} noValidate>
          <label className={`mfa-field wide ${touched && titleError ? "has-error" : ""}`}>
            <span>{t("Titre du poste", "Position title")} *</span>
            <input autoFocus maxLength={120} value={form.title} placeholder={t("Ex. Data Engineer senior", "e.g. Senior Data Engineer")} onChange={(event) => setForm({ ...form, title: event.target.value })} />
            {touched && titleError ? <small className="jy-field-error">{titleError}</small> : null}
          </label>
          <label className={`mfa-field ${touched && clientError ? "has-error" : ""}`}>
            <span>{t("Client", "Client")}</span>
            <select value={form.clientId} onChange={(event) => setForm({ ...form, clientId: event.target.value })}>
              <option value="">{t("Sans client", "No client")}</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
              <option value="__new">{t("+ Nouveau client…", "+ New client…")}</option>
            </select>
            {touched && clientError ? <small className="jy-field-error">{clientError}</small> : null}
          </label>
          {form.clientId === "__new" ? (
            <label className="mfa-field">
              <span>{t("Nom du nouveau client", "New client name")}</span>
              <input maxLength={160} value={form.newClientName} placeholder={t("Ex. Banque Atlas", "e.g. Atlas Bank")} onChange={(event) => setForm({ ...form, newClientName: event.target.value })} />
            </label>
          ) : (
            <label className="mfa-field">
              <span>{t("Localisation", "Location")}</span>
              <input maxLength={160} value={form.location} placeholder={t("Ex. Paris", "e.g. Paris")} onChange={(event) => setForm({ ...form, location: event.target.value })} />
            </label>
          )}
          {form.clientId === "__new" ? (
            <label className="mfa-field wide">
              <span>{t("Localisation", "Location")}</span>
              <input maxLength={160} value={form.location} placeholder={t("Ex. Paris", "e.g. Paris")} onChange={(event) => setForm({ ...form, location: event.target.value })} />
            </label>
          ) : null}
          <label className="mfa-field">
            <span>{t("Type de contrat", "Contract type")}</span>
            <select value={form.contractType} onChange={(event) => setForm({ ...form, contractType: event.target.value })}>
              <option value="">{t("Non précisé", "Not specified")}</option>
              {Object.entries(CONTRACT_LABELS).map(([key, value]) => (
                <option key={key} value={key}>
                  {value[language === "en" ? "en" : "fr"]}
                </option>
              ))}
            </select>
          </label>
          <label className="mfa-field">
            <span>{t("Mode de travail", "Work mode")}</span>
            <select value={form.remotePolicy} onChange={(event) => setForm({ ...form, remotePolicy: event.target.value })}>
              <option value="">{t("Non précisé", "Not specified")}</option>
              {Object.entries(REMOTE_LABELS).map(([key, value]) => (
                <option key={key} value={key}>
                  {value[language === "en" ? "en" : "fr"]}
                </option>
              ))}
            </select>
          </label>
          <label className={`mfa-field ${touched && salaryError ? "has-error" : ""}`}>
            <span>{t("Salaire annuel brut min. (€)", "Min. annual gross salary (€)")}</span>
            <input type="number" min="0" step="1000" inputMode="numeric" value={form.salaryMin} onChange={(event) => setForm({ ...form, salaryMin: event.target.value })} />
          </label>
          <label className={`mfa-field ${touched && salaryError ? "has-error" : ""}`}>
            <span>{t("Salaire annuel brut max. (€)", "Max. annual gross salary (€)")}</span>
            <input type="number" min="0" step="1000" inputMode="numeric" value={form.salaryMax} onChange={(event) => setForm({ ...form, salaryMax: event.target.value })} />
            {touched && salaryError ? <small className="jy-field-error">{salaryError}</small> : null}
          </label>
          <label className="mfa-field wide">
            <span>{t("Compétences requises (séparées par des virgules)", "Required skills (comma-separated)")}</span>
            <input value={form.skills} placeholder="Python, SQL, Spark, AWS" onChange={(event) => setForm({ ...form, skills: event.target.value })} />
            <small>{t("Elles servent à classer les candidats du vivier (matching).", "They are used to rank candidates in the pool (matching).")}</small>
          </label>
          <label className={`mfa-field ${touched && experienceError ? "has-error" : ""}`}>
            <span>{t("Expérience minimale (années)", "Minimum experience (years)")}</span>
            <input type="number" min="0" max="40" step="1" inputMode="numeric" value={form.experienceMin} onChange={(event) => setForm({ ...form, experienceMin: event.target.value })} />
            {touched && experienceError ? <small className="jy-field-error">{experienceError}</small> : null}
          </label>
          <label className="mfa-field">
            <span>{t("Date limite", "Deadline")}</span>
            <input type="date" value={form.deadline} onChange={(event) => setForm({ ...form, deadline: event.target.value })} />
          </label>
          <label className="mfa-field wide">
            <span>{t("Description du poste", "Job description")}</span>
            <textarea rows={5} className="jy-textarea" maxLength={8000} value={form.description} placeholder={t("Missions, contexte, équipe, profil recherché…", "Duties, context, team, profile sought…")} onChange={(event) => setForm({ ...form, description: event.target.value })} />
          </label>
          <label className="mfa-field wide jy-check-field">
            <input type="checkbox" checked={form.isPublic} onChange={(event) => setForm({ ...form, isPublic: event.target.checked })} />
            <span>{t("Afficher cette mission sur la page publique de recrutement du cabinet", "Show this mission on the firm's public recruitment page")}</span>
          </label>
          {editingId ? (
            <>
              <label className="mfa-field">
                <span>{t("Statut", "Status")}</span>
                <select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}>
                  {MISSION_STATUSES.map((key) => (
                    <option key={key} value={key}>
                      {missionStatusLabel(key, language)}
                    </option>
                  ))}
                </select>
              </label>
              <label className={`mfa-field ${touched && amountError ? "has-error" : ""}`}>
                <span>{t("Honoraires convenus HT (€)", "Agreed fees excl. VAT (€)")}</span>
                <input type="number" min="0" step="0.01" inputMode="decimal" value={form.placementAmount} onChange={(event) => setForm({ ...form, placementAmount: event.target.value })} />
                {touched && amountError ? <small className="jy-field-error">{amountError}</small> : null}
              </label>
            </>
          ) : null}
        </form>
      </MfaDialog>

      {confirmDialog}
    </section>
  );
}
