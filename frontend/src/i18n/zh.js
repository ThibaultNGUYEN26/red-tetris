const CONTACT_OBJECT_MAX_LENGTH = 120
const CONTACT_MESSAGE_MAX_LENGTH = 4000
const PRIVACY_LAST_UPDATED = '2026年5月5日'
const PRIVACY_CONTROLLER_NAME = 'Thibault 和 Riham'

const pages = {
  about: {
    title: '关于 Red Tetris',
    intro:
      'Red Tetris 是我们两人团队为 42 学校构建的项目。目标是创建一个实时网页版俄罗斯方块，支持单人模式、合作房间、多人房间和同步游戏。',
    sections: [
      {
        title: '游戏模式',
        body:
          '游戏包括单人模式（追求最高分）、合作房间（两名玩家共同应对挑战），以及多人房间（玩家实时竞技）。在竞技多人模式中，消除行可以向对手发送惩罚行，使每局更具策略性。',
      },
      {
        title: '个人资料与分数',
        body:
          '玩家资料记录有用的统计数据，如最高分、已玩局数、已消除行数、达到的等级、单人结果、合作分数和多人结果，让玩家随时间追踪进步。',
      },
      {
        title: '项目',
        body:
          '该项目由两人团队在 42 学校开发。我们使用 React 构建前端，并使用 Socket.IO 处理玩家之间的实时通信。后端管理房间、游戏状态、同步、分数和多人事件。',
      },
    ],
  },
  contact: {
    title: '联系',
    intro: '将错误报告、建议、账户问题或隐私请求直接发送到 Red Tetris 邮箱。回复将发送到与您账户关联的电子邮件地址或您在表单中提供的地址。',
    sections: [
      {
        title: '错误报告',
        body: '请说明发生了什么、您预期发生什么，以及问题出现的房间或页面。',
      },
      {
        title: '建议',
        body: '分享关于游戏模式、控制、个人资料功能、计分或任何能改善网站的想法。',
      },
      {
        title: '隐私请求',
        body: '对于访问、更正、删除或异议请求，请提供账户关联的用户名和注册邮箱，以便验证请求。',
      },
    ],
  },
}

pages.tutorial = {
  title: '指南',
  intro:
    '在加入房间之前了解控制方式和游戏模式。',
  sections: [
    {
      title: '控制',
      body:
        '使用左右方向键移动方块，下方向键软降，上方向键旋转，空格键硬降，C 或 Shift 键保留当前方块。Escape 在单人模式中打开暂停/选项菜单，在多人模式中打开游戏菜单。',
    },
    {
      title: '单人',
      body:
        '单人模式让您独自游玩、消除行、升级并追求最高分。您的单人结果可以出现在您的个人资料和单人排行榜上。',
    },
    {
      title: '多人',
      body:
        '在多人房间中，最多 8 名玩家在各自的棋盘上实时竞技。消除多行会向对手发送惩罚行，最后存活的玩家获胜。',
    },
    {
      title: '经典',
      body:
        '经典是标准的竞技多人模式。每个人使用正常控制游玩，消除的行可以向其他棋盘发送惩罚。',
    },
    {
      title: '镜像',
      body:
        '镜像反转部分控制：左右方向键向相反方向移动方块，下方向键触发硬降，空格键变为软降。',
    },
    {
      title: '混乱',
      body:
        '混乱保持竞技规则，但在游戏中随机交换当前方块和下一个方块，需要快速适应。',
    },
    {
      title: '隐形',
      body:
        '隐形保持竞技规则，但隐藏正在下落的方块。玩家必须凭记忆追踪其位置，而已放置的方块保持可见。',
    },
    {
      title: '巨型',
      body:
        '巨型使用更大的棋盘，给玩家更多空间，但也需要在多人压力下管理更多行和列。',
    },
    {
      title: '交替合作',
      body:
        '交替合作是两人在共享棋盘上轮流控制方块的模式，沟通和时机至关重要。',
    },
    {
      title: '角色合作',
      body:
        '角色合作是两人在共享棋盘上的模式，一人负责旋转，另一人负责移动和下落。两名玩家必须协调配合才能存活。',
    },
    {
      title: '观战',
      body:
        '在多人模式中，被淘汰的玩家可以观看剩余棋盘而不是立即离开。',
    },
  ],
}

