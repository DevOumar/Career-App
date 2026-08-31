import React from "react";
// Module Cabinet : espace dédié aux cabinets de recrutement / cellules RH,
// construit avec le même langage visuel que l'app candidat (topbar + onglets
// horizontaux, cartes "history-card", pas de sidebar façon dashboard admin)
// — à la demande explicite du client, plus proche du candidat que de
// l'École/Admin niveau design, alors que la logique métier (licence,
// sièges, vivier de candidats, missions) est calquée sur celle de l'École.
import { useState, useRef, useEffect } from "react";
import { UiIcon } from "../../components/UiIcon.jsx";
import { AvatarCircle } from "../../components/AvatarCircle.jsx";
import { LanguageSwitch } from "../../components/LanguageSwitch.jsx";
import { getAccountLabel } from "../../lib/accounts.js";
import AccountDrawer from "../account/AccountDrawer.jsx";
import { ConnectedFooter } from "../../App.jsx";
import { getCabinetNotifications } from "../../lib/inMemoryDb.js";
import { formatDate } from "../../lib/format.js";
import CabinetHomePage from "./pages/CabinetHomePage.jsx";
import CabinetRecruitersPage from "./pages/CabinetRecruitersPage.jsx";
import CabinetInvitationsPage from "./pages/CabinetInvitationsPage.jsx";
import CabinetCandidatesPage from "./pages/CabinetCandidatesPage.jsx";
import CabinetMissionsPage from "./pages/CabinetMissionsPage.jsx";
import CabinetReportsPage from "./pages/CabinetReportsPage.jsx";
import CabinetAnnouncementsPage from "./pages/CabinetAnnouncementsPage.jsx";
import CabinetLicensePage from "./pages/CabinetLicensePage.jsx";
import CabinetBillingPage from "./pages/CabinetBillingPage.jsx";
import CabinetPricingPage from "./pages/CabinetPricingPage.jsx";
import CabinetSettingsPage from "./pages/CabinetSettingsPage.jsx";

// Onglets de premier niveau + deux regroupements en menu déroulant
// ("Équipe" et "Abonnement") pour éviter que 11 onglets à plat ne débordent
// de la topbar (constaté à l'usage — cf. capture avec "Paramètres" coupé).
export const CABINET_NAV_ITEMS = [
  { id: "home", icon: "home" },
  { id: "candidates", icon: "network" },
  { id: "missions", icon: "briefcase" },
  { id: "reports", icon: "file" },
  {
    id: "team",
    icon: "profile",
    children: [
      { id: "recruiters", icon: "profile" },
      { id: "invitations", icon: "mail" },
      { id: "announcements", icon: "chat" }
    ]
  },
  {
    id: "subscription",
    icon: "save",
    children: [
      { id: "license", icon: "save" },
      { id: "billing", icon: "scale" },
      { id: "pricing", icon: "pricetag" }
    ]
  },
  { id: "settings", icon: "settings" }
];

