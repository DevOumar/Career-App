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
import { PLANS, PLAN_SEGMENTS, getPlanById } from "../../../data/plans.js";
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
import AdminAccountFormModal, { announceAccountResult, affiliationLabel } from "./AdminAccountFormModal.jsx";
import { AdminLineIcon, JyDrawer, AdminTrendChart, AdminDonutChart, AdminPagination, AdminOrgCard, AdminMiniMetric, formatEur, planPriceLabel, getPaginationRange, eventTypeLabel, adminNotificationText, getAllowedAdminModules, ADMIN_MODULE_DEFS, ADMIN_MODULE_LABELS, ADMIN_DASHBOARD_ROLES, ADMIN_ACCOUNT_SUBTABS, ADMIN_PAGE_SIZE, ADMIN_FINANCE_SOURCES, ADMIN_EVENT_LABELS, ADMIN_ANNOUNCEMENT_AUDIENCES } from "../AdminApp.jsx";

// Colonnes proposées par « Colonnes » (clés stables : la préférence est
// mémorisée par liste). « Plan » et « Permissions » dépendent de l'onglet.
const ACCOUNT_COLUMN_KEYS = [
  { key: "name", required: true },
  { key: "role" },
  { key: "plan" },
  { key: "permissions" },
  { key: "organization", defaultHidden: true },
  { key: "created", defaultHidden: true },
  { key: "lastLogin" },
  { key: "status" }
];

