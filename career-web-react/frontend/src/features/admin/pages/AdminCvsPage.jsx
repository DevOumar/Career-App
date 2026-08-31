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

export default function AdminCvsPage({ user, language }) {
  const copy =
    language === "en"
      ? {
          title: "Uploaded CVs",
          subtitle: "Every CV saved in the platform, with extraction status and quick actions.",
          search: "Search by user, file, skill…",
          all: "All statuses",
          extracted: "Extracted",
          partial: "Partial",
          needsReview: "Needs review",
          allSegments: "All accounts",
          segmentSolo: "Solo candidate",
          segmentSchool: "School-linked student",
          segmentAgency: "Agency-linked",
          colCv: "CV",
          colUser: "User",
          colAccount: "Account",
          colStatus: "Status",
          colData: "Extracted data",
          colActions: "Actions",
          reanalyze: "Reanalyze",
          delete: "Delete",
          empty: "No CV found."
        }
      : {
          title: "CV importés",
          subtitle: "Tous les CV enregistrés dans la plateforme, avec statut d'extraction et actions rapides.",
          search: "Rechercher par utilisateur, fichier, compétence…",
          all: "Tous les statuts",
          extracted: "Extrait",
          partial: "Partiel",
          needsReview: "À revoir",
          allSegments: "Tous les comptes",
          segmentSolo: "Candidat solo",
          segmentSchool: "Étudiant rattaché à une école",
          segmentAgency: "Rattaché à un cabinet",
          colCv: "CV",
          colUser: "Utilisateur",
          colAccount: "Compte",
          colStatus: "Statut",
          colData: "Données extraites",
          colActions: "Actions",
          reanalyze: "Réanalyser",
          delete: "Supprimer",
          empty: "Aucun CV trouvé."
        };
  const [data, setData] = useState({ items: [], statusCounts: {}, segmentCounts: {} });
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [segment, setSegment] = useState("");
  const [page, setPage] = useState(1);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState("");
  const [loading, setLoading] = useState(true);

  function reload() {
    setLoading(true);
    getAdminCvs(user.id, { search, status, segment })
      .then(setData)
      .catch((err) => setError(getFriendlyErrorMessage(err, language)))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    setPage(1);
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, status, segment]);

  async function handleReanalyze(item) {
    setBusyId(item.id);
    try {
      await reanalyzeAdminCv({ adminUserId: user.id, cvId: item.id });
      reload();
    } catch (err) {
      Swal.fire({ icon: "error", title: getFriendlyErrorMessage(err, language) });
    } finally {
      setBusyId("");
    }
  }

  async function handleDelete(item) {
    const result = await Swal.fire({
      icon: "warning",
      title: language === "en" ? "Delete this CV?" : "Supprimer ce CV ?",
      text: item.fileName,
      showCancelButton: true,
      confirmButtonText: copy.delete,
      cancelButtonText: language === "en" ? "Cancel" : "Annuler",
      confirmButtonColor: "#f5222d"
    });
    if (!result.isConfirmed) return;
    setBusyId(item.id);
    try {
      await deleteAdminCv({ adminUserId: user.id, cvId: item.id });
      reload();
    } catch (err) {
      Swal.fire({ icon: "error", title: getFriendlyErrorMessage(err, language) });
    } finally {
      setBusyId("");
    }
  }

  const statusCopy = { extracted: copy.extracted, partial: copy.partial, needs_review: copy.needsReview };
  const totalPages = Math.max(1, Math.ceil(data.items.length / ADMIN_PAGE_SIZE));
  const pagedItems = data.items.slice((page - 1) * ADMIN_PAGE_SIZE, page * ADMIN_PAGE_SIZE);

  return (
    <section className="admin-cvs admin-module-pro">
      <header className="module-header">
        <h2>{copy.title}</h2>
        <p>{copy.subtitle}</p>
      </header>
      <div className="admin-module-metrics">
        <AdminMiniMetric icon="save" label={copy.extracted} value={data.statusCounts?.extracted || 0} tone="success" />
        <AdminMiniMetric icon="alert" label={copy.partial} value={data.statusCounts?.partial || 0} tone="warning" />
        <AdminMiniMetric icon="shield" label={copy.needsReview} value={data.statusCounts?.needs_review || 0} tone="danger" />
      </div>
      <div className="admin-table-toolbar split triple">
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={copy.search} />
        <select value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="">{copy.all}</option>
          <option value="extracted">{copy.extracted}</option>
          <option value="partial">{copy.partial}</option>
          <option value="needs_review">{copy.needsReview}</option>
        </select>
        <select value={segment} onChange={(event) => setSegment(event.target.value)}>
          <option value="">{copy.allSegments}</option>
          <option value="solo">{copy.segmentSolo} ({data.segmentCounts?.solo || 0})</option>
          <option value="school">{copy.segmentSchool} ({data.segmentCounts?.school || 0})</option>
          <option value="agency">{copy.segmentAgency} ({data.segmentCounts?.agency || 0})</option>
        </select>
      </div>
      {error ? <p className="field-error">{error}</p> : null}
      {loading ? <AdminPageLoader language={language} /> : null}
      {!loading && !error ? (
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>{copy.colCv}</th>
              <th>{copy.colUser}</th>
              <th>{copy.colAccount}</th>
              <th>{copy.colStatus}</th>
              <th>{copy.colData}</th>
              <th>{copy.colActions}</th>
            </tr>
          </thead>
          <tbody>
            {pagedItems.length ? pagedItems.map((item) => (
              <tr key={item.id}>
                <td>
                  <strong>{item.fileName}</strong>
                  <span className="muted admin-block-muted">{formatDate(item.createdAt)} · {item.characterCount} car.</span>
                </td>
                <td>
                  <div className="admin-table-name">
                    <AvatarCircle user={{ firstName: item.userFirstName, lastName: item.userLastName, avatarDataUrl: item.userAvatarDataUrl }} />
                    <div>
                      <strong>{item.userFirstName} {item.userLastName}</strong>
                      <span className="muted">{item.userEmail}</span>
                    </div>
                  </div>
                </td>
                <td>
                  <span className={`tag ${item.accountSegment === "school" ? "tag-success" : item.accountSegment === "agency" ? "tag-warning" : ""}`}>
                    {item.accountSegment === "school" ? copy.segmentSchool : item.accountSegment === "agency" ? copy.segmentAgency : copy.segmentSolo}
                  </span>
                </td>
                <td><span className={`tag ${item.status === "extracted" ? "tag-success" : item.status === "needs_review" ? "tag-danger" : ""}`}>{statusCopy[item.status] || item.status}</span></td>
                <td>
                  <div className="admin-extract-preview">
                    <strong>{item.preview.headline || `${item.preview.firstName} ${item.preview.lastName}`.trim() || "—"}</strong>
                    <span>{item.extraction.counts.skills} skills · {item.extraction.counts.experiences} exp. · {item.extraction.counts.education} formations</span>
                    <small>{item.preview.skills.slice(0, 5).join(", ")}</small>
                  </div>
                </td>
                <td>
                  <div className="admin-row-actions">
                    <button type="button" className="admin-row-action" disabled={busyId === item.id} onClick={() => handleReanalyze(item)}>
                      <UiIcon name="history" /> {copy.reanalyze}
                    </button>
                    <button type="button" className="admin-row-action danger" disabled={busyId === item.id} onClick={() => handleDelete(item)}>
                      <UiIcon name="trash" /> {copy.delete}
                    </button>
                  </div>
                </td>
              </tr>
            )) : (
              <tr><td colSpan={6} className="admin-table-empty muted">{copy.empty}</td></tr>
            )}
          </tbody>
        </table>
      </div>
      ) : null}
      <AdminPagination page={page} totalPages={totalPages} onChange={setPage} language={language} totalItems={data.items.length} />
    </section>
  );
}
