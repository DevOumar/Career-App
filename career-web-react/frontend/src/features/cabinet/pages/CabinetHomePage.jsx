import React, { useEffect, useState } from "react";
// Espace Cabinet › Accueil : indicateurs de pilotage du cabinet (vivier,
// missions, placements, chiffre d'affaires, équipe), dans la charte de
// l'administration de la plateforme.
import { AdminPageLoader } from "../../../components/AdminPageLoader.jsx";
import { AvatarCircle } from "../../../components/AvatarCircle.jsx";
import { getFriendlyErrorMessage } from "../../../lib/errors.js";
import { formatDateTime } from "../../../lib/format.js";
import { getCabinetOverview, getCabinetProfile, sendCabinetAnnouncement } from "../../../lib/inMemoryDb.js";
import { AdminLineIcon, JyBarChart } from "../../admin/AdminApp.jsx";
import { cabinetToast } from "./cabinetToast.js";
import { CANDIDATE_STATUSES, CANDIDATE_STATUS_TONES, StatusPill, candidateName, candidateStatusLabel, compactMoney, useConfirm } from "./cabinetUi.jsx";

export default function CabinetHomePage({ user, language, onGoToTab, onCreate, isCabinetOwner = true }) {
  const t = (fr, en) => (language === "en" ? en : fr);
  const [data, setData] = useState(null);
  const [firmName, setFirmName] = useState("");
  const [error, setError] = useState("");
  const [relanceBusy, setRelanceBusy] = useState("");
  const [confirm, confirmDialog] = useConfirm(language);
  const onboardingKey = `career_app_cabinet_onboarding_dismissed_${user.id}`;
  const [showOnboarding, setShowOnboarding] = useState(() => {
    try {
      return localStorage.getItem(onboardingKey) !== "1";
    } catch (_error) {
      return true;
    }
  });

  useEffect(() => {
    getCabinetOverview(user.id, language)
      .then(setData)
      .catch((err) => setError(getFriendlyErrorMessage(err, language)));
    getCabinetProfile(user.id)
      .then((result) => setFirmName(result?.profile?.organizationName || ""))
      .catch(() => {});
  }, [user.id, language]);

  function dismissOnboarding() {
    setShowOnboarding(false);
    try {
      localStorage.setItem(onboardingKey, "1");
    } catch (_error) {
      // stockage indisponible
    }
  }

  async function launchRelance(segment) {
    const ok = await confirm({
      icon: "alert",
      tone: "brand",
      title: t("Envoyer cette relance à l'équipe ?", "Send this reminder to the team?"),
      description: segment.subject,
      detail: segment.message,
      confirmLabel: t("Envoyer", "Send")
    });
    if (!ok) return;
    setRelanceBusy(segment.key);
    try {
      const result = await sendCabinetAnnouncement(user.id, { subject: segment.subject, message: segment.message });
      cabinetToast({ title: t("Relance envoyée à l'équipe.", "Reminder sent to the team."), text: result?.recipientCount != null ? t(`${result.recipientCount} destinataire(s)`, `${result.recipientCount} recipient(s)`) : "" });
    } catch (err) {
      cabinetToast({ title: getFriendlyErrorMessage(err, language), icon: "error" });
    } finally {
      setRelanceBusy("");
    }
  }

  if (error) return <p className="field-error">{error}</p>;
  if (!data) return <AdminPageLoader language={language} />;

  const go = (tab) => onGoToTab?.(tab);
  const pct = (part, total) => (total ? Math.round((part / total) * 100) : 0);
  const today = new Intl.DateTimeFormat(language === "en" ? "en-GB" : "fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(new Date());
  const seatsFull = data.seatsTotal > 0 && data.seatsUsed >= data.seatsTotal;
  const counts = data.candidateStatusCounts || {};
  const placed = counts.placed || 0;
  const inProcess = (counts.contacted || 0) + (counts.interviewing || 0);
  const placementRate = pct(placed, data.candidateCount);
  const missionCounts = data.missionStatusCounts || {};

  const stats = [
    {
      id: "candidates",
      icon: "accounts",
      tone: "green",
      value: data.candidateCount,
      label: t("Candidats en vivier", "Candidates in pool"),
      hint: t(`${inProcess} en cours de process`, `${inProcess} in process`)
    },
    {
      id: "missions",
      icon: "briefcase",
      tone: "blue",
      value: `${data.openMissionCount}/${data.missionCount}`,
      label: t("Missions ouvertes", "Open missions"),
      hint: data.staleMissionCount ? t(`${data.staleMissionCount} sans candidat depuis 3 j+`, `${data.staleMissionCount} without candidate for 3+ days`) : t("Toutes ont des candidats", "All have candidates")
    },
    {
      id: "candidates",
      key: "placed",
      icon: "quality",
      tone: "gold",
      value: placed,
      label: t("Candidats placés", "Candidates placed"),
      hint: t(`Taux de placement ${placementRate} %`, `Placement rate ${placementRate}%`)
    },
    {
      id: isCabinetOwner ? "invoices" : "missions",
      icon: "finance",
      tone: "green",
      value: compactMoney(data.invoicedTotal || 0, language),
      label: t("Chiffre d'affaires facturé (HT)", "Revenue invoiced (excl. VAT)"),
      hint: data.invoicedTotal
        ? t(`${compactMoney(data.outstanding || 0, language)} en attente de paiement`, `${compactMoney(data.outstanding || 0, language)} awaiting payment`)
        : data.totalPlacementRevenue
        ? t(`${compactMoney(data.totalPlacementRevenue, language)} d'honoraires convenus à facturer`, `${compactMoney(data.totalPlacementRevenue, language)} of agreed fees to invoice`)
        : t("Aucune facture émise", "No invoice issued yet")
    }
  ];

  const figures = [
    { label: t("Recruteurs", "Recruiters"), value: data.recruiterCount, tone: "" },
    { label: t("Sièges utilisés", "Seats used"), value: `${data.seatsUsed}/${data.seatsTotal}`, tone: seatsFull ? "danger" : "" },
    { label: t("Relances à faire", "Follow-ups due"), value: data.followUpDueCount || 0, tone: data.followUpDueCount ? "gold" : "" },
    { label: t("Jamais contactés", "Never contacted"), value: data.uncontactedCandidateCount || 0, tone: data.uncontactedCandidateCount ? "danger" : "" }
  ];

  const funnelSteps = CANDIDATE_STATUSES.filter((status) => status !== "rejected").map((status) => ({ key: status, label: candidateStatusLabel(status, language), value: counts[status] || 0 }));
  const funnelMax = Math.max(...funnelSteps.map((step) => step.value), 0);
  const topSkills = (data.topSkills || []).slice(0, 6);
  const missionTotal = data.missionCount || 0;
  const missionSplit = [
    { key: "open", label: t("Ouvertes", "Open"), value: missionCounts.open || 0, tone: "green" },
    { key: "in_progress", label: t("En cours", "In progress"), value: missionCounts.in_progress || 0, tone: "gold" },
    { key: "closed", label: t("Clôturées", "Closed"), value: missionCounts.closed || 0, tone: "muted" }
  ];

  const relanceSegments = [
    data.staleMissionCount > 0
      ? {
          key: "staleMissions",
          count: data.staleMissionCount,
          label: t("Missions sans candidat", "Missions without candidates"),
          hint: t("ouvertes depuis plus de 3 jours", "open for more than 3 days"),
          subject: t("Missions en attente de candidats", "Missions waiting for candidates"),
          message: t(
            "Certaines missions ouvertes n'ont toujours aucun candidat affecté, un coup d'œil au pipeline serait utile.",
            "Some open missions still have no candidate assigned, take a look at the pipeline when you can."
          )
        }
      : null,
    data.uncontactedCandidateCount > 0
      ? {
          key: "uncontacted",
          count: data.uncontactedCandidateCount,
          label: t("Candidats jamais contactés", "Candidates never contacted"),
          hint: t("toujours à l'étape « Sourcé »", "still at the “Sourced” stage"),
          subject: t("Candidats encore non contactés", "Candidates still uncontacted"),
          message: t(
            "Certains candidats du vivier n'ont pas encore été contactés, ça vaut le coup de relancer.",
            "Some candidates in the pool haven't been contacted yet, worth a follow-up."
          )
        }
      : null
  ].filter(Boolean);

  const alertTab = (type = "") => (type.includes("license") ? "license" : type.includes("mission") ? "missions" : "home");
  const alertIcon = (type = "") => (type.includes("license") ? "licenses" : "briefcase");

  // ------------------------------------------------ performance du cabinet
  const evolution = (current, previous) => {
    if (!previous) return current ? t("nouveau ce mois-ci", "new this month") : t("aucun le mois dernier", "none last month");
    const delta = Math.round(((current - previous) / previous) * 100);
    return t(`${delta >= 0 ? "+" : ""}${delta} % vs mois dernier (${previous})`, `${delta >= 0 ? "+" : ""}${delta}% vs last month (${previous})`);
  };
  const days = (value) => (value == null ? "-" : t(`${String(value).replace(".", ",")} j`, `${value} d`));
  const notMeasured = t("Mesuré à partir des prochains changements d'étape", "Measured from the next stage changes");
  const reachedContact = (counts.contacted || 0) + (counts.interviewing || 0) + placed;
  const reachedInterview = (counts.interviewing || 0) + placed;
  const openMissionsTotal = (missionCounts.open || 0) + (missionCounts.in_progress || 0);
  const performanceTiles = [
    {
      key: "placementsMonth",
      icon: "quality",
      tone: "green",
      value: data.placementsThisMonth ?? 0,
      label: t("Placements ce mois-ci", "Placements this month"),
      hint: evolution(data.placementsThisMonth || 0, data.placementsLastMonth || 0)
    },
    {
      key: "revenueMonth",
      icon: "finance",
      tone: "gold",
      value: compactMoney(data.revenueThisMonth, language),
      label: t("CA facturé ce mois-ci (HT)", "Revenue invoiced this month (excl. VAT)"),
      hint: t(`${compactMoney(data.cashedThisMonth || 0, language)} encaissés ce mois-ci · mois dernier ${compactMoney(data.revenueLastMonth || 0, language)}`, `${compactMoney(data.cashedThisMonth || 0, language)} collected this month · last month ${compactMoney(data.revenueLastMonth || 0, language)}`)
    },
    {
      key: "timeToPlace",
      icon: "clock",
      tone: "blue",
      value: days(data.avgDaysToPlacement),
      label: t("Délai moyen de placement", "Average time to placement"),
      hint: data.avgDaysToPlacement == null ? notMeasured : t("de l'affectation à la mission au placement", "from mission assignment to placement")
    },
    {
      key: "timeToFill",
      icon: "briefcase",
      tone: "blue",
      value: days(data.avgDaysToClose),
      label: t("Délai moyen de pourvoi", "Average time to fill"),
      hint: data.avgDaysToClose == null ? t("Mesuré à partir des prochaines clôtures de mission", "Measured from the next mission closures") : t("de l'ouverture à la clôture d'une mission", "from mission opening to closing")
    },
    {
      key: "newCandidates",
      icon: "accounts",
      tone: "green",
      value: data.candidatesThisMonth ?? 0,
      label: t("Nouveaux candidats ce mois-ci", "New candidates this month"),
      hint: evolution(data.candidatesThisMonth || 0, data.candidatesLastMonth || 0)
    },
    {
      key: "interviewToPlace",
      icon: "trend",
      tone: "gold",
      value: reachedInterview ? `${pct(placed, reachedInterview)} %` : "-",
      label: t("Transformation entretien → placement", "Interview → placement conversion"),
      hint: t(`${placed} placé(s) sur ${reachedInterview} candidat(s) passé(s) en entretien`, `${placed} placed out of ${reachedInterview} interviewed`)
    },
    {
      key: "depth",
      icon: "layers",
      tone: "blue",
      value: openMissionsTotal ? String(Math.round(((data.assignmentCount || 0) / openMissionsTotal) * 10) / 10).replace(".", language === "en" ? "." : ",") : "-",
      label: t("Candidats par mission active", "Candidates per active mission"),
      hint: t(`${data.assignmentCount || 0} affectation(s) · ${openMissionsTotal} mission(s) active(s)`, `${data.assignmentCount || 0} assignment(s) · ${openMissionsTotal} active mission(s)`)
    },
    {
      key: "cv",
      icon: "adminCvs",
      tone: "green",
      value: data.candidateCount ? `${pct(data.candidatesWithCv || 0, data.candidateCount)} %` : "-",
      label: t("Candidats avec CV", "Candidates with a CV"),
      hint: t(`${data.candidatesWithCv || 0} CV importés dans le vivier`, `${data.candidatesWithCv || 0} CVs imported in the pool`)
    }
  ];
  const conversionRows = [
    { key: "contact", label: t("Contactés", "Contacted"), value: pct(reachedContact, data.candidateCount), hint: t(`${reachedContact} / ${data.candidateCount}`, `${reachedContact} / ${data.candidateCount}`) },
    { key: "interview", label: t("Passés en entretien", "Interviewed"), value: pct(reachedInterview, data.candidateCount), hint: `${reachedInterview} / ${data.candidateCount}` },
    { key: "placed", label: t("Placés", "Placed"), value: placementRate, hint: `${placed} / ${data.candidateCount}` },
    { key: "rejected", label: t("Écartés", "Rejected"), value: pct(counts.rejected || 0, data.candidateCount), hint: `${counts.rejected || 0} / ${data.candidateCount}`, warn: true }
  ];

  const onboardingSteps = [
    { tab: "candidates", create: true, label: t("Ajoutez vos candidats", "Add your candidates"), hint: t("À la main ou depuis un CV lu par l'IA.", "By hand or from a CV read by AI.") },
    { tab: "missions", create: true, label: t("Créez une mission client", "Create a client mission"), hint: t("Affectez-y des candidats et suivez chaque étape.", "Assign candidates and follow each stage.") },
    ...(isCabinetOwner ? [{ tab: "invitations", label: t("Invitez vos recruteurs", "Invite your recruiters"), hint: t("Le vivier et les missions sont partagés.", "The pool and missions are shared.") }] : []),
    { tab: "reports", label: t("Envoyez une shortlist", "Send a shortlist"), hint: t("Un rapport imprimable par mission.", "A printable report per mission.") }
  ];

  return (
    <section className="admin-dashboard jy-dashboard">
      <header className="jy-hero">
        <div>
          <h1>
            {t("Bonjour", "Hello")} {user.firstName} {user.lastName}
          </h1>
          <p>{t("Voici l'activité de votre cabinet aujourd'hui.", "Here is your firm's activity today.")}</p>
        </div>
        <span className="jy-page-tag">{t("Tableau de bord", "Dashboard")}</span>
      </header>

      <button type="button" className="jy-status" onClick={() => go(isCabinetOwner ? "license" : "recruiters")}>
        <span className="jy-status-main">
          <AdminLineIcon name="cabinets" />
          <span>
            <strong>{firmName || t("Votre cabinet", "Your firm")}</strong>
            <small>{today}</small>
          </span>
        </span>
        <span className="jy-status-meta">
          <span className="jy-status-item">
            <AdminLineIcon name="profile" /> {data.recruiterCount} {t("recruteur(s)", "recruiter(s)")}
          </span>
          <span className="jy-status-item">
            <AdminLineIcon name="seat" /> {data.seatsUsed}/{data.seatsTotal} {t("sièges", "seats")}
          </span>
          <span className={`jy-status-link ${seatsFull ? "warn" : ""}`}>
            {seatsFull ? t("Licence complète", "License full") : isCabinetOwner ? t("Voir la licence", "View license") : t("Voir l'équipe", "View team")}
          </span>
          <AdminLineIcon name="chevronRight" />
        </span>
      </button>

      {showOnboarding ? (
        <div className="jy-card jy-onboard">
          <div className="jy-card-head">
            <h3>{t("Bien démarrer avec votre espace Cabinet", "Getting started with your Firm space")}</h3>
            <button type="button" className="jy-onboard-close" onClick={dismissOnboarding} aria-label={t("Fermer", "Close")}>
              <AdminLineIcon name="close" />
            </button>
          </div>
          <div className="jy-onboard-steps">
            {onboardingSteps.map((step, index) => (
              <button type="button" key={step.tab} className="jy-onboard-step" onClick={() => (step.create ? onCreate?.(step.tab) : go(step.tab))}>
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
            {t("Compris, ne plus afficher", "Got it, don't show again")}
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
          <h3>{t("Entrées au vivier, 8 dernières semaines", "New candidates, last 8 weeks")}</h3>
          <button type="button" className="jy-link" onClick={() => go("candidates")}>
            {t("Voir le vivier", "View the pool")}
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
        {data.candidatesTrend?.some((point) => point.count > 0) ? (
          <JyBarChart trend={data.candidatesTrend} language={language} series={[{ key: "count", label: t("Nouveaux candidats", "New candidates"), tone: "green" }]} />
        ) : (
          <p className="jy-empty">{t("Les candidats ajoutés au vivier apparaîtront ici semaine par semaine.", "Candidates added to the pool will appear here week by week.")}</p>
        )}
      </div>

      <div className="jy-card">
        <div className="jy-card-head">
          <div>
            <h3>{t("Performance du cabinet", "Firm performance")}</h3>
            <p className="jy-card-sub">
              {t("Rythme de placement, délais et chiffre d'affaires du mois.", "Placement pace, lead times and this month's revenue.")} {t(`${data.interviewsNext7 || 0} entretien(s) et ${data.followUpsNext7 || 0} relance(s) prévus sur 7 jours · ${data.activeRecruiters30 || 0} recruteur(s) actif(s) sur 30 jours.`, `${data.interviewsNext7 || 0} interview(s) and ${data.followUpsNext7 || 0} follow-up(s) planned in 7 days · ${data.activeRecruiters30 || 0} active recruiter(s) in 30 days.`)}
            </p>
          </div>
        </div>
        <div className="jy-impact jy-investor-tiles">
          {performanceTiles.map((tile) => (
            <div key={tile.key} className="jy-impact-tile">
              <span className={`jy-impact-icon ${tile.tone}`}>
                <AdminLineIcon name={tile.icon} />
              </span>
              <strong>{tile.value}</strong>
              <span className="jy-impact-label">{tile.label}</span>
              <small>{tile.hint}</small>
            </div>
          ))}
        </div>
      </div>

      <div className="jy-grid-2">
        <div className="jy-card">
          <div className="jy-card-head">
            <div>
              <h3>{t("Portefeuille clients", "Client portfolio")}</h3>
              <p className="jy-card-sub">{t(`${data.clientCount || 0} client(s) avec au moins une mission.`, `${data.clientCount || 0} client(s) with at least one mission.`)}</p>
            </div>
            <button type="button" className="jy-link" onClick={() => go("missions")}>
              {t("Missions", "Missions")}
            </button>
          </div>
          {data.topClients?.length ? (
            <ul className="jy-client-list">
              {data.topClients.map((client, index) => (
                <li key={client.name}>
                  <span className={`jy-rank ${index < 3 ? `top-${index + 1}` : ""}`}>{index + 1}</span>
                  <span className="jy-client-name">
                    <strong>{client.name}</strong>
                    <small>
                      {client.missions} {t("mission(s)", "mission(s)")} · {client.openMissions} {t("en cours", "active")}
                    </small>
                  </span>
                  <span className="jy-client-revenue">
                    <strong>{compactMoney(client.revenue, language)}</strong>
                    <small>{t("honoraires", "fees")}</small>
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="jy-empty">{t("Renseignez le client sur vos missions pour suivre votre portefeuille.", "Fill in the client on your missions to track your portfolio.")}</p>
          )}
        </div>

        <div className="jy-card">
          <div className="jy-card-head">
            <div>
              <h3>{t("Conversion du vivier", "Pool conversion")}</h3>
              <p className="jy-card-sub">{t("Part des candidats ayant atteint chaque étape.", "Share of candidates who reached each stage.")}</p>
            </div>
          </div>
          <ul className="jy-conversion">
            {conversionRows.map((row) => (
              <li key={row.key} className={row.warn ? "warn" : ""}>
                <span>{row.label}</span>
                <span className="jy-skill-track">
                  <span style={{ width: `${row.value || 0}%` }} />
                </span>
                <strong>{row.value || 0} %</strong>
                <small>{row.hint}</small>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="jy-grid-2">
        <div className="jy-card">
          <div className="jy-card-head">
            <div>
              <h3>{t("Pipeline de recrutement", "Recruitment pipeline")}</h3>
              <p className="jy-card-sub">{t("Où en sont les candidats du vivier.", "Where the candidates in the pool stand.")}</p>
            </div>
            <button type="button" className="jy-link" onClick={() => go("candidates")}>
              {t("Détail", "Details")}
            </button>
          </div>
          <div className="jy-funnel is-flush">
            <div className="jy-funnel-steps">
              {funnelSteps.map((step, index) => (
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
          <div className="jy-pipeline-foot">
            <span>
              <AdminLineIcon name="close" />
              {t("Écartés", "Rejected")} <strong>{counts.rejected || 0}</strong>
            </span>
            <span>
              <AdminLineIcon name="quality" />
              {t("Affectations placées", "Assignments placed")}{" "}
              <strong>
                {data.assignmentPlacedCount || 0} / {data.assignmentCount || 0}
              </strong>
            </span>
          </div>
        </div>

        <div className="jy-card">
          <div className="jy-card-head">
            <div>
              <h3>{t("Missions", "Missions")}</h3>
              <p className="jy-card-sub">{t("Répartition par statut.", "Split by status.")}</p>
            </div>
            <button type="button" className="jy-link" onClick={() => go("compare")}>
              {t("Comparer", "Compare")}
            </button>
          </div>
          {missionTotal ? (
            <>
              <div className="jy-level-stack" aria-hidden="true">
                {missionSplit.map((item) => (item.value ? <span key={item.key} className={`jy-seg-${item.tone}`} style={{ width: `${pct(item.value, missionTotal)}%` }} /> : null))}
              </div>
              <ul className="jy-mission-split">
                {missionSplit.map((item) => (
                  <li key={item.key}>
                    <i className={`jy-seg-${item.tone}`} />
                    <span>{item.label}</span>
                    <strong>{item.value}</strong>
                    <small>{pct(item.value, missionTotal)} %</small>
                  </li>
                ))}
              </ul>
              <div className="jy-idea">
                <AdminLineIcon name="finance" />
                <span>
                  {t("Honoraires convenus : ", "Agreed fees: ")}
                  <strong>{compactMoney(data.totalPlacementRevenue, language)}</strong>
                  {t(` sur ${data.billedMissionCount || 0} mission(s) · ${compactMoney(data.invoicedTotal || 0, language)} facturés.`, ` over ${data.billedMissionCount || 0} mission(s) · ${compactMoney(data.invoicedTotal || 0, language)} invoiced.`)}
                </span>
              </div>
            </>
          ) : (
            <div className="jy-empty-block compact">
              <span className="jy-empty-icon">
                <AdminLineIcon name="briefcase" />
              </span>
              <strong>{t("Aucune mission pour le moment", "No mission yet")}</strong>
              <button type="button" className="jy-btn jy-btn-outline jy-btn-sm" onClick={() => onCreate?.("missions")}>
                <AdminLineIcon name="plus" />
                {t("Créer une mission", "Create a mission")}
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="jy-grid-2">
        <div className="jy-card">
          <div className="jy-card-head">
            <h3>{t("À surveiller", "Needs attention")}</h3>
            {data.alerts?.length ? <span className="jy-count-badge warn">{data.alerts.length}</span> : null}
          </div>
          {data.alerts?.length ? (
            <div className="jy-alerts">
              {data.alerts.map((alert, index) => (
                <button type="button" key={`${alert.type}-${index}`} className={`jy-alert ${alert.type.includes("license") ? "danger" : "warn"}`} onClick={() => go(isCabinetOwner || !alert.type.includes("license") ? alertTab(alert.type) : "home")}>
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
            <h3>{t("Relances ciblées", "Targeted follow-up")}</h3>
          </div>
          <p className="jy-card-lead">{t("Signalez à votre équipe ce qui bloque dans le pipeline, par e-mail.", "Tell your team by email what's stalling in the pipeline.")}</p>
          {isCabinetOwner && relanceSegments.length ? (
            <div className="jy-relances">
              {relanceSegments.map((segment) => (
                <div key={segment.key} className="jy-relance">
                  <span className="jy-relance-count">{segment.count}</span>
                  <span className="jy-relance-text">
                    <strong>{segment.label}</strong>
                    <small>{segment.hint}</small>
                  </span>
                  <button type="button" className="jy-btn jy-btn-outline jy-btn-sm" disabled={relanceBusy === segment.key} onClick={() => launchRelance(segment)}>
                    {relanceBusy === segment.key ? <span className="btn-spinner dark" /> : <AdminLineIcon name="send" />}
                    {t("Relancer", "Follow up")}
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="jy-all-good">
              <AdminLineIcon name="quality" />
              <span>
                {isCabinetOwner
                  ? t("Aucun blocage à signaler.", "Nothing is stalling.")
                  : t("Seul le titulaire du cabinet peut envoyer des relances à l'équipe.", "Only the firm owner can send reminders to the team.")}
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="jy-grid-2 jy-grid-wide-left">
        <div className="jy-card">
          <div className="jy-card-head">
            <h3>{t("Derniers candidats ajoutés", "Recently added candidates")}</h3>
            <button type="button" className="jy-link" onClick={() => go("candidates")}>
              {t("Tout voir", "See all")}
            </button>
          </div>
          {data.recentCandidates?.length ? (
            <div className="jy-student-rows">
              {data.recentCandidates.map((item) => (
                <button type="button" key={item.id} className="jy-student-row" onClick={() => go("candidates")}>
                  <AvatarCircle user={item} />
                  <span className="jy-student-id">
                    <strong>{candidateName(item)}</strong>
                    <small>{item.headline || item.email || "-"}</small>
                  </span>
                  <span className="jy-student-meta">
                    <StatusPill tone={CANDIDATE_STATUS_TONES[item.status]}>{candidateStatusLabel(item.status, language)}</StatusPill>
                  </span>
                  <small className="jy-feed-time">{formatDateTime(item.createdAt, language)}</small>
                </button>
              ))}
            </div>
          ) : (
            <div className="jy-empty-block compact">
              <span className="jy-empty-icon">
                <AdminLineIcon name="accounts" />
              </span>
              <strong>{t("Aucun candidat pour le moment", "No candidate yet")}</strong>
              <button type="button" className="jy-btn jy-btn-outline jy-btn-sm" onClick={() => onCreate?.("candidates")}>
                <AdminLineIcon name="plus" />
                {t("Ajouter un candidat", "Add a candidate")}
              </button>
            </div>
          )}
        </div>

        <div className="jy-card">
          <div className="jy-card-head">
            <h3>{t("Compétences du vivier", "Skills in the pool")}</h3>
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
            <p className="jy-empty">{t("Les compétences apparaîtront avec les premiers candidats.", "Skills will appear with the first candidates.")}</p>
          )}
        </div>
      </div>

      {data.recruiterPerformance?.length ? (
        <div className="jy-card jy-card-flush">
          <div className="jy-card-head jy-card-head-padded">
            <div>
              <h3>{t("Performance de l'équipe", "Team performance")}</h3>
              <p className="jy-card-sub">{t("Candidats sourcés et placés par recruteur.", "Candidates sourced and placed per recruiter.")}</p>
            </div>
            <button type="button" className="jy-link" onClick={() => go("recruiters")}>
              {t("Voir l'équipe", "View team")}
            </button>
          </div>
          <div className="admin-table-wrap is-flat">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>{t("Recruteur", "Recruiter")}</th>
                  <th>{t("Sourcés", "Sourced")}</th>
                  <th>{t("Placés", "Placed")}</th>
                  <th>{t("Taux de placement", "Placement rate")}</th>
                </tr>
              </thead>
              <tbody>
                {data.recruiterPerformance.map((row, index) => {
                  const rate = pct(row.placedCount, row.sourcedCount);
                  return (
                    <tr key={row.userId}>
                      <td>
                        <span className={`jy-rank ${index < 3 ? `top-${index + 1}` : ""}`}>{index + 1}</span>
                      </td>
                      <td>
                        <div className="admin-table-name">
                          <AvatarCircle user={row} />
                          <strong>{candidateName(row) || t("Recruteur", "Recruiter")}</strong>
                        </div>
                      </td>
                      <td>{row.sourcedCount}</td>
                      <td>
                        <strong>{row.placedCount}</strong>
                      </td>
                      <td>
                        <span className="jy-score-bar">
                          <span className="jy-score-bar-track good">
                            <span style={{ width: `${rate}%` }} />
                          </span>
                          <strong>{rate} %</strong>
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {confirmDialog}
    </section>
  );
}
