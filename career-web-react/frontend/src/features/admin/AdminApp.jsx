// Module Admin : interface d'administration de la plateforme (dashboard,
// comptes, finance, licences, modération IA, paramètres, annonces...) et,
// pour l'instant, le dashboard École (SchoolApp + School*Page) qui partage
// plusieurs composants avec l'admin (AdminPageLoader, tableaux paginés...).
//
// NOTE : ce fichier est volumineux (déplacement mécanique depuis App.jsx,
// pas une réécriture) car Admin et École sont encore fortement imbriqués
// dans le code existant. Un découpage plus fin (features/school/ séparé,
// un fichier par page admin) est une suite possible, pas un prérequis pour
// que ce module soit isolé du reste de l'app.
import { useState, useEffect, useRef } from "react";
import Swal from "sweetalert2";
import { UiIcon } from "../../components/UiIcon.jsx";
import { AdminPageLoader } from "../../components/AdminPageLoader.jsx";
import { AvatarCircle } from "../../components/AvatarCircle.jsx";
import { LanguageSwitch } from "../../components/LanguageSwitch.jsx";
// AccountDrawer/ConnectedFooter restent définis dans App.jsx (composants
// d'app-shell partagés avec le candidat) — import "arrière" volontaire, sûr
// ici car ces composants ne sont utilisés qu'au rendu (jamais à
// l'évaluation du module), bien après la résolution du cycle ESM.
import { AccountDrawer, ConnectedFooter } from "../../App.jsx";
import { PLANS, PLAN_SEGMENTS, getPlanById } from "../../data/plans.js";
import { getFriendlyErrorMessage } from "../../lib/errors.js";
import { formatDate, formatShortDate, formatAmountInCurrency, formatPlanPrice } from "../../lib/format.js";
import { fileToBase64 } from "../../lib/cvService.js";
import { getAccountLabel } from "../../lib/accounts.js";
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
  getApiBase,
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

