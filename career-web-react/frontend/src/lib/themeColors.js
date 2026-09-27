import { THEME_PRESETS } from "../App.jsx";

// Reprend les 3 champs de couleur déjà utilisés par cvTemplateThemes.js
// (theme.colors : primary/primaryInk/bgAccent) à partir d'un id THEME_PRESETS
// (App.jsx) — même palette que le thème global de l'app, --primary-2 ignoré
// (pas utilisé par les templates PDF). Retombe sur Corail ("orange") si
// l'id ne correspond à aucun preset connu.
//
// Extrait de CvPages.jsx (s'appelait cvThemeColorsFromPresetId) pour être
// réutilisé tel quel par CoverLetterPage.jsx (sélecteur couleur de la
// lettre, Étape C) — même mécanique, pas de duplication.
export function themeColorsFromPresetId(presetId) {
  const preset = THEME_PRESETS.find((item) => item.id === presetId) || THEME_PRESETS.find((item) => item.id === "orange");
  return {
    primary: preset.vars["--primary"],
    primaryInk: preset.vars["--primary-ink"],
    bgAccent: preset.vars["--bg-accent"]
  };
}
