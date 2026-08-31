import React from "react";
// Module École : comparaison de promotions — met côte à côte les indicateurs
// clés de chaque promo (score moyen, activation, alertes) pour appuyer une
// décision pédagogique ("la promo Data 2025 est en retard vs 2024").
import { useState, useEffect } from "react";
import { AdminPageLoader } from "../../../components/AdminPageLoader.jsx";
import { getFriendlyErrorMessage } from "../../../lib/errors.js";
import { getSchoolPromotionsCompare } from "../../../lib/inMemoryDb.js";
import { SchoolEmptyState } from "../SchoolApp.jsx";

export default function SchoolComparePage({ user, language }) {
  const copy =
    language === "en"
      ? {
          title: "Compare promotions",
          subtitle: "Key indicators side by side, to spot which promotion needs attention.",
          colPromotion: "Promotion",
          colStudents: "Students",
          colActivation: "Activation",
          colAvgScore: "Average score",
          colInactive: "Inactive",
          colWithoutCv: "Without CV",
          colLowScore: "Low scores",
          empty: "No promotion created yet.",
          emptyHint: "Create at least one promotion to compare it here.",
          needTwo: "Create a second promotion to unlock a real comparison."
        }
      : {
          title: "Comparer les promotions",
          subtitle: "Indicateurs clés côte à côte, pour repérer la promo qui a besoin d'attention.",
          colPromotion: "Promotion",
          colStudents: "Étudiants",
          colActivation: "Activation",
          colAvgScore: "Score moyen",
          colInactive: "Inactifs",
          colWithoutCv: "Sans CV",
          colLowScore: "Scores faibles",
          empty: "Aucune promotion créée pour le moment.",
          emptyHint: "Créez au moins une promotion pour la comparer ici.",
          needTwo: "Créez une seconde promotion pour une vraie comparaison."
        };

  const [items, setItems] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    getSchoolPromotionsCompare(user.id)
      .then(setItems)
      .catch((err) => setError(getFriendlyErrorMessage(err, language)));
  }, [user.id, language]);

  if (error) return <p className="field-error">{error}</p>;
  if (!items) return <AdminPageLoader language={language} />;

  const bestAvgScore = Math.max(0, ...items.map((item) => item.avgScore ?? -1));

  return (
    <section className="admin-dashboard">
      <header className="module-header">
        <h2>{copy.title}</h2>
        <p>{copy.subtitle}</p>
      </header>

      {!items.length ? (
        <SchoolEmptyState icon="network" title={copy.empty} hint={copy.emptyHint} />
      ) : (
        <>
          {items.length === 1 ? <p className="field-hint">{copy.needTwo}</p> : null}
          <div className="admin-table-wrap">
            <table className="admin-table school-compare-table">
              <thead>
                <tr>
                  <th>{copy.colPromotion}</th>
                  <th>{copy.colStudents}</th>
                  <th>{copy.colActivation}</th>
                  <th>{copy.colAvgScore}</th>
                  <th>{copy.colInactive}</th>
                  <th>{copy.colWithoutCv}</th>
                  <th>{copy.colLowScore}</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <strong>{item.name}</strong>
                      <div className="muted">{[item.program, item.level, item.campus, item.academicYear].filter(Boolean).join(" · ") || "—"}</div>
                    </td>
                    <td>{item.studentCount}</td>
                    <td>{item.studentCount ? `${item.activationRate}%` : "—"}</td>
                    <td>
                      {item.avgScore != null ? (
                        <span className={`tag ${item.avgScore === bestAvgScore ? "tag-success" : ""}`}>{item.avgScore}%</span>
                      ) : (
                        <span className="muted">—</span>
                      )}
                    </td>
                    <td>{item.inactiveCount}</td>
                    <td>{item.withoutCvCount}</td>
                    <td>{item.lowScoreCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}
