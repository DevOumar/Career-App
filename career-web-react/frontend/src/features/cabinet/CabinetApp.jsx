import React from "react";
// Module Cabinet : espace dédié aux cabinets de recrutement / cellules RH,
// construit avec le même langage visuel que l'app candidat (topbar + onglets
// horizontaux, cartes "history-card", pas de sidebar façon dashboard admin)
// — à la demande explicite du client, plus proche du candidat que de
// l'École/Admin niveau design, alors que la logique métier (licence,
// sièges, vivier de candidats, missions) est calquée sur celle de l'École.
import { useState } from "react";
import { UiIcon } from "../../components/UiIcon.jsx";
import { AvatarCircle } from "../../components/AvatarCircle.jsx";
import { LanguageSwitch } from "../../components/LanguageSwitch.jsx";
import { getAccountLabel } from "../../lib/accounts.js";
import AccountDrawer from "../account/AccountDrawer.jsx";
import { ConnectedFooter } from "../../App.jsx";
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

export const CABINET_NAV_ITEMS = [
  { id: "home", icon: "home" },
  { id: "recruiters", icon: "profile" },
  { id: "candidates", icon: "network" },
  { id: "missions", icon: "briefcase" },
  { id: "reports", icon: "file" },
  { id: "invitations", icon: "mail" },
  { id: "announcements", icon: "chat" },
  { id: "license", icon: "save" },
  { id: "billing", icon: "scale" },
  { id: "pricing", icon: "pricetag" },
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
          role: "Recruitment firm",
          logout: "Log out",
          manageAccount: "Manage account",
          secured: "Secured by"
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
          role: "Cabinet de recrutement",
          logout: "Déconnexion",
          manageAccount: "Gérer son compte",
          secured: "Sécurisé par"
        };

  function goTo(id) {
    setTab(id);
    setUserMenuOpen(false);
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

        <nav className="topnav">
          {CABINET_NAV_ITEMS.map((item) => (
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
          ))}
        </nav>

        <div className="topbar-user">
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
