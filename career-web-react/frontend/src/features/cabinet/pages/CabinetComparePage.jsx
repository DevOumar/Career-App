import React from "react";
import { useState, useEffect } from "react";
import { UiIcon } from "../../../components/UiIcon.jsx";
import { getFriendlyErrorMessage } from "../../../lib/errors.js";
import { getCabinetMissionsCompare } from "../../../lib/inMemoryDb.js";
import { CabinetEmptyState } from "./CabinetEmptyState.jsx";

const STATUS_LABELS = {
  fr: { open: "Ouverte", in_progress: "En cours", closed: "Clôturée" },
  en: { open: "Open", in_progress: "In progress", closed: "Closed" }
};

export default function CabinetComparePage({ user, language }) {
  const copy =
    language === "en"
      ? {
          title: "Compare missions",
          subtitle: "Key indicators side by side, to spot which mission needs attention.",
          colMission: "Mission",
          colStatus: "Status",
          colCandidates: "Candidates",
          colInterviewing: "Interviewing",
          colPlaced: "Placed",
          colRejected: "Rejected",
          empty: "No mission created yet.",
          emptyHint: "Create at least one mission to compare it here."
        }
      : {
          title: "Comparer les missions",
          subtitle: "Indicateurs clés côte à côte, pour repérer la mission qui a besoin d'attention.",
          colMission: "Mission",
          colStatus: "Statut",
          colCandidates: "Candidats",
          colInterviewing: "En entretien",
          colPlaced: "Placés",
          colRejected: "Écartés",
          empty: "Aucune mission créée pour le moment.",
          emptyHint: "Créez au moins une mission pour la comparer ici."
        };

  const [items, setItems] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    getCabinetMissionsCompare(user.id)
      .then(setItems)
      .catch((err) => setError(getFriendlyErrorMessage(err, language)));
  }, [user.id, language]);

  if (error) return <p className="field-error">{error}</p>;
  if (!items) return <div className="extracting-state"><div className="loader-ring" /></div>;

  const bestPlaced = Math.max(0, ...items.map((item) => item.placedCount));

  return (
    <section className="cv-history-page cabinet-page">
      <div className="card block history-head">
        <div className="feature-page-header">
          <span className="feature-page-header-icon">
            <UiIcon name="scale" />
          </span>
          <div>
            <h2>{copy.title}</h2>
            <p className="muted">{copy.subtitle}</p>
          </div>
        </div>
      </div>

      {items.length ? (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>{copy.colMission}</th>
                <th>{copy.colStatus}</th>
                <th>{copy.colCandidates}</th>
                <th>{copy.colInterviewing}</th>
                <th>{copy.colPlaced}</th>
                <th>{copy.colRejected}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td>
                    <strong>{item.title}</strong>
                    <div className="muted">{[item.clientName, item.location].filter(Boolean).join(" · ") || "-"}</div>
                  </td>
                  <td>{STATUS_LABELS[language]?.[item.status] || STATUS_LABELS.fr[item.status]}</td>
                  <td>{item.candidateCount}</td>
                  <td>{item.interviewingCount}</td>
                  <td>
                    {item.placedCount > 0 ? (
                      <span className={`tag ${item.placedCount === bestPlaced ? "tag-success" : ""}`}>{item.placedCount}</span>
                    ) : (
                      <span className="muted">0</span>
                    )}
                  </td>
                  <td>{item.rejectedCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <CabinetEmptyState icon="scale" title={copy.empty} hint={copy.emptyHint} />
      )}
    </section>
  );
}
