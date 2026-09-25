import React, { useCallback, useEffect, useState } from "react";
// Panneau Compte › Sécurité : second facteur et clés physiques, sur le
// modèle de Jurysia. Ce composant ne décide RIEN : chaque action appelle
// l'API, qui vérifie la session et exige une confirmation d'identité
// (step-up) pour les opérations sensibles. Si l'API la demande, on ouvre la
// fenêtre de confirmation et on rejoue l'action (voir useStepUp).
import {
  cancelTotpEnrollment,
  confirmTotpEnrollment,
  disableTotp,
  finishSecurityKeyRegistration,
  getMfaStatus,
  regenerateRecoveryCodes,
  revokeSecurityKey,
  startSecurityKeyRegistration,
  startTotpEnrollment
} from "../../../lib/inMemoryDb.js";
import { formatDateTime } from "../../../lib/format.js";
import { MfaDialog, MfaError, MfaIcon, OtpBoxes, RecoveryCodesDialog, mfaT, mfaToast, useStepUp } from "./MfaUi.jsx";
import { createSecurityKeyCredential, supportsSecurityKeys } from "./webauthnClient.js";

export default function MfaSection({ user, language }) {
  const t = mfaT(language);
  const { run, dialog: stepUpDialog } = useStepUp({ userId: user.id, language });

  const [status, setStatus] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [busy, setBusy] = useState(false);

  // Application d'authentification
  const [enrollment, setEnrollment] = useState(null);
  const [enrollCode, setEnrollCode] = useState("");
  const [enrollError, setEnrollError] = useState("");
  const [disableOpen, setDisableOpen] = useState(false);

  // Clés de sécurité
  const [keyDialogOpen, setKeyDialogOpen] = useState(false);
  const [keyName, setKeyName] = useState("");
  const [keyError, setKeyError] = useState("");
  const [keyToRevoke, setKeyToRevoke] = useState(null);

  // Codes de récupération : affichés une seule fois
  const [codes, setCodes] = useState(null);

  const load = useCallback(async () => {
    try {
      setStatus(await getMfaStatus(user.id));
      setLoadError("");
    } catch (error) {
      setLoadError(error.message);
    }
  }, [user.id]);

  useEffect(() => {
    load();
  }, [load]);

  const failed = (result) => {
    if (!result.ok && !result.cancelled) mfaToast("error", result.error?.message || t("L'opération a échoué.", "The operation failed."));
  };

  // --------------------------------------------------------------- TOTP
  async function openEnrollment() {
    setBusy(true);
    const result = await run((stepUp) => startTotpEnrollment(user.id, stepUp));
    setBusy(false);
    if (!result.ok) return failed(result);
    setEnrollError("");
    setEnrollCode("");
    setEnrollment(result.data);
  }

  function closeEnrollment() {
    setEnrollment(null);
    setEnrollCode("");
    // Enrôlement abandonné : le secret en attente est effacé côté serveur.
    cancelTotpEnrollment(user.id).catch(() => {});
  }

  async function confirmEnrollment(code = enrollCode) {
    if (code.length !== 6) return;
    setBusy(true);
    setEnrollError("");
    try {
      const result = await confirmTotpEnrollment(user.id, code);
      // Le secret quitte la mémoire du composant dès l'activation.
      setEnrollment(null);
      setEnrollCode("");
      if (result.recoveryCodes?.length) setCodes(result.recoveryCodes);
      mfaToast("success", t("Double authentification activée", "Two-factor authentication enabled"));
      await load();
    } catch (error) {
      setEnrollError(
        error.code === "NO_PENDING"
          ? error.message
          : t(
              "Code incorrect ou expiré. Utilisez le code de l'entrée ajoutée en scannant CE QR code : une ancienne entrée Career CV ne fonctionne plus.",
              "Incorrect or expired code. Use the code from the entry added by scanning THIS QR code: an old Career CV entry no longer works."
            )
      );
      setEnrollCode("");
    } finally {
      setBusy(false);
    }
  }

  async function confirmDisable() {
    setDisableOpen(false);
    const result = await run((stepUp) => disableTotp(user.id, stepUp));
    if (!result.ok) return failed(result);
    mfaToast("success", t("Application d'authentification désactivée", "Authenticator app disabled"));
    await load();
  }

  // --------------------------------------------------------------- clés
  async function addKey() {
    setKeyError("");
    if (!supportsSecurityKeys()) {
      setKeyError(
        t(
          "Ce navigateur ne prend pas en charge les clés de sécurité, ou la page n'est pas servie via HTTPS.",
          "This browser doesn't support security keys, or the page isn't served over HTTPS."
        )
      );
      return;
    }
    const name = keyName.trim();
    if (!name) return;
    setBusy(true);
    // 1. options (c'est cet appel qui exige la confirmation d'identité)
    const optionsResult = await run((stepUp) => startSecurityKeyRegistration(user.id, stepUp));
    if (!optionsResult.ok) {
      setBusy(false);
      if (!optionsResult.cancelled) setKeyError(optionsResult.error?.message || t("L'opération avec la clé de sécurité a échoué.", "The security key operation failed."));
      return;
    }
    // 2. dialogue natif du navigateur avec la clé ; 3. vérification par l'API
    const credential = await createSecurityKeyCredential(optionsResult.data.options);
    if (!credential.ok) {
      setBusy(false);
      if (credential.reason === "duplicate") setKeyError(t("Cette clé est déjà enregistrée sur votre compte.", "This key is already registered on your account."));
      else if (credential.reason !== "cancelled") setKeyError(t("L'opération avec la clé de sécurité a échoué.", "The security key operation failed."));
      return;
    }
    try {
      const saved = await finishSecurityKeyRegistration(user.id, name, credential.response);
      setKeyDialogOpen(false);
      setKeyName("");
      if (saved.recoveryCodes?.length) setCodes(saved.recoveryCodes);
      mfaToast("success", t("Clé de sécurité ajoutée", "Security key added"));
      await load();
    } catch (error) {
      setKeyError(error.message);
    } finally {
      setBusy(false);
    }
  }

  async function confirmRevoke() {
    const key = keyToRevoke;
    setKeyToRevoke(null);
    if (!key) return;
    const result = await run((stepUp) => revokeSecurityKey(user.id, key.id, stepUp));
    if (!result.ok) return failed(result);
    mfaToast("success", t("Clé de sécurité révoquée", "Security key revoked"));
    await load();
  }

  // --------------------------------------------------------------- codes
  async function regenerate() {
    const result = await run((stepUp) => regenerateRecoveryCodes(user.id, stepUp));
    if (!result.ok) return failed(result);
    setCodes(result.data.recoveryCodes);
    await load();
  }

  if (loadError)
    return (
      <div className="mfa-section">
        <div className="mfa-error">
          <MfaIcon name="alert" />
          <span>
            {t("Impossible de charger la double authentification.", "Couldn't load two-factor authentication.")} {loadError}
          </span>
        </div>
        <button type="button" className="mfa-btn secondary" style={{ justifySelf: "start" }} onClick={load}>
          {t("Réessayer", "Retry")}
        </button>
      </div>
    );
  if (!status) return <div className="mfa-loading"><span className="mfa-spinner dark" /></div>;

  const keysSupported = supportsSecurityKeys();
  const lowCodes = status.recoveryCodes.remaining <= 2;

  return (
    <div className="mfa-section">
      {/* ------------------------------------------------ état global + application */}
      <section className="mfa-card">
        <header className="mfa-card-head">
          <span className="mfa-round brand">
            <MfaIcon name="shieldCheck" />
          </span>
          <div className="mfa-card-title">
            <h4>{t("Authentification multifactorielle (MFA)", "Two-factor authentication")}</h4>
            <p>{t("Un second facteur exigé à la connexion, en plus du mot de passe.", "A second factor required at sign-in, on top of your password.")}</p>
          </div>
          <span className={`mfa-badge ${status.enabled ? "on" : ""}`}>
            <MfaIcon name={status.enabled ? "shieldCheck" : "shieldOff"} />
            {status.enabled ? t("Activée", "Enabled") : t("Désactivée", "Disabled")}
          </span>
        </header>
        <div className="mfa-card-split">
          <header className="mfa-card-head">
            <div className="mfa-card-title">
              <h4 className="with-icon">
                <MfaIcon name="smartphone" />
                {t("Application d'authentification", "Authenticator app")}
              </h4>
              <p>{t("Codes à 6 chiffres générés par une application compatible TOTP.", "Six-digit codes generated by any TOTP-compatible app.")}</p>
            </div>
            <span className={`mfa-badge ${status.totp.active ? "on" : ""}`}>{status.totp.active ? t("Activée", "Enabled") : t("Désactivée", "Disabled")}</span>
          </header>
          <div className="mfa-card-actions">
            {status.totp.active ? (
              <button type="button" className="mfa-btn secondary" onClick={() => setDisableOpen(true)}>
                <MfaIcon name="shieldOff" /> {t("Désactiver", "Disable")}
              </button>
            ) : (
              <button type="button" className="mfa-btn primary" disabled={busy || !status.available} onClick={openEnrollment}>
                {busy ? <span className="mfa-spinner" /> : <MfaIcon name="shieldCheck" />} {t("Activer", "Enable")}
              </button>
            )}
            {!status.available ? (
              <small className="mfa-muted">{t("Indisponible : la clé de chiffrement n'est pas configurée sur le serveur.", "Unavailable: the encryption key is not configured on the server.")}</small>
            ) : null}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------ clés de sécurité */}
      <section className="mfa-card">
        <header className="mfa-card-head">
          <div className="mfa-card-title">
            <h4 className="with-icon">
              <MfaIcon name="usb" />
              {t("Clés de sécurité", "Security keys")}
            </h4>
            <p>{t("Clés physiques FIDO2 (USB-C, USB-A, NFC). Résistantes au hameçonnage.", "FIDO2 hardware keys (USB-C, USB-A, NFC). Phishing-resistant.")}</p>
          </div>
          <button
            type="button"
            className="mfa-btn secondary"
            disabled={!keysSupported}
            onClick={() => {
              setKeyError("");
              setKeyName("");
              setKeyDialogOpen(true);
            }}
          >
            <MfaIcon name="plus" /> {t("Ajouter une clé", "Add a key")}
          </button>
        </header>
        <div className="mfa-card-body">
          {!keysSupported ? (
            <p className="mfa-muted small">
              {t(
                "Ce navigateur ne prend pas en charge les clés de sécurité, ou la page n'est pas servie via HTTPS.",
                "This browser doesn't support security keys, or the page isn't served over HTTPS."
              )}
            </p>
          ) : null}
          {status.securityKeys.length ? (
            status.securityKeys.map((key) => (
              <div key={key.id} className="mfa-key-row">
                <span className="mfa-square">
                  <MfaIcon name="key" />
                </span>
                <div>
                  <strong>{key.name}</strong>
                  <small>
                    {t("Ajoutée le", "Added on")} {formatDateTime(key.createdAt, language)} · {t("Dernière utilisation", "Last used")}{" "}
                    {key.lastUsedAt ? formatDateTime(key.lastUsedAt, language) : t("jamais", "never")}
                  </small>
                </div>
                <button type="button" className="mfa-btn ghost" onClick={() => setKeyToRevoke(key)}>
                  <MfaIcon name="trash" /> {t("Révoquer", "Revoke")}
                </button>
              </div>
            ))
          ) : (
            <p className="mfa-muted">{t("Aucune clé de sécurité enregistrée.", "No security key registered.")}</p>
          )}
        </div>
      </section>

      {/* ------------------------------------------------ codes de récupération */}
      {status.enabled ? (
        <section className="mfa-card">
          <header className="mfa-card-head">
            <span className="mfa-round">
              <MfaIcon name="key" />
            </span>
            <div className="mfa-card-title">
              <h4>{t("Codes de récupération", "Recovery codes")}</h4>
              <p>
                {t(
                  "Codes à usage unique, à conserver hors ligne. Ils permettent d'accéder au compte en cas de perte du téléphone et des clés.",
                  "Single-use codes to keep offline. They let you into your account if you lose your phone and keys."
                )}
              </p>
            </div>
            <span className={`mfa-count ${lowCodes ? "low" : ""}`}>
              <strong>{status.recoveryCodes.remaining}</strong>
              <small>{t("code(s) restant(s)", "code(s) remaining")}</small>
            </span>
          </header>
          <div className="mfa-card-body">
            <div className="mfa-inline-note">
              <p>{t("Générer de nouveaux codes invalide immédiatement tous les anciens.", "Generating new codes immediately invalidates all old ones.")}</p>
              <button type="button" className="mfa-btn secondary" onClick={regenerate}>
                {t("Générer de nouveaux codes", "Generate new codes")}
              </button>
            </div>
          </div>
        </section>
      ) : null}

      {/* ================================================ fenêtres */}
      <MfaDialog
        open={Boolean(enrollment)}
        onClose={closeEnrollment}
        icon="smartphone"
        title={t("Application d'authentification", "Authenticator app")}
        description={t("Scannez ce QR code avec votre application d'authentification.", "Scan this QR code with your authenticator app.")}
        footer={
          <>
            <button type="button" className="mfa-btn ghost" onClick={closeEnrollment}>
              {t("Annuler", "Cancel")}
            </button>
            <button type="button" className="mfa-btn primary" disabled={busy || enrollCode.length !== 6} onClick={() => confirmEnrollment()}>
              {busy ? <span className="mfa-spinner" /> : null}
              {t("Confirmer", "Confirm")}
            </button>
          </>
        }
      >
        <MfaError message={enrollError} />
        {enrollment ? (
          <>
            <div className="mfa-step">
              <p className="mfa-step-title">
                <span>1</span>
                {t("Scanner", "Scan")}
              </p>
              <div className="mfa-qr">
                <img src={enrollment.qrCodeDataUrl} alt="" width={188} height={188} />
              </div>
              <p className="mfa-note">
                <MfaIcon name="alert" />
                {t(
                  "Chaque activation crée une nouvelle clé. Si Career CV figure déjà dans votre application (activation précédente), supprimez cette ancienne entrée : ses codes ne sont plus valables.",
                  "Each activation creates a new key. If Career CV is already in your app (previous activation), delete that old entry: its codes are no longer valid."
                )}
              </p>
              <button
                type="button"
                className="mfa-secret"
                onClick={() => {
                  navigator.clipboard.writeText(enrollment.secret).then(
                    () => mfaToast("success", t("Clé copiée", "Key copied")),
                    () => {}
                  );
                }}
              >
                <span>
                  <small>{t("Ou saisissez cette clé manuellement :", "Or enter this key manually:")}</small>
                  <code>{enrollment.secret.replace(/(.{4})/g, "$1 ").trim()}</code>
                </span>
                <MfaIcon name="copy" />
              </button>
            </div>
            <div className="mfa-sep" />
            <div className="mfa-step">
              <p className="mfa-step-title">
                <span>2</span>
                {t("Vérifier", "Verify")}
              </p>
              <p className="mfa-muted">{t("Saisissez le code affiché pour confirmer l'activation.", "Enter the code shown to confirm activation.")}</p>
              <OtpBoxes value={enrollCode} onChange={setEnrollCode} disabled={busy} onComplete={confirmEnrollment} autoFocus={false} />
            </div>
          </>
        ) : null}
      </MfaDialog>

      <MfaDialog
        open={keyDialogOpen}
        onClose={() => !busy && setKeyDialogOpen(false)}
        icon="usb"
        title={t("Ajouter une clé", "Add a key")}
        description={t("Insérez votre clé et touchez-la lorsqu'elle clignote.", "Insert your key and touch it when it blinks.")}
        footer={
          <>
            <button type="button" className="mfa-btn ghost" onClick={() => setKeyDialogOpen(false)} disabled={busy}>
              {t("Annuler", "Cancel")}
            </button>
            <button type="button" className="mfa-btn primary" disabled={busy || !keyName.trim()} onClick={addKey}>
              {busy ? <span className="mfa-spinner" /> : null}
              {t("Ajouter une clé", "Add a key")}
            </button>
          </>
        }
      >
        <MfaError message={keyError} />
        <div className="mfa-key-zone">
          <span className="mfa-key-pulse">
            <MfaIcon name="usb" />
          </span>
          <p>{t("Branchez-la ou approchez-la, puis touchez le capteur.", "Plug it in or hold it close, then touch the sensor.")}</p>
        </div>
        <label className="mfa-field">
          <span>{t("Nom de la clé", "Key name")}</span>
          <input
            value={keyName}
            maxLength={64}
            placeholder={t("Clé du bureau", "Office key")}
            onChange={(event) => setKeyName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && keyName.trim()) addKey();
            }}
          />
          <small>{t("Un nom vous permettra de savoir laquelle révoquer si vous en perdez une.", "A name tells you which one to revoke if you lose one.")}</small>
        </label>
      </MfaDialog>

      <MfaDialog
        open={Boolean(keyToRevoke)}
        onClose={() => setKeyToRevoke(null)}
        icon="trash"
        tone="danger"
        title={t("Révoquer cette clé ?", "Revoke this key?")}
        description={`${keyToRevoke?.name || ""}. ${t("Cette clé ne pourra plus servir à vous connecter. L'opération est définitive.", "This key will no longer sign you in. This cannot be undone.")}`}
        footer={
          <>
            <button type="button" className="mfa-btn ghost" onClick={() => setKeyToRevoke(null)}>
              {t("Annuler", "Cancel")}
            </button>
            <button type="button" className="mfa-btn danger" onClick={confirmRevoke}>
              {t("Révoquer", "Revoke")}
            </button>
          </>
        }
      />

      <MfaDialog
        open={disableOpen}
        onClose={() => setDisableOpen(false)}
        icon="shieldOff"
        tone="danger"
        title={t("Désactiver l'application d'authentification ?", "Disable the authenticator app?")}
        description={t(
          "Sans second facteur, votre compte ne sera plus protégé que par votre mot de passe.",
          "Without a second factor, your account will only be protected by your password."
        )}
        footer={
          <>
            <button type="button" className="mfa-btn ghost" onClick={() => setDisableOpen(false)}>
              {t("Annuler", "Cancel")}
            </button>
            <button type="button" className="mfa-btn danger" onClick={confirmDisable}>
              {t("Désactiver", "Disable")}
            </button>
          </>
        }
      >
        <p className="mfa-muted">
          {status.securityKeys.length
            ? t("Vos clés de sécurité resteront actives.", "Your security keys will remain active.")
            : t(
                "Votre application et ses codes de récupération ne protégeront plus ce compte.",
                "Your app and its recovery codes will no longer protect this account."
              )}
        </p>
      </MfaDialog>

      <RecoveryCodesDialog
        codes={codes}
        language={language}
        onClose={() => {
          setCodes(null);
          load();
        }}
      />
      {stepUpDialog}
    </div>
  );
}
