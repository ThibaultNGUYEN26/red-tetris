const CONTACT_OBJECT_MAX_LENGTH = 120
const CONTACT_MESSAGE_MAX_LENGTH = 4000
const PRIVACY_LAST_UPDATED = 'May 5, 2026'
const PRIVACY_CONTROLLER_NAME = 'Thibault and Riham'

const pages = {
  about: {
    title: 'Über Red Tetris',
    intro:
      'Red Tetris ist ein Schulprojekt der 42, das wir als Zweierteam entwickelt haben. Ziel war es, eine Echtzeit-Webversion von Tetris mit Solo-Modus, kooperativen Räumen, Mehrspielerräumen und synchronisiertem Gameplay zu erstellen.',
    sections: [
      {
        title: 'Spielmodi',
        body:
          'Das Spiel umfasst einen Solo-Modus zum Jagen des eigenen Highscores, kooperative Räume, in denen zwei Spieler eine gemeinsame Herausforderung meistern, sowie Mehrspielerräume, in denen Spieler in Echtzeit gegeneinander antreten. Im kompetitiven Mehrspielermodus können gelöschte Reihen Straflinien an Gegner senden, was jede Partie strategischer macht.',
      },
      {
        title: 'Profile und Punkte',
        body:
          'Spielerprofile speichern nützliche Statistiken wie Highscores, gespielte Partien, gelöschte Reihen, erreichte Level, Solo-Ergebnisse, kooperative Punkte und Mehrspielerergebnisse, damit Spieler ihren Fortschritt über die Zeit verfolgen können.',
      },
      {
        title: 'Projekt',
        body:
          'Dieses Projekt wurde an der 42 von einem Zweierteam entwickelt. Wir haben das Frontend mit React gebaut und Socket.IO für die Echtzeit-Kommunikation zwischen Spielern genutzt. Das Backend verwaltet Räume, Spielzustand, Synchronisierung, Punkte und Mehrspielerereignisse.',
      },
    ],
  },
  contact: {
    title: 'Kontakt',
    intro: 'Sende Fehlerberichte, Vorschläge, Kontofragen oder Datenschutzanfragen direkt an das Red-Tetris-Postfach. Antworten werden an die mit deinem Konto verknüpfte E-Mail-Adresse oder an die im Formular angegebene Adresse gesendet.',
    sections: [
      {
        title: 'Fehlerberichte',
        body: 'Beschreibe, was passiert ist, was du erwartet hast, und den Raum oder die Seite, auf der das Problem aufgetreten ist.',
      },
      {
        title: 'Vorschläge',
        body: 'Teile Ideen für Spielmodi, Steuerung, Profilfunktionen, Punktevergabe oder alles, was die Website verbessern würde.',
      },
      {
        title: 'Datenschutzanfragen',
        body:
          'Für Auskunfts-, Berichtigungs-, Löschungs- oder Widerspruchsanfragen gib bitte den Benutzernamen und die registrierte E-Mail-Adresse des Kontos an, damit die Anfrage geprüft werden kann.',
      },
    ],
  },
}