export default function CabinetApp({
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
      return localStorage.getItem("career_app_cabinet_tab") || "home";
    } catch (_error) {
      return "home";
    }
  });
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [accountDrawerOpen, setAccountDrawerOpen] = useState(false);
  const [accountPanel, setAccountPanel] = useState("account");
  const [openGroup, setOpenGroup] = useState("");
  const [dropdownPos, setDropdownPos] = useState(null);
  const navRef = useRef(null);

  // .topnav a un overflow-x: auto (défilement horizontal sur petit écran),
  // ce qui force aussi le clipping vertical de tout enfant en position
  // absolute qui en dépasse — le sous-menu était donc invisible. En
  // position: fixed calculée depuis le bouton, il échappe à ce clipping.
  function toggleGroup(id, event) {
    if (openGroup === id) {
      setOpenGroup("");
      return;
    }
    const rect = event.currentTarget.getBoundingClientRect();
    setDropdownPos({ top: rect.bottom + 8, left: rect.left + rect.width / 2 });
    setOpenGroup(id);
  }
  const [notifications, setNotifications] = useState([]);
  const [notifOpen, setNotifOpen] = useState(false);
  const [readNotificationIds, setReadNotificationIds] = useState(new Set());
  const notifRef = useRef(null);
  const unreadNotificationCount = notifications.filter((item) => !readNotificationIds.has(item.id)).length;

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(`career_app_cabinet_read_notifications_${user.id}`) || "[]");
      setReadNotificationIds(new Set(Array.isArray(stored) ? stored : []));
    } catch (_error) {
      setReadNotificationIds(new Set());
    }
  }, [user.id]);

  useEffect(() => {
    getCabinetNotifications(user.id, language).then(setNotifications).catch(() => setNotifications([]));
  }, [user.id, language, tab]);

  function markAllNotificationsRead() {
    const nextIds = new Set([...readNotificationIds, ...notifications.map((item) => item.id)]);
    setReadNotificationIds(nextIds);
    try {
      localStorage.setItem(`career_app_cabinet_read_notifications_${user.id}`, JSON.stringify([...nextIds]));
    } catch (_error) {
      // ignore storage errors (private mode, quota, etc.)
    }
  }

  useEffect(() => {
    function handleClickOutside(event) {
      if (navRef.current && !navRef.current.contains(event.target)) {
        setOpenGroup("");
      }
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setNotifOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const copy =
    language === "en"
      ? {
          home: "Home",
          recruiters: "Recruiters",
          candidates: "Candidate pool",
          missions: "Missions",
          reports: "Reports",
          invitations: "Invitations",
          announcements: "Announcements",
          license: "License",
          billing: "Billing",
          pricing: "Pricing",
          settings: "Settings",
          team: "Team",
          subscription: "Subscription",
          role: "Recruitment firm",
          logout: "Log out",
          manageAccount: "Manage account",
          secured: "Secured by",
          notifications: "Notifications",
          markAllRead: "Mark all as read",
          notifEmpty: "New recruiters, license capacity and stale missions will show up here.",
          notifNothing: "Nothing to report"
        }
      : {
          home: "Accueil",
          recruiters: "Recruteurs",
          candidates: "Vivier de candidats",
          missions: "Missions",
          reports: "Rapports",
          invitations: "Invitations",
          announcements: "Annonces",
          license: "Licence",
          billing: "Facturation",
          pricing: "Tarifs",
          settings: "Paramètres",
          team: "Équipe",
          subscription: "Abonnement",
          role: "Cabinet de recrutement",
          logout: "Déconnexion",
          manageAccount: "Gérer son compte",
          secured: "Sécurisé par",
          notifications: "Notifications",
          markAllRead: "Tout marquer lu",
          notifEmpty: "Nouveaux recruteurs, licence proche de la saturation et missions sans candidat apparaîtront ici.",
          notifNothing: "Rien à signaler"
        };

  function goTo(id) {
    setTab(id);
    setUserMenuOpen(false);
    setOpenGroup("");
    try {
      localStorage.setItem("career_app_cabinet_tab", id);
    } catch (_error) {
      // ignore storage errors (private mode, quota, etc.)
    }
  }

  function openAccountSettings() {
    setAccountPanel("account");
    setAccountDrawerOpen(true);
    setUserMenuOpen(false);
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <button type="button" className="brand brand-link" onClick={() => goTo("home")}>
          <img src="/logo-career-cv.png" alt="Career CV" className="brand-logo" />
        </button>

        <nav className="topnav" ref={navRef}>
          {CABINET_NAV_ITEMS.map((item) => {
            if (!item.children) {
              return (
                <button
                  key={item.id}
                  className={`nav-btn ${tab === item.id ? "active" : ""}`}
                  onClick={() => goTo(item.id)}
                >
                  <span className="nav-btn-icon">
                    <UiIcon name={item.icon} />
                  </span>
                  <span className="nav-btn-label">{copy[item.id]}</span>
                </button>
              );
            }
            const isChildActive = item.children.some((child) => child.id === tab);
            const isOpen = openGroup === item.id;
            return (
              <div className="nav-btn-group" key={item.id}>
                <button
                  type="button"
                  className={`nav-btn ${isChildActive ? "active" : ""}`}
                  onClick={(event) => toggleGroup(item.id, event)}
                >
                  <span className="nav-btn-icon">
                    <UiIcon name={item.icon} />
                  </span>
                  <span className="nav-btn-label">{copy[item.id]}</span>
                  <UiIcon name="chevron" className={`nav-btn-caret ${isOpen ? "open" : ""}`} />
                </button>
                {isOpen && dropdownPos ? (
                  <div className="nav-btn-dropdown" style={{ top: dropdownPos.top, left: dropdownPos.left }}>
                    {item.children.map((child) => (
                      <button
                        key={child.id}
                        type="button"
                        className={tab === child.id ? "active" : ""}
                        onClick={() => goTo(child.id)}
                      >
                        <UiIcon name={child.icon} />
                        <span>{copy[child.id]}</span>
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            );
          })}
        </nav>

        <div className="topbar-user">
          <div className="topbar-notif" ref={notifRef}>
            <button
              type="button"
              className="topbar-icon-btn"
              title={copy.notifications}
              onClick={() => setNotifOpen((prev) => !prev)}
            >
              <UiIcon name="bell" />
              {unreadNotificationCount ? (
                <span className="topbar-notif-badge">{unreadNotificationCount > 9 ? "9+" : unreadNotificationCount}</span>
              ) : null}
            </button>
            {notifOpen ? (
              <div className="topbar-notif-panel">
                <div className="topbar-notif-panel-head">
                  <strong>{copy.notifications}</strong>
                  <span className="muted">
                    {notifications.length ? `${notifications.length} ${language === "en" ? "item(s)" : "élément(s)"}` : copy.notifNothing}
                  </span>
                </div>
                {unreadNotificationCount ? (
                  <button type="button" className="topbar-notif-mark-read" onClick={markAllNotificationsRead}>
                    {copy.markAllRead}
                  </button>
                ) : null}
                {notifications.length ? (
                  <div className="topbar-notif-list">
                    {notifications.map((item) => {
                      const isUnread = !readNotificationIds.has(item.id);
                      return (
                        <div key={item.id} className={`topbar-notif-row ${isUnread ? "unread" : ""}`}>
                          <span className="topbar-notif-icon">
                            <UiIcon name={item.type === "recruiter_joined" ? "profile" : item.type === "mission_no_candidate" ? "briefcase" : "alert"} />
                          </span>
                          <div>
                            <strong>{item.title}</strong>
                            <span className="muted" title={item.body}>{item.body}</span>
                            {item.createdAt ? <span className="topbar-notif-time">{formatDate(item.createdAt)}</span> : null}
                          </div>
                          {isUnread ? <span className="topbar-notif-dot" aria-hidden="true" /> : null}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="muted topbar-notif-empty">{copy.notifEmpty}</p>
                )}
              </div>
            ) : null}
          </div>
          <LanguageSwitch language={language} setLanguage={setLanguage} variant="dropdown" />
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
                {copy.manageAccount}
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

      <main className="main-wrap">
        {tab === "home" ? <CabinetHomePage user={user} language={language} onGoTo={goTo} /> : null}
        {tab === "recruiters" ? <CabinetRecruitersPage user={user} language={language} /> : null}
        {tab === "candidates" ? <CabinetCandidatesPage user={user} language={language} /> : null}
        {tab === "missions" ? <CabinetMissionsPage user={user} language={language} /> : null}
        {tab === "reports" ? <CabinetReportsPage user={user} language={language} /> : null}
        {tab === "invitations" ? <CabinetInvitationsPage user={user} language={language} /> : null}
        {tab === "announcements" ? <CabinetAnnouncementsPage user={user} language={language} /> : null}
        {tab === "license" ? <CabinetLicensePage user={user} language={language} currency={currency} /> : null}
        {tab === "billing" ? <CabinetBillingPage user={user} language={language} currency={currency} /> : null}
        {tab === "pricing" ? <CabinetPricingPage user={user} language={language} currency={currency} /> : null}
        {tab === "settings" ? <CabinetSettingsPage user={user} language={language} /> : null}
      </main>

      <ConnectedFooter
        copy={landingCopy}
        onBrandClick={() => goTo("home")}
        onHomeClick={() => goTo("home")}
        onPricingClick={() => goTo("pricing")}
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
