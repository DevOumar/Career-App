import React from "react";
// Briques communes aux modules IA de l'espace candidat (Lettre IA,
// Négociation) : barre latérale (historique + poste ciblé + conseils),
// bandeau d'en-tête illustré et grandes illustrations SVG.
import { UiIcon } from "./UiIcon.jsx";

export function relativeDateLabel(value, language) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const en = language === "en";
  const minutes = Math.round((Date.now() - date.getTime()) / 60000);
  if (minutes < 1) return en ? "just now" : "à l'instant";
  if (minutes < 60) return en ? `${minutes} min ago` : `il y a ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return en ? `${hours} h ago` : `il y a ${hours} h`;
  const days = Math.round(hours / 24);
  if (days === 1) return en ? "yesterday" : "hier";
  if (days < 7) return en ? `${days} days ago` : `il y a ${days} jours`;
  return date.toLocaleDateString(en ? "en-GB" : "fr-FR", { day: "numeric", month: "short" });
}

export function ModuleHistorySidebar({ language, newLabel, historyLabel, emptyLabel, deleteLabel, items, activeId, icon, onNew, onSelect, onDelete, renderMeta, children }) {
  return (
    <aside className="mw-sidebar">
      <button type="button" className="mw-new-btn" onClick={onNew}>
        <UiIcon name="plus" />
        {newLabel}
      </button>

      <div className="mw-side-card mw-history">
        <div className="mw-side-head">
          <span>{historyLabel}</span>
          <em>{items.length}</em>
        </div>
        {items.length ? (
          <ul className="mw-history-list">
            {items.map((item) => (
              <li key={item.id}>
                <button type="button" className={`mw-history-item ${item.id === activeId ? "is-active" : ""}`} onClick={() => onSelect(item)}>
                  <span className="mw-history-icon">
                    <UiIcon name={icon} />
                  </span>
                  <span className="mw-history-text">
                    <strong title={item.title}>{item.title}</strong>
                    <small>
                      {renderMeta ? renderMeta(item) : null}
                      {item.updatedAt || item.createdAt ? <span>{relativeDateLabel(item.updatedAt || item.createdAt, language)}</span> : null}
                    </small>
                  </span>
                </button>
                <button type="button" className="mw-history-delete" onClick={(event) => onDelete(event, item)} aria-label={deleteLabel} title={deleteLabel}>
                  <UiIcon name="trash" />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mw-history-empty">{emptyLabel}</p>
        )}
      </div>

      {children}
    </aside>
  );
}

// Poste réellement ciblé (offre analysée dans « Importer CV ») : c'est la
// matière première utilisée par l'IA du module.
export function ModuleTargetCard({ language, offer, candidate, title, note }) {
  const t = (fr, en) => (language === "en" ? en : fr);
  if (!offer) return null;
  const skills = (offer.skills || []).filter(Boolean).slice(0, 6);
  const location = offer.location && offer.location !== "Non précisé" ? offer.location : "";
  const candidateName = [candidate?.firstName, candidate?.lastName].filter(Boolean).join(" ");
  return (
    <div className="mw-side-card mw-target">
      <div className="mw-side-head">
        <span>{title || t("Poste ciblé", "Target role")}</span>
      </div>
      <div className="mw-target-role">
        <span className="mw-target-logo">{(offer.company || offer.title || "?").trim().charAt(0).toUpperCase()}</span>
        <div>
          <strong>{offer.title || t("Poste non précisé", "Unspecified role")}</strong>
          <small>{[offer.company, location].filter(Boolean).join(" · ") || t("Entreprise non précisée", "Unspecified company")}</small>
        </div>
      </div>
      {skills.length ? (
        <div className="mw-target-skills">
          {skills.map((skill) => (
            <span key={skill}>{skill}</span>
          ))}
        </div>
      ) : null}
      {note ? <p className="mw-target-note">{note}</p> : null}
      {candidateName ? (
        <p className="mw-target-foot">
          <UiIcon name="profile" />
          {t(`Profil utilisé : ${candidateName}`, `Profile used: ${candidateName}`)}
        </p>
      ) : null}
    </div>
  );
}

export function ModuleTipsCard({ title, tips }) {
  return (
    <div className="mw-side-card mw-tips">
      <div className="mw-side-head">
        <span>{title}</span>
      </div>
      <ul>
        {tips.map((tip) => (
          <li key={tip}>
            <UiIcon name="check" />
            <span>{tip}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ModuleHero({ eyebrow, title, subtitle, chips = [], art }) {
  return (
    <header className="mw-hero">
      <div className="mw-hero-copy">
        <span className="mw-eyebrow">{eyebrow}</span>
        <h2>{title}</h2>
        <p>{subtitle}</p>
        {chips.length ? (
          <div className="mw-hero-chips">
            {chips.filter(Boolean).map((chip) => (
              <span key={chip.label}>
                <UiIcon name={chip.icon} />
                {chip.label}
              </span>
            ))}
          </div>
        ) : null}
      </div>
      <div className="mw-hero-art" aria-hidden="true">
        {art}
      </div>
    </header>
  );
}

// ---------------------------------------------------------------------------
// Illustrations
// ---------------------------------------------------------------------------
export function LetterHeroArt() {
  return (
    <svg viewBox="0 0 360 260" className="mw-art" aria-hidden="true">
      <defs>
        <linearGradient id="lh-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffe6d5" />
          <stop offset="1" stopColor="#ffd0b0" />
        </linearGradient>
        <linearGradient id="lh-env" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f26a2e" />
          <stop offset="1" stopColor="#b83309" />
        </linearGradient>
        <linearGradient id="lh-flap" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#d9531c" />
          <stop offset="1" stopColor="#a52c07" />
        </linearGradient>
      </defs>
      <circle cx="190" cy="138" r="112" fill="url(#lh-bg)" />
      <circle cx="300" cy="46" r="10" fill="#ffd0b0" />
      <circle cx="62" cy="208" r="7" fill="#ffd0b0" />
      {/* lettre */}
      <g transform="rotate(-6 180 110)">
        <rect x="112" y="34" width="148" height="176" rx="12" fill="#fff" stroke="#f1dccd" strokeWidth="2" />
        <rect x="132" y="58" width="72" height="9" rx="4.5" fill="#b83309" />
        <rect x="132" y="78" width="108" height="6" rx="3" fill="#ecdfd4" />
        <rect x="132" y="92" width="100" height="6" rx="3" fill="#ecdfd4" />
        <rect x="132" y="106" width="108" height="6" rx="3" fill="#ecdfd4" />
        <rect x="132" y="120" width="84" height="6" rx="3" fill="#ecdfd4" />
        <rect x="132" y="140" width="104" height="6" rx="3" fill="#ecdfd4" />
        <rect x="132" y="154" width="92" height="6" rx="3" fill="#ecdfd4" />
        <path d="M134 184c10-10 16 8 26-2s14 6 22-4" stroke="#b83309" strokeWidth="3" fill="none" strokeLinecap="round" />
      </g>
      {/* enveloppe */}
      <path d="M86 150h208v82a12 12 0 01-12 12H98a12 12 0 01-12-12z" fill="url(#lh-env)" />
      <path d="M86 150l104 58 104-58" fill="none" stroke="#8f2606" strokeWidth="2" opacity="0.45" />
      <path d="M86 244l78-52M294 244l-78-52" stroke="#ffffff" strokeWidth="2" opacity="0.18" />
      <path d="M86 150l104 62 104-62v-4H86z" fill="url(#lh-flap)" opacity="0.35" />
      {/* sceau */}
      <circle cx="190" cy="206" r="17" fill="#fff" />
      <path d="M183 206l5 5 10-11" stroke="#b83309" strokeWidth="3.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      {/* stylo */}
      <g transform="rotate(38 300 120)">
        <rect x="292" y="58" width="16" height="96" rx="8" fill="#0c0c10" />
        <rect x="292" y="72" width="16" height="10" fill="#f26a2e" />
        <path d="M292 154h16l-8 22z" fill="#f5d2bd" />
        <path d="M298 168h4l-2 8z" fill="#0c0c10" />
      </g>
      {/* étincelles IA */}
      <path d="M70 70l5 13 13 5-13 5-5 13-5-13-13-5 13-5z" fill="#f26a2e" />
      <path d="M312 196l3 8 8 3-8 3-3 8-3-8-8-3 8-3z" fill="#b83309" />
      <path d="M96 30l2.5 6.5 6.5 2.5-6.5 2.5-2.5 6.5-2.5-6.5-6.5-2.5 6.5-2.5z" fill="#f59a6b" />
    </svg>
  );
}

export function NegotiationHeroArt() {
  return (
    <svg viewBox="0 0 360 260" className="mw-art" aria-hidden="true">
      <defs>
        <linearGradient id="nh-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffe6d5" />
          <stop offset="1" stopColor="#e7e4ff" />
        </linearGradient>
        <linearGradient id="nh-you" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f26a2e" />
          <stop offset="1" stopColor="#b83309" />
        </linearGradient>
        <linearGradient id="nh-rec" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#5b4cf0" />
          <stop offset="1" stopColor="#2c1fb8" />
        </linearGradient>
      </defs>
      <circle cx="180" cy="140" r="114" fill="url(#nh-bg)" />
      {/* graphique de salaire */}
      <rect x="120" y="30" width="120" height="78" rx="12" fill="#fff" stroke="#ece6f5" strokeWidth="2" />
      <rect x="134" y="80" width="14" height="16" rx="3" fill="#f5d2bd" />
      <rect x="154" y="68" width="14" height="28" rx="3" fill="#f5b48f" />
      <rect x="174" y="58" width="14" height="38" rx="3" fill="#f26a2e" />
      <rect x="194" y="46" width="14" height="50" rx="3" fill="#b83309" />
      <path d="M134 62l24-10 20 6 34-18" stroke="#237804" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M204 38l10 1-3 9" stroke="#237804" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      {/* table */}
      <rect x="52" y="200" width="256" height="12" rx="6" fill="#d8cfc4" />
      <rect x="70" y="212" width="8" height="30" rx="3" fill="#d8cfc4" />
      <rect x="282" y="212" width="8" height="30" rx="3" fill="#d8cfc4" />
      {/* vous */}
      <circle cx="96" cy="128" r="20" fill="#f7d7c4" />
      <path d="M76 124c2-16 36-18 40 0-8-6-30-6-40 0z" fill="#3a2418" />
      <path d="M62 200c0-30 14-48 34-48s34 18 34 48z" fill="url(#nh-you)" />
      {/* recruteur */}
      <circle cx="264" cy="128" r="20" fill="#e9c2a6" />
      <path d="M244 122c4-18 36-18 40 0-10-4-30-4-40 0z" fill="#1d1b2e" />
      <path d="M230 200c0-30 14-48 34-48s34 18 34 48z" fill="url(#nh-rec)" />
      <path d="M258 156l6 10 6-10" fill="#fff" />
      {/* bulles */}
      <g>
        <rect x="112" y="116" width="58" height="30" rx="12" fill="#fff" stroke="#f1dccd" strokeWidth="2" />
        <path d="M120 146l-6 10 14-10" fill="#fff" />
        <text x="141" y="137" textAnchor="middle" fontSize="15" fontWeight="800" fill="#b83309">+8%</text>
      </g>
      <g>
        <rect x="190" y="150" width="54" height="28" rx="12" fill="#fff" stroke="#e1ddfb" strokeWidth="2" />
        <path d="M236 178l8 9-2-9" fill="#fff" />
        <circle cx="206" cy="164" r="3" fill="#5b4cf0" />
        <circle cx="217" cy="164" r="3" fill="#5b4cf0" />
        <circle cx="228" cy="164" r="3" fill="#5b4cf0" />
      </g>
      {/* pièces */}
      <ellipse cx="176" cy="194" rx="14" ry="5" fill="#e0a21b" />
      <rect x="162" y="184" width="28" height="10" fill="#f2b92c" />
      <ellipse cx="176" cy="184" rx="14" ry="5" fill="#ffd45c" />
      <path d="M66 58l4 10 10 4-10 4-4 10-4-10-10-4 10-4z" fill="#f26a2e" />
      <path d="M306 72l3 7 7 3-7 3-3 7-3-7-7-3 7-3z" fill="#5b4cf0" />
    </svg>
  );
}

// Miniatures des modèles de lettre.
export function LetterTemplateThumb({ variant }) {
  if (variant === "modern") {
    return (
      <svg viewBox="0 0 80 100" className="mw-thumb" aria-hidden="true">
        <rect x="1" y="1" width="78" height="98" rx="6" fill="#fff" stroke="#e8e5dd" />
        <rect x="1" y="1" width="78" height="20" rx="6" fill="#b83309" />
        <rect x="1" y="15" width="78" height="6" fill="#b83309" />
        <rect x="10" y="8" width="34" height="5" rx="2.5" fill="#fff" />
        <rect x="10" y="30" width="44" height="4" rx="2" fill="#b83309" opacity="0.7" />
        <rect x="10" y="42" width="60" height="3" rx="1.5" fill="#e3ddd4" />
        <rect x="10" y="50" width="56" height="3" rx="1.5" fill="#e3ddd4" />
        <rect x="10" y="58" width="60" height="3" rx="1.5" fill="#e3ddd4" />
        <rect x="10" y="70" width="52" height="3" rx="1.5" fill="#e3ddd4" />
        <rect x="10" y="78" width="40" height="3" rx="1.5" fill="#e3ddd4" />
      </svg>
    );
  }
  if (variant === "minimal") {
    return (
      <svg viewBox="0 0 80 100" className="mw-thumb" aria-hidden="true">
        <rect x="1" y="1" width="78" height="98" rx="6" fill="#fff" stroke="#e8e5dd" />
        <rect x="14" y="16" width="26" height="3" rx="1.5" fill="#0c0c10" />
        <rect x="14" y="32" width="52" height="2.5" rx="1.25" fill="#e3ddd4" />
        <rect x="14" y="40" width="48" height="2.5" rx="1.25" fill="#e3ddd4" />
        <rect x="14" y="48" width="52" height="2.5" rx="1.25" fill="#e3ddd4" />
        <rect x="14" y="60" width="44" height="2.5" rx="1.25" fill="#e3ddd4" />
        <rect x="14" y="68" width="50" height="2.5" rx="1.25" fill="#e3ddd4" />
        <rect x="14" y="84" width="20" height="2.5" rx="1.25" fill="#8a8690" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 80 100" className="mw-thumb" aria-hidden="true">
      <rect x="1" y="1" width="78" height="98" rx="6" fill="#fff" stroke="#e8e5dd" />
      <rect x="10" y="10" width="26" height="3" rx="1.5" fill="#8a8690" />
      <rect x="10" y="16" width="20" height="3" rx="1.5" fill="#c9c3ba" />
      <rect x="48" y="24" width="22" height="3" rx="1.5" fill="#c9c3ba" />
      <rect x="10" y="34" width="46" height="4" rx="2" fill="#0c0c10" />
      <rect x="10" y="46" width="60" height="3" rx="1.5" fill="#e3ddd4" />
      <rect x="10" y="54" width="58" height="3" rx="1.5" fill="#e3ddd4" />
      <rect x="10" y="62" width="60" height="3" rx="1.5" fill="#e3ddd4" />
      <rect x="10" y="74" width="54" height="3" rx="1.5" fill="#e3ddd4" />
      <rect x="44" y="86" width="26" height="3" rx="1.5" fill="#8a8690" />
    </svg>
  );
}

export function EmailScoutArt() {
  return (
    <svg viewBox="0 0 360 260" className="mw-art" aria-hidden="true">
      <defs>
        <linearGradient id="es-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffe6d5" />
          <stop offset="1" stopColor="#dff3e4" />
        </linearGradient>
        <linearGradient id="es-env" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f26a2e" />
          <stop offset="1" stopColor="#b83309" />
        </linearGradient>
        <linearGradient id="es-lens" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.95" />
          <stop offset="1" stopColor="#fff4ec" stopOpacity="0.85" />
        </linearGradient>
      </defs>
      <circle cx="180" cy="134" r="114" fill="url(#es-bg)" />
      {/* ondes radar */}
      <circle cx="150" cy="128" r="92" fill="none" stroke="#f26a2e" strokeOpacity="0.16" strokeWidth="2" strokeDasharray="4 7" />
      <circle cx="150" cy="128" r="66" fill="none" stroke="#f26a2e" strokeOpacity="0.22" strokeWidth="2" strokeDasharray="4 7" />
      {/* réseau de contacts */}
      <path d="M58 70L96 52M58 70l20 42M268 60l30 26M298 86l-8 40" stroke="#d8cfc4" strokeWidth="2" />
      <circle cx="58" cy="70" r="9" fill="#fff" stroke="#b83309" strokeWidth="2.5" />
      <circle cx="96" cy="52" r="6" fill="#f5b48f" />
      <circle cx="78" cy="112" r="6" fill="#f5d2bd" />
      <circle cx="268" cy="60" r="6" fill="#bfe3c8" />
      <circle cx="298" cy="86" r="9" fill="#fff" stroke="#237804" strokeWidth="2.5" />
      <circle cx="290" cy="126" r="5" fill="#bfe3c8" />
      {/* enveloppe */}
      <rect x="92" y="96" width="136" height="92" rx="12" fill="url(#es-env)" />
      <path d="M92 108l68 48 68-48" fill="none" stroke="#ffffff" strokeOpacity="0.55" strokeWidth="3" strokeLinejoin="round" />
      <path d="M92 188l52-40M228 188l-52-40" stroke="#ffffff" strokeOpacity="0.2" strokeWidth="2" />
      {/* loupe */}
      <circle cx="226" cy="118" r="44" fill="url(#es-lens)" stroke="#0c0c10" strokeWidth="7" />
      <path d="M258 150l34 34" stroke="#0c0c10" strokeWidth="13" strokeLinecap="round" />
      <path d="M262 154l26 26" stroke="#3a383f" strokeWidth="5" strokeLinecap="round" />
      <text x="226" y="133" textAnchor="middle" fontSize="44" fontWeight="800" fill="#b83309">@</text>
      {/* validation */}
      <circle cx="120" cy="196" r="20" fill="#237804" />
      <path d="M111 196l6 6 12-13" stroke="#fff" strokeWidth="4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M312 204l3 8 8 3-8 3-3 8-3-8-8-3 8-3z" fill="#f26a2e" />
      <path d="M52 176l2.5 6.5 6.5 2.5-6.5 2.5-2.5 6.5-2.5-6.5-6.5-2.5 6.5-2.5z" fill="#237804" />
    </svg>
  );
}

export function ApplicationsHeroArt() {
  return (
    <svg viewBox="0 0 360 260" className="mw-art" aria-hidden="true">
      <defs>
        <linearGradient id="ap-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffe6d5" />
          <stop offset="1" stopColor="#e7e4ff" />
        </linearGradient>
        <linearGradient id="ap-card" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f26a2e" />
          <stop offset="1" stopColor="#b83309" />
        </linearGradient>
      </defs>
      <circle cx="176" cy="134" r="114" fill="url(#ap-bg)" />
      {/* tableau */}
      <rect x="54" y="52" width="232" height="164" rx="16" fill="#fff" stroke="#efe7dd" strokeWidth="2" />
      <rect x="54" y="52" width="232" height="26" rx="16" fill="#f7f2ec" />
      <rect x="54" y="66" width="232" height="12" fill="#f7f2ec" />
      <circle cx="72" cy="65" r="4" fill="#f5b48f" />
      <circle cx="85" cy="65" r="4" fill="#f5d2bd" />
      <circle cx="98" cy="65" r="4" fill="#e1ddfb" />
      {/* colonnes */}
      <rect x="66" y="88" width="64" height="116" rx="10" fill="#faf7f3" />
      <rect x="138" y="88" width="64" height="116" rx="10" fill="#faf7f3" />
      <rect x="210" y="88" width="64" height="116" rx="10" fill="#f3f9ef" />
      <rect x="72" y="96" width="30" height="5" rx="2.5" fill="#c9c3ba" />
      <rect x="144" y="96" width="30" height="5" rx="2.5" fill="#c9c3ba" />
      <rect x="216" y="96" width="30" height="5" rx="2.5" fill="#8ccf6a" />
      {/* cartes */}
      <rect x="72" y="108" width="52" height="30" rx="7" fill="#fff" stroke="#ece5dc" />
      <rect x="78" y="116" width="30" height="4" rx="2" fill="#d8cfc4" />
      <rect x="78" y="125" width="22" height="4" rx="2" fill="#ece5dc" />
      <rect x="72" y="144" width="52" height="30" rx="7" fill="#fff" stroke="#ece5dc" />
      <rect x="78" y="152" width="34" height="4" rx="2" fill="#d8cfc4" />
      <rect x="78" y="161" width="20" height="4" rx="2" fill="#ece5dc" />
      <rect x="144" y="108" width="52" height="30" rx="7" fill="#fff" stroke="#ece5dc" />
      <rect x="150" y="116" width="28" height="4" rx="2" fill="#d8cfc4" />
      <rect x="150" y="125" width="18" height="4" rx="2" fill="#ece5dc" />
      <rect x="216" y="108" width="52" height="30" rx="7" fill="#fff" stroke="#bfe3c8" />
      <rect x="222" y="116" width="30" height="4" rx="2" fill="#8ccf6a" />
      <rect x="222" y="125" width="22" height="4" rx="2" fill="#dff3e4" />
      <circle cx="258" cy="123" r="7" fill="#237804" />
      <path d="M254.5 123l2.5 2.5 4.5-5" stroke="#fff" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      {/* carte en déplacement */}
      <g transform="rotate(-8 170 164)">
        <rect x="140" y="148" width="60" height="34" rx="8" fill="url(#ap-card)" />
        <rect x="147" y="157" width="34" height="5" rx="2.5" fill="#fff" opacity="0.9" />
        <rect x="147" y="167" width="24" height="4" rx="2" fill="#fff" opacity="0.55" />
      </g>
      <path d="M204 160c14-2 22-10 26-22" stroke="#b83309" strokeWidth="2.5" fill="none" strokeDasharray="4 5" strokeLinecap="round" />
      <path d="M224 136l7-2 1 8" stroke="#b83309" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      {/* cible */}
      <circle cx="300" cy="196" r="28" fill="#fff" stroke="#f1dccd" strokeWidth="2" />
      <circle cx="300" cy="196" r="18" fill="none" stroke="#f26a2e" strokeWidth="4" />
      <circle cx="300" cy="196" r="7" fill="#b83309" />
      <path d="M300 196l26-26" stroke="#0c0c10" strokeWidth="3" strokeLinecap="round" />
      <path d="M322 166l8-2-2 8z" fill="#0c0c10" />
      <path d="M44 196l3 8 8 3-8 3-3 8-3-8-8-3 8-3z" fill="#f26a2e" />
      <path d="M310 60l2.5 6.5 6.5 2.5-6.5 2.5-2.5 6.5-2.5-6.5-6.5-2.5 6.5-2.5z" fill="#5b4cf0" />
    </svg>
  );
}

// Phase 1 de l'import CV : document + flèche d'envoi ; scanning = animation
// d'analyse (barre qui balaie le document).
export function CvUploadArt({ scanning = false }) {
  return (
    <svg viewBox="0 0 240 170" className={`iw-art ${scanning ? "is-scanning" : ""}`} aria-hidden="true">
      <defs>
        <linearGradient id="cu-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffe6d5" />
          <stop offset="1" stopColor="#ffd9c2" />
        </linearGradient>
        <linearGradient id="cu-scan" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f26a2e" stopOpacity="0" />
          <stop offset="0.5" stopColor="#f26a2e" stopOpacity="0.45" />
          <stop offset="1" stopColor="#f26a2e" stopOpacity="0" />
        </linearGradient>
        <clipPath id="cu-doc">
          <rect x="78" y="22" width="84" height="112" rx="10" />
        </clipPath>
      </defs>
      <ellipse cx="120" cy="86" rx="92" ry="74" fill="url(#cu-bg)" opacity="0.7" />
      <rect x="78" y="22" width="84" height="112" rx="10" fill="#fff" stroke="#f1dccd" strokeWidth="2" />
      <circle cx="98" cy="44" r="9" fill="#f5d2bd" />
      <rect x="112" y="38" width="36" height="5" rx="2.5" fill="#b83309" />
      <rect x="112" y="47" width="26" height="4" rx="2" fill="#ecdfd4" />
      <rect x="90" y="64" width="60" height="4" rx="2" fill="#ecdfd4" />
      <rect x="90" y="73" width="52" height="4" rx="2" fill="#ecdfd4" />
      <rect x="90" y="86" width="30" height="4" rx="2" fill="#f5b48f" />
      <rect x="90" y="95" width="60" height="4" rx="2" fill="#ecdfd4" />
      <rect x="90" y="104" width="46" height="4" rx="2" fill="#ecdfd4" />
      <rect x="90" y="117" width="14" height="7" rx="3.5" fill="#dff3e4" />
      <rect x="107" y="117" width="18" height="7" rx="3.5" fill="#ffe6d5" />
      <rect x="128" y="117" width="12" height="7" rx="3.5" fill="#e7e4ff" />
      {scanning ? (
        <g clipPath="url(#cu-doc)">
          <rect className="iw-scan-bar" x="78" y="10" width="84" height="26" fill="url(#cu-scan)" />
        </g>
      ) : (
        <g className="iw-upload-arrow">
          <circle cx="162" cy="126" r="20" fill="#b83309" />
          <path d="M162 136v-19M154 124l8-8 8 8" stroke="#fff" strokeWidth="3.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </g>
      )}
      <path d="M52 50l3.5 9 9 3.5-9 3.5-3.5 9-3.5-9-9-3.5 9-3.5z" fill="#f26a2e" />
      <path d="M190 40l2.5 6.5 6.5 2.5-6.5 2.5-2.5 6.5-2.5-6.5-6.5-2.5 6.5-2.5z" fill="#5b4cf0" />
    </svg>
  );
}

export function JobPostArt() {
  return (
    <svg viewBox="0 0 240 150" className="iw-art" aria-hidden="true">
      <defs>
        <linearGradient id="jp-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#e7e4ff" />
          <stop offset="1" stopColor="#ffe6d5" />
        </linearGradient>
      </defs>
      <ellipse cx="120" cy="76" rx="100" ry="66" fill="url(#jp-bg)" opacity="0.8" />
      <rect x="44" y="24" width="120" height="104" rx="12" fill="#fff" stroke="#ece6f5" strokeWidth="2" />
      <rect x="56" y="36" width="22" height="22" rx="7" fill="#4b3fd6" />
      <rect x="84" y="39" width="56" height="6" rx="3" fill="#0c0c10" />
      <rect x="84" y="50" width="36" height="4" rx="2" fill="#c9c3ba" />
      <rect x="56" y="68" width="96" height="4" rx="2" fill="#ece6f5" />
      <rect x="56" y="77" width="86" height="4" rx="2" fill="#ece6f5" />
      <rect x="56" y="86" width="92" height="4" rx="2" fill="#ece6f5" />
      <rect x="56" y="100" width="24" height="9" rx="4.5" fill="#ffe6d5" />
      <rect x="84" y="100" width="30" height="9" rx="4.5" fill="#dff3e4" />
      <rect x="118" y="100" width="20" height="9" rx="4.5" fill="#e7e4ff" />
      {/* presse-papiers */}
      <rect x="146" y="66" width="56" height="66" rx="10" fill="#b83309" />
      <rect x="160" y="60" width="28" height="12" rx="5" fill="#0c0c10" />
      <rect x="156" y="82" width="36" height="4" rx="2" fill="#fff" opacity="0.9" />
      <rect x="156" y="92" width="28" height="4" rx="2" fill="#fff" opacity="0.6" />
      <rect x="156" y="102" width="32" height="4" rx="2" fill="#fff" opacity="0.6" />
      <circle cx="194" cy="124" r="13" fill="#237804" />
      <path d="M188 124l4 4 8-9" stroke="#fff" strokeWidth="2.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M30 40l3 8 8 3-8 3-3 8-3-8-8-3 8-3z" fill="#f26a2e" />
    </svg>
  );
}

// Accueil : parcours de candidature en cartes flottantes (CV → score →
// entretien → offre). La carte de score n'affiche un chiffre que s'il existe
// une vraie analyse.
export function HomeHeroArt({ score = null }) {
  const pct = typeof score === "number" ? Math.max(0, Math.min(100, score)) : 0;
  const circumference = 2 * Math.PI * 22;
  return (
    <svg viewBox="0 0 440 360" className="hm-art" aria-hidden="true">
      <defs>
        <radialGradient id="hh-orb" cx="50%" cy="45%" r="60%">
          <stop offset="0" stopColor="#ffd9c2" />
          <stop offset="0.6" stopColor="#ffe9dc" />
          <stop offset="1" stopColor="#fff4ec" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="hh-brand" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f26a2e" />
          <stop offset="1" stopColor="#b83309" />
        </linearGradient>
        <linearGradient id="hh-violet" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#6d5ff5" />
          <stop offset="1" stopColor="#3a2fb0" />
        </linearGradient>
        <filter id="hh-shadow" x="-20%" y="-20%" width="140%" height="160%">
          <feDropShadow dx="0" dy="10" stdDeviation="10" floodColor="#5c1a06" floodOpacity="0.14" />
        </filter>
      </defs>
      <circle cx="220" cy="180" r="170" fill="url(#hh-orb)" />
      <circle cx="220" cy="180" r="128" fill="none" stroke="#f26a2e" strokeOpacity="0.18" strokeWidth="2" strokeDasharray="5 9" className="hm-art-orbit" />
      {/* chemin du parcours */}
      <path d="M92 250C130 300 190 300 214 250S300 170 348 110" fill="none" stroke="#b83309" strokeOpacity="0.35" strokeWidth="3" strokeDasharray="2 10" strokeLinecap="round" />

      {/* CV */}
      <g className="hm-float f1" filter="url(#hh-shadow)">
        <rect x="40" y="170" width="112" height="136" rx="16" fill="#fff" />
        <circle cx="66" cy="196" r="12" fill="#f5d2bd" />
        <rect x="84" y="188" width="52" height="7" rx="3.5" fill="#b83309" />
        <rect x="84" y="200" width="36" height="5" rx="2.5" fill="#ecdfd4" />
        <rect x="56" y="222" width="80" height="5" rx="2.5" fill="#ecdfd4" />
        <rect x="56" y="233" width="68" height="5" rx="2.5" fill="#ecdfd4" />
        <rect x="56" y="248" width="40" height="5" rx="2.5" fill="#f5b48f" />
        <rect x="56" y="259" width="80" height="5" rx="2.5" fill="#ecdfd4" />
        <rect x="56" y="278" width="22" height="10" rx="5" fill="#dff3e4" />
        <rect x="82" y="278" width="28" height="10" rx="5" fill="#ffe6d5" />
        <rect x="114" y="278" width="18" height="10" rx="5" fill="#e7e4ff" />
      </g>

      {/* score */}
      <g className="hm-float f2" filter="url(#hh-shadow)">
        <rect x="172" y="186" width="120" height="84" rx="18" fill="#fff" />
        <circle cx="206" cy="228" r="22" fill="none" stroke="#f1ebe4" strokeWidth="7" />
        <circle
          cx="206"
          cy="228"
          r="22"
          fill="none"
          stroke="url(#hh-brand)"
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={typeof score === "number" ? circumference * (1 - pct / 100) : circumference * 0.35}
          transform="rotate(-90 206 228)"
          className="hm-art-gauge"
        />
        {typeof score === "number" ? (
          <text x="206" y="233" textAnchor="middle" fontSize="15" fontWeight="800" fill="#0c0c10">
            {score}
          </text>
        ) : (
          <path d="M199 228l5 5 9-10" stroke="#b83309" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        )}
        <rect x="238" y="212" width="42" height="7" rx="3.5" fill="#0c0c10" />
        <rect x="238" y="225" width="32" height="5" rx="2.5" fill="#c9c3ba" />
        <rect x="238" y="236" width="38" height="5" rx="2.5" fill="#dff3e4" />
      </g>

      {/* entretien */}
      <g className="hm-float f3" filter="url(#hh-shadow)">
        <rect x="236" y="96" width="132" height="62" rx="18" fill="url(#hh-violet)" />
        <circle cx="262" cy="127" r="13" fill="#fff" fillOpacity="0.95" />
        <path d="M256 124h12M256 130h8" stroke="#3a2fb0" strokeWidth="2.4" strokeLinecap="round" />
        <rect x="284" y="116" width="66" height="7" rx="3.5" fill="#fff" fillOpacity="0.9" />
        <rect x="284" y="130" width="46" height="6" rx="3" fill="#fff" fillOpacity="0.55" />
        <path d="M252 158l-6 14 18-14z" fill="#3a2fb0" />
      </g>

      {/* offre */}
      <g className="hm-float f4" filter="url(#hh-shadow)">
        <rect x="318" y="196" width="92" height="92" rx="22" fill="#fff" />
        <circle cx="364" cy="234" r="22" fill="#237804" />
        <path d="M354 234l7 7 13-14" stroke="#fff" strokeWidth="4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="342" y="266" width="44" height="7" rx="3.5" fill="#0c0c10" />
      </g>

      {/* étincelles */}
      <path className="hm-twinkle t1" d="M122 110l6 15 15 6-15 6-6 15-6-15-15-6 15-6z" fill="#f26a2e" />
      <path className="hm-twinkle t2" d="M396 70l4 10 10 4-10 4-4 10-4-10-10-4 10-4z" fill="#6d5ff5" />
      <path className="hm-twinkle t3" d="M180 60l3 8 8 3-8 3-3 8-3-8-8-3 8-3z" fill="#f59a6b" />
      <circle cx="84" cy="96" r="6" fill="#ffd0b0" />
      <circle cx="412" cy="150" r="5" fill="#e1ddfb" />
    </svg>
  );
}

export function HistoryHeroArt() {
  return (
    <svg viewBox="0 0 360 260" className="mw-art" aria-hidden="true">
      <defs>
        <linearGradient id="hs-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffe6d5" />
          <stop offset="1" stopColor="#ffd9c2" />
        </linearGradient>
        <linearGradient id="hs-clock" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f26a2e" />
          <stop offset="1" stopColor="#b83309" />
        </linearGradient>
      </defs>
      <circle cx="176" cy="134" r="112" fill="url(#hs-bg)" opacity="0.8" />
      <g transform="rotate(-10 150 140)">
        <rect x="92" y="64" width="112" height="142" rx="12" fill="#fff" stroke="#f1dccd" strokeWidth="2" opacity="0.8" />
      </g>
      <g transform="rotate(-4 160 140)">
        <rect x="104" y="58" width="112" height="142" rx="12" fill="#fff" stroke="#f1dccd" strokeWidth="2" opacity="0.92" />
      </g>
      <rect x="118" y="52" width="112" height="142" rx="12" fill="#fff" stroke="#f1dccd" strokeWidth="2" />
      <circle cx="140" cy="76" r="10" fill="#f5d2bd" />
      <rect x="158" y="70" width="52" height="6" rx="3" fill="#b83309" />
      <rect x="158" y="82" width="36" height="4" rx="2" fill="#ecdfd4" />
      <rect x="132" y="102" width="84" height="5" rx="2.5" fill="#ecdfd4" />
      <rect x="132" y="113" width="72" height="5" rx="2.5" fill="#ecdfd4" />
      <rect x="132" y="128" width="40" height="5" rx="2.5" fill="#f5b48f" />
      <rect x="132" y="139" width="84" height="5" rx="2.5" fill="#ecdfd4" />
      <rect x="132" y="150" width="60" height="5" rx="2.5" fill="#ecdfd4" />
      <rect x="132" y="168" width="22" height="10" rx="5" fill="#dff3e4" />
      <rect x="158" y="168" width="28" height="10" rx="5" fill="#ffe6d5" />
      {/* horloge */}
      <circle cx="252" cy="176" r="38" fill="url(#hs-clock)" />
      <circle cx="252" cy="176" r="29" fill="#fff" />
      <path d="M252 158v18l12 8" stroke="#b83309" strokeWidth="4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M216 150a42 42 0 0114-18" stroke="#b83309" strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M224 128l7 4-2 8" stroke="#b83309" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M70 70l4 10 10 4-10 4-4 10-4-10-10-4 10-4z" fill="#f26a2e" />
      <path d="M296 70l3 7 7 3-7 3-3 7-3-7-7-3 7-3z" fill="#5b4cf0" />
    </svg>
  );
}

// Entretiens : visio avec le recruteur IA + fenêtre de code (test technique).
export function InterviewHeroArt() {
  return (
    <svg viewBox="0 0 360 260" className="mw-art" aria-hidden="true">
      <defs>
        <linearGradient id="iv-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffe6d5" />
          <stop offset="1" stopColor="#e7e4ff" />
        </linearGradient>
        <linearGradient id="iv-rec" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#6d5ff5" />
          <stop offset="1" stopColor="#3a2fb0" />
        </linearGradient>
      </defs>
      <circle cx="176" cy="132" r="112" fill="url(#iv-bg)" />
      {/* fenêtre de visio */}
      <rect x="40" y="46" width="176" height="128" rx="14" fill="#fff" stroke="#ece6f5" strokeWidth="2" />
      <rect x="40" y="46" width="176" height="22" rx="14" fill="#f4f2ff" />
      <rect x="40" y="58" width="176" height="10" fill="#f4f2ff" />
      <circle cx="56" cy="57" r="3.5" fill="#f26a2e" />
      <circle cx="67" cy="57" r="3.5" fill="#f5b48f" />
      <circle cx="78" cy="57" r="3.5" fill="#bfe3c8" />
      <rect x="52" y="76" width="152" height="86" rx="10" fill="url(#iv-rec)" />
      <circle cx="128" cy="108" r="17" fill="#f1cbb0" />
      <path d="M111 104c2-16 32-16 34 0-8-5-26-5-34 0z" fill="#1d1b2e" />
      <path d="M100 162c0-22 12-34 28-34s28 12 28 34z" fill="#fff" fillOpacity="0.92" />
      <path d="M122 132l6 9 6-9" fill="#3a2fb0" />
      <rect x="160" y="84" width="38" height="12" rx="6" fill="#fff" fillOpacity="0.22" />
      <circle cx="167" cy="90" r="3" fill="#ff4d4f" />
      {/* ondes vocales */}
      <g className="iv-wave">
        <rect x="60" y="140" width="4" height="12" rx="2" fill="#fff" fillOpacity="0.8" />
        <rect x="68" y="134" width="4" height="24" rx="2" fill="#fff" fillOpacity="0.8" />
        <rect x="76" y="138" width="4" height="16" rx="2" fill="#fff" fillOpacity="0.8" />
      </g>
      {/* bulle de conversation */}
      <rect x="150" y="22" width="92" height="34" rx="14" fill="#fff" stroke="#f1dccd" strokeWidth="2" />
      <path d="M170 56l-4 12 14-12" fill="#fff" />
      <rect x="162" y="33" width="56" height="5" rx="2.5" fill="#b83309" />
      <rect x="162" y="43" width="40" height="5" rx="2.5" fill="#ecdfd4" />
      {/* fenêtre de code */}
      <rect x="196" y="120" width="130" height="104" rx="14" fill="#0f0e17" />
      <circle cx="210" cy="134" r="3.5" fill="#ff5f57" />
      <circle cx="221" cy="134" r="3.5" fill="#febc2e" />
      <circle cx="232" cy="134" r="3.5" fill="#28c840" />
      <rect x="210" y="148" width="24" height="5" rx="2.5" fill="#c792ea" />
      <rect x="238" y="148" width="40" height="5" rx="2.5" fill="#82aaff" />
      <rect x="220" y="160" width="30" height="5" rx="2.5" fill="#f78c6c" />
      <rect x="254" y="160" width="46" height="5" rx="2.5" fill="#a6accd" />
      <rect x="220" y="172" width="52" height="5" rx="2.5" fill="#c3e88d" />
      <rect x="230" y="184" width="36" height="5" rx="2.5" fill="#a6accd" />
      <rect x="210" y="196" width="18" height="5" rx="2.5" fill="#c792ea" />
      <circle cx="306" cy="206" r="13" fill="#237804" />
      <path d="M300 206l4 4 8-9" stroke="#fff" strokeWidth="2.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M318 40l3.5 9 9 3.5-9 3.5-3.5 9-3.5-9-9-3.5 9-3.5z" fill="#f26a2e" />
      <path d="M36 196l3 7 7 3-7 3-3 7-3-7-7-3 7-3z" fill="#6d5ff5" />
    </svg>
  );
}

// Test technique : état d'accueil de l'éditeur, avant le premier exercice.
export function CodeEditorArt() {
  return (
    <svg viewBox="0 0 260 170" className="iw-art" aria-hidden="true">
      <defs>
        <linearGradient id="ce-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#e7e4ff" />
          <stop offset="1" stopColor="#ffe6d5" />
        </linearGradient>
      </defs>
      <ellipse cx="130" cy="88" rx="110" ry="74" fill="url(#ce-bg)" opacity="0.8" />
      <rect x="48" y="26" width="164" height="118" rx="14" fill="#0f0e17" />
      <circle cx="63" cy="41" r="4" fill="#ff5f57" />
      <circle cx="75" cy="41" r="4" fill="#febc2e" />
      <circle cx="87" cy="41" r="4" fill="#28c840" />
      <rect x="60" y="58" width="8" height="5" rx="2" fill="#4a4760" />
      <rect x="60" y="70" width="8" height="5" rx="2" fill="#4a4760" />
      <rect x="60" y="82" width="8" height="5" rx="2" fill="#4a4760" />
      <rect x="60" y="94" width="8" height="5" rx="2" fill="#4a4760" />
      <rect x="60" y="106" width="8" height="5" rx="2" fill="#4a4760" />
      <rect x="76" y="58" width="26" height="5" rx="2.5" fill="#c792ea" />
      <rect x="106" y="58" width="44" height="5" rx="2.5" fill="#82aaff" />
      <rect x="86" y="70" width="32" height="5" rx="2.5" fill="#f78c6c" />
      <rect x="122" y="70" width="50" height="5" rx="2.5" fill="#a6accd" />
      <rect x="86" y="82" width="58" height="5" rx="2.5" fill="#c3e88d" />
      <rect x="96" y="94" width="40" height="5" rx="2.5" fill="#a6accd" />
      <rect x="76" y="106" width="20" height="5" rx="2.5" fill="#c792ea" />
      <rect x="100" y="104" width="2" height="10" fill="#f26a2e" className="cd-caret" />
      <rect x="170" y="112" width="62" height="40" rx="12" fill="#fff" />
      <circle cx="188" cy="132" r="10" fill="#237804" />
      <path d="M183 132l3.5 3.5 7-7.5" stroke="#fff" strokeWidth="2.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="204" y="126" width="20" height="5" rx="2.5" fill="#0c0c10" />
      <rect x="204" y="135" width="14" height="4" rx="2" fill="#c9c3ba" />
      <path d="M30 40l3.5 9 9 3.5-9 3.5-3.5 9-3.5-9-9-3.5 9-3.5z" fill="#f26a2e" />
      <path d="M232 30l3 7 7 3-7 3-3 7-3-7-7-3 7-3z" fill="#6d5ff5" />
    </svg>
  );
}
