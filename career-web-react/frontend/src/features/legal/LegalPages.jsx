import React from "react";
// Module Pages légales : confidentialité, CGU, mentions (structure commune
// LegalDocPage).
import { useState, useEffect } from "react";
import { UiIcon } from "../../components/UiIcon.jsx";
import { LanguageSwitch } from "../../components/LanguageSwitch.jsx";
import { ConnectedFooter } from "../../App.jsx";

const PRIVACY_CONTACT_EMAIL = "privacy@careercv.fr";
const PRIVACY_LAST_UPDATED = { fr: "28 septembre 2026", en: "September 28, 2026" };

function slugify(text) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Texte simple, ou { term, text } pour un intitulé en gras suivi de sa description.
function LegalText({ item }) {
  if (typeof item === "string") return item;
  return (
    <>
      <strong>{item.term}</strong>
      {item.text ? ` ${item.text}` : null}
    </>
  );
}

function LegalDocPage({
  eyebrow,
  title,
  updated,
  sections,
  closing,
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
  onSecurityClick,
  initialSectionIndex
}) {
  const initialId = sections[initialSectionIndex] ? slugify(sections[initialSectionIndex].heading) : sections[0] ? slugify(sections[0].heading) : "";
  const [activeId, setActiveId] = useState(initialId);

  function handleTocClick(id) {
    setActiveId(id);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  useEffect(() => {
    if (initialSectionIndex == null) return;
    const id = sections[initialSectionIndex] ? slugify(sections[initialSectionIndex].heading) : "";
    if (!id) return;
    const timer = setTimeout(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 60);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="landing-shell legal-shell">
      <header className="landing-nav">
        <div className="landing-brand">
          <img src="/logo-career-cv.png" alt="Career CV" className="brand-logo" />
        </div>
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

      <main className="legal-page">
        <button type="button" className="legal-back" onClick={onBack}>
          <UiIcon name="chevron" className="legal-back-icon" />
          {language === "en" ? "Back to home" : "Retour à l'accueil"}
        </button>

        <p className="legal-eyebrow">{eyebrow}</p>
        <h1 className="legal-doc-title">{title}</h1>
        <p className="legal-doc-updated">{updated}</p>

        <div className="legal-doc-layout">
          <nav className="legal-toc" aria-label="Sommaire">
            <span className="legal-toc-label">{language === "en" ? "On this page" : "Sur cette page"}</span>
            {sections.map((section) => {
              const id = slugify(section.heading);
              return (
                <button
                  key={id}
                  type="button"
                  className={activeId === id ? "active" : ""}
                  onClick={() => handleTocClick(id)}
                >
                  {section.heading}
                </button>
              );
            })}
          </nav>

          <div className="legal-doc-content">
            {sections.map((section) => {
              const id = slugify(section.heading);
              return (
                <section key={id} id={id} className="legal-doc-section">
                  <h2>{section.heading}</h2>
                  {section.paragraphs?.map((paragraph) => (
                    <p key={typeof paragraph === "string" ? paragraph : paragraph.term}>
                      <LegalText item={paragraph} />
                    </p>
                  ))}
                  {section.table ? (
                    <div className="legal-doc-table-wrap">
                      <table className="legal-doc-table">
                        <thead>
                          <tr>
                            {section.table.head.map((cell) => (
                              <th key={cell}>{cell}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {section.table.rows.map((row) => (
                            <tr key={row[0]}>
                              {row.map((cell) => (
                                <td key={cell}>{cell}</td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : null}
                  {section.list ? (
                    <ul className="legal-doc-list">
                      {section.list.map((item) => (
                        <li key={typeof item === "string" ? item : item.term}>
                          <LegalText item={item} />
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  {section.after?.map((paragraph) => (
                    <p key={typeof paragraph === "string" ? paragraph : paragraph.term}>
                      <LegalText item={paragraph} />
                    </p>
                  ))}
                  {section.note ? <div className="legal-callout">{section.note}</div> : null}
                </section>
              );
            })}

            <div className="legal-doc-closing">
              <p>{closing.body}</p>
              <p>
                <strong>{PRIVACY_CONTACT_EMAIL}</strong>
              </p>
            </div>
          </div>
        </div>
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

function PrivacyPolicyPage({
  language,
  setLanguage,
  onBack,
  onLoginClick,
  onSignupClick,
  onNavigateLegal,
  landingCopy,
  focusCookies,
  focusSecurity
}) {
  const isEn = language === "en";

  const sections = isEn
    ? [
        {
          heading: "What does this policy cover?",
          paragraphs: [
            "This page explains what personal data Career CV collects when you use the platform, why we collect it, and the choices you have. It applies to every visitor and every account holder (candidates, schools and recruitment agencies).",
            "By creating an account, you acknowledge that you have read this page.",
            { term: "Data controller:", text: "Career CV, a simplified joint-stock company (SAS). Contact: privacy@careercv.fr" },
            "The company name, SIRET number and registered address of the data controller will be added here as soon as they are available.",
            { term: "Data Protection Officer (DPO):", text: "reachable at privacy@careercv.fr" }
          ]
        },
        {
          heading: "What data do we collect?",
          paragraphs: [
            "When you register, we ask for your first name, last name, email address and a password, which we store using salted cryptographic hashing, never in plain text.",
            "When you use the CV analysis or matching tools, we process the content of the CVs you upload and the job offers you submit, solely to produce your results.",
            "When you use the salary negotiation simulator, we process the job title, the location and the content of your exchanges with the conversational agent, without ever sending identifying data to the external services consulted to establish a salary range.",
            "If you subscribe to a paid plan, we keep the chosen plan and non-sensitive Stripe identifiers (customer ID, subscription ID); we never receive or store your bank details.",
            "If you joined through a partner institution (school license) or apply to an offer published by a partner recruitment agency, that partner has access to a dashboard showing the candidates concerned: name, email and compatibility score, as well as aggregated statistics (on the cohort for a school, on the applications received for an agency).",
            "We also record basic technical data (IP address, browser, device) and account security events (logins, password changes), kept to prevent fraud and to let you review the activity of your own account."
          ]
        },
        {
          heading: "Why do we process it?",
          table: {
            head: ["Purpose", "Legal basis"],
            rows: [
              ["Create and secure your account, let you sign in", "Performance of the contract"],
              ["Run the CV/offer matching engine and produce your compatibility score", "Legitimate interest: you can object at any time"],
              ["Simulate an interview, generate a cover letter or simulate a salary negotiation with a conversational agent", "Consent, given each time you voluntarily use the feature"],
              ["Manage your subscription and billing", "Performance of the contract / legal obligation"],
              ["Secure your account and prevent fraud", "Legitimate interest"],
              ["Send you account notifications and, unless you have objected, occasional service announcements", "Consent / legitimate interest"],
              ["Allow a partner institution or agency to follow the activity of its cohort or its applications (school license / agency subscription)", "Performance of the contract signed with the partner (school license or agency subscription)"]
            ]
          }
        },
        {
          heading: "Who has access to it?",
          paragraphs: [
            "We never sell personal data, and we deliberately limit the number of partners who process it on our behalf:"
          ],
          list: [
            "Our AI inference providers, OpenAI and, as a fallback, Groq, to analyze the text of your CV and of the submitted offers, and to generate your matching results, simulated interviews, cover letters and salary negotiation exchanges.",
            "Adzuna and France Travail (API), only for the salary negotiation simulator, to obtain a real salary range from the job title and location alone, without any identifying data.",
            "Supabase, which hosts our application database (European Union, Frankfurt).",
            "Stripe, which processes subscription payments; we never see or store your bank details.",
            "Google, only if you actively choose to sign in with a Google account.",
            "Our email delivery provider, for verification codes and, if enabled, announcements.",
            "If you joined through a partner institution or agency, that partner has access to the data described in the previous section, within the limits of its own dashboard."
          ],
          after: [
            {
              term: "Transfers outside the European Union.",
              text: "The AI inference provider we use may process your data on servers located in the United States. Depending on the provider used for the feature concerned, this transfer is covered either by the provider's certification under the EU-US Data Privacy Framework (a safeguard recognised as equivalent by the European Commission), or by the European Commission's Standard Contractual Clauses when the provider is not certified."
            }
          ]
        },
        {
          heading: "How long do we keep your data?",
          list: [
            { term: "Account and related content", text: "(CV, matching history, exchanges with AI agents, cover letters): kept as long as your account is active. You can delete it at any time from Account > Security; deletion is immediate." },
            { term: "Inactive account:", text: "after 3 years without any login, we reserve the right to delete the account and its data, in line with the CNIL's recommendations on inactive customer data." },
            { term: "Login and security logs", text: "(IP address, browser, login history): kept for a rolling 12 months, then deleted." },
            { term: "Billing data", text: "(transactions, invoices): kept for 10 years from issue, in accordance with the legal obligation to keep accounting records (French Commercial Code, art. L123-22)." },
            { term: "Data visible to a partner institution or agency", text: "(school license / agency subscription): kept for the duration of the contract, deleted when it ends or at the partner's request." },
            { term: "Session cookie:", text: "for the duration of your session, deleted when you log out or when the token expires." }
          ]
        },
        {
          heading: "How do we protect it?",
          list: [
            "All traffic between your browser and our servers is encrypted (HTTPS/TLS).",
            "Passwords are salted and hashed (PBKDF2, 140,000 iterations); nobody can recover them in plain text, including us.",
            "You can enable two-factor authentication (2FA) with an app such as Google Authenticator, from Account > Security, for extra protection.",
            "An account locks temporarily after 5 failed login attempts, and you can reset it yourself by email if you forgot your password.",
            "You can view every device connected to your account and disconnect any of them individually from Account > Security.",
            "Access to production data is restricted and logged."
          ]
        },
        {
          heading: "Do we use cookies?",
          paragraphs: [
            "We only use one strictly necessary cookie to keep you signed in. We do not use any advertising or third-party tracking cookies."
          ]
        },
        {
          heading: "Is your data subject to automated decisions?",
          paragraphs: [
            "The CV/offer compatibility score you see is calculated by an explicit rules engine (weighting of skills, experience and education): it is not a decision made by generative artificial intelligence.",
            "For candidates, this score remains an aid to your own decision: nobody else derives an automated decision about you from it.",
            "If a partner recruitment agency or institution were to rely on this score to guide a decision about you, you would have the right not to be subject to a decision based solely on automated processing, the right to obtain human intervention, and the right to contest that decision (Article 22 GDPR)."
          ]
        },
        {
          heading: "What are your rights?",
          paragraphs: ["You stay in control of your data, directly from Account > Security:"],
          list: [
            "Download all your personal data (\"Download my data\" button, full JSON export or a readable summary you can print as PDF): right of access and portability.",
            "Correct inaccurate information from your profile: right to rectification.",
            "View and individually disconnect each device connected to your account.",
            "Permanently delete your account and the data attached to it: right to erasure.",
            "Object at any time to processing based on our legitimate interest, notably the matching engine: right to object.",
            "Request the restriction of processing while a dispute is being examined: right to restriction.",
            "Withdraw your consent at any time for the features that depend on it (interview simulator, salary negotiation, cover letter generation): this does not affect the lawfulness of processing already carried out."
          ],
          after: [
            "For any other request (a correction not possible directly in the app, a question about a specific processing), write to us.",
            "You also have the right to lodge a complaint with the CNIL (www.cnil.fr) if you believe the processing of your data does not comply with the regulations."
          ]
        }
      ]
    : [
        {
          heading: "Que couvre cette politique ?",
          paragraphs: [
            "Cette page explique quelles données personnelles Career CV collecte lorsque vous utilisez la plateforme, pourquoi nous les collectons, et les choix qui sont les vôtres. Elle s'applique à tout visiteur et à tout titulaire de compte (candidats, écoles et cabinets de recrutement).",
            "En créant un compte, vous reconnaissez avoir pris connaissance de cette page.",
            { term: "Responsable du traitement :", text: "Career CV, société par actions simplifiée (SAS). Contact : privacy@careercv.fr" },
            "La raison sociale, le SIRET et l'adresse du siège du responsable de traitement seront complétés ici dès leur disponibilité.",
            { term: "Délégué à la protection des données (DPO) :", text: "joignable à l'adresse privacy@careercv.fr" }
          ]
        },
        {
          heading: "Quelles données collectons-nous ?",
          paragraphs: [
            "À l'inscription, nous demandons votre prénom, votre nom, votre adresse email et un mot de passe, que nous stockons via un hachage cryptographique salé, jamais en clair.",
            "Lorsque vous utilisez les outils d'analyse de CV ou de matching, nous traitons le contenu des CV que vous téléchargez et des offres que vous soumettez, uniquement pour produire vos résultats.",
            "Lorsque vous utilisez le simulateur de négociation salariale, nous traitons l'intitulé du poste, la localisation et le contenu des échanges avec l'agent conversationnel, sans jamais transmettre de donnée identifiante aux services externes consultés pour établir une fourchette salariale.",
            "Si vous souscrivez un abonnement payant, nous conservons le plan choisi et des identifiants Stripe non sensibles (identifiant client, identifiant d'abonnement) ; nous ne recevons ni ne stockons jamais vos coordonnées bancaires.",
            "Si vous êtes inscrit via un établissement partenaire (licence école) ou que vous postulez à une offre publiée par un cabinet de recrutement partenaire, celui-ci a accès à un tableau de bord affichant les candidats concernés : nom, email et score de compatibilité, ainsi que des statistiques agrégées (sur la cohorte pour une école, sur les candidatures reçues pour un cabinet).",
            "Nous enregistrons également des données techniques basiques (adresse IP, navigateur, appareil) et des événements de sécurité du compte (connexions, changements de mot de passe), conservés pour prévenir la fraude et vous permettre de consulter l'activité de votre propre compte."
          ]
        },
        {
          heading: "Pourquoi les traitons-nous ?",
          table: {
            head: ["Finalité", "Base légale"],
            rows: [
              ["Créer et sécuriser votre compte, vous permettre de vous connecter", "Exécution du contrat"],
              ["Faire fonctionner le moteur de matching CV/offre et produire votre score de compatibilité", "Intérêt légitime : vous pouvez vous y opposer à tout moment"],
              ["Simuler un entretien, générer une lettre de motivation ou simuler une négociation salariale avec un agent conversationnel", "Consentement, donné à chaque utilisation volontaire de la fonctionnalité"],
              ["Gérer votre abonnement et la facturation", "Exécution du contrat / obligation légale"],
              ["Sécuriser votre compte et prévenir la fraude", "Intérêt légitime"],
              ["Vous envoyer des notifications liées à votre compte et, si vous ne vous y êtes pas opposé, d'occasionnelles annonces de service", "Consentement / intérêt légitime"],
              ["Permettre à un établissement ou un cabinet partenaire de suivre l'activité de sa cohorte ou de ses candidatures (licence école / abonnement cabinet)", "Exécution du contrat conclu avec le partenaire (licence école ou abonnement cabinet)"]
            ]
          }
        },
        {
          heading: "Qui y a accès ?",
          paragraphs: [
            "Nous ne vendons jamais de données personnelles, et nous limitons volontairement le nombre de partenaires qui les traitent pour notre compte :"
          ],
          list: [
            "Nos fournisseurs d'inférence IA, OpenAI et, en secours, Groq, pour analyser le texte de votre CV et des offres soumises, générer vos résultats de matching, vos entretiens simulés, vos lettres de motivation et vos échanges de négociation salariale.",
            "Adzuna et France Travail (API), uniquement pour le simulateur de négociation salariale, afin d'obtenir une fourchette salariale réelle à partir du seul intitulé de poste et de la localisation, sans aucune donnée identifiante transmise.",
            "Supabase, qui héberge notre base de données applicative (Union européenne, Francfort).",
            "Stripe, qui traite les paiements d'abonnement ; nous ne voyons ni ne stockons jamais vos données bancaires.",
            "Google, uniquement si vous choisissez activement de vous connecter avec un compte Google.",
            "Notre prestataire d'envoi d'emails, pour les codes de vérification et, si activées, les annonces.",
            "Si vous êtes inscrit via un établissement ou un cabinet partenaire, celui-ci a accès aux données décrites dans la section précédente, dans les limites de son propre tableau de bord."
          ],
          after: [
            {
              term: "Transferts hors Union européenne.",
              text: "Le fournisseur d'inférence IA que nous utilisons peut traiter vos données depuis des serveurs situés aux États-Unis. Selon le fournisseur retenu pour la fonctionnalité concernée, ce transfert est encadré soit par une certification du fournisseur au titre du Data Privacy Framework UE-États-Unis (garantie de protection reconnue équivalente par la Commission européenne), soit par les Clauses Contractuelles Types de la Commission européenne lorsque le fournisseur n'est pas certifié."
            }
          ]
        },
        {
          heading: "Combien de temps conservons-nous vos données ?",
          list: [
            { term: "Compte et contenu associé", text: "(CV, historique de matching, échanges avec les agents IA, lettres de motivation) : conservés tant que votre compte reste actif. Vous pouvez le supprimer à tout moment depuis Compte > Sécurité ; la suppression est immédiate." },
            { term: "Compte inactif :", text: "en l'absence de connexion pendant 3 ans, nous nous réservons le droit de supprimer le compte et les données associées, conformément aux recommandations de la CNIL sur la conservation des données clients inactives." },
            { term: "Logs de connexion et de sécurité", text: "(adresse IP, navigateur, historique de connexion) : conservés 12 mois glissants, puis supprimés." },
            { term: "Données de facturation", text: "(transactions, factures) : conservées 10 ans à compter de leur émission, conformément à l'obligation légale de conservation des documents comptables (Code de commerce, art. L123-22)." },
            { term: "Données visibles par un établissement ou un cabinet partenaire", text: "(licence école / abonnement cabinet) : conservées pour la durée du contrat, supprimées à son terme ou sur demande du partenaire." },
            { term: "Cookie de session :", text: "le temps de votre session, supprimé à la déconnexion ou à l'expiration du jeton." }
          ]
        },
        {
          heading: "Comment protégeons-nous vos données ?",
          list: [
            "Tout le trafic entre votre navigateur et nos serveurs est chiffré (HTTPS/TLS).",
            "Les mots de passe sont salés et hachés (PBKDF2, 140 000 itérations) ; ils ne sont récupérables en clair par personne, y compris nous.",
            "Vous pouvez activer la double authentification (2FA) via une application comme Google Authenticator, depuis Compte > Sécurité, pour une protection supplémentaire de votre compte.",
            "Un compte se verrouille temporairement après 5 tentatives de connexion échouées, et vous pouvez le réinitialiser vous-même par email si vous avez oublié votre mot de passe.",
            "Vous pouvez consulter tous les appareils connectés à votre compte et déconnecter individuellement n'importe lequel depuis Compte > Sécurité.",
            "L'accès aux données de production est restreint et journalisé."
          ]
        },
        {
          heading: "Utilisons-nous des cookies ?",
          paragraphs: [
            "Nous utilisons uniquement un cookie strictement nécessaire au maintien de votre connexion. Nous n'utilisons aucun cookie publicitaire ou de traçage tiers."
          ]
        },
        {
          heading: "Vos données font-elles l'objet d'une décision automatisée ?",
          paragraphs: [
            "Le score de compatibilité CV/offre que vous consultez est calculé par un moteur de règles explicites (pondération de compétences, d'expérience et de formation) : il ne s'agit pas d'une décision prise par une intelligence artificielle générative.",
            "Dans l'usage candidat, ce score reste une aide à votre propre décision : personne d'autre que vous n'en fait découler de décision automatique vous concernant.",
            "Si un cabinet de recrutement ou un établissement partenaire venait à s'appuyer sur ce score pour orienter une décision vous concernant, vous disposeriez du droit de ne pas faire l'objet d'une décision fondée exclusivement sur un traitement automatisé, du droit d'obtenir une intervention humaine, et de contester cette décision (article 22 du RGPD)."
          ]
        },
        {
          heading: "Quels sont vos droits ?",
          paragraphs: ["Vous gardez le contrôle de vos données, directement depuis Compte > Sécurité :"],
          list: [
            "Télécharger toutes vos données personnelles (bouton « Télécharger mes données », format JSON complet ou résumé lisible imprimable en PDF) : droit d'accès et de portabilité.",
            "Corriger une information inexacte depuis votre profil : droit de rectification.",
            "Consulter et déconnecter individuellement chacun des appareils connectés à votre compte.",
            "Supprimer définitivement votre compte et les données qui y sont attachées : droit à l'effacement.",
            "Vous opposer à tout moment au traitement de vos données fondé sur notre intérêt légitime, notamment le moteur de matching : droit d'opposition.",
            "Demander la limitation d'un traitement le temps qu'une contestation soit examinée : droit à la limitation.",
            "Retirer à tout moment votre consentement pour les fonctionnalités qui en dépendent (simulateur d'entretien, de négociation salariale, génération de lettre de motivation) : cela n'affecte pas la licéité des traitements déjà effectués."
          ],
          after: [
            "Pour toute autre demande (rectification qui ne serait pas possible directement dans l'interface, question sur un traitement précis), écrivez-nous.",
            "Vous avez également le droit d'introduire une réclamation auprès de la CNIL (www.cnil.fr) si vous estimez que le traitement de vos données ne respecte pas la réglementation."
          ]
        }
      ];

  return (
    <LegalDocPage
      eyebrow={isEn ? "Legal" : "Juridique"}
      title={isEn ? "Privacy Policy" : "Politique de Confidentialité"}
      updated={isEn ? `Last updated: ${PRIVACY_LAST_UPDATED.en}` : `Dernière mise à jour : ${PRIVACY_LAST_UPDATED.fr}`}
      sections={sections}
      closing={{
        body: isEn
          ? "Questions about how your data is handled, or about exercising your rights? Write to us, we typically reply within a few business days."
          : "Une question sur le traitement de vos données, ou sur l'exercice de vos droits ? Écrivez-nous, nous répondons en général sous quelques jours ouvrés."
      }}
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
      initialSectionIndex={focusCookies ? 6 : focusSecurity ? 5 : undefined}
    />
  );
}

function TermsOfServicePage({ language, setLanguage, onBack, onLoginClick, onSignupClick, onNavigateLegal, landingCopy }) {
  const isEn = language === "en";

  const sections = isEn
    ? [
        {
          heading: "What does agreeing to these terms mean?",
          paragraphs: [
            "These Terms of Service govern your use of Career CV. Creating an account, or simply using the platform, means you accept them. If any part of them is unacceptable to you, please don't use the service."
          ]
        },
        {
          heading: "What does the service do, and not do?",
          paragraphs: [
            "Career CV analyzes your CV against job offers, scores their compatibility, and can draft cover letters and negotiation guidance using AI.",
            "These outputs are assistance, not guarantees. AI-generated content can contain mistakes, and we make no promise that using Career CV will lead to an interview or a job offer. You are responsible for reviewing anything generated by the platform before you send it to a third party."
          ]
        },
        {
          heading: "What use is acceptable?",
          paragraphs: ["When using the platform, you agree not to:"],
          list: [
            "Send spam or harass anyone using information obtained through the service.",
            "Upload files containing malware or content that is illegal in your jurisdiction.",
            "Attempt to bypass rate limits, security controls, or access data that isn't yours.",
            "Share your login credentials with someone else or resell access to your account."
          ]
        },
        {
          heading: "How do tokens, plans and payments work?",
          paragraphs: [
            "Certain actions (generating a cover letter, starting a negotiation, running a CV analysis) consume tokens, granted according to your plan.",
            "New accounts receive a set of free tokens to try the service; they are personal to your account and are not transferable or exchangeable for cash.",
            "Paid plans are billed through Stripe, monthly or annually depending on what you select; current pricing is always visible on our pricing page before you subscribe.",
            "Schools and recruitment agencies may issue license codes to members of their organization; a code can be revoked by the issuing organization or by us if it is misused.",
            "Because subscription access is granted immediately on payment, charges are final once processed, except where the law gives you a right of withdrawal or in case of a proven fault on our part."
          ]
        },
        {
          heading: "Who owns what?",
          paragraphs: [
            "Your CV and personal data remain yours; using the platform only grants us a limited, temporary right to process them to deliver the analysis you ask for.",
            "In turn, the Career CV name, interface, source code, and matching logic belong to us. You may not copy, reverse-engineer, or redistribute them without our written permission."
          ]
        },
        {
          heading: "What is our liability?",
          paragraphs: [
            "The service is provided on an \"as available\" basis. To the extent permitted by law, we are not liable for indirect or consequential outcomes of using our results, for example, an unsuccessful interview or an approximation in an AI-generated document. Reviewing and validating generated content before you rely on it is your responsibility."
          ]
        },
        {
          heading: "What happens if an account is suspended or terms change?",
          paragraphs: [
            "We may suspend or close an account that breaches these terms. We may also update this page over time; the version published here is the one that applies, and we'll flag any change that materially affects your rights."
          ]
        },
        {
          heading: "Which law applies?",
          paragraphs: [
            "These terms are governed by French law, without prejudice to any mandatory consumer-protection rules of your place of residence. Disputes are handled by the courts with jurisdiction under applicable law."
          ]
        }
      ]
    : [
        {
          heading: "Que signifie accepter ces conditions ?",
          paragraphs: [
            "Ces Conditions Générales d'Utilisation régissent votre usage de Career CV. Créer un compte, ou simplement utiliser la plateforme, vaut acceptation. Si l'une de ces clauses ne vous convient pas, merci de ne pas utiliser le service."
          ]
        },
        {
          heading: "Que fait le service, et que ne fait-il pas ?",
          paragraphs: [
            "Career CV analyse votre CV au regard d'offres d'emploi, calcule un score de compatibilité, et peut rédiger des lettres de motivation et des conseils de négociation à l'aide de l'IA.",
            "Ces résultats sont une aide, pas une garantie. Un contenu généré par IA peut contenir des erreurs, et nous ne promettons pas que l'usage de Career CV mène à un entretien ou à une embauche. Il vous appartient de relire tout contenu généré avant de l'envoyer à un tiers."
          ]
        },
        {
          heading: "Quel usage est acceptable ?",
          paragraphs: ["En utilisant la plateforme, vous vous engagez à ne pas :"],
          list: [
            "Envoyer des messages non sollicités ou harceler quiconque à l'aide d'informations obtenues via le service.",
            "Téléverser des fichiers contenant un logiciel malveillant ou un contenu illégal dans votre juridiction.",
            "Tenter de contourner nos limites d'utilisation, nos contrôles de sécurité, ou accéder à des données qui ne sont pas les vôtres.",
            "Partager vos identifiants de connexion avec un tiers ou revendre l'accès à votre compte."
          ]
        },
        {
          heading: "Comment fonctionnent jetons, plans et paiements ?",
          paragraphs: [
            "Certaines actions (générer une lettre de motivation, démarrer une négociation, lancer une analyse de CV) consomment des jetons, accordés selon votre plan.",
            "Les nouveaux comptes reçoivent un lot de jetons gratuits pour tester le service ; ils sont personnels à votre compte et ne sont ni transférables ni échangeables contre de l'argent.",
            "Les plans payants sont facturés via Stripe, mensuellement ou annuellement selon votre choix ; le tarif en vigueur est toujours visible sur notre page tarifs avant toute souscription.",
            "Les écoles et cabinets de recrutement peuvent émettre des codes de licence pour les membres de leur organisation ; un code peut être révoqué par l'organisation émettrice ou par nous-mêmes en cas d'usage abusif.",
            "L'accès à l'abonnement étant accordé immédiatement après paiement, les sommes versées sont dues une fois le paiement validé, sauf disposition légale contraire vous ouvrant un droit de rétractation, ou en cas de faute avérée de notre part."
          ]
        },
        {
          heading: "À qui appartiennent les données et le service ?",
          paragraphs: [
            "Votre CV et vos données personnelles restent les vôtres ; l'usage de la plateforme nous accorde seulement un droit limité et temporaire de les traiter pour vous fournir l'analyse demandée.",
            "À l'inverse, le nom Career CV, son interface, son code source et sa logique de matching nous appartiennent. Vous ne pouvez ni les copier, ni les décompiler, ni les redistribuer sans notre autorisation écrite."
          ]
        },
        {
          heading: "Quelle est notre responsabilité ?",
          paragraphs: [
            "Le service est fourni « en l'état, selon disponibilité ». Dans la mesure permise par la loi, nous ne sommes pas responsables des conséquences indirectes de l'usage de nos résultats, par exemple un entretien manqué ou une approximation dans un document généré par IA. Il vous appartient de relire et de valider tout contenu généré avant de vous y fier."
          ]
        },
        {
          heading: "Que se passe-t-il en cas de suspension ou de modification ?",
          paragraphs: [
            "Nous pouvons suspendre ou clôturer un compte qui viole ces conditions. Nous pouvons également faire évoluer cette page dans le temps ; la version publiée ici fait foi, et nous signalerons tout changement affectant significativement vos droits."
          ]
        },
        {
          heading: "Quel droit s'applique ?",
          paragraphs: [
            "Ces conditions sont régies par le droit français, sans préjudice des règles impératives de protection des consommateurs de votre lieu de résidence. Les litiges relèvent des tribunaux compétents en application du droit applicable."
          ]
        }
      ];

  return (
    <LegalDocPage
      eyebrow={isEn ? "Legal" : "Juridique"}
      title={isEn ? "Terms of Service" : "Conditions Générales d'Utilisation"}
      updated={isEn ? `Last updated: ${PRIVACY_LAST_UPDATED.en}` : `Dernière mise à jour : ${PRIVACY_LAST_UPDATED.fr}`}
      sections={sections}
      closing={{
        body: isEn
          ? "Questions about these terms? Write to us, we typically reply within a few business days."
          : "Une question sur ces conditions ? Écrivez-nous, nous répondons en général sous quelques jours ouvrés."
      }}
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
    />
  );
}

export { LegalDocPage, PrivacyPolicyPage, TermsOfServicePage };
