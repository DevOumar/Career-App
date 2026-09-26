import React, { useEffect, useRef, useState } from "react";
// Espace Cabinet › Vivier de candidats : liste partagée par tous les
// recruteurs du cabinet, avec filtres avancés, colonnes, export, fiche
// latérale (historique des notes) et formulaire préremplissable par IA.
import { AdminPageLoader } from "../../../components/AdminPageLoader.jsx";
import { AvatarCircle } from "../../../components/AvatarCircle.jsx";
import { getFriendlyErrorMessage } from "../../../lib/errors.js";
import { formatDateTime } from "../../../lib/format.js";
import { fileToBase64 } from "../../../lib/cvService.js";
import {
  addCabinetCandidateNote,
  createCabinetCandidate,
  deleteCabinetCandidate,
  deleteCabinetCandidateNote,
  extractCabinetCandidateCv,
  anonymizeCabinetCandidates,
  getCabinetMissions,
  getCabinetRgpd,
  getCabinetCandidateNotes,
  getCabinetCandidates,
  updateCabinetCandidate
} from "../../../lib/inMemoryDb.js";
import { AdminLineIcon, AdminPagination, ADMIN_PAGE_SIZE, JyDrawer } from "../../admin/AdminApp.jsx";
import { AdminAdvancedFilters, AdminColumnSelector, AdminExportMenu, inAdminDateRange, useAdminColumns } from "../../admin/AdminListTools.jsx";
import { MfaDialog, MfaError } from "../../account/mfa/MfaUi.jsx";
import { cabinetToast } from "./cabinetToast.js";
import { InterviewFormDialog } from "./CabinetInterviewsPage.jsx";
import { CONSENT_LABELS, CONSENT_SOURCES, CandidateEmailDialog, CandidatePipelineBoard, CandidateTimeline, downloadCandidateData } from "./CandidateExtras.jsx";
import { CANDIDATE_STATUSES, CANDIDATE_STATUS_TONES, StatusPill, candidateName, candidateStatusLabel, useConfirm } from "./cabinetUi.jsx";

const COLUMN_KEYS = [{ key: "name", required: true }, { key: "headline" }, { key: "skills" }, { key: "status" }, { key: "followUp" }, { key: "consent" }, { key: "added" }, { key: "phone" }, { key: "cv" }];
const EMPTY_FORM = { firstName: "", lastName: "", email: "", phone: "", headline: "", skills: "", notes: "", status: "sourced", followUpDate: "", cvFileName: "", sourceText: "", parsedJson: null, consentStatus: "pending", consentSource: "" };

