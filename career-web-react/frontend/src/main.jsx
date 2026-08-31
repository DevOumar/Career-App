import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import ErrorBoundary from "./ErrorBoundary";
import CabinetPublicPage from "./features/cabinet/pages/CabinetPublicPage.jsx";
import "./styles.css";

// Vitrine publique d'un cabinet (#/cabinet/<slug>) — routée avant même le
// montage de l'App authentifiée : aucune session, aucun état applicatif
// partagé, juste un fetch public en lecture seule.
const publicCabinetMatch = window.location.hash.match(/^#\/cabinet\/([a-z0-9-]+)$/i);

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ErrorBoundary>
      {publicCabinetMatch ? <CabinetPublicPage slug={publicCabinetMatch[1]} /> : <App />}
    </ErrorBoundary>
  </React.StrictMode>
);
