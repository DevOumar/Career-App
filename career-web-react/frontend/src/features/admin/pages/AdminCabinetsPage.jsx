import React from "react";
// Module Admin : vue plateforme des cabinets de recrutement — miroir
// d'AdminSchoolsPage.jsx pour le segment agence.
import { useState, useEffect } from "react";
import { AdminPageLoader } from "../../../components/AdminPageLoader.jsx";
import { AdminKpiCard } from "../../../components/AdminKpiCard.jsx";
import { getFriendlyErrorMessage } from "../../../lib/errors.js";
import { formatDate } from "../../../lib/format.js";
import { getAdminCabinets, getAdminCabinetAnnouncements } from "../../../lib/inMemoryDb.js";

export default function AdminCabinetsPage({ user, language }) {
  const copy =
    language === "en"
      ? {
          title: "Cabinets",
          subtitle: "Platform-wide view of every recruitment firm — seats, pool, missions, alerts.",
          totalCabinets: "Firms",
          totalSeats: "Seats sold",
          totalCandidates: "Candidates in pools",
          totalMissions: "Missions",
          colCabinet: "Firm",
          colSeats: "Seats used",
          colRecruiters: "Recruiters",
          colCandidates: "Candidate pool",
          colMissions: "Missions",
          colAlerts: "Alerts",
          colJoined: "Joined",
          empty: "No cabinet account yet.",
          nearCapacity: "Near capacity",
          announcementsTitle: "Announcements sent (all cabinets)",
          announcementsEmpty: "No announcement sent by any cabinet yet.",
          recipients: (n) => `${n} recipient(s)`
        }
      : {
          title: "Cabinets",
          subtitle: "Vue plateforme de tous les cabinets de recrutement — sièges, vivier, missions, alertes.",
          totalCabinets: "Cabinets",
          totalSeats: "Sièges vendus",
          totalCandidates: "Candidats en vivier",
          totalMissions: "Missions",
          colCabinet: "Cabinet",
          colSeats: "Sièges utilisés",
          colRecruiters: "Recruteurs",
          colCandidates: "Vivier",
          colMissions: "Missions",
          colAlerts: "Alertes",
          colJoined: "Inscrit le",
          empty: "Aucun compte cabinet pour le moment.",
          nearCapacity: "Proche saturation",
          announcementsTitle: "Annonces envoyées (tous cabinets)",
          announcementsEmpty: "Aucune annonce envoyée par un cabinet pour le moment.",
          recipients: (n) => `${n} destinataire(s)`
        };

  const [data, setData] = useState(null);
  const [announcements, setAnnouncements] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    getAdminCabinets(user.id, language)
      .then(setData)
      .catch((err) => setError(getFriendlyErrorMessage(err, language)));
    getAdminCabinetAnnouncements(user.id)
      .then(setAnnouncements)
      .catch(() => setAnnouncements([]));
  }, [user.id, language]);

  if (error) return <p className="field-error">{error}</p>;
  if (!data) return <AdminPageLoader language={language} />;

  return (
    <section className="admin-dashboard admin-schools">
      <header className="module-header">
        <h2>{copy.title}</h2>
        <p>{copy.subtitle}</p>
      </header>

      <div className="admin-kpi-grid">
        <AdminKpiCard tone="primary" icon="briefcase" value={data.totalCabinets} label={copy.totalCabinets} />
        <AdminKpiCard tone="warning" icon="save" value={`${data.totalSeatsUsed}/${data.totalSeats}`} label={copy.totalSeats} />
        <AdminKpiCard tone="success" icon="network" value={data.totalCandidates} label={copy.totalCandidates} />
        <AdminKpiCard tone="danger" icon="briefcase" value={data.totalMissions} label={copy.totalMissions} />
      </div>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>{copy.colCabinet}</th>
              <th>{copy.colSeats}</th>
              <th>{copy.colRecruiters}</th>
              <th>{copy.colCandidates}</th>
              <th>{copy.colMissions}</th>
              <th>{copy.colAlerts}</th>
              <th>{copy.colJoined}</th>
            </tr>
          </thead>
          <tbody>
            {data.items.length ? (
              data.items.map((item) => {
                const remainingRatio = item.seatsTotal ? (item.seatsTotal - item.seatsUsed) / item.seatsTotal : 1;
                const nearCapacity = item.seatsTotal > 0 && remainingRatio <= 0.1;
                return (
                  <tr key={item.id}>
                    <td>
                      <strong>{item.name}</strong>
                      <div className="muted">{item.email}</div>
                    </td>
                    <td>
                      {item.seatsUsed}/{item.seatsTotal}
                      {nearCapacity ? <span className="tag tag-danger" style={{ marginLeft: "0.5rem" }}>{copy.nearCapacity}</span> : null}
                    </td>
                    <td>{item.recruiterCount}</td>
                    <td>{item.candidateCount}</td>
                    <td>{item.openMissionCount}/{item.missionCount}</td>
                    <td>
                      {item.alertCount ? (
                        <span className="tag tag-danger">{item.alertCount}</span>
                      ) : (
                        <span className="muted">—</span>
                      )}
                    </td>
                    <td className="muted">{formatDate(item.createdAt)}</td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={7} className="admin-table-empty muted">
                  {copy.empty}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="admin-panel">
        <h3>{copy.announcementsTitle}</h3>
        {announcements?.length ? (
          <div className="school-report-list">
            {announcements.map((item) => (
              <article key={item.id} className="school-report-row">
                <div>
                  <strong>{item.subject}</strong>
                  <span className="muted">
                    {item.cabinetName} · {formatDate(item.createdAt)}
                  </span>
                </div>
                <span className="tag">{copy.recipients(item.recipientCount)}</span>
              </article>
            ))}
          </div>
        ) : (
          <p className="muted">{copy.announcementsEmpty}</p>
        )}
      </div>
    </section>
  );
}
