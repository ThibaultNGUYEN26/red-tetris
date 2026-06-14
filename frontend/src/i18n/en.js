const CONTACT_OBJECT_MAX_LENGTH = 120
const CONTACT_MESSAGE_MAX_LENGTH = 4000
const PRIVACY_LAST_UPDATED = 'May 5, 2026'
const PRIVACY_CONTROLLER_NAME = 'Thibault and Riham'

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

const en = {
  footer: {
    siteInformation: 'Site information',
    about: 'About',
    contact: 'Contact',
    terms: 'Terms',
    privacy: 'Privacy',
  },
  roomNotice: {
    roomUsed: 'Room already used',
    userConnected: 'User already connected',
  },
  appUi: {
    openProfileMenu: 'Open profile menu',
    profileTitle: 'Profile',
    saveProfile: 'Save',
    connectionLost: 'Connection lost. Reconnecting...',
    serverUnavailable: 'Server unavailable. Retrying...',
    serverError: 'Server error',
    reconnected: 'Reconnected.',
    reconnecting: 'Reconnecting...',
    reconnectFailed: 'Unable to reconnect. Please refresh.',
  },
  spectate: {
    missingUsername: 'Missing username in spectator URL.',
    roomNotFound: 'Room not found',
    unauthorized: 'Spectator not authorized',
    loading: 'Loading spectator mode...',
    back: 'Back',
    gameOver: 'Game over',
    winner: 'Winner',
    noWinner: 'No winner',
    playAgain: 'Play again',
    backToMenu: 'Back to menu',
  },
  auth: {
    languageLabel: 'Language',
    loginTab: 'Login',
    registerTab: 'Register',
    loginTitle: 'Login to Your Account',
    registerTitle: 'Create Your Account',
    forgotTitle: 'Reset Your Password',
    resetTitle: 'Choose a New Password',
    username: 'Username',
    email: 'Email',
    password: 'Password',
    confirmPassword: 'Confirm password',
    showPassword: 'Show password',
    hidePassword: 'Hide password',
    showConfirmPassword: 'Show confirm password',
    hideConfirmPassword: 'Hide confirm password',
    randomize: 'Random',
    skin: 'Skin',
    eyes: 'Eyes',
    mouth: 'Mouth',
    pleaseWait: 'Please wait...',
    register: 'Register',
    sendResetLink: 'Send Reset Link',
    updatePassword: 'Update Password',
    login: 'Login',
    forgotPassword: 'Forgot password?',
    restoreAccount: 'Restore account',
    backToLogin: 'Back to login',
    missingData: 'Missing data',
    invalidEmail: 'Invalid email',
    invalidPassword: 'Invalid password',
    passwordTooShort: 'Password must be at least 8 characters',
    passwordUppercase: 'Password must contain at least 1 uppercase letter',
    passwordLowercase: 'Password must contain at least 1 lowercase letter',
    passwordNumber: 'Password must contain at least 1 number',
    passwordSpecial: 'Password must contain at least 1 special character',
    passwordMismatch: "Password doesn't match",
    invalidResetLink: 'Invalid or expired reset link',
    authenticationFailed: 'Authentication failed',
    accountCreated: 'Account created. Please log in.',
    passwordResetGenerated: 'Password reset link generated',
    passwordUpdated: 'Password updated',
    serverUnavailable: 'Server unavailable',
    unableToRestore: 'Unable to restore account',
  },
  profileMenu: {
    createTitle: 'Create Your Profile',
    profileTitle: 'Profile',
    randomize: 'Random',
    skin: 'Skin',
    eyes: 'Eyes',
    mouth: 'Mouth',
    usernamePlaceholder: 'Username',
    play: "Let's Play!",
    save: 'Save',
    disconnect: 'Disconnect',
    missingData: 'Missing data',
    invalidUsername: 'Invalid username',
    serverUnavailable: 'Server unavailable',
    serverNotResponding: 'Server not responding',
    unknownError: 'Unknown error',
    profileUpdateFailed: 'Profile update failed',
  },
  menu: {
    heading: 'Select game mode',
    soloTitle: 'Solo',
    soloDescription: 'Play alone and beat your high score',
    multiplayerTitle: 'Multiplayer',
    multiplayerDescription: 'Compete against other players',
    options: 'Options',
  },
  options: {
    heading: 'Options',
    lightTheme: 'Light theme',
    darkTheme: 'Dark theme',
    switchToLight: 'Switch to light mode',
    switchToDark: 'Switch to dark mode',
    sound: 'Sound',
    enabled: 'Enabled',
    disabled: 'Disabled',
    guide: 'Guide',
    guideDescription: 'Controls and modes',
    language: 'Language',
    languageDescription: 'Choose display language',
    languageOptions: 'Language options',
    back: 'Back',
  },
  playerStats: {
  loadingStats: 'Loading stats...',
  playerStatsTitle: 'Player Stats',
  advancedStatsTitle: 'Advanced Stats',
  closeAdvancedStats: 'Close advanced stats',
  timePlayed: 'Time played',
  total: 'Total',
  solo: 'Solo',
  coop: 'Co-op',
  multi: 'Multi',
  soloGames: 'Solo Games',
  highestSoloScore: 'Highest Solo Score',
  multiplayerGames: 'Multiplayer Games',
  multiplayerWins: 'Multiplayer Wins',
  multiplayerLosses: 'Multiplayer Losses',
  multiplayerWinrate: 'Multiplayer Winrate',
  advancedStatsButton: 'Advanced stats',
  games: 'Games',
  winLoss: 'Win / Loss',
  winLossRatio: 'W/L ratio',
  highestScore: 'Highest score',
  averageScore: 'Average score',
  highestLevel: 'Highest level',
  highestLines: 'Highest lines',
  totalLines: 'Total lines',
  highestSent: 'Highest sent',
  totalSent: 'Total sent',
  highestTetris: 'Highest tetris',
  totalTetris: 'Total tetris',
  longestGame: 'Longest game',
},
  leaderboard: {
    title: '🏆 Leaderboard',
    solo: 'Solo',
    coop: 'Co-op Duo',
    loading: 'Loading…',
    playerOne: 'Player 1',
    playerTwo: 'Player 2',
    previousPage: 'Previous page',
    nextPage: 'Next page',
  },
  rooms: {
    passwordRequired: 'Password required',
    invalidPassword: 'Invalid password',
    title: 'Multiplayer rooms',
    createRoom: 'Create room',
    chooseRoomType: 'Choose room type',
    cooperative: 'Cooperative',
    multiplayer: 'Multiplayer',
    optionalPassword: 'Optional password',
    publicRoomPlaceholder: 'Leave empty for a public room',
    availableRooms: 'Available rooms',
    emptyRooms: 'No rooms available. Create one!',
    password: 'Password',
    host: 'Host',
    roomPasswordPlaceholder: 'Room password',
    hidePassword: 'Hide password',
    showPassword: 'Show password',
    joined: 'Joined',
    full: 'Full',
    enter: 'Enter',
    join: 'Join',
    back: 'Back',
  },
  createRoom: {
    joinErrors: {
      'Username already connected': 'This username is already connected in this room.',
      'Room is full': 'This room is already full.',
      'User is already in a room': 'This player is already busy in another room.',
      default: 'This room is already occupied. Try another room or another username.',
    },
    roomActionErrors: {
      used: 'Room already used.',
      invalidName: 'Invalid room name',
      invalidMode: 'Invalid game mode',
      hostRenameOnly: 'Only the host can rename the room.',
      default: 'Unable to update the room right now.',
    },
    modes: {
      classic: { label: 'Classic', description: 'Standard competitive Tetris where cleared lines send penalties to opponents.' },
      mirror: { label: 'Mirror', description: 'Controls are reversed, so movement and drops behave differently.' },
      chaotic: { label: 'Chaotic', description: 'Your current piece and next piece can be randomly swapped during the game.' },
      invisible: { label: 'Invisible', description: 'The active piece becomes harder to track while it falls.' },
      giant: { label: 'Giant', description: 'Play on a larger board with more space and longer survival.' },
      cooperative: { label: 'Alternating co-op', description: 'Two players share a board and play turn by turn.' },
      cooperative_roles: { label: 'Role co-op', description: 'Two players share a board with separate movement and rotation roles.' },
    },
    invalidPassword: 'Invalid password',
    passwordRequired: 'Password required',
    joinFailed: 'Unable to join the room',
    editRoomName: 'Edit room name',
    currentPassword: 'Current room password',
    password: 'Password',
    roomPassword: 'Room password',
    hidePassword: 'Hide password',
    showPassword: 'Show password',
    joinRoom: 'Join room',
    back: 'Back',
    gameMode: 'Game mode',
    players: 'Players',
    waitingPlayers: 'Waiting for players...',
    startGame: 'Start game',
  },
  game: {
    controls: [
      { keys: 'Left / Right arrow', action: 'Move' },
      { keys: 'Up arrow', action: 'Rotate' },
      { keys: 'Down arrow', action: 'Soft drop' },
      { keys: 'Space', action: 'Hard drop' },
      { keys: 'C / Shift', action: 'Hold' },
      { keys: 'Escape', action: 'Options' },
    ],
    options: 'Options',
    score: 'Score',
    lines: 'Lines',
    level: 'Level',
    hold: 'Hold',
    holdAria: 'Held piece',
    boardAria: 'Tetris board',
    next: 'Next',
    nextAria: 'Next piece',
    keyboardControlsAria: 'Keyboard controls',
    countdownAria: 'Game countdown',
    countdownGo: 'Go',
    pause: 'Pause',
    gameMenu: 'Game menu',
    soundOn: 'Sound: enabled',
    soundOff: 'Sound: disabled',
    resume: 'Resume',
    leaveGame: 'Leave game',
    yourTurn: 'YOUR TURN',
    playing: 'Playing',
    playingFallback: 'Playing: ...',
    rotateRole: 'ROTATION',
    placeRole: 'PLACEMENT',
    assigningRole: 'ASSIGNING ROLE...',
    opponents: 'Opponents',
    opponentBoard: 'board',
  },
  gameOver: {
    gameOver: 'Game over',
    won: 'You won',
    lost: 'You lost',
    winner: 'Winner',
    playAgain: 'Play again',
    spectate: 'Spectate',
    backToMenu: 'Back to menu',
  },
  spectator: {
    title: 'Spectator mode',
    empty: 'No players to watch.',
    back: 'Back',
    watching: 'Watching',
    previous: 'Previous',
    next: 'Next',
    score: 'Score',
    lines: 'Lines',
    level: 'Level',
    hold: 'Hold',
    nextPiece: 'Next',
    holdPieceLabel: 'Held piece',
    nextPieceLabel: 'Next piece',
    boardLabel: 'Tetris board',
    opponents: 'Opponents',
    opponentBoard: 'board',
  },
  cookieNotice: {
    label: 'Cookie notice',
    message:
      'Red Tetris uses only necessary cookies to keep you signed in and run the game. They are required for the service and are not used for advertising or analytics. We remember that this notice was shown for 13 months.',
    privacy: 'Privacy',
    acknowledge: 'Got it',
  },
  infoPage: {
    pages,
    labels: {
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
    contact: {
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
    tutorialControls: {
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
  },
}

export default en
