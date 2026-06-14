import { Link } from 'react-router-dom'
import { useCallback, useEffect, useRef, useState } from 'react'
import GoodClouds from './components/GoodClouds/GoodClouds.jsx'
import TetriminosClouds from './components/TetriminosClouds/TetriminosClouds.jsx'
import { apiFetch } from './api'
import { DEFAULT_LANGUAGE, isSupportedLanguage } from './i18n/playerStats'

const THEME_STORAGE_KEY = 'red-tetris-theme'
const AUTH_STORAGE_KEY = 'red-tetris-auth-user'
const LANGUAGE_STORAGE_KEY = 'red-tetris-language'
const LANGUAGE_CHANGE_EVENT = 'red-tetris-language-change'
const CONTACT_TIMEOUT_MS = 15000
const CONTACT_OBJECT_MAX_LENGTH = 120
const CONTACT_MESSAGE_MAX_LENGTH = 4000
const PRIVACY_LAST_UPDATED = 'May 5, 2026'
const PRIVACY_CONTROLLER_NAME = 'Thibault and Riham'

const getSavedLanguage = () => {
  const savedLanguage = localStorage.getItem(LANGUAGE_STORAGE_KEY)
  return isSupportedLanguage(savedLanguage) ? savedLanguage : DEFAULT_LANGUAGE
}

const pages = {
  about: {
    title: 'About Red Tetris',
    intro:
      'Red Tetris is a 42 School project we built as a team of two. The goal was to create a real-time web version of Tetris with solo play, cooperative rooms, multiplayer rooms, and synchronized gameplay.',
    sections: [
      {
        title: 'Game Modes',
        body:
          'The game includes solo mode for chasing your best score, cooperative rooms where two players share a challenge, and multiplayer rooms where players compete in real time. In competitive multiplayer, clearing lines can send penalties to opponents, making each game more strategic.',
      },
      {
        title: 'Profiles And Scores',
        body:
          'Player profiles keep track of useful statistics such as high scores, games played, lines cleared, levels reached, solo results, cooperative scores, and multiplayer results, allowing players to follow their progress over time.',
      },
      {
        title: 'Project',
        body:
          'This project was built at 42 by a team of two. We developed the frontend with React and used Socket.IO to handle real-time communication between players. The backend manages rooms, game state, synchronization, scores, and multiplayer events.',
      },
    ],
  },
  tutorial: {
    title: 'Guide',
    intro:
      'Apprenez les contrôles et les modes de jeu avant de rejoindre une salle.',
    sections: [
      {
        title: 'Contrôles',
        body:
          'Utilisez Gauche et Droite pour déplacer la pièce, Bas pour la descente rapide, Haut pour la rotation, Espace pour la chute instantanée, et C ou Maj pour garder la pièce actuelle. Échap ouvre le menu pause/options en solo et le menu de jeu en multijoueur.',
      },
      {
        title: 'Solo',
        body:
          'Le mode solo vous permet de jouer seul, de supprimer des lignes, de monter de niveau et de viser votre meilleur score. Vos résultats solo peuvent apparaître dans votre profil et dans le classement solo.',
      },
      {
        title: 'Multijoueur',
        body:
          'Dans les salles multijoueur, jusqu’à 8 joueurs s’affrontent en temps réel sur des plateaux séparés. Supprimer plusieurs lignes envoie des lignes de pénalité aux adversaires, et le dernier joueur encore en jeu gagne.',
      },
      {
        title: 'Classique',
        body:
          'Classique est le mode multijoueur compétitif standard. Tout le monde joue avec les contrôles normaux, et les lignes supprimées peuvent envoyer des pénalités aux autres plateaux.',
      },
      {
        title: 'Miroir',
        body:
          'Miroir inverse une partie des contrôles : Gauche et Droite déplacent la pièce dans le sens opposé, Bas déclenche une chute instantanée, et Espace devient une descente rapide.',
      },
      {
        title: 'Chaotique',
        body:
          'Chaotique conserve les règles compétitives, mais échange aléatoirement votre pièce actuelle avec la pièce suivante pendant la partie, ce qui demande une adaptation rapide.',
      },
      {
        title: 'Invisible',
        body:
          'Invisible conserve les règles compétitives, mais cache la pièce active en chute. Les joueurs doivent donc suivre sa position de mémoire, tandis que les pièces posées restent visibles.',
      },
      {
        title: 'Géant',
        body:
          'Géant utilise un plateau plus grand, ce qui donne plus d’espace aux joueurs, mais aussi plus de lignes et de colonnes à gérer sous la pression du multijoueur.',
      },
      {
        title: 'Co-op alternée',
        body:
          'La co-op alternée est un mode à deux joueurs sur un plateau partagé. Les joueurs contrôlent les pièces à tour de rôle, donc la communication et le timing sont essentiels.',
      },
      {
        title: 'Co-op rôles',
        body:
          'La co-op rôles est un mode à deux joueurs sur un plateau partagé où un joueur gère la rotation et l’autre gère les déplacements et les chutes. Les deux joueurs doivent se coordonner pour survivre.',
      },
      {
        title: 'Spectateur',
        body:
          'En multijoueur, les joueurs éliminés peuvent regarder les plateaux restants au lieu de quitter immédiatement.',
      },
    ],
  },
  contact: {
    title: 'Contact',
    intro: 'Send bug reports, suggestions, account questions, or privacy requests directly to the Red Tetris mailbox. Replies are sent to the email address attached to your account or the address you provide in the form.',
    sections: [
      {
        title: 'Bug Reports',
        body: 'Include what happened, what you expected, and the room or page where the issue appeared.',
      },
      {
        title: 'Suggestions',
        body: 'Share ideas for game modes, controls, profile features, scoring, or anything that would improve the site.',
      },
      {
        title: 'Privacy Requests',
        body:
          'For access, correction, deletion, or objection requests, include the username and registered email associated with the account so the request can be verified.',
      },
    ],
  },
  terms: {
    title: 'Terms',
    intro:
      'These terms describe the basic rules for using Red Tetris. By using the site, you agree to play fairly and respect other players.',
    sections: [
      {
        title: 'Use Of The Service',
        body:
          'Red Tetris is provided for personal entertainment. Do not abuse the service, interfere with gameplay, attempt unauthorized access, or use automation to disrupt rooms, scores, or accounts.',
      },
      {
        title: 'Accounts And Profiles',
        body:
          'You are responsible for the activity tied to your username and login details. Use accurate account information and do not impersonate another player.',
      },
      {
        title: 'Gameplay And Scores',
        body:
          'Scores, leaderboards, rooms, and multiplayer results may be reset, corrected, or removed if they are affected by bugs, cheating, abuse, or maintenance.',
      },
      {
        title: 'Availability',
        body:
          'The site is provided as is. Features may change, become unavailable, or be removed without notice while the project evolves.',
      },
    ],
  },
  privacy: {
    title: 'Privacy Policy',
    intro:
      `Last updated ${PRIVACY_LAST_UPDATED}. This policy explains what Red Tetris collects, why it is used, how long it is kept, and how you can exercise your RGPD/GDPR rights.`,
    sections: [
      {
        title: 'Controller',
        body:
          `${PRIVACY_CONTROLLER_NAME} are responsible for deciding how account, profile, contact, and gameplay data is used for this deployment of Red Tetris. No separate Data Protection Officer is appointed unless this section states otherwise.`,
      },
      {
        title: 'Information We Collect',
        body:
          'The site may store your username, email address, password hash, avatar settings, solo scores, cooperative scores, multiplayer results, leaderboard entries, password reset tokens, contact messages, and technical data such as IP addresses used for security logs and anti-spam rate limiting.',
      },
      {
        title: 'How Information Is Used',
        body:
          'Data is used to create accounts, authenticate players, restore access, show profiles, run rooms, save scores, maintain leaderboards, answer contact requests, protect the service from abuse, and improve reliability.',
      },
      {
        title: 'Legal Bases',
        body:
          'Account, login, profile, and gameplay data are processed to provide the service you request. Security, anti-abuse, and reliability data are processed for legitimate interests in protecting the site. Contact messages are processed to answer your request. Legal obligations may require some records to be kept when applicable.',
      },
      {
        title: 'Retention',
        body:
          'Account deletion can be requested from the profile menu. Deleted accounts are first scheduled for deletion and can be restored for 30 days by logging in again and choosing restore. After that restore window, the account and related profile, room, and score data are permanently removed from the database. Password reset tokens are temporary and expire after a short period. Contact messages and technical logs are kept only as long as needed for support, security, and abuse prevention, then deleted or anonymized when no longer necessary.',
      },
      {
        title: 'Your Rights',
        body:
          'Under the RGPD/GDPR, you may request access, correction, deletion, restriction, portability, or objection to the processing of your personal data. Requests are answered within one month when required, unless the request is complex or identity verification is needed.',
      },
      {
        title: 'Deletion Requests',
        body:
          'Signed-in users can export their account data or delete their account from this privacy page. You can also use the contact page for privacy requests that need manual review. Some data may be retained temporarily when needed for security, abuse prevention, legal obligations, or backup integrity.',
      },
      {
        title: 'Recipients And Providers',
        body:
          'Personal data is processed by the site backend, the PostgreSQL database, Railway for backend and database hosting, Vercel for frontend hosting, and Resend for transactional emails such as password reset and contact messages. Contact form messages include the email address you provide as the reply-to address. Data is not sold.',
      },
      {
        title: 'International Transfers',
        body:
          'Railway, Vercel, and Resend may process data outside the European Economic Area, including in the United States. Transfers rely on the provider data processing terms and transfer safeguards made available by those providers, including EU Standard Contractual Clauses and, where applicable, Data Privacy Framework commitments.',
        links: [
          { href: 'https://railway.com/legal/dpa', label: 'Railway DPA' },
          { href: 'https://vercel.com/legal/dpa', label: 'Vercel DPA' },
          { href: 'https://resend.com/legal/dpa', label: 'Resend DPA' },
        ],
      },
      {
        title: 'Processor Agreements',
        body:
          'The site operator must keep the relevant data processing terms or processor agreements in place with hosting, database, and email providers before using those providers for production personal data. These providers are used only to host the frontend, run the backend, store the database, deliver transactional email, maintain security, and provide operational reliability.',
      },
      {
        title: 'Cookies And Local Storage',
        body:
          'The app uses local storage for necessary features such as remembering the signed-in user locally, saved account details needed by the interface, theme preferences, and whether the cookie notice was shown. That notice acknowledgement is kept for 13 months, then the app shows it again. The backend may use a necessary session cookie to keep you authenticated. These storage items are used for core service functionality, not advertising or cross-site tracking. No advertising or analytics cookies are currently required for the core game.',
      },
      {
        title: 'IP Addresses And Logs',
        body:
          'The backend uses IP-derived request information for abuse prevention and rate limiting. Contact-form rate-limit entries are stored in server memory for the configured contact window, currently 1 hour by default. Authentication rate-limit entries are stored in server memory for 15 minutes by default. These in-memory entries are not used for advertising and disappear when the window expires or the server restarts. Hosting, reverse proxy, email, and database providers may also create operational logs containing IP addresses, timestamps, request metadata, or delivery metadata; those logs are kept for up to 30 days unless longer retention is required to investigate abuse, maintain security, resolve a legal issue, or comply with provider/legal obligations.',
      },
      {
        title: 'Security',
        body:
          'Passwords are stored as hashes, not plain text. Production deployments use HTTPS and restrict database, email provider, and server credentials to authorized maintainers only.',
      },
      {
        title: 'Contact And Requests',
        body:
          'For privacy questions or account data requests, use the contact page and include the username and registered email for the account. Account deletion is available from the profile menu. If you believe your rights were not respected, you may contact your local data protection authority, such as the CNIL in France.',
      },
    ],
  },
}

