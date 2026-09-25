// Centre d'aide de l'espace École (même format que adminHelpArticles.js).
// RÈGLE ÉDITORIALE : ne décrire que ce que l'espace École fait réellement.
// Les articles de sécurité du compte sont communs à tous les espaces.
import { ADMIN_HELP_ARTICLES } from "../admin/adminHelpArticles.js";

export const SCHOOL_HELP_CATEGORIES = [
  { id: "start", label: { fr: "Démarrage", en: "Getting started" }, description: { fr: "Prendre en main l'espace École.", en: "Get to know the School space." } },
  { id: "students", label: { fr: "Étudiants", en: "Students" }, description: { fr: "Inviter, organiser et suivre les étudiants.", en: "Invite, organize and follow students." } },
  { id: "tracking", label: { fr: "Suivi & rapports", en: "Tracking & reports" }, description: { fr: "Employabilité, comparaisons et rapports.", en: "Employability, comparisons and reports." } },
  { id: "communication", label: { fr: "Communication", en: "Communication" }, description: { fr: "Annonces et événements.", en: "Announcements and events." } },
  { id: "subscription", label: { fr: "Licence & abonnement", en: "License & subscription" }, description: { fr: "Sièges, codes de licence, facturation.", en: "Seats, license codes, billing." } },
  { id: "account-security", label: { fr: "Sécurité du compte", en: "Account security" }, description: { fr: "Connexion, double authentification, clés de sécurité et appareils.", en: "Sign-in, two-factor authentication, security keys and devices." } }
];

