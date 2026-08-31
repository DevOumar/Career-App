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

export default function AdminMatchesPage({ user, language }) {
  const copy = language === "en"
    ? { title: "Analyzed jobs", subtitle: "CV/job matching history and market signals from real user analyses.", search: "Search by user, job, company…", avg: "Average score", skills: "Top skills", sectors: "Top sectors", colJob: "Job", colUser: "User", colAccount: "Account", colScore: "Score", colSignals: "Signals", empty: "No analyzed job yet.", allSegments: "All accounts", segmentSolo: "Solo candidate", segmentSchool: "School-linked", segmentAgency: "Agency-linked" }
    : { title: "Offres analysées", subtitle: "Historique des matchings CV/offres et signaux métier issus des vraies analyses.", search: "Rechercher par utilisateur, poste, entreprise…", avg: "Score moyen", skills: "Compétences demandées", sectors: "Secteurs fréquents", colJob: "Offre", colUser: "Utilisateur", colAccount: "Compte", colScore: "Score", colSignals: "Signaux", empty: "Aucune offre analysée.", allSegments: "Tous les comptes", segmentSolo: "Candidat solo", segmentSchool: "Rattaché école", segmentAgency: "Rattaché cabinet" };
  const [data, setData] = useState({ items: [], topSkills: [], topSectors: [], averageScore: null, segmentCounts: {} });
  const [search, setSearch] = useState("");
  const [segment, setSegment] = useState("");
  const [page, setPage] = useState(1);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    setPage(1);
    setLoading(true);
    getAdminMatches(user.id, { search, segment }).then(setData).catch((err) => setError(getFriendlyErrorMessage(err, language))).finally(() => setLoading(false));
  }, [user.id, search, segment, language]);
  const totalPages = Math.max(1, Math.ceil(data.items.length / ADMIN_PAGE_SIZE));
  const pagedItems = data.items.slice((page - 1) * ADMIN_PAGE_SIZE, page * ADMIN_PAGE_SIZE);
  return (
    <section className="admin-matches admin-module-pro">
      <header className="module-header"><h2>{copy.title}</h2><p>{copy.subtitle}</p></header>
      <div className="admin-module-split">
        <div className="admin-signal-card"><AdminMiniMetric icon="chart" label={copy.avg} value={data.averageScore == null ? "—" : `${data.averageScore}/100`} /></div>
        <div className="admin-signal-card"><h3>{copy.skills}</h3><div className="admin-chip-cloud">{data.topSkills.map((item) => <span key={item.name}>{item.name}<strong>{item.count}</strong></span>)}</div></div>
        <div className="admin-signal-card"><h3>{copy.sectors}</h3><div className="admin-chip-cloud">{data.topSectors.map((item) => <span key={item.name}>{item.name}<strong>{item.count}</strong></span>)}</div></div>
      </div>
      <div className="admin-table-toolbar split">
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={copy.search} />
        <select value={segment} onChange={(event) => setSegment(event.target.value)}>
          <option value="">{copy.allSegments}</option>
          <option value="solo">{copy.segmentSolo} ({data.segmentCounts?.solo || 0})</option>
          <option value="school">{copy.segmentSchool} ({data.segmentCounts?.school || 0})</option>
          <option value="agency">{copy.segmentAgency} ({data.segmentCounts?.agency || 0})</option>
        </select>
      </div>
      {error ? <p className="field-error">{error}</p> : null}
      {loading ? <AdminPageLoader language={language} /> : null}
      {!loading ? (
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead><tr><th>{copy.colJob}</th><th>{copy.colUser}</th><th>{copy.colAccount}</th><th>{copy.colScore}</th><th>{copy.colSignals}</th></tr></thead>
          <tbody>
            {pagedItems.length ? pagedItems.map((item) => (
              <tr key={item.id}>
                <td><strong>{item.title || "—"}</strong><span className="muted admin-block-muted">{item.company || "—"} · {item.location || "—"} · {formatDate(item.createdAt)}</span></td>
                <td><div className="admin-table-name"><AvatarCircle user={{ firstName: item.userFirstName, lastName: item.userLastName, avatarDataUrl: item.userAvatarDataUrl }} /><div><strong>{item.userFirstName} {item.userLastName}</strong><span className="muted">{item.userEmail}</span></div></div></td>
                <td><span className={`tag ${item.accountSegment === "school" ? "tag-success" : item.accountSegment === "agency" ? "tag-warning" : ""}`}>{item.accountSegment === "school" ? copy.segmentSchool : item.accountSegment === "agency" ? copy.segmentAgency : copy.segmentSolo}</span></td>
                <td><span className={`tag ${Number(item.score) >= 75 ? "tag-success" : Number(item.score) < 50 ? "tag-danger" : ""}`}>{item.score == null ? "—" : `${item.score}/100`}</span></td>
                <td><div className="admin-chip-cloud compact">{[...item.technicalSkills.slice(0, 4), ...item.missingKeywords.slice(0, 3)].map((skill) => <span key={skill}>{skill}</span>)}</div></td>
              </tr>
            )) : <tr><td colSpan={5} className="admin-table-empty muted">{copy.empty}</td></tr>}
          </tbody>
        </table>
      </div>
      ) : null}
      <AdminPagination page={page} totalPages={totalPages} onChange={setPage} language={language} totalItems={data.items.length} />
    </section>
  );
}
