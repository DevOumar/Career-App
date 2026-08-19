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

export default function AdminSettingsPage({ user, language }) {
  const copy =
    language === "en"
      ? {
          title: "Platform settings",
          subtitle: "Kill-switches for optional integrations — no .env change or restart needed.",
          google: "Google Sign-In",
          googleText: "Lets candidates sign in/up with their Google account.",
          stripe: "Stripe payments",
          stripeText: "Lets users pay for a plan with a real Stripe Checkout session.",
          enabled: "Enabled",
          disabled: "Disabled",
          notConfigured: "Not configured in .env — toggle has no effect",
          toggle: "Toggle"
        }
      : {
          title: "Paramètres plateforme",
          subtitle: "Interrupteurs pour les intégrations optionnelles — aucun changement de .env ni redémarrage nécessaire.",
          google: "Connexion Google",
          googleText: "Permet aux candidats de se connecter/inscrire avec leur compte Google.",
          stripe: "Paiement Stripe",
          stripeText: "Permet aux utilisateurs de payer un plan via une vraie session Stripe Checkout.",
          enabled: "Activé",
          disabled: "Désactivé",
          notConfigured: "Non configuré dans .env — le bouton n'a aucun effet",
          toggle: "Basculer"
        };

  const [settings, setSettings] = useState(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState("");

  useEffect(() => {
    getAdminSettings(user.id).then(setSettings).catch((err) => setError(getFriendlyErrorMessage(err, language)));
  }, [user.id]);

  async function toggle(key, currentValue) {
    setSaving(key);
    try {
      const updated = await updateAdminSetting(user.id, key, !currentValue);
      setSettings(updated);
    } catch (err) {
      setError(getFriendlyErrorMessage(err, language));
    } finally {
      setSaving("");
    }
  }

  if (error) return <p className="field-error">{error}</p>;
  if (!settings) return <p className="muted">…</p>;

  return (
    <section className="admin-settings">
      <header className="module-header">
        <h2>{copy.title}</h2>
        <p>{copy.subtitle}</p>
      </header>

      <div className="admin-panel-grid">
        <div className="admin-panel admin-settings-card">
          <div className="admin-settings-card-head">
            <h3>{copy.google}</h3>
            <span className={`tag ${settings.googleSignInEnabled ? "tag-success" : "tag-danger"}`}>
              {settings.googleSignInEnabled ? copy.enabled : copy.disabled}
            </span>
          </div>
          <p className="muted">{copy.googleText}</p>
          {!settings.googleConfigured ? <p className="admin-settings-warning">{copy.notConfigured}</p> : null}
          <button
            type="button"
            className="btn-ghost"
            disabled={saving === "google_signin_enabled"}
            onClick={() => toggle("google_signin_enabled", settings.googleSignInEnabled)}
          >
            {copy.toggle}
          </button>
        </div>

        <div className="admin-panel admin-settings-card">
          <div className="admin-settings-card-head">
            <h3>{copy.stripe}</h3>
            <span className={`tag ${settings.stripeEnabled ? "tag-success" : "tag-danger"}`}>
              {settings.stripeEnabled ? copy.enabled : copy.disabled}
            </span>
          </div>
          <p className="muted">{copy.stripeText}</p>
          {!settings.stripeConfigured ? <p className="admin-settings-warning">{copy.notConfigured}</p> : null}
          <button
            type="button"
            className="btn-ghost"
            disabled={saving === "stripe_enabled"}
            onClick={() => toggle("stripe_enabled", settings.stripeEnabled)}
          >
            {copy.toggle}
          </button>
        </div>
      </div>

    </section>
  );
}