const ADMIN_MODULE_DEFS = [
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

function getAllowedAdminModules(user) {
  const modules = Array.isArray(user?.adminModules) ? user.adminModules : [];
  if (!modules.length) return ADMIN_MODULE_DEFS.map((item) => item.id);
  return ADMIN_MODULE_DEFS.map((item) => item.id).filter((id) => modules.includes(id));
}

const ADMIN_MODULE_LABELS = {
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

const SCHOOL_MODULE_DEFS = [
  { id: "dashboard", icon: "chart" },
  { id: "students", icon: "profile" },
  { id: "promotions", icon: "network" },
  { id: "invitations", icon: "mail" },
  { id: "license", icon: "save" },
  { id: "insights", icon: "chart" },
  { id: "reports", icon: "file" },
  { id: "settings", icon: "settings" }
];

function SchoolApp({
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
  const [tab, setTab] = useState(() => {
    try {
      return localStorage.getItem("career_app_school_tab") || "dashboard";
    } catch (_error) {
      return "dashboard";
    }
  });
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [accountDrawerOpen, setAccountDrawerOpen] = useState(false);
  const [accountPanel, setAccountPanel] = useState("account");
  const [searchInput, setSearchInput] = useState("");
  const [studentsSearch, setStudentsSearch] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [searchSuggestions, setSearchSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [notifOpen, setNotifOpen] = useState(false);
  const userMenuRef = useRef(null);
  const notifRef = useRef(null);
  const searchBoxRef = useRef(null);
  const searchCopy =
    language === "en" ? { placeholder: "Search students…" } : { placeholder: "Rechercher des étudiants…" };

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
    if (!searchInput.trim()) {
      setSearchSuggestions([]);
      return undefined;
    }
    const timer = setTimeout(() => {
      getSchoolStudents(user.id, { search: searchInput.trim() })
        .then((items) => setSearchSuggestions(items.slice(0, 5)))
        .catch(() => setSearchSuggestions([]));
    }, 250);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  useEffect(() => {
    if (!SCHOOL_MODULE_DEFS.some((item) => item.id === tab)) {
      setTab("dashboard");
      return;
    }
    try {
      localStorage.setItem("career_app_school_tab", tab);
    } catch (_error) {
      // ignore storage errors (private mode, quota, etc.)
    }
  }, [tab]);

  function goToStudent(item) {
    setStudentsSearch(item.email);
    setSearchInput(item.email);
    setShowSuggestions(false);
    setTab("students");
  }

  function submitSearch(event) {
    event.preventDefault();
    if (!searchInput.trim()) return;
    setStudentsSearch(searchInput.trim());
    setShowSuggestions(false);
    setTab("students");
  }
  const copy =
    language === "en"
      ? {
          dashboard: "Dashboard",
          students: "Students",
          promotions: "Promotions",
          invitations: "Invitations",
          license: "My license",
          insights: "Tracking & employability",
          reports: "Reports",
          settings: "Institution settings",
          accountSettings: "My profile",
          logout: "Log out",
          role: "School administrator",
          secured: "Secured by"
        }
      : {
          dashboard: "Dashboard",
          students: "Étudiants",
          promotions: "Promotions",
          invitations: "Invitations",
          license: "Ma licence",
          insights: "Suivi & employabilité",
          reports: "Rapports",
          settings: "Paramètres de l'établissement",
          accountSettings: "Mon profil",
          logout: "Déconnexion",
          role: "Administrateur école",
          secured: "Sécurisé par"
        };

  useEffect(() => {
    function handleClickOutside(event) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setUserMenuOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setNotifOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    getSchoolNotifications(user.id, language).then((data) => setNotifications(data.items || [])).catch(() => setNotifications([]));
  }, [user.id, language, tab]);

  function openAccountSettings() {
    setAccountPanel("account");
    setAccountDrawerOpen(true);
    setUserMenuOpen(false);
  }

  return (
    <div className="app-shell school-shell-root">
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
          Career App <span className="admin-badge school-badge">École</span>
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
              {searchSuggestions.map((item) => (
                <button type="button" key={item.id} className="topbar-suggestion-row" onClick={() => goToStudent(item)}>
                  <AvatarCircle user={item} />
                  <div>
                    <strong>
                      {item.firstName} {item.lastName}
                    </strong>
                    <span className="muted">{item.email}</span>
                  </div>
                </button>
              ))}
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
              {notifications.filter((item) => !item.readAt).length ? (
                <span className="topbar-notif-badge">
                  {notifications.filter((item) => !item.readAt).length > 9 ? "9+" : notifications.filter((item) => !item.readAt).length}
                </span>
              ) : null}
            </button>
            {notifOpen ? (
              <div className="topbar-notif-panel">
                <div className="topbar-notif-panel-head">
                  <strong>{language === "en" ? "Notifications" : "Notifications"}</strong>
                  <button
                    type="button"
                    className="admin-row-action"
                    onClick={() => {
                      markSchoolNotificationsRead(user.id).finally(() =>
                        setNotifications((items) => items.map((item) => ({ ...item, readAt: item.readAt || new Date().toISOString() })))
                      );
                    }}
                  >
                    {language === "en" ? "Mark as read" : "Tout marquer lu"}
                  </button>
                </div>
                {notifications.length ? (
                  <div className="topbar-notif-list">
                    {notifications.slice(0, 8).map((item) => (
                      <div key={item.id} className="topbar-notif-row">
                        <span className="topbar-notif-icon">
                          <UiIcon name={item.type === "license_capacity" ? "save" : item.type === "low_match_score" ? "alert" : "profile"} />
                        </span>
                        <div>
                          <strong>{item.title}</strong>
                          <span className="muted">{item.body}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="muted topbar-notif-empty">
                    {language === "en" ? "No notification yet." : "Aucune notification pour le moment."}
                  </p>
                )}
              </div>
            ) : null}
          </div>
          <button type="button" className="topbar-icon-btn" title={copy.insights} onClick={() => setTab("insights")}>
            <UiIcon name="history" />
          </button>
          <button
            type="button"
            className="topbar-icon-btn"
            title={copy.invitations}
            onClick={() => setTab("invitations")}
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
              <button type="button" title={copy.invitations} onClick={() => setTab("invitations")}>
                <UiIcon name="mail" />
              </button>
              <button type="button" title={copy.logout} onClick={onLogout}>
                <UiIcon name="logout" />
              </button>
            </div>
          </div>
          <nav className="admin-sidebar-nav">
            <span className="admin-sidebar-section-label">MENU</span>
            {SCHOOL_MODULE_DEFS.map((item) => (
              <button key={item.id} type="button" className={tab === item.id ? "active" : ""} onClick={() => setTab(item.id)}>
                <UiIcon name={item.icon} /> <span>{copy[item.id]}</span>
              </button>
            ))}
          </nav>
        </aside>

        <main className="main-wrap admin-main">
          <nav className="admin-breadcrumb" aria-label="Breadcrumb">
            <span>{language === "en" ? "Home" : "Accueil"}</span>
            <UiIcon name="chevron" className="admin-breadcrumb-sep" />
            <span className="active">{copy[tab]}</span>
          </nav>

          {tab === "dashboard" ? <SchoolDashboardPage user={user} language={language} /> : null}
          {tab === "students" ? (
            <SchoolStudentsPage user={user} language={language} initialSearch={studentsSearch} />
          ) : null}
          {tab === "promotions" ? <SchoolPromotionsPage user={user} language={language} /> : null}
          {tab === "invitations" ? <SchoolInvitationsPage user={user} language={language} /> : null}
          {tab === "license" ? <SchoolLicensePage user={user} language={language} currency={currency} /> : null}
          {tab === "insights" ? <SchoolInsightsPage user={user} language={language} /> : null}
          {tab === "reports" ? <SchoolReportsPage user={user} language={language} /> : null}
          {tab === "settings" ? <SchoolSettingsPage user={user} language={language} /> : null}
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

function AdminExportCsvButton({ adminUserId, path, language }) {
  const [loading, setLoading] = useState(false);
  async function handleClick() {
    setLoading(true);
    try {
      const base = await getApiBase();
      window.open(`${base}${path}?adminUserId=${encodeURIComponent(adminUserId)}`, "_blank");
    } finally {
      setLoading(false);
    }
  }
  return (
    <button type="button" className="btn-ghost admin-export-btn" onClick={handleClick} disabled={loading}>
      {loading ? <span className="btn-spinner" /> : <UiIcon name="download" />}
      {language === "en" ? "Export CSV" : "Exporter en CSV"}
    </button>
  );
}

function SchoolExportCsvButton({ userId, language }) {
  const [loading, setLoading] = useState(false);
  async function handleClick() {
    setLoading(true);
    try {
      const base = await getApiBase();
      window.open(`${base}/school/students/export?userId=${encodeURIComponent(userId)}`, "_blank");
    } finally {
      setLoading(false);
    }
  }
  return (
    <button type="button" className="btn-ghost admin-export-btn" onClick={handleClick} disabled={loading}>
      {loading ? <span className="btn-spinner" /> : <UiIcon name="download" />}
      {language === "en" ? "Export CSV" : "Exporter en CSV"}
    </button>
  );
}

function AdminKpiCard({ tone, icon, value, label }) {
  return (
    <div className={`admin-kpi-card tone-${tone}`}>
      <span className="admin-kpi-icon">
        <UiIcon name={icon} />
      </span>
      <span className="admin-kpi-value">{value}</span>
      <span className="admin-kpi-label">{label}</span>
    </div>
  );
}


function SchoolDashboardPage({ user, language }) {
  const [overview, setOverview] = useState(null);
  const [recentStudents, setRecentStudents] = useState(null);
  const [error, setError] = useState("");
  const copy =
    language === "en"
      ? {
          title: "Dashboard",
          subtitle: "Real-time indicators for your students on Career App.",
          students: "Associated students",
          seats: "Seats used",
          activation: "Activation rate",
          cvs: "CVs imported",
          matches: "Matches run",
          avgScore: "Average match score",
          inactive: "Inactive 30+ days",
          trend: "New students — last 8 weeks",
          noTrendTitle: "No recent signup",
          noTrendHint: "New students linked to your license will appear here week by week.",
          noScore: "No data yet",
          recentStudents: "Recently joined",
          noStudents: "No student linked to your license yet.",
          joinedOn: "Joined",
          activityBreakdown: "Activity breakdown",
          activeLabel: "Active (30d)",
          inactiveLabel: "Inactive",
          noActivityTitle: "No activity yet",
          noActivityHint: "Activity starts when students import a CV or launch a match analysis."
        }
      : {
          title: "Dashboard",
          subtitle: "Indicateurs en temps réel de vos étudiants sur Career App.",
          students: "Étudiants associés",
          seats: "Sièges utilisés",
          activation: "Taux d'activation",
          cvs: "CV importés",
          matches: "Analyses réalisées",
          avgScore: "Score de matching moyen",
          inactive: "Inactifs depuis 30j+",
          trend: "Nouveaux étudiants — 8 dernières semaines",
          noTrendTitle: "Aucune inscription récente",
          noTrendHint: "Les nouveaux étudiants rattachés à votre licence apparaîtront ici semaine par semaine.",
          noScore: "Pas encore de données",
          recentStudents: "Derniers inscrits",
          noStudents: "Aucun étudiant rattaché à votre licence pour l'instant.",
          joinedOn: "Inscrit le",
          activityBreakdown: "Répartition de l'activité",
          activeLabel: "Actifs (30j)",
          inactiveLabel: "Inactifs",
          noActivityTitle: "Aucune activité pour le moment",
          noActivityHint: "L'activité démarre quand les étudiants importent un CV ou lancent une analyse de matching."
        };

  useEffect(() => {
    getSchoolOverview(user.id)
      .then(setOverview)
      .catch((err) => setError(getFriendlyErrorMessage(err, language)));
    getSchoolStudents(user.id)
      .then((items) =>
        setRecentStudents([...items].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5))
      )
      .catch(() => setRecentStudents([]));
  }, [user.id]);

  if (error) return <p className="field-error">{error}</p>;
  if (!overview) return <AdminPageLoader language={language} />;

  return (
    <section className="admin-dashboard">
      <header className="module-header">
        <h2>{copy.title}</h2>
        <p>{copy.subtitle}</p>
      </header>

      <div className="admin-kpi-grid">
        <AdminKpiCard tone="primary" icon="profile" value={overview.totalStudents} label={copy.students} />
        <AdminKpiCard
          tone="warning"
          icon="save"
          value={`${overview.seatsUsed}/${overview.seatsTotal}`}
          label={copy.seats}
        />
        <AdminKpiCard tone="success" icon="chart" value={`${overview.activationRate}%`} label={copy.activation} />
        <AdminKpiCard tone="primary" icon="upload" value={overview.totalCvs} label={copy.cvs} />
        <AdminKpiCard tone="warning" icon="chart" value={overview.totalMatchRuns} label={copy.matches} />
        <AdminKpiCard
          tone="success"
          icon="scale"
          value={overview.avgScore != null ? `${overview.avgScore}%` : "—"}
          label={copy.avgScore}
        />
        <AdminKpiCard tone="danger" icon="alert" value={overview.inactiveStudents} label={copy.inactive} />
      </div>

      <div className="admin-panel-grid">
        <div className="admin-panel admin-trend-panel">
          <h3>{copy.trend}</h3>
          {overview.signupsTrend?.some((point) => point.count > 0) ? (
            <AdminTrendChart trend={overview.signupsTrend} language={language} />
          ) : (
            <SchoolEmptyState icon="chart" title={copy.noTrendTitle} hint={copy.noTrendHint} />
          )}
        </div>

        <div className="admin-panel admin-trend-panel">
          <h3>{copy.recentStudents}</h3>
          {recentStudents?.length ? (
            <div className="admin-recent-activity">
              {recentStudents.map((student) => (
                <div key={student.id} className="admin-recent-activity-row">
                  <AvatarCircle user={student} />
                  <div>
                    <strong>
                      {student.firstName} {student.lastName}
                    </strong>
                    <span className="muted">{student.email}</span>
                  </div>
                  <span className="admin-recent-activity-time">
                    {copy.joinedOn} {formatDate(student.createdAt)}
                  </span>
                </div>
              ))}
            </div>
          ) : recentStudents ? (
            <SchoolEmptyState icon="profile" title={copy.recentStudents} hint={copy.noStudents} />
          ) : (
            <AdminPageLoader language={language} />
          )}
        </div>

        <div className="admin-panel admin-trend-panel">
          <h3>{copy.activityBreakdown}</h3>
          {overview.totalStudents ? (
            <AdminDonutChart
              segments={[
                {
                  label: copy.activeLabel,
                  value: overview.totalStudents - overview.inactiveStudents,
                  color: "var(--success)"
                },
                { label: copy.inactiveLabel, value: overview.inactiveStudents, color: "var(--danger)" }
              ]}
              emptyLabel={copy.noStudents}
            />
          ) : (
            <SchoolEmptyState icon="chart" title={copy.noActivityTitle} hint={copy.noActivityHint} />
          )}
        </div>
      </div>
    </section>
  );
}

function SchoolStudentsPage({ user, language, initialSearch }) {
  const copy =
    language === "en"
      ? {
          title: "Students",
          subtitle: "Students linked to your school's license.",
          search: "Search by name or email…",
          colName: "Name",
          colJoined: "Joined on",
          colActivity: "Last activity",
          colScore: "Latest score",
          colStatus: "Status",
          colActions: "Actions",
          active: "Active",
          inactive: "Inactive",
          never: "No activity yet",
          totalLabel: "Students",
          activeLabel: "Active accounts",
          scoredLabel: "With match score",
          remove: "Remove",
          removeTitle: "Remove this student",
          removeWarning: "This frees up a seat on your license. The student switches back to the free plan and keeps their data.",
          removeConfirm: "Remove",
          cancel: "Cancel",
          empty: "No student found."
        }
      : {
          title: "Étudiants",
          subtitle: "Étudiants rattachés à la licence de votre établissement.",
          search: "Rechercher par nom ou email…",
          colName: "Nom",
          colJoined: "Inscrit le",
          colActivity: "Dernière activité",
          colScore: "Dernier score",
          colStatus: "Statut",
          colActions: "Actions",
          active: "Actif",
          inactive: "Inactif",
          never: "Aucune activité",
          totalLabel: "Étudiants",
          activeLabel: "Comptes actifs",
          scoredLabel: "Avec score",
          remove: "Retirer",
          removeTitle: "Retirer cet étudiant",
          removeWarning: "Cela libère un siège sur votre licence. L'étudiant repasse au plan gratuit et conserve ses données.",
          removeConfirm: "Retirer",
          cancel: "Annuler",
          empty: "Aucun étudiant trouvé."
        };

  const [students, setStudents] = useState([]);
  const [search, setSearch] = useState(initialSearch || "");
  const [page, setPage] = useState(1);
  const [error, setError] = useState("");

  useEffect(() => {
    if (initialSearch) setSearch(initialSearch);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialSearch]);

  function reload() {
    getSchoolStudents(user.id, { search })
      .then(setStudents)
      .catch((err) => setError(getFriendlyErrorMessage(err, language)));
  }

  useEffect(() => {
    setPage(1);
    setError("");
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const totalPages = Math.max(1, Math.ceil(students.length / ADMIN_PAGE_SIZE));
  const pagedStudents = students.slice((page - 1) * ADMIN_PAGE_SIZE, page * ADMIN_PAGE_SIZE);
  const activeCount = students.filter((student) => student.active).length;
  const scoredCount = students.filter((student) => student.latestScore != null).length;

  async function handleRemove(student) {
    const result = await Swal.fire({
      icon: "warning",
      title: copy.removeTitle,
      html: `<p style="text-align:left;margin-bottom:0.6rem;">${copy.removeWarning}</p><p style="text-align:left;font-weight:700;">${student.firstName} ${student.lastName} · ${student.email}</p>`,
      showCancelButton: true,
      confirmButtonText: copy.removeConfirm,
      cancelButtonText: copy.cancel,
      confirmButtonColor: "#b91c1c",
      focusCancel: true
    });

    if (!result.isConfirmed) return;

    try {
      await removeSchoolStudent(user.id, student.id);
      reload();
      Swal.fire({
        toast: true,
        position: "top-end",
        icon: "success",
        title: language === "en" ? "Student removed." : "Étudiant retiré.",
        showConfirmButton: false,
        timer: 2800,
        timerProgressBar: true,
        customClass: { popup: "career-toast", title: "career-toast-title" }
      });
    } catch (err) {
      Swal.fire({ icon: "error", title: getFriendlyErrorMessage(err, language) });
    }
  }

  return (
    <section className="admin-accounts">
      <header className="module-header">
        <div>
          <h2>{copy.title}</h2>
          <p>{copy.subtitle}</p>
        </div>
        <SchoolExportCsvButton userId={user.id} language={language} />
      </header>

      <div className="admin-module-metrics">
        <AdminMiniMetric icon="profile" label={copy.totalLabel} value={students.length} tone="primary" />
        <AdminMiniMetric icon="chart" label={copy.activeLabel} value={activeCount} tone="success" />
        <AdminMiniMetric icon="scale" label={copy.scoredLabel} value={scoredCount} tone="warning" />
      </div>

      <div className="admin-table-toolbar">
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={copy.search} />
      </div>

      {error ? <p className="field-error">{error}</p> : null}

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>{copy.colName}</th>
              <th>{copy.colJoined}</th>
              <th>{copy.colActivity}</th>
              <th>{copy.colScore}</th>
              <th>{copy.colStatus}</th>
              <th>{copy.colActions}</th>
            </tr>
          </thead>
          <tbody>
            {pagedStudents.length ? (
              pagedStudents.map((student) => (
                <tr key={student.id}>
                  <td>
                    <div className="admin-table-name">
                      <AvatarCircle user={student} />
                      <div>
                        <strong>
                          {student.firstName} {student.lastName}
                        </strong>
                        <span className="muted">{student.email}</span>
                      </div>
                    </div>
                  </td>
                  <td className="muted">{formatDate(student.createdAt)}</td>
                  <td className="muted">{student.lastActivity ? formatDate(student.lastActivity) : copy.never}</td>
                  <td>
                    {student.latestScore != null ? (
                      <span className="tag">{student.latestScore}%</span>
                    ) : (
                      <span className="muted">—</span>
                    )}
                  </td>
                  <td>
                    <span className={`tag ${student.active ? "tag-success" : ""}`}>
                      {student.active ? copy.active : copy.inactive}
                    </span>
                  </td>
                  <td>
                    <div className="admin-row-actions">
                      <button type="button" className="admin-row-action danger" onClick={() => handleRemove(student)}>
                        <UiIcon name="alert" /> {copy.remove}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="admin-table-empty muted">
                  {copy.empty}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <AdminPagination page={page} totalPages={totalPages} onChange={setPage} language={language} totalItems={students.length} />
    </section>
  );
}

function SchoolInvitationsPage({ user, language }) {
  const copy =
    language === "en"
      ? {
          title: "Invitations",
          subtitle: "Invite a student by email — a license seat is reserved automatically.",
          emailLabel: "Student email",
          send: "Send invitation",
          sending: "Sending…",
          colEmail: "Email",
          colCode: "License code",
          colStatus: "Status",
          colSent: "Sent on",
          statusPending: "Pending",
          statusRedeemed: "Accepted",
          sentLabel: "Invitations",
          pendingLabel: "Pending",
          acceptedLabel: "Accepted",
          empty: "No invitation sent yet."
        }
      : {
          title: "Invitations",
          subtitle: "Invitez un étudiant par email — un siège de licence est réservé automatiquement.",
          emailLabel: "Email de l'étudiant",
          send: "Envoyer l'invitation",
          sending: "Envoi…",
          colEmail: "Email",
          colCode: "Code de licence",
          colStatus: "Statut",
          colSent: "Envoyée le",
          statusPending: "En attente",
          statusRedeemed: "Acceptée",
          sentLabel: "Invitations",
          pendingLabel: "En attente",
          acceptedLabel: "Acceptées",
          empty: "Aucune invitation envoyée pour l'instant."
        };

  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [invitations, setInvitations] = useState([]);

  function reload() {
    getSchoolInvitations(user.id)
      .then(setInvitations)
      .catch((err) => setError(getFriendlyErrorMessage(err, language)));
  }

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function submit(event) {
    event.preventDefault();
    setError("");
    setMessage("");
    setSending(true);
    try {
      await sendSchoolInvitation(user.id, email);
      setMessage(language === "en" ? "Invitation sent." : "Invitation envoyée.");
      setEmail("");
      reload();
    } catch (err) {
      setError(getFriendlyErrorMessage(err, language));
    } finally {
      setSending(false);
    }
  }

  const pendingCount = invitations.filter((invite) => invite.status !== "redeemed").length;
  const redeemedCount = invitations.filter((invite) => invite.status === "redeemed").length;

  return (
    <section className="admin-accounts">
      <header className="module-header">
        <h2>{copy.title}</h2>
        <p>{copy.subtitle}</p>
      </header>

      <div className="admin-module-metrics">
        <AdminMiniMetric icon="mail" label={copy.sentLabel} value={invitations.length} tone="primary" />
        <AdminMiniMetric icon="history" label={copy.pendingLabel} value={pendingCount} tone="warning" />
        <AdminMiniMetric icon="shield" label={copy.acceptedLabel} value={redeemedCount} tone="success" />
      </div>

      <form className="admin-inline-form" onSubmit={submit}>
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder={copy.emailLabel}
          required
        />
        <button type="submit" className="btn-main ready" disabled={sending}>
          {sending ? <span className="btn-spinner" /> : null} {sending ? copy.sending : copy.send}
        </button>
      </form>

      {error ? <p className="field-error">{error}</p> : null}
      {message ? <p className="field-hint success">{message}</p> : null}

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>{copy.colEmail}</th>
              <th>{copy.colCode}</th>
              <th>{copy.colStatus}</th>
              <th>{copy.colSent}</th>
            </tr>
          </thead>
          <tbody>
            {invitations.length ? (
              invitations.map((invite) => (
                <tr key={invite.id}>
                  <td>{invite.email}</td>
                  <td className="admin-license-code">{invite.licenseCode}</td>
                  <td>
                    <span className={`tag ${invite.status === "redeemed" ? "tag-success" : ""}`}>
                      {invite.status === "redeemed" ? copy.statusRedeemed : copy.statusPending}
                    </span>
                  </td>
                  <td className="muted">{formatDate(invite.createdAt)}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} className="admin-table-empty muted">
                  {copy.empty}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function SchoolPromotionsPage({ user, language }) {
  const copy = language === "en"
    ? {
        title: "Promotions",
        subtitle: "Organize students by program, campus and academic year.",
        name: "Promotion name",
        program: "Program",
        level: "Level",
        campus: "Campus",
        year: "Academic year",
        create: "Create promotion",
        assign: "Assign a student",
        addStudent: "Add",
        removeStudent: "Remove",
        students: "students",
        empty: "No promotion created yet.",
        delete: "Delete"
      }
    : {
        title: "Promotions",
        subtitle: "Organisez les étudiants par programme, campus et année académique.",
        name: "Nom de la promotion",
        program: "Programme",
        level: "Niveau",
        campus: "Campus",
        year: "Année académique",
        create: "Créer la promotion",
        assign: "Affecter un étudiant",
        addStudent: "Ajouter",
        removeStudent: "Retirer",
        students: "étudiants",
        empty: "Aucune promotion créée pour le moment.",
        delete: "Supprimer"
      };
  const [data, setData] = useState({ items: [], students: [] });
  const [form, setForm] = useState({ name: "", program: "", level: "", campus: "", academicYear: "" });
  const [selectedStudents, setSelectedStudents] = useState({});
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  function reload() {
    getSchoolPromotions(user.id).then(setData).catch((err) => setError(getFriendlyErrorMessage(err, language)));
  }

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.id]);

  async function submit(event) {
    event.preventDefault();
    setError("");
    setSaving(true);
    try {
      await createSchoolPromotion(user.id, form);
      setForm({ name: "", program: "", level: "", campus: "", academicYear: "" });
      reload();
      Swal.fire({ icon: "success", title: language === "en" ? "Promotion created." : "Promotion créée.", timer: 1800, showConfirmButton: false });
    } catch (err) {
      setError(getFriendlyErrorMessage(err, language));
    } finally {
      setSaving(false);
    }
  }

  async function remove(item) {
    const result = await Swal.fire({
      icon: "warning",
      title: language === "en" ? "Delete this promotion?" : "Supprimer cette promotion ?",
      text: item.name,
      showCancelButton: true,
      confirmButtonText: copy.delete,
      cancelButtonText: language === "en" ? "Cancel" : "Annuler",
      confirmButtonColor: "#dc2626"
    });
    if (!result.isConfirmed) return;
    await deleteSchoolPromotion(user.id, item.id);
    reload();
  }

  async function updateStudent(item, action, studentId) {
    const id = studentId || selectedStudents[item.id];
    if (!id) return;
    setError("");
    try {
      await updateSchoolPromotionStudent(user.id, item.id, id, action);
      setSelectedStudents((current) => ({ ...current, [item.id]: "" }));
      reload();
    } catch (err) {
      setError(getFriendlyErrorMessage(err, language));
    }
  }

  return (
    <section className="school-promotions">
      <header className="module-header">
        <h2>{copy.title}</h2>
        <p>{copy.subtitle}</p>
      </header>
      <form className="school-settings-form school-promotion-form" onSubmit={submit}>
        <input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder={copy.name} />
        <input value={form.program} onChange={(event) => setForm({ ...form, program: event.target.value })} placeholder={copy.program} />
        <input value={form.level} onChange={(event) => setForm({ ...form, level: event.target.value })} placeholder={copy.level} />
        <input value={form.campus} onChange={(event) => setForm({ ...form, campus: event.target.value })} placeholder={copy.campus} />
        <input value={form.academicYear} onChange={(event) => setForm({ ...form, academicYear: event.target.value })} placeholder={copy.year} />
        <button className="btn-main ready" disabled={saving}>{saving ? <span className="btn-spinner" /> : null} {copy.create}</button>
      </form>
      {error ? <p className="field-error">{error}</p> : null}
      <div className="school-card-grid">
        {data.items.length ? data.items.map((item) => {
          const assignedIds = new Set(item.studentIds || []);
          const assigned = data.students.filter((student) => assignedIds.has(student.id));
          const available = data.students.filter((student) => !assignedIds.has(student.id));
          return (
            <article key={item.id} className="school-data-card">
              <div>
                <strong>{item.name}</strong>
                <span>{[item.program, item.level, item.campus, item.academicYear].filter(Boolean).join(" · ") || "—"}</span>
              </div>
              <small>{item.studentCount} {copy.students}</small>
              <div className="school-promotion-assign">
                <select
                  value={selectedStudents[item.id] || ""}
                  onChange={(event) => setSelectedStudents((current) => ({ ...current, [item.id]: event.target.value }))}
                >
                  <option value="">{copy.assign}</option>
                  {available.map((student) => (
                    <option key={student.id} value={student.id}>
                      {student.firstName} {student.lastName} · {student.email}
                    </option>
                  ))}
                </select>
                <button type="button" className="btn-ghost" onClick={() => updateStudent(item, "add")} disabled={!selectedStudents[item.id]}>
                  <UiIcon name="plus" /> {copy.addStudent}
                </button>
              </div>
              {assigned.length ? (
                <div className="school-promotion-students">
                  {assigned.map((student) => (
                    <span key={student.id} className="school-promotion-student-pill">
                      <AvatarCircle user={student} />
                      {student.firstName} {student.lastName}
                      <button type="button" onClick={() => updateStudent(item, "remove", student.id)} title={copy.removeStudent}>
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              ) : null}
              <button type="button" className="admin-row-action danger" onClick={() => remove(item)}>
                <UiIcon name="trash" /> {copy.delete}
              </button>
            </article>
          );
        }) : <SchoolEmptyState icon="network" title={copy.title} hint={copy.empty} />}
      </div>
    </section>
  );
}

function maskLicenseCode(code) {
  if (!code) return code;
  const parts = code.split("-");
  if (parts.length < 3) return code.replace(/[A-Z0-9]/g, "•");
  return `${parts[0]}-••••-${parts[parts.length - 1]}`;
}

function SchoolLicenseCard({ item, language, currency, copy }) {
  const [copied, setCopied] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const pct = item.seatsTotal ? Math.min(100, Math.round((item.seatsUsed / item.seatsTotal) * 100)) : 0;
  const remaining = Math.max(0, Number(item.seatsTotal || 0) - Number(item.seatsUsed || 0));

  function handleCopy() {
    navigator.clipboard?.writeText(item.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  return (
    <div className="school-license-card">
      <div className="school-license-card-top">
        <span className="school-license-plan-icon">
          <UiIcon name="save" />
        </span>
        <div className="school-license-plan-meta">
          <strong>{getPlanById(item.planId)?.name?.[language] || item.planId}</strong>
          <span className="muted">
            {copy.created} {formatDate(item.createdAt)}
          </span>
        </div>
        <span className={`tag ${item.revoked ? "tag-danger" : "tag-success"}`}>
          {item.revoked ? copy.revoked : copy.active}
        </span>
      </div>

      <div className="school-license-code-row">
        <span className="school-license-code-pill">{revealed ? item.code : maskLicenseCode(item.code)}</span>
        <button
          type="button"
          className="school-license-reveal-btn"
          onClick={() => setRevealed((prev) => !prev)}
          aria-label={revealed ? copy.hide : copy.reveal}
          title={revealed ? copy.hide : copy.reveal}
        >
          <UiIcon name="eye" />
        </button>
        <button type="button" className="school-license-copy-btn" onClick={handleCopy}>
          {copied ? copy.copied : copy.copy}
        </button>
      </div>

      <div className="school-license-progress">
        <div className="school-license-progress-head">
          <span>{copy.seats}</span>
          <strong>
            {item.seatsUsed}/{item.seatsTotal}
          </strong>
        </div>
        <div className="school-license-bar">
          <div className="school-license-bar-fill" style={{ width: `${pct}%` }} />
        </div>
        <span className="school-license-remaining">
          {pct}% · {remaining} {copy.remaining}
        </span>
      </div>

      <div className="school-license-price">
        <span className="muted">{copy.plan}</span>
        <strong>{planPriceLabel(item.planId, "annual", "Gratuit", currency)}</strong>
      </div>
    </div>
  );
}

function SchoolLicensePage({ user, language, currency }) {
  const copy =
    language === "en"
      ? {
          title: "My license",
          subtitle: "Seats granted by Career App for your institution.",
          seats: "Seats used",
          plan: "Plan",
          created: "Issued on",
          active: "Active",
          revoked: "Revoked",
          copy: "Copy code",
          copied: "Copied!",
          reveal: "Show code",
          hide: "Hide code",
          remaining: "seats left",
          emptyTitle: "No license code yet",
          empty: "Contact Career App to get a license for your institution."
        }
      : {
          title: "Ma licence",
          subtitle: "Sièges accordés par Career App pour votre établissement.",
          seats: "Sièges utilisés",
          plan: "Plan",
          created: "Émise le",
          active: "Active",
          revoked: "Révoquée",
          copy: "Copier le code",
          copied: "Copié !",
          reveal: "Afficher le code",
          hide: "Masquer le code",
          remaining: "sièges restants",
          emptyTitle: "Aucun code de licence",
          empty: "Contactez Career App pour obtenir une licence pour votre établissement."
        };

  const [codes, setCodes] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    getSchoolLicense(user.id)
      .then(setCodes)
      .catch((err) => setError(getFriendlyErrorMessage(err, language)));
  }, [user.id]);

  if (error) return <p className="field-error">{error}</p>;

  return (
    <section className="admin-accounts">
      <header className="module-header">
        <h2>{copy.title}</h2>
        <p>{copy.subtitle}</p>
      </header>

      {codes.length ? (
        <div className="school-license-grid">
          {codes.map((item) => (
            <SchoolLicenseCard key={item.code} item={item} language={language} currency={currency} copy={copy} />
          ))}
        </div>
      ) : (
        <SchoolEmptyState icon="save" title={copy.emptyTitle} hint={copy.empty} />
      )}
    </section>
  );
}

function SchoolEmptyState({ icon, title, hint }) {
  return (
    <div className="school-empty-state">
      <span className="school-empty-icon">
        <UiIcon name={icon} />
      </span>
      <strong>{title}</strong>
      <p>{hint}</p>
    </div>
  );
}

function SchoolInsightsPage({ user, language }) {
  const copy =
    language === "en"
      ? {
          title: "Tracking & employability",
          subtitle: "Aggregated view of your students' match performance.",
          distribution: "Score distribution",
          missing: "Most common missing keywords",
          ranking: "Student ranking by score",
          emptyDistribution: "No score data yet",
          emptyDistributionHint: "This chart fills in as soon as your students run their first CV/offer matches.",
          emptyMissing: "No missing keywords yet",
          emptyMissingHint: "Recurring skill gaps across your students will show up here.",
          emptyRanking: "No ranking yet",
          emptyRankingHint: "Once students have a match score, they'll appear here ranked from best to worst fit."
        }
      : {
          title: "Suivi & employabilité",
          subtitle: "Vue agrégée de la performance de matching de vos étudiants.",
          distribution: "Répartition des scores",
          missing: "Mots-clés manquants les plus fréquents",
          ranking: "Classement des étudiants par score",
          emptyDistribution: "Pas encore de score",
          emptyDistributionHint: "Ce graphique se remplit dès que vos étudiants lancent leurs premières analyses CV/offre.",
          emptyMissing: "Pas encore de mots-clés",
          emptyMissingHint: "Les manques récurrents de compétences chez vos étudiants apparaîtront ici.",
          emptyRanking: "Pas encore de classement",
          emptyRankingHint: "Dès qu'un étudiant obtient un score de matching, il apparaît ici classé du meilleur au moins bon."
        };

  const [insights, setInsights] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    getSchoolInsights(user.id)
      .then(setInsights)
      .catch((err) => setError(getFriendlyErrorMessage(err, language)));
  }, [user.id]);

  if (error) return <p className="field-error">{error}</p>;
  if (!insights) return <p className="muted">…</p>;

  const bucketEntries = Object.entries(insights.scoreBuckets || {});
  const maxBucket = Math.max(1, ...bucketEntries.map(([, count]) => count));
  const hasData = bucketEntries.some(([, count]) => count > 0);

  return (
    <section className="admin-dashboard">
      <header className="module-header">
        <h2>{copy.title}</h2>
        <p>{copy.subtitle}</p>
      </header>

      <div className="admin-panel school-insight-panel">
        <h3>
          <span className="school-panel-icon">
            <UiIcon name="chart" />
          </span>
          {copy.distribution}
        </h3>
        {hasData ? (
          <div className="admin-trend-chart school-score-chart">
            {bucketEntries.map(([label, count]) => (
              <div key={label} className="admin-trend-bar-col">
                <div className="admin-trend-bar-track">
                  <div className="admin-trend-bar" style={{ height: `${Math.max(4, (count / maxBucket) * 100)}%` }}>
                    {count > 0 ? <span>{count}</span> : null}
                  </div>
                </div>
                <span className="admin-trend-label">{label}</span>
              </div>
            ))}
          </div>
        ) : (
          <SchoolEmptyState icon="chart" title={copy.emptyDistribution} hint={copy.emptyDistributionHint} />
        )}
      </div>

      <div className="admin-panel-grid">
        <div className="admin-panel school-insight-panel">
          <h3>
            <span className="school-panel-icon">
              <UiIcon name="network" />
            </span>
            {copy.missing}
          </h3>
          {insights.topMissingKeywords?.length ? (
            <div className="admin-permission-tags">
              {insights.topMissingKeywords.map((item) => (
                <span key={item.keyword} className="tag">
                  {item.keyword} · {item.count}
                </span>
              ))}
            </div>
          ) : (
            <SchoolEmptyState icon="network" title={copy.emptyMissing} hint={copy.emptyMissingHint} />
          )}
        </div>

        <div className="admin-panel school-insight-panel">
          <h3>
            <span className="school-panel-icon">
              <UiIcon name="profile" />
            </span>
            {copy.ranking}
          </h3>
          {insights.ranking?.length ? (
            <div className="school-ranking-list">
              {insights.ranking.slice(0, 10).map((student, index) => (
                <div key={student.id} className="school-ranking-row">
                  <span className={`school-ranking-index ${index < 3 ? "top" : ""}`}>{index + 1}</span>
                  <AvatarCircle user={student} />
                  <div>
                    <strong>
                      {student.firstName} {student.lastName}
                    </strong>
                    <span className="muted">{student.email}</span>
                  </div>
                  <span className="tag tag-success">{student.score}%</span>
                </div>
              ))}
            </div>
          ) : (
            <SchoolEmptyState icon="profile" title={copy.emptyRanking} hint={copy.emptyRankingHint} />
          )}
        </div>
      </div>
    </section>
  );
}

function SchoolReportsPage({ user, language }) {
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

function SchoolSettingsPage({ user, language }) {
  const copy = language === "en"
    ? {
        title: "Institution settings",
        subtitle: "Manage the institution identity separately from the administrator account.",
        adminBlock: "Administrator",
        schoolBlock: "Institution",
        save: "Save settings",
        orgName: "Official institution name",
        acronym: "Acronym / short name",
        orgType: "Type",
        website: "Website",
        emailDomain: "Email domain",
        address: "Address",
        city: "City",
        country: "Country",
        contactName: "Primary contact",
        contactEmail: "Contact email",
        contactPhone: "Contact phone",
        notes: "Internal notes"
      }
    : {
        title: "Paramètres de l'établissement",
        subtitle: "Gérez l'identité de l'établissement séparément du compte administrateur.",
        adminBlock: "Administrateur",
        schoolBlock: "Établissement",
        save: "Enregistrer les paramètres",
        orgName: "Nom officiel de l'établissement",
        acronym: "Sigle",
        orgType: "Type",
        website: "Site web",
        emailDomain: "Domaine email",
        address: "Adresse",
        city: "Ville",
        country: "Pays",
        contactName: "Contact principal",
        contactEmail: "Email de contact",
        contactPhone: "Téléphone de contact",
        notes: "Notes internes"
      };
  const [data, setData] = useState(null);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    getSchoolProfile(user.id)
      .then((payload) => {
        setData(payload);
        setForm(payload.profile || {});
      })
      .catch((err) => setError(getFriendlyErrorMessage(err, language)));
  }, [user.id]);

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleLogoUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type?.startsWith("image/")) {
      setError(language === "en" ? "Please select an image file." : "Veuillez sélectionner une image.");
      event.target.value = "";
      return;
    }
    try {
      // fileToBase64 renvoie le base64 brut sans préfixe "data:" (pensé pour
      // l'upload de CV, où le mimeType part séparément côté serveur) — pour
      // un <img src>, il faut reconstruire une vraie data URL avec son type MIME.
      const content = await fileToBase64(file);
      update("logoDataUrl", `data:${file.type};base64,${content}`);
    } catch (_error) {
      setError(language === "en" ? "Unable to read this image." : "Impossible de lire cette image.");
    } finally {
      event.target.value = "";
    }
  }

  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const payload = await updateSchoolProfile(user.id, form);
      setForm(payload.profile || form);
      Swal.fire({ icon: "success", title: language === "en" ? "Settings saved." : "Paramètres enregistrés.", timer: 1800, showConfirmButton: false });
    } catch (err) {
      setError(getFriendlyErrorMessage(err, language));
    } finally {
      setSaving(false);
    }
  }

  if (!data) return <AdminPageLoader language={language} />;

  return (
    <section className="school-settings">
      <header className="module-header">
        <h2>{copy.title}</h2>
        <p>{copy.subtitle}</p>
      </header>
      <div className="school-settings-grid">
        <article className="admin-panel">
          <h3>{copy.adminBlock}</h3>
          <div className="school-admin-identity">
            <AvatarCircle user={data.admin} />
            <div>
              <strong>{data.admin.firstName} {data.admin.lastName}</strong>
              <span className="muted">{data.admin.email}</span>
            </div>
          </div>
        </article>
        <form className="admin-panel school-settings-form" onSubmit={submit}>
          <h3>{copy.schoolBlock}</h3>
          <div className="school-logo-editor">
            <span className="school-logo-preview">
              {form.logoDataUrl ? <img src={form.logoDataUrl} alt="" /> : <UiIcon name="briefcase" />}
            </span>
            <label className="btn-ghost">
              <UiIcon name="upload" />
              {language === "en" ? "Upload logo" : "Télécharger le logo"}
              <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={handleLogoUpload} />
            </label>
            {form.logoDataUrl ? (
              <button type="button" className="admin-row-action danger" onClick={() => update("logoDataUrl", "")}>
                {language === "en" ? "Remove logo" : "Supprimer le logo"}
              </button>
            ) : null}
          </div>
          <input value={form.organizationName || ""} onChange={(event) => update("organizationName", event.target.value)} placeholder={copy.orgName} />
          <input value={form.acronym || ""} onChange={(event) => update("acronym", event.target.value)} placeholder={copy.acronym} />
          <input value={form.organizationType || ""} onChange={(event) => update("organizationType", event.target.value)} placeholder={copy.orgType} />
          <input value={form.website || ""} onChange={(event) => update("website", event.target.value)} placeholder={copy.website} />
          <input value={form.emailDomain || ""} onChange={(event) => update("emailDomain", event.target.value)} placeholder={copy.emailDomain} />
          <input value={form.address || ""} onChange={(event) => update("address", event.target.value)} placeholder={copy.address} />
          <input value={form.city || ""} onChange={(event) => update("city", event.target.value)} placeholder={copy.city} />
          <input value={form.country || ""} onChange={(event) => update("country", event.target.value)} placeholder={copy.country} />
          <input value={form.primaryContactName || ""} onChange={(event) => update("primaryContactName", event.target.value)} placeholder={copy.contactName} />
          <input value={form.contactEmail || ""} onChange={(event) => update("contactEmail", event.target.value)} placeholder={copy.contactEmail} />
          <input value={form.contactPhone || ""} onChange={(event) => update("contactPhone", event.target.value)} placeholder={copy.contactPhone} />
          <textarea value={form.notes || ""} onChange={(event) => update("notes", event.target.value)} placeholder={copy.notes} />
          {error ? <p className="field-error">{error}</p> : null}
          <button className="btn-main ready" disabled={saving}>{saving ? <span className="btn-spinner" /> : null} {copy.save}</button>
        </form>
      </div>
    </section>
  );
}

const ADMIN_DASHBOARD_ROLES = [
  { id: "student", icon: "profile", color: "#2f5bff" },
  { id: "school", icon: "shield", color: "#0e9f6e" },
  { id: "recruiter_firm", icon: "briefcase", color: "#d97706" }
];

function AdminTrendChart({ trend, language, valueKey = "count", formatValue }) {
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

function AdminDonutChart({ segments, emptyLabel }) {
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

function AdminDashboardPage({ user, language }) {
  const [overview, setOverview] = useState(null);
  const [recentActivity, setRecentActivity] = useState(null);
  const [recentUsers, setRecentUsers] = useState(null);
  const [error, setError] = useState("");
  const copy =
    language === "en"
      ? {
          title: "Dashboard",
          subtitle: "Real-time indicators across the platform.",
          byRole: "Accounts by role",
          cvs: "CVs imported",
          matches: "Matches run",
          signups: "Signups (last 30 days)",
          plans: "Active plans",
          trend: "New signups — last 8 weeks",
          noPlan: "No active plan",
          recentActivity: "Recent activity",
          noActivity: "No activity recorded yet.",
          planDistribution: "Active plans breakdown",
          noPlanData: "No active plan yet.",
          conversionRate: "Free to paid conversion",
          revenueThisMonth: "Revenue this month",
          revenueNoData: "No revenue last month to compare",
          licenseUsage: "License seats used",
          licenseNoSeats: "No license sold yet",
          pendingInvitations: "Pending school invitations",
          emailScoutSearches: "Email Scout searches",
          inactiveAccounts: "Inactive accounts (30d+)",
          latestUsers: "Last 10 signups",
          colUser: "User",
          colRole: "Role",
          colPlan: "Plan",
          colDate: "Signup date",
          noRecentUsers: "No signup yet.",
          planFocus: "Plan overview",
          activeSubscribers: "active subscriber(s)"
        }
      : {
          title: "Dashboard",
          subtitle: "Indicateurs en temps réel de la plateforme.",
          byRole: "Comptes par rôle",
          cvs: "CV importés",
          matches: "Analyses réalisées",
          signups: "Inscriptions (30 derniers jours)",
          plans: "Plans actifs",
          trend: "Nouvelles inscriptions — 8 dernières semaines",
          noPlan: "Aucun plan actif",
          recentActivity: "Activité récente",
          noActivity: "Aucune activité enregistrée pour l'instant.",
          planDistribution: "Répartition des plans actifs",
          noPlanData: "Aucun plan actif pour l'instant.",
          conversionRate: "Conversion gratuit vers payant",
          revenueThisMonth: "Revenu ce mois-ci",
          revenueNoData: "Aucun revenu le mois dernier pour comparer",
          licenseUsage: "Sièges de licence utilisés",
          licenseNoSeats: "Aucune licence vendue pour l'instant",
          pendingInvitations: "Invitations école en attente",
          emailScoutSearches: "Recherches Email Scout",
          inactiveAccounts: "Comptes inactifs (30j+)",
          latestUsers: "10 dernières inscriptions",
          colUser: "Utilisateur",
          colRole: "Rôle",
          colPlan: "Plan",
          colDate: "Inscription",
          noRecentUsers: "Aucune inscription pour le moment.",
          planFocus: "Vue des plans",
          activeSubscribers: "abonné(s) actif(s)"
        };

  const DONUT_COLORS = [
    "var(--primary)",
    "var(--success)",
    "var(--warning)",
    "var(--danger)",
    "var(--primary-2)"
  ];

  useEffect(() => {
    getAdminOverview(user.id)
      .then(setOverview)
      .catch((err) => setError(getFriendlyErrorMessage(err, language)));
    getAdminActivityLog(user.id)
      .then((data) => setRecentActivity(data.items.slice(0, 5)))
      .catch(() => setRecentActivity([]));
    listAdminUsers(user.id)
      .then((items) => {
        const latest = [...items]
          .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
          .slice(0, 10);
        setRecentUsers(latest);
      })
      .catch(() => setRecentUsers([]));
  }, [user.id]);

  if (error) return <p className="field-error">{error}</p>;
  if (!overview) return <p className="muted">…</p>;

  const planEntries = Object.entries(overview.planCounts || {});
  const planSegments = planEntries.map(([planId, count], index) => ({
    label: getPlanById(planId)?.name?.[language] || planId,
    value: count,
    color: DONUT_COLORS[index % DONUT_COLORS.length]
  }));
  const activePlanTotal = planEntries.reduce((total, [, count]) => total + Number(count || 0), 0);

  return (
    <section className="admin-dashboard">
      <header className="module-header">
        <h2>{copy.title}</h2>
        <p>{copy.subtitle}</p>
      </header>

      <div className="admin-kpi-grid">
        <AdminKpiCard tone="primary" icon="upload" value={overview.totalCvs} label={copy.cvs} />
        <AdminKpiCard tone="warning" icon="chart" value={overview.totalMatchRuns} label={copy.matches} />
        <AdminKpiCard tone="success" icon="profile" value={overview.signupsLast30Days} label={copy.signups} />
        <AdminKpiCard tone="danger" icon="pricetag" value={activePlanTotal} label={copy.plans} />
      </div>

      <div className="admin-kpi-grid admin-kpi-grid-secondary">
        <AdminKpiCard
          tone="primary"
          icon="scale"
          value={`${Math.round((overview.conversionRate || 0) * 100)}%`}
          label={copy.conversionRate}
        />
        <AdminKpiCard
          tone="success"
          icon="pricetag"
          value={formatEur(overview.revenueThisMonth, "EUR")}
          label={
            overview.revenueGrowth == null
              ? copy.revenueThisMonth
              : `${copy.revenueThisMonth} (${overview.revenueGrowth >= 0 ? "+" : ""}${Math.round(overview.revenueGrowth * 100)}%)`
          }
        />
        <AdminKpiCard
          tone="warning"
          icon="shield"
          value={overview.licenseSeatsTotal ? `${overview.licenseSeatsUsed}/${overview.licenseSeatsTotal}` : "—"}
          label={copy.licenseUsage}
        />
        <AdminKpiCard tone="primary" icon="mail" value={overview.pendingInvitations} label={copy.pendingInvitations} />
        <AdminKpiCard tone="success" icon="network" value={overview.emailScoutSearches} label={copy.emailScoutSearches} />
        <AdminKpiCard tone="warning" icon="alert" value={overview.inactiveAccounts} label={copy.inactiveAccounts} />
      </div>

      <div className="admin-panel-grid">
        <div className="admin-panel admin-trend-panel">
          <h3>{copy.trend}</h3>
          <AdminTrendChart trend={overview.signupsTrend} language={language} />
        </div>

        <div className="admin-panel admin-trend-panel">
          <h3>{copy.recentActivity}</h3>
          {recentActivity?.length ? (
            <div className="admin-recent-activity">
              {recentActivity.map((event) => (
                <div key={event.id} className="admin-recent-activity-row">
                  <AvatarCircle user={{ firstName: event.userFirstName, lastName: event.userLastName, avatarDataUrl: event.userAvatarDataUrl }} />
                  <div>
                    <strong>
                      {event.userFirstName} {event.userLastName}
                    </strong>
                    <span className="muted">{eventTypeLabel(event.eventType, language)}</span>
                  </div>
                  <span className="admin-recent-activity-time">{formatDate(event.createdAt)}</span>
                </div>
              ))}
            </div>
          ) : recentActivity ? (
            <p className="muted">{copy.noActivity}</p>
          ) : (
            <p className="muted">…</p>
          )}
        </div>

        <div className="admin-panel admin-trend-panel">
          <h3>{copy.planDistribution}</h3>
          <AdminDonutChart segments={planSegments} emptyLabel={copy.noPlanData} />
        </div>
      </div>

      <div className="admin-role-grid">
        {ADMIN_DASHBOARD_ROLES.map((role) => {
          const count = overview.usersByRole?.[role.id] || 0;
          const rolePlans = Object.entries(overview.planCountsByRole?.[role.id] || {});
          return (
            <div key={role.id} className="admin-role-card" style={{ "--role-color": role.color }}>
              <div className="admin-role-card-head">
                <span className="admin-role-icon">
                  <UiIcon name={role.icon} />
                </span>
                <div>
                  <span className="admin-role-count">{count}</span>
                  <span className="admin-role-label">{getAccountLabel(role.id, language)}</span>
                </div>
              </div>
              <ul className="admin-role-plan-list">
                {rolePlans.length ? (
                  rolePlans.map(([planId, planCount]) => (
                    <li key={planId}>
                      <span>{getPlanById(planId)?.name?.[language] || getPlanById(planId)?.name?.fr || planId}</span>
                      <strong>{planCount}</strong>
                    </li>
                  ))
                ) : (
                  <li className="muted">{copy.noPlan}</li>
                )}
              </ul>
            </div>
          );
        })}
      </div>

      <div className="admin-dashboard-insights">
        <div className="admin-panel admin-latest-users-panel">
          <div className="admin-panel-title-row">
            <h3>{copy.latestUsers}</h3>
            <span>{overview.totalUsers || recentUsers?.length || 0}</span>
          </div>
          {recentUsers?.length ? (
            <div className="admin-table-wrap compact">
              <table className="admin-table admin-latest-users-table">
                <thead>
                  <tr>
                    <th>{copy.colUser}</th>
                    <th>{copy.colRole}</th>
                    <th>{copy.colPlan}</th>
                    <th>{copy.colDate}</th>
                  </tr>
                </thead>
                <tbody>
                  {recentUsers.map((item) => {
                    const plan = item.planId ? getPlanById(item.planId) : null;
                    return (
                      <tr key={item.id}>
                        <td>
                          <div className="admin-latest-user-cell">
                            <AvatarCircle user={item} />
                            <div>
                              <strong>
                                {item.firstName} {item.lastName}
                              </strong>
                              <span>{item.email}</span>
                            </div>
                          </div>
                        </td>
                        <td>{getAccountLabel(item.roleType, language)}</td>
                        <td>
                          <span className={`status-pill ${plan ? "active" : "neutral"}`}>
                            {plan?.name?.[language] || plan?.name?.fr || copy.noPlan}
                          </span>
                        </td>
                        <td>{formatDate(item.createdAt)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : recentUsers ? (
            <p className="muted">{copy.noRecentUsers}</p>
          ) : (
            <p className="muted">…</p>
          )}
        </div>

        <div className="admin-panel admin-plan-focus-panel">
          <div className="admin-panel-title-row">
            <h3>{copy.planFocus}</h3>
            <span>{activePlanTotal} {copy.activeSubscribers}</span>
          </div>
          <div className="admin-plan-focus-list">
            {planEntries.length ? (
              planEntries.map(([planId, count]) => {
                const percent = activePlanTotal ? Math.round((Number(count || 0) / activePlanTotal) * 100) : 0;
                return (
                  <div key={planId} className="admin-plan-focus-item">
                    <div>
                      <strong>{getPlanById(planId)?.name?.[language] || getPlanById(planId)?.name?.fr || planId}</strong>
                      <span>{count} {copy.activeSubscribers}</span>
                    </div>
                    <div className="admin-plan-focus-meter" style={{ "--pct": `${percent}%` }}>
                      <span />
                    </div>
                    <em>{percent}%</em>
                  </div>
                );
              })
            ) : (
              <p className="muted">{copy.noPlanData}</p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function AdminPricingPage({ user, language, currency = "EUR" }) {
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
                        {(plan.features[language] || plan.features.fr).slice(0, 4).map((feature) => (
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

const ADMIN_ACCOUNT_SUBTABS = [
  { id: "all", label: { fr: "Tous les comptes", en: "All accounts" } },
  { id: "student", label: { fr: "Étudiants", en: "Students" } },
  { id: "school", label: { fr: "Écoles", en: "Schools" } },
  { id: "recruiter_firm", label: { fr: "Cabinets", en: "Agencies" } },
  { id: "admin", label: { fr: "Administrateurs", en: "Administrators" } }
];

const ADMIN_PAGE_SIZE = 8;

function getPaginationRange(current, total, delta = 1) {
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

function AdminPagination({ page, totalPages, onChange, language, totalItems, pageSize = ADMIN_PAGE_SIZE }) {
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

function AdminOrgCard({ org, language, roleType }) {
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

function AdminAccountsPage({ user, language, currency = "EUR", initialSearch }) {
  const copy =
    language === "en"
      ? {
          title: "Account management",
          subtitle: "Browse every account on the platform and create new ones.",
          firstName: "First name",
          lastName: "Last name",
          email: "Email",
          password: "Password",
          accountType: "Account type",
          plan: "Plan (optional)",
          noPlan: "No plan",
          create: "Create account",
          creating: "Creating…",
          addAccount: "Create an account",
          search: "Search by name or email…",
          createdOn: "Created on",
          colName: "Name",
          colRole: "Role",
          colPlan: "Plan",
          colPrice: "Price",
          colCreated: "Created on",
          colActions: "Actions",
          empty: "No account found.",
          schoolOrgName: "School name",
          agencyOrgName: "Agency name",
          website: "Website (optional)",
          studentSchool: "School / institution (optional)",
          edit: "Edit",
          delete: "Delete",
          editTitle: "Edit account",
          save: "Save changes",
          saving: "Saving…",
          deleteTitle: "Delete this account",
          deleteWarning:
            "This will permanently delete the account and all its data (CVs, match history, license codes). This cannot be undone.",
          deleteConfirmLabel: "Type the account's email to confirm",
          deleteConfirm: "Delete permanently",
          cancel: "Cancel",
          free: "Free",
          adminModulesLabel: "Visible modules",
          adminModulesHint: "Leave everything checked for full access.",
          colPermissions: "Permissions",
          fullAccess: "Full access"
          ,
          colUsage: "Usage",
          colLastLogin: "Last login",
          colStatus: "Status",
          active: "Active",
          suspended: "Suspended",
          suspend: "Suspend",
          reactivate: "Reactivate"
        }
      : {
          title: "Gestion de compte",
          subtitle: "Consultez tous les comptes de la plateforme et créez-en de nouveaux.",
          firstName: "Prénom",
          lastName: "Nom",
          email: "Email",
          password: "Mot de passe",
          accountType: "Type de compte",
          plan: "Plan (optionnel)",
          noPlan: "Aucun plan",
          create: "Créer le compte",
          creating: "Création…",
          addAccount: "Créer un compte",
          search: "Rechercher par nom ou email…",
          createdOn: "Créé le",
          colName: "Nom",
          colRole: "Rôle",
          colPlan: "Plan",
          colPrice: "Tarif",
          colCreated: "Créé le",
          colActions: "Actions",
          schoolOrgName: "Nom de l'école",
          agencyOrgName: "Nom du cabinet",
          website: "Site web (optionnel)",
          studentSchool: "École / établissement (optionnel)",
          empty: "Aucun compte trouvé.",
          edit: "Modifier",
          delete: "Supprimer",
          editTitle: "Modifier le compte",
          save: "Enregistrer",
          saving: "Enregistrement…",
          deleteTitle: "Supprimer ce compte",
          deleteWarning:
            "Cela supprime définitivement le compte et toutes ses données (CV, historique de matching, codes de licence). Action irréversible.",
          deleteConfirmLabel: "Saisissez l'email du compte pour confirmer",
          deleteConfirm: "Supprimer définitivement",
          cancel: "Annuler",
          free: "Gratuit",
          adminModulesLabel: "Modules visibles",
          adminModulesHint: "Laissez tout coché pour un accès complet.",
          colPermissions: "Permissions",
          fullAccess: "Accès complet",
          colUsage: "Usage",
          colLastLogin: "Dernière connexion",
          colStatus: "Statut",
          active: "Actif",
          suspended: "Suspendu",
          suspend: "Suspendre",
          reactivate: "Réactiver"
        };

  const [subTab, setSubTab] = useState("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    accountType: "student",
    planId: "",
    billingCycle: "monthly",
    organizationName: "",
    schoolName: "",
    website: "",
    adminModules: []
  });
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [users, setUsers] = useState([]);
  const [orgAccounts, setOrgAccounts] = useState([]);
  const [search, setSearch] = useState(initialSearch || "");
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (initialSearch) setSearch(initialSearch);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialSearch]);
  const [editTarget, setEditTarget] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState("");

  const isOrgTab = subTab === "school" || subTab === "recruiter_firm";
  const selectedSegment = ADMIN_ACCOUNT_TYPES.find((item) => item.id === form.accountType)?.segment;
  const availablePlans = PLANS.filter((plan) => plan.segment === selectedSegment);
  const editSegment = editForm ? ADMIN_ACCOUNT_TYPES.find((item) => item.id === editForm.accountType)?.segment : null;
  const editAvailablePlans = PLANS.filter((plan) => plan.segment === editSegment);

  function reload() {
    if (isOrgTab) loadOrgAccounts();
    else loadUsers();
  }

  function openEdit(item) {
    setEditTarget(item);
    setEditError("");
    setEditForm({
      firstName: item.firstName,
      lastName: item.lastName,
      accountType: item.roleType,
      planId: item.planId || "",
      billingCycle: item.billingCycle || "monthly",
      organizationName: item.organizationName || "",
      website: item.website || "",
      adminModules: item.adminModules || []
    });
  }

  function toggleAdminModule(setter, moduleId) {
    setter((prev) => {
      const allIds = ADMIN_MODULE_DEFS.map((item) => item.id);
      const current = Array.isArray(prev.adminModules) && prev.adminModules.length ? prev.adminModules : allIds;
      const next = current.includes(moduleId) ? current.filter((id) => id !== moduleId) : [...current, moduleId];
      return { ...prev, adminModules: next.length === allIds.length ? [] : next };
    });
  }

  async function submitEdit(event) {
    event.preventDefault();
    setEditError("");
    setEditSaving(true);
    try {
      await updateAdminUser({
        adminUserId: user.id,
        userId: editTarget.id,
        firstName: editForm.firstName,
        lastName: editForm.lastName,
        organizationName: editForm.organizationName,
        website: editForm.website,
        planId: editForm.planId || null,
        billingCycle: editForm.billingCycle,
        adminModules: editForm.adminModules || []
      });
      setEditTarget(null);
      reload();
    } catch (err) {
      setEditError(getFriendlyErrorMessage(err, language));
    } finally {
      setEditSaving(false);
    }
  }

  async function openDelete(item) {
    const { value: confirmationEmail } = await Swal.fire({
      icon: "warning",
      title: copy.deleteTitle,
      html: `<p style="text-align:left;margin-bottom:0.6rem;">${copy.deleteWarning}</p><p style="text-align:left;font-weight:700;">${item.firstName} ${item.lastName} · ${item.email}</p>`,
      input: "text",
      inputPlaceholder: item.email,
      inputLabel: copy.deleteConfirmLabel,
      showCancelButton: true,
      confirmButtonText: copy.deleteConfirm,
      cancelButtonText: copy.cancel,
      confirmButtonColor: "#b91c1c",
      focusCancel: true,
      preConfirm: (value) => {
        if (value !== item.email) {
          Swal.showValidationMessage(copy.deleteConfirmLabel);
          return false;
        }
        return value;
      }
    });

    if (!confirmationEmail) return;

    try {
      await deleteAdminUser({ adminUserId: user.id, userId: item.id, confirmation: confirmationEmail });
      reload();
      Swal.fire({
        toast: true,
        position: "top-end",
        icon: "success",
        title: language === "en" ? "Account deleted." : "Compte supprimé.",
        showConfirmButton: false,
        timer: 2800,
        timerProgressBar: true,
        customClass: { popup: "career-toast", title: "career-toast-title" }
      });
    } catch (err) {
      Swal.fire({ icon: "error", title: getFriendlyErrorMessage(err, language) });
    }
  }

  async function toggleUserStatus(item) {
    const nextStatus = item.status === "suspended" ? "active" : "suspended";
    const isSuspending = nextStatus === "suspended";
    const result = await Swal.fire({
      icon: isSuspending ? "warning" : "question",
      title: isSuspending
        ? language === "en"
          ? "Suspend this account?"
          : "Suspendre ce compte ?"
        : language === "en"
          ? "Reactivate this account?"
          : "Réactiver ce compte ?",
      html: isSuspending
        ? language === "en"
          ? `<p style="text-align:left;margin:0;">The user will no longer be able to sign in. Active sessions will be closed.</p><p style="text-align:left;font-weight:700;margin-top:0.75rem;">${item.firstName} ${item.lastName} · ${item.email}</p>`
          : `<p style="text-align:left;margin:0;">L'utilisateur ne pourra plus se connecter. Les sessions actives seront fermées.</p><p style="text-align:left;font-weight:700;margin-top:0.75rem;">${item.firstName} ${item.lastName} · ${item.email}</p>`
        : language === "en"
          ? `<p style="text-align:left;margin:0;">This account will be allowed to sign in again.</p><p style="text-align:left;font-weight:700;margin-top:0.75rem;">${item.firstName} ${item.lastName} · ${item.email}</p>`
          : `<p style="text-align:left;margin:0;">Ce compte pourra de nouveau se connecter.</p><p style="text-align:left;font-weight:700;margin-top:0.75rem;">${item.firstName} ${item.lastName} · ${item.email}</p>`,
      showCancelButton: true,
      confirmButtonText: isSuspending ? copy.suspend : copy.reactivate,
      cancelButtonText: copy.cancel,
      confirmButtonColor: isSuspending ? "#dc2626" : "#4f46e5",
      focusCancel: true
    });
    if (!result.isConfirmed) return;

    try {
      await updateAdminUserStatus({ adminUserId: user.id, userId: item.id, status: nextStatus });
      reload();
      Swal.fire({
        toast: true,
        position: "top-end",
        icon: "success",
        title: isSuspending
          ? language === "en"
            ? "Account suspended."
            : "Compte suspendu."
          : language === "en"
            ? "Account reactivated."
            : "Compte réactivé.",
        showConfirmButton: false,
        timer: 2500,
        timerProgressBar: true,
        customClass: { popup: "career-toast", title: "career-toast-title" }
      });
    } catch (err) {
      Swal.fire({ icon: "error", title: getFriendlyErrorMessage(err, language) });
    }
  }

  function loadUsers() {
    listAdminUsers(user.id, { search, roleType: subTab === "all" ? "" : subTab })
      .then(setUsers)
      .catch((err) => setError(getFriendlyErrorMessage(err, language)));
  }

  function loadOrgAccounts() {
    getAdminOrgAccounts(user.id, subTab)
      .then(setOrgAccounts)
      .catch((err) => setError(getFriendlyErrorMessage(err, language)));
  }

  useEffect(() => {
    setPage(1);
    setError("");
    if (isOrgTab) {
      loadOrgAccounts();
    } else {
      loadUsers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subTab, search]);

  const totalPages = Math.max(1, Math.ceil(users.length / ADMIN_PAGE_SIZE));
  const pagedUsers = users.slice((page - 1) * ADMIN_PAGE_SIZE, page * ADMIN_PAGE_SIZE);

  function updateField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function submit(event) {
    event.preventDefault();
    setError("");
    setMessage("");
    setCreating(true);
    try {
      const result = await createAdminUser({
        adminUserId: user.id,
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        password: form.password,
        accountType: form.accountType,
        planId: form.planId || null,
        billingCycle: form.billingCycle,
        organizationName: form.organizationName,
        schoolName: form.schoolName,
        website: form.website,
        adminModules: form.accountType === "admin" ? form.adminModules : undefined
      });
      setMessage(
        result.licenseCode
          ? language === "en"
            ? `Account created. License code: ${result.licenseCode}`
            : `Compte créé. Code de licence : ${result.licenseCode}`
          : language === "en"
          ? "Account created."
          : "Compte créé."
      );
      setForm({
        firstName: "",
        lastName: "",
        email: "",
        password: "",
        accountType: "student",
        planId: "",
        billingCycle: "monthly",
        organizationName: "",
        schoolName: "",
        website: "",
        adminModules: []
      });
      if (isOrgTab) loadOrgAccounts();
      else loadUsers();
    } catch (err) {
      setError(getFriendlyErrorMessage(err, language));
    } finally {
      setCreating(false);
    }
  }

  return (
    <section className="admin-accounts">
      <header className="module-header admin-accounts-header">
        <div>
          <h2>{copy.title}</h2>
          <p>{copy.subtitle}</p>
        </div>
        <div className="admin-header-actions">
          <AdminExportCsvButton adminUserId={user.id} path="/admin/export/accounts" language={language} />
          <button type="button" className="btn-main ready" onClick={() => setCreateOpen(true)}>
            <UiIcon name="profile" /> {copy.addAccount}
          </button>
        </div>
      </header>

      <div className="admin-subtabs">
        {ADMIN_ACCOUNT_SUBTABS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`admin-subtab ${subTab === item.id ? "active" : ""}`}
            onClick={() => setSubTab(item.id)}
          >
            {item.label[language] || item.label.fr}
          </button>
        ))}
      </div>

      {!isOrgTab ? (
        <>
          <div className="admin-table-toolbar">
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={copy.search} />
          </div>

          {error ? <p className="field-error">{error}</p> : null}

          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>{copy.colName}</th>
                  <th>{copy.colRole}</th>
                  {subTab !== "admin" ? <th>{copy.colPlan}</th> : null}
                  {subTab !== "admin" ? <th>{copy.colPrice}</th> : null}
                  {subTab === "admin" ? <th>{copy.colPermissions}</th> : null}
                  {subTab !== "admin" ? <th>{copy.colUsage}</th> : null}
                  <th>{copy.colLastLogin}</th>
                  <th>{copy.colStatus}</th>
                  <th>{copy.colCreated}</th>
                  <th>{copy.colActions}</th>
                </tr>
              </thead>
              <tbody>
                {pagedUsers.length ? (
                  pagedUsers.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <div className="admin-table-name">
                          <AvatarCircle user={item} />
                          <div>
                            <strong>
                              {item.firstName} {item.lastName}
                            </strong>
                            <span className="muted">{item.email}</span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="tag">{getAccountLabel(item.roleType, language)}</span>
                      </td>
                      {subTab !== "admin" ? (
                        <td>
                          {item.planId ? (
                            <span className="tag">{getPlanById(item.planId)?.name?.[language] || item.planId}</span>
                          ) : (
                            <span className="muted">{copy.noPlan}</span>
                          )}
                        </td>
                      ) : null}
                      {subTab !== "admin" ? (
                        <td className="muted">{planPriceLabel(item.planId, item.billingCycle, copy.free, currency)}</td>
                      ) : null}
                      {subTab === "admin" ? (
                        <td>
                          {item.adminModules?.length ? (
                            <div className="admin-permission-tags">
                              {item.adminModules.map((moduleId) => (
                                <span key={moduleId} className="tag">
                                  {ADMIN_MODULE_LABELS[moduleId]?.[language] || ADMIN_MODULE_LABELS[moduleId]?.fr || moduleId}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="tag tag-success">{copy.fullAccess}</span>
                          )}
                        </td>
                      ) : null}
                      {subTab !== "admin" ? (
                        <td>
                          <div className="admin-usage-stack">
                            <span>{item.cvCount || 0} CV</span>
                            <span>{item.matchCount || 0} analyses</span>
                          </div>
                        </td>
                      ) : null}
                      <td className="muted">{item.lastLoginAt ? formatDate(item.lastLoginAt) : "—"}</td>
                      <td>
                        <span className={`tag ${item.status === "suspended" ? "tag-danger" : "tag-success"}`}>
                          {item.status === "suspended" ? copy.suspended : copy.active}
                        </span>
                      </td>
                      <td className="muted">{formatDate(item.createdAt)}</td>
                      <td>
                        <div className="admin-row-actions">
                          <button type="button" className="admin-row-action" onClick={() => openEdit(item)}>
                            <UiIcon name="edit" /> {copy.edit}
                          </button>
                          {item.roleType !== "admin" ? (
                            <>
                              <button type="button" className="admin-row-action" onClick={() => toggleUserStatus(item)}>
                                <UiIcon name="shield" /> {item.status === "suspended" ? copy.reactivate : copy.suspend}
                              </button>
                              <button type="button" className="admin-row-action danger" onClick={() => openDelete(item)}>
                                <UiIcon name="alert" /> {copy.delete}
                              </button>
                            </>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={subTab === "admin" ? 7 : 9} className="admin-table-empty muted">
                      {copy.empty}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <AdminPagination page={page} totalPages={totalPages} onChange={setPage} language={language} totalItems={users.length} />
        </>
      ) : (
        <div className="admin-org-list">
          {error ? <p className="field-error">{error}</p> : null}
          {orgAccounts.length ? (
            orgAccounts.map((org) => <AdminOrgCard key={org.id} org={org} language={language} roleType={subTab} />)
          ) : (
            <p className="muted">{copy.empty}</p>
          )}
        </div>
      )}

      {createOpen ? (
        <div className="modal-overlay" onMouseDown={() => setCreateOpen(false)}>
          <div className="admin-create-modal" onMouseDown={(event) => event.stopPropagation()}>
            <button type="button" className="modal-close" onClick={() => setCreateOpen(false)} aria-label="Fermer">
              ×
            </button>
            <h3>{copy.addAccount}</h3>
            <form onSubmit={submit}>
              <div className="admin-form-grid">
                <label>
                  {copy.firstName}
                  <input value={form.firstName} onChange={(event) => updateField("firstName", event.target.value)} required />
                </label>
                <label>
                  {copy.lastName}
                  <input value={form.lastName} onChange={(event) => updateField("lastName", event.target.value)} required />
                </label>
                <label>
                  {copy.email}
                  <input type="email" value={form.email} onChange={(event) => updateField("email", event.target.value)} required />
                </label>
                <label>
                  {copy.password}
                  <input
                    type="password"
                    minLength={8}
                    value={form.password}
                    onChange={(event) => updateField("password", event.target.value)}
                    required
                  />
                </label>
                <label>
                  {copy.accountType}
                  <select value={form.accountType} onChange={(event) => updateField("accountType", event.target.value)}>
                    {ADMIN_ACCOUNT_TYPES.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.label[language] || item.label.fr}
                      </option>
                    ))}
                  </select>
                </label>
                {form.accountType !== "admin" ? (
                  <label>
                    {copy.plan}
                    <select value={form.planId} onChange={(event) => updateField("planId", event.target.value)}>
                      <option value="">{copy.noPlan}</option>
                      {availablePlans.map((plan) => (
                        <option key={plan.id} value={plan.id}>
                          {plan.name[language] || plan.name.fr}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : null}

                {form.accountType === "school" ? (
                  <>
                    <label>
                      {copy.schoolOrgName}
                      <input
                        value={form.organizationName}
                        onChange={(event) => updateField("organizationName", event.target.value)}
                        required
                      />
                    </label>
                    <label>
                      {copy.website}
                      <input value={form.website} onChange={(event) => updateField("website", event.target.value)} />
                    </label>
                  </>
                ) : null}

                {form.accountType === "recruiter_firm" ? (
                  <>
                    <label>
                      {copy.agencyOrgName}
                      <input
                        value={form.organizationName}
                        onChange={(event) => updateField("organizationName", event.target.value)}
                        required
                      />
                    </label>
                    <label>
                      {copy.website}
                      <input value={form.website} onChange={(event) => updateField("website", event.target.value)} />
                    </label>
                  </>
                ) : null}

                {form.accountType === "student" ? (
                  <label>
                    {copy.studentSchool}
                    <input value={form.schoolName} onChange={(event) => updateField("schoolName", event.target.value)} />
                  </label>
                ) : null}
              </div>

              {form.accountType === "admin" ? (
                <div className="admin-permissions-block">
                  <strong>{copy.adminModulesLabel}</strong>
                  <p className="muted">{copy.adminModulesHint}</p>
                  <div className="admin-permissions-grid">
                    {ADMIN_MODULE_DEFS.map((moduleDef) => (
                      <label key={moduleDef.id} className="admin-permission-check">
                        <input
                          type="checkbox"
                          checked={!form.adminModules.length || form.adminModules.includes(moduleDef.id)}
                          onChange={() => toggleAdminModule(setForm, moduleDef.id)}
                        />
                        {ADMIN_MODULE_LABELS[moduleDef.id][language] || ADMIN_MODULE_LABELS[moduleDef.id].fr}
                      </label>
                    ))}
                  </div>
                </div>
              ) : null}

              {error ? <p className="field-error">{error}</p> : null}
              {message ? <p className="field-hint success">{message}</p> : null}

              <button type="submit" className="btn-main ready" disabled={creating}>
                {creating ? <span className="btn-spinner" /> : null} {creating ? copy.creating : copy.create}
              </button>
            </form>
          </div>
        </div>
      ) : null}

      {editTarget ? (
        <div className="modal-overlay" onMouseDown={() => setEditTarget(null)}>
          <div className="admin-create-modal" onMouseDown={(event) => event.stopPropagation()}>
            <button type="button" className="modal-close" onClick={() => setEditTarget(null)} aria-label="Fermer">
              ×
            </button>
            <h3>{copy.editTitle}</h3>
            <form onSubmit={submitEdit}>
              <div className="admin-form-grid">
                <label>
                  {copy.firstName}
                  <input
                    value={editForm.firstName}
                    onChange={(event) => setEditForm((prev) => ({ ...prev, firstName: event.target.value }))}
                    required
                  />
                </label>
                <label>
                  {copy.lastName}
                  <input
                    value={editForm.lastName}
                    onChange={(event) => setEditForm((prev) => ({ ...prev, lastName: event.target.value }))}
                    required
                  />
                </label>
                {editForm.accountType !== "admin" ? (
                  <label>
                    {copy.plan}
                    <select
                      value={editForm.planId}
                      onChange={(event) => setEditForm((prev) => ({ ...prev, planId: event.target.value }))}
                    >
                      <option value="">{copy.noPlan}</option>
                      {editAvailablePlans.map((plan) => (
                        <option key={plan.id} value={plan.id}>
                          {plan.name[language] || plan.name.fr}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : null}
                {(editForm.accountType === "school" || editForm.accountType === "recruiter_firm") ? (
                  <>
                    <label>
                      {editForm.accountType === "school" ? copy.schoolOrgName : copy.agencyOrgName}
                      <input
                        value={editForm.organizationName}
                        onChange={(event) => setEditForm((prev) => ({ ...prev, organizationName: event.target.value }))}
                      />
                    </label>
                    <label>
                      {copy.website}
                      <input
                        value={editForm.website}
                        onChange={(event) => setEditForm((prev) => ({ ...prev, website: event.target.value }))}
                      />
                    </label>
                  </>
                ) : null}
              </div>

              {editForm.accountType === "admin" ? (
                <div className="admin-permissions-block">
                  <strong>{copy.adminModulesLabel}</strong>
                  <p className="muted">{copy.adminModulesHint}</p>
                  <div className="admin-permissions-grid">
                    {ADMIN_MODULE_DEFS.map((moduleDef) => (
                      <label key={moduleDef.id} className="admin-permission-check">
                        <input
                          type="checkbox"
                          checked={!editForm.adminModules?.length || editForm.adminModules.includes(moduleDef.id)}
                          onChange={() => toggleAdminModule(setEditForm, moduleDef.id)}
                        />
                        {ADMIN_MODULE_LABELS[moduleDef.id][language] || ADMIN_MODULE_LABELS[moduleDef.id].fr}
                      </label>
                    ))}
                  </div>
                </div>
              ) : null}

              {editError ? <p className="field-error">{editError}</p> : null}

              <div className="admin-modal-actions">
                <button type="button" className="btn-ghost" onClick={() => setEditTarget(null)}>
                  {copy.cancel}
                </button>
                <button type="submit" className="btn-main ready" disabled={editSaving}>
                  {editSaving ? <span className="btn-spinner" /> : null} {editSaving ? copy.saving : copy.save}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

    </section>
  );
}

const ADMIN_FINANCE_SOURCES = [
  { id: "", label: { fr: "Toutes les sources", en: "All sources" } },
  { id: "stripe", label: { fr: "Stripe (paiement réel)", en: "Stripe (real payment)" } },
  { id: "instant", label: { fr: "Activation instantanée", en: "Instant activation" } },
  { id: "license_redeem", label: { fr: "Code de licence", en: "License code" } },
  { id: "admin_created", label: { fr: "Créé par l'admin", en: "Created by admin" } }
];

function formatEur(amount, currency = "EUR") {
  return formatAmountInCurrency(amount, currency, { decimals: true });
}

function planPriceLabel(planId, billingCycle, freeLabel, currency = "EUR") {
  const plan = getPlanById(planId);
  if (!plan) return "—";
  if (plan.monthlyPrice === 0 && plan.annualPrice === 0) return freeLabel || "Gratuit";
  if (plan.monthlyPrice == null) return formatEur(plan.annualPrice, currency);
  const amount = billingCycle === "annual" ? plan.annualPrice : plan.monthlyPrice;
  return `${formatEur(amount, currency)} / ${billingCycle === "annual" ? "an" : "mois"}`;
}

function AdminMiniMetric({ label, value, icon = "chart", tone = "" }) {
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

function AdminCvsPage({ user, language }) {
  const copy =
    language === "en"
      ? {
          title: "Uploaded CVs",
          subtitle: "Every CV saved in the platform, with extraction status and quick actions.",
          search: "Search by user, file, skill…",
          all: "All statuses",
          extracted: "Extracted",
          partial: "Partial",
          needsReview: "Needs review",
          colCv: "CV",
          colUser: "User",
          colStatus: "Status",
          colData: "Extracted data",
          colActions: "Actions",
          reanalyze: "Reanalyze",
          delete: "Delete",
          empty: "No CV found."
        }
      : {
          title: "CV importés",
          subtitle: "Tous les CV enregistrés dans la plateforme, avec statut d'extraction et actions rapides.",
          search: "Rechercher par utilisateur, fichier, compétence…",
          all: "Tous les statuts",
          extracted: "Extrait",
          partial: "Partiel",
          needsReview: "À revoir",
          colCv: "CV",
          colUser: "Utilisateur",
          colStatus: "Statut",
          colData: "Données extraites",
          colActions: "Actions",
          reanalyze: "Réanalyser",
          delete: "Supprimer",
          empty: "Aucun CV trouvé."
        };
  const [data, setData] = useState({ items: [], statusCounts: {} });
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState("");
  const [loading, setLoading] = useState(true);

  function reload() {
    setLoading(true);
    getAdminCvs(user.id, { search, status })
      .then(setData)
      .catch((err) => setError(getFriendlyErrorMessage(err, language)))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    setPage(1);
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, status]);

  async function handleReanalyze(item) {
    setBusyId(item.id);
    try {
      await reanalyzeAdminCv({ adminUserId: user.id, cvId: item.id });
      reload();
    } catch (err) {
      Swal.fire({ icon: "error", title: getFriendlyErrorMessage(err, language) });
    } finally {
      setBusyId("");
    }
  }

  async function handleDelete(item) {
    const result = await Swal.fire({
      icon: "warning",
      title: language === "en" ? "Delete this CV?" : "Supprimer ce CV ?",
      text: item.fileName,
      showCancelButton: true,
      confirmButtonText: copy.delete,
      cancelButtonText: language === "en" ? "Cancel" : "Annuler",
      confirmButtonColor: "#dc2626"
    });
    if (!result.isConfirmed) return;
    setBusyId(item.id);
    try {
      await deleteAdminCv({ adminUserId: user.id, cvId: item.id });
      reload();
    } catch (err) {
      Swal.fire({ icon: "error", title: getFriendlyErrorMessage(err, language) });
    } finally {
      setBusyId("");
    }
  }

  const statusCopy = { extracted: copy.extracted, partial: copy.partial, needs_review: copy.needsReview };
  const totalPages = Math.max(1, Math.ceil(data.items.length / ADMIN_PAGE_SIZE));
  const pagedItems = data.items.slice((page - 1) * ADMIN_PAGE_SIZE, page * ADMIN_PAGE_SIZE);

  return (
    <section className="admin-cvs admin-module-pro">
      <header className="module-header">
        <h2>{copy.title}</h2>
        <p>{copy.subtitle}</p>
      </header>
      <div className="admin-module-metrics">
        <AdminMiniMetric icon="save" label={copy.extracted} value={data.statusCounts?.extracted || 0} tone="success" />
        <AdminMiniMetric icon="alert" label={copy.partial} value={data.statusCounts?.partial || 0} tone="warning" />
        <AdminMiniMetric icon="shield" label={copy.needsReview} value={data.statusCounts?.needs_review || 0} tone="danger" />
      </div>
      <div className="admin-table-toolbar split">
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={copy.search} />
        <select value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="">{copy.all}</option>
          <option value="extracted">{copy.extracted}</option>
          <option value="partial">{copy.partial}</option>
          <option value="needs_review">{copy.needsReview}</option>
        </select>
      </div>
      {error ? <p className="field-error">{error}</p> : null}
      {loading ? <AdminPageLoader language={language} /> : null}
      {!loading && !error ? (
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>{copy.colCv}</th>
              <th>{copy.colUser}</th>
              <th>{copy.colStatus}</th>
              <th>{copy.colData}</th>
              <th>{copy.colActions}</th>
            </tr>
          </thead>
          <tbody>
            {pagedItems.length ? pagedItems.map((item) => (
              <tr key={item.id}>
                <td>
                  <strong>{item.fileName}</strong>
                  <span className="muted admin-block-muted">{formatDate(item.createdAt)} · {item.characterCount} car.</span>
                </td>
                <td>
                  <div className="admin-table-name">
                    <AvatarCircle user={{ firstName: item.userFirstName, lastName: item.userLastName, avatarDataUrl: item.userAvatarDataUrl }} />
                    <div>
                      <strong>{item.userFirstName} {item.userLastName}</strong>
                      <span className="muted">{item.userEmail}</span>
                    </div>
                  </div>
                </td>
                <td><span className={`tag ${item.status === "extracted" ? "tag-success" : item.status === "needs_review" ? "tag-danger" : ""}`}>{statusCopy[item.status] || item.status}</span></td>
                <td>
                  <div className="admin-extract-preview">
                    <strong>{item.preview.headline || `${item.preview.firstName} ${item.preview.lastName}`.trim() || "—"}</strong>
                    <span>{item.extraction.counts.skills} skills · {item.extraction.counts.experiences} exp. · {item.extraction.counts.education} formations</span>
                    <small>{item.preview.skills.slice(0, 5).join(", ")}</small>
                  </div>
                </td>
                <td>
                  <div className="admin-row-actions">
                    <button type="button" className="admin-row-action" disabled={busyId === item.id} onClick={() => handleReanalyze(item)}>
                      <UiIcon name="history" /> {copy.reanalyze}
                    </button>
                    <button type="button" className="admin-row-action danger" disabled={busyId === item.id} onClick={() => handleDelete(item)}>
                      <UiIcon name="trash" /> {copy.delete}
                    </button>
                  </div>
                </td>
              </tr>
            )) : (
              <tr><td colSpan={5} className="admin-table-empty muted">{copy.empty}</td></tr>
            )}
          </tbody>
        </table>
      </div>
      ) : null}
      <AdminPagination page={page} totalPages={totalPages} onChange={setPage} language={language} totalItems={data.items.length} />
    </section>
  );
}

function AdminMatchesPage({ user, language }) {
  const copy = language === "en"
    ? { title: "Analyzed jobs", subtitle: "CV/job matching history and market signals from real user analyses.", search: "Search by user, job, company…", avg: "Average score", skills: "Top skills", sectors: "Top sectors", colJob: "Job", colUser: "User", colScore: "Score", colSignals: "Signals", empty: "No analyzed job yet." }
    : { title: "Offres analysées", subtitle: "Historique des matchings CV/offres et signaux métier issus des vraies analyses.", search: "Rechercher par utilisateur, poste, entreprise…", avg: "Score moyen", skills: "Compétences demandées", sectors: "Secteurs fréquents", colJob: "Offre", colUser: "Utilisateur", colScore: "Score", colSignals: "Signaux", empty: "Aucune offre analysée." };
  const [data, setData] = useState({ items: [], topSkills: [], topSectors: [], averageScore: null });
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    setPage(1);
    setLoading(true);
    getAdminMatches(user.id, { search }).then(setData).catch((err) => setError(getFriendlyErrorMessage(err, language))).finally(() => setLoading(false));
  }, [user.id, search, language]);
  const totalPages = Math.max(1, Math.ceil(data.items.length / ADMIN_PAGE_SIZE));
  const pagedItems = data.items.slice((page - 1) * ADMIN_PAGE_SIZE, page * ADMIN_PAGE_SIZE);
  return (
    <section className="admin-matches admin-module-pro">
      <header className="module-header"><h2>{copy.title}</h2><p>{copy.subtitle}</p></header>
      <div className="admin-module-split">
        <div className="admin-signal-card"><AdminMiniMetric icon="chart" label={copy.avg} value={data.averageScore == null ? "—" : `${data.averageScore}/100`} /></div>
        <div className="admin-signal-card"><h3>{copy.skills}</h3><div className="admin-chip-cloud">{data.topSkills.map((item) => <span key={item.name}>{item.name}<strong>{item.count}</strong></span>)}</div></div>
        <div className="admin-signal-card"><h3>{copy.sectors}</h3><div className="admin-chip-cloud">{data.topSectors.map((item) => <span key={item.name}>{item.name}<strong>{item.count}</strong></span>)}</div></div>
      </div>
      <div className="admin-table-toolbar"><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={copy.search} /></div>
      {error ? <p className="field-error">{error}</p> : null}
      {loading ? <AdminPageLoader language={language} /> : null}
      {!loading ? (
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead><tr><th>{copy.colJob}</th><th>{copy.colUser}</th><th>{copy.colScore}</th><th>{copy.colSignals}</th></tr></thead>
          <tbody>
            {pagedItems.length ? pagedItems.map((item) => (
              <tr key={item.id}>
                <td><strong>{item.title || "—"}</strong><span className="muted admin-block-muted">{item.company || "—"} · {item.location || "—"} · {formatDate(item.createdAt)}</span></td>
                <td><div className="admin-table-name"><AvatarCircle user={{ firstName: item.userFirstName, lastName: item.userLastName, avatarDataUrl: item.userAvatarDataUrl }} /><div><strong>{item.userFirstName} {item.userLastName}</strong><span className="muted">{item.userEmail}</span></div></div></td>
                <td><span className={`tag ${Number(item.score) >= 75 ? "tag-success" : Number(item.score) < 50 ? "tag-danger" : ""}`}>{item.score == null ? "—" : `${item.score}/100`}</span></td>
                <td><div className="admin-chip-cloud compact">{[...item.technicalSkills.slice(0, 4), ...item.missingKeywords.slice(0, 3)].map((skill) => <span key={skill}>{skill}</span>)}</div></td>
              </tr>
            )) : <tr><td colSpan={4} className="admin-table-empty muted">{copy.empty}</td></tr>}
          </tbody>
        </table>
      </div>
      ) : null}
      <AdminPagination page={page} totalPages={totalPages} onChange={setPage} language={language} totalItems={data.items.length} />
    </section>
  );
}

function AdminQualityPage({ user, language }) {
  const copy = language === "en"
    ? { title: "Extraction quality", subtitle: "CVs that deserve manual review before they damage matching quality.", search: "Search suspicious CVs…", needs: "Needs review", partial: "Partial", colCv: "CV", colUser: "User", colIssues: "Issues", colScore: "Quality", empty: "No quality issue detected." }
    : { title: "Qualité extraction", subtitle: "CV à contrôler manuellement avant qu'ils dégradent la qualité du matching.", search: "Rechercher les CV suspects…", needs: "À revoir", partial: "Partiels", colCv: "CV", colUser: "Utilisateur", colIssues: "Points à corriger", colScore: "Qualité", empty: "Aucun problème qualité détecté." };
  const [data, setData] = useState({ items: [], totals: {} });
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    setPage(1);
    setLoading(true);
    getAdminQuality(user.id, { search }).then(setData).catch((err) => setError(getFriendlyErrorMessage(err, language))).finally(() => setLoading(false));
  }, [user.id, search, language]);
  const totalPages = Math.max(1, Math.ceil(data.items.length / ADMIN_PAGE_SIZE));
  const pagedItems = data.items.slice((page - 1) * ADMIN_PAGE_SIZE, page * ADMIN_PAGE_SIZE);
  return (
    <section className="admin-quality admin-module-pro">
      <header className="module-header"><h2>{copy.title}</h2><p>{copy.subtitle}</p></header>
      <div className="admin-module-metrics">
        <AdminMiniMetric icon="alert" label={copy.needs} value={data.totals?.needsReview || 0} tone="danger" />
        <AdminMiniMetric icon="shield" label={copy.partial} value={data.totals?.partial || 0} tone="warning" />
      </div>
      <div className="admin-table-toolbar"><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={copy.search} /></div>
      {error ? <p className="field-error">{error}</p> : null}
      {loading ? <AdminPageLoader language={language} /> : null}
      {!loading ? (
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead><tr><th>{copy.colCv}</th><th>{copy.colUser}</th><th>{copy.colIssues}</th><th>{copy.colScore}</th></tr></thead>
          <tbody>{pagedItems.length ? pagedItems.map((item) => (
            <tr key={item.id}>
              <td><strong>{item.fileName}</strong><span className="muted admin-block-muted">{formatDate(item.createdAt)}</span></td>
              <td><div className="admin-table-name"><AvatarCircle user={{ firstName: item.userFirstName, lastName: item.userLastName, avatarDataUrl: item.userAvatarDataUrl }} /><div><strong>{item.userFirstName} {item.userLastName}</strong><span className="muted">{item.userEmail}</span></div></div></td>
              <td><div className="admin-chip-cloud compact">{[...item.missing, ...item.suspicious].map((issue) => <span key={issue}>{issue}</span>)}</div></td>
              <td><span className={`tag ${item.score >= 75 ? "tag-success" : item.score < 55 ? "tag-danger" : ""}`}>{item.score}/100</span></td>
            </tr>
          )) : <tr><td colSpan={4} className="admin-table-empty muted">{copy.empty}</td></tr>}</tbody>
        </table>
      </div>
      ) : null}
      <AdminPagination page={page} totalPages={totalPages} onChange={setPage} language={language} totalItems={data.items.length} />
    </section>
  );
}

function AdminAiMonitoringPage({ user, language }) {
  const copy = language === "en"
    ? { title: "AI monitoring", subtitle: "Operational view of extraction and matching reliability.", success: "Successful extractions", failed: "Needs review", partial: "Partial", runs: "Match analyses", cost: "Estimated cost", avg: "Average score", invalid: "Invalid responses / weak extractions" }
    : { title: "Monitoring IA", subtitle: "Vue opérationnelle de la fiabilité extraction et matching.", success: "Extractions réussies", failed: "À revoir", partial: "Partielles", runs: "Analyses matching", cost: "Coût estimé", avg: "Score moyen", invalid: "Réponses invalides / extractions faibles" };
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => {
    getAdminAiMonitoring(user.id).then(setData).catch((err) => setError(getFriendlyErrorMessage(err, language)));
  }, [user.id, language]);
  if (error) return <p className="field-error">{error}</p>;
  if (!data) return <AdminPageLoader language={language} />;
  return (
    <section className="admin-ai-monitoring admin-module-pro">
      <header className="module-header"><h2>{copy.title}</h2><p>{copy.subtitle}</p></header>
      <div className="admin-module-metrics wide">
        <AdminMiniMetric icon="shield" label={copy.success} value={data.successfulExtractions} tone="success" />
        <AdminMiniMetric icon="alert" label={copy.partial} value={data.partialExtractions} tone="warning" />
        <AdminMiniMetric icon="alert" label={copy.failed} value={data.failedExtractions} tone="danger" />
        <AdminMiniMetric icon="chart" label={copy.runs} value={data.totalMatchRuns} />
        <AdminMiniMetric icon="scale" label={copy.cost} value={`${data.estimatedCost.amount} ${data.estimatedCost.currency}`} />
        <AdminMiniMetric icon="matchmark" label={copy.avg} value={data.averageMatchScore == null ? "—" : `${data.averageMatchScore}/100`} />
      </div>
      <div className="admin-signal-card">
        <h3>{copy.invalid}</h3>
        <div className="admin-quality-feed">
          {data.invalidResponses.length ? data.invalidResponses.map((item) => (
            <article key={item.id}>
              <span className="tag tag-danger">{item.score}/100</span>
              <div><strong>{item.id}</strong><small>{[...item.missing, ...item.suspicious].join(", ") || "—"}</small></div>
            </article>
          )) : <p className="muted">Aucune anomalie détectée.</p>}
        </div>
      </div>
    </section>
  );
}

function AdminFinancePage({ user, language, currency = "EUR", initialSearch }) {
  const copy =
    language === "en"
      ? {
          title: "Finance management",
          subtitle: "Every transaction recorded on the platform, with real vs. listed amounts.",
          revenueCollected: "Real revenue collected",
          listedValue: "Total listed value (all sources)",
          transactionCount: "Transactions",
          trend: "Real revenue collected — last 8 weeks",
          bySource: "Transactions by source",
          byPlan: "Revenue collected by plan",
          search: "Search by user, email or plan…",
          colDate: "Date",
          colUser: "User",
          colPlan: "Plan",
          colCycle: "Cycle",
          colListed: "Listed price",
          colCollected: "Amount collected",
          colSource: "Source",
          colActions: "Actions",
          empty: "No transaction found.",
          refund: "Refund",
          refunded: "Refunded",
          refunding: "Refunding…",
          confirmRefundTitle: "Refund this transaction?",
          confirmRefundText: "This immediately refunds the customer via Stripe. This cannot be undone.",
          confirmRefundBtn: "Refund",
          cancel: "Cancel",
          disclaimer:
            "\"Listed price\" is the plan's catalog price at the time of the transaction. \"Amount collected\" is only non-zero for real Stripe payments — instant/admin/license activations are free or already covered by a license seat, so no money changes hands for those."
        }
      : {
          title: "Gestion de finance",
          subtitle: "Toutes les transactions de la plateforme, avec distinction montant réel / prix catalogue.",
          revenueCollected: "Revenu réel encaissé",
          listedValue: "Valeur catalogue totale (toutes sources)",
          transactionCount: "Transactions",
          trend: "Revenu réel encaissé — 8 dernières semaines",
          bySource: "Transactions par source",
          byPlan: "Revenu encaissé par plan",
          search: "Rechercher par utilisateur, email ou plan…",
          colDate: "Date",
          colUser: "Utilisateur",
          colPlan: "Plan",
          colCycle: "Cycle",
          colListed: "Prix catalogue",
          colCollected: "Montant encaissé",
          colSource: "Source",
          colActions: "Actions",
          empty: "Aucune transaction trouvée.",
          refund: "Rembourser",
          refunded: "Remboursé",
          refunding: "Remboursement…",
          confirmRefundTitle: "Rembourser cette transaction ?",
          confirmRefundText: "Cela rembourse immédiatement le client via Stripe. Action irréversible.",
          confirmRefundBtn: "Rembourser",
          cancel: "Annuler",
          disclaimer:
            "Le \"prix catalogue\" est le tarif du plan au moment de la transaction. Le \"montant encaissé\" n'est non-nul que pour les vrais paiements Stripe — les activations instantanées/admin/licence sont gratuites ou déjà couvertes par un siège de licence, donc aucun argent ne change de main pour celles-ci."
        };

  const sourceLabels =
    language === "en"
      ? {
          stripe: "Stripe",
          instant: "Instant activation",
          license_redeem: "License code",
          admin_created: "Created by admin"
        }
      : {
          stripe: "Stripe",
          instant: "Activation instantanée",
          license_redeem: "Code de licence",
          admin_created: "Créé par l'admin"
        };

  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [search, setSearch] = useState(initialSearch || "");
  const [source, setSource] = useState("");
  const [page, setPage] = useState(1);
  const [refundingId, setRefundingId] = useState("");

  useEffect(() => {
    if (initialSearch) setSearch(initialSearch);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialSearch]);

  function load() {
    getAdminFinance(user.id, { search, source })
      .then(setData)
      .catch((err) => setError(getFriendlyErrorMessage(err, language)));
  }

  useEffect(() => {
    setPage(1);
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.id, search, source]);

  async function handleRefund(item) {
    const result = await Swal.fire({
      icon: "warning",
      title: copy.confirmRefundTitle,
      text: copy.confirmRefundText,
      showCancelButton: true,
      confirmButtonText: copy.confirmRefundBtn,
      cancelButtonText: copy.cancel,
      confirmButtonColor: "#b91c1c"
    });
    if (!result.isConfirmed) return;
    setRefundingId(item.id);
    try {
      await refundAdminTransaction({ adminUserId: user.id, transactionId: item.id });
      load();
      Swal.fire({
        toast: true,
        position: "top-end",
        icon: "success",
        title: language === "en" ? "Refunded." : "Remboursé.",
        showConfirmButton: false,
        timer: 2600,
        timerProgressBar: true,
        customClass: { popup: "career-toast", title: "career-toast-title" }
      });
    } catch (err) {
      Swal.fire({ icon: "error", title: getFriendlyErrorMessage(err, language) });
    } finally {
      setRefundingId("");
    }
  }

  if (error) return <p className="field-error">{error}</p>;
  if (!data) return <AdminPageLoader language={language} />;

  const totalPages = Math.max(1, Math.ceil(data.items.length / ADMIN_PAGE_SIZE));
  const pagedItems = data.items.slice((page - 1) * ADMIN_PAGE_SIZE, page * ADMIN_PAGE_SIZE);
  const planEntries = Object.entries(data.revenueByPlan || {}).filter(([, amount]) => amount > 0);
  const sourceEntries = Object.entries(data.countBySource || {});

  return (
    <section className="admin-finance">
      <header className="module-header admin-accounts-header">
        <div>
          <h2>{copy.title}</h2>
          <p>{copy.subtitle}</p>
        </div>
        <AdminExportCsvButton adminUserId={user.id} path="/admin/export/transactions" language={language} />
      </header>

      <div className="admin-kpi-grid">
        <AdminKpiCard
          tone="success"
          icon="scale"
          value={formatEur(data.totalRevenueCollected, currency)}
          label={copy.revenueCollected}
        />
        <AdminKpiCard
          tone="warning"
          icon="pricetag"
          value={formatEur(data.totalListedValue, currency)}
          label={copy.listedValue}
        />
        <AdminKpiCard tone="primary" icon="chart" value={data.totalTransactions} label={copy.transactionCount} />
      </div>

      <p className="admin-finance-disclaimer muted">{copy.disclaimer}</p>

      <div className="admin-panel admin-trend-panel">
        <h3>{copy.trend}</h3>
        <AdminTrendChart
          trend={data.revenueTrend}
          language={language}
          valueKey="amount"
          formatValue={(amount) => formatEur(amount, currency)}
        />
      </div>

      <div className="admin-panel-grid">
        <div className="admin-panel">
          <h3>{copy.bySource}</h3>
          <ul className="admin-stat-list">
            {sourceEntries.map(([sourceId, count]) => (
              <li key={sourceId}>
                <span>{sourceLabels[sourceId] || sourceId}</span>
                <strong>{count}</strong>
              </li>
            ))}
          </ul>
        </div>
        <div className="admin-panel">
          <h3>{copy.byPlan}</h3>
          <ul className="admin-stat-list">
            {planEntries.length ? (
              planEntries.map(([planId, amount]) => (
                <li key={planId}>
                  <span>{getPlanById(planId)?.name?.[language] || getPlanById(planId)?.name?.fr || planId}</span>
                  <strong>{formatEur(amount, currency)}</strong>
                </li>
              ))
            ) : (
              <li className="muted">{copy.empty}</li>
            )}
          </ul>
        </div>
      </div>

      <div className="admin-table-toolbar admin-finance-toolbar">
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={copy.search} />
      </div>
      <div className="admin-subtabs">
        {ADMIN_FINANCE_SOURCES.map((item) => (
          <button
            key={item.id || "all"}
            type="button"
            className={`admin-subtab ${source === item.id ? "active" : ""}`}
            onClick={() => setSource(item.id)}
          >
            {item.label[language] || item.label.fr}
          </button>
        ))}
      </div>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>{copy.colDate}</th>
              <th>{copy.colUser}</th>
              <th>{copy.colPlan}</th>
              <th>{copy.colCycle}</th>
              <th>{copy.colListed}</th>
              <th>{copy.colCollected}</th>
              <th>{copy.colSource}</th>
              <th>{copy.colActions}</th>
            </tr>
          </thead>
          <tbody>
            {pagedItems.length ? (
              pagedItems.map((item) => (
                <tr key={item.id}>
                  <td className="muted">{formatDate(item.createdAt)}</td>
                  <td>
                    <div className="admin-table-name">
                      <AvatarCircle
                        user={{ firstName: item.userFirstName, lastName: item.userLastName, avatarDataUrl: item.userAvatarDataUrl }}
                      />
                      <div>
                        <strong>
                          {item.userFirstName} {item.userLastName}
                        </strong>
                        <span className="muted">{item.userEmail}</span>
                      </div>
                    </div>
                  </td>
                  <td>{getPlanById(item.planId)?.name?.[language] || getPlanById(item.planId)?.name?.fr || item.planId}</td>
                  <td className="muted">{item.billingCycle}</td>
                  <td>{formatEur(item.listedAmount, currency)}</td>
                  <td>
                    <strong className={item.amountCollected > 0 ? "admin-finance-real" : "muted"}>
                      {formatEur(item.amountCollected, currency)}
                    </strong>
                  </td>
                  <td>
                    <span className="tag">{sourceLabels[item.source] || item.source}</span>
                  </td>
                  <td>
                    {item.refunded ? (
                      <span className="tag tag-danger">{copy.refunded}</span>
                    ) : item.refundable ? (
                      <button
                        type="button"
                        className="admin-row-action danger"
                        disabled={refundingId === item.id}
                        onClick={() => handleRefund(item)}
                      >
                        {refundingId === item.id ? copy.refunding : copy.refund}
                      </button>
                    ) : (
                      <span className="muted">—</span>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={8} className="admin-table-empty muted">
                  {copy.empty}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <AdminPagination page={page} totalPages={totalPages} onChange={setPage} language={language} totalItems={data.items.length} />
    </section>
  );
}

const ADMIN_EVENT_LABELS = {
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

function eventTypeLabel(eventType, language) {
  return ADMIN_EVENT_LABELS[eventType]?.[language] || ADMIN_EVENT_LABELS[eventType]?.fr || eventType;
}

// Traduit chaque type de notification admin en texte affichable. Chaque type
// correspond à un événement réel détecté côté serveur (nouvelle inscription,
// paiement Stripe encaissé, licence épuisée, échec d'envoi d'annonce) — pas
// de contenu fabriqué.
function adminNotificationText(item, language) {
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

function AdminActivityLogPage({ user, language }) {
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

  return (
    <section className="admin-activity">
      <header className="module-header">
        <h2>{copy.title}</h2>
        <p>{copy.subtitle}</p>
      </header>

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
              pagedItems.map((item) => (
                <tr key={item.id}>
                  <td className="muted">{formatDate(item.createdAt)}</td>
                  <td>
                    <div className="admin-table-name">
                      <AvatarCircle
                        user={{ firstName: item.userFirstName, lastName: item.userLastName, avatarDataUrl: item.userAvatarDataUrl }}
                      />
                      <div>
                        <strong>
                          {item.userFirstName} {item.userLastName}
                        </strong>
                        <span className="muted">{item.userEmail}</span>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className="tag">{eventTypeLabel(item.eventType, language)}</span>
                  </td>
                  <td className="muted admin-activity-details">
                    {Object.keys(item.metadata || {}).length ? JSON.stringify(item.metadata) : "—"}
                  </td>
                  <td className="muted">{item.ipAddress || "—"}</td>
                </tr>
              ))
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
    </section>
  );
}

function AdminSatisfactionPage({ user, language }) {
  const copy =
    language === "en"
      ? {
          title: "Satisfaction",
          subtitle: "CSAT survey results collected across the platform (1-10 scale).",
          average: "Average score",
          nps: "NPS",
          responses: "Total responses",
          promoters: "Promoters (9-10)",
          passives: "Passives (7-8)",
          detractors: "Detractors (1-6)",
          trendTitle: "Average score — last 8 weeks",
          recentTitle: "Recent responses",
          colUser: "User",
          colScore: "Score",
          colComment: "Comment",
          colDate: "Date",
          empty: "No response yet.",
          noComment: "—"
        }
      : {
          title: "Satisfaction",
          subtitle: "Résultats du sondage CSAT collectés sur la plateforme (échelle 1-10).",
          average: "Score moyen",
          nps: "NPS",
          responses: "Réponses totales",
          promoters: "Promoteurs (9-10)",
          passives: "Passifs (7-8)",
          detractors: "Détracteurs (1-6)",
          trendTitle: "Score moyen — 8 dernières semaines",
          recentTitle: "Réponses récentes",
          colUser: "Utilisateur",
          colScore: "Score",
          colComment: "Commentaire",
          colDate: "Date",
          empty: "Aucune réponse pour l'instant.",
          noComment: "—"
        };

  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    getAdminSatisfaction(user.id)
      .then(setData)
      .catch((err) => setError(getFriendlyErrorMessage(err, language)));
  }, [user.id, language]);

  if (error) return <p className="field-error">{error}</p>;
  if (!data) return <AdminPageLoader language={language} />;

  const trendForChart = data.trend.map((week) => ({ weekStart: week.weekStart, average: Math.round((week.average || 0) * 10) / 10 }));

  return (
    <section className="admin-satisfaction">
      <header className="module-header">
        <h2>{copy.title}</h2>
        <p>{copy.subtitle}</p>
      </header>

      <div className="admin-kpi-grid">
        <AdminKpiCard tone="primary" icon="chart" value={data.average != null ? data.average.toFixed(1) : "—"} label={copy.average} />
        <AdminKpiCard tone="success" icon="shield" value={data.nps != null ? data.nps : "—"} label={copy.nps} />
        <AdminKpiCard tone="primary" icon="profile" value={data.totalResponses} label={copy.responses} />
        <AdminKpiCard tone="success" icon="check" value={data.promoters} label={copy.promoters} />
        <AdminKpiCard tone="warning" icon="chat" value={data.passives} label={copy.passives} />
        <AdminKpiCard tone="danger" icon="alert" value={data.detractors} label={copy.detractors} />
      </div>

      <article className="card block admin-satisfaction-trend">
        <h3>{copy.trendTitle}</h3>
        <AdminTrendChart trend={trendForChart} language={language} valueKey="average" />
      </article>

      <article className="card block">
        <h3>{copy.recentTitle}</h3>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>{copy.colUser}</th>
                <th>{copy.colScore}</th>
                <th>{copy.colComment}</th>
                <th>{copy.colDate}</th>
              </tr>
            </thead>
            <tbody>
              {data.responses.length ? (
                data.responses.map((item) => (
                  <tr key={item.id}>
                    <td>{item.userName}</td>
                    <td>
                      <span className={`satisfaction-score-pill ${satisfactionTierFor(item.score).tone}`}>{item.score}</span>
                    </td>
                    <td>{item.comment || copy.noComment}</td>
                    <td>{formatDate(item.createdAt)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="admin-table-empty muted">
                    {copy.empty}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </article>
    </section>
  );
}

function AdminLicenseCodesPage({ user, language, initialSearch }) {
  const copy =
    language === "en"
      ? {
          title: "License codes",
          subtitle: "All license codes generated for agency and school seats.",
          search: "Search by code, owner or plan…",
          colCode: "Code",
          colOwner: "Owner",
          colPlan: "Plan",
          colSeats: "Seats",
          colStatus: "Status",
          colActions: "Actions",
          empty: "No license code found.",
          active: "Active",
          revoked: "Revoked",
          revoke: "Revoke",
          restore: "Restore",
          confirmRevokeTitle: "Revoke this license code?",
          confirmRevokeText: "It can no longer be redeemed by new members. Existing members keep their access.",
          confirmRevokeBtn: "Revoke",
          cancel: "Cancel"
        }
      : {
          title: "Codes de licence",
          subtitle: "Tous les codes de licence générés pour les sièges cabinet/école.",
          search: "Rechercher par code, propriétaire ou plan…",
          colCode: "Code",
          colOwner: "Propriétaire",
          colPlan: "Plan",
          colSeats: "Sièges",
          colStatus: "Statut",
          colActions: "Actions",
          empty: "Aucun code de licence trouvé.",
          active: "Actif",
          revoked: "Révoqué",
          revoke: "Révoquer",
          restore: "Restaurer",
          confirmRevokeTitle: "Révoquer ce code de licence ?",
          confirmRevokeText: "Il ne pourra plus être utilisé par de nouveaux membres. Les membres déjà inscrits gardent leur accès.",
          confirmRevokeBtn: "Révoquer",
          cancel: "Annuler"
        };

  const [items, setItems] = useState([]);
  const [error, setError] = useState("");
  const [search, setSearch] = useState(initialSearch || "");
  const [page, setPage] = useState(1);
  const [busyCode, setBusyCode] = useState("");

  useEffect(() => {
    if (initialSearch) setSearch(initialSearch);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialSearch]);

  function load() {
    getAdminLicenseCodes(user.id, { search })
      .then(setItems)
      .catch((err) => setError(getFriendlyErrorMessage(err, language)));
  }

  useEffect(() => {
    setPage(1);
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  async function handleRevoke(code) {
    const result = await Swal.fire({
      icon: "warning",
      title: copy.confirmRevokeTitle,
      text: copy.confirmRevokeText,
      showCancelButton: true,
      confirmButtonText: copy.confirmRevokeBtn,
      cancelButtonText: copy.cancel,
      confirmButtonColor: "#b91c1c"
    });
    if (!result.isConfirmed) return;
    setBusyCode(code);
    try {
      await revokeAdminLicenseCode(user.id, code);
      load();
    } catch (err) {
      Swal.fire({ icon: "error", title: getFriendlyErrorMessage(err, language) });
    } finally {
      setBusyCode("");
    }
  }

  async function handleRestore(code) {
    setBusyCode(code);
    try {
      await restoreAdminLicenseCode(user.id, code);
      load();
    } catch (err) {
      Swal.fire({ icon: "error", title: getFriendlyErrorMessage(err, language) });
    } finally {
      setBusyCode("");
    }
  }

  const totalPages = Math.max(1, Math.ceil(items.length / ADMIN_PAGE_SIZE));
  const pagedItems = items.slice((page - 1) * ADMIN_PAGE_SIZE, page * ADMIN_PAGE_SIZE);

  return (
    <section className="admin-licenses">
      <header className="module-header admin-accounts-header">
        <div>
          <h2>{copy.title}</h2>
          <p>{copy.subtitle}</p>
        </div>
        <AdminExportCsvButton adminUserId={user.id} path="/admin/export/license-codes" language={language} />
      </header>

      {error ? <p className="field-error">{error}</p> : null}

      <div className="admin-table-toolbar">
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={copy.search} />
      </div>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>{copy.colCode}</th>
              <th>{copy.colOwner}</th>
              <th>{copy.colPlan}</th>
              <th>{copy.colSeats}</th>
              <th>{copy.colStatus}</th>
              <th>{copy.colActions}</th>
            </tr>
          </thead>
          <tbody>
            {pagedItems.length ? (
              pagedItems.map((item) => (
                <tr key={item.code}>
                  <td>
                    <code className="admin-license-code">{item.code}</code>
                  </td>
                  <td>
                    <div className="admin-table-name">
                      <AvatarCircle
                        user={{ firstName: item.ownerFirstName, lastName: item.ownerLastName, avatarDataUrl: item.ownerAvatarDataUrl }}
                      />
                      <div>
                        <strong>
                          {item.ownerFirstName} {item.ownerLastName}
                        </strong>
                        <span className="muted">{item.ownerEmail}</span>
                      </div>
                    </div>
                  </td>
                  <td>{getPlanById(item.planId)?.name?.[language] || item.planId}</td>
                  <td className="muted">
                    {item.seatsUsed}/{item.seatsTotal}
                  </td>
                  <td>
                    <span className={`tag ${item.revoked ? "tag-danger" : "tag-success"}`}>
                      {item.revoked ? copy.revoked : copy.active}
                    </span>
                  </td>
                  <td>
                    {item.revoked ? (
                      <button
                        type="button"
                        className="admin-row-action"
                        disabled={busyCode === item.code}
                        onClick={() => handleRestore(item.code)}
                      >
                        {copy.restore}
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="admin-row-action danger"
                        disabled={busyCode === item.code}
                        onClick={() => handleRevoke(item.code)}
                      >
                        {copy.revoke}
                      </button>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="admin-table-empty muted">
                  {copy.empty}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <AdminPagination page={page} totalPages={totalPages} onChange={setPage} language={language} totalItems={items.length} />
    </section>
  );
}

function AdminAiSamplesPage({ user, language }) {
  const copy =
    language === "en"
      ? {
          title: "AI moderation",
          subtitle: "Sample of AI-generated match analyses, for quality and abuse review.",
          disclaimer:
            "Only CV/job match analyses are stored server-side and reviewable here. Generated cover letters live only in the user's browser and are never saved. Salary negotiation transcripts are now saved so users can resume them, but they remain private to each user's account and are not reviewable in this admin panel.",
          search: "Search by user, job title or company…",
          empty: "No analysis found.",
          score: "Score",
          strengths: "Strengths",
          missing: "Missing keywords",
          recommendation: "Recommendation",
          for: "for"
        }
      : {
          title: "Modération IA",
          subtitle: "Échantillon des analyses de matching générées par l'IA, pour contrôle qualité et détection d'abus.",
          disclaimer:
            "Seules les analyses de matching CV/offre sont enregistrées côté serveur et consultables ici. Les lettres de motivation générées ne vivent que dans le navigateur de l'utilisateur et ne sont jamais sauvegardées. Les transcripts de négociation salariale sont désormais sauvegardés pour permettre de les reprendre, mais restent privés au compte de chaque utilisateur et ne sont pas consultables dans ce panneau admin.",
          search: "Rechercher par utilisateur, poste ou entreprise…",
          empty: "Aucune analyse trouvée.",
          score: "Score",
          strengths: "Points forts",
          missing: "Mots-clés manquants",
          recommendation: "Recommandation",
          for: "pour"
        };

  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
    getAdminAiSamples(user.id, { search })
      .then(setData)
      .catch((err) => setError(getFriendlyErrorMessage(err, language)));
  }, [user.id, search]);

  if (error) return <p className="field-error">{error}</p>;
  if (!data) return <p className="muted">…</p>;

  const totalPages = Math.max(1, Math.ceil(data.items.length / ADMIN_PAGE_SIZE));
  const pagedItems = data.items.slice((page - 1) * ADMIN_PAGE_SIZE, page * ADMIN_PAGE_SIZE);

  return (
    <section className="admin-ai-samples">
      <header className="module-header">
        <h2>{copy.title}</h2>
        <p>{copy.subtitle}</p>
      </header>

      <p className="admin-finance-disclaimer muted">{copy.disclaimer}</p>

      <div className="admin-table-toolbar">
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={copy.search} />
      </div>

      <div className="admin-ai-sample-list">
        {pagedItems.length ? (
          pagedItems.map((item) => (
            <article key={item.id} className="admin-ai-sample-card">
              <div className="admin-ai-sample-head">
                <AvatarCircle
                  user={{ firstName: item.userFirstName, lastName: item.userLastName, avatarDataUrl: item.userAvatarDataUrl }}
                />
                <div>
                  <strong>
                    {item.userFirstName} {item.userLastName}
                  </strong>
                  <span className="muted">
                    {copy.for} {item.jobTitle}
                    {item.jobCompany ? ` · ${item.jobCompany}` : ""}
                  </span>
                </div>
                {item.score !== null ? (
                  <span className="admin-ai-sample-score">
                    {copy.score}: {item.score}/100
                  </span>
                ) : null}
                <span className="muted admin-ai-sample-date">{formatDate(item.createdAt)}</span>
              </div>

              {item.strengths.length ? (
                <p>
                  <strong>{copy.strengths} : </strong>
                  {item.strengths.join(", ")}
                </p>
              ) : null}
              {item.missingKeywords.length ? (
                <p>
                  <strong>{copy.missing} : </strong>
                  {item.missingKeywords.join(", ")}
                </p>
              ) : null}
              {item.recommendation ? (
                <p>
                  <strong>{copy.recommendation} : </strong>
                  {item.recommendation}
                </p>
              ) : null}
            </article>
          ))
        ) : (
          <p className="muted">{copy.empty}</p>
        )}
      </div>

      <AdminPagination page={page} totalPages={totalPages} onChange={setPage} language={language} totalItems={data.items.length} />
    </section>
  );
}

function AdminSettingsPage({ user, language }) {
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

const ADMIN_ANNOUNCEMENT_AUDIENCES = [
  { id: "", label: { fr: "Tous les utilisateurs", en: "All users" } },
  { id: "student", label: { fr: "Étudiants / Candidats", en: "Students / Candidates" } },
  { id: "school", label: { fr: "Écoles", en: "Schools" } },
  { id: "recruiter_firm", label: { fr: "Cabinets de recrutement", en: "Recruitment agencies" } }
];

function AdminAnnouncementsPage({ user, language }) {
  const copy =
    language === "en"
      ? {
          title: "Announcement emails",
          subtitle: "Send a real email to a segment of users via the configured SMTP server.",
          audience: "Audience",
          subject: "Subject",
          message: "Message",
          messagePlaceholder: "Write your announcement… (use a blank line to start a new paragraph)",
          recipients: "recipient(s)",
          send: "Send announcement",
          sending: "Sending…",
          confirmTitle: "Send this announcement?",
          confirmText: (count) => `This will email ${count} recipient(s) right now. This cannot be undone.`,
          confirmBtn: "Send",
          cancel: "Cancel",
          history: "Sent history",
          noHistory: "No announcement sent yet.",
          colDate: "Date",
          colSubject: "Subject",
          colAudience: "Audience",
          colRecipients: "Recipients",
          colFailed: "Failed",
          compose: "Compose",
          composeTitle: "Compose new message",
          folders: "Folders",
          inbox: "Audience",
          sent: "Sent",
          drafts: "Draft",
          failed: "Failed",
          labels: "Labels",
          important: "Important",
          platform: "Platform",
          schools: "Schools",
          to: "To:",
          subjectLine: "Subject:",
          normalText: "Normal text",
          attachment: "Attachment",
          attachmentHint: "Add a PDF, image or office document to this campaign.",
          attachFile: "Attach file",
          removeFile: "Remove file",
          draftSaved: "Draft saved.",
          linkPrompt: "Paste the link to insert",
          importantPrefix: "[Important]",
          platformPrefix: "[Platform]",
          schoolPrefix: "[Schools]"
        }
      : {
          title: "Emails d'annonce",
          subtitle: "Envoie un vrai email à un segment d'utilisateurs via le serveur SMTP configuré.",
          audience: "Audience",
          subject: "Objet",
          message: "Message",
          messagePlaceholder: "Rédigez votre annonce… (laissez une ligne vide pour un nouveau paragraphe)",
          recipients: "destinataire(s)",
          send: "Envoyer l'annonce",
          sending: "Envoi en cours…",
          confirmTitle: "Envoyer cette annonce ?",
          confirmText: (count) => `Cela enverra un email à ${count} destinataire(s) immédiatement. Action irréversible.`,
          confirmBtn: "Envoyer",
          cancel: "Annuler",
          history: "Historique des envois",
          noHistory: "Aucune annonce envoyée pour l'instant.",
          colDate: "Date",
          colSubject: "Objet",
          colAudience: "Audience",
          colRecipients: "Destinataires",
          colFailed: "Échecs",
          compose: "Composer",
          composeTitle: "Nouveau message",
          folders: "Dossiers",
          inbox: "Audience",
          sent: "Envoyés",
          drafts: "Brouillon",
          failed: "Échecs",
          labels: "Labels",
          important: "Important",
          platform: "Plateforme",
          schools: "Écoles",
          to: "À :",
          subjectLine: "Objet :",
          normalText: "Texte normal",
          attachment: "Pièce jointe",
          attachmentHint: "Ajoute un PDF, une image ou un document bureautique à cette campagne.",
          attachFile: "Joindre un fichier",
          removeFile: "Retirer le fichier",
          draftSaved: "Brouillon enregistré.",
          linkPrompt: "Colle le lien à insérer",
          importantPrefix: "[Important]",
          platformPrefix: "[Plateforme]",
          schoolPrefix: "[Écoles]"
        };

  const [audience, setAudience] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [audienceCount, setAudienceCount] = useState(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [history, setHistory] = useState([]);
  const [activeFolder, setActiveFolder] = useState("compose");
  const [activeLabel, setActiveLabel] = useState("");
  const [mailSearch, setMailSearch] = useState("");
  const [attachment, setAttachment] = useState(null);
  const messageRef = useRef(null);
  const attachmentInputRef = useRef(null);
  const failedTotal = history.reduce((total, item) => total + Number(item.failedCount || 0), 0);
  const folderHistory = activeFolder === "failed" ? history.filter((item) => Number(item.failedCount || 0) > 0) : history;
  const visibleHistory = folderHistory.filter((item) => {
    const term = mailSearch.trim().toLowerCase();
    if (!term) return true;
    const audienceLabel =
      ADMIN_ANNOUNCEMENT_AUDIENCES.find((a) => a.id === item.audience || (a.id === "" && item.audience === "all"))
        ?.label[language] || item.audience;
    return `${item.subject} ${audienceLabel}`.toLowerCase().includes(term);
  });
  const showMailbox = activeFolder === "sent" || activeFolder === "failed";

  function loadHistory() {
    getAdminAnnouncements(user.id)
      .then(setHistory)
      .catch((err) => setError(getFriendlyErrorMessage(err, language)));
  }

  useEffect(() => {
    loadHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    getAdminAnnouncementAudienceCount(user.id, audience)
      .then(setAudienceCount)
      .catch(() => setAudienceCount(null));
  }, [user.id, audience]);

  useEffect(() => {
    try {
      const draft = JSON.parse(localStorage.getItem("career_app_admin_announcement_draft") || "null");
      if (draft?.subject || draft?.message) {
        setSubject(draft.subject || "");
        setMessage(draft.message || "");
        setAudience(draft.audience || "");
        setAttachment(draft.attachmentMeta || null);
      }
    } catch (_error) {
      // ignore malformed draft
    }
  }, []);

  function focusMessage() {
    setTimeout(() => messageRef.current?.focus(), 0);
  }

  function handleFolderClick(folder) {
    setActiveFolder(folder);
    if (folder === "compose" || folder === "audience" || folder === "draft") {
      focusMessage();
    }
  }

  function getAudienceLabel(value) {
    return (
      ADMIN_ANNOUNCEMENT_AUDIENCES.find((a) => a.id === value || (a.id === "" && value === "all"))?.label[language] ||
      value ||
      ADMIN_ANNOUNCEMENT_AUDIENCES[0].label[language]
    );
  }

  function insertInMessage(before, after = "", fallback = "") {
    const textarea = messageRef.current;
    const start = textarea?.selectionStart ?? message.length;
    const end = textarea?.selectionEnd ?? message.length;
    const selected = message.slice(start, end) || fallback;
    const next = `${message.slice(0, start)}${before}${selected}${after}${message.slice(end)}`;
    setMessage(next);
    requestAnimationFrame(() => {
      messageRef.current?.focus();
      const cursorStart = start + before.length;
      const cursorEnd = cursorStart + selected.length;
      messageRef.current?.setSelectionRange(cursorStart, cursorEnd);
    });
  }

  function applyLabel(label) {
    setActiveLabel(label);
    const prefix = label === "important" ? copy.importantPrefix : label === "schools" ? copy.schoolPrefix : copy.platformPrefix;
    if (!subject.startsWith(prefix)) {
      setSubject((prev) => `${prefix} ${prev}`.trim());
    }
    if (label === "schools") setAudience("school");
    if (label === "platform") setAudience("");
    focusMessage();
  }

  async function insertLink() {
    const result = await Swal.fire({
      title: copy.linkPrompt,
      input: "url",
      inputPlaceholder: "https://",
      showCancelButton: true,
      confirmButtonText: "OK",
      cancelButtonText: copy.cancel,
      confirmButtonColor: "#5964e8"
    });
    if (result.isConfirmed && result.value) {
      insertInMessage("", "", result.value);
    }
  }

  function saveDraft() {
    localStorage.setItem(
      "career_app_admin_announcement_draft",
      JSON.stringify({
        subject,
        message,
        audience,
        attachmentMeta: attachment ? { name: attachment.name, size: attachment.size, type: attachment.type } : null,
        savedAt: new Date().toISOString()
      })
    );
    setActiveFolder("draft");
    Swal.fire({
      toast: true,
      position: "top-end",
      icon: "success",
      title: copy.draftSaved,
      showConfirmButton: false,
      timer: 2200,
      timerProgressBar: true,
      customClass: { popup: "career-toast", title: "career-toast-title" }
    });
  }

  async function handleAttachmentChange(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const content = await fileToBase64(file);
      setAttachment({ name: file.name, size: file.size, type: file.type || "application/octet-stream", content });
    } catch (_error) {
      setError(
        language === "en"
          ? "Unable to read this attachment. Try another file."
          : "Impossible de lire cette pièce jointe. Essaie un autre fichier."
      );
    } finally {
      event.target.value = "";
    }
  }

  async function handleSend(event) {
    event.preventDefault();
    setError("");

    const result = await Swal.fire({
      icon: "warning",
      title: copy.confirmTitle,
      text: copy.confirmText(audienceCount ?? "?"),
      showCancelButton: true,
      confirmButtonText: copy.confirmBtn,
      cancelButtonText: copy.cancel,
      confirmButtonColor: "#2f5bff"
    });
    if (!result.isConfirmed) return;

    setSending(true);
    try {
      const response = await sendAdminAnnouncement({ adminUserId: user.id, subject, message, audience, attachment });
      setSubject("");
      setMessage("");
      setAttachment(null);
      localStorage.removeItem("career_app_admin_announcement_draft");
      setActiveFolder("sent");
      loadHistory();
      Swal.fire({
        toast: true,
        position: "top-end",
        icon: "success",
        title:
          language === "en"
            ? `Sent to ${response.recipientCount} recipient(s)${response.failedCount ? `, ${response.failedCount} failed` : ""}.`
            : `Envoyé à ${response.recipientCount} destinataire(s)${response.failedCount ? `, ${response.failedCount} échec(s)` : ""}.`,
        showConfirmButton: false,
        timer: 3500,
        timerProgressBar: true,
        customClass: { popup: "career-toast", title: "career-toast-title" }
      });
    } catch (err) {
      setError(getFriendlyErrorMessage(err, language));
    } finally {
      setSending(false);
    }
  }

  return (
    <section className="admin-announcements">
      <header className="module-header">
        <h2>{copy.title}</h2>
        <p>{copy.subtitle}</p>
      </header>

      <div className="admin-mail-layout">
        <aside className="admin-mail-sidebar">
          <button type="button" className="admin-mail-compose-btn" onClick={() => handleFolderClick("compose")}>
            <UiIcon name="mail" /> {copy.compose}
          </button>

          <div className="admin-mail-card">
            <div className="admin-mail-card-title">
              <span>{copy.folders}</span>
              <strong>-</strong>
            </div>
            <button
              type="button"
              className={`admin-mail-folder ${activeFolder === "audience" || activeFolder === "compose" ? "active" : ""}`}
              onClick={() => handleFolderClick("audience")}
            >
              <UiIcon name="profile" />
              <span>{copy.inbox}</span>
              <strong>{audienceCount ?? "…"}</strong>
            </button>
            <button
              type="button"
              className={`admin-mail-folder ${activeFolder === "sent" ? "active" : ""}`}
              onClick={() => handleFolderClick("sent")}
            >
              <UiIcon name="mail" />
              <span>{copy.sent}</span>
              <strong>{history.length}</strong>
            </button>
            <button
              type="button"
              className={`admin-mail-folder ${activeFolder === "draft" ? "active" : ""}`}
              onClick={() => handleFolderClick("draft")}
            >
              <UiIcon name="docModern" />
              <span>{copy.drafts}</span>
              <strong>{subject || message ? 1 : 0}</strong>
            </button>
            <button
              type="button"
              className={`admin-mail-folder ${activeFolder === "failed" ? "active" : ""}`}
              onClick={() => handleFolderClick("failed")}
            >
              <UiIcon name="alert" />
              <span>{copy.failed}</span>
              <strong>{failedTotal}</strong>
            </button>
          </div>

          <div className="admin-mail-card">
            <div className="admin-mail-card-title">
              <span>{copy.labels}</span>
              <strong>-</strong>
            </div>
            <button
              type="button"
              className={`admin-mail-label important ${activeLabel === "important" ? "active" : ""}`}
              onClick={() => applyLabel("important")}
            >
              {copy.important}
            </button>
            <button
              type="button"
              className={`admin-mail-label platform ${activeLabel === "platform" ? "active" : ""}`}
              onClick={() => applyLabel("platform")}
            >
              {copy.platform}
            </button>
            <button
              type="button"
              className={`admin-mail-label schools ${activeLabel === "schools" ? "active" : ""}`}
              onClick={() => applyLabel("schools")}
            >
              {copy.schools}
            </button>
          </div>
        </aside>

        <div className="admin-mail-main">
          {showMailbox ? (
            <div className="admin-mail-inbox">
              <div className="admin-mail-inbox-toolbar">
                <div className="admin-mail-inbox-actions">
                  <button type="button" title={language === "en" ? "Select" : "Sélectionner"}>
                    ?
                  </button>
                  <button type="button" title={language === "en" ? "Refresh" : "Actualiser"} onClick={loadHistory}>
                    <UiIcon name="history" />
                  </button>
                  <button type="button" title={language === "en" ? "More" : "Plus"}>
                    ?
                  </button>
                </div>
                <input
                  value={mailSearch}
                  onChange={(event) => setMailSearch(event.target.value)}
                  placeholder={language === "en" ? "Search sent announcements" : "Rechercher dans les annonces envoyées"}
                />
                <span className="admin-mail-range">
                  {visibleHistory.length ? `1-${visibleHistory.length}` : "0"} / {folderHistory.length}
                </span>
              </div>

              <div className="admin-mail-tabs">
                <button type="button" className="active">
                  <UiIcon name="mail" />
                  {language === "en" ? "Primary" : "Principal"}
                </button>
                <button type="button">
                  <UiIcon name="pricetag" />
                  {copy.platform}
                </button>
                <button type="button">
                  <UiIcon name="profile" />
                  {copy.schools}
                </button>
              </div>

              <div className="admin-mail-list">
                {visibleHistory.length ? (
                  visibleHistory.map((item) => (
                    <button type="button" key={item.id} className="admin-mail-row">
                      <span className="admin-mail-check">?</span>
                      <span className="admin-mail-star">?</span>
                      <strong>{getAudienceLabel(item.audience)}</strong>
                      <span className="admin-mail-row-subject">{item.subject}</span>
                      <span className={item.failedCount ? "admin-mail-row-failed" : "admin-mail-row-count"}>
                        {item.failedCount ? `${item.failedCount} ${copy.failed}` : `${item.recipientCount} ${copy.recipients}`}
                      </span>
                      <time>{formatDate(item.createdAt)}</time>
                    </button>
                  ))
                ) : (
                  <div className="admin-mail-empty">
                    {activeFolder === "failed"
                      ? language === "en"
                        ? "No failed send."
                        : "Aucun échec d'envoi."
                      : copy.noHistory}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <form className="admin-create-form admin-announcement-form admin-mail-compose" onSubmit={handleSend}>
            <div className="admin-mail-compose-head">
              <h3>{copy.composeTitle}</h3>
              {audienceCount !== null ? (
                <span className="admin-mail-recipient-badge">
                  {audienceCount} {copy.recipients}
                </span>
              ) : null}
            </div>

            <label className="admin-mail-line">
              <span>{copy.to}</span>
              <select value={audience} onChange={(event) => setAudience(event.target.value)}>
                {ADMIN_ANNOUNCEMENT_AUDIENCES.map((item) => (
                  <option key={item.id || "all"} value={item.id}>
                    {item.label[language] || item.label.fr}
                  </option>
                ))}
              </select>
            </label>

            <label className="admin-mail-line">
              <span>{copy.subjectLine}</span>
              <input value={subject} onChange={(event) => setSubject(event.target.value)} required />
            </label>

            <div className="admin-mail-editor-toolbar" aria-label={language === "en" ? "Formatting toolbar" : "Barre de mise en forme"}>
              <button type="button" className="admin-mail-format-select" onClick={() => insertInMessage("\n\n", "", language === "en" ? "New paragraph" : "Nouveau paragraphe")}>
                A {copy.normalText} ?
              </button>
              <button type="button" onClick={() => insertInMessage("**", "**", language === "en" ? "bold text" : "texte en gras")}>
                <strong>B</strong>
              </button>
              <button type="button" onClick={() => insertInMessage("_", "_", language === "en" ? "italic text" : "texte italique")}>
                <em>I</em>
              </button>
              <button type="button" onClick={() => insertInMessage("\n\n> ", "", language === "en" ? "Quote" : "Citation")}>
                “
              </button>
              <button type="button" onClick={() => insertInMessage("\n- ", "", language === "en" ? "List item" : "Élément de liste")}>
                ?
              </button>
              <button type="button" onClick={() => insertInMessage("\n1. ", "", language === "en" ? "First item" : "Premier élément")}>
                =
              </button>
              <button type="button" onClick={insertLink}>
                ?
              </button>
            </div>

            <textarea
              ref={messageRef}
              className="admin-mail-message"
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder={copy.messagePlaceholder}
              rows={12}
              required
            />

            <div className="admin-mail-attachment">
              <UiIcon name="upload" />
              <div>
                <strong>{copy.attachment}</strong>
                <span>
                  {attachment?.name
                    ? `${attachment.name} · ${Math.max(1, Math.round((attachment.size || 0) / 1024))} Ko`
                    : copy.attachmentHint}
                </span>
              </div>
              <input
                ref={attachmentInputRef}
                type="file"
                accept=".pdf,.doc,.docx,.txt,.csv,.xlsx,.png,.jpg,.jpeg,.webp"
                onChange={handleAttachmentChange}
              />
              <div className="admin-mail-attachment-actions">
                <button type="button" className="btn-ghost" onClick={() => attachmentInputRef.current?.click()} disabled={sending}>
                  <UiIcon name="upload" /> {copy.attachFile}
                </button>
                {attachment ? (
                  <button type="button" className="btn-ghost danger" onClick={() => setAttachment(null)} disabled={sending}>
                    {copy.removeFile}
                  </button>
                ) : null}
              </div>
            </div>

            {error ? <p className="field-error">{error}</p> : null}

            <div className="admin-mail-actions">
              <button type="button" className="btn-ghost" onClick={saveDraft} disabled={(!message && !subject) || sending}>
                <UiIcon name="docModern" /> {copy.drafts}
              </button>
              <button type="submit" className="btn-main ready" disabled={sending || !audienceCount}>
                {sending ? <span className="btn-spinner" /> : <UiIcon name="mail" />} {sending ? copy.sending : copy.send}
              </button>
            </div>
            </form>
          )}

        </div>
      </div>
    </section>
  );
}


export { AdminApp, SchoolApp };
