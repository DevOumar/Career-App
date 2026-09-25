import React, { useEffect, useState } from "react";
// Espace École › Ma licence : les sièges accordés par Career CV à
// l'établissement, le code à partager avec les étudiants et son usage.
import { AdminPageLoader } from "../../../components/AdminPageLoader.jsx";
import { getPlanById } from "../../../data/plans.js";
import { getFriendlyErrorMessage } from "../../../lib/errors.js";
import { formatDateTime } from "../../../lib/format.js";
import { getSchoolInvitations, getSchoolLicense, getSchoolOverview } from "../../../lib/inMemoryDb.js";
import { AdminLineIcon, planPriceLabel } from "../../admin/AdminApp.jsx";

function maskCode(code = "") {
  const parts = code.split("-");
  if (parts.length < 3) return code.replace(/[A-Z0-9]/g, "•");
  return `${parts[0]}-••••-${parts[parts.length - 1]}`;
}

export default function SchoolLicensePage({ user, language, currency, onGoToTab }) {
  const t = (fr, en) => (language === "en" ? en : fr);
  const [codes, setCodes] = useState(null);
  const [overview, setOverview] = useState(null);
  const [pendingInvites, setPendingInvites] = useState(0);
  const [error, setError] = useState("");
  const [revealed, setRevealed] = useState({});
  const [copied, setCopied] = useState("");

  useEffect(() => {
    getSchoolLicense(user.id)
      .then(setCodes)
      .catch((err) => setError(getFriendlyErrorMessage(err, language)));
    getSchoolOverview(user.id)
      .then(setOverview)
      .catch(() => {});
    getSchoolInvitations(user.id)
      .then((items) => setPendingInvites((items || []).filter((item) => item.status !== "redeemed").length))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.id]);

  async function copyCode(code) {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(code);
      setTimeout(() => setCopied(""), 1800);
    } catch (_error) {
      setRevealed((current) => ({ ...current, [code]: true }));
    }
  }

  if (error) return <p className="field-error">{error}</p>;
  if (!codes) return <AdminPageLoader language={language} />;

  const header = (
    <header className="module-header admin-accounts-header">
      <div>
        <h2>{t("Ma licence", "My license")}</h2>
        <p>{t("Les sièges accordés par Career CV à votre établissement, et le code à partager avec vos étudiants.", "Seats granted by Career CV to your institution, and the code to share with your students.")}</p>
      </div>
      {onGoToTab ? (
        <div className="admin-header-actions">
          <button type="button" className="jy-btn jy-btn-outline" onClick={() => onGoToTab("pricing")}>
            <AdminLineIcon name="pricing" />
            {t("Voir les offres", "View plans")}
          </button>
          <button type="button" className="jy-btn jy-btn-primary" onClick={() => onGoToTab("invitations")}>
            <AdminLineIcon name="send" />
            {t("Inviter des étudiants", "Invite students")}
          </button>
        </div>
      ) : null}
    </header>
  );

  if (!codes.length) {
    return (
      <section className="admin-accounts">
        {header}
        <div className="jy-card jy-empty-block">
          <span className="jy-empty-icon">
            <AdminLineIcon name="licenses" />
          </span>
          <strong>{t("Aucune licence pour le moment", "No license yet")}</strong>
          <span>{t("Contactez Career CV pour obtenir une licence et des sièges pour vos étudiants.", "Contact Career CV to get a license and seats for your students.")}</span>
        </div>
      </section>
    );
  }

  const totalSeats = codes.reduce((sum, item) => sum + Number(item.seatsTotal || 0), 0);
  const usedSeats = codes.reduce((sum, item) => sum + Number(item.seatsUsed || 0), 0);
  const freeSeats = Math.max(0, totalSeats - usedSeats);

  const facts = [
    { icon: "accounts", label: t("Étudiants rattachés", "Linked students"), value: overview?.totalStudents ?? usedSeats, tone: "" },
    { icon: "seat", label: t("Sièges utilisés", "Seats used"), value: `${usedSeats} / ${totalSeats}`, tone: "green" },
    { icon: "clock", label: t("Invitations en attente", "Pending invitations"), value: pendingInvites, tone: pendingInvites ? "gold" : "" },
    { icon: "quality", label: t("Sièges disponibles", "Seats available"), value: freeSeats, tone: freeSeats ? "green" : "danger" }
  ];

  return (
    <section className="admin-accounts jy-license">
      {header}

      <div className="jy-mini-cards">
        {facts.map((fact) => (
          <div key={fact.label} className="jy-mini-card">
            <span className="jy-mini-card-label">
              <AdminLineIcon name={fact.icon} />
              {fact.label}
            </span>
            <strong className={fact.tone}>{fact.value}</strong>
          </div>
        ))}
      </div>

      {codes.map((item) => {
        const plan = getPlanById(item.planId);
        const share = item.seatsTotal ? Math.min(100, Math.round((item.seatsUsed / item.seatsTotal) * 100)) : 0;
        const remaining = Math.max(0, Number(item.seatsTotal || 0) - Number(item.seatsUsed || 0));
        const shown = revealed[item.code];
        return (
          <div key={item.code} className={`jy-license-card ${item.revoked ? "is-revoked" : ""}`}>
            <div className="jy-license-main">
              <div className="jy-license-head">
                <span className="jy-license-icon">
                  <AdminLineIcon name="licenses" />
                </span>
                <span>
                  <small>{t("Offre", "Plan")}</small>
                  <strong>{plan?.name?.[language] || plan?.name?.fr || item.planId}</strong>
                </span>
                <span className={`tag ${item.revoked ? "tag-danger" : "tag-success"}`}>{item.revoked ? t("Révoquée", "Revoked") : t("Active", "Active")}</span>
              </div>

              <div className="jy-license-code">
                <small>{t("Code à partager avec vos étudiants", "Code to share with your students")}</small>
                <div className="jy-license-code-row">
                  <code>{shown ? item.code : maskCode(item.code)}</code>
                  <button type="button" className="jy-icon-btn" onClick={() => setRevealed((current) => ({ ...current, [item.code]: !shown }))} title={shown ? t("Masquer le code", "Hide code") : t("Afficher le code", "Show code")} aria-label={shown ? t("Masquer le code", "Hide code") : t("Afficher le code", "Show code")}>
                    <AdminLineIcon name={shown ? "eyeOff" : "eye"} />
                  </button>
                  <button type="button" className="jy-btn jy-btn-outline jy-btn-sm" onClick={() => copyCode(item.code)}>
                    <AdminLineIcon name={copied === item.code ? "quality" : "link"} />
                    {copied === item.code ? t("Copié !", "Copied!") : t("Copier", "Copy")}
                  </button>
                </div>
              </div>

              <div className="jy-license-meta">
                <span>
                  <small>{t("Émise le", "Issued on")}</small>
                  <strong>{formatDateTime(item.createdAt, language)}</strong>
                </span>
                <span>
                  <small>{t("Tarif", "Price")}</small>
                  <strong>{planPriceLabel(item.planId, "annual", t("Gratuit", "Free"), currency)}</strong>
                </span>
              </div>
            </div>

            <div className="jy-license-seats">
              <div className="jy-license-ring" style={{ "--share": `${share}%` }}>
                <span>
                  <strong>{item.seatsUsed}</strong>
                  <small>/ {item.seatsTotal}</small>
                </span>
              </div>
              <strong>{t("Sièges utilisés", "Seats used")}</strong>
              <small>
                {share} % · {remaining} {t("siège(s) restant(s)", "seat(s) left")}
              </small>
              {remaining === 0 ? <span className="jy-license-full">{t("Licence complète", "License full")}</span> : null}
            </div>
          </div>
        );
      })}

      <div className="jy-card">
        <div className="jy-card-head">
          <h3>{t("Comment ça marche", "How it works")}</h3>
        </div>
        <ol className="jy-steps">
          <li>
            <span>1</span>
            <div>
              <strong>{t("Partagez le code", "Share the code")}</strong>
              <small>{t("Envoyez-le depuis « Invitations » (un siège est réservé à chaque invitation) ou diffusez-le à vos étudiants.", "Send it from “Invitations” (a seat is reserved for each invitation) or share it with your students.")}</small>
            </div>
          </li>
          <li>
            <span>2</span>
            <div>
              <strong>{t("L'étudiant s'inscrit avec", "The student signs up with it")}</strong>
              <small>{t("Il est rattaché à votre établissement, occupe un siège et accède aux fonctionnalités de l'offre.", "They're linked to your institution, take a seat and get the plan's features.")}</small>
            </div>
          </li>
          <li>
            <span>3</span>
            <div>
              <strong>{t("Libérez un siège si besoin", "Free a seat if needed")}</strong>
              <small>{t("Retirer un étudiant (module Étudiants) libère son siège ; il garde ses données et repasse au plan gratuit.", "Removing a student (Students module) frees their seat; they keep their data and go back to the free plan.")}</small>
            </div>
          </li>
        </ol>
      </div>
    </section>
  );
}