pages.tutorial = {
  title: 'Anleitung',
  intro:
    'Lerne die Steuerung und die Spielmodi kennen, bevor du einem Raum beitrittst.',
  sections: [
    {
      title: 'Steuerung',
      body:
        'Benutze Links und Rechts zum Bewegen des Steins, Unten für den Soft Drop, Oben zum Drehen, Leertaste für den Hard Drop und C oder Umschalt zum Halten des aktuellen Steins. Escape öffnet das Pause-/Optionsmenü im Solo-Modus und das Spielmenü im Mehrspielermodus.',
    },
    {
      title: 'Solo',
      body:
        'Im Solo-Modus spielst du allein, löschst Reihen, steigst auf und jagst deinen Highscore. Deine Solo-Ergebnisse können in deinem Profil und in der Solo-Bestenliste erscheinen.',
    },
    {
      title: 'Mehrspieler',
      body:
        'In Mehrspielerräumen treten bis zu 8 Spieler in Echtzeit auf getrennten Spielfeldern gegeneinander an. Das Löschen mehrerer Reihen sendet Straflinien an Gegner, und der letzte noch aktive Spieler gewinnt.',
    },
    {
      title: 'Klassisch',
      body:
        'Klassisch ist der standardmäßige kompetitive Mehrspielermodus. Alle spielen mit der normalen Steuerung, und gelöschte Reihen können Strafen an die anderen Spielfelder senden.',
    },
    {
      title: 'Spiegel',
      body:
        'Spiegel kehrt einen Teil der Steuerung um: Links und Rechts bewegen den Stein in die entgegengesetzte Richtung, Unten löst einen Hard Drop aus und Leertaste wird zum Soft Drop.',
    },
    {
      title: 'Chaotisch',
      body:
        'Chaotisch behält die kompetitiven Regeln, tauscht aber zufällig den aktuellen Stein mit dem nächsten Stein während der Partie aus, was schnelle Anpassung erfordert.',
    },
    {
      title: 'Unsichtbar',
      body:
        'Unsichtbar behält die kompetitiven Regeln, versteckt aber den aktiv fallenden Stein. Spieler müssen seine Position aus dem Gedächtnis verfolgen, während platzierte Steine sichtbar bleiben.',
    },
    {
      title: 'Riesen',
      body:
        'Riesen verwendet ein größeres Spielfeld, das den Spielern mehr Platz gibt, aber auch mehr Reihen und Spalten unter dem Mehrspielerdruck zu bewältigen sind.',
    },
    {
      title: 'Abwechselnde Koop',
      body:
        'Abwechselnde Koop ist ein Zwei-Spieler-Modus auf einem gemeinsamen Spielfeld. Spieler steuern die Steine abwechselnd, daher sind Kommunikation und Timing entscheidend.',
    },
    {
      title: 'Rollen-Koop',
      body:
        'Rollen-Koop ist ein Zwei-Spieler-Modus auf einem gemeinsamen Spielfeld, bei dem ein Spieler die Drehung und der andere die Bewegung und das Fallen übernimmt. Beide Spieler müssen sich koordinieren, um zu überleben.',
    },
    {
      title: 'Zuschauer',
      body:
        'Im Mehrspielermodus können ausgeschiedene Spieler die verbleibenden Spielfelder beobachten, anstatt sofort das Spiel zu verlassen.',
    },
  ],
}

pages.terms = {
  title: 'Nutzungsbedingungen',
  intro:
    'Diese Bedingungen beschreiben die grundlegenden Regeln für die Nutzung von Red Tetris. Durch die Nutzung der Website stimmst du zu, fair zu spielen und andere Spieler zu respektieren.',
  sections: [
    {
      title: 'Nutzung des Dienstes',
      body:
        'Red Tetris wird zur persönlichen Unterhaltung bereitgestellt. Missbrauche den Dienst nicht, störe keine Partien, versuche keinen unbefugten Zugang und nutze keine Automatisierung, um Räume, Punkte oder Konten zu beeinträchtigen.',
    },
    {
      title: 'Konten und Profile',
      body:
        'Du bist für die Aktivitäten verantwortlich, die mit deinem Benutzernamen und deinen Anmeldedaten verbunden sind. Verwende korrekte Kontoinformationen und gib dich nicht als ein anderer Spieler aus.',
    },
    {
      title: 'Partien und Punkte',
      body:
        'Punkte, Bestenlisten, Räume und Mehrspielerergebnisse können zurückgesetzt, korrigiert oder entfernt werden, wenn sie von Fehlern, Betrug, Missbrauch oder Wartungsarbeiten betroffen sind.',
    },
    {
      title: 'Verfügbarkeit',
      body:
        'Die Website wird so bereitgestellt, wie sie ist. Funktionen können sich ändern, nicht verfügbar sein oder ohne Vorankündigung entfernt werden, während das Projekt weiterentwickelt wird.',
    },
  ],
}

