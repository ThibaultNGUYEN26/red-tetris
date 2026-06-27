const CONTACT_OBJECT_MAX_LENGTH = 120
const CONTACT_MESSAGE_MAX_LENGTH = 4000
const PRIVACY_LAST_UPDATED = 'ngày 5 tháng 5 năm 2026'
const PRIVACY_CONTROLLER_NAME = 'Thibault và Riham'

const pages = {
  about: {
    title: 'Giới thiệu về Red Tetris',
    intro:
      'Red Tetris là một dự án của trường 42 mà chúng tôi xây dựng theo nhóm hai người. Mục tiêu là tạo ra phiên bản web thời gian thực của Tetris với chế độ chơi đơn, phòng hợp tác, phòng nhiều người và gameplay được đồng bộ hóa.',
    sections: [
      {
        title: 'Chế độ chơi',
        body:
          'Trò chơi bao gồm chế độ đơn để săn điểm cao nhất của bạn, phòng hợp tác nơi hai người chơi cùng vượt qua một thử thách, và phòng nhiều người nơi người chơi tranh tài theo thời gian thực. Trong chế độ nhiều người cạnh tranh, xóa hàng có thể gửi hàng phạt cho đối thủ, khiến mỗi ván đấu mang tính chiến thuật hơn.',
      },
      {
        title: 'Hồ sơ và điểm số',
        body:
          'Hồ sơ người chơi lưu trữ các số liệu thống kê hữu ích như điểm cao nhất, số ván đã chơi, số hàng đã xóa, cấp độ đạt được, kết quả đơn, điểm hợp tác và kết quả nhiều người, cho phép người chơi theo dõi tiến trình của mình theo thời gian.',
      },
      {
        title: 'Dự án',
        body:
          'Dự án này được xây dựng tại trường 42 bởi một nhóm hai người. Chúng tôi phát triển giao diện với React và sử dụng Socket.IO để xử lý giao tiếp thời gian thực giữa các người chơi. Backend quản lý phòng, trạng thái trò chơi, đồng bộ hóa, điểm số và sự kiện nhiều người.',
      },
    ],
  },
  contact: {
    title: 'Liên hệ',
    intro: 'Gửi báo cáo lỗi, đề xuất, câu hỏi về tài khoản hoặc yêu cầu về quyền riêng tư trực tiếp đến hộp thư Red Tetris. Phản hồi sẽ được gửi đến địa chỉ email gắn với tài khoản của bạn hoặc địa chỉ bạn cung cấp trong biểu mẫu.',
    sections: [
      {
        title: 'Báo cáo lỗi',
        body: 'Mô tả điều đã xảy ra, điều bạn mong đợi, và phòng hoặc trang nơi sự cố xuất hiện.',
      },
      {
        title: 'Đề xuất',
        body: 'Chia sẻ ý tưởng về chế độ chơi, điều khiển, tính năng hồ sơ, tính điểm, hoặc bất cứ điều gì cải thiện trang web.',
      },
      {
        title: 'Yêu cầu quyền riêng tư',
        body:
          'Đối với yêu cầu truy cập, chỉnh sửa, xóa hoặc phản đối, hãy bao gồm tên người dùng và email đã đăng ký liên kết với tài khoản để yêu cầu có thể được xác minh.',
      },
    ],
  },
}

