import React from "react";
import { useState, useEffect } from "react";
import { UiIcon } from "../../../components/UiIcon.jsx";
import { getFriendlyErrorMessage } from "../../../lib/errors.js";
import { formatDate } from "../../../lib/format.js";
import { getCabinetOverview, sendCabinetAnnouncement } from "../../../lib/inMemoryDb.js";
import { CabinetEmptyState } from "./CabinetEmptyState.jsx";
import { cabinetToast } from "./cabinetToast.js";

export default function CabinetHomePage({ user, language, onGoTo, isCabinetOwner = true }) {
  const copy =
    language === "en"
      ? {
          title: "Cabinet dashboard",
          subtitle: "Real-time overview of your team and pipeline.",
          recruiters: "Recruiters",
          seats: "Seats used",
          candidates: "Candidates in pool",
          missions: "Missions",
          openMissions: "Open missions",
          revenue: "Revenue generated",
          alerts: "Alerts",
          noAlerts: "Nothing to report.",
          noAlertsHint: "You'll be notified here about seats, missions and new team members.",
          recentCandidates: "Recently added candidates",
          empty: "No candidate added yet.",
          emptyHint: "Add your first candidate, or import one straight from a CV.",
          addedOn: "Added on",
          goCandidates: "Add a candidate",
          goMissions: "Create a mission",
          goInvitations: "Invite a recruiter",
          relanceTitle: "Targeted follow-up",
          relanceHint: "Nudge your team about what's stalling in the pipeline.",
          relanceStaleMissions: (n) => `${n} mission(s) without a candidate`,
          relanceUncontacted: (n) => `${n} candidate(s) never contacted`,
          relanceStaleMissionsSubject: "Missions waiting for candidates",
          relanceStaleMissionsMessage: "Some open missions still have no candidate assigned — take a look at the pipeline when you can.",
          relanceUncontactedSubject: "Candidates still uncontacted",
          relanceUncontactedMessage: "Some candidates in the pool haven't been contacted yet — worth a follow-up.",
          relanceSent: "Reminder sent to the team."
        }
      : {
          title: "Dashboard cabinet",
          subtitle: "Vue en temps réel de votre équipe et de votre pipeline.",
          recruiters: "Recruteurs",
          seats: "Sièges utilisés",
          candidates: "Candidats en vivier",
          missions: "Missions",
          openMissions: "Missions ouvertes",
          revenue: "CA généré",
          alerts: "Alertes",
          noAlerts: "Rien à signaler.",
          noAlertsHint: "Vous serez alerté ici pour les sièges, les missions et les nouveaux membres.",
          recentCandidates: "Derniers candidats ajoutés",
          empty: "Aucun candidat ajouté pour l'instant.",
          emptyHint: "Ajoutez votre premier candidat, ou importez-le directement depuis un CV.",
          addedOn: "Ajouté le",
          goCandidates: "Ajouter un candidat",
          goMissions: "Créer une mission",
          goInvitations: "Inviter un recruteur",
          relanceTitle: "Relances ciblées",
          relanceHint: "Signalez à votre équipe ce qui bloque dans le pipeline.",
          relanceStaleMissions: (n) => `${n} mission(s) sans candidat`,
          relanceUncontacted: (n) => `${n} candidat(s) jamais contacté(s)`,
          relanceStaleMissionsSubject: "Missions en attente de candidats",
          relanceStaleMissionsMessage: "Certaines missions ouvertes n'ont toujours aucun candidat affecté — un coup d'œil au pipeline serait utile.",
          relanceUncontactedSubject: "Candidats encore non contactés",
          relanceUncontactedMessage: "Certains candidats du vivier n'ont pas encore été contactés — ça vaut le coup de relancer.",
          relanceSent: "Relance envoyée à l'équipe.",
          performanceTitle: "Performance de l'équipe",
          performanceSourced: (n) => `${n} sourcé(s)`,
          performancePlaced: (n) => `${n} placé(s)`,
          performanceEmpty: "Pas encore de candidat attribué à un recruteur."
        };
  if (language === "en") {
    copy.performanceTitle = "Team performance";
    copy.performanceSourced = (n) => `${n} sourced`;
    copy.performancePlaced = (n) => `${n} placed`;
    copy.performanceEmpty = "No candidate attributed to a recruiter yet.";
  }

  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    getCabinetOverview(user.id, language)
      .then(setData)
      .catch((err) => setError(getFriendlyErrorMessage(err, language)));
  }, [user.id, language]);

  const [relanceBusy, setRelanceBusy] = useState("");

  async function launchRelance(key, subject, message) {
    setRelanceBusy(key);
    try {
      await sendCabinetAnnouncement(user.id, { subject, message });
      cabinetToast({ title: copy.relanceSent });
    } catch (err) {
      cabinetToast({ title: getFriendlyErrorMessage(err, language), icon: "error" });
    } finally {
      setRelanceBusy("");
    }
  }

  if (error) return <p className="field-error">{error}</p>;
  if (!data) return <div className="extracting-state"><div className="loader-ring" /></div>;

  const relanceSegments = [
    data.staleMissionCount > 0
      ? {
          key: "staleMissions",
          label: copy.relanceStaleMissions(data.staleMissionCount),
          subject: copy.relanceStaleMissionsSubject,
          message: copy.relanceStaleMissionsMessage
        }
      : null,
    data.uncontactedCandidateCount > 0
      ? {
          key: "uncontacted",
          label: copy.relanceUncontacted(data.uncontactedCandidateCount),
          subject: copy.relanceUncontactedSubject,
          message: copy.relanceUncontactedMessage
        }
      : null
  ].filter(Boolean);

  return (
    <section className="cv-history-page cabinet-page">
      <div className="card block history-head">
        <div className="feature-page-header">
          <span className="feature-page-header-icon">
            <UiIcon name="chart" />
          </span>
          <div>
            <h2>{copy.title}</h2>
            <p className="muted">{copy.subtitle}</p>
          </div>
        </div>
      </div>

      <div className="cabinet-stat-grid">
        <div className="cabinet-stat-card">
          <span className="cabinet-stat-icon"><UiIcon name="profile" /></span>
          <strong>{data.recruiterCount}</strong>
          <span className="muted">{copy.recruiters}</span>
        </div>
        <div className="cabinet-stat-card">
          <span className="cabinet-stat-icon"><UiIcon name="save" /></span>
          <strong>{data.seatsUsed}/{data.seatsTotal}</strong>
          <span className="muted">{copy.seats}</span>
        </div>
        <div className="cabinet-stat-card">
          <span className="cabinet-stat-icon"><UiIcon name="network" /></span>
          <strong>{data.candidateCount}</strong>
          <span className="muted">{copy.candidates}</span>
        </div>
        <div className="cabinet-stat-card">
          <span className="cabinet-stat-icon"><UiIcon name="briefcase" /></span>
          <strong>{data.openMissionCount}/{data.missionCount}</strong>
          <span className="muted">{copy.openMissions}</span>
        </div>
        <div className="cabinet-stat-card">
          <span className="cabinet-stat-icon"><UiIcon name="scale" /></span>
          <strong>{Math.round(data.totalPlacementRevenue || 0).toLocaleString(language === "en" ? "en-GB" : "fr-FR")} €</strong>
          <span className="muted">{copy.revenue}</span>
        </div>
      </div>

      <div className="cabinet-quick-actions">
        <button type="button" className="btn-main ready" onClick={() => onGoTo("candidates")}>
          <UiIcon name="plus" /> {copy.goCandidates}
        </button>
        <button type="button" className="btn-secondary" onClick={() => onGoTo("missions")}>
          <UiIcon name="plus" /> {copy.goMissions}
        </button>
        <button type="button" className="btn-secondary" onClick={() => onGoTo("invitations")}>
          <UiIcon name="mail" /> {copy.goInvitations}
        </button>
      </div>

      {isCabinetOwner && relanceSegments.length ? (
        <div className="card block">
          <h3>{copy.relanceTitle}</h3>
          <p className="muted">{copy.relanceHint}</p>
          <div className="cabinet-quick-actions">
            {relanceSegments.map((segment) => (
              <button
                type="button"
                key={segment.key}
                className="btn-secondary"
                disabled={relanceBusy === segment.key}
                onClick={() => launchRelance(segment.key, segment.subject, segment.message)}
              >
                {relanceBusy === segment.key ? <span className="btn-spinner dark" /> : <UiIcon name="mail" />}
                {segment.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {data.recruiterPerformance?.length ? (
        <div className="card block">
          <h3>{copy.performanceTitle}</h3>
          <div className="cabinet-performance-list">
            {data.recruiterPerformance.map((row) => (
              <div className="cabinet-performance-row" key={row.userId}>
                <span className="cabinet-performance-name">{row.firstName} {row.lastName}</span>
                <span className="tag">{copy.performanceSourced(row.sourcedCount)}</span>
                <span className="tag tag-success">{copy.performancePlaced(row.placedCount)}</span>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="admin-panel-grid cabinet-home-grid">
        <div className="card block">
          <h3>{copy.alerts}</h3>
          {data.alerts?.length ? (
            <ul className="cabinet-alert-list">
              {data.alerts.map((alert) => (
                <li key={alert.type}>
                  <strong>{alert.title}</strong>
                  <span className="muted">{alert.body}</span>
                </li>
              ))}
            </ul>
          ) : (
            <CabinetEmptyState icon="shield" title={copy.noAlerts} hint={copy.noAlertsHint} />
          )}
        </div>

        <div className="card block">
          <h3>{copy.recentCandidates}</h3>
          {data.recentCandidates?.length ? (
            <div className="history-list">
              {data.recentCandidates.map((item) => (
                <article className="history-card" key={item.id}>
                  <div className="history-card-top">
                    <div className="history-card-main">
                      <span className="history-card-icon">
                        <UiIcon name="profile" />
                      </span>
                      <div>
                        <h3>{item.firstName} {item.lastName}</h3>
                        <p>{copy.addedOn} {formatDate(item.createdAt)}</p>
                      </div>
                    </div>
                    <span className="tag">{item.status}</span>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <CabinetEmptyState icon="network" title={copy.empty} hint={copy.emptyHint} />
          )}
        </div>
      </div>
    </section>
  );
}
