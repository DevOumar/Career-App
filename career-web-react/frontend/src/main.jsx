import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import ErrorBoundary from "./ErrorBoundary";
import CabinetPublicPage from "./features/cabinet/pages/CabinetPublicPage.jsx";
import StepUpHost from "./features/account/mfa/StepUpHost.jsx";
import LogoutConfirmHost from "./features/account/LogoutConfirmHost.jsx";
import "./styles.css";
// Chargé après styles.css pour que la charte de l'espace admin (scopée sous
// .jy-admin) prenne le pas sur les anciennes règles à spécificité égale.
import "./features/admin/admin-shell.css";

// Vitrine publique d'un cabinet (#/cabinet/<slug>) — routée avant même le
// montage de l'App authentifiée : aucune session, aucun état applicatif
// partagé, juste un fetch public en lecture seule.
const publicCabinetMatch = window.location.hash.match(/^#\/cabinet\/([a-z0-9-]+)$/i);

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ErrorBoundary>
      {publicCabinetMatch ? <CabinetPublicPage slug={publicCabinetMatch[1]} /> : <App />}
      {/* Confirmation par second facteur des actions sensibles (voir lib/inMemoryDb.js). */}
      <StepUpHost />
      <LogoutConfirmHost />
    </ErrorBoundary>
  </React.StrictMode>
);
