import React from "react";
// Module Landing : page publique marketing (hero, fonctionnalités, FAQ,
// footer) + pages secondaires publiques (info, à propos, contact).
import { useState, useEffect } from "react";
import { UiIcon } from "../../components/UiIcon.jsx";
import { LanguageSwitch } from "../../components/LanguageSwitch.jsx";
// ConnectedFooter reste dans App.jsx (utilisé aussi par l'app connectée) —
// import "arrière" volontaire, sûr car utilisé seulement au rendu.
import { ConnectedFooter } from "../../App.jsx";

const PRODUCT_SECTION_IDS = ["section-features", "section-matching", "section-entretiens", "section-offres"];

const CAREER_CARDS = [
  { title: "Data Analyst", score: 91, skills: "Python · SQL · Power BI", tone: "green" },
  { title: "Software Engineer", score: 87, skills: "React · Node · API", tone: "blue" },
  { title: "Product Manager", score: 78, skills: "Roadmap · Discovery · KPI", tone: "violet" },
  { title: "Marketing Manager", score: 74, skills: "SEO · CRM · Analytics", tone: "amber" },
  { title: "UX/UI Designer", score: 82, skills: "Figma · Research · Prototype", tone: "violet" },
  { title: "Project Manager", score: 80, skills: "Agile · Planning · Risques", tone: "blue" },
  { title: "HR Manager", score: 76, skills: "Sourcing · Paie · Relations", tone: "green" },
  { title: "Business Analyst", score: 84, skills: "Process · Data · Reporting", tone: "amber" }
];

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
  const previewItems =
    language === "en"
      ? [
          {
            role: "Junior Data Analyst",
            score: 86,
            progress: 2,
            skills: "Python · SQL · BI",
            keywords: "3 keywords",
            offers: "+15 jobs",
            action: "Prepare the HR interview",
            skillLabel: "Strong skills detected",
            keywordLabel: "To add to the CV",
            offerLabel: "Jobs to prioritize",
            nextLabel: "Next action"
          },
          {
            role: "UX/UI Designer",
            score: 74,
            progress: 3,
            skills: "Figma · Research",
            keywords: "5 keywords",
            offers: "+8 jobs",
            action: "Rewrite the project section",
            skillLabel: "Portfolio signals found",
            keywordLabel: "Missing in the CV",
            offerLabel: "Relevant openings",
            nextLabel: "Next action"
          },
          {
            role: "Junior Developer",
            score: 91,
            progress: 4,
            skills: "React · Node · API",
            keywords: "2 keywords",
            offers: "+21 jobs",
            action: "Practice technical questions",
            skillLabel: "Technical fit detected",
            keywordLabel: "To reinforce",
            offerLabel: "Best matches",
            nextLabel: "Next action"
          }
        ]
      : [
          {
            role: "Data Analyst Junior",
            score: 86,
            progress: 2,
            skills: "Python · SQL · BI",
            keywords: "3 mots-clés",
            offers: "+15 offres",
            action: "Préparer l'entretien RH",
            skillLabel: "Compétences fortes détectées",
            keywordLabel: "À ajouter dans le CV",
            offerLabel: "Offres à prioriser",
            nextLabel: "Action suivante"
          },
          {
            role: "UX/UI Designer",
            score: 74,
            progress: 3,
            skills: "Figma · Recherche",
            keywords: "5 mots-clés",
            offers: "+8 offres",
            action: "Réécrire la section projets",
            skillLabel: "Signaux portfolio détectés",
            keywordLabel: "Manquants dans le CV",
            offerLabel: "Offres pertinentes",
            nextLabel: "Action suivante"
          },
          {
            role: "Développeur Junior",
            score: 91,
            progress: 4,
            skills: "React · Node · API",
            keywords: "2 mots-clés",
            offers: "+21 offres",
            action: "S'entraîner aux questions techniques",
            skillLabel: "Adéquation technique détectée",
            keywordLabel: "À renforcer",
            offerLabel: "Meilleurs matchs",
            nextLabel: "Action suivante"
          }
        ];
  const [previewIndex, setPreviewIndex] = useState(0);
  const activePreview = previewItems[previewIndex % previewItems.length];
  const journeyLabels = language === "en" ? ["CV", "Match", "CV+", "Interview"] : ["CV", "Match", "CV+", "Entretien"];

  useEffect(() => {
    const timer = setInterval(() => {
      setPreviewIndex((current) => (current + 1) % previewItems.length);
    }, 3200);
    return () => clearInterval(timer);
  }, [previewItems.length]);

  return (
    <div className="landing-shell">
      <header className="landing-nav">
        <div className="landing-brand">
          <span className="brand-mark" aria-hidden="true">
            <UiIcon name="matchmark" />
          </span>
          <strong>Career CV</strong>
        </div>
        <div className="landing-actions">
          <LanguageSwitch language={language} setLanguage={setLanguage} />
          <button className="landing-link" type="button" onClick={onLoginClick}>
            {copy.login}
          </button>
          <button className="landing-signup" type="button" onClick={onSignupClick}>
            {copy.signup}
          </button>
        </div>
      </header>

      <main>
        <section className="landing-hero">
          <div className="landing-hero-copy">
            <h1>
              {copy.heroTitleTop}
              <span>{copy.heroTitleAccent}</span>
            </h1>
            <p>{copy.heroText}</p>
            <button className="landing-cta" type="button" onClick={onSignupClick}>
              {copy.cta} <UiIcon name="chevron" className="btn-chevron" />
            </button>
            <small>{copy.freeCredits}</small>
            <div className="landing-trust">
              {copy.trust.map((item, index) => (
                <span key={item}>
                  <UiIcon name={index === 0 ? "shield" : index === 1 ? "chart" : "profile"} />
                  {item}
                </span>
              ))}
            </div>
          </div>

          <div className="hero-product" aria-label="Aperçu du produit Career CV">
            <div className="career-dashboard-preview">
              <div className="dashboard-preview-top">
                <div>
                  <span>{copy.profile}</span>
                  <strong>{activePreview.role}</strong>
                </div>
                <div className="dashboard-score">
                  <strong>{activePreview.score}</strong>
                  <span>{copy.score}</span>
                </div>
              </div>

              <div className="journey-track">
                {journeyLabels.map((label, index) => (
                  <span key={label} className={index < activePreview.progress ? "done" : ""}>
                    {label}
                  </span>
                ))}
              </div>

              <div className="insight-grid">
                <article>
                  <span>01</span>
                  <strong>{activePreview.skills}</strong>
                  <small>{activePreview.skillLabel}</small>
                </article>
                <article>
                  <span>02</span>
                  <strong>{activePreview.keywords}</strong>
                  <small>{activePreview.keywordLabel}</small>
                </article>
                <article>
                  <span>03</span>
                  <strong>{activePreview.offers}</strong>
                  <small>{activePreview.offerLabel}</small>
                </article>
              </div>

              <div className="next-action-card">
                <div>
                  <span>{activePreview.nextLabel}</span>
                  <strong>{activePreview.action}</strong>
                </div>
                <button type="button">
                  <UiIcon name="chevron" className="btn-chevron" />
                </button>
              </div>
            </div>
          </div>
        </section>

        <section className="ats-band" id="section-matching">
          <div>
            <span className="section-eyebrow">{copy.atsEyebrow}</span>
            <h2>
              {copy.atsTitleA}
              <span>{copy.atsTitleB}</span>
            </h2>
            <p>{copy.atsText}</p>
            <div className="diagnostic-proof-grid">
              <article>
                <strong>4</strong>
                <span>axes analysés</span>
              </article>
              <article>
                <strong>60s</strong>
                <span>pour obtenir un score</span>
              </article>
              <article>
                <strong>CV+</strong>
                <span>plan d'amélioration</span>
              </article>
            </div>
            <div className="diagnostic-note">
              <UiIcon name="shield" />
              <span>Les résultats servent directement aux modules Offres, CV+ et Entretiens.</span>
            </div>
          </div>
          <div className="ats-panel">
            <span className="ats-badge">CV</span>
            <h3>{copy.atsPanelTitle}</h3>
            <p>{copy.atsPanelHint}</p>
            <div className="diagnostic-score-row">
              <div className="diagnostic-score">
                <strong>78</strong>
                <span>/100</span>
              </div>
              <div>
                <b>Compatibilité solide</b>
                <small>Quelques mots-clés et preuves d'impact à renforcer.</small>
              </div>
            </div>
            <div className="diagnostic-bars">
              <span style={{ "--width": "86%" }}>Compétences détectées</span>
              <span style={{ "--width": "68%" }}>Mots-clés présents</span>
              <span style={{ "--width": "74%" }}>Expérience alignée</span>
            </div>
            <div className="diagnostic-actions">
              <span>Priorité 1 · Ajouter SQL avancé</span>
              <span>Priorité 2 · Chiffrer les résultats</span>
            </div>
          </div>
        </section>

        <section className="features-section" id="section-features">
          <div className="section-heading">
            <h2>{copy.featuresTitle}</h2>
            <p>{copy.featuresText}</p>
          </div>
          <div className="feature-grid">
            {copy.featureCards.map((card, index) => (
              <article className={index === 1 ? "feature-card dark" : "feature-card"} key={card.title}>
                <span className="feature-icon">
                  <UiIcon name={index === 0 ? "upload" : index === 1 ? "chat" : "chart"} />
                </span>
                <h3>{card.title}</h3>
                <p>{card.text}</p>
                <div className="feature-tags">
                  {card.tags.map((tag) => (
                    <span key={tag}>{tag}</span>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="steps-section" id="section-entretiens">
          <div className="section-heading">
            <h2>{copy.stepsTitle}</h2>
            <p>{copy.stepsText}</p>
          </div>
          <div className="landing-steps">
            {copy.steps.map((step, index) => (
              <article key={step.title}>
                <span className="step-number">{String(index + 1).padStart(2, "0")}</span>
                <span className="step-icon">
                  <UiIcon name={index === 0 ? "upload" : index === 1 ? "matchmark" : "chat"} />
                </span>
                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="career-section" id="section-offres">
          <div className="career-section-head">
            <div>
              <span className="section-eyebrow">{language === "en" ? "Career paths" : "Parcours métiers"}</span>
              <h2>{copy.careersTitle}</h2>
            </div>
            <p>
              {language === "en"
                ? "Quick examples of roles that Career CV can compare with your CV."
                : "Quelques exemples de métiers que Career CV peut comparer avec votre CV."}
            </p>
          </div>
          <div className="career-grid">
            {CAREER_CARDS.map((career) => (
              <article className={`career-card ${career.tone}`} key={career.title}>
                <div className="career-card-top">
                  <h3>{career.title}</h3>
                  <span>{career.score}%</span>
                </div>
                <p>{career.skills}</p>
                <div className="career-card-bottom">
                  <small>{copy.careerSubtitle}</small>
                  <button type="button" aria-label={`${copy.careerSubtitle} ${career.title}`}>
                    <UiIcon name="chevron" className="btn-chevron" />
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>

        <FaqSection copy={copy} />
      </main>

      <footer className="landing-footer">
        <div>
          <div className="landing-brand footer-brand">
            <span className="brand-mark" aria-hidden="true">
              <UiIcon name="matchmark" />
            </span>
            <strong>Career CV</strong>
          </div>
          <p>{copy.footerText}</p>
        </div>
        <FooterColumn
          title={copy.footerProduct}
          links={copy.linksProduct}
          onLinkClick={(_link, index) => {
            if (index === 4) {
              onPricingClick?.();
              return;
            }
            if (index === 5) {
              document.getElementById("section-faq")?.scrollIntoView({ behavior: "smooth", block: "start" });
              return;
            }
            document.getElementById(PRODUCT_SECTION_IDS[index])?.scrollIntoView({ behavior: "smooth", block: "start" });
          }}
        />
        <FooterColumn
          title={copy.footerCompany}
          links={copy.linksCompany}
          onLinkClick={(_link, index) => {
            if (index === 0) onAboutClick?.();
            if (index === 1) onContactClick?.();
            if (index === 2) onContactClick?.();
          }}
        />
        <FooterColumn
          title={copy.footerLegal}
          links={copy.linksLegal}
          onLinkClick={(_link, index) => {
            if (index === 0) onPrivacyClick?.();
            if (index === 1) onTermsClick?.();
            if (index === 2) onCookiesClick?.();
            if (index === 3) onSecurityClick?.();
          }}
        />
      </footer>
    </div>
  );
}

function FaqSection({ copy }) {
  const [openIndex, setOpenIndex] = useState(0);
  const items = copy.faq || [];
  if (!items.length) return null;

  return (
    <section className="faq-section" id="section-faq">
      <div className="section-heading">
        <span className="section-eyebrow">{copy.faqEyebrow}</span>
        <h2>{copy.faqTitle}</h2>
        <p>{copy.faqText}</p>
      </div>
      <div className="faq-list">
        {items.map((item, index) => {
          const isOpen = index === openIndex;
          return (
            <article key={item.q} className={`faq-item ${isOpen ? "open" : ""}`}>
              <button
                type="button"
                className="faq-question"
                aria-expanded={isOpen}
                onClick={() => setOpenIndex(isOpen ? -1 : index)}
              >
                <span className="faq-index">{String(index + 1).padStart(2, "0")}</span>
                <span className="faq-question-text">{item.q}</span>
                <span className="faq-toggle" aria-hidden="true">
                  <UiIcon name="plus" />
                </span>
              </button>
              <div className="faq-answer-wrap">
                <div className="faq-answer-inner">
                  <p className="faq-answer">{item.a}</p>
                </div>
              </div>
            </article>
          );
        })}
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
        <div className="landing-brand">
          <span className="brand-mark" aria-hidden="true">
            <UiIcon name="matchmark" />
          </span>
          <strong>Career CV</strong>
        </div>
        <div className="landing-actions">
          <LanguageSwitch language={language} setLanguage={setLanguage} />
          <button className="landing-link" type="button" onClick={onLoginClick}>
            {language === "en" ? "Log in" : "Se connecter"}
          </button>
          <button className="landing-signup" type="button" onClick={onSignupClick}>
            {language === "en" ? "Sign up" : "S'inscrire"}
          </button>
        </div>
      </header>

      <main className="legal-page info-page">
        <button type="button" className="legal-back" onClick={onBack}>
          {language === "en" ? "? Back to home" : "? Retour à l'accueil"}
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
