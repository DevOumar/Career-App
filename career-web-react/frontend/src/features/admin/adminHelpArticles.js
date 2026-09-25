// Contenu du centre d'aide de l'espace administrateur.
//
// RÈGLE ÉDITORIALE (même que Jurysia) : ne décrire que ce que l'application
// fait réellement aujourd'hui. Quand un comportement a une limite (état
// conservé seulement dans le navigateur, PDF passant par l'impression…),
// l'article le dit dans un encart `caveat` plutôt que de le taire.
//
// Chaque texte existe en français et en anglais : { fr, en }.

export const ADMIN_HELP_CATEGORIES = [
  { id: "start", label: { fr: "Démarrage", en: "Getting started" }, description: { fr: "Prendre en main l'espace administrateur.", en: "Get to know the admin space." } },
  { id: "accounts", label: { fr: "Comptes", en: "Accounts" }, description: { fr: "Créer, modifier, suspendre et exporter les comptes.", en: "Create, edit, suspend and export accounts." } },
  { id: "orgs", label: { fr: "Écoles & cabinets", en: "Schools & agencies" }, description: { fr: "Suivre les organisations et leurs membres.", en: "Follow organizations and their members." } },
  { id: "licenses", label: { fr: "Licences", en: "Licenses" }, description: { fr: "Codes de licence et sièges.", en: "License codes and seats." } },
  { id: "ai", label: { fr: "Contenus & IA", en: "Content & AI" }, description: { fr: "CV, analyses, qualité et coûts de l'IA.", en: "CVs, analyses, quality and AI costs." } },
  { id: "finance", label: { fr: "Finance", en: "Finance" }, description: { fr: "Transactions, remboursements et tarifs.", en: "Transactions, refunds and pricing." } },
  { id: "communication", label: { fr: "Messagerie", en: "Messaging" }, description: { fr: "Annonces envoyées par e-mail.", en: "Announcements sent by email." } },
  { id: "settings", label: { fr: "Paramètres & sécurité", en: "Settings & security" }, description: { fr: "Réglages de la plateforme et droits d'accès.", en: "Platform settings and access rights." } },
  { id: "account-security", label: { fr: "Sécurité du compte", en: "Account security" }, description: { fr: "Connexion, double authentification, clés de sécurité et appareils.", en: "Sign-in, two-factor authentication, security keys and devices." } }
];