pages.tutorial = {
  title: 'Hướng dẫn',
  intro:
    'Tìm hiểu các điều khiển và chế độ chơi trước khi tham gia phòng.',
  sections: [
    {
      title: 'Điều khiển',
      body:
        'Dùng Trái và Phải để di chuyển mảnh, Xuống để thả chậm, Lên để xoay, Cách để thả nhanh, và C hoặc Shift để giữ mảnh hiện tại. Escape mở menu tạm dừng/tùy chọn trong chế độ đơn và menu trò chơi trong chế độ nhiều người.',
    },
    {
      title: 'Đơn',
      body:
        'Chế độ đơn cho phép bạn chơi một mình, xóa hàng, lên cấp và săn điểm cao nhất. Kết quả đơn của bạn có thể xuất hiện trong hồ sơ và bảng xếp hạng đơn.',
    },
    {
      title: 'Nhiều người',
      body:
        'Trong các phòng nhiều người, tối đa 8 người chơi tranh tài theo thời gian thực trên các bảng riêng biệt. Xóa nhiều hàng gửi hàng phạt cho đối thủ, và người chơi cuối cùng còn sống sót sẽ thắng.',
    },
    {
      title: 'Cổ điển',
      body:
        'Cổ điển là chế độ nhiều người cạnh tranh tiêu chuẩn. Mọi người chơi với điều khiển thông thường, và các hàng đã xóa có thể gửi hình phạt cho các bảng khác.',
    },
    {
      title: 'Gương',
      body:
        'Gương đảo ngược một phần điều khiển: Trái và Phải di chuyển mảnh theo hướng ngược lại, Xuống kích hoạt thả nhanh, và Cách trở thành thả chậm.',
    },
    {
      title: 'Hỗn loạn',
      body:
        'Hỗn loạn giữ nguyên luật cạnh tranh nhưng hoán đổi ngẫu nhiên mảnh hiện tại với mảnh tiếp theo trong khi chơi, đòi hỏi khả năng thích nghi nhanh.',
    },
    {
      title: 'Vô hình',
      body:
        'Vô hình giữ nguyên luật cạnh tranh nhưng ẩn mảnh đang rơi. Người chơi phải theo dõi vị trí của nó từ trí nhớ trong khi các mảnh đã đặt vẫn hiển thị.',
    },
    {
      title: 'Khổng lồ',
      body:
        'Khổng lồ sử dụng bảng lớn hơn, cho người chơi nhiều không gian hơn nhưng cũng nhiều hàng và cột hơn cần quản lý dưới áp lực nhiều người.',
    },
    {
      title: 'Hợp tác luân phiên',
      body:
        'Hợp tác luân phiên là chế độ hai người trên một bảng chung. Người chơi điều khiển mảnh thay phiên nhau, vì vậy giao tiếp và thời điểm là điều cần thiết.',
    },
    {
      title: 'Hợp tác phân vai',
      body:
        'Hợp tác phân vai là chế độ hai người trên một bảng chung, trong đó một người chơi xử lý xoay và người kia xử lý di chuyển và thả. Cả hai người chơi phải phối hợp để tồn tại.',
    },
    {
      title: 'Khán giả',
      body:
        'Trong chế độ nhiều người, người chơi bị loại có thể xem các bảng còn lại thay vì rời đi ngay lập tức.',
    },
  ],
}

pages.terms = {
  title: 'Điều khoản',
  intro:
    'Những điều khoản này mô tả các quy tắc cơ bản khi sử dụng Red Tetris. Bằng cách sử dụng trang web, bạn đồng ý chơi công bằng và tôn trọng người chơi khác.',
  sections: [
    {
      title: 'Sử dụng dịch vụ',
      body:
        'Red Tetris được cung cấp cho mục đích giải trí cá nhân. Không lạm dụng dịch vụ, can thiệp vào gameplay, cố truy cập trái phép, hoặc sử dụng tự động hóa để làm gián đoạn phòng, điểm số hoặc tài khoản.',
    },
    {
      title: 'Tài khoản và hồ sơ',
      body:
        'Bạn chịu trách nhiệm về các hoạt động gắn với tên người dùng và thông tin đăng nhập của mình. Sử dụng thông tin tài khoản chính xác và không mạo danh người chơi khác.',
    },
    {
      title: 'Gameplay và điểm số',
      body:
        'Điểm số, bảng xếp hạng, phòng và kết quả nhiều người có thể bị đặt lại, chỉnh sửa hoặc xóa nếu bị ảnh hưởng bởi lỗi, gian lận, lạm dụng hoặc bảo trì.',
    },
    {
      title: 'Khả dụng',
      body:
        'Trang web được cung cấp nguyên trạng. Các tính năng có thể thay đổi, trở nên không khả dụng hoặc bị xóa mà không có thông báo trong khi dự án phát triển.',
    },
  ],
}