pages.tutorial = {
  title: 'Guide',
  intro:
    'Learn the controls and game modes before joining a room.',
  sections: [
    {
      title: 'Controls',
      body:
        'Use Left and Right to move the piece, Down for soft drop, Up to rotate, Space for hard drop, and C or Shift to hold the current piece. Escape opens the pause/options menu in solo and the game menu in multiplayer.',
    },
    {
      title: 'Solo',
      body:
        'Solo mode lets you play alone, clear lines, level up, and chase your best score. Your solo results can appear on your profile and in the solo leaderboard.',
    },
    {
      title: 'Multiplayer',
      body:
        'In multiplayer rooms, up to 8 players compete in real time on separate boards. Clearing multiple lines sends penalty lines to opponents, and the last player still alive wins.',
    },
    {
      title: 'Classic',
      body:
        'Classic is the standard competitive multiplayer mode. Everyone plays with the normal controls, and cleared lines can send penalties to the other boards.',
    },
    {
      title: 'Mirror',
      body:
        'Mirror reverses part of the controls: Left and Right move the piece in the opposite direction, Down triggers a hard drop, and Space becomes a soft drop.',
    },
    {
      title: 'Chaotic',
      body:
        'Chaotic keeps the competitive rules, but randomly swaps your current piece with the next piece during the game, which forces quick adaptation.',
    },
    {
      title: 'Invisible',
      body:
        'Invisible keeps the competitive rules, but hides the active falling piece. Players have to track its position from memory while placed pieces remain visible.',
    },
    {
      title: 'Giant',
      body:
        'Giant uses a larger board, giving players more space but also more rows and columns to manage under multiplayer pressure.',
    },
    {
      title: 'Alternating co-op',
      body:
        'Alternating co-op is a two-player mode on a shared board. Players control pieces turn by turn, so communication and timing are essential.',
    },
    {
      title: 'Role co-op',
      body:
        'Role co-op is a two-player mode on a shared board where one player handles rotation and the other handles movement and drops. Both players must coordinate to survive.',
    },
    {
      title: 'Spectator',
      body:
        'In multiplayer, eliminated players can watch the remaining boards instead of leaving immediately.',
    },
  ],
}

