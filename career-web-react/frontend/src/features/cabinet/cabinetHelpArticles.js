// Centre d'aide de l'espace Cabinet (même format que adminHelpArticles.js).
// RÈGLE ÉDITORIALE : ne décrire que ce que l'espace Cabinet fait réellement.
// Les articles de sécurité du compte sont communs à tous les espaces.
import { ADMIN_HELP_ARTICLES } from "../admin/adminHelpArticles.js";

export const CABINET_HELP_CATEGORIES = [
  { id: "start", label: { fr: "Démarrage", en: "Getting started" }, description: { fr: "Prendre en main l'espace Cabinet.", en: "Get to know the Firm space." } },
  { id: "pipeline", label: { fr: "Recrutement", en: "Recruitment" }, description: { fr: "Vivier, missions, comparaison et rapports.", en: "Pool, missions, comparison and reports." } },
  { id: "business", label: { fr: "Clients & factures", en: "Clients & invoices" }, description: { fr: "Fiches clients et factures d'honoraires.", en: "Client records and fee invoices." } },
  { id: "rgpd", label: { fr: "RGPD", en: "GDPR" }, description: { fr: "Consentement, conservation et droits des candidats.", en: "Consent, retention and candidates' rights." } },
  { id: "team", label: { fr: "Équipe", en: "Team" }, description: { fr: "Recruteurs, invitations, annonces et journal d'activité.", en: "Recruiters, invitations, announcements and activity log." } },
  { id: "subscription", label: { fr: "Licence & abonnement", en: "License & subscription" }, description: { fr: "Sièges, code de licence, facturation.", en: "Seats, license code, billing." } },
  { id: "account-security", label: { fr: "Sécurité du compte", en: "Account security" }, description: { fr: "Connexion, double authentification, clés de sécurité et appareils.", en: "Sign-in, two-factor authentication, security keys and devices." } }
];

