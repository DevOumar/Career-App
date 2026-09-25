import React, { useEffect, useState } from "react";
// Admin › Accueil › Indicateurs investisseurs : rétention, revenu récurrent,
// économie de l'IA et placement, calculés par GET /api/admin/investor-metrics
// à partir des données réellement enregistrées (aucun chiffre inventé).
import { getFriendlyErrorMessage } from "../../../lib/errors.js";
import { formatDateTime } from "../../../lib/format.js";
import { getAdminInvestorMetrics } from "../../../lib/inMemoryDb.js";
import { AdminLineIcon, JyBarChart } from "../AdminApp.jsx";

export default function AdminInvestorMetrics({ user, language, currency = "EUR" }) {
  const t = (fr, en) => (language === "en" ? en : fr);
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    getAdminInvestorMetrics(user.id)
      .then(setData)
      .catch((err) => setError(getFriendlyErrorMessage(err, language)));
  }, [user.id, language]);

  const locale = language === "en" ? "en-GB" : "fr-FR";
  const money = (value, digits = 0) =>
    new Intl.NumberFormat(locale, { style: "currency", currency: currency || "EUR", minimumFractionDigits: digits, maximumFractionDigits: digits }).format(Number(value || 0));
  const pct = (value) => (value == null ? "-" : `${new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(value)} %`);
  const monthLabel = (key) => {
    const [year, month] = key.split("-").map(Number);
    return new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" }).format(new Date(Date.UTC(year, month - 1, 1)));
  };

  if (error) {
    return (
      <div className="jy-card">
        <p className="field-error">{error}</p>
      </div>
    );
  }
  if (!data) {
    return (
      <div className="jy-card jy-investor-loading">
        <span className="btn-spinner dark" />
        <span>{t("Calcul des indicateurs investisseurs…", "Computing investor metrics…")}</span>
      </div>
    );
  }

  const { usage, revenue, unitEconomics: unit, placement } = data;
  const growthTone = revenue.mrrGrowth == null ? "" : revenue.mrrGrowth >= 0 ? "up" : "down";
  const tiles = [
    {
      key: "mrr",
      icon: "finance",
      tone: "green",
      value: money(revenue.mrr),
      label: t("Revenu récurrent mensuel (MRR)", "Monthly recurring revenue (MRR)"),
      hint:
        revenue.mrrGrowth == null
          ? t(`${revenue.payingCustomers} client(s) payant(s)`, `${revenue.payingCustomers} paying customer(s)`)
          : t(`${revenue.mrrGrowth >= 0 ? "+" : ""}${pct(revenue.mrrGrowth)} vs fin du mois dernier`, `${revenue.mrrGrowth >= 0 ? "+" : ""}${pct(revenue.mrrGrowth)} vs last month-end`),
      hintTone: growthTone
    },
    {
      key: "arr",
      icon: "trend",
      tone: "gold",
      value: money(revenue.arr),
      label: t("Revenu récurrent annuel (ARR)", "Annual recurring revenue (ARR)"),
      hint: t(`MRR × 12 · ${money(revenue.arpa || 0, 2)} par client`, `MRR × 12 · ${money(revenue.arpa || 0, 2)} per customer`)
    },
    {
      key: "retention",
      icon: "reset",
      tone: "blue",
      value: pct(usage.retention30),
      label: t("Rétention à 30 jours", "30-day retention"),
      hint: t(`${usage.matureActive} / ${usage.matureUsers} comptes de plus de 30 j encore actifs`, `${usage.matureActive} / ${usage.matureUsers} accounts older than 30 d still active`)
    },
    {
      key: "mau",
      icon: "accounts",
      tone: "green",
      value: usage.mau,
      label: t("Utilisateurs actifs (30 j)", "Active users (30 d)"),
      hint: t(`${usage.wau} sur 7 j · ${usage.dau} aujourd'hui · engagement ${pct(usage.stickiness)}`, `${usage.wau} in 7 d · ${usage.dau} today · stickiness ${pct(usage.stickiness)}`)
    }
  ];

  const segments = [
    { key: "school", label: t("Écoles", "Schools"), value: revenue.mrrBySegment.school || 0 },
    { key: "agency", label: t("Cabinets", "Firms"), value: revenue.mrrBySegment.agency || 0 },
    { key: "candidate", label: t("Candidats", "Candidates"), value: revenue.mrrBySegment.candidate || 0 }
  ];
  const segmentMax = Math.max(...segments.map((item) => item.value), 0);
  const cellTone = (value) => (value == null ? "empty" : value >= 60 ? "high" : value >= 30 ? "mid" : value > 0 ? "low" : "zero");
  const offerRate = placement.applications ? Math.round((placement.applicationOffers / placement.applications) * 1000) / 10 : null;

  return (
    <div className="jy-card jy-investor">
      <div className="jy-card-head">
        <div>
          <h3>{t("Indicateurs investisseurs", "Investor metrics")}</h3>
          <p className="jy-card-sub">
            {t("Calculés à partir des données réelles de la plateforme, comptes administrateurs exclus.", "Computed from the platform's real data, admin accounts excluded.")} {t("Mis à jour le", "Updated")} {formatDateTime(data.generatedAt, language)}
          </p>
        </div>
      </div>

      <div className="jy-impact jy-investor-tiles">
        {tiles.map((tile) => (
          <div key={tile.key} className="jy-impact-tile">
            <span className={`jy-impact-icon ${tile.tone}`}>
              <AdminLineIcon name={tile.icon} />
            </span>
            <strong>{tile.value}</strong>
            <span className="jy-impact-label">{tile.label}</span>
            <small className={tile.hintTone ? `jy-trend-${tile.hintTone}` : ""}>{tile.hint}</small>
          </div>
        ))}
      </div>

      <div className="jy-grid-2 jy-investor-grid">
        <section className="jy-investor-block">
          <p className="jy-funnel-title">{t("Évolution du revenu récurrent (MRR, fin de mois)", "Recurring revenue trend (MRR, month-end)")}</p>
          {revenue.mrrTrend.some((point) => point.mrr > 0) ? (
            <JyBarChart trend={revenue.mrrTrend} language={language} series={[{ key: "mrr", label: "MRR", tone: "green" }]} formatValue={(value) => money(value)} />
          ) : (
            <p className="jy-empty">{t("Aucun abonnement payant en cours sur les 6 derniers mois.", "No active paid subscription over the last 6 months.")}</p>
          )}
          <p className="jy-funnel-title">{t("MRR par segment", "MRR by segment")}</p>
          <ul className="jy-skill-bars">
            {segments.map((item) => (
              <li key={item.key}>
                <span>{item.label}</span>
                <span className="jy-skill-track">
                  <span style={{ width: `${segmentMax ? (item.value / segmentMax) * 100 : 0}%` }} />
                </span>
                <strong>{money(item.value)}</strong>
              </li>
            ))}
          </ul>
        </section>

        <section className="jy-investor-block">
          <p className="jy-funnel-title">{t("Rétention par mois d'inscription (part encore active)", "Retention by signup month (share still active)")}</p>
          <div className="jy-cohort-wrap">
            <table className="jy-cohort">
              <thead>
                <tr>
                  <th>{t("Inscrits en", "Signed up in")}</th>
                  <th>{t("Comptes", "Accounts")}</th>
                  <th>{t("M+1", "M+1")}</th>
                  <th>{t("M+2", "M+2")}</th>
                  <th>{t("M+3", "M+3")}</th>
                </tr>
              </thead>
              <tbody>
                {usage.cohorts.map((cohort) => (
                  <tr key={cohort.month}>
                    <td className="jy-cohort-month">{monthLabel(cohort.month)}</td>
                    <td>{cohort.size}</td>
                    {cohort.retention.map((value, index) => (
                      <td key={index}>
                        <span className={`jy-cohort-cell ${cohort.size ? cellTone(value) : "empty"}`}>{cohort.size && value != null ? `${value} %` : "·"}</span>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <small className="jy-investor-note">
            {t(
              "Actif = au moins une connexion ou une action (CV, analyse, candidature, lettre, entretien…) dans le mois. « · » : mois pas encore écoulé ou aucun inscrit.",
              "Active = at least one sign-in or action (CV, analysis, application, letter, interview…) in the month. “·”: month not reached yet or no signup."
            )}
          </small>
        </section>
      </div>

      <div className="jy-grid-2 jy-investor-grid">
        <section className="jy-investor-block">
          <p className="jy-funnel-title">{t("Économie de l'IA (30 derniers jours)", "AI unit economics (last 30 days)")}</p>
          <div className="jy-investor-kv">
            <span>
              <small>{t("Appels IA", "AI calls")}</small>
              <strong>{new Intl.NumberFormat(locale).format(unit.aiCalls30)}</strong>
            </span>
            <span>
              <small>{t("Coût IA mesuré", "Measured AI cost")}</small>
              <strong>{unit.aiCost30 == null ? "-" : money(unit.aiCost30, 2)}</strong>
            </span>
            <span>
              <small>{t("Coût IA par utilisateur actif", "AI cost per active user")}</small>
              <strong>{unit.aiCostPerActiveUser == null ? "-" : money(unit.aiCostPerActiveUser, 3)}</strong>
            </span>
            <span>
              <small>{t("Revenu par utilisateur actif", "Revenue per active user")}</small>
              <strong className="green">{unit.revenuePerActiveUser == null ? "-" : money(unit.revenuePerActiveUser, 2)}</strong>
            </span>
            <span>
              <small>{t("Part du CA consommée par l'IA", "Share of revenue spent on AI")}</small>
              <strong>{pct(unit.aiCostShareOfRevenue)}</strong>
            </span>
            <span>
              <small>{t("CA encaissé (30 j)", "Revenue collected (30 d)")}</small>
              <strong>{money(revenue.revenueLast30, 2)}</strong>
            </span>
          </div>
          <small className="jy-investor-note">
            {unit.measuredSince
              ? t(
                  `Mesure réelle : tokens renvoyés par le fournisseur à chaque appel × son tarif public, convertis au taux BCE du ${unit.fxDate ? new Date(unit.fxDate).toLocaleDateString("fr-FR") : "-"}. Mesuré depuis le ${new Date(unit.measuredSince).toLocaleDateString("fr-FR")}.`,
                  `Real measurement: tokens returned by the provider on each call × its public rate, converted at the ECB rate of ${unit.fxDate || "-"}. Measured since ${new Date(unit.measuredSince).toLocaleDateString("en-GB")}.`
                )
              : t("Le coût IA est mesuré à chaque appel à partir des tokens renvoyés par le fournisseur : il apparaîtra dès les premiers appels.", "AI cost is measured on each call from the tokens returned by the provider: it will appear with the first calls.")}
          </small>
        </section>

        <section className="jy-investor-block">
          <p className="jy-funnel-title">{t("Placement et accès à l'emploi", "Placement and job access")}</p>
          <div className="jy-investor-kv">
            <span>
              <small>{t("Taux de placement (cabinets)", "Placement rate (firms)")}</small>
              <strong className="green">{pct(placement.placementRate)}</strong>
            </span>
            <span>
              <small>{t("Candidats placés", "Candidates placed")}</small>
              <strong>
                {placement.placed} / {placement.candidates}
              </strong>
            </span>
            <span>
              <small>{t("Missions clôturées", "Missions closed")}</small>
              <strong>
                {placement.missionsClosed} / {placement.missions}
              </strong>
            </span>
            <span>
              <small>{t("Honoraires facturés par les cabinets", "Fees billed by firms")}</small>
              <strong>{money(placement.fees)}</strong>
            </span>
            <span>
              <small>{t("Candidatures suivies (candidats)", "Tracked applications (candidates)")}</small>
              <strong>{placement.applications}</strong>
            </span>
            <span>
              <small>{t("Entretiens · offres obtenues", "Interviews · offers received")}</small>
              <strong>
                {placement.applicationInterviews} · {placement.applicationOffers}
                {offerRate != null ? <em> ({pct(offerRate)})</em> : null}
              </strong>
            </span>
          </div>
          <small className="jy-investor-note">
            {t(
              "Taux de placement : candidats au statut « Placé » sur l'ensemble des viviers des cabinets. Offres : candidatures suivies par les candidats au statut « Offre ».",
              "Placement rate: candidates at the “Placed” stage across all firm pools. Offers: candidate-tracked applications at the “Offer” stage."
            )}
          </small>
        </section>
      </div>
    </div>
  );
}
