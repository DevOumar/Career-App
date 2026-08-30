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
import { AdminExportCsvButton } from "../../../components/AdminExportCsvButton.jsx";
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
import { formatDate, formatShortDate, formatAmountInCurrency, formatPlanPrice } from "../../../lib/format.js";
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
import { AdminTrendChart, AdminDonutChart, AdminPagination, AdminOrgCard, AdminMiniMetric, formatEur, planPriceLabel, getPaginationRange, eventTypeLabel, adminNotificationText, getAllowedAdminModules, ADMIN_MODULE_DEFS, ADMIN_MODULE_LABELS, ADMIN_DASHBOARD_ROLES, ADMIN_ACCOUNT_SUBTABS, ADMIN_PAGE_SIZE, ADMIN_FINANCE_SOURCES, ADMIN_EVENT_LABELS, ADMIN_ANNOUNCEMENT_AUDIENCES } from "../AdminApp.jsx";

export default function AdminAccountsPage({ user, language, currency = "EUR", initialSearch }) {
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
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    accountType: "student",
    planId: "",
    billingCycle: "monthly",
    organizationName: "",
    schoolName: "",
    website: "",
    adminModules: []
  });
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [users, setUsers] = useState([]);
  const [orgAccounts, setOrgAccounts] = useState([]);
  const [search, setSearch] = useState(initialSearch || "");
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (initialSearch) setSearch(initialSearch);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialSearch]);
  const [editTarget, setEditTarget] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState("");

  const isOrgTab = subTab === "school" || subTab === "recruiter_firm";
  const selectedSegment = ADMIN_ACCOUNT_TYPES.find((item) => item.id === form.accountType)?.segment;
  const availablePlans = PLANS.filter((plan) => plan.segment === selectedSegment);
  const editSegment = editForm ? ADMIN_ACCOUNT_TYPES.find((item) => item.id === editForm.accountType)?.segment : null;
  const editAvailablePlans = PLANS.filter((plan) => plan.segment === editSegment);

  function reload() {
    if (isOrgTab) loadOrgAccounts();
    else loadUsers();
  }

  function openEdit(item) {
    setEditTarget(item);
    setEditError("");
    setEditForm({
      firstName: item.firstName,
      lastName: item.lastName,
      accountType: item.roleType,
      planId: item.planId || "",
      billingCycle: item.billingCycle || "monthly",
      organizationName: item.organizationName || "",
      website: item.website || "",
      adminModules: item.adminModules || []
    });
  }

  function toggleAdminModule(setter, moduleId) {
    setter((prev) => {
      const allIds = ADMIN_MODULE_DEFS.map((item) => item.id);
      const current = Array.isArray(prev.adminModules) && prev.adminModules.length ? prev.adminModules : allIds;
      const next = current.includes(moduleId) ? current.filter((id) => id !== moduleId) : [...current, moduleId];
      return { ...prev, adminModules: next.length === allIds.length ? [] : next };
    });
  }

  async function submitEdit(event) {
    event.preventDefault();
    setEditError("");
    setEditSaving(true);
    try {
      await updateAdminUser({
        adminUserId: user.id,
        userId: editTarget.id,
        firstName: editForm.firstName,
        lastName: editForm.lastName,
        organizationName: editForm.organizationName,
        website: editForm.website,
        planId: editForm.planId || null,
        billingCycle: editForm.billingCycle,
        adminModules: editForm.adminModules || []
      });
      setEditTarget(null);
      reload();
    } catch (err) {
      setEditError(getFriendlyErrorMessage(err, language));
    } finally {
      setEditSaving(false);
    }
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

  const totalPages = Math.max(1, Math.ceil(users.length / ADMIN_PAGE_SIZE));
  const pagedUsers = users.slice((page - 1) * ADMIN_PAGE_SIZE, page * ADMIN_PAGE_SIZE);

  function updateField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function submit(event) {
    event.preventDefault();
    setError("");
    setMessage("");
    setCreating(true);
    try {
      const result = await createAdminUser({
        adminUserId: user.id,
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        password: form.password,
        accountType: form.accountType,
        planId: form.planId || null,
        billingCycle: form.billingCycle,
        organizationName: form.organizationName,
        schoolName: form.schoolName,
        website: form.website,
        adminModules: form.accountType === "admin" ? form.adminModules : undefined
      });
      setMessage(
        result.licenseCode
          ? language === "en"
            ? `Account created. License code: ${result.licenseCode}`
            : `Compte créé. Code de licence : ${result.licenseCode}`
          : language === "en"
          ? "Account created."
          : "Compte créé."
      );
      setForm({
        firstName: "",
        lastName: "",
        email: "",
        password: "",
        accountType: "student",
        planId: "",
        billingCycle: "monthly",
        organizationName: "",
        schoolName: "",
        website: "",
        adminModules: []
      });
      if (isOrgTab) loadOrgAccounts();
      else loadUsers();
    } catch (err) {
      setError(getFriendlyErrorMessage(err, language));
    } finally {
      setCreating(false);
    }
  }

  return (
    <section className="admin-accounts">
      <header className="module-header admin-accounts-header">
        <div>
          <h2>{copy.title}</h2>
          <p>{copy.subtitle}</p>
        </div>
        <div className="admin-header-actions">
          <AdminExportCsvButton adminUserId={user.id} path="/admin/export/accounts" language={language} />
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
          </div>

          {error ? <p className="field-error">{error}</p> : null}

          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>{copy.colName}</th>
                  <th>{copy.colRole}</th>
                  {subTab !== "admin" ? <th>{copy.colPlan}</th> : null}
                  {subTab !== "admin" ? <th>{copy.colPrice}</th> : null}
                  {subTab === "admin" ? <th>{copy.colPermissions}</th> : null}
                  {subTab !== "admin" ? <th>{copy.colUsage}</th> : null}
                  <th>{copy.colLastLogin}</th>
                  <th>{copy.colStatus}</th>
                  <th>{copy.colCreated}</th>
                  <th>{copy.colActions}</th>
                </tr>
              </thead>
              <tbody>
                {pagedUsers.length ? (
                  pagedUsers.map((item) => (
                    <tr key={item.id}>
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
                      <td>
                        <span className="tag">{getAccountLabel(item.roleType, language)}</span>
                      </td>
                      {subTab !== "admin" ? (
                        <td>
                          {item.planId ? (
                            <span className="tag">{getPlanById(item.planId)?.name?.[language] || item.planId}</span>
                          ) : (
                            <span className="muted">{copy.noPlan}</span>
                          )}
                        </td>
                      ) : null}
                      {subTab !== "admin" ? (
                        <td className="muted">{planPriceLabel(item.planId, item.billingCycle, copy.free, currency)}</td>
                      ) : null}
                      {subTab === "admin" ? (
                        <td>
                          {item.adminModules?.length ? (
                            <div className="admin-permission-tags">
                              {item.adminModules.map((moduleId) => (
                                <span key={moduleId} className="tag">
                                  {ADMIN_MODULE_LABELS[moduleId]?.[language] || ADMIN_MODULE_LABELS[moduleId]?.fr || moduleId}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="tag tag-success">{copy.fullAccess}</span>
                          )}
                        </td>
                      ) : null}
                      {subTab !== "admin" ? (
                        <td>
                          <div className="admin-usage-stack">
                            <span>{item.cvCount || 0} CV</span>
                            <span>{item.matchCount || 0} analyses</span>
                          </div>
                        </td>
                      ) : null}
                      <td className="muted">{item.lastLoginAt ? formatDate(item.lastLoginAt) : "—"}</td>
                      <td>
                        <span className={`tag ${item.status === "suspended" ? "tag-danger" : "tag-success"}`}>
                          {item.status === "suspended" ? copy.suspended : copy.active}
                        </span>
                      </td>
                      <td className="muted">{formatDate(item.createdAt)}</td>
                      <td>
                        <div className="admin-row-actions">
                          <button type="button" className="admin-row-action" onClick={() => openEdit(item)}>
                            <UiIcon name="edit" /> {copy.edit}
                          </button>
                          {item.roleType !== "admin" ? (
                            <>
                              <button type="button" className="admin-row-action" onClick={() => toggleUserStatus(item)}>
                                <UiIcon name="shield" /> {item.status === "suspended" ? copy.reactivate : copy.suspend}
                              </button>
                              <button type="button" className="admin-row-action danger" onClick={() => openDelete(item)}>
                                <UiIcon name="alert" /> {copy.delete}
                              </button>
                            </>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={subTab === "admin" ? 7 : 9} className="admin-table-empty muted">
                      {copy.empty}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <AdminPagination page={page} totalPages={totalPages} onChange={setPage} language={language} totalItems={users.length} />
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
        <div className="modal-overlay" onMouseDown={() => setCreateOpen(false)}>
          <div className="admin-create-modal" onMouseDown={(event) => event.stopPropagation()}>
            <button type="button" className="modal-close" onClick={() => setCreateOpen(false)} aria-label="Fermer">
              ×
            </button>
            <h3>{copy.addAccount}</h3>
            <form onSubmit={submit}>
              <div className="admin-form-grid">
                <label>
                  {copy.firstName}
                  <input value={form.firstName} onChange={(event) => updateField("firstName", event.target.value)} required />
                </label>
                <label>
                  {copy.lastName}
                  <input value={form.lastName} onChange={(event) => updateField("lastName", event.target.value)} required />
                </label>
                <label>
                  {copy.email}
                  <input type="email" value={form.email} onChange={(event) => updateField("email", event.target.value)} required />
                </label>
                <label>
                  {copy.password}
                  <input
                    type="password"
                    minLength={8}
                    value={form.password}
                    onChange={(event) => updateField("password", event.target.value)}
                    required
                  />
                </label>
                <label>
                  {copy.accountType}
                  <select value={form.accountType} onChange={(event) => updateField("accountType", event.target.value)}>
                    {ADMIN_ACCOUNT_TYPES.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.label[language] || item.label.fr}
                      </option>
                    ))}
                  </select>
                </label>
                {form.accountType !== "admin" ? (
                  <label>
                    {copy.plan}
                    <select value={form.planId} onChange={(event) => updateField("planId", event.target.value)}>
                      <option value="">{copy.noPlan}</option>
                      {availablePlans.map((plan) => (
                        <option key={plan.id} value={plan.id}>
                          {plan.name[language] || plan.name.fr}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : null}

                {form.accountType === "school" ? (
                  <>
                    <label>
                      {copy.schoolOrgName}
                      <input
                        value={form.organizationName}
                        onChange={(event) => updateField("organizationName", event.target.value)}
                        required
                      />
                    </label>
                    <label>
                      {copy.website}
                      <input value={form.website} onChange={(event) => updateField("website", event.target.value)} />
                    </label>
                  </>
                ) : null}

                {form.accountType === "recruiter_firm" ? (
                  <>
                    <label>
                      {copy.agencyOrgName}
                      <input
                        value={form.organizationName}
                        onChange={(event) => updateField("organizationName", event.target.value)}
                        required
                      />
                    </label>
                    <label>
                      {copy.website}
                      <input value={form.website} onChange={(event) => updateField("website", event.target.value)} />
                    </label>
                  </>
                ) : null}

                {form.accountType === "student" ? (
                  <label>
                    {copy.studentSchool}
                    <input value={form.schoolName} onChange={(event) => updateField("schoolName", event.target.value)} />
                  </label>
                ) : null}
              </div>

              {form.accountType === "admin" ? (
                <div className="admin-permissions-block">
                  <strong>{copy.adminModulesLabel}</strong>
                  <p className="muted">{copy.adminModulesHint}</p>
                  <div className="admin-permissions-grid">
                    {ADMIN_MODULE_DEFS.map((moduleDef) => (
                      <label key={moduleDef.id} className="admin-permission-check">
                        <input
                          type="checkbox"
                          checked={!form.adminModules.length || form.adminModules.includes(moduleDef.id)}
                          onChange={() => toggleAdminModule(setForm, moduleDef.id)}
                        />
                        {ADMIN_MODULE_LABELS[moduleDef.id][language] || ADMIN_MODULE_LABELS[moduleDef.id].fr}
                      </label>
                    ))}
                  </div>
                </div>
              ) : null}

              {error ? <p className="field-error">{error}</p> : null}
              {message ? <p className="field-hint success">{message}</p> : null}

              <button type="submit" className="btn-main ready" disabled={creating}>
                {creating ? <span className="btn-spinner" /> : null} {creating ? copy.creating : copy.create}
              </button>
            </form>
          </div>
        </div>
      ) : null}

      {editTarget ? (
        <div className="modal-overlay" onMouseDown={() => setEditTarget(null)}>
          <div className="admin-create-modal" onMouseDown={(event) => event.stopPropagation()}>
            <button type="button" className="modal-close" onClick={() => setEditTarget(null)} aria-label="Fermer">
              ×
            </button>
            <h3>{copy.editTitle}</h3>
            <form onSubmit={submitEdit}>
              <div className="admin-form-grid">
                <label>
                  {copy.firstName}
                  <input
                    value={editForm.firstName}
                    onChange={(event) => setEditForm((prev) => ({ ...prev, firstName: event.target.value }))}
                    required
                  />
                </label>
                <label>
                  {copy.lastName}
                  <input
                    value={editForm.lastName}
                    onChange={(event) => setEditForm((prev) => ({ ...prev, lastName: event.target.value }))}
                    required
                  />
                </label>
                {editForm.accountType !== "admin" ? (
                  <label>
                    {copy.plan}
                    <select
                      value={editForm.planId}
                      onChange={(event) => setEditForm((prev) => ({ ...prev, planId: event.target.value }))}
                    >
                      <option value="">{copy.noPlan}</option>
                      {editAvailablePlans.map((plan) => (
                        <option key={plan.id} value={plan.id}>
                          {plan.name[language] || plan.name.fr}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : null}
                {(editForm.accountType === "school" || editForm.accountType === "recruiter_firm") ? (
                  <>
                    <label>
                      {editForm.accountType === "school" ? copy.schoolOrgName : copy.agencyOrgName}
                      <input
                        value={editForm.organizationName}
                        onChange={(event) => setEditForm((prev) => ({ ...prev, organizationName: event.target.value }))}
                      />
                    </label>
                    <label>
                      {copy.website}
                      <input
                        value={editForm.website}
                        onChange={(event) => setEditForm((prev) => ({ ...prev, website: event.target.value }))}
                      />
                    </label>
                  </>
                ) : null}
              </div>

              {editForm.accountType === "admin" ? (
                <div className="admin-permissions-block">
                  <strong>{copy.adminModulesLabel}</strong>
                  <p className="muted">{copy.adminModulesHint}</p>
                  <div className="admin-permissions-grid">
                    {ADMIN_MODULE_DEFS.map((moduleDef) => (
                      <label key={moduleDef.id} className="admin-permission-check">
                        <input
                          type="checkbox"
                          checked={!editForm.adminModules?.length || editForm.adminModules.includes(moduleDef.id)}
                          onChange={() => toggleAdminModule(setEditForm, moduleDef.id)}
                        />
                        {ADMIN_MODULE_LABELS[moduleDef.id][language] || ADMIN_MODULE_LABELS[moduleDef.id].fr}
                      </label>
                    ))}
                  </div>
                </div>
              ) : null}

              {editError ? <p className="field-error">{editError}</p> : null}

              <div className="admin-modal-actions">
                <button type="button" className="btn-ghost" onClick={() => setEditTarget(null)}>
                  {copy.cancel}
                </button>
                <button type="submit" className="btn-main ready" disabled={editSaving}>
                  {editSaving ? <span className="btn-spinner" /> : null} {editSaving ? copy.saving : copy.save}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

    </section>
  );
}
