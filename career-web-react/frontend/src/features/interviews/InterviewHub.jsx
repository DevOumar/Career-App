import React, { useEffect, useState } from "react";
// Page « Entretiens » : un seul espace pour préparer l'entretien complet.
//  - Entretien : simulation RH / technique / direction, en chat ou en vocal ;
//  - Test technique : exercice de code généré puis corrigé par l'IA.
import { UiIcon } from "../../components/UiIcon.jsx";
import { ModuleHero, InterviewHeroArt } from "../../components/ModuleWorkspace.jsx";
import InterviewPage from "./InterviewPage.jsx";
import { CodingPage } from "../coding/CodingPage.jsx";

const TABS = [
  {
    id: "interview",
    icon: "chat",
    label: { fr: "Entretien", en: "Interview" },
    hint: { fr: "Chat ou appel vocal", en: "Chat or voice call" }
  },
  {
    id: "technical",
    icon: "code",
    label: { fr: "Test technique", en: "Technical test" },
    hint: { fr: "Exercice de code corrigé", en: "Reviewed coding exercise" }
  }
];

export default function InterviewHub({ language = "fr", initialTab = "interview", user, subscription, onGoToTarifs, userId, avatarDataUrl, analyzedOffer }) {
  const [tab, setTab] = useState(initialTab);
  const en = language === "en";

  useEffect(() => {
    setTab(initialTab);
  }, [initialTab]);

  return (
    <section className="iv-hub">
      <ModuleHero
        eyebrow={en ? "AI module · Interviews" : "Module IA · Entretiens"}
        title={en ? "Prepare your interviews" : "Préparez vos entretiens"}
        subtitle={
          en
            ? "Practise the whole interview: the conversation with the recruiter, then the technical test. Every session ends with detailed feedback."
            : "Entraînez-vous sur tout l'entretien : l'échange avec le recruteur, puis le test technique. Chaque session se termine par un retour détaillé."
        }
        art={<InterviewHeroArt />}
        chips={[
          { icon: "chat", label: en ? "RH, technical or leadership" : "RH, technique ou direction" },
          { icon: "phone", label: en ? "Written or voice" : "Écrit ou vocal" },
          { icon: "code", label: en ? "Python, JS, SQL and more" : "Python, JS, SQL et plus" }
        ]}
      />

      <div className="iv-tabs" role="tablist">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={tab === item.id}
            className={`iv-tab ${tab === item.id ? "is-active" : ""}`}
            onClick={() => setTab(item.id)}
          >
            <span className="iv-tab-icon">
              <UiIcon name={item.icon} />
            </span>
            <span className="iv-tab-text">
              <strong>{item.label[en ? "en" : "fr"]}</strong>
              <small>{item.hint[en ? "en" : "fr"]}</small>
            </span>
          </button>
        ))}
      </div>

      {tab === "technical" ? (
        <CodingPage language={language} user={user} embedded />
      ) : (
        <InterviewPage
          language={language}
          subscription={subscription}
          onGoToTarifs={onGoToTarifs}
          userId={userId}
          avatarDataUrl={avatarDataUrl}
          analyzedOffer={analyzedOffer}
        />
      )}
    </section>
  );
}
