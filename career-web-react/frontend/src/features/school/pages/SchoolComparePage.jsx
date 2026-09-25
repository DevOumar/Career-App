import React, { useEffect, useMemo, useState } from "react";
// Espace École › Comparer les promotions : indicateurs côte à côte (barres
// par indicateur, une couleur par promotion), verdict (meilleure promotion /
// à accompagner), tableau détaillé avec la meilleure valeur mise en avant et
// export. Données : /school/promotions/compare (aucun calcul inventé ici).
import { AdminPageLoader } from "../../../components/AdminPageLoader.jsx";
import { getFriendlyErrorMessage } from "../../../lib/errors.js";
import { getSchoolPromotionsCompare } from "../../../lib/inMemoryDb.js";
import { AdminLineIcon } from "../../admin/AdminApp.jsx";
import { AdminExportMenu } from "../../admin/AdminListTools.jsx";

// Palette distincte (l'orange de la marque en tête).
const PROMO_COLORS = ["#b83309", "#3d5a80", "#a8792f", "#2f7a4f", "#7b4f9d", "#5f7f8f"];
const MAX_SELECTED = 6;

export default function SchoolComparePage({ user, language, onGoToTab }) {
  const t = (fr, en) => (language === "en" ? en : fr);
  const [items, setItems] = useState(null);
  const [error, setError] = useState("");
  const [selectedIds, setSelectedIds] = useState(null);

  useEffect(() => {
    getSchoolPromotionsCompare(user.id)
      .then((data) => {
        setItems(data || []);
        setSelectedIds((data || []).slice(0, MAX_SELECTED).map((item) => item.id));
      })
      .catch((err) => setError(getFriendlyErrorMessage(err, language)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.id]);

  const colorOf = useMemo(() => Object.fromEntries((items || []).map((item, index) => [item.id, PROMO_COLORS[index % PROMO_COLORS.length]])), [items]);

  if (error) return <p className="field-error">{error}</p>;
  if (!items) return <AdminPageLoader language={language} />;

  const compared = items.filter((item) => selectedIds?.includes(item.id));
  const share = (count, item) => (item.studentCount ? Math.round((count / item.studentCount) * 100) : 0);

  // Indicateurs : `better` = "high" (plus c'est haut, mieux c'est) ou "low".
  const metrics = [
    { key: "studentCount", label: t("Étudiants", "Students"), unit: "", better: "high", value: (item) => item.studentCount },
    { key: "activationRate", label: t("Taux d'activation", "Activation rate"), unit: " %", better: "high", max: 100, value: (item) => (item.studentCount ? item.activationRate : null) },
    { key: "avgScore", label: t("Score de matching moyen", "Average match score"), unit: " %", better: "high", max: 100, value: (item) => item.avgScore },
    { key: "inactive", label: t("Inactifs depuis 30 j+ (part)", "Inactive 30+ days (share)"), unit: " %", better: "low", max: 100, value: (item) => (item.studentCount ? share(item.inactiveCount, item) : null) },
    { key: "withoutCv", label: t("Sans CV (part)", "Without CV (share)"), unit: " %", better: "low", max: 100, value: (item) => (item.studentCount ? share(item.withoutCvCount, item) : null) },
    { key: "lowScore", label: t("Scores faibles (part)", "Low scores (share)"), unit: " %", better: "low", max: 100, value: (item) => (item.studentCount ? share(item.lowScoreCount, item) : null) }
  ];
  const bestOf = (metric) => {
    const values = compared.map(metric.value).filter((value) => typeof value === "number");
    if (compared.length < 2 || !values.length) return null;
    return metric.better === "high" ? Math.max(...values) : Math.min(...values);
  };

  // Verdict : meilleure moyenne de score, et promotion qui cumule le plus de signaux faibles.
  const scoredItems = compared.filter((item) => typeof item.avgScore === "number");
  const best = scoredItems.length ? [...scoredItems].sort((a, b) => b.avgScore - a.avgScore)[0] : null;
  const riskScore = (item) => share(item.inactiveCount, item) + share(item.lowScoreCount, item) + share(item.withoutCvCount, item);
  const needsSupport = compared.length >= 2 ? [...compared].sort((a, b) => riskScore(b) - riskScore(a))[0] : null;

  function toggle(id) {
    setSelectedIds((current) => {
      if (current.includes(id)) return current.filter((value) => value !== id);
      if (current.length >= MAX_SELECTED) return current;
      return [...current, id];
    });
  }

  const exportColumns = [
    { key: "name", label: t("Promotion", "Promotion"), exportValue: (item) => item.name },
    { key: "program", label: t("Programme", "Program"), exportValue: (item) => item.program || "" },
    { key: "level", label: t("Niveau", "Level"), exportValue: (item) => item.level || "" },
    { key: "year", label: t("Année académique", "Academic year"), exportValue: (item) => item.academicYear || "" },
    { key: "students", label: t("Étudiants", "Students"), exportValue: (item) => item.studentCount },
    { key: "activation", label: t("Activation (%)", "Activation (%)"), exportValue: (item) => (item.studentCount ? item.activationRate : "") },
    { key: "score", label: t("Score moyen (%)", "Average score (%)"), exportValue: (item) => item.avgScore ?? "" },
    { key: "inactive", label: t("Inactifs 30 j+", "Inactive 30+ days"), exportValue: (item) => item.inactiveCount },
    { key: "withoutCv", label: t("Sans CV", "Without CV"), exportValue: (item) => item.withoutCvCount },
    { key: "lowScore", label: t("Scores faibles", "Low scores"), exportValue: (item) => item.lowScoreCount }
  ];

  const meta = (item) => [item.program, item.level, item.campus, item.academicYear].filter(Boolean).join(" · ");

  return (
    <section className="admin-dashboard jy-compare">
      <header className="module-header admin-accounts-header">
        <div>
          <h2>{t("Comparer les promotions", "Compare promotions")}</h2>
          <p>{t("Indicateurs clés côte à côte, pour repérer la promotion qui a besoin d'attention.", "Key indicators side by side, to spot which promotion needs attention.")}</p>
        </div>
        {items.length ? (
          <div className="admin-header-actions">
            <AdminExportMenu language={language} title={t("Comparaison des promotions", "Promotion comparison")} fileBase="comparaison-promotions" columns={exportColumns} rows={compared} />
          </div>
        ) : null}
      </header>

      {!items.length ? (
        <div className="jy-card jy-empty-block">
          <span className="jy-empty-icon">
            <AdminLineIcon name="compare" />
          </span>
          <strong>{t("Aucune promotion à comparer", "No promotion to compare")}</strong>
          <span>{t("Créez au moins deux promotions et affectez-y vos étudiants pour les comparer.", "Create at least two promotions and assign students to compare them.")}</span>
          {onGoToTab ? (
            <button type="button" className="jy-btn jy-btn-primary jy-btn-sm" onClick={() => onGoToTab("promotions")}>
              <AdminLineIcon name="layers" />
              {t("Gérer les promotions", "Manage promotions")}
            </button>
          ) : null}
        </div>
      ) : (
        <>
          <div className="jy-card">
            <div className="jy-card-head">
              <div>
                <h3>{t("Promotions comparées", "Compared promotions")}</h3>
                <p className="jy-card-sub">
                  {t(`Sélectionnez jusqu'à ${MAX_SELECTED} promotions.`, `Select up to ${MAX_SELECTED} promotions.`)} {compared.length} / {items.length}
                </p>
              </div>
            </div>
            <div className="jy-compare-picker">
              {items.map((item) => {
                const active = selectedIds.includes(item.id);
                return (
                  <button type="button" key={item.id} className={`jy-compare-chip ${active ? "is-active" : ""}`} onClick={() => toggle(item.id)} aria-pressed={active}>
                    <i style={{ background: colorOf[item.id] }} />
                    <span>
                      <strong>{item.name}</strong>
                      <small>
                        {item.studentCount} {t("étudiant(s)", "student(s)")}
                        {item.academicYear ? ` · ${item.academicYear}` : ""}
                      </small>
                    </span>
                  </button>
                );
              })}
            </div>
            {items.length < 2 ? (
              <div className="jy-callout">
                <AdminLineIcon name="alert" />
                <span>{t("Créez une seconde promotion pour une vraie comparaison.", "Create a second promotion for a real comparison.")}</span>
              </div>
            ) : null}
          </div>

          {compared.length >= 2 && (best || needsSupport) ? (
            <div className="jy-grid-2">
              {best ? (
                <div className="jy-verdict good">
                  <span className="jy-verdict-icon">
                    <AdminLineIcon name="quality" />
                  </span>
                  <span>
                    <small>{t("Meilleure employabilité", "Best employability")}</small>
                    <strong>{best.name}</strong>
                    <em>
                      {t("Score moyen", "Average score")} {best.avgScore} % · {t("activation", "activation")} {best.activationRate} %
                    </em>
                  </span>
                </div>
              ) : null}
              {needsSupport && needsSupport.id !== best?.id ? (
                <div className="jy-verdict warn">
                  <span className="jy-verdict-icon">
                    <AdminLineIcon name="alert" />
                  </span>
                  <span>
                    <small>{t("À accompagner en priorité", "Support first")}</small>
                    <strong>{needsSupport.name}</strong>
                    <em>
                      {needsSupport.inactiveCount} {t("inactif(s)", "inactive")} · {needsSupport.lowScoreCount} {t("score(s) faible(s)", "low score(s)")} · {needsSupport.withoutCvCount}{" "}
                      {t("sans CV", "without CV")}
                    </em>
                  </span>
                </div>
              ) : null}
            </div>
          ) : null}

          {compared.length ? (
            <div className="jy-compare-metrics">
              {metrics.map((metric) => {
                const values = compared.map(metric.value);
                const scale = metric.max || Math.max(1, ...values.filter((value) => typeof value === "number"));
                const best = bestOf(metric);
                return (
                  <div key={metric.key} className="jy-card jy-metric-card">
                    <div className="jy-metric-head">
                      <h4>{metric.label}</h4>
                      <small>{metric.better === "high" ? t("Plus c'est haut, mieux c'est", "Higher is better") : t("Plus c'est bas, mieux c'est", "Lower is better")}</small>
                    </div>
                    <ul className="jy-metric-bars">
                      {compared.map((item) => {
                        const value = metric.value(item);
                        const isBest = best !== null && value === best;
                        return (
                          <li key={item.id}>
                            <span className="jy-metric-name" title={item.name}>
                              <i style={{ background: colorOf[item.id] }} />
                              {item.name}
                            </span>
                            <span className="jy-metric-track">
                              <span style={{ width: `${typeof value === "number" ? Math.max((value / scale) * 100, value > 0 ? 3 : 0) : 0}%`, background: colorOf[item.id] }} />
                            </span>
                            <strong className={isBest ? "is-best" : ""}>
                              {typeof value === "number" ? `${value}${metric.unit}` : "-"}
                              {isBest ? <AdminLineIcon name="quality" /> : null}
                            </strong>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="jy-empty">{t("Sélectionnez au moins une promotion.", "Select at least one promotion.")}</p>
          )}

          {compared.length ? (
            <div className="jy-card jy-card-flush">
              <div className="jy-card-head jy-card-head-padded">
                <h3>{t("Tableau détaillé", "Detailed table")}</h3>
              </div>
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>{t("Promotion", "Promotion")}</th>
                      {metrics.map((metric) => (
                        <th key={metric.key}>{metric.label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {compared.map((item) => (
                      <tr key={item.id}>
                        <td>
                          <div className="jy-compare-name">
                            <i style={{ background: colorOf[item.id] }} />
                            <div>
                              <strong>{item.name}</strong>
                              <span className="muted">{meta(item) || t("Aucun détail", "No details")}</span>
                            </div>
                          </div>
                        </td>
                        {metrics.map((metric) => {
                          const value = metric.value(item);
                          const isBest = bestOf(metric) !== null && value === bestOf(metric);
                          return (
                            <td key={metric.key}>
                              <span className={`jy-cell-metric ${isBest ? "is-best" : ""}`}>{typeof value === "number" ? `${value}${metric.unit}` : "-"}</span>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}

          {compared.some((item) => item.topSkills?.length) ? (
            <div className="jy-card">
              <div className="jy-card-head">
                <h3>{t("Compétences par promotion", "Skills by promotion")}</h3>
              </div>
              <div className="jy-compare-skills">
                {compared.map((item) => (
                  <div key={item.id} className="jy-compare-skill-col">
                    <p>
                      <i style={{ background: colorOf[item.id] }} />
                      {item.name}
                    </p>
                    <div className="jy-chip-cloud">
                      {(item.topSkills || []).length ? (
                        item.topSkills.map((skill) => (
                          <span key={skill.label} className="jy-chip small">
                            {skill.label}
                          </span>
                        ))
                      ) : (
                        <span className="muted">{t("Pas encore de données", "No data yet")}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}
