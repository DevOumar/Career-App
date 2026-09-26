import React from "react";
// Module Email Scout : recherche d'adresses e-mail probables par
// entreprise/domaine + nom, avec niveau de confiance (SMTP vérifié ou non).
import { useState } from "react";
import { UiIcon } from "../../components/UiIcon.jsx";
import { getFriendlyErrorMessage } from "../../lib/errors.js";
import { findEmail } from "../../lib/inMemoryDb.js";
import { ModuleHero, EmailScoutArt } from "../../components/ModuleWorkspace.jsx";
import { AiDisclaimer } from "../../components/AiDisclaimer.jsx";

const EMAIL_CONFIDENCE_COPY = {
  smtp_confirmed: { fr: "Confirmé par le serveur mail", en: "Confirmed by the mail server" },
  pattern_only: { fr: "Suggestion probable (non vérifiée)", en: "Likely suggestion (unverified)" },
  smtp_rejected: { fr: "Rejeté par le serveur mail", en: "Rejected by the mail server" }
};

function EmailFinderPage({ language, userId, tokensBalance, onGoToTarifs, onConsumeToken }) {
  const copy =
    language === "en"
      ? {
          eyebrow: "Tool · Email Scout",
          chipDomain: "Live domain check",
          chipFormats: "Most common formats tested",
          tokenChip: "{count} token(s) available",
          unlimitedChip: "Unlimited searches",
          companyStep: "The company",
          companyStepHint: "Its name is enough: we find its domain. Or enter the domain directly.",
          or: "or",
          personStep: "The person to contact",
          personStepHint: "Recruiter, manager or HR: first and last name as shown on LinkedIn.",
          requiredHint: "First name, last name and a company (or domain) are required.",
          searchingTitle: "Search in progress…",
          searchingText: "We test the formats and query the company's mail server.",
          howTitle: "How it works",
          howSteps: [
            { title: "Domain check", text: "We make sure the company's domain really receives email." },
            { title: "Formats tested", text: "first.last, flast, first… the most common corporate formats." },
            { title: "Live verification", text: "When the server allows it, it confirms whether the address exists." }
          ],
          legendTitle: "Confidence levels",
          legendConfirmed: "the mail server accepted the address.",
          legendPattern: "common format, the server did not allow verification.",
          legendRejected: "the server says this address does not exist.",
          title: "Email Scout",
          subtitle: "Don't let an application stall for lack of a contact. Find a recruiter's professional email in seconds.",
          disclaimer:
            "No more guessing emails at random: we test the most common formats and check live that the domain can receive mail, giving you a reliable lead instead of a shot in the dark.",
          company: "Company name",
          companyPlaceholder: "e.g. Google",
          domain: "Company domain",
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
          eyebrow: "Outil · Email Scout",
          chipDomain: "Domaine vérifié en direct",
          chipFormats: "Formats les plus courants testés",
          tokenChip: "{count} jeton(s) disponible(s)",
          unlimitedChip: "Recherches illimitées",
          companyStep: "L'entreprise",
          companyStepHint: "Son nom suffit : on retrouve son domaine. Ou saisissez directement le domaine.",
          or: "ou",
          personStep: "La personne à contacter",
          personStepHint: "Recruteur, manager ou RH : prénom et nom tels qu'affichés sur LinkedIn.",
          requiredHint: "Prénom, nom et une entreprise (ou un domaine) sont nécessaires.",
          searchingTitle: "Recherche en cours…",
          searchingText: "On teste les formats et on interroge le serveur mail de l'entreprise.",
          howTitle: "Comment ça marche",
          howSteps: [
            { title: "Vérification du domaine", text: "On s'assure que le domaine de l'entreprise reçoit bien des emails." },
            { title: "Formats testés", text: "prenom.nom, pnom, prenom… les formats d'entreprise les plus courants." },
            { title: "Vérification en direct", text: "Quand le serveur l'autorise, il confirme si l'adresse existe." }
          ],
          legendTitle: "Niveaux de confiance",
          legendConfirmed: "le serveur mail a accepté l'adresse.",
          legendPattern: "format courant, le serveur n'a pas permis de vérifier.",
          legendRejected: "le serveur indique que cette adresse n'existe pas.",
          title: "Email Scout",
          subtitle: "Ne laissez plus une candidature s'arrêter faute d'un contact. Retrouvez l'email professionnel d'un recruteur en quelques secondes.",
          disclaimer:
            "Fini les emails envoyés au hasard : on teste les formats les plus courants et on vérifie en direct que le domaine peut recevoir des messages, pour vous donner une piste fiable plutôt qu'un coup de chance.",
          company: "Nom de l'entreprise",
          companyPlaceholder: "ex : Google",
          domain: "Domaine de l'entreprise",
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

  const confidenceLegend = [
    { id: "smtp_confirmed", tone: "ok", text: copy.legendConfirmed },
    { id: "pattern_only", tone: "warn", text: copy.legendPattern },
    { id: "smtp_rejected", tone: "bad", text: copy.legendRejected }
  ];

  return (
    <section className="mw-main email-scout">
      <ModuleHero
        eyebrow={copy.eyebrow}
        title={copy.title}
        subtitle={copy.subtitle}
        art={<EmailScoutArt />}
        chips={[
          { icon: "globe", label: copy.chipDomain },
          { icon: "mail", label: copy.chipFormats },
          { icon: "pricetag", label: hasUnlimitedTokens ? copy.unlimitedChip : copy.tokenChip.replace("{count}", Math.max(0, tokensBalance)) }
        ]}
      />

      <div className="email-scout-grid">
        <form className="mw-card email-scout-form" onSubmit={handleSubmit} noValidate>
          <div className="mw-step-head">
            <span className="mw-step-num">1</span>
            <div>
              <h3>{copy.companyStep}</h3>
              <p>{copy.companyStepHint}</p>
            </div>
          </div>
          <label className="email-scout-field">
            <span>{copy.company}</span>
            <div className="email-finder-input-wrap">
              <UiIcon name="briefcase" />
              <input value={companyName} onChange={(event) => setCompanyName(event.target.value)} placeholder={copy.companyPlaceholder} />
            </div>
          </label>
          <div className="email-scout-or">
            <span>{copy.or}</span>
          </div>
          <label className="email-scout-field">
            <span>{copy.domain}</span>
            <div className="email-finder-input-wrap">
              <UiIcon name="globe" />
              <input value={domain} onChange={(event) => setDomain(event.target.value)} placeholder={copy.domainPlaceholder} />
            </div>
          </label>

          <div className="mw-step-head email-scout-step2">
            <span className="mw-step-num">2</span>
            <div>
              <h3>{copy.personStep}</h3>
              <p>{copy.personStepHint}</p>
            </div>
          </div>
          <div className="email-finder-name-row">
            <label className="email-scout-field">
              <span>{copy.firstName}</span>
              <div className="email-finder-input-wrap">
                <UiIcon name="profile" />
                <input value={firstName} onChange={(event) => setFirstName(event.target.value)} placeholder={copy.firstNamePlaceholder} required />
              </div>
            </label>
            <label className="email-scout-field">
              <span>{copy.lastName}</span>
              <div className="email-finder-input-wrap">
                <UiIcon name="profile" />
                <input value={lastName} onChange={(event) => setLastName(event.target.value)} placeholder={copy.lastNamePlaceholder} required />
              </div>
            </label>
          </div>

          {error ? <p className="field-error">{error}</p> : null}
          {outOfTokens ? (
            <p className="field-hint">
              {copy.noTokens} <button type="button" className="link-button" onClick={onGoToTarifs}>{copy.noTokensCta}</button>
            </p>
          ) : null}

          <button type="submit" className="btn-main ready mw-cta email-scout-submit" disabled={!canSubmit || isSearching}>
            {isSearching ? (
              <>
                <span className="btn-spinner" /> {copy.searching}
              </>
            ) : (
              <>
                <UiIcon name="network" /> {hasUnlimitedTokens ? copy.submitUnlimited : copy.submit}
              </>
            )}
          </button>
          {!canSubmit ? <small className="mw-field-hint email-scout-required">{copy.requiredHint}</small> : null}
        </form>

        <div className="mw-card email-scout-results">
          {isSearching ? (
            <div className="email-scout-searching">
              <span className="email-scout-radar" aria-hidden="true">
                <i />
                <i />
                <UiIcon name="mail" />
              </span>
              <strong>{copy.searchingTitle}</strong>
              <p>{copy.searchingText}</p>
            </div>
          ) : !result ? (
            <div className="email-scout-how">
              <h3>{copy.howTitle}</h3>
              <ol className="mw-steps-list">
                {copy.howSteps.map((step, index) => (
                  <li key={step.title}>
                    <span className="mw-step-num">{index + 1}</span>
                    <div>
                      <strong>{step.title}</strong>
                      <p>{step.text}</p>
                    </div>
                  </li>
                ))}
              </ol>
              <div className="email-scout-legend">
                <span>{copy.legendTitle}</span>
                {confidenceLegend.map((item) => (
                  <p key={item.id}>
                    <i className={`email-scout-dot ${item.tone}`} />
                    <strong>{EMAIL_CONFIDENCE_COPY[item.id][language === "en" ? "en" : "fr"]}</strong>
                    <small>{item.text}</small>
                  </p>
                ))}
              </div>
            </div>
          ) : !result.domainHasMx ? (
            <div className="email-scout-nomx">
              <span className="email-scout-nomx-icon">
                <UiIcon name="alert" />
              </span>
              <strong>{copy.domainNoMxTitle}</strong>
              <p>{copy.domainNoMx}</p>
            </div>
          ) : (
            <>
              {result.best ? (
                <div className={`email-scout-best tone-${result.best.confidence}`}>
                  <span className="email-scout-best-icon">@</span>
                  <div className="email-scout-best-body">
                    <span className="email-finder-best-label">{copy.bestMatch}</span>
                    <strong>{result.best.email}</strong>
                    <span className={`tag email-confidence-${result.best.confidence}`}>
                      {EMAIL_CONFIDENCE_COPY[result.best.confidence]?.[language] || result.best.confidence}
                    </span>
                  </div>
                  <button type="button" className="email-scout-copy" onClick={() => handleCopy(result.best.email)}>
                    <UiIcon name={copiedEmail === result.best.email ? "check" : "file"} />
                    {copiedEmail === result.best.email ? copy.copied : copy.copy}
                  </button>
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
              <AiDisclaimer
                language={language}
                text={
                  language === "en"
                    ? "Addresses deduced automatically: confirm them (company website, LinkedIn) before sending."
                    : "Adresses déduites automatiquement : confirmez-les (site de l'entreprise, LinkedIn) avant tout envoi."
                }
              />
            </>
          )}
        </div>
      </div>
    </section>
  );
}

export default EmailFinderPage;
