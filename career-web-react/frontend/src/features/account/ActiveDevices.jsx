import React, { useState } from "react";
import Swal from "sweetalert2";
// Appareils connectés (Compte › Sécurité). La liste peut devenir longue :
// l'appareil actuel d'abord, puis les plus récemment actifs, repliés au-delà
// de VISIBLE_OTHERS ; un bouton déconnecte tous les autres d'un coup.
import { formatDateTime } from "../../lib/format.js";

const VISIBLE_OTHERS = 3;

function DeviceIcon({ device }) {
  const mobile = /android|iphone|ipad|mobile/i.test(String(device || ""));
  return (
    <svg className="devices-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      {mobile ? (
        <>
          <rect x="7" y="2.5" width="10" height="19" rx="2" />
          <path d="M11 18h2" />
        </>
      ) : (
        <>
          <rect x="3" y="4" width="18" height="12" rx="2" />
          <path d="M8 20h8M12 16v4" />
        </>
      )}
    </svg>
  );
}

export default function ActiveDevices({ sessions = [], currentSessionId, language, onRevokeSession, onRevokeOtherSessions }) {
  const t = (fr, en) => (language === "en" ? en : fr);
  const [expanded, setExpanded] = useState(false);
  const [busyId, setBusyId] = useState("");

  const lastActivity = (item) => new Date(item.lastSeenAt || item.createdAt || 0).getTime();
  const current = sessions.find((item) => currentSessionId && item.id === currentSessionId) || null;
  const others = sessions.filter((item) => item !== current).sort((a, b) => lastActivity(b) - lastActivity(a));
  const shownOthers = expanded ? others : others.slice(0, VISIBLE_OTHERS);
  const hiddenCount = others.length - shownOthers.length;

  async function revoke(item) {
    setBusyId(item.id);
    try {
      await onRevokeSession(item.id);
    } finally {
      setBusyId("");
    }
  }

  async function revokeOthers() {
    const answer = await Swal.fire({
      icon: "warning",
      title: t("Déconnecter les autres appareils ?", "Sign out other devices?"),
      text: t(
        `${others.length} appareil(s) seront déconnectés. Seul cet appareil restera connecté.`,
        `${others.length} device(s) will be signed out. Only this device will stay signed in.`
      ),
      showCancelButton: true,
      confirmButtonText: t("Déconnecter", "Sign out"),
      cancelButtonText: t("Annuler", "Cancel"),
      confirmButtonColor: "#b83309",
      focusCancel: true
    });
    if (!answer.isConfirmed) return;
    setBusyId("__others");
    try {
      await onRevokeOtherSessions();
      setExpanded(false);
    } finally {
      setBusyId("");
    }
  }

  const renderRow = (item, isCurrent) => (
    <li key={item.id} className={`devices-row ${isCurrent ? "is-current" : ""}`}>
      <span className="devices-icon-wrap">
        <DeviceIcon device={item.device} />
      </span>
      <div className="devices-text">
        <strong>
          {[item.device, item.browser].filter(Boolean).join(" · ") || t("Appareil inconnu", "Unknown device")}
          {isCurrent ? <em>{t("Cet appareil", "This device")}</em> : null}
        </strong>
        <small>
          {[item.ipAddress, `${isCurrent ? t("Actif maintenant", "Active now") : `${t("Dernière activité", "Last active")} ${formatDateTime(item.lastSeenAt || item.createdAt, language)}`}`]
            .filter(Boolean)
            .join(" · ")}
        </small>
      </div>
      {!isCurrent && onRevokeSession ? (
        <button type="button" className="devices-revoke" disabled={Boolean(busyId)} onClick={() => revoke(item)}>
          {busyId === item.id ? "…" : t("Déconnecter", "Sign out")}
        </button>
      ) : null}
    </li>
  );

  return (
    <section className="devices-block">
      <header className="devices-head">
        <div>
          <h4>
            {t("Appareils actifs", "Active devices")}
            <span className="devices-count">{sessions.length}</span>
          </h4>
          <p>{t("Appareils actuellement connectés à votre compte.", "Devices currently signed in to your account.")}</p>
        </div>
        {others.length && onRevokeOtherSessions ? (
          <button type="button" className="devices-revoke-all" disabled={Boolean(busyId)} onClick={revokeOthers}>
            {busyId === "__others" ? "…" : t("Déconnecter les autres appareils", "Sign out other devices")}
          </button>
        ) : null}
      </header>

      {sessions.length ? (
        <ul className="devices-list">
          {current ? renderRow(current, true) : null}
          {shownOthers.map((item) => renderRow(item, false))}
        </ul>
      ) : (
        <p className="devices-empty">{t("Aucune session active.", "No active session.")}</p>
      )}

      {others.length > VISIBLE_OTHERS ? (
        <button type="button" className="devices-toggle" onClick={() => setExpanded((prev) => !prev)}>
          {expanded
            ? t("Afficher moins", "Show less")
            : t(`Afficher les ${hiddenCount} autres appareils`, `Show ${hiddenCount} more devices`)}
        </button>
      ) : null}
    </section>
  );
}
