import React from "react";
import { useState, useEffect } from "react";
import { UiIcon } from "../../../components/UiIcon.jsx";
import { getFriendlyErrorMessage } from "../../../lib/errors.js";
import { formatDate } from "../../../lib/format.js";
import { getCabinetOverview } from "../../../lib/inMemoryDb.js";
import { CabinetEmptyState } from "./CabinetEmptyState.jsx";

export default function CabinetHomePage({ user, language, onGoTo }) {
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
          alerts: "Alerts",
          noAlerts: "Nothing to report.",
          noAlertsHint: "You'll be notified here about seats, missions and new team members.",
          recentCandidates: "Recently added candidates",
          empty: "No candidate added yet.",
          emptyHint: "Add your first candidate, or import one straight from a CV.",
          addedOn: "Added on",
          goCandidates: "Add a candidate",
          goMissions: "Create a mission",
          goInvitations: "Invite a recruiter"
        }
      : {
          title: "Dashboard cabinet",
          subtitle: "Vue en temps réel de votre équipe et de votre pipeline.",
          recruiters: "Recruteurs",
          seats: "Sièges utilisés",
          candidates: "Candidats en vivier",
          missions: "Missions",
          openMissions: "Missions ouvertes",
          alerts: "Alertes",
          noAlerts: "Rien à signaler.",
          noAlertsHint: "Vous serez alerté ici pour les sièges, les missions et les nouveaux membres.",
          recentCandidates: "Derniers candidats ajoutés",
          empty: "Aucun candidat ajouté pour l'instant.",
          emptyHint: "Ajoutez votre premier candidat, ou importez-le directement depuis un CV.",
          addedOn: "Ajouté le",
          goCandidates: "Ajouter un candidat",
          goMissions: "Créer une mission",
          goInvitations: "Inviter un recruteur"
        };

  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    getCabinetOverview(user.id, language)
      .then(setData)
      .catch((err) => setError(getFriendlyErrorMessage(err, language)));
  }, [user.id, language]);

  if (error) return <p className="field-error">{error}</p>;
  if (!data) return <div className="extracting-state"><div className="loader-ring" /></div>;

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
