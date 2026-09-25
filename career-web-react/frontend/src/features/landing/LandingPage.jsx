import React from "react";
// Module Landing : page publique marketing (hero, espaces candidats / écoles /
// cabinets, IA, sécurité, tarifs, FAQ, footer) + pages secondaires publiques
// (info, à propos, contact).
// Règle éditoriale : uniquement des fonctionnalités réellement implémentées,
// aucun chiffre d'usage, logo client ou témoignage inventé. Les prix viennent
// de data/plans.js, surchargés par les tarifs modifiés depuis l'admin.
import { useState, useEffect, useMemo } from "react";
import { UiIcon } from "../../components/UiIcon.jsx";
import { LanguageSwitch } from "../../components/LanguageSwitch.jsx";
// ConnectedFooter reste dans App.jsx (utilisé aussi par l'app connectée) —
// import "arrière" volontaire, sûr car utilisé seulement au rendu.
import { ConnectedFooter } from "../../App.jsx";
import { PLANS, getPlanById } from "../../data/plans.js";
import { formatPlanPrice } from "../../lib/format.js";
import { getPlanOverrides } from "../../lib/inMemoryDb.js";
import { LANDING_CONTENT } from "./landingContent.js";
import "./landing.css";

// Index -> section ancre pour la colonne "Produit" du footer connecté
// (ConnectedFooter dans App.jsx). Conservé pour compatibilité d'import.
const PRODUCT_SECTION_IDS = [
  "lp-espaces",
  "lp-candidats",
  "lp-ia",
  "lp-candidats",
  "lp-candidats",
  "lp-candidats",
  "lp-candidats"
];

// Icônes au trait (24x24) propres à la landing : légères, inline, sans
// dépendance. `currentColor` pour hériter de la couleur du contexte.
const LP_ICON_PATHS = {
  user: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 8a7 7 0 0 1 14 0",
  users: "M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm-6 9a6 6 0 0 1 12 0M16 4.3a3.5 3.5 0 0 1 0 6.4M18 14.2A6 6 0 0 1 21 20",
  school: "M3 9.5 12 5l9 4.5-9 4.5-9-4.5Zm3.5 2v4.2c0 1.6 2.5 3.3 5.5 3.3s5.5-1.7 5.5-3.3v-4.2M21 9.5V15",
  building: "M4 20V5a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v15M15 9h4a1 1 0 0 1 1 1v10M3 20h18M8 8h3M8 12h3M8 16h3",
  doc: "M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Zm0 0v5h5M9 13h6M9 17h4",
  file: "M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Zm0 0v5h5M9 14l2 2 4-4",
  target: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-4a5 5 0 1 0 0-10 5 5 0 0 0 0 10Zm0-4a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z",
  sparkle: "M7 7h10v10H7zM10 10h4v4h-4zM9 3v4M15 3v4M9 17v4M15 17v4M3 9h4M3 15h4M17 9h4M17 15h4",
  pen: "M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16v4Zm9.5-13.5 4 4",
  mic: "M12 15a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3Zm-6-3a6 6 0 0 0 12 0M12 18v3M9 21h6",
  scale: "M12 4v16M7 20h10M5 7h14M5 7l-3 6a3 3 0 0 0 6 0L5 7Zm14 0-3 6a3 3 0 0 0 6 0l-3-6Z",
  kanban: "M4 4h4v16H4zM10 4h4v10h-4zM16 4h4v7h-4z",
  mail: "M4 6h16v12H4zM4 7l8 6 8-6",
  compare: "M8 4v16M16 4v16M4 8h8M12 16h8M4 8l3-3M4 8l3 3M20 16l-3-3M20 16l-3 3",
  send: "M21 3 10 14M21 3l-7 18-4-7-7-4 18-7Z",
  megaphone: "M4 10v4a1 1 0 0 0 1 1h2l6 4V5L7 9H5a1 1 0 0 0-1 1Zm13-1.5a4 4 0 0 1 0 7M7 15l1 5h2",
  gauge: "M4 17a8 8 0 1 1 16 0M12 17l4-5M6.5 13l-1-.5M17.5 13l1-.5M12 9V8",
  printer: "M7 9V4h10v5M7 17H5a1 1 0 0 1-1-1v-5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v5a1 1 0 0 1-1 1h-2M7 14h10v6H7z",
  card: "M3 6h18v12H3zM3 10h18M7 15h3",
  briefcase: "M4 8h16v11H4zM9 8V6a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M4 13h16",
  calendar: "M4 6h16v14H4zM4 10h16M8 3v4M16 3v4M8 14h2M12 14h2M8 17h2",
  receipt: "M6 3h12v18l-3-2-3 2-3-2-3 2V3Zm3 5h6M9 12h6M9 16h3",
  lock: "M6 11h12v9H6zM8 11V8a4 4 0 0 1 8 0v3M12 15v2",
  history: "M3 12a9 9 0 1 0 3-6.7M3 4v4h4M12 8v4l3 2",
  globe: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM3 12h18M12 3c2.5 2.5 3.5 5.5 3.5 9s-1 6.5-3.5 9c-2.5-2.5-3.5-5.5-3.5-9s1-6.5 3.5-9Z",
  chart: "M4 20V4M4 20h16M8 16v-4M12 16V8M16 16v-6",
  check: "M5 12.5l4.5 4.5L19 7.5",
  arrow: "M5 12h14M13 6l6 6-6 6",
  shield: "M12 3l7 3v5c0 4.5-3 8.3-7 10-4-1.7-7-5.5-7-10V6l7-3Zm-3 9 2 2 4-4",
  key: "M14 10a4 4 0 1 0-3.5 4L12 15.5h2v2h2v2h3v-3l-5.5-5.5c.3-.3.5-.6.5-1Z",
  menu: "M4 7h16M4 12h16M4 17h16",
  close: "M6 6l12 12M18 6 6 18",
  plus: "M12 5v14M5 12h14"
};

