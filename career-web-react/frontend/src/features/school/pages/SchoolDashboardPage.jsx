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
import { formatDate, formatDateTime } from "../../../lib/format.js";
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
  AdminLineIcon,
  JyBarChart,
  ADMIN_PAGE_SIZE,
  planPriceLabel
} from "../../admin/AdminApp.jsx";
import AccountDrawer from "../../account/AccountDrawer.jsx";
import { ConnectedFooter } from "../../../App.jsx";
import { SchoolExportCsvButton, SchoolLicenseCard, SchoolEmptyState } from "../SchoolApp.jsx";

export default function SchoolDashboardPage({ user, language, onGoToTab }) {
  const [overview, setOverview] = useState(null);
  const [recentStudents, setRecentStudents] = useState(null);
  const [schoolName, setSchoolName] = useState("");
  const [insights, setInsights] = useState(null);
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
      text: `${segment.subject} · ${segment.count} ${language === "en" ? "recipient(s)" : "destinataire(s)"}`,
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
          trend: "New students, last 8 weeks",
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
          relanceMessageInactive: "It's been a while, come back and keep working on your job search with Career CV.",
          relanceSubjectWithoutCv: "Import your CV to get started",
          relanceMessageWithoutCv: "You haven't imported a CV yet, do it now to unlock CV analysis and job matching.",
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
          trend: "Nouveaux étudiants, 8 dernières semaines",
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
          relanceMessageInactive: "Cela fait un moment, revenez continuer votre recherche d'emploi avec Career CV.",
          relanceSubjectWithoutCv: "Importez votre CV pour démarrer",
          relanceMessageWithoutCv: "Vous n'avez pas encore importé de CV, faites-le maintenant pour débloquer l'analyse et le matching.",
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
    getSchoolProfile(user.id)
      .then((data) => setSchoolName(data?.profile?.organizationName || ""))
      .catch(() => {});
    getSchoolInsights(user.id)
      .then(setInsights)
      .catch(() => setInsights(null));
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

  const t = (fr, en) => (language === "en" ? en : fr);
  const go = (tab) => onGoToTab?.(tab);
  const seatsFull = overview.seatsTotal > 0 && overview.seatsUsed >= overview.seatsTotal;
  const seatShare = overview.seatsTotal ? Math.round((overview.seatsUsed / overview.seatsTotal) * 100) : 0;
  const today = new Intl.DateTimeFormat(language === "en" ? "en-GB" : "fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(new Date());
  const activeStudents = Math.max(0, (overview.totalStudents || 0) - (overview.inactiveStudents || 0));
  const alertIcon = (type = "") => (type.includes("license") || type.includes("seat") ? "licenses" : type.includes("score") ? "trend" : type.includes("cv") ? "adminCvs" : "clock");
  const alertTab = (type = "") => (type.includes("license") || type.includes("seat") ? "license" : type.includes("score") ? "insights" : "students");

  const stats = [
    {
      id: "students",
      icon: "accounts",
      tone: "green",
      value: overview.totalStudents,
      label: copy.students,
      hint: t(`dont ${activeStudents} actif(s) ces 30 derniers jours`, `${activeStudents} active in the last 30 days`)
    },
    {
      id: "license",
      icon: "licenses",
      tone: seatsFull ? "danger" : "gold",
      value: `${overview.seatsUsed}/${overview.seatsTotal}`,
      label: copy.seats,
      hint: seatsFull ? t("Licence complète", "License full") : t(`${seatShare} % de la licence utilisée`, `${seatShare}% of the license used`)
    },
    {
      id: "insights",
      icon: "adminCvs",
      tone: "blue",
      value: overview.totalCvs,
      label: copy.cvs,
      hint: t(`${overview.totalMatchRuns} analyse(s) réalisée(s)`, `${overview.totalMatchRuns} analysis(es) run`)
    },
    {
      id: "insights",
      key: "score",
      icon: "trend",
      tone: "gold",
      value: overview.avgScore != null ? `${overview.avgScore} %` : "-",
      label: copy.avgScore,
      hint: t(`Taux d'activation ${overview.activationRate} %`, `Activation rate ${overview.activationRate}%`)
    }
  ];

  const engagement = overview.engagement || {};
  const pct = (part, total) => (total ? Math.round((part / total) * 100) : 0);
  const readyShare = pct(engagement.readyStudents || 0, engagement.studentsWithScore || 0);
  const cvCoverage = pct((overview.totalStudents || 0) - (overview.withoutCv || 0), overview.totalStudents || 0);
  const applyingShare = pct(engagement.studentsWithApplication || 0, overview.totalStudents || 0);
  const impactTiles = [
    {
      key: "ready",
      icon: "quality",
      tone: "green",
      value: `${readyShare} %`,
      label: t("Prêts à l'emploi", "Job-ready"),
      hint: t(`${engagement.readyStudents || 0} / ${engagement.studentsWithScore || 0} étudiants avec un score ≥ 60 %`, `${engagement.readyStudents || 0} / ${engagement.studentsWithScore || 0} students scoring ≥ 60%`),
      share: readyShare
    },
    {
      key: "cv",
      icon: "adminCvs",
      tone: "blue",
      value: `${cvCoverage} %`,
      label: t("Couverture CV", "CV coverage"),
      hint: t(`${overview.totalCvs} CV importés`, `${overview.totalCvs} CVs imported`),
      share: cvCoverage
    },
    {
      key: "applications",
      icon: "briefcase",
      tone: "gold",
      value: engagement.applications || 0,
      label: t("Candidatures suivies", "Tracked applications"),
      hint: t(`${applyingShare} % des étudiants candidatent`, `${applyingShare}% of students applying`),
      share: applyingShare
    },
    { key: "interviews", icon: "quote", tone: "green", value: engagement.interviews || 0, label: t("Entretiens simulés", "Mock interviews"), hint: t("avec le coach IA", "with the AI coach") },
    { key: "letters", icon: "send", tone: "blue", value: engagement.coverLetters || 0, label: t("Lettres de motivation", "Cover letters"), hint: t("générées et personnalisées", "generated and tailored") },
    { key: "negotiations", icon: "finance", tone: "gold", value: engagement.negotiations || 0, label: t("Négociations salariales", "Salary negotiations"), hint: t("préparées avec l'IA", "prepared with AI") }
  ];
  const byStatus = engagement.applicationsByStatus || {};
  const funnel = [
    { key: "to_apply", label: t("À postuler", "To apply"), value: byStatus.to_apply || 0 },
    { key: "applied", label: t("Postulées", "Applied"), value: byStatus.applied || 0 },
    { key: "interview", label: t("Entretiens", "Interviews"), value: byStatus.interview || 0 },
    { key: "offer", label: t("Offres reçues", "Offers"), value: byStatus.offer || 0 }
  ];
  const funnelMax = Math.max(...funnel.map((step) => step.value), 0);
  const topSkills = (overview.topSkills || []).slice(0, 6);
  const missingKeywords = (insights?.topMissingKeywords || []).slice(0, 10);
  const targetRoles = (overview.topTargetRoles || []).slice(0, 3);
  const activityShare = pct(activeStudents, overview.totalStudents || 0);
  const alertTone = (type = "") => (type.includes("license") || type.includes("seat") ? "danger" : type.includes("score") ? "warn" : "info");

  const figures = [
    { label: copy.activation, value: `${overview.activationRate} %`, tone: "green" },
    { label: copy.matches, value: overview.totalMatchRuns, tone: "" },
    { label: copy.inactive, value: overview.inactiveStudents, tone: overview.inactiveStudents ? "danger" : "" },
    { label: t("Scores faibles", "Low scores"), value: overview.lowScores || 0, tone: overview.lowScores ? "gold" : "" }
  ];

  return (
    <section className="admin-dashboard jy-dashboard">
      <header className="jy-hero">
        <div>
          <h1>
            {t("Bonjour", "Hello")} {user.firstName} {user.lastName}
          </h1>
          <p>{t("Voici l'activité de vos étudiants aujourd'hui.", "Here is your students' activity today.")}</p>
        </div>
        {/* Simple repère de page, pas un lien. */}
        <span className="jy-page-tag">{t("Tableau de bord", "Dashboard")}</span>
      </header>

      <button type="button" className="jy-status" onClick={() => go("license")}>
        <span className="jy-status-main">
          <AdminLineIcon name="schools" />
          <span>
            <strong>{schoolName || t("Votre établissement", "Your institution")}</strong>
            <small>{today}</small>
          </span>
        </span>
        <span className="jy-status-meta">
          <span className="jy-status-item">
            <AdminLineIcon name="accounts" /> {overview.totalStudents}
          </span>
          <span className="jy-status-item">
            <AdminLineIcon name="seat" /> {overview.seatsUsed}/{overview.seatsTotal} {t("sièges", "seats")}
          </span>
          <span className={`jy-status-link ${seatsFull ? "warn" : ""}`}>
            {seatsFull ? t("Licence complète", "License full") : t("Voir la licence", "View license")}
          </span>
          <AdminLineIcon name="chevronRight" />
        </span>
      </button>

      {showOnboarding ? (
        <div className="jy-card jy-onboard">
          <div className="jy-card-head">
            <h3>{copy.onboardingTitle}</h3>
            <button type="button" className="jy-onboard-close" onClick={dismissOnboarding} aria-label={copy.onboardingDismiss}>
              <AdminLineIcon name="close" />
            </button>
          </div>
          <div className="jy-onboard-steps">
            {copy.onboardingSteps.map((step, index) => (
              <button type="button" key={step.tab} className="jy-onboard-step" onClick={() => go(step.tab)}>
                <span className="jy-onboard-index">{index + 1}</span>
                <span>
                  <strong>{step.label}</strong>
                  <small>{step.hint}</small>
                </span>
                <AdminLineIcon name="chevronRight" />
              </button>
            ))}
          </div>
          <button type="button" className="jy-link jy-onboard-dismiss" onClick={dismissOnboarding}>
            {copy.onboardingDismiss}
          </button>
        </div>
      ) : null}

      <div className="jy-stats">
        {stats.map((stat) => (
          <button type="button" key={stat.key || stat.id} className="jy-stat" onClick={() => go(stat.id)}>
            <span className={`jy-stat-icon ${stat.tone}`}>
              <AdminLineIcon name={stat.icon} />
            </span>
            <strong className="jy-stat-value">{stat.value}</strong>
            <span className="jy-stat-label">{stat.label}</span>
            <small className="jy-stat-hint">{stat.hint}</small>
          </button>
        ))}
      </div>

      <div className="jy-card jy-growth">
        <div className="jy-card-head">
          <h3>{copy.trend}</h3>
          <button type="button" className="jy-link" onClick={() => go("students")}>
            {t("Voir les étudiants", "View students")}
          </button>
        </div>
        <div className="jy-figures">
          {figures.map((figure) => (
            <div key={figure.label} className="jy-figure">
              <span>{figure.label}</span>
              <strong className={figure.tone}>{figure.value}</strong>
            </div>
          ))}
        </div>
        {overview.signupsTrend?.some((point) => point.count > 0) ? (
          <JyBarChart
            trend={overview.signupsTrend}
            language={language}
            series={[{ key: "count", label: t("Nouveaux étudiants", "New students"), tone: "green" }]}
          />
        ) : (
          <p className="jy-empty">{copy.noTrendHint}</p>
        )}
      </div>

      {/* ------------------------------------------------ Impact employabilité (engagement réel des étudiants) */}
      <div className="jy-card">
        <div className="jy-card-head">
          <div>
            <h3>{t("Impact employabilité", "Employability impact")}</h3>
            <p className="jy-card-sub">{t("Ce que vos étudiants accomplissent avec Career CV.", "What your students achieve with Career CV.")}</p>
          </div>
          <button type="button" className="jy-link" onClick={() => go("insights")}>
            {t("Suivi détaillé", "Detailed tracking")}
          </button>
        </div>
        <div className="jy-impact">
          {impactTiles.map((tile) => (
            <div key={tile.key} className="jy-impact-tile">
              <span className={`jy-impact-icon ${tile.tone}`}>
                <AdminLineIcon name={tile.icon} />
              </span>
              <strong>{tile.value}</strong>
              <span className="jy-impact-label">{tile.label}</span>
              {tile.hint ? <small>{tile.hint}</small> : null}
              {typeof tile.share === "number" ? (
                <span className="jy-impact-bar">
                  <span className={tile.tone} style={{ width: `${Math.max(tile.share, tile.share > 0 ? 3 : 0)}%` }} />
                </span>
              ) : null}
            </div>
          ))}
        </div>
        <div className="jy-funnel">
          <p className="jy-funnel-title">{t("Parcours de candidature", "Application pipeline")}</p>
          <div className="jy-funnel-steps">
            {funnel.map((step, index) => (
              <div key={step.key} className="jy-funnel-step">
                <span className="jy-funnel-count">{step.value}</span>
                <span className="jy-funnel-label">{step.label}</span>
                <span className="jy-funnel-bar">
                  <span style={{ width: `${funnelMax ? Math.max((step.value / funnelMax) * 100, step.value ? 4 : 0) : 0}%`, opacity: 1 - index * 0.14 }} />
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ------------------------------------------------ Compétences */}
      <div className="jy-grid-2">
        <div className="jy-card">
          <div className="jy-card-head">
            <h3>{t("Compétences les plus présentes", "Most common skills")}</h3>
          </div>
          {topSkills.length ? (
            <ul className="jy-skill-bars">
              {topSkills.map((skill) => (
                <li key={skill.label}>
                  <span>{skill.label}</span>
                  <span className="jy-skill-track">
                    <span style={{ width: `${(skill.count / topSkills[0].count) * 100}%` }} />
                  </span>
                  <strong>{skill.count}</strong>
                </li>
              ))}
            </ul>
          ) : (
            <p className="jy-empty">{t("Les compétences apparaîtront dès les premiers CV importés.", "Skills will appear with the first imported CVs.")}</p>
          )}
        </div>
        <div className="jy-card">
          <div className="jy-card-head">
            <h3>{t("Compétences à renforcer", "Skills to strengthen")}</h3>
            <button type="button" className="jy-link" onClick={() => go("insights")}>
              {t("Voir le détail", "See details")}
            </button>
          </div>
          {missingKeywords.length ? (
            <>
              <p className="jy-card-lead">{t("Mots-clés le plus souvent absents des CV face aux offres visées.", "Keywords most often missing from CVs versus targeted jobs.")}</p>
              <div className="jy-chip-cloud">
                {missingKeywords.map((item) => (
                  <span key={item.keyword} className="jy-chip">
                    {item.keyword}
                    <em>{item.count}</em>
                  </span>
                ))}
              </div>
            </>
          ) : (
            <p className="jy-empty">{t("Les manques récurrents apparaîtront dès les premières analyses.", "Recurring gaps will appear with the first analyses.")}</p>
          )}
          {targetRoles.length ? (
            <div className="jy-roles-target">
              <p className="jy-funnel-title">{t("Métiers visés", "Target roles")}</p>
              {targetRoles.map((role) => (
                <div key={role.label} className="jy-role-target">
                  <AdminLineIcon name="briefcase" />
                  <span>{role.label}</span>
                  <strong>{role.count}</strong>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      {/* ------------------------------------------------ À surveiller / Relances */}
      {relanceSegments.length || overview.alerts?.length ? (
        <div className="jy-grid-2">
          <div className="jy-card">
            <div className="jy-card-head">
              <h3>{t("À surveiller", "Needs attention")}</h3>
              {overview.alerts?.length ? <span className="jy-count-badge warn">{overview.alerts.length}</span> : null}
            </div>
            {overview.alerts?.length ? (
              <div className="jy-alerts">
                {overview.alerts.map((alert, index) => (
                  <button type="button" key={`${alert.type}-${index}`} className={`jy-alert ${alertTone(alert.type)}`} onClick={() => go(alertTab(alert.type))}>
                    <span className="jy-alert-icon">
                      <AdminLineIcon name={alertIcon(alert.type)} />
                    </span>
                    <span className="jy-alert-text">
                      <strong>{alert.title}</strong>
                      {alert.body ? <small>{alert.body}</small> : null}
                    </span>
                    <span className="jy-alert-go">
                      {t("Voir", "View")}
                      <AdminLineIcon name="chevronRight" />
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="jy-all-good">
                <AdminLineIcon name="quality" />
                <span>{t("Rien à signaler pour le moment.", "Nothing to report for now.")}</span>
              </div>
            )}
          </div>

          <div className="jy-card">
            <div className="jy-card-head">
              <h3>{copy.relanceTitle}</h3>
            </div>
            <p className="jy-card-lead">{copy.relanceHint}</p>
            {relanceSegments.length ? (
              <div className="jy-relances">
                {relanceSegments.map((segment) => {
                  const share = overview.totalStudents ? Math.round((segment.count / overview.totalStudents) * 100) : 0;
                  return (
                    <div key={segment.key} className="jy-relance">
                      <span className="jy-relance-count">{segment.count}</span>
                      <span className="jy-relance-text">
                        <strong>{segment.label}</strong>
                        <small>
                          {share} % {t("de vos étudiants", "of your students")}
                        </small>
                        <span className="jy-relance-bar">
                          <span style={{ width: `${Math.max(share, 3)}%` }} />
                        </span>
                      </span>
                      <button type="button" className="jy-btn jy-btn-outline jy-btn-sm" disabled={relanceBusy === segment.key} onClick={() => launchRelance(segment)}>
                        {relanceBusy === segment.key ? <span className="btn-spinner dark" /> : <AdminLineIcon name="send" />}
                        {t("Relancer", "Follow up")}
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="jy-all-good">
                <AdminLineIcon name="quality" />
                <span>{t("Aucun étudiant à relancer.", "No student to follow up.")}</span>
              </div>
            )}
          </div>
        </div>
      ) : null}

      {/* ------------------------------------------------ Derniers inscrits / Activité */}
      <div className="jy-grid-2 jy-grid-wide-left">
        <div className="jy-card">
          <div className="jy-card-head">
            <h3>{copy.recentStudents}</h3>
            <button type="button" className="jy-link" onClick={() => go("students")}>
              {t("Tout voir", "See all")}
            </button>
          </div>
          {recentStudents?.length ? (
            <div className="jy-student-rows">
              {recentStudents.map((student) => (
                <button type="button" key={student.id} className="jy-student-row" onClick={() => go("students")}>
                  <AvatarCircle user={student} />
                  <span className="jy-student-id">
                    <strong>
                      {student.firstName} {student.lastName}
                    </strong>
                    <small>{student.email}</small>
                  </span>
                  <span className="jy-student-meta">
                    {student.promotionName ? <span className="jy-chip small">{student.promotionName}</span> : null}
                    {typeof student.latestScore === "number" ? (
                      <span className={`jy-score ${student.latestScore >= 60 ? "good" : student.latestScore >= 50 ? "mid" : "low"}`}>{student.latestScore} %</span>
                    ) : null}
                    <span className={`jy-dot-status ${student.active ? "on" : ""}`}>{student.active ? t("Actif", "Active") : t("Inactif", "Inactive")}</span>
                  </span>
                  <small className="jy-feed-time">
                    {copy.joinedOn} {formatDateTime(student.createdAt, language)}
                  </small>
                </button>
              ))}
            </div>
          ) : recentStudents ? (
            <p className="jy-empty">{copy.noStudents}</p>
          ) : (
            <AdminPageLoader language={language} />
          )}
        </div>

        <div className="jy-card">
          <div className="jy-card-head">
            <h3>{copy.activityBreakdown}</h3>
          </div>
          {overview.totalStudents ? (
            <div className="jy-activity">
              <div className="jy-activity-ring" style={{ "--share": `${activityShare}%` }}>
                <span>
                  <strong>{activityShare} %</strong>
                  <small>{t("actifs", "active")}</small>
                </span>
              </div>
              <ul className="jy-activity-legend">
                <li>
                  <i className="on" />
                  <span>{copy.activeLabel}</span>
                  <strong>{activeStudents}</strong>
                </li>
                <li>
                  <i />
                  <span>{copy.inactiveLabel}</span>
                  <strong>{overview.inactiveStudents}</strong>
                </li>
                <li>
                  <i className="warn" />
                  <span>{t("Sans CV", "Without CV")}</span>
                  <strong>{overview.withoutCv || 0}</strong>
                </li>
              </ul>
            </div>
          ) : (
            <p className="jy-empty">{copy.noActivityHint}</p>
          )}
        </div>
      </div>
    </section>
  );
}
