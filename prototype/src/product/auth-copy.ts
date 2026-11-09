/** Public auth copy. Show success only after the corresponding server operation succeeds. */
export type AuthLocale = 'en' | 'ru' | 'vi';
export type AuthView = 'login' | 'register' | 'forgot-password' | 'reset-password' | 'verify-email';
export interface AuthCopy {
  nav: string;
  fields: {email: string; password: string; newPassword: string; confirmPassword: string};
  actions: {retry: string; login: string; register: string; forgotPassword: string; resetPassword: string; verifyEmail: string; resendVerification: string; logout: string; logoutAll: string; backToLogin: string; openAccount: string; openCatalog: string};
  views: Record<AuthView, {title: string; lead: string; submit: string; pending: string}>;
  status: {loading: string; serviceUnavailable: string; registrationRequested: string; recoveryRequested: string; verificationRequested: string; verified: string; passwordReset: string; signedIn: string; signedOut: string; signedOutAll: string; profileUnavailable: string; alreadySignedIn: string};
  errors: {emailNotVerified: string; invalidCredentials: string; invalidEmail: string; passwordTooShort: string; passwordTooLong: string; passwordMismatch: string; invalidToken: string; tokenExpired: string; tooManyAttempts: string; invalidRequest: string; serviceUnavailable: string; emailUnavailable: string; network: string; unexpected: string};
  account: {title: string; signedInAs: string; signedOutTitle: string; signedOutBody: string; logoutAllHelp: string; savedLocally: string; purchasesPending: string; sessionExpired: string};
  passwordHelp: string;
  passwordRange: string;
  freeAccessNote: string;
  verificationHelp: string;
  emailHelp: string;
}

