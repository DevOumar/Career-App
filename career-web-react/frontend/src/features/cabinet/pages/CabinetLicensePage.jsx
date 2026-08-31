import React from "react";
import { useState, useEffect } from "react";
import { UiIcon } from "../../../components/UiIcon.jsx";
import { getFriendlyErrorMessage } from "../../../lib/errors.js";
import { formatDate } from "../../../lib/format.js";
import { getCabinetLicense } from "../../../lib/inMemoryDb.js";
import { getPlanById } from "../../../data/plans.js";

function maskCode(code) {
  if (!code) return "";
  const parts = code.split("-");
  if (parts.length < 3) return code.replace(/[A-Z0-9]/g, "•");
  return `${parts[0]}-••••-${parts[parts.length - 1]}`;
}

export default function CabinetLicensePage({ user, language, currency }) {
  const copy =
    language === "en"
      ? {
          title: "My license",
          subtitle: "Seats granted by Career CV for your firm.",
          seats: "Seats used",
          plan: "Plan",
          created: "Issued on",
          active: "Active",
          revoked: "Revoked",
          copy: "Copy code",
          copied: "Copied!",
          reveal: "Show code",
          hide: "Hide code",
          remaining: "seats left",
          empty: "No license code yet.",
          emptyHint: "Contact Career CV to get a license for your firm."
        }
      : {
          title: "Ma licence",
          subtitle: "Sièges accordés par Career CV pour votre cabinet.",
          seats: "Sièges utilisés",
          plan: "Plan",
          created: "Émise le",
          active: "Active",
          revoked: "Révoquée",
          copy: "Copier le code",
          copied: "Copié !",
          reveal: "Afficher le code",
          hide: "Masquer le code",
          remaining: "sièges restants",
          empty: "Aucun code de licence pour l'instant.",
          emptyHint: "Contactez Career CV pour obtenir une licence pour votre cabinet."
        };

  const [items, setItems] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    getCabinetLicense(user.id).then(setItems).catch((err) => setError(getFriendlyErrorMessage(err, language)));
  }, [user.id, language]);

  if (error) return <p className="field-error">{error}</p>;

  return (
    <section className="cv-history-page cabinet-page">
      <div className="card block history-head">
        <div className="feature-page-header">
          <span className="feature-page-header-icon">
            <UiIcon name="save" />
          </span>
          <div>
            <h2>{copy.title}</h2>
            <p className="muted">{copy.subtitle}</p>
          </div>
        </div>
      </div>

      {items?.length ? (
        <div className="history-list">
          {items.map((item) => (
            <CabinetLicenseCard key={item.code} item={item} language={language} currency={currency} copy={copy} />
          ))}
        </div>
      ) : items ? (
        <div className="history-empty">
          <div className="history-empty-icon">
            <UiIcon name="save" />
          </div>
          <h2>{copy.empty}</h2>
          <p>{copy.emptyHint}</p>
        </div>
      ) : null}
    </section>
  );
}

function CabinetLicenseCard({ item, language, currency, copy }) {
  const [copied, setCopied] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const pct = item.seatsTotal ? Math.min(100, Math.round((item.seatsUsed / item.seatsTotal) * 100)) : 0;
  const remaining = Math.max(0, Number(item.seatsTotal || 0) - Number(item.seatsUsed || 0));
  const plan = getPlanById(item.planId);

  function handleCopy() {
    navigator.clipboard?.writeText(item.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  return (
    <article className="history-card">
      <div className="history-card-top">
        <div className="history-card-main">
          <span className="history-card-icon">
            <UiIcon name="save" />
          </span>
          <div>
            <h3>{plan?.name?.[language] || plan?.name?.fr || item.planId}</h3>
            <p>{copy.created} {formatDate(item.createdAt)}</p>
          </div>
        </div>
        <span className={`tag ${item.revoked ? "tag-danger" : "tag-success"}`}>{item.revoked ? copy.revoked : copy.active}</span>
      </div>

      <div className="cabinet-license-code-row">
        <span className="pricing-license-code">{revealed ? item.code : maskCode(item.code)}</span>
        <button type="button" className="btn-ghost" onClick={() => setRevealed((prev) => !prev)}>
          <UiIcon name="eye" /> {revealed ? copy.hide : copy.reveal}
        </button>
        <button type="button" className="btn-ghost" onClick={handleCopy}>
          {copied ? copy.copied : copy.copy}
        </button>
      </div>

      <div className="history-card-stats">
        <span className="history-card-stat">{copy.seats}: {item.seatsUsed}/{item.seatsTotal} ({pct}% · {remaining} {copy.remaining})</span>
      </div>
    </article>
  );
}