export default function CabinetCandidatesPage({ user, language, initialSearch = "", autoCreate = false, onAutoCreateDone, isCabinetOwner = true, onGoToTab }) {
  const t = (fr, en) => (language === "en" ? en : fr);
  const [items, setItems] = useState(null);
  const [error, setError] = useState("");
  const [search, setSearch] = useState(initialSearch);
  const [status, setStatus] = useState("");
  const [filters, setFilters] = useState({ skill: "", cv: "", followUp: "", consent: "", addedFrom: "", addedTo: "" });
  const [view, setView] = useState(() => {
    try {
      return localStorage.getItem("career_app_cabinet_candidates_view") === "board" ? "board" : "list";
    } catch (_error) {
      return "list";
    }
  });
  const [missions, setMissions] = useState([]);
  const [rgpd, setRgpd] = useState(null);
  const [emailFor, setEmailFor] = useState(null);
  const [interviewFor, setInterviewFor] = useState(null);
  const [timelineKey, setTimelineKey] = useState(0);
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState("");
  const [confirm, confirmDialog] = useConfirm(language);
  const cols = useAdminColumns("career_app_cabinet_cols_candidates", COLUMN_KEYS.map((column) => ({ ...column, defaultHidden: ["phone", "cv"].includes(column.key) })));

  function reload() {
    return getCabinetCandidates(user.id, {})
      .then((data) => setItems(data.items || []))
      .catch((err) => setError(getFriendlyErrorMessage(err, language)));
  }

  useEffect(() => {
    reload();
    getCabinetMissions(user.id)
      .then(setMissions)
      .catch(() => setMissions([]));
    if (isCabinetOwner) {
      getCabinetRgpd(user.id)
        .then(setRgpd)
        .catch(() => setRgpd(null));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.id]);

  function switchView(next) {
    setView(next);
    try {
      localStorage.setItem("career_app_cabinet_candidates_view", next);
    } catch (_error) {
      // préférence non mémorisée
    }
  }

  async function anonymize(item) {
    const ok = await confirm({
      title: t("Anonymiser ce candidat ?", "Anonymize this candidate?"),
      description: candidateName(item),
      detail: t(
        "Son identité, ses coordonnées, son CV, ses notes et ses e-mails sont effacés définitivement. Seules son étape et ses compétences restent, sans lien avec sa personne, pour vos statistiques.",
        "Their identity, contact details, CV, notes and emails are permanently erased. Only their stage and skills remain, unlinked from them, for your statistics."
      ),
      confirmLabel: t("Anonymiser", "Anonymize")
    });
    if (!ok) return;
    try {
      await anonymizeCabinetCandidates(user.id, [item.id]);
      await reload();
      cabinetToast({ title: t("Candidat anonymisé.", "Candidate anonymized.") });
    } catch (err) {
      cabinetToast({ title: getFriendlyErrorMessage(err, language), icon: "error" });
    }
  }

  useEffect(() => {
    if (initialSearch) setSearch(initialSearch);
  }, [initialSearch]);

  // Demande d'ouverture du formulaire depuis la barre du haut / l'Accueil.
  useEffect(() => {
    if (!autoCreate) return;
    openCreate();
    onAutoCreateDone?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoCreate]);

  useEffect(() => {
    setPage(1);
  }, [search, status, filters]);

  function openCreate() {
    setEditingId("");
    setFormOpen(true);
  }

  function openEdit(item) {
    setEditingId(item.id);
    setFormOpen(true);
  }

  async function remove(item) {
    const ok = await confirm({
      title: t("Supprimer ce candidat ?", "Delete this candidate?"),
      description: candidateName(item),
      detail: t("Il sera retiré du vivier et de toutes les missions, avec son historique de notes.", "They will be removed from the pool and all missions, with their notes history."),
      confirmLabel: t("Supprimer", "Delete")
    });
    if (!ok) return;
    try {
      await deleteCabinetCandidate(user.id, item.id);
      setSelectedId("");
      await reload();
      cabinetToast({ title: t("Candidat supprimé.", "Candidate deleted.") });
    } catch (err) {
      cabinetToast({ title: getFriendlyErrorMessage(err, language), icon: "error" });
    }
  }

  async function changeStatus(item, nextStatus) {
    setItems((current) => current.map((row) => (row.id === item.id ? { ...row, status: nextStatus } : row)));
    try {
      await updateCabinetCandidate(user.id, item.id, { ...toPayload(item), status: nextStatus });
      reload();
    } catch (err) {
      cabinetToast({ title: getFriendlyErrorMessage(err, language), icon: "error" });
      reload();
    }
  }

  if (error && !items) return <p className="field-error">{error}</p>;
  if (!items) return <AdminPageLoader language={language} />;

  // ------------------------------------------------------------- filtres
  const allSkills = [...new Set(items.flatMap((item) => item.skills || []))].sort((a, b) => a.localeCompare(b));
  const statusCounts = CANDIDATE_STATUSES.reduce((acc, key) => ({ ...acc, [key]: items.filter((item) => item.status === key).length }), {});
  const needle = search.trim().toLowerCase();
  const baseFiltered = items.filter(
    (item) =>
      (!needle || `${candidateName(item)} ${item.email || ""} ${item.headline || ""} ${(item.skills || []).join(" ")}`.toLowerCase().includes(needle)) &&
      (!filters.skill || (item.skills || []).includes(filters.skill)) &&
      (!filters.cv || (filters.cv === "yes" ? item.hasCv : !item.hasCv)) &&
      (!filters.followUp || (filters.followUp === "due" ? item.followUpDue : filters.followUp === "planned" ? item.followUpDate && !item.followUpDue : !item.followUpDate)) &&
      (!filters.consent || (item.consentStatus || "pending") === filters.consent) &&
      inAdminDateRange(item.createdAt, filters.addedFrom, filters.addedTo)
  );
  const filtered = baseFiltered.filter((item) => !status || item.status === status);
  const totalPages = Math.max(1, Math.ceil(filtered.length / ADMIN_PAGE_SIZE));
  const paged = filtered.slice((page - 1) * ADMIN_PAGE_SIZE, page * ADMIN_PAGE_SIZE);
  const selected = items.find((item) => item.id === selectedId) || null;
  const editing = items.find((item) => item.id === editingId) || null;

  const filterFields = [
    { key: "skill", label: t("Compétence", "Skill"), allLabel: t("Toutes les compétences", "All skills"), options: allSkills.map((skill) => ({ value: skill, label: skill })) },
    {
      key: "cv",
      label: "CV",
      allLabel: t("Avec ou sans CV", "With or without CV"),
      options: [
        { value: "yes", label: t("CV importé", "CV imported") },
        { value: "no", label: t("Sans CV", "No CV") }
      ]
    },
    {
      key: "followUp",
      label: t("Relance", "Follow-up"),
      allLabel: t("Toutes", "All"),
      options: [
        { value: "due", label: t("Relance à faire", "Follow-up due") },
        { value: "planned", label: t("Relance planifiée", "Follow-up planned") },
        { value: "none", label: t("Sans rappel", "No reminder") }
      ]
    },
    {
      key: "consent",
      label: t("Consentement RGPD", "GDPR consent"),
      allLabel: t("Tous", "All"),
      options: Object.entries(CONSENT_LABELS).map(([value, label]) => ({ value, label: label.short[language === "en" ? "en" : "fr"] }))
    },
    { key: "added", label: t("Ajouté entre le", "Added between"), type: "dateRange" }
  ];
  const filterSummary = [
    search ? `${t("Recherche", "Search")} : ${search}` : "",
    status ? `${t("Étape", "Stage")} : ${candidateStatusLabel(status, language)}` : "",
    ...filterFields.flatMap((field) => {
      if (field.type === "dateRange") {
        const from = filters[`${field.key}From`];
        const to = filters[`${field.key}To`];
        return from || to ? [`${field.label} ${from || "…"} / ${to || "…"}`] : [];
      }
      const option = field.options.find((item) => item.value === filters[field.key]);
      return option ? [`${field.label} : ${option.label}`] : [];
    })
  ].filter(Boolean);

  const followUpText = (item) => (item.followUpDate ? formatDateTime(item.followUpDate, language).split(" ")[0] : "");
  const columnDefs = [
    {
      key: "name",
      label: t("Candidat", "Candidate"),
      required: true,
      exportColumns: [
        { label: t("Nom", "Name"), value: candidateName },
        { label: "E-mail", value: (item) => item.email || "" }
      ]
    },
    { key: "headline", label: t("Poste visé", "Target role"), exportValue: (item) => item.headline || "" },
    { key: "skills", label: t("Compétences", "Skills"), exportValue: (item) => (item.skills || []).join(", ") },
    { key: "status", label: t("Étape", "Stage"), exportValue: (item) => candidateStatusLabel(item.status, language) },
    { key: "followUp", label: t("Relance", "Follow-up"), exportValue: followUpText },
    { key: "consent", label: t("Consentement", "Consent"), exportValue: (item) => CONSENT_LABELS[item.consentStatus || "pending"]?.short[language === "en" ? "en" : "fr"] || "" },
    { key: "added", label: t("Ajouté le", "Added on"), exportValue: (item) => formatDateTime(item.createdAt, language) },
    { key: "phone", label: t("Téléphone", "Phone"), defaultHidden: true, exportValue: (item) => item.phone || "" },
    { key: "cv", label: "CV", defaultHidden: true, exportValue: (item) => item.cvFileName || (item.hasCv ? t("Oui", "Yes") : "") }
  ];
  const visibleColumns = columnDefs.filter((column) => cols.isVisible(column.key));

  const followUpDue = items.filter((item) => item.followUpDue).length;
  const inProcess = statusCounts.contacted + statusCounts.interviewing;
  const cards = [
    { icon: "accounts", label: t("Candidats", "Candidates"), value: items.length, tone: "" },
    { icon: "activity", label: t("En process", "In process"), value: inProcess, tone: "gold" },
    { icon: "quality", label: t("Placés", "Placed"), value: statusCounts.placed, tone: "green" },
    { icon: "clock", label: t("Relances à faire", "Follow-ups due"), value: followUpDue, tone: followUpDue ? "danger" : "" }
  ];

  return (
    <section className="admin-accounts">
      <header className="module-header admin-accounts-header">
        <div>
          <h2>{t("Vivier de candidats", "Candidate pool")}</h2>
          <p>{t("Tous les candidats sourcés ou évalués par votre équipe, partagés entre les recruteurs du cabinet.", "Every candidate sourced or evaluated by your team, shared across the firm's recruiters.")}</p>
        </div>
        <div className="admin-header-actions">
          <button type="button" className="jy-btn jy-btn-primary" onClick={openCreate}>
            <AdminLineIcon name="plus" />
            {t("Ajouter un candidat", "Add a candidate")}
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

      {isCabinetOwner && rgpd?.expired?.length ? (
        <div className="jy-callout">
          <AdminLineIcon name="alert" />
          <span>
            {t(
              `${rgpd.expired.length} candidat(s) dépassent votre durée de conservation (${rgpd.retentionMonths} mois sans interaction). Le RGPD impose de supprimer ou d'anonymiser leurs données.`,
              `${rgpd.expired.length} candidate(s) exceed your retention period (${rgpd.retentionMonths} months without interaction). GDPR requires deleting or anonymizing their data.`
            )}{" "}
            {onGoToTab ? (
              <button type="button" className="jy-link" onClick={() => onGoToTab("settings")}>
                {t("Gérer dans les paramètres", "Manage in settings")}
              </button>
            ) : null}
          </span>
        </div>
      ) : null}

      <div className="jy-view-switch">
        <div className="jy-seg">
          <button type="button" className={view === "list" ? "active" : ""} onClick={() => switchView("list")}>
            <AdminLineIcon name="sheet" />
            {t("Liste", "List")}
          </button>
          <button type="button" className={view === "board" ? "active" : ""} onClick={() => switchView("board")}>
            <AdminLineIcon name="columns" />
            {t("Pipeline", "Pipeline")}
          </button>
        </div>
      </div>

      {view === "list" ? (
      <div className="jy-seg jy-seg-counts jy-seg-scroll">
        <button type="button" className={!status ? "active" : ""} onClick={() => setStatus("")}>
          {t("Toutes les étapes", "All stages")}
          <span>({items.length})</span>
        </button>
        {CANDIDATE_STATUSES.map((key) => (
          <button key={key} type="button" className={status === key ? "active" : ""} onClick={() => setStatus(key)}>
            {candidateStatusLabel(key, language)}
            <span>({statusCounts[key]})</span>
          </button>
        ))}
      </div>

      ) : null}

      <div className="admin-table-toolbar">
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t("Rechercher par nom, e-mail, poste, compétence…", "Search by name, email, role, skill…")} />
        <div className="jy-list-tools">
          <AdminAdvancedFilters fields={filterFields} value={filters} onChange={setFilters} language={language} />
          <AdminColumnSelector columns={columnDefs} visible={cols.visible} onToggle={cols.toggle} onReset={cols.reset} language={language} />
          <AdminExportMenu language={language} title={t("Vivier de candidats", "Candidate pool")} fileBase="vivier-candidats" columns={visibleColumns} rows={filtered} filters={filterSummary} />
        </div>
      </div>

      {error ? <p className="field-error">{error}</p> : null}

      {items.length && view === "board" ? (
        <CandidatePipelineBoard items={baseFiltered} language={language} onMove={changeStatus} onOpen={(item) => setSelectedId(item.id)} />
      ) : items.length ? (
        <>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  {visibleColumns.map((column) => (
                    <th key={column.key}>{column.label}</th>
                  ))}
                  <th />
                </tr>
              </thead>
              <tbody>
                {paged.length ? (
                  paged.map((item) => (
                    <tr key={item.id} className={`jy-row-click ${selectedId === item.id ? "is-selected" : ""}`} onClick={() => setSelectedId(item.id)}>
                      <td>
                        <div className="admin-table-name">
                          <AvatarCircle user={item} />
                          <div>
                            <strong>{candidateName(item)}</strong>
                            <span className="muted">{item.email || "-"}</span>
                          </div>
                        </div>
                      </td>
                      {cols.isVisible("headline") ? <td>{item.headline || <span className="muted">-</span>}</td> : null}
                      {cols.isVisible("skills") ? (
                        <td>
                          {item.skills?.length ? (
                            <span className="jy-skill-chips">
                              {item.skills.slice(0, 2).map((skill) => (
                                <span key={skill} className="jy-chip small">
                                  {skill}
                                </span>
                              ))}
                              {item.skills.length > 2 ? <span className="jy-chip small muted">+{item.skills.length - 2}</span> : null}
                            </span>
                          ) : (
                            <span className="muted">-</span>
                          )}
                        </td>
                      ) : null}
                      {cols.isVisible("status") ? (
                        <td onClick={(event) => event.stopPropagation()}>
                          <select className={`jy-status-select ${CANDIDATE_STATUS_TONES[item.status]}`} value={item.status} disabled={Boolean(item.anonymizedAt)} onChange={(event) => changeStatus(item, event.target.value)} aria-label={t("Étape", "Stage")}>
                            {CANDIDATE_STATUSES.map((key) => (
                              <option key={key} value={key}>
                                {candidateStatusLabel(key, language)}
                              </option>
                            ))}
                          </select>
                        </td>
                      ) : null}
                      {cols.isVisible("followUp") ? (
                        <td className="jy-nowrap">
                          {item.followUpDate ? <span className={`jy-followup ${item.followUpDue ? "due" : ""}`}>{followUpText(item)}</span> : <span className="muted">-</span>}
                        </td>
                      ) : null}
                      {cols.isVisible("consent") ? (
                        <td>
                          <StatusPill tone={CONSENT_LABELS[item.consentStatus || "pending"]?.tone}>{CONSENT_LABELS[item.consentStatus || "pending"]?.short[language === "en" ? "en" : "fr"]}</StatusPill>
                        </td>
                      ) : null}
                      {cols.isVisible("added") ? <td className="muted jy-nowrap">{formatDateTime(item.createdAt, language)}</td> : null}
                      {cols.isVisible("phone") ? <td className="jy-nowrap">{item.phone || <span className="muted">-</span>}</td> : null}
                      {cols.isVisible("cv") ? <td>{item.hasCv ? <span className="jy-chip small">{item.cvFileName || "CV"}</span> : <span className="muted">-</span>}</td> : null}
                      <td className="jy-actions-cell" onClick={(event) => event.stopPropagation()}>
                        <button type="button" className="admin-row-action icon-only" title={t("Modifier", "Edit")} aria-label={t("Modifier", "Edit")} disabled={Boolean(item.anonymizedAt)} onClick={() => openEdit(item)}>
                          <AdminLineIcon name="edit" />
                        </button>
                        <button type="button" className="admin-row-action danger icon-only" title={t("Supprimer", "Delete")} aria-label={t("Supprimer", "Delete")} onClick={() => remove(item)}>
                          <AdminLineIcon name="trash" />
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={visibleColumns.length + 1} className="admin-table-empty muted">
                      {t("Aucun candidat ne correspond à ces critères.", "No candidate matches these criteria.")}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <AdminPagination page={page} totalPages={totalPages} onChange={setPage} language={language} totalItems={filtered.length} />
        </>
      ) : (
        <div className="jy-card jy-empty-block">
          <span className="jy-empty-icon">
            <AdminLineIcon name="accounts" />
          </span>
          <strong>{t("Votre vivier est vide", "Your pool is empty")}</strong>
          <span>{t("Ajoutez votre premier candidat à la main, ou importez un CV pour préremplir la fiche par IA.", "Add your first candidate by hand, or import a CV to prefill the form with AI.")}</span>
          <button type="button" className="jy-btn jy-btn-primary" onClick={openCreate}>
            <AdminLineIcon name="plus" />
            {t("Ajouter un candidat", "Add a candidate")}
          </button>
        </div>
      )}

      <JyDrawer
        open={Boolean(selected)}
        onClose={() => setSelectedId("")}
        language={language}
        avatar={selected ? <AvatarCircle user={selected} /> : null}
        title={selected ? candidateName(selected) : ""}
        subtitle={selected?.headline || selected?.email}
        badges={
          selected ? (
            <>
              <StatusPill tone={CANDIDATE_STATUS_TONES[selected.status]}>{candidateStatusLabel(selected.status, language)}</StatusPill>
              <StatusPill tone={CONSENT_LABELS[selected.consentStatus || "pending"]?.tone}>{CONSENT_LABELS[selected.consentStatus || "pending"]?.[language === "en" ? "en" : "fr"]}</StatusPill>
              {selected.followUpDue ? <StatusPill tone="danger">{t("Relance à faire", "Follow-up due")}</StatusPill> : null}
            </>
          ) : null
        }
        sections={
          selected
            ? [
                {
                  title: t("Coordonnées", "Contact"),
                  rows: [
                    ["E-mail", selected.email || ""],
                    [t("Téléphone", "Phone"), selected.phone || ""],
                    [t("Poste visé", "Target role"), selected.headline || ""]
                  ]
                },
                {
                  title: t("Suivi", "Tracking"),
                  rows: [
                    [t("Ajouté le", "Added on"), formatDateTime(selected.createdAt, language)],
                    [t("Mis à jour le", "Updated on"), selected.updatedAt ? formatDateTime(selected.updatedAt, language) : ""],
                    [t("Rappel de relance", "Follow-up reminder"), followUpText(selected)],
                    ["CV", selected.cvFileName || (selected.hasCv ? t("Importé", "Imported") : t("Aucun", "None"))]
                  ]
                },
                {
                  title: t("RGPD", "GDPR"),
                  rows: [
                    [t("Consentement", "Consent"), CONSENT_LABELS[selected.consentStatus || "pending"]?.[language === "en" ? "en" : "fr"]],
                    [t("Recueilli", "Collected"), CONSENT_SOURCES[selected.consentSource]?.[language === "en" ? "en" : "fr"] || ""],
                    [t("Le", "On"), selected.consentAt ? formatDateTime(selected.consentAt, language) : ""],
                    [t("Anonymisé le", "Anonymized on"), selected.anonymizedAt ? formatDateTime(selected.anonymizedAt, language) : ""]
                  ]
                },
                {
                  title: t("Missions, entretiens et e-mails", "Missions, interviews and emails"),
                  content: <CandidateTimeline userId={user.id} candidateId={selected.id} language={language} refreshKey={timelineKey} />
                },
                selected.skills?.length
                  ? {
                      title: t("Compétences", "Skills"),
                      content: (
                        <div className="jy-chip-cloud">
                          {selected.skills.map((skill) => (
                            <span key={skill} className="jy-chip">
                              {skill}
                            </span>
                          ))}
                        </div>
                      )
                    }
                  : null,
                selected.notes
                  ? {
                      title: t("Notes", "Notes"),
                      content: <p className="jy-drawer-text">{selected.notes}</p>
                    }
                  : null,
                selected.anonymizedAt
                  ? null
                  : {
                      title: t("Notes de suivi", "Follow-up notes"),
                      content: <CandidateNotes key={selected.id} userId={user.id} candidateId={selected.id} language={language} confirm={confirm} />
                    }
              ].filter(Boolean)
            : []
        }
        footer={
          selected ? (
            selected.anonymizedAt ? (
              <button type="button" className="jy-btn jy-btn-danger-outline" onClick={() => remove(selected)}>
                <AdminLineIcon name="trash" />
                {t("Supprimer", "Delete")}
              </button>
            ) : (
              <>
                <button
                  type="button"
                  className="jy-btn jy-btn-primary"
                  disabled={!selected.email || selected.consentStatus === "refused"}
                  title={selected.consentStatus === "refused" ? t("Le candidat a refusé d'être contacté.", "The candidate refused to be contacted.") : !selected.email ? t("Aucune adresse e-mail.", "No email address.") : undefined}
                  onClick={() => setEmailFor(selected)}
                >
                  <AdminLineIcon name="send" />
                  {t("Écrire", "Email")}
                </button>
                <button type="button" className="jy-btn jy-btn-outline" onClick={() => setInterviewFor(selected)}>
                  <AdminLineIcon name="calendar" />
                  {t("Entretien", "Interview")}
                </button>
                <button type="button" className="jy-btn jy-btn-outline" onClick={() => openEdit(selected)}>
                  <AdminLineIcon name="edit" />
                  {t("Modifier", "Edit")}
                </button>
                <button type="button" className="jy-btn jy-btn-outline" onClick={() => downloadCandidateData(user.id, selected, language)}>
                  <AdminLineIcon name="download" />
                  {t("Exporter ses données", "Export data")}
                </button>
                {isCabinetOwner ? (
                  <button type="button" className="jy-btn jy-btn-outline" onClick={() => anonymize(selected)}>
                    <AdminLineIcon name="reset" />
                    {t("Anonymiser", "Anonymize")}
                  </button>
                ) : null}
                <button type="button" className="jy-btn jy-btn-danger-outline" onClick={() => remove(selected)}>
                  <AdminLineIcon name="trash" />
                  {t("Supprimer", "Delete")}
                </button>
              </>
            )
          ) : null
        }
      />

      {formOpen ? (
        <CandidateFormDialog
          key={editingId || "new"}
          language={language}
          userId={user.id}
          item={editing}
          confirm={confirm}
          onClose={() => setFormOpen(false)}
          onSaved={async (id) => {
            setFormOpen(false);
            await reload();
            if (id) setSelectedId(id);
            cabinetToast({ title: editing ? t("Candidat mis à jour.", "Candidate updated.") : t("Candidat ajouté au vivier.", "Candidate added to the pool.") });
          }}
        />
      ) : null}

      {emailFor ? (
        <CandidateEmailDialog
          language={language}
          userId={user.id}
          candidate={emailFor}
          onClose={() => setEmailFor(null)}
          onSent={async () => {
            setEmailFor(null);
            await reload();
            setTimelineKey((value) => value + 1);
          }}
        />
      ) : null}
      {interviewFor ? (
        <InterviewFormDialog
          language={language}
          userId={user.id}
          presetCandidate={interviewFor}
          candidates={items}
          missions={missions}
          onClose={() => setInterviewFor(null)}
          onSaved={async () => {
            setInterviewFor(null);
            await reload();
            setTimelineKey((value) => value + 1);
            cabinetToast({ title: t("Entretien planifié.", "Interview scheduled.") });
          }}
        />
      ) : null}
      {confirmDialog}
    </section>
  );
}

function toPayload(item) {
  return {
    firstName: item.firstName || "",
    lastName: item.lastName || "",
    email: item.email || "",
    phone: item.phone || "",
    headline: item.headline || "",
    skills: item.skills || [],
    notes: item.notes || "",
    status: item.status || "sourced",
    followUpDate: item.followUpDate ? String(item.followUpDate).slice(0, 10) : "",
    cvFileName: item.cvFileName || "",
    consentStatus: item.consentStatus || "pending",
    consentSource: item.consentSource || ""
  };
}

// Historique des notes d'un candidat (appels, retours client…).
function CandidateNotes({ userId, candidateId, language, confirm }) {
  const t = (fr, en) => (language === "en" ? en : fr);
  const [notes, setNotes] = useState(null);
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);

  function reload() {
    getCabinetCandidateNotes(userId, candidateId)
      .then(setNotes)
      .catch(() => setNotes([]));
  }

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [candidateId]);

  async function add(event) {
    event?.preventDefault();
    if (!text.trim()) return;
    setSaving(true);
    try {
      await addCabinetCandidateNote(userId, candidateId, text.trim());
      setText("");
      reload();
    } catch (err) {
      cabinetToast({ title: getFriendlyErrorMessage(err, language), icon: "error" });
    } finally {
      setSaving(false);
    }
  }

  async function remove(note) {
    const ok = await confirm({ title: t("Supprimer cette note ?", "Delete this note?"), detail: note.body, confirmLabel: t("Supprimer", "Delete") });
    if (!ok) return;
    await deleteCabinetCandidateNote(userId, candidateId, note.id);
    reload();
  }

  return (
    <div className="jy-notes">
      <form className="jy-notes-add" onSubmit={add}>
        <input value={text} onChange={(event) => setText(event.target.value)} placeholder={t("Ajouter une note (appel, retour client…)", "Add a note (call, client feedback…)")} maxLength={2000} />
        <button type="submit" className="jy-btn jy-btn-primary jy-btn-sm" disabled={saving || !text.trim()}>
          {saving ? <span className="btn-spinner" /> : <AdminLineIcon name="plus" />}
          {t("Ajouter", "Add")}
        </button>
      </form>
      {notes === null ? (
        <p className="jy-drawer-empty">{t("Chargement…", "Loading…")}</p>
      ) : notes.length ? (
        <ul className="jy-note-list">
          {notes.map((note) => (
            <li key={note.id}>
              <span className="jy-note-dot" aria-hidden="true" />
              <div>
                <small>
                  {formatDateTime(note.createdAt, language)} · {note.authorName || t("Équipe", "Team")}
                </small>
                <p>{note.body}</p>
              </div>
              <button type="button" className="jy-icon-btn small" title={t("Supprimer", "Delete")} aria-label={t("Supprimer", "Delete")} onClick={() => remove(note)}>
                <AdminLineIcon name="trash" />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="jy-drawer-empty">{t("Aucune note pour l'instant.", "No note yet.")}</p>
      )}
    </div>
  );
}

// Création / modification d'un candidat, avec préremplissage depuis un CV.
function CandidateFormDialog({ language, userId, item, confirm, onClose, onSaved }) {
  const t = (fr, en) => (language === "en" ? en : fr);
  const [form, setForm] = useState(() => (item ? { ...EMPTY_FORM, ...toPayload(item), skills: (item.skills || []).join(", ") } : EMPTY_FORM));
  const [touched, setTouched] = useState(false);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef(null);
  const update = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const nameError = !form.firstName.trim() && !form.lastName.trim() ? t("Indiquez au moins un prénom ou un nom.", "Enter at least a first or last name.") : "";
  const emailError = form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form.email.trim()) ? t("Adresse e-mail invalide.", "Invalid email address.") : "";
  const phoneError = form.phone.trim() && !/^\+?[0-9 ]{6,20}$/.test(form.phone.trim()) ? t("Chiffres uniquement (et + au début).", "Digits only (and a leading +).") : "";

  async function readCv(file) {
    if (!file) return;
    setFormError("");
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
        cvFileName: result.fileName || file.name,
        sourceText: result.sourceText || "",
        parsedJson: parsed
      }));
    } catch (err) {
      setFormError(getFriendlyErrorMessage(err, language) || t("Impossible de lire ce CV.", "Could not read this CV."));
    } finally {
      setExtracting(false);
    }
  }

  async function submit(event) {
    event?.preventDefault();
    setTouched(true);
    if (nameError || emailError || phoneError) return;
    setSaving(true);
    setFormError("");
    const payload = {
      ...form,
      phone: form.phone.trim(),
      email: form.email.trim(),
      skills: form.skills
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean),
      followUpDate: form.followUpDate || ""
    };
    try {
      if (item) {
        await updateCabinetCandidate(userId, item.id, payload);
        await onSaved(item.id);
      } else {
        const result = await createCabinetCandidate(userId, payload);
        await onSaved(result?.id || "");
      }
    } catch (err) {
      if (err?.statusCode === 409 && err?.duplicate) {
        setSaving(false);
        const ok = await confirm({
          icon: "alert",
          tone: "brand",
          title: t("Doublon possible", "Possible duplicate"),
          description: candidateName(err.duplicate),
          detail:
            err.duplicateReason === "cv"
              ? t("Ce CV a déjà été importé pour ce candidat du vivier. L'ajouter quand même ?", "This CV was already imported for this pool candidate. Add anyway?")
              : t("Un candidat du vivier a déjà cet e-mail ou ce téléphone. L'ajouter quand même ?", "A candidate in the pool already has this email or phone. Add anyway?"),
          confirmLabel: t("Ajouter quand même", "Add anyway")
        });
        if (!ok) return;
        setSaving(true);
        try {
          const result = await createCabinetCandidate(userId, { ...payload, force: "1" });
          await onSaved(result?.id || "");
        } catch (retryError) {
          setFormError(getFriendlyErrorMessage(retryError, language));
        }
      } else {
        setFormError(getFriendlyErrorMessage(err, language));
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <MfaDialog
      open
      onClose={() => !saving && !extracting && onClose()}
      icon={item ? "edit" : "plus"}
      title={item ? t("Modifier le candidat", "Edit candidate") : t("Ajouter un candidat", "Add a candidate")}
      description={item ? candidateName(item) : t("Importez un CV pour préremplir la fiche, ou saisissez-la à la main.", "Import a CV to prefill the form, or fill it in by hand.")}
      width={620}
      footer={
        <>
          <button type="button" className="mfa-btn ghost" onClick={onClose} disabled={saving}>
            {t("Annuler", "Cancel")}
          </button>
          <button type="button" className="mfa-btn primary" onClick={submit} disabled={saving || extracting}>
            {saving ? <span className="mfa-spinner" /> : null}
            {item ? t("Enregistrer", "Save") : t("Ajouter au vivier", "Add to the pool")}
          </button>
        </>
      }
    >
      <MfaError message={formError} />
      <div
        className={`jy-dropzone compact ${dragOver ? "is-over" : ""} ${extracting ? "is-busy" : ""}`}
        onDragOver={(event) => {
          event.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragOver(false);
          readCv(event.dataTransfer.files?.[0]);
        }}
        onClick={() => !extracting && fileRef.current?.click()}
        role="button"
        tabIndex={0}
      >
        <input ref={fileRef} type="file" accept=".pdf,.docx,.doc,.txt" hidden onChange={(event) => readCv(event.target.files?.[0])} />
        <span className="jy-dropzone-icon">{extracting ? <span className="btn-spinner dark" /> : <AdminLineIcon name="upload" />}</span>
        <span className="jy-dropzone-text">
          <strong>
            {extracting
              ? t("Lecture du CV par l'IA…", "AI is reading the CV…")
              : form.cvFileName
              ? t(`Prérempli depuis ${form.cvFileName}`, `Prefilled from ${form.cvFileName}`)
              : t("Importer un CV (préremplissage IA)", "Import a CV (AI prefill)")}
          </strong>
          <small>{t("PDF, DOCX ou TXT · glissez-déposez ou cliquez", "PDF, DOCX or TXT · drag and drop or click")}</small>
        </span>
      </div>

      <form className="jy-promo-form" onSubmit={submit} noValidate>
        <label className={`mfa-field ${touched && nameError ? "has-error" : ""}`}>
          <span>{t("Prénom", "First name")}</span>
          <input autoFocus maxLength={80} value={form.firstName} onChange={(event) => update("firstName", event.target.value)} />
          {touched && nameError ? <small className="jy-field-error">{nameError}</small> : null}
        </label>
        <label className="mfa-field">
          <span>{t("Nom", "Last name")}</span>
          <input maxLength={80} value={form.lastName} onChange={(event) => update("lastName", event.target.value)} />
        </label>
        <label className={`mfa-field ${touched && emailError ? "has-error" : ""}`}>
          <span>E-mail</span>
          <input type="email" maxLength={160} value={form.email} placeholder="prenom.nom@exemple.fr" onChange={(event) => update("email", event.target.value)} />
          {touched && emailError ? <small className="jy-field-error">{emailError}</small> : null}
        </label>
        <label className={`mfa-field ${touched && phoneError ? "has-error" : ""}`}>
          <span>{t("Téléphone", "Phone")}</span>
          <input
            inputMode="tel"
            maxLength={20}
            value={form.phone}
            placeholder="+33 6 12 34 56 78"
            onChange={(event) => update("phone", event.target.value.replace(/[^0-9+ ]/g, "").replace(/(?!^)\+/g, ""))}
          />
          {touched && phoneError ? <small className="jy-field-error">{phoneError}</small> : null}
        </label>
        <label className="mfa-field wide">
          <span>{t("Titre / poste visé", "Headline / target role")}</span>
          <input maxLength={120} value={form.headline} placeholder={t("Ex. Data Engineer senior", "e.g. Senior Data Engineer")} onChange={(event) => update("headline", event.target.value)} />
        </label>
        <label className="mfa-field wide">
          <span>{t("Compétences (séparées par des virgules)", "Skills (comma-separated)")}</span>
          <input value={form.skills} placeholder="Python, SQL, Spark" onChange={(event) => update("skills", event.target.value)} />
        </label>
        <label className="mfa-field">
          <span>{t("Étape", "Stage")}</span>
          <select value={form.status} onChange={(event) => update("status", event.target.value)}>
            {CANDIDATE_STATUSES.map((key) => (
              <option key={key} value={key}>
                {candidateStatusLabel(key, language)}
              </option>
            ))}
          </select>
        </label>
        <label className="mfa-field">
          <span>{t("Rappel de relance", "Follow-up reminder")}</span>
          <input type="date" value={form.followUpDate} onChange={(event) => update("followUpDate", event.target.value)} />
        </label>
        <label className="mfa-field">
          <span>{t("Consentement RGPD", "GDPR consent")}</span>
          <select value={form.consentStatus} onChange={(event) => update("consentStatus", event.target.value)}>
            {["pending", "granted", "refused"].map((key) => (
              <option key={key} value={key}>
                {CONSENT_LABELS[key][language === "en" ? "en" : "fr"]}
              </option>
            ))}
          </select>
        </label>
        <label className="mfa-field">
          <span>{t("Recueilli", "Collected")}</span>
          <select value={form.consentSource} onChange={(event) => update("consentSource", event.target.value)} disabled={form.consentStatus === "pending"}>
            <option value="">{t("Non précisé", "Not specified")}</option>
            {Object.entries(CONSENT_SOURCES).map(([key, label]) => (
              <option key={key} value={key}>
                {label[language === "en" ? "en" : "fr"]}
              </option>
            ))}
          </select>
        </label>
        <label className="mfa-field wide">
          <span>{t("Notes", "Notes")}</span>
          <textarea rows={3} className="jy-textarea" maxLength={4000} value={form.notes} placeholder={t("Disponibilité, prétentions, points forts…", "Availability, salary expectations, strengths…")} onChange={(event) => update("notes", event.target.value)} />
        </label>
      </form>
    </MfaDialog>
  );
}
