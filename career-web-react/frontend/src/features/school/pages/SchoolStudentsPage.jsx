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
import { formatDate } from "../../../lib/format.js";
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
  ADMIN_PAGE_SIZE,
  planPriceLabel
} from "../../admin/AdminApp.jsx";
import AccountDrawer from "../../account/AccountDrawer.jsx";
import { ConnectedFooter } from "../../../App.jsx";
import { SchoolExportCsvButton, SchoolLicenseCard, SchoolEmptyState } from "../SchoolApp.jsx";

export default function SchoolStudentsPage({ user, language, initialSearch }) {
  const copy =
    language === "en"
      ? {
          title: "Students",
          subtitle: "Students linked to your school's license.",
          search: "Search by name or email…",
          colName: "Name",
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

  const totalPages = Math.max(1, Math.ceil(students.length / ADMIN_PAGE_SIZE));
  const pagedStudents = students.slice((page - 1) * ADMIN_PAGE_SIZE, page * ADMIN_PAGE_SIZE);
  const activeCount = students.filter((student) => student.active).length;
  const scoredCount = students.filter((student) => student.latestScore != null).length;

  async function handleRemove(student) {
    const result = await Swal.fire({
      icon: "warning",
      title: copy.removeTitle,
      html: `<p style="text-align:left;margin-bottom:0.6rem;">${copy.removeWarning}</p><p style="text-align:left;font-weight:700;">${student.firstName} ${student.lastName} · ${student.email}</p>`,
      showCancelButton: true,
      confirmButtonText: copy.removeConfirm,
      cancelButtonText: copy.cancel,
      confirmButtonColor: "#b91c1c",
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
        <SchoolExportCsvButton userId={user.id} language={language} />
      </header>

      <div className="admin-module-metrics">
        <AdminMiniMetric icon="profile" label={copy.totalLabel} value={students.length} tone="primary" />
        <AdminMiniMetric icon="chart" label={copy.activeLabel} value={activeCount} tone="success" />
        <AdminMiniMetric icon="scale" label={copy.scoredLabel} value={scoredCount} tone="warning" />
      </div>

      <div className="admin-table-toolbar">
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={copy.search} />
      </div>

      {error ? <p className="field-error">{error}</p> : null}

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>{copy.colName}</th>
              <th>{copy.colJoined}</th>
              <th>{copy.colActivity}</th>
              <th>{copy.colScore}</th>
              <th>{copy.colStatus}</th>
              <th>{copy.colActions}</th>
            </tr>
          </thead>
          <tbody>
            {pagedStudents.length ? (
              pagedStudents.map((student) => (
                <tr key={student.id}>
                  <td>
                    <div className="admin-table-name">
                      <AvatarCircle user={student} />
                      <div>
                        <strong>
                          {student.firstName} {student.lastName}
                        </strong>
                        <span className="muted">{student.email}</span>
                      </div>
                    </div>
                  </td>
                  <td className="muted">{formatDate(student.createdAt)}</td>
                  <td className="muted">{student.lastActivity ? formatDate(student.lastActivity) : copy.never}</td>
                  <td>
                    {student.latestScore != null ? (
                      <span className="tag">{student.latestScore}%</span>
                    ) : (
                      <span className="muted">—</span>
                    )}
                  </td>
                  <td>
                    <span className={`tag ${student.active ? "tag-success" : ""}`}>
                      {student.active ? copy.active : copy.inactive}
                    </span>
                  </td>
                  <td>
                    <div className="admin-row-actions">
                      <button type="button" className="admin-row-action danger" onClick={() => handleRemove(student)}>
                        <UiIcon name="alert" /> {copy.remove}
                      </button>
                    </div>
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

      <AdminPagination page={page} totalPages={totalPages} onChange={setPage} language={language} totalItems={students.length} />
    </section>
  );
}