const localizedPages = {
  fr: {
    about: {
      title: 'À propos de Red Tetris',
      intro:
        'Red Tetris est un projet de l’école 42 que nous avons réalisé en équipe de deux. L’objectif était de créer une version web de Tetris en temps réel, avec un mode solo, des salles coopératives, des salles multijoueur et un gameplay synchronisé.',
      sections: [
        {
          title: 'Modes de jeu',
          body:
            'Le jeu propose un mode solo pour viser votre meilleur score, des salles coopératives où deux joueurs relèvent un défi commun, et des salles multijoueur où les joueurs s’affrontent en temps réel. En multijoueur compétitif, supprimer des lignes peut envoyer des pénalités aux adversaires, ce qui rend chaque partie plus stratégique.',
        },
        {
          title: 'Profils et scores',
          body:
            'Les profils des joueurs conservent des statistiques utiles comme les meilleurs scores, les parties jouées, les lignes supprimées, les niveaux atteints, les résultats solo, les scores coopératifs et les résultats multijoueur, afin de suivre leur progression au fil du temps.',
        },
        {
          title: 'Projet',
          body:
            'Ce projet a été développé à 42 par une équipe de deux personnes. Nous avons créé le frontend avec React et utilisé Socket.IO pour gérer la communication en temps réel entre les joueurs. Le backend gère les salles, l’état du jeu, la synchronisation, les scores et les événements multijoueur.',
        },
      ],
    },
    contact: {
      title: 'Contact',
      intro: 'Envoyez vos signalements de bugs, suggestions, questions de compte ou demandes de confidentialité directement à la boîte mail de Red Tetris. Les réponses sont envoyées à l’adresse e-mail liée à votre compte ou à celle que vous indiquez dans le formulaire.',
      sections: [
        {
          title: 'Signalements de bugs',
          body: 'Indiquez ce qui s’est passé, ce que vous attendiez, ainsi que la salle ou la page où le problème est apparu.',
        },
        {
          title: 'Suggestions',
          body: 'Partagez vos idées de modes de jeu, de contrôles, de fonctionnalités de profil, de score, ou tout ce qui pourrait améliorer le site.',
        },
        {
          title: 'Demandes de confidentialité',
          body:
            'Pour les demandes d’accès, de correction, de suppression ou d’opposition, indiquez le nom d’utilisateur et l’e-mail enregistré associés au compte afin que la demande puisse être vérifiée.',
        },
      ],
    },
  },
}

localizedPages.fr.tutorial = {
  title: 'Guide',
  intro:
    'Apprenez les controles et les modes de jeu avant de rejoindre une salle.',
  sections: [
    {
      title: 'Controles',
      body:
        'Utilisez Gauche et Droite pour deplacer la piece, Bas pour la descente rapide, Haut pour la rotation, Espace pour la chute instantanee, et C ou Maj pour garder la piece actuelle. Echap ouvre le menu pause/options en solo et le menu de jeu en multijoueur.',
    },
    {
      title: 'Solo',
      body:
        'Le mode solo vous permet de jouer seul, de supprimer des lignes, de monter de niveau et de viser votre meilleur score. Vos resultats solo peuvent apparaitre dans votre profil et dans le classement solo.',
    },
    {
      title: 'Multijoueur',
      body:
        'Dans les salles multijoueur, jusqu a 8 joueurs s affrontent en temps reel sur des plateaux separes. Supprimer plusieurs lignes envoie des lignes de penalite aux adversaires, et le dernier joueur encore en jeu gagne.',
    },
    {
      title: 'Classique',
      body:
        'Classique est le mode multijoueur competitif standard. Tout le monde joue avec les controles normaux, et les lignes supprimees peuvent envoyer des penalites aux autres plateaux.',
    },
    {
      title: 'Miroir',
      body:
        'Miroir inverse une partie des controles : Gauche et Droite deplacent la piece dans le sens oppose, Bas declenche une chute instantanee, et Espace devient une descente rapide.',
    },
    {
      title: 'Chaotique',
      body:
        'Chaotique conserve les regles competitives, mais echange aleatoirement votre piece actuelle avec la piece suivante pendant la partie, ce qui demande une adaptation rapide.',
    },
    {
      title: 'Invisible',
      body:
        'Invisible conserve les regles competitives, mais cache la piece active en chute. Les joueurs doivent donc suivre sa position de memoire, tandis que les pieces posees restent visibles.',
    },
    {
      title: 'Geant',
      body:
        'Geant utilise un plateau plus grand, ce qui donne plus d espace aux joueurs, mais aussi plus de lignes et de colonnes a gerer sous la pression du multijoueur.',
    },
    {
      title: 'Co-op alternee',
      body:
        'La co-op alternee est un mode a deux joueurs sur un plateau partage. Les joueurs controlent les pieces a tour de role, donc la communication et le timing sont essentiels.',
    },
    {
      title: 'Co-op roles',
      body:
        'La co-op roles est un mode a deux joueurs sur un plateau partage ou un joueur gere la rotation et l autre gere les deplacements et les chutes. Les deux joueurs doivent se coordonner pour survivre.',
    },
    {
      title: 'Spectateur',
      body:
        'En multijoueur, les joueurs elimines peuvent regarder les plateaux restants au lieu de quitter immediatement.',
    },
  ],
}

localizedPages.fr.terms = {
  title: 'Conditions d\u2019utilisation',
  intro:
    'Ces conditions decrivent les regles de base pour utiliser Red Tetris. En utilisant le site, vous acceptez de jouer loyalement et de respecter les autres joueurs.',
  sections: [
    {
      title: 'Utilisation du service',
      body:
        'Red Tetris est fourni pour un usage personnel de divertissement. N\u2019abusez pas du service, ne perturbez pas les parties, ne tentez pas d\u2019acces non autorise et n\u2019utilisez pas d\u2019automatisation pour destabiliser les salles, les scores ou les comptes.',
    },
    {
      title: 'Comptes et profils',
      body:
        'Vous etes responsable de l\u2019activite liee a votre nom d\u2019utilisateur et a vos identifiants. Utilisez des informations de compte exactes et n\u2019usurpez pas l\u2019identite d\u2019un autre joueur.',
    },
    {
      title: 'Parties et scores',
      body:
        'Les scores, classements, salles et resultats multijoueur peuvent etre reinitialises, corriges ou supprimes s\u2019ils sont affectes par des bugs, de la triche, un abus ou une maintenance.',
    },
    {
      title: 'Disponibilite',
      body:
        'Le site est fourni en l\u2019etat. Des fonctionnalites peuvent changer, devenir indisponibles ou etre retirees sans preavis pendant l\u2019evolution du projet.',
    },
  ],
}

