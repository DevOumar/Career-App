import React from "react";
// Module Email Scout : recherche d'adresses e-mail probables par
// entreprise/domaine + nom, avec niveau de confiance (SMTP vérifié ou non).
import { useState } from "react";
import { UiIcon } from "../../components/UiIcon.jsx";
import { getFriendlyErrorMessage } from "../../lib/errors.js";
import { findEmail } from "../../lib/inMemoryDb.js";
import { SchoolEmptyState } from "../school/SchoolApp.jsx";

const EMAIL_CONFIDENCE_COPY = {
  smtp_confirmed: { fr: "Confirmé par le serveur mail", en: "Confirmed by the mail server" },
  pattern_only: { fr: "Suggestion probable (non vérifiée)", en: "Likely suggestion (unverified)" },
  smtp_rejected: { fr: "Rejeté par le serveur mail", en: "Rejected by the mail server" }
};

function EmailFinderPage({ language, userId, tokensBalance, onGoToTarifs, onConsumeToken }) {
  const copy =
    language === "en"
      ? {
          title: "Email Scout",
          subtitle: "Guess a professional email address from a name and a company — free, pattern-based.",
          disclaimer:
            "Find the right professional email in seconds, for free. We test the most common formats and check live that the domain can receive mail — with an honest confidence level every time, never a made-up score.",
          company: "Company name",
          companyPlaceholder: "e.g. Google",
          domain: "Or domain directly (optional)",
          domainPlaceholder: "e.g. google.com",
          firstName: "First name",
          firstNamePlaceholder: "e.g. Jean",
          lastName: "Last name",
          lastNamePlaceholder: "e.g. Dupont",
          submit: "Find email (1 token)",
          searching: "Searching…",
          noTokens: "You're out of tokens. Upgrade your plan to keep using Email Scout.",
          domainNoMxTitle: "Domain doesn't accept email",
          domainNoMx: "This domain doesn't appear to accept email — double-check the company name or domain.",
          bestMatch: "Most likely email",
          otherSuggestions: "Other suggestions",
          copy: "Copy",
          copied: "Copied!",
          emptyTitle: "No search yet",
          empty: "Fill in the form to get email suggestions."
        }
      : {
          title: "Email Scout",
          subtitle: "Devine une adresse email professionnelle à partir d'un nom et d'une entreprise — gratuit, basé sur des motifs.",
          disclaimer:
            "Trouve la bonne adresse email professionnelle en quelques secondes, gratuitement. On teste les formats les plus courants et on vérifie en direct que le domaine peut recevoir des emails — avec un niveau de confiance honnête à chaque fois, jamais un score inventé.",
          company: "Nom de l'entreprise",
          companyPlaceholder: "ex : Google",
          domain: "Ou domaine directement (optionnel)",
          domainPlaceholder: "ex : google.com",
          firstName: "Prénom",
          firstNamePlaceholder: "ex : Jean",
          lastName: "Nom",
          lastNamePlaceholder: "ex : Dupont",
          submit: "Trouver l'email (1 jeton)",
          searching: "Recherche…",
          noTokens: "Vous n'avez plus de jetons. Passez à un plan supérieur pour continuer à utiliser Email Scout.",
          domainNoMxTitle: "Domaine sans email",
          domainNoMx: "Ce domaine ne semble pas accepter d'emails — vérifie le nom de l'entreprise ou le domaine.",
          bestMatch: "Email le plus probable",
          otherSuggestions: "Autres suggestions",
          copy: "Copier",
          copied: "Copié !",
          emptyTitle: "Aucune recherche",
          empty: "Remplis le formulaire pour obtenir des suggestions d'email."
        };

  const [companyName, setCompanyName] = useState("");
  const [domain, setDomain] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const [copiedEmail, setCopiedEmail] = useState("");

  const outOfTokens = tokensBalance < 999 && tokensBalance <= 0;
  const canSubmit = firstName.trim() && lastName.trim() && (companyName.trim() || domain.trim());

  async function handleSubmit(event) {
    event.preventDefault();
    if (!canSubmit || isSearching) return;
    if (outOfTokens) {
      onGoToTarifs();
      return;
    }
    setError("");
    setIsSearching(true);
    setResult(null);
    try {
      const data = await findEmail({
        userId,
        companyName: companyName.trim(),
        domain: domain.trim(),
        firstName: firstName.trim(),
        lastName: lastName.trim()
      });
      setResult(data);
      await onConsumeToken();
    } catch (err) {
      setError(getFriendlyErrorMessage(err, language));
    } finally {
      setIsSearching(false);
    }
  }

  function handleCopy(email) {
    navigator.clipboard?.writeText(email);
    setCopiedEmail(email);
    setTimeout(() => setCopiedEmail(""), 1800);
  }

  return (
    <section className="email-finder-page">
      <header className="module-header feature-page-header">
        <span className="feature-page-header-icon">
          <UiIcon name="network" />
        </span>
        <div>
          <h2>{copy.title}</h2>
          <p>{copy.subtitle}</p>
        </div>
      </header>

      <div className="email-finder-callout">
        <span className="email-finder-callout-icon">
          <UiIcon name="shield" />
        </span>
        <p>{copy.disclaimer}</p>
      </div>

      <div className="email-finder-grid">
        <form className="email-finder-form" onSubmit={handleSubmit}>
          <label>
            {copy.company}
            <div className="email-finder-input-wrap">
              <UiIcon name="briefcase" />
              <input
                value={companyName}
                onChange={(event) => setCompanyName(event.target.value)}
                placeholder={copy.companyPlaceholder}
              />
            </div>
          </label>
          <label>
            {copy.domain}
            <div className="email-finder-input-wrap">
              <UiIcon name="globe" />
              <input value={domain} onChange={(event) => setDomain(event.target.value)} placeholder={copy.domainPlaceholder} />
            </div>
          </label>
          <div className="email-finder-name-row">
            <label>
              {copy.firstName}
              <div className="email-finder-input-wrap">
                <UiIcon name="profile" />
                <input
                  value={firstName}
                  onChange={(event) => setFirstName(event.target.value)}
                  placeholder={copy.firstNamePlaceholder}
                  required
                />
              </div>
            </label>
            <label>
              {copy.lastName}
              <div className="email-finder-input-wrap">
                <UiIcon name="profile" />
                <input
                  value={lastName}
                  onChange={(event) => setLastName(event.target.value)}
                  placeholder={copy.lastNamePlaceholder}
                  required
                />
              </div>
            </label>
          </div>

          {error ? <p className="field-error">{error}</p> : null}
          {outOfTokens ? <p className="field-hint">{copy.noTokens}</p> : null}

          <button type="submit" className="btn-main ready" disabled={!canSubmit || isSearching}>
            {isSearching ? <span className="btn-spinner" /> : null} {isSearching ? copy.searching : copy.submit}
          </button>
        </form>

        <div className="email-finder-results">
          {!result ? (
            <SchoolEmptyState icon="network" title={copy.emptyTitle} hint={copy.empty} />
          ) : !result.domainHasMx ? (
            <SchoolEmptyState icon="alert" title={copy.domainNoMxTitle} hint={copy.domainNoMx} />
          ) : (
            <>
              {result.best ? (
                <div className="email-finder-best">
                  <span className="email-finder-best-label">{copy.bestMatch}</span>
                  <div className="email-finder-email-row">
                    <strong>{result.best.email}</strong>
                    <button type="button" onClick={() => handleCopy(result.best.email)}>
                      {copiedEmail === result.best.email ? copy.copied : copy.copy}
                    </button>
                  </div>
                  <span className={`tag email-confidence-${result.best.confidence}`}>
                    {EMAIL_CONFIDENCE_COPY[result.best.confidence]?.[language] || result.best.confidence}
                  </span>
                </div>
              ) : null}

              {result.items?.length > 1 ? (
                <div className="email-finder-alternates">
                  <span className="email-finder-best-label">{copy.otherSuggestions}</span>
                  {result.items
                    .filter((item) => item.email !== result.best?.email)
                    .map((item) => (
                      <div key={item.email} className="email-finder-alt-row">
                        <span>{item.email}</span>
                        <span className={`tag email-confidence-${item.confidence}`}>
                          {EMAIL_CONFIDENCE_COPY[item.confidence]?.[language] || item.confidence}
                        </span>
                        <button type="button" onClick={() => handleCopy(item.email)}>
                          {copiedEmail === item.email ? copy.copied : copy.copy}
                        </button>
                      </div>
                    ))}
                </div>
              ) : null}
            </>
          )}
        </div>
      </div>
    </section>
  );
}

export default EmailFinderPage;