pages.terms = {
  title: '条款',
  intro:
    '这些条款描述了使用 Red Tetris 的基本规则。使用本网站即表示您同意公平游戏并尊重其他玩家。',
  sections: [
    {
      title: '服务使用',
      body:
        'Red Tetris 提供用于个人娱乐。请勿滥用服务、干扰游戏、尝试未经授权的访问或使用自动化手段破坏房间、分数或账户。',
    },
    {
      title: '账户和个人资料',
      body:
        '您对与用户名和登录信息关联的活动负责。使用准确的账户信息，不得冒充其他玩家。',
    },
    {
      title: '游戏和分数',
      body:
        '如果分数、排行榜、房间和多人结果受到错误、作弊、滥用或维护影响，可能会被重置、更正或删除。',
    },
    {
      title: '可用性',
      body:
        '网站按原样提供。在项目发展过程中，功能可能会更改、不可用或在不通知的情况下删除。',
    },
  ],
}

pages.privacy = {
  title: '隐私政策',
  intro:
    `最后更新于 ${PRIVACY_LAST_UPDATED}。本政策说明 Red Tetris 收集什么、使用原因、保留时长以及您如何行使 GDPR 权利。`,
  sections: [
    {
      title: '控制者',
      body:
        `${PRIVACY_CONTROLLER_NAME} 负责决定如何将账户、个人资料、联系和游戏数据用于此 Red Tetris 部署。除非本节另有说明，否则不指定单独的数据保护官。`,
    },
    {
      title: '我们收集的信息',
      body:
        '网站可能存储您的用户名、电子邮件地址、密码哈希、头像设置、单人分数、合作分数、多人结果、排行榜条目、密码重置令牌、联系消息以及用于安全日志和反垃圾邮件速率限制的 IP 地址等技术数据。',
    },
    {
      title: '信息使用方式',
      body:
        '数据用于创建账户、验证玩家身份、恢复访问、显示个人资料、运营房间、保存分数、维护排行榜、回答联系请求、保护服务免受滥用以及提高可靠性。',
    },
    {
      title: '法律依据',
      body:
        '账户、登录、个人资料和游戏数据的处理是为了提供您请求的服务。安全、反滥用和可靠性数据基于保护网站的合法利益进行处理。联系消息的处理是为了回答您的请求。适用时，法律义务可能要求保留某些记录。',
    },
    {
      title: '保留',
      body:
        '账户删除可从个人资料菜单请求。已删除账户首先被安排删除，可以在 30 天内通过再次登录并选择恢复来恢复。该恢复窗口过后，账户及相关个人资料、房间和分数数据将从数据库中永久删除。密码重置令牌是临时的，在短时间后过期。联系消息和技术日志仅在支持、安全和滥用预防所需的时间内保留，之后在不再需要时删除或匿名化。',
    },
    {
      title: '您的权利',
      body:
        '根据 GDPR，您可以请求访问、更正、删除、限制、可携带性或反对处理您的个人数据。如有要求，请求将在一个月内得到回答，除非请求复杂或需要身份验证。',
    },
    {
      title: '删除请求',
      body:
        '已登录用户可以从此隐私页面导出账户数据或删除账户。您也可以使用联系页面进行需要人工审核的隐私请求。当安全、滥用预防、法律义务或备份完整性需要时，某些数据可能会被临时保留。',
    },
    {
      title: '接收者和提供者',
      body:
        '个人数据由网站后端、PostgreSQL 数据库、Railway（后端和数据库托管）、Vercel（前端托管）和 Resend（用于密码重置和联系消息等交易性电子邮件）处理。联系表单消息包含您提供的电子邮件地址作为回复地址。数据不会被出售。',
    },
    {
      title: '国际传输',
      body:
        'Railway、Vercel 和 Resend 可能在欧洲经济区以外处理数据，包括在美国。传输依赖于这些提供商提供的数据处理条款和传输保障，包括欧盟标准合同条款以及（在适用的情况下）数据隐私框架承诺。',
      links: [
        { href: 'https://railway.com/legal/dpa', label: 'Railway DPA' },
        { href: 'https://vercel.com/legal/dpa', label: 'Vercel DPA' },
        { href: 'https://resend.com/legal/dpa', label: 'Resend DPA' },
      ],
    },
    {
      title: '处理协议',
      body:
        '网站运营商在将这些提供商用于生产个人数据之前，必须与托管、数据库和电子邮件提供商保持相关数据处理条款或处理协议。这些提供商仅用于托管前端、运行后端、存储数据库、发送交易性电子邮件、维护安全和提供运营可靠性。',
    },
    {
      title: 'Cookie 和本地存储',
      body:
        '应用程序使用本地存储来提供必要功能，例如本地记住已登录用户、界面所需的已保存账户详细信息、主题偏好以及是否显示过 Cookie 通知。该通知确认保留 13 个月，之后应用程序再次显示。后端可能使用必要的会话 Cookie 保持您的登录状态。这些存储项目用于核心服务功能，而非广告或跨站点跟踪。核心游戏目前不需要广告或分析 Cookie。',
    },
    {
      title: 'IP 地址和日志',
      body:
        '后端使用基于 IP 的请求信息进行滥用预防和速率限制。联系表单速率限制条目在配置的联系窗口（当前默认为 1 小时）内存储在服务器内存中。身份验证速率限制条目默认存储在服务器内存中 15 分钟。这些内存条目不用于广告，当窗口过期或服务器重启时消失。托管、反向代理、电子邮件和数据库提供商也可能创建包含 IP 地址、时间戳、请求元数据或传递元数据的运营日志；这些日志最多保留 30 天，除非调查滥用、维护安全、解决法律问题或遵守提供商/法律义务需要更长时间。',
    },
    {
      title: '安全',
      body:
        '密码以哈希形式存储，而非明文。生产部署使用 HTTPS，并将数据库、电子邮件提供商和服务器凭据限制为仅授权维护人员访问。',
    },
    {
      title: '联系和请求',
      body:
        '对于隐私问题或账户数据请求，请使用联系页面并提供账户的用户名和注册邮箱。账户删除可从个人资料菜单获得。如果您认为您的权利未得到尊重，可以联系您当地的数据保护机构。',
    },
  ],
}