localizedPages.fr.privacy = {
  title: 'Politique de confidentialite',
  intro:
    `Derniere mise a jour le ${PRIVACY_LAST_UPDATED}. Cette politique explique ce que Red Tetris collecte, pourquoi ces donnees sont utilisees, combien de temps elles sont conservees et comment exercer vos droits RGPD/GDPR.`,
  sections: [
    {
      title: 'Responsable du traitement',
      body:
        `${PRIVACY_CONTROLLER_NAME} sont responsables de decider comment les donnees de compte, de profil, de contact et de jeu sont utilisees pour ce deploiement de Red Tetris. Aucun delegue a la protection des donnees distinct n\u2019est nomme sauf indication contraire dans cette section.`,
    },
    {
      title: 'Informations collectees',
      body:
        'Le site peut stocker votre nom d\u2019utilisateur, votre adresse e-mail, le hash de votre mot de passe, vos parametres d\u2019avatar, vos scores solo, scores cooperatifs, resultats multijoueur, entrees de classement, jetons de reinitialisation de mot de passe, messages de contact et des donnees techniques comme les adresses IP utilisees pour les journaux de securite et la limitation anti-spam.',
    },
    {
      title: 'Utilisation des informations',
      body:
        'Les donnees servent a creer des comptes, authentifier les joueurs, restaurer l\u2019acces, afficher les profils, faire fonctionner les salles, enregistrer les scores, maintenir les classements, repondre aux demandes de contact, proteger le service contre les abus et ameliorer sa fiabilite.',
    },
    {
      title: 'Bases legales',
      body:
        'Les donnees de compte, de connexion, de profil et de jeu sont traitees pour fournir le service que vous demandez. Les donnees de securite, d\u2019anti-abus et de fiabilite sont traitees au titre de l\u2019interet legitime a proteger le site. Les messages de contact sont traites pour repondre a votre demande. Des obligations legales peuvent imposer la conservation de certains enregistrements lorsque c\u2019est applicable.',
    },
    {
      title: 'Conservation',
      body:
        'La suppression du compte peut etre demandee depuis le menu du profil. Les comptes supprimes sont d\u2019abord programmes pour suppression et peuvent etre restaures pendant 30 jours en se reconnectant puis en choisissant de restaurer le compte. Apres cette periode, le compte et les donnees de profil, de salle et de score associees sont supprimes definitivement de la base de donnees. Les jetons de reinitialisation de mot de passe sont temporaires et expirent rapidement. Les messages de contact et journaux techniques sont conserves uniquement le temps necessaire au support, a la securite et a la prevention des abus, puis supprimes ou anonymises lorsqu\u2019ils ne sont plus necessaires.',
    },
    {
      title: 'Vos droits',
      body:
        'Dans le cadre du RGPD/GDPR, vous pouvez demander l\u2019acces, la rectification, la suppression, la limitation, la portabilite ou l\u2019opposition au traitement de vos donnees personnelles. Les demandes recoivent une reponse sous un mois lorsque la loi l\u2019exige, sauf si la demande est complexe ou si une verification d\u2019identite est necessaire.',
    },
    {
      title: 'Demandes de suppression',
      body:
        'Les utilisateurs connectes peuvent exporter leurs donnees de compte ou supprimer leur compte depuis cette page de confidentialite. Vous pouvez aussi utiliser la page de contact pour les demandes de confidentialite qui necessitent un examen manuel. Certaines donnees peuvent etre conservees temporairement lorsque c\u2019est necessaire pour la securite, la prevention des abus, des obligations legales ou l\u2019integrite des sauvegardes.',
    },
    {
      title: 'Destinataires et prestataires',
      body:
        'Les donnees personnelles sont traitees par le backend du site, la base PostgreSQL, Railway pour l\u2019hebergement du backend et de la base de donnees, Vercel pour l\u2019hebergement du frontend et Resend pour les e-mails transactionnels comme la reinitialisation de mot de passe et les messages de contact. Les messages du formulaire de contact incluent l\u2019adresse e-mail que vous indiquez comme adresse de reponse. Les donnees ne sont pas vendues.',
    },
    {
      title: 'Transferts internationaux',
      body:
        'Railway, Vercel et Resend peuvent traiter des donnees hors de l\u2019Espace economique europeen, notamment aux Etats-Unis. Ces transferts s\u2019appuient sur les conditions de traitement des donnees et les garanties de transfert fournies par ces prestataires, y compris les clauses contractuelles types de l\u2019UE et, lorsque c\u2019est applicable, les engagements du Data Privacy Framework.',
      links: [
        { href: 'https://railway.com/legal/dpa', label: 'Railway DPA' },
        { href: 'https://vercel.com/legal/dpa', label: 'Vercel DPA' },
        { href: 'https://resend.com/legal/dpa', label: 'Resend DPA' },
      ],
    },
    {
      title: 'Accords de sous-traitance',
      body:
        'L\u2019operateur du site doit conserver les conditions de traitement des donnees ou accords de sous-traitance pertinents avec les prestataires d\u2019hebergement, de base de donnees et d\u2019e-mail avant d\u2019utiliser ces prestataires pour des donnees personnelles en production. Ces prestataires sont utilises uniquement pour heberger le frontend, executer le backend, stocker la base de donnees, envoyer les e-mails transactionnels, maintenir la securite et assurer la fiabilite operationnelle.',
    },
    {
      title: 'Cookies et stockage local',
      body:
        'L\u2019application utilise le stockage local pour des fonctions necessaires comme memoriser localement l\u2019utilisateur connecte, les informations de compte utiles a l\u2019interface, les preferences de theme et l\u2019affichage de l\u2019avis sur les cookies. L\u2019acceptation de cet avis est conservee 13 mois, puis l\u2019application l\u2019affiche a nouveau. Le backend peut utiliser un cookie de session necessaire pour vous garder authentifie. Ces elements servent aux fonctionnalites essentielles du service, pas a la publicite ni au suivi inter-sites. Aucun cookie publicitaire ou analytique n\u2019est actuellement requis pour le jeu principal.',
    },
    {
      title: 'Adresses IP et journaux',
      body:
        'Le backend utilise des informations de requete derivees de l\u2019IP pour la prevention des abus et la limitation de debit. Les entrees de limitation du formulaire de contact sont stockees en memoire serveur pendant la fenetre configuree, actuellement 1 heure par defaut. Les entrees de limitation d\u2019authentification sont stockees en memoire serveur pendant 15 minutes par defaut. Ces entrees en memoire ne sont pas utilisees a des fins publicitaires et disparaissent a l\u2019expiration de la fenetre ou au redemarrage du serveur. Les prestataires d\u2019hebergement, de proxy inverse, d\u2019e-mail et de base de donnees peuvent aussi creer des journaux operationnels contenant des adresses IP, horodatages, metadonnees de requete ou metadonnees de livraison ; ces journaux sont conserves jusqu\u2019a 30 jours sauf si une conservation plus longue est necessaire pour enqueter sur un abus, maintenir la securite, resoudre un probleme juridique ou respecter des obligations du prestataire ou de la loi.',
    },
    {
      title: 'Securite',
      body:
        'Les mots de passe sont stockes sous forme de hash, jamais en clair. Les deploiements de production utilisent HTTPS et limitent les identifiants de base de donnees, de fournisseur d\u2019e-mail et de serveur aux mainteneurs autorises uniquement.',
    },
    {
      title: 'Contact et demandes',
      body:
        'Pour les questions de confidentialite ou les demandes liees aux donnees de compte, utilisez la page de contact et indiquez le nom d\u2019utilisateur ainsi que l\u2019e-mail enregistre du compte. La suppression du compte est disponible depuis le menu du profil. Si vous pensez que vos droits n\u2019ont pas ete respectes, vous pouvez contacter votre autorite locale de protection des donnees, comme la CNIL en France.',
    },
  ],
}

