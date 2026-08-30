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
import { UiIcon } from "../../components/UiIcon.jsx";
import { AdminPageLoader } from "../../components/AdminPageLoader.jsx";
import { AdminKpiCard } from "../../components/AdminKpiCard.jsx";
import { AdminExportCsvButton } from "../../components/AdminExportCsvButton.jsx";
import { AvatarCircle } from "../../components/AvatarCircle.jsx";
import { LanguageSwitch } from "../../components/LanguageSwitch.jsx";
// AccountDrawer/ConnectedFooter restent définis dans App.jsx (composants
// d'app-shell partagés avec le candidat) — import "arrière" volontaire, sûr
// ici car ces composants ne sont utilisés qu'au rendu (jamais à
// l'évaluation du module), bien après la résolution du cycle ESM.
import AccountDrawer from "../account/AccountDrawer.jsx";
import { ConnectedFooter, ADMIN_ACCOUNT_TYPES } from "../../App.jsx";
import { PLANS, PLAN_SEGMENTS, getPlanById } from "../../data/plans.js";
import { getFriendlyErrorMessage } from "../../lib/errors.js";
import { formatDate, formatShortDate, formatAmountInCurrency, formatPlanPrice } from "../../lib/format.js";
import { fileToBase64 } from "../../lib/cvService.js";
import { getAccountLabel } from "../../lib/accounts.js";
import { satisfactionTierFor } from "../satisfaction/SatisfactionSurveyModal.jsx";
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
} from "../../lib/inMemoryDb.js";
import AdminDashboardPage from "./pages/AdminDashboardPage.jsx";
import AdminPricingPage from "./pages/AdminPricingPage.jsx";
import AdminAccountsPage from "./pages/AdminAccountsPage.jsx";
import AdminCvsPage from "./pages/AdminCvsPage.jsx";
import AdminMatchesPage from "./pages/AdminMatchesPage.jsx";
import AdminQualityPage from "./pages/AdminQualityPage.jsx";
import AdminAiMonitoringPage from "./pages/AdminAiMonitoringPage.jsx";
import AdminFinancePage from "./pages/AdminFinancePage.jsx";
import AdminActivityLogPage from "./pages/AdminActivityLogPage.jsx";
import AdminSatisfactionPage from "./pages/AdminSatisfactionPage.jsx";
import AdminLicenseCodesPage from "./pages/AdminLicenseCodesPage.jsx";
import AdminAiSamplesPage from "./pages/AdminAiSamplesPage.jsx";
import AdminSettingsPage from "./pages/AdminSettingsPage.jsx";
import AdminAnnouncementsPage from "./pages/AdminAnnouncementsPage.jsx";

export const ADMIN_MODULE_DEFS = [
  { id: "dashboard", icon: "chart" },
  { id: "accounts", icon: "profile" },
  { id: "adminCvs", icon: "save" },
  { id: "adminMatches", icon: "matchmark" },
  { id: "quality", icon: "shield" },
  { id: "aiMonitoring", icon: "chart" },
  { id: "finance", icon: "scale" },
  { id: "licenses", icon: "save" },
  { id: "aiSamples", icon: "shield" },
  { id: "settings", icon: "globe" },
  { id: "announcements", icon: "mail" },
  { id: "activity", icon: "history" },
  { id: "pricing", icon: "pricetag" },
  { id: "satisfaction", icon: "chat" }
];

export function getAllowedAdminModules(user) {
  const modules = Array.isArray(user?.adminModules) ? user.adminModules : [];
  if (!modules.length) return ADMIN_MODULE_DEFS.map((item) => item.id);
  return ADMIN_MODULE_DEFS.map((item) => item.id).filter((id) => modules.includes(id));
}

export const ADMIN_MODULE_LABELS = {
  dashboard: { fr: "Dashboard", en: "Dashboard" },
  accounts: { fr: "Gestion de compte", en: "Account management" },
  adminCvs: { fr: "CV importés", en: "Uploaded CVs" },
  adminMatches: { fr: "Offres analysées", en: "Analyzed jobs" },
  quality: { fr: "Qualité extraction", en: "Extraction quality" },
  aiMonitoring: { fr: "Monitoring IA", en: "AI monitoring" },
  finance: { fr: "Gestion de finance", en: "Finance management" },
  activity: { fr: "Journal d'activité", en: "Activity log" },
  licenses: { fr: "Codes de licence", en: "License codes" },
  aiSamples: { fr: "Modération IA", en: "AI moderation" },
  settings: { fr: "Paramètres plateforme", en: "Platform settings" },
  announcements: { fr: "Emails d'annonce", en: "Announcement emails" },
  pricing: { fr: "Tarifs", en: "Pricing" },
  satisfaction: { fr: "Satisfaction", en: "Satisfaction" }
};