pages.privacy = {
  title: 'Datenschutzerklärung',
  intro:
    `Zuletzt aktualisiert am ${PRIVACY_LAST_UPDATED}. Diese Richtlinie erläutert, was Red Tetris erfasst, warum es verwendet wird, wie lange es gespeichert wird und wie du deine DSGVO-Rechte ausüben kannst.`,
  sections: [
    {
      title: 'Verantwortlicher',
      body:
        `${PRIVACY_CONTROLLER_NAME} sind verantwortlich dafür, wie Konto-, Profil-, Kontakt- und Spielbezogene Daten für diesen Red-Tetris-Dienst verwendet werden. Ein separater Datenschutzbeauftragter wird nicht benannt, sofern dieser Abschnitt nichts anderes angibt.`,
    },
    {
      title: 'Erfasste Informationen',
      body:
        'Die Website kann deinen Benutzernamen, deine E-Mail-Adresse, den Passwort-Hash, Avatar-Einstellungen, Solo-Punkte, kooperative Punkte, Mehrspielerergebnisse, Bestenlisten-Einträge, Passwort-Reset-Token, Kontaktnachrichten und technische Daten wie IP-Adressen speichern, die für Sicherheitsprotokolle und Anti-Spam-Ratenbegrenzung verwendet werden.',
    },
    {
      title: 'Verwendung der Informationen',
      body:
        'Daten werden verwendet, um Konten zu erstellen, Spieler zu authentifizieren, den Zugang wiederherzustellen, Profile anzuzeigen, Räume zu betreiben, Punkte zu speichern, Bestenlisten zu pflegen, Kontaktanfragen zu beantworten, den Dienst vor Missbrauch zu schützen und die Zuverlässigkeit zu verbessern.',
    },
    {
      title: 'Rechtsgrundlagen',
      body:
        'Konto-, Anmelde-, Profil- und Spielbezogene Daten werden verarbeitet, um den von dir angeforderten Dienst bereitzustellen. Sicherheits-, Anti-Missbrauchs- und Zuverlässigkeitsdaten werden auf Basis berechtigter Interessen am Schutz der Website verarbeitet. Kontaktnachrichten werden verarbeitet, um auf deine Anfrage zu antworten. Gesetzliche Verpflichtungen können die Aufbewahrung bestimmter Aufzeichnungen erfordern, wenn dies anwendbar ist.',
    },
    {
      title: 'Aufbewahrung',
      body:
        'Die Kontolöschung kann über das Profilmenü beantragt werden. Gelöschte Konten werden zunächst zur Löschung vorgemerkt und können innerhalb von 30 Tagen durch erneutes Anmelden und Auswahl von „Wiederherstellen" reaktiviert werden. Nach diesem Zeitfenster werden das Konto sowie die zugehörigen Profil-, Raum- und Punktedaten dauerhaft aus der Datenbank entfernt. Passwort-Reset-Token sind temporär und laufen nach kurzer Zeit ab. Kontaktnachrichten und technische Protokolle werden nur so lange aufbewahrt, wie es für Support, Sicherheit und Missbrauchsprävention erforderlich ist, und dann gelöscht oder anonymisiert.',
    },
    {
      title: 'Deine Rechte',
      body:
        'Gemäß der DSGVO kannst du Auskunft, Berichtigung, Löschung, Einschränkung, Übertragbarkeit oder Widerspruch gegen die Verarbeitung deiner personenbezogenen Daten beantragen. Anfragen werden innerhalb eines Monats beantwortet, sofern erforderlich, es sei denn, die Anfrage ist komplex oder eine Identitätsprüfung ist notwendig.',
    },
    {
      title: 'Löschungsanfragen',
      body:
        'Angemeldete Nutzer können ihre Kontodaten exportieren oder ihr Konto über diese Datenschutzseite löschen. Du kannst auch die Kontaktseite für Datenschutzanfragen nutzen, die eine manuelle Prüfung erfordern. Einige Daten können vorübergehend aufbewahrt werden, wenn dies für Sicherheit, Missbrauchsprävention, gesetzliche Verpflichtungen oder die Integrität von Sicherungen erforderlich ist.',
    },
    {
      title: 'Empfänger und Anbieter',
      body:
        'Personenbezogene Daten werden vom Backend der Website, der PostgreSQL-Datenbank, Railway für Backend- und Datenbank-Hosting, Vercel für Frontend-Hosting und Resend für transaktionale E-Mails wie Passwort-Reset und Kontaktnachrichten verarbeitet. Kontaktformularnachrichten enthalten die von dir angegebene E-Mail-Adresse als Antwortadresse. Daten werden nicht verkauft.',
    },
    {
      title: 'Internationale Übermittlungen',
      body:
        'Railway, Vercel und Resend können Daten außerhalb des Europäischen Wirtschaftsraums, einschließlich der USA, verarbeiten. Übermittlungen stützen sich auf die Datenverarbeitungsbedingungen und Übermittlungsschutzmaßnahmen dieser Anbieter, einschließlich EU-Standardvertragsklauseln und gegebenenfalls Data-Privacy-Framework-Verpflichtungen.',
      links: [
        { href: 'https://railway.com/legal/dpa', label: 'Railway DPA' },
        { href: 'https://vercel.com/legal/dpa', label: 'Vercel DPA' },
        { href: 'https://resend.com/legal/dpa', label: 'Resend DPA' },
      ],
    },
    {
      title: 'Auftragsverarbeitungsverträge',
      body:
        'Der Websitebetreiber muss die relevanten Datenverarbeitungsbedingungen oder Auftragsverarbeitungsverträge mit Hosting-, Datenbank- und E-Mail-Anbietern abschließen, bevor diese Anbieter für personenbezogene Produktionsdaten genutzt werden. Diese Anbieter werden ausschließlich zum Hosten des Frontends, Betreiben des Backends, Speichern der Datenbank, Versenden transaktionaler E-Mails, zur Sicherheitsgewährleistung und zur operativen Zuverlässigkeit eingesetzt.',
    },
    {
      title: 'Cookies und lokaler Speicher',
      body:
        'Die App verwendet lokalen Speicher für notwendige Funktionen wie das lokale Merken des angemeldeten Nutzers, gespeicherte Kontodaten, die von der Oberfläche benötigt werden, Theme-Einstellungen und ob der Cookie-Hinweis angezeigt wurde. Diese Bestätigung wird 13 Monate lang gespeichert, danach zeigt die App den Hinweis erneut an. Das Backend kann ein notwendiges Sitzungs-Cookie verwenden, um dich authentifiziert zu halten. Diese Speicherelemente dienen den Kernfunktionen des Dienstes, nicht der Werbung oder seitenübergreifenden Verfolgung. Derzeit sind keine Werbe- oder Analyse-Cookies für das Kernspiel erforderlich.',
    },
    {
      title: 'IP-Adressen und Protokolle',
      body:
        'Das Backend verwendet IP-bezogene Anfrageinformationen zur Missbrauchsprävention und Ratenbegrenzung. Ratenbegrenzungseinträge des Kontaktformulars werden für das konfigurierte Kontaktfenster, standardmäßig 1 Stunde, im Serverspeicher gehalten. Authentifizierungs-Ratenbegrenzungseinträge werden standardmäßig 15 Minuten im Serverspeicher gehalten. Diese Einträge werden nicht für Werbezwecke genutzt und verschwinden, wenn das Zeitfenster abläuft oder der Server neu gestartet wird. Hosting-, Reverse-Proxy-, E-Mail- und Datenbankanbieter können ebenfalls Betriebsprotokolle mit IP-Adressen, Zeitstempeln, Anfragemetadaten oder Zustellungsmetadaten erstellen; diese Protokolle werden bis zu 30 Tage aufbewahrt, sofern keine längere Aufbewahrung zur Untersuchung von Missbrauch, zur Aufrechterhaltung der Sicherheit, zur Lösung eines Rechtsproblems oder zur Erfüllung von Anbieter- oder gesetzlichen Verpflichtungen erforderlich ist.',
    },
    {
      title: 'Sicherheit',
      body:
        'Passwörter werden als Hashes gespeichert, nicht im Klartext. Produktions-Deployments verwenden HTTPS und beschränken Datenbank-, E-Mail-Anbieter- und Server-Zugangsdaten auf autorisierte Wartungspersonen.',
    },
    {
      title: 'Kontakt und Anfragen',
      body:
        'Für Datenschutzfragen oder Anfragen zu Kontodaten nutze die Kontaktseite und gib den Benutzernamen und die registrierte E-Mail des Kontos an. Die Kontolöschung ist über das Profilmenü verfügbar. Wenn du der Meinung bist, dass deine Rechte nicht respektiert wurden, kannst du dich an deine lokale Datenschutzbehörde wenden, z. B. die BfDI in Deutschland.',
    },
  ],
}

