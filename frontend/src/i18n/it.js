const CONTACT_OBJECT_MAX_LENGTH = 120
const CONTACT_MESSAGE_MAX_LENGTH = 4000
const PRIVACY_LAST_UPDATED = '5 maggio 2026'
const PRIVACY_CONTROLLER_NAME = 'Thibault e Riham'

const pages = {
  about: {
    title: 'Informazioni su Red Tetris',
    intro:
      'Red Tetris è un progetto della 42 School realizzato da un team di due persone. L’obiettivo era creare una versione web di Tetris in tempo reale con modalità solitaria, stanze cooperative, stanze multigiocatore e gioco sincronizzato.',
    sections: [
      {
        title: 'Modalità di gioco',
        body:
          'Il gioco include una modalità solitaria per inseguire il tuo miglior punteggio, stanze cooperative in cui due giocatori condividono una sfida e stanze multigiocatore in cui i giocatori competono in tempo reale. Nel multigiocatore competitivo, eliminare linee può inviare penalità agli avversari, rendendo ogni partita più strategica.',
      },
      {
        title: 'Profili e punteggi',
        body:
          'I profili dei giocatori tengono traccia di statistiche utili come record, partite giocate, linee eliminate, livelli raggiunti, risultati solitari, punteggi cooperativi e risultati multigiocatore, così i giocatori possono seguire i propri progressi nel tempo.',
      },
      {
        title: 'Progetto',
        body:
          'Questo progetto è stato costruito alla 42 da un team di due persone. Abbiamo sviluppato il frontend con React e usato Socket.IO per gestire la comunicazione in tempo reale tra i giocatori. Il backend gestisce stanze, stato di gioco, sincronizzazione, punteggi ed eventi multigiocatore.',
      },
    ],
  },
  tutorial: {
    title: 'Guida',
    intro:
      'Impara i controlli e le modalità di gioco prima di entrare in una stanza.',
    sections: [
      {
        title: 'Controlli',
        body:
          'Usa Sinistra e Destra per spostare il pezzo, Giù per la discesa rapida, Su per la rotazione, Spazio per la caduta istantanea e C o Maiusc per tenere il pezzo attuale. Esc apre il menu pausa/opzioni in solitaria e il menu di gioco in multigiocatore.',
      },
      {
        title: 'Solitaria',
        body:
          'La modalità solitaria ti permette di giocare da solo, eliminare linee, salire di livello e puntare al tuo miglior punteggio. I risultati solitari possono apparire nel profilo e nella classifica solitaria.',
      },
      {
        title: 'Multigiocatore',
        body:
          'Nelle stanze multigiocatore, fino a 8 giocatori si affrontano in tempo reale su plance separate. Eliminare più linee invia linee di penalità agli avversari e vince l’ultimo giocatore ancora in gioco.',
      },
      {
        title: 'Classica',
        body:
          'Classica è la modalità competitiva multigiocatore standard. Tutti giocano con i controlli normali e le linee eliminate possono inviare penalità alle altre plance.',
      },
      {
        title: 'Specchio',
        body:
          'Specchio inverte parte dei controlli: Sinistra e Destra spostano il pezzo nella direzione opposta, Giù attiva una caduta istantanea e Spazio diventa una discesa rapida.',
      },
      {
        title: 'Caotica',
        body:
          'Caotica mantiene le regole competitive, ma scambia casualmente il pezzo attuale con il pezzo successivo durante la partita, costringendoti ad adattarti in fretta.',
      },
      {
        title: 'Invisibile',
        body:
          'Invisibile mantiene le regole competitive, ma nasconde il pezzo attivo in caduta. I giocatori devono seguirne la posizione a memoria, mentre i pezzi già posati restano visibili.',
      },
      {
        title: 'Gigante',
        body:
          'Gigante usa una plancia più grande, offrendo più spazio ai giocatori ma anche più righe e colonne da gestire sotto la pressione del multigiocatore.',
      },
      {
        title: 'Co-op alternata',
        body:
          'La co-op alternata è una modalità per due giocatori su una plancia condivisa. I giocatori controllano i pezzi a turno, quindi comunicazione e tempismo sono essenziali.',
      },
      {
        title: 'Co-op ruoli',
        body:
          'La co-op ruoli è una modalità per due giocatori su una plancia condivisa in cui un giocatore gestisce la rotazione e l’altro i movimenti e le cadute. I due giocatori devono coordinarsi per sopravvivere.',
      },
      {
        title: 'Spettatore',
        body:
          'In multigiocatore, i giocatori eliminati possono guardare le plance rimanenti invece di uscire subito.',
      },
    ],
  },
  contact: {
    title: 'Contatti',
    intro: 'Invia segnalazioni di bug, suggerimenti, domande sull’account o richieste sulla privacy direttamente alla casella di Red Tetris. Le risposte vengono inviate all’indirizzo email del tuo account o a quello che indichi nel modulo.',
    sections: [
      {
        title: 'Segnalazioni bug',
        body: 'Indica cosa è successo, cosa ti aspettavi e la stanza o la pagina in cui è apparso il problema.',
      },
      {
        title: 'Suggerimenti',
        body: 'Condividi idee per modalità di gioco, controlli, funzioni del profilo, punteggi o qualsiasi cosa possa migliorare il sito.',
      },
      {
        title: 'Richieste sulla privacy',
        body:
          'Per richieste di accesso, correzione, cancellazione o opposizione, includi il nome utente e l’email registrata associati all’account, così la richiesta può essere verificata.',
      },
    ],
  },
  terms: {
    title: 'Termini',
    intro:
      'Questi termini descrivono le regole di base per usare Red Tetris. Usando il sito accetti di giocare correttamente e di rispettare gli altri giocatori.',
    sections: [
      {
        title: 'Uso del servizio',
        body:
          'Red Tetris è fornito per intrattenimento personale. Non abusare del servizio, non interferire con il gameplay, non tentare accessi non autorizzati e non usare automazioni per disturbare stanze, punteggi o account.',
      },
      {
        title: 'Account e profili',
        body:
          'Sei responsabile delle attività legate al tuo nome utente e ai tuoi dati di accesso. Usa informazioni corrette e non impersonare altri giocatori.',
      },
      {
        title: 'Gioco e punteggi',
        body:
          'Punteggi, classifiche, stanze e risultati multigiocatore possono essere azzerati, corretti o rimossi se influenzati da bug, cheating, abuso o manutenzione.',
      },
      {
        title: 'Disponibilità',
        body:
          'Il sito è fornito così com’è. Le funzionalità possono cambiare, diventare non disponibili o essere rimosse senza preavviso mentre il progetto evolve.',
      },
    ],
  },
  privacy: {
    title: 'Informativa sulla privacy',
    intro:
      `Ultimo aggiornamento ${PRIVACY_LAST_UPDATED}. Questa informativa spiega quali dati raccoglie Red Tetris, perché vengono usati, per quanto tempo vengono conservati e come puoi esercitare i tuoi diritti RGPD/GDPR.`,
    sections: [
      {
        title: 'Titolare',
        body:
          `${PRIVACY_CONTROLLER_NAME} sono responsabili di decidere come vengono usati i dati dell’account, del profilo, dei contatti e del gameplay per questa installazione di Red Tetris. Non è nominato un Responsabile della protezione dei dati separato, salvo diversa indicazione in questa sezione.`,
      },
      {
        title: 'Informazioni raccolte',
        body:
          'Il sito può memorizzare il nome utente, l’indirizzo email, l’hash della password, le impostazioni dell’avatar, i punteggi in solitaria, i punteggi cooperativi, i risultati multigiocatore, le voci di classifica, i token di reset password, i messaggi di contatto e dati tecnici come gli indirizzi IP usati per i log di sicurezza e il rate limiting anti-spam.',
      },
      {
        title: 'Come vengono usati i dati',
        body:
          'I dati vengono usati per creare account, autenticare i giocatori, ripristinare l’accesso, mostrare i profili, gestire le stanze, salvare i punteggi, mantenere le classifiche, rispondere alle richieste di contatto, proteggere il servizio dagli abusi e migliorarne l’affidabilità.',
      },
      {
        title: 'Basi giuridiche',
        body:
          'I dati di account, login, profilo e gameplay vengono trattati per fornire il servizio richiesto. I dati di sicurezza, anti-abuso e affidabilità vengono trattati per il legittimo interesse a proteggere il sito. I messaggi di contatto vengono trattati per rispondere alla tua richiesta. Gli obblighi legali possono richiedere la conservazione di alcuni record quando applicabile.',
      },
      {
        title: 'Conservazione',
        body:
          'La cancellazione dell’account può essere richiesta dal menu profilo. Gli account eliminati vengono prima programmati per la cancellazione e possono essere ripristinati per 30 giorni effettuando di nuovo l’accesso e scegliendo il ripristino. Dopo questa finestra, l’account e i dati correlati di profilo, stanze e punteggi vengono rimossi definitivamente dal database. I token di reset password sono temporanei e scadono dopo poco tempo. I messaggi di contatto e i log tecnici vengono conservati solo per il tempo necessario a supporto, sicurezza e prevenzione degli abusi, poi vengono eliminati o anonimizzati quando non servono più.',
      },
      {
        title: 'I tuoi diritti',
        body:
          'Ai sensi del RGPD/GDPR puoi richiedere accesso, rettifica, cancellazione, limitazione, portabilità o opposizione al trattamento dei tuoi dati personali. Le richieste vengono evase entro un mese quando richiesto, salvo che la richiesta sia complessa o sia necessaria la verifica dell’identità.',
      },
      {
        title: 'Richieste di cancellazione',
        body:
          'Gli utenti autenticati possono esportare i dati del proprio account o cancellarlo da questa pagina privacy. Puoi anche usare la pagina contatti per richieste sulla privacy che richiedono una revisione manuale. Alcuni dati possono essere conservati temporaneamente quando necessario per sicurezza, prevenzione degli abusi, obblighi legali o integrità dei backup.',
      },
      {
        title: 'Destinatari e fornitori',
        body:
          'I dati personali vengono trattati dal backend del sito, dal database PostgreSQL, da Railway per l’hosting di backend e database, da Vercel per l’hosting del frontend e da Resend per email transazionali come il reset della password e i messaggi di contatto. I messaggi del modulo contatti includono l’indirizzo email che fornisci come indirizzo di risposta. I dati non vengono venduti.',
      },
      {
        title: 'Trasferimenti internazionali',
        body:
          'Railway, Vercel e Resend possono trattare dati al di fuori dello Spazio Economico Europeo, inclusi gli Stati Uniti. I trasferimenti si basano sui termini di trattamento dati e sulle garanzie di trasferimento rese disponibili da questi fornitori, incluse le Clausole Contrattuali Standard UE e, dove applicabile, gli impegni del Data Privacy Framework.',
        links: [
          { href: 'https://railway.com/legal/dpa', label: 'DPA Railway' },
          { href: 'https://vercel.com/legal/dpa', label: 'DPA Vercel' },
          { href: 'https://resend.com/legal/dpa', label: 'DPA Resend' },
        ],
      },
      {
        title: 'Accordi con i responsabili',
        body:
          'L’operatore del sito deve mantenere in vigore i relativi termini di trattamento o gli accordi con i responsabili del trattamento con i fornitori di hosting, database ed email prima di usare tali fornitori per dati personali in produzione. Questi fornitori sono usati solo per ospitare il frontend, eseguire il backend, archiviare il database, inviare email transazionali, mantenere la sicurezza e garantire l’affidabilità operativa.',
      },
      {
        title: 'Cookie e archiviazione locale',
        body:
          'L’app usa l’archiviazione locale per funzioni necessarie come ricordare localmente l’utente autenticato, i dettagli dell’account richiesti dall’interfaccia, le preferenze del tema e se l’avviso sui cookie è stato mostrato. L’accettazione di quell’avviso viene conservata per 13 mesi, poi l’app lo mostra di nuovo. Il backend può usare un cookie di sessione necessario per mantenerti autenticato. Questi elementi di archiviazione sono usati per le funzioni principali del servizio, non per pubblicità o tracciamento tra siti. Al momento non sono richiesti cookie pubblicitari o analitici per il gioco principale.',
      },
      {
        title: 'Indirizzi IP e log',
        body:
          'Il backend usa informazioni di richiesta derivate dall’IP per prevenire gli abusi e applicare limiti di frequenza. Le voci del rate limit del modulo contatti sono conservate in memoria del server per la finestra configurata, attualmente 1 ora per impostazione predefinita. Le voci del rate limit per l’autenticazione sono conservate in memoria per 15 minuti per impostazione predefinita. Queste voci in memoria non sono usate per pubblicità e scompaiono quando la finestra scade o il server si riavvia. I fornitori di hosting, reverse proxy, email e database possono inoltre creare log operativi contenenti indirizzi IP, timestamp, metadati delle richieste o metadati di consegna; tali log vengono conservati fino a 30 giorni salvo che sia necessaria una conservazione più lunga per indagare abusi, mantenere la sicurezza, risolvere un problema legale o rispettare obblighi del fornitore o legali.',
      },
      {
        title: 'Sicurezza',
        body:
          'Le password sono memorizzate come hash, non in chiaro. Le distribuzioni in produzione usano HTTPS e limitano le credenziali del database, del provider email e del server ai soli manutentori autorizzati.',
      },
      {
        title: 'Contatti e richieste',
        body:
          'Per domande sulla privacy o richieste sui dati dell’account, usa la pagina contatti e includi il nome utente e l’email registrata dell’account. La cancellazione dell’account è disponibile dal menu profilo. Se ritieni che i tuoi diritti non siano stati rispettati, puoi contattare la tua autorità locale per la protezione dei dati, come la CNIL in Francia.',
      },
    ],
  },
}