function AdminApp({
  user,
  language,
  setLanguage,
  currency,
  setCurrency,
  theme,
  setTheme,
  mode,
  setMode,
  density,
  setDensity,
  onLogout,
  landingCopy,
  onSaveAccount,
  onAvatarUpload,
  avatarUploading,
  onRequestSecondaryEmail,
  onVerifySecondaryEmail,
  onSetPrimaryEmail,
  onRemoveEmail,
  onRemoveConnectedAccount,
  onLinkGoogleAccount,
  securityForm,
  setSecurityForm,
  securitySaving,
  onSubmitPassword,
  onDeleteAccount
}) {
  const allowedModules = getAllowedAdminModules(user);
  const [tab, setTab] = useState(() => {
    try {
      return localStorage.getItem("career_app_admin_tab") || allowedModules[0] || "dashboard";
    } catch (_error) {
      return allowedModules[0] || "dashboard";
    }
  });
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [accountDrawerOpen, setAccountDrawerOpen] = useState(false);
  const [accountPanel, setAccountPanel] = useState("account");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [searchInput, setSearchInput] = useState("");
  const [accountsSearch, setAccountsSearch] = useState("");
  const [licenseSearch, setLicenseSearch] = useState("");
  const [financeSearch, setFinanceSearch] = useState("");
  const [searchSuggestions, setSearchSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [notifOpen, setNotifOpen] = useState(false);
  const [routeLoading, setRouteLoading] = useState(false);
  const notifRef = useRef(null);
  const userMenuRef = useRef(null);
  const searchBoxRef = useRef(null);
  const searchCopy =
    language === "en" ? { placeholder: "Search accounts…" } : { placeholder: "Rechercher des comptes…" };

  useEffect(() => {
    function handleClickOutside(event) {
      if (searchBoxRef.current && !searchBoxRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const term = searchInput.trim();
    if (!term) {
      setSearchSuggestions([]);
      return undefined;
    }
    const timer = setTimeout(() => {
      const lookups = [];
      if (allowedModules.includes("accounts")) {
        lookups.push(
          listAdminUsers(user.id, { search: term })
            .then((items) => items.slice(0, 4).map((item) => ({ kind: "account", ...item })))
            .catch(() => [])
        );
      }
      if (allowedModules.includes("licenses")) {
        lookups.push(
          getAdminLicenseCodes(user.id, { search: term })
            .then((items) => items.slice(0, 3).map((item) => ({ kind: "license", ...item })))
            .catch(() => [])
        );
      }
      if (allowedModules.includes("finance")) {
        lookups.push(
          getAdminFinance(user.id, { search: term })
            .then((data) => (data.items || []).slice(0, 3).map((item) => ({ kind: "transaction", ...item })))
            .catch(() => [])
        );
      }
      Promise.all(lookups).then((groups) => setSearchSuggestions(groups.flat()));
    }, 250);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  useEffect(() => {
    function handleClickOutsideNotif(event) {
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setNotifOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutsideNotif);
    return () => document.removeEventListener("mousedown", handleClickOutsideNotif);
  }, []);

  useEffect(() => {
    let cancelled = false;
    function load() {
      getAdminNotifications(user.id)
        .then((items) => {
          if (!cancelled) setNotifications(items || []);
        })
        .catch(() => {});
    }
    load();
    const interval = setInterval(load, 60000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [user.id]);

  function goToResult(item) {
    setShowSuggestions(false);
    if (item.kind === "license") {
      setLicenseSearch(item.code);
      setSearchInput(item.code);
      setTab("licenses");
    } else if (item.kind === "transaction") {
      setFinanceSearch(item.userEmail || item.id);
      setSearchInput(item.userEmail || item.id);
      setTab("finance");
    } else {
      setAccountsSearch(item.email);
      setSearchInput(item.email);
      setTab("accounts");
    }
  }

  function submitSearch(event) {
    event.preventDefault();
    if (!searchInput.trim() || !allowedModules.includes("accounts")) return;
    setAccountsSearch(searchInput.trim());
    setShowSuggestions(false);
    setTab("accounts");
  }
  const copy =
    language === "en"
      ? {
          dashboard: "Dashboard",
          pricing: "Pricing",
          accounts: "Account management",
          adminCvs: "Uploaded CVs",
          adminMatches: "Analyzed jobs",
          quality: "Extraction quality",
          aiMonitoring: "AI monitoring",
          finance: "Finance management",
          activity: "Activity log",
          licenses: "License codes",
          aiSamples: "AI moderation",
          settings: "Platform settings",
          announcements: "Announcement emails",
          accountSettings: "My profile",
          logout: "Log out",
          role: "Administrator",
          secured: "Secured by"
        }
      : {
          dashboard: "Dashboard",
          pricing: "Tarifs",
          accounts: "Gestion de compte",
          adminCvs: "CV importés",
          adminMatches: "Offres analysées",
          quality: "Qualité extraction",
          aiMonitoring: "Monitoring IA",
          finance: "Gestion de finance",
          activity: "Journal d'activité",
          licenses: "Codes de licence",
          aiSamples: "Modération IA",
          settings: "Paramètres plateforme",
          announcements: "Emails d'annonce",
          accountSettings: "Mon profil",
          logout: "Déconnexion",
          role: "Administrateur",
          secured: "Sécurisé par"
        };
  const getAdminModuleLabel = (id) => copy[id] || ADMIN_MODULE_LABELS[id]?.[language] || ADMIN_MODULE_LABELS[id]?.fr || id;

  useEffect(() => {
    function handleClickOutside(event) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!allowedModules.includes(tab)) {
      setTab(allowedModules[0] || "dashboard");
    }
  }, [tab, allowedModules]);

  useEffect(() => {
    try {
      localStorage.setItem("career_app_admin_tab", tab);
    } catch (_error) {
      // ignore storage errors (private mode, quota, etc.)
    }
  }, [tab]);

  useEffect(() => {
    setRouteLoading(true);
    const timer = window.setTimeout(() => setRouteLoading(false), 360);
    return () => window.clearTimeout(timer);
  }, [tab]);

  function openAccountSettings() {
    setAccountPanel("account");
    setAccountDrawerOpen(true);
    setUserMenuOpen(false);
  }

  function renderAdminPage() {
    if (tab === "dashboard" && allowedModules.includes("dashboard")) return <AdminDashboardPage user={user} language={language} />;
    if (tab === "accounts" && allowedModules.includes("accounts")) {
      return <AdminAccountsPage user={user} language={language} currency={currency} initialSearch={accountsSearch} />;
    }
    if (tab === "adminCvs" && allowedModules.includes("adminCvs")) return <AdminCvsPage user={user} language={language} />;
    if (tab === "adminMatches" && allowedModules.includes("adminMatches")) return <AdminMatchesPage user={user} language={language} />;
    if (tab === "quality" && allowedModules.includes("quality")) return <AdminQualityPage user={user} language={language} />;
    if (tab === "aiMonitoring" && allowedModules.includes("aiMonitoring")) return <AdminAiMonitoringPage user={user} language={language} />;
    if (tab === "finance" && allowedModules.includes("finance")) {
      return <AdminFinancePage user={user} language={language} currency={currency} initialSearch={financeSearch} />;
    }
    if (tab === "activity" && allowedModules.includes("activity")) return <AdminActivityLogPage user={user} language={language} />;
    if (tab === "licenses" && allowedModules.includes("licenses")) {
      return <AdminLicenseCodesPage user={user} language={language} initialSearch={licenseSearch} />;
    }
    if (tab === "aiSamples" && allowedModules.includes("aiSamples")) return <AdminAiSamplesPage user={user} language={language} />;
    if (tab === "settings" && allowedModules.includes("settings")) return <AdminSettingsPage user={user} language={language} />;
    if (tab === "announcements" && allowedModules.includes("announcements")) return <AdminAnnouncementsPage user={user} language={language} />;
    if (tab === "pricing" && allowedModules.includes("pricing")) return <AdminPricingPage user={user} language={language} currency={currency} />;
    if (tab === "satisfaction" && allowedModules.includes("satisfaction")) return <AdminSatisfactionPage user={user} language={language} />;
    return <AdminPageLoader language={language} />;
  }

  return (
    <div className="app-shell admin-shell-root">
      <header className="topbar">
        <div className="brand">
          <button
            type="button"
            className="topbar-menu-toggle"
            aria-label={language === "en" ? "Toggle sidebar" : "Afficher/masquer le menu"}
            onClick={() => setSidebarOpen((prev) => !prev)}
          >
            <span />
            <span />
            <span />
          </button>
          Career App <span className="admin-badge">Admin</span>
        </div>

        <div className="topbar-search-box" ref={searchBoxRef}>
          <form className="topbar-search" onSubmit={submitSearch}>
            <span className="topbar-search-icon" aria-hidden="true" />
            <input
              value={searchInput}
              onChange={(event) => {
                setSearchInput(event.target.value);
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
              placeholder={searchCopy.placeholder}
            />
          </form>
          {showSuggestions && searchSuggestions.length ? (
            <div className="topbar-suggestions">
              {searchSuggestions.map((item) => {
                const key = `${item.kind}-${item.id || item.code}`;
                if (item.kind === "license") {
                  return (
                    <button type="button" key={key} className="topbar-suggestion-row" onClick={() => goToResult(item)}>
                      <span className="topbar-suggestion-icon">
                        <UiIcon name="shield" />
                      </span>
                      <div>
                        <strong>{item.code}</strong>
                        <span className="muted">
                          {item.ownerFirstName} {item.ownerLastName} · {item.seatsUsed}/{item.seatsTotal}
                        </span>
                      </div>
                    </button>
                  );
                }
                if (item.kind === "transaction") {
                  return (
                    <button type="button" key={key} className="topbar-suggestion-row" onClick={() => goToResult(item)}>
                      <span className="topbar-suggestion-icon">
                        <UiIcon name="scale" />
                      </span>
                      <div>
                        <strong>
                          {item.userFirstName} {item.userLastName}
                        </strong>
                        <span className="muted">
                          {formatEur(item.amountCollected, item.currency)} · {item.planId}
                        </span>
                      </div>
                    </button>
                  );
                }
                return (
                  <button type="button" key={key} className="topbar-suggestion-row" onClick={() => goToResult(item)}>
                    <AvatarCircle user={item} />
                    <div>
                      <strong>
                        {item.firstName} {item.lastName}
                      </strong>
                      <span className="muted">{item.email}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : null}
        </div>

        <div className="topbar-user" ref={userMenuRef}>
          <div className="topbar-notif" ref={notifRef}>
            <button
              type="button"
              className="topbar-icon-btn"
              title={language === "en" ? "Notifications" : "Notifications"}
              onClick={() => setNotifOpen((prev) => !prev)}
            >
              <UiIcon name="bell" />
              {notifications.length ? (
                <span className="topbar-notif-badge">{notifications.length > 9 ? "9+" : notifications.length}</span>
              ) : null}
            </button>
            {notifOpen ? (
              <div className="topbar-notif-panel">
                <div className="topbar-notif-panel-head">
                  <strong>{language === "en" ? "Notifications" : "Notifications"}</strong>
                  <span className="muted">
                    {notifications.length
                      ? `${notifications.length} ${language === "en" ? "item(s)" : "élément(s)"}`
                      : language === "en"
                      ? "Nothing to report"
                      : "Rien à signaler"}
                  </span>
                </div>
                {notifications.length ? (
                  <div className="topbar-notif-list">
                    {notifications.map((item) => {
                      const text = adminNotificationText(item, language);
                      return (
                        <div key={item.id} className="topbar-notif-row">
                          <span className="topbar-notif-icon">
                            <UiIcon name={text.icon} />
                          </span>
                          <div>
                            <strong>{text.title}</strong>
                            <span className="muted">{text.detail}</span>
                            {item.createdAt ? <span className="topbar-notif-time">{formatDate(item.createdAt)}</span> : null}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="muted topbar-notif-empty">
                    {language === "en"
                      ? "New signups, payments, full licenses and announcement failures will show up here."
                      : "Les nouvelles inscriptions, paiements, licences épuisées et échecs d'annonce apparaîtront ici."}
                  </p>
                )}
              </div>
            ) : null}
          </div>
          <button
            type="button"
            className="topbar-icon-btn"
            title={copy.activity}
            onClick={() => allowedModules.includes("activity") && setTab("activity")}
          >
            <UiIcon name="history" />
          </button>
          <button
            type="button"
            className="topbar-icon-btn"
            title={copy.announcements}
            onClick={() => allowedModules.includes("announcements") && setTab("announcements")}
          >
            <UiIcon name="mail" />
          </button>
          <LanguageSwitch language={language} setLanguage={setLanguage} compact />
          <button className="user-menu-trigger" onClick={() => setUserMenuOpen((prev) => !prev)}>
            <AvatarCircle user={user} />
            <div className="topbar-user-meta">
              <strong>
                {user.firstName} {user.lastName}
              </strong>
              <span>{copy.role}</span>
            </div>
          </button>

          {userMenuOpen ? (
            <div className="user-dropdown">
              <div className="user-dropdown-head">
                <AvatarCircle user={user} />
                <div>
                  <strong>
                    {user.firstName} {user.lastName}
                  </strong>
                  <span>{user.username || user.email.split("@")[0]}</span>
                </div>
              </div>
              <button onClick={openAccountSettings}>
                <span className="dropdown-icon">
                  <UiIcon name="profile" />
                </span>
                {copy.accountSettings}
              </button>
              <button onClick={onLogout}>
                <span className="dropdown-icon danger">
                  <UiIcon name="logout" />
                </span>
                {copy.logout}
              </button>
              <div className="user-dropdown-secured">
                {copy.secured} <strong>Career App</strong>
              </div>
            </div>
          ) : null}
        </div>
      </header>

      <div className="admin-body">
        <aside className={`admin-sidebar-vertical ${sidebarOpen ? "" : "collapsed"}`}>
          <div className="admin-sidebar-user">
            <AvatarCircle user={user} />
            <strong>
              {user.firstName} {user.lastName}
            </strong>
            <span>{copy.role}</span>
            <div className="admin-sidebar-user-actions">
              <button type="button" title={copy.accountSettings} onClick={openAccountSettings}>
                <UiIcon name="profile" />
              </button>
              <button type="button" title={copy.announcements} onClick={() => setTab("announcements")}>
                <UiIcon name="mail" />
              </button>
              <button type="button" title={copy.logout} onClick={onLogout}>
                <UiIcon name="logout" />
              </button>
            </div>
          </div>
          <nav className="admin-sidebar-nav">
            <span className="admin-sidebar-section-label">MENU</span>
            {ADMIN_MODULE_DEFS.filter((item) => allowedModules.includes(item.id)).map((item) => (
              <button
                key={item.id}
                type="button"
                className={tab === item.id ? "active" : ""}
                onClick={() => setTab(item.id)}
              >
                <UiIcon name={item.icon} /> <span>{getAdminModuleLabel(item.id)}</span>
              </button>
            ))}
          </nav>
        </aside>

        <main className="main-wrap admin-main">
          <nav className="admin-breadcrumb" aria-label="Breadcrumb">
            <span>{language === "en" ? "Home" : "Accueil"}</span>
            <UiIcon name="chevron" className="admin-breadcrumb-sep" />
            <span className="active">{getAdminModuleLabel(tab)}</span>
          </nav>

          {routeLoading ? <AdminPageLoader language={language} /> : renderAdminPage()}
        </main>
      </div>

      <ConnectedFooter copy={landingCopy} />

      {accountDrawerOpen ? (
        <AccountDrawer
          user={user}
          language={language}
          setLanguage={setLanguage}
          currency={currency}
          setCurrency={setCurrency}
          theme={theme}
          setTheme={setTheme}
          mode={mode}
          setMode={setMode}
          density={density}
          setDensity={setDensity}
          activePanel={accountPanel}
          setActivePanel={setAccountPanel}
          onClose={() => setAccountDrawerOpen(false)}
          onSaveAccount={onSaveAccount}
          onAvatarUpload={onAvatarUpload}
          avatarUploading={avatarUploading}
          onRequestSecondaryEmail={onRequestSecondaryEmail}
          onVerifySecondaryEmail={onVerifySecondaryEmail}
          onSetPrimaryEmail={onSetPrimaryEmail}
          onRemoveEmail={onRemoveEmail}
          onRemoveConnectedAccount={onRemoveConnectedAccount}
          onLinkGoogleAccount={onLinkGoogleAccount}
          securityForm={securityForm}
          setSecurityForm={setSecurityForm}
          securitySaving={securitySaving}
          onSubmitPassword={onSubmitPassword}
          onDeleteAccount={onDeleteAccount}
        />
      ) : null}
    </div>
  );
}

export const ADMIN_DASHBOARD_ROLES = [
  { id: "student", icon: "profile", color: "#1a0dab" },
  { id: "school", icon: "shield", color: "#237804" },
  { id: "recruiter_firm", icon: "briefcase", color: "#fa8c16" }
];

export function AdminTrendChart({ trend, language, valueKey = "count", formatValue }) {
  if (!trend?.length) return null;
  const max = Math.max(1, ...trend.map((point) => point[valueKey]));
  const weekFormatter = new Intl.DateTimeFormat(language === "en" ? "en-US" : "fr-FR", {
    day: "2-digit",
    month: "2-digit"
  });
  const display = formatValue || ((value) => value);

  return (
    <div className="admin-trend-chart">
      {trend.map((point) => (
        <div key={point.weekStart} className="admin-trend-bar-col">
          <div className="admin-trend-bar-track">
            <div
              className="admin-trend-bar"
              style={{ height: `${Math.max(4, (point[valueKey] / max) * 100)}%` }}
              title={`${display(point[valueKey])}`}
            >
              {point[valueKey] > 0 ? <span>{display(point[valueKey])}</span> : null}
            </div>
          </div>
          <span className="admin-trend-label">{weekFormatter.format(new Date(point.weekStart))}</span>
        </div>
      ))}
    </div>
  );
}

export function AdminDonutChart({ segments, emptyLabel }) {
  const total = segments.reduce((sum, seg) => sum + seg.value, 0);
  if (!total) return <p className="muted">{emptyLabel}</p>;

  let cumulative = 0;
  const stops = segments
    .filter((seg) => seg.value > 0)
    .map((seg) => {
      const start = (cumulative / total) * 360;
      cumulative += seg.value;
      const end = (cumulative / total) * 360;
      return `${seg.color} ${start}deg ${end}deg`;
    })
    .join(", ");

  return (
    <div className="admin-donut-wrap">
      <div className="admin-donut" style={{ background: `conic-gradient(${stops})` }}>
        <div className="admin-donut-hole">
          <strong>{total}</strong>
        </div>
      </div>
      <div className="admin-donut-legend">
        {segments
          .filter((seg) => seg.value > 0)
          .map((seg) => (
            <div key={seg.label} className="admin-donut-legend-row">
              <span className="admin-donut-dot" style={{ background: seg.color }} />
              <span>{seg.label}</span>
              <strong>{seg.value}</strong>
            </div>
          ))}
      </div>
    </div>
  );
}


export const ADMIN_ACCOUNT_SUBTABS = [
  { id: "all", label: { fr: "Tous les comptes", en: "All accounts" } },
  { id: "student", label: { fr: "Étudiants", en: "Students" } },
  { id: "school", label: { fr: "Écoles", en: "Schools" } },
  { id: "recruiter_firm", label: { fr: "Cabinets", en: "Agencies" } },
  { id: "admin", label: { fr: "Administrateurs", en: "Administrators" } }
];

export const ADMIN_PAGE_SIZE = 8;

export function getPaginationRange(current, total, delta = 1) {
  const range = [];
  for (let i = 1; i <= total; i += 1) {
    if (i === 1 || i === total || (i >= current - delta && i <= current + delta)) {
      range.push(i);
    }
  }
  const withDots = [];
  let last = 0;
  for (const num of range) {
    if (last) {
      if (num - last === 2) withDots.push(last + 1);
      else if (num - last > 2) withDots.push("…");
    }
    withDots.push(num);
    last = num;
  }
  return withDots;
}

export function AdminPagination({ page, totalPages, onChange, language, totalItems, pageSize = ADMIN_PAGE_SIZE }) {
  if (totalPages <= 1) return null;

  const copy =
    language === "en"
      ? {
          previous: "Previous",
          next: "Next",
          showing: (from, to, total) => `Showing ${from} to ${to} of ${total} entries`
        }
      : {
          previous: "Précédent",
          next: "Suivant",
          showing: (from, to, total) => `Affichage de ${from} à ${to} sur ${total} entrées`
        };

  const from = totalItems ? (page - 1) * pageSize + 1 : null;
  const to = totalItems ? Math.min(page * pageSize, totalItems) : null;
  const pageNumbers = getPaginationRange(page, totalPages);

  return (
    <div className="admin-pagination-bar">
      <span className="admin-pagination-info">{totalItems ? copy.showing(from, to, totalItems) : ""}</span>
      <div className="admin-pagination">
        <button
          type="button"
          className="admin-pagination-textbtn"
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
        >
          {copy.previous}
        </button>
        {pageNumbers.map((num, index) =>
          num === "…" ? (
            <span key={`dots-${index}`} className="admin-pagination-ellipsis">
              …
            </span>
          ) : (
            <button
              key={num}
              type="button"
              className={`admin-pagination-num ${num === page ? "active" : ""}`}
              onClick={() => onChange(num)}
            >
              {num}
            </button>
          )
        )}
        <button
          type="button"
          className="admin-pagination-textbtn"
          disabled={page >= totalPages}
          onClick={() => onChange(page + 1)}
        >
          {copy.next}
        </button>
      </div>
    </div>
  );
}

export function AdminOrgCard({ org, language, roleType }) {
  const copy =
    language === "en"
      ? { seats: "Seats", members: "Members", noMembers: "No member linked to a license code yet.", createdOn: "Created on" }
      : { seats: "Sièges", members: "Membres", noMembers: "Aucun membre lié à un code de licence pour l'instant.", createdOn: "Créé le" };

  const totalSeats = org.licenseCodes.reduce((sum, code) => sum + Number(code.seatsTotal || 0), 0);
  const usedSeats = org.licenseCodes.reduce((sum, code) => sum + Number(code.seatsUsed || 0), 0);

  return (
    <article className="admin-org-card">
      <div className="admin-org-card-head">
        <AvatarCircle user={org} />
        <div className="admin-org-card-meta">
          <strong>{org.organizationName || `${org.firstName} ${org.lastName}`}</strong>
          <span className="muted">
            {org.organizationName ? `${org.firstName} ${org.lastName} · ` : ""}
            {org.email}
          </span>
        </div>
        {org.licenseCodes.length ? (
          <span className="tag">
            {copy.seats}: {usedSeats}/{totalSeats}
          </span>
        ) : null}
        <span className="muted admin-org-card-date">
          {copy.createdOn} {formatDate(org.createdAt)}
        </span>
      </div>

      <div className="admin-org-members">
        <h4>
          {copy.members} ({org.members.length})
        </h4>
        {org.members.length ? (
          <div className="admin-org-members-list">
            {org.members.map((member) => (
              <div key={member.id} className="admin-org-member-row">
                <AvatarCircle user={member} />
                <div>
                  <strong>
                    {member.firstName} {member.lastName}
                  </strong>
                  <span className="muted">{member.email}</span>
                </div>
                <span className="tag">{getAccountLabel(member.roleType, language)}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="muted">{copy.noMembers}</p>
        )}
      </div>
    </article>
  );
}


export const ADMIN_FINANCE_SOURCES = [
  { id: "", label: { fr: "Toutes les sources", en: "All sources" } },
  { id: "stripe", label: { fr: "Stripe (paiement réel)", en: "Stripe (real payment)" } },
  { id: "instant", label: { fr: "Activation instantanée", en: "Instant activation" } },
  { id: "license_redeem", label: { fr: "Code de licence", en: "License code" } },
  { id: "admin_created", label: { fr: "Créé par l'admin", en: "Created by admin" } }
];

export function formatEur(amount, currency = "EUR") {
  return formatAmountInCurrency(amount, currency, { decimals: true });
}

export function planPriceLabel(planId, billingCycle, freeLabel, currency = "EUR") {
  const plan = getPlanById(planId);
  if (!plan) return "—";
  if (plan.monthlyPrice === 0 && plan.annualPrice === 0) return freeLabel || "Gratuit";
  if (plan.monthlyPrice == null) return formatEur(plan.annualPrice, currency);
  const amount = billingCycle === "annual" ? plan.annualPrice : plan.monthlyPrice;
  return `${formatEur(amount, currency)} / ${billingCycle === "annual" ? "an" : "mois"}`;
}

export function AdminMiniMetric({ label, value, icon = "chart", tone = "" }) {
  return (
    <article className={`admin-mini-metric ${tone}`}>
      <span>
        <UiIcon name={icon} />
      </span>
      <div>
        <strong>{value}</strong>
        <small>{label}</small>
      </div>
    </article>
  );
}


export const ADMIN_EVENT_LABELS = {
  login_password: { fr: "Connexion (mot de passe)", en: "Login (password)" },
  login_google: { fr: "Connexion (Google)", en: "Login (Google)" },
  connected_account_linked: { fr: "Compte Google lié", en: "Google account linked" },
  connected_account_removed: { fr: "Compte Google délié", en: "Google account unlinked" },
  account_deleted: { fr: "Compte supprimé (par l'utilisateur)", en: "Account deleted (by user)" },
  admin_user_updated: { fr: "Compte modifié par l'admin", en: "Account edited by admin" },
  admin_user_deleted: { fr: "Compte supprimé par l'admin", en: "Account deleted by admin" },
  admin_user_suspended: { fr: "Compte suspendu par l'admin", en: "Account suspended by admin" },
  admin_user_reactivated: { fr: "Compte réactivé par l'admin", en: "Account reactivated by admin" },
  admin_cv_reanalyzed: { fr: "CV réanalysé par l'admin", en: "CV reanalyzed by admin" },
  admin_cv_deleted: { fr: "CV supprimé par l'admin", en: "CV deleted by admin" },
  admin_license_code_revoked: { fr: "Code de licence révoqué", en: "License code revoked" },
  admin_license_code_restored: { fr: "Code de licence restauré", en: "License code restored" },
  admin_setting_changed: { fr: "Paramètre plateforme modifié", en: "Platform setting changed" }
};

export function eventTypeLabel(eventType, language) {
  return ADMIN_EVENT_LABELS[eventType]?.[language] || ADMIN_EVENT_LABELS[eventType]?.fr || eventType;
}

// Traduit chaque type de notification admin en texte affichable. Chaque type
// correspond à un événement réel détecté côté serveur (nouvelle inscription,
// paiement Stripe encaissé, licence épuisée, échec d'envoi d'annonce) — pas
// de contenu fabriqué.
export function adminNotificationText(item, language) {
  const name = [item.data?.firstName, item.data?.lastName].filter(Boolean).join(" ") || "—";
  const planName = item.data?.planId ? getPlanById(item.data.planId)?.name?.[language] || getPlanById(item.data.planId)?.name?.fr || item.data.planId : "";
  switch (item.type) {
    case "new_signup":
      return {
        icon: "profile",
        title: language === "en" ? "New account" : "Nouveau compte",
        detail: `${name} — ${getAccountLabel(item.data?.roleType, language)}`
      };
    case "new_org":
      return {
        icon: "briefcase",
        title: language === "en" ? "New organization" : "Nouvelle organisation",
        detail: `${name} — ${getAccountLabel(item.data?.roleType, language)}`
      };
    case "new_payment":
      return {
        icon: "scale",
        title: language === "en" ? "Payment received" : "Paiement encaissé",
        detail: `${name} — ${formatEur(item.data?.amount, item.data?.currency || "EUR")}${planName ? ` (${planName})` : ""}`
      };
    case "license_full":
      return {
        icon: "shield",
        title: language === "en" ? "License fully used" : "Licence épuisée",
        detail: `${item.data?.code} — ${name} (${item.data?.seatsTotal} ${language === "en" ? "seats" : "sièges"})`
      };
    case "announcement_failed":
      return {
        icon: "alert",
        title: language === "en" ? "Announcement send failures" : "Échecs d'envoi d'annonce",
        detail: `${item.data?.subject} — ${item.data?.failedCount} ${language === "en" ? "failed" : "échec(s)"}`
      };
    default:
      return { icon: "alert", title: item.type, detail: "" };
  }
}


export const ADMIN_ANNOUNCEMENT_AUDIENCES = [
  { id: "", label: { fr: "Tous les utilisateurs", en: "All users" } },
  { id: "student", label: { fr: "Étudiants / Candidats", en: "Students / Candidates" } },
  { id: "school", label: { fr: "Écoles", en: "Schools" } },
  { id: "recruiter_firm", label: { fr: "Cabinets de recrutement", en: "Recruitment agencies" } }
];


export { AdminApp };
