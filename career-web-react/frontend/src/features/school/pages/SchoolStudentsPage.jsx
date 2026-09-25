import React from "react";
// Module École : shell + toutes les pages du dashboard école (étudiants,
// invitations, promotions, licence, statistiques, rapports, paramètres).
import { useState, useEffect, useRef } from "react";
import Swal from "sweetalert2";
import { UiIcon } from "../../../components/UiIcon.jsx";
import { AdminPageLoader } from "../../../components/AdminPageLoader.jsx";
import { AdminKpiCard } from "../../../components/AdminKpiCard.jsx";
import { AvatarCircle } from "../../../components/AvatarCircle.jsx";
import { LanguageSwitch } from "../../../components/LanguageSwitch.jsx";
import { getPlanById } from "../../../data/plans.js";
import { getFriendlyErrorMessage } from "../../../lib/errors.js";
import { formatDate, formatDateTime } from "../../../lib/format.js";
import { AdminAdvancedFilters, AdminColumnSelector, AdminExportMenu, useAdminColumns, inAdminDateRange } from "../../admin/AdminListTools.jsx";
import { fileToBase64 } from "../../../lib/cvService.js";
import {
  getApiBase,
  getSchoolOverview,
  getSchoolStudents,
  getSchoolLicense,
  getSchoolInsights,
  getSchoolInvitations,
  getSchoolNotifications,
  getSchoolProfile,
  updateSchoolProfile,
  getSchoolPromotions,
  createSchoolPromotion,
  deleteSchoolPromotion,
  updateSchoolPromotionStudent,
  getSchoolReports,
  sendSchoolInvitation,
  removeSchoolStudent,
  markSchoolNotificationsRead,
  generateSchoolReport
} from "../../../lib/inMemoryDb.js";
// Composants partagés avec le module Admin (déplacement mécanique en
// attendant une extraction complète des composants réellement génériques) —
// import "arrière" volontaire, sûr au rendu uniquement.
import {
  AdminTrendChart,
  AdminDonutChart,
  AdminMiniMetric,
  AdminPagination,
  AdminLineIcon,
  JyDrawer,
  ADMIN_PAGE_SIZE,
  planPriceLabel
} from "../../admin/AdminApp.jsx";
import AccountDrawer from "../../account/AccountDrawer.jsx";
import { ConnectedFooter } from "../../../App.jsx";
import { SchoolExportCsvButton, SchoolLicenseCard, SchoolEmptyState } from "../SchoolApp.jsx";

// Colonnes proposées par « Colonnes » (préférence mémorisée par liste).
const STUDENT_COLUMN_KEYS = [
  { key: "name", required: true },
  { key: "promotion" },
  { key: "joined" },
  { key: "activity" },
  { key: "score" },
  { key: "status" },
  { key: "license", defaultHidden: true }
];

const scoreTone = (score) => (score >= 60 ? "good" : score >= 50 ? "mid" : "low");

