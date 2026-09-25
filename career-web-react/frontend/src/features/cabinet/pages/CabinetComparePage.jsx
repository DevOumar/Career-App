import React, { useEffect, useMemo, useState } from "react";
// Espace Cabinet › Comparer les missions : indicateurs côte à côte (barres
// par indicateur, une couleur par mission), verdict (mission la plus
// performante / à relancer), tableau détaillé et export. Données :
// /cabinet/missions/compare (aucun calcul inventé ici).
import { AdminPageLoader } from "../../../components/AdminPageLoader.jsx";
import { getFriendlyErrorMessage } from "../../../lib/errors.js";
import { getCabinetMissionsCompare } from "../../../lib/inMemoryDb.js";
import { AdminLineIcon } from "../../admin/AdminApp.jsx";
import { AdminExportMenu } from "../../admin/AdminListTools.jsx";
import { MISSION_STATUS_TONES, StatusPill, compactMoney, missionStatusLabel } from "./cabinetUi.jsx";

const MISSION_COLORS = ["#b83309", "#3d5a80", "#a8792f", "#2f7a4f", "#7b4f9d", "#5f7f8f"];
const MAX_SELECTED = 6;

export default function CabinetComparePage({ user, language, onGoToTab }) {
  const t = (fr, en) => (language === "en" ? en : fr);
  const [items, setItems] = useState(null);
  const [error, setError] = useState("");
  const [selectedIds, setSelectedIds] = useState(null);
  const [scope, setScope] = useState("active");

  useEffect(() => {
    getCabinetMissionsCompare(user.id)
      .then((data) => {
        const list = data || [];
        setItems(list);
        const active = list.filter((item) => item.status !== "closed");
        setSelectedIds((active.length >= 2 ? active : list).slice(0, MAX_SELECTED).map((item) => item.id));
      })
      .catch((err) => setError(getFriendlyErrorMessage(err, language)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.id]);

  const colorOf = useMemo(() => Object.fromEntries((items || []).map((item, index) => [item.id, MISSION_COLORS[index % MISSION_COLORS.length]])), [items]);

  if (error) return <p className="field-error">{error}</p>;
  if (!items) return <AdminPageLoader language={language} />;

  const pickable = items.filter((item) => scope === "all" || item.status !== "closed");
  const compared = items.filter((item) => selectedIds?.includes(item.id));
  const rate = (count, item) => (item.candidateCount ? Math.round((count / item.candidateCount) * 100) : null);

  const metrics = [
    { key: "candidates", label: t("Candidats affectés", "Assigned candidates"), unit: "", better: "high", value: (item) => item.candidateCount },
    { key: "interviewing", label: t("En entretien", "Interviewing"), unit: "", better: "high", value: (item) => item.interviewingCount },
    { key: "placed", label: t("Placés", "Placed"), unit: "", better: "high", value: (item) => item.placedCount },
    { key: "placementRate", label: t("Taux de placement", "Placement rate"), unit: " %", better: "high", max: 100, value: (item) => rate(item.placedCount, item) },
    { key: "rejectionRate", label: t("Taux d'écartés", "Rejection rate"), unit: " %", better: "low", max: 100, value: (item) => rate(item.rejectedCount, item) },
    { key: "revenue", label: t("Montant facturé", "Amount billed"), unit: "€", better: "high", value: (item) => item.placementAmount }
  ];
  const display = (metric, value) => (typeof value !== "number" ? "-" : metric.unit === "€" ? compactMoney(value, language) : `${value}${metric.unit}`);
  const bestOf = (metric) => {
    const values = compared.map(metric.value).filter((value) => typeof value === "number");
    if (compared.length < 2 || !values.length) return null;
    return metric.better === "high" ? Math.max(...values) : Math.min(...values);
  };

  const withCandidates = compared.filter((item) => item.candidateCount > 0);
  const best = withCandidates.length ? [...withCandidates].sort((a, b) => b.placedCount - a.placedCount || b.interviewingCount - a.interviewingCount)[0] : null;
  const lagging = compared.length >= 2 ? [...compared].filter((item) => item.status !== "closed").sort((a, b) => a.candidateCount - b.candidateCount || a.interviewingCount - b.interviewingCount)[0] : null;

  function toggle(id) {
    setSelectedIds((current) => {
      if (current.includes(id)) return current.filter((value) => value !== id);
      if (current.length >= MAX_SELECTED) return current;
      return [...current, id];
    });
  }

  const exportColumns = [
    { key: "title", label: t("Mission", "Mission"), exportValue: (item) => item.title },
    { key: "client", label: t("Client", "Client"), exportValue: (item) => item.clientName || "" },
    { key: "status", label: t("Statut", "Status"), exportValue: (item) => missionStatusLabel(item.status, language) },
    { key: "candidates", label: t("Candidats", "Candidates"), exportValue: (item) => item.candidateCount },
    { key: "interviewing", label: t("En entretien", "Interviewing"), exportValue: (item) => item.interviewingCount },
    { key: "placed", label: t("Placés", "Placed"), exportValue: (item) => item.placedCount },
    { key: "rejected", label: t("Écartés", "Rejected"), exportValue: (item) => item.rejectedCount },
    { key: "amount", label: t("Montant facturé (€)", "Amount billed (€)"), exportValue: (item) => item.placementAmount ?? "" }
  ];

  return (
    <section className="admin-dashboard jy-compare">
      <header className="module-header admin-accounts-header">
        <div>
          <h2>{t("Comparer les missions", "Compare missions")}</h2>
          <p>{t("Indicateurs clés côte à côte, pour repérer la mission qui a besoin d'attention.", "Key indicators side by side, to spot which mission needs attention.")}</p>
        </div>
        {items.length ? (
          <div className="admin-header-actions">
            <AdminExportMenu language={language} title={t("Comparaison des missions", "Mission comparison")} fileBase="comparaison-missions" columns={exportColumns} rows={compared} />
          </div>
        ) : null}
      </header>

      {!items.length ? (
        <div className="jy-card jy-empty-block">
          <span className="jy-empty-icon">
            <AdminLineIcon name="compare" />
          </span>
          <strong>{t("Aucune mission à comparer", "No mission to compare")}</strong>
          <span>{t("Créez au moins deux missions et affectez-y des candidats pour les comparer.", "Create at least two missions and assign candidates to compare them.")}</span>
          {onGoToTab ? (
            <button type="button" className="jy-btn jy-btn-primary jy-btn-sm" onClick={() => onGoToTab("missions")}>
              <AdminLineIcon name="briefcase" />
              {t("Gérer les missions", "Manage missions")}
            </button>
          ) : null}
        </div>
      ) : (
        <>
          <div className="jy-card">
            <div className="jy-card-head">
              <div>
                <h3>{t("Missions comparées", "Compared missions")}</h3>
                <p className="jy-card-sub">
                  {t(`Sélectionnez jusqu'à ${MAX_SELECTED} missions.`, `Select up to ${MAX_SELECTED} missions.`)} {compared.length} / {items.length}
                </p>
              </div>
              <div className="jy-seg">
                <button type="button" className={scope === "active" ? "active" : ""} onClick={() => setScope("active")}>
                  {t("En cours", "Active")}
                </button>
                <button type="button" className={scope === "all" ? "active" : ""} onClick={() => setScope("all")}>
                  {t("Toutes", "All")}
                </button>
              </div>
            </div>
            <div className="jy-compare-picker">
              {pickable.map((item) => {
                const active = selectedIds.includes(item.id);
                return (
                  <button type="button" key={item.id} className={`jy-compare-chip ${active ? "is-active" : ""}`} onClick={() => toggle(item.id)} aria-pressed={active}>
                    <i style={{ background: colorOf[item.id] }} />
                    <span>
                      <strong>{item.title}</strong>
                      <small>
                        {item.clientName ? `${item.clientName} · ` : ""}
                        {item.candidateCount} {t("candidat(s)", "candidate(s)")}
                      </small>
                    </span>
                  </button>
                );
              })}
              {!pickable.length ? <p className="jy-empty">{t("Aucune mission en cours.", "No active mission.")}</p> : null}
            </div>
            {items.length < 2 ? (
              <div className="jy-callout">
                <AdminLineIcon name="alert" />
                <span>{t("Créez une seconde mission pour une vraie comparaison.", "Create a second mission for a real comparison.")}</span>
              </div>
            ) : null}
          </div>

          {compared.length >= 2 && (best || lagging) ? (
            <div className="jy-grid-2">
              {best ? (
                <div className="jy-verdict good">
                  <span className="jy-verdict-icon">
                    <AdminLineIcon name="quality" />
                  </span>
                  <span>
                    <small>{t("Mission la plus avancée", "Most advanced mission")}</small>
                    <strong>{best.title}</strong>
                    <em>
                      {best.placedCount} {t("placé(s)", "placed")} · {best.interviewingCount} {t("en entretien", "interviewing")} · {best.candidateCount} {t("candidat(s)", "candidate(s)")}
                    </em>
                  </span>
                </div>
              ) : null}
              {lagging && lagging.id !== best?.id ? (
                <div className="jy-verdict warn">
                  <span className="jy-verdict-icon">
                    <AdminLineIcon name="alert" />
                  </span>
                  <span>
                    <small>{t("À relancer en priorité", "Push first")}</small>
                    <strong>{lagging.title}</strong>
                    <em>
                      {lagging.candidateCount
                        ? t(`${lagging.candidateCount} candidat(s), ${lagging.interviewingCount} en entretien`, `${lagging.candidateCount} candidate(s), ${lagging.interviewingCount} interviewing`)
                        : t("Aucun candidat affecté", "No candidate assigned")}
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
                const bestValue = bestOf(metric);
                return (
                  <div key={metric.key} className="jy-card jy-metric-card">
                    <div className="jy-metric-head">
                      <h4>{metric.label}</h4>
                      <small>{metric.better === "high" ? t("Plus c'est haut, mieux c'est", "Higher is better") : t("Plus c'est bas, mieux c'est", "Lower is better")}</small>
                    </div>
                    <ul className="jy-metric-bars">
                      {compared.map((item) => {
                        const value = metric.value(item);
                        const isBest = bestValue !== null && value === bestValue;
                        return (
                          <li key={item.id}>
                            <span className="jy-metric-name" title={item.title}>
                              <i style={{ background: colorOf[item.id] }} />
                              {item.title}
                            </span>
                            <span className="jy-metric-track">
                              <span style={{ width: `${typeof value === "number" ? Math.max((value / scale) * 100, value > 0 ? 3 : 0) : 0}%`, background: colorOf[item.id] }} />
                            </span>
                            <strong className={isBest ? "is-best" : ""}>
                              {display(metric, value)}
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
            <p className="jy-empty">{t("Sélectionnez au moins une mission.", "Select at least one mission.")}</p>
          )}

          {compared.length ? (
            <div className="jy-card jy-card-flush">
              <div className="jy-card-head jy-card-head-padded">
                <h3>{t("Tableau détaillé", "Detailed table")}</h3>
              </div>
              <div className="admin-table-wrap is-flat">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>{t("Mission", "Mission")}</th>
                      <th>{t("Statut", "Status")}</th>
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
                              <strong>{item.title}</strong>
                              <span className="muted">{[item.clientName, item.location].filter(Boolean).join(" · ") || t("Aucun détail", "No details")}</span>
                            </div>
                          </div>
                        </td>
                        <td>
                          <StatusPill tone={MISSION_STATUS_TONES[item.status]}>{missionStatusLabel(item.status, language)}</StatusPill>
                        </td>
                        {metrics.map((metric) => {
                          const value = metric.value(item);
                          const bestValue = bestOf(metric);
                          return (
                            <td key={metric.key}>
                              <span className={`jy-cell-metric ${bestValue !== null && value === bestValue ? "is-best" : ""}`}>{display(metric, value)}</span>
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
        </>
      )}
    </section>
  );
}