const CABINET_ARTICLES = [
  {
    id: "cabinet-first-steps",
    categoryId: "start",
    title: { fr: "Premiers pas dans l'espace Cabinet", en: "First steps in the Firm space" },
    summary: { fr: "L'organisation des menus et de l'accueil.", en: "How the menus and home page are organized." },
    body: {
      fr: [
        "Le menu latéral regroupe les modules : Recrutement (vivier de candidats, missions, entretiens, comparaison, rapports), Clients (fiches clients, factures), Équipe (recruteurs, invitations, annonces, journal d'activité) et Abonnement (licence, facturation, tarifs). Les paramètres du cabinet, dont le RGPD, sont en bas du menu.",
        "L'Accueil présente les indicateurs en temps réel : candidats en vivier, missions ouvertes, candidats placés, chiffre d'affaires généré, pipeline par étape et performance de l'équipe.",
        "La barre du haut permet de rechercher un candidat ou un module (Ctrl K), d'ajouter un candidat, de consulter les notifications et de changer de langue."
      ],
      en: [
        "The side menu groups modules: Recruitment (candidate pool, missions, interviews, comparison, reports), Clients (client records, invoices), Team (recruiters, invitations, announcements, activity log) and Subscription (license, billing, pricing). Firm settings, including GDPR, sit at the bottom of the menu.",
        "Home shows real-time indicators: candidates in the pool, open missions, candidates placed, revenue generated, pipeline by stage and team performance.",
        "The top bar lets you search for a candidate or a module (Ctrl K), add a candidate, read notifications and switch language."
      ]
    }
  },
  {
    id: "cabinet-notifications",
    categoryId: "start",
    title: { fr: "Notifications et alertes", en: "Notifications and alerts" },
    summary: { fr: "Ce que signale la cloche.", en: "What the bell reports." },
    body: {
      fr: [
        "La cloche signale les nouveaux recruteurs ayant rejoint le cabinet, les missions ouvertes depuis plus de 3 jours sans candidat, les rappels de relance arrivés à échéance et une licence presque pleine.",
        "Une notification non lue est marquée d'un point ; un clic ouvre le module concerné. « Tout marquer comme lu » les traite toutes."
      ],
      en: [
        "The bell reports recruiters who joined the firm, missions open for more than 3 days without candidates, due follow-up reminders and a nearly full license.",
        "An unread notification shows a dot; clicking it opens the related module. “Mark all as read” handles them all."
      ]
    },
    caveat: {
      fr: "Les alertes calculées reviennent tant que la situation qu'elles signalent n'est pas résolue.",
      en: "Computed alerts come back as long as the situation they report isn't resolved."
    }
  },
  {
    id: "cabinet-candidates",
    categoryId: "pipeline",
    title: { fr: "Gérer le vivier de candidats", en: "Manage the candidate pool" },
    summary: { fr: "Ajout, import de CV par IA, étapes et relances.", en: "Adding, AI CV import, stages and follow-ups." },
    body: {
      fr: [
        "« Ajouter un candidat » ouvre une fiche à remplir à la main, ou à préremplir en important un CV (PDF, DOCX ou TXT) lu par l'IA : nom, coordonnées, poste visé et compétences.",
        "Chaque candidat avance par étapes : Sourcé, Contacté, En entretien, Placé ou Écarté. L'étape se change directement dans la liste ou dans la fiche.",
        "Un rappel de relance peut être daté : il remonte dans les notifications et le filtre « Relance à faire » le jour venu. La fiche garde un historique de notes (appels, retours client).",
        "Si l'e-mail ou le téléphone existe déjà dans le vivier, un doublon possible vous est signalé avant l'ajout."
      ],
      en: [
        "“Add a candidate” opens a form to fill in by hand, or to prefill by importing a CV (PDF, DOCX or TXT) read by AI: name, contact details, target role and skills.",
        "Each candidate moves through stages: Sourced, Contacted, Interviewing, Placed or Rejected. Change the stage straight from the list or the profile.",
        "A follow-up reminder can be dated: it shows up in notifications and the “Follow-up due” filter on the day. The profile keeps a notes history (calls, client feedback).",
        "If the email or phone already exists in the pool, a possible duplicate is flagged before adding."
      ]
    },
    caveat: {
      fr: "Le vivier est partagé : tous les recruteurs du cabinet voient et modifient les mêmes candidats.",
      en: "The pool is shared: every recruiter in the firm sees and edits the same candidates."
    }
  },
  {
    id: "cabinet-missions",
    categoryId: "pipeline",
    title: { fr: "Missions et pipeline", en: "Missions and pipeline" },
    summary: { fr: "Créer une mission, affecter des candidats, facturer.", en: "Create a mission, assign candidates, bill." },
    body: {
      fr: [
        "Une mission est un poste client à pourvoir (titre, client, localisation). Elle est Ouverte, En cours ou Clôturée.",
        "Dans la fiche d'une mission, affectez des candidats du vivier et faites avancer chacun dans le pipeline de la mission.",
        "Les honoraires convenus avec le client s'enregistrent dans la fiche de la mission ; ils deviennent du chiffre d'affaires une fois facturés depuis « Factures clients ».",
        "« Dupliquer » crée une nouvelle mission ouverte avec le même poste, sans candidats ni montant."
      ],
      en: [
        "A mission is a client position to fill (title, client, location). It is Open, In progress or Closed.",
        "In a mission's panel, assign candidates from the pool and move each one through the mission's pipeline.",
        "Fees agreed with the client are saved on the mission; they become revenue once invoiced from “Client invoices”.",
        "“Duplicate” creates a new open mission with the same position, without candidates or amount."
      ]
    }
  },
  {
    id: "cabinet-reports",
    categoryId: "pipeline",
    title: { fr: "Comparer les missions et générer une shortlist", en: "Compare missions and build a shortlist" },
    summary: { fr: "Repérer la mission qui décroche, envoyer un rapport au client.", en: "Spot the lagging mission, send a report to the client." },
    body: {
      fr: [
        "« Comparer les missions » met côte à côte les indicateurs de vos missions (candidats, entretiens, placements, écartés) pour repérer celle qui a besoin d'attention.",
        "« Rapports » génère une shortlist figée pour une mission : la liste des candidats affectés avec leur étape et leur score de correspondance. Le rapport s'ouvre en aperçu et s'imprime en PDF pour être envoyé au client."
      ],
      en: [
        "“Compare missions” lines up your missions' indicators (candidates, interviews, placements, rejections) to spot the one that needs attention.",
        "“Reports” builds a frozen shortlist for a mission: the assigned candidates with their stage. The report opens as a preview and prints to PDF to send to the client."
      ]
    }
  },
  {
    id: "cabinet-team",
    categoryId: "team",
    title: { fr: "Inviter et gérer les recruteurs", en: "Invite and manage recruiters" },
    summary: { fr: "Invitations, sièges et retrait.", en: "Invitations, seats and removal." },
    body: {
      fr: [
        "Le titulaire du cabinet invite des recruteurs par e-mail, un par un ou en masse (liste ou fichier CSV). Chaque invitation réserve un siège de la licence.",
        "Le recruteur invité crée son compte « Recruteur interne » et saisit le code reçu : il rejoint alors le cabinet et partage le vivier et les missions.",
        "Retirer un recruteur libère son siège. Les invitations, la licence et la facturation restent réservées au titulaire."
      ],
      en: [
        "The firm owner invites recruiters by email, one by one or in bulk (list or CSV file). Each invitation reserves a license seat.",
        "The invited recruiter creates an “Internal recruiter” account and enters the code received: they join the firm and share the pool and missions.",
        "Removing a recruiter frees their seat. Invitations, license and billing stay reserved to the owner."
      ]
    }
  },
  {
    id: "cabinet-announcements",
    categoryId: "team",
    title: { fr: "Annonces à l'équipe", en: "Team announcements" },
    summary: { fr: "Un e-mail à tous les recruteurs, avec des modèles.", en: "An email to every recruiter, with templates." },
    body: {
      fr: [
        "Une annonce est envoyée par e-mail à tous les recruteurs rattachés à la licence. L'historique indique le nombre de destinataires et les éventuels échecs d'envoi.",
        "Enregistrez vos formulations habituelles comme modèles pour les réutiliser en un clic. Les relances de l'Accueil passent aussi par ce canal."
      ],
      en: [
        "An announcement is emailed to every recruiter linked to the license. The history shows the number of recipients and any failed sends.",
        "Save your usual wording as templates to reuse in one click. Home follow-ups also go through this channel."
      ]
    }
  },
  {
    id: "cabinet-license",
    categoryId: "subscription",
    title: { fr: "Licence, sièges et facturation", en: "License, seats and billing" },
    summary: { fr: "Suivre les sièges, partager le code, retrouver les paiements.", en: "Track seats, share the code, find payments." },
    body: {
      fr: [
        "« Ma licence » affiche l'offre, le code à partager (masqué par défaut, avec copie en un clic) et la jauge des sièges utilisés.",
        "« Facturation » liste les paiements de la licence avec leur statut, exportables en Excel, CSV ou PDF. « Tarifs » présente les offres Cabinet et votre offre actuelle."
      ],
      en: [
        "“My license” shows the plan, the code to share (hidden by default, one-click copy) and the seats gauge.",
        "“Billing” lists license payments with their status, exportable to Excel, CSV or PDF. “Pricing” shows the Firm plans and your current plan."
      ]
    }
  },
  {
    id: "cabinet-settings",
    categoryId: "start",
    title: { fr: "Paramètres et page publique", en: "Settings and public page" },
    summary: { fr: "Identité du cabinet et page de recrutement.", en: "Firm identity and recruitment page." },
    body: {
      fr: [
        "Les paramètres du cabinet (nom, logo, coordonnées, description) sont affichés à vos recruteurs invités. Seul le titulaire peut les modifier.",
        "La page publique de recrutement, si vous l'activez, liste vos missions ouvertes sans connexion ; son lien est à partager avec des candidats."
      ],
      en: [
        "Firm settings (name, logo, contact details, description) are shown to your invited recruiters. Only the owner can edit them.",
        "The public recruitment page, once enabled, lists your open missions without sign-in; share its link with candidates."
      ]
    }
  },
  {
    id: "cabinet-matching",
    categoryId: "pipeline",
    title: { fr: "Trouver les meilleurs candidats pour une mission", en: "Find the best candidates for a mission" },
    summary: { fr: "Score de correspondance et analyse IA.", en: "Match score and AI analysis." },
    body: {
      fr: [
        "Dans la fiche d'une mission, la section « Meilleurs candidats du vivier » classe vos candidats selon un score de correspondance sur 100 : compétences requises couvertes (70 points), expérience par rapport au minimum demandé (20 points) et proximité avec le poste visé (10 points).",
        "Les compétences du candidat sont celles de sa fiche et celles détectées dans son CV importé. Pour chaque candidat, les compétences présentes et manquantes sont affichées.",
        "« Analyse IA » compare en profondeur le profil du candidat à la fiche de poste : score, points forts, compétences manquantes, adéquation et points à vérifier en entretien."
      ],
      en: [
        "In a mission's panel, “Best candidates in the pool” ranks your candidates with a match score out of 100: required skills covered (70 points), experience versus the minimum required (20 points) and closeness to the target role (10 points).",
        "A candidate's skills are those on their profile plus those detected in their imported CV. Present and missing skills are shown for each candidate.",
        "“AI analysis” compares the candidate's profile to the job sheet in depth: score, strengths, missing skills, fit and points to check in the interview."
      ]
    },
    caveat: {
      fr: "Renseignez les compétences requises (ou une description) sur la mission : sans elles, aucun classement n'est possible.",
      en: "Fill in the required skills (or a description) on the mission: without them, no ranking is possible."
    }
  },
  {
    id: "cabinet-pipeline-board",
    categoryId: "pipeline",
    title: { fr: "La vue pipeline du vivier", en: "The pool pipeline view" },
    summary: { fr: "Glisser-déposer les candidats d'une étape à l'autre.", en: "Drag and drop candidates between stages." },
    body: {
      fr: [
        "Dans le vivier, le bouton « Pipeline » affiche une colonne par étape (Sourcé, Contacté, En entretien, Placé, Écarté).",
        "Glissez un candidat d'une colonne à l'autre pour changer son étape : le changement est enregistré immédiatement et tracé dans le journal d'activité. Les recherches et filtres s'appliquent aussi à cette vue."
      ],
      en: [
        "In the pool, the “Pipeline” button shows one column per stage (Sourced, Contacted, Interviewing, Placed, Rejected).",
        "Drag a candidate from one column to another to change their stage: the change is saved instantly and logged in the activity log. Search and filters also apply to this view."
      ]
    }
  },
  {
    id: "cabinet-interviews",
    categoryId: "pipeline",
    title: { fr: "Planifier et suivre les entretiens", en: "Schedule and track interviews" },
    summary: { fr: "Agenda, compte rendu et ajout à votre agenda.", en: "Schedule, feedback and adding to your calendar." },
    body: {
      fr: [
        "Planifiez un entretien depuis le module Entretiens ou depuis la fiche d'un candidat : date, durée, format (visio, téléphone, sur place), lieu ou lien, recruteur présent. Le candidat passe automatiquement à l'étape « En entretien ».",
        "L'agenda affiche les entretiens par jour. Après l'entretien, saisissez le compte rendu et marquez-le réalisé, annulé ou « absent ».",
        "« Ajouter à mon agenda » télécharge un fichier .ics compatible avec Google Agenda, Outlook et Apple Calendrier. Les entretiens du jour et du lendemain apparaissent dans les notifications."
      ],
      en: [
        "Schedule an interview from the Interviews module or a candidate's profile: date, duration, format (video, phone, on site), place or link, interviewer. The candidate automatically moves to the “Interviewing” stage.",
        "The schedule shows interviews by day. Afterwards, enter the feedback and mark it done, cancelled or no-show.",
        "“Add to my calendar” downloads an .ics file compatible with Google Calendar, Outlook and Apple Calendar. Today's and tomorrow's interviews appear in notifications."
      ]
    }
  },
  {
    id: "cabinet-candidate-email",
    categoryId: "pipeline",
    title: { fr: "Écrire à un candidat", en: "Email a candidate" },
    summary: { fr: "E-mail depuis la fiche, tracé dans l'historique.", en: "Email from the profile, logged in its history." },
    body: {
      fr: [
        "Le bouton « Écrire » de la fiche candidat envoie un e-mail à son adresse, signé de votre nom et de celui du cabinet. Le candidat peut répondre directement à votre adresse.",
        "Vos modèles de message sont disponibles. Chaque envoi est enregistré dans la fiche (missions, entretiens et e-mails) et un candidat « Sourcé » passe à « Contacté ».",
        "L'envoi est impossible si le candidat a refusé d'être contacté."
      ],
      en: [
        "The “Email” button on a candidate's profile sends an email to their address, signed with your name and the firm's. The candidate can reply straight to you.",
        "Your message templates are available. Each email is logged on the profile and a “Sourced” candidate moves to “Contacted”.",
        "Sending is blocked if the candidate refused to be contacted."
      ]
    }
  },
  {
    id: "cabinet-clients",
    categoryId: "business",
    title: { fr: "Les fiches clients", en: "Client records" },
    summary: { fr: "Contacts, missions et montants par client.", en: "Contacts, missions and amounts per client." },
    body: {
      fr: [
        "Le module Clients regroupe les entreprises pour lesquelles vous recrutez : interlocuteur, e-mail, téléphone, adresse de facturation, secteur et notes.",
        "Chaque fiche affiche ses missions, les candidats placés, les honoraires saisis, et pour le titulaire, les montants facturés et encaissés.",
        "À la création d'une mission, choisissez le client dans la liste ou créez-le en tapant son nom."
      ],
      en: [
        "The Clients module gathers the companies you recruit for: contact person, email, phone, billing address, sector and notes.",
        "Each record shows its missions, candidates placed, fees entered, and for the owner, amounts invoiced and collected.",
        "When creating a mission, pick the client from the list or create it by typing its name."
      ]
    }
  },
  {
    id: "cabinet-invoices",
    categoryId: "business",
    title: { fr: "Facturer vos honoraires", en: "Invoice your fees" },
    summary: { fr: "Brouillon, émission, paiement, PDF.", en: "Draft, issue, payment, PDF." },
    body: {
      fr: [
        "Le module Factures clients (réservé au titulaire) crée des factures numérotées automatiquement dans l'ordre (FAC-année-0001…). Une facture peut rester en brouillon, puis être émise.",
        "Une facture émise n'est plus modifiable ni supprimable : elle est marquée payée à l'encaissement, ou annulée si besoin. Les factures dont l'échéance est dépassée sont signalées.",
        "La version imprimable / PDF comporte les mentions obligatoires (raison sociale, SIRET, TVA, échéance, pénalités de retard et indemnité de 40 €). Renseignez-les dans les paramètres du cabinet.",
        "Le chiffre d'affaires de l'Accueil provient uniquement des factures émises, à leur date d'émission, et l'encaissé des factures payées."
      ],
      en: [
        "The Client invoices module (owner only) creates invoices numbered automatically in order (FAC-year-0001…). An invoice can stay a draft, then be issued.",
        "An issued invoice can no longer be edited or deleted: it is marked paid on collection, or cancelled if needed. Overdue invoices are flagged.",
        "The printable / PDF version carries the mandatory mentions (legal name, SIRET, VAT, due date, late penalties and €40 fee). Fill them in the firm settings.",
        "Revenue on Home comes only from issued invoices, at their issue date, and collected amounts from paid invoices."
      ]
    }
  },
  {
    id: "cabinet-rgpd",
    categoryId: "rgpd",
    title: { fr: "RGPD : consentement, conservation et droits", en: "GDPR: consent, retention and rights" },
    summary: { fr: "Ce que l'espace Cabinet fait pour votre conformité.", en: "What the Firm space does for your compliance." },
    body: {
      fr: [
        "Consentement : sur chaque fiche, indiquez si le candidat a accepté que vous conserviez ses données, comment et quand (la date est enregistrée automatiquement). Un candidat qui refuse ne peut plus recevoir d'e-mail depuis l'application.",
        "Conservation : dans les paramètres, choisissez la durée de conservation (24 mois par défaut, conformément aux recommandations de la CNIL). Les candidats sans interaction au-delà de cette durée sont signalés, et peuvent être anonymisés automatiquement toutes les 6 heures si vous l'activez.",
        "Anonymisation : identité, coordonnées, CV, notes et e-mails sont effacés définitivement ; l'étape et les compétences restent pour vos statistiques, sans lien avec la personne.",
        "Droit d'accès et de portabilité : « Exporter ses données » télécharge l'ensemble des données d'un candidat (fiche, CV, notes, e-mails, entretiens, missions) dans un fichier."
      ],
      en: [
        "Consent: on each profile, record whether the candidate agreed to you keeping their data, how and when (the date is saved automatically). A candidate who refused can no longer be emailed from the app.",
        "Retention: in settings, choose the retention period (24 months by default, in line with regulator guidance). Candidates without interaction beyond it are flagged, and can be anonymized automatically every 6 hours if enabled.",
        "Anonymization: identity, contact details, CV, notes and emails are permanently erased; stage and skills remain for your statistics, unlinked from the person.",
        "Right of access and portability: “Export data” downloads all of a candidate's data (profile, CV, notes, emails, interviews, missions) in one file."
      ]
    }
  },
  {
    id: "cabinet-activity",
    categoryId: "team",
    title: { fr: "Le journal d'activité", en: "The activity log" },
    summary: { fr: "Qui a fait quoi, et quand.", en: "Who did what, and when." },
    body: {
      fr: [
        "Le journal enregistre les actions de l'équipe : candidats ajoutés, modifiés ou déplacés d'étape, missions, affectations, entretiens, e-mails, clients, factures et opérations RGPD.",
        "Filtrez par membre de l'équipe, par type ou par période, et exportez le résultat."
      ],
      en: [
        "The log records the team's actions: candidates added, edited or moved between stages, missions, assignments, interviews, emails, clients, invoices and GDPR operations.",
        "Filter by team member, type or period, and export the result."
      ]
    }
  }
];

const SECURITY_ARTICLES = ADMIN_HELP_ARTICLES.filter((article) => article.categoryId === "account-security");

export const CABINET_HELP_ARTICLES = [...CABINET_ARTICLES, ...SECURITY_ARTICLES];