const SCHOOL_ARTICLES = [
  {
    id: "school-first-steps",
    categoryId: "start",
    title: { fr: "Premiers pas dans l'espace École", en: "First steps in the School space" },
    summary: { fr: "L'organisation des menus et de l'accueil.", en: "How the menus and home page are organized." },
    body: {
      fr: [
        "Le menu latéral regroupe les modules : Étudiants (étudiants, promotions, comparaison), Communication (invitations, annonces & événements), Suivi (suivi & employabilité, rapports) et Abonnement (licence, facturation, tarifs). Les paramètres de l'établissement sont en bas du menu.",
        "L'Accueil présente les indicateurs en temps réel : étudiants associés, sièges utilisés, taux d'activation, CV importés, analyses réalisées, score moyen et alertes.",
        "La barre du haut permet de rechercher un étudiant ou un module (Ctrl K), de consulter les notifications et de changer de langue."
      ],
      en: [
        "The side menu groups modules: Students (students, promotions, comparison), Communication (invitations, announcements & events), Tracking (tracking & employability, reports) and Subscription (license, billing, pricing). Institution settings sit at the bottom of the menu.",
        "Home shows real-time indicators: linked students, seats used, activation rate, imported CVs, analyses run, average score and alerts.",
        "The top bar lets you search for a student or a module (Ctrl K), read notifications and switch language."
      ]
    }
  },
  {
    id: "school-notifications",
    categoryId: "start",
    title: { fr: "Notifications et alertes", en: "Notifications and alerts" },
    summary: { fr: "Ce que signale la cloche.", en: "What the bell reports." },
    body: {
      fr: [
        "La cloche réunit les notifications de votre établissement et les alertes calculées en direct à partir de l'activité de vos étudiants (par exemple une licence presque pleine ou des scores de matching faibles).",
        "Une notification non lue est marquée d'un point ; « Tout marquer comme lu » les traite toutes. « Voir toutes les notifications » ouvre la liste complète."
      ],
      en: [
        "The bell gathers your institution's notifications and alerts computed live from your students' activity (for instance a nearly full license or low match scores).",
        "An unread notification shows a dot; “Mark all as read” handles them all. “View all notifications” opens the full list."
      ]
    },
    caveat: {
      fr: "Les alertes calculées reviennent tant que la situation qu'elles signalent n'est pas résolue.",
      en: "Computed alerts come back as long as the situation they report isn't resolved."
    }
  },
  {
    id: "school-invite",
    categoryId: "students",
    title: { fr: "Inviter des étudiants", en: "Invite students" },
    summary: { fr: "Un par un ou en masse (CSV).", en: "One by one or in bulk (CSV)." },
    body: {
      fr: [
        "Dans Invitations, saisissez l'e-mail d'un étudiant : il reçoit une invitation et un siège de votre licence lui est réservé automatiquement.",
        "Pour inviter une classe entière, utilisez « Import en masse (CSV) » : un e-mail par ligne, ou un fichier CSV avec une colonne email, jusqu'à 500 adresses d'un coup. Un résultat récapitule les invitations envoyées."
      ],
      en: [
        "In Invitations, enter a student's email: they receive an invitation and a seat on your license is reserved automatically.",
        "To invite a whole class, use “Bulk import (CSV)”: one email per line, or a CSV file with an email column, up to 500 addresses at once. A summary lists the invitations sent."
      ]
    }
  },
  {
    id: "school-students",
    categoryId: "students",
    title: { fr: "Suivre et retirer un étudiant", en: "Follow and remove a student" },
    summary: { fr: "Liste des étudiants rattachés à votre licence.", en: "List of students linked to your license." },
    body: {
      fr: [
        "Le module Étudiants liste les étudiants rattachés à votre licence avec leur activité : dernier score, dernière activité, comptes actifs.",
        "« Retirer cet étudiant » libère un siège sur votre licence : l'étudiant repasse au plan gratuit et conserve ses données."
      ],
      en: [
        "The Students module lists students linked to your license with their activity: latest score, last activity, active accounts.",
        "“Remove this student” frees a seat on your license: the student switches back to the free plan and keeps their data."
      ]
    }
  },
  {
    id: "school-promotions",
    categoryId: "students",
    title: { fr: "Organiser les promotions", en: "Organize promotions" },
    summary: { fr: "Par programme, campus et année académique.", en: "By program, campus and academic year." },
    body: {
      fr: [
        "Dans Promotions, créez une promotion (nom d'au moins 2 caractères, niveau, année académique au format AAAA-AAAA, ex. 2025-2026), puis affectez-y vos étudiants.",
        "« Comparer les promotions » affiche leurs indicateurs clés côte à côte pour repérer celle qui a besoin d'attention."
      ],
      en: [
        "In Promotions, create a promotion (name of at least 2 characters, level, academic year in YYYY-YYYY format, e.g. 2025-2026), then assign your students to it.",
        "“Compare promotions” shows their key indicators side by side to spot the one that needs attention."
      ]
    }
  },
  {
    id: "school-insights",
    categoryId: "tracking",
    title: { fr: "Suivi & employabilité", en: "Tracking & employability" },
    summary: { fr: "La performance de matching de vos étudiants.", en: "Your students' match performance." },
    body: {
      fr: [
        "Ce module agrège les résultats de matching CV / offre de vos étudiants : répartition des scores, classement des étudiants du meilleur au moins bon score, et mots-clés manquants les plus fréquents.",
        "Vous pouvez filtrer par promotion. Les graphiques se remplissent dès que vos étudiants lancent leurs premières analyses."
      ],
      en: [
        "This module aggregates your students' CV / job match results: score distribution, student ranking from best to lowest score, and most common missing keywords.",
        "You can filter by promotion. Charts fill in as soon as your students run their first analyses."
      ]
    }
  },
  {
    id: "school-reports",
    categoryId: "tracking",
    title: { fr: "Générer un rapport d'employabilité", en: "Generate an employability report" },
    summary: { fr: "Rapports hebdomadaires ou mensuels.", en: "Weekly or monthly reports." },
    body: {
      fr: [
        "Dans Rapports, générez un rapport hebdomadaire ou mensuel, pour toute l'école ou une promotion. Il résume l'activité et l'employabilité (score moyen, scores faibles…) pour la direction et les équipes pédagogiques.",
        "Les rapports générés restent listés dans le module pour être consultés à nouveau."
      ],
      en: [
        "In Reports, generate a weekly or monthly report, for the whole school or one promotion. It summarizes activity and employability (average score, low scores…) for management and teaching teams.",
        "Generated reports stay listed in the module so you can open them again."
      ]
    }
  },
  {
    id: "school-announcements",
    categoryId: "communication",
    title: { fr: "Envoyer une annonce", en: "Send an announcement" },
    summary: { fr: "Un e-mail à tous vos étudiants ou à une promotion.", en: "An email to all your students or one promotion." },
    body: {
      fr: [
        "Dans « Annonces & événements », onglet Annonces, « Nouvelle annonce » envoie un e-mail à tous vos étudiants, ou seulement à ceux d'une promotion. Chaque annonce envoyée indique ses destinataires, les e-mails délivrés et les échecs.",
        "Depuis l'Accueil, les boutons « Relancer » envoient aussi une annonce ciblée à un segment (étudiants inactifs, sans CV ou avec un score faible)."
      ],
      en: [
        "In “Announcements & events”, Announcements tab, “New announcement” emails all your students, or only those in one promotion. Each sent announcement shows its recipients, delivered emails and failures.",
        "From Home, the “Follow up” buttons also send a targeted announcement to a segment (inactive students, without a CV or with a low score)."
      ]
    }
  },
  {
    id: "school-events",
    categoryId: "communication",
    title: { fr: "Publier un événement", en: "Publish an event" },
    summary: { fr: "Forums emploi, dates limites, ateliers.", en: "Job fairs, deadlines, workshops." },
    body: {
      fr: [
        "Dans « Annonces & événements », onglet Événements, « Nouvel événement » ajoute une date clé (titre, date, description) : forum emploi, date limite de candidature, atelier. Les événements à venir s'affichent avec un compte à rebours.",
        "« Annoncer par e-mail » prépare une annonce déjà rédigée à partir de l'événement, à relire puis envoyer."
      ],
      en: [
        "In “Announcements & events”, Events tab, “New event” adds a key date (title, date, description): job fair, application deadline, workshop. Upcoming events show a countdown.",
        "“Announce by email” prepares an announcement drafted from the event, to review and send."
      ]
    }
  },
  {
    id: "school-license",
    categoryId: "subscription",
    title: { fr: "Licence et sièges", en: "License and seats" },
    summary: { fr: "Codes de licence et places disponibles.", en: "License codes and available seats." },
    body: {
      fr: [
        "« Ma licence » affiche les sièges accordés par Career CV à votre établissement, le nombre de sièges utilisés et restants, et vos codes de licence (masqués par défaut, avec « Afficher le code » et « Copier le code »).",
        "Un étudiant qui utilise votre code est rattaché à votre établissement et occupe un siège. « Facturation » retrace les paiements de la licence, et « Tarifs » présente les offres disponibles pour les écoles."
      ],
      en: [
        "“My license” shows the seats granted by Career CV to your institution, seats used and remaining, and your license codes (hidden by default, with “Show code” and “Copy code”).",
        "A student who uses your code is linked to your institution and takes a seat. “Billing” lists the license payments, and “Pricing” shows the plans available to schools."
      ]
    },
    caveat: {
      fr: "Sans code de licence, contactez Career CV pour obtenir une licence pour votre établissement.",
      en: "Without a license code, contact Career CV to get a license for your institution."
    }
  },
  {
    id: "school-settings",
    categoryId: "subscription",
    title: { fr: "Paramètres de l'établissement", en: "Institution settings" },
    summary: { fr: "L'identité de l'établissement, distincte de votre compte.", en: "The institution's identity, separate from your account." },
    body: {
      fr: [
        "Les paramètres de l'établissement (nom officiel, sigle, domaine e-mail, e-mail et téléphone de contact, contact principal, notes internes) sont gérés séparément de votre compte administrateur.",
        "Votre compte personnel (photo, mot de passe, double authentification) se gère depuis « Mon profil », dans le menu en haut à droite."
      ],
      en: [
        "Institution settings (official name, acronym, email domain, contact email and phone, primary contact, internal notes) are managed separately from your administrator account.",
        "Your personal account (photo, password, two-factor authentication) is managed from “My profile”, in the top-right menu."
      ]
    }
  }
];

// Articles de sécurité du compte, communs à tous les espaces.
const SECURITY_ARTICLES = ADMIN_HELP_ARTICLES.filter((article) => article.categoryId === "account-security");

export const SCHOOL_HELP_ARTICLES = [...SCHOOL_ARTICLES, ...SECURITY_ARTICLES];