export const ADMIN_HELP_ARTICLES = [
  {
    id: "first-steps",
    categoryId: "start",
    title: { fr: "Premiers pas dans l'espace administrateur", en: "First steps in the admin space" },
    summary: { fr: "Comprendre l'organisation des menus et de l'accueil.", en: "Understand the menus and the home page." },
    body: {
      fr: [
        "Le menu latéral regroupe les modules par thème : Pilotage (journal d'activité, satisfaction), Utilisateurs (comptes, écoles, cabinets, codes de licence), Contenus & IA, Revenus (finance, tarifs) et Communication (messagerie). Les Paramètres sont en bas du menu.",
        "L'Accueil résume l'état de la plateforme : comptes inscrits, CV importés, abonnements actifs, revenu du mois, croissance sur plusieurs semaines, répartition des plans et comptes par rôle.",
        "Le bouton « Réduire » en bas du menu replie la barre latérale pour gagner de la place. La langue (FR / EN) se change depuis la barre du haut."
      ],
      en: [
        "The side menu groups modules by theme: Monitoring (activity log, satisfaction), Users (accounts, schools, agencies, license codes), Content & AI, Revenue (finance, pricing) and Communication (messaging). Settings sit at the bottom of the menu.",
        "Home summarizes the platform: registered accounts, imported CVs, active subscriptions, revenue this month, growth over several weeks, plan breakdown and accounts by role.",
        "The “Collapse” button at the bottom of the menu folds the sidebar to save space. The language (FR / EN) is switched from the top bar."
      ]
    }
  },
  {
    id: "quick-search",
    categoryId: "start",
    title: { fr: "Recherche rapide (Ctrl K)", en: "Quick search (Ctrl K)" },
    summary: { fr: "Retrouver un compte, une licence ou un module au clavier.", en: "Find an account, a license or a module from the keyboard." },
    body: {
      fr: [
        "Appuyez sur Ctrl K (ou ⌘ K sur Mac), ou cliquez dans la barre de recherche du haut. Les résultats sont regroupés par type ; les flèches du clavier et Entrée permettent de les ouvrir sans la souris.",
        "Vos dernières recherches sont proposées à l'ouverture pour y revenir en un clic."
      ],
      en: [
        "Press Ctrl K (or ⌘ K on Mac), or click the search bar at the top. Results are grouped by type; use the arrow keys and Enter to open them without the mouse.",
        "Your latest searches are suggested when the palette opens so you can come back to them in one click."
      ]
    },
    caveat: {
      fr: "Les recherches récentes sont mémorisées dans ce navigateur uniquement.",
      en: "Recent searches are stored in this browser only."
    }
  },
  {
    id: "notifications",
    categoryId: "start",
    title: { fr: "Notifications", en: "Notifications" },
    summary: { fr: "Ce que signale la cloche et comment la marquer comme lue.", en: "What the bell reports and how to mark it as read." },
    body: {
      fr: [
        "La cloche signale les événements réels de la plateforme : nouvelles inscriptions et nouvelles organisations, paiements encaissés (7 derniers jours), licences dont tous les sièges sont utilisés, et annonces dont l'envoi a échoué pour au moins un destinataire.",
        "Une notification non lue est marquée d'un point et d'un fond teinté. Cliquer dessus la marque comme lue et ouvre le module concerné ; « Tout marquer comme lu » les traite toutes d'un coup.",
        "« Voir toutes les notifications » ouvre la liste complète, avec un filtre « Non lues ». La liste se met à jour automatiquement chaque minute."
      ],
      en: [
        "The bell reports real platform events: new signups and new organizations, collected payments (last 7 days), licenses with every seat used, and announcements that failed for at least one recipient.",
        "An unread notification shows a dot and a tinted background. Clicking it marks it as read and opens the related module; “Mark all as read” handles them all at once.",
        "“View all notifications” opens the full list, with an “Unread” filter. The list refreshes automatically every minute."
      ]
    },
    caveat: {
      fr: "L'état « lu » est conservé dans ce navigateur, pour votre compte : il n'est pas partagé avec les autres administrateurs ni avec un autre appareil.",
      en: "The “read” state is kept in this browser, for your account: it is not shared with other admins or another device."
    }
  },
  {
    id: "create-account",
    categoryId: "accounts",
    title: { fr: "Créer ou modifier un compte", en: "Create or edit an account" },
    summary: { fr: "Candidat, école, cabinet ou administrateur.", en: "Candidate, school, agency or administrator." },
    body: {
      fr: [
        "Dans Comptes, cliquez sur « Créer un compte » (ou « Nouveau » dans la barre du haut). Choisissez le type de compte, puis renseignez l'identité ; pour une école ou un cabinet, le nom de l'organisation est obligatoire.",
        "Les champs sont vérifiés à la saisie puis de nouveau par le serveur (nom, e-mail, site web, plan). Un générateur propose un mot de passe robuste et un indicateur montre sa solidité.",
        "Un résumé récapitule le compte avant validation, y compris son rattachement éventuel à une école ou à un cabinet. Pour modifier un compte existant, utilisez l'icône crayon de sa ligne ou le bouton « Modifier » du panneau de détail."
      ],
      en: [
        "In Accounts, click “Create an account” (or “New” in the top bar). Pick the account type, then fill in the identity; for a school or agency, the organization name is required.",
        "Fields are checked as you type and again by the server (name, email, website, plan). A generator suggests a strong password and a meter shows its strength.",
        "A summary recaps the account before saving, including any link to a school or agency. To edit an existing account, use the pencil icon on its row or the “Edit” button in the detail panel."
      ]
    }
  },
  {
    id: "suspend-delete",
    categoryId: "accounts",
    title: { fr: "Suspendre, réactiver ou supprimer un compte", en: "Suspend, reactivate or delete an account" },
    summary: { fr: "Bloquer temporairement l'accès ou effacer définitivement un compte.", en: "Temporarily block access or permanently erase an account." },
    body: {
      fr: [
        "Suspendre empêche l'utilisateur de se connecter et ferme ses sessions en cours. Le compte et ses données sont conservés ; « Réactiver » lui rend l'accès.",
        "Supprimer efface définitivement le compte et ses données (CV, historique de matching, codes de licence). Par sécurité, il faut saisir l'adresse e-mail du compte pour confirmer.",
        "Les comptes administrateurs ne peuvent être ni suspendus ni supprimés depuis cette liste."
      ],
      en: [
        "Suspending prevents the user from signing in and closes their active sessions. The account and its data are kept; “Reactivate” restores access.",
        "Deleting permanently erases the account and its data (CVs, matching history, license codes). For safety, you must type the account's email to confirm.",
        "Administrator accounts cannot be suspended or deleted from this list."
      ]
    },
    caveat: {
      fr: "La suppression est irréversible.",
      en: "Deletion cannot be undone."
    }
  },
  {
    id: "list-tools",
    categoryId: "accounts",
    title: { fr: "Filtres avancés, colonnes et exports", en: "Advanced filters, columns and exports" },
    summary: { fr: "Affiner une liste et l'exporter en Excel, CSV ou PDF.", en: "Refine a list and export it to Excel, CSV or PDF." },
    body: {
      fr: [
        "Dans Comptes, Finance et Codes de licence, « Filtres avancés » combine plusieurs critères (statut, plan, dates…). Le nombre de filtres actifs s'affiche sur le bouton ; « Réinitialiser » les efface.",
        "« Colonnes » affiche ou masque des colonnes ; certaines, masquées par défaut, apportent des informations en plus (date de création, organisation…). Votre choix est mémorisé pour chaque liste.",
        "« Exporter » porte sur tout le résultat filtré (toutes les pages), avec les colonnes visibles : Excel (.xlsx), CSV (lisible directement dans Excel) ou PDF / impression, avec la date de génération et les filtres appliqués."
      ],
      en: [
        "In Accounts, Finance and License codes, “Advanced filters” combines several criteria (status, plan, dates…). The number of active filters shows on the button; “Reset” clears them.",
        "“Columns” shows or hides columns; some, hidden by default, add extra information (creation date, organization…). Your choice is remembered for each list.",
        "“Export” covers the whole filtered result (every page), with the visible columns: Excel (.xlsx), CSV (opens directly in Excel) or PDF / print, with the generation date and applied filters."
      ]
    },
    caveat: {
      fr: "Le PDF passe par la fenêtre d'impression du navigateur : choisissez « Enregistrer au format PDF » comme imprimante.",
      en: "The PDF goes through the browser's print window: choose “Save as PDF” as the printer."
    }
  },
  {
    id: "schools",
    categoryId: "orgs",
    title: { fr: "Suivre les écoles", en: "Follow schools" },
    summary: { fr: "Sièges, étudiants rattachés et alertes.", en: "Seats, linked students and alerts." },
    body: {
      fr: [
        "Le module Écoles liste chaque établissement avec son logo, ses sièges utilisés, son nombre d'étudiants et ses alertes. Les écoles les plus proches de la saturation apparaissent en premier.",
        "Cliquer sur une école ouvre un panneau de détail : coordonnées, alertes et liste des étudiants rattachés avec leur activité (CV, analyses, dernier score).",
        "Un étudiant est rattaché à une école lorsqu'il utilise l'un de ses codes de licence."
      ],
      en: [
        "The Schools module lists each institution with its logo, seats used, number of students and alerts. Schools closest to saturation come first.",
        "Clicking a school opens a detail panel: contact details, alerts and the linked students with their activity (CVs, analyses, latest score).",
        "A student is linked to a school when they redeem one of its license codes."
      ]
    }
  },
  {
    id: "agencies",
    categoryId: "orgs",
    title: { fr: "Suivre les cabinets de recrutement", en: "Follow recruitment agencies" },
    summary: { fr: "Recruteurs, vivier de candidats et missions.", en: "Recruiters, talent pool and missions." },
    body: {
      fr: [
        "Le module Cabinets présente chaque cabinet avec ses sièges, ses recruteurs, ses candidats et ses missions ouvertes.",
        "Le panneau de détail liste les recruteurs de l'équipe et les candidats du vivier du cabinet, avec leur statut.",
        "Sur l'Accueil, la carte « Comptes par rôle » résume les étudiants de chaque école et les candidats de chaque cabinet."
      ],
      en: [
        "The Agencies module shows each agency with its seats, recruiters, candidates and open missions.",
        "The detail panel lists the team's recruiters and the candidates in the agency's talent pool, with their status.",
        "On Home, the “Accounts by role” card summarizes each school's students and each agency's candidates."
      ]
    }
  },
  {
    id: "license-codes",
    categoryId: "licenses",
    title: { fr: "Gérer les codes de licence", en: "Manage license codes" },
    summary: { fr: "Suivre les sièges, révoquer ou restaurer un code.", en: "Track seats, revoke or restore a code." },
    body: {
      fr: [
        "Chaque code indique son propriétaire, son plan et ses sièges utilisés. Une barre montre le taux d'occupation ; le panneau de détail permet de copier le code.",
        "Révoquer un code empêche de nouveaux membres de l'utiliser ; les membres déjà inscrits conservent leur accès. « Restaurer » le rend de nouveau utilisable.",
        "Quand tous les sièges d'un code sont pris, une notification « Licence épuisée » vous prévient."
      ],
      en: [
        "Each code shows its owner, plan and seats used. A bar shows the occupancy rate; the detail panel lets you copy the code.",
        "Revoking a code prevents new members from using it; members already signed up keep their access. “Restore” makes it usable again.",
        "When every seat of a code is taken, a “License fully used” notification warns you."
      ]
    }
  },
  {
    id: "cvs-quality",
    categoryId: "ai",
    title: { fr: "CV importés et qualité d'extraction", en: "Imported CVs and extraction quality" },
    summary: { fr: "Contrôler ce que l'IA a extrait des CV.", en: "Check what the AI extracted from CVs." },
    body: {
      fr: [
        "« CV importés », « Offres analysées » et « Qualité extraction » regroupent les éléments par personne : une ligne par candidat, et le détail de tous ses CV ou analyses dans le panneau latéral.",
        "La qualité d'extraction signale les éléments manquants (en rouge, ils empêchent un bon matching) et les éléments suspects (en or, à vérifier).",
        "Depuis Qualité extraction, vous pouvez relancer l'analyse d'un CV ou le supprimer."
      ],
      en: [
        "“Imported CVs”, “Analyzed offers” and “Extraction quality” group items by person: one row per candidate, with all their CVs or analyses in the side panel.",
        "Extraction quality flags missing items (red, they prevent good matching) and suspicious items (gold, to be checked).",
        "From Extraction quality, you can re-run a CV's analysis or delete it."
      ]
    }
  },
  {
    id: "ai-monitoring",
    categoryId: "ai",
    title: { fr: "Monitoring et modération de l'IA", en: "AI monitoring and moderation" },
    summary: { fr: "Taux de réussite, coûts estimés et réponses invalides.", en: "Success rate, estimated costs and invalid responses." },
    body: {
      fr: [
        "Monitoring IA présente les extractions réussies, partielles et échouées, le score moyen de matching et une estimation du coût de l'IA par module, comparée au revenu encaissé.",
        "Les réponses invalides sont regroupées par personne ; le panneau détaille chaque CV concerné et les points relevés.",
        "Modération IA permet de relire des échantillons de réponses générées, regroupés par personne."
      ],
      en: [
        "AI monitoring shows successful, partial and failed extractions, the average matching score and an estimate of AI cost per module, compared with collected revenue.",
        "Invalid responses are grouped by person; the panel details each affected CV and the issues found.",
        "AI moderation lets you review samples of generated responses, grouped by person."
      ]
    },
    caveat: {
      fr: "Les coûts affichés sont des estimations calculées par la plateforme, pas la facture de votre fournisseur d'IA.",
      en: "Displayed costs are estimates computed by the platform, not your AI provider's invoice."
    }
  },
  {
    id: "finance",
    categoryId: "finance",
    title: { fr: "Lire la page Finance", en: "Reading the Finance page" },
    summary: { fr: "Valeur catalogue, montant encaissé et origine des transactions.", en: "Listed value, collected amount and transaction origin." },
    body: {
      fr: [
        "« Valeur catalogue » correspond au prix affiché des plans attribués ; « Encaissé » au montant réellement payé. L'écart vient des activations gratuites : code de licence, activation instantanée ou création par un administrateur.",
        "L'onglet Transactions liste chaque opération avec sa source et son statut (Payé, Offert, Remboursé) ; l'onglet Analyses montre l'évolution du revenu et sa répartition par source, par plan et par segment."
      ],
      en: [
        "“Listed value” is the displayed price of assigned plans; “Collected” is the amount actually paid. The gap comes from free activations: license code, instant activation or creation by an admin.",
        "The Transactions tab lists each operation with its source and status (Paid, Free, Refunded); the Analytics tab shows revenue over time and its breakdown by source, plan and segment."
      ]
    }
  },
  {
    id: "refunds",
    categoryId: "finance",
    title: { fr: "Rembourser un paiement", en: "Refund a payment" },
    summary: { fr: "Remboursement réel via Stripe, après confirmation.", en: "Real refund through Stripe, after confirmation." },
    body: {
      fr: [
        "Le bouton « Rembourser » n'apparaît que sur les paiements Stripe non encore remboursés. Après confirmation, le remboursement est réellement demandé à Stripe et la transaction passe au statut « Remboursé ».",
        "Une transaction ne peut être remboursée qu'une seule fois."
      ],
      en: [
        "The “Refund” button only appears on Stripe payments not yet refunded. After confirmation, the refund is actually requested from Stripe and the transaction becomes “Refunded”.",
        "A transaction can only be refunded once."
      ]
    },
    caveat: {
      fr: "Les activations gratuites (code de licence, création admin…) n'ont pas de paiement à rembourser.",
      en: "Free activations (license code, admin creation…) have no payment to refund."
    }
  },
  {
    id: "pricing",
    categoryId: "finance",
    title: { fr: "Modifier les tarifs", en: "Change pricing" },
    summary: { fr: "Ajuster le prix mensuel ou annuel d'un plan.", en: "Adjust a plan's monthly or yearly price." },
    body: {
      fr: [
        "Le module Tarifs affiche chaque plan avec son prix. Vous pouvez modifier le prix mensuel et annuel, puis revenir au tarif d'origine avec « Réinitialiser ».",
        "Le nouveau prix s'applique aux prochains achats ; les abonnements déjà en cours ne sont pas modifiés rétroactivement."
      ],
      en: [
        "The Pricing module lists each plan with its price. You can change the monthly and yearly price, then return to the original price with “Reset”.",
        "The new price applies to future purchases; ongoing subscriptions are not changed retroactively."
      ]
    }
  },
  {
    id: "announcements",
    categoryId: "communication",
    title: { fr: "Envoyer une annonce", en: "Send an announcement" },
    summary: { fr: "Écrire à un public d'utilisateurs par e-mail.", en: "Email a group of users." },
    body: {
      fr: [
        "Dans Messagerie, cliquez sur « Nouvelle annonce », choisissez le public (tous les utilisateurs, étudiants / candidats, écoles ou cabinets de recrutement), puis rédigez l'objet et le message. Le nombre de destinataires est affiché avant l'envoi.",
        "Une pièce jointe de 10 Mo maximum peut être ajoutée. L'envoi passe par le serveur e-mail (SMTP) configuré pour la plateforme.",
        "Chaque annonce indique ses destinataires, les e-mails délivrés et les échecs. « Supprimer de l'historique » retire l'annonce de la liste."
      ],
      en: [
        "In Messaging, click “New announcement”, choose the audience (all users, students / candidates, schools or recruitment agencies), then write the subject and message. The number of recipients is shown before sending.",
        "An attachment of up to 10 MB can be added. Sending goes through the email server (SMTP) configured for the platform.",
        "Each announcement shows its recipients, delivered emails and failures. “Delete from history” removes it from the list."
      ]
    },
    caveat: {
      fr: "Supprimer une annonce de l'historique n'annule pas les e-mails déjà envoyés.",
      en: "Deleting an announcement from history does not recall emails already sent."
    }
  },
  {
    id: "platform-settings",
    categoryId: "settings",
    title: { fr: "Paramètres de la plateforme", en: "Platform settings" },
    summary: { fr: "Activer ou désactiver le paiement Stripe et la connexion Google.", en: "Turn Stripe payment and Google sign-in on or off." },
    body: {
      fr: [
        "Les Paramètres permettent d'activer ou de désactiver le paiement par Stripe et la connexion avec Google pour tous les utilisateurs.",
        "Chaque changement demande une confirmation avant d'être appliqué, car il prend effet immédiatement pour toute la plateforme."
      ],
      en: [
        "Settings let you turn Stripe payment and Google sign-in on or off for every user.",
        "Each change asks for confirmation before it is applied, because it takes effect immediately for the whole platform."
      ]
    }
  },
  {
    id: "admin-rights",
    categoryId: "settings",
    title: { fr: "Droits d'accès des administrateurs", en: "Administrator access rights" },
    summary: { fr: "Limiter un administrateur à certains modules.", en: "Restrict an administrator to some modules." },
    body: {
      fr: [
        "À la création ou à la modification d'un compte administrateur, choisissez les modules visibles. Laissez tout coché pour un accès complet.",
        "Un administrateur limité ne voit que ses modules dans le menu, et le serveur refuse ses requêtes vers les autres : la restriction n'est pas seulement visuelle.",
        "Le journal d'activité trace les événements de sécurité (connexions, changements de mot de passe, sessions révoquées) et les actions des administrateurs sur les comptes, les CV et les licences."
      ],
      en: [
        "When creating or editing an administrator account, choose the visible modules. Leave everything checked for full access.",
        "A restricted administrator only sees their modules in the menu, and the server rejects their requests to other ones: the restriction is not only visual.",
        "The activity log records security events (sign-ins, password changes, revoked sessions) and administrators' actions on accounts, CVs and licenses."
      ]
    }
  },
  {
    id: "sign-in",
    categoryId: "account-security",
    title: { fr: "Se connecter : mot de passe, Google et vérification de l'adresse", en: "Signing in: password, Google and email verification" },
    summary: { fr: "Comment fonctionnent l'inscription et la connexion.", en: "How sign-up and sign-in work." },
    body: {
      fr: [
        "À l'inscription par e-mail, un mot de passe (8 caractères minimum) est obligatoire, puis un code à 6 chiffres est envoyé pour vérifier l'adresse. Le compte n'est utilisable qu'une fois l'adresse vérifiée.",
        "La connexion se fait avec l'e-mail (ou le nom d'utilisateur) et le mot de passe, sur le même écran, ou avec « Continuer avec Google ». Aucun code n'est envoyé par e-mail à la connexion.",
        "Un compte créé avec Google n'a pas de mot de passe au départ. Pour se connecter aussi par e-mail, il suffit d'en créer un : « Mot de passe oublié ? » sur la page de connexion envoie un code qui permet de le définir, ou « Définir un mot de passe » dans Compte › Sécurité une fois connecté.",
        "Après 5 mots de passe erronés, le compte est verrouillé 15 minutes ; « Mot de passe oublié ? » permet de le débloquer immédiatement."
      ],
      en: [
        "When signing up by email, a password (at least 8 characters) is required, then a 6-digit code is sent to verify the address. The account can only be used once the address is verified.",
        "Sign-in uses the email (or username) and password on the same screen, or “Continue with Google”. No code is emailed at sign-in.",
        "An account created with Google starts without a password. To also sign in by email, create one: “Forgot password?” on the sign-in page sends a code to set it, or “Set password” in Account › Security once signed in.",
        "After 5 wrong passwords, the account is locked for 15 minutes; “Forgot password?” unlocks it right away."
      ]
    }
  },
  {
    id: "mfa-app",
    categoryId: "account-security",
    title: { fr: "Activer la double authentification (application)", en: "Enable two-factor authentication (app)" },
    summary: { fr: "Un code à 6 chiffres demandé à chaque connexion, en plus du mot de passe.", en: "A 6-digit code asked at every sign-in, on top of your password." },
    body: {
      fr: [
        "Dans Compte › Sécurité, section « Authentification multifactorielle », cliquez sur « Activer ». Confirmez d'abord votre identité (mot de passe, ou Google pour un compte lié à Google).",
        "Scannez le QR code avec une application d'authentification compatible TOTP (Google Authenticator, Microsoft Authenticator, 1Password…), ou saisissez la clé affichée. Entrez ensuite le code à 6 chiffres affiché par l'application pour confirmer.",
        "Dès l'activation, 10 codes de récupération sont affichés une seule fois : conservez-les (voir « Codes de récupération »).",
        "À chaque connexion, après le mot de passe ou Google, l'étape « Vérification en deux étapes » demande le code de l'application. Un même code ne peut servir qu'une fois."
      ],
      en: [
        "In Account › Security, “Two-factor authentication” section, click “Enable”. First confirm your identity (password, or Google for a Google-linked account).",
        "Scan the QR code with a TOTP-compatible authenticator app (Google Authenticator, Microsoft Authenticator, 1Password…), or enter the key shown. Then type the 6-digit code shown by the app to confirm.",
        "As soon as it's enabled, 10 recovery codes are shown only once: keep them (see “Recovery codes”).",
        "At every sign-in, after the password or Google, the “Two-step verification” step asks for the app's code. A code can only be used once."
      ]
    },
    caveat: {
      fr: "Chaque activation crée une nouvelle clé. Après une désactivation puis une réactivation, supprimez l'ancienne entrée Career CV de votre application : ses codes ne fonctionnent plus.",
      en: "Each activation creates a new key. After disabling and re-enabling, delete the old Career CV entry from your app: its codes no longer work."
    }
  },
  {
    id: "security-keys",
    categoryId: "account-security",
    title: { fr: "Ajouter une clé de sécurité", en: "Add a security key" },
    summary: { fr: "Clé physique FIDO2 (USB, NFC) ou passkey de l'appareil.", en: "FIDO2 hardware key (USB, NFC) or device passkey." },
    body: {
      fr: [
        "Une clé de sécurité est la protection la plus forte : elle résiste au hameçonnage, car elle ne fonctionne que sur le vrai site Career CV.",
        "Dans Compte › Sécurité, section « Clés de sécurité », cliquez sur « Ajouter une clé », donnez-lui un nom (ex. « Clé du bureau »), puis branchez ou approchez la clé et touchez son capteur quand le navigateur le demande. Windows Hello, Touch ID ou un téléphone peuvent aussi servir de clé.",
        "Vous pouvez enregistrer plusieurs clés ; chacune affiche sa date d'ajout et sa dernière utilisation. À la connexion, choisissez « Utiliser une clé de sécurité » à l'étape de vérification.",
        "« Révoquer » retire définitivement une clé (par exemple en cas de perte)."
      ],
      en: [
        "A security key is the strongest protection: it resists phishing, since it only works on the real Career CV site.",
        "In Account › Security, “Security keys” section, click “Add a key”, name it (e.g. “Office key”), then plug in or hold the key close and touch its sensor when the browser asks. Windows Hello, Touch ID or a phone can also act as a key.",
        "You can register several keys; each shows when it was added and last used. At sign-in, choose “Use a security key” at the verification step.",
        "“Revoke” permanently removes a key (for instance if it's lost)."
      ]
    },
    caveat: {
      fr: "Les clés de sécurité exigent une connexion sécurisée (HTTPS).",
      en: "Security keys require a secure (HTTPS) connection."
    }
  },
  {
    id: "recovery-codes",
    categoryId: "account-security",
    title: { fr: "Codes de récupération", en: "Recovery codes" },
    summary: { fr: "Se connecter sans téléphone ni clé.", en: "Sign in without your phone or key." },
    body: {
      fr: [
        "À la première activation d'un second facteur, 10 codes de récupération à usage unique sont affichés une seule fois. Copiez-les ou téléchargez-les, puis rangez-les hors ligne (gestionnaire de mots de passe, papier).",
        "Si vous perdez votre téléphone ou votre clé, choisissez « Utiliser un code de récupération » à l'étape de vérification. Chaque code ne sert qu'une fois ; le nombre de codes restants est affiché dans Compte › Sécurité.",
        "« Générer de nouveaux codes » invalide immédiatement tous les anciens."
      ],
      en: [
        "When a second factor is first enabled, 10 single-use recovery codes are shown only once. Copy or download them, then keep them offline (password manager, paper).",
        "If you lose your phone or key, choose “Use a recovery code” at the verification step. Each code works once; the number of remaining codes is shown in Account › Security.",
        "“Generate new codes” immediately invalidates all old ones."
      ]
    },
    caveat: {
      fr: "Sans application, sans clé et sans code de récupération, il n'existe pas aujourd'hui de réinitialisation en libre-service de la double authentification : contactez l'équipe Career CV.",
      en: "Without an app, key or recovery code, there is currently no self-service reset for two-factor authentication: contact the Career CV team."
    }
  },
  {
    id: "protected-actions",
    categoryId: "account-security",
    title: { fr: "Actions qui demandent une confirmation d'identité", en: "Actions that ask you to confirm your identity" },
    summary: { fr: "Pourquoi un code est redemandé pour certaines actions.", en: "Why a code is asked again for some actions." },
    body: {
      fr: [
        "Quand la double authentification est active, les actions qui permettent de prendre le contrôle d'un compte exigent le second facteur au moment même de l'action : changer le mot de passe, le nom d'utilisateur ou l'adresse e-mail principale, ajouter ou retirer une adresse, lier ou délier Google, supprimer le compte.",
        "Désactiver l'application d'authentification, régénérer les codes de récupération ou révoquer une clé exigent aussi le code de l'application, une clé ou un code de récupération : le mot de passe seul ne suffit pas, pour qu'un mot de passe volé ne permette pas de retirer la protection.",
        "Pour activer l'application ou ajouter une clé, une confirmation par mot de passe (ou Google) suffit ; elle reste valable 5 minutes."
      ],
      en: [
        "When two-factor authentication is on, actions that could take over an account require the second factor at the time of the action: changing the password, username or primary email, adding or removing an address, linking or unlinking Google, deleting the account.",
        "Disabling the authenticator app, regenerating recovery codes or revoking a key also require the app's code, a key or a recovery code: the password alone isn't enough, so a stolen password can't remove the protection.",
        "To enable the app or add a key, confirming with your password (or Google) is enough; it stays valid for 5 minutes."
      ]
    }
  },
  {
    id: "devices",
    categoryId: "account-security",
    title: { fr: "Appareils connectés et déconnexion", en: "Signed-in devices and signing out" },
    summary: { fr: "Voir où votre compte est ouvert et fermer les sessions.", en: "See where your account is open and close sessions." },
    body: {
      fr: [
        "Compte › Sécurité › « Appareils actifs » liste les appareils connectés : cet appareil en premier, puis les autres par activité récente, avec l'adresse IP et la date de dernière activité.",
        "« Déconnecter » ferme une session précise ; « Déconnecter les autres appareils » les ferme toutes sauf celle en cours. Faites-le si vous pensez qu'un appareil inconnu a accès au compte, puis changez votre mot de passe.",
        "Le bouton de déconnexion demande une confirmation avant de fermer votre session."
      ],
      en: [
        "Account › Security › “Active devices” lists signed-in devices: this device first, then the others by recent activity, with IP address and last activity date.",
        "“Sign out” closes one session; “Sign out other devices” closes all but the current one. Do it if you think an unknown device has access, then change your password.",
        "The sign-out button asks for confirmation before closing your session."
      ]
    }
  }
];
