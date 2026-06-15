const CONTACT_OBJECT_MAX_LENGTH = 120
const CONTACT_MESSAGE_MAX_LENGTH = 4000
const PRIVACY_LAST_UPDATED = 'May 5, 2026'
const PRIVACY_CONTROLLER_NAME = 'Thibault and Riham'

const pages = {
  about: {
    title: 'Acerca de Red Tetris',
    intro:
      'Red Tetris es un proyecto de la escuela 42 que construimos en equipo de dos. El objetivo era crear una version web de Tetris en tiempo real con modo solo, salas cooperativas, salas multijugador y juego sincronizado.',
    sections: [
      {
        title: 'Modos de juego',
        body:
          'El juego incluye un modo solo para superar tu mejor puntuacion, salas cooperativas donde dos jugadores comparten un reto y salas multijugador donde los jugadores compiten en tiempo real. En el multijugador competitivo, eliminar lineas puede enviar penalizaciones a los oponentes, lo que hace cada partida mas estrategica.',
      },
      {
        title: 'Perfiles y puntuaciones',
        body:
          'Los perfiles guardan estadisticas utiles como mejores puntuaciones, partidas jugadas, lineas eliminadas, niveles alcanzados, resultados en solo, puntuaciones cooperativas y resultados multijugador para seguir el progreso con el tiempo.',
      },
      {
        title: 'Proyecto',
        body:
          'Este proyecto fue desarrollado en 42 por un equipo de dos personas. Creamos el frontend con React y usamos Socket.IO para gestionar la comunicacion en tiempo real entre jugadores. El backend gestiona salas, estado del juego, sincronizacion, puntuaciones y eventos multijugador.',
      },
    ],
  },
  tutorial: {
    title: 'Guia',
    intro:
      'Aprende los controles y los modos de juego antes de unirte a una sala.',
    sections: [
      {
        title: 'Controles',
        body:
          'Usa Izquierda y Derecha para mover la pieza, Abajo para descenso suave, Arriba para rotar, Espacio para caida instantanea, y C o Mayus para guardar la pieza actual. Escape abre el menu de pausa/opciones en solo y el menu de juego en multijugador.',
      },
      {
        title: 'Solo',
        body:
          'El modo solo te permite jugar sin companeros, eliminar lineas, subir de nivel y perseguir tu mejor puntuacion. Tus resultados en solo pueden aparecer en tu perfil y en la clasificacion de solo.',
      },
      {
        title: 'Multijugador',
        body:
          'En las salas multijugador, hasta 8 jugadores compiten en tiempo real en tableros separados. Eliminar varias lineas envia lineas de penalizacion a los oponentes, y gana el ultimo jugador que siga con vida.',
      },
      {
        title: 'Clasico',
        body:
          'Clasico es el modo multijugador competitivo estandar. Todos juegan con controles normales, y las lineas eliminadas pueden enviar penalizaciones a los otros tableros.',
      },
      {
        title: 'Espejo',
        body:
          'Espejo invierte parte de los controles: Izquierda y Derecha mueven la pieza en sentido contrario, Abajo provoca una caida instantanea, y Espacio pasa a ser descenso suave.',
      },
      {
        title: 'Caotico',
        body:
          'Caotico mantiene las reglas competitivas, pero intercambia aleatoriamente tu pieza actual con la siguiente durante la partida, lo que exige adaptarse rapido.',
      },
      {
        title: 'Invisible',
        body:
          'Invisible mantiene las reglas competitivas, pero oculta la pieza activa mientras cae. Los jugadores deben seguir su posicion de memoria mientras las piezas colocadas siguen visibles.',
      },
      {
        title: 'Gigante',
        body:
          'Gigante usa un tablero mas grande, con mas espacio para los jugadores, pero tambien mas filas y columnas que gestionar bajo la presion del multijugador.',
      },
      {
        title: 'Co-op alternada',
        body:
          'La co-op alternada es un modo de dos jugadores en un tablero compartido. Los jugadores controlan las piezas por turnos, asi que la comunicacion y el ritmo son esenciales.',
      },
      {
        title: 'Co-op por roles',
        body:
          'La co-op por roles es un modo de dos jugadores en un tablero compartido donde un jugador gestiona la rotacion y el otro gestiona movimientos y caidas. Ambos deben coordinarse para sobrevivir.',
      },
      {
        title: 'Espectador',
        body:
          'En multijugador, los jugadores eliminados pueden mirar los tableros restantes en lugar de salir inmediatamente.',
      },
    ],
  },
  contact: {
    title: 'Contacto',
    intro: 'Envia informes de errores, sugerencias, preguntas de cuenta o solicitudes de privacidad directamente al buzon de Red Tetris. Las respuestas se enviaran al correo asociado a tu cuenta o a la direccion que indiques en el formulario.',
    sections: [
      {
        title: 'Informes de errores',
        body: 'Incluye que ocurrio, que esperabas y la sala o pagina donde aparecio el problema.',
      },
      {
        title: 'Sugerencias',
        body: 'Comparte ideas para modos de juego, controles, funciones de perfil, puntuacion o cualquier cosa que mejore el sitio.',
      },
      {
        title: 'Solicitudes de privacidad',
        body:
          'Para solicitudes de acceso, correccion, eliminacion u oposicion, incluye el nombre de usuario y el correo registrado asociado a la cuenta para poder verificar la solicitud.',
      },
    ],
  },
  terms: {
    title: 'Terminos',
    intro:
      'Estos terminos describen las reglas basicas para usar Red Tetris. Al usar el sitio, aceptas jugar limpiamente y respetar a otros jugadores.',
    sections: [
      {
        title: 'Uso del servicio',
        body:
          'Red Tetris se ofrece para entretenimiento personal. No abuses del servicio, no interfieras con las partidas, no intentes acceder sin autorizacion y no uses automatizacion para alterar salas, puntuaciones o cuentas.',
      },
      {
        title: 'Cuentas y perfiles',
        body:
          'Eres responsable de la actividad vinculada a tu nombre de usuario y tus credenciales. Usa informacion de cuenta correcta y no suplantes a otros jugadores.',
      },
      {
        title: 'Partidas y puntuaciones',
        body:
          'Las puntuaciones, clasificaciones, salas y resultados multijugador pueden reiniciarse, corregirse o eliminarse si se ven afectados por errores, trampas, abuso o mantenimiento.',
      },
      {
        title: 'Disponibilidad',
        body:
          'El sitio se proporciona tal cual. Las funciones pueden cambiar, dejar de estar disponibles o retirarse sin aviso mientras el proyecto evoluciona.',
      },
    ],
  },
  privacy: {
    title: 'Politica de privacidad',
    intro:
      `Ultima actualizacion: ${PRIVACY_LAST_UPDATED}. Esta politica explica que recopila Red Tetris, por que se usa, cuanto tiempo se conserva y como puedes ejercer tus derechos RGPD/GDPR.`,
    sections: [
      {
        title: 'Responsable del tratamiento',
        body:
          `${PRIVACY_CONTROLLER_NAME} son responsables de decidir como se usan los datos de cuenta, perfil, contacto y juego para este despliegue de Red Tetris. No se ha nombrado un delegado de proteccion de datos independiente salvo que esta seccion indique lo contrario.`,
      },
      {
        title: 'Informacion que recopilamos',
        body:
          'El sitio puede almacenar tu nombre de usuario, correo electronico, hash de contrasena, ajustes de avatar, puntuaciones en solo, puntuaciones cooperativas, resultados multijugador, entradas de clasificacion, tokens de restablecimiento de contrasena, mensajes de contacto y datos tecnicos como direcciones IP usadas para registros de seguridad y limitacion anti-spam.',
      },
      {
        title: 'Como se usa la informacion',
        body:
          'Los datos se usan para crear cuentas, autenticar jugadores, restaurar accesos, mostrar perfiles, ejecutar salas, guardar puntuaciones, mantener clasificaciones, responder solicitudes de contacto, proteger el servicio contra abusos y mejorar la fiabilidad.',
      },
      {
        title: 'Bases legales',
        body:
          'Los datos de cuenta, inicio de sesion, perfil y juego se procesan para prestar el servicio que solicitas. Los datos de seguridad, anti-abuso y fiabilidad se procesan por intereses legitimos de proteger el sitio. Los mensajes de contacto se procesan para responder a tu solicitud. Algunas obligaciones legales pueden requerir conservar ciertos registros cuando corresponda.',
      },
      {
        title: 'Conservacion',
        body:
          'La eliminacion de cuenta puede solicitarse desde el menu de perfil. Las cuentas eliminadas se programan primero para eliminacion y pueden restaurarse durante 30 dias iniciando sesion de nuevo y eligiendo restaurar. Despues de ese periodo, la cuenta y los datos relacionados de perfil, sala y puntuacion se eliminan permanentemente de la base de datos. Los tokens de restablecimiento de contrasena son temporales y caducan rapidamente. Los mensajes de contacto y registros tecnicos se conservan solo mientras sean necesarios para soporte, seguridad y prevencion de abusos, y luego se eliminan o anonimizan.',
      },
      {
        title: 'Tus derechos',
        body:
          'Bajo RGPD/GDPR, puedes solicitar acceso, correccion, eliminacion, restriccion, portabilidad u oposicion al procesamiento de tus datos personales. Las solicitudes se responden en un mes cuando la ley lo exige, salvo que sean complejas o requieran verificacion de identidad.',
      },
      {
        title: 'Solicitudes de eliminacion',
        body:
          'Los usuarios conectados pueden exportar los datos de su cuenta o eliminarla desde esta pagina de privacidad. Tambien puedes usar la pagina de contacto para solicitudes de privacidad que requieran revision manual. Algunos datos pueden conservarse temporalmente cuando sea necesario por seguridad, prevencion de abusos, obligaciones legales o integridad de copias de seguridad.',
      },
      {
        title: 'Destinatarios y proveedores',
        body:
          'Los datos personales son procesados por el backend del sitio, la base de datos PostgreSQL, Railway para alojamiento del backend y base de datos, Vercel para alojamiento del frontend y Resend para correos transaccionales como restablecimiento de contrasena y mensajes de contacto. Los mensajes del formulario de contacto incluyen la direccion de correo que indicas como direccion de respuesta. Los datos no se venden.',
      },
      {
        title: 'Transferencias internacionales',
        body:
          'Railway, Vercel y Resend pueden procesar datos fuera del Espacio Economico Europeo, incluso en Estados Unidos. Estas transferencias se basan en las condiciones de procesamiento de datos y garantias de transferencia de esos proveedores, incluidas las clausulas contractuales tipo de la UE y, cuando corresponda, compromisos del Data Privacy Framework.',
        links: [
          { href: 'https://railway.com/legal/dpa', label: 'Railway DPA' },
          { href: 'https://vercel.com/legal/dpa', label: 'Vercel DPA' },
          { href: 'https://resend.com/legal/dpa', label: 'Resend DPA' },
        ],
      },
      {
        title: 'Acuerdos de encargado',
        body:
          'El operador del sitio debe mantener las condiciones de procesamiento de datos o acuerdos de encargado pertinentes con proveedores de alojamiento, base de datos y correo antes de usar esos proveedores para datos personales en produccion. Estos proveedores se usan solo para alojar el frontend, ejecutar el backend, almacenar la base de datos, enviar correos transaccionales, mantener la seguridad y proporcionar fiabilidad operativa.',
      },
      {
        title: 'Cookies y almacenamiento local',
        body:
          'La aplicacion usa almacenamiento local para funciones necesarias como recordar el usuario conectado localmente, detalles de cuenta necesarios para la interfaz, preferencias de tema y si se mostro el aviso de cookies. Esa confirmacion se conserva durante 13 meses, luego la aplicacion muestra el aviso de nuevo. El backend puede usar una cookie de sesion necesaria para mantenerte autenticado. Estos elementos se usan para funciones esenciales del servicio, no para publicidad ni seguimiento entre sitios. Actualmente no se requieren cookies publicitarias ni analiticas para el juego principal.',
      },
      {
        title: 'Direcciones IP y registros',
        body:
          'El backend usa informacion de solicitudes derivada de IP para prevencion de abusos y limitacion de tasa. Las entradas de limitacion del formulario de contacto se almacenan en memoria del servidor durante la ventana configurada, actualmente 1 hora por defecto. Las entradas de limitacion de autenticacion se almacenan en memoria del servidor durante 15 minutos por defecto. Estas entradas en memoria no se usan para publicidad y desaparecen al expirar la ventana o reiniciarse el servidor. Los proveedores de alojamiento, proxy inverso, correo y base de datos tambien pueden crear registros operativos con direcciones IP, marcas de tiempo, metadatos de solicitud o entrega; esos registros se conservan hasta 30 dias salvo que se necesite mas tiempo para investigar abuso, mantener seguridad, resolver un problema legal o cumplir obligaciones del proveedor o de la ley.',
      },
      {
        title: 'Seguridad',
        body:
          'Las contrasenas se almacenan como hashes, no en texto plano. Los despliegues de produccion usan HTTPS y restringen credenciales de base de datos, proveedor de correo y servidor solo a mantenedores autorizados.',
      },
      {
        title: 'Contacto y solicitudes',
        body:
          'Para preguntas de privacidad o solicitudes sobre datos de cuenta, usa la pagina de contacto e incluye el nombre de usuario y correo registrado de la cuenta. La eliminacion de cuenta esta disponible desde el menu de perfil. Si crees que tus derechos no fueron respetados, puedes contactar con tu autoridad local de proteccion de datos, como la CNIL en Francia.',
      },
    ],
  },
}