export default function SchoolStudentsPage({ user, language, initialSearch }) {
  const copy =
    language === "en"
      ? {
          title: "Students",
          subtitle: "Students linked to your school's license.",
          search: "Search by name or email…",
          colName: "Name",
          colPromotion: "Promotion",
          colJoined: "Joined on",
          colActivity: "Last activity",
          colScore: "Latest score",
          colStatus: "Status",
          colActions: "Actions",
          active: "Active",
          inactive: "Inactive",
          never: "No activity yet",
          totalLabel: "Students",
          activeLabel: "Active accounts",
          scoredLabel: "With match score",
          remove: "Remove",
          removeTitle: "Remove this student",
          removeWarning: "This frees up a seat on your license. The student switches back to the free plan and keeps their data.",
          removeConfirm: "Remove",
          cancel: "Cancel",
          empty: "No student found."
        }
      : {
          title: "Étudiants",
          subtitle: "Étudiants rattachés à la licence de votre établissement.",
          search: "Rechercher par nom ou email…",
          colName: "Nom",
          colPromotion: "Promotion",
          colJoined: "Inscrit le",
          colActivity: "Dernière activité",
          colScore: "Dernier score",
          colStatus: "Statut",
          colActions: "Actions",
          active: "Actif",
          inactive: "Inactif",
          never: "Aucune activité",
          totalLabel: "Étudiants",
          activeLabel: "Comptes actifs",
          scoredLabel: "Avec score",
          remove: "Retirer",
          removeTitle: "Retirer cet étudiant",
          removeWarning: "Cela libère un siège sur votre licence. L'étudiant repasse au plan gratuit et conserve ses données.",
          removeConfirm: "Retirer",
          cancel: "Annuler",
          empty: "Aucun étudiant trouvé."
        };

  const [students, setStudents] = useState([]);
  const [search, setSearch] = useState(initialSearch || "");
  const [page, setPage] = useState(1);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(null);
  const [filters, setFilters] = useState(() => ({ status: "", promotion: "", score: "", joinedFrom: "", joinedTo: "" }));
  const cols = useAdminColumns("career_app_school_cols_students", STUDENT_COLUMN_KEYS);

  useEffect(() => {
    setPage(1);
  }, [filters]);

  useEffect(() => {
    if (initialSearch) setSearch(initialSearch);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialSearch]);

  function reload() {
    getSchoolStudents(user.id, { search })
      .then(setStudents)
      .catch((err) => setError(getFriendlyErrorMessage(err, language)));
  }

  useEffect(() => {
    setPage(1);
    setError("");
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const t = (fr, en) => (language === "en" ? en : fr);
  const fullName = (student) => `${student.firstName || ""} ${student.lastName || ""}`.trim() || student.email;
  const activityText = (student) => (student.lastActivity ? formatDateTime(student.lastActivity, language) : copy.never);
  const statusText = (student) => (student.active ? copy.active : copy.inactive);
  const scoreBand = (student) =>
    student.latestScore == null ? "none" : student.latestScore >= 60 ? "ready" : student.latestScore >= 50 ? "mid" : "low";

  const columnDefs = [
    {
      key: "name",
      label: copy.colName,
      required: true,
      exportColumns: [
        { label: copy.colName, value: fullName },
        { label: "E-mail", value: (student) => student.email }
      ]
    },
    { key: "promotion", label: copy.colPromotion, exportValue: (student) => student.promotionName || "" },
    { key: "joined", label: copy.colJoined, exportValue: (student) => formatDateTime(student.createdAt, language) },
    { key: "activity", label: copy.colActivity, exportValue: activityText },
    { key: "score", label: copy.colScore, exportValue: (student) => (student.latestScore == null ? "" : student.latestScore) },
    { key: "status", label: copy.colStatus, exportValue: statusText },
    { key: "license", label: t("Code de licence", "License code"), defaultHidden: true, exportValue: (student) => student.licenseCode || "" }
  ];
  const visibleColumnDefs = columnDefs.filter((column) => cols.isVisible(column.key));

  const promotionNames = [...new Set(students.map((student) => student.promotionName).filter(Boolean))];
  const filterFields = [
    {
      key: "status",
      label: copy.colStatus,
      allLabel: t("Tous les statuts", "All statuses"),
      options: [
        { value: "active", label: copy.active },
        { value: "inactive", label: copy.inactive }
      ]
    },
    {
      key: "promotion",
      label: copy.colPromotion,
      allLabel: t("Toutes les promotions", "All promotions"),
      options: [{ value: "__none", label: t("Sans promotion", "No promotion") }, ...promotionNames.map((name) => ({ value: name, label: name }))]
    },
    {
      key: "score",
      label: copy.colScore,
      allLabel: t("Tous les scores", "All scores"),
      options: [
        { value: "ready", label: t("Prêt à l'emploi (60 % et plus)", "Job-ready (60% and above)") },
        { value: "mid", label: t("À consolider (50 à 59 %)", "To consolidate (50-59%)") },
        { value: "low", label: t("Faible (moins de 50 %)", "Low (below 50%)") },
        { value: "none", label: t("Pas encore de score", "No score yet") }
      ]
    },
    { key: "joined", label: t("Inscrit entre le", "Joined between"), type: "dateRange" }
  ];
  const filteredStudents = students.filter(
    (student) =>
      (!filters.status || (student.active ? "active" : "inactive") === filters.status) &&
      (!filters.promotion || (filters.promotion === "__none" ? !student.promotionName : student.promotionName === filters.promotion)) &&
      (!filters.score || scoreBand(student) === filters.score) &&
      inAdminDateRange(student.createdAt, filters.joinedFrom, filters.joinedTo)
  );
  const filterSummary = [
    search ? `${t("Recherche", "Search")} : ${search}` : "",
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

  const totalPages = Math.max(1, Math.ceil(filteredStudents.length / ADMIN_PAGE_SIZE));
  const pagedStudents = filteredStudents.slice((page - 1) * ADMIN_PAGE_SIZE, page * ADMIN_PAGE_SIZE);
  const activeCount = students.filter((student) => student.active).length;
  const scoredCount = students.filter((student) => student.latestScore != null).length;
  const readyCount = students.filter((student) => student.latestScore != null && student.latestScore >= 60).length;
  const avgScore = scoredCount ? Math.round(students.reduce((sum, student) => sum + (student.latestScore || 0), 0) / scoredCount) : null;

  const cards = [
    { icon: "accounts", label: copy.totalLabel, value: students.length, tone: "" },
    { icon: "activity", label: copy.activeLabel, value: `${activeCount} / ${students.length}`, tone: "green" },
    { icon: "trend", label: t("Score moyen", "Average score"), value: avgScore == null ? "-" : `${avgScore} %`, tone: "gold" },
    { icon: "quality", label: t("Prêts à l'emploi", "Job-ready"), value: readyCount, tone: "green" }
  ];

  async function handleRemove(student) {
    const result = await Swal.fire({
      icon: "warning",
      title: copy.removeTitle,
      html: `<p style="text-align:left;margin-bottom:0.6rem;">${copy.removeWarning}</p><p style="text-align:left;font-weight:700;">${student.firstName} ${student.lastName} · ${student.email}</p>`,
      showCancelButton: true,
      confirmButtonText: copy.removeConfirm,
      cancelButtonText: copy.cancel,
      confirmButtonColor: "#cf1322",
      focusCancel: true
    });

    if (!result.isConfirmed) return;

    try {
      await removeSchoolStudent(user.id, student.id);
      reload();
      Swal.fire({
        toast: true,
        position: "top-end",
        icon: "success",
        title: language === "en" ? "Student removed." : "Étudiant retiré.",
        showConfirmButton: false,
        timer: 2800,
        timerProgressBar: true,
        customClass: { popup: "career-toast", title: "career-toast-title" }
      });
    } catch (err) {
      Swal.fire({ icon: "error", title: getFriendlyErrorMessage(err, language) });
    }
  }

  return (
    <section className="admin-accounts">
      <header className="module-header">
        <div>
          <h2>{copy.title}</h2>
          <p>{copy.subtitle}</p>
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
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={copy.search} />
        <div className="jy-list-tools">
          <AdminAdvancedFilters fields={filterFields} value={filters} onChange={setFilters} language={language} />
          <AdminColumnSelector columns={columnDefs} visible={cols.visible} onToggle={cols.toggle} onReset={cols.reset} language={language} />
          <AdminExportMenu language={language} title={copy.title} fileBase="etudiants" columns={visibleColumnDefs} rows={filteredStudents} filters={filterSummary} />
        </div>
      </div>

      {error ? <p className="field-error">{error}</p> : null}

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              {visibleColumnDefs.map((column) => (
                <th key={column.key}>{column.label}</th>
              ))}
              <th />
            </tr>
          </thead>
          <tbody>
            {pagedStudents.length ? (
              pagedStudents.map((student) => (
                <tr key={student.id} className={`jy-row-click ${selected?.id === student.id ? "is-selected" : ""}`} onClick={() => setSelected(student)}>
                  <td>
                    <div className="admin-table-name">
                      <AvatarCircle user={student} />
                      <div>
                        <strong>{fullName(student)}</strong>
                        <span className="muted">{student.email}</span>
                      </div>
                    </div>
                  </td>
                  {cols.isVisible("promotion") ? (
                    <td>{student.promotionName ? <span className="tag">{student.promotionName}</span> : <span className="muted">{t("Aucune", "None")}</span>}</td>
                  ) : null}
                  {cols.isVisible("joined") ? <td className="muted jy-nowrap">{formatDateTime(student.createdAt, language)}</td> : null}
                  {cols.isVisible("activity") ? <td className="muted jy-nowrap">{activityText(student)}</td> : null}
                  {cols.isVisible("score") ? (
                    <td>
                      {student.latestScore != null ? (
                        <span className={`jy-score ${scoreTone(student.latestScore)}`}>{student.latestScore} %</span>
                      ) : (
                        <span className="muted">{t("Aucun", "None")}</span>
                      )}
                    </td>
                  ) : null}
                  {cols.isVisible("status") ? (
                    <td>
                      <span className={`jy-dot-status ${student.active ? "on" : ""}`}>{statusText(student)}</span>
                    </td>
                  ) : null}
                  {cols.isVisible("license") ? (
                    <td>
                      <code className="admin-license-code">{student.licenseCode || ""}</code>
                    </td>
                  ) : null}
                  <td className="jy-actions-cell" onClick={(event) => event.stopPropagation()}>
                    <button type="button" className="admin-row-action danger icon-only" title={copy.remove} aria-label={copy.remove} onClick={() => handleRemove(student)}>
                      <AdminLineIcon name="trash" />
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={visibleColumnDefs.length + 1} className="admin-table-empty muted">
                  {copy.empty}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <AdminPagination page={page} totalPages={totalPages} onChange={setPage} language={language} totalItems={filteredStudents.length} />

      <JyDrawer
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        language={language}
        avatar={selected ? <AvatarCircle user={selected} /> : null}
        title={selected ? fullName(selected) : ""}
        subtitle={selected?.email}
        badges={
          selected ? (
            <>
              <span className={`tag ${selected.active ? "tag-success" : ""}`}>{statusText(selected)}</span>
              {selected.latestScore != null ? <span className={`jy-score ${scoreTone(selected.latestScore)}`}>{selected.latestScore} %</span> : null}
            </>
          ) : null
        }
        sections={
          selected
            ? [
                {
                  title: t("Parcours", "Journey"),
                  rows: [
                    [copy.colJoined, formatDateTime(selected.createdAt, language)],
                    [copy.colActivity, activityText(selected)],
                    [copy.colPromotion, selected.promotionName || t("Aucune", "None")]
                  ]
                },
                {
                  title: t("Employabilité", "Employability"),
                  rows: [
                    [copy.colScore, selected.latestScore != null ? `${selected.latestScore} %` : t("Pas encore de score", "No score yet")],
                    [
                      t("Niveau", "Level"),
                      selected.latestScore == null
                        ? t("À évaluer", "To assess")
                        : selected.latestScore >= 60
                        ? t("Prêt à l'emploi", "Job-ready")
                        : selected.latestScore >= 50
                        ? t("À consolider", "To consolidate")
                        : t("À accompagner", "Needs support")
                    ]
                  ]
                },
                {
                  title: t("Licence", "License"),
                  rows: [[t("Code utilisé", "Code used"), selected.licenseCode || ""]]
                }
              ]
            : []
        }
        footer={
          selected ? (
            <button
              type="button"
              className="admin-row-action danger"
              onClick={() => {
                const target = selected;
                setSelected(null);
                handleRemove(target);
              }}
            >
              <AdminLineIcon name="trash" /> {copy.remove}
            </button>
          ) : null
        }
      />
    </section>
  );
}
