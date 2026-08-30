import React from "react";
// Module École : shell + toutes les pages du dashboard école (étudiants,
// invitations, promotions, licence, statistiques, rapports, paramètres).
import { useState, useEffect, useRef } from "react";
import Swal from "sweetalert2";
import { UiIcon } from "../../components/UiIcon.jsx";
import { AdminPageLoader } from "../../components/AdminPageLoader.jsx";
import { AdminKpiCard } from "../../components/AdminKpiCard.jsx";
import { AvatarCircle } from "../../components/AvatarCircle.jsx";
import { LanguageSwitch } from "../../components/LanguageSwitch.jsx";
import { getPlanById } from "../../data/plans.js";
import { getFriendlyErrorMessage } from "../../lib/errors.js";
import { formatDate } from "../../lib/format.js";
import { fileToBase64 } from "../../lib/cvService.js";
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
} from "../../lib/inMemoryDb.js";
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
} from "../admin/AdminApp.jsx";
import AccountDrawer from "../account/AccountDrawer.jsx";
import { ConnectedFooter } from "../../App.jsx";
import SchoolDashboardPage from "./pages/SchoolDashboardPage.jsx";
import SchoolStudentsPage from "./pages/SchoolStudentsPage.jsx";
import SchoolInvitationsPage from "./pages/SchoolInvitationsPage.jsx";
import SchoolPromotionsPage from "./pages/SchoolPromotionsPage.jsx";
import SchoolLicensePage from "./pages/SchoolLicensePage.jsx";
import SchoolInsightsPage from "./pages/SchoolInsightsPage.jsx";
import SchoolReportsPage from "./pages/SchoolReportsPage.jsx";
import SchoolSettingsPage from "./pages/SchoolSettingsPage.jsx";

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
  onRevokeSession,
  currentSessionId,
  onExportData,
  onExportSummary,
  onDeleteAccount,
  onNavigateLegal
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
          <button type="button" className="brand-link" onClick={() => setTab("dashboard")}>
            <img src="/logo-career-cv.png" alt="Career CV" className="brand-logo" />
          </button>{" "}
          <span className="admin-badge school-badge">École</span>
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
                {copy.secured} <strong>Career CV</strong>
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

      <ConnectedFooter
        copy={landingCopy}
        onBrandClick={() => setTab("dashboard")}
        onHomeClick={() => setTab("dashboard")}
        onPricingClick={() => setTab("license")}
        onAboutClick={() => onNavigateLegal?.("about")}
        onContactClick={() => onNavigateLegal?.("contact")}
        onPrivacyClick={() => onNavigateLegal?.("privacy")}
        onTermsClick={() => onNavigateLegal?.("terms")}
        onCookiesClick={() => onNavigateLegal?.("cookies")}
        onSecurityClick={() => onNavigateLegal?.("security")}
      />

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
          onRevokeSession={onRevokeSession}
          currentSessionId={currentSessionId}
          onExportData={onExportData}
          onExportSummary={onExportSummary}
          onDeleteAccount={onDeleteAccount}
        />
      ) : null}
    </div>
  );
}

export function SchoolExportCsvButton({ userId, language }) {
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


function maskLicenseCode(code) {
  if (!code) return code;
  const parts = code.split("-");
  if (parts.length < 3) return code.replace(/[A-Z0-9]/g, "•");
  return `${parts[0]}-••••-${parts[parts.length - 1]}`;
}

export function SchoolLicenseCard({ item, language, currency, copy }) {
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


export { SchoolApp as default, SchoolEmptyState };
