import React, { useEffect, useState } from "react";
// Espace École › Rapports : rapports d'employabilité (mensuels ou
// hebdomadaires, toute l'école ou une promotion) pour la direction et les
// équipes pédagogiques. Aperçu dans un panneau latéral, version imprimable /
// PDF mise en page (impression navigateur, sans librairie PDF).
import Swal from "sweetalert2";
import { AdminPageLoader } from "../../../components/AdminPageLoader.jsx";
import { getFriendlyErrorMessage } from "../../../lib/errors.js";
import { formatDateTime } from "../../../lib/format.js";
import { generateSchoolReport, getSchoolProfile, getSchoolReports } from "../../../lib/inMemoryDb.js";
import { AdminLineIcon, JyDrawer } from "../../admin/AdminApp.jsx";
import { MfaDialog, MfaError } from "../../account/mfa/MfaUi.jsx";

const esc = (value) => String(value ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

export default function SchoolReportsPage({ user, language }) {
  const t = (fr, en) => (language === "en" ? en : fr);
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [schoolName, setSchoolName] = useState("");
  const [periodFilter, setPeriodFilter] = useState("all");
  const [selected, setSelected] = useState(null);
  const [generateOpen, setGenerateOpen] = useState(false);
  const [period, setPeriod] = useState("monthly");
  const [scope, setScope] = useState("");
  const [busy, setBusy] = useState(false);
  const [dialogError, setDialogError] = useState("");

  function reload() {
    getSchoolReports(user.id)
      .then(setData)
      .catch((err) => setError(getFriendlyErrorMessage(err, language)));
  }

  useEffect(() => {
    reload();
    getSchoolProfile(user.id)
      .then((payload) => setSchoolName(payload?.profile?.organizationName || ""))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.id]);

  const periodLabel = (value) => (value === "weekly" ? t("Hebdomadaire", "Weekly") : t("Mensuel", "Monthly"));

  async function generate() {
    setBusy(true);
    setDialogError("");
    try {
      await generateSchoolReport(user.id, period, scope);
      setGenerateOpen(false);
      reload();
      Swal.fire({ toast: true, position: "top-end", icon: "success", title: t("Rapport généré.", "Report generated."), showConfirmButton: false, timer: 2200, customClass: { popup: "career-toast", title: "career-toast-title" } });
    } catch (err) {
      setDialogError(getFriendlyErrorMessage(err, language));
    } finally {
      setBusy(false);
    }
  }

  // Version imprimable / PDF, aux couleurs de Career CV.
  function printReport(item) {
    const isEn = language === "en";
    const p = item.payload || {};
    const table = (rows, first, second) =>
      rows.length
        ? `<table><thead><tr><th>${first}</th><th>${second}</th></tr></thead><tbody>${rows
            .map((row) => `<tr><td>${esc(row.label ?? row.role ?? row.name ?? row.skill)}</td><td>${esc(row.count)}</td></tr>`)
            .join("")}</tbody></table>`
        : `<p class="muted">${isEn ? "No data." : "Aucune donnée."}</p>`;
    const kpi = (label, value) => `<div class="kpi"><strong>${esc(value)}</strong><span>${label}</span></div>`;
    const alerts = (p.alerts || []).map((a) => `<li><strong>${esc(a.title || a)}</strong>${a.body ? ` : ${esc(a.body)}` : ""}</li>`).join("");
    const html = `<!doctype html><html lang="${isEn ? "en" : "fr"}"><head><meta charset="utf-8"><title>${esc(item.title)}</title>
<style>
@page{size:A4;margin:16mm}
*{box-sizing:border-box}
body{margin:0;font-family:Inter,Arial,sans-serif;color:#1c211d;font-size:12px}
header{display:flex;justify-content:space-between;align-items:flex-end;padding-bottom:12px;border-bottom:3px solid #b83309;margin-bottom:18px}
.brand{color:#b83309;font-weight:800;font-size:13px;letter-spacing:.02em}
h1{margin:6px 0 0;font-family:Georgia,serif;font-size:22px}
.meta{text-align:right;color:#6d7269;font-size:11px;line-height:1.5}
h2{margin:22px 0 8px;font-family:Georgia,serif;font-size:15px;color:#1c211d}
.kpis{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
.kpi{padding:10px 12px;border:1px solid #e7e4dc;border-radius:8px}
.kpi strong{display:block;font-family:Georgia,serif;font-size:20px}
.kpi span{color:#6d7269;font-size:11px}
table{width:100%;border-collapse:collapse}
th{background:#f3f1ec;text-align:left;padding:6px 8px;font-size:11px}
td{padding:6px 8px;border-bottom:1px solid #ece8df}
ul{margin:0;padding-left:18px;line-height:1.6}
.muted{color:#6d7269}
footer{margin-top:28px;padding-top:10px;border-top:1px solid #e7e4dc;color:#6d7269;font-size:10px}
</style></head><body>
<header><div><div class="brand">Career CV · ${esc(schoolName || (isEn ? "School" : "Établissement"))}</div><h1>${esc(item.title)}</h1></div>
<div class="meta">${isEn ? "Generated on" : "Généré le"} ${esc(formatDateTime(item.createdAt, language))}<br>${esc(periodLabel(item.period))}${p.promotionName ? ` · ${esc(p.promotionName)}` : ` · ${isEn ? "Whole school" : "Toute l'école"}`}</div></header>
<h2>${isEn ? "Overview" : "Vue d'ensemble"}</h2>
<div class="kpis">${kpi(isEn ? "Students" : "Étudiants", p.totalStudents ?? "-")}${kpi(isEn ? "Active students" : "Étudiants actifs", p.activeStudents ?? "-")}${kpi(isEn ? "Average score" : "Score moyen", p.avgScore != null ? `${p.avgScore} %` : "-")}${kpi(isEn ? "Inactive" : "Inactifs", p.inactiveStudents ?? "-")}${kpi(isEn ? "Without CV" : "Sans CV", p.withoutCv ?? "-")}${kpi(isEn ? "Low scores" : "Scores faibles", p.lowScores ?? "-")}</div>
<h2>${isEn ? "Most targeted roles" : "Métiers les plus visés"}</h2>${table(p.topTargetRoles || [], isEn ? "Role" : "Métier", isEn ? "Students" : "Étudiants")}
<h2>${isEn ? "Most common skills" : "Compétences les plus fréquentes"}</h2>${table(p.topSkills || [], isEn ? "Skill" : "Compétence", isEn ? "Students" : "Étudiants")}
<h2>${isEn ? "Alerts" : "Alertes"}</h2>${alerts ? `<ul>${alerts}</ul>` : `<p class="muted">${isEn ? "No alert." : "Aucune alerte."}</p>`}
<footer>${isEn ? "Report generated by Career CV from your students' real activity." : "Rapport généré par Career CV à partir de l'activité réelle de vos étudiants."}</footer>
<script>window.onload=function(){window.focus();window.print();};</script>
</body></html>`;
    const win = window.open("", "_blank", "width=900,height=900");
    if (!win) {
      Swal.fire({ icon: "info", title: t("Autorisez les fenêtres pop-up pour imprimer le rapport.", "Allow pop-ups to print the report.") });
      return;
    }
    win.document.open();
    win.document.write(html);
    win.document.close();
  }

  if (error) return <p className="field-error">{error}</p>;
  if (!data) return <AdminPageLoader language={language} />;

  const snapshot = data.snapshot || {};
  const reports = [...(data.items || [])].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const visible = reports.filter((item) => periodFilter === "all" || item.period === periodFilter);
  const count = (value) => reports.filter((item) => item.period === value).length;

  const cards = [
    { icon: "accounts", label: t("Étudiants", "Students"), value: snapshot.totalStudents ?? 0, tone: "" },
    { icon: "activity", label: t("Actifs", "Active"), value: snapshot.activeStudents ?? 0, tone: "green" },
    { icon: "adminCvs", label: t("Sans CV", "Without CV"), value: snapshot.withoutCv ?? 0, tone: snapshot.withoutCv ? "gold" : "" },
    { icon: "alert", label: t("Scores faibles", "Low scores"), value: snapshot.lowScores ?? 0, tone: snapshot.lowScores ? "danger" : "" },
    { icon: "trend", label: t("Score moyen", "Average score"), value: snapshot.avgScore != null ? `${snapshot.avgScore} %` : "-", tone: "gold" }
  ];

  const payload = selected?.payload || {};

  return (
    <section className="school-reports">
      <header className="module-header admin-accounts-header">
        <div>
          <h2>{t("Rapports", "Reports")}</h2>
          <p>{t("Rapports d'employabilité à partager avec la direction et les équipes pédagogiques.", "Employability reports to share with management and teaching teams.")}</p>
        </div>
        <div className="admin-header-actions">
          <button
            type="button"
            className="jy-btn jy-btn-primary"
            onClick={() => {
              setDialogError("");
              setGenerateOpen(true);
            }}
          >
            <AdminLineIcon name="report" />
            {t("Générer un rapport", "Generate a report")}
          </button>
        </div>
      </header>

      <p className="jy-section-kicker">{t("Aperçu du prochain rapport (données actuelles)", "Next report preview (current data)")}</p>
      <div className="jy-mini-cards jy-mini-cards-5">
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
          <h3>{t("Rapports générés", "Generated reports")}</h3>
          <div className="jy-seg jy-seg-counts">
            {[
              { id: "all", label: t("Tous", "All"), n: reports.length },
              { id: "monthly", label: t("Mensuels", "Monthly"), n: count("monthly") },
              { id: "weekly", label: t("Hebdomadaires", "Weekly"), n: count("weekly") }
            ].map((item) => (
              <button key={item.id} type="button" className={periodFilter === item.id ? "active" : ""} onClick={() => setPeriodFilter(item.id)}>
                {item.label}
                <span>({item.n})</span>
              </button>
            ))}
          </div>
        </div>
        {visible.length ? (
          <div className="jy-report-list">
            {visible.map((item) => (
              <div key={item.id} className="jy-report-row">
                <span className={`jy-report-icon ${item.period === "weekly" ? "weekly" : ""}`}>
                  <AdminLineIcon name="report" />
                </span>
                <span className="jy-report-text">
                  <strong>{item.title}</strong>
                  <small>
                    {formatDateTime(item.createdAt, language)} · {item.payload?.promotionName || t("Toute l'école", "Whole school")}
                  </small>
                </span>
                <span className="jy-report-tags">
                  <span className="jy-chip small">{periodLabel(item.period)}</span>
                  {item.payload?.avgScore != null ? <span className="jy-chip small">{t("Score", "Score")} {item.payload.avgScore} %</span> : null}
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
            ))}
          </div>
        ) : (
          <div className="jy-empty-block compact">
            <span className="jy-empty-icon">
              <AdminLineIcon name="report" />
            </span>
            <strong>{reports.length ? t("Aucun rapport de ce type.", "No report of this type.") : t("Aucun rapport généré pour le moment", "No report generated yet")}</strong>
            <span>{t("Un rapport fige les indicateurs du moment : générez-en un chaque mois pour suivre l'évolution.", "A report captures current indicators: generate one each month to track progress.")}</span>
          </div>
        )}
      </div>

      <JyDrawer
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        language={language}
        avatar={
          selected ? (
            <span className="jy-report-icon large">
              <AdminLineIcon name="report" />
            </span>
          ) : null
        }
        title={selected?.title || ""}
        subtitle={selected ? `${formatDateTime(selected.createdAt, language)} · ${payload.promotionName || t("Toute l'école", "Whole school")}` : ""}
        badges={selected ? <span className="tag">{periodLabel(selected.period)}</span> : null}
        sections={
          selected
            ? [
                {
                  title: t("Indicateurs", "Indicators"),
                  rows: [
                    [t("Étudiants", "Students"), String(payload.totalStudents ?? "-")],
                    [t("Étudiants actifs", "Active students"), String(payload.activeStudents ?? "-")],
                    [t("Inactifs", "Inactive"), String(payload.inactiveStudents ?? "-")],
                    [t("Sans CV", "Without CV"), String(payload.withoutCv ?? "-")],
                    [t("Scores faibles", "Low scores"), String(payload.lowScores ?? "-")],
                    [t("Score moyen", "Average score"), payload.avgScore != null ? `${payload.avgScore} %` : "-"]
                  ]
                },
                (payload.topTargetRoles || []).length
                  ? {
                      title: t("Métiers les plus visés", "Most targeted roles"),
                      rows: payload.topTargetRoles.slice(0, 5).map((row) => [row.label ?? row.role ?? row.name, String(row.count)])
                    }
                  : null,
                (payload.topSkills || []).length
                  ? {
                      title: t("Compétences les plus fréquentes", "Most common skills"),
                      content: (
                        <div className="jy-chip-cloud">
                          {payload.topSkills.slice(0, 12).map((row) => (
                            <span key={row.label ?? row.skill ?? row.name} className="jy-chip small">
                              {row.label ?? row.skill ?? row.name} <em>{row.count}</em>
                            </span>
                          ))}
                        </div>
                      )
                    }
                  : null,
                {
                  title: t("Alertes", "Alerts"),
                  content: (payload.alerts || []).length ? (
                    <ul className="jy-report-alerts">
                      {payload.alerts.map((alert, index) => (
                        <li key={index}>
                          <strong>{alert.title || alert}</strong>
                          {alert.body ? <small>{alert.body}</small> : null}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="jy-drawer-empty">{t("Aucune alerte dans ce rapport.", "No alert in this report.")}</p>
                  )
                }
              ]
            : []
        }
        footer={
          selected ? (
            <button type="button" className="admin-row-action" onClick={() => printReport(selected)}>
              <AdminLineIcon name="printer" /> {t("Imprimer / PDF", "Print / PDF")}
            </button>
          ) : null
        }
      />

      <MfaDialog
        open={generateOpen}
        onClose={() => !busy && setGenerateOpen(false)}
        icon="plus"
        title={t("Générer un rapport", "Generate a report")}
        description={t("Le rapport fige les indicateurs actuels de vos étudiants.", "The report captures your students' current indicators.")}
        width={540}
        footer={
          <>
            <button type="button" className="mfa-btn ghost" onClick={() => setGenerateOpen(false)} disabled={busy}>
              {t("Annuler", "Cancel")}
            </button>
            <button type="button" className="mfa-btn primary" onClick={generate} disabled={busy}>
              {busy ? <span className="mfa-spinner" /> : null}
              {t("Générer", "Generate")}
            </button>
          </>
        }
      >
        <MfaError message={dialogError} />
        <div className="mfa-field">
          <span>{t("Type de rapport", "Report type")}</span>
          <div className="jy-choice-cards">
            {[
              { id: "monthly", title: t("Mensuel", "Monthly"), hint: t("Bilan du mois, pour la direction.", "Monthly review, for management.") },
              { id: "weekly", title: t("Hebdomadaire", "Weekly"), hint: t("Point rapide pour les équipes.", "Quick check for teams.") }
            ].map((option) => (
              <button type="button" key={option.id} className={`jy-choice-card ${period === option.id ? "is-active" : ""}`} onClick={() => setPeriod(option.id)} aria-pressed={period === option.id}>
                <strong>{option.title}</strong>
                <small>{option.hint}</small>
              </button>
            ))}
          </div>
        </div>
        <label className="mfa-field">
          <span>{t("Périmètre", "Scope")}</span>
          <select value={scope} onChange={(event) => setScope(event.target.value)}>
            <option value="">{t("Toute l'école", "Whole school")}</option>
            {(data.promotions || []).map((promo) => (
              <option key={promo.id} value={promo.id}>
                {promo.name}
              </option>
            ))}
          </select>
        </label>
      </MfaDialog>
    </section>
  );
}