const zh = {
  footer: {
    siteInformation: '网站信息',
    about: '关于',
    contact: '联系',
    terms: '条款',
    privacy: '隐私',
  },
  roomNotice: {
    roomUsed: '房间已被使用',
    userConnected: '用户已连接',
  },
  appUi: {
    openProfileMenu: '打开个人资料菜单',
    profileTitle: '个人资料',
    saveProfile: '保存',
    connectionLost: '连接断开。正在重连...',
    serverUnavailable: '服务器不可用。正在重试...',
    serverError: '服务器错误',
    reconnected: '已重新连接。',
    reconnecting: '正在重连...',
    reconnectFailed: '无法重新连接。请刷新页面。',
  },
  spectate: {
    missingUsername: '观战 URL 中缺少用户名。',
    roomNotFound: '未找到房间',
    unauthorized: '观战者未获授权',
    loading: '正在加载观战模式...',
    back: '返回',
    gameOver: '游戏结束',
    winner: '获胜者',
    noWinner: '无获胜者',
    playAgain: '再玩一次',
    backToMenu: '返回菜单',
  },
  auth: {
    languageLabel: '语言',
    loginTab: '登录',
    registerTab: '注册',
    loginTitle: '登录您的账户',
    registerTitle: '创建您的账户',
    forgotTitle: '重置您的密码',
    resetTitle: '选择新密码',
    username: '用户名',
    email: '电子邮件',
    password: '密码',
    confirmPassword: '确认密码',
    showPassword: '显示密码',
    hidePassword: '隐藏密码',
    showConfirmPassword: '显示确认密码',
    hideConfirmPassword: '隐藏确认密码',
    randomize: '随机',
    skin: '肤色',
    eyes: '眼睛',
    mouth: '嘴巴',
    pleaseWait: '请稍候...',
    register: '注册',
    sendResetLink: '发送重置链接',
    updatePassword: '更新密码',
    login: '登录',
    forgotPassword: '忘记密码？',
    restoreAccount: '恢复账户',
    backToLogin: '返回登录',
    missingData: '缺少数据',
    invalidEmail: '无效的电子邮件',
    invalidPassword: '无效的密码',
    passwordTooShort: '密码至少需要 8 个字符',
    passwordUppercase: '密码必须包含至少 1 个大写字母',
    passwordLowercase: '密码必须包含至少 1 个小写字母',
    passwordNumber: '密码必须包含至少 1 个数字',
    passwordSpecial: '密码必须包含至少 1 个特殊字符',
    passwordMismatch: '密码不匹配',
    invalidResetLink: '无效或过期的重置链接',
    authenticationFailed: '身份验证失败',
    accountCreated: '账户已创建。请登录。',
    passwordResetGenerated: '密码重置链接已生成',
    passwordUpdated: '密码已更新',
    serverUnavailable: '服务器不可用',
    unableToRestore: '无法恢复账户',
  },
  profileMenu: {
    createTitle: '创建您的个人资料',
    profileTitle: '个人资料',
    randomize: '随机',
    skin: '肤色',
    eyes: '眼睛',
    mouth: '嘴巴',
    usernamePlaceholder: '用户名',
    play: '开始游戏！',
    save: '保存',
    disconnect: '断开连接',
    missingData: '缺少数据',
    invalidUsername: '无效的用户名',
    serverUnavailable: '服务器不可用',
    serverNotResponding: '服务器无响应',
    unknownError: '未知错误',
    profileUpdateFailed: '个人资料更新失败',
  },
  menu: {
    heading: '选择游戏模式',
    soloTitle: '单人',
    soloDescription: '独自游玩并打破您的最高分',
    multiplayerTitle: '多人',
    multiplayerDescription: '与其他玩家竞技',
    options: '选项',
    shop: '商店',
  },
  shop: {
    kicker: '外观',
    heading: '商店',
    pack_classic: '经典',
    pack_plain: '纯色',
    pack_neon: '霓虹',
    pack_pastel: '粉彩',
    pack_retro: '复古',
    pack_ocean: '海洋',
    pack_bubble: '气泡',
    pack_fire: '火焰',
    pack_arcane: '神秘',
    equipped: '已装备',
    equip: '装备',
    buy: '购买',
    notEnough: '金币不足',
    comingSoon: '即将推出',
    back: '返回',
    sectionTetrominoes: '方块',
  },
  options: {
    heading: '选项',
    kicker: '系统',
    lightTheme: '浅色主题',
    darkTheme: '深色主题',
    switchToLight: '切换到浅色模式',
    switchToDark: '切换到深色模式',
    themeLight: '浅色',
    themeDark: '深色',
    soundEffects: '音效',
    music: '音乐',
    enabled: '已启用',
    disabled: '已禁用',
    on: '开',
    off: '关',
    open: '打开',
    guide: '指南',
    guideDescription: '控制和模式',
    language: '语言',
    languageDescription: '选择显示语言',
    languageOptions: '语言选项',
    back: '返回',
  },
  playerStats: {
    loadingStats: '正在加载统计数据...',
    playerStatsTitle: '玩家统计',
    advancedStatsTitle: '高级统计',
    closeAdvancedStats: '关闭高级统计',
    timePlayed: '游玩时长',
    total: '总计',
    solo: '单人',
    coop: '合作',
    multi: '多人',
    soloGames: '单人局数',
    highestSoloScore: '单人最高分',
    multiplayerGames: '多人局数',
    multiplayerWins: '多人胜利',
    multiplayerLosses: '多人失败',
    multiplayerWinrate: '多人胜率',
    advancedStatsButton: '高级统计',
    games: '局数',
    winLoss: '胜 / 负',
    winLossRatio: '胜负比',
    highestScore: '最高分',
    averageScore: '平均分',
    highestLevel: '最高等级',
    highestLines: '最多消除行',
    totalLines: '总消除行',
    highestSent: '最多发送',
    totalSent: '总发送',
    highestTetris: '最高 Tetris',
    totalTetris: '总 Tetris',
    longestGame: '最长一局',
  },
  leaderboard: {
    title: '🏆 排行榜',
    solo: '单人',
    coop: '合作双人',
    loading: '加载中…',
    playerOne: '玩家 1',
    playerTwo: '玩家 2',
    previousPage: '上一页',
    nextPage: '下一页',
  },
  rooms: {
    passwordRequired: '需要密码',
    invalidPassword: '无效的密码',
    title: '多人房间',
    createRoom: '创建房间',
    chooseRoomType: '选择房间类型',
    cooperative: '合作',
    multiplayer: '多人',
    optionalPassword: '可选密码',
    publicRoomPlaceholder: '留空创建公开房间',
    availableRooms: '可用房间',
    emptyRooms: '暂无房间。创建一个吧！',
    password: '密码',
    host: '房主',
    roomPasswordPlaceholder: '房间密码',
    hidePassword: '隐藏密码',
    showPassword: '显示密码',
    joined: '已加入',
    full: '已满',
    enter: '进入',
    join: '加入',
    back: '返回',
  },
  createRoom: {
    joinErrors: {
      'Username already connected': '该用户名已在此房间中连接。',
      'Room is full': '该房间已满。',
      'User is already in a room': '该玩家已在另一个房间中。',
      default: '该房间已有人。请尝试其他房间或用户名。',
    },
    roomActionErrors: {
      used: '房间已被使用。',
      invalidName: '无效的房间名称',
      invalidMode: '无效的游戏模式',
      hostRenameOnly: '只有房主可以重命名房间。',
      default: '目前无法更新房间。',
    },
    modes: {
      classic: { label: '经典', description: '标准竞技俄罗斯方块，消除行会向对手发送惩罚。' },
      mirror: { label: '镜像', description: '控制被反转，移动和下落方式不同。' },
      chaotic: { label: '混乱', description: '游戏中当前方块和下一个方块可能随机互换。' },
      invisible: { label: '隐形', description: '活动方块在下落时更难追踪。' },
      giant: { label: '巨型', description: '在更大的棋盘上游玩，有更多空间和更长的生存时间。' },
      cooperative: { label: '交替合作', description: '两名玩家共享棋盘，轮流控制方块。' },
      cooperative_roles: { label: '角色合作', description: '两名玩家共享棋盘，分别负责移动和旋转。' },
    },
    invalidPassword: '无效的密码',
    passwordRequired: '需要密码',
    joinFailed: '无法加入房间',
    editRoomName: '编辑房间名称',
    currentPassword: '当前房间密码',
    password: '密码',
    roomPassword: '房间密码',
    hidePassword: '隐藏密码',
    showPassword: '显示密码',
    joinRoom: '加入房间',
    back: '返回',
    gameMode: '游戏模式',
    players: '玩家',
    waitingPlayers: '等待玩家...',
    startGame: '开始游戏',
  },
  game: {
    controls: [
      { keys: '左 / 右方向键', action: '移动' },
      { keys: '上方向键', action: '旋转' },
      { keys: '下方向键', action: '软降' },
      { keys: '空格', action: '硬降' },
      { keys: 'C / Shift', action: '保留' },
      { keys: 'Escape', action: '选项' },
    ],
    kicker: '游戏',
    exit: '退出',
    play: '游玩',
    options: '选项',
    score: '分数',
    lines: '行数',
    level: '等级',
    hold: '保留',
    holdAria: '保留的方块',
    boardAria: '俄罗斯方块棋盘',
    next: '下一个',
    nextAria: '下一个方块',
    keyboardControlsAria: '键盘控制',
    countdownAria: '游戏倒计时',
    countdownGo: '开始',
    pause: '暂停',
    gameMenu: '游戏菜单',
    soundEffectsOn: '音效：已启用',
    soundEffectsOff: '音效：已禁用',
    musicOn: '音乐：已启用',
    musicOff: '音乐：已禁用',
    resume: '继续',
    leaveGame: '离开游戏',
    yourTurn: '您的回合',
    playing: '游玩中',
    playingFallback: '游玩中：...',
    rotateRole: '旋转',
    placeRole: '放置',
    assigningRole: '正在分配角色...',
    opponents: '对手',
    opponentBoard: '棋盘',
  },
  gameOver: {
    gameOver: '游戏结束',
    won: '您赢了',
    lost: '您输了',
    winner: '获胜者',
    playAgain: '再玩一次',
    spectate: '观战',
    backToMenu: '返回菜单',
  },
  spectator: {
    title: '观战模式',
    empty: '没有可观看的玩家。',
    back: '返回',
    watching: '正在观看',
    previous: '上一个',
    next: '下一个',
    score: '分数',
    lines: '行数',
    level: '等级',
    hold: '保留',
    nextPiece: '下一个',
    holdPieceLabel: '保留的方块',
    nextPieceLabel: '下一个方块',
    boardLabel: '俄罗斯方块棋盘',
    opponents: '对手',
    opponentBoard: '棋盘',
    sendConfetti: '🎉',
    sendConfettiLabel: '发送彩纸',
  },
  cookieNotice: {
    label: 'Cookie 通知',
    message:
      'Red Tetris 仅使用必要的 Cookie 来保持您的登录状态并运行游戏。它们是服务所必需的，不用于广告或分析。我们会记住此通知已显示 13 个月。',
    privacy: '隐私',
    acknowledge: '知道了',
  },
  infoPage: {
    pages,
    labels: {
      informationPages: '信息页面',
      back: '← 返回',
      closeGuide: '关闭指南',
      about: '关于',
      contact: '联系',
      terms: '条款',
      privacy: '隐私',
      accountPrivacyTools: '账户隐私工具',
      accountTools: '账户工具',
      signedInAs: '已登录为',
      exporting: '正在导出...',
      exportData: '导出我的数据',
      deleting: '正在删除...',
      deleteAccount: '删除我的账户',
      signInForPrivacyTools: '登录以导出您的账户数据或直接删除账户。',
      exportError: '无法导出账户数据',
      exportSuccess: '账户数据导出已下载。',
      deleteConfirm: (username) =>
        `删除 Red Tetris 账户"${username}"及其分数？此操作无法撤销。`,
      deleteError: '无法删除账户',
      deleteSuccess: '账户已删除。',
      tutorialCarousel: '俄罗斯方块控制教程',
      previousControl: '显示上一个控制',
      nextControl: '显示下一个控制',
      tutorialSlides: '教程幻灯片',
      showTutorialSlide: (title) => `显示${title}`,
    },
    contact: {
      captchaLoadError: '无法加载验证码',
      captchaLoadStatus: '无法加载验证码。请刷新页面。',
      requiredObjectAndMessage: '主题和消息为必填项。',
      requiredEmail: '电子邮件为必填项。',
      objectTooLong: `主题不得超过 ${CONTACT_OBJECT_MAX_LENGTH} 个字符。`,
      messageTooLong: `消息不得超过 ${CONTACT_MESSAGE_MAX_LENGTH} 个字符。`,
      requiredCaptcha: '需要验证码答案。',
      sendError: '无法发送消息',
      sendSuccess: '消息已发送。',
      mailTimeout: '邮件服务器超时。请稍后再试。',
      objectLabel: '主题',
      messageLabel: '消息',
      emailLabel: '电子邮件',
      captchaLabel: '验证码',
      honeypotLabel: '网站',
      objectPlaceholder: '错误报告或建议',
      messagePlaceholder: '描述问题或想法...',
      emailPlaceholder: '您的电子邮件',
      captchaLoading: '加载中...',
      captchaPlaceholder: '答案',
      refreshCaptcha: '刷新验证码',
      sending: '正在发送...',
      sendMessage: '发送消息',
    },
    tutorialControls: {
      'move-left': {
        ariaLabel: '向左移动教程',
        key: '左',
        title: '向左移动',
        description: '按左方向键将下落的方块向左移动一列。',
      },
      'move-right': {
        ariaLabel: '向右移动教程',
        key: '右',
        title: '向右移动',
        description: '按右方向键将下落的方块向右移动一列。',
      },
      'soft-drop': {
        ariaLabel: '软降教程',
        key: '下',
        title: '软降',
        description: '按住下方向键使方块更快下落，同时保持控制。',
      },
      'hard-drop': {
        ariaLabel: '硬降教程',
        key: '空格',
        title: '硬降',
        description: '按空格键将方块直接发送到落地位置。',
      },
      rotation: {
        ariaLabel: '旋转教程',
        key: '上',
        title: '旋转',
        description: '按上方向键将下落的方块旋转成您需要的形状。',
      },
      hold: {
        ariaLabel: '保留方块教程',
        key: 'C / Shift',
        title: '保留方块',
        description: '按 C 或 Shift 将当前方块搁置，以后使用。',
      },
    },
  },
}

export default zh
