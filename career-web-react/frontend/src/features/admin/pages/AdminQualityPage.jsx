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

export default function AdminQualityPage({ user, language }) {
  const copy = language === "en"
    ? { title: "Extraction quality", subtitle: "CVs that deserve manual review before they damage matching quality.", search: "Search suspicious CVs…", needs: "Needs review", partial: "Partial", colCv: "CV", colUser: "User", colIssues: "Issues", colScore: "Quality", empty: "No quality issue detected." }
    : { title: "Qualité extraction", subtitle: "CV à contrôler manuellement avant qu'ils dégradent la qualité du matching.", search: "Rechercher les CV suspects…", needs: "À revoir", partial: "Partiels", colCv: "CV", colUser: "Utilisateur", colIssues: "Points à corriger", colScore: "Qualité", empty: "Aucun problème qualité détecté." };
  const [data, setData] = useState({ items: [], totals: {} });
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    setPage(1);
    setLoading(true);
    getAdminQuality(user.id, { search }).then(setData).catch((err) => setError(getFriendlyErrorMessage(err, language))).finally(() => setLoading(false));
  }, [user.id, search, language]);
  const totalPages = Math.max(1, Math.ceil(data.items.length / ADMIN_PAGE_SIZE));
  const pagedItems = data.items.slice((page - 1) * ADMIN_PAGE_SIZE, page * ADMIN_PAGE_SIZE);
  return (
    <section className="admin-quality admin-module-pro">
      <header className="module-header"><h2>{copy.title}</h2><p>{copy.subtitle}</p></header>
      <div className="admin-module-metrics">
        <AdminMiniMetric icon="alert" label={copy.needs} value={data.totals?.needsReview || 0} tone="danger" />
        <AdminMiniMetric icon="shield" label={copy.partial} value={data.totals?.partial || 0} tone="warning" />
      </div>
      <div className="admin-table-toolbar"><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={copy.search} /></div>
      {error ? <p className="field-error">{error}</p> : null}
      {loading ? <AdminPageLoader language={language} /> : null}
      {!loading ? (
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead><tr><th>{copy.colCv}</th><th>{copy.colUser}</th><th>{copy.colIssues}</th><th>{copy.colScore}</th></tr></thead>
          <tbody>{pagedItems.length ? pagedItems.map((item) => (
            <tr key={item.id}>
              <td><strong>{item.fileName}</strong><span className="muted admin-block-muted">{formatDate(item.createdAt)}</span></td>
              <td><div className="admin-table-name"><AvatarCircle user={{ firstName: item.userFirstName, lastName: item.userLastName, avatarDataUrl: item.userAvatarDataUrl }} /><div><strong>{item.userFirstName} {item.userLastName}</strong><span className="muted">{item.userEmail}</span></div></div></td>
              <td><div className="admin-chip-cloud compact">{[...item.missing, ...item.suspicious].map((issue) => <span key={issue}>{issue}</span>)}</div></td>
              <td><span className={`tag ${item.score >= 75 ? "tag-success" : item.score < 55 ? "tag-danger" : ""}`}>{item.score}/100</span></td>
            </tr>
          )) : <tr><td colSpan={4} className="admin-table-empty muted">{copy.empty}</td></tr>}</tbody>
        </table>
      </div>
      ) : null}
      <AdminPagination page={page} totalPages={totalPages} onChange={setPage} language={language} totalItems={data.items.length} />
    </section>
  );
}
