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
import { formatDate, formatDateTime, formatShortDate, formatAmountInCurrency, formatPlanPrice } from "../../../lib/format.js";
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
import { AdminLineIcon, JyDrawer, AdminTrendChart, AdminDonutChart, AdminPagination, AdminOrgCard, AdminMiniMetric, formatEur, planPriceLabel, getPaginationRange, eventTypeLabel, adminNotificationText, getAllowedAdminModules, ADMIN_MODULE_DEFS, ADMIN_MODULE_LABELS, ADMIN_DASHBOARD_ROLES, ADMIN_ACCOUNT_SUBTABS, ADMIN_PAGE_SIZE, ADMIN_FINANCE_SOURCES, ADMIN_EVENT_LABELS, ADMIN_ANNOUNCEMENT_AUDIENCES } from "../AdminApp.jsx";

// Identifiants internes (UUID de CV, d'utilisateur, de promotion…) : utiles
// en base, illisibles pour un humain — on ne les affiche pas.
const HIDDEN_METADATA_KEYS = new Set([
  "cvId",
  "targetUserId",
  "userId",
  "transactionId",
  "promotionId",
  "studentId",
  "candidateId",
  "eventId",
  "reportId"
]);

const SETTING_LABELS = {
  google_signin_enabled: { fr: "Connexion Google", en: "Google sign-in" },
  stripe_enabled: { fr: "Paiement Stripe", en: "Stripe payments" }
};