pages.tutorial = {
  title: 'Guida',
  intro:
    'Impara i controlli e le modalità di gioco prima di entrare in una stanza.',
  sections: [
    {
      title: 'Controlli',
      body:
        'Usa Sinistra e Destra per spostare il pezzo, Giù per la discesa morbida, Su per ruotare, Spazio per la caduta istantanea e C o Maiusc per tenere il pezzo corrente. Esc apre il menu pausa/opzioni in solitaria e il menu di gioco in multigiocatore.',
    },
    {
      title: 'Solitaria',
      body:
        'La modalità solitaria ti permette di giocare da solo, eliminare linee, salire di livello e inseguire il tuo miglior punteggio. I risultati solitari possono apparire nel tuo profilo e nella classifica solitaria.',
    },
    {
      title: 'Multigiocatore',
      body:
        'Nelle stanze multigiocatore, fino a 8 giocatori competono in tempo reale su plance separate. Eliminare più linee invia linee di penalità agli avversari e vince l’ultimo giocatore ancora in vita.',
    },
    {
      title: 'Classica',
      body:
        'Classica è la modalità competitiva multigiocatore standard. Tutti giocano con i controlli normali e le linee eliminate possono inviare penalità alle altre plance.',
    },
    {
      title: 'Specchio',
      body:
        'Specchio inverte parte dei controlli: Sinistra e Destra spostano il pezzo nella direzione opposta, Giù attiva una caduta istantanea e Spazio diventa una discesa morbida.',
    },
    {
      title: 'Caotica',
      body:
        'Caotica mantiene le regole competitive, ma scambia casualmente il pezzo corrente con il prossimo durante la partita, costringendoti ad adattarti rapidamente.',
    },
    {
      title: 'Invisibile',
      body:
        'Invisibile mantiene le regole competitive, ma nasconde il pezzo attivo in caduta. I giocatori devono seguirne la posizione a memoria mentre i pezzi già posati restano visibili.',
    },
    {
      title: 'Gigante',
      body:
        'Gigante usa una plancia più grande, offrendo più spazio ai giocatori ma anche più righe e colonne da gestire sotto la pressione del multigiocatore.',
    },
    {
      title: 'Co-op alternata',
      body:
        'La co-op alternata è una modalità per due giocatori su una plancia condivisa. I giocatori controllano i pezzi a turno, quindi comunicazione e tempismo sono essenziali.',
    },
    {
      title: 'Co-op ruoli',
      body:
        'La co-op ruoli è una modalità per due giocatori su una plancia condivisa in cui un giocatore gestisce la rotazione e l’altro i movimenti e le cadute. Entrambi devono coordinarsi per sopravvivere.',
    },
    {
      title: 'Spettatore',
      body:
        'In multigiocatore, i giocatori eliminati possono guardare le plance rimanenti invece di uscire subito.',
    },
  ],
}

