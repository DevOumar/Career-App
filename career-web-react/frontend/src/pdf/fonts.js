// Enregistrement des polices pour l'export PDF (@react-pdf/renderer).
//
// IMPORTANT — Cabinet Grotesk n'est PAS une police Google Fonts, contrairement
// à ce que l'@import de styles.css laisse penser (family=Cabinet+Grotesk sur
// fonts.googleapis.com). Vérifié en direct : une requête sur l'API Google
// Fonts pour "Cabinet Grotesk" renvoie 400 "Missing font family". C'est en
// réalité une police Fontshare (https://www.fontshare.com/fonts/cabinet-grotesk),
// distribuée depuis cdn.fontshare.com. Ça veut dire que l'@import CSS actuel
// de l'app ne charge jamais réellement Cabinet Grotesk dans le navigateur —
// tous les titres/boutons retombent silencieusement sur la police système de
// secours (sans-serif) depuis la Phase 2. À signaler séparément, corrigé ici
// uniquement pour le pipeline PDF.
//
// new URL(..., import.meta.url) plutôt qu'un import statique du fichier :
// fonctionne à la fois bundlé par Vite (transformé en URL d'asset hashée,
// pattern officiellement documenté par Vite) et exécuté tel quel par Node
// (résout en une vraie URL file:// vers le .ttf sur disque) — nécessaire
// pour pouvoir valider ce module par un script Node autonome, sans passer
// par tout le pipeline de build de l'app.
import { Font } from "@react-pdf/renderer";

const cabinetGroteskBold = new URL("./fonts/CabinetGrotesk-Bold.ttf", import.meta.url).href;
const cabinetGroteskBlack = new URL("./fonts/CabinetGrotesk-Black.ttf", import.meta.url).href;
const instrumentSansRegular = new URL("./fonts/InstrumentSans-Regular.ttf", import.meta.url).href;
const instrumentSansMedium = new URL("./fonts/InstrumentSans-Medium.ttf", import.meta.url).href;
const instrumentSansBold = new URL("./fonts/InstrumentSans-Bold.ttf", import.meta.url).href;

Font.register({
  family: "Cabinet Grotesk",
  fonts: [
    { src: cabinetGroteskBold, fontWeight: 700 },
    { src: cabinetGroteskBlack, fontWeight: 900 }
  ]
});

Font.register({
  family: "Instrument Sans",
  fonts: [
    { src: instrumentSansRegular, fontWeight: 400 },
    { src: instrumentSansMedium, fontWeight: 500 },
    // Poids 700 nécessaire : .cv-document-contact a (lien LinkedIn) est en
    // font-weight:700 dans styles.css sans changer de famille — sans ce
    // fichier, react-pdf n'a pas de synthèse gras (contrairement au
    // navigateur) et retombe sur le poids 500 le plus proche disponible.
    { src: instrumentSansBold, fontWeight: 700 }
  ]
});
