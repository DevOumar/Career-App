import React from "react";
// Petit loader générique utilisé par les pages Admin et École pendant le
// chargement de leurs données.

export function AdminPageLoader({ language, label }) {
  return (
    <div
      className="admin-page-loader"
      aria-label={label || (language === "en" ? "Loading data" : "Chargement des donnees")}
    >
      <div className="app-boot-loader" aria-hidden="true">
        <img src="/favicon.png" alt="" className="app-boot-icon" />
      </div>
    </div>
  );
}