const it = {
  footer: {
    siteInformation: 'Informazioni sul sito',
    about: 'Informazioni',
    contact: 'Contatti',
    terms: 'Termini',
    privacy: 'Privacy',
  },
  roomNotice: {
    roomUsed: 'Stanza già usata',
    userConnected: 'Utente già connesso',
  },
  appUi: {
    openProfileMenu: 'Apri menu profilo',
    profileTitle: 'Profilo',
    saveProfile: 'Salva',
    connectionLost: 'Connessione persa. Riconnessione in corso...',
    serverUnavailable: 'Server non disponibile. Riprovo...',
    serverError: 'Errore del server',
    reconnected: 'Riconnesso.',
    reconnecting: 'Riconnessione in corso...',
    reconnectFailed: 'Impossibile riconnettersi. Aggiorna la pagina.',
  },
  spectate: {
    missingUsername: 'Nome utente mancante nell’URL dello spettatore.',
    roomNotFound: 'Stanza non trovata',
    unauthorized: 'Spettatore non autorizzato',
    loading: 'Caricamento modalità spettatore...',
    back: 'Indietro',
    gameOver: 'Partita finita',
    winner: 'Vincitore',
    noWinner: 'Nessun vincitore',
    playAgain: 'Gioca di nuovo',
    backToMenu: 'Torna al menu',
  },
  auth: {
    languageLabel: 'Lingua',
    loginTab: 'Accesso',
    registerTab: 'Registrazione',
    loginTitle: 'Accedi al tuo account',
    registerTitle: 'Crea il tuo account',
    forgotTitle: 'Reimposta la password',
    resetTitle: 'Scegli una nuova password',
    username: 'Nome utente',
    email: 'Email',
    password: 'Password',
    confirmPassword: 'Conferma password',
    showPassword: 'Mostra password',
    hidePassword: 'Nascondi password',
    showConfirmPassword: 'Mostra conferma password',
    hideConfirmPassword: 'Nascondi conferma password',
    randomize: 'Casuale',
    skin: 'Pelle',
    eyes: 'Occhi',
    mouth: 'Bocca',
    pleaseWait: 'Attendi...',
    register: 'Registrati',
    sendResetLink: 'Invia link di reset',
    updatePassword: 'Aggiorna password',
    login: 'Accedi',
    forgotPassword: 'Password dimenticata?',
    restoreAccount: 'Ripristina account',
    backToLogin: 'Torna all’accesso',
    missingData: 'Dati mancanti',
    invalidEmail: 'Email non valida',
    invalidPassword: 'Password non valida',
    passwordTooShort: 'La password deve contenere almeno 8 caratteri',
    passwordUppercase: 'La password deve contenere almeno 1 lettera maiuscola',
    passwordLowercase: 'La password deve contenere almeno 1 lettera minuscola',
    passwordNumber: 'La password deve contenere almeno 1 numero',
    passwordSpecial: 'La password deve contenere almeno 1 carattere speciale',
    passwordMismatch: 'Le password non coincidono',
    invalidResetLink: 'Link di reset non valido o scaduto',
    authenticationFailed: 'Autenticazione fallita',
    accountCreated: 'Account creato. Accedi.',
    passwordResetGenerated: 'Link di reset password generato',
    passwordUpdated: 'Password aggiornata',
    serverUnavailable: 'Server non disponibile',
    unableToRestore: 'Impossibile ripristinare l’account',
  },
  profileMenu: {
    createTitle: 'Crea il tuo profilo',
    profileTitle: 'Profile',
    randomize: 'Random',
    skin: 'Skin',
    eyes: 'Eyes',
    mouth: 'Mouth',
    usernamePlaceholder: 'Nome utente',
    play: 'Iniziamo!',
    save: 'Salva',
    disconnect: 'Disconnetti',
    missingData: 'Dati mancanti',
    invalidUsername: 'Nome utente non valido',
    serverUnavailable: 'Server non disponibile',
    serverNotResponding: 'Il server non risponde',
    unknownError: 'Errore sconosciuto',
    profileUpdateFailed: 'Aggiornamento profilo non riuscito',
  },
  menu: {
    heading: 'Seleziona la modalità di gioco',
    soloTitle: 'Solitaria',
    soloDescription: 'Gioca da solo e supera il tuo record',
    multiplayerTitle: 'Multigiocatore',
    multiplayerDescription: 'Competi contro altri giocatori',
    options: 'Opzioni',
    shop: 'Negozio',
  },
  shop: {
    kicker: 'Cosmetici',
    heading: 'Negozio',
    pack_classic: 'Classico',
    pack_neon: 'Neon',
    pack_pastel: 'Pastello',
    pack_retro: 'Retro',
    pack_ocean: 'Oceano',
    pack_fire: 'Fuoco',
    equipped: 'Equipaggiato',
    equip: 'Equipaggia',
    comingSoon: 'Prossimamente',
    back: 'Indietro',
    sectionTetrominoes: 'Tetromini',

  },
  options: {
    heading: 'Opzioni',
    lightTheme: 'Tema chiaro',
    darkTheme: 'Tema scuro',
    switchToLight: 'Passa al tema chiaro',
    switchToDark: 'Passa al tema scuro',
    sound: 'Audio',
    enabled: 'Attivo',
    disabled: 'Disattivo',
    guide: 'Guida',
    guideDescription: 'Controlli e modalità',
    language: 'Lingua',
    languageDescription: 'Scegli la lingua visualizzata',
    languageOptions: 'Opzioni lingua',
    back: 'Indietro',
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
    closeGuide: 'Close guide',
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

export default it
