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
  sendSchoolAnnouncement,
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

export default function SchoolDashboardPage({ user, language, onGoToTab }) {
  const [overview, setOverview] = useState(null);
  const [recentStudents, setRecentStudents] = useState(null);
  const [error, setError] = useState("");
  const onboardingKey = `career_app_school_onboarding_dismissed_${user.id}`;
  const [showOnboarding, setShowOnboarding] = useState(() => {
    try {
      return localStorage.getItem(onboardingKey) !== "1";
    } catch (_error) {
      return true;
    }
  });

  function dismissOnboarding() {
    setShowOnboarding(false);
    try {
      localStorage.setItem(onboardingKey, "1");
    } catch (_error) {
      // ignore storage errors (private mode, quota, etc.)
    }
  }

  const [relanceBusy, setRelanceBusy] = useState("");

  async function launchRelance(segment) {
    const result = await Swal.fire({
      icon: "question",
      title: language === "en" ? "Send this reminder?" : "Envoyer cette relance ?",
      text: `${segment.subject} — ${segment.count} ${language === "en" ? "recipient(s)" : "destinataire(s)"}`,
      showCancelButton: true,
      confirmButtonText: language === "en" ? "Send" : "Envoyer",
      cancelButtonText: language === "en" ? "Cancel" : "Annuler"
    });
    if (!result.isConfirmed) return;
    setRelanceBusy(segment.key);
    try {
      await sendSchoolAnnouncement(user.id, { subject: segment.subject, message: segment.message, studentIds: segment.studentIds });
      Swal.fire({ icon: "success", title: copy.relanceSent, timer: 1800, showConfirmButton: false });
    } catch (err) {
      Swal.fire({ icon: "error", title: getFriendlyErrorMessage(err, language) });
    } finally {
      setRelanceBusy("");
    }
  }
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
          noActivityHint: "Activity starts when students import a CV or launch a match analysis.",
          onboardingTitle: "Getting started with your School space",
          onboardingSteps: [
            { tab: "invitations", label: "Invite your students", hint: "One by one or in bulk via CSV import." },
            { tab: "promotions", label: "Create your promotions", hint: "Organize students by program, campus, year." },
            { tab: "insights", label: "Track employability", hint: "Score distribution, missing skills, ranking." },
            { tab: "reports", label: "Generate a report", hint: "A printable summary to share internally." }
          ],
          onboardingDismiss: "Got it, don't show again",
          relanceTitle: "Targeted follow-up",
          relanceHint: "Send a reminder email to only the students in one of these segments.",
          relanceInactive: "Inactive 30+ days",
          relanceWithoutCv: "Without CV",
          relanceLowScore: "Low scores",
          relanceSubjectInactive: "We miss you on Career CV",
          relanceMessageInactive: "It's been a while — come back and keep working on your job search with Career CV.",
          relanceSubjectWithoutCv: "Import your CV to get started",
          relanceMessageWithoutCv: "You haven't imported a CV yet — do it now to unlock CV analysis and job matching.",
          relanceSubjectLowScore: "Boost your match score",
          relanceMessageLowScore: "Your latest match score is below 50%. Try the CV optimizer to improve your chances.",
          relanceSent: "Reminder sent."
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
          noActivityHint: "L'activité démarre quand les étudiants importent un CV ou lancent une analyse de matching.",
          onboardingTitle: "Bien démarrer avec votre espace École",
          onboardingSteps: [
            { tab: "invitations", label: "Invitez vos étudiants", hint: "Un par un ou en masse via import CSV." },
            { tab: "promotions", label: "Créez vos promotions", hint: "Organisez par programme, campus, année." },
            { tab: "insights", label: "Suivez l'employabilité", hint: "Répartition des scores, compétences manquantes, classement." },
            { tab: "reports", label: "Générez un rapport", hint: "Une synthèse imprimable à partager en interne." }
          ],
          onboardingDismiss: "Compris, ne plus afficher",
          relanceTitle: "Relances ciblées",
          relanceHint: "Envoyez un email de rappel uniquement aux étudiants de l'un de ces segments.",
          relanceInactive: "Inactifs depuis 30j+",
          relanceWithoutCv: "Sans CV",
          relanceLowScore: "Scores faibles",
          relanceSubjectInactive: "On ne vous voit plus sur Career CV",
          relanceMessageInactive: "Cela fait un moment — revenez continuer votre recherche d'emploi avec Career CV.",
          relanceSubjectWithoutCv: "Importez votre CV pour démarrer",
          relanceMessageWithoutCv: "Vous n'avez pas encore importé de CV — faites-le maintenant pour débloquer l'analyse et le matching.",
          relanceSubjectLowScore: "Améliorez votre score de matching",
          relanceMessageLowScore: "Votre dernier score de matching est sous 50 %. Essayez l'optimiseur de CV pour améliorer vos chances.",
          relanceSent: "Relance envoyée."
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

  const relanceSegments = [
    {
      key: "inactive",
      label: copy.relanceInactive,
      count: overview.inactiveStudentIds?.length || 0,
      studentIds: overview.inactiveStudentIds || [],
      subject: copy.relanceSubjectInactive,
      message: copy.relanceMessageInactive
    },
    {
      key: "withoutCv",
      label: copy.relanceWithoutCv,
      count: overview.withoutCvStudentIds?.length || 0,
      studentIds: overview.withoutCvStudentIds || [],
      subject: copy.relanceSubjectWithoutCv,
      message: copy.relanceMessageWithoutCv
    },
    {
      key: "lowScore",
      label: copy.relanceLowScore,
      count: overview.lowScoreStudentIds?.length || 0,
      studentIds: overview.lowScoreStudentIds || [],
      subject: copy.relanceSubjectLowScore,
      message: copy.relanceMessageLowScore
    }
  ].filter((segment) => segment.count > 0);

  return (
    <section className="admin-dashboard">
      <header className="module-header">
        <h2>{copy.title}</h2>
        <p>{copy.subtitle}</p>
      </header>

      {showOnboarding ? (
        <div className="school-onboarding-panel">
          <div className="school-onboarding-head">
            <h3>{copy.onboardingTitle}</h3>
            <button type="button" className="school-onboarding-close" onClick={dismissOnboarding} aria-label={copy.onboardingDismiss}>
              ×
            </button>
          </div>
          <div className="school-onboarding-steps">
            {copy.onboardingSteps.map((step, index) => (
              <button
                type="button"
                key={step.tab}
                className="school-onboarding-step"
                onClick={() => onGoToTab?.(step.tab)}
              >
                <span className="school-onboarding-step-index">{index + 1}</span>
                <div>
                  <strong>{step.label}</strong>
                  <span className="muted">{step.hint}</span>
                </div>
              </button>
            ))}
          </div>
          <button type="button" className="btn-ghost school-onboarding-dismiss" onClick={dismissOnboarding}>
            {copy.onboardingDismiss}
          </button>
        </div>
      ) : null}

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

      {relanceSegments.length ? (
        <div className="admin-panel school-relance-panel">
          <h3>
            <span className="school-panel-icon">
              <UiIcon name="mail" />
            </span>
            {copy.relanceTitle}
          </h3>
          <p className="muted">{copy.relanceHint}</p>
          <div className="school-relance-actions">
            {relanceSegments.map((segment) => (
              <button
                type="button"
                key={segment.key}
                className="btn-ghost"
                disabled={relanceBusy === segment.key}
                onClick={() => launchRelance(segment)}
              >
                {relanceBusy === segment.key ? <span className="btn-spinner dark" /> : <UiIcon name="mail" />}
                {segment.label} ({segment.count})
              </button>
            ))}
          </div>
        </div>
      ) : null}

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
