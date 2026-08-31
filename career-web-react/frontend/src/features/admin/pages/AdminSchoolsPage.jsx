import React from "react";
// Module Admin : vue plateforme des établissements — inexistante jusqu'ici,
// l'Admin ne pouvait piloter les écoles qu'une par une via Comptes/Licences.
import { useState, useEffect } from "react";
import { AdminPageLoader } from "../../../components/AdminPageLoader.jsx";
import { AdminKpiCard } from "../../../components/AdminKpiCard.jsx";
import { getFriendlyErrorMessage } from "../../../lib/errors.js";
import { formatDate } from "../../../lib/format.js";
import { getAdminSchools, getAdminSchoolAnnouncements } from "../../../lib/inMemoryDb.js";

export default function AdminSchoolsPage({ user, language }) {
  const copy =
    language === "en"
      ? {
          title: "Schools",
          subtitle: "Platform-wide view of every institution — seats, students, alerts.",
          totalSchools: "Institutions",
          totalSeats: "Seats sold",
          totalStudents: "Students",
          colSchool: "Institution",
          colSeats: "Seats used",
          colStudents: "Students",
          colActivation: "Activation",
          colAvgScore: "Average score",
          colAlerts: "Alerts",
          colJoined: "Joined",
          empty: "No school account yet.",
          nearCapacity: "Near capacity",
          announcementsTitle: "Announcements sent (all schools)",
          announcementsEmpty: "No announcement sent by any school yet.",
          recipients: (n) => `${n} recipient(s)`
        }
      : {
          title: "Écoles",
          subtitle: "Vue plateforme de tous les établissements — sièges, étudiants, alertes.",
          totalSchools: "Établissements",
          totalSeats: "Sièges vendus",
          totalStudents: "Étudiants",
          colSchool: "Établissement",
          colSeats: "Sièges utilisés",
          colStudents: "Étudiants",
          colActivation: "Activation",
          colAvgScore: "Score moyen",
          colAlerts: "Alertes",
          colJoined: "Inscrit le",
          empty: "Aucun compte école pour le moment.",
          nearCapacity: "Proche saturation",
          announcementsTitle: "Annonces envoyées (toutes écoles)",
          announcementsEmpty: "Aucune annonce envoyée par une école pour le moment.",
          recipients: (n) => `${n} destinataire(s)`
        };

  const [data, setData] = useState(null);
  const [announcements, setAnnouncements] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    getAdminSchools(user.id, language)
      .then(setData)
      .catch((err) => setError(getFriendlyErrorMessage(err, language)));
    getAdminSchoolAnnouncements(user.id)
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
        <AdminKpiCard tone="primary" icon="profile" value={data.totalSchools} label={copy.totalSchools} />
        <AdminKpiCard tone="warning" icon="save" value={`${data.totalSeatsUsed}/${data.totalSeats}`} label={copy.totalSeats} />
        <AdminKpiCard tone="success" icon="chart" value={data.totalStudents} label={copy.totalStudents} />
      </div>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>{copy.colSchool}</th>
              <th>{copy.colSeats}</th>
              <th>{copy.colStudents}</th>
              <th>{copy.colActivation}</th>
              <th>{copy.colAvgScore}</th>
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
                    <td>{item.studentCount}</td>
                    <td>{item.studentCount ? `${item.activationRate}%` : "—"}</td>
                    <td>{item.avgScore != null ? `${item.avgScore}%` : "—"}</td>
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
                    {item.schoolName} · {formatDate(item.createdAt)}
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
