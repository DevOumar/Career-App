import React, { useState } from "react";
// « Voir toutes les notifications » de l'espace admin, sur le modèle de la
// page Notifications de Jurysia : même source et même état lu / non lu que la
// cloche (jamais un flux distinct qui pourrait diverger).
//  - onglets « Toutes » / « Non lues » ;
//  - une ligne par événement, pastille et fond teinté tant qu'il n'est pas lu ;
//  - « Tout marquer comme lu ».
import { AdminLineIcon, adminNotificationIcon, adminNotificationText, adminNotifRelativeLabel } from "../AdminApp.jsx";

export default function AdminNotificationsPage({ language, notifications = [], readIds = [], onOpen, onMarkAllRead }) {
  const t = (fr, en) => (language === "en" ? en : fr);
  const [filter, setFilter] = useState("all");
  const events = [...notifications].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  const unread = events.filter((item) => !readIds.includes(item.id));
  const shown = filter === "unread" ? unread : events;

  return (
    <section className="admin-notifications">
      <header className="module-header jy-notif-page-head">
        <div>
          <h2>{t("Notifications", "Notifications")}</h2>
          <p>
            {t(
              "Événements réels de la plateforme : inscriptions et paiements des 7 derniers jours, licences épuisées, échecs d'envoi d'annonce.",
              "Real platform events: signups and payments from the last 7 days, full licenses, announcement send failures."
            )}
          </p>
        </div>
        {unread.length ? (
          <button type="button" className="jy-btn jy-btn-outline" onClick={onMarkAllRead}>
            <AdminLineIcon name="quality" />
            {t("Tout marquer comme lu", "Mark all as read")}
          </button>
        ) : null}
      </header>

      <div className="jy-notif-tabs" role="tablist">
        {["all", "unread"].map((value) => (
          <button key={value} type="button" role="tab" aria-selected={filter === value} className={filter === value ? "is-active" : ""} onClick={() => setFilter(value)}>
            {value === "all" ? t("Toutes", "All") : t("Non lues", "Unread")}
            {value === "unread" ? <span>({unread.length})</span> : null}
          </button>
        ))}
      </div>

      {shown.length ? (
        <div className="jy-card jy-card-flush jy-notif-page-list">
          {shown.map((item) => {
            const text = adminNotificationText(item, language);
            const isUnread = !readIds.includes(item.id);
            return (
              <button key={item.id} type="button" className={`jy-notif-event is-large ${isUnread ? "is-unread" : ""}`} onClick={() => onOpen?.(item)}>
                <span className="jy-notif-event-icon">
                  <AdminLineIcon name={adminNotificationIcon(item)} />
                </span>
                <span className="jy-notif-event-body">
                  <strong>{text.title}</strong>
                  {text.detail ? <span>{text.detail}</span> : null}
                  {item.createdAt ? <small>{adminNotifRelativeLabel(item.createdAt, language)}</small> : null}
                </span>
                {isUnread ? <span className="jy-notif-dot" aria-label={t("Non lue", "Unread")} /> : null}
              </button>
            );
          })}
        </div>
      ) : (
        <div className="jy-card jy-notif-page-empty">
          <AdminLineIcon name="bell" />
          <strong>{filter === "unread" ? t("Aucune notification non lue", "No unread notifications") : t("Aucune notification", "No notifications")}</strong>
          <span>{t("Les nouvelles activités apparaîtront ici.", "New activity will appear here.")}</span>
        </div>
      )}
    </section>
  );
}