pages.privacy = {
  title: 'Chính sách quyền riêng tư',
  intro:
    `Cập nhật lần cuối ${PRIVACY_LAST_UPDATED}. Chính sách này giải thích những gì Red Tetris thu thập, lý do sử dụng, thời gian lưu giữ và cách bạn có thể thực hiện các quyền GDPR của mình.`,
  sections: [
    {
      title: 'Người kiểm soát',
      body:
        `${PRIVACY_CONTROLLER_NAME} chịu trách nhiệm quyết định cách dữ liệu tài khoản, hồ sơ, liên hệ và gameplay được sử dụng cho triển khai Red Tetris này. Không có Cán bộ Bảo vệ Dữ liệu riêng được chỉ định trừ khi phần này nêu khác.`,
    },
    {
      title: 'Thông tin chúng tôi thu thập',
      body:
        'Trang web có thể lưu trữ tên người dùng, địa chỉ email, hash mật khẩu, cài đặt avatar, điểm đơn, điểm hợp tác, kết quả nhiều người, mục bảng xếp hạng, token đặt lại mật khẩu, tin nhắn liên hệ và dữ liệu kỹ thuật như địa chỉ IP được sử dụng cho nhật ký bảo mật và giới hạn tốc độ chống thư rác.',
    },
    {
      title: 'Cách thông tin được sử dụng',
      body:
        'Dữ liệu được sử dụng để tạo tài khoản, xác thực người chơi, khôi phục quyền truy cập, hiển thị hồ sơ, vận hành phòng, lưu điểm, duy trì bảng xếp hạng, trả lời yêu cầu liên hệ, bảo vệ dịch vụ khỏi lạm dụng và cải thiện độ tin cậy.',
    },
    {
      title: 'Cơ sở pháp lý',
      body:
        'Dữ liệu tài khoản, đăng nhập, hồ sơ và gameplay được xử lý để cung cấp dịch vụ bạn yêu cầu. Dữ liệu bảo mật, chống lạm dụng và độ tin cậy được xử lý vì lợi ích hợp pháp trong việc bảo vệ trang web. Tin nhắn liên hệ được xử lý để trả lời yêu cầu của bạn. Các nghĩa vụ pháp lý có thể yêu cầu lưu giữ một số hồ sơ khi áp dụng.',
    },
    {
      title: 'Lưu giữ',
      body:
        'Yêu cầu xóa tài khoản có thể được thực hiện từ menu hồ sơ. Các tài khoản đã xóa trước tiên được lên lịch xóa và có thể được khôi phục trong 30 ngày bằng cách đăng nhập lại và chọn khôi phục. Sau cửa sổ khôi phục đó, tài khoản và dữ liệu hồ sơ, phòng và điểm liên quan sẽ bị xóa vĩnh viễn khỏi cơ sở dữ liệu. Token đặt lại mật khẩu là tạm thời và hết hạn sau một thời gian ngắn. Tin nhắn liên hệ và nhật ký kỹ thuật chỉ được giữ lại trong thời gian cần thiết cho hỗ trợ, bảo mật và ngăn chặn lạm dụng, sau đó bị xóa hoặc ẩn danh khi không còn cần thiết.',
    },
    {
      title: 'Quyền của bạn',
      body:
        'Theo GDPR, bạn có thể yêu cầu truy cập, chỉnh sửa, xóa, hạn chế, di chuyển hoặc phản đối việc xử lý dữ liệu cá nhân của mình. Các yêu cầu được trả lời trong vòng một tháng khi cần thiết, trừ khi yêu cầu phức tạp hoặc cần xác minh danh tính.',
    },
    {
      title: 'Yêu cầu xóa',
      body:
        'Người dùng đã đăng nhập có thể xuất dữ liệu tài khoản hoặc xóa tài khoản từ trang quyền riêng tư này. Bạn cũng có thể sử dụng trang liên hệ cho các yêu cầu quyền riêng tư cần xem xét thủ công. Một số dữ liệu có thể được lưu giữ tạm thời khi cần thiết cho bảo mật, ngăn chặn lạm dụng, nghĩa vụ pháp lý hoặc tính toàn vẹn sao lưu.',
    },
    {
      title: 'Người nhận và nhà cung cấp',
      body:
        'Dữ liệu cá nhân được xử lý bởi backend trang web, cơ sở dữ liệu PostgreSQL, Railway để lưu trữ backend và cơ sở dữ liệu, Vercel để lưu trữ frontend và Resend cho email giao dịch như đặt lại mật khẩu và tin nhắn liên hệ. Tin nhắn biểu mẫu liên hệ bao gồm địa chỉ email bạn cung cấp làm địa chỉ trả lời. Dữ liệu không được bán.',
    },
    {
      title: 'Chuyển giao quốc tế',
      body:
        'Railway, Vercel và Resend có thể xử lý dữ liệu bên ngoài Khu vực Kinh tế Châu Âu, bao gồm ở Hoa Kỳ. Các chuyển giao dựa trên các điều khoản xử lý dữ liệu của nhà cung cấp và các biện pháp bảo vệ chuyển giao do các nhà cung cấp đó cung cấp, bao gồm Điều khoản Hợp đồng Tiêu chuẩn EU và, khi áp dụng, các cam kết Khung Quyền riêng tư Dữ liệu.',
      links: [
        { href: 'https://railway.com/legal/dpa', label: 'Railway DPA' },
        { href: 'https://vercel.com/legal/dpa', label: 'Vercel DPA' },
        { href: 'https://resend.com/legal/dpa', label: 'Resend DPA' },
      ],
    },
    {
      title: 'Thỏa thuận xử lý',
      body:
        'Nhà vận hành trang web phải duy trì các điều khoản xử lý dữ liệu hoặc thỏa thuận xử lý liên quan với các nhà cung cấp lưu trữ, cơ sở dữ liệu và email trước khi sử dụng các nhà cung cấp đó cho dữ liệu cá nhân sản xuất. Các nhà cung cấp này chỉ được sử dụng để lưu trữ frontend, chạy backend, lưu trữ cơ sở dữ liệu, gửi email giao dịch, duy trì bảo mật và cung cấp độ tin cậy vận hành.',
    },
    {
      title: 'Cookie và bộ nhớ cục bộ',
      body:
        'Ứng dụng sử dụng bộ nhớ cục bộ cho các tính năng cần thiết như ghi nhớ người dùng đã đăng nhập cục bộ, thông tin tài khoản đã lưu cần thiết cho giao diện, tùy chọn giao diện và liệu thông báo cookie đã được hiển thị hay chưa. Xác nhận thông báo đó được giữ trong 13 tháng, sau đó ứng dụng hiển thị lại. Backend có thể sử dụng cookie phiên cần thiết để giữ bạn được xác thực. Các mục lưu trữ này được sử dụng cho chức năng dịch vụ cốt lõi, không phải quảng cáo hay theo dõi đa trang. Hiện tại không cần cookie quảng cáo hoặc phân tích cho trò chơi cốt lõi.',
    },
    {
      title: 'Địa chỉ IP và nhật ký',
      body:
        'Backend sử dụng thông tin yêu cầu dựa trên IP để ngăn chặn lạm dụng và giới hạn tốc độ. Các mục giới hạn tốc độ biểu mẫu liên hệ được lưu trữ trong bộ nhớ máy chủ trong cửa sổ liên hệ được cấu hình, hiện mặc định là 1 giờ. Các mục giới hạn tốc độ xác thực được lưu trữ trong bộ nhớ máy chủ mặc định 15 phút. Các mục trong bộ nhớ này không được sử dụng cho quảng cáo và biến mất khi cửa sổ hết hạn hoặc máy chủ khởi động lại. Các nhà cung cấp lưu trữ, proxy ngược, email và cơ sở dữ liệu cũng có thể tạo nhật ký vận hành chứa địa chỉ IP, dấu thời gian, siêu dữ liệu yêu cầu hoặc siêu dữ liệu gửi; các nhật ký đó được giữ tối đa 30 ngày trừ khi cần lưu giữ lâu hơn để điều tra lạm dụng, duy trì bảo mật, giải quyết vấn đề pháp lý hoặc tuân thủ nghĩa vụ nhà cung cấp/pháp lý.',
    },
    {
      title: 'Bảo mật',
      body:
        'Mật khẩu được lưu trữ dưới dạng hash, không phải văn bản thuần túy. Các triển khai sản xuất sử dụng HTTPS và giới hạn thông tin xác thực cơ sở dữ liệu, nhà cung cấp email và máy chủ chỉ cho những người bảo trì được ủy quyền.',
    },
    {
      title: 'Liên hệ và yêu cầu',
      body:
        'Đối với câu hỏi về quyền riêng tư hoặc yêu cầu dữ liệu tài khoản, hãy sử dụng trang liên hệ và bao gồm tên người dùng và email đã đăng ký cho tài khoản. Xóa tài khoản có thể thực hiện từ menu hồ sơ. Nếu bạn cho rằng quyền của mình không được tôn trọng, bạn có thể liên hệ cơ quan bảo vệ dữ liệu địa phương của mình.',
    },
  ],
}

