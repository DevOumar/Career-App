import React from "react";
// Petite carte indicateur (icône + valeur + libellé), utilisée par les
// dashboards Admin et École.
import { UiIcon } from "./UiIcon.jsx";

export function AdminKpiCard({ tone, icon, value, label }) {
  return (
    <div className={`admin-kpi-card tone-${tone}`}>
      <span className="admin-kpi-icon">
        <UiIcon name={icon} />
      </span>
      <span className="admin-kpi-value">{value}</span>
      <span className="admin-kpi-label">{label}</span>
    </div>
  );
}