// Traduit les métadonnées brutes d'un événement ({"method":"google"}…) en
// petites phrases lisibles : [{ icon, text }].
function describeActivity(item, language, currency) {
  const t = (fr, en) => (language === "en" ? en : fr);
  const meta = item.metadata || {};
  const parts = [];
  const add = (icon, text) => text && parts.push({ icon, text });
  // plural(n, ["tentative échouée", "tentatives échouées"], ["failed attempt", "failed attempts"])
  const plural = (count, fr, en) => `${count} ${(language === "en" ? en : fr)[Number(count) > 1 ? 1 : 0]}`;
  const planLabel = (planId) => getPlanById(planId)?.name?.[language] || getPlanById(planId)?.name?.fr || planId;
  const handled = new Set();
  const use = (...keys) => keys.forEach((key) => handled.add(key));

  if (meta.method) {
    use("method");
    const methods = {
      google: t("Via Google", "Via Google"),
      password: t("Avec mot de passe", "With password"),
      email_code: t("Code reçu par e-mail", "Email code"),
      signup_no_otp: t("À l'inscription", "At signup")
    };
    add("key", methods[meta.method] || meta.method);
  }
  if (meta.provider) {
    use("provider");
    add("link", meta.provider === "google" ? "Google" : meta.provider);
  }
  if (meta.attempts != null) {
    use("attempts");
    add("alert", plural(meta.attempts, ["tentative échouée", "tentatives échouées"], ["failed attempt", "failed attempts"]));
  }
  if (meta.logoutOtherSessions != null) {
    use("logoutOtherSessions");
    add("logout", meta.logoutOtherSessions ? t("Autres sessions déconnectées", "Other sessions signed out") : t("Autres sessions conservées", "Other sessions kept"));
  }
  if (meta.key) {
    use("key", "value");
    const settingName = SETTING_LABELS[meta.key]?.[language] || SETTING_LABELS[meta.key]?.fr || meta.key;
    const state =
      typeof meta.value === "boolean" || meta.value === "true" || meta.value === "false"
        ? String(meta.value) === "true"
          ? t("activé", "enabled")
          : t("désactivé", "disabled")
        : String(meta.value);
    add("settings", `${settingName} : ${state}`);
  }
  if (meta.code) {
    use("code");
    add("licenses", `${t("Code", "Code")} ${meta.code}`);
  }
  if (meta.licenseCode) {
    use("licenseCode");
    add("licenses", `${t("Licence", "License")} ${meta.licenseCode}`);
  }
  if (meta.planId) {
    use("planId");
    add("pricing", `${t("Plan", "Plan")} ${planLabel(meta.planId)}`);
  }
  if (meta.monthlyPrice != null || meta.annualPrice != null) {
    use("monthlyPrice", "annualPrice");
    const prices = [];
    if (meta.monthlyPrice != null) prices.push(`${formatEur(meta.monthlyPrice, currency)} ${t("/ mois", "/ month")}`);
    if (meta.annualPrice != null) prices.push(`${formatEur(meta.annualPrice, currency)} ${t("/ an", "/ year")}`);
    add("finance", prices.join(" · "));
  }
  if (meta.amount != null) {
    use("amount");
    add("finance", `${t("Montant", "Amount")} ${formatEur(meta.amount, currency)}`);
  }
  if (meta.audience) {
    use("audience");
    const audience = ADMIN_ANNOUNCEMENT_AUDIENCES.find((entry) => (entry.id || "all") === meta.audience);
    add("accounts", audience?.label?.[language] || audience?.label?.fr || t("Tous les utilisateurs", "All users"));
  }
  if (meta.recipientCount != null) {
    use("recipientCount", "failedCount");
    const failed = Number(meta.failedCount || 0);
    add(
      "announcements",
      `${plural(meta.recipientCount, ["destinataire", "destinataires"], ["recipient", "recipients"])}${failed ? ` · ${plural(failed, ["échec", "échecs"], ["failure", "failures"])}` : ""}`
    );
  }
  if (meta.sentCount != null) {
    use("sentCount", "skippedExistingCount", "skippedNoSeatCount");
    const bits = [plural(meta.sentCount, ["envoyée", "envoyées"], ["sent", "sent"])];
    if (meta.skippedExistingCount) bits.push(`${meta.skippedExistingCount} ${t("déjà inscrit(s)", "already registered")}`);
    if (meta.skippedNoSeatCount) bits.push(`${meta.skippedNoSeatCount} ${t("sans siège", "without seat")}`);
    add("announcements", bits.join(" · "));
  }
  if (meta.companyName || meta.domain) {
    use("companyName", "domain", "firstName", "lastName");
    const person = [meta.firstName, meta.lastName].filter(Boolean).join(" ");
    const company = meta.companyName || meta.domain;
    add("search", person ? `${person} ${t("chez", "at")} ${company}` : company);
  }
  if (meta.period) {
    use("period");
    add("clock", `${t("Période", "Period")} ${meta.period}`);
  }
  if (meta.email) {
    use("email");
    // L'e-mail est déjà affiché sous le nom de l'acteur : on ne le répète
    // que s'il s'agit d'une autre adresse (invitation, compte supprimé…).
    // (Si l'acteur n'a plus d'e-mail, c'est déjà celui-ci qui s'affiche.)
    if (item.userEmail && meta.email !== item.userEmail) add("announcements", meta.email);
  }

  // Tout autre champ non technique : "Libellé : valeur".
  Object.entries(meta).forEach(([key, value]) => {
    if (handled.has(key) || HIDDEN_METADATA_KEYS.has(key) || value == null || typeof value === "object") return;
    const label = key.replace(/([A-Z])/g, " $1").replace(/_/g, " ").toLowerCase();
    add("chevronRight", `${label.charAt(0).toUpperCase()}${label.slice(1)} : ${value}`);
  });

  return parts;
}

// Couleur de l'étiquette selon la nature de l'événement.
function eventTone(eventType) {
  if (/locked|deleted|removed|revoked|suspended|refunded/.test(eventType)) return "tag-danger";
  if (eventType.startsWith("admin_")) return "tag-warning";
  if (/^(login|signup)_/.test(eventType)) return "tag-success";
  return "";
}

function formatIp(ip, language) {
  if (!ip) return "-";
  if (ip === "127.0.0.1" || ip === "::1" || ip === "::ffff:127.0.0.1") return language === "en" ? "Local machine" : "Poste local";
  return ip.replace(/^::ffff:/, "");
}

// Icône de l'étiquette selon la famille d'événement (comme les pastilles de Jurysia).
function eventIcon(eventType) {
  if (/locked/.test(eventType)) return "alert";
  if (/deleted|removed/.test(eventType)) return "trash";
  if (/revoked|suspended/.test(eventType)) return "quality";
  if (/refunded|transaction|plan_price/.test(eventType)) return "finance";
  if (/announcement|invitation/.test(eventType)) return "announcements";
  if (/setting/.test(eventType)) return "settings";
  if (/license/.test(eventType)) return "licenses";
  if (/password|session/.test(eventType)) return "key";
  if (/^(login|signup)_/.test(eventType)) return "logout";
  if (/cv/.test(eventType)) return "adminCvs";
  if (/email_finder/.test(eventType)) return "search";
  if (/^school_/.test(eventType)) return "schools";
  if (/^cabinet_/.test(eventType)) return "cabinets";
  if (/^admin_/.test(eventType)) return "quality";
  return "activity";
}

