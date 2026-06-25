const CONTACT_OBJECT_MAX_LENGTH = 120
const CONTACT_MESSAGE_MAX_LENGTH = 4000
const PRIVACY_LAST_UPDATED = 'May 5, 2026'
const PRIVACY_CONTROLLER_NAME = 'Thibault and Riham'

const pages = {
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
  }

pages.tutorial = {
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
pages.terms = {
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
pages.privacy = {
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

const fr = {
  footer: {
    siteInformation: 'Informations du site',
    about: 'A propos',
    contact: 'Contact',
    terms: 'Conditions',
    privacy: 'Confidentialite',
  },
  roomNotice: {
    roomUsed: 'Salle déjà utilisée',
    userConnected: 'Utilisateur déjà connecté',
  },
  appUi: {
    openProfileMenu: 'Ouvrir le menu du profil',
    profileTitle: 'Profil',
    saveProfile: 'Enregistrer',
    connectionLost: 'Connexion perdue. Reconnexion...',
    serverUnavailable: 'Serveur indisponible. Nouvelle tentative...',
    serverError: 'Erreur serveur',
    reconnected: 'Reconnecte.',
    reconnecting: 'Reconnexion...',
    reconnectFailed: 'Impossible de se reconnecter. Veuillez actualiser.',
  },
  spectate: {
    missingUsername: 'Pseudo manquant dans l\u2019URL spectateur.',
    roomNotFound: 'Salle introuvable',
    unauthorized: 'Spectateur non autorise',
    loading: 'Chargement du mode spectateur...',
    back: 'Retour',
    gameOver: 'Partie terminee',
    winner: 'Vainqueur',
    noWinner: 'Aucun vainqueur',
    playAgain: 'Rejouer',
    backToMenu: 'Retour au menu',
  },
  auth: {
    languageLabel: 'Langue',
    loginTab: 'Connexion',
    registerTab: 'Inscription',
    loginTitle: 'Connectez-vous',
    registerTitle: 'Creer votre compte',
    forgotTitle: 'Reinitialiser votre mot de passe',
    resetTitle: 'Choisir un nouveau mot de passe',
    username: 'Pseudo',
    email: 'Email',
    password: 'Mot de passe',
    confirmPassword: 'Confirmer le mot de passe',
    showPassword: 'Afficher le mot de passe',
    hidePassword: 'Masquer le mot de passe',
    showConfirmPassword: 'Afficher la confirmation du mot de passe',
    hideConfirmPassword: 'Masquer la confirmation du mot de passe',
    randomize: 'Aleatoire',
    skin: 'Peau',
    eyes: 'Yeux',
    mouth: 'Bouche',
    pleaseWait: 'Veuillez patienter...',
    register: 'Inscription',
    sendResetLink: 'Envoyer le lien',
    updatePassword: 'Mettre a jour',
    login: 'Connexion',
    forgotPassword: 'Mot de passe oublie ?',
    restoreAccount: 'Restaurer le compte',
    backToLogin: 'Retour a la connexion',
    missingData: 'Donnees manquantes',
    invalidEmail: 'Email invalide',
    invalidPassword: 'Mot de passe invalide',
    passwordTooShort: 'Le mot de passe doit contenir au moins 8 caracteres',
    passwordUppercase: 'Le mot de passe doit contenir au moins 1 majuscule',
    passwordLowercase: 'Le mot de passe doit contenir au moins 1 minuscule',
    passwordNumber: 'Le mot de passe doit contenir au moins 1 chiffre',
    passwordSpecial: 'Le mot de passe doit contenir au moins 1 caractere special',
    passwordMismatch: 'Les mots de passe ne correspondent pas',
    invalidResetLink: 'Lien de reinitialisation invalide ou expire',
    authenticationFailed: 'Echec de l authentification',
    accountCreated: 'Compte cree. Veuillez vous connecter.',
    passwordResetGenerated: 'Lien de reinitialisation genere',
    passwordUpdated: 'Mot de passe mis a jour',
    serverUnavailable: 'Serveur indisponible',
    unableToRestore: 'Impossible de restaurer le compte',
  },
  profileMenu: {
    createTitle: 'Creer votre profil',
    profileTitle: 'Profil',
    randomize: 'Aleatoire',
    skin: 'Peau',
    eyes: 'Yeux',
    mouth: 'Bouche',
    usernamePlaceholder: 'Pseudo',
    play: 'Jouer',
    save: 'Enregistrer',
    disconnect: 'Se deconnecter',
    missingData: 'Donnees manquantes',
    invalidUsername: 'Pseudo invalide',
    serverUnavailable: 'Serveur indisponible',
    serverNotResponding: 'Le serveur ne repond pas',
    unknownError: 'Erreur inconnue',
    profileUpdateFailed: 'Echec de la mise a jour du profil',
  },
  menu: {
    heading: 'Sélection du mode de jeu',
    soloTitle: 'Solo',
    soloDescription: 'Jouez seul et battez votre meilleur score',
    multiplayerTitle: 'Multijoueur',
    multiplayerDescription: "Affrontez d'autres joueurs",
    options: 'Paramètres',
    shop: 'Boutique',
  },
  shop: {
    kicker: 'Cosmétiques',
    heading: 'Boutique',
    pack_classic: 'Classique',
    pack_plain: 'Uni',
    pack_neon: 'Néon',
    pack_pastel: 'Pastel',
    pack_retro: 'Rétro',
    pack_ocean: 'Océan',
    pack_bubble: 'Bulle',
    pack_fire: 'Feu',
    pack_arcane: 'Arcane',
    equipped: 'Équipé',
    equip: 'Équiper',
    buy: 'Acheter',
    notEnough: 'Pièces insuffisantes',
    comingSoon: 'Bientôt',
    back: 'Retour',
    sectionTetrominoes: 'Tetrominos',

  },
  options: {
    heading: 'Paramètres',
    lightTheme: 'Thème clair',
    darkTheme: 'Thème sombre',
    switchToLight: 'Passer au mode clair',
    switchToDark: 'Passer au mode sombre',
    sound: 'Son',
    enabled: 'Activé',
    disabled: 'Désactivé',
    guide: 'Guide',
    guideDescription: 'Contrôles et modes',
    language: 'Langue',
    languageDescription: "Choisir la langue d'affichage",
    languageOptions: 'Options de langue',
    back: 'Retour',
  },
  playerStats: {
  loadingStats: 'Chargement des stats...',
  playerStatsTitle: 'Stats du joueur',
  advancedStatsTitle: 'Stats avancees',
  closeAdvancedStats: 'Fermer les stats avancees',
  timePlayed: 'Temps joue',
  total: 'Total',
  solo: 'Solo',
  coop: 'Co-op',
  multi: 'Multi',
  soloGames: 'Parties solo',
  highestSoloScore: 'Meilleur score solo',
  multiplayerGames: 'Parties multijoueur',
  multiplayerWins: 'Victoires multijoueur',
  multiplayerLosses: 'Defaites multijoueur',
  multiplayerWinrate: 'Taux de victoire multijoueur',
  advancedStatsButton: 'Stats avancees',
  games: 'Parties',
  winLoss: 'Victoires / Defaites',
  winLossRatio: 'Ratio V/D',
  highestScore: 'Meilleur score',
  averageScore: 'Score moyen',
  highestLevel: 'Meilleur niveau',
  highestLines: 'Plus de lignes',
  totalLines: 'Lignes totales',
  highestSent: 'Maximum envoye',
  totalSent: 'Total envoye',
  highestTetris: 'Meilleur tetris',
  totalTetris: 'Tetris total',
  longestGame: 'Partie la plus longue',
},
  leaderboard: {
    title: '🏆 Classement',
    solo: 'Solo',
    coop: 'Duo coop',
    loading: 'Chargement…',
    playerOne: 'Joueur 1',
    playerTwo: 'Joueur 2',
    previousPage: 'Page précédente',
    nextPage: 'Page suivante',
  },
  rooms: {
    passwordRequired: 'Mot de passe requis',
    invalidPassword: 'Mot de passe invalide',
    title: 'Salles multijoueur',
    createRoom: 'Créer une salle',
    chooseRoomType: 'Choisir le type de salle',
    cooperative: 'Coopérative',
    multiplayer: 'Multijoueur',
    optionalPassword: 'Mot de passe optionnel',
    publicRoomPlaceholder: 'Laisser vide pour une salle publique',
    availableRooms: 'Salles disponibles',
    emptyRooms: 'Aucune salle disponible. Créez-en une !',
    password: 'Mot de passe',
    host: 'Hôte',
    roomPasswordPlaceholder: 'Mot de passe de la salle',
    hidePassword: 'Masquer le mot de passe',
    showPassword: 'Afficher le mot de passe',
    joined: 'Rejointe',
    full: 'Complet',
    enter: 'Entrer',
    join: 'Rejoindre',
    back: 'Retour',
  },
  createRoom: {
    joinErrors: {
      'Username already connected': 'Ce pseudo est déjà connecté dans cette salle.',
      'Room is full': 'Cette salle est déjà complète.',
      'User is already in a room': 'Ce joueur est déjà occupé dans une autre salle.',
      default: 'Cette salle est déjà occupée. Essayez une autre salle ou un autre pseudo.',
    },
    roomActionErrors: {
      used: 'Salle déjà utilisée.',
      invalidName: 'Nom de salle invalide',
      invalidMode: 'Mode de jeu invalide',
      hostRenameOnly: 'Seul l’hôte peut renommer la salle.',
      default: 'Impossible de mettre à jour la salle pour le moment.',
    },
    modes: {
      classic: { label: 'Classique', description: 'Tetris compétitif standard où les lignes supprimées envoient des pénalités aux adversaires.' },
      mirror: { label: 'Miroir', description: 'Les contrôles sont inversés, donc les déplacements et les chutes se comportent différemment.' },
      chaotic: { label: 'Chaotique', description: 'Votre pièce actuelle et la pièce suivante peuvent être échangées aléatoirement pendant la partie.' },
      invisible: { label: 'Invisible', description: 'La pièce active devient plus difficile à suivre pendant sa chute.' },
      giant: { label: 'Géant', description: 'Jouez sur un plateau plus grand, avec plus d’espace et une survie plus longue.' },
      cooperative: { label: 'Co-op alternée', description: 'Deux joueurs partagent un plateau et jouent à tour de rôle.' },
      cooperative_roles: { label: 'Co-op rôles', description: 'Deux joueurs partagent un plateau avec des rôles séparés pour les déplacements et la rotation.' },
    },
    invalidPassword: 'Mot de passe invalide',
    passwordRequired: 'Mot de passe requis',
    joinFailed: 'Impossible de rejoindre la salle',
    editRoomName: 'Modifier le nom de la salle',
    currentPassword: 'Mot de passe actuel de la salle',
    password: 'Mot de passe',
    roomPassword: 'Mot de passe de la salle',
    hidePassword: 'Masquer le mot de passe',
    showPassword: 'Afficher le mot de passe',
    joinRoom: 'Rejoindre la salle',
    back: 'Retour',
    gameMode: 'Mode de jeu',
    players: 'Joueurs',
    waitingPlayers: 'En attente de joueurs...',
    startGame: 'Lancer la partie',
  },
  game: {
    controls: [
      { keys: 'Flèche gauche / droite', action: 'Déplacer' },
      { keys: 'Flèche haut', action: 'Rotation' },
      { keys: 'Flèche bas', action: 'Descente rapide' },
      { keys: 'Espace', action: 'Chute instantanée' },
      { keys: 'C / Maj', action: 'Garder' },
      { keys: 'Échap', action: 'Options' },
    ],
    options: 'Paramètres',
    score: 'Score',
    lines: 'Lignes',
    level: 'Niveau',
    hold: 'Réserve',
    holdAria: 'Pièce en réserve',
    boardAria: 'Plateau de Tetris',
    next: 'Suivante',
    nextAria: 'Pièce suivante',
    keyboardControlsAria: 'Contrôles au clavier',
    countdownAria: 'Compte a rebours',
    countdownGo: 'Go',
    pause: 'Pause',
    gameMenu: 'Menu de jeu',
    soundOn: 'Son : activé',
    soundOff: 'Son : désactivé',
    resume: 'Reprendre',
    leaveGame: 'Quitter la partie',
    yourTurn: 'À VOUS',
    playing: 'Joue',
    playingFallback: 'Joue : ...',
    rotateRole: 'ROTATION',
    placeRole: 'PLACEMENT',
    assigningRole: 'ATTRIBUTION DU RÔLE...',
    opponents: 'Adversaires',
    opponentBoard: 'plateau',
  },
  gameOver: {
    gameOver: 'Partie terminée',
    won: 'Vous avez gagné',
    lost: 'Vous avez perdu',
    winner: 'Vainqueur',
    playAgain: 'Rejouer',
    spectate: 'Regarder',
    backToMenu: 'Retour au menu',
  },
  spectator: {
    title: 'Mode spectateur',
    empty: 'Aucun joueur a regarder.',
    back: 'Retour',
    watching: 'Spectateur de',
    previous: 'Precedent',
    next: 'Suivant',
    score: 'Score',
    lines: 'Lignes',
    level: 'Niveau',
    hold: 'Reserve',
    nextPiece: 'Suivante',
    holdPieceLabel: 'Piece en reserve',
    nextPieceLabel: 'Piece suivante',
    boardLabel: 'Plateau de Tetris',
    opponents: 'Adversaires',
    opponentBoard: 'plateau',
  },
  cookieNotice: {
    label: 'Avis sur les cookies',
    message:
      'Red Tetris utilise uniquement les cookies necessaires pour vous garder connecte et faire fonctionner le jeu. Ils sont requis pour le service et ne sont pas utilises pour la publicite ou les statistiques. Nous memorisons cet avis pendant 13 mois.',
    privacy: 'Confidentialite',
    acknowledge: 'Compris',
  },
  infoPage: {
    pages,
    labels: {
    informationPages: 'Pages d\u2019information',
    back: '\u2190 Retour',
    closeGuide: 'Fermer le guide',
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
    contact: {
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
    tutorialControls: {
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
  },
}

export default fr
