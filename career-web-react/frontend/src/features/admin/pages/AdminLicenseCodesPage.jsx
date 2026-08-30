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

  const totalPages = Math.max(1, Math.ceil(items.length / ADMIN_PAGE_SIZE));
  const pagedItems = items.slice((page - 1) * ADMIN_PAGE_SIZE, page * ADMIN_PAGE_SIZE);

  return (
    <section className="admin-licenses">
      <header className="module-header admin-accounts-header">
        <div>
          <h2>{copy.title}</h2>
          <p>{copy.subtitle}</p>
        </div>
        <AdminExportCsvButton adminUserId={user.id} path="/admin/export/license-codes" language={language} />
      </header>

      {error ? <p className="field-error">{error}</p> : null}

      <div className="admin-table-toolbar">
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={copy.search} />
      </div>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>{copy.colCode}</th>
              <th>{copy.colOwner}</th>
              <th>{copy.colPlan}</th>
              <th>{copy.colSeats}</th>
              <th>{copy.colStatus}</th>
              <th>{copy.colActions}</th>
            </tr>
          </thead>
          <tbody>
            {pagedItems.length ? (
              pagedItems.map((item) => (
                <tr key={item.code}>
                  <td>
                    <code className="admin-license-code">{item.code}</code>
                  </td>
                  <td>
                    <div className="admin-table-name">
                      <AvatarCircle
                        user={{ firstName: item.ownerFirstName, lastName: item.ownerLastName, avatarDataUrl: item.ownerAvatarDataUrl }}
                      />
                      <div>
                        <strong>
                          {item.ownerFirstName} {item.ownerLastName}
                        </strong>
                        <span className="muted">{item.ownerEmail}</span>
                      </div>
                    </div>
                  </td>
                  <td>{getPlanById(item.planId)?.name?.[language] || item.planId}</td>
                  <td className="muted">
                    {item.seatsUsed}/{item.seatsTotal}
                  </td>
                  <td>
                    <span className={`tag ${item.revoked ? "tag-danger" : "tag-success"}`}>
                      {item.revoked ? copy.revoked : copy.active}
                    </span>
                  </td>
                  <td>
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
                <td colSpan={6} className="admin-table-empty muted">
                  {copy.empty}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <AdminPagination page={page} totalPages={totalPages} onChange={setPage} language={language} totalItems={items.length} />
    </section>
  );
}