const de = {
  footer: {
    siteInformation: 'Website-Informationen',
    about: 'Über uns',
    contact: 'Kontakt',
    terms: 'Bedingungen',
    privacy: 'Datenschutz',
  },
  roomNotice: {
    roomUsed: 'Raum bereits belegt',
    userConnected: 'Benutzer bereits verbunden',
  },
  appUi: {
    openProfileMenu: 'Profilmenü öffnen',
    profileTitle: 'Profil',
    saveProfile: 'Speichern',
    connectionLost: 'Verbindung unterbrochen. Verbinde erneut...',
    serverUnavailable: 'Server nicht verfügbar. Neuer Versuch...',
    serverError: 'Serverfehler',
    reconnected: 'Wiederverbunden.',
    reconnecting: 'Verbinde erneut...',
    reconnectFailed: 'Verbindung fehlgeschlagen. Bitte neu laden.',
  },
  spectate: {
    missingUsername: 'Benutzername in der Zuschauer-URL fehlt.',
    roomNotFound: 'Raum nicht gefunden',
    unauthorized: 'Zuschauer nicht berechtigt',
    loading: 'Zuschauermodus wird geladen...',
    back: 'Zurück',
    gameOver: 'Spiel vorbei',
    winner: 'Gewinner',
    noWinner: 'Kein Gewinner',
    playAgain: 'Nochmal spielen',
    backToMenu: 'Zurück zum Menü',
  },
  auth: {
    languageLabel: 'Sprache',
    loginTab: 'Anmelden',
    registerTab: 'Registrieren',
    loginTitle: 'In dein Konto einloggen',
    registerTitle: 'Konto erstellen',
    forgotTitle: 'Passwort zurücksetzen',
    resetTitle: 'Neues Passwort wählen',
    username: 'Benutzername',
    email: 'E-Mail',
    password: 'Passwort',
    confirmPassword: 'Passwort bestätigen',
    showPassword: 'Passwort anzeigen',
    hidePassword: 'Passwort verbergen',
    showConfirmPassword: 'Passwortbestätigung anzeigen',
    hideConfirmPassword: 'Passwortbestätigung verbergen',
    randomize: 'Zufällig',
    skin: 'Hautfarbe',
    eyes: 'Augen',
    mouth: 'Mund',
    pleaseWait: 'Bitte warten...',
    register: 'Registrieren',
    sendResetLink: 'Link senden',
    updatePassword: 'Passwort aktualisieren',
    login: 'Anmelden',
    forgotPassword: 'Passwort vergessen?',
    restoreAccount: 'Konto wiederherstellen',
    backToLogin: 'Zurück zur Anmeldung',
    missingData: 'Fehlende Daten',
    invalidEmail: 'Ungültige E-Mail',
    invalidPassword: 'Ungültiges Passwort',
    passwordTooShort: 'Das Passwort muss mindestens 8 Zeichen haben',
    passwordUppercase: 'Das Passwort muss mindestens 1 Großbuchstaben enthalten',
    passwordLowercase: 'Das Passwort muss mindestens 1 Kleinbuchstaben enthalten',
    passwordNumber: 'Das Passwort muss mindestens 1 Zahl enthalten',
    passwordSpecial: 'Das Passwort muss mindestens 1 Sonderzeichen enthalten',
    passwordMismatch: 'Passwörter stimmen nicht überein',
    invalidResetLink: 'Ungültiger oder abgelaufener Reset-Link',
    authenticationFailed: 'Authentifizierung fehlgeschlagen',
    accountCreated: 'Konto erstellt. Bitte einloggen.',
    passwordResetGenerated: 'Passwort-Reset-Link erstellt',
    passwordUpdated: 'Passwort aktualisiert',
    serverUnavailable: 'Server nicht verfügbar',
    unableToRestore: 'Konto kann nicht wiederhergestellt werden',
  },
  profileMenu: {
    createTitle: 'Profil erstellen',
    profileTitle: 'Profil',
    randomize: 'Zufällig',
    skin: 'Hautfarbe',
    eyes: 'Augen',
    mouth: 'Mund',
    usernamePlaceholder: 'Benutzername',
    play: 'Spielen!',
    save: 'Speichern',
    disconnect: 'Abmelden',
    missingData: 'Fehlende Daten',
    invalidUsername: 'Ungültiger Benutzername',
    serverUnavailable: 'Server nicht verfügbar',
    serverNotResponding: 'Server antwortet nicht',
    unknownError: 'Unbekannter Fehler',
    profileUpdateFailed: 'Profilaktualisierung fehlgeschlagen',
  },
  menu: {
    heading: 'Spielmodus wählen',
    soloTitle: 'Solo',
    soloDescription: 'Spiel allein und schlage deinen Highscore',
    multiplayerTitle: 'Mehrspieler',
    multiplayerDescription: 'Tritt gegen andere Spieler an',
    options: 'Optionen',
    shop: 'Shop',
  },
  shop: {
    kicker: 'Kosmetik',
    heading: 'Shop',
    pack_classic: 'Klassisch',
    pack_plain: 'Uni',
    pack_neon: 'Neon',
    pack_pastel: 'Pastell',
    pack_retro: 'Retro',
    pack_ocean: 'Ozean',
    pack_bubble: 'Blase',
    pack_fire: 'Feuer',
    pack_arcane: 'Arkan',
    equipped: 'Ausgerüstet',
    equip: 'Ausrüsten',
    buy: 'Kaufen',
    notEnough: 'Nicht genug Münzen',
    comingSoon: 'Demnächst',
    back: 'Zurück',
    sectionTetrominoes: 'Tetrominos',
  },
  options: {
    heading: 'Optionen',
    kicker: 'System',
    lightTheme: 'Helles Design',
    darkTheme: 'Dunkles Design',
    switchToLight: 'Zum hellen Modus wechseln',
    switchToDark: 'Zum dunklen Modus wechseln',
    themeLight: 'Hell',
    themeDark: 'Dunkel',
    soundEffects: 'Soundeffekte',
    music: 'Musik',
    enabled: 'Aktiviert',
    disabled: 'Deaktiviert',
    on: 'An',
    off: 'Aus',
    open: 'Öffnen',
    guide: 'Anleitung',
    guideDescription: 'Steuerung und Modi',
    language: 'Sprache',
    languageDescription: 'Anzeigesprache wählen',
    languageOptions: 'Sprachoptionen',
    back: 'Zurück',
  },
  playerStats: {
    loadingStats: 'Stats werden geladen...',
    playerStatsTitle: 'Spielerstatistiken',
    advancedStatsTitle: 'Erweiterte Statistiken',
    closeAdvancedStats: 'Erweiterte Statistiken schließen',
    timePlayed: 'Gespielte Zeit',
    total: 'Gesamt',
    solo: 'Solo',
    coop: 'Koop',
    multi: 'Multi',
    soloGames: 'Solo-Partien',
    highestSoloScore: 'Bester Solo-Score',
    multiplayerGames: 'Mehrspieler-Partien',
    multiplayerWins: 'Mehrspieler-Siege',
    multiplayerLosses: 'Mehrspieler-Niederlagen',
    multiplayerWinrate: 'Mehrspieler-Siegrate',
    advancedStatsButton: 'Erweiterte Statistiken',
    games: 'Partien',
    winLoss: 'Siege / Niederlagen',
    winLossRatio: 'S/N-Verhältnis',
    highestScore: 'Bester Score',
    averageScore: 'Durchschnittlicher Score',
    highestLevel: 'Höchstes Level',
    highestLines: 'Meiste Reihen',
    totalLines: 'Reihen gesamt',
    highestSent: 'Meiste gesendete',
    totalSent: 'Gesendete gesamt',
    highestTetris: 'Bester Tetris',
    totalTetris: 'Tetris gesamt',
    longestGame: 'Längste Partie',
  },
  leaderboard: {
    title: '🏆 Bestenliste',
    solo: 'Solo',
    coop: 'Koop-Duo',
    loading: 'Lädt…',
    playerOne: 'Spieler 1',
    playerTwo: 'Spieler 2',
    previousPage: 'Vorherige Seite',
    nextPage: 'Nächste Seite',
  },
  rooms: {
    passwordRequired: 'Passwort erforderlich',
    invalidPassword: 'Ungültiges Passwort',
    title: 'Mehrspielerräume',
    createRoom: 'Raum erstellen',
    chooseRoomType: 'Raumtyp wählen',
    cooperative: 'Kooperativ',
    multiplayer: 'Mehrspieler',
    optionalPassword: 'Optionales Passwort',
    publicRoomPlaceholder: 'Leer lassen für einen öffentlichen Raum',
    availableRooms: 'Verfügbare Räume',
    emptyRooms: 'Keine Räume verfügbar. Erstelle einen!',
    password: 'Passwort',
    host: 'Gastgeber',
    roomPasswordPlaceholder: 'Raumpasswort',
    hidePassword: 'Passwort verbergen',
    showPassword: 'Passwort anzeigen',
    joined: 'Beigetreten',
    full: 'Voll',
    enter: 'Betreten',
    join: 'Beitreten',
    back: 'Zurück',
  },
  createRoom: {
    joinErrors: {
      'Username already connected': 'Dieser Benutzername ist bereits in diesem Raum verbunden.',
      'Room is full': 'Dieser Raum ist bereits voll.',
      'User is already in a room': 'Dieser Spieler ist bereits in einem anderen Raum.',
      default: 'Dieser Raum ist bereits belegt. Versuche einen anderen Raum oder Benutzernamen.',
    },
    roomActionErrors: {
      used: 'Raum bereits belegt.',
      invalidName: 'Ungültiger Raumname',
      invalidMode: 'Ungültiger Spielmodus',
      hostRenameOnly: 'Nur der Gastgeber kann den Raum umbenennen.',
      default: 'Der Raum kann gerade nicht aktualisiert werden.',
    },
    modes: {
      classic: { label: 'Klassisch', description: 'Standard-Wettbewerbs-Tetris, bei dem gelöschte Reihen Straflinien an Gegner senden.' },
      mirror: { label: 'Spiegel', description: 'Die Steuerung ist umgekehrt, sodass Bewegungen und Drops anders funktionieren.' },
      chaotic: { label: 'Chaotisch', description: 'Der aktuelle Stein und der nächste Stein können während der Partie zufällig getauscht werden.' },
      invisible: { label: 'Unsichtbar', description: 'Der aktive Stein wird während des Fallens schwerer zu verfolgen.' },
      giant: { label: 'Riesen', description: 'Spiele auf einem größeren Spielfeld mit mehr Platz und längerer Überlebenszeit.' },
      cooperative: { label: 'Abwechselnde Koop', description: 'Zwei Spieler teilen sich ein Spielfeld und spielen abwechselnd.' },
      cooperative_roles: { label: 'Rollen-Koop', description: 'Zwei Spieler teilen sich ein Spielfeld mit getrennten Rollen für Bewegung und Drehung.' },
    },
    invalidPassword: 'Ungültiges Passwort',
    passwordRequired: 'Passwort erforderlich',
    joinFailed: 'Raum konnte nicht betreten werden',
    editRoomName: 'Raumname bearbeiten',
    currentPassword: 'Aktuelles Raumpasswort',
    password: 'Passwort',
    roomPassword: 'Raumpasswort',
    hidePassword: 'Passwort verbergen',
    showPassword: 'Passwort anzeigen',
    joinRoom: 'Raum beitreten',
    back: 'Zurück',
    gameMode: 'Spielmodus',
    players: 'Spieler',
    waitingPlayers: 'Warte auf Spieler...',
    startGame: 'Spiel starten',
  },
  game: {
    controls: [
      { keys: 'Pfeil links / rechts', action: 'Bewegen' },
      { keys: 'Pfeil hoch', action: 'Drehen' },
      { keys: 'Pfeil runter', action: 'Soft Drop' },
      { keys: 'Leertaste', action: 'Hard Drop' },
      { keys: 'C / Umschalt', action: 'Halten' },
      { keys: 'Escape', action: 'Optionen' },
    ],
    options: 'Optionen',
    score: 'Punkte',
    lines: 'Reihen',
    level: 'Level',
    hold: 'Halten',
    holdAria: 'Gehaltener Stein',
    boardAria: 'Tetris-Spielfeld',
    next: 'Nächster',
    nextAria: 'Nächster Stein',
    keyboardControlsAria: 'Tastatursteuerung',
    countdownAria: 'Spielcountdown',
    countdownGo: 'Los',
    pause: 'Pause',
    kicker: 'Spiel',
    exit: 'Verlassen',
    play: 'Spielen',
    gameMenu: 'Spielmenü',
    soundEffectsOn: 'Soundeffekte: aktiviert',
    soundEffectsOff: 'Soundeffekte: deaktiviert',
    musicOn: 'Musik: aktiviert',
    musicOff: 'Musik: deaktiviert',
    resume: 'Fortsetzen',
    leaveGame: 'Spiel verlassen',
    yourTurn: 'DEIN ZUG',
    playing: 'Spielt',
    playingFallback: 'Spielt: ...',
    rotateRole: 'DREHUNG',
    placeRole: 'PLATZIERUNG',
    assigningRole: 'ROLLE WIRD ZUGEWIESEN...',
    opponents: 'Gegner',
    opponentBoard: 'Spielfeld',
  },
  gameOver: {
    gameOver: 'Spiel vorbei',
    won: 'Du hast gewonnen',
    lost: 'Du hast verloren',
    winner: 'Gewinner',
    playAgain: 'Nochmal spielen',
    spectate: 'Zuschauen',
    backToMenu: 'Zurück zum Menü',
  },
  spectator: {
    title: 'Zuschauermodus',
    empty: 'Keine Spieler zum Zuschauen.',
    back: 'Zurück',
    watching: 'Zuschauer von',
    previous: 'Vorheriger',
    next: 'Nächster',
    score: 'Punkte',
    lines: 'Reihen',
    level: 'Level',
    hold: 'Halten',
    nextPiece: 'Nächster',
    holdPieceLabel: 'Gehaltener Stein',
    nextPieceLabel: 'Nächster Stein',
    boardLabel: 'Tetris-Spielfeld',
    opponents: 'Gegner',
    opponentBoard: 'Spielfeld',
    sendConfetti: '🎉',
    sendConfettiLabel: 'Konfetti senden',
  },
  cookieNotice: {
    label: 'Cookie-Hinweis',
    message:
      'Red Tetris verwendet nur notwendige Cookies, um dich eingeloggt zu halten und das Spiel zu betreiben. Sie sind für den Dienst erforderlich und werden nicht für Werbung oder Analysen genutzt. Wir merken uns, dass dieser Hinweis 13 Monate lang angezeigt wurde.',
    privacy: 'Datenschutz',
    acknowledge: 'Verstanden',
  },
  infoPage: {
    pages,
    labels: {
      informationPages: 'Informationsseiten',
      back: '← Zurück',
      closeGuide: 'Anleitung schließen',
      about: 'Über uns',
      contact: 'Kontakt',
      terms: 'Bedingungen',
      privacy: 'Datenschutz',
      accountPrivacyTools: 'Konto-Datenschutz-Tools',
      accountTools: 'Konto-Tools',
      signedInAs: 'Angemeldet als',
      exporting: 'Exportiere...',
      exportData: 'Meine Daten exportieren',
      deleting: 'Lösche...',
      deleteAccount: 'Konto löschen',
      signInForPrivacyTools: 'Melde dich an, um deine Kontodaten zu exportieren oder dein Konto direkt zu löschen.',
      exportError: 'Kontodaten konnten nicht exportiert werden',
      exportSuccess: 'Kontodaten-Export heruntergeladen.',
      deleteConfirm: (username) =>
        `Red-Tetris-Konto "${username}" und seine Punkte löschen? Dies kann nicht rückgängig gemacht werden.`,
      deleteError: 'Konto konnte nicht gelöscht werden',
      deleteSuccess: 'Konto gelöscht.',
      tutorialCarousel: 'Tetris-Steuerungs-Tutorial',
      previousControl: 'Vorherige Steuerung anzeigen',
      nextControl: 'Nächste Steuerung anzeigen',
      tutorialSlides: 'Tutorial-Folien',
      showTutorialSlide: (title) => `${title} anzeigen`,
    },
    contact: {
      captchaLoadError: 'Captcha konnte nicht geladen werden',
      captchaLoadStatus: 'Captcha konnte nicht geladen werden. Bitte Seite neu laden.',
      requiredObjectAndMessage: 'Betreff und Nachricht sind erforderlich.',
      requiredEmail: 'E-Mail ist erforderlich.',
      objectTooLong: `Der Betreff darf höchstens ${CONTACT_OBJECT_MAX_LENGTH} Zeichen haben.`,
      messageTooLong: `Die Nachricht darf höchstens ${CONTACT_MESSAGE_MAX_LENGTH} Zeichen haben.`,
      requiredCaptcha: 'Captcha-Antwort ist erforderlich.',
      sendError: 'Nachricht konnte nicht gesendet werden',
      sendSuccess: 'Nachricht gesendet.',
      mailTimeout: 'Mail-Server-Zeitüberschreitung. Bitte später erneut versuchen.',
      objectLabel: 'Betreff',
      messageLabel: 'Nachricht',
      emailLabel: 'E-Mail',
      captchaLabel: 'Captcha',
      honeypotLabel: 'Website',
      objectPlaceholder: 'Fehlerbericht oder Vorschlag',
      messagePlaceholder: 'Beschreibe das Problem oder die Idee...',
      emailPlaceholder: 'Deine E-Mail',
      captchaLoading: 'Lädt...',
      captchaPlaceholder: 'Antwort',
      refreshCaptcha: 'Captcha aktualisieren',
      sending: 'Sende...',
      sendMessage: 'Nachricht senden',
    },
    tutorialControls: {
      'move-left': {
        ariaLabel: 'Tutorial: Nach links bewegen',
        key: 'Links',
        title: 'Nach links bewegen',
        description: 'Drücke den linken Pfeil, um den fallenden Stein eine Spalte nach links zu bewegen.',
      },
      'move-right': {
        ariaLabel: 'Tutorial: Nach rechts bewegen',
        key: 'Rechts',
        title: 'Nach rechts bewegen',
        description: 'Drücke den rechten Pfeil, um den fallenden Stein eine Spalte nach rechts zu bewegen.',
      },
      'soft-drop': {
        ariaLabel: 'Tutorial: Soft Drop',
        key: 'Unten',
        title: 'Soft Drop',
        description: 'Halte den unteren Pfeil gedrückt, um den Stein schneller fallen zu lassen und dabei die Kontrolle zu behalten.',
      },
      'hard-drop': {
        ariaLabel: 'Tutorial: Hard Drop',
        key: 'Leertaste',
        title: 'Hard Drop',
        description: 'Drücke die Leertaste, um den Stein direkt auf seine Landeposition zu schicken.',
      },
      rotation: {
        ariaLabel: 'Tutorial: Drehen',
        key: 'Oben',
        title: 'Drehen',
        description: 'Drücke Oben, um den fallenden Stein in die gewünschte Form zu drehen.',
      },
      hold: {
        ariaLabel: 'Tutorial: Stein halten',
        key: 'C / Umschalt',
        title: 'Stein halten',
        description: 'Drücke C oder Umschalt, um den aktuellen Stein beiseite zu legen und ihn später zu verwenden.',
      },
    },
  },
}

export default de