const vi = {
  footer: {
    siteInformation: 'Thông tin trang web',
    about: 'Giới thiệu',
    contact: 'Liên hệ',
    terms: 'Điều khoản',
    privacy: 'Quyền riêng tư',
  },
  roomNotice: {
    roomUsed: 'Phòng đã được sử dụng',
    userConnected: 'Người dùng đã kết nối',
  },
  appUi: {
    openProfileMenu: 'Mở menu hồ sơ',
    profileTitle: 'Hồ sơ',
    saveProfile: 'Lưu',
    connectionLost: 'Mất kết nối. Đang kết nối lại...',
    serverUnavailable: 'Máy chủ không khả dụng. Đang thử lại...',
    serverError: 'Lỗi máy chủ',
    reconnected: 'Đã kết nối lại.',
    reconnecting: 'Đang kết nối lại...',
    reconnectFailed: 'Không thể kết nối lại. Vui lòng tải lại trang.',
  },
  spectate: {
    missingUsername: 'Thiếu tên người dùng trong URL khán giả.',
    roomNotFound: 'Không tìm thấy phòng',
    unauthorized: 'Khán giả không được phép',
    loading: 'Đang tải chế độ khán giả...',
    back: 'Quay lại',
    gameOver: 'Trò chơi kết thúc',
    winner: 'Người chiến thắng',
    noWinner: 'Không có người chiến thắng',
    playAgain: 'Chơi lại',
    backToMenu: 'Về menu',
  },
  auth: {
    languageLabel: 'Ngôn ngữ',
    loginTab: 'Đăng nhập',
    registerTab: 'Đăng ký',
    loginTitle: 'Đăng nhập vào tài khoản của bạn',
    registerTitle: 'Tạo tài khoản của bạn',
    forgotTitle: 'Đặt lại mật khẩu của bạn',
    resetTitle: 'Chọn mật khẩu mới',
    username: 'Tên người dùng',
    email: 'Email',
    password: 'Mật khẩu',
    confirmPassword: 'Xác nhận mật khẩu',
    showPassword: 'Hiển thị mật khẩu',
    hidePassword: 'Ẩn mật khẩu',
    showConfirmPassword: 'Hiển thị xác nhận mật khẩu',
    hideConfirmPassword: 'Ẩn xác nhận mật khẩu',
    randomize: 'Ngẫu nhiên',
    skin: 'Màu da',
    eyes: 'Mắt',
    mouth: 'Miệng',
    pleaseWait: 'Vui lòng chờ...',
    register: 'Đăng ký',
    sendResetLink: 'Gửi liên kết đặt lại',
    updatePassword: 'Cập nhật mật khẩu',
    login: 'Đăng nhập',
    forgotPassword: 'Quên mật khẩu?',
    restoreAccount: 'Khôi phục tài khoản',
    backToLogin: 'Quay lại đăng nhập',
    missingData: 'Thiếu dữ liệu',
    invalidEmail: 'Email không hợp lệ',
    invalidPassword: 'Mật khẩu không hợp lệ',
    passwordTooShort: 'Mật khẩu phải có ít nhất 8 ký tự',
    passwordUppercase: 'Mật khẩu phải có ít nhất 1 chữ hoa',
    passwordLowercase: 'Mật khẩu phải có ít nhất 1 chữ thường',
    passwordNumber: 'Mật khẩu phải có ít nhất 1 chữ số',
    passwordSpecial: 'Mật khẩu phải có ít nhất 1 ký tự đặc biệt',
    passwordMismatch: 'Mật khẩu không khớp',
    invalidResetLink: 'Liên kết đặt lại không hợp lệ hoặc đã hết hạn',
    authenticationFailed: 'Xác thực thất bại',
    accountCreated: 'Tài khoản đã được tạo. Vui lòng đăng nhập.',
    passwordResetGenerated: 'Liên kết đặt lại mật khẩu đã được tạo',
    passwordUpdated: 'Mật khẩu đã được cập nhật',
    serverUnavailable: 'Máy chủ không khả dụng',
    unableToRestore: 'Không thể khôi phục tài khoản',
  },
  profileMenu: {
    createTitle: 'Tạo hồ sơ của bạn',
    profileTitle: 'Hồ sơ',
    randomize: 'Ngẫu nhiên',
    skin: 'Màu da',
    eyes: 'Mắt',
    mouth: 'Miệng',
    usernamePlaceholder: 'Tên người dùng',
    play: 'Chơi thôi!',
    save: 'Lưu',
    disconnect: 'Đăng xuất',
    missingData: 'Thiếu dữ liệu',
    invalidUsername: 'Tên người dùng không hợp lệ',
    serverUnavailable: 'Máy chủ không khả dụng',
    serverNotResponding: 'Máy chủ không phản hồi',
    unknownError: 'Lỗi không xác định',
    profileUpdateFailed: 'Cập nhật hồ sơ thất bại',
  },
  menu: {
    heading: 'Chọn chế độ chơi',
    soloTitle: 'Đơn',
    soloDescription: 'Chơi một mình và phá kỷ lục của bạn',
    multiplayerTitle: 'Nhiều người',
    multiplayerDescription: 'Tranh tài với người chơi khác',
    options: 'Tùy chọn',
    shop: 'Cửa hàng',
  },
  shop: {
    kicker: 'Trang phục',
    heading: 'Cửa hàng',
    pack_classic: 'Cổ điển',
    pack_plain: 'Đơn sắc',
    pack_neon: 'Neon',
    pack_pastel: 'Pastel',
    pack_retro: 'Retro',
    pack_ocean: 'Đại dương',
    pack_bubble: 'Bong bóng',
    pack_fire: 'Lửa',
    pack_arcane: 'Huyền bí',
    equipped: 'Đang dùng',
    equip: 'Trang bị',
    buy: 'Mua',
    notEnough: 'Không đủ xu',
    comingSoon: 'Sắp ra mắt',
    back: 'Quay lại',
    sectionTetrominoes: 'Tetromino',
  },
  options: {
    heading: 'Tùy chọn',
    kicker: 'Hệ thống',
    lightTheme: 'Giao diện sáng',
    darkTheme: 'Giao diện tối',
    switchToLight: 'Chuyển sang chế độ sáng',
    switchToDark: 'Chuyển sang chế độ tối',
    themeLight: 'Sáng',
    themeDark: 'Tối',
    soundEffects: 'Hiệu ứng âm thanh',
    music: 'Âm nhạc',
    enabled: 'Bật',
    disabled: 'Tắt',
    on: 'Bật',
    off: 'Tắt',
    open: 'Mở',
    guide: 'Hướng dẫn',
    guideDescription: 'Điều khiển và chế độ',
    language: 'Ngôn ngữ',
    languageDescription: 'Chọn ngôn ngữ hiển thị',
    languageOptions: 'Tùy chọn ngôn ngữ',
    back: 'Quay lại',
  },
  playerStats: {
    loadingStats: 'Đang tải thống kê...',
    playerStatsTitle: 'Thống kê người chơi',
    advancedStatsTitle: 'Thống kê nâng cao',
    closeAdvancedStats: 'Đóng thống kê nâng cao',
    timePlayed: 'Thời gian chơi',
    total: 'Tổng cộng',
    solo: 'Đơn',
    coop: 'Hợp tác',
    multi: 'Nhiều người',
    soloGames: 'Ván đơn',
    highestSoloScore: 'Điểm đơn cao nhất',
    multiplayerGames: 'Ván nhiều người',
    multiplayerWins: 'Chiến thắng nhiều người',
    multiplayerLosses: 'Thua nhiều người',
    multiplayerWinrate: 'Tỷ lệ thắng nhiều người',
    advancedStatsButton: 'Thống kê nâng cao',
    games: 'Ván đấu',
    winLoss: 'Thắng / Thua',
    winLossRatio: 'Tỷ lệ T/T',
    highestScore: 'Điểm cao nhất',
    averageScore: 'Điểm trung bình',
    highestLevel: 'Cấp cao nhất',
    highestLines: 'Hàng cao nhất',
    totalLines: 'Tổng hàng',
    highestSent: 'Gửi cao nhất',
    totalSent: 'Tổng đã gửi',
    highestTetris: 'Tetris cao nhất',
    totalTetris: 'Tổng Tetris',
    longestGame: 'Ván dài nhất',
  },
  leaderboard: {
    title: '🏆 Bảng xếp hạng',
    solo: 'Đơn',
    coop: 'Hợp tác đôi',
    loading: 'Đang tải…',
    playerOne: 'Người chơi 1',
    playerTwo: 'Người chơi 2',
    previousPage: 'Trang trước',
    nextPage: 'Trang sau',
  },
  rooms: {
    passwordRequired: 'Yêu cầu mật khẩu',
    invalidPassword: 'Mật khẩu không hợp lệ',
    title: 'Phòng nhiều người',
    createRoom: 'Tạo phòng',
    chooseRoomType: 'Chọn loại phòng',
    cooperative: 'Hợp tác',
    multiplayer: 'Nhiều người',
    optionalPassword: 'Mật khẩu tùy chọn',
    publicRoomPlaceholder: 'Để trống cho phòng công khai',
    availableRooms: 'Phòng có sẵn',
    emptyRooms: 'Không có phòng nào. Hãy tạo một phòng!',
    password: 'Mật khẩu',
    host: 'Chủ phòng',
    roomPasswordPlaceholder: 'Mật khẩu phòng',
    hidePassword: 'Ẩn mật khẩu',
    showPassword: 'Hiển thị mật khẩu',
    joined: 'Đã tham gia',
    full: 'Đầy',
    enter: 'Vào',
    join: 'Tham gia',
    back: 'Quay lại',
  },
  createRoom: {
    joinErrors: {
      'Username already connected': 'Tên người dùng này đã kết nối trong phòng này.',
      'Room is full': 'Phòng này đã đầy.',
      'User is already in a room': 'Người chơi này đang ở trong phòng khác.',
      default: 'Phòng này đã có người. Thử phòng hoặc tên người dùng khác.',
    },
    roomActionErrors: {
      used: 'Phòng đã được sử dụng.',
      invalidName: 'Tên phòng không hợp lệ',
      invalidMode: 'Chế độ chơi không hợp lệ',
      hostRenameOnly: 'Chỉ chủ phòng mới có thể đổi tên phòng.',
      default: 'Không thể cập nhật phòng ngay bây giờ.',
    },
    modes: {
      classic: { label: 'Cổ điển', description: 'Tetris cạnh tranh tiêu chuẩn nơi các hàng đã xóa gửi hình phạt cho đối thủ.' },
      mirror: { label: 'Gương', description: 'Điều khiển bị đảo ngược, vì vậy di chuyển và thả hoạt động khác đi.' },
      chaotic: { label: 'Hỗn loạn', description: 'Mảnh hiện tại và mảnh tiếp theo có thể được hoán đổi ngẫu nhiên trong khi chơi.' },
      invisible: { label: 'Vô hình', description: 'Mảnh đang hoạt động khó theo dõi hơn trong khi nó rơi xuống.' },
      giant: { label: 'Khổng lồ', description: 'Chơi trên bảng lớn hơn với nhiều không gian hơn và sống sót lâu hơn.' },
      cooperative: { label: 'Hợp tác luân phiên', description: 'Hai người chơi chia sẻ một bảng và chơi theo lượt.' },
      cooperative_roles: { label: 'Hợp tác phân vai', description: 'Hai người chơi chia sẻ một bảng với vai trò di chuyển và xoay riêng biệt.' },
    },
    invalidPassword: 'Mật khẩu không hợp lệ',
    passwordRequired: 'Yêu cầu mật khẩu',
    joinFailed: 'Không thể tham gia phòng',
    editRoomName: 'Chỉnh sửa tên phòng',
    currentPassword: 'Mật khẩu phòng hiện tại',
    password: 'Mật khẩu',
    roomPassword: 'Mật khẩu phòng',
    hidePassword: 'Ẩn mật khẩu',
    showPassword: 'Hiển thị mật khẩu',
    joinRoom: 'Tham gia phòng',
    back: 'Quay lại',
    gameMode: 'Chế độ chơi',
    players: 'Người chơi',
    waitingPlayers: 'Đang chờ người chơi...',
    startGame: 'Bắt đầu trò chơi',
  },
  game: {
    controls: [
      { keys: 'Mũi tên trái / phải', action: 'Di chuyển' },
      { keys: 'Mũi tên lên', action: 'Xoay' },
      { keys: 'Mũi tên xuống', action: 'Thả chậm' },
      { keys: 'Cách', action: 'Thả nhanh' },
      { keys: 'C / Shift', action: 'Giữ' },
      { keys: 'Escape', action: 'Tùy chọn' },
    ],
    options: 'Tùy chọn',
    score: 'Điểm',
    lines: 'Hàng',
    level: 'Cấp',
    hold: 'Giữ',
    holdAria: 'Mảnh đang giữ',
    boardAria: 'Bảng Tetris',
    next: 'Tiếp',
    nextAria: 'Mảnh tiếp theo',
    keyboardControlsAria: 'Điều khiển bàn phím',
    countdownAria: 'Đếm ngược trò chơi',
    countdownGo: 'Bắt đầu',
    pause: 'Tạm dừng',
    kicker: 'Trò chơi',
    exit: 'Thoát',
    play: 'Chơi',
    gameMenu: 'Menu trò chơi',
    soundEffectsOn: 'Hiệu ứng âm thanh: bật',
    soundEffectsOff: 'Hiệu ứng âm thanh: tắt',
    musicOn: 'Âm nhạc: bật',
    musicOff: 'Âm nhạc: tắt',
    resume: 'Tiếp tục',
    leaveGame: 'Rời trò chơi',
    yourTurn: 'LƯỢT CỦA BẠN',
    playing: 'Đang chơi',
    playingFallback: 'Đang chơi: ...',
    rotateRole: 'XOAY',
    placeRole: 'ĐẶT',
    assigningRole: 'ĐANG PHÂN VAI...',
    opponents: 'Đối thủ',
    opponentBoard: 'bảng',
  },
  gameOver: {
    gameOver: 'Trò chơi kết thúc',
    won: 'Bạn đã thắng',
    lost: 'Bạn đã thua',
    winner: 'Người chiến thắng',
    playAgain: 'Chơi lại',
    spectate: 'Xem',
    backToMenu: 'Về menu',
  },
  spectator: {
    title: 'Chế độ khán giả',
    empty: 'Không có người chơi nào để xem.',
    back: 'Quay lại',
    watching: 'Đang xem',
    previous: 'Trước',
    next: 'Tiếp',
    score: 'Điểm',
    lines: 'Hàng',
    level: 'Cấp',
    hold: 'Giữ',
    nextPiece: 'Tiếp',
    holdPieceLabel: 'Mảnh đang giữ',
    nextPieceLabel: 'Mảnh tiếp theo',
    boardLabel: 'Bảng Tetris',
    opponents: 'Đối thủ',
    opponentBoard: 'bảng',
    sendConfetti: '🎉',
    sendConfettiLabel: 'Gửi pháo giấy',
  },
  cookieNotice: {
    label: 'Thông báo cookie',
    message:
      'Red Tetris chỉ sử dụng cookie cần thiết để giữ bạn đăng nhập và chạy trò chơi. Chúng cần thiết cho dịch vụ và không được sử dụng cho quảng cáo hay phân tích. Chúng tôi nhớ rằng thông báo này đã được hiển thị trong 13 tháng.',
    privacy: 'Quyền riêng tư',
    acknowledge: 'Đã hiểu',
  },
  infoPage: {
    pages,
    labels: {
      informationPages: 'Trang thông tin',
      back: '← Quay lại',
      closeGuide: 'Đóng hướng dẫn',
      about: 'Giới thiệu',
      contact: 'Liên hệ',
      terms: 'Điều khoản',
      privacy: 'Quyền riêng tư',
      accountPrivacyTools: 'Công cụ quyền riêng tư tài khoản',
      accountTools: 'Công cụ tài khoản',
      signedInAs: 'Đăng nhập với tư cách',
      exporting: 'Đang xuất...',
      exportData: 'Xuất dữ liệu của tôi',
      deleting: 'Đang xóa...',
      deleteAccount: 'Xóa tài khoản của tôi',
      signInForPrivacyTools: 'Đăng nhập để xuất dữ liệu tài khoản hoặc xóa tài khoản trực tiếp.',
      exportError: 'Không thể xuất dữ liệu tài khoản',
      exportSuccess: 'Đã tải xuống bản xuất dữ liệu tài khoản.',
      deleteConfirm: (username) =>
        `Xóa tài khoản Red Tetris "${username}" và điểm số của nó? Hành động này không thể hoàn tác.`,
      deleteError: 'Không thể xóa tài khoản',
      deleteSuccess: 'Tài khoản đã được xóa.',
      tutorialCarousel: 'Hướng dẫn điều khiển Tetris',
      previousControl: 'Hiển thị điều khiển trước',
      nextControl: 'Hiển thị điều khiển tiếp theo',
      tutorialSlides: 'Các slide hướng dẫn',
      showTutorialSlide: (title) => `Hiển thị ${title}`,
    },
    contact: {
      captchaLoadError: 'Không thể tải captcha',
      captchaLoadStatus: 'Không thể tải captcha. Vui lòng tải lại trang.',
      requiredObjectAndMessage: 'Tiêu đề và tin nhắn là bắt buộc.',
      requiredEmail: 'Email là bắt buộc.',
      objectTooLong: `Tiêu đề phải có ${CONTACT_OBJECT_MAX_LENGTH} ký tự hoặc ít hơn.`,
      messageTooLong: `Tin nhắn phải có ${CONTACT_MESSAGE_MAX_LENGTH} ký tự hoặc ít hơn.`,
      requiredCaptcha: 'Cần có câu trả lời captcha.',
      sendError: 'Không thể gửi tin nhắn',
      sendSuccess: 'Tin nhắn đã được gửi.',
      mailTimeout: 'Hết thời gian chờ máy chủ mail. Vui lòng thử lại sau.',
      objectLabel: 'Tiêu đề',
      messageLabel: 'Tin nhắn',
      emailLabel: 'Email',
      captchaLabel: 'Captcha',
      honeypotLabel: 'Website',
      objectPlaceholder: 'Báo cáo lỗi hoặc đề xuất',
      messagePlaceholder: 'Mô tả vấn đề hoặc ý tưởng...',
      emailPlaceholder: 'Email của bạn',
      captchaLoading: 'Đang tải...',
      captchaPlaceholder: 'Câu trả lời',
      refreshCaptcha: 'Làm mới captcha',
      sending: 'Đang gửi...',
      sendMessage: 'Gửi tin nhắn',
    },
    tutorialControls: {
      'move-left': {
        ariaLabel: 'Hướng dẫn di chuyển sang trái',
        key: 'Trái',
        title: 'Di chuyển sang trái',
        description: 'Nhấn mũi tên trái để di chuyển mảnh đang rơi một cột sang trái.',
      },
      'move-right': {
        ariaLabel: 'Hướng dẫn di chuyển sang phải',
        key: 'Phải',
        title: 'Di chuyển sang phải',
        description: 'Nhấn mũi tên phải để di chuyển mảnh đang rơi một cột sang phải.',
      },
      'soft-drop': {
        ariaLabel: 'Hướng dẫn thả chậm',
        key: 'Xuống',
        title: 'Thả chậm',
        description: 'Giữ mũi tên xuống để mảnh rơi nhanh hơn trong khi vẫn giữ được kiểm soát.',
      },
      'hard-drop': {
        ariaLabel: 'Hướng dẫn thả nhanh',
        key: 'Cách',
        title: 'Thả nhanh',
        description: 'Nhấn Cách để gửi mảnh trực tiếp đến vị trí hạ cánh của nó.',
      },
      rotation: {
        ariaLabel: 'Hướng dẫn xoay',
        key: 'Lên',
        title: 'Xoay',
        description: 'Nhấn Lên để xoay mảnh đang rơi thành hình dạng bạn cần.',
      },
      hold: {
        ariaLabel: 'Hướng dẫn giữ mảnh',
        key: 'C / Shift',
        title: 'Giữ mảnh',
        description: 'Nhấn C hoặc Shift để đặt mảnh hiện tại sang một bên và sử dụng sau.',
      },
    },
  },
}

export default vi