const infoPageTranslations = {
  en: {
    informationPages: 'Information pages',
    back: '\u2190 Back',
    about: 'About',
    contact: 'Contact',
    terms: 'Terms',
    privacy: 'Privacy',
    accountPrivacyTools: 'Account privacy tools',
    accountTools: 'Account Tools',
    signedInAs: 'Signed in as',
    exporting: 'Exporting...',
    exportData: 'Export my data',
    deleting: 'Deleting...',
    deleteAccount: 'Delete my account',
    signInForPrivacyTools: 'Sign in to export your account data or delete your account directly.',
    exportError: 'Unable to export account data',
    exportSuccess: 'Account data export downloaded.',
    deleteConfirm: (username) =>
      `Delete the Red Tetris account "${username}" and its scores? This cannot be undone.`,
    deleteError: 'Unable to delete account',
    deleteSuccess: 'Account deleted.',
    tutorialCarousel: 'Tetris controls tutorial',
    previousControl: 'Show previous control',
    nextControl: 'Show next control',
    tutorialSlides: 'Tutorial slides',
    showTutorialSlide: (title) => `Show ${title}`,
  },
  fr: {
    informationPages: 'Pages d\u2019information',
    back: '\u2190 Retour',
    about: 'A propos',
    contact: 'Contact',
    terms: 'Conditions',
    privacy: 'Confidentialite',
    accountPrivacyTools: 'Outils de confidentialite du compte',
    accountTools: 'Outils du compte',
    signedInAs: 'Connecte en tant que',
    exporting: 'Export...',
    exportData: 'Exporter mes donnees',
    deleting: 'Suppression...',
    deleteAccount: 'Supprimer mon compte',
    signInForPrivacyTools: 'Connectez-vous pour exporter vos donnees de compte ou supprimer directement votre compte.',
    exportError: 'Impossible d\u2019exporter les donnees du compte',
    exportSuccess: 'Export des donnees du compte telecharge.',
    deleteConfirm: (username) =>
      `Supprimer le compte Red Tetris "${username}" et ses scores ? Cette action est irreversible.`,
    deleteError: 'Impossible de supprimer le compte',
    deleteSuccess: 'Compte supprime.',
    tutorialCarousel: 'Tutoriel des controles de Tetris',
    previousControl: 'Afficher le controle precedent',
    nextControl: 'Afficher le controle suivant',
    tutorialSlides: 'Diapositives du tutoriel',
    showTutorialSlide: (title) => `Afficher ${title}`,
  },
}

const contactTranslations = {
  en: {
    captchaLoadError: 'Unable to load captcha',
    captchaLoadStatus: 'Unable to load captcha. Please refresh the page.',
    requiredObjectAndMessage: 'Object and message are required.',
    requiredEmail: 'Email is required.',
    objectTooLong: `Object must be ${CONTACT_OBJECT_MAX_LENGTH} characters or fewer.`,
    messageTooLong: `Message must be ${CONTACT_MESSAGE_MAX_LENGTH} characters or fewer.`,
    requiredCaptcha: 'Captcha answer is required.',
    sendError: 'Unable to send message',
    sendSuccess: 'Message sent.',
    mailTimeout: 'Mail server timeout. Please try again later.',
    objectLabel: 'Object',
    messageLabel: 'Message',
    emailLabel: 'Email',
    captchaLabel: 'Captcha',
    honeypotLabel: 'Website',
    objectPlaceholder: 'Bug report or suggestion',
    messagePlaceholder: 'Describe the issue or idea...',
    emailPlaceholder: 'Your email',
    captchaLoading: 'Loading...',
    captchaPlaceholder: 'Answer',
    refreshCaptcha: 'Refresh captcha',
    sending: 'Sending...',
    sendMessage: 'Send message',
  },
  fr: {
    captchaLoadError: 'Impossible de charger le captcha',
    captchaLoadStatus: 'Impossible de charger le captcha. Veuillez actualiser la page.',
    requiredObjectAndMessage: 'L’objet et le message sont obligatoires.',
    requiredEmail: 'L’e-mail est obligatoire.',
    objectTooLong: `L’objet doit contenir ${CONTACT_OBJECT_MAX_LENGTH} caractères ou moins.`,
    messageTooLong: `Le message doit contenir ${CONTACT_MESSAGE_MAX_LENGTH} caractères ou moins.`,
    requiredCaptcha: 'La réponse au captcha est obligatoire.',
    sendError: 'Impossible d’envoyer le message',
    sendSuccess: 'Message envoyé.',
    mailTimeout: 'Délai d’attente du serveur mail dépassé. Veuillez réessayer plus tard.',
    objectLabel: 'Objet',
    messageLabel: 'Message',
    emailLabel: 'Email',
    captchaLabel: 'Captcha',
    honeypotLabel: 'Site web',
    objectPlaceholder: 'Signalement de bug ou suggestion',
    messagePlaceholder: 'Décrivez le problème ou l’idée...',
    emailPlaceholder: 'Votre e-mail',
    captchaLoading: 'Chargement...',
    captchaPlaceholder: 'Réponse',
    refreshCaptcha: 'Actualiser le captcha',
    sending: 'Envoi...',
    sendMessage: 'Envoyer le message',
  },
}

const tutorialCells = Array.from({ length: 140 }, (_, index) => index)
const tutorialPieceBlocks = [
  { row: 1, col: 5 },
  { row: 2, col: 4 },
  { row: 2, col: 5 },
  { row: 2, col: 6 },
]
const rotatedPieceBlocks = [
  { row: 1, col: 5 },
  { row: 2, col: 5 },
  { row: 2, col: 6 },
  { row: 3, col: 5 },
]
const heldPieceBlocks = [
  { row: 1, col: 4 },
  { row: 1, col: 5 },
  { row: 2, col: 4 },
  { row: 2, col: 5 },
]

const translateBlocks = (blocks, rowOffset, colOffset) => blocks.map((block) => ({
  row: block.row + rowOffset,
  col: block.col + colOffset,
}))

const tutorialInputRowOffset = 3

const tutorialControlTranslations = {
  en: {
    'move-left': {
      ariaLabel: 'Move left tutorial',
      key: 'Left',
      title: 'Move left',
      description: 'Press the left arrow to move the falling piece one column to the left.',
    },
    'move-right': {
      ariaLabel: 'Move right tutorial',
      key: 'Right',
      title: 'Move right',
      description: 'Press the right arrow to move the falling piece one column to the right.',
    },
    'soft-drop': {
      ariaLabel: 'Soft drop tutorial',
      key: 'Down',
      title: 'Soft drop',
      description: 'Hold the down arrow to make the piece fall faster while keeping control.',
    },
    'hard-drop': {
      ariaLabel: 'Hard drop tutorial',
      key: 'Space',
      title: 'Hard drop',
      description: 'Press Space to send the piece directly to its landing position.',
    },
    rotation: {
      ariaLabel: 'Rotation tutorial',
      key: 'Up',
      title: 'Rotate',
      description: 'Press Up to rotate the falling piece into the shape you need.',
    },
    hold: {
      ariaLabel: 'Hold piece tutorial',
      key: 'C / Shift',
      title: 'Hold piece',
      description: 'Press C or Shift to set the current piece aside and use it later.',
    },
  },
  fr: {
    'move-left': {
      ariaLabel: 'Tutoriel du deplacement a gauche',
      key: 'Gauche',
      title: 'Deplacer a gauche',
      description: 'Appuyez sur la fleche gauche pour deplacer la piece en chute d une colonne vers la gauche.',
    },
    'move-right': {
      ariaLabel: 'Tutoriel du deplacement a droite',
      key: 'Droite',
      title: 'Deplacer a droite',
      description: 'Appuyez sur la fleche droite pour deplacer la piece en chute d une colonne vers la droite.',
    },
    'soft-drop': {
      ariaLabel: 'Tutoriel de la descente rapide',
      key: 'Bas',
      title: 'Descente rapide',
      description: 'Maintenez la fleche bas pour faire descendre la piece plus vite tout en gardant le controle.',
    },
    'hard-drop': {
      ariaLabel: 'Tutoriel de la chute instantanee',
      key: 'Espace',
      title: 'Chute instantanee',
      description: 'Appuyez sur Espace pour envoyer la piece directement a sa position d atterrissage.',
    },
    rotation: {
      ariaLabel: 'Tutoriel de la rotation',
      key: 'Haut',
      title: 'Rotation',
      description: 'Appuyez sur Haut pour faire pivoter la piece en chute dans la forme dont vous avez besoin.',
    },
    hold: {
      ariaLabel: 'Tutoriel de la piece gardee',
      key: 'C / Shift',
      title: 'Garder la piece',
      description: 'Appuyez sur C ou Maj pour mettre la piece actuelle de cote et la reprendre plus tard.',
    },
  },
}

