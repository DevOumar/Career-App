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
          subtitle: "Don't let an application stall for lack of a contact. Find a recruiter's professional email in seconds, for free.",
          disclaimer:
            "No more guessing emails at random: we test the most common formats and check live that the domain can receive mail, giving you a reliable lead instead of a shot in the dark.",
          company: "Company name",
          companyPlaceholder: "e.g. Google",
          domain: "Or domain directly (optional)",
          domainPlaceholder: "e.g. google.com",
          firstName: "First name",
          firstNamePlaceholder: "e.g. Jean",
          lastName: "Last name",
          lastNamePlaceholder: "e.g. Dupont",
          submit: "Find email (1 token)",
          submitUnlimited: "Find email",
          searching: "Searching…",
          noTokens: "You're out of tokens.",
          noTokensCta: "Upgrade your plan",
          domainNoMxTitle: "Domain doesn't accept email",
          domainNoMx: "This domain doesn't appear to accept email, double-check the company name or domain.",
          bestMatch: "Most likely email",
          otherSuggestions: "Other suggestions",
          copy: "Copy",
          copied: "Copied!",
          emptyTitle: "No search yet",
          empty: "Fill in the form to get email suggestions."
        }
      : {
          title: "Email Scout",
          subtitle: "Ne laissez plus une candidature s'arrêter faute d'un contact. Retrouvez l'email professionnel d'un recruteur en quelques secondes, gratuitement.",
          disclaimer:
            "Fini les emails envoyés au hasard : on teste les formats les plus courants et on vérifie en direct que le domaine peut recevoir des messages, pour vous donner une piste fiable plutôt qu'un coup de chance.",
          company: "Nom de l'entreprise",
          companyPlaceholder: "ex : Google",
          domain: "Ou domaine directement (optionnel)",
          domainPlaceholder: "ex : google.com",
          firstName: "Prénom",
          firstNamePlaceholder: "ex : Jean",
          lastName: "Nom",
          lastNamePlaceholder: "ex : Dupont",
          submit: "Trouver l'email (1 jeton)",
          submitUnlimited: "Trouver l'email",
          searching: "Recherche…",
          noTokens: "Vous n'avez plus de jetons.",
          noTokensCta: "Passer à un plan supérieur",
          domainNoMxTitle: "Domaine sans email",
          domainNoMx: "Ce domaine ne semble pas accepter d'emails, vérifiez le nom de l'entreprise ou le domaine.",
          bestMatch: "Email le plus probable",
          otherSuggestions: "Autres suggestions",
          copy: "Copier",
          copied: "Copié !",
          emptyTitle: "Aucune recherche",
          empty: "Remplissez le formulaire pour obtenir des suggestions d'email."
        };

  const [companyName, setCompanyName] = useState("");
  const [domain, setDomain] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const [copiedEmail, setCopiedEmail] = useState("");

  // 999 = solde "infini" (compte associé à un cabinet/école) : dans ce cas
  // afficher "(1 jeton)" sur le bouton n'a pas de sens.
  const hasUnlimitedTokens = tokensBalance >= 999;
  const outOfTokens = !hasUnlimitedTokens && tokensBalance <= 0;
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
          {outOfTokens ? (
            <p className="field-hint">
              {copy.noTokens} <button type="button" className="link-button" onClick={onGoToTarifs}>{copy.noTokensCta}</button>
            </p>
          ) : null}

          <button type="submit" className="btn-main ready" disabled={!canSubmit || isSearching}>
            {isSearching ? <span className="btn-spinner" /> : null}{" "}
            {isSearching ? copy.searching : hasUnlimitedTokens ? copy.submitUnlimited : copy.submit}
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
