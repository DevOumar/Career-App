import React from "react";
// Module Admin : interface d'administration de la plateforme (dashboard,
// comptes, finance, licences, modération IA, paramètres, annonces...).
// Le dashboard École vit désormais séparément dans features/school/ ; les
// deux modules continuent de partager quelques composants (AdminKpiCard,
// AdminTrendChart, AdminPagination...) exportés d'ici et importés par
// features/school/SchoolApp.jsx.
//
// NOTE : ce fichier reste volumineux (déplacement mécanique depuis App.jsx,
// pas une réécriture) — un découpage en un fichier par page admin est une
// suite possible, pas un prérequis pour que ce module soit isolé du reste
// de l'app.
import { useState, useEffect, useRef } from "react";
import Swal from "sweetalert2";
import { UiIcon } from "../../../components/UiIcon.jsx";
import { AdminPageLoader } from "../../../components/AdminPageLoader.jsx";
import { AdminKpiCard } from "../../../components/AdminKpiCard.jsx";
import { AdminAdvancedFilters, AdminColumnSelector, AdminExportMenu, useAdminColumns, inAdminDateRange } from "../AdminListTools.jsx";
import { AvatarCircle } from "../../../components/AvatarCircle.jsx";
import { LanguageSwitch } from "../../../components/LanguageSwitch.jsx";
// AccountDrawer/ConnectedFooter restent définis dans App.jsx (composants
// d'app-shell partagés avec le candidat) — import "arrière" volontaire, sûr
// ici car ces composants ne sont utilisés qu'au rendu (jamais à
// l'évaluation du module), bien après la résolution du cycle ESM.
import AccountDrawer from "../../account/AccountDrawer.jsx";
import { ConnectedFooter, ADMIN_ACCOUNT_TYPES } from "../../../App.jsx";
import { PLANS, PLAN_SEGMENTS, getPlanById, resolvePlanId, mergeByResolvedPlan } from "../../../data/plans.js";
import { getFriendlyErrorMessage } from "../../../lib/errors.js";
import { formatDate, formatDateTime, formatShortDate, formatAmountInCurrency, formatPlanPrice } from "../../../lib/format.js";
import { fileToBase64 } from "../../../lib/cvService.js";
import { getAccountLabel } from "../../../lib/accounts.js";
import { satisfactionTierFor } from "../../satisfaction/SatisfactionSurveyModal.jsx";
import {
  createAdminUser,
  deleteAdminUser,
  getAdminActivityLog,
  getAdminAiMonitoring,
  getAdminAiSamples,
  getAdminCvs,
  getAdminFinance,
  getAdminLicenseCodes,
  getAdminMatches,
  getAdminOrgAccounts,
  getAdminOverview,
  getAdminNotifications,
  getAdminQuality,
  getPlanOverrides,
  getAdminPlans,
  updateAdminPlan,
  resetAdminPlan,
  refundAdminTransaction,
  getAdminSettings,
  revokeAdminLicenseCode,
  restoreAdminLicenseCode,
  getAdminAnnouncementAudienceCount,
  getAdminAnnouncements,
  sendAdminAnnouncement,
  deleteAdminCv,
  reanalyzeAdminCv,
  updateAdminSetting,
  updateAdminUser,
  updateAdminUserStatus,
  listAdminUsers,
  getAdminSatisfaction,
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
import { AdminLineIcon, JyDrawer, AdminTrendChart, AdminDonutChart, AdminPagination, AdminOrgCard, AdminMiniMetric, formatEur, planPriceLabel, getPaginationRange, eventTypeLabel, adminNotificationText, getAllowedAdminModules, ADMIN_MODULE_DEFS, ADMIN_MODULE_LABELS, ADMIN_DASHBOARD_ROLES, ADMIN_ACCOUNT_SUBTABS, ADMIN_PAGE_SIZE, ADMIN_FINANCE_SOURCES, ADMIN_EVENT_LABELS, ADMIN_ANNOUNCEMENT_AUDIENCES } from "../AdminApp.jsx";

const LICENSE_COLUMN_KEYS = [
  { key: "code", required: true },
  { key: "owner" },
  { key: "plan" },
  { key: "seats" },
  { key: "created", defaultHidden: true },
  { key: "status" }
];

export default function AdminLicenseCodesPage({ user, language, initialSearch }) {
  const copy =
    language === "en"
      ? {
          title: "License codes",
          subtitle: "All license codes generated for agency and school seats.",
          search: "Search by code, owner or plan…",
          colCode: "Code",
          colOwner: "Owner",
          colPlan: "Plan",
          colSeats: "Seats",
          colStatus: "Status",
          colActions: "Actions",
          empty: "No license code found.",
          active: "Active",
          revoked: "Revoked",
          revoke: "Revoke",
          restore: "Restore",
          confirmRevokeTitle: "Revoke this license code?",
          confirmRevokeText: "It can no longer be redeemed by new members. Existing members keep their access.",
          confirmRevokeBtn: "Revoke",
          cancel: "Cancel"
        }
      : {
          title: "Codes de licence",
          subtitle: "Tous les codes de licence générés pour les sièges cabinet/école.",
          search: "Rechercher par code, propriétaire ou plan…",
          colCode: "Code",
          colOwner: "Propriétaire",
          colPlan: "Plan",
          colSeats: "Sièges",
          colStatus: "Statut",
          colActions: "Actions",
          empty: "Aucun code de licence trouvé.",
          active: "Actif",
          revoked: "Révoqué",
          revoke: "Révoquer",
          restore: "Restaurer",
          confirmRevokeTitle: "Révoquer ce code de licence ?",
          confirmRevokeText: "Il ne pourra plus être utilisé par de nouveaux membres. Les membres déjà inscrits gardent leur accès.",
          confirmRevokeBtn: "Révoquer",
          cancel: "Annuler"
        };

  const [items, setItems] = useState([]);
  const [error, setError] = useState("");
  const [search, setSearch] = useState(initialSearch || "");
  const [page, setPage] = useState(1);
  const [busyCode, setBusyCode] = useState("");
  const [selectedCode, setSelectedCode] = useState(null);
  const [filters, setFilters] = useState(() => ({ status: "", plan: "", occupancy: "", createdFrom: "", createdTo: "" }));
  const cols = useAdminColumns("career_app_admin_cols_licenses", LICENSE_COLUMN_KEYS);

  useEffect(() => {
    setPage(1);
  }, [filters]);

  async function copyCode(code) {
    try {
      await navigator.clipboard.writeText(code);
      Swal.fire({
        toast: true,
        position: "top-end",
        icon: "success",
        title: language === "en" ? "Code copied." : "Code copié.",
        showConfirmButton: false,
        timer: 2000,
        customClass: { popup: "career-toast", title: "career-toast-title" }
      });
    } catch (_error) {
      Swal.fire({ icon: "info", title: code });
    }
  }

  useEffect(() => {
    if (initialSearch) setSearch(initialSearch);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialSearch]);

  function load() {
    getAdminLicenseCodes(user.id, { search })
      .then(setItems)
      .catch((err) => setError(getFriendlyErrorMessage(err, language)));
  }

  useEffect(() => {
    setPage(1);
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  async function handleRevoke(code) {
    const result = await Swal.fire({
      icon: "warning",
      title: copy.confirmRevokeTitle,
      text: copy.confirmRevokeText,
      showCancelButton: true,
      confirmButtonText: copy.confirmRevokeBtn,
      cancelButtonText: copy.cancel,
      confirmButtonColor: "#cf1322"
    });
    if (!result.isConfirmed) return;
    setBusyCode(code);
    try {
      await revokeAdminLicenseCode(user.id, code);
      load();
    } catch (err) {
      Swal.fire({ icon: "error", title: getFriendlyErrorMessage(err, language) });
    } finally {
      setBusyCode("");
    }
  }

  async function handleRestore(code) {
    setBusyCode(code);
    try {
      await restoreAdminLicenseCode(user.id, code);
      load();
    } catch (err) {
      Swal.fire({ icon: "error", title: getFriendlyErrorMessage(err, language) });
    } finally {
      setBusyCode("");
    }
  }

  const t = (fr, en) => (language === "en" ? en : fr);
  const planName = (planId) => getPlanById(planId)?.name?.[language] || getPlanById(planId)?.name?.fr || planId || "";
  const ownerName = (item) => `${item.ownerFirstName || ""} ${item.ownerLastName || ""}`.trim();
  const occupancy = (item) => {
    const used = Number(item.seatsUsed || 0);
    const total = Number(item.seatsTotal || 0);
    if (total > 0 && used >= total) return "full";
    return used === 0 ? "unused" : "available";
  };

  const columnDefs = [
    { key: "code", label: copy.colCode, required: true, exportValue: (item) => item.code },
    {
      key: "owner",
      label: copy.colOwner,
      exportColumns: [
        { label: copy.colOwner, value: ownerName },
        { label: "E-mail", value: (item) => item.ownerEmail || "" }
      ]
    },
    { key: "plan", label: copy.colPlan, exportValue: (item) => planName(item.planId) },
    {
      key: "seats",
      label: copy.colSeats,
      exportColumns: [
        { label: t("Sièges utilisés", "Seats used"), value: (item) => Number(item.seatsUsed || 0) },
        { label: t("Sièges total", "Total seats"), value: (item) => Number(item.seatsTotal || 0) }
      ]
    },
    { key: "created", label: t("Créé le", "Created on"), defaultHidden: true, exportValue: (item) => (item.createdAt ? formatDateTime(item.createdAt, language) : "") },
    { key: "status", label: copy.colStatus, exportValue: (item) => (item.revoked ? copy.revoked : copy.active) }
  ];
  const visibleColumnDefs = columnDefs.filter((column) => cols.isVisible(column.key));

  const planIds = [...new Set(items.map((item) => resolvePlanId(item.planId)).filter(Boolean))];
  const filterFields = [
    {
      key: "status",
      label: copy.colStatus,
      allLabel: t("Tous les statuts", "All statuses"),
      options: [
        { value: "active", label: copy.active },
        { value: "revoked", label: copy.revoked }
      ]
    },
    { key: "plan", label: copy.colPlan, allLabel: t("Tous les plans", "All plans"), options: planIds.map((id) => ({ value: id, label: planName(id) })) },
    {
      key: "occupancy",
      label: t("Occupation des sièges", "Seat usage"),
      allLabel: t("Toutes", "All"),
      options: [
        { value: "full", label: t("Complet", "Full") },
        { value: "available", label: t("Places disponibles", "Seats available") },
        { value: "unused", label: t("Jamais utilisé", "Never used") }
      ]
    },
    { key: "created", label: t("Créé entre le", "Created between"), type: "dateRange" }
  ];
  const filteredItems = items.filter(
    (item) =>
      (!filters.status || (item.revoked ? "revoked" : "active") === filters.status) &&
      (!filters.plan || resolvePlanId(item.planId) === filters.plan) &&
      (!filters.occupancy || occupancy(item) === filters.occupancy) &&
      inAdminDateRange(item.createdAt, filters.createdFrom, filters.createdTo)
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

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / ADMIN_PAGE_SIZE));
  const pagedItems = filteredItems.slice((page - 1) * ADMIN_PAGE_SIZE, page * ADMIN_PAGE_SIZE);

  return (
    <section className="admin-licenses">
      <header className="module-header admin-accounts-header">
        <div>
          <h2>{copy.title}</h2>
          <p>{copy.subtitle}</p>
        </div>
      </header>

      {error ? <p className="field-error">{error}</p> : null}

      <div className="admin-table-toolbar">
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={copy.search} />
        <div className="jy-list-tools">
          <AdminAdvancedFilters fields={filterFields} value={filters} onChange={setFilters} language={language} />
          <AdminColumnSelector columns={columnDefs} visible={cols.visible} onToggle={cols.toggle} onReset={cols.reset} language={language} />
          <AdminExportMenu
            language={language}
            title={copy.title}
            fileBase="codes-de-licence"
            columns={visibleColumnDefs}
            rows={filteredItems}
            filters={filterSummary}
          />
        </div>
      </div>

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
            {pagedItems.length ? (
              pagedItems.map((item) => (
                <tr
                  key={item.code}
                  className={`jy-row-click ${selectedCode?.code === item.code ? "is-selected" : ""}`}
                  onClick={() => setSelectedCode(item)}
                >
                  <td>
                    <code className="admin-license-code">{item.code}</code>
                  </td>
                  {cols.isVisible("owner") ? (
                    <td>
                      <div className="admin-table-name">
                        <AvatarCircle
                          user={{ firstName: item.ownerFirstName, lastName: item.ownerLastName, avatarDataUrl: item.ownerAvatarDataUrl }}
                        />
                        <div>
                          <strong>{ownerName(item)}</strong>
                          <span className="muted">{item.ownerEmail}</span>
                        </div>
                      </div>
                    </td>
                  ) : null}
                  {cols.isVisible("plan") ? <td>{planName(item.planId)}</td> : null}
                  {cols.isVisible("seats") ? (
                    <td className="jy-paid-cell">
                      <span className="jy-amount">
                        {item.seatsUsed}/{item.seatsTotal}
                      </span>
                      <span className="jy-progress-row">
                        <span className="jy-progress">
                          <span style={{ width: `${item.seatsTotal ? Math.min(100, (item.seatsUsed / item.seatsTotal) * 100) : 0}%` }} />
                        </span>
                      </span>
                    </td>
                  ) : null}
                  {cols.isVisible("created") ? <td className="muted jy-nowrap">{item.createdAt ? formatDateTime(item.createdAt, language) : ""}</td> : null}
                  {cols.isVisible("status") ? (
                    <td>
                      <span className={`tag ${item.revoked ? "tag-danger" : "tag-success"}`}>{item.revoked ? copy.revoked : copy.active}</span>
                    </td>
                  ) : null}
                  <td className="jy-actions-cell" onClick={(event) => event.stopPropagation()}>
                    {item.revoked ? (
                      <button
                        type="button"
                        className="admin-row-action"
                        disabled={busyCode === item.code}
                        onClick={() => handleRestore(item.code)}
                      >
                        {copy.restore}
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="admin-row-action danger"
                        disabled={busyCode === item.code}
                        onClick={() => handleRevoke(item.code)}
                      >
                        {copy.revoke}
                      </button>
                    )}
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

      <AdminPagination page={page} totalPages={totalPages} onChange={setPage} language={language} totalItems={filteredItems.length} />

      <JyDrawer
        open={Boolean(selectedCode)}
        onClose={() => setSelectedCode(null)}
        language={language}
        avatar={
          <span className="jy-inbox-avatar">
            <AdminLineIcon name="licenses" />
          </span>
        }
        title={selectedCode?.code || ""}
        subtitle={selectedCode ? getPlanById(selectedCode.planId)?.name?.[language] || selectedCode.planId : ""}
        badges={
          selectedCode ? (
            <span className={`tag ${selectedCode.revoked ? "tag-danger" : "tag-success"}`}>
              {selectedCode.revoked ? copy.revoked : copy.active}
            </span>
          ) : null
        }
        sections={
          selectedCode
            ? [
                {
                  title: copy.colSeats,
                  content: (
                    <div className="jy-score-block">
                      <strong>
                        {selectedCode.seatsUsed}/{selectedCode.seatsTotal}
                      </strong>
                      <span className="jy-progress jy-progress-wide">
                        <span
                          style={{
                            width: `${selectedCode.seatsTotal ? Math.min(100, (selectedCode.seatsUsed / selectedCode.seatsTotal) * 100) : 0}%`
                          }}
                        />
                      </span>
                      <small>
                        {Math.max(0, Number(selectedCode.seatsTotal || 0) - Number(selectedCode.seatsUsed || 0))}{" "}
                        {language === "en" ? "seat(s) left" : "siège(s) disponible(s)"}
                      </small>
                    </div>
                  )
                },
                {
                  title: copy.colOwner,
                  rows: [
                    [language === "en" ? "Name" : "Nom", `${selectedCode.ownerFirstName || ""} ${selectedCode.ownerLastName || ""}`.trim() || "-"],
                    [language === "en" ? "Email" : "E-mail", selectedCode.ownerEmail],
                    [copy.colPlan, getPlanById(selectedCode.planId)?.name?.[language] || selectedCode.planId]
                  ]
                }
              ]
            : []
        }
        footer={
          selectedCode ? (
            <>
              <button type="button" className="admin-row-action" onClick={() => copyCode(selectedCode.code)}>
                <AdminLineIcon name="licenses" /> {language === "en" ? "Copy code" : "Copier le code"}
              </button>
              {selectedCode.revoked ? (
                <button
                  type="button"
                  className="admin-row-action"
                  disabled={busyCode === selectedCode.code}
                  onClick={() => {
                    const target = selectedCode.code;
                    setSelectedCode(null);
                    handleRestore(target);
                  }}
                >
                  <AdminLineIcon name="activity" /> {copy.restore}
                </button>
              ) : (
                <button
                  type="button"
                  className="admin-row-action danger"
                  disabled={busyCode === selectedCode.code}
                  onClick={() => {
                    const target = selectedCode.code;
                    setSelectedCode(null);
                    handleRevoke(target);
                  }}
                >
                  <AdminLineIcon name="quality" /> {copy.revoke}
                </button>
              )}
            </>
          ) : null
        }
      />
    </section>
  );
}