function LpIcon({ name, className = "" }) {
  const d = LP_ICON_PATHS[name] || LP_ICON_PATHS.sparkle;
  return (
    <svg
      className={`lp-icon ${className}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d={d} />
    </svg>
  );
}

function scrollToSection(id) {
  const target = document.getElementById(id);
  if (!target) return;
  target.scrollIntoView({ behavior: "smooth", block: "start" });
  // Déplace le focus clavier sur la section atteinte (accessibilité).
  if (!target.hasAttribute("tabindex")) target.setAttribute("tabindex", "-1");
  target.focus({ preventScroll: true });
}

// Tarifs effectivement facturés : valeurs par défaut de plans.js, remplacées
// par les tarifs modifiés depuis l'admin (même logique que PricingPage.jsx).
function useEffectivePlans() {
  const [overrides, setOverrides] = useState({});
  useEffect(() => {
    let cancelled = false;
    getPlanOverrides()
      .then((data) => {
        if (!cancelled) setOverrides(data || {});
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);
  return useMemo(
    () =>
      PLANS.map((plan) => {
        const override = overrides[plan.id];
        if (!override) return plan;
        return {
          ...plan,
          monthlyPrice: override.monthlyPrice != null ? override.monthlyPrice : plan.monthlyPrice,
          annualPrice: override.annualPrice != null ? override.annualPrice : plan.annualPrice
        };
      }),
    [overrides]
  );
}

function LandingPage({
  copy,
  language,
  setLanguage,
  onLoginClick,
  onSignupClick,
  onPrivacyClick,
  onTermsClick,
  onCookiesClick,
  onAboutClick,
  onContactClick,
  onPricingClick,
  onSecurityClick
}) {
  const t = LANDING_CONTENT[language] || LANDING_CONTENT.fr;
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const plans = useEffectivePlans();
  const freeCredits = getPlanById("candidate_discovery")?.credits ?? 0;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const onKey = (event) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  function goTo(id) {
    setMenuOpen(false);
    scrollToSection(id);
  }

  return (
    <div className="landing-shell lp">
      <a className="lp-skip" href="#lp-main">
        {language === "en" ? "Skip to content" : "Aller au contenu"}
      </a>

      <header className={`landing-nav lp-nav ${scrolled ? "is-scrolled" : ""} ${menuOpen ? "is-open" : ""}`}>
        <button
          type="button"
          className="landing-brand brand-link"
          aria-label={t.homeLabel}
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        >
          <img src="/logo-career-cv.png" alt="Career CV" className="brand-logo" />
        </button>

        <nav className="lp-nav-links" aria-label={language === "en" ? "Main navigation" : "Navigation principale"}>
          {t.nav.map((item) => (
            <a
              key={item.id}
              href={`#${item.id}`}
              onClick={(event) => {
                event.preventDefault();
                goTo(item.id);
              }}
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="landing-actions lp-nav-actions">
          <LanguageSwitch language={language} setLanguage={setLanguage} variant="menu" />
          <button className="landing-link lp-hide-sm" type="button" onClick={onLoginClick}>
            {t.login}
          </button>
          <button className="landing-signup lp-hide-sm" type="button" onClick={onSignupClick}>
            {t.signup}
          </button>
          <button
            type="button"
            className="lp-burger"
            aria-expanded={menuOpen}
            aria-controls="lp-mobile-menu"
            aria-label={menuOpen ? t.menuClose : t.menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
          >
            <LpIcon name={menuOpen ? "close" : "menu"} />
          </button>
        </div>

        <div id="lp-mobile-menu" className="lp-mobile-menu" hidden={!menuOpen}>
          {t.nav.map((item) => (
            <a
              key={item.id}
              href={`#${item.id}`}
              onClick={(event) => {
                event.preventDefault();
                goTo(item.id);
              }}
            >
              {item.label}
            </a>
          ))}
          <div className="lp-mobile-actions">
            <button
              className="lp-btn lp-btn-ghost"
              type="button"
              onClick={() => {
                setMenuOpen(false);
                onLoginClick?.();
              }}
            >
              {t.login}
            </button>
            <button
              className="lp-btn lp-btn-primary"
              type="button"
              onClick={() => {
                setMenuOpen(false);
                onSignupClick?.();
              }}
            >
              {t.signup}
            </button>
          </div>
        </div>
      </header>

      <main id="lp-main">
        {/* HERO */}
        <section className="lp-hero" aria-labelledby="lp-hero-title">
          <div className="lp-container lp-hero-grid">
            <div className="lp-hero-copy">
              <span className="lp-eyebrow">
                <LpIcon name="sparkle" />
                {t.hero.eyebrow}
              </span>
              <h1 id="lp-hero-title">
                {t.hero.titleA} <span>{t.hero.titleB}</span>
              </h1>
              <p className="lp-lead">{t.hero.text}</p>
              <div className="lp-cta-row">
                <button className="lp-btn lp-btn-primary lp-btn-lg" type="button" onClick={onSignupClick}>
                  {t.hero.primary}
                  <LpIcon name="arrow" />
                </button>
                <a
                  className="lp-btn lp-btn-ghost lp-btn-lg"
                  href="#lp-espaces"
                  onClick={(event) => {
                    event.preventDefault();
                    goTo("lp-espaces");
                  }}
                >
                  {t.hero.secondary}
                </a>
              </div>
              <p className="lp-hero-note">
                <LpIcon name="check" />
                {t.hero.freeNote(freeCredits)}
              </p>
              <ul className="lp-audience-pills" aria-label={language === "en" ? "Audiences" : "Publics"}>
                {t.hero.audiences.map((label, index) => (
                  <li key={label}>
                    <LpIcon name={["user", "school", "building"][index]} />
                    {label}
                  </li>
                ))}
              </ul>
            </div>

            <HeroMock t={t.hero} />
          </div>
        </section>

        {/* FAITS PRODUIT (pas de statistiques d'usage) */}
        <section className="lp-facts" aria-label={language === "en" ? "Platform at a glance" : "La plateforme en bref"}>
          <div className="lp-container lp-facts-grid">
            {t.facts.map((fact) => (
              <div className="lp-fact" key={fact.label}>
                <strong>{fact.value}</strong>
                <span>{fact.label}</span>
              </div>
            ))}
          </div>
        </section>

        {/* ESPACES */}
        <section className="lp-section" id="lp-espaces" aria-labelledby="lp-espaces-title">
          <div className="lp-container">
            <div className="lp-heading">
              <span className="lp-eyebrow">{t.spaces.eyebrow}</span>
              <h2 id="lp-espaces-title">{t.spaces.title}</h2>
              <p>{t.spaces.text}</p>
            </div>
            <div className="lp-space-cards">
              {t.spaces.items.map((space) => (
                <a
                  key={space.id}
                  className={`lp-space-card lp-tone-${space.id}`}
                  href={`#lp-${space.id}`}
                  onClick={(event) => {
                    event.preventDefault();
                    goTo(`lp-${space.id}`);
                  }}
                >
                  <span className="lp-space-icon">
                    <LpIcon name={space.icon} />
                  </span>
                  <span className="lp-space-tag">{space.tag}</span>
                  <strong>{space.title}</strong>
                  <span className="lp-space-text">{space.text}</span>
                  <span className="lp-space-more">
                    {space.features.length} {language === "en" ? "features" : "fonctionnalités"}
                    <LpIcon name="arrow" />
                  </span>
                </a>
              ))}
            </div>
          </div>
        </section>

        {t.spaces.items.map((space, index) => (
          <section
            key={space.id}
            className={`lp-section lp-space-detail lp-tone-${space.id} ${index % 2 === 1 ? "lp-alt" : ""}`}
            id={`lp-${space.id}`}
            aria-labelledby={`lp-${space.id}-title`}
          >
            <div className="lp-container lp-space-layout">
              <div className="lp-space-intro">
                <span className="lp-space-icon lp-space-icon-lg">
                  <LpIcon name={space.icon} />
                </span>
                <span className="lp-eyebrow">{space.tag}</span>
                <h2 id={`lp-${space.id}-title`}>{space.title}</h2>
                <p>{space.text}</p>
                <button className="lp-btn lp-btn-dark" type="button" onClick={onSignupClick}>
                  {t.signup}
                  <LpIcon name="arrow" />
                </button>
              </div>
              <ul className="lp-feature-grid">
                {space.features.map((feature) => (
                  <li className="lp-feature" key={feature.title}>
                    <span className="lp-feature-icon">
                      <LpIcon name={feature.icon} />
                    </span>
                    <h3>{feature.title}</h3>
                    <p>{feature.text}</p>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        ))}

        {/* COMMENT ÇA MARCHE */}
        <section className="lp-section" id="lp-etapes" aria-labelledby="lp-etapes-title">
          <div className="lp-container">
            <div className="lp-heading">
              <span className="lp-eyebrow">{t.steps.eyebrow}</span>
              <h2 id="lp-etapes-title">{t.steps.title}</h2>
            </div>
            <ol className="lp-steps">
              {t.steps.items.map((step, index) => (
                <li key={step.title}>
                  <span className="lp-step-num" aria-hidden="true">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <h3>{step.title}</h3>
                  <p>{step.text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* IA */}
        <section className="lp-section lp-ai" id="lp-ia" aria-labelledby="lp-ia-title">
          <div className="lp-container">
            <div className="lp-heading lp-heading-light">
              <span className="lp-eyebrow">{t.ai.eyebrow}</span>
              <h2 id="lp-ia-title">{t.ai.title}</h2>
              <p>{t.ai.text}</p>
            </div>
            <ul className="lp-ai-grid">
              {t.ai.items.map((item) => (
                <li key={item.title}>
                  <span className="lp-ai-icon">
                    <LpIcon name={item.icon} />
                  </span>
                  <div>
                    <h3>{item.title}</h3>
                    <p>{item.text}</p>
                  </div>
                </li>
              ))}
            </ul>
            <p className="lp-ai-note">
              <LpIcon name="gauge" />
              {t.ai.note}
            </p>
          </div>
        </section>

        {/* SÉCURITÉ & RGPD */}
        <section className="lp-section" id="lp-securite" aria-labelledby="lp-securite-title">
          <div className="lp-container">
            <div className="lp-heading">
              <span className="lp-eyebrow">{t.security.eyebrow}</span>
              <h2 id="lp-securite-title">{t.security.title}</h2>
              <p>{t.security.text}</p>
            </div>
            <div className="lp-trust-grid">
              <article className="lp-trust-card">
                <span className="lp-feature-icon">
                  <LpIcon name="key" />
                </span>
                <h3>{t.security.accountTitle}</h3>
                <ul className="lp-check-list">
                  {t.security.account.map((item) => (
                    <li key={item}>
                      <LpIcon name="check" />
                      {item}
                    </li>
                  ))}
                </ul>
              </article>
              <article className="lp-trust-card">
                <span className="lp-feature-icon">
                  <LpIcon name="shield" />
                </span>
                <h3>{t.security.gdprTitle}</h3>
                <ul className="lp-check-list">
                  {t.security.gdpr.map((item) => (
                    <li key={item}>
                      <LpIcon name="check" />
                      {item}
                    </li>
                  ))}
                </ul>
                <div className="lp-trust-links">
                  <button type="button" onClick={onPrivacyClick}>
                    {t.security.legalLinks.privacy}
                  </button>
                  <button type="button" onClick={onSecurityClick}>
                    {t.security.legalLinks.security}
                  </button>
                  <button type="button" onClick={onTermsClick}>
                    {t.security.legalLinks.terms}
                  </button>
                </div>
              </article>
            </div>
          </div>
        </section>

        {/* BACK-OFFICE */}
        <section className="lp-section lp-alt" id="lp-plateforme" aria-labelledby="lp-plateforme-title">
          <div className="lp-container lp-platform">
            <div className="lp-heading lp-heading-left">
              <span className="lp-eyebrow">{t.platform.eyebrow}</span>
              <h2 id="lp-plateforme-title">{t.platform.title}</h2>
              <p>{t.platform.text}</p>
            </div>
            <ul className="lp-platform-grid">
              {t.platform.items.map((item) => (
                <li key={item.title}>
                  <span className="lp-feature-icon">
                    <LpIcon name={item.icon} />
                  </span>
                  <h3>{item.title}</h3>
                  <p>{item.text}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* TARIFS */}
        <PricingSection
          t={t.pricing}
          language={language}
          plans={plans}
          onSignupClick={onSignupClick}
          onContactClick={onContactClick}
          onPricingClick={onPricingClick}
        />

        {/* FAQ */}
        <FaqSection t={t.faq} />

        {/* CTA FINAL */}
        <section className="lp-final" aria-labelledby="lp-final-title">
          <div className="lp-container">
            <div className="lp-final-card">
              <div>
                <h2 id="lp-final-title">{t.finalCta.title}</h2>
                <p>{t.finalCta.text}</p>
              </div>
              <div className="lp-cta-row">
                <button className="lp-btn lp-btn-light lp-btn-lg" type="button" onClick={onSignupClick}>
                  {t.finalCta.primary}
                  <LpIcon name="arrow" />
                </button>
                <button className="lp-btn lp-btn-outline-light lp-btn-lg" type="button" onClick={onLoginClick}>
                  {t.finalCta.secondary}
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="lp-footer">
        <div className="lp-container lp-footer-grid">
          <div className="lp-footer-brand">
            <img src="/logo-career-cv.png" alt="Career CV" className="brand-logo" />
            <p>{t.footer.text}</p>
          </div>
          <nav className="lp-footer-col" aria-label={t.footer.product}>
            <h3>{t.footer.product}</h3>
            {t.footer.productLinks.map((link) => (
              <button type="button" key={link.id} onClick={() => scrollToSection(link.id)}>
                {link.label}
              </button>
            ))}
            <button type="button" onClick={onPricingClick}>
              {t.footer.pricing}
            </button>
          </nav>
          <nav className="lp-footer-col" aria-label={t.footer.spaces}>
            <h3>{t.footer.spaces}</h3>
            {t.footer.spaceLinks.map((link) => (
              <button type="button" key={link.id} onClick={() => scrollToSection(link.id)}>
                {link.label}
              </button>
            ))}
          </nav>
          <nav className="lp-footer-col" aria-label={t.footer.company}>
            <h3>{t.footer.company}</h3>
            <button type="button" onClick={onAboutClick}>
              {t.footer.about}
            </button>
            <button type="button" onClick={onContactClick}>
              {t.footer.contact}
            </button>
          </nav>
          <nav className="lp-footer-col" aria-label={t.footer.legal}>
            <h3>{t.footer.legal}</h3>
            <button type="button" onClick={onPrivacyClick}>
              {t.footer.privacy}
            </button>
            <button type="button" onClick={onTermsClick}>
              {t.footer.terms}
            </button>
            <button type="button" onClick={onCookiesClick}>
              {t.footer.cookies}
            </button>
            <button type="button" onClick={onSecurityClick}>
              {t.footer.securityPage}
            </button>
          </nav>
        </div>
        <div className="lp-container lp-footer-bottom">
          <span>
            © {new Date().getFullYear()} Career CV. {t.footer.rights}
          </span>
        </div>
      </footer>
    </div>
  );
}

// Maquette d'interface illustrative (étiquetée « Exemple ») : montre le
// parcours analyse -> matching -> suivi, sans prétendre être une donnée réelle.
function HeroMock({ t }) {
  const score = 82;
  return (
    <div className="lp-mock" role="img" aria-label={t.mockLabel}>
      <div className="lp-mock-window">
        <div className="lp-mock-bar" aria-hidden="true">
          <span />
          <span />
          <span />
          <em>{t.mockTitle}</em>
        </div>
        <div className="lp-mock-body">
          <div className="lp-mock-head">
            <div>
              <small>{t.mockExample}</small>
              <strong>{t.mockRole}</strong>
            </div>
            <div className="lp-mock-ring" style={{ "--lp-score": score }}>
              <span>{score}</span>
            </div>
          </div>
          <div className="lp-mock-label">{t.mockScoreLabel}</div>
          <div className="lp-mock-block">
            <small>{t.mockSkills}</small>
            <div className="lp-mock-chips">
              {t.mockChips.map((chip) => (
                <span key={chip} className="ok">
                  {chip}
                </span>
              ))}
            </div>
          </div>
          <div className="lp-mock-block">
            <small>{t.mockMissing}</small>
            <div className="lp-mock-chips">
              {t.mockMissingChips.map((chip) => (
                <span key={chip} className="warn">
                  + {chip}
                </span>
              ))}
            </div>
          </div>
          <div className="lp-mock-pipeline">
            {t.mockPipeline.map((step, index) => (
              <span key={step} className={index < 3 ? "done" : ""}>
                {step}
              </span>
            ))}
          </div>
          <div className="lp-mock-next">
            <span className="lp-mock-next-icon">
              <LpIcon name="mic" />
            </span>
            <div>
              <small>{t.mockNext}</small>
              <strong>{t.mockNextValue}</strong>
            </div>
          </div>
        </div>
      </div>
      <div className="lp-mock-float lp-mock-float-a" aria-hidden="true">
        <LpIcon name="shield" />
        <span>2FA · Passkeys</span>
      </div>
      <div className="lp-mock-float lp-mock-float-b" aria-hidden="true">
        <LpIcon name="doc" />
        <span>PDF · DOCX</span>
      </div>
    </div>
  );
}

const PRICING_TAB_ORDER = ["candidate", "school", "agency"];

function PricingSection({ t, language, plans, onSignupClick, onContactClick, onPricingClick }) {
  const [segment, setSegment] = useState("candidate");
  const [cycle, setCycle] = useState("monthly");
  const segmentPlans = plans.filter((plan) => plan.segment === segment);
  const hasRecurring = segmentPlans.some((plan) => plan.monthlyPrice > 0);
  const priceCopy = { free: t.free, perMonth: t.perMonth, perYear: t.perYear };

  function onTabKey(event, index) {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
    event.preventDefault();
    const delta = event.key === "ArrowRight" ? 1 : -1;
    const next = PRICING_TAB_ORDER[(index + delta + PRICING_TAB_ORDER.length) % PRICING_TAB_ORDER.length];
    setSegment(next);
    document.getElementById(`lp-tab-${next}`)?.focus();
  }

  return (
    <section className="lp-section" id="lp-tarifs" aria-labelledby="lp-tarifs-title">
      <div className="lp-container">
        <div className="lp-heading">
          <span className="lp-eyebrow">{t.eyebrow}</span>
          <h2 id="lp-tarifs-title">{t.title}</h2>
          <p>{t.text}</p>
        </div>

        <div className="lp-pricing-controls">
          <div className="lp-tabs" role="tablist" aria-label={t.tabsLabel}>
            {PRICING_TAB_ORDER.map((id, index) => (
              <button
                key={id}
                id={`lp-tab-${id}`}
                type="button"
                role="tab"
                aria-selected={segment === id}
                aria-controls="lp-pricing-panel"
                tabIndex={segment === id ? 0 : -1}
                className={segment === id ? "is-active" : ""}
                onClick={() => setSegment(id)}
                onKeyDown={(event) => onTabKey(event, index)}
              >
                {t.tabs[id]}
              </button>
            ))}
          </div>
          {hasRecurring ? (
            <div className="lp-cycle" role="group" aria-label={`${t.monthly} / ${t.annual}`}>
              {["monthly", "annual"].map((value) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={cycle === value}
                  className={cycle === value ? "is-active" : ""}
                  onClick={() => setCycle(value)}
                >
                  {value === "monthly" ? t.monthly : t.annual}
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <div
          id="lp-pricing-panel"
          role="tabpanel"
          aria-labelledby={`lp-tab-${segment}`}
          className={`lp-pricing-grid lp-pricing-count-${segmentPlans.length}`}
        >
          {segmentPlans.map((plan) => {
            const price = formatPlanPrice(plan, cycle, language, priceCopy, "EUR");
            const features = plan.features[language] || plan.features.fr;
            return (
              <article key={plan.id} className={`lp-plan ${plan.highlighted ? "is-highlighted" : ""}`}>
                {plan.badge ? <span className="lp-plan-badge">{plan.badge[language] || plan.badge.fr}</span> : null}
                <h3>{plan.name[language] || plan.name.fr}</h3>
                <p className="lp-plan-tagline">{plan.tagline[language] || plan.tagline.fr}</p>
                <div className="lp-plan-price">
                  <strong>{price.amount}</strong>
                  {price.unit ? <span>{price.unit}</span> : null}
                </div>
                <p className="lp-plan-meta">
                  {plan.pricedPerSeat
                    ? null
                    : plan.seats
                    ? `${t.seats(plan.seats)} · ${t.tokens(plan.credits)}`
                    : t.tokens(plan.credits)}
                </p>
                <ul className="lp-check-list lp-plan-features">
                  {features.map((feature) => (
                    <li key={feature}>
                      <LpIcon name="check" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  className={`lp-btn ${plan.highlighted ? "lp-btn-primary" : "lp-btn-ghost"} lp-plan-cta`}
                  onClick={plan.contactSalesOnly ? onContactClick : onSignupClick}
                >
                  {plan.contactSalesOnly ? t.ctaContact : t.cta}
                </button>
              </article>
            );
          })}
        </div>

        <div className="lp-pricing-more">
          <button type="button" className="lp-link-btn" onClick={onPricingClick}>
            {t.more}
            <LpIcon name="arrow" />
          </button>
        </div>
      </div>
    </section>
  );
}

function FaqSection({ t }) {
  const [openIndex, setOpenIndex] = useState(0);
  return (
    <section className="lp-section lp-alt" id="lp-faq" aria-labelledby="lp-faq-title">
      <div className="lp-container lp-faq-layout">
        <div className="lp-heading lp-heading-left">
          <span className="lp-eyebrow">{t.eyebrow}</span>
          <h2 id="lp-faq-title">{t.title}</h2>
        </div>
        <div className="lp-faq-list">
          {t.items.map((item, index) => {
            const isOpen = index === openIndex;
            const panelId = `lp-faq-panel-${index}`;
            const buttonId = `lp-faq-button-${index}`;
            return (
              <div key={item.q} className={`lp-faq-item ${isOpen ? "is-open" : ""}`}>
                <h3>
                  <button
                    id={buttonId}
                    type="button"
                    aria-expanded={isOpen}
                    aria-controls={panelId}
                    onClick={() => setOpenIndex(isOpen ? -1 : index)}
                  >
                    <span>{item.q}</span>
                    <LpIcon name="plus" className="lp-faq-toggle" />
                  </button>
                </h3>
                <div id={panelId} role="region" aria-labelledby={buttonId} className="lp-faq-panel" hidden={!isOpen}>
                  <p>{item.a}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function FooterColumn({ title, links, onLinkClick }) {
  return (
    <div className="footer-column">
      <h3>{title}</h3>
      {links.map((link, index) => (
        <button type="button" key={link} onClick={() => onLinkClick?.(link, index)}>
          {link}
        </button>
      ))}
    </div>
  );
}

function InfoPage({
  eyebrow,
  title,
  subtitle,
  children,
  language,
  setLanguage,
  onBack,
  onLoginClick,
  onSignupClick,
  landingCopy,
  onPrivacyClick,
  onTermsClick,
  onCookiesClick,
  onAboutClick,
  onContactClick,
  onPricingClick,
  onSecurityClick
}) {
  return (
    <div className="landing-shell legal-shell">
      <header className="landing-nav">
        <button type="button" className="landing-brand brand-link" onClick={() => window.location.reload()}>
          <img src="/logo-career-cv.png" alt="Career CV" className="brand-logo" />
        </button>
        <div className="landing-actions">
          <LanguageSwitch language={language} setLanguage={setLanguage} variant="menu" />
          {onLoginClick && (
            <button className="landing-link" type="button" onClick={onLoginClick}>
              {language === "en" ? "Log in" : "Se connecter"}
            </button>
          )}
          {onSignupClick && (
            <button className="landing-signup" type="button" onClick={onSignupClick}>
              {language === "en" ? "Sign up" : "S'inscrire"}
            </button>
          )}
        </div>
      </header>

      <main className="legal-page info-page">
        <button type="button" className="legal-back" onClick={onBack}>
          <UiIcon name="chevron" className="legal-back-icon" />
          {language === "en" ? "Back to home" : "Retour à l'accueil"}
        </button>

        <p className="legal-eyebrow">{eyebrow}</p>
        <h1 className="legal-doc-title info-title">{title}</h1>
        {subtitle ? <p className="info-subtitle">{subtitle}</p> : null}

        {children}
      </main>

      <ConnectedFooter
        copy={landingCopy}
        onPrivacyClick={onPrivacyClick}
        onTermsClick={onTermsClick}
        onCookiesClick={onCookiesClick}
        onAboutClick={onAboutClick}
        onContactClick={onContactClick}
        onPricingClick={onPricingClick}
        onSecurityClick={onSecurityClick}
      />
    </div>
  );
}

function AboutPage({ language, setLanguage, onBack, onLoginClick, onSignupClick, onNavigateLegal, landingCopy }) {
  const isEn = language === "en";

  const copy = isEn
    ? {
        eyebrow: "About",
        title: "About Career CV",
        subtitle: "The AI copilot that helps you present yourself well and target the right opportunities.",
        missionTitle: "Our mission",
        missionBody:
          "Job hunting shouldn't mean guessing what a recruiter wants to read. Career CV was built to give every candidate the same tools a well-coached applicant already has: a clear read on how their CV stacks up against a role, the missing keywords worth adding, and a way to rehearse before the interview.",
        howTitle: "What's inside",
        howItems: [
          { title: "CV Optimizer", text: "Upload a CV and a job offer to get a compatibility score, missing keywords, and concrete rewrite suggestions." },
          { title: "Job Matching", text: "See how a set of offers rank against your profile, so you spend time on the ones worth applying to." },
          { title: "Interview Coach", text: "Practice with role-specific questions and structured feedback before the real thing." },
          { title: "Cover letters & negotiation", text: "Generate a first draft tailored to the offer, and get guidance when it's time to talk salary." }
        ],
        valuesTitle: "How we operate",
        valuesItems: [
          "Privacy by design: your CV is processed to serve you, never sold, and you can delete it at any time.",
          "Transparent pricing: a token-based system with a free allowance, no hidden fees.",
          "AI as a copilot, not a substitute: every result is a suggestion for you to review, not an automatic decision."
        ],
        ctaTitle: "Ready to try it?",
        ctaBody: "Create an account and run your first CV analysis in a couple of minutes.",
        ctaButton: "Get started for free"
      }
    : {
        eyebrow: "À propos",
        title: "À propos de Career CV",
        subtitle: "Le copilote IA qui vous aide à bien vous présenter et à cibler les bonnes opportunités.",
        missionTitle: "Notre mission",
        missionBody:
          "Chercher un emploi ne devrait pas se résumer à deviner ce qu'un recruteur a envie de lire. Career CV a été conçu pour donner à chaque candidat les mêmes outils qu'un candidat bien accompagné : une lecture claire de la compatibilité entre son CV et un poste, les mots-clés à ajouter, et un moyen de s'entraîner avant l'entretien.",
        howTitle: "Ce que vous y trouverez",
        howItems: [
          { title: "CV Optimizer", text: "Importez un CV et une offre pour obtenir un score de compatibilité, les mots-clés manquants et des suggestions de réécriture concrètes." },
          { title: "Job Matching", text: "Comparez plusieurs offres avec votre profil pour concentrer vos efforts sur celles qui en valent la peine." },
          { title: "Interview Coach", text: "Entraînez-vous avec des questions adaptées au poste et un retour structuré avant le vrai entretien." },
          { title: "Lettres & négociation", text: "Générez un premier brouillon de lettre de motivation adapté à l'offre, et obtenez des conseils au moment de négocier votre salaire." }
        ],
        valuesTitle: "Comment nous travaillons",
        valuesItems: [
          "Confidentialité par conception : votre CV est traité pour vous servir, jamais vendu, et vous pouvez le supprimer à tout moment.",
          "Tarification transparente : un système de jetons avec un quota gratuit, sans frais cachés.",
          "L'IA comme copilote, jamais comme substitut : chaque résultat est une suggestion à relire, pas une décision automatique."
        ],
        ctaTitle: "Prêt à essayer ?",
        ctaBody: "Créez un compte et lancez votre première analyse de CV en quelques minutes.",
        ctaButton: "Commencer gratuitement"
      };

  return (
    <InfoPage
      eyebrow={copy.eyebrow}
      title={copy.title}
      subtitle={copy.subtitle}
      language={language}
      setLanguage={setLanguage}
      onBack={onBack}
      onLoginClick={onLoginClick}
      onSignupClick={onSignupClick}
      landingCopy={landingCopy}
      onPrivacyClick={() => onNavigateLegal?.("privacy")}
      onTermsClick={() => onNavigateLegal?.("terms")}
      onCookiesClick={() => onNavigateLegal?.("cookies")}
      onAboutClick={() => onNavigateLegal?.("about")}
      onContactClick={() => onNavigateLegal?.("contact")}
      onPricingClick={() => onNavigateLegal?.("pricing")}
      onSecurityClick={() => onNavigateLegal?.("security")}
    >
      <section className="info-section">
        <h2>{copy.missionTitle}</h2>
        <p>{copy.missionBody}</p>
      </section>

      <section className="info-section">
        <h2>{copy.howTitle}</h2>
        <div className="info-card-grid">
          {copy.howItems.map((item) => (
            <div key={item.title} className="info-card">
              <strong>{item.title}</strong>
              <p>{item.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="info-section">
        <h2>{copy.valuesTitle}</h2>
        <ul className="legal-doc-list">
          {copy.valuesItems.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <section className="info-cta">
        <div>
          <h2>{copy.ctaTitle}</h2>
          <p>{copy.ctaBody}</p>
        </div>
        <button type="button" className="landing-signup" onClick={onSignupClick}>
          {copy.ctaButton}
        </button>
      </section>
    </InfoPage>
  );
}

function ContactPage({ language, setLanguage, onBack, onLoginClick, onSignupClick, onNavigateLegal, landingCopy }) {
  const isEn = language === "en";

  const copy = isEn
    ? {
        eyebrow: "Contact",
        title: "Get in touch",
        subtitle: "Pick the right inbox below and we'll get back to you within a few business days.",
        cards: [
          {
            title: "General support",
            text: "Questions about your account, a CV analysis, or a bug you've run into.",
            email: "support@career-app.example"
          },
          {
            title: "Privacy & data rights",
            text: "Access, correction, deletion, or export requests for your personal data.",
            email: "privacy@career-app.example"
          },
          {
            title: "Schools & recruitment agencies",
            text: "Partnership requests, license codes, or questions about a team plan.",
            email: "partners@career-app.example"
          }
        ]
      }
    : {
        eyebrow: "Contact",
        title: "Nous contacter",
        subtitle: "Choisissez la bonne adresse ci-dessous, nous répondons en général sous quelques jours ouvrés.",
        cards: [
          {
            title: "Support général",
            text: "Questions sur votre compte, une analyse de CV, ou un bug rencontré.",
            email: "support@career-app.example"
          },
          {
            title: "Confidentialité & données",
            text: "Demandes d'accès, de rectification, de suppression ou d'export de vos données personnelles.",
            email: "privacy@career-app.example"
          },
          {
            title: "Écoles & cabinets de recrutement",
            text: "Demandes de partenariat, codes de licence, ou questions sur une offre équipe.",
            email: "partners@career-app.example"
          }
        ]
      };

  return (
    <InfoPage
      eyebrow={copy.eyebrow}
      title={copy.title}
      subtitle={copy.subtitle}
      language={language}
      setLanguage={setLanguage}
      onBack={onBack}
      onLoginClick={onLoginClick}
      onSignupClick={onSignupClick}
      landingCopy={landingCopy}
      onPrivacyClick={() => onNavigateLegal?.("privacy")}
      onTermsClick={() => onNavigateLegal?.("terms")}
      onCookiesClick={() => onNavigateLegal?.("cookies")}
      onAboutClick={() => onNavigateLegal?.("about")}
      onContactClick={() => onNavigateLegal?.("contact")}
      onPricingClick={() => onNavigateLegal?.("pricing")}
      onSecurityClick={() => onNavigateLegal?.("security")}
    >
      <div className="info-card-grid info-contact-grid">
        {copy.cards.map((card) => (
          <div key={card.title} className="info-card">
            <strong>{card.title}</strong>
            <p>{card.text}</p>
            <a href={`mailto:${card.email}`} className="info-contact-email">
              {card.email}
            </a>
          </div>
        ))}
      </div>
    </InfoPage>
  );
}

export { LandingPage, PRODUCT_SECTION_IDS, InfoPage, AboutPage, ContactPage, FooterColumn };
