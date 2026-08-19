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

export default function AdminActivityLogPage({ user, language }) {
  const copy =
    language === "en"
      ? {
          title: "Activity log",
          subtitle: "Every security-relevant event recorded on the platform: logins, account changes, admin actions.",
          search: "Search by user, email, event or IP…",
          colDate: "Date",
          colUser: "Actor",
          colEvent: "Event",
          colDetails: "Details",
          colIp: "IP address",
          empty: "No event found.",
          allEvents: "All events"
        }
      : {
          title: "Journal d'activité",
          subtitle: "Tous les événements de sécurité enregistrés : connexions, modifications de compte, actions admin.",
          search: "Rechercher par utilisateur, email, événement ou IP…",
          colDate: "Date",
          colUser: "Acteur",
          colEvent: "Événement",
          colDetails: "Détails",
          colIp: "Adresse IP",
          empty: "Aucun événement trouvé.",
          allEvents: "Tous les événements"
        };

  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [eventType, setEventType] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
    getAdminActivityLog(user.id, { search, eventType })
      .then(setData)
      .catch((err) => setError(getFriendlyErrorMessage(err, language)));
  }, [user.id, search, eventType]);

  if (error) return <p className="field-error">{error}</p>;
  if (!data) return <AdminPageLoader language={language} />;

  const totalPages = Math.max(1, Math.ceil(data.items.length / ADMIN_PAGE_SIZE));
  const pagedItems = data.items.slice((page - 1) * ADMIN_PAGE_SIZE, page * ADMIN_PAGE_SIZE);
  const eventEntries = Object.entries(data.eventTypeCounts || {});

  return (
    <section className="admin-activity">
      <header className="module-header">
        <h2>{copy.title}</h2>
        <p>{copy.subtitle}</p>
      </header>

      <div className="admin-table-toolbar">
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={copy.search} />
      </div>

      <div className="admin-subtabs">
        <button type="button" className={`admin-subtab ${eventType === "" ? "active" : ""}`} onClick={() => setEventType("")}>
          <span>{copy.allEvents}</span>
          <strong>{data.items.length}</strong>
        </button>
        {eventEntries.map(([type, count]) => (
          <button
            key={type}
            type="button"
            className={`admin-subtab ${eventType === type ? "active" : ""}`}
            onClick={() => setEventType(type)}
          >
            <span>{eventTypeLabel(type, language)}</span>
            <strong>{count}</strong>
          </button>
        ))}
      </div>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>{copy.colDate}</th>
              <th>{copy.colUser}</th>
              <th>{copy.colEvent}</th>
              <th>{copy.colDetails}</th>
              <th>{copy.colIp}</th>
            </tr>
          </thead>
          <tbody>
            {pagedItems.length ? (
              pagedItems.map((item) => (
                <tr key={item.id}>
                  <td className="muted">{formatDate(item.createdAt)}</td>
                  <td>
                    <div className="admin-table-name">
                      <AvatarCircle
                        user={{ firstName: item.userFirstName, lastName: item.userLastName, avatarDataUrl: item.userAvatarDataUrl }}
                      />
                      <div>
                        <strong>
                          {item.userFirstName} {item.userLastName}
                        </strong>
                        <span className="muted">{item.userEmail}</span>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className="tag">{eventTypeLabel(item.eventType, language)}</span>
                  </td>
                  <td className="muted admin-activity-details">
                    {Object.keys(item.metadata || {}).length ? JSON.stringify(item.metadata) : "—"}
                  </td>
                  <td className="muted">{item.ipAddress || "—"}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="admin-table-empty muted">
                  {copy.empty}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <AdminPagination page={page} totalPages={totalPages} onChange={setPage} language={language} totalItems={data.items.length} />
    </section>
  );
}
