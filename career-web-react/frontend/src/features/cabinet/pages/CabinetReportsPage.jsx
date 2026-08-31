import React from "react";
import { useState, useEffect } from "react";
import Swal from "sweetalert2";
import { UiIcon } from "../../../components/UiIcon.jsx";
import { getFriendlyErrorMessage } from "../../../lib/errors.js";
import { formatDate } from "../../../lib/format.js";
import { getCabinetReports, generateCabinetReport } from "../../../lib/inMemoryDb.js";
import { CabinetEmptyState } from "./CabinetEmptyState.jsx";

export default function CabinetReportsPage({ user, language }) {
  const copy =
    language === "en"
      ? {
          title: "Reports",
          subtitle: "Generate a printable candidate shortlist for a client mission.",
          missionLabel: "Mission",
          generate: "Generate report",
          empty: "No report generated yet.",
          emptyHint: "Pick a mission above and generate its first shortlist.",
          viewPrint: "View / Print",
          candidate: "Candidate",
          stage: "Stage",
          score: "Score"
        }
      : {
          title: "Rapports",
          subtitle: "Générez une shortlist de candidats imprimable pour une mission client.",
          missionLabel: "Mission",
          generate: "Générer le rapport",
          empty: "Aucun rapport généré pour le moment.",
          emptyHint: "Choisissez une mission ci-dessus et générez sa première shortlist.",
          viewPrint: "Consulter / Imprimer",
          candidate: "Candidat",
          stage: "Étape",
          score: "Score"
        };

  const [data, setData] = useState(null);
  const [missionId, setMissionId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function reload() {
    getCabinetReports(user.id).then(setData).catch((err) => setError(getFriendlyErrorMessage(err, language)));
  }

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.id]);

  async function generate() {
    if (!missionId) return;
    setBusy(true);
    try {
      await generateCabinetReport(user.id, missionId);
      reload();
      Swal.fire({ icon: "success", title: language === "en" ? "Report generated." : "Rapport généré.", timer: 1800, showConfirmButton: false });
    } catch (err) {
      setError(getFriendlyErrorMessage(err, language));
    } finally {
      setBusy(false);
    }
  }

  function viewReport(item) {
    const p = item.payload || {};
    const esc = (value) => String(value ?? "").replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
    const rows = (p.candidates || [])
      .map((c) => `<tr><td>${esc(c.firstName)} ${esc(c.lastName)}</td><td>${esc(c.headline)}</td><td>${esc(c.stage)}</td><td>${c.score != null ? esc(c.score) : "—"}</td></tr>`)
      .join("");
    const html = `<!doctype html><html><head><meta charset="utf-8"/><title>${esc(item.title)}</title>
      <style>body{font-family:Arial,Helvetica,sans-serif;color:#101828;padding:2rem;max-width:720px;margin:0 auto;}
      h1{font-size:1.4rem;} table{width:100%;border-collapse:collapse;margin-top:1rem;font-size:0.85rem;}
      th,td{text-align:left;padding:0.4rem 0.5rem;border-bottom:1px solid #eee;} .muted{color:#667085;font-size:0.85rem;}</style>
      </head><body><h1>${esc(item.title)}</h1>
      <p class="muted">${esc(p.clientName || "")} · ${formatDate(item.createdAt)}</p>
      <table><thead><tr><th>${copy.candidate}</th><th>—</th><th>${copy.stage}</th><th>${copy.score}</th></tr></thead>
      <tbody>${rows}</tbody></table></body></html>`;
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 300);
  }

  return (
    <section className="cv-history-page cabinet-page">
      <div className="card block history-head">
        <div className="feature-page-header">
          <span className="feature-page-header-icon">
            <UiIcon name="file" />
          </span>
          <div>
            <h2>{copy.title}</h2>
            <p className="muted">{copy.subtitle}</p>
          </div>
        </div>
      </div>

      <div className="card block cabinet-filters-row">
        <select value={missionId} onChange={(event) => setMissionId(event.target.value)}>
          <option value="">{copy.missionLabel}</option>
          {data?.missions?.map((mission) => (
            <option key={mission.id} value={mission.id}>{mission.name}</option>
          ))}
        </select>
        <button type="button" className="btn-main ready" disabled={!missionId || busy} onClick={generate}>
          {busy ? <span className="btn-spinner" /> : <UiIcon name="file" />} {copy.generate}
        </button>
      </div>
      {error ? <p className="field-error">{error}</p> : null}

      {data?.items?.length ? (
        <div className="history-list">
          {data.items.map((item) => (
            <article className="history-card" key={item.id}>
              <div className="history-card-top">
                <div className="history-card-main">
                  <span className="history-card-icon">
                    <UiIcon name="file" />
                  </span>
                  <div>
                    <h3>{item.title}</h3>
                    <p>{formatDate(item.createdAt)}</p>
                  </div>
                </div>
                <button type="button" className="btn-ghost" onClick={() => viewReport(item)}>
                  <UiIcon name="file" /> {copy.viewPrint}
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <CabinetEmptyState icon="file" title={copy.empty} hint={copy.emptyHint} />
      )}
    </section>
  );
}