export const authCopy: Record<AuthLocale, AuthCopy> = {
  en: {
    nav: 'Sign in',
    fields: {email: 'Email address', password: 'Password', newPassword: 'New password', confirmPassword: 'Repeat password'},
    actions: {retry: 'Try again', login: 'Sign in', register: 'Create account', forgotPassword: 'Forgot password?', resetPassword: 'Set new password', verifyEmail: 'Confirm email', resendVerification: 'Request another email', logout: 'Sign out', logoutAll: 'Sign out on all devices', backToLogin: 'Back to sign in', openAccount: 'Open account', openCatalog: 'Open catalog'},
    views: {
      login: {title: 'Sign in to Tallshift', lead: 'Use your email address and password to open your account.', submit: 'Sign in', pending: 'Signing in…'},
      register: {title: 'Create your Tallshift account', lead: 'Enter your email address and a password. Confirm your email before signing in.', submit: 'Create account', pending: 'Creating account…'},
      'forgot-password': {title: 'Get back into your account', lead: 'Enter the email address you used for Tallshift. We will send a link to set a new password if the account exists.', submit: 'Request reset link', pending: 'Requesting link…'},
      'reset-password': {title: 'Set a new password', lead: 'Choose a new password for your Tallshift account. After saving it, sign in again.', submit: 'Save new password', pending: 'Saving password…'},
      'verify-email': {title: 'Confirm your email address', lead: 'Confirm this address to finish creating your Tallshift account.', submit: 'Confirm email', pending: 'Confirming email…'},
    },
    status: {
      loading: 'Checking your sign-in…',
      serviceUnavailable: 'Sign-in is not available yet. You can still use the catalog and download the free examples without an account.',
      registrationRequested: 'Check your inbox. If this address can be registered, you will receive an email with a confirmation link.',
      recoveryRequested: 'If an account uses this address, you will receive a password reset link. Check your inbox and spam folder.',
      verificationRequested: 'If this address needs confirmation, you will receive a new confirmation link. Check your inbox and spam folder.',
      verified: 'Email confirmed. You can now sign in.',
      passwordReset: 'Password changed. Sign in with your new password.',
      signedIn: 'You are signed in.',
      signedOut: 'You have signed out.',
      signedOutAll: 'You have signed out on all devices, including this one.',
      profileUnavailable: 'Could not check your account. Try again before making changes.',
      alreadySignedIn: 'You are already signed in. Open your account to continue.',
    },
    errors: {
      emailNotVerified: 'Confirm your email address before signing in. You can request another confirmation email.',
      invalidCredentials: 'Could not sign in. Check your email address and password.',
      invalidEmail: 'Enter a valid email address.',
      passwordTooShort: 'This password is too short. Check the requirements below the field.',
      passwordTooLong: 'This password is too long. Check the requirements below the field.',
      passwordMismatch: 'The passwords do not match. Enter the same password in both fields.',
      invalidToken: 'This link is invalid, expired or has already been used. Request a new one.',
      tokenExpired: 'This link has expired. Request a new one.',
      tooManyAttempts: 'Too many attempts. Wait a little before trying again.',
      invalidRequest: 'Could not complete this request. Reload the page and try again.',
      serviceUnavailable: 'Sign-in is temporarily unavailable. Try again later.',
      emailUnavailable: 'We could not send the email. Try again later.',
      network: 'Could not connect to Tallshift. Check your connection and try again.',
      unexpected: 'Could not complete the action. Try again.',
    },
    account: {title: 'Your account', signedInAs: 'Signed in as', signedOutTitle: 'Sign in to your account', signedOutBody: 'Your account uses your email address and password. Free examples are available without signing in.', logoutAllHelp: 'Ends every sign-in session, including the one in this browser. You will need to sign in again.', savedLocally: 'Saved examples stay in this browser. They are not yet synced with your account.', purchasesPending: 'Payments and paid downloads are not connected yet. No purchases or orders are created here.', sessionExpired: 'Your session has ended. Sign in again to open your account.'},
    passwordHelp: 'Use a unique password for this account.',
    passwordRange: 'Use {min}–{max} characters.',
    freeAccessNote: 'You do not need an account to download the free examples.',
    verificationHelp: 'Open the latest Tallshift confirmation email. If the link no longer works, request a new one.',
    emailHelp: 'Use an address you can access. Confirmation and password reset links will be sent there.',
  },
  ru: {
    nav: 'Войти',
    fields: {email: 'Электронная почта', password: 'Пароль', newPassword: 'Новый пароль', confirmPassword: 'Повторите пароль'},
    actions: {retry: 'Повторить проверку', login: 'Войти', register: 'Создать аккаунт', forgotPassword: 'Забыли пароль?', resetPassword: 'Задать новый пароль', verifyEmail: 'Подтвердить почту', resendVerification: 'Запросить новое письмо', logout: 'Выйти', logoutAll: 'Выйти на всех устройствах', backToLogin: 'Вернуться ко входу', openAccount: 'Открыть кабинет', openCatalog: 'Открыть каталог'},
    views: {
      login: {title: 'Войдите в Tallshift', lead: 'Введите почту и пароль, чтобы открыть свой кабинет.', submit: 'Войти', pending: 'Входим…'},
      register: {title: 'Создайте аккаунт Tallshift', lead: 'Укажите почту и придумайте пароль. Перед входом подтвердите адрес почты.', submit: 'Создать аккаунт', pending: 'Создаём аккаунт…'},
      'forgot-password': {title: 'Восстановите доступ к аккаунту', lead: 'Укажите почту, которую использовали в Tallshift. Если аккаунт существует, на неё придёт ссылка для смены пароля.', submit: 'Запросить ссылку', pending: 'Запрашиваем ссылку…'},
      'reset-password': {title: 'Задайте новый пароль', lead: 'Придумайте новый пароль для аккаунта Tallshift. После сохранения войдите снова.', submit: 'Сохранить новый пароль', pending: 'Сохраняем пароль…'},
      'verify-email': {title: 'Подтвердите почту', lead: 'Подтвердите этот адрес, чтобы завершить создание аккаунта Tallshift.', submit: 'Подтвердить почту', pending: 'Подтверждаем почту…'},
    },
    status: {
      loading: 'Проверяем вход в аккаунт…',
      serviceUnavailable: 'Вход пока недоступен. Каталог и бесплатные примеры можно использовать без аккаунта.',
      registrationRequested: 'Проверьте почту. Если этот адрес можно использовать для регистрации, на него придёт письмо со ссылкой подтверждения.',
      recoveryRequested: 'Если к этому адресу привязан аккаунт, на него придёт ссылка для смены пароля. Проверьте входящие и папку «Спам».',
      verificationRequested: 'Если этот адрес требует подтверждения, на него придёт новая ссылка. Проверьте входящие и папку «Спам».',
      verified: 'Почта подтверждена. Теперь можно войти.',
      passwordReset: 'Пароль изменён. Войдите с новым паролем.',
      signedIn: 'Вы вошли в аккаунт.',
      signedOut: 'Вы вышли из аккаунта.',
      signedOutAll: 'Вы вышли из аккаунта на всех устройствах, включая это.',
      profileUnavailable: 'Не удалось проверить аккаунт. Попробуйте снова, прежде чем вносить изменения.',
      alreadySignedIn: 'Вы уже вошли. Откройте кабинет, чтобы продолжить.',
    },
    errors: {
      emailNotVerified: 'Перед входом подтвердите почту. При необходимости запросите новое письмо подтверждения.',
      invalidCredentials: 'Не удалось войти. Проверьте почту и пароль.',
      invalidEmail: 'Укажите корректный адрес электронной почты.',
      passwordTooShort: 'Пароль слишком короткий. Проверьте требования под полем.',
      passwordTooLong: 'Пароль слишком длинный. Проверьте требования под полем.',
      passwordMismatch: 'Пароли не совпадают. Введите одинаковый пароль в обоих полях.',
      invalidToken: 'Ссылка недействительна, устарела или уже использована. Запросите новую.',
      tokenExpired: 'Срок действия ссылки истёк. Запросите новую.',
      tooManyAttempts: 'Слишком много попыток. Немного подождите и попробуйте снова.',
      invalidRequest: 'Не удалось выполнить запрос. Обновите страницу и попробуйте снова.',
      serviceUnavailable: 'Вход временно недоступен. Попробуйте позже.',
      emailUnavailable: 'Не удалось отправить письмо. Попробуйте позже.',
      network: 'Не удалось связаться с Tallshift. Проверьте соединение и попробуйте снова.',
      unexpected: 'Не удалось выполнить действие. Попробуйте снова.',
    },
    account: {title: 'Ваш кабинет', signedInAs: 'Вы вошли как', signedOutTitle: 'Войдите в свой аккаунт', signedOutBody: 'Для входа нужны почта и пароль. Бесплатные примеры доступны и без аккаунта.', logoutAllHelp: 'Завершит все сеансы входа, включая этот браузер. После этого потребуется войти снова.', savedLocally: 'Избранное хранится в этом браузере и пока не синхронизируется с аккаунтом.', purchasesPending: 'Оплата и платные скачивания ещё не подключены. Покупки и заказы здесь не создаются.', sessionExpired: 'Сеанс завершён. Войдите снова, чтобы открыть кабинет.'},
    passwordHelp: 'Используйте отдельный пароль для этого аккаунта.',
    passwordRange: 'От {min} до {max} символов.',
    freeAccessNote: 'Чтобы скачать бесплатные примеры, аккаунт не нужен.',
    verificationHelp: 'Откройте последнее письмо Tallshift для подтверждения почты. Если ссылка больше не работает, запросите новую.',
    emailHelp: 'Укажите почту, к которой у вас есть доступ. На неё придут ссылки для подтверждения и смены пароля.',
  },
  vi: {
    nav: 'Đăng nhập',
    fields: {email: 'Địa chỉ email', password: 'Mật khẩu', newPassword: 'Mật khẩu mới', confirmPassword: 'Nhập lại mật khẩu'},
    actions: {retry: 'Kiểm tra lại', login: 'Đăng nhập', register: 'Tạo tài khoản', forgotPassword: 'Quên mật khẩu?', resetPassword: 'Đặt mật khẩu mới', verifyEmail: 'Xác nhận email', resendVerification: 'Yêu cầu email mới', logout: 'Đăng xuất', logoutAll: 'Đăng xuất trên mọi thiết bị', backToLogin: 'Quay lại đăng nhập', openAccount: 'Mở tài khoản', openCatalog: 'Mở danh mục'},
    views: {
      login: {title: 'Đăng nhập Tallshift', lead: 'Nhập địa chỉ email và mật khẩu để mở tài khoản của bạn.', submit: 'Đăng nhập', pending: 'Đang đăng nhập…'},
      register: {title: 'Tạo tài khoản Tallshift', lead: 'Nhập địa chỉ email và đặt mật khẩu. Xác nhận email trước khi đăng nhập.', submit: 'Tạo tài khoản', pending: 'Đang tạo tài khoản…'},
      'forgot-password': {title: 'Lấy lại quyền truy cập tài khoản', lead: 'Nhập email bạn đã dùng cho Tallshift. Nếu tài khoản tồn tại, bạn sẽ nhận được liên kết để đặt mật khẩu mới.', submit: 'Yêu cầu liên kết đặt lại', pending: 'Đang yêu cầu liên kết…'},
      'reset-password': {title: 'Đặt mật khẩu mới', lead: 'Chọn mật khẩu mới cho tài khoản Tallshift. Sau khi lưu, hãy đăng nhập lại.', submit: 'Lưu mật khẩu mới', pending: 'Đang lưu mật khẩu…'},
      'verify-email': {title: 'Xác nhận địa chỉ email', lead: 'Xác nhận địa chỉ này để hoàn tất việc tạo tài khoản Tallshift.', submit: 'Xác nhận email', pending: 'Đang xác nhận email…'},
    },
    status: {
      loading: 'Đang kiểm tra đăng nhập…',
      serviceUnavailable: 'Hiện chưa thể đăng nhập. Bạn vẫn có thể dùng danh mục và tải các ví dụ miễn phí mà không cần tài khoản.',
      registrationRequested: 'Kiểm tra hộp thư. Nếu địa chỉ này có thể đăng ký, bạn sẽ nhận được email chứa liên kết xác nhận.',
      recoveryRequested: 'Nếu có tài khoản dùng địa chỉ này, bạn sẽ nhận được liên kết đặt lại mật khẩu. Kiểm tra hộp thư đến và thư rác.',
      verificationRequested: 'Nếu địa chỉ này cần xác nhận, bạn sẽ nhận được liên kết mới. Kiểm tra hộp thư đến và thư rác.',
      verified: 'Đã xác nhận email. Bây giờ bạn có thể đăng nhập.',
      passwordReset: 'Đã đổi mật khẩu. Hãy đăng nhập bằng mật khẩu mới.',
      signedIn: 'Bạn đã đăng nhập.',
      signedOut: 'Bạn đã đăng xuất.',
      signedOutAll: 'Bạn đã đăng xuất trên mọi thiết bị, kể cả thiết bị này.',
      profileUnavailable: 'Không kiểm tra được tài khoản. Hãy thử lại trước khi thay đổi thông tin.',
      alreadySignedIn: 'Bạn đã đăng nhập. Mở tài khoản để tiếp tục.',
    },
    errors: {
      emailNotVerified: 'Xác nhận email trước khi đăng nhập. Bạn có thể yêu cầu email xác nhận mới.',
      invalidCredentials: 'Không đăng nhập được. Kiểm tra email và mật khẩu.',
      invalidEmail: 'Nhập địa chỉ email hợp lệ.',
      passwordTooShort: 'Mật khẩu quá ngắn. Kiểm tra yêu cầu bên dưới ô nhập.',
      passwordTooLong: 'Mật khẩu quá dài. Kiểm tra yêu cầu bên dưới ô nhập.',
      passwordMismatch: 'Mật khẩu không khớp. Nhập cùng một mật khẩu vào cả hai ô.',
      invalidToken: 'Liên kết không hợp lệ, đã hết hạn hoặc đã được dùng. Hãy yêu cầu liên kết mới.',
      tokenExpired: 'Liên kết đã hết hạn. Hãy yêu cầu liên kết mới.',
      tooManyAttempts: 'Bạn đã thử quá nhiều lần. Đợi một lúc rồi thử lại.',
      invalidRequest: 'Không thực hiện được yêu cầu. Tải lại trang rồi thử lại.',
      serviceUnavailable: 'Tạm thời không đăng nhập được. Hãy thử lại sau.',
      emailUnavailable: 'Không gửi được email. Hãy thử lại sau.',
      network: 'Không kết nối được với Tallshift. Kiểm tra kết nối rồi thử lại.',
      unexpected: 'Không thực hiện được thao tác. Hãy thử lại.',
    },
    account: {title: 'Tài khoản của bạn', signedInAs: 'Đã đăng nhập với', signedOutTitle: 'Đăng nhập tài khoản của bạn', signedOutBody: 'Dùng email và mật khẩu để đăng nhập. Các ví dụ miễn phí vẫn dùng được mà không cần tài khoản.', logoutAllHelp: 'Kết thúc mọi phiên đăng nhập, kể cả phiên trong trình duyệt này. Sau đó bạn cần đăng nhập lại.', savedLocally: 'Ví dụ đã lưu được giữ trong trình duyệt này và chưa đồng bộ với tài khoản.', purchasesPending: 'Thanh toán và tải tệp trả phí chưa được kết nối. Trang này chưa tạo giao dịch mua hoặc đơn hàng.', sessionExpired: 'Phiên đăng nhập đã kết thúc. Đăng nhập lại để mở tài khoản.'},
    passwordHelp: 'Dùng mật khẩu riêng cho tài khoản này.',
    passwordRange: 'Dùng từ {min} đến {max} ký tự.',
    freeAccessNote: 'Không cần tài khoản để tải các ví dụ miễn phí.',
    verificationHelp: 'Mở email xác nhận Tallshift mới nhất. Nếu liên kết không còn dùng được, hãy yêu cầu liên kết mới.',
    emailHelp: 'Dùng email bạn có thể truy cập. Liên kết xác nhận và đặt lại mật khẩu sẽ được gửi tới đó.',
  },
};

