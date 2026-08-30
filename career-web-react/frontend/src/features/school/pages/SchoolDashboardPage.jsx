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

export default function SchoolDashboardPage({ user, language }) {
  const [overview, setOverview] = useState(null);
  const [recentStudents, setRecentStudents] = useState(null);
  const [error, setError] = useState("");
  const copy =
    language === "en"
      ? {
          title: "Dashboard",
          subtitle: "Real-time indicators for your students on Career CV.",
          students: "Associated students",
          seats: "Seats used",
          activation: "Activation rate",
          cvs: "CVs imported",
          matches: "Matches run",
          avgScore: "Average match score",
          inactive: "Inactive 30+ days",
          trend: "New students — last 8 weeks",
          noTrendTitle: "No recent signup",
          noTrendHint: "New students linked to your license will appear here week by week.",
          noScore: "No data yet",
          recentStudents: "Recently joined",
          noStudents: "No student linked to your license yet.",
          joinedOn: "Joined",
          activityBreakdown: "Activity breakdown",
          activeLabel: "Active (30d)",
          inactiveLabel: "Inactive",
          noActivityTitle: "No activity yet",
          noActivityHint: "Activity starts when students import a CV or launch a match analysis."
        }
      : {
          title: "Dashboard",
          subtitle: "Indicateurs en temps réel de vos étudiants sur Career CV.",
          students: "Étudiants associés",
          seats: "Sièges utilisés",
          activation: "Taux d'activation",
          cvs: "CV importés",
          matches: "Analyses réalisées",
          avgScore: "Score de matching moyen",
          inactive: "Inactifs depuis 30j+",
          trend: "Nouveaux étudiants — 8 dernières semaines",
          noTrendTitle: "Aucune inscription récente",
          noTrendHint: "Les nouveaux étudiants rattachés à votre licence apparaîtront ici semaine par semaine.",
          noScore: "Pas encore de données",
          recentStudents: "Derniers inscrits",
          noStudents: "Aucun étudiant rattaché à votre licence pour l'instant.",
          joinedOn: "Inscrit le",
          activityBreakdown: "Répartition de l'activité",
          activeLabel: "Actifs (30j)",
          inactiveLabel: "Inactifs",
          noActivityTitle: "Aucune activité pour le moment",
          noActivityHint: "L'activité démarre quand les étudiants importent un CV ou lancent une analyse de matching."
        };

  useEffect(() => {
    getSchoolOverview(user.id)
      .then(setOverview)
      .catch((err) => setError(getFriendlyErrorMessage(err, language)));
    getSchoolStudents(user.id)
      .then((items) =>
        setRecentStudents([...items].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5))
      )
      .catch(() => setRecentStudents([]));
  }, [user.id]);

  if (error) return <p className="field-error">{error}</p>;
  if (!overview) return <AdminPageLoader language={language} />;

  return (
    <section className="admin-dashboard">
      <header className="module-header">
        <h2>{copy.title}</h2>
        <p>{copy.subtitle}</p>
      </header>

      <div className="admin-kpi-grid">
        <AdminKpiCard tone="primary" icon="profile" value={overview.totalStudents} label={copy.students} />
        <AdminKpiCard
          tone="warning"
          icon="save"
          value={`${overview.seatsUsed}/${overview.seatsTotal}`}
          label={copy.seats}
        />
        <AdminKpiCard tone="success" icon="chart" value={`${overview.activationRate}%`} label={copy.activation} />
        <AdminKpiCard tone="primary" icon="upload" value={overview.totalCvs} label={copy.cvs} />
        <AdminKpiCard tone="warning" icon="chart" value={overview.totalMatchRuns} label={copy.matches} />
        <AdminKpiCard
          tone="success"
          icon="scale"
          value={overview.avgScore != null ? `${overview.avgScore}%` : "—"}
          label={copy.avgScore}
        />
        <AdminKpiCard tone="danger" icon="alert" value={overview.inactiveStudents} label={copy.inactive} />
      </div>

      <div className="admin-panel-grid">
        <div className="admin-panel admin-trend-panel">
          <h3>{copy.trend}</h3>
          {overview.signupsTrend?.some((point) => point.count > 0) ? (
            <AdminTrendChart trend={overview.signupsTrend} language={language} />
          ) : (
            <SchoolEmptyState icon="chart" title={copy.noTrendTitle} hint={copy.noTrendHint} />
          )}
        </div>

        <div className="admin-panel admin-trend-panel">
          <h3>{copy.recentStudents}</h3>
          {recentStudents?.length ? (
            <div className="admin-recent-activity">
              {recentStudents.map((student) => (
                <div key={student.id} className="admin-recent-activity-row">
                  <AvatarCircle user={student} />
                  <div>
                    <strong>
                      {student.firstName} {student.lastName}
                    </strong>
                    <span className="muted">{student.email}</span>
                  </div>
                  <span className="admin-recent-activity-time">
                    {copy.joinedOn} {formatDate(student.createdAt)}
                  </span>
                </div>
              ))}
            </div>
          ) : recentStudents ? (
            <SchoolEmptyState icon="profile" title={copy.recentStudents} hint={copy.noStudents} />
          ) : (
            <AdminPageLoader language={language} />
          )}
        </div>

        <div className="admin-panel admin-trend-panel">
          <h3>{copy.activityBreakdown}</h3>
          {overview.totalStudents ? (
            <AdminDonutChart
              segments={[
                {
                  label: copy.activeLabel,
                  value: overview.totalStudents - overview.inactiveStudents,
                  color: "var(--success)"
                },
                { label: copy.inactiveLabel, value: overview.inactiveStudents, color: "var(--danger)" }
              ]}
              emptyLabel={copy.noStudents}
            />
          ) : (
            <SchoolEmptyState icon="chart" title={copy.noActivityTitle} hint={copy.noActivityHint} />
          )}
        </div>
      </div>
    </section>
  );
}
