import React from "react";
// Module Pages légales : confidentialité, CGU, mentions (structure commune
// LegalDocPage).
import { useState, useEffect } from "react";
import { UiIcon } from "../../components/UiIcon.jsx";
import { LanguageSwitch } from "../../components/LanguageSwitch.jsx";
import { ConnectedFooter } from "../../App.jsx";

const PRIVACY_CONTACT_EMAIL = "support@career-app.example";
const PRIVACY_LAST_UPDATED = { fr: "27 juillet 2026", en: "July 27, 2026" };

function slugify(text) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
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
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                  {section.list ? (
                    <ul className="legal-doc-list">
                      {section.list.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  ) : null}
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
            "This page explains what personal data Career CV collects when you use the platform, why we collect it, and the choices you have. It applies to every visitor and every registered account (candidates, schools, and recruitment agencies).",
            "By creating an account, you acknowledge that you have read this page."
          ]
        },
        {
          heading: "What data do we collect?",
          paragraphs: [
            "When you register, we ask for your first name, last name, email address, and a password, which we store using salted cryptographic hashing, never in plain text.",
            "When you use the CV analysis or matching tools, we process the content of the CVs you upload and the job offers you submit, purely to generate your results.",
            "We also automatically record basic technical data (IP address, browser, device) and account security events (logins, password changes), kept for fraud prevention and to let you review your own account activity."
          ]
        },
        {
          heading: "Why do we process it?",
          list: [
            "To run the CV/offer matching engine and produce your compatibility score and suggestions.",
            "To generate the cover letters and negotiation guidance you request.",
            "To keep your account secure and let you sign in.",
            "To send you account-related notifications, and, only if you have not opted out, occasional service announcements."
          ]
        },
        {
          heading: "Who else sees it?",
          paragraphs: [
            "We do not sell personal data, and we keep the list of parties who process it on our behalf as short as possible:"
          ],
          list: [
            "An AI inference provider, to analyze the text of your CV and the job offers you submit and generate matching results.",
            "Supabase, which hosts our application database.",
            "Stripe, which processes subscription payments, we never see or store your card details.",
            "Google, only if you actively choose to sign in with a Google account.",
            "Our email delivery provider, to send verification codes and, if enabled, announcements."
          ]
        },
        {
          heading: "How do we protect it?",
          list: [
            "All traffic between your browser and our servers is encrypted (HTTPS/TLS).",
            "Passwords are salted and hashed (PBKDF2, 140,000 iterations); they are never recoverable in plain text, by us or anyone else.",
            "An account locks temporarily after 5 failed login attempts, and you can reset it yourself by email if you forgot your password.",
            "You can view every device connected to your account and disconnect any of them individually from Account > Security.",
            "Access to production data is limited and logged."
          ]
        },
        {
          heading: "Do we use cookies?",
          paragraphs: [
            "We use a strictly necessary cookie to keep you signed in. We do not run third-party advertising or cross-site tracking cookies."
          ]
        },
        {
          heading: "What are your rights?",
          paragraphs: ["You are always in control of your data, directly from Account > Security:"],
          list: [
            "Download all your personal data (\"Download my data\" button, full JSON export or a printable readable PDF summary).",
            "Correct inaccurate information from your profile.",
            "View and disconnect each device connected to your account individually.",
            "Permanently delete your account and the data attached to it.",
            "For anything else (a correction not possible directly in the app, a specific question), write to us."
          ]
        }
      ]
    : [
        {
          heading: "Que couvre cette politique ?",
          paragraphs: [
            "Cette page explique quelles données personnelles Career CV collecte lorsque vous utilisez la plateforme, pourquoi nous les collectons, et les choix qui sont les vôtres. Elle s'applique à tout visiteur et à tout titulaire de compte (candidats, écoles et cabinets de recrutement).",
            "En créant un compte, vous reconnaissez avoir pris connaissance de cette page."
          ]
        },
        {
          heading: "Quelles données collectons-nous ?",
          paragraphs: [
            "À l'inscription, nous demandons votre prénom, votre nom, votre adresse email et un mot de passe, que nous stockons via un hachage cryptographique salé, jamais en clair.",
            "Lorsque vous utilisez les outils d'analyse de CV ou de matching, nous traitons le contenu des CV que vous téléchargez et des offres que vous soumettez, uniquement pour produire vos résultats.",
            "Nous enregistrons également des données techniques basiques (adresse IP, navigateur, appareil) et des événements de sécurité du compte (connexions, changements de mot de passe), conservés pour prévenir la fraude et vous permettre de consulter l'activité de votre propre compte."
          ]
        },
        {
          heading: "Pourquoi les traitons-nous ?",
          list: [
            "Pour faire fonctionner le moteur de matching CV/offre et produire votre score de compatibilité et nos suggestions.",
            "Pour générer les lettres de motivation et conseils de négociation que vous demandez.",
            "Pour sécuriser votre compte et permettre votre connexion.",
            "Pour vous envoyer des notifications liées à votre compte et, seulement si vous n'avez pas refusé, d'occasionnelles annonces de service."
          ]
        },
        {
          heading: "Qui y a accès ?",
          paragraphs: [
            "Nous ne vendons jamais de données personnelles, et nous limitons volontairement le nombre de partenaires qui les traitent pour notre compte :"
          ],
          list: [
            "Un fournisseur d'inférence IA, pour analyser le texte de votre CV et des offres soumises et générer les résultats de matching.",
            "Supabase, qui héberge notre base de données applicative.",
            "Stripe, qui traite les paiements d'abonnement, nous ne voyons ni ne stockons jamais vos données bancaires.",
            "Google, uniquement si vous choisissez activement de vous connecter avec un compte Google.",
            "Notre prestataire d'envoi d'emails, pour les codes de vérification et, si activées, les annonces."
          ]
        },
        {
          heading: "Comment protégeons-nous vos données ?",
          list: [
            "Tout le trafic entre votre navigateur et nos serveurs est chiffré (HTTPS/TLS).",
            "Les mots de passe sont salés et hachés (PBKDF2, 140 000 itérations) ; ils ne sont récupérables en clair par personne, y compris nous.",
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
          heading: "Quels sont vos droits ?",
          paragraphs: ["Vous gardez le contrôle de vos données, directement depuis Compte > Sécurité :"],
          list: [
            "Télécharger toutes vos données personnelles (bouton « Télécharger mes données », format JSON complet ou résumé lisible imprimable en PDF).",
            "Corriger une information inexacte depuis votre profil.",
            "Consulter et déconnecter individuellement chacun des appareils connectés à votre compte.",
            "Supprimer définitivement votre compte et les données qui y sont attachées.",
            "Pour toute autre demande (rectification qui ne serait pas possible directement dans l'interface, question sur un traitement précis), écrivez-nous."
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
      initialSectionIndex={focusCookies ? 5 : focusSecurity ? 4 : undefined}
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