/** Password limits come from the configured server policy, never a second hardcoded UI policy. */
export function authPasswordRange(locale: AuthLocale, min: number, max: number): string {
  return authCopy[locale].passwordRange.replace('{min}', String(min)).replace('{max}', String(max));
}

/** Never display an arbitrary backend message, which can expose implementation details or account existence. */
export function authErrorMessage(locale: AuthLocale, code: unknown): string {
  const keys: Record<string, keyof AuthCopy['errors']> = {
    INVALID_CREDENTIALS: 'invalidCredentials', INVALID_EMAIL_OR_PASSWORD: 'invalidCredentials',
    EMAIL_NOT_VERIFIED: 'emailNotVerified', INVALID_EMAIL: 'invalidEmail',
    PASSWORD_TOO_SHORT: 'passwordTooShort', PASSWORD_TOO_LONG: 'passwordTooLong',
    PASSWORD_MISMATCH: 'passwordMismatch', INVALID_TOKEN: 'invalidToken', TOKEN_EXPIRED: 'tokenExpired',
    RATE_LIMITED: 'tooManyAttempts', AUTH_UNAVAILABLE: 'serviceUnavailable',
    EMAIL_UNAVAILABLE: 'emailUnavailable', INVALID_INPUT: 'invalidRequest',
    INVALID_CSRF: 'invalidRequest', INVALID_ORIGIN: 'invalidRequest', NETWORK_ERROR: 'network', NETWORK: 'network', CSRF_INVALID: 'invalidRequest',
  };
  return authCopy[locale].errors[typeof code === 'string' && Object.hasOwn(keys, code) ? keys[code] : 'unexpected'];
}