const tutorialControls = [
  {
    action: 'move-left',
    ariaLabel: 'Tutoriel du déplacement à gauche',
    key: 'Gauche',
    title: 'Déplacer à gauche',
    description: 'Appuyez sur la flèche gauche pour déplacer la pièce en chute d’une colonne vers la gauche.',
    activeBlocks: tutorialPieceBlocks,
    targetBlocks: translateBlocks(tutorialPieceBlocks, 0, -1),
    phantomBlocks: translateBlocks(tutorialPieceBlocks, tutorialInputRowOffset, -1),
  },
  {
    action: 'move-right',
    ariaLabel: 'Tutoriel du déplacement à droite',
    key: 'Droite',
    title: 'Déplacer à droite',
    description: 'Appuyez sur la flèche droite pour déplacer la pièce en chute d’une colonne vers la droite.',
    activeBlocks: tutorialPieceBlocks,
    targetBlocks: translateBlocks(tutorialPieceBlocks, 0, 1),
    phantomBlocks: translateBlocks(tutorialPieceBlocks, tutorialInputRowOffset, 1),
  },
  {
    action: 'soft-drop',
    ariaLabel: 'Tutoriel de la descente rapide',
    key: 'Bas',
    title: 'Descente rapide',
    description: 'Maintenez la flèche bas pour faire descendre la pièce plus vite tout en gardant le contrôle.',
    activeBlocks: tutorialPieceBlocks,
    targetBlocks: translateBlocks(tutorialPieceBlocks, 1, 0),
    phantomBlocks: translateBlocks(tutorialPieceBlocks, tutorialInputRowOffset + 1, 0),
  },
  {
    action: 'hard-drop',
    ariaLabel: 'Tutoriel de la chute instantanée',
    key: 'Espace',
    title: 'Chute instantanée',
    description: 'Appuyez sur Espace pour envoyer la pièce directement à sa position d’atterrissage.',
    activeBlocks: tutorialPieceBlocks,
    targetBlocks: translateBlocks(tutorialPieceBlocks, 12, 0),
    phantomBlocks: translateBlocks(tutorialPieceBlocks, 12, 0),
  },
  {
    action: 'rotation',
    ariaLabel: 'Tutoriel de la rotation',
    key: 'Haut',
    title: 'Rotation',
    description: 'Appuyez sur Haut pour faire pivoter la pièce en chute dans la forme dont vous avez besoin.',
    activeBlocks: tutorialPieceBlocks,
    targetBlocks: rotatedPieceBlocks,
    phantomBlocks: translateBlocks(rotatedPieceBlocks, tutorialInputRowOffset, 0),
  },
  {
    action: 'hold',
    ariaLabel: 'Tutoriel de la pièce gardée',
    key: 'C / Shift',
    title: 'Garder la pièce',
    description: 'Appuyez sur C ou Maj pour mettre la pièce actuelle de côté et la reprendre plus tard.',
    activeBlocks: tutorialPieceBlocks,
    targetBlocks: heldPieceBlocks,
    phantomBlocks: translateBlocks(heldPieceBlocks, tutorialInputRowOffset, 0),
  },
]

function TutorialBoardDemo({ demo }) {
  return (
    <section className={`tutorial-demo ${demo.action}`} aria-label={demo.ariaLabel}>
      <div className="tutorial-board" aria-hidden="true">
        <div className="tutorial-board-grid">
          {tutorialCells.map((cell) => (
            <span key={cell} className="tutorial-cell" />
          ))}
        </div>

        <div className={`tutorial-piece active ${demo.action}`}>
          {demo.activeBlocks.map((block) => (
            <span
              key={`${block.row}-${block.col}`}
              className="tutorial-piece-block"
              style={{ gridColumn: block.col, gridRow: block.row }}
            />
          ))}
        </div>

        <div className={`tutorial-piece phantom ${demo.action}`}>
          {demo.phantomBlocks.map((block) => (
            <span
              key={`${block.row}-${block.col}`}
              className="tutorial-piece-block"
              style={{ gridColumn: block.col, gridRow: block.row }}
            />
          ))}
        </div>

        <div className={`tutorial-piece target ${demo.action}`}>
          {demo.targetBlocks.map((block) => (
            <span
              key={`${block.row}-${block.col}`}
              className="tutorial-piece-block"
              style={{ gridColumn: block.col, gridRow: block.row }}
            />
          ))}
        </div>

        <div className={`tutorial-action-cue ${demo.action}`} aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
      </div>

      <div className="tutorial-demo-panel">
        <span className="tutorial-key">{demo.key}</span>
        <div>
          <h2>{demo.title}</h2>
          <p>{demo.description}</p>
        </div>
      </div>
    </section>
  )
}