const es = {
  footer: {
    siteInformation: 'Informacion del sitio',
    about: 'Acerca de',
    contact: 'Contacto',
    terms: 'Terminos',
    privacy: 'Privacidad',
  },
  roomNotice: {
    roomUsed: 'Sala ya usada',
    userConnected: 'Usuario ya conectado',
  },
  appUi: {
    openProfileMenu: 'Abrir menu de perfil',
    profileTitle: 'Perfil',
    saveProfile: 'Guardar',
    connectionLost: 'Conexion perdida. Reconectando...',
    serverUnavailable: 'Servidor no disponible. Reintentando...',
    serverError: 'Error del servidor',
    reconnected: 'Reconectado.',
    reconnecting: 'Reconectando...',
    reconnectFailed: 'No se pudo reconectar. Actualiza la pagina.',
  },
  spectate: {
    missingUsername: 'Falta el nombre de usuario en la URL de espectador.',
    roomNotFound: 'Sala no encontrada',
    unauthorized: 'Espectador no autorizado',
    loading: 'Cargando modo espectador...',
    back: 'Volver',
    gameOver: 'Partida terminada',
    winner: 'Ganador',
    noWinner: 'Sin ganador',
    playAgain: 'Jugar de nuevo',
    backToMenu: 'Volver al menu',
  },
  auth: {
    languageLabel: 'Idioma',
    loginTab: 'Iniciar sesion',
    registerTab: 'Registrarse',
    loginTitle: 'Inicia sesion en tu cuenta',
    registerTitle: 'Crea tu cuenta',
    forgotTitle: 'Restablece tu contrasena',
    resetTitle: 'Elige una nueva contrasena',
    username: 'Usuario',
    email: 'Email',
    password: 'Contrasena',
    confirmPassword: 'Confirmar contrasena',
    showPassword: 'Mostrar contrasena',
    hidePassword: 'Ocultar contrasena',
    showConfirmPassword: 'Mostrar confirmacion de contrasena',
    hideConfirmPassword: 'Ocultar confirmacion de contrasena',
    randomize: 'Aleatorio',
    skin: 'Piel',
    eyes: 'Ojos',
    mouth: 'Boca',
    pleaseWait: 'Espera...',
    register: 'Registrarse',
    sendResetLink: 'Enviar enlace',
    updatePassword: 'Actualizar contrasena',
    login: 'Iniciar sesion',
    forgotPassword: 'Olvidaste la contrasena?',
    restoreAccount: 'Restaurar cuenta',
    backToLogin: 'Volver al inicio de sesion',
    missingData: 'Faltan datos',
    invalidEmail: 'Email invalido',
    invalidPassword: 'Contrasena invalida',
    passwordTooShort: 'La contrasena debe tener al menos 8 caracteres',
    passwordUppercase: 'La contrasena debe contener al menos 1 mayuscula',
    passwordLowercase: 'La contrasena debe contener al menos 1 minuscula',
    passwordNumber: 'La contrasena debe contener al menos 1 numero',
    passwordSpecial: 'La contrasena debe contener al menos 1 caracter especial',
    passwordMismatch: 'Las contrasenas no coinciden',
    invalidResetLink: 'Enlace de restablecimiento invalido o caducado',
    authenticationFailed: 'Autenticacion fallida',
    accountCreated: 'Cuenta creada. Inicia sesion.',
    passwordResetGenerated: 'Enlace de restablecimiento generado',
    passwordUpdated: 'Contrasena actualizada',
    serverUnavailable: 'Servidor no disponible',
    unableToRestore: 'No se pudo restaurar la cuenta',
  },
  profileMenu: {
    createTitle: 'Crea tu perfil',
    profileTitle: 'Perfil',
    randomize: 'Aleatorio',
    skin: 'Piel',
    eyes: 'Ojos',
    mouth: 'Boca',
    usernamePlaceholder: 'Usuario',
    play: 'A jugar!',
    save: 'Guardar',
    disconnect: 'Desconectar',
    missingData: 'Faltan datos',
    invalidUsername: 'Usuario invalido',
    serverUnavailable: 'Servidor no disponible',
    serverNotResponding: 'El servidor no responde',
    unknownError: 'Error desconocido',
    profileUpdateFailed: 'Error al actualizar el perfil',
  },
  menu: {
    heading: 'Selecciona modo de juego',
    soloTitle: 'Solo',
    soloDescription: 'Juega sin companeros y supera tu mejor puntuacion',
    multiplayerTitle: 'Multijugador',
    multiplayerDescription: 'Compite contra otros jugadores',
    options: 'Opciones',
  },
  options: {
    heading: 'Opciones',
    lightTheme: 'Tema claro',
    darkTheme: 'Tema oscuro',
    switchToLight: 'Cambiar a modo claro',
    switchToDark: 'Cambiar a modo oscuro',
    sound: 'Sonido',
    enabled: 'Activado',
    disabled: 'Desactivado',
    guide: 'Guia',
    guideDescription: 'Controles y modos',
    language: 'Idioma',
    languageDescription: 'Elegir idioma de pantalla',
    languageOptions: 'Opciones de idioma',
    back: 'Volver',
  },
  playerStats: {
    loadingStats: 'Cargando estadisticas...',
    playerStatsTitle: 'Estadisticas del jugador',
    advancedStatsTitle: 'Estadisticas avanzadas',
    closeAdvancedStats: 'Cerrar estadisticas avanzadas',
    timePlayed: 'Tiempo jugado',
    total: 'Total',
    solo: 'Solo',
    coop: 'Co-op',
    multi: 'Multi',
    soloGames: 'Partidas solo',
    highestSoloScore: 'Mejor puntuacion solo',
    multiplayerGames: 'Partidas multijugador',
    multiplayerWins: 'Victorias multijugador',
    multiplayerLosses: 'Derrotas multijugador',
    multiplayerWinrate: 'Porcentaje de victorias multijugador',
    advancedStatsButton: 'Estadisticas avanzadas',
    games: 'Partidas',
    winLoss: 'Victorias / Derrotas',
    winLossRatio: 'Ratio V/D',
    highestScore: 'Mejor puntuacion',
    averageScore: 'Puntuacion media',
    highestLevel: 'Nivel maximo',
    highestLines: 'Maximo de lineas',
    totalLines: 'Lineas totales',
    highestSent: 'Maximo enviado',
    totalSent: 'Total enviado',
    highestTetris: 'Mejor tetris',
    totalTetris: 'Tetris total',
    longestGame: 'Partida mas larga',
  },
  leaderboard: {
    title: '🏆 Clasificacion',
    solo: 'Solo',
    coop: 'Duo co-op',
    loading: 'Cargando...',
    playerOne: 'Jugador 1',
    playerTwo: 'Jugador 2',
    previousPage: 'Pagina anterior',
    nextPage: 'Pagina siguiente',
  },
  rooms: {
    passwordRequired: 'Contrasena requerida',
    invalidPassword: 'Contrasena invalida',
    title: 'Salas multijugador',
    createRoom: 'Crear sala',
    chooseRoomType: 'Elegir tipo de sala',
    cooperative: 'Cooperativa',
    multiplayer: 'Multijugador',
    optionalPassword: 'Contrasena opcional',
    publicRoomPlaceholder: 'Dejar vacio para una sala publica',
    availableRooms: 'Salas disponibles',
    emptyRooms: 'No hay salas disponibles. Crea una!',
    password: 'Contrasena',
    host: 'Anfitrion',
    roomPasswordPlaceholder: 'Contrasena de la sala',
    hidePassword: 'Ocultar contrasena',
    showPassword: 'Mostrar contrasena',
    joined: 'Unido',
    full: 'Llena',
    enter: 'Entrar',
    join: 'Unirse',
    back: 'Volver',
  },
  createRoom: {
    joinErrors: {
      'Username already connected': 'Este usuario ya esta conectado en esta sala.',
      'Room is full': 'Esta sala ya esta llena.',
      'User is already in a room': 'Este jugador ya esta ocupado en otra sala.',
      default: 'Esta sala ya esta ocupada. Prueba otra sala u otro usuario.',
    },
    roomActionErrors: {
      used: 'Sala ya usada.',
      invalidName: 'Nombre de sala invalido',
      invalidMode: 'Modo de juego invalido',
      hostRenameOnly: 'Solo el anfitrion puede renombrar la sala.',
      default: 'No se puede actualizar la sala ahora mismo.',
    },
    modes: {
      classic: { label: 'Clasico', description: 'Tetris competitivo estandar donde las lineas eliminadas envian penalizaciones a los oponentes.' },
      mirror: { label: 'Espejo', description: 'Los controles estan invertidos, asi que movimientos y caidas se comportan de forma distinta.' },
      chaotic: { label: 'Caotico', description: 'Tu pieza actual y la siguiente pueden intercambiarse aleatoriamente durante la partida.' },
      invisible: { label: 'Invisible', description: 'La pieza activa es mas dificil de seguir mientras cae.' },
      giant: { label: 'Gigante', description: 'Juega en un tablero mas grande con mas espacio y mayor supervivencia.' },
      cooperative: { label: 'Co-op alternada', description: 'Dos jugadores comparten un tablero y juegan por turnos.' },
      cooperative_roles: { label: 'Co-op por roles', description: 'Dos jugadores comparten un tablero con roles separados para movimiento y rotacion.' },
    },
    invalidPassword: 'Contrasena invalida',
    passwordRequired: 'Contrasena requerida',
    joinFailed: 'No se pudo unir a la sala',
    editRoomName: 'Editar nombre de sala',
    currentPassword: 'Contrasena actual de la sala',
    password: 'Contrasena',
    roomPassword: 'Contrasena de la sala',
    hidePassword: 'Ocultar contrasena',
    showPassword: 'Mostrar contrasena',
    joinRoom: 'Unirse a la sala',
    back: 'Volver',
    gameMode: 'Modo de juego',
    players: 'Jugadores',
    waitingPlayers: 'Esperando jugadores...',
    startGame: 'Iniciar partida',
  },
  game: {
    controls: [
      { keys: 'Flecha izquierda / derecha', action: 'Mover' },
      { keys: 'Flecha arriba', action: 'Rotar' },
      { keys: 'Flecha abajo', action: 'Descenso suave' },
      { keys: 'Espacio', action: 'Caida instantanea' },
      { keys: 'C / Mayus', action: 'Guardar' },
      { keys: 'Escape', action: 'Opciones' },
    ],
    options: 'Opciones',
    score: 'Puntuacion',
    lines: 'Lineas',
    level: 'Nivel',
    hold: 'Reserva',
    holdAria: 'Pieza guardada',
    boardAria: 'Tablero de Tetris',
    next: 'Siguiente',
    nextAria: 'Pieza siguiente',
    keyboardControlsAria: 'Controles de teclado',
    countdownAria: 'Cuenta atras',
    countdownGo: 'Go',
    pause: 'Pausa',
    gameMenu: 'Menu de juego',
    soundOn: 'Sonido: activado',
    soundOff: 'Sonido: desactivado',
    resume: 'Continuar',
    leaveGame: 'Salir de la partida',
    yourTurn: 'TU TURNO',
    playing: 'Jugando',
    playingFallback: 'Jugando: ...',
    rotateRole: 'ROTACION',
    placeRole: 'COLOCACION',
    assigningRole: 'ASIGNANDO ROL...',
    opponents: 'Oponentes',
    opponentBoard: 'tablero',
  },
  gameOver: {
    gameOver: 'Partida terminada',
    won: 'Ganaste',
    lost: 'Perdiste',
    winner: 'Ganador',
    playAgain: 'Jugar de nuevo',
    spectate: 'Ver',
    backToMenu: 'Volver al menu',
  },
  spectator: {
    title: 'Modo espectador',
    empty: 'No hay jugadores para ver.',
    back: 'Volver',
    watching: 'Viendo a',
    previous: 'Anterior',
    next: 'Siguiente',
    score: 'Puntuacion',
    lines: 'Lineas',
    level: 'Nivel',
    hold: 'Reserva',
    nextPiece: 'Siguiente',
    holdPieceLabel: 'Pieza guardada',
    nextPieceLabel: 'Pieza siguiente',
    boardLabel: 'Tablero de Tetris',
    opponents: 'Oponentes',
    opponentBoard: 'tablero',
  },
  cookieNotice: {
    label: 'Aviso de cookies',
    message:
      'Red Tetris usa solo cookies necesarias para mantener tu sesion y ejecutar el juego. Son necesarias para el servicio y no se usan para publicidad ni analitica. Recordamos que este aviso se mostro durante 13 meses.',
    privacy: 'Privacidad',
    acknowledge: 'Entendido',
  },
  infoPage: {
    pages,
    labels: {
      informationPages: 'Paginas de informacion',
      back: '\u2190 Volver',
      closeGuide: 'Cerrar guia',
      about: 'Acerca de',
      contact: 'Contacto',
      terms: 'Terminos',
      privacy: 'Privacidad',
      accountPrivacyTools: 'Herramientas de privacidad de cuenta',
      accountTools: 'Herramientas de cuenta',
      signedInAs: 'Sesion iniciada como',
      exporting: 'Exportando...',
      exportData: 'Exportar mis datos',
      deleting: 'Eliminando...',
      deleteAccount: 'Eliminar mi cuenta',
      signInForPrivacyTools: 'Inicia sesion para exportar los datos de tu cuenta o eliminar tu cuenta directamente.',
      exportError: 'No se pudieron exportar los datos de la cuenta',
      exportSuccess: 'Exportacion de datos de cuenta descargada.',
      deleteConfirm: (username) =>
        `Eliminar la cuenta de Red Tetris "${username}" y sus puntuaciones? Esta accion no se puede deshacer.`,
      deleteError: 'No se pudo eliminar la cuenta',
      deleteSuccess: 'Cuenta eliminada.',
      tutorialCarousel: 'Tutorial de controles de Tetris',
      previousControl: 'Mostrar control anterior',
      nextControl: 'Mostrar control siguiente',
      tutorialSlides: 'Diapositivas del tutorial',
      showTutorialSlide: (title) => `Mostrar ${title}`,
    },
    contact: {
      captchaLoadError: 'No se pudo cargar el captcha',
      captchaLoadStatus: 'No se pudo cargar el captcha. Actualiza la pagina.',
      requiredObjectAndMessage: 'El asunto y el mensaje son obligatorios.',
      requiredEmail: 'El email es obligatorio.',
      objectTooLong: `El asunto debe tener ${CONTACT_OBJECT_MAX_LENGTH} caracteres o menos.`,
      messageTooLong: `El mensaje debe tener ${CONTACT_MESSAGE_MAX_LENGTH} caracteres o menos.`,
      requiredCaptcha: 'La respuesta del captcha es obligatoria.',
      sendError: 'No se pudo enviar el mensaje',
      sendSuccess: 'Mensaje enviado.',
      mailTimeout: 'Tiempo de espera del servidor de correo agotado. Intentalo mas tarde.',
      objectLabel: 'Asunto',
      messageLabel: 'Mensaje',
      emailLabel: 'Email',
      captchaLabel: 'Captcha',
      honeypotLabel: 'Sitio web',
      objectPlaceholder: 'Informe de error o sugerencia',
      messagePlaceholder: 'Describe el problema o la idea...',
      emailPlaceholder: 'Tu email',
      captchaLoading: 'Cargando...',
      captchaPlaceholder: 'Respuesta',
      refreshCaptcha: 'Actualizar captcha',
      sending: 'Enviando...',
      sendMessage: 'Enviar mensaje',
    },
    tutorialControls: {
      'move-left': {
        ariaLabel: 'Tutorial de movimiento a la izquierda',
        key: 'Izquierda',
        title: 'Mover a la izquierda',
        description: 'Pulsa la flecha izquierda para mover la pieza que cae una columna a la izquierda.',
      },
      'move-right': {
        ariaLabel: 'Tutorial de movimiento a la derecha',
        key: 'Derecha',
        title: 'Mover a la derecha',
        description: 'Pulsa la flecha derecha para mover la pieza que cae una columna a la derecha.',
      },
      'soft-drop': {
        ariaLabel: 'Tutorial de descenso suave',
        key: 'Abajo',
        title: 'Descenso suave',
        description: 'Mantén la flecha abajo para hacer que la pieza caiga mas rapido sin perder el control.',
      },
      'hard-drop': {
        ariaLabel: 'Tutorial de caida instantanea',
        key: 'Espacio',
        title: 'Caida instantanea',
        description: 'Pulsa Espacio para enviar la pieza directamente a su posicion de aterrizaje.',
      },
      rotation: {
        ariaLabel: 'Tutorial de rotacion',
        key: 'Arriba',
        title: 'Rotar',
        description: 'Pulsa Arriba para rotar la pieza que cae y darle la forma que necesitas.',
      },
      hold: {
        ariaLabel: 'Tutorial de pieza guardada',
        key: 'C / Mayus',
        title: 'Guardar pieza',
        description: 'Pulsa C o Mayus para apartar la pieza actual y usarla mas tarde.',
      },
    },
  },
}

export default es
