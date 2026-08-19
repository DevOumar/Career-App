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
        empty: "No report generated yet."
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
        empty: "Aucun rapport généré pour le moment."
      };
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  function reload() {
    getSchoolReports(user.id).then(setData).catch((err) => setError(getFriendlyErrorMessage(err, language)));
  }

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.id]);

  async function generate(period) {
    setBusy(period);
    try {
      await generateSchoolReport(user.id, period);
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
              <article key={item.id} className="school-report-row">
                <div>
                  <strong>{item.title}</strong>
                  <span className="muted">{formatDate(item.createdAt)} · {item.period}</span>
                </div>
                <span className="tag">{item.payload?.avgScore != null ? `${item.payload.avgScore}%` : "—"}</span>
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
