import React from "react";
import { UiIcon } from "../../../components/UiIcon.jsx";

// Petit état vide illustré partagé par toutes les pages Cabinet — reprend
// le même habillage visuel que SchoolEmptyState (icône ronde + titre +
// message), pour remplacer les "Aucun … pour l'instant." en texte brut qui
// donnaient un rendu très basique aux listes vides.
export function CabinetEmptyState({ icon, title, hint }) {
  return (
    <div className="school-empty-state">
      <span className="school-empty-icon">
        <UiIcon name={icon} />
      </span>
      <strong>{title}</strong>
      {hint ? <p>{hint}</p> : null}
    </div>
  );
}
