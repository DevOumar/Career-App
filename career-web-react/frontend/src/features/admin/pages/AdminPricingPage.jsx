import React from "react";
// Module Admin : interface d'administration de la plateforme (dashboard,
// comptes, finance, licences, modération IA, paramètres, annonces...).
// Le dashboard École vit désormais séparément dans features/school/ ; les
// deux modules continuent de partager quelques composants (AdminKpiCard,
// AdminTrendChart, AdminPagination...) exportés d'ici et importés par
// features/school/SchoolApp.jsx.
//
// NOTE : ce fichier reste volumineux (déplacement mécanique depuis App.jsx,
// pas une réécriture) — un découpage en un fichier par page admin est une
// suite possible, pas un prérequis pour que ce module soit isolé du reste
// de l'app.
import { useState, useEffect, useRef } from "react";
import Swal from "sweetalert2";
import { UiIcon } from "../../../components/UiIcon.jsx";
import { AdminPageLoader } from "../../../components/AdminPageLoader.jsx";
import { AdminKpiCard } from "../../../components/AdminKpiCard.jsx";
import { AdminExportCsvButton } from "../../../components/AdminExportCsvButton.jsx";
import { AvatarCircle } from "../../../components/AvatarCircle.jsx";
import { LanguageSwitch } from "../../../components/LanguageSwitch.jsx";
// AccountDrawer/ConnectedFooter restent définis dans App.jsx (composants
// d'app-shell partagés avec le candidat) — import "arrière" volontaire, sûr
// ici car ces composants ne sont utilisés qu'au rendu (jamais à
// l'évaluation du module), bien après la résolution du cycle ESM.
import AccountDrawer from "../../account/AccountDrawer.jsx";
import { ConnectedFooter, ADMIN_ACCOUNT_TYPES } from "../../../App.jsx";
import { PLANS, PLAN_SEGMENTS, getPlanById } from "../../../data/plans.js";
import { getFriendlyErrorMessage } from "../../../lib/errors.js";
import { formatDate, formatShortDate, formatAmountInCurrency, formatPlanPrice } from "../../../lib/format.js";
import { fileToBase64 } from "../../../lib/cvService.js";
import { getAccountLabel } from "../../../lib/accounts.js";
import { satisfactionTierFor } from "../../satisfaction/SatisfactionSurveyModal.jsx";
import {
  createAdminUser,
  deleteAdminUser,
  getAdminActivityLog,
  getAdminAiMonitoring,
  getAdminAiSamples,
  getAdminCvs,
  getAdminFinance,
  getAdminLicenseCodes,
  getAdminMatches,
  getAdminOrgAccounts,
  getAdminOverview,
  getAdminNotifications,
  getAdminQuality,
  getPlanOverrides,
  getAdminPlans,
  updateAdminPlan,
  resetAdminPlan,
  refundAdminTransaction,
  getAdminSettings,
  revokeAdminLicenseCode,
  restoreAdminLicenseCode,
  getAdminAnnouncementAudienceCount,
  getAdminAnnouncements,
  sendAdminAnnouncement,
  deleteAdminCv,
  reanalyzeAdminCv,
  updateAdminSetting,
  updateAdminUser,
  updateAdminUserStatus,
  listAdminUsers,
  getAdminSatisfaction,
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
import { AdminTrendChart, AdminDonutChart, AdminPagination, AdminOrgCard, AdminMiniMetric, formatEur, planPriceLabel, getPaginationRange, eventTypeLabel, adminNotificationText, getAllowedAdminModules, ADMIN_MODULE_DEFS, ADMIN_MODULE_LABELS, ADMIN_DASHBOARD_ROLES, ADMIN_ACCOUNT_SUBTABS, ADMIN_PAGE_SIZE, ADMIN_FINANCE_SOURCES, ADMIN_EVENT_LABELS, ADMIN_ANNOUNCEMENT_AUDIENCES } from "../AdminApp.jsx";

export default function AdminPricingPage({ user, language, currency = "EUR" }) {
  const copy =
    language === "en"
      ? {
          title: "Pricing",
          subtitle: "Plans currently in effect — prices can be edited here.",
          edit: "Edit",
          save: "Save",
          saving: "Saving…",
          cancel: "Cancel",
          reset: "Reset to default",
          features: "Included",
          monthlyLabel: "Monthly",
          annualLabel: "Annual",
          monthly: "Monthly price (€)",
          annual: "Annual price (€)",
          singlePrice: "Price (€)",
          customBadge: "Custom price",
          confirmStripeTitle: "Changing this price creates a new Stripe price",
          confirmStripeText:
            "Stripe prices can't be edited in place — a new one will be created and used from now on for checkout. Existing subscribers keep their current price until they change plans.",
          confirmBtn: "Confirm",
          segmentCandidate: "Candidate / Student",
          segmentAgency: "Recruitment firm / Consulting",
          segmentSchool: "School / Institution",
          perYear: "/ year"
        }
      : {
          title: "Tarifs",
          subtitle: "Grilles tarifaires en vigueur — les prix sont modifiables ici.",
          edit: "Modifier",
          save: "Enregistrer",
          saving: "Enregistrement…",
          cancel: "Annuler",
          reset: "Réinitialiser au tarif par défaut",
          features: "Inclus",
          monthlyLabel: "Mensuel",
          annualLabel: "Annuel",
          monthly: "Prix mensuel (€)",
          annual: "Prix annuel (€)",
          singlePrice: "Prix (€)",
          customBadge: "Tarif personnalisé",
          confirmStripeTitle: "Modifier ce tarif crée un nouveau prix Stripe",
          confirmStripeText:
            "Les tarifs Stripe ne peuvent pas être modifiés sur place — un nouveau sera créé et utilisé désormais pour le paiement. Les abonnés existants gardent leur tarif actuel tant qu'ils ne changent pas de plan.",
          confirmBtn: "Confirmer",
          segmentCandidate: "Candidat / Étudiant",
          segmentAgency: "Cabinet de recrutement / Conseil",
          segmentSchool: "École / Établissement",
          perYear: "/ an"
        };

  const [overrides, setOverrides] = useState({});
  const [loaded, setLoaded] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ monthlyPrice: "", annualPrice: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function load() {
    getAdminPlans(user.id)
      .then((items) => {
        setOverrides(Object.fromEntries(items.map((item) => [item.id, item])));
        setLoaded(true);
      })
      .catch((err) => setError(getFriendlyErrorMessage(err, language)));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.id]);

  function startEdit(plan, effective) {
    setEditingId(plan.id);
    setError("");
    setForm({
      monthlyPrice: effective.isSinglePrice ? "" : String(effective.monthlyPrice ?? ""),
      annualPrice: String(effective.annualPrice ?? "")
    });
  }

  async function saveEdit(plan, effective) {
    if (plan.grantsPremium) {
      const result = await Swal.fire({
        icon: "warning",
        title: copy.confirmStripeTitle,
        text: copy.confirmStripeText,
        showCancelButton: true,
        confirmButtonText: copy.confirmBtn,
        cancelButtonText: copy.cancel
      });
      if (!result.isConfirmed) return;
    }
    setSaving(true);
    setError("");
    try {
      await updateAdminPlan({
        adminUserId: user.id,
        planId: plan.id,
        monthlyPrice: effective.isSinglePrice ? null : Number(form.monthlyPrice),
        annualPrice: Number(form.annualPrice)
      });
      setEditingId(null);
      load();
    } catch (err) {
      setError(getFriendlyErrorMessage(err, language));
    } finally {
      setSaving(false);
    }
  }

  async function resetPlan(plan) {
    setSaving(true);
    setError("");
    try {
      await resetAdminPlan({ adminUserId: user.id, planId: plan.id });
      setEditingId(null);
      load();
    } catch (err) {
      setError(getFriendlyErrorMessage(err, language));
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="admin-pricing">
      <header className="module-header">
        <h2>{copy.title}</h2>
        <p>{copy.subtitle}</p>
      </header>

      {error ? <p className="field-error">{error}</p> : null}

      {PLAN_SEGMENTS.map((segment) => (
        <div key={segment} className="admin-pricing-segment">
          <h3>
            {segment === "candidate"
              ? copy.segmentCandidate
              : segment === "agency"
              ? copy.segmentAgency
              : copy.segmentSchool}
          </h3>
          <div className="admin-pricing-grid">
            {PLANS.filter((plan) => plan.segment === segment).map((plan) => {
              const effective = overrides[plan.id] || {
                monthlyPrice: plan.monthlyPrice,
                annualPrice: plan.annualPrice,
                isSinglePrice: plan.monthlyPrice == null,
                overridden: false
              };
              const price = formatPlanPrice(
                { ...plan, monthlyPrice: effective.monthlyPrice, annualPrice: effective.annualPrice },
                "monthly",
                language,
                  currency
              );
              const isEditing = editingId === plan.id;
              return (
                <article key={plan.id} className={`admin-pricing-card ${plan.highlighted ? "recommended" : ""}`}>
                  <div className="admin-pricing-card-head">
                    <div>
                      <div className="admin-pricing-badges">
                        {plan.badge ? <span>{plan.badge[language] || plan.badge.fr}</span> : null}
                        {effective.overridden ? <span className="is-custom">{copy.customBadge}</span> : null}
                      </div>
                      <h4>{plan.name[language] || plan.name.fr}</h4>
                      <p>{plan.tagline[language] || plan.tagline.fr}</p>
                    </div>
                    <span className="admin-pricing-icon">
                      <UiIcon name={plan.grantsPremium ? "pricetag" : "shield"} />
                    </span>
                  </div>
                  {isEditing ? (
                    <div className="admin-pricing-edit-form">
                      {!effective.isSinglePrice ? (
                        <label>
                          {copy.monthly}
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={form.monthlyPrice}
                            onChange={(event) => setForm((prev) => ({ ...prev, monthlyPrice: event.target.value }))}
                          />
                        </label>
                      ) : null}
                      <label>
                        {effective.isSinglePrice ? copy.singlePrice : copy.annual}
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={form.annualPrice}
                          onChange={(event) => setForm((prev) => ({ ...prev, annualPrice: event.target.value }))}
                        />
                      </label>
                      <div className="admin-pricing-edit-actions">
                        <button type="button" className="btn-ghost" onClick={() => setEditingId(null)} disabled={saving}>
                          {copy.cancel}
                        </button>
                        <button type="button" className="btn-main" onClick={() => saveEdit(plan, effective)} disabled={saving}>
                          {saving ? <span className="btn-spinner" /> : null} {saving ? copy.saving : copy.save}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="admin-pricing-price-row">
                        <div className="admin-pricing-price">
                          <span>{effective.isSinglePrice ? copy.singlePrice : copy.monthlyLabel}</span>
                          <strong>{price.amount}</strong>
                          <small>{price.unit}</small>
                        </div>
                        {!effective.isSinglePrice ? (
                          <div className="admin-pricing-price is-secondary">
                            <span>{copy.annualLabel}</span>
                            <strong>{formatEur(effective.annualPrice, currency)}</strong>
                            <small>{copy.perYear}</small>
                          </div>
                        ) : null}
                      </div>
                      <div className="admin-pricing-features-title">{copy.features}</div>
                      <ul className="admin-pricing-feature-list">
                        {(plan.features[language] || plan.features.fr).map((feature) => (
                          <li key={feature}>{feature}</li>
                        ))}
                      </ul>
                      <div className="admin-pricing-edit-actions">
                        <button type="button" className="btn-ghost" onClick={() => startEdit(plan, effective)} disabled={!loaded}>
                          <UiIcon name="edit" /> {copy.edit}
                        </button>
                        {effective.overridden ? (
                          <button type="button" className="btn-ghost" onClick={() => resetPlan(plan)} disabled={saving}>
                            {copy.reset}
                          </button>
                        ) : null}
                      </div>
                    </>
                  )}
                </article>
              );
            })}
          </div>
        </div>
      ))}
    </section>
  );
}
