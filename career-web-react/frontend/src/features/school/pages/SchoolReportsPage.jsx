import React from "react";
// Module École : shell + toutes les pages du dashboard école (étudiants,
// invitations, promotions, licence, statistiques, rapports, paramètres).
import { useState, useEffect, useRef } from "react";
import Swal from "sweetalert2";
import { UiIcon } from "../../../components/UiIcon.jsx";
import { AdminPageLoader } from "../../../components/AdminPageLoader.jsx";
import { AdminKpiCard } from "../../../components/AdminKpiCard.jsx";
import { AvatarCircle } from "../../../components/AvatarCircle.jsx";
import { LanguageSwitch } from "../../../components/LanguageSwitch.jsx";
import { getPlanById } from "../../../data/plans.js";
import { getFriendlyErrorMessage } from "../../../lib/errors.js";
import { formatDate } from "../../../lib/format.js";
import { fileToBase64 } from "../../../lib/cvService.js";
import {
  getApiBase,
  getSchoolOverview,
  getSchoolStudents,
  getSchoolLicense,
  getSchoolInsights,
  getSchoolInvitations,
  getSchoolNotifications,
  getSchoolProfile,
  updateSchoolProfile,
  getSchoolPromotions,
  createSchoolPromotion,
  deleteSchoolPromotion,
  updateSchoolPromotionStudent,
  getSchoolReports,
  sendSchoolInvitation,
  removeSchoolStudent,
  markSchoolNotificationsRead,
  generateSchoolReport
} from "../../../lib/inMemoryDb.js";
// Composants partagés avec le module Admin (déplacement mécanique en
// attendant une extraction complète des composants réellement génériques) —
// import "arrière" volontaire, sûr au rendu uniquement.
import {
  AdminTrendChart,
  AdminDonutChart,
  AdminMiniMetric,
  AdminPagination,
  ADMIN_PAGE_SIZE,
  planPriceLabel
} from "../../admin/AdminApp.jsx";
import AccountDrawer from "../../account/AccountDrawer.jsx";
import { ConnectedFooter } from "../../../App.jsx";
import { SchoolExportCsvButton, SchoolLicenseCard, SchoolEmptyState } from "../SchoolApp.jsx";

