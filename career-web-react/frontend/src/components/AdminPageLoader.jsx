import React from "react";
// Petit loader générique utilisé par les pages Admin et École pendant le
// chargement de leurs données.
import { UiIcon } from "./UiIcon.jsx";

export function AdminPageLoader({ language, label }) {
  return (
    <div
      className="admin-page-loader"
      aria-label={label || (language === "en" ? "Loading data" : "Chargement des donnees")}
    >
      <div className="app-boot-loader" aria-hidden="true">
        <span className="brand-mark" aria-hidden="true">
          <UiIcon name="matchmark" />
        </span>
      </div>
    </div>
  );
}
