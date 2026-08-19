import React from "react";
// Bouton d'export CSV générique (ouvre l'URL d'export dans un nouvel
// onglet), utilisé par les modules Admin et École.
import { useState } from "react";
import { UiIcon } from "./UiIcon.jsx";
import { getApiBase } from "../lib/inMemoryDb.js";

export function AdminExportCsvButton({ adminUserId, path, language }) {
  const [loading, setLoading] = useState(false);
  async function handleClick() {
    setLoading(true);
    try {
      const base = await getApiBase();
      window.open(`${base}${path}?adminUserId=${encodeURIComponent(adminUserId)}`, "_blank");
    } finally {
      setLoading(false);
    }
  }
  return (
    <button type="button" className="btn-ghost admin-export-btn" onClick={handleClick} disabled={loading}>
      {loading ? <span className="btn-spinner" /> : <UiIcon name="download" />}
      {language === "en" ? "Export CSV" : "Exporter en CSV"}
    </button>
  );
}