export default function SchoolReportsPage({ user, language }) {
  const copy = language === "en"
    ? {
        title: "Reports",
        subtitle: "Generate employability reports for management and academic teams.",
        generateMonthly: "Generate monthly report",
        generateWeekly: "Generate weekly report",
        totalStudents: "Students",
        activeStudents: "Active",
        withoutCv: "Without CV",
        lowScores: "Low scores",
        avgScore: "Average score",
        history: "Generated reports",
        empty: "No report generated yet.",
        allPromotions: "Whole school",
        promotionLabel: "Scope"
      }
    : {
        title: "Rapports",
        subtitle: "Générez des rapports d'employabilité pour la direction et les équipes pédagogiques.",
        generateMonthly: "Générer le rapport mensuel",
        generateWeekly: "Générer le rapport hebdomadaire",
        totalStudents: "Étudiants",
        activeStudents: "Actifs",
        withoutCv: "Sans CV",
        lowScores: "Scores faibles",
        avgScore: "Score moyen",
        history: "Rapports générés",
        empty: "Aucun rapport généré pour le moment.",
        allPromotions: "Toute l'école",
        promotionLabel: "Périmètre"
      };
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [promotionId, setPromotionId] = useState("");

  function reload() {
    getSchoolReports(user.id).then(setData).catch((err) => setError(getFriendlyErrorMessage(err, language)));
  }

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.id]);

  // Le contenu riche (top métiers visés, top compétences manquantes,
  // alertes) est déjà renvoyé par GET /api/school/reports (payload par
  // rapport) mais n'était affiché nulle part — vue imprimable en PDF, même
  // principe que le résumé RGPD candidat (impression navigateur, pas de
  // librairie PDF supplémentaire).
  function viewReport(item) {
    const isEn = language === "en";
    const p = item.payload || {};
    const esc = (value) => String(value ?? "").replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));

    const roleRows = (p.topTargetRoles || [])
      .map((r) => `<tr><td>${esc(r.label ?? r.role ?? r.name)}</td><td>${esc(r.count)}</td></tr>`)
      .join("");
    const skillRows = (p.topSkills || [])
      .map((s) => `<tr><td>${esc(s.label ?? s.skill ?? s.name)}</td><td>${esc(s.count)}</td></tr>`)
      .join("");
    const alertItems = (p.alerts || [])
      .map((a) => `<li><strong>${esc(a.title || a)}</strong>${a.body ? ` — ${esc(a.body)}` : ""}</li>`)
      .join("");

    const html = `<!doctype html>
<html lang="${language}">
<head>
<meta charset="utf-8" />
<title>${esc(item.title)}</title>
<style>
  body { font-family: Arial, Helvetica, sans-serif; color: #101828; padding: 2rem; max-width: 720px; margin: 0 auto; }
  h1 { font-size: 1.4rem; margin-bottom: 0.2rem; }
  h2 { font-size: 1.05rem; margin-top: 2rem; border-bottom: 1px solid #e5e7eb; padding-bottom: 0.3rem; }
  table { width: 100%; border-collapse: collapse; margin-top: 0.6rem; font-size: 0.85rem; }
  th, td { text-align: left; padding: 0.4rem 0.5rem; border-bottom: 1px solid #eee; }
  .muted { color: #667085; font-size: 0.85rem; }
  .row { display: flex; justify-content: space-between; padding: 0.3rem 0; border-bottom: 1px solid #f2f2f2; }
</style>
</head>
<body>
  <h1>${esc(item.title)}</h1>
  <p class="muted">${isEn ? "Generated on" : "Généré le"} ${esc(formatDate(item.createdAt))}${p.promotionName ? ` · ${esc(p.promotionName)}` : ""}</p>

  <h2>${isEn ? "Overview" : "Vue d'ensemble"}</h2>
  <div class="row"><span>${isEn ? "Total students" : "Étudiants au total"}</span><strong>${esc(p.totalStudents)}</strong></div>
  <div class="row"><span>${isEn ? "Active students" : "Étudiants actifs"}</span><strong>${esc(p.activeStudents)}</strong></div>
  <div class="row"><span>${isEn ? "Inactive students" : "Étudiants inactifs"}</span><strong>${esc(p.inactiveStudents)}</strong></div>
  <div class="row"><span>${isEn ? "Without CV" : "Sans CV"}</span><strong>${esc(p.withoutCv)}</strong></div>
  <div class="row"><span>${isEn ? "Low scores" : "Scores faibles"}</span><strong>${esc(p.lowScores)}</strong></div>
  <div class="row"><span>${isEn ? "Average score" : "Score moyen"}</span><strong>${p.avgScore != null ? `${esc(p.avgScore)}%` : "—"}</strong></div>

  <h2>${isEn ? "Most targeted roles" : "Métiers les plus visés"}</h2>
  ${roleRows ? `<table><thead><tr><th>${isEn ? "Role" : "Métier"}</th><th>${isEn ? "Students" : "Étudiants"}</th></tr></thead><tbody>${roleRows}</tbody></table>` : `<p class="muted">${isEn ? "No data." : "Aucune donnée."}</p>`}

  <h2>${isEn ? "Most common missing skills" : "Compétences manquantes les plus fréquentes"}</h2>
  ${skillRows ? `<table><thead><tr><th>${isEn ? "Skill" : "Compétence"}</th><th>${isEn ? "Students" : "Étudiants"}</th></tr></thead><tbody>${skillRows}</tbody></table>` : `<p class="muted">${isEn ? "No data." : "Aucune donnée."}</p>`}

  <h2>${isEn ? "Alerts" : "Alertes"}</h2>
  ${alertItems ? `<ul>${alertItems}</ul>` : `<p class="muted">${isEn ? "No alert." : "Aucune alerte."}</p>`}
</body>
</html>`;

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 300);
  }

  async function generate(period) {
    setBusy(period);
    try {
      await generateSchoolReport(user.id, period, promotionId);
      reload();
      Swal.fire({ icon: "success", title: language === "en" ? "Report generated." : "Rapport généré.", timer: 1800, showConfirmButton: false });
    } catch (err) {
      setError(getFriendlyErrorMessage(err, language));
    } finally {
      setBusy("");
    }
  }

  if (!data) return <AdminPageLoader language={language} />;

  return (
    <section className="school-reports">
      <header className="module-header">
        <h2>{copy.title}</h2>
        <p>{copy.subtitle}</p>
      </header>
      <div className="admin-module-metrics">
        <AdminMiniMetric icon="profile" label={copy.totalStudents} value={data.snapshot.totalStudents} />
        <AdminMiniMetric icon="chart" label={copy.activeStudents} value={data.snapshot.activeStudents} tone="success" />
        <AdminMiniMetric icon="upload" label={copy.withoutCv} value={data.snapshot.withoutCv} tone="warning" />
        <AdminMiniMetric icon="alert" label={copy.lowScores} value={data.snapshot.lowScores} tone="danger" />
        <AdminMiniMetric icon="scale" label={copy.avgScore} value={data.snapshot.avgScore != null ? `${data.snapshot.avgScore}%` : "—"} />
      </div>
      <div className="school-report-actions">
        {data.promotions?.length ? (
          <select
            className="school-insight-promotion-filter"
            value={promotionId}
            onChange={(event) => setPromotionId(event.target.value)}
            title={copy.promotionLabel}
          >
            <option value="">{copy.allPromotions}</option>
            {data.promotions.map((promo) => (
              <option key={promo.id} value={promo.id}>{promo.name}</option>
            ))}
          </select>
        ) : null}
        <button className="btn-main ready" onClick={() => generate("monthly")} disabled={Boolean(busy)}>
          {busy === "monthly" ? <span className="btn-spinner" /> : <UiIcon name="file" />} {copy.generateMonthly}
        </button>
        <button className="btn-ghost" onClick={() => generate("weekly")} disabled={Boolean(busy)}>
          {busy === "weekly" ? <span className="btn-spinner dark" /> : <UiIcon name="history" />} {copy.generateWeekly}
        </button>
      </div>
      {error ? <p className="field-error">{error}</p> : null}
      <div className="admin-panel school-insight-panel">
        <h3>{copy.history}</h3>
        {data.items.length ? (
          <div className="school-report-list">
            {data.items.map((item) => (
              <article key={item.id} className="school-report-row school-report-row-clickable" onClick={() => viewReport(item)}>
                <div>
                  <strong>{item.title}</strong>
                  <span className="muted">
                    {formatDate(item.createdAt)} · {item.period}
                    {item.payload?.promotionName ? ` · ${item.payload.promotionName}` : ""}
                  </span>
                </div>
                <span className="tag">{item.payload?.avgScore != null ? `${item.payload.avgScore}%` : "—"}</span>
                <button
                  type="button"
                  className="btn-ghost school-report-view-btn"
                  onClick={(event) => {
                    event.stopPropagation();
                    viewReport(item);
                  }}
                >
                  <UiIcon name="file" /> {language === "en" ? "View / Print" : "Consulter / Imprimer"}
                </button>
              </article>
            ))}
          </div>
        ) : (
          <SchoolEmptyState icon="file" title={copy.history} hint={copy.empty} />
        )}
      </div>
    </section>
  );
}