export default function AdminActivityLogPage({ user, language, currency = "EUR" }) {
  const copy =
    language === "en"
      ? {
          title: "Activity log",
          subtitle: "Every security-relevant event recorded on the platform: logins, account changes, admin actions.",
          search: "Search by user, email, event or IP…",
          colDate: "Date",
          colUser: "Actor",
          colEvent: "Event",
          colDetails: "Details",
          colIp: "IP address",
          empty: "No event found.",
          allEvents: "All events"
        }
      : {
          title: "Journal d'activité",
          subtitle: "Tous les événements de sécurité enregistrés : connexions, modifications de compte, actions admin.",
          search: "Rechercher par utilisateur, email, événement ou IP…",
          colDate: "Date",
          colUser: "Acteur",
          colEvent: "Événement",
          colDetails: "Détails",
          colIp: "Adresse IP",
          empty: "Aucun événement trouvé.",
          allEvents: "Tous les événements"
        };

  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [eventType, setEventType] = useState("");
  const [page, setPage] = useState(1);
  const [selectedEvent, setSelectedEvent] = useState(null);

  useEffect(() => {
    setPage(1);
    getAdminActivityLog(user.id, { search, eventType })
      .then(setData)
      .catch((err) => setError(getFriendlyErrorMessage(err, language)));
  }, [user.id, search, eventType]);

  if (error) return <p className="field-error">{error}</p>;
  if (!data) return <AdminPageLoader language={language} />;

  const totalPages = Math.max(1, Math.ceil(data.items.length / ADMIN_PAGE_SIZE));
  const pagedItems = data.items.slice((page - 1) * ADMIN_PAGE_SIZE, page * ADMIN_PAGE_SIZE);
  const eventEntries = Object.entries(data.eventTypeCounts || {});
  const countWhere = (test) => eventEntries.reduce((sum, [type, count]) => sum + (test(type) ? Number(count || 0) : 0), 0);
  const statTotal = countWhere(() => true);
  const statLogins = countWhere((type) => /^(login|signup)_/.test(type) && type !== "login_locked");
  const statAdmin = countWhere((type) => type.startsWith("admin_"));
  const statAlerts = countWhere((type) => /locked|deleted|revoked|suspended|refunded/.test(type));

  return (
    <section className="admin-activity">
      <header className="module-header">
        <h2>{copy.title}</h2>
        <p>{copy.subtitle}</p>
      </header>

      <div className="jy-mini-cards">
        {[
          { icon: "activity", label: language === "en" ? "Events" : "Événements", value: statTotal, tone: "" },
          { icon: "logout", label: language === "en" ? "Logins" : "Connexions", value: statLogins, tone: "green" },
          { icon: "quality", label: language === "en" ? "Admin actions" : "Actions admin", value: statAdmin, tone: "gold" },
          { icon: "alert", label: language === "en" ? "Security alerts" : "Alertes sécurité", value: statAlerts, tone: "danger" }
        ].map((card) => (
          <div key={card.label} className="jy-mini-card">
            <span className="jy-mini-card-label">
              <AdminLineIcon name={card.icon} />
              {card.label}
            </span>
            <strong className={card.tone}>{card.value}</strong>
          </div>
        ))}
      </div>

      <div className="admin-table-toolbar">
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={copy.search} />
      </div>

      <div className="admin-subtabs">
        <button type="button" className={`admin-subtab ${eventType === "" ? "active" : ""}`} onClick={() => setEventType("")}>
          <span>{copy.allEvents}</span>
          <strong>{data.items.length}</strong>
        </button>
        {eventEntries.map(([type, count]) => (
          <button
            key={type}
            type="button"
            className={`admin-subtab ${eventType === type ? "active" : ""}`}
            onClick={() => setEventType(type)}
          >
            <span>{eventTypeLabel(type, language)}</span>
            <strong>{count}</strong>
          </button>
        ))}
      </div>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>{copy.colDate}</th>
              <th>{copy.colUser}</th>
              <th>{copy.colEvent}</th>
              <th>{copy.colDetails}</th>
              <th>{copy.colIp}</th>
            </tr>
          </thead>
          <tbody>
            {pagedItems.length ? (
              pagedItems.map((item) => {
                const actorName = `${item.userFirstName || ""} ${item.userLastName || ""}`.trim();
                const details = describeActivity(item, language, currency);
                return (
                  <tr
                    key={item.id}
                    className={`jy-row-click ${selectedEvent?.id === item.id ? "is-selected" : ""}`}
                    onClick={() => setSelectedEvent(item)}
                  >
                    <td className="muted jy-nowrap">{formatDateTime(item.createdAt, language)}</td>
                    <td>
                      <div className="admin-table-name">
                        {actorName || item.userAvatarDataUrl ? (
                          <AvatarCircle
                            user={{ firstName: item.userFirstName, lastName: item.userLastName, avatarDataUrl: item.userAvatarDataUrl }}
                          />
                        ) : (
                          <span className="jy-feed-ghost" aria-hidden="true">
                            <AdminLineIcon name="profile" />
                          </span>
                        )}
                        <div>
                          <strong>{actorName || (language === "en" ? "Deleted account" : "Compte supprimé")}</strong>
                          <span className="muted">{item.userEmail || item.metadata?.email || "-"}</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={`tag jy-event-tag ${eventTone(item.eventType)}`}>
                        <AdminLineIcon name={eventIcon(item.eventType)} />
                        {eventTypeLabel(item.eventType, language)}
                      </span>
                    </td>
                    <td className="admin-activity-details">
                      {details.length ? (
                        <div className="jy-details">
                          {details.map((part) => (
                            <span key={`${part.icon}-${part.text}`} className="jy-detail">
                              <AdminLineIcon name={part.icon} />
                              {part.text}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="muted">-</span>
                      )}
                    </td>
                    <td className="muted">{formatIp(item.ipAddress, language)}</td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={5} className="admin-table-empty muted">
                  {copy.empty}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <AdminPagination page={page} totalPages={totalPages} onChange={setPage} language={language} totalItems={data.items.length} />

      <JyDrawer
        open={Boolean(selectedEvent)}
        onClose={() => setSelectedEvent(null)}
        language={language}
        avatar={
          selectedEvent && (selectedEvent.userFirstName || selectedEvent.userLastName || selectedEvent.userAvatarDataUrl) ? (
            <AvatarCircle
              user={{ firstName: selectedEvent.userFirstName, lastName: selectedEvent.userLastName, avatarDataUrl: selectedEvent.userAvatarDataUrl }}
            />
          ) : (
            <span className="jy-feed-ghost" aria-hidden="true">
              <AdminLineIcon name="profile" />
            </span>
          )
        }
        title={selectedEvent ? eventTypeLabel(selectedEvent.eventType, language) : ""}
        subtitle={
          selectedEvent
            ? new Intl.DateTimeFormat(language === "en" ? "en-GB" : "fr-FR", { dateStyle: "long", timeStyle: "short" }).format(new Date(selectedEvent.createdAt))
            : ""
        }
        badges={
          selectedEvent ? (
            <span className={`tag jy-event-tag ${eventTone(selectedEvent.eventType)}`}>
              <AdminLineIcon name={eventIcon(selectedEvent.eventType)} />
              {eventTypeLabel(selectedEvent.eventType, language)}
            </span>
          ) : null
        }
        sections={
          selectedEvent
            ? [
                {
                  title: copy.colUser,
                  rows: [
                    [
                      language === "en" ? "Name" : "Nom",
                      `${selectedEvent.userFirstName || ""} ${selectedEvent.userLastName || ""}`.trim() ||
                        (language === "en" ? "Deleted account" : "Compte supprimé")
                    ],
                    [language === "en" ? "Email" : "E-mail", selectedEvent.userEmail || selectedEvent.metadata?.email],
                    [copy.colIp, formatIp(selectedEvent.ipAddress, language)]
                  ]
                },
                {
                  title: copy.colDetails,
                  content: describeActivity(selectedEvent, language, currency).length ? (
                    <div className="jy-details">
                      {describeActivity(selectedEvent, language, currency).map((part) => (
                        <span key={`${part.icon}-${part.text}`} className="jy-detail">
                          <AdminLineIcon name={part.icon} />
                          {part.text}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="muted">{language === "en" ? "No additional detail." : "Aucun détail supplémentaire."}</p>
                  )
                }
              ]
            : []
        }
      />

    </section>
  );
}