export default function AdminAccountsPage({ user, language, currency = "EUR", initialSearch }) {
  const [selectedUser, setSelectedUser] = useState(null);
  const copy =
    language === "en"
      ? {
          title: "Account management",
          subtitle: "Browse every account on the platform and create new ones.",
          firstName: "First name",
          lastName: "Last name",
          email: "Email",
          password: "Password",
          accountType: "Account type",
          plan: "Plan (optional)",
          noPlan: "No plan",
          create: "Create account",
          creating: "Creating…",
          addAccount: "Create an account",
          search: "Search by name or email…",
          createdOn: "Created on",
          colName: "Name",
          colRole: "Role",
          colPlan: "Plan",
          colPrice: "Price",
          colCreated: "Created on",
          colActions: "Actions",
          empty: "No account found.",
          schoolOrgName: "School name",
          agencyOrgName: "Agency name",
          website: "Website (optional)",
          studentSchool: "School / institution (optional)",
          edit: "Edit",
          delete: "Delete",
          editTitle: "Edit account",
          save: "Save changes",
          saving: "Saving…",
          deleteTitle: "Delete this account",
          deleteWarning:
            "This will permanently delete the account and all its data (CVs, match history, license codes). This cannot be undone.",
          deleteConfirmLabel: "Type the account's email to confirm",
          deleteConfirm: "Delete permanently",
          cancel: "Cancel",
          free: "Free",
          adminModulesLabel: "Visible modules",
          adminModulesHint: "Leave everything checked for full access.",
          colPermissions: "Permissions",
          fullAccess: "Full access"
          ,
          colUsage: "Usage",
          colLastLogin: "Last login",
          colStatus: "Status",
          active: "Active",
          suspended: "Suspended",
          suspend: "Suspend",
          reactivate: "Reactivate"
        }
      : {
          title: "Gestion de compte",
          subtitle: "Consultez tous les comptes de la plateforme et créez-en de nouveaux.",
          firstName: "Prénom",
          lastName: "Nom",
          email: "Email",
          password: "Mot de passe",
          accountType: "Type de compte",
          plan: "Plan (optionnel)",
          noPlan: "Aucun plan",
          create: "Créer le compte",
          creating: "Création…",
          addAccount: "Créer un compte",
          search: "Rechercher par nom ou email…",
          createdOn: "Créé le",
          colName: "Nom",
          colRole: "Rôle",
          colPlan: "Plan",
          colPrice: "Tarif",
          colCreated: "Créé le",
          colActions: "Actions",
          schoolOrgName: "Nom de l'école",
          agencyOrgName: "Nom du cabinet",
          website: "Site web (optionnel)",
          studentSchool: "École / établissement (optionnel)",
          empty: "Aucun compte trouvé.",
          edit: "Modifier",
          delete: "Supprimer",
          editTitle: "Modifier le compte",
          save: "Enregistrer",
          saving: "Enregistrement…",
          deleteTitle: "Supprimer ce compte",
          deleteWarning:
            "Cela supprime définitivement le compte et toutes ses données (CV, historique de matching, codes de licence). Action irréversible.",
          deleteConfirmLabel: "Saisissez l'email du compte pour confirmer",
          deleteConfirm: "Supprimer définitivement",
          cancel: "Annuler",
          free: "Gratuit",
          adminModulesLabel: "Modules visibles",
          adminModulesHint: "Laissez tout coché pour un accès complet.",
          colPermissions: "Permissions",
          fullAccess: "Accès complet",
          colUsage: "Usage",
          colLastLogin: "Dernière connexion",
          colStatus: "Statut",
          active: "Actif",
          suspended: "Suspendu",
          suspend: "Suspendre",
          reactivate: "Réactiver"
        };

  const [subTab, setSubTab] = useState("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [error, setError] = useState("");
  const [users, setUsers] = useState([]);
  const [orgAccounts, setOrgAccounts] = useState([]);
  const [search, setSearch] = useState(initialSearch || "");
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState(() => ({ status: "", plan: "", lastLogin: "", createdFrom: "", createdTo: "" }));
  const cols = useAdminColumns("career_app_admin_cols_accounts", ACCOUNT_COLUMN_KEYS);

  useEffect(() => {
    setPage(1);
  }, [filters]);

  useEffect(() => {
    if (initialSearch) setSearch(initialSearch);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialSearch]);
  const [editTarget, setEditTarget] = useState(null);

  const isOrgTab = subTab === "school" || subTab === "recruiter_firm";
  function reload() {
    if (isOrgTab) loadOrgAccounts();
    else loadUsers();
  }

  function openEdit(item) {
    setEditTarget(item);
  }

  async function openDelete(item) {
    const { value: confirmationEmail } = await Swal.fire({
      icon: "warning",
      title: copy.deleteTitle,
      html: `<p style="text-align:left;margin-bottom:0.6rem;">${copy.deleteWarning}</p><p style="text-align:left;font-weight:700;">${item.firstName} ${item.lastName} · ${item.email}</p>`,
      input: "text",
      inputPlaceholder: item.email,
      inputLabel: copy.deleteConfirmLabel,
      showCancelButton: true,
      confirmButtonText: copy.deleteConfirm,
      cancelButtonText: copy.cancel,
      confirmButtonColor: "#cf1322",
      focusCancel: true,
      preConfirm: (value) => {
        if (value !== item.email) {
          Swal.showValidationMessage(copy.deleteConfirmLabel);
          return false;
        }
        return value;
      }
    });

    if (!confirmationEmail) return;

    try {
      await deleteAdminUser({ adminUserId: user.id, userId: item.id, confirmation: confirmationEmail });
      reload();
      Swal.fire({
        toast: true,
        position: "top-end",
        icon: "success",
        title: language === "en" ? "Account deleted." : "Compte supprimé.",
        showConfirmButton: false,
        timer: 2800,
        timerProgressBar: true,
        customClass: { popup: "career-toast", title: "career-toast-title" }
      });
    } catch (err) {
      Swal.fire({ icon: "error", title: getFriendlyErrorMessage(err, language) });
    }
  }

  async function toggleUserStatus(item) {
    const nextStatus = item.status === "suspended" ? "active" : "suspended";
    const isSuspending = nextStatus === "suspended";
    const result = await Swal.fire({
      icon: isSuspending ? "warning" : "question",
      title: isSuspending
        ? language === "en"
          ? "Suspend this account?"
          : "Suspendre ce compte ?"
        : language === "en"
          ? "Reactivate this account?"
          : "Réactiver ce compte ?",
      html: isSuspending
        ? language === "en"
          ? `<p style="text-align:left;margin:0;">The user will no longer be able to sign in. Active sessions will be closed.</p><p style="text-align:left;font-weight:700;margin-top:0.75rem;">${item.firstName} ${item.lastName} · ${item.email}</p>`
          : `<p style="text-align:left;margin:0;">L'utilisateur ne pourra plus se connecter. Les sessions actives seront fermées.</p><p style="text-align:left;font-weight:700;margin-top:0.75rem;">${item.firstName} ${item.lastName} · ${item.email}</p>`
        : language === "en"
          ? `<p style="text-align:left;margin:0;">This account will be allowed to sign in again.</p><p style="text-align:left;font-weight:700;margin-top:0.75rem;">${item.firstName} ${item.lastName} · ${item.email}</p>`
          : `<p style="text-align:left;margin:0;">Ce compte pourra de nouveau se connecter.</p><p style="text-align:left;font-weight:700;margin-top:0.75rem;">${item.firstName} ${item.lastName} · ${item.email}</p>`,
      showCancelButton: true,
      confirmButtonText: isSuspending ? copy.suspend : copy.reactivate,
      cancelButtonText: copy.cancel,
      confirmButtonColor: isSuspending ? "#f5222d" : "#1a0dab",
      focusCancel: true
    });
    if (!result.isConfirmed) return;

    try {
      await updateAdminUserStatus({ adminUserId: user.id, userId: item.id, status: nextStatus });
      reload();
      Swal.fire({
        toast: true,
        position: "top-end",
        icon: "success",
        title: isSuspending
          ? language === "en"
            ? "Account suspended."
            : "Compte suspendu."
          : language === "en"
            ? "Account reactivated."
            : "Compte réactivé.",
        showConfirmButton: false,
        timer: 2500,
        timerProgressBar: true,
        customClass: { popup: "career-toast", title: "career-toast-title" }
      });
    } catch (err) {
      Swal.fire({ icon: "error", title: getFriendlyErrorMessage(err, language) });
    }
  }

  function loadUsers() {
    listAdminUsers(user.id, { search, roleType: subTab === "all" ? "" : subTab })
      .then(setUsers)
      .catch((err) => setError(getFriendlyErrorMessage(err, language)));
  }

  function loadOrgAccounts() {
    getAdminOrgAccounts(user.id, subTab)
      .then(setOrgAccounts)
      .catch((err) => setError(getFriendlyErrorMessage(err, language)));
  }

  useEffect(() => {
    setPage(1);
    setError("");
    if (isOrgTab) {
      loadOrgAccounts();
    } else {
      loadUsers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subTab, search]);

  const t = (fr, en) => (language === "en" ? en : fr);
  const planName = (planId) => (planId ? getPlanById(planId)?.name?.[language] || getPlanById(planId)?.name?.fr || planId : copy.noPlan);
  const lastLoginText = (item) => (item.lastLoginAt ? formatDateTime(item.lastLoginAt, language) : t("Jamais", "Never"));
  const statusText = (item) => (item.status === "suspended" ? copy.suspended : copy.active);
  const permissionsText = (item) =>
    item.adminModules?.length
      ? item.adminModules.map((moduleId) => ADMIN_MODULE_LABELS[moduleId]?.[language] || ADMIN_MODULE_LABELS[moduleId]?.fr || moduleId).join(", ")
      : copy.fullAccess;
  const organizationText = (item) => item.organizationName || (item.affiliation ? affiliationLabel(item.affiliation, language) : "") || item.declaredSchool || "";

  const columnDefs = [
    {
      key: "name",
      label: copy.colName,
      required: true,
      exportColumns: [
        { label: copy.colName, value: (item) => `${item.firstName || ""} ${item.lastName || ""}`.trim() },
        { label: copy.email, value: (item) => item.email }
      ]
    },
    { key: "role", label: copy.colRole, exportValue: (item) => getAccountLabel(item.roleType, language) },
    subTab !== "admin" ? { key: "plan", label: copy.colPlan, exportValue: (item) => planName(item.planId) } : null,
    subTab === "admin" ? { key: "permissions", label: copy.colPermissions, exportValue: permissionsText } : null,
    { key: "organization", label: t("Organisation / rattachement", "Organization / affiliation"), defaultHidden: true, exportValue: organizationText },
    { key: "created", label: copy.colCreated, defaultHidden: true, exportValue: (item) => formatDateTime(item.createdAt, language) },
    { key: "lastLogin", label: copy.colLastLogin, exportValue: lastLoginText },
    { key: "status", label: copy.colStatus, exportValue: statusText }
  ].filter(Boolean);
  const visibleColumnDefs = columnDefs.filter((column) => cols.isVisible(column.key));

  const filterFields = [
    {
      key: "status",
      label: copy.colStatus,
      allLabel: t("Tous les statuts", "All statuses"),
      options: [
        { value: "active", label: copy.active },
        { value: "suspended", label: copy.suspended }
      ]
    },
    subTab !== "admin"
      ? {
          key: "plan",
          label: copy.colPlan,
          allLabel: t("Tous les plans", "All plans"),
          options: [{ value: "__none", label: copy.noPlan }, ...PLANS.map((plan) => ({ value: plan.id, label: plan.name?.[language] || plan.name?.fr || plan.id }))]
        }
      : null,
    {
      key: "lastLogin",
      label: copy.colLastLogin,
      allLabel: t("Toutes", "All"),
      options: [
        { value: "recent", label: t("Ces 30 derniers jours", "Last 30 days") },
        { value: "inactive", label: t("Inactif depuis plus de 30 jours", "Inactive for 30+ days") },
        { value: "never", label: t("Jamais connecté", "Never signed in") }
      ]
    },
    { key: "created", label: t("Créé entre le", "Created between"), type: "dateRange" }
  ].filter(Boolean);

  const monthAgo = Date.now() - 30 * 864e5;
  const filteredUsers = users.filter((item) => {
    if (filters.status && (item.status === "suspended" ? "suspended" : "active") !== filters.status) return false;
    if (subTab !== "admin" && filters.plan && (filters.plan === "__none" ? Boolean(item.planId) : item.planId !== filters.plan)) return false;
    if (filters.lastLogin) {
      const last = item.lastLoginAt ? new Date(item.lastLoginAt).getTime() : 0;
      if (filters.lastLogin === "never" && last) return false;
      if (filters.lastLogin === "recent" && !(last && last >= monthAgo)) return false;
      if (filters.lastLogin === "inactive" && !(last && last < monthAgo)) return false;
    }
    return inAdminDateRange(item.createdAt, filters.createdFrom, filters.createdTo);
  });

  const filterSummary = [
    search ? `${t("Recherche", "Search")} : ${search}` : "",
    subTab !== "all" ? `${t("Onglet", "Tab")} : ${ADMIN_ACCOUNT_SUBTABS.find((item) => item.id === subTab)?.label?.[language] || subTab}` : "",
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

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / ADMIN_PAGE_SIZE));
  const pagedUsers = filteredUsers.slice((page - 1) * ADMIN_PAGE_SIZE, page * ADMIN_PAGE_SIZE);

  return (
    <section className="admin-accounts">
      <header className="module-header admin-accounts-header">
        <div>
          <h2>{copy.title}</h2>
          <p>{copy.subtitle}</p>
        </div>
        <div className="admin-header-actions">
          <button type="button" className="btn-main ready" onClick={() => setCreateOpen(true)}>
            <UiIcon name="profile" /> {copy.addAccount}
          </button>
        </div>
      </header>

      <div className="admin-subtabs">
        {ADMIN_ACCOUNT_SUBTABS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`admin-subtab ${subTab === item.id ? "active" : ""}`}
            onClick={() => setSubTab(item.id)}
          >
            {item.label[language] || item.label.fr}
          </button>
        ))}
      </div>

      {!isOrgTab ? (
        <>
          <div className="admin-table-toolbar">
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={copy.search} />
            <div className="jy-list-tools">
              <AdminAdvancedFilters fields={filterFields} value={filters} onChange={setFilters} language={language} />
              <AdminColumnSelector columns={columnDefs} visible={cols.visible} onToggle={cols.toggle} onReset={cols.reset} language={language} />
              <AdminExportMenu
                language={language}
                title={t("Comptes", "Accounts")}
                fileBase="comptes"
                columns={visibleColumnDefs}
                rows={filteredUsers}
                filters={filterSummary}
              />
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
                {pagedUsers.length ? (
                  pagedUsers.map((item) => (
                    <tr
                      key={item.id}
                      className={`jy-row-click ${selectedUser?.id === item.id ? "is-selected" : ""}`}
                      onClick={() => setSelectedUser(item)}
                    >
                      <td>
                        <div className="admin-table-name">
                          <AvatarCircle user={item} />
                          <div>
                            <strong>
                              {item.firstName} {item.lastName}
                            </strong>
                            <span className="muted">{item.email}</span>
                          </div>
                        </div>
                      </td>
                      {cols.isVisible("role") ? (
                        <td>
                          <span className="tag">{getAccountLabel(item.roleType, language)}</span>
                        </td>
                      ) : null}
                      {subTab !== "admin" && cols.isVisible("plan") ? (
                        <td>
                          {item.planId ? (
                            <span className="tag">{getPlanById(item.planId)?.name?.[language] || item.planId}</span>
                          ) : (
                            <span className="muted">{copy.noPlan}</span>
                          )}
                        </td>
                      ) : null}
                      {subTab === "admin" && cols.isVisible("permissions") ? (
                        <td>
                          {item.adminModules?.length ? (
                            <span className="tag">
                              {item.adminModules.length} {language === "en" ? "module(s)" : "module(s)"}
                            </span>
                          ) : (
                            <span className="tag tag-success">{copy.fullAccess}</span>
                          )}
                        </td>
                      ) : null}
                      {cols.isVisible("organization") ? <td>{organizationText(item) || <span className="muted">{t("Aucun", "None")}</span>}</td> : null}
                      {cols.isVisible("created") ? <td className="muted jy-nowrap">{formatDateTime(item.createdAt, language)}</td> : null}
                      {cols.isVisible("lastLogin") ? <td className="muted jy-nowrap">{lastLoginText(item)}</td> : null}
                      {cols.isVisible("status") ? (
                        <td>
                          <span className={`tag ${item.status === "suspended" ? "tag-danger" : "tag-success"}`}>{statusText(item)}</span>
                        </td>
                      ) : null}
                      <td className="jy-actions-cell" onClick={(event) => event.stopPropagation()}>
                        <div className="admin-row-actions" style={{ justifyContent: "flex-end" }}>
                          <button type="button" className="admin-row-action icon-only" title={copy.edit} aria-label={copy.edit} onClick={() => openEdit(item)}>
                            <AdminLineIcon name="edit" />
                          </button>
                          {item.roleType !== "admin" ? (
                            <>
                              <button
                                type="button"
                                className="admin-row-action icon-only"
                                title={item.status === "suspended" ? copy.reactivate : copy.suspend}
                                aria-label={item.status === "suspended" ? copy.reactivate : copy.suspend}
                                onClick={() => toggleUserStatus(item)}
                              >
                                <AdminLineIcon name="quality" />
                              </button>
                              <button
                                type="button"
                                className="admin-row-action danger icon-only"
                                title={copy.delete}
                                aria-label={copy.delete}
                                onClick={() => openDelete(item)}
                              >
                                <AdminLineIcon name="trash" />
                              </button>
                            </>
                          ) : null}
                        </div>
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

          <JyDrawer
            open={Boolean(selectedUser)}
            onClose={() => setSelectedUser(null)}
            language={language}
            avatar={selectedUser ? <AvatarCircle user={selectedUser} /> : null}
            title={selectedUser ? `${selectedUser.firstName || ""} ${selectedUser.lastName || ""}`.trim() : ""}
            subtitle={selectedUser?.email}
            badges={
              selectedUser ? (
                <>
                  <span className="tag">{getAccountLabel(selectedUser.roleType, language)}</span>
                  <span className={`tag ${selectedUser.status === "suspended" ? "tag-danger" : "tag-success"}`}>
                    {selectedUser.status === "suspended" ? copy.suspended : copy.active}
                  </span>
                </>
              ) : null
            }
            sections={
              selectedUser
                ? [
                    {
                      title: language === "en" ? "Account" : "Compte",
                      rows: [
                        [language === "en" ? "Organization" : "Organisation", selectedUser.organizationName],
                        [language === "en" ? "Website" : "Site web", selectedUser.website],
                        [copy.colCreated, formatDateTime(selectedUser.createdAt, language)],
                        [copy.colLastLogin, selectedUser.lastLoginAt ? formatDateTime(selectedUser.lastLoginAt, language) : language === "en" ? "Never" : "Jamais"]
                      ]
                    },
                    selectedUser.roleType === "student" || selectedUser.roleType === "candidate"
                      ? {
                          title: language === "en" ? "Affiliation" : "Rattachement",
                          rows: [
                            [language === "en" ? "Linked to" : "Rattaché à", affiliationLabel(selectedUser.affiliation, language)],
                            [language === "en" ? "Contact email" : "E-mail du contact", selectedUser.affiliation?.contactEmail],
                            [language === "en" ? "License code" : "Code de licence", selectedUser.affiliation?.licenseCode],
                            [language === "en" ? "Linked since" : "Rattaché depuis", selectedUser.affiliation?.since ? formatDateTime(selectedUser.affiliation.since, language) : ""],
                            [language === "en" ? "Declared school" : "École déclarée", selectedUser.declaredSchool]
                          ]
                        }
                      : null,
                    selectedUser.roleType !== "admin"
                      ? {
                          title: language === "en" ? "Subscription" : "Abonnement",
                          rows: [
                            [copy.colPlan, selectedUser.planId ? getPlanById(selectedUser.planId)?.name?.[language] || selectedUser.planId : copy.noPlan],
                            [copy.colPrice, planPriceLabel(selectedUser.planId, selectedUser.billingCycle, copy.free, currency)]
                          ]
                        }
                      : null,
                    selectedUser.roleType !== "admin"
                      ? {
                          title: language === "en" ? "Usage" : "Utilisation",
                          rows: [
                            [language === "en" ? "Imported CVs" : "CV importés", String(selectedUser.cvCount || 0)],
                            [language === "en" ? "Analyses run" : "Analyses réalisées", String(selectedUser.matchCount || 0)]
                          ]
                        }
                      : {
                          title: copy.colPermissions,
                          content: selectedUser.adminModules?.length ? (
                            <div className="admin-permission-tags">
                              {selectedUser.adminModules.map((moduleId) => (
                                <span key={moduleId} className="tag">
                                  {ADMIN_MODULE_LABELS[moduleId]?.[language] || ADMIN_MODULE_LABELS[moduleId]?.fr || moduleId}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="tag tag-success">{copy.fullAccess}</span>
                          )
                        }
                  ]
                : []
            }
            footer={
              selectedUser ? (
                <>
                  <button
                    type="button"
                    className="admin-row-action"
                    onClick={() => {
                      const target = selectedUser;
                      setSelectedUser(null);
                      openEdit(target);
                    }}
                  >
                    <AdminLineIcon name="edit" /> {copy.edit}
                  </button>
                  {selectedUser.roleType !== "admin" ? (
                    <>
                      <button
                        type="button"
                        className="admin-row-action"
                        onClick={() => {
                          const target = selectedUser;
                          setSelectedUser(null);
                          toggleUserStatus(target);
                        }}
                      >
                        <AdminLineIcon name="quality" /> {selectedUser.status === "suspended" ? copy.reactivate : copy.suspend}
                      </button>
                      <button
                        type="button"
                        className="admin-row-action danger"
                        onClick={() => {
                          const target = selectedUser;
                          setSelectedUser(null);
                          openDelete(target);
                        }}
                      >
                        <AdminLineIcon name="trash" /> {copy.delete}
                      </button>
                    </>
                  ) : null}
                </>
              ) : null
            }
          />

          <AdminPagination page={page} totalPages={totalPages} onChange={setPage} language={language} totalItems={filteredUsers.length} />
        </>
      ) : (
        <div className="admin-org-list">
          {error ? <p className="field-error">{error}</p> : null}
          {orgAccounts.length ? (
            orgAccounts.map((org) => <AdminOrgCard key={org.id} org={org} language={language} roleType={subTab} />)
          ) : (
            <p className="muted">{copy.empty}</p>
          )}
        </div>
      )}

      {createOpen ? (
        <AdminAccountFormModal
          mode="create"
          user={user}
          language={language}
          onClose={() => setCreateOpen(false)}
          onDone={(result) => {
            announceAccountResult(result, language);
            reload();
          }}
        />
      ) : null}

      {editTarget ? (
        <AdminAccountFormModal
          mode="edit"
          target={editTarget}
          user={user}
          language={language}
          onClose={() => setEditTarget(null)}
          onDone={(result) => {
            announceAccountResult(result, language);
            reload();
          }}
        />
      ) : null}

    </section>
  );
}
