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
import { AdminLineIcon, AdminTrendChart, AdminDonutChart, AdminPagination, AdminOrgCard, AdminMiniMetric, formatEur, planPriceLabel, getPaginationRange, eventTypeLabel, adminNotificationText, getAllowedAdminModules, ADMIN_MODULE_DEFS, ADMIN_MODULE_LABELS, ADMIN_DASHBOARD_ROLES, ADMIN_ACCOUNT_SUBTABS, ADMIN_PAGE_SIZE, ADMIN_FINANCE_SOURCES, ADMIN_EVENT_LABELS, ADMIN_ANNOUNCEMENT_AUDIENCES } from "../AdminApp.jsx";

export default function AdminSettingsPage({ user, language }) {
  const copy =
    language === "en"
      ? {
          title: "Platform settings",
          subtitle: "Switches for optional integrations. No .env change or restart needed.",
          google: "Google Sign-In",
          googleText: "Lets candidates sign in/up with their Google account.",
          stripe: "Stripe payments",
          stripeText: "Lets users pay for a plan with a real Stripe Checkout session.",
          enabled: "Enabled",
          disabled: "Disabled",
          notConfigured: "Not configured in .env: this switch has no effect",
          toggle: "Toggle"
        }
      : {
          title: "Paramètres plateforme",
          subtitle: "Interrupteurs des intégrations optionnelles. Aucun changement de .env ni redémarrage nécessaire.",
          google: "Connexion Google",
          googleText: "Permet aux candidats de se connecter/inscrire avec leur compte Google.",
          stripe: "Paiement Stripe",
          stripeText: "Permet aux utilisateurs de payer un plan via une vraie session Stripe Checkout.",
          enabled: "Activé",
          disabled: "Désactivé",
          notConfigured: "Non configuré dans .env : cet interrupteur n'a aucun effet",
          toggle: "Basculer"
        };

  const [settings, setSettings] = useState(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState("");

  useEffect(() => {
    getAdminSettings(user.id).then(setSettings).catch((err) => setError(getFriendlyErrorMessage(err, language)));
  }, [user.id]);

  // Conséquences affichées avant de basculer un interrupteur (confirmation
  // obligatoire, comme dans Jurysia) : l'effet est immédiat pour tous.
  const TOGGLE_WARNINGS = {
    google_signin_enabled: {
      on: {
        fr: "Les utilisateurs pourront à nouveau se connecter et s'inscrire avec leur compte Google.",
        en: "Users will be able to sign in and sign up with their Google account again."
      },
      off: {
        fr: "Le bouton « Continuer avec Google » disparaîtra immédiatement. Les utilisateurs inscrits via Google devront passer par un code e-mail ou un mot de passe.",
        en: "The \"Continue with Google\" button will disappear immediately. Users who signed up with Google will have to use an email code or a password."
      }
    },
    stripe_enabled: {
      on: {
        fr: "Les utilisateurs pourront payer leurs abonnements par carte via Stripe Checkout. Vérifiez que vos clés Stripe de production sont bien configurées.",
        en: "Users will be able to pay for plans by card via Stripe Checkout. Make sure your live Stripe keys are configured."
      },
      off: {
        fr: "Plus aucun paiement ne pourra être encaissé : les boutons de paiement seront désactivés pour tous les utilisateurs. Les abonnements en cours ne sont pas modifiés.",
        en: "No payment can be collected anymore: payment buttons will be disabled for every user. Current subscriptions are not changed."
      }
    }
  };

  async function toggle(key, currentValue) {
    const turningOn = !currentValue;
    const name = key === "stripe_enabled" ? copy.stripe : copy.google;
    const warning = TOGGLE_WARNINGS[key]?.[turningOn ? "on" : "off"];
    const result = await Swal.fire({
      icon: turningOn ? "question" : "warning",
      title:
        language === "en"
          ? `${turningOn ? "Enable" : "Disable"} ${name}?`
          : `${turningOn ? "Activer" : "Désactiver"} « ${name} » ?`,
      text: warning?.[language] || warning?.fr,
      showCancelButton: true,
      confirmButtonText: language === "en" ? (turningOn ? "Enable" : "Disable") : turningOn ? "Activer" : "Désactiver",
      cancelButtonText: language === "en" ? "Cancel" : "Annuler",
      confirmButtonColor: turningOn ? "#b83309" : "#b3261e",
      reverseButtons: true,
      focusCancel: !turningOn
    });
    if (!result.isConfirmed) return;

    setSaving(key);
    try {
      const updated = await updateAdminSetting(user.id, key, turningOn);
      setSettings(updated);
      Swal.fire({
        toast: true,
        position: "top-end",
        icon: "success",
        title:
          language === "en"
            ? `${name} ${turningOn ? "enabled" : "disabled"}.`
            : `« ${name} » ${turningOn ? "activé" : "désactivé"}.`,
        showConfirmButton: false,
        timer: 2600,
        timerProgressBar: true,
        customClass: { popup: "career-toast", title: "career-toast-title" }
      });
    } catch (err) {
      setError(getFriendlyErrorMessage(err, language));
    } finally {
      setSaving("");
    }
  }

  if (error) return <p className="field-error">{error}</p>;
  if (!settings) return <AdminPageLoader language={language} />;

  return (
    <section className="admin-settings">
      <header className="module-header">
        <h2>{copy.title}</h2>
        <p>{copy.subtitle}</p>
      </header>

      <div className="jy-settings-list">
        {[
          {
            key: "google_signin_enabled",
            icon: "accounts",
            title: copy.google,
            text: copy.googleText,
            enabled: settings.googleSignInEnabled,
            configured: settings.googleConfigured
          },
          {
            key: "stripe_enabled",
            icon: "finance",
            title: copy.stripe,
            text: copy.stripeText,
            enabled: settings.stripeEnabled,
            configured: settings.stripeConfigured
          }
        ].map((item) => (
          <div key={item.key} className="admin-panel admin-settings-card jy-setting">
            <span className="jy-stat-icon green">
              <AdminLineIcon name={item.icon} />
            </span>
            <div className="jy-setting-body">
              <div className="jy-setting-title">
                <h3>{item.title}</h3>
                <span className={`tag ${item.enabled ? "tag-success" : "tag-danger"}`}>
                  {item.enabled ? copy.enabled : copy.disabled}
                </span>
              </div>
              <p className="muted">{item.text}</p>
              {!item.configured ? <p className="admin-settings-warning">{copy.notConfigured}</p> : null}
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={Boolean(item.enabled)}
              aria-label={`${copy.toggle} · ${item.title}`}
              className={`jy-switch ${item.enabled ? "on" : ""}`}
              disabled={saving === item.key}
              onClick={() => toggle(item.key, item.enabled)}
            >
              <span />
            </button>
          </div>
        ))}
      </div>

    </section>
  );
}
