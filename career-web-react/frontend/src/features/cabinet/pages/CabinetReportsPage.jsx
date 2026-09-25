import React, { useEffect, useState } from "react";
// Espace Cabinet › Rapports : shortlists de candidats figées par mission,
// à envoyer au client. Aperçu dans un panneau latéral, version imprimable /
// PDF aux couleurs de Career CV (impression navigateur, sans librairie PDF).
import { AdminPageLoader } from "../../../components/AdminPageLoader.jsx";
import { getFriendlyErrorMessage } from "../../../lib/errors.js";
import { formatDateTime } from "../../../lib/format.js";
import { generateCabinetReport, getCabinetMissions, getCabinetProfile, getCabinetReports } from "../../../lib/inMemoryDb.js";
import { AdminLineIcon, JyDrawer } from "../../admin/AdminApp.jsx";
import { MfaDialog, MfaError } from "../../account/mfa/MfaUi.jsx";
import { cabinetToast } from "./cabinetToast.js";
import { CANDIDATE_STATUSES, CANDIDATE_STATUS_TONES, MISSION_STATUS_TONES, StatusPill, candidateName, candidateStatusLabel, missionStatusLabel } from "./cabinetUi.jsx";

const esc = (value) => String(value ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

export default function CabinetReportsPage({ user, language, onGoToTab }) {
  const t = (fr, en) => (language === "en" ? en : fr);
  const [data, setData] = useState(null);
  const [missions, setMissions] = useState([]);
  const [firmName, setFirmName] = useState("");
  const [error, setError] = useState("");
  const [missionFilter, setMissionFilter] = useState("");
  const [selected, setSelected] = useState(null);
  const [generateOpen, setGenerateOpen] = useState(false);
  const [missionId, setMissionId] = useState("");
  const [busy, setBusy] = useState(false);
  const [dialogError, setDialogError] = useState("");

  function reload() {
    getCabinetReports(user.id)
      .then(setData)
      .catch((err) => setError(getFriendlyErrorMessage(err, language)));
  }

  useEffect(() => {
    reload();
    getCabinetMissions(user.id)
      .then(setMissions)
      .catch(() => setMissions([]));
    getCabinetProfile(user.id)
      .then((payload) => setFirmName(payload?.profile?.organizationName || ""))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.id]);

  function openGenerate(preselect = "") {
    setDialogError("");
    setMissionId(preselect || missions.find((item) => item.candidates.length)?.id || missions[0]?.id || "");
    setGenerateOpen(true);
  }

  async function generate() {
    if (!missionId) {
      setDialogError(t("Choisissez une mission.", "Pick a mission."));
      return;
    }
    setBusy(true);
    setDialogError("");
    try {
      await generateCabinetReport(user.id, missionId);
      setGenerateOpen(false);
      reload();
      cabinetToast({ title: t("Shortlist générée.", "Shortlist generated.") });
    } catch (err) {
      setDialogError(getFriendlyErrorMessage(err, language));
    } finally {
      setBusy(false);
    }
  }

  // Version imprimable / PDF, aux couleurs de Career CV et au nom du cabinet.
  function printReport(item) {
    const isEn = language === "en";
    const p = item.payload || {};
    const people = p.candidates || [];
    const stageCount = (stage) => people.filter((candidate) => candidate.stage === stage).length;
    const rows = people
      .map(
        (candidate, index) =>
          `<tr><td>${index + 1}</td><td><strong>${esc(`${candidate.firstName || ""} ${candidate.lastName || ""}`.trim())}</strong>${candidate.email ? `<br><span class="muted">${esc(candidate.email)}</span>` : ""}</td><td>${esc(candidate.headline || "")}</td><td>${esc(candidateStatusLabel(candidate.stage, language))}</td><td>${candidate.score != null ? `${esc(candidate.score)} %` : "-"}</td></tr>`
      )
      .join("");
    const kpi = (label, value) => `<div class="kpi"><strong>${esc(value)}</strong><span>${label}</span></div>`;
    const html = `<!doctype html><html lang="${isEn ? "en" : "fr"}"><head><meta charset="utf-8"><title>${esc(item.title)}</title>
<style>
@page{size:A4;margin:16mm}
*{box-sizing:border-box}
body{margin:0;font-family:Inter,Arial,sans-serif;color:#1c211d;font-size:12px}
header{display:flex;justify-content:space-between;align-items:flex-end;padding-bottom:12px;border-bottom:3px solid #b83309;margin-bottom:18px}
.brand{color:#b83309;font-weight:800;font-size:13px;letter-spacing:.02em}
h1{margin:6px 0 0;font-family:Georgia,serif;font-size:22px}
.meta{text-align:right;color:#6d7269;font-size:11px;line-height:1.5}
h2{margin:22px 0 8px;font-family:Georgia,serif;font-size:15px}
.kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}
.kpi{padding:10px 12px;border:1px solid #e7e4dc;border-radius:8px}
.kpi strong{display:block;font-family:Georgia,serif;font-size:20px}
.kpi span{color:#6d7269;font-size:11px}
table{width:100%;border-collapse:collapse}
th{background:#f3f1ec;text-align:left;padding:6px 8px;font-size:11px}
td{padding:7px 8px;border-bottom:1px solid #ece8df;vertical-align:top}
.muted{color:#6d7269;font-size:11px}
footer{margin-top:28px;padding-top:10px;border-top:1px solid #e7e4dc;color:#6d7269;font-size:10px}
</style></head><body>
<header><div><div class="brand">Career CV · ${esc(firmName || (isEn ? "Recruitment firm" : "Cabinet de recrutement"))}</div><h1>${esc(p.missionTitle || item.title)}</h1></div>
<div class="meta">${p.clientName ? `${isEn ? "Client" : "Client"} : ${esc(p.clientName)}<br>` : ""}${isEn ? "Generated on" : "Généré le"} ${esc(formatDateTime(item.createdAt, language))}</div></header>
<h2>${isEn ? "Overview" : "Vue d'ensemble"}</h2>
<div class="kpis">${kpi(isEn ? "Candidates" : "Candidats", people.length)}${kpi(isEn ? "Interviewing" : "En entretien", stageCount("interviewing"))}${kpi(isEn ? "Placed" : "Placés", stageCount("placed"))}${kpi(isEn ? "Rejected" : "Écartés", stageCount("rejected"))}</div>
<h2>${isEn ? "Candidate shortlist" : "Shortlist des candidats"}</h2>
${people.length ? `<table><thead><tr><th>#</th><th>${isEn ? "Candidate" : "Candidat"}</th><th>${isEn ? "Profile" : "Profil"}</th><th>${isEn ? "Stage" : "Étape"}</th><th>Score</th></tr></thead><tbody>${rows}</tbody></table>` : `<p class="muted">${isEn ? "No candidate assigned to this mission." : "Aucun candidat affecté à cette mission."}</p>`}
<footer>${isEn ? "Shortlist generated by Career CV from the firm's recruitment pipeline." : "Shortlist générée par Career CV à partir du pipeline de recrutement du cabinet."}</footer>
<script>window.onload=function(){window.focus();window.print();};</script>
</body></html>`;
    const win = window.open("", "_blank", "width=900,height=900");
    if (!win) {
      cabinetToast({ title: t("Autorisez les fenêtres pop-up pour imprimer le rapport.", "Allow pop-ups to print the report."), icon: "info" });
      return;
    }
    win.document.open();
    win.document.write(html);
    win.document.close();
  }

  if (error) return <p className="field-error">{error}</p>;
  if (!data) return <AdminPageLoader language={language} />;

  const reports = [...(data.items || [])].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const visible = reports.filter((item) => !missionFilter || item.missionId === missionFilter);
  const reportedMissions = new Set(reports.map((item) => item.missionId));
  const shortlisted = reports.reduce((sum, item) => sum + (item.payload?.candidates?.length || 0), 0);
  const lastReport = reports[0];
  const cards = [
    { icon: "report", label: t("Shortlists générées", "Shortlists generated"), value: reports.length, tone: "" },
    { icon: "briefcase", label: t("Missions couvertes", "Missions covered"), value: `${reportedMissions.size} / ${missions.length}`, tone: "green" },
    { icon: "accounts", label: t("Candidats présentés", "Candidates presented"), value: shortlisted, tone: "gold" },
    { icon: "clock", label: t("Dernier rapport", "Latest report"), value: lastReport ? formatDateTime(lastReport.createdAt, language).split(" ")[0] : t("Aucun", "None"), tone: "" }
  ];

  const payload = selected?.payload || {};
  const people = payload.candidates || [];
  const selectedMission = missions.find((item) => item.id === missionId);

  return (
    <section className="school-reports">
      <header className="module-header admin-accounts-header">
        <div>
          <h2>{t("Rapports", "Reports")}</h2>
          <p>{t("Des shortlists de candidats par mission, prêtes à être envoyées à vos clients.", "Candidate shortlists per mission, ready to send to your clients.")}</p>
        </div>
        <div className="admin-header-actions">
          <button type="button" className="jy-btn jy-btn-primary" onClick={() => openGenerate()} disabled={!missions.length}>
            <AdminLineIcon name="report" />
            {t("Générer une shortlist", "Generate a shortlist")}
          </button>
        </div>
      </header>

      <div className="jy-mini-cards">
        {cards.map((card) => (
          <div key={card.label} className="jy-mini-card">
            <span className="jy-mini-card-label">
              <AdminLineIcon name={card.icon} />
              {card.label}
            </span>
            <strong className={card.tone}>{card.value}</strong>
          </div>
        ))}
      </div>

      <div className="jy-card jy-card-flush">
        <div className="jy-card-head jy-card-head-padded">
          <h3>{t("Shortlists générées", "Generated shortlists")}</h3>
          {reports.length ? (
            <label className="jy-inline-select">
              <AdminLineIcon name="briefcase" />
              <select value={missionFilter} onChange={(event) => setMissionFilter(event.target.value)} aria-label={t("Mission", "Mission")}>
                <option value="">{t("Toutes les missions", "All missions")}</option>
                {(data.missions || []).filter((item) => reportedMissions.has(item.id)).map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
        </div>
        {visible.length ? (
          <div className="jy-report-list">
            {visible.map((item) => {
              const list = item.payload?.candidates || [];
              const placedCount = list.filter((candidate) => candidate.stage === "placed").length;
              return (
                <div key={item.id} className="jy-report-row">
                  <span className="jy-report-icon">
                    <AdminLineIcon name="report" />
                  </span>
                  <span className="jy-report-text">
                    <strong>{item.payload?.missionTitle || item.title}</strong>
                    <small>
                      {formatDateTime(item.createdAt, language)}
                      {item.payload?.clientName ? ` · ${item.payload.clientName}` : ""}
                    </small>
                  </span>
                  <span className="jy-report-tags">
                    <span className="jy-chip small">
                      {list.length} {t("candidat(s)", "candidate(s)")}
                    </span>
                    {placedCount ? (
                      <span className="jy-chip small">
                        {placedCount} {t("placé(s)", "placed")}
                      </span>
                    ) : null}
                  </span>
                  <span className="jy-report-actions">
                    <button type="button" className="jy-btn jy-btn-outline jy-btn-sm" onClick={() => setSelected(item)}>
                      <AdminLineIcon name="eye" />
                      {t("Aperçu", "Preview")}
                    </button>
                    <button type="button" className="jy-btn jy-btn-outline jy-btn-sm" onClick={() => printReport(item)}>
                      <AdminLineIcon name="printer" />
                      PDF
                    </button>
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="jy-empty-block compact">
            <span className="jy-empty-icon">
              <AdminLineIcon name="report" />
            </span>
            <strong>{t("Aucune shortlist pour le moment", "No shortlist yet")}</strong>
            <span>
              {missions.length
                ? t("Générez la shortlist d'une mission pour la présenter à votre client.", "Generate a mission's shortlist to present it to your client.")
                : t("Créez d'abord une mission et affectez-y des candidats.", "First create a mission and assign candidates to it.")}
            </span>
            {!missions.length && onGoToTab ? (
              <button type="button" className="jy-btn jy-btn-outline jy-btn-sm" onClick={() => onGoToTab("missions")}>
                <AdminLineIcon name="briefcase" />
                {t("Voir les missions", "View missions")}
              </button>
            ) : null}
          </div>
        )}
      </div>

      <JyDrawer
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        language={language}
        avatar={
          <span className="jy-report-icon large">
            <AdminLineIcon name="report" />
          </span>
        }
        title={payload.missionTitle || selected?.title || ""}
        subtitle={selected ? `${payload.clientName ? `${payload.clientName} · ` : ""}${formatDateTime(selected.createdAt, language)}` : ""}
        badges={payload.status ? <StatusPill tone={MISSION_STATUS_TONES[payload.status]}>{missionStatusLabel(payload.status, language)}</StatusPill> : null}
        sections={
          selected
            ? [
                {
                  title: t("Au moment du rapport", "At report time"),
                  content: (
                    <div className="jy-stage-summary">
                      {CANDIDATE_STATUSES.map((key) => (
                        <span key={key} className={`tone-${CANDIDATE_STATUS_TONES[key]}`}>
                          <strong>{people.filter((candidate) => candidate.stage === key).length}</strong>
                          <small>{candidateStatusLabel(key, language)}</small>
                        </span>
                      ))}
                    </div>
                  )
                },
                {
                  title: t("Shortlist", "Shortlist"),
                  content: people.length ? (
                    <ul className="jy-mission-people">
                      {people.map((candidate, index) => (
                        <li key={`${candidate.email}-${index}`}>
                          <span className="jy-rank">{index + 1}</span>
                          <span className="jy-mission-person">
                            <strong>{candidateName(candidate)}</strong>
                            <small>{candidate.headline || candidate.email || ""}</small>
                          </span>
                          <StatusPill tone={CANDIDATE_STATUS_TONES[candidate.stage]}>{candidateStatusLabel(candidate.stage, language)}</StatusPill>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="jy-drawer-empty">{t("Aucun candidat affecté à cette mission.", "No candidate assigned to this mission.")}</p>
                  )
                }
              ]
            : []
        }
        footer={
          selected ? (
            <>
              <button type="button" className="jy-btn jy-btn-primary" onClick={() => printReport(selected)}>
                <AdminLineIcon name="printer" />
                {t("Imprimer / PDF", "Print / PDF")}
              </button>
              <button
                type="button"
                className="jy-btn jy-btn-outline"
                onClick={() => {
                  const id = selected.missionId;
                  setSelected(null);
                  openGenerate(id);
                }}
              >
                <AdminLineIcon name="reset" />
                {t("Régénérer", "Regenerate")}
              </button>
            </>
          ) : null
        }
      />

      <MfaDialog
        open={generateOpen}
        onClose={() => !busy && setGenerateOpen(false)}
        icon="download"
        title={t("Générer une shortlist", "Generate a shortlist")}
        description={t("Le rapport fige les candidats affectés à la mission et leur étape actuelle.", "The report freezes the candidates assigned to the mission and their current stage.")}
        width={560}
        footer={
          <>
            <button type="button" className="mfa-btn ghost" onClick={() => setGenerateOpen(false)} disabled={busy}>
              {t("Annuler", "Cancel")}
            </button>
            <button type="button" className="mfa-btn primary" onClick={generate} disabled={busy || !missionId}>
              {busy ? <span className="mfa-spinner" /> : null}
              {t("Générer", "Generate")}
            </button>
          </>
        }
      >
        <MfaError message={dialogError} />
        <div className="mfa-field">
          <span>{t("Mission", "Mission")}</span>
          <div className="jy-choice-list">
            {missions.map((item) => (
              <button type="button" key={item.id} className={`jy-choice-card row ${missionId === item.id ? "is-active" : ""}`} onClick={() => setMissionId(item.id)} aria-pressed={missionId === item.id}>
                <span>
                  <strong>{item.title}</strong>
                  <small>{[item.clientName, `${item.candidates.length} ${t("candidat(s)", "candidate(s)")}`].filter(Boolean).join(" · ")}</small>
                </span>
                <StatusPill tone={MISSION_STATUS_TONES[item.status]}>{missionStatusLabel(item.status, language)}</StatusPill>
              </button>
            ))}
          </div>
        </div>
        {selectedMission && !selectedMission.candidates.length ? (
          <div className="jy-callout">
            <AdminLineIcon name="alert" />
            <span>{t("Aucun candidat n'est affecté à cette mission : la shortlist sera vide.", "No candidate is assigned to this mission: the shortlist will be empty.")}</span>
          </div>
        ) : null}
      </MfaDialog>
    </section>
  );
}