function InfoPage({ type }) {
  const [language, setLanguage] = useState(getSavedLanguage)
  const page = localizedPages[language]?.[type] || pages[type] || pages.about
  const infoText = infoPageTranslations[language] || infoPageTranslations[DEFAULT_LANGUAGE]
  const contactText = contactTranslations[language] || contactTranslations[DEFAULT_LANGUAGE]
  const isTutorialPage = type === 'tutorial'
  const [theme] = useState(() => (
    localStorage.getItem(THEME_STORAGE_KEY) === 'dark' ? 'dark' : 'light'
  ))
  const [contactObject, setContactObject] = useState('')
  const [contactMessage, setContactMessage] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [contactCaptcha, setContactCaptcha] = useState({ question: '', token: '' })
  const [contactCaptchaAnswer, setContactCaptchaAnswer] = useState('')
  const [isContactCaptchaLoading, setIsContactCaptchaLoading] = useState(false)
  const [contactStatus, setContactStatus] = useState({ type: '', message: '' })
  const [isContactSending, setIsContactSending] = useState(false)
  const [privacyStatus, setPrivacyStatus] = useState({ type: '', message: '' })
  const [isExportingData, setIsExportingData] = useState(false)
  const [isDeletingAccount, setIsDeletingAccount] = useState(false)
  const [savedAuthUser, setSavedAuthUser] = useState(() => getSavedAuthUser())
  const [activeTutorialIndex, setActiveTutorialIndex] = useState(0)
  const starsRef = useRef(null)

  useEffect(() => {
    const syncSavedLanguage = () => {
      setLanguage(getSavedLanguage())
    }

    window.addEventListener('storage', syncSavedLanguage)
    window.addEventListener(LANGUAGE_CHANGE_EVENT, syncSavedLanguage)

    return () => {
      window.removeEventListener('storage', syncSavedLanguage)
      window.removeEventListener(LANGUAGE_CHANGE_EVENT, syncSavedLanguage)
    }
  }, [])

  function getSavedAuthUser() {
    try {
      const savedAuth = JSON.parse(localStorage.getItem(AUTH_STORAGE_KEY) || '{}')
      return {
        username: typeof savedAuth?.username === 'string' ? savedAuth.username.trim() : '',
        email: typeof savedAuth?.email === 'string' ? savedAuth.email.trim().toLowerCase() : '',
      }
    } catch {
      return { username: '', email: '' }
    }
  }

  const getSavedUserEmail = () => getSavedAuthUser().email
  const savedUserEmail = savedAuthUser.email

  const loadContactCaptcha = useCallback(async () => {
    setIsContactCaptchaLoading(true)

    try {
      const response = await apiFetch('/api/contact/captcha')
      const payload = await response.json().catch(() => ({}))

      if (!response.ok || !payload?.question || !payload?.token) {
        throw new Error(contactText.captchaLoadError)
      }

      setContactCaptcha({
        question: payload.question,
        token: payload.token,
      })
      setContactCaptchaAnswer('')
    } catch {
      setContactCaptcha({ question: '', token: '' })
      setContactStatus({
        type: 'error',
        message: contactText.captchaLoadStatus,
      })
    } finally {
      setIsContactCaptchaLoading(false)
    }
  }, [contactText])

  useEffect(() => {
    if (theme !== 'dark' || !starsRef.current) return

    const updateStarPositions = () => {
      const positions = Array.from({ length: 25 }, () =>
        `${Math.random() * 100}% ${Math.random() * 100}%`
      ).join(', ')

      starsRef.current.style.animation = 'none'
      starsRef.current.style.backgroundPosition = positions
      starsRef.current.offsetHeight
      starsRef.current.style.animation = 'fadeInOut 3s ease-in-out infinite'
    }

    updateStarPositions()
    const interval = setInterval(updateStarPositions, 3000)
    return () => clearInterval(interval)
  }, [theme])

  useEffect(() => {
    if (type === 'contact') {
      loadContactCaptcha()
    }
  }, [loadContactCaptcha, type])

  const handleContactSubmit = async (event) => {
    event.preventDefault()

    const object = contactObject.trim()
    const message = contactMessage.trim()
    const userEmail = getSavedUserEmail() || contactEmail.trim().toLowerCase()
    const captchaAnswer = contactCaptchaAnswer.trim()

    if (!object || !message) {
      setContactStatus({ type: 'error', message: contactText.requiredObjectAndMessage })
      return
    }

    if (!userEmail) {
      setContactStatus({ type: 'error', message: contactText.requiredEmail })
      return
    }

    if (object.length > CONTACT_OBJECT_MAX_LENGTH) {
      setContactStatus({ type: 'error', message: contactText.objectTooLong })
      return
    }

    if (message.length > CONTACT_MESSAGE_MAX_LENGTH) {
      setContactStatus({ type: 'error', message: contactText.messageTooLong })
      return
    }

    if (!contactCaptcha.token || !captchaAnswer) {
      setContactStatus({ type: 'error', message: contactText.requiredCaptcha })
      return
    }

    setIsContactSending(true)
    setContactStatus({ type: '', message: '' })

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), CONTACT_TIMEOUT_MS)

    try {
      const response = await apiFetch('/api/contact', {
        method: 'POST',
        signal: controller.signal,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          object,
          message,
          userEmail,
          captchaToken: contactCaptcha.token,
          captchaAnswer,
          website: event.currentTarget.elements.website?.value || '',
        }),
      })
      const payload = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(payload?.error || contactText.sendError)
      }

      setContactObject('')
      setContactMessage('')
      setContactEmail('')
      await loadContactCaptcha()
      setContactStatus({ type: 'success', message: contactText.sendSuccess })
    } catch (err) {
      await loadContactCaptcha()
      setContactStatus({
        type: 'error',
        message: err?.name === 'AbortError'
          ? contactText.mailTimeout
          : err?.message || contactText.sendError,
      })
    } finally {
      clearTimeout(timeoutId)
      setIsContactSending(false)
    }
  }

  const handleExportAccountData = async () => {
    setIsExportingData(true)
    setPrivacyStatus({ type: '', message: '' })

    try {
      const response = await apiFetch('/api/account/export')
      const payload = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(payload?.error || infoText.exportError)
      }

      const blob = new Blob([JSON.stringify(payload, null, 2)], {
        type: 'application/json',
      })
      const downloadUrl = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = downloadUrl
      link.download = `red-tetris-${payload?.account?.username || 'account'}-data.json`
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(downloadUrl)

      setPrivacyStatus({ type: 'success', message: infoText.exportSuccess })
    } catch (err) {
      setPrivacyStatus({
        type: 'error',
        message: err?.message || infoText.exportError,
      })
    } finally {
      setIsExportingData(false)
    }
  }

  const handleDeleteAccount = async () => {
    /* v8 ignore next -- the delete button is only rendered when a saved username exists. @preserve */
    if (!savedAuthUser.username) return

    const confirmed = window.confirm(
      infoText.deleteConfirm(savedAuthUser.username)
    )
    if (!confirmed) return

    setIsDeletingAccount(true)
    setPrivacyStatus({ type: '', message: '' })

    try {
      const response = await apiFetch('/api/account', { method: 'DELETE' })
      const payload = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(payload?.error || infoText.deleteError)
      }

      localStorage.removeItem(AUTH_STORAGE_KEY)
      setSavedAuthUser({ username: '', email: '' })
      setPrivacyStatus({ type: 'success', message: infoText.deleteSuccess })
    } catch (err) {
      setPrivacyStatus({
        type: 'error',
        message: err?.message || infoText.deleteError,
      })
    } finally {
      setIsDeletingAccount(false)
    }
  }

  const tutorialText = tutorialControlTranslations[language] || tutorialControlTranslations[DEFAULT_LANGUAGE]
  const activeTutorialBase = tutorialControls[activeTutorialIndex]
  const activeTutorial = {
    ...activeTutorialBase,
    ...tutorialText[activeTutorialBase.action],
  }
  const showPreviousTutorial = () => {
    setActiveTutorialIndex((currentIndex) => (
      currentIndex === 0 ? tutorialControls.length - 1 : currentIndex - 1
    ))
  }
  const showNextTutorial = () => {
    setActiveTutorialIndex((currentIndex) => (
      currentIndex === tutorialControls.length - 1 ? 0 : currentIndex + 1
    ))
  }
  const handleTutorialCarouselKeyDown = (event) => {
    if (event.key === 'ArrowLeft') {
      event.preventDefault()
      showPreviousTutorial()
      return
    }

    if (event.key === 'ArrowRight') {
      event.preventDefault()
      showNextTutorial()
    }
  }

  return (
    <>
      <div className={`sky-background ${theme === 'dark' ? 'dark' : ''}`}>
        {theme === 'dark' && <div ref={starsRef} className="stars" />}
        <GoodClouds />
        <TetriminosClouds />
      </div>

      <div className="content-wrapper info-page-wrapper">
        <main className="info-page-card">
          <nav className="info-page-nav" aria-label={infoText.informationPages}>
            <Link className="info-page-back" to="/">{infoText.back}</Link>
            {!isTutorialPage && (
              <>
                <Link to="/about">{infoText.about}</Link>
                <Link to="/contact">{infoText.contact}</Link>
                <Link to="/terms">{infoText.terms}</Link>
                <Link to="/privacy-policy">{infoText.privacy}</Link>
              </>
            )}
          </nav>

          <h1>{page.title}</h1>
          <p className="info-page-intro">{page.intro}</p>

          {type === 'privacy' && (
            <section className="privacy-account-tools" aria-label={infoText.accountPrivacyTools}>
              <h2>{infoText.accountTools}</h2>
              {savedAuthUser.username ? (
                <>
                  <p>
                    {infoText.signedInAs} <strong>{savedAuthUser.username}</strong>.
                  </p>
                  <div className="privacy-tool-actions">
                    <button
                      className="info-page-action"
                      type="button"
                      onClick={handleExportAccountData}
                      disabled={isExportingData || isDeletingAccount}
                    >
                      {isExportingData ? infoText.exporting : infoText.exportData}
                    </button>
                    <button
                      className="info-page-action danger"
                      type="button"
                      onClick={handleDeleteAccount}
                      disabled={isExportingData || isDeletingAccount}
                    >
                      {isDeletingAccount ? infoText.deleting : infoText.deleteAccount}
                    </button>
                  </div>
                </>
              ) : (
                <p>{infoText.signInForPrivacyTools}</p>
              )}
              {privacyStatus.message && (
                <p className={`contact-status ${privacyStatus.type}`} role="status">
                  {privacyStatus.message}
                </p>
              )}
            </section>
          )}

          {type === 'tutorial' && (
            <div
              className="tutorial-carousel"
              aria-roledescription="carousel"
              aria-label={infoText.tutorialCarousel}
              tabIndex={0}
              onKeyDown={handleTutorialCarouselKeyDown}
            >
              <button
                className="tutorial-carousel-arrow previous"
                type="button"
                onClick={showPreviousTutorial}
                aria-label={infoText.previousControl}
              >
                ‹
              </button>

              <div className="tutorial-carousel-slide" aria-live="polite">
                <TutorialBoardDemo
                  key={activeTutorial.action}
                  demo={activeTutorial}
                />
              </div>

              <button
                className="tutorial-carousel-arrow next"
                type="button"
                onClick={showNextTutorial}
                aria-label={infoText.nextControl}
              >
                ›
              </button>

              <div
                className="tutorial-carousel-dots"
                aria-label={infoText.tutorialSlides}
              >
                {tutorialControls.map((demo, index) => (
                  <button
                    key={demo.action}
                    className={`tutorial-carousel-dot${index === activeTutorialIndex ? ' active' : ''}`}
                    type="button"
                    onClick={() => setActiveTutorialIndex(index)}
                    aria-label={infoText.showTutorialSlide((tutorialText[demo.action] || demo).title)}
                    aria-current={index === activeTutorialIndex ? 'true' : undefined}
                  />
                ))}
              </div>
            </div>
          )}

          {type === 'contact' && (
            <form className="contact-form" onSubmit={handleContactSubmit}>
              <label htmlFor="contact-object">{contactText.objectLabel}</label>
              <input
                id="contact-object"
                type="text"
                value={contactObject}
                onChange={(event) => setContactObject(event.target.value)}
                maxLength={CONTACT_OBJECT_MAX_LENGTH}
                placeholder={contactText.objectPlaceholder}
                disabled={isContactSending}
              />

              <label htmlFor="contact-message">{contactText.messageLabel}</label>
              <textarea
                id="contact-message"
                value={contactMessage}
                onChange={(event) => setContactMessage(event.target.value)}
                maxLength={CONTACT_MESSAGE_MAX_LENGTH}
                rows={7}
                placeholder={contactText.messagePlaceholder}
                disabled={isContactSending}
              />
              <p className="contact-character-count">
                {contactMessage.length.toLocaleString()} / {CONTACT_MESSAGE_MAX_LENGTH.toLocaleString()}
              </p>

              {!savedUserEmail && (
                <>
                  <label htmlFor="contact-email">{contactText.emailLabel}</label>
                  <input
                    id="contact-email"
                    type="email"
                    value={contactEmail}
                    onChange={(event) => setContactEmail(event.target.value)}
                    placeholder={contactText.emailPlaceholder}
                    disabled={isContactSending}
                  />
                </>
              )}

              <div className="contact-captcha">
                <label htmlFor="contact-captcha">
                  {contactText.captchaLabel}: {contactCaptcha.question || contactText.captchaLoading}
                </label>
                <div className="contact-captcha-row">
                  <input
                    id="contact-captcha"
                    type="text"
                    inputMode="numeric"
                    value={contactCaptchaAnswer}
                    onChange={(event) => setContactCaptchaAnswer(event.target.value)}
                    placeholder={contactText.captchaPlaceholder}
                    disabled={isContactSending || isContactCaptchaLoading || !contactCaptcha.token}
                  />
                  <button
                    className="contact-captcha-refresh"
                    type="button"
                    onClick={loadContactCaptcha}
                    disabled={isContactSending || isContactCaptchaLoading}
                    aria-label={contactText.refreshCaptcha}
                  >
                    ↻
                  </button>
                </div>
              </div>

              <div className="contact-honeypot" aria-hidden="true">
                <label htmlFor="contact-website">{contactText.honeypotLabel}</label>
                <input
                  id="contact-website"
                  name="website"
                  type="text"
                  tabIndex={-1}
                  autoComplete="off"
                  disabled={isContactSending}
                />
              </div>

              {contactStatus.message && (
                <p className={`contact-status ${contactStatus.type}`} role="status">
                  {contactStatus.message}
                </p>
              )}

              <button
                className="info-page-action contact-submit"
                type="submit"
                disabled={isContactSending}
              >
                {isContactSending ? contactText.sending : contactText.sendMessage}
              </button>
            </form>
          )}

          <div className="info-page-sections">
            {page.sections.map((section) => (
              <section key={section.title} className="info-page-section">
                <h2>{section.title}</h2>
                <p>{section.body}</p>
                {section.links && (
                  <div className="info-page-action-row">
                    {section.links.map((link) => (
                      <a
                        key={link.href}
                        className="info-page-action"
                        href={link.href}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {link.label}
                      </a>
                    ))}
                  </div>
                )}
              </section>
            ))}
          </div>
        </main>
      </div>
    </>
  )
}

export default InfoPage

