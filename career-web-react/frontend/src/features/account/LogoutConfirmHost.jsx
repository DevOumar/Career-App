import React, { useEffect, useState } from "react";
// Confirmation de déconnexion (modèle Jurysia) : « Se déconnecter de
// Career CV ? » avec la carte de l'utilisateur. Hôte global monté une fois
// (main.jsx) ; n'importe quel espace appelle askLogoutConfirmation().
import { AvatarCircle } from "../../components/AvatarCircle.jsx";
import { MfaDialog, mfaT } from "./mfa/MfaUi.jsx";

let openHost = null;

/** Ouvre la fenêtre ; résout true si l'utilisateur confirme. */
export function askLogoutConfirmation({ user, language }) {
  if (!openHost) return Promise.resolve(true);
  return new Promise((resolve) => openHost({ user, language, resolve }));
}

export default function LogoutConfirmHost() {
  const [pending, setPending] = useState(null);

  useEffect(() => {
    openHost = (request) => setPending(request);
    return () => {
      openHost = null;
    };
  }, []);

  if (!pending) return null;
  const t = mfaT(pending.language);
  const user = pending.user || {};
  const name = `${user.firstName || ""} ${user.lastName || ""}`.trim();

  function finish(confirmed) {
    pending.resolve(confirmed);
    setPending(null);
  }

  return (
    <MfaDialog
      open
      onClose={() => finish(false)}
      icon="logout"
      tone="danger"
      width={440}
      title={t("Se déconnecter de Career CV ?", "Sign out of Career CV?")}
      description={t("Vous devrez vous reconnecter pour accéder à nouveau à votre espace.", "You'll need to sign in again to access your space.")}
      footer={
        <>
          <button type="button" className="mfa-btn ghost" onClick={() => finish(false)}>
            {t("Annuler", "Cancel")}
          </button>
          <button type="button" className="mfa-btn danger" autoFocus onClick={() => finish(true)}>
            {t("Se déconnecter", "Sign out")}
          </button>
        </>
      }
    >
      <div className="logout-user-card">
        <AvatarCircle user={user} />
        <div>
          <strong>{name || user.email}</strong>
          {name && user.email ? <small>{user.email}</small> : null}
        </div>
      </div>
    </MfaDialog>
  );
}
